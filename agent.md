# Agent Guide

## Project Summary

This repository is a React + Vite implementation of the Excel workbook `伤害计算器改版.xlsx`. The app is a polished, responsive damage calculator for the character "修女". It lets users choose gear, edit mastery/talent/target values, and instantly see final AP, defense modifiers, skill damage, and effect damage.

The original workbook is kept in the repository as source reference. The production UI and formulas are implemented directly in React in `src/App.jsx`.

## Tech Stack

- Vite
- React `18.2.0`
- Plain CSS in `styles/globals.css`
- No TypeScript and no UI component library

## Commands

```bash
npm install
npm run dev
npm run build
```

Local dev URL:

```text
http://localhost:3000
```

`npm run build` is the main verification command and has passed in this workspace.

## Important Files

- `src/App.jsx`: all calculator data, state, formulas, and markup
- `src/main.jsx`: React entry point and global style import
- `index.html`: Vite HTML shell
- `styles/globals.css`: complete visual design and responsive layout
- `package.json`: scripts and dependencies
- `伤害计算器改版.xlsx`: original Excel workbook reference

## Implemented Features

- Five gear slots: weapon, clothing, head, hand, shoes
- Gear table extracted from the workbook's equipment sheet
- Final AP calculation with equipment AP, talent AP, mastery AP percentage, normal AP percentage, and unique AP percentage
- Unique AP percentage handling: duplicate unique AP bonuses use the highest value, matching the Excel logic
- Cooldown, penetration value, penetration percentage, and equipment damage amp summaries
- Target presets from the workbook plus editable custom target values
- Defense modifier and final damage modifier calculation
- 修女 skill damage for Q, Q extra, W, E, E extra, R, R2, and stacked R2
- Effect damage for curse, corrosion, scar, wound tear, ghost fire, and repel bullet F
- Responsive glassmorphism-style UI for desktop and mobile

## Core Formulas

Final AP:

```text
floor((equipment AP + talent AP) * (1 + normal AP% + unique AP% + mastery AP%))
```

For 修女 mastery AP percent:

```text
mastery level * 0.041
```

Final defense:

```text
target defense * (1 - penetration %) - penetration value
```

Defense modifier:

```text
100 / (100 + final defense)
```

Damage modifier:

```text
1 + self damage bonus + equipment damage amp - target reduction - skill reduction
```

Final skill damage:

```text
skill base damage * defense modifier * damage modifier
```

Displayed final skill/effect results are floored where appropriate, following workbook notes that final numbers should be rounded down.

## Formula Source Notes

The formulas are based on the workbook's main damage calculator sheet and equipment attribute calculator sheet. Key translated formulas include:

- AP total from equipment table and talent AP
- AP percent aggregation with unique AP percent max behavior
- `100 / (100 + target defense * (1 - penPct) - pen)` defense correction
- `1 + damage increase - target damage reduction` damage correction
- 修女 skill bases such as `180 + AP * 0.65`, `160 + AP * 0.5 + target HP * 0.1`, `130 + AP * 0.4`, and `150 + AP * 0.25`

Some workbook comments mention unfinished or approximate talent/equipment effects. The app implements the concrete formulas present in the workbook and keeps manual inputs for uncertain modifiers.

## Maintenance Guidance

- Keep changes minimal and formula-focused. Avoid adding new libraries unless there is a clear benefit.
- If updating formulas, compare against the workbook cells and add comments only where the formula is not self-evident.
- If adding new equipment, update the `EQUIPMENT` array in `src/App.jsx` and ensure numeric fields default to `0` when absent.
- If adding new characters, do not overload the current page with unrelated formulas. Consider separating character-specific formulas into a small data structure or separate component only when needed.
- Run `npm run build` before committing.

## Git Notes

- Remote: `https://github.com/sanzennami/er_damage.git`
- The initial app commit is `ba977b9 Build damage calculator app`
- `node_modules/`, `dist/`, `.vite/`, and `.next/` are intentionally ignored
