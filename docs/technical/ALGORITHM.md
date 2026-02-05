# ALGORITHM.md - Core Algorithms

> Comprehensive documentation of all algorithms used in the Minijob platform
>
> Last updated: 2026-02-04

## Table of Contents

1. [Payment & Fee Calculation Algorithms](#1-payment--fee-calculation-algorithms)
2. [Task Search & Filtering Algorithm](#2-task-search--filtering-algorithm)
3. [Rating Aggregation Algorithm](#3-rating-aggregation-algorithm)
4. [Escrow Payment Flow Algorithm](#4-escrow-payment-flow-algorithm)
5. [Wallet Balance Management Algorithm](#5-wallet-balance-management-algorithm)
6. [Task Application Matching Algorithm](#6-task-application-matching-algorithm)
7. [Message Delivery & Read Status Algorithm](#7-message-delivery--read-status-algorithm)

---

## 1. Payment & Fee Calculation Algorithms

### 1.1 Escrow Payment Algorithm

**Purpose:** Transfer funds from requester's wallet to escrow wallet when task is accepted.

**Location:** `backend/app/services/mock_payment.py:126-210`

**Algorithm:**

```
ESCROW_PAYMENT(task, payer):
    INPUT: task (Task object), payer (User object)
    OUTPUT: transaction result (dict)

    1. Get wallets:
       payer_wallet = get_or_create_user_wallet(payer.id)
       escrow_wallet = get_or_create_escrow_wallet()

    2. Validate balance:
       amount = task.price
       IF payer_wallet.available_balance < amount THEN
          RETURN {success: false, error: "Insufficient balance"}
       END IF

    3. Generate reference ID:
       reference_id = "ESC-{task.id}-{timestamp}"

    4. Execute atomic transaction:
       BEGIN_TRANSACTION
          a. Debit payer wallet:
             payer_wallet.balance -= amount
             record_transaction(payer_wallet, ESCROW_HOLD, amount, "debit")

          b. Credit escrow wallet:
             escrow_wallet.balance += amount
             record_transaction(escrow_wallet, ESCROW_HOLD, amount, "credit")

          c. Create transaction record:
             transaction = new Transaction(
                task_id=task.id,
                payer_id=payer.id,
                payee_id=task.tasker_id,
                amount=amount,
                type=ESCROW,
                status=SUCCESS,
                zalopay_trans_id="MOCK-{reference_id}"
             )

          d. Update task status:
             task.status = IN_PROGRESS
       COMMIT_TRANSACTION

    5. RETURN {success: true, transaction_id, reference_id, amount}
```

**Complexity:** O(1) - Constant time operations (database updates with indexed lookups)

**Atomicity:** Uses database transaction to ensure all-or-nothing execution. If any step fails, entire transaction is rolled back.

**Code Snippet (lines 126-210):**

```python
def create_escrow_payment(self, task: Task, payer: User) -> dict:
    try:
        payer_wallet = self.get_or_create_user_wallet(payer.id)
        escrow_wallet = self.get_or_create_escrow_wallet()
        amount = task.price

        # Check balance
        if payer_wallet.available_balance < amount:
            return {"success": False, "error": f"Insufficient balance"}

        # Generate reference ID
        reference_id = f"ESC-{task.id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"

        # Atomic operations
        payer_wallet.balance -= amount
        escrow_wallet.balance += amount
        # ... transaction recording ...

        self.db.commit()
        return {"success": True, ...}
    except Exception as e:
        self.db.rollback()
        return {"success": False, "error": str(e)}
```

---

### 1.2 Release Payment with Platform Fee Algorithm

**Purpose:** Release funds from escrow to tasker with 10% platform fee deduction when task is completed.

**Location:** `backend/app/services/mock_payment.py:211-318`

**Algorithm:**

```
RELEASE_PAYMENT(task, requester):
    INPUT: task (Task object), requester (User object)
    OUTPUT: payment result (dict)

    1. Get wallets:
       escrow_wallet = get_or_create_escrow_wallet()
       tasker_wallet = get_or_create_user_wallet(task.tasker_id)
       platform_wallet = get_or_create_platform_wallet()

    2. Find escrow transaction:
       escrow_transaction = query(Transaction)
          WHERE task_id=task.id AND type=ESCROW AND status=SUCCESS
       IF escrow_transaction is null THEN
          RETURN {success: false, error: "Escrow transaction not found"}
       END IF

    3. Calculate fees:
       amount = escrow_transaction.amount
       platform_fee = ⌊amount × PLATFORM_FEE_PERCENT / 100⌋  // Integer division
       tasker_amount = amount - platform_fee

    4. Generate reference ID:
       reference_id = "REL-{task.id}-{timestamp}"

    5. Execute three-way transfer:
       BEGIN_TRANSACTION
          a. Debit escrow:
             escrow_wallet.balance -= amount
             record_transaction(escrow_wallet, ESCROW_RELEASE, amount, "debit")

          b. Credit tasker (90%):
             tasker_wallet.balance += tasker_amount
             record_transaction(tasker_wallet, ESCROW_RELEASE, tasker_amount, "credit")

          c. Credit platform (10%):
             platform_wallet.balance += platform_fee
             record_transaction(platform_wallet, PLATFORM_FEE, platform_fee, "credit")

          d. Create release transaction:
             release_transaction = new Transaction(...)

          e. Update escrow transaction:
             escrow_transaction.status = RELEASED

          f. Update tasker stats:
             task.tasker.total_earnings += tasker_amount
       COMMIT_TRANSACTION

    6. RETURN {success: true, total_amount, platform_fee, tasker_amount}
```

**Fee Formula:**

```
Given:
  amount = total payment held in escrow
  PLATFORM_FEE_PERCENT = 10 (constant)

Calculate:
  platform_fee = ⌊amount × 10 / 100⌋
  tasker_amount = amount - platform_fee

Example:
  amount = 50,000 VND
  platform_fee = ⌊50,000 × 10 / 100⌋ = 5,000 VND
  tasker_amount = 50,000 - 5,000 = 45,000 VND
```

**Complexity:** O(1) - Constant time operations

**Invariant Preservation:**
```
amount = tasker_amount + platform_fee
escrow_wallet.balance_before = escrow_wallet.balance_after + amount
tasker_wallet.balance_after = tasker_wallet.balance_before + tasker_amount
platform_wallet.balance_after = platform_wallet.balance_before + platform_fee
```

**Code Snippet (lines 211-318):**

```python
def release_payment(self, task: Task, requester: User) -> dict:
    try:
        escrow_wallet = self.get_or_create_escrow_wallet()
        tasker_wallet = self.get_or_create_user_wallet(task.tasker_id)
        platform_wallet = self.get_or_create_platform_wallet()

        # Calculate fees (line 242-243)
        platform_fee = (amount * self.platform_fee_percent) // 100  # Integer division
        tasker_amount = amount - platform_fee

        # Three-way transfer (lines 248-281)
        escrow_wallet.balance -= amount
        tasker_wallet.balance += tasker_amount
        platform_wallet.balance += platform_fee

        # Update stats (lines 299-300)
        if task.tasker:
            task.tasker.total_earnings += tasker_amount

        self.db.commit()
        return {"success": True, "platform_fee": platform_fee, "tasker_amount": tasker_amount}
    except Exception as e:
        self.db.rollback()
        return {"success": False, "error": str(e)}
```

---

### 1.3 Refund Algorithm

**Purpose:** Return funds from escrow to requester when task is cancelled.

**Location:** `backend/app/services/mock_payment.py:319-402`

**Algorithm:**

```
REFUND_PAYMENT(task, reason):
    INPUT: task (Task object), reason (string, optional)
    OUTPUT: refund result (dict)

    1. Find escrow transaction:
       escrow_transaction = query(Transaction)
          WHERE task_id=task.id AND type=ESCROW AND status=SUCCESS
       IF escrow_transaction is null THEN
          RETURN {success: true, message: "No transaction to refund"}
       END IF

    2. Get wallets:
       escrow_wallet = get_or_create_escrow_wallet()
       requester_wallet = get_or_create_user_wallet(task.requester_id)

    3. Generate reference ID:
       reference_id = "REF-{task.id}-{timestamp}"

    4. Execute refund:
       amount = escrow_transaction.amount
       BEGIN_TRANSACTION
          a. Debit escrow:
             escrow_wallet.balance -= amount
             record_transaction(escrow_wallet, ESCROW_REFUND, amount, "debit")

          b. Credit requester:
             requester_wallet.balance += amount
             record_transaction(requester_wallet, ESCROW_REFUND, amount, "credit")

          c. Create refund transaction:
             refund_transaction = new Transaction(
                task_id=task.id,
                payer_id=task.requester_id,
                payee_id=task.requester_id,  // Self-refund
                amount=amount,
                type=REFUND,
                status=SUCCESS
             )

          d. Update escrow transaction:
             escrow_transaction.status = REFUNDED
       COMMIT_TRANSACTION

    5. RETURN {success: true, amount}
```

**Complexity:** O(1) - Constant time

**Idempotency:** If escrow transaction not found or already refunded, returns success without error.

**Code Snippet (lines 319-402):**

```python
def refund_payment(self, task: Task, reason: str = None) -> dict:
    try:
        # Find transaction (lines 333-337)
        escrow_transaction = self.db.query(Transaction).filter(
            Transaction.task_id == task.id,
            Transaction.type == TransactionType.ESCROW.value,
            Transaction.status == TransactionStatus.SUCCESS.value
        ).first()

        if not escrow_transaction:
            return {"success": True, "message": "No transaction to refund"}

        # Execute refund (lines 349-386)
        escrow_wallet.balance -= amount
        requester_wallet.balance += amount
        escrow_transaction.status = TransactionStatus.REFUNDED.value

        self.db.commit()
        return {"success": True, "amount": amount}
    except Exception as e:
        self.db.rollback()
        return {"success": False, "error": str(e)}
```

---

### 1.4 Balance Calculation Algorithm

**Purpose:** Calculate available balance (total balance minus frozen funds).

**Location:** `backend/app/models/wallet.py:60-63`

**Algorithm:**

```
AVAILABLE_BALANCE(wallet):
    INPUT: wallet (Wallet object)
    OUTPUT: available_balance (integer)

    available_balance = wallet.balance - wallet.frozen_balance
    RETURN available_balance
```

**Mathematical Formula:**

```
available_balance = balance - frozen_balance

Where:
  balance = total funds in wallet
  frozen_balance = funds held in escrow or pending operations
  available_balance = funds that can be spent

Invariants:
  0 ≤ frozen_balance ≤ balance
  0 ≤ available_balance ≤ balance
  available_balance + frozen_balance = balance
```

**Complexity:** O(1) - Computed property, no database query

**Code Snippet (lines 60-63):**

```python
@property
def available_balance(self) -> int:
    """Balance available for use (excluding frozen)."""
    return self.balance - self.frozen_balance
```

**Use Cases:**
- Check before creating escrow payment (line 146 in mock_payment.py)
- Display to user in wallet UI
- Prevent overdraft

---

## 2. Task Search & Filtering Algorithm

**Purpose:** Efficiently search and filter tasks with pagination and sorting.

**Location:** `backend/app/routers/tasks.py:31-113`

**Algorithm:**

```
LIST_TASKS(filters, sort, order, page, limit):
    INPUT:
      filters = {status, category_ids[], search, min_price, max_price}
      sort = field name (default: "created_at")
      order = "asc" or "desc" (default: "desc")
      page = page number (≥ 1)
      limit = items per page (1-100)
    OUTPUT:
      {data: [tasks], meta: {page, limit, total, total_pages}}

    1. Build base query:
       query = SELECT tasks
       JOIN requester, category

    2. Apply filters sequentially:
       a. Status filter:
          IF status provided THEN
             query = query WHERE status = status
          ELSE
             query = query WHERE status = OPEN  // Default
          END IF

       b. Category filter (multiple):
          IF category_ids not empty THEN
             query = query WHERE category_id IN category_ids
          ELSE IF category_id provided THEN
             query = query WHERE category_id = category_id
          END IF

       c. Search filter (case-insensitive):
          IF search provided THEN
             query = query WHERE title ILIKE "%{search}%"  // PostgreSQL/SQLite
          END IF

       d. Price range filter:
          IF min_price provided THEN
             query = query WHERE price >= min_price
          END IF
          IF max_price provided THEN
             query = query WHERE price <= max_price
          END IF

    3. Count total (before pagination):
       total = query.count()

    4. Apply sorting:
       sort_column = getattr(Task, sort, Task.created_at)
       IF order = "asc" THEN
          query = query ORDER BY sort_column ASC
       ELSE
          query = query ORDER BY sort_column DESC
       END IF

    5. Apply pagination:
       offset = (page - 1) × limit
       tasks = query.offset(offset).limit(limit).all()

    6. Enrich with application counts:
       task_ids = [t.id for t in tasks]
       app_counts = SELECT task_id, COUNT(*)
                    FROM task_applications
                    WHERE task_id IN task_ids
                    GROUP BY task_id

       FOR each task in tasks DO
          task.application_count = app_counts[task.id] or 0
       END FOR

    7. Calculate pagination metadata:
       total_pages = ⌈total / limit⌉

    8. RETURN {data: tasks, meta: {page, limit, total, total_pages}}
```

**Complexity Analysis:**

Let:
- n = total number of tasks in database
- m = number of tasks after filtering
- k = number of tasks returned (k = min(m, limit))
- c = number of categories in filter

Time complexity:
```
T(n, m, c) = O(n) + O(m log m) + O(k)
           = O(n + m log m)

Where:
  O(n) = filtering operations (sequential scan if no index)
  O(m log m) = sorting filtered results
  O(k) = pagination + application count join
```

With database indexes:
```
T_indexed(n, m, c) = O(log n + c·log n + m log m + k)
                   = O(c·log n + m log m + k)

Where:
  O(log n) = index lookup for status
  O(c·log n) = category filter with index
  O(m log m) = sorting (cannot avoid)
  O(k) = limit clause + enrichment
```

**Space Complexity:** O(k) - Only stores limited results in memory

**Optimization Strategies:**

1. **Database Indexes:**
   ```sql
   CREATE INDEX idx_tasks_status ON tasks(status);
   CREATE INDEX idx_tasks_category ON tasks(category_id);
   CREATE INDEX idx_tasks_price ON tasks(price);
   CREATE INDEX idx_tasks_created_at ON tasks(created_at);
   CREATE INDEX idx_applications_task ON task_applications(task_id);
   ```

2. **ILIKE Performance:**
   - For search, uses `ILIKE "%search%"` (case-insensitive)
   - Cannot use index efficiently (full table scan)
   - Consider full-text search for large datasets:
     ```sql
     CREATE INDEX idx_tasks_title_fts ON tasks USING gin(to_tsvector('english', title));
     ```

3. **Count Optimization:**
   - `query.count()` executes separate COUNT(*) query
   - For very large datasets, consider approximate counts or caching

**Code Snippet (lines 31-113):**

```python
@router.get("", response_model=PaginatedResponse[TaskListResponse])
async def list_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    category_ids: Optional[List[int]] = Query(None),
    search: Optional[str] = Query(None),
    min_price: Optional[int] = Query(None, ge=0),
    max_price: Optional[int] = Query(None, le=10000000),
    sort: str = Query("created_at"),
    order: str = Query("desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    query = db.query(Task).options(joinedload(Task.requester), joinedload(Task.category))

    # Filters (lines 52-72)
    if status:
        query = query.filter(Task.status == status)
    else:
        query = query.filter(Task.status == TaskStatus.OPEN.value)

    if category_ids and len(category_ids) > 0:
        query = query.filter(Task.category_id.in_(category_ids))
    elif category_id:
        query = query.filter(Task.category_id == category_id)

    if search:
        query = query.filter(Task.title.ilike(f"%{search}%"))

    if min_price is not None:
        query = query.filter(Task.price >= min_price)
    if max_price is not None:
        query = query.filter(Task.price <= max_price)

    # Count (line 75)
    total = query.count()

    # Sort (lines 78-82)
    sort_column = getattr(Task, sort, Task.created_at)
    if order == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    # Paginate (lines 85-86)
    offset = (page - 1) * limit
    tasks = query.offset(offset).limit(limit).all()

    # Application counts (lines 89-95)
    task_ids = [t.id for t in tasks]
    app_counts = dict(
        db.query(TaskApplication.task_id, func.count(TaskApplication.id))
        .filter(TaskApplication.task_id.in_(task_ids))
        .group_by(TaskApplication.task_id)
        .all()
    )

    # Enrich (lines 98-102)
    task_list = []
    for task in tasks:
        task_data = TaskListResponse.model_validate(task)
        task_data.application_count = app_counts.get(task.id, 0)
        task_list.append(task_data)

    # Return (lines 104-113)
    return PaginatedResponse(
        data=task_list,
        meta=PaginationMeta(
            page=page,
            limit=limit,
            total=total,
            total_pages=(total + limit - 1) // limit  # Ceiling division
        )
    )
```

**Edge Cases Handled:**

1. **Empty category_ids:** Line 60 checks `len(category_ids) > 0`
2. **No results:** Returns empty array with total=0
3. **Page beyond range:** Returns empty results (SQLAlchemy handles gracefully)
4. **Invalid sort field:** Falls back to `created_at` (line 78)
5. **Division by zero in total_pages:** Not possible (limit ≥ 1 enforced by Query validation)

---

## 3. Rating Aggregation Algorithm

**Purpose:** Calculate and update user ratings based on reviews.

**Current Implementation:** Denormalized (rating stored in User table)

**Location:** `backend/app/models/user.py:30` (storage), Reviews calculated externally

**Algorithm (Inferred from Schema):**

```
UPDATE_USER_RATING(user_id, new_review):
    INPUT: user_id (integer), new_review (Review object)
    OUTPUT: updated_rating (float)

    1. Get all reviews for user:
       reviews = SELECT * FROM reviews
                 WHERE reviewee_id = user_id

    2. Calculate average:
       total_rating = SUM(reviews.rating)
       count = COUNT(reviews)

       IF count > 0 THEN
          average_rating = total_rating / count
       ELSE
          average_rating = 5.0  // Default for new users
       END IF

    3. Update user record:
       UPDATE users
       SET rating = average_rating
       WHERE id = user_id

    4. RETURN average_rating
```

**Mathematical Formula:**

```
Given n reviews with ratings r₁, r₂, ..., rₙ (each rᵢ ∈ {1, 2, 3, 4, 5}):

average_rating = (Σᵢ₌₁ⁿ rᵢ) / n

Properties:
  1 ≤ average_rating ≤ 5
  average_rating ∈ ℝ (floating point)
```

**Complexity:**

**Current (Denormalized):**
- **Update on new review:** O(n) where n = number of reviews for user
  - Must recalculate average from all reviews
- **Read rating:** O(1) - direct field access

**Alternative (Normalized):**
```sql
-- Compute on-the-fly
SELECT AVG(rating) FROM reviews WHERE reviewee_id = user_id
```
- **Update on new review:** O(1) - just insert review
- **Read rating:** O(n) - aggregate query

**Recommendation:** Current denormalized approach is better for read-heavy workload (ratings displayed frequently).

**Implementation Notes:**

The codebase currently stores `rating` as a Float field in User model (line 30):

```python
rating = Column(Float, default=5.0)
```

However, there's no explicit rating update logic in the routers. The rating update would need to be implemented when reviews are created. Expected implementation:

```python
def create_review(task_id, rating, comment):
    # ... create review ...

    # Update reviewee's rating
    reviews = db.query(Review).filter(Review.reviewee_id == reviewee_id).all()
    total = sum(r.rating for r in reviews)
    count = len(reviews)
    user.rating = total / count if count > 0 else 5.0

    db.commit()
```

**Edge Cases:**

1. **No reviews yet:** Default to 5.0 (line 30 default)
2. **Single review:** Rating = that review's rating
3. **Precision:** Store as Float for accurate average (not rounded)

---

## 4. Escrow Payment Flow Algorithm

**Purpose:** Complete multi-wallet transaction flow for task payments.

**Location:** Combined flow across multiple functions in `mock_payment.py`

**Full Transaction Flow:**

```
ESCROW_PAYMENT_FLOW(task, requester, tasker):
    INPUT: task, requester (User), tasker (User)
    OUTPUT: final state of all wallets

    PHASE 1: TASK ACCEPTED (Escrow Creation)
    ========================================
    State Before:
      requester_wallet.balance = R
      escrow_wallet.balance = E
      tasker_wallet.balance = T
      platform_wallet.balance = P

    Execute:
      1. requester_wallet.balance = R - task.price
      2. escrow_wallet.balance = E + task.price
      3. task.status = IN_PROGRESS

    State After:
      requester_wallet.balance = R - task.price
      escrow_wallet.balance = E + task.price
      tasker_wallet.balance = T  (unchanged)
      platform_wallet.balance = P  (unchanged)


    PHASE 2: TASK COMPLETED (Release Payment)
    ==========================================
    Calculate:
      platform_fee = ⌊task.price × 10 / 100⌋
      tasker_amount = task.price - platform_fee

    State Before:
      requester_wallet.balance = R - task.price
      escrow_wallet.balance = E + task.price
      tasker_wallet.balance = T
      platform_wallet.balance = P

    Execute:
      1. escrow_wallet.balance = E + task.price - task.price = E
      2. tasker_wallet.balance = T + tasker_amount
      3. platform_wallet.balance = P + platform_fee
      4. task.status = COMPLETED
      5. tasker.total_earnings += tasker_amount

    State After:
      requester_wallet.balance = R - task.price  (unchanged from Phase 1)
      escrow_wallet.balance = E  (back to original)
      tasker_wallet.balance = T + (task.price × 0.9)
      platform_wallet.balance = P + (task.price × 0.1)


    PHASE 2 ALTERNATIVE: TASK CANCELLED (Refund)
    =============================================
    State Before:
      requester_wallet.balance = R - task.price
      escrow_wallet.balance = E + task.price
      tasker_wallet.balance = T
      platform_wallet.balance = P

    Execute:
      1. escrow_wallet.balance = E + task.price - task.price = E
      2. requester_wallet.balance = R - task.price + task.price = R
      3. task.status = CANCELLED

    State After:
      requester_wallet.balance = R  (fully refunded)
      escrow_wallet.balance = E  (back to original)
      tasker_wallet.balance = T  (unchanged)
      platform_wallet.balance = P  (unchanged)
```

**Invariant Preservation:**

```
Global Money Conservation Law:
  Σ(all wallets) = constant

Proof for Phase 1 (Escrow):
  Before: R + E + T + P = S
  After:  (R - task.price) + (E + task.price) + T + P
        = R + E + T + P
        = S  ✓

Proof for Phase 2a (Release):
  Before: (R - task.price) + (E + task.price) + T + P = S
  After:  (R - task.price) + E + (T + tasker_amount) + (P + platform_fee)
        = R - task.price + E + T + tasker_amount + P + platform_fee
        = R - task.price + E + T + (task.price - platform_fee) + P + platform_fee
        = R + E + T + P
        = S  ✓

Proof for Phase 2b (Refund):
  Before: (R - task.price) + (E + task.price) + T + P = S
  After:  R + E + T + P
        = S  ✓
```

**Reference ID Generation:**

```
GENERATE_REFERENCE_ID(prefix, task_id):
    timestamp = current_datetime.format("%Y%m%d%H%M%S")
    reference_id = "{prefix}-{task_id}-{timestamp}"
    RETURN reference_id

Examples:
  "ESC-42-20260204153000"  // Escrow for task 42
  "REL-42-20260204160000"  // Release for task 42
  "REF-42-20260204155500"  // Refund for task 42
```

**Transaction Atomicity:**

All operations wrapped in database transactions:

```python
try:
    # Multiple wallet updates
    wallet1.balance += amount1
    wallet2.balance -= amount2
    db.commit()  # Atomic commit
except Exception:
    db.rollback()  # Rollback all changes
```

**Code Reference:**

- Escrow: `mock_payment.py:126-210`
- Release: `mock_payment.py:211-318`
- Refund: `mock_payment.py:319-402`
- Reference ID: Lines 153, 245, 347

**Complexity:** O(1) for entire flow (fixed number of wallet updates)

---

## 5. Wallet Balance Management Algorithm

**Purpose:** Manage wallet balances with atomic updates and transaction history.

**Location:** `backend/app/models/wallet.py`, `backend/app/services/mock_payment.py`

**5.1 Balance Update Algorithm:**

```
UPDATE_BALANCE(wallet, amount, direction, type, description):
    INPUT:
      wallet (Wallet object)
      amount (positive integer)
      direction ("credit" or "debit")
      type (transaction type enum)
      description (string)
    OUTPUT:
      updated wallet balance

    1. Validate amount:
       ASSERT amount > 0

    2. Update balance atomically:
       BEGIN_TRANSACTION
          IF direction = "credit" THEN
             wallet.balance += amount
          ELSE IF direction = "debit" THEN
             IF wallet.available_balance < amount THEN
                ROLLBACK_TRANSACTION
                RETURN error
             END IF
             wallet.balance -= amount
          END IF

          balance_after = wallet.balance

          // Record transaction history
          transaction = new WalletTransaction(
             wallet_id=wallet.id,
             type=type,
             amount=amount,
             direction=direction,
             balance_after=balance_after,
             description=description,
             reference_id=generate_uuid()
          )

          wallet.updated_at = current_timestamp
       COMMIT_TRANSACTION

    3. RETURN wallet.balance
```

**Complexity:** O(1) - Single row update with index

**Code Snippet (`mock_payment.py:102-124`):**

```python
def _record_transaction(
    self,
    wallet: Wallet,
    trans_type: str,
    amount: int,
    direction: str,
    description: str = None,
    task_id: int = None,
    reference_id: str = None
) -> WalletTransaction:
    """Record a wallet transaction."""
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        type=trans_type,
        amount=amount,
        direction=direction,
        balance_after=wallet.balance,  # Snapshot after update
        task_id=task_id,
        description=description,
        reference_id=reference_id or str(uuid.uuid4())[:8]
    )
    self.db.add(transaction)
    return transaction
```

---

**5.2 Wallet Creation Algorithm:**

```
GET_OR_CREATE_USER_WALLET(user_id):
    INPUT: user_id (integer)
    OUTPUT: wallet (Wallet object)

    1. Try to find existing wallet:
       wallet = SELECT * FROM wallets
                WHERE user_id = user_id AND type = USER

    2. If not found, create with initial balance:
       IF wallet is null THEN
          BEGIN_TRANSACTION
             wallet = new Wallet(
                user_id=user_id,
                type=USER,
                balance=INITIAL_BALANCE  // From config
             )
             INSERT wallet

             // Record initial deposit
             transaction = new WalletTransaction(
                wallet_id=wallet.id,
                type=DEPOSIT,
                amount=INITIAL_BALANCE,
                direction="credit",
                balance_after=INITIAL_BALANCE,
                description="Initial balance (Mock)"
             )
             INSERT transaction
          COMMIT_TRANSACTION
       END IF

    3. RETURN wallet
```

**Complexity:** O(1) - Index lookup or single insert

**Code Snippet (`mock_payment.py:35-62`):**

```python
def get_or_create_user_wallet(self, user_id: int) -> Wallet:
    """Get user's wallet or create one with initial balance."""
    wallet = self.db.query(Wallet).filter(
        Wallet.user_id == user_id,
        Wallet.type == WalletType.USER.value
    ).first()

    if not wallet:
        wallet = Wallet(
            user_id=user_id,
            type=WalletType.USER.value,
            balance=settings.MOCK_INITIAL_BALANCE  # Default: 1,000,000 VND
        )
        self.db.add(wallet)
        self.db.commit()
        self.db.refresh(wallet)

        # Record initial deposit
        self._record_transaction(
            wallet=wallet,
            trans_type=WalletTransactionType.DEPOSIT.value,
            amount=settings.MOCK_INITIAL_BALANCE,
            direction="credit",
            description="Initial balance (Mock)"
        )

    return wallet
```

---

**5.3 Transaction History Query:**

```
GET_WALLET_HISTORY(user_id, limit):
    INPUT: user_id (integer), limit (integer, default=20)
    OUTPUT: list of transactions

    1. Get user's wallet:
       wallet = get_or_create_user_wallet(user_id)

    2. Query transactions with pagination:
       transactions = SELECT * FROM wallet_transactions
                      WHERE wallet_id = wallet.id
                      ORDER BY created_at DESC
                      LIMIT limit

    3. Format results:
       RETURN [
          {
             id, type, amount, direction,
             balance_after, description,
             created_at
          }
          for each transaction
       ]
```

**Complexity:** O(log n + k) where n = total transactions, k = limit
- O(log n) for index lookup and sorting
- O(k) for fetching k results

**Optimization:** Index on `(wallet_id, created_at DESC)`

**Code Snippet (`mock_payment.py:448-467`):**

```python
def get_wallet_history(self, user_id: int, limit: int = 20) -> list:
    """Get user's wallet transaction history."""
    wallet = self.get_or_create_user_wallet(user_id)

    transactions = self.db.query(WalletTransaction).filter(
        WalletTransaction.wallet_id == wallet.id
    ).order_by(WalletTransaction.created_at.desc()).limit(limit).all()

    return [
        {
            "id": t.id,
            "type": t.type,
            "amount": t.amount,
            "direction": t.direction,
            "balance_after": t.balance_after,
            "description": t.description,
            "created_at": t.created_at.isoformat()
        }
        for t in transactions
    ]
```

---

## 6. Task Application Matching Algorithm

**Purpose:** Match taskers to tasks through application/acceptance flow.

**Location:** `backend/app/routers/tasks.py:469-548`

**Algorithm:**

```
ACCEPT_APPLICATION(task_id, application_id, requester):
    INPUT:
      task_id (integer)
      application_id (integer)
      requester (User object)
    OUTPUT:
      acceptance result

    1. Validate task:
       task = SELECT * FROM tasks WHERE id = task_id
       ASSERT task exists
       ASSERT task.requester_id = requester.id  // Authorization
       ASSERT task.status = OPEN  // Can only accept for open tasks

    2. Validate application:
       application = SELECT * FROM task_applications
                     WHERE id = application_id AND task_id = task_id
       ASSERT application exists

    3. Get other applications (for rejection):
       rejected_applications = SELECT * FROM task_applications
                               WHERE task_id = task_id
                               AND id != application_id

    4. Execute acceptance:
       BEGIN_TRANSACTION
          a. Accept chosen application:
             application.status = ACCEPTED

          b. Update task:
             task.tasker_id = application.tasker_id
             task.status = ACCEPTED

             // Use proposed price if provided
             IF application.proposed_price is not null THEN
                task.price = application.proposed_price
             END IF

          c. Reject all other applications:
             UPDATE task_applications
             SET status = REJECTED
             WHERE task_id = task_id AND id != application_id
       COMMIT_TRANSACTION

    5. Send notifications:
       // Notify accepted tasker
       notify_application_accepted(task, application.tasker)

       // Notify rejected taskers
       FOR each rejected_app in rejected_applications DO
          notify_application_rejected(task, rejected_app.tasker)
       END FOR

    6. RETURN success
```

**State Transition Diagram:**

```
Task Status Flow:
  OPEN → ACCEPTED → IN_PROGRESS → COMPLETED
       ↓
       CANCELLED

Application Status Flow:
  PENDING → ACCEPTED  (chosen one)
       ↓
       REJECTED  (all others when one is accepted)
```

**Complexity:**

Let:
- n = number of applications for the task

Time complexity:
```
T(n) = O(1) + O(1) + O(n) + O(1) + O(n) + O(n)
     = O(n)

Where:
  O(1) = task validation (indexed lookup)
  O(1) = application validation (indexed lookup)
  O(n) = fetch other applications
  O(1) = update accepted application
  O(n) = bulk update rejected applications
  O(n) = send notifications to rejected taskers
```

**Atomicity Guarantee:**

The entire operation is wrapped in a database transaction. If notification fails, the acceptance is still committed (notifications are fire-and-forget).

**Code Snippet (lines 469-548):**

```python
@router.post("/{task_id}/accept/{application_id}")
async def accept_application(
    task_id: int,
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Accept a task application."""
    # Validation (lines 477-506)
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if task.status != TaskStatus.OPEN.value:
        raise HTTPException(status_code=400, detail="Task is not open")

    application = db.query(TaskApplication).filter(
        TaskApplication.id == application_id,
        TaskApplication.task_id == task_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Get rejected applications (lines 508-512)
    rejected_applications = db.query(TaskApplication).filter(
        TaskApplication.task_id == task_id,
        TaskApplication.id != application_id
    ).all()

    # Accept application (lines 514-529)
    application.status = ApplicationStatus.ACCEPTED.value
    task.tasker_id = application.tasker_id
    task.status = TaskStatus.ACCEPTED.value

    if application.proposed_price:
        task.price = application.proposed_price

    # Reject others (lines 526-529)
    db.query(TaskApplication).filter(
        TaskApplication.task_id == task_id,
        TaskApplication.id != application_id
    ).update({"status": ApplicationStatus.REJECTED.value})

    db.commit()

    # Notifications (lines 534-545)
    notification_service = NotificationService(db)
    accepted_tasker = db.query(User).filter(User.id == application.tasker_id).first()
    if accepted_tasker:
        notification_service.notify_application_accepted(task, accepted_tasker)

    for rejected_app in rejected_applications:
        rejected_tasker = db.query(User).filter(User.id == rejected_app.tasker_id).first()
        if rejected_tasker:
            notification_service.notify_application_rejected(task, rejected_tasker)

    return {"success": True, "message": "Application accepted"}
```

---

**Application Listing Algorithm:**

```
GET_TASK_APPLICATIONS(task_id, requester):
    INPUT: task_id (integer), requester (User)
    OUTPUT: list of applications

    1. Validate access:
       task = SELECT * FROM tasks WHERE id = task_id
       ASSERT task exists
       ASSERT task.requester_id = requester.id  // Only requester can view

    2. Query applications with tasker details:
       applications = SELECT applications.*, taskers.*
                      FROM task_applications
                      JOIN users AS taskers ON applications.tasker_id = taskers.id
                      WHERE task_id = task_id
                      ORDER BY created_at DESC

    3. RETURN applications
```

**Complexity:** O(n log n) where n = number of applications
- O(n) for fetching applications
- O(n log n) for sorting by created_at
- With index on (task_id, created_at DESC): O(n)

**Code Snippet (lines 439-466):**

```python
@router.get("/{task_id}/applications", response_model=List[TaskApplicationResponse])
async def get_task_applications(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all applications for a task. Only requester can view."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view applications")

    applications = db.query(TaskApplication).options(
        joinedload(TaskApplication.tasker)  # Eager load tasker details
    ).filter(
        TaskApplication.task_id == task_id
    ).order_by(TaskApplication.created_at.desc()).all()

    return applications
```

**Sorting Strategy:**
- Applications sorted by `created_at DESC` (most recent first)
- Allows requester to see latest applicants
- No complex ranking algorithm (future enhancement: rank by tasker rating)

---

## 7. Message Delivery & Read Status Algorithm

**Purpose:** Real-time message delivery via WebSocket with read receipts.

**Location:** `backend/app/websocket/chat.py`, `backend/app/websocket/manager.py`

**7.1 WebSocket Connection Management:**

```
CONNECTION_MANAGER:
    State:
      user_connections: Dict[user_id → Set[WebSocket]]
      task_connections: Dict[task_id → Set[WebSocket]]

    CONNECT_TASK(websocket, task_id, user_id):
      1. Accept WebSocket connection
      2. Add to task_connections[task_id]
      3. Log connection

    DISCONNECT_TASK(websocket, task_id):
      1. Remove from task_connections[task_id]
      2. If task_connections[task_id] is empty, delete entry
      3. Log disconnection

    IS_USER_ONLINE(user_id):
      RETURN user_id in user_connections AND len(user_connections[user_id]) > 0

    BROADCAST_TO_TASK(task_id, message):
      FOR each websocket in task_connections[task_id] DO
         TRY:
            websocket.send_json(message)
         CATCH error:
            // Mark for disconnection
            disconnected.add(websocket)
         END TRY
      END FOR

      // Clean up failed connections
      FOR each conn in disconnected DO
         task_connections[task_id].remove(conn)
      END FOR
```

**Complexity:**

- `CONNECT_TASK`: O(1) - Set insertion
- `DISCONNECT_TASK`: O(1) - Set removal
- `IS_USER_ONLINE`: O(1) - Dict lookup
- `BROADCAST_TO_TASK`: O(k) where k = number of connections in task

**Code Snippet (`manager.py:12-110`):**

```python
class ConnectionManager:
    def __init__(self):
        self.user_connections: Dict[int, Set[WebSocket]] = {}
        self.task_connections: Dict[int, Set[WebSocket]] = {}

    async def connect_task(self, websocket: WebSocket, task_id: int, user_id: int):
        await websocket.accept()
        if task_id not in self.task_connections:
            self.task_connections[task_id] = set()
        self.task_connections[task_id].add(websocket)
        logger.info(f"User {user_id} joined task {task_id} chat")

    def disconnect_task(self, websocket: WebSocket, task_id: int):
        if task_id in self.task_connections:
            self.task_connections[task_id].discard(websocket)
            if not self.task_connections[task_id]:
                del self.task_connections[task_id]

    def is_user_online(self, user_id: int) -> bool:
        return user_id in self.user_connections and len(self.user_connections[user_id]) > 0

    async def broadcast_to_task(self, task_id: int, message: dict):
        if task_id not in self.task_connections:
            return

        disconnected = set()
        for connection in self.task_connections[task_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error sending to task {task_id}: {e}")
                disconnected.add(connection)

        # Cleanup
        for conn in disconnected:
            self.task_connections[task_id].discard(conn)
```

---

**7.2 Message Sending Algorithm:**

```
SEND_MESSAGE(websocket, task_id, user, message_data):
    INPUT:
      websocket (WebSocket connection)
      task_id (integer)
      user (authenticated User)
      message_data = {type: "message", content: string}
    OUTPUT:
      message delivered to task participants

    1. Validate message:
       content = message_data.content.strip()
       IF content is empty THEN
          RETURN  // Ignore empty messages
       END IF

    2. Determine receiver:
       task = SELECT * FROM tasks WHERE id = task_id
       IF task.requester_id = user.id THEN
          receiver_id = task.tasker_id
       ELSE
          receiver_id = task.requester_id
       END IF

       IF receiver_id is null THEN
          websocket.send_json({type: "error", message: "No recipient available"})
          RETURN
       END IF

    3. Save message to database:
       BEGIN_TRANSACTION
          message = new Message(
             task_id=task_id,
             sender_id=user.id,
             receiver_id=receiver_id,
             content=content,
             is_read=false
          )
          INSERT message
       COMMIT_TRANSACTION

    4. Broadcast to all task participants (real-time):
       broadcast_to_task(task_id, {
          type: "message",
          id: message.id,
          sender_id: user.id,
          sender_name: user.name,
          sender_avatar: user.avatar_url,
          content: content,
          timestamp: message.created_at
       })

    5. If receiver is offline, send notification:
       IF NOT is_user_online(receiver_id) THEN
          notification_service.notify_new_message(
             receiver_id, sender=user, task=task
          )
       END IF
```

**Complexity:** O(k) where k = number of WebSocket connections for the task (typically 2: requester + tasker)

**Code Snippet (`chat.py:94-138`):**

```python
# Inside WebSocket message handler (lines 89-139)
while True:
    data = await websocket.receive_json()
    msg_type = data.get("type", "message")

    if msg_type == "message":
        content = data.get("content", "").strip()
        if not content:
            continue

        # Determine receiver (lines 99-107)
        receiver_id = task.tasker_id if task.requester_id == user.id else task.requester_id
        if not receiver_id:
            await websocket.send_json({"type": "error", "message": "No recipient available"})
            continue

        # Save message (lines 109-118)
        message = Message(
            task_id=task_id,
            sender_id=user.id,
            receiver_id=receiver_id,
            content=content
        )
        db.add(message)
        db.commit()
        db.refresh(message)

        # Broadcast (lines 120-129)
        await manager.broadcast_to_task(task_id, {
            "type": "message",
            "id": message.id,
            "sender_id": user.id,
            "sender_name": user.name,
            "sender_avatar": user.avatar_url,
            "content": content,
            "timestamp": message.created_at.isoformat()
        })

        # Offline notification (lines 131-138)
        if not manager.is_user_online(receiver_id):
            notification_service = NotificationService(db)
            notification_service.notify_new_message(receiver_id=receiver_id, sender=user, task=task)
```

---

**7.3 Read Receipt Algorithm:**

```
MARK_MESSAGES_READ(websocket, task_id, user, message_ids):
    INPUT:
      websocket (WebSocket connection)
      task_id (integer)
      user (authenticated User)
      message_ids (list of integers)
    OUTPUT:
      messages marked as read, sender notified

    1. Validate and update:
       BEGIN_TRANSACTION
          UPDATE messages
          SET is_read = true, read_at = current_timestamp
          WHERE id IN message_ids
          AND receiver_id = user.id  // Only receiver can mark as read
       COMMIT_TRANSACTION

    2. Notify sender (via WebSocket):
       broadcast_to_task(task_id, {
          type: "messages_read",
          reader_id: user.id,
          message_ids: message_ids
       })
```

**Complexity:** O(m) where m = number of message IDs in the batch

**Code Snippet (`chat.py:148-166`):**

```python
elif msg_type == "read":
    # Mark messages as read (lines 149-166)
    message_ids = data.get("message_ids", [])
    if message_ids:
        db.query(Message).filter(
            Message.id.in_(message_ids),
            Message.receiver_id == user.id  # Security: only receiver can mark read
        ).update({
            "is_read": True,
            "read_at": datetime.utcnow()
        }, synchronize_session=False)
        db.commit()

        # Notify sender that messages were read
        await manager.broadcast_to_task(task_id, {
            "type": "messages_read",
            "reader_id": user.id,
            "message_ids": message_ids
        })
```

---

**7.4 Online/Offline Detection:**

```
DETECT_USER_ONLINE(user_id):
    INPUT: user_id (integer)
    OUTPUT: boolean (true if online)

    RETURN user_id in user_connections AND len(user_connections[user_id]) > 0
```

**Mechanism:**
- User is "online" if they have at least one active WebSocket connection
- Connections are tracked in `ConnectionManager.user_connections`
- When all WebSocket connections close, user is considered offline

**Complexity:** O(1) - Dict lookup

**Usage:**
- Check before sending offline notification (line 132 in `chat.py`)
- Display online status in UI (future feature)

**Code Snippet (`manager.py:98-100`):**

```python
def is_user_online(self, user_id: int) -> bool:
    """Check if user has active connections."""
    return user_id in self.user_connections and len(self.user_connections[user_id]) > 0
```

**Edge Cases:**

1. **Multiple tabs/devices:** User can have multiple WebSocket connections (Set allows duplicates)
2. **Connection drops:** Cleanup in `broadcast_to_task` removes stale connections
3. **Reconnection:** New connection added to Set, user remains online
4. **Graceful disconnect:** `disconnect_task` removes connection, user offline if last connection

---

**7.5 Typing Indicator Algorithm:**

```
BROADCAST_TYPING(websocket, task_id, user):
    INPUT:
      websocket (WebSocket)
      task_id (integer)
      user (User)
    OUTPUT:
      typing event broadcast to task participants

    1. Broadcast typing event (no database storage):
       broadcast_to_task(task_id, {
          type: "typing",
          user_id: user.id,
          user_name: user.name
       })

    // Note: Typing events are ephemeral (not persisted)
```

**Design Decision:** Typing indicators are NOT stored in database (transient events only).

**Complexity:** O(k) where k = number of connections in task

**Code Snippet (`chat.py:140-146`):**

```python
elif msg_type == "typing":
    # Broadcast typing indicator (ephemeral, not stored)
    await manager.broadcast_to_task(task_id, {
        "type": "typing",
        "user_id": user.id,
        "user_name": user.name
    })
```

---

## Summary of Complexity Analysis

| Algorithm | Time Complexity | Space Complexity | Notes |
|-----------|----------------|------------------|-------|
| Escrow Payment | O(1) | O(1) | Constant wallet updates |
| Release Payment | O(1) | O(1) | Three-way split |
| Refund Payment | O(1) | O(1) | Two-wallet reversal |
| Available Balance | O(1) | O(1) | Computed property |
| Task Search | O(n + m log m) | O(k) | n=total, m=filtered, k=page size |
| Task Search (indexed) | O(c·log n + m log m) | O(k) | c=categories |
| Rating Update | O(n) | O(1) | n=reviews (denormalized) |
| Accept Application | O(n) | O(1) | n=applications for task |
| WebSocket Connect | O(1) | O(1) | Set insertion |
| WebSocket Broadcast | O(k) | O(1) | k=connections in task |
| Mark Messages Read | O(m) | O(1) | m=message IDs |
| Online Detection | O(1) | O(1) | Dict lookup |

---

## Optimization Recommendations

### 1. Database Indexes

**Critical indexes for performance:**

```sql
-- Task search optimization
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_category ON tasks(category_id);
CREATE INDEX idx_tasks_price ON tasks(price);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);

-- Application queries
CREATE INDEX idx_applications_task ON task_applications(task_id);
CREATE INDEX idx_applications_tasker ON task_applications(tasker_id);
CREATE INDEX idx_applications_status ON task_applications(status);

-- Wallet transactions
CREATE INDEX idx_wallet_trans_wallet_date ON wallet_transactions(wallet_id, created_at DESC);

-- Messages
CREATE INDEX idx_messages_task ON messages(task_id, created_at DESC);
CREATE INDEX idx_messages_receiver_unread ON messages(receiver_id, is_read) WHERE is_read = false;

-- Reviews (for rating calculation)
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);
```

### 2. Caching Strategies

**Recommended caching:**

1. **User ratings:** Cache in Redis with TTL, invalidate on new review
2. **Task counts:** Cache category task counts
3. **Wallet balances:** Read-through cache with write-invalidation

### 3. Algorithm Improvements

1. **Task Search:**
   - Implement full-text search for `search` parameter (PostgreSQL `tsvector`)
   - Cache popular search queries
   - Consider Elasticsearch for complex queries

2. **Rating Calculation:**
   - Current denormalized approach is optimal for read-heavy workload
   - Alternative: Store `(total_rating_sum, review_count)` for O(1) updates

3. **Message Delivery:**
   - Current WebSocket approach is optimal for real-time
   - Consider message queuing (RabbitMQ) for offline message processing at scale

---

## Edge Cases & Error Handling

### Payment Algorithms

| Edge Case | Handling |
|-----------|----------|
| Insufficient balance | Check `available_balance` before debit, return error |
| Concurrent escrow creation | Database transaction isolation prevents double-spend |
| Task already has escrow | Check for existing escrow transaction before creating new one |
| Release before escrow | Escrow transaction validation (line 230-237) |
| Refund non-existent escrow | Returns success (idempotent, line 340) |
| Platform fee > amount | Impossible (platform_fee = amount × 0.1) |

### Task Search

| Edge Case | Handling |
|-----------|----------|
| Empty results | Returns `{data: [], total: 0}` |
| Invalid sort field | Falls back to `created_at` (line 78) |
| Page beyond range | Returns empty array |
| Negative prices in filter | Query validation: `ge=0` (line 39) |
| Empty `category_ids` list | Check `len(category_ids) > 0` (line 60) |

### WebSocket

| Edge Case | Handling |
|-----------|----------|
| Connection drop during message | Transaction rolled back, message not saved |
| Unauthorized task access | Close connection with 4003 Forbidden (line 74) |
| Invalid token | Close connection with 4001 Unauthorized (line 64) |
| No receiver for message | Send error to sender (line 103-106) |
| Mark read on sender's messages | Security check: `receiver_id = user.id` (line 154) |
| Broadcast to empty task | Early return, no error (line 79 in manager.py) |

---

## Mathematical Proofs

### Proof 1: Money Conservation in Payment Flow

**Theorem:** Total money across all wallets remains constant throughout escrow flow.

**Proof:**

Let S = total money in system at time t₀.

**Phase 1 (Escrow):**
```
Before: R + E + T + P = S
After:  (R - price) + (E + price) + T + P
      = R - price + E + price + T + P
      = R + E + T + P
      = S  ✓
```

**Phase 2a (Release with 10% fee):**
```
Given:
  platform_fee = ⌊price × 0.1⌋
  tasker_amount = price - platform_fee

Before: (R - price) + (E + price) + T + P = S
After:  (R - price) + (E + price - price) + (T + tasker_amount) + (P + platform_fee)
      = R - price + E + T + tasker_amount + P + platform_fee
      = R - price + E + T + (price - platform_fee) + P + platform_fee
      = R - price + E + T + price + P
      = R + E + T + P
      = S  ✓
```

**Phase 2b (Refund):**
```
Before: (R - price) + (E + price) + T + P = S
After:  (R - price + price) + (E + price - price) + T + P
      = R + E + T + P
      = S  ✓
```

**Conclusion:** Money is conserved in all transitions. ∎

---

### Proof 2: Pagination Correctness

**Theorem:** Pagination formula `total_pages = ⌈total / limit⌉` covers all items without gaps or overlaps.

**Proof:**

Given:
- total = n (total items)
- limit = k (items per page)
- page = p (current page, 1-indexed)

**Claim:** `total_pages = ⌈n / k⌉` pages are sufficient and necessary.

**Sufficiency (covers all items):**

Last page starts at offset `(⌈n/k⌉ - 1) × k`:

```
Last page offset = (⌈n/k⌉ - 1) × k
Remaining items = n - offset
                = n - (⌈n/k⌉ - 1) × k
                ≤ n - (n/k - 1) × k
                = n - n + k
                = k

So last page has at most k items. ✓
```

**Necessity (no fewer pages):**

If we used `total_pages = ⌈n/k⌉ - 1`:

```
Covered items = (⌈n/k⌉ - 1) × k
              < ⌈n/k⌉ × k
              = k × ⌈n/k⌉

By definition of ceiling:
  k × ⌈n/k⌉ ≥ n

So: covered items < n

This leaves some items uncovered. ✗
```

**Implementation in code (line 111):**

```python
total_pages = (total + limit - 1) // limit  # Ceiling division
```

**Equivalence:**

```
⌈n / k⌉ = ⌊(n + k - 1) / k⌋  (integer ceiling)

Proof:
  Let n = qk + r where 0 ≤ r < k (division theorem)

  Case 1: r = 0
    ⌈n / k⌉ = q
    (n + k - 1) // k = (qk + k - 1) // k = q  ✓

  Case 2: r > 0
    ⌈n / k⌉ = q + 1
    (n + k - 1) // k = (qk + r + k - 1) // k
                     = ((q+1)k + r - 1) // k
                     = q + 1  (since 0 < r ≤ k-1)  ✓
```

**Conclusion:** Pagination formula is correct. ∎

---

## References

### Code Locations

| Algorithm | File | Lines |
|-----------|------|-------|
| Escrow Payment | `backend/app/services/mock_payment.py` | 126-210 |
| Release Payment | `backend/app/services/mock_payment.py` | 211-318 |
| Refund Payment | `backend/app/services/mock_payment.py` | 319-402 |
| Available Balance | `backend/app/models/wallet.py` | 60-63 |
| Task Search | `backend/app/routers/tasks.py` | 31-113 |
| Accept Application | `backend/app/routers/tasks.py` | 469-548 |
| WebSocket Chat | `backend/app/websocket/chat.py` | 34-182 |
| Connection Manager | `backend/app/websocket/manager.py` | 12-110 |
| User Rating | `backend/app/models/user.py` | 30 |

### Related Documentation

- [DATA_STRUCTURE.md](./DATA_STRUCTURE.md) - Database schema details
- [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) - High-level architecture
- [API_REFERENCE.md](./API_REFERENCE.md) - API endpoint specifications
- [USER_FLOW.md](./USER_FLOW.md) - User interaction flows

---

**Document Version:** 1.0
**Last Updated:** 2026-02-04
**Maintained By:** Development Team
