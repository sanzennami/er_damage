import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const cacheDir = path.join(rootDir, '.er-gamedata-cache');
const outDir = path.join(rootDir, 'docs', 'skill-damage');
const skillTablesPath = path.join(rootDir, 'docs', 'skill-tables', 'er-skill-tables.json');
const dataDir = path.join(rootDir, 'src', 'data');

const repoUrl = 'https://github.com/pypy-vrc/er-gamedata';
const dakApiBase = 'https://er.dakgg.io/api/v1/data';
const generatedAt = new Date().toISOString();

const SKILL_SLOT_LABELS = new Map([
  [1, 'P'],
  [2, 'Q'],
  [3, 'W'],
  [4, 'E'],
  [5, 'R']
]);

const EXCLUDED_DAMAGE_KEY_PATTERNS = [
  /reduce/i,
  /delay/i,
  /count/i,
  /radius/i,
  /width/i,
  /depth/i,
  /effect/i,
  /code/i,
  /ratio/i,
  /increase/i
];

const COEF_KEY_PATTERNS = [
  ['DamageByLevel', ['SkillApCoef', 'SkillApCoefByLevel', 'ApCoefficient', 'DamageApCoef']],
  ['DamageByLevel_2', ['SkillApCoef_2', 'SkillApCoefByLevel_2', 'ApCoefficient_2', 'DamageApCoef_2']],
  ['DFS_DamageByLevel', ['DFS_DamageApCoefByLevel', 'DFS_DamageApCoef', 'SkillApCoef']],
  ['MinDamageByLevel', ['MinSkillApCoef', 'SkillApCoef']],
  ['MaxDamageByLevel', ['MaxSkillApCoef', 'SkillApCoef']],
  ['MinSkillDamage', ['MinSkillApCoef', 'SkillApCoef']],
  ['MaxSkillDamage', ['MaxSkillApCoef', 'SkillApCoef']],
  ['BaseDamage', ['BaseSkillApCoef', 'SkillApCoef', 'ApCoefficient']],
  ['AdditionalDamagePerHit', ['AdditionalSkillApCoefPerHit', 'SkillApCoef']],
  ['Damage', ['DamageApCoef', 'SkillApCoef', 'ApCoefficient']],
  ['SkillDamage', ['SkillDamageCoef', 'SkillApCoef', 'ApCoefficient']],
  ['FinishDamageByLevel', ['FinishSkillApCoef', 'SkillApCoef']],
  ['AttackDamage', ['SkillApCoef', 'ApCoefficient']],
  ['SkillDamageSignal', ['SkillApCoefSignal', 'SkillApCoef']],
  ['A1BaseDamage', ['A1ApDamage', 'SkillApCoef']],
  ['A1ReinforceBaseDamage', ['A1ReinforceApDamage', 'A1ApDamage']],
  ['A2BaseMinDamage', ['A2ApDamage']],
  ['A2BaseMaxDamage', ['A2ApDamage']],
  ['A3BaseDamage', ['A3ApDamage']],
  ['A3_1BaseDamage', ['A3_1ApDamage']],
  ['A3_2BaseDamage', ['A3_2ApDamage']],
  ['A4DamageBase', ['A4ApDamage']],
  ['A4ProjectileBaseDamage', ['A4ProjectileApDamage']],
  ['A4ConcentrationEndBaseDamage', ['A4ConcentrationEndApDamage']]
];

const LABEL_BY_KEY = {
  DamageByLevel: '基础伤害',
  DamageByLevel_2: '基础伤害 2',
  DFS_DamageByLevel: '持续伤害',
  MinDamageByLevel: '最低伤害',
  MaxDamageByLevel: '最高伤害',
  MinSkillDamage: '最低技能伤害',
  MaxSkillDamage: '最高技能伤害',
  BaseDamage: '基础伤害',
  AdditionalDamagePerHit: '每次命中追加伤害',
  Damage: '伤害',
  SkillDamage: '技能伤害',
  FinishDamageByLevel: '终结伤害',
  AttackDamage: '攻击伤害',
  SkillDamageSignal: '信号伤害',
  A1BaseDamage: 'A1 基础伤害',
  A1ReinforceBaseDamage: 'A1 强化基础伤害',
  A2BaseMinDamage: 'A2 最低基础伤害',
  A2BaseMaxDamage: 'A2 最高基础伤害',
  A3BaseDamage: 'A3 基础伤害',
  A3_1BaseDamage: 'A3-1 基础伤害',
  A3_2BaseDamage: 'A3-2 基础伤害',
  A4DamageBase: 'A4 基础伤害',
  A4ProjectileBaseDamage: 'A4 投射物基础伤害',
  A4ConcentrationEndBaseDamage: 'A4 蓄力结束基础伤害'
};

function cleanText(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePart(value) {
  return String(value || 'none')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'none';
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(cacheDir, relativePath), 'utf8'));
}

async function readProjectJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function fetchDakJson(endpoint) {
  const response = await fetch(`${dakApiBase}/${endpoint}?hl=zh-CN`, {
    headers: {
      accept: 'application/json',
      referer: 'https://dak.gg/er/routes/simulator/YuMin?hl=zh-CN',
      'user-agent': 'Mozilla/5.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch DAK.GG ${endpoint}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function loadL10n(language) {
  const text = await readFile(path.join(cacheDir, 'l10n', `${language}.txt`), 'utf8');
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.split('┃'))
      .filter((parts) => parts.length >= 2)
      .map(([key, ...value]) => [key, value.join('┃')])
  );
}

function valuesByLevel(value) {
  if (typeof value === 'number') return [{ level: 1, value }];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];

  return Object.entries(value)
    .map(([level, next]) => [Number(level), Number(next)])
    .filter(([level, next]) => Number.isFinite(level) && Number.isFinite(next))
    .sort((a, b) => a[0] - b[0])
    .map(([level, value]) => ({ level, value }));
}

function valueAtLevel(value, level) {
  if (typeof value === 'number') return value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  return value[level] ?? value[String(level)] ?? '';
}

function isDamageBaseKey(key, value) {
  if (!/damage/i.test(key)) return false;
  if (EXCLUDED_DAMAGE_KEY_PATTERNS.some((pattern) => pattern.test(key))) return false;
  if (/coef/i.test(key)) return false;
  return valuesByLevel(value).length > 0;
}

function coefCandidatesFor(baseKey) {
  const exact = COEF_KEY_PATTERNS.find(([key]) => key === baseKey);
  if (exact) return exact[1];

  const suffix = baseKey.match(/(_\w+)$/)?.[1] || '';
  const generic = ['SkillApCoef', 'SkillApCoefByLevel', 'ApCoefficient', 'DamageApCoef'];
  return suffix
    ? generic.flatMap((key) => [`${key}${suffix}`, key])
    : generic;
}

function findCoefKey(data, baseKey) {
  return coefCandidatesFor(baseKey).find((key) => Object.hasOwn(data, key)) || '';
}

function maxLevelForSkill(skillRows, group) {
  const levels = skillRows
    .filter((skill) => skill.group === group.group)
    .map((skill) => Number(skill.level))
    .filter(Number.isFinite);
  return levels.length ? Math.max(...levels) : null;
}

function slotForGroup(groupCode) {
  const slotNumber = Math.floor((groupCode % 1000) / 100);
  return SKILL_SLOT_LABELS.get(slotNumber) || '';
}

function mainSkillGroups(skillGroups, charactersByCode) {
  return skillGroups
    .map((group) => {
      const characterCode = Math.floor((group.group - 1000000) / 1000);
      const character = charactersByCode.get(characterCode);
      const slot = slotForGroup(group.group);
      if (!character || !slot) return null;

      return { ...group, character, characterCode, slot };
    })
    .filter(Boolean);
}

function extensionForGroup(group, extensionsByName) {
  const skillIdBase = String(group.skillId || '').replace(/_\d+$/, '');
  const passiveSkillIdBase = String(group.passiveSkillId || '').replace(/_\d+$/, '');
  return (
    extensionsByName.get(group.skillId) ||
    extensionsByName.get(group.passiveSkillId) ||
    extensionsByName.get(skillIdBase) ||
    extensionsByName.get(passiveSkillIdBase) ||
    extensionsByName.get(`${group.character.id}Skill`) ||
    null
  );
}

function latestSkillTextForGroup(group, dakSkillById, zh) {
  const dakSkill = dakSkillById.get(group.group);
  if (dakSkill) {
    return {
      skillName: cleanText(dakSkill.name),
      description: cleanText(dakSkill.tooltip),
      coefficientText: cleanText(zh[`Skill/Group/Coef/${group.group}`] || ''),
      textSource: 'dak.gg api zh-CN + er-gamedata coefficient text'
    };
  }

  return {
    skillName: cleanText(zh[`Skill/Group/Name/${group.group}`] || group.name || group.skillId),
    description: cleanText(zh[`Skill/Group/Desc/${group.group}`] || zh[`Skill/LobbyDesc/${group.group}`] || ''),
    coefficientText: cleanText(zh[`Skill/Group/Coef/${group.group}`] || ''),
    textSource: 'er-gamedata zh-CN fallback'
  };
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(rows, filePath) {
  if (!rows.length) return writeFile(filePath, '', 'utf8');
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))
  ];
  return writeFile(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function markdownTable(rows, headers) {
  const line = (cells) => `| ${cells.map((cell) => String(cell ?? '').replace(/\r?\n/g, '<br>')).join(' | ')} |`;
  return [
    line(headers),
    line(headers.map(() => '---')),
    ...rows.map((row) => line(row))
  ].join('\n');
}

function tablePreview(rows, limit = 300) {
  return rows.slice(0, limit).map((row) => [
    row.standardId,
    row.heroName,
    row.slot,
    row.skillName,
    row.damagePart,
    row.baseKey,
    row.coefKey,
    row.lv1,
    row.lv2,
    row.lv3,
    row.lv4,
    row.lv5,
    row.formula
  ]);
}

async function main() {
  if (!existsSync(cacheDir)) {
    throw new Error(`Missing er-gamedata cache at ${cacheDir}`);
  }
  if (!existsSync(skillTablesPath)) {
    throw new Error(`Missing skill table index at ${skillTablesPath}`);
  }

  const [skillTables, characters, skillGroups, skillRows, skillExtensions, zh, en] = await Promise.all([
    readProjectJson(skillTablesPath),
    readJson('data/Character.json'),
    readJson('data/SkillGroup.json'),
    readJson('data/Skill.json'),
    readJson('data/SkillExtension.json'),
    loadL10n('ChineseSimplified'),
    loadL10n('English')
  ]);
  const dakSkillsPayload = await fetchDakJson('skills');
  const dakSkillById = new Map(dakSkillsPayload.skills.map((skill) => [skill.id, skill]));

  const characterRows = characters
    .filter((character) => character.code > 0 && character.name && character.name !== 'None')
    .map((character) => ({
      code: character.code,
      id: character.name,
      name: zh[`Character/Name/${character.code}`] || character.name,
      englishName: en[`Character/Name/${character.code}`] || character.name
    }))
    .sort((a, b) => a.code - b.code);

  const charactersByCode = new Map(characterRows.map((character) => [character.code, character]));
  const extensionsByName = new Map(skillExtensions.map((item) => [item.name.replace(/Data$/, ''), item]));
  const groups = mainSkillGroups(skillGroups, charactersByCode)
    .filter((group) => group.group % 1000 >= 100 && group.group % 1000 < 600)
    .sort((a, b) => a.group - b.group);
  const indexedGroupByCode = new Map((skillTables.normalizedSkillGroups || []).map((group) => [Number(group.group), group]));

  const damageRows = [];
  const skillIndexRows = [];

  for (const group of groups) {
    const indexedGroup = indexedGroupByCode.get(group.group);
    const {
      skillName,
      coefficientText: coefText,
      description: descText,
      textSource
    } = indexedGroup || latestSkillTextForGroup(group, dakSkillById, zh);
    const extension = extensionForGroup(group, extensionsByName);
    const extensionData = extension ? JSON.parse(extension.data) : null;
    const maxLevel = maxLevelForSkill(skillRows, group);
    let structuredDamageCount = 0;

    if (extensionData) {
      const baseKeys = Object.keys(extensionData)
        .filter((key) => isDamageBaseKey(key, extensionData[key]))
        .sort((a, b) => a.localeCompare(b));

      for (const baseKey of baseKeys) {
        const values = valuesByLevel(extensionData[baseKey]);
        const coefKey = findCoefKey(extensionData, baseKey);
        const levels = values.map((entry) => entry.level);
        const coefValues = levels.map((level) => valueAtLevel(extensionData[coefKey], level));
        const standardId = [
          String(group.characterCode).padStart(3, '0'),
          normalizePart(group.character.id),
          group.slot.toLowerCase(),
          group.group,
          normalizePart(baseKey)
        ].join('-');
        const formula = coefKey ? `base + (${coefKey}) * skillAmp` : 'base';

        structuredDamageCount += 1;
        damageRows.push({
          standardId,
          heroCode: group.characterCode,
          heroKey: group.character.id,
          heroName: group.character.name,
          heroEnglishName: group.character.englishName,
          slot: group.slot,
          skillGroup: group.group,
          skillId: group.skillId,
          passiveSkillId: group.passiveSkillId,
          skillName,
          damagePart: LABEL_BY_KEY[baseKey] || baseKey,
          baseKey,
          coefKey,
          sourceExtension: extension.name,
          levels: levels.join('|'),
          lv1: valueAtLevel(extensionData[baseKey], 1),
          lv2: valueAtLevel(extensionData[baseKey], 2),
          lv3: valueAtLevel(extensionData[baseKey], 3),
          lv4: valueAtLevel(extensionData[baseKey], 4),
          lv5: valueAtLevel(extensionData[baseKey], 5),
          lv6: valueAtLevel(extensionData[baseKey], 6),
          coefLv1: coefValues[0] ?? '',
          coefLv2: coefValues[1] ?? '',
          coefLv3: coefValues[2] ?? '',
          coefLv4: coefValues[3] ?? '',
          coefLv5: coefValues[4] ?? '',
          formula,
          coefficientText: coefText,
          description: descText,
          textSource
        });
      }
    }

    skillIndexRows.push({
      standardId: [
        String(group.characterCode).padStart(3, '0'),
        normalizePart(group.character.id),
        group.slot.toLowerCase(),
        group.group
      ].join('-'),
      heroCode: group.characterCode,
      heroKey: group.character.id,
      heroName: group.character.name,
      heroEnglishName: group.character.englishName,
      slot: group.slot,
      skillGroup: group.group,
      skillId: group.skillId,
      passiveSkillId: group.passiveSkillId,
      skillName,
      maxLevel,
      hasCoefficientText: Boolean(coefText),
      hasStructuredExtension: Boolean(extensionData),
      structuredDamageCount,
      sourceExtension: extension?.name || '',
      coverageStatus: structuredDamageCount
        ? 'structured'
        : extensionData
          ? 'extension_without_damage_fields'
          : 'no_structured_extension_in_er-gamedata',
      coefficientText: coefText,
      description: descText,
      textSource
    });
  }

  const payload = {
    source: repoUrl,
    textSource: {
      preferred: `${dakApiBase}/skills?hl=zh-CN`,
      fallback: 'er-gamedata l10n/ChineseSimplified.txt',
      note: 'Skill names and descriptions prefer the current DAK.GG zh-CN API; coefficient templates fall back to er-gamedata because DAK.GG tooltip omits numeric placeholders.'
    },
    generatedAt,
    counts: {
      characters: characterRows.length,
      skillGroups: skillIndexRows.length,
      structuredDamageRows: damageRows.length,
      structuredSkillGroups: skillIndexRows.filter((row) => row.structuredDamageCount > 0).length,
      skillGroupsWithoutStructuredDamage: skillIndexRows.filter((row) => row.structuredDamageCount === 0).length
    },
    naming: {
      damageRow: '{heroCode}-{heroKey}-{slot}-{skillGroup}-{damageKey}',
      skillIndexRow: '{heroCode}-{heroKey}-{slot}-{skillGroup}'
    },
    damageRows,
    skillIndexRows
  };

  await Promise.all([
    mkdir(outDir, { recursive: true }),
    mkdir(dataDir, { recursive: true })
  ]);

  await writeFile(path.join(outDir, 'er-skill-damage-table.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeFile(path.join(dataDir, 'erSkillDamageTable.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeCsv(damageRows, path.join(outDir, 'er-skill-damage-table.csv'));
  await writeCsv(skillIndexRows, path.join(outDir, 'er-skill-damage-coverage.csv'));

  const coverageSummary = Object.entries(
    skillIndexRows.reduce((groups, row) => {
      groups[row.coverageStatus] = (groups[row.coverageStatus] || 0) + 1;
      return groups;
    }, {})
  ).map(([status, count]) => [status, count]);

  const missingByHero = characterRows
    .map((character) => {
      const rows = skillIndexRows.filter((row) => row.heroCode === character.code);
      const missing = rows.filter((row) => row.structuredDamageCount === 0);
      return [character.code, character.name, character.englishName, rows.length, missing.length];
    })
    .filter((row) => row[4] > 0);

  const doc = `# ER 英雄技能伤害等级表

数据来源：${repoUrl}

伤害结构来源为 \`.er-gamedata-cache/data/Character.json\`、\`SkillGroup.json\`、\`Skill.json\`、\`SkillExtension.json\`。英雄技能名称与描述优先使用 DAK.GG 当前接口 \`${dakApiBase}/skills?hl=zh-CN\`，该接口与路线模拟器页面使用的文本保持同步；DAK.GG 没有的技能变体再回退到 \`l10n/ChineseSimplified.txt\`。生成时间：${generatedAt}

## 文件

- 结构化伤害等级表 CSV：\`docs/skill-damage/er-skill-damage-table.csv\`
- 覆盖索引 CSV：\`docs/skill-damage/er-skill-damage-coverage.csv\`
- 完整 JSON：\`docs/skill-damage/er-skill-damage-table.json\`
- 前端可 import 副本：\`src/data/erSkillDamageTable.json\`

## 字段说明

- \`standardId\`：标准化命名，格式为 \`{heroCode}-{heroKey}-{slot}-{skillGroup}-{damageKey}\`。
- \`lv1...lv6\`：对应技能等级的基础伤害；空值表示该伤害段没有该等级。
- \`coefLv1...coefLv5\`：对应等级的技能增幅系数；若系数为固定数值，则所有等级相同。
- \`formula\`：当前可结构化表达的公式骨架，通常为 \`base + coefficient * skillAmp\`。
- \`coefficientText\`：中文技能系数说明原文，保留用于人工核对。
- \`textSource\`：技能名称和说明的文本来源；优先为 \`dak.gg api zh-CN\`。

## 覆盖统计

${markdownTable([
  ['英雄数', payload.counts.characters],
  ['英雄技能组/变体数', payload.counts.skillGroups],
  ['结构化伤害行数', payload.counts.structuredDamageRows],
  ['有结构化伤害的技能组数', payload.counts.structuredSkillGroups],
  ['无结构化伤害的技能组数', payload.counts.skillGroupsWithoutStructuredDamage]
], ['项目', '数量'])}

## 覆盖状态

${markdownTable(coverageSummary, ['状态', '数量'])}

说明：\`pypy-vrc/er-gamedata\` 当前只有部分技能在 \`SkillExtension.json\` 中提供可展开的伤害数值。对于只有 \`Skill/Group/Coef\` 文本模板、但没有结构化参数来源的技能，本导出不会猜测伤害数值，会在覆盖索引中标记为 \`no_structured_extension_in_er-gamedata\`。

## 结构化伤害表预览

${markdownTable(tablePreview(damageRows), ['standardId', '英雄', '槽位', '技能', '伤害段', '基础字段', '系数字段', 'Lv1', 'Lv2', 'Lv3', 'Lv4', 'Lv5', '公式'])}

${damageRows.length > 300 ? `\n预览仅展示前 300 行；完整表见 \`er-skill-damage-table.csv\`。\n` : ''}

## 缺少结构化伤害的英雄概览

${markdownTable(missingByHero, ['heroCode', '英雄', '英文名', '技能组数', '缺少结构化伤害数'])}
`;

  await writeFile(path.join(outDir, 'README.md'), doc, 'utf8');

  console.log(JSON.stringify(payload.counts, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
