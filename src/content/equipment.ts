/** 装备定义。常驻修正与遗物共用一套字段，钩子效果按格位系数 1 结算一次。 */

import type { EquipmentDef } from '@engine/types';

export const EQUIPMENT: EquipmentDef[] = [
  // 武器：回合钩子直接产出伤害或负面状态
  {
    id: 'ratchet-flail',
    name: '棘轮连枷',
    slot: 'weapon',
    rarity: 'common',
    text: '每回合开始时对最前方的敌人造成 2 次 2 点伤害。',
    art: 'ratchet-flail',
    onTurnStart: [
      { kind: 'damage', amount: 2, hits: 2, scaleMode: 'SCALAR', target: 'frontmost' },
    ],
  },
  {
    id: 'verdigris-fang',
    name: '铜绿獠牙',
    slot: 'weapon',
    rarity: 'common',
    text: '每回合开始时对最前方的敌人施加 2 层中毒。',
    art: 'verdigris-fang',
    onTurnStart: [
      { kind: 'applyStatus', amount: 2, scaleMode: 'SCALAR', status: 'poison', target: 'frontmost' },
    ],
  },
  {
    id: 'hour-hand-cleaver',
    name: '时针斩',
    slot: 'weapon',
    rarity: 'uncommon',
    text: '每回合开始时对最前方的敌人造成 5 点伤害，目标生命低于半数时伤害翻倍。',
    art: 'hour-hand-cleaver',
    onTurnStart: [
      { kind: 'damage', amount: 5, scaleMode: 'SCALAR', target: 'frontmost', execute: 0.5 },
    ],
  },
  {
    id: 'siphon-edge',
    name: '汲时刃',
    slot: 'weapon',
    rarity: 'uncommon',
    text: '敌方回合结束时对最前方的敌人造成 5 点伤害，并回复其中一半的生命。',
    art: 'siphon-edge',
    onTurnEnd: [
      { kind: 'damage', amount: 5, scaleMode: 'SCALAR', target: 'frontmost', lifesteal: 0.5 },
    ],
  },
  {
    id: 'tolling-brand',
    name: '长鸣烙印',
    slot: 'weapon',
    rarity: 'rare',
    text: '每回合开始时对所有敌人施加 1 层易伤。引爆效率降低两成。',
    art: 'tolling-brand',
    mods: { igniteEfficiency: 0.8 },
    onTurnStart: [
      {
        kind: 'applyStatus',
        amount: 1,
        scaleMode: 'SCALAR',
        status: 'vulnerable',
        target: 'allEnemies',
      },
    ],
  },

  // 护甲：钩子集中在玩家回合开始，抢在敌方意图落地之前铺好防线
  {
    id: 'bellhouse-cuirass',
    name: '钟房胸甲',
    slot: 'armor',
    rarity: 'common',
    text: '每回合开始时获得 6 点护甲。',
    art: 'bellhouse-cuirass',
    onTurnStart: [{ kind: 'block', amount: 6, scaleMode: 'SCALAR', target: 'self' }],
  },
  {
    id: 'thorncase-mail',
    name: '荆匣锁甲',
    slot: 'armor',
    rarity: 'common',
    text: '每回合开始时获得 3 层荆棘。',
    art: 'thorncase-mail',
    onTurnStart: [
      { kind: 'selfStatus', amount: 3, scaleMode: 'SCALAR', status: 'thorns', target: 'self' },
    ],
  },
  {
    id: 'deadfall-mantle',
    name: '停摆斗篷',
    slot: 'armor',
    rarity: 'uncommon',
    text: '敌方回合结束时获得 2 层护盾。',
    art: 'deadfall-mantle',
    onTurnEnd: [
      { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'ward', target: 'self' },
    ],
  },
  {
    id: 'pendulum-harness',
    name: '摆锤挽具',
    slot: 'armor',
    rarity: 'uncommon',
    text: '每回合开始时获得 4 点护甲。每个条目可被回拨的次数 +1。',
    art: 'pendulum-harness',
    mods: { rewindBonus: 1 },
    onTurnStart: [{ kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' }],
  },
  {
    id: 'null-hour-carapace',
    name: '空时甲壳',
    slot: 'armor',
    rarity: 'rare',
    text: '每回合开始时获得 6 点护甲与 1 层转嫁。每回合能量 -1。',
    art: 'null-hour-carapace',
    mods: { energyPerTurn: -1 },
    onTurnStart: [
      { kind: 'block', amount: 6, scaleMode: 'SCALAR', target: 'self' },
      { kind: 'selfStatus', amount: 1, scaleMode: 'SCALAR', status: 'reflect', target: 'self' },
    ],
  },

  // 饰品：资源与续航
  {
    id: 'hollow-cog-charm',
    name: '空齿吊坠',
    slot: 'trinket',
    rarity: 'common',
    text: '敌方回合结束时回复 3 点生命。',
    art: 'hollow-cog-charm',
    onTurnEnd: [{ kind: 'heal', amount: 3, scaleMode: 'SCALAR', target: 'self' }],
  },
  {
    id: 'pocket-sundial',
    name: '袖珍日晷',
    slot: 'trinket',
    rarity: 'common',
    text: '每回合开始时在补满手牌之后再抽 1 张牌。',
    art: 'pocket-sundial',
    onTurnStart: [{ kind: 'draw', amount: 1, scaleMode: 'ONCE' }],
  },
  {
    id: 'cinder-locket',
    name: '余烬颈盒',
    slot: 'trinket',
    rarity: 'uncommon',
    text: '每回合开始时对最前方的敌人施加 4 层灼烧，灼烧无视护甲。',
    art: 'cinder-locket',
    onTurnStart: [
      { kind: 'applyStatus', amount: 4, scaleMode: 'SCALAR', status: 'burn', target: 'frontmost' },
    ],
  },
  {
    id: 'pawnbroker-fob',
    name: '当铺怀表',
    slot: 'trinket',
    rarity: 'uncommon',
    text: '每回合开始时获得 1 点能量，并将一张停梭置入弃牌堆。',
    art: 'pawnbroker-fob',
    onTurnStart: [
      { kind: 'gainEnergy', amount: 1, scaleMode: 'ONCE' },
      { kind: 'createCard', amount: 1, scaleMode: 'ONCE', cardId: 'patient-weft', pile: 'discard' },
    ],
  },
  {
    id: 'metronome-scepter',
    name: '节拍权杖',
    slot: 'trinket',
    rarity: 'rare',
    text: '每回合开始时获得 1 点力量。每回合能量 -1。',
    art: 'metronome-scepter',
    mods: { energyPerTurn: -1 },
    onTurnStart: [
      { kind: 'selfStatus', amount: 1, scaleMode: 'SCALAR', status: 'strength', target: 'self' },
    ],
  },

  // 机芯：改写时间轨与引爆的运作方式
  {
    id: 'overwound-core',
    name: '过卷机芯',
    slot: 'core',
    rarity: 'common',
    text: '每回合开始时获得 1 点能量，手牌上限 -1。',
    art: 'overwound-core',
    mods: { handSize: -1 },
    onTurnStart: [{ kind: 'gainEnergy', amount: 1, scaleMode: 'ONCE' }],
  },
  {
    id: 'ember-core',
    name: '余烬机芯',
    slot: 'core',
    rarity: 'common',
    text: '同一回合内多次引爆不再涨价。每回合开始时对最前方的敌人施加 2 层灼烧。',
    art: 'ember-core',
    mods: { steadyIgnite: true },
    onTurnStart: [
      { kind: 'applyStatus', amount: 2, scaleMode: 'SCALAR', status: 'burn', target: 'frontmost' },
    ],
  },
  {
    id: 'recurrence-coil',
    name: '复现游丝',
    slot: 'core',
    rarity: 'uncommon',
    text: '衰减更平缓，系数变为 85 / 70 / 60 / 50。每回合开始时抽 1 张牌。',
    art: 'recurrence-coil',
    mods: { coefTable: [0.85, 0.7, 0.6, 0.5] },
    onTurnStart: [{ kind: 'draw', amount: 1, scaleMode: 'ONCE' }],
  },
  {
    id: 'frostbound-core',
    name: '霜缚机芯',
    slot: 'core',
    rarity: 'uncommon',
    text: '冻结不再消耗条目的结算次数。敌方回合结束时对所有敌人施加 2 层虚弱。',
    art: 'frostbound-core',
    mods: { freeFreeze: true },
    onTurnEnd: [
      { kind: 'applyStatus', amount: 2, scaleMode: 'SCALAR', status: 'weak', target: 'allEnemies' },
    ],
  },
  {
    id: 'paradox-core',
    name: '悖论机芯',
    slot: 'core',
    rarity: 'rare',
    text: '轨上条目的初始结算次数 +2。每回合开始时抽 1 张牌，并将一张停梭置入抽牌堆。',
    art: 'paradox-core',
    mods: { echoBudget: 2 },
    onTurnStart: [
      { kind: 'draw', amount: 1, scaleMode: 'ONCE' },
      { kind: 'createCard', amount: 1, scaleMode: 'ONCE', cardId: 'patient-weft', pile: 'draw' },
    ],
  },
];
