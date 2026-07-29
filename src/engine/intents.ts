/** 敌方意图的调度与结算。意图不回响，在离开末位时落地。 */

import { C } from './constants';
import { resolveEntry } from './effects';
import { intentDef } from './registry';
import { weightedPick } from './rng';
import { firstFreeSlotFrom, setEntry } from './track';
import type { CombatState, EnemyState, TrackEntry } from './types';

function makeIntentEntry(state: CombatState, enemy: EnemyState, intentId: string): TrackEntry {
  const def = intentDef(intentId);
  const chargeScale = 1 + enemy.charge * C.CHARGE_BONUS;
  enemy.charge = 0;

  const entry: TrackEntry = {
    uid: state.uidCounter++,
    cardId: def.id,
    owner: 'enemy',
    sourceEnemy: enemy.index,
    effects: def.effects,
    echoBudget: 1,
    resolvedHere: false,
    rewindCount: 0,
    delayCount: 0,
    copyDepth: 0,
    anchored: false,
    stolen: false,
    frozen: false,
    snapshot: {
      strength: enemy.statuses.strength ?? 0,
      weak: (enemy.statuses.weak ?? 0) > 0,
      damageScale: chargeScale,
      statusPotency: 0,
    },
  };
  if (def.unstealable) entry.unstealable = true;
  if (def.undelayable) entry.undelayable = true;
  return entry;
}

/**
 * 每个存活敌人按脚本挂载意图。敌轨已满时意图转为蓄力，
 * 使堵塞敌轨的打法只能延迟压力而不能免除。
 */
export function scheduleIntents(state: CombatState): void {
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    for (let k = 0; k < enemy.intentsPerTurn; k++) {
      const pick = weightedPick(state, enemy.intentScript);
      if (!pick) continue;

      const preferred = Math.max(1, Math.min(C.TRACK_SLOTS, pick.preferredSlot));
      const slot = firstFreeSlotFrom(state, 'enemy', preferred);

      if (slot === null) {
        enemy.charge += 1;
        state.events.push({ type: 'charge', enemyId: enemy.id, charge: enemy.charge });
      } else {
        const entry = makeIntentEntry(state, enemy, pick.intentId);
        setEntry(state, 'enemy', slot, entry);
        state.events.push({
          type: 'intentScheduled',
          slot,
          uid: entry.uid,
          intentId: entry.cardId,
          enemyId: enemy.id,
        });
      }
    }
  }
}

/**
 * 意图落地。攻守双方的修正都在此刻实时读取。
 * 意图不回响，因此按首次结算处理，ONCE 效果在这里生效一次。
 */
export function resolveIntent(state: CombatState, entry: TrackEntry): void {
  const source = state.enemies[entry.sourceEnemy ?? 0];
  if (source && !source.alive) return;
  state.events.push({
    type: 'intentStrike',
    enemyId: source?.id ?? 'enemy0',
    uid: entry.uid,
    cardId: entry.cardId,
  });
  resolveEntry(state, entry, 1, { isPlay: true, rateMod: entry.rateMod });
}
