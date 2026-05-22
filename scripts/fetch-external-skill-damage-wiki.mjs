import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const inputPath = path.join(rootDir, 'docs', 'external-skill-damage', 'missing-skill-damage-heroes.json');
const outDir = path.join(rootDir, 'docs', 'external-skill-damage');
const apiBase = 'https://eternalreturn.fandom.com/api.php';
const generatedAt = new Date().toISOString();

function parseCsvValue(value) {
  return String(value ?? '');
}

function csvEscape(value) {
  const text = parseCsvValue(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function writeCsv(rows, filePath, headers = Object.keys(rows[0] || {})) {
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))
  ];
  await writeFile(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(params) {
  const url = new URL(apiBase);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function fetchPageWikitext(pageTitle) {
  const parsed = await fetchJson({
    action: 'parse',
    page: pageTitle,
    prop: 'wikitext',
    redirects: '1'
  });
  if (parsed.error) throw new Error(`${parsed.error.code}: ${parsed.error.info}`);
  return {
    title: parsed.parse.title,
    pageId: parsed.parse.pageid,
    wikitext: parsed.parse.wikitext['*'] || ''
  };
}

async function fetchRevisionInfo(pageTitle) {
  const data = await fetchJson({
    action: 'query',
    titles: pageTitle,
    prop: 'revisions',
    rvprop: 'timestamp|ids|user|comment',
    rvlimit: '1'
  });
  const page = Object.values(data.query?.pages || {})[0];
  const revision = page?.revisions?.[0] || {};
  return {
    pageTitle: page?.title || pageTitle,
    pageId: page?.pageid || '',
    lastRevisionId: revision.revid || '',
    lastRevisionAt: revision.timestamp || '',
    lastRevisionUser: revision.user || '',
    lastRevisionComment: revision.comment || ''
  };
}

async function searchPageTitle(query) {
  const data = await fetchJson({
    action: 'query',
    list: 'search',
    srsearch: query,
    srlimit: '5'
  });
  const result = data.query?.search?.find((item) => !item.title.includes('/')) || data.query?.search?.[0];
  return result?.title || '';
}

function extractBalancedTemplate(text, startIndex) {
  let depth = 0;
  for (let index = startIndex; index < text.length - 1; index += 1) {
    const pair = text.slice(index, index + 2);
    if (pair === '{{') {
      depth += 1;
      index += 1;
    } else if (pair === '}}') {
      depth -= 1;
      index += 1;
      if (depth === 0) return text.slice(startIndex, index + 1);
    }
  }
  return '';
}

function extractSkillTemplates(wikitext) {
  const templates = [];
  let searchFrom = 0;
  while (searchFrom < wikitext.length) {
    const index = wikitext.indexOf('{{Skill', searchFrom);
    if (index === -1) break;
    const template = extractBalancedTemplate(wikitext, index);
    if (!template) break;
    templates.push(template);
    searchFrom = index + template.length;
  }
  return templates;
}

function parseTemplateFields(template) {
  const body = template.replace(/^\{\{Skill\s*/, '').replace(/\}\}\s*$/, '');
  const fields = {};
  let currentKey = '';
  for (const line of body.split(/\r?\n/)) {
    const match = line.match(/^\|([^=]+)=(.*)$/);
    if (match) {
      currentKey = match[1].trim();
      fields[currentKey] = match[2].trim();
    } else if (currentKey) {
      fields[currentKey] = `${fields[currentKey]}\n${line}`;
    }
  }
  return fields;
}

function stripWiki(value) {
  return String(value ?? '')
    .replace(/\{\{[A-Za-z0-9 _-]+\|([^{}]*)\}\}/g, '$1')
    .replace(/\{\{([^{}|]+)\}\}/g, '$1')
    .replace(/'''/g, '')
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slotFromSkill(fields) {
  const key = String(fields.key || '').trim().toUpperCase();
  if (key === 'T' || key === 'P') return 'P';
  if (['Q', 'W', 'E', 'R'].includes(key)) return key;

  const slot = String(fields.slot || '').toLowerCase();
  if (slot.includes('passive')) return 'P';
  if (slot.includes('1st')) return 'Q';
  if (slot.includes('2nd')) return 'W';
  if (slot.includes('3rd')) return 'E';
  if (slot.includes('ultimate')) return 'R';
  return '';
}

function normalizeIdPart(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/['’]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function parseStatField(value) {
  const clean = stripWiki(value);
  const match = clean.match(/^([^:]+):\s*(.+)$/);
  if (!match) return null;
  return {
    label: match[1].trim(),
    value: match[2].trim()
  };
}

function splitLevelValues(value) {
  const pieces = String(value)
    .split('/')
    .map((piece) => piece.trim())
    .filter(Boolean);
  return pieces.length ? pieces : [String(value).trim()];
}

function extractScalingText(fields) {
  const text = String(fields.description || '');
  const snippets = [];
  const templateMatches = text.match(/\{\{A\|[^{}]+\}\}/g) || [];
  for (const match of templateMatches) snippets.push(stripWiki(match));

  const plain = stripWiki(text);
  const parenMatches = plain.match(/\([^)]*(?:Skill Amp|Skill Amplification|Attack Power|AP|Max HP|HP|Level)[^)]*\)/gi) || [];
  for (const match of parenMatches) snippets.push(match.trim());

  return Array.from(new Set(snippets)).join(' | ');
}

function extractDescriptionDamageText(fields) {
  const clean = stripWiki(fields.description || '');
  return (clean.match(/[^.。]*(?:damage|Damage)[^.。]*/g) || []).join(' | ');
}

function buildWikiSkillMap(wikitext) {
  const skills = [];
  for (const template of extractSkillTemplates(wikitext)) {
    const fields = parseTemplateFields(template);
    const slot = slotFromSkill(fields);
    if (!slot) continue;
    skills.push({
      slot,
      name: stripWiki(fields.name),
      fields,
      scalingText: extractScalingText(fields),
      descriptionDamageText: extractDescriptionDamageText(fields)
    });
  }
  return skills;
}

function makeRowsForSkill({ hero, missingSkill, wikiSkill, source }) {
  const rows = [];
  const statEntries = Object.entries(wikiSkill.fields)
    .filter(([key]) => /^stat\d+$/i.test(key))
    .map(([key, value]) => [key, parseStatField(value)])
    .filter(([, stat]) => stat && /damage/i.test(stat.label));

  for (const [statKey, stat] of statEntries) {
    const values = splitLevelValues(stat.value);
    values.forEach((baseDamage, index) => {
      rows.push({
        generatedAt,
        standardId: [
          normalizeIdPart(hero.heroKey || hero.heroEnglishName),
          missingSkill.slot.toLowerCase(),
          normalizeIdPart(wikiSkill.name),
          normalizeIdPart(stat.label),
          `lv${index + 1}`
        ].join('.'),
        heroCode: hero.heroCode,
        heroKey: hero.heroKey,
        heroEnglishName: hero.heroEnglishName,
        heroName: hero.heroName,
        slot: missingSkill.slot,
        skillGroup: missingSkill.skillGroup,
        skillId: missingSkill.skillId,
        skillNameFromGamedata: missingSkill.skillName,
        wikiSkillName: wikiSkill.name,
        damagePartLabel: stat.label,
        level: index + 1,
        baseDamage,
        statSourceField: statKey,
        scalingText: wikiSkill.scalingText,
        descriptionDamageText: wikiSkill.descriptionDamageText,
        sourceType: 'wiki_current_snapshot',
        sourceUrl: source.url,
        sourceTitle: source.title,
        sourceDate: source.lastRevisionAt,
        gameVersion: '',
        language: 'en',
        confidence: 'medium',
        notes: 'Parsed from Official Eternal Return Wiki Skill template; values should be checked against official patch notes before merging into primary data.'
      });
    });
  }

  if (!rows.length && wikiSkill.descriptionDamageText) {
    rows.push({
      generatedAt,
      standardId: [
        normalizeIdPart(hero.heroKey || hero.heroEnglishName),
        missingSkill.slot.toLowerCase(),
        normalizeIdPart(wikiSkill.name),
        'description_damage',
        'raw'
      ].join('.'),
      heroCode: hero.heroCode,
      heroKey: hero.heroKey,
      heroEnglishName: hero.heroEnglishName,
      heroName: hero.heroName,
      slot: missingSkill.slot,
      skillGroup: missingSkill.skillGroup,
      skillId: missingSkill.skillId,
      skillNameFromGamedata: missingSkill.skillName,
      wikiSkillName: wikiSkill.name,
      damagePartLabel: 'Description Damage',
      level: '',
      baseDamage: '',
      statSourceField: 'description',
      scalingText: wikiSkill.scalingText,
      descriptionDamageText: wikiSkill.descriptionDamageText,
      sourceType: 'wiki_current_snapshot',
      sourceUrl: source.url,
      sourceTitle: source.title,
      sourceDate: source.lastRevisionAt,
      gameVersion: '',
      language: 'en',
      confidence: 'low',
      notes: 'Damage text was found only in the description, not a per-level wiki stat field.'
    });
  }

  return rows;
}

async function resolveWikiPage(heroEnglishName) {
  const candidates = Array.from(new Set([
    heroEnglishName,
    heroEnglishName.replace(/([a-z])([A-Z])/g, '$1 $2'),
    heroEnglishName.replace(/H$/, ' H')
  ].filter(Boolean)));

  for (const candidate of candidates) {
    try {
      return await fetchPageWikitext(candidate);
    } catch {
      await sleep(150);
    }
  }

  const found = await searchPageTitle(`${heroEnglishName} Eternal Return`);
  if (!found) throw new Error(`No wiki page found for ${heroEnglishName}`);
  return fetchPageWikitext(found);
}

async function main() {
  const input = JSON.parse(await readFile(inputPath, 'utf8'));
  const heroes = input.heroes;
  const skillsByHero = new Map();
  for (const skill of input.skills) {
    const key = `${skill.heroCode}:${skill.heroKey}`;
    if (!skillsByHero.has(key)) skillsByHero.set(key, []);
    skillsByHero.get(key).push(skill);
  }

  const rows = [];
  const sourceRows = [];
  const unresolvedRows = [];

  for (const hero of heroes) {
    const key = `${hero.heroCode}:${hero.heroKey}`;
    const missingSkills = skillsByHero.get(key) || [];
    try {
      const page = await resolveWikiPage(hero.heroEnglishName);
      const revision = await fetchRevisionInfo(page.title);
      const source = {
        ...revision,
        title: `${page.title} - Official Eternal Return Wiki`,
        url: `https://eternalreturn.fandom.com/wiki/${encodeURIComponent(page.title.replaceAll(' ', '_'))}`
      };
      const wikiSkills = buildWikiSkillMap(page.wikitext);

      let matchedSkills = 0;
      let emittedRows = 0;
      for (const missingSkill of missingSkills) {
        const wikiSkill = wikiSkills.find((skill) => skill.slot === missingSkill.slot);
        if (!wikiSkill) {
          unresolvedRows.push({
            generatedAt,
            heroCode: hero.heroCode,
            heroKey: hero.heroKey,
            heroEnglishName: hero.heroEnglishName,
            slot: missingSkill.slot,
            skillGroup: missingSkill.skillGroup,
            skillId: missingSkill.skillId,
            reason: 'wiki_skill_slot_not_found',
            sourceUrl: source.url,
            notes: `Found wiki page, but no skill template matched slot ${missingSkill.slot}.`
          });
          continue;
        }

        matchedSkills += 1;
        const skillRows = makeRowsForSkill({ hero, missingSkill, wikiSkill, source });
        emittedRows += skillRows.length;
        rows.push(...skillRows);
      }

      sourceRows.push({
        generatedAt,
        heroCode: hero.heroCode,
        heroKey: hero.heroKey,
        heroEnglishName: hero.heroEnglishName,
        sourceType: 'wiki_current_snapshot',
        sourceTitle: source.title,
        sourceUrl: source.url,
        sourceDate: source.lastRevisionAt,
        lastRevisionId: source.lastRevisionId,
        missingSkillCount: missingSkills.length,
        matchedSkillCount: matchedSkills,
        emittedRowCount: emittedRows,
        confidence: 'medium',
        notes: 'Official Eternal Return Wiki page parsed through MediaWiki API.'
      });
    } catch (error) {
      sourceRows.push({
        generatedAt,
        heroCode: hero.heroCode,
        heroKey: hero.heroKey,
        heroEnglishName: hero.heroEnglishName,
        sourceType: 'wiki_current_snapshot',
        sourceTitle: '',
        sourceUrl: '',
        sourceDate: '',
        lastRevisionId: '',
        missingSkillCount: missingSkills.length,
        matchedSkillCount: 0,
        emittedRowCount: 0,
        confidence: 'none',
        notes: error.message
      });
      for (const missingSkill of missingSkills) {
        unresolvedRows.push({
          generatedAt,
          heroCode: hero.heroCode,
          heroKey: hero.heroKey,
          heroEnglishName: hero.heroEnglishName,
          slot: missingSkill.slot,
          skillGroup: missingSkill.skillGroup,
          skillId: missingSkill.skillId,
          reason: 'wiki_page_fetch_failed',
          sourceUrl: '',
          notes: error.message
        });
      }
    }
    await sleep(200);
  }

  const rowHeaders = [
    'generatedAt', 'standardId', 'heroCode', 'heroKey', 'heroEnglishName', 'heroName',
    'slot', 'skillGroup', 'skillId', 'skillNameFromGamedata', 'wikiSkillName',
    'damagePartLabel', 'level', 'baseDamage', 'statSourceField', 'scalingText',
    'descriptionDamageText', 'sourceType', 'sourceUrl', 'sourceTitle', 'sourceDate',
    'gameVersion', 'language', 'confidence', 'notes'
  ];
  const sourceHeaders = [
    'generatedAt', 'heroCode', 'heroKey', 'heroEnglishName', 'sourceType', 'sourceTitle',
    'sourceUrl', 'sourceDate', 'lastRevisionId', 'missingSkillCount', 'matchedSkillCount',
    'emittedRowCount', 'confidence', 'notes'
  ];
  const unresolvedHeaders = [
    'generatedAt', 'heroCode', 'heroKey', 'heroEnglishName', 'slot', 'skillGroup',
    'skillId', 'reason', 'sourceUrl', 'notes'
  ];

  await mkdir(outDir, { recursive: true });
  await writeCsv(rows, path.join(outDir, 'external-skill-damage-wiki-current.csv'), rowHeaders);
  await writeCsv(sourceRows, path.join(outDir, 'external-skill-damage-source-notes.csv'), sourceHeaders);
  await writeCsv(unresolvedRows, path.join(outDir, 'external-skill-damage-unresolved.csv'), unresolvedHeaders);
  await writeFile(path.join(outDir, 'external-skill-damage-wiki-current.json'), `${JSON.stringify({
    generatedAt,
    source: 'Official Eternal Return Wiki via MediaWiki API',
    rows,
    sources: sourceRows,
    unresolved: unresolvedRows
  }, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    generatedAt,
    heroCount: heroes.length,
    emittedRows: rows.length,
    sourceRows: sourceRows.length,
    unresolvedRows: unresolvedRows.length,
    sourcesWithRows: sourceRows.filter((row) => Number(row.emittedRowCount) > 0).length
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
