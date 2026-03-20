# Checkpoint — CPR093 Reverse Engineering

*Updated: 2026-03-20*

## Summary

This session (Phase 4c) made critical fixes to the game engine discovered via INSTRUCTIONS batches 1-4. The stat rolling system was replaced with RM2's Stat Potentials Table (verified 8/8 against CPR093). The DP formula was corrected to `floor(Σ bodyDevTable[stat]) + 4`. Three major data structure bugs were found and fixed: the Em/In stat order swap (96 skills affected), the class-to-couts index mapping (64/68 classes wrong), and the cost array offset (+10 shift after Weapon Skill). A weapon categories assignment screen was added. Smart stat auto-assignment now prioritizes development stats and uses prime boost optimization. A stat audit log tracks rolling method, rerolls, and post-validation edits.

## Completed

- [x] **Phase 1 — Initial Analysis** (Jan 2025)
- [x] **Phase 2 — Full Ghidra MCP Scan** (2026-03-11)
- [x] **Phase 3 — Data File Parsing** (2026-03-11)
- [x] **Phase 4a — PWA Construction** (2026-03-12)
- [x] **Phase 4b — Game Engine Fixes** (2026-03-20)
- [x] **Phase 4c — RM2 Faithful Engine** (2026-03-20): stat potentials, DP formula, data fixes, weapon categories

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

## Still TODO from Batches 2-4

### Immediate (discovered in batch 3-4 review)
- [ ] **Rank Bonus table**: Currently RMSS (+5/rank 1-10 = +50 at rank 10). Must be RM2 (+5,+10,...+35 at rank 10)
- [ ] **PP formula for hybrids**: `((ppTable[stat1] + ppTable[stat2]) / 2) × level`

### Priority 10 — Race Selection Screen
- [ ] Tabbed UI (Humains, Elfes, Souterrains, Féériques, Géants, Autres)
- [ ] Bonus/malus per stat, hit die, max HP display
- [ ] Source: parse CUSTOM.MND or use RM2 Classic Table 04-01

### Priority 11 — Spell System Complete
- [ ] Separate spell point pool (= DP total)
- [ ] Popup: 4 realm tabs × 4 type sub-tabs (Base, Libres, Réservées, Autres)
- [ ] Tier mechanism: invest points → roll D100 ≤ tier → gain spell levels

### Priority 12 — Stat Gain (Level Up)
- [ ] Stat Gain Table 05-02 lookup
- [ ] D100 per stat, gain = f(roll, pot - temp), temp += gain (capped at pot)

### Priority 13 — Size/Appearance Table
- [ ] Height/weight by race in History panel

### Deferred
- [ ] Editable stat associations (clickable stat abbreviations)
- [ ] Double-mode skills (two stat sets, two bonuses)
- [ ] Character sheet view (print-ready)

## Key Files

| File | Purpose |
|------|---------|
| `pwa/js/engine/stat_potentials.js` | RM2 Stat Potentials Table (Table 15.1.1) |
| `pwa/js/engine/stats.js` | Rolling (RM2+RMSS), bonuses, rank bonus, DP |
| `pwa/js/engine/skills.js` | Costs (with class mapping + offset), 3-stat support, weapon costs |
| `pwa/js/engine/character.js` | Model v4, stat audit log, weapon priorities |
| `pwa/js/ui/wizard.js` | All tabs: stats, weapons, skills + smart auto-assign |
| `pwa/sw.js` | Cache v10 |

## Next Session Entry Point

1. Fix rank bonus table (RM2 instead of RMSS) — immediate
2. Fix PP formula for hybrids — immediate
3. Continue with Batch 3-4 priorities (races, spells, stat gain, level progression)

---
*Phase 1: 2025-01-19 | Phase 2: 2026-03-11 | Phase 3: 2026-03-11 | Phase 4a: 2026-03-12 | Phase 4b: 2026-03-20 | Phase 4c: 2026-03-20*
