import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ER_GAME_DATA from './data/erGameData.json';
import ER_SKILL_DAMAGE_TABLE from './data/erSkillDamageTable.json';
import SKILL_DAMAGE_AUGMENTS from './data/skillDamageAugments.json';
import EXTERNAL_SKILL_DAMAGE_FALLBACK from './data/externalSkillDamageFallback.json';
import DEFAULT_HELP_NOTES from './data/helpNotes.json';
import DEFAULT_ANNOUNCEMENT from './data/announcement.json';
import DEFAULT_LOCAL_CONFIG from './data/localConfig.json';
import ITEM_UNIQUE_EFFECTS from './data/itemUniqueEffects.json';
import DAK_LOADOUT_ASSETS from './data/dakLoadoutAssets.json';
import DAK_ITEM_SKILL_ICONS from './data/dakItemSkillIcons.json';
import MASTERY_STATS from './data/masteryStats.json';

const APP_VERSION = 'v0.1.047';

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
const DAY_QUALITY_COLORS = {
  普通: '#4c5565',
  高级: '#247a45',
  稀有: '#1e66a8',
  英雄: '#7352b8',
  传说: '#9a5f00',
  神话: '#b83a3a',
  白: '#4c5565',
  绿: '#247a45',
  蓝: '#1e66a8',
  紫: '#7352b8',
  金: '#9a5f00',
  红: '#b83a3a'
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
const TACTICAL_SKILL_OPTIONS = ['震裂', '违规者', '斥力弹', '阔步者', '实刃', '等离子冲击', '其他'];
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
const CONFIG_SAVE_ENDPOINT = '/api/config';
const ANNOUNCEMENT_KEY = 'er-damage-announcement-v1';
const ANNOUNCEMENT_SAVE_ENDPOINT = '/api/announcement';
const TRAIT_EFFECTS = {
  7000201: { extraEffect: 'absoluteForce', summary: '绝对武力：三次命中后追加真实伤害，并降低目标防御。' },
  7000401: { summary: '吸血鬼：满层后按等级提供攻击力或技能增幅，技能增幅路径为 14 + 等级。' },
  7010501: { dynamicDamage: 'burst', summary: '按双方体力差增加造成伤害' },
  7011101: { ap: 8, summary: '猎魂叠层预估：技能增幅 +8' },
  7011001: { dmgAmp: 0.08, summary: '弱肉强食：目标当前体力低于 40% 时造成伤害 +8%。' },
  7011501: { extraEffect: 'scar', summary: '启用伤痕额外伤害估算' },
  7010701: { extraEffect: 'tear', summary: '启用伤口撕裂持续伤害估算' },
  7300201: { extraEffect: 'ghostFire', summary: '启用鬼火真实伤害估算' },
  7310101: { dmgAmp: 0.03, summary: '凝力预估：技能伤害 +3%' },
  7310301: { dmgAmp: 0.05, summary: '超频预估：技能伤害 +5%' },
  7210101: { dmgAmp: 0.05, summary: '荆棘丛：定身目标承受伤害 +5%，治疗效果 -20%' },
  7211001: { summary: '狩猎的快感不计入技能伤害：野怪增伤、击杀回复与移速不提供法强或技伤' },
  7211401: { dmgAmp: 0.04, summary: '压迫感：周围敌人承受伤害 +4%' },
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
const VAMPIRE_STACK_TRAIT_ID = '7000401';
const BLAZING_SKILL_AMP_EFFECTS = new Set(['炽燃 - 增幅', '炽燃']);
const MAGIC_SEED_EFFECT = '魔力种子';
const CONDITIONAL_DAMAGE_AMP_EFFECTS = new Set(['光辉']);
const DAK_ITEM_TOOLTIP_BY_CODE = new Map((DAK_ITEM_SKILL_ICONS.equipment || []).map((item) => [String(item.id), item.tooltip || '']));
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
const LEVEL_SCALING_STAT_TARGETS = {
  attackPowerByLv: 'attackPower',
  defenseByLv: 'defense',
  skillAmpByLevel: 'skillAmp',
  skillAmpRatioByLevel: 'skillAmpRatio',
  adaptiveForceByLevel: 'adaptiveForce',
  maxHpByLv: 'maxHp',
  attackSpeedRatioByLv: 'attackSpeedRatio',
  increaseBasicAttackDamageByLv: 'increaseBasicAttackDamage',
  increaseBasicAttackDamageRatioByLv: 'increaseBasicAttackDamageRatio',
  preventBasicAttackDamagedRatioByLv: 'preventBasicAttackDamagedRatio',
  preventBasicAttackDamagedByLv: 'preventBasicAttackDamaged',
  preventSkillDamagedRatioByLv: 'preventSkillDamagedRatio',
  preventSkillDamagedByLv: 'preventSkillDamaged'
};
const LEVEL_SCALING_STAT_KEYS = new Set(Object.keys(LEVEL_SCALING_STAT_TARGETS));
const EQUIPMENT_STAT_SOURCE_KEYS = new Set(INITIAL_EQUIPMENT.flatMap((item) => [
  ...Object.keys(item.stats || {}),
  item.attackPower ? 'attackPower' : '',
  item.ap ? 'skillAmp' : '',
  item.cd ? 'cooldownReduction' : '',
  item.defense ? 'defense' : '',
  item.maxHp ? 'maxHp' : '',
  item.sightRange ? 'sightRange' : '',
  item.pen ? 'penetrationDefense' : '',
  item.penPct ? 'penetrationDefenseRatio' : '',
  item.apPct ? 'skillAmpRatio' : ''
].filter(Boolean)));
const EQUIPMENT_STAT_DERIVED_KEYS = new Set(
  Object.entries(LEVEL_SCALING_STAT_TARGETS)
    .filter(([levelKey]) => EQUIPMENT_STAT_SOURCE_KEYS.has(levelKey))
    .map(([, targetKey]) => targetKey)
);
const DISPLAYABLE_ITEM_STAT_DEFINITIONS = ITEM_STAT_DEFINITIONS.filter((stat, index, stats) => (
  stat?.key
  && !LEVEL_SCALING_STAT_KEYS.has(stat.key)
  && (EQUIPMENT_STAT_SOURCE_KEYS.has(stat.key) || EQUIPMENT_STAT_DERIVED_KEYS.has(stat.key))
  && stats.findIndex((item) => item.key === stat.key) === index
));
const DISPLAYABLE_ITEM_STAT_KEYS = new Set(DISPLAYABLE_ITEM_STAT_DEFINITIONS.map((stat) => stat.key));
const DISPLAYABLE_STAT_LABEL_COUNTS = DISPLAYABLE_ITEM_STAT_DEFINITIONS.reduce((counts, stat) => {
  const key = normalizedStatLabel(stat.label || stat.key);
  counts[key] = (counts[key] || 0) + 1;
  return counts;
}, {});
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
].filter((key) => DISPLAYABLE_ITEM_STAT_KEYS.has(key));

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

function finiteDamageValue(value) {
  if (value === '' || value === null || value === undefined) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

function damageRowBases(row) {
  return [1, 2, 3, 4, 5, 6]
    .map((level) => finiteDamageValue(row[`lv${level}`]))
    .filter((value) => value !== null);
}

function damageRowCoefValues(row) {
  return [1, 2, 3, 4, 5, 6]
    .map((level) => finiteDamageValue(row[`coefLv${level}`]))
    .filter((value) => value !== null);
}

function damageRowScalingVariable(row) {
  const text = String(row.coefficientText || '');
  const hasAttackScaling = /攻击力/.test(text);
  const hasSkillAmpScaling = /技能增幅|Skill Amp/i.test(text);
  if (hasAttackScaling && !hasSkillAmpScaling) return 'attack';
  return 'ap';
}

function damageRowFormula(row) {
  const coefValues = damageRowCoefValues(row);
  if (!coefValues.length || coefValues.every((value) => value === 0)) return 'base';

  const variable = damageRowScalingVariable(row);
  const uniqueValues = Array.from(new Set(coefValues));
  if (uniqueValues.length === 1) return `base + ${variable} * ${uniqueValues[0]}`;

  return `base + ${variable} * ${JSON.stringify(coefValues)}[level - 1]`;
}

function generatedSkillTitle(row) {
  const parts = [row.slot, row.skillName, row.damagePart]
    .map((part) => String(part || '').trim())
    .filter(Boolean);
  return Array.from(new Set(parts)).join(' ');
}

const DAMAGE_TABLE_SKILLS = (ER_SKILL_DAMAGE_TABLE.damageRows || [])
  .map((row, index) => {
    const bases = damageRowBases(row);
    if (!bases.length) return null;
    return {
      id: row.standardId || `${row.heroKey || row.heroName}-${row.skillGroup}-${row.baseKey || index}`,
      hero: row.heroName,
      title: generatedSkillTitle(row),
      bases: bases.join(','),
      formula: damageRowFormula(row),
      maxLevel: bases.length,
      source: 'er-skill-damage-table',
      description: row.description,
      coefficientText: row.coefficientText,
      group: row.skillGroup,
      skillId: row.skillId,
      dataKey: row.baseKey,
      coefKey: row.coefKey,
      updatedAt: ER_SKILL_DAMAGE_TABLE.generatedAt || '',
      sourceIndex: index
    };
  })
  .filter(Boolean);

const AUGMENTED_DAMAGE_SKILLS = (SKILL_DAMAGE_AUGMENTS.skills || [])
  .filter((skill) => !MANUAL_HEROES.includes(skill.hero))
  .map((skill, index) => ({
    ...skill,
    sourceIndex: skill.sourceIndex ?? index,
    updatedAt: skill.updatedAt || SKILL_DAMAGE_AUGMENTS.generatedAt || ''
  }));

const EXTERNAL_FALLBACK_DAMAGE_SKILLS = (EXTERNAL_SKILL_DAMAGE_FALLBACK.skills || [])
  .filter((skill) => !MANUAL_HEROES.includes(skill.hero))
  .map((skill, index) => ({
    ...skill,
    sourceIndex: skill.sourceIndex ?? index,
    updatedAt: skill.updatedAt || skill.sourceDate || EXTERNAL_SKILL_DAMAGE_FALLBACK.generatedAt || ''
  }));

const LEGACY_GENERATED_SKILLS = ER_GAME_DATA.skills
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

const DAMAGE_TABLE_SKILL_KEYS = new Set(DAMAGE_TABLE_SKILLS.map((skill) => `${skill.hero}-${skill.group}-${skill.dataKey}`));
const GENERATED_SKILLS = [
  ...DAMAGE_TABLE_SKILLS,
  ...AUGMENTED_DAMAGE_SKILLS,
  ...EXTERNAL_FALLBACK_DAMAGE_SKILLS,
  ...LEGACY_GENERATED_SKILLS.filter((skill) => !DAMAGE_TABLE_SKILL_KEYS.has(`${skill.hero}-${skill.group}-${skill.dataKey}`))
];
const INITIAL_SKILLS = dedupeSkillsByLatest([...DEFAULT_SKILLS, ...GENERATED_SKILLS]);
const HEROES_WITH_SKILL_DAMAGE = new Set(
  INITIAL_SKILLS
    .filter((skill) => basesFor(skill).length)
    .map((skill) => skill.hero)
);
const OFFICIAL_DATA_COUNTS = {
  characters: ER_GAME_DATA.characters?.length || ER_GAME_DATA.counts?.characters || 0,
  calculableSkills: INITIAL_SKILLS.filter((skill) => basesFor(skill).length).length
};
const DEFAULT_COMBOS = [
  { id: 'yumin-q3', hero: '俞岷', title: 'Q 三跳全中', note: '工作簿 Q*3', hits: { 'yumin-q': 3 } },
  { id: 'yumin-eq4', hero: '俞岷', title: 'EQ 四跳全中', note: '工作簿 EQ*4', hits: { 'yumin-eq': 4 } },
  { id: 'yumin-eqqw', hero: '俞岷', title: 'EQQW 全中', note: 'Q3 + EQ4 + E + W', hits: { 'yumin-q': 3, 'yumin-eq': 4, 'yumin-e': 1, 'yumin-w': 1 } }
];

const SLOTS = ['武器', '衣服', '头部', '手部', '鞋子'];
function defaultItemName(slot, preferred) {
  const preferredNames = Array.isArray(preferred) ? preferred : [preferred];
  return preferredNames.map((name) => INITIAL_EQUIPMENT.find((item) => item.type === slot && item.name === name)?.name).find(Boolean)
    || INITIAL_EQUIPMENT.find((item) => item.type === slot && item.isCompletedItem)?.name
    || INITIAL_EQUIPMENT.find((item) => item.type === slot)?.name
    || '';
}
const DEFAULT_GEAR = {
  武器: defaultItemName('武器', '女帝'),
  衣服: defaultItemName('衣服', ['私人订制', '私人定制']),
  头部: defaultItemName('头部', '幽灵面具'),
  手部: defaultItemName('手部', '龙鳞'),
  鞋子: defaultItemName('鞋子', '锋利长靴')
};
const WEAPON_TYPE_OPTIONS = [
  '全部类型',
  ...Array.from(new Set(INITIAL_EQUIPMENT.filter((item) => item.type === '武器').map((item) => item.weaponType || '未设置'))).sort()
];

const TARGETS = [
  { name: '自定义木桩', hp: 1000, defense: 140, defenseReduction: 0, reduction: 0 },
  { name: '6级全装T', hp: 2080, defense: 131, defenseReduction: 0, reduction: 0, targetMastery: 1 },
  { name: '15级魔女帽T', hp: 3110, defense: 156, defenseReduction: 0, reduction: 0, targetMastery: 1 },
  { name: '15级火衣头T', hp: 3160, defense: 166, defenseReduction: 0, reduction: 0, targetMastery: 1 },
  { name: '20级全装T', hp: 4110, defense: 187, defenseReduction: 0, reduction: 0, targetMastery: 1 },
  { name: '20级无惧感T', hp: 4110, defense: 212, defenseReduction: 0, reduction: 0, targetMastery: 1 }
];
const TARGET_MASTERY_LEVELS = Array.from({ length: 20 }, (_, index) => index + 1);

function getNumber(value) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

function stripMarkup(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function itemTooltip(item) {
  return DAK_ITEM_TOOLTIP_BY_CODE.get(String(item?.code)) || '';
}

function effectTooltipForItem(item, effect) {
  const tooltip = itemTooltip(item);
  if (!tooltip) return '';

  const effectPattern = new RegExp(`<b>\\s*${escapeRegExp(effect)}\\s*</b>([\\s\\S]*?)(?=<b>|$)`, 'i');
  const match = tooltip.match(effectPattern);
  const effectText = stripMarkup(match?.[1] || '');
  return effectText || stripMarkup(tooltip);
}

function pct(value) {
  return `${Math.round(value * 1000) / 10}%`;
}

function round(value, digits = 1) {
  const base = 10 ** digits;
  return Math.round(value * base) / base;
}

function damageFloor(value) {
  return Math.floor(getNumber(value) + 1e-9);
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

function normalizeConfigPayload(config = {}) {
  return {
    equipment: mergeEquipment(config.equipment),
    skills: mergeSkills(config.skills),
    talents: Array.isArray(config.talents) ? config.talents : clone(DEFAULT_TALENTS),
    combos: mergeCombos(config.combos)
  };
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

function normalizedStatLabel(label) {
  return String(label || '').replace(/^\(独有\)\s*/, '');
}

function displayItemStatLabel(stat) {
  const label = normalizedStatLabel(stat?.label || stat?.key || '');
  const suffix = DISPLAYABLE_STAT_LABEL_COUNTS[label] > 1
    ? `（${stat?.format === 'percent' ? '百分比' : '数值'}）`
    : '';
  return `${label}${suffix}${stat?.unique ? '（独有）' : ''}`;
}

function qualityColor(quality, theme = 'night') {
  const palette = theme === 'day' ? DAY_QUALITY_COLORS : QUALITY_COLORS;
  return palette[quality] || palette.普通;
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

  const effects = mappedEffects.length ? mappedEffects : fallbackEffects;
  return [...new Set(effects.map(normalizeUniqueEffect).filter(Boolean))];
}

function hasConditionalDamageAmp(item) {
  return getNumber(item?.dmgAmp) > 0
    && uniqueEffectsForItem(item).some((effect) => CONDITIONAL_DAMAGE_AMP_EFFECTS.has(effect));
}

function aggregateEquipmentStats(selected, masteryLevel = 0) {
  const level = Math.max(0, getNumber(masteryLevel));
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
    Object.entries(LEVEL_SCALING_STAT_TARGETS).forEach(([levelKey, targetKey]) => {
      const scaledValue = statValue(item.stats, levelKey) * level;
      if (!scaledValue) return;
      sourceStats[targetKey] = getNumber(sourceStats[targetKey]) + scaledValue;
    });
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
    const fileConfig = DEFAULT_LOCAL_CONFIG || {};
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return normalizeConfigPayload({
      equipment: saved?.equipment || fileConfig.equipment,
      skills: saved?.skills || fileConfig.skills,
      talents: saved?.talents || fileConfig.talents,
      combos: saved?.combos || fileConfig.combos
    });
  } catch {
    return normalizeConfigPayload(DEFAULT_LOCAL_CONFIG || {});
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

function normalizeAnnouncement(value) {
  return {
    title: typeof value?.title === 'string' ? value.title : DEFAULT_ANNOUNCEMENT.title,
    body: typeof value?.body === 'string' ? value.body : DEFAULT_ANNOUNCEMENT.body,
    history: typeof value?.history === 'string' ? value.history : DEFAULT_ANNOUNCEMENT.history || '',
    updatedAt: typeof value?.updatedAt === 'string' ? value.updatedAt : DEFAULT_ANNOUNCEMENT.updatedAt,
    showBadge: typeof value?.showBadge === 'boolean' ? value.showBadge : Boolean(DEFAULT_ANNOUNCEMENT.showBadge)
  };
}

function loadAnnouncement() {
  if (!HELP_NOTES_EDITABLE) return normalizeAnnouncement(DEFAULT_ANNOUNCEMENT);

  try {
    const saved = JSON.parse(window.localStorage.getItem(ANNOUNCEMENT_KEY));
    return normalizeAnnouncement({ ...DEFAULT_ANNOUNCEMENT, ...(saved || {}) });
  } catch {
    return normalizeAnnouncement(DEFAULT_ANNOUNCEMENT);
  }
}

async function persistHelpNotes(notes) {
  const response = await fetch(HELP_NOTES_SAVE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes })
  });
  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.ok) {
    throw new Error(result?.error || '保存失败');
  }
}

async function persistConfig(config) {
  const response = await fetch(CONFIG_SAVE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config })
  });
  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.ok) {
    throw new Error(result?.error || '保存失败');
  }
}

async function persistAnnouncement(announcement) {
  const response = await fetch(ANNOUNCEMENT_SAVE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ announcement })
  });
  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.ok) {
    throw new Error(result?.error || '保存失败');
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

function formulaUsesVariable(formula, variableName) {
  return new RegExp(`\\b${variableName}\\b`).test(String(formula || ''));
}

function calculateSkill(skill, level, context) {
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

function scaledSkillDamage(skill, finalMod, { scale = 1, hits = 1 } = {}) {
  const singleRaw = damageFloor(getNumber(skill.rawDamage) * scale);
  const singleFinal = damageFloor(singleRaw * finalMod);
  return {
    raw: singleRaw * hits,
    final: singleFinal * hits
  };
}

function tacticalDamageResult(title, rawValue, finalMod, note, damageType = 'skill') {
  const raw = damageFloor(rawValue);
  return {
    title,
    raw,
    value: damageType === 'true' ? raw : damageFloor(raw * finalMod),
    note: `${note}${damageType === 'true' ? '，真实伤害' : '，技能伤害'}`
  };
}

function calculateTacticalSkillEffect({ name, upgraded, level, extraHp, targetHp, finalMod }) {
  const heroLevel = Math.max(1, Math.min(20, getNumber(level) || 1));
  const bonusHp = Math.max(0, getNumber(extraHp));
  const targetMaxHp = Math.max(0, getNumber(targetHp));
  const isUpgraded = Boolean(upgraded);

  switch (name) {
    case '震裂': {
      const initial = (isUpgraded ? 100 : 50) + heroLevel * 10 + bonusHp * 0.1;
      const tick = 10 + heroLevel * 2 + bonusHp * 0.025;
      const ticks = isUpgraded ? 12 : 0;
      const raw = initial + tick * ticks;
      const note = isUpgraded
        ? `100 + 等级*10 + 额外体力10%；持续6秒共${ticks}跳，每跳10 + 等级*2 + 额外体力2.5%`
        : '50 + 等级*10 + 额外体力10%';
      return tacticalDamageResult('震裂F', raw, finalMod, note);
    }
    case '违规者': {
      const raw = (isUpgraded ? heroLevel * 8 + targetMaxHp * 0.09 : heroLevel * 5 + targetMaxHp * 0.07);
      return tacticalDamageResult('违规者F', raw, finalMod, isUpgraded ? '等级*8 + 目标体力上限9%' : '等级*5 + 目标体力上限7%', 'true');
    }
    case '斥力弹': {
      const missiles = isUpgraded ? 8 : 5;
      const perMissile = 10 + heroLevel + targetMaxHp * 0.006;
      return tacticalDamageResult('斥力弹F', perMissile * missiles, finalMod, `${missiles}枚导弹，每枚10 + 等级*1 + 目标体力上限0.6%`, 'true');
    }
    case '阔步者': {
      const raw = isUpgraded ? 150 + heroLevel * 10 : 100 + heroLevel * 5;
      return tacticalDamageResult('阔步者F', raw, finalMod, isUpgraded ? '150 + 等级*10' : '100 + 等级*5');
    }
    case '实刃': {
      const base = 140 + heroLevel * 20;
      const extra = isUpgraded ? 50 + heroLevel * 10 : 0;
      return tacticalDamageResult('实刃F', base + extra, finalMod, isUpgraded ? '140 + 等级*20；升级额外50 + 等级*10' : '140 + 等级*20');
    }
    case '等离子冲击': {
      const raw = isUpgraded ? 150 + heroLevel * 10 : 120 + heroLevel * 5;
      return tacticalDamageResult('等离子冲击F', raw, finalMod, isUpgraded ? '150 + 等级*10；命中后5秒内防御力降低10%' : '120 + 等级*5');
    }
    default:
      return null;
  }
}

function coefficientAtLevel(formula, variableName, level) {
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

function skillFormulaDescription(skill, level) {
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
  targetMastery,
  selfHp,
  damageBonus,
  skillReduction,
  r2Stacks,
  tacticalSkill,
  tacticalUpgraded,
  vampireFull,
  blazingFull,
  magicSeedFull,
  conditionalDamageAmpActive,
  selectedHero,
  combos = []
}) {
  const selected = SLOTS.map((slot) => byName(equipment, gear[slot])).filter(Boolean);
  const equipmentStats = aggregateEquipmentStats(selected, mastery);
  const talentBonusAp = getNumber(traitBonuses.ap);
  const talentPen = getNumber(traitBonuses.pen);
  const talentPenPct = getNumber(traitBonuses.penPct);
  const talentDamageBonus = getNumber(traitBonuses.dmgAmp);
  const equipAp = statValue(equipmentStats, 'skillAmp') + statValue(equipmentStats, 'adaptiveForce') || selected.reduce((sum, item) => sum + getNumber(item.ap), 0);
  const equipAttackPower = statValue(equipmentStats, 'attackPower');
  const stackAp = (vampireFull ? 14 + mastery : 0) + (blazingFull ? 24 : 0) + (magicSeedFull ? 20 : 0);
  const stackCd = magicSeedFull ? 20 : 0;
  const cd = (statValue(equipmentStats, 'cooldownReduction') || selected.reduce((sum, item) => sum + getNumber(item.cd), 0)) + stackCd;
  const pen = statValue(equipmentStats, 'penetrationDefense') + statValue(equipmentStats, 'uniquePenetrationDefense') + talentPen || selected.reduce((sum, item) => sum + getNumber(item.pen), 0) + talentPen;
  const penPct = statValue(equipmentStats, 'penetrationDefenseRatio') + statValue(equipmentStats, 'uniquePenetrationDefenseRatio') + talentPenPct || selected.reduce((sum, item) => sum + getNumber(item.penPct), 0) + talentPenPct;
  const equipDefense = (statValue(equipmentStats, 'defense') || selected.reduce((sum, item) => sum + getNumber(item.defense), 0)) + getNumber(traitBonuses.defense);
  const extraHp = statValue(equipmentStats, 'maxHp') + getNumber(traitBonuses.maxHp);
  const normalApPct = 0;
  const uniqueApPct = Math.max(statValue(equipmentStats, 'uniqueSkillAmpRatio'), ...selected.filter((item) => item.uniqueApPct).map((item) => getNumber(item.apPct)));
  const equipDamageBonus = selected.reduce((sum, item) => (
    sum + (hasConditionalDamageAmp(item) && !conditionalDamageAmpActive ? 0 : getNumber(item.dmgAmp))
  ), 0);
  const masteryApPct = mastery * masteryOptionValue(masteryStat, 'SkillAmpRatio');
  const masteryAttackPower = mastery * masteryOptionValue(masteryStat, 'AttackPower');
  const totalApPct = normalApPct + uniqueApPct + masteryApPct;
  const totalBaseAp = equipAp + talentAp + talentBonusAp + stackAp;
  const apRaw = totalBaseAp * (1 + totalApPct);
  const ap = damageFloor(apRaw);
  const finalDefense = target.defense * (1 - target.defenseReduction) * (1 - penPct) - pen;
  const defenseMod = 100 / (100 + finalDefense);
  const totalDamageBonus = damageBonus + equipDamageBonus + talentDamageBonus;
  const targetMasteryLevel = Math.max(1, Math.min(20, getNumber(targetMastery) || 1));
  const targetMasterySkillReduction = targetMasteryLevel <= 1 ? 0 : targetMasteryLevel * 0.008;
  const targetMasteryBasicReduction = targetMasteryLevel <= 1 ? 0 : targetMasteryLevel * 0.01;
  const totalSkillReduction = skillReduction + targetMasterySkillReduction;
  const damageMod = 1 + totalDamageBonus - target.reduction - totalSkillReduction;
  const finalMod = defenseMod * damageMod;
  const stackCount = Math.min(4, Math.max(0, r2Stacks));
  const context = { ap, attack: attack + equipAttackPower + masteryAttackPower, targetHp: target.hp, stacks: stackCount, finalMod };
  const heroSkills = skillTable
    .filter((skill) => skill.hero === selectedHero)
    .map((skill) => calculateSkill(skill, skillLevels[skill.id], context));
  const hpDiffRatio = Math.min(0.4, Math.max(0.1, (target.hp - selfHp) / selfHp));
  const burstBonus = Math.min(0.1, Math.max(0, (target.hp - selfHp) / selfHp) * 0.25);
  const curse = 50 + ap * 0.15;
  const scarBase = 10 + mastery + target.hp * 0.03;
  const tearBase = 50 + target.hp * 0.7 * 0.08;
  const activeTraitEffectIds = new Set(traitBonuses.effectIds || []);
  const effects = [
    activeTraitEffectIds.has('absoluteForce')
      ? { title: '绝对武力(真伤)', raw: damageFloor(20 + mastery * 5), value: damageFloor(20 + mastery * 5), note: '20+实验体等级*5；防御降低 15% 需手动在目标栏设置。' }
      : null,
    activeTraitEffectIds.has('scar')
      ? { title: '伤痕(技)', raw: damageFloor(scarBase), value: damageFloor(damageFloor(scarBase) * finalMod), note: '10+等级+目标血量*3%' }
      : null,
    activeTraitEffectIds.has('tear')
      ? { title: '伤口撕裂', raw: damageFloor(tearBase), value: damageFloor(damageFloor(tearBase) * finalMod), note: '以触发时70%血计算' }
      : null
  ].filter(Boolean);
  const ghostFire = 250 + ap * 0.2;
  if (activeTraitEffectIds.has('ghostFire')) {
    effects.push({ title: '鬼火(真伤)', raw: damageFloor(ghostFire), value: damageFloor(ghostFire), note: '250 + 法强 * 20%' });
  }
  const tacticalEffect = calculateTacticalSkillEffect({
    name: tacticalSkill,
    upgraded: tacticalUpgraded,
    level: mastery,
    extraHp,
    targetHp: target.hp,
    finalMod
  });
  if (tacticalEffect) effects.push(tacticalEffect);
  const effectSubtotalRaw = effects.reduce((sum, effect) => sum + effect.raw, 0);
  const effectSubtotal = effects.reduce((sum, effect) => sum + effect.value, 0);
  const comboSkills = skillTable
    .filter((skill) => skill.hero === selectedHero)
    .map((skill) => calculateSkill(skill, skillLevels[skill.id], context));
  const comboDamage = Object.fromEntries(comboSkills.map((skill) => [skill.id, skill.damage]));
  const comboRawDamage = Object.fromEntries(comboSkills.map((skill) => [skill.id, skill.rawDamage]));
  const comboRows = combos
    .filter((combo) => combo.hero === selectedHero)
    .map((combo) => {
      const hitEntries = Object.entries(combo.hits || {}).filter(([, count]) => getNumber(count) > 0);
      const value = hitEntries.reduce((sum, [skillId, count]) => sum + getNumber(comboDamage[skillId]) * getNumber(count), 0);
      const rawValue = hitEntries.reduce((sum, [skillId, count]) => sum + getNumber(comboRawDamage[skillId]) * getNumber(count), 0);
      const hitNote = hitEntries.map(([skillId, count]) => {
        const skill = comboSkills.find((item) => item.id === skillId);
        return `${skill?.title || skillId} x${getNumber(count)}`;
      }).join(' + ');
      return { ...combo, rawValue, value, note: combo.note || hitNote };
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
    stackCd,
    selectedTalents: selectedTraits,
    traitBonuses,
    cd,
    pen,
    penPct,
    equipDefense,
    extraHp,
    normalApPct,
    uniqueApPct,
    masteryApPct,
    masteryStat,
    totalApPct,
    totalBaseAp,
    ap,
    apRaw,
    finalDefense,
    defenseMod,
    equipDamageBonus,
    talentDamageBonus,
    totalDamageBonus,
    targetMasteryLevel,
    targetMasterySkillReduction,
    targetMasteryBasicReduction,
    totalSkillReduction,
    damageMod,
    finalMod,
    hpDiffRatio,
    burstBonus,
    skills: heroSkills,
    effects,
    effectSubtotalRaw,
    effectSubtotal,
    ghostFire,
    tacticalEffect,
    comboRows,
    extraHeroGroups
  };
}

function HelpNote({ note, editable, onChange, onSave, saveStatus, dirty }) {
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, placement: 'top' });

  const clearCloseTimer = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };

  const updatePosition = () => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    const placeBelow = rect.top < 190;
    setPosition({
      top: placeBelow ? rect.bottom + 10 : rect.top - 10,
      left,
      placement: placeBelow ? 'bottom' : 'top'
    });
  };

  const showPopover = () => {
    clearCloseTimer();
    updatePosition();
    setOpen(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => {
    if (!open) return undefined;
    const sync = () => updatePosition();
    window.addEventListener('scroll', sync, true);
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('scroll', sync, true);
      window.removeEventListener('resize', sync);
    };
  }, [open]);

  useEffect(() => () => clearCloseTimer(), []);

  if (!editable && !note) return null;

  return (
    <span className="helpNote">
      <button
        type="button"
        className="helpButton"
        aria-label="查看说明"
        aria-expanded={open}
        ref={buttonRef}
        onPointerEnter={showPopover}
        onPointerLeave={scheduleClose}
        onMouseEnter={showPopover}
        onMouseLeave={scheduleClose}
        onFocus={showPopover}
        onBlur={scheduleClose}
        onClick={showPopover}
      >
        ?
      </button>
      {open ? createPortal(
        <span
          className={`helpPopover helpPortalPopover ${position.placement === 'bottom' ? 'below' : 'above'}`}
          role="tooltip"
          ref={popoverRef}
          style={{
            top: position.top,
            left: position.left,
            transform: position.placement === 'top' ? 'translateY(-100%)' : 'none'
          }}
          onPointerEnter={showPopover}
          onPointerLeave={scheduleClose}
          onMouseEnter={showPopover}
          onMouseLeave={scheduleClose}
          onFocus={showPopover}
          onBlur={scheduleClose}
        >
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
        </span>,
        document.body
      ) : null}
    </span>
  );
}

function PortalHovercard({ children, content, className = '' }) {
  const anchorRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, placement: 'top' });

  const clearCloseTimer = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };

  const updatePosition = () => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(380, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    const placeBelow = rect.top < 210;
    setPosition({
      top: placeBelow ? rect.bottom + 10 : rect.top - 10,
      left,
      placement: placeBelow ? 'bottom' : 'top'
    });
  };

  const show = () => {
    clearCloseTimer();
    updatePosition();
    setOpen(true);
  };

  const closeSoon = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => {
    if (!open) return undefined;
    const sync = () => updatePosition();
    window.addEventListener('scroll', sync, true);
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('scroll', sync, true);
      window.removeEventListener('resize', sync);
    };
  }, [open]);

  useEffect(() => () => clearCloseTimer(), []);

  if (!content) return children;

  return (
    <span
      className={`hovercardAnchor ${className}`.trim()}
      ref={anchorRef}
      tabIndex={0}
      onPointerEnter={show}
      onPointerLeave={closeSoon}
      onMouseEnter={show}
      onMouseLeave={closeSoon}
      onFocus={show}
      onBlur={closeSoon}
      onClick={show}
    >
      {children}
      {open ? createPortal(
        <span
          className={`helpPopover helpPortalPopover skillDescriptionPopover ${position.placement === 'bottom' ? 'below' : 'above'}`}
          role="tooltip"
          style={{
            top: position.top,
            left: position.left,
            transform: position.placement === 'top' ? 'translateY(-100%)' : 'none'
          }}
          onPointerEnter={show}
          onPointerLeave={closeSoon}
          onMouseEnter={show}
          onMouseLeave={closeSoon}
        >
          {content}
        </span>,
        document.body
      ) : null}
    </span>
  );
}

function SkillDescriptionContent({ title, level, formula, description, source }) {
  return (
    <span className="skillDescriptionContent">
      <strong>{title}{level ? ` Lv.${level}` : ''}</strong>
      {formula ? <span className="skillFormulaText">{formula}</span> : null}
      {description ? <span>{description}</span> : null}
      {source ? <small>{source}</small> : null}
    </span>
  );
}

function AnnouncementDialog({
  announcement,
  editable,
  dirty,
  saveStatus,
  onChange,
  onClose,
  onSave
}) {
  return createPortal(
    <div className="announcementOverlay" role="presentation" onMouseDown={onClose}>
      <section
        className="announcementDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="announcementHead">
          <div>
            <p className="eyebrow">Notice</p>
            <h2 id="announcement-title">{editable ? '编辑公告' : announcement.title || '公告'}</h2>
          </div>
          <button type="button" className="quietButton" onClick={onClose} aria-label="关闭公告">关闭</button>
        </div>
        {editable ? (
          <div className="announcementEditor">
            <label className="field">
              <span>公告标题</span>
              <input
                type="text"
                value={announcement.title}
                onChange={(event) => onChange({ title: event.target.value })}
              />
            </label>
            <label className="field">
              <span>公告内容</span>
              <textarea
                value={announcement.body}
                onChange={(event) => onChange({ body: event.target.value })}
              />
            </label>
            <label className="field">
              <span>历史公告</span>
              <textarea
                className="announcementHistoryInput"
                value={announcement.history}
                onChange={(event) => onChange({ history: event.target.value })}
              />
            </label>
            <div className="announcementActions">
              <button type="button" className="helpSaveButton" onClick={onSave} disabled={!dirty || saveStatus === 'saving'}>
                {saveStatus === 'saving' ? '保存中' : '保存到本地'}
              </button>
              <small>
                {saveStatus === 'saved'
                  ? '已写入 src/data/announcement.json，下次提交会一起 push。'
                  : '保存会更新公告日期，并在发布版本的公告按钮上显示感叹号。'}
              </small>
              {saveStatus === 'error' ? <small className="helpSaveError">保存失败，请确认正在使用本地 Vite 服务。</small> : null}
            </div>
          </div>
        ) : (
          <div className="announcementContent">
            <strong>{announcement.title || '公告'}</strong>
            <p>{announcement.body || '暂无公告。'}</p>
            {announcement.updatedAt ? <small>更新：{announcement.updatedAt}</small> : null}
            {announcement.history ? (
              <div className="announcementHistory">
                <h3>历史公告</h3>
                <p>{announcement.history}</p>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>,
    document.body
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

function LazyEditSheet({ title, children }) {
  const [open, setOpen] = useState(false);

  return (
    <details className="sheetWrap editSheetWrap" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="configSheetSummary">
        <span>{title}</span>
        <b>{open ? '收起' : '展开'}</b>
      </summary>
      {open ? children : null}
    </details>
  );
}

function TextCell({ value, onChange, type = 'text', step }) {
  return <input type={type} step={step} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />;
}

function DamageValue({ raw, final }) {
  return (
    <div className="damageValue">
      <b>{damageFloor(final)}</b>
      <small>原始 {damageFloor(raw)}</small>
    </div>
  );
}

function hasChineseText(value) {
  return /[\u3400-\u9fff]/.test(String(value || ''));
}

function heroZhName(skill) {
  if (skill?.hero) return skill.hero;
  const heroKey = String(skill?.heroKey || '').toLowerCase();
  const character = ER_GAME_DATA.characters?.find((item) => String(item.englishName || item.id || '').toLowerCase() === heroKey);
  return character?.name || skill?.heroKey || '';
}

function formatSourceDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '';
}

function translateFormulaSourceText(value) {
  return String(value || '')
    .replace(/\bSkill Amplification\b/gi, '技能增幅')
    .replace(/\bAttack Power\b/gi, '攻击力')
    .replace(/\bDefense\b/gi, '防御力')
    .replace(/\bMax HP\b/gi, '最大体力')
    .replace(/\bCurrent HP\b/gi, '当前体力')
    .replace(/\bTarget Max HP\b/gi, '目标最大体力')
    .replace(/\bTarget Current HP\b/gi, '目标当前体力');
}

function sourceTitleZh(skill) {
  const title = String(skill?.sourceTitle || '').trim();
  if (!title || hasChineseText(title)) return '';
  const wikiMatch = title.match(/^(.+?)\s+-\s+Official Eternal Return Wiki$/i);
  if (wikiMatch) {
    const heroName = heroZhName(skill) || wikiMatch[1];
    return `${heroName} - 永恒轮回官方 Wiki（英文原文：${wikiMatch[1]}）`;
  }
  const patchMatch = title.match(/^(?:\[Edited\]\s*)?PATCH NOTES\s+([^\s]+)\s+-\s+(.+)$/i);
  if (patchMatch) {
    const dateLabel = formatSourceDate(skill?.sourceDate || skill?.updatedAt);
    return `更新公告 ${patchMatch[1]}${dateLabel ? ` - ${dateLabel}` : ` - ${patchMatch[2]}`}`;
  }
  return translateFormulaSourceText(title);
}

function sourceNoteZh(skill) {
  const note = String(skill?.sourceNote || '').trim();
  if (!note || hasChineseText(note)) return '';
  const officialMatch = note.match(/^Applied official patch current value:\s*(.+)$/i);
  if (officialMatch) return `采用官方更新公告当前数值：${translateFormulaSourceText(officialMatch[1])}`;
  if (/^Wiki current snapshot value; no newer same-slot official patch candidate was found\.$/i.test(note)) {
    return '采用 Wiki 当前快照数值；未找到同技能栏位的更新官方公告候选。';
  }
  const wikiCandidateMatch = note.match(/^Wiki snapshot value; newer same-slot patch candidate exists:\s*(.+)$/i);
  if (wikiCandidateMatch) {
    return `采用 Wiki 快照数值；存在较新的同技能栏位公告候选：${translateFormulaSourceText(wikiCandidateMatch[1])}`;
  }
  return translateFormulaSourceText(note);
}

function skillSourceMeta(skill) {
  if (!skill?.sourceLabel && !skill?.sourceVersion && !skill?.sourceDate && !skill?.updatedAt && !skill?.sourceTitle) return null;
  const date = (skill.sourceDate || skill.updatedAt) ? new Date(skill.sourceDate || skill.updatedAt) : null;
  const dateLabel = date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '';
  const sourceName = skill.sourceVersion || (String(skill.source || '').includes('wiki') ? 'Wiki' : skill.source || '');
  const label = skill.sourceLabel || [sourceName, dateLabel].filter(Boolean).join(' / ');
  if (!label) return null;
  const titleZh = sourceTitleZh(skill);
  const noteZh = sourceNoteZh(skill);
  return {
    label,
    title: [
      skill.sourceTitle,
      titleZh ? `中文对照：${titleZh}` : '',
      skill.sourceNote,
      noteZh ? `中文对照：${noteZh}` : '',
      skill.sourceUrl
    ].filter(Boolean).join('\n')
  };
}

const SKILL_MAIN_SLOTS = ['Q', 'W', 'E', 'R'];
const MULTI_TARGET_MAX = 10;

function skillMainSlot(skill) {
  const title = String(skill?.title || '').toUpperCase().trim();
  if (title.startsWith('P')) return 'P';
  if (title.startsWith('EQ')) return 'Q';
  if (title.startsWith('EW')) return 'W';
  const match = title.match(/[QWER]/);
  return match?.[0] || 'Q';
}

function skillTargetCount(counts, key, maxTargets = MULTI_TARGET_MAX) {
  return Math.max(1, Math.min(maxTargets, getNumber(counts[key]) || 1));
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
  return damageFloor(getNumber(character.base?.attackPower) + getNumber(character.growth?.attackPower) * Math.max(0, level - 1));
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
  const [targetMastery, setTargetMastery] = useState(1);
  const [selfHp, setSelfHp] = useState(2514);
  const [damageBonus, setDamageBonus] = useState(0);
  const [skillReduction, setSkillReduction] = useState(0);
  const [r2Stacks, setR2Stacks] = useState(1);
  const [tacticalSkill, setTacticalSkill] = useState('斥力弹');
  const [tacticalUpgraded, setTacticalUpgraded] = useState(true);
  const [vampireFull, setVampireFull] = useState(false);
  const [blazingFull, setBlazingFull] = useState(false);
  const [magicSeedFull, setMagicSeedFull] = useState(false);
  const [conditionalDamageAmpActive, setConditionalDamageAmpActive] = useState(false);
  const [showBuildSettings, setShowBuildSettings] = useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [showHeroDebugSettings, setShowHeroDebugSettings] = useState(false);
  const [effectsCollapsed, setEffectsCollapsed] = useState(false);
  const [skillTargetCounts, setSkillTargetCounts] = useState({});
  const [useHeroAvatarPicker, setUseHeroAvatarPicker] = useState(() => Boolean(loadAppSettings().useHeroAvatarPicker));
  const [editMode, setEditMode] = useState(false);
  const [showUnsupportedHeroes, setShowUnsupportedHeroes] = useState(false);
  const [showDamageTestHeroes, setShowDamageTestHeroes] = useState(false);
  const [uiTheme, setUiTheme] = useState(() => loadAppSettings().uiTheme || 'night');
  const [heroAvatarQuery, setHeroAvatarQuery] = useState('');
  const [showLowerTierEquipment, setShowLowerTierEquipment] = useState(false);
  const [visibleStatKeys, setVisibleStatKeys] = useState(DEFAULT_VISIBLE_STAT_KEYS);
  const [skillLevels, setSkillLevels] = useState(() => Object.fromEntries(INITIAL_SKILLS.map((skill) => [skill.id, skill.maxLevel])));
  const [helpNotes, setHelpNotes] = useState(loadHelpNotes);
  const [helpNotesDirty, setHelpNotesDirty] = useState(false);
  const [helpNotesSaveStatus, setHelpNotesSaveStatus] = useState('idle');
  const [announcement, setAnnouncement] = useState(loadAnnouncement);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcementDirty, setAnnouncementDirty] = useState(false);
  const [announcementSaveStatus, setAnnouncementSaveStatus] = useState('idle');
  const [configDirty, setConfigDirty] = useState(false);
  const [configSaveStatus, setConfigSaveStatus] = useState('idle');

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ equipment, skills, talents, combos }));
  }, [equipment, skills, talents, combos]);

  useEffect(() => {
    window.localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify({ useHeroAvatarPicker, editMode, showUnsupportedHeroes, showDamageTestHeroes, uiTheme }));
  }, [useHeroAvatarPicker, editMode, showUnsupportedHeroes, showDamageTestHeroes, uiTheme]);

  useEffect(() => {
    if (!editMode) setShowHeroDebugSettings(false);
  }, [editMode]);

  useEffect(() => {
    document.body.dataset.theme = uiTheme;
  }, [uiTheme]);

  useEffect(() => {
    if (HELP_NOTES_EDITABLE) {
      window.localStorage.setItem(HELP_NOTES_KEY, JSON.stringify(helpNotes));
    }
  }, [helpNotes]);

  useEffect(() => {
    if (HELP_NOTES_EDITABLE) {
      window.localStorage.setItem(ANNOUNCEMENT_KEY, JSON.stringify(announcement));
    }
  }, [announcement]);

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

  function updateAnnouncement(patch) {
    if (!HELP_NOTES_EDITABLE) return;
    setAnnouncement((current) => normalizeAnnouncement({ ...current, ...patch }));
    setAnnouncementDirty(true);
    setAnnouncementSaveStatus('idle');
  }

  async function saveAnnouncement() {
    if (!HELP_NOTES_EDITABLE) return;

    const nextAnnouncement = normalizeAnnouncement({
      ...announcement,
      updatedAt: new Date().toISOString().slice(0, 10),
      showBadge: true
    });
    setAnnouncementSaveStatus('saving');
    try {
      await persistAnnouncement(nextAnnouncement);
      setAnnouncement(nextAnnouncement);
      window.localStorage.removeItem(ANNOUNCEMENT_KEY);
      setAnnouncementDirty(false);
      setAnnouncementSaveStatus('saved');
    } catch {
      setAnnouncementSaveStatus('error');
    }
  }

  function updateConfig(updater) {
    setConfig((current) => (typeof updater === 'function' ? updater(current) : updater));
    setConfigDirty(true);
    setConfigSaveStatus('idle');
  }

  async function saveConfig() {
    if (!HELP_NOTES_EDITABLE) return;

    setConfigSaveStatus('saving');
    try {
      await persistConfig({ equipment, skills, talents, combos });
      window.localStorage.removeItem(STORAGE_KEY);
      setConfigDirty(false);
      setConfigSaveStatus('saved');
    } catch {
      setConfigSaveStatus('error');
    }
  }

  function help(key) {
    const note = Object.prototype.hasOwnProperty.call(helpNotes, key)
      ? helpNotes[key]
      : DEFAULT_HELP_NOTES[key];

    return (
      <HelpNote
        note={note}
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
  const hasBurstTrait = selectedTraits.some((trait) => TRAIT_EFFECTS[trait.id]?.dynamicDamage === 'burst');
  const estimatedBurstBonus = Math.min(0.1, Math.max(0, (target.hp - selfHp) / selfHp) * 0.25);
  const traitBonuses = useMemo(
    () => traitBonusesFor(selectedTraits, estimatedBurstBonus),
    [selectedTraits, estimatedBurstBonus]
  );
  const canShowExtendedHeroes = editMode && showDamageTestHeroes;
  const visibleHeroNames = canShowExtendedHeroes
    ? (showUnsupportedHeroes ? HEROES : HEROES.filter((hero) => HEROES_WITH_SKILL_DAMAGE.has(hero)))
    : HEROES.filter((hero) => MANUAL_HEROES.includes(hero));
  const selectedCharacter = ER_GAME_DATA.characters.find((character) => character.name === selectedHero);
  const selectedOfficialSkillGroups = ER_GAME_DATA.rawSkillGroups.filter((skill) => skill.hero === selectedHero);
  const heroPickerOptions = visibleHeroNames.map((hero) => ({
    name: hero,
    character: ER_GAME_DATA.characters.find((character) => character.name === hero)
  }));
  const filteredHeroPickerOptions = heroPickerOptions.filter(({ name, character }) => {
    const query = heroAvatarQuery.trim().toLowerCase();
    if (!query) return true;
    return [
      name,
      character?.englishName,
      ...(character?.weapons || []).map((weapon) => weaponTypeOfficialName(weapon))
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
  });
  useEffect(() => {
    if (visibleHeroNames.includes(selectedHero)) return;
    setSelectedHero(visibleHeroNames[0] || '俞岷');
  }, [selectedHero, showUnsupportedHeroes, showDamageTestHeroes, editMode]);
  const allowedWeaponTypes = new Set(selectedCharacter?.weapons || []);
  const selectedWeaponRaw = weaponTypeFilter !== '全部类型'
    ? weaponTypeFromFilter(weaponTypeFilter)
    : weaponTypeRaw(byName(equipment, gear['武器']));
  const selectedMasteryStat = masteryStatFor(selectedCharacter?.code, selectedWeaponRaw);
  const selectedMasterySummary = masterySummary(selectedMasteryStat);
  const attack = characterAttackAtLevel(selectedCharacter);
  const selectedGearItems = SLOTS.map((slot) => byName(equipment, gear[slot])).filter(Boolean);
  const selectedEquipmentEffectsRaw = selectedGearItems.flatMap((item) => (
    uniqueEffectsForItem(item).map((effect) => ({
      slot: item.type,
      name: item.name,
      code: item.code,
      quality: item.quality,
      effect,
      tooltip: effectTooltipForItem(item, effect)
    }))
  ));
  const hasVampireStackTrait = selectedTraits.some((trait) => String(trait.id) === VAMPIRE_STACK_TRAIT_ID || trait.name === '吸血鬼');
  const hasBlazingSkillAmpEffect = selectedEquipmentEffectsRaw.some((item) => BLAZING_SKILL_AMP_EFFECTS.has(item.effect));
  const hasMagicSeedEffect = selectedEquipmentEffectsRaw.some((item) => item.effect === MAGIC_SEED_EFFECT);
  const hasConditionalDamageAmpEffect = selectedGearItems.some(hasConditionalDamageAmp);
  const effectiveVampireFull = hasVampireStackTrait && vampireFull;
  const effectiveBlazingFull = hasBlazingSkillAmpEffect && blazingFull;
  const effectiveMagicSeedFull = hasMagicSeedEffect && magicSeedFull;
  const effectiveConditionalDamageAmpActive = hasConditionalDamageAmpEffect && conditionalDamageAmpActive;

  useEffect(() => {
    if (!hasVampireStackTrait && vampireFull) setVampireFull(false);
    if (!hasBlazingSkillAmpEffect && blazingFull) setBlazingFull(false);
    if (!hasMagicSeedEffect && magicSeedFull) setMagicSeedFull(false);
    if (!hasConditionalDamageAmpEffect && conditionalDamageAmpActive) setConditionalDamageAmpActive(false);
  }, [hasVampireStackTrait, hasBlazingSkillAmpEffect, hasMagicSeedEffect, hasConditionalDamageAmpEffect, vampireFull, blazingFull, magicSeedFull, conditionalDamageAmpActive]);

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
      targetMastery,
      selfHp,
      damageBonus,
      skillReduction,
      r2Stacks,
      tacticalSkill,
      tacticalUpgraded,
      vampireFull: effectiveVampireFull,
      blazingFull: effectiveBlazingFull,
      magicSeedFull: effectiveMagicSeedFull,
      conditionalDamageAmpActive: effectiveConditionalDamageAmpActive,
      selectedHero,
      combos
    }),
    [equipment, skills, skillLevels, gear, mastery, selectedMasteryStat, attack, talentAp, traitBonuses, selectedTraits, target, targetMastery, selfHp, damageBonus, skillReduction, r2Stacks, tacticalSkill, tacticalUpgraded, effectiveVampireFull, effectiveBlazingFull, effectiveMagicSeedFull, effectiveConditionalDamageAmpActive, selectedHero, combos]
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
  const displayEquipmentStatValue = (key) => (
    statValue(result.equipmentStats, key) + (key === 'cooldownReduction' ? result.stackCd : 0)
  );
  const visibleEquipmentStats = visibleStatKeys
    .filter((key) => DISPLAYABLE_ITEM_STAT_KEYS.has(key))
    .map((key) => ({ ...ITEM_STAT_BY_KEY[key], key, value: displayEquipmentStatValue(key) }))
    .filter((stat) => stat.label && stat.value !== 0);
  const activeEquipmentStats = DISPLAYABLE_ITEM_STAT_DEFINITIONS
    .map((stat) => ({ ...stat, value: displayEquipmentStatValue(stat.key) }))
    .filter((stat) => stat.value !== 0);
  const heroUsesApScaling = result.skills.some((skill) => formulaUsesVariable(skill.formula, 'ap'));
  const heroUsesAttackScaling = result.skills.some((skill) => formulaUsesVariable(skill.formula, 'attack'));
  const showApFormulaStats = heroUsesApScaling || (!heroUsesApScaling && !heroUsesAttackScaling);
  const finalAttack = attack + result.equipAttackPower + result.masteryAttackPower;
  const formulaSummaryStats = [
    showApFormulaStats ? `最终法强 ${result.ap}` : '',
    heroUsesAttackScaling ? `最终攻击 ${round(finalAttack, 1)}` : ''
  ].filter(Boolean).join(' / ');
  const selectedEquipmentEffectCounts = selectedEquipmentEffectsRaw.reduce((counts, item) => {
    counts[item.effect] = (counts[item.effect] || 0) + 1;
    return counts;
  }, {});
  const selectedEquipmentEffects = selectedEquipmentEffectsRaw.map((item) => ({
    ...item,
    duplicateCount: selectedEquipmentEffectCounts[item.effect] || 0
  }));
  const renderEquipmentEffects = () => (
    <div className="equipmentEffectList">
      {selectedEquipmentEffects.length ? selectedEquipmentEffects.map((item, index) => (
        <div className="equipmentEffectItem" key={`${item.slot}-${item.name}-${item.effect}-${index}`} title={item.tooltip}>
          <span>{item.slot}</span>
          <strong style={{ color: qualityColor(item.quality, uiTheme) }} title={item.tooltip}>
            {item.effect}
            {item.duplicateCount > 1 ? <em className="equipmentEffectDuplicate">重复 x{item.duplicateCount}</em> : null}
          </strong>
          <small>{item.name}</small>
        </div>
      )) : (
        <div className="equipmentEffectEmpty">当前装备没有独有效果</div>
      )}
    </div>
  );

  useEffect(() => {
    const nextRawType = selectedCharacter?.weapons?.[0];
    if (!nextRawType) return;

    const nextFilter = weaponTypeLabelForRaw(nextRawType);
    setWeaponTypeFilter(nextFilter);

    const currentWeapon = byName(equipment, gear['武器']);
    if (
      currentWeapon
      && weaponTypeRaw(currentWeapon) === nextRawType
      && shouldShowInBuilder(currentWeapon, showLowerTierEquipment)
    ) return;

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
    setTargetMastery(next.targetMastery || 1);
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

  function updateSkillTargetCount(key, value, maxTargets = MULTI_TARGET_MAX) {
    setSkillTargetCounts((current) => ({
      ...current,
      [key]: Math.max(1, Math.min(maxTargets, getNumber(value) || 1))
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
    if (!DISPLAYABLE_ITEM_STAT_KEYS.has(key)) return;
    setVisibleStatKeys((current) => (
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    ));
  }

  function updateEquipmentRow(index, key, value) {
    updateConfig((current) => ({
      ...current,
      equipment: current.equipment.map((item, rowIndex) => {
        if (rowIndex !== index) return item;
        const numericKeys = ['ap', 'attackPower', 'cd', 'pen', 'penPct', 'apPct', 'defense', 'maxHp', 'sightRange', 'dmgAmp'];
        return { ...item, [key]: numericKeys.includes(key) ? getNumber(value) : value };
      })
    }));
  }

  function updateSkillRow(index, key, value) {
    updateConfig((current) => ({
      ...current,
      skills: current.skills.map((skill, rowIndex) => (
        rowIndex === index ? { ...skill, [key]: key === 'maxLevel' ? getNumber(value) : value } : skill
      ))
    }));
  }

  function updateComboRow(index, key, value) {
    updateConfig((current) => ({
      ...current,
      combos: current.combos.map((combo, rowIndex) => (
        rowIndex === index ? { ...combo, [key]: value } : combo
      ))
    }));
  }

  function updateComboHit(index, skillId, delta) {
    updateConfig((current) => ({
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
    updateConfig({
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
    updateConfig({
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

  function addCombo() {
    updateConfig({
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
    updateConfig({ equipment: clone(INITIAL_EQUIPMENT), skills: clone(INITIAL_SKILLS), talents: clone(DEFAULT_TALENTS), combos: clone(DEFAULT_COMBOS) });
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
          <strong><LabelWithHelp note={help(`trait.${slot.key}`)}>{slot.title}</LabelWithHelp></strong>
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

  function renderTargetStepper(key, maxTargets = MULTI_TARGET_MAX) {
    const count = skillTargetCount(skillTargetCounts, key, maxTargets);
    return (
      <div className="targetStepper">
        <span>命中目标</span>
        <button type="button" onClick={() => updateSkillTargetCount(key, count - 1, maxTargets)}>-</button>
        <b>{count}</b>
        <button type="button" onClick={() => updateSkillTargetCount(key, count + 1, maxTargets)}>+</button>
      </div>
    );
  }

  function renderSkillDamageLeaf(skill, label, options = {}) {
    const targetKey = options.targetKey || skill.id;
    const maxTargets = options.targetMax || MULTI_TARGET_MAX;
    const count = skillTargetCount(skillTargetCounts, targetKey, maxTargets);
    const primaryRaw = getNumber(options.primaryRaw ?? skill.rawDamage);
    const primaryFinal = getNumber(options.primaryFinal ?? skill.damage);
    const secondaryRaw = getNumber(options.secondaryRaw ?? primaryRaw);
    const secondaryFinal = getNumber(options.secondaryFinal ?? primaryFinal);
    const totalRaw = primaryRaw + secondaryRaw * Math.max(0, count - 1);
    const totalFinal = primaryFinal + secondaryFinal * Math.max(0, count - 1);
    const hasSingleFullBreakdown = options.primarySingleRaw !== undefined || options.secondarySingleRaw !== undefined;
    const totalLabel = typeof options.totalLabel === 'function'
      ? options.totalLabel(count)
      : options.totalLabel || (count > 1 ? `${count} 目标总计` : '单目标');
    const sourceMeta = skillSourceMeta(skill);
    const skillLevel = skill.level || skillLevels[skill.id] || 1;
    const description = skill.coefficientText || skill.description || '';

    return (
      <div className="skillDamageLeaf" key={targetKey}>
        <div className="skillLeafHead">
          <div className="skillLeafTitle">
            <PortalHovercard
              className="skillNameHover"
              content={(
                <SkillDescriptionContent
                  title={label}
                  level={skillLevel}
                  formula={skillFormulaDescription(skill, skillLevel)}
                  description={description}
                  source={sourceMeta?.title}
                />
              )}
            >
              <strong>{label}</strong>
            </PortalHovercard>
            {sourceMeta ? <span className="skillSourceMeta" title={sourceMeta.title}>{sourceMeta.label}</span> : null}
          </div>
          {renderTargetStepper(targetKey, maxTargets)}
        </div>
        <div className="skillLeafValues">
          {hasSingleFullBreakdown ? (
            <>
              <div>
                <span>主要目标单发</span>
                <DamageValue raw={options.primarySingleRaw ?? skill.rawDamage} final={options.primarySingleFinal ?? skill.damage} />
              </div>
              <div>
                <span>主要目标全中</span>
                <DamageValue raw={primaryRaw} final={primaryFinal} />
              </div>
              <div>
                <span>次要目标单发</span>
                <DamageValue raw={options.secondarySingleRaw ?? secondaryRaw} final={options.secondarySingleFinal ?? secondaryFinal} />
              </div>
              <div>
                <span>次要目标全中</span>
                <DamageValue raw={secondaryRaw} final={secondaryFinal} />
              </div>
            </>
          ) : options.showBreakdown ? (
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
            <span>{totalLabel}</span>
            <DamageValue raw={totalRaw} final={totalFinal} />
          </div>
        </div>
      </div>
    );
  }

  function renderSkillMainColumn(slot) {
    const slotSkills = result.skills.filter((skill) => skillMainSlot(skill) === slot);
    const levelValue = slotSkills[0] ? skillLevels[slotSkills[0].id] : 1;
    const slotDescription = slotSkills.length ? (
      <span className="skillDescriptionContent">
        <strong>{slot} Lv.{levelValue}</strong>
        {slotSkills.map((skill) => (
          <span className="skillDescriptionEntry" key={`desc-${skill.id}`}>
            <b>{skill.title}</b>
            <span className="skillFormulaText">{skillFormulaDescription(skill, levelValue)}</span>
            {skill.coefficientText || skill.description ? <span>{skill.coefficientText || skill.description}</span> : null}
          </span>
        ))}
      </span>
    ) : null;

    return (
      <div className="skillMainColumn" key={slot}>
        <div className="skillMainHead">
          {slotDescription ? (
            <PortalHovercard className="skillSlotHover" content={slotDescription}>
              <strong>{slot}</strong>
            </PortalHovercard>
          ) : (
            <strong>{slot}</strong>
          )}
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
                const primarySingle = scaledSkillDamage(skill, result.finalMod);
                const primary = scaledSkillDamage(skill, result.finalMod, { hits: 3 });
                const secondarySingle = scaledSkillDamage(skill, result.finalMod, { scale: 0.5 });
                const secondary = scaledSkillDamage(skill, result.finalMod, { scale: 0.5, hits: 3 });
                return renderSkillDamageLeaf(skill, '普通Q（三段）', {
                  targetKey: `${skill.id}-targets`,
                  primarySingleRaw: primarySingle.raw,
                  primarySingleFinal: primarySingle.final,
                  primaryRaw: primary.raw,
                  primaryFinal: primary.final,
                  secondarySingleRaw: secondarySingle.raw,
                  secondarySingleFinal: secondarySingle.final,
                  secondaryRaw: secondary.raw,
                  secondaryFinal: secondary.final,
                  totalLabel: (nextCount) => `${nextCount > 1 ? `${nextCount} 目标总计` : '单目标'}（只算全中）`,
                  showBreakdown: true
                });
              }
              if (selectedHero === '俞岷' && skill.id === 'yumin-eq') {
                const primary = scaledSkillDamage(skill, result.finalMod, { hits: 4 });
                return renderSkillDamageLeaf(skill, '强化Q（四段）', {
                  targetKey: `${skill.id}-targets`,
                  primaryRaw: primary.raw,
                  primaryFinal: primary.final
                });
              }
              const yuminLabel = selectedHero === '俞岷' && skill.id === 'yumin-w'
                ? '普通W'
                : selectedHero === '俞岷' && skill.id === 'yumin-ew'
                  ? '强化W'
                  : '';
              const label = yuminLabel || skill.title.replace(/^[PQWER]\s*/, '').replace(/^E([QW])\s*/, '强化$1 ') || skill.title;
              const targetMax = selectedHero === '俞岷' && skill.id === 'yumin-e' ? 3 : MULTI_TARGET_MAX;
              return renderSkillDamageLeaf(skill, label, { targetKey: `${skill.id}-targets`, targetMax });
            })}
          </div>
        ) : (
          <p className="note">暂无技能数据</p>
        )}
      </div>
    );
  }

  function renderPassiveSkillRow() {
    if (!result.skills.some((skill) => skillMainSlot(skill) === 'P')) return null;

    return (
      <div className="skillPassiveRow">
        {renderSkillMainColumn('P')}
      </div>
    );
  }

  function renderHeroAvatarPicker(className = '') {
    if (!useHeroAvatarPicker) return null;
    return (
      <div className={`heroAvatarPicker ${className}`.trim()} aria-label="选择实验体">
        <h3>选择实验体</h3>
        <label className="heroAvatarSearch">
          <span>搜索实验体</span>
          <input
            type="search"
            value={heroAvatarQuery}
            onChange={(event) => setHeroAvatarQuery(event.target.value)}
            placeholder="搜索实验体"
          />
        </label>
        <div className="heroAvatarList">
          {filteredHeroPickerOptions.map(({ name, character }) => (
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
                <small>{character?.englishName || '手动配置'}</small>
              </span>
            </button>
          ))}
          {!filteredHeroPickerOptions.length ? <p className="heroAvatarEmpty">未找到实验体</p> : null}
        </div>
      </div>
    );
  }

  return (
    <main>
      <section className="hero">
        <div className="heroPanel heroIdentity">
          {selectedCharacter ? (
            <img src={characterImageSrc(selectedCharacter)} alt={selectedCharacter.name} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
          ) : null}
          <span>当前实验体</span>
          <strong>{selectedHero}</strong>
          <small>{selectedCharacter ? selectedCharacter.englishName : '手动配置实验体'}</small>
        </div>
        <div className="heroIntroBlock">
          <div className="heroTitleLine">
            <h1>永恒轮回伤害计算器</h1>
            <div className="appSignature">
              <span>by @白谷池千</span>
              <button
                type="button"
                className={`versionButton ${editMode ? 'editable' : ''}`}
                onClick={() => {
                  if (!editMode) return;
                  setShowGlobalSettings(true);
                  setShowHeroDebugSettings((current) => !current);
                }}
                aria-label="版本号"
              >
                {APP_VERSION}
              </button>
            </div>
          </div>
          <p className="intro">选择英雄、装备和潜能后即时计算法强、防穿、防御修正、原始伤害与最终伤害。</p>
          <div className={`heroPicker compactHeroPicker ${useHeroAvatarPicker ? 'avatarHeroPickerMode' : ''}`}>
            <div className="heroPickerTop">
              <label className="selectBlock">
                <LabelWithHelp note={help('select.hero')}>实验体</LabelWithHelp>
                <select
                  value={selectedHero}
                  onChange={(event) => setSelectedHero(event.target.value)}
                >
                  {visibleHeroNames.map((hero) => (
                    <option value={hero} key={hero}>{hero}</option>
                  ))}
                </select>
              </label>
              <div className="globalSettingsAnchor">
                <button
                  type="button"
                  className={`quietButton ${showGlobalSettings ? 'active' : ''}`}
                  onClick={() => setShowGlobalSettings((current) => !current)}
                >
                  全局设置
                </button>
                {showGlobalSettings ? (
                  <div className="globalSettingsMenu">
                    <div className="panelSubhead">
                      <strong>全局设置</strong>
                      <span>显示与编辑</span>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={useHeroAvatarPicker}
                        onChange={(event) => setUseHeroAvatarPicker(event.target.checked)}
                      />
                      <span>使用头像列表选择实验体</span>
                    </label>
                    {editMode && showHeroDebugSettings ? (
                      <>
                        <label className="toggle">
                          <input
                            type="checkbox"
                            checked={showUnsupportedHeroes}
                            onChange={(event) => setShowUnsupportedHeroes(event.target.checked)}
                          />
                          <span>显示暂不支持技能伤害计算的英雄</span>
                        </label>
                        <label className="toggle">
                          <input
                            type="checkbox"
                            checked={showDamageTestHeroes}
                            onChange={(event) => setShowDamageTestHeroes(event.target.checked)}
                          />
                          <span>显示技能伤害统计测试英雄</span>
                        </label>
                      </>
                    ) : null}
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={uiTheme === 'day'}
                        onChange={(event) => setUiTheme(event.target.checked ? 'day' : 'night')}
                      />
                      <span>日间配色</span>
                    </label>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={editMode}
                        onChange={(event) => setEditMode(event.target.checked)}
                      />
                      <span>编辑模式</span>
                    </label>
                  </div>
                ) : null}
                </div>
              <div className="announcementAnchor">
                <button
                  type="button"
                  className={`quietButton announcementButton ${announcement.showBadge ? 'hasUpdate' : ''}`}
                  onClick={() => setShowAnnouncement(true)}
                >
                  公告
                  {announcement.showBadge ? <span aria-label="公告有更新">!</span> : null}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showAnnouncement ? (
        <AnnouncementDialog
          announcement={announcement}
          editable={HELP_NOTES_EDITABLE}
          dirty={announcementDirty}
          saveStatus={announcementSaveStatus}
          onChange={updateAnnouncement}
          onClose={() => setShowAnnouncement(false)}
          onSave={saveAnnouncement}
        />
      ) : null}

      <section className="grid twoColumns buildTargetGrid">
        <div className={`buildArea ${useHeroAvatarPicker ? 'hasHeroAvatarRail' : ''}`}>
          {renderHeroAvatarPicker('floatingHeroAvatarPicker')}
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
                  <span key={quality} style={{ color: qualityColor(quality, uiTheme) }}>{quality}</span>
                ))}
              </div>
              <div className="statSettings">
                {DISPLAYABLE_ITEM_STAT_DEFINITIONS.map((stat) => (
                  <label className="toggle" key={stat.key}>
                    <input type="checkbox" checked={visibleStatKeys.includes(stat.key)} onChange={() => toggleVisibleStat(stat.key)} />
                    <span>{displayItemStatLabel(stat)}</span>
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
                      style={{ color: qualityColor(byName(equipment, gear[slot])?.quality, uiTheme) }}
                      onChange={(event) => updateGear(slot, event.target.value)}
                    >
                      {builderChoicesBySlot[slot].map((item) => (
                        <option value={item.name} key={`${item.type}-${item.name}`} style={{ color: qualityColor(item.quality, uiTheme) }}>
                          {slot === '武器' ? `${item.name} / ${item.weaponType || '未设置'}` : item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                <label className="selectBlock">
                  <LabelWithHelp note={help('select.tacticalSkill')}>战术技能选择</LabelWithHelp>
                  <select value={tacticalSkill} onChange={(event) => setTacticalSkill(event.target.value)}>
                    {TACTICAL_SKILL_OPTIONS.map((name) => <option value={name} key={name}>{name}</option>)}
                  </select>
                </label>
                <Field label="熟练度等级" value={mastery} onChange={setMastery} min={1} max={20} note={help('field.mastery')} />
                <Field label="手动潜能法强" value={talentAp} onChange={setTalentAp} note={help('field.talentAp')} />
              </div>
              <div className="chips">
                {result.selected.map((item) => (
                  <span className="chip" style={{ color: qualityColor(item.quality, uiTheme) }} title={stripMarkup(itemTooltip(item))} key={item.name}>
                    {item.name}{uniqueEffectsForItem(item).length ? ` / ${uniqueEffectsForItem(item).join(',')}` : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <details className="equipmentEffectRail mobileEquipmentEffectRail">
            <summary className="equipmentEffectSummary">
              <strong>独有效果</strong>
              <span>{selectedEquipmentEffects.length} 条</span>
            </summary>
            {renderEquipmentEffects()}
          </details>
          <details className="equippedStats collapsibleStats">
            <summary className="panelSubhead">
              <strong>当前装备属性</strong>
              <span>{activeEquipmentStats.length} 条非零属性</span>
            </summary>
            <div className="statPills">
              {activeEquipmentStats.map((stat) => (
                <span className="statPill" key={stat.key}>{displayItemStatLabel(stat)} {formatStatValue(stat.key, stat.value)}</span>
              ))}
            </div>
          </details>
          <div className="toggles compactToggles">
            {hasVampireStackTrait ? (
              <label className="toggle">
                <input type="checkbox" checked={vampireFull} onChange={(event) => setVampireFull(event.target.checked)} />
                <span>吸血鬼满层</span>
              </label>
            ) : null}
            {hasBlazingSkillAmpEffect ? (
              <label className="toggle">
                <input type="checkbox" checked={blazingFull} onChange={(event) => setBlazingFull(event.target.checked)} />
                <span>炽燃满层</span>
              </label>
            ) : null}
            {hasMagicSeedEffect ? (
              <label className="toggle" title="魔力种子满层：技能增幅 +20，冷却缩减 +20。">
                <input type="checkbox" checked={magicSeedFull} onChange={(event) => setMagicSeedFull(event.target.checked)} />
                <span>魔力种子满层</span>
              </label>
            ) : null}
            {hasConditionalDamageAmpEffect ? (
              <label className="toggle" title="暗影面纱等条件触发类装备增伤，勾选后才计入伤害提升。">
                <input type="checkbox" checked={conditionalDamageAmpActive} onChange={(event) => setConditionalDamageAmpActive(event.target.checked)} />
                <span>装备增伤触发</span>
              </label>
            ) : null}
            <label className="toggle">
              <input type="checkbox" checked={tacticalUpgraded} onChange={(event) => setTacticalUpgraded(event.target.checked)} />
              <span>战术技能升级</span>
            </label>
          </div>
          </div>
        </div>

        <div className="panel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Target</p>
              <h2><LabelWithHelp note={help('section.target')}>目标与增减伤</LabelWithHelp></h2>
            </div>
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
            <label className="field">
              <LabelWithHelp note={help('field.targetMastery')}>目标熟练度等级</LabelWithHelp>
              <select value={targetMastery} onChange={(event) => setTargetMastery(Number(event.target.value))}>
                {TARGET_MASTERY_LEVELS.map((level) => (
                  <option value={level} key={level}>
                    {level}级{level <= 1 ? '（木桩默认，无额外减伤）' : `（技能减伤 ${pct(level * 0.008)} / 平A减伤 ${pct(level * 0.01)}）`}
                  </option>
                ))}
              </select>
            </label>
            <Field label="目标通用减伤" value={target.reduction} onChange={(value) => updateTarget('reduction', value)} suffix="小数" step={0.01} note={help('field.targetReduction')} />
            <Field label="自身血量" value={selfHp} onChange={setSelfHp} note={help('field.selfHp')} />
            <Field label="手动伤害提升百分比" value={damageBonus} onChange={setDamageBonus} suffix="小数" step={0.01} note={help('field.damageBonus')} />
            <Field label="手动技能伤害减免" value={skillReduction} onChange={setSkillReduction} suffix="小数" step={0.01} note={help('field.skillReduction')} />
          </div>
          <div className="finalDamageModBlock">
            <span>最终伤害修正值</span>
            <strong>{round(result.finalMod, 3)}</strong>
          </div>
        </div>

        <details className="currentStatsBlock buildTargetStatsBlock collapsibleStats">
          <summary className="panelSubhead">
            <strong>当前属性汇总</strong>
            <span>{visibleEquipmentStats.length + 4} 项显示</span>
          </summary>
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
              <span>伤害提升</span>
              <strong>{pct(result.totalDamageBonus)}</strong>
            </div>
            {visibleEquipmentStats.map((stat) => (
              <div key={stat.key}>
                <span>{displayItemStatLabel(stat)}</span>
                <strong>{formatStatValue(stat.key, stat.value)}</strong>
              </div>
            ))}
          </div>
        </details>
      </section>

      <section className="stats">
        <StatCard label="最终法强" value={result.ap} hint={`${round(result.totalBaseAp, 1)} * (1 + ${pct(result.totalApPct)})`} note={help('stat.equipAp')} />
        <StatCard label="最终防御" value={round(result.finalDefense, 1)} hint={`防御修正 ${pct(result.defenseMod)}`} note={help('stat.finalDefense')} />
        <StatCard label="防穿" value={`${result.pen} / ${pct(result.penPct)}`} hint="数值 / 百分比" note={help('stat.pen')} />
        <StatCard label="伤害提升" value={pct(result.totalDamageBonus)} hint={`装备 ${pct(result.equipDamageBonus)} / 潜能 ${pct(result.talentDamageBonus)} / 手动 ${pct(damageBonus)}`} note={help('stat.damageBonus')} />
        <StatCard label="技能减伤" value={pct(result.totalSkillReduction)} hint={`目标熟练 ${pct(result.targetMasterySkillReduction)} / 手动 ${pct(skillReduction)}，平A熟练减伤 ${pct(result.targetMasteryBasicReduction)}`} note={help('field.targetMastery')} />
        <StatCard label="增减伤合算" value={pct(result.damageMod - 1)} hint={`最终倍率 ${round(result.damageMod, 3)}`} note={help('stat.damageMod')} />
        {hasBurstTrait ? (
          <StatCard label="血量差比" value={pct(result.hpDiffRatio)} hint={`爆发力追伤 ${pct(result.burstBonus)}`} note={help('stat.hpDiffRatio')} />
        ) : null}
      </section>

      {selectedCharacter ? (
        <details className="panel sourcePanel sourceDetails">
          <summary className="panelHead sourceSummary">
            <div>
              <p className="eyebrow">ER GameData</p>
              <h2>{selectedCharacter.name} 官方数据</h2>
            </div>
            <span className="pill">{OFFICIAL_DATA_COUNTS.characters} 名角色 / {OFFICIAL_DATA_COUNTS.calculableSkills} 条可计算技能</span>
          </summary>
          <div className="sourceBody">
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
                <div className="officialSkillCard" key={skill.group}>
                  <PortalHovercard
                    className="officialSkillHover"
                    content={(
                      <SkillDescriptionContent
                        title={`${skill.slot} ${skill.name}`}
                        description={skill.coefficientText || skill.description}
                        source={skill.extensionName}
                      />
                    )}
                  >
                    <strong>{skill.slot} {skill.name}</strong>
                  </PortalHovercard>
                </div>
              ))}
            </div>
          </div>
        </details>
      ) : null}

      <section className="panel talentPanel">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Potential</p>
            <h2><LabelWithHelp note={help('section.traits')}>潜能选择</LabelWithHelp></h2>
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
              <strong><LabelWithHelp note={help('trait.primaryGroup')}>主系 {primaryGroup?.name}</LabelWithHelp></strong>
              <span>{primaryGroup?.tooltip}</span>
            </div>
            {renderTraitGroupTabs('primary', traitSelection.group)}
            {traitSelectionSlots.slice(0, 3).map(renderTraitLane)}
          </div>
          <div className="traitColumn">
            <div className="traitSectionHead">
              <strong><LabelWithHelp note={help('trait.secondaryGroup')}>副系 {secondaryGroup?.name}</LabelWithHelp></strong>
              <span>{secondaryGroup?.tooltip}</span>
            </div>
            {renderTraitGroupTabs('secondary', traitSelection.secondaryGroup)}
            {traitSelectionSlots.slice(3).map(renderTraitLane)}
            <div className="traitSummary">
              <LabelWithHelp note={help('trait.summary')}>潜能合计</LabelWithHelp>
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
          {renderPassiveSkillRow()}
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
                  <strong>暂无附加伤害</strong>
                  <span>选择可造成伤害的潜能或战术技能后显示</span>
                </div>
              </div>
            )}
            <div className="damageRow compactDamageRow highlight">
              <div>
                <strong>特效小计</strong>
                <span>当前潜能与战术技能附加效果</span>
              </div>
              <DamageValue raw={result.effectSubtotalRaw} final={result.effectSubtotal} />
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
            <h2><LabelWithHelp note={help('section.combo')}>{selectedHero} 连段</LabelWithHelp></h2>
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
                <DamageValue raw={combo.rawValue} final={combo.value} />
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

      <details className="panel formulaPanel formulaDetails" open>
        <summary className="panelHead formulaSummary">
          <div>
            <p className="eyebrow">Formula</p>
            <h2>计算过程</h2>
          </div>
          <span className="pill">{formulaSummaryStats}</span>
        </summary>
        <div className="formulaGrid">
          {showApFormulaStats ? (
            <>
              <StatCard label="装备法强" value={result.equipAp} hint="5件装备求和" note={help('stat.equipAp')} />
              <StatCard label="潜能法强" value={talentAp + result.talentBonusAp} hint="手动输入 + 潜能选择" note={help('stat.potentialAp')} />
              <StatCard label="熟练度法强%" value={pct(result.masteryApPct)} hint={selectedMasterySummary.join(' / ') || '当前武器无技能增幅熟练度'} note={help('stat.masteryApPct')} />
              <StatCard label="独有法强%" value={pct(result.uniqueApPct)} hint="重复独有取最高" note={help('stat.uniqueApPct')} />
              <StatCard label="合计法强" value={round(result.totalBaseAp, 1)} hint={`装备 ${result.equipAp} + 潜能 ${round(talentAp + result.talentBonusAp, 1)} + 叠层 ${result.stackAp}`} note={help('stat.equipAp')} />
              <StatCard label="合计法强增幅%" value={pct(result.totalApPct)} hint={[result.uniqueApPct ? `独有 ${pct(result.uniqueApPct)}` : '', result.masteryApPct ? `熟练 ${pct(result.masteryApPct)}` : ''].filter(Boolean).join(' + ') || '无额外法强增幅'} note={help('stat.masteryApPct')} />
              <StatCard label="最终法强" value={result.ap} hint={`${round(result.totalBaseAp, 1)} * (1 + ${pct(result.totalApPct)})`} note={help('stat.equipAp')} />
            </>
          ) : null}
          {heroUsesAttackScaling ? (
            <>
              <StatCard label="基础攻击" value={attack} hint={`角色等级成长后攻击力`} note={help('equipment.attackPower')} />
              <StatCard label="装备攻击" value={result.equipAttackPower} hint="当前装备攻击力合计" note={help('equipment.attackPower')} />
              <StatCard label="熟练度攻击" value={round(result.masteryAttackPower, 1)} hint={selectedMasterySummary.join(' / ') || '当前武器无攻击力熟练度'} note={help('field.mastery')} />
              <StatCard label="最终攻击" value={round(finalAttack, 1)} hint={`${round(attack, 1)} + ${round(result.equipAttackPower, 1)} + ${round(result.masteryAttackPower, 1)}`} note={help('equipment.attackPower')} />
            </>
          ) : null}
        </div>
        <p className="note">最终技能伤害 = 技能基础值 * 100 / (100 + 目标防御 * (1 - 防御降低) * (1 - 防穿%) - 防穿数值) * (1 + 伤害提升百分比 - 目标通用减伤 - 手动技能伤害减免 - 目标熟练度技能减伤)。目标熟练度 1 级按训练场木桩默认处理，不追加额外减伤。</p>
      </details>

      {editMode ? (
      <section className="panel configPanel">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Config</p>
            <h2><LabelWithHelp note={help('section.config')}>配置表</LabelWithHelp></h2>
          </div>
          <div className="buttonRow">
            <button type="button" onClick={addEquipment}>新增装备</button>
            <button type="button" onClick={addSkill}>新增技能</button>
            <button type="button" onClick={addCombo}>新增连段</button>
            <button type="button" className="helpSaveButton" onClick={saveConfig} disabled={!configDirty || configSaveStatus === 'saving'}>
              {configSaveStatus === 'saving' ? '保存中' : '保存配置到本地'}
            </button>
            <button type="button" className="quietButton" onClick={resetConfig}>恢复默认</button>
          </div>
        </div>
        <p className="note">
          编辑时会先暂存在当前浏览器；点击“保存配置到本地”后会写入 src/data/localConfig.json，下次提交与 push 会一起带上。技能公式可使用 `base`、`ap`、`attack`、`targetHp`、`stacks`、`level`，等级基础值用英文逗号分隔。数据源预留为 pypy-vrc/er-gamedata，仍保留手动输入覆盖。
          <LabelWithHelp note={help('solution.help')}>帮助说明发布方案</LabelWithHelp>
          {configSaveStatus === 'saved' ? <small className="configSaveStatus">已写入项目文件。</small> : null}
          {configSaveStatus === 'error' ? <small className="configSaveStatus error">保存失败，请确认正在使用本地 Vite 服务。</small> : null}
        </p>
        <LazyEditSheet title={<LabelWithHelp note={help('table.equipment')}>装备</LabelWithHelp>}>
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
        </LazyEditSheet>
        <LazyEditSheet title={<LabelWithHelp note={help('table.skills')}>技能</LabelWithHelp>}>
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
        </LazyEditSheet>
        <LazyEditSheet title="连段">
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
        </LazyEditSheet>
      </section>
      ) : null}
    </main>
  );
}
