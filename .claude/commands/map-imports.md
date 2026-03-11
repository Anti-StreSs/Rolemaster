---
description: Map VBRUN300.DLL ordinal imports to known VB3 functions and analyze usage
allowed-tools: Read, Write, Bash, WebFetch, WebSearch, mcp__ghidra__list_imports, mcp__ghidra__get_xrefs_to, mcp__ghidra__get_function_xrefs
model: opus
---

## Context

- CPR093.exe depends on VBRUN300.DLL (Visual Basic 3.0 runtime)
- Each import is an ordinal number mapping to a known VB3 runtime function
- These ordinals reveal WHAT the program does: file I/O, string ops, UI, math

## Instructions

### Step 1: Extract All Imports
- Call `list_imports` with limit=500
- Record every ordinal and its Ghidra-assigned name

### Step 2: Research VBRUN300 Ordinal Table
- Search web for "VBRUN300.DLL ordinal table" or "VB3 runtime exports"
- Build a mapping: ordinal number → VB3 function name → category

### Step 3: Categorize by Function Type

| Category | VB3 Functions | Relevance |
|----------|--------------|-----------|
| `FILE_IO` | Open, Close, Input, Print, Get, Put, EOF, FreeFile | .dat file reading |
| `STRING` | Left$, Right$, Mid$, InStr, Len, Val, Str$, Chr$ | Data parsing |
| `UI` | MsgBox, InputBox, Load, Unload, Show, Hide | Interface flow |
| `MATH` | Int, Fix, Rnd, Abs, Sgn | Dice rolls, calculations |
| `MEMORY` | Dim, ReDim, Erase | Data structures |
| `CONVERSION` | CInt, CLng, CSng, CDbl, CStr | Type handling |
| `CONTROL` | DoEvents, End, Stop | Program flow |

### Step 4: Xref Analysis for File I/O
- For each FILE_IO import, get all xrefs
- This reveals WHERE .dat files are loaded and HOW they are parsed
- Document the call chain for each .dat file reference

### Step 5: Output
- Save `outputs/vbrun300_import_map.json` with full ordinal→function→category mapping
- Save `outputs/file_io_analysis.md` with the .dat loading reconstruction
- Save `outputs/program_capability_map.md` summarizing what CPR093 can do based on imports
