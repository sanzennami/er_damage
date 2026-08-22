// 从 dak.gg 补齐缺失的实验体小头像。
//
// assets/characters/ 里绝大多数图是早年从 fandom 抓的（manifest 里 source 写着 fandom），
// 但新实验体 fandom 不一定有，dak.gg 更新更快。这个脚本只补 characters.json 里
// 已经登记、本地却没有图片文件的那些，已有的不动。
//
//   node scripts/fetch-dak-character-avatars.mjs            # 只看缺哪些
//   node scripts/fetch-dak-character-avatars.mjs --write    # 真的下载
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const avatarDir = path.join(rootDir, 'assets', 'characters');
const manifestPath = path.join(avatarDir, 'manifest.json');
const apiUrl = 'https://er.dakgg.io/api/v1/data/characters?hl=zh-CN';
const write = process.argv.includes('--write');

const characters = JSON.parse(readFileSync(path.join(rootDir, 'src', 'data', 'characters.json'), 'utf8')).characters || [];
const present = new Set(readdirSync(avatarDir));
const missing = characters.filter((c) => c.image && !present.has(c.image.split('/').pop()));

if (!missing.length) {
  console.log('assets/characters 已经齐全，没有要补的。');
  process.exit(0);
}
console.log(`characters.json 登记 ${characters.length} 名，本地缺 ${missing.length} 张：`);
missing.forEach((c) => console.log(`  · ${c.name}  ${c.image.split('/').pop()}`));

const response = await fetch(apiUrl, { headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0' } });
if (!response.ok) {
  console.error(`\n拉 dak.gg 角色表失败：HTTP ${response.status}`);
  process.exit(1);
}
const remote = (await response.json()).characters || [];
// dak.gg 的 id 和 characters.json 的 code 是同一套编号；key 是英文资源名，用来兜底匹配
const remoteById = new Map(remote.map((item) => [item.id, item]));
const remoteByKey = new Map(remote.map((item) => [String(item.key || '').toLowerCase(), item]));

// manifest.json 存的时候带 BOM，JSON.parse 会被它噎住；读时剥掉、写回时按原样补上
const manifestRaw = readFileSync(manifestPath, 'utf8');
const manifestBom = manifestRaw.charCodeAt(0) === 0xFEFF ? '﻿' : '';
const manifest = JSON.parse(manifestBom ? manifestRaw.slice(1) : manifestRaw);
const rows = Array.isArray(manifest) ? manifest : Object.values(manifest);
let added = 0;
const skipped = [];

/**
 * fandom 兜底：老图都是 File:{英文名}_Mini.png。
 *
 * 不走 wiki 的 api.php —— eternalreturn.fandom.com 在这里连不上（10 秒超时），
 * 但它的图床 static.wikia.nocookie.net 是通的。MediaWiki 的图片路径就是
 * md5(文件名) 的第 1 位 / 前 2 位 / 文件名，可以直接算出来，拿已有的 8 条老记录验证过。
 *
 * 返回 null 表示这个名字下确实没有图（404）；网络层面的失败会抛出去，
 * 免得把「连不上」误报成「不存在」。
 */
async function fandomMiniAvatar(englishName) {
  const fileName = `${englishName}_Mini.png`;
  const hash = createHash('md5').update(fileName).digest('hex');
  const imageUrl = `https://static.wikia.nocookie.net/blacksurvivaleternalreturn_gamepedia_en/images/${hash[0]}/${hash.slice(0, 2)}/${fileName}`;
  const res = await fetch(imageUrl, {
    method: 'HEAD',
    headers: { 'user-agent': 'Mozilla/5.0', referer: 'https://eternalreturn.fandom.com/' },
    signal: AbortSignal.timeout(20000)
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`fandom 图床返回 HTTP ${res.status}`);
  return {
    imageUrl,
    sourcePage: `https://eternalreturn.fandom.com/wiki/File:${fileName}`,
    from: 'fandom'
  };
}

for (const character of missing) {
  const match = remoteById.get(character.code) || remoteByKey.get(String(character.id || '').toLowerCase());
  const englishName = character.englishName || character.id || character.resource;
  // dak.gg 返回的是 //cdn.dak.gg/... 这种省略协议的地址
  const fromDak = match?.imageUrl
    ? {
      imageUrl: match.imageUrl.startsWith('//') ? `https:${match.imageUrl}` : match.imageUrl,
      sourcePage: `https://dak.gg/er/characters/${match.key}`,
      from: 'dak.gg'
    }
    : null;
  // dak.gg 优先；刚上线还没进它角色表的，回落 fandom
  let picked = fromDak;
  if (!picked) {
    try {
      picked = await fandomMiniAvatar(englishName);
    } catch (error) {
      // 连不上和「确实没这张图」要分开说，否则下次看日志会以为 fandom 没有
      skipped.push(`${character.name}：dak.gg 没有，查 fandom 时网络出错（${error.message}）`);
      continue;
    }
  }
  if (!picked) { skipped.push(`${character.name}：dak.gg 和 fandom 都没有（找的是 ${englishName}_Mini.png）`); continue; }

  const { imageUrl, sourcePage, from } = picked;
  const fileName = character.image.split('/').pop();
  const target = path.join(avatarDir, fileName);

  if (!write) { console.log(`\n(dry-run) ${character.name} ← [${from}] ${imageUrl}`); continue; }

  const image = await fetch(imageUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0',
      referer: from === 'fandom' ? 'https://eternalreturn.fandom.com/' : 'https://dak.gg/'
    }
  });
  if (!image.ok) { skipped.push(`${character.name}：下载失败 HTTP ${image.status}`); continue; }
  const buffer = Buffer.from(await image.arrayBuffer());
  if (buffer.length < 512) { skipped.push(`${character.name}：拿到的文件只有 ${buffer.length} 字节，不像图片`); continue; }

  writeFileSync(target, buffer);
  rows.push({
    code: character.code,
    name: match?.key || englishName,
    resource: character.resource || englishName,
    file: `assets/characters/${fileName}`,
    sourcePage,
    sourceImage: imageUrl,
    source: from,
    sha1: createHash('sha1').update(buffer).digest('hex'),
    bytes: buffer.length
  });
  added += 1;
  console.log(`\n已写入 ${fileName}  ${buffer.length} 字节  ← [${from}] ${imageUrl}`);
}

if (write && added) {
  rows.sort((a, b) => (a.code || 0) - (b.code || 0));
  writeFileSync(manifestPath, `${manifestBom}${JSON.stringify(rows, null, 2)}\n`, 'utf8');
  console.log(`\nmanifest 已更新，共 ${rows.length} 条。`);
}
if (skipped.length) {
  console.log(`\n没补上 ${skipped.length} 张：`);
  skipped.forEach((s) => console.log(`  · ${s}`));
}
