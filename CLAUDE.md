# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Serena + JetBrains Is the Default (CRITICAL - ALWAYS FOLLOW)

**MANDATORY**: Serena (powered by JetBrains IDEA) is the **primary tool for ALL code work** in this project. It MUST be used for reading, searching, navigating, and editing code. Claude Code built-in tools (`Read`, `Grep`, `Glob`, `Edit`) are **only** for files outside this project or non-code files (config, YAML, JSON, markdown, `.md`).

### The Rule Is Simple

- **Inside project, code files** → Serena. Always.
- **Inside project, non-code files** (`.md`, `.yml`, `.json`, `.gitignore`, etc.) → Claude Code `Read`/`Edit`
- **Outside project** (`~/.claude/`, `/etc/`, system files) → Claude Code tools
- **Shell commands** → Claude Code `Bash` (Serena has no shell)

### What Serena Does

| Task | Serena Tool |
|---|---|
| Understand a file's structure | `jet_brains_get_symbols_overview(file, depth=1)` |
| Find a class/function by name | `jet_brains_find_symbol(name)` |
| Read a function's source code | `jet_brains_find_symbol(name, include_body=True)` |
| Find all callers of a function | `jet_brains_find_referencing_symbols(name, file)` |
| See inheritance/implementations | `jet_brains_type_hierarchy(name, file)` |
| Check library API signatures | `jet_brains_find_symbol(name, search_deps=True)` |
| Search code with regex | `search_for_pattern(pattern)` |
| Find files by name | `find_file(mask, path)` |
| List directory contents | `list_dir(path)` |
| Replace an entire function/method | `replace_symbol_body(name, file, body)` |
| Add code next to existing symbol | `insert_before/after_symbol(name, file, content)` |
| Rename across codebase | `rename_symbol(name, file, new_name)` |

### When Claude Code `Edit` Is Still OK

- **Surgical edits** (3-5 lines inside a large function) — `Edit` is more precise than reproducing the entire symbol body
- **Non-code files** — Serena has no IDE intelligence for config/markdown

### Standard Workflow

1. **Overview first**: `get_symbols_overview(file, depth=1)`
2. **Drill down**: `find_symbol(name, include_body=True)` only for what you need
3. **Trace usage**: `find_referencing_symbols(name, file)`
4. **Check hierarchy**: `type_hierarchy(name, file, "sub")`
5. **Check library API**: `find_symbol(name, search_deps=True)`
6. **Edit**: `replace_symbol_body` for whole symbols, Claude Code `Edit` for small patches

### Key Rules

- **ALWAYS `get_symbols_overview` before reading any code file** — understand structure first, read bodies second
- **ALWAYS `find_referencing_symbols`** before renaming or changing a symbol's signature
- **ALWAYS `type_hierarchy`** before modifying an interface or base class
- **Use `find_symbol(search_deps=True)`** to check library APIs instead of web search
- **Pass `relative_path`** whenever possible — restricts search scope, faster results
- **`find_referencing_symbols` requires a file path**, not a directory — use `find_symbol` first if you don't know the file
- **Cross-language**: JetBrains indexes Go, TypeScript, and Kotlin together, but `find_referencing_symbols` works within a single language's scope
- **This applies in ALL modes** — planning, exploring, implementing, delegating to sub-agents. No exceptions. Never fall back to `Read`/`Grep`/`Glob` for code files out of habit

### Serena Memories

Serena has persistent cross-session memories in `.serena/memories/`. At session start, check if relevant memories exist before starting work:
- `mcp__serena__list_memories()` to see available knowledge
- `mcp__serena__read_memory(name)` to load relevant context
- `mcp__serena__write_memory(name, content)` to save new learnings

Current memories: `project_overview`, `suggested_commands`, `architecture/go_backend`, `architecture/angular_web`, `conventions/go_style`, `conventions/angular_style`, `task_completion_checklist`, `gotchas`

### When Bash/Grep Is Acceptable (Exceptions)

- Counting things (`grep -c`, `wc -l`) — pure text counting, not code understanding
- Route registration patterns in `main.go` — `api.GET()` calls aren't in the symbol AST
- Text in comments, strings, non-code content — not symbols

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

## Project Overview

Viecz is a multi-package project containing:

- **@viecz/android** (`android/`) - Native Kotlin Android application using Jetpack Compose
- **@viecz/server** (`server/`) - Go backend with comprehensive test coverage
- **@viecz/web** (`web/`) - Angular 21 web client with SSR and Material Design 3

**Current Status**: Active development on Go backend, Android app, and web client

### Platform Status

- **Android app** - Native Kotlin with Jetpack Compose (Active development)
- **Go Backend** - Fully implemented with ~70%+ test coverage (Production ready)
- **Web client** - Angular 21 with SSR, Material Design 3, full feature parity with Android
- **iOS app** - Not planned

## Code Documentation (CRITICAL - ALWAYS FOLLOW)

**Primary source of truth is the code itself.** Use CLI doc tools instead of hand-written docs for models, APIs, components, and services — they're always accurate and never drift.

### Doc Comments Are Mandatory (CRITICAL)

The CLI tools (`go doc`, `compodoc`) read doc comments from source code. These comments **must** be kept accurate when modifying code.

**Go** — every exported type, function, and method must have a doc comment:
```go
// CreateTask handles POST /api/v1/tasks
// Requires authentication. Creates a new task and deducts escrow from wallet.
func (h *TaskHandler) CreateTask(c *gin.Context)

// Wallet represents a user's wallet for payments
type Wallet struct {
```

**Angular/TypeScript** — JSDoc before `@Component()`, `@Injectable()`, and public methods:
```typescript
/**
 * Manages wallet balance, deposits, and transaction history.
 * Communicates with GET/POST /api/v1/wallet endpoints.
 */
@Injectable({ providedIn: 'root' })
export class WalletService {
```

**Rules:**
- **When modifying a function/method** — update its doc comment if behavior changed
- **When adding a new exported symbol** — always add a doc comment
- **When changing an endpoint's route or method** — update the `// handles POST /api/v1/...` comment
- **When adding/removing @Input/@Output** — the decorator is self-documenting, but add JSDoc if the purpose isn't obvious from the name
- **Never write redundant comments** — `// GetUser gets a user` adds nothing. Describe *what it does* beyond the name: route handled, side effects, auth requirements

### Code-First Documentation (Use These Instead of Reading docs/technical/)

**Go backend** — `scripts/godoc-query.sh`:
```bash
bash scripts/godoc-query.sh models          # All models with fields, tags, methods
bash scripts/godoc-query.sh model User       # Specific model
bash scripts/godoc-query.sh handlers         # All handler types and methods
bash scripts/godoc-query.sh services         # All service interfaces
bash scripts/godoc-query.sh routes           # All registered routes (from main.go)
bash scripts/godoc-query.sh search wallet    # Search across all packages
```

**Angular web client** — `scripts/compodoc-query.py`:
```bash
python3 scripts/compodoc-query.py stats              # Project statistics
python3 scripts/compodoc-query.py components          # All components with selectors
python3 scripts/compodoc-query.py component TaskCard   # Component inputs/outputs/methods
python3 scripts/compodoc-query.py services            # All services
python3 scripts/compodoc-query.py service Auth         # Service methods and signatures
python3 scripts/compodoc-query.py interfaces          # All interfaces
python3 scripts/compodoc-query.py routes              # App routes
python3 scripts/compodoc-query.py search wallet        # Search all symbols
python3 scripts/compodoc-query.py generate            # Regenerate docs (auto on first query)
```

**Android** — Use Serena LSP tools (`get_symbols_overview`, `find_symbol`) for Kotlin code exploration.

### When to Use CLI Docs vs Serena vs docs/technical/

| Need | Use This | Why |
|------|----------|-----|
| Model fields, types, tags | `godoc-query.sh model X` | Exact struct with GORM/JSON tags |
| All API routes | `godoc-query.sh routes` | Parsed from actual main.go |
| Component inputs/outputs | `compodoc-query.py component X` | Parsed from actual TypeScript |
| Service methods | `compodoc-query.py service X` | Full method signatures |
| Symbol relationships | Serena `find_referencing_symbols` | LSP cross-file references |
| High-level architecture | `docs/technical/ARCHITECTURE.md` | Rarely changes, explains *why* |
| Testing commands/patterns | `docs/technical/TESTING.md` | Operational reference |
| Deployment procedures | Deployment section in this file | Operational reference |
| Security audit findings | `docs/technical/SECURITY_AUDIT_2026_02_20.md` | Point-in-time audit |
| Design system tokens | `docs/technical/DESIGN_SYSTEM.md` | Design decisions |

### docs/technical/ — Reference Only, Not Mandatory

`docs/technical/` contains 22 documents. They are **reference material for humans** (onboarding, design reviews), NOT the primary way Claude Code should understand the codebase. Do not spend time updating them after every code change — the CLI tools above are always accurate.

**Update docs/technical/ only when:**
- Architecture fundamentally changes (new services, major restructuring)
- Security audit findings are addressed
- A teammate specifically asks for documentation updates

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
- **`dev`** — Points to localhost test server (`http://localhost:9999/api/v1/`), app name "Viecz Dev", separate applicationId (`.dev` suffix). Requires `adb reverse tcp:9999 tcp:9999` on ALL devices (emulators and physical)
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

```bash
# 1. Start test DB + Meilisearch, build and start test server
sudo docker compose -f docker-compose.testdb.yml up -d && cd server && go build -o bin/testserver ./cmd/testserver && ./bin/testserver

# 2. Set up port forwarding (CRITICAL — required for ALL devices, emulators AND physical)
adb reverse tcp:9999 tcp:9999

# 3. Build and install dev APK
cd android && ./gradlew installDevDebug

# App shows "Viecz Dev", uses localhost:9999 via adb reverse
# Both "Viecz Dev" and "Viecz" can coexist on the same device
# Verify forwarding: adb reverse --list
```

**Why `adb reverse` for emulators too?** The Docker emulator (`budtmo/docker-android`) cannot reach the host via `10.0.2.2` like a standard Android Studio emulator. `adb reverse` works universally — Docker emulators, standard emulators, and physical devices. The dev flavor uses `localhost:9999` as the API URL.

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
- `<number>` is the primary scenario number (13, 14, 15, 16, 18, 19, ...)
- Class name MUST match the file name (e.g., `class S13_FullJobLifecycleE2ETest`)
- Examples (actual tests in the repo):
  - `S13_FullJobLifecycleE2ETest.kt` — Full job lifecycle (register, create, apply, escrow, complete)
  - `S14_ChatMessagingE2ETest.kt` — Chat messaging
  - `S16_EscrowNegotiationE2ETest.kt` — Escrow negotiation
  - `S19_TaskDeletionE2ETest.kt` — Task deletion
- Base classes (`BaseE2ETest`, `RealServerBaseE2ETest`, `E2ETest`) do NOT use the `S<number>_` prefix
- When creating new E2E tests, assign the next available scenario number (currently: S20)

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

**MANDATORY — Port Forwarding for ALL Devices**:
- **ALWAYS run `adb reverse tcp:9999 tcp:9999` before launching the dev app or running E2E tests** — this applies to emulators AND physical devices
- The dev flavor uses `localhost:9999` as API URL; `adb reverse` makes the device's localhost map to the host's localhost
- **Before running E2E tests**, run:
  ```bash
  adb reverse tcp:9999 tcp:9999
  ```
- Verify forwarding: `adb reverse --list`
- Remove forwarding: `adb reverse --remove tcp:9999`
- Without `adb reverse`, the app gets `SocketTimeoutException` trying to connect to localhost

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
- **Language**: Go 1.25+
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

## Deployment (CRITICAL - ALWAYS FOLLOW)

**MANDATORY**:
1. **ALWAYS ask the user before deploying.** Never deploy without explicit user confirmation.
2. Do NOT use Docker or git push/pull for deploying server fixes. Use direct binary deployment.
3. Do NOT use `sudo` for deployment. Use manual process (pkill + nohup).
4. **ALWAYS deploy after building.** Every `npx ng build` or `go build` for production MUST be followed by restarting the corresponding process. Building without deploying leaves users on stale code — this has caused production bugs. Never build and walk away.

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

### Production Ports

**MANDATORY**: Before restarting any service, check the port it was running on. Never assume default dev ports.

| Service | Production Port | Nginx upstream | Dev Port |
|---------|----------------|----------------|----------|
| Go API server | 8080 | `127.0.0.1:8080` (via `/api/` in nginx) | 8080 |
| Web SSR (Express/Node) | **4001** | `127.0.0.1:4001` | 4200 |

### Production Restart Commands

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

### PayOS Integration Patterns

- **PayOS sends test webhooks when verifying URLs** — When you update the webhook URL in the PayOS dashboard, PayOS sends a test payload with `description: "Ma giao dich thu nghiem"` or `"VQRIO123"`. Your webhook handler must detect these and return `200 OK` **before** signature verification, otherwise PayOS reports "webhook url cua ban khong hoat dong" (your webhook URL is not working). See `webhook.go` lines 55-63.
- **Client-controlled `return_url` over server-side routing** — Instead of fixing server-side return handlers for each platform, let each client send its own `return_url` in the deposit request. Web sends `window.location.origin + "/payment/return"`, Android omits it and falls back to server handler with deep links. This cleanly separates platform concerns.
- **`.env` is NOT loaded when `GO_ENV=production`** — `config.go` skips `godotenv.Load()` in production. Changing `.env` has zero effect on the production server. Use system environment variables or hardcoded defaults instead.

### Infrastructure Routing

- **Nginx handles `viecz.fishcmus.io.vn`** — TLS via Let's Encrypt, not cloudflared. Nginx config at `/etc/nginx/sites-enabled/viecz-web` routes `/api/` to Go server at `127.0.0.1:8080` and everything else to Angular SSR at `127.0.0.1:4001`.
- **Separate nginx configs exist for other subdomains** — `viecz-api.fishcmus.io.vn` (direct Go API access via `/etc/nginx/sites-enabled/viecz-api`), `viecz-apk-dev.fishcmus.io.vn` (APK downloads via `/etc/nginx/sites-enabled/viecz-apk-dev`).
- **Webhook/callback URLs must use `https://viecz.fishcmus.io.vn/api/v1/...`** — This is the primary public ingress for the Go API (proxied through nginx).

### Dual Component Architecture (nhannht-metro vs shared)

- **The app uses `app-task-card` (`TaskCardComponent` in `task-card.component.ts`), NOT `nhannht-metro-task-card`** — Marketplace and My Jobs import `TaskCardComponent`. The `NhannhtMetroTaskCardComponent` is only referenced by Storybook stories. When adding features to the task card, modify `TaskCardComponent` first.
- **`nhannht-metro-*` components are design system references** — They will eventually move to a standalone project. They may duplicate `shared/` components with slight API differences (e.g., `isOwner` as input vs auto-detected from `AuthService`). Both should stay in sync feature-wise, but the `shared/` version is what production uses.
- **Always trace imports from page components before modifying a shared component** — Run `Grep` for the component selector (e.g., `app-task-card`) in page templates to confirm which component the app actually renders. Storybook rendering ≠ production rendering.
- **Same pattern applies to all shared components** — If both `app-X` and `nhannht-metro-X` exist, the `app-X` version is the production one.

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


