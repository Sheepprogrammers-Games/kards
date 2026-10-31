import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadContent, STARTER_DECK } from '@content/index';
import { createRun } from '@engine/run';
import { loadSavedRun } from '../app';

const values = new Map<string, string>();

beforeAll(() => loadContent());

beforeEach(() => {
  values.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('存档兼容', () => {
  it('旧版存档与检查点获得新的 20 点基础生命，不丢失原有受伤量', () => {
    const run = createRun({ seedText: 'legacy-save', deck: [...STARTER_DECK], maxHp: 70 });
    run.hp = 45;
    run.checkpoint = structuredClone(run);
    run.checkpoint.checkpoint = null;
    run.checkpoint.hp = 30;

    const legacy = structuredClone(run) as unknown as Record<string, unknown>;
    delete legacy.energyBonus;
    delete legacy.handSizeBonus;
    delete legacy.drawBonus;
    const checkpoint = legacy.checkpoint as Record<string, unknown>;
    delete checkpoint.energyBonus;
    delete checkpoint.handSizeBonus;
    delete checkpoint.drawBonus;
    values.set('echoes.run', JSON.stringify(legacy));

    const loaded = loadSavedRun();
    expect(loaded).not.toBeNull();
    expect(loaded?.maxHp).toBe(90);
    expect(loaded?.hp).toBe(65);
    expect(loaded?.checkpoint?.maxHp).toBe(90);
    expect(loaded?.checkpoint?.hp).toBe(50);
  });

  it('新版存档不会重复获得基础生命迁移', () => {
    const run = createRun({ seedText: 'current-save', deck: [...STARTER_DECK], maxHp: 90 });
    run.hp = 62;
    values.set('echoes.run', JSON.stringify(run));

    const loaded = loadSavedRun();
    expect(loaded?.maxHp).toBe(90);
    expect(loaded?.hp).toBe(62);
  });
});
