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

## Project Overview

Viecz is a multi-package project containing:

- **@viecz/android** (`android/`) - Native Kotlin Android application using Jetpack Compose
- **@viecz/server** (`server/`) - Go backend with comprehensive test coverage

**Current Status**: Active development on Go backend and Android app

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

```bash
# 1. Start test server on host machine
cd server && CGO_ENABLED=1 go build -o bin/testserver ./cmd/testserver && ./bin/testserver

# 2. Build and install dev APK on emulator
cd android && ./gradlew installDevDebug

# App shows "Viecz Dev", talks to localhost:9999, mock PayOS auto-completes deposits
# Both "Viecz Dev" and "Viecz" can coexist on the same device
```

#### Testing

```bash
# Run unit tests (dev flavor)
./gradlew testDevDebugUnitTest

# Run instrumented tests on connected device
./gradlew connectedAndroidTest

# Run all tests
./gradlew testDevDebugUnitTest connectedAndroidTest
```

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

## Context7 MCP Integration (CRITICAL - ALWAYS FOLLOW)

**MANDATORY**: Claude MUST proactively use Context7 MCP for library/API documentation, code generation, and setup/configuration steps WITHOUT requiring explicit user requests.

### When to Use Context7 Automatically

Use Context7 MCP tools (`mcp__context7__query-docs`, `mcp__context7__resolve-library-id`) in these scenarios:

1. **Library/API Documentation** - When working with any library or framework, automatically fetch documentation
   - Setting up new dependencies
   - Using unfamiliar APIs
   - Understanding component props or configuration options
   - Checking current API versions and best practices

2. **Code Generation** - When generating code that uses external libraries
   - Implementing features with specific libraries
   - Following current patterns and conventions
   - Using correct API signatures and types

3. **Setup and Configuration** - When configuring tools, libraries, or frameworks
   - Installation steps
   - Configuration file structure
   - Environment setup
   - Build tool configuration

### Examples

```bash
# User asks: "Add authentication to the app"
# Claude should automatically query Context7 for:
# - Android authentication best practices
# - Jetpack Compose authentication UI patterns
# - Firebase Auth or Auth0 Android SDK
# - Credential Manager API documentation
# - OAuth2 implementation with Android

# User asks: "Implement data fetching with Retrofit"
# Claude should automatically query Context7 for:
# - Retrofit documentation
# - OkHttp configuration
# - Kotlin Coroutines integration with Retrofit
# - Moshi or Gson serialization setup
# - Error handling patterns

# User says: "Add form validation in Compose"
# Claude should automatically query Context7 for:
# - Jetpack Compose form validation patterns
# - State management for form inputs
# - Compose TextField validation
# - Error handling in Compose UI
# - Input validation libraries for Android

# User asks: "Set up Room database"
# Claude should automatically query Context7 for:
# - Room Persistence Library documentation
# - Entity and DAO setup with Kotlin
# - Database migration strategies
# - Flow integration with Room
# - Coroutines support in Room
```

### Important Notes

- Always use Context7 BEFORE generating code with unfamiliar libraries
- Query Context7 even if you think you know the API (to get current versions)
- Use Context7 for Android libraries (Jetpack, AndroidX, third-party Kotlin libraries)
- Query for Jetpack Compose best practices and Material Design 3 patterns
- Check Kotlin Coroutines and Flow documentation for async patterns
- Don't wait for explicit "check the docs" requests from the user

This proactive approach ensures code accuracy, follows current best practices, and prevents outdated API usage.

## Claudtest - ADB-Based Device Interaction Testing (CRITICAL - ALWAYS FOLLOW)

**Claudtest** is this project's custom definition for automated E2E-style testing performed by Claude Code on a real Android device connected via ADB. It combines raw ADB input commands with UI Automator inspection to mimic real human interaction — no extra framework (Maestro, Espresso, Appium) required.

### What Claudtest Is

Claudtest is an **observe-act loop** on a real device:

1. **Observe** — Capture the current screen state
   - `adb shell screencap` — Take a screenshot (Claude reads it visually)
   - `adb shell uiautomator dump` — Dump the UI hierarchy XML to find element bounds, resource IDs, and text labels
2. **Act** — Perform human-like interactions using element coordinates from the UI dump
   - `adb shell input tap <x> <y>` — Tap a button/field
   - `adb shell input text "<text>"` — Type into a focused field
   - `adb shell input swipe <x1> <y1> <x2> <y2> <duration>` — Scroll/swipe
   - `adb shell input keyevent <code>` — Press keys (Back=4, Enter=66, Home=3)
   - `adb shell am start` — Launch activities or deep links
3. **Verify** — Observe again to confirm the expected result
   - Screenshot comparison (visual check)
   - UI hierarchy assertion (element exists/contains text)
   - `adb logcat` — Check for errors or expected log entries

### How to Find Element Coordinates

```bash
# 1. Dump UI hierarchy
adb shell uiautomator dump /sdcard/ui.xml
adb pull /sdcard/ui.xml /tmp/ui.xml

# 2. Parse bounds from XML — elements have bounds="[left,top][right,bottom]"
# Example: <node text="Login" bounds="[100,900][640,980]" />
# Tap center: x = (100+640)/2 = 370, y = (900+980)/2 = 940
adb shell input tap 370 940
```

### When to Use Claudtest

Use claudtest when:
- Verifying a UI/UX fix on the real device after code changes
- Reproducing a user-reported bug by following their steps
- Testing a full user flow (register -> login -> navigate -> perform action)
- The user asks to "test it on the device" or "try it on the phone"

### Claudtest Workflow

```
1. Ensure device connected:     adb devices
2. Launch app:                  adb shell am start -n <package>/<activity>
3. Wait for load:               sleep 2-3
4. Screenshot + UI dump:        Observe current state
5. Find target element:         Parse bounds from UI XML
6. Tap/type/swipe:              Perform interaction
7. Wait for response:           sleep 1-2
8. Screenshot + UI dump:        Verify result
9. Repeat 5-8 for each step
10. Check logcat if needed:     adb logcat -d --pid=$(adb shell pidof <package>)
```

### Example: Claudtest Login Flow

```bash
# Launch app
adb shell am start -n com.viecz.vieczandroid.dev/com.viecz.vieczandroid.MainActivity
sleep 3

# Screenshot to see login screen
adb shell screencap -p /sdcard/s1.png && adb pull /sdcard/s1.png /tmp/s1.png

# Dump UI to find Email field coordinates
adb shell uiautomator dump /sdcard/ui.xml && adb pull /sdcard/ui.xml /tmp/ui.xml
# Parse: Email field bounds="[64,650][696,730]" -> tap center (380, 690)

# Tap email field and type
adb shell input tap 380 690
adb shell input text "test@example.com"

# Tap password field and type
adb shell input tap 380 820
adb shell input text "password123"

# Tap Login button
adb shell input tap 380 950
sleep 3

# Verify: screenshot should show home screen, not login
adb shell screencap -p /sdcard/s2.png && adb pull /sdcard/s2.png /tmp/s2.png
```

### Important Rules

- **Always dump UI hierarchy** to get accurate coordinates — never guess coordinates
- **Always wait** (`sleep`) after navigation or network calls before checking results
- **Read screenshots visually** to confirm what the user would see
- **Check logcat** when interactions don't produce expected results
- **Report results** with screenshots so the user can see what happened
- Claudtest is for **verification and debugging**, not a replacement for unit tests

## Bug Fixing Protocol (CRITICAL - ALWAYS FOLLOW)

**MANDATORY**: Claude MUST use Context7 MCP and Web Search when encountering ANY bug, error, or unexpected behavior. This is NOT optional.

### Required Steps for Bug Fixing

When encountering any bug, error message, compilation error, runtime exception, or unexpected behavior, follow these steps IN ORDER:

1. **Search with Context7** - Query relevant library documentation
   ```bash
   # Use mcp__context7__resolve-library-id to find library documentation
   # Use mcp__context7__query-docs to search for:
   # - Error message or exception type
   # - API methods involved
   # - Configuration options
   # - Known issues and solutions
   ```

2. **Web Search** - Search for real-world solutions
   ```bash
   # Search for:
   # - Exact error message + library name + year (e.g., "Room database kotlin error 2026")
   # - Stack Overflow discussions
   # - GitHub issues in relevant repositories
   # - Official documentation errata
   ```

3. **Analyze Findings** - Combine documentation and community solutions
   - Compare official documentation with real-world implementations
   - Identify common patterns in solutions
   - Check for version-specific issues
   - Verify compatibility with project dependencies

4. **Apply Fix** - Use the most reliable solution
   - Prefer official documentation solutions
   - Use community solutions that are recent and well-tested
   - Apply fixes that align with project architecture
   - Test the fix thoroughly

### Why This Is Mandatory

- **Prevents outdated solutions**: Ensures fixes use current best practices, not deprecated APIs
- **Catches version-specific issues**: Libraries change; documentation is authoritative
- **Avoids assumptions**: Don't rely on memory; verify with current docs
- **Ensures correctness**: Community solutions provide real-world validation

### Examples

```bash
# Scenario: JSON parsing error in Retrofit
# 1. Context7: Query "Retrofit JSON parsing errors" + "Moshi/Gson configuration"
# 2. Web Search: "JsonDataException Retrofit Kotlin 2026"
# 3. Analyze: Compare data class annotations vs API response structure
# 4. Fix: Update data types or add @Json annotations

# Scenario: Compose recomposition issues
# 1. Context7: Query "Jetpack Compose recomposition" + "remember and mutableStateOf"
# 2. Web Search: "Compose excessive recomposition 2026"
# 3. Analyze: Check state hoisting patterns and remember usage
# 4. Fix: Use derivedStateOf or refactor state management

# Scenario: Hilt dependency injection error
# 1. Context7: Query "Hilt Android dependency injection" + error message
# 2. Web Search: "Hilt [specific error] Kotlin 2026"
# 3. Analyze: Verify module setup, component hierarchy, and scope annotations
# 4. Fix: Add missing @InstallIn or correct scope annotations

# Scenario: Room database migration crash
# 1. Context7: Query "Room database migrations" + "migration strategies"
# 2. Web Search: "Room migration crash Kotlin 2026"
# 3. Analyze: Check migration version numbers and SQL statements
# 4. Fix: Add missing migration or use fallbackToDestructiveMigration
```

### Important Rules

- **ALWAYS** use Context7 and web search for bugs - no exceptions
- **NEVER** skip to applying a fix without research
- **NEVER** rely solely on memory or assumptions
- **ALWAYS** verify solutions against current documentation
- If initial searches don't resolve the issue, search again with different keywords
- Document the fix and root cause for future reference
