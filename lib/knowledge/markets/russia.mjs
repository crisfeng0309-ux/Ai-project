// 俄语区（用户分类：俄罗斯单独一组）
export const REGION = {
  id: 'russia',
  name: '俄语区',
  order: 5,
  sharedRules: [
    '俄语区共通：画面文字必须用俄语（ru-RU）西里尔字母，禁止英语标语混排；价格与参数要直白可核，讨厌含糊修辞。',
    '俄语区共通：法律禁止无依据的最高级（самый лучший、№1），也禁止未获认证的医疗与保健功效。'
  ],
  countries: {
    RU: {
      id: 'RU',
      name: '俄罗斯',
      aliases: ['俄罗斯', 'Russia', 'Russian Federation', 'RU', '俄'],
      lang: { code: 'ru-RU', label: 'Русский', script: 'Cyrillic', dir: 'ltr' },
      extraLangs: [],
      currency: { code: 'RUB', symbol: '₽', position: 'suffix', decimals: 2, group: ' ', decimal: ',', sample: '12 990,00 ₽', tax: 'included', taxNote: '面向消费者的标价含 VAT' },
      date: 'DD.MM.YYYY',
      units: 'metric（cm / kg / °C），服装用 RU/EU 码',
      platforms: ['Ozon', 'Wildberries', 'Yandex Market', 'VK'],
      tone: '直接、实用主义、参数与价格对比；少情绪、多事实',
      rules: [
        '画面文字一律用俄语西里尔字母，禁止拉丁字母标语混排；品牌名可保留原文，但不能整句英文。',
        '价格写法 12 990,00 ₽（符号后置、千分位空格、小数点「,」）；对比价要用真实原价并标折扣力度。',
        '日期 DD.MM.YYYY；度量公制；场景用莫斯科/圣彼得堡的街区、地铁、冬季雪景、乡间别墅（дача）。',
        '强调耐用、参数、认证（EAC）与售后，不要用美式夸张表达或空泛的「生活方式」叙事。'
      ],
      banClaims: ['самый лучший / №1 等无依据最高级', '未获认证的医疗与保健功效', '虚构原价与假折扣'],
      banVisual: ['政治符号与政党旗帜', '可识别真人肖像', '宗教符号作装饰'],
      required: ['俄语文案', '含 VAT 标价', 'EAC 认证（适用类目）'],
      compliance: ['38-ФЗ《广告法》', 'EAC 认证', '个人数据本地化（如涉及用户数据）'],
      festival: ['Новый год', '8 марта', '23 февраля', 'Чёрная пятница'],
      confidence: 'A'
    }
  }
};
