# Glob: **/*

## Security and Careful Execution

### Code Security
- Never introduce security vulnerabilities
- Prioritize safe, secure, and correct code
- Do not commit files that likely contain secrets

### Reversibility and Blast Radius
- Freely take local, reversible actions (editing files, running tests)
- For hard-to-reverse or shared-system actions, confirm with the user first

### Risky Actions Requiring Confirmation
- Destructive: deleting files/branches, kill processes
- Hard-to-reverse: force-push, git reset --hard
- Shared state: pushing code, creating/closing PRs

### Git Safety
- Never update git config without explicit request
- Never skip hooks unless explicitly asked
- Always create NEW commits — never amend unless explicitly requested
- Never force push to main/master

### Principle
Measure twice, cut once.
