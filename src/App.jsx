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
import HERO_STATUS from './data/heroStatus.json';
import DAK_LOADOUT_ASSETS from './data/dakLoadoutAssets.json';
import TRAIT_EFFECTS_DATA from './data/traitEffects.json';
import DAK_ITEM_SKILL_ICONS from './data/dakItemSkillIcons.json';
import WEAPON_ROUTE_PRESETS from './data/weaponRoutePresets.json';
import WEAPON_TYPE_INFO from './data/weaponTypeInfo.json';
import WEAPON_SKILLS_DATA from './data/weaponSkills.json';
import VisualGearBar, {
  EquipmentSlotIcon,
  QUALITY_SHORT_LABELS,
  QUALITY_TIER_KEY,
  summarizeItemStats
} from './components/VisualGearPicker.jsx';
import PATCH_LOG from './data/patchLog.json';
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
  attackSpeedRuleFor,
  filterSkillsByForm,
  formSwitchFor,
  heroModifiersFor,
  heroModifierTotals,
  passiveStatRuleFor,
  skillDisplayRule,
  stackLimitForHero,
  stackSelectorForHero,
  statConversionFor
} from './lib/specialRules.js';

const APP_VERSION = 'v0.2.097';

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
const WEAPON_SKILL_IMAGE_URLS = import.meta.glob('../assets/game-icons/weapon-skills/*.png', {
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
const TACTICAL_SKILL_OPTIONS = ['震裂', '违规者', '斥力弹', '阔步者', '实刃', '等离子冲击', '虚言', '其他'];
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
const SAVED_PRESETS_KEY = 'er-damage-saved-presets-v1';
const APP_SETTINGS_KEY = 'er-damage-global-settings-v1';
const HELP_NOTES_KEY = 'er-damage-help-notes-v1';
const HELP_NOTES_EDITABLE = typeof window !== 'undefined' && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
const HELP_NOTES_SAVE_ENDPOINT = '/api/help-notes';
const CONFIG_SAVE_ENDPOINT = '/api/config';
const CONFIG_EXPORT_ENDPOINT = '/api/config/export';
const ANNOUNCEMENT_KEY = 'er-damage-announcement-v1';
const ANNOUNCEMENT_SEEN_KEY = 'er-damage-announcement-seen-v1';
const ANNOUNCEMENT_SAVE_ENDPOINT = '/api/announcement';
const TRAIT_EFFECTS = TRAIT_EFFECTS_DATA.traits || {};

/**
 * 该实验体是否只在「显示技能伤害统计测试英雄」开关下可见。
 */
function heroDamageTestOnly(hero) {
  const entry = HERO_STATUS.heroes?.[hero];
  if (entry && typeof entry.damageTestOnly === 'boolean') return entry.damageTestOnly;
  return HERO_STATUS.defaultDamageTestOnly !== false;
}

// 已核对的排在前面，其余按官方顺序
const HEROES = (() => {
  const names = [...MANUAL_HEROES, ...CHARACTERS.map((character) => character.name)]
    .filter((name, index, all) => all.indexOf(name) === index);
  return [...names.filter((name) => !heroDamageTestOnly(name)), ...names.filter(heroDamageTestOnly)];
})();

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
// 装备栏的「不穿」选项。存的是空串，byName 查不到就自然被 filter(Boolean) 丢掉，
// 所以计算侧不需要任何特判；只有那两个「自动补一件」的 effect 要认得它。
const EMPTY_GEAR_VALUE = '';
const EMPTY_GEAR_LABEL = '（空）';
const isEmptyGear = (name) => !String(name ?? '').trim();
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
// core: true 的永远列在勾选栏里；其余只有当某个方案真的有这项数值时才出现，
// 免得给不吃冷却缩减的配装也塞一堆恒为 0 的列。
const COMPARISON_STAT_METRICS = [
  { key: 'ap', label: '最终法强', core: true },
  { key: 'attackPower', label: '攻击力', core: true },
  { key: 'baseAttackPower', label: '基础攻击', core: true },
  { key: 'extraAttackPower', label: '额外攻击', core: true },
  { key: 'basicAttack', label: '每发平A预估', core: true },
  { key: 'finalMod', label: '最终伤害倍率', core: true },
  // 装备特效伤害不进上面那排勾选，单独常驻一个开关（勾上还会带出逐条特效明细）
  { key: 'effectSubtotal', label: '装备特效伤害', standalone: true },
  { key: 'pen', label: '防穿数值' },
  { key: 'penPct', label: '防穿%' },
  { key: 'totalDamageBonus', label: '伤害提升%' },
  { key: 'cd', label: '冷却缩减' },
  { key: 'basicAttackAmp', label: '普攻增幅' },
  { key: 'extraHp', label: '额外体力' },
  { key: 'defense', label: '防御力' },
  { key: 'critChance', label: '暴击率' },
  { key: 'critDamage', label: '暴击伤害' },
  { key: 'attackSpeed', label: '攻击速度' },
  { key: 'moveSpeed', label: '移动速度' },
  { key: 'skillAmpPct', label: '技能增幅%' }
];
const DEFAULT_COMPARISON_METRICS = ['ap', 'basicAttack'];
// 差值面板在折叠记忆里用的键。带前缀是为了不和指标 key（ap / attackPower …）撞上，
// 那些键同样存在 collapsedComparisonCharts 里。
const DELTA_PANEL_KEY = '__deltaPanel';

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
  selectedMetrics: DEFAULT_COMPARISON_METRICS,
  // 差值面板：拿哪个方案当基准、比哪一项。空串表示「用第一个方案」，
  // 这样方案被删掉或改名时不会卡在一个不存在的 id 上。
  deltaBaselineId: '',
  deltaMetric: 'ap'
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

// 增益类条目把每级的百分点写在 bases 里（例如卡洛琳 W 的 "5,7,9" = 5%/7%/9%）
const BUFF_KEY_LABELS = {
  apPct: '技能增幅百分比',
  damageBonus: '伤害提升',
  skillDamageBonus: '技能伤害提升',
  basicAttackAmp: '普攻增幅',
  attackSpeedRatio: '额外攻击速度',
  ap: '技能增幅',
  attackPower: '攻击力',
  healShieldAmp: '恢复与护盾效果'
};
// 大部分增益条目的 bases 写的是百分点（5 = 5%），但「技能增幅 +10」这种是实打实的点数，
// 不能再除以 100。这里列出按原值取的 buffKey。
const BUFF_FLAT_KEYS = new Set(['ap', 'attackPower']);

function buffValueAtLevel(skill, level) {
  const values = String(skill?.bases || '').split(',').map((value) => getNumber(value));
  if (!values.length) return 0;
  const index = Math.max(0, Math.min(values.length - 1, getNumber(level) - 1));
  if (BUFF_FLAT_KEYS.has(skill?.buffKey)) return values[index];
  return values[index] / 100;
}

/** 当前英雄的增益条目按「所在技能等级 × 已选层数」汇总成各个桶的加成。 */
/**
 * 叠层数：用户没动过步进器时取条目上的 defaultStacks（夏洛特 R 那种无条件常驻的被动写 1），
 * 动过就以用户选的为准 —— 所以要区分「没设过」和「手动设成 0」。
 */
function buffStackStateKey(skill) {
  return skill?.stackGroup ? `${skill.stackGroup}-buffStacks` : `${skill.id}-buffStacks`;
}

function buffStackCount(skill, stackCounts = {}) {
  const maxStacks = Math.max(1, getNumber(skill.maxStacks) || 1);
  const saved = stackCounts[buffStackStateKey(skill)];
  const value = saved === undefined || saved === null || saved === ''
    ? getNumber(skill.defaultStacks)
    : getNumber(saved);
  return Math.max(0, Math.min(maxStacks, value));
}

/**
 * 一条增益实际贡献多少。
 *
 * 默认是「每层 × 层数」。但有的效果是**攒够了才一次性给**，不是逐层累加——
 * 西尔维娅 P 卢米亚越野赛探索满 10 个区域才 +5% 技能增幅，路上 9 个区域一点都没有。
 * 这类条目写 "onlyAtMaxStacks": true，没到满层贡献 0，到了就给一份（不乘层数）。
 */
function buffContribution(skill, level, stacks) {
  const perStack = buffValueAtLevel(skill, level);
  if (!skill?.onlyAtMaxStacks) return perStack * stacks;
  const maxStacks = Math.max(1, getNumber(skill.maxStacks) || 1);
  return stacks >= maxStacks ? perStack : 0;
}

function buffTotals(skillRows, skillLevels = {}, stackCounts = {}) {
  return skillRows.filter((skill) => skill.kind === 'buff').reduce((totals, skill) => {
    const level = getNumber(skillLevels[skill.id]) || 1;
    const stacks = buffStackCount(skill, stackCounts);
    const key = skill.buffKey || 'apPct';
    return { ...totals, [key]: getNumber(totals[key]) + buffContribution(skill, level, stacks) };
  }, { apPct: 0, damageBonus: 0, skillDamageBonus: 0, basicAttackAmp: 0, ap: 0, attackPower: 0, healShieldAmp: 0, attackSpeedRatio: 0 });
}

/** 体力百分比控件：滑条 + 右侧数字框，和技能面板表头那个自身当前体力同一套。 */
function HpRatioSlider({ label, value, onChange, note }) {
  return (
    <div className="hpRatioSlider">
      <div className="hpRatioSliderHead">
        <span>{label}</span>
        {note}
      </div>
      <div className="stackSlider">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.max(0, Math.min(100, getNumber(value)))}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label={label}
        />
        <input
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={(event) => onChange(getNumber(event.target.value))}
          aria-label={`${label}（手动输入）`}
        />
        <small>%</small>
      </div>
    </div>
  );
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
const EFFECT_TOGGLE_META = (() => {
  const map = new Map();
  for (const effect of [...(ITEM_EFFECT_DAMAGE.effects || []), ...(ITEM_EFFECT_MODIFIERS.effects || [])]) {
    if (!effect.toggle) continue;
    const prev = map.get(effect.name);
    map.set(effect.name, {
      name: effect.name,
      label: prev?.label || effect.toggle.label || effect.name,
      situational: Boolean(prev?.situational || effect.toggle.situational),
      zone: Boolean(prev?.zone || effect.toggle.zone)
    });
  }
  return map;
})();

const REALISTIC_HIT_EFFECT_NAMES = new Set(
  (ITEM_EFFECT_DAMAGE.effects || [])
    .filter((effect) => getNumber(effect.realisticHits) > 0 && getNumber(effect.hits) > 1)
    .map((effect) => effect.name)
);

function hasRealisticHitEffects(items = []) {
  return items.some((item) => uniqueEffectsForItem(item).some((name) => REALISTIC_HIT_EFFECT_NAMES.has(name)));
}

function toggleableEffectsFor(items) {
  const equipped = new Set(items.flatMap((item) => uniqueEffectsForItem(item)));
  return [...EFFECT_TOGGLE_META.values()].filter((meta) => equipped.has(meta.name));
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
function equipmentEffectDamages(items, context, effectToggles = {}, { realisticEffectHits = false } = {}) {
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
      const fullHits = Math.max(1, getNumber(effect.hits) || 1);
      const rHits = Math.max(1, getNumber(effect.realisticHits) || 0);
      const useRealistic = Boolean(realisticEffectHits && getNumber(effect.realisticHits) > 0 && rHits < fullHits);
      const hits = useRealistic ? rHits : fullHits;
      const suffix = SUFFIX[effect.damageType] || '(技)';
      const stableId = `item-effect:${effect.name}:${effect.label || effect.name}:${effect.damageType || 'skill'}`;
      const from = (owners.get(effect.name) || []).join('、');
      const hitTitleSuffix = fullHits > 1
        ? (useRealistic ? ` ×${hits}/${fullHits}（实战折算）` : ` ×${fullHits}`)
        : '';
      const hitNoteText = fullHits > 1
        ? (useRealistic
          ? `单次 ${single}，当前按实战折算 ${hits}/${fullHits} 跳计入（满额 ${fullHits} 跳合计 ${single * fullHits}）`
          : `单次 ${single}，共 ${fullHits} 次`)
        : '';
      return {
        id: stableId,
        title: `${effect.label || effect.name}${suffix}${hitTitleSuffix}`,
        raw: raw * hits,
        value: single * hits,
        // 护盾不是伤害，不进「特效小计」
        excludeFromSubtotal: effect.damageType === 'shield',
        note: [effect.coefficientText, hitNoteText, effect.note, from ? `来自 ${from}` : '']
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
    ap: 0, apPct: 0, attackPower: 0, attackPowerPct: 0, damageBonus: 0,
    pen: 0, penPct: 0, targetDefensePct: 0, cd: 0, cdFromExtraAttackPct: 0, basicAttackBonus: 0,
    attackSpeedRatio: 0
  };
  const applied = [];

  for (const effect of ITEM_EFFECT_MODIFIERS.effects || []) {
    if (!equipped.has(effect.name)) continue;
    if (!effectEnabled(effect, effectToggles)) continue;
    const below = effect.condition?.targetHpBelow;
    if (below !== undefined && targetHpRatio >= below) continue;
    const above = effect.condition?.targetHpAbove;
    if (above !== undefined && targetHpRatio < above) continue;
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
      skillAmpRatio: statValue(item.stats, 'skillAmpRatio')
        || (!item.uniqueApPct && !statValue(item.stats, 'uniqueSkillAmpRatio') ? getNumber(item.apPct) : 0)
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

function loadSavedHeroPresets() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SAVED_PRESETS_KEY));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function encodeBase64UrlUtf8(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64UrlUtf8(encoded) {
  const normalized = String(encoded || '').trim().replace(/-/g, '+').replace(/_/g, '/');
  if (!normalized) return '';
  const padded = normalized + '==='.slice((normalized.length + 3) % 4);
  const binary = window.atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function parseSharedBuildFromUrl() {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const rawParam = params.get('b');
    if (!rawParam) return null;
    const data = JSON.parse(decodeBase64UrlUtf8(rawParam));
    if (!data || typeof data !== 'object') return null;

    const itemByCode = new Map(INITIAL_EQUIPMENT.filter((i) => i.code).map((i) => [String(i.code), i]));
    const charByCode = new Map(CHARACTERS.map((c) => [Number(c.code), c]));
    const heroChar = typeof data.h === 'number' ? charByCode.get(data.h) : findCharacterByName(String(data.h || ''));
    const selectedHero = heroChar?.name || (typeof data.h === 'string' && data.h ? data.h : DEFAULT_HERO);

    const gearArr = Array.isArray(data.g) ? data.g : [];
    const gear = {};
    SLOTS.forEach((slot, idx) => {
      const token = gearArr[idx];
      if (token === 0 || token === '' || token === null || token === undefined) {
        gear[slot] = '';
      } else {
        const matched = itemByCode.get(String(token)) || INITIAL_EQUIPMENT.find((it) => it.name === String(token));
        gear[slot] = matched ? matched.name : String(token);
      }
    });

    const tArr = Array.isArray(data.t) ? data.t : [];
    const traitSelection = normalizeTraitSelection({
      group: tArr[0] || DEFAULT_TRAIT_SELECTION.group,
      core: tArr[1] || '',
      sub1: tArr[2] || '',
      sub2: tArr[3] || '',
      secondaryGroup: tArr[4] || DEFAULT_TRAIT_SELECTION.secondaryGroup,
      secondarySub1: tArr[5] || '',
      secondarySub2: tArr[6] || ''
    });

    const weaponRaw = String(data.w || weaponTypeRaw(byName(INITIAL_EQUIPMENT, gear['武器'])) || '');
    const weaponTypeFilter = weaponRaw ? weaponTypeLabelForRaw(weaponRaw) : '全部类型';
    const fArr = Array.isArray(data.f) ? data.f : [];
    const tacticalSkill = fArr[0] || '斥力弹';
    const tacticalUpgraded = fArr[1] === undefined ? true : Boolean(fArr[1]);
    const talentAp = getNumber(fArr[2]);

    const tgArr = Array.isArray(data.tg) ? data.tg : [];
    const targetIndex = Number.isInteger(tgArr[0]) && TARGETS[tgArr[0]] ? tgArr[0] : 0;
    const baseTarget = TARGETS[targetIndex] || TARGETS[0];
    const target = {
      ...baseTarget,
      name: targetIndex === 0 && (tgArr[1] !== baseTarget.hp || tgArr[2] !== baseTarget.defense) ? '自定义木桩' : baseTarget.name,
      hp: tgArr[1] !== undefined ? getNumber(tgArr[1]) : baseTarget.hp,
      defense: tgArr[2] !== undefined ? getNumber(tgArr[2]) : baseTarget.defense,
      defenseReduction: getNumber(tgArr[3]),
      reduction: getNumber(tgArr[4])
    };
    const targetMastery = Math.max(1, Math.min(20, getNumber(tgArr[5]) || 1));
    const targetHpPct = tgArr[6] !== undefined ? Math.max(0, Math.min(100, getNumber(tgArr[6]))) : 100;
    const selfHpPct = tgArr[7] !== undefined ? Math.max(0, Math.min(100, getNumber(tgArr[7]))) : 100;
    const autoSyncSelfHp = tgArr[8] === undefined ? true : Boolean(tgArr[8]);
    const selfHp = getNumber(tgArr[9]) || 2514;

    const extra = data.x && typeof data.x === 'object' ? data.x : {};
    const effectToggles = {};
    if (Array.isArray(extra.ef)) {
      extra.ef.forEach((k) => { if (k) effectToggles[String(k)] = true; });
    }
    const quickComboItems = Array.isArray(extra.cb)
      ? extra.cb.map((c) => ({
        key: String(c[0] || ''),
        kind: String(c[1] || 'skill'),
        refId: c[2] || undefined,
        label: String(c[3] || ''),
        count: Math.max(1, getNumber(c[4]) || 1),
        hits: c[5] || undefined,
        scale: c[6] || undefined,
        step: c[7] !== null && c[7] !== undefined ? getNumber(c[7]) : undefined
      })).filter((c) => c.key)
      : [];

    return {
      activePage: 'calculator',
      selectedHero,
      mastery: Math.max(1, Math.min(20, getNumber(data.m) || 20)),
      weaponRaw,
      weaponTypeFilter,
      gear,
      traitSelection,
      tacticalSkill,
      tacticalUpgraded,
      talentAp,
      targetIndex,
      target,
      targetMastery,
      targetHpPct,
      selfHpPct,
      autoSyncSelfHp,
      selfHp,
      effectToggles,
      vampireFull: Boolean(extra.vf),
      r2Stacks: extra.st !== undefined ? Math.max(0, getNumber(extra.st)) : undefined,
      damageBonus: extra.db !== undefined ? getNumber(extra.db) : 0,
      skillReduction: extra.sr !== undefined ? getNumber(extra.sr) : 0,
      heroFormChoice: extra.fm,
      quickComboItems
    };
  } catch {
    return null;
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
    groupRowsByMastery: settings?.groupRowsByMastery ?? DEFAULT_COMPARISON_SETTINGS.groupRowsByMastery,
    deltaBaselineId: String(settings?.deltaBaselineId ?? DEFAULT_COMPARISON_SETTINGS.deltaBaselineId),
    deltaMetric: String(settings?.deltaMetric || DEFAULT_COMPARISON_SETTINGS.deltaMetric)
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
    // 该条公告发布时的应用版本；老数据没有这个字段，归档时就只写日期
    version: typeof value?.version === 'string' ? value.version : (DEFAULT_ANNOUNCEMENT.version || ''),
    showBadge: typeof value?.showBadge === 'boolean' ? value.showBadge : Boolean(DEFAULT_ANNOUNCEMENT.showBadge)
  };
}

/**
 * 发布新公告：把当前这条按「vX / 日期：正文」的格式压进历史公告最前面，
 * 然后腾空标题和正文等着写新的。旧公告为空时不产生空条目。
 */
function archiveAnnouncement(announcement) {
  // 用这条公告自己发布时的版本号，而不是当前版本
  const stamp = [announcement.version, announcement.updatedAt].filter(Boolean).join(' / ');
  const previous = [announcement.title, announcement.body].filter(Boolean).join('\n').trim();
  const archived = previous ? `${stamp ? `${stamp}：` : ''}${previous}` : '';
  const history = [archived, announcement.history].filter(Boolean).join('\n\n');
  return { ...announcement, title: '公告', body: '', version: '', history };
}

function loadAnnouncement() {
  if (!HELP_NOTES_EDITABLE) return normalizeAnnouncement(DEFAULT_ANNOUNCEMENT);

  try {
    const saved = JSON.parse(window.localStorage.getItem(ANNOUNCEMENT_KEY));
    if (saved && DEFAULT_ANNOUNCEMENT.updatedAt && saved.updatedAt && saved.updatedAt < DEFAULT_ANNOUNCEMENT.updatedAt) {
      window.localStorage.removeItem(ANNOUNCEMENT_KEY);
      return normalizeAnnouncement(DEFAULT_ANNOUNCEMENT);
    }
    return normalizeAnnouncement({ ...DEFAULT_ANNOUNCEMENT, ...(saved || {}) });
  } catch {
    return normalizeAnnouncement(DEFAULT_ANNOUNCEMENT);
  }
}

/**
 * 公告的身份。版本号、日期、标题、正文任意一处变了就算一条新公告，
 * 进站时会重新自动弹窗；没变则不再打扰。
 */
function announcementSignature(announcement) {
  return [announcement?.version, announcement?.updatedAt, announcement?.title, announcement?.body]
    .map((part) => String(part || ''))
    .join('|');
}

function loadSeenAnnouncement() {
  try {
    return window.localStorage.getItem(ANNOUNCEMENT_SEEN_KEY) || '';
  } catch {
    return '';
  }
}

function rememberSeenAnnouncement(signature) {
  try {
    window.localStorage.setItem(ANNOUNCEMENT_SEEN_KEY, signature);
  } catch {
    /* 隐私模式下写不进去就算了，大不了下次再弹一次 */
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
  if (!character) return '';
  const rawImage = String(character.image || '');
  const imageName = rawImage.split('/').pop();
  const lowerName = imageName.toLowerCase();
  const codePrefix = character.code ? `/${String(character.code).padStart(3, '0')}-` : '';
  const entries = Object.entries(CHARACTER_IMAGE_URLS);
  const exact = imageName && entries.find(([p]) => p.endsWith(`/${imageName}`));
  if (exact) return exact[1];
  const ciMatch = lowerName && entries.find(([p]) => p.toLowerCase().endsWith(`/${lowerName}`));
  if (ciMatch) return ciMatch[1];
  const prefixMatch = codePrefix && entries.find(([p]) => p.includes(codePrefix));
  if (prefixMatch) return prefixMatch[1];
  return rawImage ? rawImage.replace(/^\/assets\//, './assets/') : '';
}

function CharacterAvatar({ character, fallbackName = '', className = '' }) {
  const src = characterImageSrc(character);
  const [failedSrc, setFailedSrc] = useState('');
  const label = (character?.name || fallbackName || '?').slice(0, 1);
  if (!src || failedSrc === src) {
    return <span className={`heroAvatarFallback ${className}`.trim()} aria-hidden="true">{label}</span>;
  }
  return (
    <img
      key={`${character?.code || fallbackName}-${src}`}
      className={className || undefined}
      src={src}
      alt={character?.name || fallbackName}
      onError={() => setFailedSrc(src)}
    />
  );
}

function loadoutImageSrc(source) {
  if (!source) return '';
  const normalized = source.replace(/^\/assets\/loadout\//, '../assets/loadout/');
  return LOADOUT_IMAGE_URLS[normalized] || source;
}

function weaponSkillImageSrc(source) {
  if (!source) return '';
  const normalized = source.replace(/^\/assets\/game-icons\/weapon-skills\//, '../assets/game-icons/weapon-skills/');
  return WEAPON_SKILL_IMAGE_URLS[normalized] || source;
}

function weaponTypeRaw(item) {
  if (item?.weaponTypeRaw) return item.weaponTypeRaw;
  return String(item?.weaponType || '').split('/').pop()?.trim() || '';
}

function weaponTypeFromFilter(type) {
  if (!type || type === '全部类型') return '';
  return String(type).split('/').pop()?.trim() || '';
}

/**
 * 「只对自己某几段伤害生效」的增伤，直接在那一段下面多列一行增益后的值。
 *
 * 和易伤类区分开：像秀雅 Q 冲撞点那种「站在上面的敌人承受**全部**伤害 +30%」，
 * 队友的伤害也会被放大，属于全局乘区，走 specialSkillRules 的 modifiers 开关。
 * 而彰一 E 协商那种「被标识的敌人**因投掷的短剑**承受伤害 +25%」只影响他自己那两段短剑，
 * 做成开关既容易误开、也没法只作用于部分段，所以直接写进受影响的技能条目：
 *
 *   "selfAmp": { "source": "协商", "multiplier": 1.25, "note": "……" }
 *
 * 页面会在总计那行下面多一行「受协商增伤时伤害」。
 */
function selfAmpRule(skill) {
  const rule = skill?.selfAmp;
  const multiplier = getNumber(rule?.multiplier);
  if (!rule?.source || !Number.isFinite(multiplier) || multiplier <= 0) return null;
  return { source: String(rule.source), multiplier, note: rule.note || '' };
}

function weaponTypeLabelForRaw(rawType) {
  if (!rawType) return '全部类型';
  return WEAPON_TYPE_OPTIONS.find((type) => weaponTypeFromFilter(type) === rawType) || '全部类型';
}

// ---- 官方武器路线推荐做的装备预设 ----
//
// 键是「实验体名|武器类型」。换实验体或换武器类型时，如果用户没自己改过这个组合的配装，
// 就套用预设；改过就用用户存下来的那套（heroLoadouts，落在 localStorage 里）。
// 判断「改没改过」不用标志位：把当前配装和预设逐项比一遍，一致就说明还没动过。
const ROUTE_PRESETS = WEAPON_ROUTE_PRESETS.presets || {};

// 数据跟到哪一版公告。刻意和 patches 里最后一条分开：
// 只有 bug 修复、没动数值的版本（12.2a / 12.2c）不会产生补丁条目，
// 但我们确实核对过它们了，页面上要如实显示跟进到的版本而不是最后一次改数值的版本。
const GAME_VERSION = PATCH_LOG.gameVersion || {};

function loadoutKeyFor(hero, weaponRawType) {
  return `${hero || ''}|${weaponRawType || ''}`;
}

function loadoutFieldsEqual(left, right) {
  if (!left || !right) return false;
  if (SLOTS.some((slot) => String(left.gear?.[slot] ?? '') !== String(right.gear?.[slot] ?? ''))) return false;
  const traitKeys = ['group', 'core', 'sub1', 'sub2', 'secondaryGroup', 'secondarySub1', 'secondarySub2'];
  if (traitKeys.some((key) => String(left.traitSelection?.[key] ?? '') !== String(right.traitSelection?.[key] ?? ''))) return false;
  return String(left.tacticalSkill ?? '') === String(right.tacticalSkill ?? '');
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

function weaponBaseAttackSpeedFor(rawType) {
  if (!rawType) return 0;
  return getNumber(WEAPON_TYPE_INFO.weaponTypes?.[rawType]?.attackSpeed);
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

/**
 * 天界典藏（潜能 7310701）：按当前装备的物品等级分档给属性。
 *
 * 官方文案的等级词与我们数据里的对应关系：英雄 = Epic，传说 = Legend，
 * 超凡 = Mythic（equipment.json 沿用旧译名「神话」，所以按 itemGrade 判定而不是 quality）。
 * 「攻击力+X 或 技能增幅+Y」跟其它潜能一样，按该实验体的主输出路线二选一。
 */
const ITEM_GRADE_RANK = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legend: 4, Mythic: 5 };

function celestialCollectionBonus(items, usesAttackPath) {
  const atLeast = (rank) => items.filter((item) => (ITEM_GRADE_RANK[item?.itemGrade] ?? -1) >= rank).length;
  const epicPlus = atLeast(ITEM_GRADE_RANK.Epic);
  const legendPlus = atLeast(ITEM_GRADE_RANK.Legend);
  const mythicPlus = atLeast(ITEM_GRADE_RANK.Mythic);

  const tiers = [];
  let ap = 0;
  let attackPower = 0;
  if (epicPlus >= 5) {
    if (usesAttackPath) attackPower += 2; else ap += 4;
    tiers.push(`5 件英雄+：${usesAttackPath ? '攻击力 +2' : '技能增幅 +4'}`);
  }
  if (legendPlus >= 1) {
    if (usesAttackPath) attackPower += 3; else ap += 6;
    tiers.push(`1 件传说+：${usesAttackPath ? '攻击力 +3' : '技能增幅 +6'}`);
  }
  const defense = legendPlus >= 2 ? 2 : 0;
  if (defense) tiers.push('2 件传说+：防御力 +2');
  const maxHp = legendPlus >= 3 ? 40 : 0;
  if (maxHp) tiers.push('3 件传说+：体力 +40');
  if (legendPlus >= 4) tiers.push('4 件传说+：移动速度 +1%（不影响伤害）');
  const penPct = legendPlus >= 5 ? 0.01 : 0;
  if (penPct) tiers.push('5 件传说+：防御穿透 +1%');
  if (mythicPlus >= 1) tiers.push('1 件超凡+：吸血-所有伤害 +3%（不影响伤害）');
  if (mythicPlus >= 2) tiers.push('2 件超凡+：负面效果抵御 +5%（不影响伤害）');

  return { ap, attackPower, defense, maxHp, penPct, tiers, epicPlus, legendPlus, mythicPlus };
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
      attackSpeedRatio: bonus.attackSpeedRatio + getNumber(effect.attackSpeedRatio),
      effectIds: effect.extraEffect ? [...bonus.effectIds, effect.extraEffect] : bonus.effectIds,
      damageEffects: effect.damageEffect ? [...bonus.damageEffects, effect.damageEffect] : bonus.damageEffects,
      summaries: effect.summary ? [...bonus.summaries, `${trait.name}: ${effect.summary}`] : bonus.summaries
    };
  }, { ap: 0, pen: 0, penPct: 0, cd: 0, dmgAmp: 0, defense: 0, maxHp: 0, attackSpeedRatio: 0, effectIds: [], damageEffects: [], summaries: [] });
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
    bonuses.attackSpeedRatio ? `攻速 +${pct(bonuses.attackSpeedRatio)}` : '',
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
    bonuses.attackSpeedRatio ? `攻速 +${pct(bonuses.attackSpeedRatio)}` : '',
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

/**
 * 普攻伤害。官方 Wiki 给的顺序是：
 *   ((攻击力 × 100/(100+防御) × 暴击修正) + 普攻额外伤害 − 目标承受普攻伤害减少)
 *     × (1 + 普攻增幅% − 目标普攻减伤%)
 * 关键点有两条：
 *   1. 「普攻额外伤害」是防御之后才加的固定值，不吃防御，也不吃暴击；
 *   2. 「普攻增幅%」是最后一道乘区，跟技能增幅% 是两个互不相干的桶。
 */
function calculateBasicAttackDamage({
  attackPower,
  target,
  armorPenetration,
  armorPenetrationRatio,
  flatBonus = 0,
  damageIncreaseRatio,
  targetDamageReductionRatio,
  criticalStrikeChance,
  criticalStrikeDamage,
  critScaledBasicAttack = null
}) {
  const finalDefense = target.defense * (1 - target.defenseReduction) * (1 - armorPenetrationRatio) - armorPenetration;
  const defenseMod = 100 / (100 + finalDefense);
  const damageMod = 1 + damageIncreaseRatio - targetDamageReductionRatio;
  const criticalMultiplier = 1.75 + criticalStrikeDamage;
  const afterDefense = attackPower * defenseMod;
  const chance = Math.max(0, Math.min(1, criticalStrikeChance));
  // 莉央 P 集中：普攻无法暴击，基础伤害按 102% + 暴击率 × (75% + 额外暴击伤害) 转化结算
  if (critScaledBasicAttack) {
    const scale = getNumber(critScaledBasicAttack.baseScale) + chance * (getNumber(critScaledBasicAttack.critDamageBase) + criticalStrikeDamage);
    const scaledHit = damageFloor((afterDefense * scale + flatBonus) * damageMod);
    return {
      finalDefense,
      defenseMod,
      damageMod,
      flatBonus,
      normal: scaledHit,
      critical: scaledHit,
      criticalMultiplier: scale,
      cannotCrit: true,
      criticalStrikeChance: chance,
      criticalStrikeDamage,
      damageIncreaseRatio,
      targetDamageReductionRatio
    };
  }
  const normal = damageFloor((afterDefense + flatBonus) * damageMod);
  // 固定值不参与暴击倍率，所以暴击不能直接拿 normal 乘
  const critical = damageFloor((afterDefense * criticalMultiplier + flatBonus) * damageMod);

  return {
    finalDefense,
    defenseMod,
    damageMod,
    flatBonus,
    normal,
    critical,
    criticalMultiplier,
    cannotCrit: false,
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
      const raw = isUpgraded ? 150 + heroLevel * 12 : 120 + heroLevel * 7;
      return tacticalDamageResult('等离子冲击F', raw, finalMod, isUpgraded ? '150 + 等级*12；命中后5秒内防御力降低10%' : '120 + 等级*7');
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
  characterAttackSpeedOffset = 0,
  weaponRaw = '',
  baseDefense = 0,
  baseMaxHp = 0,
  talentAp,
  traitBonuses = {},
  selectedTraits = [],
  target,
  targetMastery,
  targetHpPct = 100,
  selfHpPct = 100,
  selfHp,
  autoSyncSelfHp = false,
  selfShield = 0,
  accumulatedDamage = 0,
  damageBonus,
  skillReduction,
  r2Stacks,
  tacticalSkill,
  tacticalUpgraded,
  vampireFull,
  effectToggles = {},
  realisticEffectHits = false,
  heroModifierChoices = {},
  skillTargetCounts = {},
  selectedHero,
  heroForm,
  weaponSkillLevel = 0,
  hammerShredActive = false,
  combos = []
}) {
  const selected = SLOTS.map((slot) => byName(equipment, gear[slot])).filter(Boolean);
  const resolvedWeaponRaw = weaponRaw || weaponTypeRaw(selected.find((item) => item?.type === '武器'));
  const targetHpRatio = Math.max(0, Math.min(1, getNumber(targetHpPct) / 100));
  const selfHpRatio = Math.max(0, Math.min(1, getNumber(selfHpPct) / 100));
  const passiveStatRule = passiveStatRuleFor(selectedHero);
  // 英雄专属的条件修正（卡洛琳 W 的镜子增幅、秀雅 Q 冲撞点的承受伤害提升）
  const heroModifiers = heroModifierTotals(selectedHero, heroModifierChoices);
  const equipmentStats = aggregateEquipmentStats(selected, mastery);
  const activeTraitEffectIds = new Set(traitBonuses.effectIds || []);
  const talentPen = getNumber(traitBonuses.pen);
  const talentPenPct = getNumber(traitBonuses.penPct);
  const talentDamageBonus = getNumber(traitBonuses.dmgAmp);
  // 玛蒂娜那种带形态开关的英雄，只保留当前形态的条目（不写 form 的条目两态都留）
  const selectedHeroSkillRows = filterSkillsByForm(
    selectedHero,
    skillTable.filter((skill) => skill.hero === selectedHero),
    heroForm
  );
  // 增益类条目（卡洛琳 W 的镜子技能增幅）：按所在技能等级 × 已选层数进对应的桶
  const buffs = buffTotals(selectedHeroSkillRows, skillLevels, skillTargetCounts);
  const offensePath = primaryOffensePath({ skills: selectedHeroSkillRows, masteryStat });
  const usesAttackPath = offensePath === 'attack';
  // 1 点适应力 = 1 攻击力 或 2 技能增幅（随实验体主路径二选一）
  const equipAdaptive = statValue(equipmentStats, 'adaptiveForce');
  const baseEquipSkillAmp = statValue(equipmentStats, 'skillAmp') || selected.reduce((sum, item) => sum + getNumber(item.ap), 0);
  const equipAp = baseEquipSkillAmp + (usesAttackPath ? 0 : equipAdaptive * 2);
  const equipAttackPower = statValue(equipmentStats, 'attackPower') + (usesAttackPath ? equipAdaptive : 0);
  const vampireStackAp = usesAttackPath ? 0 : (vampireFull ? 30 + mastery : 0);
  const vampireStackAttackPower = usesAttackPath && vampireFull ? 15 + mastery * 0.5 : 0;
  // 装备独有效果的修正项统一从 itemEffectModifiers.json 取，不再散落成魔法数字
  const effectMods = equipmentEffectModifiers(selected, {
    effectToggles,
    targetHpRatio: Math.max(0, Math.min(1, getNumber(targetHpPct) / 100))
  });
  const stackAp = vampireStackAp + effectMods.ap;
  const stackAttackPower = vampireStackAttackPower + effectMods.attackPower + buffs.attackPower;

  // ---- 真实面板攻速与攻速转化引擎（WeaponTypeInfo + 熟练度 + 装备 + 潜能 + 触发特效） ----
  const weaponBaseAttackSpeed = weaponBaseAttackSpeedFor(resolvedWeaponRaw);
  const baseAttackSpeed = getNumber(characterAttackSpeedOffset) + weaponBaseAttackSpeed;
  const masteryAttackSpeedRatio = mastery * masteryOptionValue(masteryStat, 'AttackSpeedRatio');
  const equipAttackSpeedRatio = statValue(equipmentStats, 'attackSpeedRatio');
  const traitAttackSpeedRatio = getNumber(traitBonuses.attackSpeedRatio);
  const effectAttackSpeedRatio = getNumber(effectMods.attackSpeedRatio);
  const buffAttackSpeedRatio = getNumber(buffs.attackSpeedRatio);
  const totalBonusAttackSpeed = masteryAttackSpeedRatio + equipAttackSpeedRatio + traitAttackSpeedRatio + effectAttackSpeedRatio + buffAttackSpeedRatio;
  const uncappedAttackSpeed = baseAttackSpeed * (1 + totalBonusAttackSpeed);
  const asRule = attackSpeedRuleFor(selectedHero);
  const attackSpeedCap = getNumber(asRule?.cap) > 0 ? getNumber(asRule.cap) : 2.5;
  const attackSpeedFixed = asRule?.mode === 'fixedBase' || asRule?.mode === 'levelFixed';
  const finalAttackSpeed = asRule?.mode === 'fixedBase'
    ? baseAttackSpeed
    : asRule?.mode === 'levelFixed'
      ? Math.min(attackSpeedCap, baseAttackSpeed + Math.max(0, mastery - 1) * getNumber(asRule.perLevelAttackSpeed))
      : Math.min(attackSpeedCap, uncappedAttackSpeed);

  // 被动等级（供阿德拉 P 1~3 级分段比例使用：优先读 P 槽等级，无 P 条目时按游戏 1/5/9 级解锁）
  const passiveSkillRow = selectedHeroSkillRows.find((s) => (s.slot === 'P' || /^P\b/.test(s.title || '')));
  const passiveLevel = passiveSkillRow
    ? clampLevel(passiveSkillRow, skillLevels[passiveSkillRow.id])
    : (mastery >= 9 ? 3 : mastery >= 5 ? 2 : 1);

  let asConvertedAp = 0;
  if (Array.isArray(asRule?.convertPer001BonusAsToApByPassiveLevel) && baseAttackSpeed > 0) {
    const ratioIdx = Math.max(0, Math.min(asRule.convertPer001BonusAsToApByPassiveLevel.length - 1, passiveLevel - 1));
    const per001Ratio = getNumber(asRule.convertPer001BonusAsToApByPassiveLevel[ratioIdx]);
    const bonusSteps001 = Math.max(0, Math.floor((uncappedAttackSpeed - baseAttackSpeed + 1e-6) * 100));
    asConvertedAp = round(bonusSteps001 * per001Ratio, 2);
  } else if (getNumber(asRule?.convertPer001ExcessAsToAp) > 0 && baseAttackSpeed > 0) {
    const excessSteps001 = Math.max(0, Math.floor((uncappedAttackSpeed - attackSpeedCap + 1e-6) * 100));
    asConvertedAp = round(excessSteps001 * getNumber(asRule.convertPer001ExcessAsToAp), 2);
  }

  const masteryApPct = mastery * masteryOptionValue(masteryStat, 'SkillAmpRatio');
  const masteryAttackPower = mastery * masteryOptionValue(masteryStat, 'AttackPower');
  const masteryBasicAttackDamageRatio = mastery * masteryOptionValue(masteryStat, 'IncreaseBasicAttackDamageRatio');
  const baseAttackPower = attack + masteryAttackPower;

  // 先算不含超频（overclock）的基础潜能加值，用于翡翠额外攻击力与幻影行者（磨砺）
  const concentrationAp = activeTraitEffectIds.has('concentration') && !usesAttackPath ? 32 : 0;
  const concentrationAttackPower = activeTraitEffectIds.has('concentration') && usesAttackPath ? 16 : 0;
  const huntBearAp = activeTraitEffectIds.has('huntBear') && !usesAttackPath ? 20 : 0;
  const huntBearAttackPower = activeTraitEffectIds.has('huntBear') && usesAttackPath ? 10 : 0;
  const rapidShotAp = activeTraitEffectIds.has('rapidShot') && !usesAttackPath ? 4 + mastery : 0;
  const rapidShotAttackPower = activeTraitEffectIds.has('rapidShot') && usesAttackPath ? 2 + mastery * 0.5 : 0;
  const rChargerAp = activeTraitEffectIds.has('rCharger') && !usesAttackPath ? 10 + mastery : 0;
  const rChargerAttackPower = activeTraitEffectIds.has('rCharger') && usesAttackPath ? 5 + mastery * 0.5 : 0;
  const celestial = activeTraitEffectIds.has('celestialCollection')
    ? celestialCollectionBonus(selected, usesAttackPath)
    : { ap: 0, attackPower: 0, defense: 0, maxHp: 0, penPct: 0, tiers: [] };

  const baseTalentAttackPower = concentrationAttackPower + huntBearAttackPower + rapidShotAttackPower + rChargerAttackPower + celestial.attackPower;
  const prelimExtraAttack = equipAttackPower + baseTalentAttackPower + stackAttackPower;
  const bonusAsSteps1Pct = Math.max(0, Math.floor((totalBonusAttackSpeed + 1e-6) * 100));
  const prelimConvertedExtraAttack = getNumber(asRule?.convertPer1PctBonusAsToExtraAttackRatio) > 0
    ? (baseAttackPower + prelimExtraAttack) * (bonusAsSteps1Pct * getNumber(asRule.convertPer1PctBonusAsToExtraAttackRatio))
    : 0;
  const stackCd = effectMods.cd + (effectMods.cdFromExtraAttackPct ? damageFloor((prelimExtraAttack + prelimConvertedExtraAttack) * effectMods.cdFromExtraAttackPct) : 0);
  const rawCd = (statValue(equipmentStats, 'cooldownReduction') || selected.reduce((sum, item) => sum + getNumber(item.cd), 0)) + stackCd + getNumber(traitBonuses.cd);
  // 属性转换：席琳 / 蒂娅「不受冷却缩减影响，每 1 冷却缩减转换 1 技能增幅」；希瑟拉「随已失体力增加法强」。
  const statConversion = statConversionFor(selectedHero);
  const convertsCdToAp = statConversion?.from === 'cd' && statConversion?.to === 'ap';
  const cdConvertedAp = convertsCdToAp ? rawCd * (getNumber(statConversion.ratio) || 1) : 0;
  let passiveConvertedAp = 0;
  if (passiveStatRule?.selfLostHpToAp) {
    const { minByLevel = [0], maxByLevel = [0], startLostRatio = 0.1, fullLostRatio = 0.9 } = passiveStatRule.selfLostHpToAp;
    const idx = Math.max(0, Math.min(minByLevel.length - 1, passiveLevel - 1));
    const minAp = getNumber(minByLevel[idx]);
    const maxAp = getNumber(maxByLevel[idx]);
    const lostRatio = Math.max(0, Math.min(1, 1 - selfHpRatio));
    const t = fullLostRatio > startLostRatio
      ? Math.max(0, Math.min(1, (lostRatio - startLostRatio) / (fullLostRatio - startLostRatio)))
      : 0;
    passiveConvertedAp = round(minAp + (maxAp - minAp) * t, 1);
  }
  const convertedAp = cdConvertedAp + asConvertedAp + passiveConvertedAp;
  const cd = convertsCdToAp ? 0 : rawCd;
  const overclockAp = activeTraitEffectIds.has('overclock') && cd >= 40 && !usesAttackPath ? 10 : 0;
  const overclockAttackPower = activeTraitEffectIds.has('overclock') && cd >= 40 && usesAttackPath ? 5 : 0;
  // 12.0：超再生不再给予被护盾/治疗目标适应力，因此不再计入攻击力或技能增幅
  const talentBonusAp = getNumber(traitBonuses.ap) + concentrationAp + huntBearAp + rapidShotAp + rChargerAp + overclockAp + celestial.ap;
  const talentBonusAttackPower = baseTalentAttackPower + overclockAttackPower;
  const pen = statValue(equipmentStats, 'penetrationDefense') + statValue(equipmentStats, 'uniquePenetrationDefense') + talentPen || selected.reduce((sum, item) => sum + getNumber(item.pen), 0) + talentPen;
  const basePenPct = statValue(equipmentStats, 'penetrationDefenseRatio') + statValue(equipmentStats, 'uniquePenetrationDefenseRatio') + talentPenPct || selected.reduce((sum, item) => sum + getNumber(item.penPct), 0) + talentPenPct;
  const penPct = basePenPct + celestial.penPct;
  const dynamicTraitDefense = activeTraitEffectIds.has('diamondShard') ? 20 + mastery * 5 : 0;
  const talentBonusDefense = getNumber(traitBonuses.defense) + dynamicTraitDefense + celestial.defense;
  const equipDefense = (statValue(equipmentStats, 'defense') || selected.reduce((sum, item) => sum + getNumber(item.defense), 0)) + talentBonusDefense;
  const extraHp = statValue(equipmentStats, 'maxHp') + getNumber(traitBonuses.maxHp) + celestial.maxHp;
  const normalApPct = statValue(equipmentStats, 'skillAmpRatio');
  const uniqueApPct = Math.max(statValue(equipmentStats, 'uniqueSkillAmpRatio'), ...selected.filter((item) => item.uniqueApPct).map((item) => getNumber(item.apPct)));
  const equipDamageBonus = selected.reduce((sum, item) => (
    sum + (hasConditionalDamageAmp(item) && !effectToggles['光辉'] ? 0 : getNumber(item.dmgAmp))
  ), 0);
  const cdCap = 40 + statValue(equipmentStats, 'cooldownLimit') + statValue(equipmentStats, 'uniqueCooldownLimit');
  const preConversionExtraAttack = equipAttackPower + talentBonusAttackPower + stackAttackPower;
  // 翡翠 P 剑之记忆：每 1% 额外攻速将当前攻击力的 0.15% 额外转化为额外攻击力
  const convertedExtraAttackPower = getNumber(asRule?.convertPer1PctBonusAsToExtraAttackRatio) > 0
    ? (baseAttackPower + preConversionExtraAttack) * (bonusAsSteps1Pct * getNumber(asRule.convertPer1PctBonusAsToExtraAttackRatio))
    : 0;
  const extraAttackPower = preConversionExtraAttack + convertedExtraAttackPower;
  // 玛蒂娜 P 播放：每 1% 额外攻速使攻击力 +0.2%（超过 2.5 攻速上限部分不计）
  const effectiveBonusAsForAttackPct = asRule?.respectAttackSpeedCap && baseAttackSpeed > 0
    ? Math.min(totalBonusAttackSpeed, Math.max(0, (attackSpeedCap - baseAttackSpeed) / baseAttackSpeed))
    : totalBonusAttackSpeed;
  const convertedAttackPowerPct = getNumber(asRule?.convertPer1PctBonusAsToAttackPct) > 0
    ? Math.max(0, Math.floor((effectiveBonusAsForAttackPct + 1e-6) * 100)) * getNumber(asRule.convertPer1PctBonusAsToAttackPct)
    : 0;
  // 攻击力百分比加成（神速、双重假面、玛蒂娜 P）作用在总攻击力上
  const totalAttackPowerPct = getNumber(effectMods.attackPowerPct) + convertedAttackPowerPct;
  const attackPower = (baseAttackPower + extraAttackPower) * (1 + totalAttackPowerPct);
  const totalApPct = normalApPct + uniqueApPct + masteryApPct + effectMods.apPct + heroModifiers.apPct + buffs.apPct;
  const totalBaseAp = equipAp + talentAp + talentBonusAp + stackAp + convertedAp + buffs.ap;
  const apRaw = totalBaseAp * (1 + totalApPct);
  const ap = damageFloor(apRaw);
  // 武器技能（D 键）：武器熟练度 Lv.5 / 10 / 15 自动升为 1 / 2 / 3 级，也允许手动指定预览等级
  const wsDef = resolvedWeaponRaw ? (WEAPON_SKILLS_DATA.weaponSkills?.[resolvedWeaponRaw] || null) : null;
  const wsAutoLevel = mastery >= 15 ? 3 : mastery >= 10 ? 2 : 1;
  const wsUnlocked = mastery >= 5;
  const effectiveWsLevel = weaponSkillLevel > 0 ? Math.max(1, Math.min(3, getNumber(weaponSkillLevel))) : wsAutoLevel;
  const hammerWeaponShred = resolvedWeaponRaw === 'Hammer' && hammerShredActive && Array.isArray(wsDef?.targetDefenseShredByLevel)
    ? getNumber(wsDef.targetDefenseShredByLevel[Math.max(0, Math.min(2, effectiveWsLevel - 1))])
    : 0;

  // 莉央 P 集中：按暴击率无视敌人防御力
  const equipCritChance = Math.max(0, Math.min(1, statValue(equipmentStats, 'criticalStrikeChance')));
  let passiveTargetDefenseShred = 0;
  if (passiveStatRule?.critToTargetDefensePct) {
    const { baseByLevel = [0], per1PctCrit = 0 } = passiveStatRule.critToTargetDefensePct;
    const baseShred = getNumber(baseByLevel[Math.max(0, Math.min(baseByLevel.length - 1, passiveLevel - 1))]);
    passiveTargetDefenseShred = Math.min(0.9, baseShred + (equipCritChance * 100) * getNumber(per1PctCrit));
  }

  // 粉碎 / 邪恶之雾 / 莉央P / 锤子D 等减防与目标自身减防叠乘；雷鸣裁决的穿透加进固定穿透
  const finalDefense = target.defense
    * (1 - target.defenseReduction)
    * (1 - effectMods.targetDefensePct)
    * (1 - passiveTargetDefenseShred)
    * (1 - hammerWeaponShred)
    * (1 - penPct - effectMods.penPct) - pen - effectMods.pen;
  const defenseMod = 100 / (100 + finalDefense);
  const enhancementDeviceDamageBonus = activeTraitEffectIds.has('enhancementDevice') ? 0.08 + mastery * 0.005 : 0;
  const falseVowBonus = tacticalSkill === '虚言' ? (tacticalUpgraded ? 0.12 : 0.08) : 0;
  const potentialDamageBonus = talentDamageBonus + enhancementDeviceDamageBonus + falseVowBonus;
  const baseDamageBonus = damageBonus + equipDamageBonus + potentialDamageBonus + effectMods.damageBonus + heroModifiers.damageBonus + buffs.damageBonus;
  const totalDamageBonus = baseDamageBonus + getNumber(buffs.skillDamageBonus);
  const targetMasteryLevel = Math.max(1, Math.min(20, getNumber(targetMastery) || 1));
  const targetMasterySkillReduction = targetMasteryLevel <= 1 ? 0 : targetMasteryLevel * 0.008;
  // 目标武器熟练度带来的普攻减伤：每级 1%，1 级 1% ~ 20 级 20% 线性增长
  const targetMasteryBasicReduction = targetMasteryLevel * 0.01;
  const totalSkillReduction = skillReduction + targetMasterySkillReduction;
  const damageMod = 1 + totalDamageBonus - target.reduction - totalSkillReduction;
  const noSkillBuffDamageMod = 1 + baseDamageBonus - target.reduction - totalSkillReduction;
  const finalMod = defenseMod * damageMod;
  const noSkillBuffFinalMod = defenseMod * noSkillBuffDamageMod;
  const stackCount = Math.min(stackLimitForHero(selectedHero, selectedHeroSkillRows), Math.max(0, r2Stacks));
  // 普攻增幅（IncreaseBasicAttackDamageRatio）：官方独立的一档乘区，只作用于普攻伤害，
  // 跟技能增幅互不影响。装备的「每级别普攻增幅」已由 aggregateEquipmentStats 乘好等级
  // 折进同一个键，这里不要再乘一次。
  const basicAttackAmp = statValue(equipmentStats, 'increaseBasicAttackDamageRatio')
    + masteryBasicAttackDamageRatio
    + effectMods.basicAttackBonus
    + buffs.basicAttackAmp;
  // 普攻额外伤害（IncreaseBasicAttackDamage）：防御结算之后才加的固定值，同样已折好等级
  const basicAttackFlatBonus = statValue(equipmentStats, 'increaseBasicAttackDamage');
  const basicAttackDamageIncreaseRatio = baseDamageBonus + basicAttackAmp;
  const basicAttackTargetReductionRatio = target.reduction + targetMasteryBasicReduction;
  const effectiveTargetForBa = {
    ...target,
    defense: target.defense
      * (1 - effectMods.targetDefensePct)
      * (1 - passiveTargetDefenseShred)
      * (1 - hammerWeaponShred)
  };
  const equipCritDamage = statValue(equipmentStats, 'criticalStrikeDamage');
  const effectiveBasicCritChance = passiveStatRule?.noCritBasicAttack ? 0 : equipCritChance;
  const basicAttackDamage = calculateBasicAttackDamage({
    attackPower,
    target: effectiveTargetForBa,
    armorPenetration: pen + effectMods.pen,
    armorPenetrationRatio: penPct + effectMods.penPct,
    flatBonus: basicAttackFlatBonus,
    damageIncreaseRatio: basicAttackDamageIncreaseRatio,
    targetDamageReductionRatio: basicAttackTargetReductionRatio,
    criticalStrikeChance: effectiveBasicCritChance,
    criticalStrikeDamage: equipCritDamage,
    critScaledBasicAttack: passiveStatRule?.critScaledBasicAttack || null
  });
  const selfDefense = getNumber(baseDefense) + equipDefense;
  // 血量上限 = 实验体等级成长血量 + 装备/潜能的额外体力。开启自动跟随时直接作为 maxHp 参与技能与爆发力计算；
  // 关闭自动跟随时保留用户手填的假设血量。
  const characterMaxHp = getNumber(baseMaxHp) + extraHp;
  const effectiveSelfHp = autoSyncSelfHp
    ? Math.max(1, Math.round(characterMaxHp))
    : Math.max(1, getNumber(selfHp));
  const context = {
    ap,
    attack: attackPower,
    baseAttack: baseAttackPower,
    extraAttack: extraAttackPower,
    targetHp: target.hp,
    targetCurrentHp: target.hp * targetHpRatio,
    targetLostHp: target.hp * (1 - targetHpRatio),
    maxHp: effectiveSelfHp,
    selfCurrentHp: effectiveSelfHp * selfHpRatio,
    selfLostHp: effectiveSelfHp * (1 - selfHpRatio),
    extraHp,
    defense: selfDefense,
    shield: getNumber(selfShield),
    critChance: equipCritChance,
    critDamage: equipCritDamage,
    pen: pen + effectMods.pen,
    attackSpeed: finalAttackSpeed,
    bonusAttackSpeed: totalBonusAttackSpeed,
    basicAttackAmp,
    accumulatedDamage: getNumber(accumulatedDamage),
    stacks: stackCount,
    passiveLevel,
    heroLevel: mastery,
    finalMod,
    noSkillBuffFinalMod,
    // 被官方判定为普攻伤害的技能段（damageType: "basicAttack"）走这条：
    // 增伤那一档换成普攻增幅，减伤那一档换成目标的普攻减伤，防御修正两边一样
    basicAttackFinalMod: defenseMod * (1 + basicAttackDamageIncreaseRatio - basicAttackTargetReductionRatio)
  };
  const heroSkills = selectedHeroSkillRows
    .map((skill) => {
      const overrideFormula = resolvedWeaponRaw && skill.weaponFormulas?.[resolvedWeaponRaw];
      const overrideCoef = resolvedWeaponRaw && skill.weaponCoefficientText?.[resolvedWeaponRaw];
      const resolvedSkill = overrideFormula
        ? { ...skill, formula: overrideFormula, coefficientText: overrideCoef || skill.coefficientText }
        : skill;
      return calculateSkill(resolvedSkill, skillLevels[skill.id], context);
    })
    // 恢复/护盾类技能可以被「给予恢复和护盾效果 +X%」这类增益放大（夏洛特 P 圣洁之心）
    .map((skill) => (
      (skill.kind === 'heal' || skill.kind === 'shield') && buffs.healShieldAmp
        ? { ...skill, rawDamage: damageFloor(skill.rawDamage * (1 + buffs.healShieldAmp)), healShieldAmp: buffs.healShieldAmp }
        : skill
    ));
  // 恢复与护盾单独汇总，供技能面板下方的「预计恢复 / 护盾」一栏使用
  const supportSkills = heroSkills.filter((skill) => skill.kind === 'heal' || skill.kind === 'shield');
  const healTotal = supportSkills.filter((skill) => skill.kind === 'heal')
    .reduce((sum, skill) => sum + getNumber(skill.rawDamage), 0);
  const shieldTotal = supportSkills.filter((skill) => skill.kind === 'shield')
    .reduce((sum, skill) => sum + getNumber(skill.rawDamage), 0);
  // 强化普攻类技能：给下一次普攻加一段额外伤害，单独归到「强化普攻」栏
  const basicAttackSkills = heroSkills.filter((skill) => skill.kind === 'basicAttack');
  const basicAttackBonusRaw = basicAttackSkills.reduce((sum, skill) => sum + getNumber(skill.rawDamage), 0);
  const basicAttackBonus = basicAttackSkills.reduce((sum, skill) => sum + getNumber(skill.damage), 0);
  const hpDiffRatio = Math.min(0.4, Math.max(0.1, (target.hp - effectiveSelfHp) / effectiveSelfHp));
  const burstBonus = Math.min(0.1, Math.max(0, (target.hp - effectiveSelfHp) / effectiveSelfHp) * 0.25);
  const curse = 50 + ap * 0.15;
  const scarBase = 10 + mastery + target.hp * 0.03;
  const tearBase = 10 + mastery * 2 + target.hp * 0.08;
  const thunderFormula = adaptiveOffenseFormula({ base: 30 + mastery * 2, extraAttack: extraAttackPower, attackRatio: 0.45, ap, apRatio: 0.26 });
  const vortexFormula = adaptiveOffenseFormula({ base: mastery * 5, extraAttack: extraAttackPower, attackRatio: 0.8, ap, apRatio: 0.4 });
  // 12.0：爆炸仙人掌 10~150(+体力上限5%) -> 8~160(+体力上限4%)，并转为核心潜能
  // 12.2：体力上限系数 4% -> 5%（基础的 8~160 没动）
  const cactusBase = 8 + Math.max(0, mastery - 1) * (152 / 19) + target.hp * 0.05;
  const diamondShardBase = mastery * 10;
  const penanceBase = mastery * 15;
  const effects = [
    activeTraitEffectIds.has('absoluteForce')
      ? { title: '绝对武力(真伤)', raw: damageFloor(20 + mastery * 5), value: damageFloor(20 + mastery * 5), note: '20+实验体等级*5；防御降低 15% 需手动在目标栏设置。' }
      : null,
    activeTraitEffectIds.has('stardust')
      ? { title: '星尘蓄势(真伤)', raw: damageFloor(30 + mastery * 3), value: damageFloor(30 + mastery * 3), note: '13.2加强：对实验体/召唤物造成 30+等级*3（33~90）真实伤害。' }
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
      ? { title: '爆炸仙人掌(技)', raw: damageFloor(cactusBase), value: damageFloor(damageFloor(cactusBase) * finalMod), note: '队友普攻/独立技能触发：8~160+敌人体力上限5%；未触发自动爆炸为减少70%的伤害。' }
      : null
  ].filter(Boolean);
  const ghostFire = adaptiveOffenseFormula({ base: 70 + mastery * 10, extraAttack: extraAttackPower, attackRatio: 0.7, ap, apRatio: 0.2 });
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
  // 数据驱动潜能通用伤害段（加速度及 S13 新增伤害型潜能）
  for (const de of traitBonuses.damageEffects || []) {
    if (de.adaptiveRoute) {
      const baseVal = evaluateFormula(de.adaptiveRoute.baseFormula || '0', { ...context, base: 0, level: 1 });
      const route = adaptiveOffenseFormula({
        base: baseVal,
        extraAttack: extraAttackPower,
        attackRatio: getNumber(de.adaptiveRoute.attackRatio),
        ap,
        apRatio: getNumber(de.adaptiveRoute.apRatio)
      });
      const raw = damageFloor(route.value);
      effects.push({
        title: de.title,
        raw,
        value: de.damageType === 'true' ? raw : damageFloor(raw * finalMod),
        note: `${de.note || ''}（当前按${route.route}计算）`
      });
    } else if (de.formula) {
      const raw = damageFloor(evaluateFormula(de.formula, { ...context, base: 0, level: 1 }));
      effects.push({
        title: de.title,
        raw,
        value: de.damageType === 'true' ? raw : damageFloor(raw * finalMod),
        note: de.note || ''
      });
    }
  }
  // 装备独有效果伤害（诅咒 / 腐化 / 破裂…）：只算当前真的装上的
  effects.push(...equipmentEffectDamages(selected, context, effectToggles, { realisticEffectHits }));
  const damageEffects = effects.filter((effect) => !effect.excludeFromSubtotal);
  const effectSubtotalRaw = damageEffects.reduce((sum, effect) => sum + effect.raw, 0);
  const effectSubtotal = damageEffects.reduce((sum, effect) => sum + effect.value, 0);
  const comboSkills = heroSkills;
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
  const weaponSkill = wsDef ? {
    ...wsDef,
    weaponRaw: resolvedWeaponRaw,
    level: effectiveWsLevel,
    autoLevel: wsAutoLevel,
    unlocked: wsUnlocked,
    segments: (wsDef.segments || []).map((seg) => calculateSkill(seg, effectiveWsLevel, context))
  } : null;
  const extraHeroGroups = [];

  return {
    selected,
    weaponSkill,
    passiveConvertedAp,
    passiveTargetDefenseShred,
    hammerWeaponShred,
    equipmentStats,
    equipAp,
    equipAttackPower,
    masteryAttackPower,
    masteryBasicAttackDamageRatio,
    baseAttackPower,
    extraAttackPower,
    attackPower,
    talentAp,
    celestial,
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
    cdCap,
    baseAttackSpeed,
    weaponBaseAttackSpeed,
    uncappedAttackSpeed,
    finalAttackSpeed,
    attackSpeedCap,
    attackSpeedFixed,
    totalBonusAttackSpeed,
    equipAttackSpeedRatio,
    masteryAttackSpeedRatio,
    traitAttackSpeedRatio,
    effectAttackSpeedRatio,
    asConvertedAp,
    cdConvertedAp,
    convertedExtraAttackPower,
    convertedAttackPowerPct,
    totalAttackPowerPct,
    asRule,
    critChance: statValue(equipmentStats, 'criticalStrikeChance'),
    critDamage: statValue(equipmentStats, 'criticalStrikeDamage'),
    basicAttackTargetReductionRatio,
    pen,
    penPct,
    equipDefense,
    selfDefense,
    effectMods,
    supportSkills,
    healTotal,
    shieldTotal,
    healShieldAmp: buffs.healShieldAmp,
    basicAttackSkills,
    basicAttackBonusRaw,
    basicAttackBonus,
    basicAttackAmp,
    basicAttackFlatBonus,
    heroModifiers,
    buffs,
    convertedAp,
    rawCd,
    // 公式上下文整体带出来，递增伤害等二次计算直接复用，不用逐个字段同步
    formulaContext: context,
    extraHp,
    baseMaxHp: getNumber(baseMaxHp),
    characterMaxHp,
    effectiveSelfHp,
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
              <span className="helpNoteText">{note}</span>
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

function GearOptimizerDialog({
  open,
  onClose,
  heroName,
  mastery,
  uiTheme,
  slots,
  gear,
  equipment,
  mode,
  onChangeMode,
  activeSlot,
  onChangeSlot,
  metricKey,
  metricOptions,
  onChangeMetric,
  tierScope,
  onChangeTierScope,
  includeProc,
  onToggleIncludeProc,
  autoMaxStacks,
  onToggleAutoMaxStacks,
  enableZoneEffects,
  onToggleEnableZoneEffects,
  realisticEffectHits,
  onToggleRealisticEffectHits,
  keepMinCd,
  onToggleKeepMinCd,
  allowCrossWeapon,
  onToggleAllowCrossWeapon,
  canCrossWeapon,
  optimizerData,
  onEquipCandidate,
  qualityColor,
  uniqueEffectsForItem,
  PortalHovercard,
  renderHoverContent
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !optimizerData) return null;

  const {
    baselineScore,
    baselineDirect,
    baselineProc,
    hasScoreSplit,
    baselineCd,
    metricMeta,
    slotBestList,
    rankedRows,
    currentSlotRow
  } = optimizerData;

  const fmtVal = (v) => (metricMeta?.digits > 0 ? round(v, metricMeta.digits) : Math.round(v));
  const fmtSigned = (v) => {
    const n = metricMeta?.digits > 0 ? round(v, metricMeta.digits) : Math.round(v);
    return n > 0 ? `+${n}` : `${n}`;
  };
  const findItem = (name) => (name ? equipment.find((x) => x.name === name) : null);
  const supportsProcToggle = !metricKey.startsWith('stat:') && metricKey !== 'ba_dps' && metricKey !== 'ba_hit';

  return createPortal(
    <div className="vgModalBackdrop goModalBackdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="vgModalDialog goModalDialog"
        role="dialog"
        aria-modal="true"
        aria-label="一键换装收益排行"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="vgModalHeader goModalHeader">
          <div className="goTitleBlock">
            <div className="goModeSwitch" role="tablist" aria-label="换装排行模式">
              <button
                type="button"
                className={`goModeBtn ${mode === 'upgrade' ? 'active' : ''}`}
                onClick={() => onChangeMode('upgrade')}
              >
                🔥 全身金/红升级优先级
              </button>
              <button
                type="button"
                className={`goModeBtn ${mode === 'slot' ? 'active' : ''}`}
                onClick={() => onChangeMode('slot')}
              >
                🎯 单部位散件排行
              </button>
            </div>
            <small className="goSubtitle">
              {heroName} · 熟练度 Lv.{mastery} · 当前基准 <strong>{metricMeta?.shortLabel || metricMeta?.label}</strong>：
              <b>{fmtVal(baselineScore)}</b>
              {hasScoreSplit ? (
                <span className="goBaseSplitHint">（直伤 {fmtVal(baselineDirect)} + 特效 {fmtVal(baselineProc)} · CD {baselineCd}%）</span>
              ) : (
                <span>（当前 CD {baselineCd}%）</span>
              )}
            </small>
          </div>
          <div className="vgModalHeaderActions">
            <button type="button" className="quietButton vgCloseBtn" onClick={onClose}>
              关闭 Esc
            </button>
          </div>
        </div>

        {mode === 'slot' ? (
          <div className="goSlotTabsBar">
            {slots.map((s) => {
              const cur = findItem(gear[s]);
              return (
                <button
                  type="button"
                  key={s}
                  className={`vgModalSlotTab ${activeSlot === s ? 'active' : ''}`}
                  onClick={() => onChangeSlot(s)}
                >
                  <EquipmentSlotIcon item={cur} slot={s} size={26} />
                  <div className="vgModalSlotTabText">
                    <span>{s}</span>
                    <small>{cur ? cur.name : '（空）'}</small>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="vgFilterSection goControlSection">
          <div className="goControlTopRow">
            <label className="goMetricSelectWrap">
              <span>排序指标</span>
              <select value={metricKey} onChange={(e) => onChangeMetric(e.target.value)}>
                {metricOptions.map((opt) => (
                  <option value={opt.key} key={opt.key}>{opt.label}</option>
                ))}
              </select>
            </label>

            <div className="goTierPillGroup" aria-label="候选品级范围">
              {[
                { key: 'all_high', label: '金+红 (传说/超凡)', cls: 'tierPill-all' },
                { key: 'mythic', label: '仅超凡 (红装)', cls: 'tierPill-mythic' },
                { key: 'legend', label: '仅传说 (金装)', cls: 'tierPill-legend' },
                { key: 'with_epic', label: '含英雄 (紫装)', cls: 'tierPill-epic' }
              ].map((t) => (
                <button
                  type="button"
                  key={t.key}
                  className={`vgFilterPill ${t.cls} ${tierScope === t.key ? 'active' : ''}`}
                  onClick={() => onChangeTierScope(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="goToggleRow">
            {supportsProcToggle ? (
              <label className="vgChainToggle" title="将装备/潜能独有触发伤害（如诅咒、破裂、意念、腐化等）按触发 1 次计入总伤；下方每行会拆解「直伤 ± / 特效 ±」">
                <input type="checkbox" checked={includeProc} onChange={(e) => onToggleIncludeProc(e.target.checked)} />
                <span>计入装备触发伤害(1次)</span>
              </label>
            ) : null}
            <label className="vgChainToggle" title="仅同步开启常规战斗叠层/充能特效（如炽燃、全速运转、超负荷、神速、光辉、觉醒、意念等），不会强行开启地面风圈、硬控限定、队友触发或反伤类特效">
              <input type="checkbox" checked={autoMaxStacks} onChange={(e) => onToggleAutoMaxStacks(e.target.checked)} />
              <span>满层激活常规叠层</span>
            </label>
            {supportsProcToggle ? (
              <label className="vgChainToggle" title="手动开启后，在排行中一并激活幽冥战甲（疾风）、幽灵夹克（疾风-集结）、幽灵新娘的嫁纱（邪恶之雾）、异端审判官（次元裂痕）等地面持续区域特效参与对比">
                <input type="checkbox" checked={enableZoneEffects} onChange={(e) => onToggleEnableZoneEffects(e.target.checked)} />
                <span>激活地面区域特效</span>
              </label>
            ) : null}
            {supportsProcToggle ? (
              <label className="vgChainToggle" title="方案1折算开关：开启时地面持续区域特效按实战常见驻留跳数折算（如疾风 2/10 跳、邪恶之雾 2/6 跳、次元裂痕 2/5 跳）；取消勾选则按木桩站满全程跳数计算">
                <input type="checkbox" checked={realisticEffectHits} onChange={(e) => onToggleRealisticEffectHits(e.target.checked)} />
                <span>持续特效实战折算跳数</span>
              </label>
            ) : null}
            <label className="vgChainToggle" title={`过滤掉会导致冷却缩减低于当前（${baselineCd}%）的换装方案`}>
              <input type="checkbox" checked={keepMinCd} onChange={(e) => onToggleKeepMinCd(e.target.checked)} />
              <span>不降冷却缩减 (≥{baselineCd}%)</span>
            </label>
            {canCrossWeapon && (mode === 'upgrade' || activeSlot === '武器') ? (
              <label className="vgChainToggle" title="允许武器槽跨武器组对比该实验体可用的其它武器类型（自动同步熟练度加成与 D 技能）">
                <input type="checkbox" checked={allowCrossWeapon} onChange={(e) => onToggleAllowCrossWeapon(e.target.checked)} />
                <span>允许跨武器组对比</span>
              </label>
            ) : null}
          </div>
        </div>

        <div className="goScrollBody">
          {mode === 'upgrade' ? (
            <div className="goBestPerSlotSection">
              <div className="goSectionSubhead">
                <strong>各部位头号升级推荐（保持其余 4 件不变）</strong>
                <span>优先把陨石 / 秘银 / 生命树枝 / 能量核心 / 血包投给提升最大的部位</span>
              </div>
              <div className="goBestSlotGrid">
                {slotBestList.map((entry) => {
                  const best = entry.best;
                  const curItem = findItem(gear[entry.slot]);
                  const bestColor = best?.item ? qualityColor(best.item.quality, uiTheme) : undefined;
                  return (
                    <div className={`goBestSlotCard ${best && best.delta > 0 ? 'hasGain' : 'isMaxed'}`} key={entry.slot}>
                      <div className="goBestSlotHeader">
                        <span className="vgSlotTag">{entry.slot}</span>
                        <button
                          type="button"
                          className="goJumpSlotLink"
                          onClick={() => { onChangeMode('slot'); onChangeSlot(entry.slot); }}
                        >
                          看全榜 ›
                        </button>
                      </div>
                      {best && best.delta > 0 ? (
                        <>
                          <div className="goBestSlotMain">
                            <EquipmentSlotIcon item={best.item} slot={entry.slot} size={38} />
                            <div className="goBestSlotInfo">
                              <strong style={bestColor ? { color: bestColor } : undefined}>{best.item.name}</strong>
                              <small>替换：{curItem ? curItem.name : '空栏'}</small>
                              {hasScoreSplit ? (
                                <small className="goBestSlotSplit">
                                  直伤 <b className={best.directDelta > 0 ? 'pos' : best.directDelta < 0 ? 'neg' : ''}>{fmtSigned(best.directDelta)}</b>
                                  {' · '}
                                  特效 <b className={best.procDelta > 0 ? 'procPos' : best.procDelta < 0 ? 'neg' : ''}>{fmtSigned(best.procDelta)}</b>
                                </small>
                              ) : null}
                            </div>
                          </div>
                          <div className="goBestSlotFooter">
                            <span className="goDeltaPositive">
                              {fmtSigned(best.delta)} ({best.pctDelta >= 0 ? '+' : ''}{round(best.pctDelta, 1)}%)
                            </span>
                            <button
                              type="button"
                              className="goEquipBtn"
                              onClick={() => onEquipCandidate(entry.slot, best.item)}
                            >
                              换上
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="goBestSlotOptimal">
                          <EquipmentSlotIcon item={curItem} slot={entry.slot} size={34} />
                          <div>
                            <strong>{curItem ? curItem.name : '暂无更优'}</strong>
                            <small className="goOptimalTag">✓ 当前筛选下已是最优</small>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            currentSlotRow ? (
              <div className="goCurrentEquippedBanner">
                <span>当前穿戴【{activeSlot}】：</span>
                <strong style={{ color: qualityColor(currentSlotRow.item?.quality, uiTheme) }}>
                  {currentSlotRow.item ? currentSlotRow.item.name : '（空栏）'}
                </strong>
                <span>· 当前指标 <b>{fmtVal(currentSlotRow.score)}</b></span>
                {currentSlotRow.rank ? <span className="goCurrentRankPill">本榜第 {currentSlotRow.rank} 名</span> : null}
              </div>
            ) : null
          )}

          <div className="goRankListSection">
            <div className="goSectionSubhead">
              <strong>
                {mode === 'upgrade'
                  ? `跨部位单件换装总榜（前 ${rankedRows.length} 项正向/平替方案）`
                  : `【${activeSlot}】全部候选排行（共 ${rankedRows.length} 件）`}
              </strong>
              <span>点击「换上」立即穿戴并实时重算其余部位收益</span>
            </div>

            {rankedRows.length ? (
              <div className="goRankList">
                {rankedRows.map((row, idx) => {
                  const tier = QUALITY_TIER_KEY[row.item.quality] || 'common';
                  const color = qualityColor(row.item.quality, uiTheme);
                  const statsArr = summarizeItemStats(row.item, mastery);
                  const effs = uniqueEffectsForItem(row.item);
                  const cdDiff = row.cd - baselineCd;
                  const rowBody = (
                    <div
                      className={`goRankRow tier-${tier} ${row.isCurrent ? 'isCurrent' : ''} ${idx === 0 && row.delta > 0 ? 'isTop1' : ''}`.trim()}
                      key={`${row.slot}-${row.item.code || row.item.name}`}
                    >
                      <span className={`goRankIndex ${idx < 3 ? `top-${idx + 1}` : ''}`}>#{idx + 1}</span>
                      <EquipmentSlotIcon item={row.item} slot={row.slot} size={42} />
                      <div className="goRankInfo">
                        <div className="goRankTitleLine">
                          {mode === 'upgrade' ? <span className="goSlotPill">{row.slot}</span> : null}
                          <strong style={color ? { color } : undefined}>{row.item.name}</strong>
                          <span className={`vgRarityTag tier-${tier}`}>{QUALITY_SHORT_LABELS[tier] || row.item.quality}</span>
                          {row.slot === '武器' && row.item.weaponType ? (
                            <span className="goWeaponSubTag">{row.item.weaponType.split('/')[0].trim()}</span>
                          ) : null}
                          {row.isCurrent ? <span className="goCurrentBadge">当前穿戴</span> : null}
                        </div>
                        <div className="goRankSubLine">
                          <span>{statsArr.length ? statsArr.join(' · ') : '基础装备'}</span>
                          {effs.map((ef) => <span className="vgEffectBadge" key={ef}>{ef}</span>)}
                        </div>
                      </div>

                      <div className="goRankStatsCol">
                        <div className="goScoreMain">
                          <span className="goScoreVal">{fmtVal(row.score)}</span>
                          {row.isCurrent ? (
                            <span className="goDeltaNeutral">基准 ±0</span>
                          ) : (
                            <span className={row.delta > 0 ? 'goDeltaPositive' : row.delta < 0 ? 'goDeltaNegative' : 'goDeltaNeutral'}>
                              {fmtSigned(row.delta)} ({row.pctDelta >= 0 ? '+' : ''}{round(row.pctDelta, 1)}%)
                            </span>
                          )}
                        </div>
                        {hasScoreSplit ? (
                          <div className="goSourceSplitLine" title="拆解该方案与当前基准相比：技能/普攻直伤变化 vs 装备/潜能触发特效伤害变化">
                            {row.isCurrent ? (
                              <span className="goSplitChip zero">直伤 {fmtVal(row.directScore)} + 特效 {fmtVal(row.procScore)}</span>
                            ) : (
                              <>
                                <span className={`goSplitChip ${Math.round(row.directDelta) > 0 ? 'pos' : Math.round(row.directDelta) < 0 ? 'neg' : 'zero'}`}>
                                  直伤 {fmtSigned(row.directDelta)}
                                </span>
                                <span className={`goSplitChip ${Math.round(row.procDelta) > 0 ? 'procPos' : Math.round(row.procDelta) < 0 ? 'neg' : 'zero'}`}>
                                  特效 {fmtSigned(row.procDelta)}
                                </span>
                              </>
                            )}
                          </div>
                        ) : null}
                        <div className="goAuxDiffLine">
                          <small>法强 {row.ap} / 攻击 {round(row.attackPower, 0)}</small>
                          {cdDiff !== 0 ? (
                            <small className={cdDiff > 0 ? 'goCdUp' : 'goCdDown'}>
                              CD {cdDiff > 0 ? `+${cdDiff}` : cdDiff}%
                            </small>
                          ) : <small>CD {row.cd}%</small>}
                        </div>
                      </div>

                      <div className="goRankActionCol">
                        {row.isCurrent ? (
                          <span className="goEquippedLabel">已装备</span>
                        ) : (
                          <button
                            type="button"
                            className="goEquipBtn"
                            onClick={() => onEquipCandidate(row.slot, row.item)}
                          >
                            换上
                          </button>
                        )}
                      </div>
                    </div>
                  );

                  if (PortalHovercard && renderHoverContent) {
                    return (
                      <PortalHovercard
                        key={`${row.slot}-${row.item.code || row.item.name}`}
                        className="goRankHoverWrap"
                        content={renderHoverContent(row.item)}
                      >
                        {rowBody}
                      </PortalHovercard>
                    );
                  }
                  return rowBody;
                })}
              </div>
            ) : (
              <div className="vgEmptyState">
                当前筛选条件下暂无符合要求的装备（若开启了「不降冷却缩减」或「仅超凡」，可尝试放宽条件）。
              </div>
            )}
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}

function renderTextWithLinks(text) {
  const parts = String(text || '').split(/(https?:\/\/[^\s)）]+)/g);
  return parts.map((part, idx) => (
    /^https?:\/\//.test(part) ? (
      <a key={`lnk-${idx}`} href={part} target="_blank" rel="noreferrer" className="noticeInlineLink">
        {part}
      </a>
    ) : (
      <React.Fragment key={`txt-${idx}`}>{part}</React.Fragment>
    )
  ));
}

function parseAnnouncementBlocks(rawBody) {
  const lines = String(rawBody || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let changelogItems = [];
  let guideSteps = [];
  let guideTitle = '';

  const flushChangelog = () => {
    if (changelogItems.length) {
      blocks.push({ type: 'changelog', items: changelogItems });
      changelogItems = [];
    }
  };

  const flushGuide = () => {
    if (guideTitle || guideSteps.length) {
      blocks.push({ type: 'guide', title: guideTitle, steps: guideSteps });
      guideTitle = '';
      guideSteps = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushGuide();
      continue;
    }

    // 识别「【如何...】」或「🔍 ...」引导头
    const guideHeadMatch = line.match(/^(?:🔍\s*)?【([^】]*(?:如何|怎么|指引|找到|解锁)[^】]*)】(.*)$/);
    if (guideHeadMatch) {
      flushChangelog();
      flushGuide();
      guideTitle = guideHeadMatch[1].trim();
      const rest = guideHeadMatch[2].replace(/^[:：]\s*/, '').trim();
      if (rest) guideSteps.push(rest);
      continue;
    }

    if (guideTitle && /^(?:\d+[.、)）]|[①②③④⑤]|•|-)\s*/.test(line)) {
      guideSteps.push(line.replace(/^(?:\d+[.、)）]|[①②③④⑤]|•|-)\s*/, '').trim());
      continue;
    }

    // 识别普通章节标题：【版本更新记录】等
    const secMatch = line.match(/^【([^】]+)】$/);
    if (secMatch) {
      flushGuide();
      flushChangelog();
      blocks.push({ type: 'section', title: secMatch[1].trim() });
      continue;
    }

    // 识别版本更新条目：• v0.2.095：... 或 • v0.2.081 ~ v0.2.083：...
    const verMatch = line.match(/^(?:[•·\-*]\s*)?(v\d+\.\d+\.\d+(?:\s*~\s*v\d+\.\d+\.\d+)?)\s*[:：]\s*(.+)$/i);
    if (verMatch) {
      flushGuide();
      changelogItems.push({
        version: verMatch[1].trim(),
        content: verMatch[2].trim()
      });
      continue;
    }

    flushGuide();
    flushChangelog();

    // 识别反馈/提示尾注
    if (/(反馈|QQ|qq\.com|邮箱|报错)/.test(line)) {
      blocks.push({ type: 'footerNote', text: line });
    } else {
      blocks.push({ type: 'lead', text: line });
    }
  }

  flushGuide();
  flushChangelog();
  return blocks;
}

function AnnouncementDialog({
  announcement,
  editable,
  dirty,
  saveStatus,
  onChange,
  onClose,
  onSave,
  onCreate
}) {
  const [editingNotice, setEditingNotice] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const hasCurrent = Boolean(announcement.title || announcement.body);
  const parsedBlocks = useMemo(() => parseAnnouncementBlocks(announcement.body), [announcement.body]);
  const showEditor = editable && editingNotice;

  return createPortal(
    <div className="vgModalBackdrop noticeModalBackdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="vgModalDialog noticeModalDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="vgModalHeader noticeModalHeader">
          <div className="noticeTitleBlock">
            <div className="noticeTitleRow">
              <span className="noticeBadgeIcon" aria-hidden="true">📢</span>
              <h2 id="announcement-title">{showEditor ? '编辑站点公告' : (announcement.title || '更新公告')}</h2>
            </div>
            <div className="noticeMetaRow">
              {announcement.version ? <span className="noticeVerBadge">{announcement.version}</span> : null}
              {announcement.updatedAt ? <span className="noticeDateMeta">更新日期：{announcement.updatedAt}</span> : null}
            </div>
          </div>
          <div className="vgModalHeaderActions">
            {editable ? (
              <button
                type="button"
                className={`quietButton noticeEditModeBtn ${showEditor ? 'active' : ''}`}
                onClick={() => setEditingNotice((cur) => !cur)}
              >
                {showEditor ? '预览排版' : '编辑公告'}
              </button>
            ) : null}
            <button type="button" className="quietButton vgCloseBtn" onClick={onClose} aria-label="关闭公告">
              关闭 Esc
            </button>
          </div>
        </div>

        <div className="noticeScrollBody">
          {showEditor ? (
            <div className="announcementEditor">
              <div className="announcementNewRow">
                <button
                  type="button"
                  className="quietButton"
                  onClick={onCreate}
                  disabled={!hasCurrent}
                  title={hasCurrent
                    ? '把当前公告按「版本 / 日期：正文」压进历史公告最前面，然后清空标题和正文'
                    : '当前没有公告内容可归档'}
                >
                  + 归档并创建新公告
                </button>
                <small>{hasCurrent ? '当前公告会自动归档至下方历史记录' : '正文为空，可直接填写新公告'}</small>
              </div>
              <label className="field">
                <span>公告标题</span>
                <input
                  type="text"
                  value={announcement.title}
                  onChange={(event) => onChange({ title: event.target.value })}
                />
              </label>
              <label className="field">
                <span>公告内容（支持【章节标题】与 • v0.2.xxx：版本列表自动卡片排版）</span>
                <textarea
                  value={announcement.body}
                  onChange={(event) => onChange({ body: event.target.value })}
                />
              </label>
              <label className="field">
                <span>历史公告存档</span>
                <textarea
                  className="announcementHistoryInput"
                  value={announcement.history}
                  onChange={(event) => onChange({ history: event.target.value })}
                />
              </label>
              <div className="announcementActions">
                <button type="button" className="helpSaveButton" onClick={onSave} disabled={!dirty || saveStatus === 'saving'}>
                  {saveStatus === 'saving' ? '保存中…' : '保存到本地'}
                </button>
                <small>
                  {saveStatus === 'saved'
                    ? '✓ 已写入 src/data/announcement.json，下次提交会一起 push。'
                    : '保存会更新公告日期，并在发布版本的公告按钮上显示红点提醒。'}
                </small>
                {saveStatus === 'error' ? <small className="helpSaveError">保存失败，请确认正在使用本地 Vite 服务。</small> : null}
              </div>
            </div>
          ) : (
            <div className="noticeStructuredContent">
              {parsedBlocks.length ? parsedBlocks.map((block, idx) => {
                if (block.type === 'lead') {
                  return (
                    <div className="noticeLeadBanner" key={`lead-${idx}`}>
                      {renderTextWithLinks(block.text)}
                    </div>
                  );
                }
                if (block.type === 'guide') {
                  return (
                    <div className="noticeGuideCard" key={`guide-${idx}`}>
                      <div className="noticeGuideHead">
                        <span className="noticeGuideTag">操作指引</span>
                        <strong>{block.title}</strong>
                      </div>
                      {block.steps.length ? (
                        <ol className="noticeGuideList">
                          {block.steps.map((st, sIdx) => (
                            <li key={`st-${sIdx}`}>
                              <span className="noticeStepNum">{sIdx + 1}</span>
                              <span>{renderTextWithLinks(st)}</span>
                            </li>
                          ))}
                        </ol>
                      ) : null}
                    </div>
                  );
                }
                if (block.type === 'section') {
                  return (
                    <div className="noticeSectionHeader" key={`sec-${idx}`}>
                      <span>{block.title}</span>
                    </div>
                  );
                }
                if (block.type === 'changelog') {
                  return (
                    <div className="noticeChangelogList" key={`cl-${idx}`}>
                      {block.items.map((item, vIdx) => {
                        const sentences = item.content
                          .split(/[；;]\s*/)
                          .map((s) => s.trim())
                          .filter(Boolean);
                        return (
                          <div className={`noticeVersionCard ${vIdx === 0 ? 'isLatest' : ''}`.trim()} key={`ver-${item.version}-${vIdx}`}>
                            <div className="noticeVersionMeta">
                              <span className="noticeVersionPill">{item.version}</span>
                              {vIdx === 0 ? <span className="noticeLatestTag">最新</span> : null}
                            </div>
                            <div className="noticeVersionBody">
                              {sentences.length > 1 ? (
                                <ul className="noticeSubPoints">
                                  {sentences.map((pt, pIdx) => (
                                    <li key={`pt-${pIdx}`}>{renderTextWithLinks(pt)}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p>{renderTextWithLinks(item.content)}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                if (block.type === 'footerNote') {
                  return (
                    <div className="noticeFooterContact" key={`fn-${idx}`}>
                      <span>💬 {renderTextWithLinks(block.text)}</span>
                    </div>
                  );
                }
                return null;
              }) : (
                <p className="noticeEmptyText">暂无公告。</p>
              )}

              {announcement.history ? (
                <details className="noticeHistoryDetails">
                  <summary>查看早期历史公告存档</summary>
                  <div className="noticeHistoryBody">
                    {renderTextWithLinks(announcement.history)}
                  </div>
                </details>
              ) : null}
            </div>
          )}
        </div>
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

function ComparisonChart({ rows, metricKey, metricLabel, selectedMastery, onSelectMastery, collapsed, onToggleCollapsed, formatValue, wideCanvas = false }) {
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
  const width = wideCanvas ? 1220 : 760;
  const height = wideCanvas ? 250 : 255;
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

  // 折叠态只显示「指标名 + 当前选中熟练度下各方案的值」，一眼看结论不占地方
  const collapsedSummary = scenarios.map((name) => {
    const hit = values.find((row) => row.scenarioName === name && row.mastery === selectedMastery)
      || values.find((row) => row.scenarioName === name);
    return { name, value: hit ? hit.value : null };
  });
  const head = (
    <div className="comparisonChartHead">
      <button
        type="button"
        className="comparisonChartToggle"
        aria-expanded={!collapsed}
        onClick={() => onToggleCollapsed?.(metricKey)}
      >
        <span className="comparisonChartCaret">{collapsed ? '▸' : '▾'}</span>
        <strong>{metricLabel}</strong>
      </button>
      {collapsed ? (
        <span className="comparisonChartSummary">
          {collapsedSummary.map((item, index) => (
            <span key={item.name} style={{ '--legend-color': colors[index % colors.length] }}>
              {item.name} {item.value === null ? '-' : (formatValue ? formatValue(metricKey, item.value) : round(item.value, 1))}
            </span>
          ))}
          <em>熟练 {selectedMastery}</em>
        </span>
      ) : (
        <span>随熟练度变化 · Alt+滚轮缩放 · {round(zoom, 2)}x</span>
      )}
    </div>
  );

  if (collapsed) {
    return <div className="comparisonChart comparisonChartCollapsed">{head}</div>;
  }

  return (
    <div className="comparisonChart">
      {head}
      <div className={`comparisonChartViewport ${zoom > 1.01 ? 'isZoomed' : ''}`.trim()} ref={chartViewportRef}>
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

/**
 * rangeFrom 有值时按区间显示（0~154 这样）。
 *
 * 给「随某个状态在两个数之间浮动」的段用 —— 西尔维娅 E 孤轮疾驰按车速追加 0~154，
 * 官方只给了两端、没给换算曲线。写成单个数会被当成必然打出的伤害，区间才是实情。
 */
function InlineDeltaBadge({ current, baseline, digits = 0, isPercent = false }) {
  if (baseline === undefined || baseline === null || !Number.isFinite(Number(baseline))) return null;
  const diff = getNumber(current) - getNumber(baseline);
  const threshold = isPercent ? 0.0005 : (digits > 0 ? 10 ** (-digits) * 0.5 : 0.5);
  if (Math.abs(diff) <= threshold) {
    return <em className="pinDeltaBadge neutral">±0</em>;
  }
  const sign = diff > 0 ? '+' : '';
  const text = isPercent
    ? `${sign}${pct(diff)}`
    : (digits > 0 ? `${sign}${round(diff, digits)}` : `${sign}${Math.round(diff)}`);
  return <em className={`pinDeltaBadge ${diff > 0 ? 'up' : 'down'}`}>{text}</em>;
}

function DamageValue({ raw, final, rangeFrom, baselineFinal, onQuickCombo, quickComboTitle = '加入连招计算' }) {
  const ranged = Number.isFinite(rangeFrom);
  const flooredFinal = damageFloor(final);
  const flooredBase = (baselineFinal !== undefined && baselineFinal !== null && Number.isFinite(Number(baselineFinal)))
    ? damageFloor(baselineFinal)
    : undefined;
  return (
    <div className={`damageValue ${ranged ? 'rangedValue' : ''}`.trim()}>
      <div className="damageValueMainRow">
        <b>{ranged ? `${damageFloor(rangeFrom)}~${flooredFinal}` : flooredFinal}</b>
        {flooredBase !== undefined ? <InlineDeltaBadge current={flooredFinal} baseline={flooredBase} /> : null}
        {onQuickCombo ? (
          <button
            type="button"
            className="quickComboAddBtn"
            onClick={(e) => { e.stopPropagation(); onQuickCombo(); }}
            title={quickComboTitle}
          >
            +连招
          </button>
        ) : null}
      </div>
      <small>原始 {ranged ? `${damageFloor(rangeFrom)}~${damageFloor(raw)}` : damageFloor(raw)}</small>
    </div>
  );
}

/**
 * 「这一段的伤害是个区间」的声明：
 *
 *   "damageRange": { "min": 0, "note": "根据摩托车当时的移动速度，在 0 和这个数之间变化" }
 *
 * min 不写时按 0 算。页面把总计那行显示成 min~计算值，note 挂在段落下方。
 */
function damageRangeRule(skill) {
  const rule = skill?.damageRange;
  if (!rule) return null;
  const min = getNumber(rule.min);
  if (!Number.isFinite(min)) return null;
  return { min, note: rule.note || '' };
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
// 命中次数阶梯最多列这么多档。再往上每档都只是单次的整数倍，逐档铺出来纯属刷屏
// （伦诺克斯青蛇痕迹最多 21 跳），超出的用步进器自己调。
const MULTI_HIT_LADDER_MAX = 10;

function skillMainSlot(skill) {
  // 条目上显式写了 slot 就以它为准。R 强化其他技能的段（芭芭拉超时实验、阿尔达沉睡之力）
  // 要挂到被强化的那个槽下面，标题以「（R强化）」开头，靠标题推导会落到 R。
  if (skill?.slot) return String(skill.slot).toUpperCase();
  const title = String(skill?.title || '').toUpperCase().trim();
  if (title.startsWith('P')) return 'P';
  if (title.startsWith('EQ')) return 'Q';
  if (title.startsWith('EW')) return 'W';
  const match = title.match(/[QWER]/);
  return match?.[0] || 'Q';
}

/**
 * 这一段的等级跟哪个技能槽走。
 * 默认就是它显示在的那一槽；R 强化其他技能的段显示在 Q/W/E 下，但等级必须跟 R，
 * 所以那些条目上写 levelSlot: "R"。
 */
function skillLevelSlot(skill) {
  return String(skill?.levelSlot || skillMainSlot(skill)).toUpperCase();
}

/**
 * 拨动开关。只有「在 / 不在某状态」这种二选一才用它，
 * 三个及以上的选项仍然走下拉，硬塞成开关反而看不出选了哪个。
 */
function ToggleSwitch({ checked, onChange, label, title }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      className={`toggleSwitch${checked ? ' on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="toggleSwitchTrack"><span className="toggleSwitchThumb" /></span>
      <span className="toggleSwitchLabel">{label}</span>
    </button>
  );
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

function characterMaxHpAtLevel(character, level = 20) {
  if (!character) return 0;
  return damageFloor(getNumber(character.base?.hp) + getNumber(character.growth?.maxHp) * Math.max(0, level - 1));
}

export default function App() {
  const sharedUrlBuild = useMemo(() => parseSharedBuildFromUrl(), []);
  const initialWorkspaceState = useMemo(() => {
    const base = loadWorkspaceState();
    if (!sharedUrlBuild) return base;
    const mergedLoadouts = { ...(base.heroLoadouts || {}) };
    if (sharedUrlBuild.weaponRaw) {
      mergedLoadouts[loadoutKeyFor(sharedUrlBuild.selectedHero, sharedUrlBuild.weaponRaw)] = {
        gear: sharedUrlBuild.gear,
        traitSelection: sharedUrlBuild.traitSelection,
        tacticalSkill: sharedUrlBuild.tacticalSkill
      };
    }
    const mergedForms = { ...(base.heroFormChoices || {}) };
    if (sharedUrlBuild.heroFormChoice !== undefined) {
      mergedForms[sharedUrlBuild.selectedHero] = sharedUrlBuild.heroFormChoice;
    }
    return {
      ...base,
      activePage: 'calculator',
      selectedHero: sharedUrlBuild.selectedHero,
      mastery: sharedUrlBuild.mastery,
      weaponTypeFilter: sharedUrlBuild.weaponTypeFilter,
      gear: sharedUrlBuild.gear,
      traitSelection: sharedUrlBuild.traitSelection,
      heroLoadouts: mergedLoadouts,
      tacticalSkill: sharedUrlBuild.tacticalSkill,
      tacticalUpgraded: sharedUrlBuild.tacticalUpgraded,
      talentAp: sharedUrlBuild.talentAp,
      targetIndex: sharedUrlBuild.targetIndex,
      target: sharedUrlBuild.target,
      targetMastery: sharedUrlBuild.targetMastery,
      targetHpPct: sharedUrlBuild.targetHpPct,
      selfHpPct: sharedUrlBuild.selfHpPct,
      autoSyncSelfHp: sharedUrlBuild.autoSyncSelfHp,
      selfHp: sharedUrlBuild.selfHp,
      effectToggles: sharedUrlBuild.effectToggles,
      vampireFull: sharedUrlBuild.vampireFull,
      r2Stacks: sharedUrlBuild.r2Stacks ?? base.r2Stacks,
      damageBonus: sharedUrlBuild.damageBonus,
      skillReduction: sharedUrlBuild.skillReduction,
      heroFormChoices: mergedForms,
      quickComboItems: sharedUrlBuild.quickComboItems
    };
  }, [sharedUrlBuild]);
  const initialAppSettings = loadAppSettings();
  const [savedHeroPresets, setSavedHeroPresets] = useState(loadSavedHeroPresets);
  const [isCreatingPreset, setIsCreatingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [sharedLoadedBanner, setSharedLoadedBanner] = useState(Boolean(sharedUrlBuild));
  const skipInitialHeroAutoRouteRef = useRef(Boolean(sharedUrlBuild));
  const [{ equipment, skills, talents, combos }, setConfig] = useState(loadConfig);
  const [activePage, setActivePage] = useState(initialWorkspaceState.activePage || 'calculator');
  const [gear, setGear] = useState(() => ({ ...DEFAULT_GEAR, ...(initialWorkspaceState.gear || {}) }));
  const [weaponTypeFilter, setWeaponTypeFilter] = useState(initialWorkspaceState.weaponTypeFilter || '全部类型');
  const [selectedHero, setSelectedHero] = useState(initialWorkspaceState.selectedHero || DEFAULT_HERO);
  const [mastery, setMastery] = useState(getNumber(initialWorkspaceState.mastery) || 20);
  const [talentAp, setTalentAp] = useState(getNumber(initialWorkspaceState.talentAp));
  const [traitSelection, setTraitSelection] = useState(() => normalizeTraitSelection(initialWorkspaceState.traitSelection || DEFAULT_TRAIT_SELECTION));
  // 用户自己改过的配装，按「实验体|武器类型」存。有记录就盖过官方推荐路线的预设。
  const [heroLoadouts, setHeroLoadouts] = useState(() => initialWorkspaceState.heroLoadouts || {});
  // 上一次记录用的组合键，用来区分「用户改了装备」和「刚切换实验体」两种触发。
  const loadoutRecordKeyRef = useRef(null);
  // 浏览器缓存里已经有配装的老用户，首帧就把这套认成他自己的选择记下来，
  // 否则他切走再切回来会被官方预设覆盖。全新用户没有缓存，直接吃预设。
  const adoptSavedLoadoutRef = useRef(Boolean(initialWorkspaceState.gear));
  const [targetIndex, setTargetIndex] = useState(Number.isInteger(initialWorkspaceState.targetIndex) ? initialWorkspaceState.targetIndex : 0);
  const [target, setTarget] = useState(() => (initialWorkspaceState.target ? { ...TARGETS[0], ...initialWorkspaceState.target } : TARGETS[0]));
  const [targetMastery, setTargetMastery] = useState(getNumber(initialWorkspaceState.targetMastery) || 1);
  const [selfHp, setSelfHp] = useState(getNumber(initialWorkspaceState.selfHp) || 2514);
  const [autoSyncSelfHp, setAutoSyncSelfHp] = useState(() => (
    initialWorkspaceState.autoSyncSelfHp === undefined ? true : Boolean(initialWorkspaceState.autoSyncSelfHp)
  ));
  const [traitsCollapsed, setTraitsCollapsed] = useState(() => (
    initialWorkspaceState.traitsCollapsed === undefined ? true : Boolean(initialWorkspaceState.traitsCollapsed)
  ));
  const [weaponSkillLevelOverride, setWeaponSkillLevelOverride] = useState(0);
  const [hammerShredActive, setHammerShredActive] = useState(false);
  const [selfShield, setSelfShield] = useState(getNumber(initialWorkspaceState.selfShield));
  // 「一段时间内累计造成的伤害」，给按累计量折算的技能用（丹尼尔 W 灵感引爆的真伤）
  const [accumulatedDamage, setAccumulatedDamage] = useState(getNumber(initialWorkspaceState.accumulatedDamage));
  // 目标当前体力 / 已失体力是同一件事的两面，两个框联动，和为 100%
  const [targetHpPct, setTargetHpPct] = useState(() => (
    initialWorkspaceState.targetHpPct === undefined || initialWorkspaceState.targetHpPct === null || initialWorkspaceState.targetHpPct === ''
      ? 100
      : Math.max(0, Math.min(100, getNumber(initialWorkspaceState.targetHpPct)))
  ));
  const [selfHpPct, setSelfHpPct] = useState(() => (
    initialWorkspaceState.selfHpPct === undefined || initialWorkspaceState.selfHpPct === null || initialWorkspaceState.selfHpPct === ''
      ? 100
      : Math.max(0, Math.min(100, getNumber(initialWorkspaceState.selfHpPct)))
  ));
  const [heroModifierChoices, setHeroModifierChoices] = useState(initialWorkspaceState.heroModifierChoices || {});
  // 形态开关（目前只有玛蒂娜的采访中 / 报道中），按英雄分别记住
  const [heroFormChoices, setHeroFormChoices] = useState(initialWorkspaceState.heroFormChoices || {});
  const [damageBonus, setDamageBonus] = useState(getNumber(initialWorkspaceState.damageBonus));
  const [skillReduction, setSkillReduction] = useState(getNumber(initialWorkspaceState.skillReduction));
  const [r2Stacks, setR2Stacks] = useState(() => (
    initialWorkspaceState.r2Stacks === undefined || initialWorkspaceState.r2Stacks === null || initialWorkspaceState.r2Stacks === ''
      ? 1
      : Math.max(0, getNumber(initialWorkspaceState.r2Stacks))
  ));
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
  // 方案1独立勾选项：地面持续区域特效（疾风 / 邪恶之雾 / 次元裂痕）是否按实战驻留跳数折算
  const [realisticEffectHits, setRealisticEffectHits] = useState(() => initialWorkspaceState.realisticEffectHits !== false);
  const [showBuildSettings, setShowBuildSettings] = useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [showHeroDebugSettings, setShowHeroDebugSettings] = useState(false);
  const globalSettingsAnchorRef = useRef(null);
  const versionButtonRef = useRef(null);

  useEffect(() => {
    if (!showGlobalSettings) return undefined;
    const handlePointerDown = (event) => {
      const targetNode = event.target;
      if (globalSettingsAnchorRef.current?.contains(targetNode)) return;
      if (versionButtonRef.current?.contains(targetNode)) return;
      setShowGlobalSettings(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setShowGlobalSettings(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showGlobalSettings]);
  const [effectsCollapsed, setEffectsCollapsed] = useState(Boolean(initialWorkspaceState.effectsCollapsed));
  const [skillTargetCounts, setSkillTargetCounts] = useState(initialWorkspaceState.skillTargetCounts || {});
  const [useHeroAvatarPicker, setUseHeroAvatarPicker] = useState(() => Boolean(initialAppSettings.useHeroAvatarPicker));
  const [useVisualGearPicker, setUseVisualGearPicker] = useState(() => initialAppSettings.useVisualGearPicker !== false);
  const [editMode, setEditMode] = useState(Boolean(initialAppSettings.editMode));
  const [showDamageTestHeroes, setShowDamageTestHeroes] = useState(Boolean(initialAppSettings.showDamageTestHeroes));
  const [uiTheme, setUiTheme] = useState(() => initialAppSettings.uiTheme || 'night');
  const [wideLayout, setWideLayout] = useState(() => !Boolean(initialAppSettings.useLegacyUi));
  const [pinnedBaseline, setPinnedBaseline] = useState(null);
  const [quickComboItems, setQuickComboItems] = useState(() => (
    Array.isArray(initialWorkspaceState.quickComboItems) ? initialWorkspaceState.quickComboItems : []
  ));
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
  const [collapsedComparisonCharts, setCollapsedComparisonCharts] = useState(
    () => (Array.isArray(initialWorkspaceState.collapsedComparisonCharts) ? initialWorkspaceState.collapsedComparisonCharts : [])
  );
  const toggleComparisonChart = (key) => setCollapsedComparisonCharts((current) => (
    current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
  ));
  const [selectedComparisonMastery, setSelectedComparisonMastery] = useState(() => getNumber(initialWorkspaceState.selectedComparisonMastery) || null);
  const [helpNotes, setHelpNotes] = useState(loadHelpNotes);
  const [helpNotesDirty, setHelpNotesDirty] = useState(false);
  const [helpNotesSaveStatus, setHelpNotesSaveStatus] = useState('idle');
  const [announcement, setAnnouncement] = useState(loadAnnouncement);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  // 上次看过的那条公告的身份；空串表示从没看过
  const [seenAnnouncement, setSeenAnnouncement] = useState(loadSeenAnnouncement);
  // 红点只在「这条公告开了提示」且「还没看过」时亮；关掉公告窗口就即时消失
  const announcementUnread = Boolean(announcement.showBadge)
    && announcementSignature(announcement) !== seenAnnouncement;
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
      heroLoadouts,
      targetIndex,
      target,
      targetMastery,
      targetHpPct,
      selfHpPct,
      heroModifierChoices,
      heroFormChoices,
      skillTargetCounts,
      selfHp,
      autoSyncSelfHp,
      traitsCollapsed,
      selfShield,
      accumulatedDamage,
      damageBonus,
      skillReduction,
      r2Stacks,
      tacticalSkill,
      tacticalUpgraded,
      vampireFull,
      effectToggles,
      realisticEffectHits,
      effectsCollapsed,
      heroAvatarQuery,
      showLowerTierEquipment,
      visibleStatKeys,
      skillLevels,
      comparisonSettings,
      comparisonScenarios,
      selectedComparisonMastery,
      collapsedComparisonCharts,
      quickComboItems
    }));
  }, [activePage, gear, weaponTypeFilter, selectedHero, mastery, talentAp, traitSelection, heroLoadouts, targetIndex, target, targetMastery, targetHpPct, selfHpPct, heroModifierChoices, heroFormChoices, selfHp, autoSyncSelfHp, traitsCollapsed, selfShield, accumulatedDamage, damageBonus, skillReduction, r2Stacks, tacticalSkill, tacticalUpgraded, vampireFull, effectToggles, realisticEffectHits, effectsCollapsed, skillTargetCounts, heroAvatarQuery, showLowerTierEquipment, visibleStatKeys, skillLevels, comparisonSettings, comparisonScenarios, selectedComparisonMastery, collapsedComparisonCharts, quickComboItems]);

  useEffect(() => {
    window.localStorage.setItem(SAVED_PRESETS_KEY, JSON.stringify(savedHeroPresets));
  }, [savedHeroPresets]);

  useEffect(() => {
    if (!sharedUrlBuild || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.has('b')) {
      url.searchParams.delete('b');
      const cleanSearch = url.searchParams.toString();
      window.history.replaceState(null, '', `${url.pathname}${cleanSearch ? `?${cleanSearch}` : ''}${url.hash}`);
    }
  }, [sharedUrlBuild]);

  useEffect(() => {
    setIsCreatingPreset(false);
    setNewPresetName('');
  }, [selectedHero]);

  useEffect(() => {
    window.localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify({
      useHeroAvatarPicker,
      useVisualGearPicker,
      editMode,
      showDamageTestHeroes,
      uiTheme,
      useLegacyUi: !wideLayout
    }));
  }, [useHeroAvatarPicker, useVisualGearPicker, editMode, showDamageTestHeroes, uiTheme, wideLayout]);

  useEffect(() => {
    if (!editMode) setShowHeroDebugSettings(false);
  }, [editMode]);

  useEffect(() => {
    document.body.dataset.theme = uiTheme;
  }, [uiTheme]);

  useEffect(() => {
    document.body.dataset.wide = wideLayout ? 'true' : 'false';
  }, [wideLayout]);

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

  /** 关掉公告窗口，并把当前这条记成「已看过」，之后不再自动弹。 */
  function closeAnnouncement() {
    setShowAnnouncement(false);
    const signature = announcementSignature(announcement);
    setSeenAnnouncement(signature);
    rememberSeenAnnouncement(signature);
  }

  // 进站时判断一次：公告变过（或从没看过）就自动弹出来。
  // 依赖数组留空是有意的 —— 只看进站那一刻的状态，本地编辑时边打字边弹就烦了。
  useEffect(() => {
    // 本地编辑时根本不自动弹：改公告的人每存一次就等于新公告，一刷新又糊到脸上。
    // 要看的话点版本号旁边那个入口就行。
    if (HELP_NOTES_EDITABLE) return;
    if (!announcement.title && !announcement.body) return;
    if (announcementSignature(announcement) === seenAnnouncement) return;
    setShowAnnouncement(true);
  }, []);

  /** 创建新公告：把当前这条归档进历史，正文清空等着写新的（只在本地编辑时可用） */
  function startNewAnnouncement() {
    if (!HELP_NOTES_EDITABLE) return;
    setAnnouncement((current) => normalizeAnnouncement(archiveAnnouncement(current)));
    setAnnouncementDirty(true);
    setAnnouncementSaveStatus('idle');
  }

  async function saveAnnouncement() {
    if (!HELP_NOTES_EDITABLE) return;

    const nextAnnouncement = normalizeAnnouncement({
      ...announcement,
      updatedAt: new Date().toISOString().slice(0, 10),
      // 记下发布时的版本号，归档进历史公告时才知道这条属于哪个版本
      version: APP_VERSION,
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
  // 默认只列出核对过的实验体（heroStatus.json 里 damageTestOnly: false 的）。
  // 打开「显示技能伤害统计测试英雄」后列出全部：没有伤害数据的也要能选中，
  // 技能面板会显示「暂无技能数据」，方便对照官方数据面板补录。
  const visibleHeroNames = canShowExtendedHeroes
    ? HEROES
    : HEROES.filter((hero) => !heroDamageTestOnly(hero));
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
  const heroModifiers = heroModifiersFor(selectedHero);
  const heroFormRule = formSwitchFor(selectedHero);
  const activeHeroForm = heroFormRule
    ? (heroFormChoices[selectedHero] ?? heroFormRule.default)
    : undefined;
  // 自身当前体力滑块只在该英雄的公式或被动（如希瑟拉 P）真的依赖自身已失体力时出现
  const usesSelfHp = useMemo(() => (
    Boolean(passiveStatRuleFor(selectedHero)?.selfLostHpToAp)
    || skills.some((skill) => (
      skill.hero === selectedHero && /\b(selfCurrentHp|selfLostHp)\b/.test(String(skill.formula || ''))
    ))
  ), [skills, selectedHero]);
  const stackValuesKey = stackSelector ? `${stackSelector.mode}:${stackSelector.values.join(',')}` : '';
  // 换英雄后原来的叠层值可能落在新选择器的范围之外。滑块只要夹进 0~上限；
  // 按钮模式还得正好落在某个按钮上，否则整排都不高亮，看着像坏了。
  useEffect(() => {
    if (!stackSelector) return;
    const { values, max, mode } = stackSelector;
    setR2Stacks((current) => {
      const clamped = Math.min(max, Math.max(0, current));
      if (mode === 'slider' || values.includes(clamped)) return clamped;
      return values.reduce((best, value) => (
        Math.abs(value - clamped) < Math.abs(best - clamped) ? value : best
      ), values[0]);
    });
    // stackValuesKey 已经代表了整份取值表，stackSelector 每次渲染都是新对象不能进依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stackValuesKey]);
  const allowedWeaponTypes = new Set(selectedCharacter?.weapons || []);
  const selectedWeaponRaw = weaponTypeFilter !== '全部类型'
    ? weaponTypeFromFilter(weaponTypeFilter)
    : weaponTypeRaw(byName(equipment, gear['武器']));
  const selectedMasteryStat = masteryStatFor(selectedCharacter?.code, selectedWeaponRaw);
  const selectedMasterySummary = masterySummary(selectedMasteryStat);
  const attack = characterAttackAtLevel(selectedCharacter, mastery);
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
    const activeWs = WEAPON_SKILLS_DATA.weaponSkills?.[selectedWeaponRaw || selectedCharacter?.weapons?.[0] || ''];
    const formulas = [
      ...skills.filter((skill) => skill.hero === selectedHero).map((skill) => skill.formula),
      ...(activeWs?.segments || []).map((seg) => seg.formula),
      ...(ITEM_EFFECT_DAMAGE.effects || [])
        .filter((effect) => equippedEffects.includes(effect.name))
        .map((effect) => effect.formula)
    ].join(' ');
    // 刽子手这类「目标血量低于 X%」的触发条件也需要那两个框
    const needsTargetHp = (ITEM_EFFECT_MODIFIERS.effects || [])
      .some((effect) => equippedEffects.includes(effect.name)
        && (effect.condition?.targetHpBelow !== undefined || effect.condition?.targetHpAbove !== undefined));
    return ['targetCurrentHp', 'targetLostHp', 'shield', 'accumulatedDamage'].filter((name) => (
      new RegExp(`\\b${name}\\b`).test(formulas) || (needsTargetHp && name !== 'shield' && name !== 'accumulatedDamage')
    ));
  }, [skills, selectedHero, selectedWeaponRaw, selectedCharacter, selectedEquipmentEffectsRaw]);
  // 普攻增幅只对普攻流有意义：数值不为 0，或者该英雄有被官方判定为普攻伤害的技能段时才显示
  // 公式里直接引用 basicAttackAmp 的，以及被判定为普攻伤害（damageType: basicAttack）的段落，
  // 都吃普攻增幅这一档，所以只要有一种就该把那张属性卡显示出来
  const heroUsesBasicAttackAmp = useMemo(() => skills.some((skill) => skill.hero === selectedHero && (
    skill.damageType === 'basicAttack' || /\bbasicAttackAmp\b/.test(String(skill.formula || ''))
  )), [skills, selectedHero]);
  const hasVampireStackTrait = selectedTraits.some((trait) => String(trait.id) === VAMPIRE_STACK_TRAIT_ID || trait.name === '吸血鬼');
  const effectiveVampireFull = hasVampireStackTrait && vampireFull;
  // 当前装备里需要开关的特效；换装后开关跟着变
  const availableEffectToggles = useMemo(() => toggleableEffectsFor(selectedGearItems), [selectedGearItems]);
  const hasEquippedRealisticHitEffects = useMemo(() => hasRealisticHitEffects(selectedGearItems), [selectedGearItems]);
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
      characterAttackSpeedOffset: getNumber(selectedCharacter?.base?.attackSpeed),
      weaponRaw: selectedWeaponRaw || selectedCharacter?.weapons?.[0] || '',
      baseDefense: characterDefenseAtLevel(selectedCharacter, mastery),
      baseMaxHp: characterMaxHpAtLevel(selectedCharacter, mastery),
      talentAp,
      traitBonuses,
      selectedTraits,
      target,
      targetMastery,
      targetHpPct,
      selfHpPct,
      heroModifierChoices,
      heroForm: activeHeroForm,
      skillTargetCounts,
      selfHp,
      autoSyncSelfHp,
      selfShield,
      accumulatedDamage,
      damageBonus,
      skillReduction,
      r2Stacks,
      tacticalSkill,
      tacticalUpgraded,
      vampireFull: effectiveVampireFull,
      effectToggles: activeEffectToggles,
      realisticEffectHits,
      selectedHero,
      weaponSkillLevel: weaponSkillLevelOverride,
      hammerShredActive,
      combos
    }),
    [equipment, skills, skillLevels, gear, mastery, selectedMasteryStat, selectedWeaponRaw, attack, selectedCharacter, talentAp, traitBonuses, selectedTraits, target, targetMastery, targetHpPct, selfHpPct, heroModifierChoices, activeHeroForm, skillTargetCounts, selfHp, autoSyncSelfHp, selfShield, accumulatedDamage, damageBonus, skillReduction, r2Stacks, tacticalSkill, tacticalUpgraded, effectiveVampireFull, activeEffectToggles, realisticEffectHits, selectedHero, weaponSkillLevelOverride, hammerShredActive, combos]
  );

  // 开启「跟随上限」时同步 selfHp 状态，保证爆发力潜能血量差与切回手动模式时的初值一致
  useEffect(() => {
    if (!autoSyncSelfHp) return;
    const synced = Math.max(1, Math.round(result.characterMaxHp));
    if (synced > 0 && synced !== selfHp) {
      setSelfHp(synced);
    }
  }, [autoSyncSelfHp, result.characterMaxHp, selfHp]);
  // ---- 主配装器一键快照对比（Pin Baseline）与点选式连招沙盘 ----
  // 切换实验体时清空跨英雄的快照与临时连招，防止串英雄对比
  const prevHeroForToolsRef = useRef(selectedHero);
  useEffect(() => {
    if (prevHeroForToolsRef.current !== selectedHero) {
      prevHeroForToolsRef.current = selectedHero;
      setPinnedBaseline(null);
      setQuickComboItems([]);
    }
  }, [selectedHero]);

  function capturePinBaseline() {
    const skillMap = {};
    for (const sk of result.skills) {
      skillMap[sk.id] = sk.damage;
      const pRule = progressiveDamageRule(sk);
      if (pRule) {
        const { min, max, defaultValue } = progressiveDamageBounds(pRule);
        const rId = pRule?.id || 'progressive';
        const sKey = `${sk.id}-${rId}`;
        const saved = skillTargetCounts[sKey];
        const sVal = Math.max(min, Math.min(max, saved === undefined || saved === null || saved === '' ? defaultValue : getNumber(saved)));
        skillMap[`prog:${sk.id}`] = progressiveDamageValue(sk, result.formulaContext, sVal).final;
        for (let st = min; st <= max; st += 1) {
          skillMap[`prog:${sk.id}:${st}`] = progressiveDamageValue(sk, result.formulaContext, st).final;
        }
      }
      if (getNumber(sk.maxHits) > 1) {
        const maxH = Math.max(1, getNumber(sk.maxHits));
        const stored = getNumber(skillTargetCounts[`${sk.id}-hits`]);
        const defH = Math.max(1, Math.min(maxH, getNumber(sk.defaultHits) || 1));
        const hCount = stored > 0 ? Math.min(maxH, stored) : defH;
        skillMap[`multihit:${sk.id}`] = scaledSkillDamage(sk, result.finalMod, { hits: hCount, context: result.formulaContext }).final;
      }
    }
    for (const sk of result.weaponSkill?.segments || []) {
      skillMap[`ws:${sk.id}`] = sk.damage;
    }
    const effectMap = {};
    for (const ef of result.effects || []) {
      effectMap[ef.title] = ef.value;
      if (ef.id) effectMap[ef.id] = ef.value;
    }
    const gearSummary = SLOTS.map((s) => gear[s] || '空').join(' · ');
    setPinnedBaseline({
      hero: selectedHero,
      mastery,
      gear: clone(gear),
      traitSelection: clone(traitSelection),
      tacticalSkill,
      tacticalUpgraded,
      effectToggles: clone(effectToggles),
      realisticEffectHits,
      vampireFull,
      gearSummary,
      ap: result.ap,
      attackPower: result.attackPower,
      cd: result.cd,
      cdCap: result.cdCap,
      finalAs: result.finalAttackSpeed,
      bonusAs: result.totalBonusAttackSpeed,
      selfDefense: result.selfDefense,
      maxHp: result.characterMaxHp,
      pen: result.pen,
      penPct: result.penPct,
      critChance: result.critChance,
      totalDamageBonus: result.totalDamageBonus,
      basicNormal: result.basicAttackDamage.normal,
      basicCrit: result.basicAttackDamage.critical,
      finalMod: result.finalMod,
      effectSubtotal: result.effectSubtotal,
      skillMap,
      effectMap
    });
  }

  function restorePinnedGear() {
    if (!pinnedBaseline) return;
    setGear(clone(pinnedBaseline.gear));
    setMastery(pinnedBaseline.mastery);
    if (pinnedBaseline.traitSelection) setTraitSelection(normalizeTraitSelection(pinnedBaseline.traitSelection));
    if (pinnedBaseline.tacticalSkill) setTacticalSkill(pinnedBaseline.tacticalSkill);
    setTacticalUpgraded(Boolean(pinnedBaseline.tacticalUpgraded));
    setEffectToggles(clone(pinnedBaseline.effectToggles || {}));
    if (pinnedBaseline.realisticEffectHits !== undefined) setRealisticEffectHits(Boolean(pinnedBaseline.realisticEffectHits));
    setVampireFull(Boolean(pinnedBaseline.vampireFull));
  }

  const [showAllPinnedStats, setShowAllPinnedStats] = useState(false);
  const activePin = pinnedBaseline && pinnedBaseline.hero === selectedHero ? pinnedBaseline : null;

  const pinnedStatDiffRows = useMemo(() => {
    if (!activePin) return [];
    const defs = [
      { key: 'ap', label: '最终法强', cur: result.ap, base: activePin.ap, digits: 0 },
      { key: 'atk', label: '最终攻击', cur: result.attackPower, base: activePin.attackPower, digits: 1 },
      { key: 'cd', label: '冷却缩减', cur: result.cd, base: activePin.cd ?? 0, digits: 0 },
      { key: 'finalAs', label: '面板攻速', cur: result.finalAttackSpeed, base: activePin.finalAs ?? 0, digits: 2 },
      { key: 'as', label: '额外攻速%', cur: result.totalBonusAttackSpeed, base: activePin.bonusAs ?? 0, isPercent: true },
      { key: 'def', label: '自身防御', cur: result.selfDefense, base: activePin.selfDefense ?? 0, digits: 1 },
      { key: 'hp', label: '血量上限', cur: result.characterMaxHp, base: activePin.maxHp ?? 0, digits: 0 },
      { key: 'ba', label: '平A(普攻)', cur: result.basicAttackDamage.normal, base: activePin.basicNormal, digits: 0 },
      { key: 'baCrit', label: '平A(暴击)', cur: result.basicAttackDamage.critical, base: activePin.basicCrit ?? 0, digits: 0 },
      { key: 'pen', label: '固定防穿', cur: result.pen, base: activePin.pen ?? 0, digits: 0 },
      { key: 'penPct', label: '百分比防穿', cur: result.penPct, base: activePin.penPct ?? 0, isPercent: true },
      { key: 'crit', label: '暴击率', cur: result.critChance, base: activePin.critChance ?? 0, isPercent: true },
      { key: 'dmgAmp', label: '伤害提升%', cur: result.totalDamageBonus, base: activePin.totalDamageBonus ?? 0, isPercent: true },
      { key: 'mod', label: '最终伤害倍率', cur: result.finalMod, base: activePin.finalMod, digits: 3 }
    ];
    return defs.map((d) => {
      const diff = getNumber(d.cur) - getNumber(d.base);
      const eps = d.isPercent ? 0.0005 : (d.digits > 0 ? 10 ** (-d.digits) * 0.5 : 0.5);
      const changed = Math.abs(diff) > eps;
      const fmt = (v) => (d.isPercent ? pct(v) : (d.digits > 0 ? round(v, d.digits) : Math.round(v)));
      return { ...d, diff, changed, curText: fmt(d.cur), baseText: fmt(d.base) };
    });
  }, [activePin, result]);

  function appendQuickComboStep(step) {
    setQuickComboItems((prev) => {
      const idx = prev.findIndex((item) => item.key === step.key);
      if (idx >= 0) {
        return prev.map((item, i) => (i === idx ? { ...item, count: item.count + 1 } : item));
      }
      return [...prev, { ...step, count: 1 }];
    });
  }

  function updateQuickComboStepCount(key, delta) {
    setQuickComboItems((prev) => prev
      .map((item) => (item.key === key ? { ...item, count: item.count + delta } : item))
      .filter((item) => item.count > 0));
  }

  const resolvedQuickCombo = useMemo(() => {
    const skillById = new Map(result.skills.map((s) => [s.id, s]));
    const wsSegById = new Map((result.weaponSkill?.segments || []).map((s) => [s.id, s]));
    const effectByKey = new Map();
    for (const e of result.effects || []) {
      effectByKey.set(e.title, e);
      if (e.id) effectByKey.set(e.id, e);
    }

    const items = quickComboItems.map((item) => {
      let unitFinal = 0;
      let unitRaw = 0;
      let baseUnitFinal = undefined;
      let resolvedLabel = item.label;

      if (item.kind === 'ba-normal') {
        unitFinal = result.basicAttackDamage.normal;
        unitRaw = unitFinal;
        baseUnitFinal = activePin?.basicNormal;
      } else if (item.kind === 'ba-crit') {
        unitFinal = result.basicAttackDamage.critical;
        unitRaw = unitFinal;
        baseUnitFinal = activePin?.basicCrit;
      } else if (item.kind === 'ba-enhanced') {
        unitFinal = result.basicAttackDamage.normal + result.basicAttackBonus;
        unitRaw = result.basicAttackDamage.normal + result.basicAttackBonusRaw;
      } else if (item.kind === 'weapon-skill') {
        const wsSeg = wsSegById.get(item.refId);
        unitFinal = getNumber(wsSeg?.damage);
        unitRaw = getNumber(wsSeg?.rawDamage);
        baseUnitFinal = activePin?.skillMap?.[`ws:${item.refId}`];
      } else if (item.kind === 'effect') {
        const ef = effectByKey.get(item.refId);
        unitFinal = getNumber(ef?.value);
        unitRaw = getNumber(ef?.raw);
        if (ef?.title) resolvedLabel = ef.title;
        baseUnitFinal = activePin?.effectMap?.[item.refId] ?? (ef?.id ? activePin?.effectMap?.[ef.id] : undefined);
      } else if (item.kind === 'skill-prog') {
        const sk = skillById.get(item.refId);
        if (sk) {
          const pRule = progressiveDamageRule(sk);
          const { min, max, defaultValue } = progressiveDamageBounds(pRule);
          const rId = pRule?.id || 'progressive';
          const saved = skillTargetCounts[`${sk.id}-${rId}`];
          const fallbackStep = Math.max(min, Math.min(max, saved === undefined || saved === null || saved === '' ? defaultValue : getNumber(saved)));
          const targetStep = item.step !== undefined ? Math.max(min, Math.min(max, getNumber(item.step))) : fallbackStep;
          const pv = progressiveDamageValue(sk, result.formulaContext, targetStep);
          unitFinal = pv.final;
          unitRaw = pv.raw;
          baseUnitFinal = activePin?.skillMap?.[`prog:${sk.id}:${targetStep}`] ?? activePin?.skillMap?.[`prog:${sk.id}`];
        }
      } else if (item.kind === 'skill-multihit') {
        const sk = skillById.get(item.refId);
        if (sk) {
          const single = scaledSkillDamage(sk, result.finalMod, { context: result.formulaContext });
          unitFinal = single.final;
          unitRaw = single.raw;
          baseUnitFinal = activePin?.skillMap?.[sk.id];
        }
      } else if (item.kind === 'skill') {
        const sk = skillById.get(item.refId);
        if (sk) {
          const scale = item.scale || 1;
          const hits = item.hits || 1;
          const sc = scaledSkillDamage(sk, result.finalMod, { scale, hits, context: result.formulaContext });
          unitFinal = sc.final;
          unitRaw = sc.raw;
          if (activePin?.skillMap?.[sk.id] !== undefined) {
            baseUnitFinal = Math.floor(activePin.skillMap[sk.id] * scale) * hits;
          }
        }
      }

      return {
        ...item,
        label: resolvedLabel,
        unitFinal,
        unitRaw,
        totalFinal: unitFinal * item.count,
        totalRaw: unitRaw * item.count,
        baseTotalFinal: baseUnitFinal !== undefined ? baseUnitFinal * item.count : undefined
      };
    });

    const totalDamage = items.reduce((s, x) => s + x.totalFinal, 0);
    const totalRaw = items.reduce((s, x) => s + x.totalRaw, 0);
    const hasAllBase = activePin && items.length > 0 && items.every((x) => x.baseTotalFinal !== undefined);
    const baseTotalDamage = hasAllBase ? items.reduce((s, x) => s + x.baseTotalFinal, 0) : undefined;
    const targetMax = Math.max(1, getNumber(target.hp) || 1000);
    const startHpRatio = Math.max(0, Math.min(1, getNumber(targetHpPct) / 100));
    const startHp = Math.round(targetMax * startHpRatio);
    const remainHp = Math.max(0, startHp - totalDamage);
    const overkill = Math.max(0, totalDamage - startHp);
    const dealtPctOfMax = Math.min(100, (totalDamage / targetMax) * 100);
    const remainPctOfMax = Math.max(0, (remainHp / targetMax) * 100);

    return {
      items,
      totalDamage,
      totalRaw,
      baseTotalDamage,
      targetMax,
      startHp,
      remainHp,
      overkill,
      isLethal: items.length > 0 && totalDamage >= startHp,
      dealtPctOfMax,
      remainPctOfMax
    };
  }, [quickComboItems, result, activePin, target.hp, targetHpPct, skillTargetCounts]);

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

  // ---- v0.2.091 一键换装收益排行（全身金/红升级优先级 + 单部位散件排行） ----
  const [showGearOptimizer, setShowGearOptimizer] = useState(false);
  const [optimizerMode, setOptimizerMode] = useState('upgrade');
  const [optimizerSlot, setOptimizerSlot] = useState('头部');
  const [optimizerMetric, setOptimizerMetric] = useState('auto');
  const [optimizerTierScope, setOptimizerTierScope] = useState('all_high');
  const [optimizerIncludeProc, setOptimizerIncludeProc] = useState(true);
  const [optimizerAutoMaxStacks, setOptimizerAutoMaxStacks] = useState(true);
  const [optimizerEnableZoneEffects, setOptimizerEnableZoneEffects] = useState(false);
  const [optimizerKeepMinCd, setOptimizerKeepMinCd] = useState(false);
  const [optimizerAllowCrossWeapon, setOptimizerAllowCrossWeapon] = useState(false);

  function openGearOptimizer(nextMode = 'upgrade', nextSlot = null) {
    setOptimizerMode(nextMode);
    if (nextSlot && SLOTS.includes(nextSlot)) setOptimizerSlot(nextSlot);
    setShowGearOptimizer(true);
  }

  function handleEquipFromOptimizer(slot, item) {
    if (!item) return;
    if (slot === '武器') {
      const nextRaw = weaponTypeRaw(item);
      if (nextRaw && nextRaw !== selectedWeaponRaw) {
        setWeaponTypeFilter(weaponTypeLabelForRaw(nextRaw));
        const key = loadoutKeyFor(selectedHero, nextRaw);
        loadoutRecordKeyRef.current = key;
      }
    }
    updateGear(slot, item.name);
  }

  const optimizerMetricOptions = useMemo(() => {
    const opts = [];
    if (quickComboItems.length > 0) {
      opts.push({
        key: 'combo',
        label: `🎯 当前连招序列总伤（${quickComboItems.length} 步）`,
        shortLabel: '当前连招总伤',
        digits: 0
      });
    }
    opts.push({
      key: 'burst',
      label: '💥 一套技能爆发总伤（全技能 + 平A + D）',
      shortLabel: '一套爆发总伤',
      digits: 0
    });
    opts.push({
      key: 'ba_dps',
      label: '🏹 普攻持续秒伤（期望平A × 面板攻速）',
      shortLabel: '普攻持续秒伤',
      digits: 1
    });
    opts.push({
      key: 'ba_hit',
      label: '🗡 单发普攻期望伤害（暴击加权）',
      shortLabel: '单发期望普攻',
      digits: 0
    });
    if ((result.weaponSkill?.segments || []).length > 0) {
      opts.push({
        key: 'ws_d',
        label: `⚡ 武器技能 D · ${result.weaponSkill.name}`,
        shortLabel: `D·${result.weaponSkill.name}`,
        digits: 0
      });
    }
    for (const sk of result.skills) {
      if (sk.kind === 'shield' || sk.kind === 'heal' || sk.kind === 'buff') continue;
      opts.push({
        key: `skill:${sk.id}`,
        label: `单技能 · ${sk.title}`,
        shortLabel: sk.title,
        digits: 0
      });
    }
    opts.push({ key: 'stat:ap', label: '面板属性 · 最终法强', shortLabel: '最终法强', digits: 0 });
    opts.push({ key: 'stat:attackPower', label: '面板属性 · 最终攻击力', shortLabel: '最终攻击力', digits: 1 });
    return opts;
  }, [quickComboItems.length, result.weaponSkill, result.skills]);

  const effectiveOptimizerMetric = useMemo(() => {
    const defaultKey = quickComboItems.length > 0 ? 'combo' : 'burst';
    if (optimizerMetric === 'auto') return defaultKey;
    if (!optimizerMetricOptions.some((o) => o.key === optimizerMetric)) return defaultKey;
    return optimizerMetric;
  }, [optimizerMetric, optimizerMetricOptions, quickComboItems.length]);

  const gearOptimizerData = useMemo(() => {
    if (!showGearOptimizer) return null;

    const metricMeta = optimizerMetricOptions.find((o) => o.key === effectiveOptimizerMetric) || optimizerMetricOptions[0];
    const baseDefLv = characterDefenseAtLevel(selectedCharacter, mastery);
    const baseMaxHpLv = characterMaxHpAtLevel(selectedCharacter, mastery);
    const charAsOffset = getNumber(selectedCharacter?.base?.attackSpeed);
    const comboEffectTitles = new Set(
      quickComboItems.filter((x) => x.kind === 'effect').map((x) => x.refId)
    );

    function runSim(candidateGear) {
      const candItems = SLOTS.map((s) => byName(equipment, candidateGear[s])).filter(Boolean);
      const candWeaponItem = candItems.find((it) => it.type === '武器');
      const candWeaponRaw = weaponTypeRaw(candWeaponItem) || selectedWeaponRaw || selectedCharacter?.weapons?.[0] || '';
      const candMasteryStat = masteryStatFor(selectedCharacter?.code, candWeaponRaw);
      const candEqStats = aggregateEquipmentStats(candItems, mastery);
      const candMaxHp = getNumber(baseMaxHpLv) + statValue(candEqStats, 'maxHp');
      const candSelfHp = autoSyncSelfHp && candMaxHp > 0 ? candMaxHp : Math.max(1, getNumber(selfHp) || 1000);
      const candBurstBonus = Math.min(0.1, Math.max(0, (getNumber(target.hp) - candSelfHp) / Math.max(1, candSelfHp)) * 0.25);
      const candTraitBonuses = traitBonusesFor(selectedTraits, candBurstBonus);
      const candAvailToggles = toggleableEffectsFor(candItems);
      const candEffectToggles = Object.fromEntries(
        candAvailToggles
          .filter((t) => {
            if (activeEffectToggles[t.name]) return true;
            if (!t.situational && optimizerAutoMaxStacks) return true;
            if (t.zone && optimizerEnableZoneEffects) return true;
            return false;
          })
          .map((t) => [t.name, true])
      );

      return calc({
        equipment,
        skillTable: skills,
        skillLevels,
        gear: candidateGear,
        mastery,
        masteryStat: candMasteryStat,
        attack,
        characterAttackSpeedOffset: charAsOffset,
        weaponRaw: candWeaponRaw,
        baseDefense: baseDefLv,
        baseMaxHp: baseMaxHpLv,
        talentAp,
        traitBonuses: candTraitBonuses,
        selectedTraits,
        target,
        targetMastery,
        targetHpPct,
        selfHpPct,
        heroModifierChoices,
        heroForm: activeHeroForm,
        skillTargetCounts,
        selfHp: candSelfHp,
        autoSyncSelfHp,
        selfShield,
        accumulatedDamage,
        damageBonus,
        skillReduction,
        r2Stacks,
        tacticalSkill,
        tacticalUpgraded,
        vampireFull: effectiveVampireFull,
        effectToggles: candEffectToggles,
        realisticEffectHits,
        selectedHero,
        weaponSkillLevel: weaponSkillLevelOverride,
        hammerShredActive,
        combos
      });
    }

    function skillRepresentativeDamage(sk, simRes) {
      if (!sk || sk.kind === 'shield' || sk.kind === 'heal' || sk.kind === 'buff') return 0;
      const pRule = progressiveDamageRule(sk);
      if (pRule) {
        const { min, max, defaultValue } = progressiveDamageBounds(pRule);
        const rId = pRule?.id || 'progressive';
        const saved = skillTargetCounts[`${sk.id}-${rId}`];
        const stepVal = Math.max(min, Math.min(max, saved === undefined || saved === null || saved === '' ? defaultValue : getNumber(saved)));
        return progressiveDamageValue(sk, simRes.formulaContext, stepVal).final;
      }
      if (getNumber(sk.maxHits) > 1) {
        const maxH = Math.max(1, getNumber(sk.maxHits));
        const stored = getNumber(skillTargetCounts[`${sk.id}-hits`]);
        const dynHits = skillDisplayRule(selectedHero, sk.id)?.dynamicHitsByBonusAs;
        const computedDef = dynHits
          ? Math.min(getNumber(dynHits.max) || maxH, getNumber(dynHits.base) + Math.floor((simRes.totalBonusAttackSpeed + 1e-6) / (getNumber(dynHits.step) || 0.2)))
          : (getNumber(sk.defaultHits) || 1);
        const hits = stored > 0 ? Math.min(maxH, stored) : Math.max(1, Math.min(maxH, computedDef));
        return scaledSkillDamage(sk, simRes.finalMod, { hits, context: simRes.formulaContext }).final;
      }
      const dRule = skillDisplayRule(selectedHero, sk.id);
      if (dRule?.hits > 1) {
        return scaledSkillDamage(sk, simRes.finalMod, { hits: dRule.hits, context: simRes.formulaContext }).final;
      }
      return getNumber(sk.damage);
    }

    function scoreBreakdownForSim(simRes) {
      const mKey = effectiveOptimizerMetric;
      if (mKey === 'stat:ap') return { total: simRes.ap, direct: simRes.ap, proc: 0, hasSplit: false };
      if (mKey === 'stat:attackPower') return { total: simRes.attackPower, direct: simRes.attackPower, proc: 0, hasSplit: false };
      const critP = Math.max(0, Math.min(1, getNumber(simRes.critChance)));
      const expectedBa = (1 - critP) * getNumber(simRes.basicAttackDamage?.normal) + critP * getNumber(simRes.basicAttackDamage?.critical);
      if (mKey === 'ba_hit') return { total: expectedBa, direct: expectedBa, proc: 0, hasSplit: false };
      if (mKey === 'ba_dps') {
        const dps = expectedBa * Math.max(0.01, getNumber(simRes.finalAttackSpeed));
        return { total: dps, direct: dps, proc: 0, hasSplit: false };
      }
      if (mKey === 'ws_d') {
        const wsDmg = (simRes.weaponSkill?.segments || []).reduce((s, seg) => s + getNumber(seg.damage), 0);
        const proc = optimizerIncludeProc ? getNumber(simRes.effectSubtotal) : 0;
        return { total: wsDmg + proc, direct: wsDmg, proc, hasSplit: true };
      }
      if (mKey.startsWith('skill:')) {
        const skId = mKey.slice('skill:'.length);
        const sk = simRes.skills.find((x) => x.id === skId);
        const direct = skillRepresentativeDamage(sk, simRes);
        const proc = optimizerIncludeProc ? getNumber(simRes.effectSubtotal) : 0;
        return { total: direct + proc, direct, proc, hasSplit: true };
      }
      if (mKey === 'combo' && quickComboItems.length > 0) {
        const skMap = new Map(simRes.skills.map((s) => [s.id, s]));
        const wsMap = new Map((simRes.weaponSkill?.segments || []).map((s) => [s.id, s]));
        const efMap = new Map();
        for (const e of simRes.effects || []) {
          efMap.set(e.title, e);
          if (e.id) efMap.set(e.id, e);
        }
        let direct = 0;
        let proc = 0;
        for (const item of quickComboItems) {
          let unit = 0;
          if (item.kind === 'ba-normal') unit = getNumber(simRes.basicAttackDamage?.normal);
          else if (item.kind === 'ba-crit') unit = getNumber(simRes.basicAttackDamage?.critical);
          else if (item.kind === 'ba-enhanced') unit = getNumber(simRes.basicAttackDamage?.normal) + getNumber(simRes.basicAttackBonus);
          else if (item.kind === 'weapon-skill') unit = getNumber(wsMap.get(item.refId)?.damage);
          else if (item.kind === 'effect') unit = getNumber(efMap.get(item.refId)?.value);
          else if (item.kind === 'skill-prog') {
            const sk = skMap.get(item.refId);
            if (sk) {
              const pRule = progressiveDamageRule(sk);
              const { min, max, defaultValue } = progressiveDamageBounds(pRule);
              const targetStep = item.step !== undefined ? Math.max(min, Math.min(max, getNumber(item.step))) : defaultValue;
              unit = progressiveDamageValue(sk, simRes.formulaContext, targetStep).final;
            }
          } else if (item.kind === 'skill-multihit') {
            const sk = skMap.get(item.refId);
            if (sk) unit = scaledSkillDamage(sk, simRes.finalMod, { context: simRes.formulaContext }).final;
          } else if (item.kind === 'skill') {
            const sk = skMap.get(item.refId);
            if (sk) unit = scaledSkillDamage(sk, simRes.finalMod, { scale: item.scale || 1, hits: item.hits || 1, context: simRes.formulaContext }).final;
          }
          const sub = unit * getNumber(item.count);
          if (item.kind === 'effect') proc += sub;
          else direct += sub;
        }
        if (optimizerIncludeProc) {
          const extraProc = (simRes.effects || [])
            .filter((e) => e && !e.excludeFromSubtotal && !comboEffectTitles.has(e.title) && (!e.id || !comboEffectTitles.has(e.id)))
            .reduce((s, e) => s + getNumber(e.value), 0);
          proc += extraProc;
        }
        return { total: direct + proc, direct, proc, hasSplit: true };
      }

      // 默认 burst：一套技能（排除护盾/治疗/增益与已被普通段覆盖的 R强化 重复项）+ 1发期望平A + D首段伤害 + 触发特效
      let direct = expectedBa;
      for (const sk of simRes.skills) {
        if (sk.kind === 'shield' || sk.kind === 'heal' || sk.kind === 'buff') continue;
        if (String(sk.title || '').includes('（R强化）')) continue;
        direct += skillRepresentativeDamage(sk, simRes);
      }
      const wsFirst = simRes.weaponSkill?.segments?.[0];
      if (wsFirst) direct += getNumber(wsFirst.damage);
      const proc = optimizerIncludeProc ? getNumber(simRes.effectSubtotal) : 0;
      return { total: direct + proc, direct, proc, hasSplit: true };
    }

    function passesTierFilter(item) {
      const tier = QUALITY_TIER_KEY[item.quality] || 'common';
      if (optimizerTierScope === 'mythic') return tier === 'mythic';
      if (optimizerTierScope === 'legend') return tier === 'legend';
      if (optimizerTierScope === 'all_high') return tier === 'mythic' || tier === 'legend';
      return tier === 'mythic' || tier === 'legend' || tier === 'epic';
    }

    function candidatesForSlot(slot) {
      return equipment.filter((item) => {
        if (item.type !== slot) return false;
        const isCurrentlyWorn = gear[slot] === item.name;
        if (!isCurrentlyWorn && !passesTierFilter(item)) return false;
        if (slot === '武器') {
          const raw = weaponTypeRaw(item);
          if (allowedWeaponTypes.size && !allowedWeaponTypes.has(raw)) return false;
          if (!optimizerAllowCrossWeapon && selectedWeaponRaw && raw !== selectedWeaponRaw && !isCurrentlyWorn) {
            return false;
          }
        }
        return true;
      });
    }

    const baseSim = runSim(gear);
    const baseBd = scoreBreakdownForSim(baseSim);
    const baselineScore = baseBd.total;
    const baselineDirect = baseBd.direct;
    const baselineProc = baseBd.proc;
    const hasScoreSplit = baseBd.hasSplit;
    const baselineCd = baseSim.cd;

    function evaluateSlotCandidates(slot) {
      const cands = candidatesForSlot(slot);
      const rows = [];
      for (const item of cands) {
        const isCurrent = gear[slot] === item.name;
        const sim = isCurrent ? baseSim : runSim({ ...gear, [slot]: item.name });
        if (!isCurrent && optimizerKeepMinCd && sim.cd < baselineCd) continue;
        const bd = isCurrent ? baseBd : scoreBreakdownForSim(sim);
        const score = bd.total;
        const delta = score - baselineScore;
        const pctDelta = baselineScore > 0 ? (delta / baselineScore) * 100 : (delta > 0 ? 100 : 0);
        rows.push({
          slot,
          item,
          isCurrent,
          score,
          directScore: bd.direct,
          procScore: bd.proc,
          delta,
          directDelta: bd.direct - baselineDirect,
          procDelta: bd.proc - baselineProc,
          pctDelta,
          ap: sim.ap,
          attackPower: sim.attackPower,
          cd: sim.cd
        });
      }
      rows.sort((a, b) => b.score - a.score || (b.cd - a.cd));
      return rows;
    }

    if (optimizerMode === 'slot') {
      const rows = evaluateSlotCandidates(optimizerSlot);
      const curIdx = rows.findIndex((r) => r.isCurrent);
      const currentSlotRow = curIdx >= 0
        ? { ...rows[curIdx], rank: curIdx + 1 }
        : { item: byName(equipment, gear[optimizerSlot]), score: baselineScore, rank: null };
      return {
        baselineScore,
        baselineDirect,
        baselineProc,
        hasScoreSplit,
        baselineCd,
        metricMeta,
        slotBestList: [],
        rankedRows: rows,
        currentSlotRow
      };
    }

    // upgrade 模式：评估全部 5 个部位
    const bySlot = SLOTS.map((slot) => {
      const rows = evaluateSlotCandidates(slot);
      const bestUpgrade = rows.find((r) => !r.isCurrent && r.delta > 0) || null;
      return { slot, best: bestUpgrade, rows };
    });

    const mergedUpgrades = bySlot
      .flatMap((entry) => entry.rows.filter((r) => !r.isCurrent && r.delta >= -0.5))
      .sort((a, b) => b.delta - a.delta || (b.cd - a.cd))
      .slice(0, 28);

    return {
      baselineScore,
      baselineDirect,
      baselineProc,
      hasScoreSplit,
      baselineCd,
      metricMeta,
      slotBestList: bySlot.map(({ slot, best }) => ({ slot, best })),
      rankedRows: mergedUpgrades,
      currentSlotRow: null
    };
  }, [
    showGearOptimizer,
    optimizerMode,
    optimizerSlot,
    effectiveOptimizerMetric,
    optimizerMetricOptions,
    optimizerTierScope,
    optimizerIncludeProc,
    optimizerAutoMaxStacks,
    optimizerEnableZoneEffects,
    optimizerKeepMinCd,
    optimizerAllowCrossWeapon,
    realisticEffectHits,
    equipment,
    skills,
    skillLevels,
    gear,
    mastery,
    selectedWeaponRaw,
    allowedWeaponTypes,
    attack,
    selectedCharacter,
    talentAp,
    selectedTraits,
    target,
    targetMastery,
    targetHpPct,
    selfHpPct,
    heroModifierChoices,
    activeHeroForm,
    skillTargetCounts,
    selfHp,
    autoSyncSelfHp,
    selfShield,
    accumulatedDamage,
    damageBonus,
    skillReduction,
    r2Stacks,
    tacticalSkill,
    tacticalUpgraded,
    effectiveVampireFull,
    activeEffectToggles,
    selectedHero,
    weaponSkillLevelOverride,
    hammerShredActive,
    combos,
    quickComboItems
  ]);
  const showBasicAttackAmp = Boolean(result.basicAttackAmp || result.basicAttackFlatBonus || heroUsesBasicAttackAmp);
  // 「预计恢复与护盾」和「强化普攻」两张卡：都在时并列成两列，只有一张时照旧占满整行
  const hasSupportPanel = result.supportSkills.length > 0;
  const hasBasicAttackPanel = result.basicAttackSkills.length > 0;
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
  // 攻击力百分比（神速、双重假面、玛蒂娜被动）是最后乘上去的，翡翠被动攻速转额外攻击力单独标注
  const attackPowerPct = getNumber(result.totalAttackPowerPct);
  const attackBreakdownHint = `基础 ${round(result.baseAttackPower, 1)} + 额外 ${round(result.extraAttackPower, 1)}`
    + (result.convertedExtraAttackPower ? `（含攻速转化 +${round(result.convertedExtraAttackPower, 1)}）` : '')
    + (attackPowerPct ? ` ，再 × (1 + ${pct(attackPowerPct)})` : '');
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
  const comparisonRows = useMemo(() => (
    comparisonScenarios.flatMap((scenario) => comparisonMasteryLevels.map((level) => {
      const scenarioWeaponRaw = weaponTypeRaw(byName(equipment, scenario.gear.武器));
      const scenarioMasteryStat = masteryStatFor(selectedCharacter?.code, scenarioWeaponRaw);
      const scenarioSelfHp = Math.max(1, getNumber(comparisonSettings.selfHp));
      const scenarioTraitBonuses = traitBonusesFor(selectedTraits, Math.min(0.1, Math.max(0, (comparisonSettings.target.hp - scenarioSelfHp) / scenarioSelfHp) * 0.25));
      const effectAvailability = comparisonScenarioEffectAvailability(scenario);
      const levelAttack = characterAttackAtLevel(selectedCharacter, level);
      const levelDefense = characterDefenseAtLevel(selectedCharacter, level);
      const levelMaxHp = characterMaxHpAtLevel(selectedCharacter, level);
      const scenarioResult = calc({
        equipment,
        skillTable: skills,
        skillLevels,
        gear: scenario.gear,
        mastery: level,
        masteryStat: scenarioMasteryStat,
        attack: levelAttack,
        characterAttackSpeedOffset: getNumber(selectedCharacter?.base?.attackSpeed),
        weaponRaw: scenarioWeaponRaw || selectedCharacter?.weapons?.[0] || '',
        baseDefense: levelDefense,
        baseMaxHp: levelMaxHp,
        talentAp,
        traitBonuses: scenarioTraitBonuses,
        selectedTraits,
        target: comparisonSettings.target,
        targetMastery: comparisonSettings.targetMastery,
        targetHpPct,
        selfHpPct,
        heroModifierChoices,
        heroForm: activeHeroForm,
        skillTargetCounts,
        selfHp: comparisonSettings.selfHp,
        selfShield,
        accumulatedDamage,
        damageBonus: comparisonSettings.damageBonus,
        skillReduction: comparisonSettings.skillReduction,
        r2Stacks,
        tacticalSkill,
        tacticalUpgraded,
        vampireFull: effectAvailability.vampireFull && scenario.effectToggles.vampireFull,
        effectToggles: Object.fromEntries(effectAvailability.effects
          .filter((item) => scenario.effectToggles[item.name])
          .map((item) => [item.name, true])),
        realisticEffectHits,
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
          // 装备独有效果（诅咒 / 腐化 / 疾风…）的伤害合计，以及逐条明细
          effectSubtotal: scenarioResult.effectSubtotal,
          cd: scenarioResult.cd,
          basicAttackAmp: scenarioResult.basicAttackAmp,
          extraHp: scenarioResult.extraHp,
          defense: scenarioResult.selfDefense,
          critChance: statValue(scenarioResult.equipmentStats, 'criticalStrikeChance'),
          critDamage: statValue(scenarioResult.equipmentStats, 'criticalStrikeDamage'),
          attackSpeed: scenarioResult.totalBonusAttackSpeed,
          moveSpeed: statValue(scenarioResult.equipmentStats, 'moveSpeed'),
          skillAmpPct: scenarioResult.totalApPct,
          ...Object.fromEntries(scenarioResult.skills.map((skill) => [`skill:${skill.id}`, skill.damage])),
          ...Object.fromEntries((scenarioResult.effects || [])
            .filter((effect) => effect && !effect.excludeFromSubtotal)
            .map((effect) => [`effect:${effect.title}`, effect.value]))
        }
      };
    }))
  ), [comparisonScenarios, comparisonMasteryLevels, comparisonSettings, equipment, skills, skillLevels, selectedCharacter, selectedTraits, talentAp, targetHpPct, selfHpPct, heroModifierChoices, activeHeroForm, skillTargetCounts, selfShield, accumulatedDamage, r2Stacks, tacticalSkill, tacticalUpgraded, realisticEffectHits, selectedHero, combos]);
  // 勾选栏里能出现哪些指标：核心项恒在，其余项要「至少有一个方案真的有这个数值」
  const availableComparisonMetrics = useMemo(() => {
    const nonZero = new Set();
    for (const row of comparisonRows) {
      for (const [key, value] of Object.entries(row.values || {})) {
        if (getNumber(value)) nonZero.add(key);
      }
    }
    return COMPARISON_STAT_METRICS
      .filter((metric) => !metric.standalone)
      .filter((metric) => metric.core || nonZero.has(metric.key));
  }, [comparisonRows]);
  // 装备特效逐条明细，勾了「装备特效伤害」时一并列进表格
  const comparisonEffectColumns = useMemo(() => {
    const names = new Map();
    for (const row of comparisonRows) {
      for (const key of Object.keys(row.values || {})) {
        if (key.startsWith('effect:') && !names.has(key)) names.set(key, key.slice('effect:'.length));
      }
    }
    return [...names.entries()].map(([key, label]) => ({ key, label }));
  }, [comparisonRows]);
  const comparisonMetricColumns = useMemo(() => {
    const statColumns = COMPARISON_STAT_METRICS.filter((metric) => comparisonSettings.selectedMetrics.includes(metric.key));
    const effectColumns = comparisonSettings.selectedMetrics.includes('effectSubtotal')
      ? comparisonEffectColumns
      : [];
    const skillColumns = comparisonSettings.includeSkills
      ? comparisonSkillRows.map((skill) => ({ key: `skill:${skill.id}`, label: skill.title }))
      : [];
    return [...statColumns, ...effectColumns, ...skillColumns];
  }, [comparisonSettings.selectedMetrics, comparisonSettings.includeSkills, comparisonSkillRows, comparisonEffectColumns]);
  const displayedComparisonRows = useMemo(() => {
    if (!comparisonSettings.groupRowsByMastery) return comparisonRows;
    const scenarioOrder = new Map(comparisonScenarios.map((scenario, index) => [scenario.id, index]));
    return [...comparisonRows].sort((left, right) => (
      left.mastery - right.mastery
      || (scenarioOrder.get(left.scenarioId) ?? 0) - (scenarioOrder.get(right.scenarioId) ?? 0)
    ));
  }, [comparisonRows, comparisonScenarios, comparisonSettings.groupRowsByMastery]);
  // 差值面板的基准方案：设置里存的 id 还在就用它，否则退回第一个方案
  // （方案被删掉时不至于整个面板空掉）。
  const deltaBaselineScenario = useMemo(() => (
    comparisonScenarios.find((scenario) => scenario.id === comparisonSettings.deltaBaselineId)
      || comparisonScenarios[0]
  ), [comparisonScenarios, comparisonSettings.deltaBaselineId]);
  // 可选的对比项跟着表格的可用指标走，再补上单独拎出来的「装备特效伤害」
  const deltaMetricOptions = useMemo(() => {
    const standalone = COMPARISON_STAT_METRICS.filter((metric) => metric.standalone);
    return [...availableComparisonMetrics, ...standalone];
  }, [availableComparisonMetrics]);
  const deltaMetric = useMemo(() => (
    deltaMetricOptions.find((metric) => metric.key === comparisonSettings.deltaMetric)
      || deltaMetricOptions.find((metric) => metric.key === 'ap')
      || deltaMetricOptions[0]
  ), [deltaMetricOptions, comparisonSettings.deltaMetric]);
  const deltaMetricKey = deltaMetric?.key || 'ap';
  // 折叠态复用图表那套记忆（collapsedComparisonCharts），键用一个不会和指标 key 撞的名字
  const deltaPanelCollapsed = collapsedComparisonCharts.includes(DELTA_PANEL_KEY);
  const comparisonDeltaRows = useMemo(() => {
    const metricKey = deltaMetric?.key;
    if (!deltaBaselineScenario || !metricKey || comparisonScenarios.length < 2) return [];

    const rowsByScenarioAndMastery = new Map(comparisonRows.map((row) => [`${row.scenarioId}:${row.mastery}`, row]));
    // 基准方案自己不出现在对比列表里
    return comparisonScenarios.filter((scenario) => scenario.id !== deltaBaselineScenario.id).map((scenario) => {
      const levelDeltas = comparisonMasteryLevels.map((level) => {
        const baselineRow = rowsByScenarioAndMastery.get(`${deltaBaselineScenario.id}:${level}`);
        const scenarioRow = rowsByScenarioAndMastery.get(`${scenario.id}:${level}`);
        const baselineValue = getNumber(baselineRow?.values?.[metricKey]);
        const scenarioValue = getNumber(scenarioRow?.values?.[metricKey]);
        const delta = scenarioValue - baselineValue;
        return {
          level,
          baselineValue,
          scenarioValue,
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
        baselineName: deltaBaselineScenario.name,
        averageDelta,
        minDelta: validDeltas.length ? Math.min(...validDeltas.map((item) => item.delta)) : 0,
        maxDelta: validDeltas.length ? Math.max(...validDeltas.map((item) => item.delta)) : 0,
        selectedDelta,
        levelDeltas
      };
    });
  }, [comparisonRows, comparisonScenarios, comparisonMasteryLevels, selectedComparisonMasteryLevel, deltaBaselineScenario, deltaMetric]);
  // 图表跟着勾选走：勾了几个属性指标就画几张，技能与特效明细只进表格不画图
  const comparisonChartMetrics = useMemo(() => {
    // 单独提出来的「装备特效伤害」不在上面那排里，但勾上了同样要出图
    const usable = new Set([...availableComparisonMetrics.map((metric) => metric.key),
      ...COMPARISON_STAT_METRICS.filter((metric) => metric.standalone).map((metric) => metric.key)]);
    const picked = COMPARISON_STAT_METRICS
      .filter((metric) => usable.has(metric.key) && comparisonSettings.selectedMetrics.includes(metric.key));
    return picked.length ? picked : [COMPARISON_STAT_METRICS[0]];
  }, [availableComparisonMetrics, comparisonSettings.selectedMetrics]);
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
    if (skipInitialHeroAutoRouteRef.current) {
      skipInitialHeroAutoRouteRef.current = false;
      return;
    }
    const nextRawType = preferredWeaponRawFor(selectedHero, selectedCharacter);
    if (!nextRawType) return;

    const nextFilter = weaponTypeLabelForRaw(nextRawType);
    setWeaponTypeFilter(nextFilter);

    // 换到这名实验体的默认武器上，套用用户存过的配装，没存过就用官方推荐路线的预设。
    // 套上了就直接返回，别让下面「自动补一把武器」的兜底把预设武器换掉。
    if (applyLoadoutFor(selectedHero, nextRawType)) return;

    // 空栏是明确选择的「不穿」，换英雄时也不要自动补一把武器回来
    if (isEmptyGear(gear['武器'])) return;
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
      // 这里要和上面那个 effect 用同一套武器选择逻辑。这个 effect 看到的 weaponTypeFilter
      // 还是切换前那个（同一次提交里 setState 尚未生效），直接取 weapons[0] 会把上面刚
      // 按推荐路线选好的武器又顶掉。
      setWeaponTypeFilter(weaponTypeLabelForRaw(preferredWeaponRawFor(selectedHero, selectedCharacter)));
      return;
    }

    // 空栏是明确选择的「不穿」，别再自动补一件回来
    if (isEmptyGear(gear['武器'])) return;
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
      if (isEmptyGear(gear[slot])) return;
      const currentItem = byName(equipment, gear[slot]);
      if (currentItem && shouldShowInBuilder(currentItem, showLowerTierEquipment)) return;

      const nextItem = builderChoicesBySlot[slot]?.[0] || equipment.find((item) => item.type === slot);
      if (nextItem) updateGear(slot, nextItem.name);
    });
  }, [equipment, gear, showLowerTierEquipment]);

  // 记录用户对当前「实验体|武器类型」的改动。和预设逐项一致时说明还没动过，
  // 就把记录删掉——这样以后预设更新了还能跟着更新，不会被一份等价的旧快照钉死。
  //
  // 只在组合没变的那一帧记录。刚切换实验体时，武器类型已经是新的、装备还是上一个实验体的，
  // 那一帧记下去就会把旧配装错挂到新实验体名下，所以要先让 applyLoadoutFor 把配装换过来。
  useEffect(() => {
    const key = loadoutKeyFor(selectedHero, selectedWeaponRaw);
    if (!selectedWeaponRaw) return;
    const previousKey = adoptSavedLoadoutRef.current ? key : loadoutRecordKeyRef.current;
    adoptSavedLoadoutRef.current = false;
    loadoutRecordKeyRef.current = key;
    if (previousKey !== key) return;
    const current = { gear, traitSelection, tacticalSkill };
    const preset = ROUTE_PRESETS[key];
    setHeroLoadouts((saved) => {
      if (preset && loadoutFieldsEqual(current, preset)) {
        if (!saved[key]) return saved;
        const next = { ...saved };
        delete next[key];
        return next;
      }
      if (saved[key] && loadoutFieldsEqual(saved[key], current)) return saved;
      return { ...saved, [key]: current };
    });
  }, [gear, traitSelection, tacticalSkill, selectedHero, selectedWeaponRaw]);

  function updateGear(slot, name) {
    setGear((current) => ({ ...current, [slot]: name }));
  }

  const currentOfficialPreset = selectedWeaponRaw
    ? ROUTE_PRESETS[loadoutKeyFor(selectedHero, selectedWeaponRaw)]
    : null;
  const heroCustomPresets = savedHeroPresets[selectedHero] || [];

  function buildShareUrl() {
    const extra = {};
    const activeEf = Object.keys(activeEffectToggles).filter((k) => activeEffectToggles[k]);
    if (activeEf.length) extra.ef = activeEf;
    if (effectiveVampireFull) extra.vf = 1;
    if (r2Stacks !== 1) extra.st = r2Stacks;
    if (damageBonus) extra.db = damageBonus;
    if (skillReduction) extra.sr = skillReduction;
    if (activeHeroForm !== undefined) extra.fm = activeHeroForm;
    if (quickComboItems.length) {
      extra.cb = quickComboItems.map((c) => [
        c.key,
        c.kind,
        c.refId || '',
        c.label || '',
        c.count || 1,
        c.hits || 1,
        c.scale || 1,
        c.step ?? null
      ]);
    }

    const payload = {
      v: 1,
      h: selectedCharacter?.code || selectedHero,
      m: mastery,
      w: selectedWeaponRaw || '',
      g: SLOTS.map((slot) => {
        const name = gear[slot];
        if (isEmptyGear(name)) return 0;
        const item = byName(equipment, name);
        return item?.code || name;
      }),
      t: [
        traitSelection.group || '',
        traitSelection.core || '',
        traitSelection.sub1 || '',
        traitSelection.sub2 || '',
        traitSelection.secondaryGroup || '',
        traitSelection.secondarySub1 || '',
        traitSelection.secondarySub2 || ''
      ],
      f: [tacticalSkill, tacticalUpgraded ? 1 : 0, talentAp || 0],
      tg: [
        targetIndex,
        target.hp,
        target.defense,
        target.defenseReduction || 0,
        target.reduction || 0,
        targetMastery,
        targetHpPct,
        selfHpPct,
        autoSyncSelfHp ? 1 : 0,
        autoSyncSelfHp ? Math.round(result.characterMaxHp) : selfHp
      ]
    };
    if (Object.keys(extra).length) payload.x = extra;

    const encoded = encodeBase64UrlUtf8(JSON.stringify(payload));
    return `${window.location.origin}${window.location.pathname}?b=${encoded}`;
  }

  async function copyShareUrl() {
    if (typeof window === 'undefined') return;
    const url = buildShareUrl();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const area = document.createElement('textarea');
        area.value = url;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      }
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2200);
    } catch {
      window.prompt('复制以下配装分享链接：', url);
    }
  }

  function startCreateHeroPreset() {
    const count = heroCustomPresets.length + 1;
    const wLabel = weaponTypeOfficialName(selectedWeaponRaw);
    setNewPresetName(`${wLabel !== '未设置' ? wLabel : '配装'}方案 ${count}`);
    setIsCreatingPreset(true);
  }

  function saveNewHeroPreset() {
    const trimmed = newPresetName.trim() || `方案 ${heroCustomPresets.length + 1}`;
    const nextPreset = {
      id: `preset-${Date.now()}`,
      name: trimmed,
      weaponRaw: selectedWeaponRaw || '',
      weaponTypeFilter,
      gear: clone(gear),
      traitSelection: clone(traitSelection),
      tacticalSkill,
      tacticalUpgraded,
      talentAp,
      effectToggles: clone(effectToggles),
      vampireFull,
      quickComboItems: clone(quickComboItems),
      updatedAt: new Date().toISOString()
    };
    setSavedHeroPresets((prev) => ({
      ...prev,
      [selectedHero]: [...(prev[selectedHero] || []), nextPreset]
    }));
    setIsCreatingPreset(false);
    setNewPresetName('');
  }

  function applyCustomHeroPreset(preset) {
    if (!preset) return;
    const rawW = preset.weaponRaw || weaponTypeRaw(byName(equipment, preset.gear?.['武器'])) || selectedWeaponRaw;
    if (rawW) {
      const nextFilter = preset.weaponTypeFilter && preset.weaponTypeFilter !== '全部类型'
        ? preset.weaponTypeFilter
        : weaponTypeLabelForRaw(rawW);
      setWeaponTypeFilter(nextFilter);
      const key = loadoutKeyFor(selectedHero, rawW);
      loadoutRecordKeyRef.current = key;
      setHeroLoadouts((saved) => ({
        ...saved,
        [key]: {
          gear: clone(preset.gear),
          traitSelection: normalizeTraitSelection(preset.traitSelection || DEFAULT_TRAIT_SELECTION),
          tacticalSkill: preset.tacticalSkill || tacticalSkill
        }
      }));
    }
    setGear(clone(preset.gear));
    if (preset.traitSelection) setTraitSelection(normalizeTraitSelection(preset.traitSelection));
    if (preset.tacticalSkill) setTacticalSkill(preset.tacticalSkill);
    if (preset.tacticalUpgraded !== undefined) setTacticalUpgraded(Boolean(preset.tacticalUpgraded));
    if (preset.talentAp !== undefined) setTalentAp(getNumber(preset.talentAp));
    if (preset.effectToggles) setEffectToggles(clone(preset.effectToggles));
    if (preset.vampireFull !== undefined) setVampireFull(Boolean(preset.vampireFull));
    if (Array.isArray(preset.quickComboItems) && preset.quickComboItems.length) {
      setQuickComboItems(clone(preset.quickComboItems));
    }
  }

  function overwriteHeroPreset(presetId) {
    setSavedHeroPresets((prev) => ({
      ...prev,
      [selectedHero]: (prev[selectedHero] || []).map((p) => (
        p.id === presetId
          ? {
            ...p,
            weaponRaw: selectedWeaponRaw || '',
            weaponTypeFilter,
            gear: clone(gear),
            traitSelection: clone(traitSelection),
            tacticalSkill,
            tacticalUpgraded,
            talentAp,
            effectToggles: clone(effectToggles),
            vampireFull,
            quickComboItems: clone(quickComboItems),
            updatedAt: new Date().toISOString()
          }
          : p
      ))
    }));
  }

  function deleteHeroPreset(presetId) {
    setSavedHeroPresets((prev) => ({
      ...prev,
      [selectedHero]: (prev[selectedHero] || []).filter((p) => p.id !== presetId)
    }));
  }

  function restoreOfficialRoutePreset() {
    if (!currentOfficialPreset || !selectedWeaponRaw) return;
    const key = loadoutKeyFor(selectedHero, selectedWeaponRaw);
    setHeroLoadouts((saved) => {
      if (!saved[key]) return saved;
      const next = { ...saved };
      delete next[key];
      return next;
    });
    setGear((current) => {
      const next = { ...current };
      SLOTS.forEach((slot) => {
        const name = currentOfficialPreset.gear[slot];
        if (name !== undefined && (!name || byName(equipment, name))) next[slot] = name;
      });
      return next;
    });
    if (currentOfficialPreset.traitSelection) {
      setTraitSelection(normalizeTraitSelection(currentOfficialPreset.traitSelection));
    }
    if (currentOfficialPreset.tacticalSkill) {
      setTacticalSkill(currentOfficialPreset.tacticalSkill);
    }
  }

  /**
   * 换到这名实验体时落在哪把武器上。按 characters.json 的武器顺序找第一把「有配装可用」的：
   * 用户自己存过的最优先，其次是官方推荐路线的预设，都没有才用第一把。
   *
   * 这样处理是因为有的实验体默认武器没有官方路线、第二把才有（秀雅默认是锤，官方只给了棍棒），
   * 直接用第一把会落到空配装上，等于这个功能对他们没生效。
   */
  function preferredWeaponRawFor(hero, character) {
    const weapons = character?.weapons || [];
    if (!weapons.length) return '';
    return weapons.find((raw) => heroLoadouts[loadoutKeyFor(hero, raw)])
      || weapons.find((raw) => ROUTE_PRESETS[loadoutKeyFor(hero, raw)])
      || weapons[0];
  }

  /**
   * 套用某个「实验体|武器类型」的配装：用户存过的优先，否则用官方推荐路线的预设。
   * 两者都没有就什么都不做，返回 false 让调用方走自己的兜底逻辑。
   */
  function applyLoadoutFor(hero, weaponRawType) {
    const key = loadoutKeyFor(hero, weaponRawType);
    const source = heroLoadouts[key] || ROUTE_PRESETS[key];
    if (!source?.gear) return false;

    setGear((current) => {
      const next = { ...current };
      SLOTS.forEach((slot) => {
        const name = source.gear[slot];
        if (name === undefined) return;
        // 预设里查不到的道具（改版下架等）就保持原样，别把栏位清空
        if (name && !byName(equipment, name)) return;
        next[slot] = name;
      });
      return next;
    });
    if (source.traitSelection) setTraitSelection(normalizeTraitSelection(source.traitSelection));
    if (source.tacticalSkill) setTacticalSkill(source.tacticalSkill);
    return true;
  }

  function updateWeaponType(type) {
    setWeaponTypeFilter(type);
    if (type === '全部类型') return;
    // 换武器类型 = 换一套预设；用户改过这个组合就用他自己那套
    if (applyLoadoutFor(selectedHero, weaponTypeFromFilter(type))) return;

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
        .filter((skill) => skillLevelSlot(skill) === slot)
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
            userEdited: true,
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
            <img key={group.image} src={loadoutImageSrc(group.image)} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
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
              <img key={trait.image} className="traitIcon" src={loadoutImageSrc(trait.image)} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
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

  // step 是给上限很大的资源条用的（厄喀翁的 VF 值 0~100），一格一点要点一百下
  function renderCountStepper(label, key, { min = 0, max = MULTI_TARGET_MAX, fallback, step = 1 } = {}) {
    const saved = skillTargetCounts[key];
    const raw = saved === undefined || saved === null || saved === '' ? getNumber(fallback) : getNumber(saved);
    const count = Math.max(min, Math.min(max, raw));
    return (
      <div className="targetStepper">
        <span>{label}</span>
        <button type="button" onClick={() => updateSkillCount(key, count - step, { min, max })}>-</button>
        <b>{count}</b>
        <button type="button" onClick={() => updateSkillCount(key, count + step, { min, max })}>+</button>
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
    const selfAmp = selfAmpRule(skill);
    const damageRange = damageRangeRule(skill);
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
            <DamageValue
              raw={totalRaw}
              final={totalFinal}
              rangeFrom={damageRange?.min}
              baselineFinal={activePin?.skillMap?.[skill.id] !== undefined && count === 1 && !options.primaryFinal
                ? activePin.skillMap[skill.id]
                : undefined}
              onQuickCombo={() => appendQuickComboStep({
                key: `skill:${skill.id}:${options.ruleHits || 1}`,
                kind: 'skill',
                refId: skill.id,
                hits: options.ruleHits || 1,
                label: `${skillMainSlot(skill)}·${label}`
              })}
            />
          </div>
          {selfAmp ? (
            <div className="skillTotalValue selfAmpValue">
              <span>受{selfAmp.source}增伤时{options.selfAmpLabel || '伤害'}</span>
              <DamageValue
                raw={totalRaw * selfAmp.multiplier}
                final={totalFinal * selfAmp.multiplier}
                rangeFrom={Number.isFinite(damageRange?.min) ? damageRange.min * selfAmp.multiplier : undefined}
              />
            </div>
          ) : null}
        </div>
        {damageRange?.note ? <p className="skillLeafNote">{damageRange.note}</p> : null}
        {selfAmp?.note ? <p className="skillLeafNote">{selfAmp.note}</p> : null}
      </div>
    );
  }

  function renderProgressiveSkillDamage(skill, label) {
    const rule = progressiveDamageRule(skill);
    const { min, max, defaultValue } = progressiveDamageBounds(rule);
    const ruleId = rule?.id || 'progressive';
    const stepKey = `${skill.id}-${ruleId}`;
    const savedStep = skillTargetCounts[stepKey];
    const stepValue = Math.max(min, Math.min(max,
      savedStep === undefined || savedStep === null || savedStep === '' ? defaultValue : getNumber(savedStep)));
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
          {renderCountStepper(stepLabel, stepKey, { min, max, fallback: defaultValue })}
        </div>
        <div className="skillLeafValues">
          <div className="skillTotalValue">
            <span>{selectedLabel}</span>
            <DamageValue
              raw={selectedStep.raw}
              final={selectedStep.final}
              baselineFinal={activePin?.skillMap?.[`prog:${skill.id}:${stepValue}`]}
              onQuickCombo={() => appendQuickComboStep({
                key: `prog:${skill.id}:step:${stepValue}`,
                kind: 'skill-prog',
                refId: skill.id,
                step: stepValue,
                label: `${skillMainSlot(skill)}·${label}(${stepValue}${unit || '档'})`
              })}
              quickComboTitle={`将【${stepValue}${unit || '档'}】加入连招（不同蓄力档位分开计算）`}
            />
          </div>
        </div>
        <div className="progressiveDamageSteps" aria-label={`${stepLabel}伤害列表`}>
          {steps.map((step) => {
            const varLabelMap = { ap: '技增', attack: '攻击', extraAttack: '额外攻击', maxHp: '体力上限', extraHp: '额外体力', targetHp: '目标体力', defense: '防御' };
            const varZh = varLabelMap[step.variable] || step.variable;
            return (
              <div
                className={`progressiveStepInteractive ${step.step === stepValue ? 'active' : ''}`.trim()}
                key={`${skill.id}-${ruleId}-${step.step}`}
                onClick={() => updateSkillCount(stepKey, step.step, { min, max })}
                title={`点击切换至 ${step.step}${unit ? ` ${unit}` : ''}`}
              >
                <span>{step.step}{unit ? ` ${unit}` : ''} / {varZh} {pct(step.coefficient)}</span>
                <DamageValue
                  raw={step.raw}
                  final={step.final}
                  baselineFinal={activePin?.skillMap?.[`prog:${skill.id}:${step.step}`]}
                  onQuickCombo={() => appendQuickComboStep({
                    key: `prog:${skill.id}:step:${step.step}`,
                    kind: 'skill-prog',
                    refId: skill.id,
                    step: step.step,
                    label: `${skillMainSlot(skill)}·${label}(${step.step}${unit || '档'})`
                  })}
                  quickComboTitle={`直接将【${step.step}${unit || '档'}】加入连招`}
                />
              </div>
            );
          })}
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
    // 等级归属可能和显示位置不同：R 强化段显示在 Q/W/E 下，强化普攻显示在下方「强化普攻」栏，
    // 但等级仍由原技能槽的选择器控制，所以即使本槽不直接显示伤害条目也要保留等级选择器。
    const levelSkills = result.skills.filter((skill) => skillLevelSlot(skill) === slot);
    const levelValue = levelSkills[0] ? skillLevels[levelSkills[0].id] : 1;
    // 这一槽的伤害段被挪到别处显示时，给个说明，别让人以为没数据
    const movedAway = levelSkills.filter((skill) => skill.kind !== 'basicAttack' && skillMainSlot(skill) !== slot);
    const basicAttackMoved = levelSkills.filter((skill) => skill.kind === 'basicAttack');
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
          {levelSkills.length ? (
            <div className="levelSelect">
              <span>Lv.</span>
              <select value={levelValue} onChange={(event) => updateSkillSlotLevel(slot, getNumber(event.target.value))}>
                {Array.from({ length: Math.max(...levelSkills.map((item) => getNumber(item.maxLevel) || 1)) }, (_, index) => index + 1).map((level) => (
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
          <p className="note">
            {movedAway.length
              ? `${movedAway.length} 段强化伤害显示在被强化的技能下（标题带「（R强化）」），这里只控制等级`
              : basicAttackMoved.length
                ? `${basicAttackMoved.length} 段强化普攻显示在下方「强化普攻」栏，此处可调整技能等级`
                : '暂无技能数据'}
          </p>
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
    const dynHits = skillDisplayRule(selectedHero, skill.id)?.dynamicHitsByBonusAs;
    const computedDefault = dynHits
      ? Math.min(getNumber(dynHits.max) || maxHits, getNumber(dynHits.base) + Math.floor((result.totalBonusAttackSpeed + 1e-6) / (getNumber(dynHits.step) || 0.2)))
      : (getNumber(skill.defaultHits) || 1);
    const defaultHits = Math.max(1, Math.min(maxHits, computedDefault));
    const hits = stored > 0 ? Math.min(maxHits, stored) : defaultHits;
    const single = scaledSkillDamage(skill, result.finalMod, { context: result.formulaContext });
    const picked = scaledSkillDamage(skill, result.finalMod, { hits, context: result.formulaContext });
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
        {/* 上限大的（伦诺克斯青蛇最多 21 跳）逐档列出来会刷屏，且每档就是单次的整数倍，
            只列到 MULTI_HIT_LADDER_MAX 档，再多的用步进器自己调 */}
        <div className="progressiveDamageSteps" aria-label={`${hitLabel}伤害列表`}>
          {Array.from({ length: Math.min(maxHits, MULTI_HIT_LADDER_MAX) }, (unused, index) => index + 1).map((count) => {
            const value = scaledSkillDamage(skill, result.finalMod, { hits: count, context: result.formulaContext });
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
            <DamageValue
              raw={picked.raw}
              final={picked.final}
              baselineFinal={activePin?.skillMap?.[`multihit:${skill.id}`]}
              onQuickCombo={() => {
                for (let i = 0; i < hits; i += 1) {
                  appendQuickComboStep({
                    key: `multihit:${skill.id}`,
                    kind: 'skill-multihit',
                    refId: skill.id,
                    label: `${skillMainSlot(skill)}·${label}(单发)`
                  });
                }
              }}
              quickComboTitle={`将 ${hits} 次命中加入连招`}
            />
          </div>
        </div>
        {skill.hitNote ? <p className="skillLeafNote">{skill.hitNote}</p> : null}
      </div>
    );
  }

  // 护盾 / 治疗量：用同一套公式算，但不是伤害，单独显示且不参与伤害合计
  const NON_DAMAGE_KIND_LABELS = { shield: '护盾', heal: '治疗', buff: '增益' };

  /**
   * 增益类条目（卡洛琳 W 的镜子技能增幅这种）：没有伤害，只按技能等级给一档百分比，
   * 可叠层。等级直接跟着所在技能槽的 Lv 走，层数用条目自己的 ± 步进器。
   */
  function renderBuffLeaf(skill) {
    const label = skill.title.replace(/^[PQWER]\s*/, '') || skill.title;
    const sourceMeta = skillSourceMeta(skill);
    const skillLevel = skill.level || skillLevels[skill.id] || 1;
    const maxStacks = Math.max(1, getNumber(skill.maxStacks) || 1);
    const stackKey = buffStackStateKey(skill);
    const stacks = buffStackCount(skill, skillTargetCounts);
    const perStack = buffValueAtLevel(skill, skillLevel);
    // buffKey: ap 那种是实打实的点数，不能按百分比显示（会写成「每层 3000%」）
    const showBuff = (value) => (BUFF_FLAT_KEYS.has(skill.buffKey) ? `+${round(value, 2)}` : pct(value));
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
                  formula={skill.onlyAtMaxStacks
                    ? `满 ${maxStacks} 层时一次性 ${showBuff(perStack)}（不足不给）`
                    : `每层 ${showBuff(perStack)}　最多 ${maxStacks} 层`}
                  description={skill.coefficientText || skill.description || ''}
                  source={sourceMeta?.title}
                />
              )}
            >
              <strong>{label}</strong>
            </PortalHovercard>
            <span className="nonDamageBadge">增益</span>
          </div>
          {skill.stackMode === 'slider' ? (
            <div className="buffStackSlider">
              <span>{skill.stackLabel || '叠层'}</span>
              <div className="stackSlider">
                <input
                  type="range"
                  min={0}
                  max={maxStacks}
                  step={Math.max(1, getNumber(skill.stackStep) || 1)}
                  value={stacks}
                  onChange={(event) => updateSkillCount(stackKey, Number(event.target.value), { min: 0, max: maxStacks })}
                  aria-label={skill.stackLabel || '叠层'}
                />
                <input
                  type="number"
                  min={0}
                  max={maxStacks}
                  value={stacks}
                  onChange={(event) => updateSkillCount(stackKey, getNumber(event.target.value), { min: 0, max: maxStacks })}
                  aria-label={`${skill.stackLabel || '叠层'}（手动输入）`}
                />
                <small>/ {maxStacks}</small>
              </div>
            </div>
          ) : renderCountStepper(skill.stackLabel || '叠层', stackKey, {
            min: 0, max: maxStacks, fallback: skill.defaultStacks, step: Math.max(1, getNumber(skill.stackStep) || 1)
          })}
        </div>
        <div className="skillLeafValues">
          <div className="skillTotalValue">
            <span>
              {BUFF_KEY_LABELS[skill.buffKey] || skill.buffKey}
              {skill.onlyAtMaxStacks
                ? `（Lv.${skillLevel} 满 ${maxStacks} 层时 ${showBuff(perStack)}）`
                : `（Lv.${skillLevel} 每层 ${showBuff(perStack)}）`}
            </span>
            <span className="buffValue">{showBuff(buffContribution(skill, skillLevel, stacks))}</span>
          </div>
        </div>
        {skill.hitNote ? <p className="skillLeafNote">{skill.hitNote}</p> : null}
      </div>
    );
  }

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
    if (skill.kind === 'buff') return renderBuffLeaf(skill);
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
      const primarySingle = scaledSkillDamage(skill, result.finalMod, { context: result.formulaContext });
      const primary = scaledSkillDamage(skill, result.finalMod, { hits, context: result.formulaContext });
      const hasSecondary = rule.secondaryScale !== undefined;
      const secondarySingle = hasSecondary ? scaledSkillDamage(skill, result.finalMod, { scale: rule.secondaryScale, context: result.formulaContext }) : null;
      const secondary = hasSecondary ? scaledSkillDamage(skill, result.finalMod, { scale: rule.secondaryScale, hits, context: result.formulaContext }) : null;
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
        ruleHits: hits,
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

  function renderWeaponSkillRow() {
    const ws = result.weaponSkill;
    if (!ws) return null;
    const iconUrl = weaponSkillImageSrc(ws.icon);
    const hasHammerShred = Array.isArray(ws.targetDefenseShredByLevel) && ws.targetDefenseShredByLevel.length > 0;
    const curShredPct = hasHammerShred ? ws.targetDefenseShredByLevel[Math.max(0, Math.min(2, ws.level - 1))] : 0;

    return (
      <div className="weaponSkillBox">
        <div className="weaponSkillHead">
          <div className="weaponSkillTitleWrap">
            {iconUrl ? (
              <img className="weaponSkillIcon" src={iconUrl} alt={ws.name} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ) : null}
            <div>
              <div className="weaponSkillTitleLine">
                <span className="weaponSkillKeyBadge">D</span>
                <strong>{ws.name}</strong>
                <span className="weaponSkillMetaPill">{weaponTypeOfficialName(ws.weaponRaw)} · 冷却 {ws.cooldown}</span>
                {!ws.unlocked && weaponSkillLevelOverride === 0 ? (
                  <span className="weaponSkillLockedBadge" title="武器熟练度达到 Lv.5 解锁 1 级，当前按 Lv.1 预览">熟练未满5级(预览Lv.1)</span>
                ) : null}
              </div>
              <p className="weaponSkillSummary">{ws.summary}</p>
            </div>
          </div>
          <div className="weaponSkillControls">
            {hasHammerShred ? (
              <label className="weaponSkillShredToggle" title="勾选后将锤子武器技能的减防计入目标最终防御与后续连招计算">
                <input
                  type="checkbox"
                  checked={hammerShredActive}
                  onChange={(e) => setHammerShredActive(e.target.checked)}
                />
                <span>减防 {pct(curShredPct)} 生效</span>
              </label>
            ) : null}
            <div className="levelSelect">
              <span>D等级</span>
              <select
                value={weaponSkillLevelOverride}
                onChange={(e) => setWeaponSkillLevelOverride(Number(e.target.value))}
                aria-label="武器技能等级"
              >
                <option value={0}>自动 (Lv.{ws.autoLevel})</option>
                <option value={1}>Lv.1 (熟5)</option>
                <option value={2}>Lv.2 (熟10)</option>
                <option value={3}>Lv.3 (熟15)</option>
              </select>
            </div>
          </div>
        </div>
        {ws.segments.length ? (
          <div className="weaponSkillGrid">
            {ws.segments.map((seg) => {
              const shortLabel = seg.title.replace(/^D\s*/, '');
              return (
                <div className="skillDamageLeaf weaponSkillLeaf" key={seg.id}>
                  <div className="skillLeafHead">
                    <div className="skillLeafTitle">
                      <PortalHovercard
                        className="skillNameHover"
                        content={(
                          <SkillDescriptionContent
                            title={`${shortLabel}`}
                            level={ws.level}
                            formula={skillFormulaDescription(seg, ws.level)}
                            description={seg.coefficientText || ''}
                            source="13.1 武器技能"
                          />
                        )}
                      >
                        <strong>{shortLabel}</strong>
                      </PortalHovercard>
                      {seg.damageType === 'true' ? <span className="nonDamageBadge">真伤</span> : null}
                      {seg.damageType === 'basicAttack' ? <span className="nonDamageBadge">普攻类</span> : null}
                    </div>
                  </div>
                  <div className="skillLeafValues">
                    <div className="skillTotalValue">
                      <span>{seg.coefficientText || '单次命中'}</span>
                      <DamageValue
                        raw={seg.rawDamage}
                        final={seg.damage}
                        baselineFinal={activePin?.skillMap?.[`ws:${seg.id}`]}
                        onQuickCombo={() => appendQuickComboStep({
                          key: `ws:${seg.id}`,
                          kind: 'weapon-skill',
                          refId: seg.id,
                          label: `D·${shortLabel}`
                        })}
                        quickComboTitle={`将 ${shortLabel} 加入连招`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  function formatComparisonValue(key, value) {
    const numericValue = getNumber(value);
    if (key === 'finalMod') return round(numericValue, 3);
    if (['penPct', 'totalDamageBonus', 'basicAttackAmp', 'critChance', 'critDamage',
      'attackSpeed', 'skillAmpPct'].includes(key)) {
      return pct(numericValue);
    }
    return round(numericValue, Math.abs(numericValue) < 10 ? 2 : 1);
  }

  // 传 key 时按该指标自己的口径格式化：百分比类指标要显示成 +5%，
  // 不然 totalDamageBonus 差 5% 会写成「+0.05」，看着像差了 0.05 点。
  function formatSignedComparisonDelta(value, key) {
    if (!Number.isFinite(value)) return '-';
    if (key && key !== 'finalMod' && formatComparisonValue(key, 1) === pct(1)) {
      return `${value > 0 ? '+' : ''}${pct(value)}`;
    }
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
            <span className="comparisonMetricPickerHint"><LabelWithHelp note={help('section.comparisonMetrics')}>对比指标</LabelWithHelp></span>
            {availableComparisonMetrics.map((metric) => (
              <label className="toggle" key={metric.key}>
                <input type="checkbox" checked={comparisonSettings.selectedMetrics.includes(metric.key)} onChange={() => toggleComparisonMetric(metric.key)} />
                <span>{metric.label}</span>
              </label>
            ))}
            <label className="toggle comparisonStandaloneMetric">
              <input
                type="checkbox"
                checked={comparisonSettings.selectedMetrics.includes('effectSubtotal')}
                onChange={() => toggleComparisonMetric('effectSubtotal')}
              />
              <span>装备特效伤害</span>
            </label>
            <label
              className="toggle"
              title="开启后，原地龙卷风/迷雾等持续区域特效按实战常见驻留跳数折算（如疾风 2/10 跳、邪恶之雾 2/6 跳、次元裂痕 2/5 跳）；取消勾选则按站桩满额跳数计算"
            >
              <input
                type="checkbox"
                checked={realisticEffectHits}
                onChange={(event) => setRealisticEffectHits(event.target.checked)}
              />
              <span>持续特效实战折算跳数</span>
            </label>
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
                {useVisualGearPicker ? (
                  <VisualGearBar
                    slots={SLOTS}
                    gear={scenario.gear}
                    equipment={equipment}
                    choicesBySlot={Object.fromEntries(SLOTS.map((slot) => [slot, comparisonChoicesForSlot(slot, scenario)]))}
                    mastery={selectedComparisonMasteryLevel || 20}
                    uiTheme={uiTheme}
                    compact
                    showLowerTierEquipment={showLowerTierEquipment}
                    onToggleLowerTier={setShowLowerTierEquipment}
                    onSelectGear={(slot, itemName) => updateComparisonScenarioGear(scenario.id, slot, itemName)}
                    uniqueEffectsForItem={uniqueEffectsForItem}
                    qualityColor={qualityColor}
                    PortalHovercard={PortalHovercard}
                    renderHoverContent={(item) => <EquipmentItemHoverContent item={item} mastery={selectedComparisonMasteryLevel || 20} uiTheme={uiTheme} />}
                  />
                ) : (
                  <div className="comparisonGearGrid">
                    {SLOTS.map((slot) => (
                      <label className="selectBlock" key={`${scenario.id}-${slot}`}>
                        <span>{slot}</span>
                        <select
                          className="qualitySelect"
                          value={scenario.gear[slot] || ''}
                          style={{ color: qualityColor(byName(equipment, scenario.gear[slot])?.quality, uiTheme) }}
                          onChange={(event) => updateComparisonScenarioGear(scenario.id, slot, event.target.value)}
                        >
                          <option value={EMPTY_GEAR_VALUE}>{EMPTY_GEAR_LABEL}</option>
                          {comparisonChoicesForSlot(slot, scenario).map((item) => (
                            <option value={item.name} key={`${slot}-${item.name}`} style={{ color: qualityColor(item.quality, uiTheme) }}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                )}
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
          <div className={`comparisonChartsGrid ${comparisonChartMetrics.length > 1 ? 'multiCharts' : 'singleChart'}`}>
            {comparisonChartMetrics.map((metric) => {
              const isCollapsed = collapsedComparisonCharts.includes(metric.key);
              const useWideCanvas = wideLayout && (comparisonChartMetrics.length === 1 || isCollapsed);
              return (
                <ComparisonChart
                  key={metric.key}
                  rows={comparisonRows}
                  metricKey={metric.key}
                  metricLabel={metric.label}
                  selectedMastery={selectedComparisonMasteryLevel}
                  onSelectMastery={setSelectedComparisonMastery}
                  collapsed={isCollapsed}
                  onToggleCollapsed={toggleComparisonChart}
                  formatValue={formatComparisonValue}
                  wideCanvas={useWideCanvas}
                />
              );
            })}
          </div>
          {comparisonDeltaRows.length ? (
            <div className={`comparisonDeltaBlock ${deltaPanelCollapsed ? 'collapsed' : ''}`}>
              <div className="comparisonDeltaHead">
                <div>
                  <strong>{deltaMetric?.label || '属性'}差值</strong>
                  <span>以 {comparisonDeltaRows[0].baselineName} 为基准 / 图表选中熟练 {selectedComparisonMasteryLevel}</span>
                </div>
                <div className="comparisonDeltaControls">
                  <label className="selectBlock">
                    <span>基准方案</span>
                    <select
                      value={deltaBaselineScenario?.id || ''}
                      onChange={(event) => updateComparisonSetting('deltaBaselineId', event.target.value)}
                    >
                      {comparisonScenarios.map((scenario) => (
                        <option value={scenario.id} key={`delta-baseline-${scenario.id}`}>{scenario.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="selectBlock">
                    <span>对比项</span>
                    <select
                      value={deltaMetric?.key || 'ap'}
                      onChange={(event) => updateComparisonSetting('deltaMetric', event.target.value)}
                    >
                      {deltaMetricOptions.map((metric) => (
                        <option value={metric.key} key={`delta-metric-${metric.key}`}>{metric.label}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="quietButton"
                    onClick={() => toggleComparisonChart(DELTA_PANEL_KEY)}
                    aria-expanded={!deltaPanelCollapsed}
                  >
                    {deltaPanelCollapsed ? '展开' : '折叠'}
                  </button>
                </div>
              </div>
              {deltaPanelCollapsed ? null : (
              <>
              <div className="comparisonDeltaSummary">
                {comparisonDeltaRows.map((row) => (
                  <div className="comparisonDeltaCard" key={`${row.scenarioId}-delta-card`}>
                    <span>{row.scenarioName}</span>
                    <strong>{formatSignedComparisonDelta(row.selectedDelta?.delta, deltaMetricKey)}</strong>
                    <small>
                      熟练 {selectedComparisonMasteryLevel} / {formatComparisonValue(deltaMetricKey, row.selectedDelta?.scenarioValue)} vs {formatComparisonValue(deltaMetricKey, row.selectedDelta?.baselineValue)}
                    </small>
                    <small>平均 {formatSignedComparisonDelta(row.averageDelta, deltaMetricKey)} / 最低 {formatSignedComparisonDelta(row.minDelta, deltaMetricKey)} / 最高 {formatSignedComparisonDelta(row.maxDelta, deltaMetricKey)}</small>
                  </div>
                ))}
              </div>
              <div className="comparisonDeltaTableWrap">
                <table className="comparisonDeltaTable">
                  <thead>
                    <tr>
                      <th>方案</th>
                      {comparisonMasteryLevels.map((level) => (
                        <th className={level === selectedComparisonMasteryLevel ? 'selectedDeltaColumn' : ''} key={`delta-level-${level}`}>熟练 {level}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonDeltaRows.map((row) => (
                      <tr key={`${row.scenarioId}-delta-row`}>
                        <td>{row.scenarioName}</td>
                        {row.levelDeltas.map((item) => (
                          <td
                            key={`${row.scenarioId}-delta-${item.level}`}
                            className={[
                              item.delta > 0 ? 'positiveDelta' : item.delta < 0 ? 'negativeDelta' : '',
                              item.level === selectedComparisonMasteryLevel ? 'selectedDeltaColumn' : ''
                            ].filter(Boolean).join(' ')}
                            title={`${row.scenarioName} ${formatComparisonValue(deltaMetricKey, item.scenarioValue)} / ${row.baselineName} ${formatComparisonValue(deltaMetricKey, item.baselineValue)}`}
                          >
                            {item.valid ? formatSignedComparisonDelta(item.delta, deltaMetricKey) : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
              )}
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
              <CharacterAvatar character={character} fallbackName={name} />
              <span>
                <strong>{name}</strong>
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
          <CharacterAvatar character={selectedCharacter} fallbackName={selectedHero} />
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
                ref={versionButtonRef}
                type="button"
                className={`versionButton ${editMode ? 'editable' : ''} ${editMode && showHeroDebugSettings ? 'debugActive' : ''}`.trim()}
                onClick={() => {
                  if (!editMode) return;
                  setShowGlobalSettings(true);
                  setShowHeroDebugSettings((current) => !current);
                }}
                title={editMode ? '点击切换「测试实验体」隐藏开关' : undefined}
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
              {GAME_VERSION.label ? (
                <span className="dataVersionTag" title={GAME_VERSION.note || ''}>
                  数据版本 {GAME_VERSION.label}
                </span>
              ) : null}
            </div>
          </div>
          <p className="intro">一个配装/伤害计算器，预览不同配装下的技能伤害、打在敌人身上的理论伤害。可以拉表对比不同配装的属性。</p>
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
              <div className="globalSettingsAnchor" ref={globalSettingsAnchorRef}>
                <button
                  type="button"
                  className={`quietButton ${showGlobalSettings ? 'active' : ''}`}
                  onClick={() => setShowGlobalSettings((current) => !current)}
                >
                  全局设置
                </button>
                {showGlobalSettings ? (
                  <div className="globalSettingsMenu" role="dialog" aria-label="全局设置">
                    <div className="modernPopoverHead">
                      <div className="modernPopoverTitle">
                        <strong>全局设置</strong>
                        <span>界面显示与调试</span>
                      </div>
                      <button
                        type="button"
                        className="modernPopoverClose"
                        onClick={() => setShowGlobalSettings(false)}
                        aria-label="关闭全局设置"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="modernSettingList">
                      <label className="modernSettingItem">
                        <input
                          type="checkbox"
                          checked={useHeroAvatarPicker}
                          onChange={(event) => setUseHeroAvatarPicker(event.target.checked)}
                        />
                        <span className="modernSettingText">
                          <strong>头像网格选人</strong>
                          <small>展开带搜索框的实验体头像列表</small>
                        </span>
                      </label>
                      <label className="modernSettingItem">
                        <input
                          type="checkbox"
                          checked={uiTheme === 'day'}
                          onChange={(event) => setUiTheme(event.target.checked ? 'day' : 'night')}
                        />
                        <span className="modernSettingText">
                          <strong>日间配色</strong>
                          <small>切换浅色高对比度护眼界面</small>
                        </span>
                      </label>
                      <label className="modernSettingItem">
                        <input
                          type="checkbox"
                          checked={!wideLayout}
                          onChange={(event) => setWideLayout(!event.target.checked)}
                        />
                        <span className="modernSettingText">
                          <strong>旧版界面</strong>
                          <small>切回早期居中单栏黑金布局</small>
                        </span>
                      </label>
                      <label className="modernSettingItem">
                        <input
                          type="checkbox"
                          checked={editMode}
                          onChange={(event) => setEditMode(event.target.checked)}
                        />
                        <span className="modernSettingText">
                          <strong>编辑模式</strong>
                          <small>{editMode ? '已开启：点一下顶栏版本号可展开测试实验体开关' : '开启本地技能表编辑与调试入口'}</small>
                        </span>
                      </label>
                      {editMode && showHeroDebugSettings ? (
                        <label className="modernSettingItem isDebugRow">
                          <input
                            type="checkbox"
                            checked={showDamageTestHeroes}
                            onChange={(event) => setShowDamageTestHeroes(event.target.checked)}
                          />
                          <span className="modernSettingText">
                            <strong>测试实验体（含新角色抢先试算）</strong>
                            <small>开放【弥莎】及未完全校对完毕的其他英雄</small>
                          </span>
                        </label>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                </div>
              <div className="announcementAnchor">
                <button
                  type="button"
                  className={`quietButton announcementButton ${announcementUnread ? 'hasUpdate' : ''}`}
                  onClick={() => setShowAnnouncement(true)}
                >
                  公告
                  {announcementUnread ? <span aria-label="公告有更新">!</span> : null}
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
          onClose={closeAnnouncement}
          onSave={saveAnnouncement}
          onCreate={startNewAnnouncement}
        />
      ) : null}

      {showGearOptimizer ? (
        <GearOptimizerDialog
          open={showGearOptimizer}
          onClose={() => setShowGearOptimizer(false)}
          heroName={selectedHero}
          mastery={mastery}
          uiTheme={uiTheme}
          slots={SLOTS}
          gear={gear}
          equipment={equipment}
          mode={optimizerMode}
          onChangeMode={setOptimizerMode}
          activeSlot={optimizerSlot}
          onChangeSlot={setOptimizerSlot}
          metricKey={effectiveOptimizerMetric}
          metricOptions={optimizerMetricOptions}
          onChangeMetric={setOptimizerMetric}
          tierScope={optimizerTierScope}
          onChangeTierScope={setOptimizerTierScope}
          includeProc={optimizerIncludeProc}
          onToggleIncludeProc={setOptimizerIncludeProc}
          autoMaxStacks={optimizerAutoMaxStacks}
          onToggleAutoMaxStacks={setOptimizerAutoMaxStacks}
          enableZoneEffects={optimizerEnableZoneEffects}
          onToggleEnableZoneEffects={setOptimizerEnableZoneEffects}
          realisticEffectHits={realisticEffectHits}
          onToggleRealisticEffectHits={setRealisticEffectHits}
          keepMinCd={optimizerKeepMinCd}
          onToggleKeepMinCd={setOptimizerKeepMinCd}
          allowCrossWeapon={optimizerAllowCrossWeapon}
          onToggleAllowCrossWeapon={setOptimizerAllowCrossWeapon}
          canCrossWeapon={(selectedCharacter?.weapons || []).length > 1}
          optimizerData={gearOptimizerData}
          onEquipCandidate={handleEquipFromOptimizer}
          qualityColor={qualityColor}
          uniqueEffectsForItem={uniqueEffectsForItem}
          PortalHovercard={PortalHovercard}
          renderHoverContent={(item) => <EquipmentItemHoverContent item={item} mastery={mastery} uiTheme={uiTheme} />}
        />
      ) : null}

      {activePage === 'compare' ? renderComparisonPage() : (
      <>
      <section className={`grid twoColumns buildTargetGrid ${useHeroAvatarPicker ? 'withAvatarRail' : ''}`.trim()}>
        {wideLayout && useHeroAvatarPicker ? renderHeroAvatarPicker('wideRailAvatarPicker') : null}
        <div className={`buildArea ${!wideLayout && useHeroAvatarPicker ? 'hasHeroAvatarRail' : ''}`}>
          {!wideLayout ? renderHeroAvatarPicker('floatingHeroAvatarPicker') : null}
          <div className="panel buildPanel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Build</p>
              <h2><LabelWithHelp note={help('section.gear')}>装备选择</LabelWithHelp></h2>
            </div>
            <div className="buttonRow">
              <button
                type="button"
                className="openOptimizerBtn"
                onClick={() => openGearOptimizer('upgrade')}
                title="一键计算全身金/红装升级优先级（陨石/秘银/血包给哪个部位提升最大）与各部位散件伤害排行"
              >
                ⚡ 换装收益排行
              </button>
              <button
                type="button"
                className={`quietButton shareBuildBtn ${shareCopied ? 'copied' : ''}`}
                onClick={copyShareUrl}
                title="将当前实验体、五件装备、潜能、目标设置与连招序列压缩为短链接复制到剪贴板"
              >
                {shareCopied ? '✓ 已复制分享链接' : '🔗 分享配装'}
              </button>
              <button
                type="button"
                className={`pinBaselineBtn ${activePin ? 'pinned' : ''}`}
                onClick={capturePinBaseline}
                title="把当前装备与面板伤害钉为基准，之后换装会实时用绿/红字标出每项伤害增减"
              >
                {activePin ? '📌 更新基准快照' : '📌 钉住当前作基准'}
              </button>
              {activePin ? (
                <>
                  <button type="button" className="quietButton" onClick={restorePinnedGear} title="一键穿回钉住时的基准装备与潜能">
                    还原基准装
                  </button>
                  <button type="button" className="quietButton" onClick={() => setPinnedBaseline(null)} title="清除基准快照">
                    清除基准
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className={`quietButton ${showBuildSettings ? 'active' : ''}`}
                onClick={() => setShowBuildSettings((current) => !current)}
              >
                设置
              </button>
            </div>
          </div>
          {sharedLoadedBanner ? (
            <div className="sharedLoadedBanner">
              <span>🔗 已从分享链接还原该套配装、潜能与连招序列</span>
              <button type="button" className="quietButton" onClick={() => setSharedLoadedBanner(false)}>知道了</button>
            </div>
          ) : null}
          <div className="heroPresetBar" aria-label="单角色配装预设标签">
            <span className="heroPresetLabel">预设方案</span>
            <div className="heroPresetList">
              {currentOfficialPreset ? (
                <button
                  type="button"
                  className={`heroPresetChip isOfficial ${loadoutFieldsEqual({ gear, traitSelection, tacticalSkill }, currentOfficialPreset) ? 'isActive' : ''}`.trim()}
                  onClick={restoreOfficialRoutePreset}
                  title={`还原默认推荐路线${currentOfficialPreset.gameVersion ? `（数据版本 ${currentOfficialPreset.gameVersion}）` : ''}`}
                >
                  <span>默认推荐</span>
                </button>
              ) : null}
              {heroCustomPresets.map((preset) => {
                const isMatched = loadoutFieldsEqual({ gear, traitSelection, tacticalSkill }, preset);
                return (
                  <div className={`heroPresetTagWrap ${isMatched ? 'isActive' : ''}`.trim()} key={preset.id}>
                    <button
                      type="button"
                      className="heroPresetChip"
                      onClick={() => applyCustomHeroPreset(preset)}
                      title={`点击切换至「${preset.name}」：${SLOTS.map((s) => preset.gear?.[s] || '空').join(' · ')}`}
                    >
                      <span>{preset.name}</span>
                    </button>
                    {!isMatched ? (
                      <button
                        type="button"
                        className="heroPresetMiniAct"
                        onClick={() => overwriteHeroPreset(preset.id)}
                        title={`用当前穿戴的装备与潜能覆盖更新「${preset.name}」`}
                        aria-label={`更新预设 ${preset.name}`}
                      >
                        ↻
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="heroPresetMiniAct isDelete"
                      onClick={() => deleteHeroPreset(preset.id)}
                      title={`删除预设「${preset.name}」`}
                      aria-label={`删除预设 ${preset.name}`}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              {isCreatingPreset ? (
                <div className="heroPresetCreateForm">
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(event) => setNewPresetName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') saveNewHeroPreset();
                      if (event.key === 'Escape') { setIsCreatingPreset(false); setNewPresetName(''); }
                    }}
                    placeholder="如：四红神装 / 半肉装"
                    maxLength={20}
                    autoFocus
                  />
                  <button type="button" className="heroPresetSaveBtn" onClick={saveNewHeroPreset}>保存</button>
                  <button type="button" className="quietButton" onClick={() => { setIsCreatingPreset(false); setNewPresetName(''); }}>取消</button>
                </div>
              ) : (
                <button
                  type="button"
                  className="heroPresetAddBtn"
                  onClick={startCreateHeroPreset}
                  title="将当前穿戴的装备、潜能、战术技能与连招保存为此实验体的快捷标签"
                >
                  + 存为预设
                </button>
              )}
            </div>
          </div>
          {activePin ? (
            <div className="pinnedBaselineBanner">
              <div className="pinnedBannerTopBar">
                <div className="pinnedBannerMain">
                  <strong>📌 基准快照对比中（Lv.{activePin.mastery}）</strong>
                  <span>基准配装：{activePin.gearSummary}</span>
                </div>
                <button
                  type="button"
                  className="quietButton pinnedToggleAllBtn"
                  onClick={() => setShowAllPinnedStats((v) => !v)}
                >
                  {showAllPinnedStats ? '只看变动项' : `展开全部 ${pinnedStatDiffRows.length} 项属性`}
                </button>
              </div>
              <div className="pinnedStatGrid">
                {(showAllPinnedStats
                  ? pinnedStatDiffRows
                  : (pinnedStatDiffRows.filter((r) => r.changed).length
                    ? pinnedStatDiffRows.filter((r) => r.changed)
                    : pinnedStatDiffRows.slice(0, 6))
                ).map((row) => (
                  <div className={`pinnedStatCell ${row.changed ? (row.diff > 0 ? 'isUp' : 'isDown') : ''}`.trim()} key={row.key}>
                    <span className="pinnedStatLabel">{row.label}</span>
                    <div className="pinnedStatNums">
                      <small className="pinnedOldVal">{row.baseText} →</small>
                      <strong>{row.curText}</strong>
                      <InlineDeltaBadge current={row.cur} baseline={row.base} digits={row.digits || 0} isPercent={Boolean(row.isPercent)} />
                    </div>
                  </div>
                ))}
              </div>
              {!showAllPinnedStats && pinnedStatDiffRows.every((r) => !r.changed) ? (
                <small className="pinnedUnchangedHint">当前配装与基准快照完全一致；更换上方任意装备/潜能/等级后将自动列出属性差值。</small>
              ) : null}
            </div>
          ) : null}
          {showBuildSettings ? (
            <div className="buildSettingsMenu">
              <div className="modernPopoverHead">
                <div className="modernPopoverTitle">
                  <strong>配装显示设置</strong>
                  <span>选装模式、品级过滤与底部装备卡片展示词条</span>
                </div>
                <button
                  type="button"
                  className="modernPopoverClose"
                  onClick={() => setShowBuildSettings(false)}
                  aria-label="收起配装显示设置"
                >
                  收起 ✕
                </button>
              </div>
              <div className="buildSettingsPrimaryRow">
                <label className="modernSettingItem isCompact">
                  <input
                    type="checkbox"
                    checked={useVisualGearPicker}
                    onChange={(event) => setUseVisualGearPicker(event.target.checked)}
                  />
                  <span className="modernSettingText">
                    <strong>使用可视化图标配装器</strong>
                    <small>支持高清图标、搜索与词条快筛</small>
                  </span>
                </label>
                <label className="modernSettingItem isCompact">
                  <input
                    type="checkbox"
                    checked={showLowerTierEquipment}
                    onChange={(event) => setShowLowerTierEquipment(event.target.checked)}
                  />
                  <span className="modernSettingText">
                    <strong>显示紫色以下品级装备</strong>
                    <small>包含白/绿/蓝过渡散件</small>
                  </span>
                </label>
              </div>
              <div className="buildSettingsMetaRow">
                <span className="buildSettingsSectionLabel">品级图例</span>
                <div className="qualityLegend" aria-label="装备品级颜色">
                  {QUALITY_OPTIONS.map((quality) => (
                    <span key={quality} style={{ color: qualityColor(quality, uiTheme) }}>{quality}</span>
                  ))}
                </div>
              </div>
              <div className="buildSettingsStatBlock">
                <span className="buildSettingsSectionLabel">装备卡片展示属性</span>
                <div className="statSettings">
                  {DISPLAYABLE_ITEM_STAT_DEFINITIONS.map((stat) => (
                    <label className="toggle" key={stat.key}>
                      <input type="checkbox" checked={visibleStatKeys.includes(stat.key)} onChange={() => toggleVisibleStat(stat.key)} />
                      <span>{displayItemStatLabel(stat)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          <div className="buildControlLayout">
            <div>
              {useVisualGearPicker ? (
                <>
                  <VisualGearBar
                    slots={SLOTS}
                    gear={gear}
                    equipment={equipment}
                    choicesBySlot={builderChoicesBySlot}
                    mastery={mastery}
                    uiTheme={uiTheme}
                    weaponTypeFilter={weaponTypeFilter}
                    heroWeaponOptions={heroWeaponOptions}
                    onChangeWeaponType={updateWeaponType}
                    showLowerTierEquipment={showLowerTierEquipment}
                    onToggleLowerTier={setShowLowerTierEquipment}
                    onSelectGear={updateGear}
                    onOpenOptimizer={openGearOptimizer}
                    uniqueEffectsForItem={uniqueEffectsForItem}
                    qualityColor={qualityColor}
                    PortalHovercard={PortalHovercard}
                    renderHoverContent={(item) => <EquipmentItemHoverContent item={item} mastery={mastery} uiTheme={uiTheme} />}
                  />
                  <div className="gearGrid vgAuxControlGrid">
                    <label className="selectBlock">
                      <LabelWithHelp note={help('select.weaponType')}>武器路线类型</LabelWithHelp>
                      <select value={weaponTypeFilter} onChange={(event) => updateWeaponType(event.target.value)}>
                        <option value="全部类型">全部类型</option>
                        {heroWeaponOptions.filter((type) => type !== '全部类型').map((type) => <option value={type} key={type}>{type}</option>)}
                      </select>
                    </label>
                    <label className="selectBlock">
                      <LabelWithHelp note={help('select.tacticalSkill')}>战术技能选择</LabelWithHelp>
                      <select value={tacticalSkill} onChange={(event) => setTacticalSkill(event.target.value)}>
                        {TACTICAL_SKILL_OPTIONS.map((name) => <option value={name} key={name}>{name}</option>)}
                      </select>
                    </label>
                    <Field label="熟练度等级" value={mastery} onChange={setMastery} min={1} max={20} note={help('field.mastery')} />
                    <Field label="手动潜能法强" value={talentAp} onChange={setTalentAp} note={help('field.talentAp')} />
                  </div>
                </>
              ) : (
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
                        <option value={EMPTY_GEAR_VALUE}>{EMPTY_GEAR_LABEL}</option>
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
              )}
              {!useVisualGearPicker ? (
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
              ) : null}
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
              <label
                className={`toggle${item.situational ? ' situationalToggle' : ''}`}
                key={item.name}
                title={effectToggleHint(item.name)}
              >
                <input
                  type="checkbox"
                  checked={Boolean(effectToggles[item.name])}
                  onChange={(event) => setEffectToggles((current) => ({ ...current, [item.name]: event.target.checked }))}
                />
                <span>{item.label}</span>
              </label>
            ))}
            {hasEquippedRealisticHitEffects ? (
              <label
                className="toggle realisticHitsToggle"
                title="开启后，原地龙卷风/迷雾等持续区域特效按实战常见驻留跳数折算（如疾风 2/10 跳、邪恶之雾 2/6 跳、次元裂痕 2/5 跳）；取消勾选则按木桩站满全程跳数计算"
              >
                <input
                  type="checkbox"
                  checked={realisticEffectHits}
                  onChange={(event) => setRealisticEffectHits(event.target.checked)}
                />
                <span>持续特效实战折算跳数</span>
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
            <div className="field selfHpField">
              <div className="selfHpHeadRow">
                <LabelWithHelp note={help('field.selfHp')}>自身血量</LabelWithHelp>
                <button
                  type="button"
                  className={`selfHpSyncBtn ${autoSyncSelfHp ? 'active' : ''}`}
                  onClick={() => {
                    const next = !autoSyncSelfHp;
                    setAutoSyncSelfHp(next);
                    if (next && result.characterMaxHp > 0) {
                      setSelfHp(Math.round(result.characterMaxHp));
                    }
                  }}
                  title={autoSyncSelfHp
                    ? '当前自动跟随配装与等级血量上限；点击切换为手动固定血量'
                    : `当前为手动固定血量；点击恢复跟随配装血量上限（${Math.round(result.characterMaxHp)}）`}
                >
                  {autoSyncSelfHp ? '🔗 跟随上限' : '✎ 手动固定'}
                </button>
              </div>
              <div className="fieldInput">
                <input
                  type="number"
                  value={autoSyncSelfHp ? Math.round(result.characterMaxHp) : selfHp}
                  onChange={(event) => {
                    setAutoSyncSelfHp(false);
                    setSelfHp(getNumber(event.target.value));
                  }}
                  aria-label="自身血量"
                />
                {autoSyncSelfHp ? <b>自动</b> : null}
              </div>
            </div>
            <Field label="手动伤害提升百分比" value={damageBonus} onChange={setDamageBonus} suffix="小数" step={0.01} note={help('field.damageBonus')} />
            <Field label="手动技能伤害减免" value={skillReduction} onChange={setSkillReduction} suffix="小数" step={0.01} note={help('field.skillReduction')} />
          </div>
          <div className="finalDamageModBlock">
            <span>最终伤害修正值</span>
            <strong>
              {round(result.finalMod, 3)}
              {activePin ? <InlineDeltaBadge current={result.finalMod} baseline={activePin.finalMod} digits={3} /> : null}
            </strong>
          </div>
        </div>

        {/* 宽屏模式第 3 列：核心面板与对抗倍率看板（紧凑双列仪表盘） */}
        {wideLayout ? (
          <div className="panel wideKeyStatsColumn">
            <div className="panelHead">
              <div>
                <h2>核心数据概览</h2>
              </div>
              <span className="pill">Lv.{mastery} · {weaponTypeOfficialName(selectedWeaponRaw)}</span>
            </div>
            <div className="wideKeyStatsGrid">
              <StatCard label="最终法强" value={result.ap} hint={`${round(result.totalBaseAp, 1)}${result.convertedAp ? `（含转化 +${round(result.convertedAp, 1)}）` : ''} × (1 + ${pct(result.totalApPct)})`} note={help('stat.equipAp')} />
              <StatCard label="最终攻击力" value={round(finalAttack, 1)} hint={attackBreakdownHint} note={help('stat.finalAttack')} />
              <StatCard
                label={result.basicAttackDamage.cannotCrit ? '每发平A（集中转化）' : '每发平A / 暴击'}
                value={result.basicAttackDamage.cannotCrit ? `${result.basicAttackDamage.normal}` : `${result.basicAttackDamage.normal} / ${result.basicAttackDamage.critical}`}
                hint={`${result.basicAttackDamage.cannotCrit ? `暴击转化 ${pct(result.basicAttackDamage.criticalMultiplier)}${result.passiveTargetDefenseShred ? ` · 减防 ${pct(result.passiveTargetDefenseShred)}` : ''}` : `暴击 ${pct(result.critChance)}`} · 攻速 ${round(result.finalAttackSpeed, 2)}/s${result.attackSpeedFixed ? ' (固定)' : (result.uncappedAttackSpeed > result.attackSpeedCap ? ' (满上限)' : '')} (+${pct(result.totalBonusAttackSpeed)})`}
              />
              <StatCard label="血量 / 防御 / 冷却" value={`${round(result.characterMaxHp, 0)} / ${round(result.selfDefense, 0)} / ${result.cd}%`} hint={`防穿 ${result.pen} | ${pct(result.penPct)}`} note={help('stat.pen')} />
              <StatCard label="目标最终防御" value={round(result.finalDefense, 1)} hint={`防御修正 ${pct(result.defenseMod)}`} note={help('stat.finalDefense')} />
              <StatCard label="自身伤害提升" value={pct(result.totalDamageBonus)} hint={`装备 ${pct(result.equipDamageBonus)} / 潜能 ${pct(result.talentDamageBonus)} / 手动 ${pct(damageBonus)}`} note={help('stat.damageBonus')} />
              <StatCard label="目标技能/平A减伤" value={`${pct(result.totalSkillReduction)} / ${pct(result.basicAttackTargetReductionRatio)}`} hint={`目标 Lv.${result.targetMasteryLevel} 熟练减伤`} note={help('field.targetMastery')} />
              <StatCard label="增减伤合算" value={pct(result.damageMod - 1)} hint={`最终伤害倍率 ${round(result.finalMod, 3)}`} note={help('stat.damageMod')} />
              {showBasicAttackAmp ? (
                <StatCard
                  label="普攻增幅"
                  value={pct(result.basicAttackAmp)}
                  hint={`熟练 ${pct(result.masteryBasicAttackDamageRatio)} / 装备特效 ${pct(result.basicAttackAmp - result.masteryBasicAttackDamageRatio)}`}
                  note={help('stat.basicAttackAmp')}
                />
              ) : null}
              {hasBurstTrait ? (
                <StatCard label="爆发力血量差" value={pct(result.hpDiffRatio)} hint={`追伤 +${pct(result.burstBonus)}`} note={help('stat.hpDiffRatio')} />
              ) : null}
            </div>
          </div>
        ) : null}

        <details className="currentStatsBlock buildTargetStatsBlock collapsibleStats">
          <summary className="panelSubhead">
            <strong>当前角色更多属性明细</strong>
            <span>{visibleEquipmentStats.length + 7} 项显示</span>
          </summary>
          <div className="attributePanel">
            <div>
              <span>当前法强</span>
              <strong>{result.ap}</strong>
              <small>装备 {result.equipAp} + 手动 {talentAp} + 潜能 {result.talentBonusAp} + 叠层 {result.stackAp}{result.convertedAp ? ` + 转化 ${round(result.convertedAp, 1)}` : ''}，加成 {pct(result.totalApPct)}</small>
            </div>
            <div>
              <span>攻击力</span>
              <strong>{round(finalAttack, 1)}</strong>
              <small>{attackBreakdownHint}</small>
            </div>
            <div>
              <span>面板攻速</span>
              <strong>{round(result.finalAttackSpeed, 2)}/s</strong>
              <small>基础 {round(result.baseAttackSpeed, 3)} × (1 + {pct(result.totalBonusAttackSpeed)}){result.attackSpeedFixed ? ' · 被动固定攻速' : ` · 上限 ${result.attackSpeedCap}/s`}</small>
            </div>
            <div>
              <span>血量上限</span>
              <strong>{round(result.characterMaxHp, 1)}</strong>
              <small>等级成长 {round(result.baseMaxHp, 1)} + 装备与潜能 {round(result.extraHp, 1)}</small>
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

      {/* 窄版居中模式保留原版横向 stats 卡片带，不破坏老习惯 */}
      {!wideLayout ? (
        <section className="stats">
          <StatCard label="自身最终法强" value={result.ap} hint={`${round(result.totalBaseAp, 1)}${result.convertedAp ? `（含转化 +${round(result.convertedAp, 1)}）` : ''} × (1 + ${pct(result.totalApPct)})`} note={help('stat.equipAp')} />
          <StatCard label="自身最终攻击力" value={round(finalAttack, 1)} hint={attackBreakdownHint} note={help('stat.finalAttack')} />
          <StatCard
            label="每发平A / 面板攻速"
            value={`${result.basicAttackDamage.normal} / ${round(result.finalAttackSpeed, 2)}/s`}
            hint={`暴击 ${result.basicAttackDamage.critical} (${pct(result.critChance)}) · 额外攻速 +${pct(result.totalBonusAttackSpeed)}${result.attackSpeedFixed ? ' · 攻速固定' : ''}`}
          />
          <StatCard label="对目标：目标最终防御" value={round(result.finalDefense, 1)} hint={`防御修正 ${pct(result.defenseMod)}`} note={help('stat.finalDefense')} />
          <StatCard label="防御穿透" value={`${result.pen} / ${pct(result.penPct)}`} hint="数值 / 百分比" note={help('stat.pen')} />
          <StatCard label="自身伤害提升" value={pct(result.totalDamageBonus)} hint={`装备 ${pct(result.equipDamageBonus)} / 潜能 ${pct(result.talentDamageBonus)} / 手动 ${pct(damageBonus)}`} note={help('stat.damageBonus')} />
          <StatCard label="目标身上的技能减伤" value={pct(result.totalSkillReduction)} hint={`目标熟练 ${pct(result.targetMasterySkillReduction)} / 手动 ${pct(skillReduction)}，平A熟练减伤 ${pct(result.targetMasteryBasicReduction)}`} note={help('field.targetMastery')} />
          <StatCard label="增减伤合算" value={pct(result.damageMod - 1)} hint={`最终倍率 ${round(result.damageMod, 3)}`} note={help('stat.damageMod')} />
          {showBasicAttackAmp ? (
            <StatCard
              label="普攻增幅"
              value={pct(result.basicAttackAmp)}
              hint={`熟练度 ${pct(result.masteryBasicAttackDamageRatio)} / 装备与特效 ${pct(result.basicAttackAmp - result.masteryBasicAttackDamageRatio)}`
                + (result.basicAttackFlatBonus ? `，普攻额外伤害 +${round(result.basicAttackFlatBonus, 1)}` : '')}
              note={help('stat.basicAttackAmp')}
            />
          ) : null}
          {hasBurstTrait ? (
            <StatCard label="血量差比" value={pct(result.hpDiffRatio)} hint={`爆发力追伤 ${pct(result.burstBonus)}`} note={help('stat.hpDiffRatio')} />
          ) : null}
        </section>
      ) : null}

      <section className={`panel talentPanel ${traitsCollapsed ? 'isCollapsed' : ''}`.trim()}>
        <div className="panelHead">
          <div>
            <p className="eyebrow">Potential</p>
            <h2><LabelWithHelp note={help('section.traits')}>潜能选择</LabelWithHelp></h2>
          </div>
          <div className="buttonRow">
            {selectedTraits.length > 0 || !traitsCollapsed ? (
              <button type="button" className="quietButton" onClick={clearTraitSelection}>
                清空潜能
              </button>
            ) : null}
            <span className="pill">{selectedTraits.length} / 5 已选</span>
            <button
              type="button"
              className={`quietButton traitCollapseBtn ${traitsCollapsed ? '' : 'active'}`}
              onClick={() => setTraitsCollapsed((v) => !v)}
              aria-expanded={!traitsCollapsed}
            >
              {traitsCollapsed ? '▾ 展开更换潜能' : '▴ 收起为图标条'}
            </button>
          </div>
        </div>
        {traitsCollapsed ? (
          <div className="traitCompactBar">
            <div className="traitCompactCluster">
              <span className="traitCompactGroupBadge" title={primaryGroup?.tooltip || primaryGroup?.name}>
                {primaryGroup?.image ? (
                  <img src={loadoutImageSrc(primaryGroup.image)} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : null}
                <b>主系·{primaryGroup?.name || '未选'}</b>
              </span>
              <div className="traitCompactSlots">
                {traitSelectionSlots.slice(0, 3).map((slot, idx) => {
                  const picked = TRAIT_BY_ID[traitSelection[slot.key]];
                  const shortSlot = idx === 0 ? '核心' : `主${idx}`;
                  const pillNode = (
                    <button
                      type="button"
                      className={`traitCompactPill ${picked ? 'picked' : 'empty'} ${idx === 0 ? 'isCore' : ''}`.trim()}
                      onClick={() => setTraitsCollapsed(false)}
                      title={picked ? `${slot.title}：${picked.name}（点击展开更换）` : `点击展开选择${slot.title}`}
                    >
                      {picked?.image ? (
                        <img className="traitCompactIcon" src={loadoutImageSrc(picked.image)} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        <span className="traitCompactEmptyDot">+</span>
                      )}
                      <span>{picked ? picked.name : shortSlot}</span>
                    </button>
                  );
                  return picked ? (
                    <PortalHovercard
                      key={slot.key}
                      className="traitCompactHover"
                      content={(
                        <span className="skillDescriptionContent">
                          <strong>{slot.title} · {picked.name}</strong>
                          <span>{stripMarkup(picked.tooltip) || '暂无说明'}</span>
                        </span>
                      )}
                    >
                      {pillNode}
                    </PortalHovercard>
                  ) : <React.Fragment key={slot.key}>{pillNode}</React.Fragment>;
                })}
              </div>
            </div>
            <span className="traitCompactDivider" aria-hidden="true" />
            <div className="traitCompactCluster">
              <span className="traitCompactGroupBadge" title={secondaryGroup?.tooltip || secondaryGroup?.name}>
                {secondaryGroup?.image ? (
                  <img src={loadoutImageSrc(secondaryGroup.image)} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : null}
                <b>副系·{secondaryGroup?.name || '未选'}</b>
              </span>
              <div className="traitCompactSlots">
                {traitSelectionSlots.slice(3).map((slot, idx) => {
                  const picked = TRAIT_BY_ID[traitSelection[slot.key]];
                  const shortSlot = `副${idx + 1}`;
                  const pillNode = (
                    <button
                      type="button"
                      className={`traitCompactPill ${picked ? 'picked' : 'empty'}`.trim()}
                      onClick={() => setTraitsCollapsed(false)}
                      title={picked ? `${slot.title}：${picked.name}（点击展开更换）` : `点击展开选择${slot.title}`}
                    >
                      {picked?.image ? (
                        <img className="traitCompactIcon" src={loadoutImageSrc(picked.image)} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        <span className="traitCompactEmptyDot">+</span>
                      )}
                      <span>{picked ? picked.name : shortSlot}</span>
                    </button>
                  );
                  return picked ? (
                    <PortalHovercard
                      key={slot.key}
                      className="traitCompactHover"
                      content={(
                        <span className="skillDescriptionContent">
                          <strong>{slot.title} · {picked.name}</strong>
                          <span>{stripMarkup(picked.tooltip) || '暂无说明'}</span>
                        </span>
                      )}
                    >
                      {pillNode}
                    </PortalHovercard>
                  ) : <React.Fragment key={slot.key}>{pillNode}</React.Fragment>;
                })}
              </div>
            </div>
            <div
              className="traitCompactSummary"
              title={result.traitBonuses.summaries.length ? result.traitBonuses.summaries.join('；') : ''}
            >
              <span>潜能加成</span>
              <strong>
                {traitSummaryItems.length
                  ? traitSummaryItems.join(' / ')
                  : (selectedTraits.length ? '触发伤害已计入下方特效栏' : '未选数值类潜能')}
              </strong>
            </div>
          </div>
        ) : (
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
        )}
      </section>

      <section className="damageLayout">
        <details className="panel damagePanel skillDamagePanel" open>
          <summary className="effectToggle">
            <div>
              <p className="eyebrow">Skills</p>
              <h2>{selectedHero} 技能伤害</h2>
            </div>
            {stackSelector ? (
              <div className="stackSelector" onClick={(event) => event.preventDefault()}>
                <div className="stackSelectorHead">
                  <span>{stackSelector.label || '叠层'}</span>
                  {help('field.stackSelector')}
                </div>
                {stackSelector.mode === 'slider' ? (
                  <div className="stackSlider">
                    <input
                      type="range"
                      min={0}
                      max={stackSelector.max}
                      step={1}
                      value={Math.min(stackSelector.max, Math.max(0, r2Stacks))}
                      onChange={(event) => setR2Stacks(Number(event.target.value))}
                      aria-label={stackSelector.label || '叠层'}
                    />
                    <input
                      type="number"
                      min={0}
                      max={stackSelector.max}
                      value={r2Stacks}
                      onChange={(event) => setR2Stacks(Math.min(stackSelector.max, Math.max(0, getNumber(event.target.value))))}
                      aria-label={`${stackSelector.label || '叠层'}（手动输入）`}
                    />
                    <small>/ {stackSelector.max}</small>
                  </div>
                ) : (
                  <div className="stackBlocks">
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
                )}
              </div>
            ) : null}
            {/* 自身当前体力：和叠层选择器同一排，只在该英雄的公式真的用到时出现 */}
            {usesSelfHp ? (
              <div className="stackSelector" onClick={(event) => event.preventDefault()}>
                <div className="stackSelectorHead">
                  <span>自身当前体力</span>
                  {help('field.selfHpPct')}
                </div>
                <div className="stackSlider">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={selfHpPct}
                    onChange={(event) => setSelfHpPct(Number(event.target.value))}
                    aria-label="自身当前体力"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={selfHpPct}
                    onChange={(event) => setSelfHpPct(Math.max(0, Math.min(100, getNumber(event.target.value))))}
                    aria-label="自身当前体力（手动输入）"
                  />
                  <small>%</small>
                </div>
              </div>
            ) : null}
            {/* 形态开关：玛蒂娜攒够叠层后永久进入报道中，两套技能整体切换而不是同时列出 */}
            {heroFormRule ? (
              <div className="stackSelector heroFormSwitch" onClick={(event) => event.preventDefault()}>
                <div className="stackSelectorHead">
                  <span>{heroFormRule.label}</span>
                  {heroFormRule.note ? <HelpNote note={heroFormRule.note} /> : null}
                </div>
                <div className="heroFormButtons">
                  {(heroFormRule.options || []).map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      className={option.value === activeHeroForm ? 'active' : ''}
                      onClick={() => setHeroFormChoices((current) => ({ ...current, [selectedHero]: option.value }))}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {/* 英雄专属的条件修正（卡洛琳 W 镜子增幅、秀雅 Q 冲撞点） */}
            {heroModifiers.map((modifier) => {
              const options = modifier.options || [];
              const currentValue = heroModifierChoices[`${selectedHero}:${modifier.id}`] ?? modifier.default ?? 0;
              // 「在 / 不在某状态」只有两个选项时用拨动开关：默认那项是关，另一项是开
              const offOption = options.find((option) => option.value === (modifier.default ?? options[0]?.value)) || options[0];
              const onOption = options.find((option) => option !== offOption);
              const asSwitch = options.length === 2 && offOption && onOption;
              return (
              <div className="stackSelector" key={modifier.id} onClick={(event) => event.preventDefault()}>
                <div className="stackSelectorHead">
                  <span>{modifier.label}</span>
                  {modifier.note ? <HelpNote note={modifier.note} /> : null}
                </div>
                {asSwitch ? (
                  <ToggleSwitch
                    checked={currentValue === onOption.value}
                    label={currentValue === onOption.value ? onOption.label : offOption.label}
                    title={`${offOption.label} / ${onOption.label}`}
                    onChange={(next) => setHeroModifierChoices((current) => ({
                      ...current,
                      [`${selectedHero}:${modifier.id}`]: next ? onOption.value : offOption.value
                    }))}
                  />
                ) : (
                <select
                  className="heroModifierSelect"
                  value={currentValue}
                  onChange={(event) => setHeroModifierChoices((current) => ({
                    ...current,
                    [`${selectedHero}:${modifier.id}`]: Number(event.target.value)
                  }))}
                >
                  {options.map((option) => (
                    <option value={option.value} key={option.value}>{option.label}</option>
                  ))}
                </select>
                )}
              </div>
              );
            })}
          </summary>
          {/* 这几项只有当前英雄的技能或身上装备的特效真的用到时才出现，平时不占地方 */}
          {contextFieldsInUse.length ? (
            <div className="skillContextFields">
              {contextFieldsInUse.includes('targetCurrentHp') || contextFieldsInUse.includes('targetLostHp') ? (
                <>
                  <HpRatioSlider
                    label="目标当前体力"
                    value={targetHpPct}
                    onChange={(value) => setTargetHpPct(Math.max(0, Math.min(100, value)))}
                    note={help('field.targetCurrentHp')}
                  />
                  <HpRatioSlider
                    label="目标已失体力"
                    value={round(100 - getNumber(targetHpPct), 1)}
                    onChange={(value) => setTargetHpPct(Math.max(0, Math.min(100, 100 - value)))}
                    note={help('field.targetLostHp')}
                  />
                </>
              ) : null}
              {contextFieldsInUse.includes('shield') ? (
                <Field label="自身护盾" value={selfShield} onChange={setSelfShield} note={help('field.selfShield')} />
              ) : null}
              {contextFieldsInUse.includes('accumulatedDamage') ? (
                <Field
                  label="累计伤害"
                  value={accumulatedDamage}
                  onChange={(value) => setAccumulatedDamage(Math.max(0, value))}
                  note={help('field.accumulatedDamage')}
                />
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
          {renderWeaponSkillRow()}
        </details>

        <div className="damageSideStack">
          <section className="panel comboSandboxPanel">
            <div className="panelHead comboSandboxHead">
              <div>
                <p className="eyebrow">Burst &amp; Lethal</p>
                <h2>连招计算与斩杀线</h2>
              </div>
              <div className="buttonRow">
                {resolvedQuickCombo.items.length ? (
                  <button type="button" className="quietButton" onClick={() => setQuickComboItems([])}>
                    清空连招
                  </button>
                ) : null}
              </div>
            </div>

            {/* 快捷追加平A / 强化普攻按钮条 */}
            <div className="comboQuickTriggers">
              <button
                type="button"
                onClick={() => appendQuickComboStep({ key: 'ba:normal', kind: 'ba-normal', label: '平A(普)' })}
              >
                + 平A ({result.basicAttackDamage.normal})
              </button>
              <button
                type="button"
                onClick={() => appendQuickComboStep({ key: 'ba:crit', kind: 'ba-crit', label: '平A(暴击)' })}
              >
                + 暴击A ({result.basicAttackDamage.critical})
              </button>
              {result.basicAttackSkills.length > 0 ? (
                <button
                  type="button"
                  onClick={() => appendQuickComboStep({ key: 'ba:enhanced', kind: 'ba-enhanced', label: '强化普攻(全)' })}
                >
                  + 强化A ({result.basicAttackDamage.normal + result.basicAttackBonus})
                </button>
              ) : null}
            </div>

            {/* 目标动态斩杀线血条 */}
            <div className={`lethalHpBox ${resolvedQuickCombo.isLethal ? 'lethal' : ''}`}>
              <div className="lethalHpHeader">
                <span className="lethalTargetName">
                  靶子：{target.name}（起始 {resolvedQuickCombo.startHp} / {resolvedQuickCombo.targetMax} HP）
                </span>
                {resolvedQuickCombo.isLethal ? (
                  <strong className="lethalKillBadge">💀 已达斩杀线（溢出 {resolvedQuickCombo.overkill}）</strong>
                ) : (
                  <strong className="lethalRemainText">
                    剩余 {resolvedQuickCombo.remainHp} HP（打掉 {round(resolvedQuickCombo.dealtPctOfMax, 1)}%）
                  </strong>
                )}
              </div>
              <div className="lethalHpTrack" role="progressbar" aria-valuenow={resolvedQuickCombo.remainHp}>
                <div className="lethalHpRemainFill" style={{ width: `${resolvedQuickCombo.remainPctOfMax}%` }} />
                <div
                  className="lethalHpDealtFill"
                  style={{
                    left: `${resolvedQuickCombo.remainPctOfMax}%`,
                    width: `${Math.min(100 - resolvedQuickCombo.remainPctOfMax, resolvedQuickCombo.dealtPctOfMax)}%`
                  }}
                />
              </div>
              <div className="lethalTotalRow">
                <span>连招折后总伤（原始 {resolvedQuickCombo.totalRaw}）</span>
                <div className="lethalTotalNum">
                  <b>{resolvedQuickCombo.totalDamage}</b>
                  {resolvedQuickCombo.baseTotalDamage !== undefined ? (
                    <InlineDeltaBadge current={resolvedQuickCombo.totalDamage} baseline={resolvedQuickCombo.baseTotalDamage} />
                  ) : null}
                </div>
              </div>
            </div>

            {/* 已选连招动作筹码列表 */}
            {resolvedQuickCombo.items.length ? (
              <div className="comboSequenceList">
                {resolvedQuickCombo.items.map((step) => (
                  <div className="comboStepRow" key={step.key}>
                    <div className="comboStepInfo">
                      <strong>{step.label}</strong>
                      <small>单次 {step.unitFinal}</small>
                    </div>
                    <div className="comboStepActions">
                      <div className="targetStepper">
                        <button type="button" onClick={() => updateQuickComboStepCount(step.key, -1)}>-</button>
                        <b>×{step.count}</b>
                        <button type="button" onClick={() => updateQuickComboStepCount(step.key, 1)}>+</button>
                      </div>
                      <strong className="comboStepSubtotal">{step.totalFinal}</strong>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="comboEmptyHint">
                点击任意技能卡或下方特效卡上的 <b>+连招</b> 按钮，或点上方 <b>+平A</b> 自由拼装连招看斩杀线。
              </p>
            )}
          </section>

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
            {hasEquippedRealisticHitEffects ? (
              <div className="effectsSubToolbar">
                <label
                  className="toggle realisticHitsToggle"
                  title="开启后，原地龙卷风/迷雾等持续区域特效按实战常见驻留跳数折算（如疾风 2/10 跳、邪恶之雾 2/6 跳、次元裂痕 2/5 跳）；取消勾选则按木桩站满全程跳数计算"
                >
                  <input
                    type="checkbox"
                    checked={realisticEffectHits}
                    onChange={(event) => setRealisticEffectHits(event.target.checked)}
                  />
                  <span>持续特效实战折算跳数（疾风/邪雾/次元裂痕）</span>
                </label>
              </div>
            ) : null}
            {result.effects.length ? result.effects.map((effect) => (
              <div className="damageRow compactDamageRow" key={effect.id || effect.title}>
                <div>
                  <strong>{effect.title}</strong>
                  <span>{effect.note}</span>
                </div>
                <DamageValue
                  raw={effect.raw}
                  final={effect.value}
                  baselineFinal={activePin?.effectMap?.[effect.id || effect.title] ?? activePin?.effectMap?.[effect.title]}
                  onQuickCombo={!effect.excludeFromSubtotal ? () => appendQuickComboStep({
                    key: `effect:${effect.id || effect.title}`,
                    kind: 'effect',
                    refId: effect.id || effect.title,
                    label: effect.title
                  }) : undefined}
                />
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
              <DamageValue
                raw={result.effectSubtotalRaw}
                final={result.effectSubtotal}
                baselineFinal={activePin?.effectSubtotal}
              />
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
        </div>
      </section>

      {hasSupportPanel || hasBasicAttackPanel ? (
      <div className={`supportBasicRow${hasSupportPanel && hasBasicAttackPanel ? ' twoUp' : ''}`}>
      {hasSupportPanel ? (
      <section className="panel damagePanel">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Support</p>
            <h2>预计恢复与护盾</h2>
          </div>
          {result.healShieldAmp ? <span className="pill">恢复与护盾效果 +{pct(result.healShieldAmp)}</span> : null}
        </div>
        <p className="note">
          恢复量与护盾量都不吃防御和减伤，这里按当前面板属性算出各技能的给予量。
        </p>
        <div className="damageRowList">
          {result.supportSkills.map((skill) => {
            const level = skill.level || skillLevels[skill.id] || 1;
            return (
              <div className="damageRow compactDamageRow" key={`support-${skill.id}`}>
                <div>
                  <strong>{skill.title}<span className="nonDamageBadge">{skill.kind === 'heal' ? '治疗' : '护盾'}</span></strong>
                  <span>{skillFormulaDescription(skill, level).split('\n')[0]}{skill.coefficientText ? ` ｜ ${skill.coefficientText}` : ''}</span>
                </div>
                <DamageValue raw={skill.rawDamage} final={skill.rawDamage} />
              </div>
            );
          })}
          {result.healTotal ? (
            <div className="damageRow compactDamageRow highlight">
              <div>
                <strong>恢复量合计</strong>
                <span>全部治疗类技能相加</span>
              </div>
              <DamageValue raw={result.healTotal} final={result.healTotal} />
            </div>
          ) : null}
          {result.shieldTotal ? (
            <div className="damageRow compactDamageRow highlight">
              <div>
                <strong>护盾量合计</strong>
                <span>全部护盾类技能相加</span>
              </div>
              <DamageValue raw={result.shieldTotal} final={result.shieldTotal} />
            </div>
          ) : null}
        </div>
      </section>
      ) : null}

      {hasBasicAttackPanel ? (
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
      </div>
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
              <StatCard label="最终攻击" value={round(finalAttack, 1)} hint={attackBreakdownHint} note={help('stat.finalAttack')} />
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
