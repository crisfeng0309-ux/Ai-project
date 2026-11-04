import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveCurrency } from './lib/currency.mjs';
import { generateDoubaoImage, imageGenerationErrorMessage } from './lib/image-generation.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4173);
const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

const schemas = {
  product: {
    type: 'object',
    properties: {
      basicInfo: { type: 'object', properties: { productType: { type: 'string' }, summary: { type: 'string' }, confirmedFunctions: { type: 'array', items: { type: 'string' } } }, required: ['productType', 'summary', 'confirmedFunctions'], additionalProperties: false },
      sellingPoints: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, evidence: { type: 'string' }, confidence: { type: 'string', enum: ['confirmed', 'inferred', 'needs_confirmation'] } }, required: ['title', 'description', 'evidence', 'confidence'], additionalProperties: false } },
      usageScenes: { type: 'array', items: { type: 'object', properties: { scene: { type: 'string' }, reason: { type: 'string' } }, required: ['scene', 'reason'], additionalProperties: false } },
      credibilityChecks: { type: 'array', items: { type: 'object', properties: { claim: { type: 'string' }, source: { type: 'string', enum: ['user_input', 'image_observed', 'model_inference'] }, status: { type: 'string', enum: ['supported', 'inferred', 'needs_confirmation', 'risk'] } }, required: ['claim', 'source', 'status'], additionalProperties: false } },
      pendingItems: { type: 'array', items: { type: 'string' } },
      warnings: { type: 'array', items: { type: 'string' } }
    },
    required: ['basicInfo', 'sellingPoints', 'usageScenes', 'credibilityChecks', 'pendingItems', 'warnings'],
    additionalProperties: false
  },
  strategy: {
    type: 'object',
    properties: {
      languageAdvice: { type: 'object', properties: { recommendedLanguage: { type: 'string' }, tone: { type: 'string' }, localizationNotes: { type: 'array', items: { type: 'string' } } }, required: ['recommendedLanguage', 'tone', 'localizationNotes'], additionalProperties: false },
      targetAudience: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, need: { type: 'string' }, painPoint: { type: 'string' } }, required: ['name', 'need', 'painPoint'], additionalProperties: false } },
      creativeDirections: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, coreSellingPoints: { type: 'array', items: { type: 'string' } }, usageScene: { type: 'string' }, visualConcept: { type: 'string' }, copyAngle: { type: 'string' }, reason: { type: 'string' } }, required: ['title', 'coreSellingPoints', 'usageScene', 'visualConcept', 'copyAngle', 'reason'], additionalProperties: false } },
      creativeBrief: { type: 'object', properties: { theme: { type: 'string' }, objective: { type: 'string' }, audience: { type: 'string' }, languageExpression: { type: 'string' }, problem: { type: 'string' }, sellingPoints: { type: 'array', items: { type: 'string' } }, usageScene: { type: 'string' }, visualSubject: { type: 'string' }, actions: { type: 'string' }, productDisplay: { type: 'string' }, visualStyle: { type: 'string' }, composition: { type: 'string' }, copyDirection: { type: 'string' }, headline: { type: 'string' }, body: { type: 'string' }, avoid: { type: 'string' }, formats: { type: 'array', items: { type: 'string' } }, productionNotes: { type: 'string' } }, required: ['theme', 'objective', 'audience', 'languageExpression', 'problem', 'sellingPoints', 'usageScene', 'visualSubject', 'actions', 'productDisplay', 'visualStyle', 'composition', 'copyDirection', 'headline', 'body', 'avoid', 'formats', 'productionNotes'], additionalProperties: false }
    },
    required: ['languageAdvice', 'targetAudience', 'creativeDirections'],
    additionalProperties: false
  },
  assets: {
    type: 'object',
    properties: {
      adTitle: { type: 'string' }, adTitleZh: { type: 'string' }, adBody: { type: 'string' }, adBodyZh: { type: 'string' }, sellingPointCopy: { type: 'array', items: { type: 'string' } }, imageLayout: { type: 'string' }, imagePrompt: { type: 'string' }, imagePromptZh: { type: 'string' }, videoPrompt: { type: 'string' }, videoPromptZh: { type: 'string' }, negativePrompt: { type: 'string' }, formatAdvice: { type: 'array', items: { type: 'string' } }, currency: { type: 'object' },
      schemes: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, summary: { type: 'string' }, angle: { type: 'string' }, imageUrl: { type: 'string' }, adTitle: { type: 'string' }, adTitleZh: { type: 'string' }, adBody: { type: 'string' }, adBodyZh: { type: 'string' }, hook: { type: 'string' }, sellingPointCopy: { type: 'array', items: { type: 'string' } }, imageLayout: { type: 'string' }, imagePrompt: { type: 'string' }, imagePromptZh: { type: 'string' }, videoPrompt: { type: 'string' }, videoPromptZh: { type: 'string' }, negativePrompt: { type: 'string' }, formatAdvice: { type: 'array', items: { type: 'string' } }, shotList: { type: 'array', items: { type: 'string' } }, productionNotes: { type: 'string' }, localPrice: { type: 'string' }, targetAudience: { type: 'array', items: { type: 'string' } }, qualityChecks: { type: 'array', items: { type: 'string' } } }, required: ['id', 'title', 'summary', 'angle', 'imageUrl', 'adTitle', 'adTitleZh', 'adBody', 'adBodyZh', 'hook', 'sellingPointCopy', 'imageLayout', 'imagePrompt', 'imagePromptZh', 'videoPrompt', 'videoPromptZh', 'negativePrompt', 'formatAdvice', 'shotList', 'productionNotes', 'localPrice', 'targetAudience', 'qualityChecks'], additionalProperties: false } }
    },
    required: ['adTitle', 'adTitleZh', 'adBody', 'adBodyZh', 'sellingPointCopy', 'imageLayout', 'imagePrompt', 'imagePromptZh', 'videoPrompt', 'videoPromptZh', 'negativePrompt', 'formatAdvice', 'currency', 'schemes'],
    additionalProperties: false
  },
  dataAnalysis: {
    type: 'object',
    properties: {
      dataIntegrity: { type: 'array', items: { type: 'string' } },
      supportedConclusions: { type: 'array', items: { type: 'string' } },
      hypotheses: { type: 'array', items: { type: 'string' } },
      unknowns: { type: 'array', items: { type: 'string' } },
      possibleCauses: { type: 'array', items: { type: 'string' } },
      experiments: { type: 'array', items: { type: 'string' } },
      tasks: { type: 'array', items: { type: 'string' } }
    },
    required: ['dataIntegrity', 'supportedConclusions', 'hypotheses', 'unknowns', 'possibleCauses', 'experiments', 'tasks'],
    additionalProperties: false
  },
  promptTranslations: {
    type: 'object',
    properties: {
      translations: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, imagePromptZh: { type: 'string' }, videoPromptZh: { type: 'string' } }, required: ['id', 'imagePromptZh', 'videoPromptZh'], additionalProperties: false } }
    },
    required: ['translations'],
    additionalProperties: false
  }
};

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let text = '';
  for await (const chunk of req) text += chunk;
  return text ? JSON.parse(text) : {};
}

function parseJsonAnswer(content) {
  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned);
}

function text(value, fallback = '') {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function confidence(value) {
  const normalized = text(value).toLowerCase();
  if (normalized.includes('need') || normalized.includes('uncertain') || normalized.includes('待确认')) return 'needs_confirmation';
  if (normalized.includes('infer') || normalized.includes('推测')) return 'inferred';
  return 'confirmed';
}

function normalizeProduct(raw) {
  const product = raw.product || {};
  const points = raw.sellingPoints || raw.selling_points || [];
  const scenes = raw.usageScenes || raw.scenarios || [];
  const uncertainties = raw.pendingItems || raw.uncertainties || [];
  return {
    basicInfo: raw.basicInfo || {
      productType: text(product.category || product.name),
      summary: text(product.description),
      confirmedFunctions: Array.isArray(product.confirmedFunctions) ? product.confirmedFunctions : []
    },
    sellingPoints: points.map(item => ({
      title: text(item.title || item.point, '未命名卖点'),
      description: text(item.description || item.point),
      evidence: text(item.evidence || item.evidence_source || '来自当前项目资料'),
      confidence: confidence(item.confidence)
    })),
    usageScenes: scenes.map(item => ({
      scene: text(item.scene || item.scenario),
      reason: text(item.reason || item.match_reason)
    })),
    credibilityChecks: (raw.credibilityChecks || []).map(item => ({
      claim: text(item.claim),
      source: ['user_input', 'image_observed', 'model_inference'].includes(item.source) ? item.source : 'model_inference',
      status: ['supported', 'inferred', 'needs_confirmation', 'risk'].includes(item.status) ? item.status : 'needs_confirmation'
    })).concat(uncertainties.map(item => ({
      claim: text(item.item || item.claim), source: 'model_inference', status: 'needs_confirmation'
    }))),
    pendingItems: uncertainties.map(item => text(item.item || item.claim || item)),
    warnings: (raw.warnings || []).map(item => text(item))
  };
}

function normalizeStrategy(raw, input = {}) {
  const advice = raw.languageAdvice || raw.language_advice || {};
  const audience = raw.targetAudience || raw.target_audience || raw.audiences || [];
  const directions = raw.creativeDirections || raw.creative_directions || raw.directions || [];
  return {
    languageAdvice: {
      recommendedLanguage: text(advice.recommendedLanguage || advice.language, '根据目标市场选择本地语言'),
      tone: text(advice.tone, '清晰、直接、生活化'),
      localizationNotes: (advice.localizationNotes || advice.localization_notes || []).map(item => text(item))
    },
    targetAudience: audience.map((item, index) => normalizeAudience(item, index, input)),
    creativeDirections: directions.map((item, index) => ({
      title: directionTitle(item, index),
      coreSellingPoints: (item.coreSellingPoints || item.core_selling_points || item.sellingPoints || []).map(point => text(point)),
      usageScene: text(item.usageScene || item.usage_scene || item.scene),
      visualConcept: text(item.visualConcept || item.visual_concept || item.visual),
      copyAngle: text(item.copyAngle || item.copy_angle || item.message),
      reason: text(item.reason)
    })),
    creativeBrief: raw.creativeBrief || raw.creative_brief ? {
      theme: text((raw.creativeBrief || raw.creative_brief).theme || (raw.creativeBrief || raw.creative_brief).title),
      objective: text((raw.creativeBrief || raw.creative_brief).objective),
      audience: text((raw.creativeBrief || raw.creative_brief).audience),
      languageExpression: text((raw.creativeBrief || raw.creative_brief).languageExpression || (raw.creativeBrief || raw.creative_brief).language_expression),
      problem: text((raw.creativeBrief || raw.creative_brief).problem),
      sellingPoints: ((raw.creativeBrief || raw.creative_brief).sellingPoints || (raw.creativeBrief || raw.creative_brief).selling_points || []).map(item => text(item)),
      usageScene: text((raw.creativeBrief || raw.creative_brief).usageScene || (raw.creativeBrief || raw.creative_brief).usage_scene),
      visualSubject: text((raw.creativeBrief || raw.creative_brief).visualSubject || (raw.creativeBrief || raw.creative_brief).visual_subject),
      actions: text((raw.creativeBrief || raw.creative_brief).actions),
      productDisplay: text((raw.creativeBrief || raw.creative_brief).productDisplay || (raw.creativeBrief || raw.creative_brief).product_display),
      visualStyle: text((raw.creativeBrief || raw.creative_brief).visualStyle || (raw.creativeBrief || raw.creative_brief).visual_style),
      composition: text((raw.creativeBrief || raw.creative_brief).composition),
      copyDirection: text((raw.creativeBrief || raw.creative_brief).copyDirection || (raw.creativeBrief || raw.creative_brief).copy_direction),
      headline: text((raw.creativeBrief || raw.creative_brief).headline),
      body: text((raw.creativeBrief || raw.creative_brief).body),
      avoid: text((raw.creativeBrief || raw.creative_brief).avoid),
      formats: ((raw.creativeBrief || raw.creative_brief).formats || []).map(item => text(item)),
      productionNotes: text((raw.creativeBrief || raw.creative_brief).productionNotes || (raw.creativeBrief || raw.creative_brief).production_notes)
    } : null
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
    sellingPointCopy: (item.sellingPointCopy || item.selling_point_copy || fallback.sellingPointCopy || []).map(value => text(value)),
    imageLayout: text(item.imageLayout || item.image_layout || fallback.imageLayout),
    imagePrompt: text(item.imagePrompt || item.image_prompt || fallback.imagePrompt),
    imagePromptZh: text(item.imagePromptZh || item.image_prompt_zh || fallback.imagePromptZh),
    videoPrompt: text(item.videoPrompt || item.video_prompt || fallback.videoPrompt),
    videoPromptZh: text(item.videoPromptZh || item.video_prompt_zh || fallback.videoPromptZh),
    negativePrompt: text(item.negativePrompt || item.negative_prompt || fallback.negativePrompt),
    formatAdvice: (item.formatAdvice || item.format_advice || fallback.formatAdvice || []).map(value => text(value)),
    shotList: (item.shotList || item.shot_list || []).map(value => text(value)),
    productionNotes: text(item.productionNotes || item.production_notes),
    localPrice: text(item.localPrice || item.local_price || fallback.currency?.displayAmount),
    targetAudience: (item.targetAudience || item.target_audience || []).map(value => text(typeof value === 'string' ? value : value?.name)),
    qualityChecks: (item.qualityChecks || item.quality_checks || []).map(value => text(value))
  };
}

function normalizeAssets(raw, input = {}) {
  const fallback = {
    adTitle: text(raw.adTitle || raw.ad_title),
    adTitleZh: text(raw.adTitleZh || raw.ad_title_zh || raw.titleChinese),
    adBody: text(raw.adBody || raw.ad_body),
    adBodyZh: text(raw.adBodyZh || raw.ad_body_zh || raw.bodyChinese),
    sellingPointCopy: (raw.sellingPointCopy || raw.selling_point_copy || []).map(item => text(item)),
    imageLayout: text(raw.imageLayout || raw.image_layout),
    imagePrompt: text(raw.imagePrompt || raw.image_prompt),
    imagePromptZh: text(raw.imagePromptZh || raw.image_prompt_zh),
    videoPrompt: text(raw.videoPrompt || raw.video_prompt),
    videoPromptZh: text(raw.videoPromptZh || raw.video_prompt_zh),
    negativePrompt: text(raw.negativePrompt || raw.negative_prompt),
    formatAdvice: (raw.formatAdvice || raw.format_advice || []).map(item => text(item)),
    currency: raw.currency || input.currency || {}
  };
  const rawSchemes = raw.schemes || raw.assetSchemes || raw.asset_schemes || [];
  const schemes = Array.isArray(rawSchemes) && rawSchemes.length ? rawSchemes.map((item, index) => normalizeAssetScheme(item, index, fallback)) : [normalizeAssetScheme(fallback, 0, fallback)];
  const primary = schemes[0];
  return { ...primary, currency: raw.currency || input.currency || {}, schemes };
}

function normalizePromptTranslations(raw) {
  const translations = raw.translations || raw.promptTranslations || raw.prompt_translations || [];
  return {
    translations: Array.isArray(translations) ? translations.map((item, index) => ({
      id: text(item.id, `scheme-${index + 1}`),
      imagePromptZh: text(item.imagePromptZh || item.image_prompt_zh || item.imageTranslation || item.image_translation),
      videoPromptZh: text(item.videoPromptZh || item.video_prompt_zh || item.videoTranslation || item.video_translation)
    })) : []
  };
}

function normalizeDataReview(raw) {
  const list = value => Array.isArray(value) ? value.map(item => text(typeof item === 'string' ? item : item?.detail || item?.title || JSON.stringify(item))) : [];
  return {
    dataIntegrity: list(raw.dataIntegrity || raw.data_integrity),
    supportedConclusions: list(raw.supportedConclusions || raw.supported_conclusions),
    hypotheses: list(raw.hypotheses || raw.reasonableHypotheses || raw.reasonable_hypotheses),
    unknowns: list(raw.unknowns || raw.cannotDetermine || raw.cannot_determine),
    possibleCauses: list(raw.possibleCauses || raw.possible_causes),
    experiments: list(raw.experiments || raw.nextExperiments || raw.next_experiments),
    tasks: list(raw.tasks || raw.actionItems || raw.action_items)
  };
}

function normalizeAnswer(kind, raw, input = {}) {
  if (kind === 'product') return normalizeProduct(raw);
  if (kind === 'strategy') return normalizeStrategy(raw, input);
  if (kind === 'dataAnalysis') return normalizeDataReview(raw);
  if (kind === 'promptTranslations') return normalizePromptTranslations(raw);
  return normalizeAssets(raw, input);
}

async function askDeepSeek(kind, input) {
  if (!process.env.DEEPSEEK_API_KEY) throw new Error('AI_NOT_CONFIGURED');
  const enrichedInput = { ...input, currency: resolveCurrency(input) };
  const promptInput = { ...enrichedInput, productImage: enrichedInput.productImage ? { ...enrichedInput.productImage, dataUrl: enrichedInput.productImage.dataUrl ? '[商品图片已作为附件传入]' : '' } : null };
  const shared = '你是 AdLab 的专业广告策略 Agent。只能使用用户提供的商品信息，不得引入任何历史项目或演示商品。不能把推测写成事实；不确定的信息必须标记为 needs_confirmation。所有输出必须是合法 JSON，不要使用 Markdown。';
  const schemaText = kind => JSON.stringify(schemas[kind]);
  const prompts = {
    product: `${shared}\n任务：${input.mode === 'more-selling-points' ? '基于最新商品资料补充 2 到 4 个新的、不重复的卖点候选。不要重复 existingSellingPoints，也不要使用 removedSellingPoints。' : '理解商品并提炼卖点。'}商品资料：${JSON.stringify(promptInput)}。如果 productImage 是图片输入，结合图片识别商品外观，但无法确认的内容标记为 needs_confirmation。卖点必须附带证据来源，不能把未提供的信息当成事实，场景必须与当前商品匹配。只能返回符合以下结构的 JSON：${schemaText('product')}`,
    strategy: `${shared}\n任务：${input.mode === 'brief' ? '根据用户最新选择生成一份精细、具体、可执行的创意简报。必须综合 selectedSellingPoints、selectedDirections、selectedAudience、目标市场、广告平台、商品图片和完整商品资料，不能返回泛泛而谈的描述。若存在 modificationSuggestion，必须在保留有效内容的基础上按用户建议重新生成完整简报；不能只回复修改说明。' : input.mode === 'more-directions' ? '基于最新商品资料和已确认卖点，补充 2 到 3 个新的、不重复的创意方向。不要重复 existingDirections，也不要使用 removedDirections。' : '基于已确认商品信息制定目标市场广告创意策略，生成 2 到 3 个创意方向。'}商品资料：${JSON.stringify(promptInput)}。每个创意方向必须有一个根据场景、卖点或传播角度生成的清晰中文标题，禁止返回“未命名创意方向”、空标题或泛化占位标题。每个创意方向还要包含卖点、场景、视觉构思、文案角度和生成依据。${input.mode === 'brief' ? 'creativeBrief 必须包含主题、传播目标、受众、语言表达、用户需求、卖点、场景、画面主体、人物动作、商品展示、视觉风格、构图、文案方向、标题、正文、避免内容、画幅和制作建议。' : ''}只能返回符合以下结构的 JSON：${schemaText('strategy')}`,
    assets: `${shared}\n任务：${input.mode === 'revise-prompt' ? '根据用户对某一套广告提示词提出的修改建议，重新生成这一套完整的图片提示词和视频提示词。必须保留有效的商品、市场和广告目标信息，并真正落实用户建议；只返回 schemes 数组中的一套方案。' : input.assetMode === 'prompt' ? '生成三个完整的广告提示词素材方案，分别从用户痛点、核心卖点和真实生活场景切入。三套方案都必须完整返回图片提示词、视频提示词以及两者各自的中文翻译，不能只返回方案 A，也不能把 B/C 省略为标题。' : '生成三个广告图片模板方案，分别从用户痛点、核心卖点和真实生活场景切入；这里只生成模板方案，不要假装已经生成最终图片。'}必须返回 schemes 数组中的${input.mode === 'revise-prompt' ? '一个' : '三个'}完整方案。每个方案必须有一个 8 到 18 字、能体现具体痛点、卖点或使用场景的中文标题，以及一段 20 到 50 字的具体简介 summary；禁止使用“广告素材方案 A/B/C”“广告图片模板 A/B/C”“未命名的创意方向”等占位标题。图片提示词 imagePrompt 必须是可直接交给图片生成模型的专业提示词，包含商品主体与外观保持、主体动作或摆放、环境场景、构图、镜头、光线、材质、画面文字预留和目标市场表达，并在同一字段末尾加入 Negative prompt。视频提示词 videoPrompt 必须是可直接交给视频生成模型的完整提示词，包含视频时长、画幅、分镜时间轴、主体动作、镜头运动、景别、转场、光线、声音或节奏、广告文案出现位置、商品一致性要求、画面细节、制作建议和 Negative prompt；不要把这些信息拆成需要用户另行复制的字段。imagePromptZh 和 videoPromptZh 必须分别是对应英文提示词的完整、忠实中文翻译。目标市场为${enrichedInput.market || '用户指定市场'}，广告语言为${enrichedInput.language || '目标市场当地语言'}。商品售价原始为人民币，广告中如果出现价格只能使用 currency.displayAmount 对应的当地货币，不能出现人民币金额；不要自行计算汇率。必须严格使用用户选中的卖点、创意方向、核心受众和已确认创意简报。保持商品图片中的外观、颜色、结构、比例和 logo 不变；没有图片或无法识别时不得虚构外观。${input.mode === 'revise-prompt' ? `当前方案：${JSON.stringify(input.scheme || {})}。用户修改建议：${JSON.stringify(input.userFeedback || '')}。` : ''}输入：${JSON.stringify(promptInput)}。只能返回符合以下结构的 JSON：${schemaText('assets')}`,
    dataAnalysis: `${shared}\n任务：分析用户上传的广告投放数据。程序已经计算了 CTR、CPC、CVR、CPA、ROAS 等指标，你只能解释这些指标、比较广告版本、指出证据边界并提出实验建议，不能自行改写或臆造数字。必须严格区分数据直接支持、合理推测、当前无法判断和需要补充数据。输入：${JSON.stringify(promptInput)}。只能返回符合以下结构的 JSON：${schemaText('dataAnalysis')}`,
    promptTranslations: `${shared}\n任务：只翻译用户提供的现有广告图片提示词和视频提示词，不要重写、扩写或删减原提示词，不要生成新的创意。对 schemes 中的每一套方案分别返回 imagePromptZh 和 videoPromptZh，必须是完整、准确、自然的中文翻译，保留原提示词中的时长、画幅、镜头、分镜、负面限制和制作细节。每个 id 必须与输入完全一致。输入：${JSON.stringify(input.schemes || [])}。只能返回符合以下结构的 JSON：${schemaText('promptTranslations')}`
  };
  const hasVisionImage = Boolean(enrichedInput.productImage?.dataUrl);
  const messages = hasVisionImage
    ? [{ role: 'system', content: prompts[kind] }, { role: 'user', content: [{ type: 'text', text: '请结合这张商品图片完成上面的 JSON 任务。' }, { type: 'image_url', image_url: { url: enrichedInput.productImage.dataUrl } }] }]
    : [{ role: 'system', content: prompts[kind] }];
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
    body: JSON.stringify({ model: hasVisionImage ? (process.env.DEEPSEEK_VISION_MODEL || model) : model, temperature: 0.2, messages, response_format: { type: 'json_object' } })
  });
  if (!response.ok) throw new Error(`AI_HTTP_${response.status}`);
  const data = await response.json();
  return normalizeAnswer(kind, parseJsonAnswer(data.choices?.[0]?.message?.content || '{}'), enrichedInput);
}

async function handleApi(req, res, path) {
  const body = await readBody(req);
  if (path === '/api/generate-image') {
    try { return json(res, 200, { ok: true, data: await generateDoubaoImage(body) }); }
    catch (error) {
      const status = ['IMAGE_API_NOT_CONFIGURED', 'IMAGE_MODEL_NOT_CONFIGURED'].includes(error.message) ? 503 : 502;
      return json(res, status, { ok: false, code: error.message, message: imageGenerationErrorMessage(error) });
    }
  }
  const kind = path.endsWith('product-understanding') ? 'product' : path.endsWith('creative-strategy') ? 'strategy' : path.endsWith('data-analysis') ? 'dataAnalysis' : path.endsWith('prompt-translations') ? 'promptTranslations' : 'assets';
  try { json(res, 200, { ok: true, data: await askDeepSeek(kind, body) }); }
  catch (error) {
    const status = error.message === 'AI_NOT_CONFIGURED' ? 503 : 502;
    json(res, status, { ok: false, code: error.message, message: error.message === 'AI_NOT_CONFIGURED' ? 'AI 服务尚未配置，请设置 DEEPSEEK_API_KEY。' : 'AI 分析暂时失败，请检查服务配置或稍后重试。' });
  }
}

const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) {
       if (req.method !== 'POST' || !['/api/product-understanding', '/api/creative-strategy', '/api/ad-assets', '/api/data-analysis', '/api/prompt-translations', '/api/generate-image'].includes(url.pathname)) return json(res, 404, { ok: false, message: 'Not found' });
      return await handleApi(req, res, url.pathname);
    }
    const requested = url.pathname === '/' ? '/index.html' : url.pathname;
    const filePath = normalize(join(root, requested));
    if (!filePath.startsWith(root)) return json(res, 403, { ok: false, message: 'Forbidden' });
    const file = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(file);
  } catch { json(res, 404, { ok: false, message: 'Not found' }); }
});

server.listen(port, () => console.log(`AdLab server running at http://localhost:${port}`));
