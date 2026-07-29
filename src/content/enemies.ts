/** 敌人与意图定义。意图的引信长度由 preferredSlot 声明，不在流程里做隐式调整。 */

import type { EnemyPhase, IntentDef, IntentOption } from '@engine/types';

export interface EnemyDef {
  id: string;
  name: string;
  tier: 'minion' | 'elite' | 'boss';
  act: number[];
  maxHp: [number, number];
  intentsPerTurn: number;
  intentScript: IntentOption[];
  art: string;
  /** 生命跌破阈值后换一套打法。 */
  phases?: EnemyPhase[];
}

export const INTENTS: IntentDef[] = [
  {
    id: 'gnaw',
    name: '啃噬',
    kind: 'attack',
    effects: [{ kind: 'damage', amount: 7, scaleMode: 'SCALAR' }],
  },
  {
    id: 'sap',
    name: '抽丝',
    kind: 'debuff',
    effects: [
      { kind: 'damage', amount: 4, scaleMode: 'SCALAR' },
      { kind: 'applyStatus', amount: 1, scaleMode: 'SCALAR', status: 'weak' },
    ],
  },
  {
    id: 'swarm',
    name: '蚀群',
    kind: 'attack',
    effects: [{ kind: 'damage', amount: 3, hits: 3, scaleMode: 'SCALAR' }],
  },
  {
    id: 'harden',
    name: '固壳',
    kind: 'defend',
    effects: [{ kind: 'block', amount: 8, scaleMode: 'SCALAR' }],
  },
  {
    id: 'dust-cough',
    name: '扬尘',
    kind: 'debuff',
    effects: [{ kind: 'applyStatus', amount: 2, scaleMode: 'SCALAR', status: 'vulnerable' }],
  },
  {
    id: 'discord',
    name: '失谐',
    kind: 'attack',
    effects: [
      { kind: 'damage', amount: 9, scaleMode: 'SCALAR' },
      { kind: 'applyStatus', amount: 1, scaleMode: 'SCALAR', status: 'weak' },
    ],
  },
  {
    id: 'pounce',
    name: '扑击',
    kind: 'attack',
    effects: [{ kind: 'damage', amount: 12, scaleMode: 'SCALAR' }],
  },
  {
    id: 'drift',
    name: '游移',
    kind: 'buff',
    effects: [{ kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'strength' }],
  },
  {
    id: 'burrow',
    name: '掘沙',
    kind: 'attack',
    effects: [
      { kind: 'damage', amount: 6, scaleMode: 'SCALAR' },
      { kind: 'block', amount: 6, scaleMode: 'SCALAR' },
    ],
  },
  {
    id: 'verdict',
    name: '裁定',
    kind: 'attack',
    effects: [{ kind: 'damage', amount: 16, scaleMode: 'SCALAR' }],
  },
  {
    id: 'seal',
    name: '封印',
    kind: 'debuff',
    effects: [
      { kind: 'applyStatus', amount: 2, scaleMode: 'SCALAR', status: 'weak' },
      { kind: 'applyStatus', amount: 2, scaleMode: 'SCALAR', status: 'vulnerable' },
    ],
  },
  {
    id: 'wind-back',
    name: '倒拨',
    kind: 'buff',
    effects: [
      { kind: 'heal', amount: 12, scaleMode: 'SCALAR' },
      { kind: 'selfStatus', amount: 1, scaleMode: 'SCALAR', status: 'strength' },
    ],
  },
  {
    id: 'shatterpoint',
    name: '碎点',
    kind: 'attack',
    effects: [{ kind: 'damage', amount: 5, hits: 4, scaleMode: 'SCALAR' }],
  },
  {
    id: 'toll',
    name: '鸣钟',
    kind: 'attack',
    effects: [{ kind: 'damage', amount: 22, scaleMode: 'SCALAR' }],
    unstealable: true,
    undelayable: true,
  },
  {
    id: 'reversal',
    name: '逆转',
    kind: 'attack',
    effects: [
      { kind: 'damage', amount: 14, scaleMode: 'SCALAR' },
      { kind: 'applyStatus', amount: 3, scaleMode: 'SCALAR', status: 'vulnerable' },
    ],
    unstealable: true,
  },
  {
    id: 'unmake',
    name: '拆解',
    kind: 'attack',
    effects: [{ kind: 'damage', amount: 9, hits: 3, scaleMode: 'SCALAR' }],
    unstealable: true,
    undelayable: true,
  },
  {
    id: 'first-thread',
    name: '初丝',
    kind: 'debuff',
    effects: [
      { kind: 'damage', amount: 8, scaleMode: 'SCALAR' },
      { kind: 'applyStatus', amount: 3, scaleMode: 'SCALAR', status: 'poison' },
    ],
  },
  {
    id: 'chaff',
    name: '碎屑',
    kind: 'attack',
    effects: [{ kind: 'damage', amount: 4, scaleMode: 'SCALAR' }],
  },
  {
    id: 'flare-burst',
    name: '曜爆',
    kind: 'attack',
    effects: [{ kind: 'damage', amount: 15, scaleMode: 'SCALAR' }],
    undelayable: true,
  },
  {
    id: 'drain-hour',
    name: '汲时',
    kind: 'debuff',
    effects: [
      { kind: 'damage', amount: 3, scaleMode: 'SCALAR' },
      { kind: 'applyStatus', amount: 2, scaleMode: 'SCALAR', status: 'weak' },
      { kind: 'applyStatus', amount: 3, scaleMode: 'SCALAR', status: 'poison' },
    ],
  },
  {
    id: 'slow-swing',
    name: '缓摆',
    kind: 'attack',
    effects: [{ kind: 'damage', amount: 20, scaleMode: 'SCALAR' }],
  },
  {
    id: 'slag-guard',
    name: '熔壁',
    kind: 'defend',
    effects: [
      { kind: 'block', amount: 14, scaleMode: 'SCALAR' },
      { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'strength' },
    ],
  },
  {
    id: 'anvil-fall',
    name: '砧落',
    kind: 'attack',
    effects: [{ kind: 'damage', amount: 17, scaleMode: 'SCALAR' }],
  },
  {
    id: 'bound-blow',
    name: '缚击',
    kind: 'attack',
    effects: [{ kind: 'damage', amount: 6, hits: 3, scaleMode: 'SCALAR' }],
    unstealable: true,
  },
  {
    id: 'wind-deep',
    name: '深绞',
    kind: 'attack',
    effects: [{ kind: 'damage', amount: 13, scaleMode: 'SCALAR' }],
  },
  {
    id: 'coil-tight',
    name: '紧簧',
    kind: 'buff',
    effects: [{ kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'strength' }],
  },
  {
    id: 'plumb-drop',
    name: '垂锤',
    kind: 'attack',
    effects: [{ kind: 'damage', amount: 18, scaleMode: 'SCALAR' }],
    unstealable: true,
    undelayable: true,
  },
  {
    id: 'graft-noise',
    name: '嫁接杂响',
    kind: 'debuff',
    effects: [
      { kind: 'damage', amount: 5, scaleMode: 'SCALAR' },
      { kind: 'createCard', amount: 1, scaleMode: 'ONCE', cardId: 'quiet-movement', pile: 'discard' },
    ],
  },
  {
    id: 'arc-sweep',
    name: '弧扫',
    kind: 'attack',
    effects: [
      { kind: 'damage', amount: 5, hits: 2, scaleMode: 'SCALAR' },
      { kind: 'applyStatus', amount: 2, scaleMode: 'SCALAR', status: 'vulnerable' },
    ],
  },
  {
    // 荆棘对每次扣血的攻击各反弹一次，中毒与灼烧不触发反弹
    id: 'bristle-up',
    name: '竖棘',
    kind: 'defend',
    effects: [
      { kind: 'block', amount: 6, scaleMode: 'SCALAR' },
      { kind: 'selfStatus', amount: 4, scaleMode: 'SCALAR', status: 'thorns' },
    ],
  },
  {
    // 护盾层逐次减免且不随回合清零，穿刺伤害直接跳过
    id: 'carapace',
    name: '甲壳',
    kind: 'defend',
    effects: [
      { kind: 'selfStatus', amount: 3, scaleMode: 'SCALAR', status: 'ward' },
      { kind: 'block', amount: 4, scaleMode: 'SCALAR' },
    ],
  },
  {
    id: 'spite-lash',
    name: '反鞭',
    kind: 'attack',
    effects: [
      { kind: 'damage', amount: 10, scaleMode: 'SCALAR' },
      { kind: 'selfStatus', amount: 3, scaleMode: 'SCALAR', status: 'thorns' },
    ],
  },
  {
    id: 'mirror-shell',
    name: '镜壳',
    kind: 'buff',
    effects: [
      { kind: 'selfStatus', amount: 4, scaleMode: 'SCALAR', status: 'ward' },
      { kind: 'selfStatus', amount: 3, scaleMode: 'SCALAR', status: 'thorns' },
    ],
    unstealable: true,
  },
  {
    // 转嫁只在实际扣血时消耗层数，护甲吸收掉的伤害既不反打也不掉层
    id: 'turnback-veil',
    name: '折返幕',
    kind: 'defend',
    effects: [
      { kind: 'block', amount: 6, scaleMode: 'SCALAR' },
      { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'reflect' },
    ],
  },
  {
    id: 'mirror-verdict',
    name: '镜裁',
    kind: 'attack',
    effects: [
      { kind: 'damage', amount: 8, scaleMode: 'SCALAR' },
      { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'reflect' },
    ],
  },
  {
    // 转嫁层不随回合衰减，挂满后要么绕开直接伤害，要么先把层数消耗掉
    id: 'reversion-halo',
    name: '回照环',
    kind: 'buff',
    effects: [
      { kind: 'selfStatus', amount: 3, scaleMode: 'SCALAR', status: 'reflect' },
      { kind: 'selfStatus', amount: 1, scaleMode: 'SCALAR', status: 'strength' },
    ],
    unstealable: true,
  },
];

export const ENEMIES: EnemyDef[] = [
  {
    id: 'mote-gnaw',
    name: '时蚀虫',
    tier: 'minion',
    act: [1],
    maxHp: [24, 30],
    intentsPerTurn: 1,
    art: 'mote-gnaw',
    intentScript: [
      { intentId: 'gnaw', preferredSlot: 4, weight: 3 },
      { intentId: 'sap', preferredSlot: 4, weight: 2 },
    ],
  },
  {
    id: 'tick-mite',
    name: '秒螨',
    tier: 'minion',
    act: [1],
    maxHp: [18, 22],
    intentsPerTurn: 1,
    art: 'tick-mite',
    intentScript: [
      { intentId: 'swarm', preferredSlot: 4, weight: 3 },
      { intentId: 'harden', preferredSlot: 4, weight: 1 },
    ],
  },
  {
    id: 'dust-acolyte',
    name: '尘侍',
    tier: 'minion',
    act: [1, 2],
    maxHp: [28, 34],
    intentsPerTurn: 1,
    art: 'dust-acolyte',
    intentScript: [
      { intentId: 'dust-cough', preferredSlot: 4, weight: 2 },
      { intentId: 'gnaw', preferredSlot: 4, weight: 3 },
    ],
  },
  {
    id: 'cracked-chorister',
    name: '裂音者',
    tier: 'minion',
    act: [1, 2],
    maxHp: [32, 38],
    intentsPerTurn: 1,
    art: 'cracked-chorister',
    intentScript: [
      { intentId: 'discord', preferredSlot: 4, weight: 3 },
      { intentId: 'harden', preferredSlot: 3, weight: 1 },
    ],
  },
  {
    id: 'minute-hound',
    name: '分针犬',
    tier: 'minion',
    act: [2],
    maxHp: [36, 44],
    intentsPerTurn: 1,
    art: 'minute-hound',
    intentScript: [
      { intentId: 'pounce', preferredSlot: 3, weight: 3 },
      { intentId: 'drift', preferredSlot: 4, weight: 1 },
      { intentId: 'spite-lash', preferredSlot: 3, weight: 2 },
    ],
  },
  {
    id: 'pendulum-wisp',
    name: '摆锤幽火',
    tier: 'minion',
    act: [2, 3],
    maxHp: [30, 36],
    intentsPerTurn: 1,
    art: 'pendulum-wisp',
    intentScript: [
      { intentId: 'swarm', preferredSlot: 4, weight: 2 },
      { intentId: 'seal', preferredSlot: 4, weight: 2 },
      { intentId: 'bristle-up', preferredSlot: 4, weight: 2 },
      { intentId: 'turnback-veil', preferredSlot: 4, weight: 2 },
    ],
  },
  {
    id: 'sand-crawler',
    name: '沙行者',
    tier: 'minion',
    act: [2, 3],
    maxHp: [42, 50],
    intentsPerTurn: 1,
    art: 'sand-crawler',
    intentScript: [
      { intentId: 'burrow', preferredSlot: 4, weight: 3 },
      { intentId: 'drift', preferredSlot: 4, weight: 1 },
      { intentId: 'bristle-up', preferredSlot: 4, weight: 2 },
    ],
  },
  {
    // 每回合挂 2 个低值意图，敌轨被自身填满后干预类卡牌失去可选目标
    id: 'warp-thief',
    name: '窃隙者',
    tier: 'minion',
    act: [1, 2],
    maxHp: [20, 26],
    intentsPerTurn: 2,
    art: 'warp-thief',
    intentScript: [
      { intentId: 'chaff', preferredSlot: 4, weight: 4 },
      { intentId: 'harden', preferredSlot: 4, weight: 1 },
      { intentId: 'carapace', preferredSlot: 4, weight: 2 },
    ],
  },
  {
    id: 'flare-moth',
    name: '曜蛾',
    tier: 'minion',
    act: [2],
    maxHp: [26, 32],
    intentsPerTurn: 1,
    art: 'flare-moth',
    intentScript: [
      { intentId: 'flare-burst', preferredSlot: 4, weight: 4 },
      { intentId: 'dust-cough', preferredSlot: 4, weight: 1 },
    ],
  },
  {
    id: 'null-leech',
    name: '空蛭',
    tier: 'minion',
    act: [2, 3],
    maxHp: [34, 42],
    intentsPerTurn: 1,
    art: 'null-leech',
    intentScript: [
      { intentId: 'drain-hour', preferredSlot: 4, weight: 3 },
      { intentId: 'sap', preferredSlot: 4, weight: 2 },
      { intentId: 'graft-noise', preferredSlot: 4, weight: 2 },
    ],
  },
  {
    id: 'late-shade',
    name: '迟影',
    tier: 'minion',
    act: [3],
    maxHp: [46, 54],
    intentsPerTurn: 1,
    art: 'late-shade',
    intentScript: [
      { intentId: 'slow-swing', preferredSlot: 2, weight: 3 },
      { intentId: 'drift', preferredSlot: 4, weight: 2 },
      { intentId: 'turnback-veil', preferredSlot: 4, weight: 2 },
    ],
  },
  {
    id: 'brass-inquisitor',
    name: '黄铜审判官',
    tier: 'elite',
    act: [1, 2],
    maxHp: [72, 84],
    intentsPerTurn: 1,
    art: 'brass-inquisitor',
    intentScript: [
      { intentId: 'verdict', preferredSlot: 3, weight: 3 },
      { intentId: 'seal', preferredSlot: 4, weight: 2 },
      { intentId: 'harden', preferredSlot: 4, weight: 1 },
    ],
  },
  {
    id: 'hour-warden',
    name: '守时卫',
    tier: 'elite',
    act: [2],
    maxHp: [88, 100],
    intentsPerTurn: 1,
    art: 'hour-warden',
    intentScript: [
      { intentId: 'shatterpoint', preferredSlot: 3, weight: 3 },
      { intentId: 'drift', preferredSlot: 4, weight: 2 },
    ],
  },
  {
    id: 'the-unwound',
    name: '松弛者',
    tier: 'elite',
    act: [2, 3],
    maxHp: [96, 110],
    intentsPerTurn: 1,
    art: 'the-unwound',
    intentScript: [
      { intentId: 'wind-back', preferredSlot: 4, weight: 2 },
      { intentId: 'verdict', preferredSlot: 2, weight: 3 },
    ],
  },
  {
    id: 'glass-cardinal',
    name: '琉璃枢机',
    tier: 'elite',
    act: [3],
    maxHp: [110, 124],
    intentsPerTurn: 1,
    art: 'glass-cardinal',
    intentScript: [
      { intentId: 'reversal', preferredSlot: 2, weight: 3 },
      { intentId: 'seal', preferredSlot: 4, weight: 2 },
      { intentId: 'mirror-shell', preferredSlot: 4, weight: 1 },
      { intentId: 'reversion-halo', preferredSlot: 4, weight: 2 },
    ],
  },
  {
    id: 'slag-sentinel',
    name: '熔渣哨兵',
    tier: 'elite',
    act: [2, 3],
    maxHp: [86, 98],
    intentsPerTurn: 1,
    art: 'slag-sentinel',
    intentScript: [
      { intentId: 'anvil-fall', preferredSlot: 3, weight: 3 },
      { intentId: 'slag-guard', preferredSlot: 4, weight: 3 },
      { intentId: 'carapace', preferredSlot: 4, weight: 2 },
      { intentId: 'mirror-verdict', preferredSlot: 3, weight: 2 },
    ],
  },
  {
    id: 'chain-vicar',
    name: '锁誓代牧',
    tier: 'elite',
    act: [2, 3],
    maxHp: [80, 92],
    intentsPerTurn: 1,
    art: 'chain-vicar',
    intentScript: [
      { intentId: 'bound-blow', preferredSlot: 3, weight: 3 },
      { intentId: 'discord', preferredSlot: 4, weight: 2 },
      { intentId: 'seal', preferredSlot: 4, weight: 1 },
      { intentId: 'spite-lash', preferredSlot: 3, weight: 2 },
    ],
  },
  {
    // 两个意图都只认 slot 1，第二个必然撞上已占的格位并转为蓄力
    id: 'deep-winder',
    name: '深绞者',
    tier: 'elite',
    act: [3],
    maxHp: [104, 118],
    intentsPerTurn: 2,
    art: 'deep-winder',
    intentScript: [
      { intentId: 'wind-deep', preferredSlot: 1, weight: 3 },
      { intentId: 'coil-tight', preferredSlot: 1, weight: 2 },
    ],
  },
  {
    id: 'bell-tyrant',
    name: '鸣钟暴君',
    tier: 'boss',
    act: [1],
    maxHp: [132, 132],
    intentsPerTurn: 1,
    art: 'bell-tyrant',
    intentScript: [
      { intentId: 'toll', preferredSlot: 1, weight: 2 },
      { intentId: 'swarm', preferredSlot: 4, weight: 3 },
      { intentId: 'harden', preferredSlot: 4, weight: 2 },
    ],
    phases: [
      {
        atHpRatio: 0.5,
        name: '裂钟',
        intentsPerTurn: 2,
        onEnter: [{ status: 'thorns', amount: 2 }],
        intentScript: [
          { intentId: 'toll', preferredSlot: 2, weight: 3 },
          { intentId: 'shatterpoint', preferredSlot: 4, weight: 3 },
          { intentId: 'bristle-up', preferredSlot: 4, weight: 2 },
        ],
      },
    ],
  },
  {
    id: 'orrery-reversed',
    name: '逆位天仪',
    tier: 'boss',
    act: [2],
    maxHp: [330, 330],
    intentsPerTurn: 2,
    art: 'orrery-reversed',
    intentScript: [
      { intentId: 'reversal', preferredSlot: 2, weight: 3 },
      { intentId: 'shatterpoint', preferredSlot: 4, weight: 3 },
      { intentId: 'drift', preferredSlot: 4, weight: 2 },
    ],
    phases: [
      {
        atHpRatio: 0.66,
        name: '星环倒转',
        onEnter: [{ status: 'ward', amount: 4 }],
        intentScript: [
          { intentId: 'reversal', preferredSlot: 1, weight: 3 },
          { intentId: 'carapace', preferredSlot: 4, weight: 2 },
          { intentId: 'seal', preferredSlot: 3, weight: 2 },
        ],
      },
      {
        atHpRatio: 0.3,
        name: '归位',
        intentsPerTurn: 3,
        onEnter: [{ status: 'strength', amount: 3 }],
        intentScript: [
          { intentId: 'shatterpoint', preferredSlot: 2, weight: 3 },
          { intentId: 'anvil-fall', preferredSlot: 3, weight: 3 },
          { intentId: 'reversal', preferredSlot: 1, weight: 2 },
        ],
      },
    ],
  },
  {
    id: 'first-weaver',
    name: '初代织时者',
    tier: 'boss',
    act: [3],
    maxHp: [152, 152],
    intentsPerTurn: 2,
    art: 'first-weaver',
    intentScript: [
      { intentId: 'unmake', preferredSlot: 1, weight: 2 },
      { intentId: 'first-thread', preferredSlot: 4, weight: 3 },
      { intentId: 'wind-back', preferredSlot: 3, weight: 2 },
      { intentId: 'mirror-shell', preferredSlot: 4, weight: 2 },
    ],
  },
  {
    id: 'plumb-magistrate',
    name: '垂锤执政官',
    tier: 'boss',
    act: [1],
    maxHp: [152, 152],
    intentsPerTurn: 2,
    art: 'plumb-magistrate',
    intentScript: [
      { intentId: 'plumb-drop', preferredSlot: 1, weight: 2 },
      { intentId: 'arc-sweep', preferredSlot: 4, weight: 3 },
      { intentId: 'harden', preferredSlot: 4, weight: 3 },
    ],
  },
];
