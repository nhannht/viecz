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
| Mobile (Angular in Capacitor) | Vitest 4 | `@angular/build:unit-test` | `cd mobile && npx ng test` |
| Android native | Gradle/JUnit | Gradle | `cd mobile/android && ./gradlew testDebugUnitTest` |

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

## Android / Mobile (Capacitor)

### Web App Tests (Angular in Capacitor)

Same as web client — runs in Vitest with jsdom:

```bash
cd mobile

# Unit tests
npx ng test

# With coverage
npx ng test --coverage
```

### Native Android Tests (Gradle)

The native Android project at `mobile/android/` contains platform-specific tests:

```bash
cd mobile/android

# Unit tests (JVM)
./gradlew testDebugUnitTest

# Instrumented tests (requires device/emulator)
./gradlew connectedDebugAndroidTest
```

**Note:** Most app logic runs in Angular (web layer). Native Android tests cover only platform-specific functionality (native plugins, intents, etc.). The bulk of business logic is tested via the Angular Vitest suite.

### Coverage Targets — Angular Web Layer

The Angular web app (which runs in Capacitor on mobile) has the following coverage targets:

| Metric | Target | Notes |
|--------|--------|-------|
| Statements | 90% | Currently at 97% |
| Branches | 80% | Angular signal internals inflate branch count ~10% |
| Functions | 90% | Currently at 91% |
| Lines | 90% | Currently at 98% |

**Mobile app testing strategy:** Since the Capacitor wrapper is thin (mostly WebView + native plugins), the primary test layer is the Angular web suite. Native Android tests cover only platform-specific plugin usage (camera, notifications, file storage, etc.).

**What TO test on mobile/Android:**

- **Native plugin integration**: Camera capture, notification handling, file system access
- **Capacitor bridge calls**: Ensuring correct method names and argument marshalling
- **Deep link intent handling**: Payment return URLs, task notifications
- **Platform-specific behavior**: Android permissions, lifecycle events

---

## General Rules

1. **Every code change must include a corresponding unit test**
2. **Run only the specific test related to your change**, not the full suite
3. **Same code path for test and production** — mock at dependency boundaries, not inside business logic
4. **Same DB engine** — never use SQLite to test PostgreSQL code
5. **If two code paths exist, both must be tested** — a `t.Skip()` is a red flag
