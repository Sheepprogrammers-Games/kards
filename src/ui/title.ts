/** 标题界面。 */

import { art } from './assets';
import { el } from './screens';
import { sfx } from '@audio/index';
import { openSettings, settings, updateSettings } from './settings';
import { openCodex } from './codex';

export interface TitleActions {
  onContinue?: () => void;
  onNew: () => void;
  onReset?: () => void;
}

export function renderTitle(actions: TitleActions): HTMLElement {
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
  screen.append(stack, quickToggles(screen));
  return screen;
}

/** 右下角常驻的音效与音乐开关。 */
function quickToggles(host: HTMLElement): HTMLElement {
  const bar = el('div', 'quick-toggles');

  const make = (
    icon: string,
    title: string,
    get: () => boolean,
    set: (value: boolean) => void,
  ): HTMLElement => {
    const button = el('button', 'quick-toggle');
    button.title = title;
    const paint = () => {
      button.textContent = icon;
      button.classList.toggle('off', !get());
    };
    button.addEventListener('click', () => {
      set(!get());
      paint();
      if (get()) sfx.pick();
    });
    paint();
    return button;
  };

  bar.append(
    make('♪', '音乐', () => settings().music, (v) => updateSettings({ music: v })),
    make('◈', '音效', () => settings().sound, (v) => updateSettings({ sound: v })),
  );

  const gear = el('button', 'quick-toggle');
  gear.textContent = '⚙';
  gear.title = '设置';
  gear.addEventListener('click', () => openSettings(host));
  bar.append(gear);

  return bar;
}
