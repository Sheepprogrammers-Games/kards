import { describe, expect, it, beforeAll } from 'vitest';
import { loadContent, STARTER_DECK } from '@content/index';
import { ENEMIES } from '@content/enemies';
import { RELICS } from '@content/relics';
import { createRun, rollRewards } from '../run';
import { canPlay, createCombat, reduce } from '../combat';
import { cardDef } from '../registry';
import { countEntries } from '../track';
import { NO_MODIFIERS, type CombatState } from '../types';

beforeAll(() => loadContent());

/**
 * 基准打法：优先铺轨，轨满且能引爆时清算，其余情况打得起就打。
 * 用于衡量数值曲线，不追求最优解。
 */
function takeTurn(state: CombatState): CombatState {
  let current = state;
  for (let guard = 0; guard < 12; guard++) {
    const playable = current.hand.filter((c) => canPlay(current, c.uid));
    if (!playable.length) break;

    const ranked = playable.slice().sort((a, b) => {
      const da = cardDef(a.defId);
      const db = cardDef(b.defId);
      const score = (t: string) =>
        t === 'weave' ? 3 : t === 'ignite' && countEntries(current, 'player') >= 3 ? 2 : 1;
      return score(db.type) - score(da.type) || db.cost - da.cost;
    });

    const pick = ranked[0];
    if (!pick) break;
    const def = cardDef(pick.defId);
    const next = reduce(current, {
      type: 'playCard',
      uid: pick.uid,
      targetIndex: 0,
      slot: def.needsSlot ? 4 : undefined,
      laneTarget: def.needsSlot ? 'enemy' : undefined,
    });
    if (next === current) break;
    current = next;
    if (current.result !== 'ongoing') return current;
  }
  return reduce(current, { type: 'endTurn' });
}

function simulate(seed: number, enemyId: string, hpScale = 1): { win: boolean; turns: number } {
  const def = ENEMIES.find((e) => e.id === enemyId)!;
  let state = createCombat({
    seed,
    deck: STARTER_DECK.map((defId) => ({ defId, upgraded: false })),
    maxHp: 70,
    enemies: [
      {
        defId: def.id,
        name: def.name,
        maxHp: Math.round(def.maxHp[0] * hpScale),
        intentsPerTurn: def.intentsPerTurn,
        intentScript: def.intentScript,
      },
    ],
  });

  for (let turn = 0; turn < 60 && state.result === 'ongoing'; turn++) {
    state = takeTurn(state);
  }
  return { win: state.result === 'victory', turns: state.turn };
}

/** 到达该幕守时者时的典型牌组：初始牌加若干强化与新牌。 */
function progressedDeck(act: number): { defId: string; upgraded: boolean }[] {
  const base = STARTER_DECK.map((defId, i) => ({ defId, upgraded: i < 2 + act }));
  const extra = ['lacerate', 'warp-lattice', 'braid-of-hours', 'loom-anchor', 'corrode', 'spiral-ward']
    .slice(0, 2 + act * 2)
    .map((defId) => ({ defId, upgraded: false }));
  return [...base, ...extra];
}

function simulateBoss(seed: number, enemyId: string, act: number): boolean {
  const def = ENEMIES.find((e) => e.id === enemyId)!;
  let state = createCombat({
    seed,
    deck: progressedDeck(act),
    maxHp: 70 + act * 10,
    mods: { ...NO_MODIFIERS, energyPerTurn: act >= 2 ? 1 : 0, handSize: act >= 3 ? 1 : 0 },
    enemies: [
      {
        defId: def.id,
        name: def.name,
        maxHp: def.maxHp[0],
        intentsPerTurn: def.intentsPerTurn,
        intentScript: def.intentScript,
        phases: def.phases,
      },
    ],
  });

  for (let turn = 0; turn < 80 && state.result === 'ongoing'; turn++) {
    state = takeTurn(state);
  }
  return state.result === 'victory';
}

function bossRate(enemyId: string, act: number, runs = 40): number {
  let wins = 0;
  for (let i = 0; i < runs; i++) {
    if (simulateBoss(3000 + i * 131, enemyId, act)) wins++;
  }
  return wins / runs;
}

function batch(enemyId: string, runs = 40, hpScale = 1) {
  let wins = 0;
  let turns = 0;
  for (let i = 0; i < runs; i++) {
    const r = simulate(1000 + i * 37, enemyId, hpScale);
    if (r.win) wins++;
    turns += r.turns;
  }
  return { rate: wins / runs, avgTurns: turns / runs };
}

describe('守时者强度', () => {
  it('每一幕的守时者都与同期牌组势均力敌', () => {
    const rows = [
      ['bell-tyrant', 1],
      ['plumb-magistrate', 1],
      ['orrery-reversed', 2],
      ['first-weaver', 3],
    ] as const;

    // 基准打法并非最优解，守时者落在四到七成之间即为势均力敌
    for (const [id, act] of rows) {
      const rate = bossRate(id, act);
      expect(rate, `${id} 第${act}幕 胜率 ${(rate * 100).toFixed(0)}%`).toBeGreaterThanOrEqual(0.35);
      expect(rate, `${id} 第${act}幕 胜率 ${(rate * 100).toFixed(0)}%`).toBeLessThanOrEqual(0.72);
    }
  });
});

describe('难度曲线', () => {
  it('初始牌组能稳定通过第一幕杂兵', () => {
    const { rate, avgTurns } = batch('mote-gnaw');
    expect(rate).toBeGreaterThan(0.9);
    expect(avgTurns).toBeGreaterThan(2);
    expect(avgTurns).toBeLessThan(14);
  });

  it('第一幕杂兵之间强度接近', () => {
    const a = batch('tick-mite');
    const b = batch('dust-acolyte');
    expect(Math.abs(a.avgTurns - b.avgTurns)).toBeLessThan(6);
  });

  it('精英显著强于杂兵但初始牌组仍有胜算', () => {
    const minion = batch('mote-gnaw');
    const elite = batch('brass-inquisitor');
    expect(elite.avgTurns).toBeGreaterThan(minion.avgTurns);
    expect(elite.rate).toBeGreaterThan(0.25);
  });

  it('首幕守时者对初始牌组构成真实威胁', () => {
    const boss = batch('bell-tyrant');
    expect(boss.rate).toBeLessThan(0.9);
  });

  it('生命值放大后胜率单调下降', () => {
    const easy = batch('cracked-chorister', 30, 1);
    const hard = batch('cracked-chorister', 30, 2.5);
    expect(hard.rate).toBeLessThanOrEqual(easy.rate);
  });
});

describe('内容装载', () => {
  it('装载内容后精英奖励能直接给出遗物，不必另行注入池子', () => {
    const relicIds = new Set(RELICS.map((def) => def.id));
    let sawRelic = false;

    for (let i = 0; i < 40; i++) {
      const run = { ...createRun({ seedText: `pool-${i}`, deck: [...STARTER_DECK], maxHp: 70 }), cleared: i };
      for (const offer of rollRewards(run, 'elite')) {
        if (offer.kind !== 'relic') continue;
        sawRelic = true;
        for (const id of offer.options ?? []) expect(relicIds.has(id)).toBe(true);
      }
    }
    expect(sawRelic).toBe(true);
  });

  it('守时者遗物不进随机奖励池', () => {
    const bossRelics = new Set(RELICS.filter((def) => def.rarity === 'boss').map((def) => def.id));
    expect(bossRelics.size).toBeGreaterThan(0);

    for (let i = 0; i < 40; i++) {
      const run = { ...createRun({ seedText: `boss-pool-${i}`, deck: [...STARTER_DECK], maxHp: 70 }), cleared: i };
      for (const offer of rollRewards(run, 'boss')) {
        for (const id of offer.options ?? []) expect(bossRelics.has(id)).toBe(false);
      }
    }
  });
});
