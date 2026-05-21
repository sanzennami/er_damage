import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const cacheDir = path.join(rootDir, '.er-gamedata-cache');
const dataDir = path.join(cacheDir, 'data');
const outDir = path.join(rootDir, 'docs', 'skill-tables');
const srcDataDir = path.join(rootDir, 'src', 'data');

const repoUrl = 'https://github.com/pypy-vrc/er-gamedata/tree/master/data';
const dakApiBase = 'https://er.dakgg.io/api/v1/data';
const generatedAt = new Date().toISOString();

const SOURCE_PRIORITY = {
  'Skill.json': 100,
  'SkillGroup.json': 100,
  'SkillExtension.json': 100,
  'Skill_Indicator.json': 80
};

const TABLE_DEFS = {
  'BotSkillBuild.json': {
    role: 'bot skill build order',
    keyFields: ['characterCode']
  },
  'CharacterSkillVideos.json': {
    role: 'skill demo video resources',
    keyFields: ['code']
  },
  'DyingConditionSkill.json': {
    role: 'dying condition skill slot set',
    keyFields: ['code']
  },
  'GadgetSkill.json': {
    role: 'gadget skill quick slot config',
    keyFields: ['code', 'mode']
  },
  'ItemSkill.json': {
    role: 'item skill definitions',
    keyFields: ['itemSkillCode']
  },
  'ItemSkillGroup.json': {
    role: 'item skill groups',
    keyFields: ['itemSkillGroup']
  },
  'ItemSkillLinker.json': {
    role: 'item to skill links',
    keyFields: ['itemCode']
  },
  'Skill.json': {
    role: 'runtime skill level values',
    keyFields: ['code']
  },
  'Skill_Indicator.json': {
    role: 'indicator skill level values',
    keyFields: ['code']
  },
  'SkillEvolution.json': {
    role: 'skill evolution definitions',
    keyFields: ['code']
  },
  'SkillEvolutionGroup.json': {
    role: 'skill evolution groups',
    keyFields: ['group']
  },
  'SkillEvolutionPoint.json': {
    role: 'skill evolution point rules',
    keyFields: ['code']
  },
  'SkillExtension.json': {
    role: 'extra structured skill parameters',
    keyFields: ['key']
  },
  'SkillGroup.json': {
    role: 'skill group/cast definitions',
    keyFields: ['group']
  },
  'SkillTargetMask.json': {
    role: 'skill target masks',
    keyFields: ['code']
  },
  'TacticalSkillSet.json': {
    role: 'tactical skill upgrade sets',
    keyFields: ['code']
  },
  'TacticalSkillSetGroup.json': {
    role: 'tactical skill set groups',
    keyFields: ['group']
  }
};

const HERO_SLOT_LABELS = new Map([
  [100, 'P'],
  [200, 'Q'],
  [300, 'W'],
  [400, 'E'],
  [500, 'R']
]);

function git(args) {
  return execFileSync('git', ['-C', cacheDir, ...args], {
    cwd: rootDir,
    encoding: 'utf8'
  }).trim();
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(cacheDir, relativePath), 'utf8'));
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

async function fetchDakJson(endpoint) {
  const response = await fetch(`${dakApiBase}/${endpoint}?hl=zh-CN`, {
    headers: {
      accept: 'application/json',
      referer: 'https://dak.gg/er/routes/simulator/YuMin?hl=zh-CN',
      'user-agent': 'Mozilla/5.0'
    }
  });
  if (!response.ok) return null;
  return response.json();
}

function cleanText(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePart(value) {
  return String(value ?? 'none')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'none';
}

function fileUpdatedAt(fileName) {
  return git(['log', '-1', '--format=%cI', '--', `data/${fileName}`]);
}

function fileCommit(fileName) {
  return git(['log', '-1', '--format=%H', '--', `data/${fileName}`]);
}

function primaryKeyFor(fileName, row) {
  const def = TABLE_DEFS[fileName] || { keyFields: [] };
  return def.keyFields.map((field) => row[field]).join('|');
}

function standardIdFor(fileName, row) {
  const base = fileName.replace(/\.json$/i, '');
  const key = primaryKeyFor(fileName, row) || JSON.stringify(row).slice(0, 80);
  return `${normalizePart(base)}-${normalizePart(key)}`;
}

function sortSourceRows(a, b) {
  const byDate = String(b.sourceUpdatedAt).localeCompare(String(a.sourceUpdatedAt));
  if (byDate) return byDate;
  return (SOURCE_PRIORITY[b.sourceFile] || 0) - (SOURCE_PRIORITY[a.sourceFile] || 0);
}

function dedupeRows(rows, keyFn) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    groups.set(key, [...(groups.get(key) || []), row]);
  }

  return [...groups.entries()].map(([key, groupRows]) => {
    const sorted = [...groupRows].sort(sortSourceRows);
    return {
      ...sorted[0],
      duplicateKey: key,
      duplicateSourceFiles: sorted.map((row) => row.sourceFile).join('|'),
      duplicateCount: sorted.length
    };
  });
}

function csvEscape(value) {
  const text = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function writeCsv(rows, filePath, headers = null) {
  const finalHeaders = headers || [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const lines = [
    finalHeaders.join(','),
    ...rows.map((row) => finalHeaders.map((header) => csvEscape(row[header])).join(','))
  ];
  await writeFile(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function markdownTable(rows, headers) {
  const line = (cells) => `| ${cells.map((cell) => String(cell ?? '').replace(/\r?\n/g, '<br>')).join(' | ')} |`;
  return [
    line(headers),
    line(headers.map(() => '---')),
    ...rows.map((row) => line(row))
  ].join('\n');
}

function skillSlotFromGroup(group) {
  return HERO_SLOT_LABELS.get(Number(group) % 1000) || '';
}

function skillText(group, dakSkillById, zh) {
  const dakSkill = dakSkillById.get(group.group);
  if (dakSkill) {
    return {
      skillName: cleanText(dakSkill.name),
      description: cleanText(dakSkill.tooltip),
      textSource: 'dak.gg api zh-CN'
    };
  }

  return {
    skillName: cleanText(zh[`Skill/Group/Name/${group.group}`] || group.name),
    description: cleanText(zh[`Skill/Group/Desc/${group.group}`] || zh[`Skill/LobbyDesc/${group.group}`] || ''),
    textSource: 'er-gamedata zh-CN fallback'
  };
}

function characterCodeFromGroup(group) {
  return Math.floor((Number(group) - 1000000) / 1000);
}

function levelSummary(rows) {
  const levels = rows
    .map((row) => Number(row.level))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (!levels.length) return '';
  return [...new Set(levels)].join('|');
}

async function main() {
  const skillFiles = (await readdir(dataDir))
    .filter((fileName) => /Skill.*\.json$/i.test(fileName))
    .sort();

  const [characters, skillGroupRows, skillRows, skillIndicatorRows, skillExtensions, zh, en] = await Promise.all([
    readJson('data/Character.json'),
    readJson('data/SkillGroup.json'),
    readJson('data/Skill.json'),
    readJson('data/Skill_Indicator.json'),
    readJson('data/SkillExtension.json'),
    loadL10n('ChineseSimplified'),
    loadL10n('English')
  ]);
  const dakSkillsPayload = await fetchDakJson('skills');
  const dakSkillById = new Map((dakSkillsPayload?.skills || []).map((skill) => [skill.id, skill]));

  const characterByCode = new Map(
    characters
      .filter((character) => character.code > 0 && character.name && character.name !== 'None')
      .map((character) => [character.code, {
        code: character.code,
        key: character.name,
        name: zh[`Character/Name/${character.code}`] || character.name,
        englishName: en[`Character/Name/${character.code}`] || character.name
      }])
  );

  const tableInventory = [];
  const allRows = [];
  const fileMeta = {};

  for (const fileName of skillFiles) {
    const rows = await readJson(`data/${fileName}`);
    const sourceUpdatedAt = fileUpdatedAt(fileName);
    const sourceCommit = fileCommit(fileName);
    const def = TABLE_DEFS[fileName] || { role: 'skill-related table', keyFields: [] };
    fileMeta[fileName] = { sourceUpdatedAt, sourceCommit, ...def };

    tableInventory.push({
      file: fileName,
      role: def.role,
      rows: rows.length,
      keyFields: def.keyFields.join('|'),
      sourceUpdatedAt,
      sourceCommit,
      githubUrl: `${repoUrl}/${fileName}`
    });

    for (const row of rows) {
      allRows.push({
        standardId: standardIdFor(fileName, row),
        sourceFile: fileName,
        sourceUpdatedAt,
        sourceCommit,
        primaryKey: primaryKeyFor(fileName, row),
        data: row
      });
    }
  }

  const skillLevelCandidates = [
    ...skillRows.map((row) => ({ ...row, sourceFile: 'Skill.json', sourceUpdatedAt: fileMeta['Skill.json'].sourceUpdatedAt })),
    ...skillIndicatorRows.map((row) => ({ ...row, sourceFile: 'Skill_Indicator.json', sourceUpdatedAt: fileMeta['Skill_Indicator.json'].sourceUpdatedAt }))
  ];
  const preferredSkillLevels = dedupeRows(skillLevelCandidates, (row) => String(row.code));

  const levelsByGroup = preferredSkillLevels.reduce((groups, row) => {
    groups.set(row.group, [...(groups.get(row.group) || []), row]);
    return groups;
  }, new Map());

  const extensionsByName = new Map(skillExtensions.map((extension) => [extension.name.replace(/Data$/, ''), extension]));

  const normalizedSkillGroups = skillGroupRows.map((group) => {
    const characterCode = characterCodeFromGroup(group.group);
    const character = characterByCode.get(characterCode);
    const slot = skillSlotFromGroup(group.group);
    const levelRows = levelsByGroup.get(group.group) || [];
    const extension =
      extensionsByName.get(group.skillId) ||
      extensionsByName.get(group.passiveSkillId) ||
      (character ? extensionsByName.get(`${character.key}Skill`) : null);
    const standardId = [
      character ? String(character.code).padStart(3, '0') : 'nonhero',
      normalizePart(character?.key || 'system'),
      normalizePart(slot || group.skillType),
      group.group
    ].join('-');
    const text = skillText(group, dakSkillById, zh);

    return {
      standardId,
      group: group.group,
      heroCode: character?.code || '',
      heroKey: character?.key || '',
      heroName: character?.name || '',
      heroEnglishName: character?.englishName || '',
      slot,
      skillId: group.skillId,
      passiveSkillId: group.passiveSkillId,
      skillName: text.skillName,
      skillType: group.skillType,
      icon: group.icon,
      maxLevel: levelRows.length ? Math.max(...levelRows.map((row) => Number(row.level)).filter(Number.isFinite)) : '',
      levels: levelSummary(levelRows),
      levelCodes: levelRows.map((row) => row.code).join('|'),
      hasIndicatorTable: levelRows.some((row) => row.duplicateSourceFiles?.includes('Skill_Indicator.json')),
      extensionName: extension?.name || '',
      hasExtension: Boolean(extension),
      coefficientText: cleanText(zh[`Skill/Group/Coef/${group.group}`] || ''),
      description: text.description,
      textSource: text.textSource,
      sourceFiles: [
        'SkillGroup.json',
        levelRows.length ? [...new Set(levelRows.flatMap((row) => row.duplicateSourceFiles.split('|')))].join('|') : '',
        extension ? 'SkillExtension.json' : ''
      ].filter(Boolean).join('|'),
      sourceUpdatedAt: fileMeta['SkillGroup.json'].sourceUpdatedAt
    };
  }).sort((a, b) => Number(a.group) - Number(b.group));

  const normalizedSkillLevels = preferredSkillLevels
    .map((row) => {
      const group = skillGroupRows.find((next) => next.group === row.group);
      const characterCode = characterCodeFromGroup(row.group);
      const character = characterByCode.get(characterCode);
      const slot = skillSlotFromGroup(row.group);
      return {
        standardId: [
          character ? String(character.code).padStart(3, '0') : 'nonhero',
          normalizePart(character?.key || 'system'),
          normalizePart(slot || group?.skillType || 'skill'),
          row.group,
          row.level,
          row.code
        ].join('-'),
        code: row.code,
        group: row.group,
        heroCode: character?.code || '',
        heroKey: character?.key || '',
        heroName: character?.name || '',
        slot,
        skillName: group ? skillText(group, dakSkillById, zh).skillName : '',
        level: row.level,
        activeLevel: row.activeLevel,
        cooldown: row.cooldown,
        cost: row.cost,
        exCost: row.exCost,
        range: row.range,
        length: row.length,
        width: row.width,
        angle: row.angle,
        overrideIconName: row.overrideIconName,
        sourceFile: row.sourceFile,
        sourceUpdatedAt: row.sourceUpdatedAt,
        duplicateSourceFiles: row.duplicateSourceFiles,
        duplicateCount: row.duplicateCount
      };
    })
    .sort((a, b) => Number(a.group) - Number(b.group) || Number(a.level) - Number(b.level) || Number(a.code) - Number(b.code));

  const normalizedExtensions = skillExtensions.map((extension) => {
    let parsed = {};
    try {
      parsed = JSON.parse(extension.data);
    } catch {}
    const extensionBase = extension.name.replace(/Data$/, '');
    const groups = skillGroupRows.filter((group) => (
      group.skillId === extensionBase ||
      group.passiveSkillId === extensionBase ||
      `${characterByCode.get(characterCodeFromGroup(group.group))?.key || ''}Skill` === extensionBase
    ));

    return {
      standardId: `skill-extension-${extension.key}-${normalizePart(extension.name)}`,
      key: extension.key,
      name: extension.name,
      normalizedName: extensionBase,
      linkedGroups: groups.map((group) => group.group).join('|'),
      linkedSkills: groups.map((group) => group.skillId).join('|'),
      fields: Object.keys(parsed).sort().join('|'),
      damageFields: Object.keys(parsed).filter((key) => /damage/i.test(key)).sort().join('|'),
      sourceFile: 'SkillExtension.json',
      sourceUpdatedAt: fileMeta['SkillExtension.json'].sourceUpdatedAt,
      data: parsed
    };
  });

  const payload = {
    source: repoUrl,
    textSource: {
      preferred: `${dakApiBase}/skills?hl=zh-CN`,
      fallback: 'er-gamedata l10n/ChineseSimplified.txt'
    },
    generatedAt,
    duplicatePolicy: 'Rows with the same normalized key are resolved by source file git commit date, newest first. If dates tie, deterministic source priority is used.',
    counts: {
      skillRelatedFiles: tableInventory.length,
      rawRows: allRows.length,
      normalizedSkillGroups: normalizedSkillGroups.length,
      normalizedSkillLevels: normalizedSkillLevels.length,
      normalizedExtensions: normalizedExtensions.length
    },
    tableInventory,
    normalizedSkillGroups,
    normalizedSkillLevels,
    normalizedExtensions
  };

  await Promise.all([
    mkdir(outDir, { recursive: true }),
    mkdir(srcDataDir, { recursive: true })
  ]);

  await writeFile(path.join(outDir, 'er-skill-tables.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeFile(path.join(srcDataDir, 'erSkillTables.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeCsv(tableInventory, path.join(outDir, 'er-skill-table-inventory.csv'));
  await writeCsv(normalizedSkillGroups, path.join(outDir, 'er-skill-groups-normalized.csv'));
  await writeCsv(normalizedSkillLevels, path.join(outDir, 'er-skill-levels-normalized.csv'));
  await writeCsv(normalizedExtensions, path.join(outDir, 'er-skill-extensions-normalized.csv'), [
    'standardId',
    'key',
    'name',
    'normalizedName',
    'linkedGroups',
    'linkedSkills',
    'fields',
    'damageFields',
    'sourceFile',
    'sourceUpdatedAt'
  ]);

  const duplicateLevelRows = normalizedSkillLevels
    .filter((row) => row.duplicateCount > 1)
    .slice(0, 40)
    .map((row) => [row.code, row.group, row.level, row.sourceFile, row.duplicateSourceFiles, row.sourceUpdatedAt]);

  const doc = `# ER Skill 表整理

来源：${repoUrl}

生成时间：${generatedAt}

英雄技能名称和描述优先使用 DAK.GG 当前中文接口 \`${dakApiBase}/skills?hl=zh-CN\`；DAK.GG 未覆盖的技能变体再回退到仓库中文本地化。Skill 表结构、等级、冷却、范围等数值仍来自本仓库。

## 去重规则

如果同一个标准键在多份 Skill 文档中重复出现，优先使用 git 最后更新时间最新的来源文件。若更新时间相同，则使用固定优先级保证输出稳定：\`Skill.json\` 优先于 \`Skill_Indicator.json\`。当前本地仓库所有 \`*Skill*.json\` 文件最后更新时间均为 \`${tableInventory[0]?.sourceUpdatedAt || ''}\`。

## 输出文件

- Skill 表清单：\`docs/skill-tables/er-skill-table-inventory.csv\`
- 标准化技能组：\`docs/skill-tables/er-skill-groups-normalized.csv\`
- 标准化技能等级：\`docs/skill-tables/er-skill-levels-normalized.csv\`
- 标准化 SkillExtension：\`docs/skill-tables/er-skill-extensions-normalized.csv\`
- 完整 JSON：\`docs/skill-tables/er-skill-tables.json\`
- 前端副本：\`src/data/erSkillTables.json\`

## 标准命名

- 技能组：\`{heroCode}-{heroKey}-{slotOrType}-{skillGroup}\`
- 技能等级：\`{heroCode}-{heroKey}-{slotOrType}-{skillGroup}-{level}-{skillCode}\`
- SkillExtension：\`skill-extension-{key}-{extensionName}\`

## Skill 相关表清单

${markdownTable(tableInventory.map((row) => [
  row.file,
  row.role,
  row.rows,
  row.keyFields,
  row.sourceUpdatedAt,
  row.sourceCommit.slice(0, 7)
]), ['文件', '用途', '行数', '主键字段', '最后更新时间', '提交'])}

## 标准化技能组预览

${markdownTable(normalizedSkillGroups.slice(0, 80).map((row) => [
  row.standardId,
  row.heroName || '-',
  row.slot || row.skillType,
  row.skillName,
  row.group,
  row.levels,
  row.levelCodes,
  row.extensionName,
  row.sourceFiles
]), ['standardId', '英雄', '槽位', '技能名', 'group', 'levels', 'levelCodes', 'extension', '来源表'])}

## 重复键处理预览

${duplicateLevelRows.length ? markdownTable(duplicateLevelRows, ['code', 'group', 'level', '采用来源', '候选来源', '来源更新时间']) : '未发现重复标准键。'}
`;

  await writeFile(path.join(outDir, 'README.md'), doc, 'utf8');

  console.log(JSON.stringify(payload.counts, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
