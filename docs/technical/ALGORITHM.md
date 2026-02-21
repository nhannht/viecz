# ALGORITHM.md - Core Algorithms & Business Logic

> Technical reference for algorithms implemented in the Viecz Go backend.
>
> Last updated: 2026-02-20

## Table of Contents

1. [JWT Authentication Flow](#1-jwt-authentication-flow)
2. [Password Hashing & Validation](#2-password-hashing--validation)
3. [Task Status State Machine](#3-task-status-state-machine)
4. [Application Acceptance Logic](#4-application-acceptance-logic)
5. [Escrow Payment Flow](#5-escrow-payment-flow)
6. [Platform Fee Calculation](#6-platform-fee-calculation)
7. [Wallet Balance Management](#7-wallet-balance-management)
8. [WebSocket Message Routing](#8-websocket-message-routing)
9. [Notification System](#9-notification-system)
10. [Debounced Marketplace Search](#10-debounced-marketplace-search)
11. [Meilisearch Integration](#11-meilisearch-integration)

---

## 1. JWT Authentication Flow

**Source:** `server/internal/auth/jwt.go`, `server/internal/auth/middleware.go`

### Token Generation

Two token types are issued on login/registration:

- **Access token** -- short-lived, contains full user claims (ID, email, name, is_tasker)
- **Refresh token** -- long-lived, contains minimal claims (ID, email only)

Both use HMAC-SHA256 (`jwt.SigningMethodHS256`) with a shared secret.

```go
// Access token claims
type Claims struct {
    UserID   int64  `json:"sub"`
    Email    string `json:"email"`
    Name     string `json:"name"`
    IsTasker bool   `json:"is_tasker"`
    jwt.RegisteredClaims  // exp, iat, nbf
}

// Refresh token omits Name and IsTasker
```

Access token expiry is configured in minutes; refresh token expiry in days.

### Middleware Pipeline

```
Request
  |
  v
AuthRequired middleware
  |-- Extract "Authorization: Bearer <token>" header
  |-- Validate token (signature + expiry + signing method)
  |-- Inject claims into Gin context: user_id, email, name, is_tasker
  |-- Call c.Next()
```

There is also an `OptionalAuth` middleware that extracts claims if a token is present but does not reject unauthenticated requests.

### Token Validation

```
ValidateToken(tokenString, secret):
  1. Parse token, verify signing method is HMAC
  2. Verify signature against secret
  3. Check expiry (exp), not-before (nbf)
  4. Return Claims if valid, error otherwise
```

---

## 2. Password Hashing & Validation

**Source:** `server/internal/auth/auth.go`, `server/internal/models/user.go`

### Registration Flow

```
Register(email, password, name):
  1. Validate email format (regex: ^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$)
  2. Validate password strength (see below)
  3. Check email uniqueness in DB
  4. Hash password: bcrypt.GenerateFromPassword(password, bcrypt.DefaultCost)
  5. Create User record (default university: "ĐHQG-HCM")
  6. Return user
```

### Password Strength Requirements

```
IsStrongPassword(password):
  - Minimum 8 characters
  - At least one uppercase letter [A-Z]
  - At least one lowercase letter [a-z]
  - At least one digit [0-9]
```

### Login Flow

```
Login(email, password):
  1. Lookup user by email
  2. bcrypt.CompareHashAndPassword(storedHash, password)
  3. Return user on match, generic "invalid credentials" error otherwise
     (does not reveal whether email exists)
```

---

## 3. Task Status State Machine

**Source:** `server/internal/models/task.go`, `server/internal/services/task.go`, `server/internal/services/payment.go`

### Valid States

| Status | Value |
|---|---|
| Open | `open` |
| In Progress | `in_progress` |
| Completed | `completed` |
| Cancelled | `cancelled` |

### State Transition Diagram

```
                          AcceptApplication
              +---> open ─────────────────────> (tasker assigned)
              |       |                              |
  CreateTask ─┘       |                     CreateEscrowPayment
                      |                              |
                      |                              v
                      |                        in_progress
                      |                         /        \
                      |            CompleteTask /          \ RefundPayment
                      |                       v            v
                      |                  completed     cancelled
                      |
                      +--- DeleteTask (soft delete → cancelled)
```

**Transition rules enforced in code:**

| Transition | Who | Precondition |
|---|---|---|
| open -> (tasker assigned) | Requester | `AcceptApplication`: task must be open, app must be pending |
| open -> in_progress | System | `CreateEscrowPayment`: task must be open, payer = requester |
| in_progress -> completed | Requester | `CompleteTask`: task must be in_progress, caller = requester |
| in_progress -> cancelled | Requester | `RefundPayment`: task must be in_progress, caller = requester |
| open -> cancelled | Requester | `DeleteTask`: task must be open, caller = requester, no accepted apps |

### DeleteTask (Soft Delete) Logic

```
DeleteTask(taskID, requesterID):
  DB Transaction (with SELECT FOR UPDATE row lock):
    1. Get task with row lock
    2. Verify ownership (requesterID == task.RequesterID)
    3. Verify status == "open"
    4. Check applications:
       - If ANY app has status "accepted" → error "cannot delete: applicant accepted"
    5. Set task.status = "cancelled"
    6. Reject all pending applications (status → "rejected")

  After commit (non-critical):
    7. Notify rejected applicants (type: task_cancelled)
```

**Race condition handling:** Uses `SELECT ... FOR UPDATE` within a DB transaction to prevent concurrent application acceptance during deletion. Unit tests use a non-transactional fallback (db=nil).

**Update constraint:** Only open tasks can be edited (title, description, price, etc.).

**User statistics computation:**

`TotalTasksPosted` and `TotalTasksCompleted` are **computed dynamically** from the tasks table when `GetProfile()` is called — not stored as denormalized counters. This avoids stale data when tasks are inserted outside the service layer (e.g., seed data, admin tools).

```
UserService.GetProfile(userID):
  1. Fetch user from DB
  2. COUNT tasks WHERE requester_id = userID              → TotalTasksPosted
  3. COUNT tasks WHERE requester_id = userID AND status = 'completed' → TotalTasksCompleted
  4. Return user with computed stats
```

Both counts are non-critical — logged on failure but do not block the profile response.

### Application Status State Machine

```
pending ──> accepted   (chosen application)
   |
   +──> rejected      (all others when one is accepted,
                        or all pending when task is deleted/cancelled)
```

---

## 4. Application Acceptance Logic

**Source:** `server/internal/services/task.go` -- `AcceptApplication`

```
AcceptApplication(applicationID, requesterID):
  1. Get application by ID
  2. Get task by application.TaskID
  3. Validate:
     - task.RequesterID == requesterID (authorization)
     - task.Status == "open"
     - application.Status == "pending"
  4. Update application status to "accepted"
  5. Assign tasker: task.TaskerID = application.TaskerID
  6. Reject all other pending applications for the same task:
     FOR each app WHERE task_id = task.ID AND id != applicationID AND status == "pending":
       app.Status = "rejected"
```

### Apply-for-Task Validation

```
ApplyForTask(taskID, taskerID, input):
  1. Task must exist and be "open"
  2. Tasker cannot apply to own task (requesterID != taskerID)
  3. Tasker must have IsTasker == true
  4. No duplicate applications (one per tasker per task)
  5. Create application with status "pending"
```

---

## 5. Escrow Payment Flow

**Source:** `server/internal/services/payment.go`, `server/internal/services/wallet.go`

The payment system supports two modes:
- **Mock mode** (`PAYMENT_MOCK_MODE=true`): wallet-to-wallet transfers, no external payment provider
- **Real mode**: PayOS integration for external payment links

### Transaction Safety

All escrow operations are wrapped in a GORM database transaction with row-level locking (`SELECT ... FOR UPDATE`) to prevent double-spend and race conditions:

```
db.Transaction(func(tx *gorm.DB) error {
    task := taskRepo.GetByIDForUpdate(ctx, tx, taskID)  // Row lock on task
    wallet := walletRepo.GetByUserIDForUpdate(ctx, tx, userID)  // Row lock on wallet
    // ... validate + mutate within transaction ...
})
```

Wallet methods (`Deposit`, `HoldInEscrow`, `ReleaseFromEscrow`, `RefundFromEscrow`) accept an optional `outerTx *gorm.DB` parameter. When non-nil, they execute within the caller's transaction. When nil, they create their own transaction. This enables PaymentService to wrap multiple wallet operations in a single atomic transaction.

### Phase 1: Escrow Hold (Task Accepted -> In Progress)

```
CreateEscrowPayment(taskID, payerID):
  db.Transaction(func(tx) {
    1. GetByIDForUpdate(taskID) — row lock on task
    2. Validate: task.Status == "open", payer == requester
    3. Determine effective price:
       - Use accepted application's proposed_price if set
       - Otherwise use task.Price
    4. Calculate platform fee: int64(effectivePrice * platformFeeRate)
       netAmount = effectivePrice - platformFee
    5. Create Transaction record (type=escrow, status=pending)

    Mock mode:
      6a. WalletService.HoldInEscrow(ctx, tx, payerID, effectivePrice, taskID)
          - GetByUserIDForUpdate — row lock on wallet
          - wallet.Balance -= amount
          - wallet.EscrowBalance += amount
          - wallet.TotalSpent += amount
          - Record WalletTransaction (type=escrow_hold, amount=-amount)
      7a. Transaction.Status = "success"
      8a. task.Status = "in_progress"

    Real mode:
      6b. PayOS.CreatePaymentLink(orderCode, amount, returnURL, cancelURL)
      7b. Store PayOS order code and payment ID on transaction
      8b. Return checkout URL to client
  })
```

### Phase 2a: Release (Task Completed)

```
ReleasePayment(taskID, requesterID):
  db.Transaction(func(tx) {
    1. GetByIDForUpdate(taskID) — row lock on task
    2. Validate: task.Status == "in_progress", caller == requester, tasker assigned
    3. Find escrow transaction (type=escrow, status=success) for task
    4. Create release Transaction (amount = escrowTx.NetAmount)

    Mock mode:
      5a. WalletService.ReleaseFromEscrow(ctx, tx, payerID, payeeID, netAmount, taskID):
          Payer wallet (row-locked):
            - escrowBalance -= netAmount
          Payee wallet (row-locked):
            - balance += netAmount
            - totalEarned += netAmount
      6a. If platformFee > 0, create platform_fee Transaction record

    Real mode:
      5b. Mark release transaction as success (actual fund transfer external)
  })
```

### Phase 2b: Refund (Task Cancelled)

```
RefundPayment(taskID, requesterID, reason):
  db.Transaction(func(tx) {
    1. GetByIDForUpdate(taskID) — row lock on task
    2. Validate: task.Status == "in_progress", caller == requester
    3. Find escrow transaction for task
    4. Create refund Transaction (amount = escrowTx.Amount, full refund)

    Mock mode:
      5a. WalletService.RefundFromEscrow(ctx, tx, userID, fullAmount, taskID):
          - GetByUserIDForUpdate — row lock on wallet
          - wallet.EscrowBalance -= amount
          - wallet.Balance += amount
          - wallet.TotalSpent -= amount  (reversal)

    Real mode:
      5b. PayOS.CancelPaymentLink(orderCode, reason)

    6. task.Status = "cancelled"
  })
```

### Money Conservation Invariant

In mock mode, money is transferred between wallet fields. No money is created or destroyed:

```
Phase 1 (Hold):
  payer.Balance -= price,  payer.EscrowBalance += price
  System total unchanged.

Phase 2a (Release):
  payer.EscrowBalance -= netAmount
  payee.Balance += netAmount
  System total unchanged (platformFee is recorded but not moved to a separate wallet).

Phase 2b (Refund):
  payer.EscrowBalance -= amount,  payer.Balance += amount
  System total unchanged.
```

---

## 6. Platform Fee Calculation

**Source:** `server/internal/services/payment.go` -- `CreateEscrowPayment`

```go
platformFee := int64(float64(effectivePrice) * s.platformFeeRate)
netAmount := effectivePrice - platformFee
```

- `platformFeeRate` is a float64 fraction (e.g., `0.10` for 10%, `0.0` during beta)
- Fee is computed once at escrow creation time and stored on the Transaction
- `NetAmount` is what the tasker receives on release
- Refunds return the full `Amount` (including fee) to the requester

**Example (10% fee):**

```
effectivePrice = 50,000 VND
platformFee    = int64(50000 * 0.10) = 5,000 VND
netAmount      = 50,000 - 5,000 = 45,000 VND
```

---

## 7. Wallet Balance Management

**Source:** `server/internal/models/wallet.go`, `server/internal/services/wallet.go`

### Wallet Model

Each user has one wallet with two balance fields:

```
Wallet:
  Balance        int64  -- available funds
  EscrowBalance  int64  -- held in escrow (not spendable)
  TotalDeposited int64  -- lifetime deposits
  TotalWithdrawn int64  -- lifetime withdrawals
  TotalEarned    int64  -- lifetime earnings from tasks
  TotalSpent     int64  -- lifetime spending on tasks
```

**Invariants (enforced by GORM BeforeCreate/BeforeUpdate hooks):**

```
Balance >= 0
EscrowBalance >= 0
TotalDeposited >= 0
TotalWithdrawn >= 0
TotalEarned >= 0
TotalSpent >= 0
```

### Wallet Operations

| Operation | Balance | EscrowBalance | Notes |
|---|---|---|---|
| `Credit(amount)` | += amount | unchanged | Used by Deposit, ReleaseFromEscrow (payee side) |
| `Deduct(amount)` | -= amount | unchanged | Fails if Balance < amount |
| `HoldInEscrow(amount)` | -= amount | += amount | Also increments TotalSpent |
| `ReleaseFromEscrow(amount)` | unchanged | -= amount | Funds go to payee, not back to balance |
| `RefundFromEscrow(amount)` | += amount | -= amount | Also decrements TotalSpent (reversal) |

### Transaction Nesting (outerTx pattern)

All wallet service methods accept an optional `outerTx *gorm.DB` parameter:

```go
func (s *WalletService) Deposit(ctx context.Context, outerTx *gorm.DB, userID, amount int64, description string) error
func (s *WalletService) HoldInEscrow(ctx context.Context, outerTx *gorm.DB, userID, amount, taskID int64, ...) error
func (s *WalletService) ReleaseFromEscrow(ctx context.Context, outerTx *gorm.DB, payerID, payeeID, amount, taskID int64, ...) error
func (s *WalletService) RefundFromEscrow(ctx context.Context, outerTx *gorm.DB, userID, amount, taskID int64, ...) error
```

- **`outerTx != nil`**: Executes within the caller's transaction (used by PaymentService to atomically lock task + modify wallet)
- **`outerTx == nil`**: Creates its own `db.Transaction()` (used for standalone operations like webhook-triggered deposits)

Row-level locking methods used within transactions:
- `walletRepo.GetByUserIDForUpdate(ctx, tx, userID)` — `SELECT ... FOR UPDATE` on wallet row
- `walletRepo.GetOrCreateForUpdate(ctx, tx, userID)` — Get-or-create with row lock
- `walletRepo.UpdateWithTx(ctx, tx, wallet)` — Update using the transaction handle
- `walletTransactionRepo.CreateWithTx(ctx, tx, walletTx)` — Create record using the transaction handle

### Available Balance (Soft Reservation)

**Source:** `server/internal/services/wallet.go` -- `GetAvailableBalance`, `server/internal/services/task.go` -- `CreateTask`, `UpdateTask`

When a requester creates or updates a task, the system checks that the requester's **available balance** covers the task price. This prevents posting tasks the requester cannot pay for.

```
AvailableBalance = Balance - EscrowBalance - SumOpenTaskPrices(requesterID)
```

Where `SumOpenTaskPrices` is `SELECT COALESCE(SUM(price), 0) FROM tasks WHERE requester_id = ? AND status = 'open'`.

```
GetAvailableBalance(userID, taskRepo):
  1. Get wallet for user (GetOrCreate)
  2. Sum prices of all OPEN tasks by this requester
  3. available = wallet.Balance - wallet.EscrowBalance - openTaskTotal
  4. If available < 0, clamp to 0
  5. Return available
```

**Validation in CreateTask:**
```
CreateTask(...):
  ...
  available = GetAvailableBalance(requesterID, taskRepo)
  if available < input.Price:
    return error("insufficient available balance: have %d, need %d")
  ...
```

**Validation in UpdateTask (price increase only):**
```
UpdateTask(...):
  ...
  if input.Price > task.Price:
    available = GetAvailableBalance(requesterID, taskRepo)
    delta = input.Price - task.Price
    if available < delta:
      return error("insufficient available balance for price increase")
  ...
```

No new database columns are added -- available balance is computed on-the-fly from existing wallet fields and the tasks table.

### Max Wallet Balance Enforcement

**Source:** `WalletService.ValidateDeposit`, `WalletService.Deposit`

```
if maxWalletBalance > 0 AND wallet.Balance + amount > maxWalletBalance:
    return error("deposit would exceed maximum wallet balance")
```

This check runs both as a pre-validation (before creating PayOS link) and inside the deposit transaction.

### Deposit Flow (Mock Mode)

```
Deposit(userID, amount, description):
  1. Validate: amount > 0
  2. DB transaction:
     a. GetOrCreate wallet for user
     b. Check max balance limit
     c. wallet.Credit(amount)
     d. wallet.TotalDeposited += amount
     e. Create WalletTransaction record (type=deposit)
```

### Wallet Transaction History

Each wallet operation creates a `WalletTransaction` record capturing:
- Balance and escrow snapshots (before/after)
- Transaction type, amount, description
- Optional references to Transaction, Task, and other user

---

## 8. WebSocket Message Routing

**Source:** `server/internal/websocket/hub.go`, `server/internal/websocket/client.go`, `server/internal/services/message.go`

### Architecture

```
Client (Android)  <--WebSocket-->  Client (Go)  <-->  Hub  <-->  MessageService
                                     |                 |
                                  readPump          Broadcast channel
                                  writePump         Register/Unregister channels
```

### Hub Data Structures

```go
Hub:
  clients       map[uint]*Client              // user_id -> client
  conversations map[uint]map[*Client]bool      // conversation_id -> set of clients
  Broadcast     chan *BroadcastMessage          // buffered (256)
  Register      chan *Client
  Unregister    chan *Client
  mu            sync.RWMutex
```

### Hub Event Loop

```
Hub.Run():
  forever:
    select:
      case client <- Register:
        clients[client.UserID] = client

      case client <- Unregister:
        delete clients[client.UserID]
        close client.send
        remove client from all conversations

      case msg <- Broadcast:
        for each client in conversations[msg.ConversationID]:
          if client.UserID != msg.ExcludeUserID:
            try send msg to client.send channel
            if buffer full: close client, remove from hub
```

### Message Types

| Type | Direction | Persisted | Handler |
|---|---|---|---|
| `message` | Client -> Server -> Clients | Yes (DB) | `handleChatMessage` |
| `typing` | Client -> Server -> Clients | No | `handleTypingIndicator` |
| `read` | Client -> Server | Yes (mark read) | `handleReadReceipt` |
| `join` | Client -> Server | No | `handleJoinConversation` |
| `message_sent` | Server -> Sender | -- | Confirmation to sender |
| `joined` | Server -> Client | -- | Join confirmation |
| `read_confirmed` | Server -> Client | -- | Read receipt confirmation |
| `error` | Server -> Client | -- | Error response |

### Chat Message Flow

```
handleChatMessage(client, msg):
  1. Get conversation by ID
  2. Verify sender is participant (posterID or taskerID)
  3. Create Message record in DB (conversation_id, sender_id, content)
  4. Update conversation.LastMessage and LastMessageAt
  5. Broadcast to conversation (exclude sender):
     Hub.Broadcast <- BroadcastMessage{
       ConversationID, wsMessage, ExcludeUserID: sender
     }
  6. Send "message_sent" confirmation to sender
```

### Read Receipt Flow

```
handleReadReceipt(client, msg):
  1. Mark all messages in conversation as read for this user:
     messageRepo.MarkConversationAsRead(conversationID, userID)
  2. Send "read_confirmed" back to client
```

### Client Connection Lifecycle

```
NewClient(conn, hub, userID, handler)
  |
  Start()
  |-- go writePump()  -- sends messages from client.send channel to WebSocket
  |-- go readPump()   -- reads messages from WebSocket, dispatches to handler
  |
  Ping/Pong keepalive: pingPeriod = 54s, pongWait = 60s
  Max message size: 512 KB
  Send buffer: 256 messages
  Write deadline: 10s per message
```

### Conversation Creation

```
CreateConversation(taskID, posterID, taskerID):
  1. Check if conversation already exists for this task
     - If yes, return existing (idempotent)
  2. Create new Conversation record
```

Conversations are 1:1 between poster and tasker, scoped to a single task.

---

## 9. Notification System

**Source:** `server/internal/services/notification.go`, `server/internal/handlers/notification.go`, `server/internal/websocket/hub.go`

### Notification Types

| Type | Triggered By | Recipient |
|---|---|---|
| `task_created` | `CreateTask` | Task creator (confirmation) |
| `application_received` | `ApplyForTask` | Task requester |
| `application_sent` | `ApplyForTask` | Applicant (confirmation) |
| `application_accepted` | `AcceptApplication` | Accepted tasker |
| `task_completed` | `CompleteTask` | Both requester and tasker |
| `payment_received` | `ReleasePayment` | Tasker (payee) |
| `task_cancelled` | `DeleteTask` | Rejected applicants |

### Dispatch Points

```
CreateTask       → task_created (to requester)
ApplyForTask     → application_received (to requester)
                 → application_sent (to applicant)
AcceptApplication → application_accepted (to tasker)
CompleteTask     → task_completed (to requester and tasker)
DeleteTask       → task_cancelled (to all rejected applicants)
ReleasePayment   → payment_received (to tasker)
```

### Delivery Channels

Notifications are delivered through two channels:

1. **REST API** -- `GET /notifications` returns paginated notification history for the authenticated user
2. **Real-time WebSocket** -- notifications are broadcast via the WebSocket `Hub.Broadcast` channel to connected clients

### Failure Handling

All notification dispatches are **non-critical**. If a notification fails to create or deliver:

- The error is **logged** for debugging
- The main operation (task creation, payment release, etc.) is **NOT blocked or rolled back**
- This follows the same non-critical pattern as user statistics computation (logged on failure, does not block)

```
// Pseudocode for non-critical notification dispatch
result, err := mainOperation(...)
if err != nil:
  return err  // main operation failure IS critical

notifyErr := notificationService.Create(notification)
if notifyErr != nil:
  log.Printf("failed to send notification: %v", notifyErr)
  // do NOT return error — main operation already succeeded

return result
```

---

## 10. Debounced Marketplace Search

**Source:** `android/.../viewmodels/TaskListViewModel.kt`, `android/.../screens/HomeScreen.kt`, `server/internal/repository/task_gorm.go`

### Client-Side Debounce (Android)

Search input is debounced in the ViewModel using Kotlin `Flow.debounce()`:

```
_searchQueryText (MutableStateFlow<String>)
  |
  .drop(1)              -- skip initial empty value (avoids duplicate load on init)
  .debounce(1000)       -- wait 1 second after last keystroke
  .distinctUntilChanged() -- skip if query hasn't actually changed
  .collect { query ->
    uiState.searchQuery = query.ifBlank { null }
    loadTasks(refresh = true)
  }
```

**Key behaviors:**
- User types → each keystroke updates `_searchQueryText`
- Timer resets on every keystroke — API only fires after 1 second of silence
- Empty/blank query → `searchQuery = null` → loads all tasks (no filter)
- Clear button sets `_searchQueryText = ""` → flows through pipeline → restores full list

### Server-Side Search (Meilisearch with PostgreSQL Fallback)

```
ListTasks(filters):
  if filters.Search is present:
    1. Try searchService.SearchTasks(query, filters)
       - If Meilisearch configured and returns results → GetByIDs(taskIDs) with relevance order preserved
       - If Meilisearch errors → log, fall through to PostgreSQL LIKE
       - If NoOpSearchService → fall through to PostgreSQL LIKE
    2. Fallback: PostgreSQL LIKE
       searchPattern = "%" + LOWER(search) + "%"
       WHERE LOWER(title) LIKE searchPattern OR LOWER(description) LIKE searchPattern
```

- When Meilisearch is configured: full-text relevance-ranked search with typo tolerance
- When not configured or on error: case-insensitive substring match via PostgreSQL `LIKE`
- Compatible with all other filters (category, status, price range, pagination)
- See [Section 11: Meilisearch Integration](#11-meilisearch-integration) for details

---

## Transaction Status State Machine

```
pending ──> success    (payment completed)
   |
   +──> failed        (payment error, stored with failure_reason)
   |
   +──> cancelled     (payment cancelled)
```

### Transaction Types

| Type | Description |
|---|---|
| `escrow` | Funds held when application accepted |
| `release` | Funds released to tasker on completion |
| `refund` | Funds returned to requester on cancellation |
| `platform_fee` | Platform fee recorded on release |
| `deposit` | Funds added to wallet |
| `withdrawal` | Funds removed from wallet |

---

## Validation Hooks (GORM BeforeCreate / BeforeUpdate)

All models enforce validation on create and update via GORM hooks:

| Model | Key Validations |
|---|---|
| User | email format, name length <= 100, password hash required, rating 0-5, tasker bio <= 500, skills <= 10 |
| Task | title required (max 200), description required (max 2000), price > 0, location required (max 255), valid status, images <= 5 |
| TaskApplication | task_id required, tasker_id required, proposed_price > 0 if set, message <= 500, valid status |
| Wallet | user_id required, all balances >= 0 |
| WalletTransaction | wallet_id required, amount != 0, valid type, all balance snapshots >= 0 |
| Transaction | payer_id required, amount > 0, platform_fee >= 0, net_amount >= 0, valid type/status. BeforeCreate also calls `CalculateNetAmount()` |

---

## 11. Meilisearch Integration

**Source:** `server/internal/services/search.go`, `server/internal/services/task.go`, `server/internal/repository/task_gorm.go`

### Interface Pattern

`SearchServicer` follows the same pattern as `PayOSServicer`:

```go
type SearchServicer interface {
    IndexTask(ctx, task) error
    DeleteTask(ctx, taskID) error
    SearchTasks(ctx, query, filters) (taskIDs []int64, total int, err error)
    BulkIndexTasks(ctx, tasks) error
}
```

Two implementations:
- `MeilisearchService` -- connects to Meilisearch, configures index on init
- `NoOpSearchService` -- returns `(nil, 0, nil)` for all methods; signals caller to use LIKE fallback

### Index Configuration

Index UID: `tasks`

| Attribute Type | Fields |
|---|---|
| Searchable | `title`, `description` |
| Filterable | `category_id`, `status`, `price` |
| Sortable | `price`, `created_at` |

Document schema: `{id, title, description, category_id, status, price, location, created_at}`.

### Sync Hooks

| Event | Hook | Method |
|---|---|---|
| Task created | After `taskRepo.Create` | `searchService.IndexTask(task)` |
| Task updated | After `taskRepo.Update` | `searchService.IndexTask(task)` |
| Task cancelled/completed | After status change | `searchService.DeleteTask(taskID)` |
| Task deleted (soft) | After `DeleteTask` | `searchService.DeleteTask(taskID)` |

All sync hooks are **non-critical** -- errors are logged but do not block the main operation.

### Search Flow

```
SearchTasks(query, filters):
  1. Build Meilisearch filter string from filters (category_id, status, price range)
  2. Execute search with query, filter, limit, offset
  3. Extract task IDs from hits (preserves relevance order)
  4. Return (taskIDs, estimatedTotalHits, nil)
```

### Relevance Order Preservation

`GetByIDs` in `TaskGormRepository` preserves the caller's ordering:

```
GetByIDs(ids):
  1. SELECT * FROM tasks WHERE id IN (ids)  -- unordered
  2. Build idOrder map: id → position from input slice
  3. Sort results by idOrder to match Meilisearch relevance ranking
```

### Fallback Logic in ListTasks

```
if search query present:
  result = searchService.SearchTasks(query, filters)
  if error → log, fall through to PostgreSQL LIKE
  if results > 0 → GetByIDs(taskIDs), return with relevance order
  if results == 0 AND not NoOp → return empty (genuine no-match)
  if NoOp → fall through to PostgreSQL LIKE
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MEILISEARCH_URL` | No | Meilisearch URL (e.g., `http://localhost:7700`). Empty = NoOp fallback |
| `MEILISEARCH_API_KEY` | No | Meilisearch API key. Empty = no auth |

---

**Document Version:** 2.3
**Last Updated:** 2026-02-17
**Source of Truth:** Go source code in `server/internal/`
