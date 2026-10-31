/** 效果原子的结算。 */

import { shuffle } from './rng';
import type {
  CombatState,
  Combatant,
  Effect,
  EnemyState,
  StatusId,
  TrackEntry,
} from './types';

export interface ResolveContext {
  /** 打出时的首次结算，ONCE 效果只在此时触发。 */
  isPlay: boolean;
  /** 玩家指定的敌人下标。 */
  targetIndex?: number;
  /** 覆盖条目自带的倍率，省略时沿用 entry.rateMod。 */
  rateMod?: number;
  /** 系数过低时把取整为零的产出抬到 1，用于一次性清算。 */
  minYield?: boolean;
}

export function frontmostEnemy(state: CombatState): EnemyState | null {
  return state.enemies.find((e) => e.alive) ?? null;
}

function resolveEnemyTarget(state: CombatState, ctx: ResolveContext): EnemyState | null {
  if (ctx.targetIndex !== undefined) {
    const picked = state.enemies[ctx.targetIndex];
    if (picked?.alive) return picked;
  }
  return frontmostEnemy(state);
}

export interface DamageOptions {
  /** 无视护甲。 */
  pierce?: boolean;
  /** 目标生命低于该比例时翻倍。 */
  execute?: number;
  /** 攻击方，用于反伤与吸血结算。 */
  source?: Combatant;
  lifesteal?: number;
}

/**
 * 命中时的防御方修正实时读取。
 * 返回实际扣掉的生命与溢出的伤害量。
 */
export function dealDamage(
  state: CombatState,
  target: Combatant,
  raw: number,
  opts: DamageOptions = {},
): { hpLoss: number; overkill: number } {
  if (raw <= 0) return { hpLoss: 0, overkill: 0 };
  let amount = raw;

  if (opts.execute && target.hp <= target.maxHp * opts.execute) {
    amount *= 2;
    state.events.push({ type: 'execute', targetId: target.id });
  }
  if (target.statuses.vulnerable) amount = Math.floor(amount * 1.5);

  // 护盾层每次抵挡固定量并消耗一层
  const ward = target.statuses.ward ?? 0;
  if (ward > 0 && !opts.pierce) {
    amount = Math.max(0, amount - 3);
    const left = ward - 1;
    if (left <= 0) delete target.statuses.ward;
    else target.statuses.ward = left;
  }

  const absorbed = opts.pierce ? 0 : Math.min(target.block, amount);
  if (!opts.pierce) target.block -= absorbed;
  const raw_loss = amount - absorbed;
  const hpLoss = Math.min(raw_loss, target.hp);
  const overkill = raw_loss - hpLoss;
  target.hp = Math.max(0, target.hp - raw_loss);

  state.events.push({
    type: 'damage',
    targetId: target.id,
    amount,
    absorbed,
    hpLoss,
    hp: target.hp,
    pierce: Boolean(opts.pierce),
  });

  if (opts.source && opts.lifesteal && hpLoss > 0) {
    const healed = Math.floor(hpLoss * opts.lifesteal);
    if (healed > 0) {
      opts.source.hp = Math.min(opts.source.maxHp, opts.source.hp + healed);
      state.events.push({
        type: 'lifesteal',
        targetId: opts.source.id,
        amount: healed,
        hp: opts.source.hp,
      });
    }
  }

  // 转嫁在反伤之前结算，按实际扣血的一半打回去并消耗一层
  const reflect = target.statuses.reflect ?? 0;
  if (reflect > 0 && opts.source && hpLoss > 0) {
    const back = Math.floor(hpLoss * 0.5);
    const left = reflect - 1;
    if (left <= 0) delete target.statuses.reflect;
    else target.statuses.reflect = left;

    if (back > 0) {
      opts.source.hp = Math.max(0, opts.source.hp - back);
      state.events.push({
        type: 'reflect',
        targetId: opts.source.id,
        amount: back,
        hp: opts.source.hp,
      });
    }
  }

  // 反伤只对实际造成伤害的攻击方生效
  const thorns = target.statuses.thorns ?? 0;
  if (thorns > 0 && opts.source && hpLoss > 0) {
    opts.source.hp = Math.max(0, opts.source.hp - thorns);
    state.events.push({
      type: 'thorns',
      targetId: opts.source.id,
      amount: thorns,
      hp: opts.source.hp,
    });
  }

  return { hpLoss, overkill };
}

export function addStatus(state: CombatState, target: Combatant, id: StatusId, stacks: number): void {
  if (stacks === 0) return;
  const next = (target.statuses[id] ?? 0) + stacks;
  if (next <= 0) delete target.statuses[id];
  else target.statuses[id] = next;
  state.events.push({ type: 'status', targetId: target.id, status: id, stacks, total: next });
}

export function gainBlock(state: CombatState, target: Combatant, amount: number): void {
  if (amount <= 0) return;
  target.block += amount;
  state.events.push({ type: 'block', targetId: target.id, amount, total: target.block });
}

export function drawCards(state: CombatState, count: number): void {
  for (let i = 0; i < count; i++) {
    if (state.hand.length >= state.player.handSize) return;
    if (!state.drawPile.length) {
      if (!state.discardPile.length) return;
      state.drawPile = shuffle(state, state.discardPile);
      state.discardPile = [];
      state.events.push({ type: 'reshuffle', size: state.drawPile.length });
    }
    const card = state.drawPile.pop();
    if (!card) return;
    state.hand.push(card);
    state.events.push({ type: 'draw', uid: card.uid, defId: card.defId });
  }
}

/** 攻击方修正取自快照，缩放后向下取整，无最小值保底。 */
export function scaledAmount(effect: Effect, entry: TrackEntry, coef: number, rate: number): number {
  const snap = entry.snapshot;
  let base = effect.amount;
  if (effect.kind === 'damage') {
    base += snap.strength;
    if (snap.weak) base = Math.floor(base * 0.75);
    base = base * snap.damageScale;
  } else if (effect.kind === 'applyStatus' || effect.kind === 'selfStatus') {
    base += snap.statusPotency;
  }
  return Math.floor(base * coef * rate);
}

/** 条目在某个系数下的可见产出，公式与结算一致。 */
export function previewYield(
  entry: TrackEntry,
  coef: number,
): { kind: Effect['kind']; value: number; hits: number; status?: string }[] {
  const rate = entry.rateMod ?? 1;
  const parts: { kind: Effect['kind']; value: number; hits: number; status?: string }[] = [];
  for (const effect of entry.effects) {
    if (effect.scaleMode === 'ONCE') continue;
    let value = 0;
    let hits = effect.hits ?? 1;
    if (effect.scaleMode === 'THRESHOLD') {
      if (coef < (effect.threshold ?? 1)) continue;
      value = scaledAmount(effect, entry, 1, rate);
    } else if (effect.scaleMode === 'COUNT') {
      hits = Math.floor((effect.hits ?? 1) * coef * rate);
      value = scaledAmount(effect, entry, 1, 1);
    } else {
      value = scaledAmount(effect, entry, coef, rate);
    }
    if (value <= 0 || hits <= 0) continue;
    parts.push({ kind: effect.kind, value, hits, status: effect.status });
  }
  return parts;
}

/** 单个效果原子。coef 为当前格位系数，isPlay 决定 ONCE 是否触发。 */
function applyEffect(
  state: CombatState,
  entry: TrackEntry,
  effect: Effect,
  coef: number,
  ctx: ResolveContext,
): void {
  const rate = ctx.rateMod ?? 1;

  /** 缩放后的产出。minYield 下，原本有量的效果不会被取整抹成零。 */
  const amountAt = (coefficient: number): number => {
    const value = scaledAmount(effect, entry, coefficient, rate);
    if (value > 0 || !ctx.minYield) return value;
    return scaledAmount(effect, entry, 1, 1) > 0 ? 1 : 0;
  };

  switch (effect.scaleMode) {
    case 'ONCE':
      if (!ctx.isPlay) return;
      break;
    case 'THRESHOLD':
      if (coef < (effect.threshold ?? 1)) return;
      coef = 1;
      break;
    default:
      break;
  }

  const playerSide = entry.owner === 'player';
  const attacker: Combatant = playerSide
    ? state.player
    : (state.enemies[entry.sourceEnemy ?? 0] ?? state.player);

  switch (effect.kind) {
    case 'damage': {
      const hits =
        effect.scaleMode === 'COUNT'
          ? Math.floor((effect.hits ?? 1) * coef * rate)
          : (effect.hits ?? 1);
      const per =
        effect.scaleMode === 'COUNT' ? scaledAmount(effect, entry, 1, 1) : amountAt(coef);
      if (hits <= 0 || per <= 0) return;

      const opts = {
        pierce: effect.pierce,
        execute: effect.execute,
        lifesteal: effect.lifesteal,
        source: attacker,
      };

      for (let i = 0; i < hits; i++) {
        if (playerSide) {
          if (effect.target === 'allEnemies') {
            for (const enemy of state.enemies) if (enemy.alive) dealDamage(state, enemy, per, opts);
          } else {
            const target = resolveEnemyTarget(state, ctx);
            if (!target) continue;
            const result = dealDamage(state, target, per, opts);
            // 溢出伤害转给下一个还活着的敌人
            if (effect.overkill && result.overkill > 0) {
              const next = state.enemies.find((e) => e.alive && e !== target && e.hp > 0);
              if (next) dealDamage(state, next, result.overkill, opts);
            }
          }
        } else {
          dealDamage(state, state.player, per, opts);
        }
      }
      break;
    }

    case 'block': {
      const amount = amountAt(coef);
      gainBlock(state, playerSide ? state.player : attacker, amount);
      break;
    }

    case 'heal': {
      const amount = amountAt(coef);
      if (amount <= 0) return;
      const who = playerSide ? state.player : attacker;
      who.hp = Math.min(who.maxHp, who.hp + amount);
      state.events.push({ type: 'heal', targetId: who.id, amount, hp: who.hp });
      break;
    }

    case 'applyStatus': {
      const stacks = amountAt(coef);
      if (stacks <= 0 || !effect.status) return;
      if (playerSide) {
        if (effect.target === 'allEnemies') {
          for (const enemy of state.enemies) {
            if (enemy.alive) addStatus(state, enemy, effect.status, stacks);
          }
        } else {
          const target = resolveEnemyTarget(state, ctx);
          if (target) addStatus(state, target, effect.status, stacks);
        }
      } else {
        addStatus(state, state.player, effect.status, stacks);
      }
      break;
    }

    case 'selfStatus': {
      const stacks = amountAt(coef);
      if (stacks <= 0 || !effect.status) return;
      addStatus(state, playerSide ? state.player : attacker, effect.status, stacks);
      break;
    }

    case 'draw':
      drawCards(state, effect.amount);
      break;

    case 'gainEnergy':
      state.player.energy += effect.amount;
      state.events.push({ type: 'energy', amount: effect.amount, total: state.player.energy });
      break;

    case 'createCard': {
      if (!effect.cardId) return;
      for (let i = 0; i < effect.amount; i++) {
        const card = { uid: state.uidCounter++, defId: effect.cardId, upgraded: false };
        if (effect.pile === 'hand') state.hand.push(card);
        else if (effect.pile === 'draw') state.drawPile.push(card);
        else state.discardPile.push(card);
        state.events.push({ type: 'createCard', defId: card.defId, pile: effect.pile ?? 'discard' });
      }
      break;
    }
  }
}

/**
 * 条目在某个格位的一次完整结算。
 * 倍率默认取条目自带的 rateMod，窃取与抢拍的折扣因此在回响、引爆与抽空时同样生效。
 */
export function resolveEntry(
  state: CombatState,
  entry: TrackEntry,
  coef: number,
  ctx: ResolveContext,
): void {
  const rate = ctx.rateMod ?? entry.rateMod ?? 1;
  state.events.push({
    type: 'resolve',
    uid: entry.uid,
    cardId: entry.cardId,
    owner: entry.owner,
    coef,
    rate,
    isPlay: ctx.isPlay,
  });
  for (const effect of entry.effects) {
    applyEffect(state, entry, effect, coef, { ...ctx, rateMod: rate });
  }
}

/** 判断条目在下一格位是否全部取整为 0，用于提前退场。 */
export function isNullAt(entry: TrackEntry, coef: number): boolean {
  const rate = entry.rateMod ?? 1;
  for (const effect of entry.effects) {
    if (effect.scaleMode === 'ONCE') continue;
    if (effect.scaleMode === 'THRESHOLD') {
      if (coef >= (effect.threshold ?? 1)) return false;
      continue;
    }
    if (effect.scaleMode === 'COUNT') {
      if (Math.floor((effect.hits ?? 1) * coef * rate) > 0) return false;
      continue;
    }
    if (scaledAmount(effect, entry, coef, rate) > 0) return false;
  }
  return true;
}
