import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outRoot = path.join(rootDir, 'assets', 'game-icons');
const dataDir = path.join(rootDir, 'src', 'data');
const docsDir = path.join(rootDir, 'docs');

const locale = 'zh-CN';
const apiBase = 'https://er.dakgg.io/api/v1/data';
const sourcePage = 'https://dak.gg/er/routes/simulator/YuMin';
const generatedAt = new Date().toISOString();

const equipmentTypes = new Set(['Weapon', 'Armor']);

function cleanText(value) {
  return String(value || '')
    .replace(/<color=[^>]+>/g, '')
    .replace(/<\/color>/g, '')
    .replace(/\\n/g, '\n')
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

function normalizeUrl(url) {
  if (!url) return '';
  return url.startsWith('//') ? `https:${url}` : url;
}

function relativeIconPath(...parts) {
  return `/assets/game-icons/${parts.join('/')}`;
}

async function fetchJson(endpoint) {
  const response = await fetch(`${apiBase}/${endpoint}?hl=${locale}`, {
    headers: {
      accept: 'application/json',
      referer: `${sourcePage}?hl=${locale}`,
      'user-agent': 'Mozilla/5.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function tryDownloadFile(url, filePath) {
  try {
    const response = await fetch(normalizeUrl(url), {
      headers: {
        referer: `${sourcePage}?hl=${locale}`,
        'user-agent': 'Mozilla/5.0'
      }
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    return { ok: true, byteSize: buffer.length };
  } catch (error) {
    return {
      ok: false,
      byteSize: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function itemSubType(item) {
  return item.weaponType || item.armorType || item.consumableType || item.miscItemType || item.specialItemType || item.type;
}

function itemFileName(prefix, item) {
  return `${prefix}-${item.id}-${normalizePart(item.type)}-${normalizePart(itemSubType(item))}.png`;
}

function markdownTable(rows, headers) {
  const line = (cells) => `| ${cells.map((cell) => String(cell ?? '').replace(/\r?\n/g, '<br>')).join(' | ')} |`;
  return [
    line(headers),
    line(headers.map(() => '---')),
    ...rows.map((row) => line(row))
  ].join('\n');
}

function rowsByType(rows, key) {
  return rows.reduce((groups, row) => {
    const groupKey = row[key] || 'None';
    groups[groupKey] = [...(groups[groupKey] || []), row];
    return groups;
  }, {});
}

async function main() {
  const [itemsPayload, skillsPayload, charactersPayload] = await Promise.all([
    fetchJson('items'),
    fetchJson('skills'),
    fetchJson('characters')
  ]);

  await Promise.all([
    mkdir(outRoot, { recursive: true }),
    mkdir(dataDir, { recursive: true }),
    mkdir(docsDir, { recursive: true })
  ]);

  const characterById = new Map(charactersPayload.characters.map((character) => [character.id, character]));
  const equipment = [];
  const items = [];

  for (const item of itemsPayload.items) {
    const isEquipment = equipmentTypes.has(item.type);
    const topDir = isEquipment ? 'equipment' : 'items';
    const prefix = isEquipment ? 'equipment' : 'item';
    const typeDir = normalizePart(item.type);
    const fileName = itemFileName(prefix, item);
    const localPath = relativeIconPath(topDir, typeDir, fileName);
    const download = await tryDownloadFile(item.imageUrl, path.join(outRoot, topDir, typeDir, fileName));

    const entry = {
      id: item.id,
      name: cleanText(item.name),
      tooltip: cleanText(item.tooltip),
      type: item.type,
      subType: itemSubType(item),
      grade: item.grade || '',
      makeMaterial1: item.makeMaterial1 || null,
      makeMaterial2: item.makeMaterial2 || null,
      makeMaterials: item.makeMaterials || [item.makeMaterial1, item.makeMaterial2].filter(Boolean),
      image: localPath,
      imageUrl: normalizeUrl(item.imageUrl),
      imageAvailable: download.ok,
      byteSize: download.byteSize,
      imageDownloadError: download.error || null
    };

    if (isEquipment) equipment.push(entry);
    else items.push(entry);
  }

  const heroSkills = [];
  const weaponSkills = [];

  for (const skill of skillsPayload.skills) {
    const character = characterById.get(skill.characterId);
    const isHeroSkill = Boolean(character);
    const characterKey = character?.key || 'weapon-skills';
    const topDir = isHeroSkill ? path.join('hero-skills', normalizePart(characterKey)) : 'weapon-skills';
    const localPath = isHeroSkill
      ? relativeIconPath('hero-skills', normalizePart(characterKey), `skill-${skill.characterId}-${normalizePart(skill.slot)}-${skill.id}.png`)
      : relativeIconPath('weapon-skills', `weapon-skill-${normalizePart(skill.slot)}-${skill.id}.png`);
    const filePath = isHeroSkill
      ? path.join(outRoot, 'hero-skills', normalizePart(characterKey), `skill-${skill.characterId}-${normalizePart(skill.slot)}-${skill.id}.png`)
      : path.join(outRoot, 'weapon-skills', `weapon-skill-${normalizePart(skill.slot)}-${skill.id}.png`);
    const download = await tryDownloadFile(skill.imageUrl, filePath);

    const entry = {
      id: skill.id,
      name: cleanText(skill.name),
      tooltip: cleanText(skill.tooltip),
      slot: skill.slot,
      maxLevel: skill.maxLevel || null,
      characterId: skill.characterId || null,
      characterKey: character?.key || null,
      characterName: character?.name || null,
      image: localPath,
      imageUrl: normalizeUrl(skill.imageUrl),
      imageAvailable: download.ok,
      byteSize: download.byteSize,
      imageDownloadError: download.error || null
    };

    if (isHeroSkill) heroSkills.push(entry);
    else weaponSkills.push(entry);
  }

  const manifest = {
    sourcePage,
    apiBase,
    locale,
    generatedAt,
    naming: {
      equipment: 'assets/game-icons/equipment/{type}/equipment-{id}-{type}-{subType}.png',
      items: 'assets/game-icons/items/{type}/item-{id}-{type}-{subType}.png',
      heroSkills: 'assets/game-icons/hero-skills/{characterKey}/skill-{characterId}-{slot}-{id}.png',
      weaponSkills: 'assets/game-icons/weapon-skills/weapon-skill-{slot}-{id}.png'
    },
    counts: {
      equipment: equipment.length,
      items: items.length,
      heroSkills: heroSkills.length,
      weaponSkills: weaponSkills.length,
      charactersWithHeroSkills: new Set(heroSkills.map((skill) => skill.characterId)).size,
      missingImages: [...equipment, ...items, ...heroSkills, ...weaponSkills].filter((entry) => !entry.imageAvailable).length
    },
    equipment,
    items,
    heroSkills,
    weaponSkills
  };

  await writeFile(path.join(outRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeFile(path.join(dataDir, 'dakItemSkillIcons.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const equipmentByType = rowsByType(equipment, 'type');
  const itemByType = rowsByType(items, 'type');
  const heroSkillByCharacter = rowsByType(heroSkills, 'characterKey');

  const equipmentSections = Object.entries(equipmentByType)
    .map(([type, rows]) => {
      const tableRows = rows
        .sort((a, b) => a.id - b.id)
        .map((item) => [item.id, item.name, item.subType, item.grade, item.image]);
      return `### ${type}\n\n${markdownTable(tableRows, ['id', '名称', '子类型', '品级', '图片'])}`;
    })
    .join('\n\n');

  const itemSections = Object.entries(itemByType)
    .map(([type, rows]) => {
      const tableRows = rows
        .sort((a, b) => a.id - b.id)
        .map((item) => [item.id, item.name, item.subType, item.grade, item.image]);
      return `### ${type}\n\n${markdownTable(tableRows, ['id', '名称', '子类型', '品级', '图片'])}`;
    })
    .join('\n\n');

  const heroSkillSections = Object.entries(heroSkillByCharacter)
    .sort(([, aRows], [, bRows]) => (aRows[0]?.characterId || 0) - (bRows[0]?.characterId || 0))
    .map(([characterKey, rows]) => {
      const first = rows[0];
      const tableRows = rows
        .sort((a, b) => String(a.slot).localeCompare(String(b.slot)) || a.id - b.id)
        .map((skill) => [skill.slot, skill.id, skill.name, skill.maxLevel || '', skill.image]);
      return `### ${first.characterId} ${first.characterName} (${characterKey})\n\n${markdownTable(tableRows, ['槽位', 'id', '名称', '最高等级', '图片'])}`;
    })
    .join('\n\n');

  const weaponSkillRows = weaponSkills
    .sort((a, b) => a.id - b.id)
    .map((skill) => [skill.slot, skill.id, skill.name, skill.image]);

  const missingRows = [...equipment, ...items, ...heroSkills, ...weaponSkills]
    .filter((entry) => !entry.imageAvailable)
    .map((entry) => [
      entry.id,
      entry.name,
      entry.type || entry.slot,
      entry.imageUrl,
      entry.imageDownloadError
    ]);

  const doc = `# DAK.GG 装备、物品与英雄技能图标

来源页面：${sourcePage}?hl=${locale}

数据接口：
- ${apiBase}/items?hl=${locale}
- ${apiBase}/skills?hl=${locale}
- ${apiBase}/characters?hl=${locale}

生成时间：${generatedAt}

## 命名规范

- 装备图标：\`assets/game-icons/equipment/{type}/equipment-{id}-{type}-{subType}.png\`
- 非装备物品图标：\`assets/game-icons/items/{type}/item-{id}-{type}-{subType}.png\`
- 英雄技能图标：\`assets/game-icons/hero-skills/{characterKey}/skill-{characterId}-{slot}-{id}.png\`
- 武器技能图标：\`assets/game-icons/weapon-skills/weapon-skill-{slot}-{id}.png\`
- 机器可读清单：\`assets/game-icons/manifest.json\`
- 前端可直接 import 的副本：\`src/data/dakItemSkillIcons.json\`

## 统计

${markdownTable([
  ['装备图标', equipment.length],
  ['非装备物品图标', items.length],
  ['英雄技能图标', heroSkills.length],
  ['武器技能图标', weaponSkills.length],
  ['拥有技能数据的英雄数', manifest.counts.charactersWithHeroSkills],
  ['缺失图片', manifest.counts.missingImages]
], ['类别', '数量'])}

## 装备图标

${equipmentSections}

## 非装备物品图标

${itemSections}

## 英雄技能图标

${heroSkillSections}

## 武器技能图标

这些是 DAK.GG \`skills\` 接口同时返回的 D 槽武器技能，独立于具体英雄保存。

${markdownTable(weaponSkillRows, ['槽位', 'id', '名称', '图片'])}

## 缺失图片

${missingRows.length ? markdownTable(missingRows, ['id', '名称', '类型/槽位', '原始 URL', '错误']) : '无。'}
`;

  await writeFile(path.join(docsDir, 'dak-item-skill-icons.md'), doc, 'utf8');

  console.log(JSON.stringify(manifest.counts, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
