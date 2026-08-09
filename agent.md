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
basic attack    = floor(attack power * defense mod * damage mod); crit multiplier = 1.75 + crit damage
```

- Unique stats (`unique: true` in `itemStatDefinitions`) take the **max** across items, not the sum.
- Mastery AP% comes from `masteryStats.json` per `characterCode` + weapon type (e.g. 奇娅拉 Rapier
  `SkillAmpRatio` 0.041/level), not a hardcoded constant.
- Target mastery adds `level * 0.8%` skill reduction and `level * 1%` basic-attack reduction.
- All displayed results are floored (`damageFloor`, with a `1e-9` tolerance).

Formula variables: `base`, `ap`, `attack`, `extraAttack`, `targetHp`, `stacks`, `level`
(skill level) and `heroLevel` (character/mastery level 1-20, for patch notes' `(+实验体等级*N)` terms).
`evaluateFormula` whitelists the expression; anything containing Chinese, `%`, or function names
silently evaluates to `0`.

## Maintenance Guidance

- Keep changes minimal and formula-focused. Do not add dependencies (currently react + react-dom + vite only).
- Express hero-specific behaviour as data (`specialSkillRules.json`), not as branches in `App.jsx`.
- Put pure math in `src/lib/formula.js`, data assembly in `src/lib/skillSources.js`.
- New equipment goes in `equipment.json`. The `DEFAULT_EQUIPMENT` array in `App.jsx` is only a
  fallback for when `equipment.json` ships no equipment at all — do not add items there.
- Record provenance on any value you change: `sourceUrl`, `sourceNote`, `updatedAt`.
- When correcting a published Chinese name, append a migration entry to `dataMigrations.json`.
- Patch migration scripts (`scripts/apply-official-patch-updates*.mjs`) are one-shot: they validate
  the "before" value and must be re-run from a clean `git checkout -- src/data`.
- Run `npm run build` before committing.

## Git Notes

- Remote: `https://github.com/sanzennami/er_damage.git`
- `node_modules/`, `dist/`, `.vite/`, `.next/`, `.er-gamedata-cache/`, `.er-gamedata-tmp/` are ignored
- Current app version constant: `APP_VERSION` in `src/App.jsx` (`v0.1.061`)
