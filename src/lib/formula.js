// 纯计算层：数值处理、技能公式求值、单条技能伤害。
//
// 这里的函数都是纯函数，不依赖 React 也不读任何全局状态，方便单独测试和复用。
// 公式可用变量见 src/data/README.md：base / ap / attack / extraAttack /
// targetHp / targetCurrentHp / targetLostHp / maxHp / extraHp / defense / shield /
// critChance / stacks / level / heroLevel。

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
 *
 * 可用变量：
 *   base        当前技能等级的基础值
 *   ap          技能增幅        attack      攻击力
 *   extraAttack 额外攻击力      targetHp    目标体力上限
 *   maxHp       自身体力上限    extraHp     自身额外体力（装备/潜能提供的那部分）
 *   selfCurrentHp 自身当前体力   selfLostHp  自身已失体力（由界面「自身当前体力 %」推出）
 *   defense     自身防御力      shield      自身护盾量
 *   critChance  暴击率（0~1）
 *   targetCurrentHp 目标当前体力   targetLostHp 目标已失体力
 *   stacks      叠层            level       技能等级（1 起）
 *   heroLevel   实验体等级（界面「熟练度等级」，1~20）
 *   basicAttackAmp 普攻增幅（0~1 的小数）。官方独立乘区，只作用于普攻伤害。
 *                  公告里写成「* (普攻增幅)」的段落（李黛琳醉仙2段、莉央替弓、
 *                  艾登 Q 这类被判定为普攻伤害的技能）写成 `... * (1 + basicAttackAmp)`。
 *   accumulatedDamage 累计伤害。给「按一段时间内造成的总伤害折算」的技能用
 *                  （丹尼尔 W 灵感引爆的真伤）。界面上是个手填框，只在有技能引用时出现。
 */
const FORMULA_VARIABLES = [
  'base', 'ap', 'attack', 'extraAttack',
  'targetHp', 'targetCurrentHp', 'targetLostHp',
  'maxHp', 'selfCurrentHp', 'selfLostHp',
  'extraHp', 'defense', 'shield', 'critChance',
  'basicAttackAmp', 'accumulatedDamage', 'stacks', 'level', 'heroLevel'
];

export function evaluateFormula(formula, context) {
  const expression = String(formula || '').trim();
  if (!/^[\d\s+\-*/().,_A-Za-z[\]]+$/.test(expression)) return 0;

  try {
    const calculate = Function(...FORMULA_VARIABLES, `"use strict"; return (${expression});`);
    return getNumber(calculate(...FORMULA_VARIABLES.map((name) => context[name])));
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
  const arrayAfterVariable = source.match(new RegExp(`${variableName}\\s*\\*\\s*\\(?\\s*(\\[[^\\]]+\\])\\s*\\[\\s*level\\s*-\\s*1\\s*\\]`));
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

/**
 * 「累计伤害 × 比例」这类技能（丹尼尔 W 灵感）单独渲染。
 * 累计伤害是乘数不是加项，套用通用的逐项拆解会显示成
 * 「0 + 额外攻击力0.1%」——既看不懂又容易误读成攻击力系数。
 */
function accumulatedDamageDescription(formula, level) {
  const source = String(formula || '');
  const rate = [];
  const byLevel = source.match(/accumulatedDamage\s*\*\s*\(?\s*(\[[^\]]+\])\s*\[\s*level\s*-\s*1\s*\]/);
  const flat = source.match(/accumulatedDamage\s*\*\s*\(?\s*(-?\d+(?:\.\d+)?)/);
  if (byLevel) {
    try {
      const values = JSON.parse(byLevel[1]);
      const value = finiteDamageValue(values[Math.max(0, getNumber(level) - 1)]);
      if (value !== null) rate.push(pct(value));
    } catch { /* 数组写坏了就只显示别的项 */ }
  } else if (flat) {
    rate.push(pct(Number(flat[1])));
  }
  // 官方把额外攻击力那项写成「(+额外攻击力8%)%」，整体再除以 100，展示时乘回去
  const extraAd = source.match(/extraAttack\s*\*\s*(-?\d+(?:\.\d+)?)/);
  if (extraAd) rate.push(`额外攻击力${pct(Number(extraAd[1]) * 100)}`);
  return `累计伤害 × (${rate.join(' + ')})`;
}


/**
 * 「按已失体力在下限~上限之间插值」这种写法：
 *   (下限) * (1 + Math.min(1, 已失体力 / (体力上限 * k)))
 * 分母里的「体力上限 * k」会被通用的系数提取当成加项，显示成「目标体力70%」这种
 * 看不懂又容易误读的东西。这里把它认出来，分母变量不进加项列表，改成一句人话。
 */
function interpolationInfo(formula) {
  const src = String(formula || '');
  const at = src.indexOf('Math.min(1,');
  if (at < 0) return null;
  // 取 Math.min(1, 已失体力 / (体力上限 * k)) 里的三个部分
  const body = src.slice(at + 'Math.min(1,'.length);
  const close = body.indexOf(')');
  if (close < 0) return null;
  const parts = body.slice(0, close).split('/');
  if (parts.length !== 2) return null;
  const lostVar = parts[0].trim();
  const den = parts[1].replace('(', '').trim().split('*');
  if (den.length !== 2) return null;
  const denomVar = den[0].trim();
  const denomK = Number(den[1].trim());
  if (!Number.isFinite(denomK)) return null;
  // Math.min 前面可能有个倍率（秀雅那两条是 1 + 0.5 * Math.min(...)）
  const head = src.slice(0, at);
  const plus = head.lastIndexOf('1 +');
  const between = plus < 0 ? '' : head.slice(plus + 3).replace('*', '').trim();
  const scale = between === '' ? 1 : Number(between);
  if (!Number.isFinite(scale)) return null;
  const LOST = { targetLostHp: '目标已失体力', selfLostHp: '自身已失体力' };
  const CAP = { targetHp: '目标', maxHp: '自身' };
  return {
    denomVar,
    text: `按${LOST[lostVar] || lostVar}在 1~${round(1 + scale, 2)} 倍之间插值（${CAP[denomVar] || denomVar}体力剩 ${pct(1 - denomK)} 时封顶）`
  };
}

export function skillFormulaDescription(skill, level) {
  const nextLevel = clampLevel(skill, level);
  const base = skillBaseAtLevel(skill, nextLevel);
  if (formulaUsesVariable(skill.formula, 'accumulatedDamage')) {
    const rawFormula = String(skill.formula || '').trim();
    return `${accumulatedDamageDescription(skill.formula, nextLevel)}\n原始公式：${rawFormula}`;
  }
  const interpolation = interpolationInfo(skill.formula);
  const pieces = [`${round(base, 1)}`];
  [
    ['ap', '技能增幅'],
    ['attack', '攻击力'],
    ['extraAttack', '额外攻击力'],
    ['targetHp', '目标体力'],
    ['targetCurrentHp', '目标当前体力'],
    ['targetLostHp', '目标已失体力'],
    ['maxHp', '自身体力'],
    ['selfCurrentHp', '自身当前体力'],
    ['selfLostHp', '自身已失体力'],
    ['extraHp', '额外体力'],
    ['defense', '防御力'],
    ['shield', '护盾'],
    ['critChance', '暴击率'],
    ['accumulatedDamage', '累计伤害'],
    ['stacks', '叠层'],
    ['heroLevel', '实验体等级']
  ].forEach(([variable, label]) => {
    // 插值分母里的体力上限不是加项，跳过
    if (interpolation && variable === interpolation.denomVar) return;
    const coefficient = coefficientAtLevel(skill.formula, variable, nextLevel);
    if (coefficient === null) return;
    // 实验体等级是「等级 * 系数」的线性项，按倍数显示比百分比更直观
    pieces.push(variable === 'heroLevel' ? `${label}×${round(coefficient, 2)}` : `${label}${pct(coefficient)}`);
  });
  // 普攻类伤害段走的是另一条结算线，系数表里看不出来，单独缀一句说明
  const joined = interpolation
    ? `${pieces.join(' + ')}　${interpolation.text}`
    : pieces.join(' + ');
  const compactFormula = skill.damageType === 'basicAttack' || formulaUsesVariable(skill.formula, 'basicAttackAmp')
    ? `${joined}　→ 按普攻结算（吃普攻增幅 / 普攻减伤）`
    : joined;
  const rawFormula = String(skill.formula || '').trim();
  return rawFormula
    ? `${compactFormula}\n原始公式：${rawFormula}`
    : compactFormula;
}

// ---------------------------------------------------------------------------
// 单条技能伤害
// ---------------------------------------------------------------------------

/**
 * 该技能段该走哪条结算线。
 *   damageType: "true"        → 真实伤害，不吃防御也不吃减伤
 *   damageType: "basicAttack" → 官方判定为普攻伤害，吃普攻增幅和目标的普攻减伤，
 *                               而不是技能增幅那条线（李黛琳醉仙2段、莉央替弓、艾登 Q）
 *   其余                       → 常规技能伤害
 */
export function skillFinalMod(skill, context) {
  if (skill?.damageType === 'basicAttack') {
    return getNumber(context?.basicAttackFinalMod ?? context?.finalMod);
  }
  return getNumber(context?.finalMod);
}

export function calculateSkill(skill, level, context) {
  const nextLevel = clampLevel(skill, level);
  const base = skillBaseAtLevel(skill, nextLevel);
  const formulaContext = { ...context, base, level: nextLevel };
  const rawDamage = damageFloor(evaluateFormula(skill.formula, formulaContext));
  // 真实伤害不吃防御与减伤，最终值就是原始值
  const damage = skill.damageType === 'true'
    ? rawDamage
    : damageFloor(rawDamage * skillFinalMod(skill, context));
  return {
    ...skill,
    level: nextLevel,
    base,
    rawDamage,
    damage
  };
}

/**
 * 按倍率和命中段数放大一条技能的伤害（先取整单发，再乘段数）。
 * 普攻类伤害段要用普攻那条修正，所以允许传 context 覆盖默认的 finalMod。
 */
export function scaledSkillDamage(skill, finalMod, { scale = 1, hits = 1, context } = {}) {
  const singleRaw = damageFloor(getNumber(skill.rawDamage) * scale);
  const mod = context && skill?.damageType === 'basicAttack'
    ? skillFinalMod(skill, context)
    : finalMod;
  // 真实伤害不吃防御与减伤，和 calculateSkill 保持一致
  const singleFinal = skill?.damageType === 'true' ? singleRaw : damageFloor(singleRaw * mod);
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
  // 0 档是合法选择（哈特 Q 不充电就放），不能用 || 当「未设置」判断 ——
  // 那样 default 不等于 min 时选 0 会被弹回默认档。
  const step = Math.max(min, Math.min(max,
    stepValue === undefined || stepValue === null || stepValue === '' ? defaultValue : getNumber(stepValue)));
  const progress = max === min ? 0 : (step - min) / (max - min);
  const base = getNumber(skill.base);
  const baseRule = rule?.base || {};
  const maxBase = damageFloor(base * getNumber(baseRule.toMultiplier ?? baseRule.maxMultiplier ?? 1));
  const baseAtStep = progressiveLinearValue(
    base * getNumber(baseRule.fromMultiplier ?? 1),
    maxBase,
    progress
  );
  // 多数技能只有一个系数随档位变（爱琳跳跳球的技能增幅）；
  // 盖瑞特 W 这种技能增幅和体力上限同时变的，写成 coefficients 数组。
  const coefficientRules = Array.isArray(rule?.coefficients)
    ? rule.coefficients
    : [rule?.coefficient || {}];
  const parts = coefficientRules.map((item) => {
    const value = progressiveLinearValue(
      item.from ?? item.min ?? 0,
      item.to ?? item.max ?? item.from ?? item.min ?? 0,
      progress
    );
    return { variable: item.variable || 'ap', coefficient: value };
  });
  const scaled = parts.reduce((sum, item) => sum + getNumber(context[item.variable]) * item.coefficient, 0);
  const raw = damageFloor(baseAtStep + scaled);

  return {
    step,
    raw,
    final: damageFloor(raw * context.finalMod),
    // 首个系数保留在原字段上，界面那行「技增 X%」照旧显示
    coefficient: parts[0]?.coefficient ?? 0,
    variable: parts[0]?.variable ?? 'ap',
    coefficients: parts,
    base: baseAtStep
  };
}
