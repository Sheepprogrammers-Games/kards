/** 敌方意图的调度与结算。意图不回响，在离开末位时落地。 */

import { C } from './constants';
import { resolveEntry } from './effects';
import { intentDef } from './registry';
import { shuffle, weightedPick } from './rng';
import { firstFreeSlotFrom, setEntry } from './track';
import type { CombatState, EnemyState, IntentDef, TrackEntry } from './types';

/**
 * 意图的指向。未声明时按效果推导：含伤害或施加负面状态的朝玩家，
 * 只有护甲、自身状态与回复的朝自己。
 */
export function intentAim(def: IntentDef): 'player' | 'self' {
  if (def.aim) return def.aim;
  const outward = def.effects.some((e) => e.kind === 'damage' || e.kind === 'applyStatus');
  return outward ? 'player' : 'self';
}

function makeIntentEntry(state: CombatState, enemy: EnemyState, intentId: string): TrackEntry {
  const def = intentDef(intentId);
  // 蓄力是攒下来还给玩家的那一击，护甲与自我增益的意图不该把它花掉
  const strikes = intentAim(def) === 'player';
  const chargeScale = strikes ? 1 + enemy.charge * C.CHARGE_BONUS : 1;
  if (strikes) enemy.charge = 0;

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

/** 意图的引信长度由脚本声明，牌库抽到的意图沿用同名脚本项的格位。 */
function preferredSlotOf(enemy: EnemyState, intentId: string): number {
  return enemy.intentScript.find((o) => o.intentId === intentId)?.preferredSlot ?? C.TRACK_SLOTS;
}

/** 从牌库顶抽一个意图，抽空后按牌库构成重洗。 */
function drawFromDeck(state: CombatState, enemy: EnemyState): string | null {
  if (!enemy.intentDeck?.length) {
    const cards: string[] = [];
    for (const item of enemy.intentPool ?? []) {
      for (let i = 0; i < item.copies; i++) cards.push(item.intentId);
    }
    if (!cards.length) return null;
    enemy.intentDeck = shuffle(state, cards);
    state.events.push({
      type: 'intentReshuffle',
      enemyId: enemy.id,
      size: enemy.intentDeck.length,
    });
  }
  return enemy.intentDeck.pop() ?? null;
}

/** 有牌库的敌人从牌库抽，其余按脚本权重抽。 */
function pickIntent(
  state: CombatState,
  enemy: EnemyState,
): { intentId: string; preferredSlot: number } | null {
  if (enemy.intentPool?.length) {
    const intentId = drawFromDeck(state, enemy);
    if (!intentId) return null;
    return { intentId, preferredSlot: preferredSlotOf(enemy, intentId) };
  }
  const pick = weightedPick(state, enemy.intentScript);
  if (!pick) return null;
  return { intentId: pick.intentId, preferredSlot: pick.preferredSlot };
}

/**
 * 每个存活敌人按脚本挂载意图。敌轨已满时意图转为蓄力，
 * 使堵塞敌轨的打法只能延迟压力而不能免除。
 */
export function scheduleIntents(state: CombatState): void {
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    for (let k = 0; k < enemy.intentsPerTurn; k++) {
      const pick = pickIntent(state, enemy);
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
