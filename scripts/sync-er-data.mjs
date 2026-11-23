// scripts/sync-er-data.mjs
// 永恒轮回数据巡检与模块化同步工具（零外部依赖，默认绝不改动 heroSkills.json）
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'src', 'data');
const sourcesDir = path.join(dataDir, 'sources');
const avatarDir = path.join(rootDir, 'assets', 'characters');
const cacheDir = path.join(rootDir, '.er-gamedata-cache');

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const getArg = (flag, fallback = '') => {
  const idx = args.indexOf(flag);
  return idx >= 0 && args[idx + 1] && !args[idx + 1].startsWith('--') ? args[idx + 1] : fallback;
};

// 读取 JSON（自动剥离可能存在的 UTF-8 BOM 头）
async function readJsonClean(filePath, fallback = null) {
  if (!existsSync(filePath)) return fallback;
  const raw = (await readFile(filePath, 'utf8')).replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

async function writeJsonClean(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function normalizeHeroToken(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/^mini_/, '')
    .replace(/_\d+.*$/, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '');
}

// Fan Kit 文件名与内部 resource 的特殊别名映射
const FANKIT_NAME_ALIASES = {
  debimarlene: 'DebiMarlene',
  debiandmarlene: 'DebiMarlene',
  lidailin: 'LiDailin',
  lyanh: 'Lyanh',
  yumin: 'YuMin',
  istvan: 'Istvan'
};

function extractDriveFolderId(urlOrId) {
  const raw = String(urlOrId || '').trim();
  const match = raw.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : raw;
}

// ============================================================================
// 模块 1：当前仓库缺口只读体检
// ============================================================================
async function runStatusCheck() {
  const charsDoc = await readJsonClean(path.join(dataDir, 'characters.json'), { characters: [] });
  const heroStatus = await readJsonClean(path.join(dataDir, 'heroStatus.json'), { heroes: {} });
  const heroSkills = await readJsonClean(path.join(dataDir, 'heroSkills.json'), { skills: [] });
  const patchLog = await readJsonClean(path.join(dataDir, 'patchLog.json'), {});

  const chars = charsDoc.characters || [];
  const presentPngs = new Set(existsSync(avatarDir) ? readdirSync(avatarDir).filter((f) => f.endsWith('.png')) : []);

  const missingAvatars = chars.filter((c) => !presentPngs.has(`${String(c.code).padStart(3, '0')}-${c.resource}.png`));
  const missingGrowth = chars.filter((c) => !c.growth);
  const missingWeapons = chars.filter((c) => !Array.isArray(c.weapons) || c.weapons.length === 0);
  const unverified = chars.filter((c) => heroStatus.heroes?.[c.name]?.damageTestOnly !== false);

  console.log('================ 仓库数据体检报告 ================');
  console.log(`当前记录游戏版本 : ${patchLog.gameVersion?.label || '未知'} (${patchLog.gameVersion?.date || ''})`);
  console.log(`已登记实验体总数 : ${chars.length} 名`);
  console.log(`已开放(已校准)   : ${chars.length - unverified.length} 名 | 默认隐藏(待校准): ${unverified.length} 名`);
  console.log(`缺失小头像 PNG   : ${missingAvatars.length} 张 -> ${missingAvatars.map((c) => `${String(c.code).padStart(3, '0')}-${c.resource}.png`).join(', ') || '无'}`);
  console.log(`缺失成长属性     : ${missingGrowth.length} 名 -> ${missingGrowth.map((c) => `${c.name}(code ${c.code})`).join(', ') || '无'}`);
  console.log(`缺失武器列表     : ${missingWeapons.length} 名 -> ${missingWeapons.map((c) => `${c.name}(code ${c.code})`).join(', ') || '无'}`);

  const zeroSkillHeroes = chars.filter((c) => !heroSkills.skills.some((s) => s.hero === c.name));
  console.log(`零技能条目实验体 : ${zeroSkillHeroes.length} 名 -> ${zeroSkillHeroes.map((c) => `${c.name}(code ${c.code})`).join(', ') || '无'}`);
  console.log('==================================================\n');
}

// ============================================================================
// 模块 2：小头像同步（支持 Google Drive Fan Kit API 直抓 / 本地拖入目录归档）
// ============================================================================
async function syncAvatarsFromLocalDir(localScanDir) {
  const charsDoc = await readJsonClean(path.join(dataDir, 'characters.json'), { characters: [] });
  const manifestPath = path.join(avatarDir, 'manifest.json');
  const manifest = await readJsonClean(manifestPath, []);

  // 建立归一化角色查找索引（严格按内部 code 命名，避免 Fan Kit 上线序号错位）
  const charByNorm = new Map();
  for (const c of charsDoc.characters || []) {
    charByNorm.set(normalizeHeroToken(c.resource), c);
    charByNorm.set(normalizeHeroToken(c.englishName), c);
    charByNorm.set(normalizeHeroToken(c.id), c);
  }

  const walkPngs = (dir, acc = []) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walkPngs(full, acc);
      else if (/^Mini_.*_00\.png$/i.test(entry) || entry.toLowerCase().endsWith('mini.png')) acc.push(full);
    }
    return acc;
  };

  const candidates = walkPngs(path.resolve(rootDir, localScanDir));
  let savedCount = 0;

  for (const filePath of candidates) {
    const base = path.basename(filePath, '.png');
    const norm = normalizeHeroToken(base.replace(/mini$/i, ''));
    const mappedResource = FANKIT_NAME_ALIASES[norm];
    const targetChar = (mappedResource && (charsDoc.characters || []).find((c) => c.resource === mappedResource))
      || charByNorm.get(norm);

    if (!targetChar) {
      console.warn(`  [跳过未匹配文件] ${path.basename(filePath)}`);
      continue;
    }

    const outName = `${String(targetChar.code).padStart(3, '0')}-${targetChar.resource}.png`;
    const outPath = path.join(avatarDir, outName);
    const buf = await readFile(filePath);
    await writeFile(outPath, buf);
    const sha1 = createHash('sha1').update(buf).digest('hex');

    const record = {
      code: targetChar.code,
      name: targetChar.id,
      resource: targetChar.resource,
      file: `assets/characters/${outName}`,
      sourcePage: 'Official Fan Kit (Local Import)',
      sha1,
      bytes: buf.length
    };
    const idx = manifest.findIndex((m) => m.code === targetChar.code);
    if (idx >= 0) manifest[idx] = { ...manifest[idx], ...record };
    else manifest.push(record);

    savedCount += 1;
    console.log(`  [已归档头像] ${path.basename(filePath)} -> assets/characters/${outName}`);
  }

  manifest.sort((a, b) => a.code - b.code);
  await writeJsonClean(manifestPath, manifest); // 同时去除 BOM 头
  console.log(`本地 Fan Kit 头像扫描完成：共写入 ${savedCount} 张，已标准化 manifest.json。`);
}

async function syncAvatarsFromFanKitDrive(fanKitUrl, apiKey, forceAll = false) {
  const rootFolderId = extractDriveFolderId(fanKitUrl);
  if (!rootFolderId || !apiKey) {
    throw new Error('使用网盘直连模式需同时提供 --fankit-url 与 --gdrive-key');
  }

  const charsDoc = await readJsonClean(path.join(dataDir, 'characters.json'), { characters: [] });
  const manifestPath = path.join(avatarDir, 'manifest.json');
  const manifest = await readJsonClean(manifestPath, []);
  const presentPngs = new Set(existsSync(avatarDir) ? readdirSync(avatarDir) : []);

  const missingChars = (charsDoc.characters || []).filter((c) => (
    forceAll || !presentPngs.has(`${String(c.code).padStart(3, '0')}-${c.resource}.png`)
  ));

  if (!missingChars.length) {
    await writeJsonClean(manifestPath, manifest);
    console.log('所有已登记实验体的小头像均已齐全，无需下载（已顺手清理 manifest.json BOM 头）。');
    return;
  }

  console.log(`准备从官方 Fan Kit 网盘检索 ${missingChars.length} 名缺失头像角色：${missingChars.map((c) => c.resource).join(', ')}`);

  const gdriveList = async (q) => {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', `${q} and trashed = false`);
    url.searchParams.set('pageSize', '200');
    url.searchParams.set('fields', 'files(id,name,mimeType,size)');
    url.searchParams.set('key', apiKey);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google Drive API 请求失败 (${res.status}): ${await res.text()}`);
    const data = await res.json();
    return data.files || [];
  };

  // 1. 定位 01. Character 目录
  const rootChildren = await gdriveList(`'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`);
  const charRoot = rootChildren.find((f) => /character/i.test(f.name));
  if (!charRoot) throw new Error('未在 Fan Kit 根目录下找到 01. Character 文件夹');

  // 2. 列出角色文件夹（注意：文件夹序号是上线顺序，只用英文名匹配！）
  const heroFolders = await gdriveList(`'${charRoot.id}' in parents and mimeType = 'application/vnd.google-apps.folder'`);

  for (const targetChar of missingChars) {
    const targetNorm = normalizeHeroToken(targetChar.resource);
    const matchedFolder = heroFolders.find((f) => {
      const folderHeroName = f.name.replace(/^\d+\.\s*/, '');
      const folderNorm = normalizeHeroToken(folderHeroName);
      const aliased = FANKIT_NAME_ALIASES[folderNorm];
      return folderNorm === targetNorm || (aliased && normalizeHeroToken(aliased) === targetNorm);
    });

    if (!matchedFolder) {
      console.warn(`  [未找到目录] Fan Kit 中暂未发现 ${targetChar.resource} 文件夹`);
      continue;
    }

    // 3. 进入 02. Default 子目录只找 Mini_*_00.png
    const subFolders = await gdriveList(`'${matchedFolder.id}' in parents and mimeType = 'application/vnd.google-apps.folder'`);
    const defaultFolder = subFolders.find((f) => /default/i.test(f.name)) || matchedFolder;
    const pngFiles = await gdriveList(`'${defaultFolder.id}' in parents and mimeType = 'image/png'`);
    const miniFile = pngFiles.find((f) => /^Mini_.*_00\.png$/i.test(f.name)) || pngFiles.find((f) => /mini/i.test(f.name));

    if (!miniFile) {
      console.warn(`  [未找到小头像] ${matchedFolder.name} 下没有 Mini_*_00.png`);
      continue;
    }

    const dlUrl = `https://www.googleapis.com/drive/v3/files/${miniFile.id}?alt=media&key=${apiKey}`;
    const imgRes = await fetch(dlUrl);
    if (!imgRes.ok) throw new Error(`下载 ${miniFile.name} 失败: ${imgRes.status}`);
    const buf = Buffer.from(await imgRes.arrayBuffer());

    const outName = `${String(targetChar.code).padStart(3, '0')}-${targetChar.resource}.png`;
    await writeFile(path.join(avatarDir, outName), buf);
    const sha1 = createHash('sha1').update(buf).digest('hex');

    const record = {
      code: targetChar.code,
      name: targetChar.id,
      resource: targetChar.resource,
      file: `assets/characters/${outName}`,
      sourcePage: 'Official Fan Kit',
      sha1,
      bytes: buf.length
    };
    const idx = manifest.findIndex((m) => m.code === targetChar.code);
    if (idx >= 0) manifest[idx] = { ...manifest[idx], ...record };
    else manifest.push(record);

    console.log(`  [下载成功] ${miniFile.name} -> assets/characters/${outName} (${buf.length} bytes)`);
  }

  manifest.sort((a, b) => a.code - b.code);
  await writeJsonClean(manifestPath, manifest);
}

// ============================================================================
// 模块 3：底层数据拉取（支持官方 BSER Open API 直连 或 pypy-vrc/er-gamedata）
// ============================================================================
async function syncFromOfficialApiToCache(bserKey) {
  const baseUrl = 'https://open-api.bser.io';
  const headers = { 'x-api-key': bserKey, accept: 'application/json' };
  await mkdir(path.join(cacheDir, 'data'), { recursive: true });
  await mkdir(path.join(cacheDir, 'l10n'), { recursive: true });

  const metaTypes = [
    'Character', 'CharacterLevelUpStat', 'CharacterMastery', 'MasteryStat',
    'CharacterAttributes', 'SkillGroup', 'Skill', 'SkillExtension',
    'ItemWeapon', 'ItemArmor', 'Trait'
  ];

  console.log('正在从永恒轮回官方 Open API 拉取核心数据表...');
  for (const meta of metaTypes) {
    const res = await fetch(`${baseUrl}/v2/data/${meta}`, { headers });
    if (!res.ok) {
      console.warn(`  [跳过] /v2/data/${meta} 返回 ${res.status}`);
      continue;
    }
    const json = await res.json();
    if (json.data) {
      await writeJsonClean(path.join(cacheDir, 'data', `${meta}.json`), json.data);
      console.log(`  + data/${meta}.json (${Array.isArray(json.data) ? json.data.length : 'OK'})`);
    }
  }

  for (const lang of ['ChineseSimplified', 'English']) {
    const res = await fetch(`${baseUrl}/v1/l10n/${lang}`, { headers });
    if (!res.ok) continue;
    const json = await res.json();
    const l10Path = json?.data?.l10Path;
    if (l10Path) {
      const txtRes = await fetch(l10Path);
      const txt = await txtRes.text();
      await writeFile(path.join(cacheDir, 'l10n', `${lang}.txt`), txt, 'utf8');
      console.log(`  + l10n/${lang}.txt 已更新`);
    }
  }

  // 同步推荐武器路线
  const routeRes = await fetch(`${baseUrl}/v1/weaponRoutes/recommend`, { headers });
  if (routeRes.ok) {
    const routeJson = await routeRes.json();
    if (routeJson?.result) {
      await writeJsonClean(path.join(sourcesDir, 'weaponRoutesRecommend.json'), routeJson);
      console.log(`  + sources/weaponRoutesRecommend.json (${routeJson.result.length} 条推荐路线)`);
    }
  }
}

async function fillMissingCharacterData() {
  const erGameData = await readJsonClean(path.join(sourcesDir, 'erGameData.json'));
  if (!erGameData?.characters?.length) {
    console.warn('未找到 sources/erGameData.json，请先运行 --sync-gamedata');
    return;
  }

  const charsDoc = await readJsonClean(path.join(dataDir, 'characters.json'));
  const existingByCode = new Map((charsDoc.characters || []).map((c) => [c.code, c]));
  const existingGroups = new Set((charsDoc.skillGroups || []).map((g) => g.group));
  let updatedCount = 0;
  let addedCount = 0;

  for (const fresh of erGameData.characters) {
    const cur = existingByCode.get(fresh.code);
    if (!cur) {
      charsDoc.characters.push(fresh);
      addedCount += 1;
      console.log(`  [新增实验体骨架] ${fresh.code} ${fresh.name} (${fresh.id})`);
      continue;
    }
    // 仅安全补齐缺失的成长、武器、未翻译占位名与描述，不覆盖已受补丁管理的数值
    let touched = false;
    if (!cur.growth && fresh.growth) { cur.growth = fresh.growth; touched = true; }
    if ((!cur.weapons || !cur.weapons.length) && fresh.weapons?.length) { cur.weapons = fresh.weapons; touched = true; }
    if (cur.name === cur.id && fresh.name !== fresh.id) { cur.name = fresh.name; touched = true; }
    if (!cur.playTip && fresh.playTip) { cur.playTip = fresh.playTip; touched = true; }
    if (!cur.storyName && fresh.storyName) { cur.storyName = fresh.storyName; touched = true; }
    if ((!cur.ratings || !cur.ratings.length) && fresh.ratings?.length) { cur.ratings = fresh.ratings; touched = true; }
    if (touched) {
      updatedCount += 1;
      console.log(`  [补齐缺失字段] ${cur.code} ${cur.name}`);
    }
  }

  for (const grp of erGameData.rawSkillGroups || []) {
    if (!existingGroups.has(grp.group)) {
      charsDoc.skillGroups.push(grp);
    }
  }

  charsDoc.characters.sort((a, b) => a.code - b.code);
  charsDoc.counts = {
    characters: charsDoc.characters.length,
    skillGroups: charsDoc.skillGroups.length
  };
  await writeJsonClean(path.join(dataDir, 'characters.json'), charsDoc);
  console.log(`安全补齐完成：补全 ${updatedCount} 名实验体缺失属性，新增 ${addedCount} 名实验体（未改动 heroSkills.json）。`);
}

// ============================================================================
// 模块 4：顺号扫描官网简中更新日志与「不停机维护」（解决分类列表漏热修问题）
// ============================================================================
async function scanOfficialPatchNotes(startId, endId) {
  console.log(`正在顺号扫描永恒轮回官网简中公告 #${startId} ~ #${endId} ...`);
  const found = [];
  const batchSize = 8;

  for (let base = startId; base <= endId; base += batchSize) {
    const ids = Array.from({ length: Math.min(batchSize, endId - base + 1) }, (_, i) => base + i);
    const batchResults = await Promise.all(ids.map(async (id) => {
      const url = `https://playeternalreturn.com/posts/news/${id}?hl=zh-CN`;
      try {
        const res = await fetch(url, {
          headers: { 'user-agent': 'Mozilla/5.0', 'accept-language': 'zh-CN,zh;q=0.9' }
        });
        if (!res.ok) return null;
        const html = await res.text();
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        const rawTitle = titleMatch ? titleMatch[1].replace(/\s*-\s*永恒轮回.*$/i, '').trim() : '';
        if (!rawTitle || /永恒轮回\s*Eternal Return/i.test(rawTitle)) return null;
        const isPatchOrHotfix = /(更新日志|不停机维护|维护结束|内容调整|补丁|新实验体)/i.test(rawTitle);
        if (!isPatchOrHotfix) return null;
        const hasArrowDelta = html.includes('→') || html.includes('-&gt;');
        return { id, title: rawTitle, hasNumericDelta: hasArrowDelta, url };
      } catch {
        return null;
      }
    }));

    for (const item of batchResults.filter(Boolean)) {
      found.push(item);
      console.log(`  [${item.hasNumericDelta ? '含数值改动' : '纯说明/修复'}] #${item.id} ${item.title}`);
    }
  }

  const outPath = path.join(rootDir, 'docs', 'official-patch-updates', 'pending-patches-scan.json');
  await writeJsonClean(outPath, {
    scannedAt: new Date().toISOString(),
    range: [startId, endId],
    count: found.length,
    articles: found
  });
  console.log(`\n扫描结束：共发现 ${found.length} 篇相关公告，清单已保存至 docs/official-patch-updates/pending-patches-scan.json`);
}

// ============================================================================
// 入口调度
// ============================================================================
async function main() {
  const bserKey = getArg('--bser-key', process.env.BSER_API_KEY || '');
  const fanKitUrl = getArg('--fankit-url', process.env.ER_FANKIT_URL || '');
  const gdriveKey = getArg('--gdrive-key', process.env.GDRIVE_API_KEY || '');
  const fanKitLocal = getArg('--fankit-local', '');

  if (hasFlag('--sync-gamedata')) {
    if (bserKey) {
      await syncFromOfficialApiToCache(bserKey);
    }
    console.log('运行 scripts/update-er-gamedata.mjs 更新 sources/erGameData.json 与 masteryStats.json ...');
    execFileSync('node', ['scripts/update-er-gamedata.mjs'], { cwd: rootDir, stdio: 'inherit' });
  }

  if (hasFlag('--fill-missing')) {
    await fillMissingCharacterData();
  }

  if (fanKitLocal) {
    await syncAvatarsFromLocalDir(fanKitLocal);
  } else if (fanKitUrl && gdriveKey) {
    await syncAvatarsFromFanKitDrive(fanKitUrl, gdriveKey, hasFlag('--force-avatars'));
  }

  if (hasFlag('--scan-patches')) {
    const startId = Number(getArg('--start-id', '3811'));
    const endId = Number(getArg('--end-id', '3985'));
    await scanOfficialPatchNotes(startId, endId);
  }

  await runStatusCheck();
}

main().catch((err) => {
  console.error('执行出错：', err.message);
  process.exitCode = 1;
});