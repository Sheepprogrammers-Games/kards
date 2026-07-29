/** 拖拽卡牌时的瞄准指示。曲线从卡牌根部弯向光标，末端随目标合法性变色。 */

const SVG_NS = 'http://www.w3.org/2000/svg';

export type AimState = 'idle' | 'valid' | 'invalid';

export class AimLine {
  private svg: SVGSVGElement;
  private path: SVGPathElement;
  private glow: SVGPathElement;
  private head: SVGGElement;
  private headRing: SVGCircleElement;
  private headDot: SVGCircleElement;
  private visible = false;
  private viewW = 0;
  private viewH = 0;
  private tone = '';

  constructor(host: HTMLElement) {
    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.setAttribute('class', 'aim');

    this.glow = document.createElementNS(SVG_NS, 'path');
    this.glow.setAttribute('fill', 'none');
    this.glow.setAttribute('stroke-linecap', 'round');
    this.glow.setAttribute('stroke-width', '13');
    this.glow.setAttribute('opacity', '0.28');

    this.path = document.createElementNS(SVG_NS, 'path');
    this.path.setAttribute('fill', 'none');
    this.path.setAttribute('stroke-linecap', 'round');
    this.path.setAttribute('stroke-width', '4');
    this.path.setAttribute('stroke-dasharray', '13 9');

    this.head = document.createElementNS(SVG_NS, 'g');
    this.headRing = document.createElementNS(SVG_NS, 'circle');
    this.headRing.setAttribute('r', '17');
    this.headRing.setAttribute('fill', 'none');
    this.headRing.setAttribute('stroke-width', '2.5');
    this.headDot = document.createElementNS(SVG_NS, 'circle');
    this.headDot.setAttribute('r', '4.5');
    this.head.append(this.headRing, this.headDot);

    this.svg.append(this.glow, this.path, this.head);
    host.append(this.svg);
    this.hide();
  }

  show(): void {
    this.visible = true;
    this.svg.style.opacity = '1';
  }

  hide(): void {
    this.visible = false;
    this.svg.style.opacity = '0';
  }

  /** from 为卡牌根部，to 为当前光标位置。 */
  update(from: { x: number; y: number }, to: { x: number; y: number }, state: AimState): void {
    if (!this.visible) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w !== this.viewW || h !== this.viewH) {
      this.viewW = w;
      this.viewH = h;
      this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    }

    // 控制点抬到两端之上，形成一条向上凸的抛物弧
    const span = Math.hypot(to.x - from.x, to.y - from.y);
    const arc = Math.min(260, 90 + span * 0.32);
    const ctrlX = (from.x + to.x) / 2 + (to.x - from.x) * 0.12;
    const ctrlY = Math.min(from.y, to.y) - arc;
    const d = `M ${from.x} ${from.y} Q ${ctrlX} ${ctrlY}, ${to.x} ${to.y}`;

    this.path.setAttribute('d', d);
    this.glow.setAttribute('d', d);
    this.head.setAttribute('transform', `translate(${to.x} ${to.y})`);

    if (state === this.tone) return;
    this.tone = state;

    const color =
      state === 'valid' ? '#f0b429' : state === 'invalid' ? '#e0483c' : 'rgba(157, 151, 196, 0.75)';
    this.path.setAttribute('stroke', color);
    this.glow.setAttribute('stroke', color);
    this.headRing.setAttribute('stroke', color);
    this.headDot.setAttribute('fill', color);
    this.headRing.setAttribute('opacity', state === 'idle' ? '0.5' : '1');
    this.head.setAttribute('opacity', state === 'idle' ? '0.6' : '1');
  }

  destroy(): void {
    this.svg.remove();
  }
}
