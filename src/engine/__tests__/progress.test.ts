import { beforeAll, describe, expect, it } from 'vitest';
import { loadContent, STARTER_DECK } from '@content/index';
import { C } from '../constants';
import {
  collectEquipModifiers,
  equipmentDef,
  equipmentEffects,
  mergeModifiers,
  setEquipmentRegistry,
} from '../equipment';
import {
  abandonRun,
  canRetry,
  completeNode,
  createRun,
  defeatRun,
  enterNode,
  equipItem,
  growRun,
  growthOptions,
  removeCard,
  retryNode,
  rollRewards,
  setRelicPool,
  unequipItem,
  type RunState,
} from '../run';
import type { NodeKind } from '../map';
import { availableNodes } from '../map';
import { NO_MODIFIERS, type CombatModifiers, type EquipmentDef, type RewardOffer } from '../types';

const FIXTURES: EquipmentDef[] = [
  {
    id: 'test-blade',
    name: '试作刃',
    slot: 'weapon',
    rarity: 'common',
    text: '回合开始获得 1 力量。',
    art: 'test-blade',
    mods: { startingStrength: 1, drawPerTurn: 1 },
    onTurnStart: [{ kind: 'selfStatus', amount: 1, scaleMode: 'ONCE', status: 'strength' }],
  },
  {
    id: 'test-edge',
    name: '试作锋',
    slot: 'weapon',
    rarity: 'uncommon',
    text: '引爆效率下降。',
    art: 'test-edge',
    mods: { igniteEfficiency: 0.5, firstWeaveFree: true },
  },
  {
    id: 'test-plate',
    name: '试作甲',
    slot: 'armor',
    rarity: 'common',
    text: '敌方回合结束时获得 2 护甲。',
    art: 'test-plate',
    mods: { startingBlock: 4, drawPerTurn: 2 },
    onTurnEnd: [{ kind: 'block', amount: 2, scaleMode: 'ONCE', target: 'self' }],
  },
  {
    id: 'test-charm',
    name: '试作坠',
    slot: 'trinket',
    rarity: 'rare',
    text: '重塑系数分布。',
    art: 'test-charm',
    mods: { coefTable: [1, 1, 1, 1] },
  },
  {
    id: 'test-core',
    name: '试作核',
    slot: 'core',
    rarity: 'rare',
    text: '没有常驻修正。',
    art: 'test-core',
  },
];

const RELIC_IDS = ['relic-a', 'relic-b', 'relic-c'];

beforeAll(() => {
  loadContent();
  setEquipmentRegistry(FIXTURES);
  setRelicPool(RELIC_IDS);
});

function newRun(seedText = 'progress'): RunState {
  return createRun({ seedText, deck: [...STARTER_DECK], maxHp: 70 });
}

/** 取一个指定类型的节点 id，没有就退回任意节点。 */
function nodeOf(run: RunState, kind: NodeKind): string {
  const hit = Object.values(run.map.nodes).find((node) => node.kind === kind);
  return (hit ?? Object.values(run.map.nodes)[0]!).id;
}

describe('进程：初始状态', () => {
  it('四个装备槽初始为空，无快照无重挑', () => {
    const run = newRun();
    expect(run.equipment).toEqual({ weapon: null, armor: null, trinket: null, core: null });
    expect(Object.keys(run.equipment)).toHaveLength(C.EQUIP_SLOTS);
    expect(run.checkpoint).toBeNull();
    expect(run.retries).toBe(0);
    expect(run.energyBonus).toBe(0);
    expect(run.handSizeBonus).toBe(0);
    expect(run.drawBonus).toBe(0);
  });
});

describe('进程：角色成长', () => {
  it('生命、能量和摸牌成长会永久写入本局状态', () => {
    const hurt = { ...newRun(), hp: 40 };
    const tougher = growRun(hurt, 'maxHp');
    const charged = growRun(tougher, 'energy');
    const learned = growRun(charged, 'draw');

    expect(tougher.maxHp).toBe(hurt.maxHp + 10);
    expect(tougher.hp).toBe(hurt.hp + 10);
    expect(charged.energyBonus).toBe(1);
    expect(learned.drawBonus).toBe(1);
    expect(learned.handSizeBonus).toBe(1);
  });

  it('能量与摸牌成长达到上限后不再出现，生命成长仍保留', () => {
    const capped = { ...newRun(), energyBonus: 3, drawBonus: 3, handSizeBonus: 3 };
    expect(growthOptions(capped)).toEqual(['maxHp']);
    expect(growRun(capped, 'energy')).toBe(capped);
    expect(growRun(capped, 'draw')).toBe(capped);
  });
});

describe('进程：检查点与重挑', () => {
  it('进入节点时写入快照，快照自身不再嵌套快照', () => {
    const run = newRun();
    const entered = enterNode(run, run.map.entries[0]!);

    expect(entered.checkpoint).not.toBeNull();
    expect(entered.checkpoint?.checkpoint).toBeNull();
    expect(entered.checkpoint?.currentNode).toBeNull();
    expect(entered.checkpoint?.phase).toBe('map');
  });

  it('连续进入多个节点不会累积嵌套层数', () => {
    const run = newRun();
    let current = enterNode(run, run.map.entries[0]!);
    current = completeNode(current);
    const nextId = availableNodes(current.map, current.currentNode)[0]!;
    current = enterNode(current, nextId);

    expect(current.checkpoint?.checkpoint).toBeNull();
  });

  it('重挑还原节点前的血量与牌组，并累加次数', () => {
    const run = newRun();
    const entered = enterNode(run, nodeOf(run, 'combat'));
    const hpBefore = entered.hp;
    const goldBefore = entered.gold;

    const lost = defeatRun({ ...entered, deck: entered.deck.slice(0, 2) });
    expect(lost.hp).toBe(0);

    const again = retryNode(lost);
    expect(again.hp).toBe(hpBefore);
    expect(again.deck).toHaveLength(entered.deck.length);
    expect(again.retries).toBe(1);
    expect(again.gold).toBe(goldBefore - C.RETRY_GOLD_COST);
    expect(again.phase).toBe('combat');
    expect(again.checkpoint?.checkpoint).toBeNull();
  });

  it('重挑次数用尽后不再允许', () => {
    const run = newRun();
    let current = enterNode({ ...run, gold: 9999 }, nodeOf(run, 'combat'));
    for (let i = 0; i < C.RETRY_LIMIT; i++) {
      expect(canRetry(current)).toBe(true);
      current = retryNode(defeatRun(current));
    }

    expect(current.retries).toBe(C.RETRY_LIMIT);
    expect(canRetry(current)).toBe(false);
    const blocked = defeatRun(current);
    expect(retryNode(blocked)).toBe(blocked);
  });

  it('时砂不足时挡下重挑', () => {
    const run = newRun();
    const entered = enterNode({ ...newRun(), gold: C.RETRY_GOLD_COST - 1 }, nodeOf(run, 'combat'));
    expect(canRetry(defeatRun(entered))).toBe(false);
  });

  it('节点结算后清掉快照与重挑计数', () => {
    const run = newRun();
    const done = completeNode(enterNode(run, run.map.entries[0]!));
    expect(done.checkpoint).toBeNull();
    expect(done.retries).toBe(0);
  });

  it('同一节点不能重复结算刷取进度', () => {
    const run = enterNode(newRun(), newRun().map.entries[0]!);
    const done = completeNode(run);
    const again = completeNode(done);

    expect(again).toBe(done);
    expect(again.cleared).toBe(done.cleared);
  });

  it('未完成当前节点时不能跳到后继节点，重新进入也不重置重挑次数', () => {
    const run = newRun();
    let entered = enterNode(run, run.map.entries[0]!);
    entered = { ...entered, phase: 'map', retries: 1 };
    const nextId = entered.map.nodes[entered.currentNode!]!.next[0]!;

    expect(availableNodes(entered.map, entered.currentNode)).toEqual([entered.currentNode]);
    expect(enterNode(entered, nextId)).toBe(entered);

    const again = enterNode(entered, entered.currentNode!);
    expect(again.phase).toBe('combat');
    expect(again.retries).toBe(1);
    expect(again.checkpoint).toEqual(entered.checkpoint);
  });
});

describe('进程：失败相', () => {
  it('战斗失败停在 defeated，本局仍在进行', () => {
    const run = enterNode(newRun(), nodeOf(newRun(), 'combat'));
    const lost = defeatRun(run);
    expect(lost.phase).toBe('defeated');
    expect(lost.result).toBe('ongoing');
  });

  it('放弃之后才进入 gameOver', () => {
    const lost = defeatRun(enterNode(newRun(), newRun().map.entries[0]!));
    const over = abandonRun(lost);
    expect(over.phase).toBe('gameOver');
    expect(over.result).toBe('defeat');
  });
});

describe('进程：装备穿脱', () => {
  it('同槽位装备互相顶替并返回被顶掉的 id', () => {
    const first = equipItem(newRun(), 'test-blade');
    expect(first.displaced).toBeNull();
    expect(first.run.equipment.weapon).toBe('test-blade');

    const second = equipItem(first.run, 'test-edge');
    expect(second.displaced).toBe('test-blade');
    expect(second.run.equipment.weapon).toBe('test-edge');
  });

  it('不同槽位互不影响，卸下只清空对应槽', () => {
    let run = equipItem(newRun(), 'test-blade').run;
    run = equipItem(run, 'test-plate').run;
    expect(run.equipment.weapon).toBe('test-blade');
    expect(run.equipment.armor).toBe('test-plate');

    const bare = unequipItem(run, 'armor');
    expect(bare.equipment.armor).toBeNull();
    expect(bare.equipment.weapon).toBe('test-blade');
  });

  it('装上已经在身的同一件装备不产生顶替', () => {
    const run = equipItem(newRun(), 'test-core').run;
    const again = equipItem(run, 'test-core');
    expect(again.displaced).toBeNull();
    expect(again.run).toBe(run);
  });

  it('穿戴不改动原状态', () => {
    const run = newRun();
    equipItem(run, 'test-blade');
    expect(run.equipment.weapon).toBeNull();
  });
});

describe('进程：牌组边界', () => {
  it('非法下标和最后一张牌都不能被移除', () => {
    const run = newRun();
    expect(removeCard(run, -1)).toBe(run);
    expect(removeCard(run, run.deck.length)).toBe(run);

    const single = { ...run, deck: run.deck.slice(0, 1) };
    expect(removeCard(single, 0)).toBe(single);
  });
});

describe('装备：定义与修正', () => {
  it('查表取回定义，未注册的抛错', () => {
    expect(equipmentDef('test-plate').slot).toBe('armor');
    expect(() => equipmentDef('no-such-gear')).toThrow();
  });

  it('数值累加、效率乘算、系数表后覆盖前', () => {
    const mods = collectEquipModifiers(['test-blade', 'test-edge', 'test-plate', 'test-charm']);
    expect(mods.drawPerTurn).toBe(3);
    expect(mods.startingStrength).toBe(1);
    expect(mods.startingBlock).toBe(4);
    expect(mods.igniteEfficiency).toBeCloseTo(0.5);
    expect(mods.firstWeaveFree).toBe(true);
    expect(mods.coefTable).toEqual([1, 1, 1, 1]);
  });

  it('空槽与未注册 id 直接跳过', () => {
    const mods = collectEquipModifiers(['test-blade', null, 'ghost-gear']);
    expect(mods.drawPerTurn).toBe(1);
  });

  it('整套槽位配置可以直接传入', () => {
    const run = equipItem(equipItem(newRun(), 'test-blade').run, 'test-plate').run;
    expect(collectEquipModifiers(run.equipment).drawPerTurn).toBe(3);
  });

  it('叠加到遗物修正之上时数值累加，装备的系数表覆盖遗物的', () => {
    const relicSide: CombatModifiers = {
      ...NO_MODIFIERS,
      coefTable: [1, 0.5, 0.5, 0.5],
      drawPerTurn: 2,
      igniteEfficiency: 2,
      steadyIgnite: true,
    };
    const merged = mergeModifiers(relicSide, collectEquipModifiers(['test-blade', 'test-charm']));

    expect(merged.drawPerTurn).toBe(3);
    expect(merged.igniteEfficiency).toBeCloseTo(2);
    expect(merged.steadyIgnite).toBe(true);
    expect(merged.coefTable).toEqual([1, 1, 1, 1]);
    expect(relicSide.drawPerTurn).toBe(2);
  });

  it('按钩子筛出待结算的装备并带上槽位', () => {
    const ids = ['test-blade', 'test-plate', 'test-core'];
    const start = equipmentEffects(ids, 'onTurnStart');
    expect(start).toHaveLength(1);
    expect(start[0]).toMatchObject({ slot: 'weapon', equipId: 'test-blade' });

    const end = equipmentEffects(ids, 'onTurnEnd');
    expect(end).toHaveLength(1);
    expect(end[0]?.equipId).toBe('test-plate');
    expect(end[0]?.effects[0]?.kind).toBe('block');
  });
});

describe('进程：战斗奖励', () => {
  const seeds = Array.from({ length: 80 }, (_, i) => `reward-${i}`);

  function offersFor(kind: NodeKind): RewardOffer[][] {
    return seeds.map((seedText, i) => {
      const run = { ...newRun(seedText), cleared: i, act: 1 + (i % 3) };
      return rollRewards(run, kind);
    });
  }

  it('每次返回 1 到 2 项战利品和 1 项成长，种类不重复', () => {
    for (const kind of ['combat', 'elite', 'boss'] as NodeKind[]) {
      for (const offers of offersFor(kind)) {
        expect(offers.length).toBeGreaterThanOrEqual(C.REWARD_OFFERS_MIN + 1);
        expect(offers.length).toBeLessThanOrEqual(C.REWARD_OFFERS_MAX + 1);
        expect(new Set(offers.map((o) => o.kind)).size).toBe(offers.length);
        expect(offers.filter((o) => o.kind === 'growth')).toHaveLength(1);
      }
    }
  });

  it('精英与守时者必出遗物或装备', () => {
    for (const kind of ['elite', 'boss'] as NodeKind[]) {
      for (const offers of offersFor(kind)) {
        const hit = offers.some((o) => o.kind === 'relic' || o.kind === 'equipment');
        expect(hit).toBe(true);
        expect(offers.some((o) => o.kind === 'nothing')).toBe(false);
      }
    }
  });

  it('候选 id 全部来自对应池子且不含已持有的', () => {
    const run = { ...newRun(), relics: ['relic-a'], cleared: 5 };
    const equipped = equipItem(run, 'test-blade').run;
    const cards = new Set(rollRewards(equipped, 'combat').flatMap((o) => o.options ?? []));

    for (const offers of ['elite', 'boss'].flatMap((k) => offersFor(k as NodeKind))) {
      for (const offer of offers) {
        if (offer.kind === 'relic') {
          expect(offer.options?.length).toBe(1);
          expect(RELIC_IDS).toContain(offer.options![0]);
        }
        if (offer.kind === 'equipment') {
          expect(offer.options?.length).toBeGreaterThan(0);
        }
      }
    }

    const eliteOffers = rollRewards(equipped, 'elite');
    for (const offer of eliteOffers) {
      if (offer.kind === 'relic') expect(offer.options).not.toContain('relic-a');
      if (offer.kind === 'equipment') expect(offer.options).not.toContain('test-blade');
    }
    expect(cards.size).toBeGreaterThanOrEqual(0);
  });

  it('普通遭遇可能给出空奖励', () => {
    const nothing = offersFor('combat').some((offers) => offers.some((o) => o.kind === 'nothing'));
    expect(nothing).toBe(true);
  });

  it('时砂与回血带上数量，卡牌带上候选', () => {
    for (const offers of offersFor('combat')) {
      for (const offer of offers) {
        if (offer.kind === 'gold') expect(offer.amount).toBeGreaterThan(0);
        if (offer.kind === 'heal') expect(offer.amount).toBe(C.REWARD_HEAL);
        if (offer.kind === 'card') expect(offer.options?.length).toBe(C.REWARD_CARD_OPTIONS);
        if (offer.kind === 'growth') {
          expect(offer.growthOptions).toEqual(['maxHp', 'energy', 'draw']);
        }
      }
    }
  });

  it('同一状态重复调用结果一致，推进后结果改变', () => {
    const run = { ...newRun('stable'), cleared: 3 };
    expect(rollRewards(run, 'combat')).toEqual(rollRewards(run, 'combat'));
    expect(rollRewards(run, 'combat')).not.toEqual(rollRewards({ ...run, cleared: 4 }, 'combat'));
  });
});
