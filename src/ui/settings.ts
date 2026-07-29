/** 游戏设置。读写 localStorage，供界面与特效层共同读取。 */

import { sfx } from '@audio/index';

export interface Settings {
  sound: boolean;
  music: boolean;
  /** 音效音量倍率。 */
  soundVolume: number;
  /** 音乐音量倍率。 */
  musicVolume: number;
  /** 屏幕震动强度倍率。 */
  shake: number;
  /** 动画节奏倍率，越小越快。 */
  speed: number;
  /** 特效密度倍率，同时决定画布渲染倍率。 */
  quality: number;
  /** 战斗中显示伤害与产出的预估数字。 */
  showNumbers: boolean;
  /** 敌方轨道常驻展开，不再需要悬停。 */
  pinEnemyLane: boolean;
}

const KEY = 'echoes.settings';

const DEFAULTS: Settings = {
  sound: true,
  music: true,
  soundVolume: 0.8,
  musicVolume: 0.7,
  shake: 1,
  speed: 1,
  quality: 1,
  showNumbers: true,
  pinEnemyLane: false,
};

let current: Settings = load();

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function settings(): Settings {
  return current;
}

const listeners: (() => void)[] = [];

/** 注册设置变更回调，返回取消订阅的函数。 */
export function onSettingsChange(fn: () => void): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {}
  sfx.setVolume(current.soundVolume);
  sfx.setMuted(!current.sound);
  void import('@audio/music').then((m) => m.music.applyVolume());
  for (const fn of listeners) fn();
}

/** 启动时把已保存的设置应用到各系统。 */
export function applySettings(): void {
  sfx.setVolume(current.soundVolume);
  sfx.setMuted(!current.sound);
}

const SHAKE_LEVELS: { label: string; value: number }[] = [
  { label: '关闭', value: 0 },
  { label: '轻微', value: 0.5 },
  { label: '标准', value: 1 },
  { label: '强烈', value: 1.5 },
];

const SPEED_LEVELS: { label: string; value: number }[] = [
  { label: '标准', value: 1 },
  { label: '偏快', value: 0.7 },
  { label: '很快', value: 0.45 },
];

const QUALITY_LEVELS: { label: string; value: number }[] = [
  { label: '高', value: 1 },
  { label: '中', value: 0.6 },
  { label: '低', value: 0.3 },
];

export interface SettingsPanelOptions {
  onClose?: () => void;
  /** 是否显示会清空进度的危险操作。 */
  allowReset?: boolean;
  onReset?: () => void;
}

export function openSettings(host: HTMLElement, options: SettingsPanelOptions = {}): void {
  sfx.pick();
  const overlay = div('overlay settings-overlay');
  const panel = div('panel settings-panel has-close');
  panel.append(heading('设置'));

  const close = () => {
    overlay.remove();
    options.onClose?.();
  };

  panel.append(sectionTitle('声音'));

  panel.append(
    toggleRow('音效', '出牌、结算与受击的反馈声', () => current.sound, (v) => {
      updateSettings({ sound: v });
      if (v) sfx.pick();
    }),
  );

  panel.append(
    sliderRow('音效音量', '', () => current.soundVolume, (v) => {
      updateSettings({ soundVolume: v });
      sfx.pick();
    }),
  );

  panel.append(
    toggleRow('音乐', '场景切换时自动更换曲目', () => current.music, (v) =>
      updateSettings({ music: v }),
    ),
  );

  panel.append(
    sliderRow('音乐音量', '', () => current.musicVolume, (v) =>
      updateSettings({ musicVolume: v }),
    ),
  );

  panel.append(sectionTitle('画面'));

  panel.append(
    choiceRow('屏幕震动', SHAKE_LEVELS, () => current.shake, (v) => updateSettings({ shake: v })),
  );

  panel.append(
    choiceRow('动画节奏', SPEED_LEVELS, () => current.speed, (v) => updateSettings({ speed: v })),
  );

  panel.append(
    choiceRow(
      '特效强度',
      QUALITY_LEVELS,
      () => current.quality,
      (v) => updateSettings({ quality: v }),
    ),
  );

  panel.append(sectionTitle('操作'));

  panel.append(
    toggleRow(
      '产出预估',
      '在条目与意图上直接标出这一次会打出多少',
      () => current.showNumbers,
      (v) => updateSettings({ showNumbers: v }),
    ),
  );

  panel.append(
    toggleRow(
      '常驻展开敌方轨道',
      '不必悬停也能一直看到敌人的意图排布',
      () => current.pinEnemyLane,
      (v) => updateSettings({ pinEnemyLane: v }),
    ),
  );

  panel.append(
    actionRow('新手提示', '再次显示已经看过的机制说明', '重新开启', () => {
      try {
        localStorage.removeItem('echoes.tips');
      } catch {}
      sfx.block();
    }),
  );

  if (options.allowReset) {
    panel.append(
      actionRow('存档', '清空当前进度，回到标题重新开始', '清空存档', () => {
        try {
          localStorage.removeItem('echoes.run');
        } catch {}
        close();
        options.onReset?.();
      }, true),
    );
  }

  const x = document.createElement('button');
  x.className = 'panel-close';
  x.textContent = '×';
  x.title = '关闭';
  x.addEventListener('click', close);
  panel.append(x);

  overlay.append(panel);
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) close();
  });
  host.append(overlay);
}

function div(className: string, text = ''): HTMLElement {
  const node = document.createElement('div');
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

function heading(text: string): HTMLElement {
  const node = document.createElement('h2');
  node.textContent = text;
  return node;
}

function labelBlock(title: string, hint: string): HTMLElement {
  const box = div('setting-label');
  box.append(div('setting-name', title), div('setting-hint', hint));
  return box;
}

function toggleRow(
  title: string,
  hint: string,
  get: () => boolean,
  set: (value: boolean) => void,
): HTMLElement {
  const row = div('setting-row');
  row.append(labelBlock(title, hint));

  const button = document.createElement('button');
  button.className = 'setting-toggle';
  const paint = () => {
    const on = get();
    button.classList.toggle('on', on);
    button.textContent = on ? '开' : '关';
  };
  button.addEventListener('click', () => {
    set(!get());
    paint();
  });
  paint();

  row.append(button);
  return row;
}

function sectionTitle(text: string): HTMLElement {
  return div('setting-section', text);
}

/** 0 到 1 的连续滑杆，右侧读出百分比。 */
function sliderRow(
  title: string,
  hint: string,
  get: () => number,
  set: (value: number) => void,
): HTMLElement {
  const row = div('setting-row');
  row.append(labelBlock(title, hint));

  const group = div('setting-slider');
  const input = document.createElement('input');
  input.type = 'range';
  input.min = '0';
  input.max = '100';
  input.step = '5';
  input.value = String(Math.round(get() * 100));

  const readout = div('setting-readout', `${input.value}%`);
  input.addEventListener('input', () => {
    readout.textContent = `${input.value}%`;
    set(Number(input.value) / 100);
  });

  group.append(input, readout);
  row.append(group);
  return row;
}

function choiceRow(
  title: string,
  levels: { label: string; value: number }[],
  get: () => number,
  set: (value: number) => void,
): HTMLElement {
  const row = div('setting-row');
  row.append(labelBlock(title, ''));

  const group = div('setting-choices');
  const buttons: HTMLButtonElement[] = [];
  const paint = () => {
    levels.forEach((level, i) => {
      buttons[i]!.classList.toggle('on', Math.abs(get() - level.value) < 0.01);
    });
  };

  for (const level of levels) {
    const button = document.createElement('button');
    button.className = 'setting-choice';
    button.textContent = level.label;
    button.addEventListener('click', () => {
      set(level.value);
      paint();
      sfx.hover();
    });
    buttons.push(button);
    group.append(button);
  }
  paint();

  row.append(group);
  return row;
}

function actionRow(
  title: string,
  hint: string,
  action: string,
  onClick: () => void,
  danger = false,
): HTMLElement {
  const row = div('setting-row');
  row.append(labelBlock(title, hint));

  const button = document.createElement('button');
  button.className = danger ? 'setting-action danger' : 'setting-action';
  button.textContent = action;
  button.addEventListener('click', onClick);

  row.append(button);
  return row;
}
