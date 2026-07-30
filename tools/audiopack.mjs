#!/usr/bin/env node
/**
 * 把 assets/audio 下的曲目重编码为交付格式。
 *
 * 用法：
 *   node tools/audiopack.mjs              按默认码率重编码全部曲目
 *   node tools/audiopack.mjs --bitrate 80 指定码率，单位 kbps
 *   node tools/audiopack.mjs --dry        只打印将要处理的文件与预估
 *
 * 源文件保留在 assets/audio/source/，重复运行不会二次编码。
 * 需要 ffmpeg 在 PATH 中。
 */

import { execFile } from 'node:child_process';
import { mkdir, readdir, rename, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const AUDIO = path.join(ROOT, 'assets/audio');
const SOURCE = path.join(AUDIO, 'source');

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const BITRATE = Number(value('--bitrate', '96'));
const DRY = flag('--dry');
const PLAYABLE = /\.(mp3|m4a|aac|ogg|wav|flac|opus)$/i;

const run = (cmd, args) =>
  new Promise((resolve, reject) => {
    execFile(cmd, args, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout);
    });
  });

const kb = async (file) => Math.round((await stat(file)).size / 1024);

await mkdir(SOURCE, { recursive: true });

/** 首次运行时把原始曲目挪进 source，之后一律以 source 为输入。 */
async function collect() {
  for (const name of await readdir(AUDIO)) {
    if (!PLAYABLE.test(name)) continue;
    const from = path.join(AUDIO, name);
    if (!(await stat(from)).isFile()) continue;
    await rename(from, path.join(SOURCE, name));
  }
  return (await readdir(SOURCE)).filter((name) => PLAYABLE.test(name));
}

const sources = await collect();
if (!sources.length) {
  console.error('assets/audio/source 下没有可处理的曲目');
  process.exit(1);
}

let before = 0;
let after = 0;

for (const name of sources.sort()) {
  const src = path.join(SOURCE, name);
  const id = name.replace(PLAYABLE, '');
  const dst = path.join(AUDIO, `${id}.m4a`);
  const sizeIn = await kb(src);
  before += sizeIn;

  if (DRY) {
    console.log(`${id.padEnd(14)} ${String(sizeIn).padStart(5)}KB → ${BITRATE}kbps`);
    continue;
  }

  await run('ffmpeg', [
    '-v', 'error',
    '-i', src,
    '-c:a', 'aac',
    '-b:a', `${BITRATE}k`,
    '-movflags', '+faststart',
    '-y', dst,
  ]);

  const sizeOut = await kb(dst);
  after += sizeOut;
  const pct = Math.round((sizeOut / sizeIn) * 100);
  console.log(`${id.padEnd(14)} ${String(sizeIn).padStart(5)}KB → ${String(sizeOut).padStart(5)}KB  ${pct}%`);
}

if (!DRY) {
  console.log(`\n合计 ${(before / 1024).toFixed(1)}MB → ${(after / 1024).toFixed(1)}MB`);
}
