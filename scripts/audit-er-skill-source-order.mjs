import { execFile } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const cacheDir = path.join(rootDir, '.er-gamedata-cache');
const dataDir = path.join(cacheDir, 'data');
const outDir = path.join(rootDir, 'docs', 'skill-source-order-audit');
const generatedAt = new Date().toISOString();

const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['Laura', 'Justyna'];
const primaryOrder = ['Skill.json', 'SkillGroup.json', 'Skill_Indicator.json'];
const deprioritizedFiles = new Set(['SkillExtension.json']);
const damageFieldRe = /damage|coef|amp|attack|atk|power/i;

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(cacheDir, relativePath), 'utf8'));
}

async function loadL10n(language) {
  const text = await readFile(path.join(cacheDir, 'l10n', `${language}.txt`), 'utf8');
  const rows = {};
  for (const line of text.split(/\r?\n/)) {
    const index = line.indexOf('┃');
    if (index === -1) continue;
    rows[line.slice(0, index)] = line.slice(index + 1);
  }
  return rows;
}

async function listJsonFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listJsonFiles(fullPath));
    else if (entry.name.endsWith('.json')) files.push(fullPath);
  }
  return files;
}

async function gitCommitInfo(relativeDataPath) {
  const relativeRepoPath = `data/${relativeDataPath.replace(/\\/g, '/')}`;
  try {
    const { stdout } = await execFileAsync('git', [
      '-C',
      cacheDir,
      'log',
      '-1',
      '--format=%cI %H',
      '--',
      relativeRepoPath
    ]);
    const [date, commit] = stdout.trim().split(/\s+/);
    return { date: date || '', commit: commit || '' };
  } catch {
    return { date: '', commit: '' };
  }
}

async function sourceFilesByPriority() {
  const files = await listJsonFiles(dataDir);
  const withInfo = await Promise.all(files.map(async (filePath) => {
    const relativePath = path.relative(dataDir, filePath).replace(/\\/g, '/');
    const fileName = path.basename(filePath);
    const primaryIndex = primaryOrder.indexOf(fileName);
    const commit = await gitCommitInfo(relativePath);
    return {
      filePath,
      relativePath,
      fileName,
      priority: primaryIndex === -1 ? 100 : primaryIndex,
      deprioritized: deprioritizedFiles.has(fileName),
      commitDate: commit.date,
      commitHash: commit.commit
    };
  }));

  return withInfo.sort((a, b) => {
    if (a.deprioritized !== b.deprioritized) return a.deprioritized ? 1 : -1;
    if (a.priority !== b.priority) return a.priority - b.priority;
    const dateCompare = String(b.commitDate).localeCompare(String(a.commitDate));
    if (dateCompare) return dateCompare;
    return a.relativePath.localeCompare(b.relativePath);
  });
}

function cleanText(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
    .map(({ key, value }) => ({ key, value, damageLike: damageFieldRe.test(key) }));
}

function placeholders(text) {
  return Array.from(new Set(String(text || '').match(/\{\d+\}/g) || []))
    .map((token) => Number(token.slice(1, -1)))
    .sort((a, b) => a - b);
}

function findCharacter(target, characters, zh, en) {
  const wanted = String(target).toLowerCase();
  return characters.find((character) => [
    character.code,
    character.name,
    character.resource,
    zh[`Character/Name/${character.code}`],
    en[`Character/Name/${character.code}`]
  ].some((name) => String(name || '').toLowerCase() === wanted));
}

function rowMatchesSkill(row, group, skillCodes, indicatorCodes) {
  if (Number(row.group) === Number(group.group)) return true;
  if (Number(row.code) && (skillCodes.includes(row.code) || indicatorCodes.includes(row.code))) return true;
  const text = JSON.stringify(row);
  return [
    group.group,
    group.toolTipReferSkillGroupCode,
    group.skillId,
    group.passiveSkillId,
    ...skillCodes,
    ...indicatorCodes
  ].filter((value) => value && value !== 'None').some((value) => text.includes(String(value)));
}

async function readRows(sourceFile) {
  const rows = JSON.parse(await readFile(sourceFile.filePath, 'utf8'));
  return Array.isArray(rows) ? rows : [];
}

async function auditTarget(target, context) {
  const { characters, zh, en, skillGroups, skillRows, skillIndicators, sourceFiles } = context;
  const character = findCharacter(target, characters, zh, en);
  if (!character) return { target, found: false };

  const groups = skillGroups
    .filter((group) => Math.floor((Number(group.group) - 1000000) / 1000) === Number(character.code))
    .sort((a, b) => Number(a.group) - Number(b.group));

  const reports = [];
  for (const group of groups) {
    const skillCodes = skillRows.filter((skill) => skill.group === group.group).map((skill) => skill.code);
    const indicatorCodes = skillIndicators.filter((skill) => skill.group === group.group).map((skill) => skill.code);
    const coefText = cleanText(zh[`Skill/Group/Coef/${group.group}`] || zh[`Skill/Group/Desc/${group.group}`] || '');
    const sources = [];

    for (const sourceFile of sourceFiles) {
      const rows = await readRows(sourceFile);
      const matchedRows = rows.filter((row) => rowMatchesSkill(row, group, skillCodes, indicatorCodes));
      if (!matchedRows.length) continue;
      const numeric = matchedRows.flatMap((row) => numericFields(row).map((field) => ({
        rowKey: row.code ?? row.group ?? row.key ?? row.name ?? '',
        ...field
      })));
      sources.push({
        file: sourceFile.relativePath,
        commitDate: sourceFile.commitDate,
        commitHash: sourceFile.commitHash,
        priority: sourceFile.priority,
        deprioritized: sourceFile.deprioritized,
        matchedRows: matchedRows.length,
        numericFields: numeric.slice(0, 60),
        damageLikeFields: numeric.filter((field) => field.damageLike).slice(0, 60)
      });
    }

    reports.push({
      group: group.group,
      skillId: group.skillId,
      passiveSkillId: group.passiveSkillId,
      skillCodes,
      indicatorCodes,
      coefText,
      placeholderIndexes: placeholders(coefText),
      primarySources: sources.filter((source) => primaryOrder.includes(path.basename(source.file))),
      otherSources: sources.filter((source) => !primaryOrder.includes(path.basename(source.file)) && !source.deprioritized).slice(0, 20),
      deprioritizedSources: sources.filter((source) => source.deprioritized).slice(0, 5)
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
    sourceOrder: sourceFiles.map((source) => ({
      file: source.relativePath,
      commitDate: source.commitDate,
      priority: source.priority,
      deprioritized: source.deprioritized
    })).slice(0, 40),
    groups: reports
  };
}

function table(rows, headers) {
  const safe = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
  const line = (cells) => `| ${cells.map(safe).join(' | ')} |`;
  return [line(headers), line(headers.map(() => '---')), ...rows.map(line)].join('\n');
}

function fieldSummary(fields) {
  return fields.slice(0, 16).map((field) => `${field.rowKey}:${field.key}=${field.value}`).join('; ') || '-';
}

function buildDoc(results) {
  const sections = results.map((result) => {
    if (!result.found) return `## ${result.target}\n\nNot found.`;
    const sourceRows = result.sourceOrder.slice(0, 12).map((source) => [
      source.file,
      source.commitDate,
      source.priority,
      source.deprioritized ? 'yes' : 'no'
    ]);
    const groupRows = result.groups.map((group) => [
      group.group,
      group.skillId,
      group.skillCodes.join('|'),
      group.placeholderIndexes.join('|'),
      group.primarySources.map((source) => `${source.file} rows=${source.matchedRows}`).join('<br>'),
      group.primarySources.map((source) => fieldSummary(source.numericFields)).join('<br>'),
      group.primarySources.map((source) => fieldSummary(source.damageLikeFields)).join('<br>') || '-',
      group.coefText
    ]);

    return `## ${result.character.zhName || result.character.key} (${result.character.key})

### Source Order

${table(sourceRows, ['file', 'latest git commit date', 'priority', 'deprioritized'])}

### Skill And SkillGroup First

${table(groupRows, ['group', 'skillId', 'Skill codes', 'placeholders', 'primary matches', 'primary numeric fields', 'primary damage-like fields', 'Coef text'])}
`;
  });

  return `# Skill Source Order Audit

Generated at: ${generatedAt}

Search order is: Skill.json, SkillGroup.json, Skill_Indicator.json, then all other JSON files by latest git commit date. SkillExtension.json is included only as a deprioritized historical reference.

${sections.join('\n\n')}
`;
}

async function main() {
  const [characters, skillGroups, skillRows, skillIndicators, zh, en, sourceFiles] = await Promise.all([
    readJson('data/Character.json'),
    readJson('data/SkillGroup.json'),
    readJson('data/Skill.json'),
    readJson('data/Skill_Indicator.json'),
    loadL10n('ChineseSimplified'),
    loadL10n('English'),
    sourceFilesByPriority()
  ]);

  const context = { characters, skillGroups, skillRows, skillIndicators, zh, en, sourceFiles };
  const results = [];
  for (const target of targets) results.push(await auditTarget(target, context));

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'skill-source-order-audit.json'), `${JSON.stringify({ generatedAt, targets, primaryOrder, deprioritizedFiles: Array.from(deprioritizedFiles), results }, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'README.md'), buildDoc(results), 'utf8');

  console.log(JSON.stringify(results.map((result) => ({
    target: result.target,
    character: result.character,
    groups: result.groups?.length || 0,
    firstSources: result.sourceOrder?.slice(0, 5),
    justynaQ: result.groups?.find((group) => group.group === 1079200)?.primarySources
  })), null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
