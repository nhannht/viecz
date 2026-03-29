---
name: payment-flow
description: "Viecz payment system — PayOS integration, escrow, deposit, withdrawal, platform fees, wallet ledger"
metadata:
  languages: "go,typescript"
  versions: "1.0.0"
  source: maintainer
  tags: "viecz,payment,payos,escrow,wallet,fintech"
  updated-on: "2026-03-29"
---

# Viecz Payment Flow

PayOS-based payment system with escrow, deposits, withdrawals, and platform fees.

## Overview

```
Requester deposits VND → Wallet
Requester creates task → Escrow holds funds
Tasker completes task → Requester releases payment
Platform fee deducted → Tasker receives net amount
Tasker withdraws → PayOS payout to bank account
```

## Deposit Flow

1. **User initiates deposit**
```
POST /api/v1/wallet/deposit
Body: { "amount": 100000, "description": "Top up" }
```

2. **Server creates PayOS order** and returns checkout info:
```json
{
  "checkout_url": "https://pay.payos.vn/...",
  "order_code": 123456789,
  "qr_code": "data:image/png;base64,...",
  "account_number": "...",
  "account_name": "...",
  "bin": "...",
  "amount": 100000,
  "description": "Deposit 100000"
}
```

3. **User pays** via QR scan or checkout URL

4. **PayOS sends webhook** to `POST /api/v1/payment/webhook`
   - Server verifies signature
   - Deduplicates by `reference` (each bank transfer unique)
   - Credits wallet, creates WalletTransaction

5. **User checks status** via `GET /api/v1/wallet/deposit/status/:orderCode`

### Client-side (Angular)

```typescript
// wallet.service.ts
this.walletService.deposit(amount, description).subscribe(res => {
  // Show QR code or redirect to checkout_url
  window.open(res.checkout_url, '_blank');
});

// Poll for status
this.walletService.getDepositStatus(orderCode).subscribe(status => {
  if (status === 'success') { /* reload wallet */ }
});
```

## Escrow Flow

When a task application is accepted, funds move from requester's balance to escrow.

```
POST /api/v1/payments/escrow
Body: { "task_id": 123 }
```

**What happens server-side:**
1. Verify requester owns the task
2. Check `wallet.HasSufficientBalance(task.price)`
3. `wallet.HoldInEscrow(task.price)` — deducts from balance, adds to escrow_balance
4. Create Transaction record (type: "escrow", status: "success")
5. Create WalletTransaction ledger entry

## Release Flow

After task completion, requester releases payment to tasker.

```
POST /api/v1/payments/release
Body: { "task_id": 123 }
```

**What happens server-side:**
1. `wallet.ReleaseFromEscrow(task.price)` — deducts from requester's escrow
2. Calculate platform fee: `amount * platformFeeRate`
3. `taskerWallet.Credit(netAmount)` — add to tasker's balance
4. Create Transaction records (release + platform_fee)
5. Create WalletTransaction entries for both parties
6. Send notification to tasker

### Platform Fee

```go
platformFeeRate := config.PlatformFeeRate  // e.g., 0.05 (5%)
platformFee := int64(float64(amount) * platformFeeRate)
netAmount := amount - platformFee
```

## Refund Flow

If task is cancelled or disputed, requester gets funds back.

```
POST /api/v1/payments/refund
Body: { "task_id": 123, "reason": "Task cancelled by requester" }
```

**What happens:**
1. `wallet.RefundFromEscrow(task.price)` — moves escrow back to balance
2. Create Transaction (type: "refund")
3. Create WalletTransaction entry

## Withdrawal Flow

Tasker withdraws earnings to bank account via PayOS payout.

```
POST /api/v1/wallet/withdraw
Body: { "amount": 50000, "bank_account_id": 1 }
```

**What happens:**
1. Verify bank account belongs to user
2. Check sufficient balance
3. Deduct from wallet
4. Create PayOS payout order (separate payout channel)
5. Background poller (`PayoutPoller`) checks status every 30s
6. On success: finalize WalletTransaction
7. On failure: refund amount back to wallet

### Dual PayOS Channels

```go
// config.go — two separate PayOS clients:
PayOSClientID     string  // Deposit channel
PayOSAPIKey       string
PayOSChecksumKey  string
PayOSPayoutClientID    string  // Payout channel
PayOSPayoutAPIKey      string
PayOSPayoutChecksumKey string
```

## Wallet Ledger

Every financial operation creates a `WalletTransaction` with before/after snapshots:

```go
WalletTransaction{
    WalletID:      wallet.ID,
    Type:          WTEscrowHold,
    Amount:        -50000,        // negative = debit
    BalanceBefore:  100000,
    BalanceAfter:   50000,
    EscrowBefore:   0,
    EscrowAfter:    50000,
    Description:   "Escrow for task #123",
}
```

This provides a complete audit trail of all balance changes.

## Webhook Deduplication

PayOS may send duplicate webhooks. Server uses `PaymentReference` table:

```go
type PaymentReference struct {
    ID          int64     `gorm:"primaryKey"`
    OrderCode   int64     `gorm:"index"`
    Reference   string    `gorm:"uniqueIndex"` // bank transfer reference
    Amount      int64
    ProcessedAt time.Time
}
```

Each `reference` is unique per bank transfer. If reference already exists, webhook is ignored.

## Error Handling

- Insufficient balance: `400 { "error": "insufficient balance" }`
- Task not in correct state: `400 { "error": "task must be in_progress" }`
- Unauthorized: `403 { "error": "not task owner" }`
- Phone not verified (finance ops): `403 { "error": "phone verification required" }`
