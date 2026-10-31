/** 织牌的另一种写法。条目留在时间轨上按格位系数反复结算，变体改的是这份结算内容与对赌。 */

import type { CardVariant } from '@engine/types';

export const WEAVE_VARIANTS: Record<string, CardVariant[]> = {
  threadbind: [
    {
      text: '造成 4 点伤害。走完全程自然退场时，对最靠前的敌人造成 6 点伤害。',
      effects: [{ kind: 'damage', amount: 4, scaleMode: 'SCALAR', target: 'target' }],
      payoff: [{ kind: 'damage', amount: 6, scaleMode: 'SCALAR', target: 'frontmost' }],
    },
    {
      text: '造成 4 点伤害，并施加 1 层中毒。',
      effects: [
        { kind: 'damage', amount: 4, scaleMode: 'SCALAR', target: 'target' },
        { kind: 'applyStatus', amount: 1, scaleMode: 'SCALAR', status: 'poison', target: 'target' },
      ],
    },
  ],
  hourguard: [
    {
      text: '获得 4 点护甲。走完全程自然退场时，获得 2 层荆棘。',
      effects: [{ kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' }],
      payoff: [
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'thorns', target: 'self' },
      ],
    },
    {
      text: '获得 4 点护甲。走完全程自然退场时，恢复 6 点生命。',
      effects: [{ kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' }],
      payoff: [{ kind: 'heal', amount: 6, scaleMode: 'SCALAR', target: 'self' }],
    },
  ],
  'spool-start': [
    {
      text: '造成 2 点伤害。抽 1 张牌。',
      effects: [
        { kind: 'damage', amount: 2, scaleMode: 'SCALAR', target: 'target' },
        { kind: 'draw', amount: 1, scaleMode: 'ONCE' },
      ],
    },
    {
      text: '留存。造成 2 点伤害。',
      retain: true,
      effects: [{ kind: 'damage', amount: 2, scaleMode: 'SCALAR', target: 'target' }],
    },
  ],
  lacerate: [
    {
      text: '造成 5 点伤害。施加 2 层易伤。',
      effects: [
        { kind: 'damage', amount: 5, scaleMode: 'SCALAR', target: 'target' },
        {
          kind: 'applyStatus',
          amount: 2,
          scaleMode: 'SCALAR',
          status: 'vulnerable',
          target: 'target',
        },
      ],
    },
    {
      text: '造成 5 点伤害。走完全程自然退场时，对最靠前的敌人造成 10 点伤害。',
      effects: [{ kind: 'damage', amount: 5, scaleMode: 'SCALAR', target: 'target' }],
      payoff: [{ kind: 'damage', amount: 10, scaleMode: 'SCALAR', target: 'frontmost' }],
    },
  ],
  corrode: [
    {
      text: '施加 2 层中毒。结算系数不低于 100% 时，额外施加 4 层中毒。',
      effects: [
        { kind: 'applyStatus', amount: 2, scaleMode: 'SCALAR', status: 'poison', target: 'target' },
        {
          kind: 'applyStatus',
          amount: 4,
          scaleMode: 'THRESHOLD',
          threshold: 1,
          status: 'poison',
          target: 'target',
        },
      ],
    },
    {
      text: '施加 3 层中毒。施加 2 层虚弱。',
      effects: [
        { kind: 'applyStatus', amount: 3, scaleMode: 'SCALAR', status: 'poison', target: 'target' },
        { kind: 'applyStatus', amount: 2, scaleMode: 'SCALAR', status: 'weak', target: 'target' },
      ],
    },
  ],
  'gilded-seam': [
    {
      text: '获得 3 点护甲。恢复 3 点生命。',
      effects: [
        { kind: 'block', amount: 3, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'heal', amount: 3, scaleMode: 'SCALAR', target: 'self' },
      ],
    },
    {
      text: '获得 2 点护甲。获得 3 层再生。',
      effects: [
        { kind: 'block', amount: 2, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'selfStatus', amount: 3, scaleMode: 'SCALAR', status: 'regen', target: 'self' },
      ],
    },
  ],
  'bobbin-guard': [
    {
      text: '获得 6 点护甲。',
      effects: [{ kind: 'block', amount: 6, scaleMode: 'SCALAR', target: 'self' }],
    },
    {
      text: '留存。获得 4 点护甲。',
      retain: true,
      effects: [{ kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' }],
    },
  ],
  'warp-lattice': [
    {
      text: '造成 7 点伤害。获得 4 点护甲。',
      effects: [
        { kind: 'damage', amount: 7, scaleMode: 'SCALAR', target: 'target' },
        { kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' },
      ],
    },
    {
      text: '造成 4 点伤害。获得 7 点护甲。',
      effects: [
        { kind: 'damage', amount: 4, scaleMode: 'SCALAR', target: 'target' },
        { kind: 'block', amount: 7, scaleMode: 'SCALAR', target: 'self' },
      ],
    },
  ],
  'second-hand-vow': [
    {
      text: '造成 5 点伤害。走完全程自然退场时，对最靠前的敌人造成 8 点伤害。',
      effects: [{ kind: 'damage', amount: 5, scaleMode: 'SCALAR', target: 'target' }],
      payoff: [{ kind: 'damage', amount: 8, scaleMode: 'SCALAR', target: 'frontmost' }],
    },
    {
      text: '造成 2 点伤害 3 次。',
      effects: [{ kind: 'damage', amount: 2, hits: 3, scaleMode: 'COUNT', target: 'target' }],
    },
  ],
  'braid-of-hours': [
    {
      text: '造成 9 点伤害。',
      effects: [{ kind: 'damage', amount: 9, scaleMode: 'SCALAR', target: 'target' }],
    },
    {
      text: '造成 5 点伤害。走完全程自然退场时，对最靠前的敌人造成 5 点伤害 3 次。',
      effects: [{ kind: 'damage', amount: 5, scaleMode: 'SCALAR', target: 'target' }],
      payoff: [
        { kind: 'damage', amount: 5, hits: 3, scaleMode: 'SCALAR', target: 'frontmost' },
      ],
    },
  ],
  'thread-doubling': [
    {
      text: '施加 4 层中毒。获得 4 点护甲。',
      effects: [
        { kind: 'applyStatus', amount: 4, scaleMode: 'SCALAR', status: 'poison', target: 'target' },
        { kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' },
      ],
    },
    {
      text: '造成 3 点伤害 2 次。施加 3 层中毒。',
      effects: [
        { kind: 'damage', amount: 3, hits: 2, scaleMode: 'COUNT', target: 'target' },
        { kind: 'applyStatus', amount: 3, scaleMode: 'SCALAR', status: 'poison', target: 'target' },
      ],
    },
  ],
  'loom-anchor': [
    {
      text: '获得 5 点护甲。获得 2 层护盾。',
      effects: [
        { kind: 'block', amount: 5, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'ward', target: 'self' },
      ],
    },
    {
      text: '获得 6 点护甲。走完全程自然退场时，对最靠前的敌人造成 16 点伤害。',
      effects: [{ kind: 'block', amount: 6, scaleMode: 'SCALAR', target: 'self' }],
      payoff: [{ kind: 'damage', amount: 16, scaleMode: 'SCALAR', target: 'frontmost' }],
    },
  ],
  'mending-coil': [
    {
      text: '获得 3 点护甲。恢复 5 点生命。',
      effects: [
        { kind: 'block', amount: 3, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'heal', amount: 5, scaleMode: 'SCALAR', target: 'self' },
      ],
    },
    {
      text: '获得 5 点护甲。获得 2 层再生。',
      effects: [
        { kind: 'block', amount: 5, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'regen', target: 'self' },
      ],
    },
  ],
  'lattice-bloom': [
    {
      text: '对所有敌人造成 6 点伤害。',
      effects: [{ kind: 'damage', amount: 6, scaleMode: 'SCALAR', target: 'allEnemies' }],
    },
    {
      text: '对所有敌人造成 4 点伤害。对所有敌人施加 2 层易伤。',
      effects: [
        { kind: 'damage', amount: 4, scaleMode: 'SCALAR', target: 'allEnemies' },
        {
          kind: 'applyStatus',
          amount: 2,
          scaleMode: 'SCALAR',
          status: 'vulnerable',
          target: 'allEnemies',
        },
      ],
    },
  ],
  'spiral-ward': [
    {
      text: '获得 7 点护甲。获得 2 层护盾。',
      effects: [
        { kind: 'block', amount: 7, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'ward', target: 'self' },
      ],
    },
    {
      text: '获得 6 点护甲。获得 3 层再生。',
      effects: [
        { kind: 'block', amount: 6, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'selfStatus', amount: 3, scaleMode: 'SCALAR', status: 'regen', target: 'self' },
      ],
    },
  ],
  'hour-tapestry': [
    {
      text: '对所有敌人造成 5 点伤害。结算系数不低于 45% 时，对所有敌人额外造成 3 点伤害。',
      needsTarget: false,
      effects: [
        { kind: 'damage', amount: 5, scaleMode: 'SCALAR', target: 'allEnemies' },
        {
          kind: 'damage',
          amount: 3,
          scaleMode: 'THRESHOLD',
          threshold: 0.45,
          target: 'allEnemies',
        },
      ],
    },
    {
      text: '造成 8 点伤害。走完全程自然退场时，对最靠前的敌人造成 24 点伤害。',
      effects: [{ kind: 'damage', amount: 8, scaleMode: 'SCALAR', target: 'target' }],
      payoff: [{ kind: 'damage', amount: 24, scaleMode: 'SCALAR', target: 'frontmost' }],
    },
  ],
  'double-weft': [
    {
      text: '造成 2 点伤害。获得 2 点护甲。',
      effects: [
        { kind: 'damage', amount: 2, scaleMode: 'SCALAR', target: 'target' },
        { kind: 'block', amount: 2, scaleMode: 'SCALAR', target: 'self' },
      ],
    },
  ],
  'frayed-hem': [
    {
      text: '恢复 2 点生命。抽 1 张牌。',
      effects: [
        { kind: 'heal', amount: 2, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'draw', amount: 1, scaleMode: 'ONCE' },
      ],
    },
  ],
  'burr-thread': [
    {
      text: '造成 3 点伤害。获得 2 层荆棘。',
      effects: [
        { kind: 'damage', amount: 3, scaleMode: 'SCALAR', target: 'target' },
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'thorns', target: 'self' },
      ],
    },
    {
      text: '造成 3 点伤害。施加 2 层易伤。',
      effects: [
        { kind: 'damage', amount: 3, scaleMode: 'SCALAR', target: 'target' },
        {
          kind: 'applyStatus',
          amount: 2,
          scaleMode: 'SCALAR',
          status: 'vulnerable',
          target: 'target',
        },
      ],
    },
  ],
  'slow-spindle': [
    {
      text: '获得 4 点护甲。恢复 3 点生命。',
      effects: [
        { kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'heal', amount: 3, scaleMode: 'SCALAR', target: 'self' },
      ],
    },
    {
      text: '获得 4 点护甲。走完全程自然退场时，获得 3 层再生。',
      effects: [{ kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' }],
      payoff: [
        { kind: 'selfStatus', amount: 3, scaleMode: 'SCALAR', status: 'regen', target: 'self' },
      ],
    },
  ],
  'thread-snap': [
    {
      text: '造成 6 点伤害。打出时使你获得 1 层虚弱。',
      effects: [
        { kind: 'damage', amount: 6, scaleMode: 'SCALAR', target: 'target' },
        { kind: 'selfStatus', amount: 1, scaleMode: 'ONCE', status: 'weak', target: 'self' },
      ],
    },
    {
      text: '造成 5 点伤害。结算系数不低于 70% 时，额外造成 6 点伤害。',
      effects: [
        { kind: 'damage', amount: 5, scaleMode: 'SCALAR', target: 'target' },
        { kind: 'damage', amount: 6, scaleMode: 'THRESHOLD', threshold: 0.7, target: 'target' },
      ],
    },
  ],
  'twin-anchor': [
    {
      text: '对所有敌人造成 4 点伤害。获得 4 点护甲。',
      needsTarget: false,
      effects: [
        { kind: 'damage', amount: 4, scaleMode: 'SCALAR', target: 'allEnemies' },
        { kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' },
      ],
    },
    {
      text: '造成 4 点伤害。获得 4 点护甲。走完全程自然退场时，获得 2 层力量。',
      effects: [
        { kind: 'damage', amount: 4, scaleMode: 'SCALAR', target: 'target' },
        { kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' },
      ],
      payoff: [
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'strength', target: 'self' },
      ],
    },
  ],
  'knot-of-thirds': [
    {
      text: '造成 3 点伤害。获得 3 点护甲。恢复 3 点生命。',
      effects: [
        { kind: 'damage', amount: 3, scaleMode: 'SCALAR', target: 'target' },
        { kind: 'block', amount: 3, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'heal', amount: 3, scaleMode: 'SCALAR', target: 'self' },
      ],
    },
    {
      text: '造成 3 点伤害。结算系数不低于 45% 时，额外造成 3 点伤害；不低于 100% 时，再额外造成 3 点伤害。',
      effects: [
        { kind: 'damage', amount: 3, scaleMode: 'SCALAR', target: 'target' },
        { kind: 'damage', amount: 3, scaleMode: 'THRESHOLD', threshold: 0.45, target: 'target' },
        { kind: 'damage', amount: 3, scaleMode: 'THRESHOLD', threshold: 1, target: 'target' },
      ],
    },
  ],
  'stone-warp': [
    {
      text: '获得 9 点护甲。获得 2 层护盾。打出时使你获得 1 层虚弱。',
      effects: [
        { kind: 'block', amount: 9, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'ward', target: 'self' },
        { kind: 'selfStatus', amount: 1, scaleMode: 'ONCE', status: 'weak', target: 'self' },
      ],
    },
    {
      text: '获得 8 点护甲。走完全程自然退场时，获得 4 层护盾。',
      effects: [{ kind: 'block', amount: 8, scaleMode: 'SCALAR', target: 'self' }],
      payoff: [
        { kind: 'selfStatus', amount: 4, scaleMode: 'SCALAR', status: 'ward', target: 'self' },
      ],
    },
  ],
  'awl-thread': [
    {
      text: '造成 1 点伤害 3 次，无视护甲与护盾。',
      effects: [
        { kind: 'damage', amount: 1, hits: 3, scaleMode: 'COUNT', target: 'target', pierce: true },
      ],
    },
  ],
  'needle-run': [
    {
      text: '造成 6 点伤害，无视护甲与护盾。',
      effects: [{ kind: 'damage', amount: 6, scaleMode: 'SCALAR', target: 'target', pierce: true }],
    },
    {
      text: '造成 2 点伤害 3 次。施加 2 层中毒。',
      effects: [
        { kind: 'damage', amount: 2, hits: 3, scaleMode: 'COUNT', target: 'target' },
        { kind: 'applyStatus', amount: 2, scaleMode: 'SCALAR', status: 'poison', target: 'target' },
      ],
    },
  ],
  'siphon-weft': [
    {
      text: '造成 8 点伤害。按造成的生命损失的四分之一回复生命。',
      effects: [
        { kind: 'damage', amount: 8, scaleMode: 'SCALAR', target: 'target', lifesteal: 0.25 },
      ],
    },
    {
      text: '造成 5 点伤害。按造成的生命损失的一半回复生命。抽 1 张牌。',
      effects: [
        { kind: 'damage', amount: 5, scaleMode: 'SCALAR', target: 'target', lifesteal: 0.5 },
        { kind: 'draw', amount: 1, scaleMode: 'ONCE' },
      ],
    },
  ],
  'crimson-spindle': [
    {
      text: '造成 2 点伤害 2 次。按造成的生命损失回复等量生命。',
      effects: [
        { kind: 'damage', amount: 2, hits: 2, scaleMode: 'COUNT', target: 'target', lifesteal: 1 },
      ],
    },
    {
      text: '造成 4 点伤害。按造成的生命损失回复等量生命。施加 2 层中毒。',
      effects: [
        { kind: 'damage', amount: 4, scaleMode: 'SCALAR', target: 'target', lifesteal: 1 },
        { kind: 'applyStatus', amount: 2, scaleMode: 'SCALAR', status: 'poison', target: 'target' },
      ],
    },
  ],
  'barb-mail': [
    {
      text: '获得 3 点护甲。获得 2 层荆棘。',
      effects: [
        { kind: 'block', amount: 3, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'thorns', target: 'self' },
      ],
    },
    {
      text: '获得 4 点护甲。获得 1 层荆棘。走完全程自然退场时，获得 3 层荆棘。',
      effects: [
        { kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'selfStatus', amount: 1, scaleMode: 'SCALAR', status: 'thorns', target: 'self' },
      ],
      payoff: [
        { kind: 'selfStatus', amount: 3, scaleMode: 'SCALAR', status: 'thorns', target: 'self' },
      ],
    },
  ],
  'bramble-bulwark': [
    {
      text: '获得 4 点护甲。获得 2 层护盾。获得 2 层荆棘。',
      effects: [
        { kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'ward', target: 'self' },
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'thorns', target: 'self' },
      ],
    },
    {
      text: '获得 2 层护盾。获得 2 层荆棘。对所有敌人造成 3 点伤害。',
      effects: [
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'ward', target: 'self' },
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'thorns', target: 'self' },
        { kind: 'damage', amount: 3, scaleMode: 'SCALAR', target: 'allEnemies' },
      ],
    },
  ],
  'shell-winding': [
    {
      text: '获得 1 点护甲。获得 1 层护盾。',
      effects: [
        { kind: 'block', amount: 1, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'selfStatus', amount: 1, scaleMode: 'SCALAR', status: 'ward', target: 'self' },
      ],
    },
  ],
  'terminal-tick': [
    {
      text: '造成 3 点伤害 2 次；目标生命不高于 40% 时每次伤害翻倍。',
      effects: [
        { kind: 'damage', amount: 3, hits: 2, scaleMode: 'COUNT', target: 'target', execute: 0.4 },
      ],
    },
    {
      text: '造成 5 点伤害。走完全程自然退场时，对最靠前的敌人造成 12 点伤害；目标生命不高于 50% 时该次伤害翻倍。',
      effects: [{ kind: 'damage', amount: 5, scaleMode: 'SCALAR', target: 'target' }],
      payoff: [
        { kind: 'damage', amount: 12, scaleMode: 'SCALAR', target: 'frontmost', execute: 0.5 },
      ],
    },
  ],
  'guillotine-hour': [
    {
      text: '造成 8 点伤害；目标生命不高于 50% 时该次伤害翻倍。',
      effects: [
        { kind: 'damage', amount: 8, scaleMode: 'SCALAR', target: 'target', execute: 0.5 },
      ],
    },
    {
      text: '对所有敌人造成 4 点伤害。结算系数不低于 70% 时，对所有敌人额外造成 5 点伤害；目标生命不高于 50% 时该次额外伤害翻倍。',
      needsTarget: false,
      effects: [
        { kind: 'damage', amount: 4, scaleMode: 'SCALAR', target: 'allEnemies' },
        {
          kind: 'damage',
          amount: 5,
          scaleMode: 'THRESHOLD',
          threshold: 0.7,
          target: 'allEnemies',
          execute: 0.5,
        },
      ],
    },
  ],
  'chain-cleave': [
    {
      text: '造成 3 点伤害 2 次；击杀目标后溢出伤害转给下一个敌人。',
      effects: [
        { kind: 'damage', amount: 3, hits: 2, scaleMode: 'COUNT', target: 'target', overkill: true },
      ],
    },
    {
      text: '对所有敌人造成 5 点伤害。',
      needsTarget: false,
      effects: [{ kind: 'damage', amount: 5, scaleMode: 'SCALAR', target: 'allEnemies' }],
    },
  ],

  // 对赌：payoff 只在条目自然走完时间轨退场时结算。基础效果的数值取到在末格系数下
  // 仍不归零，否则条目提前退场，赌注会跟着提前兑现
  'hedged-thread': [
    {
      text: '获得 4 点护甲。走完全程自然退场时，获得 3 层护盾。',
      needsTarget: false,
      effects: [{ kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' }],
      payoff: [
        { kind: 'selfStatus', amount: 3, scaleMode: 'SCALAR', status: 'ward', target: 'self' },
      ],
    },
    {
      text: '获得 4 点护甲。走完全程自然退场时，对最靠前的敌人施加 4 层中毒。',
      effects: [{ kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' }],
      payoff: [
        {
          kind: 'applyStatus',
          amount: 4,
          scaleMode: 'SCALAR',
          status: 'poison',
          target: 'frontmost',
        },
      ],
    },
  ],
  'grace-period': [
    {
      text: '获得 4 点护甲。走完全程自然退场时，获得 4 层再生。',
      effects: [{ kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' }],
      payoff: [
        { kind: 'selfStatus', amount: 4, scaleMode: 'SCALAR', status: 'regen', target: 'self' },
      ],
    },
    {
      text: '获得 4 点护甲。打出时抽 1 张牌。走完全程自然退场时，恢复 4 点生命。',
      effects: [
        { kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'draw', amount: 1, scaleMode: 'ONCE' },
      ],
      payoff: [{ kind: 'heal', amount: 4, scaleMode: 'SCALAR', target: 'self' }],
    },
  ],
  'stake-the-spool': [
    {
      text: '造成 4 点伤害。获得 4 点护甲。走完全程自然退场时，对最靠前的敌人造成 12 点伤害。',
      effects: [
        { kind: 'damage', amount: 4, scaleMode: 'SCALAR', target: 'target' },
        { kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' },
      ],
      payoff: [{ kind: 'damage', amount: 12, scaleMode: 'SCALAR', target: 'frontmost' }],
    },
    {
      text: '造成 6 点伤害。打出时使你获得 1 层虚弱。走完全程自然退场时，对最靠前的敌人造成 18 点伤害。',
      effects: [
        { kind: 'damage', amount: 6, scaleMode: 'SCALAR', target: 'target' },
        { kind: 'selfStatus', amount: 1, scaleMode: 'ONCE', status: 'weak', target: 'self' },
      ],
      payoff: [{ kind: 'damage', amount: 18, scaleMode: 'SCALAR', target: 'frontmost' }],
    },
  ],
  'slow-fortune': [
    {
      text: '获得 4 点护甲。走完全程自然退场时，获得 2 层力量与 2 层再生。',
      needsTarget: false,
      effects: [{ kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' }],
      payoff: [
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'strength', target: 'self' },
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'regen', target: 'self' },
      ],
    },
  ],
  'covered-call': [
    {
      text: '获得 6 点护甲。走完全程自然退场时，获得 3 层荆棘。',
      effects: [{ kind: 'block', amount: 6, scaleMode: 'SCALAR', target: 'self' }],
      payoff: [
        { kind: 'selfStatus', amount: 3, scaleMode: 'SCALAR', status: 'thorns', target: 'self' },
      ],
    },
    {
      text: '获得 4 点护甲。打出时抽 1 张牌。走完全程自然退场时，获得 3 层转嫁。',
      effects: [
        { kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'draw', amount: 1, scaleMode: 'ONCE' },
      ],
      payoff: [
        { kind: 'selfStatus', amount: 3, scaleMode: 'SCALAR', status: 'reflect', target: 'self' },
      ],
    },
  ],
  'interest-accrues': [
    {
      text: '施加 4 层中毒。走完全程自然退场时，对最靠前的敌人造成 14 点伤害。',
      effects: [
        { kind: 'applyStatus', amount: 4, scaleMode: 'SCALAR', status: 'poison', target: 'target' },
      ],
      payoff: [{ kind: 'damage', amount: 14, scaleMode: 'SCALAR', target: 'frontmost' }],
    },
    {
      text: '施加 3 层中毒。获得 4 点护甲。走完全程自然退场时，对最靠前的敌人施加 6 层中毒。',
      effects: [
        { kind: 'applyStatus', amount: 3, scaleMode: 'SCALAR', status: 'poison', target: 'target' },
        { kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' },
      ],
      payoff: [
        {
          kind: 'applyStatus',
          amount: 6,
          scaleMode: 'SCALAR',
          status: 'poison',
          target: 'frontmost',
        },
      ],
    },
  ],
  'all-or-nothing': [
    {
      text: '获得 6 点护甲。打出时使你获得 2 层虚弱。走完全程自然退场时，对最靠前的敌人造成 26 点伤害。',
      needsTarget: false,
      effects: [
        { kind: 'block', amount: 6, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'selfStatus', amount: 2, scaleMode: 'ONCE', status: 'weak', target: 'self' },
      ],
      payoff: [{ kind: 'damage', amount: 26, scaleMode: 'SCALAR', target: 'frontmost' }],
    },
    {
      text: '造成 6 点伤害。打出时使你获得 2 层虚弱。走完全程自然退场时，对最靠前的敌人造成 14 点伤害，无视护甲与护盾。',
      effects: [
        { kind: 'damage', amount: 6, scaleMode: 'SCALAR', target: 'target' },
        { kind: 'selfStatus', amount: 2, scaleMode: 'ONCE', status: 'weak', target: 'self' },
      ],
      payoff: [
        { kind: 'damage', amount: 14, scaleMode: 'SCALAR', target: 'frontmost', pierce: true },
      ],
    },
  ],
  'borrowed-hour': [
    {
      text: '造成 5 点伤害。获得 6 点护甲。走完全程自然退场时，使你获得 4 层中毒。',
      effects: [
        { kind: 'damage', amount: 5, scaleMode: 'SCALAR', target: 'target' },
        { kind: 'block', amount: 6, scaleMode: 'SCALAR', target: 'self' },
      ],
      payoff: [
        { kind: 'selfStatus', amount: 4, scaleMode: 'SCALAR', status: 'poison', target: 'self' },
      ],
    },
    {
      text: '造成 7 点伤害。打出时抽 2 张牌。走完全程自然退场时，使你获得 4 层中毒。',
      effects: [
        { kind: 'damage', amount: 7, scaleMode: 'SCALAR', target: 'target' },
        { kind: 'draw', amount: 2, scaleMode: 'ONCE' },
      ],
      payoff: [
        { kind: 'selfStatus', amount: 4, scaleMode: 'SCALAR', status: 'poison', target: 'self' },
      ],
    },
  ],
  'pawn-the-hour': [
    {
      text: '造成 4 点伤害。获得 4 点护甲。打出时获得 1 点能量。走完全程自然退场时，使你获得 3 层虚弱。',
      effects: [
        { kind: 'damage', amount: 4, scaleMode: 'SCALAR', target: 'target' },
        { kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'gainEnergy', amount: 1, scaleMode: 'ONCE' },
      ],
      payoff: [
        { kind: 'selfStatus', amount: 3, scaleMode: 'SCALAR', status: 'weak', target: 'self' },
      ],
    },
    {
      text: '造成 5 点伤害。打出时获得 2 点能量。走完全程自然退场时，使你获得 4 层虚弱。',
      effects: [
        { kind: 'damage', amount: 5, scaleMode: 'SCALAR', target: 'target' },
        { kind: 'gainEnergy', amount: 2, scaleMode: 'ONCE' },
      ],
      payoff: [
        { kind: 'selfStatus', amount: 4, scaleMode: 'SCALAR', status: 'weak', target: 'self' },
      ],
    },
  ],
  'mirror-stance': [
    {
      text: '获得 1 点护甲。获得 1 层转嫁。',
      effects: [
        { kind: 'block', amount: 1, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'selfStatus', amount: 1, scaleMode: 'SCALAR', status: 'reflect', target: 'self' },
      ],
    },
    {
      text: '获得 2 层转嫁。打出时使你获得 1 层虚弱。',
      effects: [
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'reflect', target: 'self' },
        { kind: 'selfStatus', amount: 1, scaleMode: 'ONCE', status: 'weak', target: 'self' },
      ],
    },
  ],
  'recoil-plate': [
    {
      text: '获得 4 点护甲。获得 2 层转嫁。获得 2 层荆棘。',
      effects: [
        { kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'reflect', target: 'self' },
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'thorns', target: 'self' },
      ],
    },
    {
      text: '获得 4 点护甲。获得 2 层转嫁。打出时抽 1 张牌。',
      effects: [
        { kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'reflect', target: 'self' },
        { kind: 'draw', amount: 1, scaleMode: 'ONCE' },
      ],
    },
  ],

  // 诅咒：清除方式是打上时间轨并占据轨位，每次结算都把状态压在自己身上
  'quiet-movement': [
    {
      text: '留存。每次结算使你获得 2 层易伤。',
      effects: [
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'vulnerable', target: 'self' },
      ],
    },
  ],
  'eternal-warp': [
    {
      text: '留存。每次结算使你获得 9 层灼烧。',
      effects: [
        { kind: 'selfStatus', amount: 9, scaleMode: 'SCALAR', status: 'burn', target: 'self' },
      ],
    },
  ],
};
