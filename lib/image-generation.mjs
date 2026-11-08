import { postDeepSeek } from './ai.mjs';
import { marketLanguageName, isEnglishLanguage, HARD_NEGATIVE_PROMPT } from './image-prompt-rules.mjs';
import { resolveTemplate, fitSlots, renderTemplate } from './image-recipes.mjs';

const defaultImageApiUrl = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
const defaultImageTaskApiUrl = 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks';
// 同步生图（Seedream 系列）实测常需 35–60 秒以上，自建服务器没有 Vercel 的 60 秒函数上限，
// 因此默认放宽到 150 秒，并允许用 ARK_IMAGE_TIMEOUT_MS 覆盖（上限 170 秒，需小于 Nginx proxy_read_timeout）。
const defaultImageTimeoutMs = 150000;

// 整个请求的总预算：必须明显小于前端 165 秒与 nginx 180 秒，
// 否则会出现「前端报超时、后端还在跑」——钱已经花了，用户却看到失败。
const totalBudgetMs = (() => {
  const configured = Number(process.env.IMAGE_TOTAL_BUDGET_MS || 150000);
  return Number.isFinite(configured) && configured > 0 ? Math.min(configured, 165000) : 150000;
})();
// 自检与商品翻译的预留时间
const checkReserveMs = 15000;
const factsReserveMs = 12000;
const minRetryMs = 40000;

// 生图这一步最多能用多久：给自检留出预留时间，且不低于 20 秒
export function imageCallBudget(remainingMs) {
  return Math.max(20000, Number(remainingMs || 0) - checkReserveMs);
}

// 重生成一次大约要 40 到 60 秒，剩余时间不够就不重试，直接把第一张图返回
export function retryAllowed(remainingMs) {
  return Number(remainingMs || 0) > minRetryMs;
}

export function totalBudget() {
  return totalBudgetMs;
}

function text(value, fallback = '') {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function imageTimeoutMs() {
  const configured = Number(process.env.ARK_IMAGE_TIMEOUT_MS || process.env.DOUBAO_IMAGE_TIMEOUT_MS || defaultImageTimeoutMs);
  return Number.isFinite(configured) && configured > 0 ? Math.min(configured, 170000) : defaultImageTimeoutMs;
}

function taskTimeoutMs() {
  const configured = Number(process.env.ARK_IMAGE_TASK_TIMEOUT_MS || 15000);
  return Number.isFinite(configured) && configured > 0 ? Math.min(configured, 30000) : 15000;
}

function readImageUrl(body) {
  const candidates = [
    body?.data?.[0]?.url,
    body?.data?.[0]?.image_url,
    body?.data?.url,
    body?.data?.image_url,
    body?.images?.[0]?.url,
    body?.output?.images?.[0]?.url,
    body?.output?.[0]?.url,
    body?.output?.url,
    body?.output?.image_url,
    body?.result?.images?.[0]?.url,
    body?.result?.url,
    body?.result?.image_url,
    body?.url
  ];
  return candidates.find(value => typeof value === 'string' && value.trim()) || '';
}

function readBase64Image(body) {
  const candidates = [
    body?.data?.[0]?.b64_json,
    body?.data?.[0]?.base64,
    body?.data?.b64_json,
    body?.data?.base64,
    body?.images?.[0]?.b64_json,
    body?.images?.[0]?.base64,
    body?.result?.b64_json,
    body?.result?.base64
  ];
  const value = candidates.find(item => typeof item === 'string' && item.trim());
  return value ? `data:image/png;base64,${value}` : '';
}

function readTaskId(body) {
  return text(body?.id || body?.task_id || body?.taskId || body?.data?.id || body?.output?.task_id);
}

function readTaskStatus(body, imageUrl = '') {
  return text(body?.status || body?.state || body?.data?.status || body?.data?.state || body?.output?.status || (imageUrl ? 'succeeded' : 'running')).toLowerCase();
}

function readTaskError(body) {
  return text(body?.error?.message || body?.error || body?.message || body?.data?.error?.message || body?.data?.message, '豆包图片任务生成失败。');
}

function imageApiConfig() {
  return {
    apiKey: process.env.ARK_API_KEY || process.env.DOUBAO_API_KEY || '',
    model: process.env.ARK_IMAGE_MODEL || process.env.DOUBAO_IMAGE_MODEL || '',
    apiUrl: process.env.ARK_IMAGE_API_URL || process.env.DOUBAO_IMAGE_API_URL || defaultImageApiUrl
  };
}

function imageTaskApiUrl(apiUrl) {
  const configured = process.env.ARK_IMAGE_TASK_API_URL || process.env.DOUBAO_IMAGE_TASK_API_URL;
  if (configured) return configured;
  try { return `${new URL(apiUrl).origin}/api/v3/contents/generations/tasks`; } catch { return defaultImageTaskApiUrl; }
}

function imageTaskStatusUrl(taskId, apiUrl) {
  const configured = process.env.ARK_IMAGE_STATUS_API_URL || process.env.DOUBAO_IMAGE_STATUS_API_URL;
  if (configured) return configured.includes('{taskId}') ? configured.replace('{taskId}', encodeURIComponent(taskId)) : `${configured.replace(/\/$/, '')}/${encodeURIComponent(taskId)}`;
  return `${imageTaskApiUrl(apiUrl).replace(/\/$/, '')}/${encodeURIComponent(taskId)}`;
}

async function requestImageJson(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const body = await response.json().catch(() => ({}));
    return { response, body };
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('IMAGE_API_TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function assertImageConfig(config) {
  if (!config.apiKey) throw new Error('IMAGE_API_NOT_CONFIGURED');
  if (!config.model) throw new Error('IMAGE_MODEL_NOT_CONFIGURED');
}

// 用户看到的是中文，模型不该看到中文。
// productFactsEn 是同一份商品资料的英文版：素材生成时由 DeepSeek 一并写下并存在方案里；
// 老项目的方案没有这个字段，就在生图前现场翻一次（只翻商品事实，不翻文案），失败就退回「剥掉中文」的兜底。
async function translateProductFacts(input, budgetMs = factsReserveMs) {
  const product = input.product || {};
  const source = [
    text(product.name), text(product.category), text(product.specs),
    text(product.features), text(product.description),
    (Array.isArray(input.selectedSellingPoints) ? input.selectedSellingPoints : []).join('; ')
  ].filter(Boolean).join('\n');
  if (!source) return '';
  const response = await postDeepSeek({
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    temperature: 0.1,
    max_tokens: 400,
    messages: [
      {
        role: 'system',
        content: 'You rewrite Chinese product notes into one compact English product brief that an image generation model can read. Output plain English prose only: 60 to 110 words, no markdown, no bullet points, no headings. Cover what the product is, its look and material, key specifications, confirmed functional selling points, and how its price should be handled (local currency only). Keep every fact exactly as given and never invent specs, claims or brands. Never output any Chinese character, pinyin, Japanese kana or Korean hangul.'
      },
      { role: 'user', content: source }
    ]
  }, Math.max(5000, budgetMs));
  const content = String(response?.choices?.[0]?.message?.content || '');
  return sanitizeForImageModel(content).replace(/\s+/g, ' ').trim().slice(0, 900);
}

export async function resolveProductFactsEn(input, budgetMs = factsReserveMs) {
  // 1. 方案里已经有英文事实（新生成的方案都带），直接用
  const given = cleanForImage(input.productFactsEn || input.scheme?.productFactsEn, 900);
  if (given.length >= 20) return given;
  // 2. 老方案没有，现场翻一次；翻译失败不能挡住生图
  try {
    return await translateProductFacts(input, budgetMs);
  } catch (error) {
    console.warn(`[adlab] 商品事实英译失败，退回剥字兜底：${error?.message || error}`);
    return '';
  }
}

// 用户最多能传 3 张商品图（正面/细节/包装），以前只送第一张，
// 第一张是包装盒时模型就完全看不到产品本体。这里把能用的都收进来。
const maxReferenceImages = (() => {
  const configured = Number(process.env.ARK_IMAGE_MAX_REFS || 3);
  return Number.isFinite(configured) && configured > 0 ? Math.min(configured, 4) : 3;
})();

export function referenceImages(input = {}) {
  const list = [];
  const push = (value) => {
    const url = typeof value === 'string' ? value : value?.dataUrl || value?.url || '';
    const trimmed = String(url || '').trim();
    if (!trimmed || list.includes(trimmed)) return;
    if (!/^data:image\//i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) return;
    list.push(trimmed);
  };
  if (Array.isArray(input.productImages)) input.productImages.forEach(push);
  push(input.productImage);
  return list.slice(0, maxReferenceImages);
}

// —— 重构后的提示词骨架：5 个区块，每个区块只做一件事 ——
// 设计原则：
//   1. 每条约束只出现一次，其它地方引用 §编号；
//   2. 「注意力顺序」与「字号尺度」分开命名，不再都叫 hierarchy；
//   3. 自检固定放在最后；用户数据永远排在设计规范之前；
//   4. 具体数字口径统一：卖点条数以 §2 实际条数为准。

const ATTENTION_ORDER = `1. the product or hero visual — largest area, sharpest focus, strongest contrast;
2. the headline — the one line that sells the idea;
3. the selling points, each with its icon;
4. price, scene chips and supporting facts;
5. brand line, fine print and decorative hairlines.
Every level must differ from the next in size, weight, position or colour. A canvas where the headline and the labels share one size has failed.`;

const TYPE_SCALE = `1. headline — the largest type on the canvas, bold, tight leading, one or two lines;
2. subline — about one third of the headline size;
3. label — selling-point and chip text, one size for all of them;
4. fine print — the smallest type, one line only.
The price is set at headline weight. One family, hierarchy by weight rather than by size. White or near-white copy, no outline, no glow, no drop shadow, no gradient text. Labels must stay readable at phone scale — if one cannot be, drop that label instead of shrinking the type.`;

const ACCEPTANCE_CHECK = `Before you finish, verify: (1) the product is identifiable at a glance; (2) there is one clear visual centre; (3) at least two meaningful information levels are visible; (4) icons, cards and type sit on a real grid rather than scattered; (5) the scene is credible for this product; (6) every word is in the target language; (7) the layout is not a plain centred product with a few text lines.`;

const FINAL_GATE = `If any character on the canvas is Chinese, kana, hangul, garbled or invented, remove it. If any word is not in §2, remove it. When in doubt, print less text.`;

const DEFAULT_SCENE = 'A photorealistic advertising key visual: the product from the reference image is the hero, placed in a believable real-world setting that fits the target market, premium editorial layout with generous negative space.';

function copyBlock(copy) {
  return [
    copy.headline && `Headline: ${copy.headline}`,
    copy.subline && `Subline: ${copy.subline}`,
    copy.bullets.length && `Feature callouts (${copy.bullets.length} of them, one per icon, in this order): ${copy.bullets.join(' | ')}`,
    copy.brandLine && `Brand line: ${copy.brandLine}`,
    copy.statement && `Bottom statement: ${copy.statement}`,
    copy.chips.length && `Scene chips (one row, ${copy.chips.length} of them): ${copy.chips.join(' | ')}`,
    copy.finePrint && `Fine print: ${copy.finePrint}`,
    copy.price && `Price string: ${copy.price}`
  ].filter(Boolean).join('\n');
}

// 所有禁止项集中在这里，编号会按实际情况重排（英文市场少一条）
function hardRules(language, englishMarket) {
  const lines = [
    `Use only §2 COPY as text on the canvas, printed exactly as written, in ${language}. Do not translate it${englishMarket ? '' : ', do not rewrite it in English'}, do not shorten it and do not add words.`,
    'No Chinese characters anywhere — simplified, traditional or pinyin. No Japanese kana, no Korean hangul. This covers packaging, cartons, hang tags, care labels, price stickers, screens, signage, watermarks and prints on clothing too: if the reference photo shows Chinese on the product or its packaging, repaint that surface blank.',
    englishMarket ? '' : 'No English copy either: no English headline, subline, sentence or keyword. Latin letters are allowed only in the brand mark printed on the product and in the currency symbol.',
    'No gibberish: no pseudo-letters, scrambled, mirrored or half-drawn glyphs, no lorem ipsum, no invented script, no random symbols used as letters. Every word must be spelled correctly and readable at a glance. If one string cannot be written correctly, drop that single element and never invent a replacement.',
    'Never print anything from §4 or from these instructions: not the product name, not the project name, not the market, not the reference price, not this rule list.',
    'Selling points come only from §2; never invent, extend or exaggerate one, and never claim a certification, discount, sales figure or review.',
    'Preserve the brand mark exactly as printed on the product; never redraw, respell or invent one.',
    'Every element listed in §2 must appear on the canvas. Leaving one out for a cleaner look counts as an incomplete layout.'
  ].filter(Boolean);
  return lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
}

// 提示词组装（v2）：配方 + 白名单 + 场景 + 商品事实 + 文字护栏
// 结构只有 6 段，长度控制在 3.5k 字符以内。所有约束只写一次，不靠 §编号互相引用。

function copyLines(fitted, language) {
  const lines = [
    fitted.headline && `Headline: ${fitted.headline}`,
    fitted.subline && `Subline: ${fitted.subline}`,
    fitted.callouts.length && `Feature callouts (${fitted.callouts.length}, one per icon, in this order): ${fitted.callouts.join(' | ')}`,
    fitted.brandLine && `Brand line: ${fitted.brandLine}`,
    fitted.statement && `Statement: ${fitted.statement}`,
    fitted.chips.length && `Scene chips (one row): ${fitted.chips.join(' | ')}`,
    fitted.finePrint && `Fine print: ${fitted.finePrint}`,
    fitted.price && `Price: ${fitted.price}`
  ].filter(Boolean);
  return lines.length ? lines.join('\n') : `Nothing to print. Leave the canvas free of text.`;
}

function guardLines(language, englishMarket) {
  return [
    `Print only the COPY lines above, exactly as written, in ${language}. No translation, no rewording, no extra words.`,
    'No Chinese characters of any kind, no pinyin, no Japanese kana, no Korean hangul — not on the copy, not on packaging, cartons, tags, care labels, price stickers, screens, signage or watermarks. If a reference photo shows Chinese on the product, repaint that surface blank instead of copying it.',
    englishMarket ? '' : 'No English copy: no English headline, subline, sentence or keyword. Latin letters may appear only in the brand mark printed on the product and in the currency symbol.',
    'No gibberish: no pseudo-letters, no scrambled, mirrored or half-drawn glyphs, no invented script, no symbols standing in for letters. Every word must be spelled correctly and readable at a glance. If one string cannot be written correctly, leave that single element out; never substitute an invented one.',
    'Never print anything from SCENE, PRODUCT or these instructions: not the product name, not the project name, not the market, not the reference price.',
    'Every COPY line must appear, inside the zones defined by the layout. None of them may be dropped for a "cleaner" look.'
  ].filter(Boolean).map((line, index) => `${index + 1}. ${line}`);
}

// 英文市场要做一处替换：模板里写死了「不许英文广告文案」，但英文市场本来就该用英文
function adaptForEnglishMarket(templateText) {
  const replacement = 'English is the target-market language here, so the supplied English copy may be printed exactly as given; original product brand marks and standard currency symbols are also permitted.';
  return String(templateText || '')
    .replace(/Do not add English advertising copy\. The original product brand mark and standard currency symbols are permitted exceptions\./g, replacement)
    .replace(/Do not generate English advertising copy\. Original product brand marks and standard currency symbols are permitted exceptions\./g, replacement)
    .replace(/No English advertising copy is allowed\. Original product brand marks and standard currency symbols are permitted exceptions\./g, replacement);
}

export function buildImageGenerationPrompt(input, productFactsEn = '', options = {}) {
  const scheme = input.scheme || {};
  const product = input.product || {};
  const market = text(input.market);
  const language = marketLanguageName(market);
  const englishMarket = isEnglishLanguage(language);

  // 选模板 → 按槽位装文案 → 渲染
  const { key, template } = resolveTemplate(input);
  const copy = collectInImageCopy(scheme);
  // 无文字底图模式：所有文案槽位清空，renderTemplate 会把这些块整段删掉，
  // 于是模型只负责出画面，文字交给程序排版（验证「底图 + 程序排版」路线用）。
  const textMode = options.textMode || input.textMode || 'full';
  const sourceCopy = textMode === 'none' ? {} : { ...copy, callouts: copy.bullets };
  const { fitted, dropped } = fitSlots(template.slots, sourceCopy);
  if (dropped.length) console.warn(`[adlab] 模板 ${template.name} 放不下这些文案，已裁掉：${dropped.join('、')}`);

  // 英文商品事实：中文资料不进提示词，模型只读英文摘要
  const englishFacts = sanitizeForImageModel(text(productFactsEn)).replace(/\s+/g, ' ').trim().slice(0, 900);
  const facts = englishFacts ? [englishFacts] : [
    fact('product', product.name, 60),
    fact('category', product.category, 40),
    fact('specs', product.specs || product.specifications, 80),
    fact('features', product.features, 160)
  ].filter(Boolean);

  const scene = cleanForImage(text(scheme.imagePrompt || input.prompt), 1600);
  const referenceCount = referenceImages(input).length;

  // 模板说「依据 creative brief」，但简报是我们这边的数据，得显式给它
  const context = [
    'CONTEXT FROM THE CLIENT BRIEF — use it for the scene, mood and audience. Never print any of it on the canvas.',
    `Target-market language for every advertising string: ${language}.`,
    scene ? `Scene to photograph: ${scene}` : '',
    facts.length ? `Product facts, reference only: ${facts.join('; ')}` : '',
    referenceCount > 1 ? `${referenceCount} reference photos show the SAME product from different angles — merge them into one consistent product, never different models.` : '',
    textMode === 'none' ? 'NO-TEXT MODE — produce the photograph and the layout zones only. Do not print any text anywhere: no headline, no labels, no price, no brand line, no fine print, no watermark. Keep the top, bottom and side zones visually quiet and slightly darkened exactly as described, so a text layer can be placed there later.' : ''
  ].filter(Boolean).join('\n');

  const body = renderTemplate(englishMarket ? adaptForEnglishMarket(template.prompt) : template.prompt, fitted);
  return sanitizeForImageModel(`${context}\n\n${body}`);
}

// 只留英文字段值，中文（简繁）、假名、韩文一律去掉。
// 这是最后一道闸：即使上游把中文写进了 imagePrompt，也不会传给生图模型。
function sanitizeForImageModel(value) {
  return String(value || '')
    .replace(/[\u3000-\u303f]/g, ' ')          // 中文标点
    .replace(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g, '') // 汉字
    .replace(/[\u3040-\u30ff]/g, '')           // 日文假名
    .replace(/[\uac00-\ud7af\u1100-\u11ff]/g, '') // 韩文
    .replace(/[（(]\s*[)）]/g, ' ')             // 去掉被剥空后留下的空括号
    .replace(/Target market:\s*\./g, 'Target market: as specified in the language line below.')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanForImage(value, max) {
  const cleaned = sanitizeForImageModel(text(value)).replace(/\s+/g, ' ').trim();
  return cleaned.length > max ? `${cleaned.slice(0, max).trim()}…` : cleaned;
}

function fact(label, value, max) {
  const cleaned = cleanForImage(value, max);
  return cleaned ? `${label}: ${cleaned}` : '';
}

function collectInImageCopy(scheme) {
  const headline = cleanForImage(scheme.adTitle, 70);
  const subline = cleanForImage(scheme.adBody, 90);
  // 底部信息带用的四段极短文案：补上它们，画面才有参考图那种信息密度
  const statement = cleanForImage(scheme.bottomStatement, 90);
  const chips = (Array.isArray(scheme.sceneChips) ? scheme.sceneChips : [])
    .map(item => cleanForImage(item, 24))
    .filter(Boolean)
    .slice(0, 3);
  const finePrint = cleanForImage(scheme.finePrint, 80);
  const brandLine = cleanForImage(scheme.brandLine, 40);
  const bullets = (Array.isArray(scheme.sellingPointCopy) ? scheme.sellingPointCopy : [])
    .map(item => cleanForImage(item, 36))
    .filter(Boolean)
    .slice(0, 6);
  const price = cleanForImage(scheme.localPrice || scheme.priceText, 24);
  return { headline, subline, bullets, price, statement, chips, finePrint, brandLine };
}

// 合并负向词并去重：模板自己的 + 固定项，同一个词只保留第一次出现。
// 之前同一批词会在提示词正文、模板负向词、固定负向词里重复出现两三次，既费 token 也可能撞上游长度限制。
function mergedNegativePrompt(input) {
  const own = text(input.negativePrompt || input.scheme?.negativePrompt);
  const seen = new Set();
  const merged = [];
  for (const raw of `${own},${HARD_NEGATIVE_PROMPT}`.split(',')) {
    const item = raw.trim();
    if (!item) continue;
    const key = item.toLowerCase().replace(/\s+/g, ' ').replace(/\.$/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged.join(', ');
}

const LANGUAGE_RETRY_HEAD = [
  'TEXT FAILURE RETRY — the previous render of this brief contained Chinese characters or garbled text, which is an absolute failure.',
  'This time print only the whitelist strings, exactly as supplied, in the target market language, and nothing else.',
  'Leave every other surface completely free of text: packaging, cartons, hang tags, care labels, price stickers, screens, signage, watermarks, clothing prints.',
  'If the reference photo carries Chinese anywhere, repaint that surface blank.',
  ''
].join('\n');

function buildLanguageRetryPrompt(prompt) {
  return `${LANGUAGE_RETRY_HEAD}\n${prompt}`;
}

// 提示词层面的约束总会有漏网的概率（尤其参考图上印着中文时）。
// 这里用视觉模型做一次生成后自检：只认「有中文」这一件事，答不出来就当通过，绝不阻塞出图。
async function detectForeignScript(imageUrl, language, budgetMs = checkReserveMs) {
  const model = process.env.DEEPSEEK_VISION_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  const response = await postDeepSeek({
    model,
    temperature: 0,
    max_tokens: 200,
    messages: [
      {
        role: 'system',
        content: 'You are a strict advertising QA reviewer. Check two things about the printed text on this canvas. (1) cjk: any Chinese characters (simplified or traditional), pinyin, Japanese kana or Korean hangul — including packaging, tags, labels, screens, signs and watermarks. The brand mark printed on the product does not count. (2) gibberish: scrambled, mirrored, half-drawn or invented letters, or words that are not real words in the target language. Reply with JSON only: {"cjk": true|false, "gibberish": true|false, "where": "short note"}.'
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: `This advertisement must use only ${language}. Does the canvas contain any Chinese or other unwanted script?` },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }
    ]
  }, Math.max(5000, budgetMs));
  const raw = String(response?.choices?.[0]?.message?.content || '');
  // 视觉模型不保证严格 JSON：可能是空内容、带 ```json 包裹、或前后带解释。
  // 这里抓第一个 {...} 再解析，解析不出来就返回 skipped，并把 finish_reason 记进日志。
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    console.warn(`[adlab] 语言自检没有拿到 JSON（finish_reason=${response?.choices?.[0]?.finish_reason || 'unknown'}，内容长度=${raw.length}）`);
    return { cjk: false, gibberish: false, skipped: true };
  }
  let parsed = {};
  try { parsed = JSON.parse(match[0]); } catch {
    console.warn(`[adlab] 语言自检 JSON 解析失败，按通过处理：${match[0].slice(0, 80)}`);
    return { cjk: false, gibberish: false, skipped: true };
  }
  return { cjk: parsed?.cjk === true, gibberish: parsed?.gibberish === true };
}

export async function generateDoubaoImage(input = {}) {
  const startedAt = Date.now();
  // 所有阶段共用这一个截止时间，任何一步都不能把总时长顶穿
  const deadline = startedAt + totalBudgetMs;
  const remaining = () => deadline - Date.now();
  const language = marketLanguageName(input.market);
  const { apiKey, model, apiUrl } = imageApiConfig();
  assertImageConfig({ apiKey, model });

  const productFactsEn = await resolveProductFactsEn(input, Math.min(factsReserveMs, Math.max(0, remaining())));
  const prompt = buildImageGenerationPrompt(input, productFactsEn, { textMode: input.textMode });

  const requestBody = {
    model,
    prompt,
    response_format: 'url',
    size: text(input.size, process.env.ARK_IMAGE_SIZE || '1024x1024'),
    watermark: false
  };
  const references = referenceImages(input);
  if (references.length) requestBody.image = references;
  requestBody.negative_prompt = mergedNegativePrompt(input);

  const send = (budgetMs) => requestImageJson(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(requestBody)
  }, Math.max(15000, Math.min(imageTimeoutMs(), budgetMs)));
  let { response, body } = await send(imageCallBudget(remaining()));
  // 有的部署只接受单张参考图：多图被 400 时退回第一张再试一次，不能因为多传图把生图弄坏
  // 比例对应的尺寸如果被上游拒绝，退回默认方形再试一次，不能因为选了个比例就出不了图
  if (!response.ok && response.status === 400 && requestBody.size && requestBody.size !== '1024x1024') {
    console.warn(`[adlab] 尺寸 ${requestBody.size} 被拒绝，退回 1024x1024 重试`);
    requestBody.size = '1024x1024';
    ({ response, body } = await send(imageCallBudget(remaining())));
  }
  if (!response.ok && response.status === 400 && Array.isArray(requestBody.image) && requestBody.image.length > 1) {
    console.warn('[adlab] 多张参考图被拒绝，退回第一张重试');
    requestBody.image = [requestBody.image[0]];
    ({ response, body } = await send(imageCallBudget(remaining())));
  }
  if (!response.ok) {
    const detail = text(body?.error?.message || body?.message || body?.error, `HTTP ${response.status}`);
    throw new Error(`IMAGE_API_HTTP_${response.status}: ${detail}`);
  }
  let imageUrl = readImageUrl(body) || readBase64Image(body);
  const taskId = readTaskId(body);
  if (!imageUrl && !taskId) throw new Error('IMAGE_API_EMPTY_RESPONSE');

  // 生成后自检：检出中文就带更强的语言约束重生成一次。
  // 自检与重生成都要落在同一个总预算里：重生成一次约 40-60 秒，剩余时间不够就不重试。
  let languageCheck = 'skipped';
  if (imageUrl && /^https?:/i.test(imageUrl)) {
    try {
      const verdict = await detectForeignScript(imageUrl, language, Math.min(checkReserveMs, Math.max(5000, remaining())));
      const failed = verdict.cjk || verdict.gibberish;
      languageCheck = verdict.skipped ? 'skipped' : failed ? 'flagged' : 'ok';
      if (failed && retryAllowed(remaining() - 6000)) {
        console.warn(`[adlab] 生成结果自检未通过（中文=${verdict.cjk} 乱码=${verdict.gibberish}），加强约束后重新生成一次`);
        requestBody.prompt = buildLanguageRetryPrompt(prompt);
        const retry = await send(remaining() - 6000);
        if (retry.response.ok) {
          const retryUrl = readImageUrl(retry.body) || readBase64Image(retry.body);
          if (retryUrl) { imageUrl = retryUrl; languageCheck = 'retried'; }
        }
      }
    } catch (error) {
      console.warn(`[adlab] 生图语言自检未完成，按通过处理：${error?.message || error}`);
    }
  }

  return { imageUrl, taskId, provider: 'doubao', model, prompt, productFactsEn, languageCheck };
}

export async function startDoubaoImageTask(input = {}) {
  const config = imageApiConfig();
  assertImageConfig(config);
  const productFactsEn = await resolveProductFactsEn(input);
  const prompt = buildImageGenerationPrompt(input, productFactsEn, { textMode: input.textMode });
  if (!prompt) throw new Error('IMAGE_PROMPT_REQUIRED');
  const content = [{ type: 'text', text: prompt }, { type: 'text', text: `Negative prompt: ${mergedNegativePrompt(input)}` }];
  for (const url of referenceImages(input)) content.push({ type: 'image_url', image_url: { url } });
  const requestBody = { model: config.model, content };
  const { response, body } = await requestImageJson(imageTaskApiUrl(config.apiUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify(requestBody)
  }, taskTimeoutMs());
  if (!response.ok) {
    const detail = text(body?.error?.message || body?.message || body?.error, `HTTP ${response.status}`);
    throw new Error(`IMAGE_API_HTTP_${response.status}: ${detail}`);
  }
  const imageUrl = readImageUrl(body) || readBase64Image(body);
  const taskId = readTaskId(body);
  if (!imageUrl && !taskId) throw new Error('IMAGE_API_EMPTY_RESPONSE');
  return { imageUrl, taskId, status: readTaskStatus(body, imageUrl), provider: 'doubao', model: config.model, productFactsEn };
}

export async function getDoubaoImageTaskStatus(taskId = '') {
  const config = imageApiConfig();
  assertImageConfig(config);
  const id = text(taskId);
  if (!id) throw new Error('IMAGE_TASK_ID_REQUIRED');
  const { response, body } = await requestImageJson(imageTaskStatusUrl(id, config.apiUrl), {
    method: 'GET',
    headers: { Authorization: `Bearer ${config.apiKey}` }
  }, taskTimeoutMs());
  if (!response.ok) {
    const detail = text(body?.error?.message || body?.message || body?.error, `HTTP ${response.status}`);
    throw new Error(`IMAGE_API_HTTP_${response.status}: ${detail}`);
  }
  const imageUrl = readImageUrl(body) || readBase64Image(body);
  const status = readTaskStatus(body, imageUrl);
  if (['failed', 'error', 'cancelled', 'canceled'].includes(status)) throw new Error(`IMAGE_TASK_FAILED: ${readTaskError(body)}`);
  return { taskId: id, status, imageUrl, provider: 'doubao', model: config.model };
}

export function imageGenerationErrorMessage(error) {
  const code = error?.message || '';
  if (code === 'IMAGE_API_NOT_CONFIGURED') return '请先配置豆包 API Key。';
  if (code === 'IMAGE_MODEL_NOT_CONFIGURED') return '请先配置豆包生图模型 Endpoint ID。';
  if (code === 'IMAGE_PROMPT_REQUIRED') return '当前模板没有可用的图片提示词。';
  if (code === 'IMAGE_API_EMPTY_RESPONSE') return '豆包接口没有返回图片地址或任务 ID。';
  if (code === 'IMAGE_TASK_ID_REQUIRED') return '缺少豆包图片任务 ID。';
  if (code.startsWith('IMAGE_TASK_FAILED:')) return `豆包图片任务失败：${code.slice('IMAGE_TASK_FAILED:'.length).trim()}`;
  if (code === 'IMAGE_API_TIMEOUT') return '豆包生图接口响应超时，请检查模型配置、API Key 和接口地址后重试。';
  return code.startsWith('IMAGE_API_HTTP_') ? `豆包生图接口调用失败：${code}` : '图片生成失败，请检查豆包接口配置。';
}
