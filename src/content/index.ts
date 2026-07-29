import { setRegistry } from '@engine/registry';
import type { CardDef, IntentDef } from '@engine/types';
import { CARDS } from './cards';
import { ENEMIES, INTENTS } from './enemies';

function byId<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((it) => [it.id, it]));
}

/** 内容加载时校验：资源类效果不得随回响重复产出。 */
function validate(cards: CardDef[], intents: IntentDef[]): void {
  const onceOnly = new Set(['draw', 'gainEnergy', 'createCard']);
  for (const def of [...cards, ...intents]) {
    for (const effect of def.effects) {
      if (onceOnly.has(effect.kind) && effect.scaleMode !== 'ONCE') {
        throw new Error(`${def.id}: ${effect.kind} 必须标记为 ONCE`);
      }
      if (effect.kind === 'createCard' && !effect.cardId) {
        throw new Error(`${def.id}: createCard 必须指定 cardId`);
      }
    }
  }
}

export function loadContent(): void {
  validate(CARDS, INTENTS);
  setRegistry({ cards: byId(CARDS), intents: byId(INTENTS) });
}

export { CARDS, ENEMIES, INTENTS };
export { STARTER_DECK } from './decks';
