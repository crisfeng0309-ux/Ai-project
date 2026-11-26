// 东南亚：越南、泰国、印度尼西亚、马来西亚、新加坡（沿用现有 9 国规则的写法，补齐结构化字段）
export const REGION = {
  id: 'southeast-asia',
  name: '东南亚',
  order: 8,
  sharedRules: [
    '东南亚共通：画面文字使用当地语言；英语/中文只能作副标。多语市场（新马）可双语并列，但不要在同一句里混排两种语言。',
    '东南亚共通：价格必须含当地税（泰 7% VAT、印尼 11% PPN、越南 10% VAT、马来西亚 SST、新加坡 9% GST），货币符号按当地写法。'
  ],
  countries: {
    VN: {
      id: 'VN',
      name: '越南',
      aliases: ['越南', 'Vietnam', 'Viet Nam', 'VN', '越'],
      lang: { code: 'vi-VN', label: 'Tiếng Việt', script: 'Latin', dir: 'ltr' },
      extraLangs: [],
      currency: { code: 'VND', symbol: '₫', position: 'suffix', decimals: 0, group: '.', decimal: ',', sample: '1.299.000 ₫', tax: 'included', taxNote: '标价含 10% VAT' },
      date: 'DD/MM/YYYY',
      units: 'metric（cm / kg / °C）',
      platforms: ['Shopee', 'Lazada', 'TikTok Shop', 'Tiki'],
      tone: '热闹、促销感强、价格敏感；对比色与大字报风格接受度高',
      rules: [
        '画面文字一律用越南语（vi-VN，含声调符号），不要用中文；英文只作品牌名。',
        '价格写法 1.299.000 ₫（千分位「.」、符号后置、无小数），含 VAT；促销写「GIẢM 30%」并标期限。',
        '日期 DD/MM/YYYY；度量公制；场景用胡志明市/河内街区、摩托车通勤、家庭聚餐、雨季。',
        '广告内容受《广告法》约束：不得贬低同类产品，比较须有依据；食品与化妆品功效不得夸大。'
      ],
      banClaims: ['nhất / số 1 等无依据最高级', '虚假原价', '未认证的医疗功效', '贬低竞品'],
      banVisual: ['可识别真人肖像（无授权）', '国旗作促销装饰', '宗教符号作装饰'],
      required: ['越南语文案', '含 VAT 标价', '食品需 ATTP 备案（适用）'],
      compliance: ['Luật Quảng cáo（广告法 2012）', 'Nghị định 181/2013', 'ATTP 食品安全'],
      festival: ['Tết Nguyên Đán', 'Black Friday', '11/11', 'Trung Thu'],
      confidence: 'B'
    },
    TH: {
      id: 'TH',
      name: '泰国',
      aliases: ['泰国', 'Thailand', 'TH', '泰'],
      lang: { code: 'th-TH', label: 'ภาษาไทย', script: 'Thai', dir: 'ltr' },
      extraLangs: [],
      currency: { code: 'THB', symbol: '฿', position: 'prefix', decimals: 0, group: ',', decimal: '.', sample: '฿1,299', tax: 'included', taxNote: '标价含 7% VAT' },
      date: 'DD/MM/YYYY',
      units: 'metric（cm / kg / °C）',
      platforms: ['Shopee', 'Lazada', 'TikTok Shop', 'LINE Shopping'],
      tone: '轻松、幽默、色彩饱和；喜欢"สวย/คุ้ม"（好看/划算）表达',
      rules: [
        '画面文字一律用泰语（th-TH，含声调符号），不要用中文；英文只作品牌名或副标。',
        '价格写法 ฿1,299（符号前置、无小数），含 7% VAT；促销写「ลด 30%」并标期限。',
        '日期 DD/MM/YYYY；度量公制；场景用曼谷商圈、街边摊、寺庙外观（仅作背景，不作装饰）、泼水节。',
        '**王室意象绝对禁止**：国王、王室成员、王室徽记、以佛像/僧侣作为装饰元素一律不得出现；烟草与酒精广告受限。'
      ],
      banClaims: ['ที่สุด / อันดับ 1 等无依据最高级', '虚假原价与假折扣', '未认证的医疗功效', '贬低竞品'],
      banVisual: ['王室任何影射（严重违法）', '佛像与僧侣作装饰', '可识别真人肖像（无授权）'],
      required: ['泰语文案', '含 VAT 标价', '食品/化妆品需 อย. 备案（适用）'],
      compliance: ['พ.ร.บ.คุ้มครองผู้บริโภค（消费者保护法）', 'Thai FDA（อย.）', '王室相关刑法条款'],
      festival: ['สงกรานต์（泼水节）', 'ลอยกระทง', '11.11', 'Black Friday'],
      confidence: 'A'
    },
    ID: {
      id: 'ID',
      name: '印度尼西亚',
      aliases: ['印尼', '印度尼西亚', 'Indonesia', 'ID', '印尼西亚'],
      lang: { code: 'id-ID', label: 'Bahasa Indonesia', script: 'Latin', dir: 'ltr' },
      extraLangs: [],
      currency: { code: 'IDR', symbol: 'Rp', position: 'prefix', decimals: 0, group: '.', decimal: ',', sample: 'Rp1.299.000', tax: 'included', taxNote: '标价含 11% PPN' },
      date: 'DD/MM/YYYY',
      units: 'metric（cm / kg / °C）',
      platforms: ['Shopee', 'Tokopedia', 'Lazada', 'TikTok Shop'],
      tone: '亲切、家庭感、穆斯林友好；喜欢"hemat"（省）、"berkualitas"（品质）',
      rules: [
        '画面文字一律用印尼语（id-ID），不要用中文；英文只作品牌名。',
        '价格写法 Rp1.299.000（符号前置、千分位「.」、无小数），含 11% PPN；促销写「Diskon 30%」并标期限。',
        '日期 DD/MM/YYYY；度量公制；场景用雅加达/泗水街区、家庭、开斋节（Lebaran）、传统服饰（batik）可作文化元素。',
        '**伊斯兰合规**：食品/化妆品/保健品宣称「halal」必须有 BPJPH 清真认证；不得出现猪肉、酒精画面；斋月期间白天不出现进食画面。'
      ],
      banClaims: ['nomor 1 / terbaik 等无依据最高级', '未认证却标 halal', '虚假原价', '未认证医疗功效'],
      banVisual: ['宗教符号装饰化（非清真寺场景）', '饮酒与猪肉', '可识别真人肖像（无授权）'],
      required: ['印尼语文案', '含 PPN 标价', 'BPJPH halal 认证（适用类目）', 'BPOM 备案（食品/化妆品/药品）'],
      compliance: ['UU Perlindungan Konsumen', 'BPJPH halal 认证（2019 年第 33 号法）', 'BPOM', 'Kominfo 广告内容规范'],
      festival: ['Lebaran', 'Ramadan', 'Kemerdekaan', '11.11 / 12.12（Harbolnas）'],
      confidence: 'A'
    },
    MY: {
      id: 'MY',
      name: '马来西亚',
      aliases: ['马来西亚', '大马', 'Malaysia', 'MY', '马来'],
      lang: { code: 'ms-MY', label: 'Bahasa Melayu', script: 'Latin', dir: 'ltr' },
      extraLangs: [{ code: 'en-MY', label: 'English', note: '英语接受度很高，可马英双语并列；华人市场可加中文但不要与马来语混排' }],
      currency: { code: 'MYR', symbol: 'RM', position: 'prefix', decimals: 2, group: ',', decimal: '.', sample: 'RM1,299.00', tax: 'included', taxNote: '标价含 SST（销售税）；服务另计' },
      date: 'DD/MM/YYYY',
      units: 'metric（cm / kg / °C）',
      platforms: ['Shopee', 'Lazada', 'TikTok Shop', 'Zalora'],
      tone: '多元文化、温和；马来语与英语并列，华人市场可用中文版单独投放',
      rules: [
        '主文案用马来语（ms-MY）或马来语+英语双语；华人市场可单独出中文版，但不要三种语言混排在同一画面。',
        '价格写法 RM1,299.00（符号前置、两位小数），含 SST；促销写「Jualan 30%」并标期限。',
        '日期 DD/MM/YYYY；度量公制；场景用吉隆坡双子塔、多元族群家庭、斋月市集（bazar Ramadan）、华人新年。',
        '**多元宗教敏感**：伊斯兰（halal 需 JAKIM 认证）、佛教、印度教、基督教元素都要避免调侃与装饰化；酒类广告受限。'
      ],
      banClaims: ['no.1 / terbaik 无依据最高级', '未认证却标 halal', '虚假原价', '未认证医疗功效'],
      banVisual: ['宗教符号装饰化', '饮酒画面（无许可）', '可识别真人肖像（无授权）'],
      required: ['马来语或双语', '含 SST 标价', 'JAKIM halal 认证（适用类目）'],
      compliance: ['Malaysian Communications and Multimedia Act', 'JAKIM halal', 'SST'],
      festival: ['Hari Raya', 'Chinese New Year', 'Deepavali', '11.11 / 12.12'],
      confidence: 'A'
    },
    SG: {
      id: 'SG',
      name: '新加坡',
      aliases: ['新加坡', 'Singapore', 'SG', '新', '狮城'],
      lang: { code: 'en-SG', label: 'English (Singapore)', script: 'Latin', dir: 'ltr' },
      extraLangs: [{ code: 'zh-SG', label: '华语', note: '华人市场可用简体中文版' }, { code: 'ms-SG', label: 'Bahasa Melayu' }],
      currency: { code: 'SGD', symbol: 'S$', position: 'prefix', decimals: 2, group: ',', decimal: '.', sample: 'S$1,299.00', tax: 'included', taxNote: '标价含 9% GST' },
      date: 'DD/MM/YYYY',
      units: 'metric（cm / kg / °C）',
      platforms: ['Shopee', 'Lazada', 'Amazon.sg', 'TikTok Shop', 'Meta Ads'],
      tone: '干净、效率、国际化；英文为主，简洁可信',
      rules: [
        '主文案用新加坡英语（en-SG），可出简体中文版给华人市场；同一张图不要中英混排。',
        '价格写法 S$1,299.00（符号前置、两位小数），含 9% GST；促销写明期限与条件。',
        '日期 DD/MM/YYYY；度量公制；场景用组屋（HDB）、滨海湾、熟食中心（hawker）、多元族群节日。',
        '族群与宗教（华/马来/印度/欧亚）平等呈现，不得刻板化；赌博与酒类广告受严格限制。'
      ],
      banClaims: ['无依据的 best / No.1', '虚假原价与假折扣', '未认证医疗功效', '误导性环保宣称'],
      banVisual: ['宗教符号装饰化', '赌博相关画面', '可识别真人肖像（无授权）'],
      required: ['英文或中文版文案', '含 GST 标价', '食品需 SFA 许可（适用）'],
      compliance: ['Singapore Code of Advertising Practice (SCAP)', 'SFA 食品法规', 'GST 9%'],
      festival: ['Chinese New Year', 'Hari Raya Puasa', 'Deepavali', '11.11 / 12.12'],
      confidence: 'A'
    }
  }
};
