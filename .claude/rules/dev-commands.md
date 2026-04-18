---
description: Build, test, lint commands
---

# Dev Commands

**Mobile (Ionic/Capacitor)**: `cd mobile && bunx cap sync android` to sync web build. `bunx cap open android` to open in Android Studio.

**Go**: `go test ./...` | `go run cmd/server/main.go`. Test DB: `docker compose -f docker-compose.testdb.yml up -d` (PG 5433, Meili 7700).

**Web**: `bunx ng test` (NOT `bunx vitest run`) | `bun run build`

**Linting**: `cd server && golangci-lint run ./...` | `cd web && bunx eslint 'src/**/*.ts'`

# Restrictions

**NEVER run `bun start`, `ng serve`, `bun run build`, or `ng build` from Claude.** Check dev server output via the local dev environment rules.

**Mail**: Use `/mail-local-management` skill. JMAP via `curl --netrc-file ~/.netrc -k https://127.0.0.1:8443/jmap/`, account ID `"c"`.
