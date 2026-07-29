/**
 * 程序化音效。全部由振荡器与噪声实时合成，不加载任何音频文件。
 *
 * 信号链：音源 → 声像 → 干声总线 ┐
 *                    └ 送入混响 ┴→ 压缩 → 输出
 * 混响用程序生成的脉冲响应，模拟石厅的长尾。
 */

interface ToneOptions {
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  decay?: number;
  sweepTo?: number;
  delay?: number;
  detune?: number;
  /** 送入混响的比例。 */
  send?: number;
  /** 立体声位置，-1 左 1 右。 */
  pan?: number;
  /** 频率抖动比例，避免每次完全一样。 */
  jitter?: number;
}

interface NoiseOptions {
  gain?: number;
  filter?: number;
  q?: number;
  delay?: number;
  sweepTo?: number;
  type?: BiquadFilterType;
  send?: number;
  pan?: number;
  /** 过载量。压平波峰，让瞬态在小音量下也听得出力度。 */
  drive?: number;
}

class Sfx {
  private ctx: AudioContext | null = null;
  private dry: GainNode | null = null;
  private wet: GainNode | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;

  /** 浏览器要求音频上下文在用户手势后创建。 */
  private ensure(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) this.build();
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private build(): void {
    const ctx = new AudioContext();
    this.ctx = ctx;

    // 总线压缩收住动态，避免多个音效叠加时爆音
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 22;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.18;

    const master = ctx.createGain();
    master.gain.value = 0.82;
    comp.connect(master).connect(ctx.destination);
    this.master = master;

    const dry = ctx.createGain();
    dry.gain.value = 1;
    dry.connect(comp);
    this.dry = dry;

    const convolver = ctx.createConvolver();
    convolver.buffer = this.makeImpulse(ctx, 2.4, 3.2);

    // 混响前切掉低频，长尾才不会糊成一团
    const wetFilter = ctx.createBiquadFilter();
    wetFilter.type = 'highpass';
    wetFilter.frequency.value = 320;

    const wet = ctx.createGain();
    wet.gain.value = 1;
    wet.connect(wetFilter).connect(convolver).connect(comp);
    this.wet = wet;

    this.noiseBuffer = this.makeNoise(ctx);
  }

  /** 指数衰减的随机脉冲，等价于一个石厅的混响尾巴。 */
  private makeImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const impulse = ctx.createBuffer(2, length, rate);

    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        // 前段留一小段安静，模拟早期反射的延迟
        const gate = t < 0.012 ? t / 0.012 : 1;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * gate;
      }
    }
    return impulse;
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const length = ctx.sampleRate * 1.4;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      // 轻度低通得到更接近自然噪声的频谱
      last = white * 0.32 + last * 0.68;
      data[i] = white * 0.7 + last * 0.9;
    }
    return buffer;
  }

  /** 把一个音源接进干湿两条总线。 */
  private route(node: AudioNode, send: number, pan: number): void {
    if (!this.ctx || !this.dry || !this.wet) return;
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    node.connect(panner);
    panner.connect(this.dry);

    if (send > 0) {
      const sendGain = this.ctx.createGain();
      sendGain.gain.value = send;
      panner.connect(sendGain).connect(this.wet);
    }
  }

  private tone(freq: number, duration: number, opts: ToneOptions = {}): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);

    const jitter = opts.jitter ?? 0.012;
    const base = freq * (1 + (Math.random() - 0.5) * jitter);

    const osc = ctx.createOscillator();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(base, t0);
    if (opts.sweepTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.sweepTo), t0 + duration);
    }
    if (opts.detune) osc.detune.value = opts.detune;

    const gain = ctx.createGain();
    const peak = opts.gain ?? 0.3;
    const attack = opts.attack ?? 0.006;
    const decay = opts.decay ?? duration;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);

    osc.connect(gain);
    this.route(gain, opts.send ?? 0.16, opts.pan ?? 0);
    osc.start(t0);
    osc.stop(t0 + duration + 0.4);
  }

  private noise(duration: number, opts: NoiseOptions = {}): void {
    const ctx = this.ensure();
    if (!ctx || !this.noiseBuffer) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;

    const filter = ctx.createBiquadFilter();
    filter.type = opts.type ?? 'bandpass';
    filter.frequency.setValueAtTime(opts.filter ?? 1400, t0);
    if (opts.sweepTo) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(60, opts.sweepTo), t0 + duration);
    }
    filter.Q.value = opts.q ?? 1.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(opts.gain ?? 0.2, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    const shaper = opts.drive ? this.shaper(ctx, opts.drive) : null;
    if (shaper) src.connect(filter).connect(shaper).connect(gain);
    else src.connect(filter).connect(gain);

    this.route(gain, opts.send ?? 0.12, opts.pan ?? 0);
    src.start(t0);
    src.stop(t0 + duration + 0.1);
  }

  /** 双曲正切过载曲线。归一化后不改变整体响度，只压平波峰。 */
  private shaper(ctx: AudioContext, amount: number): WaveShaperNode {
    const node = ctx.createWaveShaper();
    const size = 1024;
    const curve = new Float32Array(size);
    const norm = Math.tanh(amount);
    for (let i = 0; i < size; i++) {
      const x = (i / (size - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * amount) / norm;
    }
    node.curve = curve;
    node.oversample = '2x';
    return node;
  }

  /** 金属敲击：瞬态咔哒加一组非谐分音，尾巴送进混响。 */
  private metal(freq: number, duration: number, gain = 0.2, pan = 0): void {
    const partials = [1, 2.76, 5.4, 8.9];
    partials.forEach((ratio, i) => {
      this.tone(freq * ratio, duration * (1 - i * 0.16), {
        type: 'sine',
        gain: gain / (i + 1.4),
        attack: 0.002,
        send: 0.3,
        pan,
      });
    });
    this.noise(0.03, { gain: gain * 0.5, filter: freq * 3.2, q: 0.8, pan });
  }

  hover(): void {
    this.tone(1240, 0.045, { type: 'triangle', gain: 0.045, send: 0.08 });
  }

  pick(): void {
    this.tone(540, 0.07, { type: 'triangle', gain: 0.12, sweepTo: 820, send: 0.14 });
    this.noise(0.04, { gain: 0.06, filter: 3200, q: 2 });
  }

  play(cardId: string): void {
    const base = 300 + (cardId.charCodeAt(0) % 7) * 26;
    // 抽牌似的摩擦声打头，音高体加在后面
    this.noise(0.09, { gain: 0.11, filter: 2600, sweepTo: 900, q: 0.9 });
    this.tone(base, 0.14, { type: 'triangle', gain: 0.12, sweepTo: base * 1.5, send: 0.2 });
    this.tone(base * 2, 0.1, { type: 'sine', gain: 0.05, delay: 0.015, send: 0.24 });
  }

  /** 回响音高随格位系数下移，衰减在听觉上可辨。 */
  echo(coef: number): void {
    const base = 430 * (0.55 + coef * 0.7);
    this.metal(base, 0.42 + coef * 0.3, 0.1 + coef * 0.1);
    this.tone(base * 0.5, 0.34, {
      type: 'sine',
      gain: 0.06 * coef,
      sweepTo: base * 0.36,
      delay: 0.02,
      send: 0.4,
    });
  }

  /**
   * 玩家挨打。比打怪多一层次声波下潜与一段短促的耳鸣，
   * 让承伤与输出在听感上彻底分开。
   */
  playerHit(damage: number): void {
    const weight = Math.min(1, damage / 22);

    // 破空的前摇
    this.noise(0.07, { gain: 0.16, filter: 5200, sweepTo: 1400, q: 0.7, pan: -0.2 });

    // 皮开肉绽的高频瞬态，过载让它在小音量下也扎得住
    this.noise(0.022, {
      gain: 0.34 + weight * 0.22,
      filter: 3400,
      type: 'highpass',
      q: 0.6,
      drive: 3.4,
      send: 0.06,
    });

    // 撞击瞬态
    this.noise(0.05, {
      gain: 0.3 + weight * 0.2,
      filter: 1800 - weight * 700,
      q: 0.5,
      drive: 2.2 + weight * 1.4,
    });

    // 次声下潜，重击时压到 30Hz 以下
    this.tone(150 - weight * 60, 0.34, {
      type: 'sine',
      gain: 0.34 + weight * 0.16,
      sweepTo: 28,
      attack: 0.004,
      send: 0.2,
    });
    this.tone(76 - weight * 20, 0.5, {
      type: 'triangle',
      gain: 0.2 + weight * 0.14,
      sweepTo: 22,
      delay: 0.01,
      send: 0.26,
    });

    // 骨头闷响
    this.noise(0.3 + weight * 0.18, {
      gain: 0.16 + weight * 0.12,
      filter: 420,
      q: 0.9,
      send: 0.3,
      drive: 1.8,
    });

    // 重击后的短促耳鸣
    if (weight > 0.45) {
      this.tone(3100, 0.9, {
        type: 'sine',
        gain: 0.035 + weight * 0.03,
        attack: 0.02,
        delay: 0.05,
        send: 0.1,
        jitter: 0,
      });
    }
  }

  hit(damage: number): void {
    const weight = Math.min(1, damage / 22);
    // 瞬态、体、尾三层，重击时下潜更低
    this.noise(0.05, {
      gain: 0.22 + weight * 0.16,
      filter: 2600 - weight * 900,
      q: 0.6,
      drive: 1.6 + weight,
    });
    this.noise(0.16 + weight * 0.12, {
      gain: 0.16 + weight * 0.14,
      filter: 760 - weight * 320,
      q: 0.7,
      send: 0.2,
    });
    this.tone(128 - weight * 46, 0.2, {
      type: 'triangle',
      gain: 0.16 + weight * 0.1,
      sweepTo: 44,
      send: 0.24,
    });
  }

  block(): void {
    this.metal(690, 0.16, 0.12);
  }

  blocked(): void {
    this.metal(940, 0.1, 0.1);
    this.noise(0.07, { gain: 0.1, filter: 3400, q: 3.5 });
  }

  /** 烧毁：撕裂的高频扫落加一记低频坠地。 */
  burn(): void {
    this.noise(0.6, { gain: 0.2, filter: 4200, sweepTo: 210, q: 0.5, send: 0.3 });
    this.tone(150, 0.4, { type: 'sawtooth', gain: 0.14, sweepTo: 34, send: 0.28 });
    this.noise(0.2, { gain: 0.1, filter: 560, q: 0.8, delay: 0.05 });
  }

  detonate(): void {
    this.noise(0.06, { gain: 0.34, filter: 5200, q: 0.5 });
    this.tone(180, 0.55, { type: 'sawtooth', gain: 0.26, sweepTo: 34, send: 0.34 });
    this.tone(86, 0.66, { type: 'sine', gain: 0.3, sweepTo: 26, delay: 0.01, send: 0.3 });
    this.noise(0.5, { gain: 0.24, filter: 1500, sweepTo: 90, q: 0.5, send: 0.38 });
    this.metal(520, 0.4, 0.12);
  }

  /** 引爆前的蓄力上扬。 */
  charge(): void {
    this.tone(150, 0.36, { type: 'sawtooth', gain: 0.09, sweepTo: 620, send: 0.26 });
    this.noise(0.32, { gain: 0.06, filter: 420, sweepTo: 4600, q: 1.6, send: 0.2 });
  }

  /** 轨道整体推进的机械咬合。 */
  shift(): void {
    this.metal(210, 0.1, 0.1);
    this.noise(0.05, { gain: 0.1, filter: 3600, q: 3 });
    this.noise(0.05, { gain: 0.07, filter: 1100, q: 1.6, delay: 0.07 });
  }

  /** 意图脱轨飞向玩家。低频抽气打底，破空声由远及近。 */
  intent(): void {
    this.tone(680, 0.24, { type: 'sawtooth', gain: 0.14, sweepTo: 150, send: 0.3, pan: 0.2 });
    this.noise(0.26, {
      gain: 0.18,
      filter: 4400,
      sweepTo: 780,
      q: 1,
      send: 0.24,
      pan: -0.15,
      drive: 1.5,
    });
    this.tone(58, 0.3, { type: 'sine', gain: 0.16, sweepTo: 120, attack: 0.09, send: 0.14 });
  }

  disrupt(): void {
    this.tone(430, 0.18, { type: 'square', gain: 0.08, sweepTo: 660, send: 0.2 });
    this.noise(0.13, { gain: 0.09, filter: 3600, q: 4.5 });
  }

  death(): void {
    this.tone(240, 0.7, { type: 'sawtooth', gain: 0.15, sweepTo: 36, send: 0.4 });
    this.noise(0.72, { gain: 0.13, filter: 1200, sweepTo: 80, q: 0.6, send: 0.42 });
    this.metal(320, 0.6, 0.08);
  }

  /** 回合推进：金属传送带的机械停顿。 */
  turn(): void {
    this.metal(104, 0.22, 0.12);
    this.noise(0.08, { gain: 0.09, filter: 5400, q: 6, delay: 0.06 });
    this.tone(1560, 0.06, { type: 'sine', gain: 0.045, delay: 0.07, send: 0.3 });
  }

  setMuted(value: boolean): void {
    this.muted = value;
    if (this.master) this.master.gain.value = value ? 0 : 0.5;
  }
}

export const sfx = new Sfx();
