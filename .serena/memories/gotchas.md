# Known Gotchas & Pitfalls

## Go Backend
- `.env` is NOT loaded when `GO_ENV=production` — config.go skips godotenv.Load()
- PayOS sends test webhooks when verifying URLs — handler must detect and return 200 before signature check
- PayOS dual client: deposit channel + payout channel (separate API keys)
- Test server drops all tables on startup — restart between test runs for fresh DB
- Meilisearch must be running for search tests: `docker compose -f docker-compose.testdb.yml up -d`

## Angular Web
- NEVER run `npx vitest run` — use `npx ng test` (Angular builder wraps Vitest)
- @angular/platform-browser-dynamic is REQUIRED for Storybook — without it, components show infinite spinner
- All @storybook/* packages must be same major version — mixing causes ESM errors
- Compodoc JSDoc must go BEFORE @Component() decorator for class descriptions

## Infrastructure
- Nginx handles viecz.fishcmus.io.vn: `/api/` → Go at 127.0.0.1:8080, else → Angular SSR at 127.0.0.1:4001
- Direct API access also at viecz-api.fishcmus.io.vn (Cloudflare tunnel)
- Web SSR runs on port 4001 (NOT 4000 or 4200) — nginx proxies to 4001
- Docker ports must bind to 127.0.0.1 — Docker bypasses UFW
- UFW default INPUT policy is DROP — Docker containers need UFW allow rules to reach host ports
- Monitoring stack at /docker_config/monitoring/ — GlitchTip (:8200), Prometheus (:9090), Grafana (:3001)
- Prometheus needs UFW rules for Docker network (172.30.0.0/16) to scrape host ports 8080/9999

## Android
- Physical device needs `adb reverse tcp:9999 tcp:9999` for test server
- E2E tests need `testServerHost=localhost` for physical devices
- Always `performScrollToNode` before clicking in LazyColumn
