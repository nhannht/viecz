# CLAUDE.md

## Project Overview
- **`android/`** — Kotlin (Jetpack Compose, Hilt, Min SDK 30, JVM 21)
- **`server/`** — Go (Gin, GORM, PostgreSQL, JWT, WebSocket, PayOS, Meilisearch)
- **`web/`** — Angular 21 (SSR, nhannht-metro-meow design system, Vitest, Bun)
- **`jellyfish/`** — Python submodule: Discord bot + webhook server (discord.py, FastAPI)

All rules are in `.claude/rules/` — auto-loaded by Claude Code. Path-scoped rules (server, web) only apply when touching matching files.
