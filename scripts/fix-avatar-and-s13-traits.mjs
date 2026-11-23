// scripts/fix-avatar-and-s13-traits.mjs
// 修复切换角色头像隐身 Bug + 潜能系统升级为数据驱动 traitEffects.json + 同步 S13 新潜能与装备 Tooltip
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const resolve = (...parts) => path.join(rootDir, ...parts);

const readText = (rel) => readFileSync(resolve(rel), 'utf8').replace(/^\uFEFF/, '');
const writeText = (rel, content) => writeFileSync(resolve(rel), content, 'utf8');
const readJson = (rel, fallback = null) => (existsSync(resolve(rel)) ? JSON.parse(readText(rel)) : fallback);
const writeJson = (rel, data) => {
  mkdirSync(path.dirname(resolve(rel)), { recursive: true });
  writeText(rel, `${JSON.stringify(data, null, 2)}\n`);
};

function replaceOnce(source, label, findStr, replaceStr) {
  const hasCRLF = source.includes('\r\n');
  const normSource = source.replace(/\r\n/g, '\n');
  const normFind = findStr.replace(/\r\n/g, '\n');
  const normReplace = replaceStr.replace(/\r\n/g, '\n');
  if (normSource.includes(normReplace)) {
    console.log(`  [跳过] ${label} 已就绪`);
    return source;
  }
  const count = normSource.split(normFind).length - 1;
  if (count !== 1) throw new Error(`[断言失败] ${label} 匹配到 ${count} 处`);
  console.log(`  [已修] ${label}`);
  const out = normSource.replace(normFind, normReplace);
  return hasCRLF ? out.replace(/\n/g, '\r\n') : out;
}

// ============================================================================
// 1. 生成/同步数据驱动潜能表 src/data/traitEffects.json（结合最新 dakLoadoutAssets + 官网 13.0/13.1 公告 + 客户端 l10n）
// ============================================================================
console.log('=== 1/3 构建 S13 潜能数值与伤害公式表 src/data/traitEffects.json ===');

const BASE_TRAIT_EFFECTS = {
  '7000201': { extraEffect: 'absoluteForce', summary: '绝对武力：三次命中后追加 20+等级*5 真实伤害，并降低目标防御。' },
  '7000401': { summary: '吸血鬼：满层后按主路径提供攻击力(15+等级*0.5)或技能增幅(30+等级)。' },
  '7000501': { extraEffect: 'thunder', summary: '霹雳：技能命中造成 30+等级*2+额外攻击力45%或技能增幅26% 技能伤害。' },
  '7000601': { summary: '肾上腺素：普攻叠层提升攻击速度，满层额外提升攻速与移速（不影响单发伤害）。' },
  '7000701': {
    damageEffect: {
      title: '加速度(技)',
      damageType: 'skill',
      adaptiveRoute: { baseFormula: '10 + heroLevel * 3', attackRatio: 0.45, apRatio: 0.3 },
      note: '前 3 次普攻大幅加攻速，第 3 次普攻造成额外技能伤害。'
    },
    summary: '加速度：前 3 次普攻攻速大幅提升，第 3 次普攻追加额外技能伤害。'
  },
  '7010501': { dynamicDamage: 'burst', summary: '爆发力：按双方体力上限差值提升最高 10% 造成伤害。' },
  '7010701': { extraEffect: 'tear', summary: '伤口撕裂：2 秒内造成 10+等级*2+目标当前体力8% 的技能伤害。' },
  '7010901': { summary: '狂乱：随自身已失体力增加吸血-所有伤害（不影响面板伤害）。' },
  '7011001': { dmgAmp: 0.08, summary: '弱肉强食：目标当前体力低于 40% 时造成伤害 +8%。' },
  '7011101': { extraEffect: 'huntBear', summary: '猎魂・熊（按 80 层预估）：攻击力 +10 或技能增幅 +20。' },
  '7011201': { maxHp: 180, summary: '猎魂・野猪（按 80 层预估）：体力上限 +180。' },
  '7011301': { summary: '猎魂・狼（按 80 层预估）：攻击速度 +24%。' },
  '7011401': { summary: '猎魂・野狗（按 80 层预估）：吸血-所有伤害 +7%。' },
  '7011501': { extraEffect: 'scar', summary: '伤痕：满层命中追加 10+等级+目标体力上限3% 技能伤害并附加减疗。' },
  '7100101': { extraEffect: 'diamondShard', summary: '金刚碎片：定身成功后防御力 +20+等级*5，结束时造成等级*10 技能伤害。' },
  '7100201': { summary: '铁匠的觉悟：使用武器技能后短时间减免承受伤害并提升韧性。' },
  '7100401': { summary: '天使护翼：获得体力上限 18% 护盾，破裂解除负面并加速。' },
  '7100501': { extraEffect: 'penance', summary: '惩戒：满层普攻消耗叠层造成 等级*15 技能伤害并减速。' },
  '7110101': { summary: '无惧感：获得护盾或恢复时 4 秒内防御力 +5+等级*1。' },
  '7110201': { summary: '特工队：周围 3.5m 无队友时承受伤害减少 4%。' },
  '7110401': { summary: '钢化：负面效果抵御 +12+等级*0.4%。' },
  '7110701': { summary: '不屈：使用终极技能时获得 等级*15 的护盾。' },
  '7111001': { summary: '镇痛剂：随体力降低最多提升 12% 防御力。' },
  '7111101': { summary: '警戒心：体力低于 75% 受伤时 1.5 秒内减伤 5+等级*0.5%。' },
  '7111201': { summary: '淬火：第二天白天起随时间逐步增加防御力。' },
  '7200101': { summary: '超再生：护盾与体力恢复量增加 5%。' },
  '7200201': { extraEffect: 'enhancementDevice', summary: '强化装置：终极技能触发 4.5 秒移速提升，技能伤害量 +8%+等级*0.5%。' },
  '7200301': { summary: '治愈装置：低血量触发跟随治疗装置恢复已失体力。' },
  '7200501': { summary: '无私：独立技能命中赋予自身与周围队友护盾。' },
  '7210101': { dmgAmp: 0.05, summary: '荆棘丛：定身目标 5 秒内承受所有伤害 +5% 并减疗。' },
  '7211001': { summary: '狩猎的快感：对野生动物伤害 +20%，参与击杀回血加速。' },
  '7211301': { extraEffect: 'explosiveCactus', summary: '爆炸仙人掌：队友触发造成 8~160+敌人体力上限5% 技能伤害。' },
  '7211401': { dmgAmp: 0.04, summary: '压迫感：自身 3m 内敌方实验体承受伤害 +4%。' },
  '7300101': { extraEffect: 'stardust', summary: '星尘蓄势：3 层后下一次普攻造成 30+等级*2 额外真实伤害并缩减基础技能冷却。' },
  '7300201': { extraEffect: 'ghostFire', summary: '鬼火（12.4加强）：短时间重创敌人后 5 秒内造成 80~270+额外攻击力70%或技能增幅20% 真实伤害。' },
  '7300301': { extraEffect: 'vortex', summary: '涡流：加速结束时对周围造成 等级*5+额外攻击力80%或技能增幅40% 技能伤害。' },
  '7310101': { extraEffect: 'concentration', summary: '凝力（满层预估）：攻击力 +16 或技能增幅 +32。' },
  '7310201': { summary: '循环系统：使用技能命中恢复体力。' },
  '7310301': { cd: 5, extraEffect: 'overclock', summary: '超频：冷却缩减 +5；总冷却达 40 时额外 +5 攻击力或 +10 技能增幅。' },
  '7310401': { penPct: 0.06, summary: '制动力：对实验体造成伤害后 4 秒内防御穿透 +6%。' },
  '7310501': { extraEffect: 'rCharger', summary: 'R_echarger：终极技能冷却缩减 +15；释放终极技能后 5 秒内 +5+等级*0.5 攻击力或 +10+等级 技能增幅。' },
  '7310601': { extraEffect: 'rapidShot', summary: '急速射击：技能后普攻命中 5 秒内 +2+等级*0.5 攻击力或 +4+等级 技能增幅，攻速 +15%。' },
  '7310701': { extraEffect: 'celestialCollection', summary: '天界典藏：按全身装备品级分档提供攻击/法强、防御、体力与防穿%。' }
};

// 读取最新拉取的 dakLoadoutAssets.json 与 .er-gamedata-cache/l10n/ChineseSimplified.txt，自动发现并注册 S13 新增潜能！
const dakLoadout = readJson('src/data/dakLoadoutAssets.json', { traits: [] });
const existingTraitEffects = readJson('src/data/traitEffects.json', { traits: {} });
const mergedTraits = { ...BASE_TRAIT_EFFECTS, ...(existingTraitEffects?.traits || {}) };

let l10nMap = {};
const l10nPath = resolve('.er-gamedata-cache/l10n/ChineseSimplified.txt');
if (existsSync(l10nPath)) {
  for (const line of readFileSync(l10nPath, 'utf8').split(/\r?\n/)) {
    const idx = line.indexOf('┃');
    if (idx > 0 && line.startsWith('Trait/')) {
      l10nMap[line.slice(0, idx)] = line.slice(idx + 1).replace(/<[^>]+>/g, '').replace(/\\n/g, ' ').trim();
    }
  }
}

// 在线抓取 13.0 Part.1 (#3948) 与 13.1 (#3969) 中的潜能段落用于补充新潜能精确数值摘要
let s13TraitPatchLines = [];
for (const postId of [3948, 3949, 3969]) {
  try {
    const res = await fetch(`https://playeternalreturn.com/posts/news/${postId}?hl=zh-CN`, { headers: { 'user-agent': 'Mozilla/5.0' } });
    if (res.ok) {
      const html = await res.text();
      const plain = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(?:p|div|li|h[1-6])>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&gt;/g, '>');
      s13TraitPatchLines.push(...plain.split('\n').map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean));
    }
  } catch {}
}

const activeLumiaTraits = (dakLoadout.traits || []).filter((t) => (
  t.active && ['Havoc', 'Fortification', 'Support', 'Chaos'].includes(t.group) && ['Core', 'Sub1', 'Sub2'].includes(t.type)
));

let newS13Count = 0;
for (const trait of activeLumiaTraits) {
  const idStr = String(trait.id);
  const richDesc = l10nMap[`Trait/Desc/${idStr}`] || l10nMap[`Trait/Tooltip/${idStr}`] || trait.tooltip || '';

  // 查找 13.0/13.1 公告里是否提到了该潜能名并自动提取紧随其后的数值说明
  const patchIdx = s13TraitPatchLines.findIndex((l) => l === trait.name || l.startsWith(`${trait.name}(`) || l.startsWith(`${trait.name}（`));
  const patchSnippet = patchIdx >= 0 ? s13TraitPatchLines.slice(patchIdx, patchIdx + 6).join('；') : '';

  if (!mergedTraits[idStr]) {
    const entry = {
      summary: patchSnippet ? `${patchSnippet.slice(0, 140)}` : `${trait.name}：${richDesc || 'S13 新增潜能'}`
    };
    // 自动从官方公告描述提取简单常驻/触发增伤、防穿、冷却或固定伤害公式
    const textToParse = `${patchSnippet} ${richDesc}`;
    const mDmgAmp = textToParse.match(/(?:造成的?(?:所有|技能)?伤害|承受的?(?:所有)?伤害)(?:增加|提升)\s*(\d+(?:\.\d+)?)%/);
    if (mDmgAmp) entry.dmgAmp = Number(mDmgAmp[1]) / 100;
    const mPenPct = textToParse.match(/防御穿透(?:增加|提升)\s*(\d+(?:\.\d+)?)%/);
    if (mPenPct) entry.penPct = Number(mPenPct[1]) / 100;
    const mCd = textToParse.match(/^[^；]*冷却缩减(?:增加|提升|\+)\s*(\d+)(?!%)/);
    if (mCd) entry.cd = Number(mCd[1]);

    mergedTraits[idStr] = entry;
    newS13Count += 1;
    console.log(`  [发现并注册 S13 新潜能] ${idStr} ${trait.name} (${trait.group}/${trait.type}) -> ${entry.summary}`);
  } else if (patchSnippet && !mergedTraits[idStr].patchSynced13) {
    // 已有潜能在 13.0/13.1 有数值调整的，把最新公告摘要附加上去
    const mDmgAmp = patchSnippet.match(/→\s*(\d+(?:\.\d+)?)%/);
    if (mergedTraits[idStr].dmgAmp && mDmgAmp && /伤害/.test(patchSnippet)) {
      mergedTraits[idStr].dmgAmp = Number(mDmgAmp[1]) / 100;
    }
    if (mergedTraits[idStr].penPct && mDmgAmp && /防御穿透/.test(patchSnippet)) {
      mergedTraits[idStr].penPct = Number(mDmgAmp[1]) / 100;
    }
    mergedTraits[idStr].patchSynced13 = true;
    console.log(`  [核对 S13 潜能公告] ${trait.name}: ${patchSnippet.slice(0, 100)}`);
  }
}

writeJson('src/data/traitEffects.json', {
  _comment: '潜能（Traits）可计算属性与附加伤害配置表。支持静态属性、适性加成与通用伤害公式。',
  updatedAt: new Date().toISOString(),
  count: Object.keys(mergedTraits).length,
  traits: mergedTraits
});
console.log(`  [完成] traitEffects.json 已写入 ${Object.keys(mergedTraits).length} 条潜能配置（本次自动新增 ${newS13Count} 条）。`);

// ============================================================================
// 2. 增量刷新 dakItemSkillIcons.json（补齐 S12~S13 新装备中文 Tooltip 与缺失的装备小图标）
// ============================================================================
console.log('\n=== 2/3 增量补齐 S13 新装备中文 Tooltip（跳过已有图标，极速完成） ===');
try {
  const res = await fetch('https://er.dakgg.io/api/v1/data/items?hl=zh-CN', {
    headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0' }
  });
  if (res.ok) {
    const payload = await res.json();
    const remoteItems = payload.items || payload.equipment || [];
    if (remoteItems.length > 100) {
      const iconsDoc = readJson('src/data/dakItemSkillIcons.json', { equipment: [] });
      const byId = new Map((iconsDoc.equipment || []).map((x) => [String(x.id), x]));
      let tooltipUpdated = 0;
      for (const r of remoteItems) {
        const idStr = String(r.id || r.code || '');
        if (!idStr) continue;
        const cleanTip = String(r.tooltip || r.desc || '').replace(/\\n/g, '\n').trim();
        const cur = byId.get(idStr);
        if (cur) {
          if (cleanTip && cur.tooltip !== cleanTip) {
            cur.tooltip = cleanTip;
            tooltipUpdated++;
          }
        } else if (cleanTip) {
          const itemObj = { id: Number(idStr) || idStr, name: r.name || '', tooltip: cleanTip, imageUrl: r.imageUrl || '' };
          iconsDoc.equipment.push(itemObj);
          byId.set(idStr, itemObj);
          tooltipUpdated++;
        }
      }
      iconsDoc.generatedAt = new Date().toISOString();
      writeJson('src/data/dakItemSkillIcons.json', iconsDoc);
      console.log(`  [完成] 已从 DAK.GG 更新/新增 ${tooltipUpdated} 件装备的中文悬浮词条说明！`);
    }
  }
} catch (err) {
  console.warn(`  [提示] DAK.GG 装备词条增量刷新跳过: ${err.message}`);
}

// ============================================================================
// 3. 修复 src/App.jsx：彻底修好选英雄不显示头像 Bug + 接入 traitEffects.json + 虚言战术技能增伤
// ============================================================================
console.log('\n=== 3/3 修复 src/App.jsx 英雄头像消失 Bug 并接入数据驱动潜能引擎 ===');
let appCode = readText('src/App.jsx');
appCode = appCode.replace(/const APP_VERSION = 'v0\.2\.\d+';/, `const APP_VERSION = 'v0.2.080';`);

// 3.1 引入 TRAIT_EFFECTS_DATA
appCode = replaceOnce(
  appCode,
  '引入 src/data/traitEffects.json',
  `import DAK_LOADOUT_ASSETS from './data/dakLoadoutAssets.json';`,
  `import DAK_LOADOUT_ASSETS from './data/dakLoadoutAssets.json';
import TRAIT_EFFECTS_DATA from './data/traitEffects.json';`
);

// 3.2 战术技能加入「虚言」（消耗体力并增加造成的全部伤害）
appCode = replaceOnce(
  appCode,
  '战术技能选项加入 虚言',
  `const TACTICAL_SKILL_OPTIONS = ['震裂', '违规者', '斥力弹', '阔步者', '实刃', '等离子冲击', '其他'];`,
  `const TACTICAL_SKILL_OPTIONS = ['震裂', '违规者', '斥力弹', '阔步者', '实刃', '等离子冲击', '虚言', '其他'];`
);

// 3.3 将硬编码 TRAIT_EFFECTS 替换为读取 TRAIT_EFFECTS_DATA.traits
const traitStart = appCode.indexOf('const TRAIT_EFFECTS = {');
const traitEndMarker = `function heroDamageTestOnly(hero) {`;
const traitEnd = appCode.indexOf(traitEndMarker);
if (traitStart >= 0 && traitEnd > traitStart && !appCode.includes('const TRAIT_EFFECTS = TRAIT_EFFECTS_DATA.traits')) {
  const before = appCode.slice(0, traitStart);
  const after = appCode.slice(traitEnd);
  appCode = `${before}const TRAIT_EFFECTS = TRAIT_EFFECTS_DATA.traits || {};\n\n/**\n * 该实验体是否只在「显示技能伤害统计测试英雄」开关下可见。\n */\n${after}`;
  console.log('  [已修] TRAIT_EFFECTS 已切换为读取 src/data/traitEffects.json');
}

// 3.4 升级 characterImageSrc（支持忽略大小写与三位角色编号前缀匹配）并新增受控 SafeAvatar 组件，彻底根治 display:none 跨角色污染！
appCode = replaceOnce(
  appCode,
  '增强 characterImageSrc 并添加受控头像组件 CharacterAvatar',
  `function characterImageSrc(character) {
  if (!character?.image) return '';
  const imageName = character.image.split('/').pop();
  const match = Object.entries(CHARACTER_IMAGE_URLS).find(([path]) => path.endsWith(\`/\${imageName}\`));
  return match?.[1] || character.image;
}`,
  `function characterImageSrc(character) {
  if (!character) return '';
  const rawImage = String(character.image || '');
  const imageName = rawImage.split('/').pop();
  const lowerName = imageName.toLowerCase();
  const codePrefix = character.code ? \`/\${String(character.code).padStart(3, '0')}-\` : '';
  const entries = Object.entries(CHARACTER_IMAGE_URLS);
  const exact = imageName && entries.find(([p]) => p.endsWith(\`/\${imageName}\`));
  if (exact) return exact[1];
  const ciMatch = lowerName && entries.find(([p]) => p.toLowerCase().endsWith(\`/\${lowerName}\`));
  if (ciMatch) return ciMatch[1];
  const prefixMatch = codePrefix && entries.find(([p]) => p.includes(codePrefix));
  if (prefixMatch) return prefixMatch[1];
  return rawImage ? rawImage.replace(/^\\/assets\\//, './assets/') : '';
}

function CharacterAvatar({ character, fallbackName = '', className = '' }) {
  const src = characterImageSrc(character);
  const [failedSrc, setFailedSrc] = useState('');
  const label = (character?.name || fallbackName || '?').slice(0, 1);
  if (!src || failedSrc === src) {
    return <span className={\`heroAvatarFallback \${className}\`.trim()} aria-hidden="true">{label}</span>;
  }
  return (
    <img
      key={\`\${character?.code || fallbackName}-\${src}\`}
      className={className || undefined}
      src={src}
      alt={character?.name || fallbackName}
      onError={() => setFailedSrc(src)}
    />
  );
}`
);

// 3.5 替换三处角色头像渲染与两处潜能图标渲染
appCode = replaceOnce(
  appCode,
  '修复左侧头像选择器角色头像渲染',
  `              {character ? (
                <img src={characterImageSrc(character)} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
              ) : (
                <span className="heroAvatarFallback">{name.slice(0, 1)}</span>
              )}`,
  `              <CharacterAvatar character={character} fallbackName={name} />`
);

appCode = replaceOnce(
  appCode,
  '修复顶部当前实验体大卡片头像消失 Bug',
  `        <div className="heroPanel heroIdentity">
          {selectedCharacter ? (
            <img src={characterImageSrc(selectedCharacter)} alt={selectedCharacter.name} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
          ) : null}`,
  `        <div className="heroPanel heroIdentity">
          <CharacterAvatar character={selectedCharacter} fallbackName={selectedHero} />`
);

appCode = replaceOnce(
  appCode,
  '修复官方数据折叠面板角色头像消失 Bug',
  `              <div className="characterCard">
                <img src={characterImageSrc(selectedCharacter)} alt={selectedCharacter.name} onError={(event) => { event.currentTarget.style.display = 'none'; }} />`,
  `              <div className="characterCard">
                <CharacterAvatar character={selectedCharacter} fallbackName={selectedHero} />`
);

appCode = replaceOnce(
  appCode,
  '潜能分组图标增加缺图防裂保护',
  `            <img src={loadoutImageSrc(group.image)} alt="" />`,
  `            <img key={group.image} src={loadoutImageSrc(group.image)} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />`
);

appCode = replaceOnce(
  appCode,
  '潜能按钮图标增加缺图防裂保护',
  `              <img className="traitIcon" src={loadoutImageSrc(trait.image)} alt="" />`,
  `              <img key={trait.image} className="traitIcon" src={loadoutImageSrc(trait.image)} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />`
);

// 3.6 让 traitBonusesFor 与 calc() 支持 traitEffects.json 中的通用 damageEffect 以及「虚言」增伤
appCode = replaceOnce(
  appCode,
  'traitBonusesFor 携带通用 damageEffects 列表',
  `      effectIds: effect.extraEffect ? [...bonus.effectIds, effect.extraEffect] : bonus.effectIds,
      summaries: effect.summary ? [...bonus.summaries, \`\${trait.name}: \${effect.summary}\`] : bonus.summaries
    };
  }, { ap: 0, pen: 0, penPct: 0, cd: 0, dmgAmp: 0, defense: 0, maxHp: 0, effectIds: [], summaries: [] });`,
  `      effectIds: effect.extraEffect ? [...bonus.effectIds, effect.extraEffect] : bonus.effectIds,
      damageEffects: effect.damageEffect ? [...bonus.damageEffects, effect.damageEffect] : bonus.damageEffects,
      summaries: effect.summary ? [...bonus.summaries, \`\${trait.name}: \${effect.summary}\`] : bonus.summaries
    };
  }, { ap: 0, pen: 0, penPct: 0, cd: 0, dmgAmp: 0, defense: 0, maxHp: 0, effectIds: [], damageEffects: [], summaries: [] });`
);

appCode = replaceOnce(
  appCode,
  'calc() 支持战术技能「虚言」增伤与通用潜能伤害段结算',
  `  const potentialDamageBonus = talentDamageBonus + enhancementDeviceDamageBonus;`,
  `  const falseVowBonus = tacticalSkill === '虚言' ? (tacticalUpgraded ? 0.12 : 0.08) : 0;
  const potentialDamageBonus = talentDamageBonus + enhancementDeviceDamageBonus + falseVowBonus;`
);

appCode = replaceOnce(
  appCode,
  'effects 列表接入 traitEffects.json 通用伤害段（如加速度及 S13 新潜能）',
  `  // 装备独有效果伤害（诅咒 / 腐化 / 破裂…）：只算当前真的装上的
  effects.push(...equipmentEffectDamages(selected, context, effectToggles));`,
  `  // 数据驱动潜能通用伤害段（加速度及 S13 新增伤害型潜能）
  for (const de of traitBonuses.damageEffects || []) {
    if (de.adaptiveRoute) {
      const baseVal = evaluateFormula(de.adaptiveRoute.baseFormula || '0', { ...context, base: 0, level: 1 });
      const route = adaptiveOffenseFormula({
        base: baseVal,
        extraAttack: extraAttackPower,
        attackRatio: getNumber(de.adaptiveRoute.attackRatio),
        ap,
        apRatio: getNumber(de.adaptiveRoute.apRatio)
      });
      const raw = damageFloor(route.value);
      effects.push({
        title: de.title,
        raw,
        value: de.damageType === 'true' ? raw : damageFloor(raw * finalMod),
        note: \`\${de.note || ''}（当前按\${route.route}计算）\`
      });
    } else if (de.formula) {
      const raw = damageFloor(evaluateFormula(de.formula, { ...context, base: 0, level: 1 }));
      effects.push({
        title: de.title,
        raw,
        value: de.damageType === 'true' ? raw : damageFloor(raw * finalMod),
        note: de.note || ''
      });
    }
  }
  // 装备独有效果伤害（诅咒 / 腐化 / 破裂…）：只算当前真的装上的
  effects.push(...equipmentEffectDamages(selected, context, effectToggles));`
);

writeText('src/App.jsx', appCode);

// 顺手补一条 CSS，让顶部大卡片在真缺图显示首字徽章时保持 92x92 尺寸对齐
let css = readText('styles/globals.css');
if (!css.includes('.heroIdentity .heroAvatarFallback')) {
  css += `\n.heroIdentity .heroAvatarFallback {\n  width: 92px;\n  height: 92px;\n  margin-bottom: 14px;\n  border: 1px solid rgba(255, 255, 255, 0.14);\n  border-radius: 8px;\n  font-size: 32px;\n}\n`;
  writeText('styles/globals.css', css);
  console.log('  [已修] styles/globals.css 补充顶部头像兜底徽章尺寸');
}

console.log('\n✅ 头像修复与 S13 潜能升级逻辑已全部写入！');