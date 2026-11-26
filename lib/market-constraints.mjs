// 市场约束解析与提示词拼装
// 设计目标：用户选定某个国家时，只注入「该地区共通规则 + 该国规则」，绝不把全球规则全量塞进 prompt。
import { COUNTRIES, REGIONS, findCountry, findRegion, listCatalog } from './knowledge/markets/index.mjs';

export function estimateTokens(text = '') {
  const ascii = (String(text).match(/[\x00-\x7F]/g) || []).length;
  const wide = String(text).length - ascii;
  return Math.ceil(ascii / 4 + wide / 1.6);
}

/** 把各种入参（国家 id / 中文名 / 英文名 / { marketId } / { market }）解析成 { region, country } */
export function resolveMarket(input) {
  if (!input) return null;
  const query =
    typeof input === 'string'
      ? input
      : input.marketId || input.countryId || input.market || input.country || input.name || '';
  if (!query) return null;
  const country = findCountry(query);
  if (country) {
    return { region: REGIONS.find((region) => region.id === country.regionId) || null, country };
  }
  const region = findRegion(query);
  if (region) return { region, country: null };
  return null;
}

export function getMarketProfile(input) {
  const resolved = resolveMarket(input);
  if (!resolved) return null;
  const { region, country } = resolved;
  return {
    regionId: region?.id || null,
    regionName: region?.name || null,
    countryId: country?.id || null,
    countryName: country?.name || null,
    language: country?.lang || null,
    currency: country?.currency || null,
    platforms: country?.platforms || [],
    confidence: country?.confidence || 'C'
  };
}

/** 平台行：只保留该国常用平台；传入的 platform 若不在列表中也会保留并标注 */
function platformLine(country, platformIds = [], max = 5) {
  const list = (country.platforms || []).slice(0, max);
  const wanted = (platformIds || []).filter(Boolean);
  const extra = wanted.filter((id) => !list.some((item) => item.toLowerCase().includes(String(id).toLowerCase())));
  const merged = [...list, ...extra].slice(0, max + 1);
  if (!merged.length) return '';
  const selected = wanted.length ? `（本次投放：${wanted.join('、')}）` : '';
  return `平台：${merged.join(' / ')}${selected}`;
}

function cleanList(values, max = 6) {
  const seen = new Set();
  const out = [];
  for (const value of values || []) {
    const text = String(value ?? '')
      .replace(/[。；;.\s]+$/g, '')
      .trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= max) break;
  }
  return out;
}

function bullet(title, values, max = 6) {
  const list = cleanList(values, max);
  if (!list.length) return '';
  return `${title}：${list.join('；')}`;
}

function stripRegionPrefix(rule, region) {
  let text = String(rule ?? '').trim();
  const prefixes = [`${region?.name || ''}共通：`, ...((region?.aliases || []).map((alias) => `${alias}共通：`))];
  prefixes.forEach((prefix) => {
    if (prefix && text.startsWith(prefix)) text = text.slice(prefix.length);
  });
  return text;
}

/**
 * 生成注入用的市场约束块（默认 200–350 tokens）。
 * 只含：地区共通规则（1–3 条）+ 该国语言/货币/日期单位/调性/平台/必含/禁宣称/禁视觉/合规/节日。
 */
export function buildMarketRuleBlock({ market, platformIds = [], includeRegionShared = true, includeMeta = true, compact = false } = {}) {
  const resolved = resolveMarket(market);
  if (!resolved || !resolved.country) return '';
  const { region, country } = resolved;
  const lines = [];
  const limits = compact
    ? { required: 2, rules: 1, banClaims: 3, banVisual: 2, compliance: 0, festival: 0, platforms: 4, shared: 1 }
    : { required: 2, rules: 2, banClaims: 3, banVisual: 3, compliance: 2, festival: 4, platforms: 5, shared: 2 };

  lines.push(`【市场约束｜${country.name}（${region?.name || ''}）】`);
  if (includeRegionShared && region?.sharedRules?.length) {
    cleanList(region.sharedRules.map((rule) => stripRegionPrefix(rule, region)), limits.shared).forEach((rule) => lines.push(`- 地区共通：${rule}`));
  }

  const lang = country.lang || {};
  const extraLangs = (country.extraLangs || []).map((item) => `${item.label}（${item.note}）`).join('；');
  lines.push(
    `- 语言与文字：主文案必须用 ${lang.label || lang.code}（${lang.code}，${lang.script}，${lang.dir === 'rtl' ? '从右到左排版，图标与箭头需镜像' : '从左到右排版'}）${extraLangs ? `；可加：${extraLangs}` : ''}；不得混用其他语言整句。`
  );

  const cur = country.currency || {};
  const taxLine = cur.tax === 'included' ? cur.taxNote || '标价含税' : `标价不含税，须说明税费另计${cur.taxNote ? `（${cur.taxNote}）` : ''}`;
  lines.push(`- 货币与价格：${cur.code}（${cur.symbol}），示例 ${cur.sample}；${taxLine}；折扣须给原价与期限。`);
  lines.push(`- 日期与单位：${country.date || ''}；${country.units || ''}。`);
  if (country.tone) lines.push(`- 调性：${country.tone}。`);

  const pLine = platformLine(country, platformIds, limits.platforms);
  if (pLine) lines.push(`- ${pLine}。`);

  [['- 画面必含', country.required, limits.required], ['- 补充要求', country.rules, limits.rules], ['- 禁止的宣称', country.banClaims, limits.banClaims], ['- 禁止的视觉元素', country.banVisual, limits.banVisual], ['- 合规依据', country.compliance, limits.compliance]].forEach(
    ([title, values, max]) => {
      if (!max) return;
      const line = bullet(title, values, max);
      if (line) lines.push(`${line}。`);
    }
  );

  if (limits.festival && country.festival?.length) lines.push(`- 营销节点：${cleanList(country.festival, limits.festival).join(' / ')}。`);
  if (includeMeta) {
    lines.push(`- 说明：以上仅针对${country.name}市场；不得自行补充其他国家的规则或臆造当地法规，遇到未覆盖情况按"不确定就不写"处理。`);
  }
  return lines.join('\n');
}

/** 拼到系统提示词里的整段文本（含通用红线） */
export function buildMarketPromptAppend({ market, platformIds = [] } = {}) {
  const block = buildMarketRuleBlock({ market, platformIds });
  if (!block) return '';
  return `\n\n=== 本次目标市场约束（由 adlab_kb 注入，优先级高于你的默认知识） ===\n${block}\n=== 约束结束 ===`;
}

export function listMarketCatalog() {
  return listCatalog();
}

export function listAllCountries() {
  return COUNTRIES.map((country) => ({
    id: country.id,
    name: country.name,
    regionId: country.regionId,
    regionName: country.regionName,
    langs: [country.lang?.code, ...(country.extraLangs || []).map((item) => item.code)].filter(Boolean),
    currency: country.currency?.code,
    confidence: country.confidence || 'C'
  }));
}

export const CURRENCY_SYMBOLS = {
  USD: '$',
  CAD: 'C$',
  MXN: 'MX$',
  BRL: 'R$',
  AUD: 'A$',
  EUR: '€',
  GBP: '£',
  RUB: '₽',
  SAR: 'ر.س',
  AED: 'د.إ',
  KRW: '₩',
  JPY: '¥',
  VND: '₫',
  THB: '฿',
  IDR: 'Rp',
  MYR: 'RM',
  SGD: 'S$',
  PHP: '₱'
};

const ABSOLUTE_CLAIM_PATTERNS = [
  /\bNo\.?\s*1\b/i,
  /#1\b/,
  /\bbest\b/i,
  /\bguaranteed\b/i,
  /\b100\s*%/,
  /최고|최저가|1위/,
  /ที่สุด|อันดับ\s*1/,
  /أفضل|الأول/,
  /самый|лучший|№\s*1/i,
  /最好|第一|顶级|绝对|百分百/
];

// 只把「不会和其他货币混淆」的符号放进白名单，避免把 $ 误判成外币
const DISTINCT_SYMBOLS = {
  EUR: '€', GBP: '£', RUB: '₽', KRW: '₩', THB: '฿', VND: '₫', PHP: '₱',
  CAD: 'C$', AUD: 'A$', BRL: 'R$', MXN: 'MX$', SGD: 'S$'
};

/**
 * 生成后自检：只做「确定能判错」的检查（语言字符、货币、绝对化宣称），返回 issues 供 UI 展示。
 * 不联网、不调用模型，毫秒级。
 */
export function lintAdCopy(text, market, { checkLanguage = true } = {}) {
  const resolved = resolveMarket(market);
  if (!resolved?.country) return { ok: true, skipped: true, issues: [] };
  const { country } = resolved;
  const copy = String(text ?? '');
  const issues = [];

  if (ABSOLUTE_CLAIM_PATTERNS.some((pattern) => pattern.test(copy))) {
    issues.push({ code: 'absolute-claim', level: 'warn', message: '出现最高级/绝对化宣称，须有客观依据（该国广告法普遍限制）' });
  }

  const hasCJK = /[\u4e00-\u9fff]/.test(copy);
  const hasKana = /[\u3040-\u30ff]/.test(copy);
  const hasHangul = /[\uac00-\ud7af]/.test(copy);
  const hasArabic = /[\u0600-\u06ff]/.test(copy);
  if (checkLanguage) {
    if (hasCJK && !hasKana && country.id !== 'JP') {
      issues.push({ code: 'lang-cjk', level: 'error', message: `画面出现中文字符，${country.name}应使用 ${country.lang?.code || '当地语言'}` });
    }
    if (hasKana && country.id !== 'JP') {
      issues.push({ code: 'lang-kana', level: 'error', message: `画面出现日文假名，${country.name}不应使用日文` });
    }
    if (hasHangul && country.id !== 'KR') {
      issues.push({ code: 'lang-hangul', level: 'error', message: `画面出现韩文，${country.name}不应使用韩文` });
    }
    if (hasArabic && !['SA', 'AE'].includes(country.id)) {
      issues.push({ code: 'lang-arabic', level: 'error', message: `画面出现阿拉伯文，${country.name}不应使用阿语文案` });
    }
  }

  const expectedCode = country.currency?.code;
  if (expectedCode) {
    const foreignCodes = Object.keys(CURRENCY_SYMBOLS).filter((code) => {
      if (code === expectedCode) return false;
      if (DISTINCT_SYMBOLS[code]) return copy.includes(DISTINCT_SYMBOLS[code]);
      return new RegExp(`\\b${code}\\b`).test(copy);
    });
    if (foreignCodes.length) {
      issues.push({ code: 'currency-mismatch', level: 'warn', message: `疑似使用了其他市场货币（${foreignCodes.join('、')}），${country.name}应为 ${expectedCode}` });
    }
  }

  return { ok: issues.length === 0, country: country.name, regionName: country.regionName, issues };
}

export { REGIONS, COUNTRIES };
