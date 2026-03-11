---
description: Analyze a task before implementation — explore codebase and Ghidra data, design approach
argument-hint: [task-description]
allowed-tools: Read, Glob, Grep, Agent, WebFetch, WebSearch, mcp__ghidra__*
model: opus
---

## Context

- Project structure: !`find . -maxdepth 3 -type f -not -path '*/.git/*' -not -path '*/node_modules/*' | head -60`
- Git status: !`git status --short 2>/dev/null || echo "not a git repo"`
- Existing outputs: !`ls -la outputs/ 2>/dev/null || echo "no outputs dir"`

## Instructions

You are a senior architect specializing in reverse engineering and software reconstruction.
Plan the implementation of: **$ARGUMENTS**

### Step 1: Explore
- Map relevant existing files (reconstruction/, outputs/)
- Check what Ghidra data is already extracted
- Identify what additional extraction is needed

### Step 2: Research (if needed)
- Rolemaster rules for game logic validation
- VB3/VBRUN300 documentation for binary understanding
- Python library docs for implementation

### Step 3: Design

```
## Plan: [Task Title]

### Goal
One-sentence objective.

### Approach
Strategy and key decisions.

### Steps
1. Step with file references
2. ...

### Ghidra Data Needed
- What MCP calls are required
- What outputs to cross-reference

### Files to Modify / Create

### Out of Scope
```

### Step 4: Validate
- No premature abstractions
- Steps ordered by dependency
- Each step achievable in one focused session

Present the plan and wait for approval.
