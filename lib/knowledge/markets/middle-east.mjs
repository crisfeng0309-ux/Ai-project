// 中东：沙特、阿联酋
export const REGION = {
  id: 'middle-east',
  name: '中东',
  order: 6,
  sharedRules: [
    '中东共通：画面文字用阿拉伯语（RTL 从右到左排版），可配英语副标；禁止把宗教符号、经文、清真寺当装饰元素，禁止饮酒与猪肉相关表达。',
    '中东共通：斋月（Ramadan）期间内容要调整——白天不出现进食饮水画面，促销改到开斋后与开斋节（Eid al-Fitr）。人物着装保守、家庭与身份感优先。'
  ],
  countries: {
    SA: {
      id: 'SA',
      name: '沙特阿拉伯',
      aliases: ['沙特', '沙特阿拉伯', 'Saudi Arabia', 'KSA', 'SA', '沙'],
      lang: { code: 'ar-SA', label: 'العربية (السعودية)', script: 'Arabic', dir: 'rtl' },
      extraLangs: [{ code: 'en', label: 'English', note: '可作副标，但主文案必须阿语' }],
      currency: { code: 'SAR', symbol: 'ر.س', position: 'suffix', decimals: 2, group: ',', decimal: '.', sample: '1,299.00 ر.س', tax: 'included', taxNote: '标价含 15% VAT' },
      date: 'DD/MM/YYYY（公历为主，节日可用回历标注）',
      units: 'metric（cm / kg / °C），服装用中东尺码',
      platforms: ['Noon', 'Amazon.sa', 'TikTok Shop', 'Snapchat', 'Meta Ads'],
      tone: '尊贵、家庭、身份感；克制、对称构图',
      rules: [
        '画面文字以阿拉伯语为主（RTL 排版：文字右对齐、图标与箭头方向镜像），英语只作副标。',
        '价格写法 1,299.00 ر.س 含 15% VAT；促销必须写清真/合规认证时要有真实证书编号。',
        '女性形象着装保守（头巾与否按品类与平台政策），避免暴露、舞蹈、亲密动作；音乐元素慎用。',
        '场景用利雅得/吉达的现代商场、家庭客厅（majlis）、沙漠与绿洲；斋月与开斋节是主促销节点，白色星期四/黑五次要。'
      ],
      banClaims: ['暗示宗教义务或宗教背书', '无依据最高级', '未认证却宣称 حلال', '夸大功效'],
      banVisual: ['宗教符号、经文、清真寺装饰化', '饮酒与猪肉', '暴露或亲密场景', '可识别真人肖像'],
      required: ['阿语文案', '含 VAT 标价', 'SASO 认证（适用类目）', 'SFDA 注册（食品/化妆品/器械）'],
      compliance: ['GAMR 广告内容审查', 'SASO 认证', 'SFDA（食品/药品/化妆品）', 'VAT 15%'],
      festival: ['Ramadan', 'Eid al-Fitr', 'Eid al-Adha', 'Founding Day', 'White Friday'],
      confidence: 'A'
    },
    AE: {
      id: 'AE',
      name: '阿联酋',
      aliases: ['阿联酋', '阿联酋联合酋长国', 'UAE', 'United Arab Emirates', 'Dubai', 'AE', '迪拜'],
      lang: { code: 'ar-AE', label: 'العربية (الإمارات)', script: 'Arabic', dir: 'rtl' },
      extraLangs: [{ code: 'en-AE', label: 'English', note: '迪拜/阿布扎比英语接受度高，可阿英双语并列' }],
      currency: { code: 'AED', symbol: 'د.إ', position: 'suffix', decimals: 2, group: ',', decimal: '.', sample: '1,299.00 د.إ', tax: 'included', taxNote: '标价含 5% VAT' },
      date: 'DD/MM/YYYY',
      units: 'metric（cm / kg / °C）',
      platforms: ['Noon', 'Amazon.ae', 'TikTok Shop', 'Meta Ads', 'Google Ads'],
      tone: '奢华、现代、国际化；阿英双语并置',
      rules: [
        '阿语（RTL）与英语双语并列，阿语在视觉上不弱于英语；纯英语版式只在明确面向外籍人群时使用。',
        '价格写法 1,299.00 د.إ 含 5% VAT；奢侈品可强调工艺与材质，但不得虚构产地与认证。',
        '人物着装与沙特同标准偏保守（海滩/泳装类目除外，且需符合平台政策）；斋月期间同样调整投放节奏。',
        '场景用迪拜码头、阿布扎比海滨、购物中心（mall）、沙漠营地；节日用斋月/开斋节、迪拜购物节（DSF）。'
      ],
      banClaims: ['暗示宗教背书', '无依据最高级', '未认证却标 حلال', '虚假折扣'],
      banVisual: ['宗教符号装饰化', '饮酒画面（无许可）', '暴露场景', '可识别真人肖像'],
      required: ['阿语或阿英双语', '含 VAT 标价', 'ESMA 认证（适用类目）'],
      compliance: ['NMC 媒体内容标准', 'ESMA 认证', 'VAT 5%'],
      festival: ['Ramadan', 'Eid al-Fitr', 'Dubai Shopping Festival', 'National Day'],
      confidence: 'B'
    }
  }
};
