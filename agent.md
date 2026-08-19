# Agent Guide

## Project Summary

React + Vite damage calculator for Eternal Return. It started as a port of the Excel workbook
`伤害计算器改版.xlsx` (kept in the repo as reference) and now covers 89 characters, 661 equipment
items, traits/augments, tactical skills, mastery scaling, basic-attack damage, combos, and a
mastery-sweep comparison table.

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

Data pipeline scripts live in `scripts/*.mjs` (see README section 9). `npm run update:gamedata`
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

**3. Skills live in exactly one file: `src/data/heroSkills.json`.** One damage segment = one entry;
cross-source priority is resolved offline by `scripts/consolidate-hero-skills.mjs`, never at runtime.
Losing sources are archived on the entry as `alternatives` (reference only, not used in calculation).
To make a hand edit stick, add `"manual": true` — authority 90, survives re-consolidation, and may
carry an arbitrary `formula` (datamined rows can only express `base + coefficient * variable`).
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
| "Stat A converts into stat B" | `statConversion` in `specialSkillRules.json` (Celine: cooldown → skill amp) |

**Mutually exclusive segments must differ in the first word of the title.** Grouping keys on the
first space-delimited token after the slot prefix, so a base segment and its enhanced replacement
sharing a first word get summed into one "全段合计" — which is wrong for exclusive variants.

## Traps that have actually bitten (do not relearn these)

**Encoding / escaping**

- Edit `App.jsx` with the Edit tool. Running Python through a shell heredoc turned `\b` into a
  literal **backspace byte (0x08)**, so the regex silently never matched — `sed` renders it
  invisibly, only `od -c` shows it.
- **Never** use PowerShell `Get-Content -Raw | Set-Content` on files containing Chinese: PS 5.1
  reads as ANSI and writes UTF-8, mojibaking the whole file **irreversibly**. Recover from git.
- Backticks inside bash heredocs get shell-expanded — write markdown with the Write tool.

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

**Verify numbers in the browser.** Hand-check a few segments after every data change. That step is
what caught basic-attack amp being counted twice (`aggregateEquipmentStats` already folds the
`*ByLv` stats into the base key — do **not** multiply by level again), stacks not reaching `calc`,
and a slider that never rendered.

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
