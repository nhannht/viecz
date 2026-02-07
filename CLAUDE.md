# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

#### Building and Running

```bash
# Build debug APK
./gradlew assembleDebug

# Build release APK
./gradlew assembleRelease

# Build and install debug APK on connected device/emulator
./gradlew installDebug

# Full build with tests
./gradlew build

# Run on connected device/emulator
./gradlew run
```

#### Testing

```bash
# Run unit tests
./gradlew test

# Run instrumented tests on connected device
./gradlew connectedAndroidTest

# Run all tests
./gradlew testDebugUnitTest connectedAndroidTest
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

# Run the server
go run cmd/server/main.go

# Run tests
go test ./...

# Run tests with coverage
go test -v -cover ./...

# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
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
