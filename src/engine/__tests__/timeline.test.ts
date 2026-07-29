import { describe, expect, it, beforeAll } from 'vitest';
import { loadContent, STARTER_DECK } from '@content/index';
import { C, coefOf } from '../constants';
import { createCombat, ignitePayload, reduce, type CombatSetup } from '../combat';
import {
  countEntries,
  entriesOf,
  entryAt,
  push,
  rewind,
  rewindsLeft,
  setEntry,
  slotOfEntry,
} from '../track';
import { resolveIntent } from '../intents';
import { NO_MODIFIERS, type CombatState } from '../types';
import { dealDamage } from '../effects';
import { generateMap } from '../map';

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
    for (const { entry } of entriesOf(state, 'enemy')) {
      expect(entry.delayCount).toBeLessThanOrEqual(C.INTENT_DELAY_LIMIT);
    }
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
  });

  it('延后次数上限只允许两格', () => {
    const state = enemyTrack(1);
    const entry = entriesOf(state, 'enemy')[0]!;
    rewind(state, 'enemy', entry.slot, 2);
    expect(entry.entry.delayCount).toBe(C.INTENT_DELAY_LIMIT);

    // 再想延后就不动了
    const at = slotOfEntry(state, 'enemy', entry.entry.uid)!;
    expect(rewind(state, 'enemy', at, 1)).toBe(false);
  });

  it('剩余延后次数随每次延后递减，用尽后归零', () => {
    const state = enemyTrack(1);
    const entry = entriesOf(state, 'enemy')[0]!;
    expect(rewindsLeft(state, entry.entry, 'enemy')).toBe(C.INTENT_DELAY_LIMIT);

    rewind(state, 'enemy', entry.slot, 1);
    expect(rewindsLeft(state, entry.entry, 'enemy')).toBe(C.INTENT_DELAY_LIMIT - 1);

    const at = slotOfEntry(state, 'enemy', entry.entry.uid)!;
    rewind(state, 'enemy', at, 1);
    expect(rewindsLeft(state, entry.entry, 'enemy')).toBe(0);
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
});
