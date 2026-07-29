/** 手册。分页展示规则、术语、卡牌、遗物与敌人。 */

import { allCards } from '@engine/registry';
import { RELICS } from '@content/relics';
import { ENEMIES } from '@content/enemies';
import { art } from './assets';
import { el, renderStaticCard } from './screens';
import { KEYWORD_TERMS, RULES, STATUS_TERMS, type Term } from './glossary';
import { sfx } from '@audio/index';

type TabId = 'rules' | 'terms' | 'cards' | 'relics' | 'enemies';

const TABS: { id: TabId; label: string }[] = [
  { id: 'rules', label: '规则' },
  { id: 'terms', label: '状态与关键词' },
  { id: 'cards', label: '卡牌' },
  { id: 'relics', label: '遗物' },
  { id: 'enemies', label: '敌人' },
];

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
    body.append(renderTab(active));
    body.scrollTop = 0;
  };

  for (const tab of TABS) {
    const button = el('button', 'codex-tab', tab.label);
    button.dataset.tab = tab.id;
    button.addEventListener('click', () => {
      active = tab.id;
      sfx.hover();
      paint();
    });
    tabs.append(button);
  }

  panel.append(tabs, body);

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

function renderTab(tab: TabId): HTMLElement {
  switch (tab) {
    case 'rules':
      return rulesTab();
    case 'terms':
      return termsTab();
    case 'cards':
      return cardsTab();
    case 'relics':
      return relicsTab();
    case 'enemies':
      return enemiesTab();
  }
}

function rulesTab(): HTMLElement {
  const box = el('div', 'codex-list');
  for (const rule of RULES) {
    const row = el('div', 'codex-entry');
    row.append(el('div', 'codex-entry-name', rule.title), el('div', 'codex-entry-text', rule.body));
    box.append(row);
  }
  return box;
}

function termRow(term: Term, tone: 'status' | 'keyword'): HTMLElement {
  const row = el('div', 'codex-term');
  const tag = el('span', `codex-tag ${tone}`, term.word);
  row.append(tag, el('span', 'codex-term-text', term.text));
  return row;
}

function termsTab(): HTMLElement {
  const box = el('div', 'codex-list');

  box.append(el('div', 'codex-group', '状态效果'));
  for (const term of Object.values(STATUS_TERMS)) box.append(termRow(term, 'status'));

  box.append(el('div', 'codex-group', '机制关键词'));
  for (const term of KEYWORD_TERMS) box.append(termRow(term, 'keyword'));

  return box;
}

function cardsTab(): HTMLElement {
  const box = el('div', 'codex-list');
  const groups: { type: string; label: string }[] = [
    { type: 'weave', label: '织' },
    { type: 'ignite', label: '引' },
    { type: 'disrupt', label: '扰' },
  ];

  for (const group of groups) {
    const list = allCards().filter((c) => c.type === group.type && c.rarity !== 'curse');
    box.append(el('div', 'codex-group', `${group.label} · ${list.length}`));
    const row = el('div', 'card-row deck-row');
    for (const def of list) row.append(renderStaticCard(def.id));
    box.append(row);
  }

  const curses = allCards().filter((c) => c.rarity === 'curse');
  if (curses.length) {
    box.append(el('div', 'codex-group', `诅咒 · ${curses.length}`));
    const row = el('div', 'card-row deck-row');
    for (const def of curses) row.append(renderStaticCard(def.id));
    box.append(row);
  }
  return box;
}

function relicsTab(): HTMLElement {
  const box = el('div', 'codex-grid');
  for (const def of RELICS) {
    const row = el('div', 'codex-item');
    const icon = el('div', 'codex-icon');
    const url = art.relic(def.art);
    if (url) icon.style.backgroundImage = `url(${url})`;
    const info = el('div');
    info.append(el('div', 'codex-entry-name', def.name), el('div', 'codex-entry-text', def.text));
    row.append(icon, info);
    box.append(row);
  }
  return box;
}

const TIER_LABEL: Record<string, string> = { minion: '杂兵', elite: '精英', boss: '守时者' };

function enemiesTab(): HTMLElement {
  const box = el('div', 'codex-grid');
  for (const def of ENEMIES) {
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
    box.append(row);
  }
  return box;
}
