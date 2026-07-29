/** 画布特效层。前景负责打击与回响，背景负责环境浮尘。 */

import { onSettingsChange, settings } from '@ui/settings';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  sat: number;
  light: number;
  gravity: number;
  drag: number;
}

interface Ring {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  radius: number;
  width: number;
  hue: number;
  spread: number;
}

/** travel 为真时按 life 推进弹头，否则整条同时显现并衰减。 */
interface Beam {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  maxLife: number;
  hue: number;
  width: number;
  travel: boolean;
}

const GOLD = 42;
const ECHO = 325;
const DANGER = 6;

const FRAME = 1 / 60;

class FxLayer {
  private front!: HTMLCanvasElement;
  private back!: HTMLCanvasElement;
  private fctx!: CanvasRenderingContext2D;
  private bctx!: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private beams: Beam[] = [];
  private dust: Particle[] = [];
  private shake = 0;
  private frame = 0;
  private flashAmount = 0;
  private flashHue = GOLD;
  private holdUntil = 0;
  private running = false;
  private stage: HTMLElement | null = null;
  private width = 0;
  private height = 0;
  private last = 0;
  /** 前景上一帧是否留有内容，用于跳过空闲时的清屏。 */
  private painted = false;
  /** 是否有覆盖全屏的弹层。弹层带背景模糊，底下一动就要整屏重算。 */
  private covered = false;
  private coverCheck = 0;
  /** 帧耗时滑动均值，驱动自动降级。 */
  private avgFrame = FRAME;
  private sampled = 0;
  /** 自动降级系数，与设置里的强度相乘决定实际密度。 */
  private autoScale = 1;
  /** 预渲染的粒子贴图，按色相与明暗分桶，避免每帧走渐变。 */
  private sprites = new Map<number, HTMLCanvasElement>();
  private static readonly MAX_PARTICLES = 420;

  attach(front: HTMLCanvasElement, back: HTMLCanvasElement): void {
    this.front = front;
    this.back = back;
    this.stage = document.getElementById('stage');
    this.fctx = front.getContext('2d')!;
    this.bctx = back.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      this.last = performance.now();
    });
    onSettingsChange(() => this.resize());
    if (!this.running) {
      this.running = true;
      this.last = performance.now();
      requestAnimationFrame(this.tick);
    }
  }

  /** 强度越低画布像素越少，前景填充率是这一层的主要开销。 */
  private renderScale(): number {
    const quality = settings().quality;
    const cap = quality >= 1 ? 2 : quality >= 0.6 ? 1.5 : 1;
    return Math.min(window.devicePixelRatio || 1, cap);
  }

  private resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    const scale = this.renderScale();
    this.front.width = this.width * scale;
    this.front.height = this.height * scale;
    this.fctx.setTransform(scale, 0, 0, scale, 0, 0);

    const backScale = Math.min(scale, 1);
    this.back.width = this.width * backScale;
    this.back.height = this.height * backScale;
    this.bctx.setTransform(backScale, 0, 0, backScale, 0, 0);

    this.seedDust();
    this.painted = true;
  }

  /** 当前粒子密度。设置档位与自动降级共同决定。 */
  private density(): number {
    return settings().quality * this.autoScale;
  }

  private count(base: number): number {
    return Math.max(1, Math.round(base * this.density()));
  }

  /** 一张贴图覆盖一档色相与明暗，直接贴到画布上比逐个描边快得多。 */
  private sprite(hue: number, sat: number, light: number): HTMLCanvasElement {
    const h = Math.round(hue / 12) * 12;
    const s = sat < 40 ? 20 : 88;
    const l = light < 62 ? 46 : 74;
    const key = h * 100 + (s === 20 ? 0 : 10) + (l === 46 ? 0 : 1);

    const cached = this.sprites.get(key);
    if (cached) return cached;

    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, `hsla(${h}, ${s}%, ${Math.min(92, l + 16)}%, 1)`);
    grad.addColorStop(0.35, `hsla(${h}, ${s}%, ${l}%, 0.7)`);
    grad.addColorStop(1, `hsla(${h}, ${s}%, ${l}%, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    this.sprites.set(key, canvas);
    return canvas;
  }

  /** 超出上限时丢弃最旧的粒子，保持帧率稳定。 */
  private trim(): void {
    const cap = Math.max(90, Math.round(FxLayer.MAX_PARTICLES * this.density()));
    const over = this.particles.length - cap;
    if (over > 0) this.particles.splice(0, over);
  }

  private seedDust(): void {
    const area = this.width * this.height;
    const count = Math.round((area / 26000) * Math.max(0.3, settings().quality));
    this.dust.length = 0;
    for (let i = 0; i < count; i++) {
      this.dust.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -0.06 - Math.random() * 0.14,
        life: 1,
        maxLife: 1,
        size: 0.6 + Math.random() * 1.7,
        hue: GOLD,
        sat: 70,
        light: 60 + Math.random() * 20,
        gravity: 0,
        drag: 1,
      });
    }
  }

  /** 命中迸发。 */
  impact(pos: { x: number; y: number }, hue = GOLD, count = 26): void {
    const n = this.count(count);
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.6 + Math.random() * 5.4;
      this.particles.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1,
        maxLife: 0.5 + Math.random() * 0.5,
        size: 1.4 + Math.random() * 2.8,
        hue: hue + (Math.random() - 0.5) * 18,
        sat: 85,
        light: 62 + Math.random() * 22,
        gravity: 0.16,
        drag: 0.965,
      });
    }
    this.shake = Math.min(9, this.shake + 4.5 * settings().shake);
    this.trim();
  }

  /** 回响脉冲。强度随格位系数衰减。 */
  echoRipple(pos: { x: number; y: number }, coef: number): void {
    this.rings.push({
      x: pos.x,
      y: pos.y,
      life: 1,
      maxLife: 0.55,
      radius: 14,
      width: 2 + coef * 3,
      hue: ECHO,
      spread: 90 + coef * 150,
    });
    const n = this.count(6 + coef * 12);
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.7 + Math.random() * 2.4 * coef;
      this.particles.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 0.45 + Math.random() * 0.4,
        size: 1 + Math.random() * 2,
        hue: ECHO,
        sat: 78,
        light: 60 + Math.random() * 20,
        gravity: -0.02,
        drag: 0.97,
      });
    }
  }

  /** 条目被挤出战斗。上扬的火星与下坠的灰烬同时产生。 */
  burn(pos: { x: number; y: number }): void {
    this.rings.push({
      x: pos.x,
      y: pos.y,
      life: 1,
      maxLife: 0.5,
      radius: 10,
      width: 4,
      hue: 24,
      spread: 120,
    });
    const sparks = this.count(46);
    for (let i = 0; i < sparks; i++) {
      this.particles.push({
        x: pos.x + (Math.random() - 0.5) * 52,
        y: pos.y + (Math.random() - 0.5) * 36,
        vx: (Math.random() - 0.5) * 1.6,
        vy: -1.1 - Math.random() * 2.4,
        life: 1,
        maxLife: 0.8 + Math.random() * 0.7,
        size: 1.2 + Math.random() * 3,
        hue: 14 + Math.random() * 30,
        sat: 94,
        light: 58 + Math.random() * 26,
        gravity: -0.03,
        drag: 0.985,
      });
    }
    const ash = this.count(22);
    for (let i = 0; i < ash; i++) {
      this.particles.push({
        x: pos.x + (Math.random() - 0.5) * 50,
        y: pos.y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 1.4,
        vy: 0.4 + Math.random() * 1.2,
        life: 1,
        maxLife: 0.9 + Math.random() * 0.8,
        size: 0.9 + Math.random() * 1.8,
        hue: 20,
        sat: 12,
        light: 26 + Math.random() * 18,
        gravity: 0.11,
        drag: 0.99,
      });
    }
    this.flash(0.16, 22);
    this.shake = Math.min(12, this.shake + 7);
    this.trim();
  }

  /**
   * 承伤的落点冲击。比引爆更短更硬，碎片朝背离来向的一侧甩出。
   * weight 为 0..1 的力度。
   */
  slam(pos: { x: number; y: number }, weight = 1): void {
    this.rings.push({
      x: pos.x,
      y: pos.y,
      life: 1,
      maxLife: 0.3 + weight * 0.16,
      radius: 8,
      width: 6 + weight * 6,
      hue: DANGER,
      spread: 220 + weight * 260,
    });

    const n = this.count(20 + Math.round(weight * 34));
    for (let i = 0; i < n; i++) {
      // 碎片集中在下半圈，读起来像被砸落而不是四散
      const angle = Math.PI * (0.08 + Math.random() * 0.84);
      const speed = 3 + Math.random() * (5 + weight * 7);
      this.particles.push({
        x: pos.x + (Math.random() - 0.5) * 26,
        y: pos.y + (Math.random() - 0.5) * 18,
        vx: Math.cos(angle) * speed * (Math.random() < 0.5 ? -1 : 1),
        vy: Math.sin(angle) * speed * 0.7,
        life: 1,
        maxLife: 0.35 + Math.random() * 0.4,
        size: 1.6 + Math.random() * (2.4 + weight * 2),
        hue: DANGER + (Math.random() - 0.5) * 16,
        sat: 88,
        light: 56 + Math.random() * 26,
        gravity: 0.34,
        drag: 0.94,
      });
    }

    this.flash(0.2 + weight * 0.3, DANGER);
    this.shake = Math.min(34, this.shake + (12 + weight * 16) * settings().shake);
    this.trim();
  }

  /** 引爆冲击波。默认落在玩家轨道中央。 */
  shockwave(pos?: { x: number; y: number }): void {
    const x = pos?.x ?? this.width / 2;
    const y = pos?.y ?? this.height * 0.58;
    this.rings.push({ x, y, life: 1, maxLife: 0.75, radius: 18, width: 9, hue: ECHO, spread: 460 });
    this.rings.push({ x, y, life: 1, maxLife: 0.95, radius: 18, width: 5, hue: GOLD, spread: 340 });
    this.rings.push({ x, y, life: 1, maxLife: 1.15, radius: 18, width: 2, hue: ECHO, spread: 620 });
    this.impact({ x, y }, ECHO, 90);
    this.impact({ x, y }, GOLD, 40);
    this.flash(0.5, ECHO);
    this.hold(90);
    this.shake = 26 * settings().shake;
  }

  /** 两点之间的射线。travel 为真时表现为飞行弹体。 */
  beam(
    from: { x: number; y: number },
    to: { x: number; y: number },
    hue = ECHO,
    opts: { travel?: boolean; width?: number; duration?: number } = {},
  ): void {
    this.beams.push({
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      life: 1,
      maxLife: opts.duration ?? 0.34,
      hue,
      width: opts.width ?? 3,
      travel: opts.travel ?? false,
    });
  }

  /** 敌方意图落点的飞行弹体。 */
  bolt(from: { x: number; y: number }, to: { x: number; y: number }, seconds = 0.24): void {
    this.beam(from, to, DANGER, { travel: true, width: 5, duration: seconds });
  }

  /** 全屏加色闪光，随帧衰减。 */
  flash(amount: number, hue = GOLD): void {
    this.flashAmount = Math.min(0.85, Math.max(this.flashAmount, amount));
    this.flashHue = hue;
  }

  /** 定格。粒子与射线在此期间停止推进但继续绘制。 */
  hold(ms: number): void {
    this.holdUntil = performance.now() + ms;
  }

  /** 附加屏幕震动，强度受设置缩放。 */
  nudge(amount: number): void {
    this.shake = Math.min(30, this.shake + amount * settings().shake);
  }

  /** 连续掉帧时压低密度，帧率回稳后逐步放开。 */
  private adapt(dt: number): void {
    this.avgFrame = this.avgFrame * 0.92 + dt * 0.08;
    if (++this.sampled < 30) return;
    this.sampled = 0;
    if (this.avgFrame > 0.024) this.autoScale = Math.max(0.35, this.autoScale - 0.15);
    else if (this.avgFrame < 0.019) this.autoScale = Math.min(1, this.autoScale + 0.08);
  }

  private tick = (): void => {
    requestAnimationFrame(this.tick);

    const now = performance.now();
    const raw = (now - this.last) / 1000;
    this.last = now;
    if (document.hidden) return;

    // 掉帧或切回标签页时钳住步长，避免位移一次跳过整段轨迹
    const dt = Math.min(raw, 0.05);
    const k = dt / FRAME;
    const w = this.width;
    const h = this.height;

    if (--this.coverCheck <= 0) {
      this.coverCheck = 15;
      this.covered = document.querySelector('.overlay, .tip-overlay') !== null;
    }

    // 浮尘变化缓慢，隔帧重绘即可；弹层遮住时索性停下
    this.frame = (this.frame + 1) % 2;
    if (this.frame === 0 && this.dust.length && !this.covered) {
      this.bctx.clearRect(0, 0, w, h);
      this.bctx.globalCompositeOperation = 'lighter';
      this.bctx.globalAlpha = 0.32;
      const dustSprite = this.sprite(GOLD, 70, 70);
      const move = k * 2;
      for (const p of this.dust) {
        p.x += p.vx * move;
        p.y += p.vy * move;
        if (p.y < -10) {
          p.y = h + 10;
          p.x = Math.random() * w;
        }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        const r = p.size * 2.4;
        this.bctx.drawImage(dustSprite, p.x - r, p.y - r, r * 2, r * 2);
      }
      this.bctx.globalAlpha = 1;
    }

    const busy =
      this.particles.length > 0 ||
      this.rings.length > 0 ||
      this.beams.length > 0 ||
      this.flashAmount > 0.01 ||
      this.shake > 0.2;

    if (!busy) {
      // 空闲时只需把上一帧残留擦掉一次
      if (this.painted) {
        this.fctx.clearRect(0, 0, w, h);
        this.painted = false;
      }
      if (this.shake !== 0) {
        this.shake = 0;
        if (this.stage) this.stage.style.transform = '';
      }
      return;
    }

    this.adapt(dt);

    const held = now < this.holdUntil;
    const step = held ? 0 : dt;
    const advance = held ? 0 : k;

    this.fctx.clearRect(0, 0, w, h);
    this.painted = true;
    this.fctx.save();

    if (this.shake > 0.2) {
      const s = this.shake;
      this.fctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
      // 只位移舞台层，改 body 会触发整页重排
      if (this.stage) {
        this.stage.style.transform = `translate3d(${(Math.random() - 0.5) * s * 0.55}px, ${
          (Math.random() - 0.5) * s * 0.55
        }px, 0)`;
      }
      if (!held) this.shake *= Math.max(0, 1 - 0.14 * k);
    } else if (this.shake !== 0) {
      this.shake = 0;
      if (this.stage) this.stage.style.transform = '';
    }

    this.fctx.globalCompositeOperation = 'lighter';
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.life -= step / p.maxLife;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      if (!held) {
        const drag = 1 - (1 - p.drag) * advance;
        p.vx *= drag;
        p.vy = p.vy * drag + p.gravity * advance;
        p.x += p.vx * advance;
        p.y += p.vy * advance;
      }

      this.fctx.globalAlpha = Math.min(1, p.life * 1.4);
      const r = p.size * p.life * 2.6;
      this.fctx.drawImage(this.sprite(p.hue, p.sat, p.light), p.x - r, p.y - r, r * 2, r * 2);
    }
    this.fctx.globalAlpha = 1;

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]!;
      r.life -= step / r.maxLife;
      if (r.life <= 0) {
        this.rings.splice(i, 1);
        continue;
      }
      const t = 1 - r.life;
      const radius = r.radius + t * (2 - t) * r.spread;
      this.fctx.strokeStyle = `hsla(${r.hue}, 82%, 66%, ${r.life * 0.75})`;
      this.fctx.lineWidth = r.width * r.life;
      this.fctx.beginPath();
      this.fctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
      this.fctx.stroke();
    }

    this.fctx.lineCap = 'round';
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i]!;
      b.life -= step / b.maxLife;
      if (b.life <= 0) {
        this.beams.splice(i, 1);
        continue;
      }
      const t = 1 - b.life;
      if (b.travel) {
        const hx = b.x1 + (b.x2 - b.x1) * t;
        const hy = b.y1 + (b.y2 - b.y1) * t;
        const tailT = Math.max(0, t - 0.26);
        const tx = b.x1 + (b.x2 - b.x1) * tailT;
        const ty = b.y1 + (b.y2 - b.y1) * tailT;
        this.fctx.strokeStyle = `hsla(${b.hue}, 90%, 66%, 0.85)`;
        this.fctx.lineWidth = b.width;
        this.fctx.beginPath();
        this.fctx.moveTo(tx, ty);
        this.fctx.lineTo(hx, hy);
        this.fctx.stroke();
        this.fctx.fillStyle = `hsla(${b.hue}, 95%, 76%, 0.95)`;
        this.fctx.beginPath();
        this.fctx.arc(hx, hy, b.width * 1.5, 0, Math.PI * 2);
        this.fctx.fill();
        if (!held && Math.random() < this.density()) {
          this.particles.push({
            x: hx,
            y: hy,
            vx: (Math.random() - 0.5) * 0.9,
            vy: (Math.random() - 0.5) * 0.9,
            life: 1,
            maxLife: 0.3 + Math.random() * 0.25,
            size: 1 + Math.random() * 2,
            hue: b.hue,
            sat: 88,
            light: 62,
            gravity: 0.02,
            drag: 0.94,
          });
        }
      } else {
        this.fctx.strokeStyle = `hsla(${b.hue}, 88%, 70%, ${b.life * 0.8})`;
        this.fctx.lineWidth = b.width * b.life;
        this.fctx.beginPath();
        this.fctx.moveTo(b.x1, b.y1);
        this.fctx.lineTo(b.x2, b.y2);
        this.fctx.stroke();
      }
    }

    if (this.flashAmount > 0.01) {
      this.fctx.fillStyle = `hsla(${this.flashHue}, 90%, 72%, ${this.flashAmount * 0.42})`;
      this.fctx.fillRect(-40, -40, w + 80, h + 80);
      if (!held) this.flashAmount *= Math.max(0, 1 - 0.2 * k);
    } else {
      this.flashAmount = 0;
    }
    this.fctx.restore();
  };
}

export const fx = new FxLayer();
