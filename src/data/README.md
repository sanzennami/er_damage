# src/data 数据层说明

所有数据都是标准 JSON（不能写 `//` 注释），项目约定用 `_comment` / `_usage` 字段当注释头，代码会忽略它们。

目录分两层：

- **顶层 = 编辑入口**，也是 App 唯一读取的数据；
- **`sources/` = 原始导入源**，由各抓取/导出脚本产出，App **不读**，只作为整合的输入和溯源留档。

```
src/data/
├─ heroSkills.json          ← 技能唯一入口（581 条，一段伤害一条）
├─ equipment.json           ← 装备（661 件）+ 属性定义
├─ characters.json          ← 实验体基础/成长属性 + 技能组索引
├─ specialSkillRules.json   ← 展示与结算行为（不含公式）
├─ masteryStats.json        ← 每级武器熟练度成长
├─ itemUniqueEffects.json   ← 装备独有效果名映射
├─ dakLoadoutAssets.json    ← 潜能 / 战术技能及图标
├─ dakItemSkillIcons.json   ← 装备图标与 tooltip
├─ localConfig.json         ← 页面配置表默认值（天赋 / 连段）
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

`base`、`ap`（技能增幅）、`attack`（攻击力）、`extraAttack`（额外攻击力）、`targetHp`（目标体力上限）、`stacks`（叠层）、`level`（技能等级，从 1 开始）、`heroLevel`（**实验体等级**，即界面「熟练度等级」1~20）。

```jsonc
"formula": "base + ap * 0.65"
"formula": "base + attack * 0.55 + targetHp * 0.07"
"formula": "base + ap * [0.45,0.5,0.55,0.6,0.65][level - 1]"   // 按等级取系数
"formula": "base + heroLevel * 8 + ap * 0.6"                  // 官方写法 (+实验体等级*8)
"formula": "(base + ap * 0.25) * (1 + stacks * 0.2)"
```

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
| `dakLoadoutAssets.json` | 潜能组 / 潜能 / 战术技能及图标 | 跟官方公告改 |
| `dakItemSkillIcons.json` | 装备图标与 tooltip | 脚本生成 |
| `localConfig.json` | 页面配置表默认值：`talents`（天赋）/ `combos`（连段）。`equipment`/`skills` 保持空数组＝无用户覆盖 | 天赋常改 |
| `dataMigrations.json` | 把 localStorage 里的过期译名换成当前值 | 官方改译名时追加 |
| `helpNotes.json` / `announcement.json` | 帮助气泡 / 公告文案 | 可改 |

### localStorage 的优先级

计算器把配置存在浏览器 `er-damage-config-v1`，**数值上它高于随包数据**。
内置条目权威值更高时（手改、或官方公告更新）会压过旧缓存；否则保留用户在页面上的改动。
英雄改名和 `dataMigrations.json` 里登记的译名会自动迁移，**数值不会**——想看到新数值需要清一次该键。

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
