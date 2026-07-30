import { expect, it, beforeAll } from 'vitest';
import { loadContent, STARTER_DECK } from '@content/index';
import { ENEMIES } from '@content/enemies';
import { allCards, applyVariants, baseCardDef, cardDef } from '../registry';
import { rollVariants } from '../run';
import { canPlay, createCombat, reduce } from '../combat';
import { countEntries } from '../track';
import { seedFrom, type RngHolder } from '../rng';
import type { CombatState } from '../types';

beforeAll(() => loadContent());

function takeTurn(state: CombatState): CombatState {
  let current = state;
  for (let guard = 0; guard < 12; guard++) {
    const playable = current.hand.filter((c) => canPlay(current, c.uid));
    if (!playable.length) break;
    const ranked = playable.slice().sort((a, b) => {
      const da = cardDef(a.defId);
      const db = cardDef(b.defId);
      const score = (t: string) =>
        t === 'weave' ? 3 : t === 'ignite' && countEntries(current, 'player') >= 3 ? 2 : 1;
      return score(db.type) - score(da.type) || db.cost - da.cost;
    });
    const pick = ranked[0];
    if (!pick) break;
    const def = cardDef(pick.defId);
    const next = reduce(current, {
      type: 'playCard',
      uid: pick.uid,
      targetIndex: 0,
      slot: def.needsSlot ? 4 : undefined,
      laneTarget: def.needsSlot ? 'enemy' : undefined,
    });
    if (next === current) break;
    current = next;
    if (current.result !== 'ongoing') return current;
  }
  return reduce(current, { type: 'endTurn' });
}

const TARGETS = ENEMIES.filter((e) => e.tier === 'elite' || e.tier === 'boss').slice(0, 6);

function rate(deck: string[] = STARTER_DECK, seeds = 14): { win: number; turns: number } {
  let wins = 0;
  let turns = 0;
  let n = 0;
  let wonTurns = 0;
  for (const target of TARGETS) {
    for (let seed = 1; seed <= seeds; seed++) {
      let state = createCombat({
        seed: seed * 7919,
        deck: deck.map((defId) => ({ defId, upgraded: false })),
        maxHp: 70,
        enemies: [
          {
            defId: target.id,
            name: target.name,
            maxHp: target.maxHp[0],
            intentsPerTurn: target.intentsPerTurn,
            intentScript: target.intentScript,
            startingStatuses: target.startingStatuses,
            initiative: target.initiative,
            deck: target.deck,
          },
        ],
      });
      for (let t = 0; t < 60 && state.result === 'ongoing'; t++) state = takeTurn(state);
      if (state.result === 'victory') {
        wins++;
        wonTurns += state.turn;
      }
      turns += state.turn;
      n++;
    }
  }
  // 只用打赢的场次算轮数，否则打不过的场次会把上限带进平均值
  return { win: (wins / n) * 100, turns: wins ? wonTurns / wins : 0 };
}

it('各局的版本组合应当分布在基础版两侧', () => {
  applyVariants({});
  const base = rate();
  console.log(`\n基础版全套            胜率 ${base.win.toFixed(0)}%  均轮 ${base.turns.toFixed(1)}`);

  const rows: number[] = [];
  for (const seedText of ['run-a', 'run-b', 'run-c', 'run-d', 'run-e', 'run-f', 'run-g', 'run-h']) {
    const holder: RngHolder = { rng: seedFrom(seedText) };
    applyVariants(rollVariants(holder));
    const r = rate();
    rows.push(r.win);
    console.log(
      `${seedText}                胜率 ${r.win.toFixed(0)}%  胜局均轮 ${r.turns.toFixed(1)}` +
        `  偏移 ${r.win - base.win > 0 ? '+' : ''}${(r.win - base.win).toFixed(0)}%`,
    );
  }
  const above = rows.filter((w) => w > base.win).length;
  console.log(`\n八局中强于基础版的 ${above} 局，弱于或持平的 ${rows.length - above} 局`);

  for (const id of STARTER_DECK.filter((id, i, all) => all.indexOf(id) === i)) {
    for (let v = 1; v <= 2; v++) {
      applyVariants({ [id]: v });
      const r = rate();
      if (r.win === base.win && Math.abs(r.turns - base.turns) < 0.05) continue;
      console.log(
        `${(id + '#' + v).padEnd(20)} 胜率 ${r.win.toFixed(0)}%  胜局均轮 ${r.turns.toFixed(1)}`,
      );
    }
  }

  // 变体是换打法而不是变强。若每一局都强于基础版，说明整体上调了
  expect(above).toBeLessThanOrEqual(5);
  applyVariants({});
});

/**
 * 起始牌组之外的牌靠探组覆盖：把待测的牌塞两张进一副固定骨架，
 * 先量它的基础版，再逐版本量偏移。同一副牌里比较，偏移只反映该版本自身。
 */
const PROBE_FRAME = [
  'threadbind',
  'threadbind',
  'threadbind',
  'hourguard',
  'hourguard',
  'hourguard',
  'collapse',
  'collapse',
  'shove',
  'foresight',
];

it('每张牌的各个版本都应当贴着自己的基础版', () => {
  const cards = allCards()
    .map((def) => baseCardDef(def.id)!)
    .filter((def) => (def.variants?.length ?? 0) > 0);

  const rows: string[] = [];
  const offsets: { label: string; delta: number }[] = [];

  for (const def of cards) {
    const deck = [def.id, def.id, ...PROBE_FRAME];
    applyVariants({});
    const base = rate(deck, 10);
    const parts: string[] = [];
    for (let v = 1; v <= def.variants!.length; v++) {
      applyVariants({ [def.id]: v });
      const r = rate(deck, 10);
      const delta = r.win - base.win;
      offsets.push({ label: `${def.id}#${v}`, delta });
      parts.push(`#${v} ${r.win.toFixed(0)}%(${delta >= 0 ? '+' : ''}${delta.toFixed(0)})`);
    }
    rows.push(
      `${def.id.padEnd(18)} ${def.type.padEnd(8)} 基础 ${base.win.toFixed(0).padStart(3)}%  ${parts.join('  ')}`,
    );
  }
  applyVariants({});

  console.log('\n' + rows.join('\n'));

  const strong = offsets.filter((o) => o.delta > 15);
  const weak = offsets.filter((o) => o.delta < -15);
  const mean = offsets.reduce((a, b) => a + b.delta, 0) / offsets.length;
  console.log(
    `\n共 ${offsets.length} 个版本，平均偏移 ${mean.toFixed(1)} 点` +
      `，强出 15 点以上 ${strong.length} 个，弱出 15 点以上 ${weak.length} 个`,
  );
  console.log(`强出：${strong.map((o) => `${o.label}${o.delta.toFixed(0)}`).join(' ') || '无'}`);
  console.log(`弱出：${weak.map((o) => `${o.label}${o.delta.toFixed(0)}`).join(' ') || '无'}`);

  // 弱出一侧不留缺口：抽到某一版不该等于开局就吃亏
  expect(weak.length).toBeLessThanOrEqual(2);
  // 强出一侧允许个别案例，但全库的平均偏移必须贴着零
  expect(strong.length).toBeLessThanOrEqual(12);
  expect(mean).toBeLessThanOrEqual(4);
}, 300000);
