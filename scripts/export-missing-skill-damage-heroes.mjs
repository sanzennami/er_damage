import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const coveragePath = path.join(rootDir, 'docs', 'skill-damage', 'er-skill-damage-coverage.csv');
const outDir = path.join(rootDir, 'docs', 'external-skill-damage');
const generatedAt = new Date().toISOString();

function parseCsvLine(line) {
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      cells.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] || '']));
  });
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function writeCsv(rows, filePath) {
  if (!rows.length) {
    await writeFile(filePath, '', 'utf8');
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))
  ];
  await writeFile(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function slotOrder(slot) {
  return ['P', 'Q', 'W', 'E', 'R'].indexOf(slot);
}

async function main() {
  const rows = parseCsv(await readFile(coveragePath, 'utf8'));
  const byHero = new Map();
  for (const row of rows) {
    const key = `${row.heroCode}:${row.heroKey}`;
    if (!byHero.has(key)) byHero.set(key, []);
    byHero.get(key).push(row);
  }

  const heroRows = [];
  const skillRows = [];
  for (const [, skills] of byHero) {
    const sorted = skills.sort((a, b) => slotOrder(a.slot) - slotOrder(b.slot) || Number(a.skillGroup) - Number(b.skillGroup));
    const coefficientSkills = sorted.filter((skill) => skill.hasCoefficientText === 'true');
    const structuredSkills = sorted.filter((skill) => skill.coverageStatus === 'structured');
    const missingDamageSkills = sorted.filter((skill) => (
      skill.hasCoefficientText === 'true' &&
      skill.coverageStatus !== 'structured'
    ));

    if (!missingDamageSkills.length) continue;

    const hero = sorted[0];
    heroRows.push({
      generatedAt,
      heroCode: hero.heroCode,
      heroKey: hero.heroKey,
      heroName: hero.heroName,
      heroEnglishName: hero.heroEnglishName,
      totalSkillRows: sorted.length,
      coefficientSkillRows: coefficientSkills.length,
      structuredSkillRows: structuredSkills.length,
      missingDamageSkillRows: missingDamageSkills.length,
      missingSlots: Array.from(new Set(missingDamageSkills.map((skill) => skill.slot))).join('|'),
      allCoverageStatuses: Array.from(new Set(sorted.map((skill) => skill.coverageStatus))).join('|'),
      note: structuredSkills.length ? 'partial_missing_structured_damage' : 'all_damage_coefficients_missing_structured_data'
    });

    for (const skill of missingDamageSkills) {
      skillRows.push({
        generatedAt,
        heroCode: skill.heroCode,
        heroKey: skill.heroKey,
        heroName: skill.heroName,
        heroEnglishName: skill.heroEnglishName,
        slot: skill.slot,
        skillGroup: skill.skillGroup,
        skillId: skill.skillId,
        passiveSkillId: skill.passiveSkillId,
        skillName: skill.skillName,
        maxLevel: skill.maxLevel,
        coverageStatus: skill.coverageStatus,
        sourceExtension: skill.sourceExtension,
        coefficientText: skill.coefficientText,
        textSource: skill.textSource
      });
    }
  }

  heroRows.sort((a, b) => Number(a.heroCode) - Number(b.heroCode));
  skillRows.sort((a, b) => Number(a.heroCode) - Number(b.heroCode) || slotOrder(a.slot) - slotOrder(b.slot) || Number(a.skillGroup) - Number(b.skillGroup));

  await mkdir(outDir, { recursive: true });
  await writeCsv(heroRows, path.join(outDir, 'missing-skill-damage-heroes.csv'));
  await writeCsv(skillRows, path.join(outDir, 'missing-skill-damage-skills.csv'));
  await writeFile(path.join(outDir, 'missing-skill-damage-heroes.json'), `${JSON.stringify({ generatedAt, heroes: heroRows, skills: skillRows }, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    generatedAt,
    heroCount: heroRows.length,
    skillCount: skillRows.length,
    allMissingHeroCount: heroRows.filter((hero) => hero.note === 'all_damage_coefficients_missing_structured_data').length,
    partialMissingHeroCount: heroRows.filter((hero) => hero.note === 'partial_missing_structured_damage').length,
    sample: heroRows.slice(0, 20)
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
