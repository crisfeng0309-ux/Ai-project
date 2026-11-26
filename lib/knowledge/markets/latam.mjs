// 拉美（按用户分类：墨西哥、巴西归在此组）
export const REGION = {
  id: 'latam',
  name: '拉美',
  order: 2,
  sharedRules: [
    '拉美共通：西班牙语/葡萄牙语必须区分国别变体，墨西哥用 es-MX、巴西用 pt-BR，不得混用或出现西班牙本土用语。',
    '拉美共通：价格常配合分期（cuotas / parcelas）表达，分期必须写清期数与是否含息；促销节点用 Buen Fin、Día de los Muertos、狂欢节、圣诞。'
  ],
  countries: {
    MX: {
      id: 'MX',
      name: '墨西哥',
      aliases: ['墨西哥', 'Mexico', 'MX', 'México'],
      lang: { code: 'es-MX', label: 'Español (México)', script: 'Latin', dir: 'ltr' },
      extraLangs: [],
      currency: { code: 'MXN', symbol: '$', position: 'prefix', decimals: 2, group: ',', decimal: '.', sample: '$1,299.00 MXN', tax: 'included', taxNote: '面向消费者的标价通常含 IVA' },
      date: 'DD/MM/YYYY',
      units: 'metric（cm / kg / °C）',
      platforms: ['Mercado Libre', 'Amazon.com.mx', 'Shopify', 'TikTok Shop', 'Meta Ads'],
      tone: '热情、家庭场景、节庆感；口语化但不轻浮',
      rules: [
        '画面文字一律用墨西哥西语（es-MX）：用 «celular» 而不是 «móvil»，用 «computadora» 而不是 «ordenador»，禁止西班牙本土词汇。',
        '价格写法 $1,299.00 MXN（比索符号与美元同为 $，必须带 MXN 或 «M.N.» 区分）；分期写 «12 meses sin intereses» 这种完整表达。',
        '日期 DD/MM/YYYY；度量公制；服装鞋码用 MX/US 对照。',
        '场景用墨西哥城/蒙特雷的街区、市场（mercado）、家庭聚会；节日用 Día de los Muertos、独立日、Buen Fin、圣诞（Posadas）。'
      ],
      banClaims: ['治愈/治疗类功效', '无依据的 «el mejor» / «número 1»', '虚构原价', '夸大分期收益'],
      banVisual: ['宗教圣像的商业化挪用（瓜达卢佩圣母等）', '可识别真人肖像', '国旗作装饰'],
      required: ['含税标价说明', '促销价须有真实原价', '分期条件写清'],
      compliance: ['PROFECO 消费者保护', 'NOM 认证（适用类目）', 'IVA 标示'],
      festival: ['Día de los Muertos', 'Buen Fin', 'Navidad', 'Día de la Independencia'],
      confidence: 'B'
    },
    BR: {
      id: 'BR',
      name: '巴西',
      aliases: ['巴西', 'Brazil', 'Brasil', 'BR'],
      lang: { code: 'pt-BR', label: 'Português (Brasil)', script: 'Latin', dir: 'ltr' },
      extraLangs: [],
      currency: { code: 'BRL', symbol: 'R$', position: 'prefix', decimals: 2, group: '.', decimal: ',', sample: 'R$ 1.299,00', tax: 'included', taxNote: '面向消费者的标价含税' },
      date: 'DD/MM/YYYY',
      units: 'metric（cm / kg / °C）',
      platforms: ['Mercado Livre', 'Shopee', 'Amazon.com.br', 'TikTok Shop', 'Meta Ads'],
      tone: '热烈、情绪外放、社群感；可带足球与音乐元素',
      rules: [
        '画面文字一律用巴西葡语（pt-BR），禁止用葡萄牙本土用语（如 «telemóvel» 改成 «celular»）。',
        '价格写法 R$ 1.299,00：千分位用「.」、小数点用「,」，符号与数字间留空格；分期写 «12x de R$ 108,25 sem juros»。',
        '日期 DD/MM/YYYY；度量公制；服装鞋码用 BR 码（与 EU 不同，需换算表）。',
        '场景用圣保罗/里约的街区、海滩、球场、家庭烧烤（churrasco）；节日用狂欢节、Festa Junina、圣诞、黑五（Black Friday 在巴西很主流）。'
      ],
      banClaims: ['治愈/治疗类功效', '无依据的 «o melhor do mundo»', '医疗类 before/after 对比', '面向儿童的诱导性表达'],
      banVisual: ['可识别真人肖像', '宗教圣像挪用', '国旗作装饰'],
      required: ['含税标价说明', '促销价须有真实原价', '儿童相关广告需格外克制'],
      compliance: ['CONAR 广告自律规范', 'ANVISA（健康/化妆品）', 'INMETRO（认证）', 'CONANDA 163（儿童广告）'],
      festival: ['Carnaval', 'Festa Junina', 'Black Friday', 'Natal'],
      confidence: 'B'
    }
  }
};
