/** 标题界面。 */

import { art } from './assets';
import { el } from './screens';
import { sfx } from '@audio/index';
import { onSettingsChange, openSettings, settings, updateSettings } from './settings';
import { openCodex } from './codex';

export interface TitleActions {
  onContinue?: () => void;
  onNew: () => void;
  onReset?: () => void;
}

export function renderTitle(actions: TitleActions): HTMLElement {
  // 浏览器在无用户手势时禁止自动播放，把初次播放推迟到用户交互
  void import('@audio/music').then((m) => {
    const wake = () => m.music.resumeAfterGesture();
    document.addEventListener('click', wake, { once: true });
    document.addEventListener('keydown', wake, { once: true });
  });

  const screen = el('div', 'screen title-screen');

  const bg = el('div', 'title-bg');
  const url = art.bg('act1-clocktower');
  if (url) bg.style.backgroundImage = `url(${url})`;
  screen.append(bg, el('div', 'scene-grain'));

  const stack = el('div', 'title-stack');

  const mark = el('div', 'title-mark');
  const sigil = art.ui('title-sigil') ?? art.ui('act-crest');
  if (sigil) {
    const img = document.createElement('img');
    img.src = sigil;
    mark.append(img);
  }
  stack.append(mark);

  // 主标题分两层：底层做描边与投影，顶层走金属渐变与扫光
  const name = el('h1', 'title-name');
  name.dataset.text = '回响';
  name.append(el('span', 'title-name-fill', '回响'));
  stack.append(name);

  const rule = el('div', 'title-rule');
  const frame = art.ui('title-frame');
  if (frame) {
    const img = document.createElement('img');
    img.src = frame;
    rule.append(img);
  }
  stack.append(rule);

  stack.append(el('div', 'title-sub', 'E C H O E S'));
  stack.append(el('p', 'title-line', '你打出的牌不会消失，它会在接下来的回合里一遍遍重演。'));

  const menu = el('div', 'title-menu');
  if (actions.onContinue) {
    const cont = el('button', 'title-button primary', '继续这一局');
    cont.addEventListener('click', () => {
      sfx.pick();
      actions.onContinue!();
    });
    menu.append(cont);
  }

  const fresh = el('button', `title-button${actions.onContinue ? '' : ' primary'}`, '开始新的一局');
  fresh.addEventListener('click', () => {
    sfx.turn();
    actions.onNew();
  });
  menu.append(fresh);

  const book = el('button', 'title-button', '手册');
  book.addEventListener('click', () => openCodex(screen));
  menu.append(book);

  const config = el('button', 'title-button', '设置');
  config.addEventListener('click', () =>
    openSettings(screen, { allowReset: Boolean(actions.onContinue), onReset: actions.onReset }),
  );
  menu.append(config);

  stack.append(menu);
  screen.append(stack, quickToggles());
  return screen;
}

/** 右下角常驻的音效与音乐开关，状态跟随设置面板。 */
function quickToggles(): HTMLElement {
  const bar = el('div', 'quick-toggles');

  const make = (
    icon: string,
    name: string,
    body: string,
    get: () => boolean,
    set: (value: boolean) => void,
  ): { node: HTMLElement; paint: () => void } => {
    const button = el('button', 'quick-toggle', icon);

    const tip = el('div', 'stat-tip');
    const head = el('div', 'stat-tip-head');
    tip.append(head, el('div', 'stat-tip-body', body));
    button.append(tip);
    button.classList.add('has-tip');

    const paint = () => {
      const on = get();
      button.classList.toggle('off', !on);
      head.textContent = `${name}　${on ? '开' : '关'}`;
      button.setAttribute('aria-pressed', String(on));
    };

    button.addEventListener('click', () => {
      set(!get());
      if (get()) sfx.pick();
    });
    paint();
    return { node: button, paint };
  };

  const controls = [
    make('♪', '音乐', '场景切换时自动更换曲目。音量在设置里单独调。', () => settings().music, (v) =>
      updateSettings({ music: v }),
    ),
    make('◈', '音效', '出牌、结算与受击的反馈声。音量在设置里单独调。', () => settings().sound, (v) =>
      updateSettings({ sound: v }),
    ),
  ];

  for (const control of controls) bar.append(control.node);

  // 设置面板里改动同样要反映到这里，界面卸载后自行注销
  const stop = onSettingsChange(() => {
    if (!bar.isConnected) {
      stop();
      return;
    }
    for (const control of controls) control.paint();
  });

  return bar;
}
