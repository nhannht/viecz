# Task Completion Checklist

When completing a task, verify:

1. **Code changes work** — Build succeeds, no regressions
2. **Tests written** — Every code change needs a corresponding unit test
3. **Run only new tests** — Don't re-run full suite unless asked
4. **Docs updated** — Check if `docs/technical/` needs updates:
   - API changes → `API_REFERENCE.md`
   - Model changes → `DATA_STRUCTURE.md`
   - Flow changes → `USER_FLOW.md`
   - Algorithm changes → `ALGORITHM.md`
5. **YouTrack updated** — Comment with results, set to Done, log work time
6. **No secrets committed** — No .env, tokens, local paths with usernames
7. **Don't commit unless asked** — Wait for explicit user request

## Build Commands
- Go: `cd server && go build ./...`
- Angular web: `cd web && bun run build`
- Mobile (web + native): `cd mobile && bun run build && bunx cap sync android && cd android && ./gradlew assembleDebug`

## Test Commands
- Go: `cd server && go test ./internal/services/... -run TestSpecificFunc`
- Angular web: `cd web && npx ng test`
- Mobile web: `cd mobile && npx ng test`
- Mobile native: `cd mobile/android && ./gradlew testDebugUnitTest`
