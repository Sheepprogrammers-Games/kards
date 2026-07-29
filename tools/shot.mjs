/**
 * 截取页面。
 *
 * 用法：node tools/shot.mjs URL OUT.png [宽 高] [等待毫秒]
 */

import puppeteer from 'puppeteer-core';

const [url, out, w = '1600', h = '980', waitMs = '1600'] = process.argv.slice(2);

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--force-device-scale-factor=1'],
});

const page = await browser.newPage();
await page.setViewport({ width: Number(w), height: Number(h), deviceScaleFactor: 1 });
page.on('console', (m) => m.type() === 'error' && console.error('[page]', m.text()));
page.on('pageerror', (e) => console.error('[error]', e.message));

await page.goto(url, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, Number(waitMs)));
await page.screenshot({ path: out });
await browser.close();
console.log(out);
