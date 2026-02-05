# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Viecz is a multi-package project containing:

- **@viecz/android** (`packages/android/`) - Native Kotlin Android application using Jetpack Compose (currently implemented)
- **@viecz/server** (`packages/server/`) - Server component (placeholder, not yet implemented)
- **@viecz/ui** (`packages/ui/`) - Shared UI component library (placeholder, not yet implemented)

## Project Structure

```
viecz/
├── packages/
│   ├── android/          # Native Kotlin Android app
│   │   ├── app/          # Main application module
│   │   ├── gradle/       # Gradle wrapper and version catalog
│   │   └── build.gradle.kts
│   ├── server/           # Backend server (placeholder)
│   └── ui/               # Shared UI components (placeholder)
└── CLAUDE.md
```

## Development Commands

### Android Development Commands

Navigate to the Android app directory:

```bash
cd packages/android
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
- Primary location: `packages/android/`
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

### Server Development (Not Yet Implemented)
- Planned location: `packages/server/`
- Currently placeholder only

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
cd packages/android
./gradlew --refresh-dependencies
```

## Project Status

- ✅ Android app (Native Kotlin with Jetpack Compose) - Active development
- ⏳ Server component - Planned, not yet implemented
- ⏳ Shared UI component library - Planned, not yet implemented
- ❌ iOS app - Not planned (Android-only)
- ❌ Web app - Not planned (Android-only)

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
