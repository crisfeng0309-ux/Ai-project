import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

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
    properties: { adTitle: { type: 'string' }, adBody: { type: 'string' }, sellingPointCopy: { type: 'array', items: { type: 'string' } }, imageLayout: { type: 'string' }, imagePrompt: { type: 'string' }, videoPrompt: { type: 'string' }, negativePrompt: { type: 'string' }, formatAdvice: { type: 'array', items: { type: 'string' } } },
    required: ['adTitle', 'adBody', 'sellingPointCopy', 'imageLayout', 'imagePrompt', 'videoPrompt', 'negativePrompt', 'formatAdvice'],
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

function normalizeStrategy(raw) {
  const advice = raw.languageAdvice || raw.language_advice || {};
  const audience = raw.targetAudience || raw.target_audience || raw.audiences || [];
  const directions = raw.creativeDirections || raw.creative_directions || raw.directions || [];
  return {
    languageAdvice: {
      recommendedLanguage: text(advice.recommendedLanguage || advice.language, '根据目标市场选择本地语言'),
      tone: text(advice.tone, '清晰、直接、生活化'),
      localizationNotes: (advice.localizationNotes || advice.localization_notes || []).map(item => text(item))
    },
    targetAudience: audience.map(item => ({
      name: text(item.name || item.audience), need: text(item.need), painPoint: text(item.painPoint || item.pain_point)
    })),
    creativeDirections: directions.map(item => ({
      title: text(item.title || item.name, '未命名创意方向'),
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

function normalizeAssets(raw) {
  return {
    adTitle: text(raw.adTitle || raw.ad_title),
    adBody: text(raw.adBody || raw.ad_body),
    sellingPointCopy: (raw.sellingPointCopy || raw.selling_point_copy || []).map(item => text(item)),
    imageLayout: text(raw.imageLayout || raw.image_layout),
    imagePrompt: text(raw.imagePrompt || raw.image_prompt),
    videoPrompt: text(raw.videoPrompt || raw.video_prompt),
    negativePrompt: text(raw.negativePrompt || raw.negative_prompt),
    formatAdvice: (raw.formatAdvice || raw.format_advice || []).map(item => text(item))
  };
}

function normalizeAnswer(kind, raw) {
  if (kind === 'product') return normalizeProduct(raw);
  if (kind === 'strategy') return normalizeStrategy(raw);
  return normalizeAssets(raw);
}

async function askDeepSeek(kind, input) {
  if (!process.env.DEEPSEEK_API_KEY) throw new Error('AI_NOT_CONFIGURED');
  const shared = '你是 AdLab 的专业广告策略 Agent。只能使用用户提供的商品信息，不得引入任何历史项目或演示商品。不能把推测写成事实；不确定的信息必须标记为 needs_confirmation。所有输出必须是合法 JSON，不要使用 Markdown。';
  const schemaText = kind => JSON.stringify(schemas[kind]);
  const prompts = {
    product: `${shared}\n任务：${input.mode === 'more-selling-points' ? '基于最新商品资料补充 2 到 4 个新的、不重复的卖点候选。不要重复 existingSellingPoints，也不要使用 removedSellingPoints。' : '理解商品并提炼卖点。'}商品资料：${JSON.stringify(input)}。卖点必须附带证据来源，不能把未提供的信息当成事实，场景必须与当前商品匹配。只能返回符合以下结构的 JSON：${schemaText('product')}`,
    strategy: `${shared}\n任务：${input.mode === 'brief' ? '根据用户最新选择生成一份精细、具体、可执行的创意简报。必须综合 selectedSellingPoints、selectedDirections、selectedAudience、目标市场、广告平台和完整商品资料，不能返回泛泛而谈的描述。' : input.mode === 'more-directions' ? '基于最新商品资料和已确认卖点，补充 2 到 3 个新的、不重复的创意方向。不要重复 existingDirections，也不要使用 removedDirections。' : '基于已确认商品信息制定目标市场广告创意策略，生成 2 到 3 个创意方向。'}商品资料：${JSON.stringify(input)}。每个创意方向包含卖点、场景、视觉构思、文案角度和生成依据。${input.mode === 'brief' ? 'creativeBrief 必须包含主题、传播目标、受众、语言表达、用户需求、卖点、场景、画面主体、人物动作、商品展示、视觉风格、构图、文案方向、标题、正文、避免内容、画幅和制作建议。' : ''}只能返回符合以下结构的 JSON：${schemaText('strategy')}`,
    assets: `${shared}\n任务：基于已确认商品信息和选中的创意方向生成广告文案及专业图片/视频提示词。输入：${JSON.stringify(input)}。不要虚构商品外观；没有图片时不要假设外观细节。只能返回符合以下结构的 JSON：${schemaText('assets')}`
  };
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
    body: JSON.stringify({ model, temperature: 0.2, messages: [{ role: 'system', content: prompts[kind] }], response_format: { type: 'json_object' } })
  });
  if (!response.ok) throw new Error(`AI_HTTP_${response.status}`);
  const data = await response.json();
  return normalizeAnswer(kind, parseJsonAnswer(data.choices?.[0]?.message?.content || '{}'));
}

async function handleApi(req, res, path) {
  const body = await readBody(req);
  const kind = path.endsWith('product-understanding') ? 'product' : path.endsWith('creative-strategy') ? 'strategy' : 'assets';
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
      if (req.method !== 'POST' || !['/api/product-understanding', '/api/creative-strategy', '/api/ad-assets'].includes(url.pathname)) return json(res, 404, { ok: false, message: 'Not found' });
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
