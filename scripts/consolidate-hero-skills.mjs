// 把分散在各来源文件里的技能/装备/实验体数据整合成三张可直接手改的表。
//
// 输入（src/data/sources/，由各抓取导出脚本产出，App 不再直接读取）：
//   erSkillDamageTable.json          er-gamedata 结构化解包
//   erGameData.json                  er-gamedata 旧版解包（实验体 / 装备 / 旧技能表）
//   skillDamageAugments.json         强化普攻 / 强化技能 / 额外伤害补充
//   externalSkillDamageFallback.json Wiki 结构 + 官方公告数值
//   inGameSkillCapture.json          客户端界面读数
//
// 还会读 src/data/specialSkillRules.json 里的人工公式（权威最高）。
//
// 输出（src/data/，编辑入口）：
//   heroSkills.json   一段伤害只有一条，取权威值最高的来源；被淘汰的来源存进 alternatives
//   equipment.json    装备 + 属性定义
//   characters.json   实验体基础/成长属性 + 技能组索引
//
// 幂等：heroSkills.json 里 manual === true 的条目会被原样保留，重跑不会覆盖。

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(rootDir, 'src', 'data');
const sourceDir = path.join(dataDir, 'sources');

// 权威值：与 src/lib/skillSources.js 的 SKILL_SOURCE_AUTHORITY 保持一致
const AUTHORITY = {
  'special-skill-rule': 100,
  manual: 90,
  'official-patch-note': 80,
  'external-official-patch': 80,
  'in-game-client': 60,
  'external-wiki-current': 40,
  'external-skill-damage-wiki-current': 40,
  'er-skill-damage-table': 20,
  'er-gamedata': 10
};
const DEFAULT_AUTHORITY = 30;

const readJson = async (file, fallback = null) => {
  if (!existsSync(file)) return fallback;
  return JSON.parse(await readFile(file, 'utf8'));
};
const writeJson = (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');

const num = (value) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
};
const finite = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};

function authorityOf(entry) {
  if (entry?.manual === true) return AUTHORITY.manual;
  const source = String(entry?.source || '');
  return source in AUTHORITY ? AUTHORITY[source] : DEFAULT_AUTHORITY;
}

function versionTime(entry) {
  const value = entry?.updatedAt || entry?.sourceDate || entry?.patch || entry?.version || '';
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return parsed;
  const numeric = String(value).match(/\d+(?:\.\d+)*/)?.[0];
  return numeric ? Number(numeric.replace(/\./g, '').padEnd(8, '0')) : 0;
}

function identityKey(entry) {
  const hasIdentity = Boolean(entry.group || entry.skillId || entry.dataKey);
  if (!hasIdentity) return `${entry.hero || ''}|title|${entry.title || ''}`;
  return [entry.hero || '', entry.group || '', entry.skillId || '', entry.dataKey || ''].join('|');
}

// --- 结构化解包表 -> 技能条目 --------------------------------------------

function damageRowBases(row) {
  return [1, 2, 3, 4, 5, 6].map((level) => finite(row[`lv${level}`])).filter((value) => value !== null);
}
function damageRowCoefValues(row) {
  return [1, 2, 3, 4, 5, 6].map((level) => finite(row[`coefLv${level}`])).filter((value) => value !== null);
}
function damageRowFormula(row) {
  const coefValues = damageRowCoefValues(row);
  if (!coefValues.length || coefValues.every((value) => value === 0)) return 'base';
  const text = String(row.coefficientText || '');
  const variable = /攻击力/.test(text) && !/技能增幅|Skill Amp/i.test(text) ? 'attack' : 'ap';
  const unique = Array.from(new Set(coefValues));
  if (unique.length === 1) return `base + ${variable} * ${unique[0]}`;
  return `base + ${variable} * ${JSON.stringify(coefValues)}[level - 1]`;
}
function damageRowTitle(row) {
  const parts = [row.slot, row.skillName, row.damagePart].map((part) => String(part || '').trim()).filter(Boolean);
  return Array.from(new Set(parts)).join(' ');
}

// --- 归一化 ---------------------------------------------------------------

const KEEP_FIELDS = [
  'heroKey', 'slot', 'group', 'skillId', 'dataKey', 'coefKey',
  'description', 'coefficientText', 'scalingText', 'cooldown',
  'progressiveDamage', 'sourceUrl', 'sourceTitle', 'sourceNote', 'sourceLabel', 'sourceVersion'
];

function normalize(entry, sourceFile) {
  const out = {
    id: entry.id,
    hero: entry.hero,
    title: entry.title,
    bases: entry.bases,
    maxLevel: num(entry.maxLevel) || String(entry.bases || '').split(',').filter(Boolean).length,
    formula: entry.formula,
    source: entry.manual === true ? 'manual' : (entry.source || 'unknown'),
    manual: entry.manual === true,
    updatedAt: entry.updatedAt || entry.sourceDate || '',
    sourceFile
  };
  for (const field of KEEP_FIELDS) {
    if (entry[field] !== undefined && entry[field] !== '' && entry[field] !== null) out[field] = entry[field];
  }
  out.authority = authorityOf(out);
  return out;
}

async function main() {
  const [damageTable, gameData, augments, fallback, ingame, specialRules, previousSkills] = await Promise.all([
    readJson(path.join(sourceDir, 'erSkillDamageTable.json'), { damageRows: [] }),
    readJson(path.join(sourceDir, 'erGameData.json'), {}),
    readJson(path.join(sourceDir, 'skillDamageAugments.json'), { skills: [] }),
    readJson(path.join(sourceDir, 'externalSkillDamageFallback.json'), { skills: [] }),
    readJson(path.join(sourceDir, 'inGameSkillCapture.json'), { skills: [] }),
    readJson(path.join(dataDir, 'specialSkillRules.json'), { heroes: {} }),
    readJson(path.join(dataDir, 'heroSkills.json'), { skills: [] })
  ]);

  const manualHeroes = Object.entries(specialRules.heroes || {})
    .filter(([, rule]) => rule?.manual)
    .map(([hero]) => hero);

  const candidates = [];

  // 0. 人工规则里的公式（权威最高）
  for (const [hero, rule] of Object.entries(specialRules.heroes || {})) {
    for (const skill of rule.skills || []) {
      candidates.push(normalize({
        ...skill,
        hero,
        source: 'special-skill-rule',
        sourceNote: skill.sourceNote || rule.note || '人工校对的特殊计算规则'
      }, 'specialSkillRules.json'));
    }
  }

  // 1. heroSkills.json 里已有的人工条目（重跑保留）
  //    包含 manual 与 special-skill-rule 两类，即权威值 >= 90 的全部人工数据。
  //    公式搬进 heroSkills.json 之后，这条路径就是它们唯一的存活方式。
  for (const skill of previousSkills.skills || []) {
    if (authorityOf(skill) >= AUTHORITY.manual) {
      candidates.push(normalize(skill, 'heroSkills.json'));
    }
  }

  // 1b. localConfig.json 里与生成数据不一致的条目 —— 视为人工手改，按 manual 保留
  //     （localConfig 是页面配置表的存档，历史上混着镜像和手改，这里只挑真正改过的）
  const localConfig = await readJson(path.join(dataDir, 'localConfig.json'), { skills: [] });
  const generatedById = new Map();
  for (const list of [ingame.skills, augments.skills, fallback.skills, gameData.skills]) {
    for (const skill of list || []) generatedById.set(skill.id, skill);
  }
  for (const row of damageTable.damageRows || []) {
    const bases = damageRowBases(row);
    if (bases.length) {
      generatedById.set(row.standardId, { bases: bases.join(','), formula: damageRowFormula(row) });
    }
  }
  const localEdits = [];
  for (const skill of localConfig.skills || []) {
    if (manualHeroes.includes(skill.hero)) continue;
    const generated = generatedById.get(skill.id);
    if (!generated) continue;
    if (String(skill.bases) === String(generated.bases) && String(skill.formula) === String(generated.formula)) continue;
    localEdits.push(skill.id);
    candidates.push(normalize({
      ...skill,
      manual: true,
      source: 'manual',
      sourceNote: `${skill.sourceNote || ''} 来自 localConfig 的人工改动，整合时按人工录入保留，请复核。`.trim()
    }, 'localConfig.json'));
  }

  // 2. 客户端读数
  for (const skill of ingame.skills || []) {
    if (manualHeroes.includes(skill.hero)) continue;
    candidates.push(normalize(skill, 'inGameSkillCapture.json'));
  }

  // 3. 补充表 / 外部兜底表 / 旧解包表
  for (const skill of augments.skills || []) {
    if (manualHeroes.includes(skill.hero)) continue;
    candidates.push(normalize(skill, 'skillDamageAugments.json'));
  }
  for (const skill of fallback.skills || []) {
    if (manualHeroes.includes(skill.hero)) continue;
    candidates.push(normalize(skill, 'externalSkillDamageFallback.json'));
  }
  for (const skill of gameData.skills || []) {
    if (manualHeroes.includes(skill.hero)) continue;
    candidates.push(normalize(skill, 'erGameData.json'));
  }

  // 4. 结构化解包表
  for (const row of damageTable.damageRows || []) {
    if (manualHeroes.includes(row.heroName)) continue;
    const bases = damageRowBases(row);
    if (!bases.length) continue;
    candidates.push(normalize({
      id: row.standardId,
      hero: row.heroName,
      heroKey: row.heroKey,
      slot: row.slot,
      title: damageRowTitle(row),
      bases: bases.join(','),
      maxLevel: bases.length,
      formula: row.manual === true && row.formula ? row.formula : damageRowFormula(row),
      manual: row.manual === true,
      source: row.manual === true ? 'manual' : 'er-skill-damage-table',
      group: row.skillGroup,
      skillId: row.skillId,
      dataKey: row.baseKey,
      coefKey: row.coefKey,
      description: row.description,
      coefficientText: row.coefficientText,
      updatedAt: row.updatedAt || damageTable.generatedAt || ''
    }, 'erSkillDamageTable.json'));
  }

  // --- 按身份择优 ---------------------------------------------------------
  const groups = new Map();
  for (const entry of candidates) {
    const key = identityKey(entry);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }

  const skills = [];
  const conflicts = [];
  for (const [key, group] of groups) {
    group.sort((a, b) => (b.authority - a.authority) || (versionTime(b) - versionTime(a)));
    const [winner, ...losers] = group;
    const alternatives = losers
      .filter((entry) => entry.bases !== winner.bases || entry.formula !== winner.formula)
      .map((entry) => ({
        source: entry.source,
        authority: entry.authority,
        sourceFile: entry.sourceFile,
        bases: entry.bases,
        formula: entry.formula,
        updatedAt: entry.updatedAt || undefined
      }));
    const record = { ...winner };
    delete record.sourceFile;
    if (alternatives.length) {
      record.alternatives = alternatives;
      conflicts.push({
        key,
        hero: winner.hero,
        title: winner.title,
        kept: `${winner.source}(${winner.authority})`,
        dropped: alternatives.map((entry) => `${entry.source}(${entry.authority})`)
      });
    }
    skills.push(record);
  }

  skills.sort((a, b) => String(a.hero).localeCompare(String(b.hero), 'zh-Hans-CN')
    || num(a.group) - num(b.group)
    || String(a.dataKey || '').localeCompare(String(b.dataKey || '')));

  const bySource = skills.reduce((counts, skill) => {
    counts[skill.source] = (counts[skill.source] || 0) + 1;
    return counts;
  }, {});

  const heroSkills = {
    _comment: '英雄技能总表：一段伤害只有一条，已按权威值择优。这是技能数据唯一的编辑入口。',
    _usage: '手改后给该条加 "manual": true，重跑 scripts/consolidate-hero-skills.mjs 不会覆盖它。alternatives 记录了被淘汰来源的数值，供人工核对，不参与计算。',
    generatedAt: new Date().toISOString(),
    authority: AUTHORITY,
    counts: { skills: skills.length, heroes: new Set(skills.map((skill) => skill.hero)).size, resolvedConflicts: conflicts.length, bySource },
    skills
  };

  const equipment = {
    _comment: '装备总表：属性定义 + 全部装备。与英雄技能分开存储。',
    _usage: '改官方装备数值直接改这里；新增自定义装备追加一条，name 不要与官方重名。',
    generatedAt: new Date().toISOString(),
    source: gameData.source || '',
    counts: { items: (gameData.equipment || []).length, statDefinitions: (gameData.itemStatDefinitions || []).length },
    itemStatDefinitions: gameData.itemStatDefinitions || [],
    equipment: gameData.equipment || []
  };

  const characters = {
    _comment: '实验体总表：基础属性、每级成长、武器、技能组索引。',
    _usage: '基础/成长数值随官方公告更新；技能伤害不放这里，见 heroSkills.json。',
    generatedAt: new Date().toISOString(),
    source: gameData.source || '',
    counts: { characters: (gameData.characters || []).length, skillGroups: (gameData.rawSkillGroups || []).length },
    characters: gameData.characters || [],
    skillGroups: gameData.rawSkillGroups || []
  };

  await mkdir(dataDir, { recursive: true });
  await writeJson(path.join(dataDir, 'heroSkills.json'), heroSkills);
  await writeJson(path.join(dataDir, 'equipment.json'), equipment);
  await writeJson(path.join(dataDir, 'characters.json'), characters);

  await mkdir(path.join(rootDir, 'docs', 'data-consolidation'), { recursive: true });
  await writeJson(path.join(rootDir, 'docs', 'data-consolidation', 'conflicts.json'), {
    generatedAt: heroSkills.generatedAt,
    note: '同一段伤害存在多个来源时的取舍记录；kept 为实际生效来源。',
    conflicts
  });

  if (localEdits.length) {
    console.log(`[manual] 从 localConfig 保留 ${localEdits.length} 条人工改动（已标 manual，请复核）：`);
    localEdits.forEach((id) => console.log(`  - ${id}`));
  }

  console.log(JSON.stringify({
    skills: skills.length,
    heroes: heroSkills.counts.heroes,
    resolvedConflicts: conflicts.length,
    localEditsKept: localEdits.length,
    bySource,
    equipment: equipment.counts,
    characters: characters.counts
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
