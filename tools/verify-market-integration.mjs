// v1.1 验收脚本：B1–B6 全部断言
// 用法（仓库根目录）：node tools/verify-market-integration.mjs
// Windows 下 node 不在 PATH 时用：& "C:\Users\gz070\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe" tools/verify-market-integration.mjs

import { REGIONS, COUNTRIES, findCountry } from '../lib/knowledge/markets/index.mjs';
import { NEUTRAL_SCENE, sceneFor } from '../lib/knowledge/markets/scenes.mjs';
import {
  buildImageGenerationRules,
  marketLanguageName,
  marketSceneCue,
  buildHardNegativePrompt,
  scriptKindOf,
  isEnglishLanguage,
  HARD_NEGATIVE_PROMPT
} from '../lib/image-prompt-rules.mjs';
import { buildMarketRuleBlock, estimateTokens, lintAdCopy } from '../lib/market-constraints.mjs';
import { resolveCurrency, formatLocalAmount, marketCurrency } from '../lib/currency.mjs';
import { sanitizeAssetPrompts, stripCjk } from '../lib/ai.mjs';

let pass = 0;
const failures = [];
function check(name, condition, detail = '') {
  if (condition) {
    pass += 1;
  } else {
    failures.push(`${name}${detail ? ' → ' + detail : ''}`);
    console.log(`FAIL  ${name}${detail ? ' → ' + detail : ''}`);
  }
}

const names = COUNTRIES.map(c => c.name);
const byId = Object.fromEntries(COUNTRIES.map(c => [c.id, c]));

console.log('=== 0. 目录 ===');
console.log(`regions: ${REGIONS.length}  countries: ${COUNTRIES.length}`);
check('地区数 8', REGIONS.length === 8, String(REGIONS.length));
check('国家数 19', COUNTRIES.length === 19, String(COUNTRIES.length));
check('每个国家有语言与币种', COUNTRIES.every(c => c.lang?.code && c.currency?.code));

console.log('\n=== B1. 语言解析（19 国全覆盖）===');
for (const country of COUNTRIES) {
  for (const key of [country.name, country.id, ...(country.aliases || []).slice(0, 2)]) {
    const value = marketLanguageName(key);
    check(
      `B1 ${key} 解析出 ${country.lang.code}`,
      value.includes(country.lang.code) && !value.includes('as specified by the user'),
      value
    );
  }
}
check('B1 未知名回退句完整', marketLanguageName('火星') === 'the language of the target market as specified by the user', marketLanguageName('火星'));

console.log('\n=== B2. 英语市场判定 ===');
const englishMarkets = ['美国', '加拿大', '英国', '澳大利亚', '新加坡'];
const nonEnglishMarkets = ['日本', '韩国', '德国', '法国', '西班牙', '俄罗斯', '沙特阿拉伯', '阿联酋', '墨西哥', '巴西', '越南', '泰国', '印度尼西亚', '马来西亚'];
for (const market of englishMarkets) check(`B2 ${market} 判为英语市场`, isEnglishLanguage(market) === true);
for (const market of nonEnglishMarkets) check(`B2 ${market} 判为非英语市场`, isEnglishLanguage(market) === false);
check('B2 兼容旧前端传"英语"', isEnglishLanguage('英语') === true);

console.log('\n=== B3. sanitizeAssetPrompts 按书写系统跳过 ===');
const jpSample = 'Headline: 新生活の相棒 / Subline: 軽量で持ち運び便利 / Price: ¥12,990（税込）';
const krSample = 'Headline: 새로운 생활의 동반자 / Subline: 가볍고 휴대가 편리 / Price: ₩1,299,000';
const zhSample = '标题：新生活好伙伴 / 副标题：轻便易携带 / 价格：¥12,990';
const stripJp = sanitizeAssetPrompts({ imagePrompt: jpSample, negativePrompt: jpSample, videoPrompt: jpSample }, { market: '日本', language: '日语' });
check('B3 日本：日文原样保留', stripJp.imagePrompt === jpSample, stripJp.imagePrompt);
const stripKr = sanitizeAssetPrompts({ imagePrompt: krSample, negativePrompt: krSample, videoPrompt: krSample }, { market: '韩国', language: '韩语' });
check('B3 韩国：韩文原样保留', stripKr.imagePrompt === krSample, stripKr.imagePrompt);
const stripUs = sanitizeAssetPrompts({ imagePrompt: 'Headline: Everyday companion / Price: $979.86', negativePrompt: '', videoPrompt: '' }, { market: '美国', language: 'English' });
check('B3 美国：英文原样保留', stripUs.imagePrompt === 'Headline: Everyday companion / Price: $979.86', stripUs.imagePrompt);
const stripTh = sanitizeAssetPrompts({ imagePrompt: zhSample, negativePrompt: '', videoPrompt: '' }, { market: '泰国', language: '泰语' });
check('B3 泰国：中文被清洗', !/[\u4e00-\u9fff]/.test(stripTh.imagePrompt), stripTh.imagePrompt);
check('B3 旧行为：stripCjk 仍可单独调用', /Price: ¥12,990/.test(stripCjk(jpSample)) && !/新生活/.test(stripCjk(jpSample)));

console.log('\n=== B4. 负向词按市场组装 ===');
const negJa = buildHardNegativePrompt('日本');
const negKo = buildHardNegativePrompt('韩国');
const negUs = buildHardNegativePrompt('美国');
check('B4 日本不再禁假名', !negJa.includes('Japanese kana'), negJa.slice(0, 80));
check('B4 日本不再禁汉字/kanji', !negJa.includes('kanji') && !negJa.includes('Chinese characters') && !negJa.includes('CJK glyphs'));
check('B4 日本仍禁乱码/模糊', negJa.includes('gibberish text') && negJa.includes('blurry'));
check('B4 韩国不再禁谚文', !negKo.includes('Korean hangul') && !negKo.includes('CJK glyphs'));
check('B4 韩国仍禁假名', negKo.includes('Japanese kana'));
check('B4 美国保留中文与假名负向词', negUs.includes('Chinese characters') && negUs.includes('Japanese kana') && negUs.includes('Korean hangul'));
check('B4 旧导出 HARD_NEGATIVE_PROMPT 完整', HARD_NEGATIVE_PROMPT.includes('Japanese kana') && HARD_NEGATIVE_PROMPT.includes('CJK glyphs'));
check('B4 scriptKindOf', scriptKindOf('日本') === 'ja' && scriptKindOf('韩国') === 'ko' && scriptKindOf('美国') === 'other');

console.log('\n=== B5. 场景 cue 19 国 ===');
for (const country of COUNTRIES) {
  const cue = marketSceneCue(country.name);
  check(`B5 ${country.name} 有专属场景`, Boolean(cue) && cue !== NEUTRAL_SCENE && cue.length > 20, cue);
}
check('B5 德国是老城不是东南亚', /Altstadt|old town|Bavaria|Cologne|Berlin/i.test(marketSceneCue('德国')), marketSceneCue('德国'));
check('B5 日本是住宅街/便利店', /convenience|residential|station|suburban/i.test(marketSceneCue('日本')), marketSceneCue('日本'));
check('B5 美国与泰国场景不同', marketSceneCue('美国') !== marketSceneCue('泰国'));
check('B5 未知市场回退中性句', marketSceneCue('火星') === NEUTRAL_SCENE);
check('B5 sceneFor fallback 可用', Boolean(sceneFor('XX', 'north-america')) && sceneFor('XX', 'north-america') !== NEUTRAL_SCENE);

console.log('\n=== B6. #ad 不再要求出现在画面 ===');
const usRequired = byId.US.required.join('|');
const gbRequired = byId.GB.required.join('|');
check('B6 美国 required 无 #ad', !usRequired.includes('#ad'), usRequired);
check('B6 英国 required 无 #ad', !gbRequired.includes('#ad'), gbRequired);
const usBlock = buildMarketRuleBlock({ market: '美国' });
check('B6 美国规则块不把 #ad 当画面必含项', !/画面[^。；\n]{0,15}#ad/.test(usBlock), usBlock.match(/[^。；\n]{0,20}#ad[^。；\n]{0,10}/)?.[0] || '');
check('B6 #ad 说明落在文案/字幕层', /文案/.test(usBlock) && usBlock.includes('#ad'));
check('B6 美国仍有 FTC 披露提醒', byId.US.compliance.join('|').includes('FTC'));

console.log('\n=== C. 生图规则（按市场）===');
const jpRules = buildImageGenerationRules('日本');
const krRules = buildImageGenerationRules('韩国');
const usRules = buildImageGenerationRules('美国');
const deRules = buildImageGenerationRules('德国');
check('C 日本规则允许汉字假名', jpRules.includes('Japanese kanji and kana are expected'), '');
check('C 日本规则含 ja-JP', jpRules.includes('ja-JP'));
check('C 日本规则不出现 never English 矛盾句', jpRules.includes('never English'));
check('C 日本负向词不含 Japanese kana', !jpRules.includes('Negative prompt: ' ) || !/Negative prompt:[^\n]*Japanese kana/.test(jpRules));
check('C 韩国规则允许谚文', krRules.includes('Korean hangul is expected'));
check('C 美国规则禁中文并用英文语言名', usRules.includes('No Chinese characters') && usRules.includes('en-US'));
check('C 美国规则不出现 never English', !usRules.includes('never English'));
check('C 德国规则含德语', deRules.includes('de-DE'));
check('C 未知市场不出现碎片句', !buildImageGenerationRules('火星').includes('the target market language only'));

console.log('\n=== D. 注入块体积 ===');
let maxStandard = 0;
let maxCompact = 0;
let maxCountry = '';
for (const country of COUNTRIES) {
  const standard = estimateTokens(buildMarketRuleBlock({ market: country.name }));
  const compact = estimateTokens(buildMarketRuleBlock({ market: country.name, compact: true }));
  if (standard > maxStandard) { maxStandard = standard; maxCountry = country.name; }
  if (compact > maxCompact) maxCompact = compact;
  check(`D ${country.name} 标准块 ≤450 tokens`, standard <= 450, String(standard));
  check(`D ${country.name} compact 块 ≤350 tokens`, compact <= 350, String(compact));
}
console.log(`最大标准块：${maxStandard} tokens（${maxCountry}）；最大 compact：${maxCompact} tokens`);

console.log('\n=== E. 金额本地化 ===');
const samples = [
  ['美国', '$'],
  ['加拿大', 'C$'],
  ['巴西', 'R$'],
  ['日本', '¥'],
  ['德国', '€'],
  ['沙特阿拉伯', 'ر.س']
];
for (const [market, symbol] of samples) {
  const result = resolveCurrency({ market, sourceAmount: 7000 });
  check(`E ${market} 输出本地符号 ${symbol}`, String(result.displayAmount).includes(symbol), String(result.displayAmount));
  console.log(`   ${market}: ${result.displayAmount}`);
}
check('E 巴西千分位用点、小数用逗号', /^R\$[\d.]+,\d{2}$/.test(resolveCurrency({ market: '巴西', sourceAmount: 7000 }).displayAmount), resolveCurrency({ market: '巴西', sourceAmount: 7000 }).displayAmount);
check('E 德国格式 1.299,00 €', /^[\d.]+,\d{2} €$/.test(formatLocalAmount(1299, marketCurrency('德国'))), formatLocalAmount(1299, marketCurrency('德国')));
check('E 日元无小数', /^¥[\d,]+$/.test(formatLocalAmount(12990, marketCurrency('日本'))), formatLocalAmount(12990, marketCurrency('日本')));
check('E 里亚尔后缀格式', /^[\d,]+\.\d{2} ر\.س$/.test(formatLocalAmount(1299, marketCurrency('沙特阿拉伯'))), formatLocalAmount(1299, marketCurrency('沙特阿拉伯')));
check('E 韩元无小数且前缀', /^₩1,299,000$/.test(formatLocalAmount(1299000, marketCurrency('韩国'))), formatLocalAmount(1299000, marketCurrency('韩国')));

console.log('\n=== F. 文案 lint ===');
const lint = lintAdCopy('Best product ever, 100% guaranteed, No.1 choice', '美国');
check('F 绝对化用语被抓', lint.ok === false && lint.issues.some(i => i.code === 'absolute-claim'), JSON.stringify(lint.issues));
const lintZh = lintAdCopy('标题：超值好物', '美国');
check('F 美国市场中文被抓', lintZh.ok === false && lintZh.issues.some(i => i.code === 'lang-cjk'), JSON.stringify(lintZh.issues));
const lintKana = lintAdCopy('新生活の相棒', '美国');
check('F 美国市场假名被抓', lintKana.ok === false && lintKana.issues.some(i => i.code === 'lang-kana'), JSON.stringify(lintKana.issues));
const lintJp = lintAdCopy('新生活の相棒', '日本');
check('F 日本市场汉字假名放行', lintJp.ok === true, JSON.stringify(lintJp.issues));
const lintCurrency = lintAdCopy('Now only C$99.00', '德国');
check('F 货币错配被抓', lintCurrency.ok === false && lintCurrency.issues.some(i => i.code === 'currency-mismatch'), JSON.stringify(lintCurrency.issues));
const lintOk = lintAdCopy('Everyday companion for commuting', '美国');
check('F 正常文案通过', lintOk.ok === true, JSON.stringify(lintOk.issues));

console.log(`\n=== 结果：${pass} 通过，${failures.length} 失败 ===`);
if (failures.length) {
  console.log('\n失败清单：');
  failures.forEach(item => console.log(' - ' + item));
  process.exitCode = 1;
} else {
  console.log('全部断言通过 ✅');
}
