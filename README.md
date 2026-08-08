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
| `src/lib/skillSources.js` | 技能来源层：按优先级拼装全部技能条目、去重、合并保存的配置 |
| `src/lib/specialRules.js` | 特殊计算规则层：读取 `specialSkillRules.json` 并覆盖到技能表 |
| `src/main.jsx` | React 入口 |
| `src/data/*.json` | **所有可改数据**，见第 4 节；结构说明见 `src/data/README.md` |
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

- `item` 是 `erGameData.json` 里的官方装备，**官方字段覆盖用户保存的字段**。
- 只有 `effect` 例外：用户填了就用用户的。
- 官方表里没有的（`code` 和 `name` 都不冲突）自定义装备会追加到列表末尾。

**结论：**
- 想修正一件**官方已有装备**的数值 → 必须改 `src/data/erGameData.json`（或重新跑导出脚本），改 `localConfig.json` 无效。
- 想加**自定义/测试装备** → 在 `localConfig.json` 的 `equipment` 里新增一条，`name` 不要和官方重名、不要写 `code`。

### 3.3 技能合并规则

`mergeSkills()`（`src/lib/skillSources.js:198`）：

```js
{ ...initialSkill, ...skill, progressiveDamage: skill.progressiveDamage || initialSkill.progressiveDamage }
```

- 与装备相反：**用户/`localConfig` 的字段覆盖内置生成条目**，所以技能可以直接在 `localConfig.json` 里改。

#### 数据来源的定位

**er-gamedata 是玩家自发维护的解包内容，不保证准确。** 它只用来把技能骨架（技能组、伤害段、文案模板）跑一遍初始化；
之后的数值和效果一律以**官方更新公告**为准。实际踩过的坑：解包旧表把杰琪、翡翠这类物理英雄的系数错记成了技能增幅（`ap`），
而正确的是攻击力（`attack`）。

因此优先级按**数据权威性**决定，**与条目放在哪个文件无关**（`SKILL_SOURCE_AUTHORITY`，`src/lib/skillSources.js`）：

| 权威值 | `source` | 含义 |
| ---: | --- | --- |
| 100 | `special-skill-rule` | 人工特殊计算规则（`specialSkillRules.json`） |
| 90 | `manual` | **人工录入 / 手改**：任何文件里 `"manual": true` 的条目 |
| 80 | `official-patch-note`、`external-official-patch` | 官方更新公告 |
| 40 | `external-wiki-current` 等 | 官方 Wiki |
| 20 | `er-skill-damage-table` | er-gamedata 结构化解包 |
| 10 | `er-gamedata` | er-gamedata 旧版解包（最不可信） |

同权威值再比 `updatedAt` 取新；仍相同则按来源文件可信度（结构化表 > 补充表 > Wiki/公告表 > 旧版表）；再相同取靠后的。

#### 一段伤害只保留一条

去重键是**一段伤害的身份**：`hero | group | skillId | dataKey`（**不含 `title`**）。
同一段伤害无论来自解包表还是公告表，身份相同，只保留权威最高的那条——不会再出现「Q 连斩」和「Q 连斩 基础伤害」两行数值打架。
手动条目通常没有 `group`/`skillId`/`dataKey`，这时退回用 `hero | title` 区分，不会被误合并。

#### 参与拼装的文件（都可以手改）

| 文件 | 定位 |
| --- | --- |
| `src/data/specialSkillRules.json` | 人工规则，最后整体盖回，不参与比较 |
| `src/data/erSkillDamageTable.json` | 解包骨架；标了 `manual` 的行升到 90 且重新导出时不被覆盖 |
| `src/data/skillDamageAugments.json` | 补强化普攻 / 强化技能 / 额外伤害 |
| `src/data/externalSkillDamageFallback.json` | Wiki 结构 + 官方公告数值 |
| `src/data/erGameData.json` → `skills` | 旧版解包表 |

**优先级 0（人工规则）不参与比较**：拼装完、以及每次合并 `localStorage` 保存的配置之后，都会由 `applySpecialSkillRules()` 整体盖回。
规则表里标了 `manual: true` 的英雄（俞岷、奇娅拉），生成表的条目根本不会进入合并。

**结论：**
- 想改**已校对英雄**（俞岷、奇娅拉）→ 只改 `specialSkillRules.json`，改别处无效。
- 想让一条手改值压过所有生成数据 → 给它加 `"manual": true`（见 6.5）。
- 想新增一条不冲突的技能 → 用一个新的 `dataKey`（或留空 `group`/`skillId`/`dataKey` 并换标题）。

---

## 4. 数据文件速查

> 逐个文件的字段说明见 [src/data/README.md](src/data/README.md)。

| 文件 | 内容 | 日常是否手改 |
| --- | --- | --- |
| `src/data/specialSkillRules.json` | **特殊计算规则**：已校对英雄的公式 + 特殊展示/叠层规则 | ✅ 手写 |
| `src/data/localConfig.json` | **主要人工入口**：`equipment` / `skills` / `talents` / `combos` | ✅ 常改 |
| `src/data/skillDamageAugments.json` | 自动表没覆盖的强化技能、额外伤害 | ✅ 可改 |
| `src/data/externalSkillDamageFallback.json` | Wiki / 官方补丁兜底技能伤害 | ✅ 可改 |
| `src/data/erGameData.json` | 角色、装备、属性定义、旧技能表（解包导出） | ✅ 改装备数值时改这里 |
| `src/data/erSkillDamageTable.json` | er-gamedata 解包骨架 | ✅ 可改，加 `manual: true` 防覆盖（见 6.5） |
| `src/data/erSkillTables.json` | 技能原始表归一化快照（脚本生成，仅查来源） | ❌ |
| `src/data/masteryStats.json` | 每级熟练度成长属性（脚本生成） | ⚠️ |
| `src/data/itemUniqueEffects.json` | 装备独有效果名映射（按 code / name） | ✅ |
| `src/data/dakLoadoutAssets.json` | 潜能组 / 潜能 / 战术技能及图标（DAK.GG 抓取） | ⚠️ |
| `src/data/dakItemSkillIcons.json` | 装备图标与 tooltip | ⚠️ |
| `src/data/helpNotes.json` | 界面帮助气泡文案 | ✅ |
| `src/data/announcement.json` | 公告栏 | ✅ |
| `src/data/dataMigrations.json` | 旧缓存迁移表：把 localStorage 里的过期译名换成当前值 | 官方改译名时追加 |
| `src/data/localConfig.export.json` | 存在即锁定全部配置（见 3.1） | 按需 |

所有 JSON 都是**标准 JSON，不能写 `//` 注释**。项目约定用 `_comment` / `_usage` 字段当注释头，代码会忽略它们。

---

## 5. 怎么改 / 加装备

### 5.1 装备条目结构

`erGameData.json` 里的官方条目（完整形态）：

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

其他 `stats` 键（暴击、攻速、适性攻击力等）以 `erGameData.json` 的 `itemStatDefinitions` 为准，共 60 项，`key` 就是可以写进 `stats` 的名字。

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

写在 `localConfig.json` 的 `skills` 数组（或 `skillDamageAugments.json` / `externalSkillDamageFallback.json` 的 `skills`，字段基本一致）：

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
| `hero` | ✅ | 英雄中文名，必须和 `erGameData.json` 的 `characters[].name` 一致，否则技能不会出现在任何英雄下 |
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

写法示例：

```json
"formula": "base + ap * 0.65"
"formula": "base + attack * 1.1"
"formula": "base + targetHp * 0.08"
"formula": "(base + ap * 0.25) * (1 + stacks * 0.2)"
"formula": "base + ap * [0.45,0.5,0.55,0.6,0.65][level - 1]"
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

### 6.4 特殊计算规则（specialSkillRules.json）

需要**手动指定计算方式**、或者公式已经人工校对好、不希望被任何生成数据覆盖的英雄，写在 `src/data/specialSkillRules.json`。
只要英雄出现在这个文件里，计算器就按这里的规则算，生成表和 `localStorage` 里的旧缓存都不会覆盖它。

```jsonc
"heroes": {
  "俞岷": {
    "manual": true,                      // 生成表不参与该英雄的技能合并
    "skills": [                          // 技能条目，字段与普通技能一致（hero 自动补）
      { "id": "yumin-q", "title": "Q 每跳", "bases": "50,65,80,95,110",
        "formula": "base + ap * 0.4", "maxLevel": 5 }
    ],
    "display": {                         // 展示 / 结算方式
      "yumin-q": {
        "label": "普通Q（三段）",
        "hits": 3,                       // 命中段数：单发先取整再乘段数
        "secondaryScale": 0.5,           // 次要目标倍率，写了才显示主/次拆分
        "showBreakdown": true,
        "totalLabelSuffix": "（只算全中）",
        "maxTargets": 3                  // 目标数上限，默认 10
      }
    },
    "combos": [ { "id": "yumin-q3", "title": "Q 三跳全中", "hits": { "yumin-q": 3 } } ],
    "stackSelector": {                   // 叠层选择器（奇娅拉 R2 层数用的就是它）
      "label": "R2层数", "values": [0, 1, 2, 3, 4], "default": 1, "max": 4
    }
  }
}
```

字段说明：

| 字段 | 作用 |
| --- | --- |
| `manual` | 为 `true` 时，生成表里该英雄的条目全部丢弃，只用这里的 `skills` |
| `skills` | 技能条目，字段与第 6.1 节一致；`hero` 由所在键自动补上 |
| `display[skillId].label` | 界面显示名，覆盖由 `title` 推导的默认名 |
| `display[skillId].hits` | 命中段数；单发伤害先向下取整再乘段数，与原实现一致 |
| `display[skillId].secondaryScale` | 次要目标倍率；填了才会显示“主要/次要目标”四行拆分 |
| `display[skillId].showBreakdown` | 是否显示主/次分项 |
| `display[skillId].totalLabelSuffix` | 合计行标签后缀，例如“（只算全中）” |
| `display[skillId].maxTargets` | 目标数步进器上限，默认 10 |
| `combos` | 该英雄的连段，格式同第 6.5 节 |
| `stackSelector` | 叠层按钮组，值会传给公式里的 `stacks` 变量 |
| `defaultHero`（顶层） | 页面初始英雄、以及新建连段的默认英雄 |

**俞岷、奇娅拉的公式已经人工校对完成，请不要在别处修改或增减；需要调整就改这个文件。**

### 6.5 手改生成表（`manual` 标记）

`erSkillDamageTable.json` 等"生成表"**不是只读的**。er-gamedata 由玩家自发维护，解包结果经常与游戏内不符，
遇到这种情况直接改表即可，只要给这一行加上 `"manual": true`：

```jsonc
{
  "standardId": "001-jackie-q-1001200-damage-by-level",
  "heroName": "杰琪",
  "skillGroup": 1001200,
  "baseKey": "DamageByLevel",
  "lv1": 30, "lv2": 50, "lv3": 70, "lv4": 90, "lv5": 110,
  "coefLv1": 0.55,

  "manual": true,                                   // ← 关键
  "formula": "base + attack * 0.55 + targetHp * 0.07",
  "updatedAt": "2026-06-11",
  "sourceUrl": "https://playeternalreturn.com/posts/news/3629?hl=zh-CN",
  "sourceNote": "官方公告 11.4 数值"
}
```

加上之后：

1. **权威值升到 90**，压过所有生成数据（只有 `specialSkillRules.json` 更高）；
2. **重新跑导出脚本不会覆盖它** —— `export-er-skill-damage-table.mjs` 会先读旧文件，
   把 `manual: true` 的行原样保留，并在控制台列出保留了哪些行；解包数据里已经不存在、但手工加过的行也会保留；
3. **可以直接写 `formula`** —— 解包表只能表达 `base + 系数 * 变量`，手改行不受此限制，
   可以写 `targetHp`、`extraAttack` 等任意合法表达式（见 6.2）。

同样的 `"manual": true` 也适用于 `skillDamageAugments.json`、`externalSkillDamageFallback.json`、
`erGameData.json` 的 `skills`——权威判定只看 `source` 和 `manual` 字段，不看条目在哪个文件里。

> 数值来源优先级：**官方更新公告 > 官方 Wiki > er-gamedata 解包**。
> 抓公告见第 9 节（务必带 `hl=zh-CN`）。

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

1. 确认 `erGameData.json` 的 `characters` 里有这个英雄（没有就先跑 `npm run update:gamedata`）。
2. 在 `localConfig.json` 的 `skills` 里按 6.1 逐条补技能，`hero` 用中文名。
3. 需要连段就在 `combos` 里加。
4. `npm run dev`，在英雄选择器里切到该英雄核对数值（界面右下"计算过程"面板会展开中间量）。
5. 有需要就补 `helpNotes.json` 文案。
6. `npm run build` 验证。

界面默认只列出"有伤害数据"的英雄（`HEROES_WITH_SKILL_DAMAGE`）；全英雄入口在设置里开关控制（`showUnsupportedHeroes` / `showDamageTestHeroes`）。

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
| `scripts/update-er-gamedata.mjs` | 同步 er-gamedata，导出角色/装备/属性定义/熟练度 | `src/data/erGameData.json`、`masteryStats.json` |
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
2. **改了装备数值没生效** → 官方装备被 `erGameData.json` 覆盖（3.2），去改 `erGameData.json` 或换个自定义名字。
3. **技能改了没生效** → 被 `dedupeSkillsByLatest` 用同键的更新条目挤掉，补一个更大的 `updatedAt`。
3b. **改了俞岷 / 奇娅拉却没变** → 这两个英雄由 `specialSkillRules.json` 全权接管，改 `localConfig.json`、生成表或页面配置表都不会生效。
4. **伤害显示 0** → `formula` 含中文/百分号/函数名，被白名单正则拦下静默返回 0。
5. **新技能不出现在任何英雄下** → `hero` 中文名和 `erGameData.json` 的角色名对不上。
6. **`bases` 个数和 `maxLevel` 不一致** → 等级选择器和实际取值会错位。
7. **百分比字段** → 一律写小数（`0.15` 表示 15%），不要写 `15`。
8. **`import.meta.glob` 静态资源** → 新增角色/装备图片后需要重启 dev server。

---

## 12. 维护约定

- 改动尽量小、聚焦公式；不要随意引入新依赖（当前只有 react / react-dom + vite）。
- 改公式时对照工作簿或官方来源，并在 `sourceNote` / `sourceUrl` 里留出处。
- 抓官方公告用 `hl=zh-CN`，译名以公告中文版为准；改了已发布条目的译名时，同步在 `src/data/dataMigrations.json` 追加一条迁移。
- **不要擅自改动已人工校对的公式**：俞岷、奇娅拉的数值由 `src/data/specialSkillRules.json` 固定，数据导出脚本和补丁迁移脚本都不许碰它们。
- **er-gamedata 只用于一次性初始化**：技能描述与公式骨架抓一次即可，之后的数值/效果改动走官方更新公告；发现解包数据不对就直接改表并加 `"manual": true`。
- 英雄的专属计算/展示逻辑一律写进 `specialSkillRules.json`，不要再往 `App.jsx` 里加 `selectedHero === 'xxx'` 这类特判。
- 纯计算函数放 `src/lib/formula.js`，数据装配放 `src/lib/skillSources.js`，`App.jsx` 只留 React 与 UI。
- 提交前跑 `npm run build`。
- 远程仓库：`https://github.com/sanzennami/er_damage.git`，部署走 Cloudflare Pages（`wrangler.toml`，输出目录 `dist`）。
