/** 战斗引擎的数据模型。 */

export type Lane = 'player' | 'enemy';

export type CardType = 'weave' | 'ignite' | 'disrupt';

/** 效果原子在回响中的缩放行为。 */
export type ScaleMode = 'SCALAR' | 'COUNT' | 'ONCE' | 'THRESHOLD';

export type EffectKind =
  | 'damage'
  | 'block'
  | 'applyStatus'
  | 'selfStatus'
  | 'heal'
  | 'draw'
  | 'gainEnergy'
  | 'createCard';

export type StatusId =
  | 'poison'
  | 'burn'
  | 'regen'
  | 'vulnerable'
  | 'weak'
  | 'strength'
  | 'charge'
  | 'anchor'
  /** 受到近身伤害时反弹等量伤害给攻击方。 */
  | 'thorns'
  /** 承受伤害时把其中一半转嫁给攻击方，每层抵一次。 */
  | 'reflect'
  /** 承受伤害时按层数减免，每次减免消耗一层。 */
  | 'ward';

export type TargetSpec = 'self' | 'target' | 'allEnemies' | 'frontmost';

export interface Effect {
  kind: EffectKind;
  amount: number;
  scaleMode: ScaleMode;
  /** COUNT 模式下缩放的是段数而非单段数值。 */
  scaleTarget?: 'amount' | 'hits';
  hits?: number;
  status?: StatusId;
  /** THRESHOLD 模式的触发下限。 */
  threshold?: number;
  target?: TargetSpec;
  /** createCard 生成的卡牌定义与去向。 */
  cardId?: string;
  pile?: 'hand' | 'draw' | 'discard';
  /** 无视护甲直接扣生命。 */
  pierce?: boolean;
  /** 造成伤害后按比例回复生命。 */
  lifesteal?: number;
  /** 目标生命低于该比例时伤害翻倍。 */
  execute?: number;
  /** 击杀后的剩余伤害溢出到下一个敌人。 */
  overkill?: boolean;
  /** 状态在来源条目退场时归零。 */
  bindToEntry?: boolean;
}

/** 扰牌的轨道操作原语。 */
export type ManipulateKind =
  | 'push'
  | 'rewind'
  | 'swap'
  | 'copy'
  | 'steal'
  | 'freeze'
  | 'rerecord'
  | 'sustain'
  | 'evict'
  | 'preempt';

export interface Manipulation {
  kind: ManipulateKind;
  lane?: Lane;
  /** 省略时由玩家在 UI 中选择格位。 */
  slot?: number;
  slotB?: number;
  amount?: number;
}

export interface IgniteParams {
  /** 参与引爆的条目筛选，省略为全部。 */
  filter?: 'all' | 'oldest' | 'newest';
  count?: number;
}

export interface CardDef {
  id: string;
  name: string;
  type: CardType;
  cost: number;
  rarity: 'starter' | 'common' | 'uncommon' | 'rare' | 'curse';
  text: string;
  art?: string;
  effects: Effect[];
  /**
   * 条目走完整条时间轨、自然退场时额外结算的效果。
   * 被后续出牌挤出或被引爆的条目拿不到，因此构成一场关于轨位的对赌。
   */
  payoff?: Effect[];
  ignite?: IgniteParams;
  manipulations?: Manipulation[];
  /** 需要玩家指定敌人或格位。 */
  needsTarget?: boolean;
  needsSlot?: boolean;
  retain?: boolean;
  exhaust?: boolean;
  unplayable?: boolean;
  /** 每局开局时在基础版与这些变体之间抽定一版。 */
  variants?: CardVariant[];
}

/**
 * 同一张牌在不同局里的另一种写法。立绘与类别不变，
 * 只改写卡面文案与结算内容，未列出的字段沿用基础版。
 */
export interface CardVariant {
  text: string;
  cost?: number;
  effects?: Effect[];
  payoff?: Effect[];
  manipulations?: Manipulation[];
  ignite?: IgniteParams;
  needsTarget?: boolean;
  needsSlot?: boolean;
  retain?: boolean;
  exhaust?: boolean;
}

export interface CardInstance {
  uid: number;
  defId: string;
  upgraded: boolean;
}

/** 条目插入时冻结的施法方修正。 */
export interface CasterSnapshot {
  strength: number;
  weak: boolean;
  damageScale: number;
  statusPotency: number;
}

export interface TrackEntry {
  uid: number;
  cardId: string;
  owner: Lane;
  /** 玩家条目对应的牌，退场时按 reason 回到弃牌堆或烧毁堆。 */
  card?: CardInstance;
  sourceEnemy?: number;
  effects: Effect[];
  echoBudget: number;
  resolvedHere: boolean;
  rewindCount: number;
  delayCount: number;
  copyDepth: number;
  anchored: boolean;
  stolen: boolean;
  frozen: boolean;
  /** 意图专用：不可窃取、不可延后。 */
  unstealable?: boolean;
  undelayable?: boolean;
  /** 结算数值的固定倍率，用于窃取与抢拍。 */
  rateMod?: number;
  /** 自然走完全程后兑现的效果。 */
  payoff?: Effect[];
  snapshot: CasterSnapshot;
}

export type StatusBag = Partial<Record<StatusId, number>>;

export interface Combatant {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  block: number;
  statuses: StatusBag;
}

export interface PlayerState extends Combatant {
  energy: number;
  energyPerTurn: number;
  handSize: number;
  relics: string[];
}

export interface IntentOption {
  intentId: string;
  preferredSlot: number;
  weight: number;
}

/** 一条状态授予：给某个状态加指定层数。 */
export interface StatusGrant {
  status: StatusId;
  amount: number;
}

/** 战斗开场的行动顺序。 */
export type Initiative = 'player' | 'enemy';

/** 意图牌库的一项，copies 为该意图在牌库中的份数。 */
export interface IntentDeckEntry {
  intentId: string;
  copies: number;
}

/** 生命跌破阈值后切换的行为形态。 */
export interface EnemyPhase {
  /** 触发阈值，取当前生命与上限的比值。 */
  atHpRatio: number;
  name: string;
  intentsPerTurn?: number;
  intentScript: IntentOption[];
  /** 进入该形态时一次性获得的状态。 */
  onEnter?: StatusGrant[];
}

export interface EnemyState extends Combatant {
  defId: string;
  index: number;
  alive: boolean;
  charge: number;
  intentsPerTurn: number;
  intentScript: IntentOption[];
  /** 尚未触发的形态，按阈值从高到低排列。 */
  phases?: EnemyPhase[];
  phaseName?: string;
  /** 意图牌库的完整构成，抽空后据此重洗。 */
  intentPool?: IntentDeckEntry[];
  /** 牌库中尚未抽出的意图 id，按抽取顺序排列。 */
  intentDeck?: string[];
}

export interface IntentDef {
  id: string;
  name: string;
  kind: 'attack' | 'debuff' | 'buff' | 'defend';
  effects: Effect[];
  unstealable?: boolean;
  undelayable?: boolean;
  /** 这一击朝谁去，决定界面的演出方向。省略时由效果推导。 */
  aim?: 'player' | 'self';
  art?: string;
}

/** 遗物合并后的战斗修饰。引擎只读取字段，不认识具体遗物。 */
export interface CombatModifiers {
  coefTable?: number[];
  igniteEfficiency: number;
  energyPerTurn: number;
  handSize: number;
  echoBudget: number;
  startingBlock: number;
  startingStrength: number;
  drawPerTurn: number;
  salvageBurn: boolean;
  steadyIgnite: boolean;
  /** 被挤出的牌洗回抽牌堆，优先于 salvageBurn。 */
  salvageToDraw: boolean;
  /** 被挤出烧毁的条目照常兑现赌注。 */
  payoffOnBurn: boolean;
  /** 引爆后条目留在轨上，只保留一次结算。 */
  igniteKeepsEntry: boolean;
  /** 每回合第一张织牌不消耗能量。 */
  firstWeaveFree: boolean;
  /** 窃取来的意图按全额结算。 */
  fullSteal: boolean;
  /** 冻结不消耗结算次数。 */
  freeFreeze: boolean;
  /** 玩家条目的回拨次数上限增量。 */
  rewindBonus: number;
  /** 每回合延后敌方意图的额度增量。 */
  delayBonus: number;
}

export const NO_MODIFIERS: CombatModifiers = {
  igniteEfficiency: 1,
  energyPerTurn: 0,
  handSize: 0,
  echoBudget: 0,
  startingBlock: 0,
  startingStrength: 0,
  drawPerTurn: 0,
  salvageBurn: false,
  steadyIgnite: false,
  salvageToDraw: false,
  payoffOnBurn: false,
  igniteKeepsEntry: false,
  firstWeaveFree: false,
  fullSteal: false,
  freeFreeze: false,
  rewindBonus: 0,
  delayBonus: 0,
};

export type EquipSlot = 'weapon' | 'armor' | 'trinket' | 'core';

/** 槽位的固定排列顺序，界面与存档按此顺序遍历。 */
export const EQUIP_SLOT_ORDER: EquipSlot[] = ['weapon', 'armor', 'trinket', 'core'];

/**
 * 钩子的触发条件，按结算当时的战斗状态判定。
 * lowHp 与 enemyLow 比较生命与上限的半数，trackLoaded 要求己方轨道上留有条目，
 * ignited 要求本回合打出过引牌，evenTurn 只在偶数回合成立。
 */
export type EquipCondition = 'lowHp' | 'enemyLow' | 'trackLoaded' | 'ignited' | 'evenTurn';

export interface EquipmentDef {
  id: string;
  name: string;
  slot: EquipSlot;
  rarity: 'common' | 'uncommon' | 'rare';
  /** 卡面文案，说明每回合会发生什么。 */
  text: string;
  art: string;
  /** 常驻修正，与遗物共用一套字段。 */
  mods?: Partial<CombatModifiers>;
  /** 钩子的触发条件，省略为无条件触发。 */
  condition?: EquipCondition;
  /** 战斗开始时结算一次。 */
  onBattleStart?: Effect[];
  /** 玩家回合开始时结算一次。 */
  onTurnStart?: Effect[];
  /** 敌方回合结束时结算一次。 */
  onTurnEnd?: Effect[];
}

/** 每个槽位当前装备的 id，空槽为 null。 */
export type EquipmentLoadout = Record<EquipSlot, string | null>;

export type CombatPhase = 'playerTurn' | 'enemyTurn' | 'finished';

export type CombatResult = 'ongoing' | 'victory' | 'defeat';

export interface CombatEvent {
  type: string;
  [key: string]: unknown;
}

/** 装备结算时产生的事件，界面据此播放对应槽位的演出。 */
export interface EquipEvent extends CombatEvent {
  type: 'equip';
  slot: EquipSlot;
  equipId: string;
}

export interface CombatState {
  turn: number;
  phase: CombatPhase;
  result: CombatResult;
  rng: number;
  uidCounter: number;

  player: PlayerState;
  enemies: EnemyState[];
  /** 本场战斗生效的装备 id。 */
  equipment: string[];

  track: Record<Lane, (TrackEntry | null)[]>;

  hand: CardInstance[];
  drawPile: CardInstance[];
  discardPile: CardInstance[];
  exhaustPile: CardInstance[];
  burnedPile: CardInstance[];

  /** 遗物重塑后的系数表，总和已归一化。 */
  coefTable: number[];
  igniteEfficiencyMod: number;
  mods: CombatModifiers;

  weavePlays: number;
  /** 本回合已经用掉的延后格数。 */
  delaysThisTurn: number;
  igniteCountThisTurn: number;
  advanceCount: number;

  events: CombatEvent[];
}

export type CombatAction =
  | { type: 'playCard'; uid: number; targetIndex?: number; slot?: number; laneTarget?: Lane }
  | { type: 'endTurn' };

export type RewardKind =
  | 'card'
  | 'relic'
  | 'equipment'
  | 'gold'
  | 'heal'
  | 'removeCard'
  | 'upgradeCard'
  | 'nothing';

/** 战斗结算后提供的一项奖励。 */
export interface RewardOffer {
  kind: RewardKind;
  /** card / relic / equipment 的候选 id。 */
  options?: string[];
  amount?: number;
}

export type ShopItemKind =
  | 'card'
  | 'relic'
  | 'equipment'
  | 'removeCard'
  | 'upgradeCard'
  | 'supply';

/** 商店货架上的一件商品。 */
export interface ShopItem {
  kind: ShopItemKind;
  id?: string;
  price: number;
  /** supply 的回血量。 */
  amount?: number;
}
