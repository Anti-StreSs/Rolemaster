---
description: Save progress — update CHECKPOINT.md, log session, summarize TODO
allowed-tools: Read, Write, Glob, Grep, Bash(git *)
---

## Context

- Checkpoint file: `CHECKPOINT.md`
- Outputs dir: `outputs/`
- Log dir: `B:\MCP\_CLAUDE_MCP_USE\logs\`

## Instructions

### Step 1: Gather Current State
- Read the current `CHECKPOINT.md`
- List all files in `outputs/` with modification dates
- Check git status for uncommitted changes

### Step 2: Update CHECKPOINT.md

Rewrite `CHECKPOINT.md` with:

```markdown
# Checkpoint — CPR093 Reverse Engineering
*Updated: [current date]*

## Summary
[One paragraph: what was accomplished in this session]

## Completed
- [x] Task with date

## In Progress
- [ ] Task — status notes

## TODO
- [ ] Next task — priority and notes

## Key Discoveries This Session
[List any new findings with references to output files]

## Files Modified/Created
[List of files changed this session]

## Next Session Entry Point
[Specific instruction for resuming work]
```

### Step 3: Log
- Append session summary to `B:\MCP\_CLAUDE_MCP_USE\logs\cpr093_sessions.log`

### Step 4: Git (if initialized)
- Stage and commit with message summarizing the session
