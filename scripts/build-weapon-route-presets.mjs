// 推荐武器路线 → 每个（实验体, 武器类型）一份装备预设。
//
// 源文件 src/data/sources/weaponRoutesRecommend.json 由 scripts/sync-weapon-routes.mjs 同步维护。
// 一条路线里有两套装备：
//   - weaponCodes      ：英雄级（Epic）的过渡装
//   - lateGameItemCodes：成型装，键 "0".."3" 是几套备选（或逗号分隔列表）
// 计算器比的是成型配装，所以优先取 lateGameItemCodes["0"]，缺槽时依次用 weaponCodes 与 ["1"] 同槽补齐，
// 且武器槽强制与该路线的目标武器类型一致。
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const read = (p) => JSON.parse(readFileSync(path.join(dataDir, p), 'utf8').replace(/^\uFEFF/, ''));

const WEAPON_TYPE_CODE_TO_RAW = {
  1: 'Glove', 2: 'Tonfa', 3: 'Bat', 4: 'Whip', 5: 'HighAngleFire', 6: 'DirectFire',
  7: 'Bow', 8: 'CrossBow', 9: 'Pistol', 10: 'AssaultRifle', 11: 'SniperRifle',
  13: 'Hammer', 14: 'Axe', 15: 'OneHandSword', 16: 'TwoHandSword', 18: 'DualSword',
  19: 'Spear', 20: 'Nunchaku', 21: 'Rapier', 22: 'Guitar', 23: 'Camera', 24: 'Arcana', 25: 'VFArm'
};

const routesDoc = read('sources/weaponRoutesRecommend.json');
const routes = routesDoc.result || [];
const equipmentFile = read('equipment.json');
const equipment = equipmentFile.items || equipmentFile.equipment || Object.values(equipmentFile)[0];
const characters = read('characters.json').characters || [];
const loadout = read('dakLoadoutAssets.json');

const itemByCode = new Map(equipment.map((item) => [Number(item.code), item]));
const characterByCode = new Map(characters.map((c) => [Number(c.code), c]));
const traitById = new Map((loadout.traits || []).map((t) => [Number(t.id), t]));
const tacticalById = new Map((loadout.tacticalSkills || []).map((t) => [Number(t.id), t]));

const SLOTS = ['武器', '衣服', '头部', '手部', '鞋子'];

function parseCodes(raw) {
  if (Array.isArray(raw)) return raw.map(Number).filter(Number.isFinite);
  const str = String(raw || '').trim();
  if (!str) return [];
  if (str.startsWith('[')) {
    try { return JSON.parse(str).map(Number).filter(Number.isFinite); } catch { return []; }
  }
  return str.split(',').map((s) => Number(s.trim())).filter(Number.isFinite);
}

function parseMap(raw) {
  const str = String(raw || '').trim();
  if (!str) return {};
  if (str.startsWith('{')) {
    try { return JSON.parse(str); } catch { return {}; }
  }
  const flat = parseCodes(str);
  return flat.length ? { '0': flat } : {};
}

/** 一串道具码 → { 槽位: 道具名 }，同槽只保留第一件；武器槽须匹配目标武器类型。 */
function gearFromCodes(codes, expectedWeaponRaw, into = {}) {
  for (const code of codes) {
    const item = itemByCode.get(Number(code));
    if (!item || !SLOTS.includes(item.type)) continue;
    if (into[item.type]) continue;
    if (item.type === '武器' && expectedWeaponRaw && item.weaponTypeRaw !== expectedWeaponRaw) continue;
    into[item.type] = item.name;
  }
  return into;
}

/** 5 个潜能码 → 界面用的 traitSelection。核心潜能所在的组是主组，另一组是副组。 */
function traitSelectionFromCodes(codes) {
  const traits = codes.map((code) => traitById.get(Number(code))).filter((t) => t && t.type !== 'None');
  const core = traits.find((t) => t.type === 'Core');
  const primaryGroup = core?.group || traits[0]?.group || '';
  const secondaryGroup = traits.find((t) => t.group && t.group !== primaryGroup)?.group || '';
  const pick = (group, type) => String(traits.find((t) => t.group === group && t.type === type)?.id || '');
  return {
    group: primaryGroup,
    core: String(core?.id || ''),
    sub1: pick(primaryGroup, 'Sub1'),
    sub2: pick(primaryGroup, 'Sub2'),
    secondaryGroup,
    secondarySub1: pick(secondaryGroup, 'Sub1'),
    secondarySub2: pick(secondaryGroup, 'Sub2')
  };
}

const presets = {};
const skipped = [];
const seen = new Set();

for (const entry of routes) {
  const route = entry.recommendWeaponRoute;
  if (!route) continue;
  const character = characterByCode.get(Number(route.characterCode));
  if (!character) { skipped.push(`未知实验体码 ${route.characterCode}`); continue; }

  const earlyCodes = parseCodes(route.weaponCodes);
  const lateMap = parseMap(route.lateGameItemCodes);
  const lateCodes0 = lateMap['0'] || [];
  const lateCodes1 = lateMap['1'] || [];

  const weaponItem = earlyCodes.map((c) => itemByCode.get(c)).find((i) => i?.type === '武器');
  const lateWeapon = lateCodes0.map((c) => itemByCode.get(c)).find((i) => i?.type === '武器');
  const enumWeaponRaw = WEAPON_TYPE_CODE_TO_RAW[Number(route.weaponType)] || '';
  const weaponTypeRaw = lateWeapon?.weaponTypeRaw || enumWeaponRaw || weaponItem?.weaponTypeRaw || '';
  if (!weaponTypeRaw) { skipped.push(`${character.name}：路线里认不出武器类型`); continue; }

  const key = `${character.name}|${weaponTypeRaw}`;
  if (seen.has(key)) continue;
  seen.add(key);

  // 成型装 ["0"] 优先，缺槽依次用过渡装与备选 ["1"] 补齐
  const gear = gearFromCodes(lateCodes0, weaponTypeRaw);
  gearFromCodes(earlyCodes, weaponTypeRaw, gear);
  gearFromCodes(lateCodes1, weaponTypeRaw, gear);
  const filled = SLOTS.filter((slot) => gear[slot]);
  if (filled.length < SLOTS.length) {
    skipped.push(`${key}：只凑齐 ${filled.length}/5 个槽位（${SLOTS.filter((s) => !gear[s]).join('、')} 缺）`);
  }

  presets[key] = {
    hero: character.name,
    weaponTypeRaw,
    gear: Object.fromEntries(SLOTS.map((slot) => [slot, gear[slot] || ''])),
    traitSelection: traitSelectionFromCodes(parseCodes(route.traitCodes)),
    tacticalSkill: tacticalById.get(Number(route.tacticalSkillGroupCode))?.name || '',
    routeId: route.id,
    routeTitle: route.title,
    routeAuthor: route.userNickname,
    gameVersion: route.version,
    routeLikes: Number(route.v2Like ?? 0),
    routeSource: route.routeSource || 'official'
  };
}

const versionCounts = {};
for (const p of Object.values(presets)) {
  const v = p.gameVersion || 'unknown';
  versionCounts[v] = (versionCounts[v] || 0) + 1;
}

const payload = {
  _comment: '推荐武器路线导出的装备预设，键是「实验体名|武器类型」。由 scripts/sync-weapon-routes.mjs 与 scripts/build-weapon-route-presets.mjs 生成，不要手改。',
  _usage: '切换实验体或武器类型时，若用户没有自己改过这个组合的配装，就套用这里的预设；用户改过则以用户的为准（存在浏览器缓存里）。',
  generatedAt: new Date().toISOString(),
  source: routesDoc.source || 'src/data/sources/weaponRoutesRecommend.json',
  counts: {
    routes: routes.length,
    presets: Object.keys(presets).length,
    heroes: new Set(Object.values(presets).map((p) => p.hero)).size,
    byVersion: versionCounts
  },
  presets
};

writeFileSync(path.join(dataDir, 'weaponRoutePresets.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

const heroes = new Set(Object.values(presets).map((p) => p.hero));
console.log(`${routes.length} 条路线 → ${Object.keys(presets).length} 份预设，覆盖 ${heroes.size} 名实验体。`);
console.log('版本分布：', JSON.stringify(versionCounts));
const multi = [...heroes].filter((h) => Object.values(presets).filter((p) => p.hero === h).length > 1);
if (multi.length) console.log(`有多套武器预设的实验体（${multi.length} 名）：${multi.join('、')}`);
if (skipped.length) {
  console.log(`\n注意 ${skipped.length} 条：`);
  skipped.forEach((s) => console.log(`  · ${s}`));
}
