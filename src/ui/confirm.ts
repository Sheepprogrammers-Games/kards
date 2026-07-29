/** 不可撤销操作的二次确认。 */

import { el } from './screens';
import { sfx } from '@audio/index';

export interface ConfirmOptions {
  title: string;
  body: string;
  /** 确认按钮上的文字，写清这一步会发生什么。 */
  confirmText: string;
  cancelText?: string;
  /** 展示在文字下方的预览节点，例如即将取走的那张牌。 */
  preview?: HTMLElement;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function confirmAction(host: HTMLElement, options: ConfirmOptions): void {
  sfx.hover();

  const overlay = el('div', 'overlay confirm-overlay');
  const panel = el('div', 'panel confirm-panel');
  panel.append(el('h2', '', options.title), el('p', '', options.body));
  if (options.preview) {
    const box = el('div', 'confirm-preview');
    box.append(options.preview);
    panel.append(box);
  }

  const close = () => overlay.remove();

  const row = el('div', 'confirm-row');
  const yes = el('button', 'title-button primary', options.confirmText);
  yes.addEventListener('click', () => {
    close();
    options.onConfirm();
  });

  const no = el('button', 'title-button', options.cancelText ?? '再想想');
  no.addEventListener('click', () => {
    sfx.blocked();
    close();
    options.onCancel?.();
  });

  row.append(yes, no);
  panel.append(row);
  overlay.append(panel);

  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) {
      close();
      options.onCancel?.();
    }
  });

  host.append(overlay);
}
