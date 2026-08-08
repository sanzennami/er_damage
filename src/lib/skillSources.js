// 技能数据来源层。
//
// 全部技能条目在这里拼装，App.jsx 只消费结果，不再自己组装。
//
// ## 优先级按「数据权威性」决定，不看条目放在哪个文件里
//
// er-gamedata 是玩家自发维护的解包内容，不保证准确，只用来把技能骨架（技能组、
// 伤害段、文案模板）跑一遍初始化；之后一切数值和效果以官方公告为准。因此同一条
// 技能出现多份数据时，按下面的权威等级取用（数字越大越优先）：
//
//   100 special-skill-rule    人工特殊计算规则（specialSkillRules.json）
//    90 manual                人工录入 / 手改（任何文件里 manual: true 的条目）
//    80 官方公告              official-patch-note、external-official-patch
//    60 in-game-client        客户端界面读数（inGameSkillCapture.json，一次性导入的底稿）
//    40 官方 Wiki             external-wiki-current 等
//    20 er-gamedata 解包      er-skill-damage-table、er-gamedata
//
// 同权威等级再比 updatedAt 取新，仍相同则取靠后的条目。
//
// ## 参与拼装的文件
//
//   src/data/specialSkillRules.json           人工规则（最后整体盖回，不参与比较）
//   src/data/erSkillDamageTable.json          解包骨架；标了 manual 的行会升到 90
//   src/data/inGameSkillCapture.json          客户端界面读数（scripts/ingame-capture.mjs 生成）
//   src/data/skillDamageAugments.json         补充：强化普攻 / 强化技能 / 额外伤害
//   src/data/externalSkillDamageFallback.json Wiki 结构 + 官方公告数值
//   src/data/erGameData.json 的 skills        旧版解包表
//
// **这五个文件都可以手改。** 想让某一条手改值压过所有生成数据，给它加 `"manual": true`。

import ER_GAME_DATA from '../data/erGameData.json';
import ER_SKILL_DAMAGE_TABLE from '../data/erSkillDamageTable.json';
import IN_GAME_SKILL_CAPTURE from '../data/inGameSkillCapture.json';
import SKILL_DAMAGE_AUGMENTS from '../data/skillDamageAugments.json';
import EXTERNAL_SKILL_DAMAGE_FALLBACK from '../data/externalSkillDamageFallback.json';
import DEFAULT_LOCAL_CONFIG from '../data/localConfig.json';
import DATA_MIGRATIONS from '../data/dataMigrations.json';
import { basesFor, clone, finiteDamageValue, getNumber } from './formula.js';
import {
  DEFAULT_HERO,
  MANUAL_HEROES,
  SPECIAL_RULE_COMBOS,
  applySpecialSkillRules,
  isManualHero
} from './specialRules.js';

// ---------------------------------------------------------------------------
// 结构化伤害表 -> 技能条目
// ---------------------------------------------------------------------------

function damageRowBases(row) {
  return [1, 2, 3, 4, 5, 6]
    .map((level) => finiteDamageValue(row[`lv${level}`]))
    .filter((value) => value !== null);
}

function damageRowCoefValues(row) {
  return [1, 2, 3, 4, 5, 6]
    .map((level) => finiteDamageValue(row[`coefLv${level}`]))
    .filter((value) => value !== null);
}

function damageRowScalingVariable(row) {
  const text = String(row.coefficientText || '');
  const hasAttackScaling = /攻击力/.test(text);
  const hasSkillAmpScaling = /技能增幅|Skill Amp/i.test(text);
  if (hasAttackScaling && !hasSkillAmpScaling) return 'attack';
  return 'ap';
}

function damageRowFormula(row) {
  const coefValues = damageRowCoefValues(row);
  if (!coefValues.length || coefValues.every((value) => value === 0)) return 'base';

  const variable = damageRowScalingVariable(row);
  const uniqueValues = Array.from(new Set(coefValues));
  if (uniqueValues.length === 1) return `base + ${variable} * ${uniqueValues[0]}`;

  return `base + ${variable} * ${JSON.stringify(coefValues)}[level - 1]`;
}

function generatedSkillTitle(row) {
  const parts = [row.slot, row.skillName, row.damagePart]
    .map((part) => String(part || '').trim())
    .filter(Boolean);
  return Array.from(new Set(parts)).join(' ');
}

const DAMAGE_TABLE_SKILLS = (ER_SKILL_DAMAGE_TABLE.damageRows || [])
  .map((row, index) => {
    const bases = damageRowBases(row);
    if (!bases.length) return null;
    return {
      id: row.standardId || `${row.heroKey || row.heroName}-${row.skillGroup}-${row.baseKey || index}`,
      hero: row.heroName,
      title: generatedSkillTitle(row),
      bases: bases.join(','),
      // 手改行可以直接写完整公式（含 targetHp / extraAttack 等解包表表达不了的项）；
      // 其余行仍按 lv/coef 推导出 base + 系数 * 变量
      formula: (row.manual === true && row.formula) ? row.formula : damageRowFormula(row),
      maxLevel: bases.length,
      // 手改行（manual: true）按人工录入处理，重新导出解包数据时也不会被覆盖
      source: row.manual === true ? 'manual' : (row.source || 'er-skill-damage-table'),
      manual: row.manual === true,
      description: row.description,
      coefficientText: row.coefficientText,
      group: row.skillGroup,
      skillId: row.skillId,
      dataKey: row.baseKey,
      coefKey: row.coefKey,
      sourceNote: row.sourceNote,
      sourceUrl: row.sourceUrl,
      sourceFile: 'erSkillDamageTable',
      updatedAt: row.updatedAt || ER_SKILL_DAMAGE_TABLE.generatedAt || '',
      sourceIndex: index
    };
  })
  .filter(Boolean);

// 客户端界面读数：只取 skills（等级填齐的），drafts 是等级没凑齐的草稿，不参与拼装。
const IN_GAME_CAPTURE_SKILLS = (IN_GAME_SKILL_CAPTURE.skills || [])
  .filter((skill) => !isManualHero(skill.hero))
  .map((skill, index) => ({
    ...skill,
    source: skill.source || 'in-game-client',
    sourceIndex: skill.sourceIndex ?? index,
    sourceFile: 'inGameSkillCapture',
    updatedAt: skill.updatedAt || skill.capturedAt || IN_GAME_SKILL_CAPTURE.generatedAt || ''
  }));

const AUGMENTED_DAMAGE_SKILLS = (SKILL_DAMAGE_AUGMENTS.skills || [])
  .filter((skill) => !isManualHero(skill.hero))
  .map((skill, index) => ({
    ...skill,
    sourceIndex: skill.sourceIndex ?? index,
    sourceFile: 'skillDamageAugments',
    updatedAt: skill.updatedAt || SKILL_DAMAGE_AUGMENTS.generatedAt || ''
  }));

const EXTERNAL_FALLBACK_DAMAGE_SKILLS = (EXTERNAL_SKILL_DAMAGE_FALLBACK.skills || [])
  .filter((skill) => !isManualHero(skill.hero))
  .map((skill, index) => ({
    ...skill,
    sourceIndex: skill.sourceIndex ?? index,
    sourceFile: 'externalSkillDamageFallback',
    updatedAt: skill.updatedAt || skill.sourceDate || EXTERNAL_SKILL_DAMAGE_FALLBACK.generatedAt || ''
  }));

const LEGACY_GENERATED_SKILLS = (ER_GAME_DATA.skills || [])
  .filter((skill) => !isManualHero(skill.hero))
  .map((skill, index) => ({
    ...skill,
    sourceFile: 'erGameData',
    updatedAt: skill.updatedAt || skill.updateDate || skill.updatedDate || skill.patch || '',
    sourceIndex: index
  }));

const DAMAGE_TABLE_SKILL_KEYS = new Set(DAMAGE_TABLE_SKILLS.map((skill) => `${skill.hero}-${skill.group}-${skill.dataKey}`));

/** 各来源的条目数，用于页面上的“官方数据”说明和排查。 */
/** 参与拼装的文件清单（供页面说明与排查用；优先级看 SKILL_SOURCE_AUTHORITY，不看这里的顺序）。 */
export const SKILL_SOURCE_CHAIN = [
  { key: 'specialSkillRules', label: '特殊计算规则', file: 'src/data/specialSkillRules.json', heroes: MANUAL_HEROES },
  { key: 'erSkillDamageTable', label: 'er-gamedata 解包骨架', file: 'src/data/erSkillDamageTable.json', count: DAMAGE_TABLE_SKILLS.length, manualCount: DAMAGE_TABLE_SKILLS.filter((skill) => skill.manual).length },
  { key: 'inGameSkillCapture', label: '客户端界面读数', file: 'src/data/inGameSkillCapture.json', count: IN_GAME_CAPTURE_SKILLS.length },
  { key: 'skillDamageAugments', label: '技能补充表', file: 'src/data/skillDamageAugments.json', count: AUGMENTED_DAMAGE_SKILLS.length },
  { key: 'externalSkillDamageFallback', label: 'Wiki / 官方公告表', file: 'src/data/externalSkillDamageFallback.json', count: EXTERNAL_FALLBACK_DAMAGE_SKILLS.length },
  { key: 'erGameData', label: '旧版解包表', file: 'src/data/erGameData.json', count: LEGACY_GENERATED_SKILLS.length }
];

const GENERATED_SKILLS = [
  ...DAMAGE_TABLE_SKILLS,
  ...IN_GAME_CAPTURE_SKILLS,
  ...AUGMENTED_DAMAGE_SKILLS,
  ...EXTERNAL_FALLBACK_DAMAGE_SKILLS,
  ...LEGACY_GENERATED_SKILLS.filter((skill) => !DAMAGE_TABLE_SKILL_KEYS.has(`${skill.hero}-${skill.group}-${skill.dataKey}`))
];

// ---------------------------------------------------------------------------
// 去重与合并
// ---------------------------------------------------------------------------

/**
 * 权威等级表。键是条目的 `source` 字段，数字越大越优先。
 * 新增来源时在这里登记；未登记的来源按 30 处理（高于解包、低于 Wiki 与公告）。
 */
export const SKILL_SOURCE_AUTHORITY = {
  'special-skill-rule': 100,
  manual: 90,
  'official-patch-note': 80,
  'external-official-patch': 80,
  // 客户端界面读数：每个实验体只导入一次，作为解包骨架之上的底稿；
  // 之后的版本更新一律靠官方公告覆盖，所以它必须低于公告。
  'in-game-client': 60,
  'external-wiki-current': 40,
  'external-skill-damage-wiki-current': 40,
  // er-gamedata 解包：结构化表比旧版表可信（旧表把不少物理英雄的系数错记成技能增幅）
  'er-skill-damage-table': 20,
  'er-gamedata': 10
};

/** 同权威、同时间时的兜底排序：越靠前的来源文件越可信。 */
const SOURCE_RANK = {
  inGameSkillCapture: 5,
  erSkillDamageTable: 4,
  skillDamageAugments: 3,
  externalSkillDamageFallback: 2,
  erGameData: 1
};

const DEFAULT_SOURCE_AUTHORITY = 30;

/** 条目的权威等级：显式 manual 的条目一律按人工录入处理。 */
export function skillAuthority(skill) {
  if (skill?.manual === true) return SKILL_SOURCE_AUTHORITY.manual;
  const source = String(skill?.source || '');
  if (source in SKILL_SOURCE_AUTHORITY) return SKILL_SOURCE_AUTHORITY[source];
  return DEFAULT_SOURCE_AUTHORITY;
}

function skillVersionTime(skill) {
  const value = skill?.updatedAt || skill?.updateDate || skill?.updatedDate || skill?.patch || skill?.version || '';
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return parsed;
  const numeric = String(value).match(/\d+(?:\.\d+)*/)?.[0];
  return numeric ? Number(numeric.replace(/\./g, '').padEnd(8, '0')) : 0;
}

/**
 * 一段伤害的身份：英雄 + 技能组 + 技能 ID + 伤害段。
 * 同一段伤害无论来自解包表还是官方公告表，身份都相同，只会保留权威最高的那条，
 * 不会再出现「Q 连斩」和「Q 连斩 基础伤害」两行数值不一致的情况。
 * 手动条目通常没有 group/skillId/dataKey，这时退回用标题区分，避免被误合并。
 */
function skillDedupeKey(skill) {
  const hasIdentity = Boolean(skill.group || skill.skillId || skill.dataKey);
  if (!hasIdentity) return `${skill.hero || ''}|title|${skill.title || ''}`;
  return [
    skill.hero || '',
    skill.group || '',
    skill.skillId || '',
    skill.dataKey || ''
  ].join('|');
}

/**
 * 同键去重：先比权威等级（官方公告 > Wiki > 解包），等级相同再比 updatedAt 取新，
 * 仍然相同则取靠后的条目。
 */
export function dedupeSkillsByLatest(skills) {
  const winners = new Map();
  const score = (skill, index) => ({
    skill,
    index,
    authority: skillAuthority(skill),
    time: skillVersionTime(skill),
    rank: SOURCE_RANK[skill.sourceFile] || 0
  });
  skills.forEach((skill, index) => {
    const key = skillDedupeKey(skill);
    const current = winners.get(key);
    if (!current) {
      winners.set(key, score(skill, index));
      return;
    }
    const next = score(skill, index);
    const wins = next.authority !== current.authority
      ? next.authority > current.authority
      : next.time !== current.time
        ? next.time > current.time
        : next.rank !== current.rank
          ? next.rank > current.rank
          : next.index > current.index;
    if (wins) winners.set(key, next);
  });
  return Array.from(winners.values())
    .sort((a, b) => a.index - b.index)
    .map(({ skill }) => skill);
}

function skillProgressiveSignature(skill) {
  if (!skill?.skillId || !skill?.group || !skill?.dataKey) return '';
  return `${skill.skillId}-${skill.group}-${skill.dataKey}`;
}

/** 当前所有合法的英雄名（官方实验体 + 规则表里的手动英雄）。 */
const KNOWN_HERO_NAMES = new Set([
  ...MANUAL_HEROES,
  ...(ER_GAME_DATA.characters || []).map((character) => character.name)
]);

/**
 * 官方改名迁移：旧缓存里保存的英雄名如果已经不存在（例如 11.5 的 Craver 后来定名为「克雷弗」），
 * 就采用内置条目的新名字；如果用户手动把技能挪给了另一个真实存在的英雄，则保留用户的改动。
 */
function migrateHeroName(savedSkill, initialSkill) {
  const savedHero = savedSkill?.hero;
  if (!savedHero || !initialSkill?.hero) return savedHero;
  if (savedHero === initialSkill.hero) return savedHero;
  return KNOWN_HERO_NAMES.has(savedHero) ? savedHero : initialSkill.hero;
}

// 译名修正表：src/data/dataMigrations.json
const SKILL_TITLE_MIGRATIONS = new Map(
  (DATA_MIGRATIONS.skillTitles || []).map((item) => [`${item.id}|${item.from}`, item.to])
);

/**
 * 技能名迁移：只有当旧缓存里的名字和迁移表记录的旧译名完全一致时才替换，
 * 用户自己改过的名字不受影响。
 */
function migrateSkillTitle(savedSkill) {
  return SKILL_TITLE_MIGRATIONS.get(`${savedSkill?.id}|${savedSkill?.title}`) || savedSkill?.title;
}

/** 内置技能表：生成表去重后，再由特殊计算规则整体覆盖。 */
export const INITIAL_SKILLS = applySpecialSkillRules(dedupeSkillsByLatest(GENERATED_SKILLS));

export const HEROES_WITH_SKILL_DAMAGE = new Set(
  INITIAL_SKILLS
    .filter((skill) => basesFor(skill).length)
    .map((skill) => skill.hero)
);

/** 最终生效条目按来源的分布，便于确认官方公告是否真的压过了解包数据。 */
export const SKILL_SOURCE_BREAKDOWN = INITIAL_SKILLS.reduce((counts, skill) => {
  const key = skill.manual ? 'manual' : (skill.source || 'unknown');
  counts[key] = (counts[key] || 0) + 1;
  return counts;
}, {});

export const OFFICIAL_DATA_COUNTS = {
  characters: ER_GAME_DATA.characters?.length || ER_GAME_DATA.counts?.characters || 0,
  calculableSkills: INITIAL_SKILLS.filter((skill) => basesFor(skill).length).length
};

/**
 * 合并浏览器/localConfig 里保存的技能配置。
 * 最后一步同样会重新套用特殊计算规则，保证人工校对的公式不被旧缓存覆盖。
 */
export function mergeSkills(savedSkills) {
  if (!Array.isArray(savedSkills)) return clone(INITIAL_SKILLS);

  const metadataSkills = [
    ...INITIAL_SKILLS,
    ...(Array.isArray(DEFAULT_LOCAL_CONFIG?.skills) ? DEFAULT_LOCAL_CONFIG.skills : [])
  ];
  // 只有内置表里的条目才用于权威比较；localConfig 里的镜像本身可能已经过期
  const canonicalById = new Map(INITIAL_SKILLS.map((skill) => [skill.id, skill]));
  const initialById = new Map(metadataSkills.map((skill) => [skill.id, skill]));
  const initialBySignature = new Map(metadataSkills
    .map((skill) => [skillProgressiveSignature(skill), skill])
    .filter(([key, skill]) => key && skill.progressiveDamage));
  const mergedSaved = savedSkills.map((skill) => {
    const initialSkill = initialById.get(skill.id) || initialBySignature.get(skillProgressiveSignature(skill));
    if (!initialSkill) return skill;
    // 内置条目的权威值更高时（例如把解包行改成了 manual、或官方公告更新了数值），
    // 让内置数据压过 localStorage / localConfig 里的旧镜像；否则保留用户在页面上的改动。
    const canonical = canonicalById.get(skill.id) || initialSkill;
    const preferCanonical = skillAuthority(canonical) > skillAuthority(skill);
    const merged = preferCanonical
      ? { ...skill, ...canonical }
      : { ...initialSkill, ...skill };
    return {
      ...merged,
      hero: migrateHeroName(skill, initialSkill),
      title: preferCanonical ? (canonical.title || migrateSkillTitle(skill)) : migrateSkillTitle(skill),
      progressiveDamage: skill.progressiveDamage || initialSkill.progressiveDamage
    };
  });
  const existingIds = new Set(savedSkills.map((skill) => skill.id));
  return applySpecialSkillRules(dedupeSkillsByLatest([
    ...mergedSaved,
    ...INITIAL_SKILLS.filter((skill) => !existingIds.has(skill.id))
  ]));
}

// ---------------------------------------------------------------------------
// 连段
// ---------------------------------------------------------------------------

export const DEFAULT_COMBOS = SPECIAL_RULE_COMBOS;

export function normalizeCombo(combo) {
  const hits = Object.fromEntries(Object.entries(combo?.hits || {})
    .map(([skillId, count]) => [skillId, Math.max(0, getNumber(count))])
    .filter(([, count]) => count > 0));
  return {
    id: combo?.id || `combo-${Date.now()}`,
    hero: combo?.hero || DEFAULT_HERO,
    title: combo?.title || combo?.name || '新连段',
    note: combo?.note || '',
    hits
  };
}

export function mergeCombos(savedCombos) {
  return Array.isArray(savedCombos) ? savedCombos.map(normalizeCombo) : clone(DEFAULT_COMBOS);
}
