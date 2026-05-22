import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outRoot = path.join(rootDir, 'assets', 'loadout');
const docsDir = path.join(rootDir, 'docs');

const locale = 'zh-CN';
const apiBase = 'https://er.dakgg.io/api/v1/data';
const sourcePage = 'https://dak.gg/er/routes/simulator/YuMin';
const generatedAt = new Date().toISOString();

const typeLabels = {
  Core: '核心',
  Sub1: '辅助 1',
  Sub2: '辅助 2',
  None: '未启用/旧数据'
};

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

function relativeAssetPath(...parts) {
  return `/assets/loadout/${parts.join('/')}`;
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

async function downloadFile(url, filePath) {
  const response = await fetch(url, {
    headers: {
      referer: `${sourcePage}?hl=${locale}`,
      'user-agent': 'Mozilla/5.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
  return buffer.length;
}

async function tryDownloadFile(url, filePath) {
  try {
    const byteSize = await downloadFile(url, filePath);
    return { ok: true, byteSize };
  } catch (error) {
    return {
      ok: false,
      byteSize: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function markdownTable(rows, headers) {
  const line = (cells) => `| ${cells.join(' | ')} |`;
  return [
    line(headers),
    line(headers.map(() => '---')),
    ...rows.map((row) => line(row))
  ].join('\n');
}

async function main() {
  const [traitPayload, tacticalPayload] = await Promise.all([
    fetchJson('trait-skills'),
    fetchJson('tactical-skills')
  ]);

  const traitGroupDir = path.join(outRoot, 'trait-groups');
  const traitDir = path.join(outRoot, 'traits');
  const tacticalDir = path.join(outRoot, 'tactical-skills');
  const dataDir = path.join(rootDir, 'src', 'data');

  await Promise.all([
    mkdir(traitGroupDir, { recursive: true }),
    mkdir(traitDir, { recursive: true }),
    mkdir(tacticalDir, { recursive: true }),
    mkdir(dataDir, { recursive: true }),
    mkdir(docsDir, { recursive: true })
  ]);

  const traitGroups = [];
  for (const group of traitPayload.traitSkillGroups) {
    const fileName = `group-${normalizePart(group.key)}.png`;
    const localPath = relativeAssetPath('trait-groups', fileName);
    const download = await tryDownloadFile(group.imageUrl, path.join(traitGroupDir, fileName));

    traitGroups.push({
      key: group.key,
      name: cleanText(group.name),
      tooltip: cleanText(group.tooltip),
      image: localPath,
      imageUrl: group.imageUrl,
      imageAvailable: download.ok,
      byteSize: download.byteSize,
      imageDownloadError: download.error || null
    });
  }

  const traitGroupByKey = new Map(traitGroups.map((group) => [group.key, group]));
  const traits = [];
  for (const trait of traitPayload.traitSkills) {
    const groupKey = trait.group || 'None';
    const type = trait.type || 'None';
    const fileName = `trait-${trait.id}-${normalizePart(groupKey)}-${normalizePart(type)}.png`;
    const localPath = relativeAssetPath('traits', fileName);
    const download = await tryDownloadFile(trait.imageUrl, path.join(traitDir, fileName));

    traits.push({
      id: trait.id,
      name: cleanText(trait.name),
      tooltip: cleanText(trait.tooltip),
      group: groupKey,
      groupName: traitGroupByKey.get(groupKey)?.name || '无分组',
      type,
      typeName: typeLabels[type] || type,
      active: Boolean(trait.active),
      sortOrder: trait.traitSortOrder ?? null,
      image: localPath,
      imageUrl: trait.imageUrl,
      imageAvailable: download.ok,
      byteSize: download.byteSize,
      imageDownloadError: download.error || null
    });
  }

  const tacticalSkills = [];
  for (const skill of tacticalPayload.tacticalSkills) {
    const fileName = `tactical-${skill.id}.png`;
    const localPath = relativeAssetPath('tactical-skills', fileName);
    const download = await tryDownloadFile(skill.imageUrl, path.join(tacticalDir, fileName));

    tacticalSkills.push({
      id: skill.id,
      name: cleanText(skill.name) || `未命名战术技能 ${skill.id}`,
      tooltip: cleanText(skill.tooltip),
      image: localPath,
      imageUrl: skill.imageUrl,
      imageAvailable: download.ok,
      byteSize: download.byteSize,
      imageDownloadError: download.error || null
    });
  }

  const manifest = {
    sourcePage,
    apiBase,
    locale,
    generatedAt,
    naming: {
      traitGroups: 'assets/loadout/trait-groups/group-{groupKey}.png',
      traits: 'assets/loadout/traits/trait-{id}-{groupKey}-{type}.png',
      tacticalSkills: 'assets/loadout/tactical-skills/tactical-{id}.png'
    },
    counts: {
      traitGroups: traitGroups.length,
      traits: traits.length,
      activeTraits: traits.filter((trait) => trait.active).length,
      tacticalSkills: tacticalSkills.length,
      missingImages: [...traitGroups, ...traits, ...tacticalSkills].filter((item) => !item.imageAvailable).length
    },
    traitGroups,
    traits,
    tacticalSkills
  };

  await writeFile(
    path.join(outRoot, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  );
  await writeFile(
    path.join(dataDir, 'dakLoadoutAssets.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  );

  const traitsByGroup = traitGroups.map((group) => {
    const active = traits
      .filter((trait) => trait.group === group.key && trait.active)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    return [
      group.key,
      group.name,
      group.tooltip,
      group.image,
      active.map((trait) => `${trait.name} (${trait.typeName}, ${trait.id})`).join('<br>')
    ];
  });

  const inactiveTraits = traits
    .filter((trait) => !trait.active)
    .sort((a, b) => a.id - b.id)
    .map((trait) => [
      String(trait.id),
      trait.name,
      trait.groupName,
      trait.typeName,
      trait.image
    ]);

  const tacticalRows = tacticalSkills.map((skill) => [
    String(skill.id),
    skill.name,
    skill.tooltip,
    skill.imageAvailable ? skill.image : `缺失：${skill.imageUrl}`
  ]);

  const missingImages = [...traitGroups, ...traits, ...tacticalSkills]
    .filter((item) => !item.imageAvailable)
    .map((item) => [
      String(item.id || item.key),
      item.name,
      item.imageUrl,
      item.imageDownloadError
    ]);

  const doc = `# DAK.GG 潜能与战术技能素材

来源页面：${sourcePage}?hl=${locale}

数据接口：
- ${apiBase}/trait-skills?hl=${locale}
- ${apiBase}/tactical-skills?hl=${locale}

生成时间：${generatedAt}

## 命名规范

- 潜能分组图标：\`assets/loadout/trait-groups/group-{groupKey}.png\`
- 潜能图标：\`assets/loadout/traits/trait-{id}-{groupKey}-{type}.png\`
- 战术技能图标：\`assets/loadout/tactical-skills/tactical-{id}.png\`
- 机器可读清单：\`assets/loadout/manifest.json\`
- 前端可直接 import 的副本：\`src/data/dakLoadoutAssets.json\`

## 潜能分组与附属关系

${markdownTable(traitsByGroup, ['group', '分组名', '说明', '分组图片', '启用潜能'])}

## 未启用/旧潜能

这些条目由 DAK.GG 接口返回，但 \`active=false\`，通常不出现在当前模拟器可选列表中。

${markdownTable(inactiveTraits, ['id', '潜能名', '分组', '类型', '图片'])}

## 战术技能

${markdownTable(tacticalRows, ['id', '名称', '说明', '图片'])}

## 缺失图片

${missingImages.length ? markdownTable(missingImages, ['id/key', '名称', '原始 URL', '错误']) : '无。'}
`;

  await writeFile(path.join(docsDir, 'dak-loadout-assets.md'), doc, 'utf8');

  console.log(JSON.stringify(manifest.counts, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
