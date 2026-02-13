# End-to-End Testing Guide - Viecz Android App

**Device:** Z2458 (Android 14)
**App Version:** 1.0 (Debug)

---

## Pre-Test Setup

- [ ] Test server running (`cd server && CGO_ENABLED=1 go build -o bin/testserver ./cmd/testserver && ./bin/testserver`)
- [ ] Android emulator/device connected (`adb devices`)
- [ ] App installed (`cd android && ./gradlew installDevDebug`)

---

## Running E2E Tests

### Instrumented tests (mock server — no external dependencies)

```bash
cd android
./gradlew connectedDevDebugAndroidTest
```

Tests use `BaseE2ETest` with a mock server. All E2E test classes are in:
```
android/app/src/androidTest/java/com/viecz/vieczandroid/e2e/
```

### Full lifecycle test (requires real Go test server on port 9999)

```bash
# Terminal 1: Start test server
cd server && CGO_ENABLED=1 go build -o bin/testserver ./cmd/testserver && ./bin/testserver

# Terminal 2: Run full E2E
cd android && ./gradlew connectedDevDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.viecz.vieczandroid.e2e.S13_FullJobLifecycleE2ETest
```

---

## E2E Test Scenarios

Each scenario is documented in a separate file under [`e2escenarios/`](e2escenarios/):

| # | Scenario | File | Automated Test |
|---|----------|------|----------------|
| 1 | User Registration | [01_user_registration.md](e2escenarios/01_user_registration.md) | `S01_AuthFlowE2ETest.loginToRegisterToHome()` |
| 2 | User Login | [02_user_login.md](e2escenarios/02_user_login.md) | `S01_AuthFlowE2ETest.splashToLoginToHome()` |
| 3 | Token Persistence | [03_token_persistence.md](e2escenarios/03_token_persistence.md) | None (requires app restart) |
| 4 | Browse Categories | [04_browse_categories.md](e2escenarios/04_browse_categories.md) | `S04_BrowseTasksE2ETest` |
| 5 | Browse Tasks | [05_browse_tasks.md](e2escenarios/05_browse_tasks.md) | `S04_BrowseTasksE2ETest` |
| 6 | Create Task | [06_create_task.md](e2escenarios/06_create_task.md) | `S06_CreateTaskE2ETest` |
| 7 | View Task Detail | [07_view_task_detail.md](e2escenarios/07_view_task_detail.md) | `S04_BrowseTasksE2ETest` |
| 8 | Become Tasker | [08_become_tasker.md](e2escenarios/08_become_tasker.md) | `S13_FullJobLifecycleE2ETest` |
| 9 | Apply for Task | [09_apply_for_task.md](e2escenarios/09_apply_for_task.md) | `S13_FullJobLifecycleE2ETest` |
| 10 | View Applications | [10_view_applications.md](e2escenarios/10_view_applications.md) | `S13_FullJobLifecycleE2ETest` |
| 11 | Accept Application | [11_accept_application.md](e2escenarios/11_accept_application.md) | `S13_FullJobLifecycleE2ETest` |
| 12 | Logout | [12_logout.md](e2escenarios/12_logout.md) | `S08_ProfileFlowE2ETest.logoutNavigatesToLogin()` |
| 13 | Full Job Lifecycle | [13_full_job_lifecycle.md](e2escenarios/13_full_job_lifecycle.md) | `S13_FullJobLifecycleE2ETest` (requires real server) |
| 14 | Chat Messaging | [14_chat_messaging.md](e2escenarios/14_chat_messaging.md) | `S14_ChatMessagingE2ETest` (requires real server + WebSocket) |
| 15 | Multi-User Chat | — | `S15_MultiUserChatE2ETest` (requires real server + WebSocket) |
| 16 | Escrow Negotiation | [16_escrow_negotiation.md](e2escenarios/16_escrow_negotiation.md) | `S16_EscrowNegotiationE2ETest` (requires real server) |
| 17 | Wallet Flow | — | `S17_WalletFlowE2ETest` |

---

## Test Classes Overview

| Test Class | Base | Scenarios Covered |
|------------|------|-------------------|
| `S01_AuthFlowE2ETest` | `BaseE2ETest` | 1, 2 |
| `S04_BrowseTasksE2ETest` | `BaseE2ETest` | 4, 5, 7 |
| `S06_CreateTaskE2ETest` | `BaseE2ETest` | 6 |
| `S08_ProfileFlowE2ETest` | `BaseE2ETest` | 8, 12 |
| `S13_FullJobLifecycleE2ETest` | `RealServerBaseE2ETest` | 8, 9, 10, 11, 13 (full lifecycle) |
| `S14_ChatMessagingE2ETest` | `RealServerBaseE2ETest` | 14 (chat messaging) |
| `S15_MultiUserChatE2ETest` | `RealServerBaseE2ETest` | 15 (multi-user chat) |
| `S16_EscrowNegotiationE2ETest` | `RealServerBaseE2ETest` | 16 (escrow with negotiated price) |
| `S17_WalletFlowE2ETest` | `BaseE2ETest` | 17 (wallet balance & transactions) |

---

## Key Testing Notes

### LazyColumn scrolling

`performScrollTo()` does NOT work for off-screen LazyColumn items. Use:
```kotlin
composeRule.onAllNodes(hasScrollToNodeAction()).onFirst()
    .performScrollToNode(hasText("Logout"))
composeRule.onNodeWithText("Logout").performClick()
```

### Navigation pattern (post bottom-nav refactor)

- Main screens use bottom bar tabs: `onNodeWithText("Marketplace")`, `onNodeWithText("Profile")`, `onNodeWithText("Wallet")`
- Top bar actions: `onNodeWithContentDescription("Add Job")`, `onNodeWithContentDescription("Deposit")`
- Wait for `"Marketplace"` (not old `"Viecz - Task Marketplace"`) after login/register

---

## Troubleshooting

### Network Error / Connection Refused
```bash
# Verify test server is running
curl http://localhost:9999/api/v1/health

# Verify emulator can reach host (10.0.2.2 maps to host localhost)
adb shell curl http://10.0.2.2:9999/api/v1/health
```

### Unauthorized (401) Errors
- Check AuthInterceptor is adding Authorization header in logcat
- Try logging in again (token may have expired)

### Empty Categories or Tasks
```bash
curl http://localhost:9999/api/v1/categories | jq length
# Should return: 11
```

---

## Logcat Monitoring

```bash
# Auth flow
adb logcat -s AuthViewModel:D AuthInterceptor:D OkHttp:D

# Task flow
adb logcat -s TaskListViewModel:D TaskDetailViewModel:D CreateTaskViewModel:D

# Errors only
adb logcat *:E
```
