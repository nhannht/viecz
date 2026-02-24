# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Serena MCP Tool Priority (CRITICAL - ALWAYS FOLLOW)

**MANDATORY**: Serena is a passive tool — it only activates when explicitly called. You MUST proactively use Serena's semantic tools for code work. Never default to raw file reads when Serena can do it better.

### Decision Matrix: When to Use Which Tool

| Task | Use This | NOT This | Why |
|---|---|---|---|
| Understand a file's structure | `mcp__serena__get_symbols_overview` | `Read` entire file | ~90% fewer tokens, semantic view |
| Find a class/function by name | `mcp__serena__find_symbol` | `Grep` for name | LSP-aware, understands scope/nesting |
| Find all callers of a function | `mcp__serena__find_referencing_symbols` | `Grep` for function name | Cross-file LSP references, not text match |
| Replace an entire function/method | `mcp__serena__replace_symbol_body` | `Edit` with full body | Knows exact symbol boundaries |
| Add new code next to existing | `mcp__serena__insert_before/after_symbol` | Manual line counting | Structural insertion, no line numbers needed |
| Rename a symbol across codebase | `mcp__serena__rename_symbol` | Find-and-replace | LSP refactoring, handles all references correctly |
| Search with regex across files | `mcp__serena__search_for_pattern` | `Grep` | Better file filtering (code-only, globs) |
| Edit 3 lines inside a big function | Claude Code `Edit` | `replace_symbol_body` | Surgical edit, don't reproduce entire body |
| Read config/YAML/non-code files | Claude Code `Read` | Serena tools | No LSP intelligence for non-code |
| Run commands / shell ops | Claude Code `Bash` | N/A | Serena has no shell in claude-code context |

### Standard Code Exploration Workflow

1. **Overview first**: `get_symbols_overview(file, depth=1)` to see all symbols in a file
2. **Drill down**: `find_symbol(name, include_body=True)` only for the specific symbol you need
3. **Trace usage**: `find_referencing_symbols(name, file)` to understand call graph
4. **Edit precisely**: `replace_symbol_body` for whole symbols, Claude Code `Edit` for small patches

### Key Rules

- **ALWAYS call `get_symbols_overview` before reading any code file** — understand structure first, read bodies second
- **ALWAYS use `find_referencing_symbols`** before renaming or changing a symbol's signature — check what depends on it
- **Use `find_symbol` with `include_body=False` first**, then `include_body=True` only for the specific symbol you need
- **Pass `relative_path`** whenever possible — restricts search scope, faster results, fewer tokens
- **`find_referencing_symbols` requires a file path**, not a directory — use `find_symbol` first if you don't know the file
- **No cross-language references** — Go LSP won't find TypeScript references and vice versa

### Serena Memories

Serena has persistent cross-session memories in `.serena/memories/`. At session start, check if relevant memories exist before starting work:
- `mcp__serena__list_memories()` to see available knowledge
- `mcp__serena__read_memory(name)` to load relevant context
- `mcp__serena__write_memory(name, content)` to save new learnings

Current memories: `project_overview`, `suggested_commands`, `architecture/go_backend`, `architecture/angular_web`, `conventions/go_style`, `conventions/angular_style`, `task_completion_checklist`, `gotchas`

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
- **@viecz/web** (`web/`) - Angular 21 web client with SSR and Material Design 3

**Current Status**: Active development on Go backend, Android app, and web client

## Technical Documentation (CRITICAL - ALWAYS FOLLOW)

**Location:** `docs/technical/`

**MANDATORY**: Always consult the technical docs in `docs/technical/` for context **before** working on tasks, and always update them **after** making code changes. These docs must stay in sync with the codebase — outdated docs are worse than no docs.

### When to Read

- **Before implementing a feature** — check relevant docs for existing patterns, models, and endpoints
- **Before debugging** — understand the architecture and data flow from the docs
- **Before writing or running tests** — read `TESTING.md` for coverage targets, platform commands, and test patterns
- **When onboarding to an unfamiliar area** — read the relevant doc before diving into code

### When to Update

- **After adding/modifying API endpoints** — update `API_REFERENCE.md`
- **After adding/modifying database models** — update `DATA_STRUCTURE.md`
- **After changing architecture or package structure** — update `ARCHITECTURE.md` and/or `SYSTEM_DESIGN.md`
- **After adding/modifying user-facing flows** — update `USER_FLOW.md`
- **After changing business logic or algorithms** — update `ALGORITHM.md`
- **After changing auth, security, or middleware** — update `SECURITY.md`
- **After changing deployment, Docker, or infra config** — update `DEPLOYMENT.md`
- **After changing test patterns, coverage targets, or test infrastructure** — update `TESTING.md`
- **After updating any technical doc** — update the Document Index table in this `CLAUDE.md` if the doc's content scope changed

### Document Index

| Document | Content |
|----------|---------|
| `SYSTEM_DESIGN.md` | High-level architecture, tech stack, patterns, web client overview |
| `ARCHITECTURE.md` | Go backend layers, Android MVVM, Angular web client, ER diagram, service dependencies |
| `DATA_STRUCTURE.md` | 11 GORM models, schemas, relationships |
| `API_REFERENCE.md` | 43 REST endpoints + WebSocket |
| `USER_FLOW.md` | Auth, task, payment, chat flows (Android + Web) |
| `ALGORITHM.md` | JWT, escrow, WebSocket routing, wallet, available balance validation |
| `SECURITY.md` | JWT auth, bcrypt, CORS, PayOS verification, web client token storage |
| `DEPLOYMENT.md` | Docker Compose, Cloudflare tunnel, Android flavors, web client build |
| `FIREBASE_DISTRIBUTION.md` | Firebase App Distribution workflow, tester management |
| `SECURITY_AUDIT_2026_02_20.md` | Full repository security audit: 6 CRITICAL, 7 HIGH, 14 MEDIUM, 10 LOW |
| `ASCII_ART_SVG.md` | Image → colored ASCII art SVG pipeline, canvas glitch effects |
| `DESIGN_SYSTEM.md` | nhannht-metro-meow design system: tokens, components, Tailwind 4 mapping |
| `WEB_MIGRATION.md` | Migration guide: Angular Material → Tailwind 4 + Storybook |
| `UI_COMPONENT_CATALOG.md` | Full API reference: 28 shared components + 1 service, inputs/outputs, usage examples |
| `UI_PATTERNS.md` | Page-level UI patterns: four-state rendering, forms, layout, navigation, feedback, data display |
| `UI_RESPONSIVE.md` | Responsive design: breakpoints, grid strategies, container widths, mobile behavior |
| `UI_ACCESSIBILITY.md` | Accessibility audit: ARIA per component, known gaps, keyboard nav, testing tools |
| `UI_PLATFORM_PARITY.md` | Android vs Web: screen-by-screen comparison, navigation, design language |
| `UI_ANIMATION.md` | Animation patterns: duration scale, hover effects, loading animations, guidelines |
| `TESTING.md` | Testing standards: tiered coverage targets (75% business logic, 50% data layer), platform commands, patterns |
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
> Don't expose other project in youtrack except this one

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
├── web/                  # Angular web client
│   ├── src/app/          # Angular components, services, routes
│   │   ├── core/         # Singleton services (auth, task, wallet, chat, etc.)
│   │   ├── shared/       # Reusable UI components
│   │   └── environments/ # Dev/prod environment configs
│   ├── angular.json
│   └── package.json
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
docker compose -f docker-compose.testdb.yml up -d && cd server && go build -o bin/testserver ./cmd/testserver && ./bin/testserver

# 2. Build and install dev APK on emulator
cd android && ./gradlew installDevDebug

# App shows "Viecz Dev", talks to localhost:9999, mock PayOS auto-completes deposits
# Both "Viecz Dev" and "Viecz" can coexist on the same device
```

**For Physical Device:**
```bash
# 1. Start test server on host machine
docker compose -f docker-compose.testdb.yml up -d && cd server && go build -o bin/testserver ./cmd/testserver && ./bin/testserver

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

**E2E Test Writing Rules (Learned from Mistakes)**:
- **ALWAYS `performScrollToNode` before clicking anything in a LazyColumn** — never assume an element is visible on-screen. Tablets and phones have different screen sizes; a button visible on one device may be off-screen on another. Apply this to ALL screens: CreateTask form, TaskDetail, Profile, etc.
  ```kotlin
  // BAD — assumes button is on-screen
  composeRule.onNodeWithText("Create Task").performClick()

  // GOOD — scrolls to it first
  composeRule.onAllNodes(hasScrollToNodeAction()).onFirst()
      .performScrollToNode(hasText("Create Task"))
  composeRule.onNodeWithText("Create Task").performClick()
  ```
- **Use `waitUntil` + `performClick` instead of `assertIsDisplayed`** for elements that load asynchronously (e.g., TopAppBar actions that depend on API response)
  ```kotlin
  // BAD — may fail if element exists but isn't "displayed" yet
  composeRule.onNodeWithContentDescription("Delete Task").assertIsDisplayed()

  // GOOD — waits for it to appear in semantics tree
  composeRule.waitUntil(timeoutMillis = 10000) {
      composeRule.onAllNodes(hasContentDescription("Delete Task"))
          .fetchSemanticsNodes().isNotEmpty()
  }
  composeRule.onNodeWithContentDescription("Delete Task").performClick()
  ```
- **Assert server-side truth, not UI cache** — the marketplace list doesn't auto-refresh on back-navigation. Instead of checking if a deleted task disappeared from the list, verify wallet balance, check API response, or navigate to a fresh screen.
- **Reuse battle-tested helpers from S13** — `S13_FullJobLifecycleE2ETest` has working `registerUser`, `loginUser`, `depositFunds`, `createTask`, `navigateToProfileAndLogout` patterns. Copy them instead of rewriting from scratch.

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
- **Always start test PostgreSQL, Meilisearch, and the Go test server** before running E2E tests:
  ```bash
  # 1. Start test PostgreSQL (port 5433) + Meilisearch (port 7700), both tmpfs/RAM-backed
  docker compose -f docker-compose.testdb.yml up -d

  # 2. Build and start the test server
  cd server && go build -o bin/testserver ./cmd/testserver && ./bin/testserver
  ```
  Verify it's running: `curl -s http://localhost:9999/api/v1/health`
  Verify Meilisearch: `curl -s http://localhost:7700/health`
- The test server drops all tables on startup — restart it between test runs for a fresh DB
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
- PostgreSQL for both production and test server (same code path)

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

A standalone test server for local development and E2E testing. Uses PostgreSQL (same engine as production) with mock PayOS (auto-completes deposits via internal webhook) and Meilisearch for full-text search.

```bash
# 1. Start test PostgreSQL (port 5433) + Meilisearch (port 7700), both RAM-backed via tmpfs
docker compose -f docker-compose.testdb.yml up -d

# 2. Build and run the test server
cd server
go build -o bin/testserver ./cmd/testserver
./bin/testserver
```

**Test server details:**
- **Source**: `server/cmd/testserver/main.go`
- **Port**: 9999 (hardcoded)
- **URL**: `http://localhost:9999`
- **Database**: PostgreSQL on port 5433 (`docker-compose.testdb.yml`), tmpfs-backed (RAM), drops all tables on startup
- **Search**: Meilisearch on port 7700, auto-connects on startup, bulk indexes seed tasks
- **JWT Secret**: `e2e-test-secret-key` (hardcoded)
- **PayOS**: Mock mode — `CreatePaymentLink` auto-fires webhook to credit wallet after 100ms
- **Seed data**: Categories + test user (see `database/seed.go`)
- **Health check**: `GET /api/v1/health`
- **Routes**: Mirrors all production routes from `cmd/server/main.go`
- **Use case**: Local Android development, E2E tests (`scripts/run-full-e2e.sh`), manual API testing

**MANDATORY — Meilisearch must always be running for testing:**
- `docker compose -f docker-compose.testdb.yml up -d` starts both PostgreSQL AND Meilisearch
- The test server auto-connects to Meilisearch at `localhost:7700` on startup
- Verify Meilisearch is healthy: `curl -s http://localhost:7700/health`
- If Meilisearch is not running, the test server falls back to PostgreSQL LIKE (but this defeats the purpose of testing search)
- **Always ensure Meilisearch is running** before starting the test server or running E2E tests

**When to use which server:**
- **Production server** (`cmd/server/main.go`): Requires PostgreSQL (port 5432), real PayOS keys, `.env` file. Meilisearch optional via `MEILISEARCH_URL` env var
- **Test server** (`cmd/testserver/main.go`): Requires test PostgreSQL + Meilisearch (`docker compose -f docker-compose.testdb.yml up -d`), mock PayOS, drops/recreates tables on each start

### Web Client Development
- Primary location: `web/`
- **Language**: TypeScript 5.9
- **Framework**: Angular 21 with standalone components
- **UI**: Material Design 3 (`@angular/material`)
- **SSR**: `@angular/ssr` + Express 5
- **Testing**: Vitest 4 via `@angular/build:unit-test`
- **State**: Angular Signals + RxJS
- **Package manager**: Yarn 1.22

#### Running the Dev Server

```bash
cd web
npm start          # ng serve — dev server on http://localhost:4200
                   # Uses proxy.conf.json to forward /api to backend
```

#### Testing (CRITICAL - ALWAYS FOLLOW)

```bash
cd web

# CORRECT — uses Angular builder which injects Vitest globals + TestBed setup
npx ng test        # or: npm test

# WRONG — bypasses Angular builder, causes "describe is not defined" error
# npx vitest run   # ← NEVER use this directly
```

**Why**: Angular's `@angular/build:unit-test` builder wraps Vitest and automatically injects `globals: true`, TestBed initialization, jsdom environment, and zone.js polyfills. Running `vitest` directly skips all of this, causing every test to fail with `ReferenceError: describe is not defined`.

**Rule**: Never run the test runner directly when a framework provides a builder/wrapper. The builder exists because it configures the runner with framework-specific settings.

#### Building for Production

```bash
cd web
npm run build                    # Production build with SSR
npm run serve:ssr:web            # Serve SSR build locally
```

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

## Server Deployment (CRITICAL - ALWAYS FOLLOW)

**MANDATORY**:
1. **ALWAYS ask the user before deploying.** Never deploy without explicit user confirmation.
2. Do NOT use Docker or git push/pull for deploying server fixes. Use direct binary deployment.
3. Do NOT use `sudo` for deployment. Use manual process (pkill + nohup).

```bash
# 1. Cross-compile for Linux on local machine
cd server && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bin/server-linux ./cmd/server

# 2. Rsync binary to production server (see global CLAUDE.md for SSH details)
rsync -avz bin/server-linux <ssh-alias>:<remote-project-path>/server/bin/

# 3. Restart the server (manual — no sudo, no systemctl)
ssh <ssh-alias> "pkill -f server-linux || true"
ssh -f <ssh-alias> "cd <remote-project-path> && nohup ./server/bin/server-linux > /tmp/viecz-server.log 2>&1 &"
```

**Why**: Faster iteration — no Docker rebuild (~90s), no git push/pull round-trip. Just build + rsync + restart.

**Server details**: See `sg` in global CLAUDE.md for SSH alias, IP, and connection details.

## Learned Patterns (Project-Specific)

### Storybook Angular + Compodoc Setup
- **All `@storybook/*` packages must be on the same major version** — Storybook 9 uses CJS, Storybook 10 is ESM-only. Mixing them (e.g., `@storybook/addon-docs@10` with `storybook@9`) causes `ERR_INTERNAL_ASSERTION: Cannot require() ES Module` errors that look like Node.js bugs but are really version mismatches
- **Always check `yarn list --pattern "@storybook"` first** when debugging Storybook module loading errors — version alignment is the #1 cause
- **Compodoc JSDoc placement**: JSDoc must go **before** `@Component()` decorator, not between `})` and `export class`, for compodoc to extract class descriptions
- **Compodoc builder args bug**: The `@storybook/angular` builder's `compodocArgs` in angular.json may not pass arguments correctly. Workaround: set `compodoc: false` in angular.json and run compodoc manually via npm script (`"storybook": "yarn compodoc && ng run web:storybook"`)
- **Don't chase Node.js ESM bugs before checking package versions** — Node v24 has real ESM issues with Storybook (tracked in storybookjs/storybook#31434), but a version mismatch between Storybook packages is far more common and should be ruled out first
- **`@angular/platform-browser-dynamic` is REQUIRED for Storybook Angular** — Without it, components show an infinite loading spinner in the iframe. Webpack builds successfully, sidebar loads, but Angular can't bootstrap any component. This is a runtime dependency, not a build-time one, so the build gives zero hints.

### nhannht-metro-meow UI Design Rules

- **Symmetry first** — The design system is centered and symmetric. Never introduce `text-left` or `justify-start` on hero/landing sections. When in doubt, keep `text-center` and `mx-auto`.
- **Monochrome over color for ASCII art** — Colored ASCII art from image sampling produces low-contrast results against the beige `#f0ede8` background (especially greens/pastels). Use the `--fg` color (`#1a1a1a`) for maximum contrast and consistency. Bonus: dramatically smaller file size.
- **Inline placement > stacked for decorative elements** — A large decorative element (mascot, illustration) stacked on top eats vertical space and pushes content down. Place it inline with the title at a smaller size (~100-120px) to keep the hero compact while still visually present.

### UI Design Collaboration Workflow

When proposing layout or visual changes, follow this workflow:

1. **Print ASCII mockups directly in the terminal** — Use box-drawing characters to show layout options inline in the conversation output. This is fast, requires no tooling, and the user sees options immediately. Example:
   ```
   ┌──────────────────────────────────┐
   │          ┌────────┐              │
   │          │ mascot │  ~100px      │
   │          └────────┘              │
   │   STUDENT MICRO-TASK MARKETPLACE │
   └──────────────────────────────────┘
   ```
2. **Present 2-3 options with mockups** — Use `AskUserQuestion` with `markdown` previews containing ASCII layouts so the user can compare side-by-side in the UI
3. **User picks one** — Apply the chosen option, no wasted work
4. **Take a Playwright screenshot AFTER applying** — Verify the real render matches the mockup. Use screenshots for verification, not for proposing options
5. **Never implement multiple variants in worktrees just to screenshot them** — That's overengineered. ASCII mockups in the terminal are faster and good enough for layout decisions
6. **Keep it simple** — The goal is quick feedback loops. Print mockup → user picks → implement → verify

### Debugging Discipline (Learned from Mistakes)

- **Read terminal warnings during `yarn install` / `npm install`** — "unmet peer dependency" warnings are often the root cause of runtime failures, not just noise. The missing `@angular/platform-browser-dynamic` was printed in every `yarn install` output but was ignored repeatedly.
- **Browser DevTools FIRST for rendering failures** — Storybook's webpack log only shows build/compile errors. If the build succeeds (100%) but components don't render, the error is a **runtime JavaScript error** visible only in the browser console. Always open DevTools before guessing.
- **Correlation is not causation** — "I added package X and it broke" does NOT mean package X broke it. The breakage may have existed before and only became visible. Verify the actual error before reverting changes.
- **Stop guessing, start reading** — Every "quick fix" attempt that fails (clear cache, kill process, revert file, remove package) costs more time than the 30 seconds of reading the actual error message. The debugging loop should be: **observe error → research → understand → fix**, not: **guess → try → fail → guess again**.
- **Never revert working code without understanding why it broke** — Reverting compodoc/addon-docs was wrong because they weren't the cause. The revert wasted multiple cycles and had to be re-applied afterward.

### PayOS Integration Patterns

- **PayOS sends test webhooks when verifying URLs** — When you update the webhook URL in the PayOS dashboard, PayOS sends a test payload with `description: "Ma giao dich thu nghiem"` or `"VQRIO123"`. Your webhook handler must detect these and return `200 OK` **before** signature verification, otherwise PayOS reports "webhook url cua ban khong hoat dong" (your webhook URL is not working). See `webhook.go` lines 55-63.
- **Client-controlled `return_url` over server-side routing** — Instead of fixing server-side return handlers for each platform, let each client send its own `return_url` in the deposit request. Web sends `window.location.origin + "/payment/return"`, Android omits it and falls back to server handler with deep links. This cleanly separates platform concerns.
- **`.env` is NOT loaded when `GO_ENV=production`** — `config.go` skips `godotenv.Load()` in production. Changing `.env` has zero effect on the production server. Use system environment variables or hardcoded defaults instead.

### Infrastructure Routing

- **Go API has no direct public ingress** — The only cloudflared ingress is `viecz.fishcmus.io.vn → localhost:4000` (Angular SSR/Express). The Go server at `localhost:8080` is only reachable through the Express proxy (`/api → localhost:8080`). This means webhook URLs, return URLs, and all external callbacks must use `https://viecz.fishcmus.io.vn/api/v1/...`, not a separate API domain.
- **The old domain `viecz-api-dev.fishcmus.io.vn` is dead** — No cloudflared ingress exists for it. Any PayOS settings (webhook URL, etc.) pointing to this domain must be updated to `viecz.fishcmus.io.vn`.

## Project Status

- ✅ **Android app** - Native Kotlin with Jetpack Compose (Active development)
- ✅ **Go Backend** - Fully implemented with ~70%+ test coverage (Production ready)
  - Authentication & JWT
  - Payment processing (PayOS integration)
  - Wallet & transaction management
  - Task management system
  - Real-time messaging (WebSocket)
  - User profiles & categories
- ✅ **Web client** - Angular 21 with SSR, Material Design 3, full feature parity with Android
  - Auth (login, register, token refresh)
  - Marketplace (browse, search, create/edit tasks)
  - Task applications and escrow flow
  - Wallet (balance, deposit, transaction history)
  - Real-time chat (WebSocket)
  - Profile and notifications
- ⏳ **Shared UI component library** - Planned, not yet implemented
- ❌ **iOS app** - Not planned

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

## Production Deployment Ports (CRITICAL - ALWAYS FOLLOW)

**MANDATORY**: Before restarting any service, check the port it was running on. Never assume default dev ports.

| Service | Production Port | Nginx upstream | Dev Port |
|---------|----------------|----------------|----------|
| Go API server | 8080 | N/A (proxied by Express) | 8080 |
| Web SSR (Express/Node) | **4001** | `127.0.0.1:4001` | 4200 |

### Deployment Commands

```bash
# Go server
pkill -f './server/bin/server-linux' || true
cd /home/ubuntu/nhannht-projects/viecz && nohup ./server/bin/server-linux > /tmp/viecz-server.log 2>&1 &

# Web client — PORT=4001, NOT 4000 or 4200
pkill -f 'node.*dist/web/server/server.mjs' || true
cd /home/ubuntu/nhannht-projects/viecz/web && PORT=4001 nohup node dist/web/server/server.mjs > /tmp/viecz-web.log 2>&1 &
```

### Pre-deployment Checklist

1. `ps aux | grep -E 'server-linux|node.*dist/web' | grep -v grep` — check current ports
2. Build binaries/assets
3. Kill old process
4. Start new process on the **same port**
5. Verify: `curl -s --max-time 5 -o /dev/null -w "%{http_code}" https://viecz.fishcmus.io.vn`

**Learned the hard way**: Starting the web client on port 4000 instead of 4001 caused a production outage because nginx proxies to 4001. Always verify the nginx upstream port before deploying.


