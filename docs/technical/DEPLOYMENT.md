# Deployment Guide

**Last Updated:** 2026-02-17

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Docker Compose Services](#2-docker-compose-services)
3. [Environment Variables](#3-environment-variables)
4. [Production Deployment (Beta Phase)](#4-production-deployment-beta-phase)
4b. [Production Deployment (Full Docker — Future)](#4b-production-deployment-full-docker--future)
5. [Test Server (Development / E2E)](#5-test-server-development--e2e)
6. [Android Versioning (CalVer)](#6-android-versioning-calver)
7. [Android Build Flavors](#7-android-build-flavors)
8. [Cloudflare Tunnel](#8-cloudflare-tunnel)
9. [E2E Test Deployment](#9-e2e-test-deployment)
10. [Verify Deployment](#10-verify-deployment)
11. [Maintenance](#11-maintenance)

---

## 1. Architecture Overview

| Component | Technology | Database | Port |
|---|---|---|---|
| Production server | Go (Gin) | PostgreSQL 15 | 8080 (default) |
| Test server | Go (Gin) | PostgreSQL (Docker tmpfs, port 5433) | 9999 |
| Meilisearch (optional) | getmeili/meilisearch:v1.16 | tmpfs | 7700 |
| Android app (dev) | Kotlin / Jetpack Compose | Room (local) | N/A |
| Android app (prod) | Kotlin / Jetpack Compose | Room (local) | N/A |

**Production stack (beta)**: Go server runs as a native binary on the host. PostgreSQL and Cloudflare Tunnel run in Docker containers. The Go server connects to PostgreSQL at `127.0.0.1:5432` via GORM. External HTTPS is handled by Cloudflare Tunnel (no Nginx or Certbot needed). See [Section 4](#4-production-deployment-beta-phase) for deployment steps.

**Test stack**: Go binary with PostgreSQL test container (port 5433, Docker tmpfs for RAM-backed storage) and mock PayOS. Requires test PostgreSQL container (`docker-compose.testdb.yml`).

---

## 2. Docker Compose Services

The project uses three Compose files, combined at deploy time:

```bash
docker compose -f docker-compose.yml -f docker-compose.server.yml -f docker-compose.cloudflared.yml up -d
```

### `docker-compose.yml` -- PostgreSQL

```yaml
services:
  postgres:
    image: postgres:15-alpine
    container_name: viecz-postgres
    environment:
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
      POSTGRES_DB: ${DB_NAME:-viecz}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
```

### `docker-compose.server.yml` -- Go API server

```yaml
services:
  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: viecz-server
    environment:
      PORT: ${PORT:-8080}
      GO_ENV: production
      SERVER_URL: ${SERVER_URL:-http://localhost:8080}
      CLIENT_URL: ${CLIENT_URL:-http://localhost:8081}
      DB_HOST: postgres
      DB_PORT: "5432"
      DB_USER: ${DB_USER:-postgres}
      DB_PASSWORD: ${DB_PASSWORD:-postgres}
      DB_NAME: ${DB_NAME:-viecz}
      DB_SSLMODE: disable
      JWT_SECRET: ${JWT_SECRET}
      PAYOS_CLIENT_ID: ${PAYOS_CLIENT_ID:-}
      PAYOS_API_KEY: ${PAYOS_API_KEY:-}
      PAYOS_CHECKSUM_KEY: ${PAYOS_CHECKSUM_KEY:-}
    ports:
      - "${DOCKER_SERVER_PORT:-8080}:${PORT:-8080}"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
```

### `docker-compose.cloudflared.yml` -- Cloudflare Tunnel

```yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: viecz-cloudflared
    command: tunnel run --token ${CLOUDFLARED_TOKEN}
    depends_on:
      server:
        condition: service_started
    restart: unless-stopped
```

The tunnel is configured in Cloudflare Zero Trust dashboard to route `viecz-api.fishcmus.io.vn` (and the dev variant `viecz-api-dev.fishcmus.io.vn`) to the `server` container on port 8080.

### Server Dockerfile

Multi-stage Alpine build (`server/Dockerfile`):

```dockerfile
FROM golang:1.25-alpine AS builder
RUN apk add --no-cache git
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server ./cmd/server

FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /server .
COPY --from=builder /app/static ./static
EXPOSE 8080
CMD ["./server"]
```

Key points:
- `CGO_ENABLED=0` -- production server uses PostgreSQL driver (no CGO needed)
- Static files (`static/`) are copied for `.well-known` (Android App Links) and privacy policy
- Final image is minimal Alpine (~20 MB)

---

## 3. Environment Variables

### Production (`.env.production.example`)

| Variable | Required | Description |
|---|---|---|
| `DB_USER` | Yes | PostgreSQL username |
| `DB_PASSWORD` | Yes | PostgreSQL password (change from default) |
| `DB_NAME` | Yes | PostgreSQL database name |
| `CLIENT_URL` | Yes | Frontend URL for CORS |
| `JWT_SECRET` | Yes | Minimum 32 characters, random string |
| `PAYOS_CLIENT_ID` | No | PayOS payment gateway client ID |
| `PAYOS_API_KEY` | No | PayOS payment gateway API key |
| `PAYOS_CHECKSUM_KEY` | No | PayOS payment gateway checksum key |
| `CLOUDFLARED_TOKEN` | Yes | Token from Cloudflare Zero Trust dashboard |

### Server (full list from `server/.env.example`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Server listen port |
| `GO_ENV` | `development` | `development` or `production` |
| `SERVER_URL` | `http://localhost:8080` | Public server URL (used for webhook callbacks) |
| `CLIENT_URL` | `http://localhost:8081` | Client URL for CORS and redirects |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | `postgres` | PostgreSQL password |
| `DB_NAME` | `viecz` | PostgreSQL database |
| `DB_SSLMODE` | `disable` | PostgreSQL SSL mode |
| `JWT_SECRET` | (insecure default) | JWT signing key |
| `PAYOS_CLIENT_ID` | (empty) | PayOS credentials |
| `PAYOS_API_KEY` | (empty) | PayOS credentials |
| `PAYOS_CHECKSUM_KEY` | (empty) | PayOS credentials |
| `PLATFORM_FEE_RATE` | `0` | Platform fee as decimal (e.g. `0.10` = 10%) |
| `MAX_WALLET_BALANCE` | `200000` | Max wallet balance per user in VND |
| `MEILISEARCH_URL` | (empty) | Meilisearch URL (e.g., `http://localhost:7700`). Empty = PostgreSQL LIKE fallback |
| `MEILISEARCH_API_KEY` | (empty) | Meilisearch API key. Empty = no auth |

### Docker-specific variables

| Variable | Default | Description |
|---|---|---|
| `DOCKER_SERVER_PORT` | `8080` | Host port mapped to server container |
| `CLOUDFLARED_TOKEN` | (none) | Cloudflare tunnel token (passed via `CLOUDFLARED_TOKEN` in `.env`) |

---

## 4. Production Deployment (Beta Phase)

**Current approach**: The Go server runs as a **native binary** on the host, while PostgreSQL and Cloudflare Tunnel run in **Docker containers**. This enables fast iteration — no Docker rebuild (~90s saved per deploy), just cross-compile + rsync + restart.

### Architecture

```
┌─────────────────────────────────────────┐
│  Production Server (sg)                 │
│                                         │
│  ┌──────────────┐   ┌───────────────┐   │
│  │ server-linux  │──▶│  PostgreSQL    │   │
│  │ (native bin)  │   │  (Docker)     │   │
│  │ :8080         │   │  :5432        │   │
│  └──────┬───────┘   └───────────────┘   │
│         │                               │
│  ┌──────▼───────┐                       │
│  │ cloudflared   │                       │
│  │ (Docker)      │                       │
│  └──────────────┘                       │
└─────────────────────────────────────────┘
```

- **Go server**: Native binary on host, connects to PostgreSQL at `127.0.0.1:5432`
- **PostgreSQL**: Docker container (`docker-compose.yml`), data persisted in `postgres_data` volume
- **Cloudflare Tunnel**: Docker container, routes `viecz-api.fishcmus.io.vn` → `http://host.docker.internal:8080` (or `http://172.17.0.1:8080`)

### Prerequisites

- Docker and Docker Compose (for PostgreSQL + Cloudflare Tunnel)
- Go 1.25+ on the development machine (for cross-compilation)
- SSH access to the production server (see `sg` in global CLAUDE.md)

### Initial Setup (One-Time)

```bash
# 1. On the production server: start PostgreSQL
docker compose -f docker-compose.yml up -d

# 2. Create .env in the project root
cp .env.production.example .env
# Edit: set DB_HOST=127.0.0.1, DB_PASSWORD, JWT_SECRET, PayOS keys

# 3. Start Cloudflare Tunnel (configure to point to host:8080)
docker compose -f docker-compose.cloudflared.yml up -d
```

### Deploy / Update (Fast Iteration)

Run from the **local development machine**:

```bash
# 1. Cross-compile for Linux
cd server && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bin/server-linux ./cmd/server

# 2. Rsync binary to production server
rsync -avz bin/server-linux baremetal-sg-ks3:~/nhannht-projects/viecz/server/bin/

# 3. Restart the server (no sudo, no systemctl)
ssh baremetal-sg-ks3 "pkill -f server-linux || true"
ssh -f baremetal-sg-ks3 "cd ~/nhannht-projects/viecz && nohup ./server/bin/server-linux > /tmp/viecz-server.log 2>&1 &"

# 4. Verify
ssh baremetal-sg-ks3 "curl -s http://localhost:8080/api/v1/health"
```

Typical deploy time: **~15s** (build ~5s + rsync ~5s + restart ~5s).

### Database Access

PostgreSQL runs in Docker, so use `docker exec` to access `psql`:

```bash
# On the production server (requires sudo for docker)
sudo docker exec -it viecz-postgres psql -U postgres -d viecz

# Run a one-off query
sudo docker exec viecz-postgres psql -U postgres -d viecz -c "SELECT id, email FROM users;"

# Backup
sudo docker exec viecz-postgres pg_dump -U postgres viecz > backup_$(date +%Y%m%d).sql

# Restore
sudo docker exec -i viecz-postgres psql -U postgres viecz < backup_20260216.sql
```

### Server Logs

```bash
# Live logs
ssh baremetal-sg-ks3 "tail -f /tmp/viecz-server.log"

# Last 50 lines
ssh baremetal-sg-ks3 "tail -50 /tmp/viecz-server.log"
```

The server auto-migrates tables on startup via GORM `AutoMigrate` and seeds initial data (categories, 2 test users, wallets, 10 sample tasks) via `database.SeedData`.

### Why Native Binary Over Full Docker

| | Native binary | Full Docker |
|---|---|---|
| Deploy time | ~15s | ~90s+ (rebuild image) |
| Debugging | Direct log file, easy to attach | Must exec into container |
| DB access | `docker exec` into PostgreSQL container | Same |
| Rollback | Rsync previous binary | Rebuild previous image |
| Complexity | Low (just a binary + .env) | Higher (Dockerfile, compose networking) |

**Note**: The full Docker Compose deployment (Section 2) remains available for future production hardening. The beta phase prioritizes iteration speed.

## 4b. Production Deployment (Full Docker — Future)

### Prerequisites

- Docker and Docker Compose installed
- Cloudflare tunnel token from Zero Trust dashboard

### Steps

```bash
# 1. Clone the repository
git clone <repo-url> && cd viecz

# 2. Create .env from example
cp .env.production.example .env
# Edit .env: set DB_PASSWORD, JWT_SECRET, CLOUDFLARED_TOKEN, PayOS keys

# 3. Start all services
docker compose \
  -f docker-compose.yml \
  -f docker-compose.server.yml \
  -f docker-compose.cloudflared.yml \
  up -d --build

# 4. Verify
docker compose ps
curl -s http://localhost:8080/api/v1/health
```

The server auto-migrates tables on startup via GORM `AutoMigrate` and seeds initial data (categories, 2 test users, wallets, 10 sample tasks) via `database.SeedData`.

### Updating

```bash
git pull
docker compose \
  -f docker-compose.yml \
  -f docker-compose.server.yml \
  -f docker-compose.cloudflared.yml \
  up -d --build
```

Only the `server` container rebuilds; `postgres` data persists in the `postgres_data` volume.

---

## 5. Test Server (Development / E2E)

The test server (`server/cmd/testserver/main.go`) is a binary for local development and E2E testing. It requires a test PostgreSQL container.

| Property | Value |
|---|---|
| Port | `9999` (hardcoded) |
| Database | PostgreSQL (port 5433, Docker tmpfs -- drops all tables on startup for fresh state) |
| Search | Meilisearch (port 7700, Docker tmpfs -- optional, via `docker-compose.testdb.yml`) |
| JWT Secret | `e2e-test-secret-key` (hardcoded) |
| PayOS | Mock -- `CreatePaymentLink` auto-fires webhook after 100ms to credit wallet |
| Seed data | Categories + 2 test users (`nhan1@gmail.com`, `nhan2@gmail.com` / `Password123`) + wallets with 10,000,000 VND each + 10 sample tasks |
| Health check | `GET /api/v1/health` |

### Build and run

```bash
# 1. Start the test PostgreSQL container
docker compose -f docker-compose.testdb.yml up -d

# 2. Build and run the test server
cd server
go build -o bin/testserver ./cmd/testserver
./bin/testserver
```

The test server connects to PostgreSQL on port 5433 (database `viecz_test`, user `postgres`, password `testpass`). The container uses tmpfs for RAM-backed storage, making it fast and ephemeral.

`docker-compose.testdb.yml` also includes a Meilisearch container (`getmeili/meilisearch:v1.16`) on port 7700 with tmpfs storage. The test server auto-connects if `MEILISEARCH_URL=http://localhost:7700` is set; otherwise falls back to PostgreSQL LIKE search.

### Routes

The test server mirrors all production routes exactly:
- Auth: `/api/v1/auth/{register,login,refresh}`
- Users: `/api/v1/users/{:id,me}`
- Tasks: `/api/v1/tasks/...`
- Wallet: `/api/v1/wallet/{deposit,transactions}`
- Payments: `/api/v1/payments/{escrow,release,refund}`
- WebSocket: `/api/v1/ws`
- Conversations: `/api/v1/conversations/...`
- Notifications: `/api/v1/notifications/...`
- Categories: `/api/v1/categories`

---

## 6. Android Versioning (CalVer)

The Android app uses JetBrains-style calendar versioning derived automatically from **Git tags** via the [ReactiveCircus/app-versioning](https://github.com/ReactiveCircus/app-versioning) Gradle plugin.

### Format

Tags follow the pattern `android/YYYY.R` or `android/YYYY.R.P`:

| Component | Meaning | Example |
|---|---|---|
| `android/` | Monorepo prefix (filtered by `tagFilter`) | `android/` |
| `YYYY` | Release year | `2026` |
| `R` | Release number within that year (1, 2, 3...) | `1` |
| `P` | Patch number (optional, 0 = omitted) | `1` |

### How it works

The plugin reads the latest matching Git tag and computes:

- **versionName**: tag without prefix (e.g., `2026.1` or `2026.1.1`). Dev flavor appends `-dev`.
- **versionCode**: `YYYY * 10000 + R * 100 + P` (e.g., `20260100`, `20260201`)

No manual `versionCode`/`versionName` in `build.gradle.kts` — the plugin injects them at build time.

### How to bump

```bash
# New release
git tag android/2026.2

# Patch/hotfix
git tag android/2026.2.1

# New year
git tag android/2027.1

# Push tags to remote
git push origin android/2026.2
```

### CI/CD Release (GitHub Actions)

Pushing a CalVer tag automatically builds and uploads the APK to Firebase App Distribution:

```bash
git tag android/2026.2 && git push origin android/2026.2
```

See `.github/workflows/android-release.yml` and [FIREBASE_DISTRIBUTION.md](FIREBASE_DISTRIBUTION.md#7-cicd-distribution-github-actions) for details on required GitHub Secrets and the workflow.

### Monorepo tag convention

Each component uses its own tag prefix so versions are independent:

| Component | Tag prefix | Example | Filter |
|---|---|---|---|
| Android | `android/` | `android/2026.1` | `android/*` |
| Server (future) | `server/` | `server/2026.1` | `server/*` |

### Examples

| Git tag | versionName (prod) | versionName (dev) | versionCode |
|---|---|---|---|
| `android/2026.1` | `2026.1` | `2026.1-dev` | `20260100` |
| `android/2026.2` | `2026.2` | `2026.2-dev` | `20260200` |
| `android/2026.2.1` | `2026.2.1` | `2026.2.1-dev` | `20260201` |
| `android/2027.1` | `2027.1` | `2027.1-dev` | `20270100` |

---

## 7. Android Build Flavors

Defined in `android/app/build.gradle.kts` under `productFlavors`:

| Flavor | Application ID | API Base URL | App Name |
|---|---|---|---|
| `dev` | `com.viecz.vieczandroid.dev` | `http://10.0.2.2:9999/api/v1/` | Viecz Dev |
| `prod` | `com.viecz.vieczandroid` | `https://viecz-api.fishcmus.io.vn/api/v1/` | Viecz |

Both flavors can coexist on the same device (different application IDs).

### Build variants

- `devDebug` -- Local development against test server
- `devRelease` -- Release build against test server
- `prodDebug` -- Debug build against production server
- `prodRelease` -- Release build for Play Store distribution

### Building

```bash
cd android

# Dev (local test server)
./gradlew assembleDevDebug
./gradlew installDevDebug

# Production
./gradlew assembleProdRelease
```

### Overriding API URL

Create/edit `android/local.properties`:

```properties
API_BASE_URL_DEV=http://10.0.2.2:9999/api/v1/
API_BASE_URL_PROD=https://viecz-api.fishcmus.io.vn/api/v1/
```

### Physical device connectivity

Emulators reach `10.0.2.2:9999` natively (Android emulator loopback to host). Physical devices need ADB port forwarding:

```bash
adb reverse tcp:9999 tcp:9999
# Verify: adb reverse --list
```

---

## 8. Cloudflare Tunnel

The production API is exposed via Cloudflare Tunnel (no public ports, no Nginx, no Certbot).

**How it works**:
1. `cloudflared` container connects outbound to Cloudflare edge
2. Cloudflare routes `viecz-api.fishcmus.io.vn` traffic through the tunnel to the `server` container on port 8080
3. HTTPS termination happens at Cloudflare edge

**Setup**:
1. Go to Cloudflare Zero Trust > Networks > Tunnels
2. Create a tunnel, get the token
3. Set `CLOUDFLARED_TOKEN` in `.env`
4. Configure public hostname in the tunnel dashboard:
   - Hostname: `viecz-api.fishcmus.io.vn`
   - Service: `http://server:8080` (Docker service name)

The config file `cloudflared-config.yml` is gitignored (contains tunnel credentials). It references `viecz-api-dev.fishcmus.io.vn` for the dev tunnel endpoint.

---

## 9. E2E Test Deployment

The script `scripts/run-full-e2e.sh` automates the full E2E flow:

```bash
# Interactive mode
./scripts/run-full-e2e.sh

# Emulator mode
./scripts/run-full-e2e.sh emulator

# Physical device mode
./scripts/run-full-e2e.sh device
```

### What it does

1. Detects or starts an Android emulator / finds a USB device
2. Builds the test server (`go build`)
3. Starts the test server on port 9999
4. Waits for health check
5. Runs `S13_FullJobLifecycleE2ETest` via Gradle instrumented tests
6. Reports pass/fail, outputs logs to `/tmp/viecz-e2e-output.log`

### Gradle test profiles

```bash
# Mock-only tests (no server needed)
./gradlew connectedDevDebugAndroidTest -PexcludeRealServer

# Real-server tests only (requires test server on :9999)
./gradlew connectedDevDebugAndroidTest -PonlyRealServer

# Convenience tasks
./gradlew connectedMockE2E
./gradlew connectedRealServerE2E
```

---

## 10. Verify Deployment

### Production (Beta Phase)

```bash
# Health check
curl https://viecz-api.fishcmus.io.vn/api/v1/health

# Server process
ssh baremetal-sg-ks3 "pgrep -la server-linux"

# Server logs
ssh baremetal-sg-ks3 "tail -50 /tmp/viecz-server.log"

# Docker status (PostgreSQL + Cloudflare Tunnel)
ssh baremetal-sg-ks3 "sudo docker ps"

# PostgreSQL logs
ssh baremetal-sg-ks3 "sudo docker logs viecz-postgres --tail 20"

# Database query
ssh baremetal-sg-ks3 "sudo docker exec viecz-postgres psql -U postgres -d viecz -c 'SELECT id, email FROM users;'"
```

### Test server

```bash
curl http://localhost:9999/api/v1/health
curl http://localhost:9999/api/v1/categories
```

---

## 11. Maintenance

### Logs (Beta Phase)

| Log | Command |
|---|---|
| Server (production) | `ssh baremetal-sg-ks3 "tail -f /tmp/viecz-server.log"` |
| PostgreSQL | `ssh baremetal-sg-ks3 "sudo docker logs viecz-postgres -f"` |
| Cloudflared | `ssh baremetal-sg-ks3 "sudo docker logs viecz-cloudflared -f"` |
| Test server | Check terminal output or `/tmp/testserver.log` |
| Android app | `adb logcat --pid=$(adb shell pidof com.viecz.vieczandroid.dev)` |

### Database backup

```bash
# Dump PostgreSQL from container
ssh baremetal-sg-ks3 "sudo docker exec viecz-postgres pg_dump -U postgres viecz" > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20260216.sql | ssh baremetal-sg-ks3 "sudo docker exec -i viecz-postgres psql -U postgres viecz"
```

### Restart server (Beta Phase)

```bash
# Restart server only (cross-compile + rsync + restart)
cd server && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bin/server-linux ./cmd/server
rsync -avz bin/server-linux baremetal-sg-ks3:~/nhannht-projects/viecz/server/bin/
ssh baremetal-sg-ks3 "pkill -f server-linux || true"
ssh -f baremetal-sg-ks3 "cd ~/nhannht-projects/viecz && nohup ./server/bin/server-linux > /tmp/viecz-server.log 2>&1 &"

# Restart PostgreSQL only
ssh baremetal-sg-ks3 "sudo docker restart viecz-postgres"

# Restart Cloudflare Tunnel only
ssh baremetal-sg-ks3 "sudo docker restart viecz-cloudflared"
```
