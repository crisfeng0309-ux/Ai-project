// 生图版式模板（v4）
//
// 三套模板来自用户提供的「Seedream 电商广告海报生产模板 V2.0」，原样接入：
//   SCENE ORBIT（场景环绕）/ DARK SPLIT（深色分栏）/ EDITORIAL BAND（场景编辑）
// 每套自带：分区百分比坐标、压暗梯度、四级字号、图标规范、语言与文字渲染硬约束，
// 以及「商品视觉占比 / 信息区边界 / 文字与商品避让」的明确规则。
//
// 程序这边只做四件事：
//   1. 按 imageLayout 或商品特征选模板；
//   2. 把白名单文案填进 {{占位符}}；
//   3. 按 slots 裁剪放不下的文案，并如实回报；
//   4. 占位符为空时，把它和它的标签块一起删掉，避免空标题。

export const TEMPLATE_KEYS = ['scene-orbit', 'dark-split', 'editorial-band'];

// 历史代号 → 新模板（保证老项目也能出图）
const ALIASES = {
  'scene-orbit': 'scene-orbit',
  'feature-orbit': 'scene-orbit',
  'scene-band': 'scene-orbit',
  'lifestyle-callout': 'scene-orbit',
  'multi-scene': 'scene-orbit',

  'dark-split': 'dark-split',
  'split-studio': 'dark-split',
  'split-dark': 'dark-split',
  'studio-split': 'dark-split',
  'info-cards': 'dark-split',

  'editorial-band': 'editorial-band',
  'hero-editorial': 'editorial-band',
  'clean-catalog': 'editorial-band',
  'center-showcase': 'editorial-band',
  'editorial-magazine': 'editorial-band'
};

const PLACEHOLDERS = {
  '{{HEADLINE}}': 'headline',
  '{{SUB}}': 'subline',
  '{{CALLOUTS}}': 'callouts',
  '{{BRAND}}': 'brandLine',
  '{{STATEMENT}}': 'statement',
  '{{CHIPS}}': 'chips',
  '{{FINE}}': 'finePrint',
  '{{PRICE}}': 'price',
  '{{PLATFORM}}': 'platform',
  '{{CTA}}': 'cta',
  '{{PRICENOTE}}': 'priceNote'
};

const SCENE_ORBIT_PROMPT = `Create a square 1:1 e-commerce advertising poster using the uploaded product reference images, product information and creative brief.

## 1. VISUAL COMPOSITION

Create a full-bleed lifestyle advertising composition with a dominant central product, a centered top headline, six symmetrically distributed icon-led feature callouts and a structured dark bottom information band.

Use a consistent 6% safe margin on all four edges.

The visual hierarchy must be:

1. Product as the primary visual focal point.
2. Headline as the primary advertising message.
3. Six feature callouts as secondary information.
4. Bottom statement and price as supporting commercial information.

## 2. PRODUCT FIDELITY

Use the uploaded product images as the authoritative visual reference.

Preserve the exact product color, silhouette, proportions, dimensions, material, texture, construction, zipper placement, buttons, pockets, components and original brand identifiers.

Do not redesign, simplify, substitute or invent product details.

Place the product within x 25%–75%, y 29%–85%, centered around x 50%, y 56%.

The product must remain recognizable and unobstructed.

If a human model is included, the product must remain the primary subject. The model's pose, clothing and interaction must not obscure important product details.

## 3. BACKGROUND

Use a realistic lifestyle environment derived from the supplied creative brief and target market.

Create natural environmental depth, realistic lighting and controlled background contrast.

Keep the areas behind all text visually quiet. Do not introduce unrelated brands, signs, labels or decorative copy.

## 4. TOP INFORMATION ZONE

BRAND LINE:
Position x 35%–65%, y 4%–12%, centered.

{{BRAND}}

HEADLINE:
Position x 12%–88%, y 13%–25%, centered, maximum 2 lines.

{{HEADLINE}}

SUBLINE:
Position x 15%–85%, y 26%–32%, centered, maximum 2 lines.

{{SUB}}

Apply a controlled top black scrim from y 0% to y 35%, transitioning from 75% black opacity at the top edge to transparent at y 35%.

## 5. FEATURE CALLOUTS

Create exactly six feature callouts, arranged symmetrically.

LEFT GROUP:
x 6%–27%, y 32%–65%, three vertically stacked items.

RIGHT GROUP:
x 73%–94%, y 32%–65%, three vertically stacked items.

{{CALLOUTS}}

Each callout must contain:

- One simple monochrome line icon.
- One corresponding short text label.
- Consistent icon dimensions and stroke thickness.
- Consistent spacing and optical alignment.

Use approximately 45% black opacity behind each callout group, with soft feathered edges.

Keep all six callouts outside the central product silhouette.

## 6. BOTTOM INFORMATION BAND

Create a full-width black gradient beginning at y 69%, reaching 88% opacity at y 84%, and remaining at 88% opacity through the bottom edge.

STATEMENT:
x 7%–65%, y 78%–87%, left-aligned.

{{STATEMENT}}

PRICE:
x 72%–93%, y 78%–88%, right-aligned.

{{PRICE}}

CHIPS:
x 12%–48%, y 89%–95%, maximum 3 horizontally aligned text items, kept on the left half of the row.

{{CHIPS}}

FINE PRINT:
x 8%–92%, y 96%–98%, centered.

{{FINE}}

## 7. TYPOGRAPHY

Use one consistent sans-serif type family throughout.

Headline: 100 units, bold.
Subline: 38 units, medium.
Callouts, statement and price: 34 units.
Brand line, chips and fine print: 22 units.

Maintain consistent line spacing, text alignment and visual weight.

## 8. STRICT TEXT RULES

The only advertising text allowed is the exact text supplied in the placeholders below.

Print every supplied string character-for-character. Do not translate, rewrite, paraphrase, correct, expand, shorten or add words.

All advertising copy must use the target-market language supplied in the placeholders.

No Chinese characters anywhere in the image, including packaging, boxes, tags, labels, washing instructions, screens, price stickers, signs or watermarks.

No English advertising copy. Original product brand marks and standard currency symbols are permitted exceptions.

Never generate pseudo-letters, mirrored characters, incomplete characters, broken glyphs or invented symbols.

If a text element cannot be rendered accurately, omit that element instead of fabricating text.

## 9. COMMERCIAL ELEMENTS
TARGET PLATFORM: {{PLATFORM}} — the shopping platform this advertisement sells on.
Write the platform name as plain text only. Do not draw any platform logo, icon, glyph, app-store badge or brand mark. If the uploaded reference photos contain a platform logo, do not reproduce it in the new composition.

PLATFORM BADGE: x 50%–66%, y 89%–95%, left-aligned, 22 units, plain text, no box behind it.

{{PLATFORM}}

CTA BUTTON: draw one flat rounded rectangle in solid black at x 68%–93%, y 89%–95%, corner radius about 3% of the canvas width, no outline, no gradient, no drop shadow, no icon inside. Centre the call-to-action string in white at 30 units, bold. The button must stay clear of the product and of every other text zone.

{{CTA}}

PRICE NOTE: set the supplied price note immediately after the price on the same baseline, at 22 units.

{{PRICENOTE}}

Do not add discount percentages, star ratings, review counts, sold counts, countdown timers, shipping promises, authenticity or official-store claims, vouchers or any other commercial claim. Only the supplied strings may appear on the canvas.

## 10. FINAL QUALITY CONTROL

Square 1:1 output. Six callouts only. One central product. One top headline section. One dark bottom information band.

Preserve the original product identity and all supplied text. Maintain the 6% safe margins. Do not add any unrequested promotional elements.`;

const DARK_SPLIT_PROMPT = `Create a square 1:1 e-commerce advertising poster using the uploaded product reference images, product information and creative brief.

## 1. VISUAL COMPOSITION

Create a dark editorial split layout.

The composition has two clearly separated visual columns:

LEFT: A structured advertising information panel with headline, product features, statement and price.

RIGHT: A large, realistic product showcase with controlled lighting and a dark studio or contextual background.

Maintain a 6% safe margin on all four canvas edges.

The visual hierarchy must prioritize the product and headline, followed by price and supporting feature information.

## 2. BACKGROUND AND SCRIM

Use a predominantly charcoal-black background with subtle natural lighting and restrained environmental texture.

LEFT INFORMATION PANEL:
x 4%–46%, y 5%–88%.

Apply a consistent 82% black translucent background to this panel.

Blend the boundary between the two columns with a subtle horizontal gradient, without creating a hard rectangular dividing line.

Keep the entire left panel visually quiet and suitable for text.

## 3. PRODUCT SHOWCASE

PRODUCT ZONE:
x 47%–96%, y 3%–88%, centered around x 72%, y 44%.

The product should occupy approximately 45%–55% of the canvas area when its geometry permits.

Use the uploaded product reference images as the definitive source.

Preserve exact product color, shape, proportions, material, texture, stitching, zipper placement, pockets, construction and original brand identifiers.

Do not redesign the product or invent specifications.

If a human model is present, place the model on the right side. Preserve realistic anatomy, natural posture and product visibility.

Do not allow the model or product to overlap the left information panel.

## 4. LEFT INFORMATION PANEL

BRAND LINE:
x 7%–42%, y 7%–12%, left-aligned.

{{BRAND}}

HEADLINE:
x 7%–43%, y 13%–32%, left-aligned, maximum 3 lines.

{{HEADLINE}}

SUBLINE:
x 7%–43%, y 34%–42%, left-aligned, maximum 2 lines.

{{SUB}}

CALLOUTS:
x 7%–43%, y 44%–63%.

Arrange up to four feature callouts in a 2-column by 2-row grid.

{{CALLOUTS}}

Each callout consists of one monochrome line icon and its corresponding text label.

Use consistent icon dimensions, stroke thickness, text baseline and column spacing.

STATEMENT:
x 7%–43%, y 65%–73%, left-aligned.

{{STATEMENT}}

PRICE:
x 7%–43%, y 75%–87%, left-aligned.

{{PRICE}}

Make the numeric price the most prominent element within the price block. Keep currency symbols and numbers together.

## 5. BOTTOM INFORMATION BAND

Create a full-width bottom information band from y 89% to y 100%.

Use a black gradient transitioning from transparent at y 83% to 90% black opacity at y 94%, maintaining the dark background through the bottom edge.

CHIPS:
x 7%–40%, y 91%–95%, maximum 3 horizontally arranged items, kept on the left of the row.

{{CHIPS}}

FINE PRINT:
x 7%–93%, y 96%–98%, left-aligned.

{{FINE}}

## 6. TYPOGRAPHY

Use the same sans-serif font family and four-level hierarchy as the unified advertising system.

Headline: 100 units, bold.
Subline: 38 units, medium.
Callouts, statement and price: 34 units.
Brand line, chips and fine print: 22 units.

Use consistent font weights, spacing and alignment.

The headline must have clear visual dominance. The price must be highly legible without competing with the headline.

## 7. STRICT TEXT RULES

Only render the exact advertising text supplied in the injected placeholders.

Print each supplied string character-for-character. Do not translate, rewrite, paraphrase, correct, shorten, expand or add text.

All advertising copy must use the target-market language provided in the placeholders.

Absolutely no Chinese characters anywhere, including packaging, boxes, labels, tags, washing labels, price stickers, screens, signs and watermarks.

No English advertising copy. Original product brand marks and standard currency symbols are permitted exceptions.

No pseudo-letters, mirrored characters, incomplete glyphs, broken text or invented symbols.

If a text element cannot be reproduced accurately, omit it instead of generating inaccurate text.

## 8. COMMERCIAL ELEMENTS
TARGET PLATFORM: {{PLATFORM}} — the shopping platform this advertisement sells on.
Write the platform name as plain text only. Do not draw any platform logo, icon, glyph, app-store badge or brand mark. If the uploaded reference photos contain a platform logo, do not reproduce it in the new composition.

PLATFORM BADGE: x 42%–64%, y 90%–95%, left-aligned, 22 units, plain text, no box behind it.

{{PLATFORM}}

CTA BUTTON: draw one flat rounded rectangle in solid black at x 66%–93%, y 90%–95%, corner radius about 3% of the canvas width, no outline, no gradient, no drop shadow, no icon inside. Centre the call-to-action string in white at 30 units, bold. The button must stay clear of the product and of every other text zone.

{{CTA}}

PRICE NOTE: set the supplied price note immediately after the price on the same baseline, at 22 units.

{{PRICENOTE}}

Do not add discount percentages, star ratings, review counts, sold counts, countdown timers, shipping promises, authenticity or official-store claims, vouchers or any other commercial claim. Only the supplied strings may appear on the canvas.

## 9. FINAL QUALITY CONTROL

Square 1:1 output.

Left information panel must remain dark and readable.

Right product showcase must remain dominant and unobstructed.

Maintain the unified typography system, black scrim language and 6% safe margins.

Do not introduce additional slogans, promotional badges or unrequested decorative elements.`;

const EDITORIAL_BAND_PROMPT = `Create a square 1:1 e-commerce advertising poster using the uploaded product reference images, product information and creative brief.

## 1. VISUAL COMPOSITION

Create a full-bleed editorial lifestyle advertising composition.

The product occupies the main central photographic area. The headline and brand information are positioned at the top, followed by a horizontal row of three feature callouts and a structured dark bottom commercial information band.

Maintain a 6% safe margin on all four canvas edges.

The layout must feel visually continuous, with no unnecessary cards, separate image panels or decorative frames.

## 2. PRODUCT FIDELITY

Use the uploaded product reference images as the definitive source.

Preserve exact color, silhouette, proportions, material, texture, construction, stitching, zippers, pockets, buttons, components and original brand identifiers.

Do not redesign, substitute, simplify or invent product features.

PRODUCT ZONE:
x 18%–82%, y 20%–72%, centered around x 50%, y 45%.

The product must remain the dominant photographic subject.

If a human model is included, maintain realistic anatomy, natural posture and accurate product representation.

## 3. BACKGROUND

Create a realistic lifestyle environment based on the supplied creative brief and target-market context.

Use natural depth, realistic lighting and a coherent environmental color palette.

Keep the top text region and bottom information region visually quiet.

## 4. TOP EDITORIAL ZONE

Apply a full-width top black gradient:

78% black opacity at y 0%, 25% black at y 20%, transitioning to transparent at y 33%.

BRAND LINE:
x 8%–92%, y 5%–10%, centered.

{{BRAND}}

HEADLINE:
x 8%–92%, y 12%–24%, centered, maximum 2 lines.

{{HEADLINE}}

SUBLINE:
x 12%–88%, y 25%–32%, centered, maximum 2 lines.

{{SUB}}

## 5. HORIZONTAL FEATURE ROW

FEATURE ROW:
x 8%–92%, y 70%–80%.

Arrange up to three callouts horizontally in equal-width columns.

{{CALLOUTS}}

Each callout contains one monochrome line icon and one short corresponding text label.

Use consistent icon dimensions, line thickness, spacing and alignment.

Apply a subtle full-width black gradient beginning at y 65% and reaching approximately 55% black opacity at y 74%.

Do not allow the feature row to obscure important product details.

## 6. BOTTOM COMMERCIAL INFORMATION

Apply a full-width bottom black gradient transitioning from 55% black at y 75% to 90% black at y 90%, maintaining 90% black opacity through y 100%.

STATEMENT:
x 7%–57%, y 84%–91%, left-aligned.

{{STATEMENT}}

PRICE:
x 66%–93%, y 83%–92%, right-aligned.

{{PRICE}}

CHIPS:
x 7%–40%, y 92%–96%, maximum 3 horizontally arranged text items, kept on the left of the row.

{{CHIPS}}

FINE PRINT:
x 7%–93%, y 97%–99%, centered.

{{FINE}}

## 7. TYPOGRAPHY

Use the same sans-serif font family and four-level typography system.

Headline: 100 units, bold.
Subline: 38 units, medium.
Callouts, statement and price: 34 units.
Brand line, chips and fine print: 22 units.

Keep all text consistent in font family, weight, alignment and spacing.

## 8. STRICT TEXT RULES

Only use the exact advertising text supplied through the injected placeholders.

Reproduce every supplied string character-for-character. Do not translate, paraphrase, rewrite, correct, shorten, expand or invent additional text.

All advertising copy must use the target-market language supplied in the placeholders.

Do not generate any Chinese characters anywhere in the image, including packaging, labels, boxes, tags, washing instructions, screens, signs, price stickers and watermarks.

Do not generate English advertising copy. Original product brand marks and standard currency symbols are permitted exceptions.

Never generate pseudo-letters, mirrored characters, broken text, incomplete glyphs or symbols substituted for letters.

If any text cannot be reproduced accurately, omit that element rather than inventing characters.

## 9. COMMERCIAL ELEMENTS
TARGET PLATFORM: {{PLATFORM}} — the shopping platform this advertisement sells on.
Write the platform name as plain text only. Do not draw any platform logo, icon, glyph, app-store badge or brand mark. If the uploaded reference photos contain a platform logo, do not reproduce it in the new composition.

PLATFORM BADGE: x 42%–63%, y 91%–96%, left-aligned, 22 units, plain text, no box behind it.

{{PLATFORM}}

CTA BUTTON: draw one flat rounded rectangle in solid black at x 65%–93%, y 91%–96%, corner radius about 3% of the canvas width, no outline, no gradient, no drop shadow, no icon inside. Centre the call-to-action string in white at 30 units, bold. The button must stay clear of the product and of every other text zone.

{{CTA}}

PRICE NOTE: set the supplied price note immediately after the price on the same baseline, at 22 units.

{{PRICENOTE}}

Do not add discount percentages, star ratings, review counts, sold counts, countdown timers, shipping promises, authenticity or official-store claims, vouchers or any other commercial claim. Only the supplied strings may appear on the canvas.

## 10. FINAL QUALITY CONTROL

One square 1:1 advertising poster.

One dominant central product.

One top editorial information section.

One horizontal feature row with no more than three callouts.

One structured bottom information band.

Preserve the exact product appearance, typography hierarchy, black gradient language and 6% safe margins.

Do not introduce additional promotional copy, decorative cards, floating labels or unrelated visual elements.`;

const TEMPLATES = {
  'scene-orbit': {
    label: '场景环绕型',
    name: 'SCENE ORBIT',
    // 结构化坐标：供程序排版使用，数值必须与上面的提示词正文一致（有测试守着）
    zones: {
          "brand": {
                "x": [
                      0.35,
                      0.65
                ],
                "y": [
                      0.04,
                      0.12
                ],
                "align": "center",
                "level": "small"
          },
          "headline": {
                "x": [
                      0.12,
                      0.88
                ],
                "y": [
                      0.13,
                      0.25
                ],
                "align": "center",
                "level": "headline",
                "maxLines": 2
          },
          "subline": {
                "x": [
                      0.15,
                      0.85
                ],
                "y": [
                      0.26,
                      0.32
                ],
                "align": "center",
                "level": "sub"
          },
          "callouts": {
                "mode": "columns",
                "left": [
                      0.06,
                      0.27
                ],
                "right": [
                      0.73,
                      0.94
                ],
                "y": [
                      0.32,
                      0.65
                ],
                "count": 6
          },
          "statement": {
                "x": [
                      0.07,
                      0.65
                ],
                "y": [
                      0.78,
                      0.87
                ],
                "align": "left",
                "level": "body"
          },
          "price": {
                "x": [
                      0.72,
                      0.93
                ],
                "y": [
                      0.78,
                      0.88
                ],
                "align": "right",
                "level": "body"
          },
          "chips": {
                "x": [
                      0.12,
                      0.88
                ],
                "y": [
                      0.89,
                      0.95
                ],
                "align": "center",
                "level": "small",
                "count": 3
          },
          "fine": {
                "x": [
                      0.08,
                      0.92
                ],
                "y": [
                      0.96,
                      0.98
                ],
                "align": "center",
                "level": "small"
          }
    },
    fits: '户外服装、运动鞋服、旅行装备、露营用品、运动器材，以及需要展示多个功能卖点和使用场景的商品',
    slots: { headline: 1, subline: 1, callouts: 6, brandLine: 1, statement: 1, chips: 3, finePrint: 1, price: 1, platform: 1, cta: 1, priceNote: 1 },
    prompt: SCENE_ORBIT_PROMPT
  },
  'dark-split': {
    label: '深色分栏型',
    name: 'DARK SPLIT',
    // 结构化坐标：供程序排版使用，数值必须与上面的提示词正文一致（有测试守着）
    zones: {
          "brand": {
                "x": [
                      0.07,
                      0.42
                ],
                "y": [
                      0.07,
                      0.12
                ],
                "align": "left",
                "level": "small"
          },
          "headline": {
                "x": [
                      0.07,
                      0.43
                ],
                "y": [
                      0.13,
                      0.32
                ],
                "align": "left",
                "level": "headline",
                "maxLines": 3
          },
          "subline": {
                "x": [
                      0.07,
                      0.43
                ],
                "y": [
                      0.34,
                      0.42
                ],
                "align": "left",
                "level": "sub"
          },
          "callouts": {
                "mode": "grid2x2",
                "x": [
                      0.07,
                      0.43
                ],
                "y": [
                      0.44,
                      0.63
                ],
                "count": 4
          },
          "statement": {
                "x": [
                      0.07,
                      0.43
                ],
                "y": [
                      0.65,
                      0.73
                ],
                "align": "left",
                "level": "body"
          },
          "price": {
                "x": [
                      0.07,
                      0.43
                ],
                "y": [
                      0.75,
                      0.87
                ],
                "align": "left",
                "level": "price"
          },
          "chips": {
                "x": [
                      0.07,
                      0.93
                ],
                "y": [
                      0.91,
                      0.95
                ],
                "align": "left",
                "level": "small",
                "count": 3
          },
          "fine": {
                "x": [
                      0.07,
                      0.93
                ],
                "y": [
                      0.96,
                      0.98
                ],
                "align": "left",
                "level": "small"
          }
    },
    fits: '数码设备、摄影器材、户外服装、高单价家电、专业工具、品牌服饰，以及需要突出价格、参数和商品质感的商品',
    slots: { headline: 1, subline: 1, callouts: 4, brandLine: 1, statement: 1, chips: 3, finePrint: 1, price: 1, platform: 1, cta: 1, priceNote: 1 },
    prompt: DARK_SPLIT_PROMPT
  },
  'editorial-band': {
    label: '场景编辑型',
    name: 'EDITORIAL BAND',
    // 结构化坐标：供程序排版使用，数值必须与上面的提示词正文一致（有测试守着）
    zones: {
          "brand": {
                "x": [
                      0.08,
                      0.92
                ],
                "y": [
                      0.05,
                      0.1
                ],
                "align": "center",
                "level": "small"
          },
          "headline": {
                "x": [
                      0.08,
                      0.92
                ],
                "y": [
                      0.12,
                      0.24
                ],
                "align": "center",
                "level": "headline",
                "maxLines": 2
          },
          "subline": {
                "x": [
                      0.12,
                      0.88
                ],
                "y": [
                      0.25,
                      0.32
                ],
                "align": "center",
                "level": "sub"
          },
          "callouts": {
                "mode": "row",
                "x": [
                      0.08,
                      0.92
                ],
                "y": [
                      0.7,
                      0.8
                ],
                "count": 3
          },
          "statement": {
                "x": [
                      0.07,
                      0.57
                ],
                "y": [
                      0.84,
                      0.91
                ],
                "align": "left",
                "level": "body"
          },
          "price": {
                "x": [
                      0.66,
                      0.93
                ],
                "y": [
                      0.83,
                      0.92
                ],
                "align": "right",
                "level": "body"
          },
          "chips": {
                "x": [
                      0.07,
                      0.93
                ],
                "y": [
                      0.92,
                      0.96
                ],
                "align": "left",
                "level": "small",
                "count": 3
          },
          "fine": {
                "x": [
                      0.07,
                      0.93
                ],
                "y": [
                      0.97,
                      0.99
                ],
                "align": "center",
                "level": "small"
          }
    },
    fits: '服装、鞋包、美妆、香水、生活方式用品、旅行用品，以及需要将场景氛围与商品卖点结合展示的商品',
    slots: { headline: 1, subline: 1, callouts: 3, brandLine: 1, statement: 1, chips: 3, finePrint: 1, price: 1, platform: 1, cta: 1, priceNote: 1 },
    prompt: EDITORIAL_BAND_PROMPT
  }
};

// 商业元素区（平台名徽章 + CTA 按钮）：坐标必须与提示词正文完全一致，有测试守着
const COMMERCIAL_ZONES = {
  'scene-orbit': {
    badge: { x: [0.50, 0.66], y: [0.89, 0.95], align: 'left', level: 'small' },
    cta: { x: [0.68, 0.93], y: [0.89, 0.95], align: 'center', level: 'button' }
  },
  'dark-split': {
    badge: { x: [0.42, 0.64], y: [0.90, 0.95], align: 'left', level: 'small' },
    cta: { x: [0.66, 0.93], y: [0.90, 0.95], align: 'center', level: 'button' }
  },
  'editorial-band': {
    badge: { x: [0.42, 0.63], y: [0.91, 0.96], align: 'left', level: 'small' },
    cta: { x: [0.65, 0.93], y: [0.91, 0.96], align: 'center', level: 'button' }
  }
};
for (const [key, extra] of Object.entries(COMMERCIAL_ZONES)) {
  if (TEMPLATES[key]?.zones) Object.assign(TEMPLATES[key].zones, extra);
}

export function normalizeTemplateKey(value) {
  const raw = String(value || '').trim().toLowerCase();
  return ALIASES[raw] || ALIASES[raw.replace(/\s+/g, '-')] || '';
}

// 自动选版：按用户给的三条判断条件走，不让模型随机挑
//   5–6 个核心卖点、强调场景 → SCENE ORBIT
//   参数 / 材质 / 价格更重要   → DARK SPLIT
//   生活方式与场景叙事         → EDITORIAL BAND
export function defaultTemplateFor(input = {}) {
  const product = input.product || {};
  const scheme = input.scheme || {};
  const callouts = Array.isArray(scheme.sellingPointCopy) ? scheme.sellingPointCopy.filter(Boolean).length : 0;
  const haystack = [product.name, product.category, product.description, product.features, product.specs]
    .filter(Boolean).join(' ').toLowerCase();

  if (callouts >= 5) return 'scene-orbit';
  if (/参数|规格|材质|价格|数码|电子|摄影|家电|工具|装备|spec|material|price|digital|electronic|camera|appliance|tool/.test(haystack)) return 'dark-split';
  return 'editorial-band';
}

export function resolveTemplate(input = {}) {
  const scheme = input.scheme || {};
  const key = normalizeTemplateKey(scheme.imageLayout || input.imageLayout) || defaultTemplateFor(input);
  return { key, template: TEMPLATES[key] };
}

export function templateSpec(key) {
  return TEMPLATES[key] || TEMPLATES['editorial-band'];
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
    price: slots.price ? String(copy.price || '').trim() : '',
    platform: slots.platform ? String(copy.platform || '').trim() : '',
    cta: slots.cta ? String(copy.cta || '').trim() : '',
    priceNote: slots.priceNote ? String(copy.priceNote || '').trim() : ''
  };
  const dropped = [];
  for (const key of ['headline', 'subline', 'brandLine', 'statement', 'finePrint', 'price', 'platform', 'cta', 'priceNote']) {
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

// 标签块与占位符块在模板里是分开的两段：删占位符时必须把它的标签（可能连续多段）一起删掉
const LABEL_PATTERN = {
  '{{BRAND}}': /BRAND LINE/i,
  '{{HEADLINE}}': /HEADLINE/i,
  '{{SUB}}': /SUBLINE/i,
  '{{CALLOUTS}}': /CALLOUTS/i,
  '{{STATEMENT}}': /STATEMENT/i,
  '{{PRICE}}': /PRICE/i,
  '{{CHIPS}}': /CHIPS/i,
  '{{FINE}}': /FINE PRINT/i,
  // 阶段 1 新增：这三个占位符的标签也是独立一段，空值时同样要一起删
  '{{PLATFORM}}': /PLATFORM BADGE/i,
  '{{CTA}}': /CTA BUTTON/i,
  '{{PRICENOTE}}': /PRICE NOTE/i
};

export function renderTemplate(template, fitted) {
  const blocks = String(template || '').split(/\n{2,}/);
  const kept = [];
  for (const block of blocks) {
    const used = Object.keys(PLACEHOLDERS).filter(ph => block.includes(ph));
    if (!used.length) { kept.push(block); continue; }
    const missing = used.filter(ph => !hasValue(fitted[PLACEHOLDERS[ph]]));
    if (missing.length) {
      // 连续往前删：直到上一段不再是这些占位符的标签
      for (;;) {
        const prev = kept[kept.length - 1];
        if (!prev) break;
        const isLabel = missing.some(ph => LABEL_PATTERN[ph] && LABEL_PATTERN[ph].test(prev))
          && !Object.keys(PLACEHOLDERS).some(ph => prev.includes(ph));
        if (!isLabel) break;
        kept.pop();
      }
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
