---
description: Pre-commit hook and review requirements
---

# Pre-commit Hook

`/code-review` skill runs before `git commit` — enforced in `.claude/settings.json`. Must pass with no CRITICAL or WARNING findings before the commit hook allows it through.

## MANDATORY: Always Run /simplify

`/simplify` (step 4c) is NOT optional in `/code-review`. Always launch all 3 review agents (Code Reuse, Code Quality, Efficiency) regardless of how "simple" the changes look. No exceptions, no hand-waving.
