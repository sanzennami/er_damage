// characters.json 的基础属性/成长只由 apply-patch-log 改，`npm run update:gamedata`
// 只写 sources/erGameData.json —— 两边从来没有互相校验过，2026-08-19 就因此发现
// 克雷弗整条记录停在旧导入（growth 还是 null，Lv20 属性不成长）。
//
// 这个脚本把两边逐项比一遍。差异不一定是错：解包快照落后于最新公告时，
// 我们这边被公告改新的项本来就会「不一致」。所以输出会区分：
//   - 有公告背书：patchLog 里能找到同一 hero+path 的补丁，且补丁 order 比解包快照新 → 正常
//   - 无人背书：两边都没解释，多半是陈旧导入 → 需要处理
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const read = (p) => JSON.parse(readFileSync(path.join(dataDir, p), 'utf8'));

const characters = read('characters.json').characters || [];
const gameData = read('sources/erGameData.json');
const patchLog = read('patchLog.json');

const BASE_KEYS = ['hp', 'attackPower', 'defense', 'skillAmp', 'moveSpeed', 'attackSpeed'];
const SKIP_GROWTH_KEYS = new Set(['code', 'name']);

// hero|path -> 最新一次改到它的补丁 order
const patchedAt = new Map();
for (const patch of patchLog.patches || []) {
  for (const change of patch.characters || []) {
    const key = `${change.hero}|${change.path}`;
    patchedAt.set(key, Math.max(patchedAt.get(key) || 0, patch.order || 0));
  }
}

// 解包快照的时间戳，折成 YYYYMMDD 好和 patch.order 比
const snapshotOrder = Number((gameData.generatedAt || '').slice(0, 10).replace(/-/g, '')) || 0;
const byCode = new Map((gameData.characters || []).map((item) => [item.code, item]));
const num = (value) => (typeof value === 'number' ? value : 0);

const explained = [];
const unexplained = [];
const missingGrowth = [];

for (const character of characters) {
  const source = byCode.get(character.code);
  if (!source) continue;

  if (!character.growth && source.growth) missingGrowth.push(character.name);

  const rows = [];
  for (const key of BASE_KEYS) {
    rows.push([`base.${key}`, num(character.base?.[key]), num(source.base?.[key])]);
  }
  const growthKeys = new Set([
    ...Object.keys(character.growth || {}),
    ...Object.keys(source.growth || {})
  ].filter((key) => !SKIP_GROWTH_KEYS.has(key)));
  for (const key of growthKeys) {
    rows.push([`growth.${key}`, num(character.growth?.[key]), num(source.growth?.[key])]);
  }

  for (const [dottedPath, ours, theirs] of rows) {
    if (Math.abs(ours - theirs) < 1e-9) continue;
    const order = patchedAt.get(`${character.name}|${dottedPath}`) || 0;
    const line = `${character.name.padEnd(10)} ${dottedPath.padEnd(24)} 我们 ${String(ours).padEnd(8)} 解包 ${theirs}`;
    if (order > snapshotOrder) explained.push(`${line}   ← ${order} 的公告改的，解包快照还没跟上`);
    else unexplained.push(line);
  }
}

console.log(`解包快照 ${gameData.generatedAt || '未知'}（order ${snapshotOrder}）／实验体 ${characters.length} 名\n`);

if (missingGrowth.length) {
  console.log(`⚠ 有解包成长数据、我们却还是 null 的实验体（等级拉高时属性不会成长）：${missingGrowth.join('、')}\n`);
}

if (explained.length) {
  console.log(`公告背书的差异 ${explained.length} 项（正常，不用动）：`);
  explained.forEach((line) => console.log(`  ${line}`));
  console.log('');
}

if (unexplained.length) {
  console.log(`⚠ 没人背书的差异 ${unexplained.length} 项 —— 两边都解释不了，多半是陈旧导入：`);
  unexplained.forEach((line) => console.log(`  ${line}`));
} else {
  console.log('没有无背书差异。');
}

process.exitCode = unexplained.length || missingGrowth.length ? 1 : 0;
