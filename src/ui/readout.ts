/** 把条目的效果换算成玩家读得懂的产出文本，取整方式与结算一致。 */

import { ignitePayload } from '@engine/combat';
import type { CombatState, Effect, TrackEntry } from '@engine/types';

export const STATUS_LABEL: Record<string, string> = {
  poison: '中毒',
  burn: '灼烧',
  vulnerable: '易伤',
  weak: '虚弱',
  strength: '力量',
  regen: '再生',
  thorns: '荆棘',
  ward: '护盾',
  reflect: '转嫁',
  charge: '蓄力',
  anchor: '锚定',
};

function baseOf(effect: Effect, entry: TrackEntry): number {
  return effect.amount + (effect.kind === 'damage' ? entry.snapshot.strength : 0);
}

/** minYield 为真时，原本有量的效果不会被取整抹成零。 */
function valueOf(effect: Effect, entry: TrackEntry, coef: number, minYield: boolean): number {
  const base = baseOf(effect, entry);
  const value = Math.floor(base * coef);
  if (value > 0 || !minYield) return value;
  return base > 0 ? 1 : 0;
}

function describe(effect: Effect, value: number, hits: number): string | null {
  if (effect.kind === 'damage') return hits > 1 ? `${value} 伤害 ×${hits}` : `${value} 伤害`;
  if (effect.kind === 'block') return `${value} 护甲`;
  if (effect.kind === 'applyStatus' && effect.status) {
    return `${value} 层${STATUS_LABEL[effect.status] ?? effect.status}`;
  }
  if (effect.kind === 'selfStatus' && effect.status) {
    return `${value} 层${STATUS_LABEL[effect.status] ?? effect.status}`;
  }
  if (effect.kind === 'heal') return `回复 ${value}`;
  return null;
}

/** 条目在给定系数下的实际产出。 */
export function echoYieldText(entry: TrackEntry, coef: number, minYield = false): string {
  const parts: string[] = [];
  for (const effect of entry.effects) {
    if (effect.scaleMode === 'ONCE') continue;
    const value = valueOf(effect, entry, coef, minYield);
    if (value <= 0) continue;
    const text = describe(effect, value, effect.hits ?? 1);
    if (text) parts.push(text);
  }
  return parts.join('，');
}

/** 此刻引爆这个条目能拿到什么。 */
export function igniteYieldText(state: CombatState, slot: number, entry: TrackEntry): string {
  const payload = ignitePayload(state, slot, entry);
  if (payload <= 0) return '无';
  return echoYieldText(entry, payload, true) || '无直接产出';
}
