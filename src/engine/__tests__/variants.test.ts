import { describe, expect, it, beforeAll, afterEach } from 'vitest';
import { loadContent, STARTER_DECK } from '@content/index';
import {
  allCards,
  applyVariants,
  baseCardDef,
  cardDef,
  variantCount,
  variantOf,
} from '../registry';
import { createRun, rollVariants } from '../run';
import { seedFrom, type RngHolder } from '../rng';

beforeAll(() => loadContent());
afterEach(() => applyVariants({}));

const withVariants = () => allCards().filter((def) => (def.variants?.length ?? 0) > 0);

describe('卡牌版本', () => {
  it('有变体的牌，版本数等于变体数加基础版', () => {
    for (const def of withVariants()) {
      expect(variantCount(def.id)).toBe(def.variants!.length + 1);
    }
  });

  it('第 0 版就是基础版，之后依次对应每条变体', () => {
    const def = withVariants()[0]!;
    expect(variantOf(def, 0)).toBe(def);
    expect(variantOf(def, 1).text).toBe(def.variants![0]!.text);
  });

  it('变体只改写结算内容，立绘与类别保持不变', () => {
    for (const def of withVariants()) {
      for (let i = 1; i <= def.variants!.length; i++) {
        const shifted = variantOf(def, i);
        expect(shifted.id).toBe(def.id);
        expect(shifted.art).toBe(def.art);
        expect(shifted.type).toBe(def.type);
        expect(shifted.rarity).toBe(def.rarity);
        expect(shifted.name).toBe(def.name);
      }
    }
  });

  it('装上一套版本后，查表返回的就是那一版', () => {
    const def = withVariants()[0]!;
    applyVariants({ [def.id]: 1 });
    expect(cardDef(def.id).text).toBe(def.variants![0]!.text);

    applyVariants({});
    expect(cardDef(def.id).text).toBe(def.text);
  });

  it('原始定义始终可以取回，不受装上的版本影响', () => {
    const def = withVariants()[0]!;
    applyVariants({ [def.id]: 1 });
    expect(baseCardDef(def.id)?.text).toBe(def.text);
  });

  it('越界的版本号退回基础版', () => {
    const def = withVariants()[0]!;
    expect(variantOf(def, 99).text).toBe(def.text);
  });

  it('同一颗种子抽出同一套版本', () => {
    const roll = (seed: string) => {
      const holder: RngHolder = { rng: seedFrom(seed) };
      return rollVariants(holder);
    };
    expect(roll('same-seed')).toEqual(roll('same-seed'));
  });

  it('开局把版本写进进程状态，只覆盖有变体的牌', () => {
    const run = createRun({ seedText: 'run-seed', deck: STARTER_DECK, maxHp: 70 });
    const ids = new Set(withVariants().map((def) => def.id));
    for (const id of Object.keys(run.variants)) {
      expect(ids.has(id)).toBe(true);
    }
    expect(Object.keys(run.variants).length).toBe(ids.size);
  });
});
