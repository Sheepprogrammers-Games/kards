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
  /** 装备槽位数量。 */
  EQUIP_SLOTS: number;
  /** 单个节点允许的重挑次数上限。 */
  RETRY_LIMIT: number;
  /** 每次重挑扣除的时砂。 */
  RETRY_GOLD_COST: number;
  REWARD_OFFERS_MIN: number;
  REWARD_OFFERS_MAX: number;
  /** 卡牌奖励一次给出的候选数量。 */
  REWARD_CARD_OPTIONS: number;
  REWARD_GOLD_MIN: number;
  REWARD_GOLD_MAX: number;
  REWARD_HEAL: number;
  /** 商店货架的商品数量。 */
  SHOP_ITEM_COUNT: number;
  /** 首次刷新的价格，之后每次按 SHOP_REROLL_STEP 递增。 */
  SHOP_REROLL_BASE: number;
  SHOP_REROLL_STEP: number;
  SHOP_PRICE_CARD: number;
  SHOP_PRICE_RELIC: number;
  SHOP_PRICE_EQUIPMENT: number;
  SHOP_PRICE_REMOVE: number;
  SHOP_PRICE_UPGRADE: number;
  SHOP_PRICE_SUPPLY: number;
  /** 补给品回复的生命。 */
  SHOP_SUPPLY_HEAL: number;
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
