// 客户端截图 OCR → 结构化技能读数
//
// 补上 ingame-capture.mjs 缺的那一段：它负责「已有结构化读数 → 校验 → 入库」，
// 但「截图 → 数字」一直靠人眼抄。这个脚本把那一段自动化。
//
// OCR 用 Windows 自带的 Windows.Media.Ocr（见 scripts/lib/win-ocr.ps1）：
// Win10 自带、离线、装了 zh-Hans-CN 语言包就能认中文，不需要装 tesseract 也不用下模型。
//
// 子命令：
//   ocr   <图片>              只打印 OCR 读到了什么（调参 / 排查用）
//   parse <图片...>           解析成结构化字段并打印
//   stub  <英雄> <图片...>    直接产出可粘贴进 inGameSkillCapture.json 的条目
//
// 参数：
//   --slot Q            指定槽位（文件名里带 -Q 时可省）
//   --patch 12.0b       客户端版本，写进 clientPatch
//   --lang zh-Hans-CN   OCR 语言
//   --json              parse 时输出 JSON 而不是可读文本
//
// 截图约定：文件名写成 `<英雄>-<槽位>.png`（例如 `杰琪-Q.png`），
// 脚本会从文件名推断英雄和槽位，也可以用 --slot 覆盖。

import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const ocrScript = path.join(__dirname, 'lib', 'win-ocr.ps1');

// ---------------------------------------------------------------------------
// OCR
// ---------------------------------------------------------------------------

export function runOcr(imagePath, language = 'zh-Hans-CN') {
  const stdout = execFileSync('powershell', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass',
    '-File', ocrScript,
    '-Path', path.resolve(imagePath),
    '-Language', language
  ], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  return JSON.parse(stdout);
}

/** 全角 -> 半角，并统一各种破折号/斜杠，OCR 出来的标点很杂。 */
function normalizeText(value) {
  return String(value || '')
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[Ａ-Ｚａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[（]/g, '(').replace(/[）]/g, ')')
    .replace(/[％]/g, '%').replace(/[．。](?=\d)/g, '.')
    .replace(/[，]/g, ',').replace(/[：]/g, ':')
    .replace(/[／∕]/g, '/')
    .replace(/[—–－ー]/g, '-')
    .replace(/[〜～]/g, '~')
    .replace(/[Ｏo](?=\d)|(?<=\d)[Ｏo]/g, '0')   // 数字串里的 O 一律当 0
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * OCR 会把「110」拆成 1 / 1 / 0 三个词，行 text 直接拼会变成 "1 1 0"。
 * 按坐标重组：相邻词的间隙小于半个字宽就当同一个 token 粘起来。
 */
export function rejoinLine(line) {
  const words = [...(line.words || [])].sort((a, b) => a.x - b.x);
  if (!words.length) return normalizeText(line.text);
  const heights = words.map((w) => w.h).sort((a, b) => a - b);
  const medianHeight = heights[Math.floor(heights.length / 2)] || 20;
  const threshold = medianHeight * 0.45;

  let out = words[0].text;
  for (let i = 1; i < words.length; i += 1) {
    const previous = words[i - 1];
    const gap = words[i].x - (previous.x + previous.w);
    out += (gap > threshold ? ' ' : '') + words[i].text;
  }
  return normalizeText(out);
}

// ---------------------------------------------------------------------------
// 解析
// ---------------------------------------------------------------------------

const NUM = '\\d+(?:\\.\\d+)?';
const SEQ = new RegExp(`(${NUM}(?:\\s*/\\s*${NUM})+)`);
const COEF = new RegExp(`\\(\\s*\\+\\s*([^0-9()]*?)\\s*(${NUM}(?:\\s*/\\s*${NUM})*)\\s*%?\\s*\\)`, 'g');
const COOLDOWN = new RegExp(`冷却\\D{0,4}(${NUM}(?:\\s*/\\s*${NUM})*)`);
const COST = new RegExp(`(?:耐力|气力|法力|消耗)\\D{0,6}(${NUM}(?:\\s*/\\s*${NUM})*)`);

const VARIABLES = [
  [/额外攻击力/, 'extraAttack'],
  [/技能增幅/, 'ap'],
  [/攻击力/, 'attack'],
  [/目标(体力上限|最大体力|当前体力)/, 'targetHp'],
  [/(自身)?(体力上限|最大体力)/, 'maxHp'],
  [/额外体力/, 'extraHp'],
  [/等级/, 'heroLevel']
];
const variableOf = (label) => VARIABLES.find(([re]) => re.test(label))?.[1] ?? null;

const NOT_DAMAGE = /(护盾|吸收|恢复|治愈|回复|移动速度|攻击速度|承受伤害|冷却|射程|视野|持续时间)/;

const toNumbers = (text) => String(text).split('/').map((v) => Number(v.trim())).filter((v) => Number.isFinite(v));

/**
 * tooltip 会换行，系数括号经常被甩到下一行。
 * 把「以 ( 或 + 开头」的行并回上一行，否则伤害段会丢掉全部系数。
 */
function mergeWrappedLines(lines) {
  const out = [];
  for (const line of lines) {
    if (out.length && /^[(+]/.test(line)) {
      out[out.length - 1] = `${out[out.length - 1]}${line}`;
      continue;
    }
    out.push(line);
  }
  return out;
}

/** 一张截图 -> 若干伤害段草稿 */
export function parseSkillImage(ocr) {
  const lines = mergeWrappedLines((ocr.lines || []).map(rejoinLine).filter(Boolean));
  const segments = [];
  let cooldown = null;
  let cost = null;
  let skillName = '';

  for (const line of lines) {
    if (!skillName && !SEQ.test(line) && /^[^\d]{2,12}$/.test(line)) skillName = line;

    const cd = line.match(COOLDOWN);
    if (cd) cooldown = toNumbers(cd[1]);
    const cs = line.match(COST);
    if (cs) cost = toNumbers(cs[1]);

    if (!/伤害/.test(line)) continue;
    if (NOT_DAMAGE.test(line) && !/伤害/.test(line.replace(NOT_DAMAGE, ''))) continue;

    const seq = line.match(SEQ)?.[1];
    const coefs = [...line.matchAll(COEF)].map((m) => [m[1].trim(), m[2]]);
    if (!seq && !coefs.length) continue;

    const scaling = {};
    const unmodeled = [];
    for (const [label, valueText] of coefs) {
      const variable = variableOf(label);
      const values = toNumbers(valueText).map((v) => v / 100);
      if (!variable) { unmodeled.push(`${label} ${valueText}%`); continue; }
      scaling[variable] = values.length === 1 ? values[0] : values;
    }

    // 段名：数列前面那一小段文字
    const head = seq ? line.slice(0, line.indexOf(seq)) : line;
    const damagePart = head.replace(/[0-9.%()+/\s]/g, '').replace(/^的/, '').slice(-10) || '伤害';

    segments.push({
      damagePart,
      levelValues: seq ? Object.fromEntries(toNumbers(seq).map((v, i) => [i + 1, v])) : {},
      scaling,
      unmodeled: unmodeled.length ? unmodeled : undefined,
      scalingText: line,
      raw: line
    });
  }

  return { skillName, segments, cooldown, cost, lines };
}

// ---------------------------------------------------------------------------
// 命令
// ---------------------------------------------------------------------------

function imagesFrom(inputs) {
  const files = [];
  for (const input of inputs) {
    const full = path.resolve(input);
    if (statSync(full).isDirectory()) {
      readdirSync(full)
        .filter((name) => /\.(png|jpg|jpeg|bmp)$/i.test(name))
        .forEach((name) => files.push(path.join(full, name)));
    } else {
      files.push(full);
    }
  }
  return files;
}

/** 从 `杰琪-Q.png` 这样的文件名推英雄和槽位 */
function metaFromFileName(file) {
  const base = path.basename(file).replace(/\.[^.]+$/, '');
  const m = base.match(/^(.+?)[-_\s]+([PQWERTD])(\d?)$/i);
  return m ? { hero: m[1], slot: m[2].toUpperCase() } : { hero: base, slot: '' };
}

function commandOcr(files, language) {
  for (const file of files) {
    const ocr = runOcr(file, language);
    console.log(`\n=== ${path.relative(rootDir, file)}  (${ocr.width}x${ocr.height})`);
    ocr.lines.forEach((line, i) => {
      const joined = rejoinLine(line);
      const raw = normalizeText(line.text);
      console.log(`${String(i).padStart(3)} | ${joined}`);
      if (raw !== joined) console.log(`    (OCR 原始: ${raw})`);
    });
  }
}

function commandParse(files, language, asJson) {
  const all = [];
  for (const file of files) {
    const meta = metaFromFileName(file);
    const parsed = parseSkillImage(runOcr(file, language));
    all.push({ file: path.relative(rootDir, file), ...meta, ...parsed });
    if (asJson) continue;
    console.log(`\n=== ${path.relative(rootDir, file)}  [${meta.hero} ${meta.slot || '?'}]  技能名读到「${parsed.skillName || '—'}」`);
    if (!parsed.segments.length) console.log('  (没解析出伤害段，用 ocr 子命令看看读到了什么)');
    parsed.segments.forEach((s, i) => {
      const scale = Object.entries(s.scaling).map(([k, v]) => `${k}*${Array.isArray(v) ? `[${v}]` : v}`).join(' + ') || '(无系数)';
      console.log(`  段${i + 1} ${s.damagePart}: ${Object.values(s.levelValues).join('/') || '(无数列)'}  ${scale}`);
      if (s.unmodeled) console.log(`        未建模: ${s.unmodeled.join('；')}`);
      console.log(`        原文: ${s.raw}`);
    });
    if (parsed.cooldown) console.log(`  冷却: ${parsed.cooldown.join('/')}`);
    if (parsed.cost) console.log(`  消耗: ${parsed.cost.join('/')}`);
  }
  if (asJson) console.log(JSON.stringify(all, null, 2));
}

function commandStub(hero, files, language, clientPatch) {
  const today = new Date().toISOString().slice(0, 10);
  const entries = [];
  for (const file of files) {
    const meta = metaFromFileName(file);
    const parsed = parseSkillImage(runOcr(file, language));
    parsed.segments.forEach((segment, index) => {
      entries.push({
        hero: hero || meta.hero,
        slot: meta.slot || undefined,
        dataKey: index === 0 ? 'Damage' : `Damage${index + 1}`,
        damagePart: segment.damagePart,
        levelValues: segment.levelValues,
        scaling: segment.scaling,
        scalingText: segment.scalingText,
        cooldownByLevel: parsed.cooldown
          ? Object.fromEntries(parsed.cooldown.map((v, i) => [i + 1, v])) : undefined,
        clientPatch: clientPatch || '',
        capturedAt: today,
        screenshots: [path.basename(file)],
        confidence: 'ocr-draft'
      });
    });
  }
  console.log(JSON.stringify(entries, null, 2));
  console.error(`\n// 共 ${entries.length} 段。粘进 src/data/sources/inGameSkillCapture.json 的 skills 里，`);
  console.error('// 补上 group / dataKey，再跑 node scripts/ingame-capture.mjs build --check 校验。');
  console.error('// confidence 是 ocr-draft，人工核对过之后改成 high。');
}

// ---------------------------------------------------------------------------

function main() {
  const argv = process.argv.slice(2);
  const flag = (name, fallback = '') => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : fallback;
  };
  const language = flag('lang', 'zh-Hans-CN');
  const slot = flag('slot');
  const clientPatch = flag('patch');
  const asJson = argv.includes('--json');

  const valueFlags = new Set(['--lang', '--slot', '--patch']);
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) { if (valueFlags.has(argv[i])) i += 1; continue; }
    positional.push(argv[i]);
  }
  const [command, ...rest] = positional;

  try {
    switch (command) {
      case 'ocr':
        commandOcr(imagesFrom(rest), language);
        break;
      case 'parse':
        commandParse(imagesFrom(rest), language, asJson);
        break;
      case 'stub': {
        const [hero, ...images] = rest;
        commandStub(hero, imagesFrom(images.length ? images : ['.']), language, clientPatch);
        break;
      }
      default:
        console.log('用法：node scripts/ocr-skill-capture.mjs <ocr|parse|stub> [英雄] <图片或目录...> [--slot Q] [--patch 12.0b] [--json]');
        process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
  void slot;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();
