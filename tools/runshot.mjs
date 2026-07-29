/**
 * 跑通一局的主要界面并截图。
 *
 * 用法：node tools/runshot.mjs URL 输出目录
 */

import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const [url, outDir] = process.argv.slice(2);
await mkdir(outDir, { recursive: true });

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--force-device-scale-factor=1'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 980, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('[error]', e.message));
page.on('console', (m) => m.type() === 'error' && console.error('[console]', m.text()));

await page.goto(url, { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await pause(1400);

let shot = 0;
const capture = async (label) => {
  await page.screenshot({ path: `${outDir}/${String(++shot).padStart(2, '0')}-${label}.png` });
};

const clickIfPresent = async (selector) => {
  const node = await page.$(selector);
  if (!node) return false;
  await node.click();
  await pause(700);
  return true;
};

await capture('title');

// 从标题进入新的一局
const start = await page.$('.title-button.primary');
if (start) {
  await start.click();
  await pause(1200);
}
await capture('map');

// 进入第一个可达节点
await page.click('.map-node.reachable');
await pause(1800);
await capture('combat-open');

// 关闭首条提示后打两张牌
await clickIfPresent('.tip-card .ghost-button');

const boxOf = (selector, index = 0) =>
  page.evaluate(
    (sel, i) => {
      const n = document.querySelectorAll(sel)[i];
      if (!n) return null;
      const r = n.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    selector,
    index,
  );

/** 依次尝试每张可用牌，扰牌落在轨道格位上，其余落在敌人身上。 */
const playCard = async () => {
  const count = (await page.$$('.hand .card.playable')).length;
  for (let i = 0; i < count; i++) {
    const before = await page.$eval('.energy', (n) => n.textContent);
    const from = await boxOf('.hand .card.playable', i);
    if (!from) continue;
    const needsSlot = await page.evaluate(
      (idx) => document.querySelectorAll('.hand .card.playable')[idx]?.dataset.type === 'disrupt',
      i,
    );
    const to = needsSlot ? await boxOf('.lane-enemy .slot', 3) : await boxOf('.enemy');
    if (!to) continue;

    await page.mouse.move(from.x, from.y);
    await pause(160);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 18 });
    await pause(120);
    await page.mouse.up();
    await pause(850);

    const after = await page.$eval('.energy', (n) => n.textContent);
    if (before !== after) return true;
  }
  return false;
};

await playCard();
await clickIfPresent('.tip-card .ghost-button');
await playCard();
await capture('combat-track');

await page.click('.end-turn');
await pause(3000);
await clickIfPresent('.tip-card .ghost-button');
await capture('combat-echo');

// 打到战斗结束
for (let i = 0; i < 40; i++) {
  const finished = await page.$('.overlay .panel');
  if (finished) break;
  const cards = await page.$$('.hand .card.playable');
  if (cards.length) {
    await playCard();
    await clickIfPresent('.tip-card .ghost-button');
  } else {
    await page.click('.end-turn');
    await pause(2600);
    await clickIfPresent('.tip-card .ghost-button');
  }
}
await capture('reward');

await browser.close();
console.log('done');
