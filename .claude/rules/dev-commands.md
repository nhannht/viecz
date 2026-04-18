---
description: Build, test, lint commands
---

# Dev Commands

**Android (Capacitor)**: Lives in `mobile/android/`. Gradle wrapper is at `mobile/android/gradlew`. Build: `cd mobile/android && ./gradlew assembleDebug`. Always `adb reverse tcp:9999 tcp:9999`.

**Capacitor**: `cd mobile && bunx cap sync android` (after building web). `bunx cap add android` to regenerate native project.

**Go**: `go test ./...` | `go run cmd/server/main.go`. Test DB: `docker compose -f docker-compose.testdb.yml up -d` (PG 5433, Meili 7700).

**Web**: `bunx ng test` (NOT `bunx vitest run`) | `bun run build`

**Linting**: `cd server && golangci-lint run ./...` | `cd web && bunx eslint 'src/**/*.ts'`

# Bun Workspaces

Root `package.json` defines workspaces: `["web", "mobile"]`. Run `bun install` at the project root to install deps for all workspaces. Per-workspace scripts: `bun run --filter mobile cap:sync` or `cd mobile && bunx cap sync android`.

# Restrictions

**NEVER run `bun start`, `ng serve`, `bun run build`, or `ng build` from Claude.** Check dev server output via the local dev environment rules.

**Mail**: Use `/mail-local-management` skill. JMAP via `curl --netrc-file ~/.netrc -k https://127.0.0.1:8443/jmap/`, account ID `"c"`.
