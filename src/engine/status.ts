/** 状态层数的回合结算。 */

import { dealDamage } from './effects';
import type { CombatState, Combatant } from './types';

/** 回合开始：中毒、灼烧、再生，顺序固定。 */
export function tickStatusStartOfTurn(state: CombatState, who: Combatant): void {
  const poison = who.statuses.poison ?? 0;
  if (poison > 0) {
    who.hp = Math.max(0, who.hp - poison);
    state.events.push({ type: 'poisonTick', targetId: who.id, amount: poison, hp: who.hp });
    const left = poison - 1;
    if (left <= 0) delete who.statuses.poison;
    else who.statuses.poison = left;
    if (who.hp <= 0) return;
  }

  const burn = who.statuses.burn ?? 0;
  if (burn > 0) {
    who.hp = Math.max(0, who.hp - burn);
    state.events.push({ type: 'burnTick', targetId: who.id, amount: burn, hp: who.hp });
    delete who.statuses.burn;
    if (who.hp <= 0) return;
  }

  const regen = who.statuses.regen ?? 0;
  if (regen > 0) {
    who.hp = Math.min(who.maxHp, who.hp + regen);
    state.events.push({ type: 'regenTick', targetId: who.id, amount: regen, hp: who.hp });
    const left = regen - 1;
    if (left <= 0) delete who.statuses.regen;
    else who.statuses.regen = left;
  }
}

/** 回合结束：目前只作为扩展点，灼烧类持续伤害统一在回合开始结算。 */
export function tickStatusEndOfTurn(_state: CombatState, _who: Combatant): void {}

/** 玩家行动阶段结束后，虚弱才减少，敌方刚施加的虚弱会留到下一回合。 */
export function decayPlayerWeak(state: CombatState): void {
  decayOne(state.player, 'weak');
}

function decayOne(who: Combatant, id: 'vulnerable' | 'weak' | 'thorns'): void {
  const n = who.statuses[id] ?? 0;
  if (n <= 0) return;
  if (n - 1 <= 0) delete who.statuses[id];
  else who.statuses[id] = n - 1;
}

/** 时限状态每回合末 -1。 */
export function decayStatusStacks(state: CombatState): void {
  for (const id of ['vulnerable', 'thorns'] as const) decayOne(state.player, id);
  for (const enemy of state.enemies) {
    for (const id of ['vulnerable', 'weak', 'thorns'] as const) decayOne(enemy, id);
  }
  state.events.push({ type: 'statusDecay' });
}

export { dealDamage };
