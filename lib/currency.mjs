// 替换版 lib/currency.mjs
// 变化：①支持 19 个目标市场（+ 原有东南亚 9 国，含 KHR/LAK/MMK 兜底）；②按各国本地写法格式化金额；③保留原有导出与返回字段，ai.mjs / server.mjs 无需改动。
import { COUNTRIES, findCountry } from './knowledge/markets/index.mjs';

// 原有 9 个东南亚市场（保持向后兼容；KHR/LAK/MMK 不在 19 国清单里，保留兜底）
const LEGACY_CURRENCIES = {
  泰国: { code: 'THB', symbol: '฿', position: 'prefix', decimals: 0, group: ',', decimal: '.' },
  越南: { code: 'VND', symbol: '₫', position: 'suffix', decimals: 0, group: '.', decimal: ',' },
  马来西亚: { code: 'MYR', symbol: 'RM', position: 'prefix', decimals: 2, group: ',', decimal: '.' },
  新加坡: { code: 'SGD', symbol: 'S$', position: 'prefix', decimals: 2, group: ',', decimal: '.' },
  印度尼西亚: { code: 'IDR', symbol: 'Rp', position: 'prefix', decimals: 0, group: '.', decimal: ',' },
  菲律宾: { code: 'PHP', symbol: '₱', position: 'prefix', decimals: 2, group: ',', decimal: '.' },
  柬埔寨: { code: 'KHR', symbol: '៛', position: 'prefix', decimals: 0, group: ',', decimal: '.' },
  老挝: { code: 'LAK', symbol: '₭', position: 'prefix', decimals: 0, group: ',', decimal: '.' },
  缅甸: { code: 'MMK', symbol: 'K', position: 'prefix', decimals: 0, group: ',', decimal: '.' }
};

// 汇率：1 CNY 兑目标货币的「配置回退值」。线上请用 ADLAB_CNY_RATES 环境变量覆盖（JSON），并在 ADLAB_RATES_UPDATED_AT 写更新时间。
const DEFAULT_CNY_RATES = {
  // 东南亚（原有）
  THB: 4.65,
  VND: 3500,
  MYR: 0.66,
  SGD: 0.19,
  IDR: 2200,
  PHP: 8.1,
  KHR: 580,
  LAK: 3200,
  MMK: 470,
  // 新增市场
  USD: 0.14,
  CAD: 0.19,
  MXN: 2.5,
  BRL: 0.77,
  AUD: 0.21,
  EUR: 0.128,
  GBP: 0.109,
  RUB: 12.5,
  SAR: 0.525,
  AED: 0.513,
  KRW: 190,
  JPY: 21
};

const ZERO_DECIMAL_ROUNDING = new Set(['VND', 'IDR', 'KHR', 'LAK', 'MMK', 'KRW', 'JPY']);
const THOUSAND_ROUNDING = new Set(['VND', 'IDR', 'KHR', 'LAK', 'MMK']);

function buildCurrencyTable() {
  const table = { ...LEGACY_CURRENCIES };
  COUNTRIES.forEach((country) => {
    const spec = country.currency;
    if (!spec) return;
    const entry = {
      code: spec.code,
      symbol: spec.symbol,
      position: spec.position || 'prefix',
      decimals: Number.isFinite(spec.decimals) ? spec.decimals : 2,
      group: spec.group || ',',
      decimal: spec.decimal || '.'
    };
    table[country.name] = entry;
    if (country.id) table[country.id] = entry;
    (country.aliases || []).forEach((alias) => {
      if (!table[alias]) table[alias] = entry;
    });
  });
  return table;
}

const MARKET_CURRENCIES = buildCurrencyTable();

function parseAmount(value) {
  const match = String(value ?? '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function configuredRates() {
  try {
    const parsed = JSON.parse(process.env.ADLAB_CNY_RATES || '{}');
    return { ...DEFAULT_CNY_RATES, ...parsed };
  } catch {
    return DEFAULT_CNY_RATES;
  }
}

function roundAmount(code, value) {
  if (THOUSAND_ROUNDING.has(code)) return Math.round(value / 1000) * 1000;
  if (ZERO_DECIMAL_ROUNDING.has(code)) return Math.round(value);
  return Math.round(value * 100) / 100;
}

/** 按当地写法格式化：1.299,00 € / ₩1,299,000 / 1,299.00 ر.س 等 */
export function formatLocalAmount(amount, spec) {
  if (!spec) return String(amount);
  const decimals = Number.isFinite(spec.decimals) ? spec.decimals : 2;
  const fixed = Math.abs(Number(amount) || 0).toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '\u0000').replace(/\u0000/g, spec.group || ',');
  const number = decPart ? `${grouped}${spec.decimal || '.'}${decPart}` : grouped;
  if ((spec.position || 'prefix') === 'suffix') {
    return `${number} ${spec.symbol}`;
  }
  return `${spec.symbol}${number}`;
}

export function resolveCurrency(input = {}) {
  const market = String(input.market || input.marketId || '').trim();
  const found = findCountry(market);
  const target =
    MARKET_CURRENCIES[market] ||
    (found && found.currency
      ? {
          code: found.currency.code,
          symbol: found.currency.symbol,
          position: found.currency.position || 'prefix',
          decimals: Number.isFinite(found.currency.decimals) ? found.currency.decimals : 2,
          group: found.currency.group || ',',
          decimal: found.currency.decimal || '.'
        }
      : { code: 'CNY', symbol: '¥', position: 'prefix', decimals: 2, group: ',', decimal: '.' });

  const sourceAmount = parseAmount(input.product?.price || input.sourceAmount);
  const rates = configuredRates();
  const exchangeRate = target.code === 'CNY' ? 1 : Number(rates[target.code] || 0);
  const available = Boolean(sourceAmount && exchangeRate);
  const convertedAmount = available ? roundAmount(target.code, sourceAmount * exchangeRate) : 0;
  return {
    sourceCurrency: 'CNY',
    sourceAmount,
    targetCurrency: target.code,
    targetSymbol: target.symbol,
    convertedAmount,
    exchangeRate,
    available,
    displayAmount: available ? formatLocalAmount(convertedAmount, target) : '',
    rateSource: process.env.ADLAB_CNY_RATES ? 'environment' : 'configured-fallback',
    rateUpdatedAt: process.env.ADLAB_RATES_UPDATED_AT || '当前配置'
  };
}

export function marketCurrency(market) {
  const key = String(market || '').trim();
  const found = findCountry(key);
  if (MARKET_CURRENCIES[key]) return MARKET_CURRENCIES[key];
  if (found?.currency) {
    return {
      code: found.currency.code,
      symbol: found.currency.symbol,
      position: found.currency.position || 'prefix',
      decimals: Number.isFinite(found.currency.decimals) ? found.currency.decimals : 2,
      group: found.currency.group || ',',
      decimal: found.currency.decimal || '.'
    };
  }
  return { code: 'CNY', symbol: '¥', position: 'prefix', decimals: 2, group: ',', decimal: '.' };
}

export { MARKET_CURRENCIES, DEFAULT_CNY_RATES };
