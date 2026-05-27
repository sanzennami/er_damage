# 配置 JSON 修改指南

这份说明用于维护计算器里的 JSON 配置。项目使用的是标准 JSON，不能写 `//` 或 `/* */` 注释，所以配置文件里使用 `_comment`、`_usage` 这类说明字段作为“注释头”。

## 常用修改入口

- `src/data/localConfig.json`：主要人工配置入口。改装备、手动英雄技能、天赋、连段时优先改这里。
- `src/data/skillDamageAugments.json`：补充自动表没覆盖的强化普攻、强化技能、额外伤害等条目。
- `src/data/externalSkillDamageFallback.json`：为缺少结构化技能伤害的英雄提供外部来源兜底。
- `src/data/helpNotes.json`：页面帮助气泡说明文案。
- `src/data/announcement.json`：公告文案。
- `src/data/erSkillDamageTable.json`、`src/data/erSkillTables.json`、`src/data/erGameData.json`：生成数据源，适合查来源，不建议日常手改。

## 英雄技能伤害怎么配

技能条目通常放在 `skills` 数组中，核心字段如下：

```json
{
  "id": "unique-skill-id",
  "hero": "英雄中文名",
  "title": "Q 一段",
  "bases": "50,80,110,140,170",
  "formula": "base + ap * 0.65",
  "maxLevel": 5,
  "group": 1001200,
  "skillId": "JackieActive1",
  "dataKey": "Damage"
}
```

- `id`：技能唯一 ID。连段里的 `hits` 会引用它，改名后也要同步改连段。
- `hero`：英雄中文名。计算器按英雄聚合技能。
- `title`：界面显示名，建议写槽位和伤害段，例如 `Q 一段`、`R 二段`。
- `bases`：每级基础伤害，用英文逗号分隔。5 级技能写 5 个数，3 级大招写 3 个数。
- `formula`：伤害公式。计算器会先按技能等级取 `base`，再计算该表达式。
- `maxLevel`：最大等级。应与 `bases` 的数量一致。
- `group`、`skillId`、`dataKey`：来源追踪字段。不是手动条目的必填项，但建议保留，方便和导出表、官方数据对照。

## 公式变量

`formula` 支持简单数学表达式和数组按等级取值：

- `base`：当前技能等级对应的基础伤害，来自 `bases`。
- `ap`：技能增幅。
- `attack`：最终攻击力。
- `extraAttack`：额外攻击力。
- `targetHp`：目标最大体力。
- `stacks`：叠层数，界面里的叠层输入会传入这里。
- `level`：当前技能等级，从 1 开始。

常见写法：

```json
"formula": "base + ap * 0.65"
"formula": "base + attack * 1.1"
"formula": "base + targetHp * 0.08"
"formula": "(base + ap * 0.25) * (1 + stacks * 0.2)"
"formula": "base + ap * [0.45,0.5,0.55,0.6,0.65][level - 1]"
```

注意：公式只能使用数字、英文变量名、加减乘除、括号、英文逗号、数组中括号。不要写中文、百分号或函数名。`65% 技能增幅` 要写成 `ap * 0.65`。

## 连段怎么配

连段放在 `combos` 数组中：

```json
{
  "id": "hero-full-combo",
  "hero": "英雄中文名",
  "title": "QWE 全中",
  "note": "可写备注",
  "hits": {
    "skill-id-q": 1,
    "skill-id-w": 2
  }
}
```

`hits` 的键必须是技能 `id`，值是命中次数。一个多段技能如果每段伤害不同，建议拆成多个 skill 条目，再在连段里分别写次数。

## 装备和天赋

装备在 `equipment` 数组中维护。常用字段：

- `type`：装备槽位，通常是 `武器`、`衣服`、`头部`、`手部`、`鞋子`。
- `name`：装备名。
- `attackPower`：攻击力。
- `ap`：技能增幅。
- `cd`：冷却缩减。
- `pen`、`penPct`：固定/百分比穿透。
- `dmgAmp`：伤害增幅。
- `maxHp`：最大体力。
- `effect`：装备特殊效果说明，只影响展示，不直接参与公式。

天赋在 `talents` 数组中维护，字段与装备的可加属性类似。需要新增固定增幅时，优先新增一条天赋或修改已有手动天赋。

## 自动生成表的维护建议

`erSkillDamageTable.json` 中的 `damageRows` 会被代码转换为技能条目：

- `lv1` 到 `lv5`：各等级基础伤害。
- `coefLv1` 到 `coefLv5`：各等级系数。
- `coefficientText`、`description`：来源文本，方便核对公式。

如果只是修正个别英雄的展示或手动计算，优先在 `localConfig.json` 或补充表中覆盖。只有在重新导出官方数据时，才修改生成脚本并重建这些表。
