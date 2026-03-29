---
name: dev-workflow
description: "Viecz development workflow — build commands, testing, deployment, environment setup, dev mode shortcuts"
---

# Viecz Dev Workflow

## Build Commands

```bash
# Go API
cd server && CGO_ENABLED=0 go build -ldflags="-s -w" -o bin/server-linux ./cmd/server

# Web SSR (Angular)
cd web && bun run build

# Jellyfish (Discord bot)
uv run python -m jellyfish.main
```

## Testing

```bash
# Go tests
cd server && go test ./...

# Angular tests (MUST use ng test, NOT vitest directly)
cd web && bunx ng test

# Go linting
cd server && golangci-lint run ./...

# Web linting
cd web && bunx eslint 'src/**/*.ts'
```

**Important**: Never run `bunx vitest run` directly — Angular configures test globals via `ng test`.

## Dev Server

**NEVER run `bun start`, `ng serve`, `bun run build`, or `ng build` from Claude.**

Check running dev server output:
```bash
tmux capture-pane -p -t <session>
```

Dev server runs on port 9999. Kill with:
```bash
lsof -i :9999 | grep LISTEN
kill <PID>
```

## Environment

Source env vars (fish-compatible):
```bash
set -a && source .env.dev && set +a
```

**Dev mode shortcuts** (when `SMTP_HOST` is empty):
- OTP codes returned in API response
- Firebase phone auth mocked
- Turnstile bot check skipped

Key env vars:
| Variable | Dev Value | Effect |
|----------|-----------|--------|
| `SMTP_HOST` | empty | Dev mode ON |
| `TURNSTILE_SECRET_KEY` | empty | Bot check skipped |
| `PORT` | 9999 | Dev server port |
| `GO_ENV` | production | Skips .env auto-loading |

## Test Database

```bash
docker compose -f docker-compose.testdb.yml up -d
# PostgreSQL on port 5433
# Meilisearch on port 7700
```

## Deployment

| Service | Port | Systemd Unit |
|---------|------|-------------|
| Go API | 8080 | `viecz-server` |
| Web SSR | 4001 | `viecz-web` |
| Jellyfish | 8000 | `jellyfish` |

Caddy reverse proxy: `viecz.fishcmus.io.vn` → `/api/` to :8080, else to :4001.

## Task Management

Uses Taskwarrior (not GitHub Issues):
```bash
task project:viecz list
task add "title" project:viecz priority:H +feature
task <id> start
task <id> done
```

## Angular SSR Cache Issue

Dev server can serve stale SSR HTML after edits:
```bash
rm -rf web/.angular/cache
# Then restart dev server
```

## Code Documentation

```bash
bash scripts/godoc-query.sh     # Go docs
python3 scripts/compodoc-query.py  # Angular docs
```
