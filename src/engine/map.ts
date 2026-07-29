/** 三幕地图生成。节点分层，层内分支，相邻层之间连边。 */

import { nextFloat, nextInt, shuffle, type RngHolder } from './rng';

export type NodeKind = 'combat' | 'elite' | 'event' | 'shop' | 'rest' | 'boss';

export interface MapNode {
  id: string;
  act: number;
  row: number;
  col: number;
  /** 纵向微偏，让节点脱离规整网格。范围约 -0.4 到 0.4 个格位。 */
  drift: number;
  kind: NodeKind;
  next: string[];
  visited: boolean;
}

export interface ActMap {
  act: number;
  rows: number;
  nodes: Record<string, MapNode>;
  entries: string[];
  bossId: string;
}

/** 每幕的推进长度递增，后段路更长也更险。 */
const ROWS_BY_ACT: Record<number, [number, number]> = {
  1: [11, 13],
  2: [13, 15],
  3: [15, 17],
};

const PATHS_RANGE: [number, number] = [4, 6];
const WIDTH = 6;

/** 各类节点的基础权重，随层数推进调整。 */
const WEIGHTS: Record<Exclude<NodeKind, 'boss'>, number> = {
  combat: 34,
  event: 18,
  elite: 14,
  rest: 12,
  shop: 15,
};

function pickKind(rng: RngHolder, row: number, rows: number): NodeKind {
  // 首层固定为普通战斗，末层前一层固定为休息点
  if (row === 0) return 'combat';
  if (row === rows - 2) return 'rest';

  const weights = { ...WEIGHTS };
  // 精英与商店在前三层不出现，避免开局难度尖刺
  if (row < 3) {
    weights.elite = 0;
    weights.shop = 0;
  }
  if (row > rows - 4) weights.shop += 6;

  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = nextFloat(rng) * total;
  for (const [kind, w] of Object.entries(weights)) {
    roll -= w;
    if (roll < 0) return kind as NodeKind;
  }
  return 'combat';
}

/**
 * 从底部向上生长若干条路径，路径可以合并也可以分叉。
 * 同层相邻节点之间的连线不允许交叉。
 */
export function generateMap(rng: RngHolder, act: number): ActMap {
  const [minRows, maxRows] = ROWS_BY_ACT[act] ?? ROWS_BY_ACT[1]!;
  const rows = minRows + nextInt(rng, maxRows - minRows + 1);
  const paths = PATHS_RANGE[0] + nextInt(rng, PATHS_RANGE[1] - PATHS_RANGE[0] + 1);

  const nodes: Record<string, MapNode> = {};
  const grid: (string | null)[][] = Array.from({ length: rows }, () =>
    new Array<string | null>(WIDTH).fill(null),
  );

  const idOf = (row: number, col: number) => `a${act}-${row}-${col}`;

  const ensure = (row: number, col: number): MapNode => {
    const id = idOf(row, col);
    let node = nodes[id];
    if (!node) {
      node = {
        id,
        act,
        row,
        col,
        drift: (nextFloat(rng) - 0.5) * 0.8,
        kind: row === rows - 1 ? 'boss' : pickKind(rng, row, rows),
        next: [],
        visited: false,
      };
      nodes[id] = node;
      grid[row]![col] = id;
    }
    return node;
  };

  const bossCol = Math.floor(WIDTH / 2);
  const boss = ensure(rows - 1, bossCol);
  boss.drift = 0;

  const startCols = shuffle(rng, [0, 1, 2, 3, 4, 5]).slice(0, paths);
  const entries: string[] = [];

  for (const startCol of startCols) {
    let col = startCol;
    let current = ensure(0, col);
    if (!entries.includes(current.id)) entries.push(current.id);

    for (let row = 1; row < rows - 1; row++) {
      // 偶尔走直线，偶尔大幅斜切，让路径不再是均匀抖动
      const roll = nextFloat(rng);
      const step = roll < 0.34 ? 0 : roll < 0.78 ? (nextInt(rng, 2) === 0 ? -1 : 1) : nextInt(rng, 3) - 1;
      col = Math.max(0, Math.min(WIDTH - 1, col + step));
      const next = ensure(row, col);
      if (!current.next.includes(next.id)) current.next.push(next.id);
      current = next;
    }
    if (!current.next.includes(boss.id)) current.next.push(boss.id);
  }

  removeCrossings(nodes);
  repairDeadEnds(nodes, rows, boss);
  balanceKinds(nodes, rng);
  ensureVariety(nodes, rng, rows);

  return { act, rows, nodes, entries, bossId: boss.id };
}

/** 两条边在同一间隙内互相穿越时，删除其中一条。 */
function removeCrossings(nodes: Record<string, MapNode>): void {
  const list = Object.values(nodes);
  for (const a of list) {
    for (const b of list) {
      if (a.row !== b.row || a.col >= b.col) continue;
      for (const aNext of [...a.next]) {
        for (const bNext of [...b.next]) {
          const an = nodes[aNext];
          const bn = nodes[bNext];
          if (!an || !bn) continue;
          if (an.col > bn.col && a.next.length > 1) {
            a.next = a.next.filter((id) => id !== aNext);
          }
        }
      }
    }
  }
}

/**
 * 去交叉可能把某个节点的出边删光，形成走不通的死路。
 * 这里为每个还没有出边的节点接回下一层最近的节点。
 */
function repairDeadEnds(nodes: Record<string, MapNode>, rows: number, boss: MapNode): void {
  const byRow = new Map<number, MapNode[]>();
  for (const node of Object.values(nodes)) {
    const list = byRow.get(node.row) ?? [];
    list.push(node);
    byRow.set(node.row, list);
  }

  for (let row = 0; row < rows - 1; row++) {
    for (const node of byRow.get(row) ?? []) {
      if (node.next.length) continue;

      if (row === rows - 2) {
        node.next.push(boss.id);
        continue;
      }

      const nextRow = byRow.get(row + 1) ?? [];
      if (!nextRow.length) {
        node.next.push(boss.id);
        continue;
      }
      const nearest = nextRow.reduce((best, cur) =>
        Math.abs(cur.col - node.col) < Math.abs(best.col - node.col) ? cur : best,
      );
      node.next.push(nearest.id);
    }
  }
}

/** 相邻两层不出现连续的同类特殊节点。 */
function balanceKinds(nodes: Record<string, MapNode>, rng: RngHolder): void {
  const byRow = new Map<number, MapNode[]>();
  for (const node of Object.values(nodes)) {
    const row = byRow.get(node.row) ?? [];
    row.push(node);
    byRow.set(node.row, row);
  }

  for (const [row, list] of byRow) {
    const previous = byRow.get(row - 1) ?? [];
    for (const node of list) {
      if (node.kind === 'combat' || node.kind === 'boss') continue;
      const clash = previous.some((p) => p.kind === node.kind && p.col === node.col);
      if (clash) node.kind = nextFloat(rng) < 0.6 ? 'combat' : 'event';
    }
  }
}

/**
 * 补齐补给点数量，按地图长度缩放，避免出现一路没有商店或篝火的图。
 * 从中后段的普通战斗节点里改写。
 */
function ensureVariety(nodes: Record<string, MapNode>, rng: RngHolder, rows: number): void {
  const need: [NodeKind, number][] = [
    ['shop', Math.max(3, Math.floor(rows / 4))],
    ['rest', Math.max(3, Math.floor(rows / 4))],
    ['elite', Math.max(2, Math.floor(rows / 5))],
  ];

  for (const [kind, count] of need) {
    const have = Object.values(nodes).filter((n) => n.kind === kind).length;
    if (have >= count) continue;

    const pool = shuffle(
      rng,
      Object.values(nodes).filter(
        (n) => n.kind === 'combat' && n.row > 2 && n.row < rows - 2,
      ),
    );
    for (let i = 0; i < count - have && i < pool.length; i++) {
      pool[i]!.kind = kind;
    }
  }
}

export function nodeAt(map: ActMap, id: string): MapNode | null {
  return map.nodes[id] ?? null;
}

/** 当前可进入的节点。未开始时为全部入口。 */
export function availableNodes(map: ActMap, currentId: string | null): string[] {
  if (!currentId) return map.entries;
  return nodeAt(map, currentId)?.next ?? [];
}
