/** 种子随机数。状态是一个 32 位整数，随 state 序列化，保证回放一致。 */

export interface RngHolder {
  rng: number;
}

/** mulberry32。返回 [0,1)。 */
export function nextFloat(holder: RngHolder): number {
  holder.rng = (holder.rng + 0x6d2b79f5) | 0;
  let t = holder.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** 返回 [0, max) 的整数。 */
export function nextInt(holder: RngHolder, max: number): number {
  return Math.floor(nextFloat(holder) * max);
}

export function shuffle<T>(holder: RngHolder, items: T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = nextInt(holder, i + 1);
    const a = out[i] as T;
    const b = out[j] as T;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

export function weightedPick<T extends { weight: number }>(holder: RngHolder, items: T[]): T | null {
  const total = items.reduce((s, it) => s + it.weight, 0);
  if (total <= 0) return null;
  let roll = nextFloat(holder) * total;
  for (const it of items) {
    roll -= it.weight;
    if (roll < 0) return it;
  }
  return items[items.length - 1] ?? null;
}

/** 把任意字符串转成种子。 */
export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
