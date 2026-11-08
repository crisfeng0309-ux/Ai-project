import { postDeepSeek } from './ai.mjs';
import { buildImageGenerationRules, marketLanguageName, isEnglishLanguage, HARD_NEGATIVE_PROMPT } from './image-prompt-rules.mjs';

const defaultImageApiUrl = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
const defaultImageTaskApiUrl = 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks';
// 同步生图（Seedream 系列）实测常需 35–60 秒以上，自建服务器没有 Vercel 的 60 秒函数上限，
// 因此默认放宽到 150 秒，并允许用 ARK_IMAGE_TIMEOUT_MS 覆盖（上限 170 秒，需小于 Nginx proxy_read_timeout）。
const defaultImageTimeoutMs = 150000;

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
async function translateProductFacts(input) {
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
  }, 15000);
  const content = String(response?.choices?.[0]?.message?.content || '');
  return sanitizeForImageModel(content).replace(/\s+/g, ' ').trim().slice(0, 900);
}

export async function resolveProductFactsEn(input) {
  // 1. 方案里已经有英文事实（新生成的方案都带），直接用
  const given = cleanForImage(input.productFactsEn || input.scheme?.productFactsEn, 900);
  if (given.length >= 20) return given;
  // 2. 老方案没有，现场翻一次；翻译失败不能挡住生图
  try {
    return await translateProductFacts(input);
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

export function buildImageGenerationPrompt(input, productFactsEn = '') {
  const scheme = input.scheme || {};
  const product = input.product || {};
  const market = text(input.market);
  const language = marketLanguageName(market);
  // 新加坡、菲律宾这类英文市场不能禁英文；其余市场必须禁，否则模型会用提示词的语言出字
  const englishMarket = isEnglishLanguage(language);
  const copy = collectInImageCopy(scheme);

  // 用户资料、设计知识库、创意简报原来都是中文整段塞进去的，
  // 生图模型会照着提示词的语言往画面上写字（图上的商品名和「899 元」就是这么来的）。
  // 现在：用户看到的仍是中文，进提示词的是同一份资料的英文版（productFactsEn），
  // 中文在最后统一剥掉做兜底，画面文字只允许来自下面的白名单。
  const englishFacts = sanitizeForImageModel(text(productFactsEn)).replace(/\s+/g, ' ').trim().slice(0, 900);
  const referenceCount = referenceImages(input).length;
  const referenceLabel = referenceCount > 1
    ? `PRODUCT REFERENCE (${referenceCount} photos of the SAME product from different angles — merge them into one consistent product, never treat them as different models; facts only, never printed as text):`
    : 'PRODUCT REFERENCE (facts only — never printed as text):';
  const facts = englishFacts
    ? [englishFacts]
    : [
      fact('product name', product.name, 60),
      fact('category', product.category, 40),
      fact('key specs', product.specs || product.specifications, 80),
      fact('features', product.features, 160),
      fact('product description', product.description, 240),
      fact('market', market, 20),
      fact('platform', input.platform, 20)
    ].filter(Boolean);

  const copyLines = [
    copy.headline && `Headline: ${copy.headline}`,
    copy.subline && `Subline: ${copy.subline}`,
    copy.bullets.length && `Feature callouts (up to ${copy.bullets.length}, only for a feature breakdown layout): ${copy.bullets.join(' | ')}`,
    copy.price && `Price string: ${copy.price}`
  ].filter(Boolean);

  const scene = cleanForImage(text(scheme.imagePrompt || input.prompt), 2400);
  const sellingPointsLocal = copy.bullets.length ? copy.bullets.join(' | ') : '';

  // 优先级声明放在最前面：模型读长提示词时最先记住开头，也最愿意遵守开头。
  // 这三条是用户明确要求「最重要」的东西，风格知识只能装饰，不能覆盖它们。
  const priority = [
    'WHAT MATTERS MOST — when two instructions in this brief conflict, the higher rule below wins.',
    '1. CONFIRMED SELLING POINTS come first. The advertisement exists to make these selling points land. They are listed in local language under "SELLING POINTS" here and again in IN-IMAGE COPY; build the scene, the product emphasis and the copy around them, and never add a selling point that is not on the list.',
    '2. The APPROVED CREATIVE BRIEF comes second. It fixes the concept, the audience, the usage scene and the copy angle. Follow that direction instead of inventing a different one; if the brief and a style suggestion disagree, the brief wins.',
    '3. TARGET MARKET LANGUAGE comes third, and it is absolute for every rendered word: see the text rules below.',
    '4. Background design knowledge, stock aesthetics and model preferences are decoration only. They may refine composition, colour and light, but they must never replace, soften or contradict rules 1 to 3.',
    `SELLING POINTS (confirmed, local language): ${sellingPointsLocal || 'none provided — let the product itself carry the message, and add no selling-point text'}`
  ].join('\n');

  const sections = [
    priority,
    [
      'ABSOLUTE TEXT RULES — read these first, they override every other line in this brief.',
      `1. The only text allowed on the canvas is the copy listed in IN-IMAGE COPY below, written in ${language}. Print each string exactly as supplied — never translate it${englishMarket ? '' : ', and never rewrite it in English'}.`,
      '2. Never render any other word from this brief: not the product name, not the project name, not the market, not the reference price, not these instructions, not the negative prompt.',
      '3. Absolutely no Chinese characters anywhere — no simplified, no traditional, no pinyin. No Japanese kana. No Korean hangul.',
      '4. No gibberish: no pseudo-letters, no scrambled, mirrored or half-drawn glyphs, no lorem ipsum, no invented script standing in for words, no random symbols used as letters. Every rendered word must be correctly spelled and readable at a glance.',
      `5. If a word cannot be written correctly in ${language}, leave it out. Empty space is always better than wrong or garbled text.`,
      '6. Keep the text layer minimal: one headline, at most one short subline, up to five short feature callouts, one price. No paragraphs.',
      englishMarket ? '' : '7. No English copy on the canvas either: no English headline, no English subline, no English sentence, no English keywords. The only Latin letters allowed are the brand mark printed on the product and the currency symbol.'
    ].filter(Boolean).join('\n'),

    `IN-IMAGE COPY (whitelist — these are the only strings that may appear, exactly as written, in ${language}; do not translate them into English):\n${copyLines.length ? copyLines.join('\n') : 'No copy available. Render no text at all on the canvas.'}`,

    `SCENE AND LAYOUT:\n${scene || 'Photorealistic advertising key visual: the product from the reference image is the hero, placed in a believable real-world setting that fits the target market, premium editorial layout with generous negative space.'}`,

    `${referenceLabel}\n${facts.length ? facts.join('\n') : 'No text facts available. Rely on the reference product photo only.'}`,

    buildImageGenerationRules(market),

    `FINAL CHECK before rendering: if any character on the canvas is Chinese, kana, hangul, garbled or invented, or any word is not in the whitelist language, remove it. If any word is not in the IN-IMAGE COPY whitelist, remove it. When in doubt, print less text.`
  ].filter(Boolean);

  const prompt = sanitizeForImageModel(sections.join('\n\n'));
  return prompt;
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
  const bullets = (Array.isArray(scheme.sellingPointCopy) ? scheme.sellingPointCopy : [])
    .map(item => cleanForImage(item, 36))
    .filter(Boolean)
    .slice(0, 5);
  const price = cleanForImage(scheme.localPrice || scheme.priceText, 24);
  return { headline, subline, bullets, price };
}

function mergedNegativePrompt(input) {
  const own = text(input.negativePrompt || input.scheme?.negativePrompt);
  return own ? `${own}, ${HARD_NEGATIVE_PROMPT}` : HARD_NEGATIVE_PROMPT;
}

export async function generateDoubaoImage(input = {}) {
  const { apiKey, model, apiUrl } = imageApiConfig();
  assertImageConfig({ apiKey, model });

  const productFactsEn = await resolveProductFactsEn(input);
  const prompt = buildImageGenerationPrompt(input, productFactsEn);

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

  const send = () => requestImageJson(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(requestBody)
  }, imageTimeoutMs());
  let { response, body } = await send();
  // 有的部署只接受单张参考图：多图被 400 时退回第一张再试一次，不能因为多传图把生图弄坏
  if (!response.ok && response.status === 400 && Array.isArray(requestBody.image) && requestBody.image.length > 1) {
    console.warn('[adlab] 多张参考图被拒绝，退回第一张重试');
    requestBody.image = [requestBody.image[0]];
    ({ response, body } = await send());
  }
  if (!response.ok) {
    const detail = text(body?.error?.message || body?.message || body?.error, `HTTP ${response.status}`);
    throw new Error(`IMAGE_API_HTTP_${response.status}: ${detail}`);
  }
  const imageUrl = readImageUrl(body) || readBase64Image(body);
  const taskId = readTaskId(body);
  if (!imageUrl && !taskId) throw new Error('IMAGE_API_EMPTY_RESPONSE');
  return { imageUrl, taskId, provider: 'doubao', model, prompt, productFactsEn };
}

export async function startDoubaoImageTask(input = {}) {
  const config = imageApiConfig();
  assertImageConfig(config);
  const productFactsEn = await resolveProductFactsEn(input);
  const prompt = buildImageGenerationPrompt(input, productFactsEn);
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
