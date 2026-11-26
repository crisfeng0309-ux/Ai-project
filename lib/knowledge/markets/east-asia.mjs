// 东亚：韩国、日本
export const REGION = {
  id: 'east-asia',
  name: '东亚',
  order: 7,
  sharedRules: [
    '东亚共通：画面文字必须使用当地语言与文字（韩文谚文 / 日文汉字假名），禁止只用英语或中文；中文简体字不可出现在面向日韩消费者的画面里。',
    '东亚共通：广告法规严格限制最高级与比较（韩国「최고/1위」、日本「No.1/最高」需有客观依据或调查出处），也禁止夸大功效。'
  ],
  countries: {
    KR: {
      id: 'KR',
      name: '韩国',
      aliases: ['韩国', 'South Korea', 'Korea', 'KR', '韩'],
      lang: { code: 'ko-KR', label: '한국어', script: 'Hangul', dir: 'ltr' },
      extraLangs: [],
      currency: { code: 'KRW', symbol: '₩', position: 'prefix', decimals: 0, group: ',', decimal: '.', sample: '₩1,299,000', tax: 'included', taxNote: '面向消费者的标价含 VAT（10%）' },
      date: 'YYYY.MM.DD',
      units: 'metric（cm / kg / °C），服装用 KR 码（44/55/66）',
      platforms: ['Coupang', 'Naver Shopping', '11st', 'TikTok Shop', 'Kakao'],
      tone: '精致、干净、细节特写；强调质感与"成分/材质/认证"',
      rules: [
        '画面文字一律用韩文谚文（ko-KR），可少量配英文品牌名，但主文案必须韩文；不要用中文和日文。',
        '价格写法 ₩1,299,000（符号前置、无小数、千分位「,」），含 VAT；折扣写「30% 할인」并标注原价与活动期。',
        '日期 YYYY.MM.DD；度量公制；场景用首尔街区、公寓生活、咖啡店、汉江、雪岳山；人物精致但自然。',
        '强调认证与成分（KC 认证、식약처 许可、성분 표시），对比与最高级必须有出处。'
      ],
      banClaims: ['최고 / 1위 / 최저가 等无依据最高级', '虚构原价与「반값」假折扣', '허위·과장 광고（虚假夸大）', '未认证的功效'],
      banVisual: ['可识别真人肖像（无授权）', '国旗作装饰', '日军与殖民相关符号'],
      required: ['韩文文案', '含 VAT 标价', 'KC 安全认证（适用类目）', '食品/化妆品需 식약처 许可或备案'],
      compliance: ['표시·광고의 공정화에 관한 법률（标示广告公正化法）', 'KC 认证', '식품표시광고법'],
      festival: ['설날', '추석', '블랙프라이데이', '빼빼로데이'],
      confidence: 'A'
    },
    JP: {
      id: 'JP',
      name: '日本',
      aliases: ['日本', 'Japan', 'JP', '日'],
      lang: { code: 'ja-JP', label: '日本語', script: 'Japanese', dir: 'ltr' },
      extraLangs: [],
      currency: { code: 'JPY', symbol: '¥', position: 'prefix', decimals: 0, group: ',', decimal: '.', sample: '¥12,990（税込）', tax: 'included', taxNote: '标价须标明「税込」；总价标示义务' },
      date: 'YYYY年MM月DD日',
      units: 'metric（cm / kg / °C），服装用 JP 码（S/M/L 或号数）',
      platforms: ['Amazon.co.jp', '楽天', 'Yahoo!ショッピング', 'TikTok Shop', 'Instagram'],
      tone: '克制、细腻、季节感；用「体験」「素材」「安心」而非夸张卖点',
      rules: [
        '画面文字一律用日文（汉字+平假名+片假名），敬体（です・ます）为主；不要只用英文，也不要出现简体中文。',
        '价格写法 ¥12,990（税込）或「税込 12,990円」，必须写明含税；折扣写「20%OFF」「○円引き」并标期限。',
        '日期 YYYY年MM月DD日；度量公制；场景用四季（春樱/夏祭/秋红叶/冬雪）、住宅收纳、通勤电车；构图留白多、排版克制。',
        '最高级与效果宣称要有依据（景品表示法），"No.1"须写出调查机构/期间/对象；健康与美容类功效不得超出认可范围。'
      ],
      banClaims: ['根拠のない「No.1」「最高」「日本一」', '二重価格表示（虚构原价）', '医薬品効果的宣称（未认可）', '「絶対」「必ず」等绝对化保证'],
      banVisual: ['可识别真人肖像（无授权）', '皇室与国旗象征的商用', '宗教符号作装饰'],
      required: ['日文文案', '税込总价标示', '景品表示法依据（如写 No.1）', '食品/化妆品需符合药机法与食品表示法'],
      compliance: ['景品表示法（不当表示）', '薬機法（功效宣称）', '食品表示法', '特定商取引法'],
      festival: ['お正月', '桜', 'ゴールデンウィーク', 'お中元・お歳暮', 'クリスマス'],
      confidence: 'A'
    }
  }
};
