import './ui/styles/tokens.css';
import './ui/styles/base.css';
import './ui/styles/card.css';
import './ui/styles/track.css';
import './ui/styles/battle.css';
import './ui/styles/map.css';
import './ui/styles/reward.css';
import './ui/styles/shop.css';
import './ui/styles/codex.css';

import { loadContent } from '@content/index';
import { fx } from '@fx/index';
import { App, loadSavedRun } from '@ui/app';
import { applySettings } from '@ui/settings';

loadContent();
applySettings();

const stage = document.getElementById('stage') as HTMLElement;
fx.attach(
  document.getElementById('fx-front') as HTMLCanvasElement,
  document.getElementById('fx-back') as HTMLCanvasElement,
);

new App(stage, loadSavedRun() ?? undefined);
