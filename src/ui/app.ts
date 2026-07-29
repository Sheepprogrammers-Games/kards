/** 局内流程调度。按进程阶段切换场景，并负责存档。 */

import { canUpgrade, createCombat, effectsOf, payoffOf, upgradedCost } from '@engine/combat';
import { nodeAt } from '@engine/map';
import { nextInt, seedFrom, shuffle } from '@engine/rng';
import {
  addCard,
  addRelic,
  completeNode,
  createRun,
  damage,
  enterNode,
  gainGold,
  heal,
  removeCard,
  upgradeCard,
  type RunState,
} from '@engine/run';
import { allCards } from '@engine/registry';
import { ENEMIES } from '@content/enemies';
import { EVENTS, type EventOutcome } from '@content/events';
import { TUTORIALS, type TutorialStage } from '@content/tutorials';
import { RELICS, collectModifiers } from '@content/relics';
import { BattleScene } from './battle';
import {
  el,
  renderEvent,
  renderGameOver,
  renderMap,
  renderReward,
  renderRunBar,
  renderStaticCard,
  type EventChoice,
} from './screens';
import { sfx } from '@audio/index';
import { music } from '@audio/music';
import { confirmAction } from './confirm';
import { bindPauseKey, openPause } from './pause';
import { toast } from './toast';
import { cardDef } from '@engine/registry';
import { renderTitle } from './title';

const SAVE_KEY = 'echoes.run';

export class App {
  private run: RunState;
  private battle: BattleScene | null = null;
  private atTitle = true;
  private shopSold = new Set<string>();
  private shopNode: string | null = null;
  private unbindPause: (() => void) | null = null;

  constructor(private root: HTMLElement, run?: RunState) {
    this.run = run ?? this.freshRun();
    this.showTitle(Boolean(run));
  }

  private showTitle(hasSave: boolean): void {
    this.battle?.destroy();
    this.battle = null;
    this.unbindPause?.();
    this.unbindPause = null;
    this.atTitle = true;
    this.root.innerHTML = '';
    music.play('title');
    this.root.append(
      renderTitle({
        onContinue: hasSave
          ? () => {
              this.atTitle = false;
              this.render();
            }
          : undefined,
        onNew: () => {
          localStorage.removeItem(SAVE_KEY);
          this.atTitle = false;
          this.setRun(this.freshRun());
        },
        onReset: () => this.showTitle(false),
      }),
    );
  }

  private freshRun(): RunState {
    const seedText = String(Date.now());
    const holder = { rng: seedFrom(seedText) };
    return createRun({ seedText, deck: buildStarterDeck(holder), maxHp: 70 });
  }

  private setRun(next: RunState): void {
    this.run = next;
    this.save();
    this.render();
  }

  private save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.run));
    } catch {}
  }

  private render(): void {
    if (this.atTitle) return;
    this.battle?.destroy();
    this.battle = null;
    this.unbindPause?.();
    this.unbindPause = null;
    this.root.innerHTML = '';

    switch (this.run.phase) {
      case 'map': {
        music.play(`map-act${Math.min(3, this.run.act)}` as 'map-act1');
        const screen = renderMap(this.run, (id) => this.setRun(enterNode(this.run, id)), this.root);
        screen.append(this.renderTrainingBar());
        this.root.append(screen);
        this.mountMenu();
        break;
      }
      case 'combat':
        this.startCombat();
        break;
      case 'event':
        music.play('event');
        this.showEvent();
        this.mountMenu();
        break;
      case 'shop':
        music.play('shop');
        this.showShop();
        this.mountMenu();
        break;
      case 'rest':
        music.play('rest');
        this.showRest();
        this.mountMenu();
        break;
      case 'gameOver':
        this.root.append(renderMap(this.run, () => {}));
        this.root.append(
          renderGameOver(this.run, () => {
            localStorage.removeItem(SAVE_KEY);
            this.showTitle(false);
          }),
        );
        break;
    }
  }

  /** 非战斗界面的菜单入口。Esc 与右上角按钮都通向暂停面板。 */
  private mountMenu(): void {
    const actions = {
      onResume: () => {},
      onTitle: () => this.showTitle(true),
    };

    const button = el('button', 'screen-menu', '☰');
    button.title = '菜单';
    button.addEventListener('click', () => {
      sfx.pick();
      openPause(this.root, actions);
    });
    this.root.append(button);
    this.unbindPause = bindPauseKey(this.root, actions);
  }

  /** 地图底部的训练场入口，随时可以进去重打。 */
  private renderTrainingBar(): HTMLElement {
    const bar = el('div', 'training-bar');
    bar.append(el('div', 'training-title', '训练场'));

    const row = el('div', 'training-row');
    for (const stage of TUTORIALS) {
      const item = el('button', 'training-item');
      item.append(
        el('div', 'training-name', stage.name),
        el('div', 'training-goal', stage.goal),
      );
      item.addEventListener('click', () => this.startTutorial(stage));
      row.append(item);
    }
    bar.append(row);
    return bar;
  }

  /** 训练关不影响本局进度，打完直接回地图。 */
  private startTutorial(stage: TutorialStage): void {
    sfx.pick();
    music.play('battle');
    this.battle?.destroy();
    this.battle = null;
    this.root.innerHTML = '';

    const state = createCombat({
      seed: 20260101,
      deck: stage.deck.map((defId) => ({ defId, upgraded: false })),
      maxHp: stage.maxHp,
      enemies: [stage.enemy],
    });

    const back = () => this.render();
    this.battle = new BattleScene(this.root, state, back, back);

    const brief = el('div', 'overlay tip-overlay');
    const card = el('div', 'tip-card');
    card.append(
      el('div', 'tip-title', stage.name),
      el('div', 'tip-body', stage.brief),
    );
    const start = el('button', 'ghost-button', '开始');
    start.addEventListener('click', () => brief.remove());
    card.append(start);
    brief.append(card);
    this.root.append(brief);
  }

  /** 节点类型决定敌人组成与难度。 */
  private startCombat(): void {
    const node = this.run.currentNode ? nodeAt(this.run.map, this.run.currentNode) : null;
    const kind = node?.kind ?? 'combat';
    const tier = kind === 'boss' ? 'boss' : kind === 'elite' ? 'elite' : 'minion';
    music.play(
      tier === 'boss'
        ? (`boss-act${Math.min(3, this.run.act)}` as 'boss-act1')
        : tier === 'elite'
          ? 'elite'
          : 'battle',
    );
    const pool = ENEMIES.filter((e) => e.tier === tier && e.act.includes(this.run.act));
    const holder = { rng: this.run.rng + this.run.cleared * 7919 };

    const count = tier === 'minion' && this.run.cleared > 0 && nextInt(holder, 100) < 40 ? 2 : 1;
    const picked = shuffle(holder, pool).slice(0, Math.min(count, pool.length));
    // 开局第一场压低血量，让玩家先看懂机制
    const scale = (1 + (this.run.act - 1) * 0.35) * (this.run.cleared === 0 ? 0.62 : 1);

    const state = createCombat({
      seed: holder.rng,
      deck: this.run.deck,
      maxHp: this.run.maxHp,
      hp: this.run.hp,
      relics: this.run.relics,
      mods: collectModifiers(this.run.relics),
      enemies: picked.map((def) => ({
        defId: def.id,
        name: def.name,
        maxHp: Math.round(def.maxHp[0] * scale),
        intentsPerTurn: def.intentsPerTurn,
        intentScript: def.intentScript,
        phases: def.phases,
      })),
    });

    this.battle = new BattleScene(
      this.root,
      state,
      (result, endHp) => {
        if (result === 'victory') {
          music.sting('victory', `map-act${Math.min(3, this.run.act)}` as 'map-act1');
          const survived = { ...this.run, hp: Math.max(1, endHp) };
          this.showReward(survived, kind);
        } else {
          music.sting('defeat');
          this.setRun({ ...this.run, hp: 0, phase: 'gameOver', result: 'defeat' });
        }
      },
      (to) => {
        if (to === 'title') this.showTitle(true);
        else this.setRun({ ...this.run, currentNode: this.run.currentNode, phase: 'map' });
      },
    );
  }

  private showReward(run: RunState, kind: string): void {
    const holder = { rng: run.rng + run.cleared * 104729 };
    const pool = allCards().filter((c) => c.rarity !== 'starter' && c.rarity !== 'curse');
    const offer = shuffle(holder, pool).slice(0, 3).map((c) => c.id);
    const gold = kind === 'elite' ? 42 : kind === 'boss' ? 90 : 24;

    const owned = new Set(run.relics);
    const relicPool = RELICS.filter((r) => !owned.has(r.id));
    const relic =
      kind === 'elite' || kind === 'boss'
        ? shuffle(holder, relicPool)[0]?.id
        : undefined;

    let current = gainGold(run, gold);
    const finish = () => this.setRun(completeNode(current));

    this.root.append(
      renderReward(
        { cards: offer, gold, relic },
        (defId) => {
          confirmAction(this.root, {
            title: '织入牌组',
            body: `「${cardDef(defId).name}」将加入牌组，本次奖励只能取一张。`,
            confirmText: '就要这张',
            preview: bigCard(defId),
            onConfirm: () => {
              current = addCard(current, defId);
              finish();
            },
          });
        },
        (relicId) => {
          current = addRelic(current, relicId);
        },
        finish,
      ),
    );
  }

  private showEvent(): void {
    const holder = { rng: this.run.rng + this.run.cleared * 31337 };
    const def = shuffle(holder, EVENTS)[0]!;

    const choices: EventChoice[] = def.options.map((option) => ({
      label: option.label,
      desc: option.desc,
      apply: () => {
        let next = this.run;
        for (const outcome of option.outcomes) next = applyOutcome(next, outcome, holder);
        this.setRun(next.result === 'defeat' ? next : completeNode(next));
      },
    }));

    this.root.append(renderMap(this.run, () => {}));
    this.root.append(renderEvent(def.title, def.body, choices));
  }

  private showRest(): void {
    const choices: EventChoice[] = [
      {
        label: '休息',
        desc: '回复最大生命的 30%。',
        apply: () => {
          const amount = Math.round(this.run.maxHp * 0.3);
          confirmAction(this.root, {
            title: '在此休息',
            body: `回复 ${amount} 点生命，当前 ${this.run.hp}/${this.run.maxHp}。本次篝火就此结束，不能再重录。`,
            confirmText: `休息 · 回复 ${amount}`,
            onConfirm: () => this.setRun(completeNode(heal(this.run, amount))),
            onCancel: () => this.render(),
          });
        },
      },
      {
        label: '重录',
        desc: '把牌组中的一张牌永久强化。',
        apply: () => this.showUpgrade(),
      },
    ];
    this.root.append(renderMap(this.run, () => {}));
    this.root.append(
      renderEvent(
        '篝火',
        '齿轮的噪声在这里低下去。你可以合眼片刻，也可以趁着安静把某一张牌重新织一遍。',
        choices,
      ),
    );
  }

  private showUpgrade(): void {
    this.root.innerHTML = '';
    this.root.append(renderMap(this.run, () => {}));

    const overlay = el('div', 'overlay');
    const panel = el('div', 'panel');
    panel.append(el('h2', '', '重录'));
    panel.append(el('p', '', '点击一张牌，查看重录前后的对照。'));

    const row = el('div', 'card-row');
    let offered = 0;
    this.run.deck.forEach((card, index) => {
      if (card.upgraded) return;
      // 强化后毫无变化的牌不摆上来，免得白白浪费一次重录
      if (!canUpgrade(cardDef(card.defId))) return;
      offered += 1;

      const node = renderStaticCard(card.defId, false);
      node.addEventListener('click', () => {
        confirmAction(this.root, {
          title: '重录这张牌',
          body: '本次篝火就此结束，不能再休息。',
          confirmText: '就录这张',
          preview: upgradePreview(card.defId),
          onConfirm: () => {
            sfx.play(card.defId);
            const next = structuredClone(this.run);
            const target = next.deck[index];
            if (target) target.upgraded = true;
            this.setRun(completeNode(next));
          },
        });
      });
      row.append(node);
    });

    if (!offered) {
      panel.append(el('p', '', '牌组里已经没有可以重录的牌了。'));
    }
    panel.append(row);
    overlay.append(panel);
    this.root.append(overlay);
  }

  private showShop(): void {
    // 换了商店就重置售罄记录
    if (this.shopNode !== this.run.currentNode) {
      this.shopNode = this.run.currentNode;
      this.shopSold.clear();
    }

    const holder = { rng: this.run.rng + this.run.cleared * 65537 };
    const pool = allCards().filter((c) => c.rarity !== 'starter' && c.rarity !== 'curse');
    const stock = shuffle(holder, pool).slice(0, 5);

    this.root.innerHTML = '';
    const screen = el('div', 'screen');
    screen.append(el('div', 'screen-title', '残市'));
    screen.append(el('div', 'screen-sub', '有人在这里用还没发生的事换已经发生的事'));
    screen.append(renderRunBar(this.run, this.root));

    const row = el('div', 'card-row');
    for (const def of stock) {
      const price = def.rarity === 'rare' ? 130 : def.rarity === 'uncommon' ? 85 : 55;
      const sold = this.shopSold.has(def.id);
      const wrap = el('div', 'shop-item');
      if (sold) wrap.classList.add('sold');
      const node = renderStaticCard(def.id);
      const tag = el('div', 'screen-sub', sold ? '已售出' : `◈ ${price}`);
      tag.style.marginTop = '8px';
      wrap.append(node, tag);
      if (sold) {
        row.append(wrap);
        continue;
      }
      node.addEventListener('click', () => {
        if (this.run.gold < price) {
          toast(this.root, `时砂不足，还差 ${price - this.run.gold} 枚`);
          sfx.blocked();
          return;
        }
        confirmAction(this.root, {
          title: '买下这张牌',
          body: `花费 ${price} 枚时砂，「${def.name}」将永久加入牌组。剩余 ${this.run.gold - price} 枚。`,
          confirmText: `买下 · ◈${price}`,
          preview: bigCard(def.id),
          onConfirm: () => {
            sfx.play(def.id);
            this.shopSold.add(def.id);
            this.setRun(addCard(gainGold(this.run, -price), def.id));
            toast(this.root, `${def.name} 已加入牌组`);
          },
        });
      });
      row.append(wrap);
    }
    screen.append(row);

    const leave = el('button', 'ghost-button', '离开');
    leave.addEventListener('click', () => this.setRun(completeNode(this.run)));
    screen.append(leave);
    this.root.append(screen);
  }
}

/** 确认框里的大图预览。 */
function bigCard(defId: string, upgraded = false): HTMLElement {
  const box = el('div', 'big-card');
  box.append(renderStaticCard(defId, upgraded));
  return box;
}

const EFFECT_NAME: Record<string, string> = {
  damage: '伤害',
  block: '护甲',
  heal: '回复',
  applyStatus: '状态层数',
  selfStatus: '自身状态',
};

/** 并排展示重录前后的卡面，并逐条列出变化。 */
function upgradePreview(defId: string): HTMLElement {
  const box = el('div', 'upgrade-preview');

  const before = el('div', 'upgrade-side');
  before.append(el('div', 'upgrade-label', '当前'), renderStaticCard(defId, false));

  const after = el('div', 'upgrade-side');
  after.append(el('div', 'upgrade-label up', '重录后'), renderStaticCard(defId, true));

  box.append(before, el('div', 'upgrade-arrow', '→'), after, upgradeDiffRow(defId));
  return box;
}

/** 强化带来的变化，数值不变的牌走降费。 */
function upgradeDiffRow(defId: string): HTMLElement {
  const def = cardDef(defId);
  const rows = el('div', 'upgrade-diff');
  const upgraded = effectsOf(def, true);

  const addRow = (name: string, from: number, to: number) => {
    const row = el('div', 'upgrade-diff-row');
    row.append(
      el('span', 'upgrade-diff-name', name),
      el('span', 'upgrade-diff-from', String(from)),
      el('span', 'upgrade-diff-arrow', '→'),
      el('span', 'upgrade-diff-to', String(to)),
    );
    rows.append(row);
  };

  def.effects.forEach((effect, i) => {
    const next = upgraded[i];
    if (!next || next.amount === effect.amount) return;
    addRow(EFFECT_NAME[effect.kind] ?? effect.kind, effect.amount, next.amount);
  });

  const boostedPayoff = payoffOf(def, true) ?? [];
  (def.payoff ?? []).forEach((effect, i) => {
    const next = boostedPayoff[i];
    if (!next || next.amount === effect.amount) return;
    addRow(`赌注 ${EFFECT_NAME[effect.kind] ?? effect.kind}`, effect.amount, next.amount);
  });

  const cost = upgradedCost(def);
  if (cost !== def.cost) addRow('费用', def.cost, cost);

  return rows;
}

function applyOutcome(run: RunState, outcome: EventOutcome, holder: { rng: number }): RunState {
  switch (outcome.kind) {
    case 'heal':
      return heal(run, outcome.amount);
    case 'damage':
      return damage(run, outcome.amount);
    case 'gold':
      return gainGold(run, outcome.amount);
    case 'maxHp': {
      const next = structuredClone(run);
      next.maxHp = Math.max(10, next.maxHp + outcome.amount);
      next.hp = Math.min(next.hp, next.maxHp);
      return next;
    }
    case 'addCard': {
      const pool =
        outcome.pool === 'curse'
          ? allCards().filter((c) => c.rarity === 'curse')
          : allCards().filter((c) => c.rarity !== 'starter' && c.rarity !== 'curse');
      const picked = shuffle(holder, pool)[0];
      return picked ? addCard(run, picked.id) : run;
    }
    case 'addNamedCard':
      return addCard(run, outcome.cardId);
    case 'removeCard':
      return run.deck.length > 1 ? removeCard(run, nextInt(holder, run.deck.length)) : run;
    case 'removeCurse': {
      const index = run.deck.findIndex((card) => cardDef(card.defId).rarity === 'curse');
      return index >= 0 && run.deck.length > 1 ? removeCard(run, index) : run;
    }
    case 'upgradeCard': {
      const candidates: number[] = [];
      run.deck.forEach((card, index) => {
        if (!card.upgraded) candidates.push(index);
      });
      if (!candidates.length) return run;
      return upgradeCard(run, candidates[nextInt(holder, candidates.length)]!);
    }
    case 'addRelic': {
      const owned = new Set(run.relics);
      const picked = shuffle(holder, RELICS.filter((r) => !owned.has(r.id)))[0];
      return picked ? addRelic(run, picked.id) : run;
    }
    case 'loseRelic': {
      if (!run.relics.length) return run;
      const next = structuredClone(run);
      next.relics.splice(nextInt(holder, next.relics.length), 1);
      return next;
    }
    case 'goldShare':
      return gainGold(run, Math.round(run.gold * outcome.ratio));
    case 'hpShare': {
      const amount = Math.floor(run.hp * Math.abs(outcome.ratio));
      return outcome.ratio < 0 ? damage(run, amount) : heal(run, amount);
    }
    case 'chance': {
      const branch = nextInt(holder, 100) < outcome.percent ? outcome.hit : outcome.miss;
      let next = run;
      for (const step of branch) next = applyOutcome(next, step, holder);
      return next;
    }
    case 'nothing':
      return run;
  }
}

/**
 * 每局的起手牌组。骨架固定保证基本运作，其余按种子抽取，
 * 因此同一个角色每次开局的手感都不一样。
 */
export function buildStarterDeck(rng: { rng: number }): string[] {
  const pool = allCards();
  const byId = (id: string) => pool.some((c) => c.id === id);
  const pick = (ids: string[], n: number) => shuffle(rng, ids.filter(byId)).slice(0, n);

  const core = ['threadbind', 'threadbind', 'threadbind', 'hourguard', 'hourguard', 'hourguard'];

  const igniteSeeds = ['collapse', 'amber-conduit', 'draw-the-arc', 'lens-of-noon', 'ember-tap'];
  const disruptSeeds = ['shove', 'foresight', 'sidestep-gear', 'hold-fast', 'skip-tooth'];
  const flexSeeds = pool
    .filter((c) => c.rarity === 'common' && c.type === 'weave')
    .map((c) => c.id);

  return [
    ...core,
    ...pick(igniteSeeds, 2),
    ...pick(disruptSeeds, 2),
    ...pick(flexSeeds, 2),
  ];
}

export const STARTER = [
  'threadbind',
  'threadbind',
  'threadbind',
  'threadbind',
  'hourguard',
  'hourguard',
  'hourguard',
  'hourguard',
  'collapse',
  'collapse',
  'shove',
  'foresight',
];

export function loadSavedRun(): RunState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as RunState) : null;
  } catch {
    return null;
  }
}
