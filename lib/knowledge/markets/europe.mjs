// 欧洲：德国、法国、英国、西班牙（英国用 CAP/UKCA，德法西用 EU 规则，差异写在 country 级）
export const REGION = {
  id: 'europe',
  name: '欧洲',
  order: 4,
  sharedRules: [
    '欧洲共通：面向消费者的标价必须含 VAT，且必须给单位价格（€/kg、€/l）；价格参照价须为促销前一段时间的真实最低价。',
    '欧洲共通：禁止无依据的最高级与比较（best / n°1 / 最好），环保与可持续宣称必须可举证；日期 DD/MM/YYYY，度量公制。'
  ],
  countries: {
    DE: {
      id: 'DE',
      name: '德国',
      aliases: ['德国', 'Germany', 'Deutschland', 'DE', '德'],
      lang: { code: 'de-DE', label: 'Deutsch', script: 'Latin', dir: 'ltr' },
      extraLangs: [],
      currency: { code: 'EUR', symbol: '€', position: 'suffix', decimals: 2, group: '.', decimal: ',', sample: '1.299,00 €', tax: 'included', taxNote: '标价含 19% VAT' },
      date: 'DD.MM.YYYY',
      units: 'metric（cm / kg / °C），服装用 EU 码',
      platforms: ['Amazon.de', 'Otto', 'Kaufland', 'Shopify', 'TikTok Shop'],
      tone: '理性、证据优先、克制；用参数、认证和实测数据说话',
      rules: [
        '画面文字一律用德语（de-DE），含 ä ö ü ß；禁止英语标语混排（德语区对英语广告接受度低）。',
        '价格写法 1.299,00 €（符号后置、千分位「.」、小数点「,」），必须含 VAT 并给 €/kg 或 €/l 单位价。',
        '日期 DD.MM.YYYY；度量公制；形式用 Sie 敬称（消费广告可 du，但同一张图必须统一）。',
        '场景用德式住宅、森林徒步、圣诞市场、自行车通勤；强调 TÜV/CE/GPSR/EPR 等可核验认证，不要空喊环保。'
      ],
      banClaims: ['beste / billigste / Nr.1 等无依据最高级', 'klimaneutral 等未经认证的环保宣称', '虚构原价与「statt」假折扣', '治愈类健康宣称'],
      banVisual: ['纳粹与极右符号（刑事犯罪）', '可识别真人肖像', '国旗作装饰'],
      required: ['含 VAT 标价 + 单位价格', 'GPSR 合规信息（如适用）', 'CE 标识', 'EPR 注册号（如适用）'],
      compliance: ['UWG（反不正当竞争法）', 'PAngV（价格标示条例）', 'GPSR（2024-12-13 起）', 'EPR / 包装法', 'CE'],
      festival: ['Weihnachtsmarkt', 'Oktoberfest', 'Black Friday', 'Advent'],
      confidence: 'A'
    },
    FR: {
      id: 'FR',
      name: '法国',
      aliases: ['法国', 'France', 'FR', '法'],
      lang: { code: 'fr-FR', label: 'Français', script: 'Latin', dir: 'ltr' },
      extraLangs: [],
      currency: { code: 'EUR', symbol: '€', position: 'suffix', decimals: 2, group: ' ', decimal: ',', sample: '1 299,00 €', tax: 'included', taxNote: '标价含 20% VAT' },
      date: 'DD/MM/YYYY',
      units: 'metric（cm / kg / °C），服装用 EU/FR 码',
      platforms: ['Amazon.fr', 'Cdiscount', 'Shopify', 'TikTok Shop'],
      tone: '优雅、质感、生活艺术；克制不夸张',
      rules: [
        '画面文字一律用法语（fr-FR），含 é è à ç；Loi Toubon 要求面向消费者的广告有法语表述，禁止全英语版式。',
        '价格写法 1 299,00 €（符号后置、千分位可用空格、小数点「,」），含 VAT；折扣写「-30 %」并给参考价。',
        '日期 DD/MM/YYYY；度量公制；称呼用 vous（消费广告可用 tu，但同一张图统一）。',
        '场景用巴黎/里昂街区、咖啡馆、市集、家居生活；避免把宗教符号放进画面（laïcité 世俗原则）。'
      ],
      banClaims: ['meilleur / n°1 等无依据最高级', '虚构参考价与假折扣', '治愈类健康宣称', '未标注的网红推广'],
      banVisual: ['宗教符号作装饰', '可识别真人肖像', '国旗作装饰'],
      required: ['法语表述', '含 VAT 标价', '付费推广标 Publicité / Collaboration commerciale', '促销参考价为前 30 天最低价'],
      compliance: ['Loi Toubon（法语强制）', '2023 网红法（标注广告）', 'DGCCRF 价格规则', 'GPSR / EPR'],
      festival: ['Soldes', 'Noël', 'Black Friday', 'Fête nationale'],
      confidence: 'A'
    },
    GB: {
      id: 'GB',
      name: '英国',
      aliases: ['英国', 'UK', 'United Kingdom', 'Great Britain', 'GB', '英'],
      lang: { code: 'en-GB', label: 'English (UK)', script: 'Latin', dir: 'ltr' },
      extraLangs: [],
      currency: { code: 'GBP', symbol: '£', position: 'prefix', decimals: 2, group: ',', decimal: '.', sample: '£1,299.00', tax: 'included', taxNote: '面向消费者的标价含 VAT（20%）' },
      date: 'DD/MM/YYYY',
      units: 'metric 为主（cm / kg / °C），部分场景用英制（mile、pint）',
      platforms: ['Amazon.co.uk', 'eBay UK', 'Shopify', 'TikTok Shop', 'Meta Ads'],
      tone: '编辑感、幽默、轻口吻；反硬推销',
      rules: [
        '画面文字一律用英式英语（en-GB）：colour / organise / mobile / £；禁止美式拼写（color、organize）。',
        '价格写法 £1,299.00 且含 VAT；写「was £X, now £Y」时 X 必须是过去真实售价。',
        '日期 DD/MM/YYYY；度量公制为主；场景用伦敦/曼彻斯特街区、pub、花园、雨天通勤。',
        '广告必须一眼可辨是广告（尤其网红内容），不要伪装成自然分享。'
      ],
      banClaims: ['无依据的 best / No.1', '「free」用于有附加条件的赠品', '虚构 was/now 原价', '夸大健康与减肥效果'],
      banVisual: ['可识别真人肖像', '暗示王室背书', '国旗作装饰'],
      required: ['含 VAT 标价', '价格参照须真实'],
      compliance: ['CAP Code（广告规范）', 'DMCCA 2024（消费者保护）', 'UKCA 标识（适用类目）', 'VAT', '付费推广披露 #ad / Paid partnership（文案层，不写进画面）'],
      festival: ['Boxing Day', 'Christmas', 'Black Friday', 'Back to School'],
      confidence: 'A'
    },
    ES: {
      id: 'ES',
      name: '西班牙',
      aliases: ['西班牙', 'Spain', 'España', 'ES', '西'],
      lang: { code: 'es-ES', label: 'Español (España)', script: 'Latin', dir: 'ltr' },
      extraLangs: [],
      currency: { code: 'EUR', symbol: '€', position: 'suffix', decimals: 2, group: '.', decimal: ',', sample: '1.299,00 €', tax: 'included', taxNote: '标价含 21% IVA' },
      date: 'DD/MM/YYYY',
      units: 'metric（cm / kg / °C），服装用 EU/ES 码',
      platforms: ['Amazon.es', 'El Corte Inglés', 'Shopify', 'TikTok Shop'],
      tone: '热情、家庭场景、节日感；比拉美西语更克制',
      rules: [
        '画面文字一律用西班牙本土西语（es-ES）：用 «móvil»、«ordenador»，禁止拉美用词（celular、computadora）。',
        '价格写法 1.299,00 €（符号后置、千分位「.」、小数点「,」），含 IVA 并给单位价格。',
        '日期 DD/MM/YYYY；度量公制；称呼用 usted 或 tú，同一张图统一。',
        '场景用马德里/巴塞罗那街区、家庭聚餐、海滩、圣诞彩票季；不要把加泰罗尼亚/巴斯克旗帜当装饰。'
      ],
      banClaims: ['el mejor / número 1 等无依据最高级', '虚构原价与假折扣', '治愈类健康宣称'],
      banVisual: ['宗教符号作装饰', '可识别真人肖像', '地区政治旗帜'],
      required: ['含 VAT 标价 + 单位价格', '促销参考价真实', '付费推广可识别'],
      compliance: ['Ley 3/1991 不正当竞争与广告', 'UCPD（欧盟不公平商业行为指令）', 'GPSR / EPR'],
      festival: ['Navidad', 'Reyes Magos', 'Semana Santa', 'Black Friday'],
      confidence: 'B'
    }
  }
};
