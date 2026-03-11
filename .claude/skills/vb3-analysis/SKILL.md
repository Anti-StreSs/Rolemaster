---
name: vb3-analysis
description: Visual Basic 3.0 P-Code binary analysis techniques and VBRUN300 ordinal mapping
argument-hint: [specific VB3 analysis question]
allowed-tools: Read, Write, WebFetch, WebSearch, mcp__ghidra__*
---

# VB3 P-Code Analysis Skill

CPR093.exe is a Visual Basic 3.0 application compiled to P-Code (pseudo-code interpreted by VBRUN300.DLL).

## Why Standard Decompilation Fails

VB3 P-Code is NOT native x86 machine code. The binary contains:
- A small native stub (entry point) that loads VBRUN300.DLL
- P-Code bytecodes that VBRUN300 interprets at runtime
- Resources (strings, dialogs, menus) embedded in NE format
- Data segments with static values

Ghidra can only decompile the native stub → 2 functions (entry + Ordinal_100).

## What CAN Be Extracted

### 1. VBRUN300 Import Ordinals (HIGHEST VALUE)
Each ordinal maps to a VB3 runtime function. Key ordinals include:

| Category | Ordinal Range | Functions |
|----------|--------------|-----------|
| File I/O | ~100-130 | Open, Close, Input, Print, Get, Put, EOF |
| String Ops | ~200-250 | Left$, Mid$, Right$, InStr, Len, Val, Str$ |
| Math | ~300-330 | Int, Rnd, Abs, Sgn, Fix |
| UI Controls | ~400-500 | MsgBox, Load, Unload, Show, Hide |
| Conversion | ~150-180 | CInt, CLng, CSng, CDbl, CStr |

**Action**: Web-search "VBRUN300.DLL export ordinal table" for the complete mapping.

### 2. String Resources
All user-visible text is embedded: menus, messages, labels, file names.
These reveal the complete UI structure and data file references.

### 3. NE Resource Table
The NE (New Executable) format contains a resource table with:
- Dialog definitions (form layouts)
- Menu structures
- Icon/bitmap references
- Version information

### 4. Data Segment Analysis
Static data in segments reveals:
- Lookup tables (bonus calculations)
- Default values (character templates)
- Constants (game rules parameters)

## Analysis Strategy for CPR093

1. **Map all VBRUN300 ordinals** → understand program capabilities
2. **Trace File I/O ordinals via xrefs** → understand .dat file loading
3. **Extract all strings with addresses** → map UI and data structure
4. **Read data segments** → find embedded tables and constants
5. **Correlate strings + data + imports** → reconstruct program logic

## Specialized Tools (if available)

- **VB Decompiler Pro/Lite**: Can decompile VB3 P-Code directly
- **P32Dasm**: VB3/VB4 P-Code disassembler
- **Resource Hacker**: Extract NE resources (dialogs, menus, bitmaps)
- **EXEHDR**: Microsoft NE header dump tool

Recommend exploring these if MCP analysis is insufficient.
