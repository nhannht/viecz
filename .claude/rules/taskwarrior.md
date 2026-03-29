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
- `project:viecz` (or `viecz.web`, `viecz.server`, `viecz.android`, `viecz.jellyfish`)
- Tags: `+bug`, `+feature`, `+task`, `+chore`, `+research`
- Use `epic:` and `milestone:` UDAs for grouping

## History
- Old GitHub Issues, YouTrack (KNS-*), and git-bug references in commits are historical
- All new issue tracking uses Taskwarrior
