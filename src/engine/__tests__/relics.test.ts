import { describe, expect, it, beforeAll } from 'vitest';
import { loadContent, STARTER_DECK } from '@content/index';
import { costOf, createCombat, reduce, type CombatSetup } from '../combat';
import { cardDef } from '../registry';
import { countEntries, entriesOf, entryAt, push, rewind } from '../track';
import { NO_MODIFIERS, type CombatModifiers, type CombatState } from '../types';

beforeAll(() => loadContent());

function mods(patch: Partial<CombatModifiers>): CombatModifiers {
  return { ...NO_MODIFIERS, ...patch };
}

function setup(overrides: Partial<CombatSetup> = {}): CombatState {
  return createCombat({
    seed: 4242,
    deck: STARTER_DECK.map((defId) => ({ defId, upgraded: false })),
    maxHp: 70,
    enemies: [
      {
        defId: 'mote-gnaw',
        name: '时蚀虫',
        maxHp: 300,
        intentsPerTurn: 1,
        intentScript: [{ intentId: 'gnaw', preferredSlot: 4, weight: 1 }],
      },
    ],
    ...overrides,
  });
}

/** 把指定牌塞进手牌，绕开抽牌随机性。 */
function stack(state: CombatState, defIds: string[]): CombatState {
  const next = structuredClone(state);
  for (const defId of defIds) {
    next.hand.push({ uid: next.uidCounter++, defId, upgraded: false });
  }
  next.player.energy = 20;
  return next;
}

function playFirst(state: CombatState, defId: string, slot?: number): CombatState {
  const card = state.hand.find((c) => c.defId === defId);
  if (!card) throw new Error(`手牌中没有 ${defId}`);
  return reduce(state, { type: 'playCard', uid: card.uid, targetIndex: 0, slot });
}

describe('遗物修饰：牌的去向', () => {
  it('salvageToDraw 把被挤出的牌洗回抽牌堆', () => {
    let state = stack(setup({ mods: mods({ salvageToDraw: true }) }), [
      'threadbind',
      'threadbind',
      'threadbind',
      'threadbind',
      'threadbind',
    ]);
    const drawBefore = state.drawPile.length;
    for (let i = 0; i < 5; i++) state = playFirst(state, 'threadbind');

    expect(state.burnedPile).toHaveLength(0);
    expect(state.drawPile.length).toBe(drawBefore + 1);
  });

  it('payoffOnBurn 让被挤出的条目照常兑现赌注', () => {
    const fill = (extra: Partial<CombatModifiers>) => {
      let state = stack(setup({ mods: mods(extra) }), [
        'hedged-thread',
        'threadbind',
        'threadbind',
        'threadbind',
        'threadbind',
      ]);
      state = playFirst(state, 'hedged-thread');
      for (let i = 0; i < 3; i++) state = playFirst(state, 'threadbind');
      return playFirst(state, 'threadbind');
    };

    expect(fill({ payoffOnBurn: true }).events.some((e) => e.type === 'payoff')).toBe(true);
    expect(fill({}).events.some((e) => e.type === 'payoff')).toBe(false);
  });
});

describe('遗物修饰：引爆与出牌', () => {
  it('igniteKeepsEntry 让条目留在轨上并保留一次结算', () => {
    let state = stack(setup({ mods: mods({ igniteKeepsEntry: true, igniteEfficiency: 0.5 }) }), [
      'threadbind',
      'threadbind',
      'collapse',
    ]);
    state = playFirst(state, 'threadbind');
    state = playFirst(state, 'threadbind');
    state = playFirst(state, 'collapse');

    expect(countEntries(state, 'player')).toBe(2);
    expect(entryAt(state, 'player', 1)?.echoBudget).toBe(1);
  });

  it('默认引爆后条目退场', () => {
    let state = stack(setup(), ['threadbind', 'threadbind', 'collapse']);
    state = playFirst(state, 'threadbind');
    state = playFirst(state, 'threadbind');
    state = playFirst(state, 'collapse');

    expect(countEntries(state, 'player')).toBe(0);
  });

  it('firstWeaveFree 只免掉每回合的第一张织牌', () => {
    let state = stack(setup({ mods: mods({ firstWeaveFree: true }) }), ['threadbind', 'threadbind']);
    expect(costOf(state, cardDef('threadbind'))).toBe(0);

    const energyBefore = state.player.energy;
    state = playFirst(state, 'threadbind');
    expect(state.player.energy).toBe(energyBefore);
    expect(costOf(state, cardDef('threadbind'))).toBe(cardDef('threadbind').cost);
  });
});

describe('遗物修饰：轨道操作', () => {
  it('fullSteal 使窃取来的意图按全额结算', () => {
    let state = stack(setup({ mods: mods({ fullSteal: true }) }), ['cross-cut']);
    const slot = entriesOf(state, 'enemy')[0]!.slot;
    state = playFirst(state, 'cross-cut', slot);
    expect(entryAt(state, 'player', 1)?.rateMod).toBe(1);
  });

  it('freeFreeze 冻结时不扣结算次数', () => {
    const run = (extra: Partial<CombatModifiers>) => {
      let state = stack(setup({ mods: mods(extra) }), ['threadbind', 'jam-escapement']);
      state = playFirst(state, 'threadbind');
      const budget = entryAt(state, 'player', 1)!.echoBudget;
      state = playFirst(state, 'jam-escapement', 1);
      return { budget, after: entryAt(state, 'player', 1)!.echoBudget };
    };

    const free = run({ freeFreeze: true });
    expect(free.after).toBe(free.budget);
    const paid = run({});
    expect(paid.after).toBe(paid.budget - 1);
  });

  it('rewindBonus 提高单个条目的回拨次数上限', () => {
    const run = (extra: Partial<CombatModifiers>) => {
      let state = stack(setup({ mods: mods(extra) }), ['threadbind']);
      state = playFirst(state, 'threadbind');
      push(state, 'player', 1, 2);
      rewind(state, 'player', 3, 1);
      rewind(state, 'player', 2, 1);
      return entryAt(state, 'player', 1) !== null;
    };

    expect(run({ rewindBonus: 1 })).toBe(true);
    expect(run({})).toBe(false);
  });
});
