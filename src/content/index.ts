import { setEquipmentRegistry } from '@engine/equipment';
import { setRegistry, type RelicSummary } from '@engine/registry';
import { setRelicPool } from '@engine/run';
import type { CardDef, IntentDef } from '@engine/types';
import { CARDS } from './cards';
import { ENEMIES, INTENTS } from './enemies';
import { EQUIPMENT } from './equipment';
import { RELICS } from './relics';

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

/** 遗物在引擎侧只用到 id 与稀有度。 */
function relicSummaries(): RelicSummary[] {
  return RELICS.map((def) => ({ id: def.id, rarity: def.rarity }));
}

export function loadContent(): void {
  validate(CARDS, INTENTS);
  setRegistry({
    cards: byId(CARDS),
    intents: byId(INTENTS),
    equipment: byId(EQUIPMENT),
    relics: byId(relicSummaries()),
  });
  setEquipmentRegistry(EQUIPMENT);
  // 守时者遗物只从守时者身上掉，不进随机奖励池
  setRelicPool(RELICS.filter((def) => def.rarity !== 'boss').map((def) => def.id));
}

export { CARDS, ENEMIES, EQUIPMENT, INTENTS, RELICS };
export { STARTER_DECK } from './decks';
