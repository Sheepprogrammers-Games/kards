/** 训练关。每一关只暴露机制的一层，牌组与敌人都固定。 */

import type { IntentOption } from '@engine/types';

export interface TutorialStage {
  id: string;
  name: string;
  goal: string;
  /** 进入时给出的说明，讲清这一关要看什么。 */
  brief: string;
  deck: string[];
  maxHp: number;
  enemy: {
    defId: string;
    name: string;
    maxHp: number;
    intentsPerTurn: number;
    intentScript: IntentOption[];
  };
}

export const TUTORIALS: TutorialStage[] = [
  {
    id: 'echo',
    name: '第一课 · 回响',
    goal: '打出一张牌，看它在之后的回合里自己重演',
    brief:
      '你只有攻击牌。打出一张后不要急着打第二张，先结束回合，' +
      '看时间轨上那张牌自己又打了一次。它每往后走一格，强度就降一档。',
    deck: ['threadbind', 'threadbind', 'threadbind', 'threadbind', 'threadbind', 'threadbind'],
    maxHp: 80,
    enemy: {
      defId: 'tick-mite',
      name: '训练木桩',
      maxHp: 46,
      intentsPerTurn: 1,
      intentScript: [{ intentId: 'chaff', preferredSlot: 4, weight: 1 }],
    },
  },
  {
    id: 'ignite',
    name: '第二课 · 引爆',
    goal: '铺满时间轨，再一次性清算',
    brief:
      '这一关多了引牌。先用织牌铺三到四格，再打出引牌，' +
      '它会把这些条目尚未兑现的回响一次性结算掉，效率六成。' +
      '注意轨道只有四格，第五张织牌会把最旧的那张挤出战斗。',
    deck: [
      'threadbind',
      'threadbind',
      'threadbind',
      'hourguard',
      'hourguard',
      'collapse',
      'collapse',
    ],
    maxHp: 80,
    enemy: {
      defId: 'gear-hound',
      name: '厚甲木桩',
      maxHp: 78,
      intentsPerTurn: 1,
      intentScript: [
        { intentId: 'chaff', preferredSlot: 4, weight: 3 },
        { intentId: 'harden', preferredSlot: 4, weight: 1 },
      ],
    },
  },
  {
    id: 'disrupt',
    name: '第三课 · 干预',
    goal: '把敌人的意图推开，别让它落地',
    brief:
      '敌人的意图挂在上方那条泳道，每回合右移一格，移出末位时才砸到你身上。' +
      '用扰牌把它往回推，或者抢先引爆。' +
      '鼠标移到导轨上方那排小点，就能看到完整的敌方轨道。',
    deck: [
      'threadbind',
      'threadbind',
      'hourguard',
      'hourguard',
      'shove',
      'shove',
      'foresight',
      'collapse',
    ],
    maxHp: 70,
    enemy: {
      defId: 'cracked-chorister',
      name: '裂音者',
      maxHp: 62,
      intentsPerTurn: 1,
      intentScript: [
        { intentId: 'discord', preferredSlot: 4, weight: 3 },
        { intentId: 'pounce', preferredSlot: 3, weight: 2 },
      ],
    },
  },
];
