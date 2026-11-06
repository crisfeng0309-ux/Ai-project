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
    adTitle: '', adTitleZh: '', adBody: '', adBodyZh: '', sellingPointCopy: [], imageLayout: '', imagePrompt: '', imagePromptZh: '', videoPrompt: '', videoPromptZh: '', negativePrompt: '', formatAdvice: [], currency: {}, schemes: [{ id: '', title: '', summary: '', angle: '', imageUrl: '', adTitle: '', adTitleZh: '', adBody: '', adBodyZh: '', hook: '', sellingPointCopy: [], imageLayout: '', imagePrompt: '', imagePromptZh: '', videoPrompt: '', videoPromptZh: '', negativePrompt: '', formatAdvice: [], shotList: [], productionNotes: '', localPrice: '', targetAudience: [], qualityChecks: [] }]
  },
  promptTranslations: { translations: [] },
  dataAnalysis: {
    headline: '', keyFindings: [], likelyCauses: [], nextSteps: [], limitations: []
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
    currency: raw.currency || input.currency || {}
  };
  const rawSchemes = list(raw.schemes || raw.assetSchemes || raw.asset_schemes);
  const schemes = rawSchemes.length ? rawSchemes.map((item, index) => normalizeAssetScheme(item, index, fallback)) : [normalizeAssetScheme(fallback, 0, fallback)];
  const primary = schemes[0] || normalizeAssetScheme(fallback, 0, fallback);
  return { ...primary, currency: raw.currency || input.currency || {}, schemes };
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
  // 复盘只保留 5 个板块，并且硬性限制条数，避免输出又长又散
  return {
    headline: sentence(raw.headline || raw.summary || raw.conclusion),
    keyFindings: pick('keyFindings', 'key_findings', 'supportedConclusions', 'supported_conclusions').slice(0, 3),
    likelyCauses: pick('likelyCauses', 'likely_causes', 'possibleCauses', 'possible_causes', 'hypotheses').slice(0, 2),
    nextSteps: pick('nextSteps', 'next_steps', 'tasks', 'actionItems', 'action_items', 'experiments').slice(0, 3),
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

async function askDeepSeek(kind, input) {
  if (!process.env.DEEPSEEK_API_KEY) throw new Error('AI_NOT_CONFIGURED');
  const enrichedInput = { ...input, currency: resolveCurrency(input) };
  const promptInput = { ...enrichedInput, productImage: enrichedInput.productImage ? { ...enrichedInput.productImage, dataUrl: enrichedInput.productImage.dataUrl ? '[商品图片已作为附件传入]' : '' } : null };
  const shared = '你是 AdLab 的专业广告策略 Agent。只能使用用户提供的商品信息，不得引入任何历史项目或演示商品。不能把推测写成事实；不确定的信息必须标记为 needs_confirmation。所有输出必须是合法 JSON，不要使用 Markdown。';
  const imageGenerationRules = input.assetMode === 'image' ? buildImageGenerationRules(enrichedInput.market) : '';
  const task = {
    product: `${shared}\n任务：${input.mode === 'more-selling-points' ? '基于最新商品资料补充 2 到 4 个新的、不重复的卖点候选，不要重复 existingSellingPoints，也不要使用 removedSellingPoints。' : '理解商品并提炼卖点。'}商品资料：${JSON.stringify(promptInput)}。如果 productImage 是图片输入，结合图片识别商品外观，但无法确认的内容标记为 needs_confirmation。卖点必须附带证据来源，不能把未提供的信息当成事实，场景必须与当前商品匹配。只能返回这种结构的 JSON：${JSON.stringify(schemas.product)}`,
    strategy: `${shared}\n任务：${input.mode === 'brief' ? '根据用户最新选择生成一份精细、具体、可执行的创意简报，必须综合 selectedSellingPoints、selectedDirections、selectedAudience、目标市场、广告平台、商品图片和完整商品资料。若存在 modificationSuggestion，必须在保留有效内容的基础上按用户建议重新生成完整简报，不能只回复修改说明。' : input.mode === 'more-directions' ? '基于最新商品资料和已确认卖点补充 2 到 3 个新的、不重复的创意方向，不要重复 existingDirections，也不要使用 removedDirections。' : '基于已确认商品信息制定目标市场广告创意策略，生成 2 到 3 个创意方向。'}商品资料：${JSON.stringify(promptInput)}。每个创意方向包含卖点、场景、视觉构思、文案角度和生成依据。${input.mode === 'brief' ? 'creativeBrief 必须包含主题、传播目标、受众、语言表达、用户需求、卖点、场景、画面主体、人物动作、商品展示、视觉风格、构图、文案方向、标题、正文、避免内容、画幅和制作建议。' : ''}只能返回这种结构的 JSON：${JSON.stringify(schemas.strategy)}`,
    assets: `${shared}\n任务：${input.mode === 'revise-prompt' ? '根据用户对某一套广告提示词提出的修改建议，重新生成这一套完整的图片提示词和视频提示词。必须保留有效的商品、市场和广告目标信息，并真正落实用户建议；只返回 schemes 数组中的一套方案。' : input.assetMode === 'prompt' ? '生成三个完整的广告提示词素材方案，分别从用户痛点、核心卖点和真实生活场景切入。三套方案都必须完整返回图片提示词、视频提示词以及两者各自的中文翻译，不能只返回方案 A，也不能把 B/C 省略为标题。' : '生成三个广告图片模板方案，分别从用户痛点、核心卖点和真实生活场景切入；这里只生成模板方案，不要假装已经生成最终图片。'}${imageGenerationRules}必须返回 schemes 数组中的${input.mode === 'revise-prompt' ? '一个' : '三个'}完整方案。每个方案必须有一个 8 到 18 字、能体现具体痛点、卖点或使用场景的中文标题，以及一段 20 到 50 字的具体简介 summary；禁止使用“广告素材方案 A/B/C”“广告图片模板 A/B/C”“未命名的创意方向”等占位标题。图片提示词 imagePrompt 必须是可直接交给图片生成模型的专业提示词，包含商品主体与外观保持、主体动作或摆放、环境场景、构图、镜头、光线、材质、画面文字预留和目标市场表达，并在同一字段末尾加入 Negative prompt。视频提示词 videoPrompt 必须是可直接交给视频生成模型的完整提示词，包含视频时长、画幅、分镜时间轴、主体动作、镜头运动、景别、转场、光线、声音或节奏、广告文案出现位置、商品一致性要求、画面细节、制作建议和 Negative prompt；不要把这些信息拆成需要用户另行复制的字段。imagePromptZh 和 videoPromptZh 必须分别是对应英文提示词的完整、忠实中文翻译。目标市场为${enrichedInput.market || '用户指定市场'}，广告语言为${enrichedInput.language || '目标市场当地语言'}。商品售价原始为人民币，广告中如果出现价格只能使用 currency.displayAmount 对应的当地货币，不能出现人民币金额；不要自行计算汇率。必须严格使用用户选中的卖点、创意方向、核心受众和已确认创意简报。保持商品图片中的外观、颜色、结构、比例和 logo 不变；没有图片或无法识别时不得虚构外观。${input.mode === 'revise-prompt' ? `当前方案：${JSON.stringify(input.scheme || {})}。用户修改建议：${JSON.stringify(input.userFeedback || '')}。` : ''}输入：${JSON.stringify(promptInput)}。只能返回这种结构的 JSON：${JSON.stringify(schemas.assets)}`,
    dataAnalysis: `${shared}\n任务：根据程序已经算好的广告数据，写一份给「没有数据分析经验的小商家」看的复盘。读者可能是学生或小店老板，看得懂常识，但不懂 CTR、CVR、ROAS 这些术语。\n硬性要求：\n1. 只能解释输入里已经存在的数字，不得自己计算、改写或编造任何数字；引用时必须与输入完全一致。\n2. keyFindings 必须有数字支撑。没有数字支撑的判断只能放进 likelyCauses，并且必须写明「可能」。\n3. 用日常中文和短句。必须出现术语时，紧接着用括号解释，例如「ROAS 1.8（每花 1 元广告费收回 1.8 元）」。\n4. 禁止空话。不要写「优化素材」「提升转化」这类无法执行的建议；每条行动都要具体到改什么、怎么改、怎么判断有没有效。\n5. 条数上限：headline 只有一句；keyFindings 最多 3 条；likelyCauses 最多 2 条；nextSteps 恰好 3 条；limitations 最多 2 条。\n6. 每一条不超过 45 个字。\n7. 不承诺效果、不夸大；数据不够支撑判断时，直接说不够。\n字段含义：headline=一句话总结这份数据最关键的判断；keyFindings=数据能直接证明的结论（每条带具体数字）；likelyCauses=可能的原因（推测，必须写「可能」）；nextSteps=接下来可以立即动手做的三件事；limitations=因为缺了什么数据，所以哪些事判断不了。输入：${JSON.stringify(promptInput)}。只能返回这种结构的 JSON：${JSON.stringify(schemas.dataAnalysis)}`,
    promptTranslations: `${shared}\n任务：只翻译用户提供的现有广告图片提示词和视频提示词，不要重写、扩写或删减原提示词，不要生成新的创意。对 schemes 中的每一套方案分别返回 imagePromptZh 和 videoPromptZh，必须是完整、准确、自然的中文翻译，保留原提示词中的时长、画幅、镜头、分镜、负面限制和制作细节。每个 id 必须与输入完全一致。输入：${JSON.stringify(input.schemes || [])}。只能返回符合以下结构的 JSON：${JSON.stringify(schemas.promptTranslations)}`
  }[kind];
  const hasVisionImage = Boolean(enrichedInput.productImage?.dataUrl);
  const messages = hasVisionImage
    ? [{ role: 'system', content: task }, { role: 'user', content: [{ type: 'text', text: '请结合这张商品图片完成上面的 JSON 任务。' }, { type: 'image_url', image_url: { url: enrichedInput.productImage.dataUrl } }] }]
    : [{ role: 'system', content: task }];
  const response = await fetch(`${baseUrl()}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` }, body: JSON.stringify({ model: hasVisionImage ? (process.env.DEEPSEEK_VISION_MODEL || model()) : model(), temperature: 0.2, messages, response_format: { type: 'json_object' } }) });
  if (!response.ok) throw new Error(`AI_HTTP_${response.status}`);
  const data = await response.json();
  const raw = parseAnswer(data.choices?.[0]?.message?.content || '{}');
  return kind === 'product' ? normalizeProduct(raw) : kind === 'strategy' ? normalizeStrategy(raw, enrichedInput) : kind === 'assets' ? normalizeAssets(raw, enrichedInput) : kind === 'promptTranslations' ? normalizePromptTranslations(raw) : normalizeDataReview(raw);
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
