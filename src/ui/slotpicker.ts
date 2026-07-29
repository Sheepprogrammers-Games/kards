/** 选择时间轨上的一个条目作为目标。 */

import { C, coefOf } from '@engine/constants';
import { cardDef, intentDef } from '@engine/registry';
import { entriesOf, rewindsLeft } from '@engine/track';
import type { CombatState, Lane, TrackEntry } from '@engine/types';
import { art } from './assets';
import { el } from './screens';
import { igniteYieldText } from './readout';
import { sfx } from '@audio/index';

export interface SlotPickOptions {
  title: string;
  hint: string;
  lane: Lane;
  onPick: (slot: number) => void;
  onCancel?: () => void;
  /** 返回原因字符串表示该格不可选，按钮置灰并给出说明。 */
  blocked?: (entry: TrackEntry, slot: number) => string | null;
}

export function pickSlot(host: HTMLElement, state: CombatState, options: SlotPickOptions): void {
  const entries = entriesOf(state, options.lane);
  if (!entries.length) {
    options.onCancel?.();
    return;
  }

  sfx.hover();
  const overlay = el('div', 'overlay picker-overlay');
  const panel = el('div', 'panel picker-panel has-close');
  panel.append(el('h2', '', options.title), el('p', '', options.hint));

  const close = () => overlay.remove();

  const row = el('div', 'picker-row');
  for (const { slot, entry } of entries) {
    const card = el('button', 'picker-card');
    card.dataset.lane = options.lane;

    const face = el('div', 'picker-face');
    const url = artOf(entry, options.lane);
    if (url) face.style.backgroundImage = `url(${url})`;
    card.append(face);

    const body = el('div', 'picker-body');
    body.append(el('div', 'picker-name', nameOf(entry, options.lane)));
    body.append(el('div', 'picker-slot', slotLabel(options.lane, slot)));

    const left = rewindsLeft(state, entry, options.lane);
    if (options.lane === 'player') {
      const coef = coefOf(state.coefTable, entry.resolvedHere ? slot + 1 : slot);
      body.append(
        el(
          'div',
          'picker-meta',
          `还能结算 ${entry.echoBudget} 次 · 下次 ${Math.round(coef * 100)}%`,
        ),
      );
      body.append(el('div', 'picker-meta', `引爆可得 ${igniteYieldText(state, slot, entry)}`));
    } else {
      const damage = entry.effects.find((e) => e.kind === 'damage');
      const value = damage
        ? Math.floor((damage.amount + entry.snapshot.strength) * entry.snapshot.damageScale)
        : 0;
      body.append(
        el('div', 'picker-meta', damage ? `落地伤害 ${value}` : '无直接伤害'),
      );
      body.append(
        el(
          'div',
          'picker-meta',
          entry.undelayable ? '不可延后' : left > 0 ? `还能延后 ${left} 次` : '延后次数已用尽',
        ),
      );
    }

    card.append(body);

    const reason = options.blocked?.(entry, slot) ?? null;
    if (reason) {
      card.classList.add('blocked');
      card.append(el('div', 'picker-block', reason));
    }

    card.addEventListener('click', () => {
      if (reason) {
        sfx.blocked();
        return;
      }
      sfx.pick();
      close();
      options.onPick(slot);
    });
    row.append(card);
  }
  panel.append(row);

  const cancel = el('button', 'panel-close', '×');
  cancel.title = '取消';
  cancel.addEventListener('click', () => {
    close();
    options.onCancel?.();
  });
  panel.append(cancel);

  overlay.append(panel);
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) {
      close();
      options.onCancel?.();
    }
  });
  host.append(overlay);
}

function slotLabel(lane: Lane, slot: number): string {
  return lane === 'enemy' ? `${C.TRACK_SLOTS - slot + 1} 回合后落地` : `第 ${slot} 回合`;
}

function nameOf(entry: TrackEntry, lane: Lane): string {
  try {
    return lane === 'enemy' ? intentDef(entry.cardId).name : cardDef(entry.cardId).name;
  } catch {
    return entry.cardId;
  }
}

function artOf(entry: TrackEntry, lane: Lane): string | null {
  if (lane === 'enemy') return null;
  try {
    const def = cardDef(entry.cardId);
    return art.card(def.art ?? def.id);
  } catch {
    return null;
  }
}
