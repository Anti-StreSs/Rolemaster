# Checkpoint — CPR093 Reverse Engineering

*Updated: 2026-03-26 (Batch 34)*

## Summary

Session 2026-03-26 (Phase 4k — NPC overhaul + French terminology) completed the BATCH_31 NPC generator overhaul (3 P0 bug fixes + archetype enhancements committed as `7933768`) and a progression sparkline (Batch 29, `54c29b6`). This session added comprehensive French terminology corrections across 5 files: `Théisme` → `Théurgie` (Channeling realm); `OB/DB/RR` → `BO/BD/JR` throughout the toolbox, background bonuses summary, PDF export, and manual bonus fields; `Type armure (AT)` → `Type d'Armure (TA)`; attack result cards now show French abbreviations (`Jet`, `PdC`, `BO/BD/TA`); critical type names fully translated (Taille/T, Contusion/K, Perforation/P, etc.) with compact RM2 notation `{hits}{sévérité}{type}` — e.g. `11CK`.

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
- [x] **Phase 4k — NPC overhaul + French terminology** (2026-03-26): Batch 29 sparklines, Batch 31 NPC bugs fixed, French corrections

## Phase 4k Changes (2026-03-26)

### Batch 29 — Progression sparklines (wizard.js)
- `buildProjectionCurves(targetLevel)`: HP/PP/DB projection arrays using average die for future levels
- `buildSparklineSVG(curves)`: inline SVG polyline (W=480, H=120) with 3 color-coded lines
- Slider in Stats tab for target level (1-20), updates SVG live without full re-render
- `pwa/css/rolemaster-ui-additions.css` added for sparkline card styles

### Batch 31 — NPC generator bug fixes (npc-generator.js)
- **Bug 1 fixed**: `typeNum` → `typeId` in `getWeaponSkillCost` call — weapons now get non-null DP costs
- **Bug 2 fixed**: Stat assignment now tier-based (TierA=dev stats get best rolls, TierD=prime stats get worst rolls)
- **Bug 3 fixed**: `char.primeStats = primeStatIndices` now assigned on character object
- `ARCHETYPE_WEAPON_PICKS`: 10 archetypes × preferred French weapon names, fuzzy-match with fallback
- `ARCHETYPE_SKILL_PRIORITIES`: 10 archetypes × French skill keyword priority lists
- `WEAPON_TYPE_REVERSE` map for int→string type conversion
- Spell list auto-assignment for caster/caster_staff/semi_fighter archetypes (maxLevel by level bracket)

### French terminology corrections (2026-03-26)
- **classes.js**: `Théisme` → `Théurgie` (REALM_MAP entries 2, 3, 10)
- **background-effects.js**: `DB/OB/RR` → `BD/BO/JR` (lang-conditional) in `summarizeBackgroundBonuses`
- **pdf-export.js**: `Type Armure (AT)` → `Type d'Armure (TA)`
- **wizard.js**: `RR *` → `JR *` in manual bonus field labels (5 fields); `Théisme` → `Théurgie` in spell list type map and REALM_GROUPS
- **app.js**:
  - Tab label: `RR` → `JR` (FR)
  - Attack form labels: `OB`→`BO`, `DB`→`BD`, `Type armure`→`Type d'Armure (TA)` (FR)
  - RR realm dropdown: `Canalisation` → `Théurgie`
  - Button label: `Résoudre RR` → `Résoudre JR`
  - Weapon option text: `OB +N` → `BO +N` (FR)
  - Maneuver result: `Roll` → `Jet` (FR)
  - Attack meta: `OB/DB/AT` → `BO/BD/TA` (FR)
  - Attack result cells: `Roll`→`Jet`, `Hits`→`PdC` (FR)
  - Attack stateLabel: `N hits` → `N PdC` (FR); crit label: `{hits}{sévérité}{typeAbbrev}` compact notation
  - `CRIT_TYPE_FR` map: slash=T, krush=K, puncture=P, unbalancing=D, heat=Ch, cold=Fr, electricity=El, grapple=Sa, subdual=Ma, brawling=Ba, acid=Ac, large_creature=GC, etc.
  - RR/JR result: title `RR →JR` (FR), `Roll`→`Jet`

## Phase 4l Changes — Batch 33 (2026-03-26)

### Bug fixes
- **Armor penalty bug fixed** (`character.js`): `isMovingSkill(skill)` centralisé — matching par mots-clés uniquement, sans catégorie. Élimine les faux positifs sur Artisanat/Dev Corporel et les faux négatifs sur Culbutes/Adrénal. Partagé par `wizard.js`, `print-sheet.js`, `pdf-export.js`.
- **Migration vieilles sauvegardes** (`character.js` + `export.js`): `normalizeCharacter(data)` remplit les champs manquants (armorMagicBonus, primeStats, skillHighlights, skillBold, skillTextColors, manualBonuses.*, backgroundOptions.*) lors de l'import/chargement.

### Impression & PDF
- **Bonus similaires dans les totaux** (`print-sheet.js`, `pdf-export.js`): `calcSimilarityBonus` inclus dans le total de chaque compétence — les deux étaient manquants.
- **Colonne Simil optionnelle** (`print-sheet.js` + `wizard.js`): case à cocher "Bonus compétences similaires" dans la modale pré-impression ; colonne `Simil` insérée avant `Total`, `colSpan` dynamique.
- **Noms de catégories en FR** (`pdf-export.js`): `CAT_NAMES_FR` map — Academic→Académique, Athletic→Athlétique, Gymnastic→Gymnique, Deadly→Arts Mortels, etc.
- **Compteur de rangs DM** (`pdf-export.js`): nombre de rangs toujours affiché à droite des cases (pas seulement quand > 9).

### UI
- **Icônes footer visibles** (`theme.css`): suppression `opacity: 0.6` sur `.rm-footer-deco`.
- **Effet survol footer** (`theme.css` + `index.html`): chaque icône monte + lueur dorée au survol; tooltip "Bientôt…" apparaît en bulles médiévales. Prêt pour devenir des liens de navigation.

### Commits
- `193f276` — Batch 33 principal (armor, migration, PDF fixes)
- `fbd8b96` — Footer hover + tooltip
- `2f0583b` — Colonne Simil optionnelle à l'impression

## Phase 4m Changes — Batch 34 + Responsive (2026-03-26)

### Batch 34 — Similarity system overhaul (`644f960`)
- **`calcSimilarityRanks(gi, char)`** remplace `calcSimilarityBonus` dans `skills.js` — diviseur 16, formule `floor(src × coeff / 16)` (coeff 8 = demi-rangs, RM2 14.1.5)
- **`getOwnDevelopedRanks(gi, char)`** helper sans simil (évite la dépendance circulaire)
- **`skillRanksSimil: {}`** 5e store dans le modèle character; `getTotalRanks` l'inclut
- **`finalizeSimRanks(char)`** dans `wizard.js` : écrit les rangs auto dans `skillRanksSimil` au clic "Valider la phase"
- Pendant le dev : cases rouges `.rank-box.sim-rank` + colonne Sim `N*` en rouge (preview)
- Après validation : cases normales, Sim column affiche trace en orange
- `tools-api.js`, `pdf-export.js`, `print-sheet.js` nettoyés (ancien `calcSimilarityBonus` supprimé partout)

### Responsive fixes (`db92038`)
- **Tableau compétences** : `scroll-container` gagne `overflow-x:auto` → scrollable sur mobile
- **Colonnes Niv/Sim** masquées à ≤640px via `.col-lvl`/`.col-sim` pour tenir dans 375px
- **Modale impression** : contrainte à `min(100%,32rem)` + `p-3` overlay + `overflow-y:auto`
- **sticky-col** : tronquée à 7rem + `text-overflow:ellipsis` sur mobile

### Commits
- `644f960` — Batch 34 similarity overhaul
- `db92038` — Responsive fixes

## Still TODO

### Gameplay
- [ ] Double-mode skills (two stat sets, two bonuses)
- [ ] Stat gain undo/redo (batch 8 menu items)
- [ ] Spell costs from `spell_cost_by_realm` (low priority — hardcoded values work)

### Polish
- [ ] Blank character sheet print option
- [ ] More responsive testing on various devices
- [ ] Test NPC generation in browser: verify weapons have non-null costs, stats assigned correctly

## Key Files

| File | Purpose |
|------|---------|
| `pwa/js/engine/pdf-export.js` | A4 PDF generation: 2-col skills, DM boxes, bold/color/highlight parity with print |
| `pwa/js/engine/npc-generator.js` | NPC creation: coherent race/class, archetype weapons/skills, tier-based stat assignment |
| `pwa/js/engine/character.js` | Model v4, HP/DB/PP calc with bgBonuses, shield types, manual bonuses |
| `pwa/js/engine/background-effects.js` | 6 functions incl. summarizeBackgroundBonuses (BD/BO/JR corrected) |
| `pwa/js/engine/classes.js` | REALM_MAP: Théurgie (was Théisme) |
| `pwa/js/engine/event-log.js` | 9 typed event helpers incl. logStatGain |
| `pwa/js/ui/wizard.js` | All tabs, stat gain modal, sparkline projection, JR labels, Théurgie |
| `pwa/js/app.js` | Session toolbox: BO/BD/JR/TA/PdC, CRIT_TYPE_FR map |
| `pwa/js/ui/print-sheet.js` | Multi-page A4 HTML character sheet; defaults P1=43/P2+=68 |
| `pwa/js/engine/db.js` | IndexedDB: 3 stores (characters, settings, event_log) |
| `pwa/js/engine/tools-api.js` | Agent-ready Tools API: 13 tools |
| `pwa/js/engine/combat.js` | Attack/critical/fumble resolution from Arms Law JSON tables |
| `pwa/js/engine/maneuvers.js` | Static maneuver + resistance roll resolution |
| `pwa/css/rolemaster-ui-additions.css` | Sparkline cards, session toolbox additions |

## Next Session Entry Point

1. **Test NPC generation** in browser: home → Générer PNJ → blank race+class → verify:
   - Weapons have non-null costs and use archetype-preferred names (e.g. Fighter gets Épée)
   - Stats: dev stats (CO/AG/AD/ME/RE) have higher values than prime stats
   - `primeStats` array present on generated character
   - Casters have `spellLists` populated
2. **Blank sheet print option**: print config → checkbox "Feuille vierge" → omits actual values, leaves pencil blanks only
3. **Double-mode skills**: two stat sets, two bonus columns (rare — check if needed for RM2)

---
*Phase 1: 2025-01-19 | Phase 2: 2026-03-11 | Phase 3: 2026-03-11 | Phase 4a: 2026-03-12 | Phase 4b: 2026-03-20 | Phase 4c: 2026-03-20 | Phase 4d: 2026-03-21 | Phase 4e-4f: 2026-03-22 | Phase 4g: 2026-03-23 | Phase 4h-4i: 2026-03-24 | Phase 4j: 2026-03-25 | Phase 4k: 2026-03-26*
