// 游戏客户端截图录入工具
//
// 用途：把《永恒轮回》客户端「藏品 → 实验体 → 技能」界面里显示的技能参数，
// 规范化成 src/data/inGameSkillCapture.json，供计算器直接读取。
//
// 客户端显示的是当前版本的真实生效数值，权威性高于官方公告（公告只写改动项），
// 因此这个文件的 source 是 `in-game-client`，权威值 85（见 src/lib/skillSources.js）。
//
// 子命令：
//   list <英雄>            打印该英雄的技能骨架、现有数值、以及缺数值的技能段
//   stub <英雄> [--slot Q] 输出可直接粘贴进 inGameSkillCapture.json 的录入骨架
//   build [--check]        规范化录入内容（补 id/bases/title/heroCode）并写回
//   status                 汇总录入进度
//
// 通用参数：
//   --file <path>          改用别的录入文件（测试用）

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateFormula } from '../src/lib/formula.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'src', 'data');
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
  const [gameData, damageTable, capture] = await Promise.all([
    readJson(path.join(dataDir, 'erGameData.json')),
    readJson(path.join(dataDir, 'erSkillDamageTable.json')),
    readJson(capturePath)
  ]);
  return { gameData, damageTable, capture };
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

function normalizeEntry(entry, { gameData, damageTable }) {
  const hero = resolveHero(gameData, entry.hero || entry.heroKey);
  if (!hero) throw new Error(`认不出实验体：${entry.hero || entry.heroKey}`);

  const indexRows = heroIndexRows(damageTable, hero);
  const skeleton = locateSkill(indexRows, { ...entry, hero: hero.name });
  const dataKey = String(entry.dataKey || '').trim();
  if (!dataKey) throw new Error(`${hero.name} ${skeleton.slot} 缺少 dataKey（伤害段标识）`);

  const { bases, missing } = levelSequence(entry.levelValues);
  const formula = String(entry.formula || '').trim() || formulaFromScaling(entry.scaling);
  if (!formula) throw new Error(`${hero.name} ${skeleton.slot} ${dataKey} 既没写 formula 也没写 scaling`);
  try {
    const probe = evaluateFormula(formula, { ...FORMULA_CONTEXT, base: bases[0] ?? 10 });
    if (!Number.isFinite(probe)) throw new Error('求值结果不是有限数');
  } catch (error) {
    throw new Error(`${hero.name} ${skeleton.slot} ${dataKey} 的公式无法求值：${formula}（${error.message}）`);
  }

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
    title,
    damagePart: damagePart || undefined,
    levelValues: entry.levelValues || {},
    bases: bases.join(','),
    maxLevel: bases.length || undefined,
    formula,
    scaling: entry.scaling || undefined,
    scalingText: entry.scalingText || undefined,
    source: 'in-game-client',
    clientPatch: entry.clientPatch || '',
    capturedAt: entry.capturedAt || '',
    updatedAt: entry.updatedAt || entry.capturedAt || '',
    screenshots: Array.isArray(entry.screenshots) ? entry.screenshots : (entry.screenshots ? [entry.screenshots] : []),
    sourceNote: entry.sourceNote || '客户端「藏品 → 实验体 → 技能」界面读数',
    note: entry.note || undefined,
    confidence: entry.confidence || 'high'
  };

  for (const key of Object.keys(normalized)) {
    if (normalized[key] === undefined) delete normalized[key];
  }

  return { normalized, draftReason: missing, skeleton };
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
  const damageRows = heroDamageRows(context.damageTable, hero);

  console.log(`\n${hero.name} / ${hero.englishName}（code ${hero.code}）—— ${indexRows.length} 个技能组\n`);
  for (const row of indexRows) {
    const rows = damageRows.filter((item) => item.skillGroup === row.skillGroup);
    console.log(`[${row.slot}] ${row.skillName}  group=${row.skillGroup}  skillId=${row.skillId !== 'None' ? row.skillId : row.passiveSkillId}  maxLevel=${row.maxLevel}`);
    if (rows.length) {
      for (const item of rows) {
        console.log(`     已有 ${item.baseKey.padEnd(26)} ${item.damagePart} = ${formatLevels(item)}   系数 ${item.coefLv1 ?? '-'} (${item.coefKey})`);
      }
    } else {
      console.log(`     ⚠ 解包表没有结构化数值（${row.coverageStatus}）——需要从客户端读`);
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
  const damageRows = heroDamageRows(context.damageTable, hero);

  const stubs = indexRows.map((row) => {
    const existing = damageRows.filter((item) => item.skillGroup === row.skillGroup);
    return {
      hero: hero.name,
      slot: row.slot,
      group: row.skillGroup,
      dataKey: existing[0]?.baseKey || 'Damage',
      damagePart: existing[0]?.damagePart || '基础伤害',
      levelValues: { 1: null, 2: null, 3: null, 4: null, 5: null },
      scaling: { attack: null },
      scalingText: '',
      clientPatch: '',
      capturedAt: '',
      screenshots: [`${hero.name}-${row.slot}.png`]
    };
  });
  console.log(JSON.stringify(stubs, null, 2));
}

async function commandBuild(context, capturePath, checkOnly) {
  const entries = [
    ...(context.capture.skills || []),
    ...(context.capture.drafts || [])
  ];
  const skills = [];
  const drafts = [];
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
    } else {
      skills.push(normalized);
    }
  }

  const sortKey = (item) => `${String(item.group).padStart(9, '0')}-${item.dataKey}`;
  skills.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  drafts.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

  const output = {
    ...context.capture,
    generatedAt: new Date().toISOString(),
    counts: {
      skills: skills.length,
      drafts: drafts.length,
      heroes: new Set(skills.map((item) => item.hero)).size
    },
    skills,
    drafts
  };

  for (const message of errors) console.error(`✗ ${message}`);
  for (const draft of drafts) console.warn(`… 草稿（不入库）${draft.hero} ${draft.title}：${draft.draftReason}`);
  console.log(`${checkOnly ? '校验' : '写入'}完成：入库 ${skills.length} 段，草稿 ${drafts.length} 段，错误 ${errors.length} 条`);

  if (!checkOnly && !errors.length) {
    await writeFile(capturePath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    console.log(`→ ${path.relative(rootDir, capturePath)}`);
  } else if (errors.length) {
    console.error('有错误，未写回文件。');
    process.exitCode = 1;
  }
}

function commandStatus(context) {
  const hero = (item) => item.hero;
  const skills = context.capture.skills || [];
  const drafts = context.capture.drafts || [];
  const byHero = new Map();
  for (const item of skills) byHero.set(hero(item), (byHero.get(hero(item)) || 0) + 1);

  const indexRows = context.damageTable.skillIndexRows || [];
  const damageRows = context.damageTable.damageRows || [];
  const groupsWithDamage = new Set(damageRows.map((row) => row.skillGroup));
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
    default:
      console.log('用法：node scripts/ingame-capture.mjs <list|stub|build|status> [英雄] [--slot Q] [--check] [--file path]');
      process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
