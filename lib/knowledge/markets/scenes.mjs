// 生图场景 cue（英文，给生图模型看的，不参与给用户看的中文文案）
// 为什么单独一个文件：cue 是"视觉描述"，与市场约束的"规则"分开维护；
// 加新国家时：scenes.mjs 加一条，市场数据文件里加一个国家对象，两处即可。
// 没写 cue 的国家 → 用所属地区的 fallback，再没有 → 用 NEUTRAL。

export const SCENES = {
  // 北美
  US: 'a believable American everyday setting — a suburban street, a college campus, a downtown sidewalk or a pickup-truck driveway; no Asian streetscapes',
  CA: 'a believable Canadian everyday setting — a snowy winter street, a maple-lined autumn sidewalk or a warm indoor scene; no tropical or US-southern scenes',
  // 拉美
  MX: 'a believable Mexican everyday setting — a neighbourhood market street, a Colonia sidewalk, a family courtyard or a small shop front',
  BR: 'a believable Brazilian everyday setting — a São Paulo apartment block, a beach promenade, a bakery corner or a condominium courtyard',
  // 大洋洲
  AU: 'a believable Australian everyday setting — a sunlit suburban backyard, a coastal car park, an outdoor café or a eucalyptus-lined street',
  // 欧洲
  DE: 'a believable German everyday setting — a clean Altstadt street, a Mitte apartment, a bike lane or a modern office corridor; no alpine kitsch',
  FR: 'a believable French everyday setting — a Haussmann apartment interior, a boulangerie corner or a stone-paved street; no beret-and-baguette clichés',
  GB: 'a believable British everyday setting — a terraced street, a rainy high street, a terraced-house kitchen or a park bench',
  ES: 'a believable Spanish everyday setting — a plaza with café terraces, a modern apartment block or a Mediterranean coastal street',
  // 俄语区
  RU: 'a believable Russian everyday setting — a snow-lined courtyard, a panel-block apartment or a metro entrance; cold winter light first',
  // 中东
  SA: 'a believable Saudi everyday setting — a modern family majlis, a mall interior or a residential compound; modest, warm, no religious icons',
  AE: 'a believable Emirati everyday setting — a modern mall atrium, a residential tower lobby or a Corniche promenade',
  // 东亚
  KR: 'a believable Korean everyday setting — a Seoul apartment, a subway exit, a café corner or a rooftop view; clean and modern',
  JP: 'a believable Japanese everyday setting — a quiet residential street, a convenience-store corner, a tidy apartment interior or a train platform; no geisha or kabuki clichés',
  // 东南亚（前 4 条沿用原 marketCues 的措辞，避免老市场画面漂移）
  VN: 'a natural Vietnam city setting such as a rainy commuting street, a restrained scooter presence, a small café frontage or a covered urban walkway',
  TH: 'a natural Thailand urban commuting setting such as a BTS-area walkway, tropical street greenery, a practical sun/rain shelter and warm local architecture',
  ID: 'a natural Indonesia city setting such as a tropical urban road, school or transit area, humid pavement and restrained local architecture',
  MY: 'a natural Malaysia city setting such as an LRT-area walkway, a covered rain corridor, tropical plants and a modern commercial or campus environment',
  SG: 'a clean Singapore urban commuting setting such as an MRT entrance, sheltered walkway, tropical greenery and a wet but orderly pavement'
};

export const REGION_SCENES = {
  'north-america': 'a believable North American everyday setting — residential neighbourhood, campus or downtown sidewalk',
  latam: 'a believable Latin American everyday setting — a walkable neighbourhood street or a family home interior',
  oceania: 'a believable Australian everyday setting — suburban or coastal, natural daylight',
  europe: 'a believable European everyday setting — a historic or modern city street, natural daylight',
  russia: 'a believable Russian everyday setting — winter city courtyard or residential interior',
  'middle-east': 'a believable Middle Eastern everyday setting — modern residential or mall interior, modest and warm',
  'east-asia': 'a believable East Asian everyday setting — a clean modern street, transit entrance or apartment interior',
  'southeast-asia': 'a natural Southeast Asian urban, campus, commercial or commuting setting that fits the target market without forcing a landmark'
};

export const NEUTRAL_SCENE = 'a believable everyday setting in the target market, without landmark clichés';

export function sceneFor(countryId, regionId) {
  return SCENES[String(countryId || '').toUpperCase()]
    || REGION_SCENES[String(regionId || '').toLowerCase()]
    || NEUTRAL_SCENE;
}
