// 官方补丁第二轮：简体中文（hl=zh-CN）复核 + 12.0 Part.2 补齐
//
// 背景：第一轮（scripts/apply-official-patch-updates.mjs）抓的是英文版公告，
// 导致两个问题：
//   1. 新建条目的中文名是自己翻的，与官方译名对不上；
//   2. 漏了 12.0 的 Part.2（实验体和物品），英文版 12.0 只有 Part.1。
//
// 本脚本按中文公告修正译名，并补上 12.0 Part.2 的数值。
//
// 来源（均为 hl=zh-CN）：
//   11.5  https://playeternalreturn.com/posts/news/3657  新实验体 克雷弗
//   11.5a https://playeternalreturn.com/posts/news/3687  不停机维护
//   12.0  https://playeternalreturn.com/posts/news/3742  Part.1 主要更新
//   12.0  https://playeternalreturn.com/posts/news/3743  Part.2 实验体和物品
//
// 报告：docs/official-patch-updates/apply-report-zh.json

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(rootDir, 'src', 'data');
const reportDir = path.join(rootDir, 'docs', 'official-patch-updates');

const PART2 = {
  patch: '12.0',
  date: '2026-08-06',
  at: '2026-08-06T02:00:00.000Z',
  url: 'https://playeternalreturn.com/posts/news/3743?hl=zh-CN',
  title: '[修正] 12.0 更新日志 Part.2 - 实验体和物品'
};

// ---------------------------------------------------------------------------
// 1. 译名修正：把第一轮自拟的中文名换成官方公告用词
//    match: hero(旧名) + group + dataKey
// ---------------------------------------------------------------------------
const TITLE_FIXES = [
  { hero: '布莱尔', group: 1084200, dataKey: '[Double Bladed Sword] Second Hit Damage', title: 'Q 双重横扫 双头剑1、2段伤害', was: 'Q 双重斩击 双刀二段伤害' },
  { hero: '伊安', group: 1063300, dataKey: '[Phantom Ripper] Damage', title: 'W 血染之指（噬身）', was: 'W 血染之指 附身伤害' },
  { hero: '玛蒂娜', group: 1057500, dataKey: 'Recording Edge Damage', title: 'R 录像 - 报道中 录像期间（边缘）', was: 'R 录像 录制中边缘伤害' },
  { hero: '玛蒂娜', group: 1057500, dataKey: 'Recording Center Damage', title: 'R 录像 - 报道中 录像期间（中心）', was: 'R 录像 录制中中心伤害' },
  { hero: '玛蒂娜', group: 1057500, dataKey: 'Recording Complete Edge Damage', title: 'R 录像 - 报道中 录像结束（边缘）', was: 'R 录像 录制完成边缘伤害' },
  { hero: '玛蒂娜', group: 1057500, dataKey: 'Recording Complete Center Damage', title: 'R 录像 - 报道中 录像结束（中心）', was: 'R 录像 录制完成中心伤害' },
  { hero: '西尔维娅', group: 1016300, dataKey: '[On Bike] Front Flip Damage', title: 'W 腾空飞跃（摩托车）', was: 'W 前空翻（摩托）' },
  // 克雷弗（11.5 新实验体）：官方技能名
  { hero: 'Craver', group: 1089300, dataKey: '[Sweep Kick] Damage', title: 'W 横扫千军（每段）', was: 'W 扫堂腿（每段）' },
  { hero: 'Craver', group: 1089300, dataKey: '[Backflip] Damage', title: 'W 腾空后跃', was: 'W 后空翻' },
  { hero: 'Craver', group: 1089400, dataKey: '[Quick Step] Damage', title: 'E 迅步', was: 'E 快步后撤' },
  { hero: 'Craver', group: 1089500, dataKey: 'Damage', title: 'R 决战时刻！', was: 'R 决斗时刻' },
  { hero: 'Craver', group: 1089200, dataKey: '[Focus Shot] Additional Damage', title: 'Q 聚焦射击 持续伤害', was: 'Q 聚焦射击 追加伤害' }
];

// 实验体改名：er-gamedata 快照里 89 号还没有中文名
const HERO_RENAMES = [
  { from: 'Craver', to: '克雷弗', note: '11.5 官方中文译名；旧快照缺 89 号实验体的中文名。' }
];

// ---------------------------------------------------------------------------
// 2. 12.0 Part.2 技能伤害
// ---------------------------------------------------------------------------
const SKILL_CHANGES = [
  { hero: '娜町', group: 1006500, dataKey: 'DamageByLevel', bases: [100, 150, 200], formula: 'base + extraAttack * 0.8 + ap * 0.8',
    before: '100/150/200(+额外攻击力75%)(+技能增幅的80%)(+野性叠层伤害)', after: '100/150/200(+额外攻击力80%)(+技能增幅的80%)(+野性叠层伤害)',
    note: '野性叠层伤害未建模；原快照数值 50/100/150 已按官方公告覆盖。' },
  { hero: '丹尼尔', slot: 'E', group: 1037400, skillId: 'DanielActive3', dataKey: 'Damage', title: 'E 暗影刺客', bases: [20, 40, 60, 80, 100], formula: 'base + extraAttack * 0.5', mode: 'create',
    before: '20/40/60/80/100(+额外攻击力60%)', after: '20/40/60/80/100(+额外攻击力50%)' },
  { hero: '黛比&玛莲', group: 1065100, dataKey: 'Damage', formula: 'base + extraAttack * 0.8',
    before: '15/20/25(+额外攻击力75%)', after: '15/20/25(+额外攻击力80%)' },
  { hero: '劳拉', group: 1047100, dataKey: 'Damage', bases: [20, 45, 70],
    before: '20/50/80(+技能增幅的30%)', after: '20/45/70(+技能增幅的30%)' },
  { hero: '雷妮', group: 1069100, dataKey: 'Damage', bases: [15, 25, 35], formula: 'base + ap * 0.1',
    before: '15/25/35(+雷妮等级*4)', after: '15/25/35(+雷妮等级*2)(+技能增幅的10%)',
    note: '实验体等级项未建模（公式变量只有技能等级）。' },
  { hero: '雷妮', group: 1069200, dataKey: 'Damage', bases: [50, 70, 90, 110, 130], formula: 'base + ap * 0.6',
    before: '40/55/70/85/100(+雷妮等级*18)(+技能增幅的35%)', after: '50/70/90/110/130(+雷妮等级*8)(+技能增幅的60%)',
    note: '实验体等级项未建模。' },
  { hero: '雷妮', group: 1069400, dataKey: 'Damage', bases: [20, 40, 60, 80, 100], formula: 'base + ap * 0.45',
    before: '20/40/60/80/100(+雷妮等级*9)(+技能增幅的35%)', after: '20/40/60/80/100(+雷妮等级*5)(+技能增幅的45%)',
    note: '实验体等级项未建模；原快照基础值 50/65/80/95/110 已按官方公告覆盖。' },
  { hero: '雷妮', group: 1069500, dataKey: 'Damage', bases: [100, 150, 200], formula: 'base + ap * 0.55',
    before: '100/150/200(+雷妮等级*12)(+技能增幅的40%)', after: '100/150/200(+雷妮等级*8)(+技能增幅的55%)',
    note: '实验体等级项未建模。' },
  { hero: '彰一', group: 1018100, dataKey: 'Dagger Damage', bases: [50, 80, 110],
    before: '短剑伤害 60/90/120(+技能增幅的30%)', after: '短剑伤害 50/80/110(+技能增幅的30%)',
    note: '原快照基础值 10/40/70 已按官方公告覆盖。' },
  { hero: '尤斯蒂娜', group: 1079100, dataKey: 'Damage', bases: [30, 50, 70], formula: 'base + ap * 0.15',
    before: '标记伤害 40/60/80(+技能增幅的20%)', after: '标记伤害 30/50/70(+技能增幅的15%)' },
  { hero: '翡翠', group: 1078300, dataKey: '[Clear Cut] Damage', formula: 'base + attack * 0.4',
    before: '一刀两断(W1) 1段伤害 15/30/45/60/75(+额外攻击力50%)', after: '一刀两断(W1) 1段伤害 15/30/45/60/75(+额外攻击力40%)' }
];

// ---------------------------------------------------------------------------
// 3. 12.0 Part.2 实验体基础属性
// ---------------------------------------------------------------------------
const CHARACTER_CHANGES = [
  { hero: '黛比&玛莲', path: 'growth.maxHp', from: 88, to: 90 },
  { hero: '雷妮', path: 'growth.maxHp', from: 79, to: 81 },
  { hero: '雷妮', path: 'base.defense', from: 50, to: 53 },
  { hero: '彰一', path: 'base.hp', from: 940, to: 980 },
  { hero: '秀雅', path: 'base.hp', from: 1070, to: 1020 },
  { hero: '秀雅', path: 'base.defense', from: 57, to: 54 },
  { hero: '艾登', path: 'growth.maxHp', from: 94, to: 96 }
];

// ---------------------------------------------------------------------------
// 4. 12.0 Part.2 武器熟练度
// ---------------------------------------------------------------------------
const MASTERY_CHANGES = [
  { hero: '凯希', type: 'OneHandSword', stat: 'AttackSpeedRatio', from: 0.027, to: 0.034, label: '短剑 攻击速度' },
  { hero: '塔齐娅', type: 'DirectFire', stat: 'AttackSpeedRatio', from: 0.029, to: 0.04, label: '暗器 攻击速度' }
];

// ---------------------------------------------------------------------------
// 5. 12.0 Part.2 装备属性（按中文名匹配）
//    remove: true 表示删除该属性
// ---------------------------------------------------------------------------
const EQUIPMENT_CHANGES = [
  { item: '酒红色西装', stat: 'attackPower', from: 15, to: 13 },
  { item: '赤星', stat: 'attackPower', from: 20, to: 18 },
  { item: '比基尼', stat: 'skillAmp', from: 40, to: 35 },
  { item: '红心女王', stat: 'skillAmp', from: 40, to: 35 },
  { item: '黑炎龙铠甲', stat: 'defense', from: 43, to: 41 },
  { item: '精灵舞裙', stat: 'cooldownReduction', from: 10, to: 20 },
  { item: '白夜王冠', stat: 'healerGiveHpHealRatio', from: 0.07, to: 0.06 },
  { item: '荒野之星', stat: 'attackPower', from: 38, to: 33 },
  { item: '荒野之星', stat: 'attackSpeedRatio', from: 0.46, to: 0.4 },
  { item: '瓦尔哈拉头盔', stat: 'defense', from: 20, to: 18 },
  { item: '脸谱', stat: 'defense', from: 10, to: 8 },
  { item: '玄瞳头盔', stat: 'lifeSteal', from: 0.08, to: 0.06 },
  { item: '羽落', stat: 'attackSpeedRatio', from: 0.35, to: 0.3 },
  { item: '血色王冠', stat: 'moveSpeedRatio', from: 0.04, to: 0.035 },
  { item: '克拉达戒指', stat: 'cooldownReduction', from: 20, to: 15 },
  { item: '海盗印记', stat: 'cooldownReduction', from: 20, to: 0, remove: true },
  { item: '海盗印记', stat: 'slowResistRatio', from: 0.2, to: 0, remove: true },
  { item: '海盗印记', stat: 'maxHp', from: undefined, to: 200, add: true },
  { item: '海盗印记', stat: 'attackPower', from: 30, to: 26 },
  { item: '死灵之书', stat: 'skillAmp', from: 100, to: 95 },
  { item: '超星臂章', stat: 'adaptiveForce', from: 45, to: 43 },
  { item: '法夫纳', stat: 'maxHpByLv', from: 26, to: 25 },
  { item: '血杀龙爪', stat: 'attackPower', from: 30, to: 28, note: '公告中文名为「嗜血魔爪」，与快照里的「血杀龙爪」为同一件（手部 / 攻击力 30）。' },
  { item: '蔷薇轻履', stat: 'skillAmp', from: 50, to: 45 },
  { item: '红鞋', stat: 'attackSpeedRatio', from: 0.38, to: 0.33 },
  { item: '艾尔迪安长靴', stat: 'attackPower', from: 20, to: 17 },
  { item: '生化推进器', stat: 'cooldownReduction', from: 25, to: 20 },
  { item: '精灵之靴', stat: 'adaptiveForce', from: 28, to: 0, remove: true },
  { item: '精灵之靴', stat: 'skillAmp', from: undefined, to: 50, add: true },
  { item: '月水晶', stat: 'cooldownReduction', from: 10, to: 0, remove: true },
  { item: '月水晶', stat: 'skillAmp', from: 88, to: 95 },
  { item: '隐遁者', stat: 'cooldownReduction', from: 10, to: 0, remove: true },
  { item: '隐遁者', stat: 'skillAmp', from: 70, to: 81 },
  { item: '炼狱 - 绯红', stat: 'cooldownReduction', from: 15, to: 0, remove: true },
  { item: '炼狱 - 绯红', stat: 'skillAmp', from: 100, to: 114 }
];

// ---------------------------------------------------------------------------
// 6. 12.0 Part.2 新增传说装备
//    weaponTypeRaw 用来继承同类武器的显示名；护甲填 armorType
// ---------------------------------------------------------------------------
const NEW_EQUIPMENT = [
  { name: '苍野荆棘', type: '武器', weaponTypeRaw: 'Rapier', stats: { attackPower: 32, skillAmp: 86, maxHp: 120 }, effect: '惩恶',
    recipe: '冰块 + 秘银', tooltip: '惩恶：4秒内用普攻或独立技能命中同一敌人3次时，造成 50(+技能增幅的20%)(+实验体等级*2) 技能伤害，并获得 100(+技能增幅的30%)(+实验体等级*5) 护盾、持续2.5秒。冷却 12秒。' },
  { name: '棒棒糖', type: '武器', weaponTypeRaw: 'Bat', stats: { attackPower: 30, skillAmp: 86, maxHp: 150 }, effect: '神速 - 微风',
    recipe: '石头 + 秘银', tooltip: '神速 - 微风：4秒内造成3次普攻或独立技能伤害时，2.5秒内移动速度增加15%，并获得 100(+技能增幅的30%)(+实验体等级*5) 护盾。冷却 12秒。' },
  { name: '倒吊人', type: '武器', weaponTypeRaw: 'Arcana', stats: { attackPower: 40, skillAmp: 92, cooldownReduction: 10 }, effect: '瘟疫蝴蝶',
    recipe: '琉璃球 + 秘银', tooltip: '瘟疫蝴蝶：用独立技能对敌方实验体造成伤害时，飞出一只蝴蝶造成 40(+技能增幅的30%)(+实验体等级*3) 伤害，可在 4m 内最多弹射 5 次，每次弹射伤害降低 10%。冷却 10秒。' },
  { name: '均衡之刃', type: '武器', weaponTypeRaw: 'TwoHandSword', stats: { attackPower: 67, attackSpeedRatio: 0.3, maxHp: 150 }, effect: '惩恶',
    recipe: '铁锈剑 + 秘银', tooltip: '惩恶：4秒内用普攻或独立技能命中同一敌人3次时，造成 40(+额外攻击力50%)(+实验体等级*5) 技能伤害，并获得 100(+攻击力的55%)(+实验体等级*5) 护盾、持续2.5秒。冷却 12秒。' },
  { name: '凛风铠甲', type: '衣服', armorType: 'Chest', stats: { defense: 40, maxHpByLv: 24, cooldownReduction: 10 }, effect: '疾风 - 寒气',
    recipe: '皮革补丁 + 能源晶石', tooltip: '疾风 - 寒气：对敌方实验体施加无法移动效果时释放持续5秒的旋涡，每0.5秒造成 20(+额外体力6%) 技能伤害并降低范围内敌人 25% 移动速度。冷却 10秒。' },
  { name: '凛风铠甲・戴维德', type: '衣服', armorType: 'Chest', stats: { defense: 44, maxHpByLv: 27, cooldownReduction: 10 }, effect: '疾风 - 寒气',
    recipe: '皮革补丁 + 能源晶石', tooltip: '凛风铠甲的戴维德变体：防御力 +4、每级别体力上限 +3。' }
];

// ---------------------------------------------------------------------------
// 未应用（记入报告）
// ---------------------------------------------------------------------------
const UNAPPLIED = [
  { patch: '11.5a', target: '超再生 护盾及体力恢复量 10% → 8%', reason: '12.0 已进一步下调为 5%，数据取最新值，无需再改。' },
  { patch: '11.5a', target: '治愈之风 / 违规者 体力与护盾、冷却', reason: '非伤害项；违规者的伤害公式本身没有变化。' },
  { patch: '11.5a', target: '雷妮 Q/R 冷却、莉央 替弓和弓普攻 103%→102%', reason: '冷却与普攻倍率未建模。' },
  { patch: '12.0 Part.2', target: '全部武器技能(D)改动（弩、鞭子、投掷、旋棍、枪等的技能重做与数值）', reason: '计算器不建模武器技能。' },
  { patch: '12.0 Part.2', target: '墙体冲撞伤害判定拆分', reason: '为判定规则变更；撞墙伤害已在 11.7 作为独立条目录入。' },
  { patch: '12.0 Part.2', target: '武器技能触发条件扩展（约 40 名实验体的被动联动）', reason: '触发条件不影响伤害公式。' },
  { patch: '12.0 Part.2', target: '慧珍 P 三灾 / Q 镇压符', reason: '旧生成表把同一组 A1~A4 伤害行重复挂在每个技能组下，无法安全对应公告中的伤害段。' },
  { patch: '12.0 Part.2', target: '凯希 Q 动脉切开术 普攻额外伤害 55% → 50%', reason: '只给系数、无基础值，且当前没有对应条目。' },
  { patch: '12.0 Part.2', target: '秀雅 / 万尼亚 / 亚历克斯 / 威廉 / 卡拉 / 卡洛琳 / 埃琳娜 / 扎希尔 等', reason: '改动为护盾、治疗、冷却、移动速度或状态值。' },
  { patch: '12.0 Part.2', target: '绯红 / 晓色 系列 VF 武器的适性值改为攻击力或技能增幅', reason: '涉及约 20 件武器的属性重构，公告未给出改后的完整属性表，需要重新导出 er-gamedata 才能准确落库。' },
  { patch: '12.0 Part.2', target: '物品合成路线、材料删除（激光笔 / 弹夹 / 粉笔）、食物与区域刷新表', reason: '计算器不使用合成与刷新数据。' },
  { patch: '12.0 Part.2', target: '减少治愈 20% → 30%', reason: '减少治愈只作为效果名展示，不参与伤害公式。' }
];

// ---------------------------------------------------------------------------
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const writeJson = async (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');

function applySkillPayload(entry, change) {
  if (change.bases) {
    entry.bases = change.bases.join(',');
    entry.maxLevel = change.bases.length;
  }
  if (change.formula) entry.formula = change.formula;
  entry.updatedAt = PART2.at;
  entry.sourceDate = PART2.at;
  entry.sourceVersion = PART2.patch;
  entry.sourceLabel = `${PART2.patch} / ${PART2.date}`;
  entry.sourceUrl = PART2.url;
  entry.sourceTitle = PART2.title;
  entry.source = 'official-patch-note';
  if (change.after) entry.coefficientText = change.after;
  entry.sourceNote = [`官方公告 12.0 Part.2 数值：${change.after || ''}`, change.note].filter(Boolean).join(' ');
}

async function main() {
  const files = {
    localConfig: path.join(dataDir, 'localConfig.json'),
    fallback: path.join(dataDir, 'externalSkillDamageFallback.json'),
    augments: path.join(dataDir, 'skillDamageAugments.json'),
    damageTable: path.join(dataDir, 'erSkillDamageTable.json'),
    gameData: path.join(dataDir, 'erGameData.json'),
    mastery: path.join(dataDir, 'masteryStats.json')
  };

  const localConfig = await readJson(files.localConfig);
  const fallback = await readJson(files.fallback);
  const augments = await readJson(files.augments);
  const damageTable = await readJson(files.damageTable);
  const gameData = await readJson(files.gameData);
  const mastery = await readJson(files.mastery);

  const report = { generatedAt: new Date().toISOString(), source: PART2, titles: [], renames: [], skills: [], characters: [], mastery: [], equipment: [], newEquipment: [], unapplied: UNAPPLIED, warnings: [] };

  const skillLists = [
    ['localConfig', localConfig.skills],
    ['externalSkillDamageFallback', fallback.skills],
    ['skillDamageAugments', augments.skills],
    ['erGameData', gameData.skills]
  ];

  // --- 1. 译名修正 ---
  for (const fix of TITLE_FIXES) {
    const touched = [];
    for (const [label, list] of skillLists) {
      for (const entry of list) {
        if (entry.hero !== fix.hero) continue;
        if (Number(entry.group) !== Number(fix.group)) continue;
        if (entry.dataKey !== fix.dataKey) continue;
        entry.title = fix.title;
        touched.push(`${label}:${entry.id}`);
      }
    }
    if (!touched.length) report.warnings.push(`译名未匹配：${fix.hero} ${fix.dataKey}`);
    report.titles.push({ hero: fix.hero, dataKey: fix.dataKey, from: fix.was, to: fix.title, targets: touched });
  }

  // --- 2. 实验体改名 ---
  for (const rename of HERO_RENAMES) {
    const character = gameData.characters.find((item) => item.name === rename.from || item.id === rename.from);
    if (!character) {
      report.warnings.push(`改名未找到实验体 ${rename.from}`);
      continue;
    }
    character.name = rename.to;
    if (!character.storyName) character.storyName = rename.to;
    let skillCount = 0;
    for (const [, list] of skillLists) {
      for (const entry of list) {
        if (entry.hero === rename.from) {
          entry.hero = rename.to;
          skillCount += 1;
        }
      }
    }
    for (const row of damageTable.damageRows) {
      if (row.heroName === rename.from) row.heroName = rename.to;
    }
    for (const group of gameData.rawSkillGroups || []) {
      if (group.hero === rename.from) group.hero = rename.to;
    }
    report.renames.push({ from: rename.from, to: rename.to, skillEntries: skillCount, note: rename.note });
  }

  const heroAlias = new Map(HERO_RENAMES.map((item) => [item.from, item.to]));
  const resolveHero = (hero) => heroAlias.get(hero) || hero;

  // --- 3. 技能数值 ---
  for (const change of SKILL_CHANGES) {
    const hero = resolveHero(change.hero);
    const touched = [];
    for (const [label, list] of skillLists) {
      for (const entry of list) {
        if (entry.hero !== hero) continue;
        if (Number(entry.group) !== Number(change.group)) continue;
        if (entry.dataKey !== change.dataKey) continue;
        applySkillPayload(entry, change);
        touched.push(`${label}:${entry.id}`);
      }
    }
    for (const row of damageTable.damageRows) {
      if (row.heroName !== hero) continue;
      if (Number(row.skillGroup) !== Number(change.group)) continue;
      if (row.baseKey !== change.dataKey) continue;
      if (change.bases) {
        for (let index = 0; index < 6; index += 1) {
          row[`lv${index + 1}`] = index < change.bases.length ? change.bases[index] : '';
        }
      }
      row.coefficientText = change.after || row.coefficientText;
      touched.push(`erSkillDamageTable:${row.standardId}`);
    }

    if (!touched.length && change.mode === 'create') {
      const entry = {
        id: `patch-120p2-${String(change.skillId || change.group).toLowerCase()}-${String(change.dataKey).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        hero,
        title: change.title,
        bases: change.bases.join(','),
        formula: change.formula,
        maxLevel: change.bases.length,
        group: change.group,
        skillId: change.skillId,
        dataKey: change.dataKey
      };
      applySkillPayload(entry, change);
      fallback.skills.push(entry);
      localConfig.skills.push(JSON.parse(JSON.stringify(entry)));
      touched.push(`created:${entry.id}`);
    }

    if (!touched.length) report.warnings.push(`技能未匹配：${hero} g${change.group} ${change.dataKey}`);
    report.skills.push({ hero, group: change.group, dataKey: change.dataKey, before: change.before, after: change.after, bases: change.bases || null, formula: change.formula || null, note: change.note || null, targets: touched });
  }

  // --- 4. 实验体属性 ---
  for (const change of CHARACTER_CHANGES) {
    const character = gameData.characters.find((item) => item.name === change.hero);
    if (!character) {
      report.warnings.push(`实验体属性未找到 ${change.hero}`);
      continue;
    }
    const [section, key] = change.path.split('.');
    const container = character[section];
    if (!container) {
      report.warnings.push(`${change.hero} 缺少 ${section}`);
      continue;
    }
    const actual = container[key];
    if (Math.abs(Number(actual) - change.from) > 1e-9) {
      report.warnings.push(`实验体属性对不上：${change.hero}.${change.path} 当前 ${actual}，公告前值 ${change.from}`);
    }
    container[key] = change.to;
    report.characters.push({ hero: change.hero, path: change.path, from: actual, to: change.to });
  }

  // --- 5. 熟练度 ---
  for (const change of MASTERY_CHANGES) {
    const character = gameData.characters.find((item) => item.name === change.hero);
    if (!character) {
      report.warnings.push(`熟练度未找到实验体 ${change.hero}`);
      continue;
    }
    const record = mastery.find((item) => item.characterCode === character.code && item.type === change.type);
    const option = record?.options?.find((item) => item.stat === change.stat);
    if (!option) {
      report.warnings.push(`熟练度未找到 ${change.hero}/${change.type}/${change.stat}`);
      continue;
    }
    const actual = option.value;
    if (Math.abs(actual - change.from) > 1e-9) {
      report.warnings.push(`熟练度对不上：${change.hero}/${change.type}/${change.stat} 当前 ${actual}，公告前值 ${change.from}`);
    }
    option.value = change.to;
    report.mastery.push({ hero: change.hero, type: change.type, stat: change.stat, label: change.label, from: actual, to: change.to });
  }

  // --- 6. 装备属性 ---
  const equipmentByName = new Map(gameData.equipment.map((item) => [item.name, item]));
  const localEquipmentByCode = new Map(localConfig.equipment.filter((item) => item.code).map((item) => [item.code, item]));
  const STAT_ALIAS = { attackPower: 'attackPower', skillAmp: 'ap', cooldownReduction: 'cd', defense: 'defense', maxHp: 'maxHp', sightRange: 'sightRange', penetrationDefense: 'pen', penetrationDefenseRatio: 'penPct', skillAmpRatio: 'apPct' };

  for (const change of EQUIPMENT_CHANGES) {
    const item = equipmentByName.get(change.item);
    if (!item) {
      report.warnings.push(`装备未找到 ${change.item}`);
      continue;
    }
    const actual = item.stats?.[change.stat];
    if (!change.add && Math.abs(Number(actual) - change.from) > 1e-9) {
      report.warnings.push(`装备数值对不上：${change.item}.${change.stat} 当前 ${actual}，公告前值 ${change.from}`);
    }
    for (const target of [item, localEquipmentByCode.get(item.code)].filter(Boolean)) {
      target.stats = target.stats || {};
      if (change.remove) delete target.stats[change.stat];
      else target.stats[change.stat] = change.to;
      const alias = STAT_ALIAS[change.stat];
      if (alias) target[alias] = change.remove ? 0 : change.to;
    }
    report.equipment.push({ item: change.item, code: item.code, stat: change.stat, from: actual ?? null, to: change.remove ? null : change.to, removed: Boolean(change.remove), added: Boolean(change.add), note: change.note || null });
  }

  // --- 7. 新增装备 ---
  for (const spec of NEW_EQUIPMENT) {
    if (equipmentByName.has(spec.name)) {
      report.warnings.push(`新增装备已存在：${spec.name}`);
      continue;
    }
    const sibling = spec.weaponTypeRaw
      ? gameData.equipment.find((item) => item.weaponTypeRaw === spec.weaponTypeRaw)
      : gameData.equipment.find((item) => item.armorType === spec.armorType);
    const entry = {
      source: 'official-patch-note',
      type: spec.type,
      itemType: spec.weaponTypeRaw ? 'Weapon' : 'Armor',
      weaponType: sibling?.weaponType || '',
      weaponTypeRaw: spec.weaponTypeRaw || '',
      armorType: spec.armorType || '',
      name: spec.name,
      quality: '传说',
      itemGrade: 'Legend',
      isCompletedItem: true,
      showInItemBook: true,
      effect: spec.effect || '',
      recipe: spec.recipe || '',
      tooltip: spec.tooltip || '',
      stats: { ...spec.stats },
      sourceVersion: PART2.patch,
      sourceUrl: PART2.url,
      sourceTitle: PART2.title,
      ap: spec.stats.skillAmp || 0,
      attackPower: spec.stats.attackPower || 0,
      cd: spec.stats.cooldownReduction || 0,
      pen: 0,
      penPct: 0,
      apPct: 0,
      defense: spec.stats.defense || 0,
      maxHp: spec.stats.maxHp || 0,
      sightRange: 0,
      dmgAmp: 0
    };
    gameData.equipment.push(entry);
    localConfig.equipment.push(JSON.parse(JSON.stringify(entry)));
    equipmentByName.set(spec.name, entry);
    report.newEquipment.push({ name: spec.name, type: spec.type, stats: spec.stats, effect: spec.effect });
  }

  const stamp = {
    officialPatchUpdatesZh: {
      appliedAt: new Date().toISOString(),
      locale: 'zh-CN',
      sources: [
        { version: '11.5', url: 'https://playeternalreturn.com/posts/news/3657?hl=zh-CN' },
        { version: '11.5a', url: 'https://playeternalreturn.com/posts/news/3687?hl=zh-CN' },
        { version: '12.0 Part.1', url: 'https://playeternalreturn.com/posts/news/3742?hl=zh-CN' },
        { version: '12.0 Part.2', url: PART2.url }
      ]
    }
  };
  Object.assign(fallback, stamp);
  Object.assign(augments, stamp);
  Object.assign(damageTable, stamp);
  Object.assign(gameData, stamp);

  await writeJson(files.localConfig, localConfig);
  await writeJson(files.fallback, fallback);
  await writeJson(files.augments, augments);
  await writeJson(files.damageTable, damageTable);
  await writeJson(files.gameData, gameData);
  await writeJson(files.mastery, mastery);

  await mkdir(reportDir, { recursive: true });
  await writeJson(path.join(reportDir, 'apply-report-zh.json'), report);

  console.log(JSON.stringify({
    titles: report.titles.length,
    renames: report.renames,
    skills: report.skills.length,
    characters: report.characters.length,
    mastery: report.mastery.length,
    equipment: report.equipment.length,
    newEquipment: report.newEquipment.length,
    unapplied: report.unapplied.length,
    warnings: report.warnings
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
