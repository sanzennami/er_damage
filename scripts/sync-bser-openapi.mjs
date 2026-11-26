// scripts/sync-bser-openapi.mjs
// 永恒轮回官方 OpenAPI (https://open-api.bser.io) 零落盘密钥 · 一键增量抓取与本地表同步脚本
//
// 核心特性：
//   1. 【绝不保存 API Key 到本地】支持运行期交互式粘贴输入（不留终端历史、不写任何文件），控制台全程脱敏显示
//   2. 【自动探测本地代理】无需前置脚本，直跑 node 也可自动探测 Clash/v2ray 常见端口 (7897/7890 等) 或直连
//   3. 【Hash 增量秒检 + 1 RPS 限流保护】先查 /v2/data/hash 比对 SHA1，未变动的表 0 下载秒跳过；自动处理 429 退避重试
//   4. 【安全直通仓库活数据】自动刷新 erGameData.json / masteryStats.json / weaponTypeInfo.json / equipment.json / characters.json，
//      绝不触碰已人工校准的 heroSkills.json 与 weaponSkills.json，并自动输出最新实验体（如弥莎）官方数据就绪看板
//
// 用法：
//   node scripts/sync-bser-openapi.mjs                     # 交互式粘贴 Key，增量拉取官方数据并同步仓库 + 自检
//   node scripts/sync-bser-openapi.mjs --hero 弥莎          # 同步并重点展示指定实验体（支持中文名 / 英文 ID / code）
//   node scripts/sync-bser-openapi.mjs --check-only        # 只读探查官方 API 最新状态（不修改 src/data 任何文件）
//   node scripts/sync-bser-openapi.mjs --force             # 忽略本地 hash 缓存，强制重拉全部官方核心表
//   node scripts/sync-bser-openapi.mjs --cache-only        # 仅更新 .er-gamedata-cache 与 erGameData/masteryStats（供全量流水线串联调用）

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const cacheDir = path.join(rootDir, '.er-gamedata-cache');
const dataDir = path.join(rootDir, 'src', 'data');
const sourcesDir = path.join(dataDir, 'sources');
const statePath = path.join(cacheDir, '.bser-openapi-state.json');

const BASE_URL = 'https://open-api.bser.io';
const ER_GAMEDATA_REPO = 'https://github.com/pypy-vrc/er-gamedata.git';
const MIN_REQUEST_INTERVAL_MS = 1150; // 官方个人开发者 Key 限流 1 RPS，留 150ms 安全余量

const CORE_META_TYPES = [
  'Character',
  'CharacterLevelUpStat',
  'CharacterMastery',
  'MasteryStat',
  'CharacterAttributes',
  'CharacterModeModifier',
  'WeaponTypeInfo',
  'ItemWeapon',
  'ItemArmor',
  'Trait',
  'TacticalSkillSet',
  'TacticalSkillSetGroup'
];

const L10N_LANGUAGES = ['ChineseSimplified', 'English'];

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const getArg = (flag, fallback = '') => {
  const idx = args.indexOf(flag);
  return idx >= 0 && args[idx + 1] && !args[idx + 1].startsWith('--') ? args[idx + 1].trim() : fallback;
};

const isCheckOnly = hasFlag('--check-only');
const isForce = hasFlag('--force');
const isCacheOnly = hasFlag('--cache-only');
const isNoProxy = hasFlag('--no-proxy');
const explicitProxy = getArg('--proxy', '');
const targetHeroArg = getArg('--hero', '');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function maskApiKey(key) {
  const s = String(key || '').trim();
  if (s.length <= 8) return '****';
  return `${s.slice(0, 4)}****${s.slice(-4)}`;
}

function sha1OfBuffer(buf) {
  return createHash('sha1').update(buf).digest('hex');
}

async function fileSha1IfExists(filePath) {
  if (!existsSync(filePath)) return '';
  try {
    return sha1OfBuffer(await readFile(filePath));
  } catch {
    return '';
  }
}

async function readJsonClean(filePath, fallback = null) {
  if (!existsSync(filePath)) return fallback;
  const raw = (await readFile(filePath, 'utf8')).replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

async function writeJsonClean(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const content = `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(filePath, content, 'utf8');
  return sha1OfBuffer(Buffer.from(content, 'utf8'));
}

function checkPortOpen(host, port, timeoutMs = 350) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

async function setupNetworkProxy() {
  if (isNoProxy) return '';
  let chosen = explicitProxy || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ER_PUSH_PROXY || '';
  if (!chosen) {
    const commonPorts = [7897, 7890, 7891, 10809, 10808, 1080, 1081, 8889, 20171];
    for (const port of commonPorts) {
      if (await checkPortOpen('127.0.0.1', port)) {
        chosen = `http://127.0.0.1:${port}`;
        break;
      }
    }
  }
  if (chosen) {
    if (!/^[a-zA-Z0-9]+:\/\//.test(chosen)) chosen = `http://${chosen}`;
    process.env.HTTP_PROXY = chosen;
    process.env.HTTPS_PROXY = chosen;
    process.env.NODE_USE_ENV_PROXY = '1';
  }
  await import('./lib/proxy-preload.mjs');
  return chosen;
}

async function resolveApiKeyInMemory() {
  const fromCliOrEnv = getArg('--key', '') || getArg('--bser-key', '') || (process.env.BSER_API_KEY || '').trim();
  if (fromCliOrEnv) return fromCliOrEnv.replace(/^['"]|['"]$/g, '').trim();

  if (!process.stdin.isTTY) {
    throw new Error('未检测到 API Key。请在交互式终端运行（按提示粘贴），或通过临时环境变量 BSER_API_KEY / 参数 --key 传入。');
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question('🔑 请粘贴永恒轮回官方 OpenAPI Key（仅本次内存使用，绝不保存到本地文件）：');
    const cleaned = String(answer || '').replace(/^['"]|['"]$/g, '').trim();
    if (!cleaned) {
      throw new Error('未输入 API Key，已取消操作。');
    }
    return cleaned;
  } finally {
    rl.close();
  }
}

function extractL10nTimestamp(l10Path) {
  const m = String(l10Path || '').match(/-(\d{14})\.txt/);
  return m ? m[1] : '';
}

function formatL10nTimestamp(ts) {
  if (!ts || ts.length !== 14) return ts || '未知';
  return `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)} ${ts.slice(8, 10)}:${ts.slice(10, 12)}:${ts.slice(12, 14)}`;
}

function l10nTimestampToIsoDate(ts) {
  if (!ts || ts.length < 8) return '';
  return `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
}

function formatStatSummary(stats = {}) {
  return Object.entries(stats)
    .filter(([, v]) => Number(v) !== 0)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ');
}

function buildChildEnv(activeProxy) {
  const env = { ...process.env };
  // 绝不向无关子进程透传 BSER_API_KEY
  delete env.BSER_API_KEY;
  if (activeProxy) {
    env.HTTP_PROXY = activeProxy;
    env.HTTPS_PROXY = activeProxy;
    env.NODE_USE_ENV_PROXY = '1';
    env.GIT_CONFIG_COUNT = '2';
    env.GIT_CONFIG_KEY_0 = 'http.proxy';
    env.GIT_CONFIG_VALUE_0 = activeProxy;
    env.GIT_CONFIG_KEY_1 = 'https.proxy';
    env.GIT_CONFIG_VALUE_1 = activeProxy;
  }
  return env;
}

function runNodeScript(relScript, scriptArgs = [], activeProxy = '') {
  execFileSync(process.execPath, [path.join(rootDir, relScript), ...scriptArgs], {
    cwd: rootDir,
    stdio: 'inherit',
    env: buildChildEnv(activeProxy)
  });
}

function createOpenApiClient(apiKey) {
  let lastCallAt = 0;

  return async function fetchOpenApi(endpointPath, retries = 3) {
    const url = `${BASE_URL}${endpointPath}`;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const elapsed = Date.now() - lastCallAt;
      if (elapsed < MIN_REQUEST_INTERVAL_MS) {
        await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
      }
      lastCallAt = Date.now();

      const res = await fetch(url, {
        headers: {
          'x-api-key': apiKey,
          accept: 'application/json'
        }
      });

      if (res.status === 401 || res.status === 403) {
        throw new Error(`官方 OpenAPI 鉴权失败 (HTTP ${res.status})，请检查 API Key 是否正确或已过期。`);
      }

      if (res.status === 429) {
        if (attempt < retries) {
          const waitMs = 1800 * (attempt + 1);
          console.warn(`  ⏳ 触发官方 1 RPS 限流 (429)，等待 ${(waitMs / 1000).toFixed(1)}s 后重试...`);
          await sleep(waitMs);
          continue;
        }
        throw new Error(`请求 ${endpointPath} 连续触发 429 限流，请稍后再试。`);
      }

      if (!res.ok) {
        throw new Error(`请求 ${endpointPath} 失败: HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json?.code === 429 && attempt < retries) {
        const waitMs = 1800 * (attempt + 1);
        await sleep(waitMs);
        continue;
      }
      if (json?.code && json.code !== 200) {
        throw new Error(`官方接口 ${endpointPath} 返回错误码 ${json.code}: ${json.message || 'Unknown'}`);
      }
      return json;
    }
    throw new Error(`请求 ${endpointPath} 超过最大重试次数`);
  };
}

async function downloadTextWithRetry(url, retries = 2) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(1200 * (attempt + 1));
    }
  }
  throw lastErr;
}

async function ensureBaseCacheStructure(activeProxy) {
  if (!existsSync(path.join(cacheDir, 'data', 'SkillGroup.json'))) {
    console.log('  ℹ 首次初始化本地缓存目录，拉取基础解包骨架...');
    try {
      execFileSync('git', ['clone', '--depth', '1', ER_GAMEDATA_REPO, cacheDir], {
        cwd: rootDir,
        stdio: 'inherit',
        env: buildChildEnv(activeProxy)
      });
    } catch {
      await mkdir(path.join(cacheDir, 'data'), { recursive: true });
      await mkdir(path.join(cacheDir, 'l10n'), { recursive: true });
      if (!existsSync(path.join(cacheDir, 'data', 'SkillGroup.json'))) {
        await writeJsonClean(path.join(cacheDir, 'data', 'SkillGroup.json'), []);
      }
      if (!existsSync(path.join(cacheDir, 'data', 'SkillExtension.json'))) {
        await writeJsonClean(path.join(cacheDir, 'data', 'SkillExtension.json'), []);
      }
    }
  } else {
    await mkdir(path.join(cacheDir, 'data'), { recursive: true });
    await mkdir(path.join(cacheDir, 'l10n'), { recursive: true });
  }
}

async function runCheckOnlyInspection(fetchOpenApi) {
  console.log('\n[只读体检模式 --check-only] 正在查询官方 OpenAPI 最新实验体与本地化版本（不写入任何文件）...');
  const [charJson, levelJson, masteryJson, mStatJson, l10nJson] = [
    await fetchOpenApi('/v2/data/Character'),
    await fetchOpenApi('/v2/data/CharacterLevelUpStat'),
    await fetchOpenApi('/v2/data/CharacterMastery'),
    await fetchOpenApi('/v2/data/MasteryStat'),
    await fetchOpenApi('/v1/l10n/ChineseSimplified')
  ];

  const chars = (charJson.data || []).filter((c) => c.code > 0 && c.name && c.name !== 'None').sort((a, b) => a.code - b.code);
  const levels = levelJson.data || [];
  const masteries = masteryJson.data || [];
  const mStats = mStatJson.data || [];
  const l10Path = l10nJson?.data?.l10Path || '';
  const l10Ts = extractL10nTimestamp(l10Path);

  const targetChar = targetHeroArg
    ? chars.find((c) => (
      String(c.code) === targetHeroArg ||
      c.name.toLowerCase() === targetHeroArg.toLowerCase() ||
      c.resource?.toLowerCase() === targetHeroArg.toLowerCase()
    )) || chars[chars.length - 1]
    : chars[chars.length - 1];

  console.log('\n================ 官方 OpenAPI 实时探查结果 ================');
  console.log(`官方文本包时间戳 : ${formatL10nTimestamp(l10Ts)} (${l10Ts || '未知'})`);
  console.log(`官方表当前总行数 : Character=${chars.length} | LevelUpStat=${levels.length} | CharacterMastery=${masteries.length} | MasteryStat=${mStats.length}`);
  if (targetChar) {
    const lv = levels.find((x) => x.code === targetChar.code);
    const ms = masteries.find((x) => x.code === targetChar.code);
    const wStats = mStats.filter((x) => x.characterCode === targetChar.code);
    const weapons = ms ? ['weapon1', 'weapon2', 'weapon3', 'weapon4'].map((k) => ms[k]).filter((w) => w && w !== 'None') : [];
    console.log(`\n重点实验体核验 -> [${targetChar.code}] ${targetChar.name} (resource: ${targetChar.resource})`);
    console.log(`  · 1级基础属性  : ✅ HP=${targetChar.maxHp}, 攻击=${targetChar.attackPower}, 防御=${targetChar.defense}, 攻速修正=${targetChar.attackSpeed}, 移速=${targetChar.moveSpeed}`);
    console.log(`  · 每级成长属性 : ${lv ? `✅ HP+${lv.maxHp}, 攻击+${lv.attackPower}, 防御+${Number(lv.defense).toFixed(2)}` : '⏳ 官方尚未放出 (CharacterLevelUpStat 无记录)'}`);
    console.log(`  · 可用武器列表 : ${weapons.length ? `✅ ${weapons.join(', ')}` : '⏳ 官方尚未放出 (CharacterMastery 无记录)'}`);
    console.log(`  · 武器熟练度表 : ${wStats.length ? `✅ 共 ${wStats.length} 套熟练度记录` : '⏳ 官方尚未放出 (MasteryStat 无记录)'}`);
  }
  console.log('===========================================================\n');
}

function printHeroReadinessCard(targetQuery, { charsDoc, masteryStats, heroSkills, heroStatusDoc, presetsDoc, l10nTs }) {
  const characters = charsDoc?.characters || [];
  if (!characters.length) return;

  let target = null;
  if (targetQuery) {
    const q = targetQuery.toLowerCase();
    target = characters.find((c) => (
      String(c.code) === targetQuery ||
      c.name === targetQuery ||
      String(c.id || '').toLowerCase() === q ||
      String(c.resource || '').toLowerCase() === q ||
      String(c.englishName || '').toLowerCase() === q
    ));
  }
  if (!target) {
    target = [...characters].sort((a, b) => b.code - a.code)[0];
  }
  if (!target) return;

  const weapons = target.weapons || [];
  const mEntries = masteryStats.filter((m) => m.characterCode === target.code);
  const skills = (heroSkills?.skills || []).filter((s) => s.hero === target.name);
  const avatarRel = String(target.image || '').replace(/^\//, '');
  const avatarExists = avatarRel && existsSync(path.join(rootDir, avatarRel)) && statSync(path.join(rootDir, avatarRel)).size > 100;
  const missingPresets = weapons.filter((w) => !presetsDoc?.presets?.[`${target.name}|${w}`]);
  const isTestOnly = heroStatusDoc?.heroes?.[target.name]?.damageTestOnly === true;

  console.log('\n┌──────────────────────────────────────────────────────────────┐');
  console.log(`│ 实验体数据就绪看板：[${target.code}] ${target.name} (${target.id}) — ${isTestOnly ? '当前状态：测试服/待转正' : '当前状态：已正式开放'}`);
  console.log('├──────────────────────────────────────────────────────────────┤');
  console.log(`│ · 官方文本包版本 : ${formatL10nTimestamp(l10nTs)}`);
  console.log(`│ · 1 级基础属性   : ✅ HP ${target.base?.hp} / 攻击 ${target.base?.attackPower} / 防御 ${target.base?.defense} / 攻速 ${target.base?.attackSpeed}`);
  console.log(`│ · 每级成长属性   : ${target.growth ? `✅ HP +${target.growth.maxHp} / 攻击 +${target.growth.attackPower} / 防御 +${Number(target.growth.defense).toFixed(2)}` : '⏳ 暂缺（待正式服维护开服后重跑本脚本自动补齐）'}`);
  console.log(`│ · 武器与熟练度   : ${mEntries.length > 0 ? `✅ ${mEntries.map((m) => `${m.type}(${m.options.map((o) => `${o.stat}:${o.value}`).join(', ')})`).join(' | ')}` : `⏳ 熟练度暂缺（武器列表：${weapons.join(', ') || '无'}）`}`);
  console.log(`│ · 技能伤害公式   : ${skills.length >= 3 ? `✅ 已录入 ${skills.length} 条技能段` : `⚠ 仅 ${skills.length} 条技能段`}`);
  console.log(`│ · 头像与推荐出装 : 头像 ${avatarExists ? '✅' : '⏳暂缺'} | 出装预设 ${weapons.length && !missingPresets.length ? '✅齐全' : `⏳缺 ${missingPresets.join(', ') || '武器'}`}`);
  if (isTestOnly && target.growth && mEntries.length > 0 && (!avatarExists || missingPresets.length > 0)) {
    console.log('│ 💡 提示：官方成长与熟练度已到位！运行 update-bser.cmd -Full 可自动补抓头像/出装并转正开放。');
  }
  console.log('└──────────────────────────────────────────────────────────────┘');
}

async function main() {
  const startedAt = Date.now();
  console.log('==========================================================');
  console.log('  永恒轮回官方 OpenAPI (open-api.bser.io) 一键同步工具');
  console.log('==========================================================');

  const activeProxy = await setupNetworkProxy();
  const apiKey = await resolveApiKeyInMemory();
  console.log(`  ✓ 已载入内存 API Key: ${maskApiKey(apiKey)}（仅内存有效，绝不落盘）`);

  const fetchOpenApi = createOpenApiClient(apiKey);

  // 1. 拉取 /v2/data/hash 校验密钥并计算增量
  console.log('\n[1/4] 正在连接官方 OpenAPI 获取数据表 Hash 清单...');
  const hashResp = await fetchOpenApi('/v2/data/hash');
  const remoteHashes = hashResp.data || {};
  console.log(`  ✓ 连接成功，官方当前开放 ${Object.keys(remoteHashes).length} 张元数据表`);

  if (isCheckOnly) {
    await runCheckOnlyInspection(fetchOpenApi);
    return;
  }

  await ensureBaseCacheStructure(activeProxy);
  const prevState = await readJsonClean(statePath, { hashes: {}, fileSha1s: {}, counts: {}, l10n: {} });
  const nextState = {
    _comment: '官方 OpenAPI 本地增量缓存状态（仅记录公开表 Hash 与时间戳，不含任何密钥）',
    syncedAt: new Date().toISOString(),
    l10nTimestamp: prevState.l10nTimestamp || '',
    hasDirtyOverlay: false,
    counts: { ...(prevState.counts || {}) },
    hashes: { ...(prevState.hashes || {}) },
    fileSha1s: { ...(prevState.fileSha1s || {}) },
    l10n: { ...(prevState.l10n || {}) }
  };

  // 2. 按 Hash 增量拉取核心数据表
  console.log(`\n[2/4] 正在比对并增量同步 ${CORE_META_TYPES.length} 张核心官方数据表...`);
  let downloadedTables = 0;
  let skippedTables = 0;

  for (const meta of CORE_META_TYPES) {
    const rHash = String(remoteHashes[meta] || '');
    const targetFile = path.join(cacheDir, 'data', `${meta}.json`);
    const diskSha1 = await fileSha1IfExists(targetFile);

    const isUnchanged = !isForce
      && rHash
      && prevState.hashes?.[meta] === rHash
      && diskSha1
      && prevState.fileSha1s?.[meta] === diskSha1;

    if (isUnchanged) {
      skippedTables += 1;
      continue;
    }

    const resJson = await fetchOpenApi(`/v2/data/${meta}`);
    const rows = Array.isArray(resJson.data) ? resJson.data : [];
    const newSha1 = await writeJsonClean(targetFile, rows);

    nextState.hashes[meta] = rHash;
    nextState.fileSha1s[meta] = newSha1;
    nextState.counts[meta] = rows.length;
    downloadedTables += 1;
    console.log(`  ↓ 已更新 data/${meta}.json (${rows.length} 行)`);
  }
  console.log(`  ✓ 核心表同步完成：更新 ${downloadedTables} 张，未变动秒跳 ${skippedTables} 张`);

  // 3. 检查并增量同步官方本地化文本包 (ChineseSimplified / English) 与官方推荐路线兜底
  console.log('\n[3/4] 正在检查官方多语言文本包 (l10n) 与推荐路线...');
  for (const lang of L10N_LANGUAGES) {
    const l10nJson = await fetchOpenApi(`/v1/l10n/${lang}`);
    const l10Path = l10nJson?.data?.l10Path || '';
    if (!l10Path) continue;

    const ts = extractL10nTimestamp(l10Path);
    if (lang === 'ChineseSimplified' && ts) {
      nextState.l10nTimestamp = ts;
    }

    const targetTxtPath = path.join(cacheDir, 'l10n', `${lang}.txt`);
    const diskSha1 = await fileSha1IfExists(targetTxtPath);
    const prevLang = prevState.l10n?.[lang] || {};

    if (!isForce && prevLang.l10Path === l10Path && diskSha1 && prevLang.fileSha1 === diskSha1) {
      console.log(`  ⚡ l10n/${lang}.txt 未变动 (${formatL10nTimestamp(ts)})，已跳过下载`);
      continue;
    }

    console.log(`  ↓ 正在下载最新 l10n/${lang}.txt (${formatL10nTimestamp(ts)})...`);
    const txt = await downloadTextWithRetry(l10Path);
    await writeFile(targetTxtPath, txt, 'utf8');
    nextState.l10n[lang] = {
      l10Path,
      timestamp: ts,
      fileSha1: sha1OfBuffer(Buffer.from(txt, 'utf8'))
    };
    console.log(`  ✓ l10n/${lang}.txt 已写入 (${(Buffer.byteLength(txt, 'utf8') / 1024 / 1024).toFixed(2)} MB)`);
  }

  // 安全补充官方推荐路线兜底池（绝不覆盖 119 套 weaponRoutesRecommend.json）
  try {
    const recJson = await fetchOpenApi('/v1/weaponRoutes/recommend');
    const apiRoutes = (recJson.result || []).map((x) => x?.recommendWeaponRoute || x).filter((r) => r?.characterCode);
    if (apiRoutes.length > 0) {
      const officialPath = path.join(sourcesDir, 'officialWeaponRoutes.json');
      const curOfficial = await readJsonClean(officialPath, []);
      const existingIds = new Set(curOfficial.map((r) => `${r.characterCode}|${r.weaponType}|${r.id || ''}`));
      let addedRoutes = 0;
      for (const r of apiRoutes) {
        const key = `${r.characterCode}|${r.weaponType}|${r.id || ''}`;
        if (!existingIds.has(key)) {
          curOfficial.push(r);
          existingIds.add(key);
          addedRoutes += 1;
        }
      }
      if (addedRoutes > 0) {
        await writeJsonClean(officialPath, curOfficial);
        console.log(`  + 已向 officialWeaponRoutes.json 补充 ${addedRoutes} 条官方推荐路线兜底`);
      }
    }
  } catch (err) {
    console.warn(`  ⚠ 拉取官方推荐路线兜底跳过：${err.message}`);
  }

  // 记录 .er-gamedata-cache 是否含领先于 git 的官方覆盖改动
  if (existsSync(path.join(cacheDir, '.git'))) {
    try {
      const dirty = execFileSync('git', ['-C', cacheDir, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim();
      nextState.hasDirtyOverlay = Boolean(dirty);
    } catch {
      nextState.hasDirtyOverlay = false;
    }
  }
  await writeJsonClean(statePath, nextState);

  // 4. 编译 erGameData.json / masteryStats.json / weaponTypeInfo.json
  console.log('\n[4/4] 正在生成最新底层表并同步仓库活数据...');
  runNodeScript('scripts/update-er-gamedata.mjs', ['--skip-git'], activeProxy);

  if (isCacheOnly) {
    console.log(`\n✓ 官方 OpenAPI 缓存与 masteryStats/weaponTypeInfo 更新完成（耗时 ${((Date.now() - startedAt) / 1000).toFixed(1)}s）。`);
    return;
  }

  // 独立运行模式：安全同步 equipment.json 与 characters.json（绝不修改 heroSkills.json / weaponSkills.json）
  const erGameData = await readJsonClean(path.join(sourcesDir, 'erGameData.json'));
  const equipDoc = await readJsonClean(path.join(dataDir, 'equipment.json'));
  const charsDoc = await readJsonClean(path.join(dataDir, 'characters.json'));
  const heroStatusDoc = await readJsonClean(path.join(dataDir, 'heroStatus.json'), { heroes: {} });

  let equipAdded = 0;
  let equipChanged = 0;
  if (erGameData?.equipment?.length && equipDoc?.equipment) {
    const customItems = equipDoc.equipment.filter((item) => !item.code);
    const oldByCode = new Map(equipDoc.equipment.filter((item) => item.code).map((item) => [item.code, item]));
    for (const fresh of erGameData.equipment) {
      const prev = oldByCode.get(fresh.code);
      if (!prev) equipAdded += 1;
      else if (formatStatSummary(prev.stats) !== formatStatSummary(fresh.stats)) equipChanged += 1;
    }
    const nextEquipment = [...erGameData.equipment, ...customItems];
    const nextStatDefs = erGameData.itemStatDefinitions?.length ? erGameData.itemStatDefinitions : equipDoc.itemStatDefinitions;
    await writeJsonClean(path.join(dataDir, 'equipment.json'), {
      _comment: equipDoc._comment || '装备总表：属性定义 + 全部装备。与英雄技能分开存储。',
      _usage: equipDoc._usage || '改官方装备数值直接改这里；新增自定义装备追加一条，name 不要与官方重名。',
      generatedAt: new Date().toISOString(),
      source: 'Official BSER OpenAPI (https://open-api.bser.io)',
      counts: { items: nextEquipment.length, statDefinitions: (nextStatDefs || []).length },
      itemStatDefinitions: nextStatDefs || [],
      equipment: nextEquipment
    });
    console.log(`  ✓ equipment.json 已同步：共 ${nextEquipment.length} 件（新增 ${equipAdded} 件，面板调整 ${equipChanged} 件）`);
  }

  let charAdded = 0;
  let charChanged = 0;
  if (erGameData?.characters?.length && charsDoc?.characters) {
    const oldByCode = new Map(charsDoc.characters.map((c) => [c.code, c]));
    const mergedChars = [];
    let statusTouched = false;

    for (const fresh of erGameData.characters) {
      const prev = oldByCode.get(fresh.code);
      if (!prev) {
        mergedChars.push(fresh);
        charAdded += 1;
        if (!heroStatusDoc.heroes[fresh.name]) {
          heroStatusDoc.heroes[fresh.name] = {
            verified: false,
            damageTestOnly: true,
            note: '官方 OpenAPI 自动入库新实验体，待核对技能伤害公式与头像预设后将 damageTestOnly 设为 false'
          };
          statusTouched = true;
        }
      } else {
        const merged = {
          ...prev,
          ...fresh,
          name: (fresh.name === fresh.id && prev.name && prev.name !== prev.id) ? prev.name : fresh.name,
          weapons: (Array.isArray(fresh.weapons) && fresh.weapons.length > 0) ? fresh.weapons : (prev.weapons || []),
          growth: fresh.growth || prev.growth || null,
          ratings: (Array.isArray(fresh.ratings) && fresh.ratings.length > 0) ? fresh.ratings : (prev.ratings || []),
          playTip: fresh.playTip || prev.playTip || '',
          storyName: fresh.storyName || prev.storyName || '',
          image: prev.image || fresh.image
        };
        const beforeSnap = JSON.stringify({ base: prev.base, growth: prev.growth, weapons: prev.weapons });
        const afterSnap = JSON.stringify({ base: merged.base, growth: merged.growth, weapons: merged.weapons });
        if (beforeSnap !== afterSnap) charChanged += 1;
        mergedChars.push(merged);
      }
    }

    mergedChars.sort((a, b) => a.code - b.code);
    const nextSkillGroups = erGameData.rawSkillGroups?.length ? erGameData.rawSkillGroups : charsDoc.skillGroups;
    await writeJsonClean(path.join(dataDir, 'characters.json'), {
      _comment: charsDoc._comment || '实验体总表：基础属性、每级成长、武器、技能组索引。',
      _usage: charsDoc._usage || '基础/成长数值随官方公告更新；技能伤害不放这里，见 heroSkills.json。',
      generatedAt: new Date().toISOString(),
      source: 'Official BSER OpenAPI (https://open-api.bser.io)',
      counts: { characters: mergedChars.length, skillGroups: (nextSkillGroups || []).length },
      characters: mergedChars,
      skillGroups: nextSkillGroups || []
    });
    if (statusTouched) {
      await writeJsonClean(path.join(dataDir, 'heroStatus.json'), heroStatusDoc);
    }
    console.log(`  ✓ characters.json 已同步：共 ${mergedChars.length} 名实验体（新增 ${charAdded} 名，基础/成长/武器更新 ${charChanged} 名）`);
  }

  // 若本地已按周三官网公告预录入了周四维护补丁，而官方 OpenAPI 仍在维护前旧版，自动叠跑 apply-patch-log 保护预录入数值
  const patchLogDoc = await readJsonClean(path.join(dataDir, 'patchLog.json'), { patches: [] });
  const latestPatch = [...(patchLogDoc.patches || [])].sort((a, b) => (b.order || 0) - (a.order || 0))[0];
  const openApiDate = l10nTimestampToIsoDate(nextState.l10nTimestamp);
  if (latestPatch?.date && openApiDate && latestPatch.date > openApiDate) {
    console.log(`  ℹ 检测到本地预录入补丁 ${latestPatch.version} (${latestPatch.date}) 新于当前官方正式服接口 (${openApiDate})，自动叠加保护...`);
    runNodeScript('scripts/apply-patch-log.mjs', ['--from', latestPatch.version], activeProxy);
  }

  // 输出目标/最新实验体就绪看板并执行全项目自检
  const finalCharsDoc = await readJsonClean(path.join(dataDir, 'characters.json'));
  const finalMastery = await readJsonClean(path.join(dataDir, 'masteryStats.json'), []);
  const finalHeroSkills = await readJsonClean(path.join(dataDir, 'heroSkills.json'), { skills: [] });
  const finalHeroStatus = await readJsonClean(path.join(dataDir, 'heroStatus.json'), { heroes: {} });
  const finalPresets = await readJsonClean(path.join(dataDir, 'weaponRoutePresets.json'), { presets: {} });

  printHeroReadinessCard(targetHeroArg, {
    charsDoc: finalCharsDoc,
    masteryStats: finalMastery,
    heroSkills: finalHeroSkills,
    heroStatusDoc: finalHeroStatus,
    presetsDoc: finalPresets,
    l10nTs: nextState.l10nTimestamp
  });

  console.log('\n[+] 正在执行全项目一致性自检 (scripts/self-check.mjs)...');
  runNodeScript('scripts/self-check.mjs', [], activeProxy);
  console.log(`\n🎉 官方 OpenAPI 一键抓取与同步完成（总耗时 ${((Date.now() - startedAt) / 1000).toFixed(1)}s）！`);
}

main().catch((err) => {
  console.error(`\n❌ 执行中止：${err.message}`);
  process.exitCode = 1;
});
