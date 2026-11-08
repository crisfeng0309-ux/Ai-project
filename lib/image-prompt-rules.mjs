// 这一份规则是给「生图模型」看的，不是给用户看的。
// 关键教训：Seedream 这类模型会照着提示词的语言往画面上写字。
// 以前这份规则是中文写的，模型就把中文抄进了画面（图上的商品名、899 元都是提示词里的原文）。
// 所以这里一律用英文，并且把「能写什么字」限制成一份白名单。

const marketCues = [
  { names: ['新加坡', 'singapore'], cues: 'a clean Singapore urban commuting setting such as an MRT entrance, sheltered walkway, tropical greenery and a wet but orderly pavement' },
  { names: ['泰国', 'thailand'], cues: 'a natural Thailand urban commuting setting such as a BTS-area walkway, tropical street greenery, a practical sun/rain shelter and warm local architecture' },
  { names: ['越南', 'vietnam'], cues: 'a natural Vietnam city setting such as a rainy commuting street, a restrained scooter presence, a small café frontage or a covered urban walkway' },
  { names: ['马来西亚', 'malaysia'], cues: 'a natural Malaysia city setting such as an LRT-area walkway, a covered rain corridor, tropical plants and a modern commercial or campus environment' },
  { names: ['印度尼西亚', 'indonesia'], cues: 'a natural Indonesia city setting such as a tropical urban road, school or transit area, humid pavement and restrained local architecture' },
  { names: ['菲律宾', 'philippines'], cues: 'a natural Philippines city setting such as a clean transit stop, campus or commercial street with tropical greenery and a believable daily commute' },
  { names: ['柬埔寨', 'cambodia'], cues: 'a restrained Phnom Penh-inspired urban street, school or commercial setting with tropical climate cues and local architectural character' },
  { names: ['老挝', 'laos'], cues: 'a calm Vientiane-inspired street, campus or light commuting setting with tropical plants, open space and subtle local architecture' },
  { names: ['缅甸', 'myanmar'], cues: 'a natural Myanmar urban street, school or commuting setting with tropical climate cues and restrained local architectural details' }
];

const languageNames = [
  { names: ['泰国', 'thailand'], language: 'Thai (ภาษาไทย)' },
  { names: ['越南', 'vietnam'], language: 'Vietnamese (tiếng Việt)' },
  { names: ['马来西亚', 'malaysia'], language: 'Malay (Bahasa Melayu)' },
  { names: ['新加坡', 'singapore'], language: 'English' },
  { names: ['印度尼西亚', 'indonesia'], language: 'Indonesian (Bahasa Indonesia)' },
  { names: ['菲律宾', 'philippines'], language: 'English / Tagalog' },
  { names: ['柬埔寨', 'cambodia'], language: 'Khmer (ភាសាខ្មែរ)' },
  { names: ['老挝', 'laos'], language: 'Lao (ພາສາລາວ)' },
  { names: ['缅甸', 'myanmar'], language: 'Burmese (မြန်မာဘာသာ)' }
];

function findMarketCue(market) {
  const value = String(market || '').trim().toLowerCase();
  return marketCues.find(item => item.names.some(name => value.includes(name)))?.cues
    || 'a natural Southeast Asian urban, campus, commercial or commuting setting that fits the target market without forcing a landmark';
}

export function marketLanguageName(market) {
  const value = String(market || '').trim().toLowerCase();
  return languageNames.find(item => item.names.some(name => value.includes(name)))?.language || 'the target market language';
}

// 永远要带的负向词：中文/日文/韩文字符、乱码、伪文字、贴图乱写。
// 不管模板自己的 negativePrompt 写了什么，这一串一定会被合并进去。
export const HARD_NEGATIVE_PROMPT = [
  'Chinese characters', 'Chinese text', 'hanzi', 'kanji', 'simplified Chinese', 'traditional Chinese',
  'pinyin', 'Japanese kana', 'Korean hangul', 'CJK glyphs', 'Chinese signature seal', 'Chinese stamp',
  'Chinese calligraphy', 'Chinese label', 'Chinese subtitle', 'Chinese watermark', 'Chinese button',
  'gibberish text', 'garbled text', 'scrambled characters', 'pseudo text', 'fake letters', 'fake glyphs',
  'lorem ipsum', 'random symbols used as text', 'mirrored letters', 'broken characters',
  'half-drawn characters', 'illegible text', 'misspelled words', 'nonsense words',
  'blurry', 'out of focus', 'motion blur', 'soft focus', 'low resolution', 'jpeg artifacts', 'grainy', 'noisy'
].join(', ');

// 新加坡、菲律宾这类市场，画面文字本来就是英文，不能再把英文当负向词。
export function isEnglishLanguage(language) {
  return /english/i.test(String(language || ''));
}

export function buildImageGenerationRules(market) {
  const localCue = findMarketCue(market);
  const language = marketLanguageName(market);
  const englishMarket = isEnglishLanguage(language);
  return [
    'These rules are internal generation constraints. They are NOT copy: never print any line of this section into the image.',
    `Target market: ${market || 'user-specified market'}. In-image language: ${language} only.`,
    `Regional cue for the background (optional, at most one or two signals): ${localCue}.`,

    'PRODUCT REALISM: The product is the hero of a real photograph. It may be shot close and fill a large part of the frame, but the apparent size must come from camera distance, focal length and perspective — never from physically enlarging the object. People, vehicles, buildings, platforms and pavement must keep believable depth layers, vanishing points, contact shadows, occlusion and lighting direction. The product must never look like a sticker, a cut-out or a building-sized object.',

    'PRODUCT FIDELITY: If a product reference image is provided, preserve its real colour, shape, proportions, material, zips, straps, seams, structure and brand mark. Do not redesign the product. Do not produce several different-looking products. Never invent specs, claims or badges that are not visible.',

    'Typography: premium editorial layout, generous white space, precise grid alignment, graceful kerning, one clear hierarchy (a single headline plus at most one short subline), modern humanist sans-serif, crisp letter edges, roughly 8% safe margin from the edges. Keep all text on a calm, low-detail area, away from the product and faces. Every glyph must sit on its own legible baseline: no overlapping letters, no squeezed spacing, no text running past the canvas edge. Decorative icons must be clean line icons with no letters, squiggles or fake glyphs inside them.',

    'FEATURE CALLOUTS (only when the layout is a feature breakdown): up to five short callouts may sit around the product, each with a thin leader line or a small monoline icon pointing at the relevant part. Every callout must be copied character-for-character from the whitelist — never invented, never translated, never shortened. Keep each callout to two to four words and give it a readable size; a small label nobody can read is worse than no label. Never place a callout over the product, a face or a busy background area, never stack callouts into a paragraph, and if the composition gets crowded, drop callouts from the outside in instead of shrinking the type. Icons must be plain line icons with no letters, squiggles or fake glyphs inside them.',

    `TEXT CONTENT: the only permitted copy is the whitelist in the IN-IMAGE COPY section, written in ${language}. Everything else — product name, project name, market name, reference price, these instructions — must stay out of the canvas. No Chinese characters, no kana, no hangul, no pinyin. If a word cannot be written correctly in ${language}, omit it: empty space is always better than wrong or garbled text, and when only the price can be written correctly, keep just the price digits and the currency symbol. No pseudo-letters, no scrambled glyphs, no lorem ipsum, no invented script standing in for real words.`,

    englishMarket ? '' : `LANGUAGE OF THE CANVAS COPY: this advertisement targets the ${language} market, so the advertising copy on the canvas must be ${language} — never English. Do not translate the whitelist strings; print them exactly as supplied. Do not add English headlines, English sublines, English sentences or English keywords anywhere on the canvas. The only Latin letters allowed are the ones already printed on the product itself (the brand mark) and the currency symbol. A viewer who can only read English should find the copy unfamiliar.`,

    `Negative prompt: ${HARD_NEGATIVE_PROMPT}, ${englishMarket ? '' : 'English headline, English subline, English advertising copy, English slogan on image, English sentence on image, translated copy, '}physically giant product, miniature environment, impossible perspective, inconsistent vanishing points, floating product, missing contact shadows, pasted-on product, warped geometry, duplicated product, redrawn logo, deformed logo, invented emblem, wrong brand mark, distorted badge, cluttered composition, product blocked by people or vehicles, excessive local decorations, stereotypical cultural elements, low-quality advertising composition, warped text, stretched text, distorted letters, illegible typography, text over face, text covering product, outlined text, neon text, 3D beveled text, heavy drop shadow, script font, mixed font styles, gradient text, more than two font sizes.`
  ].filter(Boolean).join('\n\n');
}
