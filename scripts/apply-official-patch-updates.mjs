// 官方补丁数据应用脚本（11.3 ~ 12.0）
//
// 数据来源：Eternal Return 官方补丁说明
//   11.3 https://playeternalreturn.com/posts/news/3606 (2026-05-28)
//   11.4 https://playeternalreturn.com/posts/news/3629 (2026-06-11)
//   11.5 https://playeternalreturn.com/posts/news/3657 (2026-06-25)
//   11.6 https://playeternalreturn.com/posts/news/3690 (2026-07-09)
//   11.7 https://playeternalreturn.com/posts/news/3713 (2026-07-23)
//   12.0 https://playeternalreturn.com/posts/news/3742 (2026-08-06)
//
// 变更按补丁顺序（旧 -> 新）应用，同一条数据被多个补丁改动时以最新补丁为准。
// 写入目标：
//   src/data/localConfig.json              技能镜像（运行时优先级最高）+ 装备镜像
//   src/data/externalSkillDamageFallback.json  外部兜底技能表
//   src/data/skillDamageAugments.json      技能补充表
//   src/data/erSkillDamageTable.json       结构化技能伤害表
//   src/data/erGameData.json               官方导出：技能 / 装备 / 实验体基础属性
//   src/data/masteryStats.json             武器熟练度成长
//   src/data/dakLoadoutAssets.json         潜能（增幅）数据
//
// 报告输出：docs/official-patch-updates/apply-report.json

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(rootDir, 'src', 'data');
const reportDir = path.join(rootDir, 'docs', 'official-patch-updates');

const PATCHES = {
  '11.3': { date: '2026-05-28', at: '2026-05-28T02:00:00.000Z', id: 3606, title: 'PATCH NOTES 11.3 - MAY 28TH, 2026' },
  '11.4': { date: '2026-06-11', at: '2026-06-11T02:00:00.000Z', id: 3629, title: 'PATCH NOTES 11.4 - JUNE 11TH, 2026' },
  '11.5': { date: '2026-06-25', at: '2026-06-25T02:00:00.000Z', id: 3657, title: 'PATCH NOTES 11.5 - JUNE 25TH, 2026' },
  '11.6': { date: '2026-07-09', at: '2026-07-09T02:00:00.000Z', id: 3690, title: 'PATCH NOTES 11.6 - JULY 9TH, 2026' },
  '11.7': { date: '2026-07-23', at: '2026-07-23T02:00:00.000Z', id: 3713, title: 'PATCH NOTES 11.7 - JULY 23RD, 2026' },
  '12.0': { date: '2026-08-06', at: '2026-08-06T02:00:00.000Z', id: 3742, title: 'PATCH NOTES 12.0 - AUGUST 6TH, 2026' }
};

function patchUrl(patch) {
  return `https://playeternalreturn.com/posts/news/${PATCHES[patch].id}?hl=en-US`;
}

// ---------------------------------------------------------------------------
// 1. 技能伤害变更
//    mode: 'update' 只改已有条目；'create' 没有匹配时新建；'upsert' 两者皆可
// ---------------------------------------------------------------------------
const SKILL_CHANGES = [
  // ---- 11.3 ------------------------------------------------------------
  { patch: '11.3', heroKey: 'Nicky', slot: 'P', group: 1033100, skillId: 'None', dataKey: 'Damage', title: 'P 狂躁', bases: [60, 85, 110], formula: 'base + ap * 0.35', mode: 'create',
    before: '30/70/110(+Skill Amplification 35%)', after: '60/85/110(+Skill Amplification 35%)' },
  { patch: '11.3', heroKey: 'Nicky', slot: 'E', group: 1033400, skillId: 'NickyActive3_1', dataKey: 'Damage', title: 'E 重拳', bases: [60, 95, 130, 165, 200], formula: 'base + ap * 0.95', mode: 'create',
    before: '60/95/130/165/200(+Skill Amplification 90%)', after: '60/95/130/165/200(+Skill Amplification 95%)' },
  { patch: '11.3', heroKey: 'Blair', slot: 'Q', group: 1084200, skillId: 'BlairActive1_1', dataKey: '[Double Bladed Sword] Second Hit Damage', title: 'Q 双重斩击 双刀二段伤害', bases: [40, 65, 90, 115, 140], formula: 'base + attack * 0.75', mode: 'create',
    before: '40/65/90/115/140(+Attack Power 80%)', after: '40/65/90/115/140(+Attack Power 75%)' },
  { patch: '11.3', heroKey: 'Bihyung', slot: 'P', group: 1088100, skillId: 'None', dataKey: 'Damage', title: 'P 鬼火', bases: [16, 24, 32], formula: 'base + extraAttack * 0.4 + targetHp * [0.01,0.02,0.03][level - 1]', mode: 'create',
    before: "16/32/48(+Extra Attack Power 40%)(+Target's Max HP 1/2/3%)", after: "16/24/32(+Extra Attack Power 40%)(+Target's Max HP 1/2/3%)" },
  { patch: '11.3', heroKey: 'Charlotte', group: 1073200, dataKey: 'Damage', formula: 'base + ap * 1', mode: 'update',
    before: '120/150/180/210/240(+Skill Amplification 95%)', after: '120/150/180/210/240(+Skill Amplification 100%)' },
  { patch: '11.3', heroKey: 'Shoichi', group: 1018400, dataKey: 'Damage', formula: 'base + ap * 0.75', mode: 'update',
    before: '60/100/140/180/220(+Skill Amplification 65%)', after: '60/100/140/180/220(+Skill Amplification 75%)' },
  { patch: '11.3', heroKey: 'Lyanh', slot: 'W', group: 1063300, skillId: 'LyanhHumanActive2', dataKey: '[Phantom Ripper] Damage', title: 'W 血染之指 附身伤害', bases: [30, 60, 90, 120, 150], formula: 'base + attack * 0.65', mode: 'create',
    before: '20/50/80/110/140(+Attack Power 65%)', after: '30/60/90/120/150(+Attack Power 65%)' },
  { patch: '11.3', heroKey: 'Priya', group: 1051400, dataKey: 'Damage', formula: 'base + ap * 0.65', mode: 'update',
    before: '60/90/120/150/180(+Skill Amplification 60%)', after: '60/90/120/150/180(+Skill Amplification 65%)' },
  { patch: '11.3', heroKey: 'Fiora', slot: 'W', group: 1003300, skillId: 'FioraActive2', dataKey: 'Damage', title: 'W 复杂进攻', bases: [30, 65, 100, 135, 170], formula: 'base + ap * 0.3', mode: 'create',
    before: '40/75/110/145/180(+Skill Amplification 30%)', after: '30/65/100/135/170(+Skill Amplification 30%)' },
  { patch: '11.3', heroKey: 'Piolo', slot: 'Q', group: 1056200, skillId: 'PioloActive1_1', dataKey: '[Chokeslam] Center Damage', title: 'Q 狂龙乱舞&下劈 下劈中心伤害', bases: [50, 80, 110, 140, 170], formula: 'base + ap * 0.85', mode: 'create',
    before: '60/95/130/165/200(+Skill Amplification 85%)', after: '50/80/110/140/170(+Skill Amplification 85%)' },
  { patch: '11.3', heroKey: 'Piolo', slot: 'W', group: 1056300, skillId: 'PioloActive2_1', dataKey: '[Hammer Throw] Damage', title: 'W 流星赶月&翻转 翻转伤害', bases: [70, 115, 160, 205, 250], formula: 'base + ap * 0.85', mode: 'create',
    before: '90/135/180/225/270(+Skill Amplification 85%)', after: '70/115/160/205/250(+Skill Amplification 85%)' },
  { patch: '11.3', heroKey: 'Jan', slot: 'Q', group: 1035200, skillId: 'JanActive1_1', dataKey: 'Damage', title: 'Q 膝踢', bases: [100, 120, 140, 160, 180], formula: 'base + extraAttack * 0.65 + ap * 0.55 + targetHp * 0.06', mode: 'create',
    before: "100/120/140/160/180(+Extra Attack Power 65%)(+Skill Amplification 50%)(+Target's Max HP 6%)", after: "100/120/140/160/180(+Extra Attack Power 65%)(+Skill Amplification 55%)(+Target's Max HP 6%)" },
  { patch: '11.3', heroKey: 'Estelle', dataKey: '[First Response] Damage', formula: 'base + ap * 0.55 + targetHp * 0.03', mode: 'update',
    before: "20/50/80/110/140(+Skill Amplification 55%)(+Target's Max HP 2.5%)", after: "20/50/80/110/140(+Skill Amplification 55%)(+Target's Max HP 3%)" },
  { patch: '11.3', heroKey: 'Estelle', dataKey: '[Forcible Entry] Damage', formula: 'base + ap * 0.7', mode: 'update',
    before: '60/85/110/135/160(+Skill Amplification 60%)(+Max HP 10%)', after: '60/85/110/135/160(+Skill Amplification 70%)(+Max HP 10%)',
    note: '自身体力上限 10% 部分计算器未建模。' },
  { patch: '11.3', manualId: 'yumin-eq', bases: [40, 60, 80, 100, 120], mode: 'update',
    before: '50/70/90/110/130(+Skill Amplification 40%)', after: '40/60/80/100/120(+Skill Amplification 40%)',
    note: '俞岷 Q 风之领域伤害（手动校对英雄）。' },

  // ---- 11.4 ------------------------------------------------------------
  { patch: '11.4', heroKey: 'Nicky', slot: 'Q', group: 1033200, skillId: 'NickyActive1_1', dataKey: 'Min Damage', title: 'Q 格斗动作 最小伤害', bases: [40, 60, 80, 100, 120], formula: 'base + ap * 0.7', mode: 'create',
    before: '30/50/70/90/110(+Skill Amplification 70%)', after: '40/60/80/100/120(+Skill Amplification 70%)' },
  { patch: '11.4', heroKey: 'Nicky', slot: 'Q', group: 1033200, skillId: 'NickyActive1_1', dataKey: 'Max Damage', title: 'Q 格斗动作 最大伤害', bases: [80, 120, 160, 200, 240], formula: 'base + ap * 1.4', mode: 'create',
    before: '60/100/140/180/220(+Skill Amplification 140%)', after: '80/120/160/200/240(+Skill Amplification 140%)' },
  { patch: '11.4', heroKey: 'Daniel', slot: 'Q', group: 1037200, skillId: 'DanielActive1', dataKey: 'Center Hit Damage', title: 'Q 剪影 中心命中伤害', bases: [40, 60, 80, 100, 120], formula: 'base + attack * 1.4', mode: 'create',
    before: '40/60/80/100/120(+Attack Power 130%)', after: '40/60/80/100/120(+Attack Power 140%)' },
  { patch: '11.4', heroKey: 'Lenox', group: 1020500, dataKey: 'Enhanced True Damage', bases: [30, 40, 50], mode: 'update',
    before: '2 Hits Blue Viper Grounded Damage 25/35/45', after: '2 Hits Blue Viper Grounded Damage 30/40/50' },
  { patch: '11.4', heroKey: 'Lenox', slot: 'R', group: 1020500, skillId: 'LenoxActive4', dataKey: 'Grounded Damage', title: 'R 青蛇 落地伤害', bases: [15, 20, 25], formula: 'base', mode: 'create',
    before: 'Blue Viper Grounded Damage 5/15/25', after: 'Blue Viper Grounded Damage 15/20/25',
    note: '补丁只给出固定数值，未标注系数。' },
  { patch: '11.4', heroKey: 'Leon', group: 1029100, dataKey: 'Damage', bases: [30, 45, 60], formula: 'base + ap * 0.35', mode: 'update',
    before: '30/50/70(+Skill Amplification 30%)', after: '30/45/60(+Skill Amplification 35%)' },
  { patch: '11.4', heroKey: 'Lenore', group: 1075200, dataKey: 'Damage', bases: [80, 100, 120, 140, 160], mode: 'update',
    before: '70/90/110/130/150(+Skill Amplification 60%)', after: '80/100/120/140/160(+Skill Amplification 60%)' },
  { patch: '11.4', heroKey: 'Magnus', group: 1004300, dataKey: 'DamageByLevel', bases: [22, 28, 34, 40, 46], formula: 'base + extraAttack * 0.45 + ap * 0.2 + targetHp * 0.025', tableCoef: 0.2, mode: 'update',
    before: "16/22/28/34/40(+Extra Attack Power 45%)(+Skill Amplification 20%)(+Target's Max HP 2.5%)", after: "22/28/34/40/46(+Extra Attack Power 45%)(+Skill Amplification 20%)(+Target's Max HP 2.5%)" },
  { patch: '11.4', heroKey: 'Vanya', slot: 'E', group: 1064400, skillId: 'VanyaActive3', dataKey: 'Outer Area Damage', title: 'E 祈愿 外围伤害', bases: [90, 125, 160, 195, 230], formula: 'base + ap * 0.9', mode: 'create',
    before: '90/125/160/195/230(+Skill Amplification 80%)', after: '90/125/160/195/230(+Skill Amplification 90%)' },
  { patch: '11.4', heroKey: 'Adela', group: 1024300, dataKey: 'Damage', formula: 'base + ap * 0.75', mode: 'update',
    before: '20/60/100/140/180(+Skill Amplification 80%)', after: '20/60/100/140/180(+Skill Amplification 75%)' },
  { patch: '11.4', manualId: 'yumin-e', bases: [60, 90, 120, 150, 180], mode: 'update',
    before: '60/95/130/165/200(+Skill Amplification 50%)', after: '60/90/120/150/180(+Skill Amplification 50%)',
    note: '俞岷 E 云步（手动校对英雄）。' },
  { patch: '11.4', heroKey: 'Justyna', group: 1079200, dataKey: 'Damage', formula: 'base + ap * 0.45', mode: 'update',
    before: '50/75/100/125/150(+Skill Amplification 40%)', after: '50/75/100/125/150(+Skill Amplification 45%)' },
  { patch: '11.4', heroKey: 'Priya', group: 1051300, dataKey: 'Damage', formula: 'base + ap * 0.7', mode: 'update',
    before: '60/100/140/180/220(+Skill Amplification 65%)', after: '60/100/140/180/220(+Skill Amplification 70%)' },
  { patch: '11.4', heroKey: 'Henry', slot: 'W', group: 1083300, skillId: 'HenryActive2', dataKey: 'Damage', title: 'W 时控装置', bases: [8, 16, 24, 32, 40], formula: 'base + ap * 0.2 + targetHp * [0.01,0.01,0.02,0.02,0.03][level - 1]', mode: 'create',
    before: "8/16/24/32/40(+Skill Amplification 22%)(+Target's Max HP 1/1/2/2/3%)", after: "8/16/24/32/40(+Skill Amplification 20%)(+Target's Max HP 1/1/2/2/3%)" },

  // ---- 11.5 ------------------------------------------------------------
  // 新实验体 Craver（11.5 上线，P 数值按 11.6 修正后写入）
  { patch: '11.5', heroKey: 'Craver', slot: 'P', group: 1089100, skillId: 'None', dataKey: 'Damage', title: 'P 亡命之徒 普攻额外伤害', bases: [20, 40, 60], formula: 'base + ap * 0.25', mode: 'create',
    after: '20/40/60(+Skill Amplification 25%)(+0.5 per 1% Additional Attack Speed)',
    note: '11.5 上线值 10/30/50，11.6 上调为 20/40/60；额外攻击速度换算部分未建模。' },
  { patch: '11.5', heroKey: 'Craver', slot: 'Q', group: 1089200, skillId: 'CraverActive1', dataKey: '[Double Tap] Damage', title: 'Q 双重射击', bases: [50, 70, 90, 110, 130], formula: 'base + ap * 0.4', mode: 'create',
    after: '50/70/90/110/130(+Skill Amplification 40%)' },
  { patch: '11.5', heroKey: 'Craver', slot: 'Q', group: 1089200, skillId: 'CraverActive1', dataKey: '[Focus Shot] Damage', title: 'Q 聚焦射击', bases: [80, 120, 160, 200, 240], formula: 'base + ap * 0.85', mode: 'create',
    after: '80/120/160/200/240(+Skill Amplification 85%)' },
  { patch: '11.5', heroKey: 'Craver', slot: 'Q', group: 1089200, skillId: 'CraverActive1', dataKey: '[Focus Shot] Additional Damage', title: 'Q 聚焦射击 追加伤害', bases: [40, 70, 100, 130, 160], formula: 'base + ap * 0.3', mode: 'create',
    after: '40/70/100/130/160(+Skill Amplification 30%)' },
  { patch: '11.5', heroKey: 'Craver', slot: 'W', group: 1089300, skillId: 'CraverActive2', dataKey: '[Sweep Kick] Damage', title: 'W 扫堂腿（每段）', bases: [30, 55, 80, 105, 130], formula: 'base + ap * 0.4', mode: 'create',
    after: '30/55/80/105/130(+Skill Amplification 40%) x2',
    note: '技能命中 2 段，界面可用目标/段数倍率叠加。' },
  { patch: '11.5', heroKey: 'Craver', slot: 'W', group: 1089300, skillId: 'CraverActive2', dataKey: '[Backflip] Damage', title: 'W 后空翻', bases: [130, 160, 190, 220, 250], formula: 'base + ap * 0.85', mode: 'create',
    after: '130/160/190/220/250(+Skill Amplification 85%)' },
  { patch: '11.5', heroKey: 'Craver', slot: 'E', group: 1089400, skillId: 'CraverActive3', dataKey: '[Combat Roll] Damage', title: 'E 战术翻滚', bases: [50, 80, 110, 140, 170], formula: 'base + ap * 0.55', mode: 'create',
    after: '50/80/110/140/170(+Skill Amplification 55%)' },
  { patch: '11.5', heroKey: 'Craver', slot: 'E', group: 1089400, skillId: 'CraverActive3', dataKey: '[Quick Step] Damage', title: 'E 快步后撤', bases: [100, 125, 150, 175, 200], formula: 'base + ap * 0.8', mode: 'create',
    after: '100/125/150/175/200(+Skill Amplification 80%)' },
  { patch: '11.5', heroKey: 'Craver', slot: 'R', group: 1089500, skillId: 'CraverActive4', dataKey: 'Damage', title: 'R 决斗时刻', bases: [150, 235, 320], formula: 'base + ap * 0.7', mode: 'create',
    after: '150/235/320(+Skill Amplification 70%)' },

  { patch: '11.5', heroKey: 'Niah', group: 1081300, dataKey: 'Damage', formula: 'base + ap * 0.7', mode: 'update',
    before: '60/100/140/180/220(+Skill Amplification 65%)', after: '60/100/140/180/220(+Skill Amplification 70%)' },
  { patch: '11.5', heroKey: 'Lenox', slot: 'E', group: 1020400, skillId: 'LenoxActive3', dataKey: 'Damage', title: 'E 反向双钓', bases: [60, 100, 140, 180, 220], formula: 'base + ap * 0.5 + targetHp * 0.07', mode: 'create',
    before: "60/100/140/180/220(+Skill Amplification 50%)(+Target's Max HP 5%)", after: "60/100/140/180/220(+Skill Amplification 50%)(+Target's Max HP 7%)" },
  { patch: '11.5', heroKey: 'Adriana', group: 1017500, dataKey: 'Damage', bases: [140, 170, 200], mode: 'update',
    before: '110/155/200(+Skill Amplification 40%)', after: '140/170/200(+Skill Amplification 40%)' },
  { patch: '11.5', heroKey: 'Jan', slot: 'E', group: 1035400, skillId: 'JanActive3', dataKey: 'Damage', title: 'E 闪烁', bases: [20, 30, 40, 50, 60], formula: 'base + extraAttack * 1 + ap * 0.5 + targetHp * 0.05', mode: 'create',
    before: "15/25/35/45/55(+Extra Attack Power 100%)(+Skill Amplification 45%)(+Target's Max HP 5%)", after: "20/30/40/50/60(+Extra Attack Power 100%)(+Skill Amplification 50%)(+Target's Max HP 5%)" },
  { patch: '11.5', heroKey: 'Elena', group: 1050300, dataKey: 'Damage', formula: 'base + ap * 0.55', mode: 'update',
    before: '50/70/90/110/130(+Skill Amplification 50%)(+Additional HP 10%)', after: '50/70/90/110/130(+Skill Amplification 55%)(+Additional HP 12%)',
    note: '自身额外体力 12% 部分计算器未建模。' },
  { patch: '11.5', heroKey: 'Justyna', group: 1079500, dataKey: 'Damage', bases: [30, 50, 70], formula: 'base + ap * 0.22', mode: 'update',
    before: '30/50/70(+Skill Amplification 20%)', after: '30/50/70(+Skill Amplification 22%)',
    note: '原 Wiki 快照记录为 80/160/240(+攻击力90%)，按官方补丁数值覆盖。' },
  { patch: '11.5', heroKey: 'Irem', group: 1061310, dataKey: 'Damage', formula: 'base + ap * 0.8', mode: 'update',
    before: '40/80/120/160/200(+Skill Amplification 75%)', after: '40/80/120/160/200(+Skill Amplification 80%)' },
  { patch: '11.5', heroKey: 'Eleven', group: 1030500, dataKey: 'Damage', formula: 'base + attack * 0.08', mode: 'update',
    before: '10/15/20(+Attack Power 3%)(+Additional HP 3%)', after: '10/15/20(+Attack Power 8%)(+Additional HP 3%)' },
  { patch: '11.5', heroKey: 'Jenny', group: 1038400, dataKey: 'Extra Damage', bases: [60, 95, 130, 165, 200], mode: 'update',
    before: '60/90/120/150/180(+Skill Amplification 58%)', after: '60/95/130/165/200(+Skill Amplification 58%)' },
  { patch: '11.5', heroKey: 'Camilo', dataKey: 'Damage', groups: [1039200, 1039210], formula: 'base + attack * 0.7', mode: 'update',
    before: '10/30/50/70/90(+Attack Power 75%)*(Basic Attack Amplification)', after: '10/30/50/70/90(+Attack Power 70%)*(Basic Attack Amplification)',
    note: '普攻增幅倍率部分计算器未建模。' },
  { patch: '11.5', heroKey: 'Kenneth', group: 1071200, dataKey: 'Damage', formula: 'base + attack * [1.7,1.75,1.8,1.85,1.9][level - 1]', mode: 'update',
    before: '30/40/50/60/70(+Attack Power 165/170/175/180/185%)', after: '30/40/50/60/70(+Attack Power 170/175/180/185/190%)' },
  { patch: '11.5', heroKey: 'Haze', group: 1058220, dataKey: '40mm Grenade Damage', bases: [80, 110, 140, 170, 200], formula: 'base + ap * 0.4', mode: 'update',
    before: '80/105/130/155/180(+Skill Amplification 40%)', after: '80/110/140/170/200(+Skill Amplification 40%)',
    note: 'RQ 火箭加速器；原 Wiki 快照 80/115/150/185/220(+85%) 已按官方补丁覆盖。' },
  { patch: '11.5', heroKey: 'Hisui', slot: 'R', group: 1078500, skillId: 'HisuiActive4_1', dataKey: 'Additional Damage', title: 'R 物干焯 额外伤害', bases: [20, 20, 20], formula: 'base + extraAttack * [0.15,0.3,0.45][level - 1]', mode: 'create',
    before: '20(+Additional Attack Power 20/35/50%)', after: '20(+Additional Attack Power 15/30/45%)' },

  // ---- 11.6 ------------------------------------------------------------
  { patch: '11.6', heroKey: 'DebiMarlene', group: 1065100, dataKey: 'Damage', formula: 'base + extraAttack * 0.75', mode: 'update',
    before: '15/20/25(+Extra Attack Power 70%)(+Critical Strike Chance 50%)', after: '15/20/25(+Extra Attack Power 75%)(+Critical Strike Chance 50%)',
    note: '暴击率换算部分计算器未建模；原公式按攻击力记录，已按补丁改为额外攻击力。' },
  { patch: '11.6', heroKey: 'Martina', slot: 'R', group: 1057500, skillId: 'MartinaActive4', dataKey: 'Recording Edge Damage', title: 'R 录像 录制中边缘伤害', bases: [10, 15, 20], formula: 'base + attack * 0.15', mode: 'create',
    before: '10/15/20(+Attack Power 10%)', after: '10/15/20(+Attack Power 15%)' },
  { patch: '11.6', heroKey: 'Martina', slot: 'R', group: 1057500, skillId: 'MartinaActive4', dataKey: 'Recording Center Damage', title: 'R 录像 录制中中心伤害', bases: [20, 25, 30], formula: 'base + attack * 0.2', mode: 'create',
    before: '20/25/30(+Attack Power 15%)', after: '20/25/30(+Attack Power 20%)' },
  { patch: '11.6', heroKey: 'Martina', slot: 'R', group: 1057500, skillId: 'MartinaActive4', dataKey: 'Recording Complete Edge Damage', title: 'R 录像 录制完成边缘伤害', bases: [100, 200, 300], formula: 'base + attack * 0.9', mode: 'create',
    before: '100/200/300(+Attack Power 80%)', after: '100/200/300(+Attack Power 90%)' },
  { patch: '11.6', heroKey: 'Martina', slot: 'R', group: 1057500, skillId: 'MartinaActive4', dataKey: 'Recording Complete Center Damage', title: 'R 录像 录制完成中心伤害', bases: [200, 325, 450], formula: 'base + attack * 1.3', mode: 'create',
    before: '200/325/450(+Attack Power 120%)', after: '200/325/450(+Attack Power 130%)' },
  { patch: '11.6', heroKey: 'Silvia', group: 1016200, dataKey: 'Damage', bases: [60, 95, 130, 165, 200], formula: 'base + ap * 0.6', mode: 'update',
    before: '60/90/120/150/180(+Skill Amplification 60%)', after: '60/95/130/165/200(+Skill Amplification 60%)',
    note: '原 Wiki 快照 20/40/60/80/100(+10%) 已按官方补丁覆盖。' },
  { patch: '11.6', heroKey: 'Adriana', group: 1017200, dataKey: 'Damage', formula: 'base + ap * [0.27,0.29,0.31,0.33,0.35][level - 1]', mode: 'update',
    before: '35/45/55/65/75(+Skill Amplification 25/27/29/31/33%)', after: '35/45/55/65/75(+Skill Amplification 27/29/31/33/35%)' },
  { patch: '11.6', heroKey: 'Isaac', group: 1059100, dataKey: 'Damage', formula: 'base + attack * 0.6 + targetHp * [0.04,0.05,0.06][level - 1]', mode: 'update',
    before: "20/30/40(+Attack Power 60%)(+Target's Max HP 3/4/5%)", after: "20/30/40(+Attack Power 60%)(+Target's Max HP 4/5/6%)" },
  { patch: '11.6', heroKey: 'Justyna', group: 1079400, dataKey: 'Damage', formula: 'base + ap * 0.35', mode: 'update',
    before: '50/75/100/125/150(+Skill Amplification 30%)', after: '50/75/100/125/150(+Skill Amplification 35%)' },
  { patch: '11.6', heroKey: 'Irem', group: 1061200, dataKey: 'Damage', bases: [50, 75, 100, 125, 150], formula: 'base + ap * 0.55', mode: 'update',
    before: '50/70/90/110/130(+Skill Amplification 55%)', after: '50/75/100/125/150(+Skill Amplification 55%)',
    note: '同时同步跳跳球渐进伤害条目的基础值。' },
  { patch: '11.6', heroKey: 'Karla', group: 1054300, dataKey: 'Damage', bases: [80, 105, 130, 155, 180], formula: 'base + attack * 0.3 + ap * 0.75', mode: 'update',
    before: '70/95/120/145/170(+Attack Power 30%)(+Skill Amplification 75%)(+Critical Strike Chance 65%)', after: '80/105/130/155/180(+Attack Power 30%)(+Skill Amplification 75%)(+Critical Strike Chance 65%)' },
  { patch: '11.6', heroKey: 'Theodore', slot: 'Q', group: 1062200, skillId: 'TheodoreActive1', dataKey: 'Screen Projectile Damage', title: 'Q 聚能磁轨炮 屏幕穿透伤害', bases: [70, 110, 150, 190, 230], formula: 'base + ap * 0.8', mode: 'create',
    before: '70/110/150/190/230(+Skill Amplification 75%)', after: '70/110/150/190/230(+Skill Amplification 80%)' },
  { patch: '11.6', heroKey: 'Priya', group: 1051200, dataKey: 'Damage', bases: [60, 90, 120, 150, 180], formula: 'base + ap * 0.75', mode: 'update',
    before: '60/90/120/150/180(+Skill Amplification 70%)', after: '60/90/120/150/180(+Skill Amplification 75%)',
    note: '原 Wiki 快照基础值 80/110/140/170/200 已按官方补丁覆盖。' },
  { patch: '11.6', heroKey: 'Henry', slot: 'P', group: 1083100, skillId: 'None', dataKey: 'Damage', title: 'P 裂时之隙', bases: [40, 70, 100], formula: 'base + ap * 0.3', mode: 'create',
    before: "40/70/100(+Skill Amplification 30%)(+Target's Lost HP 8/12/16%)", after: "40/70/100(+Skill Amplification 30%)(+Target's Lost HP 8/10/12%)",
    note: '目标已失体力部分计算器未建模（目标模型只有体力上限）。' },
  { patch: '11.6', heroKey: 'Hyunwoo', slot: 'P', group: 1007100, skillId: 'None', dataKey: 'Damage', title: 'P 鏖战', bases: [40, 70, 100], formula: 'base + attack * 0.7 + ap * 0.45', mode: 'create',
    before: '40/70/100(+Attack Power 60%)(+Skill Amplification 40%)', after: '40/70/100(+Attack Power 70%)(+Skill Amplification 45%)' },

  // ---- 11.7 ------------------------------------------------------------
  { patch: '11.7', heroKey: 'Nathapon', slot: 'E', group: 1034400, skillId: 'NathaponActive3', dataKey: 'Damage', title: 'E 时光倒影', bases: [30, 50, 70, 90, 110], formula: 'base + ap * 0.4', mode: 'create',
    before: '30/50/70/90/110(+Skill Amplification 35%)', after: '30/50/70/90/110(+Skill Amplification 40%)' },
  { patch: '11.7', heroKey: 'Leon', group: 1029400, dataKey: 'Damage', bases: [60, 95, 130, 165, 200], formula: 'base + ap * 0.75', mode: 'update',
    before: '70/105/140/175/210(+Skill Amplification 80%)', after: '60/95/130/165/200(+Skill Amplification 75%)' },
  { patch: '11.7', heroKey: 'Magnus', slot: 'E', group: 1004400, skillId: 'MagnusActive3', dataKey: 'Wall Collision Damage', title: 'E 猛击 撞墙伤害', bases: [20, 40, 60, 80, 100], formula: 'base + extraAttack * 0.3 + ap * 0.3 + targetHp * 0.07', mode: 'create',
    before: "20/40/60/80/100(+Extra Attack Power 30%)(+Skill Amplification 20%)(+Target's Max HP 6%)", after: "20/40/60/80/100(+Extra Attack Power 30%)(+Skill Amplification 30%)(+Target's Max HP 7%)" },
  { patch: '11.7', heroKey: 'Barbara', group: 1026500, dataKey: 'Sentry Gun Damage', formula: 'base + ap * 0.45', mode: 'update',
    before: 'Railgun Damage 100/125/150(+Skill Amplification 50%)', after: 'Railgun Damage 100/125/150(+Skill Amplification 45%)' },
  { patch: '11.7', heroKey: 'Silvia', slot: 'W', group: 1016300, skillId: 'SilviaHumanActive2', dataKey: '[On Bike] Front Flip Damage', title: 'W 前空翻（摩托）', bases: [60, 100, 140, 180, 220], formula: 'base + ap * 0.55', mode: 'create',
    before: '60/100/140/180/220(+Skill Amplification 60%)', after: '60/100/140/180/220(+Skill Amplification 55%)' },
  { patch: '11.7', heroKey: 'Arda', slot: 'Q', group: 1066200, skillId: 'ArdaActive1', dataKey: 'Damage', title: 'Q 沙玛什卷轴', bases: [70, 110, 150, 190, 230], formula: 'base + ap * 0.8', mode: 'create',
    before: '50/90/130/170/210(+Skill Amplification 80%)', after: '70/110/150/190/230(+Skill Amplification 80%)',
    note: '同样适用于 R-Q 沙玛什密码。' },
  { patch: '11.7', heroKey: 'Emma', group: 1019100, dataKey: 'Damage', bases: [60, 80, 100], formula: 'base + ap * [0.25,0.35,0.45][level - 1]', mode: 'update',
    before: '80/100/120(+Skill Amplification 25/35/45%)', after: '60/80/100(+Skill Amplification 25/35/45%)' },
  { patch: '11.7', heroKey: 'Istvan', slot: 'R', group: 1080500, skillId: 'IstvanActive4', dataKey: 'Damage', title: 'R 波函数坍缩', bases: [80, 160, 240], formula: 'base + attack * 0.85', mode: 'create',
    before: '80/160/240(+Attack Power 90%)', after: '80/160/240(+Attack Power 85%)' },
  { patch: '11.7', heroKey: 'Zahir', group: 1005500, dataKey: 'DamageByLevel_2', bases: [60, 120, 180], formula: 'base + ap * 0.4', tableCoef: 0.4, mode: 'update',
    before: 'Min Damage 60/120/180(+Skill Amplification 45%)', after: 'Min Damage 60/120/180(+Skill Amplification 40%)' },
  { patch: '11.7', heroKey: 'Theodore', group: 1062300, dataKey: 'Extra Damage', bases: [40, 50, 60, 70, 80], mode: 'update',
    before: '30/40/50/60/70(+Skill Amplification 26%)', after: '40/50/60/70/80(+Skill Amplification 26%)' },
  { patch: '11.7', heroKey: 'Fenrir', slot: 'R', group: 1086500, skillId: 'FenrirActive4', dataKey: 'Damage', title: 'R 绝息一击', bases: [150, 225, 300], formula: 'base + attack * 1.1', mode: 'create',
    before: '150/225/300(+Attack Power 120%)', after: '150/225/300(+Attack Power 110%)' }
];

// ---------------------------------------------------------------------------
// 2. 武器熟练度成长（masteryStats.json）
// ---------------------------------------------------------------------------
const MASTERY_CHANGES = [
  { patch: '11.3', heroKey: 'Nadine', type: 'CrossBow', stat: 'AttackSpeedRatio', from: 0.028, to: 0.034 },
  { patch: '11.3', heroKey: 'Laura', type: 'Whip', stat: 'SkillAmpRatio', from: 0.04, to: 0.041 },
  // 手里剑在 er-gamedata 中的武器类型键为 DirectFire（暗器）
  { patch: '11.3', heroKey: 'Zahir', type: 'DirectFire', stat: 'SkillAmpRatio', from: 0.04, to: 0.039 },
  { patch: '11.4', heroKey: 'Martina', type: 'Camera', stat: 'IncreaseBasicAttackDamageRatio', from: 0.012, to: 0.011 },
  { patch: '11.4', heroKey: 'Bianca', type: 'Arcana', stat: 'SkillAmpRatio', from: 0.045, to: 0.044 },
  { patch: '11.4', heroKey: 'Adriana', type: 'HighAngleFire', stat: 'SkillAmpRatio', from: 0.039, to: 0.04 },
  { patch: '11.4', heroKey: 'Camilo', type: 'Rapier', stat: 'IncreaseBasicAttackDamageRatio', from: 0.014, to: 0.013 },
  { patch: '11.5', heroKey: 'Nadine', type: 'CrossBow', stat: 'IncreaseBasicAttackDamageRatio', from: 0.014, to: 0.013 },
  { patch: '11.5', heroKey: 'Rio', type: 'Bow', stat: 'IncreaseBasicAttackDamageRatio', from: 0.012, to: 0.013 },
  { patch: '11.5', heroKey: 'Johann', type: 'Arcana', stat: 'SkillAmpRatio', from: 0.044, to: 0.043 },
  { patch: '11.5', heroKey: 'Karla', type: 'CrossBow', stat: 'SkillAmpRatio', from: 0.041, to: 0.042 },
  { patch: '11.6', heroKey: 'Celine', type: 'HighAngleFire', stat: 'SkillAmpRatio', from: 0.043, to: 0.042 },
  { patch: '11.6', heroKey: 'Coraline', type: 'Arcana', stat: 'SkillAmpRatio', from: 0.04, to: 0.041 },
  { patch: '11.6', heroKey: 'Aiden', type: 'TwoHandSword', stat: 'IncreaseBasicAttackDamageRatio', from: 0.021, to: 0.02 },
  { patch: '11.6', heroKey: 'Jackie', type: 'TwoHandSword', stat: 'IncreaseBasicAttackDamageRatio', from: 0.025, to: 0.024 },
  { patch: '11.6', heroKey: 'Katja', type: 'SniperRifle', stat: 'IncreaseBasicAttackDamageRatio', from: 0.019, to: 0.02 },
  { patch: '11.6', heroKey: 'Elena', type: 'Rapier', stat: 'SkillAmpRatio', from: 0.045, to: 0.048 },
  { patch: '11.6', heroKey: 'Piolo', type: 'Nunchaku', stat: 'SkillAmpRatio', from: 0.046, to: 0.045 },
  { patch: '11.6', heroKey: 'Isol', type: 'AssaultRifle', stat: 'AttackSpeedRatio', from: 0.033, to: 0.03 },
  { patch: '11.6', heroKey: 'Adriana', type: 'HighAngleFire', stat: 'SkillAmpRatio', from: 0.04, to: 0.041 },
  { patch: '11.7', heroKey: 'Darko', type: 'Bat', stat: 'IncreaseBasicAttackDamageRatio', from: 0.018, to: 0.017 },
  { patch: '11.7', heroKey: 'Martina', type: 'Camera', stat: 'IncreaseBasicAttackDamageRatio', from: 0.011, to: 0.01 },
  { patch: '11.7', heroKey: 'Jackie', type: 'TwoHandSword', stat: 'IncreaseBasicAttackDamageRatio', from: 0.024, to: 0.023 },
  { patch: '11.7', heroKey: 'Hart', type: 'Guitar', stat: 'AttackSpeedRatio', from: 0.035, to: 0.031 },
  { patch: '11.7', heroKey: 'YuMin', type: 'Arcana', stat: 'SkillAmpRatio', from: 0.04, to: 0.041 }
];

// ---------------------------------------------------------------------------
// 3. 实验体基础属性 / 成长（erGameData.characters）
// ---------------------------------------------------------------------------
const CHARACTER_CHANGES = [
  { patch: '11.3', heroKey: 'Leni', path: 'base.defense', from: 52, to: 50 },
  { patch: '11.3', heroKey: 'Sissela', path: 'base.hp', from: 890, to: 920 },
  { patch: '11.3', heroKey: 'Sissela', path: 'base.defense', from: 49, to: 50 },
  { patch: '11.3', heroKey: 'Isaac', path: 'growth.attackPower', from: 4.7, to: 4.9 },
  { patch: '11.3', heroKey: 'Katja', path: 'growth.attackPower', from: 4.5, to: 4.7 },
  { patch: '11.3', heroKey: 'Hart', path: 'growth.attackPower', from: 4.2, to: 4.4 },
  { patch: '11.3', heroKey: 'Henry', path: 'growth.maxHp', from: 81, to: 78 },
  { patch: '11.3', heroKey: 'Laura', path: 'base.moveSpeed', from: 3.45, to: 3.5 },
  { patch: '11.4', heroKey: 'Markus', path: 'base.hp', from: 920, to: 950 },
  { patch: '11.4', heroKey: 'Yuki', path: 'growth.defense', from: 3.1, to: 3.2 },
  { patch: '11.4', heroKey: 'Felix', path: 'base.defense', from: 50, to: 53 },
  { patch: '11.4', heroKey: 'Fiora', path: 'base.defense', from: 56, to: 54 },
  { patch: '11.5', heroKey: 'Bernice', path: 'growth.attackPower', from: 4.3, to: 4.6 },
  { patch: '11.5', heroKey: 'Bihyung', path: 'base.defense', from: 52, to: 50 },
  { patch: '11.5', heroKey: 'Kenneth', path: 'growth.attackPower', from: 3.9, to: 4.2 },
  { patch: '11.6', heroKey: 'Garnet', path: 'base.hp', from: 1000, to: 970 },
  { patch: '11.6', heroKey: 'Darko', path: 'growth.maxHp', from: 93, to: 96 },
  { patch: '11.6', heroKey: 'Magnus', path: 'base.defense', from: 49, to: 50 },
  { patch: '11.6', heroKey: 'Magnus', path: 'growth.defense', from: 3.2, to: 3.3 },
  { patch: '11.6', heroKey: 'Mirka', path: 'base.defense', from: 50, to: 52 },
  { patch: '11.6', heroKey: 'Shoichi', path: 'base.hp', from: 980, to: 940 },
  { patch: '11.6', heroKey: 'Felix', path: 'base.attackPower', from: 33, to: 35 },
  { patch: '11.7', heroKey: 'William', path: 'growth.defense', from: 2.5, to: 2.7 }
];

// ---------------------------------------------------------------------------
// 3b. 实验体档案补全（11.5 新实验体 Craver 在旧快照里只有占位数据）
// ---------------------------------------------------------------------------
const CHARACTER_PROFILE_CHANGES = [
  {
    patch: '11.5',
    heroKey: 'Craver',
    set: {
      weapons: ['Pistol'],
      weaponRangeType: 'Range',
      playTip: 'Craver 以固定攻击速度和 6 发弹药作战，普攻与基础技能都会消耗子弹，剩 1 发时进入必杀弹状态并需要装填。'
    },
    note: 'er-gamedata 快照早于 Craver 上线，仅补齐武器类型与说明；官方补丁未公布其每级成长数值，growth 仍为空。'
  }
];

// ---------------------------------------------------------------------------
// 4. 装备属性（erGameData.equipment，按英文名匹配 l10n 的 Item/Name/{code}）
//    remove: true 表示移除该属性
// ---------------------------------------------------------------------------
const EQUIPMENT_CHANGES = [
  { patch: '11.3', item: "Rocker's Jacket", stat: 'penetrationDefense', from: 11, to: 12 },
  { patch: '11.3', item: 'Guardian Suit', stat: 'defense', from: 45, to: 42 },
  { patch: '11.3', item: 'Rebel With A Cause', stat: 'maxHp', from: 200, to: 220 },
  { patch: '11.3', item: 'Shooting Star Jacket', stat: 'attackPower', from: 10, to: 12 },
  { patch: '11.3', item: 'Áo Dài', stat: 'attackPower', from: 25, to: 22 },
  { patch: '11.3', item: 'Omertà', stat: 'attackPower', from: 20, to: 22 },
  { patch: '11.3', item: 'Cowboy Hat', stat: 'attackPower', from: 27, to: 28 },
  { patch: '11.3', item: 'Demon Mask', stat: 'maxHp', from: 230, to: 250 },
  { patch: '11.3', item: 'Tactical Goggles', stat: 'maxHp', from: 150, to: 200 },
  { patch: '11.3', item: "The Dragon's Fury", stat: 'skillAmp', from: 55, to: 60 },
  { patch: '11.3', item: "The Dragon's Fury", stat: 'cooldownReduction', from: 15, to: 10 },
  { patch: '11.3', item: 'The Star of the Wilds', stat: 'attackPower', from: 37, to: 38 },
  { patch: '11.3', item: "Centipede's Pauldron", stat: 'defense', from: 16, to: 15 },
  { patch: '11.3', item: 'Wild Walkers', stat: 'hpRegenRatio', from: 1, to: 0, remove: true },
  { patch: '11.4', item: 'Glock 48', stat: 'attackPower', from: 68, to: 66 },
  { patch: '11.4', item: 'Molten Malachite', stat: 'attackPower', from: 80, to: 77 },
  { patch: '11.4', item: 'Rebel With A Cause', stat: 'maxHp', from: 220, to: 200 },
  { patch: '11.4', item: 'Rebel With A Cause', stat: 'cooldownReduction', from: 20, to: 15 },
  { patch: '11.4', item: 'Kabana', stat: 'defense', from: 25, to: 28 },
  { patch: '11.4', item: 'Helix', stat: 'defense', from: 18, to: 20 },
  { patch: '11.5', item: 'Temperance', stat: 'healerGiveHpHealRatio', from: 0.05, to: 0.04 },
  { patch: '11.5', item: 'The Sun', stat: 'healerGiveHpHealRatio', from: 0.1, to: 0.08 },
  { patch: '11.5', item: 'Ouranos', stat: 'attackSpeedRatio', from: 0.4, to: 0.3 },
  { patch: '11.5', item: 'Ghillie Suit', stat: 'attackSpeedRatio', from: 0.15, to: 0.2 },
  { patch: '11.5', item: 'Áo Dài', stat: 'attackPower', from: 22, to: 20 },
  { patch: '11.5', item: 'Red Star', stat: 'attackPower', from: 18, to: 20 },
  { patch: '11.5', item: 'Black Flame Dragon', stat: 'defense', from: 45, to: 43 },
  { patch: '11.5', item: 'White Witch Hat', stat: 'skillAmp', from: 65, to: 68 },
  { patch: '11.5', item: 'White Mitre', stat: 'healerGiveHpHealRatio', from: 0.05, to: 0.07 },
  { patch: '11.5', item: 'Minuteman Armband', stat: 'attackSpeedRatio', from: 0.15, to: 0.18 },
  { patch: '11.5', item: 'Sultan Adorned', stat: 'attackPower', from: 28, to: 30 },
  { patch: '11.5', item: 'Dice of Destiny', stat: 'criticalStrikeDamage', from: 0.09, to: 0.1 },
  { patch: '11.5', item: 'Fáfnir', stat: 'maxHpByLv', from: 30, to: 26 },
  { patch: '11.6', item: 'The Wall', stat: 'attackPower', from: 60, to: 58 },
  { patch: '11.6', item: 'Wonderful Tonight', stat: 'attackPower', from: 68, to: 66 },
  { patch: '11.6', item: 'Deathadder Queen', stat: 'attackPower', from: 57, to: 60 },
  { patch: '11.6', item: 'Black Mamba King', stat: 'attackPower', from: 49, to: 52 },
  { patch: '11.6', item: 'Deathadder Queen MT', stat: 'attackPower', from: 63, to: 66 },
  { patch: '11.6', item: 'Deathadder Queen FC', stat: 'attackPower', from: 70, to: 72 },
  { patch: '11.6', item: 'Black Mamba King TL', stat: 'attackPower', from: 49, to: 52 },
  { patch: '11.6', item: 'Black Mamba King FC', stat: 'attackPower', from: 62, to: 65 },
  { patch: '11.6', item: 'Deathadder Queen VBS', stat: 'attackPower', from: 75, to: 78 },
  { patch: '11.6', item: 'Black Mamba King VBS', stat: 'attackPower', from: 66, to: 69 },
  { patch: '11.6', item: 'The Revenant', stat: 'maxHp', from: 200, to: 250 },
  { patch: '11.6', item: 'Nightingale', stat: 'cooldownReduction', from: 10, to: 15 },
  { patch: '11.6', item: 'Nightingale', stat: 'healerGiveHpHealRatio', from: 0.05, to: 0.04 },
  { patch: '11.7', item: 'Joyeuse', stat: 'attackPower', from: 61, to: 58 }
];

// ---------------------------------------------------------------------------
// 5. 潜能（增幅）变更 —— dakLoadoutAssets.json
// ---------------------------------------------------------------------------
const TRAIT_CHANGES = [
  {
    patch: '12.0',
    id: 7211301,
    name: '爆炸仙人掌',
    type: 'Sub1 -> Core',
    set: { type: 'Core' },
    tooltip: '对敌人实验体造成伤害时，将为目标附着持续4秒的仙人掌。(对同一目标冷却：8秒)除自己外的队友实验体或召唤物使用普攻或者独立技能对仙人掌附着的目标造成伤害时，仙人掌将爆炸并造成8~160(+敌人体力上限4%)的技能伤害，并使队友移动速度增加15%、持续2秒。持续时间内未触发爆炸时，仙人掌将自动爆炸并造成减少了70%的伤害。对野生动物造成伤害量增加150%。',
    note: '副潜能 → 核心潜能；伤害 10~150(+体力上限5%) → 8~160(+体力上限4%)。'
  },
  {
    patch: '12.0',
    id: 7200101,
    name: '超再生',
    type: 'Core -> Sub1',
    set: { type: 'Sub1' },
    tooltip: '自身技能或潜能生成的护盾和体力恢复量持续增加5%。',
    note: '核心潜能 → 副潜能；护盾与体力恢复增加 8% → 5%；“被护盾/治疗的目标获得适应力”效果已移除。'
  }
];

// ---------------------------------------------------------------------------
// 未应用项（仅记录到报告，供人工补充）
// ---------------------------------------------------------------------------
const UNAPPLIED = [
  { patch: '11.3', target: 'Tsubame P 生死印记', reason: "目标体力上限系数内嵌额外攻击力（+Target's Max HP 4/7/10(+Extra Attack Power 5%)%），当前公式语法无法表达。" },
  { patch: '11.3', target: 'Kenneth W 地狱火 / Darko W / Mai R / Leni E', reason: '改动为护盾、治疗或承伤减免，计算器不建模。' },
  { patch: '11.3', target: '物品技能 惩戒 30→50', reason: '装备主动/被动技能伤害未在计算器中建模。' },
  { patch: '11.4', target: 'Jackie Q 连斩', reason: '现有结构化表中该技能有两段伤害行，补丁只给出一组数值，无法确定对应行。' },
  { patch: '11.4', target: 'Hyunwoo E 先发制人', reason: '补丁数值不含固定基础值，与现有结构化行 100/150/200/250/300 冲突，无法确定基准。' },
  { patch: '11.4', target: 'Cathy Q 动脉切开术 强化普攻系数 50%→55%', reason: '补丁只给系数、未给基础值，且当前没有对应条目。' },
  { patch: '11.4', target: 'Alonso Q 追加伤害（等级*8→*6）', reason: '公式变量不含实验体等级。' },
  { patch: '11.4', target: 'Mirka E2 强化冲击 33%→40%', reason: '按冲击槽比例结算，计算器不建模。' },
  { patch: '11.4', target: '物品技能 电击 目标体力上限 4%→5%', reason: '装备技能伤害未建模。' },
  { patch: '11.5', target: 'Tia Q 笔触', reason: '现有条目为 E 槽三色笔触且数值体系不同，无法安全对应。' },
  { patch: '11.5', target: 'Isol Q 军事用炸药 爆炸伤害增加', reason: '补丁基础值 10/15/20/25/30 与现有结构化行 10/16/22/28/34 不一致，无法确定对应关系。' },
  { patch: '11.5', target: 'Echion R 中毒化（自身额外体力 12%→14%）', reason: '自身额外体力不参与当前伤害公式。' },
  { patch: '11.5', target: 'Xuelin P / Aya P / Alex P / Alonso W / Johann Q,W / Leni W,E', reason: '改动为治疗、护盾、减速或承伤减免。' },
  { patch: '11.6', target: 'Xiukai R 火冒三丈（自身体力上限 5%→6%）', reason: '自身体力上限不参与当前伤害公式。' },
  { patch: '11.6', target: 'Adina Q 日曜连携持续伤害 11%→10%', reason: '该伤害段无基础值且当前无对应条目。' },
  { patch: '11.6', target: 'Cathy P 手术刀（护盾/负伤伤害）', reason: '补丁只给系数与百分比，无基础值。' },
  { patch: '11.6', target: 'Abigail W / Estelle E / Adriana P 减防', reason: '护盾、承伤减免与减防由目标栏手动输入，不按英雄建模。' },
  { patch: '11.7', target: 'Rio Q 弓道本能（半弓）', reason: '伤害为攻击力百分比 × 普攻增幅，无基础值且普攻增幅倍率未建模。' },
  { patch: '11.7', target: 'Coraline W 真实之镜 技能增幅 3/5/7%→5/7/9%', reason: '为技能增幅加成而非技能伤害，需在装备/属性侧手动填写。' },
  { patch: '11.7', target: 'Bihyung W / Mai E / Hyunwoo Q / Tazia E', reason: '改动为护盾、移动速度或减速。' },
  { patch: '12.0', target: '野生动物属性、复活机制、时空球阶段、道具箱等', reason: '与伤害计算无关。' },
  { patch: '12.0', target: '新实验体 Lucia、Seres', reason: '12.0 只公布名称，尚无技能与属性数据。' }
];

// ---------------------------------------------------------------------------
// 应用逻辑
// ---------------------------------------------------------------------------
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const writeJson = async (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');

function basesText(bases) {
  return bases.join(',');
}

function matchesSkill(entry, change, heroZh) {
  if (change.manualId) return entry.id === change.manualId;
  if (entry.hero !== heroZh) return false;
  const groups = change.groups || (change.group ? [change.group] : []);
  if (groups.length && !groups.includes(Number(entry.group))) return false;
  if (change.dataKey && entry.dataKey !== change.dataKey) return false;
  return true;
}

function applySkillPayload(entry, change, meta) {
  if (change.bases) {
    entry.bases = basesText(change.bases);
    entry.maxLevel = change.bases.length;
  }
  if (change.formula) entry.formula = change.formula;
  entry.updatedAt = meta.at;
  entry.sourceDate = meta.at;
  entry.sourceVersion = change.patch;
  entry.sourceLabel = `${change.patch} / ${meta.date}`;
  entry.sourceUrl = patchUrl(change.patch);
  entry.sourceTitle = meta.title;
  entry.source = 'official-patch-note';
  if (change.after) entry.coefficientText = change.after;
  entry.sourceNote = [`官方补丁 ${change.patch} 数值：${change.after || ''}`, change.note].filter(Boolean).join(' ');
}

function newSkillEntry(change, heroZh, heroKey, meta) {
  const entry = {
    id: `patch-${change.patch.replace('.', '')}-${heroKey.toLowerCase()}-${change.group}-${String(change.dataKey).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
    hero: heroZh,
    heroKey,
    title: change.title,
    bases: basesText(change.bases),
    formula: change.formula,
    maxLevel: change.bases.length,
    group: change.group,
    skillId: change.skillId,
    dataKey: change.dataKey
  };
  applySkillPayload(entry, change, meta);
  return entry;
}

async function main() {
  const files = {
    localConfig: path.join(dataDir, 'localConfig.json'),
    fallback: path.join(dataDir, 'externalSkillDamageFallback.json'),
    augments: path.join(dataDir, 'skillDamageAugments.json'),
    damageTable: path.join(dataDir, 'erSkillDamageTable.json'),
    gameData: path.join(dataDir, 'erGameData.json'),
    mastery: path.join(dataDir, 'masteryStats.json'),
    loadout: path.join(dataDir, 'dakLoadoutAssets.json')
  };

  const localConfig = await readJson(files.localConfig);
  const fallback = await readJson(files.fallback);
  const augments = await readJson(files.augments);
  const damageTable = await readJson(files.damageTable);
  const gameData = await readJson(files.gameData);
  const mastery = await readJson(files.mastery);
  const loadout = await readJson(files.loadout);

  const heroByKey = new Map();
  for (const character of gameData.characters) {
    heroByKey.set(character.id, character);
    heroByKey.set(character.englishName.replace(/\s/g, ''), character);
  }

  const report = { generatedAt: new Date().toISOString(), patches: PATCHES, skills: [], mastery: [], characters: [], equipment: [], traits: [], unapplied: UNAPPLIED, warnings: [] };

  // --- 技能 ---
  for (const change of SKILL_CHANGES) {
    const meta = PATCHES[change.patch];
    const character = change.manualId ? null : heroByKey.get(change.heroKey);
    if (!change.manualId && !character) {
      report.warnings.push(`未找到实验体 ${change.heroKey}`);
      continue;
    }
    const heroZh = character ? character.name : null;
    const touched = [];

    for (const [label, list] of [
      ['localConfig', localConfig.skills],
      ['externalSkillDamageFallback', fallback.skills],
      ['skillDamageAugments', augments.skills],
      ['erGameData', gameData.skills]
    ]) {
      for (const entry of list) {
        if (!matchesSkill(entry, change, heroZh)) continue;
        applySkillPayload(entry, change, meta);
        touched.push(`${label}:${entry.id}`);
      }
    }

    // 结构化伤害表：能用 base + 系数 表达时同步数值
    if (!change.manualId) {
      const changeGroups = change.groups || (change.group ? [change.group] : []);
      for (const row of damageTable.damageRows) {
        if (row.heroName !== heroZh) continue;
        if (changeGroups.length && !changeGroups.includes(Number(row.skillGroup))) continue;
        if (change.dataKey && row.baseKey !== change.dataKey) continue;
        if (change.bases) {
          for (let index = 0; index < 6; index += 1) {
            row[`lv${index + 1}`] = index < change.bases.length ? change.bases[index] : '';
          }
        }
        if (change.tableCoef !== undefined) {
          const levels = change.bases ? change.bases.length : 5;
          for (let index = 0; index < 6; index += 1) {
            row[`coefLv${index + 1}`] = index < levels ? change.tableCoef : '';
          }
        }
        row.coefficientText = change.after || row.coefficientText;
        touched.push(`erSkillDamageTable:${row.standardId}`);
      }
    }

    if (!touched.length && change.mode !== 'update') {
      const entry = newSkillEntry(change, heroZh, change.heroKey, meta);
      fallback.skills.push(entry);
      localConfig.skills.push(JSON.parse(JSON.stringify(entry)));
      touched.push(`created:${entry.id}`);
    }

    if (!touched.length) {
      report.warnings.push(`未匹配技能变更：${change.patch} ${change.heroKey || change.manualId} ${change.dataKey || ''}`);
    }

    report.skills.push({
      patch: change.patch,
      hero: heroZh || change.manualId,
      heroKey: change.heroKey || null,
      slot: change.slot || null,
      dataKey: change.dataKey || null,
      title: change.title || null,
      before: change.before || null,
      after: change.after || null,
      bases: change.bases || null,
      formula: change.formula || null,
      note: change.note || null,
      targets: touched
    });
  }

  // --- 熟练度 ---
  for (const change of MASTERY_CHANGES) {
    const character = heroByKey.get(change.heroKey);
    if (!character) {
      report.warnings.push(`熟练度：未找到实验体 ${change.heroKey}`);
      continue;
    }
    const record = mastery.find((item) => item.characterCode === character.code && item.type === change.type);
    if (!record) {
      report.warnings.push(`熟练度：未找到 ${change.heroKey} / ${change.type}`);
      continue;
    }
    const option = (record.options || []).find((item) => item.stat === change.stat);
    if (!option) {
      report.warnings.push(`熟练度：${change.heroKey}/${change.type} 缺少属性 ${change.stat}`);
      continue;
    }
    const actual = option.value;
    if (Math.abs(actual - change.from) > 1e-9) {
      report.warnings.push(`熟练度对不上：${change.heroKey}/${change.type}/${change.stat} 当前 ${actual}，补丁前值 ${change.from}`);
    }
    option.value = change.to;
    report.mastery.push({ patch: change.patch, hero: character.name, heroKey: change.heroKey, type: change.type, stat: change.stat, from: actual, to: change.to });
  }

  // --- 实验体基础属性 ---
  for (const change of CHARACTER_CHANGES) {
    const character = heroByKey.get(change.heroKey);
    if (!character) {
      report.warnings.push(`实验体属性：未找到 ${change.heroKey}`);
      continue;
    }
    const [section, key] = change.path.split('.');
    const container = character[section];
    if (!container) {
      report.warnings.push(`实验体属性：${change.heroKey} 缺少 ${section}`);
      continue;
    }
    const actual = container[key];
    if (Math.abs(Number(actual) - change.from) > 1e-9) {
      report.warnings.push(`实验体属性对不上：${change.heroKey}.${change.path} 当前 ${actual}，补丁前值 ${change.from}`);
    }
    container[key] = change.to;
    report.characters.push({ patch: change.patch, hero: character.name, heroKey: change.heroKey, path: change.path, from: actual, to: change.to });
  }

  for (const change of CHARACTER_PROFILE_CHANGES) {
    const character = heroByKey.get(change.heroKey);
    if (!character) {
      report.warnings.push(`实验体档案：未找到 ${change.heroKey}`);
      continue;
    }
    Object.assign(character, change.set);
    report.characters.push({ patch: change.patch, hero: character.name, heroKey: change.heroKey, path: Object.keys(change.set).join(','), from: null, to: JSON.stringify(change.set), note: change.note });
  }

  // --- 装备 ---
  const l10nEnglish = await readFile(path.join(rootDir, '.er-gamedata-cache', 'l10n', 'English.txt'), 'utf8');
  const englishByCode = new Map();
  for (const line of l10nEnglish.split(/\r?\n/)) {
    const separator = line.indexOf('┃');
    if (separator < 0) continue;
    const match = /^Item\/Name\/(\d+)$/.exec(line.slice(0, separator));
    if (match) englishByCode.set(match[1], line.slice(separator + 1));
  }
  const normalizeName = (value) => String(value).replace(/[’‘]/g, "'").normalize('NFC').trim();
  const equipmentByEnglish = new Map();
  for (const item of gameData.equipment) {
    const english = englishByCode.get(String(item.code));
    if (english) equipmentByEnglish.set(normalizeName(english), item);
  }
  const localEquipmentByCode = new Map(localConfig.equipment.filter((item) => item.code).map((item) => [item.code, item]));

  for (const change of EQUIPMENT_CHANGES) {
    const item = equipmentByEnglish.get(normalizeName(change.item));
    if (!item) {
      report.warnings.push(`装备：未找到 ${change.item}`);
      continue;
    }
    const targets = [item, localEquipmentByCode.get(item.code)].filter(Boolean);
    const actual = item.stats?.[change.stat];
    if (actual === undefined ? !change.remove : Math.abs(Number(actual) - change.from) > 1e-9) {
      report.warnings.push(`装备数值对不上：${change.item}.${change.stat} 当前 ${actual}，补丁前值 ${change.from}`);
    }
    for (const target of targets) {
      target.stats = target.stats || {};
      if (change.remove) delete target.stats[change.stat];
      else target.stats[change.stat] = change.to;
      // 同步扁平别名字段
      const alias = { attackPower: 'attackPower', skillAmp: 'ap', cooldownReduction: 'cd', defense: 'defense', maxHp: 'maxHp', sightRange: 'sightRange', penetrationDefense: 'pen', penetrationDefenseRatio: 'penPct', skillAmpRatio: 'apPct' }[change.stat];
      if (alias) target[alias] = change.remove ? 0 : change.to;
    }
    report.equipment.push({ patch: change.patch, item: change.item, name: item.name, code: item.code, stat: change.stat, from: actual ?? null, to: change.remove ? null : change.to, removed: Boolean(change.remove) });
  }

  // --- 潜能 ---
  for (const change of TRAIT_CHANGES) {
    const trait = loadout.traits.find((item) => item.id === change.id);
    if (!trait) {
      report.warnings.push(`潜能：未找到 ${change.id}`);
      continue;
    }
    const previousType = trait.type;
    Object.assign(trait, change.set);
    if (change.tooltip) trait.tooltip = change.tooltip;
    report.traits.push({ patch: change.patch, id: change.id, name: trait.name, typeFrom: previousType, typeTo: trait.type, note: change.note });
  }

  // --- 元数据 ---
  const stamp = {
    officialPatchUpdates: {
      appliedAt: new Date().toISOString(),
      patches: Object.entries(PATCHES).map(([version, meta]) => ({ version, date: meta.date, url: patchUrl(version) }))
    }
  };
  Object.assign(fallback, stamp);
  Object.assign(augments, stamp);
  Object.assign(damageTable, stamp);
  Object.assign(gameData, stamp);
  Object.assign(loadout, stamp);

  await writeJson(files.localConfig, localConfig);
  await writeJson(files.fallback, fallback);
  await writeJson(files.augments, augments);
  await writeJson(files.damageTable, damageTable);
  await writeJson(files.gameData, gameData);
  await writeJson(files.mastery, mastery);
  await writeJson(files.loadout, loadout);

  await mkdir(reportDir, { recursive: true });
  await writeJson(path.join(reportDir, 'apply-report.json'), report);

  console.log(JSON.stringify({
    skills: report.skills.length,
    created: report.skills.filter((item) => item.targets.some((target) => target.startsWith('created:'))).length,
    mastery: report.mastery.length,
    characters: report.characters.length,
    equipment: report.equipment.length,
    traits: report.traits.length,
    unapplied: report.unapplied.length,
    warnings: report.warnings
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
