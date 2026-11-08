// 六套版式蓝图。A、B 是用户定稿的两张图拆出来的；C–F 补齐商业广告常见的另外四种组织方式。
// 这里只写「网格怎么摆」，不写「写什么字」——文字永远来自白名单。
// 全部英文：这些文字会进生图提示词。

export const LAYOUT_KEYS = {
  studio: 'studio-split',
  lifestyle: 'lifestyle-callout',
  center: 'center-showcase',
  editorial: 'editorial-magazine',
  multiScene: 'multi-scene',
  infoCards: 'info-cards'
};

const STUDIO_SPLIT = `Blueprint A — studio split (vertical information column beside a dark studio product shot).
- SPLIT THE CANVAS: left 42 to 46 percent is an information column, right 54 to 58 percent is the product. The split is clean and vertical; nothing crosses it.
- BACKGROUND: a dark, low-key, desaturated architectural interior — a concrete wall, a corridor, a doorway. Light falls on the product from the front-left with a soft rim on the shoulder and sleeve; the background drops to near black.
- SCRIM UNDER THE TEXT: a horizontal gradient from about 85 percent black at the left edge to fully transparent at the split line. Copy never touches texture.
- INFORMATION COLUMN, top to bottom, one hard left edge, about 7 percent margin from the canvas edge:
  1. headline, at most two lines, very large bold white sans, tight leading;
  2. one thin subline at roughly one third of the headline size, items separated by a middle dot;
  3. feature list in a grid that adapts to the number of callouts — two by two for four callouts, two columns of three for five or six; each item is a small circular monoline icon (24 to 32 px) plus one short label;
  4. one tiny authenticity or brand line;
  5. price block: the number at three to four times body size with the currency unit much smaller and sitting on the same baseline; at most two short spec lines under it separated by a vertical bar.
- BOTTOM ZONE, MANDATORY: a full-width band holding the brand line, one short statement and a row of three scene chips. It must be present even when the photo is already dark; give it its own scrim so the copy reads.
- NEVER: text over the product, more than four type levels inside the column, a white or bright background, or a centred alignment mixed into this left-aligned column.`;

const LIFESTYLE_CALLOUT = `Blueprint B — lifestyle full bleed with feature callouts.
- FULL BLEED PHOTOGRAPH: a believable outdoor or street scene with cool desaturated depth (mist, canopy, distant buildings). The product and its wearer sit in the middle band, slightly right of centre, filling about 35 to 50 percent of the frame; the eyes land in the upper third.
- TOP ZONE, centred and stacked: the brand mark if the product carries one, then a headline of one or two lines at very large bold white, then one short subline.
- CALLOUTS: five or six in total, split into two symmetric columns on the left and right edge (three and three when six are provided); each is a small monoline outline icon plus one short label, icon toward the product and label toward the edge. The two columns stay inside the outer 30 percent and never cross the centre band where the product sits.
- BOTTOM ZONE under a dark upward gradient (about 85 percent black at the very bottom fading to transparent):
  1. a two-line statement, left aligned;
  2. the price at the right of the same band, the number large and the currency symbol noticeably smaller;
  3. a hairline divider under both;
  4. a row of three small icon plus label chips;
  5. one line of fine print at the very bottom.
  All five layers are mandatory. A bottom band without chips or without fine print is an incomplete layout.
- NEVER: a callout over the product or the face, more than six callouts, a label in the busiest part of the photo, or a bright band behind the bottom text.`;

const CENTER_SHOWCASE = `Blueprint C — centre showcase (the product owns the middle, information rings around it).
- PRODUCT FIRST: the product sits dead centre or on the centre-left third, on a clean seamless backdrop or a heavily blurred environment; it fills 40 to 55 percent of the canvas and is the sharpest, best-lit object.
- LIGHT: one controlled key light from the upper left, a soft rim on the opposite edge, a grounded contact shadow. The backdrop falls into a smooth gradient, darker at the edges than behind the product.
- TYPE RING: headline centred above the product at the largest size; subline directly under it at one third the size; callouts stacked in a narrow column on the left edge and another on the right edge, aligned on a shared baseline grid.
- PRICE: a small card or tag placed on the lower third at one side, never floating in the middle and never over the product.
- BOTTOM: one quiet band with the brand line on the left and the scene chips on the right.
- NEVER: a busy photographic background behind the product, a callout touching the product silhouette, or a second competing focal point.`;

const EDITORIAL_MAGAZINE = `Blueprint D — editorial magazine (asymmetric art-directed page).
- ASYMMETRIC GRID: split the page into an off-centre column pair, roughly 38 and 62 percent, with one column deliberately pushed to the outer edge. Alignment is intentional, not centred.
- HERO IMAGE: one large product photograph occupying the wider column, bleeding off one edge; one small secondary crop (a material or detail close-up) tucked at the opposite corner with a hairline frame.
- TYPE: an oversized headline set flush left, allowed to break across two lines with an uneven rag; a small standing subline above it in wide-tracked caps; body copy is not allowed — labels only.
- DETAILS: hairline rules, a thin vertical rule between columns, generous white space around the headline, one small numbered or bulleted selling-point list aligned to a strict left edge.
- PRICE: set small and precise, like a catalogue credit, paired with the brand line rather than shouted.
- NEVER: equal-width columns, everything centred, or decorative shapes that do not carry information.`;

const MULTI_SCENE = `Blueprint E — multi scene (one hero frame plus supporting windows).
- HERO: one dominant scene photograph covering 65 to 75 percent of the canvas, product inside it and clearly the sharpest element.
- INSETS: two to three smaller windows (about 18 to 22 percent of the canvas each) showing the product in a second and third real use context, or a material detail; each window carries a one-line caption and a thin frame, aligned to the same margin grid.
- TYPE: headline at the top left of the hero frame, large and bold; subline under it; callouts placed only in the calm areas of the hero frame, never inside the insets.
- PRICE: bottom right of the hero frame, on its own small scrim.
- RHYTHM: the insets must sit on the same outer margin as the headline so the page reads as one grid.
- NEVER: four or more insets, insets of unrelated objects, or captions running outside their window.`;

const INFO_CARDS = `Blueprint F — information cards (product plus a structured module stack).
- CANVAS: a clean studio or softly blurred environment; the product on one side (40 to 50 percent of the width), a vertical stack of information cards on the other.
- CARDS: two to three rounded rectangles, each holding one idea — an icon, a short label and at most one supporting line. Cards share one width, one corner radius and one inner padding; they are separated by even gaps.
- TYPE INSIDE CARDS: label at label size, supporting line one level smaller, both left aligned inside the card.
- PRICE: its own emphasised card at the bottom of the stack, the number at three times body size with the currency symbol smaller.
- HEADLINE: above the card stack, spanning the card column width, the largest type on the canvas.
- BOTTOM: one full-width band with the brand line and the scene chips.
- NEVER: more than three cards, cards of different widths, or a card without an icon.`;

const BLUEPRINTS = {
  'studio-split': STUDIO_SPLIT,
  'lifestyle-callout': LIFESTYLE_CALLOUT,
  'center-showcase': CENTER_SHOWCASE,
  'editorial-magazine': EDITORIAL_MAGAZINE,
  'multi-scene': MULTI_SCENE,
  'info-cards': INFO_CARDS
};

const SHARED = `SHARED GRID RULES FOR EVERY BLUEPRINT
- Safe margin about 7 percent on every edge; nothing important is cropped.
- The product is the only saturated element; background and props stay desaturated so the product reads first.
- Four type levels at most and no more: headline, subline, label, fine print; the price sits at headline weight. One family, weight contrast instead of size contrast.
- White or near-white copy; no outline, no glow, no drop shadow, no gradient text.
- One light direction for the whole image; contact shadows under the product; consistent occlusion.
- The brand mark is preserved exactly as printed on the product, never redrawn, never invented.
- Every word still obeys the IN-IMAGE COPY whitelist and the target market language. The blueprint only decides placement, never content.`;

export function layoutBlueprintFor(layout = '', imagePrompt = '') {
  const value = String(layout || '').toLowerCase().trim();
  const scene = String(imagePrompt || '').toLowerCase();
  if (BLUEPRINTS[value]) return { key: value, text: BLUEPRINTS[value] };
  // 老方案的标记可能是自由描述，按关键词认一次
  if (/editorial|magazine|asymmetr/.test(value)) return { key: LAYOUT_KEYS.editorial, text: EDITORIAL_MAGAZINE };
  if (/multi[-\s]?scene|inset|collage/.test(value)) return { key: LAYOUT_KEYS.multiScene, text: MULTI_SCENE };
  if (/info[-\s]?card|card[-\s]?stack/.test(value)) return { key: LAYOUT_KEYS.infoCards, text: INFO_CARDS };
  if (/center|centre|showcase/.test(value)) return { key: LAYOUT_KEYS.center, text: CENTER_SHOWCASE };
  if (/callout|lifestyle|full[-\s]?bleed|forest|outdoor/.test(value)) return { key: LAYOUT_KEYS.lifestyle, text: LIFESTYLE_CALLOUT };
  if (/studio|split|column|dark|product[-\s]?shot/.test(value)) return { key: LAYOUT_KEYS.studio, text: STUDIO_SPLIT };
  // 连标记都没有时，从画面描述里猜
  if (/inset|collage/.test(scene)) return { key: LAYOUT_KEYS.multiScene, text: MULTI_SCENE };
  if (/card/.test(scene)) return { key: LAYOUT_KEYS.infoCards, text: INFO_CARDS };
  if (/callout|icon|label|full[-\s]?bleed/.test(scene)) return { key: LAYOUT_KEYS.lifestyle, text: LIFESTYLE_CALLOUT };
  if (/split|left side|information column|studio|dark background|concrete/.test(scene)) return { key: LAYOUT_KEYS.studio, text: STUDIO_SPLIT };
  return { key: 'unset', text: '' };
}

export function buildLayoutBlueprintSection(layout = '', imagePrompt = '') {
  const resolved = layoutBlueprintFor(layout, imagePrompt);
  const header = 'LAYOUT BLUEPRINT — the canvas must follow one of the approved layouts below. Do not invent a new layout.';
  const body = resolved.text
    ? resolved.text
    : `${STUDIO_SPLIT}\n\n${LIFESTYLE_CALLOUT}\n\nChoose the one that matches the SCENE description above. If the scene is a studio or a dark interior, use Blueprint A. If the scene is a real outdoor or street environment, use Blueprint B.`;
  return `${header}\n${body}\n${SHARED}`;
}
