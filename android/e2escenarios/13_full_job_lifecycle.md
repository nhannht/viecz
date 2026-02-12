# Scenario 13: Full Job Lifecycle (Multi-User End-to-End)

This is the most comprehensive E2E scenario. It tests the entire job lifecycle across two users (Alice and Bob), covering registration, wallet deposit, task creation, application, escrow payment, task completion, and final wallet verification.

**Requires:** Go test server running on port 9999 (mock PayOS auto-completes deposits)

**Automated Test:** `FullJobLifecycleE2ETest.fullJobLifecycle_AliceCreatesBobCompletes()`

---

## Flow Diagram

```
Alice registers → Alice deposits 200k → Alice creates task (100k)
    → Alice logs out
Bob registers → Bob becomes tasker → Bob applies for task
    → Bob logs out
Alice logs in → Alice accepts application (escrow deducts 100k)
    → Alice marks task completed (releases 90k to Bob after 10% fee)
    → Verify: Alice wallet = 100k, Bob wallet = 90k
```

---

## Test Users

| User | Email | Password | Role |
|------|-------|----------|------|
| Alice | `alice_{timestamp}@test.com` | `Password123` | Task requester (poster) |
| Bob | `bob_{timestamp}@test.com` | `Password123` | Tasker (applicant) |

Emails use `System.currentTimeMillis()` suffix to ensure uniqueness per test run.

---

## Steps

### Step 1: Alice registers

1. App starts at Splash → navigates to Login screen
2. Tap "Don't have an account? Register"
3. Fill: Full Name = "Alice TestUser", Email, Password
4. Tap "Register"
5. **Verify:** Navigates to MainScreen, "Marketplace" tab visible

### Step 2: Alice deposits 200,000 VND

1. Tap "Wallet" tab in bottom bar
2. **Verify:** "Available Balance" displayed
3. Tap "Deposit" icon in top bar (contentDescription = "Deposit")
4. **Verify:** "Deposit Funds" dialog appears
5. Enter amount: 200000
6. Tap "Deposit" button in dialog
7. Browser intent intercepted by Espresso-Intents (stubbed)
8. Mock PayOS on test server auto-fires webhook to credit wallet (wait 2s)
9. Switch to Marketplace tab and back to Wallet to refresh
10. **Verify:** Balance shows "200.000" (Vietnamese format)

**Technical detail:** The test stubs `ACTION_VIEW` intents so the browser never actually opens. The test server's mock PayOS automatically fires a webhook back to `/api/v1/payments/webhook` after 100ms to credit the wallet.

### Step 3: Alice creates a task (100,000 VND)

1. Tap "Marketplace" tab in bottom bar
2. Tap "Add Job" icon in top bar (contentDescription = "Add Job")
3. **Verify:** "Create New Task" screen appears
4. Fill form:
   - Task Title: "Help me move furniture"
   - Description: "Need help moving furniture to new apartment downtown"
   - Price: 100000
   - Location: "Ho Chi Minh City"
   - Category: "Vận chuyển" (Moving & Transport)
5. Tap "Create Task"
6. **Verify:** "Task Details" screen shows with "Help me move furniture"

### Step 4: Alice logs out

1. Tap Back button (contentDescription = "Back")
2. **Verify:** Returns to Marketplace
3. Tap "Profile" tab in bottom bar
4. **Verify:** "Statistics" section visible
5. Scroll LazyColumn down to "Logout" button
6. Tap "Logout"
7. **Verify:** Confirmation dialog: "Are you sure you want to logout?"
8. Tap confirm "Logout" button in dialog
9. **Verify:** Login screen ("Welcome Back") appears

**Testing note:** The Logout button is at the bottom of a LazyColumn. Use `performScrollToNode(hasText("Logout"))` on the scrollable container, not `performScrollTo()`.

### Step 5: Bob registers

1. Tap "Don't have an account? Register"
2. Fill: Full Name = "Bob TestUser", Email, Password
3. Tap "Register"
4. **Verify:** Navigates to MainScreen, "Marketplace" tab visible

### Step 6: Bob becomes a Tasker

1. Tap "Profile" tab in bottom bar
2. **Verify:** "Statistics" section visible
3. Tap "Become a Tasker" button
4. **Verify:** Confirmation dialog appears
5. Tap "Yes, Register"
6. Wait 2s for server response

### Step 7: Bob applies for Alice's task

1. Tap "Marketplace" tab in bottom bar
2. **Verify:** "Help me move furniture" task visible in list
3. Tap on the task
4. **Verify:** "Task Details" screen
5. Tap "Apply for this Task"
6. **Verify:** "Apply for Task" dialog
7. Tap "Submit Application" (no optional fields filled)
8. **Verify:** "Application Pending" status shown (wait up to 20s)

### Step 8: Bob logs out

1. Tap Back button
2. **Verify:** Returns to Marketplace
3. Navigate to Profile tab → scroll to Logout → confirm (same as Step 4)
4. **Verify:** Login screen appears

### Step 9: Alice logs in

1. Enter Alice's email and password
2. Tap "Login"
3. **Verify:** MainScreen with "Marketplace" tab visible

### Step 10: Alice accepts Bob's application (escrow created)

1. **Verify:** "Help me move furniture" task visible on Marketplace
2. Tap on the task
3. **Verify:** "Task Details" screen with "Accept Application" button
4. Tap "Accept Application"
5. **Verify:** "Accept Application & Create Payment" confirmation dialog
6. Tap "Accept"
7. **Verify:** "Payment processed successfully!" message (wait up to 20s)

**What happens on the server:**
- Application status → ACCEPTED
- Task status → IN_PROGRESS
- Escrow payment created: 100,000 VND deducted from Alice's wallet
- Alice's wallet: 200k - 100k = 100k remaining

### Step 11: Alice marks task as completed

1. **Verify:** "Mark as Completed" button appears (task is now IN_PROGRESS)
2. Tap "Mark as Completed"
3. **Verify:** Task status shows "Completed" (wait up to 20s)

**What happens on the server:**
- Task status → COMPLETED
- Escrow released: 100k × 90% = 90k transferred to Bob's wallet
- Platform fee: 100k × 10% = 10k retained
- Bob's wallet: 0 + 90k = 90k

### Step 12: Verify Alice's wallet = 100,000 VND

1. Tap Back button
2. **Verify:** Returns to Marketplace
3. Tap "Wallet" tab in bottom bar
4. **Verify:** "Available Balance" displayed
5. **Verify:** Balance shows "100.000" (200k original - 100k escrow)

### Step 13: Verify Bob's wallet = 90,000 VND

1. Tap "Marketplace" tab
2. Navigate to Profile tab → scroll to Logout → confirm
3. Login as Bob
4. Tap "Wallet" tab in bottom bar
5. **Verify:** "Available Balance" displayed
6. **Verify:** Balance shows "90.000" (100k task price - 10% platform fee)

---

## Financial Summary

| Event | Alice Wallet | Bob Wallet | Platform |
|-------|-------------|------------|----------|
| Alice deposits | +200,000 | 0 | 0 |
| Escrow created (accept) | -100,000 | 0 | holds 100k |
| Task completed (release) | 0 | +90,000 | +10,000 |
| **Final** | **100,000** | **90,000** | **10,000** |

---

## Prerequisites

```bash
# Terminal 1: Start the Go test server
cd server
CGO_ENABLED=1 go build -o bin/testserver ./cmd/testserver
./bin/testserver
# Server runs on port 9999, SQLite in-memory, mock PayOS

# Terminal 2: Run the test
cd android
./gradlew connectedDevDebugAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=com.viecz.vieczandroid.e2e.FullJobLifecycleE2ETest
```

**Test server details:**
- Port: 9999
- Database: SQLite in-memory (fresh on each server restart)
- JWT secret: `e2e-test-secret-key`
- PayOS: Mock mode — auto-fires webhook to credit wallet after 100ms
- Categories: Pre-seeded (11 categories including "Vận chuyển")

---

## Common Failure Points

| Step | Failure | Cause | Fix |
|------|---------|-------|-----|
| 2 | Deposit balance not updating | Webhook not fired | Check test server is running, wait longer |
| 4, 8 | Logout scroll fails | LazyColumn off-screen | Use `performScrollToNode()` not `performScrollTo()` |
| 7 | "Apply for this Task" not visible | Bob is not a tasker | Ensure Step 6 completed |
| 10 | "Accept Application" not visible | No applications | Ensure Step 7 completed |
| 10 | Payment timeout | Server slow | Increase timeout beyond 20s |
| 12-13 | Wrong balance | Escrow/fee calculation | Check server payment logic |
