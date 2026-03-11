# Ghidra Full Scan — CPR093.exe — 2026-03-11

## Binary Overview

| Property | Value |
|----------|-------|
| Format | New Executable (NE) — 16-bit Windows |
| Language | x86:LE:16:Protected Mode |
| Runtime | VBRUN300.DLL (Visual Basic 3.0 P-Code) |
| Project Name | CPR093 |
| Title | Rolemaster |
| Author | Eric Lestrade |
| Functions | 2 (entry + ThunRTMain thunk) |
| Segments | 99 (34 code + 1 data + 64 resource + 1 external) |
| Strings | 551 total (380 meaningful + 171 font/UI) |
| Relocations | 385 |
| VBX Controls | THREED.VBX, CMDIALOG.VBX |
| Forms | 26 VB3 forms |

## Key Discovery: VB3 Architecture

This binary is a **pure P-Code** VB3 application. There are only 3 instructions of native x86:

```asm
1000:0010: CALLF 0x1310:0000   ; ThunRTMain
1000:0015: ADD word ptr [BX+SI], AX  ; dead code
1000:0017: ADC byte ptr [BX+SI], DL  ; dead code
```

**All application logic** is VB3 P-Code bytecode interpreted by VBRUN300.DLL at runtime. Ghidra cannot decompile P-Code, so the intelligence comes from:
1. **Strings** — bilingual FR/EN game terms, UI labels, file references
2. **Data structures** — VB3 control records with embedded string offsets
3. **Segment layout** — each segment maps to a form or functional module
4. **VB3 project header** — complete form list and structure at 1120:0000
5. **Data file references** — reveals runtime data loading patterns

## Segment Map (Code Segments → Forms)

| Segment | Size | Form | Function |
|---------|------|------|----------|
| Code1 (1000) | 25B | - | Entry point |
| Data2 (1008) | 2B | - | Single data word |
| Code3 (1010) | 23KB | - | VB project structures, control descriptors |
| Code4 (1018) | 11KB | CHOIXCAR/CARACTER | Stats FR/EN, realms, weapons, shields |
| Code5 (1020) | 236B | - | Small stub |
| Code6 (1028) | 20KB | MENUMDI/FEUILLE | UI strings, menus, character sheet labels |
| Code7 (1030) | 28KB | COMPETEN | Skills, .dat refs, skill categories |
| Code8 (1038) | 3.4KB | CHOIXCLA | Class selection |
| Code9 (1040) | 4.3KB | CHOIXCAR | Stats drawing |
| Code10 (1048) | 2KB | CHOIXROY | Realm selection |
| Code11 (1050) | 1KB | CHOIXPRI | Prime stats |
| Code12 (1058) | 3.8KB | CARACTER | Stats display |
| Code13 (1060) | 2.9KB | GENERAL | Level, hits, power |
| Code14 (1068) | 3.4KB | SOUSCOMP | Skill categories/subskills |
| Code15 (1070) | 2.3KB | CHOIXCAT | Weapon categories |
| Code16 (1078) | 10KB | SAUVEGAR | Save/Load (.psg) |
| Code17 (1080) | 546B | FOND | Background |
| Code18 (1088) | 474B | APROPOSD | About dialog |
| Code19 (1090) | 180B | CHOIXNOM | Name input |
| Code20 (1098) | 7.6KB | CHOIXSOR | Spell selection |
| Code21 (10a0) | 3.9KB | SORTS | Spell list display |
| Code22 (10a8) | 1.7KB | - | Base spell list |
| Code23 (10b0) | 2.2KB | PARAM | Parameters |
| Code24 (10b8) | 1.7KB | PARAMPRI | Print options |
| Code25 (10c0) | 1.6KB | AIDE | Stats help |
| Code26 (10c8) | 4KB | CHOIXARM | Armor selection |
| Code27 (10d0) | 1.6KB | IDENDITE | Identity |
| Code28 (10d8) | 2KB | - | Background data |
| Code29 (10e0) | 2.5KB | OPTIONS | Optional rules |
| Code30 (10e8) | 2.7KB | MONDE | World editor |
| Code31 (10f0) | 3KB | MONDSPE | Specialities |
| Code32 (10f8) | 33KB | FEUILLE | Character sheet (LARGEST) |
| Code33 (1100) | 5.2KB | - | Race management |
| Code34 (1108) | 852B | - | Power points |

## Data Files Referenced

| File | Purpose | Segment | Bilingual |
|------|---------|---------|-----------|
| carac.dat | Character stats, armor tables | Code4/9/12/26 | Shared |
| classes.dat / claseng.dat | Class definitions | Code8 | FR / EN |
| comp.dat / compengl.dat | Skills/competences | Code7 | FR / EN |
| categ.dat / categeng.dat | Skill categories | Code14/31 | FR / EN |
| sorts.dat | Spell lists | Code20 | Shared |
| couts.dat | Development costs | Code7/20 | Shared |
| pathclas.dat | Class paths | Code7/8 | Shared |
| simil.dat | Similar skills | Code7 | Shared |
| options.dat / optionse.dat | Optional rules | Code29 | FR / EN |
| defaut.opt | Default options | Code29 | Shared |
| defaut.mnd / defauten.mnd | Default world | Code17 | FR / EN |
| *.mnd | World files | Code23/30 | User |
| *.psg | Character save files | Code16 | User |
| blank.bmp / fondvert.bmp | Background images | Code4/17 | Shared |

## Game Data Extracted

### 10 Rolemaster Stats (FR/EN)
Constitution, Agilite/Agility, Auto-discipline/Self-Discipline, Memoire/Memory, Raisonnement/Reasoning, Force/Strength, Rapidite/Quickness, Presence, Empathie/Empathy, Intuition

### Realms of Magic
FR: Mentalisme, Essence, (Canalisation implied)
EN: Mentalism, Essence, Channeling + hybrids: Mentalism/Essence, Mentalism/Channeling, Essence/Channeling, Ess/Ment/Channeling

### Weapon Categories (6)
FR: une main, deux mains, Armes d'Hast, Arcs et Arbalettes, Armes de jet
EN: One Handed Edged, One Handed Concussion, Two Handed, Pole Arms, Missile/Bows, Thrown

### Armor Types (5)
Skin and clothes, Soft Leather, Rigid Leather, Chain, Plate

### Shield Types
FR: Targe, Rondache, Pavois, Main Gauche
EN: Target, Normal, Left Hand

### Skill Categories (14)
Academic, Animal, Athletic, Combat, Deadly, Evaluation, General, Gymnastic, Linguistic, Magical, Medical, Social, Survival + class-specific

### Race Categories (6)
Human, Elves, Other, Underground Races, Fairy Races, Giant Races

### Class Skill Groups (7)
FIGHT, TRAVEL/NATURE, MARTIAL ARTS, INHABITANTS, OBJECT/KNOWLEDGE, MENTALISM, CHANNELING

## VB3 Project Structure (1120:0000)

Binary format decoded:
- `03 20` = VB3 version
- `81 80` = flags
- Project name: "CPR093", Title: "Rolemaster"
- 2 VBX controls (marker `43`): THREED.VBX, CMDIALOG.VBX
- 26 forms (marker `46`): each with index, segment ID, size, filename

## String Record Structure

Discovered repeating pattern in data segments:
```
[string bytes \0\0] [xx 37 81 04 01 00 10 00] [ctrl_id 2B] [9A 38] [len_w] [off_w] [strlen_w] [next string...]
```
- `81 04` appears to be a VB3 control type identifier
- `4B 49` (FR) vs `35 49` (EN) = different form/control IDs
- `9A 38` = common segment reference
- This pattern is consistent across all data segments

## New Discoveries vs Prior Analysis

| Finding | Status |
|---------|--------|
| 551 strings (vs prior 1380) | Ghidra min_length=4 filter; prior may have counted sub-strings |
| 26 VB3 forms identified | NEW — complete form list with segment mapping |
| VB3 project header decoded | NEW — at 1120:0000, format partially reverse-engineered |
| String record structure | NEW — VB3 control descriptor pattern identified |
| CHOIXROY.FRM discovered | NEW — realm selection form not in prior analysis |
| 385 relocations analyzed | NEW — mostly in Code3 (VB structures) |
| Segment-to-form mapping | NEW — 34 code segments mapped to functional areas |
| Data file complete inventory | UPDATED — 16 unique .dat files identified with contexts |
| No x-refs for strings | CONFIRMED — expected for P-Code, validated |

## Files Generated

- `outputs/program_info.json`
- `outputs/segments_map.json`
- `outputs/imports_vbrun300.json`
- `outputs/exports.json`
- `outputs/namespaces.json`
- `outputs/functions.json`
- `outputs/strings_categorized.json`
- `outputs/xrefs_analysis.json`
- `outputs/code_analysis/entry_decompiled.c`
- `outputs/code_analysis/entry_disassembly.asm`
- `outputs/hexdumps/stats_fr_1018_0838.txt`
- `outputs/hexdumps/stats_en_1018_0d10.txt`
- `outputs/hexdumps/vb3_project_header_1120.txt`

## Next Steps

1. **Parse .dat files** — Extract actual game data from carac.dat, classes.dat, comp.dat, sorts.dat, couts.dat
2. **Decode VB3 project structure** — Further reverse-engineer the 1120:0000 header format
3. **Map Code3 (1010)** — The 23KB of VB control descriptors contain form layouts, event tables
4. **Explore resource segments** — Rsrc4 (482KB) likely contains form binary data
5. **Reconstruct form logic** — Use segment-to-form mapping + strings to rebuild each form's behavior
