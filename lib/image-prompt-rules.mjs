const marketCues = [
  { names: ['新加坡', 'singapore'], cues: 'a clean Singapore urban commuting setting such as an MRT entrance, sheltered walkway, tropical greenery and a wet but orderly pavement' },
  { names: ['泰国', 'thailand'], cues: 'a natural Thailand urban commuting setting such as a BTS-area walkway, tropical street greenery, a practical sun/rain shelter and warm local architecture' },
  { names: ['越南', 'vietnam'], cues: 'a natural Vietnam city setting such as a rainy commuting street, a restrained scooter presence, a small café frontage or a covered urban walkway' },
  { names: ['马来西亚', 'malaysia'], cues: 'a natural Malaysia city setting such as an LRT-area walkway, a covered rain corridor, tropical plants and a modern commercial or campus environment' },
  { names: ['印度尼西亚', 'indonesia'], cues: 'a natural Indonesia city setting such as a tropical urban road, school or transit area, humid pavement and restrained local architecture' },
  { names: ['菲律宾', 'philippines'], cues: 'a natural Philippines city setting such as a clean transit stop, campus or commercial street with tropical greenery and a believable daily commute' },
  { names: ['柬埔寨', 'cambodia'], cues: 'a restrained Phnom Penh-inspired urban street, school or commercial setting with tropical climate cues and local architectural character' },
  { names: ['老挝', 'laos'], cues: 'a calm Vientiane-inspired street, campus or light commuting setting with tropical plants, open space and subtle local architecture' },
  { names: ['缅甸', 'myanmar'], cues: 'a natural Myanmar urban street, school or commuting setting with tropical climate cues and restrained local architectural details' }
];

function findMarketCue(market) {
  const value = String(market || '').trim().toLowerCase();
  return marketCues.find(item => item.names.some(name => value.includes(name)))?.cues
    || 'a natural Southeast Asian urban, campus, commercial or commuting setting that fits the target market without forcing a landmark';
}

export function buildImageGenerationRules(market) {
  const localCue = findMarketCue(market);
  return `
【仅用于广告图片模板和最终图片生成】
目标市场：${market || '用户指定市场'}。
地域氛围建议：${localCue}。

请把商品作为真实摄影场景中的主要视觉主体。商品可以使用近景或特写并占据较大画面，但必须通过合理的镜头距离、焦距、景别和透视来突出，不能把商品生成成物理意义上的巨型物体。背景中的人物、车辆、公交站、地铁站、建筑、桌面和道路必须保有可信的远近层次、消失点、接触关系、遮挡关系、光线方向和阴影。车站、地铁和公交只是尺度参照，不要求商品必须比它们小；重点是商品与环境之间的空间逻辑合理，不能像商品贴图或模型合成。

如果有商品图片，保持商品真实的颜色、形状、尺寸比例、材质、拉链、肩带、结构和 Logo，不重新设计商品，不生成多个不同外观的商品。使用用户商品图作为外观依据；无法确认的信息不要虚构。

目标市场元素只作为背景辅助，每张图最多使用一到两个地域线索，并保持背景简洁。地域线索可以是公共交通、校园、商业街、热带植物、雨季路面或当地城市建筑氛围，但不要强行添加地标、旗帜、官方标志或刻板文化符号。如果地域元素损害商品主体、构图或真实感，应减少或取消地域元素。

画面中出现的所有文字必须使用目标市场语言（${market || '用户指定市场'}），并且必须是自己能确认含义的真实表达。禁止出现任何中文（简体或繁体）——包括中文标题、中文标签、中文按钮、中文水印和拼音标注。如果无法确定当地写法，就不要在画面里写文字，只保留价格数字和货币符号即可。绝不能用伪文字、乱码或看似外文的拼凑字符充数。

请在 imagePrompt 中明确写入以下英文约束：
Maintain a believable photographic scene with physically coherent spatial relationships. The product may appear large in the foreground because of camera proximity and perspective, but it must never appear physically giant-sized. Use realistic depth cues, vanishing points, contact shadows, occlusion, lighting direction and scale references. Keep the relationship between the product, people, vehicles, buildings, public transport and surrounding environment visually believable. Do not make the product look like a miniature model or a building-sized object.

Negative prompt:
physically giant product, product the same physical size as a bus stop or building, miniature environment, impossible perspective, inconsistent vanishing points, incorrect depth cues, floating product, missing contact shadows, wrong occlusion, pasted-on product, distorted proportions, warped geometry, duplicated product, deformed logo, changed product design, wrong color, incorrect material, background objects with inconsistent scale, Chinese characters, Chinese text, Chinese subtitle, Chinese label, Chinese watermark, pinyin text, gibberish text, fake foreign characters, cluttered composition, product blocked by people or vehicles, excessive local decorations, stereotypical cultural elements, low-quality advertising composition, blurry, out of focus, motion blur, soft focus, low resolution, jpeg artifacts, grainy, noisy, redrawn logo, invented emblem, wrong brand mark, distorted badge, illegible logo, logo turned into abstract shape, fake car emblem, pseudo text, fake letters, scrambled characters, illegible label, garbled watermark, extra text, floating text overlay.
`;
}
