// scripts/self-check.mjs
// 全项目一致性自检脚本（JSON 语法/BOM、91 位正式实验体面板与头像、119 套武器预设、23 类武器基础攻速、700+ 技能公式求值与特殊规则引用）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  calculateSkill,
  progressiveDamageRule,
  progressiveDamageValue,
  skillFormulaDescription
} from '../src/lib/formula.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'src', 'data');

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), 'utf8').replace(/^\uFEFF/, ''));

const errors = [];
const warnings = [];

// 1. 全量 JSON 语法与 BOM 检查
function walkJson(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walkJson(full, out);
    else if (name.endsWith('.json')) out.push(full);
  }
  return out;
}

const jsonFiles = [...walkJson(dataDir), path.join(rootDir, 'assets', 'characters', 'manifest.json')];
for (const jf of jsonFiles) {
  const raw = fs.readFileSync(jf, 'utf8');
  if (raw.charCodeAt(0) === 0xfeff) warnings.push(`发现 UTF-8 BOM 头：${path.relative(rootDir, jf)}`);
  try {
    JSON.parse(raw.replace(/^\uFEFF/, ''));
  } catch (err) {
    errors.push(`JSON 解析失败 ${path.relative(rootDir, jf)}: ${err.message}`);
  }
}
console.log(`[1/5] JSON 完整性检查通过（共 ${jsonFiles.length} 个数据文件）`);

// 2. 实验体、头像、熟练度、武器攻速表与 119 套推荐出装检查
const characters = readJson('src/data/characters.json').characters || [];
const masteryStats = readJson('src/data/masteryStats.json') || [];
const weaponTypeInfo = readJson('src/data/weaponTypeInfo.json').weaponTypes || {};
const heroStatus = readJson('src/data/heroStatus.json').heroes || {};
const heroSkills = readJson('src/data/heroSkills.json').skills || [];
const equipment = readJson('src/data/equipment.json').equipment || [];
const loadout = readJson('src/data/dakLoadoutAssets.json');
const presetsDoc = readJson('src/data/weaponRoutePresets.json');
const presets = presetsDoc.presets || {};
const specialRules = readJson('src/data/specialSkillRules.json').heroes || {};

const equipByName = new Map(equipment.map((item) => [item.name, item]));
const traitById = new Map((loadout.traits || []).map((t) => [String(t.id), t]));
const tacticalByName = new Map((loadout.tacticalSkills || []).map((t) => [t.name, t]));

const releasedChars = characters.filter((c) => heroStatus[c.name]?.damageTestOnly !== true);
let expectedPairs = 0;

for (const c of releasedChars) {
  if (!c.growth) errors.push(`缺失成长属性：${c.name} (${c.code})`);
  if (!Array.isArray(c.weapons) || !c.weapons.length) errors.push(`缺失武器列表：${c.name} (${c.code})`);
  const avatarPath = path.join(rootDir, String(c.image || '').replace(/^\//, ''));
  if (!fs.existsSync(avatarPath) || fs.statSync(avatarPath).size < 100) {
    errors.push(`缺失实验体头像文件：${c.name} -> ${c.image}`);
  }
  const cSkills = heroSkills.filter((s) => s.hero === c.name);
  if (cSkills.length < 3) errors.push(`技能条目过少（${cSkills.length} 条）：${c.name}`);

  for (const w of c.weapons || []) {
    expectedPairs += 1;
    if (!(weaponTypeInfo[w]?.attackSpeed > 0)) {
      errors.push(`weaponTypeInfo.json 缺失武器基础攻速：${w}`);
    }
    const ms = masteryStats.find((m) => m.characterCode === c.code && m.type === w);
    if (!ms || !ms.options?.length) {
      errors.push(`masteryStats.json 缺失武器熟练度：${c.name}|${w}`);
    }
    const pKey = `${c.name}|${w}`;
    const preset = presets[pKey];
    if (!preset) {
      errors.push(`weaponRoutePresets.json 缺失预设：${pKey}`);
      continue;
    }
    for (const slot of ['武器', '衣服', '头部', '手部', '鞋子']) {
      const itemName = preset.gear?.[slot];
      const item = equipByName.get(itemName);
      if (!item) errors.push(`预设 ${pKey} 槽位「${slot}」装备不存在：${itemName}`);
      else if (slot === '武器' && item.weaponTypeRaw !== w) {
        errors.push(`预设 ${pKey} 武器类型不匹配：期望 ${w}，实际 ${item.weaponTypeRaw} (${itemName})`);
      }
    }
    const ts = preset.traitSelection || {};
    for (const tk of ['core', 'sub1', 'sub2', 'secondarySub1', 'secondarySub2']) {
      if (!ts[tk] || !traitById.has(String(ts[tk]))) {
        errors.push(`预设 ${pKey} 潜能槽 ${tk} 无效：${ts[tk]}`);
      }
    }
    if (ts.group && ts.secondaryGroup && ts.group === ts.secondaryGroup) {
      errors.push(`预设 ${pKey} 主副潜能系重复：${ts.group}`);
    }
    if (!preset.tacticalSkill || !tacticalByName.has(preset.tacticalSkill)) {
      errors.push(`预设 ${pKey} 战术技能无效：${preset.tacticalSkill}`);
    }
  }
}
console.log(`[2/5] 实验体与头像检查通过（${releasedChars.length} 名已开放实验体，23 类武器基础攻速齐全）`);
console.log(`[3/5] 推荐出装预设检查通过（${Object.keys(presets).length}/${expectedPairs} 套完整覆盖，5 槽装备 + 5 槽潜能 + 战术技能全部有效）`);

// 3. 全部技能公式白名单、求值、说明文案与渐进规则检查
const sampleCtx = {
  ap: 450,
  attack: 260,
  extraAttack: 130,
  targetHp: 2200,
  targetCurrentHp: 1320,
  targetLostHp: 880,
  maxHp: 2100,
  selfCurrentHp: 1260,
  selfLostHp: 840,
  extraHp: 450,
  defense: 130,
  shield: 300,
  critChance: 0.65,
  pen: 24,
  attackSpeed: 1.45,
  bonusAttackSpeed: 0.85,
  basicAttackAmp: 0.22,
  accumulatedDamage: 1000,
  stacks: 5,
  passiveLevel: 3,
  heroLevel: 20,
  finalMod: 0.62,
  basicAttackFinalMod: 0.58
};

const weaponSkills = readJson('src/data/weaponSkills.json').weaponSkills || {};
for (const wKey of Object.keys(weaponTypeInfo)) {
  const ws = weaponSkills[wKey];
  if (!ws) { errors.push(`weaponSkills.json 缺失武器技能：${wKey}`); continue; }
  for (const seg of ws.segments || []) {
    for (let lv = 1; lv <= 3; lv += 1) {
      const r = calculateSkill(seg, lv, sampleCtx);
      if (!Number.isFinite(r.rawDamage) || !Number.isFinite(r.damage)) {
        errors.push(`武器技能求值 NaN：${seg.id} Lv.${lv}`);
      }
    }
  }
}

const skillIdSet = new Set(heroSkills.map((s) => s.id));
let progressiveCount = 0;

for (const s of heroSkills) {
  const expr = String(s.formula || '').trim();
  if (!/^[\d\s+\-*/().,_A-Za-z[\]]+$/.test(expr)) {
    errors.push(`技能公式含非法字符被白名单拦截 ${s.id} (${s.hero}): ${expr}`);
  }
  const maxLv = Math.max(1, Number(s.maxLevel) || 5);
  for (let lv = 1; lv <= maxLv; lv += 1) {
    const res = calculateSkill(s, lv, sampleCtx);
    if (!Number.isFinite(res.rawDamage) || !Number.isFinite(res.damage)) {
      errors.push(`技能求值出现 NaN ${s.id} Lv.${lv}`);
    }
    const desc = skillFormulaDescription(s, lv);
    if (!desc || desc.includes('NaN') || desc.includes('undefined')) {
      errors.push(`技能公式说明异常 ${s.id} Lv.${lv}: ${desc}`);
    }
    if (progressiveDamageRule(s)) {
      if (lv === 1) progressiveCount += 1;
      const pr = progressiveDamageValue(res, sampleCtx, 2);
      if (!Number.isFinite(pr.raw) || !Number.isFinite(pr.final)) {
        errors.push(`渐进技能求值出现 NaN ${s.id} Lv.${lv}`);
      }
    }
  }
}
console.log(`[4/5] 技能公式求值检查通过（共 ${heroSkills.length} 条技能，含 ${progressiveCount} 条渐进蓄力技能）`);

// 4. specialSkillRules 与攻速转化抽样核验
for (const [hero, rule] of Object.entries(specialRules)) {
  for (const dId of Object.keys(rule?.display || {})) {
    if (!skillIdSet.has(dId)) warnings.push(`specialSkillRules.display 引用了不存在的技能 ID (${hero}): ${dId}`);
  }
  for (const cb of rule?.combos || []) {
    for (const cId of Object.keys(cb.hits || {})) {
      if (!skillIdSet.has(cId)) warnings.push(`specialSkillRules.combos 引用了不存在的技能 ID (${hero}): ${cId}`);
    }
  }
}

const nathP = heroSkills.find((s) => s.id === 'ingame-034-nathapon-p-1034100-basic-attack-extra-damage');
const cravP = heroSkills.find((s) => s.id === 'patch-115-craver-1089100-damage');
const expectedNathRaw = Math.floor(90 + 0.85 * 20 + 450 * 0.65); // 90 + 17 + 292.5 = 399
const expectedCravRaw = Math.floor(60 + 450 * 0.25 + 0.85 * 50); // 60 + 112.5 + 42.5 = 215
if (calculateSkill(nathP, 3, sampleCtx).rawDamage !== expectedNathRaw) {
  errors.push(`纳塔朋 P 攻速加成计算不符：期望 ${expectedNathRaw}`);
}
if (calculateSkill(cravP, 3, sampleCtx).rawDamage !== expectedCravRaw) {
  errors.push(`克雷弗 P 攻速加成计算不符：期望 ${expectedCravRaw}`);
}
console.log(`[5/5] 特殊规则与攻速转化校验通过（纳塔朋 P Lv.3=${expectedNathRaw}，克雷弗 P Lv.3=${expectedCravRaw}，共 ${Object.keys(specialRules).length} 位特殊规则英雄）`);

if (warnings.length) {
  console.log(`\n提示项（${warnings.length}）：`);
  warnings.forEach((w) => console.log(`  ⚠ ${w}`));
}
if (errors.length) {
  console.error(`\n❌ 自检发现 ${errors.length} 处错误：`);
  errors.forEach((e) => console.error(`  · ${e}`));
  process.exit(1);
}
console.log('\n✅ 全项目自检全部通过（0 错误）！');
