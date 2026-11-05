import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const knowledge = {
  product_showcase: require('./knowledge/product_showcase.json'),
  lifestyle_marketing: require('./knowledge/lifestyle_marketing.json'),
  creative_concept: require('./knowledge/creative_concept.json'),
  feature_benefit: require('./knowledge/feature_benefit.json')
};

const aliases = {
  product: 'product_showcase',
  showcase: 'product_showcase',
  product_showcase: 'product_showcase',
  lifestyle: 'lifestyle_marketing',
  scene: 'lifestyle_marketing',
  lifestyle_marketing: 'lifestyle_marketing',
  concept: 'creative_concept',
  creative: 'creative_concept',
  creative_concept: 'creative_concept',
  feature: 'feature_benefit',
  benefit: 'feature_benefit',
  feature_benefit: 'feature_benefit'
};

function flattenInput(input = {}) {
  return JSON.stringify({
    scheme: input.scheme || {},
    strategy: input.strategy || {},
    approvedBrief: input.approvedBrief || {},
    selectedDirections: input.selectedDirections || [],
    selectedSellingPoints: input.selectedSellingPoints || []
  }).toLowerCase();
}

export function normalizeDesignType(value) {
  const key = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return aliases[key] || '';
}

export function classifyDesignType(input = {}) {
  const explicit = normalizeDesignType(input.designType || input.assetType || input.scheme?.designType);
  if (explicit) return explicit;

  const text = flattenInput(input);
  if (/功能|卖点|规格|参数|尺寸|容量|防水|易清洗|收纳|接口|feature|benefit|specification|waterproof/.test(text)) return 'feature_benefit';
  if (/概念|隐喻|抽象|超现实|视觉转译|创意概念|节气|concept|metaphor|surreal/.test(text)) return 'creative_concept';
  if (/场景|户外|露营|通勤|运动|校园|居家|生活|使用时刻|lifestyle|outdoor|commute|camp/.test(text)) return 'lifestyle_marketing';
  return 'product_showcase';
}

export function getDesignKnowledge(input = {}) {
  const type = classifyDesignType(input);
  return { type, ...knowledge[type] };
}

export function designKnowledgeSummary(input = {}) {
  const item = getDesignKnowledge(input);
  return [
    `匹配的广告设计知识类型：${item.name}（${item.type}）`,
    `核心设计目标：${item.coreDesignGoal}`,
    `构图建议：${item.compositionPatterns.join('；')}`,
    `色彩与背景建议：${item.colorAndBackground.join('；')}`,
    `光影建议：${item.lighting.join('；')}`,
    `产品展示建议：${item.productPresentation.join('；')}`,
    `可迁移技巧：${item.transferableTechniques.join('；')}`,
    `生图注意事项：${item.generationNotes.join('；')}`,
    `禁止问题：${item.avoid.join('；')}`,
    `精简指导：${item.promptGuidance}`
  ].join('\n');
}
