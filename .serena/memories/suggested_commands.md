# Suggested Commands

## Dev Servers
- **Angular dev server**: `cd web && npm start` (port 4200). Must be started manually in a persistent terminal (tmux/screen). Claude Code cannot keep long-running dev servers alive.
- **Go server**: `cd server && go run cmd/server/main.go`
- **Test server**: `docker compose -f docker-compose.testdb.yml up -d` then `cd server && go build -o bin/testserver ./cmd/testserver && ./bin/testserver` (port 9999, PG 5433, Meili 7700)

## Tests
- **Angular**: `cd web && npx ng test` (NOT `npx vitest run`)
- **Go**: `cd server && go test ./...`
- **Android**: `./gradlew testDevDebugUnitTest`

## Build & Deploy
- **Go build**: `cd server && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bin/server-linux ./cmd/server`
- **Web build**: `cd web && npm run build`
- **Restart services**: `sudo systemctl restart viecz-server` / `sudo systemctl restart viecz-web`

## Documentation
- **Go docs**: `bash scripts/godoc-query.sh`
- **Angular docs**: `python3 scripts/compodoc-query.py`
