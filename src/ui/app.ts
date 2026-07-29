/** 局内流程调度。按进程阶段切换场景，并负责存档。 */

import { canUpgrade, createCombat, effectsOf, payoffOf, upgradedCost } from '@engine/combat';
import { C } from '@engine/constants';
import { collectEquipModifiers, equipmentDef, equippedIds, mergeModifiers } from '@engine/equipment';
import { nodeAt, type NodeKind } from '@engine/map';
import { nextInt, seedFrom, shuffle, type RngHolder } from '@engine/rng';
import {
  abandonRun,
  addCard,
  addRelic,
  canRetry,
  completeNode,
  createRun,
  damage,
  defeatRun,
  emptyLoadout,
  enterNode,
  equipItem,
  gainGold,
  heal,
  removeCard,
  retryNode,
  rollRewards,
  upgradeCard,
  type DeckCard,
  type RunState,
} from '@engine/run';
import { rerollPrice, rollShop } from '@engine/shop';
import { allCards } from '@engine/registry';
import type { EquipSlot, RewardOffer, ShopItem } from '@engine/types';
import { ENEMIES } from '@content/enemies';
import { EQUIPMENT } from '@content/equipment';
import { EVENTS, type EventOption, type EventOutcome } from '@content/events';
import { TUTORIALS, type TutorialStage } from '@content/tutorials';
import { RELICS, collectModifiers } from '@content/relics';
import { art } from './assets';
import { BattleScene } from './battle';
import { recordSeen } from './codex';
import {
  el,
  renderDefeat,
  renderEquipCard,
  renderEvent,
  renderGameOver,
  renderMap,
  renderReward,
  renderShop,
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

const SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: '武器',
  armor: '护甲',
  trinket: '饰品',
  core: '机芯',
};

export class App {
  private run: RunState;
  private battle: BattleScene | null = null;
  private atTitle = true;
  private shopBought = new Set<string>();
  private shopRerolls = 0;
  private shopNode: string | null = null;
  private unbindPause: (() => void) | null = null;
  /** 当前这场战斗来自哪只宝箱怪，胜负两条出口都按它调整。 */
  private chestEnemy: string | null = null;

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
    recordSeen('cards', next.deck.map((card) => card.defId));
    recordSeen('relics', next.relics);
    recordSeen('equipment', equippedIds(next.equipment));
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
      case 'defeated':
        this.showDefeat();
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
    this.unbindPause?.();
    this.unbindPause = null;

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

  /** 遗物与装备的修正叠加在一起，装备在后，系数表由装备覆盖。 */
  private combatModifiers() {
    return mergeModifiers(
      collectModifiers(this.run.relics),
      collectEquipModifiers(this.run.equipment),
    );
  }

  /** 节点类型决定敌人组成与难度。 */
  private startCombat(): void {
    this.chestEnemy = null;
    const node = this.run.currentNode ? nodeAt(this.run.map, this.run.currentNode) : null;
    const kind: NodeKind = node?.kind ?? 'combat';
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

    this.enterBattle(
      picked.map((def) => ({ defId: def.id, hpScale: scale })),
      holder.rng,
      kind,
    );
  }

  /** 宝箱怪。先演一段箱子自己动起来的预兆，掀开才进战斗。 */
  private startChestBattle(enemyId: string, seed: number): void {
    this.chestEnemy = enemyId;
    this.root.innerHTML = '';
    this.root.append(renderMap(this.run, () => {}));

    const overlay = el('div', 'overlay chest-omen-overlay');
    const card = el('div', 'chest-omen');
    card.append(
      el('div', 'chest-omen-glyph', '❑'),
      el('div', 'chest-omen-title', '箱子动了'),
      el(
        'div',
        'chest-omen-body',
        '扣舌自己弹开一格，又慢慢扣回原位。木头里的东西换了个更舒服的姿势，' +
          '像是终于等到愿意伸手的人。',
      ),
    );

    const open = el('button', 'title-button primary', '掀开');
    open.addEventListener('click', () => {
      sfx.pick();
      overlay.remove();
      music.play('elite');
      // 战斗自带暂停入口，先撤掉幕间界面绑的那一个
      this.unbindPause?.();
      this.unbindPause = null;
      this.root.innerHTML = '';
      this.enterBattle(
        [{ defId: enemyId, hpScale: 1 + (this.run.act - 1) * 0.35 }],
        seed,
        'combat',
        true,
      );
    });

    card.append(open);
    overlay.append(card);
    this.root.append(overlay);
    this.mountMenu();
  }

  /** 宝箱怪的战利品按精英规格发放，再多掷一项不重样的。 */
  private chestRewards(run: RunState): RewardOffer[] {
    const offers = rollRewards(run, 'elite');
    const taken = new Set(offers.map((offer) => offer.kind));
    for (const offer of rollRewards({ ...run, rng: (run.rng + 0x5f37) | 0 }, 'combat')) {
      if (taken.has(offer.kind)) continue;
      offers.push(offer);
      break;
    }
    return offers;
  }

  /** 按敌人定义组装一场战斗，并接上胜负两条出口。 */
  private enterBattle(
    picks: { defId: string; hpScale: number }[],
    seed: number,
    kind: NodeKind,
    chest = false,
  ): void {
    const defs = picks
      .map((pick) => ({ def: ENEMIES.find((e) => e.id === pick.defId), scale: pick.hpScale }))
      .filter((entry): entry is { def: (typeof ENEMIES)[number]; scale: number } => Boolean(entry.def));

    recordSeen('enemies', defs.map((entry) => entry.def.id));

    const state = createCombat({
      seed,
      deck: this.run.deck,
      maxHp: this.run.maxHp,
      hp: this.run.hp,
      relics: this.run.relics,
      equipment: equippedIds(this.run.equipment),
      mods: this.combatModifiers(),
      enemies: defs.map(({ def, scale }) => ({
        defId: def.id,
        name: def.name,
        maxHp: Math.round(def.maxHp[0] * scale),
        intentsPerTurn: def.intentsPerTurn,
        intentScript: def.intentScript,
        phases: def.phases,
        startingStatuses: def.startingStatuses,
        initiative: def.initiative,
        deck: def.deck,
      })),
    });

    this.battle = new BattleScene(
      this.root,
      state,
      (result, endHp) => {
        if (result === 'victory') {
          music.sting('victory', `map-act${Math.min(3, this.run.act)}` as 'map-act1');
          const survived = { ...this.run, hp: Math.max(1, endHp) };
          this.chestEnemy = null;
          this.showReward(survived, kind, chest ? this.chestRewards(survived) : undefined);
        } else {
          music.sting('defeat');
          this.setRun(defeatRun(this.run));
        }
      },
      (to) => {
        if (to === 'title') this.showTitle(true);
        else this.setRun({ ...this.run, phase: 'map' });
      },
    );
  }

  /**
   * 战斗奖励。每一项单独领取，领完才放行；时砂与回血在点走的那一刻入账，
   * 没点走的在离开时补发。
   */
  private showReward(run: RunState, kind: NodeKind, rolled?: RewardOffer[]): void {
    const offers = rolled ?? rollRewards(run, kind);

    this.run = run;

    const pending = new Map<RewardOffer, () => void>();
    for (const offer of offers) {
      const amount = offer.amount ?? 0;
      if (offer.kind === 'gold') {
        pending.set(offer, () => {
          this.run = gainGold(this.run, amount);
        });
      } else if (offer.kind === 'heal') {
        pending.set(offer, () => {
          this.run = heal(this.run, amount);
        });
      }
    }

    const finish = () => {
      for (const grant of pending.values()) grant();
      pending.clear();
      this.setRun(completeNode(this.run));
    };

    // 战斗场景留在底下不重绘，奖励面板直接压上去
    this.root.append(
      renderReward(offers, {
        onPickCard: (defId, claim) => {
          confirmAction(this.root, {
            title: '织入牌组',
            body: `「${cardDef(defId).name}」将加入牌组，同一份奖励只能取一张。`,
            confirmText: '就要这张',
            preview: bigCard(defId),
            onConfirm: () => {
              this.run = addCard(this.run, defId);
              recordSeen('cards', [defId]);
              sfx.play(defId);
              claim();
            },
          });
        },
        onPickRelic: (relicId, claim) => {
          const def = RELICS.find((r) => r.id === relicId);
          confirmAction(this.root, {
            title: '收下遗物',
            body: `「${def?.name ?? relicId}」将一直跟着你，直到本局结束。`,
            confirmText: '收下',
            preview: bigRelic(relicId),
            onConfirm: () => {
              this.run = addRelic(this.run, relicId);
              recordSeen('relics', [relicId]);
              sfx.play('relic');
              toast(this.root, `${def?.name ?? relicId} 已收入`);
              claim();
            },
          });
        },
        onPickEquipment: (equipId, claim) => {
          this.confirmEquip(equipId, {
            title: '穿上装备',
            confirmText: `装备 · ${equipmentDef(equipId).name}`,
            onConfirm: () => {
              this.wearEquipment(equipId);
              claim();
            },
          });
        },
        onRemoveCard: (claim) => {
          this.pickFromDeck({
            title: '洗去一张牌',
            body: '选中的牌永久离开牌组。',
            mode: 'remove',
            confirmText: '洗掉这张',
            accepts: () => this.run.deck.length > 1,
            onPick: (index) => {
              this.run = removeCard(this.run, index);
              toast(this.root, '那张牌不再回来');
              claim();
            },
          });
        },
        onUpgradeCard: (claim) => {
          this.pickFromDeck({
            title: '重录一张牌',
            body: '卡面下方是重录前后的数值对照。选中的牌永久强化。',
            mode: 'upgrade',
            confirmText: '就录这张',
            empty: '牌组里已经没有可以重录的牌了。',
            accepts: (card) => !card.upgraded && canUpgrade(cardDef(card.defId)),
            onPick: (index) => {
              this.run = upgradeCard(this.run, index);
              toast(this.root, '织法已经改写');
              claim();
            },
          });
        },
        onSimple: (offer, claim) => {
          pending.get(offer)?.();
          pending.delete(offer);
          this.claimBurst(offer);
          claim();
        },
        onDone: finish,
      }),
    );
  }

  /** 直给奖励的领取演出。数值从中心浮起，光环扩散后自行散去。 */
  private claimBurst(offer: RewardOffer): void {
    const layer = el('div', 'claim-burst');
    layer.dataset.tone = offer.kind;

    const core = el('div', 'claim-burst-core');
    core.append(el('div', 'claim-burst-ring'));

    if (offer.kind === 'gold') {
      core.append(
        el('div', 'claim-burst-glyph', '◈'),
        el('div', 'claim-burst-value', `+${offer.amount ?? 0}`),
        el('div', 'claim-burst-note', '时砂入账'),
      );
      sfx.pick();
    } else if (offer.kind === 'heal') {
      core.append(
        el('div', 'claim-burst-glyph', '♥'),
        el('div', 'claim-burst-value', `+${offer.amount ?? 0}`),
        el('div', 'claim-burst-note', '伤口收拢'),
      );
      sfx.play('heal');
    } else {
      core.append(
        el('div', 'claim-burst-glyph', '◌'),
        el('div', 'claim-burst-value', '—'),
        el('div', 'claim-burst-note', '余烬散得很干净'),
      );
      sfx.blocked();
    }

    layer.append(core);
    this.root.append(layer);
    setTimeout(() => layer.remove(), 1150);
  }

  /** 同槽位已经有装备时提示会顶掉哪一件。 */
  private replaceHint(equipId: string): string {
    const def = equipmentDef(equipId);
    const slot = SLOT_LABEL[def.slot];
    const worn = this.run.equipment[def.slot];
    if (!worn || worn === equipId) return `「${def.name}」将占用空着的${slot}槽。`;
    return (
      `${slot}槽正用着「${equipmentDef(worn).name}」。` +
      `换上「${def.name}」会把它顶下来，顶掉的那件就此丢弃。`
    );
  }

  /** 装备到手前的抉择。同槽有装备时并排摆出两件，让玩家决定换还是不换。 */
  private confirmEquip(
    equipId: string,
    opts: { title: string; confirmText: string; lead?: string; onConfirm: () => void },
  ): void {
    const def = equipmentDef(equipId);
    const worn = this.run.equipment[def.slot];
    const swapping = Boolean(worn) && worn !== equipId;

    confirmAction(this.root, {
      title: opts.title,
      body: (opts.lead ? `${opts.lead} ` : '') + this.replaceHint(equipId),
      confirmText: opts.confirmText,
      cancelText: swapping ? '不换' : '再想想',
      preview: swapping ? equipSwapPreview(worn!, equipId) : bigEquip(equipId),
      onConfirm: opts.onConfirm,
    });
  }

  /** 穿上装备并提示被顶掉的那一件。 */
  private wearEquipment(equipId: string): void {
    const result = equipItem(this.run, equipId);
    this.run = result.run;
    recordSeen('equipment', [equipId]);
    sfx.play('relic');
    if (result.displaced) {
      toast(this.root, `${equipmentDef(result.displaced).name} 已被换下`);
    } else {
      toast(this.root, `${equipmentDef(equipId).name} 已装备`);
    }
  }

  /**
   * 牌组网格。可选的牌铺成大图，滚动查看，重录模式下每张牌带前后数值对照。
   * 点中一张先进确认，确认后才落到 onPick。
   */
  private pickFromDeck(opts: DeckPickOptions): void {
    const overlay = el('div', 'overlay deck-pick-overlay');
    const panel = el('div', 'panel deck-pick-panel has-close');
    panel.append(el('h2', '', opts.title), el('p', '', opts.body));

    const close = () => {
      overlay.remove();
      opts.onCancel?.();
    };

    const grid = el('div', 'deck-pick-grid');
    let offered = 0;

    this.run.deck.forEach((card, index) => {
      if (!opts.accepts(card)) return;
      offered += 1;

      const cell = el('div', 'deck-pick-cell');
      cell.append(renderStaticCard(card.defId, card.upgraded));
      if (opts.mode === 'upgrade') cell.append(upgradeDiffRow(card.defId, 'deck-pick-diff'));

      cell.addEventListener('click', () => {
        sfx.play(card.defId);
        confirmAction(this.root, {
          title: opts.title,
          body: opts.body,
          confirmText: opts.confirmText,
          preview:
            opts.mode === 'upgrade'
              ? upgradePreview(card.defId)
              : bigCard(card.defId, card.upgraded),
          onConfirm: () => {
            overlay.remove();
            opts.onPick(index);
          },
        });
      });
      grid.append(cell);
    });

    panel.append(
      el('div', 'deck-pick-count', `牌组 ${this.run.deck.length} 张，可选 ${offered} 张`),
    );
    if (!offered) panel.append(el('p', '', opts.empty ?? '牌组里没有符合条件的牌。'));

    const scroll = el('div', 'deck-pick-scroll');
    scroll.append(grid);
    panel.append(scroll);

    const x = el('button', 'panel-close', '×');
    x.title = '关闭';
    x.addEventListener('click', close);
    panel.append(x);

    overlay.append(panel);
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) close();
    });
    this.root.append(overlay);
  }

  /** 失败相。重挑回到节点开头，放弃才真正结束本局。 */
  private showDefeat(): void {
    this.root.append(renderMap(this.run, () => {}));

    const chest = this.chestEnemy !== null;
    const overlay = renderDefeat(this.run, {
      retryCost: C.RETRY_GOLD_COST,
      retryLimit: C.RETRY_LIMIT,
      canRetry: canRetry(this.run),
      onRetry: () => {
        sfx.pick();
        this.chestEnemy = null;
        this.setRun(retryNode(this.run));
      },
      onAbandon: () => {
        sfx.pick();
        this.chestEnemy = null;
        this.setRun(abandonRun(this.run));
      },
    });

    if (chest) {
      const panel = overlay.querySelector('.panel');
      const note = el(
        'p',
        'defeat-omen',
        '箱盖是在你倒下之后才合回去的。里面的东西没有走远，' +
          '它把那个位置空着，扣舌照旧朝里弯着等下一双手。',
      );
      const anchor = panel?.querySelector('.defeat-facts') ?? panel?.querySelector('.confirm-row');
      panel?.insertBefore(note, anchor ?? null);
    }

    this.root.append(overlay);
  }

  private showEvent(): void {
    const holder: RngHolder = { rng: this.run.rng + this.run.cleared * 31337 };
    const def = shuffle(holder, EVENTS)[0]!;

    this.root.append(renderMap(this.run, () => {}));

    // 无选项的异象进门就结算，只把结果摆出来
    if (def.auto) {
      const only = def.options[0];
      if (!only) {
        this.setRun(completeNode(this.run));
        return;
      }
      this.resolveEvent(def.title, only, holder);
      return;
    }

    const choices: EventChoice[] = def.options.map((option) => ({
      label: option.label,
      desc: option.desc,
      apply: () => this.resolveEvent(def.title, option, holder),
    }));
    this.root.append(renderEvent(def.title, def.body, choices));
  }

  /** 结算一个异象选项。带宝箱怪的转入战斗，其余先展示结果再回地图。 */
  private resolveEvent(title: string, option: EventOption, holder: RngHolder): void {
    const before = this.run;
    let next = before;
    for (const outcome of option.outcomes) next = applyOutcome(next, outcome, holder);

    const chest = option.outcomes.find((o) => o.kind === 'chest');
    if (chest?.kind === 'chest') {
      this.run = next;
      this.save();
      this.startChestBattle(chest.enemyId, holder.rng);
      return;
    }

    if (next.result === 'defeat') {
      this.setRun(next);
      return;
    }

    this.run = next;
    this.save();
    this.root.innerHTML = '';
    this.root.append(renderMap(this.run, () => {}));
    this.root.append(
      renderEvent(title, describeChange(before, next), [
        {
          label: '继续前行',
          desc: '离开这里。',
          apply: () => this.setRun(completeNode(this.run)),
        },
      ]),
    );
    this.mountMenu();
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

    this.pickFromDeck({
      title: '重录',
      body: '卡面下方是重录前后的数值对照。选中的牌永久强化，本次篝火就此结束，不能再休息。',
      mode: 'upgrade',
      confirmText: '就录这张',
      empty: '牌组里已经没有可以重录的牌了。',
      // 强化后毫无变化的牌不摆上来，免得白白浪费一次重录
      accepts: (card) => !card.upgraded && canUpgrade(cardDef(card.defId)),
      onPick: (index) => this.setRun(completeNode(upgradeCard(this.run, index))),
      onCancel: () => this.render(),
    });
  }

  private showShop(): void {
    // 换了商店就重置售罄记录与刷新次数
    if (this.shopNode !== this.run.currentNode) {
      this.shopNode = this.run.currentNode;
      this.shopBought.clear();
      this.shopRerolls = 0;
    }

    // 买过的从货架上撤下，剩下的连同各自的原始下标一起送去渲染
    const live = rollShop(this.run, this.shopRerolls)
      .map((item, index) => ({ item, key: `${this.shopRerolls}:${index}` }))
      .filter((entry) => !this.shopBought.has(entry.key));

    const rerollCost = rerollPrice(this.shopRerolls);
    this.root.innerHTML = '';

    const screen = renderShop(this.run, {
      items: live.map((entry) => entry.item),
      rerollCost,
      onBuy: (item, index) => {
        const entry = live[index];
        if (entry) this.buy(item, entry.key);
      },
      onReroll: () => {
        this.shopRerolls += 1;
        this.setRun(gainGold(this.run, -rerollCost));
      },
      onLeave: () => this.setRun(completeNode(this.run)),
      host: this.root,
    });

    if (!live.length) {
      screen
        .querySelector('.shop-rack')
        ?.append(el('div', 'shop-empty', '货架空了，剩下的只有沙。'));
    }
    this.root.append(screen);
  }

  /** 买下一件商品。服务类商品先挑目标再扣钱。 */
  private buy(item: ShopItem, key: string): void {
    const paid = () => {
      this.shopBought.add(key);
      this.run = gainGold(this.run, -item.price);
    };

    switch (item.kind) {
      case 'card': {
        const def = cardDef(item.id!);
        confirmAction(this.root, {
          title: '买下这张牌',
          body: `花费 ${item.price} 枚时砂，「${def.name}」将永久加入牌组。剩余 ${this.run.gold - item.price} 枚。`,
          confirmText: `买下 · ◈${item.price}`,
          preview: bigCard(def.id),
          onConfirm: () => {
            sfx.play(def.id);
            paid();
            this.setRun(addCard(this.run, def.id));
            toast(this.root, `${def.name} 已加入牌组`);
          },
        });
        break;
      }
      case 'relic': {
        const def = RELICS.find((r) => r.id === item.id);
        confirmAction(this.root, {
          title: '买下这件遗物',
          body: `花费 ${item.price} 枚时砂。${def?.text ?? ''}`,
          confirmText: `买下 · ◈${item.price}`,
          onConfirm: () => {
            sfx.play('relic');
            paid();
            this.setRun(addRelic(this.run, item.id!));
            toast(this.root, `${def?.name ?? item.id} 已收入`);
          },
        });
        break;
      }
      case 'equipment': {
        this.confirmEquip(item.id!, {
          title: '买下这件装备',
          lead: `花费 ${item.price} 枚时砂。`,
          confirmText: `买下 · ◈${item.price}`,
          onConfirm: () => {
            paid();
            this.wearEquipment(item.id!);
            this.setRun(this.run);
          },
        });
        break;
      }
      case 'removeCard':
        this.pickFromDeck({
          title: '洗去一张牌',
          body: `花费 ${item.price} 枚时砂，选中的牌永久离开牌组。`,
          mode: 'remove',
          confirmText: `洗掉这张 · ◈${item.price}`,
          accepts: () => this.run.deck.length > 1,
          onPick: (index) => {
            paid();
            this.setRun(removeCard(this.run, index));
            toast(this.root, '那张牌不再回来');
          },
        });
        break;
      case 'upgradeCard':
        this.pickFromDeck({
          title: '重录一张牌',
          body: `花费 ${item.price} 枚时砂，选中的牌永久强化，卡面下方是前后对照。`,
          mode: 'upgrade',
          confirmText: `就录这张 · ◈${item.price}`,
          empty: '牌组里已经没有可以重录的牌了。',
          accepts: (card) => !card.upgraded && canUpgrade(cardDef(card.defId)),
          onPick: (index) => {
            paid();
            this.setRun(upgradeCard(this.run, index));
            toast(this.root, '织法已经改写');
          },
        });
        break;
      case 'supply': {
        const amount = item.amount ?? 0;
        confirmAction(this.root, {
          title: '买下补给',
          body: `花费 ${item.price} 枚时砂，回复 ${amount} 点生命。当前 ${this.run.hp}/${this.run.maxHp}。`,
          confirmText: `买下 · ◈${item.price}`,
          onConfirm: () => {
            sfx.play('heal');
            paid();
            this.setRun(heal(this.run, amount));
            toast(this.root, `回复 ${amount} 点生命`);
          },
        });
        break;
      }
    }
  }
}

/** 牌组网格的一次挑选。remove 只摆卡面，upgrade 额外附上前后数值对照。 */
interface DeckPickOptions {
  title: string;
  body: string;
  mode: 'remove' | 'upgrade';
  confirmText: string;
  /** 一张都挑不出来时替换的说明。 */
  empty?: string;
  accepts: (card: DeckCard) => boolean;
  onPick: (index: number) => void;
  onCancel?: () => void;
}

/** 确认框里的大图预览。 */
function bigCard(defId: string, upgraded = false): HTMLElement {
  const box = el('div', 'big-card');
  box.append(renderStaticCard(defId, upgraded));
  return box;
}

function bigEquip(equipId: string): HTMLElement {
  const box = el('div', 'big-card');
  box.append(renderEquipCard(equipId));
  return box;
}

function bigRelic(relicId: string): HTMLElement {
  const def = RELICS.find((r) => r.id === relicId);
  const box = el('div', 'relic-preview');

  const icon = el('div', 'relic-preview-art');
  const url = art.relic(def?.art ?? relicId);
  if (url) icon.style.backgroundImage = `url(${url})`;

  const body = el('div', 'relic-preview-body');
  body.append(
    el('div', 'relic-preview-name', def?.name ?? relicId),
    el('div', 'relic-preview-text', def?.text ?? ''),
  );

  box.append(icon, body);
  return box;
}

/** 换装的并排对照：左边是正在用的，右边是要换上的。 */
function equipSwapPreview(currentId: string, nextId: string): HTMLElement {
  const box = el('div', 'equip-swap');

  const current = el('div', 'equip-swap-side drop');
  current.append(el('div', 'equip-swap-label', '正在使用'), renderEquipCard(currentId));

  const next = el('div', 'equip-swap-side');
  next.append(el('div', 'equip-swap-label up', '换上'), renderEquipCard(nextId));

  box.append(
    current,
    el('div', 'equip-swap-arrow', '→'),
    next,
    el('div', 'equip-swap-drop', `换下的「${equipmentDef(currentId).name}」不进背包，就此丢弃。`),
  );
  return box;
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

/** 逐项列出异象结算前后的差异，没有变化时给一句兜底。 */
function describeChange(before: RunState, after: RunState): string {
  const lines: string[] = [];

  if (after.hp !== before.hp) lines.push(`生命 ${signed(after.hp - before.hp)}`);
  if (after.maxHp !== before.maxHp) lines.push(`生命上限 ${signed(after.maxHp - before.maxHp)}`);
  if (after.gold !== before.gold) lines.push(`时砂 ${signed(after.gold - before.gold)}`);

  const nameOf = (defId: string) => cardDef(defId).name;
  const beforeCards = before.deck.map((card) => card.defId);
  const afterCards = after.deck.map((card) => card.defId);
  for (const defId of diff(afterCards, beforeCards)) lines.push(`获得卡牌「${nameOf(defId)}」`);
  for (const defId of diff(beforeCards, afterCards)) lines.push(`失去卡牌「${nameOf(defId)}」`);

  const upgraded = after.deck.filter((card) => card.upgraded).length -
    before.deck.filter((card) => card.upgraded).length;
  if (upgraded > 0) lines.push(`重录 ${upgraded} 张牌`);

  const relicName = (id: string) => RELICS.find((r) => r.id === id)?.name ?? id;
  for (const id of diff(after.relics, before.relics)) lines.push(`获得遗物「${relicName(id)}」`);
  for (const id of diff(before.relics, after.relics)) lines.push(`失去遗物「${relicName(id)}」`);

  const wornBefore = equippedIds(before.equipment);
  const wornAfter = equippedIds(after.equipment);
  for (const id of diff(wornAfter, wornBefore)) {
    lines.push(`装备「${equipmentDef(id).name}」`);
  }
  for (const id of diff(wornBefore, wornAfter)) {
    lines.push(`卸下「${equipmentDef(id).name}」`);
  }

  return lines.length ? lines.join('　') : '什么也没有发生。';
}

/** 取 a 中比 b 多出来的条目，重复项按份数计算。 */
function diff(a: string[], b: string[]): string[] {
  const rest = b.slice();
  const out: string[] = [];
  for (const id of a) {
    const at = rest.indexOf(id);
    if (at >= 0) rest.splice(at, 1);
    else out.push(id);
  }
  return out;
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
function upgradeDiffRow(defId: string, className = 'upgrade-diff'): HTMLElement {
  const def = cardDef(defId);
  const rows = el('div', className);
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

/** 馈赠的候选结果，抽中哪一条由 rng 决定。 */
const GIFTS: EventOutcome[] = [
  { kind: 'gold', amount: 45 },
  { kind: 'heal', amount: 16 },
  { kind: 'maxHp', amount: 6 },
  { kind: 'upgradeCard' },
  { kind: 'removeCurse' },
  { kind: 'addEquipment' },
  { kind: 'addRelic' },
  { kind: 'addCard', pool: 'random' },
];

function applyOutcome(run: RunState, outcome: EventOutcome, holder: RngHolder): RunState {
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
    case 'addEquipment': {
      const worn = new Set(equippedIds(run.equipment));
      const picked = shuffle(holder, EQUIPMENT.filter((def) => !worn.has(def.id)))[0];
      return picked ? equipItem(run, picked.id).run : run;
    }
    case 'chest':
      // 战斗由调用方发起，这里不改动进程状态
      return run;
    case 'gift':
      return applyOutcome(run, shuffle(holder, GIFTS)[0]!, holder);
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
    if (!raw) return null;
    const saved = JSON.parse(raw) as RunState;
    return {
      ...saved,
      equipment: { ...emptyLoadout(), ...(saved.equipment ?? {}) },
      checkpoint: saved.checkpoint ?? null,
      retries: saved.retries ?? 0,
    };
  } catch {
    return null;
  }
}
