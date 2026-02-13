# Scenario 18: Wallet Balance Limit (200k VND Max)

Tests the maximum wallet balance enforcement: deposits that would exceed 200,000 VND are rejected, but earnings from completed tasks bypass the limit.

**Requires:** Go test server running on port 9999 (mock PayOS auto-completes deposits)

**Automated Test:** `S18_WalletBalanceLimitE2ETest`

---

## Flow Diagram

```
Alice registers → Alice deposits 200k (OK) → Alice tries to deposit 1k more (FAIL)
    → Alice logs out
Bob registers → Bob deposits 200k → Bob creates task (100k)
    → Bob logs out
Alice logs in → Alice becomes tasker → Alice applies for Bob's task
    → Alice logs out
Bob logs in → Bob accepts application (escrow 100k) → Bob completes task
    → Alice earns 100k → Alice wallet = 200k + 100k = 300k (earnings bypass limit)
```

---

## Test Users

| User | Email | Password | Role |
|------|-------|----------|------|
| Alice | `alice_{timestamp}@test.com` | `Password123` | Tasker (earns beyond 200k) |
| Bob | `bob_{timestamp}@test.com` | `Password123` | Task requester |

---

## Key Concept

The max balance limit (200,000 VND) applies **only to deposits**:
- Deposit from 0 to 200,001 VND → **REJECTED** (exceeds limit)
- Deposit from 199,000 to 201,000 VND → **REJECTED** (exceeds limit)
- Earning 100,000 VND via task completion when balance is already 200,000 → **ALLOWED**

---

## Steps

### Step 1: Alice registers
1. App starts at Login screen
2. Tap "Don't have an account? Register"
3. Fill: Full Name, Email, Password
4. Tap "Register"
5. **Verify:** Navigates to MainScreen

### Step 2: Alice deposits 200,000 VND (succeeds)
1. Tap "Wallet" tab
2. Tap Deposit icon
3. Enter 200000, tap "Deposit"
4. Wait for mock PayOS webhook
5. **Verify:** Balance shows 200,000

### Step 3: Alice tries to deposit 1,000 more (fails - exceeds limit)
1. Tap Deposit icon again
2. Enter 1000, tap "Deposit"
3. **Verify:** Error message containing "exceed maximum wallet balance" appears
4. Dismiss dialog

### Step 4: Alice logs out

### Step 5: Bob registers
Same as Step 1, with Bob's credentials.

### Step 6: Bob deposits 200,000 VND
Same flow as Step 2 for Bob.

### Step 7: Bob creates task (100,000 VND)
1. Tap "Create" tab
2. Fill: Title, Description, Category, Location, Price = 100000
3. Tap "Create Task"
4. **Verify:** Task appears in list

### Step 8: Bob logs out

### Step 9: Alice logs in
1. Login with Alice's credentials
2. **Verify:** MainScreen visible

### Step 10: Alice becomes a tasker
1. Navigate to Profile tab
2. Tap "Become a Tasker"
3. Fill tasker profile
4. Submit

### Step 11: Alice applies for Bob's task
1. Navigate to Marketplace
2. Find and tap Bob's task
3. Tap "Apply for this Task"
4. Submit application

### Step 12: Alice logs out

### Step 13: Bob logs in and accepts Alice's application
1. Login with Bob's credentials
2. Navigate to Bob's task
3. Accept Alice's application (escrow 100k deducted)

### Step 14: Bob completes the task
1. Tap "Mark as Completed"
2. Payment released: 100k to Alice (0% fee in beta)

### Step 15: Verify Alice earned beyond 200k limit
1. Bob logs out
2. Alice logs in
3. Navigate to Wallet tab
4. **Verify:** Balance shows 300,000 (200k deposit + 100k earnings)
5. Earnings bypass the deposit limit

### Step 16: Alice tries to deposit again (still fails)
1. Tap Deposit icon
2. Enter 2000, tap "Deposit"
3. **Verify:** Error message about exceeding limit (balance 300k + 2k > 200k max)
