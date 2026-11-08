// 生图版式配方（v2，从零重写）
//
// 设计原则：
//   1. 一份配方就是一份完整规格，自包含：网格、字号、元素位、禁止项全在这里，
//      不再有「通用规则 + 版式蓝图 + 设计系统」三层叠加。
//   2. 配方显式声明「能放几个什么」，组装时按容量裁剪文案。
//      —— 从构造上消灭「§1 要求全部出现」与「版式没位置」的矛盾。
//   3. 坐标全部用画布百分比，字号用相对基准值，便于模型换算。
//   4. 只描述「怎么排」，不描述「写什么」：文案永远来自白名单。
//
// 三套配方的来源：用户认可的两张定稿图（深色分栏 / 满版实景+底部带），
// 外加一套干净商品展示，覆盖不适合堆信息的商品（护肤、数码）。

export const RECIPE_KEYS = ['split-dark', 'scene-band', 'clean-catalog'];

// 旧代号（素材生成阶段历史上可能给过）→ 新配方
const ALIASES = {
  'split-dark': 'split-dark',
  'studio-split': 'split-dark',
  'scene-band': 'scene-band',
  'lifestyle-callout': 'scene-band',
  'multi-scene': 'scene-band',
  'clean-catalog': 'clean-catalog',
  'center-showcase': 'clean-catalog',
  'editorial-magazine': 'clean-catalog',
  'info-cards': 'clean-catalog'
};

const RECIPES = {
  // ========== A 深色分栏：左信息栏 + 右商品 ==========
  'split-dark': {
    label: '深色分栏',
    name: 'Split dark',
    intro: 'A dark studio portrait with a full-height information column on the left and the product on the right. The left column is the only place text may sit.',
    canvas: [
      'LEFT COLUMN x 6% to 44%, full height. Right side x 44% to 96% is the product.',
      'Under the left column lay a horizontal gradient: fully transparent at x 52%, 82% black at x 6%. Text never touches unprotected photo.',
      'Right side: dark, low-saturation interior (concrete, corridor, doorway). One key light from the front-left with a soft rim on the shoulder; background falls to near black.',
      'Product height 55% to 65% of the canvas, vertically centred, with a contact shadow and a crisp rim edge.'
    ],
    stack: [
      'Everything in the left column is left-aligned on a single edge at x 7%, top to bottom in this exact order:',
      '1. headline — 2 lines max, size 100, leading 1.05, starting at y 9%;',
      '2. subline — size 34, single line, y just below the headline;',
      '3. feature list — 2 columns (2 items each when 4, 3 each when 6); each item is a 28px monoline icon plus a size-34 label, rows spaced evenly, block starting at y 34%;',
      '4. price — number size 130 with the currency symbol at size 40 sitting on the same baseline, block at y 62%;',
      '5. brand line — size 28, y 88%, same left edge.'
    ],
    capacity: { headline: 1, subline: 1, callouts: 6, price: 1, brandLine: 1, statement: 0, chips: 0, finePrint: 0 },
    forbid: 'text over the product, a centred alignment inside the column, more than four font sizes, a light or white background, decorative shapes that carry no information.'
  },

  // ========== B 满版实景 + 底部信息带 ==========
  'scene-band': {
    label: '满版实景 + 底部信息带',
    name: 'Scene with bottom band',
    intro: 'A full-bleed lifestyle photograph with symmetric callouts flanking the product and a mandatory information band across the bottom. The band is what makes it read as a designed advertisement.',
    canvas: [
      'FULL BLEED scene. Product and wearer occupy y 26% to 66%, horizontally centred or slightly right; eyes land in the upper third.',
      'TOP ZONE, centred: brand mark (only if the product itself carries one) at y 5%; headline at y 12%, 2 lines max, size 100; subline at y 24%, size 34.',
      'CALLOUT COLUMNS: left column x 4% to 28%, right column x 72% to 96%, three rows each at y 30%, 44%, 58%. Icon size 26 on the inner side, label size 34 on the outer side. Optional 1px leader line from icon toward the product, at most two lines per side.',
      'BOTTOM BAND — mandatory, from y 74% to 100%: a vertical gradient from fully transparent at y 74% to 88% black at y 100%.',
      'Inside the band, exactly five layers:',
      '  1. statement, left aligned at x 5%, 2 lines max, size 44, y 78% to 85%;',
      '  2. price, right aligned at x 95%, number size 96 with the currency symbol at size 36 on the same baseline, vertically level with the statement;',
      '  3. hairline divider, 1px white at 45% opacity, y 87%, from x 5% to x 95%;',
      '  4. chips row, three items starting at x 5%, y 89%: 22px icon plus size-28 label each;',
      '  5. fine print, size 22, centred, y 96%.'
    ],
    stack: [],
    capacity: { headline: 1, subline: 1, callouts: 6, price: 1, brandLine: 1, statement: 1, chips: 3, finePrint: 1 },
    forbid: 'a missing bottom band, a callout over the product or the face, more than six callouts, a bright background behind the band text, text touching the canvas edge.'
  },

  // ========== C 干净商品展示 ==========
  'clean-catalog': {
    label: '干净商品展示',
    name: 'Clean catalog',
    intro: 'A studio product shot on a seamless soft backdrop with one small copy block. Built for cosmetics, electronics and anything that sells on material, not on slogans.',
    canvas: [
      'BACKGROUND: seamless soft gradient, slightly darker at the edges than behind the product; one key light from the upper left, a soft rim on the opposite edge, a grounded contact shadow.',
      'PRODUCT: centred, height 45% to 60% of the canvas, the sharpest and best-lit object; visible material texture.',
      'COPY BLOCK, top left, left aligned at x 7%: headline at y 8%, 2 lines max, size 96; subline directly under it at size 32.',
      'FEATURE LIST: a single left column at x 7%, starting y 62%, up to three items; each 24px icon plus a size-32 label, single line each.',
      'PRICE: bottom right, right aligned at x 93%, y 84%; number size 88 with the currency symbol at size 32 on the same baseline.',
      'Brand line: size 26, bottom left at x 7%, y 88%.'
    ],
    stack: [],
    capacity: { headline: 1, subline: 1, callouts: 3, price: 1, brandLine: 1, statement: 0, chips: 0, finePrint: 0 },
    forbid: 'a busy photographic background, more than three callouts, a bottom band, a second competing focal point, text over the product.'
  }
};

// 不随配方变化、所有图都必须遵守的部分（写一次，不再重复）
export const CANVAS_LAWS = [
  'Safe margin 6% on every edge; nothing meaningful is cropped.',
  'The product is the only saturated element; the background stays desaturated so the product reads first.',
  'Four font sizes at most, one family, hierarchy through weight rather than extra sizes.',
  'White or near-white copy; no outline, no glow, no drop shadow, no gradient text.',
  'One light direction for the whole image, contact shadows under the product, consistent occlusion.',
  'The brand mark printed on the product is preserved exactly; never redraw, respell or invent one.',
  'Text sits on its own scrim or on calm low-detail areas — never directly on busy texture.'
];

export function normalizeRecipeKey(value) {
  const key = String(value || '').trim().toLowerCase();
  return ALIASES[key] || '';
}

// 按商品类别给一个稳妥的默认配方
export function defaultRecipeFor(product = {}) {
  const haystack = [product.name, product.category, product.description, product.features].filter(Boolean).join(' ').toLowerCase();
  if (/护肤|化妆|精华|面霜|香水|skincare|serum|cream|cosmetic|perfume/.test(haystack)) return 'clean-catalog';
  if (/数码|电子|耳机|充电|键盘|相机|digital|electronic|earbud|charger|camera/.test(haystack)) return 'clean-catalog';
  if (/食品|零食|饮料|茶|咖啡|food|snack|drink|tea|coffee/.test(haystack)) return 'clean-catalog';
  return 'scene-band';
}

export function resolveRecipe(input = {}) {
  const scheme = input.scheme || {};
  const explicit = normalizeRecipeKey(scheme.imageLayout || input.imageLayout);
  const key = explicit || defaultRecipeFor(input.product || {});
  return { key, recipe: RECIPES[key] };
}

// 把白名单文案塞进配方的能力范围：放不下的直接裁掉，并如实回报裁了什么。
// 这样「提示词要求」和「版式能放」永远一致，不会再出现「必须全出现但没位置」。
export function fitCopy(recipe, copy = {}) {
  const cap = recipe.capacity;
  const fitted = {
    headline: cap.headline ? String(copy.headline || '').trim() : '',
    subline: cap.subline ? String(copy.subline || '').trim() : '',
    callouts: cap.callouts ? (copy.callouts || []).filter(Boolean).slice(0, cap.callouts) : [],
    brandLine: cap.brandLine ? String(copy.brandLine || '').trim() : '',
    statement: cap.statement ? String(copy.statement || '').trim() : '',
    chips: cap.chips ? (copy.chips || []).filter(Boolean).slice(0, cap.chips) : [],
    finePrint: cap.finePrint ? String(copy.finePrint || '').trim() : '',
    price: cap.price ? String(copy.price || '').trim() : ''
  };
  const dropped = [];
  if (copy.headline && !fitted.headline) dropped.push('headline');
  if (copy.subline && !fitted.subline) dropped.push('subline');
  if ((copy.callouts || []).length > fitted.callouts.length) dropped.push(`callouts×${(copy.callouts || []).length - fitted.callouts.length}`);
  if (copy.brandLine && !fitted.brandLine) dropped.push('brandLine');
  if (copy.statement && !fitted.statement) dropped.push('statement');
  if ((copy.chips || []).length > fitted.chips.length) dropped.push(`chips×${(copy.chips || []).length - fitted.chips.length}`);
  if (copy.finePrint && !fitted.finePrint) dropped.push('finePrint');
  if (copy.price && !fitted.price) dropped.push('price');
  return { fitted, dropped };
}

export function recipeSpec(key) {
  return RECIPES[key] || RECIPES['scene-band'];
}

export function recipeList() {
  return RECIPE_KEYS.map(key => ({ key, label: RECIPES[key].label }));
}
