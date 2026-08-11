# 永恒轮回伤害计算器（er_damage）

React + Vite 单页应用，用于模拟《永恒轮回 / Eternal Return》的配装与技能伤害。前身是 Excel 工作簿 `伤害计算器改版.xlsx`。

代码分三层：`src/lib/` 是纯计算与数据装配，`src/App.jsx` 是 React 组件与 UI，`src/data/*.json` 是全部数据。

本文档面向开发者，重点讲**怎么通过 JSON 改数据（装备、英雄技能、天赋、连段）**，以及改动会被哪一层覆盖。

---

## 1. 快速开始

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

- 开发地址：`http://localhost:5173`
- `npm run build` 是主要验证命令，提交前请先跑通。
- 只有在 `localhost` / `127.0.0.1` / `::1` 打开时，页面才开放"编辑模式"和写盘接口（`/api/config`、`/api/help-notes`、`/api/announcement`），这些接口由 `vite.config.mjs` 里的自定义插件提供，会直接把 JSON 写回 `src/data/`。线上构建版本只读。

---

## 2. 目录结构

| 路径 | 说明 |
| --- | --- |
| `src/App.jsx` | React 组件：状态、装备/潜能计算与全部 UI |
| `src/lib/formula.js` | 纯计算层：数值处理、公式求值、单条技能伤害、渐进伤害 |
| `src/lib/skillSources.js` | 技能数据层：读取 `heroSkills.json`、按权威值去重、合并浏览器保存的配置 |
| `src/lib/specialRules.js` | 展示与结算行为层：读取 `specialSkillRules.json`（多段命中 / 叠层 / 连段） |
| `src/lib/characterStats.js` | 实验体成长属性层：解包值为底，客户端读数冲突时覆盖 |
| `src/main.jsx` | React 入口 |
| `src/data/*.json` | **所有可改数据**（顶层＝编辑入口），见第 4 节；字段说明见 `src/data/README.md` |
| `src/data/sources/*.json` | 原始导入源，脚本产出，App 不读，只作整合输入与溯源 |
| `styles/globals.css` | 全部样式 |
| `scripts/*.mjs` | 数据抓取 / 导出 / 审计脚本 |
| `docs/` | 生成的数据快照、覆盖率与来源审计报告 |
| `assets/` | 角色头像、装备/潜能/战术技能图标 |
| `.er-gamedata-cache/` | `pypy-vrc/er-gamedata` 仓库的本地克隆缓存（已 gitignore） |
| `vite.config.mjs` | 构建配置 + 本地写盘 API |
| `伤害计算器改版.xlsx` | 原始 Excel 参考 |

---

## 3. 数据加载与合并顺序（改数据前必读）

### 3.1 配置整体加载优先级

`loadConfig()`（`src/App.jsx:622`）：

1. **如果存在 `src/data/localConfig.export.json`** → 只用它，**完全忽略 localStorage 和 `localConfig.json`**。
   这是"发布锁定"用的导出文件。本地调试时如果发现改了 `localConfig.json` 页面没反应，先确认这个文件是否存在。
2. 否则读 localStorage `er-damage-config-v1`（页面里改过配置表就会有）。
3. localStorage 为空时，回落到 `src/data/localConfig.json`。
4. 结果再经过 `normalizeConfigPayload()` → `mergeEquipment` / `mergeSkills` / `mergeCombos` 与内置数据合并。

> 调试建议：改 JSON 后如果页面还是旧值，清一次 localStorage（`er-damage-config-v1`、`er-damage-workspace-state-v1`）再刷新。

### 3.2 装备合并规则（重要，方向和技能相反）

`mergeEquipment()`（`src/App.jsx:434`）：

```js
saved ? { ...saved, ...item, effect: saved.effect || item.effect } : item
```

- `item` 是 `equipment.json` 里的官方装备，**官方字段覆盖用户保存的字段**。
- 只有 `effect` 例外：用户填了就用用户的。
- 官方表里没有的（`code` 和 `name` 都不冲突）自定义装备会追加到列表末尾。

**结论：**
- 想修正一件**官方已有装备**的数值 → 改 `src/data/equipment.json`。
- 想加**自定义装备** → 也在 `equipment.json` 里追加一条，`name` 不要和官方重名、不要写 `code`。

### 3.3 技能数据：只有一张表

技能统一放在 **`src/data/heroSkills.json`**，一段伤害只有一条。
各来源之间的取舍已经由 `scripts/consolidate-hero-skills.mjs` 在**离线**做完，运行时不再跨文件比较优先级。

#### 为什么这么设计

er-gamedata 是玩家自发维护的解包内容，不保证准确（旧表把杰琪、翡翠这类物理英雄的系数错记成技能增幅 `ap`，
正确的是攻击力 `attack`）。它只用来把技能骨架跑一遍初始化，**之后的数值和效果一律以官方公告为准**。

以前同一段伤害会在 5 个文件里各留一份，改错文件就白改（例如「雪 P 武装式」曾经有两条，
改旧解包表那条完全不生效）。现在整合成一张表，这个坑从结构上消失了。

#### 权威值

一段伤害的身份是 `hero + group + skillId + dataKey`。同身份的多个来源按权威值择优：

| 权威值 | `source` | 含义 |
| ---: | --- | --- |
| 100 | `special-skill-rule` | 人工特殊计算规则（俞岷、奇娅拉） |
| 90 | `manual` | **人工录入 / 手改**（条目上 `"manual": true`） |
| 80 | `official-patch-note`、`external-official-patch` | 官方更新公告 |
| 60 | `in-game-client` | 客户端界面读数 |
| 40 | `external-wiki-current` 等 | 官方 Wiki |
| 20 | `er-skill-damage-table` | er-gamedata 结构化解包 |
| 10 | `er-gamedata` | er-gamedata 旧版解包 |

同权威值再比 `updatedAt` 取新。**一段伤害同时有人工录入、官方公告、Wiki、客户端四份数据时，保留人工录入那条**，
其余三条写进该条目的 `alternatives` 字段留档（只供核对，不参与计算）。

当前分布：Wiki 241 条、官方公告 128 条、解包 186 条、人工 20 条、客户端 6 条，共 581 条 / 86 名英雄。

#### 与浏览器缓存的关系

`mergeSkills()`（`src/lib/skillSources.js`）：内置条目权威值更高时（手改、或官方公告更新了数值），
内置数据压过 `localStorage` 里的旧缓存；否则保留用户在页面上的改动。
英雄改名和 `dataMigrations.json` 里登记的译名会自动迁移，**数值不会**——想看到新数值需要清一次 `er-damage-config-v1`。

---

## 4. 数据文件速查

> 逐个文件的字段说明见 [src/data/README.md](src/data/README.md)。

| 文件 | 内容 | 日常是否手改 |
| --- | --- | --- |
| `src/data/heroSkills.json` | **技能唯一入口**：全部技能，一段伤害一条 | ✅ 改技能只改这里 |
| `src/data/equipment.json` | **装备**：661 件 + 60 个属性定义 | ✅ 改装备只改这里 |
| `src/data/characters.json` | 实验体基础/成长属性 + 技能组索引 | ✅ 跟官方公告改 |
| `src/data/specialSkillRules.json` | 展示与结算行为（多段/次要目标/叠层/连段），**不含公式** | ✅ 手写 |
| `src/data/masteryStats.json` | 每级武器熟练度成长 | ✅ 跟官方公告改 |
| `src/data/itemUniqueEffects.json` | 装备独有效果名映射（按 code / name） | ✅ |
| `src/data/localConfig.json` | 页面配置表默认值：`talents` / `combos` | ✅ 天赋常改 |
| `src/data/patchLog.json` | **官方补丁日志**（目标态），配合 `apply-patch-log.mjs` 跟版本更新 | ✅ 出新版本时追加 |
| `src/data/dataMigrations.json` | 旧缓存译名迁移表 | 官方改译名时追加 |
| `src/data/dakLoadoutAssets.json` | 潜能 / 战术技能及图标 | ⚠️ |
| `src/data/dakItemSkillIcons.json` | 装备图标与 tooltip | ⚠️ 脚本生成 |
| `src/data/helpNotes.json` / `announcement.json` | 帮助气泡 / 公告文案 | ✅ |
| `src/data/localConfig.export.json` | 存在即锁定全部配置（见 3.1） | 按需 |
| `src/data/sources/*.json` | 原始导入源，App 不读，只作整合输入与溯源 | ❌ 跑脚本重建 |

所有 JSON 都是**标准 JSON，不能写 `//` 注释**。项目约定用 `_comment` / `_usage` 字段当注释头，代码会忽略它们。

---

## 5. 怎么改 / 加装备

### 5.1 装备条目结构

`equipment.json` 里的官方条目（完整形态）：

```json
{
  "code": 130501,
  "source": "er-gamedata",
  "type": "武器",
  "itemType": "Weapon",
  "weaponType": "圣器 / Arcana",
  "weaponTypeRaw": "Arcana",
  "armorType": "",
  "name": "女帝",
  "quality": "传说",
  "itemGrade": "Legend",
  "isCompletedItem": true,
  "showInItemBook": true,
  "effect": "",
  "stats": { "attackPower": 40, "skillAmp": 93, "cooldownReduction": 15 },
  "ap": 93, "attackPower": 40, "cd": 15,
  "pen": 0, "penPct": 0, "apPct": 0,
  "defense": 0, "maxHp": 0, "sightRange": 0, "dmgAmp": 0
}
```

手写一条自定义装备，最少这些字段就够：

```json
{
  "type": "手部",
  "name": "测试手套",
  "quality": "传说",
  "isCompletedItem": true,
  "stats": { "skillAmp": 90, "cooldownReduction": 20, "penetrationDefenseRatio": 0.15 }
}
```

### 5.2 两套属性写法

`aggregateEquipmentStats()`（`src/App.jsx:589`）读取时：**优先 `stats` 里的官方键，为 0 时回退到扁平别名**。

| 官方 `stats` 键 | 扁平别名 | 含义 |
| --- | --- | --- |
| `attackPower` | `attackPower` | 攻击力 |
| `skillAmp` | `ap` | 技能增幅（法强） |
| `skillAmpRatio` | `apPct` | 技能增幅百分比（小数） |
| `cooldownReduction` | `cd` | 冷却缩减 |
| `defense` | `defense` | 防御力 |
| `maxHp` | `maxHp` | 体力上限 |
| `sightRange` | `sightRange` | 视野 |
| `penetrationDefense` | `pen` | 固定防御穿透 |
| `penetrationDefenseRatio` | `penPct` | 百分比防御穿透（小数） |
| —（无别名） | `dmgAmp` | 伤害增幅（小数） |

其他 `stats` 键（暴击、攻速、适性攻击力等）以 `equipment.json` 的 `itemStatDefinitions` 为准，共 60 项，`key` 就是可以写进 `stats` 的名字。

三条特殊规则：

1. **独有属性取最大值**：`itemStatDefinitions` 里 `unique: true` 的属性（如 `uniqueSkillAmpRatio`、`uniquePenetrationDefense`）多件同时装备时**取最大**而不是相加。手写装备想复现这个行为，可以用扁平写法 `"apPct": 0.25, "uniqueApPct": true`。
2. **按等级成长属性**：`attackPowerByLv`、`skillAmpByLevel`、`maxHpByLv` 等 `...ByLv` / `...ByLevel` 键会自动乘以当前熟练度等级，累加到对应基础属性上（映射表见 `src/App.jsx:293`）。
3. **条件伤害增幅**：`dmgAmp` 且独有效果里含"光辉"的装备，只有在界面勾选对应开关时才计入。

### 5.3 装备特效（effect）

判定顺序（`uniqueEffectsForItem`，`src/App.jsx:521`）：

1. `itemUniqueEffects.json` 的 `effectsByCode[code]`
2. `itemUniqueEffects.json` 的 `effectsByName[name]`
3. 回落到装备自身的 `effect` 字段，按英文逗号 `,` 分隔

大部分特效只用于展示。**真正参与计算的效果名**（`src/App.jsx:213`）：

- `"光辉"` → 条件伤害增幅，界面开关控制是否计入 `dmgAmp`
- `"炽燃"` / `"炽燃 - 增幅"` → 满层时 +24 技能增幅
- `"魔力种子"` → 满层时 +20 技能增幅、+20 冷却缩减

新增一个需要参与计算的特效，光改 JSON 不够，要同步改 `src/App.jsx` 的 `calc()`。

### 5.4 品质与筛选

`quality` 取值：`普通` / `高级` / `稀有` / `英雄` / `传说` / `神话`（`QUALITY_OPTIONS`，`src/App.jsx:105`）。

- 配装下拉默认只显示 **英雄及以上**，除非在界面里勾"显示低阶装备"。
- 武器还会按 `weaponTypeRaw` 做熟练度和武器类型过滤，写自定义武器时建议填 `weaponTypeRaw`（如 `"Arcana"`、`"Rapier"`）并把 `weaponType` 写成 `"圣器 / Arcana"` 这种"中文 / 英文"格式。
- 想让装备默认出现在初始配装里，`isCompletedItem` 要为 `true`。

---

## 6. 怎么改 / 加英雄技能

### 6.1 技能条目结构

全部技能写在 **`src/data/heroSkills.json`** 的 `skills` 数组里，**改技能只改这一个文件**：

```json
{
  "id": "nun-q",
  "hero": "奇娅拉",
  "title": "Q 一段",
  "bases": "180,180,180,180,180",
  "formula": "base + ap * 0.65",
  "maxLevel": 5,
  "group": 1014200,
  "skillId": "ChiaraActive1",
  "dataKey": "Damage",
  "updatedAt": "2026-08-06",
  "source": "manual",
  "sourceNote": "手工校对",
  "sourceUrl": "https://..."
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | ✅ | 全局唯一。连段 `hits` 引用它，改名要同步改连段 |
| `hero` | ✅ | 英雄中文名，必须和 `characters.json` 的 `characters[].name` 一致，否则技能不会出现在任何英雄下 |
| `title` | ✅ | 显示名，建议 `Q 一段` / `R 二段`；开头的 `P/Q/W/E/R` 用来归入技能槽位列 |
| `bases` | ✅ | 各级基础伤害，英文逗号分隔；也可写成数组 |
| `formula` | ✅ | 伤害公式，见 6.2 |
| `maxLevel` | ✅ | 应等于 `bases` 的个数 |
| `group` / `skillId` / `dataKey` | ⬜ | 来源追踪 + 去重键的一部分，建议保留 |
| `updatedAt` | ⬜ | 去重时比新旧用；想覆盖自动条目就必须写且要更大 |
| `description` / `coefficientText` / `source*` | ⬜ | 悬浮说明与来源标注 |
| `progressiveDamage` | ⬜ | 渐进伤害规则，见 6.3 |

### 6.2 公式与可用变量

`evaluateFormula()`（`src/lib/formula.js:71`）用白名单正则校验后执行，可用变量：

| 变量 | 含义 |
| --- | --- |
| `base` | 当前等级的基础伤害（来自 `bases`） |
| `ap` | 最终技能增幅（法强） |
| `attack` | 最终攻击力 |
| `extraAttack` | 额外攻击力（装备 + 天赋 + 叠层，不含角色基础） |
| `targetHp` | 目标体力上限 |
| `stacks` | 界面叠层输入 |
| `level` | 当前技能等级，从 1 开始 |
| `heroLevel` | **实验体等级**（界面「熟练度等级」，1~20） |

写法示例：

```json
"formula": "base + ap * 0.65"
"formula": "base + attack * 1.1"
"formula": "base + targetHp * 0.08"
"formula": "(base + ap * 0.25) * (1 + stacks * 0.2)"
"formula": "base + ap * [0.45,0.5,0.55,0.6,0.65][level - 1]"
"formula": "base + heroLevel * 8 + ap * 0.6"
```

**限制**：只允许数字、英文变量名、`+ - * / ( ) , [ ] _`。不能写中文、百分号、函数名。`65% 技能增幅` 要写成 `ap * 0.65`。表达式非法或抛错时，伤害按 `0` 处理（不会报错，只会显示 0，排查时注意）。

另外，公式里用 `attack` 还是 `ap`，会参与 `primaryOffensePath()`（`src/App.jsx:917`）判断该英雄走"攻击力路线"还是"技能增幅路线"——这个路线决定吸血鬼、凝力、急速射击等潜能给的是攻击力还是法强。熟练度成长属性优先级更高。

### 6.3 渐进伤害（progressiveDamage）

用于"随蓄力/弹跳次数递增"的技能，如爱琳的跳跳球：

```json
"progressiveDamage": {
  "id": "bounces",
  "label": "弹跳次数",
  "unit": "跳",
  "min": 1,
  "max": 4,
  "default": 1,
  "selectedLabel": "命中前弹跳次数",
  "base": { "fromMultiplier": 1, "toMultiplier": 1.75, "round": "floor" },
  "coefficient": { "variable": "ap", "from": 0.55, "to": 0.9625 },
  "note": "球命中敌人时停止弹跳；按命中前已发生的弹跳次数计算单次伤害，不做多段相加。"
}
```

计算方式（`progressiveDamageValue`，`src/lib/formula.js:193`）：把当前档位在 `[min, max]` 内归一化成 `progress`，然后对**基础值倍率**和**系数**分别做线性插值：

```text
base  = 技能base * lerp(base.fromMultiplier, base.toMultiplier, progress)
coef  = lerp(coefficient.from, coefficient.to, progress)
raw   = floor(base + context[coefficient.variable] * coef)
```

有 `progressiveDamage` 的技能，界面会自动出现一个档位选择器，`formula` 不再参与该技能的伤害计算。

### 6.4 手改一条技能（`manual` 标记）

想让手改值压过任何生成数据，给这条加 `"manual": true`：

```jsonc
{
  "id": "011-yuki-p-1011100-damage",
  "hero": "雪",
  "title": "P 武装式 伤害",
  "group": 1011100, "skillId": "None", "dataKey": "Damage",
  "bases": "25,35,45",
  "maxLevel": 3,
  "formula": "40 + attack * base * 0.01",

  "manual": true,                         // ← 权威值升到 90
  "sourceUrl": "https://playeternalreturn.com/posts/news/3629?hl=zh-CN",
  "sourceNote": "官方公告 11.4 数值"
}
```

加上之后：

1. **权威值 90**，压过官方公告(80)、客户端(60)、Wiki(40)、解包(20/10)；
2. **重跑整合脚本不会覆盖它** —— `consolidate-hero-skills.mjs` 会把权威值 ≥ 90 的条目原样保留；
3. **可以写任意合法公式**（解包表只能表达 `base + 系数 * 变量`，手改不受此限）。

条目里的 `alternatives` 是被淘汰来源的留档，**不参与计算**，可以直接用来对照其它来源怎么写的：

```jsonc
"alternatives": [
  { "source": "er-skill-damage-table", "authority": 20, "bases": "15,30,45", "formula": "base" },
  { "source": "er-gamedata",           "authority": 10, "bases": "15,30,45", "formula": "base + ap * 0" }
]
```

> 新增一条技能：用一个新的 `dataKey` 即可（身份不同就不会被合并）。
> `group` / `skillId` 可从 `characters.json` 的 `skillGroups` 里查。

### 6.5 展示与结算行为（specialSkillRules.json）

**公式不在这里** —— 这个文件只管"算出来之后怎么显示、怎么叠加"：多段命中、次要目标衰减、
目标数上限、叠层选择器、连段，以及哪些英雄由人工完全接管。

```jsonc
"heroes": {
  "俞岷": {
    "manual": true,                      // 该英雄不接受任何生成数据
    "display": {
      "yumin-q": {
        "label": "普通Q（三段）",
        "hits": 3,                       // 命中段数：单发先取整再乘段数
        "secondaryScale": 0.5,           // 次要目标倍率，写了才显示主/次拆分
        "showBreakdown": true,
        "totalLabelSuffix": "（只算全中）",
        "maxTargets": 3                  // 目标数上限，默认 10
      }
    },
    "combos": [ { "id": "yumin-q3", "title": "Q 三跳全中", "hits": { "yumin-q": 3 } } ]
  },
  "奇娅拉": {
    "stackSelector": {                   // 值会传给公式里的 stacks 变量
      "label": "R2层数", "values": [0, 1, 2, 3, 4], "default": 1, "max": 4
    }
  }
}
```

顶层 `defaultHero` 是页面初始英雄。

**俞岷、奇娅拉的公式已经人工校对完成**，在 `heroSkills.json` 里以 `source: "special-skill-rule"`（权威值 100）存放，
整合脚本重跑也会原样保留。要调整就改 `heroSkills.json` 里那 16 条，不要在别处改。

> **改数值 → `heroSkills.json`；改显示/叠加方式 → `specialSkillRules.json`。**

### 6.6 连段（combos）

写在 `localConfig.json` 的 `combos`：

```json
{
  "id": "yumin-eqqw",
  "hero": "俞岷",
  "title": "EQQW 全中",
  "note": "Q3 + EQ4 + E + W",
  "hits": { "yumin-q": 3, "yumin-eq": 4, "yumin-e": 1, "yumin-w": 1 }
}
```

- `hits` 的键必须是技能 `id`，值是命中次数（≤ 0 会被过滤）。
- 多段技能若每段伤害不同，拆成多条 skill 再分别计次。
- 只显示 `hero` 与当前所选英雄一致的连段。

### 6.7 新增一个英雄的完整流程

1. 确认 `characters.json` 的 `characters` 里有这个英雄（没有就先跑 `npm run update:gamedata` 再跑整合）。
2. 在 `localConfig.json` 的 `skills` 里按 6.1 逐条补技能，`hero` 用中文名。
3. 需要连段就在 `combos` 里加。
4. `npm run dev`，在英雄选择器里切到该英雄核对数值（界面右下"计算过程"面板会展开中间量）。
5. 有需要就补 `helpNotes.json` 文案。
6. `npm run build` 验证。

界面默认只列出人工接管的英雄；开启编辑模式后点版本号打开调试区，勾选「显示技能伤害统计测试英雄」（`showDamageTestHeroes`）即可列出**全部 89 名实验体**。其中雪琳、米尔卡、卡洛琳暂无伤害数据，技能面板会显示「暂无技能数据」，但实验体本体（基础属性、成长、熟练度、技能组）都在，可对照「官方数据」面板补录。

---

## 7. 天赋、潜能、熟练度

- **天赋 `talents`**（`localConfig.json`）：`{ id, slot: "主天赋"|"副天赋", name, ap, pen, penPct, dmgAmp, note }`，纯加算，直接参与 `calc()`。新增固定增幅优先加一条天赋。
- **潜能 traits**：列表与图标来自 `dakLoadoutAssets.json`（`traitGroups` / `traits` / `tacticalSkills`，仅 `active` 且 `type` 为 `Core`/`Sub1`/`Sub2` 的会显示）。但**具体数值效果写在 `src/App.jsx` 的 `TRAIT_EFFECTS`（第 155 行起），按潜能 id 映射**：
  - 直接数值：`ap` / `cd` / `pen` / `penPct` / `dmgAmp` / `defense` / `maxHp`
  - `extraEffect`：交给 `calc()` 里的具名分支处理（霹雳、涡流、鬼火、伤痕、爆炸仙人掌…）
  - `summary`：界面说明文案
  - 新增潜能效果需要同时改 JSON（新增潜能条目）和 `App.jsx`（数值/分支）。
- **战术技能**：选项在 `TACTICAL_SKILL_OPTIONS`（`src/App.jsx:106`），伤害在 `calculateTacticalSkillEffect()`（`src/App.jsx:975`），都写在代码里。
- **熟练度成长 `masteryStats.json`**：`{ characterCode, type: 武器类型Raw, options: [{ stat, value }] }`，`value` 是**每级**增量。关键 `stat`：`SkillAmpRatio`（技能增幅%）、`AttackPower`（攻击力）、`IncreaseBasicAttackDamageRatio`（普攻伤害增幅%）、`AttackSpeedRatio`。文件首条是说明对象，代码会跳过。

---

## 8. 核心公式（校对时对照）

```text
最终法强   ap        = floor((装备法强 + 天赋法强 + 潜能法强 + 叠层法强) * (1 + 普通法强% + 独有法强%(取最大) + 熟练法强%))
最终防御   finalDef  = 目标防御 * (1 - 防御降低%) * (1 - 穿透%) - 固定穿透
防御修正   defenseMod= 100 / (100 + finalDef)
伤害修正   damageMod = 1 + 自身增伤 + 装备增伤 + 潜能增伤 - 目标减伤 - 技能减伤(含目标熟练度)
最终修正   finalMod  = defenseMod * damageMod
技能伤害             = floor(floor(公式原始值) * finalMod)
普攻伤害             = floor(攻击力 * defenseMod * damageMod)，暴击倍率 = 1.75 + 暴击伤害
```

目标熟练度带来的减伤：技能 `等级 * 0.8%`、普攻 `等级 * 1%`（1 级时为 0）。
所有最终数字统一向下取整（`damageFloor`，带 `1e-9` 容差）。

---

## 9. 数据再生成脚本

需要联网；`update:gamedata` 会克隆/更新 `.er-gamedata-cache`（`pypy-vrc/er-gamedata`）。

```bash
npm run update:gamedata
```

| 脚本 | 作用 | 产物 |
| --- | --- | --- |
| `scripts/update-er-gamedata.mjs` | 同步 er-gamedata，导出角色/装备/属性定义/熟练度 | `src/data/sources/erGameData.json`、`masteryStats.json` |
| `scripts/consolidate-hero-skills.mjs` | **把 sources/ 整合成 heroSkills / equipment / characters 三张表** | `src/data/*.json`、`docs/data-consolidation/` |
| `scripts/apply-patch-log.mjs` | **按官方补丁日志把数据推到目标态（幂等，可随时重跑）** | `heroSkills` / `equipment` / `characters` / `masteryStats` |
| `scripts/ocr-skill-capture.mjs` | **客户端截图 → OCR → 结构化技能读数**，产出 `ingame-capture.mjs` 能吃的条目 | 打印到 stdout |
| `scripts/lib/win-ocr.ps1` | Windows 自带 OCR 封装（离线、认中文、零依赖） | JSON（带坐标） |
| `scripts/export-er-skill-tables.mjs` | 归一化技能组/等级/扩展表 | `docs/skill-tables/`、`src/data/erSkillTables.json` |
| `scripts/export-er-skill-damage-table.mjs` | 导出结构化技能伤害表（文案优先取 DAK.GG 中文接口） | `docs/skill-damage/`、`src/data/erSkillDamageTable.json` |
| `scripts/export-missing-skill-damage-heroes.mjs` | 列出缺伤害数据的英雄/技能 | `docs/external-skill-damage/missing-*` |
| `scripts/fetch-external-skill-damage-wiki.mjs` | 抓官方 Wiki 技能伤害 | `docs/external-skill-damage/*wiki-current*` |
| `scripts/fetch-external-skill-damage-official-patches.mjs` | 抓官网补丁说明的数值变更 | `docs/external-skill-damage/*official-patches*` |
| `scripts/build-external-skill-damage-reconciliation.mjs` | Wiki 结构 + 最新补丁数值对账 | `docs/external-skill-damage/*reconciliation*` |
| `scripts/build-external-skill-damage-fallback.mjs` | 生成前端兜底表 | `src/data/externalSkillDamageFallback.json` |
| `scripts/fetch-dak-loadout-assets.mjs` | 抓潜能/战术技能及图标 | `src/data/dakLoadoutAssets.json`、`assets/loadout/` |
| `scripts/fetch-dak-item-skill-icons.mjs` | 抓装备图标与 tooltip | `src/data/dakItemSkillIcons.json` |
| `scripts/audit-*.mjs` | 来源、参数、优先级审计 | `docs/*-audit/` |
| `scripts/apply-official-patch-updates.mjs` | 一次性迁移：把官方补丁 11.3~12.0 Part.1 的数值写入各数据文件 | `docs/official-patch-updates/` |
| `scripts/apply-official-patch-updates-zh.mjs` | 一次性迁移：按中文公告修正译名，并补上 12.0 Part.2 | `docs/official-patch-updates/` |

> **抓取官方公告一律带 `hl=zh-CN`。** 英文版和中文版不是同一份内容：英文版 12.0 只有 Part.1，
> 实验体与物品平衡在中文列表里是单独一篇 Part.2；而且只有中文版才有官方译名。
> 列表页：`https://playeternalreturn.com/posts/news?categoryPath=patchnote&hl=zh-CN`
> 除了主版本号，还要一并检查区间内的「不停机维护」公告，其中可能夹带数值改动。

数据来源与优先级约定（见 `docs/external-skill-damage/README.md`）：

1. er-gamedata 的结构化伤害字段（有就用）
2. 官方补丁说明的数值（最高优先的数值更新源）
3. 官方 Wiki 的公式结构
4. 实践规则：**Wiki 公式结构 + 更新的官方补丁数值 = 最佳外部候选**

当前覆盖情况（`docs/skill-damage/README.md`）：89 名英雄 / 620 个技能组中，只有 52 组有结构化伤害，其余靠补充表与外部兜底。缺数据的英雄可以在 `docs/skill-damage-audit/`、`docs/skill-parameter-source-audit/` 里查原因。

---

## 10. 本地编辑模式与写盘

在 `localhost` 打开时：

- 页面底部"配置表"可直接编辑装备 / 技能 / 连段，改动先进 localStorage。
- **保存**按钮 → `POST /api/config` → 写回 `src/data/localConfig.json`。
- **导出**按钮 → `POST /api/config/export` → 写 `src/data/localConfig.export.json`（写完之后该文件会锁定所有配置，见 3.1；不想锁定就删掉它）。
- 帮助气泡、公告同理，分别写回 `helpNotes.json` / `announcement.json`。

localStorage 键：

| 键 | 内容 |
| --- | --- |
| `er-damage-config-v1` | 装备/技能/天赋/连段配置 |
| `er-damage-workspace-state-v1` | 当前配装、英雄、目标、技能等级、对比方案等 |
| `er-damage-global-settings-v1` | 主题、编辑模式、英雄显示开关 |
| `er-damage-help-notes-v1` / `er-damage-announcement-v1` | 仅本地编辑时使用 |

---

## 11. 常见坑

1. **改了 `localConfig.json` 没生效** → `localConfig.export.json` 存在，或 localStorage 里有旧配置。
2. **改了装备数值没生效** → 官方装备会覆盖用户保存值（3.2），改 `equipment.json`；或浏览器 `localStorage` 里有旧缓存，清一次 `er-damage-config-v1`。
3. **技能改了没生效** → 被 `dedupeSkillsByLatest` 用同键的更新条目挤掉，补一个更大的 `updatedAt`。
3b. **改了技能却没变** → 确认改的是 `heroSkills.json`（不是 `sources/` 里的导入源），并且浏览器 `localStorage` 没有更高优先级的旧缓存。
4. **伤害显示 0** → `formula` 含中文/百分号/函数名，被白名单正则拦下静默返回 0。
5. **新技能不出现在任何英雄下** → `hero` 中文名和 `characters.json` 的角色名对不上。
6. **`bases` 个数和 `maxLevel` 不一致** → 等级选择器和实际取值会错位。
7. **百分比字段** → 一律写小数（`0.15` 表示 15%），不要写 `15`。
8. **`import.meta.glob` 静态资源** → 新增角色/装备图片后需要重启 dev server。

---

## 12. 维护约定

- 改动尽量小、聚焦公式；不要随意引入新依赖（当前只有 react / react-dom + vite）。
- 改公式时对照工作簿或官方来源，并在 `sourceNote` / `sourceUrl` 里留出处。
- 抓官方公告用 `hl=zh-CN`，译名以公告中文版为准；改了已发布条目的译名时，同步在 `src/data/dataMigrations.json` 追加一条迁移。
- **不要擅自改动已人工校对的公式**：俞岷、奇娅拉的 16 条公式在 `heroSkills.json` 里以 `source: "special-skill-rule"` 存放，整合脚本会原样保留，任何生成流程都不许碰它们。
- **er-gamedata 只用于一次性初始化**：技能骨架抓一次即可，之后的数值/效果改动走官方更新公告；发现解包数据不对就直接改 `heroSkills.json` 并加 `"manual": true`。
- **技能只有一张表**：不要再往 `sources/` 里手改数据，那里是脚本产物；重新抓取后跑 `node scripts/consolidate-hero-skills.mjs` 并进 `heroSkills.json`。
- 英雄的专属计算/展示逻辑一律写进 `specialSkillRules.json`，不要再往 `App.jsx` 里加 `selectedHero === 'xxx'` 这类特判。
- 纯计算函数放 `src/lib/formula.js`，数据装配放 `src/lib/skillSources.js`，`App.jsx` 只留 React 与 UI。
- 提交前跑 `npm run build`。
- 远程仓库：`https://github.com/sanzennami/er_damage.git`，部署走 Cloudflare Pages（`wrangler.toml`，输出目录 `dist`）。
