import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'docs', 'external-skill-damage');
const wikiPath = path.join(outDir, 'external-skill-damage-wiki-current.json');
const patchPath = path.join(outDir, 'external-skill-damage-official-patches.json');
const generatedAt = new Date().toISOString();

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function writeCsv(rows, filePath, headers = Object.keys(rows[0] || {})) {
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))
  ];
  await writeFile(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function toTime(value) {
  const time = Date.parse(value || '');
  return Number.isNaN(time) ? 0 : time;
}

function groupKey(row) {
  return [
    row.heroCode,
    row.heroKey,
    row.heroEnglishName,
    row.slot,
    row.skillGroup,
    row.skillId,
    row.wikiSkillName
  ].join('::');
}

function uniq(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function summarizeWikiRows(rows) {
  return {
    generatedAt,
    heroCode: rows[0].heroCode,
    heroKey: rows[0].heroKey,
    heroEnglishName: rows[0].heroEnglishName,
    heroName: rows[0].heroName,
    slot: rows[0].slot,
    skillGroup: rows[0].skillGroup,
    skillId: rows[0].skillId,
    wikiSkillName: rows[0].wikiSkillName,
    wikiDamageParts: uniq(rows.map((row) => `${row.damagePartLabel}: ${row.baseDamage || row.descriptionDamageText}`)).join(' | '),
    wikiScalingText: uniq(rows.map((row) => row.scalingText)).join(' | '),
    wikiDescriptionDamageText: uniq(rows.map((row) => row.descriptionDamageText)).join(' | '),
    wikiSourceUrl: rows[0].sourceUrl,
    wikiSourceDate: rows[0].sourceDate
  };
}

async function main() {
  const wikiData = JSON.parse(await readFile(wikiPath, 'utf8'));
  const patchData = JSON.parse(await readFile(patchPath, 'utf8'));

  const wikiGroups = new Map();
  for (const row of wikiData.rows) {
    const key = groupKey(row);
    if (!wikiGroups.has(key)) wikiGroups.set(key, []);
    wikiGroups.get(key).push(row);
  }

  const patchesByHeroSlot = new Map();
  for (const patch of patchData.rows) {
    if (!patch.slot) continue;
    const key = `${patch.heroCode}::${patch.heroKey}::${patch.slot}`;
    if (!patchesByHeroSlot.has(key)) patchesByHeroSlot.set(key, []);
    patchesByHeroSlot.get(key).push(patch);
  }

  const rows = [];
  for (const wikiRows of wikiGroups.values()) {
    const summary = summarizeWikiRows(wikiRows);
    const patchKey = `${summary.heroCode}::${summary.heroKey}::${summary.slot}`;
    const wikiTime = toTime(summary.wikiSourceDate);
    const newerPatches = (patchesByHeroSlot.get(patchKey) || [])
      .filter((patch) => toTime(patch.sourceDate) > wikiTime)
      .sort((a, b) => toTime(b.sourceDate) - toTime(a.sourceDate));

    rows.push({
      ...summary,
      candidateOfficialPatchCount: newerPatches.length,
      latestOfficialPatchDate: newerPatches[0]?.sourceDate || '',
      latestOfficialPatchTitle: newerPatches[0]?.sourceTitle || '',
      latestOfficialPatchUrl: newerPatches[0]?.sourceUrl || '',
      latestOfficialCurrentValueText: newerPatches[0]?.currentValueText || '',
      officialPatchCandidates: newerPatches
        .map((patch) => `[${patch.sourceDate}] ${patch.rawChangeText} <${patch.sourceUrl}>`)
        .join(' || '),
      recommendedUse: newerPatches.length
        ? 'Use wiki formula structure, then review newer official patch candidate(s) for numeric override.'
        : 'Use wiki current snapshot; no newer same-slot official patch candidate was found.'
    });
  }

  rows.sort((a, b) => Number(a.heroCode) - Number(b.heroCode) || String(a.slot).localeCompare(String(b.slot)) || Number(a.skillGroup) - Number(b.skillGroup));

  const headers = [
    'generatedAt', 'heroCode', 'heroKey', 'heroEnglishName', 'heroName', 'slot',
    'skillGroup', 'skillId', 'wikiSkillName', 'wikiDamageParts', 'wikiScalingText',
    'wikiDescriptionDamageText', 'wikiSourceUrl', 'wikiSourceDate',
    'candidateOfficialPatchCount', 'latestOfficialPatchDate', 'latestOfficialPatchTitle',
    'latestOfficialPatchUrl', 'latestOfficialCurrentValueText', 'officialPatchCandidates',
    'recommendedUse'
  ];

  await mkdir(outDir, { recursive: true });
  await writeCsv(rows, path.join(outDir, 'external-skill-damage-reconciliation.csv'), headers);
  await writeFile(path.join(outDir, 'external-skill-damage-reconciliation.json'), `${JSON.stringify({
    generatedAt,
    rows
  }, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    generatedAt,
    wikiSkillGroups: rows.length,
    groupsWithNewerOfficialPatchCandidates: rows.filter((row) => Number(row.candidateOfficialPatchCount) > 0).length
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
