import React, { useEffect, useMemo, useState } from 'react';
import ER_GAME_DATA from './data/erGameData.json';

const QUALITY_COLORS = {
  红: '#ff8d8d',
  金: '#ffd56b',
  紫: '#ccb6ff',
  蓝: '#81caff',
  绿: '#8de1ad',
  白: '#f6f2e8',
  普通: '#f6f2e8',
  高级: '#8de1ad',
  稀有: '#81caff',
  英雄: '#ccb6ff',
  传说: '#ffd56b',
  神话: '#ff8d8d'
};
const WEAPON_TYPES = [
  '未设置',
  '拳套 / Glove',
  '双节棍 / Nunchaku',
  '拐棍 / Tonfa',
  '棍棒 / Bat',
  '锤 / Hammer',
  '鞭子 / Whip',
  '投掷 / Throw',
  '暗器 / Shuriken',
  '弓 / Bow',
  '弩 / Crossbow',
  '手枪 / Pistol',
  '突击步枪 / Assault Rifle',
  '狙击枪 / Sniper Rifle',
  '斧 / Axe',
  '短剑 / Dagger',
  '双手剑 / Two-handed Sword',
  '双剑 / Dual Swords',
  '长枪 / Spear',
  '刺剑 / Rapier',
  '吉他 / Guitar',
  '相机 / Camera',
  '圣器 / Arcana',
  'VF义体 / VF Prosthetic'
];
const STORAGE_KEY = 'er-damage-config-v1';
const HELP_NOTES_KEY = 'er-damage-help-notes-v1';
const HELP_NOTES_EDITABLE = import.meta.env.DEV;
const DEFAULT_HELP_NOTES = {
  'solution.help': '本地开发环境下，帮助说明可以在悬浮面板里直接编辑，并保存到当前浏览器 localStorage。发布到 GitHub 的正式构建会自动锁定为只读，防止线上用户改动说明。',
  'field.mastery': '角色武器熟练度等级。当前公式按每级 4.1% 法强加成计算。',
  'field.talentAp': '手动补充的潜能法强，适合录入暂未结构化进潜能表的额外数值。',
  'field.targetHp': '目标当前血量。部分技能或特效会按目标血量追加伤害。',
  'field.targetDefense': '目标防御值，会进入最终防御修正计算。',
  'field.targetDefenseReduction': '目标防御降低，使用小数填写。例如 0.2 表示降低 20%。',
  'field.targetReduction': '目标减伤，使用小数填写。例如 0.16 表示目标受到 16% 减伤。',
  'field.selfHp': '自身当前血量，用于血量差相关追伤计算。',
  'field.damageBonus': '手动技伤加成，使用小数填写。例如 0.15 表示 +15% 技能伤害。',
  'field.skillReduction': '技能减免，使用小数填写。会从最终增伤倍率中扣除。',
  'field.attack': '角色攻击力。技能公式中可以通过 attack 变量引用。',
  'select.hero': '切换当前计算角色。手动录入角色和官方数据导入角色会一起显示。',
  'select.weaponType': '筛选武器类型，只影响武器下拉列表，不改变其他部位装备。',
  'section.gear': '选择装备并查看汇总属性。装备数据可在下方配置表中本地编辑。',
  'section.target': '配置目标木桩、防御、减伤和自身血量等伤害计算前提。',
  'section.config': '配置表会保存到当前浏览器。发布版本仍可看说明，但帮助说明编辑会被锁定。',
  'stat.finalDefense': '最终防御 = 目标防御 * 防御降低修正 * 百分比防穿修正 - 固定防穿。',
  'stat.pen': '固定防穿 / 百分比防穿。两者都会影响最终防御。',
  'stat.damageBonus': '当前总技能伤害加成，包含装备、潜能、开关和手动输入。',
  'stat.damageMod': '增伤、减伤、技能减免合并后的最终倍率偏移。',
  'stat.hpDiffRatio': '自身与目标血量差相关的比例，用于爆发力追伤。',
  'stat.equipAp': '当前 5 件装备提供的法强或适应之力汇总。',
  'stat.potentialAp': '手动潜能法强加上当前选择潜能提供的法强。',
  'stat.masteryApPct': '熟练度提供的法强百分比。',
  'stat.uniqueApPct': '独有法强百分比重复时取最高值。',
  'table.equipment': '装备配置表。这里的数值参与上方装备选择和属性汇总。',
  'table.skills': '技能配置表。公式可使用 base、ap、attack、targetHp、stacks、level。',
  'table.talents': '潜能配置表。说明列会显示在潜能选择卡片中。',
  'equipment.type': '装备部位，决定该装备出现在哪个部位下拉列表。',
  'equipment.weaponType': '武器分类，仅武器部位使用。',
  'equipment.name': '装备显示名称，也是选择装备时的匹配字段。',
  'equipment.quality': '装备品质，用于列表颜色显示。',
  'equipment.attackPower': '装备提供的攻击力。',
  'equipment.ap': '装备提供的法强。',
  'equipment.cd': '冷却缩减数值。',
  'equipment.defense': '装备提供的防御。',
  'equipment.maxHp': '装备提供的生命值。',
  'equipment.sightRange': '装备提供的视野。',
  'equipment.pen': '固定防御穿透。',
  'equipment.penPct': '百分比防御穿透，使用小数填写。',
  'equipment.apPct': '法强百分比，使用小数填写。',
  'equipment.dmgAmp': '技能伤害增幅，使用小数填写。',
  'equipment.effect': '装备特效备注，当前用于显示和部分特效计算。',
  'skill.hero': '技能所属英雄名称，需要和英雄选择中的名称一致。',
  'skill.title': '技能显示名称。',
  'skill.bases': '各等级基础值，用英文逗号分隔。',
  'skill.maxLevel': '技能最大等级。',
  'skill.formula': '伤害公式，可引用 base、ap、attack、targetHp、stacks、level。',
  'talent.slot': '潜能位置，决定出现在主天赋或副天赋选择里。',
  'talent.name': '潜能显示名称。',
  'talent.ap': '潜能提供的法强。',
  'talent.pen': '潜能提供的固定防穿。',
  'talent.penPct': '潜能提供的百分比防穿，使用小数填写。',
  'talent.dmgAmp': '潜能提供的技能伤害增幅，使用小数填写。',
  'talent.note': '潜能说明，会显示在潜能选择区域。'
};
const MANUAL_HEROES = ['俞岷', '奇娅拉'];
const HEROES = [
  ...MANUAL_HEROES,
  ...ER_GAME_DATA.characters.map((character) => character.name).filter((name) => !MANUAL_HEROES.includes(name))
];

const DEFAULT_TALENTS = [
  { id: 'main-custom', slot: '主天赋', name: '手动主天赋', ap: 0, pen: 0, penPct: 0, dmgAmp: 0, note: '预留：可在后台修改数值与说明' },
  { id: 'sub-custom', slot: '副天赋', name: '手动副天赋', ap: 0, pen: 0, penPct: 0, dmgAmp: 0, note: '预留：可在后台修改数值与说明' },
  { id: 'main-ap', slot: '主天赋', name: '奥能增幅', ap: 35, pen: 0, penPct: 0, dmgAmp: 0, note: '示例：直接增加法强' },
  { id: 'main-pen', slot: '主天赋', name: '破防专精', ap: 0, pen: 8, penPct: 0.04, dmgAmp: 0, note: '示例：防穿天赋' },
  { id: 'sub-amp', slot: '副天赋', name: '战术充能', ap: 0, pen: 0, penPct: 0, dmgAmp: 0.05, note: '示例：技伤加成' }
];

const DEFAULT_EQUIPMENT = [
  { type: '武器', weaponType: '未设置', name: '月水晶', ap: 88, cd: 10, effect: '诅咒', quality: '金' },
  { type: '武器', weaponType: '未设置', name: '女帝', ap: 93, cd: 15, effect: '寒波', quality: '金' },
  { type: '武器', weaponType: '未设置', name: '隐遁者', ap: 70, cd: 10, effect: '诅咒', quality: '紫' },
  { type: '武器', weaponType: '未设置', name: '五芒星', ap: 68, cd: 15, quality: '紫' },
  { type: '武器', weaponType: '未设置', name: '命运之轮', ap: 66, cd: 10, effect: '减疗', quality: '紫' },
  { type: '武器', weaponType: '未设置', name: '炼狱', ap: 112, cd: 15, penPct: 0.1, effect: '吸血6%', quality: '红' },
  { type: '武器', weaponType: '未设置', name: '炼狱绯红', ap: 100, cd: 15, penPct: 0.07, effect: '诅咒', quality: '红' },
  { type: '武器', weaponType: '未设置', name: '炼狱晓色', ap: 110, cd: 15, penPct: 0.08, effect: '寒波', quality: '红' },
  { type: '武器', weaponType: '刺剑 / Rapier', name: '阿戈斯之眼', ap: 90, effect: '破裂', quality: '金' },
  { type: '衣服', name: '私人订制', ap: 125, cd: 10, effect: '炽燃', quality: '金' },
  { type: '衣服', name: '神职法衣', ap: 130, apPct: 0.25, uniqueApPct: true, quality: '金' },
  { type: '衣服', name: '优雅礼服', ap: 120, cd: 20, effect: '凝聚', quality: '金' },
  { type: '衣服', name: '血色斗篷', ap: 122, effect: '腐化', quality: '金' },
  { type: '衣服', name: '日轮之铠', ap: 135, cd: 10, effect: '减疗', quality: '金' },
  { type: '衣服', name: '异端审判官', ap: 138, cd: 15, effect: '刽子手', quality: '金' },
  { type: '衣服', name: '比基尼', ap: 135, effect: '减疗', quality: '红' },
  { type: '衣服', name: '红心女王', ap: 135, cd: 25, effect: '凝聚,减疗', quality: '红' },
  { type: '衣服', name: '指挥官战甲', ap: 126, quality: '紫' },
  { type: '衣服', name: '御史衣', ap: 112, cd: 10, quality: '紫' },
  { type: '衣服', name: '大祭司长袍', ap: 100, cd: 20, quality: '紫' },
  { type: '衣服', name: '白大褂', ap: 100, cd: 10, quality: '紫' },
  { type: '衣服', name: '主教长袍', ap: 124, effect: '减疗', quality: '紫' },
  { type: '衣服', name: '幽冥战甲', ap: 100, effect: '疾风', quality: '紫' },
  { type: '头部', name: '幽灵面具', ap: 80, apPct: 0.25, uniqueApPct: true, quality: '金' },
  { type: '头部', name: '先知头巾', ap: 80, cd: 20, effect: '减疗', quality: '金' },
  { type: '头部', name: '太空头盔', ap: 60, cd: 10, effect: '腐化', quality: '紫' },
  { type: '头部', name: 'EnGrade', ap: 75, cd: 10, effect: '炽燃', quality: '金' },
  { type: '头部', name: '暗影面纱', ap: 80, cd: 15, dmgAmp: 0.12, effect: '光辉', quality: '金' },
  { type: '头部', name: '昆德拉', ap: 75, cd: 20, quality: '金' },
  { type: '头部', name: '龙首簪', ap: 55, cd: 15, penPct: 0.2, effect: '粉碎', quality: '金' },
  { type: '头部', name: '脸谱', ap: 90, cd: 20, pen: 10, effect: '减疗', quality: '红' },
  { type: '头部', name: '赛车头盔', ap: 80, cd: 10, effect: '光子发射器', quality: '金' },
  { type: '头部', name: '魔女帽', ap: 63, cd: 10, effect: '减疗', quality: '紫' },
  { type: '头部', name: '战队头盔', ap: 50, cd: 10, effect: '腐化', quality: '紫' },
  { type: '头部', name: '帝国战盔', ap: 78, quality: '紫' },
  { type: '头部', name: '帝国皇冠', ap: 63, cd: 15, quality: '紫' },
  { type: '手部', name: '翡翠石板', ap: 85, cd: 20, effect: '神速', quality: '金' },
  { type: '手部', name: '龙鳞', ap: 85, penPct: 0.15, quality: '金' },
  { type: '手部', name: '极光陀螺', ap: 82, effect: '魔力种子', quality: '金' },
  { type: '手部', name: '极光陀螺(满层)', ap: 102, cd: 20, effect: '魔力种子', quality: '金' },
  { type: '手部', name: '守护之眼', ap: 90, apPct: 0.15, uniqueApPct: true, quality: '金' },
  { type: '手部', name: '斯嘉蒂的手镯', ap: 82, cd: 10, effect: '寒波', quality: '金' },
  { type: '手部', name: '廷达罗斯君主', ap: 84, cd: 25, quality: '金' },
  { type: '手部', name: '鬼灵之爪', ap: 75, cd: 20, effect: '减疗', quality: '金' },
  { type: '手部', name: '芭蕉扇', ap: 82, cd: 10, effect: '诅咒', quality: '金' },
  { type: '手部', name: '荷鲁斯之眼', ap: 72, cd: 10, effect: '意念', quality: '金' },
  { type: '手部', name: '超星臂章', ap: 90, cd: 20, defense: 15, effect: '减疗', quality: '红' },
  { type: '手部', name: '死灵之书', ap: 100, penPct: 0.15, effect: '减疗', quality: '红' },
  { type: '手部', name: '巨人手套', ap: 62, cd: 10, effect: '减疗', quality: '紫' },
  { type: '手部', name: '德罗普尼尔', ap: 75, quality: '紫' },
  { type: '手部', name: '廷达罗斯手环', ap: 50, cd: 20, quality: '紫' },
  { type: '手部', name: '白羽扇', ap: 52, cd: 10, effect: '诅咒', quality: '紫' },
  { type: '手部', name: '邀明月', ap: 55, cd: 10, defense: 10, effect: '大师', quality: '金' },
  { type: '鞋子', name: '风火轮', ap: 25, cd: 5, quality: '紫' },
  { type: '鞋子', name: 'SCV', ap: 28, quality: '紫' },
  { type: '鞋子', name: '赤影', ap: 18, cd: 10, quality: '紫' },
  { type: '鞋子', name: '恨天高', ap: 60, apPct: 0.05, quality: '金' },
  { type: '鞋子', name: '万年冰鞋', ap: 33, cd: 15, quality: '金' },
  { type: '鞋子', name: '锋利长靴', ap: 42, cd: 10, quality: '金' },
  { type: '鞋子', name: '蔷薇轻履', ap: 50, cd: 10, effect: '觉醒,减疗', quality: '红' },
  { type: '鞋子', name: '精灵之靴', ap: 60, cd: 20, effect: '乘风,减疗', quality: '红' }
];
const INITIAL_EQUIPMENT = ER_GAME_DATA.equipment?.length ? ER_GAME_DATA.equipment : DEFAULT_EQUIPMENT;
const ITEM_STAT_DEFINITIONS = ER_GAME_DATA.itemStatDefinitions || [];
const ITEM_STAT_BY_KEY = Object.fromEntries(ITEM_STAT_DEFINITIONS.map((stat) => [stat.key, stat]));
const DEFAULT_VISIBLE_STAT_KEYS = [
  'skillAmp',
  'adaptiveForce',
  'cooldownReduction',
  'attackPower',
  'defense',
  'maxHp',
  'penetrationDefense',
  'penetrationDefenseRatio',
  'attackSpeedRatio',
  'moveSpeed',
  'sightRange'
];

const DEFAULT_SKILLS = [
  { id: 'nun-q', hero: '奇娅拉', title: 'Q 一段', bases: '180,180,180,180,180', formula: 'base + ap * 0.65', maxLevel: 5 },
  { id: 'nun-q2', hero: '奇娅拉', title: 'Q 二段/额外', bases: '50,50,50,50,50', formula: 'base + ap * 0.08', maxLevel: 5 },
  { id: 'nun-w', hero: '奇娅拉', title: 'W', bases: '160,160,160,160,160', formula: 'base + ap * 0.5 + targetHp * 0.1', maxLevel: 5 },
  { id: 'nun-e', hero: '奇娅拉', title: 'E 一段', bases: '130,130,130,130,130', formula: 'base + ap * 0.4', maxLevel: 5 },
  { id: 'nun-e2', hero: '奇娅拉', title: 'E 二段', bases: '160,160,160,160,160', formula: 'base + ap * 0.7', maxLevel: 5 },
  { id: 'nun-r', hero: '奇娅拉', title: 'R 一段', bases: '80,80,80', formula: 'base + ap * 0.25', maxLevel: 3 },
  { id: 'nun-r2', hero: '奇娅拉', title: 'R2', bases: '150,150,150', formula: 'base + ap * 0.25', maxLevel: 3 },
  { id: 'nun-r2-stack', hero: '奇娅拉', title: 'R2 带叠层', bases: '150,150,150', formula: '(base + ap * 0.25) * (1 + stacks * 0.2)', maxLevel: 3 },
  { id: 'yumin-q', hero: '俞岷', title: 'Q 每跳', bases: '50,65,80,95,110', formula: 'base + ap * 0.4', maxLevel: 5 },
  { id: 'yumin-eq', hero: '俞岷', title: 'EQ 每跳', bases: '50,70,90,110,130', formula: 'base + ap * 0.4', maxLevel: 5 },
  { id: 'yumin-w', hero: '俞岷', title: 'W', bases: '80,110,140,170,200', formula: 'base + ap * 0.7', maxLevel: 5 },
  { id: 'yumin-ew', hero: '俞岷', title: 'EW', bases: '100,135,170,205,240', formula: 'base + ap * 0.75', maxLevel: 5 },
  { id: 'yumin-e', hero: '俞岷', title: 'E', bases: '60,95,130,165,200', formula: 'base + ap * 0.5', maxLevel: 5 },
  { id: 'yumin-r1', hero: '俞岷', title: 'R 一段', bases: '50,100,150', formula: 'base + ap * 0.45', maxLevel: 3 },
  { id: 'yumin-r2', hero: '俞岷', title: 'R 二段', bases: '100,200,300', formula: 'base + ap * 0.7', maxLevel: 3 },
  { id: 'yumin-r2-hp', hero: '俞岷', title: 'R 二段 + 10%目标血', bases: '100,200,300', formula: 'base + ap * 0.7 + targetHp * 0.1', maxLevel: 3 }
];
const GENERATED_SKILLS = ER_GAME_DATA.skills
  .filter((skill) => !MANUAL_HEROES.includes(skill.hero))
  .map((skill) => ({
    id: skill.id,
    hero: skill.hero,
    title: skill.title,
    bases: skill.bases,
    formula: skill.formula,
    maxLevel: skill.maxLevel,
    source: skill.source,
    description: skill.description,
    coefficientText: skill.coefficientText
  }));
const INITIAL_SKILLS = [...DEFAULT_SKILLS, ...GENERATED_SKILLS];

const SLOTS = ['武器', '衣服', '头部', '手部', '鞋子'];
function defaultItemName(slot, preferred) {
  return INITIAL_EQUIPMENT.find((item) => item.type === slot && item.name === preferred)?.name
    || INITIAL_EQUIPMENT.find((item) => item.type === slot && item.isCompletedItem)?.name
    || INITIAL_EQUIPMENT.find((item) => item.type === slot)?.name
    || '';
}
const DEFAULT_GEAR = {
  武器: defaultItemName('武器', '阿戈斯之眼'),
  衣服: defaultItemName('衣服', '私人订制'),
  头部: defaultItemName('头部', '先知头巾'),
  手部: defaultItemName('手部', '翡翠石板'),
  鞋子: defaultItemName('鞋子', '精灵之靴')
};
const WEAPON_TYPE_OPTIONS = [
  '全部类型',
  ...Array.from(new Set(INITIAL_EQUIPMENT.filter((item) => item.type === '武器').map((item) => item.weaponType || '未设置'))).sort()
];

const TARGETS = [
  { name: '自定义木桩', hp: 1000, defense: 140, defenseReduction: 0, reduction: 0 },
  { name: '6级全装T', hp: 2080, defense: 131, defenseReduction: 0, reduction: 0.16 },
  { name: '15级魔女帽T', hp: 3110, defense: 156, defenseReduction: 0, reduction: 0.16 },
  { name: '15级火衣头T', hp: 3160, defense: 166, defenseReduction: 0, reduction: 0.16 },
  { name: '20级全装T', hp: 4110, defense: 187, defenseReduction: 0, reduction: 0.16 },
  { name: '20级无惧感T', hp: 4110, defense: 212, defenseReduction: 0, reduction: 0.16 }
];

function getNumber(value) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

function pct(value) {
  return `${Math.round(value * 1000) / 10}%`;
}

function round(value, digits = 1) {
  const base = 10 ** digits;
  return Math.round(value * base) / base;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeEquipment(savedEquipment) {
  if (!Array.isArray(savedEquipment)) return clone(INITIAL_EQUIPMENT);

  const savedByCode = new Map(savedEquipment.filter((item) => item.code).map((item) => [item.code, item]));
  const savedByName = new Map(savedEquipment.map((item) => [item.name, item]));
  const mergedOfficial = INITIAL_EQUIPMENT.map((item) => {
    const saved = savedByCode.get(item.code) || savedByName.get(item.name);
    return saved ? { ...saved, ...item, effect: saved.effect || item.effect } : item;
  });
  const officialCodes = new Set(INITIAL_EQUIPMENT.map((item) => item.code).filter(Boolean));
  const officialNames = new Set(INITIAL_EQUIPMENT.map((item) => item.name));
  return [
    ...mergedOfficial,
    ...savedEquipment.filter((item) => (
      item.code ? !officialCodes.has(item.code) : !officialNames.has(item.name)
    ))
  ];
}

function mergeSkills(savedSkills) {
  if (!Array.isArray(savedSkills)) return clone(INITIAL_SKILLS);

  const existingIds = new Set(savedSkills.map((skill) => skill.id));
  return [
    ...savedSkills,
    ...INITIAL_SKILLS.filter((skill) => !existingIds.has(skill.id))
  ];
}

function statValue(stats, key) {
  return getNumber(stats?.[key]);
}

function formatStatValue(key, value) {
  const stat = ITEM_STAT_BY_KEY[key];
  if (stat?.format === 'percent') {
    const percentValue = Math.abs(value) <= 1 ? value * 100 : value;
    return `${round(percentValue, Math.abs(percentValue) < 10 ? 1 : 0)}%`;
  }
  return String(round(value, Math.abs(value) < 10 ? 2 : 1));
}

function aggregateEquipmentStats(selected) {
  return selected.reduce((totals, item) => {
    const sourceStats = {
      ...(item.stats || {}),
      attackPower: statValue(item.stats, 'attackPower') || getNumber(item.attackPower),
      skillAmp: statValue(item.stats, 'skillAmp') || getNumber(item.ap),
      cooldownReduction: statValue(item.stats, 'cooldownReduction') || getNumber(item.cd),
      defense: statValue(item.stats, 'defense') || getNumber(item.defense),
      maxHp: statValue(item.stats, 'maxHp') || getNumber(item.maxHp),
      sightRange: statValue(item.stats, 'sightRange') || getNumber(item.sightRange),
      penetrationDefense: statValue(item.stats, 'penetrationDefense') || getNumber(item.pen),
      penetrationDefenseRatio: statValue(item.stats, 'penetrationDefenseRatio') || getNumber(item.penPct),
      skillAmpRatio: statValue(item.stats, 'skillAmpRatio') || getNumber(item.apPct)
    };
    Object.entries(sourceStats).forEach(([key, value]) => {
      const next = getNumber(value);
      if (!next) return;
      if (ITEM_STAT_BY_KEY[key]?.unique) {
        totals[key] = Math.max(getNumber(totals[key]), next);
      } else {
        totals[key] = getNumber(totals[key]) + next;
      }
    });
    return totals;
  }, {});
}

function loadConfig() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return {
      equipment: mergeEquipment(saved?.equipment),
      skills: mergeSkills(saved?.skills),
      talents: Array.isArray(saved?.talents) ? saved.talents : clone(DEFAULT_TALENTS)
    };
  } catch {
    return { equipment: clone(INITIAL_EQUIPMENT), skills: clone(INITIAL_SKILLS), talents: clone(DEFAULT_TALENTS) };
  }
}

function loadHelpNotes() {
  if (!HELP_NOTES_EDITABLE) return DEFAULT_HELP_NOTES;

  try {
    const saved = JSON.parse(window.localStorage.getItem(HELP_NOTES_KEY));
    return { ...DEFAULT_HELP_NOTES, ...(saved || {}) };
  } catch {
    return DEFAULT_HELP_NOTES;
  }
}

function byName(equipment, name) {
  return equipment.find((item) => item.name === name);
}

function basesFor(skill) {
  return String(skill.bases || '')
    .split(',')
    .map((value) => getNumber(value.trim()));
}

function skillBaseAtLevel(skill, level) {
  const bases = basesFor(skill);
  const index = Math.max(0, Math.min(getNumber(level) - 1, bases.length - 1));
  return bases[index] ?? 0;
}

function clampLevel(skill, level) {
  return Math.max(1, Math.min(getNumber(skill.maxLevel) || basesFor(skill).length || 1, getNumber(level) || 1));
}

function evaluateFormula(formula, context) {
  const expression = String(formula || '').trim();
  if (!/^[\d\s+\-*/().,_A-Za-z[\]]+$/.test(expression)) return 0;

  try {
    const calculate = Function(
      'base',
      'ap',
      'attack',
      'targetHp',
      'stacks',
      'level',
      `"use strict"; return (${expression});`
    );
    return getNumber(calculate(context.base, context.ap, context.attack, context.targetHp, context.stacks, context.level));
  } catch {
    return 0;
  }
}

function calculateSkill(skill, level, context) {
  const nextLevel = clampLevel(skill, level);
  const base = skillBaseAtLevel(skill, nextLevel);
  const formulaContext = { ...context, base, level: nextLevel };
  const rawDamage = evaluateFormula(skill.formula, formulaContext);
  return {
    ...skill,
    level: nextLevel,
    base,
    rawDamage,
    damage: rawDamage * context.finalMod
  };
}

function calc({
  equipment,
  skillTable,
  skillLevels,
  gear,
  mastery,
  attack,
  talentAp,
  selectedTalentIds,
  talentTable,
  target,
  selfHp,
  damageBonus,
  skillReduction,
  r2Stacks,
  burstFollowUp,
  vampireFull,
  blazingFull,
  masterTriggered,
  ideaTriggered,
  selectedHero
}) {
  const selected = SLOTS.map((slot) => byName(equipment, gear[slot])).filter(Boolean);
  const equipmentStats = aggregateEquipmentStats(selected);
  const selectedTalents = talentTable.filter((talent) => Object.values(selectedTalentIds).includes(talent.id));
  const talentBonusAp = selectedTalents.reduce((sum, item) => sum + getNumber(item.ap), 0);
  const talentPen = selectedTalents.reduce((sum, item) => sum + getNumber(item.pen), 0);
  const talentPenPct = selectedTalents.reduce((sum, item) => sum + getNumber(item.penPct), 0);
  const talentDamageBonus = selectedTalents.reduce((sum, item) => sum + getNumber(item.dmgAmp), 0);
  const equipAp = statValue(equipmentStats, 'skillAmp') + statValue(equipmentStats, 'adaptiveForce') || selected.reduce((sum, item) => sum + getNumber(item.ap), 0);
  const equipAttackPower = statValue(equipmentStats, 'attackPower');
  const stackAp = (vampireFull ? 18 : 0) + (blazingFull ? 24 : 0);
  const cd = statValue(equipmentStats, 'cooldownReduction') || selected.reduce((sum, item) => sum + getNumber(item.cd), 0);
  const pen = statValue(equipmentStats, 'penetrationDefense') + statValue(equipmentStats, 'uniquePenetrationDefense') + talentPen || selected.reduce((sum, item) => sum + getNumber(item.pen), 0) + talentPen;
  const penPct = statValue(equipmentStats, 'penetrationDefenseRatio') + statValue(equipmentStats, 'uniquePenetrationDefenseRatio') + talentPenPct || selected.reduce((sum, item) => sum + getNumber(item.penPct), 0) + talentPenPct;
  const equipDefense = statValue(equipmentStats, 'defense') || selected.reduce((sum, item) => sum + getNumber(item.defense), 0);
  const normalApPct = statValue(equipmentStats, 'skillAmpRatio') + selected.reduce((sum, item) => sum + (item.uniqueApPct ? 0 : getNumber(item.apPct)), 0);
  const uniqueApPct = Math.max(statValue(equipmentStats, 'uniqueSkillAmpRatio'), ...selected.filter((item) => item.uniqueApPct).map((item) => getNumber(item.apPct)));
  const equipDamageBonus = selected.reduce((sum, item) => sum + getNumber(item.dmgAmp), 0);
  const masteryApPct = mastery * 0.041;
  const totalApPct = normalApPct + uniqueApPct + masteryApPct;
  const apRaw = (equipAp + talentAp + talentBonusAp + stackAp) * (1 + totalApPct);
  const masterAp = masterTriggered ? mastery + 14 : 0;
  const ap = Math.floor(apRaw) + masterAp;
  const finalDefense = target.defense * (1 - target.defenseReduction) * (1 - penPct) - pen;
  const defenseMod = 100 / (100 + finalDefense);
  const ideaDamageBonus = ideaTriggered ? 0.15 : 0;
  const totalDamageBonus = damageBonus + equipDamageBonus + ideaDamageBonus + talentDamageBonus;
  const damageMod = 1 + totalDamageBonus - target.reduction - skillReduction;
  const finalMod = defenseMod * damageMod;
  const stackCount = Math.min(4, Math.max(0, r2Stacks));
  const context = { ap, attack: attack + equipAttackPower, targetHp: target.hp, stacks: stackCount, finalMod };
  const heroSkills = skillTable
    .filter((skill) => skill.hero === selectedHero)
    .map((skill) => calculateSkill(skill, skillLevels[skill.id], context));
  const hpDiffRatio = Math.min(0.4, Math.max(0.1, (target.hp - selfHp) / selfHp));
  const burstBonus = Math.min(0.1, Math.max(0, (target.hp - selfHp) / selfHp) * 0.25);
  const curse = 50 + ap * 0.15;
  const corrosionTick = target.hp * (0.9 + 0.002 * ap) / 100;
  const scarBase = 10 + 20 + target.hp * 0.03;
  const tearBase = 50 + target.hp * 0.7 * 0.08;
  const effects = [
    { title: '诅咒(真伤)', raw: curse, value: curse, note: '4秒后触发' },
    { title: '腐化(技) 每跳', raw: corrosionTick, value: corrosionTick * finalMod, note: '共3跳' },
    { title: '腐化(技) 合计', raw: corrosionTick * 3, value: corrosionTick * finalMod * 3, note: '3跳' },
    { title: '伤痕(技)', raw: scarBase, value: scarBase * finalMod, note: '10+20+目标血量*3%' },
    { title: '伤口撕裂', raw: tearBase, value: tearBase * finalMod, note: '以触发时70%血计算' }
  ];
  const ghostFire = 250 + ap * 0.2;
  const repelF = 5 * (10 + mastery) + target.hp * 0.006 + (burstFollowUp ? 3 * (10 + mastery) : 0);
  const effectSubtotalRaw = curse + corrosionTick * 3 + scarBase + tearBase;
  const effectSubtotal = curse + corrosionTick * finalMod * 3 + scarBase * finalMod + tearBase * finalMod;
  const yuminSkills = skillTable
    .filter((skill) => skill.hero === '俞岷')
    .map((skill) => calculateSkill(skill, skillLevels[skill.id], context));
  const yuminDamage = Object.fromEntries(yuminSkills.map((skill) => [skill.id, skill.damage]));
  const yuminQ3 = getNumber(yuminDamage['yumin-q']) * 3;
  const yuminEq4 = getNumber(yuminDamage['yumin-eq']) * 4;
  const yuminEqqw = yuminQ3 + yuminEq4 + getNumber(yuminDamage['yumin-e']) + getNumber(yuminDamage['yumin-w']);
  const yuminCombos = [
    { title: 'Q 三跳全中', value: yuminQ3, note: '工作簿 Q*3' },
    { title: 'EQ 四跳全中', value: yuminEq4, note: '工作簿 EQ*4' },
    { title: 'EQQW 全中', value: yuminEqqw, note: 'Q3 + EQ4 + E + W' },
    { title: 'EQQW + 装备 DOT', value: yuminEqqw + ghostFire + corrosionTick * finalMod * 3, note: '鬼火 + 腐化3跳' }
  ];
  const extraHeroGroups = Object.values(
    skillTable
      .filter((skill) => !MANUAL_HEROES.includes(skill.hero))
      .reduce((groups, skill) => {
        const hero = skill.hero || '未命名英雄';
        groups[hero] = [...(groups[hero] || []), calculateSkill(skill, skillLevels[skill.id], context)];
        return groups;
      }, {})
  );

  return {
    selected,
    equipmentStats,
    equipAp,
    equipAttackPower,
    talentAp,
    talentBonusAp,
    stackAp,
    selectedTalents,
    cd,
    pen,
    penPct,
    equipDefense,
    normalApPct,
    uniqueApPct,
    masteryApPct,
    totalApPct,
    masterAp,
    ap,
    apRaw,
    finalDefense,
    defenseMod,
    equipDamageBonus,
    talentDamageBonus,
    ideaDamageBonus,
    totalDamageBonus,
    damageMod,
    finalMod,
    hpDiffRatio,
    burstBonus,
    skills: heroSkills,
    effects,
    effectSubtotalRaw,
    effectSubtotal,
    ghostFire,
    repelF,
    yuminSkills,
    yuminCombos,
    extraHeroGroups
  };
}

function HelpNote({ note, editable, onChange }) {
  if (!note) return null;

  return (
    <span className="helpNote">
      <button type="button" className="helpButton" aria-label="查看说明">?</button>
      <span className="helpPopover" role="tooltip">
        {editable ? (
          <textarea
            value={note}
            onChange={(event) => onChange(event.target.value)}
            aria-label="编辑帮助说明"
          />
        ) : (
          <span>{note}</span>
        )}
        <small>{editable ? '本地可编辑，自动保存。' : '发布版本只读。'}</small>
      </span>
    </span>
  );
}

function LabelWithHelp({ children, note }) {
  return (
    <span className="labelWithHelp">
      <span>{children}</span>
      {note}
    </span>
  );
}

function HeaderCell({ children, note }) {
  return <th><LabelWithHelp note={note}>{children}</LabelWithHelp></th>;
}

function Field({ label, value, onChange, suffix, min, max, step = 1, note }) {
  return (
    <label className="field">
      <LabelWithHelp note={note}>{label}</LabelWithHelp>
      <div className="fieldInput">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(getNumber(event.target.value))}
        />
        {suffix ? <b>{suffix}</b> : null}
      </div>
    </label>
  );
}

function StatCard({ label, value, hint, note }) {
  return (
    <div className="statCard">
      <LabelWithHelp note={note}>{label}</LabelWithHelp>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

function LevelSelect({ skill, value, onChange }) {
  const maxLevel = getNumber(skill.maxLevel) || basesFor(skill).length || 1;

  return (
    <label className="levelSelect">
      <span>Lv.</span>
      <select value={clampLevel(skill, value)} onChange={(event) => onChange(skill.id, getNumber(event.target.value))}>
        {Array.from({ length: maxLevel }, (_, index) => (
          <option value={index + 1} key={`${skill.id}-${index + 1}`}>{index + 1}</option>
        ))}
      </select>
    </label>
  );
}

function TextCell({ value, onChange, type = 'text', step }) {
  return <input type={type} step={step} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />;
}

function DamageValue({ raw, final }) {
  return (
    <div className="damageValue">
      <b>{Math.floor(final)}</b>
      <small>原始 {Math.floor(raw)}</small>
    </div>
  );
}

function groupSkillRows(skills) {
  return Object.values(skills.reduce((groups, skill) => {
    const key = skill.title.replace(/\s*(一段|二段|三段|每跳|带叠层|\/额外|\+\s*10%目标血).*$/, '').trim() || skill.title;
    groups[key] = [...(groups[key] || []), skill];
    return groups;
  }, {}));
}

export default function App() {
  const [{ equipment, skills, talents }, setConfig] = useState(loadConfig);
  const [gear, setGear] = useState(DEFAULT_GEAR);
  const [weaponTypeFilter, setWeaponTypeFilter] = useState('全部类型');
  const [selectedHero, setSelectedHero] = useState('俞岷');
  const [mastery, setMastery] = useState(20);
  const [attack, setAttack] = useState(155);
  const [talentAp, setTalentAp] = useState(52);
  const [selectedTalentIds, setSelectedTalentIds] = useState({ 主天赋: 'main-custom', 副天赋: 'sub-custom' });
  const [targetIndex, setTargetIndex] = useState(0);
  const [target, setTarget] = useState(TARGETS[0]);
  const [selfHp, setSelfHp] = useState(2514);
  const [damageBonus, setDamageBonus] = useState(0);
  const [skillReduction, setSkillReduction] = useState(0);
  const [r2Stacks, setR2Stacks] = useState(1);
  const [burstFollowUp, setBurstFollowUp] = useState(true);
  const [vampireFull, setVampireFull] = useState(false);
  const [blazingFull, setBlazingFull] = useState(false);
  const [masterTriggered, setMasterTriggered] = useState(false);
  const [ideaTriggered, setIdeaTriggered] = useState(false);
  const [showStatSettings, setShowStatSettings] = useState(false);
  const [visibleStatKeys, setVisibleStatKeys] = useState(DEFAULT_VISIBLE_STAT_KEYS);
  const [skillLevels, setSkillLevels] = useState(() => Object.fromEntries(INITIAL_SKILLS.map((skill) => [skill.id, skill.maxLevel])));
  const [helpNotes, setHelpNotes] = useState(loadHelpNotes);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ equipment, skills, talents }));
  }, [equipment, skills, talents]);

  useEffect(() => {
    if (HELP_NOTES_EDITABLE) {
      window.localStorage.setItem(HELP_NOTES_KEY, JSON.stringify(helpNotes));
    }
  }, [helpNotes]);

  function updateHelpNote(key, value) {
    if (!HELP_NOTES_EDITABLE) return;
    setHelpNotes((current) => ({ ...current, [key]: value }));
  }

  function help(key) {
    return (
      <HelpNote
        note={helpNotes[key] || DEFAULT_HELP_NOTES[key]}
        editable={HELP_NOTES_EDITABLE}
        onChange={(value) => updateHelpNote(key, value)}
      />
    );
  }

  const result = useMemo(
    () => calc({
      equipment,
      skillTable: skills,
      skillLevels,
      gear,
      mastery,
      attack,
      talentAp,
      selectedTalentIds,
      talentTable: talents,
      target,
      selfHp,
      damageBonus,
      skillReduction,
      r2Stacks,
      burstFollowUp,
      vampireFull,
      blazingFull,
      masterTriggered,
      ideaTriggered,
      selectedHero
    }),
    [equipment, skills, talents, skillLevels, gear, mastery, attack, talentAp, selectedTalentIds, target, selfHp, damageBonus, skillReduction, r2Stacks, burstFollowUp, vampireFull, blazingFull, masterTriggered, ideaTriggered, selectedHero]
  );
  const selectedCharacter = ER_GAME_DATA.characters.find((character) => character.name === selectedHero);
  const selectedOfficialSkillGroups = ER_GAME_DATA.rawSkillGroups.filter((skill) => skill.hero === selectedHero);
  const visibleEquipmentStats = visibleStatKeys
    .map((key) => ({ ...ITEM_STAT_BY_KEY[key], key, value: statValue(result.equipmentStats, key) }))
    .filter((stat) => stat.label && stat.value !== 0);
  const activeEquipmentStats = ITEM_STAT_DEFINITIONS
    .map((stat) => ({ ...stat, value: statValue(result.equipmentStats, stat.key) }))
    .filter((stat) => stat.value !== 0);

  function updateGear(slot, name) {
    setGear((current) => ({ ...current, [slot]: name }));
  }

  function updateWeaponType(type) {
    setWeaponTypeFilter(type);
    if (type === '全部类型') return;

    const match = equipment.find((item) => item.type === '武器' && item.weaponType === type);
    if (match) updateGear('武器', match.name);
  }

  function pickTarget(index) {
    const next = TARGETS[index];
    setTargetIndex(index);
    setTarget(next);
  }

  function updateTarget(key, value) {
    setTargetIndex(0);
    setTarget((current) => ({ ...current, name: '自定义目标', [key]: value }));
  }

  function updateSkillLevel(id, level) {
    setSkillLevels((current) => ({ ...current, [id]: level }));
  }

  function updateTalentPick(slot, id) {
    setSelectedTalentIds((current) => ({ ...current, [slot]: id }));
  }

  function toggleVisibleStat(key) {
    setVisibleStatKeys((current) => (
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    ));
  }

  function updateTalentRow(index, key, value) {
    setConfig((current) => ({
      ...current,
      talents: current.talents.map((talent, rowIndex) => {
        if (rowIndex !== index) return talent;
        const numericKeys = ['ap', 'pen', 'penPct', 'dmgAmp'];
        return { ...talent, [key]: numericKeys.includes(key) ? getNumber(value) : value };
      })
    }));
  }

  function updateEquipmentRow(index, key, value) {
    setConfig((current) => ({
      ...current,
      equipment: current.equipment.map((item, rowIndex) => {
        if (rowIndex !== index) return item;
        const numericKeys = ['ap', 'attackPower', 'cd', 'pen', 'penPct', 'apPct', 'defense', 'maxHp', 'sightRange', 'dmgAmp'];
        return { ...item, [key]: numericKeys.includes(key) ? getNumber(value) : value };
      })
    }));
  }

  function updateSkillRow(index, key, value) {
    setConfig((current) => ({
      ...current,
      skills: current.skills.map((skill, rowIndex) => (
        rowIndex === index ? { ...skill, [key]: key === 'maxLevel' ? getNumber(value) : value } : skill
      ))
    }));
  }

  function addEquipment() {
    setConfig({
      equipment: [...equipment, {
        type: '武器',
        weaponType: '圣器 / Arcana',
        name: '新装备',
        quality: '金',
        ap: 0,
        cd: 0,
        pen: 0,
        penPct: 0,
        apPct: 0,
        attackPower: 0,
        defense: 0,
        maxHp: 0,
        sightRange: 0,
        stats: {},
        effect: ''
      }],
      skills,
      talents
    });
  }

  function addSkill() {
    const id = `skill-${Date.now()}`;
    setConfig({
      equipment,
      skills: [...skills, {
        id,
        hero: '新英雄',
        title: '新技能',
        bases: '0,0,0,0,0',
        formula: 'base + ap * 0',
        maxLevel: 5
      }],
      talents
    });
    setSkillLevels((current) => ({ ...current, [id]: 5 }));
  }

  function addTalent() {
    setConfig({
      equipment,
      skills,
      talents: [...talents, {
        id: `talent-${Date.now()}`,
        slot: '主天赋',
        name: '新潜能',
        ap: 0,
        pen: 0,
        penPct: 0,
        dmgAmp: 0,
        note: ''
      }]
    });
  }

  function resetConfig() {
    setConfig({ equipment: clone(INITIAL_EQUIPMENT), skills: clone(INITIAL_SKILLS), talents: clone(DEFAULT_TALENTS) });
    setSkillLevels(Object.fromEntries(INITIAL_SKILLS.map((skill) => [skill.id, skill.maxLevel])));
  }

  return (
    <main>
      <section className="hero">
        <div>
          <h1>永恒轮回伤害计算器</h1>
          <p className="intro">选择英雄、装备和潜能后即时计算法强、防穿、防御修正、原始伤害与最终伤害。</p>
          <div className="heroPicker compactHeroPicker">
            <label className="selectBlock">
              <LabelWithHelp note={help('select.hero')}>英雄</LabelWithHelp>
              <select value={selectedHero} onChange={(event) => setSelectedHero(event.target.value)}>
                {HEROES.map((hero) => (
                  <option value={hero} key={hero}>{hero === '奇娅拉' ? '修女（奇娅拉）' : hero}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="heroPanel heroIdentity">
          {selectedCharacter ? (
            <img src={selectedCharacter.image} alt={selectedCharacter.name} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
          ) : null}
          <span>当前英雄</span>
          <strong>{selectedHero === '奇娅拉' ? '修女（奇娅拉）' : selectedHero}</strong>
          <small>{selectedCharacter ? `${selectedCharacter.englishName} / ${selectedCharacter.weapons.join(', ') || '未设置武器'}` : '手动配置英雄'}</small>
        </div>
      </section>

      <section className="grid twoColumns">
        <div className="panel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Build</p>
              <h2><LabelWithHelp note={help('section.gear')}>装备选择</LabelWithHelp></h2>
            </div>
            <div className="buttonRow">
              <button type="button" className="quietButton" onClick={() => setShowStatSettings((current) => !current)}>显示设置</button>
              <span className="pill">CD {result.cd}</span>
            </div>
          </div>
          <div className="gearGrid">
            <label className="selectBlock">
              <LabelWithHelp note={help('select.weaponType')}>武器类型</LabelWithHelp>
              <select value={weaponTypeFilter} onChange={(event) => updateWeaponType(event.target.value)}>
                <option value="全部类型">全部类型</option>
                {WEAPON_TYPE_OPTIONS.filter((type) => type !== '全部类型').map((type) => <option value={type} key={type}>{type}</option>)}
              </select>
            </label>
            {SLOTS.map((slot) => (
              <label className="selectBlock" key={slot}>
                <LabelWithHelp note={help('equipment.type')}>{slot}</LabelWithHelp>
                <select
                  className="qualitySelect"
                  value={gear[slot]}
                  style={{ color: QUALITY_COLORS[byName(equipment, gear[slot])?.quality] }}
                  onChange={(event) => updateGear(slot, event.target.value)}
                >
                  {equipment.filter((item) => (
                    item.type === slot
                    && (slot !== '武器' || weaponTypeFilter === '全部类型' || item.weaponType === weaponTypeFilter)
                  )).map((item) => (
                    <option value={item.name} key={`${item.type}-${item.name}`} style={{ color: QUALITY_COLORS[item.quality] }}>
                      {slot === '武器' ? `${item.name} / ${item.weaponType || '未设置'}` : item.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <Field label="熟练度等级" value={mastery} onChange={setMastery} min={1} max={20} note={help('field.mastery')} />
            <Field label="手动潜能法强" value={talentAp} onChange={setTalentAp} note={help('field.talentAp')} />
          </div>
          <div className="chips">
            {result.selected.map((item) => (
              <span className={`chip ${item.quality === '红' ? 'red' : item.quality === '金' ? 'gold' : 'purple'}`} key={item.name}>
                {item.name}{item.effect ? ` / ${item.effect}` : ''}
              </span>
            ))}
          </div>
          {showStatSettings ? (
            <div className="statSettings">
              {ITEM_STAT_DEFINITIONS.map((stat) => (
                <label className="toggle" key={stat.key}>
                  <input type="checkbox" checked={visibleStatKeys.includes(stat.key)} onChange={() => toggleVisibleStat(stat.key)} />
                  <span>{stat.label}{stat.unique ? '（独有）' : ''}</span>
                </label>
              ))}
            </div>
          ) : null}
          <div className="attributePanel">
            <div>
              <span>当前法强</span>
              <strong>{result.ap}</strong>
              <small>装备 {result.equipAp} + 手动 {talentAp} + 潜能 {result.talentBonusAp} + 叠层 {result.stackAp}，加成 {pct(result.totalApPct)}</small>
            </div>
            <div>
              <span>攻击力</span>
              <strong>{attack + result.equipAttackPower}</strong>
            </div>
            <div>
              <span>防穿</span>
              <strong>{result.pen} / {pct(result.penPct)}</strong>
            </div>
            <div>
              <span>技伤</span>
              <strong>{pct(result.totalDamageBonus)}</strong>
            </div>
            {visibleEquipmentStats.map((stat) => (
              <div key={stat.key}>
                <span>{stat.label}{stat.unique ? '（独有）' : ''}</span>
                <strong>{formatStatValue(stat.key, stat.value)}</strong>
              </div>
            ))}
          </div>
          <div className="equippedStats">
            <div className="panelSubhead">
              <strong>当前装备属性</strong>
              <span>{activeEquipmentStats.length} 条非零属性</span>
            </div>
            <div className="statPills">
              {activeEquipmentStats.map((stat) => (
                <span className="statPill" key={stat.key}>{stat.label}{stat.unique ? '（独有）' : ''} {formatStatValue(stat.key, stat.value)}</span>
              ))}
            </div>
          </div>
          <div className="toggles compactToggles">
            <label className="toggle">
              <input type="checkbox" checked={vampireFull} onChange={(event) => setVampireFull(event.target.checked)} />
              <span>吸血鬼满层</span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={blazingFull} onChange={(event) => setBlazingFull(event.target.checked)} />
              <span>炽燃满层</span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={burstFollowUp} onChange={(event) => setBurstFollowUp(event.target.checked)} />
              <span>斥力弹升级</span>
            </label>
          </div>
        </div>

        <div className="panel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Target</p>
              <h2><LabelWithHelp note={help('section.target')}>目标与增减伤</LabelWithHelp></h2>
            </div>
            <span className="pill">修正 {round(result.finalMod, 3)}</span>
          </div>
          <label className="selectBlock full">
            <LabelWithHelp note={help('field.targetHp')}>预设目标</LabelWithHelp>
            <select value={targetIndex} onChange={(event) => pickTarget(Number(event.target.value))}>
              {TARGETS.map((item, index) => <option value={index} key={item.name}>{item.name}</option>)}
            </select>
          </label>
          <div className="formGrid">
            <Field label="目标血量" value={target.hp} onChange={(value) => updateTarget('hp', value)} note={help('field.targetHp')} />
            <Field label="目标防御" value={target.defense} onChange={(value) => updateTarget('defense', value)} note={help('field.targetDefense')} />
            <Field label="目标防御降低" value={target.defenseReduction} onChange={(value) => updateTarget('defenseReduction', value)} suffix="小数" step={0.01} note={help('field.targetDefenseReduction')} />
            <Field label="目标减伤" value={target.reduction} onChange={(value) => updateTarget('reduction', value)} suffix="小数" step={0.01} note={help('field.targetReduction')} />
            <Field label="自身血量" value={selfHp} onChange={setSelfHp} note={help('field.selfHp')} />
            <Field label="手动技伤加成" value={damageBonus} onChange={setDamageBonus} suffix="小数" step={0.01} note={help('field.damageBonus')} />
            <Field label="技能减免" value={skillReduction} onChange={setSkillReduction} suffix="小数" step={0.01} note={help('field.skillReduction')} />
          </div>
        </div>
      </section>

      <section className="stats">
        <StatCard label="最终防御" value={round(result.finalDefense, 1)} hint={`防御修正 ${pct(result.defenseMod)}`} note={help('stat.finalDefense')} />
        <StatCard label="防穿" value={`${result.pen} / ${pct(result.penPct)}`} hint="数值 / 百分比" note={help('stat.pen')} />
        <StatCard label="技伤加成" value={pct(result.totalDamageBonus)} hint={`装备 ${pct(result.equipDamageBonus)} / 开关 ${pct(result.ideaDamageBonus)}`} note={help('stat.damageBonus')} />
        <StatCard label="增减伤合算" value={pct(result.damageMod - 1)} hint={`最终倍率 ${round(result.damageMod, 3)}`} note={help('stat.damageMod')} />
        <StatCard label="血量差比" value={pct(result.hpDiffRatio)} hint={`爆发力追伤 ${pct(result.burstBonus)}`} note={help('stat.hpDiffRatio')} />
      </section>

      {selectedCharacter ? (
        <section className="panel sourcePanel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">ER GameData</p>
              <h2>{selectedCharacter.name} 官方数据</h2>
            </div>
            <span className="pill">{ER_GAME_DATA.counts.characters} 名角色 / {ER_GAME_DATA.counts.calculableSkills} 条可计算技能</span>
          </div>
          <div className="sourceGrid">
            <div className="characterCard">
              <img src={selectedCharacter.image} alt={selectedCharacter.name} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
              <div>
                <strong>{selectedCharacter.storyName || selectedCharacter.name}</strong>
                <span>{selectedCharacter.englishName} / {selectedCharacter.archetypes.join(', ') || '未分类'}</span>
                <small>{selectedCharacter.playTip}</small>
              </div>
            </div>
            <div className="miniStats">
              <StatCard label="基础血量" value={selectedCharacter.base.hp} hint={`成长 +${round(selectedCharacter.growth?.maxHp || 0, 2)} / 级`} />
              <StatCard label="基础攻击" value={selectedCharacter.base.attackPower} hint={`成长 +${round(selectedCharacter.growth?.attackPower || 0, 2)} / 级`} />
              <StatCard label="基础防御" value={selectedCharacter.base.defense} hint={`成长 +${round(selectedCharacter.growth?.defense || 0, 2)} / 级`} />
              <StatCard label="熟练武器" value={selectedCharacter.weapons.length} hint={selectedCharacter.weapons.join(', ')} />
            </div>
          </div>
          <div className="officialSkillStrip">
            {selectedOfficialSkillGroups.map((skill) => (
              <div key={skill.group}>
                <strong>{skill.slot} {skill.name}</strong>
                <span>{skill.coefficientText || skill.description || '官方数据已导入，暂无可计算公式'}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel talentPanel">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Potential</p>
            <h2>潜能选择</h2>
          </div>
          <span className="pill">后台可编辑</span>
        </div>
        <div className="talentGrid">
          {['主天赋', '副天赋'].map((slot) => (
            <label className="selectBlock talentPick" key={slot}>
              <span>{slot}</span>
              <select value={selectedTalentIds[slot]} onChange={(event) => updateTalentPick(slot, event.target.value)}>
                {talents.filter((talent) => talent.slot === slot).map((talent) => (
                  <option value={talent.id} key={talent.id}>{talent.name}</option>
                ))}
              </select>
              <small>{talents.find((talent) => talent.id === selectedTalentIds[slot])?.note || '手动配置潜能效果'}</small>
            </label>
          ))}
          <div className="talentResult">
            <span>潜能合计</span>
            <strong>法强 +{result.talentBonusAp}</strong>
            <small>防穿 +{result.selectedTalents.reduce((sum, item) => sum + getNumber(item.pen), 0)} / {pct(result.selectedTalents.reduce((sum, item) => sum + getNumber(item.penPct), 0))}，技伤 +{pct(result.talentDamageBonus)}</small>
          </div>
        </div>
      </section>

      <section className="grid twoColumns">
        <div className="panel damagePanel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Skills</p>
              <h2>{selectedHero === '奇娅拉' ? '修女（奇娅拉）' : selectedHero} 技能伤害</h2>
            </div>
            {selectedHero === '奇娅拉' ? (
              <div className="stackBlocks" aria-label="R2层数">
                {[0, 1, 2, 3, 4].map((stack) => (
                  <button
                    type="button"
                    className={r2Stacks === stack ? 'active' : ''}
                    onClick={() => setR2Stacks(stack)}
                    key={stack}
                  >
                    {stack}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="skillGroups">
            {groupSkillRows(result.skills).map((group) => (
              <div className="skillGroup" key={group.map((skill) => skill.id).join('-')}>
                {group.map((skill) => (
                  <div className="damageRow skillRow compactDamageRow" key={skill.id}>
                    <div>
                      <strong>{skill.title}</strong>
                      <span>Lv.{skill.level} 基础 {round(skill.base, 1)}</span>
                    </div>
                    <div className="damageTools">
                      <LevelSelect skill={skill} value={skillLevels[skill.id]} onChange={updateSkillLevel} />
                      <DamageValue raw={skill.rawDamage} final={skill.damage} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {!result.skills.length ? (
              <p className="note">当前英雄暂无技能数据，可在后台配置表继续录入。</p>
            ) : null}
          </div>
        </div>

        <div className="panel damagePanel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Effects</p>
              <h2>特效与附加</h2>
            </div>
          </div>
          <div className="effectGrid">
            {result.effects.map((effect) => (
              <div className="damageRow compactDamageRow" key={effect.title}>
                <div>
                  <strong>{effect.title}</strong>
                  <span>{effect.note}</span>
                </div>
                <DamageValue raw={effect.raw} final={effect.value} />
              </div>
            ))}
            <div className="damageRow compactDamageRow highlight">
              <div>
                <strong>特效小计</strong>
                <span>诅咒+腐化3跳+伤痕+撕裂</span>
              </div>
              <DamageValue raw={result.effectSubtotalRaw} final={result.effectSubtotal} />
            </div>
            <div className="damageRow compactDamageRow">
              <div>
                <strong>鬼火(真伤)</strong>
                <span>250 + 法强 * 20%</span>
              </div>
              <DamageValue raw={result.ghostFire} final={result.ghostFire} />
            </div>
            <div className="damageRow compactDamageRow">
              <div>
                <strong>斥力弹F</strong>
                <span>5段 + 勾选后升级段数</span>
              </div>
              <DamageValue raw={result.repelF} final={result.repelF} />
            </div>
          </div>
        </div>
      </section>

      {selectedHero === '俞岷' ? (
      <section className="panel formulaPanel">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Yumin</p>
            <h2>俞岷连段</h2>
          </div>
          <span className="pill">共用修正 {round(result.finalMod, 3)}</span>
        </div>
        <div className="grid twoColumns">
          <div className="damageList">
            {result.yuminCombos.map((combo) => (
              <div className={`damageRow ${combo.title === 'EQQW 全中' ? 'highlight' : ''}`} key={combo.title}>
                <div>
                  <strong>{combo.title}</strong>
                  <span>{combo.note}</span>
                </div>
                <DamageValue raw={combo.value / result.finalMod} final={combo.value} />
              </div>
            ))}
          </div>
        </div>
      </section>
      ) : null}

      {result.extraHeroGroups.map((group) => (
        <section className="panel formulaPanel" key={group[0].hero}>
          <div className="panelHead">
            <div>
              <p className="eyebrow">Hero</p>
              <h2>{group[0].hero}</h2>
            </div>
            <span className="pill">配置公式</span>
          </div>
          <div className="damageList configSkillList">
            {group.map((skill) => (
              <div className="damageRow skillRow" key={skill.id}>
                <div>
                  <strong>{skill.title}</strong>
                  <span>Lv.{skill.level} 基础 {round(skill.base, 1)}</span>
                </div>
                <div className="damageTools">
                  <LevelSelect skill={skill} value={skillLevels[skill.id]} onChange={updateSkillLevel} />
                  <DamageValue raw={skill.rawDamage} final={skill.damage} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="panel formulaPanel">
        <div>
          <p className="eyebrow">Formula</p>
          <h2>计算过程</h2>
        </div>
        <div className="formulaGrid">
          <StatCard label="装备法强" value={result.equipAp} hint="5件装备求和" note={help('stat.equipAp')} />
          <StatCard label="潜能法强" value={talentAp + result.talentBonusAp} hint="手动输入 + 潜能选择" note={help('stat.potentialAp')} />
          <StatCard label="熟练度法强%" value={pct(result.masteryApPct)} hint="每级4.1%" note={help('stat.masteryApPct')} />
          <StatCard label="独有法强%" value={pct(result.uniqueApPct)} hint="重复独有取最高" note={help('stat.uniqueApPct')} />
        </div>
        <div className="formGrid compact">
          <Field label="攻击力" value={attack} onChange={setAttack} note={help('field.attack')} />
        </div>
        <div className="toggles">
          <label className="toggle">
            <input type="checkbox" checked={masterTriggered} onChange={(event) => setMasterTriggered(event.target.checked)} />
            <span>大师触发，法强 + 熟练度 + 14</span>
          </label>
          <label className="toggle">
            <input type="checkbox" checked={ideaTriggered} onChange={(event) => setIdeaTriggered(event.target.checked)} />
            <span>意念触发，技伤 +15%</span>
          </label>
        </div>
        <p className="note">最终伤害 = 技能基础值 * 100 / (100 + 目标防御 * (1 - 防御降低) * (1 - 防穿%) - 防穿数值) * (1 + 技伤加成 - 目标减伤 - 技能减免)。</p>
      </section>

      <section className="panel configPanel">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Config</p>
            <h2><LabelWithHelp note={help('section.config')}>配置表</LabelWithHelp></h2>
          </div>
          <div className="buttonRow">
            <button type="button" onClick={addEquipment}>新增装备</button>
            <button type="button" onClick={addSkill}>新增技能</button>
            <button type="button" onClick={addTalent}>新增潜能</button>
            <button type="button" className="quietButton" onClick={resetConfig}>恢复默认</button>
          </div>
        </div>
        <p className="note">
          编辑后会保存在当前浏览器。技能公式可使用 `base`、`ap`、`attack`、`targetHp`、`stacks`、`level`，等级基础值用英文逗号分隔。数据源预留为 pypy-vrc/er-gamedata，仍保留手动输入覆盖。
          <LabelWithHelp note={help('solution.help')}>帮助说明发布方案</LabelWithHelp>
        </p>
        <div className="sheetWrap">
          <table>
            <caption><LabelWithHelp note={help('table.equipment')}>装备</LabelWithHelp></caption>
            <thead>
              <tr>
                <HeaderCell note={help('equipment.type')}>部位</HeaderCell>
                <HeaderCell note={help('equipment.weaponType')}>武器类型</HeaderCell>
                <HeaderCell note={help('equipment.name')}>名称</HeaderCell>
                <HeaderCell note={help('equipment.quality')}>品质</HeaderCell>
                <HeaderCell note={help('equipment.attackPower')}>攻击力</HeaderCell>
                <HeaderCell note={help('equipment.ap')}>法强</HeaderCell>
                <HeaderCell note={help('equipment.cd')}>CD</HeaderCell>
                <HeaderCell note={help('equipment.defense')}>防御</HeaderCell>
                <HeaderCell note={help('equipment.maxHp')}>生命</HeaderCell>
                <HeaderCell note={help('equipment.sightRange')}>视野</HeaderCell>
                <HeaderCell note={help('equipment.pen')}>防穿</HeaderCell>
                <HeaderCell note={help('equipment.penPct')}>防穿%</HeaderCell>
                <HeaderCell note={help('equipment.apPct')}>法强%</HeaderCell>
                <HeaderCell note={help('equipment.dmgAmp')}>伤增</HeaderCell>
                <HeaderCell note={help('equipment.effect')}>特效</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {equipment.map((item, index) => (
                <tr key={`${item.type}-${item.name}-${index}`}>
                  <td>
                    <select value={item.type} onChange={(event) => updateEquipmentRow(index, 'type', event.target.value)}>
                      {SLOTS.map((slot) => <option value={slot} key={slot}>{slot}</option>)}
                    </select>
                  </td>
                  <td>
                    {item.type === '武器' ? (
                      <select value={item.weaponType || '未设置'} onChange={(event) => updateEquipmentRow(index, 'weaponType', event.target.value)}>
                        {WEAPON_TYPE_OPTIONS.filter((type) => type !== '全部类型').map((type) => <option value={type} key={type}>{type}</option>)}
                      </select>
                    ) : <span className="sheetDash">-</span>}
                  </td>
                  <td><TextCell value={item.name} onChange={(value) => updateEquipmentRow(index, 'name', value)} /></td>
                  <td>
                    <select value={item.quality || '金'} onChange={(event) => updateEquipmentRow(index, 'quality', event.target.value)}>
                      {Object.keys(QUALITY_COLORS).map((quality) => <option value={quality} key={quality}>{quality}</option>)}
                    </select>
                  </td>
                  <td><TextCell type="number" value={item.attackPower} onChange={(value) => updateEquipmentRow(index, 'attackPower', value)} /></td>
                  <td><TextCell type="number" value={item.ap} onChange={(value) => updateEquipmentRow(index, 'ap', value)} /></td>
                  <td><TextCell type="number" value={item.cd} onChange={(value) => updateEquipmentRow(index, 'cd', value)} /></td>
                  <td><TextCell type="number" value={item.defense} onChange={(value) => updateEquipmentRow(index, 'defense', value)} /></td>
                  <td><TextCell type="number" value={item.maxHp} onChange={(value) => updateEquipmentRow(index, 'maxHp', value)} /></td>
                  <td><TextCell type="number" value={item.sightRange} onChange={(value) => updateEquipmentRow(index, 'sightRange', value)} /></td>
                  <td><TextCell type="number" value={item.pen} onChange={(value) => updateEquipmentRow(index, 'pen', value)} /></td>
                  <td><TextCell type="number" step="0.01" value={item.penPct} onChange={(value) => updateEquipmentRow(index, 'penPct', value)} /></td>
                  <td><TextCell type="number" step="0.01" value={item.apPct} onChange={(value) => updateEquipmentRow(index, 'apPct', value)} /></td>
                  <td><TextCell type="number" step="0.01" value={item.dmgAmp} onChange={(value) => updateEquipmentRow(index, 'dmgAmp', value)} /></td>
                  <td><TextCell value={item.effect} onChange={(value) => updateEquipmentRow(index, 'effect', value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="sheetWrap">
          <table>
            <caption><LabelWithHelp note={help('table.skills')}>技能</LabelWithHelp></caption>
            <thead>
              <tr>
                <HeaderCell note={help('skill.hero')}>英雄</HeaderCell>
                <HeaderCell note={help('skill.title')}>技能</HeaderCell>
                <HeaderCell note={help('skill.bases')}>等级基础值</HeaderCell>
                <HeaderCell note={help('skill.maxLevel')}>最大等级</HeaderCell>
                <HeaderCell note={help('skill.formula')}>公式</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {skills.map((skill, index) => (
                <tr key={skill.id}>
                  <td><TextCell value={skill.hero} onChange={(value) => updateSkillRow(index, 'hero', value)} /></td>
                  <td><TextCell value={skill.title} onChange={(value) => updateSkillRow(index, 'title', value)} /></td>
                  <td><TextCell value={skill.bases} onChange={(value) => updateSkillRow(index, 'bases', value)} /></td>
                  <td><TextCell type="number" value={skill.maxLevel} onChange={(value) => updateSkillRow(index, 'maxLevel', value)} /></td>
                  <td><TextCell value={skill.formula} onChange={(value) => updateSkillRow(index, 'formula', value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="sheetWrap">
          <table>
            <caption><LabelWithHelp note={help('table.talents')}>潜能</LabelWithHelp></caption>
            <thead>
              <tr>
                <HeaderCell note={help('talent.slot')}>位置</HeaderCell>
                <HeaderCell note={help('talent.name')}>名称</HeaderCell>
                <HeaderCell note={help('talent.ap')}>法强</HeaderCell>
                <HeaderCell note={help('talent.pen')}>防穿</HeaderCell>
                <HeaderCell note={help('talent.penPct')}>防穿%</HeaderCell>
                <HeaderCell note={help('talent.dmgAmp')}>技伤</HeaderCell>
                <HeaderCell note={help('talent.note')}>说明</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {talents.map((talent, index) => (
                <tr key={talent.id}>
                  <td>
                    <select value={talent.slot} onChange={(event) => updateTalentRow(index, 'slot', event.target.value)}>
                      <option value="主天赋">主天赋</option>
                      <option value="副天赋">副天赋</option>
                    </select>
                  </td>
                  <td><TextCell value={talent.name} onChange={(value) => updateTalentRow(index, 'name', value)} /></td>
                  <td><TextCell type="number" value={talent.ap} onChange={(value) => updateTalentRow(index, 'ap', value)} /></td>
                  <td><TextCell type="number" value={talent.pen} onChange={(value) => updateTalentRow(index, 'pen', value)} /></td>
                  <td><TextCell type="number" step="0.01" value={talent.penPct} onChange={(value) => updateTalentRow(index, 'penPct', value)} /></td>
                  <td><TextCell type="number" step="0.01" value={talent.dmgAmp} onChange={(value) => updateTalentRow(index, 'dmgAmp', value)} /></td>
                  <td><TextCell value={talent.note} onChange={(value) => updateTalentRow(index, 'note', value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
