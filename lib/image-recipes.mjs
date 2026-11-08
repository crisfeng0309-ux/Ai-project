// 生图版式模板（v3）
//
// 这三套模板来自用户提供的外部设计规格，不再由我自拟：
//   SPLIT STUDIO / FEATURE ORBIT / HERO EDITORIAL
// 每套自带：分区百分比坐标、压暗梯度、四级字号、图标对齐规则、语言与文字渲染硬约束。
//
// 我的职责只有三件事：
//   1. 按 imageLayout 或商品特征选一套模板；
//   2. 把白名单文案塞进 {{占位符}}，放不下的按 slots 裁掉并回报；
//   3. 占位符为空时，把对应整块（标签 + 占位符）删掉，避免出现空标题。
// —— 这样「提示词要求的」和「实际能放的」永远一致。

export const TEMPLATE_KEYS = ['split-studio', 'feature-orbit', 'hero-editorial'];

// 旧代号（历史项目里出现过）→ 新模板
const ALIASES = {
  'split-studio': 'split-studio',
  'studio-split': 'split-studio',
  'split-dark': 'split-studio',
  'feature-orbit': 'feature-orbit',
  'lifestyle-callout': 'feature-orbit',
  'scene-band': 'feature-orbit',
  'multi-scene': 'feature-orbit',
  'hero-editorial': 'hero-editorial',
  'clean-catalog': 'hero-editorial',
  'center-showcase': 'hero-editorial',
  'editorial-magazine': 'hero-editorial',
  'info-cards': 'hero-editorial'
};

// 占位符 → 白名单字段
const PLACEHOLDERS = {
  '{{HEADLINE}}': 'headline',
  '{{SUB}}': 'subline',
  '{{CALLOUTS}}': 'callouts',
  '{{BRAND}}': 'brandLine',
  '{{STATEMENT}}': 'statement',
  '{{CHIPS}}': 'chips',
  '{{FINE}}': 'finePrint',
  '{{PRICE}}': 'price'
};

const SPLIT_STUDIO_PROMPT = `Create a square 1:1 e-commerce advertising poster using the uploaded product reference images and product information as the primary visual and factual sources.

**ART DIRECTION AND COMPOSITION**

Use a structured two-column studio advertising layout. The left side is a dominant product showcase; the right side is a compact dark information panel.

Maintain a consistent 6% safe margin on all four canvas edges.

**PRODUCT FIDELITY**

Reproduce the uploaded product faithfully. Preserve its exact color, silhouette, dimensions, proportions, materials, surface texture, construction, zipper structure, buttons, components, packaging details and original brand marks. Do not redesign, simplify or invent product features. Do not invent specifications.

Place the product in the left zone, x 6%–59%, y 8%–92%, centered around x 32%, y 50%. The product must remain fully visible and visually dominant.

**INFORMATION ARCHITECTURE**

Right information panel: x 63%–94%, y 8%–92%. Use a dark background with 78% black opacity. Blend the left edge through a horizontal gradient from transparent at x 55% to 78% black at x 70%.

All advertising text must sit entirely within this panel.

BRAND LINE — x 66%–93%, y 9%–11%, left-aligned.

{{BRAND}}

HEADLINE — x 66%–93%, y 13%–34%, maximum 3 lines, bold, largest type level.

{{HEADLINE}}

SUBLINE — x 66%–93%, y 35%–44%, maximum 2 lines.

{{SUB}}

CALLOUTS — x 66%–93%, y 48%–68%, maximum 3 vertically stacked items. Each item uses one simple monochrome line icon followed by one text label. Keep icon size, baseline alignment and vertical spacing consistent.

{{CALLOUTS}}

STATEMENT — x 66%–93%, y 71%–80%, left-aligned.

{{STATEMENT}}

PRICE — x 66%–93%, y 83%–90%, prominent numeric price with currency symbol on the same baseline.

{{PRICE}}

FINE PRINT — x 66%–93%, y 91%–94%, small regular text.

{{FINE}}

**TYPOGRAPHY SYSTEM**

Use a consistent sans-serif type family and four-level hierarchy:

Headline: 100 units, bold.
Subline: 38 units, medium.
Callouts, statement and price: 34 units.
Brand line and fine print: 22 units.

Keep text left-aligned. Maintain consistent line spacing and baseline alignment. Do not compress text unnaturally.

**LANGUAGE AND TEXT RENDERING — STRICT**

The only advertising copy permitted is the exact text supplied in the injected placeholders. Print each supplied text string character-for-character, preserving its original spelling, script, punctuation and numbers. Do not translate, paraphrase, expand, shorten, correct or add words.

All advertising copy must use the target-market language supplied in the placeholders. Do not generate Chinese characters anywhere, including packaging, boxes, labels, tags, price stickers, screens, signs or watermarks.

Do not add English advertising copy. The original product brand mark and standard currency symbols are permitted exceptions.

Do not generate pseudo-letters, mirrored letters, incomplete characters, invented glyphs or symbols substituted for letters. If a text element cannot be rendered accurately, omit that element rather than fabricate it.

**BACKGROUND AND LEGIBILITY**

Keep the information panel dark and visually quiet. Use a controlled black scrim rather than scattered shadows or decorative gradients. Keep all text away from complex textures and high-contrast product details.

**FINAL OUTPUT**

One square 1:1 advertising poster. Preserve the exact product identity. Maintain the specified coordinates, typography hierarchy, dark panel and 6% safe margins. No additional text, slogans, badges or decorative copy beyond the supplied placeholders.`;

const FEATURE_ORBIT_PROMPT = `Create a square 1:1 e-commerce advertising poster based on the uploaded product reference images, product information and creative brief.

**ART DIRECTION AND COMPOSITION**

Use a full-bleed lifestyle advertising composition. Place the product prominently in the center, surround it with six organized icon-led feature callouts, and finish with a structured dark bottom information band.

Maintain a consistent 6% safe margin on all edges.

**PRODUCT FIDELITY**

The uploaded product images are the authoritative reference for product appearance.

Preserve exact product color, shape, silhouette, proportions, dimensions, material, texture, components, zipper construction, original logo and all recognizable design details. Never redesign or substitute the product. Never invent product functions, specifications or performance claims.

MAIN PRODUCT ZONE: x 23%–77%, y 19%–70%, centered around x 50%, y 44%.

Keep the complete product recognizable and unobstructed.

**BACKGROUND**

Use a realistic contextual environment derived from the supplied creative brief and target market. The environment must support the product rather than compete with it.

Keep the central product region visually clear. Do not introduce unrelated products, logos, signs or additional text.

**TOP ADVERTISING ZONE**

Apply a top scrim extending from y 0% to y 24%, transitioning from 72% black opacity at the top edge to transparent at y 24%.

HEADLINE: x 9%–91%, y 7%–19%, centered, bold, maximum 2 lines.

{{HEADLINE}}

SUBLINE: x 15%–85%, y 19%–25%, centered, maximum 1–2 lines.

{{SUB}}

**FEATURE ORBIT**

Arrange six feature callouts around the central product.

LEFT GROUP: x 7%–28%, y 32%–64%, three vertically stacked callouts.

RIGHT GROUP: x 72%–93%, y 32%–64%, three vertically stacked callouts.

Each callout contains one simple monochrome line icon and one short text label. Keep icon dimensions, stroke thickness, spacing and text alignment consistent.

Use localized soft black backing at approximately 38% opacity behind the callout groups. Feather the backing edges. Do not create visible rectangular cards.

{{CALLOUTS}}

Do not let icons or labels overlap the product silhouette. Keep callouts within their assigned columns.

**BOTTOM INFORMATION BAND**

Create a full-width dark bottom band from y 74% to y 100%.

Apply a vertical black gradient transitioning from transparent at y 65% to 88% black at y 82%, maintaining 88% black opacity to the bottom edge.

STATEMENT: x 7%–48%, y 79%–89%, left-aligned.

{{STATEMENT}}

PRICE: x 57%–93%, y 79%–89%, right-aligned. Keep the currency symbol and numerical amount together.

{{PRICE}}

BRAND LINE: x 7%–45%, y 91%–95%, left-aligned.

{{BRAND}}

CHIPS: x 50%–93%, y 91%–95%, maximum 3 horizontally arranged compact text chips. Use consistent padding and spacing.

{{CHIPS}}

FINE PRINT: x 7%–93%, y 96%–98%, left-aligned.

{{FINE}}

**TYPOGRAPHY SYSTEM**

Use the same consistent sans-serif type family and four-level hierarchy throughout:

Headline: 100 units, bold.
Subline: 38 units, medium.
Callouts, statement and price: 32 units.
Brand line, chips and fine print: 22 units.

Maintain consistent font weights, line spacing and optical alignment. Use strong contrast between headline and supporting information.

**ICON SYSTEM**

Use simple, semantically relevant monochrome line icons. All icons must share one visual style, stroke thickness and optical size. Pair each icon with its exact corresponding supplied callout. Never invent additional feature claims.

**LANGUAGE AND TEXT RENDERING — STRICT**

All advertising text must come exclusively from the injected placeholders. Print the supplied strings character-for-character. Do not translate, rewrite, paraphrase, correct, shorten or add any text.

All advertising copy must use the target-market language provided by the placeholders.

No Chinese characters may appear anywhere in the image, including packaging, labels, tags, signs, screens, boxes, price stickers or watermarks.

No English advertising copy is allowed. Original product brand marks and standard currency symbols are permitted exceptions.

Never create pseudo-letters, mirrored letters, broken characters, incomplete glyphs or invented symbols. If any text cannot be rendered accurately, omit that text element instead of generating inaccurate characters.

**FINAL OUTPUT**

One square 1:1 advertising poster with a central product, six organized callouts, a controlled top scrim and a dark bottom information band. Preserve all product details and exact placeholder text. No additional copy or unrequested visual elements.`;

const HERO_EDITORIAL_PROMPT = `Create a square 1:1 e-commerce advertising poster using the uploaded product images, product information and creative brief.

**ART DIRECTION AND COMPOSITION**

Use a full-frame contextual advertising composition with one dominant central product. Organize advertising copy into a compact top editorial section and a structured dark bottom information section.

Maintain a consistent 6% safe margin on all four canvas edges.

The composition must prioritize the product, followed by the headline, supporting information and price.

**PRODUCT FIDELITY**

Use the uploaded product images as the definitive visual reference.

Preserve exact product color, silhouette, proportions, construction, materials, surface finish, texture, zipper structure, components, packaging details and original brand identifiers.

Do not redesign the product, invent missing components, alter its proportions or fabricate specifications.

HERO PRODUCT ZONE: x 17%–83%, y 25%–75%, centered around x 50%, y 50%.

Allow the product to occupy approximately 50%–65% of the visible canvas area when its geometry permits. Keep it unobstructed and fully recognizable.

**BACKGROUND**

Create a realistic contextual scene based on the supplied creative brief and target-market environment.

Use controlled depth of field. Background details must support the product and remain visually subordinate. Keep text areas away from complex textures and high-contrast objects.

**TOP EDITORIAL SECTION**

Apply a full-width top scrim from y 0% to y 35%.

Gradient opacity: 82% black at y 0%, 35% black at y 20%, transparent at y 35%.

BRAND LINE: x 8%–92%, y 7%–11%, centered.

{{BRAND}}

HEADLINE: x 8%–92%, y 13%–25%, centered, bold, maximum 2 lines.

{{HEADLINE}}

SUBLINE: x 15%–85%, y 26%–33%, centered, maximum 2 lines.

{{SUB}}

**PRODUCT FEATURE SECTION**

CALLOUTS: x 8%–92%, y 55%–69%.

Arrange a maximum of 2 feature callouts horizontally in equal-width columns.

Each callout contains one monochrome line icon and one short text label. Use consistent icon scale, stroke thickness, spacing and text alignment.

Keep the callouts outside the central product silhouette. Do not place text directly over the product.

{{CALLOUTS}}

**BOTTOM INFORMATION SECTION**

Create a full-width dark bottom scrim from y 69% to y 100%.

Gradient opacity: transparent at y 62%, transitioning to 88% black at y 79%, maintaining 88% black through the bottom edge.

STATEMENT: x 8%–55%, y 79%–88%, left-aligned.

{{STATEMENT}}

PRICE: x 65%–92%, y 79%–89%, right-aligned. Keep currency symbol and numeric amount together on one baseline.

{{PRICE}}

CHIPS: x 8%–92%, y 91%–95%, maximum 3 horizontally arranged compact text chips. Use uniform spacing and padding.

{{CHIPS}}

FINE PRINT: x 8%–92%, y 96%–98%, centered.

{{FINE}}

**TYPOGRAPHY SYSTEM**

Use the same consistent sans-serif type family and four-level hierarchy:

Headline: 100 units, bold.
Subline: 38 units, medium.
Callouts, statement and price: 34 units.
Brand line, chips and fine print: 22 units.

Maintain consistent typography, line spacing, alignment and contrast. Do not use decorative lettering or excessively condensed characters.

**LANGUAGE AND TEXT RENDERING — STRICT**

Only render advertising text supplied in the injected placeholders. Reproduce each string character-for-character, preserving its original script, spelling, punctuation and numerical values.

Do not translate, paraphrase, rewrite, expand, shorten, correct or add any advertising text.

All advertising copy must use the target-market language supplied in the placeholders.

Do not generate Chinese characters anywhere in the image, including packaging, boxes, labels, tags, washing labels, price stickers, screens, signs or watermarks.

Do not generate English advertising copy. Original product brand marks and standard currency symbols are permitted exceptions.

Never generate pseudo-letters, mirrored characters, broken text, incomplete glyphs or symbols substituted for letters. If a text element cannot be reproduced accurately, omit it rather than inventing an alternative.

**VISUAL CONSISTENCY**

Keep both top and bottom scrims within the specified gradient ranges. Maintain consistent typography, icon style, safe margins and information hierarchy.

Do not introduce extra badges, slogans, labels, promotional stickers or decorative copy.

**FINAL OUTPUT**

One square 1:1 advertising poster. Central product remains the dominant focal point. All advertising information stays within its assigned top or bottom region. Preserve product fidelity and exact supplied text.`;

const TEMPLATES = {
  'split-studio': {
    label: '影棚分栏',
    name: 'SPLIT STUDIO',
    fits: '强调产品质感、材质细节、核心功能和专业参数的商品（数码、户外装备、摄影器材、家电、高单价消费品）',
    slots: { headline: 1, subline: 1, callouts: 3, brandLine: 1, statement: 1, chips: 0, finePrint: 1, price: 1 },
    prompt: SPLIT_STUDIO_PROMPT
  },
  'feature-orbit': {
    label: '实景环绕',
    name: 'FEATURE ORBIT',
    fits: '强调多个功能卖点、使用场景和快速信息传达的商品（榨汁杯、运动装备、厨房小家电、户外用品、日用消费品）',
    slots: { headline: 1, subline: 1, callouts: 6, brandLine: 1, statement: 1, chips: 3, finePrint: 1, price: 1 },
    prompt: FEATURE_ORBIT_PROMPT
  },
  'hero-editorial': {
    label: '编辑式主视觉',
    name: 'HERO EDITORIAL',
    fits: '强调单一核心卖点、产品外观、生活方式和场景氛围的商品（服装、鞋包、香水、护肤品、摄影器材、设计型消费品）',
    slots: { headline: 1, subline: 1, callouts: 2, brandLine: 1, statement: 1, chips: 3, finePrint: 1, price: 1 },
    prompt: HERO_EDITORIAL_PROMPT
  }
};

export function normalizeTemplateKey(value) {
  const raw = String(value || '').trim().toLowerCase();
  return ALIASES[raw] || ALIASES[raw.replace(/\s+/g, '-')] || '';
}

// 自动选版：卖点多的走 FEATURE ORBIT，服装/香水类走 HERO EDITORIAL，其余走 SPLIT STUDIO
export function defaultTemplateFor(input = {}) {
  const product = input.product || {};
  const scheme = input.scheme || {};
  const calloutCount = Array.isArray(scheme.sellingPointCopy) ? scheme.sellingPointCopy.filter(Boolean).length : 0;
  const haystack = [product.name, product.category, product.description, product.features].filter(Boolean).join(' ').toLowerCase();
  if (calloutCount >= 4) return 'feature-orbit';
  if (/服装|鞋|包|香水|护肤|apparel|jacket|coat|shirt|shoe|bag|perfume/.test(haystack)) return 'hero-editorial';
  return 'split-studio';
}

export function resolveTemplate(input = {}) {
  const scheme = input.scheme || {};
  const key = normalizeTemplateKey(scheme.imageLayout || input.imageLayout) || defaultTemplateFor(input);
  return { key, template: TEMPLATES[key] };
}

export function templateSpec(key) {
  return TEMPLATES[key] || TEMPLATES['feature-orbit'];
}

export function templateList() {
  return TEMPLATE_KEYS.map(key => ({ key, label: TEMPLATES[key].label, name: TEMPLATES[key].name, fits: TEMPLATES[key].fits }));
}

// 按 slots 裁剪文案，放不下的如实回报
export function fitSlots(slots, copy = {}) {
  const fitted = {
    headline: slots.headline ? String(copy.headline || '').trim() : '',
    subline: slots.subline ? String(copy.subline || '').trim() : '',
    callouts: slots.callouts ? (copy.callouts || []).filter(Boolean).slice(0, slots.callouts) : [],
    brandLine: slots.brandLine ? String(copy.brandLine || '').trim() : '',
    statement: slots.statement ? String(copy.statement || '').trim() : '',
    chips: slots.chips ? (copy.chips || []).filter(Boolean).slice(0, slots.chips) : [],
    finePrint: slots.finePrint ? String(copy.finePrint || '').trim() : '',
    price: slots.price ? String(copy.price || '').trim() : ''
  };
  const dropped = [];
  for (const key of ['headline', 'subline', 'brandLine', 'statement', 'finePrint', 'price']) {
    if (copy[key] && !fitted[key]) dropped.push(key);
  }
  if ((copy.callouts || []).length > fitted.callouts.length) dropped.push(`callouts×${copy.callouts.length - fitted.callouts.length}`);
  if ((copy.chips || []).length > fitted.chips.length) dropped.push(`chips×${copy.chips.length - fitted.chips.length}`);
  return { fitted, dropped };
}

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value && String(value).trim());
}

// 标签块与占位符块在模板里是分开的两段，删占位符时必须把它的标签一起删掉
const LABEL_PATTERN = {
  '{{BRAND}}': /BRAND LINE/i,
  '{{HEADLINE}}': /HEADLINE/i,
  '{{SUB}}': /SUBLINE/i,
  '{{CALLOUTS}}': /CALLOUTS/i,
  '{{STATEMENT}}': /STATEMENT/i,
  '{{PRICE}}': /PRICE/i,
  '{{CHIPS}}': /CHIPS/i,
  '{{FINE}}': /FINE PRINT/i
};

export function renderTemplate(template, fitted) {
  const blocks = String(template || '').split(/\n{2,}/);
  const kept = [];
  for (const block of blocks) {
    const used = Object.keys(PLACEHOLDERS).filter(ph => block.includes(ph));
    if (!used.length) { kept.push(block); continue; }
    const missing = used.filter(ph => !hasValue(fitted[PLACEHOLDERS[ph]]));
    if (missing.length) {
      // 上一段如果正是这些占位符的标签行，一并删掉，避免留下「BRAND LINE — x …%」的空标题
      const prev = kept[kept.length - 1];
      if (prev && missing.some(ph => LABEL_PATTERN[ph] && LABEL_PATTERN[ph].test(prev))) kept.pop();
      continue;
    }
    let out = block;
    for (const ph of used) {
      const value = fitted[PLACEHOLDERS[ph]];
      out = out.split(ph).join(Array.isArray(value) ? value.join('\n') : value);
    }
    kept.push(out);
  }
  return kept.join('\n\n');
}

export function unresolvedPlaceholders(text) {
  return Object.keys(PLACEHOLDERS).filter(ph => String(text).includes(ph));
}
