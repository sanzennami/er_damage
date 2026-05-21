import React, { useEffect, useMemo, useState } from 'react';
import ER_GAME_DATA from './data/erGameData.json';
import DEFAULT_HELP_NOTES from './data/helpNotes.json';
import ITEM_UNIQUE_EFFECTS from './data/itemUniqueEffects.json';
import DAK_LOADOUT_ASSETS from './data/dakLoadoutAssets.json';
import MASTERY_STATS from './data/masteryStats.json';

const APP_VERSION = 'v0.1.002';

const CHARACTER_IMAGE_URLS = import.meta.glob('../assets/characters/*.png', {
  eager: true,
  import: 'default',
  query: '?url'
});
const LOADOUT_IMAGE_URLS = import.meta.glob('../assets/loadout/**/*.png', {
  eager: true,
  import: 'default',
  query: '?url'
});

const QUALITY_COLORS = {
  普通: '#f6f2e8',
  高级: '#8de1ad',
  稀有: '#81caff',
  英雄: '#ccb6ff',
  传说: '#ffd56b',
  神话: '#ff6b6b',
  白: '#f6f2e8',
  绿: '#8de1ad',
  蓝: '#81caff',
  紫: '#ccb6ff',
  金: '#ffd56b',
  红: '#ff6b6b'
};
const QUALITY_RANK = {
  普通: 0,
  白: 0,
  高级: 1,
  绿: 1,
  稀有: 2,
  蓝: 2,
  英雄: 3,
  紫: 3,
  传说: 4,
  金: 4,
  神话: 5,
  红: 5
};
const QUALITY_OPTIONS = ['普通', '高级', '稀有', '英雄', '传说', '神话'];
const MASTERY_STAT_LABELS = {
  AttackPower: '攻击力',
  AttackSpeedRatio: '攻击速度',
  SkillAmpRatio: '技能增幅',
  IncreaseBasicAttackDamageRatio: '普攻增幅',
  PreventBasicAttackDamagedRatio: '承受普攻伤害减少',
  PreventSkillDamagedRatio: '承受技能伤害减少',
  AmplifierToMonsterRatio: '野怪伤害',
  MoveSpeed: '移动速度',
  SightRange: '视野',
  HpRegenRatioOutOfCombat: '非战斗体力再生'
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
const APP_SETTINGS_KEY = 'er-damage-global-settings-v1';
const HELP_NOTES_KEY = 'er-damage-help-notes-v1';
const HELP_NOTES_EDITABLE = typeof window !== 'undefined' && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
const HELP_NOTES_SAVE_ENDPOINT = '/api/help-notes';
const TRAIT_EFFECTS = {
  7000401: { ap: 18, summary: '满层时技能增幅 +18' },
  7010501: { dynamicDamage: 'burst', summary: '按双方体力差增加造成伤害' },
  7011101: { ap: 8, summary: '猎魂叠层预估：技能增幅 +8' },
  7011501: { extraEffect: 'scar', summary: '启用伤痕额外伤害估算' },
  7010701: { extraEffect: 'tear', summary: '启用伤口撕裂持续伤害估算' },
  7300201: { extraEffect: 'ghostFire', summary: '启用鬼火真实伤害估算' },
  7310101: { dmgAmp: 0.03, summary: '凝力预估：技能伤害 +3%' },
  7310301: { dmgAmp: 0.05, summary: '超频预估：技能伤害 +5%' },
  7211001: { ap: 6, summary: '狩猎的快感预估：技能增幅 +6' },
  7110101: { defense: 8, summary: '无惧感预估：防御 +8' },
  7111001: { maxHp: 120, summary: '镇痛剂预估：体力上限 +120' }
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
const ACTIVE_TRAIT_GROUPS = DAK_LOADOUT_ASSETS.traitGroups || [];
const ACTIVE_TRAITS = (DAK_LOADOUT_ASSETS.traits || [])
  .filter((trait) => trait.active && ['Core', 'Sub1', 'Sub2'].includes(trait.type))
  .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
const TRAIT_BY_ID = Object.fromEntries(ACTIVE_TRAITS.map((trait) => [String(trait.id), trait]));
const DEFAULT_TRAIT_SELECTION = {
  group: 'Havoc',
  core: '',
  sub1: '',
  sub2: '',
  secondaryGroup: 'Chaos',
  secondarySub1: '',
  secondarySub2: ''
};

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
  .map((skill, index) => ({
    id: skill.id,
    hero: skill.hero,
    title: skill.title,
    bases: skill.bases,
    formula: skill.formula,
    maxLevel: skill.maxLevel,
    source: skill.source,
    description: skill.description,
    coefficientText: skill.coefficientText,
    group: skill.group,
    skillId: skill.skillId,
    dataKey: skill.dataKey,
    updatedAt: skill.updatedAt || skill.updateDate || skill.updatedDate || skill.patch || '',
    sourceIndex: index
  }));
const INITIAL_SKILLS = dedupeSkillsByLatest([...DEFAULT_SKILLS, ...GENERATED_SKILLS]);
const DEFAULT_COMBOS = [
  { id: 'yumin-q3', hero: '俞岷', title: 'Q 三跳全中', note: '工作簿 Q*3', hits: { 'yumin-q': 3 } },
  { id: 'yumin-eq4', hero: '俞岷', title: 'EQ 四跳全中', note: '工作簿 EQ*4', hits: { 'yumin-eq': 4 } },
  { id: 'yumin-eqqw', hero: '俞岷', title: 'EQQW 全中', note: 'Q3 + EQ4 + E + W', hits: { 'yumin-q': 3, 'yumin-eq': 4, 'yumin-e': 1, 'yumin-w': 1 } }
];

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
  return dedupeSkillsByLatest([
    ...savedSkills,
    ...INITIAL_SKILLS.filter((skill) => !existingIds.has(skill.id))
  ]);
}

function normalizeCombo(combo) {
  const hits = Object.fromEntries(Object.entries(combo?.hits || {})
    .map(([skillId, count]) => [skillId, Math.max(0, getNumber(count))])
    .filter(([, count]) => count > 0));
  return {
    id: combo?.id || `combo-${Date.now()}`,
    hero: combo?.hero || '俞岷',
    title: combo?.title || combo?.name || '新连段',
    note: combo?.note || '',
    hits
  };
}

function mergeCombos(savedCombos) {
  return Array.isArray(savedCombos) ? savedCombos.map(normalizeCombo) : clone(DEFAULT_COMBOS);
}

function skillVersionTime(skill) {
  const value = skill?.updatedAt || skill?.updateDate || skill?.updatedDate || skill?.patch || skill?.version || '';
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return parsed;
  const numeric = String(value).match(/\d+(?:\.\d+)*/)?.[0];
  return numeric ? Number(numeric.replace(/\./g, '').padEnd(8, '0')) : 0;
}

function skillDedupeKey(skill) {
  return [
    skill.hero || '',
    skill.group || '',
    skill.skillId || '',
    skill.dataKey || '',
    skill.title || ''
  ].join('|');
}

function dedupeSkillsByLatest(skills) {
  const latest = new Map();
  skills.forEach((skill, index) => {
    const key = skillDedupeKey(skill);
    const current = latest.get(key);
    const nextTime = skillVersionTime(skill);
    const currentTime = current ? skillVersionTime(current.skill) : -1;
    if (!current || nextTime > currentTime || (nextTime === currentTime && index > current.index)) {
      latest.set(key, { skill, index });
    }
  });
  return Array.from(latest.values())
    .sort((a, b) => a.index - b.index)
    .map(({ skill }) => skill);
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

function qualityColor(quality) {
  return QUALITY_COLORS[quality] || QUALITY_COLORS.普通;
}

function qualityRank(quality) {
  return QUALITY_RANK[quality] ?? 0;
}

function compareEquipmentForSelect(left, right) {
  const qualityDelta = qualityRank(left?.quality) - qualityRank(right?.quality);
  if (qualityDelta !== 0) return qualityDelta;

  const typeDelta = String(left?.weaponType || '').localeCompare(String(right?.weaponType || ''), 'zh-Hans-CN');
  if (typeDelta !== 0) return typeDelta;

  return String(left?.name || '').localeCompare(String(right?.name || ''), 'zh-Hans-CN');
}

function sortEquipmentForSelect(items) {
  return [...items].sort(compareEquipmentForSelect);
}

function shouldShowInBuilder(item, showLowerTierEquipment) {
  return showLowerTierEquipment || qualityRank(item?.quality) >= qualityRank('英雄');
}

function normalizeUniqueEffect(effect) {
  const text = String(effect || '').trim();
  if (!text) return '';
  if (text === '减疗' || text === '减少治愈' || text === '减少治疗') return '减少治疗（20%）';
  return text;
}

function uniqueEffectsForItem(item) {
  const mappedEffects = ITEM_UNIQUE_EFFECTS.effectsByCode?.[String(item?.code)]
    || ITEM_UNIQUE_EFFECTS.effectsByName?.[item?.name]
    || [];
  const fallbackEffects = String(item?.effect || '')
    .split(',')
    .map(normalizeUniqueEffect)
    .filter(Boolean);

  return [...new Set([...mappedEffects, ...fallbackEffects].map(normalizeUniqueEffect).filter(Boolean))];
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
      talents: Array.isArray(saved?.talents) ? saved.talents : clone(DEFAULT_TALENTS),
      combos: mergeCombos(saved?.combos)
    };
  } catch {
    return { equipment: clone(INITIAL_EQUIPMENT), skills: clone(INITIAL_SKILLS), talents: clone(DEFAULT_TALENTS), combos: clone(DEFAULT_COMBOS) };
  }
}

function loadAppSettings() {
  try {
    return JSON.parse(window.localStorage.getItem(APP_SETTINGS_KEY)) || {};
  } catch {
    return {};
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

async function persistHelpNotes(notes) {
  const response = await fetch(HELP_NOTES_SAVE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || '保存失败');
  }
}

function characterImageSrc(character) {
  if (!character?.image) return '';
  const imageName = character.image.split('/').pop();
  const match = Object.entries(CHARACTER_IMAGE_URLS).find(([path]) => path.endsWith(`/${imageName}`));
  return match?.[1] || character.image;
}

function loadoutImageSrc(source) {
  if (!source) return '';
  const normalized = source.replace(/^\/assets\/loadout\//, '../assets/loadout/');
  return LOADOUT_IMAGE_URLS[normalized] || source;
}

function weaponTypeRaw(item) {
  if (item?.weaponTypeRaw) return item.weaponTypeRaw;
  return String(item?.weaponType || '').split('/').pop()?.trim() || '';
}

function weaponTypeFromFilter(type) {
  if (!type || type === '全部类型') return '';
  return String(type).split('/').pop()?.trim() || '';
}

function weaponTypeLabelForRaw(rawType) {
  if (!rawType) return '全部类型';
  return WEAPON_TYPE_OPTIONS.find((type) => weaponTypeFromFilter(type) === rawType) || '全部类型';
}

function weaponTypeOfficialName(rawType) {
  if (!rawType) return '未设置';
  const label = WEAPON_TYPE_OPTIONS.find((type) => weaponTypeFromFilter(type) === rawType);
  return label ? label.split('/')[0].trim() : rawType;
}

function weaponTypeOfficialList(rawTypes) {
  const names = (rawTypes || []).map(weaponTypeOfficialName).filter(Boolean);
  return names.length ? names.join('、') : '未设置武器';
}

function masteryStatFor(characterCode, weaponRawType) {
  return MASTERY_STATS.find((item) => item.characterCode === characterCode && item.type === weaponRawType) || null;
}

function masteryOptionValue(masteryStat, stat) {
  return getNumber(masteryStat?.options?.find((option) => option.stat === stat)?.value);
}

function masterySummary(masteryStat) {
  return (masteryStat?.options || []).map((option) => {
    const label = MASTERY_STAT_LABELS[option.stat] || option.stat;
    const value = String(option.stat).includes('Ratio') ? pct(option.value) : `+${round(option.value, 3)}`;
    return `${label} ${value}/级`;
  });
}

function traitsBySlot(group, type) {
  return ACTIVE_TRAITS.filter((trait) => trait.group === group && trait.type === type);
}

function selectedTraitsFrom(selection) {
  return [
    selection.core,
    selection.sub1,
    selection.sub2,
    selection.secondarySub1,
    selection.secondarySub2
  ].map((id) => TRAIT_BY_ID[String(id)]).filter(Boolean);
}

function traitBonusesFor(traits, burstBonus = 0) {
  return traits.reduce((bonus, trait) => {
    const effect = TRAIT_EFFECTS[trait.id] || {};
    return {
      ap: bonus.ap + getNumber(effect.ap),
      pen: bonus.pen + getNumber(effect.pen),
      penPct: bonus.penPct + getNumber(effect.penPct),
      dmgAmp: bonus.dmgAmp + getNumber(effect.dmgAmp) + (effect.dynamicDamage === 'burst' ? burstBonus : 0),
      defense: bonus.defense + getNumber(effect.defense),
      maxHp: bonus.maxHp + getNumber(effect.maxHp),
      effectIds: effect.extraEffect ? [...bonus.effectIds, effect.extraEffect] : bonus.effectIds,
      summaries: effect.summary ? [...bonus.summaries, `${trait.name}: ${effect.summary}`] : bonus.summaries
    };
  }, { ap: 0, pen: 0, penPct: 0, dmgAmp: 0, defense: 0, maxHp: 0, effectIds: [], summaries: [] });
}

function normalizeTraitSelection(selection) {
  const primaryGroup = selection.group || ACTIVE_TRAIT_GROUPS[0]?.key || '';
  const secondaryGroup = selection.secondaryGroup || ACTIVE_TRAIT_GROUPS.find((group) => group.key !== primaryGroup)?.key || primaryGroup;
  return {
    group: primaryGroup,
    core: traitsBySlot(primaryGroup, 'Core').some((trait) => String(trait.id) === String(selection.core))
      ? String(selection.core)
      : '',
    sub1: traitsBySlot(primaryGroup, 'Sub1').some((trait) => String(trait.id) === String(selection.sub1))
      ? String(selection.sub1)
      : '',
    sub2: traitsBySlot(primaryGroup, 'Sub2').some((trait) => String(trait.id) === String(selection.sub2))
      ? String(selection.sub2)
      : '',
    secondaryGroup,
    secondarySub1: traitsBySlot(secondaryGroup, 'Sub1').some((trait) => String(trait.id) === String(selection.secondarySub1))
      ? String(selection.secondarySub1)
      : '',
    secondarySub2: traitsBySlot(secondaryGroup, 'Sub2').some((trait) => String(trait.id) === String(selection.secondarySub2))
      ? String(selection.secondarySub2)
      : ''
  };
}

function traitBonusSummaryItems(bonuses) {
  return [
    bonuses.ap ? `法强 +${round(bonuses.ap, 1)}` : '',
    bonuses.pen ? `防穿 +${round(bonuses.pen, 1)}` : '',
    bonuses.penPct ? `防穿 ${pct(bonuses.penPct)}` : '',
    bonuses.dmgAmp ? `技伤 +${pct(bonuses.dmgAmp)}` : '',
    bonuses.defense ? `防御 +${round(bonuses.defense, 1)}` : '',
    bonuses.maxHp ? `生命 +${round(bonuses.maxHp, 1)}` : ''
  ].filter(Boolean);
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
  masteryStat,
  attack,
  talentAp,
  traitBonuses = {},
  selectedTraits = [],
  target,
  selfHp,
  damageBonus,
  skillReduction,
  r2Stacks,
  burstFollowUp,
  vampireFull,
  blazingFull,
  selectedHero,
  combos = []
}) {
  const selected = SLOTS.map((slot) => byName(equipment, gear[slot])).filter(Boolean);
  const equipmentStats = aggregateEquipmentStats(selected);
  const talentBonusAp = getNumber(traitBonuses.ap);
  const talentPen = getNumber(traitBonuses.pen);
  const talentPenPct = getNumber(traitBonuses.penPct);
  const talentDamageBonus = getNumber(traitBonuses.dmgAmp);
  const equipAp = statValue(equipmentStats, 'skillAmp') + statValue(equipmentStats, 'adaptiveForce') || selected.reduce((sum, item) => sum + getNumber(item.ap), 0);
  const equipAttackPower = statValue(equipmentStats, 'attackPower');
  const stackAp = (vampireFull ? 18 : 0) + (blazingFull ? 24 : 0);
  const cd = statValue(equipmentStats, 'cooldownReduction') || selected.reduce((sum, item) => sum + getNumber(item.cd), 0);
  const pen = statValue(equipmentStats, 'penetrationDefense') + statValue(equipmentStats, 'uniquePenetrationDefense') + talentPen || selected.reduce((sum, item) => sum + getNumber(item.pen), 0) + talentPen;
  const penPct = statValue(equipmentStats, 'penetrationDefenseRatio') + statValue(equipmentStats, 'uniquePenetrationDefenseRatio') + talentPenPct || selected.reduce((sum, item) => sum + getNumber(item.penPct), 0) + talentPenPct;
  const equipDefense = (statValue(equipmentStats, 'defense') || selected.reduce((sum, item) => sum + getNumber(item.defense), 0)) + getNumber(traitBonuses.defense);
  const normalApPct = statValue(equipmentStats, 'skillAmpRatio') + selected.reduce((sum, item) => sum + (item.uniqueApPct ? 0 : getNumber(item.apPct)), 0);
  const uniqueApPct = Math.max(statValue(equipmentStats, 'uniqueSkillAmpRatio'), ...selected.filter((item) => item.uniqueApPct).map((item) => getNumber(item.apPct)));
  const equipDamageBonus = selected.reduce((sum, item) => sum + getNumber(item.dmgAmp), 0);
  const masteryApPct = mastery * masteryOptionValue(masteryStat, 'SkillAmpRatio');
  const masteryAttackPower = mastery * masteryOptionValue(masteryStat, 'AttackPower');
  const totalApPct = normalApPct + uniqueApPct + masteryApPct;
  const apRaw = (equipAp + talentAp + talentBonusAp + stackAp) * (1 + totalApPct);
  const ap = Math.floor(apRaw);
  const finalDefense = target.defense * (1 - target.defenseReduction) * (1 - penPct) - pen;
  const defenseMod = 100 / (100 + finalDefense);
  const totalDamageBonus = damageBonus + equipDamageBonus + talentDamageBonus;
  const damageMod = 1 + totalDamageBonus - target.reduction - skillReduction;
  const finalMod = defenseMod * damageMod;
  const stackCount = Math.min(4, Math.max(0, r2Stacks));
  const context = { ap, attack: attack + equipAttackPower + masteryAttackPower, targetHp: target.hp, stacks: stackCount, finalMod };
  const heroSkills = skillTable
    .filter((skill) => skill.hero === selectedHero)
    .map((skill) => calculateSkill(skill, skillLevels[skill.id], context));
  const hpDiffRatio = Math.min(0.4, Math.max(0.1, (target.hp - selfHp) / selfHp));
  const burstBonus = Math.min(0.1, Math.max(0, (target.hp - selfHp) / selfHp) * 0.25);
  const curse = 50 + ap * 0.15;
  const scarBase = 10 + 20 + target.hp * 0.03;
  const tearBase = 50 + target.hp * 0.7 * 0.08;
  const activeTraitEffectIds = new Set(traitBonuses.effectIds || []);
  const effects = [
    activeTraitEffectIds.has('scar')
      ? { title: '伤痕(技)', raw: scarBase, value: scarBase * finalMod, note: '10+20+目标血量*3%' }
      : null,
    activeTraitEffectIds.has('tear')
      ? { title: '伤口撕裂', raw: tearBase, value: tearBase * finalMod, note: '以触发时70%血计算' }
      : null
  ].filter(Boolean);
  const ghostFire = 250 + ap * 0.2;
  const repelF = 5 * (10 + mastery) + target.hp * 0.006 + (burstFollowUp ? 3 * (10 + mastery) : 0);
  if (activeTraitEffectIds.has('ghostFire')) {
    effects.push({ title: '鬼火(真伤)', raw: ghostFire, value: ghostFire, note: '250 + 法强 * 20%' });
  }
  const effectSubtotalRaw = effects.reduce((sum, effect) => sum + effect.raw, 0);
  const effectSubtotal = effects.reduce((sum, effect) => sum + effect.value, 0);
  const comboSkills = skillTable
    .filter((skill) => skill.hero === selectedHero)
    .map((skill) => calculateSkill(skill, skillLevels[skill.id], context));
  const comboDamage = Object.fromEntries(comboSkills.map((skill) => [skill.id, skill.damage]));
  const comboRows = combos
    .filter((combo) => combo.hero === selectedHero)
    .map((combo) => {
      const hitEntries = Object.entries(combo.hits || {}).filter(([, count]) => getNumber(count) > 0);
      const value = hitEntries.reduce((sum, [skillId, count]) => sum + getNumber(comboDamage[skillId]) * getNumber(count), 0);
      const hitNote = hitEntries.map(([skillId, count]) => {
        const skill = comboSkills.find((item) => item.id === skillId);
        return `${skill?.title || skillId} x${getNumber(count)}`;
      }).join(' + ');
      return { ...combo, value, note: combo.note || hitNote };
    })
    .filter((combo) => Object.values(combo.hits || {}).some((count) => getNumber(count) > 0));
  const extraHeroGroups = [];

  return {
    selected,
    equipmentStats,
    equipAp,
    equipAttackPower,
    masteryAttackPower,
    talentAp,
    talentBonusAp,
    stackAp,
    selectedTalents: selectedTraits,
    traitBonuses,
    cd,
    pen,
    penPct,
    equipDefense,
    normalApPct,
    uniqueApPct,
    masteryApPct,
    masteryStat,
    totalApPct,
    ap,
    apRaw,
    finalDefense,
    defenseMod,
    equipDamageBonus,
    talentDamageBonus,
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
    comboRows,
    extraHeroGroups
  };
}

function HelpNote({ note, editable, onChange, onSave, saveStatus, dirty }) {
  if (!note) return null;

  return (
    <span className="helpNote">
      <button type="button" className="helpButton" aria-label="查看说明">?</button>
      <span className="helpPopover" role="tooltip">
        {editable ? (
          <>
            <textarea
              value={note}
              onChange={(event) => onChange(event.target.value)}
              aria-label="编辑帮助说明"
            />
            <button type="button" className="helpSaveButton" onClick={onSave} disabled={!dirty || saveStatus === 'saving'}>
              {saveStatus === 'saving' ? '保存中' : '保存到本地'}
            </button>
            <small>{saveStatus === 'saved' ? '已写入 src/data/helpNotes.json，下次提交会一起 push。' : '本地可编辑，点击保存写入项目文件。'}</small>
            {saveStatus === 'error' ? <small className="helpSaveError">保存失败，请确认正在使用本地 Vite 服务。</small> : null}
          </>
        ) : (
          <>
            <span>{note}</span>
            <small>发布版本只读。</small>
          </>
        )}
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

const SKILL_MAIN_SLOTS = ['Q', 'W', 'E', 'R'];
const MULTI_TARGET_MAX = 10;

function skillMainSlot(skill) {
  const title = String(skill?.title || '').toUpperCase().trim();
  if (title.startsWith('EQ')) return 'Q';
  if (title.startsWith('EW')) return 'W';
  const match = title.match(/[QWER]/);
  return match?.[0] || 'Q';
}

function skillTargetCount(counts, key) {
  return Math.max(1, Math.min(MULTI_TARGET_MAX, getNumber(counts[key]) || 1));
}

function groupSkillRows(skills) {
  return Object.values(skills.reduce((groups, skill) => {
    const key = skill.title.replace(/\s*(一段|二段|三段|每跳|带叠层|\/额外|\+\s*10%目标血).*$/, '').trim() || skill.title;
    groups[key] = [...(groups[key] || []), skill];
    return groups;
  }, {}));
}

function characterAttackAtLevel(character, level = 20) {
  if (!character) return 0;
  return Math.floor(getNumber(character.base?.attackPower) + getNumber(character.growth?.attackPower) * Math.max(0, level - 1));
}

export default function App() {
  const [{ equipment, skills, talents, combos }, setConfig] = useState(loadConfig);
  const [gear, setGear] = useState(DEFAULT_GEAR);
  const [weaponTypeFilter, setWeaponTypeFilter] = useState('全部类型');
  const [selectedHero, setSelectedHero] = useState('俞岷');
  const [mastery, setMastery] = useState(20);
  const [talentAp, setTalentAp] = useState(0);
  const [traitSelection, setTraitSelection] = useState(() => normalizeTraitSelection(DEFAULT_TRAIT_SELECTION));
  const [targetIndex, setTargetIndex] = useState(0);
  const [target, setTarget] = useState(TARGETS[0]);
  const [selfHp, setSelfHp] = useState(2514);
  const [damageBonus, setDamageBonus] = useState(0);
  const [skillReduction, setSkillReduction] = useState(0);
  const [r2Stacks, setR2Stacks] = useState(1);
  const [burstFollowUp, setBurstFollowUp] = useState(true);
  const [vampireFull, setVampireFull] = useState(false);
  const [blazingFull, setBlazingFull] = useState(false);
  const [showBuildSettings, setShowBuildSettings] = useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [effectsCollapsed, setEffectsCollapsed] = useState(false);
  const [skillTargetCounts, setSkillTargetCounts] = useState({});
  const [useHeroAvatarPicker, setUseHeroAvatarPicker] = useState(() => Boolean(loadAppSettings().useHeroAvatarPicker));
  const [showLowerTierEquipment, setShowLowerTierEquipment] = useState(false);
  const [visibleStatKeys, setVisibleStatKeys] = useState(DEFAULT_VISIBLE_STAT_KEYS);
  const [skillLevels, setSkillLevels] = useState(() => Object.fromEntries(INITIAL_SKILLS.map((skill) => [skill.id, skill.maxLevel])));
  const [helpNotes, setHelpNotes] = useState(loadHelpNotes);
  const [helpNotesDirty, setHelpNotesDirty] = useState(false);
  const [helpNotesSaveStatus, setHelpNotesSaveStatus] = useState('idle');

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ equipment, skills, talents, combos }));
  }, [equipment, skills, talents, combos]);

  useEffect(() => {
    window.localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify({ useHeroAvatarPicker }));
  }, [useHeroAvatarPicker]);

  useEffect(() => {
    if (HELP_NOTES_EDITABLE) {
      window.localStorage.setItem(HELP_NOTES_KEY, JSON.stringify(helpNotes));
    }
  }, [helpNotes]);

  function updateHelpNote(key, value) {
    if (!HELP_NOTES_EDITABLE) return;
    setHelpNotes((current) => ({ ...current, [key]: value }));
    setHelpNotesDirty(true);
    setHelpNotesSaveStatus('idle');
  }

  async function saveHelpNotes() {
    if (!HELP_NOTES_EDITABLE) return;

    setHelpNotesSaveStatus('saving');
    try {
      await persistHelpNotes(helpNotes);
      window.localStorage.removeItem(HELP_NOTES_KEY);
      setHelpNotesDirty(false);
      setHelpNotesSaveStatus('saved');
    } catch {
      setHelpNotesSaveStatus('error');
    }
  }

  function help(key) {
    return (
      <HelpNote
        note={helpNotes[key] || DEFAULT_HELP_NOTES[key]}
        editable={HELP_NOTES_EDITABLE}
        onChange={(value) => updateHelpNote(key, value)}
        onSave={saveHelpNotes}
        saveStatus={helpNotesSaveStatus}
        dirty={helpNotesDirty}
      />
    );
  }

  useEffect(() => {
    setTraitSelection((current) => {
      const normalized = normalizeTraitSelection(current);
      return JSON.stringify(normalized) === JSON.stringify(current) ? current : normalized;
    });
  }, []);

  const selectedTraits = useMemo(() => selectedTraitsFrom(traitSelection), [traitSelection]);
  const estimatedBurstBonus = Math.min(0.1, Math.max(0, (target.hp - selfHp) / selfHp) * 0.25);
  const traitBonuses = useMemo(
    () => traitBonusesFor(selectedTraits, estimatedBurstBonus),
    [selectedTraits, estimatedBurstBonus]
  );
  const selectedCharacter = ER_GAME_DATA.characters.find((character) => character.name === selectedHero);
  const selectedOfficialSkillGroups = ER_GAME_DATA.rawSkillGroups.filter((skill) => skill.hero === selectedHero);
  const heroPickerOptions = HEROES.map((hero) => ({
    name: hero,
    character: ER_GAME_DATA.characters.find((character) => character.name === hero)
  }));
  const allowedWeaponTypes = new Set(selectedCharacter?.weapons || []);
  const selectedWeaponRaw = weaponTypeFilter !== '全部类型'
    ? weaponTypeFromFilter(weaponTypeFilter)
    : weaponTypeRaw(byName(equipment, gear['武器']));
  const selectedMasteryStat = masteryStatFor(selectedCharacter?.code, selectedWeaponRaw);
  const selectedMasterySummary = masterySummary(selectedMasteryStat);
  const attack = characterAttackAtLevel(selectedCharacter);

  const result = useMemo(
    () => calc({
      equipment,
      skillTable: skills,
      skillLevels,
      gear,
      mastery,
      masteryStat: selectedMasteryStat,
      attack,
      talentAp,
      traitBonuses,
      selectedTraits,
      target,
      selfHp,
      damageBonus,
      skillReduction,
      r2Stacks,
      burstFollowUp,
      vampireFull,
      blazingFull,
      selectedHero,
      combos
    }),
    [equipment, skills, skillLevels, gear, mastery, selectedMasteryStat, attack, talentAp, traitBonuses, selectedTraits, target, selfHp, damageBonus, skillReduction, r2Stacks, burstFollowUp, vampireFull, blazingFull, selectedHero, combos]
  );
  const heroWeaponOptions = WEAPON_TYPE_OPTIONS.filter((type) => {
    if (type === '全部类型') return true;
    const rawType = weaponTypeFromFilter(type);
    return !allowedWeaponTypes.size || allowedWeaponTypes.has(rawType);
  });
  const builderEquipment = sortEquipmentForSelect(equipment.filter((item) => shouldShowInBuilder(item, showLowerTierEquipment)));
  const weaponChoices = sortEquipmentForSelect(equipment.filter((item) => (
    item.type === '武器'
    && shouldShowInBuilder(item, showLowerTierEquipment)
    && (!allowedWeaponTypes.size || allowedWeaponTypes.has(weaponTypeRaw(item)))
    && (weaponTypeFilter === '全部类型' || item.weaponType === weaponTypeFilter)
  )));
  const builderChoicesBySlot = Object.fromEntries(SLOTS.map((slot) => [
    slot,
    slot === '武器' ? weaponChoices : builderEquipment.filter((item) => item.type === slot)
  ]));
  const visibleEquipmentStats = visibleStatKeys
    .map((key) => ({ ...ITEM_STAT_BY_KEY[key], key, value: statValue(result.equipmentStats, key) }))
    .filter((stat) => stat.label && stat.value !== 0);
  const activeEquipmentStats = ITEM_STAT_DEFINITIONS
    .map((stat) => ({ ...stat, value: statValue(result.equipmentStats, stat.key) }))
    .filter((stat) => stat.value !== 0);
  const selectedEquipmentEffectsRaw = result.selected.flatMap((item) => (
    uniqueEffectsForItem(item).map((effect) => ({ slot: item.type, name: item.name, quality: item.quality, effect }))
  ));
  const selectedEquipmentEffectCounts = selectedEquipmentEffectsRaw.reduce((counts, item) => {
    counts[item.effect] = (counts[item.effect] || 0) + 1;
    return counts;
  }, {});
  const selectedEquipmentEffects = selectedEquipmentEffectsRaw.map((item) => ({
    ...item,
    duplicateCount: selectedEquipmentEffectCounts[item.effect] || 0
  }));

  useEffect(() => {
    const nextRawType = selectedCharacter?.weapons?.[0];
    if (!nextRawType) return;

    const nextFilter = weaponTypeLabelForRaw(nextRawType);
    setWeaponTypeFilter(nextFilter);

    const nextWeapon = equipment.find((item) => (
      item.type === '武器'
      && weaponTypeRaw(item) === nextRawType
      && shouldShowInBuilder(item, showLowerTierEquipment)
    )) || equipment.find((item) => item.type === '武器' && weaponTypeRaw(item) === nextRawType);
    if (nextWeapon) updateGear('武器', nextWeapon.name);
  }, [selectedHero]);

  useEffect(() => {
    if (weaponTypeFilter !== '全部类型' && !heroWeaponOptions.includes(weaponTypeFilter)) {
      setWeaponTypeFilter(weaponTypeLabelForRaw(selectedCharacter?.weapons?.[0]));
      return;
    }

    const currentWeapon = byName(equipment, gear['武器']);
    if (
      currentWeapon
      && shouldShowInBuilder(currentWeapon, showLowerTierEquipment)
      && (!allowedWeaponTypes.size || allowedWeaponTypes.has(weaponTypeRaw(currentWeapon)))
      && (weaponTypeFilter === '全部类型' || currentWeapon.weaponType === weaponTypeFilter)
    ) return;

    const nextWeapon = weaponChoices[0] || equipment.find((item) => item.type === '武器');
    if (nextWeapon) updateGear('武器', nextWeapon.name);
  }, [selectedHero, equipment, gear['武器'], weaponTypeFilter, showLowerTierEquipment]);

  useEffect(() => {
    SLOTS.filter((slot) => slot !== '武器').forEach((slot) => {
      const currentItem = byName(equipment, gear[slot]);
      if (currentItem && shouldShowInBuilder(currentItem, showLowerTierEquipment)) return;

      const nextItem = builderChoicesBySlot[slot]?.[0] || equipment.find((item) => item.type === slot);
      if (nextItem) updateGear(slot, nextItem.name);
    });
  }, [equipment, gear, showLowerTierEquipment]);

  function updateGear(slot, name) {
    setGear((current) => ({ ...current, [slot]: name }));
  }

  function updateWeaponType(type) {
    setWeaponTypeFilter(type);
    if (type === '全部类型') return;

    const match = equipment.find((item) => (
      item.type === '武器'
      && shouldShowInBuilder(item, showLowerTierEquipment)
      && item.weaponType === type
      && (!allowedWeaponTypes.size || allowedWeaponTypes.has(weaponTypeRaw(item)))
    ));
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

  function updateSkillSlotLevel(slot, level) {
    setSkillLevels((current) => ({
      ...current,
      ...Object.fromEntries(result.skills
        .filter((skill) => skillMainSlot(skill) === slot)
        .map((skill) => [skill.id, level]))
    }));
  }

  function updateSkillTargetCount(key, value) {
    setSkillTargetCounts((current) => ({
      ...current,
      [key]: Math.max(1, Math.min(MULTI_TARGET_MAX, getNumber(value) || 1))
    }));
  }

  function pickTraitGroup(area, groupKey) {
    setTraitSelection((current) => {
      if (area === 'primary') {
        return normalizeTraitSelection({ ...current, group: groupKey, core: '', sub1: '', sub2: '' });
      }
      return normalizeTraitSelection({ ...current, secondaryGroup: groupKey, secondarySub1: '', secondarySub2: '' });
    });
  }

  function pickTrait(slot, id) {
    setTraitSelection((current) => {
      const nextId = String(current[slot]) === String(id) ? '' : String(id);
      return normalizeTraitSelection({ ...current, [slot]: nextId });
    });
  }

  function clearTraitSelection() {
    setTraitSelection((current) => normalizeTraitSelection({
      ...current,
      core: '',
      sub1: '',
      sub2: '',
      secondarySub1: '',
      secondarySub2: ''
    }));
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

  function updateComboRow(index, key, value) {
    setConfig((current) => ({
      ...current,
      combos: current.combos.map((combo, rowIndex) => (
        rowIndex === index ? { ...combo, [key]: value } : combo
      ))
    }));
  }

  function updateComboHit(index, skillId, delta) {
    setConfig((current) => ({
      ...current,
      combos: current.combos.map((combo, rowIndex) => {
        if (rowIndex !== index) return combo;
        const hits = { ...(combo.hits || {}) };
        const next = Math.max(0, getNumber(hits[skillId]) + delta);
        if (next) {
          hits[skillId] = next;
        } else {
          delete hits[skillId];
        }
        return { ...combo, hits };
      })
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
      talents,
      combos
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
      talents,
      combos
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
      }],
      combos
    });
  }

  function addCombo() {
    setConfig({
      equipment,
      skills,
      talents,
      combos: [...combos, {
        id: `combo-${Date.now()}`,
        hero: selectedHero,
        title: '新连段',
        note: '',
        hits: {}
      }]
    });
  }

  function resetConfig() {
    setConfig({ equipment: clone(INITIAL_EQUIPMENT), skills: clone(INITIAL_SKILLS), talents: clone(DEFAULT_TALENTS), combos: clone(DEFAULT_COMBOS) });
    setSkillLevels(Object.fromEntries(INITIAL_SKILLS.map((skill) => [skill.id, skill.maxLevel])));
    setTalentAp(0);
    setTraitSelection(normalizeTraitSelection(DEFAULT_TRAIT_SELECTION));
  }

  const traitSummaryItems = traitBonusSummaryItems(result.traitBonuses);
  const primaryGroup = ACTIVE_TRAIT_GROUPS.find((group) => group.key === traitSelection.group);
  const secondaryGroup = ACTIVE_TRAIT_GROUPS.find((group) => group.key === traitSelection.secondaryGroup);
  const traitSelectionSlots = [
    { key: 'core', title: '核心潜能', group: traitSelection.group, type: 'Core' },
    { key: 'sub1', title: '主系一栏', group: traitSelection.group, type: 'Sub1' },
    { key: 'sub2', title: '主系二栏', group: traitSelection.group, type: 'Sub2' },
    { key: 'secondarySub1', title: '副系一栏', group: traitSelection.secondaryGroup, type: 'Sub1' },
    { key: 'secondarySub2', title: '副系二栏', group: traitSelection.secondaryGroup, type: 'Sub2' }
  ];

  function renderTraitGroupTabs(area, activeKey) {
    return (
      <div className="traitGroupTabs">
        {ACTIVE_TRAIT_GROUPS.map((group) => (
          <button
            type="button"
            className={`traitGroupButton ${activeKey === group.key ? 'active' : ''}`}
            onClick={() => pickTraitGroup(area, group.key)}
            title={group.tooltip || group.name}
            key={`${area}-${group.key}`}
          >
            <img src={loadoutImageSrc(group.image)} alt="" />
            <span>{group.name}</span>
          </button>
        ))}
      </div>
    );
  }

  function renderTraitLane(slot) {
    const options = traitsBySlot(slot.group, slot.type);
    return (
      <div className="traitLane" key={slot.key}>
        <div className="traitLaneHead">
          <strong>{slot.title}</strong>
          <span>{TRAIT_BY_ID[traitSelection[slot.key]]?.name || '未选择'}</span>
        </div>
        <div className="traitGrid">
          {options.map((trait) => (
            <button
              type="button"
              className={`traitButton ${String(trait.id) === String(traitSelection[slot.key]) ? 'active' : ''}`}
              onClick={() => pickTrait(slot.key, trait.id)}
              title={trait.tooltip || trait.name}
              key={`${slot.key}-${trait.id}`}
            >
              <img className="traitIcon" src={loadoutImageSrc(trait.image)} alt="" />
              <span>{trait.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderComboSkillPicker(combo, comboIndex) {
    const heroSkills = skills.filter((skill) => skill.hero === combo.hero);
    if (!heroSkills.length) return <span className="sheetDash">请先配置该英雄技能</span>;

    return (
      <div className="comboHitEditor">
        {heroSkills.map((skill) => {
          const count = getNumber(combo.hits?.[skill.id]);
          return (
            <div className={`comboHitChip ${count ? 'active' : ''}`} key={`${combo.id}-${skill.id}`}>
              <span>{skill.title}</span>
              <button type="button" onClick={() => updateComboHit(comboIndex, skill.id, -1)}>-</button>
              <b>{count}</b>
              <button type="button" onClick={() => updateComboHit(comboIndex, skill.id, 1)}>+</button>
            </div>
          );
        })}
      </div>
    );
  }

  function renderTargetStepper(key) {
    const count = skillTargetCount(skillTargetCounts, key);
    return (
      <div className="targetStepper">
        <span>命中目标</span>
        <button type="button" onClick={() => updateSkillTargetCount(key, count - 1)}>-</button>
        <b>{count}</b>
        <button type="button" onClick={() => updateSkillTargetCount(key, count + 1)}>+</button>
      </div>
    );
  }

  function renderSkillDamageLeaf(skill, label, options = {}) {
    const targetKey = options.targetKey || skill.id;
    const count = skillTargetCount(skillTargetCounts, targetKey);
    const primaryRaw = getNumber(options.primaryRaw ?? skill.rawDamage);
    const primaryFinal = getNumber(options.primaryFinal ?? skill.damage);
    const secondaryRaw = getNumber(options.secondaryRaw ?? primaryRaw);
    const secondaryFinal = getNumber(options.secondaryFinal ?? primaryFinal);
    const totalRaw = primaryRaw + secondaryRaw * Math.max(0, count - 1);
    const totalFinal = primaryFinal + secondaryFinal * Math.max(0, count - 1);

    return (
      <div className="skillDamageLeaf" key={targetKey}>
        <div className="skillLeafHead">
          <strong>{label}</strong>
          {renderTargetStepper(targetKey)}
        </div>
        <div className="skillLeafValues">
          {options.showBreakdown ? (
            <>
              <div>
                <span>主要目标</span>
                <DamageValue raw={primaryRaw} final={primaryFinal} />
              </div>
              <div>
                <span>次要目标</span>
                <DamageValue raw={secondaryRaw} final={secondaryFinal} />
              </div>
            </>
          ) : null}
          <div className="skillTotalValue">
            <span>{count > 1 ? `${count} 目标总计` : '单目标'}</span>
            <DamageValue raw={totalRaw} final={totalFinal} />
          </div>
        </div>
      </div>
    );
  }

  function renderSkillMainColumn(slot) {
    const slotSkills = result.skills.filter((skill) => skillMainSlot(skill) === slot);
    const levelValue = slotSkills[0] ? skillLevels[slotSkills[0].id] : 1;

    return (
      <div className="skillMainColumn" key={slot}>
        <div className="skillMainHead">
          <strong>{slot}</strong>
          {slotSkills.length ? (
            <div className="levelSelect">
              <span>Lv.</span>
              <select value={levelValue} onChange={(event) => updateSkillSlotLevel(slot, getNumber(event.target.value))}>
                {Array.from({ length: slotSkills[0].maxLevel }, (_, index) => index + 1).map((level) => (
                  <option value={level} key={level}>{level}</option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
        {slotSkills.length ? (
          <div className="skillSubGrid">
            {slotSkills.map((skill) => {
              if (selectedHero === '俞岷' && skill.id === 'yumin-q') {
                return renderSkillDamageLeaf(skill, '普通Q（三段）', {
                  targetKey: `${skill.id}-targets`,
                  primaryRaw: skill.rawDamage * 3,
                  primaryFinal: skill.damage * 3,
                  secondaryRaw: skill.rawDamage * 3 * 0.5,
                  secondaryFinal: skill.damage * 3 * 0.5,
                  showBreakdown: true
                });
              }
              if (selectedHero === '俞岷' && skill.id === 'yumin-eq') {
                return renderSkillDamageLeaf(skill, '强化Q（四段）', {
                  targetKey: `${skill.id}-targets`,
                  primaryRaw: skill.rawDamage * 4,
                  primaryFinal: skill.damage * 4
                });
              }
              const label = skill.title.replace(/^[QWER]\s*/, '').replace(/^E([QW])\s*/, '强化$1 ') || skill.title;
              return renderSkillDamageLeaf(skill, label, { targetKey: `${skill.id}-targets` });
            })}
          </div>
        ) : (
          <p className="note">暂无技能数据</p>
        )}
      </div>
    );
  }

  return (
    <main>
      <section className="hero">
        <div>
          <h1>永恒轮回伤害计算器</h1>
          <p className="intro">选择英雄、装备和潜能后即时计算法强、防穿、防御修正、原始伤害与最终伤害。</p>
          <div className={`heroPicker compactHeroPicker ${useHeroAvatarPicker ? 'avatarHeroPickerMode' : ''}`}>
            <div className="heroPickerTop">
              <label className="selectBlock">
                <LabelWithHelp note={help('select.hero')}>英雄</LabelWithHelp>
                <select
                  value={selectedHero}
                  onChange={(event) => setSelectedHero(event.target.value)}
                  disabled={useHeroAvatarPicker}
                >
                  {HEROES.map((hero) => (
                    <option value={hero} key={hero}>{hero}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className={`quietButton ${showGlobalSettings ? 'active' : ''}`}
                onClick={() => setShowGlobalSettings((current) => !current)}
              >
                全局设置
              </button>
            </div>
            {showGlobalSettings ? (
              <div className="globalSettingsMenu">
                <div className="panelSubhead">
                  <strong>全局设置</strong>
                  <span>英雄选择</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={useHeroAvatarPicker}
                    onChange={(event) => setUseHeroAvatarPicker(event.target.checked)}
                  />
                  <span>使用头像列表选择实验体</span>
                </label>
              </div>
            ) : null}
            {useHeroAvatarPicker ? (
              <div className="heroAvatarPicker" aria-label="实验体头像选择">
                {heroPickerOptions.map(({ name, character }) => (
                  <button
                    type="button"
                    className={`heroAvatarOption ${name === selectedHero ? 'active' : ''}`}
                    onClick={() => setSelectedHero(name)}
                    key={name}
                  >
                    {character ? (
                      <img src={characterImageSrc(character)} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                    ) : (
                      <span className="heroAvatarFallback">{name.slice(0, 1)}</span>
                    )}
                    <span>
                      <strong>{name}</strong>
                      <small>{character?.englishName || '手动配置'}{character?.weapons?.length ? ` / ${weaponTypeOfficialList(character.weapons)}` : ''}</small>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="appSignature">
              <span>by @白谷池千</span>
              <b>{APP_VERSION}</b>
            </div>
          </div>
        </div>
        <div className="heroPanel heroIdentity">
          {selectedCharacter ? (
            <img src={characterImageSrc(selectedCharacter)} alt={selectedCharacter.name} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
          ) : null}
          <span>当前英雄</span>
          <strong>{selectedHero}</strong>
          <small>{selectedCharacter ? selectedCharacter.englishName : '手动配置英雄'}</small>
        </div>
      </section>

      <section className="grid twoColumns buildTargetGrid">
        <div className="panel buildPanel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Build</p>
              <h2><LabelWithHelp note={help('section.gear')}>装备选择</LabelWithHelp></h2>
            </div>
            <div className="buttonRow">
              <button
                type="button"
                className={`quietButton ${showBuildSettings ? 'active' : ''}`}
                onClick={() => setShowBuildSettings((current) => !current)}
              >
                设置
              </button>
            </div>
          </div>
          {showBuildSettings ? (
            <div className="buildSettingsMenu">
              <div className="panelSubhead">
                <strong>显示设置</strong>
                <span>配装器</span>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={showLowerTierEquipment}
                  onChange={(event) => setShowLowerTierEquipment(event.target.checked)}
                />
                <span>显示紫色以下品级装备</span>
              </label>
              <div className="qualityLegend" aria-label="装备品级颜色">
                {QUALITY_OPTIONS.map((quality) => (
                  <span key={quality} style={{ color: qualityColor(quality) }}>{quality}</span>
                ))}
              </div>
              <div className="statSettings">
                {ITEM_STAT_DEFINITIONS.map((stat) => (
                  <label className="toggle" key={stat.key}>
                    <input type="checkbox" checked={visibleStatKeys.includes(stat.key)} onChange={() => toggleVisibleStat(stat.key)} />
                    <span>{stat.label}{stat.unique ? '（独有）' : ''}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          <div className="buildControlLayout">
            <div>
              <div className="gearGrid">
                <label className="selectBlock">
                  <LabelWithHelp note={help('select.weaponType')}>武器类型</LabelWithHelp>
                  <select value={weaponTypeFilter} onChange={(event) => updateWeaponType(event.target.value)}>
                    <option value="全部类型">全部类型</option>
                    {heroWeaponOptions.filter((type) => type !== '全部类型').map((type) => <option value={type} key={type}>{type}</option>)}
                  </select>
                </label>
                {SLOTS.map((slot) => (
                  <label className="selectBlock" key={slot}>
                    <LabelWithHelp note={help('equipment.type')}>{slot}</LabelWithHelp>
                    <select
                      className="qualitySelect"
                      value={gear[slot]}
                      style={{ color: qualityColor(byName(equipment, gear[slot])?.quality) }}
                      onChange={(event) => updateGear(slot, event.target.value)}
                    >
                      {builderChoicesBySlot[slot].map((item) => (
                        <option value={item.name} key={`${item.type}-${item.name}`} style={{ color: qualityColor(item.quality) }}>
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
                  <span className="chip" style={{ color: qualityColor(item.quality) }} key={item.name}>
                    {item.name}{uniqueEffectsForItem(item).length ? ` / ${uniqueEffectsForItem(item).join(',')}` : ''}
                  </span>
                ))}
              </div>
            </div>
            <aside className="equipmentEffectMenu" aria-label="当前独有效果">
              <div className="panelSubhead">
                <strong>独有效果</strong>
                <span>{selectedEquipmentEffects.length} 条</span>
              </div>
              <div className="equipmentEffectList">
                {selectedEquipmentEffects.length ? selectedEquipmentEffects.map((item, index) => (
                  <div className="equipmentEffectItem" key={`${item.slot}-${item.name}-${item.effect}-${index}`}>
                    <span>{item.slot}</span>
                    <strong style={{ color: qualityColor(item.quality) }}>
                      {item.effect}
                      {item.duplicateCount > 1 ? <em className="equipmentEffectDuplicate">重复 x{item.duplicateCount}</em> : null}
                    </strong>
                    <small>{item.name}</small>
                  </div>
                )) : (
                  <div className="equipmentEffectEmpty">当前装备没有独有效果</div>
                )}
              </div>
            </aside>
          </div>
          <div className="attributePanel">
            <div>
              <span>当前法强</span>
              <strong>{result.ap}</strong>
              <small>装备 {result.equipAp} + 手动 {talentAp} + 潜能 {result.talentBonusAp} + 叠层 {result.stackAp}，加成 {pct(result.totalApPct)}</small>
            </div>
            <div>
              <span>攻击力</span>
              <strong>{attack + result.equipAttackPower + result.masteryAttackPower}</strong>
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
        <StatCard label="技伤加成" value={pct(result.totalDamageBonus)} hint={`装备 ${pct(result.equipDamageBonus)} / 潜能 ${pct(result.talentDamageBonus)}`} note={help('stat.damageBonus')} />
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
              <img src={characterImageSrc(selectedCharacter)} alt={selectedCharacter.name} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
              <div>
                <strong>{selectedCharacter.storyName || selectedCharacter.name}</strong>
                <span>{selectedCharacter.englishName} / {selectedCharacter.archetypes.join(', ') || '未分类'}</span>
                <small>{selectedCharacter.playTip}</small>
                <small className="characterWeapons">熟练武器：{weaponTypeOfficialList(selectedCharacter.weapons)}</small>
              </div>
            </div>
            <div className="miniStats">
              <StatCard label="基础血量" value={selectedCharacter.base.hp} hint={`成长 +${round(selectedCharacter.growth?.maxHp || 0, 2)} / 级`} />
              <StatCard label="基础攻击" value={selectedCharacter.base.attackPower} hint={`成长 +${round(selectedCharacter.growth?.attackPower || 0, 2)} / 级`} />
              <StatCard label="基础防御" value={selectedCharacter.base.defense} hint={`成长 +${round(selectedCharacter.growth?.defense || 0, 2)} / 级`} />
              <StatCard label="当前熟练" value={weaponTypeOfficialName(selectedWeaponRaw)} hint={selectedMasterySummary.join(' / ') || '暂无熟练成长'} />
            </div>
          </div>
          <div className="officialSkillStrip">
            {selectedOfficialSkillGroups.map((skill) => (
              <div key={skill.group}>
                <strong>{skill.slot} {skill.name}</strong>
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
          <div className="buttonRow">
            <button type="button" className="quietButton" onClick={clearTraitSelection}>
              清空潜能
            </button>
            <span className="pill">{selectedTraits.length} 项已选</span>
          </div>
        </div>
        <div className="traitBuilder">
          <div className="traitColumn">
            <div className="traitSectionHead">
              <strong>主系 {primaryGroup?.name}</strong>
              <span>{primaryGroup?.tooltip}</span>
            </div>
            {renderTraitGroupTabs('primary', traitSelection.group)}
            {traitSelectionSlots.slice(0, 3).map(renderTraitLane)}
          </div>
          <div className="traitColumn">
            <div className="traitSectionHead">
              <strong>副系 {secondaryGroup?.name}</strong>
              <span>{secondaryGroup?.tooltip}</span>
            </div>
            {renderTraitGroupTabs('secondary', traitSelection.secondaryGroup)}
            {traitSelectionSlots.slice(3).map(renderTraitLane)}
            <div className="traitSummary">
              <span>潜能合计</span>
              <strong>{traitSummaryItems.length ? traitSummaryItems.join(' / ') : '暂无数值修正'}</strong>
              <small>{result.traitBonuses.summaries.length ? result.traitBonuses.summaries.join('；') : '当前组合未配置额外可计算效果'}</small>
            </div>
          </div>
        </div>
      </section>

      <section className="damageLayout">
        <div className="panel damagePanel skillDamagePanel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Skills</p>
              <h2>{selectedHero} 技能伤害</h2>
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
          <div className="skillMainGrid">
            {SKILL_MAIN_SLOTS.map(renderSkillMainColumn)}
            {!result.skills.length ? (
              <p className="note">当前英雄暂无技能数据，可在后台配置表继续录入。</p>
            ) : null}
          </div>
        </div>

        <div className={`panel damagePanel effectsPanel ${effectsCollapsed ? 'collapsed' : ''}`}>
          <button type="button" className="effectToggle" onClick={() => setEffectsCollapsed((current) => !current)}>
            <div>
              <p className="eyebrow">Effects</p>
              <h2>特效与附加</h2>
            </div>
            <span className="pill">{effectsCollapsed ? '展开' : '收起'}</span>
          </button>
          {!effectsCollapsed ? (
          <div className="effectGrid">
            {result.effects.length ? result.effects.map((effect) => (
              <div className="damageRow compactDamageRow" key={effect.title}>
                <div>
                  <strong>{effect.title}</strong>
                  <span>{effect.note}</span>
                </div>
                <DamageValue raw={effect.raw} final={effect.value} />
              </div>
            )) : (
              <div className="damageRow compactDamageRow">
                <div>
                  <strong>暂无潜能特效</strong>
                  <span>选择伤痕、伤口撕裂或鬼火后显示</span>
                </div>
              </div>
            )}
            <div className="damageRow compactDamageRow highlight">
              <div>
                <strong>特效小计</strong>
                <span>当前潜能附加效果</span>
              </div>
              <DamageValue raw={result.effectSubtotalRaw} final={result.effectSubtotal} />
            </div>
            <div className="damageRow compactDamageRow">
              <div>
                <strong>斥力弹F</strong>
                <span>5段 + 勾选后升级段数</span>
              </div>
              <DamageValue raw={result.repelF} final={result.repelF} />
            </div>
          </div>
          ) : null}
        </div>
      </section>

      {result.comboRows.length ? (
      <section className="panel formulaPanel">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Combos</p>
            <h2>{selectedHero} 连段</h2>
          </div>
          <span className="pill">共用修正 {round(result.finalMod, 3)}</span>
        </div>
        <div className="comboGrid">
            {result.comboRows.map((combo) => (
              <div className="damageRow comboCard" key={combo.id}>
                <div>
                  <strong>{combo.title}</strong>
                  <span>{combo.note}</span>
                </div>
                <DamageValue raw={combo.value / result.finalMod} final={combo.value} />
              </div>
            ))}
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
          <StatCard label="熟练度法强%" value={pct(result.masteryApPct)} hint={selectedMasterySummary.join(' / ') || '当前武器无技能增幅熟练度'} note={help('stat.masteryApPct')} />
          <StatCard label="独有法强%" value={pct(result.uniqueApPct)} hint="重复独有取最高" note={help('stat.uniqueApPct')} />
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
            <button type="button" onClick={addCombo}>新增连段</button>
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
                      {QUALITY_OPTIONS.map((quality) => <option value={quality} key={quality}>{quality}</option>)}
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
            <caption>连段</caption>
            <thead>
              <tr>
                <HeaderCell note={help('combo.hero')}>英雄</HeaderCell>
                <HeaderCell note={help('combo.title')}>连段名</HeaderCell>
                <HeaderCell note={help('combo.hits')}>技能命中数</HeaderCell>
                <HeaderCell note={help('combo.note')}>说明</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {combos.map((combo, index) => (
                <tr key={combo.id}>
                  <td><TextCell value={combo.hero} onChange={(value) => updateComboRow(index, 'hero', value)} /></td>
                  <td><TextCell value={combo.title} onChange={(value) => updateComboRow(index, 'title', value)} /></td>
                  <td>{renderComboSkillPicker(combo, index)}</td>
                  <td><TextCell value={combo.note} onChange={(value) => updateComboRow(index, 'note', value)} /></td>
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
