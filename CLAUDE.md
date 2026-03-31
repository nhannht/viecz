# CLAUDE.md

## Project Overview
- **`android/`** — Kotlin (Jetpack Compose, Hilt, Min SDK 30, JVM 21)
- **`server/`** — Go (Gin, GORM, PostgreSQL, JWT, WebSocket, PayOS, Meilisearch)
- **`web/`** — Angular 21 (SSR, viecz design system, Vitest, Bun)
- **`jellyfish/`** — Python submodule: Discord bot + webhook server (discord.py, FastAPI)

All rules are in `.claude/rules/` — auto-loaded by Claude Code. Path-scoped rules (server, web) only apply when touching matching files.

## Private Data

- Team PII (names, student IDs, phones) → `team.local.yml` (gitignored via `*.local.yml`)
- Pattern: `*.local.yml` for structured private data, `.env` for secrets, `*.local.md` for private docs

## Git History Hygiene (Addendum)

- `git-filter-repo` removes the `origin` remote — re-add after running
- Old tags preserve unrewritten history — delete tags from remote before/after force-push
- `.gitleaks.toml` allowlists Firebase API keys in `environment.ts` files
