import { resolveCurrency } from './currency.mjs';

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
    adTitle: '', adTitleZh: '', adBody: '', adBodyZh: '', sellingPointCopy: [], imageLayout: '', imagePrompt: '', videoPrompt: '', negativePrompt: '', formatAdvice: [], currency: {}, schemes: []
  },
  dataAnalysis: {
    dataIntegrity: [], supportedConclusions: [], hypotheses: [], unknowns: [], possibleCauses: [], experiments: [], tasks: []
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

function normalizeAssetScheme(item, index, fallback = {}) {
  return {
    id: text(item.id, `scheme-${index + 1}`),
    title: text(item.title || item.name, `广告素材方案 ${String.fromCharCode(65 + index)}`),
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
    videoPrompt: text(item.videoPrompt || item.video_prompt || fallback.videoPrompt),
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
    videoPrompt: text(raw.videoPrompt || raw.video_prompt),
    negativePrompt: text(raw.negativePrompt || raw.negative_prompt),
    formatAdvice: list(raw.formatAdvice || raw.format_advice).map(item => text(item)),
    currency: raw.currency || input.currency || {}
  };
  const rawSchemes = list(raw.schemes || raw.assetSchemes || raw.asset_schemes);
  const schemes = rawSchemes.length ? rawSchemes.map((item, index) => normalizeAssetScheme(item, index, fallback)) : [normalizeAssetScheme(fallback, 0, fallback)];
  const primary = schemes[0] || normalizeAssetScheme(fallback, 0, fallback);
  return { ...primary, currency: raw.currency || input.currency || {}, schemes };
}

function normalizeDataReview(raw) {
  const list = value => Array.isArray(value) ? value.map(item => typeof item === 'string' ? item.trim() : item) : [];
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

function parseAnswer(content) {
  const cleaned = text(content, '{}').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned);
}

async function askDeepSeek(kind, input) {
  if (!process.env.DEEPSEEK_API_KEY) throw new Error('AI_NOT_CONFIGURED');
  const enrichedInput = { ...input, currency: resolveCurrency(input) };
  const promptInput = { ...enrichedInput, productImage: enrichedInput.productImage ? { ...enrichedInput.productImage, dataUrl: enrichedInput.productImage.dataUrl ? '[商品图片已作为附件传入]' : '' } : null };
  const shared = '你是 AdLab 的专业广告策略 Agent。只能使用用户提供的商品信息，不得引入任何历史项目或演示商品。不能把推测写成事实；不确定的信息必须标记为 needs_confirmation。所有输出必须是合法 JSON，不要使用 Markdown。';
  const task = {
    product: `${shared}\n任务：${input.mode === 'more-selling-points' ? '基于最新商品资料补充 2 到 4 个新的、不重复的卖点候选，不要重复 existingSellingPoints，也不要使用 removedSellingPoints。' : '理解商品并提炼卖点。'}商品资料：${JSON.stringify(promptInput)}。如果 productImage 是图片输入，结合图片识别商品外观，但无法确认的内容标记为 needs_confirmation。卖点必须附带证据来源，不能把未提供的信息当成事实，场景必须与当前商品匹配。只能返回这种结构的 JSON：${JSON.stringify(schemas.product)}`,
    strategy: `${shared}\n任务：${input.mode === 'brief' ? '根据用户最新选择生成一份精细、具体、可执行的创意简报，必须综合 selectedSellingPoints、selectedDirections、selectedAudience、目标市场、广告平台、商品图片和完整商品资料。若存在 modificationSuggestion，必须在保留有效内容的基础上按用户建议重新生成完整简报，不能只回复修改说明。' : input.mode === 'more-directions' ? '基于最新商品资料和已确认卖点补充 2 到 3 个新的、不重复的创意方向，不要重复 existingDirections，也不要使用 removedDirections。' : '基于已确认商品信息制定目标市场广告创意策略，生成 2 到 3 个创意方向。'}商品资料：${JSON.stringify(promptInput)}。每个创意方向包含卖点、场景、视觉构思、文案角度和生成依据。${input.mode === 'brief' ? 'creativeBrief 必须包含主题、传播目标、受众、语言表达、用户需求、卖点、场景、画面主体、人物动作、商品展示、视觉风格、构图、文案方向、标题、正文、避免内容、画幅和制作建议。' : ''}只能返回这种结构的 JSON：${JSON.stringify(schemas.strategy)}`,
    assets: `${shared}\n任务：综合用户提供的全部最新资料，生成三组具体、精细、可执行的广告素材方案，分别从用户痛点、核心卖点和真实生活场景切入。每组必须同时生成目标市场当地语言的广告标题和正文、忠实中文翻译、图片生成提示词、视频生成提示词、负面提示词、镜头/构图/制作信息。目标市场为${enrichedInput.market || '用户指定市场'}，广告语言为${enrichedInput.language || '目标市场当地语言'}。商品售价原始为人民币，广告中如果出现价格只能使用 currency.displayAmount 对应的当地货币，不能出现人民币金额；不要自行计算汇率。必须严格使用用户选中的卖点、创意方向、核心受众和已确认创意简报。保持商品图片中的外观、颜色、结构、比例和 logo 不变；没有图片或无法识别时不得虚构外观。不要生成“未命名的创意方向”。输入：${JSON.stringify(promptInput)}。只能返回这种结构的 JSON：${JSON.stringify(schemas.assets)}`,
    dataAnalysis: `${shared}\n任务：分析用户上传的广告投放数据。程序已经计算了 CTR、CPC、CVR、CPA、ROAS 等指标，你只能解释这些指标、比较广告版本、指出证据边界并提出实验建议，不能自行改写或臆造数字。必须严格区分数据直接支持、合理推测、当前无法判断和需要补充数据。输入：${JSON.stringify(promptInput)}。只能返回这种结构的 JSON：${JSON.stringify(schemas.dataAnalysis)}`
  }[kind];
  const hasVisionImage = Boolean(enrichedInput.productImage?.dataUrl);
  const messages = hasVisionImage
    ? [{ role: 'system', content: task }, { role: 'user', content: [{ type: 'text', text: '请结合这张商品图片完成上面的 JSON 任务。' }, { type: 'image_url', image_url: { url: enrichedInput.productImage.dataUrl } }] }]
    : [{ role: 'system', content: task }];
  const response = await fetch(`${baseUrl()}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` }, body: JSON.stringify({ model: hasVisionImage ? (process.env.DEEPSEEK_VISION_MODEL || model()) : model(), temperature: 0.2, messages, response_format: { type: 'json_object' } }) });
  if (!response.ok) throw new Error(`AI_HTTP_${response.status}`);
  const data = await response.json();
  const raw = parseAnswer(data.choices?.[0]?.message?.content || '{}');
  return kind === 'product' ? normalizeProduct(raw) : kind === 'strategy' ? normalizeStrategy(raw, enrichedInput) : kind === 'assets' ? normalizeAssets(raw, enrichedInput) : normalizeDataReview(raw);
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
