# Plan: Publish Viecz via Firebase App Distribution

## Context

Firebase App Distribution lets you distribute pre-release builds to testers without going through the Play Store. Useful for internal testing, QA, and getting feedback before production release. Firebase is **not yet configured** in the project.

## Prerequisites

### 1. Firebase Project
- Go to https://console.firebase.google.com
- Create project "Viecz" (or link to existing Google Cloud project)
- Add Android app with package name `com.viecz.vieczandroid`
- Download `google-services.json` -> place in `android/app/`

### 2. Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

---

## Phase 1: Firebase SDK Setup

### 1.1 Add Firebase plugin to version catalog

**File**: `android/gradle/libs.versions.toml`

Add to `[versions]`:
```toml
firebaseBom = "33.7.0"
googleServices = "4.4.2"
firebaseAppDistribution = "5.1.0"
```

Add to `[libraries]`:
```toml
firebase-bom = { group = "com.google.firebase", name = "firebase-bom", version.ref = "firebaseBom" }
firebase-analytics = { group = "com.google.firebase", name = "firebase-analytics" }
```

Add to `[plugins]`:
```toml
google-services = { id = "com.google.gms.google-services", version.ref = "googleServices" }
firebase-appdistribution = { id = "com.google.firebase.appdistribution", version.ref = "firebaseAppDistribution" }
```

### 1.2 Add plugins to root build.gradle.kts

**File**: `android/build.gradle.kts`

```kotlin
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.google.services) apply false          // add
    alias(libs.plugins.firebase.appdistribution) apply false // add
}
```

### 1.3 Add plugins and dependencies to app build.gradle.kts

**File**: `android/app/build.gradle.kts`

Add plugins:
```kotlin
plugins {
    // ... existing plugins
    alias(libs.plugins.google.services)
    alias(libs.plugins.firebase.appdistribution)
}
```

Add dependencies:
```kotlin
dependencies {
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.analytics)
}
```

Add App Distribution config per flavor:
```kotlin
firebaseAppDistribution {
    // Configure per build variant in productFlavors or buildTypes
}
```

### 1.4 Add google-services.json to gitignore

**File**: `android/.gitignore`

```
google-services.json
```

### 1.5 Place google-services.json

Download from Firebase Console and place at `android/app/google-services.json`.

---

## Phase 2: App Distribution Configuration

### 2.1 Create Firebase service account

1. Go to Google Cloud Console -> IAM -> Service Accounts
2. Create service account: `firebase-app-distribution`
3. Grant role: `Firebase App Distribution Admin`
4. Create JSON key -> save as `firebase-service-account.json` (gitignored)

### 2.2 Configure distribution in build.gradle.kts

**File**: `android/app/build.gradle.kts`

Add inside `android {}` block:
```kotlin
buildTypes {
    release {
        // ... existing config
        firebaseAppDistribution {
            artifactType = "APK"
            groups = "internal-testers"
            releaseNotes = "Release build for testing"
        }
    }
}
```

### 2.3 Add tester groups in Firebase Console

1. Go to Firebase Console -> App Distribution
2. Create group: `internal-testers`
3. Add tester emails to the group

---

## Phase 3: Local Distribution

### 3.1 Distribute via Gradle

```bash
cd android

# Authenticate (one-time)
firebase login

# Build and distribute prod release
./gradlew assembleProdRelease appDistributionUploadProdRelease
```

### 3.2 Distribute via Firebase CLI

```bash
cd android

# Build APK
./gradlew assembleProdRelease

# Upload with CLI
firebase appdistribution:distribute \
  app/build/outputs/apk/prod/release/app-prod-release.apk \
  --app <FIREBASE_APP_ID> \
  --groups "internal-testers" \
  --release-notes "v1.0 testing build"
```

---

## Phase 4: CI/CD Integration (GitHub Actions)

### 4.1 Add secrets to GitHub repository

Go to GitHub repo -> Settings -> Secrets -> Actions:
- `FIREBASE_SERVICE_ACCOUNT_JSON` — contents of service account JSON key
- `GOOGLE_SERVICES_JSON` — contents of `google-services.json`

### 4.2 Create distribution workflow

**File**: `.github/workflows/android-distribute.yml`

```yaml
name: Distribute Android App

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      release_notes:
        description: 'Release notes for testers'
        required: false
        default: 'New build for testing'

jobs:
  distribute:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'

      - name: Setup Gradle
        uses: gradle/actions/setup-gradle@v4

      - name: Decode google-services.json
        run: echo "${{ secrets.GOOGLE_SERVICES_JSON }}" | base64 -d > android/app/google-services.json

      - name: Decode service account
        run: echo "${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}" | base64 -d > firebase-sa.json

      - name: Build prod release APK
        working-directory: android
        run: ./gradlew assembleProdRelease

      - name: Upload to Firebase App Distribution
        uses: wzieba/Firebase-Distribution-Github-Action@v1
        with:
          appId: ${{ secrets.FIREBASE_APP_ID }}
          serviceCredentialsFileContent: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}
          groups: internal-testers
          file: android/app/build/outputs/apk/prod/release/app-prod-release.apk
          releaseNotes: ${{ github.event.inputs.release_notes || 'Automated build' }}
```

---

## Phase 5: Tester Experience

### How testers receive builds
1. Testers get email invitation from Firebase
2. They install the **Firebase App Tester** app (or use web link)
3. Accept invitation -> download and install the APK
4. New builds are automatically notified

### Tester requirements
- Android device with `minSdk >= 30` (Android 11+)
- "Install from unknown sources" enabled for Firebase App Tester
- Google account matching the invited email

---

## Execution Order

1. **Create Firebase project** and download `google-services.json`
2. **Add Firebase SDK** to Gradle config (version catalog + build files)
3. **Verify build**: `./gradlew assembleProdRelease` still succeeds
4. **Create service account** for CI/CD authentication
5. **Add tester group** in Firebase Console
6. **Test local distribution**: `./gradlew appDistributionUploadProdRelease`
7. **Set up GitHub Actions** workflow with secrets
8. **Verify CI/CD**: push a tag -> testers receive the build

## Verification

1. `./gradlew assembleProdRelease` builds with Firebase plugins
2. `./gradlew appDistributionUploadProdRelease` uploads successfully
3. Testers receive email notification
4. Testers can download and install the APK
5. GitHub Actions workflow triggers on tag push and distributes
