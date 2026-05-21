import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const cacheDir = path.join(rootDir, '.er-gamedata-cache');
const outDir = path.join(rootDir, 'src', 'data');
const outFile = path.join(outDir, 'erGameData.json');
const repoUrl = 'https://github.com/pypy-vrc/er-gamedata.git';

const SKILL_SLOT_LABELS = new Map([
  [100, 'P'],
  [200, 'Q'],
  [300, 'W'],
  [400, 'E'],
  [500, 'R']
]);

const GRADE_LABELS = {
  Common: '普通',
  Uncommon: '高级',
  Rare: '稀有',
  Epic: '英雄',
  Legend: '传说',
  Mythic: '神话'
};

const WEAPON_TYPE_LABELS = {
  OneHandSword: '短剑',
  TwoHandSword: '双手剑',
  DualSword: '双剑',
  Hammer: '锤',
  Axe: '斧',
  Spear: '长枪',
  Bat: '棍棒',
  Whip: '鞭子',
  Glove: '拳套',
  Tonfa: '拐棍',
  Nunchaku: '双节棍',
  HighAngleFire: '投掷',
  DirectFire: '暗器',
  Bow: '弓',
  CrossBow: '弩',
  Pistol: '手枪',
  AssaultRifle: '突击步枪',
  SniperRifle: '狙击枪',
  Rapier: '刺剑',
  Guitar: '吉他',
  Camera: '相机',
  Arcana: '圣器',
  VFArm: 'VF义体'
};

const ARMOR_SLOT_LABELS = {
  Chest: '衣服',
  Head: '头部',
  Arm: '手部',
  Leg: '鞋子'
};

const STAT_FIELDS = [
  ['attackPower', 'AttackPower'],
  ['attackPowerByLv', 'AttackPowerByLv'],
  ['defense', 'Defense'],
  ['defenseByLv', 'DefenseByLv'],
  ['skillAmp', 'SkillAmp'],
  ['skillAmpByLevel', 'SkillAmpByLv'],
  ['skillAmpRatio', 'SkillAmpRatio'],
  ['skillAmpRatioByLevel', 'SkillAmpRatioByLv'],
  ['adaptiveForce', 'AdaptiveForce'],
  ['adaptiveForceByLevel', 'AdaptiveForceByLevel'],
  ['maxHp', 'MaxHp'],
  ['maxHpByLv', 'MaxHpByLv'],
  ['hpRegenRatio', 'HpRegenRatio'],
  ['hpRegen', 'HpRegen'],
  ['attackSpeedRatio', 'AttackSpeedRatioValue'],
  ['attackSpeedRatioByLv', 'AttackSpeedRatioByLv'],
  ['criticalStrikeChance', 'CriticalStrikeChance'],
  ['criticalStrikeDamage', 'CriticalStrikeDamage'],
  ['preventCriticalStrikeDamaged', 'PreventCriticalStrikeDamaged'],
  ['cooldownReduction', 'CooldownReduction'],
  ['cooldownLimit', 'CooldownLimit'],
  ['lifeSteal', 'LifeSteal'],
  ['normalLifeSteal', 'NormalLifeSteal'],
  ['skillLifeSteal', 'SkillLifeSteal'],
  ['moveSpeed', 'MoveSpeed'],
  ['moveSpeedRatio', 'MoveSpeedRatio'],
  ['moveSpeedOutOfCombat', 'MoveSpeedOutOfCombat'],
  ['sightRange', 'SightRange'],
  ['attackRange', 'AttackRange'],
  ['increaseBasicAttackDamage', 'IncreaseBasicAttackDamage'],
  ['increaseBasicAttackDamageByLv', 'IncreaseBasicAttackDamageByLv'],
  ['increaseBasicAttackDamageRatio', 'IncreaseBasicAttackDamageRatio'],
  ['increaseBasicAttackDamageRatioByLv', 'IncreaseBasicAttackDamageRatioByLv'],
  ['preventBasicAttackDamaged', 'PreventBasicAttackDamaged'],
  ['preventBasicAttackDamagedByLv', 'PreventBasicAttackDamagedByLv'],
  ['preventBasicAttackDamagedRatio', 'PreventBasicAttackDamagedRatio'],
  ['preventBasicAttackDamagedRatioByLv', 'PreventBasicAttackDamagedRatioByLv'],
  ['preventSkillDamaged', 'PreventSkillDamaged'],
  ['preventSkillDamagedByLv', 'PreventSkillDamagedByLv'],
  ['preventSkillDamagedRatio', 'PreventSkillDamagedRatio'],
  ['preventSkillDamagedRatioByLv', 'PreventSkillDamagedRatioByLv'],
  ['penetrationDefense', 'PenetrationDefense'],
  ['penetrationDefenseRatio', 'PenetrationDefenseRatio'],
  ['trapDamageReduce', 'TrapDamageReduce'],
  ['trapDamageReduceRatio', 'TrapDamageReduceRatio'],
  ['slowResistRatio', 'SlowResistRatio'],
  ['hpHealedIncreaseRatio', 'HpHealedIncreaseRatio'],
  ['healerGiveHpHealRatio', 'HealerGiveHpHealRatio'],
  ['uniqueAttackRange', 'AttackRange'],
  ['uniqueHpHealedIncreaseRatio', 'HpHealedIncreaseRatio'],
  ['uniqueCooldownLimit', 'CooldownLimit'],
  ['uniqueTenacity', 'Tenacity'],
  ['uniqueMoveSpeed', 'MoveSpeed'],
  ['uniquePenetrationDefense', 'PenetrationDefense'],
  ['uniquePenetrationDefenseRatio', 'PenetrationDefenseRatio'],
  ['uniqueLifeSteal', 'LifeSteal'],
  ['uniqueSkillAmpRatio', 'UniqueSkillAmpRatio'],
  ['ultCooldownReduction', 'UltCooldownReduction'],
  ['weaponCooldownReduction', 'WeaponCooldownReduction'],
  ['tacticalCooldownReduction', 'TacticalCooldownReduction']
];

const PERCENT_STAT_KEYS = new Set(STAT_FIELDS
  .map(([key]) => key)
  .filter((key) => (
    key.includes('Ratio') ||
    key.includes('Chance') ||
    key.includes('cooldown') ||
    key.includes('Cooldown') ||
    key.includes('lifeSteal') ||
    key.includes('LifeSteal') ||
    key.includes('criticalStrikeDamage') ||
    key.includes('uniqueTenacity')
  )));

function run(command, args, options = {}) {
  execFileSync(command, args, { stdio: 'inherit', cwd: rootDir, ...options });
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

function cleanText(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
}

function valuesByLevel(value) {
  if (typeof value === 'number') return [value];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const entries = Object.entries(value)
    .map(([level, next]) => [Number(level), Number(next)])
    .filter(([level, next]) => Number.isFinite(level) && Number.isFinite(next))
    .sort((a, b) => a[0] - b[0]);

  if (!entries.length) return null;
  return entries.map(([, next]) => next);
}

function scalarOrLevels(value) {
  if (typeof value === 'number') return { scalar: value };
  const levels = valuesByLevel(value);
  return levels ? { levels } : { scalar: 0 };
}

function coefficientExpression(rawValue, variable) {
  const parsed = scalarOrLevels(rawValue);
  if (parsed.levels) return `${variable} * ${JSON.stringify(parsed.levels)}[level - 1]`;
  return `${variable} * ${parsed.scalar}`;
}

function pushDamageSkill(output, baseKey, coefKey, meta) {
  const bases = valuesByLevel(meta.data[baseKey]);
  if (!bases) return;

  const coef = meta.data[coefKey] ?? meta.data.SkillApCoef ?? meta.data.SkillApCoefByLevel ?? meta.data.ApCoefficient ?? 0;
  output.push({
    id: `${meta.character.code}-${meta.group.group}-${baseKey}`,
    source: 'er-gamedata',
    hero: meta.heroName,
    title: `${meta.slot} ${meta.partLabel}`,
    bases: bases.join(','),
    formula: `base + ${coefficientExpression(coef, 'ap')}`,
    maxLevel: bases.length,
    group: meta.group.group,
    skillId: meta.group.skillId,
    dataKey: baseKey,
    coefKey,
    description: meta.description,
    coefficientText: meta.coefficientText,
    rawData: meta.data
  });
}

function inferDamageSkills({ character, heroName, group, extension, l10n }) {
  if (!extension) return [];

  const data = JSON.parse(extension.data);
  const output = [];
  const slot = SKILL_SLOT_LABELS.get(group.group % 1000) || group.skillType || 'Skill';
  const baseName = l10n[`Skill/Group/Name/${group.group}`] || group.name || group.skillId || extension.name;
  const description = cleanText(l10n[`Skill/Group/Desc/${group.group}`] || l10n[`Skill/LobbyDesc/${group.group}`] || '');
  const coefficientText = cleanText(l10n[`Skill/Group/Coef/${group.group}`] || '');
  const metaBase = { character, heroName, group, data, slot, description, coefficientText };

  const damagePairs = [
    ['DamageByLevel', 'SkillApCoef'],
    ['DamageByLevel_2', 'SkillApCoef_2'],
    ['MinDamageByLevel', 'MinSkillApCoef'],
    ['MaxDamageByLevel', 'MaxSkillApCoef'],
    ['MinSkillDamage', 'MinSkillApCoef'],
    ['MaxSkillDamage', 'MaxSkillApCoef'],
    ['BaseDamage', 'BaseSkillApCoef'],
    ['AdditionalDamagePerHit', 'AdditionalSkillApCoefPerHit'],
    ['Damage', 'SkillApCoef'],
    ['SkillDamage', 'SkillApCoef'],
    ['FinishDamageByLevel', 'FinishSkillApCoef'],
    ['DFS_DamageByLevel', 'DFS_DamageApCoefByLevel'],
    ['A1BaseDamage', 'A1ApDamage'],
    ['A2BaseMinDamage', 'A2ApDamage'],
    ['A2BaseMaxDamage', 'A2ApDamage'],
    ['A3BaseDamage', 'A3ApDamage'],
    ['A3_1BaseDamage', 'A3_1ApDamage'],
    ['A3_2BaseDamage', 'A3_2ApDamage'],
    ['A4DamageBase', 'A4ApDamage'],
    ['A4ProjectileBaseDamage', 'A4ProjectileApDamage'],
    ['A4ConcentrationEndBaseDamage', 'A4ConcentrationEndApDamage']
  ];

  for (const [baseKey, coefKey] of damagePairs) {
    const suffix = output.length ? ` ${output.length + 1}` : '';
    pushDamageSkill(output, baseKey, coefKey, {
      ...metaBase,
      partLabel: `${cleanText(baseName)}${suffix}`
    });
  }

  return output;
}

function statDefinitions(l10n) {
  return STAT_FIELDS.map(([key, statType]) => ({
    key,
    statType,
    label: cleanText(l10n[`StatType/${statType}`] || statType),
    description: cleanText(l10n[`StatType/${statType}/Desc`] || ''),
    format: PERCENT_STAT_KEYS.has(key) ? 'percent' : 'number',
    unique: key.startsWith('unique')
  }));
}

function itemSlot(item) {
  if (item.itemType === 'Weapon') return '武器';
  return ARMOR_SLOT_LABELS[item.armorType] || item.armorType || item.itemType;
}

function itemTypeLabel(item) {
  if (item.itemType === 'Weapon') {
    const label = WEAPON_TYPE_LABELS[item.weaponType] || item.weaponType || '武器';
    return `${label} / ${item.weaponType}`;
  }
  return ARMOR_SLOT_LABELS[item.armorType] || item.armorType || item.itemType;
}

function itemStats(item) {
  return Object.fromEntries(
    STAT_FIELDS
      .map(([key]) => [key, Number(item[key] || 0)])
      .filter(([, value]) => Number.isFinite(value) && value !== 0)
  );
}

function convertEquipmentItem(item, l10n) {
  const stats = itemStats(item);
  const name = l10n[`Item/Name/${item.code}`] || item.name || String(item.code);

  return {
    code: item.code,
    source: 'er-gamedata',
    type: itemSlot(item),
    itemType: item.itemType,
    weaponType: item.itemType === 'Weapon' ? itemTypeLabel(item) : '',
    weaponTypeRaw: item.weaponType || '',
    armorType: item.armorType || '',
    name,
    quality: GRADE_LABELS[item.itemGrade] || item.itemGrade,
    itemGrade: item.itemGrade,
    isCompletedItem: Boolean(item.isCompletedItem),
    showInItemBook: item.showInItemBook !== false,
    makeMaterial1: item.makeMaterial1 || 0,
    makeMaterial2: item.makeMaterial2 || 0,
    effect: cleanText(l10n[`Item/Desc/${item.code}`] || ''),
    stats,
    ap: (stats.skillAmp || 0) + (stats.adaptiveForce || 0),
    attackPower: stats.attackPower || 0,
    cd: stats.cooldownReduction || 0,
    pen: (stats.penetrationDefense || 0) + (stats.uniquePenetrationDefense || 0),
    penPct: (stats.penetrationDefenseRatio || 0) + (stats.uniquePenetrationDefenseRatio || 0),
    apPct: (stats.skillAmpRatio || 0) + (stats.uniqueSkillAmpRatio || 0),
    defense: stats.defense || 0,
    maxHp: stats.maxHp || 0,
    sightRange: stats.sightRange || 0,
    dmgAmp: 0
  };
}

function skillVersionTime(skill) {
  const value = skill?.updatedAt || skill?.updateDate || skill?.updatedDate || skill?.patch || skill?.version || '';
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return parsed;
  const numeric = String(value).match(/\d+(?:\.\d+)*/)?.[0];
  return numeric ? Number(numeric.replace(/\./g, '').padEnd(8, '0')) : 0;
}

function skillDedupeKey(skill) {
  return [
    skill.hero || '',
    skill.group || '',
    skill.skillId || '',
    skill.dataKey || '',
    skill.title || ''
  ].join('|');
}

function dedupeSkillsByLatest(skills) {
  const latest = new Map();
  skills.forEach((skill, index) => {
    const key = skillDedupeKey(skill);
    const current = latest.get(key);
    const nextTime = skillVersionTime(skill);
    const currentTime = current ? skillVersionTime(current.skill) : -1;
    if (!current || nextTime > currentTime || (nextTime === currentTime && index > current.index)) {
      latest.set(key, { skill, index });
    }
  });
  return Array.from(latest.values())
    .sort((a, b) => a.index - b.index)
    .map(({ skill }) => skill);
}

async function ensureRepo() {
  if (!existsSync(cacheDir)) {
    try {
      run('git', ['clone', '--depth', '1', repoUrl, cacheDir]);
      return true;
    } catch (error) {
      if (existsSync(outFile)) {
        console.warn('Unable to clone er-gamedata; keeping the existing generated data file.');
        return false;
      }
      throw error;
    }
  }

  try {
    run('git', ['-C', cacheDir, 'pull', '--ff-only']);
  } catch {
    console.warn('Unable to pull latest er-gamedata; using the existing local cache.');
  }
  return true;
}

async function main() {
  if (!await ensureRepo()) return;

  const [characters, levelStats, masteries, attributes, skillGroups, skillExtensions, itemWeapons, itemArmors, zh, en] = await Promise.all([
    readJson('data/Character.json'),
    readJson('data/CharacterLevelUpStat.json'),
    readJson('data/CharacterMastery.json'),
    readJson('data/CharacterAttributes.json'),
    readJson('data/SkillGroup.json'),
    readJson('data/SkillExtension.json'),
    readJson('data/ItemWeapon.json'),
    readJson('data/ItemArmor.json'),
    loadL10n('ChineseSimplified'),
    loadL10n('English')
  ]);

  const levelByCode = new Map(levelStats.map((item) => [item.code, item]));
  const masteryByCode = new Map(masteries.map((item) => [item.code, item]));
  const attributesByCode = attributes.reduce((groups, item) => {
    groups.set(item.characterCode, [...(groups.get(item.characterCode) || []), item]);
    return groups;
  }, new Map());
  const extensionsByName = new Map(skillExtensions.map((item) => [item.name.replace(/Data$/, ''), item]));

  const characterRows = characters
    .filter((character) => character.code > 0 && character.name && character.name !== 'None')
    .map((character) => {
      const mastery = masteryByCode.get(character.code) || {};
      return {
        code: character.code,
        id: character.name,
        name: zh[`Character/Name/${character.code}`] || character.name,
        englishName: en[`Character/Name/${character.code}`] || character.name,
        resource: character.resource,
        archetypes: [character.charArcheType1, character.charArcheType2].filter((type) => type && type !== 'None'),
        weaponRangeType: character.weaponRangeType,
        weapons: ['weapon1', 'weapon2', 'weapon3', 'weapon4']
          .map((key) => mastery[key])
          .filter((weapon) => weapon && weapon !== 'None'),
        base: {
          hp: character.maxHp,
          attackPower: character.attackPower,
          defense: character.defense,
          skillAmp: character.skillAmp,
          moveSpeed: character.moveSpeed,
          attackSpeed: character.attackSpeed
        },
        growth: levelByCode.get(character.code) || null,
        ratings: attributesByCode.get(character.code) || [],
        playTip: cleanText(zh[`CharacterPlayTip/${character.code}`] || ''),
        storyName: zh[`CharacterStoryName/${character.code}`] || '',
        image: `/assets/characters/${String(character.code).padStart(3, '0')}-${character.resource}.png`
      };
    })
    .sort((a, b) => a.code - b.code);

  const characterByCode = new Map(characterRows.map((character) => [character.code, character]));
  const skills = [];
  const rawSkillGroups = [];

  for (const group of skillGroups) {
    const characterCode = Math.floor((group.group - 1000000) / 1000);
    const character = characterByCode.get(characterCode);
    if (!character || !SKILL_SLOT_LABELS.has(group.group % 1000)) continue;

    const extension =
      extensionsByName.get(group.skillId) ||
      extensionsByName.get(group.passiveSkillId) ||
      extensionsByName.get(`${character.id}Skill`);

    rawSkillGroups.push({
      hero: character.name,
      characterCode,
      group: group.group,
      slot: SKILL_SLOT_LABELS.get(group.group % 1000),
      skillId: group.skillId,
      passiveSkillId: group.passiveSkillId,
      name: zh[`Skill/Group/Name/${group.group}`] || group.name,
      description: cleanText(zh[`Skill/Group/Desc/${group.group}`] || zh[`Skill/LobbyDesc/${group.group}`] || ''),
      coefficientText: cleanText(zh[`Skill/Group/Coef/${group.group}`] || ''),
      extensionName: extension?.name || ''
    });

    skills.push(...inferDamageSkills({
      character: { code: character.code, id: character.id },
      heroName: character.name,
      group,
      extension,
      l10n: zh
    }));
  }

  const dedupedSkills = dedupeSkillsByLatest(skills);
  const itemStatDefinitions = statDefinitions(zh);
  const equipment = [...itemWeapons, ...itemArmors]
    .filter((item) => item.showInItemBook !== false && item.modeType === 0)
    .map((item) => convertEquipmentItem(item, zh))
    .sort((a, b) => a.code - b.code);

  const payload = {
    source: repoUrl,
    generatedAt: new Date().toISOString(),
    counts: {
      characters: characterRows.length,
      rawSkillGroups: rawSkillGroups.length,
      calculableSkills: dedupedSkills.length,
      equipment: equipment.length
    },
    characters: characterRows,
    rawSkillGroups,
    skills: dedupedSkills,
    itemStatDefinitions,
    equipment
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(outFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(`Wrote ${path.relative(rootDir, outFile)}`);
  console.log(`Characters: ${payload.counts.characters}, equipment: ${payload.counts.equipment}, skill groups: ${payload.counts.rawSkillGroups}, calculable skills: ${payload.counts.calculableSkills}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
