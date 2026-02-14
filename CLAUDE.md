# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## UI/UX Issue Investigation (CRITICAL - ALWAYS FOLLOW)

**MANDATORY**: When the user asks about UI/UX behavior, visual bugs, or app navigation issues, follow this order:

1. **Check the device first** — Use `adb` to interact with the running app
   - `adb devices` to confirm a device/emulator is connected
   - `adb shell screencap` / `adb exec-out screencap -p > screenshot.png` to capture current state
   - `adb shell uiautomator dump` to inspect the UI hierarchy
   - `adb shell input` to tap, swipe, or type to reproduce the issue
   - `adb shell am start` to launch activities or deep links
2. **Check logs** — `adb logcat` filtered to the app package for runtime errors
3. **Check the code** — Only after understanding the actual device behavior

**Why**: UI/UX issues are best understood by observing the real app. Code reading alone can miss runtime state, timing, and visual layout problems.

## Stack Overflow API Access

**Stack Overflow and Stack Exchange content can be accessed programmatically via the official Stack Exchange API.**

### Official API Endpoint

```bash
https://api.stackexchange.com/2.2/
```

### Common Use Cases

**Fetch a specific question with body:**
```bash
curl -s "https://api.stackexchange.com/2.2/questions/{question_id}?site=stackoverflow&filter=withbody" | jq
```

**Fetch answers for a question:**
```bash
curl -s "https://api.stackexchange.com/2.2/questions/{question_id}/answers?site=stackoverflow&filter=withbody&sort=votes" | jq
```

**Example:**
```bash
# Get question 76823978 with body
curl -s "https://api.stackexchange.com/2.2/questions/76823978?site=stackoverflow&filter=withbody" | jq -r '.items[0].body'

# Get all answers sorted by votes
curl -s "https://api.stackexchange.com/2.2/questions/76823978/answers?site=stackoverflow&filter=withbody&sort=votes" | jq -r '.items[].body'
```

### Alternative Tools

**Python:**
- `stackapi` package - Python binding to StackExchange APIs
- `beautifulsoup4` + `requests` - For HTML scraping

**Node.js:**
- `crawlee` - Web scraping and browser automation framework

**CLI:**
- Stack Overflow CLI search tools available via npm/pip

### Why Use the API

- **No web scraping needed** - Official, reliable access
- **Rate limits** - Free tier: 300 requests/day (no auth), 10,000/day (with auth)
- **Structured data** - Clean JSON responses
- **No parsing** - Pre-formatted content

**Reference:** [Stack Exchange API Documentation](https://api.stackexchange.com/docs)

## Project Overview

Viecz is a multi-package project containing:

- **@viecz/android** (`android/`) - Native Kotlin Android application using Jetpack Compose
- **@viecz/server** (`server/`) - Go backend with comprehensive test coverage

**Current Status**: Active development on Go backend and Android app

## Technical Documentation (CRITICAL - ALWAYS FOLLOW)

**Location:** `docs/technical/`

**MANDATORY**: Always consult the technical docs in `docs/technical/` for context before working on tasks. These docs contain up-to-date information about the system architecture, API endpoints, data models, algorithms, security, deployment, and user flows.

### When to Read

- **Before implementing a feature** — check relevant docs for existing patterns, models, and endpoints
- **Before debugging** — understand the architecture and data flow from the docs
- **When onboarding to an unfamiliar area** — read the relevant doc before diving into code

### When to Update

- **After adding/modifying API endpoints** — update `API_REFERENCE.md`
- **After adding/modifying database models** — update `DATA_STRUCTURE.md`
- **After changing architecture or package structure** — update `ARCHITECTURE.md` and/or `SYSTEM_DESIGN.md`
- **After adding/modifying user-facing flows** — update `USER_FLOW.md`
- **After changing business logic or algorithms** — update `ALGORITHM.md`
- **After changing auth, security, or middleware** — update `SECURITY.md`
- **After changing deployment, Docker, or infra config** — update `DEPLOYMENT.md`

### Document Index

| Document | Content |
|----------|---------|
| `SYSTEM_DESIGN.md` | High-level architecture, tech stack, patterns |
| `ARCHITECTURE.md` | Go backend layers, Android MVVM, ER diagram, service dependencies |
| `DATA_STRUCTURE.md` | 9 GORM models, schemas, relationships |
| `API_REFERENCE.md` | 32 REST endpoints + WebSocket |
| `USER_FLOW.md` | Auth, task, payment, chat flows |
| `ALGORITHM.md` | JWT, escrow, WebSocket routing, wallet, available balance validation |
| `SECURITY.md` | JWT auth, bcrypt, CORS, PayOS verification |
| `DEPLOYMENT.md` | Docker Compose, Cloudflare tunnel, Android flavors |
| `README.md` | Index and navigation guide |

## YouTrack Project Management

**Main Project**: "khởi nghiệp sinh viên" (Project Key: **KNS**)
- This is the primary YouTrack project for Viecz development
- Use KNS project key when creating issues, tracking tasks, and logging work
- YouTrack Instance: https://youtrack.fishcmus.io.vn

### YouTrack Workflow (MANDATORY - ALWAYS FOLLOW)

**CRITICAL RULE**: Before starting any task or bug fix, create a YouTrack issue FIRST.

**Workflow**:
1. User requests a task or reports a bug
2. **Create YouTrack issue** (concise format)
3. Get issue ID (e.g., KNS-4)
4. Update issue to "In Progress"
5. Do the work
6. Add comment with results
7. Update issue to "Done"
8. Log work time

**Example**:
```
User: "Add JWT authentication"
→ Create KNS-4: "Implement JWT authentication"
→ Update to "In Progress"
→ Write code
→ Add comment: "Added JwtFilter + SecurityConfig"
→ Update to "Done"
→ Log 4h of work
```

**Why**: All work must be tracked for team visibility and project management.

### YouTrack Writing Guidelines (CRITICAL - ALWAYS FOLLOW)

**IMPORTANT**: YouTrack issues are visible to multiple users (team members). Follow these rules:

1. **Privacy**: NEVER include personal information
   - ❌ Emails, phone numbers, addresses
   - ❌ Passwords, tokens, API keys
   - ❌ Local directory paths with usernames (e.g., `~/username/...`)
   - ✅ Use generic paths instead (e.g., `server/` or `project root`)
2. **Writing Style**: Use concise, technical documentation style
   - Brief summaries and descriptions
   - Bullet points over paragraphs
   - Technical facts, not lengthy explanations
   - No one wants to read long documents in issue trackers
3. **Exceptions** (when to write detailed content):
   - Bug logging data (stack traces, error logs, reproduction steps)
   - When explicitly asked to write long and detailed content
4. **Format**:
   - Summary: 1 line, clear and actionable
   - Description: Brief overview + bullet points
   - Use Markdown for code blocks and lists
   - Link to external docs if needed

**Example - Good (Concise)**:
```
Summary: Implement JWT authentication middleware
Description:
- Add JWT validation middleware
- Configure Gin routes with auth middleware
- Validate Bearer tokens from Authorization header
- Tech: golang-jwt/jwt v5, Gin framework
```

**Example - Bad (Too verbose)**:
```
Summary: We need to implement authentication
Description: In this task, we will be implementing a comprehensive
authentication system that will allow users to log in and access
protected resources. First, we'll create a filter that intercepts
HTTP requests and checks for the presence of a JWT token... [500 words]
```

### Other Available Projects:
- **FISHcmus (FIS)** - Team project
- **personal management (PM)** - Personal tasks
- **gothel (IT)** - IT project
- **financial (FIN)** - Financial tracking

## Project Structure

```
viecz/
├── android/              # Native Kotlin Android app
│   ├── app/              # Main application module
│   ├── gradle/           # Gradle wrapper and version catalog
│   └── build.gradle.kts
├── server/               # Go backend
│   ├── cmd/              # Application entrypoints
│   ├── internal/         # Private application code
│   │   ├── handlers/     # HTTP handlers
│   │   ├── services/     # Business logic
│   │   ├── repository/   # Data access layer
│   │   ├── models/       # Data models
│   │   └── middleware/   # HTTP middleware
│   ├── go.mod
│   └── go.sum
└── CLAUDE.md
```

## Naming Conventions

### Android Naming Conventions

**Project Name** (settings.gradle.kts):
```kotlin
rootProject.name = "vieczandroid"  // ✅ Lowercase, no separators (Android style)
```

**Package & Application ID**:
```kotlin
namespace = "com.viecz.vieczandroid"
applicationId = "com.viecz.vieczandroid"  // ⚠️ NEVER change after publishing!
```

**Rules**:
- ✅ Application ID: lowercase letters, numbers, dots (`.`), underscores (`_`) only
- ❌ NO dashes allowed in Application ID (Android restriction)
- ❌ NEVER change applicationId after Play Store publishing
- ✅ Package names: lowercase with dots
- ✅ Class names: PascalCase (e.g., `MainActivity`)
- ✅ Variables/methods: camelCase

**File Naming**:
```
✅ MainActivity.kt          (PascalCase for Kotlin files)
✅ activity_main.xml        (snake_case for resources)
✅ ic_launcher.png          (snake_case for resources)
✅ strings.xml              (snake_case for resources)
```

### Go Backend Naming Conventions

**Package Names**:
```go
package handlers  // ✅ lowercase, no underscores
package services
package models
```

**File Names**:
```
✅ user_handler.go          (snake_case)
✅ payment_service.go       (snake_case)
✅ wallet_test.go          (snake_case with _test suffix)
```

**Identifiers**:
```go
// Exported (public) - PascalCase
type UserService struct { }
func CreateUser() { }

// Unexported (private) - camelCase
type userRepository struct { }
func validateEmail() { }
```

### Documentation References

- [Android Package Name vs Application ID](https://www.geeksforgeeks.org/android/android-package-name-vs-application-id/)
- [Android Naming Conventions Best Practices](https://halilozel1903.medium.com/naming-conventions-in-android-development-best-practices-for-cleaner-code-14c843bbc8a7)
- [Effective Go - Naming](https://golang.org/doc/effective_go#names)

## Development Commands

### Android Development Commands

Navigate to the Android app directory:

```bash
cd android
```

**CRITICAL**: The user uses an IDE (Android Studio/IntelliJ IDEA) for Android development, which runs its own Gradle daemon. **NEVER** restart the Gradle daemon unless explicitly instructed. Avoid using `./gradlew --stop` or any commands that would kill the daemon.

#### Product Flavors

The project uses two product flavors:
- **`dev`** — Points to localhost test server (`http://10.0.2.2:9999/api/v1/`), app name "Viecz Dev", separate applicationId (`.dev` suffix)
- **`prod`** — Points to production server, app name "Viecz"

Build variants: `devDebug`, `devRelease`, `prodDebug`, `prodRelease`

#### Building and Running

```bash
# Build dev debug APK (local test server)
./gradlew assembleDevDebug

# Build prod debug APK (production server)
./gradlew assembleProdDebug

# Build prod release APK
./gradlew assembleProdRelease

# Install dev debug on emulator (for local development)
./gradlew installDevDebug

# Install prod debug on device
./gradlew installProdDebug

# Full build with tests
./gradlew build
```

#### Dev Workflow (Local Development)

**For Emulator:**
```bash
# 1. Start test server on host machine
cd server && CGO_ENABLED=1 go build -o bin/testserver ./cmd/testserver && ./bin/testserver

# 2. Build and install dev APK on emulator
cd android && ./gradlew installDevDebug

# App shows "Viecz Dev", talks to localhost:9999, mock PayOS auto-completes deposits
# Both "Viecz Dev" and "Viecz" can coexist on the same device
```

**For Physical Device:**
```bash
# 1. Start test server on host machine
cd server && CGO_ENABLED=1 go build -o bin/testserver ./cmd/testserver && ./bin/testserver

# 2. Set up port forwarding (CRITICAL for physical devices)
adb reverse tcp:9999 tcp:9999

# 3. Build and install dev APK on device
cd android && ./gradlew installDevDebug

# App connects to test server via forwarded port 9999
# Verify forwarding: adb reverse --list
```

#### Testing

```bash
# Run unit tests (dev flavor)
./gradlew testDevDebugUnitTest

# Run instrumented tests on connected device (dev flavor)
./gradlew connectedDevDebugAndroidTest

# Run all tests
./gradlew testDevDebugUnitTest connectedDevDebugAndroidTest
```

#### E2E Testing (CRITICAL - ALWAYS FOLLOW)

**MANDATORY**: When you need to run or update E2E tests, ALWAYS read the E2E testing guide first:

```
android/E2E_TESTING_GUIDE.md
```

**Key rules**:
- E2E tests are **Gradle instrumented tests**, NOT manual ADB/claudtest — run them via `./gradlew connectedDevDebugAndroidTest`
- All E2E test classes are in `android/app/src/androidTest/java/com/viecz/vieczandroid/e2e/`
- All E2E scenario definitions are in `android/e2escenarios/` (one file per scenario)
- Tests use `@E2ETest` annotation with Compose test rules (`waitUntil`, `performClick`, etc.)
- `BaseE2ETest` tests use a mock server (no external dependencies)
- `RealServerBaseE2ETest` tests (e.g., `S13_FullJobLifecycleE2ETest`) require the Go test server running on port 9999
- For LazyColumn scrolling in tests, use `performScrollToNode()` on the scrollable container — `performScrollTo()` does NOT work for off-screen LazyColumn items

**Do NOT** use manual ADB claudtest for E2E scenarios that are already covered by instrumented tests.

**E2E Test Naming Convention** (CRITICAL - ALWAYS FOLLOW):
- All E2E test files MUST use the `S<number>_<Name>E2ETest.kt` format
- `<number>` is the primary scenario number (01, 02, 04, 06, 08, 13, 14, 15)
- Use two-digit zero-padded numbers (e.g., `S01_`, not `S1_`)
- Class name MUST match the file name (e.g., `class S01_AuthFlowE2ETest`)
- Examples:
  - `S01_AuthFlowE2ETest.kt` — Scenarios 1, 2 (auth flow)
  - `S04_BrowseTasksE2ETest.kt` — Scenarios 4, 5, 7 (browse)
  - `S13_FullJobLifecycleE2ETest.kt` — Scenario 13 (full lifecycle)
- Base classes (`BaseE2ETest`, `RealServerBaseE2ETest`, `E2ETest`) do NOT use the `S<number>_` prefix
- When creating new E2E tests, assign the next available scenario number

**MANDATORY — Dev Server & Log Checking**:
- **Always start the Go test server** before running E2E tests:
  ```bash
  cd server && CGO_ENABLED=1 go build -o bin/testserver ./cmd/testserver && ./bin/testserver
  ```
  Verify it's running: `curl -s http://localhost:9999/api/v1/health`
- **When a test fails or a bug occurs**, ALWAYS check logs from **both** sides:
  1. **Server logs**: `cat /tmp/testserver.log` or check the terminal running the test server — look for 500 errors, panics, SQL errors, WebSocket failures
  2. **App logs**: `adb logcat -d --pid=$(adb shell pidof com.viecz.vieczandroid.dev) | tail -100` — look for network errors, HTTP status codes, crash stack traces
- **Never guess at the root cause** — read the logs first. Many test failures (e.g., chat, wallet, task operations) are caused by server-side errors that are invisible from the UI alone.

**MANDATORY — Physical Device Port Forwarding & Test Server Host**:
- **Always use `adb reverse` to connect physical devices to the test server**
- Physical devices cannot reach `10.0.2.2` — they need port forwarding
- **Before running E2E tests on a physical device**, run:
  ```bash
  adb reverse tcp:9999 tcp:9999
  ```
- **CRITICAL**: `RealServerRule` defaults to `10.0.2.2` (emulator-only). For physical devices, you MUST pass `testServerHost=localhost`:
  ```bash
  # Emulator (default — no extra args needed):
  ./gradlew connectedDevDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=<TestClass>

  # Physical device (MUST add testServerHost):
  ./gradlew connectedDevDebugAndroidTest \
    -Pandroid.testInstrumentationRunnerArguments.class=<TestClass> \
    -Pandroid.testInstrumentationRunnerArguments.testServerHost=localhost
  ```
- Without `testServerHost=localhost`, real-server tests silently fail (no API requests reach the server, registration/login times out)
- Verify forwarding: `adb reverse --list`
- Remove forwarding: `adb reverse --remove tcp:9999`
- **Emulators do NOT need `adb reverse` or `testServerHost`** — they reach `10.0.2.2:9999` directly

#### Code Quality

```bash
# Run lint checks
./gradlew lint

# Kotlin code style check (if configured)
./gradlew ktlintCheck

# Kotlin code style format (if configured)
./gradlew ktlintFormat
```

#### Maintenance

```bash
# Clean build artifacts (uses existing daemon)
./gradlew clean

# Refresh dependencies (uses existing daemon)
./gradlew --refresh-dependencies

# List all available Gradle tasks
./gradlew tasks
```

#### IDE Integration

When the IDE is running, prefer using IDE commands over terminal:
- **Sync**: File → Sync Project with Gradle Files (or toolbar button)
- **Build**: Build → Rebuild Project
- **Run Tasks**: Gradle Tool Window → Double-click task

All Gradle commands use the existing daemon - no restart needed.

## Working Directory

### Android Development
- Primary location: `android/`
- **Language**: Kotlin
- **UI Framework**: Jetpack Compose
- **Build System**: Gradle with Kotlin DSL
- **Navigation**: Jetpack Navigation Compose
- **Architecture**: MVVM with ViewModel and StateFlow
- **Dependency Injection**: Hilt (if configured)
- **Minimum SDK**: 30 (Android 11)
- **Target SDK**: 36 (Android 15)
- **Java/Kotlin Target**: JVM 21

#### Key Technologies
- Jetpack Compose for declarative UI
- Material Design 3 components
- Kotlin Coroutines for async operations
- StateFlow/Flow for state management
- Navigation Compose for screen navigation
- View Binding enabled for legacy XML layouts (transitioning to Compose)

#### Architecture Patterns
- **UI Layer**: Composable functions with state hoisting
- **ViewModel Layer**: Business logic and state management
- **Data Layer**: Repository pattern for data access
- **Dependency Injection**: Constructor injection with Hilt
- **Reactive Streams**: StateFlow/SharedFlow for reactive data

### Go Backend Development
- Primary location: `server/`
- **Language**: Go 1.21+
- **Framework**: Gin web framework
- **Database**: PostgreSQL with GORM ORM
- **Package**: `viecz.vieczserver`
- **Testing**: Comprehensive unit tests with ~70%+ coverage

#### Key Technologies
- Gin for HTTP routing and middleware
- GORM for ORM and database migrations
- golang-jwt/jwt for JWT authentication
- Gorilla WebSocket for real-time chat
- PayOS integration for payments
- SQLite in-memory for fast testing

#### Architecture Patterns
- **Handler Layer**: HTTP endpoints using Gin
- **Service Layer**: Business logic
- **Repository Layer**: GORM-based data access (interface + implementation pattern)
- **Models**: Data structures with validation and GORM hooks
- **Middleware**: JWT authentication, logging, CORS
- **WebSocket**: Real-time messaging with private channels

#### Running the Server

```bash
cd server

# Run the production server (requires PostgreSQL + .env)
go run cmd/server/main.go

# Run tests
go test ./...

# Run tests with coverage
go test -v -cover ./...

# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

#### Test Server (Development/E2E)

A standalone test server for local development and E2E testing. Uses SQLite in-memory (no PostgreSQL needed) with mock PayOS (auto-completes deposits via internal webhook).

```bash
cd server

# Build the test server (requires CGO for SQLite)
CGO_ENABLED=1 go build -o bin/testserver ./cmd/testserver

# Run the test server
./bin/testserver
```

**Test server details:**
- **Source**: `server/cmd/testserver/main.go`
- **Port**: 9999 (hardcoded)
- **URL**: `http://localhost:9999`
- **Database**: SQLite in-memory (fresh on each start)
- **JWT Secret**: `e2e-test-secret-key` (hardcoded)
- **PayOS**: Mock mode — `CreatePaymentLink` auto-fires webhook to credit wallet after 100ms
- **Seed data**: Categories + test user (see `database/seed.go`)
- **Health check**: `GET /api/v1/health`
- **Routes**: Mirrors all production routes from `cmd/server/main.go`
- **Use case**: Local Android development, E2E tests (`scripts/run-full-e2e.sh`), manual API testing

**When to use which server:**
- **Production server** (`cmd/server/main.go`): Requires PostgreSQL, real PayOS keys, `.env` file
- **Test server** (`cmd/testserver/main.go`): Zero external dependencies, instant startup, auto-resets on restart

### Shared UI Components (Not Yet Implemented)
- Planned location: `packages/ui/`
- Will contain reusable UI components shared across packages
- Currently placeholder only

## Adding Dependencies

### Using Version Catalog (Recommended)

The project uses Gradle Version Catalogs (`gradle/libs.versions.toml`) for centralized dependency management.

1. Add version in `[versions]` section:
```toml
[versions]
retrofit = "2.9.0"
```

2. Add library in `[libraries]` section:
```toml
[libraries]
retrofit = { group = "com.squareup.retrofit2", name = "retrofit", version.ref = "retrofit" }
```

3. Use in `app/build.gradle.kts`:
```kotlin
dependencies {
    implementation(libs.retrofit)
}
```

### Direct Dependencies

Alternatively, add dependencies directly in `app/build.gradle.kts`:

```kotlin
dependencies {
    // Implementation dependency
    implementation("androidx.compose.ui:ui:1.5.0")

    // Debug-only dependency
    debugImplementation("androidx.compose.ui:ui-tooling:1.5.0")

    // Test dependency
    testImplementation("junit:junit:4.13.2")

    // Android instrumented test dependency
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
}
```

### Sync Dependencies

After modifying dependencies, sync Gradle:

```bash
cd android
./gradlew --refresh-dependencies
```

## Server Deployment to sg (CRITICAL - ALWAYS FOLLOW)

**MANDATORY**: Do NOT use Docker or git push/pull for deploying server fixes. Use direct binary deployment:

```bash
# 1. Cross-compile for Linux on local machine
cd server && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bin/server-linux ./cmd/server

# 2. Rsync binary to sg
rsync -avz bin/server-linux baremetal-sg-ks3:~/nhannht-projects/viecz/server/bin/

# 3. SSH to sg and restart the server
ssh baremetal-sg-ks3 "sudo systemctl restart viecz-server"
# OR if running manually:
ssh baremetal-sg-ks3 "pkill -f server-linux; cd ~/nhannht-projects/viecz && nohup ./server/bin/server-linux > /tmp/viecz-server.log 2>&1 &"
```

**Why**: Faster iteration — no Docker rebuild (~90s), no git push/pull round-trip. Just build + rsync + restart.

**Server details**: See `sg` in global CLAUDE.md (SSH: `baremetal-sg-ks3`, IP: 139.99.69.32)

## Project Status

- ✅ **Android app** - Native Kotlin with Jetpack Compose (Active development)
- ✅ **Go Backend** - Fully implemented with ~70%+ test coverage (Production ready)
  - Authentication & JWT
  - Payment processing (PayOS integration)
  - Wallet & transaction management
  - Task management system
  - Real-time messaging (WebSocket)
  - User profiles & categories
- ⏳ **Shared UI component library** - Planned, not yet implemented
- ❌ **iOS app** - Not planned (Android-only)
- ❌ **Web app** - Not planned (Android-only)

## Claudtest - ADB-Based Device Interaction Testing (CRITICAL - ALWAYS FOLLOW)

**Claudtest** is automated E2E-style testing on a real Android device via ADB. Optimized for speed: **batch commands, minimize screenshots, visual coordinate estimation**.

### Speed Principles

1. **Batch ADB commands** — Each `adb shell` call has ~100-200ms overhead. Chain multiple commands in one call.
2. **Screenshot only when needed** — Only at start of a new screen and for final verification. NOT between every action.
3. **Visual estimation over uiautomator dump** — Claude reads screenshots and estimates coordinates. `uiautomator dump` takes 1-3s; use it only as fallback.
4. **Minimal sleeps** — Use `sleep 0.5` between UI actions, `sleep 1-2` only after network calls or screen transitions.
5. **Cache screen dimensions** — Query `wm size` once at session start, reuse for all coordinate math.

### Batching Commands (CRITICAL for Speed)

```bash
# BAD — 4 separate adb calls (~600ms overhead)
adb shell input tap 380 690
adb shell input text "test@example.com"
adb shell input tap 380 820
adb shell input text "password123"

# GOOD — 1 adb call (~150ms overhead)
adb shell "input tap 380 690; sleep 0.3; input text 'test@example.com'; input tap 380 820; sleep 0.3; input text 'password123'"

# GOOD — batch tap + type + tap in one shell
adb shell "input tap 380 690 && sleep 0.3 && input text 'test@example.com' && input tap 380 820 && sleep 0.3 && input text 'password123' && input tap 380 950"
```

### Core Loop

1. **Setup once** — Get screen size, launch app
   ```bash
   adb shell wm size          # Cache this: e.g., 1080x2400 -> center x=540
   adb shell am start -n <package>/<activity>
   sleep 2
   ```

2. **Screenshot** — Only when entering a new screen
   ```bash
   adb exec-out screencap -p > /tmp/screen.png
   ```
   Claude reads visually, estimates all element coordinates at once.

3. **Batch actions** — All interactions for this screen in one `adb shell` call
   ```bash
   adb shell "input tap 540 690; sleep 0.3; input text 'user@test.com'; input tap 540 820; sleep 0.3; input text 'pass123'; input tap 540 950"
   sleep 1  # wait for navigation
   ```

4. **Verify** — Screenshot the result screen
   ```bash
   adb exec-out screencap -p > /tmp/result.png
   ```

### When to Use uiautomator dump (Fallback Only)

- **Small icons close together** — need precise bounds
- **Visual estimation failed** — tapped wrong element twice
- **Need resource-id** — for programmatic assertions

```bash
adb shell uiautomator dump /sdcard/ui.xml && adb pull /sdcard/ui.xml /tmp/ui.xml
```

### When to Use Claudtest

- Verifying a UI/UX fix on the real device after code changes
- Reproducing a user-reported bug by following their steps
- Testing a full user flow (register -> login -> navigate -> perform action)
- The user asks to "test it on the device" or "try it on the phone"

### Example: Fast Login Flow

```bash
# Setup (once per session)
adb shell wm size  # 760x1580 -> center x=380

# Launch
adb shell am start -n com.viecz.vieczandroid.dev/com.viecz.vieczandroid.MainActivity
sleep 2

# Screenshot — Claude reads it, estimates ALL coordinates at once
adb exec-out screencap -p > /tmp/login.png
# Claude sees: Email ~y=690, Password ~y=820, Login button ~y=950

# Batch all login actions in ONE adb call
adb shell "input tap 380 690; sleep 0.3; input text 'test@example.com'; input tap 380 820; sleep 0.3; input text 'password123'; input tap 380 950"
sleep 2

# Verify — one final screenshot
adb exec-out screencap -p > /tmp/home.png
```

**Old approach**: 7+ adb calls, 3 screenshots, ~8s overhead
**New approach**: 3 adb calls, 2 screenshots, ~3s overhead

### Important Rules

- **Batch commands** — always chain actions in one `adb shell` call when possible
- **Screenshot only at screen transitions** — not between every tap
- **Visual estimation first** — ~10-20px tolerance is fine for buttons
- **`sleep 0.3`** between UI actions within a batch, **`sleep 1-2`** only after network/navigation
- **Fall back to uiautomator dump** only when visual estimation fails twice
- **Check logcat** when interactions don't produce expected results
- **Report results** with screenshots so the user can see what happened
- Claudtest is for **verification and debugging**, not a replacement for unit tests

