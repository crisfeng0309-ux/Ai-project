const MARKET_CURRENCIES = {
  泰国: { code: 'THB', symbol: '฿' },
  越南: { code: 'VND', symbol: '₫' },
  马来西亚: { code: 'MYR', symbol: 'RM' },
  新加坡: { code: 'SGD', symbol: 'S$' },
  印度尼西亚: { code: 'IDR', symbol: 'Rp' },
  菲律宾: { code: 'PHP', symbol: '₱' },
  柬埔寨: { code: 'KHR', symbol: '៛' },
  老挝: { code: 'LAK', symbol: '₭' },
  缅甸: { code: 'MMK', symbol: 'K' }
};

const DEFAULT_CNY_RATES = {
  THB: 4.65,
  VND: 3500,
  MYR: 0.66,
  SGD: 0.19,
  IDR: 2200,
  PHP: 8.1,
  KHR: 580,
  LAK: 3200,
  MMK: 470
};

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
  if (['VND', 'IDR', 'KHR', 'LAK', 'MMK'].includes(code)) return Math.round(value / 1000) * 1000;
  return Math.round(value);
}

export function resolveCurrency(input = {}) {
  const market = String(input.market || '').trim();
  const target = MARKET_CURRENCIES[market] || { code: 'CNY', symbol: '¥' };
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
    displayAmount: available ? `${target.symbol}${convertedAmount.toLocaleString('en-US')}` : '',
    rateSource: process.env.ADLAB_CNY_RATES ? 'environment' : 'configured-fallback',
    rateUpdatedAt: process.env.ADLAB_RATES_UPDATED_AT || '当前配置'
  };
}

export function marketCurrency(market) {
  return MARKET_CURRENCIES[String(market || '').trim()] || { code: 'CNY', symbol: '¥' };
}
