// 纯计算层：数值处理、技能公式求值、单条技能伤害。
//
// 这里的函数都是纯函数，不依赖 React 也不读任何全局状态，方便单独测试和复用。
// 公式可用变量见 docs/config-json-guide.md：base / ap / attack / extraAttack / targetHp / stacks / level。

export function getNumber(value) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

export function pct(value) {
  return `${Math.round(value * 1000) / 10}%`;
}

export function round(value, digits = 1) {
  const base = 10 ** digits;
  return Math.round(value * base) / base;
}

export function damageFloor(value) {
  return Math.floor(getNumber(value) + 1e-9);
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function finiteDamageValue(value) {
  if (value === '' || value === null || value === undefined) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

/** 适性伤害：额外攻击力路线和技能增幅路线取高者。 */
export function adaptiveOffenseFormula({ base = 0, extraAttack = 0, attackRatio = 0, ap = 0, apRatio = 0 }) {
  const attackPart = getNumber(extraAttack) * getNumber(attackRatio);
  const apPart = getNumber(ap) * getNumber(apRatio);
  const useAttack = attackPart > apPart;
  return {
    value: getNumber(base) + (useAttack ? attackPart : apPart),
    route: useAttack ? '额外攻击力' : '技能增幅',
    routeValue: useAttack ? extraAttack : ap,
    ratio: useAttack ? attackRatio : apRatio
  };
}

// ---------------------------------------------------------------------------
// 技能等级与公式
// ---------------------------------------------------------------------------

export function basesFor(skill) {
  return String(skill.bases || '')
    .split(',')
    .map((value) => getNumber(value.trim()));
}

export function skillBaseAtLevel(skill, level) {
  const bases = basesFor(skill);
  const index = Math.max(0, Math.min(getNumber(level) - 1, bases.length - 1));
  return bases[index] ?? 0;
}

export function clampLevel(skill, level) {
  return Math.max(1, Math.min(getNumber(skill.maxLevel) || basesFor(skill).length || 1, getNumber(level) || 1));
}

/**
 * 公式求值。只允许数字、英文变量名、四则运算、括号、逗号和数组下标；
 * 含中文、百分号或函数名的表达式会被白名单拦下并返回 0。
 */
export function evaluateFormula(formula, context) {
  const expression = String(formula || '').trim();
  if (!/^[\d\s+\-*/().,_A-Za-z[\]]+$/.test(expression)) return 0;

  try {
    const calculate = Function(
      'base',
      'ap',
      'attack',
      'extraAttack',
      'targetHp',
      'stacks',
      'level',
      `"use strict"; return (${expression});`
    );
    return getNumber(calculate(context.base, context.ap, context.attack, context.extraAttack, context.targetHp, context.stacks, context.level));
  } catch {
    return 0;
  }
}

export function formulaUsesVariable(formula, variableName) {
  return new RegExp(`\\b${variableName}\\b`).test(String(formula || ''));
}

/** 从公式文本里读出某个变量在指定等级的系数，用于展示。 */
export function coefficientAtLevel(formula, variableName, level) {
  const source = String(formula || '');
  const arrayAfterVariable = source.match(new RegExp(`${variableName}\\s*\\*\\s*(\\[[^\\]]+\\])\\s*\\[\\s*level\\s*-\\s*1\\s*\\]`));
  const arrayBeforeVariable = source.match(new RegExp(`(\\[[^\\]]+\\])\\s*\\[\\s*level\\s*-\\s*1\\s*\\]\\s*\\*\\s*${variableName}`));
  const arrayMatch = arrayAfterVariable || arrayBeforeVariable;
  if (arrayMatch) {
    try {
      const values = JSON.parse(arrayMatch[1]);
      return finiteDamageValue(values[Math.max(0, getNumber(level) - 1)]);
    } catch {
      return null;
    }
  }

  const afterVariable = source.match(new RegExp(`${variableName}\\s*\\*\\s*(-?\\d+(?:\\.\\d+)?)`));
  if (afterVariable) return finiteDamageValue(afterVariable[1]);

  const beforeVariable = source.match(new RegExp(`(-?\\d+(?:\\.\\d+)?)\\s*\\*\\s*${variableName}`));
  if (beforeVariable) return finiteDamageValue(beforeVariable[1]);

  return null;
}

export function skillFormulaDescription(skill, level) {
  const nextLevel = clampLevel(skill, level);
  const base = skillBaseAtLevel(skill, nextLevel);
  const pieces = [`${round(base, 1)}`];
  [
    ['ap', '技能增幅'],
    ['attack', '攻击力'],
    ['targetHp', '目标体力'],
    ['stacks', '叠层']
  ].forEach(([variable, label]) => {
    const coefficient = coefficientAtLevel(skill.formula, variable, nextLevel);
    if (coefficient === null) return;
    pieces.push(`${label}${pct(coefficient)}`);
  });
  const compactFormula = pieces.join(' + ');
  const rawFormula = String(skill.formula || '').trim();
  return rawFormula
    ? `${compactFormula}\n原始公式：${rawFormula}`
    : compactFormula;
}

// ---------------------------------------------------------------------------
// 单条技能伤害
// ---------------------------------------------------------------------------

export function calculateSkill(skill, level, context) {
  const nextLevel = clampLevel(skill, level);
  const base = skillBaseAtLevel(skill, nextLevel);
  const formulaContext = { ...context, base, level: nextLevel };
  const rawDamage = damageFloor(evaluateFormula(skill.formula, formulaContext));
  const damage = damageFloor(rawDamage * context.finalMod);
  return {
    ...skill,
    level: nextLevel,
    base,
    rawDamage,
    damage
  };
}

/** 按倍率和命中段数放大一条技能的伤害（先取整单发，再乘段数）。 */
export function scaledSkillDamage(skill, finalMod, { scale = 1, hits = 1 } = {}) {
  const singleRaw = damageFloor(getNumber(skill.rawDamage) * scale);
  const singleFinal = damageFloor(singleRaw * finalMod);
  return {
    raw: singleRaw * hits,
    final: singleFinal * hits
  };
}

// ---------------------------------------------------------------------------
// 渐进伤害（蓄力 / 弹跳等随档位递增的技能）
// ---------------------------------------------------------------------------

export function progressiveDamageRule(skill) {
  return skill?.progressiveDamage || null;
}

export function progressiveDamageBounds(rule) {
  const min = getNumber(rule?.min ?? 0);
  const max = getNumber(rule?.max ?? min);
  const defaultValue = getNumber(rule?.default ?? min);
  return {
    min,
    max: Math.max(min, max),
    defaultValue: Math.max(min, Math.min(Math.max(min, max), defaultValue))
  };
}

export function progressiveLinearValue(from, to, progress) {
  return getNumber(from) + (getNumber(to) - getNumber(from)) * progress;
}

export function progressiveDamageValue(skill, context, stepValue) {
  const rule = progressiveDamageRule(skill);
  const { min, max, defaultValue } = progressiveDamageBounds(rule);
  const step = Math.max(min, Math.min(max, getNumber(stepValue) || defaultValue));
  const progress = max === min ? 0 : (step - min) / (max - min);
  const base = getNumber(skill.base);
  const baseRule = rule?.base || {};
  const maxBase = damageFloor(base * getNumber(baseRule.toMultiplier ?? baseRule.maxMultiplier ?? 1));
  const baseAtStep = progressiveLinearValue(
    base * getNumber(baseRule.fromMultiplier ?? 1),
    maxBase,
    progress
  );
  const coefficientRule = rule?.coefficient || {};
  const coefficient = progressiveLinearValue(
    coefficientRule.from ?? coefficientRule.min ?? 0,
    coefficientRule.to ?? coefficientRule.max ?? coefficientRule.from ?? coefficientRule.min ?? 0,
    progress
  );
  const variable = coefficientRule.variable || 'ap';
  const raw = damageFloor(baseAtStep + getNumber(context[variable]) * coefficient);

  return {
    step,
    raw,
    final: damageFloor(raw * context.finalMod),
    coefficient,
    variable,
    base: baseAtStep
  };
}
