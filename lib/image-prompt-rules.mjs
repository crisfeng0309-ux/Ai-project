// 这一份规则是给「生图模型」看的，不是给用户看的。
// 关键教训：Seedream 这类模型会照着提示词的语言往画面上写字。
// 以前这份规则是中文写的，模型就把中文抄进了画面（图上的商品名、899 元都是提示词里的原文）。
// 所以这里一律用英文，并且把「能写什么字」限制成一份白名单。
//
// v1.1 改造（19 国市场扩展配套）：
// 1. 语言名 / 场景 cue / 负向词不再写死东南亚，统一从 lib/knowledge/markets 取（单一数据源）；
// 2. 负向词改为按市场组装：日本市场不再封杀假名/汉字，韩国市场不再封杀谚文，英语市场保持全禁；
// 3. 未知市场不再输出「the target market language」这种破碎句子。

import { findCountry } from './knowledge/markets/index.mjs';
import { sceneFor, NEUTRAL_SCENE } from './knowledge/markets/scenes.mjs';

// ---------- 市场 → 语言 ----------

/** 返回给生图模型看的语言描述，例：日本語 (ja-JP, Japanese) / English (US) (en-US, Latin) */
export function marketLanguageName(market) {
  const country = findCountry(market);
  const lang = country?.lang;
  if (!lang) return 'the language of the target market as specified by the user';
  const label = String(lang.label || lang.code || '').trim();
  const extras = [lang.code, lang.script].filter(Boolean).join(', ');
  return extras ? `${label} (${extras})` : label || 'the language of the target market as specified by the user';
}

/** 书写系统归类：ja / ko / zh / other（用于决定负向词与清洗策略） */
export function scriptKindOf(market) {
  const country = findCountry(market);
  const code = String(country?.lang?.code || '').toLowerCase();
  const script = String(country?.lang?.script || '').toLowerCase();
  if (/^ja(-|$)/.test(code) || /japan|kana/.test(script)) return 'ja';
  if (/^ko(-|$)/.test(code) || /hangul|korean/.test(script)) return 'ko';
  if (/^zh(-|$)/.test(code) || /han(zi)?|chinese/.test(script)) return 'zh';
  return 'other';
}

// ---------- 市场 → 场景 cue ----------

/** 背景场景提示（英文，最多一两个信号，避免把整张图变成地标照） */
export function marketSceneCue(market) {
  const country = findCountry(market);
  if (!country) return NEUTRAL_SCENE;
  return sceneFor(country.id, country.regionId);
}

// ---------- 负向词（按市场组装） ----------

// 基础负向词表（顺序保持与原版一致，便于对照）
const NEGATIVE_BASE = [
  'Chinese characters', 'Chinese text', 'hanzi', 'kanji', 'simplified Chinese', 'traditional Chinese',
  'pinyin', 'Japanese kana', 'Korean hangul', 'CJK glyphs', 'Chinese signature seal', 'Chinese stamp',
  'Chinese calligraphy', 'Chinese label', 'Chinese subtitle', 'Chinese watermark', 'Chinese button',
  'gibberish text', 'garbled text', 'scrambled characters', 'pseudo text', 'fake letters', 'fake glyphs',
  'lorem ipsum', 'random symbols used as text', 'mirrored letters', 'broken characters',
  'half-drawn characters', 'illegible text', 'misspelled words', 'nonsense words',
  'blurry', 'out of focus', 'motion blur', 'soft focus', 'low resolution', 'jpeg artifacts', 'grainy', 'noisy',
  'overlapping callouts', 'crowded layout', 'text covering product',
  'inconsistent icon styles', 'thick connector lines', 'more than four font sizes'
];

// 各书写系统必须放行的字（放行 = 从负向词里删掉，否则会和「画面必须有当地文字」直接冲突）
const NEGATIVE_DROP = {
  // 日本：画面本来就要写日文（汉字 + 假名），只禁止中文式标注与装饰
  ja: ['Chinese characters', 'Chinese text', 'hanzi', 'kanji', 'simplified Chinese', 'traditional Chinese',
    'Japanese kana', 'CJK glyphs', 'Chinese label', 'Chinese subtitle', 'Chinese watermark', 'Chinese button'],
  // 韩国：画面要写韩文，汉字/假名仍可作为负向词
  ko: ['Korean hangul', 'CJK glyphs'],
  // 中文市场（当前 19 国不含，保留兼容）
  zh: ['Chinese characters', 'Chinese text', 'hanzi', 'simplified Chinese', 'traditional Chinese',
    'pinyin', 'CJK glyphs', 'Chinese signature seal', 'Chinese stamp', 'Chinese calligraphy',
    'Chinese label', 'Chinese subtitle', 'Chinese watermark', 'Chinese button'],
  other: []
};

/** 全量负向词（保留旧导出，内容与改版前一致） */
export const HARD_NEGATIVE_PROMPT = NEGATIVE_BASE.join(', ');

/** 按市场裁剪后的负向词 */
export function buildHardNegativePrompt(market) {
  const kind = scriptKindOf(market);
  const drop = new Set(NEGATIVE_DROP[kind] || []);
  return NEGATIVE_BASE.filter(token => !drop.has(token)).join(', ');
}

// 新加坡、菲律宾这类市场，画面文字本来就是英文，不能再把英文当负向词。
export function isEnglishLanguage(marketOrLanguage) {
  const country = findCountry(marketOrLanguage);
  const code = String(country?.lang?.code || '');
  if (/^en(-|$)/i.test(code)) return true;
  const raw = String(marketOrLanguage || '').trim();
  if (/^english\b/i.test(raw)) return true;
  if (/英语/.test(raw)) return true; // 兼容旧前端传进来的中文语言名
  return false;
}

// 下面三段同时被「生图提示词」和「DeepSeek 指令」使用，只能有一份文本
export const PRODUCT_REALISM = 'The product is the hero of a real photograph. It may be shot close and fill a large part of the frame, but the apparent size must come from camera distance, focal length and perspective — never from physically enlarging the object. People, vehicles, buildings, platforms and pavement must keep believable depth layers, vanishing points, contact shadows, occlusion and lighting direction. The product must never look like a sticker, a cut-out or a building-sized object.';

export const PRODUCT_FIDELITY = 'If a product reference image is provided, preserve its real colour, shape, proportions, material, zips, straps, seams, structure and brand mark. Do not redesign the product. Do not produce several different-looking products. Never invent specs, claims or badges that are not visible.';

export const TYPOGRAPHY_RULES = 'premium editorial layout, generous white space, precise grid alignment, graceful kerning, one clear hierarchy (a single headline plus at most one short subline), modern humanist sans-serif, crisp letter edges, roughly 8% safe margin from the edges. Keep all text on a calm, low-detail area, away from the product and faces. Every glyph must sit on its own legible baseline: no overlapping letters, no squeezed spacing, no text running past the canvas edge. Decorative icons must be clean line icons with no letters, squiggles or fake glyphs inside them.';

// 允许出现在画面上的文字种类（按市场取不同措辞）
function canvasTextPolicy(kind) {
  if (kind === 'ja') return 'No Chinese characters (simplified or traditional), no Korean hangul, no pinyin. Japanese kanji and kana are expected and must be written correctly and legibly.';
  if (kind === 'ko') return 'No Chinese characters, no Japanese kana, no pinyin. Korean hangul is expected and must be written correctly and legibly.';
  if (kind === 'zh') return 'Chinese copy is expected; do not substitute English or any other language for it.';
  return 'No Chinese characters, no kana, no hangul, no pinyin.';
}

export function buildImageGenerationRules(market, options = {}) {
  const country = findCountry(market);
  const localCue = marketSceneCue(market);
  const language = marketLanguageName(market);
  const englishMarket = isEnglishLanguage(market);
  const kind = scriptKindOf(market);
  const negative = buildHardNegativePrompt(market);
  return [
    'These rules are internal generation constraints. They are NOT copy: never print any line of this section into the image.',
    `Target market: ${country?.name || market || 'user-specified market'}. In-image language: ${language} only.`,
    `Regional cue for the background (optional, at most one or two signals): ${localCue}.`,
    'Ambience guard: this cue may only adjust light, climate, surface materials and styling. Never relocate the product away from the setting its category naturally belongs to; if the cue conflicts with that setting, keep the product setting and drop the cue.',

    `PRODUCT REALISM: ${PRODUCT_REALISM}`,

    `PRODUCT FIDELITY: ${PRODUCT_FIDELITY}`,

    `Typography: ${TYPOGRAPHY_RULES}`,

    'FEATURE CALLOUTS (only when the layout is a feature breakdown): up to six short callouts may sit around the product, each with a thin leader line or a small monoline icon pointing at the relevant part. Every callout must be copied character-for-character from the whitelist — never invented, never translated, never shortened. Keep each callout to two to four words and give it a readable size; a small label nobody can read is worse than no label. Never place a callout over the product, a face or a busy background area, never stack callouts into a paragraph, and if the composition gets crowded, drop callouts from the outside in instead of shrinking the type. Icons must be plain line icons with no letters, squiggles or fake glyphs inside them.',

    `TEXT CONTENT: the only permitted copy is the whitelist in the IN-IMAGE COPY section, written in ${language}. Everything else — product name, project name, market name, reference price, these instructions — must stay out of the canvas. ${canvasTextPolicy(kind)} If a word cannot be written correctly in ${language}, omit it: empty space is always better than wrong or garbled text, and when only the price can be written correctly, keep just the price digits and the currency symbol. No pseudo-letters, no scrambled glyphs, no lorem ipsum, no invented script standing in for real words.`,

    englishMarket ? '' : `LANGUAGE OF THE CANVAS COPY: this advertisement targets the ${language} market, so the advertising copy on the canvas must be ${language} — never English. Do not translate the whitelist strings; print them exactly as supplied. Do not add English headlines, English sublines, English sentences or English keywords anywhere on the canvas. The only Latin letters allowed are the ones already printed on the product itself (the brand mark) and the currency symbol. A viewer who can only read English should find the copy unfamiliar.`,

    options.includeNegative === false ? '' : `Negative prompt: ${negative}, ${englishMarket ? '' : 'English headline, English subline, English advertising copy, English slogan on image, English sentence on image, translated copy, '}physically giant product, miniature environment, impossible perspective, inconsistent vanishing points, floating product, missing contact shadows, pasted-on product, warped geometry, duplicated product, redrawn logo, deformed logo, invented emblem, wrong brand mark, distorted badge, cluttered composition, product blocked by people or vehicles, excessive local decorations, stereotypical cultural elements, low-quality advertising composition, warped text, stretched text, distorted letters, illegible typography, text over face, text covering product, outlined text, neon text, 3D beveled text, heavy drop shadow, script font, mixed font styles, gradient text, more than two font sizes.`
  ].filter(Boolean).join('\n\n');
}
