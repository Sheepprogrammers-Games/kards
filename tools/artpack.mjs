#!/usr/bin/env node
/**
 * 用保留的原图重新导出交付用的 webp，不重新生成画面。
 *
 * 用法：
 *   node tools/artpack.mjs                  按清单里的输出参数重导全部素材
 *   node tools/artpack.mjs --only card      按 id 前缀或类别过滤
 *   node tools/artpack.mjs --quality 70     覆盖所有素材的编码质量
 *   node tools/artpack.mjs --dry            只打印将要处理的素材
 *
 * 原图取自 assets/art/<类别>/raw/，缺原图的素材会被跳过并列在末尾。
 * 需要 python3 与 Pillow。
 */

import { execFile } from 'node:child_process';
import { access, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { PRESETS } from './artgen/style.mjs';
import { MANIFEST } from './artgen/manifest.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const ART = path.join(ROOT, 'assets/art');
const CUTOUT = path.join(ROOT, 'tools/sprite/cutout.py');

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const ONLY = value('--only', null);
const QUALITY = value('--quality', null);
const DRY = flag('--dry');
const CONCURRENCY = Number(value('--concurrency', '6'));

const exists = async (p) => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};

const kb = async (p) => Math.round((await stat(p)).size / 1024);

/** 清单里的一项拼出重导所需的全部参数。 */
function taskOf(item) {
  const category = item.category ?? 'card';
  const preset = PRESETS[category] ?? {};
  const output = { ...(preset.output ?? {}), ...(item.output ?? {}) };
  if (QUALITY) output.quality = Number(QUALITY);

  const dir = path.join(ART, category);
  return {
    id: item.id,
    category,
    output,
    rawDir: path.join(dir, 'raw'),
    file: path.join(dir, `${item.id}.webp`),
  };
}

/** 原图的扩展名不固定，按目录内容匹配。 */
async function findRaw(task) {
  if (!(await exists(task.rawDir))) return null;
  for (const name of await readdir(task.rawDir)) {
    if (name.replace(/\.[^.]+$/, '') === task.id) return path.join(task.rawDir, name);
  }
  return null;
}

function repack(task, rawFile) {
  const o = task.output;
  const args = [
    CUTOUT,
    rawFile,
    task.file,
    '--key', o.key ?? 'none',
    '--threshold', String(o.threshold ?? 0.42),
    '--despill', String(o.despill ?? 0.9),
    '--pad', String(o.pad ?? 0.04),
    '--max-size', String(o.maxSize ?? 0),
    '--quality', String(o.quality ?? 88),
  ];
  if (o.trim) args.push('--trim');
  if (o.square) args.push('--square');

  return new Promise((resolve, reject) => {
    execFile('python3', args, (err, _stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve();
    });
  });
}

async function pool(items, limit, worker) {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) await worker(items[cursor++]);
    }),
  );
}

const tasks = MANIFEST.filter(Boolean)
  .map(taskOf)
  .filter((t) => !ONLY || t.category === ONLY || t.id.startsWith(ONLY));

if (!tasks.length) {
  console.error('没有匹配的素材');
  process.exit(1);
}

const missing = [];
let before = 0;
let after = 0;
let done = 0;

await pool(tasks, CONCURRENCY, async (task) => {
  const rawFile = await findRaw(task);
  if (!rawFile) {
    missing.push(task.id);
    return;
  }
  const sizeIn = (await exists(task.file)) ? await kb(task.file) : 0;

  if (DRY) {
    console.log(`${task.category.padEnd(10)} ${task.id.padEnd(26)} q${task.output.quality ?? 88} ≤${task.output.maxSize ?? 0}`);
    return;
  }

  await repack(task, rawFile);
  const sizeOut = await kb(task.file);
  before += sizeIn;
  after += sizeOut;
  done += 1;
});

if (!DRY) {
  console.log(`重导 ${done} 项：${(before / 1024).toFixed(1)}MB → ${(after / 1024).toFixed(1)}MB`);
}
if (missing.length) {
  console.log(`缺原图 ${missing.length} 项：${missing.join(', ')}`);
}
