---
description: Extract and categorize all strings from the binary via Ghidra MCP
allowed-tools: Read, Write, Grep, mcp__ghidra__list_strings
model: sonnet
---

## Context

- Existing extraction: `outputs/strings_found.txt` (1380 strings from Jan 2025)
- Known segments: `15c4` = game data, `18aa` = UI messages

## Instructions

### Step 1: Extract All Strings
- Call `list_strings` with limit=5000, offset=0
- If result count equals limit, paginate with increasing offset until exhausted

### Step 2: Categorize Each String

Assign each string to exactly one category based on content:

| Category | Pattern | Examples |
|----------|---------|---------|
| `FILE_REF` | Contains `.dat`, `.bmp`, `.mnd`, path separators | `carac.dat`, `blank.bmp` |
| `GAME_DATA_FR` | French game terms in segment 15c4 | `Constitution`, `Armes d'Hast` |
| `GAME_DATA_EN` | English game terms in segment 15c4 | `Self-Discipline`, `Pole Arms` |
| `UI_TEXT_FR` | French UI messages, menus, dialogs | `Voulez-vous sauvegarder...` |
| `UI_TEXT_EN` | English UI messages, menus, dialogs | `Do you want to save...` |
| `SYSTEM` | VB runtime, error codes, internal | DLL names, ordinals |
| `NUMERIC` | Numbers, table values, constants | Bonus tables, cost matrices |
| `UNKNOWN` | Cannot be classified | Partial strings, garbage |

### Step 3: Diff Against Previous
- Compare with `outputs/strings_found.txt`
- Identify NEW strings not in the previous extraction

### Step 4: Output
- Save `outputs/strings_categorized.json` with structure:
  ```json
  { "category": "GAME_DATA_FR", "address": "15c4:0838", "value": "Constitution" }
  ```
- Save `outputs/strings_new_findings.txt` with only newly discovered strings
- Print summary: count per category, notable discoveries
