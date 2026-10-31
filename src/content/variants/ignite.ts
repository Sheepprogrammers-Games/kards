/** 引牌的另一种写法。一次性清算轨上的回响，变体改的是筛选范围与附带效果。 */

import type { CardVariant } from '@engine/types';

export const IGNITE_VARIANTS: Record<string, CardVariant[]> = {
  collapse: [
    {
      text: '引爆最新的 2 个条目。造成 2 点伤害。',
      ignite: { filter: 'newest', count: 2 },
      effects: [{ kind: 'damage', amount: 2, scaleMode: 'SCALAR', target: 'target' }],
    },
    {
      text: '引爆全部条目。抽 1 张牌。使你获得 2 层虚弱。',
      ignite: { filter: 'all' },
      effects: [
        { kind: 'draw', amount: 1, scaleMode: 'ONCE' },
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'weak', target: 'self' },
      ],
    },
  ],

  'draw-the-arc': [
    {
      text: '引爆最新的 1 个条目。造成 3 点伤害。施加 1 层易伤。',
      effects: [
        { kind: 'damage', amount: 3, scaleMode: 'SCALAR', target: 'target' },
        { kind: 'applyStatus', amount: 1, scaleMode: 'SCALAR', status: 'vulnerable', target: 'target' },
      ],
    },
    {
      text: '引爆全部条目。抽 1 张牌。',
      cost: 2,
      ignite: { filter: 'all' },
      effects: [{ kind: 'draw', amount: 1, scaleMode: 'ONCE' }],
    },
  ],

  'lens-of-noon': [
    {
      text: '引爆最旧的 1 个条目。对所有敌人造成 2 点伤害。',
      ignite: { filter: 'oldest', count: 1 },
      effects: [{ kind: 'damage', amount: 2, scaleMode: 'SCALAR', target: 'allEnemies' }],
    },
    {
      text: '引爆全部条目。造成 3 点伤害。',
      cost: 2,
      ignite: { filter: 'all' },
      effects: [{ kind: 'damage', amount: 3, scaleMode: 'SCALAR', target: 'target' }],
    },
  ],

  'cascade-call': [
    {
      text: '引爆全部条目。对所有敌人施加 2 层虚弱。',
      effects: [
        { kind: 'applyStatus', amount: 2, scaleMode: 'SCALAR', status: 'weak', target: 'allEnemies' },
      ],
    },
    {
      text: '引爆最新的 2 个条目。获得 3 点护甲。',
      cost: 1,
      ignite: { filter: 'newest', count: 2 },
      effects: [{ kind: 'block', amount: 3, scaleMode: 'SCALAR', target: 'self' }],
    },
  ],

  'amber-conduit': [
    {
      text: '引爆最旧的 1 个条目。',
      ignite: { filter: 'oldest', count: 1 },
    },
    {
      text: '留存。引爆最新的 1 个条目。',
      retain: true,
    },
  ],

  'resonance-lance': [
    {
      text: '引爆最新的 1 个条目。造成 3 点伤害 2 次。',
      effects: [{ kind: 'damage', amount: 3, hits: 2, scaleMode: 'SCALAR', target: 'target' }],
    },
    {
      text: '引爆最新的 2 个条目。造成 8 点伤害。',
      cost: 2,
      ignite: { filter: 'newest', count: 2 },
      effects: [{ kind: 'damage', amount: 8, scaleMode: 'SCALAR', target: 'target' }],
    },
  ],

  'focal-hour': [
    {
      text: '引爆最旧的 1 个条目。抽 2 张牌。',
      effects: [{ kind: 'draw', amount: 2, scaleMode: 'ONCE' }],
    },
    {
      text: '引爆最旧的 1 个条目。对所有敌人造成 4 点伤害。',
      effects: [{ kind: 'damage', amount: 4, scaleMode: 'SCALAR', target: 'allEnemies' }],
    },
  ],

  'widening-cone': [
    {
      text: '引爆全部条目。对所有敌人施加 2 层易伤。',
      effects: [
        {
          kind: 'applyStatus',
          amount: 2,
          scaleMode: 'SCALAR',
          status: 'vulnerable',
          target: 'allEnemies',
        },
      ],
    },
    {
      text: '引爆最新的 2 个条目。对所有敌人造成 3 点伤害。',
      cost: 1,
      ignite: { filter: 'newest', count: 2 },
      effects: [{ kind: 'damage', amount: 3, scaleMode: 'SCALAR', target: 'allEnemies' }],
    },
  ],

  'golden-recital': [
    {
      text: '引爆最新的 1 个条目。抽 2 张牌。',
      cost: 1,
      ignite: { filter: 'newest', count: 1 },
    },
    {
      text: '引爆全部条目。对所有敌人造成 3 点伤害。抽 1 张牌。',
      effects: [
        { kind: 'damage', amount: 3, scaleMode: 'SCALAR', target: 'allEnemies' },
        { kind: 'draw', amount: 1, scaleMode: 'ONCE' },
      ],
    },
  ],

  'prism-of-echoes': [
    {
      text: '引爆全部条目。获得 1 点能量。抽 2 张牌。',
      effects: [
        { kind: 'gainEnergy', amount: 1, scaleMode: 'ONCE' },
        { kind: 'draw', amount: 2, scaleMode: 'ONCE' },
      ],
    },
    {
      text: '引爆最新的 2 个条目。获得 1 点能量。抽 1 张牌。',
      cost: 1,
      ignite: { filter: 'newest', count: 2 },
      effects: [
        { kind: 'gainEnergy', amount: 1, scaleMode: 'ONCE' },
        { kind: 'draw', amount: 1, scaleMode: 'ONCE' },
      ],
    },
  ],

  'burning-meridian': [
    {
      text: '引爆全部条目。对所有敌人造成 3 点伤害，并施加 2 层中毒。',
      effects: [
        { kind: 'damage', amount: 3, scaleMode: 'SCALAR', target: 'allEnemies' },
        { kind: 'applyStatus', amount: 2, scaleMode: 'SCALAR', status: 'poison', target: 'allEnemies' },
      ],
    },
    {
      text: '引爆最新的 1 个条目。对所有敌人施加 4 层中毒。',
      cost: 1,
      ignite: { filter: 'newest', count: 1 },
    },
  ],

  'summon-afterimage': [
    {
      text: '引爆全部条目。获得 1 层力量。获得 1 层护盾。',
      effects: [
        { kind: 'selfStatus', amount: 1, scaleMode: 'SCALAR', status: 'strength', target: 'self' },
        { kind: 'selfStatus', amount: 1, scaleMode: 'SCALAR', status: 'ward', target: 'self' },
      ],
    },
    {
      text: '引爆最新的 1 个条目。获得 2 层力量。',
      cost: 1,
      ignite: { filter: 'newest', count: 1 },
    },
  ],

  'ember-tap': [
    {
      text: '引爆最旧的 1 个条目。施加 3 层中毒。',
      effects: [
        { kind: 'applyStatus', amount: 3, scaleMode: 'SCALAR', status: 'poison', target: 'target' },
      ],
    },
    {
      text: '引爆最旧的 2 个条目。',
      ignite: { filter: 'oldest', count: 2 },
      effects: [],
    },
  ],

  'deep-channel': [
    {
      text: '引爆全部条目。使你获得 2 层虚弱。将一张停梭置入你的弃牌堆。',
      cost: 2,
      ignite: { filter: 'all' },
      effects: [
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'weak', target: 'self' },
        { kind: 'createCard', amount: 1, scaleMode: 'ONCE', cardId: 'patient-weft', pile: 'discard' },
      ],
    },
    {
      text: '引爆最旧的 2 个条目。使你获得 1 层虚弱。将一张停梭置入你的弃牌堆。',
      effects: [
        { kind: 'selfStatus', amount: 1, scaleMode: 'SCALAR', status: 'weak', target: 'self' },
        { kind: 'createCard', amount: 1, scaleMode: 'ONCE', cardId: 'patient-weft', pile: 'discard' },
      ],
    },
  ],

  'split-flare': [
    {
      text: '引爆最新的 1 个条目。造成 2 点伤害 2 次。',
      ignite: { filter: 'newest', count: 1 },
      effects: [{ kind: 'damage', amount: 2, hits: 2, scaleMode: 'SCALAR', target: 'target' }],
    },
    {
      text: '引爆最新的 2 个条目。使你获得 2 层虚弱。',
      cost: 0,
      effects: [{ kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'weak', target: 'self' }],
    },
  ],

  'pinhole-burst': [
    {
      text: '引爆最新的 1 个条目。对所有敌人造成 2 点伤害，并施加 1 层易伤。',
      effects: [
        { kind: 'damage', amount: 2, scaleMode: 'SCALAR', target: 'allEnemies' },
        {
          kind: 'applyStatus',
          amount: 1,
          scaleMode: 'SCALAR',
          status: 'vulnerable',
          target: 'allEnemies',
        },
      ],
    },
    {
      text: '引爆最旧的 1 个条目。对所有敌人造成 3 点伤害，无视护甲与护盾。',
      ignite: { filter: 'oldest', count: 1 },
      effects: [
        { kind: 'damage', amount: 3, scaleMode: 'SCALAR', target: 'allEnemies', pierce: true },
      ],
    },
  ],

  'chorus-of-hands': [
    {
      text: '引爆全部条目。抽 3 张牌。',
      cost: 2,
      effects: [{ kind: 'draw', amount: 3, scaleMode: 'ONCE' }],
    },
    {
      text: '引爆全部条目。对所有敌人造成 3 点伤害。使你获得 2 层虚弱。',
      effects: [
        { kind: 'damage', amount: 3, scaleMode: 'SCALAR', target: 'allEnemies' },
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'weak', target: 'self' },
      ],
    },
  ],

  'last-toll': [
    {
      text: '引爆全部条目。造成 12 点伤害。使你获得 3 层虚弱。将一张静滞机芯置入你的弃牌堆。',
      effects: [
        { kind: 'damage', amount: 12, scaleMode: 'SCALAR', target: 'target' },
        { kind: 'selfStatus', amount: 3, scaleMode: 'SCALAR', status: 'weak', target: 'self' },
        {
          kind: 'createCard',
          amount: 1,
          scaleMode: 'ONCE',
          cardId: 'quiet-movement',
          pile: 'discard',
        },
      ],
    },
    {
      text: '引爆全部条目。造成 10 点伤害。将一张静滞机芯置入你的弃牌堆。',
      cost: 3,
      effects: [
        { kind: 'damage', amount: 10, scaleMode: 'SCALAR', target: 'target' },
        {
          kind: 'createCard',
          amount: 1,
          scaleMode: 'ONCE',
          cardId: 'quiet-movement',
          pile: 'discard',
        },
      ],
    },
  ],

  'full-chime': [
    {
      text: '引爆全部条目。对所有敌人造成 5 点伤害。获得 3 层护盾。',
      effects: [
        { kind: 'damage', amount: 5, scaleMode: 'SCALAR', target: 'allEnemies' },
        { kind: 'selfStatus', amount: 3, scaleMode: 'SCALAR', status: 'ward', target: 'self' },
      ],
    },
    {
      text: '引爆全部条目。对所有敌人造成 4 点伤害。获得 4 点护甲。',
      cost: 2,
      effects: [
        { kind: 'damage', amount: 4, scaleMode: 'SCALAR', target: 'allEnemies' },
        { kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' },
      ],
    },
  ],

  'hollow-toll': [
    {
      text: '引爆最新的 2 个条目。造成 2 点伤害，无视护甲与护盾。',
      ignite: { filter: 'newest', count: 2 },
      effects: [{ kind: 'damage', amount: 2, scaleMode: 'SCALAR', target: 'target', pierce: true }],
    },
    {
      text: '引爆最旧的 1 个条目。造成 3 点伤害，无视护甲与护盾。',
      ignite: { filter: 'oldest', count: 1 },
    },
  ],

  'noon-verdict': [
    {
      text: '引爆全部条目。造成 3 点伤害 2 次；目标生命不高于 50% 时每次伤害翻倍。',
      effects: [
        { kind: 'damage', amount: 3, hits: 2, scaleMode: 'SCALAR', target: 'target', execute: 0.5 },
      ],
    },
    {
      text: '引爆最新的 1 个条目。造成 6 点伤害；目标生命不高于 50% 时该次伤害翻倍。',
      cost: 1,
      ignite: { filter: 'newest', count: 1 },
    },
  ],

  'spill-hour': [
    {
      text: '引爆最旧的 2 个条目。造成 4 点伤害；击杀目标后溢出伤害转给下一个敌人。',
      ignite: { filter: 'oldest', count: 2 },
      effects: [{ kind: 'damage', amount: 4, scaleMode: 'SCALAR', target: 'target', overkill: true }],
    },
    {
      text: '引爆全部条目。造成 6 点伤害；击杀目标后溢出伤害转给下一个敌人。',
      cost: 2,
      ignite: { filter: 'all' },
    },
  ],

  'bell-shell': [
    {
      text: '引爆全部条目。获得 3 层荆棘。',
      effects: [{ kind: 'selfStatus', amount: 3, scaleMode: 'SCALAR', status: 'thorns', target: 'self' }],
    },
    {
      text: '引爆最新的 2 个条目。获得 1 层护盾。',
      cost: 1,
      ignite: { filter: 'newest', count: 2 },
      effects: [{ kind: 'selfStatus', amount: 1, scaleMode: 'SCALAR', status: 'ward', target: 'self' }],
    },
  ],

  'mirror-cascade': [
    {
      text: '引爆全部条目。获得 1 层护盾。获得 2 层转嫁。',
      effects: [
        { kind: 'selfStatus', amount: 1, scaleMode: 'SCALAR', status: 'ward', target: 'self' },
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'reflect', target: 'self' },
      ],
    },
    {
      text: '引爆最新的 2 个条目。获得 2 层转嫁。',
      cost: 1,
      ignite: { filter: 'newest', count: 2 },
      effects: [
        { kind: 'selfStatus', amount: 2, scaleMode: 'SCALAR', status: 'reflect', target: 'self' },
      ],
    },
  ],

  relight: [
    {
      text: '引爆最旧的 1 个条目。施加 4 层灼烧。抽 1 张牌。',
      effects: [
        { kind: 'applyStatus', amount: 4, scaleMode: 'SCALAR', status: 'burn', target: 'target' },
        { kind: 'draw', amount: 1, scaleMode: 'ONCE' },
      ],
    },
    {
      text: '引爆最旧的 2 个条目。获得 3 点护甲。',
      ignite: { filter: 'oldest', count: 2 },
      effects: [{ kind: 'block', amount: 3, scaleMode: 'SCALAR', target: 'self' }],
    },
  ],
};
