// 预览 / 自测脚本：node tools/preview-market-rules.mjs
// 输出：两级目录规模、若干国家的注入块、token 估算与金额格式化样例
import { REGIONS, COUNTRIES } from '../lib/knowledge/markets/index.mjs';
import { resolveMarket, buildMarketRuleBlock, buildMarketPromptAppend, estimateTokens, lintAdCopy } from '../lib/market-constraints.mjs';
import { resolveCurrency } from '../lib/currency.mjs';

const line = (label) => console.log(`\n${'='.repeat(12)} ${label} ${'='.repeat(12)}`);

line('目录规模');
console.log(`地区 ${REGIONS.length} 个，国家 ${COUNTRIES.length} 个`);
REGIONS.forEach((region) => console.log(`- ${region.name}（${region.id}）：${region.countries.map((c) => `${c.name}(${c.id})`).join('、')}`));

const samples = ['美国', '加拿大', 'US', '沙特阿拉伯', '日本', '泰国', '西班牙', '巴西'];

line('解析与注入块（前 4 个）');
samples.slice(0, 4).forEach((name) => {
  const resolved = resolveMarket(name);
  console.log(`\n[${name}] → ${resolved?.region?.name} / ${resolved?.country?.name}`);
  const block = buildMarketRuleBlock({ market: name, platformIds: ['Amazon'] });
  console.log(block);
  const tokens = estimateTokens(block);
  console.log(`—— 约束块约 ${block.length} 字符 / ${tokens} tokens`);
  if (tokens > 450) console.log('⚠️ 超长，需要精简');
});

line('全量市场 token 体检');
let max = 0;
let maxName = '';
COUNTRIES.forEach((country) => {
  const tokens = estimateTokens(buildMarketRuleBlock({ market: country.id }));
  if (tokens > max) {
    max = tokens;
    maxName = `${country.regionName}/${country.name}`;
  }
});
console.log(`最大约束块：${maxName} ≈ ${max} tokens`);

line('金额本地化');
['美国', '日本', '德国', '沙特阿拉伯', '印度尼西亚', '越南', '俄罗斯'].forEach((market) => {
  const cur = resolveCurrency({ market, product: { price: '6999' } });
  console.log(`${market}: 输入 ¥6999 → ${cur.displayAmount}（汇率 ${cur.exchangeRate}，${cur.targetCurrency}）`);
});

line('提示词追加块样例（泰国）');
console.log(buildMarketPromptAppend({ market: '泰国', platformIds: ['Shopee'] }));

line('compact 模式 token 体检');
let compactMax = 0;
let compactName = '';
COUNTRIES.forEach((country) => {
  const tokens = estimateTokens(buildMarketRuleBlock({ market: country.id, compact: true }));
  if (tokens > compactMax) {
    compactMax = tokens;
    compactName = `${country.regionName}/${country.name}`;
  }
});
console.log(`compact 最大：${compactName} ≈ ${compactMax} tokens`);

line('自检示例');
[
  ['美国', '限量 No.1 爆款，仅 $19.99，立即购买'],
  ['美国', '爆款直降，¥99 包邮，限时抢'],
  ['沙特阿拉伯', '限时特惠 1,299 ر.س，家庭必备'],
  ['日本', '¥12,990（税込） 送料無料'],
  ['德国', 'Nur 1.299,00 € – jetzt bestellen']
].forEach(([market, copy]) => {
  const result = lintAdCopy(copy, market);
  console.log(`${market} | ${copy} → ${result.ok ? '✅ 通过' : result.issues.map((item) => `${item.level}:${item.code}`).join(', ')}`);
});

