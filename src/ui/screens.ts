/** 地图、奖励、事件、商店、休息等非战斗界面。 */

import { availableNodes, type MapNode, type NodeKind } from '@engine/map';
import type { RunState } from '@engine/run';
import { cardDef } from '@engine/registry';
import { effectsOf, upgradedCost } from '@engine/combat';
import { EQUIP_SLOT_ORDER, type CardDef, type EquipSlot, type RewardOffer } from '@engine/types';
import { equipmentDef } from '@engine/equipment';
import { RELICS } from '@content/relics';
import { art } from './assets';
import { sfx } from '@audio/index';
import { showDeck } from './deckview';

const NODE_GLYPH: Record<NodeKind, string> = {
  combat: '◆',
  elite: '✦',
  event: '?',
  shop: '⌘',
  rest: '☾',
  boss: '☠',
};

const NODE_NAME: Record<NodeKind, string> = {
  combat: '遭遇',
  elite: '精英',
  event: '异象',
  shop: '残市',
  rest: '篝火',
  boss: '守时者',
};

const NODE_DESC: Record<NodeKind, string> = {
  combat: '普通战斗，胜利后可取一张牌',
  elite: '强敌，掉落遗物与更多时砂',
  event: '抉择，结果各有代价',
  shop: '用时砂买牌',
  rest: '休息回血，或重录一张牌',
  boss: '本幕的终点',
};

/** 地图图注，说明每种节点符号代表什么。 */
function renderLegend(): HTMLElement {
  const box = el('div', 'map-legend');
  box.append(el('div', 'map-legend-title', '图注'));

  const kinds: NodeKind[] = ['combat', 'elite', 'event', 'shop', 'rest', 'boss'];
  for (const kind of kinds) {
    const row = el('div', 'map-legend-row');
    const glyph = el('div', 'map-legend-glyph', NODE_GLYPH[kind]);
    glyph.dataset.kind = kind;
    const text = el('div', 'map-legend-text');
    text.append(
      el('div', 'map-legend-name', NODE_NAME[kind]),
      el('div', 'map-legend-desc', NODE_DESC[kind]),
    );
    row.append(glyph, text);
    box.append(row);
  }
  return box;
}

const TYPE_WORD: Record<string, string> = { weave: '织', ignite: '引', disrupt: '扰' };

/** 强化后的卡面按实际生效数值改写描述，逐个效果替换对应的那个数字。 */
export function cardText(def: CardDef, upgraded: boolean): string {
  if (!upgraded) return def.text;
  const scaled = effectsOf(def, true);
  let text = def.text;
  def.effects.forEach((effect, i) => {
    const next = scaled[i];
    if (!next || next.amount === effect.amount) return;
    text = text.replace(new RegExp(`(?<!\\d)${effect.amount}(?!\\d)`), String(next.amount));
  });
  return text;
}

export function el(tag: string, className = '', text = ''): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function renderRunBar(run: RunState, host?: HTMLElement): HTMLElement {
  const bar = el('div', 'run-bar');
  const deckButton = el('button', 'run-deck', `牌组 ${run.deck.length}`);
  if (host) deckButton.addEventListener('click', () => showDeck(host, run.deck));
  bar.append(
    el('span', '', `第 ${run.act} 幕`),
    el('span', '', `♥ ${run.hp}/${run.maxHp}`),
    el('span', '', `◈ ${run.gold}`),
    deckButton,
  );

  const relics = el('div', 'relics');
  for (const id of run.relics) {
    const def = RELICS.find((r) => r.id === id);
    const icon = el('div', 'relic-icon relic-slot');
    const url = art.relic(def?.art ?? id);
    if (url) icon.style.backgroundImage = `url(${url})`;

    const tip = el('div', 'relic-tip');
    tip.append(
      el('div', 'relic-tip-head', def?.name ?? id),
      el('div', 'relic-tip-body', def?.text ?? ''),
    );
    icon.append(tip);
    relics.append(icon);
  }
  bar.append(relics, renderLoadout(run));
  return bar;
}

const SLOT_NAME: Record<EquipSlot, string> = {
  weapon: '武器',
  armor: '护甲',
  trinket: '饰品',
  core: '机芯',
};

const SLOT_GLYPH: Record<EquipSlot, string> = {
  weapon: '⚔',
  armor: '⛨',
  trinket: '❈',
  core: '⚙',
};

/** 四个装备槽常驻显示，空槽留一个占位符。 */
function renderLoadout(run: RunState): HTMLElement {
  const box = el('div', 'loadout');
  for (const slot of EQUIP_SLOT_ORDER) {
    const id = run.equipment?.[slot] ?? null;
    const cell = el('div', 'equip-slot');
    cell.dataset.slot = slot;

    const tip = el('div', 'relic-tip');
    if (id) {
      const def = equipmentDef(id);
      const url = art.equipment(def.art);
      if (url) cell.style.backgroundImage = `url(${url})`;
      else cell.textContent = SLOT_GLYPH[slot];
      tip.append(
        el('div', 'relic-tip-head', `${def.name}　${SLOT_NAME[slot]}`),
        el('div', 'relic-tip-body', def.text),
      );
    } else {
      cell.classList.add('empty');
      cell.textContent = SLOT_GLYPH[slot];
      tip.append(
        el('div', 'relic-tip-head', SLOT_NAME[slot]),
        el('div', 'relic-tip-body', '尚未装备。'),
      );
    }
    cell.append(tip);
    box.append(cell);
  }
  return box;
}

/** 装备的展示卡，用于奖励、商店与手册。 */
export function renderEquipCard(id: string): HTMLElement {
  const def = equipmentDef(id);
  const node = el('div', 'equip-card');
  node.dataset.rarity = def.rarity;

  const icon = el('div', 'equip-card-art');
  const url = art.equipment(def.art);
  if (url) icon.style.backgroundImage = `url(${url})`;
  else icon.textContent = SLOT_GLYPH[def.slot];

  const body = el('div', 'equip-card-body');
  body.append(
    el('div', 'equip-card-name', def.name),
    el('div', 'equip-card-slot', SLOT_NAME[def.slot]),
    el('div', 'equip-card-text', def.text),
  );
  node.append(icon, body);
  return node;
}

/** 地图。行自下而上排列，最上方是本幕的守时者。 */
const ACT_BG: Record<number, string> = {
  1: 'act1-clocktower',
  2: 'act2-reversed-gallery',
  3: 'act3-null-sanctum',
};

const ACT_NAME: Record<number, string> = {
  1: '崩坏钟楼',
  2: '逆位回廊',
  3: '归零圣所',
};

export function renderMap(
  run: RunState,
  onPick: (id: string) => void,
  host?: HTMLElement,
): HTMLElement {
  const screen = el('div', 'screen map-screen');

  const bg = el('div', 'map-bg');
  const url = art.bg(ACT_BG[run.act] ?? 'act1-clocktower');
  if (url) bg.style.backgroundImage = `url(${url})`;
  screen.append(bg, el('div', 'scene-grain'));

  screen.append(el('div', 'screen-title', ACT_NAME[run.act] ?? '时之圣殿'));
  screen.append(renderLegend());
  screen.append(el('div', 'screen-sub', `已推进 ${run.cleared} 处`));
  screen.append(renderRunBar(run, host ?? screen));

  const scroll = el('div', 'map-scroll');
  const canvas = el('div', 'map-canvas');
  const reachable = new Set(availableNodes(run.map, run.currentNode));

  const rows: MapNode[][] = Array.from({ length: run.map.rows }, () => []);
  for (const node of Object.values(run.map.nodes)) rows[node.row]?.push(node);

  for (let r = 0; r < run.map.rows; r++) {
    const colEl = el('div', 'map-col');
    const cells = new Array(6).fill(null).map(() => el('div'));

    for (const node of rows[r] ?? []) {
      const dot = el('div', 'map-node', NODE_GLYPH[node.kind]);
      dot.dataset.kind = node.kind;

      const tip = el('div', 'node-tip');
      tip.append(
        el('div', 'node-tip-head', NODE_NAME[node.kind]),
        el('div', 'node-tip-body', NODE_DESC[node.kind]),
      );
      dot.append(tip);
      if (node.visited) dot.classList.add('visited');
      if (node.id === run.currentNode) dot.classList.add('current');
      if (reachable.has(node.id)) {
        dot.classList.add('reachable');
        dot.addEventListener('click', () => {
          sfx.pick();
          onPick(node.id);
        });
      }
      dot.dataset.id = node.id;
      dot.style.transform = `translateY(${(node.drift * 62).toFixed(1)}px)`;
      dot.addEventListener('pointerenter', () => {
        const r = dot.getBoundingClientRect();
        dot.classList.toggle('tip-below', r.top < 150);
      });
      cells[node.col]?.append(dot);
    }
    colEl.append(...cells);
    canvas.append(colEl);
  }

  const edges = document.createElementNS(SVG_NS, 'svg');
  edges.setAttribute('class', 'map-edges');
  canvas.append(edges);

  scroll.append(canvas);
  screen.append(scroll);

  attachPanning(scroll);

  requestAnimationFrame(() => {
    drawEdges(edges, canvas, run, reachable);
    const current = run.currentNode ? canvas.querySelector(`[data-id="${run.currentNode}"]`) : null;
    if (current) {
      const box = current.getBoundingClientRect();
      const host = scroll.getBoundingClientRect();
      scroll.scrollLeft += box.left - host.left - host.width * 0.34;
    } else {
      scroll.scrollLeft = 0;
    }
  });
  return screen;
}

/** 按住地图拖动平移，松手后按残余速度滑行。 */
function attachPanning(scroll: HTMLElement): void {
  let dragging = false;
  let lastX = 0;
  let velocity = 0;
  let lastTime = 0;
  let glide = 0;

  const stopGlide = () => {
    if (glide) cancelAnimationFrame(glide);
    glide = 0;
  };

  scroll.addEventListener('pointerdown', (ev) => {
    if ((ev.target as HTMLElement).closest('.map-node')) return;
    dragging = true;
    lastX = ev.clientX;
    lastTime = ev.timeStamp;
    velocity = 0;
    stopGlide();
    scroll.classList.add('grabbing');
    scroll.setPointerCapture(ev.pointerId);
  });

  scroll.addEventListener('pointermove', (ev) => {
    if (!dragging) return;
    const dx = ev.clientX - lastX;
    const dt = Math.max(1, ev.timeStamp - lastTime);
    scroll.scrollLeft -= dx;
    velocity = dx / dt;
    lastX = ev.clientX;
    lastTime = ev.timeStamp;
  });

  const release = () => {
    if (!dragging) return;
    dragging = false;
    scroll.classList.remove('grabbing');

    let speed = velocity * 16;
    const step = () => {
      speed *= 0.93;
      scroll.scrollLeft -= speed;
      if (Math.abs(speed) > 0.4) glide = requestAnimationFrame(step);
      else glide = 0;
    };
    if (Math.abs(speed) > 1) glide = requestAnimationFrame(step);
  };

  scroll.addEventListener('pointerup', release);
  scroll.addEventListener('pointercancel', release);
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** 连线在节点布局完成后测量绘制，避免与网格排布重复计算。 */
function drawEdges(
  svg: SVGElement,
  canvas: HTMLElement,
  run: RunState,
  reachable: Set<string>,
): void {
  const box = canvas.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  svg.setAttribute('width', String(box.width));
  svg.setAttribute('height', String(box.height));

  const center = (id: string) => {
    const node = canvas.querySelector(`[data-id="${id}"]`);
    if (!node) return null;
    const r = node.getBoundingClientRect();
    return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
  };

  for (const node of Object.values(run.map.nodes)) {
    const from = center(node.id);
    if (!from) continue;
    for (const nextId of node.next) {
      const to = center(nextId);
      if (!to) continue;

      const live = node.id === run.currentNode && reachable.has(nextId);
      const path = document.createElementNS(SVG_NS, 'path');
      const midY = (from.y + to.y) / 2;
      path.setAttribute(
        'd',
        `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`,
      );
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', live ? 'rgba(240, 180, 41, 0.75)' : 'rgba(120, 112, 180, 0.28)');
      path.setAttribute('stroke-width', live ? '2.4' : '1.6');
      path.setAttribute('stroke-dasharray', node.visited ? '0' : '5 7');
      svg.append(path);
    }
  }
}

/** 奖励界面把每一项交互交回调用方，取走后该项自行消失。 */
export interface RewardHandlers {
  onCard: (defId: string, claim: () => void) => void;
  onRelic: (id: string, claim: () => void) => void;
  onEquipment: (id: string, claim: () => void) => void;
  onRemoveCard: (claim: () => void) => void;
  onUpgradeCard: (claim: () => void) => void;
  onDone: () => void;
}

const REWARD_TITLE: Record<string, string> = {
  card: '取一张牌织入牌组',
  relic: '一件遗物',
  equipment: '取一件装备穿上',
  gold: '时砂',
  heal: '伤口收拢',
  removeCard: '洗去一张牌',
  upgradeCard: '重录一张牌',
  nothing: '什么也没留下',
};

export function renderReward(offers: RewardOffer[], handlers: RewardHandlers): HTMLElement {
  const overlay = el('div', 'overlay');
  const panel = el('div', 'panel reward-panel');
  panel.append(el('h2', '', '回响余烬'));

  for (const offer of offers) {
    const block = el('div', 'reward-block');
    block.append(el('div', 'reward-title', REWARD_TITLE[offer.kind] ?? offer.kind));
    const claim = () => block.remove();

    switch (offer.kind) {
      case 'card': {
        const row = el('div', 'card-row');
        for (const defId of offer.options ?? []) {
          const node = renderStaticCard(defId);
          node.addEventListener('click', () => {
            sfx.play(defId);
            handlers.onCard(defId, claim);
          });
          row.append(node);
        }
        block.append(row);
        break;
      }
      case 'equipment': {
        const row = el('div', 'equip-row');
        for (const id of offer.options ?? []) {
          const node = renderEquipCard(id);
          node.addEventListener('click', () => {
            sfx.play('relic');
            handlers.onEquipment(id, claim);
          });
          row.append(node);
        }
        block.append(row);
        break;
      }
      case 'relic': {
        for (const id of offer.options ?? []) {
          const def = RELICS.find((r) => r.id === id);
          const row = el('div', 'relic-reward');
          const img = document.createElement('img');
          const url = art.relic(def?.art ?? id);
          if (url) img.src = url;
          const info = el('div');
          info.append(el('div', 'choice-title', def?.name ?? id));
          info.append(el('div', 'choice-desc', def?.text ?? ''));
          row.append(img, info);
          row.addEventListener('click', () => {
            sfx.play('relic');
            handlers.onRelic(id, claim);
          });
          block.append(row);
        }
        break;
      }
      case 'gold':
        block.append(el('div', 'reward-note', `获得 ${offer.amount ?? 0} 枚时砂。`));
        break;
      case 'heal':
        block.append(el('div', 'reward-note', `回复 ${offer.amount ?? 0} 点生命。`));
        break;
      case 'removeCard': {
        const button = el('button', 'ghost-button', '挑一张洗去');
        button.addEventListener('click', () => handlers.onRemoveCard(claim));
        block.append(button);
        break;
      }
      case 'upgradeCard': {
        const button = el('button', 'ghost-button', '挑一张重录');
        button.addEventListener('click', () => handlers.onUpgradeCard(claim));
        block.append(button);
        break;
      }
      case 'nothing':
        block.append(el('div', 'reward-note', '余烬散得很干净。'));
        break;
    }
    panel.append(block);
  }

  const done = el('button', 'ghost-button', '继续前行');
  done.addEventListener('click', handlers.onDone);
  panel.append(done);

  overlay.append(panel);
  return overlay;
}

/** 非交互的卡牌展示，用于奖励与商店。 */
export function renderStaticCard(defId: string, upgraded = false): HTMLElement {
  const def = cardDef(defId);
  const shownCost = upgraded ? upgradedCost(def) : def.cost;
  const node = el('div', 'card');
  node.dataset.type = def.type;
  if (upgraded) node.classList.add('upgraded');

  const inner = el('div', 'card-inner');
  const artNode = el('div', 'card-art');
  const url = art.card(def.art ?? def.id);
  if (url) artNode.style.backgroundImage = `url(${url})`;

  const body = el('div', 'card-body');
  body.append(el('div', 'card-name', upgraded ? `${def.name}+` : def.name));
  const text = el('div', 'card-text');
  text.innerHTML = cardText(def, upgraded).replace(/(\d+)/g, '<b>$1</b>');
  body.append(text);

  inner.append(artNode, body);
  const mark = el('div', 'card-mark', TYPE_WORD[def.type] ?? '');
  node.append(inner, el('div', 'card-edge'), mark, el('div', 'card-cost', String(shownCost)));
  return node;
}

export interface EventChoice {
  label: string;
  desc: string;
  apply: () => void;
}

export function renderEvent(
  title: string,
  body: string,
  choices: EventChoice[],
): HTMLElement {
  const overlay = el('div', 'overlay');
  const panel = el('div', 'panel');
  panel.append(el('h2', '', title), el('p', '', body));

  const row = el('div', 'choice-row');
  for (const choice of choices) {
    const node = el('button', 'choice');
    node.append(el('div', 'choice-title', choice.label));
    node.append(el('div', 'choice-desc', choice.desc));
    node.addEventListener('click', () => {
      sfx.pick();
      choice.apply();
    });
    row.append(node);
  }
  panel.append(row);
  overlay.append(panel);
  return overlay;
}

/** 战斗失败后的抉择：花时砂回到节点开头重来，或者就此收手。 */
export function renderDefeat(
  run: RunState,
  opts: { retryCost: number; retryLimit: number; canRetry: boolean; onRetry: () => void; onAbandon: () => void },
): HTMLElement {
  const overlay = el('div', 'overlay');
  const panel = el('div', 'panel');
  panel.append(el('h2', '', '织线断了'));
  panel.append(
    el(
      'p',
      '',
      `你倒在第 ${run.act} 幕。回响还没散尽，付出代价可以把这一节点重走一遍：` +
        `已重挑 ${run.retries}/${opts.retryLimit} 次。`,
    ),
  );

  const row = el('div', 'confirm-row');
  const retry = el('button', 'title-button primary', `重挑 · ◈${opts.retryCost}`) as HTMLButtonElement;
  if (opts.canRetry) {
    retry.addEventListener('click', opts.onRetry);
  } else {
    retry.disabled = true;
    retry.textContent = run.retries >= opts.retryLimit ? '重挑次数已用尽' : `时砂不足 · ◈${opts.retryCost}`;
  }

  const give = el('button', 'title-button', '放弃这一局');
  give.addEventListener('click', opts.onAbandon);

  row.append(retry, give);
  panel.append(row);
  overlay.append(panel);
  return overlay;
}

export function renderGameOver(run: RunState, onRestart: () => void): HTMLElement {
  const overlay = el('div', 'overlay');
  const panel = el('div', 'panel');
  panel.append(el('h2', '', run.result === 'victory' ? '时序归位' : '回响散尽'));
  panel.append(
    el(
      'p',
      '',
      run.result === 'victory'
        ? `你走完了三幕，时之圣殿重新开始转动。推进 ${run.cleared} 处。`
        : `织时者在第 ${run.act} 幕停下。推进 ${run.cleared} 处。`,
    ),
  );
  const again = el('button', 'ghost-button', '再来一局');
  again.addEventListener('click', onRestart);
  panel.append(again);
  overlay.append(panel);
  return overlay;
}
