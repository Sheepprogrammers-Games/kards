/** 扰牌的另一种写法。瞬发且不占轨位，变体改的是位移原语、作用泳道与位移格数。 */

import type { CardVariant } from '@engine/types';

export const DISRUPT_VARIANTS: Record<string, CardVariant[]> = {
  shove: [
    {
      text: '将一个敌方意图延后 2 格。使你获得 1 层虚弱。',
      effects: [
        {
          kind: 'selfStatus',
          amount: 1,
          scaleMode: 'SCALAR',
          status: 'weak',
          target: 'self',
        },
      ],
      manipulations: [{ kind: 'rewind', lane: 'enemy', amount: 2 }],
    },
  ],
  foresight: [
    {
      text: '抽 1 张牌。将一个敌方意图延后一格。',
      effects: [{ kind: 'draw', amount: 1, scaleMode: 'ONCE' }],
      manipulations: [{ kind: 'rewind', lane: 'enemy', amount: 1 }],
    },
    {
      text: '抽 2 张牌。用当前状态刷新一个己方条目的施法快照。',
      manipulations: [{ kind: 'rerecord', lane: 'player' }],
    },
  ],
  'strip-gear': [
    {
      text: '对最靠前的敌人施加 2 层易伤。将一个敌方意图延后一格。',
      effects: [
        {
          kind: 'applyStatus',
          amount: 2,
          scaleMode: 'SCALAR',
          status: 'vulnerable',
          target: 'frontmost',
        },
      ],
      manipulations: [{ kind: 'rewind', lane: 'enemy', amount: 1 }],
    },
  ],
  'dead-tick': [
    {
      text: '冻结一个己方条目，本回合末不推进，并消耗其 1 点预算。获得 3 点护甲。抽 1 张牌。',
      effects: [
        { kind: 'block', amount: 3, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'draw', amount: 1, scaleMode: 'ONCE' },
      ],
      manipulations: [{ kind: 'freeze', lane: 'player' }],
    },
    {
      text: '冻结一个敌方意图，本回合末不推进。使你获得 1 层虚弱。',
      cost: 0,
      effects: [{ kind: 'selfStatus', amount: 1, scaleMode: 'SCALAR', status: 'weak', target: 'self' }],
    },
  ],
  'jam-escapement': [
    {
      text: '冻结一个敌方意图，本回合末不推进。',
      manipulations: [{ kind: 'freeze', lane: 'enemy' }],
    },
    {
      text: '将一个己方条目的预算 +1，再冻结它，本回合末不推进并消耗其 1 点预算。',
      manipulations: [
        { kind: 'sustain', lane: 'player', amount: 1 },
        { kind: 'freeze', lane: 'player' },
      ],
    },
  ],
  unwind: [
    {
      text: '将一个己方条目回溯一格并可在新格位重新结算，每个条目仅限一次。使你获得 1 层虚弱。',
      cost: 0,
      effects: [{ kind: 'selfStatus', amount: 1, scaleMode: 'SCALAR', status: 'weak', target: 'self' }],
    },
  ],
  'skip-tooth': [
    {
      text: '将同一格位上的敌方意图与己方条目各向末位推 1 格。被顶出末位的意图立刻落地，被顶出末位的己方条目烧毁。',
      manipulations: [
        { kind: 'push', lane: 'enemy', amount: 1 },
        { kind: 'push', lane: 'player', amount: 1 },
      ],
    },
  ],
  shear: [
    {
      text: '抽空一个己方条目，按其剩余系数的 30% 立即结算后退场，该条目拿不到走完全程的赌注。获得 3 点护甲。抽 1 张牌。',
      effects: [
        { kind: 'block', amount: 3, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'draw', amount: 1, scaleMode: 'ONCE' },
      ],
      manipulations: [{ kind: 'evict', lane: 'player' }],
    },
  ],
  backlash: [
    {
      text: '强制一个敌方意图立即结算，数值减半。使你获得 2 层虚弱。',
      cost: 0,
      effects: [{ kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'weak', target: 'self' }],
    },
    {
      text: '强制一个敌方意图立即结算，数值减半。对最靠前的敌人造成 5 点伤害。',
      cost: 2,
      effects: [{ kind: 'damage', amount: 5, scaleMode: 'SCALAR', target: 'frontmost' }],
    },
  ],
  wedge: [
    {
      text: '将一个己方条目的预算 +1，并将同一格位上的敌方意图延后一格。',
      manipulations: [
        { kind: 'sustain', lane: 'player', amount: 1 },
        { kind: 'rewind', lane: 'enemy', amount: 1 },
      ],
    },
  ],
  'off-beat': [
    {
      text: '抽 1 张牌。冻结一个己方条目，本回合末不推进，并消耗其 1 点预算。',
      manipulations: [{ kind: 'freeze', lane: 'player' }],
    },
    {
      text: '用当前状态刷新一个己方条目的施法快照，并将其预算 +1。',
      effects: [],
      manipulations: [
        { kind: 'rerecord', lane: 'player' },
        { kind: 'sustain', lane: 'player', amount: 1 },
      ],
    },
  ],
  'sand-in-gears': [
    {
      text: '对所有敌人施加 2 层中毒。将一个敌方意图延后一格。',
      effects: [
        {
          kind: 'applyStatus',
          amount: 2,
          scaleMode: 'SCALAR',
          status: 'poison',
          target: 'allEnemies',
        },
      ],
    },
    {
      text: '对最靠前的敌人施加 3 层中毒。冻结一个敌方意图，本回合末不推进。',
      manipulations: [{ kind: 'freeze', lane: 'enemy' }],
    },
  ],
  desync: [
    {
      text: '将一个敌方意图延后一格，并将同一格位上的己方条目向末位推 1 格；被顶出末位的己方条目烧毁，拿不到走完全程的赌注。获得 4 点护甲。',
      effects: [{ kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' }],
      manipulations: [
        { kind: 'rewind', lane: 'enemy', amount: 1 },
        { kind: 'push', lane: 'player', amount: 1 },
      ],
    },
  ],
  'fracture-line': [
    {
      text: '复制一个己方条目到最靠前的空格位，副本只结算一次且不可再被复制。使你获得 1 层虚弱。',
      cost: 1,
      effects: [{ kind: 'selfStatus', amount: 1, scaleMode: 'SCALAR', status: 'weak', target: 'self' }],
    },
  ],
  'cross-cut': [
    {
      text: '抽空一个敌方意图，按其剩余系数的 30% 立即结算后退场。对最靠前的敌人造成 6 点伤害。',
      effects: [{ kind: 'damage', amount: 6, scaleMode: 'SCALAR', target: 'frontmost' }],
      manipulations: [{ kind: 'evict', lane: 'enemy' }],
    },
  ],
  'sidestep-gear': [
    {
      text: '将一个敌方意图向末位推 2 格，前方被占用时一并顺推。被顶出末位的意图立刻落地。将一张停梭置入你的弃牌堆。',
      manipulations: [{ kind: 'push', lane: 'enemy', amount: 2 }],
    },
    {
      text: '将一个己方条目回溯一格并可在新格位重新结算，每个条目仅限一次。将一张停梭置入你的弃牌堆。',
      manipulations: [{ kind: 'rewind', lane: 'player', amount: 1 }],
    },
  ],
  'reverse-pawl': [
    {
      text: '将一个敌方意图延后 2 格，并将同一格位上的己方条目的预算 +1。',
      manipulations: [
        { kind: 'rewind', lane: 'enemy', amount: 2 },
        { kind: 'sustain', lane: 'player', amount: 1 },
      ],
    },
    {
      text: '将一个己方条目回溯一格并可在新格位重新结算，每个条目仅限一次。抽 1 张牌。',
      effects: [{ kind: 'draw', amount: 1, scaleMode: 'ONCE' }],
      manipulations: [{ kind: 'rewind', lane: 'player', amount: 1 }],
    },
  ],
  'hold-fast': [
    {
      text: '将一个己方条目的预算 +2，再冻结它，本回合末不推进并消耗其 1 点预算。获得 7 点护甲。抽 1 张牌。',
      effects: [
        { kind: 'block', amount: 7, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'draw', amount: 1, scaleMode: 'ONCE' },
      ],
      manipulations: [
        { kind: 'sustain', lane: 'player', amount: 2 },
        { kind: 'freeze', lane: 'player' },
      ],
    },
  ],
  'thread-theft': [
    {
      text: '复制一个己方条目到最靠前的空格位，副本只结算一次且不可再被复制。',
      effects: [],
      manipulations: [{ kind: 'copy', lane: 'player' }],
    },
  ],
  'bait-the-blow': [
    {
      text: '将一个敌方意图向末位推 1 格，已在末位的意图立即结算。获得 2 层转嫁。',
      effects: [
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'reflect', target: 'self' },
      ],
    },
  ],
  'set-shell': [
    {
      text: '获得 2 层护盾。冻结一个敌方意图，本回合末不推进。',
      manipulations: [{ kind: 'freeze', lane: 'enemy' }],
    },
    {
      text: '获得 2 层护盾。冻结一个己方条目，本回合末不推进，并消耗其 1 点预算。',
      manipulations: [{ kind: 'freeze', lane: 'player' }],
    },
  ],
  'blood-wedge': [
    {
      text: '将一个己方条目的预算 +1。对最靠前的敌人造成 8 点伤害，按造成的生命损失的一半回复生命。',
      effects: [
        { kind: 'damage', amount: 8, scaleMode: 'SCALAR', target: 'frontmost', lifesteal: 0.5 },
      ],
      manipulations: [{ kind: 'sustain', lane: 'player', amount: 1 }],
    },
    {
      text: '将一个敌方意图延后一格。对最靠前的敌人造成 5 点伤害，按造成的生命损失回复等量生命。',
      effects: [{ kind: 'damage', amount: 5, scaleMode: 'SCALAR', target: 'frontmost', lifesteal: 1 }],
      manipulations: [{ kind: 'rewind', lane: 'enemy', amount: 1 }],
    },
  ],
  'bared-throat': [
    {
      text: '将一个敌方意图延后一格。获得 3 层荆棘。',
      effects: [
        { kind: 'selfStatus', amount: 3, scaleMode: 'SCALAR', status: 'thorns', target: 'self' },
      ],
    },
  ],
  'settle-early': [
    {
      text: '抽空一个己方条目，按其剩余系数的 30% 立即结算后退场，该条目拿不到走完全程的赌注。使你获得 2 层虚弱。',
      cost: 0,
      effects: [{ kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'weak', target: 'self' }],
    },
  ],
  'ledger-lock': [
    {
      text: '将一个己方条目的预算 +2，并用当前状态刷新其施法快照。',
      manipulations: [
        { kind: 'sustain', lane: 'player', amount: 2 },
        { kind: 'rerecord', lane: 'player' },
      ],
    },
    {
      text: '将一个己方条目的预算 +1，再冻结它，本回合末不推进并消耗其 1 点预算。抽 1 张牌。',
      effects: [{ kind: 'draw', amount: 1, scaleMode: 'ONCE' }],
      manipulations: [
        { kind: 'sustain', lane: 'player', amount: 1 },
        { kind: 'freeze', lane: 'player' },
      ],
    },
  ],
  'traced-blade': [
    {
      text: '消耗。造成 4 点伤害 2 次。',
      effects: [{ kind: 'damage', amount: 4, hits: 2, scaleMode: 'COUNT', target: 'target' }],
    },
    {
      text: '消耗。造成 6 点伤害，无视护甲与护盾。',
      effects: [{ kind: 'damage', amount: 6, scaleMode: 'SCALAR', target: 'target', pierce: true }],
    },
  ],
  'traced-ward': [
    {
      text: '消耗。获得 3 点护甲与 2 层护盾。',
      effects: [
        { kind: 'block', amount: 3, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'ward', target: 'self' },
      ],
    },
    {
      text: '消耗。获得 5 点护甲。抽 1 张牌。',
      effects: [
        { kind: 'block', amount: 5, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'draw', amount: 1, scaleMode: 'ONCE' },
      ],
    },
  ],
  'traced-hex': [
    {
      text: '消耗。施加 2 层易伤与 2 层虚弱。',
      effects: [
        {
          kind: 'applyStatus',
          amount: 2,
          scaleMode: 'SCALAR',
          status: 'vulnerable',
          target: 'target',
        },
        { kind: 'applyStatus', amount: 2, scaleMode: 'SCALAR', status: 'weak', target: 'target' },
      ],
    },
    {
      text: '消耗。施加 5 层中毒。',
      effects: [
        { kind: 'applyStatus', amount: 5, scaleMode: 'SCALAR', status: 'poison', target: 'target' },
      ],
    },
  ],
  'light-fingers': [
    {
      text: '将一个敌方意图向末位推 1 格。被顶出末位的意图立刻落地。将两张摹刃置入你的弃牌堆。',
      effects: [
        { kind: 'createCard', amount: 2, scaleMode: 'ONCE', cardId: 'traced-blade', pile: 'discard' },
      ],
      manipulations: [{ kind: 'push', lane: 'enemy', amount: 1 }],
    },
    {
      text: '将一个敌方意图延后一格。将一张摹盾置入你的手牌。抽 1 张牌。',
      effects: [
        { kind: 'createCard', amount: 1, scaleMode: 'ONCE', cardId: 'traced-ward', pile: 'hand' },
        { kind: 'draw', amount: 1, scaleMode: 'ONCE' },
      ],
    },
  ],
  'crib-the-move': [
    {
      text: '将一张摹刃置入你的手牌。抽 1 张牌。',
      effects: [
        { kind: 'createCard', amount: 1, scaleMode: 'ONCE', cardId: 'traced-blade', pile: 'hand' },
        { kind: 'draw', amount: 1, scaleMode: 'ONCE' },
      ],
    },
    {
      text: '将一张摹咒置入你的手牌。抽 1 张牌。',
      effects: [
        { kind: 'createCard', amount: 1, scaleMode: 'ONCE', cardId: 'traced-hex', pile: 'hand' },
        { kind: 'draw', amount: 1, scaleMode: 'ONCE' },
      ],
    },
  ],
  'armory-raid': [
    {
      text: '将两张摹刃置入你的弃牌堆。',
      effects: [
        { kind: 'createCard', amount: 2, scaleMode: 'ONCE', cardId: 'traced-blade', pile: 'discard' },
      ],
    },
    {
      text: '将一张摹刃与一张摹咒置入你的弃牌堆。抽 1 张牌。',
      effects: [
        { kind: 'createCard', amount: 1, scaleMode: 'ONCE', cardId: 'traced-blade', pile: 'discard' },
        { kind: 'createCard', amount: 1, scaleMode: 'ONCE', cardId: 'traced-hex', pile: 'discard' },
        { kind: 'draw', amount: 1, scaleMode: 'ONCE' },
      ],
    },
  ],
  'pattern-theft': [
    {
      text: '将一个敌方意图延后 2 格。将一张摹刃置入你的手牌。',
      manipulations: [{ kind: 'rewind', lane: 'enemy', amount: 2 }],
    },
  ],
  'dissect-pattern': [
    {
      text: '抽空一个己方条目，按其剩余系数的 30% 立即结算后退场，该条目拿不到走完全程的赌注。将一张摹刃置入你的手牌。',
      effects: [
        { kind: 'createCard', amount: 1, scaleMode: 'ONCE', cardId: 'traced-blade', pile: 'hand' },
      ],
      manipulations: [{ kind: 'evict', lane: 'player' }],
    },
  ],
  'take-over': [
    {
      text: '窃取一个敌方意图到己方轨首，只结算一次且数值减半。',
      effects: [],
      manipulations: [{ kind: 'steal', lane: 'enemy' }],
    },
  ],
  'borrowed-form': [
    {
      text: '交换同一格位上的敌方意图与己方条目，两者归属互换，再将换来的意图的预算 +1。',
      manipulations: [
        { kind: 'swap', lane: 'enemy' },
        { kind: 'sustain', lane: 'player', amount: 1 },
      ],
    },
  ],
  overwind: [
    {
      text: '将一个敌方意图向末位推 2 格，前方被占用时一并顺推。被顶出末位的意图立刻落地。获得 4 点护甲。',
      manipulations: [{ kind: 'push', lane: 'enemy', amount: 2 }],
    },
  ],
  'back-gear': [
    {
      text: '将一个己方条目回溯一格并可在新格位重新结算，每个条目仅限一次，再将同一格位上的敌方意图延后一格。',
      manipulations: [
        { kind: 'rewind', lane: 'player', amount: 1 },
        { kind: 'rewind', lane: 'enemy', amount: 1 },
      ],
    },
  ],
  'paired-arrest': [
    {
      text: '冻结一个敌方意图，本回合末不推进，并将同一格位上的己方条目的预算 +2。',
      manipulations: [
        { kind: 'freeze', lane: 'enemy' },
        { kind: 'sustain', lane: 'player', amount: 2 },
      ],
    },
    {
      text: '冻结一个敌方意图，本回合末不推进。抽 1 张牌。',
      effects: [{ kind: 'draw', amount: 1, scaleMode: 'ONCE' }],
      manipulations: [{ kind: 'freeze', lane: 'enemy' }],
    },
  ],
};
