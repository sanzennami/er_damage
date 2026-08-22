# Agent Guide

## Project Summary

React + Vite damage calculator for Eternal Return. It started as a port of the Excel workbook
`伤害计算器改版.xlsx` (kept in the repo as reference) and now covers 91 characters (90 with skill
data, 59 of them damage-verified against the game client), 661 equipment items, traits/augments,
tactical skills, mastery scaling, basic-attack damage, heal/shield projection, equipment-effect
damage, combos, and a multi-loadout comparison page with charts.

Current data volume: 693 skill segments across 90 characters — 357 read off the game client,
223 from official patch notes, 79 from the wiki, 20 from the datamined table, 14 hand-calibrated.

UI language is Simplified Chinese. `README.md` and `src/data/README.md` are the authoritative,
detailed docs — **read them before changing data**. This file is the short version for agents.

## Tech Stack

- Vite `4.5.x`, React `18.2.0`
- Plain CSS in `styles/globals.css`
- No TypeScript, no UI component library
- Deployed to Cloudflare Pages (`wrangler.toml`, output `dist`)

## Commands

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # main verification command — run before committing
```

```bash
node scripts/apply-patch-log.mjs      # push data to the target state (idempotent — run twice)
node scripts/export-hero-caveats.mjs  # regenerate docs/hero-caveats.md
npm run audit:skill-scaling           # patch text has per-level %, formula has no [..][level-1]
npm run audit:character-drift         # characters.json silently stale vs the datamined snapshot
npm run build:weapon-presets          # weaponRoutesRecommend.json -> weaponRoutePresets.json
```

Data pipeline scripts live in `scripts/*.mjs` (see README section 10). `npm run update:gamedata`
refreshes the er-gamedata clone in `.er-gamedata-cache/`.

## Architecture

Three layers — keep them separated:

| Layer | Path | Responsibility |
| --- | --- | --- |
| Data | `src/data/*.json` | Everything data-driven. See `src/data/README.md`. |
| Logic | `src/lib/*.js` | Pure functions, no React. |
| UI | `src/App.jsx` | React state, equipment/trait calculation, markup. |

- `src/lib/formula.js` — number helpers, formula evaluation, per-skill damage, progressive damage
- `src/lib/skillSources.js` — reads `heroSkills.json`, authority-based dedupe, merges saved config
- `src/lib/specialRules.js` — display/aggregation behaviour from `specialSkillRules.json`
- `src/lib/characterStats.js` — character growth stats (datamined base, in-game capture overrides on conflict)

`src/data/` has two levels: **top level is the edit surface and the only thing the app reads**;
`src/data/sources/` holds raw imports produced by the fetch/export scripts and is never read at runtime.

## Rules that matter most

**1. Never touch the hand-calibrated formulas.** 俞岷 (Yumin) and 奇娅拉 (Chiara) have 16 manually
verified formulas in `heroSkills.json`, stored with `source: "special-skill-rule"` (authority 100).
Consolidation preserves them verbatim. Do not modify, re-derive, or "improve" them, and never let a
generator or migration script write to them. Their display/aggregation behaviour lives in
`specialSkillRules.json` — add hero-specific behaviour there, never as `selectedHero === 'xxx'`
branches in `App.jsx`.

**2. er-gamedata is not authoritative.** `pypy-vrc/er-gamedata` is player-maintained datamined data
and is provably wrong in places (its legacy table records physical scaling as `ap` instead of
`attack` for characters like 杰琪 and 翡翠). It is only used to bootstrap the skill skeleton once.
**Official patch notes outrank it for every value and effect.**

Priority is decided by data authority, not by which file an entry lives in
(`SKILL_SOURCE_AUTHORITY` in `src/lib/skillSources.js`):

| Authority | `source` |
| ---: | --- |
| 100 | `special-skill-rule` |
| 90 | `manual` — any entry with `"manual": true`, in any file |
| 80 | `official-patch-note`, `external-official-patch` |
| 60 | `in-game-client` — values read off the game client UI |
| 40 | `external-wiki-current` and friends |
| 20 | `er-skill-damage-table` |
| 10 | `er-gamedata` |

Ties break on `updatedAt`, then position. Example: a segment with manual + patch + wiki + client
data keeps the manual one; the other three are archived in its `alternatives`.

**`manual: true` is reserved for 俞岷 and 奇娅拉 (16 entries).** It is a permanent authority-90 lock,
not a "somebody edited this" marker, and it makes `apply-patch-log` refuse to update the entry.
`consolidate-hero-skills.mjs:186` used to stamp it onto any entry diverging from `localConfig`,
which left 22 bogus locks behind; those were reset in Aug 2026 by filing each entry under its real
source instead. If you hand-correct a value, set `source` to where the value actually came from
(`in-game-client` for a client screenshot) — do **not** reach for `manual`.

**3. Skills live in exactly one file: `src/data/heroSkills.json`.** One damage segment = one entry;
cross-source priority is resolved offline by `scripts/consolidate-hero-skills.mjs`, never at runtime.
Losing sources are archived on the entry as `alternatives` (reference only, not used in calculation).
Hand-written entries may carry an arbitrary `formula`; datamined rows can only express
`base + coefficient * variable`. To make an edit stick, go through `patchLog.json` and set `source`
to where the value came from — **not** `manual`, which is reserved (see above).
Never hand-edit anything under `src/data/sources/`; re-run the consolidation instead.

**4. Fetch patch notes with `hl=zh-CN`.** The English and Chinese posts are not the same content:
English 12.0 only has Part.1, while the hero/item balance is a separate Part.2 in the Chinese list.
Only the Chinese version carries official translated names. Also check the "不停机维护" hotfix posts
in the range — they sometimes contain value changes.
List: `https://playeternalreturn.com/posts/news?categoryPath=patchnote&hl=zh-CN`

**5. Dedupe identity is `hero | group | skillId | dataKey`** (no `title`). Entries without those
fields fall back to `hero | title`. Equipment and characters are stored separately from skills
(`equipment.json` / `characters.json`) — never mix them back into one file.

**6. `localStorage` outranks shipped data for values.** The app persists config under
`er-damage-config-v1`. When data edits appear to have no effect, that cache is the usual cause.
Renames are migrated automatically (`src/data/dataMigrations.json` for skill titles; unknown hero
names resolve to the canonical one); numbers are not.

## Key data files

| File | Role |
| --- | --- |
| `heroSkills.json` | **All skills, one entry per damage segment.** The only place to edit skill data. |
| `equipment.json` | All equipment + the 60 stat definitions. Edit equipment values here. |
| `characters.json` | Character base/growth stats + skill-group index. No damage values. |
| `specialSkillRules.json` | Display/aggregation behaviour only (multi-hit, secondary scaling, stack selector, combos). **No formulas.** |
| `masteryStats.json` | Per-level weapon mastery growth. |
| `localConfig.json` | In-app config table defaults: `talents` / `combos`. `equipment`/`skills` stay empty. |
| `patchLog.json` | **Official patch log in target-state form.** Applied by `scripts/apply-patch-log.mjs`, which is idempotent — never revert data to re-run it. Add a new patch by appending an entry. Changes support `was` (the note's before-value, see below), `remove`, `overrideManual`. |
| `heroStatus.json` | Per-hero verification state. `damageTestOnly: false` puts the hero in the normal list; `note` / `caveat` are the human record of what was checked and what is **not** modelled. `caveat` is what `export-hero-caveats.mjs` publishes and what the UI shows. |
| `itemEffectDamage.json` | Equipment/trait effects that deal their own damage (the 特效与附加 panel). |
| `itemEffectModifiers.json` | Equipment effects that only grant stats. `type: "toggle"` = a temporary triggered buff the user opts into; anything permanent is folded in automatically. |
| `weaponRoutePresets.json` | Generated loadout presets keyed `实验体名｜武器类型`. See the last section. |
| `announcement.json` / `helpNotes.json` | Site announcement and help-bubble copy. Editable in-page on localhost only. |
| `dataMigrations.json` | Rewrites stale names in old browser caches. |
| `dakLoadoutAssets.json` | Augments/traits, tactical skills, icons. |
| `sources/*.json` | Raw imports (er-gamedata, wiki/patch pipeline, in-game capture). App never reads these. |

Trait/augment numeric effects are still hardcoded in `TRAIT_EFFECTS` (`src/App.jsx`), and tactical
skill damage in `calculateTacticalSkillEffect` — changing those requires touching `App.jsx`.

## Core Formulas

```text
final AP        = floor((equip AP + talent AP + trait AP + stack AP) * (1 + normal AP% + unique AP% + mastery AP%))
final defense   = target defense * (1 - defense reduction) * (1 - pen%) - flat pen
defense mod     = 100 / (100 + final defense)
damage mod      = 1 + self bonus + equipment amp + trait amp - target reduction - skill reduction
final mod       = defense mod * damage mod
skill damage    = floor(floor(formula) * final mod)

basic attacks use a SEPARATE multiplier chain (official wiki wording):
basic attack amp = equipment + mastery + effect "IncreaseBasicAttackDamageRatio"
basic attack     = floor((attack * defense mod * crit mult + flat BA damage)
                         * (1 + self bonus + BA amp - target BA reduction))
                   crit mult = 1.75 + crit damage; the flat term is added AFTER defense and crit
```

**Skill amp and basic-attack amp are two independent buckets.** Segments the game classifies as
basic-attack damage (`damageType: "basicAttack"` on the entry) run through the basic-attack chain —
they take basic-attack amp and the target's basic-attack reduction, not skill reduction.
Target mastery gives `level * 0.8%` skill reduction (from level 2) and `level * 1%` basic-attack
reduction (1% at level 1, 20% at level 20).

- Unique stats (`unique: true` in `itemStatDefinitions`) take the **max** across items, not the sum.
- Mastery AP% comes from `masteryStats.json` per `characterCode` + weapon type (e.g. 奇娅拉 Rapier
  `SkillAmpRatio` 0.041/level), not a hardcoded constant.
- Target mastery adds `level * 0.8%` skill reduction and `level * 1%` basic-attack reduction.
- All displayed results are floored (`damageFloor`, with a `1e-9` tolerance).

Formula variables — `base`, `ap`, `attack`, `extraAttack`, `stacks`, `level` (skill level),
`heroLevel` (character/mastery level 1-20, for patch notes' `(+实验体等级*N)` terms), plus:

| Variable | Meaning |
| --- | --- |
| `targetHp` / `targetCurrentHp` / `targetLostHp` | target max / current / lost HP |
| `maxHp` / `selfCurrentHp` / `selfLostHp` | **own** max / current / lost HP |
| `extraHp` | own bonus HP (equipment + traits) |
| `defense` / `shield` | own defense / shield |
| `critChance` | crit chance, 0–1 |
| `basicAttackAmp` | basic-attack amp, 0–1 |
| `accumulatedDamage` | manually entered accumulated damage (Daniel W) |

When a patch note says 「体力上限X%」 without 「目标」, it means **your own** max HP → `maxHp`.
Only 「目标体力上限」 is `targetHp`. They often appear in the same sentence.

`evaluateFormula` whitelists the expression; anything containing Chinese, `%`, or function names
silently evaluates to `0`. `Math.min` / `Math.max` are the only allowed calls (used for caps).

## Modeling primitives (added after the 12.0b/12.1 client-capture pass)

Everything below is data-driven — reach for these instead of branching in `App.jsx`.
Full details in `src/data/README.md`.

| Situation | How to model |
| --- | --- |
| Patch note writes `(攻击力X%) * (普攻增幅)` | `damageType: "basicAttack"` — do **not** also multiply `basicAttackAmp` in the formula, that double-counts |
| True damage | `damageType: "true"` |
| "Enhances your next basic attack" | `kind: "basicAttack"` — only picks the panel; the damage itself still settles as skill damage |
| Shield / heal | `kind: "shield"` / `"heal"` |
| No damage, only grants a stat | `kind: "buff"` + `buffKey` — gives that slot its own level selector |
| Max is a fixed multiple of min, scaling with charge time | `progressiveDamage`; use the `coefficients` array when several coefficients scale together |
| Scales with target's lost HP between min and max | `(min segment) * (1 + k * targetLostHp / targetHp)` |
| Resource bar 0–100 rather than stacks | `maxStacks` + `stackStep` → slider + number box |
| Hero-specific conditional buff | `modifiers` in `specialSkillRules.json` (dropdown feeding `apPct` / `damageBonus`) |
| …and it has exactly **two** states | still `modifiers`; the UI renders a two-option modifier as a `ToggleSwitch` automatically, no extra field |
| "Stat A converts into stat B" | `statConversion` in `specialSkillRules.json` (Celine: cooldown → skill amp) |
| Permanent form change decided before the fight (Martina 采访中/报道中) | `formSwitch` in `specialSkillRules.json` + `form` on each entry; `filterSkillsByForm` hides the other form's segments. Do **not** use this for forms that swap mid-combat (Ian, Rio) — those stay listed side by side and are marked mutually exclusive in the `caveat`. |
| R enhances Q/W/E and the enhanced segment reuses the base skill's table | put the entry in the base slot with `(R强化)` in the title. `slot` picks the column, `levelSlot` picks which skill's level selector drives it — 5-level tables keep `levelSlot` on the base slot, R's own new 3-level segments use `levelSlot: "R"` |
| Buff granting flat points, not a percentage | `buffKey: "ap"` / `"attackPower"` — these are in `BUFF_FLAT_KEYS` and are **not** divided by 100. `apPct` / `damageBonus` / `basicAttackAmp` are percent-points and are. |
| Buff that scales heals and shields | `buffKey: "healShieldAmp"` — multiplies every `kind: heal` / `kind: shield` entry |
| Damage proportional to "damage you already dealt" (Daniel W) | `accumulatedDamage` variable → a manual input box appears on the skill panel |
| "Scales between min and max by target's lost HP, capped at N% HP left" | `(base + X) * (1 + k * Math.min(1, targetLostHp / (targetHp * t)))` — `interpolationInfo` in `formula.js` string-parses this shape and renders it in Chinese, and suppresses the denominator variable from the additive list |
| Equipment effect that is a **triggered** buff, not a permanent stat | `type: "toggle"` in `itemEffectModifiers.json`. Modelling a 3-second on-hit buff as permanent is what once inflated Ian's attack from 384 to 430. |

**Mutually exclusive segments must differ in the first word of the title.** Grouping keys on the
first space-delimited token after the slot prefix, so a base segment and its enhanced replacement
sharing a first word get summed into one "全段合计" — which is wrong for exclusive variants.

## UI surfaces your data lands in

Knowing which panel an entry falls into decides which fields to set.

| Panel | Fed by |
| --- | --- |
| 技能伤害 (per slot P/Q/W/E/R) | ordinary entries; slot from `slot`, else the title prefix |
| 预计恢复与护盾 | `kind: "heal"` / `kind: "shield"` — never taken through defense or damage reduction |
| 强化普攻 | `kind: "basicAttack"` — shown as "one basic attack including this extra segment" |
| 特效与附加 | `itemEffectDamage.json` (equipment/trait effects that deal damage) |
| 计算过程 | the derived stat cards, including 最终攻击力 and its `attackBreakdownHint` |
| 拉表对比 | `COMPARISON_STAT_METRICS` in `App.jsx`. Metrics are `core` (always shown: 最终法强, 攻击力, 基础/额外攻击力, 每发平A预估, 最终伤害倍率), `standalone` (装备特效伤害 — its own always-present checkbox), or on-demand (only offered when some scenario's gear actually provides that stat, e.g. 冷却缩减, 伤害提升%). The charts follow the checkboxes and each collapses to name + number. |

The announcement dialog auto-opens on load only when `announcement.json` differs from what the
browser last saw — `announcementSignature()` compared against `er-damage-announcement-seen-v1`.
Opening it clears the unread badge. Editing the announcement in-page is localhost-only
(`HELP_NOTES_EDITABLE`); the published build renders help notes read-only through
`<span className="helpNoteText">`, which needs `white-space: pre-line` or newlines get eaten.

Every equipment slot carries an `EMPTY_GEAR_VALUE` 「（空）」 option, in both the builder and the
comparison scenarios. The two auto-fill effects guard on `isEmptyGear` so choosing it is not
immediately overwritten by the weapon-route preset.

## Traps that have actually bitten (do not relearn these)

**Encoding / escaping**

- Edit `App.jsx` with the Edit tool. Running Python through a shell heredoc turned `\b` into a
  literal **backspace byte (0x08)**, so the regex silently never matched — `sed` renders it
  invisibly, only `od -c` shows it.
- **Never** use PowerShell `Get-Content -Raw | Set-Content` on files containing Chinese: PS 5.1
  reads as ANSI and writes UTF-8, mojibaking the whole file **irreversibly**. Recover from git.
- Backticks inside bash heredocs get shell-expanded — write markdown with the Write tool.
- **Git Bash halves backslashes even inside a quoted heredoc** (`\\s` arrives as `\s`), so any
  regex written through one is silently mangled. This was the root cause of every broken-regex
  incident in the Aug 2026 pass. Use `String.fromCharCode(92)`, or avoid regex entirely (the
  `interpolationInfo` parser in `formula.js` is deliberately written with plain string scanning).
  `node -e "…"` is worse — double quotes let bash eat backticks and `${}` too.

**`apply-patch-log` target-state comparison**

The "already at target, skip" check has silently swallowed changes four separate times, each when a
newly added field was not part of the comparison: `maxStacks` → presentation fields → `title`/`source`
→ `coefficientText`/`sourceNote`. **Any new field that gets written onto an entry must also join the
`atTarget` comparison**, or edits to it will never apply. `progressiveDamage` is an object — compare
with JSON, not `===`.

**Counter names** — `stats` only has `applied / already / manualHeld / missing / wasMismatch`.
Using any other name (a `stats.written` once slipped in) makes the summary line print `NaN` and the
whole category vanish from the report.

**React declaration order** — `result` and several memos are declared midway through the component.
Referencing them earlier throws a TDZ error at runtime while `npm run build` still succeeds.

**Patch ordering** — `order` decides who writes last, not authority. Client screenshots read on
12.0b must sort **before** the 12.1 patch note, otherwise the older reading overwrites the newer
official value. Keep one hero per client/model patch: `version` is the internal key
(`client-12.0b-sua`) but `label` (`12.0b`) is what gets printed on the entry, and a patch covering
two heroes prints the wrong hero's name on both.

**Stale display fields.** `sourceLabel` / `sourceVersion` / `sourceDate` are cosmetic strings that
travel with an entry. When an entry's real `source` changes they must be **deleted**, not left
behind, or the UI shows a provenance that contradicts the data (47 entries once displayed
"Wiki / 2025-06-25" on client-read values). Both `apply-patch-log.mjs` and the `preferCanonical`
branch of `mergeSkills` (`CANONICAL_ONLY_FIELDS`) now drop them; keep it that way.

**`getNumber(x) || fallback` swallows a legitimate 0.** `progressiveDamage` step 0 was treated as
unset, which only became visible on a hero whose `default` differed from `min` (Hart Q, default 4)
— and it also produced duplicate React keys. Compare against `undefined` / `null` / `''` explicitly.

**Equipment stat keys are not aliases you can pick from.** The canonical key is `skillAmp`; the
top-level `ap` is only an alias read at one place. Writing `stats.ap` through the patch log created
four junk keys that quietly did nothing.

**Declare comparison-page memos in dependency order.** `availableComparisonMetrics`,
`comparisonEffectColumns`, `comparisonMetricColumns`, `comparisonChartMetrics` form a chain; four
separate TDZ crashes came from referencing one before its `const`. `npm run build` does not catch
this — only loading the page does.

**The browser pane does not composite.** CSS transitions never advance, so `getComputedStyle`
returns the transition's *start* value. A `ToggleSwitch` read as "one step behind" purely because
of this. Disable the transition before measuring, or read state from the DOM instead of styles.

**Console output is buffered across HMR.** Old errors keep showing after they are fixed. To confirm
a build is actually clean, reload the page (or open a fresh tab) and re-read the console.

**Verify numbers in the browser.** Hand-check a few segments after every data change. That step is
what caught basic-attack amp being counted twice (`aggregateEquipmentStats` already folds the
`*ByLv` stats into the base key — do **not** multiply by level again), stacks not reaching `calc`,
a slider that never rendered, and a `.comparisonPage` grid track that grew to the table's
max-content width (2011px in a 946px viewport — fixed with `grid-template-columns: minmax(0, 1fr)`
plus `min-width: 0` on the panels).

**`er-skill-damage-table` (authority 20) is wrong often enough to distrust by default.** The Aug
2026 pass found fabricated segments (Jackie Q/R, Hart Q split in two), an order-of-magnitude error
(Ian R recorded as 20/25/30 instead of 200/300/400), and coefficients copied across from the wrong
state (Ian Q/E carrying the other stance's coefficient, Barbara R attaching the laser's coefficient
to the drone). When a client screenshot disagrees with it, the screenshot wins.

## Entering one hero from client screenshots

This is the recurring task: the user drops 4–6 skill tooltips from the game client and names the
hero. The pipeline is always the same.

1. **Read what already exists first** — `heroSkills.json` entries for that hero, plus
   `characters.json` `skillGroups` for the canonical Chinese skill names and `group` / `skillId`.
2. **Never read skill *names* off a screenshot.** Names come from gamedata / the existing entries.
   (A screenshot once produced 致瘫射击 for Bernice's Q, which is 致瘸射击.) Numbers come from the
   screenshot; names never do.
3. **Write a throwaway script** under the scratchpad that appends one patch to `patchLog.json`:
   `version: "client-<patch>-<hero-key>"`, `order` a `YYYYMMDD` **after** every existing patch that
   touches this hero, `label` the game version, `source: "in-game-client"`. One hero per patch —
   `label` is what gets printed on the entry, so a two-hero patch mislabels both.
4. Each change carries `coefficientText` (the tooltip line verbatim) and a `note` explaining what
   changed and why. New segments need `create: true` plus `hero` / `slot` / `group` / `skillId` /
   `dataKey`. Deletions use `remove: true`.
5. `node scripts/apply-patch-log.mjs` twice — the second run must report 写入 0.
6. **Add a `heroStatus.json` entry**: `damageTestOnly: false`, `verifiedBy`, a `note` listing every
   value that changed and by how much, and a `caveat` listing what is *not* modelled and which
   segments are mutually exclusive. The caveat is user-facing; write it for a player, not a dev.
7. `npm run audit:skill-scaling`, then `npm run build`.
8. **Open the hero in the browser and read the rendered numbers.** Reload first — Vite will not
   always re-import changed JSON, and the page may be showing the pre-edit data.
9. Bump `APP_VERSION`, then `git add -A`. Do not commit.

Recurring judgement calls, already settled:

- 「体力上限X%」 without 「目标」 is your own `maxHp`; only 「目标体力上限」 is `targetHp`. They
  routinely appear in the same tooltip.
- A tooltip's damage table is the authority for base values; the inline description is the
  authority for coefficients. When they disagree, the table is usually one skill level off.
- Malformed official copy is common — Xiukai's W has literally unbalanced parentheses in the
  game data. Pick the reading that is not absurd, model it, and say so in the `caveat`.
- A skill that "hits N times over M seconds" gets `maxHits` + `hitNote`, not N separate entries.
- Heals and shields granted to "you and an ally" show the single-target amount; say so in the
  `caveat` rather than doubling the number.

## Maintenance Guidance

- Keep changes minimal and formula-focused. Do not add dependencies (currently react + react-dom + vite only).
- Express hero-specific behaviour as data (`specialSkillRules.json`), not as branches in `App.jsx`.
- Put pure math in `src/lib/formula.js`, data assembly in `src/lib/skillSources.js`.
- New equipment goes in `equipment.json`. The `DEFAULT_EQUIPMENT` array in `App.jsx` is only a
  fallback for when `equipment.json` ships no equipment at all — do not add items there.
- Record provenance on any value you change: `sourceUrl`, `sourceNote`, `updatedAt`.
- When correcting a published Chinese name, append a migration entry to `dataMigrations.json`.
- The one-shot migration scripts in `scripts/archive/` are historical. **Current data changes all go
  through `patchLog.json` + `apply-patch-log.mjs`**, which is idempotent — write a throwaway script
  that appends a patch entry, run it, then run the applier twice and confirm the second says 写入 0.
- **Record the note's before-value in `was`.** Patch notes read "A → B"; we only store B, but A is
  free verification: if our value before the patch matches neither A nor B, we recorded something
  wrong earlier. This caught four Sua coefficients I had misread off screenshots by +5 points each.
  It only warns, never blocks.
- After a data change: `node scripts/export-hero-caveats.mjs` regenerates `docs/hero-caveats.md`
  (never hand-edit that file), then `npm run build`, then bump `APP_VERSION`.
- **Only `git add` — do not commit.** The user pushes manually, and `push.cmd` ships the whole
  working tree, so never leave scratch data under `src/data/`.

## Git Notes

- Remote: `https://github.com/sanzennami/er_damage.git`
- `node_modules/`, `dist/`, `.vite/`, `.next/`, `.er-gamedata-cache/`, `.er-gamedata-tmp/` are ignored
- Current app version constant: `APP_VERSION` in `src/App.jsx` — bump it with every batch of changes

## characters.json 会悄悄过期

`npm run update:gamedata` 只写 `src/data/sources/erGameData.json`；`src/data/characters.json`
只被 `apply-patch-log.mjs` 改。两边从来不互相校验，所以最初导入时错掉的基础属性会一直躺着。
2026-08-19 就是这样发现克雷弗整条记录停在旧值、`growth` 还是 `null`——而它是默认可见的英雄，
Lv20 攻击力停在 43（应为 118）。

刷完解包后跑一次：

```bash
npm run audit:character-drift
```

它会把差异分成「有公告背书」（补丁 order 比解包快照新，正常）和「没人背书」（多半是陈旧导入，
要处理），并单独警告有解包成长数据、我们却还是 `null` 的实验体。

## 官方武器路线推荐 → 装备预设

`src/data/sources/weaponRoutesRecommend.json` 是官方接口返回的 100 条武器路线原始数据。

```bash
npm run build:weapon-presets
```

生成 `src/data/weaponRoutePresets.json`，键是「实验体名|武器类型」，54 份、覆盖 51 名实验体。
一条路线里 `weaponCodes` 是英雄级过渡装、`lateGameItemCodes["0"]` 是成型装——取成型装，缺槽用过渡装补。
（`lateGameItemCodes` 的 "2"/"3" 在源数据里本身就不完整，会出现两件头部、没有武器，别用。）

App 侧的规则：

- 换实验体时落在**第一把有配装可用的武器**上（用户存过的 > 官方预设 > `weapons[0]`）。
  不能直接用 `weapons[0]`：秀雅默认是锤，官方只给了棍棒路线。
- 用户改过的配装按 `heroLoadouts["实验体|武器类型"]` 存进 localStorage，盖过官方预设。
- 判断「改没改过」不用标志位，而是把当前配装和预设逐项比（`loadoutFieldsEqual`）：
  一致就删掉覆盖记录，这样以后预设更新了还能跟着更新。
- 记录只在**组合键没变**的那一帧发生（`loadoutRecordKeyRef`）。刚切实验体的那一帧武器类型已经是
  新的、装备还是上一个实验体的，那时候记下去会把旧配装错挂到新实验体名下。
- 改 `[selectedHero]` 那个 effect 时注意：紧跟着的第二个 effect 看到的 `weaponTypeFilter`
  还是切换前的值（同一次提交里 setState 尚未生效），它的兜底也必须走 `preferredWeaponRawFor`，
  否则会把刚按推荐路线选好的武器顶掉。

## 「承受伤害增加」的两种建模

看它放大谁的伤害，别混用：

- **易伤类**（放大所有来源，队友打上去也享受）→ `specialSkillRules.json` 的 `modifiers` 开关，
  选项给 `damageBonus`。例：秀雅 Q 冲撞点，站在上面的敌人承受伤害 +30%。
- **自增伤类**（只放大自己特定几段）→ 在受影响的技能条目上写 `selfAmp`，
  页面在总计下面多一行「受{source}增伤时伤害」。例：彰一 E 协商，被标识的敌人
  **因投掷的短剑**承受伤害 +25%，只影响他自己的 R 短剑和 P 短剑。

```jsonc
"selfAmp": { "source": "协商", "multiplier": 1.25, "note": "……" }
```

`multiplier` 写加成后的倍率（1.25）不是增量（0.25）。`selfAmp` 已加进 apply-patch-log
的 `PRESENTATION_FIELDS`，补丁里可以直接带。

自增伤类不做成开关的理由：开关是全局的，没法只作用于部分段，而且容易忘了关掉——
把加成后的值直接列在受影响的那一段旁边，看数时不会漏也不会串。
