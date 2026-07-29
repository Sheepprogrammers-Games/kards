/** 装备定义的查表入口，以及常驻修正与钩子效果的合并。 */

import {
  EQUIP_SLOT_ORDER,
  NO_MODIFIERS,
  type CombatModifiers,
  type Effect,
  type EquipCondition,
  type EquipSlot,
  type EquipmentDef,
  type EquipmentLoadout,
} from './types';

/** 装备效果的结算时机。 */
export type EquipHook = 'onBattleStart' | 'onTurnStart' | 'onTurnEnd';

/** 某个时机上待结算的一件装备。 */
export interface EquipTrigger {
  slot: EquipSlot;
  equipId: string;
  effects: Effect[];
  /** 结算前需要满足的条件，省略为无条件。 */
  condition?: EquipCondition;
}

/** 装备来源，可以是一串 id，也可以是整套槽位配置。 */
export type EquipmentSource = readonly (string | null)[] | EquipmentLoadout;

let registry: Record<string, EquipmentDef> = {};

export function setEquipmentRegistry(defs: EquipmentDef[]): void {
  registry = Object.fromEntries(defs.map((def) => [def.id, def]));
}

export function equipmentDef(id: string): EquipmentDef {
  const def = registry[id];
  if (!def) throw new Error(`未注册的装备定义: ${id}`);
  return def;
}

export function allEquipment(): EquipmentDef[] {
  return Object.values(registry);
}

/** 按固定槽位顺序取出已装备的 id，空槽略过。 */
export function equippedIds(source: EquipmentSource): string[] {
  const raw = Array.isArray(source)
    ? (source as readonly (string | null)[])
    : EQUIP_SLOT_ORDER.map((slot) => (source as EquipmentLoadout)[slot]);
  return raw.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

/** 取出已装备且已注册的定义，未注册的 id 直接跳过。 */
function definitionsOf(source: EquipmentSource): EquipmentDef[] {
  const out: EquipmentDef[] = [];
  for (const id of equippedIds(source)) {
    const def = registry[id];
    if (def) out.push(def);
  }
  return out;
}

/** 按槽位顺序收集该时机需要结算的装备效果。 */
export function equipmentEffects(source: EquipmentSource, hook: EquipHook): EquipTrigger[] {
  const out: EquipTrigger[] = [];
  for (const def of definitionsOf(source)) {
    const effects = def[hook];
    if (!effects || !effects.length) continue;
    out.push({ slot: def.slot, equipId: def.id, effects, condition: def.condition });
  }
  return out;
}

/** 把一份修正叠加到基底上。系数表后覆盖前，效率乘算，数值累加，开关取或。 */
export function mergeModifiers(
  base: CombatModifiers,
  patch: Partial<CombatModifiers>,
): CombatModifiers {
  const mods: CombatModifiers = { ...base };
  if (patch.coefTable) mods.coefTable = patch.coefTable.slice();
  if (patch.igniteEfficiency) mods.igniteEfficiency *= patch.igniteEfficiency;
  mods.energyPerTurn += patch.energyPerTurn ?? 0;
  mods.handSize += patch.handSize ?? 0;
  mods.echoBudget += patch.echoBudget ?? 0;
  mods.startingBlock += patch.startingBlock ?? 0;
  mods.startingStrength += patch.startingStrength ?? 0;
  mods.drawPerTurn += patch.drawPerTurn ?? 0;
  mods.rewindBonus += patch.rewindBonus ?? 0;
  mods.salvageBurn ||= patch.salvageBurn ?? false;
  mods.steadyIgnite ||= patch.steadyIgnite ?? false;
  mods.salvageToDraw ||= patch.salvageToDraw ?? false;
  mods.payoffOnBurn ||= patch.payoffOnBurn ?? false;
  mods.igniteKeepsEntry ||= patch.igniteKeepsEntry ?? false;
  mods.firstWeaveFree ||= patch.firstWeaveFree ?? false;
  mods.fullSteal ||= patch.fullSteal ?? false;
  mods.freeFreeze ||= patch.freeFreeze ?? false;
  return mods;
}

/** 合并全部在身装备的常驻修正。 */
export function collectEquipModifiers(source: EquipmentSource): CombatModifiers {
  let mods: CombatModifiers = { ...NO_MODIFIERS };
  for (const def of definitionsOf(source)) {
    if (def.mods) mods = mergeModifiers(mods, def.mods);
  }
  return mods;
}
