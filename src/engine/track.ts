/** 时间轨的格位操作。所有位移原语都在这里，卡面只声明参数。 */

import { C } from './constants';
import { nextInt } from './rng';
import type { CardInstance, CombatState, Lane, TrackEntry } from './types';

export type EjectReason = 'discard' | 'burn' | 'consumed';

/** 条目自然走完全程时兑现赌注，由战斗流程注入结算函数。 */
let payoffResolver: ((state: CombatState, e: TrackEntry) => void) | null = null;

export function setPayoffResolver(fn: (state: CombatState, e: TrackEntry) => void): void {
  payoffResolver = fn;
}

export function laneOf(state: CombatState, lane: Lane): (TrackEntry | null)[] {
  return state.track[lane];
}

export function entryAt(state: CombatState, lane: Lane, slot: number): TrackEntry | null {
  return state.track[lane][slot - 1] ?? null;
}

export function setEntry(state: CombatState, lane: Lane, slot: number, e: TrackEntry | null): void {
  state.track[lane][slot - 1] = e;
}

export function entriesOf(state: CombatState, lane: Lane): { slot: number; entry: TrackEntry }[] {
  const out: { slot: number; entry: TrackEntry }[] = [];
  for (let slot = 1; slot <= C.TRACK_SLOTS; slot++) {
    const e = entryAt(state, lane, slot);
    if (e) out.push({ slot, entry: e });
  }
  return out;
}

export function countEntries(state: CombatState, lane: Lane): number {
  return entriesOf(state, lane).length;
}

export function slotOfEntry(state: CombatState, lane: Lane, uid: number): number | null {
  for (let slot = 1; slot <= C.TRACK_SLOTS; slot++) {
    if (entryAt(state, lane, slot)?.uid === uid) return slot;
  }
  return null;
}

/**
 * 退场。自然推进移出者入弃牌堆，被挤出者移出本场战斗。
 * 只有自然退场才兑现赌注，被挤出与被引爆的条目拿不到。
 */
export function eject(
  state: CombatState,
  lane: Lane,
  slot: number,
  reason: EjectReason,
  allowPayoff = true,
): void {
  const e = entryAt(state, lane, slot);
  if (!e) return;
  const naturalPayoff = allowPayoff && reason === 'discard';
  const burnPayoff = reason === 'burn' && state.mods.payoffOnBurn;
  if ((naturalPayoff || burnPayoff) && e.payoff?.length && payoffResolver) {
    payoffResolver(state, e);
  }
  setEntry(state, lane, slot, null);
  clearBoundStatuses(state, e);

  if (e.card) {
    if (reason === 'burn' && state.mods.salvageToDraw) shuffleIntoDraw(state, e.card);
    else if (reason === 'burn' && !state.mods.salvageBurn) state.burnedPile.push(e.card);
    else if (reason === 'burn') state.discardPile.push(e.card);
    else if (reason === 'consumed') state.exhaustPile.push(e.card);
    else state.discardPile.push(e.card);
  }
  state.events.push({ type: 'eject', lane, slot, uid: e.uid, cardId: e.cardId, reason });
}

/** 插入抽牌堆的随机位置。 */
function shuffleIntoDraw(state: CombatState, card: CardInstance): void {
  const at = nextInt(state, state.drawPile.length + 1);
  state.drawPile.splice(at, 0, card);
}

/** bindToEntry 的状态随来源条目退场归零。 */
function clearBoundStatuses(state: CombatState, e: TrackEntry): void {
  const bound = e.effects.filter((f) => f.bindToEntry && f.status);
  if (!bound.length) return;
  for (const enemy of state.enemies) {
    for (const f of bound) delete enemy.statuses[f.status!];
  }
  for (const f of bound) delete state.player.statuses[f.status!];
}

/** 从 slot 向高索引方向找第一个空位，跳过锚定条目。 */
function nextFreeSlotRightOf(state: CombatState, lane: Lane, slot: number): number | null {
  for (let s = slot + 1; s <= C.TRACK_SLOTS; s++) {
    const e = entryAt(state, lane, s);
    if (!e) return s;
    if (e.anchored) return null;
  }
  return null;
}

/** 从 preferred 向低索引方向找空位，即引信更长的方向。 */
export function firstFreeSlotFrom(state: CombatState, lane: Lane, preferred: number): number | null {
  for (let s = Math.min(preferred, C.TRACK_SLOTS); s >= 1; s--) {
    if (!entryAt(state, lane, s)) return s;
  }
  return null;
}

/**
 * 插入推挤。为首格腾出空位，占满时把末位挤出战斗。
 */
export function pushLane(state: CombatState, lane: Lane): void {
  const last = entryAt(state, lane, C.TRACK_SLOTS);
  if (last && !last.anchored) eject(state, lane, C.TRACK_SLOTS, 'burn');

  for (let slot = C.TRACK_SLOTS - 1; slot >= 1; slot--) {
    const e = entryAt(state, lane, slot);
    if (!e) continue;
    const dst = nextFreeSlotRightOf(state, lane, slot);
    if (dst === null) {
      eject(state, lane, slot, 'burn');
    } else {
      setEntry(state, lane, dst, e);
      setEntry(state, lane, slot, null);
      e.resolvedHere = false;
      state.events.push({ type: 'shift', lane, from: slot, to: dst, uid: e.uid });
    }
  }
}

/**
 * 回合末推进。降序遍历保证目标格在写入前已腾空。
 * 锚定只抵抗插入推挤，不抵抗推进。
 */
export function advanceTrack(state: CombatState, onIntentResolve: (e: TrackEntry) => void): void {
  for (const lane of ['player', 'enemy'] as Lane[]) {
    for (let slot = C.TRACK_SLOTS; slot >= 1; slot--) {
      const e = entryAt(state, lane, slot);
      if (!e) continue;
      if (e.frozen) {
        e.frozen = false;
        continue;
      }
      if (slot === C.TRACK_SLOTS) {
        if (lane === 'player') {
          eject(state, lane, slot, 'discard');
        } else {
          onIntentResolve(e);
          setEntry(state, lane, slot, null);
          state.events.push({ type: 'intentResolved', slot, uid: e.uid, cardId: e.cardId });
        }
      } else {
        setEntry(state, lane, slot + 1, e);
        setEntry(state, lane, slot, null);
        e.resolvedHere = false;
        state.events.push({ type: 'shift', lane, from: slot, to: slot + 1, uid: e.uid });
      }
    }
  }
  state.advanceCount += 1;
}

/**
 * 向高索引移动。目标格被占用时连同后方条目一起顺推，
 * 被顶出末位的条目按 onOverflow 处理，玩家条目烧毁，敌方意图立即结算。
 */
export function push(
  state: CombatState,
  lane: Lane,
  slot: number,
  n: number,
  onOverflow?: (e: TrackEntry) => void,
): boolean {
  const e = entryAt(state, lane, slot);
  if (!e) return false;

  let moved = false;
  for (let step = 0; step < n; step++) {
    const from = slotOfEntry(state, lane, e.uid);
    if (from === null) break;
    if (!shiftOne(state, lane, from, onOverflow)) break;
    moved = true;
    if (slotOfEntry(state, lane, e.uid) === null) break;
  }
  return moved;
}

/** 把单个条目右移一格，必要时先为它腾出位置。 */
function shiftOne(
  state: CombatState,
  lane: Lane,
  slot: number,
  onOverflow?: (e: TrackEntry) => void,
): boolean {
  const e = entryAt(state, lane, slot);
  if (!e) return false;

  const dst = slot + 1;
  if (dst > C.TRACK_SLOTS) {
    if (onOverflow) {
      onOverflow(e);
      setEntry(state, lane, slot, null);
      state.events.push({ type: 'pushedOut', lane, uid: e.uid, cardId: e.cardId });
    } else {
      eject(state, lane, slot, 'burn');
    }
    return true;
  }

  if (entryAt(state, lane, dst) && !shiftOne(state, lane, dst, onOverflow)) return false;
  if (entryAt(state, lane, dst)) return false;

  setEntry(state, lane, dst, e);
  setEntry(state, lane, slot, null);
  e.resolvedHere = false;
  state.events.push({ type: 'shift', lane, from: slot, to: dst, uid: e.uid, pushed: true });
  return true;
}

/** 本回合还剩多少格延后额度。额度按回合结算，不分摊到单个意图。 */
export function delayBudgetLeft(state: CombatState): number {
  return Math.max(0, C.INTENT_DELAY_PER_TURN + state.mods.delayBonus - state.delaysThisTurn);
}

/**
 * 条目还能被向低索引移动几次。敌方意图同时受本回合的公共额度与
 * 自身累计上限约束，后者使同一击无法被反复推回。
 */
export function rewindsLeft(state: CombatState, e: TrackEntry, lane: Lane): number {
  if (lane === 'player') {
    return Math.max(0, C.REWIND_LIMIT + state.mods.rewindBonus - e.rewindCount);
  }
  if (e.undelayable) return 0;
  return Math.min(delayBudgetLeft(state), Math.max(0, C.INTENT_DELAY_CAP - e.delayCount));
}

/** 条目是否还能被向低索引移动。 */
function canRewind(state: CombatState, e: TrackEntry, lane: Lane): boolean {
  return rewindsLeft(state, e, lane) > 0;
}

/**
 * 向低索引移动。目标格被占用时连同前方条目一起顺移，
 * 整条链上的条目都各自消耗一次移动额度，任一环节受限则整体不动。
 */
export function rewind(
  state: CombatState,
  lane: Lane,
  slot: number,
  n: number,
  onPushedOut?: (e: TrackEntry) => void,
): boolean {
  const e = entryAt(state, lane, slot);
  if (!e) return false;

  let moved = false;
  for (let step = 0; step < n; step++) {
    const from = slotOfEntry(state, lane, e.uid);
    if (from === null) break;
    if (!shiftBack(state, lane, from, onPushedOut)) break;
    moved = true;
  }
  return moved;
}

/** 把单个条目左移一格，必要时先把前方条目继续左移腾位。 */
function shiftBack(
  state: CombatState,
  lane: Lane,
  slot: number,
  onPushedOut?: (e: TrackEntry) => void,
): boolean {
  const e = entryAt(state, lane, slot);
  if (!e || !canRewind(state, e, lane)) return false;

  const dst = slot - 1;
  if (dst < 1) {
    // 已经在最远端还要继续后退，条目被挤出轨道
    if (!onPushedOut) return false;
    setEntry(state, lane, slot, null);
    onPushedOut(e);
    state.events.push({ type: 'pushedOut', lane, uid: e.uid, cardId: e.cardId, back: true });
    return true;
  }
  if (entryAt(state, lane, dst) && !shiftBack(state, lane, dst, onPushedOut)) return false;
  if (entryAt(state, lane, dst)) return false;

  setEntry(state, lane, dst, e);
  setEntry(state, lane, slot, null);
  e.resolvedHere = false;
  if (lane === 'player') {
    e.rewindCount += 1;
  } else {
    e.delayCount += 1;
    state.delaysThisTurn += 1;
    state.events.push({ type: 'delaySpent', left: delayBudgetLeft(state) });
  }
  state.events.push({ type: 'shift', lane, from: slot, to: dst, uid: e.uid, rewind: true });
  return true;
}

/** 交换两个格位，可跨泳道。跨泳道时改写归属。 */
export function swap(
  state: CombatState,
  a: { lane: Lane; slot: number },
  b: { lane: Lane; slot: number },
): boolean {
  const ea = entryAt(state, a.lane, a.slot);
  const eb = entryAt(state, b.lane, b.slot);
  if (!ea && !eb) return false;
  if (a.lane !== b.lane) {
    if (ea?.unstealable || eb?.unstealable) return false;
  }
  setEntry(state, a.lane, a.slot, eb);
  setEntry(state, b.lane, b.slot, ea);
  if (ea && a.lane !== b.lane) {
    ea.owner = b.lane;
    ea.stolen = true;
  }
  if (eb && a.lane !== b.lane) {
    eb.owner = a.lane;
    eb.stolen = true;
  }
  state.events.push({ type: 'swap', a, b });
  return true;
}

export function freeze(state: CombatState, lane: Lane, slot: number): boolean {
  const e = entryAt(state, lane, slot);
  if (!e || e.echoBudget <= 0) return false;
  e.frozen = true;
  if (!state.mods.freeFreeze) e.echoBudget -= 1;
  state.events.push({ type: 'freeze', lane, slot, uid: e.uid });
  return true;
}

export function sustain(state: CombatState, lane: Lane, slot: number, n: number): boolean {
  const e = entryAt(state, lane, slot);
  if (!e) return false;
  e.echoBudget = Math.min(C.ECHO_BUDGET_MAX, e.echoBudget + n);
  state.events.push({ type: 'sustain', lane, slot, uid: e.uid, budget: e.echoBudget });
  return true;
}
