// 把 heroStatus.json 里的核对记录和计算口径提醒导出成一份 markdown。
//
// 这些说明以前直接印在技能伤害面板顶上，占了大半屏还没人看。现在改成独立文档：
//   node scripts/export-hero-caveats.mjs
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const statusPath = path.join(rootDir, 'src', 'data', 'heroStatus.json');
const skillsPath = path.join(rootDir, 'src', 'data', 'heroSkills.json');
const outPath = path.join(rootDir, 'docs', 'hero-caveats.md');

const status = JSON.parse(await readFile(statusPath, 'utf8'));
const skills = JSON.parse(await readFile(skillsPath, 'utf8')).skills;

const countByHero = skills.reduce((acc, skill) => {
  acc[skill.hero] = (acc[skill.hero] || 0) + 1;
  return acc;
}, {});

const heroes = Object.entries(status.heroes || {});
const verified = heroes.filter(([, value]) => value.damageTestOnly === false);
const withCaveat = verified.filter(([, value]) => value.caveat);

const lines = [];
lines.push('# 实验体核对记录与计算口径');
lines.push('');
lines.push('由 `scripts/export-hero-caveats.mjs` 从 `src/data/heroStatus.json` 生成，不要直接改这个文件。');
lines.push('');
lines.push(`已核对 **${verified.length}** 名实验体，其中 **${withCaveat.length}** 名有需要注意的计算口径。`);
lines.push('');
lines.push('「计算口径」这一栏说的是**模型没有建、或只能近似**的那部分 —— 页面上算出来的数是准的，');
lines.push('但遇到这些情况时实际游戏里会跟它有出入。');
lines.push('');

lines.push('## 目录');
lines.push('');
verified.forEach(([name, value]) => {
  lines.push(`- [${name}](#${encodeURIComponent(name)})　${countByHero[name] || 0} 段${value.caveat ? '　⚠️ 有口径说明' : ''}`);
});
lines.push('');

verified.forEach(([name, value]) => {
  lines.push(`## ${name}`);
  lines.push('');
  lines.push(`- **段数**：${countByHero[name] || 0}`);
  lines.push(`- **核对来源**：${value.verifiedBy || '未记录'}`);
  lines.push('');
  if (value.note) {
    lines.push('**录入说明**');
    lines.push('');
    lines.push(value.note);
    lines.push('');
  }
  if (value.caveat) {
    lines.push('**计算口径 ⚠️**');
    lines.push('');
    lines.push(value.caveat);
    lines.push('');
  }
});

const rest = heroes.filter(([, value]) => value.damageTestOnly !== false);
if (rest.length) {
  lines.push('## 尚未核对');
  lines.push('');
  rest.forEach(([name]) => lines.push(`- ${name}`));
  lines.push('');
}

await writeFile(outPath, `${lines.join('\n')}\n`, 'utf8');
console.log(`已写出 ${path.relative(rootDir, outPath)}：已核对 ${verified.length} 名 / 含口径说明 ${withCaveat.length} 名`);
