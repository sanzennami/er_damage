// 特殊计算规则层。
//
// 数据来源：src/data/specialSkillRules.json
//
// 这是技能计算的最高优先级来源。只要一个英雄在规则表里出现：
//   1. 它的技能公式在 heroSkills.json 里以 source: "special-skill-rule"（权威值 100）存放，
//      任何生成数据都压不过；整合脚本重跑时也会原样保留。
//   2. 展示与结算方式（多段命中、次要目标衰减、目标数上限、叠层选择器、连段）由本表描述，
//      不再写死在 App.jsx 里。
//
// 改数值 -> heroSkills.json；改显示/叠加方式 -> specialSkillRules.json。

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

/** 规则表里定义的全部连段。 */
export const SPECIAL_RULE_COMBOS = SPECIAL_RULE_HEROES.flatMap((hero) => (
  (HERO_RULES[hero]?.combos || []).map((combo) => ({ ...combo, hero }))
));

/** 某个技能的展示规则（多段命中、次要目标衰减、目标数上限、显示名）。 */
export function skillDisplayRule(hero, skillId) {
  return heroRule(hero)?.display?.[skillId] || null;
}

/** 某个英雄的叠层选择器配置（例如奇娅拉的 R2 层数）。 */
export function stackSelectorRule(hero) {
  return heroRule(hero)?.stackSelector || null;
}

/**
 * 英雄专属的条件修正（卡洛琳 W 的镜子技能增幅、秀雅 Q 冲撞点的承受伤害提升这类）。
 * 每条是一个下拉，选项自带要加进哪个桶：
 *   apPct       → 技能增幅百分比，和熟练度/独有增幅同一个桶
 *   damageBonus → 伤害提升百分比，和装备/潜能/手动增伤同一个乘区
 * 「敌人承受伤害增加」按官方口径就落在 damageBonus 这一档。
 */
export function heroModifiersFor(hero) {
  const list = heroRule(hero)?.modifiers;
  return Array.isArray(list) ? list : [];
}

/** 把当前选中的选项汇总成各个桶的加成。 */
export function heroModifierTotals(hero, choices = {}) {
  return heroModifiersFor(hero).reduce((totals, modifier) => {
    const picked = choices[`${hero}:${modifier.id}`] ?? modifier.default ?? 0;
    const option = (modifier.options || []).find((item) => item.value === picked);
    if (!option) return totals;
    return {
      apPct: totals.apPct + (Number(option.apPct) || 0),
      damageBonus: totals.damageBonus + (Number(option.damageBonus) || 0),
      applied: option.apPct || option.damageBonus
        ? [...totals.applied, { label: modifier.label, option: option.label }]
        : totals.applied
    };
  }, { apPct: 0, damageBonus: 0, applied: [] });
}

/** 叠层上限：没有规则时沿用旧的 4 层上限。 */
export function stackLimit(hero) {
  return stackSelectorRule(hero)?.max ?? 4;
}

const usesStacks = (skill) => /\bstacks\b/.test(String(skill?.formula || ''));

/**
 * 叠层上限，按「显式规则 > 技能条目自报的 maxStacks > 兜底 4」取值。
 * 条目上写 "maxStacks": 12 就能让界面给出 0~12 的选择器，不必再去改 specialSkillRules.json。
 */
export function stackLimitForHero(hero, skills = []) {
  const configured = stackSelectorRule(hero)?.max;
  if (Number.isFinite(configured)) return configured;
  const declared = skills.filter(usesStacks)
    .map((skill) => Number(skill?.maxStacks))
    .filter((value) => Number.isFinite(value) && value > 0);
  return declared.length ? Math.max(...declared) : 4;
}

/**
 * 叠层步长。像李黛琳的酒醉值那样上限 100 的资源，一格一个按钮会铺满整行，
 * 条目上写 "stackStep": 10 就改成 0/10/20…/100。
 */
function stackStepForHero(skills = []) {
  const declared = skills.filter(usesStacks)
    .map((skill) => Number(skill?.stackStep))
    .filter((value) => Number.isFinite(value) && value > 0);
  return declared.length ? Math.max(...declared) : 1;
}

/**
 * 叠层选择器：优先用 specialSkillRules.json 里写死的配置；
 * 没配但该英雄有公式用到 stacks 时，自动生成一个 0~上限 的选择器。
 */
export function stackSelectorForHero(hero, skills = []) {
  const configured = stackSelectorRule(hero);
  if (configured) return configured;
  if (!skills.some(usesStacks)) return null;
  const max = stackLimitForHero(hero, skills);
  const step = stackStepForHero(skills);
  const label = skills.filter(usesStacks).map((skill) => skill.stackLabel).find(Boolean) || '叠层';
  const values = [];
  for (let value = 0; value <= max; value += step) values.push(value);
  if (values[values.length - 1] !== max) values.push(max);
  return {
    label,
    values,
    // 步长大于 1 时说明是资源条而不是层数，默认给满，跟游戏里「消耗全部酒醉值」的用法一致
    default: step > 1 ? max : 1,
    max,
    step,
    // 取值多的用滑块 + 输入框，少的还是一排按钮点着方便
    mode: step > 1 || max > 12 ? 'slider' : 'buttons',
    auto: true
  };
}
