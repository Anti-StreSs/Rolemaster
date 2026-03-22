# Checkpoint — CPR093 Reverse Engineering

*Updated: 2026-03-22*

## Summary

Session 2026-03-22 (Phase 4f — Batch 19) integrates the background option mechanical effects into the PWA. `background-effects.js` (357 lines, 6 exported functions) was already in place; this batch wires it into the game engine (`character.js`: PP/HP/DB bonus application) and the UI (`wizard.js`: skill stat+misc bonuses, effects display under each option, resolve-choice dialogs, background bonus summary panel in Infos, wealth auto-inject into Equipment). Service worker updated to v27 with `background-effects.js` in the asset cache list.

## Completed

- [x] **Phase 1 — Initial Analysis** (Jan 2025)
- [x] **Phase 2 — Full Ghidra MCP Scan** (2026-03-11)
- [x] **Phase 3 — Data File Parsing** (2026-03-11)
- [x] **Phase 4a — PWA Construction** (2026-03-12)
- [x] **Phase 4b — Game Engine Fixes** (2026-03-20)
- [x] **Phase 4c — RM2 Faithful Engine** (2026-03-20): stat potentials, DP formula, data fixes, weapon categories
- [x] **Phase 4d — Engine + UX Overhaul** (2026-03-21): sub-skills, rolling methods, spells, phases, theme
- [x] **Phase 4e — Full UI + Game Mechanics** (2026-03-22): UI assets, print system, shields/DB, hit points, spell SGR, background options system
- [x] **Phase 4f — Background Effects Integration** (2026-03-22): Batch 19 — all 7 tasks A-G

## Phase 4f Changes (2026-03-22 — Batch 19)

### Task A — character.js engine integration
- `calcPowerPoints`: bgBonuses.ppBonus + ppPerLevel×level + spellAdder applied before return; ppMultiplier applied via Math.ceil
- `calculateDB`: bgBonuses.dbBonus added to itemBonus (let instead of const)
- `calcHitPoints`: bgBonuses.maxHpMultiplier applied to cap before hpBonus (let instead of const)
- Import: `getBackgroundBonuses` from `./background-effects.js`

### Task B — Skill bonuses (wizard.js)
- `bgBonuses` and `bgStatMods` computed once before the skill table loop
- Per normal skill: `bgStatBonus` = averaged `statBonusMods[i-1]` over skill's stat indices
- Per normal skill: `bgSkillBonus` = `getSkillBackgroundBonus(bgBonuses, skill.name, skill.name_en)` added to Misc column

### Task C — Effects display under each option (wizard.js)
- Filled options now show an effect line: green ✓ with a formatted summary of effects (stat, skill, spell, PP, gold, RR, special_ability)
- If `requires_choice` and unresolved: amber ⚠ + "Choisir" button (`.bg-opt-resolve`)

### Task D — Resolve-choice dialogs (wizard.js)
- Handlers for `.bg-opt-resolve` buttons: dispatches by `opt.choice_type`
- skill → prompt for skill name → `resolveBackgroundChoice`
- stat → prompt from STAT_ABBREVS → `resolveBackgroundChoice`
- language → prompt for language name → `resolveBackgroundChoice`
- stat_increase → mode 2 (+2 one stat) or 3 (+1 three stats) → `resolveStatIncrease`

### Task E — Background bonus summary panel (wizard.js)
- Collapsible `<details>` panel "Bonus d'historique" in Infos tab, after manual bonuses panel
- Uses `summarizeBackgroundBonuses(bgBonuses, lang)` for content
- Shows amber warning if unresolvedChoices.length > 0

### Task F — Wealth auto-inject into Equipment (wizard.js)
- After storing any background option (both Set Options and D100 paths)
- `generateWealthText(getBackgroundBonuses(character))` → replaces old "Richesse d'historique" block in `character.equipment`

### Task G — Service worker (sw.js)
- Cache version: `v26` → `v27`
- `background-effects.js` added to ASSETS list (was missing → would 404 offline)

## Phase 4e Changes (2026-03-22)

### Batch 9 — Bugfixes
- Fixed `phaseName is not defined` crash on Skills tab
- Spell list costs now determined by class/realm (getSpellListCost)
- Theme warmed: blue-black → ebony/mahogany palette, then parchment with UI assets

### Batch 10 — Spell System Rewrite (SGR)
- **SGR mechanics** (Character Law 7.4): D100 + ranks×5 ≥ 101 = success
- Rank cost by caster type: Pure=1, Semi=4, Non=20 DP/rank
- Block sizes: 10 levels (base own + pure caster), 5 levels otherwise
- One list studied at a time, one SGR per phase, table roll option for extras
- Base spell lists extracted from couts.json (43 classes) via `$` marker parser
- Realm sub-tabs: Base | Mentalisme | Essence | Théisme | Arcanes (FR labels)
- DP pool unified (skills + spells share same budget)

### Batch 11 — Medieval UI Assets Integration
- `theme.css` created: Google Fonts (Cinzel + Crimson Text), stone wall background, parchment texture
- `index.html` restructured: rm-header (banner + flags), rm-nav (icon tabs), rm-frame (9-slice), rm-parchment, rm-footer (decorations)
- Tab icons (WebP): shield, dice, face, sword, scroll, book, globe, quill
- Torches with animated glow (desktop), footer decorations
- Full color override for parchment context (.rm-parchment overrides all Tailwind grays)
- Print: all chrome hidden, parchment → white
- Service worker cache v25

### Batch 12 — Print System
- `print-sheet.js` module: multi-page A4 character sheet generation
- Page 1: identity/languages/portrait grid + stats + combat + skills with DM boxes (■□)
- Skill filtering: developed, positive, both, all, highlighted only
- Print config popup: font, skill filter, spell filter, stats/costs toggles, skills per page
- WYSIWYG preview overlay (210mm pages with shadows)
- `print.css`: complete A4 print styles, page breaks, `body.printing` class to hide app content

### Batch 13 — Print Layout + Shields + Highlighting
- Print layout: stats table 55% width, top grid 35/25/40%, portrait zone, mid-grid (stats|combat|spells)
- Combat block: table 2×4 with pencil spaces, no allure/mvt
- Magic effects: 3 blank lines under spell lists
- **Shield system**: 5 types (None/Buckler/Normal/Full/Wall) with melee+missile DB
- **DB calculation**: RP bonus − armor penalty (offset by strength) + shield/adrenal + items
- DB item bonus field (manual entry for magical items)
- **Skill highlighting on full rows**: left-click cycles 5 colors, right-click context menu for bold + text color
- Sub-skills and weapon skills also support highlighting/bold/text color

### Batch 14 — Hit Points + BD Correction
- **HP formula corrected**: PdC Base = ceil(CO/10) + Σ(racial die rolls per Body Dev rank)
- Cap PdC = ceil(Base × (1 + totalCOBonus/100)), capped at racial max
- Die rolls stored in `character.bodyDevRolls[]` (persisted)
- Each Body Dev rank prompts for die roll (auto-roll with manual override option)
- "Same as previous" also prompts for each Body Dev die roll
- **DB formula corrected**: strength offsets armor quickness penalty
- **Stat Dev display fixed**: all 5 dev stats (Co,Ag,AD,Mé,Ra) show body dev value
- `_bodyDevSkillIndex` and `_ppStatIndices` now properly initialized on load

### Batch 15 — Manual Bonuses
- `manualBonuses` object in character: DB items, OB items, PP bonus, HP bonus, 5 RR types, notes
- Collapsible panel in Infos tab with 9 numeric fields + notes
- All manual bonuses integrated into calculations (DB, HP, PP)
- Printed on character sheet when non-zero (RR line, OB, notes)

### Batch 16 — Background Options System
- `background_options_merged.json` loaded (333 entries from Character Law + Companions I/III)
- History tab restructured: Options d'Historique → Talents Innés → Description → Equipment → Notes
- Race determines option count (Semi-Elfes=4, Humains=6, etc.)
- Category selector + D100 roll resolution against entry tables
- Set Options: direct choice via prompt
- Companion III innate talents: auto-detected from stats ≥ 102, tier-based picks (A/B/C)
- All options persisted in `character.backgroundOptions`

### Batch 17 — Level Bonus (Table 09-07)
- 19 profession profiles + default with 8 bonus categories (combat, spells, outdoor, subterfuge, item, perception, bodyDev)
- Class → profile mapping: exact name, keyword fuzzy match, fallback by caster type
- "Niv" column in skill table (editor + print), capped at level 20
- Level bonus integrated into total: rank + stat + lvl + sim + misc

### Batch 18 — Stats Display, Specializations, Similarity
- **Stat labels** on each skill: "(AG/FO)" shown next to skill name
- **Specializable skills** (25+): normal developable skills with ▸ button for free-text specialization
- **Similarity bonus auto-calculated** from `skill_similarity_pairs.json` (251 pairs): `floor(Σ(coeff×ranks)/4)`
- "Sim" column in skill table (auto-calculated, non-editable)
- Skill table now 10 columns: Skill(Stats) | Cost | DM | +/- | Rank | Stat | Lvl | Sim | Misc | Total

### Post-batch fixes (2026-03-22)
- Adrenal defense: only adds to DB if ranks > 0 AND bonus > 0 (no penalty)
- Body Dev die roll: prompt with auto-roll + manual override for table rolls
- "Same as previous" also prompts for Body Dev die rolls (per rank)
- background_options_merged.json copied to pwa/data/ (was only in parsed/)
- Sub-skills now print under their parent skill (was at end of list)
- Sub-skill highlight/bold/textColor preserved in print output
- Print page padding: 6mm top, 14mm bottom for footer clearance
- Print page breaks: `break-after: page` + fixed height preview (297mm with overflow:hidden)
- Skills per page defaults reduced to 40/70 (was 60/85)
- Power points: Math.ceil applied (was returning raw float)

## Phase 4d Changes (2026-03-21)

### Sub-Skill Editing
- Sub-skill name editable via ✎ button (modal with text input)
- Custom determining stats (up to 3) selectable per sub-skill, with stat bonus recalculated
- Sub-skills now display stat bonus column (was showing `—`), inheriting parent skill's stats by default
- Custom `sub.stats` array (0-based) stored on character, persists through save/load

### Stat Rolling — 4 Methods
- **RM2 (Roots)**: Original Table 15.1.1
- **RMSS (Heroes)**: Option 14, 2×10d100
- **Hybride (Real)**: RM2 table + pot roll +5 bonus. If no pot > 91 → first pair gets pot=100
- **Anti-Lose**: RM2 table + pot roll +10 bonus. Weakest pot always replaced by 100
- Forced pots marked with ★ in chips and audit log

### Spell System Overhaul (Batch 7A)
- Palier mechanism fixed: 1 click = 1 palier, D100 roll: threshold = palier×5
- Spell audit log (`character.spellLog[]`): every invest, refund, D100 roll
- Phase progression system: strict order, snapshot on validation

## Still TODO

### Gameplay
- [ ] Optional rules screen (89 rules from options.json)
- [ ] Double-mode skills (two stat sets, two bonuses)
- [ ] Stat gain undo/redo (batch 8 menu items)
- [ ] Spell costs from `spell_cost_by_realm` (low priority — hardcoded values work)

### Polish
- [ ] Blank character sheet print option
- [ ] More responsive testing on various devices

## Key Files

| File | Purpose |
|------|---------|
| `pwa/js/engine/background-effects.js` | 6 functions: getBackgroundBonuses, getSkillBackgroundBonus, resolveBackgroundChoice, resolveStatIncrease, summarizeBackgroundBonuses, generateWealthText |
| `pwa/data/background_options_v3_patched.json` | 335 background options normalized (242KB) |
| `pwa/js/engine/character.js` | Model v4, HP/DB/PP calc with bgBonuses, shield types, manual bonuses |
| `pwa/js/ui/wizard.js` | All tabs, background effects display, resolve dialogs, bg summary panel |
| `pwa/js/engine/stat_potentials.js` | RM2 Stat Potentials Table + Hybrid/Anti-Lose methods |
| `pwa/js/engine/skills.js` | Costs, 3-stat support, weapon costs, parent skills, base spell list parser |
| `pwa/js/engine/spells.js` | SGR mechanics, rank cost, block size, realm mapping |
| `pwa/js/ui/print-sheet.js` | Multi-page A4 character sheet generator |
| `pwa/css/theme.css` | Medieval parchment theme with UI assets |
| `pwa/css/print.css` | Print + WYSIWYG preview styles |

## Next Session Entry Point

1. Test background options end-to-end: roll options → verify PP/DB/HP modified → check Infos panel shows bonus summary
2. Test wealth inject: roll a "Richesse" option → verify Equipment field updated
3. Test resolve-choice dialog: find an option with `requires_choice: true` → click Choisir → verify resolved flag shown
4. Continue with user feedback and additional gameplay polish

---
*Phase 1: 2025-01-19 | Phase 2: 2026-03-11 | Phase 3: 2026-03-11 | Phase 4a: 2026-03-12 | Phase 4b: 2026-03-20 | Phase 4c: 2026-03-20 | Phase 4d: 2026-03-21 | Phase 4e-4f: 2026-03-22*
