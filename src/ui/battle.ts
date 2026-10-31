/** 战斗场景的 DOM 渲染与输入处理。 */

import { canPlay, costOf, manipulationLane as targetLaneOf, reduce } from '@engine/combat';
import { previewYield } from '@engine/effects';
import {
  canRewindAt,
  canRewindPlayerAt,
  countEntries,
  delayBudgetLeft,
  entriesOf,
  rewindsLeft,
} from '@engine/track';
import { C, coefOf } from '@engine/constants';
import { intentAim } from '@engine/intents';
import { cardDef, intentDef } from '@engine/registry';
import { EQUIP_SLOT_ORDER } from '@engine/types';
import type {
  Effect,
  CardDef,
  EnemyState,
  EquipmentDef,
  EquipSlot,
  IntentDef,
  Manipulation,
  CardInstance,
  CombatEvent,
  CombatState,
  Lane,
  TrackEntry,
} from '@engine/types';
import { ENEMIES } from '@content/enemies';
import { EQUIPMENT } from '@content/equipment';
import { RELICS } from '@content/relics';
import { art } from './assets';
import { fx } from '@fx/index';
import { sfx } from '@audio/index';
import { TIPS, showTip } from './tutorial';
import { AimLine } from './aim';
import { toast } from './toast';
import { showPiles } from './deckview';
import { cardText } from './screens';
import { bindPauseKey, openPause } from './pause';
import { pickSlot } from './slotpicker';
import { onSettingsChange, settings } from './settings';
import { KEYWORD_TERMS, STATUS_TERMS } from './glossary';
import { STATUS_LABEL, echoYieldText, igniteYieldText } from './readout';
import { openCodex } from './codex';

const ALL_TERMS = [...KEYWORD_TERMS, ...Object.values(STATUS_TERMS)];

/** 敌方格位读作还剩几回合落地，己方格位读作这是条目存在的第几回合。 */
function slotLabel(lane: Lane, slot: number): string {
  return lane === 'enemy' ? `${C.TRACK_SLOTS - slot + 1} 回合后` : `第 ${slot} 回合`;
}

interface DragState {
  card: CardInstance;
  el: HTMLElement;
  originX: number;
  originY: number;
  anchorX: number;
  anchorY: number;
  pointerId: number;
  /** 出牌区下沿。拖拽期间布局不变，按下时量一次即可。 */
  zoneBottom: number;
  /** 当前高亮的落点与目标，用于撤销上一帧的高亮而不必全文档查询。 */
  litSlot: HTMLElement | null;
  litTarget: HTMLElement | null;
}

export class BattleScene {
  private root: HTMLElement;
  private state: CombatState;
  private drag: DragState | null = null;
  private pointerX = 0;
  private pointerY = 0;
  private dragFrame = 0;
  private hoverTarget: number | null = null;
  private hoverSlot: { lane: Lane; slot: number } | null = null;
  private busy = false;
  /** 已播完死亡动画的敌人，之后不再渲染。 */
  private buried = new Set<string>();
  /** 最近一次出牌的起点与目标，供打击特效定位。 */
  private lastPlayOrigin: { x: number; y: number } | null = null;
  private lastTargetId: string | null = null;
  private aim: AimLine | null = null;

  private elScene!: HTMLElement;
  private elEnemyRow!: HTMLElement;
  private elLanes!: Record<Lane, HTMLElement>;
  private elHand!: HTMLElement;
  private elEnergy!: HTMLElement;
  private elBlock!: HTMLElement;
  private elDelay!: HTMLElement;
  private elHp!: HTMLElement;
  private elHpFill!: HTMLElement;
  private elStatuses!: HTMLElement;
  private elPiles!: { draw: HTMLElement; discard: HTMLElement };
  private elBanner!: HTMLElement;
  private elRelics!: HTMLElement;
  private elEquips!: HTMLElement;
  private elPortrait!: HTMLElement;
  private elBar!: HTMLElement;
  private elTrack!: HTMLElement;
  private elHint!: HTMLElement;
  private elPlayZone!: HTMLElement;
  private revealSources = new Set<string>();
  private revealTimer = 0;
  private relicsOpen = false;
  /** 界面上正在显示的血量，跟着结算事件逐步追平实际状态。 */
  private shownHp = new Map<string, number>();
  /** 界面上正在显示的护甲，跟血量一样按事件推进。 */
  private shownBlock = new Map<string, number>();
  private unbindPause: (() => void) | null = null;
  private unbindSettings: (() => void) | null = null;

  constructor(
    root: HTMLElement,
    state: CombatState,
    private onFinish: (r: string, hp: number) => void,
    private onExit: (to: 'map' | 'title') => void = () => {},
    private exitCountsAsDefeat = false,
  ) {
    this.root = root;
    this.state = state;
    this.build();
    this.render();
    this.showBanner(`你的回合 · 第 ${state.turn} 轮`, 'player');
    if (state.player.relics.length) setTimeout(() => this.fireRelicsFor('combatStart'), 620);
    if (countEntries(state, 'enemy') > 0) {
      setTimeout(() => showTip(this.root, TIPS.firstIntent!), 900);
    }
  }

  private build(): void {
    this.root.innerHTML = '';
    const scene = el('div', 'battle');
    this.elScene = scene;

    const bg = el('div', 'scene');
    const bgUrl = art.bg('act1-clocktower');
    if (bgUrl) bg.style.backgroundImage = `url(${bgUrl})`;
    scene.append(bg, el('div', 'scene-grain'));

    this.elEnemyRow = el('div', 'enemy-row');
    scene.append(this.elEnemyRow);

    const track = el('div', 'track');
    this.elTrack = track;
    this.elHint = el('div', 'enemy-hint');
    const laneEnemy = el('div', 'lane lane-enemy');
    const rail = el('div', 'track-rail');
    const lanePlayer = el('div', 'lane lane-player');
    track.append(laneEnemy, this.elHint, rail, lanePlayer);
    this.elLanes = { enemy: laneEnemy, player: lanePlayer };
    laneEnemy.addEventListener('pointerenter', () => this.revealEnemyLane(true, 'lane'));
    laneEnemy.addEventListener('pointerleave', () => this.revealEnemyLane(false, 'lane'));
    this.elHint.addEventListener('pointerenter', () => this.revealEnemyLane(true, 'hint'));
    this.elHint.addEventListener('pointerleave', () => this.revealEnemyLane(false, 'hint'));
    scene.append(track);

    this.elHand = el('div', 'hand');
    scene.append(this.elHand);

    const bar = el('div', 'player-bar');
    const portrait = el('div', 'portrait');
    this.elPortrait = portrait;
    this.elBar = bar;
    const portraitUrl = art.ui('weaver-portrait');
    if (portraitUrl) portrait.style.backgroundImage = `url(${portraitUrl})`;
    this.elHp = el('span', 'hp-text');
    this.elHpFill = el('div', 'hp-fill');
    this.elEnergy = el('div', 'energy');
    withTip(this.elEnergy, '能量', '每回合重置。打出手牌需要消耗，引牌每多打一次还会涨价。');
    this.elBlock = el('div', 'block-badge');
    this.elDelay = el('div', 'delay-badge');
    this.elStatuses = el('div', 'status-row');

    const hpWrap = el('div', 'player-hp');
    const hpBar = el('div', 'hp-bar');
    withTip(hpBar, '生命', '归零即败北。战斗结束后的剩余生命会带到下一场。');
    hpBar.append(this.elHpFill, this.elHp);
    hpWrap.append(hpBar, this.elStatuses);

    this.elPiles = {
      draw: el('div', 'pile-count'),
      discard: el('div', 'pile-count'),
    };
    const piles = el('button', 'piles');
    piles.append(this.elPiles.draw, this.elPiles.discard);
    piles.title = '查看牌堆';
    piles.addEventListener('click', () => showPiles(this.root, this.state));

    this.elRelics = el('div', 'relic-bar');
    bar.append(portrait, hpWrap, this.elEnergy, this.elBlock, this.elDelay, piles, this.elRelics);
    scene.append(bar);

    this.elEquips = el('div', 'equip-rack');
    scene.append(this.elEquips);

    const book = el('button', 'codex-button');
    book.textContent = '?';
    withTip(book, '手册', '规则、状态、卡牌、遗物与敌人一览。');
    book.addEventListener('click', () => openCodex(this.root, 'terms'));
    scene.append(book);

    const pause = el('button', 'pause-button');
    pause.append(el('i'), el('i'));
    withTip(pause, '暂停', '按 Esc 也可以随时暂停。');
    pause.addEventListener('click', () => this.pause());
    scene.append(pause);

    const endTurn = el('button', 'end-turn');
    endTurn.textContent = '结束回合';
    endTurn.addEventListener('click', () => this.dispatch({ type: 'endTurn' }));
    scene.append(endTurn);

    this.elPlayZone = el('div', 'play-zone');
    this.elPlayZone.append(el('div', 'play-zone-label', '松手即可打出'));
    scene.append(this.elPlayZone);

    this.elBanner = el('div', 'turn-banner');
    scene.append(this.elBanner);

    this.aim = new AimLine(scene);

    this.root.append(scene);
    this.applyDisplay();
    this.unbindSettings = onSettingsChange(() => this.applyDisplay());
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    this.unbindPause = bindPauseKey(this.root, this.pauseActions());
  }

  /** 关掉产出预估时轨上只留图形与名字；敌方泳道可以钉住常驻展开。 */
  private applyDisplay(): void {
    this.elScene.classList.toggle('no-numbers', !settings().showNumbers);
    this.elTrack.classList.toggle('pinned', settings().pinEnemyLane);
  }

  /** still 为真时轨上条目直接就位，位移由事件播放单独驱动。 */
  private render(track?: Record<Lane, (TrackEntry | null)[]>, still = false): void {
    this.renderRelics();
    this.renderEquips();
    this.renderEnemies();
    this.renderTrack(track ?? this.state.track, still);
    this.renderHand();
    this.renderPlayer();
  }

  private renderEnemies(): void {
    this.elEnemyRow.innerHTML = '';
    for (const enemy of this.state.enemies) {
      // 已死但还没播完动画的敌人保留在场上
      if (!enemy.alive && this.buried.has(enemy.id)) continue;
      const def = ENEMIES.find((e) => e.id === enemy.defId);
      const node = el('div', 'enemy');
      node.dataset.tier = def?.tier ?? 'minion';
      node.dataset.index = String(enemy.index);

      node.append(this.intentBadges(enemy.index));

      const img = document.createElement('img');
      img.className = 'enemy-art';
      const url = art.enemy(def?.art ?? enemy.defId);
      if (url) img.src = url;
      node.append(img);

      node.append(statusRow(enemy.statuses));

      const shown = this.shownHp.get(enemy.id) ?? enemy.hp;
      const bar = el('div', 'hp-bar');
      const fill = el('div', 'hp-fill');
      fill.style.width = `${(shown / enemy.maxHp) * 100}%`;
      bar.append(fill);
      const shownArmor = this.shownBlock.get(enemy.id) ?? enemy.block;
      if (shownArmor > 0) {
        const shield = el('div', 'shield-badge');
        shield.append(el('i', 'shield-glyph'), el('span', '', String(shownArmor)));
        withTip(shield, `护甲 ${shownArmor}`, '你的伤害要先打光这层护甲，才会扣它的生命。');
        bar.append(shield);
      }
      const text = el('div', 'hp-text');
      text.textContent = `${shown} / ${enemy.maxHp}`;
      const name = el('div', 'enemy-name');
      const tags = [enemy.phaseName, enemy.charge > 0 ? `蓄力×${enemy.charge}` : ''].filter(Boolean);
      name.textContent = tags.length ? `${enemy.name} · ${tags.join(' · ')}` : enemy.name;
      if (enemy.phaseName) name.classList.add('shifted');
      node.append(bar, text, name);

      const tip = enemyDeckTip(enemy);
      if (tip) node.append(tip);

      node.addEventListener('pointerenter', () => {
        this.hoverTarget = enemy.index;
        // 说明卡朝屏幕中央一侧展开
        const r = node.getBoundingClientRect();
        node.classList.toggle('tip-left', r.left + r.width / 2 > window.innerWidth / 2);
      });
      node.addEventListener('pointerleave', () => (this.hoverTarget = null));
      this.elEnemyRow.append(node);
    }
  }

  /**
   * 敌方泳道平时不占位。多个来源可同时要求浮出，全部撤销后延迟收起，
   * 这样在徽章、提示条与浮层之间移动不会闪断。
   */
  private revealEnemyLane(on: boolean, source = 'hover'): void {
    // 手上拿着与敌方意图无关的牌时，掠过提示条不该打断出牌
    if (on && source !== 'drag' && this.drag) {
      if (targetLaneOf(cardDef(this.drag.card.defId)) !== 'enemy') return;
    }
    if (on) this.revealSources.add(source);
    else this.revealSources.delete(source);

    window.clearTimeout(this.revealTimer);
    if (this.revealSources.size > 0) {
      this.elTrack.classList.add('reveal');
      return;
    }
    this.revealTimer = window.setTimeout(() => {
      if (this.revealSources.size === 0) this.elTrack.classList.remove('reveal');
    }, 320);
  }

  /** 提示条按格位标出敌轨的占用情况。 */
  private renderHint(track: Record<Lane, (TrackEntry | null)[]>): void {
    this.elHint.innerHTML = '';
    for (let slot = 1; slot <= C.TRACK_SLOTS; slot++) {
      const dot = el('div', 'hint-dot');
      if (track.enemy[slot - 1]) dot.classList.add('filled');
      this.elHint.append(dot);
    }
    const count = track.enemy.filter(Boolean).length;
    this.elHint.dataset.count = String(count);
  }

  /** 轨上条目的说明卡：己方讲这次回响算多少，敌方讲还有几回合落地。 */
  private slotTip(entry: TrackEntry, lane: Lane, slot: number): HTMLElement {
    const tip = el('div', 'entry-tip');

    if (lane === 'enemy') {
      tip.append(
        el('div', 'entry-tip-head', intentTitle(this.state, entry, slot)),
        el('div', 'entry-tip-body', intentTooltip(entry)),
      );
      return tip;
    }

    const def = safeCardDef(entry.cardId);
    const nextSlot = entry.resolvedHere ? slot + 1 : slot;
    const coef = coefOf(this.state.coefTable, nextSlot);
    const when = entry.resolvedHere ? '下回合触发' : '本回合触发';
    const head =
      entry.echoBudget > 0 && coef > 0
        ? `${when} · 强度 ${Math.round(coef * 100)}%　还能结算 ${entry.echoBudget} 次`
        : '已耗尽，下次推进时退场';

    tip.append(el('div', 'entry-tip-head', head));
    tip.append(el('div', 'entry-tip-body', def?.text ?? entry.cardId));

    const yield_ = echoYieldText(entry, coef);
    if (yield_ && entry.echoBudget > 0) {
      tip.append(el('div', 'entry-tip-yield', `本次产出　${yield_}`));
    }
    tip.append(
      el('div', 'entry-tip-ignite', `此刻引爆　${igniteYieldText(this.state, slot, entry)}`),
    );
    return tip;
  }

  /** 敌人头顶按引信顺序列出它挂在轨上的意图。 */
  private intentBadges(enemyIndex: number): HTMLElement {
    const row = el('div', 'intent-row');
    const mine = entriesOf(this.state, 'enemy').filter(
      ({ entry }) => entry.sourceEnemy === enemyIndex,
    );

    for (const { slot, entry } of mine) {
      const kind = intentKindOf(entry);
      const badge = el('div', 'intent-badge');
      badge.dataset.kind = kind;

      badge.append(
        el('span', 'intent-glyph', INTENT_GLYPH[kind] ?? '◈'),
        el('span', 'intent-value', intentValueOf(entry)),
        el('span', 'intent-fuse', String(C.TRACK_SLOTS - slot + 1)),
      );
      const tip = el('div', 'intent-tip');
      tip.append(
        el('div', 'intent-tip-head', intentTitle(this.state, entry, slot)),
        el('div', 'intent-tip-body', intentTooltip(entry)),
      );
      badge.append(tip);

      badge.addEventListener('pointerenter', () => {
        const r = badge.getBoundingClientRect();
        badge.classList.toggle('tip-below', r.top < 120);
        badge.closest('.enemy')?.classList.add('tip-open');
        this.revealEnemyLane(true, 'badge');
        document
          .querySelector(`.lane-enemy .slot:nth-child(${slot})`)
          ?.classList.add('linked');
        document
          .querySelectorAll(`.entry-owner[data-enemy="${enemyIndex}"]`)
          .forEach((n) => n.classList.add('owner-lit'));
      });
      badge.addEventListener('pointerleave', () => {
        badge.closest('.enemy')?.classList.remove('tip-open');
        this.revealEnemyLane(false, 'badge');
        document.querySelectorAll('.slot.linked').forEach((n) => n.classList.remove('linked'));
        document
          .querySelectorAll('.entry-owner.owner-lit')
          .forEach((n) => n.classList.remove('owner-lit'));
      });
      row.append(badge);
    }
    return row;
  }

  private renderTrack(track: Record<Lane, (TrackEntry | null)[]>, still = false): void {
    this.renderHint(track);
    for (const lane of ['enemy', 'player'] as Lane[]) {
      const host = this.elLanes[lane];
      host.innerHTML = '';
      for (let slot = 1; slot <= C.TRACK_SLOTS; slot++) {
        const cell = el('div', 'slot');
        cell.dataset.lane = lane;
        cell.dataset.slot = String(slot);

        const label = el('div', 'slot-label');
        label.textContent = slotLabel(lane, slot);
        cell.append(label);

        if (lane === 'player') {
          const coef = el('div', 'slot-coef');
          coef.textContent = `${Math.round(coefOf(this.state.coefTable, slot) * 100)}%`;
          cell.append(coef);
        }

        const entry = track[lane][slot - 1];
        if (entry) cell.append(this.slotTip(entry, lane, slot));
        if (entry) {
          const node = this.entryNode(entry, lane, slot);
          if (still) node.classList.add('placed');
          cell.append(node);
        } else cell.classList.add('empty');

        cell.addEventListener('pointerenter', () => (this.hoverSlot = { lane, slot }));
        cell.addEventListener('pointerleave', () => (this.hoverSlot = null));
        host.append(cell);
      }
    }
  }

  private entryNode(entry: TrackEntry, lane: Lane, slot: number): HTMLElement {
    const node = el('div', 'entry');
    node.dataset.uid = String(entry.uid);
    if (lane === 'enemy') node.classList.add('intent');

    if (lane === 'player') {
      const def = safeCardDef(entry.cardId);
      const url = def ? art.card(def.art ?? def.id) : null;
      if (url) node.style.backgroundImage = `url(${url})`;
      const name = el('div', 'entry-name');
      name.textContent = def?.name ?? entry.cardId;
      const budget = el('div', 'entry-budget');
      for (let i = 0; i < entry.echoBudget; i++) budget.append(document.createElement('i'));
      node.append(name, budget);

      const preview = this.echoPreview(entry, slot);
      if (preview) node.append(preview);
    } else {
      node.dataset.intent = entry.cardId;
      node.dataset.enemy = String(entry.sourceEnemy ?? 0);

      const intentArt = safeIntentDef(entry.cardId);
      const intentUrl = intentArt ? art.intent(intentArt.art ?? intentArt.id) : null;
      if (intentUrl) {
        node.style.backgroundImage = `url(${intentUrl})`;
        node.classList.add('has-art');
      }

      const box = el('div', 'entry-intent');
      const kind = intentKindOf(entry);
      const damage = entry.effects.find((e) => e.kind === 'damage');
      const raw = damage ? (damage.amount + entry.snapshot.strength) * entry.snapshot.damageScale : 0;
      const value = el('div', 'entry-intent-value');
      value.textContent = damage
        ? `${Math.floor(raw)}${(damage.hits ?? 1) > 1 ? `×${damage.hits}` : ''}`
        : intentValueOf(entry) || '◈';
      box.dataset.kind = kind;
      box.append(el('div', 'entry-intent-glyph', INTENT_GLYPH[kind] ?? '◈'), value);

      const label = intentEffectLabel(entry);
      if (label) box.append(el('div', 'entry-intent-label', label));

      const owner = this.state.enemies[entry.sourceEnemy ?? 0];
      if (owner && this.state.enemies.filter((e) => e.alive).length > 1) {
        const tag = el('div', 'entry-owner', owner.name);
        tag.dataset.enemy = String(entry.sourceEnemy ?? 0);
        node.append(tag);
      }
      node.append(box);
      const lock = this.delayMeter(entry);
      if (lock) node.append(lock);
    }
    return node;
  }

  /** 规则锁定或累计次数用尽的意图挂一个锁标。 */
  private delayMeter(entry: TrackEntry): HTMLElement | null {
    if (!entry.undelayable && entry.delayCount < C.INTENT_DELAY_CAP) return null;
    const meter = el('div', 'entry-delay');
    meter.dataset.state = 'locked';
    meter.textContent = '⊘';
    meter.title = entry.undelayable ? '不可延后' : '这个意图的延后次数已用尽';
    return meter;
  }

  /** 本回合的公共延后额度，点亮的点表示还没用掉的次数。 */
  private renderDelayBudget(): void {
    const total = C.INTENT_DELAY_PER_TURN + this.state.mods.delayBonus;
    const left = delayBudgetLeft(this.state);
    this.elDelay.dataset.state = left > 0 ? 'open' : 'spent';
    this.elDelay.innerHTML = '';

    this.elDelay.append(el('span', 'delay-label', '延后'));
    const dots = el('div', 'delay-dots');
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('i');
      if (i >= left) dot.className = 'used';
      dots.append(dot);
    }
    this.elDelay.append(dots);
    withTip(
      this.elDelay,
      `本回合还能延后 ${left} 次`,
      '把敌方意图往回推的公共额度，每次操作消耗一点；延后多格或连带顶动其他意图仍只算一次。回合开始时补满。带 ⊘ 的意图完全推不动。',
    );
  }

  /** 条目在下一次回响时的实际产出，向下取整后与结算一致。 */
  private echoPreview(entry: TrackEntry, slot: number): HTMLElement | null {
    const nextSlot = entry.resolvedHere ? slot + 1 : slot;
    const coef = coefOf(this.state.coefTable, nextSlot);
    if (coef <= 0 || entry.echoBudget <= 0) return null;

    const parts: string[] = [];
    for (const part of previewYield(entry, coef)) {
      if (part.kind === 'damage') parts.push(part.hits > 1 ? `${part.value}×${part.hits}` : `${part.value}`);
      else if (part.kind === 'block') parts.push(`◈${part.value}`);
      else if (part.kind === 'applyStatus') parts.push(`${part.status === 'poison' ? '毒' : '×'}${part.value}`);
    }
    if (!parts.length) return null;

    const node = el('div', 'entry-preview');
    node.textContent = parts.join(' ');
    return node;
  }

  private renderHand(): void {
    this.elHand.innerHTML = '';
    const count = this.state.hand.length;
    this.state.hand.forEach((card, i) => {
      const node = this.cardNode(card);
      const mid = (count - 1) / 2;
      const offset = i - mid;
      const rot = offset * 3.4;
      const lift = Math.abs(offset) ** 1.6 * 3.4;
      node.style.transform = `translateY(${lift}px) rotate(${rot}deg)`;
      node.dataset.rest = node.style.transform;
      this.elHand.append(node);
    });
  }

  private cardNode(card: CardInstance): HTMLElement {
    const def = cardDef(card.defId);
    const node = el('div', 'card');
    node.dataset.type = def.type;
    node.dataset.uid = String(card.uid);
    node.classList.add(canPlay(this.state, card.uid) ? 'playable' : 'unplayable');

    const inner = el('div', 'card-inner');
    const artNode = el('div', 'card-art');
    const url = art.card(def.art ?? def.id);
    if (url) artNode.style.backgroundImage = `url(${url})`;

    const body = el('div', 'card-body');
    const name = el('div', 'card-name');
    name.textContent = card.upgraded ? `${def.name}+` : def.name;
    if (card.upgraded) node.classList.add('upgraded');
    const text = el('div', 'card-text');
    text.innerHTML = cardText(def, card.upgraded).replace(/(\d+)/g, '<b>$1</b>');
    body.append(name, text);

    inner.append(artNode, body);
    const cost = el('div', 'card-cost');
    cost.textContent = String(costOf(this.state, def, card.upgraded));
    node.append(inner, el('div', 'card-edge'), typeMark(def.type, def.text), cost);

    node.addEventListener('pointerenter', () => {
      if (this.drag) return;
      node.style.transform = `${node.dataset.rest} translateY(-34px) scale(1.14)`;
      sfx.hover();
    });
    node.addEventListener('pointerleave', () => {
      if (this.drag) return;
      node.style.transform = node.dataset.rest ?? '';
    });
    node.addEventListener('pointerdown', (ev) => this.startDrag(ev, card, node));
    return node;
  }

  /** 遗物在战斗中持续生效，这里常驻显示并说明它改写了什么。 */
  private renderRelics(): void {
    this.elRelics.innerHTML = '';
    const ids = this.state.player.relics;
    this.elRelics.classList.toggle('folded', ids.length > 3 && !this.relicsOpen);

    for (const id of ids) {
      const def = RELICS.find((r) => r.id === id);
      const slot = el('div', 'relic-slot');
      const url = art.relic(def?.art ?? id);
      if (url) slot.style.backgroundImage = `url(${url})`;

      slot.dataset.relic = id;

      const tip = el('div', 'relic-tip');
      tip.append(
        el('div', 'relic-tip-head', def?.name ?? id),
        el('div', 'relic-tip-body', def?.text ?? ''),
      );
      slot.append(tip);
      this.elRelics.append(slot);
    }

    if (ids.length > 3) {
      const more = el('button', 'relic-more', this.relicsOpen ? '收起' : `+${ids.length - 3}`);
      more.addEventListener('click', () => {
        this.relicsOpen = !this.relicsOpen;
        this.renderRelics();
      });
      this.elRelics.append(more);
    }
  }

  /** 在身装备按槽位顺序常驻在状态面板上方，结算时点亮对应的那一格。 */
  private renderEquips(): void {
    this.elEquips.innerHTML = '';
    const worn = this.state.equipment
      .map((id) => EQUIPMENT.find((e) => e.id === id))
      .filter((def): def is EquipmentDef => Boolean(def))
      .sort((a, b) => EQUIP_SLOT_ORDER.indexOf(a.slot) - EQUIP_SLOT_ORDER.indexOf(b.slot));

    for (const def of worn) {
      const slot = el('div', 'equip-slot');
      slot.dataset.equip = def.id;
      slot.dataset.slot = def.slot;

      const face = el('div', 'equip-face');
      const url = art.equipment(def.art);
      if (url) face.style.backgroundImage = `url(${url})`;

      const tip = el('div', 'relic-tip');
      tip.append(
        el('div', 'relic-tip-head', `${def.name}　${SLOT_LABEL[def.slot]}`),
        el('div', 'relic-tip-body', def.text),
      );
      slot.append(face, el('span', 'equip-kind', SLOT_GLYPH[def.slot]), tip);
      this.elEquips.append(slot);
    }
  }

  /** 装备结算时脉冲一下对应的槽位，并把这次的产出浮起来。 */
  private fireEquip(id: string, text: string): void {
    const slot = this.elEquips.querySelector(`[data-equip="${id}"]`) as HTMLElement | null;
    if (!slot) return;
    slot.classList.remove('firing');
    void slot.offsetWidth;
    slot.classList.add('firing');
    setTimeout(() => slot.classList.remove('firing'), 900);

    const rect = slot.getBoundingClientRect();
    fx.impact({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, 42, 10);
    if (!text) return;

    const label = el('div', 'equip-fire-label', text);
    label.style.left = `${rect.left + rect.width / 2}px`;
    label.style.top = `${rect.bottom + 8}px`;
    this.root.append(label);
    setTimeout(() => label.remove(), 1200);
  }

  /** 遗物生效时点亮它并说明发生了什么。 */
  private fireRelic(id: string, text: string): void {
    const slot = this.elRelics.querySelector(`[data-relic="${id}"]`) as HTMLElement | null;
    if (!slot) return;
    this.elRelics.prepend(slot);
    slot.classList.add('surfaced');
    setTimeout(() => slot.classList.remove('surfaced'), 1400);
    slot.classList.remove('firing');
    void slot.offsetWidth;
    slot.classList.add('firing');
    setTimeout(() => slot.classList.remove('firing'), 900);

    const rect = slot.getBoundingClientRect();
    const label = el('div', 'relic-fire-label');
    label.textContent = text;
    label.style.left = `${rect.left + rect.width / 2}px`;
    label.style.top = `${rect.top - 6}px`;
    this.root.append(label);
    setTimeout(() => label.remove(), 1200);
    sfx.block();
  }

  /** 按当前时机播放对应遗物的反馈。 */
  private fireRelicsFor(moment: 'combatStart' | 'turnStart' | 'salvage'): void {
    for (const id of this.state.player.relics) {
      const def = RELICS.find((r) => r.id === id);
      if (!def) continue;
      if (moment === 'combatStart' && def.startingBlock) {
        this.fireRelic(id, `护甲 +${def.startingBlock}`);
      } else if (moment === 'combatStart' && def.startingStrength) {
        this.fireRelic(id, `力量 +${def.startingStrength}`);
      } else if (moment === 'turnStart' && def.drawPerTurn) {
        this.fireRelic(id, `抽牌 +${def.drawPerTurn}`);
      } else if (moment === 'salvage' && def.salvageBurn) {
        this.fireRelic(id, '牌已回收');
      }
    }
  }

  private renderPlayer(): void {
    const p = this.state.player;
    const shown = this.shownHp.get('player') ?? p.hp;
    this.elHp.textContent = `${shown} / ${p.maxHp}`;
    this.elHpFill.style.width = `${(shown / p.maxHp) * 100}%`;
    this.elStatuses.replaceWith(statusRow(p.statuses));
    this.elStatuses = document.querySelector('.player-hp .status-row') as HTMLElement;
    this.elEnergy.textContent = String(p.energy);
    this.elBlock.innerHTML = '';
    const armor = this.shownBlock.get('player') ?? p.block;
    if (armor > 0) {
      this.elBlock.append(el('i', 'shield-glyph'), el('span', '', String(armor)));
      withTip(
        this.elBlock,
        `护甲 ${armor}`,
        '受到伤害时先扣护甲，扣完才掉生命。回合开始时保留一半，可以继续叠加。',
      );
      this.elBlock.classList.add('active');
    } else {
      this.elBlock.classList.remove('active', 'has-tip');
    }
    this.elPiles.draw.textContent =
      `手牌 ${this.state.hand.length}/${p.handSize} · 抽牌 ${this.state.drawPile.length}`;
    this.elPiles.discard.textContent = `弃牌 ${this.state.discardPile.length}`;
    this.renderDelayBudget();
  }

  private startDrag(ev: PointerEvent, card: CardInstance, node: HTMLElement): void {
    if (this.busy) {
      toast(this.root, '结算还在演出');
      return;
    }
    if (!canPlay(this.state, card.uid)) {
      node.classList.remove('refused');
      void node.offsetWidth;
      node.classList.add('refused');
      toast(this.root, this.refusalReason(card));
      sfx.blocked();
      return;
    }
    ev.preventDefault();
    const rect = node.getBoundingClientRect();
    this.drag = {
      card,
      el: node,
      originX: rect.left + rect.width / 2,
      originY: rect.top + rect.height / 2,
      anchorX: rect.left + rect.width / 2,
      anchorY: rect.top + rect.height * 0.9,
      pointerId: ev.pointerId,
      zoneBottom: this.elPlayZone.getBoundingClientRect().bottom,
      litSlot: null,
      litTarget: null,
    };
    node.classList.add('dragging');
    this.elHand.classList.add('aiming');
    this.elScene.classList.add('dragging');

    const def = cardDef(card.defId);
    const lane = targetLaneOf(def);
    if (lane === 'enemy') this.revealEnemyLane(true, 'drag');
    if (lane) this.elLanes[lane].classList.add('lane-hot');
    if (!def.needsTarget && !def.needsSlot) this.elPlayZone.classList.add('show');
    this.aim?.show();
    sfx.pick();
  }

  /** 说明这张牌当前打不出的具体原因。 */
  private refusalReason(card: CardInstance): string {
    const def = cardDef(card.defId);
    if (def.unplayable) return `${def.name} 无法打出`;
    const cost = costOf(this.state, def, card.upgraded);
    if (this.state.player.energy < cost) {
      return `能量不足，还需要 ${cost - this.state.player.energy} 点`;
    }
    if (def.type === 'ignite' && countEntries(this.state, 'player') < C.IGNITE_MIN_ENTRIES) {
      return `时间轨上至少要有 ${C.IGNITE_MIN_ENTRIES} 个条目才能引爆`;
    }
    if (def.needsSlot) {
      const lanes = [...new Set((def.manipulations ?? []).map((op) => op.lane).filter(Boolean))] as Lane[];
      if (!lanes.length) {
        const lane = targetLaneOf(def);
        if (lane === 'enemy' && countEntries(this.state, 'enemy') === 0) return '敌方轨道上没有意图可以操作';
        if (lane === 'player' && countEntries(this.state, 'player') === 0) return '你的时间轨上还没有条目';
      } else if (lanes.every((lane) => countEntries(this.state, lane) === 0)) {
        return lanes.includes('enemy') && lanes.includes('player')
          ? '两边轨道上都没有可以操作的条目'
          : lanes[0] === 'enemy'
            ? '敌方轨道上没有意图可以操作'
            : '你的时间轨上还没有条目';
      }
    }
    return '现在无法打出这张牌';
  }

  /**
   * 这一格能不能承接这张牌。返回原因字符串表示整张牌都会落空，
   * 在扣能量之前拦下来。只要还有一步位移可行，或牌本身另有效果，就照常打出。
   */
  private slotBlockReason(def: CardDef, lane: Lane, slot: number): string | null {
    const ops = def.manipulations ?? [];
    if (!ops.length) return null;

    const reasons: string[] = [];
    for (const op of ops) {
      const opLane = op.lane ?? lane;
      const at = op.slot ?? slot;
      const entry = entriesOf(this.state, opLane).find((it) => it.slot === at)?.entry;
      if (!entry) {
        reasons.push(opLane === 'enemy' ? '这一格没有意图' : '这一格没有条目');
        continue;
      }
      const reason = this.opBlockReason(op, entry, opLane, at);
      if (!reason) return null;
      reasons.push(reason);
    }

    return reasons[0] ?? null;
  }

  /** 单个位移操作落在这个条目上会不会落空。 */
  private opBlockReason(
    op: Manipulation,
    entry: TrackEntry,
    lane: Lane,
    slot: number,
  ): string | null {
    const name = nameOfEntry(entry, lane);
    switch (op.kind) {
      case 'rewind':
        if (
          rewindsLeft(this.state, entry, lane) > 0 &&
          (lane === 'enemy'
            ? canRewindAt(this.state, slot, op.amount ?? 1, true)
            : canRewindPlayerAt(this.state, slot, op.amount ?? 1))
        ) {
          return null;
        }
        if (lane === 'enemy') {
          if (delayBudgetLeft(this.state) <= 0) return '本回合的延后次数已经用尽';
          if (entry.undelayable || entry.delayCount >= C.INTENT_DELAY_CAP) {
            return `${name} 不能再延后`;
          }
          return '前方有不可延后的意图阻挡';
        }
        return `${name} 不能再向前回溯`;
      case 'swap': {
        const otherLane: Lane = lane === 'enemy' ? 'player' : 'enemy';
        const other = entriesOf(this.state, otherLane).find((item) => item.slot === slot)?.entry;
        if (!other) return `另一侧同格没有${otherLane === 'enemy' ? '意图' : '条目'}`;
        return entry.unstealable || other.unstealable ? `${name} 无法跨轨交换` : null;
      }
      case 'copy':
        if (entry.copyDepth > 0) return `${name} 已经是副本`;
        return countEntries(this.state, 'player') >= C.TRACK_SLOTS ? '己方轨道已经占满' : null;
      case 'steal':
        return entry.unstealable ? `${name} 无法被窃取` : null;
      case 'freeze':
        if (entry.frozen) return `${name} 已经被冻结`;
        if (lane === 'enemy' && (entry.undelayable || rewindsLeft(this.state, entry, lane) <= 0)) {
          return entry.undelayable ? `${name} 不能被冻结` : '本回合的延后次数已经用尽';
        }
        return entry.echoBudget <= 0 ? `${name} 已经没有结算次数可冻结` : null;
      case 'sustain':
        return entry.echoBudget >= C.ECHO_BUDGET_MAX ? `${name} 的结算次数已满` : null;
      default:
        return null;
    }
  }

  /** 指针事件的频率可以远高于刷新率，这里只记录位置，绘制推到下一帧。 */
  private onPointerMove = (ev: PointerEvent): void => {
    if (!this.drag) return;
    this.pointerX = ev.clientX;
    this.pointerY = ev.clientY;
    if (this.dragFrame === 0) this.dragFrame = requestAnimationFrame(this.paintDrag);
  };

  private paintDrag = (): void => {
    this.dragFrame = 0;
    const drag = this.drag;
    if (!drag) return;

    const def = cardDef(drag.card.defId);
    const aimed = def.needsTarget || def.needsSlot;
    const x = this.pointerX;
    const y = this.pointerY;

    if (aimed) {
      // 需要指定落点的牌保持在原位，由瞄准线指向目标
      drag.el.style.transform = `translateY(-26px) scale(1.04) rotate(0deg)`;
    } else {
      drag.el.style.transform = `translate(${x - drag.originX}px, ${y - drag.originY}px) scale(1.06) rotate(0deg)`;
    }

    const wantLane = targetLaneOf(def);
    const wantLanes = new Set((def.manipulations ?? []).map((op) => op.lane).filter(Boolean) as Lane[]);
    if (!wantLanes.size && wantLane) wantLanes.add(wantLane);
    const hoverOk = Boolean(def.needsSlot && this.hoverSlot && wantLanes.has(this.hoverSlot.lane));
    const slot =
      hoverOk && this.hoverSlot && !this.slotBlockReason(def, this.hoverSlot.lane, this.hoverSlot.slot)
        ? this.slotCell(this.hoverSlot.lane, this.hoverSlot.slot)
        : null;
    if (slot !== drag.litSlot) {
      drag.litSlot?.classList.remove('droppable');
      slot?.classList.add('droppable');
      drag.litSlot = slot;
    }

    const target =
      def.needsTarget && this.hoverTarget !== null
        ? (this.root.querySelector(`.enemy[data-index="${this.hoverTarget}"]`) as HTMLElement | null)
        : null;
    if (target !== drag.litTarget) {
      drag.litTarget?.classList.remove('targeted');
      target?.classList.add('targeted');
      drag.litTarget = target;
    }

    if (aimed) {
      const ok = def.needsSlot ? slot !== null : this.hoverTarget !== null;
      this.aim?.update(
        { x: drag.anchorX, y: drag.anchorY },
        { x, y },
        ok ? 'valid' : 'idle',
      );
    } else {
      this.elPlayZone.classList.toggle('armed', y < drag.zoneBottom);
    }
  };

  private onPointerUp = (): void => {
    if (!this.drag) return;
    const { card, el: node, litSlot, litTarget } = this.drag;
    const def = cardDef(card.defId);
    this.drag = null;
    if (this.dragFrame) {
      cancelAnimationFrame(this.dragFrame);
      this.dragFrame = 0;
    }
    litSlot?.classList.remove('droppable');
    litTarget?.classList.remove('targeted');
    this.aim?.hide();
    this.elHand.classList.remove('aiming');
    this.elScene.classList.remove('dragging');
    this.elPlayZone.classList.remove('show', 'armed');
    this.revealEnemyLane(false, 'drag');
    this.elLanes.enemy.classList.remove('lane-hot');
    this.elLanes.player.classList.remove('lane-hot');
    node.classList.remove('dragging');

    const wantLane = targetLaneOf(def);

    if (def.needsTarget && this.hoverTarget === null) {
      node.style.transform = node.dataset.rest ?? '';
      toast(this.root, '需要先指定一个目标');
      sfx.blocked();
      return;
    }

    // 需要指定格位的牌，没有精确落在格子上时改用弹窗挑选
    if (def.needsSlot && wantLane) {
      const onSlot = this.hoverSlot && this.hoverSlot.lane === wantLane ? this.hoverSlot.slot : null;
      if (onSlot === null) {
        node.style.transform = node.dataset.rest ?? '';
        pickSlot(this.root, this.state, {
          title: wantLane === 'enemy' ? '选择要作用的意图' : '选择要作用的条目',
          hint:
            wantLane === 'enemy'
              ? `${def.name}：${def.text}`
              : `${def.name}：${def.text}`,
          lane: wantLane,
          blocked: (_entry, slot) => this.slotBlockReason(def, wantLane, slot),
          onPick: (slot) => {
            this.lastPlayOrigin = null;
            this.lastTargetId = null;
            this.dispatch({
              type: 'playCard',
              uid: card.uid,
              targetIndex: this.hoverTarget ?? undefined,
              slot,
              laneTarget: wantLane,
            });
          },
        });
        return;
      }

      const reason = this.slotBlockReason(def, wantLane, onSlot);
      if (reason) {
        node.style.transform = node.dataset.rest ?? '';
        toast(this.root, reason);
        sfx.blocked();
        return;
      }
    }

    const rect = node.getBoundingClientRect();
    this.lastPlayOrigin = { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.3 };
    this.lastTargetId = this.hoverTarget !== null ? `enemy${this.hoverTarget}` : null;

    this.dispatch({
      type: 'playCard',
      uid: card.uid,
      targetIndex: this.hoverTarget ?? undefined,
      slot: this.hoverSlot?.slot,
      laneTarget: this.hoverSlot?.lane,
    });
  };

  private dispatch(action: Parameters<typeof reduce>[1]): void {
    if (this.busy) {
      toast(this.root, '结算还在演出');
      return;
    }
    if (this.state.result !== 'ongoing') return;
    const before = this.state;
    const next = reduce(before, action);
    if (next === before) {
      if (action.type === 'playCard') {
        toast(this.root, '这次操作没有生效');
        sfx.blocked();
      }
      return;
    }

    // 播放期间先按结算前的数值显示，再由事件逐步推到最终值
    this.shownHp.set('player', before.player.hp);
    this.shownBlock.set('player', before.player.block);
    for (const enemy of before.enemies) {
      this.shownHp.set(enemy.id, enemy.hp);
      this.shownBlock.set(enemy.id, enemy.block);
    }

    this.state = next;
    this.busy = true;
    void this.playEvents(next.events, before).then(() => {
      this.busy = false;
      this.render(undefined, true);
      this.checkTips(before, next);
      if (next.result !== 'ongoing') this.onFinish(next.result, next.player.hp);
    });
  }

  /** 机制提示只在对应现象第一次出现时给出。 */
  private checkTips(before: CombatState, after: CombatState): void {
    if (countEntries(after, 'player') > 0 && countEntries(before, 'player') === 0) {
      showTip(this.root, TIPS.firstWeave!);
      return;
    }
    if (after.turn > before.turn && after.events.some((e) => e.type === 'resolve' && !e.isPlay)) {
      showTip(this.root, TIPS.firstEcho!);
      return;
    }
    if (after.burnedPile.length > before.burnedPile.length) {
      showTip(this.root, TIPS.firstPush!);
      return;
    }
    if (after.events.some((e) => e.type === 'detonate')) {
      showTip(this.root, TIPS.firstIgnite!);
    }
  }

  /** 事件按顺序播放。轨道从操作前的状态起步，位移与退场逐条兑现。 */
  private async playEvents(events: CombatEvent[], before: CombatState): Promise<void> {
    this.render(before.track, true);
    const outputs = echoOutputs(events);
    const launches = intentLaunches(events);

    for (let i = 0; i < events.length; i++) {
      const ev = events[i] as CombatEvent;

      const flyingUid = launches.get(i);
      if (flyingUid !== undefined) await this.launchIntent(flyingUid);

      if (ev.type === 'shift') {
        const batch: CombatEvent[] = [];
        while (i < events.length && events[i]!.type === 'shift') batch.push(events[i++]!);
        i -= 1;
        await this.animateShifts(batch);
        this.renderPlayer();
        continue;
      }

      switch (ev.type) {
        case 'turnEnd':
          this.showBanner('敌方回合', 'enemy');
          sfx.turn();
          await wait(620);
          break;

        case 'play': {
          sfx.play(String(ev.cardId));
          if (safeCardDef(String(ev.cardId))?.type === 'ignite') {
            this.elLanes.player
              .querySelectorAll('.entry')
              .forEach((n) => n.classList.add('charging'));
            sfx.charge();
            await wait(260);
          } else {
            // 攻击类牌从出牌位置甩出一道光束到目标
            const def = safeCardDef(String(ev.cardId));
            const hits = def?.effects.some((e) => e.kind === 'damage');
            if (hits) {
              const origin = this.lastPlayOrigin ?? {
                x: window.innerWidth / 2,
                y: window.innerHeight - 200,
              };
              const target = this.nodeForCombatant(this.lastTargetId ?? 'enemy0');
              if (target) fx.beam(origin, centerOf(target), 42, { travel: true, width: 5 });
            }
            await wait(hits ? 130 : 60);
          }
          break;
        }

        case 'resolve': {
          const uid = Number(ev.uid);
          let node = this.entryEl(uid);
          if (!node && ev.isPlay) node = this.materializeEntry(uid);
          if (!node) break;
          if (ev.isPlay) {
            node.classList.add('cast');
            break;
          }
          await this.playEcho(node, Number(ev.coef), outputs.get(i));
          break;
        }

        case 'damage': {
          const hurtId = String(ev.targetId);
          const armorNow = this.shownBlock.get(hurtId) ?? this.armorOf(hurtId);
          this.shownBlock.set(hurtId, Math.max(0, armorNow - Number(ev.absorbed)));
          this.shownHp.set(String(ev.targetId), Number(ev.hp));
          this.refreshHp(String(ev.targetId), Number(ev.hp));
          this.renderPlayer();
          const target = this.nodeForCombatant(String(ev.targetId));
          if (target) {
            const loss = Number(ev.hpLoss);
            target.classList.add('hurt');
            setTimeout(() => target.classList.remove('hurt'), 300);
            if (loss >= 5 && String(ev.targetId) !== 'player') {
              target.classList.remove('recoil');
              void target.offsetWidth;
              target.classList.add('recoil');
              setTimeout(() => target.classList.remove('recoil'), 360);
            }
            const pos = centerOf(target);
            if (loss > 0) {
              const heavy = loss >= 12;
              const style = ev.pierce ? 'pierce' : heavy ? 'big' : '';
              this.floatNumber(pos, `-${loss}`, style);
              if (String(ev.targetId) === 'player') {
                sfx.playerHit(loss);
                this.playerHurt(loss);
              } else {
                fx.impact(pos, undefined, Math.min(52, 18 + loss * 2));
                sfx.hit(loss);
                if (heavy) {
                  fx.hold(55);
                  fx.nudge(6);
                }
              }
            } else if (Number(ev.absorbed) > 0) {
              this.floatNumber(pos, `${ev.absorbed}`, 'block');
              sfx.blocked();
            }
          }
          // 重击后多留一拍，让定格与余震走完
          await wait(Number(ev.hpLoss) >= 12 ? 210 : 110);
          break;
        }

        case 'block': {
          this.shownBlock.set(String(ev.targetId), Number(ev.total ?? ev.amount));
          this.renderPlayer();
          const target = this.nodeForCombatant(String(ev.targetId));
          if (target) this.floatNumber(centerOf(target), `+${ev.amount}`, 'block');
          sfx.block();
          await wait(80);
          break;
        }

        case 'eject': {
          const node = this.entryEl(Number(ev.uid));
          if (ev.reason === 'burn') await this.playBurn(node, String(ev.cardId));
          else if (node) this.dissolveEntry(node);
          break;
        }

        case 'detonate': {
          fx.shockwave(centerOf(this.elLanes.player));
          sfx.detonate();
          this.root.querySelectorAll('.entry.charging').forEach((n) => n.classList.remove('charging'));
          await wait(320);
          break;
        }

        case 'copy': {
          const node = this.materializeEntry(Number(ev.uid));
          node?.classList.add('cast');
          sfx.disrupt();
          await wait(150);
          break;
        }

        case 'swap': {
          await this.animateSwap(
            ev.a as { lane: Lane; slot: number },
            ev.b as { lane: Lane; slot: number },
          );
          break;
        }

        case 'freeze': {
          const node = this.entryEl(Number(ev.uid));
          node?.classList.add('frozen');
          sfx.disrupt();
          await wait(150);
          break;
        }

        case 'steal':
        case 'preempt':
          sfx.disrupt();
          await wait(140);
          break;

        case 'manipulate': {
          if (ev.lane === 'enemy') this.revealEnemyLane(true, 'manipulate');
          if (ev.ok) {
            sfx.disrupt();
            await wait(320);
          } else {
            toast(this.root, MANIPULATE_FAIL[String(ev.kind)] ?? '这一步没有可作用的目标');
            sfx.blocked();
            await wait(220);
          }
          this.revealEnemyLane(false, 'manipulate');
          break;
        }

        case 'phase': {
          const node = this.nodeForCombatant(String(ev.enemyId));
          if (node) {
            node.classList.add('phase-shift');
            setTimeout(() => node.classList.remove('phase-shift'), 900);
          }
          this.showBanner(`${ev.enemyName} · ${ev.name}`, 'enemy');
          fx.flash(0.4, 6);
          fx.shockwave();
          fx.hold(90);
          sfx.detonate();
          await wait(900);
          break;
        }

        case 'death': {
          const id = String(ev.enemyId);
          const node = this.nodeForCombatant(id);
          if (node) {
            node.classList.add('dying');
            const pos = centerOf(node);
            fx.impact(pos, 42, 46);
            fx.hold(70);
            fx.nudge(9);
          }
          sfx.death();
          fx.flash(0.2, 42);
          await wait(900);
          this.buried.add(id);
          node?.remove();
          break;
        }

        case 'lifesteal': {
          const node = this.nodeForCombatant(String(ev.targetId));
          this.shownHp.set(String(ev.targetId), Number(ev.hp));
          this.refreshHp(String(ev.targetId), Number(ev.hp));
          if (node) this.floatNumber(centerOf(node), `+${ev.amount}`, 'block');
          await wait(120);
          break;
        }

        case 'thorns': {
          const node = this.nodeForCombatant(String(ev.targetId));
          this.shownHp.set(String(ev.targetId), Number(ev.hp));
          this.refreshHp(String(ev.targetId), Number(ev.hp));
          if (node) {
            this.floatNumber(centerOf(node), `-${ev.amount}`, 'echo');
            fx.impact(centerOf(node), 325, 18);
          }
          sfx.blocked();
          await wait(140);
          break;
        }

        case 'execute': {
          const node = this.nodeForCombatant(String(ev.targetId));
          if (node) this.castLabel('处决', { ...centerOf(node), y: centerOf(node).y - 40 });
          fx.flash(0.22, 325);
          await wait(160);
          break;
        }

        case 'poisonTick':
        case 'burnTick':
        case 'regenTick':
        case 'heal': {
          this.shownHp.set(String(ev.targetId), Number(ev.hp));
          this.refreshHp(String(ev.targetId), Number(ev.hp));
          const node = this.nodeForCombatant(String(ev.targetId));
          if (node) this.floatNumber(centerOf(node), `${ev.type === 'regenTick' || ev.type === 'heal' ? '+' : '-'}${ev.amount}`, ev.type === 'regenTick' || ev.type === 'heal' ? 'block' : '');
          await wait(160);
          break;
        }

        case 'turnStart':
          this.shownBlock.clear();
          this.shownHp.clear();
          this.renderPlayer();
          this.showBanner(`你的回合 · 第 ${ev.turn} 轮`, 'player');
          if (Number(ev.turn) > 1) this.fireRelicsFor('turnStart');
          sfx.turn();
          await wait(160);
          break;

        case 'equip':
          this.fireEquip(String(ev.equipId), equipYield(events, i));
          await wait(160);
          break;

        case 'intentStrike': {
          const node = this.nodeForCombatant(String(ev.enemyId));

          // 先把敌方泳道亮出来，让玩家看清这一击来自哪一格
          this.revealEnemyLane(true, 'strike');
          await wait(230);

          const entry = this.elLanes.enemy.querySelector(
            `.entry[data-uid="${ev.uid}"]`,
          ) as HTMLElement | null;

          const def = safeIntentDef(String(ev.cardId));
          const mode = intentModeOf(def);
          this.flyIntent(entry, mode, node);
          this.reactEnemy(node, mode);

          if (node) {
            const acting = effectLabel(def?.effects ?? []);
            if (acting) {
              const r = node.getBoundingClientRect();
              this.castLabel(acting, { x: r.left + r.width / 2, y: r.top + 12 }, CAST_VARIANT[mode]);
            }
          }
          await wait(mode === 'strike' ? 360 : 300);
          this.revealEnemyLane(false, 'strike');
          break;
        }

        case 'intentResolved':
          this.entryEl(Number(ev.uid))?.remove();
          this.syncSlots();
          break;
      }
      this.renderPlayer();
    }
  }

  /** 回响重演：命中格位高亮，产出与衰减系数同时读出。 */
  private async playEcho(node: HTMLElement, coef: number, out?: EchoOutput): Promise<void> {
    const cell = node.parentElement;
    node.classList.remove('echoing');
    void node.offsetWidth;
    node.dataset.power = coef >= 0.9 ? 'full' : coef >= 0.6 ? 'strong' : coef >= 0.35 ? 'mid' : 'faint';
    node.classList.add('echoing');
    cell?.classList.add('echo-active');
    setTimeout(() => cell?.classList.remove('echo-active'), 560);

    const badge = el('div', 'entry-coef');
    badge.textContent = `×${Math.round(coef * 100)}%`;
    node.append(badge);
    setTimeout(() => badge.remove(), 620);

    const pos = centerOf(node);
    sfx.echo(coef);
    fx.echoRipple(pos, coef);
    fx.nudge(1.5 + coef * 3);

    if (out) {
      const parts: string[] = [];
      if (out.damage > 0) parts.push(String(out.damage));
      if (out.block > 0) parts.push(`◈${out.block}`);
      if (parts.length) this.floatNumber({ x: pos.x, y: pos.y - 18 }, parts.join(' '), 'echo');
      if (out.targetId) {
        const target = this.nodeForCombatant(out.targetId);
        if (target) fx.beam(pos, centerOf(target), 325, { width: 1.5 + coef * 4 });
      }
    }
    await wait(160);
  }

  /** 溢出烧毁：条目烧穿后永久离场。 */
  private async playBurn(node: HTMLElement | null, cardId: string): Promise<void> {
    sfx.burn();
    if (!node) {
      fx.flash(0.14, 22);
      await wait(200);
      return;
    }
    const pos = centerOf(node);
    node.classList.add('burning');
    fx.hold(70);
    fx.burn(pos);
    const name = safeCardDef(cardId)?.name ?? cardId;
    this.floatNumber({ x: pos.x, y: pos.y - 6 }, `${name} 移出战斗`, 'burn');
    await wait(210);
    fx.nudge(5);
    await wait(230);
    node.remove();
    this.syncSlots();
  }

  /** 意图脱离末位。已经在出手时演过的不再重播，只等它落幕。 */
  private async launchIntent(uid: number): Promise<void> {
    const node = this.entryEl(uid);
    if (!node) return;
    if (node.dataset.flown) {
      await wait(120);
    } else {
      const owner = this.nodeForCombatant(`enemy${node.dataset.enemy ?? 0}`);
      this.flyIntent(node, intentModeOf(safeIntentDef(node.dataset.intent ?? '')), owner);
      await wait(240);
    }
    node.remove();
    this.syncSlots();
  }

  /**
   * 意图落地的三种演出。攻向玩家的破空飞出，配震屏、定格与迸发；
   * 只施加负面状态的收敛成一道颜色标记与轻音；朝自己的向内收束回敌人身上。
   */
  private flyIntent(node: HTMLElement | null, mode: IntentMode, enemy: HTMLElement | null): void {
    const landing = centerOf(mode === 'gather' ? (enemy ?? this.elPortrait) : this.elPortrait);
    const from = node ? centerOf(node) : landing;

    if (node) {
      node.dataset.flown = '1';
      node.style.setProperty('--fly-x', `${landing.x - from.x}px`);
      node.style.setProperty('--fly-y', `${landing.y - from.y}px`);
      node.classList.add(FLY_CLASS[mode]);
    }

    if (mode === 'strike') {
      fx.bolt(from, landing, 0.3);
      fx.impact(from, 6, 12);
      fx.nudge(5);
      fx.hold(60);
      sfx.intent();
      return;
    }

    if (mode === 'mark') {
      fx.beam(from, landing, 325, { travel: true, width: 2, duration: 0.34 });
      this.elPortrait.classList.remove('marked');
      void this.elPortrait.offsetWidth;
      this.elPortrait.classList.add('marked');
      setTimeout(() => this.elPortrait.classList.remove('marked'), 700);
      sfx.disrupt();
      return;
    }

    // 光华从四周向内聚拢
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i + Math.PI / 4;
      const start = { x: landing.x + Math.cos(angle) * 78, y: landing.y + Math.sin(angle) * 78 };
      fx.beam(start, landing, 210, { travel: true, width: 2.5, duration: 0.3 });
    }
    fx.beam(from, landing, 210, { travel: true, width: 3, duration: 0.32 });
    fx.nudge(2);
    // 沉稳的金属加固：机械咬合打底，随后一记扣合的余响
    sfx.shift();
    setTimeout(() => sfx.block(), 90);
  }

  /** 敌人自身的反应动作，强度与意图指向一致。 */
  private reactEnemy(node: HTMLElement | null, mode: IntentMode): void {
    if (!node) return;
    const cls = REACT_CLASS[mode];
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
    setTimeout(() => node.classList.remove(cls), mode === 'gather' ? 820 : 460);
  }

  /** 一批位移同时播放，整轨读作一次推进。 */
  private async animateShifts(shifts: CombatEvent[]): Promise<void> {
    const moves: { node: HTMLElement; cell: HTMLElement }[] = [];
    for (const s of shifts) {
      const node = this.entryEl(Number(s.uid));
      const cell = this.slotCell(s.lane as Lane, Number(s.to));
      if (node && cell) moves.push({ node, cell });
    }
    if (!moves.length) return;
    sfx.shift();
    await this.moveEntries(moves, 260);
  }

  private async animateSwap(a: { lane: Lane; slot: number }, b: { lane: Lane; slot: number }): Promise<void> {
    const cellA = this.slotCell(a.lane, a.slot);
    const cellB = this.slotCell(b.lane, b.slot);
    const nodeA = cellA?.querySelector('.entry') as HTMLElement | null;
    const nodeB = cellB?.querySelector('.entry') as HTMLElement | null;
    const moves: { node: HTMLElement; cell: HTMLElement }[] = [];
    if (nodeA && cellB) moves.push({ node: nodeA, cell: cellB });
    if (nodeB && cellA) moves.push({ node: nodeB, cell: cellA });
    if (!moves.length) return;
    sfx.disrupt();
    await this.moveEntries(moves, 280);
  }

  /** 先记录旧位置，改挂节点后用反向位移过渡回零。 */
  private async moveEntries(moves: { node: HTMLElement; cell: HTMLElement }[], ms: number): Promise<void> {
    const flips = moves.map(({ node, cell }) => {
      const from = node.getBoundingClientRect();
      node.classList.add('placed');
      cell.append(node);
      const to = node.getBoundingClientRect();
      return { node, dx: from.left - to.left, dy: from.top - to.top };
    });
    for (const f of flips) {
      f.node.style.transition = 'none';
      f.node.style.transform = `translate(${f.dx}px, ${f.dy}px)`;
    }
    void this.root.offsetWidth;
    for (const f of flips) {
      f.node.classList.add('sliding');
      f.node.style.transition = '';
      f.node.style.transform = '';
    }
    this.syncSlots();
    await wait(ms);
    for (const f of flips) f.node.classList.remove('sliding');
  }

  /** 按最终状态在对应格位补建条目节点。 */
  private materializeEntry(uid: number): HTMLElement | null {
    for (const lane of ['enemy', 'player'] as Lane[]) {
      for (let slot = 1; slot <= C.TRACK_SLOTS; slot++) {
        const entry = this.state.track[lane][slot - 1];
        if (!entry || entry.uid !== uid) continue;
        const cell = this.slotCell(lane, slot);
        if (!cell) return null;
        cell.querySelector('.entry')?.remove();
        const node = this.entryNode(entry, lane, slot);
        cell.append(node);
        this.syncSlots();
        return node;
      }
    }
    return null;
  }

  private dissolveEntry(node: HTMLElement): void {
    node.classList.add('leaving');
    setTimeout(() => {
      node.remove();
      this.syncSlots();
    }, 260);
  }

  private entryEl(uid: number): HTMLElement | null {
    return this.root.querySelector(`.entry[data-uid="${uid}"]`);
  }

  private slotCell(lane: Lane, slot: number): HTMLElement | null {
    return this.elLanes[lane].querySelector(`.slot[data-slot="${slot}"]`);
  }

  private syncSlots(): void {
    for (const lane of ['enemy', 'player'] as Lane[]) {
      this.elLanes[lane].querySelectorAll('.slot').forEach((cell) => {
        cell.classList.toggle('empty', !cell.querySelector('.entry'));
      });
    }
  }

  /** 该单位当前的护甲，作为显示值的起点。 */
  private armorOf(id: string): number {
    if (id === 'player') return this.state.player.block;
    return this.state.enemies.find((e) => e.id === id)?.block ?? 0;
  }

  /** 只刷新某一条血条，避免整块重建打断进行中的动画。 */
  private refreshHp(id: string, hp: number): void {
    if (id === 'player') {
      this.elHpFill.style.width = `${(hp / this.state.player.maxHp) * 100}%`;
      this.elHp.textContent = `${hp} / ${this.state.player.maxHp}`;
      return;
    }
    const enemy = this.state.enemies.find((e) => e.id === id);
    const node = this.nodeForCombatant(id);
    if (!enemy || !node) return;
    const fill = node.querySelector('.hp-fill') as HTMLElement | null;
    const text = node.querySelector('.hp-text');
    if (fill) fill.style.width = `${(hp / enemy.maxHp) * 100}%`;
    if (text) text.textContent = `${hp} / ${enemy.maxHp}`;
  }

  /** 玩家挨打时的整屏反馈，强度随伤害提升。 */
  private playerHurt(loss: number): void {
    const weight = Math.min(1, loss / 20);
    fx.slam(centerOf(this.elPortrait), weight);
    // 定格一瞬，冲击才落得实。越重停得越久
    fx.hold(70 + weight * 110);

    for (const node of [this.elBar, document.querySelector('.battle')]) {
      if (!(node instanceof HTMLElement)) continue;
      node.style.setProperty('--hurt-weight', weight.toFixed(2));
      node.classList.remove('hurt-shock');
      void node.offsetWidth;
      node.classList.add('hurt-shock');
      setTimeout(() => node.classList.remove('hurt-shock'), 460);
    }
  }

  private nodeForCombatant(id: string): HTMLElement | null {
    if (id === 'player') return document.querySelector('.portrait');
    const index = Number(id.replace('enemy', ''));
    return document.querySelector(`.enemy[data-index="${index}"]`);
  }

  /** 敌人出手时报出这一击的名字。 */
  private castLabel(text: string, pos: { x: number; y: number }, variant = ''): void {
    const node = el('div', variant ? `cast-label ${variant}` : 'cast-label');
    node.textContent = text;
    node.style.left = `${pos.x}px`;
    node.style.top = `${pos.y}px`;
    this.root.append(node);
    setTimeout(() => node.remove(), 1100);
  }

  private floatNumber(pos: { x: number; y: number }, text: string, variant: string): void {
    const node = el('div', `float-num ${variant}`);
    node.textContent = text;
    node.style.left = `${pos.x}px`;
    node.style.top = `${pos.y}px`;
    this.root.append(node);
    setTimeout(() => node.remove(), 1000);
  }

  private showBanner(text: string, side: 'player' | 'enemy' = 'player'): void {
    this.elBanner.dataset.side = side;
    this.elBanner.textContent = text;
    this.elBanner.classList.remove('show');
    void this.elBanner.offsetWidth;
    this.elBanner.classList.add('show');
  }

  private pause(): void {
    openPause(this.root, this.pauseActions());
  }

  private pauseActions() {
    return {
      onResume: () => {},
      onMap: () => this.onExit('map'),
      onTitle: () => this.onExit('title'),
      mapLabel: this.exitCountsAsDefeat ? '结束本次战斗' : '返回地图',
      titleLabel: this.exitCountsAsDefeat ? '结束战斗并回到标题' : '回到标题',
      hint: this.exitCountsAsDefeat
        ? '离开当前战斗视为战败；之后可以消耗时砂重挑，或结束本局。'
        : undefined,
    };
  }

  destroy(): void {
    this.unbindPause?.();
    this.unbindSettings?.();
    window.clearTimeout(this.revealTimer);
    this.aim?.destroy();
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
  }
}

interface EchoOutput {
  damage: number;
  block: number;
  targetId: string | null;
}

/** 一次结算之后紧邻的效果事件，构成该条目本次的实际产出。 */
const EFFECT_TYPES = new Set(['damage', 'block', 'status', 'heal', 'energy', 'draw', 'reshuffle']);

function echoOutputs(events: CombatEvent[]): Map<number, EchoOutput> {
  const out = new Map<number, EchoOutput>();
  for (let i = 0; i < events.length; i++) {
    if (events[i]!.type !== 'resolve') continue;
    const acc: EchoOutput = { damage: 0, block: 0, targetId: null };
    for (let k = i + 1; k < events.length && EFFECT_TYPES.has(events[k]!.type); k++) {
      const e = events[k]!;
      if (e.type === 'damage') {
        acc.damage += Number(e.amount);
        if (!acc.targetId) acc.targetId = String(e.targetId);
      } else if (e.type === 'block') {
        acc.block += Number(e.amount);
      }
    }
    out.set(i, acc);
  }
  return out;
}

/** 装备触发后紧跟的一串效果事件，汇成一行读数。 */
function equipYield(events: CombatEvent[], from: number): string {
  let damage = 0;
  let block = 0;
  let heal = 0;
  const statuses: string[] = [];

  for (let k = from + 1; k < events.length && EFFECT_TYPES.has(events[k]!.type); k++) {
    const e = events[k]!;
    if (e.type === 'damage') damage += Number(e.amount);
    else if (e.type === 'block') block += Number(e.amount);
    else if (e.type === 'heal') heal += Number(e.amount);
    else if (e.type === 'status') {
      const id = String(e.status);
      statuses.push(`${STATUS_LABEL[id] ?? id} +${e.stacks}`);
    }
  }

  const parts: string[] = [];
  if (damage > 0) parts.push(`伤害 ${damage}`);
  if (block > 0) parts.push(`护甲 +${block}`);
  if (heal > 0) parts.push(`生命 +${heal}`);
  parts.push(...statuses);
  return parts.join('　');
}

/** 意图落地的效果先于其事件产出，起飞点回退到该串效果之前。 */
function intentLaunches(events: CombatEvent[]): Map<number, number> {
  const out = new Map<number, number>();
  for (let j = 0; j < events.length; j++) {
    if (events[j]!.type !== 'intentResolved') continue;
    let k = j - 1;
    while (k >= 0 && EFFECT_TYPES.has(events[k]!.type)) k -= 1;
    out.set(k + 1, Number(events[j]!.uid));
  }
  return out;
}

/** 位移失败时说明卡住在哪一步。 */
const MANIPULATE_FAIL: Record<string, string> = {
  rewind: '本回合的延后额度已用尽，或前方已经排满',
  push: '前方被占住，推不动',
  swap: '没有可以交换的目标',
  copy: '副本不能再被复制，或轨上没有空位',
  steal: '这个意图无法窃取',
  freeze: '目标已经没有结算次数可消耗',
  sustain: '这一格没有条目',
  rerecord: '这一格没有条目',
  evict: '这一格没有条目',
  preempt: '这一格没有意图',
};

const INTENT_GLYPH: Record<string, string> = {
  attack: '击',
  defend: '守',
  debuff: '蚀',
  buff: '增',
};

/** 意图的演出档位：攻向玩家、只留标记、收束回自身。 */
type IntentMode = 'strike' | 'mark' | 'gather';

const FLY_CLASS: Record<IntentMode, string> = {
  strike: 'launching',
  mark: 'marking',
  gather: 'converging',
};

const REACT_CLASS: Record<IntentMode, string> = {
  strike: 'striking',
  mark: 'casting',
  gather: 'fortifying',
};

const CAST_VARIANT: Record<IntentMode, string> = {
  strike: '',
  mark: 'hex',
  gather: 'calm',
};

const SLOT_GLYPH: Record<EquipSlot, string> = {
  weapon: '武',
  armor: '甲',
  trinket: '佩',
  core: '核',
};

const SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: '武器',
  armor: '护甲',
  trinket: '饰品',
  core: '核心',
};

/** 朝自己的收束，攻向玩家的按有没有伤害分强弱。 */
function intentModeOf(def: IntentDef | null): IntentMode {
  if (!def) return 'strike';
  if (intentAim(def) === 'self') return 'gather';
  return def.effects.some((e) => e.kind === 'damage') ? 'strike' : 'mark';
}

/** 敌人的招式一览：带牌库的读出剩余张数，其余列出脚本里会出现的意图。 */
function enemyDeckTip(enemy: EnemyState): HTMLElement | null {
  const pool = enemy.intentPool ?? [];
  const deck = enemy.intentDeck ?? [];

  const remaining = new Map<string, number>();
  for (const id of deck) remaining.set(id, (remaining.get(id) ?? 0) + 1);

  // left 为 -1 表示这个敌人不靠牌库出招，不读张数
  const rows = pool.length
    ? pool.map((item) => ({
        id: item.intentId,
        left: remaining.get(item.intentId) ?? 0,
        total: item.copies,
      }))
    : [...new Set(enemy.intentScript.map((o) => o.intentId))].map((id) => ({
        id,
        left: -1,
        total: 0,
      }));
  if (!rows.length) return null;

  const tip = el('div', 'enemy-tip');
  const total = pool.reduce((n, item) => n + item.copies, 0);
  tip.append(
    el(
      'div',
      'enemy-tip-head',
      pool.length ? `招式牌库　还剩 ${deck.length} / ${total} 张` : '这一战会用的招式',
    ),
  );

  for (const row of rows) {
    const def = safeIntentDef(row.id);
    const line = el('div', 'enemy-tip-row');
    line.dataset.kind = def?.kind ?? 'attack';
    if (row.left === 0) line.classList.add('exhausted');

    line.append(
      el('span', 'enemy-tip-glyph', INTENT_GLYPH[def?.kind ?? 'attack'] ?? '◈'),
      el('span', 'enemy-tip-name', def?.name ?? row.id),
      el('span', 'enemy-tip-text', def ? effectLabel(def.effects) : ''),
    );
    if (row.left >= 0) line.append(el('span', 'enemy-tip-left', `${row.left} / ${row.total}`));
    tip.append(line);
  }

  if (enemy.charge > 0) {
    tip.append(el('div', 'enemy-tip-foot', `敌轨被占满，蓄力 ${enemy.charge} 层等待落位`));
  }
  return tip;
}

function intentKindOf(entry: TrackEntry): string {
  if (entry.effects.some((e) => e.kind === 'damage')) return 'attack';
  if (entry.effects.some((e) => e.kind === 'block')) return 'defend';
  if (entry.effects.some((e) => e.kind === 'applyStatus')) return 'debuff';
  return 'buff';
}

function intentValueOf(entry: TrackEntry): string {
  const parts = previewYield(entry, 1);
  const damage = parts.find((part) => part.kind === 'damage');
  if (damage) return damage.hits > 1 ? `${damage.value}×${damage.hits}` : String(damage.value);
  const block = parts.find((part) => part.kind === 'block');
  if (block) return String(block.value);
  return '';
}


/** 悬浮卡的标题行：剩余回合与干预限制。 */
function intentTitle(state: CombatState, entry: TrackEntry, slot: number): string {
  const turns = C.TRACK_SLOTS - slot + 1;
  const flags: string[] = [];
  if (entry.unstealable) flags.push('不可窃取');

  const left = rewindsLeft(state, entry, 'enemy');
  if (entry.undelayable) flags.push('不可延后');
  else if (left > 0) flags.push(`还能延后 ${left} 次`);
  else if (delayBudgetLeft(state) <= 0) flags.push('本回合次数已用尽');
  else flags.push('这个意图不能再延后');

  return `${turns} 回合后落地　${flags.join('・')}`;
}

function intentTooltip(entry: TrackEntry): string {
  const parts: string[] = [];
  for (const effect of entry.effects) {
    const scaled = Math.floor((effect.amount + entry.snapshot.strength) * entry.snapshot.damageScale);
    if (effect.kind === 'damage') {
      const hits = effect.hits ?? 1;
      parts.push(hits > 1 ? `造成 ${scaled} 点伤害 ${hits} 次` : `造成 ${scaled} 点伤害`);
    } else if (effect.kind === 'block') {
      parts.push(`获得 ${effect.amount} 点护甲`);
    } else if (effect.kind === 'applyStatus' && effect.status) {
      parts.push(`施加 ${effect.amount} 层${STATUS_LABEL[effect.status] ?? effect.status}`);
    } else if (effect.kind === 'selfStatus' && effect.status) {
      parts.push(`自身获得 ${effect.amount} 层${STATUS_LABEL[effect.status] ?? effect.status}`);
    } else if (effect.kind === 'heal') {
      parts.push(`回复 ${effect.amount} 点生命`);
    } else if (effect.kind === 'createCard') {
      parts.push('向你的弃牌堆塞入一张诅咒');
    }
  }

  return parts.join('，') || '无直接效果';
}

/** 给状态角标挂一张说明卡。 */
function withTip(node: HTMLElement, head: string, body: string): HTMLElement {
  const tip = el('div', 'stat-tip');
  tip.append(el('div', 'stat-tip-head', head), el('div', 'stat-tip-body', body));
  node.append(tip);
  node.classList.add('has-tip');
  return node;
}

const TYPE_MARK: Record<string, { word: string; head: string; body: string }> = {
  weave: {
    word: '织',
    head: '织牌',
    body: '打出后留在时间轨上，之后每回合按格位强度重演，直到被挤出或结算次数耗尽。',
  },
  ignite: {
    word: '引',
    head: '引牌',
    body: '把轨上条目尚未兑现的回响一次性清算，效率六成，随后这些条目退场。不占轨位。',
  },
  disrupt: {
    word: '扰',
    head: '扰牌',
    body: '推移、冻结、复制轨上的条目，也能作用于敌方意图。瞬发，不占轨位。',
  },
};

/** 卡牌右上角的类别标记，直接写明是哪一类并附说明。 */
function typeMark(type: string, text = ''): HTMLElement {
  const info = TYPE_MARK[type];
  const mark = el('div', 'card-mark', info?.word ?? '');
  if (!info) return mark;

  const tip = el('div', 'stat-tip');
  tip.append(el('div', 'stat-tip-head', info.head), el('div', 'stat-tip-body', info.body));

  const hits = ALL_TERMS.filter((k) => text.includes(k.word));
  for (const hit of hits) {
    const row = el('div', 'keyword-row');
    row.append(el('span', 'keyword-name', hit.word), el('span', 'keyword-text', hit.text));
    tip.append(row);
  }

  mark.append(tip);
  mark.classList.add('has-tip');
  return mark;
}

function el(tag: string, className = '', text = ''): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function statusRow(statuses: Record<string, number | undefined>): HTMLElement {
  const row = el('div', 'status-row');
  for (const [id, n] of Object.entries(statuses)) {
    if (!n) continue;
    const term = STATUS_TERMS[id];
    const chip = el('div', 'status-chip');
    chip.dataset.id = id;
    chip.textContent = `${term?.word ?? id} ${n}`;
    if (term) withTip(chip, `${term.word} ${n}`, term.text);
    row.append(chip);
  }
  return row;
}

function centerOf(node: HTMLElement): { x: number; y: number } {
  const r = node.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function nameOfEntry(entry: TrackEntry, lane: Lane): string {
  const def = lane === 'enemy' ? safeIntentDef(entry.cardId) : safeCardDef(entry.cardId);
  return def?.name ?? entry.cardId;
}

function safeIntentDef(id: string) {
  try {
    return intentDef(id);
  } catch {
    return null;
  }
}

/** 用短语概括一组效果会做什么，供格位与出手提示共用。 */
function effectLabel(effects: Effect[]): string {
  const parts: string[] = [];
  for (const effect of effects) {
    if (effect.kind === 'damage') {
      parts.push((effect.hits ?? 1) > 1 ? '多段伤害' : '造成伤害');
    } else if (effect.kind === 'applyStatus' && effect.status) {
      parts.push(`施加${STATUS_LABEL[effect.status] ?? effect.status} ${effect.amount}`);
    } else if (effect.kind === 'block') {
      parts.push(`获得护甲 ${effect.amount}`);
    } else if (effect.kind === 'selfStatus' && effect.status) {
      parts.push(`自身${STATUS_LABEL[effect.status] ?? effect.status} ${effect.amount}`);
    } else if (effect.kind === 'heal') {
      parts.push(`回复 ${effect.amount}`);
    } else if (effect.kind === 'createCard') {
      parts.push('塞入诅咒');
    }
  }
  return parts.join('・');
}

function intentEffectLabel(entry: TrackEntry): string {
  return effectLabel(entry.effects);
}

function safeCardDef(id: string) {
  try {
    return cardDef(id);
  } catch {
    return null;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms * settings().speed));
}
