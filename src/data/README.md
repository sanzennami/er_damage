# src/data 数据层说明

所有数据都是标准 JSON（不能写 `//` 注释），项目约定用 `_comment` / `_usage` 字段当注释头，代码会忽略它们。

## 技能数据的优先级

**er-gamedata 是玩家自发维护的解包内容，不保证准确**，只用来把技能骨架跑一遍初始化；
之后的数值和效果一律以**官方更新公告**为准。所以优先级按**数据权威性**判定，**与条目放在哪个文件无关**：

| 权威值 | `source` | 含义 |
| ---: | --- | --- |
| 100 | `special-skill-rule` | 人工特殊计算规则（`specialSkillRules.json`） |
| 90 | `manual` | **人工录入 / 手改**：任何文件里 `"manual": true` 的条目 |
| 80 | `official-patch-note`、`external-official-patch` | 官方更新公告 |
| 60 | `in-game-client` | 客户端界面读数（`inGameSkillCapture.json`）：每个实验体只导入一次的底稿 |
| 40 | `external-wiki-current` 等 | 官方 Wiki |
| 20 | `er-skill-damage-table` | er-gamedata 结构化解包 |
| 10 | `er-gamedata` | er-gamedata 旧版解包（最不可信） |

同权威值再比 `updatedAt` 取新；仍相同则按来源文件可信度；再相同取靠后的。

**去重键是一段伤害的身份**：`hero｜group｜skillId｜dataKey`（不含 `title`）。
同一段伤害无论来自解包表还是公告表都只保留权威最高的那条，不会出现两行数值打架。
没有 `group`/`skillId`/`dataKey` 的手动条目退回用 `hero｜title` 区分。

权威值 100 的人工规则**不参与比较**：拼装完成、以及每次合并 `localStorage` 保存的配置之后都会整体盖回，
因此人工校对的公式不会被任何生成数据或旧缓存顶掉。

### 六个文件都可以手改

| 文件 | 角色 |
| --- | --- |
| `specialSkillRules.json` | 人工规则，最高优先级 |
| `inGameSkillCapture.json` | 客户端界面读数（由 `scripts/ingame-capture.mjs` 生成，见下） |
| `erSkillDamageTable.json` | 解包骨架；标 `manual` 的行升到 90，且重新导出时不被覆盖 |
| `skillDamageAugments.json` | 补充：强化普攻 / 强化技能 / 额外伤害 |
| `externalSkillDamageFallback.json` | Wiki 结构 + 官方公告数值 |
| `erGameData.json` 的 `skills` | 旧版解包表 |

想让一条手改值压过所有生成数据，给它加 `"manual": true`：

```jsonc
{
  "standardId": "001-jackie-q-1001200-damage-by-level",
  "lv1": 30, "lv2": 50, "lv3": 70, "lv4": 90, "lv5": 110,
  "manual": true,                                   // 权威值升到 90，导出脚本不覆盖
  "formula": "base + attack * 0.55 + targetHp * 0.07",  // 手改行可写任意合法公式
  "sourceUrl": "https://playeternalreturn.com/posts/news/3629?hl=zh-CN"
}
```

`scripts/export-er-skill-damage-table.mjs` 重新导出时会先读旧文件，把 `manual: true` 的行原样保留
（解包数据里已不存在、但手工加过的行也保留），并在控制台列出保留了哪些行。

## inGameSkillCapture.json —— 客户端界面读数

数据来自客户端「藏品 → 实验体 → 技能」界面里显示的参数。**每个实验体只导入一次**，
之后的版本更新一律靠抓官方公告覆盖 —— 所以权威值 **60**：压过 er-gamedata 解包（20）和
官方 Wiki（40），但低于官方公告（80），公告永远能盖掉它。

流程：截图放进 `captures/ingame/`（图片已 gitignore，命名规则见那边的 README）→ 读数填进本文件 →
跑 `npm run capture:build` 规范化。

一张技能截图能同时喂三份数据：

| 界面位置 | 落到 | 是否覆盖 |
| --- | --- | --- |
| 技能说明里的数值 | `skills` / `drafts` | 覆盖（权威 60） |
| 右侧「统计」栏 Lv1/Lv20 | `characterStats` | **先对账**，只在和 `erGameData` 打架时覆盖 |
| 右侧「武器熟练度」栏 Lv1/Lv20 | `weaponMastery` | **先对账**，只在和 `masteryStats` 打架时覆盖 |

**手写的只有这几个字段**，其余（`id` / `bases` / `maxLevel` / `title` / `skillId`）由脚本生成：

```jsonc
{
  "hero": "杰琪",                        // 中文名 / 英文名 / id 都认
  "slot": "Q",                           // 该槽位有多个技能组时必须改写 group
  "group": 1001200,                      // 可选；写了就以它为准
  "dataKey": "DamageByLevel",            // 伤害段标识：想覆盖解包表就照抄它的 baseKey
  "damagePart": "基础伤害",
  "levelValues": { "1": 25, "2": 45, "3": 65, "4": 85, "5": 105 },
  "cooldownByLevel": { "1": 8, "2": 7, "3": 6, "4": 5, "5": 4 },   // 可选，见下
  "costByLevel":     { "1": 50, "2": 60, "3": 70, "4": 80, "5": 90 },
  "scaling": { "attack": 0.45 },         // 也可写 [0.45,0.45,0.5,0.5,0.55] 逐级系数
  "scalingText": "(+攻击力45%)",
  "clientPatch": "11.9",
  "capturedAt": "2026-08-09T00:00:00Z",  // 缺了同权威撞车时无法比新旧
  "screenshots": ["杰琪-Q-lv1.png"],
  "confidence": "high"                   // 读不准写 needs-recheck
}
```

- **`dataKey` 必须照抄现有条目**，否则去重键（`hero｜group｜skillId｜dataKey`）对不上，客户端读数不会
  覆盖旧值，而是和它并列显示成两行打架的数值。`npm run capture:list -- 希瑟拉` 会把**所有来源**
  （解包表 / Wiki / 公告）现有的 `dataKey`、数值、系数打出来，并标出哪些来源权威高于客户端读数、
  录了也不会生效；
- **等级没填齐**会被丢进 `drafts`，App 不读。判定不只看连不连续，还看技能自己有几级 ——
  5 级技能只录了 1 级也是草稿，绝不会当成 `maxLevel: 1` 入库把完整数值顶掉；
- `scaling` 之外要写 `targetHp` / `extraAttack` 这类项时，直接写完整 `formula` 覆盖；
- 读数没问题、但现有伤害模型**表达不了这段机制**时（例如「每失去 1% 体力追加伤害」，模型里没有
  「自身已失体力百分比」这个变量），照实存单位值 + `formula: "base"`，并把原文写进 `modelNote`、
  单位写进 `unit`。宁可存一个诚实的单位值，也不要为了凑进模型编一个错公式；
- **护盾 / 治疗量这类非伤害读数**放 `nonDamage` 数组，条目加 `"kind": "shield" | "heal" | "other"`。
  计算器里没有护盾模型，放进 `skills` 会被当成伤害行显示出来 —— `nonDamage` 一样走校验、一样留证据，
  但 `skillSources.js` 不读它。写在 `skills` 里但带了 `kind` 的条目，`build` 会自动挪过去；
- `cooldownByLevel` / `costByLevel` 是**纯证据字段**：伤害模型里没有冷却和消耗这两项，目前没有任何
  计算读它们，存下来是为了以后做冷却 / 资源 / DPS 时不用重新截一遍图。等级数必须和 `levelValues`
  一致，否则报错（对不上说明读漏了一级）。

### 成长数据：先对账，不一致才覆盖

```jsonc
{
  "characterStats": [
    { "hero": "希瑟拉",
      "lv1":  { "hp": 920,  "attack": 33,  "defense": 50 },
      "lv20": { "hp": 2231, "attack": 114, "defense": 95 } }
  ],
  "weaponMastery": [
    { "hero": "希瑟拉", "weapon": "暗器",
      "lv1":  { "attackSpeed": 3.2, "skillAmp": 3.9 },
      "lv20": { "attackSpeed": 64,  "skillAmp": 78 } }
  ]
}
```

- 客户端 Lv20 是**向下取整**显示的（33 + 4.3×19 = 114.7 → 显示 114），所以反推的每级成长精度不如
  解包原值。脚本先算「用仓库现有成长值能不能复现截图上的两个数字」：能 → `repoCheck: "match"`，
  只留证据不覆盖；不能 → 生成 `override`，由 `src/lib/characterStats.js` 盖到解包值上，并在
  `build` 输出里报冲突；
- 熟练度栏显示的是**累计值**，Lv1 就是每级增量，Lv20 = 每级 × 20，脚本拿 Lv20 当校验位；
- `weapon` 写中文名即可，中文名 → 内部枚举（`暗器 → DirectFire`）从装备表的 `weaponType` 标签自动推导，
  官方改译名会自动跟上；认不出来时会把该实验体可用的武器列出来。

### 子命令

| 命令 | 作用 |
| --- | --- |
| `npm run capture:list -- 希瑟拉` | 打印技能骨架 + 所有来源的现有 `dataKey` / 数值 / 系数 |
| `npm run capture:stub -- 希瑟拉` | 输出可直接粘贴的录入骨架（`dataKey` 已对齐现有条目） |
| `npm run capture:build` | 规范化并写回（有错不写；可重复跑，幂等） |
| `npm run capture:check` | 只校验 |
| `npm run capture:stats` | 只看成长数据的对账结果 |
| `npm run capture:status` | 录入进度 + 建议优先截图的实验体 |

## specialSkillRules.json —— 特殊计算规则

这是唯一需要手写的技能文件。只要某个英雄写在这里：

- 它的技能**完全**以这里的 `bases` / `formula` 为准；
- 生成表里该英雄的条目不会被合并进来（`manual: true`）；
- 展示方式（多段命中、次要目标衰减、目标数上限、叠层选择器）也由这里描述。

结构：

```jsonc
{
  "defaultHero": "俞岷",
  "heroes": {
    "俞岷": {
      "manual": true,                 // 生成表不参与该英雄的合并
      "note": "公式已人工校对",
      "skills": [
        { "id": "yumin-q", "title": "Q 每跳", "bases": "50,65,80,95,110",
          "formula": "base + ap * 0.4", "maxLevel": 5 }
      ],
      "display": {
        "yumin-q": {
          "label": "普通Q（三段）",     // 界面显示名
          "hits": 3,                   // 命中段数：单发伤害先取整再乘段数
          "secondaryScale": 0.5,       // 次要目标倍率，写了才会显示主/次拆分
          "showBreakdown": true,       // 显示主要/次要目标分项
          "totalLabelSuffix": "（只算全中）",
          "maxTargets": 3              // 目标数上限，默认 10
        }
      },
      "combos": [
        { "id": "yumin-q3", "title": "Q 三跳全中", "hits": { "yumin-q": 3 } }
      ],
      "stackSelector": {               // 叠层选择器，例如奇娅拉 R2 层数
        "label": "R2层数", "values": [0, 1, 2, 3, 4], "default": 1, "max": 4
      }
    }
  }
}
```

技能条目字段与其它表一致（`id` / `title` / `bases` / `formula` / `maxLevel`），`hero` 由所在的 `heroes` 键自动补上。
公式可用变量：`base`、`ap`、`attack`、`extraAttack`、`targetHp`、`stacks`、`level`，详见 `docs/config-json-guide.md`。

> 已经调好的英雄（俞岷、奇娅拉）请只在这个文件里改，不要在页面配置表或生成表里动它们。

## 通用特殊规则：progressiveDamage

随蓄力/弹跳档位递增的技能不用写进特殊规则表，直接在任意技能条目上加 `progressiveDamage` 即可（例如爱琳的跳跳球）。规则由 `src/lib/formula.js` 的 `progressiveDamageValue` 统一结算。

## 其它数据文件

| 文件 | 内容 | 日常是否手改 |
| --- | --- | --- |
| `dataMigrations.json` | 迁移表：把浏览器 localStorage 里保存的过期字段（如旧译名）改成当前值 | 官方改译名时追加 |
| `localConfig.json` | 页面配置表的默认值：装备 / 技能 / 天赋 / 连段 | 装备与天赋常改 |
| `localConfig.export.json` | 存在即锁定全部配置，忽略 localStorage（发布用） | 按需 |
| `erGameData.json` | 实验体、装备属性、属性定义、旧技能表 | 改装备数值时改这里 |
| `masteryStats.json` | 每级武器熟练度成长 | 跟官方补丁改 |
| `itemUniqueEffects.json` | 装备独有效果名映射（按 code / name） | 可改 |
| `dakLoadoutAssets.json` | 潜能组 / 潜能 / 战术技能及图标 | 跟官方补丁改 |
| `dakItemSkillIcons.json` | 装备图标与 tooltip | 脚本生成 |
| `erSkillTables.json` | 技能原始表归一化快照，仅供查来源 | 否 |
| `helpNotes.json` | 界面帮助气泡文案 | 可改 |
| `announcement.json` | 公告栏 | 可改 |

## dataMigrations.json —— 旧缓存迁移

计算器会把技能配置保存在浏览器 `localStorage`，保存值优先级高于内置数据。官方修正中文译名后，老用户的缓存里仍是旧名字，因此需要一张迁移表：

```json
{
  "skillTitles": [
    { "id": "patch-115-craver-1089500-damage", "from": "R 决斗时刻", "to": "R 决战时刻！" }
  ]
}
```

`mergeSkills` 只在保存值与 `from` **完全一致**时才替换成 `to`，用户自己改过的名字不会被覆盖。

英雄改名不需要写进这张表：`mergeSkills` 会自动识别——保存的英雄名如果已经不在当前实验体列表里（例如 `Craver` 改名为 `克雷弗`），就采用内置条目的新名字；如果用户把技能挪给了另一个真实存在的英雄，则保留用户的改动。

## 装备优先级（与技能相反）

`mergeEquipment` 是 `{ ...saved, ...official }`，**官方数据反向覆盖用户改动**：

- 改官方已有装备 → 改 `erGameData.json`；
- 加自定义装备 → 在 `localConfig.json` 的 `equipment` 里新增，`name` 不与官方重名且不写 `code`。
