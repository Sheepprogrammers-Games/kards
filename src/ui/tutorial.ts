/** 分阶段的机制提示。每条只在首次满足条件时出现一次。 */

const SEEN_KEY = 'echoes.tips';

export interface Tip {
  id: string;
  title: string;
  body: string;
}

export const TIPS: Record<string, Tip> = {
  firstWeave: {
    id: 'firstWeave',
    title: '牌没有消失',
    body:
      '你打出的织牌落在了时间轨的 T+1 格，并立刻按 100% 结算了一次。' +
      '它会留在轨上，在之后的每个回合再次触发。',
  },
  firstEcho: {
    id: 'firstEcho',
    title: '它自己又打了一次',
    body:
      '轨上的条目整体右移了一格，然后按新格位的系数重演。' +
      'T+2 是 70%，T+3 是 45%，T+4 是 25%，数值向下取整。' +
      '一张 5 点伤害的牌，一生能打出 14 点。',
  },
  firstPush: {
    id: 'firstPush',
    title: '轨道只有四格',
    body:
      '时间轨已经满了。再打出织牌会把最旧的条目挤出去，' +
      '被挤出的牌移出本场战斗，不会回到弃牌堆。' +
      '倾泻手牌换来的是节奏，代价是牌组本身。',
  },
  firstIgnite: {
    id: 'firstIgnite',
    title: '提前兑现',
    body:
      '引牌把轨上条目尚未兑现的回响一次性结算，然后清空它们。' +
      '兑换效率是六成，所以引爆是用效率换节奏的清算手段，不是白赚的爆发。',
  },
  firstIntent: {
    id: 'firstIntent',
    title: '敌人也在轨上',
    body:
      '上方那条泳道是敌人的意图，数字是它落地时造成的伤害。' +
      '它每回合右移一格，移出末位时结算。' +
      '扰牌可以把它往回推、抢先引爆、甚至偷到你自己的泳道上来。',
  },
};

function seen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function markSeen(id: string): void {
  const set = seen();
  set.add(id);
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
  } catch {}
}

export function hasSeen(id: string): boolean {
  return seen().has(id);
}

/** 展示一条提示，返回它是否真的被展示。 */
export function showTip(root: HTMLElement, tip: Tip): boolean {
  if (hasSeen(tip.id)) return false;
  markSeen(tip.id);

  const overlay = document.createElement('div');
  overlay.className = 'tip-overlay';

  const card = document.createElement('div');
  card.className = 'tip-card';

  const title = document.createElement('div');
  title.className = 'tip-title';
  title.textContent = tip.title;

  const body = document.createElement('div');
  body.className = 'tip-body';
  body.textContent = tip.body;

  const close = document.createElement('button');
  close.className = 'ghost-button';
  close.textContent = '知道了';

  card.append(title, body, close);
  overlay.append(card);
  root.append(overlay);

  const dismiss = () => overlay.remove();
  close.addEventListener('click', dismiss);
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) dismiss();
  });
  return true;
}

export function resetTips(): void {
  try {
    localStorage.removeItem(SEEN_KEY);
  } catch {}
}
