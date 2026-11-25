# 自动更新报告与待核对变动清单

> 生成时间：2026/11/25 16:47:29（耗时 34.1s）

## 一、已全自动追平的内容（无需人工操作）

- **装备面板同步（`equipment.json`）**：新增装备 **0** 件，属性调整 **5** 件，下架移除 **0** 件
- **实验体面板同步（`characters.json`）**：新增实验体 **0** 名，基础/成长属性调整 **4** 名
- **装备独有特效名绑定（`itemUniqueEffects.json`）**：更新 **0** 件装备的独有特效标签
- **图标与头像增量补抓**：新下载图标 **0** 张，新实验体头像 **0** 张
- **推荐出装（`weaponRoutePresets.json`）**：本次已跳过（`--skip-routes`）

### 装备基础面板变动明细（已自动写入 `equipment.json`）
- **[头部] 夜视头盔** (`201518`)：`attackPower:24, attackSpeedRatio:0.22, criticalStrikeChance:0.35` → `attackPower:25, attackSpeedRatio:0.22, criticalStrikeChance:0.35`
- **[衣服] 摇滚乐手夹克** (`202406`)：`attackPower:10, attackPowerByLv:3, defense:20, penetrationDefense:8` → `attackPower:10, attackPowerByLv:3, defense:20, penetrationDefense:10`
- **[衣服] 摇滚外套** (`202513`)：`attackPower:10, attackPowerByLv:3, defense:20, cooldownReduction:10, penetrationDefense:10` → `attackPower:10, attackPowerByLv:3, defense:20, cooldownReduction:10, penetrationDefense:12`
- **[手部] 星魂臂章** (`203415`)：`attackPower:24, attackSpeedRatio:0.18, criticalStrikeChance:0.24` → `attackPower:25, attackSpeedRatio:0.18, criticalStrikeChance:0.24`
- **[手部] 白羽扇** (`205201`)：`skillAmp:50, cooldownReduction:10` → `skillAmp:55, cooldownReduction:10`

---

## 二、需人工快速核对的公式变动（客户端/OpenAPI 不公开服务端公式系数）

🎉 **本次未检测到新官网补丁公告或任何英雄技能、武器技能、装备独有特效、潜能的中文说明变动！无需手改任何公式，直接 `npm run push` 即可发布。**
