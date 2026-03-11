# Checkpoint — CPR093 Reverse Engineering

*Updated: 2026-03-11*

## Summary

This session completed two major phases: a full Ghidra MCP scan of CPR093.exe (VB3 P-Code Rolemaster character creator) extracting 551 strings, 99 segments, 26 forms, and the VB3 project header; followed by copying all original game data files and parsing every .dat file into structured JSON using a universal parser. The complete Rolemaster game data (68 classes, 206 skills, 112 spell lists, development cost matrices, optional rules) is now available as machine-readable JSON for reconstruction.

## Completed

- [x] **Phase 1 — Initial Analysis** (Jan 2025): Ghidra exports, 1380 strings, Python+Web prototypes
- [x] **Phase 2 — Full Ghidra MCP Scan** (2026-03-11): 99 segments mapped, 26 VB3 forms identified, VB3 project header decoded at 1120:0000, 551 strings categorized, bilingual data structures documented
- [x] **Phase 3 — Data File Parsing** (2026-03-11): 17+ data files copied to `./data/`, universal parser `reconstruction/dat_parser.py` created, 10 structured JSON files produced in `data/parsed/`

## In Progress

- [ ] Cost matrix mismatch — PATHCLAS.DAT lists 69 class files but COUTS.DAT contains only 65 classes (4 missing)
- [ ] Category_15 — 16th skill category in COMP.DAT exists but proper name not yet identified

## TODO

- [ ] **Decode VB3 project structure** — form sizes, control arrays in 1120:0000+ (high priority)
- [ ] **Analyze Code3 (1010)** — 23KB of VB control descriptors → form layouts, event tables
- [ ] **Explore resource segments** — Rsrc4 (482KB) for form binary data
- [ ] **Reconstruct core game logic** — use parsed JSON data + segment-to-form mapping to rebuild each form
- [ ] **Validate against exampleCHARACTERS.pdf** — test reconstruction accuracy

## Key Discoveries This Session

### Phase 2 (Ghidra MCP)
1. **VB3 Project Header** at 1120:0000 — version `03 20`, project "CPR093", 2 VBX, 26 forms (see `outputs/hexdumps/vb3_project_header_1120.txt`)
2. **26 Forms** mapped to code segments — complete application structure (see `outputs/ghidra_full_scan_2026-03-11.md`)
3. **CHOIXROY.FRM** — previously unknown realm selection form
4. **Bilingual control IDs** — FR uses `4B 49`, EN uses `35 49` (see `outputs/hexdumps/stats_*.txt`)
5. **String record structure** — VB3 control descriptor pattern with `81 04` type, `9A 38` segment ref

### Phase 3 (Data Parsing)
1. **68 Rolemaster classes** — complete FR/EN (Guerrier/Fighter → Moine/Monk) in `data/parsed/classes.json`
2. **206 skills** in 16 categories with stat associations in `data/parsed/competences.json`
3. **112 spell lists** across 10 realms in `data/parsed/sorts.json`
4. **Development cost matrix** — 65 classes × ~490 costs (422KB) in `data/parsed/couts.json`
5. **ISO-8859-1 encoding** — all .dat files use Latin-1 with CRLF line endings

## Files Modified/Created

### Phase 2 — Ghidra Outputs
- `outputs/program_info.json` — binary metadata
- `outputs/segments_map.json` — 99 segments with annotations
- `outputs/imports_vbrun300.json` — VBRUN300 import analysis
- `outputs/exports.json` — 2 exports
- `outputs/namespaces.json` — 1 namespace
- `outputs/functions.json` — 2 functions + call graph
- `outputs/strings_categorized.json` — 551 strings in 15 categories
- `outputs/xrefs_analysis.json` — cross-references + relocations
- `outputs/code_analysis/entry_decompiled.c` — decompiled entry
- `outputs/code_analysis/entry_disassembly.asm` — disassembled entry
- `outputs/hexdumps/stats_fr_1018_0838.txt` — French stats hex
- `outputs/hexdumps/stats_en_1018_0d10.txt` — English stats hex
- `outputs/hexdumps/vb3_project_header_1120.txt` — project header hex
- `outputs/ghidra_full_scan_2026-03-11.md` — complete scan summary

### Phase 3 — Data Parsing
- `data/` — 17+ original .dat files copied from CPR093
- `reconstruction/dat_parser.py` — universal parser (~450 lines)
- `data/parsed/carac_tables.json` (13KB)
- `data/parsed/classes.json` (23KB)
- `data/parsed/competences.json` (102KB)
- `data/parsed/sorts.json` (14KB)
- `data/parsed/categories.json` (8.5KB)
- `data/parsed/couts.json` (422KB)
- `data/parsed/simil.json` (24KB)
- `data/parsed/options.json` (22KB)
- `data/parsed/monde_defaut.json` (33KB)
- `data/parsed/config.json` (550B)

### Updated
- `CHECKPOINT.md` — this file

## Architecture Summary

- **Pure VB3 P-Code** — only 3 native x86 instructions (CALLF ThunRTMain + dead code)
- **26 forms** handle all UI (MDI application pattern)
- **Bilingual FR/EN** with parallel data structures in code segments
- **External .dat files** loaded at runtime for all game rules data
- **.psg files** for character persistence, **.mnd files** for world config
- **VBX controls**: THREED.VBX (3D buttons), CMDIALOG.VBX (file/print dialogs)

## Next Session Entry Point

All game data is now parsed into JSON. The next logical step is to **reconstruct the core game engine** using `data/parsed/*.json` as the data layer. Start by reviewing `reconstruction/cpr_core.py` (Phase 1 prototype), then extend it to use the actual parsed data. Alternatively, continue binary analysis by decoding the VB3 control descriptors in Code3 (segment 1010) to extract form layouts and event handlers, which would inform the UI reconstruction.

---
*Phase 1: 2025-01-19 | Phase 2: 2026-03-11 | Phase 3: 2026-03-11*
