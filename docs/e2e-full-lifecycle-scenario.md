# E2E Test Scenarios

## Overview

End-to-end integration tests exercising both the Go server and Android client together over real HTTP. PayOS payment gateway is mocked on the server side.

## Test Infrastructure

- **Server**: Go test binary (`cmd/testserver`) with SQLite in-memory, mock PayOS, auto-complete deposits
- **Android**: Instrumented tests with Compose UI testing, Espresso Intents for browser interception
- **Connection**: Emulator -> host via `10.0.2.2:9999`, real device via host IP
- **Runner**: `./scripts/run-full-e2e.sh` or `./gradlew connectedAndroidTest`
- **Claudtest**: ADB-based observe-act-verify on real device (see CLAUDE.md)

## Test Files

| File | Description |
|------|-------------|
| `e2e/S01_AuthFlowE2ETest.kt` | Login, register, splash navigation |
| `e2e/S04_BrowseTasksE2ETest.kt` | Home screen tasks, categories, task detail |
| `e2e/S06_CreateTaskE2ETest.kt` | Create task form and submission |
| `e2e/S15_WalletFlowE2ETest.kt` | Wallet balance and transactions |
| `e2e/S08_ProfileFlowE2ETest.kt` | Profile info, logout |
| `e2e/S13_FullJobLifecycleE2ETest.kt` | Full Alice/Bob job lifecycle (see Scenario 1) |
| `e2e/BaseE2ETest.kt` | Base class with MockWebServer |
| `e2e/RealServerBaseE2ETest.kt` | Base class for real server tests |
| `e2e/FakeApiDispatcher.kt` | Mock API responses |

## Actors

- **Alice** — Job creator (requester)
- **Bob** — Tasker (worker)

---

## Scenario 1: Full Job Lifecycle

**Test**: `S13_FullJobLifecycleE2ETest.fullJobLifecycle_AliceCreatesBobCompletes`

### Act 1: Alice sets up

1. **Alice registers** an account (email, password, name)
2. **Alice logs in** (auto-login after register)
3. **Alice deposits 200,000 VND** to wallet
   - Server creates PayOS payment link (mocked)
   - Wallet is credited via webhook auto-completion
4. **Alice creates a task** — "Help me move furniture", price: 100,000 VND
   - Category: Moving & Transport
   - Location: Ho Chi Minh City
5. **Alice logs out**

### Act 2: Bob applies

6. **Bob registers** an account
7. **Bob logs in** (auto-login after register)
8. **Bob becomes a tasker** (via profile screen -> "Become a Tasker")
9. **Bob browses tasks** and finds Alice's task
10. **Bob applies for the task**
11. **Bob logs out**

### Act 3: Alice accepts and completes

12. **Alice logs in**
13. **Alice views her task** and sees Bob's application
14. **Alice accepts Bob's application**
    - Escrow payment: 100,000 VND held from Alice's wallet
    - Task status -> "in_progress"
15. **Alice marks task as completed** (same screen after accept)
    - Payment released: 90,000 VND to Bob (100k minus 10% platform fee)
    - Task status -> "completed"
16. **Alice verifies wallet** — balance: 100,000 VND (200k - 100k escrow)
17. **Alice logs out**

### Act 4: Bob checks earnings

18. **Bob logs in**
19. **Bob checks wallet** — balance: 90,000 VND (100k minus 10% fee)

### Expected Final State

| Entity | State |
|--------|-------|
| Alice wallet balance | 100,000 VND |
| Bob wallet balance | 90,000 VND |
| Platform fee collected | 10,000 VND |
| Task status | completed |
| Task tasker | Bob |

---

## Scenario 2: Auth Flow

**Tests**: `S01_AuthFlowE2ETest`

### 2a: Splash -> Login -> Home

1. App starts at splash screen
2. Navigates to login ("Welcome Back")
3. Enter credentials (email, password)
4. Click Login
5. Verify home screen ("Viecz - Task Marketplace")

### 2b: Login -> Register -> Home

1. On login screen, tap "Don't have an account? Register"
2. Fill registration form (name, email, password)
3. Click Register
4. Verify home screen

### 2c: 401 Unauthorized -> Redirect to Login

1. User has expired/invalid token
2. Any API call returns 401
3. AuthInterceptor clears tokens, emits Unauthorized event
4. App navigates to login screen
5. Snackbar shows "Session expired. Please log in again."

---

## Scenario 3: Browse Tasks

**Tests**: `S04_BrowseTasksE2ETest`

### 3a: Home shows tasks

1. Home screen displays task cards from server
2. Verify seed tasks visible ("Deliver package to campus", "Clean apartment before checkout", "Math tutoring for midterm")

### 3b: Home shows categories

1. Category chips visible ("All", "Giao hang", "Don dep", "Gia su")
2. Tapping category filters task list

### 3c: Task detail navigation

1. Tap a task card
2. Verify "Task Details" screen shown

---

## Scenario 4: Create Task

**Test**: `S06_CreateTaskE2ETest.homeToCreateTaskFillFormAndSubmit`

1. Tap FAB (create task button) on home screen
2. Fill form: title, description, price, location
3. Select category from dropdown
4. Click "Create Task"
5. Verify navigation to task detail screen

---

## Scenario 5: Wallet

**Test**: `S15_WalletFlowE2ETest.homeToWalletShowsBalanceAndTransactions`

1. Navigate to wallet via bottom nav
2. Verify "My Wallet" screen
3. Verify balance and transaction history ("Initial deposit" visible)

---

## Scenario 6: Profile & Logout

**Tests**: `S08_ProfileFlowE2ETest`

### 6a: View profile

1. Navigate to profile via bottom nav
2. Verify user name and email displayed

### 6b: Logout

1. On profile screen, tap logout icon
2. Confirm logout dialog
3. Verify navigation to login screen ("Welcome Back")

---

## Scenario 7: My Jobs (NOT YET IMPLEMENTED AS E2E)

Profile -> My Jobs navigation for posted/applied/completed tasks.

### 7a: View posted jobs

1. Navigate to profile
2. Tap "My Posted Jobs"
3. Verify list shows tasks created by current user
4. Tap a task -> navigates to task detail

### 7b: View applied jobs

1. Navigate to profile
2. Tap "My Applied Jobs"
3. Verify list shows tasks where user is tasker (in_progress)

### 7c: View completed jobs

1. Navigate to profile
2. Tap "My Completed Jobs"
3. Verify list shows tasks where user is tasker (completed)

---

## Scenario 8: Messaging (NOT YET IMPLEMENTED AS E2E)

Real-time chat between requester and tasker via WebSocket.

### 8a: Send message on task

1. Alice opens task detail (in_progress task)
2. Alice taps "Message Tasker"
3. Alice types and sends a message
4. Message appears in chat

### 8b: Receive message

1. Bob opens same task's chat
2. Bob sees Alice's message
3. Bob replies
4. Both see full conversation

---

## Running E2E Tests

```bash
# Start test server
cd server && CGO_ENABLED=1 go build -o bin/testserver ./cmd/testserver && ./bin/testserver

# Run all E2E tests (requires connected device/emulator)
cd android && ./gradlew connectedAndroidTest

# Run specific E2E test class
./gradlew connectedAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.viecz.vieczandroid.e2e.S13_FullJobLifecycleE2ETest

# Run via script (starts server + runs tests)
./scripts/run-full-e2e.sh

# Claudtest (manual, via Claude Code)
# Claude automates ADB interactions on real device — see CLAUDE.md for definition
```
