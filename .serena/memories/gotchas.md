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
- Go API has no direct public ingress — proxied through Express SSR at viecz.fishcmus.io.vn
- Web SSR runs on port 4001 (NOT 4000 or 4200) — nginx proxies to 4001
- Docker ports must bind to 127.0.0.1 — Docker bypasses UFW

## Android
- Physical device needs `adb reverse tcp:9999 tcp:9999` for test server
- E2E tests need `testServerHost=localhost` for physical devices
- Always `performScrollToNode` before clicking in LazyColumn
