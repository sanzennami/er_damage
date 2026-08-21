// 公告的系数文本里若写成「5/5.5/6/6.5/7%」这种分级百分比，公式里就该是 [..][level-1]。
// 写死成单一常数 = 只有 1 级值正确，其余等级全部算少（或算多）。
import { readFileSync } from 'node:fs';
const file = JSON.parse(readFileSync('D:/er_damage/src/data/heroSkills.json', 'utf8'));
const skills = file.skills || Object.values(file)[0];

const rows = [];
for (const s of skills) {
  const text = String(s.coefficientText || '');
  if (!text) continue;
  const formula = String(s.formula || '');
  // 抓出「a/b/c%」形式的分级百分比（至少两档，带小数点也算）
  const graded = text.match(/\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?){1,6}\s*%/g) || [];
  if (!graded.length) continue;

  // 公式里已经有 [..][level - 1] 数组的，说明分级已经建模了
  const arrayCount = (formula.match(/\[[^\]]*\]\s*\[\s*level/g) || []).length;
  // 基础值本身就是分级的（bases 有多档），那一档不用数组
  const gradedNeedingArray = graded.filter((g) => {
    const nums = g.replace('%', '').split('/').map((x) => Number(x.trim()));
    return new Set(nums).size > 1; // 各档不全相同才算真分级
  });
  if (!gradedNeedingArray.length) continue;

  // 公告里「基础伤害 60/90/120」这种整数档通常就是 bases，先扣掉与 bases 完全一致的那些
  const basesStr = String(s.bases || '').split(',').map((x) => x.trim()).join('/');
  const notBases = gradedNeedingArray.filter((g) => g.replace('%', '').replace(/\s/g, '') !== basesStr);

  // 公式里 [..][level-1] 数组的实际取值
  const arrays = (formula.match(/\[([^\]]*)\]\s*\[\s*level/g) || [])
    .map((m) => m.replace(/\]\s*\[\s*level$/, '').replace(/^\[/, '')
      .split(',').map((x) => Number(x.trim())).filter((x) => Number.isFinite(x)));

  // 一档分级是否已经被某个数组覆盖。公告写百分比、公式写小数，要先换算；
  // 另外「攻击力的110%」这种是「100% 基础 + 分级的 10%」，所以 x/100 和 1 + x/100 都要认。
  const covered = (g) => {
    const nums = g.replace('%', '').split('/').map((x) => Number(x.trim()));
    const same = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-6);
    return arrays.some((arr) => same(arr, nums)
      || same(arr, nums.map((n) => n / 100))
      || same(arr, nums.map((n) => 1 + n / 100)));
  };
  const remaining = notBases.filter((g) => !covered(g));
  if (!remaining.length) continue;

  if (arrayCount < remaining.length || remaining.length > 0 && arrayCount === 0) {
    rows.push({
      hero: s.hero, title: s.title, id: s.id, source: s.source,
      formula, text, graded: remaining, arrayCount
    });
  }
}

console.log(`扫描 ${skills.length} 段，命中 ${rows.length} 段：公告文本有分级百分比，公式里没有对应的 [..][level-1]\n`);
const byHero = new Map();
for (const r of rows) {
  if (!byHero.has(r.hero)) byHero.set(r.hero, []);
  byHero.get(r.hero).push(r);
}
for (const [hero, list] of [...byHero].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${hero}（${list.length} 段）`);
  for (const r of list) {
    console.log(`  · ${r.title}  [${r.source}]`);
    console.log(`      公告 ${r.text}`);
    console.log(`      公式 ${r.formula}`);
    console.log(`      未建模的分级项：${r.graded.join('  ')}`);
  }
}
