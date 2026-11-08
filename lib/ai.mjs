import { resolveCurrency } from './currency.mjs';
import { buildImageGenerationRules } from './image-prompt-rules.mjs';

const schemas = {
  product: {
    basicInfo: { productType: '', summary: '', confirmedFunctions: [] },
    sellingPoints: [], usageScenes: [], credibilityChecks: [], pendingItems: [], warnings: []
  },
  strategy: {
    languageAdvice: { recommendedLanguage: '', tone: '', localizationNotes: [] },
    targetAudience: [], creativeDirections: [], creativeBrief: { theme: '', objective: '', audience: '', languageExpression: '', problem: '', sellingPoints: [], usageScene: '', visualSubject: '', actions: '', productDisplay: '', visualStyle: '', composition: '', copyDirection: '', headline: '', body: '', avoid: '', formats: [], productionNotes: '' }
  },
  assets: {
    adTitle: '', adTitleZh: '', adBody: '', adBodyZh: '', sellingPointCopy: [], imageLayout: '', imagePrompt: '', imagePromptZh: '', videoPrompt: '', videoPromptZh: '', negativePrompt: '', formatAdvice: [], currency: {}, productFactsEn: '', schemes: [{ id: '', title: '', summary: '', angle: '', imageUrl: '', adTitle: '', adTitleZh: '', adBody: '', adBodyZh: '', hook: '', sellingPointCopy: [], imageLayout: '', imagePrompt: '', imagePromptZh: '', videoPrompt: '', videoPromptZh: '', negativePrompt: '', formatAdvice: [], shotList: [], productionNotes: '', localPrice: '', targetAudience: [], qualityChecks: [], bottomStatement: '', sceneChips: [], finePrint: '', brandLine: '', designStyle: '' }]
  },
  promptTranslations: { translations: [] },
  dataAnalysis: {
    headline: '', analysis: [{ title: '', detail: '' }], limitations: []
  }
};

const baseUrl = () => (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
const model = () => process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const text = (value, fallback = '') => typeof value === 'string' ? value.trim() : value == null ? fallback : String(value);
// AI 有时把本该是字符串的列表项返回成对象（例如 {name: "...", source: "..."}），
// 直接 String() 会得到 "[object Object]"，所以要按常见字段名把文字取出来。
const plainText = (item, keys = []) => {
  if (item == null) return '';
  if (typeof item === 'string') return item.trim();
  if (typeof item === 'number' || typeof item === 'boolean') return String(item);
  if (typeof item === 'object') {
    for (const key of keys) { const value = item[key]; if (typeof value === 'string' && value.trim()) return value.trim(); }
    for (const value of Object.values(item)) { if (typeof value === 'string' && value.trim()) return value.trim(); }
    return '';
  }
  return String(item);
};
const list = value => Array.isArray(value) ? value : [];

function confidence(value) {
  const normalized = text(value).toLowerCase();
  if (normalized.includes('need') || normalized.includes('uncertain') || normalized.includes('待确认')) return 'needs_confirmation';
  if (normalized.includes('infer') || normalized.includes('推测')) return 'inferred';
  return 'confirmed';
}

function normalizeProduct(raw) {
  const product = raw.product || {};
  const points = list(raw.sellingPoints || raw.selling_points);
  const scenes = list(raw.usageScenes || raw.scenarios);
  const uncertainties = list(raw.pendingItems || raw.uncertainties);
  const geometryKeys = ['name', 'function', 'feature', 'text', 'value', 'title', 'label', 'description', 'item', 'claim'];
  const rawBasic = raw.basicInfo || raw.basic_info || {};
  // basicInfo 原来是原样透传的，模型把 confirmedFunctions 返回成对象数组时，
  // 前端 join('、') 就会显示成 [object Object]。这里逐项取文字并过滤空值。
  const basicInfo = {
    productType: plainText(rawBasic.productType || rawBasic.product_type || rawBasic.type || product.category || product.name),
    summary: plainText(rawBasic.summary || rawBasic.description || product.description),
    confirmedFunctions: list(rawBasic.confirmedFunctions || rawBasic.confirmed_functions || product.confirmedFunctions)
      .map(item => plainText(item, geometryKeys))
      .filter(Boolean)
  };
  return {
    basicInfo,
    sellingPoints: points.map(item => ({ title: plainText(item.title || item.point, geometryKeys) || '未命名卖点', description: plainText(item.description || item.point, geometryKeys), evidence: plainText(item.evidence || item.evidence_source || '来自当前项目资料', geometryKeys), confidence: confidence(item.confidence) })),
    usageScenes: scenes.map(item => ({ scene: plainText(item.scene || item.scenario, ['scene', 'scenario', 'name', 'text', 'title', ...geometryKeys]), reason: plainText(item.reason || item.match_reason, ['reason', 'match_reason', 'why', 'explanation', 'text']) })),
    credibilityChecks: list(raw.credibilityChecks).map(item => ({ claim: plainText(item.claim, geometryKeys), source: ['user_input', 'image_observed', 'model_inference'].includes(item.source) ? item.source : 'model_inference', status: ['supported', 'inferred', 'needs_confirmation', 'risk'].includes(item.status) ? item.status : 'needs_confirmation' })).concat(uncertainties.map(item => ({ claim: plainText(item.item || item.claim || item, geometryKeys), source: 'model_inference', status: 'needs_confirmation' }))),
    pendingItems: uncertainties.map(item => plainText(item.item || item.claim || item, geometryKeys)).filter(Boolean),
    warnings: list(raw.warnings).map(item => plainText(item, geometryKeys)).filter(Boolean)
  };
}

function normalizeStrategy(raw, input = {}) {
  const advice = raw.languageAdvice || raw.language_advice || {};
  const audience = raw.targetAudience || raw.target_audience || raw.audiences;
  const directions = raw.creativeDirections || raw.creative_directions || raw.directions;
  const brief = raw.creativeBrief || raw.creative_brief;
  return {
    languageAdvice: { recommendedLanguage: text(advice.recommendedLanguage || advice.language, '根据目标市场选择本地语言'), tone: text(advice.tone, '清晰、直接、生活化'), localizationNotes: list(advice.localizationNotes || advice.localization_notes).map(item => text(item)) },
    targetAudience: list(audience).map((item, index) => normalizeAudience(item, index, input)),
    creativeDirections: list(directions).map((item, index) => ({ title: directionTitle(item, index), coreSellingPoints: list(item.coreSellingPoints || item.core_selling_points || item.sellingPoints).map(point => text(point)), usageScene: text(item.usageScene || item.usage_scene || item.scene), visualConcept: text(item.visualConcept || item.visual_concept || item.visual), copyAngle: text(item.copyAngle || item.copy_angle || item.message), reason: text(item.reason) })),
    creativeBrief: brief ? { theme: text(brief.theme || brief.title), objective: text(brief.objective), audience: text(brief.audience), languageExpression: text(brief.languageExpression || brief.language_expression), problem: text(brief.problem), sellingPoints: list(brief.sellingPoints || brief.selling_points).map(item => text(item)), usageScene: text(brief.usageScene || brief.usage_scene), visualSubject: text(brief.visualSubject || brief.visual_subject), actions: text(brief.actions), productDisplay: text(brief.productDisplay || brief.product_display), visualStyle: text(brief.visualStyle || brief.visual_style), composition: text(brief.composition), copyDirection: text(brief.copyDirection || brief.copy_direction), headline: text(brief.headline), body: text(brief.body), avoid: text(brief.avoid), formats: list(brief.formats).map(item => text(item)), productionNotes: text(brief.productionNotes || brief.production_notes) } : null
  };
}

function normalizeAudience(item, index, input = {}) {
  const product = input.product || {};
  const market = text(input.market, '目标市场');
  const category = `${text(product.category)} ${text(product.name)}`;
  const candidates = /充电|手机|数码|电源/.test(category)
    ? [`${market}手机重度使用者`, `${market}高校学生`, `${market}城市通勤人群`, `${market}短途出行用户`]
    : /包|箱|收纳|服饰/.test(category)
      ? [`${market}高校学生`, `${market}城市通勤人群`, `${market}短途出行用户`, `${market}轻运动生活人群`]
      : [`${market}年轻消费者`, `${market}日常通勤人群`, `${market}短途出行用户`, `${market}注重便利性的家庭用户`];
  const rawName = text(item.name || item.audience);
  const name = rawName && !/^(潜在受众|target audience|audience)\s*\d*$/i.test(rawName) ? rawName : candidates[index % candidates.length];
  const rawNeed = text(item.need);
  const rawPainPoint = text(item.painPoint || item.pain_point);
  const need = rawNeed && !/AI 根据当前商品资料识别的潜在受众|暂无|待补充/.test(rawNeed) ? rawNeed : `希望在${text(product.description, '日常使用')}中获得更方便的商品体验`;
  const painPoint = rawPainPoint && !/AI 根据当前商品资料识别的潜在受众|暂无|待补充/.test(rawPainPoint) ? rawPainPoint : `现有解决方案不够便携或不够符合${market}的日常使用场景`;
  return { name, need, painPoint };
}

function directionTitle(item, index) {
  const provided = text(item.title || item.name);
  if (provided && !/^(未命名|unnamed|untitled)/i.test(provided)) return provided;
  const scene = text(item.usageScene || item.usage_scene || item.scene);
  const points = item.coreSellingPoints || item.core_selling_points || item.sellingPoints || [];
  const point = text(points[0]);
  const angle = text(item.copyAngle || item.copy_angle || item.message);
  const source = scene || point || angle || `创意方向 ${index + 1}`;
  const title = scene ? `${source}场景` : point ? `${source}利益点` : source;
  return title.length > 24 ? `${title.slice(0, 24)}…` : title;
}

function assetSchemeTitle(item, index) {
  const provided = text(item.title || item.name);
  const isPlaceholder = !provided || /^(广告)?(图片|素材)?(方案|模板)\s*[A-CＡ-Ｃ0-9一二三]?$/i.test(provided) || /^方案\s*[A-CＡ-Ｃ0-9一二三]?$/i.test(provided);
  if (!isPlaceholder) return provided;
  const point = text((item.sellingPointCopy || item.selling_point_copy || [])[0]);
  const source = text(item.angle || item.strategyAngle || item.hook || item.openingHook || point || item.imageLayout || item.image_layout);
  const presets = ['痛点切入：回应用户核心困扰', '卖点突出：放大商品关键优势', '场景展示：融入真实使用时刻'];
  return source ? (source.length > 22 ? `${source.slice(0, 22)}…` : source) : presets[index] || '综合创意：突出商品核心价值';
}

function assetSchemeSummary(item, index) {
  const provided = text(item.summary || item.description);
  if (provided) return provided;
  const angle = text(item.angle || item.strategyAngle);
  const point = text((item.sellingPointCopy || item.selling_point_copy || [])[0]);
  const layout = text(item.imageLayout || item.image_layout);
  const fallback = ['从用户真实痛点切入，先建立共鸣，再让商品卖点成为解决问题的具体答案。', '围绕最重要的商品优势组织画面与文案，让用户快速理解为什么值得选择。', '把商品放入自然的日常使用场景，降低距离感并强化真实体验。'];
  return [angle && `围绕${angle}`, point && `突出${point}`, layout && `采用${layout}`].filter(Boolean).join('，') || fallback[index] || fallback[0];
}

function normalizeAssetScheme(item, index, fallback = {}) {
  return {
    id: text(item.id, `scheme-${index + 1}`),
    title: assetSchemeTitle(item, index),
    summary: assetSchemeSummary(item, index),
    angle: text(item.angle || item.strategyAngle),
    imageUrl: text(item.imageUrl || item.image_url || item.generatedImage),
    adTitle: text(item.adTitle || item.ad_title || fallback.adTitle),
    adTitleZh: text(item.adTitleZh || item.ad_title_zh || fallback.adTitleZh),
    adBody: text(item.adBody || item.ad_body || fallback.adBody),
    adBodyZh: text(item.adBodyZh || item.ad_body_zh || fallback.adBodyZh),
    hook: text(item.hook || item.openingHook),
    sellingPointCopy: list(item.sellingPointCopy || item.selling_point_copy || fallback.sellingPointCopy).map(value => text(value)),
    imageLayout: text(item.imageLayout || item.image_layout || fallback.imageLayout),
    imagePrompt: text(item.imagePrompt || item.image_prompt || fallback.imagePrompt),
    imagePromptZh: text(item.imagePromptZh || item.image_prompt_zh || fallback.imagePromptZh),
    videoPrompt: text(item.videoPrompt || item.video_prompt || fallback.videoPrompt),
    videoPromptZh: text(item.videoPromptZh || item.video_prompt_zh || fallback.videoPromptZh),
    negativePrompt: text(item.negativePrompt || item.negative_prompt || fallback.negativePrompt),
    formatAdvice: list(item.formatAdvice || item.format_advice || fallback.formatAdvice).map(value => text(value)),
    shotList: list(item.shotList || item.shot_list).map(value => text(value)),
    productionNotes: text(item.productionNotes || item.production_notes),
    localPrice: text(item.localPrice || item.local_price || fallback.currency?.displayAmount),
    targetAudience: list(item.targetAudience || item.target_audience).map(value => text(typeof value === 'string' ? value : value?.name)),
    qualityChecks: list(item.qualityChecks || item.quality_checks).map(value => text(value))
  };
}

function normalizeAssets(raw, input = {}) {
  const fallback = {
    adTitle: text(raw.adTitle || raw.ad_title),
    adTitleZh: text(raw.adTitleZh || raw.ad_title_zh || raw.titleChinese),
    adBody: text(raw.adBody || raw.ad_body),
    adBodyZh: text(raw.adBodyZh || raw.ad_body_zh || raw.bodyChinese),
    sellingPointCopy: list(raw.sellingPointCopy || raw.selling_point_copy).map(item => text(item)),
    imageLayout: text(raw.imageLayout || raw.image_layout),
    imagePrompt: text(raw.imagePrompt || raw.image_prompt),
    imagePromptZh: text(raw.imagePromptZh || raw.image_prompt_zh),
    videoPrompt: text(raw.videoPrompt || raw.video_prompt),
    videoPromptZh: text(raw.videoPromptZh || raw.video_prompt_zh),
    negativePrompt: text(raw.negativePrompt || raw.negative_prompt),
    formatAdvice: list(raw.formatAdvice || raw.format_advice).map(item => text(item)),
    // 模型会照着 schema 回传一个 currency 对象，但往往缺 exchangeRate / rateUpdatedAt，
    // 直接采信会让界面出现「汇率：1 CNY ≈ undefined SGD · undefined」。
    // 汇率与展示价格一律以服务端 resolveCurrency 的结果为准，模型的值只在服务端缺失时兜底。
    currency: input.currency || raw.currency || {}
  };
  // 顶层只写一份英文商品事实，这里下发到每套方案，前端和生图接口都按方案取
  const factsEn = text(raw.productFactsEn || raw.product_facts_en || list(raw.schemes)[0]?.productFactsEn);
  const rawSchemes = list(raw.schemes || raw.assetSchemes || raw.asset_schemes);
  const normalized = rawSchemes.length ? rawSchemes.map((item, index) => normalizeAssetScheme(item, index, fallback)) : [normalizeAssetScheme(fallback, 0, fallback)];
  const schemes = factsEn ? normalized.map(item => ({ ...item, productFactsEn: factsEn })) : normalized;
  const primary = schemes[0] || normalizeAssetScheme(fallback, 0, fallback);
  return { ...primary, currency: input.currency || raw.currency || {}, schemes };
}

function normalizePromptTranslations(raw) {
  const translations = raw.translations || raw.promptTranslations || raw.prompt_translations || [];
  return {
    translations: list(translations).map((item, index) => ({
      id: text(item.id, `scheme-${index + 1}`),
      imagePromptZh: text(item.imagePromptZh || item.image_prompt_zh || item.imageTranslation || item.image_translation),
      videoPromptZh: text(item.videoPromptZh || item.video_prompt_zh || item.videoTranslation || item.video_translation)
    }))
  };
}

function normalizeDataReview(raw) {
  const list = value => (Array.isArray(value) ? value : []).map(item => {
    if (typeof item === 'string') return item.trim();
    if (item && typeof item === 'object') return String(item.detail || item.title || item.text || '').trim();
    return String(item ?? '').trim();
  }).filter(Boolean);
  const pick = (...keys) => { for (const key of keys) { const got = list(raw[key]); if (got.length) return got; } return []; };
  const sentence = value => (typeof value === 'string' ? value.trim() : String(value ?? '').trim());
  const rawSections = Array.isArray(raw.analysis) ? raw.analysis : (Array.isArray(raw.sections) ? raw.sections : []);
  const analysis = rawSections.map(item => {
    if (typeof item === 'string') return { title: '', detail: item.trim() };
    return { title: sentence(item?.title), detail: sentence(item?.detail || item?.text || item?.body) };
  }).filter(item => item.detail).slice(0, 5);
  // 兼容旧项目里保存的四段式结构，合并成一节，避免历史项目打开后空白
  if (!analysis.length) {
    const legacy = [...pick('keyFindings', 'supportedConclusions'), ...pick('likelyCauses', 'possibleCauses'), ...pick('nextSteps', 'tasks')];
    if (legacy.length) analysis.push({ title: '这份数据说明了什么', detail: legacy.join('；') });
  }
  return {
    headline: sentence(raw.headline || raw.summary || raw.conclusion),
    analysis,
    limitations: pick('limitations', 'unknowns', 'cannotDetermine', 'cannot_determine').slice(0, 2)
  };
}

// 模型偶尔会在合法 JSON 之后追加第二个对象或一段说明文字（线上实测因此抛
// "Unexpected non-whitespace character after JSON at position 4023"），
// 这里改为提取第一个完整 JSON 值，而不是要求整串都必须是 JSON。
function extractJsonValue(source) {
  const start = source.search(/[[{]/);
  if (start === -1) return null;
  const opener = source[start];
  const closer = opener === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (inString) {
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (char === opener) depth += 1;
    else if (char === closer) {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

function parseAnswer(content) {
  const raw = text(content, '{}');
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const extracted = extractJsonValue(cleaned);
    if (extracted && extracted !== cleaned) {
      console.warn(`[adlab] AI 返回内容不是单一 JSON，已截取首个完整对象（原始错误：${error.message}）`);
      return JSON.parse(extracted);
    }
    throw new Error(`AI_JSON_UNPARSEABLE: ${error.message}`);
  }
}

// DeepSeek 请求的超时与重试。
// 之前是一次失败就失败：429（限流）、5xx（服务抖动）、连接被重置都会直接抛给用户，
// 而 4xx 里的 402（余额不足）、429、400 又全被折叠成同一句「AI 分析暂时失败」，
// 既没法重试也没法排查。这里把「可重试」和「不可重试」分开，并统一记日志。
const deepseekTimeoutMs = Number(process.env.DEEPSEEK_TIMEOUT_MS || 150000);
// 每个环节的总预算（含重试与退避），必须小于前端超时，前端又必须小于 nginx 的 180 秒。
// 否则重试会把请求拖到 nginx 切断之后，用户早就看到超时了，服务器还在白算。
const kindBudgets = {
  assets: 145000,          // 前端 150s
  product: 115000,         // 前端 120s
  strategy: 115000,        // 前端 120s
  dataAnalysis: 115000,    // 前端 120s
  promptTranslations: 85000 // 前端 90s
};
const minRetryWindowMs = 15000;
const retryDelaysMs = [1500, 4000];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function postDeepSeek(payload, budgetMs = 115000) {
  const deadline = Date.now() + budgetMs;
  let lastError = null;
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining < 1000) break;
    // 单次尝试最多用掉剩余预算，避免一次就吃穿总时长
    const attemptTimeoutMs = Math.min(deepseekTimeoutMs, remaining);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), attemptTimeoutMs);
    const startedAt = Date.now();
    try {
      const response = await fetch(`${baseUrl()}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      if (response.ok) return await response.json();
      const status = response.status;
      const failure = new Error(`AI_HTTP_${status}`);
      failure.status = status;
      // 429 是限流、5xx 是上游抖动，都值得再试一次；其余 4xx 是确定性错误，重试没有意义
      const retryable = status === 429 || status >= 500;
      console.warn(`[adlab] DeepSeek 返回 ${status}，第 ${attempt + 1} 次尝试，耗时 ${Date.now() - startedAt}ms，${retryable ? "可重试" : "不重试"}`);
      if (!retryable || attempt === retryDelaysMs.length) throw failure;
      const delay = retryDelaysMs[attempt] || 4000;
      // 剩余时间不够再试一次就不要再试了，否则会拖过前端与 nginx 的时限
      if (deadline - Date.now() - delay < minRetryWindowMs) {
        console.warn(`[adlab] 剩余预算不足，放弃重试（状态 ${status}）`);
        throw failure;
      }
      lastError = failure;
    } catch (error) {
      if (error?.name === 'AbortError') {
        console.error(`[adlab] DeepSeek 请求超时（${attemptTimeoutMs}ms），已放弃`);
        throw Object.assign(new Error('AI_TIMEOUT'), { status: 0 });
      }
      // 上面已经判定过是否可重试的 HTTP 错误，直接抛
      if (error?.status) throw error;
      console.warn(`[adlab] DeepSeek 网络错误，第 ${attempt + 1} 次尝试：${error?.message || error}`);
      lastError = error;
      if (attempt === retryDelaysMs.length) break;
      if (deadline - Date.now() - (retryDelaysMs[attempt] || 4000) < minRetryWindowMs) {
        console.warn('[adlab] 剩余预算不足，放弃重试（网络错误）');
        break;
      }
    } finally {
      clearTimeout(timer);
    }
    await sleep(retryDelaysMs[attempt] || 4000);
  }
  throw lastError || Object.assign(new Error('AI_UNKNOWN'), { status: 0 });
}

function friendlyAIError(error) {
  const message = String(error?.message || '');
  const status = error?.status || Number((message.match(/^AI_HTTP_(\d+)$/) || [])[1] || 0);
  if (message === 'AI_NOT_CONFIGURED') return { status: 503, message: 'AI 服务尚未配置，请设置 DEEPSEEK_API_KEY。' };
  if (message === 'AI_TIMEOUT') return { status: 504, message: 'AI 服务响应超时了。隔几秒再试一次通常就好；如果反复超时，把商品图片减到 1-2 张会更稳。' };
  if (status === 401 || status === 403) return { status: 502, message: 'AI 密钥无效或没有权限，请检查服务器上的 DEEPSEEK_API_KEY。' };
  if (status === 402) return { status: 502, message: 'AI 账户余额不足，请到 DeepSeek 平台充值后重试。' };
  if (status === 429) return { status: 502, message: 'AI 服务当前请求过多（限流），请等 10-20 秒再试一次。' };
  if (status === 400) return { status: 502, message: 'AI 拒绝了这次请求，通常是资料太长或图片过多。精简一些备注或减少图片后再试。' };
  if (status >= 500) return { status: 502, message: `AI 服务暂时不稳定（上游 ${status}），隔几秒再试一次通常就好。` };
  if (message.startsWith('AI_JSON_UNPARSEABLE')) return { status: 502, message: 'AI 返回的内容不完整（可能被截断），请重试一次。' };
  return { status: 502, message: 'AI 分析暂时失败，请稍后重试。' };
}

async function askDeepSeek(kind, input) {
  if (!process.env.DEEPSEEK_API_KEY) throw new Error('AI_NOT_CONFIGURED');
  const enrichedInput = { ...input, currency: resolveCurrency(input) };
  const placeholderImage = item => (item ? { ...item, dataUrl: item.dataUrl ? '[商品图片已作为附件传入]' : '' } : null);
  const promptInput = { ...enrichedInput, productImage: placeholderImage(enrichedInput.productImage), productImages: (Array.isArray(enrichedInput.productImages) ? enrichedInput.productImages : []).map(placeholderImage), product: enrichedInput.product ? { ...enrichedInput.product, logo: placeholderImage(enrichedInput.product.logo) } : enrichedInput.product };
  const shared = '你是 AdLab 的专业广告策略 Agent。只能使用用户提供的商品信息，不得引入任何历史项目或演示商品。不能把推测写成事实；不确定的信息必须标记为 needs_confirmation。所有输出必须是合法 JSON，不要使用 Markdown。';
  const imageGenerationRules = input.assetMode === 'image' ? buildImageGenerationRules(enrichedInput.market) : '';
  const includeLogoRule = input.product?.logo?.dataUrl
    ? '用户提供了商品 LOGO：如果画面里需要出现品牌标识，样式必须与该 LOGO 一致，不得自创、改写或增减字样；在 imagePrompt 中把这部分写成「保留商品 LOGO 原样」即可，不要凭描述重新设计商标。'
    : '';
  const task = {
    product: `${shared}\n任务：${input.mode === 'more-selling-points' ? '基于最新商品资料补充 2 到 4 个新的、不重复的卖点候选，不要重复 existingSellingPoints，也不要使用 removedSellingPoints。' : '理解商品并提炼卖点。'}商品资料：${JSON.stringify(promptInput)}。如果 productImage 是图片输入，结合图片识别商品外观，但无法确认的内容标记为 needs_confirmation。卖点必须附带证据来源，不能把未提供的信息当成事实，场景必须与当前商品匹配。只能返回这种结构的 JSON：${JSON.stringify(schemas.product)}`,
    strategy: `${shared}\n任务：${input.mode === 'brief' ? '根据用户最新选择生成一份精细、具体、可执行的创意简报，必须综合 selectedSellingPoints、selectedDirections、selectedAudience、目标市场、广告平台、商品图片和完整商品资料。若存在 modificationSuggestion，必须在保留有效内容的基础上按用户建议重新生成完整简报，不能只回复修改说明。' : input.mode === 'more-directions' ? '基于最新商品资料和已确认卖点补充 2 到 3 个新的、不重复的创意方向，不要重复 existingDirections，也不要使用 removedDirections。' : '基于已确认商品信息制定目标市场广告创意策略，生成 2 到 3 个创意方向。'}商品资料：${JSON.stringify(promptInput)}。每个创意方向包含卖点、场景、视觉构思、文案角度和生成依据。【写给用户看的内容一律用中文】languageAdvice、targetAudience、creativeDirections 的描述类字段（title、usageScene、copyAngle、visualConcept、coreSellingPoints、reason）以及 creativeBrief 的所有字段，都必须用简体中文书写，方便用户直接读懂。只有真正要投放到广告里的原文——hook 钩子文案、adTitle、adBody 等广告文案字段——保留目标市场语言原文，并在其后用括号补一句中文意思，例如「Ngăn khóa kéo dọc phía trước（前侧竖拉链口袋）」。creativeBrief 里如果给出画面文字或广告标语，同样先写目标市场语言原文、括号内附中文，不能只写中文，否则后续生图会缺少可用的当地语言文案。${input.mode === 'brief' ? 'creativeBrief 必须包含主题、传播目标、受众、语言表达、用户需求、卖点、场景、画面主体、人物动作、商品展示、视觉风格、构图、文案方向、标题、正文、避免内容、画幅和制作建议。' : ''}只能返回这种结构的 JSON：${JSON.stringify(schemas.strategy)}`,
    assets: `${shared}\n任务：${input.mode === 'revise-prompt' ? '根据用户对某一套广告提示词提出的修改建议，重新生成这一套完整的图片提示词和视频提示词。必须保留有效的商品、市场和广告目标信息，并真正落实用户建议；只返回 schemes 数组中的一套方案。' : input.assetMode === 'prompt' ? '生成三个完整的广告提示词素材方案，分别从用户痛点、核心卖点和真实生活场景切入。三套方案都必须完整返回图片提示词和视频提示词：schemes 数组必须恰好包含 3 个元素，不能只返回方案 A，不能把 B/C 省略为标题，也不能以“内容较长”为由减少数量；少返回即视为任务失败。' : '生成三个广告图片模板方案，分别从用户痛点、核心卖点和真实生活场景切入；这里只生成模板方案，不要假装已经生成最终图片。'}${imageGenerationRules}必须返回 schemes 数组中的${input.mode === 'revise-prompt' ? '一个' : '三个'}完整方案。每个方案必须有一个 8 到 18 字、能体现具体痛点、卖点或使用场景的中文标题，以及一段 20 到 50 字的具体简介 summary；禁止使用“广告素材方案 A/B/C”“广告图片模板 A/B/C”“未命名的创意方向”等占位标题。图片提示词 imagePrompt 必须是可直接交给图片生成模型的专业提示词，包含商品主体与外观保持、主体动作或摆放、环境场景、构图、镜头、光线、材质、画面文字预留和目标市场表达，并在同一字段末尾加入 Negative prompt。${includeLogoRule}${input.sellingPointInImage ? '本次用户希望在画面里直接展示功能卖点：请在 imagePrompt 的画面文字预留部分明确写出 1 到 2 个功能卖点文案（使用目标市场语言），并且卖点只能来自 selectedSellingPoints 与商品资料里已经存在的信息，禁止新增、改写或夸大卖点；画面文字最多两行，不要遮挡商品主体。' : ''}视频提示词 videoPrompt 必须是可直接交给视频生成模型的完整提示词，包含视频时长、画幅、分镜时间轴、主体动作、镜头运动、景别、转场、光线、声音或节奏、广告文案出现位置、商品一致性要求、画面细节、制作建议和 Negative prompt；不要把这些信息拆成需要用户另行复制的字段。本次不要输出中文翻译：imagePromptZh 与 videoPromptZh 一律返回空字符串。图片模式不展示翻译，提示词模式会由另一次独立请求补齐，这样三套方案才能一次生成完整。目标市场为${enrichedInput.market || '用户指定市场'}，广告语言为${enrichedInput.language || '目标市场当地语言'}。
【给生图模型的英文商品事实】${input.assetMode === 'image' ? '【底部信息带的文案】每套方案还要给出四段极短的当地语言文案，用来填底部信息带，必须拼写正确、不许中文、不许英文、不许占位符：bottomStatement（一句话陈述，不超过 10 个词）、sceneChips（恰好 3 条场景短词，每条 2 到 3 个词，例如徒步/露营/通勤这类真实场景）、finePrint（一行小字，不超过 8 个词）、brandLine（品牌或商品身份行，不超过 6 个词，只用资料里已有的品牌与品类，不要写「官方正品」这类未经证实的话）。四段都要短，不要写成句子段。【版式与风格标记】每套方案必须给出两个标记，值只能是下面这些英文代号。imageLayout 六选一：studio-split（左右分栏，一侧信息栏一侧商品）、lifestyle-callout（满版实景，图标卖点环绕 + 底部信息带）、center-showcase（商品居中占主体，四周环绕信息）、editorial-magazine（杂志式不对称排版，大标题 + 小图组合 + 大量留白）、multi-scene（一张主场景图 + 两三个辅助场景或细节小窗）、info-cards（商品 + 信息卡片堆叠）。designStyle 七选一：premium-editorial（高端杂志式）、lifestyle-commercial（生活方式商业广告）、outdoor-adventure（户外探索）、modern-minimal（现代极简）、premium-showcase（高端商品展示）、dynamic-ecommerce（促销氛围电商）、cinematic-campaign（电影感品牌广告）。三套模板的 imageLayout 必须互不相同，designStyle 至少出现两种；两者都要与各自的切入角度匹配，并且符合商品类别——例如护肤品不要用 outdoor-adventure，数码产品不要用 outdoor-adventure 除非资料里明确写了户外使用。【卖点解析版式】三套模板里必须有一套、也只允许一套使用卖点解析版式：在 imagePrompt 里明确写出把 4 到 5 个卖点用小图标加短标签环绕商品排布（或用细引线指向商品对应部位），并把这 4 到 5 条短标签原样写进该方案的 sellingPointCopy；每条 2 到 4 个当地语言单词，拼写必须正确，不许中文、不许英文、不许占位符，也不许写资料里没有的卖点。另外两套保持干净的商品主图，只放标题和价格，不要堆文字。' : ''}${input.assetMode === 'image' ? '结果顶层还要带一个 productFactsEn（只写一份，不要放进每个方案里，避免把 JSON 撑长）：50 到 90 个英文单词，用英文写三件事——一是商品是什么、外观与材质、关键规格；二是已确认创意简报的主题、目标受众、核心场景与文案角度；三是这次必须突出的功能卖点（逐条点名）。最后写清价格该怎么处理（只用当地货币，不写人民币金额）。它不会展示给用户，所以必须是纯英文，不能出现任何中文字符、拼音、日文假名或韩文，也不能虚构商品资料里没有的功能和参数。' : '本次是提示词模式，productFactsEn 返回空字符串即可，不要为它写任何内容。'}
【画面文字必须用当地语言，禁止中文】imagePrompt 里所有要出现在画面上的文字（主标题、副标题、卖点标签、按钮、价格与单位、免责声明）以及 videoPrompt 里的字幕、口播、画面文案，都必须使用${enrichedInput.language || '目标市场当地语言'}。严禁出现任何中文（简体或繁体），包括中文字幕、中文标签、中文水印、中文按钮、拼音标注。中文只能出现在给用户看的中文说明里，不能写进 imagePrompt/videoPrompt 的画面文字部分。imagePrompt 与 videoPrompt 内部一律不允许出现中文，包括括号里的中文翻译、中文注释和中文标点——生图模型会照着提示词的语言往画面上写字，提示词里出现的中文会被原样画到图上。给用户看的解释只写进 title、summary、angle、reason 这些说明性字段和对应的 *Zh 字段，不要塞进 imagePrompt/videoPrompt。画面文字部分必须是能直接上画的正确当地语言原文，不许留占位符、拼音、音译、中文标注或「（待定）」这类字样；宁可少写一个标签，也不要留半成品。如果某个说法不确定当地怎么写，就用更通用的表达或干脆不写文字，绝不退回中文。另外 imagePrompt 与 videoPrompt 的正文一律用英文书写（只有"画面里要出现的文字"这一部分保留当地语言原文），不要用中文写提示词——很多生图模型会照着提示词使用的语言往画面里塞文字，用中文写提示词是画面上出现中文的主要原因。【画面必须清晰】imagePrompt 必须写出明确的画质要求，并把这些英文约束带进去："ultra sharp focus, high detail, crisp edges, well-lit, no motion blur, no soft focus, deep depth of field"。商品主体与品牌标识必须在对焦范围内，虚化只允许出现在背景；不允许整幅柔焦，不允许把主体放在景深外。negativePrompt 必须包含：blurry, out of focus, motion blur, soft focus, low resolution, jpeg artifacts, grainy, noisy。
【品牌标识不得重绘】商品上的 LOGO、车标、商标、认证标识一律视为必须原样保留的元素：一是 imagePrompt 里明确写 "preserve the original brand logo exactly as in the reference image, do not redraw or restyle the emblem"；二是如果这个角度下标识占比很小、或无法确认细节，就不要把标识放在视觉中心，也不要给特写，宁可让它是画面里的小面积元素；三是绝对不能自己发明一个相似的标识，也不能把标识变成装饰图案、发光符号或抽象图形；四是完全无法确认标识时，宁可用构图避开该区域，也不要画一个错的标识。negativePrompt 必须包含：redrawn logo, invented emblem, wrong brand mark, distorted badge, illegible logo, logo turned into abstract shape, fake car emblem。
【只允许两类文字出现】画面里只允许出现两类文字：一是预先写明的、你确认拼写正确的当地语言文案；二是价格数字与货币符号。除此之外，画面里不许出现任何其他字符，包括背景招牌、包装小字、墙面贴纸、屏幕界面里的文字。如果场景需要招牌或包装细节，用纯色块、纯图形或彻底虚化来表现，不要写出具体字符。越南语、泰语这类带变音符号的语言，如果无法稳定还原符号，就把文案缩到 2 到 4 个词并把字号放大，不要整段排小字。negativePrompt 必须包含：gibberish text, pseudo text, fake letters, scrambled characters, illegible label, garbled watermark, extra text。【英文文案的字体与排版】画面里出现英文文案时，必须按下面规则处理，并在 imagePrompt 中写成明确的英文排版约束：一是字体风格，使用现代无衬线字体，观感接近 SF Pro、Helvetica Neue、Inter，笔画干净、字重统一、无装饰线，禁止手写体、衬线体、描边字、渐变字、3D 立体字和科技感线条字；二是层级，整张图只用两种字号，一个主标题加一个副标题（或只有主标题），主标题最多两行、字重 semibold 或 bold，副标题字号约为主标题的 55% 到 65%、字重 regular，不要出现第三种字号；三是排版，左对齐或居中二选一并贯穿全图，行距紧凑，约为字号的 1.1 到 1.25 倍，全大写标题可加 2% 到 4% 字距但不要拉散；四是位置，文案放在画面留白区，与画面边缘保持约 8% 的安全边距，遵循三分法，不要压在商品主体、人脸或高对比背景上；五是颜色与可读性，以纯白或近白为主，必要时用极轻的柔和投影或深色遮罩保证对比，不要描边、不要发光、不要花纹底衬；六是一致性，同一张图里字体风格必须统一，不能混用两种字体风格；七是不硬凑，只写已经确认拼写正确的英文词组，如果无法保证拼写或排版效果，就减少到一个短标题，或干脆不写文字，绝不让字母粘连、变形、错位或缺笔画。negativePrompt 必须包含：warped text, stretched text, distorted letters, illegible typography, outlined text, neon text, 3D beveled text, heavy drop shadow, script font, mixed font styles, gradient text, text over face, text covering product, uneven letter spacing, more than two font sizes。商品售价原始为人民币，广告中如果出现价格只能使用 currency.displayAmount 对应的当地货币，不能出现人民币金额；不要自行计算汇率。必须严格使用用户选中的卖点、创意方向、核心受众和已确认创意简报。保持商品图片中的外观、颜色、结构、比例和 logo 不变；没有图片或无法识别时不得虚构外观。${input.mode === 'revise-prompt' ? `当前方案：${JSON.stringify(input.scheme || {})}。用户修改建议：${JSON.stringify(input.userFeedback || '')}。` : ''}输入：${JSON.stringify(promptInput)}。只能返回这种结构的 JSON：${JSON.stringify(schemas.assets)}`,
    dataAnalysis: `${shared}\n你是 AdLab 的广告数据分析师。读者是没有跨境广告分析经验的小商家或学生：他们看得懂常识，但不懂 CTR、CVR、ROAS 这些术语，也没做过数据分析。\n你的任务：把程序已经算好的指标，写成一份专业、具体、能看懂的数据分析。\n【你会收到的输入】\n- metrics：程序算好的整体指标（CTR、CPC、CVR、CPA、ROAS、客单价、销售额、花费）以及每个广告版本的指标\n- rows：原始数据行\n- context：用户填写的背景（目标市场、广告平台、投放目标、目标受众、预算、促销、落地页问题、币种）\n- improvementPlan：程序按规则给出的改进建议（不要在分析里重复它，也不要给行动建议）\n【输出格式】严格 JSON，不要 Markdown：{"headline":"一句话结论，30 字以内","analysis":[{"title":"小节标题","detail":"这一节的分析内容"}],"limitations":["缺什么数据，因此哪件事判断不了"]}\n【headline 怎么写】\n- 结构固定为「一个具体数字 + 一个判断」。例：「每单广告费 6.43 元，占客单价 62%，成本偏紧」。\n- 禁止单独使用没有参照的形容词：便宜、贵、不错、良好、优秀、还行、正常、健康、理想。写「便宜」必须说清是哪个数字低、低到多少，否则读者不知道在跟什么比。反例：「点击便宜，但广告费吃掉客单价大半」——便宜是对谁便宜？读者无从判断。\n- 只讲一件事。不要用「但」「虽然」「不过」把两个观察拼进同一句，读者读完不知道重点是哪句。\n- 不超过 30 字。\n【硬性要求】\n1. 只引用输入里已经存在的数字。不得自己计算新指标，不得改写或编造任何数字。\n2. analysis 写 3 到 5 节，每节 40–90 字，全文不超过 380 字。\n3. 每一节都必须有数字，并且说明这个数字意味着什么。只报数字不给含义，不合格。不合格示例：「CTR 是 3%，CVR 是 7.78%」；合格示例：「曝光 12000 次换来 360 次点击，大约每 33 次展示有 1 次点击，点击表现不算差」。\n4. 禁止同义反复。不要把指标的定义复述一遍当作解释。不合格示例：「CPA 6.43 元（平均每单广告费约 6.43 元）」。\n5. 术语第一次出现时必须就地解释，用括号写在后面。示例：「CVR 7.78%（每 100 个点进来的人，约 8 个下单）」。\n6. 小节标题必须用大白话，不要用术语当标题。用「点得动人吗」「买得下吗」「钱花得值不值」「几个版本差在哪」；不要用「CTR 分析」「转化漏斗拆解」。\n7. 除最后一节「我的看法」外，其余各节只做分析，不写具体操作建议。具体动作已由另一个板块承担（见 improvementPlan），不要重复。\n8. 不做行业对比。没有可靠的行业基准数据，禁止写「高于行业平均」「低于同类水平」「达到优秀水平」。\n9. 严格区分事实与推测。数据直接显示的，直接陈述；需要推断的，必须写「可能是」。全文推测最多出现 1 次。\n10. 如果只有一个广告版本，不要写版本对比那一节，改为分析这个版本自身的转化效率。\n11. 关键字段缺失时（例如没有销售额），不要假设它存在，也不要编一个值；写进 limitations。\n12. 最后一节必须是「我的看法」，用 2 到 3 句写你自己的判断：这组数据最值得注意的地方、你更倾向哪种解释、有没有被忽略的信号。可以给方向性建议（例如「先把预算集中到一个版本，再谈优化」），但不要写具体操作清单。必须标明这是判断（用「我倾向于」「更可能是」），不能写成事实。不超过 90 字。\n【推荐的 4 节结构，可裁剪但不能乱序】\n1. 整体表现：这批数据大概是什么情况，一句话概括加关键数字\n2. 从看到买，每一环的效率：展示 → 点击 → 下单，每一环的转化率以及它意味着什么\n3. 钱花得值不值：每单成本、客单价、广告费占客单价的比例，说明成本结构\n4. 几个版本差在哪（仅当有 2 个及以上版本时）：哪个版本在哪个环节赢得明显\n5. 我的看法（必须有，放最后一节）：你自己对这组数据的判断，而不是复述数字\n【limitations 的要求】\n1 到 2 条，每条不超过 20 字，只写「缺什么字段，因此判断不了什么」，例如「没有加购数据，看不出客户在哪一步流失」。\n输入：${JSON.stringify(promptInput)}。只能返回符合以下结构的 JSON：${JSON.stringify(schemas.dataAnalysis)}`,
    promptTranslations: `${shared}\n任务：只翻译用户提供的现有广告图片提示词和视频提示词，不要重写、扩写或删减原提示词，不要生成新的创意。对 schemes 中的每一套方案分别返回 imagePromptZh 和 videoPromptZh，必须是完整、准确、自然的中文翻译，保留原提示词中的时长、画幅、镜头、分镜、负面限制和制作细节。每个 id 必须与输入完全一致。输入：${JSON.stringify(input.schemes || [])}。只能返回符合以下结构的 JSON：${JSON.stringify(schemas.promptTranslations)}`
  }[kind];
  // 商品图片最多 3 张：images 数组优先，productImage 作为兼容兜底，按 dataUrl 去重
  const visionImages = [...(Array.isArray(enrichedInput.productImages) ? enrichedInput.productImages : []), enrichedInput.productImage]
    .filter(item => item && item.dataUrl)
    .filter((item, index, list) => list.findIndex(other => other.dataUrl === item.dataUrl) === index)
    .slice(0, 3);
  // 生成素材时，如果用户传了商品 LOGO，额外附一张作为品牌参考（不占商品图的 3 张名额）
  const productLogo = enrichedInput.product?.logo;
  const includeLogo = kind === 'assets' && Boolean(productLogo?.dataUrl);
  const allVisionImages = includeLogo ? [...visionImages, productLogo] : visionImages;
  const hasVisionImage = allVisionImages.length > 0;
  const visionHint = [
    allVisionImages.length > 1 ? `请结合这 ${allVisionImages.length} 张图片完成上面的 JSON 任务。` : '请结合这张商品图片完成上面的 JSON 任务。',
    visionImages.length > 1 ? '前几张是同一件商品的不同角度。' : '',
    includeLogo ? '最后一张是商品 LOGO：画面里如果出现品牌标识，必须与它保持一致；无法保证一致时，只在画面底部预留 LOGO 位置，不要自行绘制商标文字。' : ''
  ].filter(Boolean).join('');
  const messages = hasVisionImage
    ? [{ role: 'system', content: task }, {
      role: 'user',
      content: [
        { type: 'text', text: visionHint },
        ...allVisionImages.map(item => ({ type: 'image_url', image_url: { url: item.dataUrl } }))
      ]
    }]
    : [{ role: 'system', content: task }];
  // 素材生成要一次吐 3 套完整方案，默认 max_tokens（4096）会被截断，模型会"写到一半收尾"——
  // 表现就是明明要求 3 个方案，只返回 1 个且 JSON 仍然合法，很难发现。
  const maxTokens = kind === 'assets' ? 8192 : null;
  const requestBase = { model: process.env.DEEPSEEK_MODEL || 'deepseek-chat', temperature: 0.2, response_format: { type: 'json_object' }, ...(maxTokens ? { max_tokens: maxTokens } : {}) };
  const budget = kindBudgets[kind] || 115000;
  const startedAt = Date.now();
  const data = await postDeepSeek({ ...requestBase, messages }, budget);
  let raw;
  try {
    raw = parseAnswer(data.choices?.[0]?.message?.content || '{}');
  } catch (error) {
    // 三套完整方案本来就贴着 max_tokens 上限，输出一长就被截断，JSON 尾部直接没有。
    // 素材生成失败等于用户完全卡住，所以这里压缩一版重试一次，而不是把错误直接抛给用户。
    if (kind !== 'assets' || !/Unterminated|Unexpected end|after JSON|Unexpected non-whitespace/i.test(error.message)) throw error;
    console.warn('[adlab] 素材 JSON 被截断，压缩后重试一次');
    const compactTask = `${task}\n【必须一次写完整】上一次输出因为太长被截断了。这次每套方案的 summary 控制在 25 字以内，videoPrompt 控制在 90 个英文单词以内，imagePrompt 控制在 120 个英文单词以内，不要重复已经写过的信息，务必输出完整可解析的 JSON。`;
    // 重试只能吃剩下的预算，否则两次调用叠起来会顶穿前端的 150 秒与 nginx 的 180 秒
    const remaining = Math.max(20000, budget - (Date.now() - startedAt));
    const retry = await postDeepSeek({ ...requestBase, messages: [{ role: 'system', content: compactTask }] }, remaining);
    raw = parseAnswer(retry.choices?.[0]?.message?.content || '{}');
  }
  return kind === 'product' ? normalizeProduct(raw) : kind === 'strategy' ? normalizeStrategy(raw, enrichedInput) : kind === 'assets' ? normalizeAssets(raw, enrichedInput) : kind === 'promptTranslations' ? normalizePromptTranslations(raw) : normalizeDataReview(raw);
}

export async function handleAI(kind, req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, message: 'Method not allowed' }); return; }
  try {
    const input = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    res.status(200).json({ ok: true, data: await askDeepSeek(kind, input) });
  } catch (error) {
    const friendly = friendlyAIError(error);
    console.error(`[adlab] AI 失败 kind=${kind} status=${error?.status || 0} message=${error?.message || error}`);
    res.status(friendly.status).json({ ok: false, code: error?.message || 'AI_UNKNOWN', message: friendly.message });
  }
}
