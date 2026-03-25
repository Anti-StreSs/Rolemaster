# Checkpoint — CPR093 Reverse Engineering

*Updated: 2026-03-25*

## Summary

Session 2026-03-25 (Phase 4j — Bug fixes + PDF parity) addresses correctness and quality issues. NPC generator corrected: race bonuses no longer modify temp/pot stats — in RM2 they are roll/skill bonuses only, so the application loop was removed entirely. NPC generation now picks coherent race+class pairs via continuous affinity scoring (racial stat bonus weights vs. archetype requirements) with weighted-random fallback so unusual combos remain possible. Weapon categories are auto-assigned by class archetype and the top-2 developed as actual weapon skills before generic DP spending. Stat gains are now logged to the unified event log; an optional manual-roll mode (checkbox in Stats tab) shows a modal with editable D100 inputs and live recalculation for physical-dice use. Spell Adder corrected throughout: it grants X free casts/day at no PP cost — it was incorrectly added to `calcPowerPoints()`, now removed. PDF export overhauled for parity with the print sheet: two-column skills layout (2×92mm), DM rank boxes (filled/empty squares), per-skill bold/text-color/row-highlight from character data, uneven column widths, and alternating stat row tints. Print sheet defaults changed to P1=43 / P2+=68 skills per page.

## Completed

- [x] **Phase 1 — Initial Analysis** (Jan 2025)
- [x] **Phase 2 — Full Ghidra MCP Scan** (2026-03-11)
- [x] **Phase 3 — Data File Parsing** (2026-03-11)
- [x] **Phase 4a — PWA Construction** (2026-03-12)
- [x] **Phase 4b — Game Engine Fixes** (2026-03-20)
- [x] **Phase 4c — RM2 Faithful Engine** (2026-03-20): stat potentials, DP formula, data fixes, weapon categories
- [x] **Phase 4d — Engine + UX Overhaul** (2026-03-21): sub-skills, rolling methods, spells, phases, theme
- [x] **Phase 4e — Full UI + Game Mechanics** (2026-03-22): UI assets, print system, shields/DB, hit points, spell SGR, background options
- [x] **Phase 4f — Background Effects Integration** (2026-03-22): Batch 19 — all 7 tasks A-G
- [x] **Phase 4g — Infrastructure & Tooling** (2026-03-23): Batches 20-22 + specializable skills expansion
- [x] **Phase 4h — Studio augmenté** (2026-03-24): Batches 23-24-26-27 — PDF export, NPC generator, build compare, optional rules
- [x] **Phase 4i — Combat & Manœuvres** (2026-03-24): Batches 25+28 — combat tables, maneuver/RR resolution engine
- [x] **Phase 4j — Bug fixes + PDF parity** (2026-03-25): NPC coherence, stat gain modal, spell adder correction, PDF overhaul

## Phase 4j Changes (2026-03-25)

### NPC Generator — Race bonus correction
- Removed race bonus application loop from `npc-generator.js` entirely
- In RM2, racial bonuses apply to rolls/OB at resolution time — NOT to temp or pot stats
- Stats now come from pure dice rolls, matching CPR093 original behaviour

### NPC Generator — Coherent race/class selection (ATTEMPTED — NOT VERIFIED IN BROWSER)
- `getClassArchetype(cls)` → 10 archetypes: `heavy_fighter`, `cavalry`, `rogue`, `ranger`, `duelist`, `monk`, `semi_fighter`, `caster_staff`, `caster`, `other`
- `getRaceClassAffinity(race, cls)` → continuous 1-100 score (racial stat bonuses vs. archetype weights)
- `pickCoherentRace(classes, races, classIdx)` / `pickCoherentClass(classes, races, raceIdx)` with weighted-random
- `pickWeightedRandom(items, scores)` — score-proportional selection, always allows all options
- `generateNPC` accepts `-1` sentinel for coherent-random race or class; `app.js` passes `-1` instead of random index
- **STATUS: User confirmed NPC generation still broken after these changes.**

### NPC Generator — Smart weapon assignment (ATTEMPTED — CONTAINS CONFIRMED BUG)
- `getWeaponPriorityOrder(cls, stats)` returns weapon type order by archetype + stat bonus tiebreak
- `autoAssignWeaponPriorities(character, cls)` fills all 6 priority slots using archetype order
- `autoAddWeaponSkills(char, data, n)` adds 1-2 weapon skills from top-2 priority categories
- `spendWeaponSkillDP(char, ranksStore, dpBudget, archetype)` meant to develop weapon skills first
- **BUG FOUND (code review)**: `autoAddWeaponSkills` calls `getWeaponSkillCost(char.classIndex, typeNum, char.weaponPriorities)` where `typeNum` is a number (e.g. `1`) but `char.weaponPriorities` contains string IDs (`['edged_1h', ...]`). `weaponPriorities.indexOf(1)` always returns -1 → `cost = null` → `spendWeaponSkillDP` skips every weapon → **0 DP spent on weapon skills**.
- Fix: change `typeNum` to `typeId` (string) in the `getWeaponSkillCost` call at `autoAddWeaponSkills` line 164.

### NPC Generator — Stat assignment inverted (CONFIRMED BUG)
- `generateNPC` sorts rolls descending (`b.tempRoll - a.tempRoll`) then assigns rollIdx=0 (best roll) to prime stats.
- This is **backwards** vs. `wizard.js autoAssignRolls` which explicitly gives prime stats the LOWEST rolls (prime boost compensates) and best rolls to dev stats (CO, AG, etc.) to maximise DP.
- Net effect: NPCs have huge prime stats that don't benefit from the boost, and low CO/AG → less DP than expected.
- `char.primeStats` array is also never set on the generated character object (computed locally as `primeStatIndices` but never assigned to `char.primeStats`), so prime stat highlighting is wrong when the NPC is loaded in the editor.

### Stat gain modal + event logging
- `logStatGain` helper added to `event-log.js`
- Level-up stat gains always logged via `logStatGain` (both auto and manual paths)
- Optional "manual stat gains" checkbox in Stats tab (off by default), stored in `character.manualStatGains`
- When enabled: level-up shows modal with 10-stat table, auto-rolled D100s, editable inputs, live gain recalculation, "Reroll all" button
- `performLevelUp` uses inner `applyAndFinish(gains)` closure — modal calls it on confirm, auto path calls it directly

### Spell Adder correction
- `calcPowerPoints()` in `character.js`: removed `pp += bgBonuses.spellAdder` (was wrong — free-cast allowance ≠ PP bonus)
- `summarizeBackgroundBonuses()` in `background-effects.js`: spell adder moved to standalone line with correct label
  - FR: `"Ajouteur de sorts: X sort(s)/jour sans coût en PM"`
  - EN: `"Spell Adder: X spell(s)/day at no PP cost"`
- `wizard.js` background option display: label updated to `Ajouteur: X sort(s)/jour sans PM` / `Spell Adder: X spell(s)/day free`

### Auto-assign weapon button (wizard.js)
- Uses `getWeaponPriorityOrder(cls, stats)` (imported from npc-generator.js) instead of filling arbitrary order

### PDF export — Full overhaul (`pdf-export.js`, 290 lines rewritten)
- **Two-column skills layout**: left col (x=10) + right col (x=108), each 92mm wide with 6mm gutter
- **DM rank boxes**: 9 filled/empty 1.85mm squares per skill row; overflow shown as `+N`
- **Per-skill bold**: `character.skillBold[key]` → `doc.setFont('helvetica', 'bold')`
- **Per-skill text color**: `character.skillTextColors[key]` → mapped to 8 RGB presets (red/green/blue/purple/gold/orange/gray/teal)
- **Per-skill row highlight**: `character.skillHighlights[key]` → 6 fill presets drawn as background rect before text
- **Uneven column widths**: stat name (16mm) wider than numerics (11mm each); combat block 2-column
- **Alternating stat row tints**: even rows get parchment fill `rgb(248,244,234)`
- **Color-coded stat totals**: green for positive, red for negative
- `renderSkillsSection()` returns `{y, col}` — caller adds new page when ending in right column
- `getDevelopedSkills()` now includes `bold`, `textColor`, `highlight` for all skill types (normal, weapon sub-skills, generic sub-skills)

### Print sheet defaults
- `skillsPerPage1`: 40 → 43
- `skillsPerPageN`: 70 → 68
- Updated in 3 places: wizard.js defaults object, wizard.js parseInt fallbacks, print-sheet.js

### PDF combat block fix
- `calcHitPoints` returns `{base, cap}` object — was `String([object Object])`; now renders `"${hp.base} / ${hp.cap}"`
- `calculateDB` returns object with `printDisplay` property — now uses `db.printDisplay`

## Still TODO

### NPC Generator — 3 confirmed bugs to fix
- [ ] **BUG**: `autoAddWeaponSkills` passes `typeNum` (int) to `getWeaponSkillCost` which expects string ID → cost=null → 0 DP on weapon skills. Fix: replace `typeNum` with `typeId` at `npc-generator.js` line 164.
- [ ] **BUG**: Stat assignment inverted — prime stats get best rolls, should be worst. Fix: reverse sort order so prime stat indices get highest rollIdx (worst rolls). Match the logic in `wizard.js autoAssignRolls`.
- [ ] **BUG**: `char.primeStats` never set in `generateNPC`. Add `char.primeStats = primeStatIndices;` after line 305.

### Gameplay
- [ ] Double-mode skills (two stat sets, two bonuses)
- [ ] Stat gain undo/redo (batch 8 menu items)
- [ ] Spell costs from `spell_cost_by_realm` (low priority — hardcoded values work)

### Polish
- [ ] Blank character sheet print option
- [ ] More responsive testing on various devices

## Key Files

| File | Purpose |
|------|---------|
| `pwa/js/engine/pdf-export.js` | A4 PDF generation: 2-col skills, DM boxes, bold/color/highlight parity with print (~290 lines) |
| `pwa/js/engine/npc-generator.js` | NPC creation with coherent race/class affinity scoring + smart weapon assignment |
| `pwa/js/engine/character.js` | Model v4, HP/DB/PP calc with bgBonuses, shield types, manual bonuses |
| `pwa/js/engine/background-effects.js` | 6 functions incl. summarizeBackgroundBonuses (spell adder corrected) |
| `pwa/js/engine/event-log.js` | 9 typed event helpers incl. logStatGain |
| `pwa/js/ui/wizard.js` | All tabs, stat gain modal, manual-roll option, NPC smart weapon order |
| `pwa/js/ui/print-sheet.js` | Multi-page A4 HTML character sheet; defaults P1=43/P2+=68 |
| `pwa/js/engine/db.js` | IndexedDB: 3 stores (characters, settings, event_log) |
| `pwa/js/engine/tools-api.js` | Agent-ready Tools API: 13 tools |
| `pwa/js/engine/combat.js` | Attack/critical/fumble resolution from Arms Law JSON tables |
| `pwa/js/engine/maneuvers.js` | Static maneuver + resistance roll resolution |
| `pwa/js/engine/build-compare.js` | Multi-character stats/skills comparison overlay |

## Next Session Entry Point

1. **Fix NPC generator bugs** (3 confirmed, see TODO above):
   - `npc-generator.js` line 164: `typeNum` → `typeId`
   - Reverse stat assignment so prime stats get worst rolls
   - Add `char.primeStats = primeStatIndices` after computing prime stats
2. **Test NPC generation** after fix: home → Générer PNJ → blank race+class → verify weapons have non-null costs, stats assigned correctly
3. **Blank sheet print option**: print config → checkbox "Feuille vierge" → omits actual values, leaves pencil blanks only

---
*Phase 1: 2025-01-19 | Phase 2: 2026-03-11 | Phase 3: 2026-03-11 | Phase 4a: 2026-03-12 | Phase 4b: 2026-03-20 | Phase 4c: 2026-03-20 | Phase 4d: 2026-03-21 | Phase 4e-4f: 2026-03-22 | Phase 4g: 2026-03-23 | Phase 4h-4i: 2026-03-24 | Phase 4j: 2026-03-25*
