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
# Deploy server (ask user first!)
rsync -avz bin/server-linux sg:~/nhannht-projects/viecz/server/bin/

# Check production
curl -s --max-time 5 https://viecz.fishcmus.io.vn
```
