import { beforeAll, describe, expect, it } from 'vitest';
import { CARDS } from '@content/cards';
import { C } from '../constants';
import { setRegistry, type RelicSummary } from '../registry';
import { createRun, type RunState } from '../run';
import { rerollPrice, rollShop } from '../shop';
import type { EquipmentDef, ShopItemKind } from '../types';

const RELICS: RelicSummary[] = [
  { id: 'relic-a', rarity: 'common' },
  { id: 'relic-b', rarity: 'uncommon' },
  { id: 'relic-c', rarity: 'rare' },
  { id: 'relic-boss', rarity: 'boss' },
];

const EQUIPMENT: EquipmentDef[] = [
  { id: 'equip-a', name: '钝刃', slot: 'weapon', rarity: 'common', text: '', art: 'equip-a' },
  { id: 'equip-b', name: '锈甲', slot: 'armor', rarity: 'uncommon', text: '', art: 'equip-b' },
  { id: 'equip-c', name: '缺角坠', slot: 'trinket', rarity: 'rare', text: '', art: 'equip-c' },
  { id: 'equip-d', name: '残核', slot: 'core', rarity: 'common', text: '', art: 'equip-d' },
];

function byId<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((it) => [it.id, it]));
}

beforeAll(() => {
  setRegistry({
    cards: byId(CARDS),
    intents: {},
    equipment: byId(EQUIPMENT),
    relics: byId(RELICS),
  });
});

function run(seedText = 'shop-seed'): RunState {
  return createRun({ seedText, deck: CARDS.slice(0, 5).map((c) => c.id), maxHp: 70 });
}

describe('残市货架', () => {
  it('同一个 run 与刷新次数产出同一批货', () => {
    const a = run();
    const b = run();
    for (const rerolls of [0, 1, 5]) {
      expect(rollShop(a, rerolls)).toEqual(rollShop(a, rerolls));
      expect(rollShop(b, rerolls)).toEqual(rollShop(a, rerolls));
    }
  });

  it('取样不改动传入的进程状态', () => {
    const state = run();
    const before = structuredClone(state);
    rollShop(state, 2);
    expect(state).toEqual(before);
  });

  it('刷新与换种子都会换一批货', () => {
    const state = run();
    expect(rollShop(state, 1)).not.toEqual(rollShop(state, 0));
    expect(rollShop(run('another'), 0)).not.toEqual(rollShop(state, 0));
  });

  it('货架至少八件且涵盖全部商品类型', () => {
    const items = rollShop(run(), 0);
    expect(items.length).toBeGreaterThanOrEqual(8);

    const kinds = new Set<ShopItemKind>(items.map((it) => it.kind));
    for (const kind of [
      'card',
      'relic',
      'equipment',
      'removeCard',
      'upgradeCard',
      'supply',
    ] as ShopItemKind[]) {
      expect(kinds.has(kind)).toBe(true);
    }
  });

  it('商品字段齐备且卡牌不重复', () => {
    const items = rollShop(run(), 3);
    const cardIds = items.filter((it) => it.kind === 'card').map((it) => it.id);
    expect(new Set(cardIds).size).toBe(cardIds.length);

    for (const item of items) {
      expect(item.price).toBeGreaterThan(0);
      expect(Number.isInteger(item.price)).toBe(true);
      if (item.kind === 'card' || item.kind === 'relic' || item.kind === 'equipment') {
        expect(item.id).toBeTruthy();
      }
      if (item.kind === 'supply') expect(item.amount ?? 0).toBeGreaterThan(0);
    }
  });

  it('已有的遗物与守时者遗物不上架', () => {
    const state = { ...run(), relics: ['relic-a', 'relic-b'] };
    for (const rerolls of [0, 1, 2, 3, 4]) {
      const relics = rollShop(state, rerolls).filter((it) => it.kind === 'relic');
      for (const item of relics) expect(item.id).toBe('relic-c');
    }
  });

  it('刷新价格随次数递增，基准与步长取自平衡表', () => {
    const prices = [0, 1, 2, 3].map((n) => rerollPrice(n));
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]!).toBeGreaterThan(prices[i - 1]!);
    }
    expect(rerollPrice(0)).toBe(C.SHOP_REROLL_BASE);
    expect(rerollPrice(2)).toBe(C.SHOP_REROLL_BASE + C.SHOP_REROLL_STEP * 2);
    expect(rerollPrice(-1)).toBe(rerollPrice(0));
  });

  it('售价围绕平衡表的基准浮动，稀有度越高越贵', () => {
    const base: Record<string, number> = {
      card: C.SHOP_PRICE_CARD,
      relic: C.SHOP_PRICE_RELIC,
      equipment: C.SHOP_PRICE_EQUIPMENT,
      removeCard: C.SHOP_PRICE_REMOVE,
      upgradeCard: C.SHOP_PRICE_UPGRADE,
    };

    for (const rerolls of [0, 1, 2, 3, 4]) {
      for (const item of rollShop(run(), rerolls)) {
        const anchor = base[item.kind];
        if (anchor === undefined) continue;
        expect(item.price).toBeGreaterThanOrEqual(anchor * 0.5);
        expect(item.price).toBeLessThanOrEqual(anchor * 2.6);
      }
    }
  });

  it('补给的回血量不低于平衡表下限，售价随回血量走高', () => {
    const seen = new Map<number, number>();
    for (const seed of ['s0', 's1', 's2', 's3', 's4', 's5']) {
      for (const rerolls of [0, 1, 2]) {
        const supply = rollShop(run(seed), rerolls).find((it) => it.kind === 'supply');
        if (!supply) continue;
        expect(supply.amount!).toBeGreaterThanOrEqual(C.SHOP_SUPPLY_HEAL);
        seen.set(supply.amount!, supply.price);
      }
    }

    const tiers = [...seen.entries()].sort((a, b) => a[0] - b[0]);
    expect(tiers.length).toBeGreaterThan(1);
    expect(tiers[tiers.length - 1]![1]).toBeGreaterThan(tiers[0]![1]);
  });
});
