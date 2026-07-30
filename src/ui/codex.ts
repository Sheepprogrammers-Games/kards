/** 手册。分页展示规则、术语、卡牌、遗物、装备与敌人，未见过的条目只留占位。 */

import {
  allCards,
  baseCardDef,
  variantCount,
  variantIndexOf,
  variantOf,
} from '@engine/registry';
import { emptyCodex, markSeen, type CodexState } from '@engine/codex';
import { intentAim } from '@engine/intents';
import type { CardDef, Effect, EquipmentDef, IntentDef } from '@engine/types';
import { RELICS, type RelicDef } from '@content/relics';
import { ENEMIES, INTENTS, type EnemyDef } from '@content/enemies';
import { EQUIPMENT } from '@content/equipment';
import { art } from './assets';
import { el, renderEquipCard, renderStaticCard } from './screens';
import { STATUS_LABEL } from './readout';
import { KEYWORD_TERMS, RULES, RUN_TERMS, STATUS_TERMS, type Term } from './glossary';
import { sfx } from '@audio/index';

const CODEX_KEY = 'echoes.codex';

function loadCodex(): CodexState {
  try {
    const raw = localStorage.getItem(CODEX_KEY);
    if (!raw) return emptyCodex();
    const parsed = JSON.parse(raw) as Partial<CodexState>;
    return {
      cards: parsed.cards ?? [],
      enemies: parsed.enemies ?? [],
      relics: parsed.relics ?? [],
      equipment: parsed.equipment ?? [],
    };
  } catch {
    return emptyCodex();
  }
}

let codex = loadCodex();

/** 跨局保留的已见记录，与单局存档分开落盘。 */
export function codexState(): CodexState {
  return codex;
}

/** 记下一批已见条目，内容没变化就不写盘。 */
export function recordSeen(kind: keyof CodexState, ids: string[]): void {
  let next = codex;
  for (const id of ids) next = markSeen(next, kind, id);
  if (next === codex) return;
  codex = next;
  try {
    localStorage.setItem(CODEX_KEY, JSON.stringify(codex));
  } catch {}
}

function seen(kind: keyof CodexState, id: string): boolean {
  return codex[kind].includes(id);
}

type TabId = 'rules' | 'terms' | 'cards' | 'relics' | 'equipment' | 'enemies';

const TABS: { id: TabId; label: string }[] = [
  { id: 'rules', label: '规则' },
  { id: 'terms', label: '状态与关键词' },
  { id: 'cards', label: '卡牌' },
  { id: 'relics', label: '遗物' },
  { id: 'equipment', label: '装备' },
  { id: 'enemies', label: '敌人' },
];

const TYPE_WORD: Record<string, string> = { weave: '织', ignite: '引', disrupt: '扰' };

const TYPE_DESC: Record<string, string> = {
  weave: '打出即刻按全额结算，随后占住时间轨的一格，每回合开始时按所在格位的强度重演。',
  ignite: '把轨上条目尚未兑现的回响一次性清算，效率六成，不占轨位。',
  disrupt: '推移、冻结、复制轨上条目，也能作用于敌方意图，不占轨位。',
};

const RARITY_LABEL: Record<string, string> = {
  starter: '起始',
  common: '普通',
  uncommon: '精制',
  rare: '稀有',
  boss: '守时者',
  curse: '诅咒',
};

const SLOT_LABEL: Record<string, string> = {
  weapon: '武器',
  armor: '护甲',
  trinket: '饰品',
  core: '机芯',
};

const TIER_LABEL: Record<string, string> = { minion: '杂兵', elite: '精英', boss: '守时者' };

const INTENT_KIND_LABEL: Record<string, string> = {
  attack: '攻击',
  debuff: '削弱',
  buff: '增益',
  defend: '防御',
};

const TARGET_LABEL: Record<string, string> = {
  allEnemies: '全体敌人',
  frontmost: '最前方敌人',
  self: '自身',
};

/** 常驻修正字段的读法，数值型给出增减量，开关型给出一句话。 */
const MOD_NUMBER: Record<string, string> = {
  energyPerTurn: '每回合能量',
  handSize: '手牌上限',
  echoBudget: '条目结算次数',
  startingBlock: '开场护甲',
  startingStrength: '开场力量',
  drawPerTurn: '每回合额外抽牌',
  rewindBonus: '回拨次数上限',
};

const MOD_FLAG: Record<string, string> = {
  salvageBurn: '被挤出的牌进弃牌堆，不再烧毁。',
  salvageToDraw: '被挤出的牌洗回抽牌堆。',
  steadyIgnite: '引牌不再随本回合的引爆次数涨价。',
  payoffOnBurn: '被挤出烧毁的条目照常兑现赌注。',
  igniteKeepsEntry: '引爆后条目留在轨上，只保留一次结算。',
  firstWeaveFree: '每回合第一张织牌不消耗能量。',
  fullSteal: '窃取来的意图按全额结算。',
  freeFreeze: '冻结不消耗条目的结算次数。',
};

const INTENT_INDEX: Record<string, IntentDef> = Object.fromEntries(
  INTENTS.map((def) => [def.id, def]),
);

/** 把一条效果写成完整的一句话，数值取定义值。 */
function effectPhrase(effect: Effect): string {
  const status = effect.status ? (STATUS_LABEL[effect.status] ?? effect.status) : '';
  const hits = effect.hits ?? 1;
  let text = '';
  switch (effect.kind) {
    case 'damage':
      text = hits > 1 ? `造成 ${effect.amount} 点伤害 ×${hits}` : `造成 ${effect.amount} 点伤害`;
      break;
    case 'block':
      text = `获得 ${effect.amount} 点护甲`;
      break;
    case 'applyStatus':
      text = `施加 ${effect.amount} 层${status}`;
      break;
    case 'selfStatus':
      text = `自身获得 ${effect.amount} 层${status}`;
      break;
    case 'heal':
      text = `回复 ${effect.amount} 点生命`;
      break;
    case 'draw':
      text = `抽 ${effect.amount} 张牌`;
      break;
    case 'gainEnergy':
      text = `获得 ${effect.amount} 点能量`;
      break;
    case 'createCard':
      text = `生成 ${effect.amount} 张牌`;
      break;
  }

  const tags: string[] = [];
  const target = effect.target ? TARGET_LABEL[effect.target] : null;
  if (target && effect.kind !== 'selfStatus') tags.push(target);
  if (effect.pierce) tags.push('穿刺');
  if (effect.lifesteal) tags.push('吸血');
  if (effect.execute) tags.push(`处决 ${Math.round(effect.execute * 100)}%`);
  if (effect.overkill) tags.push('溢出');
  return tags.length ? `${text}（${tags.join('・')}）` : text;
}

function phraseList(effects: Effect[]): string {
  return effects
    .map(effectPhrase)
    .filter(Boolean)
    .join('，');
}

/** 详情层里可翻阅的一页。 */
interface DetailItem {
  build: () => HTMLElement;
}

interface TabView {
  node: HTMLElement;
  items: DetailItem[];
}

/** 未解锁条目的占位块，尺寸与真条目一致，不透露任何内容。 */
function unknownFace(className: string): HTMLElement {
  const node = el('div', `${className} codex-unknown`);
  node.append(el('div', 'codex-unknown-mark', '?'), el('div', 'codex-unknown-text', '尚未遭遇'));
  return node;
}

function unknownRow(): HTMLElement {
  const row = el('div', 'codex-item codex-unknown-item');
  const icon = el('div', 'codex-icon codex-unknown', '?');
  const info = el('div');
  info.append(el('div', 'codex-entry-name', '？？？'), el('div', 'codex-entry-text', '尚未遭遇'));
  row.append(icon, info);
  return row;
}

export function openCodex(host: HTMLElement, initial: TabId = 'rules'): void {
  sfx.pick();
  const overlay = el('div', 'overlay codex-overlay');
  const panel = el('div', 'panel codex-panel has-close');
  panel.append(el('h2', '', '手册'));

  const tabs = el('div', 'codex-tabs');
  const body = el('div', 'codex-body');

  let active: TabId = initial;
  const paint = () => {
    tabs.querySelectorAll('.codex-tab').forEach((n) => {
      n.classList.toggle('on', (n as HTMLElement).dataset.tab === active);
    });
    body.innerHTML = '';
    body.append(renderTab(active, host).node);
    body.scrollTop = 0;
  };

  for (const tab of TABS) {
    const button = el('button', 'codex-tab');
    button.dataset.tab = tab.id;
    button.append(el('span', 'codex-tab-label', tab.label));
    const progress = tabProgress(tab.id);
    if (progress) button.append(el('span', 'codex-tab-count', progress));
    button.addEventListener('click', () => {
      active = tab.id;
      sfx.hover();
      paint();
    });
    tabs.append(button);
  }

  panel.append(tabs, el('div', 'codex-hint', '双击条目查看大图，方向键翻页'), body);

  const close = el('button', 'panel-close', '×');
  close.title = '关闭';
  close.addEventListener('click', () => overlay.remove());
  panel.append(close);

  overlay.append(panel);
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) overlay.remove();
  });
  host.append(overlay);
  paint();
}

/** 已解锁数量与总量，规则与词条页不计进度。 */
function tabProgress(tab: TabId): string {
  const tally = (kind: keyof CodexState, ids: string[]) =>
    `${ids.filter((id) => seen(kind, id)).length} / ${ids.length}`;

  switch (tab) {
    case 'cards':
      return tally(
        'cards',
        allCards().map((def) => def.id),
      );
    case 'relics':
      return tally(
        'relics',
        RELICS.map((def) => def.id),
      );
    case 'equipment':
      return tally(
        'equipment',
        EQUIPMENT.map((def) => def.id),
      );
    case 'enemies':
      return tally(
        'enemies',
        ENEMIES.map((def) => def.id),
      );
    default:
      return '';
  }
}

function renderTab(tab: TabId, host: HTMLElement): TabView {
  switch (tab) {
    case 'rules':
      return rulesTab(host);
    case 'terms':
      return termsTab(host);
    case 'cards':
      return cardsTab(host);
    case 'relics':
      return relicsTab(host);
    case 'equipment':
      return equipmentTab(host);
    case 'enemies':
      return enemiesTab(host);
  }
}

/** 把条目接进详情层：单击不拦截，双击翻开对应的那一页。 */
function binder(host: HTMLElement, items: DetailItem[]) {
  return (node: HTMLElement, build: () => HTMLElement): HTMLElement => {
    const index = items.length;
    items.push({ build });
    node.classList.add('codex-openable');
    node.addEventListener('dblclick', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      openDetail(host, items, index);
    });
    return node;
  };
}

function rulesTab(host: HTMLElement): TabView {
  const box = el('div', 'codex-list');
  const items: DetailItem[] = [];
  const bind = binder(host, items);

  for (const rule of RULES) {
    const row = el('div', 'codex-entry');
    row.append(el('div', 'codex-entry-name', rule.title), el('div', 'codex-entry-text', rule.body));
    box.append(bind(row, () => proseDetail(rule.title, rule.body, '规则')));
  }
  return { node: box, items };
}

function termRow(term: Term, tone: 'status' | 'keyword' | 'run'): HTMLElement {
  const row = el('div', 'codex-term');
  row.append(el('span', `codex-tag ${tone}`, term.word), el('span', 'codex-term-text', term.text));
  return row;
}

function termsTab(host: HTMLElement): TabView {
  const box = el('div', 'codex-list');
  const items: DetailItem[] = [];
  const bind = binder(host, items);

  const section = (
    title: string,
    list: Term[],
    tone: 'status' | 'keyword' | 'run',
    caption: string,
  ) => {
    box.append(el('div', 'codex-group', title));
    for (const term of list) {
      box.append(bind(termRow(term, tone), () => proseDetail(term.word, term.text, caption)));
    }
  };

  section('状态效果', Object.values(STATUS_TERMS), 'status', '状态效果');
  section('机制关键词', KEYWORD_TERMS, 'keyword', '机制关键词');
  section('局外机制', RUN_TERMS, 'run', '局外机制');

  return { node: box, items };
}

function cardsTab(host: HTMLElement): TabView {
  const box = el('div', 'codex-list');
  const items: DetailItem[] = [];
  const bind = binder(host, items);

  const cardGroup = (label: string, list: CardDef[]) => {
    if (!list.length) return;
    const found = list.filter((def) => seen('cards', def.id)).length;
    box.append(el('div', 'codex-group', `${label} · ${found} / ${list.length}`));
    const row = el('div', 'card-row deck-row');
    for (const def of list) {
      if (!seen('cards', def.id)) {
        row.append(unknownFace('card'));
        continue;
      }
      row.append(bind(renderStaticCard(def.id), () => cardDetail(def)));
    }
    box.append(row);
  };

  const cards = allCards();
  for (const group of [
    { type: 'weave', label: '织' },
    { type: 'ignite', label: '引' },
    { type: 'disrupt', label: '扰' },
  ]) {
    cardGroup(
      group.label,
      cards.filter((def) => def.type === group.type && def.rarity !== 'curse'),
    );
  }
  cardGroup(
    '诅咒',
    cards.filter((def) => def.rarity === 'curse'),
  );

  return { node: box, items };
}

function relicsTab(host: HTMLElement): TabView {
  const box = el('div', 'codex-grid');
  const items: DetailItem[] = [];
  const bind = binder(host, items);

  for (const def of RELICS) {
    if (!seen('relics', def.id)) {
      box.append(unknownRow());
      continue;
    }
    const row = el('div', 'codex-item');
    const icon = el('div', 'codex-icon');
    const url = art.relic(def.art);
    if (url) icon.style.backgroundImage = `url(${url})`;

    const info = el('div');
    info.append(el('div', 'codex-entry-name', def.name), el('div', 'codex-entry-text', def.text));
    row.append(icon, info);
    box.append(bind(row, () => relicDetail(def)));
  }
  return { node: box, items };
}

function equipmentTab(host: HTMLElement): TabView {
  const box = el('div', 'codex-list');
  const items: DetailItem[] = [];
  const bind = binder(host, items);

  for (const slot of ['weapon', 'armor', 'trinket', 'core']) {
    const list = EQUIPMENT.filter((def) => def.slot === slot);
    const found = list.filter((def) => seen('equipment', def.id)).length;
    box.append(el('div', 'codex-group', `${SLOT_LABEL[slot] ?? slot} · ${found} / ${list.length}`));

    const row = el('div', 'equip-row');
    for (const def of list) {
      if (!seen('equipment', def.id)) {
        row.append(unknownFace('equip-card'));
        continue;
      }
      row.append(bind(renderEquipCard(def.id), () => equipDetail(def)));
    }
    box.append(row);
  }
  return { node: box, items };
}

function enemiesTab(host: HTMLElement): TabView {
  const box = el('div', 'codex-grid');
  const items: DetailItem[] = [];
  const bind = binder(host, items);

  for (const def of ENEMIES) {
    if (!seen('enemies', def.id)) {
      box.append(unknownRow());
      continue;
    }
    const row = el('div', 'codex-item');
    const icon = el('div', 'codex-icon enemy');
    const url = art.enemy(def.art);
    if (url) icon.style.backgroundImage = `url(${url})`;

    const info = el('div');
    const phases = def.phases?.length ? `　形态 ${def.phases.length + 1}` : '';
    info.append(
      el('div', 'codex-entry-name', `${def.name}　${TIER_LABEL[def.tier] ?? ''}`),
      el(
        'div',
        'codex-entry-text',
        `生命 ${def.maxHp[0]}　每回合 ${def.intentsPerTurn} 个意图　第 ${def.act.join('、')} 幕${phases}`,
      ),
    );
    row.append(icon, info);
    box.append(bind(row, () => enemyDetail(def)));
  }
  return { node: box, items };
}

/* 详情层 */

function openDetail(host: HTMLElement, items: DetailItem[], start: number): void {
  if (!items.length) return;
  sfx.pick();

  let index = start;
  const overlay = el('div', 'overlay codex-detail-overlay');
  const frame = el('div', 'codex-detail');
  const stage = el('div', 'codex-detail-stage');

  const prev = el('button', 'codex-detail-nav prev', '‹') as HTMLButtonElement;
  const next = el('button', 'codex-detail-nav next', '›') as HTMLButtonElement;
  prev.title = '上一条';
  next.title = '下一条';
  const counter = el('div', 'codex-detail-counter');

  const paint = (dir: number) => {
    const item = items[index];
    if (!item) return;
    stage.innerHTML = '';
    const view = item.build();
    view.classList.add(dir < 0 ? 'from-left' : 'from-right');
    stage.append(view);
    counter.textContent = `${index + 1} / ${items.length}`;
    prev.disabled = items.length < 2;
    next.disabled = items.length < 2;
  };

  const step = (delta: number) => {
    if (items.length < 2) return;
    index = (index + delta + items.length) % items.length;
    sfx.hover();
    paint(delta);
  };

  const close = () => {
    window.removeEventListener('keydown', onKey, true);
    overlay.remove();
  };

  const onKey = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape') {
      ev.stopPropagation();
      close();
    } else if (ev.key === 'ArrowLeft') {
      ev.stopPropagation();
      step(-1);
    } else if (ev.key === 'ArrowRight') {
      ev.stopPropagation();
      step(1);
    }
  };

  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));

  const shut = el('button', 'panel-close', '×');
  shut.title = '关闭';
  shut.addEventListener('click', close);

  frame.append(shut, stage, counter);
  overlay.append(prev, frame, next);
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) close();
  });
  window.addEventListener('keydown', onKey, true);

  host.append(overlay);
  paint(1);
}

function detailShell(caption: string, title: string): HTMLElement {
  const page = el('div', 'codex-page');
  page.append(el('div', 'codex-page-caption', caption), el('div', 'codex-page-title', title));
  return page;
}

function badgeRow(labels: string[]): HTMLElement {
  const row = el('div', 'codex-badges');
  for (const label of labels) row.append(el('span', 'codex-badge', label));
  return row;
}

function metaRow(key: string, value: string): HTMLElement {
  const row = el('div', 'codex-meta-row');
  row.append(el('span', 'codex-meta-key', key), el('span', 'codex-meta-val', value));
  return row;
}

function proseDetail(title: string, body: string, caption: string): HTMLElement {
  const page = detailShell(caption, title);
  page.classList.add('prose');
  page.append(el('p', 'codex-page-text', body));
  return page;
}

function cardDetail(def: CardDef): HTMLElement {
  const page = detailShell(`${TYPE_WORD[def.type] ?? ''}牌`, def.name);
  page.classList.add('with-hero');

  const hero = el('div', 'codex-hero');
  hero.append(renderStaticCard(def.id));

  const info = el('div', 'codex-page-info');
  info.append(
    badgeRow([
      `${TYPE_WORD[def.type] ?? ''}牌`,
      RARITY_LABEL[def.rarity] ?? def.rarity,
      `费用 ${def.cost}`,
    ]),
  );
  info.append(el('p', 'codex-page-text', def.text));

  const meta = el('div', 'codex-meta');
  meta.append(metaRow('费用', `${def.cost} 点能量`));
  meta.append(metaRow('稀有度', RARITY_LABEL[def.rarity] ?? def.rarity));
  meta.append(metaRow('类别', TYPE_DESC[def.type] ?? ''));
  if (def.payoff?.length) meta.append(metaRow('走完全程', phraseList(def.payoff)));
  info.append(meta);

  const flags: string[] = [];
  if (def.retain) flags.push('保留');
  if (def.exhaust) flags.push('消耗');
  if (def.unplayable) flags.push('不可打出');
  if (def.needsTarget) flags.push('需指定敌人');
  if (def.needsSlot) flags.push('需指定格位');
  if (flags.length) {
    const box = el('div', 'codex-flags');
    for (const flag of flags) box.append(el('span', 'codex-flag', flag));
    info.append(box);
  }

  const versions = variantCount(def.id);
  if (versions > 1) {
    const base = baseCardDef(def.id);
    const current = variantIndexOf(def.id);
    const box = el('div', 'codex-versions');
    box.append(
      el('div', 'codex-versions-head', `这张牌有 ${versions} 种写法　本局是第 ${current + 1} 种`),
    );

    for (let i = 0; i < versions; i++) {
      const row = el('div', 'codex-version-row');
      if (i === current) row.classList.add('current');
      row.append(el('span', 'codex-version-tag', `其${i + 1}`));
      row.append(el('span', 'codex-version-text', base ? variantOf(base, i).text : def.text));
      box.append(row);
    }
    info.append(box);
  }

  const split = el('div', 'codex-page-split');
  split.append(hero, info);
  page.append(split);
  return page;
}

function relicDetail(def: RelicDef): HTMLElement {
  const page = detailShell('遗物', def.name);
  page.classList.add('with-hero');

  const hero = el('div', 'codex-hero art');
  const url = art.relic(def.art);
  if (url) hero.style.backgroundImage = `url(${url})`;

  const info = el('div', 'codex-page-info');
  info.append(badgeRow([RARITY_LABEL[def.rarity] ?? def.rarity]));
  info.append(el('p', 'codex-page-text', def.text));
  info.append(el('div', 'codex-note', '遗物一旦拾得便整局生效，不占装备槽位。'));

  const split = el('div', 'codex-page-split');
  split.append(hero, info);
  page.append(split);
  return page;
}

/** 常驻修正逐条读出来，未收录的字段跳过。 */
function modLines(def: EquipmentDef): string[] {
  const mods = def.mods;
  if (!mods) return [];
  const lines: string[] = [];
  for (const [key, value] of Object.entries(mods)) {
    const numberLabel = MOD_NUMBER[key];
    const flagLabel = MOD_FLAG[key];
    if (typeof value === 'number' && numberLabel) {
      lines.push(`${numberLabel} ${value > 0 ? '+' : ''}${value}`);
    } else if (value === true && flagLabel) {
      lines.push(flagLabel);
    } else if (key === 'igniteEfficiency' && typeof value === 'number') {
      lines.push(`引爆效率 ×${value}`);
    } else if (key === 'coefTable' && Array.isArray(value)) {
      lines.push(`格位强度改写为 ${value.map((n) => `${Math.round(n * 100)}%`).join(' / ')}`);
    }
  }
  return lines;
}

function equipDetail(def: EquipmentDef): HTMLElement {
  const page = detailShell(SLOT_LABEL[def.slot] ?? '装备', def.name);
  page.classList.add('with-hero');

  const hero = el('div', 'codex-hero art');
  const url = art.equipment(def.art);
  if (url) hero.style.backgroundImage = `url(${url})`;

  const info = el('div', 'codex-page-info');
  info.append(badgeRow([SLOT_LABEL[def.slot] ?? def.slot, RARITY_LABEL[def.rarity] ?? def.rarity]));
  info.append(el('p', 'codex-page-text', def.text));

  const meta = el('div', 'codex-meta');
  meta.append(metaRow('槽位', `${SLOT_LABEL[def.slot] ?? def.slot}　同时只能穿一件`));

  const constant = modLines(def);
  if (constant.length) meta.append(metaRow('常驻', constant.join('；')));
  if (def.onTurnStart?.length) meta.append(metaRow('我方回合开始', phraseList(def.onTurnStart)));
  if (def.onTurnEnd?.length) meta.append(metaRow('敌方回合结束', phraseList(def.onTurnEnd)));
  info.append(meta);

  const split = el('div', 'codex-page-split');
  split.append(hero, info);
  page.append(split);
  return page;
}

/** 敌人会用到的意图，脚本、形态与牌库合并后去重。 */
function enemyIntents(def: EnemyDef): { def: IntentDef; slot: number }[] {
  const picked = new Map<string, number>();
  for (const option of def.intentScript) {
    if (!picked.has(option.intentId)) picked.set(option.intentId, option.preferredSlot);
  }
  for (const phase of def.phases ?? []) {
    for (const option of phase.intentScript) {
      if (!picked.has(option.intentId)) picked.set(option.intentId, option.preferredSlot);
    }
  }
  for (const item of def.deck ?? []) {
    if (!picked.has(item.intentId)) picked.set(item.intentId, 4);
  }

  const out: { def: IntentDef; slot: number }[] = [];
  for (const [id, slot] of picked) {
    const intent = INTENT_INDEX[id];
    if (intent) out.push({ def: intent, slot });
  }
  return out;
}

function intentRow(intent: IntentDef, slot: number): HTMLElement {
  const row = el('div', 'codex-intent');
  const head = el('div', 'codex-intent-head');
  head.append(el('span', 'codex-intent-name', intent.name));

  const kind = el('span', 'codex-intent-kind', INTENT_KIND_LABEL[intent.kind] ?? intent.kind);
  kind.dataset.kind = intent.kind;
  head.append(kind);
  head.append(
    el('span', 'codex-intent-aim', intentAim(intent) === 'player' ? '朝向织时者' : '朝向自身'),
  );
  head.append(el('span', 'codex-intent-slot', `引信 ${slot}`));
  row.append(head);
  row.append(el('div', 'codex-intent-text', phraseList(intent.effects)));

  const flags: string[] = [];
  if (intent.unstealable) flags.push('不可窃取');
  if (intent.undelayable) flags.push('不可延后');
  if (flags.length) {
    const box = el('div', 'codex-flags');
    for (const flag of flags) box.append(el('span', 'codex-flag', flag));
    row.append(box);
  }
  return row;
}

function enemyDetail(def: EnemyDef): HTMLElement {
  const page = detailShell(TIER_LABEL[def.tier] ?? '敌人', def.name);
  page.classList.add('with-hero');

  const hero = el('div', 'codex-hero art enemy');
  const url = art.enemy(def.art);
  if (url) hero.style.backgroundImage = `url(${url})`;

  const info = el('div', 'codex-page-info');
  info.append(
    badgeRow([TIER_LABEL[def.tier] ?? def.tier, `第 ${def.act.join('、')} 幕`]),
  );

  const meta = el('div', 'codex-meta');
  meta.append(
    metaRow(
      '生命',
      def.maxHp[0] === def.maxHp[1] ? `${def.maxHp[0]}` : `${def.maxHp[0]} — ${def.maxHp[1]}`,
    ),
  );
  meta.append(metaRow('出场', `第 ${def.act.join('、')} 幕`));
  meta.append(metaRow('每回合意图', `${def.intentsPerTurn} 个`));
  if (def.initiative === 'enemy') meta.append(metaRow('先手', '敌方先动'));
  if (def.startingStatuses?.length) {
    meta.append(
      metaRow(
        '开局状态',
        def.startingStatuses
          .map((s) => `${STATUS_LABEL[s.status] ?? s.status} ${s.amount}`)
          .join('，'),
      ),
    );
  }
  if (def.phases?.length) {
    meta.append(
      metaRow('形态', `${def.phases.length + 1} 种：${def.phases.map((p) => p.name).join('、')}`),
    );
  }
  if (def.deck?.length) meta.append(metaRow('出手方式', '按固定牌库轮转，抽空后重洗'));
  info.append(meta);

  const list = el('div', 'codex-intent-list');
  list.append(el('div', 'codex-group', '会使的意图'));
  for (const item of enemyIntents(def)) list.append(intentRow(item.def, item.slot));
  info.append(list);

  const split = el('div', 'codex-page-split');
  split.append(hero, info);
  page.append(split);
  return page;
}
