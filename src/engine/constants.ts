import raw from '../../assets/data/echo-timeline.json';

export const C = raw as {
  TRACK_SLOTS: number;
  BASE_COEF: number[];
  ECHO_SUM_CAP: number;
  ECHO_BUDGET_DEFAULT: number;
  ECHO_BUDGET_MAX: number;
  REWIND_LIMIT: number;
  IGNITE_EFFICIENCY: number;
  IGNITE_EFFICIENCY_CAP: number;
  IGNITE_MIN_ENTRIES: number;
  IGNITE_RESIDUAL: number;
  IGNITE_COST_ESCALATION: number;
  INTENT_DELAY_LIMIT: number;
  PREEMPT_RATE: number;
  STOLEN_RATE: number;
  EVICT_RATE: number;
  CHARGE_BONUS: number;
  ENERGY_PER_TURN: number;
  HAND_SIZE: number;
};

/**
 * 系数表归一化。遗物只能重塑分布形状，总和钳制在 ECHO_SUM_CAP 之内。
 */
export function normalizeCoef(table: number[]): number[] {
  const clamped = table.map((v) => Math.max(0, v));
  const sum = clamped.reduce((a, b) => a + b, 0);
  if (sum <= C.ECHO_SUM_CAP || sum === 0) return clamped;
  const k = C.ECHO_SUM_CAP / sum;
  return clamped.map((v) => v * k);
}

/** slot 为 1..4。 */
export function coefOf(table: number[], slot: number): number {
  return table[slot - 1] ?? 0;
}
