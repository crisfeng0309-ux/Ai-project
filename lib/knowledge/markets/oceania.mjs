// 大洋洲
export const REGION = {
  id: 'oceania',
  name: '大洋洲',
  order: 3,
  sharedRules: [
    '大洋洲共通：英语（en-AU）拼写与用词按澳洲习惯（organise、colour、mobile、thongs 等），不要用美式拼写。',
    '大洋洲共通：原住民（Aboriginal / Torres Strait Islander）艺术、图案、人名、圣地意象未经授权一律不得使用，也不得把原住民形象商品化。'
  ],
  countries: {
    AU: {
      id: 'AU',
      name: '澳大利亚',
      aliases: ['澳大利亚', '澳洲', 'Australia', 'AU', '澳'],
      lang: { code: 'en-AU', label: 'English (Australia)', script: 'Latin', dir: 'ltr' },
      extraLangs: [],
      currency: { code: 'AUD', symbol: 'A$', position: 'prefix', decimals: 2, group: ',', decimal: '.', sample: 'A$1,299.00', tax: 'included', taxNote: '面向消费者的标价含 GST（10%）' },
      date: 'DD/MM/YYYY',
      units: 'metric（cm / kg / °C），服装鞋码用 AU/UK 码',
      platforms: ['Amazon.com.au', 'eBay Australia', 'Shopify', 'TikTok Shop', 'Meta Ads'],
      tone: '轻松、真实、生活方式；反过度推销，偏爱幽默与自嘲',
      rules: [
        '画面文字一律用澳式英语（en-AU）：organise / colour / mobile / ute，禁止美式拼写与美式俚语。',
        '价格写法 A$1,299.00 且含 GST；如果写不含税或「+ GST」必须说明。',
        '日期 DD/MM/YYYY；度量公制；季节与北半球相反（12 月是夏天），节日场景写圣诞海滩/夏季户外。',
        '场景用海滩、后院烧烤（barbie）、国家公园、咖啡馆；人物用自然光真实感，不要过度精修。'
      ],
      banClaims: ['无依据的 best / No.1', '「free」用于有附加条件的商品', '误导性价格比较', '夸大环保宣称'],
      banVisual: ['原住民艺术元素与图案', '原住民人物商品化', '可识别真人肖像'],
      required: ['含 GST 标价', '促销价须有真实原价', '中奖/赠品条件写清'],
      compliance: ['ACCC / 澳洲消费者法（ACL）', 'GST 标示', 'ICIP 原住民文化知识产权原则'],
      festival: ['Christmas（夏季）', 'Australia Day', 'Boxing Day', 'Click Frenzy'],
      confidence: 'A'
    }
  }
};
