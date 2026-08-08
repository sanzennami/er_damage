// 特殊计算规则层。
//
// 数据来源：src/data/specialSkillRules.json
//
// 这是技能计算的最高优先级来源。只要一个英雄在规则表里出现：
//   1. 它的技能条目直接用规则表里的 bases / formula，任何生成表都不会合并进来；
//   2. 用户在页面配置表里保存到 localStorage 的同名条目也会被规则表覆盖，
//      避免人工校对好的公式被旧缓存或后续数据导出顶掉；
//   3. 展示方式（多段命中、次要目标衰减、目标数上限、叠层选择器）也由规则表描述，
//      不再写死在 App.jsx 里。
//
// 要调整俞岷、奇娅拉这类已校对英雄的数值，只改 specialSkillRules.json。

import SPECIAL_SKILL_RULES from '../data/specialSkillRules.json';

const HERO_RULES = SPECIAL_SKILL_RULES.heroes || {};

export const SPECIAL_RULE_SOURCE = 'special-skill-rule';

/** 规则表里声明的默认英雄，供初始状态和兜底使用。 */
export const DEFAULT_HERO = SPECIAL_SKILL_RULES.defaultHero || Object.keys(HERO_RULES)[0] || '';

/** 所有写了规则的英雄名。 */
export const SPECIAL_RULE_HEROES = Object.keys(HERO_RULES);

/** 标记为 manual 的英雄：生成表不参与这些英雄的技能合并。 */
export const MANUAL_HEROES = SPECIAL_RULE_HEROES.filter((hero) => HERO_RULES[hero]?.manual);

export function heroRule(hero) {
  return HERO_RULES[hero] || null;
}

export function isManualHero(hero) {
  return MANUAL_HEROES.includes(hero);
}

function decorate(hero, skill, index) {
  return {
    ...skill,
    hero,
    source: skill.source || SPECIAL_RULE_SOURCE,
    sourceNote: skill.sourceNote || heroRule(hero)?.note || '来自特殊计算规则表',
    sourceIndex: skill.sourceIndex ?? index
  };
}

/** 规则表里定义的全部技能条目（已补上 hero / source 字段）。 */
export const SPECIAL_RULE_SKILLS = SPECIAL_RULE_HEROES.flatMap((hero) => (
  (HERO_RULES[hero]?.skills || []).map((skill, index) => decorate(hero, skill, index))
));

/** 规则表里定义的全部连段。 */
export const SPECIAL_RULE_COMBOS = SPECIAL_RULE_HEROES.flatMap((hero) => (
  (HERO_RULES[hero]?.combos || []).map((combo) => ({ ...combo, hero }))
));

const SPECIAL_SKILL_BY_ID = new Map(SPECIAL_RULE_SKILLS.map((skill) => [skill.id, skill]));

/**
 * 把规则表的技能条目盖回一份技能列表：
 * 同 id 的条目整条替换，规则表里独有的条目补进来，规则表英雄的其它条目全部丢弃。
 */
export function applySpecialSkillRules(skills = []) {
  const kept = skills
    .filter((skill) => !isManualHero(skill.hero))
    .map((skill) => (SPECIAL_SKILL_BY_ID.has(skill.id) ? { ...SPECIAL_SKILL_BY_ID.get(skill.id) } : skill));
  const keptIds = new Set(kept.map((skill) => skill.id));
  const missing = SPECIAL_RULE_SKILLS.filter((skill) => !keptIds.has(skill.id)).map((skill) => ({ ...skill }));
  return [...missing, ...kept];
}

/** 某个技能的展示规则（多段命中、次要目标衰减、目标数上限、显示名）。 */
export function skillDisplayRule(hero, skillId) {
  return heroRule(hero)?.display?.[skillId] || null;
}

/** 某个英雄的叠层选择器配置（例如奇娅拉的 R2 层数）。 */
export function stackSelectorRule(hero) {
  return heroRule(hero)?.stackSelector || null;
}

/** 叠层上限：没有规则时沿用旧的 4 层上限。 */
export function stackLimit(hero) {
  return stackSelectorRule(hero)?.max ?? 4;
}
