/** 内容定义的查表入口。引擎只读取定义，不感知内容来源。 */

import type { CardDef, EquipmentDef, IntentDef } from './types';

/** 遗物在引擎侧只用到 id 与稀有度，效果合并留在内容层。 */
export interface RelicSummary {
  id: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'boss';
}

export interface ContentRegistry {
  cards: Record<string, CardDef>;
  intents: Record<string, IntentDef>;
  equipment?: Record<string, EquipmentDef>;
  relics?: Record<string, RelicSummary>;
}

type LoadedRegistry = Required<ContentRegistry>;

let registry: LoadedRegistry = { cards: {}, intents: {}, equipment: {}, relics: {} };

export function setRegistry(next: ContentRegistry): void {
  registry = {
    cards: next.cards,
    intents: next.intents,
    equipment: next.equipment ?? {},
    relics: next.relics ?? {},
  };
}

export function cardDef(id: string): CardDef {
  const def = registry.cards[id];
  if (!def) throw new Error(`未注册的卡牌定义: ${id}`);
  return def;
}

export function intentDef(id: string): IntentDef {
  const def = registry.intents[id];
  if (!def) throw new Error(`未注册的意图定义: ${id}`);
  return def;
}

export function equipmentDef(id: string): EquipmentDef {
  const def = registry.equipment[id];
  if (!def) throw new Error(`未注册的装备定义: ${id}`);
  return def;
}

export function allCards(): CardDef[] {
  return Object.values(registry.cards);
}

export function equipmentDefs(): EquipmentDef[] {
  return Object.values(registry.equipment);
}

export function allRelics(): RelicSummary[] {
  return Object.values(registry.relics);
}
