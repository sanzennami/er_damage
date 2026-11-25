// scripts/auto-update.mjs
// 零 Agent 依赖的一键日常版本同步脚本（纯 Node.js 内置模块，零第三方依赖）
//
// 自动完成以下 6 件事（且【绝对不修改】已人工校准的 heroSkills.json / weaponSkills.json 公式）：
//   1. 拉取最新 pypy-vrc/er-gamedata，更新 masteryStats.json（武器熟练度）与 weaponTypeInfo.json（武器基础攻速）
//   2. 安全同步 equipment.json（全装备基础词条 + 新装备入库，保留自定义无 code 装备）与 characters.json（角色基础/成长面板 + 新角色）
//   3. 从 dak.gg 极速增量更新装备/技能/潜能/战术技能中文 Tooltip，仅下载本地缺失的新图标与新实验体小头像
//   4. 从最新装备 Tooltip 自动提取并更新 itemUniqueEffects.json（独有特效名映射），增量登记新潜能占位
//   5. 调用 sync-weapon-routes.mjs 同步全实验体 × 全武器最新赛季高赞推荐出装（weaponRoutePresets.json）
//   6. 自动比对旧版与新版 Tooltip 差异，输出人话版《docs/auto-update-report.md》待核对公式清单，并执行 self-check.mjs
//
// 用法：
//   npm run update:auto                  # 推荐：自动探测代理并执行全套更新
//   node scripts/auto-update.mjs         # 直接运行（可配合 NODE_USE_ENV_PROXY=1）
//   node scripts/auto-update.mjs --skip-routes   # 跳过推荐出装同步（更快）
//   node scripts/auto-update.mjs --offline       # 离线模式：仅用本地已拉取缓存同步表并做自检

import './lib/proxy-preload.mjs';
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
const gameIconsDir = path.join(rootDir, 'assets', 'game-icons');
const loadoutAssetsDir = path.join(rootDir, 'assets', 'loadout');
const avatarDir = path.join(rootDir, 'assets', 'characters');
const snapshotPath = path.join(sourcesDir, 'dakTooltipSnapshot.json');
const reportPath = path.join(rootDir, 'docs', 'auto-update-report.md');

const args = process.argv.slice(2);
const isOffline = args.includes('--offline');
const skipRoutes = args.includes('--skip-routes');
const proxyIdx = args.indexOf('--proxy');
const explicitProxy = proxyIdx >= 0 ? (args[proxyIdx + 1] || '').trim() : '';

const DAK_API_BASE = 'https://er.dakgg.io/api/v1/data';
const DAK_LOCALE = 'zh-CN';

// dak.gg 装备 Tooltip <b> 标签与仓库内部建模特效名的已知译名归一
const EFFECT_NAME_ALIASES = {
  双重面具: '双重假面'
};

async function readJson(filePath, fallback = null) {
  if (!existsSync(filePath)) return fallback;
  const raw = (await readFile(filePath, 'utf8')).replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function stripMarkup(text) {
  return String(text || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normForDiff(text) {
  return stripMarkup(text).replace(/\s+/g, ' ').trim();
}

function normalizePart(value) {
  return String(value || 'none')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'none';
}

function normalizeUrl(url) {
  if (!url) return '';
  return url.startsWith('//') ? `https:${url}` : url;
}

function itemSubType(item) {
  return item.weaponType || item.armorType || item.consumableType || item.miscItemType || item.specialItemType || item.type;
}

function parseUniqueEffectsFromTooltip(tooltip) {
  if (!tooltip) return [];
  const out = [];
  const re = /<b>([\s\S]*?)<\/b>([\s\S]*?)(?=<b>|$)/gi;
  let match;
  while ((match = re.exec(tooltip)) !== null) {
    let name = stripMarkup(match[1]);
    const body = stripMarkup(match[2]);
    if (!name) continue;
    if (EFFECT_NAME_ALIASES[name]) name = EFFECT_NAME_ALIASES[name];
    if (name === '减少治愈' || name === '减少治疗') {
      const pctMatch = body.match(/(\d+)\s*%/);
      name = pctMatch ? `减少治疗（${pctMatch[1]}%）` : '减少治疗（20%）';
    }
    if (!out.includes(name)) out.push(name);
  }
  return out;
}

function extractUniqueEffectBody(tooltip) {
  if (!tooltip) return '';
  const idx = tooltip.search(/<b>/i);
  if (idx < 0) return '';
  return stripMarkup(tooltip.slice(idx));
}

async function fetchDakEndpoint(endpoint) {
  const url = `${DAK_API_BASE}/${endpoint}?hl=${DAK_LOCALE}`;
  const res = await fetch(url, {
    headers: {
      accept: 'application/json',
      referer: 'https://dak.gg/er/routes/simulator?hl=zh-CN',
      'user-agent': 'Mozilla/5.0'
    },
    signal: AbortSignal.timeout(25000)
  });
  if (!res.ok) throw new Error(`请求 ${url} 失败: HTTP ${res.status}`);
  return res.json();
}

async function downloadFileIfMissing(url, targetPath, referer = 'https://dak.gg/') {
  if (existsSync(targetPath)) {
    try {
      const st = statSync(targetPath);
      if (st.size > 128) return { existed: true, ok: true, bytes: st.size };
    } catch {
      // ignore and re-download
    }
  }
  const fullUrl = normalizeUrl(url);
  if (!fullUrl) return { existed: false, ok: false, bytes: 0, error: 'empty url' };
  try {
    const res = await fetch(fullUrl, {
      headers: { 'user-agent': 'Mozilla/5.0', referer },
      signal: AbortSignal.timeout(20000)
    });
    if (!res.ok) return { existed: false, ok: false, bytes: 0, error: `HTTP ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 128) return { existed: false, ok: false, bytes: buf.length, error: 'file too small' };
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, buf);
    return { existed: false, ok: true, bytes: buf.length, buffer: buf };
  } catch (err) {
    return { existed: false, ok: false, bytes: 0, error: err.message };
  }
}

function formatStatSummary(stats = {}) {
  return Object.entries(stats)
    .filter(([, v]) => Number(v) !== 0)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ');
}

function buildProxyEnv() {
  const env = { ...process.env };
  const activeProxy = explicitProxy || env.HTTPS_PROXY || env.HTTP_PROXY || '';
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

function runNodeScript(scriptRelPath, scriptArgs = [], { withProxyPreload = false } = {}) {
  const env = buildProxyEnv();
  const nodeArgs = [];
  if (withProxyPreload) {
    nodeArgs.push('--import', './scripts/lib/proxy-preload.mjs');
  }
  nodeArgs.push(path.join(rootDir, scriptRelPath), ...scriptArgs);
  execFileSync(process.execPath, nodeArgs, {
    cwd: rootDir,
    stdio: 'inherit',
    env
  });
}

async function main() {
  const startedAt = new Date();
  console.log('==========================================================');
  console.log('  永恒轮回伤害计算器 · 零 Agent 全自动增量更新流水线');
  console.log('==========================================================\n');

  const report = {
    equipmentAdded: [],
    equipmentRemoved: [],
    equipmentStatChanged: [],
    charactersAdded: [],
    characterStatChanged: [],
    newIconsDownloaded: 0,
    newAvatarsDownloaded: [],
    uniqueEffectsChanged: [],
    unmodeledNewEffects: [],
    newTraitsAdded: [],
    skillTooltipChanges: [],
    weaponSkillTooltipChanges: [],
    itemEffectTextChanges: [],
    traitTooltipChanges: [],
    discoveredOfficialPatches: [],
    warnings: []
  };

  // --------------------------------------------------------------------------
  // 1. 拉取 er-gamedata 解包表并更新 masteryStats.json / weaponTypeInfo.json
  // --------------------------------------------------------------------------
  if (!isOffline) {
    console.log('[1/6] 正在拉取最新 pypy-vrc/er-gamedata 解包数据...');
    try {
      runNodeScript('scripts/update-er-gamedata.mjs');
    } catch (err) {
      report.warnings.push(`拉取 er-gamedata 失败（已回退使用本地缓存）：${err.message}`);
      console.warn(`  ⚠ 拉取 er-gamedata 失败，继续使用本地已缓存数据：${err.message}`);
    }
  } else {
    console.log('[1/6] 离线模式（--offline），跳过远程 git 拉取。');
  }

  // --------------------------------------------------------------------------
  // 2. 安全同步 equipment.json 与 characters.json（绝不修改 heroSkills.json）
  // --------------------------------------------------------------------------
  console.log('\n[2/6] 正在安全同步 equipment.json 与 characters.json（不触碰 heroSkills.json）...');
  const erGameData = await readJson(path.join(sourcesDir, 'erGameData.json'));
  const equipDoc = await readJson(path.join(dataDir, 'equipment.json'));
  const charsDoc = await readJson(path.join(dataDir, 'characters.json'));
  const heroStatusDoc = await readJson(path.join(dataDir, 'heroStatus.json'), { heroes: {} });

  if (erGameData?.equipment?.length && equipDoc?.equipment) {
    const customItemsWithoutCode = equipDoc.equipment.filter((item) => !item.code);
    const oldByCode = new Map(equipDoc.equipment.filter((item) => item.code).map((item) => [item.code, item]));
    const freshByCode = new Map(erGameData.equipment.map((item) => [item.code, item]));

    for (const fresh of erGameData.equipment) {
      const prev = oldByCode.get(fresh.code);
      if (!prev) {
        report.equipmentAdded.push(`${fresh.name} (${fresh.type} · ${fresh.quality} · code ${fresh.code})`);
      } else if (JSON.stringify(prev.stats || {}) !== JSON.stringify(fresh.stats || {})) {
        report.equipmentStatChanged.push({
          code: fresh.code,
          name: fresh.name,
          slot: fresh.type,
          before: formatStatSummary(prev.stats),
          after: formatStatSummary(fresh.stats)
        });
      }
    }
    for (const prev of oldByCode.values()) {
      if (!freshByCode.has(prev.code)) {
        report.equipmentRemoved.push(`${prev.name} (code ${prev.code})`);
      }
    }

    const nextEquipment = [...erGameData.equipment, ...customItemsWithoutCode];
    const nextStatDefs = erGameData.itemStatDefinitions?.length
      ? erGameData.itemStatDefinitions
      : equipDoc.itemStatDefinitions;

    await writeJson(path.join(dataDir, 'equipment.json'), {
      _comment: equipDoc._comment || '装备总表：属性定义 + 全部装备。与英雄技能分开存储。',
      _usage: equipDoc._usage || '改官方装备数值直接改这里；新增自定义装备追加一条，name 不要与官方重名。',
      generatedAt: new Date().toISOString(),
      source: erGameData.source || equipDoc.source || '',
      counts: {
        items: nextEquipment.length,
        statDefinitions: (nextStatDefs || []).length
      },
      itemStatDefinitions: nextStatDefs || [],
      equipment: nextEquipment
    });
    console.log(`  ✓ equipment.json 已同步：共 ${nextEquipment.length} 件（新增 ${report.equipmentAdded.length} 件，面板变动 ${report.equipmentStatChanged.length} 件，保留自定义装备 ${customItemsWithoutCode.length} 件）`);
  }

  if (erGameData?.characters?.length && charsDoc?.characters) {
    const oldCharByCode = new Map(charsDoc.characters.map((c) => [c.code, c]));
    const mergedChars = [];
    let heroStatusTouched = false;

    for (const fresh of erGameData.characters) {
      const prev = oldCharByCode.get(fresh.code);
      if (!prev) {
        mergedChars.push(fresh);
        report.charactersAdded.push(`${fresh.code} ${fresh.name} (${fresh.id})`);
        if (!heroStatusDoc.heroes[fresh.name]) {
          heroStatusDoc.heroes[fresh.name] = {
            verified: false,
            damageTestOnly: true,
            note: '自动入库新实验体，待录入并核对技能伤害公式后将 damageTestOnly 设为 false'
          };
          heroStatusTouched = true;
        }
      } else {
        const beforeSnap = JSON.stringify({ base: prev.base, growth: prev.growth, weapons: prev.weapons });
        const afterSnap = JSON.stringify({ base: fresh.base, growth: fresh.growth, weapons: fresh.weapons });
        if (beforeSnap !== afterSnap) {
          report.characterStatChanged.push({
            code: fresh.code,
            name: fresh.name,
            beforeBase: prev.base,
            afterBase: fresh.base,
            beforeGrowth: prev.growth,
            afterGrowth: fresh.growth
          });
        }
        mergedChars.push({
          ...prev,
          ...fresh,
          // 若客户端解包尚未合入新实验体中文译名或武器列表，保留本地已录入译名与武器
          name: (fresh.name === fresh.id && prev.name && prev.name !== prev.id) ? prev.name : fresh.name,
          weapons: (Array.isArray(fresh.weapons) && fresh.weapons.length > 0) ? fresh.weapons : (prev.weapons || []),
          growth: fresh.growth || prev.growth || null,
          image: prev.image || fresh.image
        });
      }
    }

    mergedChars.sort((a, b) => a.code - b.code);
    const nextSkillGroups = erGameData.rawSkillGroups?.length ? erGameData.rawSkillGroups : charsDoc.skillGroups;
    await writeJson(path.join(dataDir, 'characters.json'), {
      _comment: charsDoc._comment || '实验体总表：基础属性、每级成长、武器、技能组索引。',
      _usage: charsDoc._usage || '基础/成长数值随官方公告更新；技能伤害不放这里，见 heroSkills.json。',
      generatedAt: new Date().toISOString(),
      source: erGameData.source || charsDoc.source || '',
      counts: {
        characters: mergedChars.length,
        skillGroups: (nextSkillGroups || []).length
      },
      characters: mergedChars,
      skillGroups: nextSkillGroups || []
    });
    if (heroStatusTouched) {
      await writeJson(path.join(dataDir, 'heroStatus.json'), heroStatusDoc);
    }
    console.log(`  ✓ characters.json 已同步：共 ${mergedChars.length} 名实验体（新增 ${report.charactersAdded.length} 名，基础/成长变动 ${report.characterStatChanged.length} 名）`);
  }

  // 若 patchLog.json 记录的最新补丁日期 ≥ .er-gamedata-cache 最新提交日期（例如周三已按官网公告预录入周四补丁，客户端尚未维护），
  // 自动叠跑一次 apply-patch-log.mjs 保护预录入数值不被旧解包冲回上一版；一旦解包仓库更新超过该日期，则以最新解包为准。
  const patchLogDoc = await readJson(path.join(dataDir, 'patchLog.json'), { patches: [] });
  const latestPatch = [...(patchLogDoc.patches || [])].sort((a, b) => (b.order || 0) - (a.order || 0))[0];
  if (latestPatch?.date && existsSync(path.join(rootDir, '.er-gamedata-cache', '.git'))) {
    try {
      const cacheCommitDate = execFileSync('git', ['-C', path.join(rootDir, '.er-gamedata-cache'), 'log', '-1', '--format=%cs'], { encoding: 'utf8' }).trim();
      if (cacheCommitDate && latestPatch.date >= cacheCommitDate) {
        console.log(`  ℹ 检测到预实装补丁 ${latestPatch.version} (${latestPatch.date}) 新于解包仓库 (${cacheCommitDate})，自动叠加保护...`);
        runNodeScript('scripts/apply-patch-log.mjs', ['--from', latestPatch.version]);
      }
    } catch {
      // ignore git date check failure
    }
  }

  // --------------------------------------------------------------------------
  // 3 & 4. 从 dak.gg 增量刷新图标、Tooltip、独有特效映射与 Tooltip 差异对比
  // --------------------------------------------------------------------------
  const prevSnapshot = await readJson(snapshotPath, null);
  const iconsDoc = await readJson(path.join(dataDir, 'dakItemSkillIcons.json'), { equipment: [], items: [], heroSkills: [], weaponSkills: [] });
  const loadoutDoc = await readJson(path.join(dataDir, 'dakLoadoutAssets.json'), { traits: [], tacticalSkills: [] });
  const uniqueEffectsDoc = await readJson(path.join(dataDir, 'itemUniqueEffects.json'), { effectsByCode: {}, effectsByName: {} });
  const effectDamageDoc = await readJson(path.join(dataDir, 'itemEffectDamage.json'), { effects: [], unmodeled: [] });
  const effectModDoc = await readJson(path.join(dataDir, 'itemEffectModifiers.json'), { effects: [], notModelled: [] });
  const traitEffectsDoc = await readJson(path.join(dataDir, 'traitEffects.json'), { traits: {} });

  // 建立旧基线（若首次运行尚无 dakTooltipSnapshot.json，则从现有 dakItemSkillIcons + dakLoadoutAssets 提取）
  const baselineSkillTips = new Map(Object.entries(prevSnapshot?.skills || {}));
  const baselineWeaponSkillTips = new Map(Object.entries(prevSnapshot?.weaponSkills || {}));
  const baselineItemEffectBodies = new Map(Object.entries(prevSnapshot?.itemEffects || {}));
  const baselineTraitTips = new Map(Object.entries(prevSnapshot?.traits || {}));

  if (!prevSnapshot) {
    for (const sk of iconsDoc.heroSkills || []) {
      baselineSkillTips.set(String(sk.id), stripMarkup(sk.tooltip));
    }
    for (const wsk of iconsDoc.weaponSkills || []) {
      baselineWeaponSkillTips.set(String(wsk.id), stripMarkup(wsk.tooltip));
    }
    for (const eq of iconsDoc.equipment || []) {
      baselineItemEffectBodies.set(String(eq.id), extractUniqueEffectBody(eq.tooltip));
    }
    for (const tr of loadoutDoc.traits || []) {
      baselineTraitTips.set(String(tr.id), stripMarkup(tr.tooltip));
    }
  }

  if (!isOffline) {
    console.log('\n[3/6] 正在连接 dak.gg 增量拉取装备/技能/潜能最新中文 Tooltip 与缺失图标...');
    try {
      const [itemsPayload, skillsPayload, charsPayload, traitsPayload, tacticalPayload] = await Promise.all([
        fetchDakEndpoint('items'),
        fetchDakEndpoint('skills'),
        fetchDakEndpoint('characters'),
        fetchDakEndpoint('trait-skills'),
        fetchDakEndpoint('tactical-skills')
      ]);

      const remoteCharById = new Map((charsPayload.characters || []).map((c) => [c.id, c]));
      const equipById = new Map((iconsDoc.equipment || []).map((x) => [String(x.id), x]));

      // 3a. 更新装备 Tooltip & 仅下载本地缺失的新装备图标
      const nextSkillSnap = {};
      const nextWeaponSkillSnap = {};
      const nextItemEffectSnap = {};
      const nextTraitSnap = {};

      for (const rItem of itemsPayload.items || []) {
        if (rItem.type !== 'Weapon' && rItem.type !== 'Armor') continue;
        const idStr = String(rItem.id);
        const rawTip = String(rItem.tooltip || '').replace(/\\n/g, '\n').trim();
        const typeDir = normalizePart(rItem.type);
        const subDir = normalizePart(itemSubType(rItem));
        const fileName = `equipment-${rItem.id}-${typeDir}-${subDir}.png`;
        const relImg = `/assets/game-icons/equipment/${typeDir}/${fileName}`;
        const absImg = path.join(gameIconsDir, 'equipment', typeDir, fileName);

        const dl = await downloadFileIfMissing(rItem.imageUrl, absImg);
        if (dl.ok && !dl.existed) report.newIconsDownloaded += 1;

        const effectBody = extractUniqueEffectBody(rawTip);
        nextItemEffectSnap[idStr] = effectBody;
        const oldEffectBody = baselineItemEffectBodies.get(idStr);
        if (oldEffectBody !== undefined && normForDiff(oldEffectBody) !== normForDiff(effectBody) && (oldEffectBody || effectBody)) {
          report.itemEffectTextChanges.push({
            id: rItem.id,
            name: stripMarkup(rItem.name),
            before: oldEffectBody || '（无独有特效）',
            after: effectBody || '（无独有特效）'
          });
        }

        const existing = equipById.get(idStr);
        if (existing) {
          existing.name = stripMarkup(rItem.name) || existing.name;
          if (rawTip) existing.tooltip = rawTip;
          if (!existing.image) existing.image = relImg;
          if (dl.ok) existing.imageAvailable = true;
        } else {
          const entry = {
            id: rItem.id,
            name: stripMarkup(rItem.name),
            tooltip: rawTip,
            type: rItem.type,
            subType: itemSubType(rItem),
            grade: rItem.grade || '',
            makeMaterial1: rItem.makeMaterial1 || null,
            makeMaterial2: rItem.makeMaterial2 || null,
            makeMaterials: rItem.makeMaterials || [rItem.makeMaterial1, rItem.makeMaterial2].filter(Boolean),
            image: relImg,
            imageUrl: normalizeUrl(rItem.imageUrl),
            imageAvailable: dl.ok,
            byteSize: dl.bytes || 0,
            imageDownloadError: dl.error || null
          };
          iconsDoc.equipment.push(entry);
          equipById.set(idStr, entry);
        }
      }

      // 3b. 比对英雄技能与武器技能 Tooltip 差异 & 增量补抓新技能图标
      const heroSkillById = new Map((iconsDoc.heroSkills || []).map((x) => [String(x.id), x]));
      const weaponSkillById = new Map((iconsDoc.weaponSkills || []).map((x) => [String(x.id), x]));

      for (const sk of skillsPayload.skills || []) {
        const idStr = String(sk.id);
        const char = remoteCharById.get(sk.characterId);
        const cleanTip = stripMarkup(sk.tooltip);

        if (char) {
          nextSkillSnap[idStr] = cleanTip;
          const oldTip = baselineSkillTips.get(idStr);
          if (oldTip !== undefined && normForDiff(oldTip) !== normForDiff(cleanTip)) {
            report.skillTooltipChanges.push({
              id: sk.id,
              hero: char.name || char.key,
              slot: sk.slot,
              name: stripMarkup(sk.name),
              before: oldTip,
              after: cleanTip
            });
          }
          const cKey = normalizePart(char.key);
          const fName = `skill-${sk.characterId}-${normalizePart(sk.slot)}-${sk.id}.png`;
          const absPath = path.join(gameIconsDir, 'hero-skills', cKey, fName);
          const dl = await downloadFileIfMissing(sk.imageUrl, absPath);
          if (dl.ok && !dl.existed) report.newIconsDownloaded += 1;

          const ex = heroSkillById.get(idStr);
          if (ex) {
            ex.name = stripMarkup(sk.name) || ex.name;
            ex.tooltip = cleanTip || ex.tooltip;
          } else {
            iconsDoc.heroSkills.push({
              id: sk.id,
              name: stripMarkup(sk.name),
              tooltip: cleanTip,
              slot: sk.slot,
              maxLevel: sk.maxLevel || null,
              characterId: sk.characterId,
              characterKey: char.key,
              characterName: char.name,
              image: `/assets/game-icons/hero-skills/${cKey}/${fName}`,
              imageUrl: normalizeUrl(sk.imageUrl),
              imageAvailable: dl.ok,
              byteSize: dl.bytes || 0,
              imageDownloadError: dl.error || null
            });
          }
        } else {
          nextWeaponSkillSnap[idStr] = cleanTip;
          const oldTip = baselineWeaponSkillTips.get(idStr);
          if (oldTip !== undefined && normForDiff(oldTip) !== normForDiff(cleanTip)) {
            report.weaponSkillTooltipChanges.push({
              id: sk.id,
              slot: sk.slot,
              name: stripMarkup(sk.name),
              before: oldTip,
              after: cleanTip
            });
          }
          const fName = `weapon-skill-${normalizePart(sk.slot)}-${sk.id}.png`;
          const absPath = path.join(gameIconsDir, 'weapon-skills', fName);
          const dl = await downloadFileIfMissing(sk.imageUrl, absPath);
          if (dl.ok && !dl.existed) report.newIconsDownloaded += 1;
          const ex = weaponSkillById.get(idStr);
          if (ex) {
            ex.name = stripMarkup(sk.name) || ex.name;
            ex.tooltip = cleanTip || ex.tooltip;
          }
        }
      }

      iconsDoc.generatedAt = new Date().toISOString();
      await writeJson(path.join(dataDir, 'dakItemSkillIcons.json'), iconsDoc);

      // 3c. 潜能与战术技能增量同步
      const localTraitById = new Map((loadoutDoc.traits || []).map((t) => [String(t.id), t]));
      for (const tr of traitsPayload.traitSkills || []) {
        const idStr = String(tr.id);
        const cleanTip = stripMarkup(tr.tooltip);
        nextTraitSnap[idStr] = cleanTip;
        const oldTip = baselineTraitTips.get(idStr);
        if (oldTip !== undefined && normForDiff(oldTip) !== normForDiff(cleanTip)) {
          report.traitTooltipChanges.push({
            id: tr.id,
            name: stripMarkup(tr.name),
            before: oldTip,
            after: cleanTip
          });
        }
        const gDir = normalizePart(tr.group || 'None');
        const tDir = normalizePart(tr.type || 'None');
        const fName = `trait-${tr.id}-${gDir}-${tDir}.png`;
        const absPath = path.join(loadoutAssetsDir, 'traits', fName);
        const dl = await downloadFileIfMissing(tr.imageUrl, absPath);
        if (dl.ok && !dl.existed) report.newIconsDownloaded += 1;

        const ex = localTraitById.get(idStr);
        if (ex) {
          ex.name = stripMarkup(tr.name) || ex.name;
          ex.tooltip = cleanTip || ex.tooltip;
        } else {
          loadoutDoc.traits.push({
            id: tr.id,
            name: stripMarkup(tr.name),
            tooltip: cleanTip,
            group: tr.group || 'None',
            type: tr.type || 'None',
            typeName: tr.type === 'Core' ? '核心' : tr.type === 'Sub1' ? '辅助 1' : tr.type === 'Sub2' ? '辅助 2' : '其他',
            active: Boolean(tr.active),
            sortOrder: tr.traitSortOrder ?? null,
            image: `/assets/loadout/traits/${fName}`,
            imageUrl: normalizeUrl(tr.imageUrl),
            imageAvailable: dl.ok,
            byteSize: dl.bytes || 0,
            imageDownloadError: dl.error || null
          });
        }

        if (!traitEffectsDoc.traits[idStr] && tr.group !== 'Cobalt' && tr.group !== 'None') {
          traitEffectsDoc.traits[idStr] = {
            summary: `${stripMarkup(tr.name)}：${cleanTip.slice(0, 80)}`
          };
          report.newTraitsAdded.push(`${tr.id} ${stripMarkup(tr.name)} (${tr.group})`);
        }
      }

      const localTacById = new Map((loadoutDoc.tacticalSkills || []).map((t) => [String(t.id), t]));
      for (const tac of tacticalPayload.tacticalSkills || []) {
        const idStr = String(tac.id);
        const cleanTip = stripMarkup(tac.tooltip);
        const fName = `tactical-${tac.id}.png`;
        const absPath = path.join(loadoutAssetsDir, 'tactical-skills', fName);
        const dl = await downloadFileIfMissing(tac.imageUrl, absPath);
        if (dl.ok && !dl.existed) report.newIconsDownloaded += 1;

        const ex = localTacById.get(idStr);
        if (ex) {
          ex.name = stripMarkup(tac.name) || ex.name;
          ex.tooltip = cleanTip || ex.tooltip;
        } else {
          loadoutDoc.tacticalSkills.push({
            id: tac.id,
            name: stripMarkup(tac.name) || `未命名战术技能 ${tac.id}`,
            tooltip: cleanTip,
            image: `/assets/loadout/tactical-skills/${fName}`,
            imageUrl: normalizeUrl(tac.imageUrl),
            imageAvailable: dl.ok,
            byteSize: dl.bytes || 0,
            imageDownloadError: dl.error || null
          });
        }
      }

      loadoutDoc.generatedAt = new Date().toISOString();
      await writeJson(path.join(dataDir, 'dakLoadoutAssets.json'), loadoutDoc);
      if (report.newTraitsAdded.length > 0) {
        traitEffectsDoc.updatedAt = new Date().toISOString().slice(0, 10);
        await writeJson(path.join(dataDir, 'traitEffects.json'), traitEffectsDoc);
      }

      // 3d. 自动补抓缺失的实验体小头像
      const freshChars = (await readJson(path.join(dataDir, 'characters.json'), { characters: [] })).characters || [];
      const presentAvatars = new Set(existsSync(avatarDir) ? readdirSync(avatarDir) : []);
      const avatarManifest = await readJson(path.join(avatarDir, 'manifest.json'), []);
      let avatarManifestTouched = false;

      for (const ch of freshChars) {
        const fName = (ch.image || '').split('/').pop() || `${String(ch.code).padStart(3, '0')}-${ch.resource}.png`;
        if (presentAvatars.has(fName)) continue;
        const rChar = remoteCharById.get(ch.code);
        if (!rChar?.imageUrl) continue;
        const dl = await downloadFileIfMissing(rChar.imageUrl, path.join(avatarDir, fName));
        if (dl.ok && dl.buffer) {
          report.newAvatarsDownloaded.push(`${ch.name} (${fName})`);
          const rec = {
            code: ch.code,
            name: rChar.key || ch.id,
            resource: ch.resource || ch.id,
            file: `assets/characters/${fName}`,
            sourcePage: `https://dak.gg/er/characters/${rChar.key}`,
            sourceImage: normalizeUrl(rChar.imageUrl),
            source: 'dak.gg',
            sha1: createHash('sha1').update(dl.buffer).digest('hex'),
            bytes: dl.bytes
          };
          const idx = avatarManifest.findIndex((m) => m.code === ch.code);
          if (idx >= 0) avatarManifest[idx] = { ...avatarManifest[idx], ...rec };
          else avatarManifest.push(rec);
          avatarManifestTouched = true;
        }
      }
      if (avatarManifestTouched) {
        avatarManifest.sort((a, b) => (a.code || 0) - (b.code || 0));
        await writeJson(path.join(avatarDir, 'manifest.json'), avatarManifest);
      }

      // 保存最新快照作为下次运行时的对比基准
      await writeJson(snapshotPath, {
        updatedAt: new Date().toISOString(),
        skills: nextSkillSnap,
        weaponSkills: nextWeaponSkillSnap,
        itemEffects: nextItemEffectSnap,
        traits: nextTraitSnap
      });

      console.log(`  ✓ dak.gg 同步完成：新增图标 ${report.newIconsDownloaded} 张，新角色头像 ${report.newAvatarsDownloaded.length} 张`);
    } catch (err) {
      report.warnings.push(`连接 dak.gg 更新 Tooltip/图标时出错：${err.message}`);
      console.warn(`  ⚠ dak.gg 同步跳过：${err.message}`);
    }
  } else {
    console.log('\n[3/6] 离线模式（--offline），跳过远程 dak.gg Tooltip/图标拉取。');
  }

  // --------------------------------------------------------------------------
  // 4. 从 dakItemSkillIcons.json 自动同步 itemUniqueEffects.json 独有特效映射
  // --------------------------------------------------------------------------
  console.log('\n[4/6] 正在根据装备 Tooltip 更新 itemUniqueEffects.json 独有特效映射...');
  const latestEquipList = (await readJson(path.join(dataDir, 'equipment.json'), { equipment: [] })).equipment || [];
  const validEquipCodes = new Set(latestEquipList.filter((x) => x.code).map((x) => String(x.code)));
  const equipNameByCode = new Map(latestEquipList.filter((x) => x.code).map((x) => [String(x.code), x.name]));

  const nextByCode = { ...(uniqueEffectsDoc.effectsByCode || {}) };
  const nextByName = { ...(uniqueEffectsDoc.effectsByName || {}) };

  for (const eqIcon of iconsDoc.equipment || []) {
    const codeStr = String(eqIcon.id || '');
    if (!codeStr) continue;
    const parsed = parseUniqueEffectsFromTooltip(eqIcon.tooltip);
    if (!parsed.length && !nextByCode[codeStr]) continue;

    const prevArr = nextByCode[codeStr] || [];
    if (parsed.length && JSON.stringify(prevArr) !== JSON.stringify(parsed)) {
      if (validEquipCodes.has(codeStr)) {
        report.uniqueEffectsChanged.push({
          code: codeStr,
          name: equipNameByCode.get(codeStr) || eqIcon.name,
          before: prevArr,
          after: parsed
        });
      }
      nextByCode[codeStr] = parsed;
    }
    const itemName = equipNameByCode.get(codeStr) || eqIcon.name;
    if (itemName && parsed.length) {
      nextByName[itemName] = parsed;
    }
  }

  await writeJson(path.join(dataDir, 'itemUniqueEffects.json'), {
    _comment: uniqueEffectsDoc._comment || '装备唯一效果说明。按装备 code 和名称建立索引，用于在装备表里显示特殊效果。',
    _usage: uniqueEffectsDoc._usage || 'effectsByCode 优先，effectsByName 兜底；修改效果文案时保持 code 字符串键不变。',
    source: 'dakItemSkillIcons tooltip <b> tags (auto-synced)',
    generatedAt: new Date().toISOString(),
    effectsByCode: Object.fromEntries(Object.entries(nextByCode).sort(([a], [b]) => Number(a) - Number(b))),
    effectsByName: nextByName
  });

  // 检查是否有正式服装备携带了尚未在 itemEffectDamage / itemEffectModifiers 登记过的全新独有特效名
  const knownEffectNames = new Set([
    ...(effectDamageDoc.effects || []).map((e) => e.name),
    ...(effectModDoc.effects || []).map((e) => e.name),
    '减少治疗（20%）', '减少治疗（30%）', '减少治疗（40%）',
    '寒波', '电击', '宣告', '回响', '先锋', '神速', '迅捷', '迅捷应变', '乘风', '凝聚', '起火'
  ]);
  const unknownMap = new Map();
  for (const [code, effArr] of Object.entries(nextByCode)) {
    if (!validEquipCodes.has(code)) continue;
    for (const ef of effArr || []) {
      if (!knownEffectNames.has(ef)) {
        if (!unknownMap.has(ef)) unknownMap.set(ef, []);
        unknownMap.get(ef).push(equipNameByCode.get(code) || code);
      }
    }
  }
  for (const [ef, owners] of unknownMap.entries()) {
    report.unmodeledNewEffects.push({ effect: ef, items: owners });
  }
  console.log(`  ✓ itemUniqueEffects.json 已同步：特效绑定更新 ${report.uniqueEffectsChanged.length} 件`);

  // --------------------------------------------------------------------------
  // 5. 同步全实验体 × 全武器高赞推荐出装
  // --------------------------------------------------------------------------
  if (!skipRoutes) {
    console.log('\n[5/6] 正在同步全实验体 × 全武器最新高赞推荐出装 (sync-weapon-routes.mjs)...');
    try {
      runNodeScript('scripts/sync-weapon-routes.mjs', isOffline ? ['--offline'] : [], { withProxyPreload: !isOffline });
    } catch (err) {
      report.warnings.push(`同步推荐出装失败：${err.message}`);
      console.warn(`  ⚠ 推荐出装同步出错：${err.message}`);
    }
  } else {
    console.log('\n[5/6] 已跳过推荐出装同步（--skip-routes）。');
  }

  // --------------------------------------------------------------------------
  // 5b. 自动顺号探查官网最新发布的简中更新日志 / 不停机维护（即使客户端尚未维护也能提前发现）
  // --------------------------------------------------------------------------
  if (!isOffline) {
    const urlMatch = String(patchLogDoc.gameVersion?.url || '').match(/\/news\/(\d+)/);
    const lastKnownId = urlMatch ? Number(urlMatch[1]) : 3982;
    const scanStart = lastKnownId + 1;
    const scanEnd = lastKnownId + 32;
    console.log(`\n[+] 正在顺号探查官网是否有新于 #${lastKnownId} 的简中更新公告 (#${scanStart}~#${scanEnd})...`);
    const ids = Array.from({ length: scanEnd - scanStart + 1 }, (_, i) => scanStart + i);
    for (let i = 0; i < ids.length; i += 8) {
      const chunk = ids.slice(i, i + 8);
      const resList = await Promise.all(chunk.map(async (id) => {
        const url = `https://playeternalreturn.com/posts/news/${id}?hl=zh-CN`;
        try {
          const res = await fetch(url, {
            headers: { 'user-agent': 'Mozilla/5.0', 'accept-language': 'zh-CN,zh;q=0.9' },
            signal: AbortSignal.timeout(12000)
          });
          if (!res.ok) return null;
          const html = await res.text();
          const tMatch = html.match(/<title>([^<]+)<\/title>/i);
          const rawTitle = tMatch ? tMatch[1].replace(/\s*::\s*永恒轮回.*$/i, '').replace(/\s*-\s*永恒轮回.*$/i, '').trim() : '';
          if (!rawTitle || /^永恒轮回/i.test(rawTitle)) return null;
          if (!/(更新日志|不停机维护|维护结束|内容调整|补丁|新实验体)/i.test(rawTitle)) return null;
          const plain = html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<\/?(p|div|li|h[1-6]|tr|br|section|article|ul|ol)[^>]*>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&gt;/g, '>')
            .replace(/&lt;/g, '<')
            .replace(/&amp;/g, '&')
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);
          await mkdir(path.join(rootDir, 'docs', 'official-patch-updates'), { recursive: true });
          await writeFile(path.join(rootDir, 'docs', 'official-patch-updates', `news-${id}.txt`), plain.join('\n'), 'utf8');
          const deltaLines = plain.filter((l) => l.includes('→') && !l.includes('NP')).slice(0, 60);
          return { id, title: rawTitle, url, savedFile: `docs/official-patch-updates/news-${id}.txt`, deltaLines };
        } catch {
          return null;
        }
      }));
      for (const found of resList.filter(Boolean)) {
        report.discoveredOfficialPatches.push(found);
        console.log(`  🔔 发现新官网公告 #${found.id}：${found.title}（已存盘至 ${found.savedFile}）`);
      }
    }
    if (!report.discoveredOfficialPatches.length) {
      console.log(`  ✓ 官网暂无新于 #${lastKnownId} (${patchLogDoc.gameVersion?.label || ''}) 的更新公告。`);
    }
  }

  // --------------------------------------------------------------------------
  // 6. 生成《docs/auto-update-report.md》变动核对单并运行 self-check
  // --------------------------------------------------------------------------
  const lines = [
    '# 自动更新报告与待核对变动清单',
    '',
    `> 生成时间：${new Date().toLocaleString('zh-CN', { hour12: false })}（耗时 ${((Date.now() - startedAt.getTime()) / 1000).toFixed(1)}s）`,
    '',
    '## 一、已全自动追平的内容（无需人工操作）',
    '',
    `- **装备面板同步（\`equipment.json\`）**：新增装备 **${report.equipmentAdded.length}** 件，属性调整 **${report.equipmentStatChanged.length}** 件，下架移除 **${report.equipmentRemoved.length}** 件`,
    `- **实验体面板同步（\`characters.json\`）**：新增实验体 **${report.charactersAdded.length}** 名，基础/成长属性调整 **${report.characterStatChanged.length}** 名`,
    `- **装备独有特效名绑定（\`itemUniqueEffects.json\`）**：更新 **${report.uniqueEffectsChanged.length}** 件装备的独有特效标签`,
    `- **图标与头像增量补抓**：新下载图标 **${report.newIconsDownloaded}** 张，新实验体头像 **${report.newAvatarsDownloaded.length}** 张`,
    `- **推荐出装（\`weaponRoutePresets.json\`）**：${skipRoutes ? '本次已跳过（`--skip-routes`）' : '已按当前赛季高赞路线刷新全角色 × 全武器预设'}`,
    ''
  ];

  if (report.equipmentAdded.length) {
    lines.push('### 新增装备', ...report.equipmentAdded.map((x) => `- ${x}`), '');
  }
  if (report.equipmentStatChanged.length) {
    lines.push(
      '### 装备基础面板变动明细（已自动写入 `equipment.json`）',
      ...report.equipmentStatChanged.map((x) => `- **[${x.slot}] ${x.name}** (\`${x.code}\`)：\`${x.before}\` → \`${x.after}\``),
      ''
    );
  }
  if (report.charactersAdded.length) {
    lines.push(
      '### 新入库实验体（默认标记 `damageTestOnly: true`，录入技能公式后可在 `heroStatus.json` 开放）',
      ...report.charactersAdded.map((x) => `- ${x}`),
      ''
    );
  }
  if (report.uniqueEffectsChanged.length) {
    lines.push(
      '### 装备独有特效标签变动（已自动写入 `itemUniqueEffects.json`）',
      ...report.uniqueEffectsChanged.map((x) => `- **${x.name}** (\`${x.code}\`)：\`[${x.before.join(', ')}]\` → \`[${x.after.join(', ')}]\``),
      ''
    );
  }

  lines.push(
    '---',
    '',
    '## 二、需人工快速核对的公式变动（客户端/OpenAPI 不公开服务端公式系数）',
    ''
  );

  const hasManualItems = report.discoveredOfficialPatches.length
    || report.skillTooltipChanges.length
    || report.weaponSkillTooltipChanges.length
    || report.itemEffectTextChanges.length
    || report.traitTooltipChanges.length
    || report.newTraitsAdded.length;

  if (!hasManualItems) {
    lines.push('🎉 **本次未检测到新官网补丁公告或任何英雄技能、武器技能、装备独有特效、潜能的中文说明变动！无需手改任何公式，直接 `npm run push` 即可发布。**', '');
  } else {
    if (report.discoveredOfficialPatches.length) {
      lines.push(
        `### 0. 发现尚未记录进 patchLog.json 的新官网更新公告（共 ${report.discoveredOfficialPatches.length} 篇）`,
        ''
      );
      for (const art of report.discoveredOfficialPatches) {
        lines.push(
          `- **[#${art.id} ${art.title}](${art.url})**（全文已自动保存至 \`${art.savedFile}\`）`,
          ...(art.deltaLines.length
            ? ['  - 提取到的数值变动行预览：', ...art.deltaLines.map((dl) => `    - ${dl}`)]
            : ['  - （无箭头数值变动或纯预览/修复公告）'])
        );
      }
      lines.push('');
    }
    if (report.skillTooltipChanges.length) {
      lines.push(
        `### 1. 英雄技能说明变动（共 ${report.skillTooltipChanges.length} 条 → 如涉及伤害数字变化，请在页面「编辑模式」或 \`src/data/heroSkills.json\` 更新）`,
        ''
      );
      for (const chg of report.skillTooltipChanges) {
        lines.push(
          `- **${chg.hero} · ${chg.slot} ${chg.name}** (\`skillId: ${chg.id}\`)`,
          `  - 旧：${chg.before.replace(/\n/g, ' ')}`,
          `  - 新：${chg.after.replace(/\n/g, ' ')}`
        );
      }
      lines.push('');
    }
    if (report.weaponSkillTooltipChanges.length) {
      lines.push(
        `### 2. 武器技能 D 说明变动（共 ${report.weaponSkillTooltipChanges.length} 条 → 对应 \`src/data/weaponSkills.json\`）`,
        ''
      );
      for (const chg of report.weaponSkillTooltipChanges) {
        lines.push(
          `- **${chg.name}** (\`${chg.id}\`)`,
          `  - 旧：${chg.before.replace(/\n/g, ' ')}`,
          `  - 新：${chg.after.replace(/\n/g, ' ')}`
        );
      }
      lines.push('');
    }
    if (report.itemEffectTextChanges.length) {
      lines.push(
        `### 3. 装备独有特效文案变动（共 ${report.itemEffectTextChanges.length} 件 → 如涉及伤害/增伤数字变化，请核对 \`itemEffectDamage.json\` / \`itemEffectModifiers.json\`）`,
        ''
      );
      for (const chg of report.itemEffectTextChanges) {
        lines.push(
          `- **${chg.name}** (\`${chg.id}\`)`,
          `  - 旧：${chg.before.replace(/\n/g, ' ')}`,
          `  - 新：${chg.after.replace(/\n/g, ' ')}`
        );
      }
      lines.push('');
    }
    if (report.traitTooltipChanges.length || report.newTraitsAdded.length) {
      lines.push(
        `### 4. 潜能变动（说明变化 ${report.traitTooltipChanges.length} 条，新增潜能 ${report.newTraitsAdded.length} 条 → 对应 \`src/data/traitEffects.json\`）`,
        ''
      );
      for (const nt of report.newTraitsAdded) {
        lines.push(`- **[新增潜能]** ${nt}`);
      }
      for (const chg of report.traitTooltipChanges) {
        lines.push(
          `- **${chg.name}** (\`${chg.id}\`)`,
          `  - 旧：${chg.before.replace(/\n/g, ' ')}`,
          `  - 新：${chg.after.replace(/\n/g, ' ')}`
        );
      }
      lines.push('');
    }
  }

  if (report.warnings.length) {
    lines.push('## 三、运行提示/警告', '', ...report.warnings.map((w) => `- ⚠ ${w}`), '');
  }

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, lines.join('\n'), 'utf8');
  console.log(`\n  📄 已生成更新报告与待核对清单：docs/auto-update-report.md`);

  console.log('\n[6/6] 正在执行全项目一致性自检 (scripts/self-check.mjs)...');
  runNodeScript('scripts/self-check.mjs');

  console.log('\n🎉 一键更新全部完成！可查看 docs/auto-update-report.md 了解本次同步详情。');
}

main().catch((err) => {
  console.error('\n❌ 自动更新异常中止：', err);
  process.exitCode = 1;
});
