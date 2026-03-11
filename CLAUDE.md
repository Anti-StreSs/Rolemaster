# CLAUDE.md — CPR093 Rolemaster Reverse Engineering Project

> Reverse engineering + reconstruction de CPR093.exe (générateur de personnages Rolemaster, VB3 1997)

## Project Context

- **Target binary**: `cpr093.exe` — NE 16-bit, Visual Basic 3.0 P-Code, by Eric Lestrade (1997)
- **Goal**: Extract maximum intelligence from the binary via Ghidra MCP, then reconstruct a modern equivalent
- **Ghidra**: v12.0.4 at `B:\Ghidra\ghidra_12.0.4_PUBLIC_20260303` with GhidrAssistMCP (native MCP, port 8080)
- **Prior work**: 1380 strings extracted, Python+Web prototypes exist in `reconstruction/`

## Key Paths

```
PROJECT_ROOT = B:\IA_WORKS\2025-01-17_CPR_Rolemaster_Reverse
MCP_ROOT     = B:\MCP
GHIDRA_HOME  = B:\Ghidra\ghidra_12.0.4_PUBLIC_20260303
GHIDRA_MCP   = http://localhost:8080  (native SSE/HTTP — no bridge needed)
```

## MCP Architecture

GhidrAssistMCP is a NATIVE MCP server embedded in Ghidra — NO external Python bridge required.
- Transport: SSE at `http://localhost:8080/sse` or Streamable HTTP
- 34 built-in tools (list_functions, get_code, xrefs, struct, etc.)
- 5 MCP resources (program/info, program/functions, program/strings, program/imports, program/exports)
- 5 built-in analysis prompts
- Multi-program support, focus tracking, async tasks, caching

## Architecture

```
.
├── CLAUDE.md                  # This file
├── .mcp.json                  # MCP servers for Claude Code
├── .claude/
│   ├── settings.json          # Permissions and env
│   ├── rules/
│   │   ├── coding-discipline.md
│   │   ├── tool-usage.md
│   │   ├── security-and-care.md
│   │   └── reverse-engineering.md
│   ├── commands/
│   │   ├── ghidra-scan.md     # /ghidra-scan
│   │   ├── extract-strings.md # /extract-strings
│   │   ├── map-imports.md     # /map-imports
│   │   ├── checkpoint.md      # /checkpoint
│   │   ├── commit.md          # /commit
│   │   └── plan.md            # /plan
│   ├── skills/
│   │   ├── ghidra-explore/SKILL.md
│   │   ├── vb3-analysis/SKILL.md
│   │   └── debug/SKILL.md
│   └── agents/
│       ├── ghidra-analyst.md
│       └── researcher.md
├── cpr093.exe
├── outputs/
├── reconstruction/
└── ghidra_project/
```

## What Claude Code Should Handle (vs Claude Desktop)

### Claude Code — PRIMARY for:
- **Ghidra MCP interaction**: All tools via native MCP (no bridge)
- **Script writing**: Python extraction scripts, data parsers, reconstruction modules
- **File management**: Creating, editing, organizing outputs and code
- **Git operations**: Commits, checkpoints, version control
- **Data processing**: Parsing strings, building data structures
- **Testing**: Running Python tests, validating reconstruction accuracy

### Claude Desktop — SUPPORT for:
- **Strategic planning**: High-level architecture decisions, multi-session planning
- **Document creation**: PPTX/DOCX reports
- **Visual review**: Examining PDFs (exampleCHARACTERS.pdf, Etat Final.pdf)
- **Web research**: Rolemaster rules, VB3 internals

## Technical Notes

- P-Code VB3 is interpreted by VBRUN300.DLL — ordinal imports are the key
- Segment `15c4` = game data strings, `18aa` = UI messages
- The .dat files (carac.dat, classes.dat, comp.dat, sorts.dat, couts.dat) were runtime-loaded
- Only 2 functions found by decompiler — expected for P-Code
- Real intelligence is in imports, strings, data items, memory layout
- GhidrAssistMCP `get_code` tool supports decompiler, disassembly AND pcode output

## Conventions

- All extraction outputs go to `outputs/`
- Reconstruction code goes to `reconstruction/`
- Checkpoints update `CHECKPOINT.md`
- Code is Python 3.10+
- Comments in French for domain terms, English for code logic

## Quick Reference

| Action | Command |
|--------|---------|
| Full Ghidra scan | `/ghidra-scan` |
| Extract & categorize strings | `/extract-strings` |
| Map VBRUN300 imports | `/map-imports` |
| Save checkpoint | `/checkpoint` |
| Plan next phase | `/plan [task]` |
| Git commit | `/commit` |
