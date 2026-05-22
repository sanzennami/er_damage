# DAK.GG 装备、物品与英雄技能图标

来源页面：https://dak.gg/er/routes/simulator/YuMin?hl=zh-CN

数据接口：
- https://er.dakgg.io/api/v1/data/items?hl=zh-CN
- https://er.dakgg.io/api/v1/data/skills?hl=zh-CN
- https://er.dakgg.io/api/v1/data/characters?hl=zh-CN

生成时间：2026-05-21T19:43:46.379Z

## 命名规范

- 装备图标：`assets/game-icons/equipment/{type}/equipment-{id}-{type}-{subType}.png`
- 非装备物品图标：`assets/game-icons/items/{type}/item-{id}-{type}-{subType}.png`
- 英雄技能图标：`assets/game-icons/hero-skills/{characterKey}/skill-{characterId}-{slot}-{id}.png`
- 武器技能图标：`assets/game-icons/weapon-skills/weapon-skill-{slot}-{id}.png`
- 机器可读清单：`assets/game-icons/manifest.json`
- 前端可直接 import 的副本：`src/data/dakItemSkillIcons.json`

## 统计

| 类别 | 数量 |
| --- | --- |
| 装备图标 | 728 |
| 非装备物品图标 | 279 |
| 英雄技能图标 | 469 |
| 武器技能图标 | 23 |
| 拥有技能数据的英雄数 | 88 |
| 缺失图片 | 0 |

## 装备图标

### Weapon

| id | 名称 | 子类型 | 品级 | 图片 |
| --- | --- | --- | --- | --- |
| 101104 | 菜刀 | OneHandSword | Common | /assets/game-icons/equipment/weapon/equipment-101104-weapon-one-hand-sword.png |
| 101201 | 军刀 | OneHandSword | Uncommon | /assets/game-icons/equipment/weapon/equipment-101201-weapon-one-hand-sword.png |
| 101202 | 手术刀 | OneHandSword | Uncommon | /assets/game-icons/equipment/weapon/equipment-101202-weapon-one-hand-sword.png |
| 101203 | Jamadhar | OneHandSword | Uncommon | /assets/game-icons/equipment/weapon/equipment-101203-weapon-one-hand-sword.png |
| 101301 | 玫瑰刀 | OneHandSword | Rare | /assets/game-icons/equipment/weapon/equipment-101301-weapon-one-hand-sword.png |
| 101302 | 瑞士军刀 | OneHandSword | Rare | /assets/game-icons/equipment/weapon/equipment-101302-weapon-one-hand-sword.png |
| 101303 | 印度拳刃 | OneHandSword | Rare | /assets/game-icons/equipment/weapon/equipment-101303-weapon-one-hand-sword.png |
| 101401 | 亚瑟王的短剑 | OneHandSword | Epic | /assets/game-icons/equipment/weapon/equipment-101401-weapon-one-hand-sword.png |
| 101402 | 破山剑 | OneHandSword | Epic | /assets/game-icons/equipment/weapon/equipment-101402-weapon-one-hand-sword.png |
| 101404 | 共振匕首 | OneHandSword | Epic | /assets/game-icons/equipment/weapon/equipment-101404-weapon-one-hand-sword.png |
| 101405 | 佛拉格拉克 | OneHandSword | Legend | /assets/game-icons/equipment/weapon/equipment-101405-weapon-one-hand-sword.png |
| 101406 | 大马士革·索恩 | OneHandSword | Epic | /assets/game-icons/equipment/weapon/equipment-101406-weapon-one-hand-sword.png |
| 101407 | 摩诃罗阇 | OneHandSword | Epic | /assets/game-icons/equipment/weapon/equipment-101407-weapon-one-hand-sword.png |
| 101408 | 高地德克短剑 | OneHandSword | Epic | /assets/game-icons/equipment/weapon/equipment-101408-weapon-one-hand-sword.png |
| 101501 | 月蚀 | OneHandSword | Legend | /assets/game-icons/equipment/weapon/equipment-101501-weapon-one-hand-sword.png |
| 101502 | 噬灵短剑 | OneHandSword | Legend | /assets/game-icons/equipment/weapon/equipment-101502-weapon-one-hand-sword.png |
| 101503 | 绯色短剑 | OneHandSword | Mythic | /assets/game-icons/equipment/weapon/equipment-101503-weapon-one-hand-sword.png |
| 101504 | 恶意 | OneHandSword | Legend | /assets/game-icons/equipment/weapon/equipment-101504-weapon-one-hand-sword.png |
| 101701 | 绯色短剑 - 绯红 | OneHandSword | Mythic | /assets/game-icons/equipment/weapon/equipment-101701-weapon-one-hand-sword.png |
| 101702 | 绯色短剑 - 晓色 | OneHandSword | Mythic | /assets/game-icons/equipment/weapon/equipment-101702-weapon-one-hand-sword.png |
| 102101 | 铁锈剑 | TwoHandSword | Common | /assets/game-icons/equipment/weapon/equipment-102101-weapon-two-hand-sword.png |
| 102201 | 长剑 | TwoHandSword | Uncommon | /assets/game-icons/equipment/weapon/equipment-102201-weapon-two-hand-sword.png |
| 102301 | 武士刀 | TwoHandSword | Rare | /assets/game-icons/equipment/weapon/equipment-102301-weapon-two-hand-sword.png |
| 102401 | Masamune | TwoHandSword | Rare | /assets/game-icons/equipment/weapon/equipment-102401-weapon-two-hand-sword.png |
| 102402 | 妖刀村正 | TwoHandSword | Rare | /assets/game-icons/equipment/weapon/equipment-102402-weapon-two-hand-sword.png |
| 102403 | 重剑 | TwoHandSword | Rare | /assets/game-icons/equipment/weapon/equipment-102403-weapon-two-hand-sword.png |
| 102404 | 宝剑 | TwoHandSword | Rare | /assets/game-icons/equipment/weapon/equipment-102404-weapon-two-hand-sword.png |
| 102405 | 顺天剑 | TwoHandSword | Epic | /assets/game-icons/equipment/weapon/equipment-102405-weapon-two-hand-sword.png |
| 102406 | 阿隆戴特 | TwoHandSword | Epic | /assets/game-icons/equipment/weapon/equipment-102406-weapon-two-hand-sword.png |
| 102407 | 断钢圣剑 | TwoHandSword | Epic | /assets/game-icons/equipment/weapon/equipment-102407-weapon-two-hand-sword.png |
| 102408 | 等离子剑 | TwoHandSword | Epic | /assets/game-icons/equipment/weapon/equipment-102408-weapon-two-hand-sword.png |
| 102409 | 破灭之枝 | TwoHandSword | Legend | /assets/game-icons/equipment/weapon/equipment-102409-weapon-two-hand-sword.png |
| 102410 | 物干焯 | TwoHandSword | Epic | /assets/game-icons/equipment/weapon/equipment-102410-weapon-two-hand-sword.png |
| 102411 | 天卫之剑 | TwoHandSword | Epic | /assets/game-icons/equipment/weapon/equipment-102411-weapon-two-hand-sword.png |
| 102412 | 极光长剑 | TwoHandSword | Legend | /assets/game-icons/equipment/weapon/equipment-102412-weapon-two-hand-sword.png |
| 102413 | 奥术光刀 | TwoHandSword | Epic | /assets/game-icons/equipment/weapon/equipment-102413-weapon-two-hand-sword.png |
| 102501 | 噬血魔剑 | TwoHandSword | Mythic | /assets/game-icons/equipment/weapon/equipment-102501-weapon-two-hand-sword.png |
| 102502 | 极冰之剑 | TwoHandSword | Legend | /assets/game-icons/equipment/weapon/equipment-102502-weapon-two-hand-sword.png |
| 102503 | 冥王剑 | TwoHandSword | Legend | /assets/game-icons/equipment/weapon/equipment-102503-weapon-two-hand-sword.png |
| 102701 | 噬血魔剑 - 绯红 | TwoHandSword | Mythic | /assets/game-icons/equipment/weapon/equipment-102701-weapon-two-hand-sword.png |
| 102702 | 噬血魔剑 - 晓色 | TwoHandSword | Mythic | /assets/game-icons/equipment/weapon/equipment-102702-weapon-two-hand-sword.png |
| 103201 | 双刀 | DualSword | Common | /assets/game-icons/equipment/weapon/equipment-103201-weapon-dual-sword.png |
| 103202 | 粗劣的双剑 | DualSword | Uncommon | /assets/game-icons/equipment/weapon/equipment-103202-weapon-dual-sword.png |
| 103301 | 佛罗伦萨 | DualSword | Rare | /assets/game-icons/equipment/weapon/equipment-103301-weapon-dual-sword.png |
| 103302 | 双匕首 | DualSword | Rare | /assets/game-icons/equipment/weapon/equipment-103302-weapon-dual-sword.png |
| 103401 | 二天一流 | DualSword | Epic | /assets/game-icons/equipment/weapon/equipment-103401-weapon-dual-sword.png |
| 103402 | 雌雄双股剑 | DualSword | Legend | /assets/game-icons/equipment/weapon/equipment-103402-weapon-dual-sword.png |
| 103403 | 阿修罗 | DualSword | Epic | /assets/game-icons/equipment/weapon/equipment-103403-weapon-dual-sword.png |
| 103404 | 黑蝶 | DualSword | Epic | /assets/game-icons/equipment/weapon/equipment-103404-weapon-dual-sword.png |
| 103501 | 狄奥斯库洛伊 | DualSword | Epic | /assets/game-icons/equipment/weapon/equipment-103501-weapon-dual-sword.png |
| 103502 | 罗伊格尔＆扎尔 | DualSword | Legend | /assets/game-icons/equipment/weapon/equipment-103502-weapon-dual-sword.png |
| 103503 | 阴阳双刃 | DualSword | Legend | /assets/game-icons/equipment/weapon/equipment-103503-weapon-dual-sword.png |
| 103504 | 幻影刀 | DualSword | Mythic | /assets/game-icons/equipment/weapon/equipment-103504-weapon-dual-sword.png |
| 103505 | 塔纳托斯 | DualSword | Legend | /assets/game-icons/equipment/weapon/equipment-103505-weapon-dual-sword.png |
| 103506 | 护手双钩 | DualSword | Epic | /assets/game-icons/equipment/weapon/equipment-103506-weapon-dual-sword.png |
| 103507 | 幽影双刃 | DualSword | Legend | /assets/game-icons/equipment/weapon/equipment-103507-weapon-dual-sword.png |
| 103701 | 幻影刀 - 绯红 | DualSword | Mythic | /assets/game-icons/equipment/weapon/equipment-103701-weapon-dual-sword.png |
| 103702 | 幻影刀 - 晓色 | DualSword | Mythic | /assets/game-icons/equipment/weapon/equipment-103702-weapon-dual-sword.png |
| 104101 | 锤子 | Hammer | Common | /assets/game-icons/equipment/weapon/equipment-104101-weapon-hammer.png |
| 104201 | 战锤 | Hammer | Uncommon | /assets/game-icons/equipment/weapon/equipment-104201-weapon-hammer.png |
| 104301 | 钉头锤 | Hammer | Rare | /assets/game-icons/equipment/weapon/equipment-104301-weapon-hammer.png |
| 104302 | 黑鹿锤 | Hammer | Uncommon | /assets/game-icons/equipment/weapon/equipment-104302-weapon-hammer.png |
| 104303 | 命运之锤 | Hammer | Rare | /assets/game-icons/equipment/weapon/equipment-104303-weapon-hammer.png |
| 104401 | 狼牙棒 | Hammer | Epic | /assets/game-icons/equipment/weapon/equipment-104401-weapon-hammer.png |
| 104402 | 达格达的大釜 | Hammer | Epic | /assets/game-icons/equipment/weapon/equipment-104402-weapon-hammer.png |
| 104403 | 雷神之锤 | Hammer | Epic | /assets/game-icons/equipment/weapon/equipment-104403-weapon-hammer.png |
| 104404 | 夜神星锤 | Hammer | Legend | /assets/game-icons/equipment/weapon/equipment-104404-weapon-hammer.png |
| 104405 | 魔法棒 | Bat | Legend | /assets/game-icons/equipment/weapon/equipment-104405-weapon-bat.png |
| 104406 | 千斤锤 | Hammer | Epic | /assets/game-icons/equipment/weapon/equipment-104406-weapon-hammer.png |
| 104407 | 金刚杵 | Bat | Epic | /assets/game-icons/equipment/weapon/equipment-104407-weapon-bat.png |
| 104408 | 八卦佛杖 | Bat | Epic | /assets/game-icons/equipment/weapon/equipment-104408-weapon-bat.png |
| 104409 | 知识之锤 | Hammer | Epic | /assets/game-icons/equipment/weapon/equipment-104409-weapon-hammer.png |
| 104501 | 和平暗使 | Hammer | Mythic | /assets/game-icons/equipment/weapon/equipment-104501-weapon-hammer.png |
| 104502 | 天星锤 | Hammer | Legend | /assets/game-icons/equipment/weapon/equipment-104502-weapon-hammer.png |
| 104503 | 末日 | Hammer | Legend | /assets/game-icons/equipment/weapon/equipment-104503-weapon-hammer.png |
| 104504 | 利维坦 | Hammer | Legend | /assets/game-icons/equipment/weapon/equipment-104504-weapon-hammer.png |
| 104701 | 和平暗使 - 绯红 | Hammer | Mythic | /assets/game-icons/equipment/weapon/equipment-104701-weapon-hammer.png |
| 104702 | 和平暗使 - 晓色 | Hammer | Mythic | /assets/game-icons/equipment/weapon/equipment-104702-weapon-hammer.png |
| 105103 | 短柄斧 | Axe | Common | /assets/game-icons/equipment/weapon/equipment-105103-weapon-axe.png |
| 105201 | 锁镰 | Axe | Uncommon | /assets/game-icons/equipment/weapon/equipment-105201-weapon-axe.png |
| 105202 | 战斧 | Axe | Uncommon | /assets/game-icons/equipment/weapon/equipment-105202-weapon-axe.png |
| 105301 | 轻量化斧头 | Axe | Rare | /assets/game-icons/equipment/weapon/equipment-105301-weapon-axe.png |
| 105302 | 死神镰刀 | Axe | Rare | /assets/game-icons/equipment/weapon/equipment-105302-weapon-axe.png |
| 105401 | 大斧 | Axe | Rare | /assets/game-icons/equipment/weapon/equipment-105401-weapon-axe.png |
| 105402 | 激光刃斧 | Axe | Epic | /assets/game-icons/equipment/weapon/equipment-105402-weapon-axe.png |
| 105403 | 死亡圣神之镰 | Axe | Epic | /assets/game-icons/equipment/weapon/equipment-105403-weapon-axe.png |
| 105404 | 大镰刀 | Axe | Epic | /assets/game-icons/equipment/weapon/equipment-105404-weapon-axe.png |
| 105405 | 罗摩斧 | Axe | Epic | /assets/game-icons/equipment/weapon/equipment-105405-weapon-axe.png |
| 105406 | 赫帕尔 | Axe | Epic | /assets/game-icons/equipment/weapon/equipment-105406-weapon-axe.png |
| 105407 | 战坦克 | Axe | Legend | /assets/game-icons/equipment/weapon/equipment-105407-weapon-axe.png |
| 105408 | 盘古斧 | Axe | Legend | /assets/game-icons/equipment/weapon/equipment-105408-weapon-axe.png |
| 105501 | 天堂之镰 | Axe | Legend | /assets/game-icons/equipment/weapon/equipment-105501-weapon-axe.png |
| 105502 | 血色之镰 | Axe | Mythic | /assets/game-icons/equipment/weapon/equipment-105502-weapon-axe.png |
| 105503 | 蓝狮 | Axe | Legend | /assets/game-icons/equipment/weapon/equipment-105503-weapon-axe.png |
| 105701 | 血色之镰 - 绯红 | Axe | Mythic | /assets/game-icons/equipment/weapon/equipment-105701-weapon-axe.png |
| 105702 | 血色之镰 - 晓色 | Axe | Mythic | /assets/game-icons/equipment/weapon/equipment-105702-weapon-axe.png |
| 107101 | 短矛 | Spear | Common | /assets/game-icons/equipment/weapon/equipment-107101-weapon-spear.png |
| 107201 | 竹矛 | Spear | Uncommon | /assets/game-icons/equipment/weapon/equipment-107201-weapon-spear.png |
| 107301 | 双叉戟 | Spear | Rare | /assets/game-icons/equipment/weapon/equipment-107301-weapon-spear.png |
| 107302 | 矛 | Spear | Uncommon | /assets/game-icons/equipment/weapon/equipment-107302-weapon-spear.png |
| 107303 | 斧枪 | Spear | Rare | /assets/game-icons/equipment/weapon/equipment-107303-weapon-spear.png |
| 107401 | 钢枪 | Spear | Rare | /assets/game-icons/equipment/weapon/equipment-107401-weapon-spear.png |
| 107402 | 涯角枪 | Spear | Legend | /assets/game-icons/equipment/weapon/equipment-107402-weapon-spear.png |
| 107403 | 丈八蛇矛 | Spear | Epic | /assets/game-icons/equipment/weapon/equipment-107403-weapon-spear.png |
| 107404 | 宇宙双叉戟 | Spear | Legend | /assets/game-icons/equipment/weapon/equipment-107404-weapon-spear.png |
| 107405 | 波赛顿之戟 | Spear | Epic | /assets/game-icons/equipment/weapon/equipment-107405-weapon-spear.png |
| 107406 | 火尖枪 | Spear | Legend | /assets/game-icons/equipment/weapon/equipment-107406-weapon-spear.png |
| 107407 | 方天画戟 | Spear | Epic | /assets/game-icons/equipment/weapon/equipment-107407-weapon-spear.png |
| 107408 | 青龙偃月刀 | Spear | Epic | /assets/game-icons/equipment/weapon/equipment-107408-weapon-spear.png |
| 107501 | 朗基努斯之枪 | Spear | Mythic | /assets/game-icons/equipment/weapon/equipment-107501-weapon-spear.png |
| 107502 | 猎星者 | Spear | Legend | /assets/game-icons/equipment/weapon/equipment-107502-weapon-spear.png |
| 107701 | 朗基努斯之枪 - 绯红 | Spear | Mythic | /assets/game-icons/equipment/weapon/equipment-107701-weapon-spear.png |
| 107702 | 朗基努斯之枪 - 晓色 | Spear | Mythic | /assets/game-icons/equipment/weapon/equipment-107702-weapon-spear.png |
| 108102 | 短棍 | Bat | Common | /assets/game-icons/equipment/weapon/equipment-108102-weapon-bat.png |
| 108103 | 竹 | Tonfa | Common | /assets/game-icons/equipment/weapon/equipment-108103-weapon-tonfa.png |
| 108202 | 长棍 | Bat | Uncommon | /assets/game-icons/equipment/weapon/equipment-108202-weapon-bat.png |
| 108301 | 金砕棒 | Bat | Rare | /assets/game-icons/equipment/weapon/equipment-108301-weapon-bat.png |
| 108401 | 雨伞 | Bat | Rare | /assets/game-icons/equipment/weapon/equipment-108401-weapon-bat.png |
| 108402 | 火炬 | Bat | Rare | /assets/game-icons/equipment/weapon/equipment-108402-weapon-bat.png |
| 108403 | 救世女神像 | Bat | Epic | /assets/game-icons/equipment/weapon/equipment-108403-weapon-bat.png |
| 108404 | 打狗棒 | Bat | Epic | /assets/game-icons/equipment/weapon/equipment-108404-weapon-bat.png |
| 108405 | 铁管 | Bat | Uncommon | /assets/game-icons/equipment/weapon/equipment-108405-weapon-bat.png |
| 108501 | 特工伞 | Bat | Epic | /assets/game-icons/equipment/weapon/equipment-108501-weapon-bat.png |
| 108502 | 如意金箍棒 | Bat | Legend | /assets/game-icons/equipment/weapon/equipment-108502-weapon-bat.png |
| 108503 | 鬼手棍 | Bat | Legend | /assets/game-icons/equipment/weapon/equipment-108503-weapon-bat.png |
| 108504 | 心之杖 | Bat | Mythic | /assets/game-icons/equipment/weapon/equipment-108504-weapon-bat.png |
| 108505 | 秃鹫之眼 | Bat | Legend | /assets/game-icons/equipment/weapon/equipment-108505-weapon-bat.png |
| 108701 | 心之杖 - 绯红 | Bat | Mythic | /assets/game-icons/equipment/weapon/equipment-108701-weapon-bat.png |
| 108702 | 心之杖 - 晓色 | Bat | Mythic | /assets/game-icons/equipment/weapon/equipment-108702-weapon-bat.png |
| 109101 | 鞭子 | Whip | Common | /assets/game-icons/equipment/weapon/equipment-109101-weapon-whip.png |
| 109201 | 套环 | Whip | Uncommon | /assets/game-icons/equipment/weapon/equipment-109201-weapon-whip.png |
| 109202 | 铁鞭 | Whip | Uncommon | /assets/game-icons/equipment/weapon/equipment-109202-weapon-whip.png |
| 109301 | 风之鞭 | Whip | Rare | /assets/game-icons/equipment/weapon/equipment-109301-weapon-whip.png |
| 109401 | 雷龙鞭 | Whip | Epic | /assets/game-icons/equipment/weapon/equipment-109401-weapon-whip.png |
| 109402 | 霹雳鞭 | Whip | Rare | /assets/game-icons/equipment/weapon/equipment-109402-weapon-whip.png |
| 109403 | 格莱普尼尔 | Whip | Epic | /assets/game-icons/equipment/weapon/equipment-109403-weapon-whip.png |
| 109404 | 等离子鞭 | Whip | Epic | /assets/game-icons/equipment/weapon/equipment-109404-weapon-whip.png |
| 109405 | 负极离子鞭 | Whip | Epic | /assets/game-icons/equipment/weapon/equipment-109405-weapon-whip.png |
| 109406 | 乌拉诺斯 | Whip | Legend | /assets/game-icons/equipment/weapon/equipment-109406-weapon-whip.png |
| 109501 | 血花九节鞭 | Whip | Mythic | /assets/game-icons/equipment/weapon/equipment-109501-weapon-whip.png |
| 109502 | 蛇腹剑 | Whip | Legend | /assets/game-icons/equipment/weapon/equipment-109502-weapon-whip.png |
| 109503 | 命运之环 | Whip | Legend | /assets/game-icons/equipment/weapon/equipment-109503-weapon-whip.png |
| 109701 | 血花九节鞭 - 绯红 | Whip | Mythic | /assets/game-icons/equipment/weapon/equipment-109701-weapon-whip.png |
| 109702 | 血花九节鞭 - 晓色 | Whip | Mythic | /assets/game-icons/equipment/weapon/equipment-109702-weapon-whip.png |
| 110101 | Brass Knuckles | Glove | Common | /assets/game-icons/equipment/weapon/equipment-110101-weapon-glove.png |
| 110102 | 劳工手套 | Glove | Common | /assets/game-icons/equipment/weapon/equipment-110102-weapon-glove.png |
| 110201 | 皮手套 | Glove | Uncommon | /assets/game-icons/equipment/weapon/equipment-110201-weapon-glove.png |
| 110202 | 铁指虎 | Glove | Uncommon | /assets/game-icons/equipment/weapon/equipment-110202-weapon-glove.png |
| 110301 | 金属手套 | Glove | Rare | /assets/game-icons/equipment/weapon/equipment-110301-weapon-glove.png |
| 110302 | 羽翼指虎 | Glove | Rare | /assets/game-icons/equipment/weapon/equipment-110302-weapon-glove.png |
| 110401 | 龟甲护手 | Glove | Rare | /assets/game-icons/equipment/weapon/equipment-110401-weapon-glove.png |
| 110402 | 爆裂护手 | Glove | Rare | /assets/game-icons/equipment/weapon/equipment-110402-weapon-glove.png |
| 110403 | Glass Knuckles | Glove | Rare | /assets/game-icons/equipment/weapon/equipment-110403-weapon-glove.png |
| 110404 | 涅槃护手 | Glove | Rare | /assets/game-icons/equipment/weapon/equipment-110404-weapon-glove.png |
| 110405 | 寸拳 | Glove | Epic | /assets/game-icons/equipment/weapon/equipment-110405-weapon-glove.png |
| 110406 | 圣拳 | Glove | Epic | /assets/game-icons/equipment/weapon/equipment-110406-weapon-glove.png |
| 110407 | 血翼指虎 | Glove | Epic | /assets/game-icons/equipment/weapon/equipment-110407-weapon-glove.png |
| 110408 | 霜瓣玉手 | Glove | Epic | /assets/game-icons/equipment/weapon/equipment-110408-weapon-glove.png |
| 110409 | 如来神掌 | Glove | Epic | /assets/game-icons/equipment/weapon/equipment-110409-weapon-glove.png |
| 110410 | 巴西拳套 | Glove | Epic | /assets/game-icons/equipment/weapon/equipment-110410-weapon-glove.png |
| 110411 | 赤手空拳 | Glove | Epic | /assets/game-icons/equipment/weapon/equipment-110411-weapon-glove.png |
| 110412 | 天蚕手套 | Glove | Legend | /assets/game-icons/equipment/weapon/equipment-110412-weapon-glove.png |
| 110501 | 朱雀之纹 | Glove | Legend | /assets/game-icons/equipment/weapon/equipment-110501-weapon-glove.png |
| 110502 | 冻土传说 | Glove | Legend | /assets/game-icons/equipment/weapon/equipment-110502-weapon-glove.png |
| 110503 | 血手 | Glove | Mythic | /assets/game-icons/equipment/weapon/equipment-110503-weapon-glove.png |
| 110504 | 雷霆之握 | Glove | Legend | /assets/game-icons/equipment/weapon/equipment-110504-weapon-glove.png |
| 110701 | 血手 - 绯红 | Glove | Mythic | /assets/game-icons/equipment/weapon/equipment-110701-weapon-glove.png |
| 110702 | 血手 - 晓色 | Glove | Mythic | /assets/game-icons/equipment/weapon/equipment-110702-weapon-glove.png |
| 111201 | 旋棍 | Tonfa | Uncommon | /assets/game-icons/equipment/weapon/equipment-111201-weapon-tonfa.png |
| 111301 | 警棍 | Tonfa | Rare | /assets/game-icons/equipment/weapon/equipment-111301-weapon-tonfa.png |
| 111401 | 琉球旋棍 | Tonfa | Rare | /assets/game-icons/equipment/weapon/equipment-111401-weapon-tonfa.png |
| 111402 | 战术旋棍 | Tonfa | Epic | /assets/game-icons/equipment/weapon/equipment-111402-weapon-tonfa.png |
| 111403 | 泰式拳法 | Tonfa | Epic | /assets/game-icons/equipment/weapon/equipment-111403-weapon-tonfa.png |
| 111404 | 等离子旋棍 | Tonfa | Epic | /assets/game-icons/equipment/weapon/equipment-111404-weapon-tonfa.png |
| 111405 | 风行者 | Tonfa | Legend | /assets/game-icons/equipment/weapon/equipment-111405-weapon-tonfa.png |
| 111406 | 皮质拐 | Tonfa | Epic | /assets/game-icons/equipment/weapon/equipment-111406-weapon-tonfa.png |
| 111501 | 黑曜石双钗 | Tonfa | Legend | /assets/game-icons/equipment/weapon/equipment-111501-weapon-tonfa.png |
| 111502 | 万年寒波 | Tonfa | Legend | /assets/game-icons/equipment/weapon/equipment-111502-weapon-tonfa.png |
| 111503 | 刀刃旋棍 | Tonfa | Mythic | /assets/game-icons/equipment/weapon/equipment-111503-weapon-tonfa.png |
| 111504 | 螳螂旋棍 | Tonfa | Legend | /assets/game-icons/equipment/weapon/equipment-111504-weapon-tonfa.png |
| 111701 | 刀刃旋棍 - 绯红 | Tonfa | Mythic | /assets/game-icons/equipment/weapon/equipment-111701-weapon-tonfa.png |
| 111702 | 刀刃旋棍 - 晓色 | Tonfa | Mythic | /assets/game-icons/equipment/weapon/equipment-111702-weapon-tonfa.png |
| 112105 | 棒球 | HighAngleFire | Common | /assets/game-icons/equipment/weapon/equipment-112105-weapon-high-angle-fire.png |
| 112202 | 手榴弹 | HighAngleFire | Uncommon | /assets/game-icons/equipment/weapon/equipment-112202-weapon-high-angle-fire.png |
| 112203 | Molotov Cocktail | HighAngleFire | Uncommon | /assets/game-icons/equipment/weapon/equipment-112203-weapon-high-angle-fire.png |
| 112204 | 吊索 | HighAngleFire | Rare | /assets/game-icons/equipment/weapon/equipment-112204-weapon-high-angle-fire.png |
| 112205 | 签名球 | HighAngleFire | Uncommon | /assets/game-icons/equipment/weapon/equipment-112205-weapon-high-angle-fire.png |
| 112301 | 粉尘弹 | HighAngleFire | Rare | /assets/game-icons/equipment/weapon/equipment-112301-weapon-high-angle-fire.png |
| 112302 | 燃烧弹 | HighAngleFire | Epic | /assets/game-icons/equipment/weapon/equipment-112302-weapon-high-angle-fire.png |
| 112303 | 闪电球 | HighAngleFire | Rare | /assets/game-icons/equipment/weapon/equipment-112303-weapon-high-angle-fire.png |
| 112304 | 胶球 | HighAngleFire | Rare | /assets/game-icons/equipment/weapon/equipment-112304-weapon-high-angle-fire.png |
| 112305 | High Explosive Grenade | HighAngleFire | Rare | /assets/game-icons/equipment/weapon/equipment-112305-weapon-high-angle-fire.png |
| 112306 | 罗马重标枪 | HighAngleFire | Uncommon | /assets/game-icons/equipment/weapon/equipment-112306-weapon-high-angle-fire.png |
| 112401 | 大卫的弹弓 | HighAngleFire | Epic | /assets/game-icons/equipment/weapon/equipment-112401-weapon-high-angle-fire.png |
| 112402 | 烟雾弹 | HighAngleFire | Epic | /assets/game-icons/equipment/weapon/equipment-112402-weapon-high-angle-fire.png |
| 112403 | 尖刺弹力球 | HighAngleFire | Rare | /assets/game-icons/equipment/weapon/equipment-112403-weapon-high-angle-fire.png |
| 112404 | 安提奥克的手榴弹 | HighAngleFire | Legend | /assets/game-icons/equipment/weapon/equipment-112404-weapon-high-angle-fire.png |
| 112405 | 火球 | HighAngleFire | Legend | /assets/game-icons/equipment/weapon/equipment-112405-weapon-high-angle-fire.png |
| 112406 | 魔导棱镜 | HighAngleFire | Legend | /assets/game-icons/equipment/weapon/equipment-112406-weapon-high-angle-fire.png |
| 112407 | 阿斯特拉普 | HighAngleFire | Legend | /assets/game-icons/equipment/weapon/equipment-112407-weapon-high-angle-fire.png |
| 112408 | 粘性炸弹 | HighAngleFire | Epic | /assets/game-icons/equipment/weapon/equipment-112408-weapon-high-angle-fire.png |
| 112501 | 钌珠 | HighAngleFire | Epic | /assets/game-icons/equipment/weapon/equipment-112501-weapon-high-angle-fire.png |
| 112502 | 如意珠 | HighAngleFire | Legend | /assets/game-icons/equipment/weapon/equipment-112502-weapon-high-angle-fire.png |
| 112503 | 追猎者 | HighAngleFire | Mythic | /assets/game-icons/equipment/weapon/equipment-112503-weapon-high-angle-fire.png |
| 112701 | 追猎者 - 绯红 | HighAngleFire | Mythic | /assets/game-icons/equipment/weapon/equipment-112701-weapon-high-angle-fire.png |
| 112702 | 追猎者 - 晓色 | HighAngleFire | Mythic | /assets/game-icons/equipment/weapon/equipment-112702-weapon-high-angle-fire.png |
| 113101 | 剃刀 | DirectFire | Common | /assets/game-icons/equipment/weapon/equipment-113101-weapon-direct-fire.png |
| 113201 | 飞镖 | DirectFire | Uncommon | /assets/game-icons/equipment/weapon/equipment-113201-weapon-direct-fire.png |
| 113202 | 符咒 | DirectFire | Rare | /assets/game-icons/equipment/weapon/equipment-113202-weapon-direct-fire.png |
| 113203 | 复古扑克 | DirectFire | Uncommon | /assets/game-icons/equipment/weapon/equipment-113203-weapon-direct-fire.png |
| 113205 | 流星镖 | DirectFire | Uncommon | /assets/game-icons/equipment/weapon/equipment-113205-weapon-direct-fire.png |
| 113206 | 玛瑙飞刀 | DirectFire | Uncommon | /assets/game-icons/equipment/weapon/equipment-113206-weapon-direct-fire.png |
| 113207 | Apricot Flower Tag | DirectFire | Rare | /assets/game-icons/equipment/weapon/equipment-113207-weapon-direct-fire.png |
| 113301 | 轮刃 | DirectFire | Rare | /assets/game-icons/equipment/weapon/equipment-113301-weapon-direct-fire.png |
| 113302 | 柳叶飞刀 | DirectFire | Rare | /assets/game-icons/equipment/weapon/equipment-113302-weapon-direct-fire.png |
| 113401 | 疯子国王的卡片 | DirectFire | Epic | /assets/game-icons/equipment/weapon/equipment-113401-weapon-direct-fire.png |
| 113402 | Venom Dart | DirectFire | Rare | /assets/game-icons/equipment/weapon/equipment-113402-weapon-direct-fire.png |
| 113403 | Dharma Chakram | DirectFire | Rare | /assets/game-icons/equipment/weapon/equipment-113403-weapon-direct-fire.png |
| 113404 | 普拉巴塔标枪 | DirectFire | Rare | /assets/game-icons/equipment/weapon/equipment-113404-weapon-direct-fire.png |
| 113405 | 翡翠秘符 | DirectFire | Epic | /assets/game-icons/equipment/weapon/equipment-113405-weapon-direct-fire.png |
| 113406 | 风魔手里剑 | DirectFire | Epic | /assets/game-icons/equipment/weapon/equipment-113406-weapon-direct-fire.png |
| 113408 | 冰魄银针 | DirectFire | Legend | /assets/game-icons/equipment/weapon/equipment-113408-weapon-direct-fire.png |
| 113409 | 蔚蓝匕首 | DirectFire | Epic | /assets/game-icons/equipment/weapon/equipment-113409-weapon-direct-fire.png |
| 113410 | 飞镖弹 | DirectFire | Epic | /assets/game-icons/equipment/weapon/equipment-113410-weapon-direct-fire.png |
| 113411 | 乾坤圈 | DirectFire | Legend | /assets/game-icons/equipment/weapon/equipment-113411-weapon-direct-fire.png |
| 113412 | 亡者之符 | DirectFire | Legend | /assets/game-icons/equipment/weapon/equipment-113412-weapon-direct-fire.png |
| 113501 | 妙见神轮 | DirectFire | Legend | /assets/game-icons/equipment/weapon/equipment-113501-weapon-direct-fire.png |
| 113502 | 满天花雨 | DirectFire | Legend | /assets/game-icons/equipment/weapon/equipment-113502-weapon-direct-fire.png |
| 113503 | 黑莲手里剑 | DirectFire | Mythic | /assets/game-icons/equipment/weapon/equipment-113503-weapon-direct-fire.png |
| 113701 | 黑莲手里剑 - 绯红 | DirectFire | Mythic | /assets/game-icons/equipment/weapon/equipment-113701-weapon-direct-fire.png |
| 113702 | 黑莲手里剑 - 晓色 | DirectFire | Mythic | /assets/game-icons/equipment/weapon/equipment-113702-weapon-direct-fire.png |
| 114101 | 弓 | Bow | Common | /assets/game-icons/equipment/weapon/equipment-114101-weapon-bow.png |
| 114201 | 木弓 | Bow | Uncommon | /assets/game-icons/equipment/weapon/equipment-114201-weapon-bow.png |
| 114202 | 长弓 | Bow | Uncommon | /assets/game-icons/equipment/weapon/equipment-114202-weapon-bow.png |
| 114203 | 复合弓 | Bow | Rare | /assets/game-icons/equipment/weapon/equipment-114203-weapon-bow.png |
| 114301 | 重弓 | Bow | Rare | /assets/game-icons/equipment/weapon/equipment-114301-weapon-bow.png |
| 114302 | 松武弓 | Bow | Rare | /assets/game-icons/equipment/weapon/equipment-114302-weapon-bow.png |
| 114303 | 暗杀特弓 | Bow | Rare | /assets/game-icons/equipment/weapon/equipment-114303-weapon-bow.png |
| 114304 | Pellet Bow | Bow | Rare | /assets/game-icons/equipment/weapon/equipment-114304-weapon-bow.png |
| 114401 | 片箭 | Bow | Epic | /assets/game-icons/equipment/weapon/equipment-114401-weapon-bow.png |
| 114402 | 火矢弓 | Bow | Rare | /assets/game-icons/equipment/weapon/equipment-114402-weapon-bow.png |
| 114403 | 黄金之弓 | Bow | Epic | /assets/game-icons/equipment/weapon/equipment-114403-weapon-bow.png |
| 114405 | 双子杀 | Bow | Epic | /assets/game-icons/equipment/weapon/equipment-114405-weapon-bow.png |
| 114406 | 哲别之弓 | Bow | Epic | /assets/game-icons/equipment/weapon/equipment-114406-weapon-bow.png |
| 114407 | 阿提米丝 | Bow | Legend | /assets/game-icons/equipment/weapon/equipment-114407-weapon-bow.png |
| 114501 | 元素灵弓 | Bow | Epic | /assets/game-icons/equipment/weapon/equipment-114501-weapon-bow.png |
| 114502 | 血之刻印 | Bow | Mythic | /assets/game-icons/equipment/weapon/equipment-114502-weapon-bow.png |
| 114503 | 阿耳古洛托克索斯 | Bow | Legend | /assets/game-icons/equipment/weapon/equipment-114503-weapon-bow.png |
| 114504 | 赤弓白矢 | Bow | Legend | /assets/game-icons/equipment/weapon/equipment-114504-weapon-bow.png |
| 114505 | 猎鹰 | Bow | Legend | /assets/game-icons/equipment/weapon/equipment-114505-weapon-bow.png |
| 114701 | 血之刻印 - 绯红 | Bow | Mythic | /assets/game-icons/equipment/weapon/equipment-114701-weapon-bow.png |
| 114702 | 血之刻印 - 晓色 | Bow | Mythic | /assets/game-icons/equipment/weapon/equipment-114702-weapon-bow.png |
| 115101 | 短弩 | CrossBow | Common | /assets/game-icons/equipment/weapon/equipment-115101-weapon-cross-bow.png |
| 115201 | 长弩 | CrossBow | Uncommon | /assets/game-icons/equipment/weapon/equipment-115201-weapon-cross-bow.png |
| 115202 | 十字弩 | CrossBow | Uncommon | /assets/game-icons/equipment/weapon/equipment-115202-weapon-cross-bow.png |
| 115301 | Power Crossbow | CrossBow | Rare | /assets/game-icons/equipment/weapon/equipment-115301-weapon-cross-bow.png |
| 115302 | 激光弩 | CrossBow | Rare | /assets/game-icons/equipment/weapon/equipment-115302-weapon-cross-bow.png |
| 115303 | 重弩 | CrossBow | Rare | /assets/game-icons/equipment/weapon/equipment-115303-weapon-cross-bow.png |
| 115401 | 钢弩 | CrossBow | Rare | /assets/game-icons/equipment/weapon/equipment-115401-weapon-cross-bow.png |
| 115402 | 大将灵魂 | CrossBow | Epic | /assets/game-icons/equipment/weapon/equipment-115402-weapon-cross-bow.png |
| 115403 | 诸葛连弩 | CrossBow | Epic | /assets/game-icons/equipment/weapon/equipment-115403-weapon-cross-bow.png |
| 115404 | 狙击弩 | CrossBow | Epic | /assets/game-icons/equipment/weapon/equipment-115404-weapon-cross-bow.png |
| 115405 | 灵光金龟神机弩 | CrossBow | Legend | /assets/game-icons/equipment/weapon/equipment-115405-weapon-cross-bow.png |
| 115406 | 十字毒弩 | CrossBow | Epic | /assets/game-icons/equipment/weapon/equipment-115406-weapon-cross-bow.png |
| 115501 | 沙兰加 | CrossBow | Legend | /assets/game-icons/equipment/weapon/equipment-115501-weapon-cross-bow.png |
| 115502 | 血色弦月 | CrossBow | Mythic | /assets/game-icons/equipment/weapon/equipment-115502-weapon-cross-bow.png |
| 115503 | 狂澜 | CrossBow | Legend | /assets/game-icons/equipment/weapon/equipment-115503-weapon-cross-bow.png |
| 115504 | 幻影之矢 | CrossBow | Legend | /assets/game-icons/equipment/weapon/equipment-115504-weapon-cross-bow.png |
| 115701 | 血色弦月 - 绯红 | CrossBow | Mythic | /assets/game-icons/equipment/weapon/equipment-115701-weapon-cross-bow.png |
| 115702 | 血色弦月 - 晓色 | CrossBow | Mythic | /assets/game-icons/equipment/weapon/equipment-115702-weapon-cross-bow.png |
| 116101 | 瓦尔特PPK | Pistol | Common | /assets/game-icons/equipment/weapon/equipment-116101-weapon-pistol.png |
| 116201 | 马格努恩·蟒蛇 | Pistol | Uncommon | /assets/game-icons/equipment/weapon/equipment-116201-weapon-pistol.png |
| 116202 | 伯莱塔M92F | Pistol | Uncommon | /assets/game-icons/equipment/weapon/equipment-116202-weapon-pistol.png |
| 116301 | FN57 | Pistol | Rare | /assets/game-icons/equipment/weapon/equipment-116301-weapon-pistol.png |
| 116401 | Double Revolver SP | Pistol | Rare | /assets/game-icons/equipment/weapon/equipment-116401-weapon-pistol.png |
| 116402 | 马格努恩·巨蟒 | Pistol | Rare | /assets/game-icons/equipment/weapon/equipment-116402-weapon-pistol.png |
| 116403 | 魔弹射手 | Pistol | Legend | /assets/game-icons/equipment/weapon/equipment-116403-weapon-pistol.png |
| 116404 | 优雅者之枪 | Pistol | Epic | /assets/game-icons/equipment/weapon/equipment-116404-weapon-pistol.png |
| 116405 | 电子光束枪 | Pistol | Epic | /assets/game-icons/equipment/weapon/equipment-116405-weapon-pistol.png |
| 116406 | 马格农·博亚 | Pistol | Epic | /assets/game-icons/equipment/weapon/equipment-116406-weapon-pistol.png |
| 116407 | 格洛克 48 | Pistol | Epic | /assets/game-icons/equipment/weapon/equipment-116407-weapon-pistol.png |
| 116408 | 德林加手枪 | Pistol | Rare | /assets/game-icons/equipment/weapon/equipment-116408-weapon-pistol.png |
| 116409 | 史坦普特 | Pistol | Epic | /assets/game-icons/equipment/weapon/equipment-116409-weapon-pistol.png |
| 116410 | 等离子枪 | Pistol | Legend | /assets/game-icons/equipment/weapon/equipment-116410-weapon-pistol.png |
| 116501 | 凯尔特 | Pistol | Legend | /assets/game-icons/equipment/weapon/equipment-116501-weapon-pistol.png |
| 116502 | 牵牛星 | Pistol | Legend | /assets/game-icons/equipment/weapon/equipment-116502-weapon-pistol.png |
| 116503 | 正午 | Pistol | Mythic | /assets/game-icons/equipment/weapon/equipment-116503-weapon-pistol.png |
| 116701 | 正午 - 绯红 | Pistol | Mythic | /assets/game-icons/equipment/weapon/equipment-116701-weapon-pistol.png |
| 116702 | 正午 - 晓色 | Pistol | Mythic | /assets/game-icons/equipment/weapon/equipment-116702-weapon-pistol.png |
| 117101 | 费德洛夫自动步枪 | AssaultRifle | Common | /assets/game-icons/equipment/weapon/equipment-117101-weapon-assault-rifle.png |
| 117201 | STG-44 | AssaultRifle | Uncommon | /assets/game-icons/equipment/weapon/equipment-117201-weapon-assault-rifle.png |
| 117301 | AK-47 | AssaultRifle | Rare | /assets/game-icons/equipment/weapon/equipment-117301-weapon-assault-rifle.png |
| 117401 | M16A1 | AssaultRifle | Uncommon | /assets/game-icons/equipment/weapon/equipment-117401-weapon-assault-rifle.png |
| 117402 | 加特林机枪 | AssaultRifle | Uncommon | /assets/game-icons/equipment/weapon/equipment-117402-weapon-assault-rifle.png |
| 117403 | 95式自动步枪 | AssaultRifle | Epic | /assets/game-icons/equipment/weapon/equipment-117403-weapon-assault-rifle.png |
| 117404 | AK-12 | AssaultRifle | Epic | /assets/game-icons/equipment/weapon/equipment-117404-weapon-assault-rifle.png |
| 117405 | XCR | AssaultRifle | Epic | /assets/game-icons/equipment/weapon/equipment-117405-weapon-assault-rifle.png |
| 117406 | 极地加农炮 | AssaultRifle | Legend | /assets/game-icons/equipment/weapon/equipment-117406-weapon-assault-rifle.png |
| 117407 | 黄金加特林 | AssaultRifle | Epic | /assets/game-icons/equipment/weapon/equipment-117407-weapon-assault-rifle.png |
| 117501 | 阿耆尼 | AssaultRifle | Epic | /assets/game-icons/equipment/weapon/equipment-117501-weapon-assault-rifle.png |
| 117502 | 彼岸花 | AssaultRifle | Legend | /assets/game-icons/equipment/weapon/equipment-117502-weapon-assault-rifle.png |
| 117503 | 地狱之火 | AssaultRifle | Mythic | /assets/game-icons/equipment/weapon/equipment-117503-weapon-assault-rifle.png |
| 117504 | 征服者AX | AssaultRifle | Legend | /assets/game-icons/equipment/weapon/equipment-117504-weapon-assault-rifle.png |
| 117505 | 女武神 | AssaultRifle | Legend | /assets/game-icons/equipment/weapon/equipment-117505-weapon-assault-rifle.png |
| 117701 | 地狱之火 - 绯红 | AssaultRifle | Mythic | /assets/game-icons/equipment/weapon/equipment-117701-weapon-assault-rifle.png |
| 117702 | 地狱之火 - 晓色 | AssaultRifle | Mythic | /assets/game-icons/equipment/weapon/equipment-117702-weapon-assault-rifle.png |
| 118101 | 长步枪 | SniperRifle | Common | /assets/game-icons/equipment/weapon/equipment-118101-weapon-sniper-rifle.png |
| 118201 | 斯普林菲尔德 | SniperRifle | Uncommon | /assets/game-icons/equipment/weapon/equipment-118201-weapon-sniper-rifle.png |
| 118301 | 鱼叉枪 | SniperRifle | Rare | /assets/game-icons/equipment/weapon/equipment-118301-weapon-sniper-rifle.png |
| 118401 | 黄金步枪 | SniperRifle | Uncommon | /assets/game-icons/equipment/weapon/equipment-118401-weapon-sniper-rifle.png |
| 118402 | 电磁轨道枪 | SniperRifle | Rare | /assets/game-icons/equipment/weapon/equipment-118402-weapon-sniper-rifle.png |
| 118403 | Tac-50 | SniperRifle | Epic | /assets/game-icons/equipment/weapon/equipment-118403-weapon-sniper-rifle.png |
| 118404 | 夜行 | SniperRifle | Legend | /assets/game-icons/equipment/weapon/equipment-118404-weapon-sniper-rifle.png |
| 118405 | NTW-20 | SniperRifle | Epic | /assets/game-icons/equipment/weapon/equipment-118405-weapon-sniper-rifle.png |
| 118406 | 北极星 | SniperRifle | Epic | /assets/game-icons/equipment/weapon/equipment-118406-weapon-sniper-rifle.png |
| 118407 | 高斯来福 | SniperRifle | Epic | /assets/game-icons/equipment/weapon/equipment-118407-weapon-sniper-rifle.png |
| 118501 | 四射星光 | SniperRifle | Legend | /assets/game-icons/equipment/weapon/equipment-118501-weapon-sniper-rifle.png |
| 118502 | 霹雳火炮 | SniperRifle | Legend | /assets/game-icons/equipment/weapon/equipment-118502-weapon-sniper-rifle.png |
| 118503 | 仙女座 | SniperRifle | Legend | /assets/game-icons/equipment/weapon/equipment-118503-weapon-sniper-rifle.png |
| 118504 | 寡妇制造者 | SniperRifle | Mythic | /assets/game-icons/equipment/weapon/equipment-118504-weapon-sniper-rifle.png |
| 118505 | 死亡之眼 | SniperRifle | Legend | /assets/game-icons/equipment/weapon/equipment-118505-weapon-sniper-rifle.png |
| 118701 | 寡妇制造者 - 绯红 | SniperRifle | Mythic | /assets/game-icons/equipment/weapon/equipment-118701-weapon-sniper-rifle.png |
| 118702 | 寡妇制造者 - 晓色 | SniperRifle | Mythic | /assets/game-icons/equipment/weapon/equipment-118702-weapon-sniper-rifle.png |
| 119101 | 钢链 | Nunchaku | Common | /assets/game-icons/equipment/weapon/equipment-119101-weapon-nunchaku.png |
| 119201 | 双棍 | Nunchaku | Uncommon | /assets/game-icons/equipment/weapon/equipment-119201-weapon-nunchaku.png |
| 119301 | 赌棍 | Nunchaku | Epic | /assets/game-icons/equipment/weapon/equipment-119301-weapon-nunchaku.png |
| 119302 | 饲养员 | Nunchaku | Rare | /assets/game-icons/equipment/weapon/equipment-119302-weapon-nunchaku.png |
| 119401 | 大小盘龙棍 | Nunchaku | Epic | /assets/game-icons/equipment/weapon/equipment-119401-weapon-nunchaku.png |
| 119402 | 超级震动双节棍 | Nunchaku | Epic | /assets/game-icons/equipment/weapon/equipment-119402-weapon-nunchaku.png |
| 119403 | 刻耳柏洛斯 | Nunchaku | Legend | /assets/game-icons/equipment/weapon/equipment-119403-weapon-nunchaku.png |
| 119404 | Blue 3 | Nunchaku | Epic | /assets/game-icons/equipment/weapon/equipment-119404-weapon-nunchaku.png |
| 119501 | 九头蛇 | Nunchaku | Mythic | /assets/game-icons/equipment/weapon/equipment-119501-weapon-nunchaku.png |
| 119502 | 比翼连理 | Nunchaku | Legend | /assets/game-icons/equipment/weapon/equipment-119502-weapon-nunchaku.png |
| 119503 | 革律翁 | Nunchaku | Legend | /assets/game-icons/equipment/weapon/equipment-119503-weapon-nunchaku.png |
| 119504 | 霓虹锁链 | Nunchaku | Legend | /assets/game-icons/equipment/weapon/equipment-119504-weapon-nunchaku.png |
| 119701 | 九头蛇 - 绯红 | Nunchaku | Mythic | /assets/game-icons/equipment/weapon/equipment-119701-weapon-nunchaku.png |
| 119702 | 九头蛇 - 晓色 | Nunchaku | Mythic | /assets/game-icons/equipment/weapon/equipment-119702-weapon-nunchaku.png |
| 120101 | 针 | Rapier | Common | /assets/game-icons/equipment/weapon/equipment-120101-weapon-rapier.png |
| 120201 | 刺剑 | Rapier | Uncommon | /assets/game-icons/equipment/weapon/equipment-120201-weapon-rapier.png |
| 120301 | 春日 | Rapier | Rare | /assets/game-icons/equipment/weapon/equipment-120301-weapon-rapier.png |
| 120302 | 正义之剑 | Rapier | Epic | /assets/game-icons/equipment/weapon/equipment-120302-weapon-rapier.png |
| 120303 | 穿甲剑 | Rapier | Rare | /assets/game-icons/equipment/weapon/equipment-120303-weapon-rapier.png |
| 120401 | 杜伦德尔MK2 | Rapier | Epic | /assets/game-icons/equipment/weapon/equipment-120401-weapon-rapier.png |
| 120402 | 米斯特汀 | Rapier | Legend | /assets/game-icons/equipment/weapon/equipment-120402-weapon-rapier.png |
| 120403 | 带电短刀 | Rapier | Epic | /assets/game-icons/equipment/weapon/equipment-120403-weapon-rapier.png |
| 120404 | 陨星重剑 | Rapier | Legend | /assets/game-icons/equipment/weapon/equipment-120404-weapon-rapier.png |
| 120405 | 咎瓦尤斯 | Rapier | Legend | /assets/game-icons/equipment/weapon/equipment-120405-weapon-rapier.png |
| 120406 | 赤豹 | Rapier | Epic | /assets/game-icons/equipment/weapon/equipment-120406-weapon-rapier.png |
| 120407 | 阿斯卡普里 | Rapier | Epic | /assets/game-icons/equipment/weapon/equipment-120407-weapon-rapier.png |
| 120408 | 焰形剑 | Rapier | Epic | /assets/game-icons/equipment/weapon/equipment-120408-weapon-rapier.png |
| 120501 | 阿戈斯之眼 | Rapier | Legend | /assets/game-icons/equipment/weapon/equipment-120501-weapon-rapier.png |
| 120502 | 诺斯费拉图 | Rapier | Mythic | /assets/game-icons/equipment/weapon/equipment-120502-weapon-rapier.png |
| 120503 | 螺魂剑 | Rapier | Legend | /assets/game-icons/equipment/weapon/equipment-120503-weapon-rapier.png |
| 120701 | 诺斯费拉图 - 绯红 | Rapier | Mythic | /assets/game-icons/equipment/weapon/equipment-120701-weapon-rapier.png |
| 120702 | 诺斯费拉图 - 晓色 | Rapier | Mythic | /assets/game-icons/equipment/weapon/equipment-120702-weapon-rapier.png |
| 121101 | 红心 | Guitar | Common | /assets/game-icons/equipment/weapon/equipment-121101-weapon-guitar.png |
| 121201 | 黄金琴桥 | Guitar | Uncommon | /assets/game-icons/equipment/weapon/equipment-121201-weapon-guitar.png |
| 121202 | 单线圈拾音器电吉他 | Guitar | Uncommon | /assets/game-icons/equipment/weapon/equipment-121202-weapon-guitar.png |
| 121301 | 红宝石特别版 | Guitar | Rare | /assets/game-icons/equipment/weapon/equipment-121301-weapon-guitar.png |
| 121302 | 双线圈拾音器电吉他 | Guitar | Rare | /assets/game-icons/equipment/weapon/equipment-121302-weapon-guitar.png |
| 121303 | King-V | Guitar | Rare | /assets/game-icons/equipment/weapon/equipment-121303-weapon-guitar.png |
| 121304 | 诺卡斯特 | Guitar | Rare | /assets/game-icons/equipment/weapon/equipment-121304-weapon-guitar.png |
| 121305 | 金属复古吉他 | Guitar | Rare | /assets/game-icons/equipment/weapon/equipment-121305-weapon-guitar.png |
| 121306 | 野马 | Guitar | Rare | /assets/game-icons/equipment/weapon/equipment-121306-weapon-guitar.png |
| 121401 | 波希米亚 | Guitar | Epic | /assets/game-icons/equipment/weapon/equipment-121401-weapon-guitar.png |
| 121402 | 天国的阶梯 | Guitar | Epic | /assets/game-icons/equipment/weapon/equipment-121402-weapon-guitar.png |
| 121403 | 紫色团雾 | Guitar | Epic | /assets/game-icons/equipment/weapon/equipment-121403-weapon-guitar.png |
| 121404 | 乐事 | Guitar | Epic | /assets/game-icons/equipment/weapon/equipment-121404-weapon-guitar.png |
| 121405 | 绝色之夜 | Guitar | Legend | /assets/game-icons/equipment/weapon/equipment-121405-weapon-guitar.png |
| 121406 | 红砖 | Guitar | Epic | /assets/game-icons/equipment/weapon/equipment-121406-weapon-guitar.png |
| 121407 | 少年魂 | Guitar | Epic | /assets/game-icons/equipment/weapon/equipment-121407-weapon-guitar.png |
| 121501 | Cpt. Pepper | Guitar | Legend | /assets/game-icons/equipment/weapon/equipment-121501-weapon-guitar.png |
| 121502 | 负心人 | Guitar | Mythic | /assets/game-icons/equipment/weapon/equipment-121502-weapon-guitar.png |
| 121503 | 天堂之门 | Guitar | Legend | /assets/game-icons/equipment/weapon/equipment-121503-weapon-guitar.png |
| 121504 | 自由之翼 | Guitar | Legend | /assets/game-icons/equipment/weapon/equipment-121504-weapon-guitar.png |
| 121701 | 负心人 - 绯红 | Guitar | Mythic | /assets/game-icons/equipment/weapon/equipment-121701-weapon-guitar.png |
| 121702 | 负心人 - 晓色 | Guitar | Mythic | /assets/game-icons/equipment/weapon/equipment-121702-weapon-guitar.png |
| 122101 | 镜头 | Camera | Common | /assets/game-icons/equipment/weapon/equipment-122101-weapon-camera.png |
| 122201 | 摄影枪 | Camera | Rare | /assets/game-icons/equipment/weapon/equipment-122201-weapon-camera.png |
| 122301 | 袖珍相机 | Camera | Rare | /assets/game-icons/equipment/weapon/equipment-122301-weapon-camera.png |
| 122302 | 测距仪 | Camera | Uncommon | /assets/game-icons/equipment/weapon/equipment-122302-weapon-camera.png |
| 122303 | 步枪式相机 | Camera | Uncommon | /assets/game-icons/equipment/weapon/equipment-122303-weapon-camera.png |
| 122401 | 复古相机 | Camera | Epic | /assets/game-icons/equipment/weapon/equipment-122401-weapon-camera.png |
| 122402 | 全息瞄准镜 | Camera | Epic | /assets/game-icons/equipment/weapon/equipment-122402-weapon-camera.png |
| 122403 | 高倍望远大炮 | Camera | Legend | /assets/game-icons/equipment/weapon/equipment-122403-weapon-camera.png |
| 122404 | V.I.C.G | Camera | Epic | /assets/game-icons/equipment/weapon/equipment-122404-weapon-camera.png |
| 122405 | 拍立得 | Camera | Epic | /assets/game-icons/equipment/weapon/equipment-122405-weapon-camera.png |
| 122501 | 超感相机 | Camera | Legend | /assets/game-icons/equipment/weapon/equipment-122501-weapon-camera.png |
| 122502 | 灵视相机 | Camera | Mythic | /assets/game-icons/equipment/weapon/equipment-122502-weapon-camera.png |
| 122503 | On Air | Camera | Legend | /assets/game-icons/equipment/weapon/equipment-122503-weapon-camera.png |
| 122504 | 三重聚焦相机 | Camera | Legend | /assets/game-icons/equipment/weapon/equipment-122504-weapon-camera.png |
| 122701 | 灵视相机 - 绯红 | Camera | Mythic | /assets/game-icons/equipment/weapon/equipment-122701-weapon-camera.png |
| 122702 | 灵视相机 - 晓色 | Camera | Mythic | /assets/game-icons/equipment/weapon/equipment-122702-weapon-camera.png |
| 130101 | 琉璃球 | Arcana | Common | /assets/game-icons/equipment/weapon/equipment-130101-weapon-arcana.png |
| 130201 | 镜面球 | Arcana | Uncommon | /assets/game-icons/equipment/weapon/equipment-130201-weapon-arcana.png |
| 130202 | 冰晶球 | Arcana | Uncommon | /assets/game-icons/equipment/weapon/equipment-130202-weapon-arcana.png |
| 130301 | 意志权杖 | Arcana | Rare | /assets/game-icons/equipment/weapon/equipment-130301-weapon-arcana.png |
| 130302 | 圣杯 - 感情 | Arcana | Rare | /assets/game-icons/equipment/weapon/equipment-130302-weapon-arcana.png |
| 130303 | 理性之刃 | Arcana | Rare | /assets/game-icons/equipment/weapon/equipment-130303-weapon-arcana.png |
| 130304 | 五芒星碎片 | Arcana | Rare | /assets/game-icons/equipment/weapon/equipment-130304-weapon-arcana.png |
| 130401 | 隐遁者 | Arcana | Epic | /assets/game-icons/equipment/weapon/equipment-130401-weapon-arcana.png |
| 130402 | 命运之轮 | Arcana | Epic | /assets/game-icons/equipment/weapon/equipment-130402-weapon-arcana.png |
| 130403 | 圣杯 - 节制 | Arcana | Epic | /assets/game-icons/equipment/weapon/equipment-130403-weapon-arcana.png |
| 130404 | 五芒星 | Arcana | Epic | /assets/game-icons/equipment/weapon/equipment-130404-weapon-arcana.png |
| 130405 | 月水晶 | Arcana | Legend | /assets/game-icons/equipment/weapon/equipment-130405-weapon-arcana.png |
| 130501 | 女帝 | Arcana | Legend | /assets/game-icons/equipment/weapon/equipment-130501-weapon-arcana.png |
| 130502 | 炼狱 | Arcana | Mythic | /assets/game-icons/equipment/weapon/equipment-130502-weapon-arcana.png |
| 130503 | 烈阳 | Arcana | Legend | /assets/game-icons/equipment/weapon/equipment-130503-weapon-arcana.png |
| 130701 | 炼狱 - 绯红 | Arcana | Mythic | /assets/game-icons/equipment/weapon/equipment-130701-weapon-arcana.png |
| 130702 | 炼狱 - 晓色 | Arcana | Mythic | /assets/game-icons/equipment/weapon/equipment-130702-weapon-arcana.png |
| 131101 | 卡德摩斯的召唤Lv2 | VFArm | Uncommon | /assets/game-icons/equipment/weapon/equipment-131101-weapon-vfarm.png |
| 131102 | 卡德摩斯的召唤Lv3 | VFArm | Uncommon | /assets/game-icons/equipment/weapon/equipment-131102-weapon-vfarm.png |
| 131201 | 毒蛇 | VFArm | Uncommon | /assets/game-icons/equipment/weapon/equipment-131201-weapon-vfarm.png |
| 131301 | 南棘蛇 | VFArm | Rare | /assets/game-icons/equipment/weapon/equipment-131301-weapon-vfarm.png |
| 131302 | 黑曼巴蛇 | VFArm | Rare | /assets/game-icons/equipment/weapon/equipment-131302-weapon-vfarm.png |
| 131303 | 响尾蛇 | VFArm | Rare | /assets/game-icons/equipment/weapon/equipment-131303-weapon-vfarm.png |
| 131401 | 女王蛇 | VFArm | Epic | /assets/game-icons/equipment/weapon/equipment-131401-weapon-vfarm.png |
| 131402 | 帝王黑曼巴蛇 | VFArm | Epic | /assets/game-icons/equipment/weapon/equipment-131402-weapon-vfarm.png |
| 131403 | 超级响尾蛇 | VFArm | Epic | /assets/game-icons/equipment/weapon/equipment-131403-weapon-vfarm.png |
| 131501 | 女王蛇 MT | VFArm | Legend | /assets/game-icons/equipment/weapon/equipment-131501-weapon-vfarm.png |
| 131502 | 女王蛇 FC | VFArm | Legend | /assets/game-icons/equipment/weapon/equipment-131502-weapon-vfarm.png |
| 131503 | 女王蛇 VBS | VFArm | Mythic | /assets/game-icons/equipment/weapon/equipment-131503-weapon-vfarm.png |
| 131504 | 帝王黑曼巴蛇 TL | VFArm | Legend | /assets/game-icons/equipment/weapon/equipment-131504-weapon-vfarm.png |
| 131505 | 帝王黑曼巴蛇 FC | VFArm | Legend | /assets/game-icons/equipment/weapon/equipment-131505-weapon-vfarm.png |
| 131506 | 帝王黑曼巴蛇 VBS | VFArm | Mythic | /assets/game-icons/equipment/weapon/equipment-131506-weapon-vfarm.png |
| 131507 | 超级响尾蛇 ML | VFArm | Legend | /assets/game-icons/equipment/weapon/equipment-131507-weapon-vfarm.png |
| 131508 | 超级响尾蛇 FC | VFArm | Legend | /assets/game-icons/equipment/weapon/equipment-131508-weapon-vfarm.png |
| 131509 | 超级响尾蛇 VBS | VFArm | Mythic | /assets/game-icons/equipment/weapon/equipment-131509-weapon-vfarm.png |
| 601501 | 女王蛇 MT | VFArm | Legend | /assets/game-icons/equipment/weapon/equipment-601501-weapon-vfarm.png |
| 601502 | 女王蛇 FC | VFArm | Legend | /assets/game-icons/equipment/weapon/equipment-601502-weapon-vfarm.png |
| 601503 | 女王蛇 VBS | VFArm | Mythic | /assets/game-icons/equipment/weapon/equipment-601503-weapon-vfarm.png |
| 601504 | 帝王黑曼巴蛇 TL | VFArm | Legend | /assets/game-icons/equipment/weapon/equipment-601504-weapon-vfarm.png |
| 601505 | 帝王黑曼巴蛇 FC | VFArm | Legend | /assets/game-icons/equipment/weapon/equipment-601505-weapon-vfarm.png |
| 601506 | 帝王黑曼巴蛇 VBS | VFArm | Mythic | /assets/game-icons/equipment/weapon/equipment-601506-weapon-vfarm.png |
| 601507 | 超级响尾蛇 ML | VFArm | Legend | /assets/game-icons/equipment/weapon/equipment-601507-weapon-vfarm.png |
| 601508 | 超级响尾蛇 FC | VFArm | Legend | /assets/game-icons/equipment/weapon/equipment-601508-weapon-vfarm.png |
| 601509 | 超级响尾蛇 VBS | VFArm | Mythic | /assets/game-icons/equipment/weapon/equipment-601509-weapon-vfarm.png |
| 602409 | 破灭之枝 Mk2 | TwoHandSword | Legend | /assets/game-icons/equipment/weapon/equipment-602409-weapon-two-hand-sword.png |
| 607406 | 火尖枪 Mk2 | Spear | Legend | /assets/game-icons/equipment/weapon/equipment-607406-weapon-spear.png |
| 610501 | 朱雀之纹 Mk2 | Glove | Legend | /assets/game-icons/equipment/weapon/equipment-610501-weapon-glove.png |

### Armor

| id | 名称 | 子类型 | 品级 | 图片 |
| --- | --- | --- | --- | --- |
| 201101 | 发箍 | Head | Common | /assets/game-icons/equipment/armor/equipment-201101-armor-head.png |
| 201102 | 鸭舌帽 | Head | Common | /assets/game-icons/equipment/armor/equipment-201102-armor-head.png |
| 201104 | 自行车头盔 | Head | Common | /assets/game-icons/equipment/armor/equipment-201104-armor-head.png |
| 201111 | 大自然的呼唤 Lv2 | Head | Common | /assets/game-icons/equipment/armor/equipment-201111-armor-head.png |
| 201112 | 大自然的呼唤 Lv3 | Head | Common | /assets/game-icons/equipment/armor/equipment-201112-armor-head.png |
| 201201 | 面具 | Head | Common | /assets/game-icons/equipment/armor/equipment-201201-armor-head.png |
| 201202 | 头环 | Head | Uncommon | /assets/game-icons/equipment/armor/equipment-201202-armor-head.png |
| 201203 | 贝雷帽 | Head | Uncommon | /assets/game-icons/equipment/armor/equipment-201203-armor-head.png |
| 201204 | 锁甲头罩 | Head | Uncommon | /assets/game-icons/equipment/armor/equipment-201204-armor-head.png |
| 201205 | 安全帽 | Head | Uncommon | /assets/game-icons/equipment/armor/equipment-201205-armor-head.png |
| 201206 | 初放的花蕾 | Head | Uncommon | /assets/game-icons/equipment/armor/equipment-201206-armor-head.png |
| 201301 | 防弹头盔 | Head | Rare | /assets/game-icons/equipment/armor/equipment-201301-armor-head.png |
| 201302 | 消防头盔 | Head | Rare | /assets/game-icons/equipment/armor/equipment-201302-armor-head.png |
| 201303 | 头冠 | Head | Rare | /assets/game-icons/equipment/armor/equipment-201303-armor-head.png |
| 201304 | 罗宾帽 | Head | Epic | /assets/game-icons/equipment/armor/equipment-201304-armor-head.png |
| 201305 | 清新的花瓣 | Head | Rare | /assets/game-icons/equipment/armor/equipment-201305-armor-head.png |
| 201401 | 王冠 | Head | Rare | /assets/game-icons/equipment/armor/equipment-201401-armor-head.png |
| 201402 | 闭式头盔 | Head | Rare | /assets/game-icons/equipment/armor/equipment-201402-armor-head.png |
| 201403 | 秘银头盔 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201403-armor-head.png |
| 201404 | 水晶冠 | Head | Epic | /assets/game-icons/equipment/armor/equipment-201404-armor-head.png |
| 201405 | 摩托车头盔 | Head | Epic | /assets/game-icons/equipment/armor/equipment-201405-armor-head.png |
| 201406 | OPS战术头盔 | Head | Epic | /assets/game-icons/equipment/armor/equipment-201406-armor-head.png |
| 201407 | 方旗骑士盔 | Head | Epic | /assets/game-icons/equipment/armor/equipment-201407-armor-head.png |
| 201408 | 月桂冠 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201408-armor-head.png |
| 201409 | 帝国皇冠 | Head | Epic | /assets/game-icons/equipment/armor/equipment-201409-armor-head.png |
| 201410 | 帝国战盔 | Head | Epic | /assets/game-icons/equipment/armor/equipment-201410-armor-head.png |
| 201411 | 脸谱 | Head | Mythic | /assets/game-icons/equipment/armor/equipment-201411-armor-head.png |
| 201412 | 庞克头盔 | Head | Epic | /assets/game-icons/equipment/armor/equipment-201412-armor-head.png |
| 201413 | 战队头盔 | Head | Epic | /assets/game-icons/equipment/armor/equipment-201413-armor-head.png |
| 201414 | 宝石头冠 | Head | Epic | /assets/game-icons/equipment/armor/equipment-201414-armor-head.png |
| 201415 | 圣骑士头盔 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201415-armor-head.png |
| 201416 | 盛开的旋律 | Head | Epic | /assets/game-icons/equipment/armor/equipment-201416-armor-head.png |
| 201417 | 牛仔帽 | Head | Epic | /assets/game-icons/equipment/armor/equipment-201417-armor-head.png |
| 201418 | 等离子头盔 | Head | Epic | /assets/game-icons/equipment/armor/equipment-201418-armor-head.png |
| 201419 | 熔火面甲 | Head | Epic | /assets/game-icons/equipment/armor/equipment-201419-armor-head.png |
| 201420 | 魔女帽 | Head | Epic | /assets/game-icons/equipment/armor/equipment-201420-armor-head.png |
| 201421 | 狐狸假面 | Head | Epic | /assets/game-icons/equipment/armor/equipment-201421-armor-head.png |
| 201422 | 竞速护目镜 | Head | Epic | /assets/game-icons/equipment/armor/equipment-201422-armor-head.png |
| 201423 | 战术护目镜 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201423-armor-head.png |
| 201501 | 天使光环 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201501-armor-head.png |
| 201502 | 圣光冠冕 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201502-armor-head.png |
| 201503 | 幽灵面具 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201503-armor-head.png |
| 201504 | 先知头巾 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201504-armor-head.png |
| 201505 | 赛车头盔 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201505-armor-head.png |
| 201506 | 荒野之星 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201506-armor-head.png |
| 201507 | 太空头盔 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201507-armor-head.png |
| 201508 | 矮人头盔 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201508-armor-head.png |
| 201509 | 暮光头饰 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201509-armor-head.png |
| 201516 | 天籁花冠 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201516-armor-head.png |
| 201517 | 天籁花冠 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201517-armor-head.png |
| 201518 | 夜视头盔 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201518-armor-head.png |
| 201519 | 瘟疫使者 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201519-armor-head.png |
| 201520 | 赛博追踪者 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201520-armor-head.png |
| 201521 | 爆破者头盔 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201521-armor-head.png |
| 201522 | 指挥官 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201522-armor-head.png |
| 201523 | 火花护盾 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201523-armor-head.png |
| 201524 | 魔兔帽 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201524-armor-head.png |
| 201525 | 雷加图斯 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201525-armor-head.png |
| 201526 | En Garde | Head | Legend | /assets/game-icons/equipment/armor/equipment-201526-armor-head.png |
| 201527 | 玄见 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201527-armor-head.png |
| 201528 | 瓦尔哈拉头盔 | Head | Mythic | /assets/game-icons/equipment/armor/equipment-201528-armor-head.png |
| 201529 | 玄瞳头盔 | Head | Mythic | /assets/game-icons/equipment/armor/equipment-201529-armor-head.png |
| 201530 | 戴维德耳机 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201530-armor-head.png |
| 201531 | 水手帽 | Head | Epic | /assets/game-icons/equipment/armor/equipment-201531-armor-head.png |
| 201532 | 舰长礼帽 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201532-armor-head.png |
| 201533 | 暗影面纱 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201533-armor-head.png |
| 201534 | 赤星 | Chest | Mythic | /assets/game-icons/equipment/armor/equipment-201534-armor-chest.png |
| 201535 | 恶魔面具 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201535-armor-head.png |
| 201536 | 白夜王冠 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201536-armor-head.png |
| 201537 | 荒野之饥 | Head | Legend | /assets/game-icons/equipment/armor/equipment-201537-armor-head.png |
| 201701 | 血色王冠 | Head | Mythic | /assets/game-icons/equipment/armor/equipment-201701-armor-head.png |
| 202101 | 防风衣 | Chest | Common | /assets/game-icons/equipment/armor/equipment-202101-armor-chest.png |
| 202103 | 袈裟 | Chest | Common | /assets/game-icons/equipment/armor/equipment-202103-armor-chest.png |
| 202104 | 白大褂 | Chest | Epic | /assets/game-icons/equipment/armor/equipment-202104-armor-chest.png |
| 202105 | 全覆盖式泳衣 | Chest | Common | /assets/game-icons/equipment/armor/equipment-202105-armor-chest.png |
| 202106 | 白衬衫 | Chest | Common | /assets/game-icons/equipment/armor/equipment-202106-armor-chest.png |
| 202201 | 皮甲 | Chest | Uncommon | /assets/game-icons/equipment/armor/equipment-202201-armor-chest.png |
| 202202 | 皮夹克 | Chest | Uncommon | /assets/game-icons/equipment/armor/equipment-202202-armor-chest.png |
| 202203 | Turtle Dobok | Chest | Uncommon | /assets/game-icons/equipment/armor/equipment-202203-armor-chest.png |
| 202205 | 军装 | Chest | Uncommon | /assets/game-icons/equipment/armor/equipment-202205-armor-chest.png |
| 202206 | 补丁长袍 | Chest | Uncommon | /assets/game-icons/equipment/armor/equipment-202206-armor-chest.png |
| 202207 | 连衣裙 | Chest | Uncommon | /assets/game-icons/equipment/armor/equipment-202207-armor-chest.png |
| 202209 | 比基尼 | Chest | Mythic | /assets/game-icons/equipment/armor/equipment-202209-armor-chest.png |
| 202210 | 潜水服 | Chest | Uncommon | /assets/game-icons/equipment/armor/equipment-202210-armor-chest.png |
| 202211 | 祭师法衣 | Chest | Uncommon | /assets/game-icons/equipment/armor/equipment-202211-armor-chest.png |
| 202301 | 骑士夹克 | Chest | Rare | /assets/game-icons/equipment/armor/equipment-202301-armor-chest.png |
| 202302 | 锁甲 | Chest | Rare | /assets/game-icons/equipment/armor/equipment-202302-armor-chest.png |
| 202303 | 西装 | Chest | Rare | /assets/game-icons/equipment/armor/equipment-202303-armor-chest.png |
| 202304 | 旗袍 | Chest | Rare | /assets/game-icons/equipment/armor/equipment-202304-armor-chest.png |
| 202305 | 金属板甲 | Chest | Rare | /assets/game-icons/equipment/armor/equipment-202305-armor-chest.png |
| 202306 | 韩服 | Chest | Rare | /assets/game-icons/equipment/armor/equipment-202306-armor-chest.png |
| 202307 | 主教长袍 | Chest | Epic | /assets/game-icons/equipment/armor/equipment-202307-armor-chest.png |
| 202401 | 防弹背心 | Chest | Rare | /assets/game-icons/equipment/armor/equipment-202401-armor-chest.png |
| 202402 | 余晖之铠 | Chest | Epic | /assets/game-icons/equipment/armor/equipment-202402-armor-chest.png |
| 202404 | 御史衣 | Chest | Epic | /assets/game-icons/equipment/armor/equipment-202404-armor-chest.png |
| 202405 | 光学迷彩服 | Chest | Epic | /assets/game-icons/equipment/armor/equipment-202405-armor-chest.png |
| 202406 | 摇滚乐手夹克 | Chest | Epic | /assets/game-icons/equipment/armor/equipment-202406-armor-chest.png |
| 202407 | 秘银链甲 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202407-armor-chest.png |
| 202408 | 十字军铠甲 | Chest | Epic | /assets/game-icons/equipment/armor/equipment-202408-armor-chest.png |
| 202410 | 亚马逊战甲 | Chest | Epic | /assets/game-icons/equipment/armor/equipment-202410-armor-chest.png |
| 202411 | 龙之道服 | Chest | Epic | /assets/game-icons/equipment/armor/equipment-202411-armor-chest.png |
| 202412 | 指挥官战甲 | Chest | Epic | /assets/game-icons/equipment/armor/equipment-202412-armor-chest.png |
| 202413 | 管家服 | Chest | Epic | /assets/game-icons/equipment/armor/equipment-202413-armor-chest.png |
| 202415 | 骑士战甲 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202415-armor-chest.png |
| 202416 | 星火洋装 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202416-armor-chest.png |
| 202417 | EOD防爆服 | Chest | Epic | /assets/game-icons/equipment/armor/equipment-202417-armor-chest.png |
| 202418 | 无尾礼服 | Chest | Epic | /assets/game-icons/equipment/armor/equipment-202418-armor-chest.png |
| 202419 | 大祭司长袍 | Chest | Epic | /assets/game-icons/equipment/armor/equipment-202419-armor-chest.png |
| 202420 | 太使袍 | Chest | Epic | /assets/game-icons/equipment/armor/equipment-202420-armor-chest.png |
| 202421 | 秘银吊带 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202421-armor-chest.png |
| 202422 | 防火服 | Chest | Epic | /assets/game-icons/equipment/armor/equipment-202422-armor-chest.png |
| 202423 | 校服 | Chest | Epic | /assets/game-icons/equipment/armor/equipment-202423-armor-chest.png |
| 202501 | 日轮之铠 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202501-armor-chest.png |
| 202502 | 红心女王 | Chest | Mythic | /assets/game-icons/equipment/armor/equipment-202502-armor-chest.png |
| 202503 | 神职法衣 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202503-armor-chest.png |
| 202504 | 酒红色西装 | Chest | Mythic | /assets/game-icons/equipment/armor/equipment-202504-armor-chest.png |
| 202505 | 奥黛 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202505-armor-chest.png |
| 202506 | 幽灵战衣 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202506-armor-chest.png |
| 202507 | 监管者套装 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202507-armor-chest.png |
| 202508 | 优雅礼服 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202508-armor-chest.png |
| 202509 | 仙女服 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202509-armor-chest.png |
| 202510 | 魅影 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202510-armor-chest.png |
| 202511 | 血色斗篷 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202511-armor-chest.png |
| 202512 | 缄默法则 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202512-armor-chest.png |
| 202513 | 摇滚外套 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202513-armor-chest.png |
| 202514 | 私人定制 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202514-armor-chest.png |
| 202515 | 战术重甲 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202515-armor-chest.png |
| 202516 | 精灵舞裙 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202516-armor-chest.png |
| 202517 | 泰坦盔甲 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202517-armor-chest.png |
| 202518 | 幽冥战甲 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202518-armor-chest.png |
| 202521 | 赛车服 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202521-armor-chest.png |
| 202522 | 幽灵新娘的嫁纱 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202522-armor-chest.png |
| 202523 | 吉利服 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202523-armor-chest.png |
| 202524 | 幽灵夹克 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202524-armor-chest.png |
| 202525 | 贤者之袍 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202525-armor-chest.png |
| 202526 | 异端审判官 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202526-armor-chest.png |
| 202527 | 黑炎龙铠甲 | Chest | Mythic | /assets/game-icons/equipment/armor/equipment-202527-armor-chest.png |
| 202528 | 羽落 | Head | Mythic | /assets/game-icons/equipment/armor/equipment-202528-armor-head.png |
| 202529 | 火灵装 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202529-armor-chest.png |
| 202530 | 反抗的意志 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-202530-armor-chest.png |
| 203101 | 手表 | Arm | Common | /assets/game-icons/equipment/armor/equipment-203101-armor-arm.png |
| 203102 | 绷带 | Arm | Common | /assets/game-icons/equipment/armor/equipment-203102-armor-arm.png |
| 203104 | 手镯 | Arm | Common | /assets/game-icons/equipment/armor/equipment-203104-armor-arm.png |
| 203201 | 皮盾 | Arm | Uncommon | /assets/game-icons/equipment/armor/equipment-203201-armor-arm.png |
| 203202 | 队长臂章 | Arm | Uncommon | /assets/game-icons/equipment/armor/equipment-203202-armor-arm.png |
| 203203 | 弓护腕 | Arm | Uncommon | /assets/game-icons/equipment/armor/equipment-203203-armor-arm.png |
| 203204 | 破碎的手表 | Arm | Uncommon | /assets/game-icons/equipment/armor/equipment-203204-armor-arm.png |
| 203301 | 刀鞘 | Arm | Rare | /assets/game-icons/equipment/armor/equipment-203301-armor-arm.png |
| 203302 | 金色手镯 | Arm | Rare | /assets/game-icons/equipment/armor/equipment-203302-armor-arm.png |
| 203303 | 护臂 | Arm | Rare | /assets/game-icons/equipment/armor/equipment-203303-armor-arm.png |
| 203304 | 红宝石手链 | Arm | Rare | /assets/game-icons/equipment/armor/equipment-203304-armor-arm.png |
| 203305 | 荆棘手环 | Arm | Rare | /assets/game-icons/equipment/armor/equipment-203305-armor-arm.png |
| 203306 | 巨人手套 | Arm | Epic | /assets/game-icons/equipment/armor/equipment-203306-armor-arm.png |
| 203401 | 钢制手盾 | Arm | Rare | /assets/game-icons/equipment/armor/equipment-203401-armor-arm.png |
| 203402 | 阻刃护臂 | Arm | Epic | /assets/game-icons/equipment/armor/equipment-203402-armor-arm.png |
| 203403 | 德罗普尼尔 | Arm | Epic | /assets/game-icons/equipment/armor/equipment-203403-armor-arm.png |
| 203404 | 秘银盾 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-203404-armor-arm.png |
| 203405 | 生命讯号感测器 | Arm | Epic | /assets/game-icons/equipment/armor/equipment-203405-armor-arm.png |
| 203406 | 骑士信条 | Arm | Epic | /assets/game-icons/equipment/armor/equipment-203406-armor-arm.png |
| 203407 | 沙·贾汗之剑 | Arm | Epic | /assets/game-icons/equipment/armor/equipment-203407-armor-arm.png |
| 203408 | 召唤手表 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-203408-armor-arm.png |
| 203409 | 宙斯盾 | Arm | Epic | /assets/game-icons/equipment/armor/equipment-203409-armor-arm.png |
| 203410 | 廷达罗斯手环 | Arm | Epic | /assets/game-icons/equipment/armor/equipment-203410-armor-arm.png |
| 203411 | 南丁格尔 | Arm | Epic | /assets/game-icons/equipment/armor/equipment-203411-armor-arm.png |
| 203412 | 等离子电盾 | Arm | Epic | /assets/game-icons/equipment/armor/equipment-203412-armor-arm.png |
| 203413 | 银河腕表 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-203413-armor-arm.png |
| 203414 | 智能手环 | Arm | Epic | /assets/game-icons/equipment/armor/equipment-203414-armor-arm.png |
| 203415 | 星魂臂章 | Arm | Epic | /assets/game-icons/equipment/armor/equipment-203415-armor-arm.png |
| 203501 | 斯嘉蒂的手镯 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-203501-armor-arm.png |
| 203502 | 雷达 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-203502-armor-arm.png |
| 203503 | 自动臂 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-203503-armor-arm.png |
| 203504 | 日珥 | Arm | Mythic | /assets/game-icons/equipment/armor/equipment-203504-armor-arm.png |
| 203505 | 蜈蚣护肩 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-203505-armor-arm.png |
| 203506 | 运动手表 | Arm | Epic | /assets/game-icons/equipment/armor/equipment-203506-armor-arm.png |
| 203507 | 廷达罗斯君主 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-203507-armor-arm.png |
| 203508 | 查理曼大盾 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-203508-armor-arm.png |
| 203509 | 血杀龙爪 | Arm | Mythic | /assets/game-icons/equipment/armor/equipment-203509-armor-arm.png |
| 203510 | 龙鳞 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-203510-armor-arm.png |
| 203511 | 荆刺护手 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-203511-armor-arm.png |
| 203512 | 鬼灵之爪 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-203512-armor-arm.png |
| 203513 | 赫利克斯 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-203513-armor-arm.png |
| 203514 | 蓝纹臂章 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-203514-armor-arm.png |
| 203515 | 超星臂章 | Arm | Mythic | /assets/game-icons/equipment/armor/equipment-203515-armor-arm.png |
| 203516 | 法夫纳 | Arm | Mythic | /assets/game-icons/equipment/armor/equipment-203516-armor-arm.png |
| 204101 | 拖鞋 | Leg | Common | /assets/game-icons/equipment/armor/equipment-204101-armor-leg.png |
| 204102 | 跑鞋 | Leg | Common | /assets/game-icons/equipment/armor/equipment-204102-armor-leg.png |
| 204103 | 裤袜 | Leg | Common | /assets/game-icons/equipment/armor/equipment-204103-armor-leg.png |
| 204201 | 护膝 | Leg | Rare | /assets/game-icons/equipment/armor/equipment-204201-armor-leg.png |
| 204202 | 护腿链甲 | Leg | Uncommon | /assets/game-icons/equipment/armor/equipment-204202-armor-leg.png |
| 204203 | 高跟鞋 | Leg | Uncommon | /assets/game-icons/equipment/armor/equipment-204203-armor-leg.png |
| 204204 | 暴走鞋 | Leg | Uncommon | /assets/game-icons/equipment/armor/equipment-204204-armor-leg.png |
| 204205 | 木鞋 | Leg | Common | /assets/game-icons/equipment/armor/equipment-204205-armor-leg.png |
| 204301 | 补丁拖鞋 | Leg | Uncommon | /assets/game-icons/equipment/armor/equipment-204301-armor-leg.png |
| 204302 | 靴子 | Leg | Uncommon | /assets/game-icons/equipment/armor/equipment-204302-armor-leg.png |
| 204303 | 登山鞋 | Leg | Epic | /assets/game-icons/equipment/armor/equipment-204303-armor-leg.png |
| 204304 | 冰爪鞋 | Leg | Epic | /assets/game-icons/equipment/armor/equipment-204304-armor-leg.png |
| 204401 | 钢护膝 | Leg | Epic | /assets/game-icons/equipment/armor/equipment-204401-armor-leg.png |
| 204402 | 羽靴 | Leg | Epic | /assets/game-icons/equipment/armor/equipment-204402-armor-leg.png |
| 204403 | 马弗里克之履 | Leg | Epic | /assets/game-icons/equipment/armor/equipment-204403-armor-leg.png |
| 204404 | 军靴 | Leg | Rare | /assets/game-icons/equipment/armor/equipment-204404-armor-leg.png |
| 204405 | 恨天高 | Leg | Legend | /assets/game-icons/equipment/armor/equipment-204405-armor-leg.png |
| 204406 | 风火轮 | Leg | Epic | /assets/game-icons/equipment/armor/equipment-204406-armor-leg.png |
| 204407 | 秘银靴 | Leg | Legend | /assets/game-icons/equipment/armor/equipment-204407-armor-leg.png |
| 204408 | 布西发拉斯 | Leg | Epic | /assets/game-icons/equipment/armor/equipment-204408-armor-leg.png |
| 204409 | EOD防爆靴 | Leg | Legend | /assets/game-icons/equipment/armor/equipment-204409-armor-leg.png |
| 204410 | 万年冰鞋 | Leg | Legend | /assets/game-icons/equipment/armor/equipment-204410-armor-leg.png |
| 204411 | 白犀牛靴子 | Leg | Epic | /assets/game-icons/equipment/armor/equipment-204411-armor-leg.png |
| 204412 | 超光速次元钢靴 | Leg | Epic | /assets/game-icons/equipment/armor/equipment-204412-armor-leg.png |
| 204413 | 生化推进器 | Leg | Mythic | /assets/game-icons/equipment/armor/equipment-204413-armor-leg.png |
| 204414 | 剑齿虎 | Leg | Legend | /assets/game-icons/equipment/armor/equipment-204414-armor-leg.png |
| 204415 | SCV | Leg | Epic | /assets/game-icons/equipment/armor/equipment-204415-armor-leg.png |
| 204416 | 星河穿梭者 | Leg | Epic | /assets/game-icons/equipment/armor/equipment-204416-armor-leg.png |
| 204417 | 牛仔靴 | Leg | Epic | /assets/game-icons/equipment/armor/equipment-204417-armor-leg.png |
| 204418 | 角斗士 | Leg | Epic | /assets/game-icons/equipment/armor/equipment-204418-armor-leg.png |
| 204419 | 赤影 | Leg | Epic | /assets/game-icons/equipment/armor/equipment-204419-armor-leg.png |
| 204501 | 赫尔墨斯之靴 | Leg | Legend | /assets/game-icons/equipment/armor/equipment-204501-armor-leg.png |
| 204502 | 红鞋 | Leg | Mythic | /assets/game-icons/equipment/armor/equipment-204502-armor-leg.png |
| 204503 | 刀片靴 | Leg | Legend | /assets/game-icons/equipment/armor/equipment-204503-armor-leg.png |
| 204504 | 亚历山大 | Leg | Legend | /assets/game-icons/equipment/armor/equipment-204504-armor-leg.png |
| 204505 | 锋利长靴 | Leg | Legend | /assets/game-icons/equipment/armor/equipment-204505-armor-leg.png |
| 204506 | 荒野行者 | Leg | Legend | /assets/game-icons/equipment/armor/equipment-204506-armor-leg.png |
| 204507 | 银河战靴 | Leg | Legend | /assets/game-icons/equipment/armor/equipment-204507-armor-leg.png |
| 204508 | 幻影行者 | Leg | Legend | /assets/game-icons/equipment/armor/equipment-204508-armor-leg.png |
| 204509 | 赛车靴 | Leg | Legend | /assets/game-icons/equipment/armor/equipment-204509-armor-leg.png |
| 204510 | 艾尔迪安长靴 | Leg | Mythic | /assets/game-icons/equipment/armor/equipment-204510-armor-leg.png |
| 204511 | 蔷薇轻履 | Leg | Mythic | /assets/game-icons/equipment/armor/equipment-204511-armor-leg.png |
| 204512 | 星际战靴 | Leg | Legend | /assets/game-icons/equipment/armor/equipment-204512-armor-leg.png |
| 204513 | 精灵之靴 | Leg | Mythic | /assets/game-icons/equipment/armor/equipment-204513-armor-leg.png |
| 204514 | 战术鞋 | Leg | Legend | /assets/game-icons/equipment/armor/equipment-204514-armor-leg.png |
| 205105 | Fan | Trinket | Common | /assets/game-icons/equipment/armor/equipment-205105-armor-trinket.png |
| 205107 | 纸箱 | Arm | Uncommon | /assets/game-icons/equipment/armor/equipment-205107-armor-arm.png |
| 205201 | 白羽扇 | Arm | Epic | /assets/game-icons/equipment/armor/equipment-205201-armor-arm.png |
| 205205 | Doll | Trinket | Uncommon | /assets/game-icons/equipment/armor/equipment-205205-armor-trinket.png |
| 205210 | Gilded Quill Fan | Trinket | Uncommon | /assets/game-icons/equipment/armor/equipment-205210-armor-trinket.png |
| 205212 | Decorative Flintlock | Trinket | Uncommon | /assets/game-icons/equipment/armor/equipment-205212-armor-trinket.png |
| 205302 | Uchiwa | Trinket | Rare | /assets/game-icons/equipment/armor/equipment-205302-armor-trinket.png |
| 205304 | 骑兵箭筒 | Arm | Epic | /assets/game-icons/equipment/armor/equipment-205304-armor-arm.png |
| 205305 | Revenge of Goujian | Trinket | Rare | /assets/game-icons/equipment/armor/equipment-205305-armor-trinket.png |
| 205306 | 海盗印记 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-205306-armor-arm.png |
| 205307 | Hawkeye | Trinket | Rare | /assets/game-icons/equipment/armor/equipment-205307-armor-trinket.png |
| 205308 | 海盗旗 | Arm | Epic | /assets/game-icons/equipment/armor/equipment-205308-armor-arm.png |
| 205309 | 音乐盒 | Arm | Epic | /assets/game-icons/equipment/armor/equipment-205309-armor-arm.png |
| 205310 | Active Camouflage | Trinket | Rare | /assets/game-icons/equipment/armor/equipment-205310-armor-trinket.png |
| 205311 | Grimoire | Trinket | Rare | /assets/game-icons/equipment/armor/equipment-205311-armor-trinket.png |
| 205313 | Pile Bunker | Trinket | Rare | /assets/game-icons/equipment/armor/equipment-205313-armor-trinket.png |
| 205401 | 皎月吊坠 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-205401-armor-arm.png |
| 205404 | 薛定谔的箱子 | Arm | Epic | /assets/game-icons/equipment/armor/equipment-205404-armor-arm.png |
| 205405 | 真我之光 | Arm | Epic | /assets/game-icons/equipment/armor/equipment-205405-armor-arm.png |
| 205406 | 邀明月 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-205406-armor-arm.png |
| 205407 | 秘银箭筒 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-205407-armor-arm.png |
| 205408 | 苏丹箭筒 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-205408-armor-arm.png |
| 205409 | Sultan Adorned Mk2 | Trinket | Legend | /assets/game-icons/equipment/armor/equipment-205409-armor-trinket.png |
| 205501 | 命运之骰 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-205501-armor-arm.png |
| 205502 | 芭蕉扇 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-205502-armor-arm.png |
| 205503 | 昆德拉 | Head | Legend | /assets/game-icons/equipment/armor/equipment-205503-armor-head.png |
| 205504 | 极光陀螺 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-205504-armor-arm.png |
| 205505 | 荷鲁斯之眼 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-205505-armor-arm.png |
| 205506 | Kundala Mk2 | Trinket | Legend | /assets/game-icons/equipment/armor/equipment-205506-armor-trinket.png |
| 205507 | 死灵之书 | Arm | Mythic | /assets/game-icons/equipment/armor/equipment-205507-armor-arm.png |
| 205508 | 翡翠石板 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-205508-armor-arm.png |
| 205601 | 魔法神灯 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-205601-armor-arm.png |
| 205602 | Star Fragment | Trinket | Legend | /assets/game-icons/equipment/armor/equipment-205602-armor-trinket.png |
| 205603 | The Dragon's Fury | Trinket | Legend | /assets/game-icons/equipment/armor/equipment-205603-armor-trinket.png |
| 701451 | 战术面罩 | Head | Legend | /assets/game-icons/equipment/armor/equipment-701451-armor-head.png |
| 702503 | Holy Orders Mk2 | Chest | Legend | /assets/game-icons/equipment/armor/equipment-702503-armor-chest.png |
| 702601 | 异端审判官 | Chest | Mythic | /assets/game-icons/equipment/armor/equipment-702601-armor-chest.png |
| 705502 | Sanguine Gunbai Mk2 | Trinket | Mythic | /assets/game-icons/equipment/armor/equipment-705502-armor-trinket.png |
| 705504 | Totem Mk2 | Trinket | Mythic | /assets/game-icons/equipment/armor/equipment-705504-armor-trinket.png |
| 705601 | 微型太阳系统 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-705601-armor-arm.png |
| 705602 | Cobalt Blue | Trinket | Mythic | /assets/game-icons/equipment/armor/equipment-705602-armor-trinket.png |
| 705603 | 燃烧之心 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-705603-armor-arm.png |
| 705604 | 克拉达戒指 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-705604-armor-arm.png |
| 705605 | Mercury | Trinket | Mythic | /assets/game-icons/equipment/armor/equipment-705605-armor-trinket.png |
| 705606 | Arc Reactor | Trinket | Mythic | /assets/game-icons/equipment/armor/equipment-705606-armor-trinket.png |
| 705607 | 图腾 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-705607-armor-arm.png |
| 705608 | 守护之眼 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-705608-armor-arm.png |
| 705609 | Psyche's Blade | Trinket | Mythic | /assets/game-icons/equipment/armor/equipment-705609-armor-trinket.png |
| 705610 | Hero's Record | Trinket | Mythic | /assets/game-icons/equipment/armor/equipment-705610-armor-trinket.png |
| 705611 | E.M.O.T.E | Trinket | Mythic | /assets/game-icons/equipment/armor/equipment-705611-armor-trinket.png |
| 705612 | Claddagh Ring Mk2 | Trinket | Mythic | /assets/game-icons/equipment/armor/equipment-705612-armor-trinket.png |
| 705613 | Arc Reactor Mk2 | Trinket | Mythic | /assets/game-icons/equipment/armor/equipment-705613-armor-trinket.png |
| 705614 | 普赛克之刃 | Arm | Legend | /assets/game-icons/equipment/armor/equipment-705614-armor-arm.png |
| 705615 | Hero's Record Mk2 | Trinket | Mythic | /assets/game-icons/equipment/armor/equipment-705615-armor-trinket.png |
| 705617 | Lunar Embrace Mk2 | Trinket | Mythic | /assets/game-icons/equipment/armor/equipment-705617-armor-trinket.png |
| 705618 | Magic Lamp | Trinket | Mythic | /assets/game-icons/equipment/armor/equipment-705618-armor-trinket.png |
| 705619 | Star Fragment | Trinket | Mythic | /assets/game-icons/equipment/armor/equipment-705619-armor-trinket.png |
| 705620 | 龙首簪 | Head | Legend | /assets/game-icons/equipment/armor/equipment-705620-armor-head.png |
| 705621 | Flower Mk2 | Trinket | Mythic | /assets/game-icons/equipment/armor/equipment-705621-armor-trinket.png |

## 非装备物品图标

### Misc

| id | 名称 | 子类型 | 品级 | 图片 |
| --- | --- | --- | --- | --- |
| 101101 | 剪刀 | Material | Common | /assets/game-icons/items/misc/item-101101-misc-material.png |
| 101102 | 钢笔 | Material | Common | /assets/game-icons/items/misc/item-101102-misc-material.png |
| 105102 | 十字镐 | Material | Common | /assets/game-icons/items/misc/item-105102-misc-material.png |
| 108101 | 树枝 | Material | Common | /assets/game-icons/items/misc/item-108101-misc-material.png |
| 112101 | 石头 | Material | Common | /assets/game-icons/items/misc/item-112101-misc-material.png |
| 112103 | 钢珠 | Material | Common | /assets/game-icons/items/misc/item-112103-misc-material.png |
| 112104 | 玻璃瓶 | Material | Common | /assets/game-icons/items/misc/item-112104-misc-material.png |
| 113102 | 扑克牌 | Material | Common | /assets/game-icons/items/misc/item-113102-misc-material.png |
| 113104 | 粉笔 | Material | Common | /assets/game-icons/items/misc/item-113104-misc-material.png |
| 205101 | 羽毛 | Material | Common | /assets/game-icons/items/misc/item-205101-misc-material.png |
| 205102 | 花朵 | Material | Common | /assets/game-icons/items/misc/item-205102-misc-material.png |
| 205103 | 缎带 | Material | Common | /assets/game-icons/items/misc/item-205103-misc-material.png |
| 205106 | 佛经 | Material | Common | /assets/game-icons/items/misc/item-205106-misc-material.png |
| 205108 | 圣杯 | Material | Common | /assets/game-icons/items/misc/item-205108-misc-material.png |
| 205109 | 十字架 | Material | Common | /assets/game-icons/items/misc/item-205109-misc-material.png |
| 205110 | 望远镜 | Material | Common | /assets/game-icons/items/misc/item-205110-misc-material.png |
| 205202 | 圣者的遗物 | Material | Uncommon | /assets/game-icons/items/misc/item-205202-misc-material.png |
| 205203 | 命运之花 | Material | Uncommon | /assets/game-icons/items/misc/item-205203-misc-material.png |
| 205204 | 玻璃渣 | Material | Uncommon | /assets/game-icons/items/misc/item-205204-misc-material.png |
| 205206 | 狙击镜 | Material | Uncommon | /assets/game-icons/items/misc/item-205206-misc-material.png |
| 205207 | 佛陀舍利 | Material | Uncommon | /assets/game-icons/items/misc/item-205207-misc-material.png |
| 205208 | 箭筒 | Material | Uncommon | /assets/game-icons/items/misc/item-205208-misc-material.png |
| 205209 | 鸡毛掸子 | Material | Uncommon | /assets/game-icons/items/misc/item-205209-misc-material.png |
| 205211 | 琵琶短剑 | Material | Uncommon | /assets/game-icons/items/misc/item-205211-misc-material.png |
| 205213 | 射击教本 | Material | Uncommon | /assets/game-icons/items/misc/item-205213-misc-material.png |
| 205303 | 弹夹 | Material | Common | /assets/game-icons/items/misc/item-205303-misc-material.png |
| 205312 | 埃忒耳之羽毛 | Material | Rare | /assets/game-icons/items/misc/item-205312-misc-material.png |
| 205402 | 万年冰 | Material | Epic | /assets/game-icons/items/misc/item-205402-misc-material.png |
| 205403 | 三昧真火 | Material | Epic | /assets/game-icons/items/misc/item-205403-misc-material.png |
| 302103 | 冰块 | Material | Common | /assets/game-icons/items/misc/item-302103-misc-material.png |
| 401101 | 钉子 | Material | Common | /assets/game-icons/items/misc/item-401101-misc-material.png |
| 401103 | 皮革 | Material | Common | /assets/game-icons/items/misc/item-401103-misc-material.png |
| 401104 | 龟壳 | Material | Common | /assets/game-icons/items/misc/item-401104-misc-material.png |
| 401105 | 胶带 | Material | Common | /assets/game-icons/items/misc/item-401105-misc-material.png |
| 401106 | 废铁 | Material | Common | /assets/game-icons/items/misc/item-401106-misc-material.png |
| 401107 | 打火机 | Material | Common | /assets/game-icons/items/misc/item-401107-misc-material.png |
| 401108 | 激光笔 | Material | Common | /assets/game-icons/items/misc/item-401108-misc-material.png |
| 401109 | 五马牌 | Material | Common | /assets/game-icons/items/misc/item-401109-misc-material.png |
| 401110 | 电池 | Material | Common | /assets/game-icons/items/misc/item-401110-misc-material.png |
| 401111 | Alcohol | Material | Common | /assets/game-icons/items/misc/item-401111-misc-material.png |
| 401112 | 油 | Material | Common | /assets/game-icons/items/misc/item-401112-misc-material.png |
| 401113 | 布料 | Material | Common | /assets/game-icons/items/misc/item-401113-misc-material.png |
| 401114 | 原石 | Material | Common | /assets/game-icons/items/misc/item-401114-misc-material.png |
| 401116 | 胶水 | Material | Common | /assets/game-icons/items/misc/item-401116-misc-material.png |
| 401117 | 纸 | Material | Common | /assets/game-icons/items/misc/item-401117-misc-material.png |
| 401118 | Iron Ore | Material | Common | /assets/game-icons/items/misc/item-401118-misc-material.png |
| 401120 | Can | Material | Common | /assets/game-icons/items/misc/item-401120-misc-material.png |
| 401121 | 火药 | Material | Common | /assets/game-icons/items/misc/item-401121-misc-material.png |
| 401123 | 化学品 | Material | Common | /assets/game-icons/items/misc/item-401123-misc-material.png |
| 401124 | 石墨 | Material | Common | /assets/game-icons/items/misc/item-401124-misc-material.png |
| 401201 | Steel | Material | Uncommon | /assets/game-icons/items/misc/item-401201-misc-material.png |
| 401202 | 油布 | Material | Uncommon | /assets/game-icons/items/misc/item-401202-misc-material.png |
| 401203 | Heated Oil | Material | Uncommon | /assets/game-icons/items/misc/item-401203-misc-material.png |
| 401206 | 粉笔灰 | Material | Uncommon | /assets/game-icons/items/misc/item-401206-misc-material.png |
| 401208 | 生命树枝 | Material | Epic | /assets/game-icons/items/misc/item-401208-misc-material.png |
| 401209 | 陨石 | Material | Epic | /assets/game-icons/items/misc/item-401209-misc-material.png |
| 401210 | 灰烬 | Material | Uncommon | /assets/game-icons/items/misc/item-401210-misc-material.png |
| 401211 | 电子元件 | Material | Uncommon | /assets/game-icons/items/misc/item-401211-misc-material.png |
| 401212 | 蓝图 | Material | Uncommon | /assets/game-icons/items/misc/item-401212-misc-material.png |
| 401213 | 铁板 | Material | Uncommon | /assets/game-icons/items/misc/item-401213-misc-material.png |
| 401214 | 黄金 | Material | Uncommon | /assets/game-icons/items/misc/item-401214-misc-material.png |
| 401215 | 火烤石 | Material | Uncommon | /assets/game-icons/items/misc/item-401215-misc-material.png |
| 401216 | 铁丝 | Material | Uncommon | /assets/game-icons/items/misc/item-401216-misc-material.png |
| 401217 | 红宝石 | Material | Uncommon | /assets/game-icons/items/misc/item-401217-misc-material.png |
| 401218 | 精装 | Material | Uncommon | /assets/game-icons/items/misc/item-401218-misc-material.png |
| 401219 | 钻石 | Material | Uncommon | /assets/game-icons/items/misc/item-401219-misc-material.png |
| 401301 | 靛青月石 | Material | Epic | /assets/game-icons/items/misc/item-401301-misc-material.png |
| 401302 | 毒药 | Material | Uncommon | /assets/game-icons/items/misc/item-401302-misc-material.png |
| 401303 | 马达 | Material | Rare | /assets/game-icons/items/misc/item-401303-misc-material.png |
| 401304 | 秘银 | Material | Epic | /assets/game-icons/items/misc/item-401304-misc-material.png |
| 401305 | 玻璃面板 | Material | Rare | /assets/game-icons/items/misc/item-401305-misc-material.png |
| 401306 | 电解电池 | Material | Uncommon | /assets/game-icons/items/misc/item-401306-misc-material.png |
| 401307 | 皮革补丁 | Material | Uncommon | /assets/game-icons/items/misc/item-401307-misc-material.png |
| 401309 | 塑料 | Material | Common | /assets/game-icons/items/misc/item-401309-misc-material.png |
| 401401 | VF 血液样本 | Material | Epic | /assets/game-icons/items/misc/item-401401-misc-material.png |
| 401402 | 进化石 | Material | Epic | /assets/game-icons/items/misc/item-401402-misc-material.png |
| 401403 | 能源晶石 | Material | Epic | /assets/game-icons/items/misc/item-401403-misc-material.png |
| 401405 | 绯红碎片 | Material | Common | /assets/game-icons/items/misc/item-401405-misc-material.png |
| 401406 | 晓色碎片 | Material | Common | /assets/game-icons/items/misc/item-401406-misc-material.png |
| 501401 | Cell Phone | Material | Rare | /assets/game-icons/items/misc/item-501401-misc-material.png |
| 502104 | 钢琴线 | Material | Common | /assets/game-icons/items/misc/item-502104-misc-material.png |
| 502401 | 线 | Material | Common | /assets/game-icons/items/misc/item-502401-misc-material.png |
| 999999 | 战术强化组件 | Material | Epic | /assets/game-icons/items/misc/item-999999-misc-material.png |

### Consume

| id | 名称 | 子类型 | 品级 | 图片 |
| --- | --- | --- | --- | --- |
| 301102 | 土豆 | Food | Common | /assets/game-icons/items/consume/item-301102-consume-food.png |
| 301104 | 鳕鱼 | Food | Common | /assets/game-icons/items/consume/item-301104-consume-food.png |
| 301105 | Lemon | Food | Common | /assets/game-icons/items/consume/item-301105-consume-food.png |
| 301106 | 大蒜 | Food | Common | /assets/game-icons/items/consume/item-301106-consume-food.png |
| 301109 | Carp | Food | Common | /assets/game-icons/items/consume/item-301109-consume-food.png |
| 301110 | 面包 | Food | Common | /assets/game-icons/items/consume/item-301110-consume-food.png |
| 301111 | 肉 | Food | Common | /assets/game-icons/items/consume/item-301111-consume-food.png |
| 301112 | Egg | Food | Common | /assets/game-icons/items/consume/item-301112-consume-food.png |
| 301113 | 拉面 | Food | Common | /assets/game-icons/items/consume/item-301113-consume-food.png |
| 301116 | 野山参 | Food | Common | /assets/game-icons/items/consume/item-301116-consume-food.png |
| 301119 | 巧克力 | Food | Common | /assets/game-icons/items/consume/item-301119-consume-food.png |
| 301121 | 洋菇 | Food | Common | /assets/game-icons/items/consume/item-301121-consume-food.png |
| 301201 | Honey Cod Steak | Food | Uncommon | /assets/game-icons/items/consume/item-301201-consume-food.png |
| 301204 | Canned Cod Liver | Food | Uncommon | /assets/game-icons/items/consume/item-301204-consume-food.png |
| 301205 | Garlic Bread | Food | Uncommon | /assets/game-icons/items/consume/item-301205-consume-food.png |
| 301206 | 黄油 | Food | Uncommon | /assets/game-icons/items/consume/item-301206-consume-food.png |
| 301209 | Carp Bread | Food | Uncommon | /assets/game-icons/items/consume/item-301209-consume-food.png |
| 301213 | Disinfectant | Food | Rare | /assets/game-icons/items/consume/item-301213-consume-food.png |
| 301216 | Choco Pie | Food | Uncommon | /assets/game-icons/items/consume/item-301216-consume-food.png |
| 301218 | 良药 | Food | Uncommon | /assets/game-icons/items/consume/item-301218-consume-food.png |
| 301222 | 天多利烤鸡 | Food | Rare | /assets/game-icons/items/consume/item-301222-consume-food.png |
| 301224 | 大蒜培根 | Food | Uncommon | /assets/game-icons/items/consume/item-301224-consume-food.png |
| 301225 | Bun | Food | Uncommon | /assets/game-icons/items/consume/item-301225-consume-food.png |
| 301226 | 汉堡 | Food | Rare | /assets/game-icons/items/consume/item-301226-consume-food.png |
| 301229 | Fish Fillet With Egg | Food | Uncommon | /assets/game-icons/items/consume/item-301229-consume-food.png |
| 301230 | Citrus Cake | Food | Uncommon | /assets/game-icons/items/consume/item-301230-consume-food.png |
| 301232 | Honey Garlic | Food | Uncommon | /assets/game-icons/items/consume/item-301232-consume-food.png |
| 301234 | Egg Bun | Food | Uncommon | /assets/game-icons/items/consume/item-301234-consume-food.png |
| 301237 | 巧克力冰淇淋 | Food | Uncommon | /assets/game-icons/items/consume/item-301237-consume-food.png |
| 301239 | 流泪面包 | Food | Rare | /assets/game-icons/items/consume/item-301239-consume-food.png |
| 301243 | 半熟牛排 | Food | Uncommon | /assets/game-icons/items/consume/item-301243-consume-food.png |
| 301244 | 半熟烤鱼 | Food | Uncommon | /assets/game-icons/items/consume/item-301244-consume-food.png |
| 301245 | 半熟烤土豆 | Food | Uncommon | /assets/game-icons/items/consume/item-301245-consume-food.png |
| 301246 | 苹果糖 | Food | Rare | /assets/game-icons/items/consume/item-301246-consume-food.png |
| 301247 | 胡萝卜 | Food | Rare | /assets/game-icons/items/consume/item-301247-consume-food.png |
| 301250 | 蛋包饭 | Food | Rare | /assets/game-icons/items/consume/item-301250-consume-food.png |
| 301301 | Spicy Fish Stew | Food | Rare | /assets/game-icons/items/consume/item-301301-consume-food.png |
| 301302 | 炸薯条 | Food | Rare | /assets/game-icons/items/consume/item-301302-consume-food.png |
| 301303 | Baked Potato | Food | Rare | /assets/game-icons/items/consume/item-301303-consume-food.png |
| 301304 | Baked Carp | Food | Rare | /assets/game-icons/items/consume/item-301304-consume-food.png |
| 301305 | 圣水 | SpecialFood | Legend | /assets/game-icons/items/consume/item-301305-consume-special-food.png |
| 301306 | Grilled Chilean Sea Bass | Food | Rare | /assets/game-icons/items/consume/item-301306-consume-food.png |
| 301307 | Hot Ramen | Food | Rare | /assets/game-icons/items/consume/item-301307-consume-food.png |
| 301308 | 咖啡面包 | Food | Rare | /assets/game-icons/items/consume/item-301308-consume-food.png |
| 301309 | 炒蛋 | Food | Rare | /assets/game-icons/items/consume/item-301309-consume-food.png |
| 301311 | 巧克力饼干 | Food | Rare | /assets/game-icons/items/consume/item-301311-consume-food.png |
| 301312 | Choco Pie Box | Food | Rare | /assets/game-icons/items/consume/item-301312-consume-food.png |
| 301314 | 热腾腾的汤药 | Food | Rare | /assets/game-icons/items/consume/item-301314-consume-food.png |
| 301315 | 蜂蜜黄油 | Food | Rare | /assets/game-icons/items/consume/item-301315-consume-food.png |
| 301316 | 炸鸡 | Food | Common | /assets/game-icons/items/consume/item-301316-consume-food.png |
| 301317 | 治疗药剂 | Food | Rare | /assets/game-icons/items/consume/item-301317-consume-food.png |
| 301318 | Hard Boiled Egg | Food | Rare | /assets/game-icons/items/consume/item-301318-consume-food.png |
| 301319 | 酒酿饼 | Food | Rare | /assets/game-icons/items/consume/item-301319-consume-food.png |
| 301323 | Steak | Food | Rare | /assets/game-icons/items/consume/item-301323-consume-food.png |
| 301324 | 急救箱 | Food | Legend | /assets/game-icons/items/consume/item-301324-consume-food.png |
| 301325 | 黄油烤土豆 | Food | Rare | /assets/game-icons/items/consume/item-301325-consume-food.png |
| 301326 | 炸鱼排 | Food | Rare | /assets/game-icons/items/consume/item-301326-consume-food.png |
| 301327 | 炒面 | Food | Rare | /assets/game-icons/items/consume/item-301327-consume-food.png |
| 301328 | 冷面 | Food | Rare | /assets/game-icons/items/consume/item-301328-consume-food.png |
| 301329 | 大还丹 | SpecialFood | Legend | /assets/game-icons/items/consume/item-301329-consume-special-food.png |
| 301330 | Birthday Cake | Food | Rare | /assets/game-icons/items/consume/item-301330-consume-food.png |
| 301331 | Garlic Ramen | Food | Rare | /assets/game-icons/items/consume/item-301331-consume-food.png |
| 301333 | Snowflake | Beverage | Uncommon | /assets/game-icons/items/consume/item-301333-consume-beverage.png |
| 301337 | 热腾腾的吐司 | Food | Rare | /assets/game-icons/items/consume/item-301337-consume-food.png |
| 301338 | 巧克力酱 | Food | Rare | /assets/game-icons/items/consume/item-301338-consume-food.png |
| 301339 | 烤大蒜 | Food | Rare | /assets/game-icons/items/consume/item-301339-consume-food.png |
| 301340 | 培根吐司 | Food | Rare | /assets/game-icons/items/consume/item-301340-consume-food.png |
| 301346 | 铁板牛排 | Food | Rare | /assets/game-icons/items/consume/item-301346-consume-food.png |
| 301348 | 一周年纪念蛋糕 | Food | Rare | /assets/game-icons/items/consume/item-301348-consume-food.png |
| 301349 | 烤蘑菇串 | Food | Rare | /assets/game-icons/items/consume/item-301349-consume-food.png |
| 301401 | 炸鱼薯条 | Food | Epic | /assets/game-icons/items/consume/item-301401-consume-food.png |
| 301403 | 11号套餐 | Food | Legend | /assets/game-icons/items/consume/item-301403-consume-food.png |
| 301405 | 三文鱼 | Food | Epic | /assets/game-icons/items/consume/item-301405-consume-food.png |
| 301406 | 黄金地瓜 | Food | Epic | /assets/game-icons/items/consume/item-301406-consume-food.png |
| 301407 | 冷冻披萨 | Food | Epic | /assets/game-icons/items/consume/item-301407-consume-food.png |
| 301408 | 薄荷巧克力 | Food | Epic | /assets/game-icons/items/consume/item-301408-consume-food.png |
| 301409 | 松露 | Food | Epic | /assets/game-icons/items/consume/item-301409-consume-food.png |
| 301501 | 三文鱼排 | Food | Legend | /assets/game-icons/items/consume/item-301501-consume-food.png |
| 301502 | 夏威夷披萨 | Food | Legend | /assets/game-icons/items/consume/item-301502-consume-food.png |
| 301503 | 烤地瓜 | Food | Legend | /assets/game-icons/items/consume/item-301503-consume-food.png |
| 301504 | 松露意面 | Food | Legend | /assets/game-icons/items/consume/item-301504-consume-food.png |
| 301598 | 黄金脆皮炸鸡 | Food | Legend | /assets/game-icons/items/consume/item-301598-consume-food.png |
| 301599 |  | Food | Legend | /assets/game-icons/items/consume/item-301599-consume-food.png |
| 301601 | 百年老汤 | Food | Epic | /assets/game-icons/items/consume/item-301601-consume-food.png |
| 301602 | 万年汤 | Food | Mythic | /assets/game-icons/items/consume/item-301602-consume-food.png |
| 301701 | 苹果 | Food | Rare | /assets/game-icons/items/consume/item-301701-consume-food.png |
| 301702 | 金苹果 | Food | Legend | /assets/game-icons/items/consume/item-301702-consume-food.png |
| 302101 | 蜂蜜 | Beverage | Common | /assets/game-icons/items/consume/item-302101-consume-beverage.png |
| 302102 | 水 | Food | Common | /assets/game-icons/items/consume/item-302102-consume-food.png |
| 302104 | 威士忌 | Beverage | Common | /assets/game-icons/items/consume/item-302104-consume-beverage.png |
| 302106 | Coffee | Beverage | Common | /assets/game-icons/items/consume/item-302106-consume-beverage.png |
| 302107 | 碳酸饮料 | Beverage | Common | /assets/game-icons/items/consume/item-302107-consume-beverage.png |
| 302108 | 牛奶 | Beverage | Common | /assets/game-icons/items/consume/item-302108-consume-beverage.png |
| 302201 | 沸水 | Food | Rare | /assets/game-icons/items/consume/item-302201-consume-food.png |
| 302202 | Lemonade | Beverage | Uncommon | /assets/game-icons/items/consume/item-302202-consume-beverage.png |
| 302203 | Water Bottle | Beverage | Uncommon | /assets/game-icons/items/consume/item-302203-consume-beverage.png |
| 302204 | Baijiu | Beverage | Uncommon | /assets/game-icons/items/consume/item-302204-consume-beverage.png |
| 302205 | Soju | Beverage | Uncommon | /assets/game-icons/items/consume/item-302205-consume-beverage.png |
| 302206 | Iced Coffee | Beverage | Uncommon | /assets/game-icons/items/consume/item-302206-consume-beverage.png |
| 302207 | Cocktail | Beverage | Uncommon | /assets/game-icons/items/consume/item-302207-consume-beverage.png |
| 302208 | Coffee Liqueur | Beverage | Uncommon | /assets/game-icons/items/consume/item-302208-consume-beverage.png |
| 302209 | 可乐 | Beverage | Uncommon | /assets/game-icons/items/consume/item-302209-consume-beverage.png |
| 302210 | Latte | Beverage | Uncommon | /assets/game-icons/items/consume/item-302210-consume-beverage.png |
| 302211 | 蜂蜜牛奶 | Beverage | Uncommon | /assets/game-icons/items/consume/item-302211-consume-beverage.png |
| 302213 | 高杯酒 | Beverage | Uncommon | /assets/game-icons/items/consume/item-302213-consume-beverage.png |
| 302214 | 巧克力牛奶 | Beverage | Uncommon | /assets/game-icons/items/consume/item-302214-consume-beverage.png |
| 302215 | 蜂蜜水 | Beverage | Uncommon | /assets/game-icons/items/consume/item-302215-consume-beverage.png |
| 302216 | 冰水 | Beverage | Uncommon | /assets/game-icons/items/consume/item-302216-consume-beverage.png |
| 302217 | 威士忌加冰 | Beverage | Uncommon | /assets/game-icons/items/consume/item-302217-consume-beverage.png |
| 302218 | 牛仔鸡尾酒 | Beverage | Uncommon | /assets/game-icons/items/consume/item-302218-consume-beverage.png |
| 302219 | 天然苏打水 | Beverage | Uncommon | /assets/game-icons/items/consume/item-302219-consume-beverage.png |
| 302220 | 米兹瓦里 | Beverage | Uncommon | /assets/game-icons/items/consume/item-302220-consume-beverage.png |
| 302221 | 蜂蜜威士忌 | Beverage | Uncommon | /assets/game-icons/items/consume/item-302221-consume-beverage.png |
| 302222 | 冰沙 | Beverage | Uncommon | /assets/game-icons/items/consume/item-302222-consume-beverage.png |
| 302223 | 清凉苏打水 | Beverage | Uncommon | /assets/game-icons/items/consume/item-302223-consume-beverage.png |
| 302301 | 高粱酒 | Beverage | Rare | /assets/game-icons/items/consume/item-302301-consume-beverage.png |
| 302302 | 蜂蜜热饮 | Beverage | Rare | /assets/game-icons/items/consume/item-302302-consume-beverage.png |
| 302303 | 桂花酿 | Food | Uncommon | /assets/game-icons/items/consume/item-302303-consume-food.png |
| 302304 | Americano | Beverage | Rare | /assets/game-icons/items/consume/item-302304-consume-beverage.png |
| 302305 | 药酒 | Beverage | Uncommon | /assets/game-icons/items/consume/item-302305-consume-beverage.png |
| 302307 | 威士忌旋塞 | Beverage | Rare | /assets/game-icons/items/consume/item-302307-consume-beverage.png |
| 302308 | 纯净水 | Beverage | Rare | /assets/game-icons/items/consume/item-302308-consume-beverage.png |
| 302309 | Can of Cola | Beverage | Rare | /assets/game-icons/items/consume/item-302309-consume-beverage.png |
| 302310 | 热可可 | Beverage | Rare | /assets/game-icons/items/consume/item-302310-consume-beverage.png |
| 302311 | White Russian | Beverage | Rare | /assets/game-icons/items/consume/item-302311-consume-beverage.png |
| 302312 | 塞勒涅之泪 | SpecialFood | Legend | /assets/game-icons/items/consume/item-302312-consume-special-food.png |
| 302314 | 热托迪 | Beverage | Rare | /assets/game-icons/items/consume/item-302314-consume-beverage.png |
| 302315 | 热碳酸水 | Beverage | Rare | /assets/game-icons/items/consume/item-302315-consume-beverage.png |
| 302316 | 热牛奶 | Beverage | Rare | /assets/game-icons/items/consume/item-302316-consume-beverage.png |
| 303501 | 悬赏金 | Bounty | Legend | /assets/game-icons/items/consume/item-303501-consume-bounty.png |
| 303502 | 荣誉值+ | Bounty | Rare | /assets/game-icons/items/consume/item-303502-consume-bounty.png |
| 303503 | 荣誉值++ | Bounty | Epic | /assets/game-icons/items/consume/item-303503-consume-bounty.png |
| 303504 | 荣誉值 | Bounty | Epic | /assets/game-icons/items/consume/item-303504-consume-bounty.png |
| 303505 | 荣誉值 | Bounty | Epic | /assets/game-icons/items/consume/item-303505-consume-bounty.png |
| 303506 | 荣誉值 | Bounty | Epic | /assets/game-icons/items/consume/item-303506-consume-bounty.png |
| 303507 | 荣誉值 | Bounty | Epic | /assets/game-icons/items/consume/item-303507-consume-bounty.png |
| 303508 | 荣誉值 | Bounty | Epic | /assets/game-icons/items/consume/item-303508-consume-bounty.png |
| 303509 | 荣誉值 | Bounty | Epic | /assets/game-icons/items/consume/item-303509-consume-bounty.png |
| 303510 | 荣誉值 | Bounty | Epic | /assets/game-icons/items/consume/item-303510-consume-bounty.png |
| 306001 | 便携工具能量包 | GadgetEnergy | Rare | /assets/game-icons/items/consume/item-306001-consume-gadget-energy.png |
| 307001 | 胶囊 - 生命 | SpecialFood | Epic | /assets/game-icons/items/consume/item-307001-consume-special-food.png |
| 307002 | 胶囊 - 鲜血 | SpecialFood | Epic | /assets/game-icons/items/consume/item-307002-consume-special-food.png |
| 307003 | 胶囊 - 宇宙 | SpecialFood | Epic | /assets/game-icons/items/consume/item-307003-consume-special-food.png |
| 802601 | 等离子血清 | SpecialFood | Legend | /assets/game-icons/items/consume/item-802601-consume-special-food.png |

### EscapeMaterial

| id | 名称 | 子类型 | 品级 | 图片 |
| --- | --- | --- | --- | --- |
| 409401 | 再生手环 | Material | Rare | /assets/game-icons/items/escape-material/item-409401-escape-material-material.png |

### EscapeKey

| id | 名称 | 子类型 | 品级 | 图片 |
| --- | --- | --- | --- | --- |
| 409402 | 系统密码 | Material | Rare | /assets/game-icons/items/escape-key/item-409402-escape-key-material.png |

### EscapeQualification

| id | 名称 | 子类型 | 品级 | 图片 |
| --- | --- | --- | --- | --- |
| 409403 | 逃生手环 | Material | Epic | /assets/game-icons/items/escape-qualification/item-409403-escape-qualification-material.png |

### DnaBracelet

| id | 名称 | 子类型 | 品级 | 图片 |
| --- | --- | --- | --- | --- |
| 501101 | {0}的再生手环 | None | Common | /assets/game-icons/items/dna-bracelet/item-501101-dna-bracelet-none.png |

### Special

| id | 名称 | 子类型 | 品级 | 图片 |
| --- | --- | --- | --- | --- |
| 502101 | 监视器 | Summon | Common | /assets/game-icons/items/special/item-502101-special-summon.png |
| 502102 | 套索 | Summon | Common | /assets/game-icons/items/special/item-502102-special-summon.png |
| 502103 | 捕鼠夹 | Summon | Common | /assets/game-icons/items/special/item-502103-special-summon.png |
| 502105 | 简易篝火 | Summon | Rare | /assets/game-icons/items/special/item-502105-special-summon.png |
| 502201 | Spiked Plank | Summon | Uncommon | /assets/game-icons/items/special/item-502201-special-summon.png |
| 502202 | 改良型捕鼠夹 | Summon | Uncommon | /assets/game-icons/items/special/item-502202-special-summon.png |
| 502203 | 炸药 | Summon | Uncommon | /assets/game-icons/items/special/item-502203-special-summon.png |
| 502204 | 竹枪陷阱 | Summon | Uncommon | /assets/game-icons/items/special/item-502204-special-summon.png |
| 502205 | Booby Trap | Summon | Uncommon | /assets/game-icons/items/special/item-502205-special-summon.png |
| 502206 | Clang Clatter | Summon | Uncommon | /assets/game-icons/items/special/item-502206-special-summon.png |
| 502207 | 望远监视器 | Summon | Uncommon | /assets/game-icons/items/special/item-502207-special-summon.png |
| 502208 | 无人探测仪 | Summon | Uncommon | /assets/game-icons/items/special/item-502208-special-summon.png |
| 502209 | 潜行相机 | Summon | Uncommon | /assets/game-icons/items/special/item-502209-special-summon.png |
| 502210 | 篝火 | GhostItem | Uncommon | /assets/game-icons/items/special/item-502210-special-ghost-item.png |
| 502211 | Telephoto Camera | Summon | Uncommon | /assets/game-icons/items/special/item-502211-special-summon.png |
| 502212 | 望远监视器 | Summon | Uncommon | /assets/game-icons/items/special/item-502212-special-summon.png |
| 502303 | Jungle Guillotine | Summon | Uncommon | /assets/game-icons/items/special/item-502303-special-summon.png |
| 502304 | Mine | Summon | Rare | /assets/game-icons/items/special/item-502304-special-summon.png |
| 502305 | Pendulum Axe | Summon | Rare | /assets/game-icons/items/special/item-502305-special-summon.png |
| 502306 | Explosive Trap | Summon | Uncommon | /assets/game-icons/items/special/item-502306-special-summon.png |
| 502307 | RDX | Summon | Rare | /assets/game-icons/items/special/item-502307-special-summon.png |
| 502308 | EMP探测仪 | Summon | Rare | /assets/game-icons/items/special/item-502308-special-summon.png |
| 502310 | 指压板陷阱 | Summon | Epic | /assets/game-icons/items/special/item-502310-special-summon.png |
| 502402 | Stingburst | Summon | Epic | /assets/game-icons/items/special/item-502402-special-summon.png |
| 502403 | Fire Trap | Summon | Rare | /assets/game-icons/items/special/item-502403-special-summon.png |
| 502404 | C4 | Summon | Epic | /assets/game-icons/items/special/item-502404-special-summon.png |
| 502405 | 双刀断头台 | Summon | Epic | /assets/game-icons/items/special/item-502405-special-summon.png |
| 502406 | 阔刀地雷 | Summon | Epic | /assets/game-icons/items/special/item-502406-special-summon.png |
| 502407 | Hidden Maiden | Summon | Rare | /assets/game-icons/items/special/item-502407-special-summon.png |
| 502501 | 遥控地雷 | Summon | Legend | /assets/game-icons/items/special/item-502501-special-summon.png |
| 502502 | Smart Bomb | Summon | Epic | /assets/game-icons/items/special/item-502502-special-summon.png |
| 503101 | Kiosk呼叫机 | Gadget | Rare | /assets/game-icons/items/special/item-503101-special-gadget.png |
| 503102 | 信号枪B | Gadget | Epic | /assets/game-icons/items/special/item-503102-special-gadget.png |
| 503103 | 信号枪R | Summon | Epic | /assets/game-icons/items/special/item-503103-special-summon.png |
| 503104 | 便携VLS | Gadget | Rare | /assets/game-icons/items/special/item-503104-special-gadget.png |
| 503105 | 密钥卡 | Gadget | Rare | /assets/game-icons/items/special/item-503105-special-gadget.png |
| 503106 | 密钥卡 - γ | Summon | Epic | /assets/game-icons/items/special/item-503106-special-summon.png |
| 503107 | 密钥卡 - RED | Trigger | Rare | /assets/game-icons/items/special/item-503107-special-trigger.png |
| 503108 | 猎人汤锅 | Gadget | Rare | /assets/game-icons/items/special/item-503108-special-gadget.png |
| 504301 | 阿格莱亚的礼物（稀有） | OnSelect | Rare | /assets/game-icons/items/special/item-504301-special-on-select.png |
| 504405 | 阿格莱亚的礼物（英雄） | OnSelect | Epic | /assets/game-icons/items/special/item-504405-special-on-select.png |
| 504501 | 阿格莱亚的礼物（传说） | OnSelect | Legend | /assets/game-icons/items/special/item-504501-special-on-select.png |
| 504601 | 便携生成器・胸部装备 | OnSelect | Mythic | /assets/game-icons/items/special/item-504601-special-on-select.png |
| 504602 | 便携生成器・头部装备 | OnSelect | Mythic | /assets/game-icons/items/special/item-504602-special-on-select.png |
| 504603 | 便携生成器・手臂/装饰装备 | OnSelect | Mythic | /assets/game-icons/items/special/item-504603-special-on-select.png |
| 504604 | 便携生成器・腿部装备 | OnSelect | Mythic | /assets/game-icons/items/special/item-504604-special-on-select.png |
| 504605 | 阿格莱亚的礼物（超凡） | OnSelect | Mythic | /assets/game-icons/items/special/item-504605-special-on-select.png |
| 540001 | 高级订制 | GhostItem | Legend | /assets/game-icons/items/special/item-540001-special-ghost-item.png |

## 英雄技能图标

### 1 杰琪 (Jackie)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1001400 | 袭击 | 5 | /assets/game-icons/hero-skills/jackie/skill-1-e-1001400.png |
| Q | 1001200 | 连斩 | 5 | /assets/game-icons/hero-skills/jackie/skill-1-q-1001200.png |
| R | 1001500 | 电锯杀人狂 | 3 | /assets/game-icons/hero-skills/jackie/skill-1-r-1001500.png |
| T | 1001100 | 鲜血盛宴 | 2 | /assets/game-icons/hero-skills/jackie/skill-1-t-1001100.png |
| W | 1001300 | 断筋 | 5 | /assets/game-icons/hero-skills/jackie/skill-1-w-1001300.png |

### 2 阿雅 (Aya)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1002400 | 转弯 | 5 | /assets/game-icons/hero-skills/aya/skill-2-e-1002400.png |
| Q | 1002200 | 二连射 | 5 | /assets/game-icons/hero-skills/aya/skill-2-q-1002200.png |
| R | 1002500 | 空弹 | 3 | /assets/game-icons/hero-skills/aya/skill-2-r-1002500.png |
| T | 1002100 | 阿雅之正义 | 2 | /assets/game-icons/hero-skills/aya/skill-2-t-1002100.png |
| W | 1002300 | 稳定射击 | 5 | /assets/game-icons/hero-skills/aya/skill-2-w-1002300.png |

### 3 菲欧娜 (Fiora)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1003400 | 前进&后退 | 5 | /assets/game-icons/hero-skills/fiora/skill-3-e-1003400.png |
| Q | 1003200 | 长刺 | 5 | /assets/game-icons/hero-skills/fiora/skill-3-q-1003200.png |
| R | 1003500 | 飞刺 | 3 | /assets/game-icons/hero-skills/fiora/skill-3-r-1003500.png |
| T | 1003100 | 刺击 | 2 | /assets/game-icons/hero-skills/fiora/skill-3-t-1003100.png |
| W | 1003300 | 复杂进攻 | 5 | /assets/game-icons/hero-skills/fiora/skill-3-w-1003300.png |

### 4 马格努斯 (Magnus)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1004400 | 猛击 | 5 | /assets/game-icons/hero-skills/magnus/skill-4-e-1004400.png |
| Q | 1004200 | 破碎弹 | 5 | /assets/game-icons/hero-skills/magnus/skill-4-q-1004200.png |
| R | 1004500 | 暴走飞车 | 3 | /assets/game-icons/hero-skills/magnus/skill-4-r-1004500.png |
| T | 1004100 | 意志 | 2 | /assets/game-icons/hero-skills/magnus/skill-4-t-1004100.png |
| W | 1004300 | 17对1 | 5 | /assets/game-icons/hero-skills/magnus/skill-4-w-1004300.png |

### 5 扎希尔 (Zahir)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1005400 | 风神法宝 | 5 | /assets/game-icons/hero-skills/zahir/skill-5-e-1005400.png |
| Q | 1005200 | 那罗延法宝 | 5 | /assets/game-icons/hero-skills/zahir/skill-5-q-1005200.png |
| R | 1005500 | 跋尔伽婆 | 3 | /assets/game-icons/hero-skills/zahir/skill-5-r-1005500.png |
| T | 1005100 | 死神之目 | 2 | /assets/game-icons/hero-skills/zahir/skill-5-t-1005100.png |
| W | 1005300 | 甘狄拔 | 5 | /assets/game-icons/hero-skills/zahir/skill-5-w-1005300.png |

### 6 娜町 (Nadine)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1006400 | 猿猴的钢丝绳 | 5 | /assets/game-icons/hero-skills/nadine/skill-6-e-1006400.png |
| Q | 1006200 | 黄牛之眼 | 5 | /assets/game-icons/hero-skills/nadine/skill-6-q-1006200.png |
| R | 1006500 | 狼之猛袭 | 3 | /assets/game-icons/hero-skills/nadine/skill-6-r-1006500.png |
| T | 1006100 | 野性 | 2 | /assets/game-icons/hero-skills/nadine/skill-6-t-1006100.png |
| W | 1006300 | 松鼠陷阱 | 5 | /assets/game-icons/hero-skills/nadine/skill-6-w-1006300.png |

### 7 玄佑 (Hyunwoo)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1007400 | 先发制人 | 5 | /assets/game-icons/hero-skills/hyunwoo/skill-7-e-1007400.png |
| Q | 1007200 | 踩踏 | 5 | /assets/game-icons/hero-skills/hyunwoo/skill-7-q-1007200.png |
| R | 1007500 | 核冲击 | 3 | /assets/game-icons/hero-skills/hyunwoo/skill-7-r-1007500.png |
| T | 1007100 | 鏖战 | 2 | /assets/game-icons/hero-skills/hyunwoo/skill-7-t-1007100.png |
| W | 1007300 | 虚张声势 | 5 | /assets/game-icons/hero-skills/hyunwoo/skill-7-w-1007300.png |

### 8 哈特 (Hart)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1008400 | 震音 | 5 | /assets/game-icons/hero-skills/hart/skill-8-e-1008400.png |
| Q | 1008200 | 延音 | 5 | /assets/game-icons/hero-skills/hart/skill-8-q-1008200.png |
| R | 1008500 | Peacemaker | 3 | /assets/game-icons/hero-skills/hart/skill-8-r-1008500.png |
| T | 1008100 | 心灵治愈 | 2 | /assets/game-icons/hero-skills/hart/skill-8-t-1008100.png |
| W | 1008300 | 破音 | 5 | /assets/game-icons/hero-skills/hart/skill-8-w-1008300.png |

### 9 埃索 (Isol)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1009400 | 伪装潜行 | 5 | /assets/game-icons/hero-skills/isol/skill-9-e-1009400.png |
| Q | 1009200 | 军事用炸药 | 5 | /assets/game-icons/hero-skills/isol/skill-9-q-1009200.png |
| R | 1009500 | MOK 军用地雷 | 3 | /assets/game-icons/hero-skills/isol/skill-9-r-1009500.png |
| T | 1009100 | 游击战术 | 2 | /assets/game-icons/hero-skills/isol/skill-9-t-1009100.png |
| W | 1009300 | 叛军突击 | 5 | /assets/game-icons/hero-skills/isol/skill-9-w-1009300.png |

### 10 李黛琳 (LiDailin)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1010400 | 醉蝶敬酒 | 5 | /assets/game-icons/hero-skills/li-dailin/skill-10-e-1010400.png |
| Q | 1010200 | 八卦回龙腿 | 5 | /assets/game-icons/hero-skills/li-dailin/skill-10-q-1010200.png |
| R | 1010500 | 猛虎穿心踢 | 3 | /assets/game-icons/hero-skills/li-dailin/skill-10-r-1010500.png |
| T | 1010100 | 酒醉值 | 2 | /assets/game-icons/hero-skills/li-dailin/skill-10-t-1010100.png |
| W | 1010300 | 醉葫猛酌 | 5 | /assets/game-icons/hero-skills/li-dailin/skill-10-w-1010300.png |

### 11 雪 (Yuki)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1011400 | 樱花流 | 5 | /assets/game-icons/hero-skills/yuki/skill-11-e-1011400.png |
| Q | 1011200 | 气刃斩 | 5 | /assets/game-icons/hero-skills/yuki/skill-11-q-1011200.png |
| R | 1011500 | 樱月剑舞 | 3 | /assets/game-icons/hero-skills/yuki/skill-11-r-1011500.png |
| T | 1011100 | 武装式 | 2 | /assets/game-icons/hero-skills/yuki/skill-11-t-1011100.png |
| W | 1011300 | 武士道 | 5 | /assets/game-icons/hero-skills/yuki/skill-11-w-1011300.png |

### 12 慧珍 (Hyejin)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1012400 | 移动符 | 5 | /assets/game-icons/hero-skills/hyejin/skill-12-e-1012400.png |
| Q | 1012200 | 镇压符 | 5 | /assets/game-icons/hero-skills/hyejin/skill-12-q-1012200.png |
| R | 1012500 | 五大明王阵 | 3 | /assets/game-icons/hero-skills/hyejin/skill-12-r-1012500.png |
| T | 1012100 | 三灾 | 2 | /assets/game-icons/hero-skills/hyejin/skill-12-t-1012100.png |
| W | 1012300 | 吸灵符 | 5 | /assets/game-icons/hero-skills/hyejin/skill-12-w-1012300.png |

### 13 修凯 (Xiukai)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1013400 | 翻滚吧！锅子！ | 5 | /assets/game-icons/hero-skills/xiukai/skill-13-e-1013400.png |
| E | 1013410 | 盛宴 | 5 | /assets/game-icons/hero-skills/xiukai/skill-13-e-1013410.png |
| Q | 1013200 | 秘制酱油 | 5 | /assets/game-icons/hero-skills/xiukai/skill-13-q-1013200.png |
| R | 1013500 | 火冒三丈 | 3 | /assets/game-icons/hero-skills/xiukai/skill-13-r-1013500.png |
| T | 1013100 | 料理师的热情 | 2 | /assets/game-icons/hero-skills/xiukai/skill-13-t-1013100.png |
| W | 1013300 | 吃饭时间 | 5 | /assets/game-icons/hero-skills/xiukai/skill-13-w-1013300.png |

### 14 奇娅拉 (Chiara)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1014400 | 深渊枷锁 | 5 | /assets/game-icons/hero-skills/chiara/skill-14-e-1014400.png |
| Q | 1014200 | 暗之洗礼 | 5 | /assets/game-icons/hero-skills/chiara/skill-14-q-1014200.png |
| R | 1014500 | 献祭炼狱 | 3 | /assets/game-icons/hero-skills/chiara/skill-14-r-1014500.png |
| R | 1014510 | 最后的审判 | 3 | /assets/game-icons/hero-skills/chiara/skill-14-r-1014510.png |
| T | 1014100 | 烙印 | 2 | /assets/game-icons/hero-skills/chiara/skill-14-t-1014100.png |
| W | 1014300 | 不贞洁的祈祷 | 5 | /assets/game-icons/hero-skills/chiara/skill-14-w-1014300.png |

### 15 希瑟拉 (Sissela)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1015400 | 一起玩吧！ | 5 | /assets/game-icons/hero-skills/sissela/skill-15-e-1015400.png |
| Q | 1015200 | 去吧！威尔逊！ | 5 | /assets/game-icons/hero-skills/sissela/skill-15-q-1015200.png |
| R | 1015500 | 最终解脱 | 3 | /assets/game-icons/hero-skills/sissela/skill-15-r-1015500.png |
| T | 1015100 | 苦痛的记忆 | 2 | /assets/game-icons/hero-skills/sissela/skill-15-t-1015100.png |
| W | 1015300 | 小威！保护我！ | 5 | /assets/game-icons/hero-skills/sissela/skill-15-w-1015300.png |

### 16 西尔维娅 (Silvia)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1016400 | 备用轮 | 5 | /assets/game-icons/hero-skills/silvia/skill-16-e-1016400.png |
| E | 1016800 | 孤轮疾驰 | 5 | /assets/game-icons/hero-skills/silvia/skill-16-e-1016800.png |
| Q | 1016200 | 雷达枪 | 5 | /assets/game-icons/hero-skills/silvia/skill-16-q-1016200.png |
| Q | 1016600 | 闪电旋转 | 5 | /assets/game-icons/hero-skills/silvia/skill-16-q-1016600.png |
| R | 1016500 | 极限骑乘 | 3 | /assets/game-icons/hero-skills/silvia/skill-16-r-1016500.png |
| R | 1016900 | 极限骑乘 | 3 | /assets/game-icons/hero-skills/silvia/skill-16-r-1016900.png |
| T | 1016100 | 卢米亚越野赛 | 2 | /assets/game-icons/hero-skills/silvia/skill-16-t-1016100.png |
| W | 1016300 | 终点线 | 5 | /assets/game-icons/hero-skills/silvia/skill-16-w-1016300.png |
| W | 1016700 | 腾空飞跃 | 5 | /assets/game-icons/hero-skills/silvia/skill-16-w-1016700.png |

### 17 阿德瑞娜 (Adriana)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1017400 | Fire Walker | 5 | /assets/game-icons/hero-skills/adriana/skill-17-e-1017400.png |
| Q | 1017200 | 火焰发射 | 5 | /assets/game-icons/hero-skills/adriana/skill-17-q-1017200.png |
| R | 1017500 | 莫洛托夫燃烧瓶 | 3 | /assets/game-icons/hero-skills/adriana/skill-17-r-1017500.png |
| T | 1017100 | 纵火狂 | 2 | /assets/game-icons/hero-skills/adriana/skill-17-t-1017100.png |
| W | 1017300 | 原油弹 | 5 | /assets/game-icons/hero-skills/adriana/skill-17-w-1017300.png |

### 18 彰一 (Shoichi)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1018400 | 协商 | 5 | /assets/game-icons/hero-skills/shoichi/skill-18-e-1018400.png |
| Q | 1018200 | 双面人 | 5 | /assets/game-icons/hero-skills/shoichi/skill-18-q-1018200.png |
| R | 1018500 | 无情杀戮 | 3 | /assets/game-icons/hero-skills/shoichi/skill-18-r-1018500.png |
| T | 1018100 | 骗局 | 2 | /assets/game-icons/hero-skills/shoichi/skill-18-t-1018100.png |
| W | 1018300 | 提案 | 5 | /assets/game-icons/hero-skills/shoichi/skill-18-w-1018300.png |

### 19 艾玛 (Emma)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1019400 | 百变魔兔 | 5 | /assets/game-icons/hero-skills/emma/skill-19-e-1019400.png |
| Q | 1019200 | 鸽子魔术秀 | 5 | /assets/game-icons/hero-skills/emma/skill-19-q-1019200.png |
| R | 1019500 | Change★ | 3 | /assets/game-icons/hero-skills/emma/skill-19-r-1019500.png |
| T | 1019100 | CheerUP♥ | 2 | /assets/game-icons/hero-skills/emma/skill-19-t-1019100.png |
| W | 1019300 | 不思议帽子 | 5 | /assets/game-icons/hero-skills/emma/skill-19-w-1019300.png |

### 20 伦诺克斯 (Lenox)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1020400 | 反向双钓 | 5 | /assets/game-icons/hero-skills/lenox/skill-20-e-1020400.png |
| Q | 1020200 | 蛇影舞 | 5 | /assets/game-icons/hero-skills/lenox/skill-20-q-1020200.png |
| R | 1020500 | 青蛇 | 3 | /assets/game-icons/hero-skills/lenox/skill-20-r-1020500.png |
| T | 1020100 | 神钓手的直觉 | 2 | /assets/game-icons/hero-skills/lenox/skill-20-t-1020100.png |
| W | 1020300 | 蔓藤毒牙 | 5 | /assets/game-icons/hero-skills/lenox/skill-20-w-1020300.png |

### 21 洛兹 (Rozzi)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1021400 | 中空弹 | 5 | /assets/game-icons/hero-skills/rozzi/skill-21-e-1021400.png |
| Q | 1021200 | 随意射击 | 5 | /assets/game-icons/hero-skills/rozzi/skill-21-q-1021200.png |
| R | 1021500 | 塞姆汀高爆弹 Mk-II | 3 | /assets/game-icons/hero-skills/rozzi/skill-21-r-1021500.png |
| T | 1021100 | 双杀 | 2 | /assets/game-icons/hero-skills/rozzi/skill-21-t-1021100.png |
| W | 1021300 | 全视角狙击 | 5 | /assets/game-icons/hero-skills/rozzi/skill-21-w-1021300.png |

### 22 卢克 (Luke)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1022400 | 无声扫除机 | 5 | /assets/game-icons/hero-skills/luke/skill-22-e-1022400.png |
| Q | 1022200 | 保洁服务 | 5 | /assets/game-icons/hero-skills/luke/skill-22-q-1022200.png |
| R | 1022500 | 售后服务 | 3 | /assets/game-icons/hero-skills/luke/skill-22-r-1022500.png |
| T | 1022100 | 完美管家 | 2 | /assets/game-icons/hero-skills/luke/skill-22-t-1022100.png |
| W | 1022300 | 强迫症 | 5 | /assets/game-icons/hero-skills/luke/skill-22-w-1022300.png |

### 23 凯希 (Cathy)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1023400 | 缝合 | 5 | /assets/game-icons/hero-skills/cathy/skill-23-e-1023400.png |
| Q | 1023200 | 动脉切开术 | 5 | /assets/game-icons/hero-skills/cathy/skill-23-q-1023200.png |
| R | 1023500 | 急诊手术 | 3 | /assets/game-icons/hero-skills/cathy/skill-23-r-1023500.png |
| T | 1023100 | 外科专家 | 2 | /assets/game-icons/hero-skills/cathy/skill-23-t-1023100.png |
| W | 1023300 | 截断 | 5 | /assets/game-icons/hero-skills/cathy/skill-23-w-1023300.png |

### 24 阿德拉 (Adela)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1024400 | 王翼易位 | 5 | /assets/game-icons/hero-skills/adela/skill-24-e-1024400.png |
| Q | 1024200 | 升变 | 5 | /assets/game-icons/hero-skills/adela/skill-24-q-1024200.png |
| R | 1024500 | 将军 | 3 | /assets/game-icons/hero-skills/adela/skill-24-r-1024500.png |
| T | 1024100 | 后翼守兵 | 2 | /assets/game-icons/hero-skills/adela/skill-24-t-1024100.png |
| W | 1024300 | 单马捉双 | 5 | /assets/game-icons/hero-skills/adela/skill-24-w-1024300.png |

### 25 伯尼斯 (Bernice)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1025400 | 鹰眼 | 5 | /assets/game-icons/hero-skills/bernice/skill-25-e-1025400.png |
| Q | 1025200 | 致瘸射击 | 5 | /assets/game-icons/hero-skills/bernice/skill-25-q-1025200.png |
| R | 1025500 | 奥尔加米・星锤 | 3 | /assets/game-icons/hero-skills/bernice/skill-25-r-1025500.png |
| T | 1025100 | 散弹 | 2 | /assets/game-icons/hero-skills/bernice/skill-25-t-1025100.png |
| W | 1025300 | 捕兽夹 | 5 | /assets/game-icons/hero-skills/bernice/skill-25-w-1025300.png |

### 26 芭芭拉 (Barbara)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1026400 | 闪光弹 | 5 | /assets/game-icons/hero-skills/barbara/skill-26-e-1026400.png |
| Q | 1026200 | BT-Mk II 远程无人机 | 5 | /assets/game-icons/hero-skills/barbara/skill-26-q-1026200.png |
| R | 1026500 | 超时实验 | 3 | /assets/game-icons/hero-skills/barbara/skill-26-r-1026500.png |
| T | 1026100 | 改造 | 2 | /assets/game-icons/hero-skills/barbara/skill-26-t-1026100.png |
| W | 1026300 | 离子激光炮 | 5 | /assets/game-icons/hero-skills/barbara/skill-26-w-1026300.png |

### 27 亚历克斯 (Alex)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1027400 | 电脉回力镖 | 5 | /assets/game-icons/hero-skills/alex/skill-27-e-1027400.png |
| E | 1027800 | 无间投影 | 5 | /assets/game-icons/hero-skills/alex/skill-27-e-1027800.png |
| Q | 1027200 | 伏特枪 | 5 | /assets/game-icons/hero-skills/alex/skill-27-q-1027200.png |
| Q | 1027600 | 突袭 | 5 | /assets/game-icons/hero-skills/alex/skill-27-q-1027600.png |
| R | 1027500 | 精准轰炸 | 3 | /assets/game-icons/hero-skills/alex/skill-27-r-1027500.png |
| T | 1027100 | 潜行 | 2 | /assets/game-icons/hero-skills/alex/skill-27-t-1027100.png |
| W | 1027300 | 间谍探测仪 | 5 | /assets/game-icons/hero-skills/alex/skill-27-w-1027300.png |
| W | 1027700 | 电浆地雷 | 5 | /assets/game-icons/hero-skills/alex/skill-27-w-1027700.png |

### 28 秀雅 (Sua)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1028400 | 堂吉诃德 | 5 | /assets/game-icons/hero-skills/sua/skill-28-e-1028400.png |
| Q | 1028200 | 奥德赛 | 5 | /assets/game-icons/hero-skills/sua/skill-28-q-1028200.png |
| R | 1028500 | 记忆力 | 3 | /assets/game-icons/hero-skills/sua/skill-28-r-1028500.png |
| T | 1028100 | 精神食粮 | 2 | /assets/game-icons/hero-skills/sua/skill-28-t-1028100.png |
| W | 1028300 | 青鸟 | 5 | /assets/game-icons/hero-skills/sua/skill-28-w-1028300.png |

### 29 里昂 (Leon)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1029400 | 潜移 | 5 | /assets/game-icons/hero-skills/leon/skill-29-e-1029400.png |
| Q | 1029200 | 水路 | 5 | /assets/game-icons/hero-skills/leon/skill-29-q-1029200.png |
| R | 1029500 | 冲浪 | 3 | /assets/game-icons/hero-skills/leon/skill-29-r-1029500.png |
| T | 1029100 | 人体鱼雷 | 2 | /assets/game-icons/hero-skills/leon/skill-29-t-1029100.png |
| W | 1029300 | 水武间 | 5 | /assets/game-icons/hero-skills/leon/skill-29-w-1029300.png |

### 30 Eleven (Eleven)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1030400 | 汉堡骑越 | 5 | /assets/game-icons/hero-skills/eleven/skill-30-e-1030400.png |
| Q | 1030200 | 汉堡少女 | 5 | /assets/game-icons/hero-skills/eleven/skill-30-q-1030200.png |
| R | 1030500 | 美食风暴 | 3 | /assets/game-icons/hero-skills/eleven/skill-30-r-1030500.png |
| T | 1030100 | 美食主播 | 2 | /assets/game-icons/hero-skills/eleven/skill-30-t-1030100.png |
| W | 1030300 | 开播啦！ | 5 | /assets/game-icons/hero-skills/eleven/skill-30-w-1030300.png |

### 31 莉央 (Rio)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1031400 | 箭越 | 5 | /assets/game-icons/hero-skills/rio/skill-31-e-1031400.png |
| Q | 1031200 | 替弓 | 5 | /assets/game-icons/hero-skills/rio/skill-31-q-1031200.png |
| R | 1031500 | 连矢 / 正射必中 | 3 | /assets/game-icons/hero-skills/rio/skill-31-r-1031500.png |
| T | 1031100 | 集中 | 2 | /assets/game-icons/hero-skills/rio/skill-31-t-1031100.png |
| W | 1031300 | 分离 | 5 | /assets/game-icons/hero-skills/rio/skill-31-w-1031300.png |

### 32 威廉 (William)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1032400 | 滑垒接球 | 5 | /assets/game-icons/hero-skills/william/skill-32-e-1032400.png |
| Q | 1032200 | 变化球 | 5 | /assets/game-icons/hero-skills/william/skill-32-q-1032200.png |
| R | 1032500 | 王牌投球 | 3 | /assets/game-icons/hero-skills/william/skill-32-r-1032500.png |
| T | 1032100 | 热身 | 2 | /assets/game-icons/hero-skills/william/skill-32-t-1032100.png |
| W | 1032300 | 挥臂投球 | 5 | /assets/game-icons/hero-skills/william/skill-32-w-1032300.png |

### 33 妮琪 (Nicky)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1033400 | 重拳 | 5 | /assets/game-icons/hero-skills/nicky/skill-33-e-1033400.png |
| E | 1033410 | 愤怒重拳！ | 5 | /assets/game-icons/hero-skills/nicky/skill-33-e-1033410.png |
| Q | 1033200 | 格斗动作 | 5 | /assets/game-icons/hero-skills/nicky/skill-33-q-1033200.png |
| Q | 1033210 | 特技动作 | 5 | /assets/game-icons/hero-skills/nicky/skill-33-q-1033210.png |
| R | 1033500 | 愤怒的上勾拳！ | 3 | /assets/game-icons/hero-skills/nicky/skill-33-r-1033500.png |
| T | 1033100 | 狂躁 | 2 | /assets/game-icons/hero-skills/nicky/skill-33-t-1033100.png |
| W | 1033300 | 格挡 & 反击 | 5 | /assets/game-icons/hero-skills/nicky/skill-33-w-1033300.png |

### 34 纳塔朋 (Nathapon)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1034400 | 时光倒影 | 5 | /assets/game-icons/hero-skills/nathapon/skill-34-e-1034400.png |
| Q | 1034200 | 快拍 | 5 | /assets/game-icons/hero-skills/nathapon/skill-34-q-1034200.png |
| R | 1034500 | 定位拍摄 | 3 | /assets/game-icons/hero-skills/nathapon/skill-34-r-1034500.png |
| T | 1034100 | 摄影技巧 | 2 | /assets/game-icons/hero-skills/nathapon/skill-34-t-1034100.png |
| W | 1034300 | 时间轨迹 | 5 | /assets/game-icons/hero-skills/nathapon/skill-34-w-1034300.png |

### 35 扬 (Jan)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1035400 | 闪烁 | 5 | /assets/game-icons/hero-skills/jan/skill-35-e-1035400.png |
| Q | 1035200 | 膝踢 | 5 | /assets/game-icons/hero-skills/jan/skill-35-q-1035200.png |
| Q | 1035210 | 飞膝踢 | 5 | /assets/game-icons/hero-skills/jan/skill-35-q-1035210.png |
| R | 1035500 | 擂台之魂 | 3 | /assets/game-icons/hero-skills/jan/skill-35-r-1035500.png |
| T | 1035100 | 狂热意志 | 2 | /assets/game-icons/hero-skills/jan/skill-35-t-1035100.png |
| W | 1035300 | 战斧飞踼 | 5 | /assets/game-icons/hero-skills/jan/skill-35-w-1035300.png |

### 36 伊娃 (Eva)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1036400 | 幻步 | 5 | /assets/game-icons/hero-skills/eva/skill-36-e-1036400.png |
| Q | 1036200 | 光影球 | 5 | /assets/game-icons/hero-skills/eva/skill-36-q-1036200.png |
| R | 1036500 | VF觉醒 | 3 | /assets/game-icons/hero-skills/eva/skill-36-r-1036500.png |
| T | 1036100 | 念力 | 2 | /assets/game-icons/hero-skills/eva/skill-36-t-1036100.png |
| W | 1036300 | 光之旋涡 | 5 | /assets/game-icons/hero-skills/eva/skill-36-w-1036300.png |

### 37 丹尼尔 (Daniel)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1037400 | 暗影刺客 | 5 | /assets/game-icons/hero-skills/daniel/skill-37-e-1037400.png |
| Q | 1037200 | 剪影 | 5 | /assets/game-icons/hero-skills/daniel/skill-37-q-1037200.png |
| R | 1037500 | 完美杰作 | 3 | /assets/game-icons/hero-skills/daniel/skill-37-r-1037500.png |
| T | 1037100 | 孤独的艺术家 | 2 | /assets/game-icons/hero-skills/daniel/skill-37-t-1037100.png |
| W | 1037300 | 灵感 | 5 | /assets/game-icons/hero-skills/daniel/skill-37-w-1037300.png |

### 38 珍妮 (Jenny)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1038400 | 演员的修养 | 5 | /assets/game-icons/hero-skills/jenny/skill-38-e-1038400.png |
| Q | 1038200 | 聚光灯 | 5 | /assets/game-icons/hero-skills/jenny/skill-38-q-1038200.png |
| R | 1038500 | 最佳女主角 | 3 | /assets/game-icons/hero-skills/jenny/skill-38-r-1038500.png |
| T | 1038100 | 死亡演技 | 2 | /assets/game-icons/hero-skills/jenny/skill-38-t-1038100.png |
| W | 1038300 | 红毯 | 5 | /assets/game-icons/hero-skills/jenny/skill-38-w-1038300.png |

### 39 卡米洛 (Camilo)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1039400 | 节奏乐 | 5 | /assets/game-icons/hero-skills/camilo/skill-39-e-1039400.png |
| Q | 1039200 | 弗拉门戈舞 | 5 | /assets/game-icons/hero-skills/camilo/skill-39-q-1039200.png |
| R | 1039500 | 舞者魅力 | 3 | /assets/game-icons/hero-skills/camilo/skill-39-r-1039500.png |
| T | 1039100 | Olé! | 2 | /assets/game-icons/hero-skills/camilo/skill-39-t-1039100.png |
| W | 1039300 | 终结舞曲 | 5 | /assets/game-icons/hero-skills/camilo/skill-39-w-1039300.png |

### 40 克洛伊 (Chloe)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1040400 | 扯线傀儡 | 5 | /assets/game-icons/hero-skills/chloe/skill-40-e-1040400.png |
| Q | 1040200 | 攻击指令 | 5 | /assets/game-icons/hero-skills/chloe/skill-40-q-1040200.png |
| R | 1040500 | 生命共享 | 3 | /assets/game-icons/hero-skills/chloe/skill-40-r-1040500.png |
| T | 1040100 | 人偶师 | 2 | /assets/game-icons/hero-skills/chloe/skill-40-t-1040100.png |
| W | 1040300 | 木偶戏 | 5 | /assets/game-icons/hero-skills/chloe/skill-40-w-1040300.png |

### 41 约翰 (Johann)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1041400 | 指引的光芒 | 5 | /assets/game-icons/hero-skills/johann/skill-41-e-1041400.png |
| Q | 1041200 | 圣光召唤 | 5 | /assets/game-icons/hero-skills/johann/skill-41-q-1041200.png |
| R | 1041500 | 救赎圣殿 | 3 | /assets/game-icons/hero-skills/johann/skill-41-r-1041500.png |
| T | 1041100 | 圣灵加护 | 2 | /assets/game-icons/hero-skills/johann/skill-41-t-1041100.png |
| W | 1041300 | 神圣的香炉 | 5 | /assets/game-icons/hero-skills/johann/skill-41-w-1041300.png |

### 42 比安卡 (Bianca)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1042400 | 血循环 | 5 | /assets/game-icons/hero-skills/bianca/skill-42-e-1042400.png |
| Q | 1042200 | 血之枪 | 5 | /assets/game-icons/hero-skills/bianca/skill-42-q-1042200.png |
| R | 1042500 | 血族女皇的契约 | 3 | /assets/game-icons/hero-skills/bianca/skill-42-r-1042500.png |
| T | 1042100 | 嗜血术 | 2 | /assets/game-icons/hero-skills/bianca/skill-42-t-1042100.png |
| W | 1042300 | 安息 | 5 | /assets/game-icons/hero-skills/bianca/skill-42-w-1042300.png |

### 43 席琳 (Celine)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1043400 | 闪爆弹 | 5 | /assets/game-icons/hero-skills/celine/skill-43-e-1043400.png |
| Q | 1043200 | 等离子炸弹 | 4 | /assets/game-icons/hero-skills/celine/skill-43-q-1043200.png |
| R | 1043500 | 磁力融合 | 5 | /assets/game-icons/hero-skills/celine/skill-43-r-1043500.png |
| T | 1043100 | 炸弹专家 | 1 | /assets/game-icons/hero-skills/celine/skill-43-t-1043100.png |
| W | 1043300 | 引爆 | 5 | /assets/game-icons/hero-skills/celine/skill-43-w-1043300.png |

### 44 厄喀翁 (Echion)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1044400 | 毒牙 | 5 | /assets/game-icons/hero-skills/echion/skill-44-e-1044400.png |
| Q | 1044200 | 毒蛇之刃 | 5 | /assets/game-icons/hero-skills/echion/skill-44-q-1044200.png |
| R | 1044500 | VF暴走[毒蛇] | 3 | /assets/game-icons/hero-skills/echion/skill-44-r-1044500.png |
| R | 1044510 | 蛇之震怒[毒蛇] | 3 | /assets/game-icons/hero-skills/echion/skill-44-r-1044510.png |
| T | 1044100 | 卡德摩斯的召唤 | 2 | /assets/game-icons/hero-skills/echion/skill-44-t-1044100.png |
| W | 1044300 | 龙鳞的逆袭 | 5 | /assets/game-icons/hero-skills/echion/skill-44-w-1044300.png |

### 45 梅 (Mai)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1045400 | 时装秀 | 5 | /assets/game-icons/hero-skills/mai/skill-45-e-1045400.png |
| E | 1045410 | 谢幕 | 5 | /assets/game-icons/hero-skills/mai/skill-45-e-1045410.png |
| Q | 1045200 | 垂缀 | 5 | /assets/game-icons/hero-skills/mai/skill-45-q-1045200.png |
| R | 1045500 | 最佳造型 | 3 | /assets/game-icons/hero-skills/mai/skill-45-r-1045500.png |
| T | 1045100 | 高级订制 | 2 | /assets/game-icons/hero-skills/mai/skill-45-t-1045100.png |
| W | 1045300 | 披肩面纱 | 5 | /assets/game-icons/hero-skills/mai/skill-45-w-1045300.png |

### 46 艾登 (Aiden)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1046400 | 后闪 | 5 | /assets/game-icons/hero-skills/aiden/skill-46-e-1046400.png |
| E | 1046410 | 伏特闪移 | 5 | /assets/game-icons/hero-skills/aiden/skill-46-e-1046410.png |
| Q | 1046200 | 雷击 | 5 | /assets/game-icons/hero-skills/aiden/skill-46-q-1046200.png |
| Q | 1046210 | 电子炮 | 5 | /assets/game-icons/hero-skills/aiden/skill-46-q-1046210.png |
| R | 1046500 | 落雷 | 3 | /assets/game-icons/hero-skills/aiden/skill-46-r-1046500.png |
| T | 1046100 | 超电荷 | 2 | /assets/game-icons/hero-skills/aiden/skill-46-t-1046100.png |
| W | 1046300 | 极电释放 | 5 | /assets/game-icons/hero-skills/aiden/skill-46-w-1046300.png |

### 47 劳拉 (Laura)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1047400 | 优雅的步伐 | 5 | /assets/game-icons/hero-skills/laura/skill-47-e-1047400.png |
| Q | 1047200 | 荆棘噬痕 | 5 | /assets/game-icons/hero-skills/laura/skill-47-q-1047200.png |
| R | 1047500 | 幻影神偷 | 3 | /assets/game-icons/hero-skills/laura/skill-47-r-1047500.png |
| T | 1047100 | 怪盗 | 2 | /assets/game-icons/hero-skills/laura/skill-47-t-1047100.png |
| W | 1047300 | 预告函 | 5 | /assets/game-icons/hero-skills/laura/skill-47-w-1047300.png |

### 48 蒂娅 (Tia)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1048600 | 着色 - 黄色 | 5 | /assets/game-icons/hero-skills/tia/skill-48-e-1048600.png |
| Q | 1048400 | 笔触 - 黄色 | 5 | /assets/game-icons/hero-skills/tia/skill-48-q-1048400.png |
| R | 1048700 | 彩虹魔咒 | 3 | /assets/game-icons/hero-skills/tia/skill-48-r-1048700.png |
| T | 1048100 | 色彩缤纷 | 4 | /assets/game-icons/hero-skills/tia/skill-48-t-1048100.png |
| W | 1048500 | 调色板 - 黄色 | 3 | /assets/game-icons/hero-skills/tia/skill-48-w-1048500.png |

### 49 费利克斯 (Felix)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1049400 | 半月斩 | 5 | /assets/game-icons/hero-skills/felix/skill-49-e-1049400.png |
| Q | 1049200 | 破风斩 | 5 | /assets/game-icons/hero-skills/felix/skill-49-q-1049200.png |
| R | 1049500 | 雷龙一击 | 3 | /assets/game-icons/hero-skills/felix/skill-49-r-1049500.png |
| T | 1049100 | 连结枪 | 2 | /assets/game-icons/hero-skills/felix/skill-49-t-1049100.png |
| W | 1049300 | 疾风雷击 | 5 | /assets/game-icons/hero-skills/felix/skill-49-w-1049300.png |

### 50 埃琳娜 (Elena)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1050400 | 飞燕 | 5 | /assets/game-icons/hero-skills/elena/skill-50-e-1050400.png |
| Q | 1050200 | 极冰 | 5 | /assets/game-icons/hero-skills/elena/skill-50-q-1050200.png |
| R | 1050500 | 霜心之舞 | 3 | /assets/game-icons/hero-skills/elena/skill-50-r-1050500.png |
| T | 1050100 | 女王的冰封领域 | 2 | /assets/game-icons/hero-skills/elena/skill-50-t-1050100.png |
| W | 1050300 | 双旋击 | 5 | /assets/game-icons/hero-skills/elena/skill-50-w-1050300.png |

### 51 普里亚 (Priya)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1051400 | 禁忌之歌 | 5 | /assets/game-icons/hero-skills/priya/skill-51-e-1051400.png |
| Q | 1051200 | 绽放的旋律 | 5 | /assets/game-icons/hero-skills/priya/skill-51-q-1051200.png |
| R | 1051500 | 万物之音 | 3 | /assets/game-icons/hero-skills/priya/skill-51-r-1051500.png |
| T | 1051100 | 大自然的呼唤 | 2 | /assets/game-icons/hero-skills/priya/skill-51-t-1051100.png |
| W | 1051300 | 音刃 | 5 | /assets/game-icons/hero-skills/priya/skill-51-w-1051300.png |

### 52 阿迪娜 (Adina)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1052400 | 星体陷落 | 5 | /assets/game-icons/hero-skills/adina/skill-52-e-1052400.png |
| Q | 1052200 | 星芒万丈 | 5 | /assets/game-icons/hero-skills/adina/skill-52-q-1052200.png |
| R | 1052500 | 水晶球的预言 | 3 | /assets/game-icons/hero-skills/adina/skill-52-r-1052500.png |
| T | 1052100 | 观星 | 2 | /assets/game-icons/hero-skills/adina/skill-52-t-1052100.png |
| W | 1052300 | 日月星界 | 5 | /assets/game-icons/hero-skills/adina/skill-52-w-1052300.png |

### 53 马库斯 (Markus)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1053400 | 进击的战士 | 5 | /assets/game-icons/hero-skills/markus/skill-53-e-1053400.png |
| Q | 1053200 | 胜利法则 | 5 | /assets/game-icons/hero-skills/markus/skill-53-q-1053200.png |
| R | 1053500 | 诛天灭地 | 3 | /assets/game-icons/hero-skills/markus/skill-53-r-1053500.png |
| T | 1053100 | 战斗的气息 | 2 | /assets/game-icons/hero-skills/markus/skill-53-t-1053100.png |
| W | 1053300 | 毁击 | 5 | /assets/game-icons/hero-skills/markus/skill-53-w-1053300.png |

### 54 卡拉 (Karla)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1054400 | 海员登陆 | 5 | /assets/game-icons/hero-skills/karla/skill-54-e-1054400.png |
| Q | 1054200 | 鱼叉穿刺 | 5 | /assets/game-icons/hero-skills/karla/skill-54-q-1054200.png |
| R | 1054500 | 魂锁炼狱 | 3 | /assets/game-icons/hero-skills/karla/skill-54-r-1054500.png |
| T | 1054100 | 水手的较量 | 2 | /assets/game-icons/hero-skills/karla/skill-54-t-1054100.png |
| W | 1054300 | 回收 | 5 | /assets/game-icons/hero-skills/karla/skill-54-w-1054300.png |

### 55 艾丝蒂尔 (Estelle)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1055400 | 盾牌防御 | 5 | /assets/game-icons/hero-skills/estelle/skill-55-e-1055400.png |
| E | 1055410 | 盾牌冲锋 | 5 | /assets/game-icons/hero-skills/estelle/skill-55-e-1055410.png |
| Q | 1055200 | 镇压 | 5 | /assets/game-icons/hero-skills/estelle/skill-55-q-1055200.png |
| R | 1055500 | 空中救援 | 3 | /assets/game-icons/hero-skills/estelle/skill-55-r-1055500.png |
| T | 1055100 | 使命召唤 | 2 | /assets/game-icons/hero-skills/estelle/skill-55-t-1055100.png |
| W | 1055300 | 临危应对 | 5 | /assets/game-icons/hero-skills/estelle/skill-55-w-1055300.png |
| W | 1055310 | 紧急灭火 | 5 | /assets/game-icons/hero-skills/estelle/skill-55-w-1055310.png |

### 56 皮奥洛 (Piolo)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1056400 | 白蛇吐信&上劈 | 5 | /assets/game-icons/hero-skills/piolo/skill-56-e-1056400.png |
| Q | 1056200 | 狂龙乱舞&下劈 | 5 | /assets/game-icons/hero-skills/piolo/skill-56-q-1056200.png |
| R | 1056500 | 惩戒者 | 3 | /assets/game-icons/hero-skills/piolo/skill-56-r-1056500.png |
| T | 1056100 | 锻炼狂 | 2 | /assets/game-icons/hero-skills/piolo/skill-56-t-1056100.png |
| W | 1056300 | 流星赶月&翻转 | 5 | /assets/game-icons/hero-skills/piolo/skill-56-w-1056300.png |

### 57 玛蒂娜 (Martina)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1057400 | 倒带 - 采访中 | 5 | /assets/game-icons/hero-skills/martina/skill-57-e-1057400.png |
| Q | 1057200 | 快进 - 采访中 | 5 | /assets/game-icons/hero-skills/martina/skill-57-q-1057200.png |
| R | 1057500 | 录像 - 采访中 | 3 | /assets/game-icons/hero-skills/martina/skill-57-r-1057500.png |
| T | 1057100 | 播放 | 2 | /assets/game-icons/hero-skills/martina/skill-57-t-1057100.png |
| W | 1057300 | 暂停 - 采访中 | 5 | /assets/game-icons/hero-skills/martina/skill-57-w-1057300.png |

### 58 海因茨 (Haze)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1058400 | 冲锋枪 | 5 | /assets/game-icons/hero-skills/haze/skill-58-e-1058400.png |
| Q | 1058200 | 40mm手榴弹 | 5 | /assets/game-icons/hero-skills/haze/skill-58-q-1058200.png |
| Q | 1058210 | 冲锋枪连发 | 5 | /assets/game-icons/hero-skills/haze/skill-58-q-1058210.png |
| Q | 1058220 | 火箭加速器 | 5 | /assets/game-icons/hero-skills/haze/skill-58-q-1058220.png |
| R | 1058500 | 火箭发射器 | 3 | /assets/game-icons/hero-skills/haze/skill-58-r-1058500.png |
| T | 1058100 | 武器箱 | 2 | /assets/game-icons/hero-skills/haze/skill-58-t-1058100.png |
| W | 1058300 | 霰弹炮 | 5 | /assets/game-icons/hero-skills/haze/skill-58-w-1058300.png |

### 59 伊萨克 (Isaac)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1059400 | 追击 / 扣押 | 5 | /assets/game-icons/hero-skills/isaac/skill-59-e-1059400.png |
| Q | 1059200 | 突袭行动 | 5 | /assets/game-icons/hero-skills/isaac/skill-59-q-1059200.png |
| R | 1059500 | 湮灭 | 3 | /assets/game-icons/hero-skills/isaac/skill-59-r-1059500.png |
| T | 1059100 | 管制 | 2 | /assets/game-icons/hero-skills/isaac/skill-59-t-1059100.png |
| W | 1059300 | 武装硬化 | 5 | /assets/game-icons/hero-skills/isaac/skill-59-w-1059300.png |

### 60 塔齐娅 (Tazia)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1060400 | 清场 | 5 | /assets/game-icons/hero-skills/tazia/skill-60-e-1060400.png |
| Q | 1060200 | 凌空碎 | 5 | /assets/game-icons/hero-skills/tazia/skill-60-q-1060200.png |
| Q | 1060210 | 破空斩 | 5 | /assets/game-icons/hero-skills/tazia/skill-60-q-1060210.png |
| R | 1060500 | 璃之境 | 3 | /assets/game-icons/hero-skills/tazia/skill-60-r-1060500.png |
| T | 1060100 | 匠心工艺 | 2 | /assets/game-icons/hero-skills/tazia/skill-60-t-1060100.png |
| W | 1060300 | 败作 | 5 | /assets/game-icons/hero-skills/tazia/skill-60-w-1060300.png |

### 61 爱琳 (Irem)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1061400 | 喵步轻俏 | 5 | /assets/game-icons/hero-skills/irem/skill-61-e-1061400.png |
| E | 1061410 | 喵翻滚 | 5 | /assets/game-icons/hero-skills/irem/skill-61-e-1061410.png |
| Q | 1061200 | 跳跳球 | 5 | /assets/game-icons/hero-skills/irem/skill-61-q-1061200.png |
| Q | 1061210 | 无敌喵喵拳 | 5 | /assets/game-icons/hero-skills/irem/skill-61-q-1061210.png |
| R | 1061500 | 变身喵咪！ | 3 | /assets/game-icons/hero-skills/irem/skill-61-r-1061500.png |
| R | 1061510 | 爱琳登场！ | 3 | /assets/game-icons/hero-skills/irem/skill-61-r-1061510.png |
| T | 1061100 | 喵星人的习性 | 2 | /assets/game-icons/hero-skills/irem/skill-61-t-1061100.png |
| W | 1061300 | 喵言喵语 | 5 | /assets/game-icons/hero-skills/irem/skill-61-w-1061300.png |
| W | 1061310 | 喵心不悦 | 5 | /assets/game-icons/hero-skills/irem/skill-61-w-1061310.png |

### 62 西奥多 (Theodore)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1062400 | 磁力手雷 | 5 | /assets/game-icons/hero-skills/theodore/skill-62-e-1062400.png |
| Q | 1062200 | 聚能磁轨炮 | 5 | /assets/game-icons/hero-skills/theodore/skill-62-q-1062200.png |
| R | 1062500 | 能源飓风 | 3 | /assets/game-icons/hero-skills/theodore/skill-62-r-1062500.png |
| T | 1062100 | 蓝宝石协议 | 2 | /assets/game-icons/hero-skills/theodore/skill-62-t-1062100.png |
| W | 1062300 | 裂变能源屏 | 5 | /assets/game-icons/hero-skills/theodore/skill-62-w-1062300.png |

### 63 伊安 (Lyanh)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1063400 | 闪开！/ 鬼灵利爪 | 5 | /assets/game-icons/hero-skills/lyanh/skill-63-e-1063400.png |
| Q | 1063200 | 躲避！/ 地狱鬼手 | 5 | /assets/game-icons/hero-skills/lyanh/skill-63-q-1063200.png |
| R | 1063500 | 解放肉身 | 3 | /assets/game-icons/hero-skills/lyanh/skill-63-r-1063500.png |
| T | 1063100 | 被禁锢的肉身 | 2 | /assets/game-icons/hero-skills/lyanh/skill-63-t-1063100.png |
| W | 1063300 | 对不起.. / 血染之指 | 5 | /assets/game-icons/hero-skills/lyanh/skill-63-w-1063300.png |

### 64 万尼亚 (Vanya)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1064400 | 祈愿 | 5 | /assets/game-icons/hero-skills/vanya/skill-64-e-1064400.png |
| Q | 1064200 | 蝶向 | 5 | /assets/game-icons/hero-skills/vanya/skill-64-q-1064200.png |
| R | 1064500 | 蝶之羽翼 | 3 | /assets/game-icons/hero-skills/vanya/skill-64-r-1064500.png |
| T | 1064100 | 幻蝶如梦 | 2 | /assets/game-icons/hero-skills/vanya/skill-64-t-1064100.png |
| W | 1064300 | 青风 | 5 | /assets/game-icons/hero-skills/vanya/skill-64-w-1064300.png |

### 65 黛比&玛莲 (DebiMarlene)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1065400 | 守护我，玛莲！ | 5 | /assets/game-icons/hero-skills/debi-marlene/skill-65-e-1065400.png |
| E | 1065410 | 就是现在，黛比！ | 5 | /assets/game-icons/hero-skills/debi-marlene/skill-65-e-1065410.png |
| Q | 1065200 | 靛风斩 | 5 | /assets/game-icons/hero-skills/debi-marlene/skill-65-q-1065200.png |
| Q | 1065210 | 赤月斩 | 5 | /assets/game-icons/hero-skills/debi-marlene/skill-65-q-1065210.png |
| R | 1065500 | 靛赤双生 | 3 | /assets/game-icons/hero-skills/debi-marlene/skill-65-r-1065500.png |
| T | 1065100 | 靛与赤 | 2 | /assets/game-icons/hero-skills/debi-marlene/skill-65-t-1065100.png |
| W | 1065300 | 靛旋之舞 | 5 | /assets/game-icons/hero-skills/debi-marlene/skill-65-w-1065300.png |
| W | 1065310 | 赤月之舞 | 5 | /assets/game-icons/hero-skills/debi-marlene/skill-65-w-1065310.png |

### 66 阿尔达 (Arda)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1066400 | 尼姆鲁德石碑 | 5 | /assets/game-icons/hero-skills/arda/skill-66-e-1066400.png |
| Q | 1066200 | 沙玛什卷轴 | 5 | /assets/game-icons/hero-skills/arda/skill-66-q-1066200.png |
| R | 1066500 | 沉睡之力 | 3 | /assets/game-icons/hero-skills/arda/skill-66-r-1066500.png |
| T | 1066100 | 文物探索 | 2 | /assets/game-icons/hero-skills/arda/skill-66-t-1066100.png |
| W | 1066300 | 巴比伦魔方 | 5 | /assets/game-icons/hero-skills/arda/skill-66-w-1066300.png |

### 67 艾比盖尔 (Abigail)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1067400 | 维度跃迁 | 5 | /assets/game-icons/hero-skills/abigail/skill-67-e-1067400.png |
| Q | 1067200 | 二元自旋 | 5 | /assets/game-icons/hero-skills/abigail/skill-67-q-1067200.png |
| R | 1067500 | 次元时空 | 3 | /assets/game-icons/hero-skills/abigail/skill-67-r-1067500.png |
| T | 1067100 | 撕裂之刃 | 2 | /assets/game-icons/hero-skills/abigail/skill-67-t-1067100.png |
| W | 1067300 | 时空交错 | 5 | /assets/game-icons/hero-skills/abigail/skill-67-w-1067300.png |

### 68 阿隆索 (Alonso)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1068400 | 磁吸冲击 | 5 | /assets/game-icons/hero-skills/alonso/skill-68-e-1068400.png |
| Q | 1068200 | 磁石之握 | 5 | /assets/game-icons/hero-skills/alonso/skill-68-q-1068200.png |
| R | 1068500 | 磁吸漩涡 | 3 | /assets/game-icons/hero-skills/alonso/skill-68-r-1068500.png |
| T | 1068100 | 等离子抗盾 | 2 | /assets/game-icons/hero-skills/alonso/skill-68-t-1068100.png |
| W | 1068300 | 磁盾光波 | 5 | /assets/game-icons/hero-skills/alonso/skill-68-w-1068300.png |

### 69 雷妮 (Leni)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1069400 | 欢迎喇叭 | 5 | /assets/game-icons/hero-skills/leni/skill-69-e-1069400.png |
| Q | 1069200 | 胡萝卜火箭炮 | 5 | /assets/game-icons/hero-skills/leni/skill-69-q-1069200.png |
| R | 1069500 | 小熊出没 | 3 | /assets/game-icons/hero-skills/leni/skill-69-r-1069500.png |
| T | 1069100 | 熊熊出动！ | 2 | /assets/game-icons/hero-skills/leni/skill-69-t-1069100.png |
| W | 1069300 | 咻~ 弹跳锤！ | 5 | /assets/game-icons/hero-skills/leni/skill-69-w-1069300.png |

### 70 燕翼 (Tsubame)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1070400 | 雾隐之术 | 5 | /assets/game-icons/hero-skills/tsubame/skill-70-e-1070400.png |
| Q | 1070200 | 螺旋手里剑 | 5 | /assets/game-icons/hero-skills/tsubame/skill-70-q-1070200.png |
| R | 1070500 | 日车流暗杀术 | 3 | /assets/game-icons/hero-skills/tsubame/skill-70-r-1070500.png |
| T | 1070100 | 奥义 - 生死印记 | 2 | /assets/game-icons/hero-skills/tsubame/skill-70-t-1070100.png |
| W | 1070300 | 踏燕 | 5 | /assets/game-icons/hero-skills/tsubame/skill-70-w-1070300.png |

### 71 肯尼思 (Kenneth)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1071400 | 猛进 | 5 | /assets/game-icons/hero-skills/kenneth/skill-71-e-1071400.png |
| Q | 1071200 | 烈焰一击 | 5 | /assets/game-icons/hero-skills/kenneth/skill-71-q-1071200.png |
| R | 1071500 | 碎焰风暴 | 3 | /assets/game-icons/hero-skills/kenneth/skill-71-r-1071500.png |
| T | 1071100 | 暗火燃烧 | 2 | /assets/game-icons/hero-skills/kenneth/skill-71-t-1071100.png |
| W | 1071300 | 业火 | 5 | /assets/game-icons/hero-skills/kenneth/skill-71-w-1071300.png |

### 72 卡缇娅 (Katja)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1072400 | 灰色警戒 | 5 | /assets/game-icons/hero-skills/katja/skill-72-e-1072400.png |
| Q | 1072200 | 绝命狙击 | 5 | /assets/game-icons/hero-skills/katja/skill-72-q-1072200.png |
| R | 1072500 | 暗影终结 | 3 | /assets/game-icons/hero-skills/katja/skill-72-r-1072500.png |
| T | 1072100 | 雾色死神 | 2 | /assets/game-icons/hero-skills/katja/skill-72-t-1072100.png |
| W | 1072300 | 猫头鹰之眼 | 5 | /assets/game-icons/hero-skills/katja/skill-72-w-1072300.png |

### 73 夏洛特 (Charlotte)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1073400 | 希望的轨迹 | 5 | /assets/game-icons/hero-skills/charlotte/skill-73-e-1073400.png |
| Q | 1073200 | 幻影流光 | 5 | /assets/game-icons/hero-skills/charlotte/skill-73-q-1073200.png |
| R | 1073500 | 奇迹降临 | 3 | /assets/game-icons/hero-skills/charlotte/skill-73-r-1073500.png |
| T | 1073100 | 圣洁之心 | 2 | /assets/game-icons/hero-skills/charlotte/skill-73-t-1073100.png |
| W | 1073300 | 月光祈愿 | 5 | /assets/game-icons/hero-skills/charlotte/skill-73-w-1073300.png |

### 74 达尔科 (Darko)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1074400 | 债务深渊 | 5 | /assets/game-icons/hero-skills/darko/skill-74-e-1074400.png |
| Q | 1074200 | 天价利息 | 5 | /assets/game-icons/hero-skills/darko/skill-74-q-1074200.png |
| R | 1074500 | 强制执行 | 3 | /assets/game-icons/hero-skills/darko/skill-74-r-1074500.png |
| T | 1074100 | 抵押 | 2 | /assets/game-icons/hero-skills/darko/skill-74-t-1074100.png |
| W | 1074300 | 催缴 | 5 | /assets/game-icons/hero-skills/darko/skill-74-w-1074300.png |

### 75 莉诺尔 (Lenore)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1075400 | 连续记号 | 5 | /assets/game-icons/hero-skills/lenore/skill-75-e-1075400.png |
| Q | 1075200 | 断奏 | 5 | /assets/game-icons/hero-skills/lenore/skill-75-q-1075200.png |
| R | 1075500 | 天鹅狂想曲 | 3 | /assets/game-icons/hero-skills/lenore/skill-75-r-1075500.png |
| T | 1075100 | 苦痛之律 | 2 | /assets/game-icons/hero-skills/lenore/skill-75-t-1075100.png |
| W | 1075300 | 曲终 | 5 | /assets/game-icons/hero-skills/lenore/skill-75-w-1075300.png |

### 76 盖瑞特 (Garnet)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1076400 | 扭曲的执念 | 5 | /assets/game-icons/hero-skills/garnet/skill-76-e-1076400.png |
| Q | 1076200 | 重击&尖刺 | 5 | /assets/game-icons/hero-skills/garnet/skill-76-q-1076200.png |
| R | 1076500 | 处刑式 | 3 | /assets/game-icons/hero-skills/garnet/skill-76-r-1076500.png |
| T | 1076100 | 痛楚再临 | 2 | /assets/game-icons/hero-skills/garnet/skill-76-t-1076100.png |
| W | 1076300 | 压抑之痛 | 5 | /assets/game-icons/hero-skills/garnet/skill-76-w-1076300.png |

### 77 俞岷 (YuMin)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1077400 | 径云 | 5 | /assets/game-icons/hero-skills/yu-min/skill-77-e-1077400.png |
| Q | 1077200 | 风行诀 | 5 | /assets/game-icons/hero-skills/yu-min/skill-77-q-1077200.png |
| R | 1077500 | 风流云散 | 3 | /assets/game-icons/hero-skills/yu-min/skill-77-r-1077500.png |
| T | 1077100 | 道行 | 2 | /assets/game-icons/hero-skills/yu-min/skill-77-t-1077100.png |
| W | 1077300 | 风刃 | 5 | /assets/game-icons/hero-skills/yu-min/skill-77-w-1077300.png |

### 78 翡翠 (Hisui)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1078400 | 月轮斩 | 5 | /assets/game-icons/hero-skills/hisui/skill-78-e-1078400.png |
| Q | 1078200 | 连斩 | 5 | /assets/game-icons/hero-skills/hisui/skill-78-q-1078200.png |
| R | 1078500 | 物干焯 / 燕返 | 3 | /assets/game-icons/hero-skills/hisui/skill-78-r-1078500.png |
| T | 1078100 | 剑之记忆 | 2 | /assets/game-icons/hero-skills/hisui/skill-78-t-1078100.png |
| W | 1078300 | 居合一闪 | 5 | /assets/game-icons/hero-skills/hisui/skill-78-w-1078300.png |

### 79 尤斯蒂娜 (Justyna)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1079400 | 迅影 | 5 | /assets/game-icons/hero-skills/justyna/skill-79-e-1079400.png |
| Q | 1079200 | 连环炮击&歼灭炮击 | 5 | /assets/game-icons/hero-skills/justyna/skill-79-q-1079200.png |
| R | 1079500 | 阿斯特拉冲击 | 3 | /assets/game-icons/hero-skills/justyna/skill-79-r-1079500.png |
| T | 1079100 | 阿斯特拉能量 | 2 | /assets/game-icons/hero-skills/justyna/skill-79-t-1079100.png |
| W | 1079300 | 聚能炮击 | 5 | /assets/game-icons/hero-skills/justyna/skill-79-w-1079300.png |

### 80 伊舒特 (Istvan)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1080400 | 路径积分 | 5 | /assets/game-icons/hero-skills/istvan/skill-80-e-1080400.png |
| Q | 1080200 | 观测 | 5 | /assets/game-icons/hero-skills/istvan/skill-80-q-1080200.png |
| R | 1080500 | 波函数坍缩 | 3 | /assets/game-icons/hero-skills/istvan/skill-80-r-1080500.png |
| T | 1080100 | 演算 | 2 | /assets/game-icons/hero-skills/istvan/skill-80-t-1080100.png |
| W | 1080300 | 量子纠缠 | 5 | /assets/game-icons/hero-skills/istvan/skill-80-w-1080300.png |

### 81 妮娅 (Niah)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1081400 | 1UP | 5 | /assets/game-icons/hero-skills/niah/skill-81-e-1081400.png |
| Q | 1081200 | 落点 | 5 | /assets/game-icons/hero-skills/niah/skill-81-q-1081200.png |
| R | 1081500 | 妮娅的游戏世界 | 3 | /assets/game-icons/hero-skills/niah/skill-81-r-1081500.png |
| T | 1081100 | K.O. | 2 | /assets/game-icons/hero-skills/niah/skill-81-t-1081100.png |
| W | 1081300 | 节拍交汇 | 5 | /assets/game-icons/hero-skills/niah/skill-81-w-1081300.png |

### 82 雪琳 (Xuelin)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1082400 | 飞闪步 | 5 | /assets/game-icons/hero-skills/xuelin/skill-82-e-1082400.png |
| Q | 1082200 | 剑影回旋 | 5 | /assets/game-icons/hero-skills/xuelin/skill-82-q-1082200.png |
| R | 1082500 | 万剑归宗 | 3 | /assets/game-icons/hero-skills/xuelin/skill-82-r-1082500.png |
| T | 1082100 | 剑道 | 2 | /assets/game-icons/hero-skills/xuelin/skill-82-t-1082100.png |
| W | 1082300 | 无尘剑诀 | 5 | /assets/game-icons/hero-skills/xuelin/skill-82-w-1082300.png |

### 83 亨利 (Henry)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1083400 | 瞬时跃迁 | 5 | /assets/game-icons/hero-skills/henry/skill-83-e-1083400.png |
| Q | 1083200 | 指针 | 5 | /assets/game-icons/hero-skills/henry/skill-83-q-1083200.png |
| R | 1083500 | 时序重铸域 | 3 | /assets/game-icons/hero-skills/henry/skill-83-r-1083500.png |
| T | 1083100 | 裂时之隙 | 2 | /assets/game-icons/hero-skills/henry/skill-83-t-1083100.png |
| W | 1083300 | 时控装置 | 5 | /assets/game-icons/hero-skills/henry/skill-83-w-1083300.png |

### 84 布莱尔 (Blair)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1084400 | 断裂斩 / 反击斩 | 5 | /assets/game-icons/hero-skills/blair/skill-84-e-1084400.png |
| Q | 1084200 | 双重斩击 / 双重横扫 | 5 | /assets/game-icons/hero-skills/blair/skill-84-q-1084200.png |
| R | 1084500 | XMS-5启动 / 无尽追击 | 3 | /assets/game-icons/hero-skills/blair/skill-84-r-1084500.png |
| T | 1084100 | 刃移 | 2 | /assets/game-icons/hero-skills/blair/skill-84-t-1084100.png |
| W | 1084300 | 抹杀 / 刃舞风暴 | 5 | /assets/game-icons/hero-skills/blair/skill-84-w-1084300.png |

### 85 米尔卡 (Mirka)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1085400 | 后撤急袭 | 5 | /assets/game-icons/hero-skills/mirka/skill-85-e-1085400.png |
| Q | 1085200 | 粉碎锤 | 5 | /assets/game-icons/hero-skills/mirka/skill-85-q-1085200.png |
| R | 1085500 | 坠风冲击 | 3 | /assets/game-icons/hero-skills/mirka/skill-85-r-1085500.png |
| T | 1085100 | 反击值 | 2 | /assets/game-icons/hero-skills/mirka/skill-85-t-1085100.png |
| W | 1085300 | 反击屏障 | 5 | /assets/game-icons/hero-skills/mirka/skill-85-w-1085300.png |

### 86 芬里尔 (Fenrir)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1086400 | 狩猎时刻 | 5 | /assets/game-icons/hero-skills/fenrir/skill-86-e-1086400.png |
| Q | 1086200 | 撕裂利爪 | 5 | /assets/game-icons/hero-skills/fenrir/skill-86-q-1086200.png |
| R | 1086500 | 绝息一击 | 3 | /assets/game-icons/hero-skills/fenrir/skill-86-r-1086500.png |
| T | 1086100 | 最后的挣扎 | 2 | /assets/game-icons/hero-skills/fenrir/skill-86-t-1086100.png |
| W | 1086300 | 猎物追踪 | 5 | /assets/game-icons/hero-skills/fenrir/skill-86-w-1086300.png |
| W | 1086310 | 撤退本能 | 5 | /assets/game-icons/hero-skills/fenrir/skill-86-w-1086310.png |

### 87 卡洛琳 (Coraline)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1087400 | 罪业枷锁 | 5 | /assets/game-icons/hero-skills/coraline/skill-87-e-1087400.png |
| Q | 1087200 | 断罪之光 | 5 | /assets/game-icons/hero-skills/coraline/skill-87-q-1087200.png |
| R | 1087500 | 异世界的残影 | 3 | /assets/game-icons/hero-skills/coraline/skill-87-r-1087500.png |
| T | 1087100 | 因果 | 2 | /assets/game-icons/hero-skills/coraline/skill-87-t-1087100.png |
| W | 1087300 | 真实之镜 / 虚伪之镜 | 5 | /assets/game-icons/hero-skills/coraline/skill-87-w-1087300.png |

### 88 鼻荆 (Bihyung)

| 槽位 | id | 名称 | 最高等级 | 图片 |
| --- | --- | --- | --- | --- |
| E | 1088400 | 赌上一局！ | 5 | /assets/game-icons/hero-skills/bihyung/skill-88-e-1088400.png |
| Q | 1088200 | 咚锵！ | 5 | /assets/game-icons/hero-skills/bihyung/skill-88-q-1088200.png |
| R | 1088500 | 闹个痛快吧！ | 3 | /assets/game-icons/hero-skills/bihyung/skill-88-r-1088500.png |
| T | 1088100 | 鬼火 | 2 | /assets/game-icons/hero-skills/bihyung/skill-88-t-1088100.png |
| W | 1088300 | 尝尝天罚！ | 5 | /assets/game-icons/hero-skills/bihyung/skill-88-w-1088300.png |

## 武器技能图标

这些是 DAK.GG `skills` 接口同时返回的 D 槽武器技能，独立于具体英雄保存。

| 槽位 | id | 名称 | 图片 |
| --- | --- | --- | --- |
| D | 3001000 | 上勾拳 | /assets/game-icons/weapon-skills/weapon-skill-d-3001000.png |
| D | 3002000 | 高速旋转 | /assets/game-icons/weapon-skills/weapon-skill-d-3002000.png |
| D | 3003000 | 全力挥棒 | /assets/game-icons/weapon-skills/weapon-skill-d-3003000.png |
| D | 3004000 | 风斩 | /assets/game-icons/weapon-skills/weapon-skill-d-3004000.png |
| D | 3005000 | 烟幕 | /assets/game-icons/weapon-skills/weapon-skill-d-3005000.png |
| D | 3006000 | 投掷铁蒺藜 | /assets/game-icons/weapon-skills/weapon-skill-d-3006000.png |
| D | 3007000 | 箭雨 | /assets/game-icons/weapon-skills/weapon-skill-d-3007000.png |
| D | 3008000 | 强弩 | /assets/game-icons/weapon-skills/weapon-skill-d-3008000.png |
| D | 3009000 | 移动重载 | /assets/game-icons/weapon-skills/weapon-skill-d-3009000.png |
| D | 3010000 | 过热 | /assets/game-icons/weapon-skills/weapon-skill-d-3010000.png |
| D | 3011000 | 狙击 | /assets/game-icons/weapon-skills/weapon-skill-d-3011000.png |
| D | 3013000 | 穿刺效果 | /assets/game-icons/weapon-skills/weapon-skill-d-3013000.png |
| D | 3014000 | 血之螺旋 | /assets/game-icons/weapon-skills/weapon-skill-d-3014000.png |
| D | 3015000 | 斗篷和短剑 | /assets/game-icons/weapon-skills/weapon-skill-d-3015000.png |
| D | 3016000 | 格挡 | /assets/game-icons/weapon-skills/weapon-skill-d-3016000.png |
| D | 3018000 | 双剑狂舞 | /assets/game-icons/weapon-skills/weapon-skill-d-3018000.png |
| D | 3019000 | 刺影子 | /assets/game-icons/weapon-skills/weapon-skill-d-3019000.png |
| D | 3020000 | 猛龙过江 | /assets/game-icons/weapon-skills/weapon-skill-d-3020000.png |
| D | 3021000 | 闪击 | /assets/game-icons/weapon-skills/weapon-skill-d-3021000.png |
| D | 3022000 | Love &... | /assets/game-icons/weapon-skills/weapon-skill-d-3022000.png |
| D | 3023000 | 闪光灯 | /assets/game-icons/weapon-skills/weapon-skill-d-3023000.png |
| D | 3024000 | VF介质 | /assets/game-icons/weapon-skills/weapon-skill-d-3024000.png |
| D | 3025000 | VF稳定化 | /assets/game-icons/weapon-skills/weapon-skill-d-3025000.png |

## 缺失图片

无。
