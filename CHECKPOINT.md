# Checkpoint — CPR093 Reverse Engineering

*Updated: 2026-03-22*

## Summary

Session 2026-03-21/22 (Phase 4d-4e) implements Batches 6-16: sub-skill editing, 4 stat rolling methods, spell system (SGR mechanics), medieval-fantasy theme with UI assets, print system with WYSIWYG preview, shield/DB system, hit point mechanics with die rolls, phase progression, manual bonuses, background options, and major UX polish.

## Completed

- [x] **Phase 1 — Initial Analysis** (Jan 2025)
- [x] **Phase 2 — Full Ghidra MCP Scan** (2026-03-11)
- [x] **Phase 3 — Data File Parsing** (2026-03-11)
- [x] **Phase 4a — PWA Construction** (2026-03-12)
- [x] **Phase 4b — Game Engine Fixes** (2026-03-20)
- [x] **Phase 4c — RM2 Faithful Engine** (2026-03-20): stat potentials, DP formula, data fixes, weapon categories
- [x] **Phase 4d — Engine + UX Overhaul** (2026-03-21): sub-skills, rolling methods, spells, phases, theme
- [x] **Phase 4e — Full UI + Game Mechanics** (2026-03-22): UI assets, print system, shields/DB, hit points, spell SGR

## Phase 4d Changes (2026-03-21)

### Sub-Skill Editing
- Sub-skill name editable via ✎ button (modal with text input)
- Custom determining stats (up to 3) selectable per sub-skill, with stat bonus recalculated
- Sub-skills now display stat bonus column (was showing `—`), inheriting parent skill's stats by default
- Custom `sub.stats` array (0-based) stored on character, persists through save/load

### Stat Rolling — 4 Methods
- **RM2 (Roots)**: Original Table 15.1.1 (renamed from "RM2 (Table 15.1.1)")
- **RMSS (Heroes)**: Option 14, 2×10d100 (renamed from "RMSS (Option 14)")
- **Hybride (Real)**: RM2 table + pot roll +5 bonus. If no pot > 91 → first pair gets pot=100
- **Anti-Lose**: RM2 table + pot roll +10 bonus. Weakest pot always replaced by 100
- Forced pots marked with ★ in chips and audit log
- Audit log clearly shows method name and `potRoll+N=boosted` format for hybrid/antilose
- `stat_potentials.js`: `generateStatRollsHybrid()`, `generateStatRollsAntiLose()`, `getStatValuesHybrid()`

### Spell System Overhaul (Batch 7A)
- **Palier mechanism fixed**: palier = tier count (1-20), each = +5% chance. Max 20 = 100%
- Previously palier stored DP invested (was broken). Now: 1 click + = 1 palier, costs `cost` DP
- D100 roll: threshold = `palier × 5`, success → +5 spell levels, paliers reset. Available at any palier > 0
- **Spell audit log** (`character.spellLog[]`): every invest, refund, D100 roll (result, threshold, success), add, remove
- Log displayed in collapsible `<details>` section with roll success counter

### Design & UX (Batch 7C)
- Medieval-fantasy CSS theme: body gradient, panel left-border accent, gold text-shadow
- Buttons: engraved metal style with hover transform + glow
- +/- buttons: scale animation + colored glow on hover
- Tab bar: book-binding style with hidden scrollbar
- Progress bars: DP (gold→red when low) and spell points (purple), mana/life style
- Toast: fade-out animation added
- Home hero: radial gold glow
- Placeholder class `.bg-placeholder` for future background images
- Responsive breakpoints improved (640px + 768px)

### Print Improvements (Batch 7D)
- `@page A4 portrait; margin: 5mm`
- Extended hide list: phase buttons, +/- buttons, spell controls, stat logs, etc.
- DM squares CSS ready (`.dm-square` / `.dm-square.filled`)
- Skill highlighting classes with `print-color-adjust: exact`
- Sticky positioning disabled in print

### Phase Progression System (Batch 8)
- **Strict phase order**: Adolescent → Apprenti → Level 1 → Level 2 → ...
- Phase selector replaced with read-only indicator + state badge (En cours / VALIDÉ)
- **"Fin de la phase de développement"** button with confirmation dialog (irréversible)
- Validation snapshots stored in `character.phases[]` (dpTotal, dpSpent, skillRanks, timestamp)
- All +/- buttons disabled when phase validated (skills AND spells)
- **"Monter au prochain niveau"** only active when phase validated
- Level-up button in Infos tab also gated by `phaseValidated`
- Phase history popup showing all validated phases (DP used, rank count, date)
- Rank accumulation: `skillRanksLevel` → `skillRanksPrior` on level transition
- Stat gains only on Level N → Level N+1 transitions (not ado→app or app→lvl1)
- Backward compatibility: `spellLog`, `phases`, `phaseValidated` auto-initialized on load

## Phase 4c Changes (2026-03-20)

### Batch 1 — Stat Rolling & DP
- RM2 Stat Potentials Table (`stat_potentials.js`) — verified 8/8 against CPR093
- RMSS Option 14 available as alternative (method selector)
- DP formula: `floor(Σ bodyDevTable[stat]) + 4` — verified (Guerrier=35, Voleur=43)
- Smart auto-assign: lowest rolls → prime stats (boosted to 90), highest → dev stats
- Stat audit log: method, rolls, rerolls, validated snapshot, post-validation edits
- Stat order fixed: Co, Ag, AD, Mé, Ra, Fo, Rp, Pr, **Em, In** (was In, Em)
- Realm stat mapping fixed: Essence→Em(8), Channeling→In(9), Mentalism→Pr(7)

### Batch 2 — Skills & Weapons
- 3-stat skill bonus formula: `floor(avg)` with tertiary stat from `raw_params[3]` (7 skills fixed)
- Class-to-couts index mapping: `CLASS_TO_COUTS_MAP[68]` (was using wrong indices for 64/68 classes)
- Cost array offset: +10 after Weapon Skill (index 63 takes 12 values for 6 weapon categories)
- Weapon category priority costs extracted via `getWeaponCategoryCosts()`
- Weapon Categories tab (CHOIXCAT): 6 types × 6 priority slots, click-to-assign UI
- Cost display: single-rank skills show `X` instead of `X/*`

### Batch 3 — Confirmed/Already Correct
- Table indexing: `table[statValue]` direct indexing ✅
- DP budget same per phase ✅
- Stat 101 supported ✅
- Power points table verified ✅

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
- **Specializable skills** (25+): normal developable skills with ▸ button for free-text specialization (Artisanat, Forge, Instrument, Savoirs, etc.)
- **Similarity bonus auto-calculated** from `skill_similarity_pairs.json` (251 pairs): `floor(Σ(coeff×ranks)/4)`
- "Sim" column in skill table (auto-calculated, non-editable)
- Skill table now 10 columns: Skill(Stats) | Cost | DM | +/- | Rank | Stat | Lvl | Sim | Misc | Total

### Post-batch fixes
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

### Other Improvements
- Perception Générale added as parent skill (Vue/Ouïe/Odorat/Toucher/Goût)
- Inline + button on parent skills (next to name, more visible)
- "Same as previous level" button copies skill ranks from last validated phase
- Skill table header opaque background (#e0d4b8) for scroll readability
- Portrait upload (base64 < 500KB) or URL, displayed in editor + printed
- Home screen: local saves displayed inline with load/delete, JSON file upload
- Banner click → return to home
- Tab labels: larger (0.75rem), bold, brighter silver/gold with text shadows
- Accordion behavior: only one `<details>` open at a time
- `skillBold`, `skillTextColors` added to character model (persisted)

## Still TODO

### Immediate
- [x] **Rank Bonus table**: Verified — already correct RM2 table 07-01
- [x] **Level Bonus (table 09-07)**: Implemented in Batch 17
- [x] **Similarity Bonus**: Auto-calculated from skill_similarity_pairs.json (Batch 18)
- [ ] **Spell costs from `spell_cost_by_realm`**: Low priority — hardcoded values work correctly

### Gameplay
- [ ] Optional rules screen (89 rules from options.json)
- [ ] Double-mode skills (two stat sets, two bonuses)
- [ ] Stat gain undo/redo (batch 8 menu items)

### Polish
- [ ] Blank character sheet print option
- [ ] More responsive testing on various devices

## Key Files

| File | Purpose |
|------|---------|
| `pwa/js/engine/stat_potentials.js` | RM2 Stat Potentials Table + Hybrid/Anti-Lose methods |
| `pwa/js/engine/stats.js` | Rolling (4 methods), bonuses, rank bonus, DP |
| `pwa/js/engine/skills.js` | Costs, 3-stat support, weapon costs, parent skills, base spell list parser |
| `pwa/js/engine/spells.js` | SGR mechanics, rank cost, block size, realm mapping |
| `pwa/js/engine/character.js` | Model v7, HP/DB calc, shield types, manual bonuses, background options |
| `pwa/js/ui/wizard.js` | All tabs + phase validation + spell SGR + highlighting + portrait |
| `pwa/js/ui/print-sheet.js` | Multi-page A4 character sheet generator |
| `pwa/css/theme.css` | Medieval parchment theme with UI assets |
| `pwa/css/styles.css` | Component styles (parchment-compatible) |
| `pwa/css/print.css` | Print + WYSIWYG preview styles |
| `pwa/data/background_options_merged.json` | 333 background options (Char Law + Companions I/III) |
| `pwa/data/skill_similarity_pairs.json` | 251 skill similarity pairs with coefficients |

## Next Session Entry Point

1. Level bonus table (09-07) per class
2. Rank bonus table verification (RM2 vs RMSS)
3. Full spell cost decode from carac_tables.json
4. Continue with user feedback and testing

---
*Phase 1: 2025-01-19 | Phase 2: 2026-03-11 | Phase 3: 2026-03-11 | Phase 4a: 2026-03-12 | Phase 4b: 2026-03-20 | Phase 4c: 2026-03-20 | Phase 4d: 2026-03-21 | Phase 4e: 2026-03-22*
