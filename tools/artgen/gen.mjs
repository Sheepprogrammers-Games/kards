#!/usr/bin/env node
/**
 * 批量生成图像素材。
 *
 * 用法：
 *   node tools/artgen/gen.mjs                    生成清单中缺失或提示词已变更的素材
 *   node tools/artgen/gen.mjs --only tone        按 id 前缀、类别或标签过滤
 *   node tools/artgen/gen.mjs --only card --force  忽略台账强制重出
 *   node tools/artgen/gen.mjs --list             仅打印清单
 *
 * 环境变量：MICU_ENDPOINT、MICU_KEY、MICU_MODEL、ARTGEN_CONCURRENCY
 */

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { PRESETS } from './style.mjs';
import { MANIFEST } from './manifest.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const ART_DIR = path.join(ROOT, 'assets/art');
const LEDGER = path.join(ART_DIR, '.ledger.json');

try {
  process.loadEnvFile(path.join(ROOT, '.env.local'));
} catch {}

const ENDPOINT = process.env.MICU_ENDPOINT;
const API_KEY = process.env.MICU_KEY;
const MODEL = process.env.MICU_MODEL ?? 'gpt-image-2';

const CONCURRENCY = Number(process.env.ARTGEN_CONCURRENCY ?? 4);
const MAX_RETRY = 3;
const TIMEOUT_MS = 300_000;

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};

const FORCE = has('--force');
const ONLY = val('--only');

/** 将清单项与预设合并为待生成任务。 */
function buildTasks() {
  return MANIFEST.filter((item) => {
    if (!ONLY) return true;
    return item.id.startsWith(ONLY) || item.category === ONLY || (item.tags ?? []).includes(ONLY);
  }).map((item) => {
    const preset = PRESETS[item.category];
    if (!preset) throw new Error(`未知的素材类别: ${item.category} (${item.id})`);
    const prompt = preset.wrap(item.subject, item);
    const dir = path.join(ART_DIR, item.category);
    return {
      ...item,
      prompt,
      output: { ...preset.output, ...item.output },
      size: item.size ?? preset.size,
      quality: item.quality ?? preset.quality,
      file: path.join(dir, `${item.id}.webp`),
      rawFile: path.join(dir, `raw/${item.id}.png`),
      hash: createHash('sha1').update(prompt).digest('hex').slice(0, 12),
    };
  });
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function loadLedger() {
  try {
    return JSON.parse(await readFile(LEDGER, 'utf8'));
  } catch {
    return {};
  }
}

async function generateOne(task) {
  const body = {
    model: MODEL,
    prompt: task.prompt,
    size: task.size,
    quality: task.quality,
    n: 1,
    output_format: 'png',
  };

  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
      }
      const json = await res.json();
      const b64 = json?.data?.[0]?.b64_json;
      if (!b64) throw new Error(`响应缺少 b64_json: ${JSON.stringify(json).slice(0, 300)}`);

      await mkdir(path.dirname(task.rawFile), { recursive: true });
      await writeFile(task.rawFile, Buffer.from(b64, 'base64'));
      await runPostprocess(task);
      return { ok: true, usage: json.usage, quality: json.quality };
    } catch (err) {
      clearTimeout(timer);
      if (attempt === MAX_RETRY) return { ok: false, error: String(err.message ?? err) };
      const wait = 2000 * attempt;
      console.warn(`  ↻ ${task.id} 第 ${attempt} 次失败（${String(err.message ?? err).slice(0, 120)}），${wait}ms 后重试`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

/** 抠像、缩放并编码为交付格式。 */
function runPostprocess(task) {
  const o = task.output ?? {};
  const args = [
    path.join(ROOT, 'tools/sprite/cutout.py'),
    task.rawFile,
    task.file,
    '--key',
    o.key ?? 'none',
    '--threshold',
    String(o.threshold ?? 0.42),
    '--despill',
    String(o.despill ?? 0.9),
    '--pad',
    String(o.pad ?? 0.04),
    '--max-size',
    String(o.maxSize ?? 0),
    '--quality',
    String(o.quality ?? 88),
  ];
  if (o.trim) args.push('--trim');
  if (o.square) args.push('--square');

  return new Promise((resolve, reject) => {
    execFile('python3', args, (err, _stdout, stderr) => {
      if (err) reject(new Error(`后处理失败: ${stderr || err.message}`));
      else resolve();
    });
  });
}

/** 并发池。 */
async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

async function main() {
  const tasks = buildTasks();

  if (has('--list')) {
    for (const t of tasks) console.log(`${t.category.padEnd(6)} ${t.id.padEnd(28)} ${t.size} ${t.quality}`);
    console.log(`\n共 ${tasks.length} 项`);
    return;
  }

  const ledger = await loadLedger();
  const todo = [];
  for (const t of tasks) {
    const fresh = ledger[t.id]?.hash === t.hash && (await exists(t.file));
    if (fresh && !FORCE) continue;
    todo.push(t);
  }

  if (!todo.length) {
    console.log('全部素材已是最新，无需生成。');
    return;
  }

  console.log(`待生成 ${todo.length} / ${tasks.length} 项，并发 ${CONCURRENCY}\n`);
  const started = Date.now();
  let done = 0;

  const results = await pool(todo, CONCURRENCY, async (t) => {
    const t0 = Date.now();
    const r = await generateOne(t);
    done++;
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    if (r.ok) {
      console.log(`  ✔ [${done}/${todo.length}] ${t.id}  ${secs}s`);
      ledger[t.id] = { hash: t.hash, size: t.size, quality: t.quality, at: new Date().toISOString() };
    } else {
      console.error(`  ✘ [${done}/${todo.length}] ${t.id}  ${r.error}`);
    }
    return { id: t.id, ...r };
  });

  await mkdir(ART_DIR, { recursive: true });
  await writeFile(LEDGER, JSON.stringify(ledger, null, 2));

  const okCount = results.filter((r) => r.ok).length;
  const mins = ((Date.now() - started) / 60000).toFixed(1);
  console.log(`\n完成 ${okCount}/${todo.length}，耗时 ${mins} 分钟`);
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.log('失败项：' + failed.map((f) => f.id).join(', '));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
