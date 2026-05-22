# 缺失技能伤害数据审计

生成时间：2026-05-21T23:21:13.471Z

这个审计脚本会扫描整个 `.er-gamedata-cache` 数据目录，而不只看 `SkillExtension.json`。它会确认目标实验体的技能组、等级表、状态表、投射物表、文本模板是否存在，并判断是否存在可直接链接到技能组的结构化伤害字段。

## 总览

| 目标 | 实验体 | 结论 | 技能组数 | 链接 Extension 数 | 含伤害 Extension 数 | SkillExtension 编号命中 |
| --- | --- | --- | --- | --- | --- | --- |
| Laura | 劳拉 (Laura, 47) | related_tables_exist_but_no_linked_skill_extension_damage | 9 | 0 | 0 | 0 |
| Justyna | 尤斯蒂娜 (Justyna, 79) | related_tables_exist_but_no_linked_skill_extension_damage | 10 | 0 | 0 | 0 |

## 关键解释

- `Skill.json` / `Skill_Indicator.json` 存在技能等级、冷却、范围、消耗等数据，但不包含技能伤害数值。
- `Skill/Group/Coef/*` 文本里有 `{0}`、`{1}` 这类占位符，能证明客户端需要参数，但仓库里未必包含这些参数的来源。
- 截图中尤斯蒂娜 Q 的 `50(+技能增幅40%)`、`70(+技能增幅70%)` 对应 `Skill/Group/Coef/1079200` 的占位符，但在当前仓库 JSON 中没有找到可链接的参数表。

## 劳拉 (Laura)

结论：`related_tables_exist_but_no_linked_skill_extension_damage`

### 技能组与文本模板

| group | skillId | passiveSkillId | Skill codes | Indicator codes | 系数占位符 | Coef/Desc 文本 |
| --- | --- | --- | --- | --- | --- | --- |
| 1047000 | LauraNormalAttack | None | 1047001 | 1047001 | no |  |
| 1047100 | None | LauraPassive | 1047101|1047102|1047103 | 1047101|1047102|1047103 | yes | 劳拉施法技能后，下一次普攻攻击速度增加{2}，同时对目标周围扇形区域范围内的敌人造成{0}(+技能增幅{1})的技能伤害。 |
| 1047110 | LauraPassiveAttack | None | 1047111 | 1047111 | no |  |
| 1047200 | LauraActive1_1 | None | 1047201|1047202|1047203|1047204|1047205 | 1047201|1047202|1047203|1047204|1047205 | yes | 劳拉朝指定方向挥鞭，造成{1}(+技能增幅{2})技能伤害。命中时，可以在{0}秒内再次施法技能。 再次施法 : 劳拉向指定方向突进一小段距离。 |
| 1047210 | LauraActive1_2 | None | 1047211|1047212|1047213|1047214|1047215 | 1047211|1047212|1047213|1047214|1047215 | yes | 劳拉朝指定方向挥鞭，造成{1}(+技能增幅{2})的技能伤害。命中时，可以在{0}秒内再次施法技能。 再次施法 : 劳拉向指定方向突进一小段距离。 |
| 1047300 | LauraActive2 | None | 1047301|1047302|1047303|1047304|1047305 | 1047301|1047302|1047303|1047304|1047305 | yes | 劳拉朝指定的方向投掷预告函。预告函命中敌人时造成{3}(+技能增幅{4})技能伤害，敌人的移动速度减少{1}、持续{0}秒。命中的敌人将被标记为劳拉的偷取目标、持续{2}秒。每当劳拉使用普攻或独立技能对偷取目标造成伤害时，劳拉可以恢复{5}(+技能增幅{6})体力。 |
| 1047400 | LauraActive3_1 | None | 1047401|1047402|1047403|1047404|1047405 | 1047401|1047402|1047403|1047404|1047405 | yes | 劳拉朝指定方向挥动长鞭。当鞭子撞击到墙壁时，劳拉可以突进至墙壁的位置。她可以在{0}秒内再次使用该技能。 再次施法 : 劳拉跳至指定位置，落地时对周围敌人造成{2}(+技能增幅{3})技能伤害并使敌人悬空{1}秒。 |
| 1047410 | LauraActive3_2 | None | 1047411|1047412|1047413|1047414|1047415 |  | yes | 劳拉朝指定方向挥动长鞭。当鞭子撞击到墙壁时，劳拉可以突进至墙壁的位置。她可以在{0}秒内再次使用该技能。 再次施法 : 劳拉跳至指定位置，落地时对周围敌人造成{2}(+技能增幅{3})技能伤害并使敌人悬空{1}秒。 |
| 1047500 | LauraActive4 | None | 1047501|1047502|1047503 | 1047501|1047502|1047503 | yes | 劳拉以魅惑的步伐对周围敌人实验体造成{1}(+技能增幅{2})技能伤害，并拉近敌人。 命中一位敌人实验体时，劳拉将获得能够吸收{3}(+技能增幅{4})伤害的护盾，护盾效果持续{11}秒，并在一段时间后对周围敌人造成{5}(+技能增幅{6})技能伤害。每额外命中一位敌人实验体时，护盾量增加{7}(+技能增幅{8})。（上限 : {0}名） |

### SkillExtension 链接情况

| group | skillId | passiveSkillId | 链接 Extension | 伤害/系数字段 |
| --- | --- | --- | --- | --- |
| 1047000 | LauraNormalAttack | None | - | - |
| 1047100 | None | LauraPassive | - | - |
| 1047110 | LauraPassiveAttack | None | - | - |
| 1047200 | LauraActive1_1 | None | - | - |
| 1047210 | LauraActive1_2 | None | - | - |
| 1047300 | LauraActive2 | None | - | - |
| 1047400 | LauraActive3_1 | None | - | - |
| 1047410 | LauraActive3_2 | None | - | - |
| 1047500 | LauraActive4 | None | - | - |

### SkillExtension 编号反查

这里会使用技能组编号和技能等级编号反查 SkillExtension，用于确认是否存在只用编号、不用 skillId 明文的隐藏关联。

| key | Extension | 命中技能编号 | 伤害/系数字段 |
| --- | --- | --- | --- |

### DAK 当前简略文本

| id | 槽位 | 名称 | tooltip |
| --- | --- | --- | --- |
| 1047100 | T | 怪盗 | 无消耗 劳拉施法技能后，下一次普攻攻速增加，同时对目标周围扇形区域范围内的敌人造成技能伤害。 |
| 1047200 | Q | 荆棘噬痕 | 无消耗 / 冷却4秒 劳拉朝指定方向挥鞭，造成技能伤害。命中时可以再次施法技能。 再次施法 : 劳拉向指定方向突进一小段距离。 |
| 1047300 | W | 预告函 | 无消耗 / 冷却10秒 劳拉朝指定的方向投掷预告函。预告函命中敌人时将造成技能伤害，并使敌人的移动速度变缓。被命中的敌人在一段时间内将被标记为劳拉的偷取目标。每当劳拉使用普攻或独立技能对偷取目标造成伤害时，都可以恢复劳拉的体力。 |
| 1047400 | E | 优雅的步伐 | 无消耗 / 冷却17秒 劳拉向指定方向挥动长鞭。当鞭子撞击到墙壁时，劳拉可以突进至墙壁的位置。此后，劳拉可以再次使用该技能。 再次施法 : 劳拉跳至指定位置，落地时对周围敌人造成技能伤害并使敌人悬空。 |
| 1047500 | R | 幻影神偷 | 无消耗 / 冷却80秒 劳拉以魅惑的步伐对周围敌人实验体造成技能伤害，并拉近敌人。当命中敌人实验体时，劳拉将获得护盾，并在一段时间后对周围敌人造成技能伤害。每命中一位敌人实验体，都可以增加劳拉所获得的护盾量。 |

### 全库 JSON 命中证据

| 文件 | 相关行数 | 伤害/系数字段行数 | 样例 key |
| --- | --- | --- | --- |
| data/Achievements.json | 2 | 0 | 1047010|1047020 |
| data/AttackTypeTable.json | 1 | 0 | CharacterSkill - 라우라 W 표식 상태 |
| data/AttendRewardList.json | 1 | 0 |  |
| data/Character.json | 1 | 1 | 47 |
| data/CharacterAttributes.json | 1 | 0 |  |
| data/CharacterAttributes의 사본.json | 1 | 0 |  |
| data/CharacterLevelUpStat.json | 1 | 1 | 47 |
| data/CharacterSkillVideos.json | 5 | 0 | 1047100|1047200|1047300|1047400|1047500 |
| data/CharacterSkin.json | 6 | 0 | 1047000|1047001|1047002|1047003|1047004|1047005 |
| data/CharacterState.json | 18 | 18 | 1047101|1047111|1047211|1047221|1047301|1047302|1047303|1047304 |
| data/CharacterStateGroup.json | 11 | 11 | 1047100|1047110|1047210|1047300|1047310|1047400|1047410|1047420 |
| data/CharacterVoiceRandomCount.json | 2 | 0 | | |
| data/CobaltRecommendItem.json | 10 | 0 | ||||||| |
| data/CollectionList.json | 1 | 0 |  |
| data/EffectAndSound.json | 23 | 0 | 1047001|1047101|1047201|1047202|1047203|1047204|1047205|1047301 |
| data/Emotion.json | 6 | 0 | 2047001|2047002|2047003|2047004|2047005|2047006 |
| data/Goods.json | 2 | 0 | 라우라의 예고장|작전 교관 라우라 |
| data/HookLineProjectile.json | 1 | 0 | 1047500 |
| data/ItemSearchOption.json | 1 | 0 | 1047 |
| data/ItemSearchOptionV2.json | 2 | 0 | 104701|104702 |
| data/ItemSkillLinker.json | 2 | 0 | | |
| data/ItemWeapon.json | 2 | 2 | 104701|104702 |
| data/PersonalShop.json | 2 | 0 | | |
| data/ProjectileSetting.json | 2 | 2 | 104731|104741 |
| data/ProjectileSkinSetting.json | 3 | 0 | 104731|104731|104741 |
| data/RandomBoxItem.json | 3 | 0 | || |
| data/RandomBoxItems.json | 10 | 0 | ||||||| |
| data/RandomEquipment.json | 4 | 0 | 323|324|389|390 |
| data/RecommendedArea.json | 1 | 0 | 47101 |
| data/RecommendedList.json | 1 | 0 | 471 |
| data/RewardItem.json | 1 | 0 |  |
| data/ShopProduct.json | 15 | 0 | 47|47|1047001|1047002|1047003|1047005|2047001|2047002 |
| data/ShopProductItem.json | 10 | 0 | ||||||| |
| data/ShopProductItem의 사본.json | 7 | 0 | |||||| |
| data/ShopPromotion.json | 2 | 0 | | |
| data/Skill.json | 33 | 0 | 1047001|1047101|1047102|1047103|1047111|1047201|1047202|1047203 |
| data/SkillGroup.json | 131 | 0 | 1001000|1001010|1002000|1003000|1004000|1005000|1006000|1007000 |
| data/SkillTargetMask.json | 1 | 0 | 1047111 |
| data/Skill_Indicator.json | 33 | 0 | 1047001|1047101|1047102|1047103|1047111|1047201|1047202|1047203 |
| data/SummonObject.json | 2 | 0 | 1240|1241 |
| data/WeaponMount.json | 22 | 0 | ||||||| |


## 尤斯蒂娜 (Justyna)

结论：`related_tables_exist_but_no_linked_skill_extension_damage`

### 技能组与文本模板

| group | skillId | passiveSkillId | Skill codes | Indicator codes | 系数占位符 | Coef/Desc 文本 |
| --- | --- | --- | --- | --- | --- | --- |
| 1079000 | JustynaNormalAttack | None | 1079001 |  | no |  |
| 1079100 | None | JustynaPassive | 1079101|1079102|1079103 |  | yes | 尤斯蒂娜最多可以持有{5}的能量，施法连环炮击&歼灭炮击和迅影时将消耗能量。每{6}秒恢复{7}能量，当能量低于{8}时尤斯蒂娜将进入再充能状态。 再充能状态 : 尤斯蒂娜无法使用基本技能，{9}秒内逐渐恢复能量。 罪恶终结 : 尤斯蒂娜对带有标记的目标造成技能伤害时，将消耗标记并造成{0}(+技能增幅{1})的额外技能伤害，同时将伤害转移至周围敌人。转移的伤害对带有标记的目标造成额外技能伤害的{2}，对没有标记的目标造成{3}的伤害。每次标记被移除时，尤斯蒂娜将恢复{4}能量。 |
| 1079200 | JustynaActive1_1 | None | 1079201|1079202|1079203|1079204|1079205 |  | yes | 尤斯蒂娜朝指定方向发射两次能量，每次造成{0}(+技能增幅{1})的技能伤害。尤斯蒂娜可以在{2}秒内再次施法技能。 再次施法 : 朝指定方向发射强力能量、造成{3}(+技能增幅{4})技能伤害的同时使目标{5}秒内的移动速度降低{6}。 此技能命中敌人时，可以使聚能炮击的冷却时间减少{7}秒。 |
| 1079210 | JustynaActive1_2 | None | 1079211|1079212|1079213|1079214|1079215 |  | no |  |
| 1079300 | JustynaActive2 | None | 1079301|1079302|1079303|1079304|1079305 |  | yes | 尤斯蒂娜向指定位置发射两次能量炮击，每次造成{0}(+技能增幅{1})的技能伤害，并使目标移动速度降低{3}，持续{2}秒。 此外，命中的目标将被施加持续{4}秒的标记。 |
| 1079400 | JustynaActive3_1 | None | 1079401|1079402|1079403|1079404|1079405 |  | yes | 尤斯蒂娜朝指定方向快速移动，强化{0}秒内发起的下一次普攻，造成{1}(+技能增幅{2})的额外技能伤害。{3}秒内再次使用技能时，每次消耗的能量增加{4}，最多可以增加至{5}。进入再充能状态时，重置能量消耗。 施法连环炮击&歼灭炮击和聚能炮击期间也可以使用该技能。 |
| 1079410 | JustynaActive3_2 | None | 1079411|1079412|1079413|1079414|1079415 |  | no |  |
| 1079420 | JustynaActive3Attack | None | 1079421 |  | no |  |
| 1079500 | JustynaActive4 | None | 1079501|1079502|1079503 |  | yes | 尤斯蒂娜跃向空中，进入无法指定目标的状态，并向指定范围内的敌人发动最大火力攻击、{0}秒内每{1}秒造成{2}(+技能增幅{3})的技能伤害。施法期间可以移动，但移动速度降低{4}。无法指定目标的状态将持续至落地为止。 |
| 1079600 | JustynaSummonActive2 | None | 1079601 |  | no |  |

### SkillExtension 链接情况

| group | skillId | passiveSkillId | 链接 Extension | 伤害/系数字段 |
| --- | --- | --- | --- | --- |
| 1079000 | JustynaNormalAttack | None | - | - |
| 1079100 | None | JustynaPassive | - | - |
| 1079200 | JustynaActive1_1 | None | - | - |
| 1079210 | JustynaActive1_2 | None | - | - |
| 1079300 | JustynaActive2 | None | - | - |
| 1079400 | JustynaActive3_1 | None | - | - |
| 1079410 | JustynaActive3_2 | None | - | - |
| 1079420 | JustynaActive3Attack | None | - | - |
| 1079500 | JustynaActive4 | None | - | - |
| 1079600 | JustynaSummonActive2 | None | - | - |

### SkillExtension 编号反查

这里会使用技能组编号和技能等级编号反查 SkillExtension，用于确认是否存在只用编号、不用 skillId 明文的隐藏关联。

| key | Extension | 命中技能编号 | 伤害/系数字段 |
| --- | --- | --- | --- |

### DAK 当前简略文本

| id | 槽位 | 名称 | tooltip |
| --- | --- | --- | --- |
| 1079100 | T | 阿斯特拉能量 | 无消耗 尤斯蒂娜拥有特殊的能量，施法连环炮击&歼灭炮击和迅影技能时将消耗能量。每隔一段时间可以恢复能量，当能量低于特定数值时将进入再充能状态。 再充能状态 : 尤斯蒂娜无法使用基本技能，并在一段时间内逐渐恢复能量。 罪恶终结 : 尤斯蒂娜对带有标记的目标造成技能伤害时，将消耗标记并造成额外技能伤害，同时将伤害转移至周围敌人。转移的伤害对带有标记的目标造成额外技能伤害的100%，对没有标记的目标造成50%的伤害。每次标记被移除时，尤斯蒂娜将恢复能量。通过野生动物获得的恢复效果有所降低。 |
| 1079200 | Q | 连环炮击&歼灭炮击 | 资源消耗量 50 / 冷却1秒 尤斯蒂娜朝指定方向发射两次能量，造成技能伤害。尤斯蒂娜可以在一定时间内再次施法技能。 再次施法 : 朝指定方向发射强力能量、造成技能伤害的同时使目标一段时间内的移动速度降低。 此技能命中敌人时，可以减少聚能炮击的冷却时间。 |
| 1079300 | W | 聚能炮击 | 无消耗 / 冷却11秒 尤斯蒂娜向指定位置发射两次能量炮击，造成技能伤害并使目标一段时间内的移动速度变缓。此外，命中目标时将对目标施加持续一段时间的标记。 |
| 1079400 | E | 迅影 | 资源消耗量 50 / 冷却3秒 尤斯蒂娜朝指定方向快速移动，强化一段时间内发起的下一次普攻，造成额外技能伤害。一段时间内再次使用技能时，每次使用时将增加能量消耗，最多可以增加至50。进入再充能状态时，将重置能量消耗。 施法连环炮击&歼灭炮击和聚能炮击期间也可以使用该技能。 |
| 1079500 | R | 阿斯特拉冲击 | 无消耗 / 冷却80秒 尤斯蒂娜跃向空中，进入无法指定目标的状态，并向指定范围内的敌人发动最大火力攻击、造成技能伤害。施法期间可以进行移动，但移动速度将变缓。无法指定目标的状态将持续至落地为止。 |

### 全库 JSON 命中证据

| 文件 | 相关行数 | 伤害/系数字段行数 | 样例 key |
| --- | --- | --- | --- |
| data/AttackTypeTable.json | 1 | 0 | CharacterSkill - 유스티나 W 대상 마크 상태 |
| data/AttendRewardList.json | 1 | 0 |  |
| data/Character.json | 1 | 1 | 79 |
| data/CharacterAttributes.json | 1 | 0 |  |
| data/CharacterAttributes의 사본.json | 1 | 0 |  |
| data/CharacterLevelUpStat.json | 1 | 1 | 79 |
| data/CharacterSkin.json | 3 | 0 | 1079000|1079001|1079002 |
| data/CharacterState.json | 34 | 34 | 1079101|1079111|1079121|1079122|1079123|1079131|1079141|1079151 |
| data/CharacterStateGroup.json | 12 | 12 | 1079100|1079110|1079130|1079140|1079210|1079300|1079310|1079320 |
| data/CharacterVoiceRandomCount.json | 7 | 0 | |||||| |
| data/EffectAndSound.json | 11 | 0 | 1079001|1079002|1079003|1079101|1079201|1079202|1079301|1079302 |
| data/Emotion.json | 8 | 0 | 2079001|2079002|2079003|2079004|2079005|2079006|2079007|2079008 |
| data/Goods.json | 2 | 0 | 히스이&유스티나 로비 스크린|럭키 히어로 바니유스티나 |
| data/ItemSearchOption.json | 1 | 0 | 1079 |
| data/PersonalShop.json | 2 | 0 | | |
| data/ProjectileSetting.json | 2 | 2 | 107901|107902 |
| data/ProjectileSkinSetting.json | 2 | 0 | 107901|107902 |
| data/RandomBoxItems.json | 5 | 0 | |||| |
| data/RecommendedList.json | 1 | 0 | 791 |
| data/RewardItem.json | 1 | 0 |  |
| data/ShopProduct.json | 8 | 0 | 0|79|79|1079001|2079001|2079002|2079003|2079004 |
| data/ShopProductItem.json | 1 | 0 |  |
| data/ShopProductItem의 사본.json | 1 | 0 |  |
| data/Skill.json | 34 | 0 | 1079001|1079101|1079102|1079103|1079201|1079202|1079203|1079204 |
| data/SkillGroup.json | 131 | 0 | 1001000|1001010|1002000|1003000|1004000|1005000|1006000|1007000 |
| data/SkillTargetMask.json | 1 | 0 | 1079421 |
| data/SummonObject.json | 2 | 0 | 1561|1562 |
| data/WeaponMount.json | 20 | 0 | ||||||| |

