/** 战斗流程的纯函数 reducer。相同输入序列产生相同状态。 */

import { C, coefOf, normalizeCoef } from './constants';
import { drawCards, frontmostEnemy, isNullAt, resolveEntry } from './effects';
import { equipmentEffects, type EquipHook } from './equipment';
import { resolveIntent, scheduleIntents } from './intents';
import { cardDef } from './registry';
import { shuffle } from './rng';
import { decayStatusStacks, tickStatusEndOfTurn, tickStatusStartOfTurn } from './status';
import {
  advanceTrack,
  setPayoffResolver,
  countEntries,
  eject,
  entriesOf,
  entryAt,
  freeze,
  push,
  pushLane,
  rewind,
  setEntry,
  sustain,
  swap,
} from './track';
import { NO_MODIFIERS } from './types';
import type {
  CardDef,
  CombatModifiers,
  Effect,
  EnemyPhase,
  CardInstance,
  CasterSnapshot,
  CombatAction,
  CombatState,
  EnemyState,
  EquipCondition,
  Initiative,
  IntentDeckEntry,
  IntentOption,
  Lane,
  StatusBag,
  StatusGrant,
  TrackEntry,
} from './types';

export interface EnemySetup {
  defId: string;
  name: string;
  maxHp: number;
  intentsPerTurn: number;
  intentScript: IntentOption[];
  phases?: EnemyPhase[];
  /** 开局自带的状态层数。 */
  startingStatuses?: StatusGrant[];
  /** 谁先手，省略为玩家。 */
  initiative?: Initiative;
  /** 抽意图的牌库，省略时按 intentScript 加权抽取。 */
  deck?: IntentDeckEntry[];
}

export interface CombatSetup {
  seed: number;
  deck: { defId: string; upgraded: boolean }[];
  maxHp: number;
  hp?: number;
  relics?: string[];
  /** 本场战斗生效的装备 id。 */
  equipment?: string[];
  mods?: CombatModifiers;
  enemies: EnemySetup[];
}

/** 把开局状态列表折叠成状态包，同一状态的多条累加。 */
function startingStatusBag(grants?: StatusGrant[]): StatusBag {
  const bag: StatusBag = {};
  for (const grant of grants ?? []) {
    bag[grant.status] = (bag[grant.status] ?? 0) + grant.amount;
  }
  return bag;
}

setPayoffResolver((state, entry) => {
  if (!entry.payoff?.length) return;
  state.events.push({ type: 'payoff', uid: entry.uid, cardId: entry.cardId });
  resolveEntry(state, { ...entry, effects: entry.payoff }, 1, { isPlay: true });
});

export function createCombat(setup: CombatSetup): CombatState {
  const mods = setup.mods ?? NO_MODIFIERS;
  const state: CombatState = {
    turn: 0,
    phase: 'playerTurn',
    result: 'ongoing',
    rng: setup.seed >>> 0,
    uidCounter: 1,
    player: {
      id: 'player',
      name: '织时者',
      hp: setup.hp ?? setup.maxHp,
      maxHp: setup.maxHp,
      block: 0,
      statuses: {},
      energy: 0,
      // 修正可以叠加，但不能把玩家锁死在打不出牌的局面
      energyPerTurn: Math.max(1, C.ENERGY_PER_TURN + mods.energyPerTurn),
      handSize: Math.max(2, C.HAND_SIZE + mods.handSize),
      relics: setup.relics ?? [],
    },
    equipment: setup.equipment ?? [],
    enemies: setup.enemies.map((e, index) => ({
      id: `enemy${index}`,
      defId: e.defId,
      name: e.name,
      index,
      hp: e.maxHp,
      maxHp: e.maxHp,
      block: 0,
      statuses: startingStatusBag(e.startingStatuses),
      alive: true,
      charge: 0,
      intentsPerTurn: e.intentsPerTurn,
      intentScript: e.intentScript,
      phases: e.phases ? e.phases.slice().sort((a, b) => b.atHpRatio - a.atHpRatio) : undefined,
      intentPool: e.deck,
    })),
    track: {
      player: new Array<TrackEntry | null>(C.TRACK_SLOTS).fill(null),
      enemy: new Array<TrackEntry | null>(C.TRACK_SLOTS).fill(null),
    },
    hand: [],
    drawPile: [],
    discardPile: [],
    exhaustPile: [],
    burnedPile: [],
    coefTable: normalizeCoef(mods.coefTable ?? C.BASE_COEF),
    igniteEfficiencyMod: mods.igniteEfficiency,
    mods,
    weavePlays: 0,
    igniteCountThisTurn: 0,
    advanceCount: 0,
    events: [],
  };

  const deck: CardInstance[] = setup.deck.map((card) => ({
    uid: state.uidCounter++,
    defId: card.defId,
    upgraded: card.upgraded,
  }));
  state.drawPile = shuffle(state, deck);

  if (mods.startingStrength !== 0) state.player.statuses.strength = mods.startingStrength;

  // 开战钩子在洗牌之后结算，塞进抽牌堆的牌才会参与本场
  triggerEquipment(state, 'onBattleStart');

  scheduleIntents(state);
  if (setup.enemies.some((e) => e.initiative === 'enemy')) enemyOpening(state);
  if (state.result !== 'ongoing') return state;

  startPlayerTurn(state);

  // 起始护甲在首个回合的清零之后给出，否则会被立刻抹掉
  if (mods.startingBlock > 0) {
    state.player.block += mods.startingBlock;
    state.events.push({ type: 'block', targetId: 'player', amount: mods.startingBlock });
  }
  return state;
}

/**
 * 敌方先手的开场。回合计数尚未起步，只把已挂上的意图推进一轮，
 * 再为玩家的第一个回合重新调度。
 */
function enemyOpening(state: CombatState): void {
  state.phase = 'enemyTurn';
  state.events.push({ type: 'opening', initiative: 'enemy' });

  advanceTrack(state, (entry) => resolveIntent(state, entry));
  settleDeaths(state);
  if (state.result !== 'ongoing') return;

  scheduleIntents(state);
}

/** 唯一对外入口。入参不被修改。 */
export function reduce(state: CombatState, action: CombatAction): CombatState {
  if (state.result !== 'ongoing') return state;
  const next = structuredClone(state);
  next.events = [];

  switch (action.type) {
    case 'playCard':
      playCard(next, action.uid, action.targetIndex, action.slot, action.laneTarget);
      break;
    case 'endTurn':
      endTurn(next);
      break;
  }
  return next;
}

function snapshotOf(state: CombatState): CasterSnapshot {
  return {
    strength: state.player.statuses.strength ?? 0,
    weak: (state.player.statuses.weak ?? 0) > 0,
    damageScale: 1,
    statusPotency: 0,
  };
}

const UPGRADE_SCALE = 1.4;

function scaleEffects(list: Effect[]): Effect[] {
  return list.map((e) => ({ ...e, amount: Math.ceil(e.amount * UPGRADE_SCALE) }));
}

/** 强化后的数值按比例上调，效果结构不变。 */
export function effectsOf(def: CardDef, upgraded: boolean): Effect[] {
  if (!upgraded) return def.effects;
  return scaleEffects(def.effects);
}

export function payoffOf(def: CardDef, upgraded: boolean): Effect[] | undefined {
  if (!def.payoff?.length) return undefined;
  return upgraded ? scaleEffects(def.payoff) : def.payoff;
}

/** 强化是否改变了这张牌的任何数值。 */
export function upgradeChangesValues(def: CardDef): boolean {
  const compare = (list: Effect[]) =>
    list.some((e) => Math.ceil(e.amount * UPGRADE_SCALE) !== e.amount);
  return compare(def.effects) || compare(def.payoff ?? []);
}

/**
 * 强化后的费用。数值没有提升的牌改为便宜一点，
 * 保证任何一次重录都实打实地变强。
 */
export function upgradedCost(def: CardDef): number {
  if (upgradeChangesValues(def)) return def.cost;
  return Math.max(0, def.cost - 1);
}

/** 完全无法从强化中获益的牌不进入重录列表。 */
export function canUpgrade(def: CardDef): boolean {
  return upgradeChangesValues(def) || def.cost > 0;
}

function makeEntry(state: CombatState, card: CardInstance, def: CardDef): TrackEntry {
  const payoff = payoffOf(def, card.upgraded);
  return {
    payoff,
    uid: state.uidCounter++,
    cardId: def.id,
    owner: 'player',
    card,
    effects: effectsOf(def, card.upgraded),
    echoBudget: Math.min(C.ECHO_BUDGET_MAX, C.ECHO_BUDGET_DEFAULT + state.mods.echoBudget),
    resolvedHere: false,
    rewindCount: 0,
    delayCount: 0,
    copyDepth: 0,
    anchored: false,
    stolen: false,
    frozen: false,
    snapshot: snapshotOf(state),
  };
}

export function costOf(state: CombatState, def: CardDef, upgraded = false): number {
  if (def.type === 'weave' && state.mods.firstWeaveFree && state.weavePlays === 0) return 0;
  const base = upgraded ? upgradedCost(def) : def.cost;
  if (def.type !== 'ignite' || state.mods.steadyIgnite) return base;
  return base + state.igniteCountThisTurn * C.IGNITE_COST_ESCALATION;
}

/** 扰牌声明的作用泳道。 */
export function manipulationLane(def: CardDef): Lane | null {
  const ops = def.manipulations ?? [];
  if (ops.some((o) => o.lane === 'enemy')) return 'enemy';
  if (ops.some((o) => o.lane === 'player')) return 'player';
  return null;
}

export function canPlay(state: CombatState, uid: number): boolean {
  const card = state.hand.find((c) => c.uid === uid);
  if (!card || state.phase !== 'playerTurn') return false;
  const def = cardDef(card.defId);
  if (def.unplayable) return false;
  if (state.player.energy < costOf(state, def, card.upgraded)) return false;
  if (def.type === 'ignite' && countEntries(state, 'player') < C.IGNITE_MIN_ENTRIES) return false;

  // 需要指定格位的牌，目标泳道上必须真的有东西可作用
  if (def.needsSlot) {
    const lane = manipulationLane(def);
    if (lane && countEntries(state, lane) === 0) return false;
  }
  return true;
}

function playCard(
  state: CombatState,
  uid: number,
  targetIndex?: number,
  slot?: number,
  laneTarget?: Lane,
): void {
  if (!canPlay(state, uid)) return;
  const index = state.hand.findIndex((c) => c.uid === uid);
  const card = state.hand[index] as CardInstance;
  const def = cardDef(card.defId);
  const cost = costOf(state, def, card.upgraded);

  state.player.energy -= cost;
  state.hand.splice(index, 1);
  state.events.push({ type: 'play', uid, cardId: def.id, cost });

  switch (def.type) {
    case 'weave': {
      pushLane(state, 'player');
      const entry = makeEntry(state, card, def);
      setEntry(state, 'player', 1, entry);
      resolveEntry(state, entry, coefOf(state.coefTable, 1), { isPlay: true, targetIndex });
      entry.echoBudget -= 1;
      entry.resolvedHere = true;
      state.weavePlays += 1;
      break;
    }
    case 'ignite': {
      detonate(state, def, targetIndex);
      resolveInstant(state, def, targetIndex, card.upgraded);
      state.discardPile.push(card);
      state.igniteCountThisTurn += 1;
      break;
    }
    case 'disrupt': {
      applyManipulations(state, def, slot, laneTarget, targetIndex);
      resolveInstant(state, def, targetIndex, card.upgraded);
      if (def.exhaust) state.exhaustPile.push(card);
      else state.discardPile.push(card);
      break;
    }
  }

  settleDeaths(state);
}

/** 一次性结算用的临时条目，不占用轨位也不回响。 */
function instantEntry(state: CombatState, cardId: string, effects: Effect[]): TrackEntry {
  return {
    uid: state.uidCounter++,
    cardId,
    owner: 'player',
    effects,
    echoBudget: 0,
    resolvedHere: true,
    rewindCount: 0,
    delayCount: 0,
    copyDepth: 1,
    anchored: false,
    stolen: false,
    frozen: false,
    snapshot: snapshotOf(state),
  };
}

/** 引牌与扰牌自身的效果瞬发一次，不占用轨位。 */
function resolveInstant(
  state: CombatState,
  def: CardDef,
  targetIndex?: number,
  upgraded = false,
): void {
  if (!def.effects.length) return;
  const entry = instantEntry(state, def.id, effectsOf(def, upgraded));
  resolveEntry(state, entry, 1, { isPlay: true, targetIndex });
}

/** trackLoaded 要求己方轨道上的条目不少于这个数量。 */
const TRACK_LOADED_MIN = 2;

/** 装备钩子的触发条件，只读当前状态。 */
function conditionMet(state: CombatState, condition?: EquipCondition): boolean {
  switch (condition) {
    case 'lowHp':
      return state.player.hp * 2 <= state.player.maxHp;
    case 'enemyLow': {
      const front = frontmostEnemy(state);
      return Boolean(front && front.hp * 2 <= front.maxHp);
    }
    case 'trackLoaded':
      return countEntries(state, 'player') >= TRACK_LOADED_MIN;
    case 'ignited':
      return state.igniteCountThisTurn > 0;
    case 'evenTurn':
      return state.turn % 2 === 0;
    default:
      return true;
  }
}

/** 按挂钩结算已装备的效果，逐件产生事件供界面演出。 */
function triggerEquipment(state: CombatState, hook: EquipHook): void {
  if (!state.equipment.length) return;
  for (const trigger of equipmentEffects(state.equipment, hook)) {
    if (!trigger.effects.length) continue;
    if (!conditionMet(state, trigger.condition)) continue;
    state.events.push({ type: 'equip', slot: trigger.slot, equipId: trigger.equipId });
    resolveEntry(state, instantEntry(state, trigger.equipId, trigger.effects), 1, { isPlay: true });
  }
}

/** 引爆时的效率，遗物可以上调，上限之内。 */
export function igniteEfficiency(state: CombatState): number {
  return Math.min(C.IGNITE_EFFICIENCY * state.igniteEfficiencyMod, C.IGNITE_EFFICIENCY_CAP);
}

/**
 * 单个条目被引爆时的结算系数。取尚未兑现的剩余格位之和，
 * 已经走到末位的条目仍留有一份残响，不会清算出空。
 */
export function ignitePayload(state: CombatState, slot: number, entry: TrackEntry): number {
  let remaining = 0;
  for (let k = slot + 1; k <= C.TRACK_SLOTS; k++) remaining += coefOf(state.coefTable, k);
  if (!entry.resolvedHere) remaining += coefOf(state.coefTable, slot);
  remaining = Math.max(remaining, coefOf(state.coefTable, slot) * C.IGNITE_RESIDUAL);

  const efficiency = igniteEfficiency(state);
  return Math.min(
    remaining * efficiency,
    entry.echoBudget * coefOf(state.coefTable, 1) * efficiency,
  );
}

/**
 * 引爆按条目尚未兑现的剩余系数之和结算，再乘效率。
 * 效率低于 1 使等待仍然优于即打即爆。
 */
function detonate(state: CombatState, def: CardDef, targetIndex?: number): void {
  const filter = def.ignite?.filter ?? 'all';
  let picked = entriesOf(state, 'player');
  if (filter === 'oldest') picked = picked.slice(-(def.ignite?.count ?? 1));
  else if (filter === 'newest') picked = picked.slice(0, def.ignite?.count ?? 1);

  const efficiency = igniteEfficiency(state);

  for (const { slot, entry } of picked) {
    const payload = ignitePayload(state, slot, entry);
    if (payload <= 0) continue;

    resolveEntry(state, entry, payload, { isPlay: false, targetIndex, minYield: true });
    if (state.mods.igniteKeepsEntry) {
      // 条目留在原格，只剩一次结算，可以被再次引爆
      entry.echoBudget = 1;
      entry.resolvedHere = true;
      continue;
    }
    entry.echoBudget = 0;
    // 引爆是提前兑现，不发放走完全程的赌注
    eject(state, 'player', slot, 'discard', false);
  }
  state.events.push({ type: 'detonate', count: picked.length, efficiency });
}

function applyManipulations(
  state: CombatState,
  def: CardDef,
  slot?: number,
  laneTarget?: Lane,
  targetIndex?: number,
): void {
  for (const op of def.manipulations ?? []) {
    let done = false;
    const lane = op.lane ?? laneTarget ?? 'player';
    const s = op.slot ?? slot ?? 1;
    const n = op.amount ?? 1;

    switch (op.kind) {
      case 'push':
        // 被顶出末位的敌方意图立即落地，玩家条目则烧毁
        done = push(state, lane, s, n, lane === 'enemy' ? (e) => resolveIntent(state, e) : undefined);
        break;
      case 'rewind':
        // 被挤出轨道的意图不会消失，转成该敌人的蓄力
        done = rewind(state, lane, s, n, (e) => {
          const owner = state.enemies[e.sourceEnemy ?? 0];
          if (owner) {
            owner.charge += 1;
            state.events.push({ type: 'charge', enemyId: owner.id, charge: owner.charge });
          }
        });
        break;
      case 'swap':
        done = swap(
          state,
          { lane, slot: s },
          { lane: op.lane === 'enemy' ? 'player' : 'enemy', slot: op.slotB ?? s },
        );
        break;
      case 'freeze':
        done = freeze(state, lane, s);
        break;
      case 'sustain':
        done = sustain(state, lane, s, n);
        break;
      case 'rerecord': {
        const entry = entryAt(state, lane, s);
        if (entry) {
          entry.snapshot = snapshotOf(state);
          done = true;
        }
        break;
      }
      case 'copy':
        done = copyEntry(state, s);
        break;
      case 'steal':
        done = stealIntent(state, s);
        break;
      case 'evict':
        done = evictEntry(state, lane, s, targetIndex);
        break;
      case 'preempt':
        done = preemptIntent(state, s);
        break;
    }

    // 位移受限或目标不存在时告诉界面，别让玩家以为牌白打了
    state.events.push({ type: 'manipulate', kind: op.kind, lane, slot: s, ok: done });
  }
}

/** 副本只结算一次且不可再被复制。 */
function copyEntry(state: CombatState, slot: number): boolean {
  const src = entryAt(state, 'player', slot);
  if (!src || src.copyDepth > 0) return false;
  const dst = firstEmptySlot(state, 'player');
  if (dst === null) return false;

  const copy: TrackEntry = {
    ...structuredClone(src),
    uid: state.uidCounter++,
    card: undefined,
    copyDepth: 1,
    echoBudget: 1,
    resolvedHere: false,
  };
  setEntry(state, 'player', dst, copy);
  state.events.push({ type: 'copy', from: slot, to: dst, uid: copy.uid });
  return true;
}

/** 窃取占用一个玩家轨位，并使原持有者立即蓄力。 */
function stealIntent(state: CombatState, slot: number): boolean {
  const intent = entryAt(state, 'enemy', slot);
  if (!intent || intent.unstealable) return false;

  pushLane(state, 'player');
  setEntry(state, 'enemy', slot, null);

  intent.owner = 'player';
  intent.stolen = true;
  intent.echoBudget = 1;
  intent.copyDepth = 1;
  intent.rateMod = state.mods.fullSteal ? 1 : C.STOLEN_RATE;
  intent.resolvedHere = false;
  intent.snapshot = snapshotOf(state);
  setEntry(state, 'player', 1, intent);

  const owner = state.enemies[intent.sourceEnemy ?? 0];
  if (owner) owner.charge += 1;
  state.events.push({ type: 'steal', slot, uid: intent.uid });
  return true;
}

/** 抽空：立即退场并按剩余系数的固定比例结算。 */
function evictEntry(state: CombatState, lane: Lane, slot: number, targetIndex?: number): boolean {
  const entry = entryAt(state, lane, slot);
  if (!entry) return false;

  let remaining = 0;
  for (let k = slot; k <= C.TRACK_SLOTS; k++) remaining += coefOf(state.coefTable, k);
  resolveEntry(state, entry, remaining * C.EVICT_RATE, { isPlay: false, targetIndex });
  eject(state, lane, slot, 'discard', false);
  return true;
}

/** 抢拍：强制敌方意图提前落地，数值减半。 */
function preemptIntent(state: CombatState, slot: number): boolean {
  const intent = entryAt(state, 'enemy', slot);
  if (!intent) return false;
  intent.rateMod = C.PREEMPT_RATE;
  resolveIntent(state, intent);
  setEntry(state, 'enemy', slot, null);
  state.events.push({ type: 'preempt', slot, uid: intent.uid });
  return true;
}

function firstEmptySlot(state: CombatState, lane: Lane): number | null {
  for (let s = 1; s <= C.TRACK_SLOTS; s++) if (!entryAt(state, lane, s)) return s;
  return null;
}

/** 升序结算，条目耗尽预算或在下一格全部归零时退场。 */
function resolveEchoes(state: CombatState): void {
  for (let slot = 1; slot <= C.TRACK_SLOTS; slot++) {
    const entry = entryAt(state, 'player', slot);
    if (!entry) continue;
    if (entry.echoBudget <= 0) {
      eject(state, 'player', slot, 'discard');
      continue;
    }
    resolveEntry(state, entry, coefOf(state.coefTable, slot), { isPlay: false });
    entry.echoBudget -= 1;
    entry.resolvedHere = true;

    if (entry.echoBudget === 0 || isNullAt(entry, coefOf(state.coefTable, slot + 1))) {
      eject(state, 'player', slot, 'discard');
    }
  }
}

function startPlayerTurn(state: CombatState): void {
  state.turn += 1;
  state.phase = 'playerTurn';
  state.player.block = 0;
  state.events.push({ type: 'turnStart', turn: state.turn });

  tickStatusStartOfTurn(state, state.player);
  settleDeaths(state);
  if (state.result !== 'ongoing') return;

  resolveEchoes(state);
  settleDeaths(state);
  if (state.result !== 'ongoing') return;

  state.player.energy = state.player.energyPerTurn;
  drawCards(state, Math.max(0, state.player.handSize - state.hand.length) + state.mods.drawPerTurn);

  state.weavePlays = 0;
  state.igniteCountThisTurn = 0;

  triggerEquipment(state, 'onTurnStart');
  settleDeaths(state);
}

function endTurn(state: CombatState): void {
  state.phase = 'enemyTurn';
  state.events.push({ type: 'turnEnd', turn: state.turn });

  for (let i = state.hand.length - 1; i >= 0; i--) {
    const card = state.hand[i] as CardInstance;
    if (cardDef(card.defId).retain) continue;
    state.hand.splice(i, 1);
    state.discardPile.push(card);
  }

  tickStatusEndOfTurn(state, state.player);
  for (const enemy of state.enemies) {
    if (enemy.alive) tickStatusStartOfTurn(state, enemy);
  }
  settleDeaths(state);
  if (state.result !== 'ongoing') return;

  for (const enemy of state.enemies) enemy.block = 0;

  advanceTrack(state, (entry) => resolveIntent(state, entry));
  settleDeaths(state);
  if (state.result !== 'ongoing') return;

  triggerEquipment(state, 'onTurnEnd');
  settleDeaths(state);
  if (state.result !== 'ongoing') return;

  scheduleIntents(state);
  decayStatusStacks(state);
  startPlayerTurn(state);
}

/** 生命跌破阈值时切换形态，换掉意图脚本并清空未落地的意图。 */
function checkPhases(state: CombatState): void {
  for (const enemy of state.enemies) {
    if (!enemy.alive || !enemy.phases?.length) continue;
    const ratio = enemy.hp / enemy.maxHp;

    while (enemy.phases.length && ratio <= enemy.phases[0]!.atHpRatio) {
      const phase = enemy.phases.shift()!;
      enemy.intentScript = phase.intentScript;
      if (phase.intentsPerTurn) enemy.intentsPerTurn = phase.intentsPerTurn;
      enemy.phaseName = phase.name;

      for (const gain of phase.onEnter ?? []) {
        enemy.statuses[gain.status] = (enemy.statuses[gain.status] ?? 0) + gain.amount;
      }
      clearEnemyIntents(state, enemy);
      state.events.push({
        type: 'phase',
        enemyId: enemy.id,
        name: phase.name,
        enemyName: enemy.name,
      });
    }
  }
}

function settleDeaths(state: CombatState): void {
  checkPhases(state);
  for (const enemy of state.enemies) {
    if (enemy.alive && enemy.hp <= 0) {
      enemy.alive = false;
      state.events.push({ type: 'death', enemyId: enemy.id });
      clearEnemyIntents(state, enemy);
    }
  }
  if (state.player.hp <= 0) {
    state.result = 'defeat';
    state.phase = 'finished';
    state.events.push({ type: 'defeat' });
    return;
  }
  if (!frontmostEnemy(state)) {
    state.result = 'victory';
    state.phase = 'finished';
    state.events.push({ type: 'victory' });
  }
}

function clearEnemyIntents(state: CombatState, enemy: EnemyState): void {
  for (let slot = 1; slot <= C.TRACK_SLOTS; slot++) {
    const entry = entryAt(state, 'enemy', slot);
    if (entry?.sourceEnemy === enemy.index) setEntry(state, 'enemy', slot, null);
  }
}
