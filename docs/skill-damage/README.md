# ER 英雄技能伤害等级表

数据来源：https://github.com/pypy-vrc/er-gamedata

伤害结构来源为 `.er-gamedata-cache/data/Character.json`、`SkillGroup.json`、`Skill.json`、`SkillExtension.json`。英雄技能名称与描述优先使用 DAK.GG 当前接口 `https://er.dakgg.io/api/v1/data/skills?hl=zh-CN`，该接口与路线模拟器页面使用的文本保持同步；DAK.GG 没有的技能变体再回退到 `l10n/ChineseSimplified.txt`。生成时间：2026-05-21T23:05:42.052Z

## 文件

- 结构化伤害等级表 CSV：`docs/skill-damage/er-skill-damage-table.csv`
- 覆盖索引 CSV：`docs/skill-damage/er-skill-damage-coverage.csv`
- 完整 JSON：`docs/skill-damage/er-skill-damage-table.json`
- 前端可 import 副本：`src/data/erSkillDamageTable.json`

## 字段说明

- `standardId`：标准化命名，格式为 `{heroCode}-{heroKey}-{slot}-{skillGroup}-{damageKey}`。
- `lv1...lv6`：对应技能等级的基础伤害；空值表示该伤害段没有该等级。
- `coefLv1...coefLv5`：对应等级的技能增幅系数；若系数为固定数值，则所有等级相同。
- `formula`：当前可结构化表达的公式骨架，通常为 `base + coefficient * skillAmp`。
- `coefficientText`：中文技能系数说明原文，保留用于人工核对。
- `textSource`：技能名称和说明的文本来源；优先为 `dak.gg api zh-CN`。

## 覆盖统计

| 项目 | 数量 |
| --- | --- |
| 英雄数 | 89 |
| 英雄技能组/变体数 | 620 |
| 结构化伤害行数 | 185 |
| 有结构化伤害的技能组数 | 52 |
| 无结构化伤害的技能组数 | 568 |

## 覆盖状态

| 状态 | 数量 |
| --- | --- |
| extension_without_damage_fields | 22 |
| structured | 52 |
| no_structured_extension_in_er-gamedata | 546 |

说明：`pypy-vrc/er-gamedata` 当前只有部分技能在 `SkillExtension.json` 中提供可展开的伤害数值。对于只有 `Skill/Group/Coef` 文本模板、但没有结构化参数来源的技能，本导出不会猜测伤害数值，会在覆盖索引中标记为 `no_structured_extension_in_er-gamedata`。

## 结构化伤害表预览

| standardId | 英雄 | 槽位 | 技能 | 伤害段 | 基础字段 | 系数字段 | Lv1 | Lv2 | Lv3 | Lv4 | Lv5 | 公式 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 001-jackie-q-1001200-damage-by-level | 杰琪 | Q | 连斩 | 基础伤害 | DamageByLevel | SkillApCoef | 20 | 40 | 60 | 80 | 100 | base + (SkillApCoef) * skillAmp |
| 001-jackie-q-1001200-damage-by-level-2 | 杰琪 | Q | 连斩 | 基础伤害 2 | DamageByLevel_2 | SkillApCoef_2 | 30 | 50 | 70 | 90 | 110 | base + (SkillApCoef_2) * skillAmp |
| 001-jackie-q-1001200-dfs-damage-by-level | 杰琪 | Q | 连斩 | 持续伤害 | DFS_DamageByLevel | DFS_DamageApCoefByLevel | 80 | 110 | 140 | 170 | 200 | base + (DFS_DamageApCoefByLevel) * skillAmp |
| 001-jackie-q-1001210-damage-by-level | 杰琪 | Q | 连斩 | 基础伤害 | DamageByLevel | SkillApCoef | 20 | 40 | 60 | 80 | 100 | base + (SkillApCoef) * skillAmp |
| 001-jackie-q-1001210-damage-by-level-2 | 杰琪 | Q | 连斩 | 基础伤害 2 | DamageByLevel_2 | SkillApCoef_2 | 30 | 50 | 70 | 90 | 110 | base + (SkillApCoef_2) * skillAmp |
| 001-jackie-q-1001210-dfs-damage-by-level | 杰琪 | Q | 连斩 | 持续伤害 | DFS_DamageByLevel | DFS_DamageApCoefByLevel | 80 | 110 | 140 | 170 | 200 | base + (DFS_DamageApCoefByLevel) * skillAmp |
| 001-jackie-e-1001400-damage-by-level | 杰琪 | E | 袭击 | 基础伤害 | DamageByLevel | SkillApCoefByLevel | 10 | 80 | 150 | 220 | 290 | base + (SkillApCoefByLevel) * skillAmp |
| 001-jackie-r-1001500-dfs-damage-by-level | 杰琪 | R | 电锯杀人狂 | 持续伤害 | DFS_DamageByLevel | DFS_DamageApCoefByLevel | 10 | 15 | 20 |  |  | base + (DFS_DamageApCoefByLevel) * skillAmp |
| 001-jackie-r-1001500-finish-damage-by-level | 杰琪 | R | 电锯杀人狂 | 终结伤害 | FinishDamageByLevel | FinishSkillApCoef | 300 | 500 | 800 |  |  | base + (FinishSkillApCoef) * skillAmp |
| 001-jackie-r-1001510-dfs-damage-by-level | 杰琪 | R | 屠杀 | 持续伤害 | DFS_DamageByLevel | DFS_DamageApCoefByLevel | 10 | 15 | 20 |  |  | base + (DFS_DamageApCoefByLevel) * skillAmp |
| 001-jackie-r-1001510-finish-damage-by-level | 杰琪 | R | 屠杀 | 终结伤害 | FinishDamageByLevel | FinishSkillApCoef | 300 | 500 | 800 |  |  | base + (FinishSkillApCoef) * skillAmp |
| 002-aya-q-1002200-damage-by-level | 阿雅 | Q | 二连射 | 基础伤害 | DamageByLevel | SkillApCoef | 20 | 60 | 100 | 140 | 180 | base + (SkillApCoef) * skillAmp |
| 002-aya-w-1002300-damage-by-level | 阿雅 | W | 稳定射击 | 基础伤害 | DamageByLevel | SkillApCoef | 20 | 40 | 60 | 80 | 100 | base + (SkillApCoef) * skillAmp |
| 002-aya-r-1002500-damage-by-level | 阿雅 | R | 空弹 | 基础伤害 | DamageByLevel | SkillApCoef | 200 | 350 | 500 |  |  | base + (SkillApCoef) * skillAmp |
| 003-fiora-q-1003200-damage-by-level | 菲欧娜 | Q | 长刺 | 基础伤害 | DamageByLevel | SkillApCoef | 75 | 150 | 225 | 300 | 375 | base + (SkillApCoef) * skillAmp |
| 003-fiora-e-1003400-damage-by-level | 菲欧娜 | E | 前进&后退 | 基础伤害 | DamageByLevel | SkillApCoef | 100 | 150 | 200 | 250 | 300 | base + (SkillApCoef) * skillAmp |
| 003-fiora-e-1003410-damage-by-level | 菲欧娜 | E | 前进&后退 | 基础伤害 | DamageByLevel | SkillApCoef | 100 | 150 | 200 | 250 | 300 | base + (SkillApCoef) * skillAmp |
| 004-magnus-q-1004200-damage-by-level | 马格努斯 | Q | 破碎弹 | 基础伤害 | DamageByLevel | SkillApCoef | 80 | 140 | 200 | 260 | 320 | base + (SkillApCoef) * skillAmp |
| 004-magnus-w-1004300-damage-by-level | 马格努斯 | W | 17对1 | 基础伤害 | DamageByLevel | SkillApCoef | 20 | 30 | 35 | 45 | 50 | base + (SkillApCoef) * skillAmp |
| 004-magnus-e-1004400-damage-by-level | 马格努斯 | E | 猛击 | 基础伤害 | DamageByLevel | SkillApCoef | 80 | 135 | 190 | 245 | 300 | base + (SkillApCoef) * skillAmp |
| 004-magnus-r-1004500-damage-by-level | 马格努斯 | R | 暴走飞车 | 基础伤害 | DamageByLevel | SkillApCoef | 300 | 500 | 700 |  |  | base + (SkillApCoef) * skillAmp |
| 005-zahir-p-1005100-damage-by-level | 扎希尔 | P | 死神之目 | 基础伤害 | DamageByLevel | SkillApCoef | 50 | 75 | 100 |  |  | base + (SkillApCoef) * skillAmp |
| 005-zahir-q-1005200-damage-by-level | 扎希尔 | Q | 那罗延法宝 | 基础伤害 | DamageByLevel | SkillApCoef | 40 | 100 | 160 | 220 | 280 | base + (SkillApCoef) * skillAmp |
| 005-zahir-q-1005200-damage-by-level-2 | 扎希尔 | Q | 那罗延法宝 | 基础伤害 2 | DamageByLevel_2 |  | 75 | 150 | 225 | 300 | 375 | base |
| 005-zahir-w-1005300-damage-by-level | 扎希尔 | W | 甘狄拔 | 基础伤害 | DamageByLevel | SkillApCoef | 40 | 60 | 80 | 100 | 120 | base + (SkillApCoef) * skillAmp |
| 005-zahir-e-1005400-damage-by-level | 扎希尔 | E | 风神法宝 | 基础伤害 | DamageByLevel | SkillApCoef | 80 | 110 | 140 | 170 | 200 | base + (SkillApCoef) * skillAmp |
| 005-zahir-r-1005500-damage-by-level | 扎希尔 | R | 跋尔伽婆 | 基础伤害 | DamageByLevel | SkillApCoef | 200 | 350 | 500 |  |  | base + (SkillApCoef) * skillAmp |
| 005-zahir-r-1005500-damage-by-level-2 | 扎希尔 | R | 跋尔伽婆 | 基础伤害 2 | DamageByLevel_2 | SkillApCoef_2 | 50 | 85 | 120 |  |  | base + (SkillApCoef_2) * skillAmp |
| 006-nadine-q-1006200-max-damage-by-level | 娜町 | Q | 黄牛之眼 | 最高伤害 | MaxDamageByLevel | MaxSkillApCoef | 120 | 190 | 260 | 330 | 400 | base + (MaxSkillApCoef) * skillAmp |
| 006-nadine-q-1006200-min-damage-by-level | 娜町 | Q | 黄牛之眼 | 最低伤害 | MinDamageByLevel | MinSkillApCoef | 60 | 95 | 130 | 165 | 200 | base + (MinSkillApCoef) * skillAmp |
| 006-nadine-w-1006300-damage-by-level | 娜町 | W | 松鼠陷阱 | 基础伤害 | DamageByLevel | SkillApCoef | 100 | 170 | 240 | 310 | 380 | base + (SkillApCoef) * skillAmp |
| 006-nadine-w-1006300-damage-by-level-2 | 娜町 | W | 松鼠陷阱 | 基础伤害 2 | DamageByLevel_2 |  | 100 | 140 | 180 | 220 | 260 | base |
| 006-nadine-w-1006310-damage-by-level | 娜町 | W | 松鼠陷阱 | 基础伤害 | DamageByLevel | SkillApCoef | 100 | 170 | 240 | 310 | 380 | base + (SkillApCoef) * skillAmp |
| 006-nadine-w-1006310-damage-by-level-2 | 娜町 | W | 松鼠陷阱 | 基础伤害 2 | DamageByLevel_2 |  | 100 | 140 | 180 | 220 | 260 | base |
| 006-nadine-r-1006500-damage-by-level | 娜町 | R | 狼之猛袭 | 基础伤害 | DamageByLevel |  | 50 | 100 | 150 |  |  | base |
| 007-hyunwoo-q-1007200-damage-by-level | 玄佑 | Q | 踩踏 | 基础伤害 | DamageByLevel | SkillApCoef | 100 | 150 | 200 | 250 | 300 | base + (SkillApCoef) * skillAmp |
| 007-hyunwoo-e-1007400-damage-by-level | 玄佑 | E | 先发制人 | 基础伤害 | DamageByLevel |  | 100 | 150 | 200 | 250 | 300 | base |
| 007-hyunwoo-r-1007500-max-damage-by-level | 玄佑 | R | 核冲击 | 最高伤害 | MaxDamageByLevel | MaxSkillApCoef | 600 | 900 | 1200 |  |  | base + (MaxSkillApCoef) * skillAmp |
| 007-hyunwoo-r-1007500-min-damage-by-level | 玄佑 | R | 核冲击 | 最低伤害 | MinDamageByLevel | MinSkillApCoef | 150 | 225 | 300 |  |  | base + (MinSkillApCoef) * skillAmp |
| 008-hart-q-1008200-max-skill-damage | 哈特 | Q | 延音 | 最高技能伤害 | MaxSkillDamage | MaxSkillApCoef | 210 | 270 | 330 | 390 | 450 | base + (MaxSkillApCoef) * skillAmp |
| 008-hart-q-1008200-min-skill-damage | 哈特 | Q | 延音 | 最低技能伤害 | MinSkillDamage | MinSkillApCoef | 70 | 90 | 110 | 130 | 150 | base + (MinSkillApCoef) * skillAmp |
| 008-hart-q-1008210-max-skill-damage | 哈特 | Q | 延音 | 最高技能伤害 | MaxSkillDamage | MaxSkillApCoef | 210 | 270 | 330 | 390 | 450 | base + (MaxSkillApCoef) * skillAmp |
| 008-hart-q-1008210-min-skill-damage | 哈特 | Q | 延音 | 最低技能伤害 | MinSkillDamage | MinSkillApCoef | 70 | 90 | 110 | 130 | 150 | base + (MinSkillApCoef) * skillAmp |
| 008-hart-e-1008400-damage-by-level | 哈特 | E | 震音 | 基础伤害 | DamageByLevel | SkillApCoef | 20 | 30 | 40 | 50 | 60 | base + (SkillApCoef) * skillAmp |
| 008-hart-e-1008410-damage-by-level | 哈特 | E | 震音 | 基础伤害 | DamageByLevel | SkillApCoef | 20 | 30 | 40 | 50 | 60 | base + (SkillApCoef) * skillAmp |
| 009-isol-q-1009200-additional-damage-per-hit | 埃索 | Q | 军事用炸药 | 每次命中追加伤害 | AdditionalDamagePerHit | AdditionalSkillApCoefPerHit | 10 | 16 | 22 | 28 | 34 | base + (AdditionalSkillApCoefPerHit) * skillAmp |
| 009-isol-q-1009200-base-damage | 埃索 | Q | 军事用炸药 | 基础伤害 | BaseDamage | BaseSkillApCoef | 50 | 75 | 100 | 125 | 150 | base + (BaseSkillApCoef) * skillAmp |
| 009-isol-w-1009300-damage | 埃索 | W | 叛军突击 | 伤害 | Damage | SkillApCoef | 20 | 40 | 60 | 80 | 100 | base + (SkillApCoef) * skillAmp |
| 009-isol-w-1009300-damage-term-time | 埃索 | W | 叛军突击 | DamageTermTime | DamageTermTime | SkillApCoef | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base + (SkillApCoef) * skillAmp |
| 009-isol-r-1009500-damage | 埃索 | R | MOK 军用地雷 | 伤害 | Damage | SkillApCoef | 80 | 130 | 180 |  |  | base + (SkillApCoef) * skillAmp |
| 010-li-dailin-p-1010100-a1-ap-damage | 李黛琳 | P | 酒醉值 | A1ApDamage | A1ApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 010-li-dailin-p-1010100-a1-base-damage | 李黛琳 | P | 酒醉值 | A1 基础伤害 | A1BaseDamage | A1ApDamage | 20 | 40 | 60 | 80 | 100 | base + (A1ApDamage) * skillAmp |
| 010-li-dailin-p-1010100-a1-reinforce-ap-damage | 李黛琳 | P | 酒醉值 | A1ReinforceApDamage | A1ReinforceApDamage |  | 0.8 | 0.8 | 0.8 | 0.8 | 0.8 | base |
| 010-li-dailin-p-1010100-a1-reinforce-base-damage | 李黛琳 | P | 酒醉值 | A1 强化基础伤害 | A1ReinforceBaseDamage | A1ReinforceApDamage | 32 | 64 | 96 | 128 | 160 | base + (A1ReinforceApDamage) * skillAmp |
| 010-li-dailin-p-1010100-a3-ap-damage | 李黛琳 | P | 酒醉值 | A3ApDamage | A3ApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 010-li-dailin-p-1010100-a3-base-damage | 李黛琳 | P | 酒醉值 | A3 基础伤害 | A3BaseDamage | A3ApDamage | 80 | 125 | 170 | 215 | 260 | base + (A3ApDamage) * skillAmp |
| 010-li-dailin-p-1010100-a4-ap-damage | 李黛琳 | P | 酒醉值 | A4ApDamage | A4ApDamage |  | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 | base |
| 010-li-dailin-p-1010100-a4-damage-base | 李黛琳 | P | 酒醉值 | A4 基础伤害 | A4DamageBase | A4ApDamage | 40 | 70 | 100 |  |  | base + (A4ApDamage) * skillAmp |
| 010-li-dailin-p-1010110-a1-ap-damage | 李黛琳 | P | 맹호청권 | A1ApDamage | A1ApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 010-li-dailin-p-1010110-a1-base-damage | 李黛琳 | P | 맹호청권 | A1 基础伤害 | A1BaseDamage | A1ApDamage | 20 | 40 | 60 | 80 | 100 | base + (A1ApDamage) * skillAmp |
| 010-li-dailin-p-1010110-a1-reinforce-ap-damage | 李黛琳 | P | 맹호청권 | A1ReinforceApDamage | A1ReinforceApDamage |  | 0.8 | 0.8 | 0.8 | 0.8 | 0.8 | base |
| 010-li-dailin-p-1010110-a1-reinforce-base-damage | 李黛琳 | P | 맹호청권 | A1 强化基础伤害 | A1ReinforceBaseDamage | A1ReinforceApDamage | 32 | 64 | 96 | 128 | 160 | base + (A1ReinforceApDamage) * skillAmp |
| 010-li-dailin-p-1010110-a3-ap-damage | 李黛琳 | P | 맹호청권 | A3ApDamage | A3ApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 010-li-dailin-p-1010110-a3-base-damage | 李黛琳 | P | 맹호청권 | A3 基础伤害 | A3BaseDamage | A3ApDamage | 80 | 125 | 170 | 215 | 260 | base + (A3ApDamage) * skillAmp |
| 010-li-dailin-p-1010110-a4-ap-damage | 李黛琳 | P | 맹호청권 | A4ApDamage | A4ApDamage |  | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 | base |
| 010-li-dailin-p-1010110-a4-damage-base | 李黛琳 | P | 맹호청권 | A4 基础伤害 | A4DamageBase | A4ApDamage | 40 | 70 | 100 |  |  | base + (A4ApDamage) * skillAmp |
| 010-li-dailin-q-1010200-a1-ap-damage | 李黛琳 | Q | 八卦回龙腿 | A1ApDamage | A1ApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 010-li-dailin-q-1010200-a1-base-damage | 李黛琳 | Q | 八卦回龙腿 | A1 基础伤害 | A1BaseDamage | A1ApDamage | 20 | 40 | 60 | 80 | 100 | base + (A1ApDamage) * skillAmp |
| 010-li-dailin-q-1010200-a1-reinforce-ap-damage | 李黛琳 | Q | 八卦回龙腿 | A1ReinforceApDamage | A1ReinforceApDamage |  | 0.8 | 0.8 | 0.8 | 0.8 | 0.8 | base |
| 010-li-dailin-q-1010200-a1-reinforce-base-damage | 李黛琳 | Q | 八卦回龙腿 | A1 强化基础伤害 | A1ReinforceBaseDamage | A1ReinforceApDamage | 32 | 64 | 96 | 128 | 160 | base + (A1ReinforceApDamage) * skillAmp |
| 010-li-dailin-q-1010200-a3-ap-damage | 李黛琳 | Q | 八卦回龙腿 | A3ApDamage | A3ApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 010-li-dailin-q-1010200-a3-base-damage | 李黛琳 | Q | 八卦回龙腿 | A3 基础伤害 | A3BaseDamage | A3ApDamage | 80 | 125 | 170 | 215 | 260 | base + (A3ApDamage) * skillAmp |
| 010-li-dailin-q-1010200-a4-ap-damage | 李黛琳 | Q | 八卦回龙腿 | A4ApDamage | A4ApDamage |  | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 | base |
| 010-li-dailin-q-1010200-a4-damage-base | 李黛琳 | Q | 八卦回龙腿 | A4 基础伤害 | A4DamageBase | A4ApDamage | 40 | 70 | 100 |  |  | base + (A4ApDamage) * skillAmp |
| 010-li-dailin-q-1010210-a1-ap-damage | 李黛琳 | Q | 八卦回龙腿 | A1ApDamage | A1ApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 010-li-dailin-q-1010210-a1-base-damage | 李黛琳 | Q | 八卦回龙腿 | A1 基础伤害 | A1BaseDamage | A1ApDamage | 20 | 40 | 60 | 80 | 100 | base + (A1ApDamage) * skillAmp |
| 010-li-dailin-q-1010210-a1-reinforce-ap-damage | 李黛琳 | Q | 八卦回龙腿 | A1ReinforceApDamage | A1ReinforceApDamage |  | 0.8 | 0.8 | 0.8 | 0.8 | 0.8 | base |
| 010-li-dailin-q-1010210-a1-reinforce-base-damage | 李黛琳 | Q | 八卦回龙腿 | A1 强化基础伤害 | A1ReinforceBaseDamage | A1ReinforceApDamage | 32 | 64 | 96 | 128 | 160 | base + (A1ReinforceApDamage) * skillAmp |
| 010-li-dailin-q-1010210-a3-ap-damage | 李黛琳 | Q | 八卦回龙腿 | A3ApDamage | A3ApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 010-li-dailin-q-1010210-a3-base-damage | 李黛琳 | Q | 八卦回龙腿 | A3 基础伤害 | A3BaseDamage | A3ApDamage | 80 | 125 | 170 | 215 | 260 | base + (A3ApDamage) * skillAmp |
| 010-li-dailin-q-1010210-a4-ap-damage | 李黛琳 | Q | 八卦回龙腿 | A4ApDamage | A4ApDamage |  | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 | base |
| 010-li-dailin-q-1010210-a4-damage-base | 李黛琳 | Q | 八卦回龙腿 | A4 基础伤害 | A4DamageBase | A4ApDamage | 40 | 70 | 100 |  |  | base + (A4ApDamage) * skillAmp |
| 010-li-dailin-q-1010220-a1-ap-damage | 李黛琳 | Q | 八卦回龙腿 | A1ApDamage | A1ApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 010-li-dailin-q-1010220-a1-base-damage | 李黛琳 | Q | 八卦回龙腿 | A1 基础伤害 | A1BaseDamage | A1ApDamage | 20 | 40 | 60 | 80 | 100 | base + (A1ApDamage) * skillAmp |
| 010-li-dailin-q-1010220-a1-reinforce-ap-damage | 李黛琳 | Q | 八卦回龙腿 | A1ReinforceApDamage | A1ReinforceApDamage |  | 0.8 | 0.8 | 0.8 | 0.8 | 0.8 | base |
| 010-li-dailin-q-1010220-a1-reinforce-base-damage | 李黛琳 | Q | 八卦回龙腿 | A1 强化基础伤害 | A1ReinforceBaseDamage | A1ReinforceApDamage | 32 | 64 | 96 | 128 | 160 | base + (A1ReinforceApDamage) * skillAmp |
| 010-li-dailin-q-1010220-a3-ap-damage | 李黛琳 | Q | 八卦回龙腿 | A3ApDamage | A3ApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 010-li-dailin-q-1010220-a3-base-damage | 李黛琳 | Q | 八卦回龙腿 | A3 基础伤害 | A3BaseDamage | A3ApDamage | 80 | 125 | 170 | 215 | 260 | base + (A3ApDamage) * skillAmp |
| 010-li-dailin-q-1010220-a4-ap-damage | 李黛琳 | Q | 八卦回龙腿 | A4ApDamage | A4ApDamage |  | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 | base |
| 010-li-dailin-q-1010220-a4-damage-base | 李黛琳 | Q | 八卦回龙腿 | A4 基础伤害 | A4DamageBase | A4ApDamage | 40 | 70 | 100 |  |  | base + (A4ApDamage) * skillAmp |
| 010-li-dailin-w-1010300-a1-ap-damage | 李黛琳 | W | 醉葫猛酌 | A1ApDamage | A1ApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 010-li-dailin-w-1010300-a1-base-damage | 李黛琳 | W | 醉葫猛酌 | A1 基础伤害 | A1BaseDamage | A1ApDamage | 20 | 40 | 60 | 80 | 100 | base + (A1ApDamage) * skillAmp |
| 010-li-dailin-w-1010300-a1-reinforce-ap-damage | 李黛琳 | W | 醉葫猛酌 | A1ReinforceApDamage | A1ReinforceApDamage |  | 0.8 | 0.8 | 0.8 | 0.8 | 0.8 | base |
| 010-li-dailin-w-1010300-a1-reinforce-base-damage | 李黛琳 | W | 醉葫猛酌 | A1 强化基础伤害 | A1ReinforceBaseDamage | A1ReinforceApDamage | 32 | 64 | 96 | 128 | 160 | base + (A1ReinforceApDamage) * skillAmp |
| 010-li-dailin-w-1010300-a3-ap-damage | 李黛琳 | W | 醉葫猛酌 | A3ApDamage | A3ApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 010-li-dailin-w-1010300-a3-base-damage | 李黛琳 | W | 醉葫猛酌 | A3 基础伤害 | A3BaseDamage | A3ApDamage | 80 | 125 | 170 | 215 | 260 | base + (A3ApDamage) * skillAmp |
| 010-li-dailin-w-1010300-a4-ap-damage | 李黛琳 | W | 醉葫猛酌 | A4ApDamage | A4ApDamage |  | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 | base |
| 010-li-dailin-w-1010300-a4-damage-base | 李黛琳 | W | 醉葫猛酌 | A4 基础伤害 | A4DamageBase | A4ApDamage | 40 | 70 | 100 |  |  | base + (A4ApDamage) * skillAmp |
| 010-li-dailin-e-1010400-a1-ap-damage | 李黛琳 | E | 醉蝶敬酒 | A1ApDamage | A1ApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 010-li-dailin-e-1010400-a1-base-damage | 李黛琳 | E | 醉蝶敬酒 | A1 基础伤害 | A1BaseDamage | A1ApDamage | 20 | 40 | 60 | 80 | 100 | base + (A1ApDamage) * skillAmp |
| 010-li-dailin-e-1010400-a1-reinforce-ap-damage | 李黛琳 | E | 醉蝶敬酒 | A1ReinforceApDamage | A1ReinforceApDamage |  | 0.8 | 0.8 | 0.8 | 0.8 | 0.8 | base |
| 010-li-dailin-e-1010400-a1-reinforce-base-damage | 李黛琳 | E | 醉蝶敬酒 | A1 强化基础伤害 | A1ReinforceBaseDamage | A1ReinforceApDamage | 32 | 64 | 96 | 128 | 160 | base + (A1ReinforceApDamage) * skillAmp |
| 010-li-dailin-e-1010400-a3-ap-damage | 李黛琳 | E | 醉蝶敬酒 | A3ApDamage | A3ApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 010-li-dailin-e-1010400-a3-base-damage | 李黛琳 | E | 醉蝶敬酒 | A3 基础伤害 | A3BaseDamage | A3ApDamage | 80 | 125 | 170 | 215 | 260 | base + (A3ApDamage) * skillAmp |
| 010-li-dailin-e-1010400-a4-ap-damage | 李黛琳 | E | 醉蝶敬酒 | A4ApDamage | A4ApDamage |  | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 | base |
| 010-li-dailin-e-1010400-a4-damage-base | 李黛琳 | E | 醉蝶敬酒 | A4 基础伤害 | A4DamageBase | A4ApDamage | 40 | 70 | 100 |  |  | base + (A4ApDamage) * skillAmp |
| 010-li-dailin-r-1010500-a1-ap-damage | 李黛琳 | R | 猛虎穿心踢 | A1ApDamage | A1ApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 010-li-dailin-r-1010500-a1-base-damage | 李黛琳 | R | 猛虎穿心踢 | A1 基础伤害 | A1BaseDamage | A1ApDamage | 20 | 40 | 60 | 80 | 100 | base + (A1ApDamage) * skillAmp |
| 010-li-dailin-r-1010500-a1-reinforce-ap-damage | 李黛琳 | R | 猛虎穿心踢 | A1ReinforceApDamage | A1ReinforceApDamage |  | 0.8 | 0.8 | 0.8 | 0.8 | 0.8 | base |
| 010-li-dailin-r-1010500-a1-reinforce-base-damage | 李黛琳 | R | 猛虎穿心踢 | A1 强化基础伤害 | A1ReinforceBaseDamage | A1ReinforceApDamage | 32 | 64 | 96 | 128 | 160 | base + (A1ReinforceApDamage) * skillAmp |
| 010-li-dailin-r-1010500-a3-ap-damage | 李黛琳 | R | 猛虎穿心踢 | A3ApDamage | A3ApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 010-li-dailin-r-1010500-a3-base-damage | 李黛琳 | R | 猛虎穿心踢 | A3 基础伤害 | A3BaseDamage | A3ApDamage | 80 | 125 | 170 | 215 | 260 | base + (A3ApDamage) * skillAmp |
| 010-li-dailin-r-1010500-a4-ap-damage | 李黛琳 | R | 猛虎穿心踢 | A4ApDamage | A4ApDamage |  | 0.2 | 0.2 | 0.2 | 0.2 | 0.2 | base |
| 010-li-dailin-r-1010500-a4-damage-base | 李黛琳 | R | 猛虎穿心踢 | A4 基础伤害 | A4DamageBase | A4ApDamage | 40 | 70 | 100 |  |  | base + (A4ApDamage) * skillAmp |
| 011-yuki-p-1011100-damage | 雪 | P | 武装式 | 伤害 | Damage |  | 15 | 30 | 45 |  |  | base |
| 011-yuki-q-1011200-attack-damage | 雪 | Q | 气刃斩 | 攻击伤害 | AttackDamage |  | 40 | 80 | 120 | 160 | 200 | base |
| 011-yuki-e-1011400-skill-damage | 雪 | E | 樱花流 | 技能伤害 | SkillDamage | SkillApCoef | 70 | 130 | 190 | 250 | 310 | base + (SkillApCoef) * skillAmp |
| 011-yuki-r-1011500-skill-damage | 雪 | R | 樱月剑舞 | 技能伤害 | SkillDamage | SkillApCoef | 250 | 375 | 500 |  |  | base + (SkillApCoef) * skillAmp |
| 011-yuki-r-1011500-skill-damage-signal | 雪 | R | 樱月剑舞 | 信号伤害 | SkillDamageSignal | SkillApCoefSignal | 350 | 500 | 650 |  |  | base + (SkillApCoefSignal) * skillAmp |
| 012-hyejin-p-1012100-a1-ap-damage | 慧珍 | P | 三灾 | A1ApDamage | A1ApDamage |  | 0.3 | 0.3 | 0.3 | 0.3 | 0.3 | base |
| 012-hyejin-p-1012100-a1-base-damage | 慧珍 | P | 三灾 | A1 基础伤害 | A1BaseDamage | A1ApDamage | 100 | 125 | 150 | 175 | 200 | base + (A1ApDamage) * skillAmp |
| 012-hyejin-p-1012100-a2-ap-damage | 慧珍 | P | 三灾 | A2ApDamage | A2ApDamage |  | 0.3 | 0.3 | 0.3 | 0.3 | 0.3 | base |
| 012-hyejin-p-1012100-a2-base-max-damage | 慧珍 | P | 三灾 | A2 最高基础伤害 | A2BaseMaxDamage | A2ApDamage | 150 | 200 | 250 | 300 | 350 | base + (A2ApDamage) * skillAmp |
| 012-hyejin-p-1012100-a2-base-min-damage | 慧珍 | P | 三灾 | A2 最低基础伤害 | A2BaseMinDamage | A2ApDamage | 15 | 20 | 25 | 30 | 35 | base + (A2ApDamage) * skillAmp |
| 012-hyejin-p-1012100-a3-1-ap-damage | 慧珍 | P | 三灾 | A3_1ApDamage | A3_1ApDamage |  | 0.3 | 0.3 | 0.3 | 0.3 | 0.3 | base |
| 012-hyejin-p-1012100-a3-1-base-damage | 慧珍 | P | 三灾 | A3-1 基础伤害 | A3_1BaseDamage | A3_1ApDamage | 30 | 45 | 100 | 125 | 150 | base + (A3_1ApDamage) * skillAmp |
| 012-hyejin-p-1012100-a3-2-ap-damage | 慧珍 | P | 三灾 | A3_2ApDamage | A3_2ApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 012-hyejin-p-1012100-a3-2-base-damage | 慧珍 | P | 三灾 | A3-2 基础伤害 | A3_2BaseDamage | A3_2ApDamage | 50 | 75 | 100 | 125 | 150 | base + (A3_2ApDamage) * skillAmp |
| 012-hyejin-p-1012100-a4-projectile-ap-damage | 慧珍 | P | 三灾 | A4ProjectileApDamage | A4ProjectileApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 012-hyejin-p-1012100-a4-projectile-base-damage | 慧珍 | P | 三灾 | A4 投射物基础伤害 | A4ProjectileBaseDamage | A4ProjectileApDamage | 100 | 130 | 160 |  |  | base + (A4ProjectileApDamage) * skillAmp |
| 012-hyejin-q-1012200-a1-ap-damage | 慧珍 | Q | 镇压符 | A1ApDamage | A1ApDamage |  | 0.3 | 0.3 | 0.3 | 0.3 | 0.3 | base |
| 012-hyejin-q-1012200-a1-base-damage | 慧珍 | Q | 镇压符 | A1 基础伤害 | A1BaseDamage | A1ApDamage | 100 | 125 | 150 | 175 | 200 | base + (A1ApDamage) * skillAmp |
| 012-hyejin-q-1012200-a2-ap-damage | 慧珍 | Q | 镇压符 | A2ApDamage | A2ApDamage |  | 0.3 | 0.3 | 0.3 | 0.3 | 0.3 | base |
| 012-hyejin-q-1012200-a2-base-max-damage | 慧珍 | Q | 镇压符 | A2 最高基础伤害 | A2BaseMaxDamage | A2ApDamage | 150 | 200 | 250 | 300 | 350 | base + (A2ApDamage) * skillAmp |
| 012-hyejin-q-1012200-a2-base-min-damage | 慧珍 | Q | 镇压符 | A2 最低基础伤害 | A2BaseMinDamage | A2ApDamage | 15 | 20 | 25 | 30 | 35 | base + (A2ApDamage) * skillAmp |
| 012-hyejin-q-1012200-a3-1-ap-damage | 慧珍 | Q | 镇压符 | A3_1ApDamage | A3_1ApDamage |  | 0.3 | 0.3 | 0.3 | 0.3 | 0.3 | base |
| 012-hyejin-q-1012200-a3-1-base-damage | 慧珍 | Q | 镇压符 | A3-1 基础伤害 | A3_1BaseDamage | A3_1ApDamage | 30 | 45 | 100 | 125 | 150 | base + (A3_1ApDamage) * skillAmp |
| 012-hyejin-q-1012200-a3-2-ap-damage | 慧珍 | Q | 镇压符 | A3_2ApDamage | A3_2ApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 012-hyejin-q-1012200-a3-2-base-damage | 慧珍 | Q | 镇压符 | A3-2 基础伤害 | A3_2BaseDamage | A3_2ApDamage | 50 | 75 | 100 | 125 | 150 | base + (A3_2ApDamage) * skillAmp |
| 012-hyejin-q-1012200-a4-projectile-ap-damage | 慧珍 | Q | 镇压符 | A4ProjectileApDamage | A4ProjectileApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 012-hyejin-q-1012200-a4-projectile-base-damage | 慧珍 | Q | 镇压符 | A4 投射物基础伤害 | A4ProjectileBaseDamage | A4ProjectileApDamage | 100 | 130 | 160 |  |  | base + (A4ProjectileApDamage) * skillAmp |
| 012-hyejin-w-1012300-a1-ap-damage | 慧珍 | W | 吸灵符 | A1ApDamage | A1ApDamage |  | 0.3 | 0.3 | 0.3 | 0.3 | 0.3 | base |
| 012-hyejin-w-1012300-a1-base-damage | 慧珍 | W | 吸灵符 | A1 基础伤害 | A1BaseDamage | A1ApDamage | 100 | 125 | 150 | 175 | 200 | base + (A1ApDamage) * skillAmp |
| 012-hyejin-w-1012300-a2-ap-damage | 慧珍 | W | 吸灵符 | A2ApDamage | A2ApDamage |  | 0.3 | 0.3 | 0.3 | 0.3 | 0.3 | base |
| 012-hyejin-w-1012300-a2-base-max-damage | 慧珍 | W | 吸灵符 | A2 最高基础伤害 | A2BaseMaxDamage | A2ApDamage | 150 | 200 | 250 | 300 | 350 | base + (A2ApDamage) * skillAmp |
| 012-hyejin-w-1012300-a2-base-min-damage | 慧珍 | W | 吸灵符 | A2 最低基础伤害 | A2BaseMinDamage | A2ApDamage | 15 | 20 | 25 | 30 | 35 | base + (A2ApDamage) * skillAmp |
| 012-hyejin-w-1012300-a3-1-ap-damage | 慧珍 | W | 吸灵符 | A3_1ApDamage | A3_1ApDamage |  | 0.3 | 0.3 | 0.3 | 0.3 | 0.3 | base |
| 012-hyejin-w-1012300-a3-1-base-damage | 慧珍 | W | 吸灵符 | A3-1 基础伤害 | A3_1BaseDamage | A3_1ApDamage | 30 | 45 | 100 | 125 | 150 | base + (A3_1ApDamage) * skillAmp |
| 012-hyejin-w-1012300-a3-2-ap-damage | 慧珍 | W | 吸灵符 | A3_2ApDamage | A3_2ApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 012-hyejin-w-1012300-a3-2-base-damage | 慧珍 | W | 吸灵符 | A3-2 基础伤害 | A3_2BaseDamage | A3_2ApDamage | 50 | 75 | 100 | 125 | 150 | base + (A3_2ApDamage) * skillAmp |
| 012-hyejin-w-1012300-a4-projectile-ap-damage | 慧珍 | W | 吸灵符 | A4ProjectileApDamage | A4ProjectileApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 012-hyejin-w-1012300-a4-projectile-base-damage | 慧珍 | W | 吸灵符 | A4 投射物基础伤害 | A4ProjectileBaseDamage | A4ProjectileApDamage | 100 | 130 | 160 |  |  | base + (A4ProjectileApDamage) * skillAmp |
| 012-hyejin-e-1012400-a1-ap-damage | 慧珍 | E | 移动符 | A1ApDamage | A1ApDamage |  | 0.3 | 0.3 | 0.3 | 0.3 | 0.3 | base |
| 012-hyejin-e-1012400-a1-base-damage | 慧珍 | E | 移动符 | A1 基础伤害 | A1BaseDamage | A1ApDamage | 100 | 125 | 150 | 175 | 200 | base + (A1ApDamage) * skillAmp |
| 012-hyejin-e-1012400-a2-ap-damage | 慧珍 | E | 移动符 | A2ApDamage | A2ApDamage |  | 0.3 | 0.3 | 0.3 | 0.3 | 0.3 | base |
| 012-hyejin-e-1012400-a2-base-max-damage | 慧珍 | E | 移动符 | A2 最高基础伤害 | A2BaseMaxDamage | A2ApDamage | 150 | 200 | 250 | 300 | 350 | base + (A2ApDamage) * skillAmp |
| 012-hyejin-e-1012400-a2-base-min-damage | 慧珍 | E | 移动符 | A2 最低基础伤害 | A2BaseMinDamage | A2ApDamage | 15 | 20 | 25 | 30 | 35 | base + (A2ApDamage) * skillAmp |
| 012-hyejin-e-1012400-a3-1-ap-damage | 慧珍 | E | 移动符 | A3_1ApDamage | A3_1ApDamage |  | 0.3 | 0.3 | 0.3 | 0.3 | 0.3 | base |
| 012-hyejin-e-1012400-a3-1-base-damage | 慧珍 | E | 移动符 | A3-1 基础伤害 | A3_1BaseDamage | A3_1ApDamage | 30 | 45 | 100 | 125 | 150 | base + (A3_1ApDamage) * skillAmp |
| 012-hyejin-e-1012400-a3-2-ap-damage | 慧珍 | E | 移动符 | A3_2ApDamage | A3_2ApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 012-hyejin-e-1012400-a3-2-base-damage | 慧珍 | E | 移动符 | A3-2 基础伤害 | A3_2BaseDamage | A3_2ApDamage | 50 | 75 | 100 | 125 | 150 | base + (A3_2ApDamage) * skillAmp |
| 012-hyejin-e-1012400-a4-projectile-ap-damage | 慧珍 | E | 移动符 | A4ProjectileApDamage | A4ProjectileApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 012-hyejin-e-1012400-a4-projectile-base-damage | 慧珍 | E | 移动符 | A4 投射物基础伤害 | A4ProjectileBaseDamage | A4ProjectileApDamage | 100 | 130 | 160 |  |  | base + (A4ProjectileApDamage) * skillAmp |
| 012-hyejin-e-1012410-a1-ap-damage | 慧珍 | E | 移动符 | A1ApDamage | A1ApDamage |  | 0.3 | 0.3 | 0.3 | 0.3 | 0.3 | base |
| 012-hyejin-e-1012410-a1-base-damage | 慧珍 | E | 移动符 | A1 基础伤害 | A1BaseDamage | A1ApDamage | 100 | 125 | 150 | 175 | 200 | base + (A1ApDamage) * skillAmp |
| 012-hyejin-e-1012410-a2-ap-damage | 慧珍 | E | 移动符 | A2ApDamage | A2ApDamage |  | 0.3 | 0.3 | 0.3 | 0.3 | 0.3 | base |
| 012-hyejin-e-1012410-a2-base-max-damage | 慧珍 | E | 移动符 | A2 最高基础伤害 | A2BaseMaxDamage | A2ApDamage | 150 | 200 | 250 | 300 | 350 | base + (A2ApDamage) * skillAmp |
| 012-hyejin-e-1012410-a2-base-min-damage | 慧珍 | E | 移动符 | A2 最低基础伤害 | A2BaseMinDamage | A2ApDamage | 15 | 20 | 25 | 30 | 35 | base + (A2ApDamage) * skillAmp |
| 012-hyejin-e-1012410-a3-1-ap-damage | 慧珍 | E | 移动符 | A3_1ApDamage | A3_1ApDamage |  | 0.3 | 0.3 | 0.3 | 0.3 | 0.3 | base |
| 012-hyejin-e-1012410-a3-1-base-damage | 慧珍 | E | 移动符 | A3-1 基础伤害 | A3_1BaseDamage | A3_1ApDamage | 30 | 45 | 100 | 125 | 150 | base + (A3_1ApDamage) * skillAmp |
| 012-hyejin-e-1012410-a3-2-ap-damage | 慧珍 | E | 移动符 | A3_2ApDamage | A3_2ApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 012-hyejin-e-1012410-a3-2-base-damage | 慧珍 | E | 移动符 | A3-2 基础伤害 | A3_2BaseDamage | A3_2ApDamage | 50 | 75 | 100 | 125 | 150 | base + (A3_2ApDamage) * skillAmp |
| 012-hyejin-e-1012410-a4-projectile-ap-damage | 慧珍 | E | 移动符 | A4ProjectileApDamage | A4ProjectileApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 012-hyejin-e-1012410-a4-projectile-base-damage | 慧珍 | E | 移动符 | A4 投射物基础伤害 | A4ProjectileBaseDamage | A4ProjectileApDamage | 100 | 130 | 160 |  |  | base + (A4ProjectileApDamage) * skillAmp |
| 012-hyejin-r-1012500-a1-ap-damage | 慧珍 | R | 五大明王阵 | A1ApDamage | A1ApDamage |  | 0.3 | 0.3 | 0.3 | 0.3 | 0.3 | base |
| 012-hyejin-r-1012500-a1-base-damage | 慧珍 | R | 五大明王阵 | A1 基础伤害 | A1BaseDamage | A1ApDamage | 100 | 125 | 150 | 175 | 200 | base + (A1ApDamage) * skillAmp |
| 012-hyejin-r-1012500-a2-ap-damage | 慧珍 | R | 五大明王阵 | A2ApDamage | A2ApDamage |  | 0.3 | 0.3 | 0.3 | 0.3 | 0.3 | base |
| 012-hyejin-r-1012500-a2-base-max-damage | 慧珍 | R | 五大明王阵 | A2 最高基础伤害 | A2BaseMaxDamage | A2ApDamage | 150 | 200 | 250 | 300 | 350 | base + (A2ApDamage) * skillAmp |
| 012-hyejin-r-1012500-a2-base-min-damage | 慧珍 | R | 五大明王阵 | A2 最低基础伤害 | A2BaseMinDamage | A2ApDamage | 15 | 20 | 25 | 30 | 35 | base + (A2ApDamage) * skillAmp |
| 012-hyejin-r-1012500-a3-1-ap-damage | 慧珍 | R | 五大明王阵 | A3_1ApDamage | A3_1ApDamage |  | 0.3 | 0.3 | 0.3 | 0.3 | 0.3 | base |
| 012-hyejin-r-1012500-a3-1-base-damage | 慧珍 | R | 五大明王阵 | A3-1 基础伤害 | A3_1BaseDamage | A3_1ApDamage | 30 | 45 | 100 | 125 | 150 | base + (A3_1ApDamage) * skillAmp |
| 012-hyejin-r-1012500-a3-2-ap-damage | 慧珍 | R | 五大明王阵 | A3_2ApDamage | A3_2ApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 012-hyejin-r-1012500-a3-2-base-damage | 慧珍 | R | 五大明王阵 | A3-2 基础伤害 | A3_2BaseDamage | A3_2ApDamage | 50 | 75 | 100 | 125 | 150 | base + (A3_2ApDamage) * skillAmp |
| 012-hyejin-r-1012500-a4-projectile-ap-damage | 慧珍 | R | 五大明王阵 | A4ProjectileApDamage | A4ProjectileApDamage |  | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | base |
| 012-hyejin-r-1012500-a4-projectile-base-damage | 慧珍 | R | 五大明王阵 | A4 投射物基础伤害 | A4ProjectileBaseDamage | A4ProjectileApDamage | 100 | 130 | 160 |  |  | base + (A4ProjectileApDamage) * skillAmp |



## 缺少结构化伤害的英雄概览

| heroCode | 英雄 | 英文名 | 技能组数 | 缺少结构化伤害数 |
| --- | --- | --- | --- | --- |
| 1 | 杰琪 | Jackie | 8 | 3 |
| 2 | 阿雅 | Aya | 5 | 2 |
| 3 | 菲欧娜 | Fiora | 8 | 5 |
| 4 | 马格努斯 | Magnus | 5 | 1 |
| 6 | 娜町 | Nadine | 7 | 3 |
| 7 | 玄佑 | Hyunwoo | 5 | 2 |
| 8 | 哈特 | Hart | 7 | 3 |
| 9 | 埃索 | Isol | 6 | 3 |
| 11 | 雪 | Yuki | 6 | 2 |
| 13 | 修凯 | Xiukai | 7 | 7 |
| 14 | 奇娅拉 | Chiara | 7 | 7 |
| 15 | 希瑟拉 | Sissela | 6 | 6 |
| 16 | 西尔维娅 | Silvia | 5 | 5 |
| 17 | 阿德瑞娜 | Adriana | 5 | 5 |
| 18 | 彰一 | Shoichi | 6 | 6 |
| 19 | 艾玛 | Emma | 6 | 6 |
| 20 | 伦诺克斯 | Lenox | 5 | 5 |
| 21 | 洛兹 | Rozzi | 6 | 6 |
| 22 | 卢克 | Luke | 6 | 6 |
| 23 | 凯希 | Cathy | 6 | 6 |
| 24 | 阿德拉 | Adela | 6 | 6 |
| 25 | 伯尼斯 | Bernice | 5 | 5 |
| 26 | 芭芭拉 | Barbara | 12 | 12 |
| 27 | 亚历克斯 | Alex | 5 | 5 |
| 28 | 秀雅 | Sua | 9 | 9 |
| 29 | 里昂 | Leon | 5 | 5 |
| 30 | Eleven | Eleven | 5 | 5 |
| 31 | 莉央 | Rio | 10 | 10 |
| 32 | 威廉 | William | 5 | 5 |
| 33 | 妮琪 | Nicky | 7 | 7 |
| 34 | 纳塔朋 | Nathapon | 6 | 6 |
| 35 | 扬 | Jan | 7 | 7 |
| 36 | 伊娃 | Eva | 6 | 6 |
| 37 | 丹尼尔 | Daniel | 6 | 6 |
| 38 | 珍妮 | Jenny | 7 | 7 |
| 39 | 卡米洛 | Camilo | 9 | 9 |
| 40 | 克洛伊 | Chloe | 11 | 11 |
| 41 | 约翰 | Johann | 7 | 7 |
| 42 | 比安卡 | Bianca | 6 | 6 |
| 43 | 席琳 | Celine | 7 | 7 |
| 44 | 厄喀翁 | Echion | 11 | 11 |
| 45 | 梅 | Mai | 6 | 6 |
| 46 | 艾登 | Aiden | 8 | 8 |
| 47 | 劳拉 | Laura | 8 | 8 |
| 48 | 蒂娅 | Tia | 5 | 5 |
| 49 | 费利克斯 | Felix | 17 | 17 |
| 50 | 埃琳娜 | Elena | 5 | 5 |
| 51 | 普里亚 | Priya | 5 | 5 |
| 52 | 阿迪娜 | Adina | 8 | 8 |
| 53 | 马库斯 | Markus | 6 | 6 |
| 54 | 卡拉 | Karla | 5 | 5 |
| 55 | 艾丝蒂尔 | Estelle | 10 | 10 |
| 56 | 皮奥洛 | Piolo | 9 | 9 |
| 57 | 玛蒂娜 | Martina | 16 | 16 |
| 58 | 海因茨 | Haze | 12 | 12 |
| 59 | 伊萨克 | Isaac | 6 | 6 |
| 60 | 塔齐娅 | Tazia | 8 | 8 |
| 61 | 爱琳 | Irem | 9 | 9 |
| 62 | 西奥多 | Theodore | 7 | 7 |
| 63 | 伊安 | Ly Anh | 10 | 10 |
| 64 | 万尼亚 | Vanya | 6 | 6 |
| 65 | 黛比&玛莲 | Debi & Marlene | 9 | 9 |
| 66 | 阿尔达 | Arda | 10 | 10 |
| 67 | 艾比盖尔 | Abigail | 6 | 6 |
| 68 | 阿隆索 | Alonso | 5 | 5 |
| 69 | 雷妮 | Leni | 5 | 5 |
| 70 | 燕翼 | Tsubame | 6 | 6 |
| 71 | 肯尼思 | Kenneth | 5 | 5 |
| 72 | 卡缇娅 | Katja | 6 | 6 |
| 73 | 夏洛特 | Charlotte | 5 | 5 |
| 74 | 达尔科 | Darko | 6 | 6 |
| 75 | 莉诺尔 | Lenore | 5 | 5 |
| 76 | 盖瑞特 | Garnet | 8 | 8 |
| 77 | 俞岷 | Yumin | 7 | 7 |
| 78 | 翡翠 | Hisui | 8 | 8 |
| 79 | 尤斯蒂娜 | Justyna | 8 | 8 |
| 80 | 伊舒特 | Istvan | 5 | 5 |
| 81 | 妮娅 | NiaH | 7 | 7 |
| 82 | 雪琳 | Xuelin | 5 | 5 |
| 83 | 亨利 | Henry | 6 | 6 |
| 84 | 布莱尔 | Blair | 9 | 9 |
| 85 | 米尔卡 | Mirka | 7 | 7 |
| 86 | 芬里尔 | Fenrir | 8 | 8 |
| 87 | 卡洛琳 | Coraline | 7 | 7 |
| 88 | 鼻荆 | Bihyung | 8 | 8 |
