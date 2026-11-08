// 通用商业广告视觉设计系统（Universal Advertising Design System）
//
// 这一层只回答四个问题：这张广告用什么层级、走什么视觉风格、用哪些模块、按什么比例排版。
// 它不生产内容——商品事实、卖点、简报、目标市场语言仍然来自用户数据，且优先级更高。
// 全部英文：这些文字会进生图提示词，中文会被画到图上。

export const LAYOUT_FAMILY_KEYS = [
  'studio-split',        // A 左右分栏
  'lifestyle-callout',   // B 全屏场景 + 图标卖点
  'center-showcase',     // C 中心商品展示
  'editorial-magazine',  // D 杂志编辑
  'multi-scene',         // E 多场景组合
  'info-cards'           // F 信息卡片
];

export const STYLE_KEYS = [
  'premium-editorial',
  'lifestyle-commercial',
  'outdoor-adventure',
  'modern-minimal',
  'premium-showcase',
  'dynamic-ecommerce',
  'cinematic-campaign'
];

// 五级视觉层级：每张广告都必须能读出这个顺序
export const HIERARCHY_SPEC = `VISUAL HIERARCHY — the viewer must read the canvas in this order, and each level must differ from the next in size, weight, position or colour:
1. the product or the核心 visual (largest area, sharpest focus, strongest contrast);
2. the headline — the one line that sells the idea;
3. two to six short selling-point labels with their icons;
4. price, scene chips, supporting facts;
5. brand mark, fine print, decorative hairlines.
Never set every line at the same size and weight. A layout where the headline and the labels share one size is a failed layout.`;

const STYLE_LIBRARY = {
  'premium-editorial': 'Premium editorial: magazine-grade restraint. Generous margins, one strong headline, hairline rules, small caps labels, muted palette with a single saturated product, soft window light and long shadows. Feels like a brand campaign page, not a store listing.',
  'lifestyle-commercial': 'Lifestyle commercial: a believable moment of use. Real environment, natural light, candid body language, the product woven into the scene rather than floating. Warm and inviting, but the product stays the sharpest object in frame.',
  'outdoor-adventure': 'Outdoor adventure: cool desaturated nature, strong directional daylight or mist, deep depth with a distant ridge or canopy, the product tested by the environment. Text sits on calm, low-detail areas only.',
  'modern-minimal': 'Modern minimalism: one product, one idea, enormous negative space, a single accent colour, geometric shadow and a clean seamless backdrop. Every element placed on a strict grid; nothing decorative.',
  'premium-showcase': 'Premium product showcase: studio control. Precise key and rim light, seamless gradient backdrop, visible material texture, crisp contact shadow, hero angle with a shallow secondary highlight. Reads as expensive.',
  'dynamic-ecommerce': 'Dynamic e-commerce: conversion-first energy. Bold price block, a promo badge, saturated accent, angled or overlapping cards, motion cues like streaks or a burst. Still legible: the price and the headline never fight.',
  'cinematic-campaign': 'Cinematic campaign: wide composition, filmic colour grading, atmospheric haze, a strong foreground-midground-background read, and type placed like a film title card. Dramatic but restrained.'
};

// 商品类别 → 场景方向 + 优先风格。顺序有意义：第一个是默认。
const CATEGORY_PROFILES = [
  {
    key: 'apparel',
    match: /服装|外套|冲锋衣|夹克|裤|裙|鞋|帽|包|apparel|jacket|coat|shirt|dress|pants|shoe|bag|wearable/i,
    scenes: 'a misty forest trail, a hillside campsite at dawn, or an urban outdoor commute in light rain',
    styles: ['outdoor-adventure', 'lifestyle-commercial', 'premium-editorial']
  },
  {
    key: 'digital',
    match: /数码|电子|耳机|充电|数据线|键盘|鼠标|手机|平板|相机|digital|electronic|earbud|charger|cable|keyboard|phone|camera|gadget/i,
    scenes: 'a clean desk at golden hour, a travel backpack laid open, a commute on the metro, or a workspace at night',
    styles: ['premium-showcase', 'modern-minimal', 'lifestyle-commercial']
  },
  {
    key: 'skincare',
    match: /护肤|化妆|精华|面霜|乳液|唇|香水|面膜|洗面|skincare|serum|cream|lotion|cosmetic|perfume|beauty/i,
    scenes: 'a stone bathroom shelf, a vanity with morning window light, or a minimalist tray with water droplets',
    styles: ['premium-editorial', 'modern-minimal', 'premium-showcase']
  },
  {
    key: 'kitchen',
    match: /厨房|锅|杯|壶|榨汁|咖啡机|餐具|切菜|kitchen|cook|pan|blender|kettle|mug|utensil/i,
    scenes: 'a bright kitchen counter mid-preparation, a dining table after serving, or fresh ingredients beside the product',
    styles: ['lifestyle-commercial', 'premium-showcase', 'modern-minimal']
  },
  {
    key: 'food',
    match: /食品|零食|饮料|茶|咖啡|饼干|糖果|food|snack|drink|tea|coffee|beverage|candy/i,
    scenes: 'a tabletop spread with the product in focus, an ingredient close-up, or a shared meal moment',
    styles: ['lifestyle-commercial', 'dynamic-ecommerce', 'premium-editorial']
  },
  {
    key: 'general',
    match: /.*/,
    scenes: 'a believable real-world setting that fits the target market and the product\u2019s actual use',
    styles: ['lifestyle-commercial', 'premium-showcase', 'modern-minimal']
  }
];

// 比例 → 画布尺寸 + 版式重心。尺寸用豆包 Seedream 已支持的常见档位。
export const ASPECT_PROFILES = {
  '1:1': {
    size: '1024x1024',
    guide: 'Square canvas. Use a two-zone split (information column beside the product) or a centre showcase with callouts left and right. Keep one clear vertical axis; the price block sits in a corner of the information zone.'
  },
  '4:5': {
    size: '864x1152',
    guide: 'Portrait social canvas, slightly taller than square. Stack three bands: headline zone at the top, product hero in the middle, information band at the bottom. Vertical stacking matters more than side columns here.'
  },
  '9:16': {
    size: '720x1280',
    guide: 'Tall mobile canvas. Build a strict vertical rhythm: brand and headline at the top, the product filling the middle 55 to 65 percent, callouts as one narrow column or two short rows, price and chips pinned near the bottom. Never stretch a square layout.'
  },
  '16:9': {
    size: '1280x720',
    guide: 'Wide banner canvas. Put the product on one third and the information on the other two thirds, or run a wide scene with a single bottom band. Keep the headline on one line; avoid tall stacked blocks.'
  }
};

// 比例档位由后端定义：前端不再自己写死，只负责展示和回传
export const ASPECT_ORDER = ['1:1', '4:5', '9:16', '16:9'];
export const ASPECT_LABELS = {
  '1:1': '1:1 方形',
  '4:5': '4:5 竖版信息流',
  '9:16': '9:16 竖屏短视频',
  '16:9': '16:9 横版'
};
export function aspectOptions() {
  return ASPECT_ORDER.map(value => ({ value, label: ASPECT_LABELS[value], size: ASPECT_PROFILES[value].size }));
}

export function normalizeAspect(value) {
  const raw = String(value || '').trim().replace(/\s/g, '');
  if (ASPECT_PROFILES[raw]) return raw;
  const map = { '1x1': '1:1', '1/1': '1:1', '4x5': '4:5', '4/5': '4:5', '9x16': '9:16', '9/16': '9:16', '16x9': '16:9', '16/9': '16:9' };
  return map[raw.toLowerCase()] || '1:1';
}

export function detectCategory(product = {}) {
  const haystack = [product.name, product.category, product.description, product.specs, product.features, product.productName]
    .filter(Boolean)
    .join(' ');
  return CATEGORY_PROFILES.find(item => item.match.test(haystack)) || CATEGORY_PROFILES[CATEGORY_PROFILES.length - 1];
}

export function normalizeLayoutKey(value) {
  const key = String(value || '').trim().toLowerCase();
  return LAYOUT_FAMILY_KEYS.includes(key) ? key : '';
}

export function normalizeStyleKey(value) {
  const key = String(value || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
  return STYLE_KEYS.includes(key) ? key : '';
}

// 决定这张广告用哪套版式、哪种风格、哪些模块、多大比例。
// 用户数据（类别、简报、方向）优先；缺什么就按类别兜底，保证永远有确定答案。
export function selectDesignPlan(input = {}) {
  const scheme = input.scheme || {};
  const category = detectCategory(input.product || {});
  const aspect = normalizeAspect(input.aspectRatio || scheme.aspectRatio || input.size);
  const family = normalizeLayoutKey(scheme.imageLayout) || familyForCategory(category, input);
  const style = normalizeStyleKey(scheme.designStyle) || category.styles[0];
  return {
    family,
    style,
    styleText: STYLE_LIBRARY[style],
    categoryKey: category.key,
    categoryScenes: category.scenes,
    aspect,
    size: ASPECT_PROFILES[aspect].size,
    aspectGuide: ASPECT_PROFILES[aspect].guide,
    modules: selectModules(scheme)
  };
}

// 没有版式标记时按类别挑一个最合适的，而不是永远默认同一种
function familyForCategory(category) {
  const byKey = {
    apparel: 'lifestyle-callout',
    digital: 'center-showcase',
    skincare: 'editorial-magazine',
    kitchen: 'info-cards',
    food: 'multi-scene',
    general: 'lifestyle-callout'
  };
  return byKey[category.key] || 'lifestyle-callout';
}

// 只列出这一张真的能排出来的模块——没有素材的模块不许占位
function selectModules(scheme = {}) {
  const modules = ['product-showcase'];
  if (scheme.adTitle) modules.push('headline');
  if (scheme.adBody) modules.push('subline');
  if (Array.isArray(scheme.sellingPointCopy) && scheme.sellingPointCopy.length) modules.push('selling-points');
  if (scheme.localPrice) modules.push('price');
  if (Array.isArray(scheme.sceneChips) && scheme.sceneChips.length) modules.push('scene-chips');
  if (scheme.bottomStatement) modules.push('statement-band');
  if (scheme.brandLine) modules.push('brand-line');
  if (scheme.finePrint) modules.push('fine-print');
  return modules;
}

const MODULE_TEXT = {
  'product-showcase': 'product showcase (the hero image of the product itself, sharpest focus, largest area)',
  headline: 'headline block (one or two lines, the largest type on the canvas)',
  subline: 'subline block (one short line under the headline, roughly one third of its size)',
  'selling-points': 'selling-point block (an icon plus a two-to-four-word label for each point, on a strict grid)',
  price: 'price block (the number at three to four times body size, the currency symbol smaller and baseline-aligned)',
  'scene-chips': 'scene-chip row (three short labels in one row, each with a small monoline icon)',
  'statement-band': 'statement band (one or two lines of supporting copy, in its own band with a scrim)',
  'brand-line': 'brand line (the brand or product identity, small and quiet)',
  'fine-print': 'fine-print line (the smallest type on the canvas, one line only)'
};

export function buildDesignSystemSection(plan) {
  const modules = plan.modules.map(item => `- ${MODULE_TEXT[item] || item}`).join('\n');
  return [
    HIERARCHY_SPEC,
    `SELECTED VISUAL STYLE — ${plan.style}:\n${plan.styleText}`,
    `SCENE DIRECTION that fits this product category (${plan.categoryKey}): ${plan.categoryScenes}. Use the environment to show what the product is for, never to invent a function it does not have.`,
    `MODULES to build on this canvas — these and no others, and only where the whitelist supplies copy for them:\n${modules}`,
    `CANVAS RATIO ${plan.aspect}:\n${plan.aspectGuide}`,
    'ACCEPTANCE CHECK before you finish: (1) the product is identifiable at a glance; (2) there is one clear visual centre; (3) at least two meaningful information levels are visible; (4) icons, cards and type form a real grid, not a pile; (5) the scene is credible for this product; (6) every word is in the target language; (7) the layout is not a plain centred product with a few text lines.'
  ].join('\n\n');
}
