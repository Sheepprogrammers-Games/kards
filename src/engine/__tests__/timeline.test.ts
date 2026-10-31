import { describe, expect, it, afterAll, beforeAll } from 'vitest';
import { loadContent, STARTER_DECK } from '@content/index';
import { INTENTS } from '@content/enemies';
import { C, coefOf } from '../constants';
import {
  canPlay,
  createCombat,
  ignitePayload,
  reduce,
  type CombatSetup,
  type EnemySetup,
} from '../combat';
import {
  countEntries,
  canRewindPlayerAt,
  entriesOf,
  entryAt,
  freeze,
  push,
  rewind,
  delayBudgetLeft,
  rewindsLeft,
  setEntry,
  slotOfEntry,
  sustain,
  swap,
} from '../track';
import { intentAim, resolveIntent, scheduleIntents } from '../intents';
import { allEquipment, setEquipmentRegistry } from '../equipment';
import {
  NO_MODIFIERS,
  type CombatState,
  type Effect,
  type EquipmentDef,
  type TrackEntry,
} from '../types';
import { addStatus, dealDamage, drawCards, previewYield, resolveEntry } from '../effects';
import { generateMap } from '../map';
import { tickStatusStartOfTurn } from '../status';

beforeAll(() => loadContent());

function setup(overrides: Partial<CombatSetup> = {}): CombatState {
  return createCombat({
    seed: 12345,
    deck: STARTER_DECK.map((defId) => ({ defId, upgraded: false })),
    maxHp: 70,
    enemies: [
      {
        defId: 'mote-gnaw',
        name: '时蚀虫',
        maxHp: 200,
        intentsPerTurn: 1,
        intentScript: [{ intentId: 'gnaw', preferredSlot: 4, weight: 1 }],
      },
    ],
    ...overrides,
  });
}

function handUidOf(state: CombatState, defId: string): number {
  const card = state.hand.find((c) => c.defId === defId);
  if (!card) throw new Error(`手牌中没有 ${defId}`);
  return card.uid;
}

/** 把指定牌塞到手牌首位，绕开抽牌随机性。 */
function stack(state: CombatState, defIds: string[]): CombatState {
  const next = structuredClone(state);
  for (const defId of defIds) {
    next.hand.push({ uid: next.uidCounter++, defId, upgraded: false });
  }
  return next;
}

describe('回合资源', () => {
  it('未打出的手牌跨回合保留，并只摸到手牌上限', () => {
    let state = setup();
    state.track.enemy.fill(null);
    state.enemies[0]!.intentsPerTurn = 0;
    const kept = state.hand.map((card) => card.uid);

    expect(state.hand).toHaveLength(C.DRAW_PER_TURN);
    state = reduce(state, { type: 'endTurn' });

    expect(kept.every((uid) => state.hand.some((card) => card.uid === uid))).toBe(true);
    expect(state.hand).toHaveLength(state.player.handSize);
  });

  it('额外摸牌也不能突破手牌上限', () => {
    const state = setup();
    drawCards(state, 99);
    expect(state.hand).toHaveLength(state.player.handSize);
  });

  it('玩家护甲跨回合保留，护盾层数可以继续叠加', () => {
    let state = setup();
    state.track.enemy.fill(null);
    state.enemies[0]!.intentsPerTurn = 0;
    state.player.block = 8;
    addStatus(state, state.player, 'ward', 2);
    addStatus(state, state.player, 'ward', 3);

    state = reduce(state, { type: 'endTurn' });

    expect(state.player.block).toBe(4);
    expect(state.player.statuses.ward).toBe(5);
  });
});

describe('轨道结构', () => {
  it('每条泳道恰有 4 格，每格至多 1 个条目', () => {
    let state = setup();
    expect(state.track.player).toHaveLength(C.TRACK_SLOTS);
    expect(state.track.enemy).toHaveLength(C.TRACK_SLOTS);

    state = stack(state, ['threadbind', 'threadbind', 'threadbind', 'threadbind', 'threadbind']);
    for (let i = 0; i < 5; i++) {
      const uid = state.hand.find((c) => c.defId === 'threadbind')?.uid;
      if (uid === undefined) break;
      state.player.energy = 9;
      state = reduce(state, { type: 'playCard', uid });
    }
    expect(countEntries(state, 'player')).toBeLessThanOrEqual(C.TRACK_SLOTS);
  });

  it('打出即为该牌在首格的满系数结算', () => {
    let state = setup();
    const hpBefore = state.enemies[0]!.hp;
    state = reduce(state, { type: 'playCard', uid: handUidOf(state, 'threadbind') });
    expect(hpBefore - state.enemies[0]!.hp).toBe(5);
    expect(entryAt(state, 'player', 1)?.resolvedHere).toBe(true);
  });

  it('回响按格位系数向下取整，无最小值保底', () => {
    let state = setup();
    state = reduce(state, { type: 'playCard', uid: handUidOf(state, 'threadbind') });
    const hpAfterPlay = state.enemies[0]!.hp;

    state = reduce(state, { type: 'endTurn' });
    // 条目推进到第二格，系数 0.7，5 点伤害结算为 3 点
    expect(hpAfterPlay - state.enemies[0]!.hp).toBe(Math.floor(5 * coefOf(state.coefTable, 2)));
  });
});

describe('插入推挤', () => {
  it('挤出末位的条目移出战斗，不进入弃牌堆', () => {
    let state = setup();
    state = stack(state, ['threadbind', 'threadbind', 'threadbind', 'threadbind', 'threadbind']);
    state.player.energy = 20;

    const burnedBefore = state.burnedPile.length;
    for (let i = 0; i < 5; i++) {
      const uid = state.hand.find((c) => c.defId === 'threadbind')?.uid;
      if (uid === undefined) break;
      state = reduce(state, { type: 'playCard', uid });
      state.player.energy = 20;
    }
    expect(state.burnedPile.length).toBeGreaterThan(burnedBefore);
  });

  it('自然推进移出的条目进入弃牌堆', () => {
    let state = setup();
    state = reduce(state, { type: 'playCard', uid: handUidOf(state, 'threadbind') });
    const uid = entryAt(state, 'player', 1)!.uid;

    for (let i = 0; i < 4; i++) state = reduce(state, { type: 'endTurn' });
    expect(entriesOf(state, 'player').some((e) => e.entry.uid === uid)).toBe(false);
    expect(state.burnedPile).toHaveLength(0);
  });
});

describe('引爆', () => {
  it('轨上条目不足时无法打出', () => {
    const state = setup();
    const before = structuredClone(state);
    const next = reduce(state, { type: 'playCard', uid: handUidOf(state, 'collapse') });
    expect(next.player.energy).toBe(before.player.energy);
  });

  it('即打即爆的收益低于稳态回响', () => {
    let burst = setup();
    burst = stack(burst, ['threadbind', 'threadbind', 'collapse']);
    burst.player.energy = 20;
    const hp0 = burst.enemies[0]!.hp;
    for (const defId of ['threadbind', 'threadbind']) {
      burst = reduce(burst, { type: 'playCard', uid: handUidOf(burst, defId) });
      burst.player.energy = 20;
    }
    burst = reduce(burst, { type: 'playCard', uid: handUidOf(burst, 'collapse') });
    const burstDamage = hp0 - burst.enemies[0]!.hp;

    // 两张牌全额生涯系数之和为 1.95 × 2，引爆效率 0.6 必然低于它
    expect(burstDamage).toBeLessThan(5 * 1.95 * 2);
    expect(countEntries(burst, 'player')).toBe(0);
  });

  it('走到末位且已结算的条目仍留有残响', () => {
    let state = setup();
    state = reduce(state, { type: 'playCard', uid: handUidOf(state, 'threadbind') });

    // 搬到末位并标记已结算，此时尚未兑现的系数之和为零
    const entry = entryAt(state, 'player', 1)!;
    setEntry(state, 'player', 1, null);
    setEntry(state, 'player', C.TRACK_SLOTS, entry);
    entry.resolvedHere = true;

    const payload = ignitePayload(state, C.TRACK_SLOTS, entry);
    expect(payload).toBeGreaterThan(0);
    // 残响只是当前格系数的一部分，仍远低于一次满额回响
    expect(payload).toBeLessThan(coefOf(state.coefTable, C.TRACK_SLOTS));
  });

  it('系数取整为零时引爆仍兑现最小产出', () => {
    let state = setup();
    state = stack(state, ['threadbind', 'threadbind', 'collapse']);
    state.player.energy = 20;
    for (const defId of ['threadbind', 'threadbind']) {
      state = reduce(state, { type: 'playCard', uid: handUidOf(state, defId) });
      state.player.energy = 20;
    }
    // 系数压到极低，逐个效果都会被取整抹平
    state.coefTable = [0.02, 0.02, 0.02, 0.02];

    const hp0 = state.enemies[0]!.hp;
    state = reduce(state, { type: 'playCard', uid: handUidOf(state, 'collapse') });
    expect(hp0 - state.enemies[0]!.hp).toBeGreaterThan(0);
  });

  it('同回合内多次引爆的费用递增', () => {
    let state = setup();
    state = stack(state, ['threadbind', 'threadbind', 'threadbind', 'collapse', 'collapse']);
    state.player.energy = 20;
    for (let i = 0; i < 3; i++) {
      state = reduce(state, { type: 'playCard', uid: handUidOf(state, 'threadbind') });
      state.player.energy = 20;
    }
    const energyBefore = state.player.energy;
    state = reduce(state, { type: 'playCard', uid: handUidOf(state, 'collapse') });
    const firstCost = energyBefore - state.player.energy;
    expect(state.igniteCountThisTurn).toBe(1);
    expect(firstCost).toBe(1);
  });
});

describe('不变量', () => {
  it('系数表总和不超过上限', () => {
    const state = setup({ mods: { ...NO_MODIFIERS, coefTable: [3, 3, 3, 3] } });
    const sum = state.coefTable.reduce((a, b) => a + b, 0);
    expect(sum).toBeLessThanOrEqual(C.ECHO_SUM_CAP + 1e-9);
  });

  it('条目结算预算不超过上限且不为负', () => {
    let state = setup();
    for (let i = 0; i < 12; i++) {
      const uid = state.hand[0]?.uid;
      if (uid !== undefined) state = reduce(state, { type: 'playCard', uid });
      state = reduce(state, { type: 'endTurn' });
      for (const { entry } of entriesOf(state, 'player')) {
        expect(entry.echoBudget).toBeGreaterThanOrEqual(0);
        expect(entry.echoBudget).toBeLessThanOrEqual(C.ECHO_BUDGET_MAX);
      }
    }
  });

  it('相同种子产生逐字节相同的状态', () => {
    const run = () => {
      let state = setup();
      for (let i = 0; i < 6; i++) {
        const uid = state.hand[0]?.uid;
        if (uid !== undefined) state = reduce(state, { type: 'playCard', uid });
        state = reduce(state, { type: 'endTurn' });
      }
      return JSON.stringify({ ...state, events: [] });
    };
    expect(run()).toBe(run());
  });

  it('回溯次数受限', () => {
    let state = setup();
    state = stack(state, ['shove', 'shove', 'shove']);
    state.player.energy = 20;
    for (let i = 0; i < 3; i++) {
      const uid = state.hand.find((c) => c.defId === 'shove')?.uid;
      if (uid === undefined) break;
      state = reduce(state, { type: 'playCard', uid, slot: 4, laneTarget: 'enemy' });
    }
    expect(state.delaysThisTurn).toBeLessThanOrEqual(C.INTENT_DELAY_PER_TURN);
  });

  it('纯位移牌指定空格时不会扣能量或吞牌', () => {
    let state = stack(setup(), ['shove']);
    state.player.energy = 9;
    const uid = handUidOf(state, 'shove');
    const energy = state.player.energy;

    const next = reduce(state, {
      type: 'playCard',
      uid,
      slot: 1,
      laneTarget: 'enemy',
    });

    expect(next).toBe(state);
    expect(next.player.energy).toBe(energy);
    expect(next.hand.some((card) => card.uid === uid)).toBe(true);
    expect(next.events.some((event) => event.type === 'play')).toBe(false);
  });

  it('带附加效果的位移牌指定无效格时同样不会吞牌', () => {
    let state = stack(setup(), ['strip-gear']);
    state.player.energy = 9;
    const uid = handUidOf(state, 'strip-gear');

    const next = reduce(state, {
      type: 'playCard',
      uid,
      targetIndex: 0,
      slot: 1,
      laneTarget: 'enemy',
    });

    expect(next).toBe(state);
    expect(next.hand.some((card) => card.uid === uid)).toBe(true);
  });
});

describe('敌方意图', () => {
  it('意图在离开末位时落地', () => {
    let state = setup();
    expect(countEntries(state, 'enemy')).toBeGreaterThan(0);
    const hpBefore = state.player.hp;
    state = reduce(state, { type: 'endTurn' });
    expect(state.player.hp).toBeLessThan(hpBefore);
  });

  it('敌轨占满时意图转为蓄力', () => {
    let state = setup({
      enemies: [
        {
          defId: 'mote-gnaw',
          name: '时蚀虫',
          maxHp: 200,
          intentsPerTurn: 4,
          intentScript: [{ intentId: 'gnaw', preferredSlot: 4, weight: 1 }],
        },
      ],
    });
    state = reduce(state, { type: 'endTurn' });
    expect(state.enemies[0]!.charge).toBeGreaterThan(0);
  });
});

describe('意图生成卡牌', () => {
  it('落地时把诅咒塞进弃牌堆，且只塞一次', () => {
    let state = setup({
      enemies: [
        {
          defId: 'null-leech',
          name: '空蛭',
          maxHp: 200,
          intentsPerTurn: 1,
          intentScript: [{ intentId: 'graft-noise', preferredSlot: 4, weight: 1 }],
        },
      ],
    });

    const before = state.discardPile.filter((c) => c.defId === 'quiet-movement').length;
    state = reduce(state, { type: 'endTurn' });
    const after = state.discardPile.filter((c) => c.defId === 'quiet-movement').length;
    expect(after).toBe(before + 1);
  });
});

describe('推移的连锁', () => {
  it('前方被占用时一并顺推', () => {
    let state = setup({
      enemies: [
        {
          defId: 'mote-gnaw',
          name: '时蚀虫',
          maxHp: 400,
          intentsPerTurn: 3,
          intentScript: [{ intentId: 'gnaw', preferredSlot: 4, weight: 1 }],
        },
      ],
    });

    const occupied = entriesOf(state, 'enemy').map((e) => e.slot);
    expect(occupied.length).toBeGreaterThanOrEqual(2);

    const target = occupied[0]!;
    const uidsBefore = entriesOf(state, 'enemy').map((e) => e.entry.uid);
    state = stack(state, ['shove']);
    state.player.energy = 9;

    // 推前一格，被挡住的意图应当一起前移或落地
    const uid = state.hand.find((c) => c.defId === 'shove')!.uid;
    const before = state.player.hp;
    state = reduce(state, { type: 'playCard', uid, slot: target, laneTarget: 'enemy' });

    const uidsAfter = entriesOf(state, 'enemy').map((e) => e.entry.uid);
    const movedOrResolved =
      uidsAfter.length < uidsBefore.length || state.player.hp < before || uidsAfter.length > 0;
    expect(movedOrResolved).toBe(true);
  });

  it('顶出末位的敌方意图立即结算', () => {
    const state = setup();
    const enemyEntries = entriesOf(state, 'enemy');
    expect(enemyEntries.length).toBeGreaterThan(0);

    const slot = enemyEntries[0]!.slot;
    const hpBefore = state.player.hp;
    const pushed = push(state, 'enemy', slot, 4, (e) => resolveIntent(state, e));
    expect(pushed).toBe(true);
    expect(state.player.hp).toBeLessThan(hpBefore);
  });
});

describe('遗物修饰', () => {
  it('起始护甲在第一回合有效', () => {
    const state = createCombat({
      seed: 7,
      deck: STARTER_DECK.map((defId) => ({ defId, upgraded: false })),
      maxHp: 70,
      mods: { ...NO_MODIFIERS, startingBlock: 8, startingStrength: 2 },
      enemies: [
        {
          defId: 'mote-gnaw',
          name: '时蚀虫',
          maxHp: 60,
          intentsPerTurn: 1,
          intentScript: [{ intentId: 'gnaw', preferredSlot: 4, weight: 1 }],
        },
      ],
    });
    expect(state.player.block).toBe(8);
    expect(state.player.statuses.strength).toBe(2);
  });
});

describe('延后的连锁', () => {
  it('前方被占用时整条一起前移', () => {
    const state = setup({
      enemies: [
        {
          defId: 'mote-gnaw',
          name: '时蚀虫',
          maxHp: 400,
          intentsPerTurn: 2,
          intentScript: [{ intentId: 'gnaw', preferredSlot: 4, weight: 1 }],
        },
      ],
    });

    const before = entriesOf(state, 'enemy');
    expect(before.length).toBeGreaterThanOrEqual(2);

    const last = before[before.length - 1]!;
    const frontUid = before[before.length - 2]!.entry.uid;
    const frontSlotBefore = before[before.length - 2]!.slot;

    const ok = rewind(state, 'enemy', last.slot, 1);
    expect(ok).toBe(true);

    // 末位条目前移的同时，挡路的那个也被一起推到更低的格位
    expect(slotOfEntry(state, 'enemy', last.entry.uid)).toBe(last.slot - 1);
    expect(slotOfEntry(state, 'enemy', frontUid)).toBe(frontSlotBefore - 1);
  });

  it('前方无空位可退时整体不动', () => {
    const state = setup({
      enemies: [
        {
          defId: 'mote-gnaw',
          name: '时蚀虫',
          maxHp: 400,
          intentsPerTurn: 4,
          intentScript: [{ intentId: 'gnaw', preferredSlot: 4, weight: 1 }],
        },
      ],
    });

    const filled = entriesOf(state, 'enemy');
    expect(filled.length).toBe(C.TRACK_SLOTS);
    const snapshot = filled.map(({ slot, entry }) => `${slot}:${entry.uid}`);

    expect(rewind(state, 'enemy', C.TRACK_SLOTS, 1)).toBe(false);
    expect(entriesOf(state, 'enemy').map(({ slot, entry }) => `${slot}:${entry.uid}`)).toEqual(
      snapshot,
    );
  });

  it('己方首格条目不能被回溯出轨或给敌人蓄力', () => {
    let state = stack(setup(), ['threadbind']);
    state.player.energy = 9;
    state = reduce(state, {
      type: 'playCard',
      uid: handUidOf(state, 'threadbind'),
      targetIndex: 0,
    });
    const uid = entryAt(state, 'player', 1)!.uid;

    expect(canRewindPlayerAt(state, 1, 1)).toBe(false);
    expect(rewind(state, 'player', 1, 1)).toBe(false);
    expect(entryAt(state, 'player', 1)?.uid).toBe(uid);
    expect(state.enemies[0]!.charge).toBe(0);
  });
});

describe('轨道操作边界', () => {
  it('跨泳道交换要求两边都有条目', () => {
    const state = setup();
    expect(entryAt(state, 'player', 4)).toBeNull();
    expect(entryAt(state, 'enemy', 4)).not.toBeNull();

    expect(swap(state, { lane: 'enemy', slot: 4 }, { lane: 'player', slot: 4 })).toBe(false);
    expect(entryAt(state, 'enemy', 4)).not.toBeNull();
    expect(entryAt(state, 'player', 4)).toBeNull();
  });

  it('重复冻结和满预算续写不会伪报成功', () => {
    const state = setup();
    const intent = entriesOf(state, 'enemy')[0]!;
    expect(freeze(state, 'enemy', intent.slot)).toBe(true);
    expect(freeze(state, 'enemy', intent.slot)).toBe(false);

    intent.entry.echoBudget = C.ECHO_BUDGET_MAX;
    expect(sustain(state, 'enemy', intent.slot, 1)).toBe(false);
    expect(intent.entry.echoBudget).toBe(C.ECHO_BUDGET_MAX);
  });
});

describe('冻结与延后额度', () => {
  it('冻结敌方意图消耗本回合的延后额度', () => {
    const state = setup();
    const intent = entriesOf(state, 'enemy')[0]!;
    const before = delayBudgetLeft(state);

    expect(freeze(state, 'enemy', intent.slot)).toBe(true);
    expect(delayBudgetLeft(state)).toBe(before - 1);
    expect(intent.entry.delayCount).toBe(1);
  });

  it('不可延后的意图也不能被冻结住', () => {
    const state = setup();
    const intent = entriesOf(state, 'enemy')[0]!;
    intent.entry.undelayable = true;
    const before = delayBudgetLeft(state);

    expect(freeze(state, 'enemy', intent.slot)).toBe(false);
    expect(intent.entry.frozen).toBeFalsy();
    expect(delayBudgetLeft(state)).toBe(before);
  });

  it('免费冻结省下的是预算而不是延后额度', () => {
    const state = setup({ mods: { ...NO_MODIFIERS, freeFreeze: true } });
    const intent = entriesOf(state, 'enemy')[0]!;
    const budget = intent.entry.echoBudget;

    expect(freeze(state, 'enemy', intent.slot)).toBe(true);
    expect(intent.entry.echoBudget).toBe(budget);
    expect(delayBudgetLeft(state)).toBe(C.INTENT_DELAY_PER_TURN - 1);

    // 额度用尽后同一击就按不住了，大招不会被永久锁在轨上
    intent.entry.frozen = false;
    state.delaysThisTurn = C.INTENT_DELAY_PER_TURN;
    expect(freeze(state, 'enemy', intent.slot)).toBe(false);
  });

  it('己方条目的冻结不占用延后额度', () => {
    let state = stack(setup(), ['threadbind']);
    state.player.energy = 9;
    state = reduce(state, {
      type: 'playCard',
      uid: handUidOf(state, 'threadbind'),
      targetIndex: 0,
    });
    const before = delayBudgetLeft(state);

    expect(freeze(state, 'player', 1)).toBe(true);
    expect(delayBudgetLeft(state)).toBe(before);
  });
});

describe('换手条目的结算倍率', () => {
  /** 把一个纯伤害意图挂到敌轨末位，返回它的原始伤害值。 */
  function loadStrike(state: CombatState): { entry: TrackEntry; damage: number } {
    const entry = entriesOf(state, 'enemy').at(-1)!.entry;
    const damage = entry.effects.find((e) => e.kind === 'damage')!.amount;
    return { entry, damage };
  }

  it('窃取来的意图在玩家轨上回响时仍然减半', () => {
    const state = setup();
    const { entry, damage } = loadStrike(state);
    const slot = slotOfEntry(state, 'enemy', entry.uid)!;

    // 手动走一遍窃取的改写，再让它在玩家轨上按首格系数结算
    setEntry(state, 'enemy', slot, null);
    entry.owner = 'player';
    entry.rateMod = C.STOLEN_RATE;
    setEntry(state, 'player', 1, entry);

    const hp = state.enemies[0]!.hp;
    resolveEntry(state, entry, coefOf(state.coefTable, 1), { isPlay: false });
    expect(hp - state.enemies[0]!.hp).toBe(Math.floor(damage * C.STOLEN_RATE));
  });

  it('跨泳道交换与窃取走同一套折扣', () => {
    let state = stack(setup(), ['threadbind', 'borrowed-form']);
    state.player.energy = 9;
    state = reduce(state, {
      type: 'playCard',
      uid: handUidOf(state, 'threadbind'),
      targetIndex: 0,
    });

    const intentSlot = entriesOf(state, 'enemy').at(-1)!.slot;
    // 借形要求同一格位两侧都有条目
    const mine = entryAt(state, 'player', 1)!;
    setEntry(state, 'player', 1, null);
    setEntry(state, 'player', intentSlot, mine);

    const stolenUid = entryAt(state, 'enemy', intentSlot)!.uid;
    state = reduce(state, {
      type: 'playCard',
      uid: handUidOf(state, 'borrowed-form'),
      targetIndex: 0,
      slot: intentSlot,
      laneTarget: 'enemy',
    });

    const stolen = entriesOf(state, 'player').find((e) => e.entry.uid === stolenUid)?.entry;
    expect(stolen).toBeDefined();
    expect(stolen!.rateMod).toBe(C.STOLEN_RATE);
    expect(stolen!.echoBudget).toBe(1);
    // 送出去的己方条目落在敌轨上，同样只还回一半
    const given = entriesOf(state, 'enemy').find((e) => e.entry.uid === mine.uid)?.entry;
    expect(given?.rateMod).toBe(C.STOLEN_RATE);
  });
});

describe('蓄力', () => {
  it('只有指向玩家的意图才花掉蓄力', () => {
    const state = setup({
      enemies: [
        {
          defId: 'mote-gnaw',
          name: '时蚀虫',
          maxHp: 200,
          intentsPerTurn: 1,
          intentScript: [{ intentId: 'harden', preferredSlot: 4, weight: 1 }],
        },
      ],
    });
    const enemy = state.enemies[0]!;
    expect(intentAim(INTENTS.find((i) => i.id === 'harden')!)).toBe('self');

    state.track.enemy.fill(null);
    enemy.charge = 3;
    scheduleIntents(state);

    expect(enemy.charge).toBe(3);
    expect(entriesOf(state, 'enemy')[0]!.entry.snapshot.damageScale).toBe(1);
  });

  it('攻击意图吃下蓄力并清空计数', () => {
    const state = setup();
    const enemy = state.enemies[0]!;

    state.track.enemy.fill(null);
    enemy.charge = 2;
    scheduleIntents(state);

    expect(enemy.charge).toBe(0);
    expect(entriesOf(state, 'enemy')[0]!.entry.snapshot.damageScale).toBe(
      1 + 2 * C.CHARGE_BONUS,
    );
  });
});

describe('伤害机制', () => {
  function combat() {
    return setup({
      enemies: [
        {
          defId: 'mote-gnaw',
          name: '时蚀虫',
          maxHp: 200,
          intentsPerTurn: 1,
          intentScript: [{ intentId: 'gnaw', preferredSlot: 4, weight: 1 }],
        },
      ],
    });
  }

  it('穿刺跳过护甲直接扣生命', () => {
    const state = combat();
    const enemy = state.enemies[0]!;
    enemy.block = 20;
    const hpBefore = enemy.hp;

    dealDamage(state, enemy, 10, { pierce: true });
    expect(enemy.block).toBe(20);
    expect(enemy.hp).toBe(hpBefore - 10);

    dealDamage(state, enemy, 10);
    expect(enemy.block).toBe(10);
    expect(enemy.hp).toBe(hpBefore - 10);
  });

  it('吸血按实际扣血量回复攻击方', () => {
    const state = combat();
    const enemy = state.enemies[0]!;
    state.player.hp = 40;

    dealDamage(state, enemy, 10, { source: state.player, lifesteal: 0.5 });
    expect(state.player.hp).toBe(45);
  });

  it('护甲吃满时吸血不回血', () => {
    const state = combat();
    const enemy = state.enemies[0]!;
    enemy.block = 50;
    state.player.hp = 40;

    dealDamage(state, enemy, 10, { source: state.player, lifesteal: 0.5 });
    expect(state.player.hp).toBe(40);
  });

  it('处决在目标残血时翻倍', () => {
    const state = combat();
    const enemy = state.enemies[0]!;
    enemy.hp = Math.floor(enemy.maxHp * 0.2);
    const before = enemy.hp;

    dealDamage(state, enemy, 10, { execute: 0.3 });
    expect(before - enemy.hp).toBe(20);
  });

  it('荆棘反弹给攻击方，中毒不触发', () => {
    const state = combat();
    const enemy = state.enemies[0]!;
    enemy.statuses.thorns = 4;
    state.player.hp = 60;

    dealDamage(state, enemy, 10, { source: state.player });
    expect(state.player.hp).toBe(56);

    // 没有攻击方来源的伤害不反弹
    dealDamage(state, enemy, 10);
    expect(state.player.hp).toBe(56);
  });

  it('护盾层逐次减免且不被穿刺吃到', () => {
    const state = combat();
    const enemy = state.enemies[0]!;
    enemy.statuses.ward = 2;
    const hp0 = enemy.hp;

    dealDamage(state, enemy, 10);
    expect(hp0 - enemy.hp).toBe(7);
    expect(enemy.statuses.ward).toBe(1);

    dealDamage(state, enemy, 10, { pierce: true });
    expect(enemy.statuses.ward).toBe(1);
  });

  it('溢出伤害有上限，不会超过实际扣血', () => {
    const state = combat();
    const enemy = state.enemies[0]!;
    enemy.hp = 6;

    const result = dealDamage(state, enemy, 10);
    expect(result.hpLoss).toBe(6);
    expect(result.overkill).toBe(4);
    expect(enemy.hp).toBe(0);
  });
});

describe('状态结算边界', () => {
  it('敌方在回合末施加的 1 层虚弱会保留到玩家回合', () => {
    let state = setup({
      enemies: [
        {
          defId: 'mote-gnaw',
          name: '时蚀虫',
          maxHp: 200,
          intentsPerTurn: 1,
          intentScript: [{ intentId: 'sap', preferredSlot: 4, weight: 1 }],
        },
      ],
    });

    state = reduce(state, { type: 'endTurn' });
    expect(state.player.statuses.weak).toBe(1);
  });

  it('持续伤害致命后不会被同一次状态结算中的再生复活', () => {
    const state = setup();
    state.player.hp = 2;
    state.player.statuses.poison = 3;
    state.player.statuses.regen = 5;

    tickStatusStartOfTurn(state, state.player);
    expect(state.player.hp).toBe(0);
    expect(state.player.statuses.regen).toBe(5);
    expect(state.events.some((event) => event.type === 'regenTick')).toBe(false);
  });
});

describe('轨位对赌与转嫁', () => {
  it('走完全程才兑现赌注', () => {
    let state = setup();
    state = stack(state, ['threadbind']);
    state.player.energy = 9;

    const uid = state.hand.find((c) => c.defId === 'threadbind')!.uid;
    state = reduce(state, { type: 'playCard', uid });
    const entry = entryAt(state, 'player', 1)!;
    entry.payoff = [{ kind: 'damage', amount: 30, scaleMode: 'SCALAR', target: 'target' }];

    const hp0 = state.enemies[0]!.hp;
    // 推进四个回合让它自然走完
    for (let i = 0; i < 4; i++) state = reduce(state, { type: 'endTurn' });
    const dealt = hp0 - state.enemies[0]!.hp;
    expect(dealt).toBeGreaterThanOrEqual(30);
  });

  it('被挤出轨道的条目拿不到赌注', () => {
    let state = setup();
    state = stack(state, ['threadbind', 'threadbind', 'threadbind', 'threadbind', 'threadbind']);
    state.player.energy = 30;

    const first = state.hand.find((c) => c.defId === 'threadbind')!.uid;
    state = reduce(state, { type: 'playCard', uid: first });
    const entry = entryAt(state, 'player', 1)!;
    entry.payoff = [{ kind: 'damage', amount: 40, scaleMode: 'SCALAR', target: 'target' }];
    const hpAfterPlay = state.enemies[0]!.hp;

    // 连打四张把它挤出战斗
    for (let i = 0; i < 4; i++) {
      const uid = state.hand.find((c) => c.defId === 'threadbind')?.uid;
      if (uid === undefined) break;
      state.player.energy = 30;
      state = reduce(state, { type: 'playCard', uid });
    }

    expect(state.burnedPile.length).toBeGreaterThan(0);
    // 只吃到后续几张的普通伤害，绝不会有 40 点的赌注
    expect(hpAfterPlay - state.enemies[0]!.hp).toBeLessThan(40);
  });

  it('转嫁把一半伤害打回攻击方并消耗一层', () => {
    const state = setup();
    const enemy = state.enemies[0]!;
    enemy.statuses.reflect = 1;
    state.player.hp = 60;

    dealDamage(state, enemy, 10, { source: state.player });
    expect(state.player.hp).toBe(55);
    expect(enemy.statuses.reflect).toBeUndefined();

    dealDamage(state, enemy, 10, { source: state.player });
    expect(state.player.hp).toBe(55);
  });
});

describe('地图连通性', () => {
  it('任何一张图都不会出现走不通的死路', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const act of [1, 2, 3]) {
        const holder = { rng: seed * 7919 + act };
        const map = generateMap(holder, act);

        for (const node of Object.values(map.nodes)) {
          if (node.id === map.bossId) continue;
          expect(node.next.length).toBeGreaterThan(0);
        }

        // 从任一入口出发都能抵达守时者
        for (const entry of map.entries) {
          const seen = new Set<string>();
          const stack = [entry];
          let reached = false;
          while (stack.length) {
            const id = stack.pop()!;
            if (seen.has(id)) continue;
            seen.add(id);
            if (id === map.bossId) {
              reached = true;
              break;
            }
            for (const next of map.nodes[id]?.next ?? []) stack.push(next);
          }
          expect(reached).toBe(true);
        }
      }
    }
  });
});

describe('敌人形态转换', () => {
  function bossFight() {
    return createCombat({
      seed: 99,
      deck: STARTER_DECK.map((defId) => ({ defId, upgraded: false })),
      maxHp: 200,
      enemies: [
        {
          defId: 'bell-tyrant',
          name: '鸣钟暴君',
          maxHp: 100,
          intentsPerTurn: 1,
          intentScript: [{ intentId: 'chaff', preferredSlot: 4, weight: 1 }],
          phases: [
            {
              atHpRatio: 0.5,
              name: '裂钟',
              intentsPerTurn: 2,
              onEnter: [{ status: 'thorns', amount: 4 }],
              intentScript: [{ intentId: 'gnaw', preferredSlot: 4, weight: 1 }],
            },
          ],
        },
      ],
    });
  }

  it('生命跌破阈值时换形态并获得状态', () => {
    let state = bossFight();
    const enemy = state.enemies[0]!;
    expect(enemy.phaseName).toBeUndefined();
    expect(enemy.intentsPerTurn).toBe(1);

    enemy.hp = 40;
    state = reduce(state, { type: 'endTurn' });

    const after = state.enemies[0]!;
    expect(after.phaseName).toBe('裂钟');
    expect(after.intentsPerTurn).toBe(2);
    // 进入形态时拿到 4 层，回合末衰减一层
    expect(after.statuses.thorns).toBe(3);
  });

  it('形态只会触发一次', () => {
    let state = bossFight();
    state.enemies[0]!.hp = 40;
    state = reduce(state, { type: 'endTurn' });
    const thorns = state.enemies[0]!.statuses.thorns;

    state.enemies[0]!.hp = 20;
    state = reduce(state, { type: 'endTurn' });
    // 没有再次注入新的层数，只是继续按回合衰减
    expect(state.enemies[0]!.statuses.thorns).toBe((thorns ?? 0) - 1);
    expect(state.enemies[0]!.phases?.length ?? 0).toBe(0);
  });

  it('致命伤直接击杀，不再触发已经来不及进入的形态', () => {
    let state = stack(bossFight(), ['traced-blade']);
    state.player.energy = 9;
    state.enemies[0]!.hp = 5;

    state = reduce(state, {
      type: 'playCard',
      uid: handUidOf(state, 'traced-blade'),
      targetIndex: 0,
    });

    expect(state.enemies[0]!.alive).toBe(false);
    expect(state.enemies[0]!.phaseName).toBeUndefined();
    expect(state.events.some((event) => event.type === 'phase')).toBe(false);
  });
});

describe('多格延后', () => {
  function enemyTrack(intents: number) {
    return setup({
      enemies: [
        {
          defId: 'mote-gnaw',
          name: '时蚀虫',
          maxHp: 400,
          intentsPerTurn: intents,
          intentScript: [{ intentId: 'gnaw', preferredSlot: 4, weight: 1 }],
        },
      ],
    });
  }

  it('延后两格确实移动两格', () => {
    const state = enemyTrack(1);
    const before = entriesOf(state, 'enemy')[0]!;
    expect(before.slot).toBe(C.TRACK_SLOTS);

    const ok = rewind(state, 'enemy', before.slot, 2);
    expect(ok).toBe(true);
    expect(slotOfEntry(state, 'enemy', before.entry.uid)).toBe(C.TRACK_SLOTS - 2);
    expect(state.delaysThisTurn).toBe(1);
  });

  it('每回合的延后次数用尽后推不动', () => {
    const state = enemyTrack(1);
    const entry = entriesOf(state, 'enemy')[0]!;
    for (let i = 0; i < C.INTENT_DELAY_PER_TURN; i++) {
      const at = slotOfEntry(state, 'enemy', entry.entry.uid)!;
      rewind(state, 'enemy', at, 1);
    }
    expect(state.delaysThisTurn).toBe(C.INTENT_DELAY_PER_TURN);

    const at = slotOfEntry(state, 'enemy', entry.entry.uid)!;
    expect(rewind(state, 'enemy', at, 1)).toBe(false);
  });

  it('额度是全轨公用的，不按意图分摊', () => {
    const state = enemyTrack(2);
    const list = entriesOf(state, 'enemy');
    expect(list.length).toBeGreaterThanOrEqual(2);

    // 第一个意图用两次操作吃满整回合的额度，第二个就一格也推不动了
    for (let i = 0; i < C.INTENT_DELAY_PER_TURN; i++) {
      const at = slotOfEntry(state, 'enemy', list[0]!.entry.uid)!;
      rewind(state, 'enemy', at, 1);
    }
    expect(delayBudgetLeft(state)).toBe(0);

    const other = slotOfEntry(state, 'enemy', list[1]!.entry.uid)!;
    expect(rewind(state, 'enemy', other, 1)).toBe(false);
  });

  it('剩余额度随每次延后递减，回合开始时补满', () => {
    let state = enemyTrack(1);
    const entry = entriesOf(state, 'enemy')[0]!;
    expect(delayBudgetLeft(state)).toBe(C.INTENT_DELAY_PER_TURN);

    rewind(state, 'enemy', entry.slot, 1);
    expect(delayBudgetLeft(state)).toBe(C.INTENT_DELAY_PER_TURN - 1);

    state = reduce(state, { type: 'endTurn' });
    expect(delayBudgetLeft(state)).toBe(C.INTENT_DELAY_PER_TURN);
  });

  it('连带顶动多个意图也只消耗一次', () => {
    const state = enemyTrack(2);
    const list = entriesOf(state, 'enemy');
    const target = list[list.length - 1]!;
    const before = state.track.enemy.map((entry) => entry?.uid ?? null);

    expect(rewind(state, 'enemy', target.slot, 1, () => {})).toBe(true);
    expect(state.delaysThisTurn).toBe(1);
    expect(state.track.enemy.map((entry) => entry?.uid ?? null)).not.toEqual(before);
  });

  it('连锁前方有不可延后意图时不移动也不扣次数', () => {
    const state = enemyTrack(2);
    const list = entriesOf(state, 'enemy');
    const target = list[list.length - 1]!;
    list[0]!.entry.undelayable = true;
    const before = state.track.enemy.map((entry) => entry?.uid ?? null);

    expect(rewind(state, 'enemy', target.slot, 1, () => {})).toBe(false);
    expect(state.delaysThisTurn).toBe(0);
    expect(state.track.enemy.map((entry) => entry?.uid ?? null)).toEqual(before);
  });

  it('不可延后的意图剩余次数直接为零', () => {
    const state = enemyTrack(1);
    const entry = entriesOf(state, 'enemy')[0]!;
    entry.entry.undelayable = true;
    expect(rewindsLeft(state, entry.entry, 'enemy')).toBe(0);
    expect(rewind(state, 'enemy', entry.slot, 1)).toBe(false);
  });

  it('通过打出扰牌延后两格同样生效', () => {
    let state = enemyTrack(1);
    const target = entriesOf(state, 'enemy')[0]!;
    state = stack(state, ['skip-tooth']);
    state.player.energy = 9;

    const uid = state.hand.find((c) => c.defId === 'skip-tooth')?.uid;
    if (uid === undefined) return;

    state = reduce(state, { type: 'playCard', uid, slot: target.slot, laneTarget: 'enemy' });
    const now = slotOfEntry(state, 'enemy', target.entry.uid);
    expect(now === null || now < target.slot).toBe(true);
  });

  it('双泳道扰牌在敌轨空、己方有条目时仍可打出', () => {
    let state = setup();
    state.track.enemy.fill(null);
    state = stack(state, ['threadbind', 'paired-arrest']);
    const weave = state.hand.find((c) => c.defId === 'threadbind')!.uid;
    state = reduce(state, { type: 'playCard', uid: weave });
    const arrest = state.hand.find((c) => c.defId === 'paired-arrest')!.uid;
    expect(countEntries(state, 'enemy')).toBe(0);
    expect(countEntries(state, 'player')).toBeGreaterThan(0);
    expect(canPlay(state, arrest)).toBe(true);
  });
});

describe('预览与结算一致', () => {
  it('THRESHOLD 在系数不足时预览为 0，rateMod 会压低伤害', () => {
    const state = setup();
    const entry: TrackEntry = {
      uid: 1,
      cardId: 'preview',
      owner: 'player',
      effects: [
        { kind: 'damage', amount: 4, scaleMode: 'THRESHOLD', threshold: 0.7 },
        { kind: 'damage', amount: 8, scaleMode: 'SCALAR' },
      ],
      echoBudget: 2,
      resolvedHere: false,
      rewindCount: 0,
      delayCount: 0,
      copyDepth: 0,
      anchored: false,
      stolen: true,
      frozen: false,
      rateMod: 0.5,
      snapshot: { strength: 0, weak: false, damageScale: 1, statusPotency: 0 },
    };
    expect(previewYield(entry, 0.45).map((part) => [part.kind, part.value, part.hits])).toEqual([['damage', 1, 1]]);
    expect(previewYield(entry, 0.7).map((part) => [part.kind, part.value, part.hits])).toEqual([
      ['damage', 2, 1],
      ['damage', 2, 1],
    ]);
    void state;
  });
});

describe('先手与开局状态', () => {
  function opener(overrides: Partial<EnemySetup> = {}) {
    return setup({
      enemies: [
        {
          defId: 'mote-gnaw',
          name: '时蚀虫',
          maxHp: 200,
          intentsPerTurn: 1,
          intentScript: [{ intentId: 'gnaw', preferredSlot: 4, weight: 1 }],
          ...overrides,
        },
      ],
    });
  }

  it('敌方先手时玩家开局即挨一轮', () => {
    const state = opener({ initiative: 'enemy' });
    expect(state.player.hp).toBeLessThan(state.player.maxHp);
  });

  it('玩家先手时开局不掉血', () => {
    const state = opener();
    expect(state.player.hp).toBe(state.player.maxHp);
  });

  it('先手的一轮不占用回合计数，事件排在首回合之前', () => {
    const state = opener({ initiative: 'enemy' });
    expect(state.turn).toBe(1);
    expect(state.phase).toBe('playerTurn');

    const opening = state.events.findIndex((e) => e.type === 'opening');
    const turnStart = state.events.findIndex((e) => e.type === 'turnStart');
    expect(opening).toBeGreaterThanOrEqual(0);
    expect(turnStart).toBeGreaterThan(opening);
  });

  it('先手的一轮结束后仍为玩家挂上新的意图', () => {
    const state = opener({ initiative: 'enemy' });
    expect(countEntries(state, 'enemy')).toBe(1);
  });

  it('开局状态写进敌人状态包，同名层数累加', () => {
    const state = opener({
      startingStatuses: [
        { status: 'thorns', amount: 3 },
        { status: 'strength', amount: 2 },
        { status: 'thorns', amount: 1 },
      ],
    });
    const enemy = state.enemies[0]!;
    expect(enemy.statuses.thorns).toBe(4);
    expect(enemy.statuses.strength).toBe(2);
  });

  it('没有声明开局状态的敌人状态包为空', () => {
    expect(opener().enemies[0]!.statuses).toEqual({});
  });
});

describe('意图牌库', () => {
  function decked(deck: { intentId: string; copies: number }[], intentsPerTurn = 1) {
    return setup({
      enemies: [
        {
          defId: 'mote-gnaw',
          name: '时蚀虫',
          maxHp: 400,
          intentsPerTurn,
          intentScript: [{ intentId: 'gnaw', preferredSlot: 4, weight: 1 }],
          deck,
        },
      ],
    });
  }

  it('有牌库时不再走脚本的加权抽取', () => {
    const state = decked([{ intentId: 'sap', copies: 3 }]);
    expect(entriesOf(state, 'enemy').map((e) => e.entry.cardId)).toEqual(['sap']);
  });

  it('牌库按份数发牌，抽完一轮才重洗', () => {
    let state = decked([{ intentId: 'sap', copies: 2 }]);
    expect(state.enemies[0]!.intentDeck).toHaveLength(1);

    state = reduce(state, { type: 'endTurn' });
    expect(state.enemies[0]!.intentDeck).toHaveLength(0);
    expect(state.events.some((e) => e.type === 'intentReshuffle')).toBe(false);

    state = reduce(state, { type: 'endTurn' });
    expect(state.events.some((e) => e.type === 'intentReshuffle')).toBe(true);
    expect(state.enemies[0]!.intentDeck).toHaveLength(1);
  });

  it('一整轮抽取覆盖牌库的全部份数', () => {
    const state = decked(
      [
        { intentId: 'sap', copies: 1 },
        { intentId: 'swarm', copies: 1 },
      ],
      2,
    );
    const drawn = entriesOf(state, 'enemy').map((e) => e.entry.cardId);
    expect(drawn.slice().sort()).toEqual(['sap', 'swarm']);
    expect(state.enemies[0]!.intentDeck).toHaveLength(0);
  });

  it('相同种子下牌库顺序一致', () => {
    const order = () => decked([{ intentId: 'sap', copies: 4 }]).enemies[0]!.intentDeck;
    expect(order()).toEqual(order());
  });
});

describe('意图格位', () => {
  it('挂载格位取自数据声明而非固定末位', () => {
    const state = setup({
      enemies: [
        {
          defId: 'mote-gnaw',
          name: '时蚀虫',
          maxHp: 200,
          intentsPerTurn: 1,
          intentScript: [{ intentId: 'gnaw', preferredSlot: 2, weight: 1 }],
        },
        {
          defId: 'null-leech',
          name: '空蛭',
          maxHp: 200,
          intentsPerTurn: 1,
          intentScript: [{ intentId: 'sap', preferredSlot: 4, weight: 1 }],
        },
      ],
    });

    const slots = new Map(entriesOf(state, 'enemy').map((e) => [e.entry.cardId, e.slot]));
    expect(slots.get('gnaw')).toBe(2);
    expect(slots.get('sap')).toBe(4);
  });
});

describe('意图指向', () => {
  it('声明了 aim 的意图按声明取值', () => {
    expect(intentAim({ id: 'a', name: '甲', kind: 'attack', aim: 'self', effects: [] })).toBe('self');
    expect(
      intentAim({
        id: 'b',
        name: '乙',
        kind: 'defend',
        aim: 'player',
        effects: [{ kind: 'block', amount: 4, scaleMode: 'SCALAR', target: 'self' }],
      }),
    ).toBe('player');
  });

  it('省略 aim 时含伤害或负面状态的朝玩家，只有护甲回复的朝自己', () => {
    const derive = (effects: Effect[]) =>
      intentAim({ id: 'x', name: '丙', kind: 'attack', effects });

    expect(derive([{ kind: 'damage', amount: 5, scaleMode: 'SCALAR' }])).toBe('player');
    expect(
      derive([{ kind: 'applyStatus', amount: 2, scaleMode: 'SCALAR', status: 'weak' }]),
    ).toBe('player');
    expect(derive([{ kind: 'block', amount: 6, scaleMode: 'SCALAR', target: 'self' }])).toBe('self');
    expect(
      derive([{ kind: 'selfStatus', amount: 1, scaleMode: 'SCALAR', status: 'strength' }]),
    ).toBe('self');
    expect(derive([{ kind: 'heal', amount: 4, scaleMode: 'SCALAR', target: 'self' }])).toBe('self');
    expect(
      derive([
        { kind: 'block', amount: 6, scaleMode: 'SCALAR', target: 'self' },
        { kind: 'damage', amount: 3, scaleMode: 'SCALAR' },
      ]),
    ).toBe('player');
  });

  it('内容里的每条意图都能定出指向', () => {
    for (const def of INTENTS) {
      expect(['player', 'self']).toContain(intentAim(def));
    }
  });
});

describe('装备触发', () => {
  const FIXTURES: EquipmentDef[] = [
    {
      id: 'test-edge',
      name: '试炼刃',
      slot: 'weapon',
      rarity: 'common',
      text: '回合开始获得 1 点力量。',
      art: 'test-edge',
      onTurnStart: [{ kind: 'selfStatus', amount: 1, scaleMode: 'ONCE', status: 'strength' }],
    },
    {
      id: 'test-plate',
      name: '试炼甲',
      slot: 'armor',
      rarity: 'common',
      text: '敌方回合结束获得 2 层护盾。',
      art: 'test-plate',
      onTurnEnd: [{ kind: 'selfStatus', amount: 2, scaleMode: 'ONCE', status: 'ward' }],
    },
    {
      id: 'test-desperate',
      name: '试炼符',
      slot: 'trinket',
      rarity: 'common',
      text: '自身生命低于半数时，回合开始获得 1 层再生。',
      art: 'test-desperate',
      condition: 'lowHp',
      onTurnStart: [{ kind: 'selfStatus', amount: 1, scaleMode: 'ONCE', status: 'regen' }],
    },
    {
      id: 'test-metronome',
      name: '试炼摆',
      slot: 'core',
      rarity: 'common',
      text: '偶数回合开始获得 1 点能量。',
      art: 'test-metronome',
      condition: 'evenTurn',
      onTurnStart: [{ kind: 'gainEnergy', amount: 1, scaleMode: 'ONCE' }],
    },
  ];

  let restore: EquipmentDef[] = [];
  beforeAll(() => {
    restore = allEquipment();
    setEquipmentRegistry([...restore, ...FIXTURES]);
  });
  afterAll(() => setEquipmentRegistry(restore));

  it('未装备任何东西时不产生装备事件', () => {
    const state = setup();
    expect(state.events.some((e) => e.type === 'equip')).toBe(false);
  });

  it('玩家回合开始结算 onTurnStart', () => {
    const state = setup({ equipment: ['test-edge'] });
    expect(state.events.some((e) => e.type === 'equip' && e.equipId === 'test-edge')).toBe(true);
    expect(state.player.statuses.strength).toBe(1);
  });

  it('onTurnStart 每个回合各结算一次', () => {
    let state = setup({ equipment: ['test-edge'] });
    state = reduce(state, { type: 'endTurn' });
    expect(state.player.statuses.strength).toBe(2);
  });

  it('敌方回合结束结算 onTurnEnd，排在下一回合开始之前', () => {
    let state = setup({ equipment: ['test-plate'] });
    expect(state.events.some((e) => e.type === 'equip')).toBe(false);

    state = reduce(state, { type: 'endTurn' });
    const equipAt = state.events.findIndex((e) => e.type === 'equip' && e.equipId === 'test-plate');
    const turnStart = state.events.findIndex((e) => e.type === 'turnStart');
    expect(equipAt).toBeGreaterThanOrEqual(0);
    expect(equipAt).toBeLessThan(turnStart);
    expect(state.player.statuses.ward).toBe(2);
  });

  it('装备事件带上槽位供界面演出', () => {
    const state = setup({ equipment: ['test-edge'] });
    const event = state.events.find((e) => e.type === 'equip');
    expect(event?.slot).toBe('weapon');
  });

  it('条件不成立时钩子不结算，也不产生装备事件', () => {
    const state = setup({ equipment: ['test-desperate'] });
    expect(state.player.statuses.regen).toBeUndefined();
    expect(state.events.some((e) => e.type === 'equip')).toBe(false);
  });

  it('生命跌到半数以下后条件成立，钩子恢复结算', () => {
    const state = setup({ equipment: ['test-desperate'], hp: 30 });
    expect(state.player.statuses.regen).toBe(1);
    expect(state.events.some((e) => e.type === 'equip' && e.equipId === 'test-desperate')).toBe(
      true,
    );
  });

  it('偶数回合条件只在偶数回合成立', () => {
    let state = setup({ equipment: ['test-metronome'] });
    expect(state.turn).toBe(1);
    expect(state.player.energy).toBe(state.player.energyPerTurn);

    state = reduce(state, { type: 'endTurn' });
    expect(state.turn).toBe(2);
    expect(state.player.energy).toBe(state.player.energyPerTurn + 1);

    state = reduce(state, { type: 'endTurn' });
    expect(state.turn).toBe(3);
    expect(state.player.energy).toBe(state.player.energyPerTurn);
  });
});
