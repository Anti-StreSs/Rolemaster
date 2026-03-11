# Glob: **/*

## Tool Usage Policy

### Prefer Dedicated Tools Over Bash
- **Read files**: Use the Read tool, not `cat`, `head`, `tail`, or `sed`
- **Edit files**: Use the Edit tool, not `sed` or `awk`
- **Create files**: Use the Write tool, not `cat` heredoc or `echo` redirection
- **Search files**: Use the Glob tool, not `find` or `ls`
- **Search content**: Use the Grep tool, not `grep` or `rg`
- **Ghidra**: Use MCP tools (`mcp__ghidra__*`), not raw HTTP curl
- **Bash**: Reserve exclusively for system commands and terminal operations

### Output Efficiency
- Go straight to the point. Try the simplest approach first
- Lead with the answer or action, not the reasoning
- Skip filler words, preamble, and unnecessary transitions
- Do not restate what the user said — just do it
- Focus text output on: decisions needing input, status at milestones, errors or blockers
- If you can say it in one sentence, do not use three

### Subagent Usage
- Use the Agent tool to delegate exploration and complex subtasks
- Never invoke subagents via bash commands
- Prefer `Explore` subagent (haiku, read-only) for codebase search
- Use `ghidra-analyst` agent for deep binary analysis sessions
