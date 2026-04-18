---
description: Task management workflow — must be followed before any code change
---

# Taskwarrior First (MANDATORY)

**BEFORE any code change**: `task project:viecz list` to search → `task add` if missing → `task <id> start` → work → `task <id> done`. No exceptions.

## Commands
- **List**: `task project:viecz list`
- **Create**: `task add "title" project:viecz priority:H/M/L +feature/+bug/+task`
- **Start**: `task <id> start`
- **Done**: `task <id> done`
- **Modify**: `task <id> modify <changes>`

## Structure
- `project:viecz` (or `viecz.web`, `viecz.server`, `viecz.mobile`, `viecz.jellyfish`)
- Tags: `+bug`, `+feature`, `+task`, `+chore`, `+research`
- Use `epic:` and `milestone:` UDAs for grouping

## Post-Commit Hook

A lock file (`/tmp/claude-taskwarrior-pending`) is created after every successful `git commit`. All subsequent tool calls are **blocked** until Taskwarrior is updated and the lock is removed:

1. Hook creates `/tmp/claude-taskwarrior-pending` with the commit subject
2. Every `PreToolUse` checks for the lock — blocks with exit 2 if present
3. Update TW: `task <id> done` or `task <id> modify`
4. Remove lock: `rm /tmp/claude-taskwarrior-pending`

## History
- Old GitHub Issues, YouTrack (KNS-*), and git-bug references in commits are historical
- All new issue tracking uses Taskwarrior
