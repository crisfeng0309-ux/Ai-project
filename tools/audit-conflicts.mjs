// 冲突审计脚本：验证残留提示词逻辑与新市场补丁的相互作用
import { marketLanguageName, buildImageGenerationRules, HARD_NEGATIVE_PROMPT } from '../lib/image-prompt-rules.mjs';
import { stripCjk, sanitizeAssetPrompts } from '../lib/ai.mjs';
import { buildMarketRuleBlock } from '../lib/market-constraints.mjs';

const markets = ['美国', '日本', '韩国', '德国', '泰国', '新加坡'];

console.log('=== 1) 现有语言名解析（image-prompt-rules.mjs） ===');
for (const m of markets) console.log(`${m} -> ${marketLanguageName(m)}`);

console.log('\n=== 2) 英语市场判定 / 生成规则首两行 ===');
for (const m of ['美国', '英国', '澳大利亚', '新加坡']) {
  const r = buildImageGenerationRules(m);
  const first = r.split('\n\n').slice(0, 2).join(' | ');
  console.log(`[${m}] ${first.replace(/\s+/g, ' ').slice(0, 190)}`);
}

console.log('\n=== 3) 硬负向词是否封杀本地文字 ===');
for (const token of ['Japanese kana', 'Korean hangul', 'CJK glyphs', 'Chinese characters']) {
  console.log(`${token}: ${HARD_NEGATIVE_PROMPT.includes(token) ? '在 HARD_NEGATIVE_PROMPT 中' : '无'}`);
}

console.log('\n=== 4) stripCjk 对当地文案的破坏 ===');
const samples = {
  日本: 'Headline: 新生活の相棒 / Subline: 軽量で持ち運び便利 / Price: ¥12,990（税込）',
  韩国: 'Headline: 매일의 동반자 / Subline: 가볍고 편안한 착용감 / Price: ₩129,000',
  美国: 'Headline: Built for everyday / Price: $129.00',
  泰国: 'Headline: คู่หูทุกวัน / Price: ฿1,299'
};
for (const [m, s] of Object.entries(samples)) {
  console.log(`[${m}] ${JSON.stringify(stripCjk(s))}`);
}

console.log('\n=== 5) sanitizeAssetPrompts 端到端（模拟一次 assets 响应） ===');
const fake = { imagePrompt: samples.日本 + '\nNegative prompt: blurry', negativePrompt: 'Chinese characters, Japanese kana, blurry', schemes: [] };
console.log('日本（language=目标市场当地语言）->', JSON.stringify(sanitizeAssetPrompts(fake, { language: '目标市场当地语言' }).imagePrompt));
console.log('日本（language=日语）        ->', JSON.stringify(sanitizeAssetPrompts(fake, { language: '日语' }).imagePrompt));

console.log('\n=== 6) 补丁注入块（日本 / 美国）长度与前 3 行 ===');
for (const m of ['日本', '美国']) {
  const block = buildMarketRuleBlock({ market: m, platformIds: ['Amazon'] });
  console.log(`\n[${m}] chars=${block.length}`);
  console.log(block.split('\n').slice(0, 3).join('\n'));
}
