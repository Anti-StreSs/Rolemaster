# Checkpoint — CPR093 Reverse Engineering

*Updated: 2026-03-24*

## Summary

Session 2026-03-24 (Phase 4h — Batches 23-24-26-27) adds PDF export, NPC generator, build comparator, and optional rules engine. `pdf-export.js` generates A4 multi-page PDF via jsPDF. `npc-generator.js` creates full NPCs (stats, skills, spells) in one call with `isNPC` flag for home screen tagging. `build-compare.js` loads multiple characters from IndexedDB and renders a side-by-side stats/skills comparison overlay with gold highlighting of maxima. `optional-rules.js` exposes the 89 options from `options.json` with activation state and effect summary. `tools-api.js` and `wizard.js`/`app.js` wired with new tools (`generate_npc`, `compare_builds`) and new UI popups. Service worker updated to v29.

Session 2026-03-23 (Phase 4g — Batches 20-22 + Specializable Skills) implements three infrastructure upgrades. **Batch 20**: IndexedDB replaces localStorage (`db.js` created, `export.js` rewrapped, `app.js`/`wizard.js` made async, migration on startup). **Batch 21**: Agent-ready Tools API (`tools-api.js`, 11 registered tools, `window.__rmTools` console access). **Batch 22**: Unified event journal (`event-log.js`, 8 typed log helpers, Journal panel in History tab). Additionally, `SPECIALIZABLE_INDICES` in `skills.js` expanded from 25 to 90 entries (65 new skills identified by Python analysis of `subskill_data` in `competences.json`). Service worker updated to v28.

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
- [x] **Phase 4g — Infrastructure & Tooling** (2026-03-23): Batches 20-22 + specializable skills expansion
- [x] **Phase 4h — Studio augmenté** (2026-03-24): Batches 23-24-26-27 — PDF export, NPC generator, build compare, optional rules

## Phase 4h Changes (2026-03-24)

### Batch 23 — PDF Export (pdf-export.js, wizard.js, index.html)
- `pdf-export.js` created (394 lines): multi-page A4 PDF via jsPDF CDN
- Pages: identity/stats, skills, spells — mirrors print-sheet.js layout
- "Export PDF" button added to Impression tab in wizard.js
- jsPDF loaded via CDN in index.html

### Batch 24 — NPC Generator (npc-generator.js, tools-api.js, app.js)
- `npc-generator.js` created (230 lines): `generateNPC({name, raceIndex, classIndex, level, save})`
- Auto-rolls stats, assigns skills proportional to level DP, picks spell lists for casters
- Sets `isNPC: true` on character — home screen shows "PNJ" badge on saves
- `generate_npc` tool added to tools-api.js
- "Générer un PNJ" button on home screen opens popup (name/race/class/level)

### Batch 26 — Build Comparator (build-compare.js, tools-api.js, app.js)
- `build-compare.js` created (197 lines): loads chars from IndexedDB, builds summary objects
- Summary: name, race, class, level, hp, pp, db, stats[10], topSkills[5], totalDevelopedSkills
- `compareBuilds(names[])` returns `{characters: [...], error}`
- `compare_builds` tool added to tools-api.js
- Home screen: checkboxes on each save, "Comparer la sélection" button appears when ≥2 checked
- Overlay table with gold highlighting of max numeric values per row

### Batch 27 — Optional Rules (optional-rules.js)
- `optional-rules.js` created (96 lines): loads options.json (89 rules), activation state in character
- `getOptionalRules()`, `isRuleActive(char, ruleKey)`, `toggleRule(char, ruleKey)`, `getActiveRulesSummary(char)`

## Phase 4g Changes (2026-03-23)

### Specializable Skills Expansion (skills.js)
- `SPECIALIZABLE_INDICES` expanded from 25 to 90 entries
- 65 new skills identified via Python analysis of `subskill_data` in `competences.json`
- Organized by game category with comments
- All skills with non-trivial subskill_data now show ▸ specialization button in UI

### Batch 20 — IndexedDB Persistence (db.js, export.js, app.js, wizard.js)
- `db.js` created: 3 object stores (`characters`, `settings`, `event_log`), DB_VERSION=1
- `export.js` rewritten: wraps db.js functions under legacy names for caller compatibility
- `app.js`: `render()` and `renderHome()` made async; save/load/delete handlers await properly
- `wizard.js`: `btnSaveLocal` handler awaits `saveToLocalStorage`
- Migration: `migrateFromLocalStorage()` on startup reads old `rolemaster_saves` key, writes missing chars to IndexedDB

### Batch 21 — Tools API (tools-api.js)
- 11 registered tools: `list_characters`, `get_character`, `get_character_summary`, `get_stat_bonus`, `get_all_stat_bonuses`, `get_skill_total`, `get_all_skills`, `get_spell_lists`, `get_combat_stats`, `lookup_rule`, `get_rank_bonus`
- `window.__rmTools = { getToolDefinitions, executeTool }` exposed for console/LLM access
- `get_skill_total`: full breakdown (ranks, rankBonus, statBonus with bg mods, lvlBonus, simBonus, bgBonus, miscBonus, total)
- `get_all_skills`: filter by `'developed'` / `'positive'` / `'all'`

### Batch 22 — Event Log (event-log.js, wizard.js)
- `event-log.js` created: typed helpers `logStatRoll`, `logStatValidate`, `logSkillDevelop`, `logSpellSGR`, `logPhaseValidate`, `logLevelUp`, `logBgOption`, `logHpRoll`, `logNote`, `getCharacterHistory`
- All log calls are fire-and-forget (not awaited) to keep UI responsive
- Journal panel added to History tab (last 50 events, reversed chronological)
- Service worker updated to v28, 3 new files added to ASSETS

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

1. Test combat engine in browser console:
   ```javascript
   await window.__rmTools.executeTool('list_weapons', {})
   await window.__rmTools.executeTool('resolve_attack', { weaponTable: 'atk-rmss5520-broadsword', ob: 75, db: 20, armorType: 5 })
   await window.__rmTools.executeTool('resolve_maneuver', { difficulty: 'hard', bonus: 45 })
   await window.__rmTools.executeTool('resolve_rr', { defenderLevel: 5, attackerLevel: 8, statBonus: 10 })
   ```
2. Test NPC generator: "Générer un PNJ" → vérifier badge PNJ sur home
3. Test Build Compare: cocher 2 personnages → "Comparer la sélection"
4. Test PDF Export: onglet Impression → bouton "Export PDF"
5. Continuer avec Batch 29 (combat tracker UI) ou polish gameplay

## Key Files (updated)

| File | Purpose |
|------|---------|
| `pwa/js/engine/db.js` | IndexedDB module: 3 stores (characters, settings, event_log), migration |
| `pwa/js/engine/export.js` | Re-exports db.js under legacy names; async getLocalSaves |
| `pwa/js/engine/tools-api.js` | Agent-ready Tools API: 13 tools including generate_npc + compare_builds |
| `pwa/js/engine/event-log.js` | Typed event journal: 8 helpers + getCharacterHistory |
| `pwa/js/engine/skills.js` | SPECIALIZABLE_INDICES: 90 entries (was 25) |
| `pwa/js/engine/pdf-export.js` | A4 PDF generation via jsPDF (394 lines) |
| `pwa/js/engine/npc-generator.js` | Quick NPC creation: stats + skills + spells auto-generated (230 lines) |
| `pwa/js/engine/build-compare.js` | Multi-character comparison: stats, top skills, DB/HP/PP (197 lines) |
| `pwa/js/engine/optional-rules.js` | Optional rules loader + activation state management (96 lines) |

---
## Phase 4i Changes (2026-03-24)

### Batch 28 — Manœuvres & Jets de Résistance (maneuvers.js)
- `maneuvers.js` créé (130 lignes) : D100 open-ended, table manœuvre statique 9 degrés, RR
- `rollOpenEndedD100()` : explosion ≥96, fumble ≤5 (double open-ended RM2)
- `resolveStaticManeuver({difficulty, bonus, roll})` : 4 résultats (spectacular_failure/failure/partial/success)
- `resolveResistanceRoll({defenderLevel, attackerLevel, statBonus, realm, ...})` : seuil 50, marge calculée
- `getRRStatIndex(realm)` : EM/IN/PR/CO/AD selon realm
- `DIFFICULTIES` + `DIFFICULTY_LABELS` (FR/EN) exportés
- Tools : `resolve_maneuver`, `resolve_rr`, `list_difficulties`, `roll_open_ended`
- sw.js : v32 → v33

### Batch 25 — Combat Arms Law (combat.js + attack/critical/fumble_tables.json)
- `data-loader.js` : +3 entrées FILES_MAP (attack_tables, critical_tables, fumble_tables)
- `combat.js` créé (220 lignes) — adapté aux formats JSON réels (tableaux, non objets) :
  - Indexes lazy par `id` (construits au premier appel)
  - `parseRowBand()` : gère `"150+"`, `"UM-41"`, `"56-57"`, `"149"` → {min, max}
  - `parseFumbleRange()` : `"01 - 03 UM"` → max=3
  - `resolveAttack()` : row_band lookup par total (roll+OB-DB), fumble sur roll brut
  - `resolveCritical()` : lookup par type suffix d'id (`B_slash` → `crit-rmss5520-slash`), `parsed_effects.bonus_hits`
  - `resolveFumble()` : table `fumble-al2003-weapon-fumble-table`, mapping 26 `weapon_family` → 6 colonnes
  - `resolveFullAttack()` : attaque + critique + fumble en un appel
- Tools : `list_weapons` (36 tables), `resolve_attack`, `resolve_critical`, `list_critical_types`
- sw.js : v33 → v34, +combat.js +3 JSON

---
*Phase 1: 2025-01-19 | Phase 2: 2026-03-11 | Phase 3: 2026-03-11 | Phase 4a: 2026-03-12 | Phase 4b: 2026-03-20 | Phase 4c: 2026-03-20 | Phase 4d: 2026-03-21 | Phase 4e-4f: 2026-03-22 | Phase 4g: 2026-03-23 | Phase 4h-4i: 2026-03-24*
