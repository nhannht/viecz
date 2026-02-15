# Firebase App Distribution Guide

**Last Updated:** 2026-02-15

---

## Table of Contents

1. [Overview](#1-overview)
2. [Current Configuration](#2-current-configuration)
3. [Local Distribution Workflow](#3-local-distribution-workflow)
4. [Tester & Group Management](#4-tester--group-management)
5. [Tester Experience](#5-tester-experience)
6. [Gradle Configuration Reference](#6-gradle-configuration-reference)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Overview

Firebase App Distribution distributes pre-release APKs to internal testers without the Play Store. Testers receive email invitations and install builds via the Firebase App Tester app.

**Current status**: Fully configured and operational for `prodRelease` builds.

---

## 2. Current Configuration

| Property | Value |
|---|---|
| Firebase Project | `viecz-app` |
| Android App ID | Registered in Firebase Console |
| Distribution Group | `internal-testers` |
| Artifact Type | APK |
| Build Variant | `prodRelease` |
| Gradle Task | `appDistributionUploadProdRelease` |

### Current Testers

| Email | Added |
|---|---|
| nhannht.alpha@gmail.com | 2026-02-15 |
| trangiasang77@gmail.com | 2026-02-15 |

### Key Files

| File | Purpose |
|---|---|
| `android/app/google-services.json` | Firebase config (gitignored) |
| `android/gradle/libs.versions.toml` | Plugin versions (`firebaseBom`, `firebaseAppDistribution`, `googleServices`) |
| `android/app/build.gradle.kts` | Distribution config (`firebaseAppDistribution` block in release buildType) |

---

## 3. Local Distribution Workflow

### Prerequisites

- Firebase CLI installed: `npm install -g firebase-tools`
- Authenticated: `firebase login`
- `google-services.json` in `android/app/`

### Build and Upload

```bash
cd android

# Single command: build + upload
./gradlew assembleProdRelease appDistributionUploadProdRelease
```

This builds the `prodRelease` APK and uploads it to Firebase App Distribution, notifying all testers in the `internal-testers` group.

### Upload Only (pre-built APK)

```bash
cd android

firebase appdistribution:distribute \
  app/build/outputs/apk/prod/release/app-prod-release.apk \
  --app <FIREBASE_APP_ID> \
  --groups "internal-testers" \
  --release-notes "Description of changes"
```

### With Release Notes

Release notes can be added via CLI flag or a file:

```bash
# Inline
firebase appdistribution:distribute <apk-path> \
  --app <FIREBASE_APP_ID> \
  --groups "internal-testers" \
  --release-notes "Fixed payment bug, added balance validation"

# From file
firebase appdistribution:distribute <apk-path> \
  --app <FIREBASE_APP_ID> \
  --groups "internal-testers" \
  --release-notes-file release-notes.txt
```

---

## 4. Tester & Group Management

All management uses the Firebase CLI (`firebase` command).

### List Groups

```bash
firebase appdistribution:group:list --project viecz-app
```

### Create a Group

```bash
firebase appdistribution:group:create "Display Name" group-alias --project viecz-app
```

### Add Testers to a Group

```bash
firebase appdistribution:testers:add --emails user@example.com --group-alias internal-testers --project viecz-app
```

### Add Multiple Testers

```bash
firebase appdistribution:testers:add \
  --emails "user1@example.com,user2@example.com" \
  --group-alias internal-testers \
  --project viecz-app
```

### Remove a Tester

```bash
firebase appdistribution:testers:remove --emails user@example.com --project viecz-app
```

### List All Testers

```bash
firebase appdistribution:testers:list --project viecz-app
```

---

## 5. Tester Experience

### How testers receive builds

1. Tester gets email invitation from Firebase
2. Installs **Firebase App Tester** app from Play Store (or uses web link)
3. Accepts invitation and downloads the APK
4. New builds trigger automatic email notifications

### Tester requirements

- Android device with `minSdk >= 30` (Android 11+)
- "Install from unknown sources" enabled for Firebase App Tester
- Google account matching the invited email

---

## 6. Gradle Configuration Reference

### Version Catalog (`android/gradle/libs.versions.toml`)

```toml
[versions]
firebaseBom = "34.9.0"
googleServices = "4.4.4"
firebaseAppDistribution = "5.2.1"

[libraries]
firebase-bom = { group = "com.google.firebase", name = "firebase-bom", version.ref = "firebaseBom" }
firebase-analytics = { group = "com.google.firebase", name = "firebase-analytics" }

[plugins]
google-services = { id = "com.google.gms.google-services", version.ref = "googleServices" }
firebase-appdistribution = { id = "com.google.firebase.appdistribution", version.ref = "firebaseAppDistribution" }
```

### App Build Config (`android/app/build.gradle.kts`)

Plugins:
```kotlin
plugins {
    alias(libs.plugins.google.services)
    alias(libs.plugins.firebase.appdistribution)
}
```

Release build type:
```kotlin
buildTypes {
    release {
        firebaseAppDistribution {
            artifactType = "APK"
            groups = "internal-testers"
        }
    }
}
```

Dependencies:
```kotlin
dependencies {
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.analytics)
}
```

---

## 7. Troubleshooting

### "Group not found" error on upload

The group must exist before uploading. Create it first:
```bash
firebase appdistribution:group:create "Internal Testers" internal-testers --project viecz-app
```

### Authentication error

Re-authenticate:
```bash
firebase login --reauth
```

### `google-services.json` missing

Download from Firebase Console > Project Settings > Your Apps > Android app > Download `google-services.json`. Place in `android/app/`.

### Tester not receiving email

- Verify email was added: `firebase appdistribution:testers:list --project viecz-app`
- Check spam folder
- Ensure Google account exists for that email
