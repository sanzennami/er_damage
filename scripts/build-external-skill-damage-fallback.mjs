import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs', 'external-skill-damage');
const outPath = path.join(rootDir, 'src', 'data', 'externalSkillDamageFallback.json');

const MANUAL_HEROES = new Set(['俞岷', '奇娅拉']);
const DAMAGE_LABELS = new Map([
  ['Damage', '伤害'],
  ['Initial Damage', '一段伤害'],
  ['Second Damage', '二段伤害'],
  ['Reactivation Damage', '再次使用伤害'],
  ['Enhanced Damage', '强化伤害'],
  ['Additional Damage', '额外伤害'],
  ['Extra Damage', '额外伤害'],
  ['Explosion Damage', '爆炸伤害'],
  ['Mark Damage', '标记伤害'],
  ['True Damage', '真实伤害'],
  ['Bleeding Damage', '流血伤害'],
  ['Final Damage', '终结伤害']
]);

function finiteNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const next = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(next) ? next : null;
}

function isoDate(value) {
  const time = Date.parse(value || '');
  if (!Number.isFinite(time)) return '';
  return new Date(time).toISOString().slice(0, 10);
}

function toTime(value) {
  const time = Date.parse(value || '');
  return Number.isFinite(time) ? time : 0;
}

function normalizeIdPart(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/['’]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function skillKey(row) {
  return `${row.heroKey}::${row.slot}::${row.skillGroup}::${row.damagePartLabel}::${row.statSourceField}`;
}

function reconciliationKey(row) {
  return `${row.heroKey}::${row.slot}::${row.skillGroup}`;
}

function sourceVersionFromTitle(title) {
  const match = String(title || '').match(/PATCH NOTES\s+([0-9]+(?:\.[0-9]+)?)/i);
  return match ? match[1] : '';
}

function scalingSnippets(text) {
  return String(text || '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

function scalingIndexFromField(field) {
  const match = String(field || '').match(/stat(\d+)/i);
  return match ? Math.max(0, Number(match[1]) - 1) : 0;
}

function coefficientFromScaling(text, statSourceField) {
  const snippets = scalingSnippets(text);
  const preferred = snippets[scalingIndexFromField(statSourceField)] || snippets[0] || '';
  const candidates = [preferred, ...snippets.filter((item) => item !== preferred)];

  for (const snippet of candidates) {
    const valueMatch = snippet.match(/([0-9]+(?:\.[0-9]+)?)\s*%/);
    if (!valueMatch) continue;
    const lower = snippet.toLowerCase();
    if (lower.includes('attack power')) return { variable: 'attack', coefficient: Number(valueMatch[1]) / 100, scalingText: snippet };
    if (lower.includes('skill amp') || lower.includes('skill amplification')) {
      return { variable: 'ap', coefficient: Number(valueMatch[1]) / 100, scalingText: snippet };
    }
  }

  return { variable: '', coefficient: 0, scalingText: preferred };
}

function coefficientsFromDamageText(text, baseDamage) {
  const clean = String(text || '').replace(/\s+/g, ' ');
  const base = String(baseDamage ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const baseIndex = clean.search(new RegExp(`\\b${base}\\b`));
  const segment = baseIndex === -1
    ? clean
    : clean.slice(baseIndex, Math.min(clean.length, baseIndex + 220));
  const damageEnd = segment.search(/\b(?:skill |true |additional |bleeding )?damage\b/i);
  const candidate = damageEnd === -1 ? segment : segment.slice(0, damageEnd + 20);
  const parens = candidate.match(/\([^)]*\)/g) || [];
  const terms = [];

  for (const paren of parens) {
    const valueMatch = paren.match(/([0-9]+(?:\.[0-9]+)?)\s*%/);
    if (!valueMatch) continue;
    const lower = paren.toLowerCase();
    let variable = '';
    if (lower.includes('target') && lower.includes('hp')) variable = 'targetHp';
    else if (lower.includes('attack power')) variable = 'attack';
    else if (lower.includes('skill amp') || lower.includes('skill amplification')) variable = 'ap';
    if (!variable) continue;
    terms.push({
      variable,
      coefficient: Number(valueMatch[1]) / 100,
      scalingText: paren
    });
  }

  const seen = new Set();
  return terms.filter((term) => {
    const key = `${term.variable}:${term.coefficient}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseOfficialCurrentValue(text) {
  const valueText = String(text || '').replace(/\s+/g, ' ').trim();
  const baseMatch = valueText.match(/([0-9]+(?:\.[0-9]+)?(?:\s*\/\s*[0-9]+(?:\.[0-9]+)?)*)/);
  const coefficient = coefficientFromScaling(valueText, 'stat1');
  if (!baseMatch) return null;
  const bases = baseMatch[1].split('/').map((value) => finiteNumber(value)).filter((value) => value !== null);
  if (!bases.length) return null;
  return {
    bases,
    terms: coefficient.variable ? [coefficient] : [],
    scalingText: coefficient.scalingText
  };
}

function formulaFor(terms) {
  const usableTerms = (Array.isArray(terms) ? terms : [terms])
    .filter((term) => term?.variable && term.coefficient);
  if (!usableTerms.length) return 'base';
  return ['base', ...usableTerms.map((term) => `${term.variable} * ${Number(term.coefficient.toFixed(4))}`)].join(' + ');
}

function cleanDamageLabel(label) {
  const clean = String(label || '').replace(/[\[\]]/g, '').trim();
  return DAMAGE_LABELS.get(clean) || clean;
}

function reconciliationPartCount(row) {
  const labels = String(row?.wikiDamageParts || '')
    .split('|')
    .map((part) => part.split(':')[0]?.trim())
    .filter(Boolean);
  return new Set(labels).size || 0;
}

async function readJson(file) {
  return JSON.parse(await readFile(path.join(rootDir, file), 'utf8'));
}

const [
  erGameData,
  erSkillDamageTable,
  skillDamageAugments,
  missingDamage,
  wikiData,
  reconciliationData
] = await Promise.all([
  readJson('src/data/erGameData.json'),
  readJson('src/data/erSkillDamageTable.json'),
  readJson('src/data/skillDamageAugments.json'),
  readJson('docs/external-skill-damage/missing-skill-damage-heroes.json'),
  readJson('docs/external-skill-damage/external-skill-damage-wiki-current.json'),
  readJson('docs/external-skill-damage/external-skill-damage-reconciliation.json')
]);

const existingHeroes = new Set(MANUAL_HEROES);
for (const row of erSkillDamageTable.damageRows || []) {
  if ([1, 2, 3, 4, 5, 6].some((level) => finiteNumber(row[`lv${level}`]) !== null)) existingHeroes.add(row.heroName);
}
for (const skill of skillDamageAugments.skills || []) existingHeroes.add(skill.hero);
for (const skill of erGameData.skills || []) {
  if (String(skill.bases || '').trim()) existingHeroes.add(skill.hero);
}

const missingHeroKeys = new Set(
  (erGameData.characters || [])
    .filter((character) => character.name && !existingHeroes.has(character.name))
    .map((character) => character.id || character.englishName)
);

const missingSkillNameByGroup = new Map(
  (missingDamage.skills || []).map((row) => [`${row.heroKey}::${row.slot}::${row.skillGroup}`, row.skillName])
);
const reconciliationByGroup = new Map(
  (reconciliationData.rows || []).map((row) => [reconciliationKey(row), row])
);

const grouped = new Map();
for (const row of wikiData.rows || []) {
  if (!missingHeroKeys.has(row.heroKey)) continue;
  const base = finiteNumber(row.baseDamage);
  if (base === null) continue;
  const key = skillKey(row);
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push(row);
}

const skills = [];
const dedupe = new Set();
for (const rows of grouped.values()) {
  rows.sort((a, b) => Number(a.level) - Number(b.level));
  const first = rows[0];
  const rec = reconciliationByGroup.get(reconciliationKey(first)) || {};
  const baseValues = rows.map((row) => finiteNumber(row.baseDamage)).filter((value) => value !== null);
  if (!baseValues.length) continue;

  const officialCurrent = rec.latestOfficialPatchDate && rows.length === baseValues.length
    ? parseOfficialCurrentValue(rec.latestOfficialCurrentValueText)
    : null;
  const canApplyOfficial = officialCurrent
    && new Set(rows.map((row) => row.damagePartLabel)).size === 1
    && reconciliationPartCount(rec) <= 1
    && officialCurrent.bases.length === baseValues.length
    && officialCurrent.terms.length;

  const wikiTerms = coefficientsFromDamageText(first.descriptionDamageText, first.baseDamage);
  const fallbackCoefficient = coefficientFromScaling(first.scalingText, first.statSourceField);
  const terms = canApplyOfficial
    ? officialCurrent.terms
    : wikiTerms.length
      ? wikiTerms
      : fallbackCoefficient.variable
        ? [fallbackCoefficient]
        : [];
  const bases = canApplyOfficial ? officialCurrent.bases : baseValues;
  const sourceDate = canApplyOfficial ? rec.latestOfficialPatchDate : first.sourceDate;
  const sourceVersion = canApplyOfficial
    ? sourceVersionFromTitle(rec.latestOfficialPatchTitle)
    : (first.gameVersion || 'Wiki');
  const sourceLabel = `${sourceVersion || 'Wiki'} / ${isoDate(sourceDate) || 'unknown'}`;
  const skillName = missingSkillNameByGroup.get(reconciliationKey(first)) || first.skillNameFromGamedata || first.wikiSkillName;
  const damageLabel = cleanDamageLabel(first.damagePartLabel);
  const title = [first.slot, skillName, damageLabel && damageLabel !== '伤害' ? damageLabel : '']
    .filter(Boolean)
    .join(' ');
  const identity = [
    first.heroKey,
    first.slot,
    skillName,
    damageLabel,
    bases.join(','),
    formulaFor(terms)
  ].join('|');
  if (dedupe.has(identity)) continue;
  dedupe.add(identity);

  skills.push({
    id: `external-${normalizeIdPart(first.heroKey)}-${normalizeIdPart(first.slot)}-${first.skillGroup}-${normalizeIdPart(first.damagePartLabel)}-${normalizeIdPart(first.statSourceField)}`,
    hero: first.heroName,
    heroKey: first.heroKey,
    title,
    bases: bases.join(','),
    formula: formulaFor(terms),
    maxLevel: bases.length,
    source: canApplyOfficial ? 'external-official-patch' : 'external-wiki-current',
    description: first.descriptionDamageText,
    coefficientText: terms.map((term) => term.scalingText).filter(Boolean).join(' ') || first.scalingText,
    group: Number(first.skillGroup) || first.skillGroup,
    skillId: first.skillId,
    dataKey: first.damagePartLabel,
    sourceDate,
    updatedAt: sourceDate,
    sourceVersion,
    sourceLabel,
    sourceUrl: canApplyOfficial ? rec.latestOfficialPatchUrl : first.sourceUrl,
    sourceTitle: canApplyOfficial ? rec.latestOfficialPatchTitle : first.sourceTitle,
    sourceNote: canApplyOfficial
      ? `Applied official patch current value: ${rec.latestOfficialCurrentValueText}`
      : rec.latestOfficialPatchDate
        ? `Wiki snapshot value; newer same-slot patch candidate exists: ${rec.latestOfficialPatchTitle} (${isoDate(rec.latestOfficialPatchDate)}) ${rec.latestOfficialCurrentValueText}`
        : 'Wiki current snapshot value; no newer same-slot official patch candidate was found.',
    sourceIndex: skills.length
  });
}

skills.sort((a, b) => String(a.heroKey).localeCompare(String(b.heroKey)) || String(a.title).localeCompare(String(b.title)));

const coveredHeroes = new Set(skills.map((skill) => skill.heroKey));
const output = {
  generatedAt: new Date().toISOString(),
  source: 'docs/external-skill-damage/README.md',
  policy: 'Supplement heroes that have no existing skill damage calculation rows. Prefer existing pypy-vrc/DAK-derived rows; use external wiki rows as fallback and apply official patch current values only when a single-part row can be matched safely.',
  counts: {
    missingHeroCandidates: missingHeroKeys.size,
    coveredHeroes: coveredHeroes.size,
    skills: skills.length
  },
  skills
};

await writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(output.counts, null, 2));
