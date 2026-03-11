# Glob: **/*

## Reverse Engineering Rules

### Ghidra MCP Interaction
- Always verify the Ghidra HTTP server is responsive before starting analysis
- Use pagination (offset/limit) for large result sets — never assume all data fits in one call
- Save raw MCP outputs to `outputs/` before processing — preserve original data
- When listing imports, always record both ordinal numbers AND resolved names

### Binary Analysis Methodology
- Document every finding with address references (segment:offset format)
- Cross-reference strings with data items and xrefs to build context
- Map VBRUN300 ordinals to known VB3 function names systematically
- Do not assume P-Code is fully unrecoverable — explore all MCP capabilities first
- Treat segment `15c4` as primary game data, `18aa` as UI data

### Data Extraction
- Categorize every extracted string: FILE_REF, UI_TEXT, GAME_DATA, SYSTEM_MSG, UNKNOWN
- When finding .dat file references, also search nearby memory for format clues
- Compare new extractions against existing `outputs/strings_found.txt` for deltas
- Export structured data as JSON for consumption by reconstruction scripts

### Reconstruction Standards
- All reconstruction code goes in `reconstruction/`
- Match the original bilingual FR/EN behavior (French primary, English secondary)
- Use Rolemaster official rules as validation reference
- Python 3.10+ with type hints, dataclasses preferred
- Test against `exampleCHARACTERS.pdf` for validation

### Checkpointing
- After any significant extraction or analysis, update `CHECKPOINT.md`
- Before ending a session, always run `/checkpoint`
- Log all MCP interactions to `outputs/ghidra_mcp_log_YYYY-MM-DD.md`
