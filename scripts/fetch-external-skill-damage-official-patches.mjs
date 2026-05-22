import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const inputPath = path.join(rootDir, 'docs', 'external-skill-damage', 'missing-skill-damage-heroes.json');
const outDir = path.join(rootDir, 'docs', 'external-skill-damage');
const generatedAt = new Date().toISOString();
const officialBase = 'https://playeternalreturn.com';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function decodeHtml(text) {
  return String(text ?? '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function plainTextFromHtml(html) {
  const contentStart = html.indexOf('<div class="er-article-detail__content');
  const recentStart = html.indexOf('<div class="er-article-detail__recent', contentStart);
  const contentHtml = contentStart === -1
    ? html
    : html.slice(contentStart, recentStart === -1 ? undefined : recentStart);

  return decodeHtml(contentHtml)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<(?:ul|ol)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function normalizeIdPart(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/['’]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function findHeroMentions(text, heroName) {
  const escaped = heroName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}$|^${escaped}:`, 'i').test(text.trim());
}

function extractHeroSegment(lines, heroName, allHeroNames, startIndex) {
  const segment = [];
  for (let index = startIndex + 1; index < Math.min(lines.length, startIndex + 45); index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    const isNextHero = allHeroNames.some((name) => name !== heroName && findHeroMentions(line, name));
    const isNextSection = /^(Weapon|Weapons|Item|Items|Mode|System|Fixes|Bug Fixes|Gameplay|Wild Animals|Augments|Tactical Skills|Characters?)$/i.test(line);
    if (isNextHero || isNextSection) break;
    segment.push(line);
  }
  return segment;
}

function extractDamageChanges(segment) {
  const changes = [];
  for (let index = 0; index < segment.length; index += 1) {
    const line = segment[index].replace(/\s+/g, ' ').trim();
    if (!line.includes('→')) continue;
    if (!/(Damage|Skill Amplification|Attack Power|Additional Damage|Base Damage|True Damage)/i.test(line)) continue;
    const previous = segment[index - 1] || '';
    const raw = /\([PQWER][^)]*\)/i.test(previous) ? `${previous} ${line}` : line;
    changes.push(raw.trim());
  }
  return Array.from(new Set(changes));
}

function parseArticleMeta(article) {
  const i18n = article.i18ns?.en_US || article.i18ns?.en || Object.values(article.i18ns || {})[0] || {};
  return {
    id: article.id,
    title: i18n.title || '',
    createdAt: article.created_at || '',
    updatedAt: article.updated_at || '',
    url: `${officialBase}/posts/news/${article.id}?hl=en-US`
  };
}

async function fetchPatchArticles() {
  const articles = [];
  let page = 1;
  let totalPage = 1;
  do {
    const url = `${officialBase}/api/v1/posts/news?category=patchnote&page=${page}`;
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
    const data = await response.json();
    totalPage = Number(data.total_page || 1);
    for (const article of data.articles || []) articles.push(parseArticleMeta(article));
    page += 1;
    await sleep(100);
  } while (page <= totalPage);
  return articles;
}

async function fetchArticleText(article) {
  const response = await fetch(article.url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${article.url}`);
  return plainTextFromHtml(await response.text());
}

async function main() {
  const input = JSON.parse(await readFile(inputPath, 'utf8'));
  const heroes = input.heroes;
  const heroByEnglishName = new Map(heroes.map((hero) => [hero.heroEnglishName, hero]));
  const heroNames = heroes.map((hero) => hero.heroEnglishName);
  const officialRows = [];
  const sourceRows = [];

  const articles = await fetchPatchArticles();
  for (const article of articles) {
    let text = '';
    try {
      text = await fetchArticleText(article);
    } catch (error) {
      sourceRows.push({
        generatedAt,
        sourceType: 'official_patch_note',
        sourceTitle: article.title,
        sourceUrl: article.url,
        sourceDate: article.updatedAt || article.createdAt,
        articleId: article.id,
        matchedHeroCount: 0,
        emittedRowCount: 0,
        confidence: 'none',
        notes: error.message
      });
      continue;
    }

    let matchedHeroCount = 0;
    let emittedRowCount = 0;
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (const [heroEnglishName, hero] of heroByEnglishName) {
      const heroLineIndexes = lines
        .map((line, index) => [line, index])
        .filter(([line]) => findHeroMentions(line, heroEnglishName))
        .map(([, index]) => index);
      if (!heroLineIndexes.length) continue;

      const segments = heroLineIndexes.map((index) => extractHeroSegment(lines, heroEnglishName, heroNames, index));
      const changes = Array.from(new Set(segments.flatMap(extractDamageChanges)));
      const usableChanges = changes;
      if (!usableChanges.length) continue;

      matchedHeroCount += 1;
      usableChanges.forEach((changeText, index) => {
        const postArrow = changeText.includes('→') ? changeText.split('→').slice(1).join('→').trim() : '';
        const slotMatch = changeText.match(/\(([PQWER])[^)]*\)/i);
        officialRows.push({
          generatedAt,
          standardId: [
            normalizeIdPart(hero.heroKey || hero.heroEnglishName),
            slotMatch?.[1]?.toLowerCase() || 'unknown',
            `official_patch_${article.id}`,
            `change_${index + 1}`
          ].join('.'),
          heroCode: hero.heroCode,
          heroKey: hero.heroKey,
          heroEnglishName,
          heroName: hero.heroName,
          slot: slotMatch?.[1]?.toUpperCase() || '',
          rawChangeText: changeText,
          currentValueText: postArrow,
          sourceType: 'official_patch_note',
          sourceUrl: article.url,
          sourceTitle: article.title,
          sourceDate: article.createdAt || article.updatedAt,
          language: 'en',
          confidence: postArrow ? 'high_for_patch_delta' : 'medium_raw_snippet',
          notes: postArrow
            ? 'Official patch note change. Treat currentValueText as an override newer than older wiki snapshots when this sourceDate is later.'
            : 'Official patch note mention with damage-related text, but no arrow delta was parsed.'
        });
        emittedRowCount += 1;
      });
    }

    sourceRows.push({
      generatedAt,
      sourceType: 'official_patch_note',
      sourceTitle: article.title,
      sourceUrl: article.url,
        sourceDate: article.createdAt || article.updatedAt,
      articleId: article.id,
      matchedHeroCount,
      emittedRowCount,
      confidence: emittedRowCount ? 'high_for_patch_delta' : 'none',
      notes: emittedRowCount
        ? 'Official Eternal Return patch note scanned for missing-damage heroes.'
        : 'Scanned official patch note; no damage-related missing-hero snippet emitted.'
    });
    await sleep(120);
  }

  officialRows.sort((a, b) => String(b.sourceDate).localeCompare(String(a.sourceDate)) || Number(b.heroCode) - Number(a.heroCode));
  sourceRows.sort((a, b) => String(b.sourceDate).localeCompare(String(a.sourceDate)));

  const rowHeaders = [
    'generatedAt', 'standardId', 'heroCode', 'heroKey', 'heroEnglishName', 'heroName',
    'slot', 'rawChangeText', 'currentValueText', 'sourceType', 'sourceUrl', 'sourceTitle',
    'sourceDate', 'language', 'confidence', 'notes'
  ];
  const sourceHeaders = [
    'generatedAt', 'sourceType', 'sourceTitle', 'sourceUrl', 'sourceDate', 'articleId',
    'matchedHeroCount', 'emittedRowCount', 'confidence', 'notes'
  ];

  await mkdir(outDir, { recursive: true });
  await writeCsv(officialRows, path.join(outDir, 'external-skill-damage-official-patches.csv'), rowHeaders);
  await writeCsv(sourceRows, path.join(outDir, 'external-skill-damage-official-patch-sources.csv'), sourceHeaders);
  await writeFile(path.join(outDir, 'external-skill-damage-official-patches.json'), `${JSON.stringify({
    generatedAt,
    source: 'Official Eternal Return patch notes',
    rows: officialRows,
    sources: sourceRows
  }, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    generatedAt,
    patchArticleCount: articles.length,
    emittedRows: officialRows.length,
    sourceRows: sourceRows.length,
    latestRows: officialRows.slice(0, 10)
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
