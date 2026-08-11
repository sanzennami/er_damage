// 技能数据来源层。
//
// 技能只有一张表：src/data/heroSkills.json。
// 一段伤害（hero + group + skillId + dataKey）在表里只有一条，
// 各来源之间的取舍已经在 `scripts/consolidate-hero-skills.mjs` 里按权威值做完了，
// 运行时不再需要跨文件比较优先级。
//
// 权威值（越大越优先）仍然保留，用于两件事：
//   1. 整合脚本决定同一段伤害保留哪条；
//   2. 运行时决定内置数据能否压过 localStorage 里的旧缓存。
//
//   100 special-skill-rule  人工特殊计算规则
//    90 manual              人工录入 / 手改（条目上标 "manual": true）
//    80 官方更新公告
//    60 in-game-client      客户端界面读数
//    40 官方 Wiki
//    20 er-gamedata 结构化解包
//    10 er-gamedata 旧版解包
//
// 原始导入源在 src/data/sources/，由各抓取脚本产出，App 不直接读取。

import HERO_SKILLS from '../data/heroSkills.json';
import DEFAULT_LOCAL_CONFIG from '../data/localConfig.json';
import DATA_MIGRATIONS from '../data/dataMigrations.json';
import { basesFor, clone, getNumber } from './formula.js';
import { CHARACTERS } from './characterStats.js';
import { DEFAULT_HERO, MANUAL_HEROES, SPECIAL_RULE_COMBOS } from './specialRules.js';

/** 权威值表。键是条目的 `source`；条目上的 `manual: true` 一律按人工录入处理。 */
export const SKILL_SOURCE_AUTHORITY = HERO_SKILLS.authority || {
  'special-skill-rule': 100,
  manual: 90,
  'official-patch-note': 80,
  'external-official-patch': 80,
  'in-game-client': 60,
  'external-wiki-current': 40,
  'external-skill-damage-wiki-current': 40,
  'er-skill-damage-table': 20,
  'er-gamedata': 10
};

const DEFAULT_SOURCE_AUTHORITY = 30;

export function skillAuthority(skill) {
  if (skill?.manual === true) return SKILL_SOURCE_AUTHORITY.manual;
  if (Number.isFinite(skill?.authority)) return skill.authority;
  const source = String(skill?.source || '');
  return source in SKILL_SOURCE_AUTHORITY ? SKILL_SOURCE_AUTHORITY[source] : DEFAULT_SOURCE_AUTHORITY;
}

function skillVersionTime(skill) {
  const value = skill?.updatedAt || skill?.sourceDate || skill?.patch || skill?.version || '';
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return parsed;
  const numeric = String(value).match(/\d+(?:\.\d+)*/)?.[0];
  return numeric ? Number(numeric.replace(/\./g, '').padEnd(8, '0')) : 0;
}

/**
 * 一段伤害的身份：英雄 + 技能组 + 技能 ID + 伤害段。
 * 没有这些字段的手动条目退回用标题区分。
 */
function skillDedupeKey(skill) {
  const hasIdentity = Boolean(skill.group || skill.skillId || skill.dataKey);
  if (!hasIdentity) return `${skill.hero || ''}|title|${skill.title || ''}`;
  return [skill.hero || '', skill.group || '', skill.skillId || '', skill.dataKey || ''].join('|');
}

/** 同身份去重：先比权威值，再比 updatedAt，最后取靠后的。 */
export function dedupeSkillsByLatest(skills) {
  const winners = new Map();
  skills.forEach((skill, index) => {
    const key = skillDedupeKey(skill);
    const current = winners.get(key);
    const next = { skill, index, authority: skillAuthority(skill), time: skillVersionTime(skill) };
    if (!current) {
      winners.set(key, next);
      return;
    }
    const wins = next.authority !== current.authority
      ? next.authority > current.authority
      : next.time !== current.time
        ? next.time > current.time
        : next.index > current.index;
    if (wins) winners.set(key, next);
  });
  return Array.from(winners.values())
    .sort((a, b) => a.index - b.index)
    .map(({ skill }) => skill);
}

/** 内置技能表。alternatives 只是留档，不参与计算，这里剥掉以免影响合并。 */
export const INITIAL_SKILLS = (HERO_SKILLS.skills || []).map(({ alternatives, ...skill }) => skill);

export const HEROES_WITH_SKILL_DAMAGE = new Set(
  INITIAL_SKILLS.filter((skill) => basesFor(skill).length).map((skill) => skill.hero)
);

/** 生效条目按来源的分布，用于页面说明与排查。 */
export const SKILL_SOURCE_BREAKDOWN = INITIAL_SKILLS.reduce((counts, skill) => {
  const key = skill.manual ? 'manual' : (skill.source || 'unknown');
  counts[key] = (counts[key] || 0) + 1;
  return counts;
}, {});

export const OFFICIAL_DATA_COUNTS = {
  characters: CHARACTERS.length,
  calculableSkills: INITIAL_SKILLS.filter((skill) => basesFor(skill).length).length
};

// ---------------------------------------------------------------------------
// 与浏览器保存的配置合并
// ---------------------------------------------------------------------------

const KNOWN_HERO_NAMES = new Set([...MANUAL_HEROES, ...CHARACTERS.map((character) => character.name)]);

/**
 * 官方改名迁移：旧缓存里的英雄名如果已经不存在（例如 Craver 定名为「克雷弗」），
 * 采用内置条目的新名字；用户把技能挪给另一个真实英雄时保留用户的改动。
 */
function migrateHeroName(savedSkill, initialSkill) {
  const savedHero = savedSkill?.hero;
  if (!savedHero || !initialSkill?.hero) return savedHero;
  if (savedHero === initialSkill.hero) return savedHero;
  return KNOWN_HERO_NAMES.has(savedHero) ? savedHero : initialSkill.hero;
}

const SKILL_TITLE_MIGRATIONS = new Map(
  (DATA_MIGRATIONS.skillTitles || []).map((item) => [`${item.id}|${item.from}`, item.to])
);

/** 技能名迁移：只有与迁移表记录的旧译名完全一致时才替换。 */
function migrateSkillTitle(savedSkill) {
  return SKILL_TITLE_MIGRATIONS.get(`${savedSkill?.id}|${savedSkill?.title}`) || savedSkill?.title;
}

/**
 * 内置数据里删掉的条目不应该继续留在浏览器缓存里（否则会变成永远算 0 的幽灵条目，
 * 或者和新条目并排显示成同一段伤害的两份）。
 *
 * 判断依据是 `source`：随包数据每条都带 source，用户在配置表「新增技能」建的条目没有。
 * 所以「带 source 但内置数据里已经没有」= 被删掉的生成条目，直接丢弃；
 * 不带 source 的一律保留，那是用户自己的东西。
 *
 * 例外：递增伤害条目换过 id 时靠 progressive 签名重新挂钩，签名对得上就不算失效。
 */
function isStaleGeneratedSkill(skill, canonicalById, canonicalBySignature) {
  if (!skill?.source) return false;
  if (canonicalById.has(skill?.id)) return false;
  const signature = skillProgressiveSignature(skill);
  return !(signature && canonicalBySignature.has(signature));
}

function skillProgressiveSignature(skill) {
  if (!skill?.skillId || !skill?.group || !skill?.dataKey) return '';
  return `${skill.skillId}-${skill.group}-${skill.dataKey}`;
}

/**
 * 合并浏览器/localConfig 里保存的技能配置。
 * 内置条目权威值更高时（手改、或官方公告更新了数值），内置数据压过旧缓存；
 * 否则保留用户在页面上的改动。
 */
export function mergeSkills(savedSkills) {
  if (!Array.isArray(savedSkills) || !savedSkills.length) return clone(INITIAL_SKILLS);

  const canonicalById = new Map(INITIAL_SKILLS.map((skill) => [skill.id, skill]));
  const metadataSkills = [
    ...INITIAL_SKILLS,
    ...(Array.isArray(DEFAULT_LOCAL_CONFIG?.skills) ? DEFAULT_LOCAL_CONFIG.skills : [])
  ];
  const initialById = new Map(metadataSkills.map((skill) => [skill.id, skill]));
  const initialBySignature = new Map(metadataSkills
    .map((skill) => [skillProgressiveSignature(skill), skill])
    .filter(([key, skill]) => key && skill.progressiveDamage));

  const mergedSaved = savedSkills
    .filter((skill) => !isStaleGeneratedSkill(skill, canonicalById, initialBySignature))
    .map((skill) => {
      const initialSkill = initialById.get(skill.id) || initialBySignature.get(skillProgressiveSignature(skill));
      if (!initialSkill) return skill;
      const canonical = canonicalById.get(skill.id) || initialSkill;
      // 缓存里没被用户改过的生成条目（有 source、没 manual）一律跟随随包数据。
      // 不这样的话，同一个补丁版本内改公式时权威值和 updatedAt 都相同，旧缓存会一直赢，
      // 用户必须清 localStorage 才看得到修正 —— 那就违背了「跟着版本更新」的目的。
      const untouchedGenerated = Boolean(skill?.source) && skill?.manual !== true;
      const preferCanonical = untouchedGenerated
        || skillAuthority(canonical) > skillAuthority(skill)
        || (skillAuthority(canonical) === skillAuthority(skill)
          && skillVersionTime(canonical) > skillVersionTime(skill));
      const merged = preferCanonical ? { ...skill, ...canonical } : { ...initialSkill, ...skill };
      return {
        ...merged,
        hero: migrateHeroName(skill, initialSkill),
        title: preferCanonical ? (canonical.title || migrateSkillTitle(skill)) : migrateSkillTitle(skill),
        progressiveDamage: skill.progressiveDamage || initialSkill.progressiveDamage
      };
    });

  const existingIds = new Set(mergedSaved.map((skill) => skill.id));
  return dedupeSkillsByLatest([
    ...mergedSaved,
    ...INITIAL_SKILLS.filter((skill) => !existingIds.has(skill.id))
  ]);
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
  return Array.isArray(savedCombos) && savedCombos.length
    ? savedCombos.map(normalizeCombo)
    : clone(DEFAULT_COMBOS);
}
