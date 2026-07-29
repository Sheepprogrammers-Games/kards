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
import type { ShopItem } from '@engine/types';
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
  private shopBought = new Set<string>();
  private shopRerolls = 0;
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

  /** 宝箱怪。打赢按普通遭遇发奖励，打输仍然落到失败相。 */
  private startChestBattle(enemyId: string, seed: number): void {
    music.play('elite');
    this.root.innerHTML = '';
    this.enterBattle([{ defId: enemyId, hpScale: 1 + (this.run.act - 1) * 0.35 }], seed, 'combat');
  }

  /** 按敌人定义组装一场战斗，并接上胜负两条出口。 */
  private enterBattle(
    picks: { defId: string; hpScale: number }[],
    seed: number,
    kind: NodeKind,
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
          this.showReward({ ...this.run, hp: Math.max(1, endHp) }, kind);
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

  /** 战斗奖励由进程层掷出，时砂与回血直接入账，其余交给玩家挑。 */
  private showReward(run: RunState, kind: NodeKind): void {
    const offers = rollRewards(run, kind);

    let current = run;
    for (const offer of offers) {
      if (offer.kind === 'gold') current = gainGold(current, offer.amount ?? 0);
      if (offer.kind === 'heal') current = heal(current, offer.amount ?? 0);
    }

    // 战斗场景留在底下不重绘，奖励面板直接压上去
    this.run = current;
    const finish = () => this.setRun(completeNode(this.run));

    this.root.append(
      renderReward(offers, {
        onCard: (defId, claim) => {
          confirmAction(this.root, {
            title: '织入牌组',
            body: `「${cardDef(defId).name}」将加入牌组，本次奖励只能取一张。`,
            confirmText: '就要这张',
            preview: bigCard(defId),
            onConfirm: () => {
              this.run = addCard(this.run, defId);
              recordSeen('cards', [defId]);
              claim();
            },
          });
        },
        onRelic: (relicId, claim) => {
          this.run = addRelic(this.run, relicId);
          recordSeen('relics', [relicId]);
          claim();
        },
        onEquipment: (equipId, claim) => {
          const def = equipmentDef(equipId);
          confirmAction(this.root, {
            title: '穿上装备',
            body: this.replaceHint(equipId),
            confirmText: `装备 · ${def.name}`,
            preview: bigEquip(equipId),
            onConfirm: () => {
              this.wearEquipment(equipId);
              claim();
            },
          });
        },
        onRemoveCard: (claim) => {
          this.pickFromDeck(
            '洗去一张牌',
            '选中的牌永久离开牌组。',
            () => true,
            (index) => {
              this.run = removeCard(this.run, index);
              claim();
            },
          );
        },
        onUpgradeCard: (claim) => {
          this.pickFromDeck(
            '重录一张牌',
            '选中的牌永久强化。',
            (card) => !card.upgraded && canUpgrade(cardDef(card.defId)),
            (index) => {
              this.run = upgradeCard(this.run, index);
              claim();
            },
          );
        },
        onDone: finish,
      }),
    );
  }

  /** 同槽位已经有装备时提示会顶掉哪一件。 */
  private replaceHint(equipId: string): string {
    const def = equipmentDef(equipId);
    const worn = this.run.equipment[def.slot];
    if (!worn || worn === equipId) return `「${def.name}」将占用该槽位。`;
    return `「${def.name}」将顶掉正在使用的「${equipmentDef(worn).name}」，被顶掉的装备就此丢弃。`;
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

  /** 从当前牌组里挑一张，用于洗去与重录这类服务。 */
  private pickFromDeck(
    title: string,
    body: string,
    accepts: (card: DeckCard) => boolean,
    onPick: (index: number) => void,
  ): void {
    const overlay = el('div', 'overlay');
    const panel = el('div', 'panel has-close');
    panel.append(el('h2', '', title), el('p', '', body));

    const row = el('div', 'card-row deck-row');
    let offered = 0;
    this.run.deck.forEach((card, index) => {
      if (!accepts(card)) return;
      offered += 1;
      const node = renderStaticCard(card.defId, card.upgraded);
      node.addEventListener('click', () => {
        sfx.play(card.defId);
        overlay.remove();
        onPick(index);
      });
      row.append(node);
    });
    if (!offered) panel.append(el('p', '', '牌组里没有符合条件的牌。'));
    panel.append(row);

    const close = el('button', 'panel-close', '×');
    close.title = '关闭';
    close.addEventListener('click', () => overlay.remove());
    panel.append(close);

    overlay.append(panel);
    this.root.append(overlay);
  }

  /** 失败相。重挑回到节点开头，放弃才真正结束本局。 */
  private showDefeat(): void {
    this.root.append(renderMap(this.run, () => {}));
    this.root.append(
      renderDefeat(this.run, {
        retryCost: C.RETRY_GOLD_COST,
        retryLimit: C.RETRY_LIMIT,
        canRetry: canRetry(this.run),
        onRetry: () => {
          sfx.pick();
          this.setRun(retryNode(this.run));
        },
        onAbandon: () => {
          sfx.pick();
          this.setRun(abandonRun(this.run));
        },
      }),
    );
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
    // 换了商店就重置售罄记录与刷新次数
    if (this.shopNode !== this.run.currentNode) {
      this.shopNode = this.run.currentNode;
      this.shopBought.clear();
      this.shopRerolls = 0;
    }

    const items = rollShop(this.run, this.shopRerolls);

    this.root.innerHTML = '';
    const screen = el('div', 'screen');
    screen.append(el('div', 'screen-title', '残市'));
    screen.append(el('div', 'screen-sub', '有人在这里用还没发生的事换已经发生的事'));
    screen.append(renderRunBar(this.run, this.root));

    const shelf = el('div', 'shop-shelf');
    items.forEach((item, index) => {
      const key = `${this.shopRerolls}:${index}`;
      const sold = this.shopBought.has(key);
      const affordable = this.run.gold >= item.price;

      const wrap = el('div', 'shop-item');
      if (sold) wrap.classList.add('sold');
      else if (!affordable) wrap.classList.add('locked');

      const tag = el('div', 'screen-sub', sold ? '已售出' : `◈ ${item.price}`);
      tag.style.marginTop = '8px';
      wrap.append(shopTile(item), tag);

      if (!sold && affordable) {
        wrap.addEventListener('click', () => this.buy(item, key));
      }
      shelf.append(wrap);
    });
    screen.append(shelf);

    const actions = el('div', 'shop-actions');
    const rerollCost = rerollPrice(this.shopRerolls);
    const reroll = el('button', 'ghost-button', `换一批 · ◈${rerollCost}`) as HTMLButtonElement;
    if (this.run.gold < rerollCost) {
      reroll.disabled = true;
    } else {
      reroll.addEventListener('click', () => {
        sfx.pick();
        this.shopRerolls += 1;
        this.setRun(gainGold(this.run, -rerollCost));
      });
    }

    const leave = el('button', 'ghost-button', '离开');
    leave.addEventListener('click', () => this.setRun(completeNode(this.run)));
    actions.append(reroll, leave);
    screen.append(actions);
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
        confirmAction(this.root, {
          title: '买下这件装备',
          body: `花费 ${item.price} 枚时砂。${this.replaceHint(item.id!)}`,
          confirmText: `买下 · ◈${item.price}`,
          preview: bigEquip(item.id!),
          onConfirm: () => {
            paid();
            this.wearEquipment(item.id!);
            this.setRun(this.run);
          },
        });
        break;
      }
      case 'removeCard':
        this.pickFromDeck(
          '洗去一张牌',
          `花费 ${item.price} 枚时砂，选中的牌永久离开牌组。`,
          () => true,
          (index) => {
            paid();
            this.setRun(removeCard(this.run, index));
            toast(this.root, '那张牌不再回来');
          },
        );
        break;
      case 'upgradeCard':
        this.pickFromDeck(
          '重录一张牌',
          `花费 ${item.price} 枚时砂，选中的牌永久强化。`,
          (card) => !card.upgraded && canUpgrade(cardDef(card.defId)),
          (index) => {
            paid();
            this.setRun(upgradeCard(this.run, index));
            toast(this.root, '织法已经改写');
          },
        );
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

/** 货架上的一格。卡牌与装备用各自的卡面，服务类只有一句说明。 */
function shopTile(item: ShopItem): HTMLElement {
  switch (item.kind) {
    case 'card':
      return renderStaticCard(item.id!);
    case 'equipment':
      return renderEquipCard(item.id!);
    case 'relic': {
      const def = RELICS.find((r) => r.id === item.id);
      const tile = el('div', 'shop-service');
      const icon = el('div', 'shop-service-icon');
      const url = art.relic(def?.art ?? item.id!);
      if (url) icon.style.backgroundImage = `url(${url})`;
      tile.append(icon, el('div', 'shop-service-name', def?.name ?? item.id!));
      tile.append(el('div', 'shop-service-text', def?.text ?? ''));
      return tile;
    }
    default: {
      const text: Record<string, [string, string]> = {
        removeCard: ['洗去一张牌', '从牌组里永久抽走一张。'],
        upgradeCard: ['重录一张牌', '把一张牌永久强化。'],
        supply: ['补给', `回复 ${item.amount ?? 0} 点生命。`],
      };
      const [name, desc] = text[item.kind] ?? [item.kind, ''];
      const tile = el('div', 'shop-service');
      tile.append(el('div', 'shop-service-icon'), el('div', 'shop-service-name', name));
      tile.append(el('div', 'shop-service-text', desc));
      return tile;
    }
  }
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
