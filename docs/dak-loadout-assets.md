# DAK.GG 潜能与战术技能素材

来源页面：https://dak.gg/er/routes/simulator/YuMin?hl=zh-CN

数据接口：
- https://er.dakgg.io/api/v1/data/trait-skills?hl=zh-CN
- https://er.dakgg.io/api/v1/data/tactical-skills?hl=zh-CN

生成时间：2026-05-21T19:37:53.336Z

## 命名规范

- 潜能分组图标：`assets/loadout/trait-groups/group-{groupKey}.png`
- 潜能图标：`assets/loadout/traits/trait-{id}-{groupKey}-{type}.png`
- 战术技能图标：`assets/loadout/tactical-skills/tactical-{id}.png`
- 机器可读清单：`assets/loadout/manifest.json`
- 前端可直接 import 的副本：`src/data/dakLoadoutAssets.json`

## 潜能分组与附属关系

| group | 分组名 | 说明 | 分组图片 | 启用潜能 |
| --- | --- | --- | --- | --- |
| Havoc | 破坏型 | 强化攻击 & 持续性伤害 | /assets/loadout/trait-groups/group-havoc.png | 绝对武力 (核心, 7000201)<br>吸血鬼 (核心, 7000401)<br>肾上腺素 (核心, 7000601)<br>加速度 (核心, 7000701)<br>爆发力 (辅助 1, 7010501)<br>狂乱 (辅助 1, 7010901)<br>弱肉强食 (辅助 1, 7011001)<br>伤痕 (辅助 1, 7011501)<br>猎魂・熊 (辅助 2, 7011101)<br>猎魂・野猪 (辅助 2, 7011201)<br>猎魂・狼 (辅助 2, 7011301)<br>猎魂・野狗 (辅助 2, 7011401) |
| Fortification | 抵抗型 | 耐久性 & 负面效果 | /assets/loadout/trait-groups/group-fortification.png | 金刚碎片 (核心, 7100101)<br>铁匠的觉悟 (核心, 7100201)<br>天使护翼 (核心, 7100401)<br>惩戒 (核心, 7100501)<br>无惧感 (辅助 1, 7110101)<br>镇痛剂 (辅助 1, 7111001)<br>不屈 (辅助 1, 7110701)<br>警戒心 (辅助 1, 7111101)<br>钢化 (辅助 2, 7110401)<br>贪吃蛇 (辅助 2, 7110601)<br>特工队 (辅助 2, 7110201)<br>淬火 (辅助 2, 7111201) |
| Support | 支援型 | 创新式的战斗辅助 | /assets/loadout/trait-groups/group-support.png | 超再生 (核心, 7200101)<br>强化装置 (核心, 7200201)<br>治愈装置 (核心, 7200301)<br>无私 (核心, 7200501)<br>狩猎的快感 (辅助 1, 7211001)<br>荆棘丛 (辅助 1, 7210101)<br>压迫感 (辅助 1, 7211401)<br>爆炸仙人掌 (辅助 1, 7211301)<br>补给员 (辅助 2, 7210401)<br>金币法则 (辅助 2, 7211101)<br>优惠券 (辅助 2, 7210801)<br>露营指南 (辅助 2, 7110801) |
| Chaos | 混沌型 | 巨大的额外伤害&辅助技能 | /assets/loadout/trait-groups/group-chaos.png | 星尘蓄势 (核心, 7300101)<br>鬼火 (核心, 7300201)<br>霹雳 (核心, 7000501)<br>涡流 (核心, 7300301)<br>循环系统 (辅助 1, 7310201)<br>伤口撕裂 (辅助 1, 7010701)<br>制动力 (辅助 1, 7310401)<br>急速射击 (辅助 1, 7310601)<br>凝力 (辅助 2, 7310101)<br>超频 (辅助 2, 7310301)<br>R_echarger (辅助 2, 7310501) |

## 未启用/旧潜能

这些条目由 DAK.GG 接口返回，但 `active=false`，通常不出现在当前模拟器可选列表中。

| id | 潜能名 | 分组 | 类型 | 图片 |
| --- | --- | --- | --- | --- |
| 7010101 | 制动力 | 无分组 | 未启用/旧数据 | /assets/loadout/traits/trait-7010101-none-none.png |
| 7010301 | 吸灵 | 无分组 | 未启用/旧数据 | /assets/loadout/traits/trait-7010301-none-none.png |
| 7010311 | 内啡肽 | 破坏型 | 未启用/旧数据 | /assets/loadout/traits/trait-7010311-havoc-none.png |
| 7010401 | 沙漠化逆转 | 无分组 | 未启用/旧数据 | /assets/loadout/traits/trait-7010401-none-none.png |
| 7010601 | 吸灵装置 | 破坏型 | 未启用/旧数据 | /assets/loadout/traits/trait-7010601-havoc-none.png |
| 7110901 | 肉食主义 | 破坏型 | 未启用/旧数据 | /assets/loadout/traits/trait-7110901-havoc-none.png |
| 7200401 | 追击者 | 无分组 | 未启用/旧数据 | /assets/loadout/traits/trait-7200401-none-none.png |
| 7210501 | 战争机器 | 支援型 | 未启用/旧数据 | /assets/loadout/traits/trait-7210501-support-none.png |

## 战术技能

| id | 名称 | 说明 | 图片 |
| --- | --- | --- | --- |
| 30 | 闪灵 | 使用后向指定位置移动一段距离。 强化效果 : 使用后，暂时增加移动速度且无视碰撞。 | /assets/loadout/tactical-skills/tactical-30.png |
| 40 | 震裂 | 使用后对周围敌人造成技能伤害，并降低其移动速度。 强化效果 : 在一定时间内对周围的敌人造成伤害。 | /assets/loadout/tactical-skills/tactical-40.png |
| 50 | 违规者 | 改装E.M.O.T.E爆炸时，能够增加盟友体力并对敌人造成真实伤害。 强化效果 : 赋予更强的效果。 | /assets/loadout/tactical-skills/tactical-50.png |
| 60 | 赤色风暴 | 使用时短距离移动，暂时增加普攻射程。 强化效果 : 强化射程增加效果。 | /assets/loadout/tactical-skills/tactical-60.png |
| 70 | 超越 | 能够提供强大的护盾并吸收爆发性的伤害。 强化效果 : 增加一段时间内的负面效果抵御。 | /assets/loadout/tactical-skills/tactical-70.png |
| 80 | 极光陀螺 | 暂时陷入凝滞状态，不会受到任何干扰。 强化效果 : 凝滞状态下，快速缩减自身技能冷却。 | /assets/loadout/tactical-skills/tactical-80.png |
| 90 | 净化 | 立即解除自身和周围盟友的负面状态，增加移动速度。 强化时：使用时，增加自身和周围盟友的负面效果抵御。 | /assets/loadout/tactical-skills/tactical-90.png |
| 110 | 羁绊者 | 当周围实验体在战斗中失去体力时，根据已失体力获得成比例的能量。 使用后消耗所有能量，赋予周围盟友移动速度和吸血-所有伤害效果。 强化效果 : 获得更多能量。 | /assets/loadout/tactical-skills/tactical-110.png |
| 120 | 阔步者 | 使用后，朝着敌人实验体移动时的移动速度增加，持续时间内对敌人实验体造成伤害时，将造成额外技能伤害，且暂时增加移动速度。 强化效果 : 阔步者对目标造成伤害时，目标的移动速度降低。 | /assets/loadout/tactical-skills/tactical-120.png |
| 130 | 实刃 | 使用后对周围敌人造成伤害，并根据承受伤害的敌人数增加一定比例的移动速度。 强化效果 : 额外召唤实刃并造成额外伤害。 | /assets/loadout/tactical-skills/tactical-130.png |
| 140 | 虚言 | 消耗体力并增加所有伤害。消耗的体力会慢慢恢复。 强化效果 : 参与击杀敌人时，更新效果。 | /assets/loadout/tactical-skills/tactical-140.png |
| 150 | 治愈之风 | 恢复范围内盟友的体力。 强化效果 : 被风扫过的队友，在一定时间内将额外恢复体力。 | /assets/loadout/tactical-skills/tactical-150.png |
| 160 | 斥力弹 | 使用时，短距离进行位移，并对到达位置周围距离最近的敌方实验体发射导弹，对命中的敌人造成真实伤害。 强化效果：额外发射导弹。 | /assets/loadout/tactical-skills/tactical-160.png |
| 170 | 等离子冲击 | 使用时向前方短距离冲刺，并发射等离子能量，对命中的敌人造成技能伤害并降低其移动速度。 即使被多个投射物命中，也仅触发一次伤害。 强化效果： 降低被投射物命中的敌人的防御力。 | /assets/loadout/tactical-skills/tactical-170.png |
| 190 | 光之翼 | 使用时，移除自身承受的移动速度降低效果，并在一定时间内提升移动速度与攻击速度。普攻命中敌方实验体时，降低目标移动速度。 强化效果：普攻命中敌方实验体时，增加持续时间。 | /assets/loadout/tactical-skills/tactical-190.png |
| 500010 | 未命名战术技能 500010 |  | /assets/loadout/tactical-skills/tactical-500010.png |
| 500020 | 重力场 | 稍后将敌人拉至自身周围，并使其陷入晕厥。 | /assets/loadout/tactical-skills/tactical-500020.png |
| 500030 | 滚雷 | 大幅增加自身一段时间内的移动速度。 | /assets/loadout/tactical-skills/tactical-500030.png |
| 500040 | 爆震 | 爆发巨大的能量，并在短时间后攻击附近的敌人实验体，成功击中时将获得额外效果。 未能成功击中时，将会收到惩罚。 | /assets/loadout/tactical-skills/tactical-500040.png |
| 500050 | 脉冲 | 停止一段时间后，向指定方向突进。 | /assets/loadout/tactical-skills/tactical-500050.png |
| 500060 | 祈愿 | 为一定范围内的所有队友提供护盾。 | /assets/loadout/tactical-skills/tactical-500060.png |
| 500070 | 地碎 | 向指定方向的地面生成粉碎区域，造成伤害后附加晕厥和降低移动速度的效果。 | /assets/loadout/tactical-skills/tactical-500070.png |
| 500080 | 梦幻拳 | 向指定的方向打出梦幻拳。 被命中的目标将沿着出击的方向被击飞。 | /assets/loadout/tactical-skills/tactical-500080.png |
| 500090 | 流星 | 稍后陨石将坠落在指定的位置并造成巨大的伤害。 被陨石击中的敌人将暂时陷入晕厥。 | /assets/loadout/tactical-skills/tactical-500090.png |
| 500100 | 闪电之盾 | 给予指定的盟友闪电之盾，解除减益效果。 闪电之盾消失时将给周围造成伤害。 | /assets/loadout/tactical-skills/tactical-500100.png |
| 500110 | 祝福：冥想 | 立即恢复部分体力上限，此后在短时间内进行额外恢复。 | /assets/loadout/tactical-skills/tactical-500110.png |
| 500120 | 闪灵 | 使用后向指定位置移动一段距离。 强化效果 : 使用后，暂时增加移动速度且无视碰撞。 | /assets/loadout/tactical-skills/tactical-500120.png |
| 500130 | 震裂 | 使用后对周围敌人造成技能伤害，并降低其移动速度。 强化效果 : 在一定时间内对周围的敌人造成伤害。 | /assets/loadout/tactical-skills/tactical-500130.png |
| 500140 | 违规者 | 改装E.M.O.T.E爆炸时，能够增加盟友体力并对敌人造成真实伤害。 强化效果 : 赋予更强的效果。 | /assets/loadout/tactical-skills/tactical-500140.png |
| 500150 | 赤色风暴 | 使用时短距离移动，暂时增加普攻射程。 强化效果 : 强化射程增加效果。 | /assets/loadout/tactical-skills/tactical-500150.png |
| 500160 | 超越 | 能够提供强大的护盾并吸收爆发性的伤害。 强化效果 : 增加一段时间内的负面效果抵御。 | /assets/loadout/tactical-skills/tactical-500160.png |
| 500170 | 极光陀螺 | 暂时陷入凝滞状态，不会受到任何干扰。 强化效果 : 凝滞状态下，快速缩减自身技能冷却。 | /assets/loadout/tactical-skills/tactical-500170.png |
| 500180 | 净化 | 立即解除自身和周围盟友的负面状态，增加移动速度。 强化时：使用时，增加自身和周围盟友的负面效果抵御。 | /assets/loadout/tactical-skills/tactical-500180.png |
| 500190 | 羁绊者 | 当周围实验体在战斗中失去体力时，根据已失体力获得成比例的能量。 使用后消耗所有能量，赋予周围盟友移动速度和吸血-所有伤害效果。 强化效果 : 获得更多能量。 | /assets/loadout/tactical-skills/tactical-500190.png |
| 500200 | 阔步者 | 使用后，朝着敌人实验体移动时的移动速度增加，持续时间内对敌人实验体造成伤害时，将造成额外技能伤害，且暂时增加移动速度。 强化效果 : 阔步者对目标造成伤害时，目标的移动速度降低。 | /assets/loadout/tactical-skills/tactical-500200.png |
| 500210 | 实刃 | 使用后对周围敌人造成伤害，并根据承受伤害的敌人数增加一定比例的移动速度。 强化效果 : 额外召唤实刃并造成额外伤害。 | /assets/loadout/tactical-skills/tactical-500210.png |
| 500220 | 虚言 | 消耗体力并增加所有伤害。消耗的体力会慢慢恢复。 强化效果 : 参与击杀敌人时，更新效果。 | /assets/loadout/tactical-skills/tactical-500220.png |
| 500230 | 治愈之风 | 恢复范围内盟友的体力。 强化效果 : 被风扫过的队友，在一定时间内将额外恢复体力。 | /assets/loadout/tactical-skills/tactical-500230.png |
| 500240 | 附着 | 朝指定方向投掷投射体，将对首个命中的目标造成伤害，再次使用技能时向目标突进。 | /assets/loadout/tactical-skills/tactical-500240.png |
| 500250 | 斥力弹 | 使用时，短距离进行位移，并对到达位置周围距离最近的敌方实验体发射导弹，对命中的敌人造成真实伤害。 强化效果：额外发射导弹。 | /assets/loadout/tactical-skills/tactical-500250.png |
| 500260 | 等离子冲击 | 使用时向前方短距离冲刺，并发射等离子能量，对命中的敌人造成技能伤害并降低其移动速度。 即使被多个投射物命中，也仅触发一次伤害。 强化效果： 降低被投射物命中的敌人的防御力。 | /assets/loadout/tactical-skills/tactical-500260.png |
| 500270 | 衰弱 | 降低指定敌方实验体的移动速度及其造成的伤害。 强化效果：赋予更强的效果。 | /assets/loadout/tactical-skills/tactical-500270.png |
| 500280 | 光之翼 | 使用时，移除自身承受的移动速度降低效果，并在一定时间内提升移动速度与攻击速度。普攻命中敌方实验体时，降低目标移动速度。 强化效果：普攻命中敌方实验体时，增加持续时间。 | /assets/loadout/tactical-skills/tactical-500280.png |
| 1000000 | 未命名战术技能 1000000 |  | 缺失：https://cdn.dak.gg/assets/er/game-assets/11.2.0/SkillIcon_1060000.png |

## 缺失图片

| id/key | 名称 | 原始 URL | 错误 |
| --- | --- | --- | --- |
| 1000000 | 未命名战术技能 1000000 | https://cdn.dak.gg/assets/er/game-assets/11.2.0/SkillIcon_1060000.png | Failed to download https://cdn.dak.gg/assets/er/game-assets/11.2.0/SkillIcon_1060000.png: 403 Forbidden |
