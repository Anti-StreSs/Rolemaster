---
name: debug
description: Systematic debugging for MCP connection issues, script errors, or reconstruction bugs
argument-hint: [issue-description]
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# Debug Skill

Help debug the issue: `$ARGUMENTS`

## Phase 1: Understand
1. Read any error messages, stack traces, or logs
2. Identify the failing component (Ghidra MCP, Python script, bridge, etc.)
3. Search for related code or config

## Phase 2: Diagnose

### Ghidra MCP Issues
- Check if Ghidra is running: `curl http://127.0.0.1:8080/`
- Check if plugin is loaded: look for GhidraMCP in Ghidra console
- Verify port: default 8080 for GhidraMCP
- Check bridge script: `python bridge_mcp_ghidra.py --help`

### Python Script Issues
- Check Python version: `python --version` (need 3.10+)
- Check dependencies: `pip list | grep -i [package]`
- Run with verbose: add `import traceback; traceback.print_exc()`

### Data Issues
- Verify file paths exist
- Check encoding (UTF-8 vs Windows-1252 for French characters)
- Validate JSON outputs: `python -m json.tool file.json`

## Phase 3: Fix
1. Implement the minimal fix
2. Verify the fix resolves the original issue
3. Document what was wrong and how it was fixed

## Phase 4: Report
- **Root cause**: What was wrong
- **Fix**: What was changed
- **Prevention**: How to avoid recurrence
