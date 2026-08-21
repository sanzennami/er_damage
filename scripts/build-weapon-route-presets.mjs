// 官方「武器路线推荐」→ 每个（实验体, 武器类型）一份装备预设。
//
// 源文件 src/data/sources/weaponRoutesRecommend.json 是官方接口的原始返回（100 条路线）。
// 一条路线里有两套装备：
//   - weaponCodes      ：英雄级（Epic）的过渡装
//   - lateGameItemCodes：成型装，键 "0".."3" 是几套备选
// 计算器比的是成型配装，所以取 lateGameItemCodes["0"]；它缺槽时用 weaponCodes 同槽补齐。
// （"2"/"3" 那两套在源数据里本身就不完整——会出现两件头部、没有武器，所以不用。）
//
// 同一个（实验体, 武器类型）有多条路线时取文件里出现的第一条。
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const read = (p) => JSON.parse(readFileSync(path.join(dataDir, p), 'utf8'));

const routes = read('sources/weaponRoutesRecommend.json').result || [];
const equipmentFile = read('equipment.json');
const equipment = equipmentFile.items || equipmentFile.equipment || Object.values(equipmentFile)[0];
const characters = read('characters.json').characters || [];
const loadout = read('dakLoadoutAssets.json');

const itemByCode = new Map(equipment.map((item) => [item.code, item]));
const characterByCode = new Map(characters.map((c) => [c.code, c]));
const traitById = new Map((loadout.traits || []).map((t) => [t.id, t]));
const tacticalById = new Map((loadout.tacticalSkills || []).map((t) => [t.id, t]));

const SLOTS = ['武器', '衣服', '头部', '手部', '鞋子'];
const parseCodes = (raw) => { try { return JSON.parse(raw || '[]'); } catch { return []; } };
const parseMap = (raw) => { try { return JSON.parse(raw || '{}'); } catch { return {}; } };

/** 一串道具码 → { 槽位: 道具名 }，同槽只保留第一件。 */
function gearFromCodes(codes, into = {}) {
  for (const code of codes) {
    const item = itemByCode.get(code);
    if (!item || !SLOTS.includes(item.type)) continue;
    if (into[item.type]) continue;
    into[item.type] = item.name;
  }
  return into;
}

/** 5 个潜能码 → 界面用的 traitSelection。核心潜能所在的组是主组，另一组是副组。 */
function traitSelectionFromCodes(codes) {
  const traits = codes.map((code) => traitById.get(code)).filter(Boolean);
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
  const character = characterByCode.get(route.characterCode);
  if (!character) { skipped.push(`未知实验体码 ${route.characterCode}`); continue; }

  const earlyCodes = parseCodes(route.weaponCodes);
  const weaponItem = earlyCodes.map((c) => itemByCode.get(c)).find((i) => i?.type === '武器');
  const lateCodes = parseMap(route.lateGameItemCodes)['0'] || [];
  const lateWeapon = lateCodes.map((c) => itemByCode.get(c)).find((i) => i?.type === '武器');
  const weaponTypeRaw = lateWeapon?.weaponTypeRaw || weaponItem?.weaponTypeRaw || '';
  if (!weaponTypeRaw) { skipped.push(`${character.name}：路线里认不出武器类型`); continue; }

  const key = `${character.name}|${weaponTypeRaw}`;
  if (seen.has(key)) continue; // 同组合取第一条
  seen.add(key);

  // 成型装优先，缺的槽位用过渡装补
  const gear = gearFromCodes(lateCodes);
  gearFromCodes(earlyCodes, gear);
  const filled = SLOTS.filter((slot) => gear[slot]);
  if (filled.length < SLOTS.length) {
    skipped.push(`${key}：只凑齐 ${filled.length}/5 个槽位（${SLOTS.filter((s) => !gear[s]).join('、')} 缺）`);
  }

  presets[key] = {
    hero: character.name,
    weaponTypeRaw,
    gear: Object.fromEntries(SLOTS.map((slot) => [slot, gear[slot] || ''])),
    traitSelection: traitSelectionFromCodes(parseCodes(route.traitCodes)),
    tacticalSkill: tacticalById.get(route.tacticalSkillGroupCode)?.name || '',
    routeId: route.id,
    routeTitle: route.title,
    routeAuthor: route.userNickname,
    gameVersion: route.version
  };
}

const payload = {
  _comment: '官方「武器路线推荐」导出的装备预设，键是「实验体名|武器类型」。由 scripts/build-weapon-route-presets.mjs 生成，不要手改。',
  _usage: '切换实验体或武器类型时，若用户没有自己改过这个组合的配装，就套用这里的预设；用户改过则以用户的为准（存在浏览器缓存里）。',
  generatedAt: new Date().toISOString(),
  source: 'src/data/sources/weaponRoutesRecommend.json',
  counts: { routes: routes.length, presets: Object.keys(presets).length },
  presets
};

writeFileSync(path.join(dataDir, 'weaponRoutePresets.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

const heroes = new Set(Object.values(presets).map((p) => p.hero));
console.log(`${routes.length} 条路线 → ${Object.keys(presets).length} 份预设，覆盖 ${heroes.size} 名实验体。`);
const multi = [...heroes].filter((h) => Object.values(presets).filter((p) => p.hero === h).length > 1);
if (multi.length) console.log(`有多套武器预设的实验体：${multi.join('、')}`);
if (skipped.length) {
  console.log(`\n注意 ${skipped.length} 条：`);
  skipped.forEach((s) => console.log(`  · ${s}`));
}
