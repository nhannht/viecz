# Suggested Commands

## Go Backend (server/)
```bash
# Run production server
cd server && go run cmd/server/main.go

# Run test server (dev/E2E)
docker compose -f docker-compose.testdb.yml up -d
cd server && go build -o bin/testserver ./cmd/testserver && ./bin/testserver
# Health check: curl -s http://localhost:9999/api/v1/health

# Run all tests
cd server && go test ./...

# Run tests with coverage
cd server && go test -v -cover ./...

# Run specific package tests
cd server && go test -v ./internal/services/...
cd server && go test -v ./internal/handlers/...

# Build production binary
cd server && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bin/server-linux ./cmd/server
```

## Angular Web Client (web/)
```bash
# Dev server (proxy to backend)
cd web && npm start  # http://localhost:4200

# Run tests (MUST use ng test, NOT vitest directly)
cd web && npx ng test

# Production build with SSR
cd web && npm run build

# Serve SSR build
cd web && PORT=4001 node dist/web/server/server.mjs

# Storybook
cd web && yarn storybook

# Add dependency
cd web && yarn add <package>
```

## Android (android/)
```bash
cd android

# Build dev debug APK
./gradlew assembleDevDebug

# Install on device
./gradlew installDevDebug

# Unit tests
./gradlew testDevDebugUnitTest

# E2E tests (requires test server running)
./gradlew connectedDevDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=<TestClass>

# Lint
./gradlew lint
```

## Infrastructure
```bash
# Deploy Go server (ask user first!)
cd server && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bin/server-linux ./cmd/server
sudo systemctl restart viecz-server

# Deploy Angular web (ask user first!)
cd web && npm run build
sudo systemctl restart viecz-web

# Check production
curl -s --max-time 5 https://viecz.fishcmus.io.vn
sudo systemctl status viecz-server viecz-web
sudo journalctl -u viecz-server -f
sudo journalctl -u viecz-web -f
```

## Monitoring
```bash
# GlitchTip API (error tracking)
GT_TOKEN=$(grep GLITCHTIP_API_TOKEN /docker_config/monitoring/.env | cut -d= -f2)
curl -s -H "Authorization: Bearer $GT_TOKEN" "https://glitchtip.fishcmus.io.vn/api/0/organizations/viecz/issues/"

# Grafana API (dashboards)
GRAFANA_PASS=$(grep GF_SECURITY_ADMIN_PASSWORD /docker_config/monitoring/.env | cut -d= -f2)
curl -s -u "admin:${GRAFANA_PASS}" "http://localhost:3001/api/dashboards/home"

# Prometheus targets health
curl -s "http://localhost:9090/api/v1/targets" | python3 -c "import sys,json; [print(f'{t[\"labels\"][\"job\"]:20s} {t[\"health\"]}') for t in json.load(sys.stdin)['data']['activeTargets']]"

# Monitoring stack (start/stop/logs)
cd /docker_config/monitoring && sudo docker compose up -d
cd /docker_config/monitoring && sudo docker compose logs -f
```
