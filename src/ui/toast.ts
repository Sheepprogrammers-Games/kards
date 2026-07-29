/** 短暂的提示条。同一条文本连续触发时只刷新计时，不叠加。 */

let current: HTMLElement | null = null;
let timer = 0;

export function toast(host: HTMLElement, text: string, ms = 1700): void {
  if (current && current.textContent === text) {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => dismiss(), ms);
    return;
  }

  dismiss();

  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = text;
  host.append(node);
  current = node;

  timer = window.setTimeout(() => dismiss(), ms);
}

function dismiss(): void {
  if (!current) return;
  const node = current;
  current = null;
  node.classList.add('leaving');
  setTimeout(() => node.remove(), 220);
}
