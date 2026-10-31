/** 单局进程状态。战斗之外的一切在这里流转。 */

import { C } from './constants';
import { allEquipment, equipmentDef } from './equipment';
import { availableNodes, generateMap, nodeAt, type ActMap, type NodeKind } from './map';
import { allCards } from './registry';
import { nextFloat, nextInt, seedFrom, shuffle, weightedPick, type RngHolder } from './rng';
import {
  EQUIP_SLOT_ORDER,
  type EquipSlot,
  type EquipmentLoadout,
  type GrowthKind,
  type RewardKind,
  type RewardOffer,
} from './types';

export interface DeckCard {
  defId: string;
  upgraded: boolean;
}

export type RunPhase =
  | 'map'
  | 'combat'
  | 'reward'
  | 'event'
  | 'shop'
  | 'rest'
  /** 战斗失败后的待抉择相，可以重挑也可以放弃。 */
  | 'defeated'
  | 'gameOver';

export interface RunState extends RngHolder {
  seedText: string;
  rng: number;
  act: number;
  map: ActMap;
  currentNode: string | null;
  phase: RunPhase;

  hp: number;
  maxHp: number;
  /** 战斗奖励带来的永久局内成长。 */
  energyBonus: number;
  handSizeBonus: number;
  drawBonus: number;
  gold: number;
  deck: DeckCard[];
  relics: string[];
  equipment: EquipmentLoadout;

  /** 进入当前节点前的完整快照，用于重挑。 */
  checkpoint: RunState | null;
  /** 本节点已重挑次数。 */
  retries: number;
  /** 本局每张牌选定的版本号，0 为基础版。 */
  variants: Record<string, number>;

  /** 已结算的节点数，用于难度曲线。 */
  cleared: number;
  result: 'ongoing' | 'victory' | 'defeat';
}

export interface RunSetup {
  seedText: string;
  deck: string[];
  maxHp: number;
  relics?: string[];
}

/** 四槽全空的装备配置。 */
export function emptyLoadout(): EquipmentLoadout {
  return { weapon: null, armor: null, trinket: null, core: null };
}

/**
 * 为本局的每张牌抽定一个版本。0 为基础版，其余对应各自的变体。
 * 同一颗种子必然抽出同一套，重开才会换。
 */
export function rollVariants(holder: RngHolder): Record<string, number> {
  const choices: Record<string, number> = {};
  for (const def of allCards()) {
    const total = (def.variants?.length ?? 0) + 1;
    if (total > 1) choices[def.id] = nextInt(holder, total);
  }
  return choices;
}

export function createRun(setup: RunSetup): RunState {
  const seed = seedFrom(setup.seedText);
  const holder: RngHolder = { rng: seed };
  const map = generateMap(holder, 1);
  const variants = rollVariants(holder);

  return {
    seedText: setup.seedText,
    rng: holder.rng,
    act: 1,
    map,
    currentNode: null,
    phase: 'map',
    hp: setup.maxHp,
    maxHp: setup.maxHp,
    energyBonus: 0,
    handSizeBonus: 0,
    drawBonus: 0,
    gold: 99,
    deck: setup.deck.map((defId) => ({ defId, upgraded: false })),
    relics: setup.relics ?? [],
    equipment: emptyLoadout(),
    checkpoint: null,
    retries: 0,
    variants,
    cleared: 0,
    result: 'ongoing',
  };
}

const PHASE_BY_KIND: Record<NodeKind, RunPhase> = {
  combat: 'combat',
  elite: 'combat',
  boss: 'combat',
  event: 'event',
  shop: 'shop',
  rest: 'rest',
};

export function enterNode(run: RunState, nodeId: string): RunState {
  const node = nodeAt(run.map, nodeId);
  if (!node || run.phase !== 'map') return run;
  if (!availableNodes(run.map, run.currentNode).includes(nodeId)) return run;

  if (run.currentNode === nodeId && !node.visited && run.checkpoint) {
    const resumed = structuredClone(run);
    resumed.phase = PHASE_BY_KIND[node.kind];
    return resumed;
  }

  // 快照自身不再携带快照，否则每进一个节点都会多嵌套一层
  const snapshot: RunState = structuredClone({ ...run, checkpoint: null, retries: 0 });
  const next: RunState = structuredClone(snapshot);
  next.checkpoint = snapshot;
  next.currentNode = nodeId;
  next.phase = PHASE_BY_KIND[node.kind];
  return next;
}

/** 还有重挑余量且付得起时砂。 */
export function canRetry(run: RunState): boolean {
  return (
    run.checkpoint !== null &&
    run.currentNode !== null &&
    run.retries < C.RETRY_LIMIT &&
    run.gold >= C.RETRY_GOLD_COST
  );
}

/** 回到进入当前节点前的状态重来一次，扣除时砂并累加重挑次数。 */
export function retryNode(run: RunState): RunState {
  if (!canRetry(run) || !run.checkpoint || !run.currentNode) return run;

  const restored = structuredClone(run.checkpoint);
  restored.gold = Math.max(0, restored.gold - C.RETRY_GOLD_COST);
  const next = enterNode(restored, run.currentNode);
  next.retries = run.retries + 1;
  return next;
}

/** 战斗失败。停在待抉择相，本局尚未结束。 */
export function defeatRun(run: RunState): RunState {
  const next = structuredClone(run);
  next.hp = 0;
  next.phase = 'defeated';
  return next;
}

/** 放弃重挑，本局到此为止。 */
export function abandonRun(run: RunState): RunState {
  const next = structuredClone(run);
  next.phase = 'gameOver';
  next.result = 'defeat';
  return next;
}

/** 节点结算完成后回到地图，走完一幕则推进到下一幕。 */
export function completeNode(run: RunState): RunState {
  const current = run.currentNode ? nodeAt(run.map, run.currentNode) : null;
  if (!current || current.visited) return run;

  const next = structuredClone(run);
  const node = nodeAt(next.map, next.currentNode!);
  node!.visited = true;
  next.cleared += 1;
  next.checkpoint = null;
  next.retries = 0;

  if (node?.kind === 'boss') {
    if (next.act >= 3) {
      next.phase = 'gameOver';
      next.result = 'victory';
      return next;
    }
    next.act += 1;
    next.map = generateMap(next, next.act);
    next.currentNode = null;
  }

  next.phase = next.phase === 'gameOver' || next.phase === 'defeated' ? next.phase : 'map';
  return next;
}

export function addCard(run: RunState, defId: string): RunState {
  const next = structuredClone(run);
  next.deck.push({ defId, upgraded: false });
  return next;
}

export function removeCard(run: RunState, index: number): RunState {
  if (run.deck.length <= 1 || index < 0 || index >= run.deck.length) return run;
  const next = structuredClone(run);
  next.deck.splice(index, 1);
  return next;
}

export function upgradeCard(run: RunState, index: number): RunState {
  const next = structuredClone(run);
  const card = next.deck[index];
  if (card) card.upgraded = true;
  return next;
}

export function heal(run: RunState, amount: number): RunState {
  const next = structuredClone(run);
  next.hp = Math.min(next.maxHp, next.hp + amount);
  return next;
}

export function damage(run: RunState, amount: number): RunState {
  const next = structuredClone(run);
  next.hp = Math.max(0, next.hp - amount);
  if (next.hp <= 0) {
    next.phase = 'gameOver';
    next.result = 'defeat';
  }
  return next;
}

export const ENERGY_GROWTH_CAP = 3;
export const DRAW_GROWTH_CAP = 3;

/** 当前仍可选择的成长方向；生命上限始终可以继续提升。 */
export function growthOptions(run: RunState): GrowthKind[] {
  const options: GrowthKind[] = ['maxHp'];
  if ((run.energyBonus ?? 0) < ENERGY_GROWTH_CAP) options.push('energy');
  if ((run.drawBonus ?? 0) < DRAW_GROWTH_CAP) options.push('draw');
  return options;
}

/** 战斗胜利后的永久成长，持续到本局结束。 */
export function growRun(run: RunState, kind: GrowthKind): RunState {
  if (!growthOptions(run).includes(kind)) return run;
  const next = structuredClone(run);
  switch (kind) {
    case 'maxHp':
      next.maxHp += 10;
      next.hp = Math.min(next.maxHp, next.hp + 10);
      break;
    case 'energy':
      next.energyBonus = (next.energyBonus ?? 0) + 1;
      break;
    case 'draw':
      next.drawBonus = (next.drawBonus ?? 0) + 1;
      next.handSizeBonus = (next.handSizeBonus ?? 0) + 1;
      break;
  }
  return next;
}

export function gainGold(run: RunState, amount: number): RunState {
  const next = structuredClone(run);
  next.gold = Math.max(0, next.gold + amount);
  return next;
}

export function addRelic(run: RunState, relicId: string): RunState {
  if (run.relics.includes(relicId)) return run;
  const next = structuredClone(run);
  next.relics.push(relicId);
  return next;
}

/** 穿戴装备的结果，displaced 为被顶下来的同槽装备。 */
export interface EquipResult {
  run: RunState;
  displaced: string | null;
}

/** 装上一件装备，同槽位原有的被顶掉并随结果返回。 */
export function equipItem(run: RunState, equipId: string): EquipResult {
  const def = equipmentDef(equipId);
  const worn = run.equipment[def.slot];
  if (worn === equipId) return { run, displaced: null };

  const next = structuredClone(run);
  next.equipment[def.slot] = equipId;
  return { run: next, displaced: worn };
}

export function unequipItem(run: RunState, slot: EquipSlot): RunState {
  if (!run.equipment[slot]) return run;
  const next = structuredClone(run);
  next.equipment[slot] = null;
  return next;
}

/** 可作为奖励发放的遗物 id 全集，内容加载时写入。 */
let relicPool: string[] = [];

export function setRelicPool(ids: string[]): void {
  relicPool = ids.slice();
}

/** 普通遭遇的奖励权重。精英与守时者另走保底分支。 */
const COMMON_WEIGHTS: { kind: RewardKind; weight: number }[] = [
  { kind: 'card', weight: 38 },
  { kind: 'gold', weight: 22 },
  { kind: 'equipment', weight: 12 },
  { kind: 'heal', weight: 10 },
  { kind: 'upgradeCard', weight: 7 },
  { kind: 'removeCard', weight: 6 },
  { kind: 'nothing', weight: 5 },
];

function pickIds(holder: RngHolder, pool: string[], count: number): string[] {
  return shuffle(holder, pool).slice(0, Math.min(count, pool.length));
}

function cardPool(): string[] {
  return allCards()
    .filter((def) => def.rarity !== 'starter' && def.rarity !== 'curse')
    .map((def) => def.id);
}

/** 已经穿在身上的装备不再作为候选。 */
function equipmentPool(run: RunState): string[] {
  const worn = new Set(EQUIP_SLOT_ORDER.map((slot) => run.equipment[slot]));
  return allEquipment()
    .filter((def) => !worn.has(def.id))
    .map((def) => def.id);
}

function relicOptions(run: RunState): string[] {
  const owned = new Set(run.relics);
  return relicPool.filter((id) => !owned.has(id));
}

function goldOffer(run: RunState, holder: RngHolder, nodeKind: NodeKind): RewardOffer {
  const span = C.REWARD_GOLD_MAX - C.REWARD_GOLD_MIN;
  const base = C.REWARD_GOLD_MIN + nextInt(holder, span + 1);
  const tier = nodeKind === 'boss' ? 2.4 : nodeKind === 'elite' ? 1.6 : 1;
  return { kind: 'gold', amount: Math.round(base * tier * (1 + (run.act - 1) * 0.3)) };
}

/** 候选池为空时返回 null，由调用方换一种奖励。 */
function buildOffer(
  run: RunState,
  holder: RngHolder,
  kind: RewardKind,
  nodeKind: NodeKind,
): RewardOffer | null {
  switch (kind) {
    case 'card': {
      const options = pickIds(holder, cardPool(), C.REWARD_CARD_OPTIONS);
      return options.length ? { kind, options } : null;
    }
    case 'equipment': {
      const options = pickIds(holder, equipmentPool(run), C.REWARD_CARD_OPTIONS);
      return options.length ? { kind, options } : null;
    }
    case 'relic': {
      const options = pickIds(holder, relicOptions(run), 1);
      return options.length ? { kind, options } : null;
    }
    case 'gold':
      return goldOffer(run, holder, nodeKind);
    case 'heal':
      return { kind, amount: C.REWARD_HEAL };
    default:
      return { kind };
  }
}

/** 精英与守时者的保底：遗物或装备二选一，两者都空才退回时砂。 */
function rollTreasure(run: RunState, holder: RngHolder, nodeKind: NodeKind): RewardOffer {
  const relics = relicOptions(run);
  const equips = equipmentPool(run);
  const wantRelic = relics.length > 0 && (equips.length === 0 || nextFloat(holder) < 0.55);
  const kind: RewardKind = wantRelic ? 'relic' : 'equipment';
  return buildOffer(run, holder, kind, nodeKind) ?? goldOffer(run, holder, nodeKind);
}

function rollCommon(
  run: RunState,
  holder: RngHolder,
  nodeKind: NodeKind,
  taken: Set<RewardKind>,
  allowNothing: boolean,
): RewardOffer {
  const table = COMMON_WEIGHTS.filter(
    (entry) => !taken.has(entry.kind) && (allowNothing || entry.kind !== 'nothing'),
  );

  while (table.length) {
    const picked = weightedPick(holder, table);
    if (!picked) break;
    table.splice(table.indexOf(picked), 1);
    const offer = buildOffer(run, holder, picked.kind, nodeKind);
    if (offer) return offer;
  }
  return goldOffer(run, holder, nodeKind);
}

/**
 * 战斗结算后的奖励。战利品返回 1 到 2 项，另固定附带一次角色成长；
 * 精英与守时者的战利品必定含遗物或装备。
 * 随机数从当前进程状态派生，同一节点重复调用结果一致。
 */
export function rollRewards(run: RunState, nodeKind: NodeKind): RewardOffer[] {
  const holder: RngHolder = { rng: run.rng + run.cleared * 104729 + run.retries * 7919 };
  const treasure = nodeKind === 'elite' || nodeKind === 'boss';
  const spread = C.REWARD_OFFERS_MAX - C.REWARD_OFFERS_MIN;
  const count = treasure
    ? C.REWARD_OFFERS_MAX
    : C.REWARD_OFFERS_MIN + (nextFloat(holder) < 0.5 ? spread : 0);

  const offers: RewardOffer[] = [];
  const taken = new Set<RewardKind>();

  if (treasure) {
    const first = rollTreasure(run, holder, nodeKind);
    offers.push(first);
    taken.add(first.kind);
  }

  while (offers.length < count) {
    const offer = rollCommon(run, holder, nodeKind, taken, !treasure && count === 1);
    offers.push(offer);
    taken.add(offer.kind);
  }

  offers.push({ kind: 'growth', growthOptions: growthOptions(run) });
  return offers;
}
