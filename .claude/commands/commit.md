---
description: Create a single git commit from current changes
allowed-tools: Bash(git *)
---

## Context

- Git status: !`git status`
- Diff: !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`

## Instructions

1. Analyze all changes and draft a commit message:
   - Summarize: extraction, analysis, reconstruction, config, docs
   - Concise, focus on "why" not "what"

2. Stage and commit:
```
git add -A && git commit -m "$(cat <<'EOF'
Commit message here.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

## Safety
- NEVER amend, force-push, or skip hooks
- Do not commit files containing secrets
