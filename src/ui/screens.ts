/** 地图、奖励、事件、商店、休息等非战斗界面。 */

import { availableNodes, type MapNode, type NodeKind } from '@engine/map';
import type { RunState } from '@engine/run';
import { cardDef } from '@engine/registry';
import { effectsOf, upgradedCost } from '@engine/combat';
import {
  EQUIP_SLOT_ORDER,
  type CardDef,
  type EquipSlot,
  type EquipmentDef,
  type RewardOffer,
  type ShopItem,
} from '@engine/types';
import { equipmentDef, equippedIds } from '@engine/equipment';
import { RELICS, type RelicDef } from '@content/relics';
import { art } from './assets';
import { sfx } from '@audio/index';
import { confirmAction } from './confirm';
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
  const mount = host ?? bar;
  const worn = wornIds(run);

  const deckButton = el('button', 'run-deck', `牌组 ${run.deck.length}`);
  deckButton.addEventListener('click', () => showDeck(mount, run.deck));

  const relicButton = el('button', 'run-deck', `遗物 ${run.relics.length}`);
  relicButton.addEventListener('click', () => {
    sfx.pick();
    mount.append(renderRelicPanel(run));
  });

  const equipButton = el(
    'button',
    'run-deck',
    `装备 ${worn.length}/${EQUIP_SLOT_ORDER.length}`,
  );
  equipButton.addEventListener('click', () => {
    sfx.pick();
    mount.append(renderLoadoutPanel(run));
  });

  bar.append(
    el('span', '', `第 ${run.act} 幕`),
    el('span', '', `♥ ${run.hp}/${run.maxHp}`),
    el('span', '', `◈ ${run.gold}`),
    deckButton,
    relicButton,
    equipButton,
  );
  return bar;
}

function wornIds(run: RunState): string[] {
  return run.equipment ? equippedIds(run.equipment) : [];
}

function relicDef(id: string): RelicDef | undefined {
  return RELICS.find((r) => r.id === id);
}

/** 面板右上角的关闭，点遮罩同样关闭。 */
function closablePanel(overlay: HTMLElement, panel: HTMLElement): HTMLElement {
  panel.classList.add('has-close');
  const close = el('button', 'panel-close', '×');
  close.title = '关闭';
  close.addEventListener('click', () => overlay.remove());
  panel.append(close);
  overlay.append(panel);
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) overlay.remove();
  });
  return overlay;
}

/** 已有遗物的清单：大图、名字与效果说明。 */
export function renderRelicPanel(run: RunState): HTMLElement {
  const overlay = el('div', 'overlay picker-overlay');
  const panel = el('div', 'panel holding-panel');
  panel.append(el('h2', '', '遗物'));
  panel.append(el('p', '', `随身 ${run.relics.length} 件，效果整局常驻。`));

  if (!run.relics.length) {
    panel.append(el('div', 'holding-empty', '还没有捡到任何遗物。'));
  } else {
    const list = el('div', 'holding-list');
    for (const id of run.relics) {
      const def = relicDef(id);
      const row = el('div', 'holding-row');

      const icon = el('div', 'holding-orb');
      const url = art.relic(def?.art ?? id);
      if (url) icon.style.backgroundImage = `url(${url})`;

      const body = el('div', 'holding-body');
      body.append(
        el('div', 'holding-name', def?.name ?? id),
        el('div', 'holding-text', def?.text ?? ''),
      );
      row.append(icon, body);
      list.append(row);
    }
    panel.append(list);
  }
  return closablePanel(overlay, panel);
}

/** 装备定义里的钩子决定这件装备在哪个时机结算。 */
function equipTiming(def: EquipmentDef): string {
  const parts: string[] = [];
  if (def.onTurnStart?.length) parts.push('每回合开始时结算一次');
  if (def.onTurnEnd?.length) parts.push('敌方回合结束时结算一次');
  if (!parts.length) parts.push('常驻生效，不占用回合结算');
  return parts.join('　·　');
}

/** 四个槽位分区展示，空槽画出轮廓。 */
export function renderLoadoutPanel(run: RunState): HTMLElement {
  const overlay = el('div', 'overlay picker-overlay');
  const panel = el('div', 'panel holding-panel');
  panel.append(el('h2', '', '装备'));
  panel.append(
    el('p', '', `四个槽位各能放一件，当前 ${wornIds(run).length}/${EQUIP_SLOT_ORDER.length}。`),
  );

  const grid = el('div', 'slot-grid');
  for (const slot of EQUIP_SLOT_ORDER) {
    const id = run.equipment?.[slot] ?? null;
    const cell = el('div', 'slot-cell');
    cell.dataset.slot = slot;
    cell.append(el('div', 'slot-label', `${SLOT_GLYPH[slot]}　${SLOT_NAME[slot]}`));

    if (id) {
      const def = equipmentDef(id);
      const face = el('div', 'slot-face');
      const url = art.equipment(def.art);
      if (url) face.style.backgroundImage = `url(${url})`;
      else face.textContent = SLOT_GLYPH[slot];

      const body = el('div', 'holding-body');
      body.append(
        el('div', 'holding-name', def.name),
        el('div', 'holding-text', def.text),
        el('div', 'slot-timing', equipTiming(def)),
      );
      cell.append(face, body);
    } else {
      cell.classList.add('empty');
      const face = el('div', 'slot-face outline', SLOT_GLYPH[slot]);
      cell.append(face, el('div', 'holding-text', '这个槽位还空着。'));
    }
    grid.append(cell);
  }

  panel.append(grid);
  return closablePanel(overlay, panel);
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

/** 装备的大图卡面，art 缺失时退回槽位符号。 */
export function renderEquipPortrait(id: string): HTMLElement {
  const def = equipmentDef(id);
  const node = el('div', 'equip-portrait');
  node.dataset.rarity = def.rarity;

  const face = el('div', 'equip-portrait-art');
  const url = art.equipment(def.art);
  if (url) face.style.backgroundImage = `url(${url})`;
  else face.textContent = SLOT_GLYPH[def.slot];
  face.append(el('div', 'equip-portrait-slot', SLOT_NAME[def.slot]));

  const body = el('div', 'equip-portrait-body');
  body.append(
    el('div', 'equip-portrait-name', def.name),
    el('div', 'equip-portrait-text', def.text),
  );
  node.append(face, body);
  return node;
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
  onPickCard: (defId: string, claim: () => void) => void;
  onPickRelic: (id: string, claim: () => void) => void;
  onPickEquipment: (id: string, claim: () => void) => void;
  onRemoveCard: (claim: () => void) => void;
  onUpgradeCard: (claim: () => void) => void;
  /** 时砂、回血这类无需挑选的项，玩家按下收取后触发。 */
  onSimple?: (offer: RewardOffer, claim: () => void) => void;
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
            handlers.onPickCard(defId, claim);
          });
          row.append(node);
        }
        block.append(row);
        break;
      }
      case 'equipment': {
        const row = el('div', 'portrait-row');
        for (const id of offer.options ?? []) {
          const node = renderEquipPortrait(id);
          node.addEventListener('click', () => {
            sfx.play('relic');
            handlers.onPickEquipment(id, claim);
          });
          row.append(node);
        }
        block.append(row);
        break;
      }
      case 'relic': {
        for (const id of offer.options ?? []) {
          const def = relicDef(id);
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
            handlers.onPickRelic(id, claim);
          });
          block.append(row);
        }
        break;
      }
      case 'gold': {
        block.append(el('div', 'reward-note', `获得 ${offer.amount ?? 0} 枚时砂。`));
        const ack = simpleClaim(offer, claim, handlers);
        if (ack) block.append(ack);
        break;
      }
      case 'heal': {
        block.append(el('div', 'reward-note', `回复 ${offer.amount ?? 0} 点生命。`));
        const ack = simpleClaim(offer, claim, handlers);
        if (ack) block.append(ack);
        break;
      }
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

/** 无需挑选的奖励留一个收取按钮，调用方没接就只显示说明。 */
function simpleClaim(
  offer: RewardOffer,
  claim: () => void,
  handlers: RewardHandlers,
): HTMLElement | null {
  const onSimple = handlers.onSimple;
  if (!onSimple) return null;
  const button = el('button', 'ghost-button', '收下');
  button.addEventListener('click', () => {
    sfx.pick();
    onSimple(offer, claim);
  });
  return button;
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

const TYPE_NAME: Record<string, string> = { weave: '织牌', ignite: '引牌', disrupt: '扰牌' };

const RARITY_NAME: Record<string, string> = {
  starter: '基础',
  common: '常见',
  uncommon: '罕见',
  rare: '稀有',
  curse: '诅咒',
};

/** 服务类商品的符号与文案。 */
const SERVICE_GLYPH: Record<string, string> = {
  removeCard: '✂',
  upgradeCard: '✧',
  supply: '✚',
};

const SERVICE_NAME: Record<string, string> = {
  removeCard: '洗去一张牌',
  upgradeCard: '重录一张牌',
  supply: '补给',
};

/** 商店界面把点击交回调用方，本文件不读写进程状态。 */
export interface ShopView {
  items: ShopItem[];
  /** 本次刷新的价格。 */
  rerollCost: number;
  /** 已售出的商品，给出下标清单或逐项判定。 */
  sold?: readonly number[] | ((index: number) => boolean);
  onBuy: (item: ShopItem, index: number) => void;
  onReroll: () => void;
  onLeave: () => void;
  /** 牌组、遗物等弹层的挂载点，省略时挂在界面自身上。 */
  host?: HTMLElement;
}

export function renderShop(run: RunState, view: ShopView): HTMLElement {
  const screen = el('div', 'screen shop-screen');
  screen.append(el('div', 'scene-grain'));
  screen.append(el('div', 'screen-title', '残市'));
  screen.append(el('div', 'screen-sub', '有人在这里用还没发生的事换已经发生的事'));
  screen.append(renderRunBar(run, view.host ?? screen));

  const panel = el('div', 'shop-panel');

  const head = el('div', 'shop-head');
  const purse = el('div', 'shop-purse');
  purse.append(el('span', 'shop-purse-mark', '◈'), el('span', 'shop-purse-num', String(run.gold)));
  purse.append(el('span', 'shop-purse-label', '时砂在手'));

  const reroll = el('button', 'shop-reroll', `换一批 · ◈${view.rerollCost}`) as HTMLButtonElement;
  if (run.gold < view.rerollCost) {
    reroll.disabled = true;
    reroll.classList.add('broke');
  } else {
    reroll.addEventListener('click', () => {
      sfx.pick();
      view.onReroll();
    });
  }
  head.append(purse, reroll);
  panel.append(head);

  const soldSet = typeof view.sold === 'function' ? null : new Set(view.sold ?? []);
  const isSold = (index: number) =>
    soldSet ? soldSet.has(index) : (view.sold as (index: number) => boolean)(index);

  const shelf = el('div', 'shop-rack');
  view.items.forEach((item, index) => {
    const tile = renderShopItem(item);
    const done = isSold(index);
    const affordable = run.gold >= item.price;

    if (done) {
      tile.classList.add('sold');
      tile.dataset.stamp = '已售出';
    } else if (!affordable) {
      tile.classList.add('broke');
    } else {
      tile.addEventListener('click', () => {
        sfx.pick();
        view.onBuy(item, index);
      });
    }
    shelf.append(tile);
  });
  panel.append(shelf);
  screen.append(panel);

  const actions = el('div', 'shop-actions');
  const leave = el('button', 'ghost-button', '离开');
  leave.addEventListener('click', view.onLeave);
  actions.append(leave);
  screen.append(actions);
  return screen;
}

/** 货架上的一格。四种呈现共用同一副外框与同一个高度。 */
function renderShopItem(item: ShopItem): HTMLElement {
  const tile = el('div', 'shop-tile');
  tile.dataset.kind = item.kind;

  const face = el('div', 'shop-face');
  const body = el('div', 'shop-body');

  switch (item.kind) {
    case 'card': {
      const def = cardDef(item.id!);
      face.append(renderStaticCard(def.id));
      body.append(
        el('div', 'shop-name', def.name),
        el(
          'div',
          'shop-text',
          `${TYPE_NAME[def.type] ?? def.type} · ${RARITY_NAME[def.rarity] ?? def.rarity} · 费用 ${def.cost}`,
        ),
      );
      break;
    }
    case 'equipment': {
      const def = equipmentDef(item.id!);
      const portrait = el('div', 'shop-portrait');
      const url = art.equipment(def.art);
      if (url) portrait.style.backgroundImage = `url(${url})`;
      else portrait.textContent = SLOT_GLYPH[def.slot];
      portrait.append(el('div', 'shop-portrait-slot', SLOT_NAME[def.slot]));
      face.append(portrait);
      body.append(el('div', 'shop-name', def.name), el('div', 'shop-text', def.text));
      break;
    }
    case 'relic': {
      const def = relicDef(item.id!);
      const orb = el('div', 'shop-orb');
      const url = art.relic(def?.art ?? item.id!);
      if (url) orb.style.backgroundImage = `url(${url})`;
      face.append(orb);
      body.append(
        el('div', 'shop-name', def?.name ?? item.id!),
        el('div', 'shop-text', def?.text ?? ''),
      );
      break;
    }
    default: {
      const rune = el('div', 'shop-rune', SERVICE_GLYPH[item.kind] ?? '◈');
      face.append(rune);
      const desc: Record<string, string> = {
        removeCard: '从牌组里永久抽走一张。',
        upgradeCard: '把一张牌永久强化。',
        supply: `回复 ${item.amount ?? 0} 点生命。`,
      };
      body.append(
        el('div', 'shop-name', SERVICE_NAME[item.kind] ?? item.kind),
        el('div', 'shop-text', desc[item.kind] ?? ''),
      );
      break;
    }
  }

  const price = el('div', 'shop-price');
  price.append(el('span', 'shop-price-mark', '◈'), el('span', '', String(item.price)));

  tile.append(face, body, price);
  return tile;
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

export interface DefeatOptions {
  retryCost: number;
  retryLimit: number;
  canRetry: boolean;
  onRetry: () => void;
  onAbandon: () => void;
}

/** 战斗失败后的抉择：花时砂回到节点开头重来，或者就此收手。 */
export function renderDefeat(run: RunState, opts: DefeatOptions): HTMLElement {
  const overlay = el('div', 'overlay defeat-overlay');
  const panel = el('div', 'panel defeat-panel');

  panel.append(el('div', 'defeat-mark', '⧖'));
  panel.append(el('h2', '', '织线断了'));
  panel.append(el('p', '', '你倒下了，但这一节点的时间还能倒回。'));

  const left = Math.max(0, opts.retryLimit - run.retries);
  const facts = el('div', 'defeat-facts');
  facts.append(
    defeatFact('这是第几次重挑', `第 ${run.retries + 1} 次`),
    defeatFact('还剩几次', `${left} / ${opts.retryLimit}`),
    defeatFact('这次要付', `◈ ${opts.retryCost}`),
    defeatFact('手上时砂', `◈ ${run.gold}`),
  );
  panel.append(facts);

  const outOfTries = run.retries >= opts.retryLimit;
  const broke = run.gold < opts.retryCost;
  if (!opts.canRetry) {
    const reason = outOfTries
      ? `这一节点已经倒回 ${opts.retryLimit} 次，时间不肯再退了。`
      : broke
        ? `倒回一次要 ${opts.retryCost} 枚时砂，你手上只有 ${run.gold} 枚，付不起。`
        : '这里没有可以退回的落点。';
    panel.append(el('div', 'defeat-block', reason));
  }

  const row = el('div', 'confirm-row');
  const retry = el(
    'button',
    'title-button primary',
    `重挑这一节点 · ◈${opts.retryCost}`,
  ) as HTMLButtonElement;
  if (opts.canRetry) {
    retry.addEventListener('click', opts.onRetry);
  } else {
    retry.disabled = true;
    retry.textContent = outOfTries
      ? '重挑次数已用尽'
      : broke
        ? `时砂不足 · ◈${opts.retryCost}`
        : '没有可退回的落点';
  }

  const give = el('button', 'title-button danger', '放弃这一局');
  give.addEventListener('click', () => {
    confirmAction(overlay, {
      title: '放弃这一局',
      body: `第 ${run.act} 幕、已推进 ${run.cleared} 处的进度会全部作废，牌组与遗物一并散去。`,
      confirmText: '就到这里',
      cancelText: '再撑一次',
      onConfirm: opts.onAbandon,
    });
  });

  row.append(retry, give);
  panel.append(row);
  overlay.append(panel);
  return overlay;
}

function defeatFact(label: string, value: string): HTMLElement {
  const box = el('div', 'defeat-fact');
  box.append(el('div', 'defeat-fact-label', label), el('div', 'defeat-fact-value', value));
  return box;
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
