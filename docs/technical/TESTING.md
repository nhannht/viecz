# Testing Standards

**Last Updated:** 2026-02-25

---

## Coverage Targets

Coverage targets are tiered by platform and package type, reflecting the practical testability of each layer.

### Web Client (Angular)

| Metric | Target | Notes |
|--------|--------|-------|
| Statements | 90% | Currently at 97% |
| Branches | 80% | Angular signal internals inflate branch count ~10% |
| Functions | 90% | Currently at 91% |
| Lines | 90% | Currently at 98% |

### Go Server — By Package Tier

| Tier | Packages | Target | Rationale |
|------|----------|--------|-----------|
| **Business logic** | `services`, `handlers`, `auth`, `middleware` | **75%** | Core value — bugs here have user impact |
| **Data layer** | `models`, `repository` | **50%** | Validation hooks + CRUD operations |
| **Infrastructure** | `config`, `database`, `logger`, `websocket`, `cmd/*` | **No target** | Thin wrappers, entrypoints, or require complex integration setup |

**Why not 90% everywhere?**
- `cmd/*` are entrypoints that wire dependencies and start the server — testing them is E2E, not unit tests
- `config` reads env vars — testing it verifies `os.Getenv` works, not our code
- `logger` wraps zerolog — no business logic to test
- `websocket` requires real WebSocket connections — better covered by E2E tests
- `repository` uses testcontainers (PostgreSQL per test, ~10s startup) — slow feedback loop limits practical density

### Angular Branch Coverage Ceiling

Angular's `signal()`, `input()`, and `computed()` generate synthetic `cond-expr` branches in V8/Istanbul coverage that cannot be exercised through application tests. These are framework-internal factory initialization paths.

**Impact:** ~164 uncoverable branches across a typical Angular app using signals. This creates a ~10% gap between reported and effective branch coverage. At 88.5% reported, effective application-code branch coverage is 99%+.

**Do not** add `/* v8 ignore next */` comments to work around this. The 80% standard accounts for the framework overhead.

---

## Platform Testing Overview

| Platform | Framework | Runner | Command |
|----------|-----------|--------|---------|
| Web (Angular 21) | Vitest 4 | `@angular/build:unit-test` | `cd web && npx ng test` |
| Server (Go) | `testing` | `go test` | `cd server && go test ./...` |
| Android (Kotlin) | JUnit 5 + Compose Test | Gradle | `cd android && ./gradlew testDevDebugUnitTest` |

---

## Web Client (Angular)

### Running Tests

```bash
cd web

# CORRECT - uses Angular builder (injects globals, TestBed, jsdom, zone.js)
npx ng test

# Targeted file (preferred during bug fixes)
npx ng test --watch=false --include=src/app/core/auth.service.spec.ts

# With coverage
npx ng test --coverage

# WRONG - bypasses Angular builder, causes "describe is not defined"
# npx vitest run   # NEVER use this
```

### Test File Convention

- Spec files co-located with source: `component.spec.ts` next to `component.ts`
- Use `provideTranslocoForTesting()` for i18n
- Use `provideHttpClientTesting()` + `HttpTestingController` for HTTP mocks
- Use `provideRouter([])` for routing

### Signal Input Testing

```typescript
// For signal inputs, use setInput()
fixture.componentRef.setInput('task', mockTask);
fixture.detectChanges();
```

### ControlValueAccessor Testing

```typescript
// Test CVA components through their interface
component.writeValue('test');
expect(component.value).toBe('test');

component.registerOnChange(changeFn);
component.registerOnTouched(touchedFn);
component.setDisabledState(true);
```

### Template Branch Coverage Patterns

Angular templates generate creation/destruction branches for each `@if` block. Cover both paths with state toggling:

```typescript
// Covers @if creation branch
component.loading.set(true);
fixture.detectChanges();

// Covers @if destruction + @else creation
component.loading.set(false);
fixture.detectChanges();
```

For `||` fallback expressions in templates (e.g., `{{ name || 'default' }}`), test with the primary value being falsy:

```typescript
component.name.set('');  // triggers || fallback
fixture.detectChanges();
expect(el.textContent).toContain('default');
```

### Common Pitfalls

- **NG0100 ExpressionChangedAfterItHasBeenCheckedError**: Use `fixture.changeDetectorRef.detectChanges()` instead of `fixture.detectChanges()` when mutating plain (non-signal) properties between detection cycles
- **FormsModule async registration**: Use `await fixture.whenStable()` before interacting with `ngModel`-bound inputs
- **`afterNextRender()` doesn't fire in tests**: Manually set up dependencies (e.g., canvas context) that would normally initialize in `afterNextRender`
- **Route refactor drift in specs**: Keep navigation assertions synchronized with current route contracts. Example: after phone-first auth rollout, `AuthService.logout()` should assert `router.navigate(['/phone'])`, not `['/login']`

### Current Coverage (2026-02-22)

| Metric | Value | Tests |
|--------|-------|-------|
| Statements | 97.47% | 1176 |
| Branches | 88.53% | across 58 files |
| Functions | 91.38% | |
| Lines | 98.78% | |

---

## Go Server

### Running Tests

```bash
cd server

# All tests
go test ./...

# With coverage
go test -cover ./...

# Coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### Test Patterns

- **Handlers**: Use `httptest.NewRecorder()` + mock services
- **Services**: Mock repository interfaces
- **Repository**: Use testcontainers-go with PostgreSQL (requires Docker)
- **Models**: Direct struct validation

### Current Coverage (2026-02-24)

| Package | Coverage | Tier | Target | Status |
|---------|----------|------|--------|--------|
| `internal/models` | 97.1% | Data layer | 50% | Met |
| `internal/auth` | 79.0% | Business logic | 75% | Met |
| `internal/middleware` | 78.3% | Business logic | 75% | Met |
| `internal/handlers` | 76.7% | Business logic | 75% | Met |
| `internal/services` | 62.8% | Business logic | 75% | Below* |
| `internal/repository` | 29.9% | Data layer | 50% | Below |
| `internal/websocket` | 0% | Infrastructure | — | N/A |
| `internal/config` | 0% | Infrastructure | — | N/A |
| `internal/database` | 0% | Infrastructure | — | N/A |
| `internal/logger` | 0% | Infrastructure | — | N/A |

**\*Services coverage ceiling:** The `services` package contains ~21 functions that are thin wrappers around external SDKs (PayOS, Meilisearch, SMTP, WebSocket message handlers). These cannot be meaningfully unit tested without integration infrastructure. The testable business logic within `services` (task, wallet, payment, user, notification) is at ~80%+ coverage. The package-level number is dragged down by the SDK wrappers.

**Note:** Repository tests require Docker (`sudo go test` or user in `docker` group) for testcontainers-go PostgreSQL containers.

### Branch Coverage

Go's built-in `go test -cover` only reports **statement coverage**. It does not track branch coverage. This is by design — Go's explicit error handling (`if err != nil`) means most branches are separate statements, so statement coverage catches most gaps.

---

## Android

### Running Tests

```bash
cd android

# Unit tests (JVM, Robolectric)
./gradlew testDevDebugUnitTest

# Instrumented tests (requires device/emulator)
./gradlew connectedDevDebugAndroidTest
```

### Test Tiers

Tests are organized by value — what they actually catch vs their maintenance cost.

#### Tier 1: High Value (keep and expand)

| Category | Files | Tests | What it catches |
|----------|-------|-------|-----------------|
| ViewModel tests | 8 | 102 | Business logic bugs, state machine errors, error handling gaps |
| Repository tests | 7 | 90 | HTTP error mapping, caching, data flow contract breaks |
| API tests (MockWebServer) | 8 | 60 | Retrofit serialization, wrong HTTP methods/paths, response mapping |
| E2E tests (real server) | 6 | 9 | Full user flow regressions across UI + server + DB |
| WebSocket tests | 1 | 11 | Real-time chat connection/message bugs |
| AuthInterceptor tests | 1 | 9 | Token attachment, 401 logout trigger |
| TokenManager tests | 1 | 10 | Auth persistence (DataStore) |

#### Tier 2: Medium Value (keep as-is)

| Category | Files | Tests | What it catches |
|----------|-------|-------|-----------------|
| MetroComponentsTest | 1 | 17 | Design system component regressions |
| NetworkModuleTest | 1 | 15 | Wrong base URLs, missing interceptors |
| ConvertersTest | 1 | 14 | Room TypeConverter data corruption |
| MainActivityTest | 1 | 8 | Deep link parsing, payment result handling |

#### Removed (Tier 3 — low value)

The following test categories were removed (2026-02-25) because they added maintenance cost without catching real bugs:

- **Screen render tests** (Robolectric) — tested that Compose renders static text. Broke on every UI change (e.g., Metro migration changed label casing). E2E tests cover the same screens with real rendering.
- **Duplicate component tests** — instrumented versions of Robolectric tests. Same assertions, twice the maintenance.
- **Mock-server E2E tests** (S01, S04, S06, S08, S17) — tested against canned fake responses. The real-server E2E tests (S13+) catch more bugs because they run against the actual Go server with real PostgreSQL.
- **Navigation route constant tests** — tested string values like `"splash"`. If wrong, the app crashes immediately.
- **Theme color tests** — tested hex color values. Visual bugs are caught by eyes, not assertions.
- **Placeholder tests** — `2 + 2 == 4`.
- **Trivial DI/database/error model tests** — tested framework behavior (Hilt, Room, Moshi), not app logic.

#### What NOT to test on Android

- Static text rendering ("does the button say SIGN IN")
- Framework behavior (Moshi deserializes JSON, Room stores data, Hilt resolves dependencies)
- String constants (route names, database names, color hex values)
- The same thing twice (Robolectric + instrumented for identical assertions)

#### What TO test

- **Behavior**: "when user clicks Login with valid credentials, ViewModel emits Success" > "Login button text says SIGN IN"
- **State machines**: ViewModel state transitions (Idle → Loading → Success/Error)
- **Error handling**: HTTP errors, network failures, empty states
- **Business rules**: form validation, escrow calculations, wallet balance checks
- **Full flows**: E2E with real server (S13 full job lifecycle is the gold standard)

### E2E Tests

See `android/E2E_TESTING_GUIDE.md` for full details. Key rules:

- E2E tests use `@E2ETest` annotation
- Naming: `S<number>_<Name>E2ETest.kt`
- Only real-server E2E tests remain (S13-S19, extend `RealServerBaseE2ETest`)
- Always `performScrollToNode` before clicking in LazyColumn
- Use `waitUntil` + `performClick` instead of `assertIsDisplayed` for async elements
- `RealServerBaseE2ETest` requires Go test server on port 9999

### Coverage Targets — Per Package

Overall coverage (25.5%) is misleading because Compose UI screens are ~40% of the codebase but contain no testable logic. Target coverage per package based on bug cost:

| Package | Current | Target | Rationale |
|---------|---------|--------|-----------|
| `ui.viewmodels` | 69.5% | **75%** | Business logic, state machines. Where real bugs live. |
| `data.repository` | 62.8% | **65%** | HTTP error mapping, caching. |
| `data.api` | 93.5% | **90%** | Retrofit contracts. Already exceeds target. |
| `data.models` | 90.0% | **80%** | Data class validation. Already exceeds target. |
| `data.websocket` | 62.3% | **60%** | Real-time chat. Already meets target. |
| `ui.components.metro` | 47.6% | **50%** | Design system regressions. Close to target. |
| `ui.screens` | 0% | **0%** | Compose layouts — covered by E2E, not unit tests. |
| `ui.navigation` | 0% | **0%** | Wiring — covered by E2E. |
| `data.local.dao` | 0% | **0%** | Room-generated code — covered by E2E. |

**Do not chase overall %.** 25% overall is correct if the high-bug-cost layers (ViewModels, Repositories, API) are at 65-90%. Inflating coverage with screen render assertions adds maintenance cost without catching bugs.

**The metric that matters:** "How often do bugs reach production that tests would have caught?"

### Current Test Count (2026-02-25)

| Source set | @Test methods |
|------------|---------------|
| Unit (JVM) | 348 |
| Instrumented (device) | 28 |
| **Total** | **376** |

---

## General Rules

1. **Every code change must include a corresponding unit test**
2. **Run only the specific test related to your change**, not the full suite
3. **Same code path for test and production** — mock at dependency boundaries, not inside business logic
4. **Same DB engine** — never use SQLite to test PostgreSQL code
5. **If two code paths exist, both must be tested** — a `t.Skip()` is a red flag
