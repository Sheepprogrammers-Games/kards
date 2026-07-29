/** 暂停菜单。引擎不含计时器，暂停只是挡住输入。 */

import { el } from './screens';
import { sfx } from '@audio/index';
import { openSettings } from './settings';
import { openCodex } from './codex';

export interface PauseActions {
  onResume: () => void;
  /** 只在战斗内提供，非战斗界面本身就在地图上。 */
  onMap?: () => void;
  onTitle: () => void;
}

let open = false;

export function isPaused(): boolean {
  return open;
}

export function openPause(host: HTMLElement, actions: PauseActions): void {
  if (open) return;
  open = true;
  sfx.pick();

  const overlay = el('div', 'overlay pause-overlay');
  const panel = el('div', 'panel pause-panel');
  panel.append(el('h2', '', '暂停'));
  panel.append(el('p', '', '时间轨停在原处等你。'));

  const close = () => {
    open = false;
    overlay.remove();
  };

  const menu = el('div', 'pause-menu');

  const resume = el('button', 'title-button primary', '继续');
  resume.addEventListener('click', () => {
    close();
    actions.onResume();
  });

  const book = el('button', 'title-button', '手册');
  book.addEventListener('click', () => openCodex(host));

  const config = el('button', 'title-button', '设置');
  config.addEventListener('click', () => openSettings(host));

  const title = el('button', 'title-button', '回到标题');
  title.addEventListener('click', () => {
    close();
    actions.onTitle();
  });

  menu.append(resume, book, config);
  if (actions.onMap) {
    const map = el('button', 'title-button', '返回地图');
    map.addEventListener('click', () => {
      close();
      actions.onMap?.();
    });
    menu.append(map);
  }
  menu.append(title);
  panel.append(menu);
  panel.append(
    el(
      'div',
      'pause-hint',
      actions.onMap
        ? '进度随时自动保存。离开战斗后，这个节点可以重新进入。'
        : '进度随时自动保存。回到标题后可以从这里继续。',
    ),
  );
  overlay.append(panel);
  host.append(overlay);

  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) {
      close();
      actions.onResume();
    }
  });
}

/** 绑定 Esc 开关暂停，返回解绑函数。 */
export function bindPauseKey(host: HTMLElement, actions: PauseActions): () => void {
  const onKey = (ev: KeyboardEvent) => {
    if (ev.key !== 'Escape') return;
    if (open) {
      host.querySelector('.pause-overlay')?.remove();
      openState(false);
      actions.onResume();
    } else {
      openPause(host, actions);
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}

function openState(value: boolean): void {
  open = value;
}
