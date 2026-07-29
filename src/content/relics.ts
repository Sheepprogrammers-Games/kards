/** 遗物定义。全部以声明式修饰生效，不在结算流程里按 id 特判。 */

export interface RelicDef {
  id: string;
  name: string;
  text: string;
  art: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'boss';
  /** 重塑系数分布形状，总和在加载时统一归一化。 */
  coefTable?: number[];
  /** 引爆效率的乘算修正，结果不会超过硬上限。 */
  igniteEfficiency?: number;
  energyPerTurn?: number;
  handSize?: number;
  echoBudget?: number;
  startingBlock?: number;
  startingStrength?: number;
  drawPerTurn?: number;
  /** 溢出烧毁改为进入弃牌堆。 */
  salvageBurn?: boolean;
  /** 引牌不再随本回合次数涨价。 */
  steadyIgnite?: boolean;
  /** 溢出烧毁改为洗回抽牌堆。 */
  salvageToDraw?: boolean;
  /** 被挤出烧毁的条目照常兑现赌注。 */
  payoffOnBurn?: boolean;
  /** 引爆后条目留在轨上，只保留一次结算。 */
  igniteKeepsEntry?: boolean;
  /** 每回合第一张织牌不消耗能量。 */
  firstWeaveFree?: boolean;
  /** 窃取来的意图按全额结算。 */
  fullSteal?: boolean;
  /** 冻结不消耗结算次数。 */
  freeFreeze?: boolean;
  /** 玩家条目的回拨次数上限增量。 */
  rewindBonus?: number;
}

export const RELICS: RelicDef[] = [
  {
    id: 'cracked-hourglass',
    name: '裂纹沙漏',
    text: '衰减更平缓，系数变为 100 / 80 / 60 / 40。',
    art: 'cracked-hourglass',
    rarity: 'common',
    coefTable: [1.0, 0.8, 0.6, 0.4],
  },
  {
    id: 'inverted-astrolabe',
    name: '逆位星盘',
    text: '衰减反转，系数变为 40 / 60 / 80 / 100。越旧的回响越强。',
    art: 'inverted-astrolabe',
    rarity: 'rare',
    coefTable: [0.4, 0.6, 0.8, 1.0],
  },
  {
    id: 'patience-sigil',
    name: '静候印记',
    text: '尾段加重，系数变为 90 / 70 / 65 / 60。',
    art: 'patience-sigil',
    rarity: 'uncommon',
    coefTable: [0.9, 0.7, 0.65, 0.6],
  },
  {
    id: 'shattered-numeral',
    name: '碎裂数字',
    text: '首格加重，系数变为 130 / 60 / 30 / 15。',
    art: 'shattered-numeral',
    rarity: 'uncommon',
    coefTable: [1.3, 0.6, 0.3, 0.15],
  },
  {
    id: 'brass-metronome',
    name: '黄铜节拍器',
    text: '每回合开始时多抽 1 张牌。',
    art: 'brass-metronome',
    rarity: 'common',
    drawPerTurn: 1,
  },
  {
    id: 'mainspring-heart',
    name: '发条之心',
    text: '每回合能量 +1。',
    art: 'mainspring-heart',
    rarity: 'rare',
    energyPerTurn: 1,
  },
  {
    id: 'spool-of-last-hour',
    name: '末时线轴',
    text: '被挤出时间轨的牌回到弃牌堆，不再移出战斗。',
    art: 'spool-of-last-hour',
    rarity: 'uncommon',
    salvageBurn: true,
  },
  {
    id: 'echo-tuning-fork',
    name: '回响音叉',
    text: '轨上条目的初始结算次数 +1。',
    art: 'echo-tuning-fork',
    rarity: 'uncommon',
    echoBudget: 1,
  },
  {
    id: 'sealed-escapement',
    name: '封存擒纵器',
    text: '同一回合内多次引爆不再涨价。',
    art: 'sealed-escapement',
    rarity: 'uncommon',
    steadyIgnite: true,
  },
  {
    id: 'amber-ballast',
    name: '琥珀压舱',
    text: '每场战斗开始时获得 8 点护甲。',
    art: 'amber-ballast',
    rarity: 'common',
    startingBlock: 8,
  },
  {
    id: 'weavers-thimble',
    name: '织者顶针',
    text: '每场战斗开始时获得 2 点力量。',
    art: 'weavers-thimble',
    rarity: 'boss',
    startingStrength: 2,
  },
  {
    id: 'bent-minute-hand',
    name: '弯折分针',
    text: '每场战斗开始时获得 1 点力量。',
    art: 'bent-minute-hand',
    rarity: 'common',
    startingStrength: 1,
  },
  {
    id: 'gilded-bobbin',
    name: '鎏金梭芯',
    text: '手牌上限 +1。',
    art: 'gilded-bobbin',
    rarity: 'common',
    handSize: 1,
  },
  {
    id: 'widows-pendulum',
    name: '寡妇摆锤',
    text: '引爆效率提升三成，但每回合能量 -1。',
    art: 'widows-pendulum',
    rarity: 'rare',
    igniteEfficiency: 1.3,
    energyPerTurn: -1,
  },
  {
    id: 'looped-chain',
    name: '环链',
    text: '轨上条目的初始结算次数 +2，手牌上限 -1。',
    art: 'looped-chain',
    rarity: 'rare',
    echoBudget: 2,
    handSize: -1,
  },
  {
    id: 'dust-of-noon',
    name: '正午之尘',
    text: '每场战斗开始时获得 4 点护甲，每回合多抽 1 张牌。',
    art: 'dust-of-noon',
    rarity: 'uncommon',
    startingBlock: 4,
    drawPerTurn: 1,
  },
  {
    id: 'warden-key',
    name: '守时钥',
    text: '引爆效率提升一成五。',
    art: 'warden-key',
    rarity: 'uncommon',
    igniteEfficiency: 1.15,
  },
  {
    id: 'clouded-lens',
    name: '蒙翳透镜',
    text: '手牌上限 +2，每场战斗开始时失去 1 点力量。',
    art: 'clouded-lens',
    rarity: 'uncommon',
    handSize: 2,
    startingStrength: -1,
  },
  {
    id: 'second-shadow',
    name: '次影',
    text: '尾段几乎不衰减，系数变为 80 / 75 / 70 / 65。',
    art: 'second-shadow',
    rarity: 'rare',
    coefTable: [0.8, 0.75, 0.7, 0.65],
  },
  {
    id: 'counterweight-crown',
    name: '配重冠',
    text: '每场战斗开始时获得 14 点护甲。',
    art: 'counterweight-crown',
    rarity: 'uncommon',
    startingBlock: 14,
  },
  {
    id: 'frozen-bell-clapper',
    name: '冻结钟舌',
    text: '每回合能量 +1，手牌上限 -1。',
    art: 'frozen-bell-clapper',
    rarity: 'rare',
    energyPerTurn: 1,
    handSize: -1,
  },
  {
    id: 'verdigris-gnomon',
    name: '铜绿晷针',
    text: '每场战斗开始时获得 3 点力量，起始护甲 -6。',
    art: 'verdigris-gnomon',
    rarity: 'boss',
    startingStrength: 3,
    startingBlock: -6,
  },
  {
    id: 'null-anchor',
    name: '归零锚',
    text: '被挤出的牌回到弃牌堆，条目结算次数 +1。',
    art: 'null-anchor',
    rarity: 'boss',
    salvageBurn: true,
    echoBudget: 1,
  },
  {
    id: 'tarot-of-the-null',
    name: '空位塔罗',
    text: '每回合能量 +1，多抽 1 张牌，引爆效率降低两成。',
    art: 'tarot-of-the-null',
    rarity: 'boss',
    energyPerTurn: 1,
    drawPerTurn: 1,
    igniteEfficiency: 0.8,
  },
  {
    id: 'homing-spool',
    name: '归途梭',
    text: '被挤出时间轨的牌洗回抽牌堆，不再移出战斗。手牌上限 -1。',
    art: 'homing-spool',
    rarity: 'uncommon',
    salvageToDraw: true,
    handSize: -1,
  },
  {
    id: 'ember-reliquary',
    name: '余烬匣',
    text: '引爆后条目留在原格并保留一次结算，引爆效率减半。',
    art: 'ember-reliquary',
    rarity: 'rare',
    igniteKeepsEntry: true,
    igniteEfficiency: 0.5,
  },
  {
    id: 'first-thread-key',
    name: '起手线钥',
    text: '每回合第一张织牌费用为零，每回合能量 -1。',
    art: 'first-thread-key',
    rarity: 'rare',
    firstWeaveFree: true,
    energyPerTurn: -1,
  },
  {
    id: 'even-dial',
    name: '均分刻盘',
    text: '衰减取消，系数变为 80 / 80 / 80 / 80。',
    art: 'even-dial',
    rarity: 'rare',
    coefTable: [0.8, 0.8, 0.8, 0.8],
  },
  {
    id: 'unpaid-wager',
    name: '未兑赌注',
    text: '被挤出烧毁的条目照常兑现赌注，轨上条目的初始结算次数 -1。',
    art: 'unpaid-wager',
    rarity: 'boss',
    payoffOnBurn: true,
    echoBudget: -1,
  },
  {
    id: 'counter-spindle',
    name: '反纺锭',
    text: '每个条目可被回拨的次数 +1，引爆效率降低一成五。',
    art: 'counter-spindle',
    rarity: 'uncommon',
    rewindBonus: 1,
    igniteEfficiency: 0.85,
  },
  {
    id: 'conspirators-mask',
    name: '共谋面具',
    text: '窃取来的意图按全额结算，每场战斗开始时失去 1 点力量。',
    art: 'conspirators-mask',
    rarity: 'rare',
    fullSteal: true,
    startingStrength: -1,
  },
  {
    id: 'silent-spring',
    name: '静默游丝',
    text: '冻结不再消耗条目的结算次数，手牌上限 -1。',
    art: 'silent-spring',
    rarity: 'uncommon',
    freeFreeze: true,
    handSize: -1,
  },
];

export interface RelicModifiers {
  coefTable?: number[];
  igniteEfficiency: number;
  energyPerTurn: number;
  handSize: number;
  echoBudget: number;
  startingBlock: number;
  startingStrength: number;
  drawPerTurn: number;
  salvageBurn: boolean;
  steadyIgnite: boolean;
  salvageToDraw: boolean;
  payoffOnBurn: boolean;
  igniteKeepsEntry: boolean;
  firstWeaveFree: boolean;
  fullSteal: boolean;
  freeFreeze: boolean;
  rewindBonus: number;
}

/** 合并玩家持有的全部遗物。后取得的系数表覆盖先前的。 */
export function collectModifiers(relicIds: string[]): RelicModifiers {
  const mods: RelicModifiers = {
    igniteEfficiency: 1,
    energyPerTurn: 0,
    handSize: 0,
    echoBudget: 0,
    startingBlock: 0,
    startingStrength: 0,
    drawPerTurn: 0,
    salvageBurn: false,
    steadyIgnite: false,
    salvageToDraw: false,
    payoffOnBurn: false,
    igniteKeepsEntry: false,
    firstWeaveFree: false,
    fullSteal: false,
    freeFreeze: false,
    rewindBonus: 0,
  };

  for (const id of relicIds) {
    const def = RELICS.find((r) => r.id === id);
    if (!def) continue;
    if (def.coefTable) mods.coefTable = def.coefTable;
    if (def.igniteEfficiency) mods.igniteEfficiency *= def.igniteEfficiency;
    mods.energyPerTurn += def.energyPerTurn ?? 0;
    mods.handSize += def.handSize ?? 0;
    mods.echoBudget += def.echoBudget ?? 0;
    mods.startingBlock += def.startingBlock ?? 0;
    mods.startingStrength += def.startingStrength ?? 0;
    mods.drawPerTurn += def.drawPerTurn ?? 0;
    mods.salvageBurn ||= def.salvageBurn ?? false;
    mods.steadyIgnite ||= def.steadyIgnite ?? false;
    mods.salvageToDraw ||= def.salvageToDraw ?? false;
    mods.payoffOnBurn ||= def.payoffOnBurn ?? false;
    mods.igniteKeepsEntry ||= def.igniteKeepsEntry ?? false;
    mods.firstWeaveFree ||= def.firstWeaveFree ?? false;
    mods.fullSteal ||= def.fullSteal ?? false;
    mods.freeFreeze ||= def.freeFreeze ?? false;
    mods.rewindBonus += def.rewindBonus ?? 0;
  }
  return mods;
}
