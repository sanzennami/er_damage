import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const cacheDir = path.join(rootDir, '.er-gamedata-cache');
const dataDir = path.join(cacheDir, 'data');
const outDir = path.join(rootDir, 'docs', 'skill-damage-audit');
const dakApiBase = 'https://er.dakgg.io/api/v1/data';

const defaultTargets = ['Laura', 'Justyna'];
const targets = process.argv.slice(2).length ? process.argv.slice(2) : defaultTargets;
const generatedAt = new Date().toISOString();

const DAMAGE_KEY_RE = /damage|skilldamage|attackdamage|basedamage|apcoef|coef|skillamp|atkcoef|defcoef/i;
const DETAIL_VALUE_CANDIDATES = new Set([50, 70, 0.4, 0.7, 40, 70]);

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
      .map((line) => line.split('┃'))
      .filter((parts) => parts.length >= 2)
      .map(([key, ...value]) => [key, value.join('┃')])
  );
}

async function fetchDakSkills() {
  const response = await fetch(`${dakApiBase}/skills?hl=zh-CN`, {
    headers: {
      accept: 'application/json',
      referer: 'https://dak.gg/er/routes/simulator/YuMin?hl=zh-CN',
      'user-agent': 'Mozilla/5.0'
    }
  });
  if (!response.ok) return [];
  const payload = await response.json();
  return payload.skills || [];
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

function targetMatcher(target) {
  const lower = target.toLowerCase();
  return (character, names) => (
    String(character.code) === target ||
    String(character.name || '').toLowerCase() === lower ||
    String(character.resource || '').toLowerCase() === lower ||
    names.some((name) => String(name || '').toLowerCase() === lower)
  );
}

function flattenValues(value, prefix = '') {
  if (value === null || value === undefined) return [];
  if (typeof value !== 'object') return [{ path: prefix, value }];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenValues(item, `${prefix}[${index}]`));
  }
  return Object.entries(value).flatMap(([key, next]) => flattenValues(next, prefix ? `${prefix}.${key}` : key));
}

function collectDamageLikeFields(row) {
  return flattenValues(row)
    .filter(({ path: key, value }) => DAMAGE_KEY_RE.test(key) || (
      typeof value === 'number' && DETAIL_VALUE_CANDIDATES.has(value) && DAMAGE_KEY_RE.test(JSON.stringify(row))
    ))
    .map(({ path: key, value }) => ({ key, value }));
}

function containsAnyIdentifier(rowText, identifiers) {
  return identifiers.some((id) => id && rowText.includes(String(id)));
}

function rowLooksRelated(row, skillGroups, identifiers) {
  const rowText = JSON.stringify(row);
  if (containsAnyIdentifier(rowText, identifiers)) return true;

  const groupSet = new Set(skillGroups.map((group) => Number(group.group)));
  const codePrefixes = new Set(skillGroups.map((group) => String(group.group).slice(0, 4)));
  return flattenValues(row).some(({ path: key, value }) => {
    if (key.endsWith('group') || key.endsWith('Group') || key.includes('skillGroup')) {
      if (groupSet.has(Number(value))) return true;
    }
    if ((key.endsWith('code') || key.endsWith('Code')) && typeof value === 'number') {
      return codePrefixes.has(String(value).slice(0, 4));
    }
    return false;
  });
}

function extensionForGroup(group, extensionsByName, character) {
  return (
    extensionsByName.get(group.skillId) ||
    extensionsByName.get(group.passiveSkillId) ||
    extensionsByName.get(`${character.name}Skill`) ||
    null
  );
}

function l10nRowsForGroup(group, zh) {
  const keys = [
    `Skill/Group/Name/${group.group}`,
    `Skill/LobbyDesc/${group.group}`,
    `Skill/Group/Desc/${group.group}`,
    `Skill/Group/Coef/${group.group}`
  ];
  return Object.fromEntries(keys.map((key) => [key, cleanText(zh[key] || '')]));
}

function markdownTable(rows, headers) {
  const line = (cells) => `| ${cells.map((cell) => String(cell ?? '').replace(/\r?\n/g, '<br>')).join(' | ')} |`;
  return [
    line(headers),
    line(headers.map(() => '---')),
    ...rows.map((row) => line(row))
  ].join('\n');
}

async function auditTarget(target, context) {
  const { characters, zh, en, skillGroups, skillRows, skillIndicators, skillExtensions, dakSkills, jsonFiles } = context;
  const character = characters.find((next) => {
    const names = [
      zh[`Character/Name/${next.code}`],
      en[`Character/Name/${next.code}`]
    ];
    return targetMatcher(target)(next, names);
  });

  if (!character) {
    return { target, found: false, reason: 'character_not_found' };
  }

  const heroNames = [
    character.name,
    character.resource,
    zh[`Character/Name/${character.code}`],
    en[`Character/Name/${character.code}`]
  ].filter(Boolean);

  const heroSkillGroups = skillGroups
    .filter((group) => Math.floor((Number(group.group) - 1000000) / 1000) === Number(character.code))
    .sort((a, b) => Number(a.group) - Number(b.group));

  const skillLevelCodes = skillRows
    .filter((skill) => heroSkillGroups.some((group) => group.group === skill.group))
    .map((skill) => skill.code);
  const indicatorLevelCodes = skillIndicators
    .filter((skill) => heroSkillGroups.some((group) => group.group === skill.group))
    .map((skill) => skill.code);

  const identifiers = [
    ...heroNames,
    ...skillLevelCodes,
    ...indicatorLevelCodes,
    ...heroSkillGroups.flatMap((group) => [
      group.group,
      group.skillId,
      group.passiveSkillId,
      group.icon,
      group.toolTipReferSkillGroupCode || ''
    ])
  ].filter((value) => value && value !== 'None');

  const extensionsByName = new Map(skillExtensions.map((extension) => [extension.name.replace(/Data$/, ''), extension]));
  const numericReferenceIds = Array.from(new Set([
    ...heroSkillGroups.map((group) => Number(group.group)),
    ...skillLevelCodes.map(Number),
    ...indicatorLevelCodes.map(Number)
  ].filter(Number.isFinite)));
  const skillExtensionNumericHits = skillExtensions
    .map((extension) => {
      const text = JSON.stringify(extension);
      const matchedIds = numericReferenceIds.filter((id) => text.includes(String(id)));
      return {
        key: extension.key,
        name: extension.name,
        matchedIds,
        damageFields: matchedIds.length ? collectDamageLikeFields(JSON.parse(extension.data || '{}')) : []
      };
    })
    .filter((extension) => extension.matchedIds.length);
  const linkedExtensions = heroSkillGroups
    .map((group) => {
      const extension = extensionForGroup(group, extensionsByName, character);
      let fields = [];
      let damageFields = [];
      if (extension) {
        const data = JSON.parse(extension.data);
        fields = Object.keys(data).sort();
        damageFields = fields.filter((key) => DAMAGE_KEY_RE.test(key));
      }
      return {
        group: group.group,
        skillId: group.skillId,
        passiveSkillId: group.passiveSkillId,
        extensionName: extension?.name || '',
        hasExtension: Boolean(extension),
        fields,
        damageFields
      };
    });

  const dakRows = dakSkills
    .filter((skill) => Number(skill.characterId) === Number(character.code))
    .map((skill) => ({
      id: skill.id,
      slot: skill.slot,
      name: cleanText(skill.name),
      tooltip: cleanText(skill.tooltip)
    }));

  const groupRows = heroSkillGroups.map((group) => {
    const levels = skillRows.filter((skill) => skill.group === group.group).map((skill) => skill.code);
    const indicators = skillIndicators.filter((skill) => skill.group === group.group).map((skill) => skill.code);
    const l10n = l10nRowsForGroup(group, zh);
    return {
      group: group.group,
      skillId: group.skillId,
      passiveSkillId: group.passiveSkillId,
      icon: group.icon,
      tooltipRefer: group.toolTipReferSkillGroupCode || '',
      skillLevels: levels,
      indicatorLevels: indicators,
      l10n,
      coefHasPlaceholders: /\{\d+\}/.test(l10n[`Skill/Group/Coef/${group.group}`] || ''),
      descHasPlaceholders: /\{\d+\}/.test(l10n[`Skill/Group/Desc/${group.group}`] || '')
    };
  });

  const evidence = [];
  for (const filePath of jsonFiles) {
    const relativePath = path.relative(cacheDir, filePath).replace(/\\/g, '/');
    const rows = JSON.parse(await readFile(filePath, 'utf8'));
    if (!Array.isArray(rows)) continue;

    let relatedRows = 0;
    let damageLikeRows = 0;
    const samples = [];

    for (const row of rows) {
      if (!rowLooksRelated(row, heroSkillGroups, identifiers)) continue;
      relatedRows += 1;
      const damageFields = collectDamageLikeFields(row);
      if (damageFields.length) damageLikeRows += 1;
      if (samples.length < 8) {
        samples.push({
          rowKey: row.code ?? row.group ?? row.key ?? row.name ?? '',
          damageFields: damageFields.slice(0, 20),
          row
        });
      }
    }

    if (relatedRows) {
      evidence.push({
        file: relativePath,
        relatedRows,
        damageLikeRows,
        samples
      });
    }
  }

  const hasLinkedDamageExtension = linkedExtensions.some((item) => item.damageFields.length > 0);
  const hasAnyDamageLikeEvidence = evidence.some((item) => item.damageLikeRows > 0);

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
    conclusion: hasLinkedDamageExtension
      ? 'linked_structured_damage_exists'
      : hasAnyDamageLikeEvidence
        ? 'related_tables_exist_but_no_linked_skill_extension_damage'
        : 'no_structured_damage_data_found_in_repo',
    groupRows,
    linkedExtensions,
    skillExtensionNumericHits,
    dakRows,
    evidence
  };
}

function buildDoc(results) {
  const summaryRows = results.map((result) => [
    result.target,
    result.character ? `${result.character.zhName || result.character.key} (${result.character.key}, ${result.character.code})` : '-',
    result.conclusion || result.reason,
    result.groupRows?.length || 0,
    result.linkedExtensions?.filter((item) => item.hasExtension).length || 0,
    result.linkedExtensions?.filter((item) => item.damageFields.length).length || 0,
    result.skillExtensionNumericHits?.length || 0
  ]);

  const sections = results.map((result) => {
    if (!result.found) return `## ${result.target}\n\n未找到实验体。`;

    const groupTable = result.groupRows.map((group) => [
      group.group,
      group.skillId,
      group.passiveSkillId,
      group.skillLevels.join('|'),
      group.indicatorLevels.join('|'),
      group.coefHasPlaceholders ? 'yes' : 'no',
      group.l10n[`Skill/Group/Coef/${group.group}`] || group.l10n[`Skill/Group/Desc/${group.group}`] || ''
    ]);

    const extensionTable = result.linkedExtensions.map((extension) => [
      extension.group,
      extension.skillId,
      extension.passiveSkillId,
      extension.extensionName || '-',
      extension.damageFields.join('|') || '-'
    ]);

    const numericExtensionTable = result.skillExtensionNumericHits.map((extension) => [
      extension.key,
      extension.name,
      extension.matchedIds.join('|'),
      extension.damageFields.map((field) => `${field.key}=${field.value}`).join('|') || '-'
    ]);

    const evidenceTable = result.evidence.map((item) => [
      item.file,
      item.relatedRows,
      item.damageLikeRows,
      item.samples.map((sample) => sample.rowKey).join('|')
    ]);

    const dakTable = result.dakRows.map((row) => [
      row.id,
      row.slot,
      row.name,
      row.tooltip
    ]);

    return `## ${result.character.zhName || result.character.key} (${result.character.key})

结论：\`${result.conclusion}\`

### 技能组与文本模板

${markdownTable(groupTable, ['group', 'skillId', 'passiveSkillId', 'Skill codes', 'Indicator codes', '系数占位符', 'Coef/Desc 文本'])}

### SkillExtension 链接情况

${markdownTable(extensionTable, ['group', 'skillId', 'passiveSkillId', '链接 Extension', '伤害/系数字段'])}

### SkillExtension 编号反查

这里会使用技能组编号和技能等级编号反查 SkillExtension，用于确认是否存在只用编号、不用 skillId 明文的隐藏关联。

${markdownTable(numericExtensionTable, ['key', 'Extension', '命中技能编号', '伤害/系数字段'])}

### DAK 当前简略文本

${markdownTable(dakTable, ['id', '槽位', '名称', 'tooltip'])}

### 全库 JSON 命中证据

${markdownTable(evidenceTable, ['文件', '相关行数', '伤害/系数字段行数', '样例 key'])}
`;
  }).join('\n\n');

  return `# 缺失技能伤害数据审计

生成时间：${generatedAt}

这个审计脚本会扫描整个 \`.er-gamedata-cache\` 数据目录，而不只看 \`SkillExtension.json\`。它会确认目标实验体的技能组、等级表、状态表、投射物表、文本模板是否存在，并判断是否存在可直接链接到技能组的结构化伤害字段。

## 总览

${markdownTable(summaryRows, ['目标', '实验体', '结论', '技能组数', '链接 Extension 数', '含伤害 Extension 数', 'SkillExtension 编号命中'])}

## 关键解释

- \`Skill.json\` / \`Skill_Indicator.json\` 存在技能等级、冷却、范围、消耗等数据，但不包含技能伤害数值。
- \`Skill/Group/Coef/*\` 文本里有 \`{0}\`、\`{1}\` 这类占位符，能证明客户端需要参数，但仓库里未必包含这些参数的来源。
- 截图中尤斯蒂娜 Q 的 \`50(+技能增幅40%)\`、\`70(+技能增幅70%)\` 对应 \`Skill/Group/Coef/1079200\` 的占位符，但在当前仓库 JSON 中没有找到可链接的参数表。

${sections}
`;
}

async function main() {
  const [characters, skillGroups, skillRows, skillIndicators, skillExtensions, zh, en, dakSkills, jsonFiles] = await Promise.all([
    readJson('data/Character.json'),
    readJson('data/SkillGroup.json'),
    readJson('data/Skill.json'),
    readJson('data/Skill_Indicator.json'),
    readJson('data/SkillExtension.json'),
    loadL10n('ChineseSimplified'),
    loadL10n('English'),
    fetchDakSkills(),
    listJsonFiles(dataDir)
  ]);

  const context = { characters, skillGroups, skillRows, skillIndicators, skillExtensions, zh, en, dakSkills, jsonFiles };
  const results = [];
  for (const target of targets) {
    results.push(await auditTarget(target, context));
  }

  const payload = {
    generatedAt,
    targets,
    results
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'missing-skill-damage-audit.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'README.md'), buildDoc(results), 'utf8');

  console.log(JSON.stringify(results.map((result) => ({
    target: result.target,
    character: result.character,
    conclusion: result.conclusion || result.reason,
    skillGroups: result.groupRows?.length || 0,
    linkedExtensions: result.linkedExtensions?.filter((item) => item.hasExtension).length || 0,
    linkedDamageExtensions: result.linkedExtensions?.filter((item) => item.damageFields.length).length || 0,
    skillExtensionNumericHits: result.skillExtensionNumericHits?.length || 0,
    evidenceFiles: result.evidence?.length || 0
  })), null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
