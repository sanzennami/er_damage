// scripts/sync-weapon-routes.mjs
// 同步全实验体 × 全武器分支的最新推荐出装（dak.gg 当前赛季高赞路线 + er-gamedata WeaponRoute.json 官方兜底）
//
// 用法：
//   node scripts/sync-weapon-routes.mjs              联网拉取全角色最新路线并重新生成 weaponRoutePresets.json
//   node scripts/sync-weapon-routes.mjs --hero 阿德拉 仅增量刷新指定实验体（支持中文名 / 英文 ID / code）
//   node scripts/sync-weapon-routes.mjs --offline    离线使用本地缓存重跑预设生成
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'src', 'data');
const sourcesDir = path.join(dataDir, 'sources');

const DAK_ROUTES_API = 'https://er.dakgg.io/api/v1/routes';
const OFFICIAL_WEAPON_ROUTE_URL = 'https://raw.githubusercontent.com/pypy-vrc/er-gamedata/main/data/WeaponRoute.json';
const CONCURRENCY = 8;
const SLOTS = ['武器', '衣服', '头部', '手部', '鞋子'];

// 官方 WeaponType 枚举整数 <-> weaponTypeRaw
const WEAPON_TYPE_CODE_TO_RAW = {
  1: 'Glove',
  2: 'Tonfa',
  3: 'Bat',
  4: 'Whip',
  5: 'HighAngleFire',
  6: 'DirectFire',
  7: 'Bow',
  8: 'CrossBow',
  9: 'Pistol',
  10: 'AssaultRifle',
  11: 'SniperRifle',
  13: 'Hammer',
  14: 'Axe',
  15: 'OneHandSword',
  16: 'TwoHandSword',
  18: 'DualSword',
  19: 'Spear',
  20: 'Nunchaku',
  21: 'Rapier',
  22: 'Guitar',
  23: 'Camera',
  24: 'Arcana',
  25: 'VFArm'
};
const WEAPON_RAW_TO_CODE = Object.fromEntries(
  Object.entries(WEAPON_TYPE_CODE_TO_RAW).map(([code, raw]) => [raw, Number(code)])
);

const args = process.argv.slice(2);
const isOffline = args.includes('--offline');
const heroFilterIdx = args.indexOf('--hero');
const heroFilterArg = heroFilterIdx >= 0 ? (args[heroFilterIdx + 1] || '').trim() : '';

async function readJson(filePath, fallback = null) {
  if (!existsSync(filePath)) return fallback;
  const raw = (await readFile(filePath, 'utf8')).replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

async function writeJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function parseCodeList(raw) {
  if (Array.isArray(raw)) return raw.map(Number).filter(Number.isFinite);
  const str = String(raw || '').trim();
  if (!str) return [];
  if (str.startsWith('[')) {
    try {
      const arr = JSON.parse(str);
      return Array.isArray(arr) ? arr.map(Number).filter(Number.isFinite) : [];
    } catch {
      return [];
    }
  }
  return str.split(',').map((s) => Number(s.trim())).filter(Number.isFinite);
}

function parseLateGameCodeGroups(raw) {
  if (!raw) return [];
  const str = String(raw).trim();
  if (str.startsWith('{')) {
    try {
      const obj = JSON.parse(str);
      return ['0', '1']
        .map((k) => (Array.isArray(obj?.[k]) ? obj[k].map(Number).filter(Number.isFinite) : []))
        .filter((arr) => arr.length > 0);
    } catch {
      return [];
    }
  }
  const flat = parseCodeList(str);
  return flat.length ? [flat] : [];
}

function versionRank(versionStr) {
  const parts = String(versionStr || '')
    .replace(/[^0-9.]/g, '')
    .split('.')
    .filter(Boolean)
    .map(Number);
  const [maj = 0, min = 0, pat = 0] = parts;
  return maj * 1_000_000 + min * 1_000 + pat;
}

async function fetchJsonWithRetry(url, retries = 2) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: {
          accept: 'application/json',
          'user-agent': 'Mozilla/5.0 (ER-Damage-Sync)'
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

async function mapConcurrent(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

function evaluateCandidateRoute(route, expectedWeaponRaw, { itemByCode, traitById, tacticalById }) {
  const earlyCodes = parseCodeList(route.weaponCodes);
  const lateGroups = parseLateGameCodeGroups(route.lateGameItemCodes);
  const primaryLate = lateGroups[0] || [];
  const secondaryLate = lateGroups[1] || [];

  const detectWeaponRaw = (codes) => {
    const w = codes.map((c) => itemByCode.get(c)).find((it) => it?.type === '武器');
    return w?.weaponTypeRaw || '';
  };

  const mappedByEnum = WEAPON_TYPE_CODE_TO_RAW[Number(route.weaponType)] || '';
  const actualWeaponRaw = detectWeaponRaw(primaryLate) || detectWeaponRaw(earlyCodes) || mappedByEnum;
  if (!actualWeaponRaw || (expectedWeaponRaw && actualWeaponRaw !== expectedWeaponRaw)) {
    return null;
  }

  // 组装 5 槽装备以校验完整度
  const gear = {};
  for (const sourceCodes of [primaryLate, earlyCodes, secondaryLate]) {
    for (const code of sourceCodes) {
      const item = itemByCode.get(code);
      if (!item || !SLOTS.includes(item.type) || gear[item.type]) continue;
      if (item.type === '武器' && item.weaponTypeRaw !== actualWeaponRaw) continue;
      gear[item.type] = item;
    }
  }

  const filledSlots = SLOTS.filter((s) => Boolean(gear[s])).length;
  if (!gear['武器']) return null;

  const traitCodes = parseCodeList(route.traitCodes);
  const validTraits = traitCodes.map((c) => traitById.get(c)).filter((t) => t && t.type !== 'None');
  const hasCore = validTraits.some((t) => t.type === 'Core');
  const traitComplete = validTraits.length >= 5 && hasCore;
  const hasTactical = tacticalById.has(Number(route.tacticalSkillGroupCode));
  const vRank = versionRank(route.version);
  const likes = Number(route.v2Like ?? route.v2AccumulateLike ?? 0);
  const winRate = Number(route.v2WinRate ?? 0);
  const isSquad = Number(route.teamMode ?? 0) === 0;

  // 评分：优先 5 槽齐全 -> 潜能完整 -> 小队模式 -> 最新大/小版本 -> 点赞数 -> 胜率
  const score =
    (filledSlots === 5 ? 1e12 : filledSlots * 1e11) +
    (traitComplete ? 5e10 : validTraits.length * 5e9) +
    (hasTactical ? 1e10 : 0) +
    (isSquad ? 5e9 : 0) +
    vRank * 1_000 +
    Math.min(999_000, likes) +
    Math.min(99, winRate);

  return {
    route,
    weaponTypeRaw: actualWeaponRaw,
    filledSlots,
    traitComplete,
    validTraitCount: validTraits.length,
    vRank,
    likes,
    score
  };
}

function normalizeToRecommendEntry(route, fallbackSource = 'dak.gg', targetWeaponRaw = '') {
  const early = parseCodeList(route.weaponCodes);
  const lateGroups = parseLateGameCodeGroups(route.lateGameItemCodes);
  const lateObj = {};
  lateGroups.forEach((grp, idx) => {
    lateObj[String(idx)] = grp;
  });
  const traits = parseCodeList(route.traitCodes);
  const forcedWeaponCode = targetWeaponRaw ? WEAPON_RAW_TO_CODE[targetWeaponRaw] : 0;
  return {
    recommendWeaponRoute: {
      id: Number(route.id) || 0,
      title: String(route.title || '官方默认推荐路线'),
      userNum: Number(route.userNum) || 0,
      userNickname: String(route.userNickname || (fallbackSource === 'er-gamedata' ? 'NimbleNeuron' : 'DAK.GG')),
      characterCode: Number(route.characterCode),
      slotId: Number(route.slotId) || 0,
      weaponType: forcedWeaponCode || Number(route.weaponType) || 0,
      weaponCodes: JSON.stringify(early),
      traitCodes: JSON.stringify(traits),
      lateGameItemCodes: JSON.stringify(lateObj),
      tacticalSkillGroupCode: Number(route.tacticalSkillGroupCode) || 0,
      paths: typeof route.paths === 'string' && route.paths.startsWith('[')
        ? route.paths
        : JSON.stringify(parseCodeList(route.paths)),
      version: String(route.version || ''),
      teamMode: Number(route.teamMode ?? 0),
      v2Like: Number(route.v2Like ?? 0),
      v2WinRate: Number(route.v2WinRate ?? 0),
      updateDtm: Number(route.updateDtm ?? 0),
      routeSource: fallbackSource
    }
  };
}

async function main() {
  const charactersDoc = await readJson(path.join(dataDir, 'characters.json'), { characters: [] });
  const heroStatusDoc = await readJson(path.join(dataDir, 'heroStatus.json'), { heroes: {} });
  const equipmentDoc = await readJson(path.join(dataDir, 'equipment.json'), { equipment: [] });
  const loadoutDoc = await readJson(path.join(dataDir, 'dakLoadoutAssets.json'), {});
  const patchLogDoc = await readJson(path.join(dataDir, 'patchLog.json'), {});

  const equipmentList = equipmentDoc.items || equipmentDoc.equipment || [];
  const itemByCode = new Map(equipmentList.map((item) => [Number(item.code), item]));
  const traitById = new Map((loadoutDoc.traits || []).map((t) => [Number(t.id), t]));
  const tacticalById = new Map((loadoutDoc.tacticalSkills || []).map((t) => [Number(t.id), t]));
  const ctx = { itemByCode, traitById, tacticalById };

  // 仅同步有实际武器列表的正式实验体（排除未上线占位如 Meissa）
  const allReleasedChars = (charactersDoc.characters || []).filter(
    (c) => Array.isArray(c.weapons) && c.weapons.length > 0 && heroStatusDoc.heroes?.[c.name]?.damageTestOnly !== true
  );

  const targetChars = heroFilterArg
    ? allReleasedChars.filter(
      (c) =>
        c.name === heroFilterArg ||
        c.id.toLowerCase() === heroFilterArg.toLowerCase() ||
        c.resource?.toLowerCase() === heroFilterArg.toLowerCase() ||
        String(c.code) === heroFilterArg
    )
    : allReleasedChars;

  if (!targetChars.length) {
    throw new Error(`未匹配到待同步实验体：${heroFilterArg || '(空)'}`);
  }

  const officialCachePath = path.join(sourcesDir, 'officialWeaponRoutes.json');
  let officialRoutes = await readJson(officialCachePath, []);
  if (!isOffline) {
    try {
      const freshOfficial = await fetchJsonWithRetry(OFFICIAL_WEAPON_ROUTE_URL);
      if (Array.isArray(freshOfficial) && freshOfficial.length > 0) {
        officialRoutes = freshOfficial;
        await writeJson(officialCachePath, officialRoutes);
        console.log(`[1/3] 已更新官方兜底路线表 officialWeaponRoutes.json（${officialRoutes.length} 条）`);
      }
    } catch (err) {
      console.warn(`[警告] 拉取 er-gamedata WeaponRoute.json 失败，使用本地缓存（${officialRoutes.length} 条）：${err.message}`);
    }
  }

  const recommendPath = path.join(sourcesDir, 'weaponRoutesRecommend.json');
  const existingDoc = await readJson(recommendPath, { result: [] });
  const chosenByPairKey = new Map();

  // 若是单英雄增量模式或离线模式，先载入已存结果
  if (heroFilterArg || isOffline) {
    for (const entry of existingDoc.result || []) {
      const r = entry?.recommendWeaponRoute;
      if (!r) continue;
      const char = allReleasedChars.find((c) => c.code === Number(r.characterCode));
      if (!char) continue;
      const wRaw = WEAPON_TYPE_CODE_TO_RAW[Number(r.weaponType)]
        || parseCodeList(r.weaponCodes).map((c) => itemByCode.get(c)).find((i) => i?.type === '武器')?.weaponTypeRaw
        || '';
      if (wRaw) chosenByPairKey.set(`${char.code}|${wRaw}`, entry);
    }
  }

  let dakPickedCount = 0;
  let officialFallbackCount = 0;

  if (!isOffline) {
    console.log(`[2/3] 正在从 dak.gg 同步 ${targetChars.length} 名实验体的最新推荐路线（并发 ${CONCURRENCY}）...`);
    await mapConcurrent(targetChars, CONCURRENCY, async (char) => {
      const charKeyCandidates = [...new Set([char.id, char.resource, char.englishName].filter(Boolean))];
      let page1Routes = [];
      for (const charKey of charKeyCandidates) {
        try {
          const url = `${DAK_ROUTES_API}?hl=zh-CN&character=${encodeURIComponent(charKey)}&page=1`;
          const data = await fetchJsonWithRetry(url);
          const list = (data?.weaponRoutes || []).filter((r) => Number(r.characterCode) === char.code);
          if (list.length > 0) {
            page1Routes = list;
            break;
          }
        } catch {
          // 尝试下一个候选英文名
        }
      }

      // 记录该角色在 dak.gg 上最高赞的一套完整潜能，供极端冷门武器走官方路线兜底时补齐潜能
      let bestHeroTraitCodes = [];
      for (const r of page1Routes) {
        const tc = parseCodeList(r.traitCodes);
        if (tc.length >= 5 && tc.some((id) => traitById.get(id)?.type === 'Core')) {
          bestHeroTraitCodes = tc;
          break;
        }
      }

      for (const weaponRaw of char.weapons) {
        let candidates = page1Routes
          .map((r) => evaluateCandidateRoute(r, weaponRaw, ctx))
          .filter(Boolean);

        // 若第 1 页全是该角色热门武器而没有当前副武器（或第 1 页该武器版本过旧），追加按武器或第 2~3 页检索
        const bestPage1 = candidates.sort((a, b) => b.score - a.score)[0];
        const needsDeeperSearch = !bestPage1 || !bestPage1.traitComplete || bestPage1.vRank < versionRank('13.0.0');
        if (needsDeeperSearch && charKeyCandidates[0]) {
          const wCode = WEAPON_RAW_TO_CODE[weaponRaw];
          const extraUrls = [
            wCode ? `${DAK_ROUTES_API}?hl=zh-CN&character=${encodeURIComponent(charKeyCandidates[0])}&weaponType=${encodeURIComponent(weaponRaw)}&page=1` : '',
            `${DAK_ROUTES_API}?hl=zh-CN&character=${encodeURIComponent(charKeyCandidates[0])}&page=2`,
            `${DAK_ROUTES_API}?hl=zh-CN&character=${encodeURIComponent(charKeyCandidates[0])}&page=3`
          ].filter(Boolean);

          for (const extraUrl of extraUrls) {
            try {
              const moreData = await fetchJsonWithRetry(extraUrl, 1);
              const moreMatched = (moreData?.weaponRoutes || [])
                .filter((r) => Number(r.characterCode) === char.code)
                .map((r) => evaluateCandidateRoute(r, weaponRaw, ctx))
                .filter(Boolean);
              candidates.push(...moreMatched);
              const topNow = candidates.sort((a, b) => b.score - a.score)[0];
              if (topNow && topNow.filledSlots === 5 && topNow.traitComplete && topNow.vRank >= versionRank('13.0.0')) {
                break;
              }
            } catch {
              // 忽略翻页失败
            }
          }
        }

        candidates.sort((a, b) => b.score - a.score);
        const winner = candidates[0];

        if (winner && winner.filledSlots === 5) {
          chosenByPairKey.set(`${char.code}|${weaponRaw}`, normalizeToRecommendEntry(winner.route, 'dak.gg', weaponRaw));
          dakPickedCount += 1;
          continue;
        }

        // 兜底：使用 er-gamedata WeaponRoute.json 官方客户端内置路线
        const official = officialRoutes.find((r) => {
          if (Number(r.characterCode) !== char.code) return false;
          const ev = evaluateCandidateRoute(r, weaponRaw, ctx);
          return Boolean(ev);
        });

        if (official) {
          const mergedOfficial = {
            ...official,
            id: Number(official.id) || (900000 + char.code * 100 + (WEAPON_RAW_TO_CODE[weaponRaw] || 0)),
            title: official.title || `${char.name} ${weaponRaw} 官方默认路线`,
            traitCodes: parseCodeList(official.traitCodes).length >= 5
              ? official.traitCodes
              : JSON.stringify(bestHeroTraitCodes),
            version: patchLogDoc?.gameVersion?.label || '13.1.0'
          };
          chosenByPairKey.set(`${char.code}|${weaponRaw}`, normalizeToRecommendEntry(mergedOfficial, 'er-gamedata', weaponRaw));
          officialFallbackCount += 1;
        } else if (winner) {
          chosenByPairKey.set(`${char.code}|${weaponRaw}`, normalizeToRecommendEntry(winner.route, 'dak.gg', weaponRaw));
          dakPickedCount += 1;
        }
      }
    });
  }

  // 按角色 code + 武器顺序稳定排序输出
  const orderedEntries = [];
  for (const char of allReleasedChars) {
    for (const weaponRaw of char.weapons) {
      const entry = chosenByPairKey.get(`${char.code}|${weaponRaw}`);
      if (entry) orderedEntries.push(entry);
    }
  }

  const payload = {
    code: 200,
    message: 'Success',
    generatedAt: new Date().toISOString(),
    source: 'dak.gg routes API (zh-CN) + pypy-vrc/er-gamedata WeaponRoute.json fallback',
    counts: {
      totalPairs: orderedEntries.length,
      dakRoutes: orderedEntries.filter((e) => e.recommendWeaponRoute?.routeSource === 'dak.gg').length,
      officialFallbackRoutes: orderedEntries.filter((e) => e.recommendWeaponRoute?.routeSource === 'er-gamedata').length
    },
    result: orderedEntries
  };

  await writeJson(recommendPath, payload);
  console.log(
    `[2/3] 已写入 sources/weaponRoutesRecommend.json：共 ${orderedEntries.length} 套（dak.gg 玩家高赞 ${payload.counts.dakRoutes} 套，官方内置兜底 ${payload.counts.officialFallbackRoutes} 套）`
  );

  console.log('[3/3] 正在生成 src/data/weaponRoutePresets.json ...');
  execFileSync(process.execPath, [path.join(__dirname, 'build-weapon-route-presets.mjs')], {
    cwd: rootDir,
    stdio: 'inherit'
  });
}

main().catch((err) => {
  console.error('同步推荐路线失败：', err);
  process.exitCode = 1;
});
