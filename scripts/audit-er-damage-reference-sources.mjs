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
const outDir = path.join(rootDir, 'docs', 'damage-reference-source-audit');
const generatedAt = new Date().toISOString();

const referenceExtensions = [
  'AyaActive1Data',
  'FioraActive1Data',
  'JackieActive1Data',
  'HyunwooActive1Data',
  'YukiActive3Data',
  'NadineActive2Data'
];
const targetGroups = [1079200, 1047200];
const damageNameRe = /damage|coef|apcoef|attackdamage|skilldamage|basedamage|mindamage|maxdamage/i;

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(cacheDir, relativePath), 'utf8'));
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

async function gitCommitInfo(relativePath) {
  try {
    const { stdout } = await execFileAsync('git', [
      '-C',
      cacheDir,
      'log',
      '-1',
      '--format=%cI %H',
      '--',
      `data/${relativePath.replace(/\\/g, '/')}`
    ]);
    const [date, hash] = stdout.trim().split(/\s+/);
    return { date: date || '', hash: hash || '' };
  } catch {
    return { date: '', hash: '' };
  }
}

async function orderedSources() {
  const files = await listJsonFiles(dataDir);
  const rows = await Promise.all(files.map(async (filePath) => {
    const relativePath = path.relative(dataDir, filePath).replace(/\\/g, '/');
    const commit = await gitCommitInfo(relativePath);
    return {
      filePath,
      relativePath,
      fileName: path.basename(filePath),
      commitDate: commit.date,
      commitHash: commit.hash,
      isSkillExtension: path.basename(filePath) === 'SkillExtension.json'
    };
  }));

  return rows.sort((a, b) => {
    if (a.isSkillExtension !== b.isSkillExtension) return a.isSkillExtension ? 1 : -1;
    const dateCompare = String(b.commitDate).localeCompare(String(a.commitDate));
    if (dateCompare) return dateCompare;
    return a.relativePath.localeCompare(b.relativePath);
  });
}

function flatten(value, prefix = '') {
  if (value === null || value === undefined) return [];
  if (typeof value !== 'object') return [{ key: prefix, value }];
  if (Array.isArray(value)) return value.flatMap((item, index) => flatten(item, `${prefix}[${index}]`));
  return Object.entries(value).flatMap(([key, next]) => flatten(next, prefix ? `${prefix}.${key}` : key));
}

function numericLeaves(value) {
  return flatten(value)
    .filter(({ value: leaf }) => typeof leaf === 'number' && Number.isFinite(leaf))
    .map(({ key, value: leaf }) => ({ key, value: leaf }));
}

function groupedNumericFields(data) {
  const fields = [];
  for (const [key, value] of Object.entries(data)) {
    const leaves = numericLeaves(value);
    if (!leaves.length || !damageNameRe.test(key)) continue;
    fields.push({
      key,
      values: leaves.map((leaf) => leaf.value),
      uniqueValues: Array.from(new Set(leaves.map((leaf) => leaf.value)))
    });
  }
  return fields;
}

function linkedSkillGroup(extensionName, skillGroups) {
  const baseName = extensionName.replace(/Data$/, '');
  return skillGroups.find((group) => group.skillId === baseName || group.passiveSkillId === baseName);
}

function relatedIds(group, skillRows, skillIndicators) {
  if (!group) return [];
  return Array.from(new Set([
    group.group,
    group.skillId,
    group.passiveSkillId,
    group.toolTipReferSkillGroupCode,
    ...skillRows.filter((skill) => skill.group === group.group).map((skill) => skill.code),
    ...skillIndicators.filter((skill) => skill.group === group.group).map((skill) => skill.code)
  ].filter((value) => value && value !== 'None')));
}

function rowHasAnyId(rowText, ids) {
  return ids.some((id) => rowText.includes(String(id)));
}

function containsSequence(numbers, sequence) {
  const wanted = sequence.filter((value) => value !== 0);
  if (wanted.length < 2) return false;
  const haystack = new Set(numbers);
  return wanted.every((value) => haystack.has(value));
}

async function readRows(source) {
  const rows = JSON.parse(await readFile(source.filePath, 'utf8'));
  return Array.isArray(rows) ? rows : [];
}

async function referenceAudit(context) {
  const { skillGroups, skillRows, skillIndicators, skillExtensions, sources } = context;
  const reports = [];

  for (const extensionName of referenceExtensions) {
    const extension = skillExtensions.find((row) => row.name === extensionName);
    if (!extension) {
      reports.push({ extensionName, found: false });
      continue;
    }

    const data = JSON.parse(extension.data || '{}');
    const group = linkedSkillGroup(extensionName, skillGroups);
    const ids = relatedIds(group, skillRows, skillIndicators);
    const signatures = groupedNumericFields(data).filter((field) => field.uniqueValues.length >= 2);
    const matches = [];
    const globalSequenceMatches = [];

    for (const source of sources) {
      if (source.isSkillExtension) continue;
      const rows = await readRows(source);
      let relatedRows = 0;
      const sequenceHits = [];
      const damageNamedRows = [];

      for (const row of rows) {
        const rowText = JSON.stringify(row);
        const nums = numericLeaves(row).map((leaf) => leaf.value);
        const related = rowHasAnyId(rowText, ids);
        if (related) relatedRows += 1;

        const rowSequenceHits = signatures.filter((signature) => containsSequence(nums, signature.uniqueValues));
        if (rowSequenceHits.length) {
          globalSequenceMatches.push({
            file: source.relativePath,
            rowKey: row.code ?? row.group ?? row.key ?? row.name ?? '',
            signatures: rowSequenceHits.map((signature) => signature.key)
          });
          if (related) {
            sequenceHits.push({
              rowKey: row.code ?? row.group ?? row.key ?? row.name ?? '',
              signatures: rowSequenceHits.map((signature) => signature.key)
            });
          }
        }

        if (related && flatten(row).some((leaf) => damageNameRe.test(leaf.key))) {
          damageNamedRows.push(row.code ?? row.group ?? row.key ?? row.name ?? '');
        }
      }

      if (relatedRows || sequenceHits.length || damageNamedRows.length) {
        matches.push({
          file: source.relativePath,
          commitDate: source.commitDate,
          relatedRows,
          relatedSequenceHits: sequenceHits.slice(0, 10),
          relatedDamageNamedRows: Array.from(new Set(damageNamedRows)).slice(0, 10)
        });
      }
    }

    reports.push({
      extensionName,
      found: true,
      group: group?.group || '',
      skillId: group?.skillId || '',
      signatures,
      orderedMatches: matches.slice(0, 40),
      globalSequenceMatches: globalSequenceMatches.slice(0, 20)
    });
  }

  return reports;
}

async function targetAudit(context) {
  const { skillGroups, skillRows, skillIndicators, sources } = context;
  const reports = [];

  for (const groupCode of targetGroups) {
    const group = skillGroups.find((row) => row.group === groupCode);
    const ids = relatedIds(group, skillRows, skillIndicators);
    const exactValues = groupCode === 1079200 ? [50, 70, 0.4, 0.7, 40] : [];
    const rows = [];

    for (const source of sources) {
      if (source.isSkillExtension) continue;
      const dataRows = await readRows(source);
      let relatedRows = 0;
      const valueHits = [];
      const damageNamedRows = [];

      for (const row of dataRows) {
        const rowText = JSON.stringify(row);
        if (!rowHasAnyId(rowText, ids)) continue;
        relatedRows += 1;
        const nums = numericLeaves(row);
        const hits = nums.filter((field) => exactValues.includes(field.value));
        if (hits.length) {
          valueHits.push({
            rowKey: row.code ?? row.group ?? row.key ?? row.name ?? '',
            hits
          });
        }
        if (flatten(row).some((leaf) => damageNameRe.test(leaf.key))) {
          damageNamedRows.push(row.code ?? row.group ?? row.key ?? row.name ?? '');
        }
      }

      if (relatedRows || valueHits.length || damageNamedRows.length) {
        rows.push({
          file: source.relativePath,
          commitDate: source.commitDate,
          relatedRows,
          exactValueHits: valueHits.slice(0, 12),
          relatedDamageNamedRows: Array.from(new Set(damageNamedRows)).slice(0, 12)
        });
      }
    }

    reports.push({
      group: groupCode,
      skillId: group?.skillId || '',
      checkedExactValues: exactValues,
      orderedMatches: rows.slice(0, 60)
    });
  }

  return reports;
}

function table(rows, headers) {
  const safe = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
  const line = (cells) => `| ${cells.map(safe).join(' | ')} |`;
  return [line(headers), line(headers.map(() => '---')), ...rows.map(line)].join('\n');
}

function buildDoc(payload) {
  const sourceRows = payload.sourceOrder.slice(0, 20).map((source) => [
    source.file,
    source.commitDate,
    source.isSkillExtension ? 'yes' : 'no'
  ]);

  const referenceRows = payload.references.map((ref) => [
    ref.extensionName,
    ref.group || '-',
    ref.skillId || '-',
    ref.signatures?.map((signature) => `${signature.key}=[${signature.uniqueValues.join(',')}]`).join('<br>') || '-',
    ref.orderedMatches?.filter((match) => match.relatedSequenceHits.length).map((match) => match.file).join('<br>') || 'none',
    ref.globalSequenceMatches?.map((match) => `${match.file}:${match.rowKey}`).join('<br>') || 'none'
  ]);

  const targetRows = payload.targets.flatMap((target) => target.orderedMatches.map((match) => [
    target.group,
    target.skillId,
    match.file,
    match.commitDate,
    match.relatedRows,
    match.exactValueHits.map((hit) => `${hit.rowKey}: ${hit.hits.map((field) => `${field.key}=${field.value}`).join(', ')}`).join('<br>') || '-',
    match.relatedDamageNamedRows.join('|') || '-'
  ]));

  return `# Damage Reference Source Audit

Generated at: ${payload.generatedAt}

This audit starts with the newest git-updated JSON files. SkillExtension.json is kept last as a historical reference. Known old-character damage signatures are extracted from SkillExtension, then searched in every other JSON file to see whether another current table carries the same damage parameters under different field names.

## Source Order

${table(sourceRows, ['file', 'latest git commit date', 'SkillExtension'])}

## Reference Characters

${table(referenceRows, ['reference extension', 'group', 'skillId', 'known damage signatures', 'related sequence hits outside SkillExtension', 'global sequence hits outside SkillExtension'])}

## Target Groups

${table(targetRows, ['group', 'skillId', 'file', 'latest git commit date', 'related rows', 'exact value hits', 'damage-like field rows'])}
`;
}

async function main() {
  const [skillGroups, skillRows, skillIndicators, skillExtensions, sources] = await Promise.all([
    readJson('data/SkillGroup.json'),
    readJson('data/Skill.json'),
    readJson('data/Skill_Indicator.json'),
    readJson('data/SkillExtension.json'),
    orderedSources()
  ]);

  const context = { skillGroups, skillRows, skillIndicators, skillExtensions, sources };
  const payload = {
    generatedAt,
    sourceOrder: sources.map((source) => ({
      file: source.relativePath,
      commitDate: source.commitDate,
      commitHash: source.commitHash,
      isSkillExtension: source.isSkillExtension
    })),
    references: await referenceAudit(context),
    targets: await targetAudit(context)
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'damage-reference-source-audit.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'README.md'), buildDoc(payload), 'utf8');

  console.log(JSON.stringify({
    sourceOrderHead: payload.sourceOrder.slice(0, 8),
    references: payload.references.map((ref) => ({
      extensionName: ref.extensionName,
      group: ref.group,
      relatedSequenceHitFiles: ref.orderedMatches.filter((match) => match.relatedSequenceHits.length).map((match) => match.file),
      globalSequenceHits: ref.globalSequenceMatches.length
    })),
    targets: payload.targets.map((target) => ({
      group: target.group,
      skillId: target.skillId,
      exactValueHitFiles: target.orderedMatches.filter((match) => match.exactValueHits.length).map((match) => match.file),
      damageLikeFiles: target.orderedMatches.filter((match) => match.relatedDamageNamedRows.length).map((match) => match.file)
    }))
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
