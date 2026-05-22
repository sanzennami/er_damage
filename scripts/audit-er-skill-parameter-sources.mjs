import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const cacheDir = path.join(rootDir, '.er-gamedata-cache');
const dataDir = path.join(cacheDir, 'data');
const outDir = path.join(rootDir, 'docs', 'skill-parameter-source-audit');
const generatedAt = new Date().toISOString();

const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['Laura', 'Justyna'];
const ignoredFiles = new Set(['SkillExtension.json']);
const damageKeyRe = /damage|coef|amp|attack|atk|power/i;
const splitMark = '┃';

function cleanText(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(cacheDir, relativePath), 'utf8'));
}

async function loadL10n(language) {
  const text = await readFile(path.join(cacheDir, 'l10n', `${language}.txt`), 'utf8');
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.split(splitMark))
      .filter((parts) => parts.length >= 2)
      .map(([key, ...value]) => [key, value.join(splitMark)])
  );
}

async function listJsonFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listJsonFiles(fullPath));
    else if (entry.name.endsWith('.json') && !ignoredFiles.has(entry.name)) files.push(fullPath);
  }
  return files;
}

function flatten(value, prefix = '') {
  if (value === null || value === undefined) return [];
  if (typeof value !== 'object') return [{ key: prefix, value }];
  if (Array.isArray(value)) return value.flatMap((item, index) => flatten(item, `${prefix}[${index}]`));
  return Object.entries(value).flatMap(([key, next]) => flatten(next, prefix ? `${prefix}.${key}` : key));
}

function numericFields(row) {
  return flatten(row)
    .filter(({ value }) => typeof value === 'number' && Number.isFinite(value))
    .map(({ key, value }) => ({ key, value, damageLike: damageKeyRe.test(key) }));
}

function placeholders(text) {
  return Array.from(new Set(String(text || '').match(/\{\d+\}/g) || []))
    .map((token) => Number(token.slice(1, -1)))
    .sort((a, b) => a - b);
}

function findCharacter(target, characters, zh, en) {
  const wanted = String(target).toLowerCase();
  return characters.find((character) => {
    const names = [
      character.code,
      character.name,
      character.resource,
      zh[`Character/Name/${character.code}`],
      en[`Character/Name/${character.code}`]
    ];
    return names.some((name) => String(name || '').toLowerCase() === wanted);
  });
}

function relatedById(rowText, ids) {
  return ids.some((id) => rowText.includes(String(id)));
}

function markdownTable(rows, headers) {
  const safe = (cell) => String(cell ?? '').replace(/\r?\n/g, '<br>').replace(/\|/g, '\\|');
  const line = (cells) => `| ${cells.map(safe).join(' | ')} |`;
  return [line(headers), line(headers.map(() => '---')), ...rows.map(line)].join('\n');
}

async function auditTarget(target, context) {
  const { characters, zh, en, skillGroups, skillRows, skillIndicators, jsonFiles } = context;
  const character = findCharacter(target, characters, zh, en);
  if (!character) return { target, found: false };

  const groups = skillGroups
    .filter((group) => Math.floor((Number(group.group) - 1000000) / 1000) === Number(character.code))
    .sort((a, b) => Number(a.group) - Number(b.group));

  const groupReports = [];
  for (const group of groups) {
    const skillCodes = skillRows.filter((skill) => skill.group === group.group).map((skill) => skill.code);
    const indicatorCodes = skillIndicators.filter((skill) => skill.group === group.group).map((skill) => skill.code);
    const ids = Array.from(new Set([
      group.group,
      group.skillId,
      group.passiveSkillId,
      group.toolTipReferSkillGroupCode,
      ...skillCodes,
      ...indicatorCodes
    ].filter((value) => value && value !== 'None')));

    const coefText = cleanText(zh[`Skill/Group/Coef/${group.group}`] || '');
    const descText = cleanText(zh[`Skill/Group/Desc/${group.group}`] || '');
    const placeholderIndexes = placeholders(coefText || descText);
    const candidates = [];

    for (const filePath of jsonFiles) {
      const relativePath = path.relative(dataDir, filePath).replace(/\\/g, '/');
      const rows = JSON.parse(await readFile(filePath, 'utf8'));
      if (!Array.isArray(rows)) continue;

      for (const row of rows) {
        const rowText = JSON.stringify(row);
        if (!relatedById(rowText, ids)) continue;
        const numbers = numericFields(row);
        const damageNumbers = numbers.filter((field) => field.damageLike);
        if (!numbers.length) continue;
        candidates.push({
          file: relativePath,
          rowKey: row.code ?? row.group ?? row.key ?? row.name ?? '',
          numericFields: numbers,
          damageLikeFields: damageNumbers
        });
      }
    }

    groupReports.push({
      group: group.group,
      skillId: group.skillId,
      passiveSkillId: group.passiveSkillId,
      skillCodes,
      indicatorCodes,
      coefText,
      placeholderIndexes,
      expectedParameterCount: placeholderIndexes.length ? Math.max(...placeholderIndexes) + 1 : 0,
      candidateRows: candidates.length,
      damageLikeCandidateRows: candidates.filter((candidate) => candidate.damageLikeFields.length).length,
      candidates: candidates.slice(0, 80)
    });
  }

  return {
    target,
    found: true,
    character: {
      code: character.code,
      key: character.name,
      resource: character.resource,
      zhName: zh[`Character/Name/${character.code}`] || '',
      enName: en[`Character/Name/${character.code}`] || ''
    },
    ignoredFiles: Array.from(ignoredFiles),
    groups: groupReports
  };
}

function buildDoc(results) {
  const summary = [];
  const sections = [];

  for (const result of results) {
    if (!result.found) {
      summary.push([result.target, 'not found', '-', '-', '-']);
      sections.push(`## ${result.target}\n\n未找到实验体。`);
      continue;
    }

    const groupsWithPlaceholders = result.groups.filter((group) => group.expectedParameterCount > 0).length;
    const groupsWithDamageCandidates = result.groups.filter((group) => group.damageLikeCandidateRows > 0).length;
    summary.push([
      result.target,
      `${result.character.zhName || result.character.key} (${result.character.key}, ${result.character.code})`,
      result.groups.length,
      groupsWithPlaceholders,
      groupsWithDamageCandidates
    ]);

    const groupRows = result.groups.map((group) => [
      group.group,
      group.skillId,
      group.skillCodes.join('|'),
      group.expectedParameterCount,
      group.candidateRows,
      group.damageLikeCandidateRows,
      group.coefText
    ]);

    const candidateRows = result.groups.flatMap((group) => group.candidates
      .filter((candidate) => candidate.damageLikeFields.length || candidate.file === 'CharacterState.json' || candidate.file === 'Skill.json')
      .slice(0, 12)
      .map((candidate) => [
        group.group,
        candidate.file,
        candidate.rowKey,
        candidate.numericFields.slice(0, 16).map((field) => `${field.key}=${field.value}`).join('; '),
        candidate.damageLikeFields.slice(0, 16).map((field) => `${field.key}=${field.value}`).join('; ') || '-'
      ]));

    sections.push(`## ${result.character.zhName || result.character.key} (${result.character.key})

忽略废弃参考表：${result.ignoredFiles.join(', ')}

### 技能组参数缺口

${markdownTable(groupRows, ['group', 'skillId', 'Skill codes', '占位符参数数', '候选行数', '疑似伤害候选行数', 'Coef 文本'])}

### 非 SkillExtension 候选数据

${markdownTable(candidateRows, ['group', '文件', 'rowKey', '数值字段样例', '疑似伤害/系数字段'])}
`);
  }

  return `# 技能参数来源审计

生成时间：${generatedAt}

这个报告会忽略 \`SkillExtension.json\`，只从仓库其他 JSON 表里寻找能填充 \`Skill/Group/Coef/*\` 占位符的候选数据。它的用途是确认新实验体的伤害参数是否藏在其他表中。

## 总览

${markdownTable(summary, ['目标', '实验体', '技能组数', '有占位符技能组数', '有疑似伤害候选的技能组数'])}

${sections.join('\n\n')}
`;
}

async function main() {
  const [characters, skillGroups, skillRows, skillIndicators, zh, en, jsonFiles] = await Promise.all([
    readJson('data/Character.json'),
    readJson('data/SkillGroup.json'),
    readJson('data/Skill.json'),
    readJson('data/Skill_Indicator.json'),
    loadL10n('ChineseSimplified'),
    loadL10n('English'),
    listJsonFiles(dataDir)
  ]);

  const context = { characters, skillGroups, skillRows, skillIndicators, zh, en, jsonFiles };
  const results = [];
  for (const target of targets) results.push(await auditTarget(target, context));

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'skill-parameter-source-audit.json'), `${JSON.stringify({ generatedAt, targets, results }, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'README.md'), buildDoc(results), 'utf8');

  console.log(JSON.stringify(results.map((result) => ({
    target: result.target,
    character: result.character,
    ignoredFiles: result.ignoredFiles,
    groups: result.groups?.length || 0,
    groupsWithPlaceholders: result.groups?.filter((group) => group.expectedParameterCount > 0).length || 0,
    groupsWithDamageCandidates: result.groups?.filter((group) => group.damageLikeCandidateRows > 0).length || 0
  })), null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
