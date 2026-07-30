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
/** 未套用任何变体的原始卡表，换局时从这里重新解析。 */
let baseCards: Record<string, CardDef> = {};
let variantChoices: Record<string, number> = {};

export function setRegistry(next: ContentRegistry): void {
  baseCards = next.cards;
  variantChoices = {};
  registry = {
    cards: next.cards,
    intents: next.intents,
    equipment: next.equipment ?? {},
    relics: next.relics ?? {},
  };
}

/** 取第 index 版。0 为基础版，之后依次对应 variants 里的每一条。 */
export function variantOf(def: CardDef, index: number): CardDef {
  const variant = def.variants?.[index - 1];
  if (!variant) return def;
  return {
    ...def,
    text: variant.text,
    cost: variant.cost ?? def.cost,
    effects: variant.effects ?? def.effects,
    payoff: variant.payoff ?? def.payoff,
    manipulations: variant.manipulations ?? def.manipulations,
    ignite: variant.ignite ?? def.ignite,
    needsTarget: variant.needsTarget ?? def.needsTarget,
    needsSlot: variant.needsSlot ?? def.needsSlot,
    retain: variant.retain ?? def.retain,
    exhaust: variant.exhaust ?? def.exhaust,
  };
}

/** 这张牌一共有几个可选版本，含基础版。 */
export function variantCount(id: string): number {
  return (baseCards[id]?.variants?.length ?? 0) + 1;
}

/** 本局选中的版本号，未选过为基础版。 */
export function variantIndexOf(id: string): number {
  return variantChoices[id] ?? 0;
}

/** 换上本局的一套版本。查表入口随之改写，调用方无需感知。 */
export function applyVariants(choices: Record<string, number>): void {
  variantChoices = choices;
  const cards: Record<string, CardDef> = {};
  for (const [id, def] of Object.entries(baseCards)) {
    cards[id] = variantOf(def, choices[id] ?? 0);
  }
  registry.cards = cards;
}

/** 未套用变体的原始定义，供图鉴列出全部版本。 */
export function baseCardDef(id: string): CardDef | null {
  return baseCards[id] ?? null;
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
