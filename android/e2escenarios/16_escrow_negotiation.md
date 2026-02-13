# Scenario 16: Escrow with Price Negotiation

Tests that the escrow system correctly uses the tasker's proposed (negotiated) price instead of the original task price.

**Requires:** Go test server running on port 9999 (mock PayOS auto-completes deposits)

**Automated Test:** `S16_EscrowNegotiationE2ETest.escrowNegotiation_ProposedPriceUsedForEscrow()`

---

## Flow Diagram

```
Alice registers → Alice deposits 200k → Alice creates task (100k)
    → Alice logs out
Bob registers → Bob becomes tasker → Bob applies with proposed price 90k
    → Bob logs out
Alice logs in → Alice accepts application (escrow deducts 90k, NOT 100k)
    → Alice marks task completed (releases 90k to Bob, 0% fee in beta)
    → Verify: Alice wallet = 110k, Bob wallet = 90k
```

---

## Test Users

| User | Email | Password | Role |
|------|-------|----------|------|
| Alice | `alice_{timestamp}@test.com` | `Password123` | Task requester (poster) |
| Bob | `bob_{timestamp}@test.com` | `Password123` | Tasker (applicant) |

---

## Key Difference from Scenario 13

In Scenario 13, Bob applies without a proposed price, so the escrow uses the task price (100k).
In this scenario, Bob proposes 90k, and the escrow should use 90k instead of 100k.

**Expected wallet balances:**

| User | After Deposit | After Escrow | After Completion |
|------|--------------|-------------|-----------------|
| Alice | 200,000 | 110,000 (balance) + 90,000 (escrow) | 110,000 |
| Bob | 0 | 0 | 90,000 (0% fee in beta) |

---

## Steps

### Step 1: Alice registers
Same as Scenario 13.

### Step 2: Alice deposits 200,000 VND
Same as Scenario 13.

### Step 3: Alice creates task priced at 100,000 VND
Same as Scenario 13.

### Step 4: Alice logs out
Navigate to Profile → Logout.

### Step 5: Bob registers
Same as Scenario 13.

### Step 6: Bob becomes a Tasker
Profile → "Become a Tasker" → Confirm.

### Step 7: Bob applies with proposed price 90,000
1. Navigate to Marketplace → find Alice's task → tap
2. Tap "Apply for this Task"
3. In the apply dialog, enter `90000` in "Proposed Price (Optional)" field
4. Tap "Submit Application"
5. Verify "Application Pending" shown

### Step 8: Bob logs out
Navigate to Profile → Logout.

### Step 9: Alice logs in
Login with Alice's credentials.

### Step 10: Alice views application with proposed price
1. Find task in Marketplace → tap to open Task Details
2. Verify application card shows "Proposed price: ₫90.000"
3. Tap "Accept Application"
4. Confirm in dialog → escrow payment created

### Step 11: Alice verifies escrow used proposed price
1. Navigate to Wallet tab
2. Verify balance shows 110,000 (200k - 90k escrow, NOT 200k - 100k)

### Step 12: Alice completes task
1. Go back to task → "Mark as Completed"
2. Payment released: 90k to Bob (0% fee in beta)

### Step 13: Alice verifies final wallet balance
Navigate to Wallet → verify balance shows 110,000

### Step 14: Bob verifies wallet
1. Alice logs out
2. Bob logs in
3. Navigate to Wallet → verify balance shows 90,000 (0% platform fee in beta)
