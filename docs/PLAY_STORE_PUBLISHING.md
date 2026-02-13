# Plan: Publish Viecz on Google Play Store

## Context

Viecz is ready for its first Play Store release. The app is technically ~85% ready — build config, R8/ProGuard, adaptive icons, network security, and product flavors are all configured. Missing pieces: Google Play Developer account, release signing, production server deployment, privacy policy, and store listing assets.

### What's Already Done

- Upload keystore generated (`android/viecz-upload.jks`)
- `keystore.properties` created, `*.jks`/`*.keystore` gitignored
- Privacy policy written (bilingual VI/EN) at `docs/privacy-policy.html` and served at `/privacy-policy`
- Asset links configured at `server/static/.well-known/assetlinks.json`
- Server routes added for `/.well-known/` and `/privacy-policy`
- Production AAB builds successfully (`./gradlew bundleProdRelease`)

## Prerequisites (Manual — Not Automatable)

### 1. Google Play Developer Account
- Register at https://play.google.com/console
- Pay $25 one-time fee
- Complete identity verification (can take 48h+)

### 2. Deploy Production Server
- Deploy Go server to production at `viecz-api.fishcmus.io.vn`
- Ensure HTTPS with valid certificate
- Configure production `.env` (PostgreSQL, real PayOS keys, JWT secret)
- Verify: `curl https://viecz-api.fishcmus.io.vn/api/v1/health`

---

## Phase 1: App Signing Setup

> **Status: DONE**

### 1.1 Generate Upload Keystore

```bash
keytool -genkeypair -v \
  -keystore viecz-upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias viecz-upload \
  -dname "CN=Viecz, OU=Dev, O=Viecz, L=HCMC, ST=HCMC, C=VN"
```

Store `viecz-upload.jks` securely (NOT in git).

### 1.2 Create `android/keystore.properties`

```properties
storeFile=../viecz-upload.jks
storePassword=<password>
keyAlias=viecz-upload
keyPassword=<password>
```

Add to `.gitignore` (already configured in build.gradle.kts to read this file).

### 1.3 Verify Release Build

```bash
cd android && ./gradlew assembleProdRelease
```

**File**: `android/app/build.gradle.kts` — signing config already reads `keystore.properties` conditionally. No code changes needed.

---

## Phase 2: Privacy Policy

> **Status: DONE** — hosted at `/privacy-policy` on production server

### 2.1 Create Privacy Policy Page

**File**: `docs/privacy-policy.html` (bilingual Vietnamese/English)

Content covers:
- What data is collected (email, name, wallet transactions, chat messages)
- How data is used (task matching, payments, messaging)
- Third-party services (PayOS for payments)
- Data retention and deletion policy
- Contact information

### 2.2 Host Privacy Policy

Served by Go server at: `https://viecz-api.fishcmus.io.vn/privacy-policy`

---

## Phase 3: Store Listing Assets

### 3.1 Required Assets

| Asset | Specs | Source |
|---|---|---|
| App icon | 512x512 PNG, 32-bit | Already have adaptive icon — export high-res |
| Feature graphic | 1024x500 PNG | Need to create (banner image) |
| Screenshots | Min 2, recommended 4-8 per device type | Capture from emulator/device |
| Short description | Max 80 chars | "Find and hire taskers for everyday jobs in Vietnam" |
| Full description | Max 4000 chars | App features, how it works |

### 3.2 Screenshots to Capture

Capture from `prodDebug` build on emulator:
1. Login/Register screen
2. Marketplace (task listing)
3. Task detail with "Apply" button
4. Wallet screen with balance
5. Chat/messaging screen
6. Profile screen

Tool: `adb shell screencap -p /sdcard/screenshot.png`

### 3.3 Content Rating

Complete the IARC questionnaire in Play Console:
- No violence, no gambling
- Has user-generated content (task descriptions, chat)
- Has financial transactions (wallet deposits)
- Expected rating: Everyone / PEGI 3

---

## Phase 4: Build & Upload

### 4.1 Build Android App Bundle (AAB)

```bash
cd android && ./gradlew bundleProdRelease
```

Output: `android/app/build/outputs/bundle/prodRelease/app-prod-release.aab`

AAB is required for new apps on Play Store (APK not accepted for new listings).

### 4.2 Play Console Setup

In Google Play Console:
1. Create app -> "Viecz" -> select "App" -> language "Vietnamese"
2. Complete all sections in "Dashboard":
   - App access (full access, no restrictions)
   - Ads (no ads)
   - Content rating (IARC questionnaire)
   - Target audience (18+ due to financial features)
   - News app (no)
   - COVID-19 contact tracing (no)
   - Data safety (declare: email, name, payment info collected)
   - Government apps (no)
3. Store listing:
   - Short/full description
   - Screenshots + feature graphic
   - App icon
   - Privacy policy URL: `https://viecz-api.fishcmus.io.vn/privacy-policy`
   - Category: "Business" or "Productivity"
4. App signing:
   - Opt into **Play App Signing** (Google manages signing key)
   - Upload the upload key certificate (from `viecz-upload.jks`)

### 4.3 Upload AAB

1. Go to "Production" -> "Create new release"
2. Upload `app-prod-release.aab`
3. Add release notes: "Initial release of Viecz - task marketplace for Vietnam"
4. Review and submit

### 4.4 Review Timeline

- Google review takes 1-7 days for new apps
- May require additional information or changes
- Monitor email for review feedback

---

## Phase 5: Post-Launch Configuration

### 5.1 Deep Link Verification (Asset Links)

> **Status: DONE** — file created at `server/static/.well-known/assetlinks.json`

After opting into Play App Signing, update the SHA-256 fingerprint in `assetlinks.json` with the **app signing key** fingerprint from Play Console (not the upload key).

Current upload key fingerprint:
```
87:81:41:50:AA:C4:9E:92:7B:B7:15:CD:B2:18:92:99:A6:A2:31:86:03:97:BF:6D:3A:2A:1F:67:46:F6:9E:E5
```

### 5.2 Crash Reporting (Recommended)

Consider adding Firebase Crashlytics for production crash tracking:
- Maps R8-obfuscated stack traces to readable code
- Alerts on new crashes
- Free tier sufficient for launch

### 5.3 Version Management

For subsequent releases:
- Increment `versionCode` (integer, must increase)
- Update `versionName` (user-visible, e.g., "1.1")

---

## Execution Order

1. **Deploy production server** (prerequisite, may take time)
2. **Create Google Play Developer account** (prerequisite, 48h verification)
3. ~~Generate upload keystore~~ -> ~~build release~~ -> ~~verify it works~~ **DONE**
4. ~~Write & host privacy policy~~ **DONE**
5. **Capture screenshots & create feature graphic**
6. **Set up Play Console listing** (descriptions, assets, ratings, data safety)
7. **Upload AAB** -> submit for review
8. **Update asset links** with Play App Signing fingerprint

## Verification

1. `cd android && ./gradlew bundleProdRelease` succeeds
2. AAB is properly signed (check with `jarsigner -verify`)
3. Privacy policy URL is accessible
4. Production server health check passes
5. Play Console pre-launch report shows no critical issues
