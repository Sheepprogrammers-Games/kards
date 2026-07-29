/** 单局进程状态。战斗之外的一切在这里流转。 */

import { generateMap, nodeAt, type ActMap, type NodeKind } from './map';
import { seedFrom, type RngHolder } from './rng';

export interface DeckCard {
  defId: string;
  upgraded: boolean;
}

export type RunPhase = 'map' | 'combat' | 'reward' | 'event' | 'shop' | 'rest' | 'gameOver';

export interface RunState extends RngHolder {
  seedText: string;
  rng: number;
  act: number;
  map: ActMap;
  currentNode: string | null;
  phase: RunPhase;

  hp: number;
  maxHp: number;
  gold: number;
  deck: DeckCard[];
  relics: string[];

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

export function createRun(setup: RunSetup): RunState {
  const seed = seedFrom(setup.seedText);
  const holder: RngHolder = { rng: seed };
  const map = generateMap(holder, 1);

  return {
    seedText: setup.seedText,
    rng: holder.rng,
    act: 1,
    map,
    currentNode: null,
    phase: 'map',
    hp: setup.maxHp,
    maxHp: setup.maxHp,
    gold: 99,
    deck: setup.deck.map((defId) => ({ defId, upgraded: false })),
    relics: setup.relics ?? [],
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
  if (!node) return run;
  const next = structuredClone(run);
  next.currentNode = nodeId;
  next.phase = PHASE_BY_KIND[node.kind];
  return next;
}

/** 节点结算完成后回到地图，走完一幕则推进到下一幕。 */
export function completeNode(run: RunState): RunState {
  const next = structuredClone(run);
  const node = next.currentNode ? nodeAt(next.map, next.currentNode) : null;
  if (node) node.visited = true;
  next.cleared += 1;

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

  next.phase = next.phase === 'gameOver' ? next.phase : 'map';
  return next;
}

export function addCard(run: RunState, defId: string): RunState {
  const next = structuredClone(run);
  next.deck.push({ defId, upgraded: false });
  return next;
}

export function removeCard(run: RunState, index: number): RunState {
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
