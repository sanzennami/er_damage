// 按官方补丁日志把数据推到目标态。**幂等，可以随时重跑。**
//
// 设计要点（和早期那版一次性迁移脚本的区别）：
//
//   - 记录的是「该补丁之后应该是什么值」（目标态），不是「从 A 改成 B」的增量。
//   - 因此判断依据是**当前值是否已等于目标值**，而不是「改前值对不对得上」。
//     已经达标就跳过，永远不需要 git checkout 还原数据再跑。
//   - 跟版本走：新版本上线只需在 src/data/patchLog.json 末尾追加一段，再跑一次本脚本。
//   - 标了 "manual": true 的技能条目不会被自动覆盖，只会列出待确认的官方新值，
//     由人工决定是否采纳；除非该条变更显式写了 "overrideManual": true。
//
// 用法：
//   node scripts/apply-patch-log.mjs              应用全部补丁
//   node scripts/apply-patch-log.mjs --from 12.0  只应用该版本及之后
//   node scripts/apply-patch-log.mjs --dry-run    只报告，不写文件

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(rootDir, 'src', 'data');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const fromIndex = args.indexOf('--from');
const fromVersion = fromIndex >= 0 ? args[fromIndex + 1] : null;

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const writeJson = (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');

const num = (value) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};
const sameNumber = (a, b) => {
  const x = num(a);
  const y = num(b);
  if (x === null || y === null) return String(a) === String(b);
  return Math.abs(x - y) < 1e-9;
};

function setByPath(target, dottedPath, value) {
  const parts = dottedPath.split('.');
  const last = parts.pop();
  let node = target;
  for (const part of parts) {
    if (!node[part] || typeof node[part] !== 'object') node[part] = {};
    node = node[part];
  }
  const previous = node[last];
  node[last] = value;
  return previous;
}
function getByPath(target, dottedPath) {
  return dottedPath.split('.').reduce((node, part) => (node === undefined || node === null ? node : node[part]), target);
}

// 只影响界面呈现、不影响数值本身的字段（叠层选择器、命中次数、护盾/治疗标记）
const PRESENTATION_FIELDS = ['maxStacks', 'stackLabel', 'stackStep', 'maxHits', 'defaultHits', 'hitLabel', 'hitNote', 'kind', 'buffKey', 'damageType', 'progressiveDamage'];

/** progressiveDamage 是对象，不能用 === 比，否则每次都判定成没达标、反复重写。 */
function samePresentationValue(a, b) {
  if (a && typeof a === 'object') return JSON.stringify(a) === JSON.stringify(b);
  return a === b;
}

/** 条目上那句来源说明。达标判断和实际写入必须用同一份，否则改说明永远写不进去。 */
function composeSourceNote(patch, change) {
  const origin = change.source === 'in-game-client'
    ? `客户端读数 ${patch.version}`
    : `官方公告 ${patch.version}`;
  return [`${origin} 数值：${change.coefficientText || ''}`, change.note].filter(Boolean).join(' ');
}

const STAT_ALIAS = {
  attackPower: 'attackPower', skillAmp: 'ap', cooldownReduction: 'cd', defense: 'defense',
  maxHp: 'maxHp', sightRange: 'sightRange', penetrationDefense: 'pen',
  penetrationDefenseRatio: 'penPct', skillAmpRatio: 'apPct'
};

async function main() {
  const files = {
    patchLog: path.join(dataDir, 'patchLog.json'),
    heroSkills: path.join(dataDir, 'heroSkills.json'),
    equipment: path.join(dataDir, 'equipment.json'),
    characters: path.join(dataDir, 'characters.json'),
    mastery: path.join(dataDir, 'masteryStats.json')
  };

  const patchLog = await readJson(files.patchLog);
  const heroSkills = await readJson(files.heroSkills);
  const equipment = await readJson(files.equipment);
  const characters = await readJson(files.characters);
  const mastery = await readJson(files.mastery);

  const skillById = new Map(heroSkills.skills.map((skill) => [skill.id, skill]));
  const equipByName = new Map(equipment.equipment.map((item) => [item.name, item]));
  const charByName = new Map(characters.characters.map((item) => [item.name, item]));

  const stats = { applied: 0, already: 0, manualHeld: 0, missing: 0 };
  const report = { generatedAt: new Date().toISOString(), dryRun, patches: [] };

  const ordered = [...(patchLog.patches || [])].sort((a, b) => a.order - b.order);
  const startOrder = fromVersion
    ? (ordered.find((patch) => patch.version === fromVersion)?.order ?? -Infinity)
    : -Infinity;

  // 先把日志折叠成「每个目标的最新值」：同一目标被多个补丁改过时只应用最后一次，
  // 避免每次重跑都把被后续补丁覆盖掉的中间值再写一遍。
  const latest = new Map();
  for (const patch of ordered) {
    if (patch.order < startOrder) continue;
    const put = (kind, key, change) => latest.set(`${kind}|${key}`, { kind, change, patch });
    for (const change of patch.skills || []) put('skill', change.id, change);
    for (const change of patch.equipment || []) put('equipment', `${change.name}|${change.stat}`, change);
    for (const change of patch.characters || []) put('character', `${change.hero}|${change.path}`, change);
    for (const change of patch.mastery || []) put('mastery', `${change.hero}|${change.type}|${change.stat}`, change);
  }
  const byPatch = new Map(ordered.map((patch) => [patch.version, { skills: [], equipment: [], characters: [], mastery: [] }]));
  for (const { kind, change, patch } of latest.values()) {
    const bucket = byPatch.get(patch.version);
    if (kind === 'skill') bucket.skills.push(change);
    else if (kind === 'equipment') bucket.equipment.push(change);
    else if (kind === 'character') bucket.characters.push(change);
    else bucket.mastery.push(change);
  }
  const effective = ordered
    .filter((patch) => patch.order >= startOrder)
    .map((patch) => ({ ...patch, ...byPatch.get(patch.version) }));

  for (const patch of effective) {
    const log = { version: patch.version, date: patch.date, applied: [], already: 0, manualHeld: [], missing: [] };

    const stamp = (entry) => {
      entry.patchVersion = patch.version;
      entry.patchOrder = patch.order;
      entry.updatedAt = `${patch.date}T02:00:00.000Z`;
      entry.sourceUrl = patch.url;
      entry.sourceTitle = patch.title;
    };

    // --- 技能 ---
    for (const change of patch.skills || []) {
      let entry = skillById.get(change.id);
      if (!entry) {
        // 补丁公布了新实验体/新伤害段时，允许建条：需要带全身份字段
        if (change.create && change.hero && change.bases && change.formula) {
          entry = {
            id: change.id,
            hero: change.hero,
            heroKey: change.heroKey,
            slot: change.slot,
            title: change.title,
            group: change.group,
            skillId: change.skillId,
            dataKey: change.dataKey,
            bases: '',
            maxLevel: 0,
            formula: '',
            source: change.source || 'official-patch-note',
            manual: false
          };
          if (change.authority !== undefined) entry.authority = change.authority;
          else if (!change.source) entry.authority = 80;
          if (!dryRun) {
            heroSkills.skills.push(entry);
            skillById.set(entry.id, entry);
          }
          log.created = (log.created || 0) + 1;
        } else {
          log.missing.push(`skill ${change.id}`);
          stats.missing += 1;
          continue;
        }
      }
      const wantBases = change.bases ?? entry.bases;
      const wantFormula = change.formula ?? entry.formula;
      // 展示参数也要参与「是否已达标」的判断，否则数值没变时新字段永远写不进去
      const samePresentation = PRESENTATION_FIELDS
        .every((field) => change[field] === undefined || samePresentationValue(change[field], entry[field]));
      // 标题和来源也要比：只改名或只换来源（例如 Wiki 值被客户端读数确认）时数值不变，
      // 不比的话这类变更永远写不进去。
      const sameTitle = change.title === undefined || change.title === entry.title;
      const sameSource = change.source === undefined || change.source === entry.source;
      // 官方原文与说明同理：数值没动、只是补一句来源说明时也要能写进去。
      const sameCoefficientText = !change.coefficientText || change.coefficientText === entry.coefficientText;
      const sameSourceNote = composeSourceNote(patch, change) === entry.sourceNote;
      const atTarget = String(entry.bases) === String(wantBases)
        && String(entry.formula) === String(wantFormula)
        && samePresentation && sameTitle && sameSource
        && sameCoefficientText && sameSourceNote;

      if (atTarget) {
        if (entry.patchOrder === undefined && !dryRun) { entry.patchVersion = patch.version; entry.patchOrder = patch.order; }
        log.already += 1;
        stats.already += 1;
        continue;
      }
      // "overrideManual": true 表示这条人工值本来就是脚本推导出来的待复核值，
      // 且已经有更晚的官方公告给出确定数值，允许公告压过去。
      // 俞岷 / 奇娅拉那种真正人工校对过的条目走 special-skill-rule，不在这里。
      if (entry.manual === true && change.overrideManual !== true) {
        log.manualHeld.push({ id: change.id, hero: entry.hero, title: entry.title, keep: { bases: entry.bases, formula: entry.formula }, official: { bases: wantBases, formula: wantFormula } });
        stats.manualHeld += 1;
        continue;
      }
      if (!dryRun) {
        entry.bases = wantBases;
        entry.maxLevel = String(wantBases).split(',').filter((value) => value.trim() !== '').length || entry.maxLevel;
        entry.formula = wantFormula;
        if (change.title) entry.title = change.title;
        if (change.overrideManual === true) entry.manual = false;
        // 界面参数：叠层上限/标题、命中次数上限、非伤害类型（护盾/治疗）
        for (const field of PRESENTATION_FIELDS) {
          if (change[field] !== undefined) entry[field] = change[field];
        }
        if (change.coefficientText) entry.coefficientText = change.coefficientText;
        // 默认来源是官方公告；客户端截图读数等其它来路在变更里显式声明 source
        entry.source = change.source || 'official-patch-note';
        entry.authority = change.authority ?? (change.source ? undefined : 80);
        if (entry.authority === undefined) delete entry.authority;
        entry.sourceNote = composeSourceNote(patch, change);
        stamp(entry);
      }
      log.applied.push(`skill ${entry.hero} ${entry.title}`);
      stats.applied += 1;
    }

    // --- 装备 ---
    for (const change of patch.equipment || []) {
      const item = equipByName.get(change.name);
      if (!item) {
        log.missing.push(`equipment ${change.name}`);
        stats.missing += 1;
        continue;
      }
      item.stats = item.stats || {};
      const current = item.stats[change.stat];
      const atTarget = change.remove ? current === undefined : sameNumber(current, change.value);
      if (atTarget) {
        log.already += 1;
        stats.already += 1;
        continue;
      }
      if (!dryRun) {
        if (change.remove) delete item.stats[change.stat];
        else item.stats[change.stat] = change.value;
        const alias = STAT_ALIAS[change.stat];
        if (alias) item[alias] = change.remove ? 0 : change.value;
        item.patchVersion = patch.version;
        item.patchOrder = patch.order;
      }
      log.applied.push(`equipment ${change.name}.${change.stat}`);
      stats.applied += 1;
    }

    // --- 实验体属性 ---
    for (const change of patch.characters || []) {
      const character = charByName.get(change.hero);
      if (!character) {
        log.missing.push(`character ${change.hero}`);
        stats.missing += 1;
        continue;
      }
      if (sameNumber(getByPath(character, change.path), change.value)) {
        log.already += 1;
        stats.already += 1;
        continue;
      }
      if (!dryRun) {
        setByPath(character, change.path, change.value);
        character.patchVersion = patch.version;
        character.patchOrder = patch.order;
      }
      log.applied.push(`character ${change.hero}.${change.path}`);
      stats.applied += 1;
    }

    // --- 武器熟练度 ---
    for (const change of patch.mastery || []) {
      const character = charByName.get(change.hero);
      const record = character && mastery.find((item) => item.characterCode === character.code && item.type === change.type);
      const option = record?.options?.find((item) => item.stat === change.stat);
      if (!option) {
        log.missing.push(`mastery ${change.hero}/${change.type}/${change.stat}`);
        stats.missing += 1;
        continue;
      }
      if (sameNumber(option.value, change.value)) {
        log.already += 1;
        stats.already += 1;
        continue;
      }
      if (!dryRun) option.value = change.value;
      log.applied.push(`mastery ${change.hero}/${change.type}/${change.stat}`);
      stats.applied += 1;
    }

    report.patches.push(log);
  }

  if (!dryRun) {
    await writeJson(files.heroSkills, heroSkills);
    await writeJson(files.equipment, equipment);
    await writeJson(files.characters, characters);
    await writeJson(files.mastery, mastery);
  }

  for (const log of report.patches) {
    const parts = [`已达标 ${log.already}`];
    if (log.applied.length) parts.push(`本次写入 ${log.applied.length}`);
    if (log.created) parts.push(`新建 ${log.created}`);
    if (log.manualHeld.length) parts.push(`人工保留 ${log.manualHeld.length}`);
    if (log.missing.length) parts.push(`未找到 ${log.missing.length}`);
    console.log(`[${log.version}] ${parts.join(' / ')}`);
    log.applied.slice(0, 8).forEach((line) => console.log(`    + ${line}`));
    if (log.applied.length > 8) console.log(`    + …其余 ${log.applied.length - 8} 条`);
    log.missing.forEach((line) => console.log(`    ? ${line}`));
  }

  const held = report.patches.flatMap((log) => log.manualHeld);
  if (held.length) {
    console.log(`\n以下 ${held.length} 条是人工数据，未被覆盖，请自行确认是否采纳官方新值：`);
    held.forEach((item) => {
      console.log(`  · ${item.hero} ${item.title} (${item.id})`);
      console.log(`      现用(人工): ${item.keep.bases} | ${item.keep.formula}`);
      console.log(`      官方新值 : ${item.official.bases} | ${item.official.formula}`);
    });
  }

  console.log(`\n合计：写入 ${stats.applied} / 已达标 ${stats.already} / 人工保留 ${stats.manualHeld} / 未找到 ${stats.missing}${dryRun ? '（dry-run，未写文件）' : ''}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
