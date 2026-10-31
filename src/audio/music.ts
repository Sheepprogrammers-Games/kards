/**
 * 背景音乐播放。曲目缺失时静默跳过，不影响游戏运行。
 * 切换场景时交叉淡入淡出，同一首重复请求不会重头播放。
 * 音量整体压在音效之下，胜负演出音独占，播放期间循环曲停止。
 */

import { settings } from '@ui/settings';

const TRACKS = import.meta.glob('../../assets/audio/*.{mp3,ogg,m4a,aac,wav,opus,flac}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export type TrackId =
  | 'title'
  | 'map-act1'
  | 'map-act2'
  | 'map-act3'
  | 'battle'
  | 'elite'
  | 'boss-act1'
  | 'boss-act2'
  | 'boss-act3'
  | 'shop'
  | 'rest'
  | 'event';

export type StingerId = 'victory' | 'defeat';

/** 循环曲的基准音量。音效优先，音乐只铺底。 */
const BASE = 0.19;

/** 逐曲微调，用来抹平各曲母带响度的差异。 */
const TRIM: Partial<Record<TrackId | StingerId, number>> = {
  title: 1.15,
  event: 1.1,
  rest: 1.1,
  shop: 1.05,
  victory: 2.6,
  defeat: 2.4,
};

function urlOf(id: string): string | null {
  for (const [path, url] of Object.entries(TRACKS)) {
    // 源文件路径是 /title.m4a，产物是 /title-DcfTJreF.m4a，用 id 开头加扩展名或连字符都能命中
    if (path.includes(`/${id}.`) || path.includes(`/${id}-`)) return url;
  }
  return null;
}

const FADE_MS = 900;
/** 让位给演出音时收得快一些，避免两条旋律叠在一起。 */
const DUCK_MS = 260;

class Music {
  private current: HTMLAudioElement | null = null;
  private currentId: TrackId | null = null;
  private stinger: HTMLAudioElement | null = null;
  private waitingForGesture = false;
  /** 演出音放完后自动接上的曲目。中途手动切曲会取消。 */
  private resumeId: TrackId | null = null;

  private levelOf(id: TrackId | StingerId): number {
    return Math.min(1, BASE * (TRIM[id] ?? 1) * settings().musicVolume);
  }

  /** 切到指定曲目。缺文件时把当前曲目淡出后留空。 */
  play(id: TrackId): void {
    this.resumeId = null;
    // 演出音还没放完就换了场景，说明玩家已经走开，收掉它
    if (this.stinger) {
      this.fadeOut(this.stinger, DUCK_MS);
      this.stinger = null;
    }
    if (this.currentId === id && this.current) {
      this.applyVolume();
      return;
    }
    this.currentId = id;

    const previous = this.current;
    if (previous) this.fadeOut(previous, FADE_MS);

    const url = urlOf(id);
    if (!url) {
      this.current = null;
      return;
    }

    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0;
    audio.preload = 'auto';
    this.current = audio;

    this.tryPlay(audio);
    this.ramp(audio, settings().music ? this.levelOf(id) : 0, FADE_MS);
  }

  /**
   * 胜负演出音。先收掉循环曲再播，放完后接上 resume 指定的曲目。
   * 演出音期间调用 play 会取消这次接续。
   */
  sting(id: StingerId, resume: TrackId | null = null): void {
    const previous = this.current;
    if (previous) this.fadeOut(previous, DUCK_MS);
    this.current = null;
    this.currentId = null;

    this.stinger?.pause();
    this.stinger = null;

    const url = urlOf(id);
    if (!url || !settings().music) {
      if (resume) this.play(resume);
      return;
    }

    const audio = new Audio(url);
    audio.volume = this.levelOf(id);
    this.stinger = audio;
    this.resumeId = resume;

    audio.addEventListener('ended', () => {
      if (this.stinger !== audio) return;
      this.stinger = null;
      const next = this.resumeId;
      this.resumeId = null;
      if (next) this.play(next);
    });

    this.tryPlay(audio);
  }

  stop(): void {
    this.currentId = null;
    this.resumeId = null;
    if (this.current) this.fadeOut(this.current, FADE_MS);
    this.current = null;
    this.stinger?.pause();
    this.stinger = null;
  }

  /** 设置里改了开关后调用。 */
  applyVolume(): void {
    const on = settings().music;
    if (this.stinger) this.stinger.volume = on ? this.levelOf('victory') : 0;
    if (!this.current || !this.currentId) return;
    this.ramp(this.current, on ? this.levelOf(this.currentId) : 0, 300);
    if (on && this.current.paused) {
      this.tryPlay(this.current);
    }
  }

  /** 页面首次点击后取回被浏览器挡下的播放权。 */
  resumeAfterGesture(): void {
    const audio = this.stinger ?? this.current;
    if (!audio || !audio.paused) return;
    this.tryPlay(audio);
  }

  private tryPlay(audio: HTMLAudioElement): void {
    void audio.play().catch(() => this.waitForGesture());
  }

  /** 自动播放被拒绝后，在下一次真实用户手势里同步重试。 */
  private waitForGesture(): void {
    if (this.waitingForGesture) return;
    this.waitingForGesture = true;

    const wake = () => {
      document.removeEventListener('pointerdown', wake, true);
      document.removeEventListener('keydown', wake, true);
      this.waitingForGesture = false;
      this.resumeAfterGesture();
    };
    document.addEventListener('pointerdown', wake, { once: true, capture: true });
    document.addEventListener('keydown', wake, { once: true, capture: true });
  }

  private fadeOut(audio: HTMLAudioElement, duration: number): void {
    this.ramp(audio, 0, duration, () => {
      audio.pause();
      audio.src = '';
    });
  }

  private ramp(
    audio: HTMLAudioElement,
    target: number,
    duration: number,
    done?: () => void,
  ): void {
    const from = audio.volume;
    const start = performance.now();

    const step = () => {
      const t = Math.min(1, (performance.now() - start) / duration);
      audio.volume = Math.max(0, Math.min(1, from + (target - from) * t));
      if (t < 1) requestAnimationFrame(step);
      else done?.();
    };
    requestAnimationFrame(step);
  }
}

export const music = new Music();
