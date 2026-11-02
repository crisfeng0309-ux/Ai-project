const schemas = {
  product: {
    basicInfo: { productType: '', summary: '', confirmedFunctions: [] },
    sellingPoints: [], usageScenes: [], credibilityChecks: [], pendingItems: [], warnings: []
  },
  strategy: {
    languageAdvice: { recommendedLanguage: '', tone: '', localizationNotes: [] },
    targetAudience: [], creativeDirections: []
  },
  assets: {
    adTitle: '', adBody: '', sellingPointCopy: [], imageLayout: '', imagePrompt: '', videoPrompt: '', negativePrompt: '', formatAdvice: []
  }
};

const baseUrl = () => (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
const model = () => process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const text = (value, fallback = '') => typeof value === 'string' ? value.trim() : value == null ? fallback : String(value);
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
  return {
    basicInfo: raw.basicInfo || { productType: text(product.category || product.name), summary: text(product.description), confirmedFunctions: list(product.confirmedFunctions) },
    sellingPoints: points.map(item => ({ title: text(item.title || item.point, '未命名卖点'), description: text(item.description || item.point), evidence: text(item.evidence || item.evidence_source || '来自当前项目资料'), confidence: confidence(item.confidence) })),
    usageScenes: scenes.map(item => ({ scene: text(item.scene || item.scenario), reason: text(item.reason || item.match_reason) })),
    credibilityChecks: list(raw.credibilityChecks).map(item => ({ claim: text(item.claim), source: ['user_input', 'image_observed', 'model_inference'].includes(item.source) ? item.source : 'model_inference', status: ['supported', 'inferred', 'needs_confirmation', 'risk'].includes(item.status) ? item.status : 'needs_confirmation' })).concat(uncertainties.map(item => ({ claim: text(item.item || item.claim || item), source: 'model_inference', status: 'needs_confirmation' }))),
    pendingItems: uncertainties.map(item => text(item.item || item.claim || item)),
    warnings: list(raw.warnings).map(item => text(item))
  };
}

function normalizeStrategy(raw) {
  const advice = raw.languageAdvice || raw.language_advice || {};
  const audience = raw.targetAudience || raw.target_audience || raw.audiences;
  const directions = raw.creativeDirections || raw.creative_directions || raw.directions;
  return {
    languageAdvice: { recommendedLanguage: text(advice.recommendedLanguage || advice.language, '根据目标市场选择本地语言'), tone: text(advice.tone, '清晰、直接、生活化'), localizationNotes: list(advice.localizationNotes || advice.localization_notes).map(item => text(item)) },
    targetAudience: list(audience).map(item => ({ name: text(item.name || item.audience), need: text(item.need), painPoint: text(item.painPoint || item.pain_point) })),
    creativeDirections: list(directions).map(item => ({ title: text(item.title || item.name, '未命名创意方向'), coreSellingPoints: list(item.coreSellingPoints || item.core_selling_points || item.sellingPoints).map(point => text(point)), usageScene: text(item.usageScene || item.usage_scene || item.scene), visualConcept: text(item.visualConcept || item.visual_concept || item.visual), copyAngle: text(item.copyAngle || item.copy_angle || item.message), reason: text(item.reason) }))
  };
}

function normalizeAssets(raw) {
  return { adTitle: text(raw.adTitle || raw.ad_title), adBody: text(raw.adBody || raw.ad_body), sellingPointCopy: list(raw.sellingPointCopy || raw.selling_point_copy).map(item => text(item)), imageLayout: text(raw.imageLayout || raw.image_layout), imagePrompt: text(raw.imagePrompt || raw.image_prompt), videoPrompt: text(raw.videoPrompt || raw.video_prompt), negativePrompt: text(raw.negativePrompt || raw.negative_prompt), formatAdvice: list(raw.formatAdvice || raw.format_advice).map(item => text(item)) };
}

function parseAnswer(content) {
  const cleaned = text(content, '{}').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned);
}

async function askDeepSeek(kind, input) {
  if (!process.env.DEEPSEEK_API_KEY) throw new Error('AI_NOT_CONFIGURED');
  const shared = '你是 AdLab 的专业广告策略 Agent。只能使用用户提供的商品信息，不得引入任何历史项目或演示商品。不能把推测写成事实；不确定的信息必须标记为 needs_confirmation。所有输出必须是合法 JSON，不要使用 Markdown。';
  const task = {
    product: `${shared}\n任务：理解商品并提炼卖点。商品资料：${JSON.stringify(input)}。卖点必须附带证据来源，场景必须与当前商品匹配。只能返回这种结构的 JSON：${JSON.stringify(schemas.product)}`,
    strategy: `${shared}\n任务：基于已确认商品信息制定目标市场广告创意策略。商品资料：${JSON.stringify(input)}。生成 2 到 3 个创意方向，每个方向包含卖点、场景、视觉构思和文案角度。只能返回这种结构的 JSON：${JSON.stringify(schemas.strategy)}`,
    assets: `${shared}\n任务：基于已确认商品信息和选中的创意方向生成广告文案及专业图片/视频提示词。输入：${JSON.stringify(input)}。不要虚构商品外观；没有图片时不要假设外观细节。只能返回这种结构的 JSON：${JSON.stringify(schemas.assets)}`
  }[kind];
  const response = await fetch(`${baseUrl()}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` }, body: JSON.stringify({ model: model(), temperature: 0.2, messages: [{ role: 'system', content: task }], response_format: { type: 'json_object' } }) });
  if (!response.ok) throw new Error(`AI_HTTP_${response.status}`);
  const data = await response.json();
  const raw = parseAnswer(data.choices?.[0]?.message?.content || '{}');
  return kind === 'product' ? normalizeProduct(raw) : kind === 'strategy' ? normalizeStrategy(raw) : normalizeAssets(raw);
}

export async function handleAI(kind, req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, message: 'Method not allowed' }); return; }
  try {
    const input = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    res.status(200).json({ ok: true, data: await askDeepSeek(kind, input) });
  } catch (error) {
    const status = error.message === 'AI_NOT_CONFIGURED' ? 503 : 502;
    res.status(status).json({ ok: false, code: error.message, message: error.message === 'AI_NOT_CONFIGURED' ? 'AI 服务尚未配置，请设置 DEEPSEEK_API_KEY。' : 'AI 分析暂时失败，请检查服务配置或稍后重试。' });
  }
}
