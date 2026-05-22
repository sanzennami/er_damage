# External Skill Damage Data

Generated at: 2026-05-21 / 2026-05-22 workspace run.

This directory records missing skill damage coverage and external data candidates for Eternal Return character skills.

## Source Priority

1. `er-gamedata` structured rows remain the primary local source when they contain explicit damage fields.
2. Official Eternal Return patch notes are treated as the highest-priority numeric update source.
3. Official Eternal Return Wiki pages are used as the current formula/skill-part structure source.
4. Wiki values should be reviewed against newer official patch notes before merging into primary game data.

The practical rule is:

`Wiki formula structure + latest newer official patch numeric delta = best external candidate`

## Files

- `missing-skill-damage-heroes.csv`
  Heroes with at least one skill whose text indicates damage coefficients but whose structured `er-gamedata` damage rows are missing.

- `missing-skill-damage-skills.csv`
  Skill-level missing coverage list. This is the input for external lookup.

- `external-skill-damage-wiki-current.csv`
  Parsed skill damage rows from the Official Eternal Return Wiki through the MediaWiki API. Rows include wiki skill name, damage part label, level, base value, scaling text, page URL, and page revision timestamp.

- `external-skill-damage-official-patches.csv`
  Parsed official patch-note damage changes from `playeternalreturn.com`. Rows are sorted newest first and include the raw arrow-delta text plus the right-hand current value text.

- `external-skill-damage-reconciliation.csv`
  One row per wiki skill group. It summarizes the wiki formula and lists newer official same-slot patch candidates. This is the safest table to review before applying external values.

- `external-skill-damage-source-notes.csv`
  Wiki source audit per hero.

- `external-skill-damage-official-patch-sources.csv`
  Official patch-note source audit per article.

- `external-skill-damage-unresolved.csv`
  Wiki matching failures. Current run has no unresolved skill slots.

## Current Coverage Snapshot

- Missing-coverage heroes recorded: 85
- Wiki parsed rows: 2605
- Wiki unresolved skill slots: 0
- Official patch articles scanned: 315
- Official patch candidate rows: 3820
- Reconciliation skill groups: 421
- Skill groups with newer official patch candidates: 232

## Examples

Justyna Q:

- Wiki gives the formula structure for `Barrage & Annihilation`.
- Official patch `PATCH NOTES 9.6 - DECEMBER 23RD, 2025` updates Barrage Q1 from `(+Skill Amplification 35%)` to `(+Skill Amplification 40%)`.
- The reconciliation table therefore marks Justyna Q as needing review against the newer official patch candidate.

Laura Q:

- Wiki gives `Thorn Lilac` formula structure.
- Official patch `PATCH NOTES 10.7 - APRIL 16TH, 2026` updates Q to `50/75/100/125/150 (+Skill Amplification 55%)`.

## Scripts

- `node scripts/export-missing-skill-damage-heroes.mjs`
- `node scripts/fetch-external-skill-damage-wiki.mjs`
- `node scripts/fetch-external-skill-damage-official-patches.mjs`
- `node scripts/build-external-skill-damage-reconciliation.mjs`

