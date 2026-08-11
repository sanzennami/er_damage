import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import EQUIPMENT_DATA from './data/equipment.json';
import CHARACTER_DATA from './data/characters.json';
import DEFAULT_HELP_NOTES from './data/helpNotes.json';
import DEFAULT_ANNOUNCEMENT from './data/announcement.json';
import DEFAULT_LOCAL_CONFIG from './data/localConfig.json';
import ITEM_UNIQUE_EFFECTS from './data/itemUniqueEffects.json';
import ITEM_EFFECT_DAMAGE from './data/itemEffectDamage.json';
import ITEM_EFFECT_MODIFIERS from './data/itemEffectModifiers.json';
import DAK_LOADOUT_ASSETS from './data/dakLoadoutAssets.json';
import DAK_ITEM_SKILL_ICONS from './data/dakItemSkillIcons.json';
import { CHARACTERS, findCharacterByName, masteryStatFor } from './lib/characterStats.js';
import {
  adaptiveOffenseFormula,
  basesFor,
  calculateSkill,
  clampLevel,
  clone,
  damageFloor,
  evaluateFormula,
  formulaUsesVariable,
  getNumber,
  pct,
  progressiveDamageBounds,
  progressiveDamageRule,
  progressiveDamageValue,
  round,
  scaledSkillDamage,
  skillFormulaDescription
} from './lib/formula.js';
import {
  DEFAULT_COMBOS,
  INITIAL_SKILLS,
  OFFICIAL_DATA_COUNTS,
  mergeCombos,
  mergeSkills
} from './lib/skillSources.js';
import {
  DEFAULT_HERO,
  MANUAL_HEROES,
  skillDisplayRule,
  stackLimitForHero,
  stackSelectorForHero
} from './lib/specialRules.js';

const APP_VERSION = 'v0.1.062';

const EXPORTED_LOCAL_CONFIG_MODULES = import.meta.glob('./data/localConfig.export.json', {
  eager: true,
  import: 'default'
});
const EXPORTED_LOCAL_CONFIG = Object.values(EXPORTED_LOCAL_CONFIG_MODULES)[0] || null;

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
const STORAGE_KEY = 'er-damage-config-v1';
const WORKSPACE_STATE_KEY = 'er-damage-workspace-state-v1';
const APP_SETTINGS_KEY = 'er-damage-global-settings-v1';
const HELP_NOTES_KEY = 'er-damage-help-notes-v1';
const HELP_NOTES_EDITABLE = typeof window !== 'undefined' && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
const HELP_NOTES_SAVE_ENDPOINT = '/api/help-notes';
const CONFIG_SAVE_ENDPOINT = '/api/config';
const CONFIG_EXPORT_ENDPOINT = '/api/config/export';
const ANNOUNCEMENT_KEY = 'er-damage-announcement-v1';
const ANNOUNCEMENT_SAVE_ENDPOINT = '/api/announcement';
const TRAIT_EFFECTS = {
  7000201: { extraEffect: 'absoluteForce', summary: '绝对武力：三次命中后追加真实伤害，并降低目标防御。' },
  7000401: { summary: '吸血鬼：满层后按实验体主路径提供攻击力或技能增幅；技能增幅满层为 30 + 等级。' },
  7000501: { extraEffect: 'thunder', summary: '霹雳：技能命中实验体时造成 30+等级*2+额外攻击力45%或技能增幅26% 的技能伤害。' },
  7010501: { dynamicDamage: 'burst', summary: '按双方体力差增加造成伤害' },
  7011101: { extraEffect: 'huntBear', summary: '猎魂・熊按 80 层预估：攻击力 +10 或技能增幅 +20，按实验体主路径计入。' },
  7011201: { maxHp: 180, summary: '猎魂・野猪按 80 层预估：体力上限 +180。' },
  7011301: { summary: '猎魂・狼按 80 层为攻击速度 +24%，当前不计入技能伤害。' },
  7011401: { summary: '猎魂・野狗按 80 层为吸血-所有伤害 +7%，当前不计入技能伤害。' },
  7011001: { dmgAmp: 0.08, summary: '弱肉强食：目标当前体力低于 40% 时造成伤害 +8%。' },
  7011501: { extraEffect: 'scar', summary: '启用伤痕额外伤害估算' },
  7010701: { extraEffect: 'tear', summary: '伤口撕裂：2 秒内造成 10 + 等级*2 + 目标当前体力*8% 的技能伤害。' },
  7300101: { extraEffect: 'stardust', summary: '星尘蓄势：3 层后下一次普攻对实验体或召唤物造成 30+等级*2 的额外真实伤害。' },
  7300201: { extraEffect: 'ghostFire', summary: '鬼火：3 秒内造成足量伤害后，5 秒内造成 50+等级*10+额外攻击力70%或技能增幅20% 的真实伤害。' },
  7300301: { extraEffect: 'vortex', summary: '涡流：结束时造成等级*5+额外攻击力80%或技能增幅40% 的技能伤害。' },
  7310101: { extraEffect: 'concentration', summary: '凝力按当前适性最大值预估：攻击力 0~16 或技能增幅 0~32，按实验体主路径计入。' },
  7310201: { summary: '循环系统：技能命中时恢复 10 + 等级 + 体力上限*0.3%，同一技能每秒只适用一次；不影响伤害。' },
  7310301: { cd: 5, extraEffect: 'overclock', summary: '超频：冷却缩减 +5；冷却缩减超过 40 时攻击力 +5 或技能增幅 +10，按实验体主路径计入。' },
  7310401: { penPct: 0.06, summary: '制动力：对敌人实验体造成伤害后 4 秒内防御穿透 +6%，当前按已触发计入。' },
  7310501: { extraEffect: 'rCharger', summary: 'R_echarger：终极技能冷却缩减 +15；使用终极技能后 5 秒内攻击力 +5+等级*0.5 或技能增幅 +10+等级。' },
  7310601: { extraEffect: 'rapidShot', summary: '急速射击：技能后普攻命中时，5 秒内攻击力 +2+等级*0.5 或技能增幅 +4+等级，并提升攻击速度 15%；按实验体主路径计入。' },
  7200101: { summary: '超再生（12.0）：转为副潜能；护盾与体力恢复量增加 5%；原“被护盾/治疗目标获得适应力”已移除，不再提供攻击力或技能增幅。' },
  7200201: { extraEffect: 'enhancementDevice', summary: '强化装置：使用终极技能时出现强化装置，4.5 秒内给 4m 范围内自身和队友移动速度 +10+等级*0.6%，技能伤害量 +8+等级*0.5%。' },
  7200301: { summary: '治愈装置：自身或 4m 内队友体力低于 40% 承受伤害时出现治愈装置，每秒恢复 3+等级*0.3% 已失体力；重复时治疗效果为 50%。' },
  7200501: { summary: '无私：独立技能造成伤害时，自身和周围 8m 队友获得 6 秒护盾；体力低于 30% 以下目标获得 1.5 倍护盾，上限 35%。' },
  7210101: { dmgAmp: 0.05, summary: '荆棘丛：目标无法移动状态时，5 秒内治疗效果降低 20%，承受的所有伤害增加 5%。' },
  7211001: { summary: '狩猎的快感：对野生动物造成伤害增加 20%；参与击杀野生动物时恢复体力并获得移动速度，随后逐渐下降。' },
  7211301: { extraEffect: 'explosiveCactus', summary: '爆炸仙人掌（12.0）：转为核心潜能；对敌人造成伤害时附着 4 秒仙人掌，队友普攻或独立技能触发时造成 8~160+敌人体力上限 4% 的技能伤害；未触发时自动爆炸造成减少 70% 的伤害。' },
  7211401: { dmgAmp: 0.04, summary: '压迫感：自身 3m 内敌方实验体承受伤害增加 4%；叠加时每层效果减少 25%，上限 3 层。' },
  7100101: { extraEffect: 'diamondShard', summary: '金刚碎片：定身成功后防御力 +20+等级*5，结束时造成等级*10 的技能伤害。' },
  7100401: { summary: '天使护翼：获得体力上限 18% 的护盾，护盾破裂时解除负面效果并增加移动速度；不直接计入伤害。' },
  7100501: { extraEffect: 'penance', summary: '惩戒：满层普攻消耗叠层时按等级*15 造成技能伤害，并附带减速。' },
  7110101: { summary: '无惧感：使用技能或潜能获得护盾或体力恢复效果时，4 秒内防御力增加 5+等级*1。' },
  7110201: { summary: '特工队：周围 3.5m 内没有队友时，承受伤害减少 4%。' },
  7110401: { summary: '钢化：负面效果抵御增加 12+等级*0.4%。' },
  7110701: { summary: '不屈：使用终极技能时获得 等级*15 的护盾，持续 3 秒。' },
  7111001: { summary: '镇痛剂：随着体力降低增加防御力，体力低于 40% 以下时防御力逐渐达到最大值 12%。' },
  7111101: { summary: '警戒心：体力低于 75% 时受到敌方实验体伤害，1.5 秒内所受伤害减少 5+等级*0.5%。' },
  7111201: { summary: '淬火：进入第二天白天时防御力增加 3，此后每 80 秒防御力增加 1。' }
};
const HEROES = [
  ...MANUAL_HEROES,
  ...CHARACTERS.map((character) => character.name).filter((name) => !MANUAL_HEROES.includes(name))
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
// 哪些装备特效需要开关，现在由 itemEffectDamage.json / itemEffectModifiers.json 的 toggle 声明，
// 不再在这里硬编码效果名（原来的 BLAZING_SKILL_AMP_EFFECTS 把三种不同的炽燃混成了一个开关）。
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
const INITIAL_EQUIPMENT = EQUIPMENT_DATA.equipment?.length ? EQUIPMENT_DATA.equipment : DEFAULT_EQUIPMENT;
const ITEM_STAT_DEFINITIONS = EQUIPMENT_DATA.itemStatDefinitions || [];
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
  { name: '6级 T 血量2080 防御131', hp: 2080, defense: 131, defenseReduction: 0, reduction: 0, targetMastery: 1 },
  { name: '15级 T 血量3110 防御156', hp: 3110, defense: 156, defenseReduction: 0, reduction: 0, targetMastery: 1 },
  { name: '15级 T 血量3160 防御166', hp: 3160, defense: 166, defenseReduction: 0, reduction: 0, targetMastery: 1 },
  { name: '20级 T 血量4110 防御187', hp: 4110, defense: 187, defenseReduction: 0, reduction: 0, targetMastery: 1 },
  { name: '20级 T 血量4110 防御212', hp: 4110, defense: 212, defenseReduction: 0, reduction: 0, targetMastery: 1 }
];
const TARGET_MASTERY_LEVELS = Array.from({ length: 20 }, (_, index) => index + 1);
const COMPARISON_STAT_METRICS = [
  { key: 'ap', label: '最终法强' },
  { key: 'attackPower', label: '攻击力' },
  { key: 'baseAttackPower', label: '基础攻击' },
  { key: 'extraAttackPower', label: '额外攻击' },
  { key: 'pen', label: '防穿数值' },
  { key: 'penPct', label: '防穿%' },
  { key: 'totalDamageBonus', label: '伤害提升%' },
  { key: 'basicAttack', label: '每发平A预估' },
  { key: 'finalMod', label: '最终伤害倍率' }
];
const DEFAULT_COMPARISON_METRICS = ['ap', 'basicAttack'];
const DEFAULT_COMPARISON_SETTINGS = {
  masteryStart: 1,
  masteryEnd: 20,
  masteryStep: 1,
  target: TARGETS[0],
  targetMastery: 1,
  selfHp: 2514,
  damageBonus: 0,
  skillReduction: 0,
  includeSkills: true,
  groupRowsByMastery: false,
  selectedMetrics: DEFAULT_COMPARISON_METRICS
};

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

function normalizeConfigPayload(config = {}) {
  return {
    equipment: mergeEquipment(config.equipment),
    skills: mergeSkills(config.skills),
    talents: Array.isArray(config.talents) ? config.talents : clone(DEFAULT_TALENTS),
    combos: mergeCombos(config.combos)
  };
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

/**
 * 需要界面开关的装备特效（叠层类、条件触发类）。两张表里凡是写了 toggle 的都算，
 * 按效果名去重 —— 装上带该效果的装备后，对应开关才会出现。
 */
const EFFECT_TOGGLE_LABELS = new Map(
  [...(ITEM_EFFECT_DAMAGE.effects || []), ...(ITEM_EFFECT_MODIFIERS.effects || [])]
    .filter((effect) => effect.toggle)
    .map((effect) => [effect.name, effect.toggle.label || effect.name])
);

function toggleableEffectsFor(items) {
  const equipped = new Set(items.flatMap((item) => uniqueEffectsForItem(item)));
  return [...EFFECT_TOGGLE_LABELS.entries()]
    .filter(([name]) => equipped.has(name))
    .map(([name, label]) => ({ name, label }));
}

/** 声明了开关但没勾上的效果不参与计算 */
const effectEnabled = (effect, effectToggles = {}) => !effect.toggle || Boolean(effectToggles[effect.name]);

/** 开关的悬停说明：把该效果在两张表里的 note 拼起来 */
function effectToggleHint(name) {
  return [...(ITEM_EFFECT_DAMAGE.effects || []), ...(ITEM_EFFECT_MODIFIERS.effects || [])]
    .filter((effect) => effect.name === name)
    .map((effect) => effect.note)
    .filter(Boolean)
    .join('\n');
}

/**
 * 已装备装备的独有效果伤害。公式表在 src/data/itemEffectDamage.json，
 * 变量和技能公式共用一套（ap / attack / extraAttack / targetHp / maxHp / extraHp / heroLevel）。
 * 只列出真的装上了的效果，没装的不显示。
 */
function equipmentEffectDamages(items, context, effectToggles = {}) {
  const equippedNames = new Set(items.flatMap((item) => uniqueEffectsForItem(item)));
  const owners = new Map();
  for (const item of items) {
    for (const name of uniqueEffectsForItem(item)) {
      if (!owners.has(name)) owners.set(name, []);
      owners.get(name).push(item.name);
    }
  }

  const SUFFIX = { true: '(真伤)', shield: '(护盾)', skill: '(技)' };
  return (ITEM_EFFECT_DAMAGE.effects || [])
    .filter((effect) => equippedNames.has(effect.name) && effectEnabled(effect, effectToggles))
    .map((effect) => {
      const raw = damageFloor(evaluateFormula(effect.formula, { ...context, base: 0, level: 1 }));
      // 真实伤害和护盾不吃防御与减伤，技能伤害走最终倍率
      const flat = effect.damageType === 'true' || effect.damageType === 'shield';
      const single = flat ? raw : damageFloor(raw * context.finalMod);
      const hits = Math.max(1, getNumber(effect.hits) || 1);
      const from = (owners.get(effect.name) || []).join('、');
      return {
        title: `${effect.label || effect.name}${SUFFIX[effect.damageType] || '(技)'}${hits > 1 ? ` ×${hits}` : ''}`,
        raw: raw * hits,
        value: single * hits,
        // 护盾不是伤害，不进「特效小计」
        excludeFromSubtotal: effect.damageType === 'shield',
        note: [effect.coefficientText, hits > 1 ? `单次 ${single}，共 ${hits} 次` : '', effect.note, from ? `来自 ${from}` : '']
          .filter(Boolean).join('；')
      };
    });
}

/**
 * 已装备装备的独有效果**修正项**（增伤、攻击力、防御穿透、目标减防…）。
 * 表在 src/data/itemEffectModifiers.json，取代原来散在代码里的魔法数字
 *（那批常量已经和官方数值脱节：炽燃-增幅本是「每层技能伤害+2.5%」，却被写成了 +24 法强）。
 */
function equipmentEffectModifiers(items, { effectToggles = {}, targetHpRatio = 1 } = {}) {
  const equipped = new Set(items.flatMap((item) => uniqueEffectsForItem(item)));
  const total = {
    ap: 0, attackPower: 0, attackPowerPct: 0, damageBonus: 0,
    pen: 0, penPct: 0, targetDefensePct: 0, cd: 0, basicAttackBonus: 0
  };
  const applied = [];

  for (const effect of ITEM_EFFECT_MODIFIERS.effects || []) {
    if (!equipped.has(effect.name)) continue;
    if (!effectEnabled(effect, effectToggles)) continue;
    const below = effect.condition?.targetHpBelow;
    if (below !== undefined && targetHpRatio >= below) continue;
    for (const [key, value] of Object.entries(effect.modifiers || {})) {
      if (total[key] === undefined) continue;
      total[key] += getNumber(value);
    }
    if (Object.keys(effect.modifiers || {}).length) applied.push(effect);
  }
  return { ...total, applied };
}

function itemDirectStatValue(item, key) {
  const stats = item?.stats || {};
  const directValue = statValue(stats, key);
  if (directValue) return directValue;

  const aliases = {
    attackPower: 'attackPower',
    skillAmp: 'ap',
    cooldownReduction: 'cd',
    defense: 'defense',
    maxHp: 'maxHp',
    sightRange: 'sightRange',
    penetrationDefense: 'pen',
    penetrationDefenseRatio: 'penPct',
    skillAmpRatio: 'apPct'
  };

  if (key === 'uniqueSkillAmpRatio' && item?.uniqueApPct) return getNumber(item.apPct);
  return aliases[key] ? getNumber(item[aliases[key]]) : 0;
}

function itemDisplayStats(item, masteryLevel = 0) {
  const rows = DISPLAYABLE_ITEM_STAT_DEFINITIONS
    .map((stat) => {
      const value = itemDirectStatValue(item, stat.key);
      return value ? {
        key: stat.key,
        label: displayItemStatLabel(stat),
        value: formatStatValue(stat.key, value)
      } : null;
    })
    .filter(Boolean);

  Object.entries(LEVEL_SCALING_STAT_TARGETS).forEach(([levelKey, targetKey]) => {
    const perLevel = statValue(item?.stats, levelKey);
    if (!perLevel) return;
    const level = Math.max(0, getNumber(masteryLevel));
    const stat = ITEM_STAT_BY_KEY[levelKey] || ITEM_STAT_BY_KEY[targetKey] || { key: levelKey, label: levelKey };
    const targetStat = ITEM_STAT_BY_KEY[targetKey] || { key: targetKey, label: targetKey };
    rows.push({
      key: levelKey,
      label: displayItemStatLabel(stat),
      value: `${formatStatValue(targetKey, perLevel)} / 级`,
      note: `${level}级合计 ${displayItemStatLabel(targetStat)} ${formatStatValue(targetKey, perLevel * level)}`
    });
  });

  return rows;
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
    const defaultFileConfig = DEFAULT_LOCAL_CONFIG || {};
    if (EXPORTED_LOCAL_CONFIG) {
      return normalizeConfigPayload(EXPORTED_LOCAL_CONFIG);
    }
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return normalizeConfigPayload({
      equipment: saved?.equipment || defaultFileConfig.equipment,
      skills: saved?.skills || defaultFileConfig.skills,
      talents: saved?.talents || defaultFileConfig.talents,
      combos: saved?.combos || defaultFileConfig.combos
    });
  } catch {
    return normalizeConfigPayload(EXPORTED_LOCAL_CONFIG || DEFAULT_LOCAL_CONFIG || {});
  }
}

function loadAppSettings() {
  try {
    return JSON.parse(window.localStorage.getItem(APP_SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
}

function loadWorkspaceState() {
  try {
    return JSON.parse(window.localStorage.getItem(WORKSPACE_STATE_KEY)) || {};
  } catch {
    return {};
  }
}

function normalizeComparisonScenario(scenario, fallbackGear = DEFAULT_GEAR, index = 0) {
  return {
    id: scenario?.id || `scenario-${Date.now()}-${index}`,
    name: String(scenario?.name || `方案 ${index + 1}`),
    gear: { ...fallbackGear, ...(scenario?.gear || {}) },
    // vampireFull 是潜能开关；其余键是装备特效名，由 itemEffect*.json 的 toggle 声明决定。
    // 老方案存的 blazingFull / magicSeedFull / conditionalDamageAmpActive 在这里迁移成效果名。
    effectToggles: migrateScenarioToggles(scenario?.effectToggles)
  };
}

function migrateScenarioToggles(saved) {
  const out = {};
  for (const [key, value] of Object.entries(saved || {})) {
    if (!value) continue;
    if (key === 'blazingFull') {
      ['炽燃 - 增幅', '炽燃 - 激燃', '炽燃 - 强化', '炽燃 - 耐性', '粉碎'].forEach((name) => { out[name] = true; });
    } else if (key === 'magicSeedFull') out['魔力种子'] = true;
    else if (key === 'conditionalDamageAmpActive') out['光辉'] = true;
    else out[key] = true;
  }
  return out;
}

function normalizeComparisonSettings(settings) {
  return {
    ...DEFAULT_COMPARISON_SETTINGS,
    ...(settings || {}),
    target: { ...TARGETS[0], ...(settings?.target || {}) },
    masteryStart: Math.max(1, Math.min(20, getNumber(settings?.masteryStart) || DEFAULT_COMPARISON_SETTINGS.masteryStart)),
    masteryEnd: Math.max(1, Math.min(20, getNumber(settings?.masteryEnd) || DEFAULT_COMPARISON_SETTINGS.masteryEnd)),
    masteryStep: Math.max(1, Math.min(20, getNumber(settings?.masteryStep) || DEFAULT_COMPARISON_SETTINGS.masteryStep)),
    targetMastery: Math.max(1, Math.min(20, getNumber(settings?.targetMastery) || DEFAULT_COMPARISON_SETTINGS.targetMastery)),
    selectedMetrics: Array.isArray(settings?.selectedMetrics) && settings.selectedMetrics.length
      ? settings.selectedMetrics
      : DEFAULT_COMPARISON_METRICS,
    includeSkills: settings?.includeSkills ?? DEFAULT_COMPARISON_SETTINGS.includeSkills,
    groupRowsByMastery: settings?.groupRowsByMastery ?? DEFAULT_COMPARISON_SETTINGS.groupRowsByMastery
  };
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

async function exportConfig(config) {
  const response = await fetch(CONFIG_EXPORT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config })
  });
  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.ok) {
    throw new Error(result?.error || '导出失败');
  }

  return result;
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
      cd: bonus.cd + getNumber(effect.cd),
      dmgAmp: bonus.dmgAmp + getNumber(effect.dmgAmp) + (effect.dynamicDamage === 'burst' ? burstBonus : 0),
      defense: bonus.defense + getNumber(effect.defense),
      maxHp: bonus.maxHp + getNumber(effect.maxHp),
      effectIds: effect.extraEffect ? [...bonus.effectIds, effect.extraEffect] : bonus.effectIds,
      summaries: effect.summary ? [...bonus.summaries, `${trait.name}: ${effect.summary}`] : bonus.summaries
    };
  }, { ap: 0, pen: 0, penPct: 0, cd: 0, dmgAmp: 0, defense: 0, maxHp: 0, effectIds: [], summaries: [] });
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
    bonuses.cd ? `冷却缩减 +${round(bonuses.cd, 1)}` : '',
    bonuses.dmgAmp ? `技伤 +${pct(bonuses.dmgAmp)}` : '',
    bonuses.defense ? `防御 +${round(bonuses.defense, 1)}` : '',
    bonuses.maxHp ? `生命 +${round(bonuses.maxHp, 1)}` : ''
  ].filter(Boolean);
}

function byName(equipment, name) {
  return equipment.find((item) => item.name === name);
}

function calculatedTraitBonusSummaryItems(result) {
  const bonuses = result?.traitBonuses || {};
  const items = [
    result?.talentBonusAp ? `法强 +${round(result.talentBonusAp, 1)}` : '',
    result?.talentBonusAttackPower ? `攻击力 +${round(result.talentBonusAttackPower, 1)}` : '',
    result?.vampireStackAp ? `吸血鬼满层法强 +${round(result.vampireStackAp, 1)}` : '',
    result?.vampireStackAttackPower ? `吸血鬼满层攻击 +${round(result.vampireStackAttackPower, 1)}` : '',
    bonuses.pen ? `防穿 +${round(bonuses.pen, 1)}` : '',
    bonuses.penPct ? `防穿 ${pct(bonuses.penPct)}` : '',
    bonuses.cd ? `冷却缩减 +${round(bonuses.cd, 1)}` : '',
    result?.potentialDamageBonus ? `技伤 +${pct(result.potentialDamageBonus)}` : '',
    result?.talentBonusDefense ? `防御 +${round(result.talentBonusDefense, 1)}` : '',
    bonuses.maxHp ? `生命 +${round(bonuses.maxHp, 1)}` : ''
  ].filter(Boolean);

  return items.length ? items : traitBonusSummaryItems(bonuses);
}

function primaryOffensePath({ skills = [], masteryStat = null } = {}) {
  const hasAttackPowerMastery = masteryOptionValue(masteryStat, 'AttackPower') > 0;
  const hasBasicAttackMastery = masteryOptionValue(masteryStat, 'IncreaseBasicAttackDamageRatio') > 0;
  const hasSkillAmpMastery = masteryOptionValue(masteryStat, 'SkillAmpRatio') > 0;
  const hasAttackMastery = hasAttackPowerMastery || hasBasicAttackMastery;
  if (hasAttackMastery && !hasSkillAmpMastery) return 'attack';
  if (hasSkillAmpMastery && !hasAttackMastery) return 'ap';

  const usesAttack = skills.some((skill) => formulaUsesVariable(skill.formula, 'attack'));
  const usesAp = skills.some((skill) => formulaUsesVariable(skill.formula, 'ap'));
  if (usesAttack && !usesAp) return 'attack';
  if (usesAp && !usesAttack) return 'ap';

  return 'ap';
}

function calculateBasicAttackDamage({
  attackPower,
  target,
  armorPenetration,
  armorPenetrationRatio,
  damageIncreaseRatio,
  targetDamageReductionRatio,
  criticalStrikeChance,
  criticalStrikeDamage
}) {
  const finalDefense = target.defense * (1 - target.defenseReduction) * (1 - armorPenetrationRatio) - armorPenetration;
  const defenseMod = 100 / (100 + finalDefense);
  const damageMod = 1 + damageIncreaseRatio - targetDamageReductionRatio;
  const normalRaw = attackPower * defenseMod * damageMod;
  const normal = damageFloor(normalRaw);
  const criticalMultiplier = 1.75 + criticalStrikeDamage;
  const chance = Math.max(0, Math.min(1, criticalStrikeChance));

  return {
    finalDefense,
    defenseMod,
    damageMod,
    normal,
    critical: damageFloor(normal * criticalMultiplier),
    criticalMultiplier,
    criticalStrikeChance: chance,
    criticalStrikeDamage,
    damageIncreaseRatio,
    targetDamageReductionRatio
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

function calc({
  equipment,
  skillTable,
  skillLevels,
  gear,
  mastery,
  masteryStat,
  attack,
  baseDefense = 0,
  talentAp,
  traitBonuses = {},
  selectedTraits = [],
  target,
  targetMastery,
  targetHpPct = 100,
  selfHp,
  selfShield = 0,
  damageBonus,
  skillReduction,
  r2Stacks,
  tacticalSkill,
  tacticalUpgraded,
  vampireFull,
  effectToggles = {},
  selectedHero,
  combos = []
}) {
  const selected = SLOTS.map((slot) => byName(equipment, gear[slot])).filter(Boolean);
  const equipmentStats = aggregateEquipmentStats(selected, mastery);
  const activeTraitEffectIds = new Set(traitBonuses.effectIds || []);
  const talentPen = getNumber(traitBonuses.pen);
  const talentPenPct = getNumber(traitBonuses.penPct);
  const talentDamageBonus = getNumber(traitBonuses.dmgAmp);
  const equipAp = statValue(equipmentStats, 'skillAmp') + statValue(equipmentStats, 'adaptiveForce') || selected.reduce((sum, item) => sum + getNumber(item.ap), 0);
  const equipAttackPower = statValue(equipmentStats, 'attackPower');
  const selectedHeroSkillRows = skillTable.filter((skill) => skill.hero === selectedHero);
  const offensePath = primaryOffensePath({ skills: selectedHeroSkillRows, masteryStat });
  const usesAttackPath = offensePath === 'attack';
  const vampireStackAp = usesAttackPath ? 0 : (vampireFull ? 30 + mastery : 0);
  const vampireStackAttackPower = usesAttackPath && vampireFull ? 15 + mastery * 0.5 : 0;
  // 装备独有效果的修正项统一从 itemEffectModifiers.json 取，不再散落成魔法数字
  const effectMods = equipmentEffectModifiers(selected, {
    effectToggles,
    targetHpRatio: Math.max(0, Math.min(1, getNumber(targetHpPct) / 100))
  });
  const stackAp = vampireStackAp + effectMods.ap;
  const stackAttackPower = vampireStackAttackPower + effectMods.attackPower;
  const stackCd = effectMods.cd;
  const cd = (statValue(equipmentStats, 'cooldownReduction') || selected.reduce((sum, item) => sum + getNumber(item.cd), 0)) + stackCd + getNumber(traitBonuses.cd);
  const concentrationAp = activeTraitEffectIds.has('concentration') && !usesAttackPath ? 32 : 0;
  const concentrationAttackPower = activeTraitEffectIds.has('concentration') && usesAttackPath ? 16 : 0;
  const huntBearAp = activeTraitEffectIds.has('huntBear') && !usesAttackPath ? 20 : 0;
  const huntBearAttackPower = activeTraitEffectIds.has('huntBear') && usesAttackPath ? 10 : 0;
  const rapidShotAp = activeTraitEffectIds.has('rapidShot') && !usesAttackPath ? 4 + mastery : 0;
  const rapidShotAttackPower = activeTraitEffectIds.has('rapidShot') && usesAttackPath ? 2 + mastery * 0.5 : 0;
  const rChargerAp = activeTraitEffectIds.has('rCharger') && !usesAttackPath ? 10 + mastery : 0;
  const rChargerAttackPower = activeTraitEffectIds.has('rCharger') && usesAttackPath ? 5 + mastery * 0.5 : 0;
  const overclockAp = activeTraitEffectIds.has('overclock') && cd >= 40 && !usesAttackPath ? 10 : 0;
  const overclockAttackPower = activeTraitEffectIds.has('overclock') && cd >= 40 && usesAttackPath ? 5 : 0;
  // 12.0：超再生不再给予被护盾/治疗目标适应力，因此不再计入攻击力或技能增幅
  const talentBonusAp = getNumber(traitBonuses.ap) + concentrationAp + huntBearAp + rapidShotAp + rChargerAp + overclockAp;
  const talentBonusAttackPower = concentrationAttackPower + huntBearAttackPower + rapidShotAttackPower + rChargerAttackPower + overclockAttackPower;
  const pen = statValue(equipmentStats, 'penetrationDefense') + statValue(equipmentStats, 'uniquePenetrationDefense') + talentPen || selected.reduce((sum, item) => sum + getNumber(item.pen), 0) + talentPen;
  const penPct = statValue(equipmentStats, 'penetrationDefenseRatio') + statValue(equipmentStats, 'uniquePenetrationDefenseRatio') + talentPenPct || selected.reduce((sum, item) => sum + getNumber(item.penPct), 0) + talentPenPct;
  const dynamicTraitDefense = activeTraitEffectIds.has('diamondShard') ? 20 + mastery * 5 : 0;
  const talentBonusDefense = getNumber(traitBonuses.defense) + dynamicTraitDefense;
  const equipDefense = (statValue(equipmentStats, 'defense') || selected.reduce((sum, item) => sum + getNumber(item.defense), 0)) + talentBonusDefense;
  const extraHp = statValue(equipmentStats, 'maxHp') + getNumber(traitBonuses.maxHp);
  const normalApPct = 0;
  const uniqueApPct = Math.max(statValue(equipmentStats, 'uniqueSkillAmpRatio'), ...selected.filter((item) => item.uniqueApPct).map((item) => getNumber(item.apPct)));
  const equipDamageBonus = selected.reduce((sum, item) => (
    sum + (hasConditionalDamageAmp(item) && !effectToggles['光辉'] ? 0 : getNumber(item.dmgAmp))
  ), 0);
  const masteryApPct = mastery * masteryOptionValue(masteryStat, 'SkillAmpRatio');
  const masteryAttackPower = mastery * masteryOptionValue(masteryStat, 'AttackPower');
  const masteryBasicAttackDamageRatio = mastery * masteryOptionValue(masteryStat, 'IncreaseBasicAttackDamageRatio');
  const baseAttackPower = attack + masteryAttackPower;
  const extraAttackPower = equipAttackPower + talentBonusAttackPower + stackAttackPower;
  // 攻击力百分比加成（神速-鲁德拉的短剑、双重假面）作用在总攻击力上
  const attackPower = (baseAttackPower + extraAttackPower) * (1 + effectMods.attackPowerPct);
  const totalApPct = normalApPct + uniqueApPct + masteryApPct;
  const totalBaseAp = equipAp + talentAp + talentBonusAp + stackAp;
  const apRaw = totalBaseAp * (1 + totalApPct);
  const ap = damageFloor(apRaw);
  // 粉碎 / 邪恶之雾之类的减防和目标自身的减防叠乘；雷鸣裁决的穿透加进固定穿透
  const finalDefense = target.defense
    * (1 - target.defenseReduction)
    * (1 - effectMods.targetDefensePct)
    * (1 - penPct - effectMods.penPct) - pen - effectMods.pen;
  const defenseMod = 100 / (100 + finalDefense);
  const enhancementDeviceDamageBonus = activeTraitEffectIds.has('enhancementDevice') ? 0.08 + mastery * 0.005 : 0;
  const potentialDamageBonus = talentDamageBonus + enhancementDeviceDamageBonus;
  const totalDamageBonus = damageBonus + equipDamageBonus + potentialDamageBonus + effectMods.damageBonus;
  const targetMasteryLevel = Math.max(1, Math.min(20, getNumber(targetMastery) || 1));
  const targetMasterySkillReduction = targetMasteryLevel <= 1 ? 0 : targetMasteryLevel * 0.008;
  const targetMasteryBasicReduction = targetMasteryLevel <= 1 ? 0 : targetMasteryLevel * 0.01;
  const totalSkillReduction = skillReduction + targetMasterySkillReduction;
  const damageMod = 1 + totalDamageBonus - target.reduction - totalSkillReduction;
  const finalMod = defenseMod * damageMod;
  const stackCount = Math.min(stackLimitForHero(selectedHero, selectedHeroSkillRows), Math.max(0, r2Stacks));
  const basicAttackDamageIncreaseRatio = totalDamageBonus
    + statValue(equipmentStats, 'increaseBasicAttackDamageRatio')
    + masteryBasicAttackDamageRatio
    + effectMods.basicAttackBonus;
  const basicAttackTargetReductionRatio = target.reduction + targetMasteryBasicReduction;
  const basicAttackDamage = calculateBasicAttackDamage({
    attackPower,
    target,
    armorPenetration: pen,
    armorPenetrationRatio: penPct,
    damageIncreaseRatio: basicAttackDamageIncreaseRatio,
    targetDamageReductionRatio: basicAttackTargetReductionRatio,
    criticalStrikeChance: statValue(equipmentStats, 'criticalStrikeChance'),
    criticalStrikeDamage: statValue(equipmentStats, 'criticalStrikeDamage')
  });
  // heroLevel = 界面「熟练度等级」，即实验体等级 1~20，供公式里的等级线性项使用
  // maxHp = 界面「自身血量」；extraHp = 装备与潜能提供的额外体力，官方文案里这两者是分开写的
  // targetCurrentHp / targetLostHp 由界面的「目标当前体力%」推出，两者之和恒等于目标体力上限
  const targetHpRatio = Math.max(0, Math.min(1, getNumber(targetHpPct) / 100));
  const selfDefense = getNumber(baseDefense) + equipDefense;
  const context = {
    ap,
    attack: attackPower,
    extraAttack: extraAttackPower,
    targetHp: target.hp,
    targetCurrentHp: target.hp * targetHpRatio,
    targetLostHp: target.hp * (1 - targetHpRatio),
    maxHp: selfHp,
    extraHp,
    defense: selfDefense,
    shield: getNumber(selfShield),
    critChance: statValue(equipmentStats, 'criticalStrikeChance'),
    stacks: stackCount,
    heroLevel: mastery,
    finalMod
  };
  const heroSkills = selectedHeroSkillRows
    .map((skill) => calculateSkill(skill, skillLevels[skill.id], context));
  // 强化普攻类技能：给下一次普攻加一段额外伤害，单独归到「强化普攻」栏
  const basicAttackSkills = heroSkills.filter((skill) => skill.kind === 'basicAttack');
  const basicAttackBonusRaw = basicAttackSkills.reduce((sum, skill) => sum + getNumber(skill.rawDamage), 0);
  const basicAttackBonus = basicAttackSkills.reduce((sum, skill) => sum + getNumber(skill.damage), 0);
  const hpDiffRatio = Math.min(0.4, Math.max(0.1, (target.hp - selfHp) / selfHp));
  const burstBonus = Math.min(0.1, Math.max(0, (target.hp - selfHp) / selfHp) * 0.25);
  const curse = 50 + ap * 0.15;
  const scarBase = 10 + mastery + target.hp * 0.03;
  const tearBase = 10 + mastery * 2 + target.hp * 0.08;
  const thunderFormula = adaptiveOffenseFormula({ base: 30 + mastery * 2, extraAttack: extraAttackPower, attackRatio: 0.45, ap, apRatio: 0.26 });
  const vortexFormula = adaptiveOffenseFormula({ base: mastery * 5, extraAttack: extraAttackPower, attackRatio: 0.8, ap, apRatio: 0.4 });
  // 12.0：爆炸仙人掌 10~150(+体力上限5%) -> 8~160(+体力上限4%)，并转为核心潜能
  const cactusBase = 8 + Math.max(0, mastery - 1) * (152 / 19) + target.hp * 0.04;
  const diamondShardBase = mastery * 10;
  const penanceBase = mastery * 15;
  const effects = [
    activeTraitEffectIds.has('absoluteForce')
      ? { title: '绝对武力(真伤)', raw: damageFloor(20 + mastery * 5), value: damageFloor(20 + mastery * 5), note: '20+实验体等级*5；防御降低 15% 需手动在目标栏设置。' }
      : null,
    activeTraitEffectIds.has('stardust')
      ? { title: '星尘蓄势(真伤)', raw: damageFloor(30 + mastery * 2), value: damageFloor(30 + mastery * 2), note: '对实验体/召唤物：30+等级*2；野生动物为两倍。' }
      : null,
    activeTraitEffectIds.has('thunder')
      ? { title: '霹雳(技)', raw: damageFloor(thunderFormula.value), value: damageFloor(damageFloor(thunderFormula.value) * finalMod), note: `30+等级*2+额外攻击力45%或技能增幅26%；当前按${thunderFormula.route}计算；5m外+20%未默认计入。` }
      : null,
    activeTraitEffectIds.has('vortex')
      ? { title: '涡流(技)', raw: damageFloor(vortexFormula.value), value: damageFloor(damageFloor(vortexFormula.value) * finalMod), note: `等级*5+额外攻击力80%或技能增幅40%；当前按${vortexFormula.route}计算。` }
      : null,
    activeTraitEffectIds.has('diamondShard')
      ? { title: '金刚碎片(技)', raw: damageFloor(diamondShardBase), value: damageFloor(damageFloor(diamondShardBase) * finalMod), note: '等级*10；防御力增益已计入当前防御。' }
      : null,
    activeTraitEffectIds.has('penance')
      ? { title: '惩戒(技)', raw: damageFloor(penanceBase), value: damageFloor(damageFloor(penanceBase) * finalMod), note: '满层普攻触发：等级*15。' }
      : null,
    activeTraitEffectIds.has('scar')
      ? { title: '伤痕(技)', raw: damageFloor(scarBase), value: damageFloor(damageFloor(scarBase) * finalMod), note: '10+等级+目标血量*3%' }
      : null,
    activeTraitEffectIds.has('tear')
      ? { title: '伤口撕裂', raw: damageFloor(tearBase), value: damageFloor(damageFloor(tearBase) * finalMod), note: '10+等级*2+目标当前体力*8%' }
      : null,
    activeTraitEffectIds.has('explosiveCactus')
      ? { title: '爆炸仙人掌(技)', raw: damageFloor(cactusBase), value: damageFloor(damageFloor(cactusBase) * finalMod), note: '队友普攻/独立技能触发：8~160+敌人体力上限4%；未触发自动爆炸为减少70%的伤害。' }
      : null
  ].filter(Boolean);
  const ghostFire = adaptiveOffenseFormula({ base: 50 + mastery * 10, extraAttack: extraAttackPower, attackRatio: 0.7, ap, apRatio: 0.2 });
  if (activeTraitEffectIds.has('ghostFire')) {
    effects.push({ title: '鬼火(真伤)', raw: damageFloor(ghostFire.value), value: damageFloor(ghostFire.value), note: `50+等级*10+额外攻击力70%或技能增幅20%；当前按${ghostFire.route}计算。` });
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
  // 装备独有效果伤害（诅咒 / 腐化 / 破裂…）：只算当前真的装上的
  effects.push(...equipmentEffectDamages(selected, context, effectToggles));
  const damageEffects = effects.filter((effect) => !effect.excludeFromSubtotal);
  const effectSubtotalRaw = damageEffects.reduce((sum, effect) => sum + effect.raw, 0);
  const effectSubtotal = damageEffects.reduce((sum, effect) => sum + effect.value, 0);
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
    masteryBasicAttackDamageRatio,
    baseAttackPower,
    extraAttackPower,
    attackPower,
    talentAp,
    talentBonusAp,
    talentBonusAttackPower,
    talentBonusDefense,
    potentialDamageBonus,
    vampireStackAp,
    vampireStackAttackPower,
    stackAp,
    stackAttackPower,
    stackCd,
    selectedTalents: selectedTraits,
    traitBonuses,
    cd,
    pen,
    penPct,
    equipDefense,
    selfDefense,
    effectMods,
    basicAttackSkills,
    basicAttackBonusRaw,
    basicAttackBonus,
    // 公式上下文整体带出来，递增伤害等二次计算直接复用，不用逐个字段同步
    formulaContext: context,
    extraHp,
    normalApPct,
    uniqueApPct,
    masteryApPct,
    masteryStat,
    offensePath,
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
    basicAttackDamage,
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

function EquipmentItemHoverContent({ item, mastery, uiTheme }) {
  const stats = itemDisplayStats(item, mastery);
  const effects = uniqueEffectsForItem(item);
  const fallbackTooltip = stripMarkup(itemTooltip(item));

  return (
    <span className="equipmentItemHoverContent">
      <span className="equipmentItemHoverTitle">
        <strong style={{ color: qualityColor(item.quality, uiTheme) }}>{item.name}</strong>
        <small>{[item.type, item.weaponType, item.quality].filter(Boolean).join(' / ')}</small>
      </span>
      <span className="equipmentItemHoverSection">
        <b>属性</b>
        {stats.length ? stats.map((stat) => (
          <span className="equipmentItemStatRow" key={stat.key}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            {stat.note ? <small>{stat.note}</small> : null}
          </span>
        )) : <small>无可计算属性</small>}
      </span>
      <span className="equipmentItemHoverSection">
        <b>词条 / 独有效果</b>
        {effects.length ? effects.map((effect) => (
          <span className="equipmentItemEffectRow" key={effect}>
            <strong>{effect}</strong>
            <small>{effectTooltipForItem(item, effect) || '暂无详细说明'}</small>
          </span>
        )) : (
          fallbackTooltip ? <small>{fallbackTooltip}</small> : <small>无独有效果</small>
        )}
      </span>
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

function ComparisonChart({ rows, metricKey, metricLabel, selectedMastery, onSelectMastery }) {
  const [zoom, setZoom] = useState(1);
  const [hoverMastery, setHoverMastery] = useState(null);
  const chartViewportRef = useRef(null);
  const values = rows
    .map((row) => ({ ...row, value: getNumber(row.values[metricKey]) }))
    .filter((row) => Number.isFinite(row.value));
  const scenarios = Array.from(new Set(values.map((row) => row.scenarioName)));
  const allMasteries = Array.from(new Set(values.map((row) => row.mastery))).sort((left, right) => left - right);
  const rawMinX = Math.min(...values.map((row) => row.mastery), 1);
  const rawMaxX = Math.max(...values.map((row) => row.mastery), 20);
  const rawMinY = Math.min(...values.map((row) => row.value), 0);
  const rawMaxY = Math.max(...values.map((row) => row.value), 1);
  const width = 720;
  const height = 260;
  const padLeft = 58;
  const padRight = 18;
  const padTop = 30;
  const padBottom = 40;
  const colors = ['#ffd56b', '#81caff', '#8de1ad', '#ff8b8b', '#ccb6ff', '#f7a85c'];
  const rawSpanX = rawMaxX - rawMinX || 1;
  const rawSpanY = rawMaxY - rawMinY || 1;
  const zoomedSpanX = rawSpanX / zoom;
  const zoomedSpanY = rawSpanY / zoom;
  const centerX = (rawMinX + rawMaxX) / 2;
  const centerY = (rawMinY + rawMaxY) / 2;
  const minX = centerX - zoomedSpanX / 2;
  const maxX = centerX + zoomedSpanX / 2;
  const minY = centerY - zoomedSpanY / 2;
  const maxY = centerY + zoomedSpanY / 2;
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const plotLeft = padLeft;
  const plotRight = width - padRight;
  const plotTop = padTop;
  const plotBottom = height - padBottom;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;
  const scenarioColor = (scenarioName) => colors[Math.max(0, scenarios.indexOf(scenarioName)) % colors.length];
  const xFor = (value) => plotLeft + ((value - minX) / spanX) * plotWidth;
  const yFor = (value) => plotBottom - ((value - minY) / spanY) * plotHeight;
  const visibleValues = values.filter((row) => row.mastery >= minX && row.mastery <= maxX);
  const hoveredRows = hoverMastery == null
    ? []
    : values.filter((row) => row.mastery === hoverMastery && row.value >= minY && row.value <= maxY);
  const hoveredX = hoverMastery == null ? null : xFor(hoverMastery);
  const selectedX = selectedMastery == null ? null : xFor(selectedMastery);
  const xTicks = allMasteries.filter((level) => level >= Math.ceil(minX) && level <= Math.floor(maxX));
  const yTicks = Array.from({ length: 5 }, (_, index) => minY + (spanY * index) / 4);
  const formatAxisValue = (value) => round(value, Math.abs(value) < 10 ? 2 : 1);
  const clipId = `comparison-clip-${metricKey.replace(/[^a-z0-9_-]/gi, '-')}`;

  useEffect(() => {
    const viewport = chartViewportRef.current;
    if (!viewport) return undefined;

    function handleWheel(event) {
      if (!viewport.contains(event.target)) return;
      if (!event.altKey) return;
      event.preventDefault();
      event.stopPropagation();
      setZoom((currentZoom) => (
        Math.max(1, Math.min(6, currentZoom * (event.deltaY < 0 ? 1.18 : 1 / 1.18)))
      ));
    }

    document.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => document.removeEventListener('wheel', handleWheel, true);
  }, []);

  function nearestMasteryForEvent(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const svgX = ((event.clientX - rect.left) / rect.width) * width;
    const svgY = ((event.clientY - rect.top) / rect.height) * height;
    if (svgX < plotLeft || svgX > plotRight || svgY < plotTop || svgY > plotBottom || !allMasteries.length) {
      return null;
    }
    const masteryAtCursor = minX + ((svgX - plotLeft) / plotWidth) * spanX;
    return allMasteries.reduce((best, level) => (
      Math.abs(level - masteryAtCursor) < Math.abs(best - masteryAtCursor) ? level : best
    ), allMasteries[0]);
  }

  function handleMouseMove(event) {
    const nearest = nearestMasteryForEvent(event);
    if (nearest == null) {
      setHoverMastery(null);
      return;
    }
    setHoverMastery(nearest);
  }

  function handleChartClick(event) {
    const nearest = nearestMasteryForEvent(event);
    if (nearest != null) onSelectMastery?.(nearest);
  }

  if (!values.length) {
    return <div className="comparisonChartEmpty">选择至少一个可绘制指标后生成图表</div>;
  }

  return (
    <div className="comparisonChart">
      <div className="comparisonChartHead">
        <strong>{metricLabel}</strong>
        <span>随熟练度变化 · Alt+滚轮缩放 · {round(zoom, 2)}x</span>
      </div>
      <div className="comparisonChartViewport" ref={chartViewportRef}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${metricLabel} 对比图`}
        onMouseMove={handleMouseMove}
        onClick={handleChartClick}
        onMouseLeave={() => setHoverMastery(null)}
        style={{ '--chart-zoom': zoom }}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={plotLeft} y={plotTop} width={plotWidth} height={plotHeight} />
          </clipPath>
        </defs>
        {yTicks.map((tick) => (
          <g className="comparisonChartTick" key={`y-${tick}`}>
            <line x1={plotLeft} y1={yFor(tick)} x2={plotRight} y2={yFor(tick)} />
            <text x={plotLeft - 8} y={yFor(tick) + 4} textAnchor="end">{formatAxisValue(tick)}</text>
          </g>
        ))}
        {xTicks.map((tick) => (
          <g className="comparisonChartTick" key={`x-${tick}`}>
            <line x1={xFor(tick)} y1={plotTop} x2={xFor(tick)} y2={plotBottom} />
            <text x={xFor(tick)} y={height - 12} textAnchor="middle">{tick}</text>
          </g>
        ))}
        <line className="comparisonChartAxis" x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} />
        <line className="comparisonChartAxis" x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} />
        <text x={(plotLeft + plotRight) / 2} y={height - 2} textAnchor="middle">熟练度</text>
        <text x={plotLeft - 44} y={plotTop - 12}>{metricLabel}</text>
        {hoveredX != null && hoveredX >= plotLeft && hoveredX <= plotRight ? (
          <line className="comparisonChartGuideX" x1={hoveredX} y1={plotTop} x2={hoveredX} y2={plotBottom} />
        ) : null}
        {selectedX != null && selectedX >= plotLeft && selectedX <= plotRight ? (
          <line className="comparisonChartSelectedX" x1={selectedX} y1={plotTop} x2={selectedX} y2={plotBottom} />
        ) : null}
        {hoveredRows.map((row) => (
          <g className="comparisonChartHoverGuide" key={`${row.id}-guide`}>
            <line x1={plotLeft} y1={yFor(row.value)} x2={xFor(row.mastery)} y2={yFor(row.value)} />
            <circle cx={xFor(row.mastery)} cy={yFor(row.value)} r="6" style={{ '--line-color': scenarioColor(row.scenarioName) }} />
            <text x={plotLeft - 8} y={yFor(row.value) - 5} textAnchor="end">{formatAxisValue(row.value)}</text>
          </g>
        ))}
        <g clipPath={`url(#${clipId})`}>
        {scenarios.map((scenario, index) => {
          const scenarioValues = visibleValues
            .filter((row) => row.scenarioName === scenario)
            .sort((left, right) => left.mastery - right.mastery);
          const points = scenarioValues.map((row) => `${xFor(row.mastery)},${yFor(row.value)}`).join(' ');
          return <polyline key={scenario} points={points} style={{ '--line-color': colors[index % colors.length] }} />;
        })}
        {scenarios.flatMap((scenario, index) => (
          visibleValues
            .filter((row) => row.scenarioName === scenario)
            .map((row) => {
              const label = `${row.scenarioName} / 熟练度 ${row.mastery} / ${metricLabel} ${round(row.value, Math.abs(row.value) < 10 ? 2 : 1)}`;
              return (
                <circle
                  className="comparisonChartPoint"
                  key={`${row.id}-${metricKey}`}
                  cx={xFor(row.mastery)}
                  cy={yFor(row.value)}
                  r="5"
                  tabIndex="0"
                  aria-label={label}
                  style={{ '--line-color': colors[index % colors.length] }}
                >
                  <title>{label}</title>
                </circle>
              );
            })
        ))}
        </g>
      </svg>
      </div>
      {hoveredRows.length ? (
        <div className="comparisonChartHoverPanel">
          <strong>熟练度 {hoverMastery}</strong>
          {hoveredRows.map((row) => (
            <span key={`${row.id}-hover`} style={{ '--legend-color': scenarioColor(row.scenarioName) }}>
              {row.scenarioName}: {formatAxisValue(row.value)}
            </span>
          ))}
          <em>点击选中此熟练度</em>
        </div>
      ) : null}
      <div className="comparisonLegend">
        {scenarios.map((scenario, index) => (
          <span key={scenario} style={{ '--legend-color': colors[index % colors.length] }}>{scenario}</span>
        ))}
      </div>
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
  const character = CHARACTERS.find((item) => String(item.englishName || item.id || '').toLowerCase() === heroKey);
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

// 多段结算技能的分组：同一技能的各段伤害标题形如「R 沉睡之力 第3段」「R 记忆力 记忆-青鸟」，
// 取槽位后的第一个词当组名。段数 >= SEGMENTED_MIN 时改用压扁的多段视图。
const SEGMENTED_MIN = 3;

function skillSegmentGroupName(skill) {
  const title = String(skill?.title || '').replace(/^(EQ|EW|[PQWER])\s*/, '').trim();
  return title.split(/\s+/)[0] || title;
}

function skillSegmentLabel(skill, groupName) {
  const title = String(skill?.title || '').replace(/^(EQ|EW|[PQWER])\s*/, '').trim();
  const rest = title.startsWith(groupName) ? title.slice(groupName.length).trim() : title;
  return rest || groupName;
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

function characterDefenseAtLevel(character, level = 20) {
  if (!character) return 0;
  return damageFloor(getNumber(character.base?.defense) + getNumber(character.growth?.defense) * Math.max(0, level - 1));
}

export default function App() {
  const initialWorkspaceState = loadWorkspaceState();
  const initialAppSettings = loadAppSettings();
  const [{ equipment, skills, talents, combos }, setConfig] = useState(loadConfig);
  const [activePage, setActivePage] = useState(initialWorkspaceState.activePage || 'calculator');
  const [gear, setGear] = useState(() => ({ ...DEFAULT_GEAR, ...(initialWorkspaceState.gear || {}) }));
  const [weaponTypeFilter, setWeaponTypeFilter] = useState(initialWorkspaceState.weaponTypeFilter || '全部类型');
  const [selectedHero, setSelectedHero] = useState(initialWorkspaceState.selectedHero || DEFAULT_HERO);
  const [mastery, setMastery] = useState(getNumber(initialWorkspaceState.mastery) || 20);
  const [talentAp, setTalentAp] = useState(getNumber(initialWorkspaceState.talentAp));
  const [traitSelection, setTraitSelection] = useState(() => normalizeTraitSelection(initialWorkspaceState.traitSelection || DEFAULT_TRAIT_SELECTION));
  const [targetIndex, setTargetIndex] = useState(Number.isInteger(initialWorkspaceState.targetIndex) ? initialWorkspaceState.targetIndex : 0);
  const [target, setTarget] = useState(() => (initialWorkspaceState.target ? { ...TARGETS[0], ...initialWorkspaceState.target } : TARGETS[0]));
  const [targetMastery, setTargetMastery] = useState(getNumber(initialWorkspaceState.targetMastery) || 1);
  const [selfHp, setSelfHp] = useState(getNumber(initialWorkspaceState.selfHp) || 2514);
  const [selfShield, setSelfShield] = useState(getNumber(initialWorkspaceState.selfShield));
  // 目标当前体力 / 已失体力是同一件事的两面，两个框联动，和为 100%
  const [targetHpPct, setTargetHpPct] = useState(() => {
    const saved = getNumber(initialWorkspaceState.targetHpPct);
    return saved > 0 ? saved : 100;
  });
  const [damageBonus, setDamageBonus] = useState(getNumber(initialWorkspaceState.damageBonus));
  const [skillReduction, setSkillReduction] = useState(getNumber(initialWorkspaceState.skillReduction));
  const [r2Stacks, setR2Stacks] = useState(getNumber(initialWorkspaceState.r2Stacks) || 1);
  const [tacticalSkill, setTacticalSkill] = useState(initialWorkspaceState.tacticalSkill || '斥力弹');
  const [tacticalUpgraded, setTacticalUpgraded] = useState(initialWorkspaceState.tacticalUpgraded ?? true);
  const [vampireFull, setVampireFull] = useState(Boolean(initialWorkspaceState.vampireFull));
  // 装备特效开关按效果名存，哪些开关出现由 itemEffect*.json 的 toggle 声明决定。
  // 老版本存的是 blazingFull / magicSeedFull / conditionalDamageAmpActive 三个布尔，这里做一次迁移。
  const [effectToggles, setEffectToggles] = useState(() => {
    if (initialWorkspaceState.effectToggles) return initialWorkspaceState.effectToggles;
    const migrated = {};
    if (initialWorkspaceState.blazingFull) {
      ['炽燃 - 增幅', '炽燃 - 激燃', '炽燃 - 强化', '炽燃 - 耐性', '粉碎'].forEach((name) => { migrated[name] = true; });
    }
    if (initialWorkspaceState.magicSeedFull) migrated['魔力种子'] = true;
    if (initialWorkspaceState.conditionalDamageAmpActive) migrated['光辉'] = true;
    return migrated;
  });
  const [showBuildSettings, setShowBuildSettings] = useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [showHeroDebugSettings, setShowHeroDebugSettings] = useState(false);
  const [effectsCollapsed, setEffectsCollapsed] = useState(Boolean(initialWorkspaceState.effectsCollapsed));
  const [skillTargetCounts, setSkillTargetCounts] = useState(initialWorkspaceState.skillTargetCounts || {});
  const [useHeroAvatarPicker, setUseHeroAvatarPicker] = useState(() => Boolean(initialAppSettings.useHeroAvatarPicker));
  const [editMode, setEditMode] = useState(Boolean(initialAppSettings.editMode));
  const [showDamageTestHeroes, setShowDamageTestHeroes] = useState(Boolean(initialAppSettings.showDamageTestHeroes));
  const [uiTheme, setUiTheme] = useState(() => initialAppSettings.uiTheme || 'night');
  const [heroAvatarQuery, setHeroAvatarQuery] = useState(initialWorkspaceState.heroAvatarQuery || '');
  const [showLowerTierEquipment, setShowLowerTierEquipment] = useState(Boolean(initialWorkspaceState.showLowerTierEquipment));
  const [visibleStatKeys, setVisibleStatKeys] = useState(initialWorkspaceState.visibleStatKeys || DEFAULT_VISIBLE_STAT_KEYS);
  const [skillLevels, setSkillLevels] = useState(() => ({
    ...Object.fromEntries(INITIAL_SKILLS.map((skill) => [skill.id, skill.maxLevel])),
    ...(initialWorkspaceState.skillLevels || {})
  }));
  const [comparisonSettings, setComparisonSettings] = useState(() => normalizeComparisonSettings(initialWorkspaceState.comparisonSettings));
  const [comparisonScenarios, setComparisonScenarios] = useState(() => {
    const scenarios = Array.isArray(initialWorkspaceState.comparisonScenarios) ? initialWorkspaceState.comparisonScenarios : [];
    if (scenarios.length) return scenarios.map((scenario, index) => normalizeComparisonScenario(scenario, DEFAULT_GEAR, index));
    return [
      normalizeComparisonScenario({ id: 'current', name: '当前方案', gear: initialWorkspaceState.gear || DEFAULT_GEAR }, DEFAULT_GEAR, 0),
      normalizeComparisonScenario({ id: 'variant-1', name: '对比方案', gear: initialWorkspaceState.gear || DEFAULT_GEAR }, DEFAULT_GEAR, 1)
    ];
  });
  const [selectedComparisonMastery, setSelectedComparisonMastery] = useState(() => getNumber(initialWorkspaceState.selectedComparisonMastery) || null);
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
    window.localStorage.setItem(WORKSPACE_STATE_KEY, JSON.stringify({
      activePage,
      gear,
      weaponTypeFilter,
      selectedHero,
      mastery,
      talentAp,
      traitSelection,
      targetIndex,
      target,
      targetMastery,
      targetHpPct,
      selfHp,
      selfShield,
      damageBonus,
      skillReduction,
      r2Stacks,
      tacticalSkill,
      tacticalUpgraded,
      vampireFull,
      effectToggles,
      effectsCollapsed,
      skillTargetCounts,
      heroAvatarQuery,
      showLowerTierEquipment,
      visibleStatKeys,
      skillLevels,
      comparisonSettings,
      comparisonScenarios,
      selectedComparisonMastery
    }));
  }, [activePage, gear, weaponTypeFilter, selectedHero, mastery, talentAp, traitSelection, targetIndex, target, targetMastery, targetHpPct, selfHp, selfShield, damageBonus, skillReduction, r2Stacks, tacticalSkill, tacticalUpgraded, vampireFull, effectToggles, effectsCollapsed, skillTargetCounts, heroAvatarQuery, showLowerTierEquipment, visibleStatKeys, skillLevels, comparisonSettings, comparisonScenarios, selectedComparisonMastery]);

  useEffect(() => {
    window.localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify({ useHeroAvatarPicker, editMode, showDamageTestHeroes, uiTheme }));
  }, [useHeroAvatarPicker, editMode, showDamageTestHeroes, uiTheme]);

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
      setConfigDirty(false);
      setConfigSaveStatus('saved');
    } catch {
      setConfigSaveStatus('error');
    }
  }

  async function exportCurrentConfig() {
    if (!HELP_NOTES_EDITABLE) return;

    setConfigSaveStatus('exporting');
    try {
      await exportConfig({ equipment, skills, talents, combos });
      setConfigSaveStatus('exported');
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
  // 开关打开时列出全部实验体：没有伤害数据的（雪琳 / 米尔卡 / 卡洛琳）也要能选中，
  // 技能面板会显示「暂无技能数据」，方便对照官方数据面板补录。
  const visibleHeroNames = canShowExtendedHeroes
    ? HEROES
    : HEROES.filter((hero) => MANUAL_HEROES.includes(hero));
  const selectedCharacter = findCharacterByName(selectedHero);
  const selectedOfficialSkillGroups = (CHARACTER_DATA.skillGroups || []).filter((skill) => skill.hero === selectedHero);
  const heroPickerOptions = visibleHeroNames.map((hero) => ({
    name: hero,
    character: findCharacterByName(hero)
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
    setSelectedHero(visibleHeroNames[0] || DEFAULT_HERO);
  }, [selectedHero, showDamageTestHeroes, editMode]);
  // 叠层选择器：specialSkillRules.json 里配了就用配置，没配但该英雄有公式用到 stacks 就自动生成
  const stackSelector = stackSelectorForHero(selectedHero, skills.filter((skill) => skill.hero === selectedHero));
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
  // 「目标当前体力 / 已失体力 / 自身护盾」只在当前英雄的技能、或身上装备的特效公式里
  // 真的用到时才显示输入框，平时不占地方。
  const contextFieldsInUse = useMemo(() => {
    const equippedEffects = selectedEquipmentEffectsRaw.map((item) => item.effect);
    const formulas = [
      ...skills.filter((skill) => skill.hero === selectedHero).map((skill) => skill.formula),
      ...(ITEM_EFFECT_DAMAGE.effects || [])
        .filter((effect) => equippedEffects.includes(effect.name))
        .map((effect) => effect.formula)
    ].join(' ');
    // 刽子手这类「目标血量低于 X%」的触发条件也需要那两个框
    const needsTargetHp = (ITEM_EFFECT_MODIFIERS.effects || [])
      .some((effect) => equippedEffects.includes(effect.name) && effect.condition?.targetHpBelow !== undefined);
    return ['targetCurrentHp', 'targetLostHp', 'shield'].filter((name) => (
      new RegExp(`\\b${name}\\b`).test(formulas) || (needsTargetHp && name !== 'shield')
    ));
  }, [skills, selectedHero, selectedEquipmentEffectsRaw]);
  const hasVampireStackTrait = selectedTraits.some((trait) => String(trait.id) === VAMPIRE_STACK_TRAIT_ID || trait.name === '吸血鬼');
  const effectiveVampireFull = hasVampireStackTrait && vampireFull;
  // 当前装备里需要开关的特效；换装后开关跟着变
  const availableEffectToggles = useMemo(() => toggleableEffectsFor(selectedGearItems), [selectedGearItems]);
  // 只把「装备还在身上」的开关传下去，脱装后自动失效
  const activeEffectToggles = useMemo(() => Object.fromEntries(
    availableEffectToggles.filter((item) => effectToggles[item.name]).map((item) => [item.name, true])
  ), [availableEffectToggles, effectToggles]);

  function comparisonScenarioGearItems(scenario) {
    return SLOTS.map((slot) => byName(equipment, scenario.gear[slot])).filter(Boolean);
  }

  function comparisonScenarioEffectAvailability(scenario) {
    return {
      vampireFull: hasVampireStackTrait,
      effects: toggleableEffectsFor(comparisonScenarioGearItems(scenario))
    };
  }

  useEffect(() => {
    if (!hasVampireStackTrait && vampireFull) setVampireFull(false);
  }, [hasVampireStackTrait, vampireFull]);

  const result = useMemo(
    () => calc({
      equipment,
      skillTable: skills,
      skillLevels,
      gear,
      mastery,
      masteryStat: selectedMasteryStat,
      attack,
      baseDefense: characterDefenseAtLevel(selectedCharacter, mastery),
      talentAp,
      traitBonuses,
      selectedTraits,
      target,
      targetMastery,
      targetHpPct,
      selfHp,
      selfShield,
      damageBonus,
      skillReduction,
      r2Stacks,
      tacticalSkill,
      tacticalUpgraded,
      vampireFull: effectiveVampireFull,
      effectToggles: activeEffectToggles,
      selectedHero,
      combos
    }),
    [equipment, skills, skillLevels, gear, mastery, selectedMasteryStat, attack, selectedCharacter, talentAp, traitBonuses, selectedTraits, target, targetMastery, targetHpPct, selfHp, selfShield, damageBonus, skillReduction, r2Stacks, tacticalSkill, tacticalUpgraded, effectiveVampireFull, activeEffectToggles, selectedHero, combos]
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
  const finalAttack = result.attackPower;
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
  const comparisonMasteryLevels = useMemo(() => {
    const start = Math.min(comparisonSettings.masteryStart, comparisonSettings.masteryEnd);
    const end = Math.max(comparisonSettings.masteryStart, comparisonSettings.masteryEnd);
    const step = Math.max(1, comparisonSettings.masteryStep);
    const levels = [];
    for (let level = start; level <= end; level += step) levels.push(level);
    if (!levels.includes(end)) levels.push(end);
    return levels;
  }, [comparisonSettings.masteryStart, comparisonSettings.masteryEnd, comparisonSettings.masteryStep]);
  const selectedComparisonMasteryLevel = comparisonMasteryLevels.includes(selectedComparisonMastery)
    ? selectedComparisonMastery
    : comparisonMasteryLevels[0];
  const comparisonSkillRows = useMemo(() => skills.filter((skill) => skill.hero === selectedHero), [skills, selectedHero]);
  const comparisonMetricColumns = useMemo(() => {
    const statColumns = COMPARISON_STAT_METRICS.filter((metric) => comparisonSettings.selectedMetrics.includes(metric.key));
    const skillColumns = comparisonSettings.includeSkills
      ? comparisonSkillRows.map((skill) => ({ key: `skill:${skill.id}`, label: skill.title }))
      : [];
    return [...statColumns, ...skillColumns];
  }, [comparisonSettings.selectedMetrics, comparisonSettings.includeSkills, comparisonSkillRows]);
  const comparisonRows = useMemo(() => (
    comparisonScenarios.flatMap((scenario) => comparisonMasteryLevels.map((level) => {
      const scenarioWeaponRaw = weaponTypeRaw(byName(equipment, scenario.gear.武器));
      const scenarioMasteryStat = masteryStatFor(selectedCharacter?.code, scenarioWeaponRaw);
      const scenarioSelfHp = Math.max(1, getNumber(comparisonSettings.selfHp));
      const scenarioTraitBonuses = traitBonusesFor(selectedTraits, Math.min(0.1, Math.max(0, (comparisonSettings.target.hp - scenarioSelfHp) / scenarioSelfHp) * 0.25));
      const effectAvailability = comparisonScenarioEffectAvailability(scenario);
      const scenarioResult = calc({
        equipment,
        skillTable: skills,
        skillLevels,
        gear: scenario.gear,
        mastery: level,
        masteryStat: scenarioMasteryStat,
        attack,
        talentAp,
        traitBonuses: scenarioTraitBonuses,
        selectedTraits,
        target: comparisonSettings.target,
        targetMastery: comparisonSettings.targetMastery,
        selfHp: comparisonSettings.selfHp,
        damageBonus: comparisonSettings.damageBonus,
        skillReduction: comparisonSettings.skillReduction,
        r2Stacks,
        tacticalSkill,
        tacticalUpgraded,
        vampireFull: effectAvailability.vampireFull && scenario.effectToggles.vampireFull,
        effectToggles: Object.fromEntries(effectAvailability.effects
          .filter((item) => scenario.effectToggles[item.name])
          .map((item) => [item.name, true])),
        selectedHero,
        combos
      });
      return {
        id: `${scenario.id}-${level}`,
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        mastery: level,
        values: {
          ap: scenarioResult.ap,
          attackPower: scenarioResult.attackPower,
          baseAttackPower: scenarioResult.baseAttackPower,
          extraAttackPower: scenarioResult.extraAttackPower,
          pen: scenarioResult.pen,
          penPct: scenarioResult.penPct,
          totalDamageBonus: scenarioResult.totalDamageBonus,
          basicAttack: scenarioResult.basicAttackDamage.normal,
          finalMod: scenarioResult.finalMod,
          ...Object.fromEntries(scenarioResult.skills.map((skill) => [`skill:${skill.id}`, skill.damage]))
        }
      };
    }))
  ), [comparisonScenarios, comparisonMasteryLevels, comparisonSettings, equipment, skills, skillLevels, selectedCharacter, selectedTraits, attack, talentAp, r2Stacks, tacticalSkill, tacticalUpgraded, selectedHero, combos]);
  const displayedComparisonRows = useMemo(() => {
    if (!comparisonSettings.groupRowsByMastery) return comparisonRows;
    const scenarioOrder = new Map(comparisonScenarios.map((scenario, index) => [scenario.id, index]));
    return [...comparisonRows].sort((left, right) => (
      left.mastery - right.mastery
      || (scenarioOrder.get(left.scenarioId) ?? 0) - (scenarioOrder.get(right.scenarioId) ?? 0)
    ));
  }, [comparisonRows, comparisonScenarios, comparisonSettings.groupRowsByMastery]);
  const comparisonApDeltaRows = useMemo(() => {
    const baselineScenario = comparisonScenarios[0];
    if (!baselineScenario || comparisonScenarios.length < 2) return [];

    const rowsByScenarioAndMastery = new Map(comparisonRows.map((row) => [`${row.scenarioId}:${row.mastery}`, row]));
    return comparisonScenarios.slice(1).map((scenario) => {
      const levelDeltas = comparisonMasteryLevels.map((level) => {
        const baselineRow = rowsByScenarioAndMastery.get(`${baselineScenario.id}:${level}`);
        const scenarioRow = rowsByScenarioAndMastery.get(`${scenario.id}:${level}`);
        const baselineAp = getNumber(baselineRow?.values?.ap);
        const scenarioAp = getNumber(scenarioRow?.values?.ap);
        const delta = scenarioAp - baselineAp;
        return {
          level,
          baselineAp,
          scenarioAp,
          delta,
          valid: Number.isFinite(delta)
        };
      });
      const validDeltas = levelDeltas.filter((item) => item.valid);
      const selectedDelta = levelDeltas.find((item) => item.level === selectedComparisonMasteryLevel);
      const averageDelta = validDeltas.length
        ? validDeltas.reduce((total, item) => total + item.delta, 0) / validDeltas.length
        : 0;
      return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        baselineName: baselineScenario.name,
        averageDelta,
        minDelta: validDeltas.length ? Math.min(...validDeltas.map((item) => item.delta)) : 0,
        maxDelta: validDeltas.length ? Math.max(...validDeltas.map((item) => item.delta)) : 0,
        selectedDelta,
        levelDeltas
      };
    });
  }, [comparisonRows, comparisonScenarios, comparisonMasteryLevels, selectedComparisonMasteryLevel]);
  const comparisonChartMetric = comparisonMetricColumns[0] || COMPARISON_STAT_METRICS[0];
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

  function updateSkillCount(key, value, { min = 0, max = MULTI_TARGET_MAX } = {}) {
    setSkillTargetCounts((current) => ({
      ...current,
      [key]: Math.max(min, Math.min(max, getNumber(value)))
    }));
  }

  function updateComparisonSetting(key, value) {
    setComparisonSettings((current) => normalizeComparisonSettings({ ...current, [key]: value }));
  }

  function updateComparisonTarget(key, value) {
    setComparisonSettings((current) => normalizeComparisonSettings({
      ...current,
      target: { ...current.target, name: '自定义对比目标', [key]: value }
    }));
  }

  function toggleComparisonMetric(key) {
    setComparisonSettings((current) => {
      const selected = current.selectedMetrics.includes(key)
        ? current.selectedMetrics.filter((item) => item !== key)
        : [...current.selectedMetrics, key];
      return normalizeComparisonSettings({ ...current, selectedMetrics: selected.length ? selected : [key] });
    });
  }

  function updateComparisonScenario(id, patch) {
    setComparisonScenarios((current) => current.map((scenario) => (
      scenario.id === id ? normalizeComparisonScenario({ ...scenario, ...patch }, DEFAULT_GEAR) : scenario
    )));
  }

  function updateComparisonScenarioGear(id, slot, itemName) {
    const currentScenario = comparisonScenarios.find((scenario) => scenario.id === id);
    updateComparisonScenario(id, {
      gear: {
        ...(currentScenario?.gear || DEFAULT_GEAR),
        [slot]: itemName
      }
    });
  }

  function updateComparisonScenarioToggle(id, key, checked) {
    const currentScenario = comparisonScenarios.find((scenario) => scenario.id === id);
    updateComparisonScenario(id, {
      effectToggles: {
        ...(currentScenario?.effectToggles || {}),
        [key]: checked
      }
    });
  }

  function addComparisonScenario() {
    setComparisonScenarios((current) => [
      ...current,
      normalizeComparisonScenario({
        id: `scenario-${Date.now()}`,
        name: `方案 ${current.length + 1}`,
        gear
      }, gear, current.length)
    ]);
  }

  function cloneCurrentToComparison() {
    setComparisonScenarios((current) => [
      ...current,
      normalizeComparisonScenario({
        id: `current-${Date.now()}`,
        name: `当前方案 ${current.length + 1}`,
        gear
      }, gear, current.length)
    ]);
  }

  function removeComparisonScenario(id) {
    setComparisonScenarios((current) => (
      current.length <= 1 ? current : current.filter((scenario) => scenario.id !== id)
    ));
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

  // 在配置表里改过的技能会打上 manual 标记，之后随包数据不再覆盖它；
  // 没改过的条目则始终跟随随包数据，这样官方公告更新后不需要清缓存也能看到新值。
  function updateSkillRow(index, key, value) {
    updateConfig((current) => ({
      ...current,
      skills: current.skills.map((skill, rowIndex) => (
        rowIndex === index
          ? {
            ...skill,
            [key]: key === 'maxLevel' ? getNumber(value) : value,
            manual: true,
            updatedAt: new Date().toISOString()
          }
          : skill
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

  const traitSummaryItems = calculatedTraitBonusSummaryItems(result);
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

  function renderCountStepper(label, key, { min = 0, max = MULTI_TARGET_MAX } = {}) {
    const count = Math.max(min, Math.min(max, getNumber(skillTargetCounts[key])));
    return (
      <div className="targetStepper">
        <span>{label}</span>
        <button type="button" onClick={() => updateSkillCount(key, count - 1, { min, max })}>-</button>
        <b>{count}</b>
        <button type="button" onClick={() => updateSkillCount(key, count + 1, { min, max })}>+</button>
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

  function renderProgressiveSkillDamage(skill, label) {
    const rule = progressiveDamageRule(skill);
    const { min, max, defaultValue } = progressiveDamageBounds(rule);
    const ruleId = rule?.id || 'progressive';
    const stepKey = `${skill.id}-${ruleId}`;
    const stepValue = Math.max(min, Math.min(max, getNumber(skillTargetCounts[stepKey]) || defaultValue));
    const stepContext = result.formulaContext;
    const selectedStep = progressiveDamageValue(skill, stepContext, stepValue);
    const steps = Array.from({ length: max - min + 1 }, (_, index) => progressiveDamageValue(skill, stepContext, min + index));
    const sourceMeta = skillSourceMeta(skill);
    const skillLevel = skill.level || skillLevels[skill.id] || 1;
    const description = skill.coefficientText || skill.description || '';
    const stepLabel = rule?.label || '递增次数';
    const unit = rule?.unit || '';
    const selectedLabel = rule?.selectedLabel
      ? `${rule.selectedLabel}: ${stepValue}${unit ? ` ${unit}` : ''}`
      : `第 ${stepValue}${unit ? ` ${unit}` : ''}`;

    return (
      <div className="skillDamageLeaf progressiveDamageLeaf" key={`${skill.id}-${ruleId}`}>
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
          {renderCountStepper(stepLabel, stepKey, { min, max })}
        </div>
        <div className="skillLeafValues">
          <div className="skillTotalValue">
            <span>{selectedLabel}</span>
            <DamageValue raw={selectedStep.raw} final={selectedStep.final} />
          </div>
        </div>
        <div className="progressiveDamageSteps" aria-label={`${stepLabel}伤害列表`}>
          {steps.map((step) => (
            <div className={step.step === stepValue ? 'active' : ''} key={`${skill.id}-${ruleId}-${step.step}`}>
              <span>{step.step}{unit ? ` ${unit}` : ''} / {step.variable === 'ap' ? '技增' : step.variable} {pct(step.coefficient)}</span>
              <DamageValue raw={step.raw} final={step.final} />
            </div>
          ))}
        </div>
        {rule?.note ? <p className="skillLeafNote">{rule.note}</p> : null}
      </div>
    );
  }

  // 多段结算技能（阿尔达 R、秀雅 R 这种强化并重放其它技能的大招）压扁成一栏，
  // 逐段列出，并按「命中段数」给出前 N 段的合计。
  function renderSegmentedSkillGroup(groupName, skills) {
    const stepKey = `${skills[0].id}-segments`;
    const max = skills.length;
    const stored = getNumber(skillTargetCounts[stepKey]);
    const hitCount = stored > 0 ? Math.min(max, stored) : max;
    const levelValue = skillLevels[skills[0].id] || skills[0].level || 1;
    const rows = skills.map((skill) => ({
      skill,
      label: skillSegmentLabel(skill, groupName),
      raw: getNumber(skill.rawDamage),
      final: getNumber(skill.damage)
    }));
    const picked = rows.slice(0, hitCount);
    const totalRaw = picked.reduce((sum, row) => sum + row.raw, 0);
    const totalFinal = picked.reduce((sum, row) => sum + row.final, 0);
    const sourceMeta = skillSourceMeta(skills[0]);

    return (
      <div className="skillDamageLeaf segmentedDamageLeaf" key={`segment-${skills[0].id}`}>
        <div className="skillLeafHead">
          <div className="skillLeafTitle">
            <PortalHovercard
              className="skillNameHover"
              content={(
                <span className="skillDescriptionContent">
                  <strong>{groupName} Lv.{levelValue}（{max} 段）</strong>
                  {rows.map((row) => (
                    <span className="skillDescriptionEntry" key={`segdesc-${row.skill.id}`}>
                      <b>{row.label}</b>
                      <span className="skillFormulaText">{skillFormulaDescription(row.skill, levelValue)}</span>
                      {row.skill.coefficientText ? <span>{row.skill.coefficientText}</span> : null}
                    </span>
                  ))}
                </span>
              )}
            >
              <strong>{groupName}</strong>
            </PortalHovercard>
            <span className="skillSegmentBadge">{max} 段</span>
          </div>
          <div className="targetStepper">
            <span>命中段数</span>
            <button type="button" onClick={() => updateSkillCount(stepKey, hitCount - 1, { min: 1, max })}>-</button>
            <b>{hitCount}</b>
            <button type="button" onClick={() => updateSkillCount(stepKey, hitCount + 1, { min: 1, max })}>+</button>
          </div>
        </div>
        <div className="segmentedDamageRows">
          {rows.map((row, index) => (
            <div className={index < hitCount ? 'active' : ''} key={`segrow-${row.skill.id}`}>
              <span title={row.label}>{row.label}</span>
              <DamageValue raw={row.raw} final={row.final} />
            </div>
          ))}
        </div>
        <div className="skillLeafValues">
          <div className="skillTotalValue">
            <span>{hitCount >= max ? '全段合计' : `前 ${hitCount} 段合计`}</span>
            <DamageValue raw={totalRaw} final={totalFinal} />
          </div>
        </div>
        {sourceMeta ? <p className="skillLeafNote">{sourceMeta.label}</p> : null}
      </div>
    );
  }

  function renderSkillMainColumn(slot) {
    // 强化普攻类不进技能栏，它们在下面的「强化普攻」面板里
    const slotSkills = result.skills.filter((skill) => skillMainSlot(skill) === slot && skill.kind !== 'basicAttack');
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
            {renderSlotLeaves(slotSkills)}
          </div>
        ) : (
          <p className="note">暂无技能数据</p>
        )}
      </div>
    );
  }

  // 先把同一技能的多段聚成一组，够 SEGMENTED_MIN 段的走压扁视图，其余按原样逐条渲染
  function renderSlotLeaves(slotSkills) {
    const buckets = [];
    const indexByName = new Map();
    for (const skill of slotSkills) {
      const special = progressiveDamageRule(skill)
        || skillDisplayRule(selectedHero, skill.id)
        || getNumber(skill.maxHits) > 1
        || skill.kind;
      const name = special ? null : skillSegmentGroupName(skill);
      if (!name) { buckets.push({ name: null, skills: [skill] }); continue; }
      if (!indexByName.has(name)) {
        indexByName.set(name, buckets.length);
        buckets.push({ name, skills: [] });
      }
      buckets[indexByName.get(name)].skills.push(skill);
    }

    return buckets.flatMap((bucket) => (
      bucket.name && bucket.skills.length >= SEGMENTED_MIN
        ? [renderSegmentedSkillGroup(bucket.name, bucket.skills)]
        : bucket.skills.map((skill) => renderSkillLeaf(skill))
    ));
  }

  /**
   * 会打多下的技能（万尼亚 Q 命中 + 回收 2 段、W 腾空期间 5 跳……）。
   * 条目上写 "maxHits": N 就会出现命中次数步进器，并把 1~N 次的伤害逐档列出来。
   */
  function renderMultiHitSkillDamage(skill, label, maxHits) {
    const hitKey = `${skill.id}-hits`;
    const stored = getNumber(skillTargetCounts[hitKey]);
    const defaultHits = Math.max(1, Math.min(maxHits, getNumber(skill.defaultHits) || 1));
    const hits = stored > 0 ? Math.min(maxHits, stored) : defaultHits;
    const single = scaledSkillDamage(skill, result.finalMod);
    const picked = scaledSkillDamage(skill, result.finalMod, { hits });
    const sourceMeta = skillSourceMeta(skill);
    const skillLevel = skill.level || skillLevels[skill.id] || 1;
    const hitLabel = skill.hitLabel || '命中次数';

    return (
      <div className="skillDamageLeaf" key={`${skill.id}-multihit`}>
        <div className="skillLeafHead">
          <div className="skillLeafTitle">
            <PortalHovercard
              className="skillNameHover"
              content={(
                <SkillDescriptionContent
                  title={label}
                  level={skillLevel}
                  formula={skillFormulaDescription(skill, skillLevel)}
                  description={skill.coefficientText || skill.description || ''}
                  source={sourceMeta?.title}
                />
              )}
            >
              <strong>{label}</strong>
            </PortalHovercard>
            {sourceMeta ? <span className="skillSourceMeta" title={sourceMeta.title}>{sourceMeta.label}</span> : null}
          </div>
          <div className="targetStepper">
            <span>{hitLabel}</span>
            <button type="button" onClick={() => updateSkillCount(hitKey, hits - 1, { min: 1, max: maxHits })}>-</button>
            <b>{hits}</b>
            <button type="button" onClick={() => updateSkillCount(hitKey, hits + 1, { min: 1, max: maxHits })}>+</button>
          </div>
        </div>
        <div className="progressiveDamageSteps" aria-label={`${hitLabel}伤害列表`}>
          {Array.from({ length: maxHits }, (unused, index) => index + 1).map((count) => {
            const value = scaledSkillDamage(skill, result.finalMod, { hits: count });
            return (
              <div className={count === hits ? 'active' : ''} key={`${skill.id}-hit-${count}`}>
                <span>中 {count} 次</span>
                <DamageValue raw={value.raw} final={value.final} />
              </div>
            );
          })}
        </div>
        <div className="skillLeafValues">
          <div>
            <span>单次</span>
            <DamageValue raw={single.raw} final={single.final} />
          </div>
          <div className="skillTotalValue">
            <span>中 {hits} 次合计</span>
            <DamageValue raw={picked.raw} final={picked.final} />
          </div>
        </div>
        {skill.hitNote ? <p className="skillLeafNote">{skill.hitNote}</p> : null}
      </div>
    );
  }

  // 护盾 / 治疗量：用同一套公式算，但不是伤害，单独显示且不参与伤害合计
  const NON_DAMAGE_KIND_LABELS = { shield: '护盾', heal: '治疗' };

  function renderNonDamageLeaf(skill) {
    const kindLabel = NON_DAMAGE_KIND_LABELS[skill.kind] || skill.kind;
    const label = skill.title.replace(/^[PQWER]\s*/, '') || skill.title;
    const sourceMeta = skillSourceMeta(skill);
    const skillLevel = skill.level || skillLevels[skill.id] || 1;
    return (
      <div className="skillDamageLeaf nonDamageLeaf" key={skill.id}>
        <div className="skillLeafHead">
          <div className="skillLeafTitle">
            <PortalHovercard
              className="skillNameHover"
              content={(
                <SkillDescriptionContent
                  title={label}
                  level={skillLevel}
                  formula={skillFormulaDescription(skill, skillLevel)}
                  description={skill.coefficientText || skill.description || ''}
                  source={sourceMeta?.title}
                />
              )}
            >
              <strong>{label}</strong>
            </PortalHovercard>
            <span className="nonDamageBadge">{kindLabel}</span>
          </div>
        </div>
        <div className="skillLeafValues">
          <div className="skillTotalValue">
            <span>{kindLabel}量（不吃减伤）</span>
            <DamageValue raw={skill.rawDamage} final={skill.rawDamage} />
          </div>
        </div>
      </div>
    );
  }

  function renderSkillLeaf(skill) {
    if (skill.kind && NON_DAMAGE_KIND_LABELS[skill.kind]) return renderNonDamageLeaf(skill);
    const maxHits = Math.max(0, getNumber(skill.maxHits));
    if (maxHits > 1) {
      return renderMultiHitSkillDamage(skill, skill.title.replace(/^[PQWER]\s*/, '') || skill.title, maxHits);
    }
    if (progressiveDamageRule(skill)) {
      return renderProgressiveSkillDamage(skill, skill.title.replace(/^[PQWER]\s*/, '') || skill.title);
    }
    // 展示规则来自 src/data/specialSkillRules.json 的 heroes[英雄].display
    const rule = skillDisplayRule(selectedHero, skill.id);
    const defaultLabel = skill.title.replace(/^[PQWER]\s*/, '').replace(/^E([QW])\s*/, '强化$1 ') || skill.title;
    const label = rule?.label || defaultLabel;
    const targetKey = `${skill.id}-targets`;

    if (rule && (rule.hits > 1 || rule.secondaryScale !== undefined)) {
      const hits = Math.max(1, getNumber(rule.hits) || 1);
      const primarySingle = scaledSkillDamage(skill, result.finalMod);
      const primary = scaledSkillDamage(skill, result.finalMod, { hits });
      const hasSecondary = rule.secondaryScale !== undefined;
      const secondarySingle = hasSecondary ? scaledSkillDamage(skill, result.finalMod, { scale: rule.secondaryScale }) : null;
      const secondary = hasSecondary ? scaledSkillDamage(skill, result.finalMod, { scale: rule.secondaryScale, hits }) : null;
      return renderSkillDamageLeaf(skill, label, {
        targetKey,
        targetMax: rule.maxTargets || MULTI_TARGET_MAX,
        primarySingleRaw: hasSecondary ? primarySingle.raw : undefined,
        primarySingleFinal: hasSecondary ? primarySingle.final : undefined,
        primaryRaw: primary.raw,
        primaryFinal: primary.final,
        secondarySingleRaw: secondarySingle?.raw,
        secondarySingleFinal: secondarySingle?.final,
        secondaryRaw: secondary?.raw,
        secondaryFinal: secondary?.final,
        totalLabel: rule.totalLabelSuffix
          ? (nextCount) => `${nextCount > 1 ? `${nextCount} 目标总计` : '单目标'}${rule.totalLabelSuffix}`
          : undefined,
        showBreakdown: Boolean(rule.showBreakdown)
      });
    }

    return renderSkillDamageLeaf(skill, label, { targetKey, targetMax: rule?.maxTargets || MULTI_TARGET_MAX });
  }

  function renderPassiveSkillRow() {
    if (!result.skills.some((skill) => skillMainSlot(skill) === 'P')) return null;

    return (
      <div className="skillPassiveRow">
        {renderSkillMainColumn('P')}
      </div>
    );
  }

  function formatComparisonValue(key, value) {
    const numericValue = getNumber(value);
    if (['penPct', 'totalDamageBonus', 'finalMod'].includes(key)) {
      return key === 'finalMod' ? round(numericValue, 3) : pct(numericValue);
    }
    return round(numericValue, Math.abs(numericValue) < 10 ? 2 : 1);
  }

  function formatSignedComparisonDelta(value) {
    if (!Number.isFinite(value)) return '-';
    const next = round(value, Math.abs(value) < 10 ? 2 : 1);
    return `${next > 0 ? '+' : ''}${next}`;
  }

  function comparisonChoicesForSlot(slot, scenario) {
    return sortEquipmentForSelect(equipment.filter((item) => (
      item.type === slot
      && shouldShowInBuilder(item, showLowerTierEquipment)
      && (
        slot !== '武器'
        || !allowedWeaponTypes.size
        || allowedWeaponTypes.has(weaponTypeRaw(item))
        || item.name === scenario.gear[slot]
      )
    )));
  }

  function renderComparisonPage() {
    return (
      <section className="comparisonPage">
        <div className="panel comparisonControlPanel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Comparison</p>
              <h2>拉表对比</h2>
            </div>
            <div className="buttonRow">
              <button type="button" onClick={cloneCurrentToComparison}>加入当前方案</button>
              <button type="button" onClick={addComparisonScenario}>新增方案</button>
            </div>
          </div>
          <div className="comparisonSettingsGrid">
            <Field label="熟练起点" value={comparisonSettings.masteryStart} min={1} max={20} onChange={(value) => updateComparisonSetting('masteryStart', value)} />
            <Field label="熟练终点" value={comparisonSettings.masteryEnd} min={1} max={20} onChange={(value) => updateComparisonSetting('masteryEnd', value)} />
            <Field label="步长" value={comparisonSettings.masteryStep} min={1} max={20} onChange={(value) => updateComparisonSetting('masteryStep', value)} />
            <Field label="目标血量" value={comparisonSettings.target.hp} onChange={(value) => updateComparisonTarget('hp', value)} />
            <Field label="目标防御" value={comparisonSettings.target.defense} onChange={(value) => updateComparisonTarget('defense', value)} />
            <Field label="目标防御降低" value={comparisonSettings.target.defenseReduction} step={0.01} suffix="小数" onChange={(value) => updateComparisonTarget('defenseReduction', value)} />
            <label className="field">
              <span>目标熟练度</span>
              <select value={comparisonSettings.targetMastery} onChange={(event) => updateComparisonSetting('targetMastery', Number(event.target.value))}>
                {TARGET_MASTERY_LEVELS.map((level) => <option value={level} key={level}>{level}级</option>)}
              </select>
            </label>
            <Field label="目标通用减伤" value={comparisonSettings.target.reduction} step={0.01} suffix="小数" onChange={(value) => updateComparisonTarget('reduction', value)} />
            <Field label="自身血量" value={comparisonSettings.selfHp} onChange={(value) => updateComparisonSetting('selfHp', value)} />
            <Field label="手动伤害提升" value={comparisonSettings.damageBonus} step={0.01} suffix="小数" onChange={(value) => updateComparisonSetting('damageBonus', value)} />
            <Field label="手动技能减免" value={comparisonSettings.skillReduction} step={0.01} suffix="小数" onChange={(value) => updateComparisonSetting('skillReduction', value)} />
          </div>
          <div className="comparisonMetricPicker">
            {COMPARISON_STAT_METRICS.map((metric) => (
              <label className="toggle" key={metric.key}>
                <input type="checkbox" checked={comparisonSettings.selectedMetrics.includes(metric.key)} onChange={() => toggleComparisonMetric(metric.key)} />
                <span>{metric.label}</span>
              </label>
            ))}
            <label className="toggle">
              <input type="checkbox" checked={comparisonSettings.includeSkills} onChange={(event) => updateComparisonSetting('includeSkills', event.target.checked)} />
              <span>输出各技能最终伤害</span>
            </label>
          </div>
        </div>

        <div className="comparisonScenarioGrid">
          {comparisonScenarios.map((scenario) => {
            const effectAvailability = comparisonScenarioEffectAvailability(scenario);
            const effectOptions = [
              ...(effectAvailability.vampireFull ? [{ key: 'vampireFull', label: '吸血鬼满层' }] : []),
              ...effectAvailability.effects.map((item) => ({ key: item.name, label: item.label }))
            ];
            return (
              <div className="panel comparisonScenario" key={scenario.id}>
                <div className="comparisonScenarioHead">
                  <input value={scenario.name} onChange={(event) => updateComparisonScenario(scenario.id, { name: event.target.value })} aria-label="方案名称" />
                  <button type="button" className="quietButton" onClick={() => removeComparisonScenario(scenario.id)} disabled={comparisonScenarios.length <= 1}>删除</button>
                </div>
                <div className="comparisonGearGrid">
                  {SLOTS.map((slot) => (
                    <label className="selectBlock" key={`${scenario.id}-${slot}`}>
                      <span>{slot}</span>
                      <select value={scenario.gear[slot] || ''} onChange={(event) => updateComparisonScenarioGear(scenario.id, slot, event.target.value)}>
                        {comparisonChoicesForSlot(slot, scenario).map((item) => <option value={item.name} key={`${slot}-${item.name}`}>{item.name}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
                {effectOptions.length ? (
                  <div className="comparisonEffectToggles">
                    {effectOptions.map((option) => (
                      <label className="toggle" key={`${scenario.id}-${option.key}`}>
                        <input type="checkbox" checked={Boolean(scenario.effectToggles[option.key])} onChange={(event) => updateComparisonScenarioToggle(scenario.id, option.key, event.target.checked)} />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                ) : <div className="comparisonEffectEmpty">当前方案没有可切换特效</div>}
              </div>
            );
          })}
        </div>

        <div className="panel comparisonResultPanel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Output</p>
              <h2>{selectedHero} 对比结果</h2>
            </div>
            <span className="pill">{comparisonRows.length} 行 / {comparisonMetricColumns.length} 列</span>
          </div>
          <ComparisonChart
            rows={comparisonRows}
            metricKey={comparisonChartMetric.key}
            metricLabel={comparisonChartMetric.label}
            selectedMastery={selectedComparisonMasteryLevel}
            onSelectMastery={setSelectedComparisonMastery}
          />
          {comparisonApDeltaRows.length ? (
            <div className="comparisonDeltaBlock">
              <div className="comparisonDeltaHead">
                <div>
                  <strong>法强差值</strong>
                  <span>以 {comparisonApDeltaRows[0].baselineName} 为基准 / 图表选中熟练 {selectedComparisonMasteryLevel}</span>
                </div>
              </div>
              <div className="comparisonDeltaSummary">
                {comparisonApDeltaRows.map((row) => (
                  <div className="comparisonDeltaCard" key={`${row.scenarioId}-ap-delta-card`}>
                    <span>{row.scenarioName}</span>
                    <strong>{formatSignedComparisonDelta(row.selectedDelta?.delta)}</strong>
                    <small>
                      熟练 {selectedComparisonMasteryLevel} / {formatComparisonValue('ap', row.selectedDelta?.scenarioAp)} vs {formatComparisonValue('ap', row.selectedDelta?.baselineAp)}
                    </small>
                    <small>平均 {formatSignedComparisonDelta(row.averageDelta)} / 最低 {formatSignedComparisonDelta(row.minDelta)} / 最高 {formatSignedComparisonDelta(row.maxDelta)}</small>
                  </div>
                ))}
              </div>
              <div className="comparisonDeltaTableWrap">
                <table className="comparisonDeltaTable">
                  <thead>
                    <tr>
                      <th>方案</th>
                      {comparisonMasteryLevels.map((level) => (
                        <th className={level === selectedComparisonMasteryLevel ? 'selectedDeltaColumn' : ''} key={`ap-delta-level-${level}`}>熟练 {level}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonApDeltaRows.map((row) => (
                      <tr key={`${row.scenarioId}-ap-delta-row`}>
                        <td>{row.scenarioName}</td>
                        {row.levelDeltas.map((item) => (
                          <td
                            key={`${row.scenarioId}-ap-delta-${item.level}`}
                            className={[
                              item.delta > 0 ? 'positiveDelta' : item.delta < 0 ? 'negativeDelta' : '',
                              item.level === selectedComparisonMasteryLevel ? 'selectedDeltaColumn' : ''
                            ].filter(Boolean).join(' ')}
                            title={`${row.scenarioName} ${formatComparisonValue('ap', item.scenarioAp)} / ${row.baselineName} ${formatComparisonValue('ap', item.baselineAp)}`}
                          >
                            {item.valid ? formatSignedComparisonDelta(item.delta) : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          <div className="comparisonTableTools">
            <label className="toggle">
              <input type="checkbox" checked={comparisonSettings.groupRowsByMastery} onChange={(event) => updateComparisonSetting('groupRowsByMastery', event.target.checked)} />
              <span>同熟练度方案排在一起</span>
            </label>
          </div>
          <div className="comparisonTableWrap">
            <table className="comparisonTable">
              <thead>
                <tr>
                  <th>方案</th>
                  <th>熟练度</th>
                  {comparisonMetricColumns.map((column) => <th key={column.key}>{column.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {displayedComparisonRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.scenarioName}</td>
                    <td>{row.mastery}</td>
                    {comparisonMetricColumns.map((column) => <td key={`${row.id}-${column.key}`}>{formatComparisonValue(column.key, row.values[column.key])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
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
            <div className="pageSwitch">
              <button type="button" className={activePage === 'calculator' ? 'active' : ''} onClick={() => setActivePage('calculator')}>
                计算器
              </button>
              <button type="button" className={activePage === 'compare' ? 'active' : ''} onClick={() => setActivePage('compare')}>
                拉表对比
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
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={showDamageTestHeroes}
                          onChange={(event) => setShowDamageTestHeroes(event.target.checked)}
                        />
                        <span>显示技能伤害统计测试英雄</span>
                      </label>
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

      {activePage === 'compare' ? renderComparisonPage() : (
      <>
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
                  <PortalHovercard
                    content={<EquipmentItemHoverContent item={item} mastery={mastery} uiTheme={uiTheme} />}
                    className="equipmentChipHover"
                    key={`${item.type}-${item.name}`}
                  >
                    <span className="chip" style={{ color: qualityColor(item.quality, uiTheme) }}>
                      {item.name}{uniqueEffectsForItem(item).length ? ` / ${uniqueEffectsForItem(item).join(',')}` : ''}
                    </span>
                  </PortalHovercard>
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
            {/* 叠层类 / 条件触发类装备特效：装上带该效果的装备后开关才出现 */}
            {availableEffectToggles.map((item) => (
              <label className="toggle" key={item.name} title={effectToggleHint(item.name)}>
                <input
                  type="checkbox"
                  checked={Boolean(effectToggles[item.name])}
                  onChange={(event) => setEffectToggles((current) => ({ ...current, [item.name]: event.target.checked }))}
                />
                <span>{item.label}</span>
              </label>
            ))}
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
            <span>{visibleEquipmentStats.length + 5} 项显示</span>
          </summary>
          <div className="attributePanel">
            <div>
              <span>当前法强</span>
              <strong>{result.ap}</strong>
              <small>装备 {result.equipAp} + 手动 {talentAp} + 潜能 {result.talentBonusAp} + 叠层 {result.stackAp}，加成 {pct(result.totalApPct)}</small>
            </div>
            <div>
              <span>攻击力</span>
              <strong>{round(finalAttack, 1)}</strong>
              <small>基础 {round(result.baseAttackPower, 1)} + 额外 {round(result.extraAttackPower, 1)}</small>
            </div>
            <div>
              <span>每发平A预估</span>
              <strong>{result.basicAttackDamage.normal}</strong>
              <small>暴击 {result.basicAttackDamage.critical} / 暴击倍率 {pct(result.basicAttackDamage.criticalMultiplier)}；暴击率 {pct(result.basicAttackDamage.criticalStrikeChance)}</small>
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
        <details className="panel damagePanel skillDamagePanel" open>
          <summary className="effectToggle">
            <div>
              <p className="eyebrow">Skills</p>
              <h2>{selectedHero} 技能伤害</h2>
            </div>
            {stackSelector ? (
              <div className="stackBlocks" aria-label={stackSelector.label || '叠层'}>
                {stackSelector.values.map((stack) => (
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
          </summary>
          {/* 这几项只有当前英雄的技能或身上装备的特效真的用到时才出现，平时不占地方 */}
          {contextFieldsInUse.length ? (
            <div className="skillContextFields">
              {contextFieldsInUse.includes('targetCurrentHp') || contextFieldsInUse.includes('targetLostHp') ? (
                <>
                  <Field
                    label="目标当前体力"
                    value={targetHpPct}
                    onChange={(value) => setTargetHpPct(Math.max(0, Math.min(100, getNumber(value))))}
                    suffix="%"
                    note={help('field.targetCurrentHp')}
                  />
                  <Field
                    label="目标已失体力"
                    value={round(100 - getNumber(targetHpPct), 1)}
                    onChange={(value) => setTargetHpPct(Math.max(0, Math.min(100, 100 - getNumber(value))))}
                    suffix="%"
                    note={help('field.targetLostHp')}
                  />
                </>
              ) : null}
              {contextFieldsInUse.includes('shield') ? (
                <Field label="自身护盾" value={selfShield} onChange={setSelfShield} note={help('field.selfShield')} />
              ) : null}
            </div>
          ) : null}
          <div className="skillMainGrid">
            {SKILL_MAIN_SLOTS.map(renderSkillMainColumn)}
            {!result.skills.length ? (
              <p className="note">当前英雄暂无技能数据，可在后台配置表继续录入。</p>
            ) : null}
          </div>
          {renderPassiveSkillRow()}
        </details>

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
                <span>潜能 / 战术技能 / 装备独有效果的附加伤害</span>
              </div>
              <DamageValue raw={result.effectSubtotalRaw} final={result.effectSubtotal} />
            </div>
            {/* 不产生独立伤害段、但改了属性或增伤的装备效果，单独列出来说明它们已计入 */}
            {result.effectMods?.applied?.length ? (
              <div className="damageRow compactDamageRow">
                <div>
                  <strong>已计入的装备特效修正</strong>
                  <span>
                    {result.effectMods.applied.map((effect) => `${effect.label || effect.name}：`
                      + Object.entries(effect.modifiers || {})
                        .map(([key, value]) => `${ITEM_EFFECT_MODIFIERS.modifierKeys?.[key] || key} ${value > 0 && value < 1 ? pct(value) : value}`)
                        .join('、')).join('｜')}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
          ) : null}
        </div>
      </section>

      {result.basicAttackSkills.length ? (
      <section className="panel damagePanel">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Basic Attack</p>
            <h2>强化普攻</h2>
          </div>
        </div>
        <p className="note">
          这些技能不单独打出伤害，而是给下一次普攻附加一段。下面按当前面板属性算出强化后的一次普攻总量。
        </p>
        <div className="damageRowList">
          <div className="damageRow compactDamageRow">
            <div>
              <strong>普通攻击</strong>
              <span>攻击力 {round(result.attackPower, 1)} 经防御与增伤修正后的一次普攻</span>
            </div>
            <DamageValue raw={result.basicAttackDamage.normal} final={result.basicAttackDamage.normal} />
          </div>
          {result.basicAttackSkills.map((skill) => {
            const level = skill.level || skillLevels[skill.id] || 1;
            return (
              <div className="damageRow compactDamageRow" key={skill.id}>
                <div>
                  <strong>{skill.title}</strong>
                  <span>{skillFormulaDescription(skill, level).split('\n')[0]}{skill.coefficientText ? ` ｜ ${skill.coefficientText}` : ''}</span>
                </div>
                <DamageValue raw={skill.rawDamage} final={skill.damage} />
              </div>
            );
          })}
          <div className="damageRow compactDamageRow highlight">
            <div>
              <strong>强化后一次普攻合计</strong>
              <span>普通攻击 + 上面全部额外段</span>
            </div>
            <DamageValue
              raw={result.basicAttackDamage.normal + result.basicAttackBonusRaw}
              final={result.basicAttackDamage.normal + result.basicAttackBonus}
            />
          </div>
        </div>
      </section>
      ) : null}

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
              <StatCard label="基础攻击" value={round(result.baseAttackPower, 1)} hint={`角色等级成长 ${round(attack, 1)} + 熟练度攻击 ${round(result.masteryAttackPower, 1)}`} note={help('equipment.attackPower')} />
              <StatCard label="装备攻击" value={result.equipAttackPower} hint="当前装备攻击力合计" note={help('equipment.attackPower')} />
              <StatCard label="熟练度攻击" value={round(result.masteryAttackPower, 1)} hint={selectedMasterySummary.join(' / ') || '当前武器无攻击力熟练度'} note={help('field.mastery')} />
              <StatCard label="额外攻击" value={round(result.extraAttackPower, 1)} hint={`装备 ${round(result.equipAttackPower, 1)} + 潜能 ${round(result.talentBonusAttackPower, 1)} + 叠层 ${round(result.stackAttackPower, 1)}`} note={help('equipment.attackPower')} />
              <StatCard label="最终攻击" value={round(finalAttack, 1)} hint={`${round(result.baseAttackPower, 1)} + ${round(result.extraAttackPower, 1)}`} note={help('equipment.attackPower')} />
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
            <button type="button" className="helpSaveButton" onClick={saveConfig} disabled={configSaveStatus === 'saving'}>
              {configSaveStatus === 'saving' ? '保存中' : '保存配置到本地'}
            </button>
            <button type="button" className="helpSaveButton" onClick={exportCurrentConfig} disabled={configSaveStatus === 'exporting'}>
              {configSaveStatus === 'exporting' ? '导出中' : '导出构建配置 JSON'}
            </button>
            <button type="button" className="quietButton" onClick={resetConfig}>恢复默认</button>
          </div>
        </div>
        <p className="note">
          编辑时会先暂存在当前浏览器；点击“保存配置到本地”后会写入 src/data/localConfig.json。点击“导出构建配置 JSON”会写入 src/data/localConfig.export.json；构建时如果该文件存在，会优先使用它。技能公式可使用 `base`、`ap`、`attack`、`targetHp`、`stacks`、`level`，等级基础值用英文逗号分隔。
          <LabelWithHelp note={help('solution.help')}>帮助说明发布方案</LabelWithHelp>
          {configSaveStatus === 'saved' ? <small className="configSaveStatus">已写入项目文件。</small> : null}
          {configSaveStatus === 'exported' ? <small className="configSaveStatus">已导出 src/data/localConfig.export.json，下一次构建会优先使用。</small> : null}
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
      </>
      )}
    </main>
  );
}
