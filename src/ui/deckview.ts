/** 牌组一览。地图上看完整牌组，战斗中按牌堆分组查看。 */

import type { CombatState } from '@engine/types';
import type { DeckCard } from '@engine/run';
import { cardDef } from '@engine/registry';
import { el, renderStaticCard } from './screens';
import { sfx } from '@audio/index';

interface Group {
  title: string;
  cards: DeckCard[];
}

function render(title: string, subtitle: string, groups: Group[]): HTMLElement {
  const overlay = el('div', 'overlay deck-overlay');
  const panel = el('div', 'panel deck-panel');
  panel.append(el('h2', '', title));
  panel.classList.add('has-close');
  panel.append(el('p', '', subtitle));

  for (const group of groups) {
    if (!group.cards.length) continue;
    const header = el('div', 'deck-group-title', `${group.title} · ${group.cards.length}`);
    const row = el('div', 'card-row deck-row');
    const sorted = group.cards.slice().sort((a, b) => {
      const da = cardDef(a.defId);
      const db = cardDef(b.defId);
      return da.type.localeCompare(db.type) || da.cost - db.cost || da.id.localeCompare(db.id);
    });
    for (const card of sorted) row.append(renderStaticCard(card.defId, card.upgraded));
    panel.append(header, row);
  }

  const close = el('button', 'panel-close', '×');
  close.title = '关闭';
  close.addEventListener('click', () => overlay.remove());
  panel.append(close);

  overlay.append(panel);
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) overlay.remove();
  });
  return overlay;
}

/** 局外查看：整副牌组。 */
export function showDeck(host: HTMLElement, deck: DeckCard[]): void {
  sfx.pick();
  const byType = (t: string) => deck.filter((c) => cardDef(c.defId).type === t);
  host.append(
    render('牌组', `共 ${deck.length} 张`, [
      { title: '织', cards: byType('weave') },
      { title: '引', cards: byType('ignite') },
      { title: '扰', cards: byType('disrupt') },
    ]),
  );
}

/** 战斗中查看：按牌堆分组，烧毁堆单独列出。 */
export function showPiles(host: HTMLElement, state: CombatState): void {
  sfx.pick();
  const map = (list: { defId: string; upgraded: boolean }[]): DeckCard[] =>
    list.map((c) => ({ defId: c.defId, upgraded: c.upgraded }));

  const total =
    state.drawPile.length + state.hand.length + state.discardPile.length + state.exhaustPile.length;

  host.append(
    render('牌堆', `本场剩余 ${total} 张，已烧毁 ${state.burnedPile.length} 张`, [
      { title: '抽牌堆', cards: map(state.drawPile) },
      { title: '手牌', cards: map(state.hand) },
      { title: '弃牌堆', cards: map(state.discardPile) },
      { title: '消耗', cards: map(state.exhaustPile) },
      { title: '已烧毁', cards: map(state.burnedPile) },
    ]),
  );
}
