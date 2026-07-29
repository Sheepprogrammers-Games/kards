/** 内容定义的查表入口。引擎只读取定义，不感知内容来源。 */

import type { CardDef, IntentDef } from './types';

export interface ContentRegistry {
  cards: Record<string, CardDef>;
  intents: Record<string, IntentDef>;
}

let registry: ContentRegistry = { cards: {}, intents: {} };

export function setRegistry(next: ContentRegistry): void {
  registry = next;
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

export function allCards(): CardDef[] {
  return Object.values(registry.cards);
}
