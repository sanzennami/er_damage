// 游戏客户端截图录入工具
//
// 用途：把《永恒轮回》客户端「藏品 → 实验体 → 技能」界面里显示的技能参数，
// 规范化成 src/data/sources/inGameSkillCapture.json，再由 consolidate-hero-skills.mjs 并入 heroSkills.json。
//
// 客户端显示的是当前版本的真实生效数值，权威性高于官方公告（公告只写改动项），
// 因此这个文件的 source 是 `in-game-client`，权威值 85（见 src/lib/skillSources.js）。
//
// 除技能伤害外，同一个界面右侧的两栏成长数据也在这里录入：
//   characterStats  「统计」栏：Lv1 / Lv20 的体力上限、攻击力、防御力（英雄等级成长）
//   weaponMastery   「武器熟练度」栏：Lv1 / Lv20 的攻速、技能增幅等（按武器类别）
// 这两栏 er-gamedata 里本来就有，所以录入时**先和仓库现有值对账**：
// 对得上就只留证据、不覆盖（客户端 Lv20 是向下取整显示的，反推出来的每级成长精度不如原值）；
// 对不上才生成覆盖项并报冲突。
//
// 子命令：
//   list <英雄>            打印该英雄的技能骨架、现有数值、以及缺数值的技能段
//   stub <英雄> [--slot Q] 输出可直接粘贴进 inGameSkillCapture.json 的录入骨架
//   build [--check]        规范化录入内容（补 id/bases/title/heroCode）并写回
//   status                 汇总录入进度
//   stats                  只打印成长数据的对账结果
//
// 通用参数：
//   --file <path>          改用别的录入文件（测试用）

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateFormula } from '../src/lib/formula.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'src', 'data', 'sources');
const defaultCapturePath = path.join(dataDir, 'inGameSkillCapture.json');

const SLOTS = ['P', 'Q', 'W', 'E', 'R', 'T', 'D'];
const SCALING_VARIABLES = ['ap', 'attack', 'extraAttack', 'targetHp', 'stacks'];
const FORMULA_CONTEXT = { base: 10, ap: 100, attack: 100, extraAttack: 10, targetHp: 1000, stacks: 1, level: 1 };

// ---------------------------------------------------------------------------
// 载入
// ---------------------------------------------------------------------------

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function loadContext(capturePath) {
  const [gameData, damageTable, masteryStats, fallback, augments, capture] = await Promise.all([
    readJson(path.join(dataDir, 'erGameData.json')),
    readJson(path.join(dataDir, 'erSkillDamageTable.json')),
    readJson(path.join(rootDir, 'src', 'data', 'masteryStats.json')),
    readJson(path.join(dataDir, 'externalSkillDamageFallback.json')),
    readJson(path.join(dataDir, 'skillDamageAugments.json')),
    readJson(capturePath)
  ]);
  return { gameData, damageTable, masteryStats, fallback, augments, capture };
}

/**
 * 某英雄在**所有**来源里已经存在的伤害段。
 * 录入时必须照抄这里的 dataKey，否则去重键（hero|group|skillId|dataKey）对不上，
 * 客户端读数不会覆盖旧值，而是和它并列显示成两行打架的数值。
 */
function existingDamageEntries(context, hero) {
  const entries = [];
  for (const row of context.damageTable.damageRows || []) {
    if (row.heroCode !== hero.code) continue;
    entries.push({
      group: row.skillGroup,
      skillId: row.skillId,
      dataKey: row.baseKey,
      label: row.damagePart,
      bases: formatLevels(row),
      coef: `${row.coefLv1 ?? '-'} (${row.coefKey})`,
      source: 'er-skill-damage-table',
      authority: 20
    });
  }
  const external = [
    ...(context.fallback.skills || []).map((skill) => [skill, 'externalSkillDamageFallback']),
    ...(context.augments.skills || []).map((skill) => [skill, 'skillDamageAugments'])
  ];
  for (const [skill, file] of external) {
    if (skill.hero !== hero.name) continue;
    entries.push({
      group: skill.group,
      skillId: skill.skillId,
      dataKey: skill.dataKey,
      label: skill.title,
      bases: String(skill.bases || '').split(',').join('/'),
      coef: skill.coefficientText || skill.scalingText || '',
      source: `${skill.source}（${file}）`,
      authority: skill.source === 'external-official-patch' || skill.source === 'official-patch-note' ? 80 : 40
    });
  }
  return entries;
}

/**
 * 武器类别中文名 -> 游戏内部枚举。不硬编码：直接从装备表的 weaponType 标签
 *（形如 "暗器 / DirectFire"）里推出来，官方改译名时跟着装备数据自动变。
 */
function weaponTypeMap(gameData) {
  const map = new Map();
  for (const item of gameData.equipment || []) {
    const label = String(item.weaponType || '');
    if (!label.includes('/')) continue;
    const [zh, code] = label.split('/').map((part) => part.trim());
    if (zh && code) map.set(zh, code);
  }
  return map;
}

// ---------------------------------------------------------------------------
// 英雄 / 技能定位
// ---------------------------------------------------------------------------

function resolveHero(gameData, query) {
  const raw = String(query || '').trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const characters = gameData.characters || [];
  return (
    characters.find((character) => character.name === raw) ||
    characters.find((character) => String(character.englishName || '').toLowerCase() === lower) ||
    characters.find((character) => String(character.id || '').toLowerCase() === lower) ||
    characters.find((character) => String(character.name || '').includes(raw)) ||
    characters.find((character) => String(character.englishName || '').toLowerCase().includes(lower)) ||
    null
  );
}

function heroIndexRows(damageTable, hero) {
  return (damageTable.skillIndexRows || [])
    .filter((row) => row.heroCode === hero.code)
    .sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot) || a.skillGroup - b.skillGroup);
}

function heroDamageRows(damageTable, hero) {
  return (damageTable.damageRows || []).filter((row) => row.heroCode === hero.code);
}

/** 按 group 定位技能骨架；没写 group 时用 hero + slot 定位，歧义时报错。 */
function locateSkill(indexRows, entry) {
  if (entry.group) {
    const row = indexRows.find((item) => item.skillGroup === Number(entry.group));
    if (!row) throw new Error(`技能组 ${entry.group} 不在 ${entry.hero} 的技能表里`);
    return row;
  }
  const slot = String(entry.slot || '').toUpperCase();
  if (!slot) throw new Error('缺少 group，也缺少 slot，无法定位技能');
  const matches = indexRows.filter((item) => item.slot === slot);
  if (!matches.length) throw new Error(`${entry.hero} 没有 ${slot} 技能`);
  if (matches.length > 1) {
    const groups = matches.map((item) => `${item.skillGroup}(${item.skillName})`).join(' / ');
    throw new Error(`${entry.hero} 的 ${slot} 有多个技能组，请显式写 group：${groups}`);
  }
  return matches[0];
}

// ---------------------------------------------------------------------------
// 规范化
// ---------------------------------------------------------------------------

function kebab(value) {
  return String(value || '')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .replace(/[^0-9A-Za-z一-龥-]/g, '')
    .replace(/-+/g, '-')
    .toLowerCase();
}

/** levelValues -> "20,40,60,80,100"；必须从 1 级开始且连续，否则算草稿。 */
function levelSequence(levelValues) {
  if (!levelValues || typeof levelValues !== 'object') return { bases: [], missing: '缺少 levelValues' };
  const values = [];
  for (let level = 1; level <= 6; level += 1) {
    const value = levelValues[String(level)] ?? levelValues[level];
    if (value === undefined || value === null || value === '') break;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return { bases: [], missing: `${level} 级数值不是数字：${value}` };
    values.push(numeric);
  }
  const captured = Object.keys(levelValues).length;
  if (!values.length) return { bases: [], missing: '1 级数值缺失' };
  if (values.length < captured) return { bases: [], missing: `等级不连续，只认到 ${values.length} 级（共写了 ${captured} 项）` };
  return { bases: values, missing: '' };
}

/**
 * 证据字段（冷却 / 消耗）：和伤害同样按级录入，但不参与任何计算。
 * 要求等级连续、且级数和伤害一致，否则说明读错了。
 */
function evidenceSeries(levelValues, label, where, { expectedLength, maxLength } = {}) {
  if (!levelValues) return [];
  const { bases, missing } = levelSequence(levelValues);
  if (missing) throw new Error(`${where} 的${label}读数有问题：${missing}`);
  if (maxLength && bases.length > maxLength) {
    throw new Error(`${where}：${label}录了 ${bases.length} 级，这个技能只有 ${maxLength} 级`);
  }
  // 只有伤害本身已经录满时才要求级数一致；草稿的伤害是知道自己没录全的
  if (expectedLength && bases.length !== expectedLength) {
    throw new Error(`${where}：${label}录了 ${bases.length} 级，伤害录了 ${expectedLength} 级`);
  }
  return bases;
}

/** scaling: { attack: 0.45 } 或 { attack: [0.4, 0.45] } -> "base + attack * 0.45" */
function formulaFromScaling(scaling) {
  if (!scaling || typeof scaling !== 'object') return '';
  const terms = [];
  for (const variable of SCALING_VARIABLES) {
    const value = scaling[variable];
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      if (!value.length || !value.every((item) => Number.isFinite(Number(item)))) {
        throw new Error(`scaling.${variable} 里有非数字`);
      }
      const unique = Array.from(new Set(value.map(Number)));
      terms.push(unique.length === 1
        ? `${variable} * ${unique[0]}`
        : `${variable} * ${JSON.stringify(value.map(Number))}[level - 1]`);
      continue;
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) throw new Error(`scaling.${variable} 不是数字：${value}`);
    if (numeric === 0) continue;
    terms.push(`${variable} * ${numeric}`);
  }
  return terms.length ? `base + ${terms.join(' + ')}` : 'base';
}

/**
 * 非伤害读数（护盾 / 治疗量…）。计算器里没有护盾模型，这些值放进 skills 会被当成伤害行显示，
 * 所以单独收在 nonDamage 里：一样做校验、一样留证据，但 App 不读。
 */
const NON_DAMAGE_KINDS = new Set(['shield', 'heal', 'other']);

function normalizeEntry(entry, { gameData, damageTable }) {
  const hero = resolveHero(gameData, entry.hero || entry.heroKey);
  if (!hero) throw new Error(`认不出实验体：${entry.hero || entry.heroKey}`);

  const indexRows = heroIndexRows(damageTable, hero);
  const skeleton = locateSkill(indexRows, { ...entry, hero: hero.name });
  const dataKey = String(entry.dataKey || '').trim();
  if (!dataKey) throw new Error(`${hero.name} ${skeleton.slot} 缺少 dataKey（伤害段标识）`);

  const isNonDamageKind = NON_DAMAGE_KINDS.has(entry.kind);
  const { bases, missing: valueMissing } = levelSequence(entry.levelValues);
  // 技能有几级由骨架说了算：只录到 1 级的 5 级技能算草稿，绝不能当成 maxLevel 1 入库，
  // 否则会把解包表里完整的 5 级数值顶掉。
  const missing = valueMissing || (bases.length && bases.length < skeleton.maxLevel
    ? `只录到 ${bases.length} 级，这个技能共 ${skeleton.maxLevel} 级`
    : '');
  // 非伤害读数（护盾时长、被动增益秒数…）可以没有系数，直接按 base 存
  const formula = String(entry.formula || '').trim()
    || formulaFromScaling(entry.scaling)
    || (isNonDamageKind ? 'base' : '');
  if (!formula) throw new Error(`${hero.name} ${skeleton.slot} ${dataKey} 既没写 formula 也没写 scaling`);
  try {
    const probe = evaluateFormula(formula, { ...FORMULA_CONTEXT, base: bases[0] ?? 10 });
    if (!Number.isFinite(probe)) throw new Error('求值结果不是有限数');
  } catch (error) {
    throw new Error(`${hero.name} ${skeleton.slot} ${dataKey} 的公式无法求值：${formula}（${error.message}）`);
  }

  // 冷却和消耗：目前没有任何计算用到它们（伤害模型里没有这两项），只作为读数证据存下来，
  // 以后要做冷却 / 资源 / DPS 时不用重新截一遍图。
  const where = `${hero.name} ${skeleton.slot} ${dataKey}`;
  // 伤害录满了才拿它当基准比对；没录满（草稿）时只检查不超过技能等级数
  const limits = { maxLength: skeleton.maxLevel, expectedLength: missing ? 0 : bases.length };
  const cooldowns = evidenceSeries(entry.cooldownByLevel, '冷却', where, limits);
  const costs = evidenceSeries(entry.costByLevel, '消耗', where, limits);
  // 区间读数（例如被动「每秒体力恢复量 2~10」）：levelValues 存下界，levelValuesTo 存上界
  const rangeTo = evidenceSeries(entry.levelValuesTo, '区间上界', where, limits);

  const damagePart = String(entry.damagePart || '').trim();
  const title = String(entry.title || '').trim()
    || Array.from(new Set([skeleton.slot, skeleton.skillName, damagePart].filter(Boolean))).join(' ');

  const normalized = {
    id: entry.id || `ingame-${String(hero.code).padStart(3, '0')}-${kebab(hero.englishName || hero.id)}-${kebab(skeleton.slot)}-${skeleton.skillGroup}-${kebab(dataKey)}`,
    hero: hero.name,
    heroKey: hero.englishName || hero.id,
    slot: skeleton.slot,
    group: skeleton.skillGroup,
    skillId: skeleton.skillId !== 'None' ? skeleton.skillId : skeleton.passiveSkillId,
    dataKey,
    kind: entry.kind && entry.kind !== 'damage' ? entry.kind : undefined,
    title,
    damagePart: damagePart || undefined,
    levelValues: entry.levelValues || {},
    levelValuesTo: entry.levelValuesTo || undefined,
    bases: bases.join(','),
    basesTo: rangeTo.length ? rangeTo.join(',') : undefined,
    maxLevel: bases.length || undefined,
    formula,
    scaling: entry.scaling || undefined,
    scalingText: entry.scalingText || undefined,
    cooldownByLevel: entry.cooldownByLevel || undefined,
    cooldown: cooldowns.length ? cooldowns.join(',') : undefined,
    costByLevel: entry.costByLevel || undefined,
    cost: costs.length ? costs.join(',') : undefined,
    source: 'in-game-client',
    clientPatch: entry.clientPatch || '',
    capturedAt: entry.capturedAt || '',
    updatedAt: entry.updatedAt || entry.capturedAt || '',
    screenshots: Array.isArray(entry.screenshots) ? entry.screenshots : (entry.screenshots ? [entry.screenshots] : []),
    sourceNote: entry.sourceNote || '客户端「藏品 → 实验体 → 技能」界面读数',
    note: entry.note || undefined,
    // 读数没问题、但现有伤害模型表达不了这段机制时写在这里（例如「每失去 1% 体力追加伤害」）
    modelNote: entry.modelNote || undefined,
    unit: entry.unit || undefined,
    confidence: entry.confidence || 'high'
  };

  for (const key of Object.keys(normalized)) {
    if (normalized[key] === undefined) delete normalized[key];
  }

  return { normalized, draftReason: missing, skeleton };
}

// ---------------------------------------------------------------------------
// 成长数据（统计 / 武器熟练度）
// ---------------------------------------------------------------------------

/** 界面上「统计」栏三行的顺序：体力上限、攻击力、防御力，对应 growth 里的字段名。 */
const CHARACTER_STAT_FIELDS = [
  { key: 'hp', baseField: 'hp', growthField: 'maxHp', label: '体力上限' },
  { key: 'attack', baseField: 'attackPower', growthField: 'attackPower', label: '攻击力' },
  { key: 'defense', baseField: 'defense', growthField: 'defense', label: '防御力' }
];

/** 熟练度那一栏的行 -> masteryStats.json 里的 stat 枚举。中文名和驼峰名都认。 */
const MASTERY_STAT_KEYS = new Map([
  ['attackSpeed', 'AttackSpeedRatio'], ['攻击速度', 'AttackSpeedRatio'], ['攻速', 'AttackSpeedRatio'],
  ['skillAmp', 'SkillAmpRatio'], ['技能增幅', 'SkillAmpRatio'],
  ['basicAttackDamage', 'IncreaseBasicAttackDamageRatio'], ['普攻增幅', 'IncreaseBasicAttackDamageRatio'],
  ['attackPower', 'AttackPower'], ['攻击力', 'AttackPower'],
  ['preventBasicAttackDamaged', 'PreventBasicAttackDamagedRatio'], ['承受普攻伤害减少', 'PreventBasicAttackDamagedRatio'],
  ['preventSkillDamaged', 'PreventSkillDamagedRatio'], ['承受技能伤害减少', 'PreventSkillDamagedRatio'],
  ['monsterDamage', 'AmplifierToMonsterRatio'], ['野怪伤害', 'AmplifierToMonsterRatio'],
  ['moveSpeed', 'MoveSpeed'], ['移动速度', 'MoveSpeed'],
  ['sightRange', 'SightRange'], ['视野', 'SightRange'],
  ['hpRegenOutOfCombat', 'HpRegenRatioOutOfCombat'], ['非战斗体力再生', 'HpRegenRatioOutOfCombat']
]);

const MASTERY_MAX_LEVEL = 20;

function requireNumber(value, what) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new Error(`${what} 不是数字：${value}`);
  return numeric;
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * 「统计」栏对账。客户端 Lv20 是向下取整显示的（例如 33 + 4.3*19 = 114.7 显示 114），
 * 所以反推的每级成长必然有 ±1/19 的误差 —— 只要仓库现有成长值能复现截图上的两个数字，
 * 就以仓库值为准，不生成覆盖。
 */
function normalizeCharacterStats(entry, { gameData }) {
  const hero = resolveHero(gameData, entry.hero || entry.heroKey);
  if (!hero) throw new Error(`认不出实验体：${entry.hero || entry.heroKey}`);
  if (!entry.lv1 || !entry.lv20) throw new Error(`${hero.name} 的统计栏缺 lv1 或 lv20`);

  const checks = [];
  const derivedGrowth = {};
  const override = { base: {}, growth: {} };
  let conflicted = false;

  for (const field of CHARACTER_STAT_FIELDS) {
    const captured1 = requireNumber(entry.lv1[field.key], `${hero.name} Lv1 ${field.label}`);
    const captured20 = requireNumber(entry.lv20[field.key], `${hero.name} Lv20 ${field.label}`);
    const repoBase = Number(hero.base?.[field.baseField]);
    const repoGrowth = Number(hero.growth?.[field.growthField]);
    const predicted20 = Math.floor(repoBase + repoGrowth * (MASTERY_MAX_LEVEL - 1));
    const derived = round((captured20 - captured1) / (MASTERY_MAX_LEVEL - 1), 4);
    derivedGrowth[field.growthField] = derived;

    const baseMatches = Math.abs(repoBase - captured1) < 0.5;
    const growthMatches = predicted20 === captured20;
    if (!baseMatches || !growthMatches) {
      conflicted = true;
      override.base[field.baseField] = captured1;
      override.growth[field.growthField] = derived;
    }
    checks.push({
      stat: field.label,
      captured: `${captured1} → ${captured20}`,
      repo: `${repoBase} +${repoGrowth}/级 → ${predicted20}`,
      result: baseMatches && growthMatches ? 'match' : (baseMatches ? 'growth-conflict' : 'base-conflict')
    });
  }

  const normalized = {
    id: `ingame-stats-${String(hero.code).padStart(3, '0')}-${kebab(hero.englishName || hero.id)}`,
    hero: hero.name,
    heroCode: hero.code,
    heroKey: hero.englishName || hero.id,
    lv1: { ...entry.lv1 },
    lv20: { ...entry.lv20 },
    derivedGrowth,
    repoCheck: conflicted ? 'conflict' : 'match',
    checks,
    override: conflicted ? override : undefined,
    source: 'in-game-client',
    clientPatch: entry.clientPatch || '',
    capturedAt: entry.capturedAt || '',
    screenshots: Array.isArray(entry.screenshots) ? entry.screenshots : (entry.screenshots ? [entry.screenshots] : []),
    note: entry.note || undefined
  };
  if (!normalized.override) delete normalized.override;
  if (!normalized.note) delete normalized.note;
  return normalized;
}

/**
 * 「武器熟练度」栏对账。界面显示的是**累计值**：Lv1 就是每级增量，Lv20 = 每级 * 20。
 */
function normalizeWeaponMastery(entry, { gameData, masteryStats }) {
  const hero = resolveHero(gameData, entry.hero || entry.heroKey);
  if (!hero) throw new Error(`认不出实验体：${entry.hero || entry.heroKey}`);

  const zhToCode = weaponTypeMap(gameData);
  const weaponLabel = String(entry.weapon || '').trim();
  const weaponType = String(entry.weaponType || '').trim() || zhToCode.get(weaponLabel) || '';
  if (!weaponType) {
    const candidates = (hero.weapons || []).map((code) => {
      const zh = Array.from(zhToCode.entries()).find(([, value]) => value === code)?.[0];
      return zh ? `${zh}(${code})` : code;
    });
    throw new Error(`认不出武器类别「${weaponLabel}」；${hero.name} 可用：${candidates.join(' / ') || '未知'}（也可直接写 weaponType）`);
  }
  if (!(hero.weapons || []).includes(weaponType)) {
    throw new Error(`${hero.name} 不能用 ${weaponType}（可用：${(hero.weapons || []).join(' / ')}）`);
  }

  const repoRow = masteryStats.find((row) => row.characterCode === hero.code && row.type === weaponType);
  const lv1 = entry.lv1 || {};
  const lv20 = entry.lv20 || {};
  const options = [];
  const override = [];
  let conflicted = false;

  for (const [rawKey, captured1] of Object.entries(lv1)) {
    const stat = MASTERY_STAT_KEYS.get(rawKey);
    if (!stat) throw new Error(`${hero.name} ${weaponLabel || weaponType}：认不出熟练度属性「${rawKey}」`);
    const isRatio = stat.endsWith('Ratio');
    const perLevelDisplay = requireNumber(captured1, `${hero.name} ${stat} Lv1`);
    const perLevel = isRatio ? round(perLevelDisplay / 100, 5) : perLevelDisplay;

    // Lv20 是校验位：应当等于每级值 * 20（客户端四舍五入显示，容 1 个显示单位）
    const captured20 = lv20[rawKey];
    let levelCheck = 'not-captured';
    if (captured20 !== undefined && captured20 !== null && captured20 !== '') {
      const expected20 = round(perLevelDisplay * MASTERY_MAX_LEVEL, 1);
      levelCheck = Math.abs(requireNumber(captured20, `${hero.name} ${stat} Lv20`) - expected20) <= 1 ? 'ok' : `mismatch(期望≈${expected20})`;
    }

    const repoOption = repoRow?.options?.find((option) => option.stat === stat);
    const repoValue = repoOption ? Number(repoOption.value) : null;
    const repoDisplay1 = repoValue === null ? null : round(isRatio ? repoValue * 100 : repoValue, 1);
    const repoDisplay20 = repoValue === null ? null : round(isRatio ? repoValue * 100 * MASTERY_MAX_LEVEL : repoValue * MASTERY_MAX_LEVEL, 1);
    const matches = repoDisplay1 !== null
      && Math.abs(repoDisplay1 - perLevelDisplay) < 0.05
      && (captured20 === undefined || Math.abs(repoDisplay20 - Number(captured20)) <= 1);
    if (!matches) {
      conflicted = true;
      override.push({ stat, value: perLevel });
    }
    options.push({
      stat,
      capturedPerLevel: perLevel,
      capturedDisplay: `${perLevelDisplay}${isRatio ? '%' : ''} → ${captured20 ?? '-'}${isRatio && captured20 !== undefined ? '%' : ''}`,
      repoValue,
      levelCheck,
      result: matches ? 'match' : (repoValue === null ? 'missing-in-repo' : 'conflict')
    });
  }

  const extraInRepo = (repoRow?.options || [])
    .filter((option) => !options.some((item) => item.stat === option.stat))
    .map((option) => option.stat);

  const normalized = {
    id: `ingame-mastery-${String(hero.code).padStart(3, '0')}-${kebab(hero.englishName || hero.id)}-${kebab(weaponType)}`,
    hero: hero.name,
    heroCode: hero.code,
    heroKey: hero.englishName || hero.id,
    weapon: weaponLabel || weaponType,
    weaponType,
    maxMasteryLevel: MASTERY_MAX_LEVEL,
    // lv1/lv20 是录入原文，必须留在输出里，否则重复跑 build 会读不到读数
    lv1: { ...lv1 },
    lv20: { ...lv20 },
    options,
    notCaptured: extraInRepo.length ? extraInRepo : undefined,
    repoCheck: conflicted ? 'conflict' : 'match',
    override: conflicted ? override : undefined,
    source: 'in-game-client',
    clientPatch: entry.clientPatch || '',
    capturedAt: entry.capturedAt || '',
    screenshots: Array.isArray(entry.screenshots) ? entry.screenshots : (entry.screenshots ? [entry.screenshots] : []),
    note: entry.note || undefined
  };
  for (const key of ['notCaptured', 'override', 'note']) {
    if (!normalized[key]) delete normalized[key];
  }
  return normalized;
}

// ---------------------------------------------------------------------------
// 子命令
// ---------------------------------------------------------------------------

function formatLevels(row) {
  const values = [1, 2, 3, 4, 5, 6]
    .map((level) => row[`lv${level}`])
    .filter((value) => value !== '' && value !== undefined && value !== null);
  return values.length ? values.join('/') : '（无数值）';
}

function commandList(context, heroQuery) {
  const hero = resolveHero(context.gameData, heroQuery);
  if (!hero) throw new Error(`认不出实验体：${heroQuery}`);
  const indexRows = heroIndexRows(context.damageTable, hero);
  const existing = existingDamageEntries(context, hero);

  console.log(`\n${hero.name} / ${hero.englishName}（code ${hero.code}）—— ${indexRows.length} 个技能组`);
  console.log('录入时照抄下面的 dataKey，才会覆盖旧值而不是并列出两行。\n');
  for (const row of indexRows) {
    const rows = existing.filter((item) => item.group === row.skillGroup);
    console.log(`[${row.slot}] ${row.skillName}  group=${row.skillGroup}  skillId=${row.skillId !== 'None' ? row.skillId : row.passiveSkillId}  maxLevel=${row.maxLevel}`);
    if (rows.length) {
      for (const item of rows) {
        const beatsCapture = item.authority > 60 ? '  ← 权威高于客户端读数，录了也不会生效' : '';
        console.log(`     已有 dataKey=${JSON.stringify(item.dataKey).padEnd(28)} ${item.bases}   ${item.coef}`);
        console.log(`          来源 ${item.source}${beatsCapture}`);
      }
    } else {
      console.log(`     ⚠ 任何来源都没有数值（${row.coverageStatus}）——需要从客户端读，dataKey 自己起名`);
    }
    if (row.coefficientText) console.log(`     模板 ${row.coefficientText.replace(/\s+/g, ' ').trim()}`);
    console.log('');
  }
}

function commandStub(context, heroQuery, slotFilter) {
  const hero = resolveHero(context.gameData, heroQuery);
  if (!hero) throw new Error(`认不出实验体：${heroQuery}`);
  const indexRows = heroIndexRows(context.damageTable, hero)
    .filter((row) => !slotFilter || row.slot === slotFilter.toUpperCase());
  const existing = existingDamageEntries(context, hero);

  // 已有伤害段每段一条骨架（dataKey 照抄，保证覆盖生效）；一段都没有的技能组给一条空骨架。
  const stubs = indexRows.flatMap((row) => {
    const rows = existing.filter((item) => item.group === row.skillGroup);
    const levelValues = Object.fromEntries(
      Array.from({ length: row.maxLevel || 5 }, (unused, index) => [index + 1, null])
    );
    const base = {
      hero: hero.name,
      slot: row.slot,
      group: row.skillGroup,
      levelValues,
      scaling: { ap: null },
      scalingText: '',
      clientPatch: '',
      capturedAt: '',
      screenshots: [`${hero.name}-${row.slot}.png`]
    };
    if (!rows.length) return [{ ...base, dataKey: 'Damage', damagePart: '基础伤害' }];
    return rows.map((item) => ({ ...base, dataKey: item.dataKey, damagePart: item.label || '基础伤害' }));
  });
  console.log(JSON.stringify(stubs, null, 2));
}

async function commandBuild(context, capturePath, checkOnly) {
  const entries = [
    ...(context.capture.skills || []),
    ...(context.capture.drafts || []),
    ...(context.capture.nonDamage || [])
  ];
  const skills = [];
  const drafts = [];
  const nonDamage = [];
  const errors = [];
  const seen = new Map();

  for (const entry of entries) {
    let result;
    try {
      result = normalizeEntry(entry, context);
    } catch (error) {
      errors.push(error.message);
      continue;
    }
    const { normalized, draftReason } = result;
    const dedupeKey = [normalized.hero, normalized.group, normalized.skillId, normalized.dataKey].join('|');
    if (seen.has(dedupeKey)) {
      errors.push(`重复的伤害段 ${dedupeKey}（id ${normalized.id} 与 ${seen.get(dedupeKey)} 撞了，改 dataKey 区分）`);
      continue;
    }
    seen.set(dedupeKey, normalized.id);
    if (draftReason) {
      drafts.push({ ...normalized, draftReason });
    } else if (NON_DAMAGE_KINDS.has(normalized.kind)) {
      nonDamage.push(normalized);
    } else {
      skills.push(normalized);
    }
  }

  const sortKey = (item) => `${String(item.group).padStart(9, '0')}-${item.dataKey}`;
  skills.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  drafts.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  nonDamage.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

  // 成长数据（统计 / 武器熟练度）
  const characterStats = [];
  const weaponMastery = [];
  for (const entry of context.capture.characterStats || []) {
    try {
      characterStats.push(normalizeCharacterStats(entry, context));
    } catch (error) {
      errors.push(error.message);
    }
  }
  for (const entry of context.capture.weaponMastery || []) {
    try {
      weaponMastery.push(normalizeWeaponMastery(entry, context));
    } catch (error) {
      errors.push(error.message);
    }
  }
  characterStats.sort((a, b) => a.heroCode - b.heroCode);
  weaponMastery.sort((a, b) => a.heroCode - b.heroCode || a.weaponType.localeCompare(b.weaponType));

  const output = {
    ...context.capture,
    generatedAt: new Date().toISOString(),
    counts: {
      skills: skills.length,
      drafts: drafts.length,
      nonDamage: nonDamage.length,
      heroes: new Set(skills.map((item) => item.hero)).size,
      characterStats: characterStats.length,
      weaponMastery: weaponMastery.length,
      statsConflicts: [...characterStats, ...weaponMastery].filter((item) => item.repoCheck === 'conflict').length
    },
    skills,
    drafts,
    nonDamage,
    characterStats,
    weaponMastery
  };

  for (const message of errors) console.error(`✗ ${message}`);
  for (const draft of drafts) console.warn(`… 草稿（不入库）${draft.hero} ${draft.title}：${draft.draftReason}`);
  // capturedAt 影响同权威条目之间的取新，缺了不致命但会退化成“取靠后的一条”
  for (const skill of skills.filter((item) => !item.capturedAt)) {
    console.warn(`! ${skill.hero} ${skill.title} 没写 capturedAt，同权威撞车时无法比新旧`);
  }
  reportStats(output);
  for (const item of nonDamage) {
    console.log(`· 非伤害读数（App 不读）${item.hero} ${item.title}：${item.bases}  [${item.kind}]`);
  }
  console.log(`${checkOnly ? '校验' : '写入'}完成：入库 ${skills.length} 段，草稿 ${drafts.length} 段，`
    + `非伤害 ${nonDamage.length} 段，成长数据 ${characterStats.length + weaponMastery.length} 项`
    + `（冲突 ${output.counts.statsConflicts}），错误 ${errors.length} 条`);

  if (!checkOnly && !errors.length) {
    await writeFile(capturePath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    console.log(`→ ${path.relative(rootDir, capturePath)}`);
  } else if (errors.length) {
    console.error('有错误，未写回文件。');
    process.exitCode = 1;
  }
}

/** 成长数据对账结果：一致的只报一行，冲突的把每一项摊开。 */
function reportStats(capture) {
  for (const entry of capture.characterStats || []) {
    if (entry.repoCheck === 'match') {
      console.log(`✓ ${entry.hero} 统计栏与仓库一致（体力/攻击/防御 Lv1→Lv20 全对得上），不生成覆盖`);
      continue;
    }
    console.warn(`⚠ ${entry.hero} 统计栏与仓库不一致，已生成覆盖：`);
    entry.checks.filter((check) => check.result !== 'match')
      .forEach((check) => console.warn(`    ${check.stat}：截图 ${check.captured}   仓库 ${check.repo}   [${check.result}]`));
  }
  for (const entry of capture.weaponMastery || []) {
    const label = `${entry.hero} / ${entry.weapon}(${entry.weaponType})`;
    if (entry.repoCheck === 'match') {
      console.log(`✓ ${label} 熟练度成长与仓库一致（${entry.options.map((o) => o.stat).join('、')}），不生成覆盖`);
    } else {
      console.warn(`⚠ ${label} 熟练度成长与仓库不一致，已生成覆盖：`);
      entry.options.filter((option) => option.result !== 'match')
        .forEach((option) => console.warn(`    ${option.stat}：截图 ${option.capturedDisplay}   仓库 ${option.repoValue ?? '（无此项）'}   [${option.result}]`));
    }
    entry.options.filter((option) => option.levelCheck !== 'ok' && option.levelCheck !== 'not-captured')
      .forEach((option) => console.warn(`    ! ${option.stat} 的 Lv20 校验位对不上：${option.levelCheck}`));
    if (entry.notCaptured) console.warn(`    ! 仓库里还有没截到的项：${entry.notCaptured.join('、')}`);
  }
}

function commandStats(context) {
  reportStats(context.capture);
  const all = [...(context.capture.characterStats || []), ...(context.capture.weaponMastery || [])];
  if (!all.length) console.log('还没录入任何成长数据。');
}

function commandStatus(context) {
  const hero = (item) => item.hero;
  const skills = context.capture.skills || [];
  const drafts = context.capture.drafts || [];
  const byHero = new Map();
  for (const item of skills) byHero.set(hero(item), (byHero.get(hero(item)) || 0) + 1);

  const indexRows = context.damageTable.skillIndexRows || [];
  // 「有数值」要看所有来源，不只是解包表 —— 不然会把 Wiki / 公告已经覆盖的技能也算成缺口
  const groupsWithDamage = new Set([
    ...(context.damageTable.damageRows || []).map((row) => row.skillGroup),
    ...(context.fallback.skills || []).map((skill) => skill.group),
    ...(context.augments.skills || []).map((skill) => skill.group)
  ].filter(Boolean));
  const capturedGroups = new Set(skills.map((row) => row.group));
  const missing = indexRows.filter((row) => !groupsWithDamage.has(row.skillGroup) && !capturedGroups.has(row.skillGroup));

  const missingByHero = new Map();
  for (const row of missing) missingByHero.set(row.heroName, (missingByHero.get(row.heroName) || 0) + 1);

  console.log(`已录入 ${skills.length} 段伤害，覆盖 ${byHero.size} 个实验体；草稿 ${drafts.length} 段`);
  console.log(`全部技能组 ${indexRows.length}，其中仍无任何数值的 ${missing.length} 组\n`);
  console.log('缺数值最多的实验体（建议优先截图）：');
  Array.from(missingByHero.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([name, count]) => console.log(`  ${String(count).padStart(2)} 组  ${name}`));
}

// ---------------------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);
  const fileFlag = argv.indexOf('--file');
  const slotFlag = argv.indexOf('--slot');
  const capturePath = fileFlag >= 0 ? path.resolve(argv[fileFlag + 1]) : defaultCapturePath;
  const slot = slotFlag >= 0 ? argv[slotFlag + 1] : '';
  // 带值的开关：跳过开关本身和它后面那个值，剩下的才是位置参数
  const valueFlagIndexes = new Set([fileFlag, fileFlag + 1, slotFlag, slotFlag + 1].filter((index) => index > 0));
  const positional = argv.filter((item, index) => !item.startsWith('--') && !valueFlagIndexes.has(index));
  const [command, target] = positional;

  const context = await loadContext(capturePath);

  switch (command) {
    case 'list':
      commandList(context, target);
      break;
    case 'stub':
      commandStub(context, target, slot);
      break;
    case 'build':
      await commandBuild(context, capturePath, argv.includes('--check'));
      break;
    case 'status':
      commandStatus(context);
      break;
    case 'stats':
      commandStats(context);
      break;
    default:
      console.log('用法：node scripts/ingame-capture.mjs <list|stub|build|status|stats> [英雄] [--slot Q] [--check] [--file path]');
      process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
