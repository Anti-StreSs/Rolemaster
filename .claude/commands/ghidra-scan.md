---
description: Full exploration of CPR093.exe via GhidrAssistMCP — all 34 tools, systematic extraction
allowed-tools: Read, Write, Bash, Grep, Glob, mcp__ghidra__*
model: opus
---

## Context

- Project root: `B:\IA_WORKS\2025-01-17_CPR_Rolemaster_Reverse`
- Ghidra MCP: `http://localhost:8080` (GhidrAssistMCP native, no bridge)
- Existing strings: `outputs/strings_found.txt`
- Prior analysis: `outputs/ANALYSE_GHIDRA_RESUME.md`

## Instructions

Perform a complete exploration of CPR093.exe. Execute ALL steps, save results.

### Step 1: Connectivity & Program Info
- `get_program_info` → confirm CPR093.exe loaded, get architecture details
- Save to `outputs/program_info.json`

### Step 2: Memory Map
- `list_segments` → all memory segments
- Save to `outputs/segments_map.json`

### Step 3: Imports Analysis (HIGHEST VALUE)
- `list_imports` → ALL VBRUN300.DLL ordinals
- These reveal what VB3 functions the program uses
- Save to `outputs/imports_vbrun300.json`

### Step 4: Exports & Namespaces
- `list_exports` → entry points
- `list_namespaces` → namespace structure
- Save to `outputs/exports.json`, `outputs/namespaces.json`

### Step 5: Functions & Call Graph
- `list_functions` → all detected functions
- `get_call_graph` for entry and Ordinal_100
- Save to `outputs/functions.json`, `outputs/call_graph.json`

### Step 6: Code Analysis
- `get_code` with format=decompiler for entry
- `get_code` with format=disassembly for entry
- `get_code` with format=pcode for entry (P-Code representation!)
- Save to `outputs/code_analysis/`

### Step 7: Data & Strings
- `list_data` → all defined data items
- `list_strings` → all strings with addresses
- Compare against `outputs/strings_found.txt`
- Categorize: FILE_REF, UI_TEXT, GAME_DATA, SYSTEM_MSG
- Save to `outputs/data_items.json`, `outputs/strings_categorized.json`

### Step 8: Cross-References
- `xrefs` for key import functions (file I/O ordinals)
- `xrefs` for .dat file name strings
- Save to `outputs/xrefs_analysis.json`

### Step 9: Hex Dump at Key Addresses
- `get_hexdump` at addresses near .dat file references
- Look for data structure patterns
- Save to `outputs/hexdumps/`

### Step 10: Summary
- Create `outputs/ghidra_full_scan_YYYY-MM-DD.md` with all findings
- Update `CHECKPOINT.md`
- List new discoveries vs previous analysis
