// 北美：美国 + 加拿大（两国高度相近，共用同一套基础约束，只用 country 级规则做差异覆盖）
export const REGION = {
  id: 'north-america',
  name: '北美',
  order: 1,
  // 注入时先放 region.sharedRules，再放 country.rules；只注入用户选中的国家，不注入其他国家。
  sharedRules: [
    '北美共通：英语为主，允许多元族裔真实人物（须为合成/授权形象，不得用可识别真人）；节日以黑五、圣诞、返校季为主，避免把国旗、政党符号当装饰。',
    '北美共通：价格必须可回溯（原价/折扣有真实依据），禁止虚构 was/now 与倒计时；付费推广的 #ad / Paid partnership 披露放在文案、标题或字幕层，商品画面本身不加任何标注字。'
  ],
  countries: {
    US: {
      id: 'US',
      name: '美国',
      aliases: ['美国', '美利坚', 'United States', 'USA', 'US', 'America'],
      lang: { code: 'en-US', label: 'English (US)', script: 'Latin', dir: 'ltr' },
      extraLangs: [],
      currency: { code: 'USD', symbol: '$', position: 'prefix', decimals: 2, group: ',', decimal: '.', sample: '$1,299.00', tax: 'excluded', taxNote: '标价不含销售税（各州不同，落地页需说明）' },
      date: 'MM/DD/YYYY',
      units: 'imperial（inch / lb / oz / °F），参数可附公制',
      platforms: ['Amazon', 'Walmart', 'eBay', 'Shopify', 'TikTok Shop', 'Meta Ads', 'Google Ads'],
      tone: '直接、利益点前置、数字说话、对比强',
      rules: [
        '画面文字一律用英语（en-US）原文，禁止出现中文/日文/韩文/拼音。',
        '价格写法 $1,299.00：美元前缀、千分位逗号、两位小数；标价不含税，文案提价格时写「$1,299.00 + tax」或只写数字。',
        '度量用英寸/磅/盎司/华氏度，服装鞋码用 US 码；日期 MM/DD/YYYY。',
        '户外/通勤场景用美式街区、独栋住宅、pickup truck、校园等可辨识场景，不要用亚洲街景。'
      ],
      banClaims: ['治愈、治疗、预防疾病', 'FDA approved 等滥用监管背书', '虚构原价 was/now', '无依据的 No.1 / Best / Guaranteed', '虚假评论、评分、销量'],
      banVisual: ['可识别真人肖像与明星', '国旗、政党、宗教符号作装饰', '竞品商标与包装'],
      required: ['促销价须有真实历史原价', '投放加州时确认 Prop 65 警示'],
      compliance: ['FTC 代言披露（文案层 #ad / Paid partnership，不写进画面）', 'FTC 2024 虚假评论规则', 'Prop 65（加州）', 'FDA / FCC 类目资质'],
      festival: ['Black Friday', 'Christmas', 'Back to School', 'Thanksgiving', 'Prime Day'],
      confidence: 'A'
    },
    CA: {
      id: 'CA',
      name: '加拿大',
      aliases: ['加拿大', 'Canada', 'CA', '加国'],
      lang: { code: 'en-CA', label: 'English (Canada)', script: 'Latin', dir: 'ltr' },
      extraLangs: [{ code: 'fr-CA', label: 'Français (Canada)', note: '魁北克投放必须法语，或英法双语且法语不弱于英语' }],
      currency: { code: 'CAD', symbol: 'C$', position: 'prefix', decimals: 2, group: ',', decimal: '.', sample: 'C$1,299.00', tax: 'excluded', taxNote: '标价不含 GST/HST（结账另加，各省税率不同）' },
      date: 'DD/MM/YYYY（英法混用时统一写 2026-11-26 最稳）',
      units: 'metric 为主（cm / kg / °C），可附英制',
      platforms: ['Amazon.ca', 'Walmart.ca', 'Shopify', 'TikTok Shop', 'Meta Ads', 'Google Ads'],
      tone: '务实、克制、可信；幽默感可用但别夸张',
      rules: [
        '英语（en-CA）为主；投魁北克必须法语（fr-CA），或英法双语且法语视觉权重不低于英语。',
        '价格写法 C$1,299.00，标价不含 GST/HST；不要写成美国 $。',
        '度量以公制为主（cm / kg / °C），服装鞋码同时给 CA/US 两套更稳。',
        '季节与场景对齐加拿大：冬季雪景/室内取暖、秋季枫叶、夏季户外；不要出现美国南部或热带场景。'
      ],
      banClaims: ['治愈、治疗类功效', '无依据的 best / guaranteed', '虚构原价'],
      banVisual: ['可识别真人肖像', '原住民艺术元素未经授权使用', '国旗作装饰'],
      required: ['魁北克法语或双语', '促销价须有真实原价', '价格含税情况在落地页说明'],
      compliance: ['Competition Act（禁止实质性虚假或误导陈述）', '魁北克法语宪章', 'Health Canada（健康类目）'],
      festival: ['Black Friday', 'Boxing Day', 'Christmas', 'Thanksgiving（10 月）'],
      confidence: 'A'
    }
  }
};
