# ER Skill 表整理

来源：https://github.com/pypy-vrc/er-gamedata/tree/master/data

生成时间：2026-05-21T22:49:08.200Z

英雄技能名称和描述优先使用 DAK.GG 当前中文接口 `https://er.dakgg.io/api/v1/data/skills?hl=zh-CN`；DAK.GG 未覆盖的技能变体再回退到仓库中文本地化。Skill 表结构、等级、冷却、范围等数值仍来自本仓库。

## 去重规则

如果同一个标准键在多份 Skill 文档中重复出现，优先使用 git 最后更新时间最新的来源文件。若更新时间相同，则使用固定优先级保证输出稳定：`Skill.json` 优先于 `Skill_Indicator.json`。当前本地仓库所有 `*Skill*.json` 文件最后更新时间均为 `2026-05-21T12:00:17+09:00`。

## 输出文件

- Skill 表清单：`docs/skill-tables/er-skill-table-inventory.csv`
- 标准化技能组：`docs/skill-tables/er-skill-groups-normalized.csv`
- 标准化技能等级：`docs/skill-tables/er-skill-levels-normalized.csv`
- 标准化 SkillExtension：`docs/skill-tables/er-skill-extensions-normalized.csv`
- 完整 JSON：`docs/skill-tables/er-skill-tables.json`
- 前端副本：`src/data/erSkillTables.json`

## 标准命名

- 技能组：`{heroCode}-{heroKey}-{slotOrType}-{skillGroup}`
- 技能等级：`{heroCode}-{heroKey}-{slotOrType}-{skillGroup}-{level}-{skillCode}`
- SkillExtension：`skill-extension-{key}-{extensionName}`

## Skill 相关表清单

| 文件 | 用途 | 行数 | 主键字段 | 最后更新时间 | 提交 |
| --- | --- | --- | --- | --- | --- |
| BotSkillBuild.json | bot skill build order | 20 | characterCode | 2026-05-21T12:00:17+09:00 | 257e632 |
| CharacterSkillVideos.json | skill demo video resources | 315 | code | 2026-05-21T12:00:17+09:00 | 257e632 |
| DyingConditionSkill.json | dying condition skill slot set | 5 | code | 2026-05-21T12:00:17+09:00 | 257e632 |
| GadgetSkill.json | gadget skill quick slot config | 6 | code|mode | 2026-05-21T12:00:17+09:00 | 257e632 |
| ItemSkill.json | item skill definitions | 198 | itemSkillCode | 2026-05-21T12:00:17+09:00 | 257e632 |
| ItemSkillGroup.json | item skill groups | 78 | itemSkillGroup | 2026-05-21T12:00:17+09:00 | 257e632 |
| ItemSkillLinker.json | item to skill links | 347 | itemCode | 2026-05-21T12:00:17+09:00 | 257e632 |
| Skill.json | runtime skill level values | 3325 | code | 2026-05-21T12:00:17+09:00 | 257e632 |
| SkillEvolution.json | skill evolution definitions | 18 | code | 2026-05-21T12:00:17+09:00 | 257e632 |
| SkillEvolutionGroup.json | skill evolution groups | 9 | group | 2026-05-21T12:00:17+09:00 | 257e632 |
| SkillEvolutionPoint.json | skill evolution point rules | 18 | code | 2026-05-21T12:00:17+09:00 | 257e632 |
| SkillExtension.json | extra structured skill parameters | 111 | key | 2026-05-21T12:00:17+09:00 | 257e632 |
| SkillGroup.json | skill group/cast definitions | 1125 | group | 2026-05-21T12:00:17+09:00 | 257e632 |
| SkillTargetMask.json | skill target masks | 111 | code | 2026-05-21T12:00:17+09:00 | 257e632 |
| Skill_Indicator.json | indicator skill level values | 2767 | code | 2026-05-21T12:00:17+09:00 | 257e632 |
| TacticalSkillSet.json | tactical skill upgrade sets | 78 | code | 2026-05-21T12:00:17+09:00 | 257e632 |
| TacticalSkillSetGroup.json | tactical skill set groups | 43 | group | 2026-05-21T12:00:17+09:00 | 257e632 |

## 标准化技能组预览

| standardId | 英雄 | 槽位 | 技能名 | group | levels | levelCodes | extension | 来源表 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 001-jackie-normal-attack-1001000 | 杰琪 | NormalAttack | 재키 기본 공격 | 1001000 | 1 | 1001001 | JackieNormalAttackData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 001-jackie-combo-normal-attack-1001010 | 杰琪 | ComboNormalAttack | 재키 기본 공격 - 콤보 | 1001010 | 1 | 1001011 | JackieSkillData | SkillGroup.json|Skill.json|SkillExtension.json |
| 001-jackie-p-1001100 | 杰琪 | P | 鲜血盛宴 | 1001100 | 1|2|3 | 1001101|1001102|1001103 | JackiePassiveData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 001-jackie-q-1001200 | 杰琪 | Q | 连斩 | 1001200 | 1|2|3|4|5 | 1001201|1001202|1001203|1001204|1001205 | JackieActive1Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 001-jackie-active-1001210 | 杰琪 | Active | 连斩 | 1001210 | 1|2|3|4|5 | 1001211|1001212|1001213|1001214|1001215 | JackieSkillData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 001-jackie-w-1001300 | 杰琪 | W | 断筋 | 1001300 | 1|2|3|4|5 | 1001301|1001302|1001303|1001304|1001305 | JackieActive2Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 001-jackie-mount-attack-1001310 | 杰琪 | MountAttack | 재키 W - 강화 평타 | 1001310 | 1 | 1001311 | JackieSkillData | SkillGroup.json|Skill.json|SkillExtension.json |
| 001-jackie-e-1001400 | 杰琪 | E | 袭击 | 1001400 | 1|2|3|4|5 | 1001401|1001402|1001403|1001404|1001405 | JackieActive3Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 001-jackie-r-1001500 | 杰琪 | R | 电锯杀人狂 | 1001500 | 1|2|3 | 1001501|1001502|1001503 | JackieActive4Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 001-jackie-ultimate-active-1001510 | 杰琪 | UltimateActive | 屠杀 | 1001510 | 1|2|3 | 1001511|1001512|1001513 | JackieSkillData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 002-aya-normal-attack-1002000 | 阿雅 | NormalAttack | 아야 기본공격 | 1002000 | 1 | 1002001 | AyaNormalAttackData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 002-aya-p-1002100 | 阿雅 | P | 阿雅之正义 | 1002100 | 1|2|3 | 1002101|1002102|1002103 | AyaPassiveData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 002-aya-q-1002200 | 阿雅 | Q | 二连射 | 1002200 | 1|2|3|4|5 | 1002201|1002202|1002203|1002204|1002205 | AyaActive1Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 002-aya-w-1002300 | 阿雅 | W | 稳定射击 | 1002300 | 1|2|3|4|5 | 1002301|1002302|1002303|1002304|1002305 | AyaActive2Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 002-aya-e-1002400 | 阿雅 | E | 转弯 | 1002400 | 1|2|3|4|5 | 1002401|1002402|1002403|1002404|1002405 | AyaActive3Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 002-aya-r-1002500 | 阿雅 | R | 空弹 | 1002500 | 1|2|3 | 1002501|1002502|1002503 | AyaActive4Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 003-fiora-normal-attack-1003000 | 菲欧娜 | NormalAttack | 피오라 기본공격 | 1003000 | 1 | 1003001 | FioraNormalAttackData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 003-fiora-p-1003100 | 菲欧娜 | P | 刺击 | 1003100 | 1|2|3 | 1003101|1003102|1003103 | FioraPassiveData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 003-fiora-q-1003200 | 菲欧娜 | Q | 长刺 | 1003200 | 1|2|3|4|5 | 1003201|1003202|1003203|1003204|1003205 | FioraActive1Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 003-fiora-w-1003300 | 菲欧娜 | W | 复杂进攻 | 1003300 | 1|2|3|4|5 | 1003301|1003302|1003303|1003304|1003305 | FioraActive2Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 003-fiora-e-1003400 | 菲欧娜 | E | 前进&后退 | 1003400 | 1|2|3|4|5 | 1003401|1003402|1003403|1003404|1003405 |  | SkillGroup.json|Skill.json|Skill_Indicator.json |
| 003-fiora-active-1003410 | 菲欧娜 | Active | 前进&后退 | 1003410 | 1|2|3|4|5 | 1003411|1003412|1003413|1003414|1003415 |  | SkillGroup.json|Skill.json|Skill_Indicator.json |
| 003-fiora-r-1003500 | 菲欧娜 | R | 飞刺 | 1003500 | 1|2|3 | 1003501|1003502|1003503 |  | SkillGroup.json|Skill.json|Skill_Indicator.json |
| 003-fiora-ultimate-active-1003510 | 菲欧娜 | UltimateActive | 飞刺 | 1003510 | 1|2|3 | 1003511|1003512|1003513 |  | SkillGroup.json|Skill.json|Skill_Indicator.json |
| 003-fiora-ultimate-active-1003520 | 菲欧娜 | UltimateActive | 飞刺 | 1003520 | 1|2|3 | 1003521|1003522|1003523 |  | SkillGroup.json|Skill.json|Skill_Indicator.json |
| 004-magnus-normal-attack-1004000 | 马格努斯 | NormalAttack | 매그너스 기본공격 | 1004000 | 1 | 1004001 | MagnusNormalAttackData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 004-magnus-p-1004100 | 马格努斯 | P | 意志 | 1004100 | 1|2|3 | 1004101|1004102|1004103 | MagnusPassiveData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 004-magnus-q-1004200 | 马格努斯 | Q | 破碎弹 | 1004200 | 1|2|3|4|5 | 1004201|1004202|1004203|1004204|1004205 | MagnusActive1Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 004-magnus-w-1004300 | 马格努斯 | W | 17对1 | 1004300 | 1|2|3|4|5 | 1004301|1004302|1004303|1004304|1004305 | MagnusActive2Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 004-magnus-e-1004400 | 马格努斯 | E | 猛击 | 1004400 | 1|2|3|4|5 | 1004401|1004402|1004403|1004404|1004405 | MagnusActive3Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 004-magnus-r-1004500 | 马格努斯 | R | 暴走飞车 | 1004500 | 1|2|3 | 1004501|1004502|1004503 | MagnusActive4Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 005-zahir-normal-attack-1005000 | 扎希尔 | NormalAttack | 자히르 기본공격 | 1005000 | 1 | 1005001 | ZahirNormalAttackData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 005-zahir-p-1005100 | 扎希尔 | P | 死神之目 | 1005100 | 1|2|3 | 1005101|1005102|1005103 | ZahirPassiveData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 005-zahir-q-1005200 | 扎希尔 | Q | 那罗延法宝 | 1005200 | 1|2|3|4|5 | 1005201|1005202|1005203|1005204|1005205 | ZahirActive1Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 005-zahir-w-1005300 | 扎希尔 | W | 甘狄拔 | 1005300 | 1|2|3|4|5 | 1005301|1005302|1005303|1005304|1005305 | ZahirActive2Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 005-zahir-e-1005400 | 扎希尔 | E | 风神法宝 | 1005400 | 1|2|3|4|5 | 1005401|1005402|1005403|1005404|1005405 | ZahirActive3Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 005-zahir-r-1005500 | 扎希尔 | R | 跋尔伽婆 | 1005500 | 1|2|3 | 1005501|1005502|1005503 | ZahirActive4Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 006-nadine-normal-attack-1006000 | 娜町 | NormalAttack | 나딘 기본공격 | 1006000 | 1 | 1006001 | NadineNormalAttackData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 006-nadine-p-1006100 | 娜町 | P | 野性 | 1006100 | 1|2|3 | 1006101|1006102|1006103 | NadinePassiveData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 006-nadine-q-1006200 | 娜町 | Q | 黄牛之眼 | 1006200 | 1|2|3|4|5 | 1006201|1006202|1006203|1006204|1006205 | NadineActive1Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 006-nadine-w-1006300 | 娜町 | W | 松鼠陷阱 | 1006300 | 1|2|3|4|5 | 1006301|1006302|1006303|1006304|1006305 |  | SkillGroup.json|Skill.json|Skill_Indicator.json |
| 006-nadine-active-1006310 | 娜町 | Active | 松鼠陷阱 | 1006310 | 1|2|3|4|5 | 1006311|1006312|1006313|1006314|1006315 |  | SkillGroup.json|Skill.json|Skill_Indicator.json |
| 006-nadine-e-1006400 | 娜町 | E | 猿猴的钢丝绳 | 1006400 | 1|2|3|4|5 | 1006401|1006402|1006403|1006404|1006405 |  | SkillGroup.json|Skill.json|Skill_Indicator.json |
| 006-nadine-active-1006410 | 娜町 | Active | 猿猴的钢丝绳 | 1006410 | 1|2|3|4|5 | 1006411|1006412|1006413|1006414|1006415 |  | SkillGroup.json|Skill.json|Skill_Indicator.json |
| 006-nadine-r-1006500 | 娜町 | R | 狼之猛袭 | 1006500 | 1|2|3 | 1006501|1006502|1006503 | NadineActive4Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 007-hyunwoo-normal-attack-1007000 | 玄佑 | NormalAttack | 현우 기본공격 | 1007000 | 1 | 1007001 | HyunwooNormalAttackData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 007-hyunwoo-p-1007100 | 玄佑 | P | 鏖战 | 1007100 | 1|2|3 | 1007101|1007102|1007103 | HyunwooPassiveData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 007-hyunwoo-q-1007200 | 玄佑 | Q | 踩踏 | 1007200 | 1|2|3|4|5 | 1007201|1007202|1007203|1007204|1007205 | HyunwooActive1Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 007-hyunwoo-w-1007300 | 玄佑 | W | 虚张声势 | 1007300 | 1|2|3|4|5 | 1007301|1007302|1007303|1007304|1007305 | HyunwooActive2Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 007-hyunwoo-e-1007400 | 玄佑 | E | 先发制人 | 1007400 | 1|2|3|4|5 | 1007401|1007402|1007403|1007404|1007405 | HyunwooActive3Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 007-hyunwoo-r-1007500 | 玄佑 | R | 核冲击 | 1007500 | 1|2|3 | 1007501|1007502|1007503 | HyunwooActive4Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 008-hart-normal-attack-1008000 | 哈特 | NormalAttack | 하트 기본공격 | 1008000 | 1 | 1008001 | HartNormalAttackData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 008-hart-p-1008100 | 哈特 | P | 心灵治愈 | 1008100 | 1|2|3 | 1008101|1008102|1008103 | HartPassiveData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 008-hart-q-1008200 | 哈特 | Q | 延音 | 1008200 | 1|2|3|4|5 | 1008201|1008202|1008203|1008204|1008205 | HartSkillData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 008-hart-active-1008210 | 哈特 | Active | 延音 | 1008210 | 1|2|3|4|5 | 1008211|1008212|1008213|1008214|1008215 | HartSkillData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 008-hart-w-1008300 | 哈特 | W | 破音 | 1008300 | 1|2|3|4|5 | 1008301|1008302|1008303|1008304|1008305 | HartActive2Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 008-hart-e-1008400 | 哈特 | E | 震音 | 1008400 | 1|2|3|4|5 | 1008401|1008402|1008403|1008404|1008405 | HartSkillData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 008-hart-active-1008410 | 哈特 | Active | 震音 | 1008410 | 1|2|3|4|5 | 1008411|1008412|1008413|1008414|1008415 | HartSkillData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 008-hart-r-1008500 | 哈特 | R | Peacemaker | 1008500 | 1|2|3 | 1008501|1008502|1008503 | HartActive4Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 008-hart-passive-1008600 | 哈特 | Passive | 하트 R - PeaceMaker 장판 | 1008600 | 1 | 1008601 | HartSkillData | SkillGroup.json|Skill.json|SkillExtension.json |
| 009-isol-normal-attack-1009000 | 埃索 | NormalAttack | 아이솔 기본공격 | 1009000 | 1 | 1009001 | IsolNormalAttackData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 009-isol-p-1009100 | 埃索 | P | 游击战术 | 1009100 | 1|2|3 | 1009101|1009102|1009103 | IsolPassiveData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 009-isol-q-1009200 | 埃索 | Q | 军事用炸药 | 1009200 | 1|2|3|4|5 | 1009201|1009202|1009203|1009204|1009205 | IsolActive1Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 009-isol-w-1009300 | 埃索 | W | 叛军突击 | 1009300 | 1|2|3|4|5 | 1009301|1009302|1009303|1009304|1009305 | IsolActive2Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 009-isol-e-1009400 | 埃索 | E | 伪装潜行 | 1009400 | 1|2|3|4|5 | 1009401|1009402|1009403|1009404|1009405 | IsolActive3Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 009-isol-mount-attack-1009410 | 埃索 | MountAttack | 아이솔 은밀 기동 공격 | 1009410 | 1 | 1009411 |  | SkillGroup.json|Skill.json |
| 009-isol-r-1009500 | 埃索 | R | MOK 军用地雷 | 1009500 | 1|2|3 | 1009501|1009502|1009503 | IsolActive4Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 010-li-dailin-normal-attack-1010000 | 李黛琳 | NormalAttack | 리다이린 기본공격 | 1010000 | 1 | 1010001 | LiDailinSkillData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 010-li-dailin-p-1010100 | 李黛琳 | P | 酒醉值 | 1010100 | 1|2|3 | 1010101|1010102|1010103 | LiDailinSkillData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 010-li-dailin-mount-attack-1010110 | 李黛琳 | MountAttack | 맹호청권 | 1010110 | 1 | 1010111 | LiDailinSkillData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 010-li-dailin-q-1010200 | 李黛琳 | Q | 八卦回龙腿 | 1010200 | 1|2|3|4|5 | 1010201|1010202|1010203|1010204|1010205 | LiDailinSkillData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 010-li-dailin-active-1010210 | 李黛琳 | Active | 八卦回龙腿 | 1010210 | 1|2|3|4|5 | 1010211|1010212|1010213|1010214|1010215 | LiDailinSkillData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 010-li-dailin-active-1010220 | 李黛琳 | Active | 八卦回龙腿 | 1010220 | 1|2|3|4|5 | 1010221|1010222|1010223|1010224|1010225 | LiDailinSkillData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 010-li-dailin-w-1010300 | 李黛琳 | W | 醉葫猛酌 | 1010300 | 1|2|3|4|5 | 1010301|1010302|1010303|1010304|1010305 | LiDailinSkillData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 010-li-dailin-e-1010400 | 李黛琳 | E | 醉蝶敬酒 | 1010400 | 1|2|3|4|5 | 1010401|1010402|1010403|1010404|1010405 | LiDailinSkillData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 010-li-dailin-r-1010500 | 李黛琳 | R | 猛虎穿心踢 | 1010500 | 1|2|3 | 1010501|1010502|1010503 | LiDailinSkillData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 011-yuki-normal-attack-1011000 | 雪 | NormalAttack | 유키 기본 공격 | 1011000 | 1 | 1011001 | YukiNormalAttackData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 011-yuki-combo-normal-attack-1011010 | 雪 | ComboNormalAttack | 유키 기본 공격 - 콤보 | 1011010 | 1 | 1011011 |  | SkillGroup.json|Skill.json |
| 011-yuki-p-1011100 | 雪 | P | 武装式 | 1011100 | 1|2|3 | 1011101|1011102|1011103 | YukiPassiveData | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |
| 011-yuki-q-1011200 | 雪 | Q | 气刃斩 | 1011200 | 1|2|3|4|5 | 1011201|1011202|1011203|1011204|1011205 | YukiActive1Data | SkillGroup.json|Skill.json|Skill_Indicator.json|SkillExtension.json |

## 重复键处理预览

| code | group | level | 采用来源 | 候选来源 | 来源更新时间 |
| --- | --- | --- | --- | --- | --- |
| 1001001 | 1001000 | 1 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001101 | 1001100 | 1 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001102 | 1001100 | 2 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001103 | 1001100 | 3 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001201 | 1001200 | 1 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001202 | 1001200 | 2 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001203 | 1001200 | 3 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001204 | 1001200 | 4 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001205 | 1001200 | 5 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001211 | 1001210 | 1 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001212 | 1001210 | 2 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001213 | 1001210 | 3 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001214 | 1001210 | 4 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001215 | 1001210 | 5 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001301 | 1001300 | 1 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001302 | 1001300 | 2 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001303 | 1001300 | 3 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001304 | 1001300 | 4 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001305 | 1001300 | 5 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001401 | 1001400 | 1 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001402 | 1001400 | 2 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001403 | 1001400 | 3 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001404 | 1001400 | 4 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001405 | 1001400 | 5 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001501 | 1001500 | 1 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001502 | 1001500 | 2 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001503 | 1001500 | 3 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001511 | 1001510 | 1 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001512 | 1001510 | 2 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1001513 | 1001510 | 3 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1002001 | 1002000 | 1 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1002101 | 1002100 | 1 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1002102 | 1002100 | 2 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1002103 | 1002100 | 3 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1002201 | 1002200 | 1 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1002202 | 1002200 | 2 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1002203 | 1002200 | 3 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1002204 | 1002200 | 4 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1002205 | 1002200 | 5 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
| 1002301 | 1002300 | 1 | Skill.json | Skill.json|Skill_Indicator.json | 2026-05-21T12:00:17+09:00 |
