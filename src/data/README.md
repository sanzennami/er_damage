# src/data 数据层说明

所有数据都是标准 JSON（不能写 `//` 注释），项目约定用 `_comment` / `_usage` 字段当注释头，代码会忽略它们。

目录分两层：

- **顶层 = 编辑入口**，也是 App 唯一读取的数据；
- **`sources/` = 原始导入源**，由各抓取/导出脚本产出，App **不读**，只作为整合的输入和溯源留档。

```
src/data/
├─ heroSkills.json          ← 技能唯一入口（545 条，一段伤害一条）
├─ equipment.json           ← 装备（661 件）+ 属性定义
├─ characters.json          ← 实验体基础/成长属性 + 技能组索引
├─ specialSkillRules.json   ← 展示与结算行为（不含公式）
├─ masteryStats.json        ← 每级武器熟练度成长
├─ itemUniqueEffects.json   ← 装备独有效果名映射
├─ dakLoadoutAssets.json    ← 潜能 / 战术技能及图标
├─ dakItemSkillIcons.json   ← 装备图标与 tooltip
├─ localConfig.json         ← 页面配置表默认值（天赋 / 连段）
├─ heroStatus.json          ← 每个实验体是否已核对（决定默认列不列出来）
├─ patchLog.json            ← 官方补丁日志（目标态，跟版本更新）
├─ dataMigrations.json      ← 旧缓存译名迁移
├─ helpNotes.json           ← 帮助气泡文案
├─ announcement.json        ← 公告栏
└─ sources/                 ← 原始导入源（App 不读）
   ├─ erSkillDamageTable.json
   ├─ erGameData.json
   ├─ skillDamageAugments.json
   ├─ externalSkillDamageFallback.json
   ├─ inGameSkillCapture.json
   └─ erSkillTables.json
```

---

## heroSkills.json —— 技能唯一入口

**改技能只改这一个文件。** 同一段伤害不会出现第二条，也不需要再跨文件比较优先级。

一段伤害的身份是 `hero + group + skillId + dataKey`。整合脚本按权威值挑出唯一胜出者，
被淘汰来源的数值原样记进 `alternatives`，方便人工核对，但**不参与计算**。

```jsonc
{
  "id": "011-yuki-p-1011100-damage",
  "hero": "雪",
  "heroKey": "Yuki",
  "slot": "P",
  "title": "P 武装式 伤害",
  "group": 1011100,
  "skillId": "None",
  "dataKey": "Damage",

  "bases": "25,35,45",                    // 各级基础值，英文逗号分隔
  "maxLevel": 3,                          // 应与 bases 个数一致
  "formula": "40 + attack*base*0.01",     // 见下方「公式变量」

  "manual": true,                         // ← 手改后加上，重跑整合不会被覆盖
  "source": "manual",
  "authority": 90,
  "updatedAt": "2026-05-21T23:05:42.052Z",
  "sourceUrl": "https://playeternalreturn.com/posts/news/3629?hl=zh-CN",
  "sourceNote": "官方公告 11.4 数值",

  "alternatives": [                       // 只是留档，不参与计算
    { "source": "er-skill-damage-table", "authority": 20, "bases": "15,30,45", "formula": "base" }
  ]
}
```

### 权威值

同一段伤害有多个来源时，按权威值择优（越大越优先）：

| 权威值 | `source` | 含义 |
| ---: | --- | --- |
| 100 | `special-skill-rule` | 人工特殊计算规则（俞岷、奇娅拉） |
| 90 | `manual` | **人工录入 / 手改**（条目上 `"manual": true`） |
| 80 | `official-patch-note`、`external-official-patch` | 官方更新公告 |
| 60 | `in-game-client` | 客户端界面读数 |
| 40 | `external-wiki-current` 等 | 官方 Wiki |
| 20 | `er-skill-damage-table` | er-gamedata 结构化解包 |
| 10 | `er-gamedata` | er-gamedata 旧版解包（最不可信） |

同权威值再比 `updatedAt` 取新。举例：一段伤害同时有人工录入、官方公告、Wiki、客户端四份数据 → **保留人工录入那条**，其余三条进 `alternatives`。

### 公式变量

| 变量 | 对应官方文案 | 数据来源 |
| --- | --- | --- |
| `base` | 该技能等级的基础值 | `bases` 按 `level` 取 |
| `ap` | 技能增幅 | 面板 |
| `attack` | 攻击力 | 面板 |
| `extraAttack` | 额外攻击力 | 面板 |
| `targetHp` | 目标体力上限 | 目标设置 |
| `targetCurrentHp` | **目标当前体力** | 界面「目标当前体力 %」× 体力上限 |
| `targetLostHp` | **目标已失体力** | 界面「目标已失体力 %」× 体力上限 |
| `maxHp` | **自身体力上限** | 界面「自身血量」 |
| `selfCurrentHp` | **自身当前体力** | 界面「自身当前体力 %」× 自身血量 |
| `selfLostHp` | **自身已失体力** | 同上取补 |
| `extraHp` | **自身额外体力** | 装备 + 潜能提供的那部分 |
| `defense` | **自身防御力** | 实验体成长 + 装备 |
| `shield` | **自身护盾量** | 界面「自身护盾」 |
| `critChance` | **暴击率**（0~1） | 装备汇总 |
| `basicAttackAmp` | **普攻增幅**（0~1） | 武器熟练度 + 装备词条 + 独有效果 |
| `stacks` | 叠层 | 叠层选择器 |
| `level` | 技能等级，从 1 开始 | 技能栏 Lv. |
| `heroLevel` | 实验体等级 1~20 | 界面「熟练度等级」 |

官方文案里「体力上限」指自己的，用 `maxHp`；「额外体力」指装备加的那部分，用 `extraHp`；
「目标体力上限」才是 `targetHp`。三者经常出现在同一句里，别搞混。

### 普攻增幅（`basicAttackAmp`）

官方 Wiki 的普攻公式是：

```
((攻击力 × 100/(100+防御) × 暴击修正) + 普攻额外伤害 − 目标承受普攻伤害减少)
  × (1 + 普攻增幅% − 目标普攻减伤%)
```

两个要点：**普攻增幅是最后一道乘区**，跟技能增幅是互不相干的两个桶；**「普攻额外伤害」那个固定值
在防御之后才加**，既不吃防御也不吃暴击。

目标那边的减伤也分两档，**普攻和技能各走各的**：

| | 每级 | 1 级 | 20 级 |
| --- | ---: | ---: | ---: |
| 目标熟练度 → 普攻减伤 | 1% | 1% | 20% |
| 目标熟练度 → 技能减伤 | 0.8% | 0%（2 级起算） | 16% |

有些技能被官方判定为普攻伤害（公告里写成 `(攻击力的X%) * (普攻增幅)`，或客户端直接标注）。
**这类段落写 `"damageType": "basicAttack"` 即可**，公式里不用管普攻增幅，结算时会自动换到
普攻那条线（吃普攻增幅、吃普攻减伤）：

```jsonc
"formula": "attack * [0.35,0.45,0.55][level - 1]",
"damageType": "basicAttack"
```

`basicAttackAmp` 变量仍然可用，留给那些只需要乘一次增幅、但其余仍按技能结算的特例。
两者**不要同时用**，否则普攻增幅算两遍。

再注意跟 `kind: "basicAttack"` 区分开：那个是「给下一次普攻附加一段伤害」的强化普攻
（希瑟拉 P、彰一 P 骗局），只决定显示在哪个面板；那段附加伤害本身吃的是技能增幅、走技能结算。
李黛琳 P 两个字段都有：它既显示在强化普攻面板，本身也是普攻伤害。

装备侧的 `increaseBasicAttackDamageRatioByLv` / `increaseBasicAttackDamageByLv` 由
`aggregateEquipmentStats` 乘好实验体等级后折进 `increaseBasicAttackDamageRatio` /
`increaseBasicAttackDamage`，取值时**不要再乘一次等级**。

```jsonc
"formula": "base + ap * 0.65"
"formula": "base + attack * 0.55 + targetHp * 0.07"
"formula": "base + ap * [0.45,0.5,0.55,0.6,0.65][level - 1]"   // 按等级取系数
"formula": "base + heroLevel * 8 + ap * 0.6"                  // 官方写法 (+实验体等级*8)
"formula": "base + ap * 0.5 + maxHp * 0.06"                   // 官方写法 (+体力上限6%)
"formula": "base + ap * 0.55 + extraHp * 0.12"                // 官方写法 (+额外体力12%)
"formula": "(base + attack * 0.13) * stacks"                  // 「每个叠层造成…」
"formula": "(base + ap * 0.25) * (1 + stacks * 0.2)"          // 「每层增伤 20%」
```

### 叠层技能

公式里用了 `stacks` 的英雄，界面会**自动**出现叠层选择器，不必再去改 `specialSkillRules.json`。
条目上可以带两个可选字段控制它：

```jsonc
"maxStacks": 4,              // 选择器上限，不写按 4
"stackLabel": "售后服务标记"   // 选择器标题，不写显示「叠层」
```

`specialSkillRules.json` 里显式配了 `stackSelector` 的英雄（奇娅拉）仍以配置为准。

### 会打多下的技能

条目上写 `maxHits` 就会出现命中次数步进器，并把 1~N 次的伤害逐档列出来：

```jsonc
"maxHits": 5,                    // 最多命中几次
"defaultHits": 1,                // 默认选中几次，不写按 1
"hitLabel": "青风命中次数",        // 步进器标题，不写显示「命中次数」
"hitNote": "腾空 3 秒内最多结算 5 次。"
```

万尼亚 Q 是 `maxHits: 2`（飞出 + 回收），W 青风是 `maxHits: 5`（腾空期间 5 跳）。

### kind：不是普通伤害段的条目

| `kind` | 含义 | 界面表现 |
| --- | --- | --- |
| `shield` | 护盾量 | 技能栏里带蓝色「护盾」标记，不吃减伤、不计入伤害合计 |
| `heal` | 治疗量 | 同上 |
| `basicAttack` | **给下一次普攻附加的额外伤害** | 不进技能栏，改进「强化普攻」面板，和普攻本体一起算总量 |
| `buff` | **没有伤害、只给属性加成的技能** | 技能栏里带「增益」标记，自带 ± 叠层步进器 |

### `kind: "buff"` —— 只加属性、不打伤害的技能

卡洛琳 W 这种「本身没有伤害段，但会给技能增幅」的技能，用 `buff` 建条。好处是这一槽因此
有了自己的等级选择器，加成能真正跟着技能等级走：

```jsonc
{
  "title": "W 真实之镜/虚伪之镜 镜子技能增幅",
  "bases": "5,7,9",        // 每级的百分点，5 = 5%
  "formula": "base",
  "kind": "buff",
  "buffKey": "apPct",      // 进哪个桶
  "maxStacks": 2,          // ± 步进器的上限
  "stackLabel": "叠层"
}
```

`buffKey` 可选 `apPct`（技能增幅百分比）、`damageBonus`（伤害提升）、`basicAttackAmp`（普攻增幅）。
最终加成 = `bases[技能等级 - 1] / 100 × 已选层数`。

另外还有一个独立字段 `damageType`，决定这段走哪条结算线，可以和 `kind` 同时存在：

| `damageType` | 结算 | 例子 |
| --- | --- | --- |
| 不写 | 常规技能伤害：防御修正 × (1 + 伤害提升 − 技能减伤) | 绝大多数 |
| `"true"` | **真实伤害**，不吃防御也不吃减伤，最终值等于原始值 | 凯希 P 外伤 / 致命外伤 |
| `"basicAttack"` | **普攻伤害**：防御修正 × (1 + 伤害提升 + **普攻增幅** − **普攻减伤**) | 李黛琳醉仙2段、莉央替弓、艾登 Q |

`"basicAttack"` 用于官方判定为普攻伤害的技能段 —— 公告里通常写成 `(攻击力的X%) * (普攻增幅)`，
或客户端提示框直接标注「普攻伤害」。标了这个就**不要**再在公式里乘 `(1 + basicAttackAmp)`，
否则普攻增幅会算两遍（审计脚本会报错）。

```jsonc
"kind": "basicAttack",
"formula": "base + attack * [0.3,0.4,0.5][level - 1]"
```

希瑟拉收回小威后的强化平A、雪琳 P 剑道、杰琪 W 断筋、克雷弗 P、卡洛琳 R、万尼亚 P 遐思
都属于这一类。官方文案里带「强化下一次普攻」「下次普攻造成…额外伤害」的技能共 13 个，
录入时记得带上这个 `kind`，否则会被当成一段独立技能伤害。

只允许数字、英文变量名、`+ - * / ( ) , [ ] _`。**含中文、百分号或函数名的表达式会被白名单拦下并静默返回 0**，`65% 技能增幅` 要写成 `ap * 0.65`。

### 渐进伤害

随蓄力/弹跳档位递增的技能，在条目上加 `progressiveDamage`（例如爱琳跳跳球）。带这个字段时 `formula` 不再参与该技能的计算：

```jsonc
"progressiveDamage": {
  "id": "bounces", "label": "弹跳次数", "unit": "跳",
  "min": 1, "max": 4, "default": 1,
  "base": { "fromMultiplier": 1, "toMultiplier": 1.75 },
  "coefficient": { "variable": "ap", "from": 0.55, "to": 0.9625 }
}
```

### 新增一条技能

用一个新的 `dataKey` 即可（身份不同就不会被合并）。`group` / `skillId` 可从 `characters.json` 的 `skillGroups` 里查。
没有 `group`/`skillId`/`dataKey` 的条目退回用 `hero + title` 作为身份。

---

## specialSkillRules.json —— 展示与结算行为

**不含公式**（公式统一在 `heroSkills.json`）。这里只描述"算出来之后怎么显示、怎么叠加"：

```jsonc
"heroes": {
  "俞岷": {
    "manual": true,                 // 该英雄不接受任何生成数据
    "display": {
      "yumin-q": {
        "label": "普通Q（三段）",
        "hits": 3,                  // 命中段数：单发先取整再乘段数
        "secondaryScale": 0.5,      // 次要目标倍率，写了才显示主/次拆分
        "showBreakdown": true,
        "totalLabelSuffix": "（只算全中）",
        "maxTargets": 3             // 目标数上限，默认 10
      }
    },
    "combos": [ { "id": "yumin-q3", "title": "Q 三跳全中", "hits": { "yumin-q": 3 } } ]
  },
  "奇娅拉": {
    "stackSelector": { "label": "R2层数", "values": [0,1,2,3,4], "default": 1, "max": 4 }
  }
}
```

`stackSelector` 的选择值会传给公式里的 `stacks` 变量。顶层 `defaultHero` 是页面初始英雄。

> **改数值 → `heroSkills.json`；改显示/叠加方式 → 这里。**

---

## equipment.json —— 装备

与技能分开存储。`itemStatDefinitions` 是全部 60 个属性键的定义，`equipment` 是 661 件装备。

```jsonc
{
  "code": 130501,
  "type": "武器",                       // 武器 / 衣服 / 头部 / 手部 / 鞋子
  "weaponType": "圣器 / Arcana",
  "weaponTypeRaw": "Arcana",
  "name": "女帝",
  "quality": "传说",                     // 普通/高级/稀有/英雄/传说/神话
  "isCompletedItem": true,
  "effect": "",                          // 独有效果名，英文逗号分隔
  "stats": { "attackPower": 40, "skillAmp": 93, "cooldownReduction": 15 },
  "ap": 93, "attackPower": 40, "cd": 15  // 扁平别名，见下
}
```

**两套属性写法**：读取时优先 `stats` 里的官方键，为 0 时回退到扁平别名。

| `stats` 键 | 扁平别名 | 含义 |
| --- | --- | --- |
| `attackPower` | `attackPower` | 攻击力 |
| `skillAmp` | `ap` | 技能增幅 |
| `skillAmpRatio` | `apPct` | 技能增幅% |
| `cooldownReduction` | `cd` | 冷却缩减 |
| `defense` / `maxHp` / `sightRange` | 同名 | — |
| `penetrationDefense` | `pen` | 固定防穿 |
| `penetrationDefenseRatio` | `penPct` | 百分比防穿 |
| —（无别名） | `dmgAmp` | 伤害增幅 |

三条特殊规则：

1. `itemStatDefinitions` 里 `unique: true` 的属性，多件同时装备**取最大值**而非相加；
2. `...ByLv` / `...ByLevel` 键会自动乘当前熟练度等级，累加到对应基础属性；
3. 独有效果含"光辉"的 `dmgAmp`，只有勾选界面开关时才计入。

新增自定义装备：追加一条，`name` 不与官方重名、不写 `code` 即可。

---

## characters.json —— 实验体

`characters` 是基础属性与每级成长（`base.*` / `growth.*`），`skillGroups` 是技能组索引（技能名、`skillId`、系数文案模板），用于查 `group`/`skillId` 和界面上的"官方数据"面板。**技能伤害不在这里。**

---

## 其它文件

| 文件 | 作用 | 日常是否手改 |
| --- | --- | --- |
| `masteryStats.json` | 每级武器熟练度成长（`SkillAmpRatio` / `AttackPower` / `IncreaseBasicAttackDamageRatio` / `AttackSpeedRatio`） | 跟官方公告改 |
| `itemUniqueEffects.json` | 装备独有效果名映射（按 code / name） | 可改 |
| `itemEffectDamage.json` | **装备独有效果的伤害公式**（诅咒 / 腐化 / 破裂…）。装上带该效果的装备后，「特效与附加」里会按当前面板属性实时算出来 | 跟官方公告改 |
| `itemEffectModifiers.json` | **装备独有效果的修正项**（炽燃增伤、粉碎减防、雷鸣裁决穿透…）。装上就自动进伤害计算 | 跟官方公告改 |

### 装备独有效果怎么写

两张表分工：**打出独立一段伤害的**进 `itemEffectDamage.json`，**只改属性或增伤的**进 `itemEffectModifiers.json`。
同一个效果两边都有很正常（比如次元裂痕既每秒掉血、又让目标承受伤害 +6%）。

```jsonc
// itemEffectDamage.json
{
  "name": "腐化",                 // 必须和 itemUniqueEffects.json 的效果名一致
  "label": "腐化 每跳",
  "damageType": "skill",          // skill 走最终伤害倍率｜true 真伤不吃减伤｜shield 护盾，不计入伤害小计
  "formula": "targetHp * (0.004 + ap * 0.000014)",
  "hits": 3,                      // > 1 时同时给出单次和合计
  "coefficientText": "每秒 目标体力上限的 0.4(+技能增幅的0.14%)%",
  "note": "造成技能伤害时附着，每秒 1 跳共 3 秒。"
}

// itemEffectModifiers.json
{
  "name": "炽燃 - 增幅",
  "toggle": { "label": "炽燃满层（6 层）" },   // 叠层/条件触发类，装上该装备后界面才出现这个开关
  "modifiers": { "damageBonus": 0.15 },       // 可用键见文件里的 modifierKeys
  "note": "每层技能伤害 +2.5%，上限 6 层。"
}
```

**`toggle` 是通用的**：两张表里任何效果写了它，装上对应装备后主界面和拉表对比方案里都会自动多出一个勾选框，
不勾就不计入。不需要再去 App.jsx 加状态——原来那套 `blazingFull` / `magicSeedFull` 硬编码布尔已经撤掉了
（它把三种不同的炽燃混成一个开关，还把「炽燃-增幅」的增伤错记成了 +24 法强）。

`condition: { "targetHpBelow": 0.4 }` 这类条件不用开关，直接读界面的「目标当前体力 %」。
| `dakLoadoutAssets.json` | 潜能组 / 潜能 / 战术技能及图标 | 跟官方公告改 |
| `dakItemSkillIcons.json` | 装备图标与 tooltip | 脚本生成 |
| `localConfig.json` | 页面配置表默认值：`talents`（天赋）/ `combos`（连段）。`equipment`/`skills` 保持空数组＝无用户覆盖 | 天赋常改 |
| `heroStatus.json` | **实验体核对状态**：`damageTestOnly: false` 的默认出现在实验体列表里，`true` 的只在「显示技能伤害统计测试英雄」开关下可见 | 核对完一个改一个 |
| `patchLog.json` | **官方补丁日志（目标态）**：每条记录「该补丁之后应该是什么值」，配合 `scripts/apply-patch-log.mjs` 使用，幂等可重跑 | 出新版本时追加 |
| `dataMigrations.json` | `skillTitles` 把 localStorage 里的过期译名换成当前值 | 官方改译名时追加 |
| `helpNotes.json` / `announcement.json` | 帮助气泡 / 公告文案 | 可改 |

### heroStatus.json —— 实验体核对状态

核对完一个实验体的技能伤害后，把它的 `damageTestOnly` 改成 `false`，它就会像俞岷、奇娅拉那样
默认出现在实验体列表里，不用再开「显示技能伤害统计测试英雄」。没在 `heroes` 里列出的按
`defaultDamageTestOnly`（当前是 `true`）处理。

```jsonc
"heroes": {
  "万尼亚": {
    "damageTestOnly": false,
    "verifiedBy": "客户端截图（12.0b）",   // 仅供人看，不参与计算
    "note": "9 段伤害 + 2 段护盾全部按客户端读数录入。"
  },
  "希瑟拉": {
    "damageTestOnly": false,
    // caveat 会显示在技能栏顶部，用来说明该英雄有模型表达不了的东西
    "caveat": "技能增幅按满血计算。P 苦痛的记忆会随已失体力额外提供最多 28/39/50 技能增幅…"
  }
}
```

> 这个状态**不能**写进 `characters.json` —— 那个文件由 `consolidate-hero-skills.mjs` 全量重生成，
> 加上去的字段下次跑脚本就没了。

### patchLog.json 的字段约定

```jsonc
{
  "version": "12.0-part2",       // 版本名，也是 --from 的参数
  "order": 20260806,             // 排序键，一律写 YYYYMMDD（见下）
  "date": "2026-08-06",
  "url": "https://playeternalreturn.com/posts/news/3743?hl=zh-CN",
  "title": "12.0 更新日志 Part.2 - 实验体和物品",
  "skills": [
    {
      "id": "external-isaac-r-1059500-damage-stat1",   // heroSkills.json 的条目 id
      "bases": "120,180,240",
      "formula": "base + attack * 1",
      "coefficientText": "120/180/240 (+攻击力的100%)",
      "note": "取值依据，写清楚为什么认为是这一段伤害",
      "overrideManual": true     // 可选，见下
    }
  ],
  "equipment": [], "characters": [], "mastery": []
}
```

**`order` 必须是 `YYYYMMDD`。** 曾经版本号系补丁写成 `8.2 → 80200`、日期系写成
`2025-08-20 → 20250.82`，两套数值不在一个量纲上，导致 2025-07-24 的 8.2 反而排在
2025-08-20 之后，「新公告压旧公告」判错。现在统一按公告日期排序。

**`overrideManual`** 用于「这条 `manual: true` 本来就是脚本推导出的待复核值，
而后来的官方公告给了确定数值」的情况，允许公告压过去并把 `manual` 清成 `false`。
真正人工校对过的技能（俞岷 / 奇娅拉）走 `special-skill-rule` 来源，不受此影响。

### localStorage 的优先级

计算器把配置存在浏览器 `er-damage-config-v1`。合并规则：

1. **在配置表里改过的条目**会被打上 `"manual": true`，之后随包数据不再覆盖它；
2. **没改过的生成条目**（有 `source`、没 `manual`）始终跟随随包数据——
   官方公告更新后不需要清缓存就能看到新值；
3. 两边都是人工数据时，比权威值，再比 `updatedAt`。

第 2 条是必须的：同一个补丁版本内修正公式时，权威值和 `updatedAt` 都不变，
按旧规则旧缓存会永远赢，用户只能靠清 localStorage 才看得到修正。

英雄改名和 `dataMigrations.json` 里登记的译名会自动迁移。

**从 `heroSkills.json` 删条目不需要额外登记。** 合并逻辑按 `source` 字段区分来路：
随包数据每条都带 `source`，配置表里「新增技能」建的条目没有。带 `source` 却已不在
随包数据里的，判定为「已删除的生成条目」直接从缓存丢弃；不带 `source` 的一律保留。

这条规则是补上一个真实的坑：早先清理掉的 62 条解包垃圾行（`A1ApDamage`、基础值
`0.3,0.3,0.3`、公式只有 `base`）一直留在老用户缓存里，慧珍和李黛琳页面上全是算 0 的条目。

### 多段结算技能怎么建

一段伤害一条，不要塞进同一条公式里。标题按 `<槽位> <技能名>[ 形态] <段标签>` 写，
段标签用 `第N段` / `最小伤害` / `最大伤害` / `每叠层伤害`：

```
R 沉睡之力 第1段        R 记忆力 记忆-青鸟
Q 绝命狙击 最小伤害      Q 绝命狙击 最大伤害
P K.O. 每叠层伤害        （公式写成 (base + ap * 0.025) * stacks）
```

同一槽位下、技能名相同的条目达到 **3 段**时，界面会自动切成压扁的多段视图：
逐段列出数值，并给一个「命中段数」步进器显示前 N 段的合计（阿尔达 R、秀雅 R 这类
强化并重放其它技能的大招就是这么显示的）。不足 3 段仍按普通卡片逐条渲染。

---

## sources/ —— 原始导入源

App 不读这些文件，它们是 `scripts/consolidate-hero-skills.mjs` 的输入，同时保留完整原始信息用于溯源。

| 文件 | 产出脚本 |
| --- | --- |
| `erSkillDamageTable.json` | `export-er-skill-damage-table.mjs` |
| `erGameData.json` | `update-er-gamedata.mjs` |
| `skillDamageAugments.json` | 外部技能伤害管线 |
| `externalSkillDamageFallback.json` | `build-external-skill-damage-fallback.mjs` |
| `inGameSkillCapture.json` | `ingame-capture.mjs` |
| `erSkillTables.json` | `export-er-skill-tables.mjs`（仅查来源） |

重新抓取数据后跑一次整合，把新数据并进顶层三张表：

```bash
node scripts/consolidate-hero-skills.mjs
```

整合是**幂等**的：`heroSkills.json` 里权威值 ≥ 90 的条目（`manual` 与 `special-skill-rule`）会被原样保留，重跑不会覆盖手改。取舍记录写在 `docs/data-consolidation/conflicts.json`。

### 叠层步长 `stackStep`

叠层选择器有两种形态，按取值多少自动挑：

| 条件 | 形态 |
| --- | --- |
| `stackStep > 1` 或 `maxStacks > 12` | **滑块 + 数字输入框**，可以敲任意值 |
| 其余 | 一排按钮 |

上限大的资源条写上步长就会切到滑块，否则一格一个按钮会铺满整行：

```jsonc
"maxStacks": 100, "stackLabel": "消耗酒醉值", "stackStep": 10
```

`stackLabel` 会显示在选择器上方（旁边带帮助气泡 `field.stackSelector`），别省略 ——
不写的话界面只有一串没头没尾的数字。步长大于 1 时默认给满值（对应「消耗全部资源」这类用法）。
换英雄后如果原来的值超出新范围，滑块会夹进 0~上限，按钮模式会归到最近的那个按钮。

### 英雄专属条件修正（`specialSkillRules.json` 的 `modifiers`）

像「卡洛琳 W 的镜子技能增幅」「秀雅 Q 冲撞点承受伤害 +30%」这种**条件触发、影响全局乘区**的效果，
写在 `specialSkillRules.json` 里，技能面板表头会自动出现一个下拉：

```jsonc
"秀雅": {
  "modifiers": [{
    "id": "odysseyCenter",
    "label": "Q 冲撞点",
    "note": "鼠标悬停时显示的说明",
    "default": 0,
    "options": [
      { "value": 0, "label": "不在冲撞点" },
      { "value": 1, "label": "在冲撞点 (+30%)", "damageBonus": 0.3 }
    ]
  }]
}
```

选项可以带两个字段，分别落进两个不同的桶：

| 字段 | 进哪个桶 | 等价于 |
| --- | --- | --- |
| `apPct` | 技能增幅百分比 | 和武器熟练度、独有增幅同一档 |
| `damageBonus` | 伤害提升百分比 | 和装备、潜能、手动增伤同一乘区 |

**「敌人承受伤害增加」按官方口径就落在 `damageBonus` 这一档**，也就是
`(1 + 伤害提升 − 目标通用减伤 − 手动技能减免 − 目标熟练度技能减伤)` 里的第一项。

选项列表是纯数据，所以像卡洛琳那样「层数 × 技能等级」两个维度也能直接摊平成 7 个选项 ——
卡洛琳的 W 没有伤害段、读不到技能等级，这样处理最省事。

### 计算口径说明去哪了

以前技能面板顶上会印一大段 `heroStatus.json` 的 `caveat`，占屏且没人看。现在改成独立文档：

```bash
node scripts/export-hero-caveats.mjs
```

生成 `docs/hero-caveats.md`。`caveat` 字段本身保留，只是不再渲染到页面上。
