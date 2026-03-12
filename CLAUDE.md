# CLAUDE.md — Rolemaster Character Generator (CPR093 Reconstruction)

> PWA reconstruction of CPR093.exe — Rolemaster character creator (VB3 1997 → modern web)

## Project Context

- **Origin**: Reverse engineering of `cpr093.exe` (NE 16-bit, VB3 P-Code, by Eric Lestrade 1997)
- **Current phase**: PWA construction from fully parsed game data
- **Data**: 648KB of structured JSON in `data/parsed/` (68 classes, 206 skills, 112 spell lists, cost matrices)
- **Repo**: https://github.com/Anti-StreSs/Rolemaster.git
- **Ghidra**: v12.0.4 with GhidrAssistMCP on port 8080 (for continued binary analysis if needed)

## Key Paths

```
PROJECT_ROOT = B:\IA_WORKS\2025-01-17_CPR_Rolemaster_Reverse
GHIDRA_MCP   = http://localhost:8080/sse
```

## Project Phases

| Phase | Status | Output |
|-------|--------|--------|
| 1. Initial analysis (Jan 2025) | ✅ Done | 1380 strings, Python prototype |
| 2. Ghidra MCP scan | ✅ Done | 99 segments, 26 forms mapped, VB3 header decoded |
| 3. Data file parsing | ✅ Done | 10 JSON files (648KB) in data/parsed/ |
| 4. PWA construction | 🔄 Active | pwa/ directory |
| 5. PDF rules extraction | Planned | For post-MVP enrichment |

## PWA Architecture (Phase 4)

```
pwa/
├── index.html              ← Single page entry
├── manifest.json           ← PWA installable
├── sw.js                   ← Offline support
├── css/styles.css          ← Styling + @media print
├── js/
│   ├── app.js              ← Router, global state
│   ├── engine/             ← Pure game logic (NO UI)
│   │   ├── data-loader.js  ← Loads data/parsed/*.json
│   │   ├── character.js    ← Character state
│   │   ├── stats.js        ← Stat rolls + bonuses
│   │   ├── classes.js      ← Professions
│   │   ├── skills.js       ← Skills + development
│   │   ├── spells.js       ← Spell lists
│   │   └── export.js       ← JSON save/load, print
│   ├── ui/                 ← Interface components
│   │   ├── wizard.js       ← Step-by-step creation
│   │   ├── sheet.js        ← Character sheet
│   │   └── components.js   ← Reusable UI parts
│   └── i18n/               ← FR/EN labels
├── data/                   ← Parsed JSON game data
└── assets/                 ← Icons, images
```

## Tech Stack

- **HTML/CSS/JS vanilla** — no framework, no build step, direct GitHub Pages deploy
- **Tailwind CSS via CDN** — utility-first styling
- **ES6 modules** — native browser imports
- **PWA** — manifest + Service Worker for offline + installable
- **Data**: Static JSON loaded via fetch()

## Game Data Available (data/parsed/)

| File | Content | Records |
|------|---------|---------|
| carac_tables.json | Stat roll tables, bonus tables, body dev, armor, spells | 13KB |
| classes.json | Professions (FR/EN, realm, params) | 68 classes |
| competences.json | Skills by category with stat associations | 206 skills |
| sorts.json | Spell lists by realm (FR/EN) | 112 lists |
| couts.json | Development cost matrix per class | 65 × ~490 |
| categories.json | Skill subcategories (FR/EN) | 60 cats |
| simil.json | Skill similarity matrix | NxN |
| options.json | Optional rules (FR/EN) | ~100 opts |

## Character Creation Flow (from CPR093 original)

1. CHOIXNOM → Name input
2. CHOIXCAR → Roll/assign 10 stats
3. CHOIXCLA → Choose profession (68 classes)
4. CHOIXROY → Choose realm of magic
5. CHOIXPRI → Choose prime stats
6. CHOIXCAT → Choose weapon categories
7. CHOIXARM → Choose armor
8. COMPETEN → Develop skills (spend dev points)
9. CHOIXSOR → Choose spells
10. FEUILLE → Final character sheet

## Conventions

- PWA code in `pwa/` — clean separation from analysis artifacts
- Engine (`js/engine/`) has ZERO UI dependencies — pure functions + data
- All game data loaded from JSON — never hardcoded
- Bilingual FR/EN throughout (data already bilingual)
- Git commits after each functional milestone
- `CHECKPOINT.md` updated after major progress

## Quick Reference

| Action | Command |
|--------|---------|
| Plan a task | `/plan [task]` |
| Save checkpoint | `/checkpoint` |
| Git commit | `/commit` |
| Ghidra scan (if needed) | `/ghidra-scan` |
