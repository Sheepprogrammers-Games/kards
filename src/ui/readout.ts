/** 把条目的效果换算成玩家读得懂的产出文本，取整方式与结算一致。 */

import { ignitePayload } from '@engine/combat';
import { previewYield } from '@engine/effects';
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

function describe(kind: Effect['kind'], value: number, hits: number, status?: string): string | null {
  if (kind === 'damage') return hits > 1 ? `${value} 伤害 ×${hits}` : `${value} 伤害`;
  if (kind === 'block') return `${value} 护甲`;
  if (kind === 'applyStatus' && status) {
    return `${value} 层${STATUS_LABEL[status] ?? status}`;
  }
  if (kind === 'selfStatus' && status) {
    return `${value} 层${STATUS_LABEL[status] ?? status}`;
  }
  if (kind === 'heal') return `回复 ${value}`;
  return null;
}

/** 条目在给定系数下的实际产出。 */
export function echoYieldText(entry: TrackEntry, coef: number, minYield = false): string {
  const parts: string[] = [];
  for (const part of previewYield(entry, coef)) {
    const value = part.value > 0 || !minYield ? part.value : 1;
    const text = describe(part.kind, value, part.hits, part.status);
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
