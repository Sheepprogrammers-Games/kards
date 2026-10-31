/** 残市货架。取样只依赖 run 的种子与刷新次数，不改动传入的状态。 */

import { C } from './constants';
import { allCards, allRelics, equipmentDefs } from './registry';
import { nextFloat, nextInt, shuffle, type RngHolder } from './rng';
import type { RunState } from './run';
import type { ShopItem } from './types';

/** 基准价按稀有度分档。 */
const RARITY_SCALE: Record<string, number> = { common: 0.9, uncommon: 1.4, rare: 2.1 };

/** 补给回血量按 6 点一档往上浮动，售价与回血量挂钩。 */
const SUPPLY_STEP = 6;
const SUPPLY_STEPS = 3;

/** 固定供应的三件服务：洗去、重录、补给。 */
const SERVICE_COUNT = 3;

/** 同一节点、同一刷新次数取到同一条随机序列。 */
function shelfRng(run: RunState, rerolls: number): RngHolder {
  const times = Math.max(0, Math.floor(rerolls));
  const salt = Math.imul(run.cleared + 1, 0x9e3779b1) + Math.imul(times + 1, 0x85ebca6b);
  return { rng: (run.rng + salt) | 0 };
}

/** 基准价上下浮动一成，取整到 5。 */
function jitter(holder: RngHolder, base: number): number {
  const scale = 0.9 + nextFloat(holder) * 0.2;
  return Math.max(5, Math.round((base * scale) / 5) * 5);
}

/** 按稀有度缩放某一类商品的基准价。 */
function priceOf(holder: RngHolder, base: number, rarity: string): number {
  return jitter(holder, base * (RARITY_SCALE[rarity] ?? 1));
}

export function rerollPrice(rerolls: number): number {
  const times = Math.max(0, Math.floor(rerolls));
  return C.SHOP_REROLL_BASE + C.SHOP_REROLL_STEP * times;
}

export function rollShop(run: RunState, rerolls: number): ShopItem[] {
  const holder = shelfRng(run, rerolls);

  const cardPool = shuffle(
    holder,
    allCards().filter((def) => def.rarity !== 'starter' && def.rarity !== 'curse'),
  );
  const owned = new Set(run.relics);
  const relicPool = shuffle(
    holder,
    allRelics().filter((def) => def.rarity !== 'boss' && !owned.has(def.id)),
  );
  const wornEquipment = new Set(Object.values(run.equipment));
  const equipPool = shuffle(
    holder,
    equipmentDefs().filter((def) => !wornEquipment.has(def.id)),
  );

  const relicCount = Math.min(1, relicPool.length);
  const equipCount = Math.min(2, equipPool.length);
  const cardCount = Math.min(
    cardPool.length,
    C.SHOP_ITEM_COUNT - SERVICE_COUNT - relicCount - equipCount,
  );

  const items: ShopItem[] = [];

  for (const def of cardPool.slice(0, cardCount)) {
    items.push({ kind: 'card', id: def.id, price: priceOf(holder, C.SHOP_PRICE_CARD, def.rarity) });
  }
  for (const def of relicPool.slice(0, relicCount)) {
    items.push({
      kind: 'relic',
      id: def.id,
      price: priceOf(holder, C.SHOP_PRICE_RELIC, def.rarity),
    });
  }
  for (const def of equipPool.slice(0, equipCount)) {
    items.push({
      kind: 'equipment',
      id: def.id,
      price: priceOf(holder, C.SHOP_PRICE_EQUIPMENT, def.rarity),
    });
  }

  items.push({ kind: 'removeCard', price: jitter(holder, C.SHOP_PRICE_REMOVE) });
  items.push({ kind: 'upgradeCard', price: jitter(holder, C.SHOP_PRICE_UPGRADE) });

  const heal = C.SHOP_SUPPLY_HEAL + nextInt(holder, SUPPLY_STEPS) * SUPPLY_STEP;
  const supplyPrice = (C.SHOP_PRICE_SUPPLY * heal) / C.SHOP_SUPPLY_HEAL;
  items.push({ kind: 'supply', price: jitter(holder, supplyPrice), amount: heal });

  return items;
}
