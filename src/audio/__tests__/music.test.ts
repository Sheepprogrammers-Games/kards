import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

it('首次自动播放被拒绝后会在下一次用户手势中重试', async () => {
  const instances: FakeAudio[] = [];
  class FakeAudio extends EventTarget {
    loop = false;
    volume = 1;
    preload = '';
    paused = true;
    src = '';
    playCount = 0;

    constructor(_url: string) {
      super();
      instances.push(this);
    }

    play(): Promise<void> {
      this.playCount += 1;
      if (this.playCount === 1) return Promise.reject(new Error('NotAllowedError'));
      this.paused = false;
      return Promise.resolve();
    }

    pause(): void {
      this.paused = true;
    }
  }

  const page = new EventTarget();
  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('document', page);
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem: () => {},
  });
  vi.stubGlobal('requestAnimationFrame', () => 0);

  const { music } = await import('../music');
  music.play('title');
  await Promise.resolve();
  await Promise.resolve();

  expect(instances).toHaveLength(1);
  expect(instances[0]!.playCount).toBe(1);

  page.dispatchEvent(new Event('pointerdown'));
  await Promise.resolve();

  expect(instances[0]!.playCount).toBe(2);
  expect(instances[0]!.paused).toBe(false);
});
