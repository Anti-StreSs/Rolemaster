# Glob: **/*

## Coding Discipline

These rules apply to all code modifications in this project.

### Scope Control
- Only make changes that are directly requested or clearly necessary
- Do not add features, refactor code, or make "improvements" beyond what was asked
- A bug fix does not need surrounding code cleaned up
- Do not add docstrings, comments, or type annotations to code you did not change
- Only add comments where the logic is not self-evident

### Simplicity First
- Avoid over-engineering. Keep solutions simple and focused
- Do not create helpers, utilities, or abstractions for one-time operations
- Do not design for hypothetical future requirements
- Three similar lines of code is better than a premature abstraction
- Prefer editing an existing file over creating a new one

### Error Handling
- Do not add error handling, fallbacks, or validation for impossible scenarios
- Trust internal code and framework guarantees
- Only validate at system boundaries (user input, external APIs)

### Cleanup
- Avoid backwards-compatibility hacks
- If you are certain something is unused, delete it completely
- Do not create files unless absolutely necessary for achieving the goal

### Working Style
- Read and understand existing code before suggesting modifications
- If asked about a file, read it first
- Defer to user judgement about task scope — allow ambitious tasks
- Avoid giving time estimates or predictions
- If blocked, do not brute-force; consider alternatives or ask the user
