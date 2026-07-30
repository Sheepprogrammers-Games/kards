import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

// 监听网络
const hits = [];
page.on('response', (r) => { if (r.url().includes('.m4a') && r.status() < 400) hits.push(r.url().split('/').pop()); });

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1000));

await page.click('.title-button.primary');
await new Promise(r => setTimeout(r, 5000));

console.log('m4a 加载:', hits.join(', ') || '(无)');
console.log('数量:', hits.length);

// 检查是否真的有音频在播放
const info = await page.evaluate(() => {
  // 检查所有可能的音频引用
  const allAudio = [];
  // 遍历 window 上的已知变量名
  for (const k of Object.getOwnPropertyNames(window)) {
    const v = window[k];
    if (v instanceof HTMLAudioElement) allAudio.push({ key: k, src: v.src.slice(-30), paused: v.paused });
  }
  return allAudio;
});
console.log('音频元素:', JSON.stringify(info));
await browser.close();
