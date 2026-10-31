import { describe, expect, it, beforeAll } from 'vitest';
import { loadContent, STARTER_DECK } from '@content/index';
import { ENEMIES } from '@content/enemies';
import { EQUIPMENT } from '@content/equipment';
import { collectEquipModifiers, equippedIds } from '../equipment';
import { canPlay, createCombat, manipulationLane, reduce } from '../combat';
import { cardDef } from '../registry';
import { countEntries } from '../track';
import type { CombatState, EquipSlot } from '../types';

beforeAll(() => loadContent());

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
    let next = current;
    for (const pick of ranked) {
      const def = cardDef(pick.defId);
      if (!def.needsSlot) {
        next = reduce(current, { type: 'playCard', uid: pick.uid, targetIndex: 0 });
      } else {
        const lane = manipulationLane(def) ?? 'player';
        const occupied = [5, 4, 3, 2, 1].filter((slot) => current.track[lane][slot - 1]);
        for (const slot of occupied) {
          next = reduce(current, {
            type: 'playCard',
            uid: pick.uid,
            targetIndex: 0,
            slot,
            laneTarget: lane,
          });
          if (next !== current) break;
        }
      }
      if (next !== current) break;
    }
    if (next === current) break;
    current = next;
    if (current.result !== 'ongoing') return current;
  }
  return reduce(current, { type: 'endTurn' });
}

type Loadout = Record<EquipSlot, string | null>;

const SLOTS: EquipSlot[] = ['weapon', 'armor', 'trinket', 'core'];

const NONE: Loadout = { weapon: null, armor: null, trinket: null, core: null };

/** 某稀有度的全部满装组合，逐槽轮换该稀有度的候选，覆盖到每一件。 */
function loadoutsOf(rarity: string): Loadout[] {
  const pools = SLOTS.map((slot) => EQUIPMENT.filter((e) => e.slot === slot && e.rarity === rarity));
  const width = Math.max(...pools.map((p) => p.length));
  const out: Loadout[] = [];
  for (let i = 0; i < width; i++) {
    const load: Loadout = { ...NONE };
    SLOTS.forEach((slot, k) => {
      const pool = pools[k]!;
      load[slot] = pool.length ? (pool[i % pool.length]?.id ?? null) : null;
    });
    out.push(load);
  }
  return out;
}

function run(seed: number, enemyId: string, equipment: Loadout) {
  const def = ENEMIES.find((e) => e.id === enemyId)!;
  let state = createCombat({
    seed,
    deck: STARTER_DECK.map((defId) => ({ defId, upgraded: false })),
    maxHp: 70,
    mods: collectEquipModifiers(equipment),
    equipment: equippedIds(equipment),
    enemies: [
      {
        defId: def.id,
        name: def.name,
        maxHp: def.maxHp[0],
        intentsPerTurn: def.intentsPerTurn,
        intentScript: def.intentScript,
        startingStatuses: def.startingStatuses,
        initiative: def.initiative,
        deck: def.deck,
      },
    ],
  });
  for (let turn = 0; turn < 60 && state.result === 'ongoing'; turn++) state = takeTurn(state);
  return { win: state.result === 'victory', turns: state.turn, hp: state.player.hp };
}

const TARGETS = ENEMIES.filter((e) => e.tier === 'elite' || e.tier === 'boss').slice(0, 6);
const SEEDS = 24;

interface Sample {
  win: number;
  turns: number;
  hp: number;
}

/** 一组配装在全部目标与种子上的平均表现。 */
function sample(loads: Loadout[]): Sample {
  let wins = 0;
  let turns = 0;
  let hp = 0;
  let n = 0;
  for (const load of loads) {
    for (const target of TARGETS) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const r = run(seed * 7919, target.id, load);
        if (r.win) wins++;
        turns += r.turns;
        hp += r.hp;
        n++;
      }
    }
  }
  return { win: (wins / n) * 100, turns: turns / n, hp: hp / n };
}

describe('装备强度', () => {
  it('满装备明显强于空槽，但不至于抹平难度', () => {
    const base = sample([NONE]);
    expect(base.win).toBeGreaterThan(60);
    // 手牌不再回合末清空，空装基线会比旧规则稳定，但仍不能达到稳赢。
    expect(base.win).toBeLessThan(95);

    let previousTurns = base.turns;
    for (const rarity of ['common', 'uncommon', 'rare'] as const) {
      const kit = sample(loadoutsOf(rarity));

      // 防具可能以续航而非击杀率体现收益；综合表现必须更快、存活更多，
      // 且高基准下的随机胜率不能出现明显倒退。
      expect(kit.win).toBeGreaterThanOrEqual(base.win - 5);
      expect(kit.turns).toBeLessThan(base.turns);
      expect(kit.hp).toBeGreaterThan(base.hp);

      // 上界挡住数值膨胀：四槽吃满也不能变成稳赢
      expect(kit.win).toBeLessThanOrEqual(97);
      expect(kit.turns).toBeGreaterThan(9);

      // 稀有度越高收得越快
      expect(kit.turns).toBeLessThanOrEqual(previousTurns + 0.5);
      previousTurns = kit.turns;
    }
  }, 180_000);
});
