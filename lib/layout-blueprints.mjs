// 从用户认可的两张图里提炼出的「版式蓝图」。
// 关键认识：这两张图好看不是因为拍得好，而是因为信息架构清楚——
// 一张左右分栏（暗色信息栏 + 商品），一张满版实景（图标环绕 + 底部信息带）。
// 所以这里把「网格、字号层级、留白、压暗方式、图标位置」写成可执行的硬约束，
// 只交给生图模型的英文提示词使用，界面上给用户看的仍然是中文。

export const LAYOUT_KEYS = { studio: 'studio-split', lifestyle: 'lifestyle-callout' };

const STUDIO_SPLIT = `Blueprint A — studio split (vertical information column beside a dark studio product shot).
- SPLIT THE CANVAS: left 42 to 46 percent is an information column, right 54 to 58 percent is the product. The split is clean and vertical; nothing crosses it.
- BACKGROUND: a dark, low-key, desaturated architectural interior — a concrete wall, a corridor, a doorway. Light falls on the product from the front-left with a soft rim on the shoulder and sleeve; the background drops to near black.
- SCRIM UNDER THE TEXT: a horizontal gradient from about 85 percent black at the left edge to fully transparent at the split line. Copy never touches texture.
- INFORMATION COLUMN, top to bottom, one hard left edge, about 7 percent margin from the canvas edge:
  1. headline, at most two lines, very large bold white sans, tight leading;
  2. one thin subline at roughly one third of the headline size, items separated by a middle dot;
  3. feature list in a two by two grid, each item a small circular monoline icon (24 to 32 px) plus two short lines;
  4. one tiny authenticity or brand line;
  5. price block: the number at three to four times body size with the currency unit much smaller and sitting on the same baseline; at most two short spec lines under it separated by a vertical bar.
- OPTIONAL BOTTOM: a strip of three to four small rounded thumbnails with one-line captions, or a full-width dark bar holding the brand and one line.
- NEVER: text over the product, more than three type sizes inside the column, a white or bright background, or a centred alignment mixed into this left-aligned column.`;

const LIFESTYLE_CALLOUT = `Blueprint B — lifestyle full bleed with feature callouts.
- FULL BLEED PHOTOGRAPH: a believable outdoor or street scene with cool desaturated depth (mist, canopy, distant buildings). The product and its wearer sit in the middle band, slightly right of centre, filling about 35 to 50 percent of the frame; the eyes land in the upper third.
- TOP ZONE, centred and stacked: the brand mark if the product carries one, then a headline of one or two lines at very large bold white, then one short subline.
- CALLOUTS: three on the left edge and three on the right edge, forming two symmetric columns; each is a small monoline outline icon plus one short label, icon toward the product and label toward the edge. The two columns stay inside the outer 30 percent and never cross the centre band where the product sits.
- BOTTOM ZONE under a dark upward gradient (about 85 percent black at the very bottom fading to transparent):
  1. a two-line statement, left aligned;
  2. the price at the right of the same band, the number large and the currency symbol noticeably smaller;
  3. a hairline divider under both;
  4. a row of three small icon plus label chips;
  5. one line of fine print at the very bottom.
- NEVER: a callout over the product or the face, more than six callouts, a label in the busiest part of the photo, or a bright band behind the bottom text.`;

const SHARED = `SHARED GRID RULES FOR BOTH BLUEPRINTS
- Safe margin about 7 percent on every edge; nothing important is cropped.
- The product is the only saturated element; background and props stay desaturated so the product reads first.
- Two or three type sizes only, one family, weight contrast instead of size contrast for hierarchy.
- White or near-white copy; no outline, no glow, no drop shadow, no gradient text.
- One light direction for the whole image; contact shadows under the product; consistent occlusion.
- The brand mark is preserved exactly as printed on the product, never redrawn, never invented.
- Every word still obeys the IN-IMAGE COPY whitelist and the target market language. The blueprint only decides placement, never content.`;

export function layoutBlueprintFor(layout = '', imagePrompt = '') {
  const value = String(layout || '').toLowerCase();
  const scene = String(imagePrompt || '').toLowerCase();
  const pick = (text) => text;
  if (/callout|lifestyle|full[-\s]?bleed|forest|outdoor/.test(value)) return { key: LAYOUT_KEYS.lifestyle, text: pick(LIFESTYLE_CALLOUT) };
  if (/studio|split|column|dark|product[-\s]?shot/.test(value)) return { key: LAYOUT_KEYS.studio, text: pick(STUDIO_SPLIT) };
  // 老方案没有标记时，从画面描述里猜一次
  if (/callout|icon|label|full[-\s]?bleed/.test(scene)) return { key: LAYOUT_KEYS.lifestyle, text: pick(LIFESTYLE_CALLOUT) };
  if (/split|left side|information column|studio|dark background|concrete/.test(scene)) return { key: LAYOUT_KEYS.studio, text: pick(STUDIO_SPLIT) };
  return { key: 'unset', text: '' };
}

export function buildLayoutBlueprintSection(layout = '', imagePrompt = '') {
  const resolved = layoutBlueprintFor(layout, imagePrompt);
  const header = 'LAYOUT BLUEPRINT — the canvas must follow one of the two approved layouts below. Do not invent a third layout.';
  const body = resolved.text
    ? resolved.text
    : `${STUDIO_SPLIT}\n\n${LIFESTYLE_CALLOUT}\n\nChoose the one that matches the SCENE description above. If the scene is a studio or a dark interior, use Blueprint A. If the scene is a real outdoor or street environment, use Blueprint B.`;
  return `${header}\n\n${body}\n\n${SHARED}`;
}
