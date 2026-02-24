# API Reference

**Project:** Viecz - Mini Services for Students
**Base URL:** `http://localhost:8080/api/v1` (production) | `http://localhost:9999/api/v1` (test server)
**WebSocket URL:** `ws://localhost:{port}/api/v1/ws`
**Last Updated:** 2026-02-23 (Wallet withdrawal/payout, email verification, banks endpoints added)

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Users](#2-users)
3. [Categories](#3-categories)
4. [Tasks](#4-tasks)
5. [Applications](#5-applications)
6. [Wallet](#6-wallet)
7. [Payments (Escrow)](#7-payments-escrow)
8. [Payment Link (PayOS)](#8-payment-link-payos)
9. [Webhooks](#9-webhooks)
10. [Conversations & Messages](#10-conversations--messages)
11. [WebSocket](#11-websocket)
12. [Notifications](#12-notifications)
13. [Banks](#13-banks)
14. [Error Responses](#14-error-responses)
15. [Appendices](#15-appendices)

---

## Authentication

All protected endpoints require `Authorization: Bearer <access_token>` header.

Access tokens expire after 30 minutes. Refresh tokens expire after 7 days.

---

## 1. Authentication

### 1.1. Register

Create a new user account.

**Endpoint:** `POST /api/v1/auth/register`
**Auth:** None

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "Password123",
  "name": "Nguyen Van A",
  "turnstile_token": "0.erCMbNgi..."
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `email` | string | Yes | Valid email | User email |
| `password` | string | Yes | Min 8 chars, 1 uppercase, 1 lowercase, 1 digit | Password |
| `name` | string | Yes | Max 100 chars | Display name |
| `turnstile_token` | string | No* | Cloudflare Turnstile token | Bot verification token |

*Required when `TURNSTILE_SECRET_KEY` is configured on the server. Omitted/empty token returns 400.

#### Response: 201 Created

```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "eyJhbGciOi...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Nguyen Van A",
    "university": "DHQG-HCM",
    "is_verified": false,
    "rating": 0,
    "total_tasks_completed": 0,
    "total_tasks_posted": 0,
    "total_earnings": 0,
    "is_tasker": false,
    "auth_provider": "email",
    "email_verified": false,
    "created_at": "2026-02-14T10:00:00Z",
    "updated_at": "2026-02-14T10:00:00Z"
  }
}
```

#### Errors

- `400` - Invalid email format / Weak password / Bot verification failed
- `409` - Email already exists

---

### 1.2. Login

Authenticate with email and password.

**Endpoint:** `POST /api/v1/auth/login`
**Auth:** None

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

#### Response: 200 OK

```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "eyJhbGciOi...",
  "user": { ... }
}
```

#### Errors

- `401` - Invalid email or password

---

### 1.3. Google OAuth Login

Authenticate or register using a Google ID token. If the user does not exist, a new account is created automatically using the Google profile (email, name, avatar).

**Endpoint:** `POST /api/v1/auth/google`
**Auth:** None

#### Request Body

```json
{
  "id_token": "eyJhbGciOi..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id_token` | string | Yes | Google JWT ID token obtained from Google Sign-In |

#### Response: 200 OK

```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "eyJhbGciOi...",
  "user": { ... }
}
```

Same format as Login (section 1.2).

#### Errors

- `400` - Missing or invalid ID token
- `401` - Google token verification failed

---

### 1.4. Verify Email

Verify user's email address using a token sent via email after registration.

**Endpoint:** `POST /api/v1/auth/verify-email`
**Auth:** None

#### Request Body

```json
{
  "token": "abc123..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | Yes | Email verification token (sent to user's email) |

#### Response: 200 OK

```json
{
  "message": "email verified successfully"
}
```

#### Errors

- `400` - Missing or invalid token
- `404` - Token not found or expired

---

### 1.5. Resend Verification Email

Resend the email verification link. Rate-limited to prevent abuse.

**Endpoint:** `POST /api/v1/auth/resend-verification`
**Auth:** Required

#### Response: 200 OK

```json
{
  "message": "verification email sent"
}
```

#### Errors

- `400` - Email already verified
- `429` - Rate limited (too many requests)

---

### 1.6. Refresh Token

Get a new access token using a refresh token.

**Endpoint:** `POST /api/v1/auth/refresh`
**Auth:** None

#### Request Body

```json
{
  "refresh_token": "eyJhbGciOi..."
}
```

#### Response: 200 OK

```json
{
  "access_token": "eyJhbGciOi..."
}
```

#### Errors

- `401` - Invalid refresh token

---

## 2. Users

### 2.1. Get User Profile (Public)

Get any user's profile by ID.

**Endpoint:** `GET /api/v1/users/:id`
**Auth:** None

#### Response: 200 OK

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "Nguyen Van A",
  "avatar_url": "https://example.com/avatar.jpg",
  "phone": "0901234567",
  "university": "DHQG-HCM",
  "student_id": "20120001",
  "is_verified": true,
  "rating": 4.5,
  "total_tasks_completed": 10,
  "total_tasks_posted": 5,
  "total_earnings": 500000,
  "is_tasker": true,
  "auth_provider": "email",
  "email_verified": true,
  "tasker_bio": "Experienced in delivery",
  "tasker_skills": ["Giao hang", "Day hoc"],
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-01T00:00:00Z"
}
```

#### Errors

- `404` - User not found

---

### 2.2. Get My Profile

Get authenticated user's profile.

**Endpoint:** `GET /api/v1/users/me`
**Auth:** Required

#### Response: 200 OK

Same format as 2.1.

---

### 2.3. Update My Profile

Update authenticated user's profile.

**Endpoint:** `PUT /api/v1/users/me`
**Auth:** Required

#### Request Body

All fields optional:

```json
{
  "name": "Updated Name",
  "avatar_url": "https://example.com/new-avatar.jpg",
  "phone": "0987654321",
  "bio": "Student at HCMUS, looking for freelance work"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Display name |
| `avatar_url` | string | No | Avatar URL |
| `phone` | string | No | Phone number |
| `bio` | string | No | User bio/description (max 500 chars) |

#### Response: 200 OK

Returns updated user profile.

---

### 2.4. Upload Avatar

**Endpoint:** `POST /api/v1/users/me/avatar`

Upload a profile picture. Accepts multipart/form-data with a single file field `avatar`.

**Auth:** Required (Bearer token)

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| avatar | file | Yes | Image file (JPEG, PNG, or WebP). Max 5MB. |

**Security:**
- 5MB max file size (rejected before full body read)
- UUID filenames (user-provided filenames are ignored)
- MIME whitelist: `image/jpeg`, `image/png`, `image/webp`
- Magic byte validation (checks file header bytes)
- Old avatar file is deleted on new upload

#### Response: 200 OK

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "User",
  "avatar_url": "/uploads/avatars/550e8400-e29b-41d4-a716-446655440000.jpg",
  ...
}
```

#### Errors

| Code | Description |
|------|-------------|
| 400 | File too large, invalid image type, missing avatar field |
| 401 | Unauthorized |

---

### 2.5. Become Tasker

Register current user as a tasker (service provider). No request body required.

**Endpoint:** `POST /api/v1/users/become-tasker`
**Auth:** Required

#### Response: 200 OK

Returns updated user profile with `is_tasker: true`.

#### Errors

- `400` - Already a tasker or other error

---

## 3. Categories

### 3.1. List Categories

Get all task categories. Seeded on server startup.

**Endpoint:** `GET /api/v1/categories`
**Auth:** None

#### Response: 200 OK

```json
[
  {
    "id": 1,
    "name": "Moving & Transport",
    "name_vi": "Van chuyen & Di chuyen",
    "is_active": true
  },
  {
    "id": 2,
    "name": "Delivery",
    "name_vi": "Giao hang",
    "is_active": true
  },
  {
    "id": 3,
    "name": "Assembly & Installation",
    "name_vi": "Lap rap & Cai dat",
    "is_active": true
  },
  {
    "id": 4,
    "name": "Cleaning",
    "name_vi": "Don dep",
    "is_active": true
  },
  {
    "id": 5,
    "name": "Tutoring & Teaching",
    "name_vi": "Gia su & Giang day",
    "is_active": true
  },
  {
    "id": 6,
    "name": "Tech Support",
    "name_vi": "Ho tro ky thuat",
    "is_active": true
  },
  {
    "id": 7,
    "name": "Event Help",
    "name_vi": "Ho tro su kien",
    "is_active": true
  },
  {
    "id": 8,
    "name": "Shopping & Errands",
    "name_vi": "Mua sam & Viec vat",
    "is_active": true
  },
  {
    "id": 9,
    "name": "Pet Care",
    "name_vi": "Cham soc thu cung",
    "is_active": true
  },
  {
    "id": 10,
    "name": "Photography",
    "name_vi": "Chup anh",
    "is_active": true
  },
  {
    "id": 11,
    "name": "Other",
    "name_vi": "Khac",
    "is_active": true
  }
]
```

---

## 4. Tasks

All task endpoints require authentication.

### 4.1. Create Task

**Endpoint:** `POST /api/v1/tasks`
**Auth:** Required

#### Request Body

```json
{
  "category_id": 2,
  "title": "Deliver lunch from cafeteria to dorm A",
  "description": "Need someone to pick up 2 lunch boxes. Already ordered.",
  "price": 20000,
  "location": "Cafeteria near main gate",
  "latitude": 10.762622,
  "longitude": 106.660172,
  "deadline": "2026-02-15T12:00:00Z",
  "image_urls": ["https://example.com/photo1.jpg"]
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `category_id` | int64 | Yes | Valid category ID | Task category |
| `title` | string | Yes | Max 200 chars | Task title |
| `description` | string | Yes | Max 2000 chars | Task description |
| `price` | int64 | Yes | > 0 | Price in VND |
| `location` | string | Yes | Max 255 chars | Location |
| `latitude` | float64 | No | - | GPS latitude |
| `longitude` | float64 | No | - | GPS longitude |
| `deadline` | string | No | RFC3339, >=1h future | Optional deadline (blocks applications when overdue) |
| `image_urls` | []string | No | Max 5 items | Image URLs |

#### Response: 201 Created

```json
{
  "id": 1,
  "requester_id": 1,
  "category_id": 2,
  "title": "Deliver lunch from cafeteria to dorm A",
  "description": "Need someone to pick up 2 lunch boxes.",
  "price": 20000,
  "location": "Cafeteria near main gate",
  "latitude": 10.762622,
  "longitude": 106.660172,
  "status": "open",
  "deadline": "2026-02-15T12:00:00Z",
  "image_urls": ["https://example.com/photo1.jpg"],
  "created_at": "2026-02-14T10:00:00Z",
  "updated_at": "2026-02-14T10:00:00Z"
}
```

#### Errors

- `400` - Validation error (missing required fields, invalid category)
- `500` - Insufficient available balance (wallet balance minus escrow minus sum of open task prices is less than the task price)

---

### 4.2. List Tasks

Get paginated, filterable list of tasks.

**Endpoint:** `GET /api/v1/tasks`
**Auth:** Required

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `category_id` | int64 | - | Filter by category |
| `requester_id` | int64 | - | Filter by requester |
| `tasker_id` | int64 | - | Filter by assigned tasker |
| `status` | string | - | Filter by status (open, in_progress, completed, cancelled) |
| `min_price` | int64 | - | Minimum price filter |
| `max_price` | int64 | - | Maximum price filter |
| `location` | string | - | Filter by location (substring match) |
| `search` | string | - | Search in title/description |
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page (max 100) |

#### Response: 200 OK

```json
{
  "data": [
    {
      "id": 1,
      "requester_id": 1,
      "category_id": 2,
      "title": "Deliver lunch",
      "description": "...",
      "price": 20000,
      "location": "Cafeteria",
      "status": "open",
      "created_at": "2026-02-14T10:00:00Z",
      "updated_at": "2026-02-14T10:00:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20
}
```

---

### 4.3. Get Task

Get single task details. Includes `user_has_applied` field for the authenticated user.

**Endpoint:** `GET /api/v1/tasks/:id`
**Auth:** Required

#### Response: 200 OK

```json
{
  "id": 1,
  "requester_id": 1,
  "tasker_id": 2,
  "category_id": 2,
  "title": "Deliver lunch from cafeteria to dorm A",
  "description": "Need someone to pick up 2 lunch boxes.",
  "price": 20000,
  "location": "Cafeteria near main gate",
  "latitude": 10.762622,
  "longitude": 106.660172,
  "status": "open",
  "deadline": "2026-02-15T12:00:00Z",
  "image_urls": ["https://example.com/photo1.jpg"],
  "created_at": "2026-02-14T10:00:00Z",
  "updated_at": "2026-02-14T10:00:00Z",
  "user_has_applied": false,
  "is_overdue": false
}
```

| Extra Field | Type | Description |
|-------------|------|-------------|
| `user_has_applied` | bool | Whether the requesting user has applied |
| `is_overdue` | bool | Whether the task's deadline has passed |

#### Errors

- `404` - Task not found

---

### 4.4. Update Task

Update a task. Only the requester can update their own task. Task must be in `open` status.

**Endpoint:** `PUT /api/v1/tasks/:id`
**Auth:** Required (must be requester)

#### Request Body

Same format as Create Task (section 4.1). All fields are sent (full replacement).

#### Response: 200 OK

Returns updated task.

#### Android UI

The Android app reuses `CreateTaskScreen` in edit mode (route: `edit_task/{taskId}`). The edit button (pencil icon) appears in `TaskDetailScreen`'s top bar only for the task owner when the task status is `open`. Fields are pre-populated from the existing task via `CreateTaskViewModel.loadTaskForEdit()`.

#### Errors

- `400` - Not authorized or task not updatable
- `500` - Insufficient available balance for price increase (only validated when the new price exceeds the current price; the delta must be covered by available balance)

---

### 4.5. Delete Task

Cancel a task (soft delete). Sets task status to `cancelled` -- does NOT remove the row from the database. Only the requester can cancel their own task.

**Endpoint:** `DELETE /api/v1/tasks/:id`
**Auth:** Required (must be requester)

#### Behavior

- **Soft delete**: Sets task status to `cancelled` (row remains in the database)
- **Rejects pending applications**: All applications with `pending` status are changed to `rejected`
- **Notifies applicants**: Sends a `task_cancelled` notification to each applicant whose application was rejected
- **Blocks when accepted application exists**: If any application has `accepted` status, the request is rejected with a `400` error (task cannot be cancelled once a tasker has been accepted)
- **Row locking**: Uses `SELECT ... FOR UPDATE` to lock the task row, preventing race conditions between concurrent cancel and accept operations

#### Response: 200 OK

```json
{
  "message": "task cancelled successfully"
}
```

#### Errors

- `400` - Not authorized, task not deletable, or an accepted application exists

---

### 4.6. Apply for Task

Submit an application to work on a task. Must be a tasker.

**Endpoint:** `POST /api/v1/tasks/:id/applications`
**Auth:** Required (must be tasker)

#### Request Body

```json
{
  "proposed_price": 18000,
  "message": "I can complete this within 30 minutes."
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `proposed_price` | int64 | No | > 0 | Counter-offer price |
| `message` | string | No | Max 500 chars | Application message |

#### Response: 201 Created

```json
{
  "id": 1,
  "task_id": 1,
  "tasker_id": 2,
  "proposed_price": 18000,
  "message": "I can complete this within 30 minutes.",
  "status": "pending",
  "created_at": "2026-02-14T10:30:00Z",
  "updated_at": "2026-02-14T10:30:00Z"
}
```

#### Errors

- `400` - Task not open / Cannot apply to own task / Already applied / Not a tasker

---

### 4.7. Get Task Applications

Get all applications for a task. Only the task requester can view.

**Endpoint:** `GET /api/v1/tasks/:id/applications`
**Auth:** Required (must be task requester)

#### Response: 200 OK

```json
[
  {
    "id": 1,
    "task_id": 1,
    "tasker_id": 2,
    "proposed_price": 18000,
    "message": "I can complete this quickly",
    "status": "pending",
    "created_at": "2026-02-14T10:30:00Z",
    "updated_at": "2026-02-14T10:30:00Z"
  }
]
```

#### Errors

- `403` - Not authorized (not the requester)

---

### 4.8. Complete Task

Mark a task as completed. Only the task requester can complete.

**Endpoint:** `POST /api/v1/tasks/:id/complete`
**Auth:** Required (must be task requester)

#### Response: 200 OK

```json
{
  "message": "task completed successfully"
}
```

#### Errors

- `400` - Task not in correct state for completion

---

## 5. Applications

### 5.1. Accept Application

Accept a tasker's application. Only the task requester can accept. Assigns the tasker to the task and changes task status.

**Endpoint:** `POST /api/v1/applications/:id/accept`
**Auth:** Required (must be task requester)

#### Response: 200 OK

```json
{
  "message": "application accepted successfully"
}
```

#### Side Effects

- Application status changes to `accepted`
- Other applications for the same task change to `rejected`
- Task gets the tasker assigned
- Task status may change depending on business logic

#### Errors

- `400` - Application not found / Not authorized / Task not open

---

## 6. Wallet

All wallet endpoints require authentication. Wallets are auto-created on first access.

### 6.1. Get Wallet

Get current user's wallet information.

**Endpoint:** `GET /api/v1/wallet`
**Auth:** Required

#### Response: 200 OK

```json
{
  "id": 1,
  "user_id": 1,
  "balance": 150000,
  "escrow_balance": 20000,
  "available_balance": 80000,
  "total_deposited": 200000,
  "total_withdrawn": 0,
  "total_earned": 0,
  "total_spent": 50000,
  "created_at": "2026-02-14T10:00:00Z",
  "updated_at": "2026-02-14T10:00:00Z"
}
```

| Field | Description |
|-------|-------------|
| `balance` | Wallet balance (VND) -- includes funds reserved for open tasks |
| `escrow_balance` | Amount held in escrow for active tasks |
| `available_balance` | Spendable balance after accounting for escrow and open task prices |
| `total_deposited` | Lifetime total deposited |
| `total_withdrawn` | Lifetime total withdrawn |
| `total_earned` | Lifetime earnings from completed tasks |
| `total_spent` | Lifetime spending on tasks |

---

### 6.2. Deposit

Create a PayOS payment link for wallet deposit. The deposit is credited automatically via webhook when payment completes.

**Endpoint:** `POST /api/v1/wallet/deposit`
**Auth:** Required

#### Request Body

```json
{
  "amount": 50000,
  "description": "Wallet deposit"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `amount` | int64 | Yes | Min 2000 | Amount in VND |
| `description` | string | No | - | Defaults to "Wallet deposit" |

**Note:** Deposit is validated against the max wallet balance (default 200,000 VND). If `current_balance + amount > max_balance`, the request is rejected.

#### Response: 200 OK

```json
{
  "checkout_url": "https://pay.payos.vn/web/...",
  "order_code": 1707900000000
}
```

On the **test server**, the mock PayOS auto-fires a webhook after 100ms to credit the wallet. No manual checkout is needed.

#### Errors

- `400` - Invalid amount / Deposit would exceed max balance

---

### 6.3. Get Transaction History

Get wallet transaction history.

**Endpoint:** `GET /api/v1/wallet/transactions`
**Auth:** Required

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | int | 20 | Number of transactions |
| `offset` | int | 0 | Offset for pagination |

#### Response: 200 OK

```json
[
  {
    "id": 1,
    "wallet_id": 1,
    "transaction_id": 5,
    "task_id": null,
    "type": "deposit",
    "amount": 50000,
    "balance_before": 0,
    "balance_after": 50000,
    "escrow_before": 0,
    "escrow_after": 0,
    "description": "Wallet deposit",
    "created_at": "2026-02-14T10:00:00Z"
  },
  {
    "id": 2,
    "wallet_id": 1,
    "task_id": 1,
    "type": "escrow_hold",
    "amount": 20000,
    "balance_before": 50000,
    "balance_after": 30000,
    "escrow_before": 0,
    "escrow_after": 20000,
    "description": "Escrow for task #1",
    "reference_user_id": 2,
    "created_at": "2026-02-14T11:00:00Z"
  }
]
```

#### Wallet Transaction Types

| Type | Description |
|------|-------------|
| `deposit` | Funds deposited to wallet |
| `withdrawal` | Funds withdrawn from wallet |
| `escrow_hold` | Funds moved to escrow for a task |
| `escrow_release` | Funds released from escrow (to tasker) |
| `escrow_refund` | Funds refunded from escrow back to requester |
| `payment_received` | Payment received for completing a task |
| `platform_fee` | Platform fee deducted |

---

### 6.4. List Bank Accounts

Get authenticated user's saved bank accounts.

**Endpoint:** `GET /api/v1/wallet/bank-accounts`
**Auth:** Required

#### Response: 200 OK

```json
[
  {
    "id": 1,
    "user_id": 1,
    "bank_bin": "970436",
    "bank_name": "Vietcombank",
    "account_number": "1234567890",
    "account_holder_name": "NGUYEN VAN A",
    "is_default": true,
    "created_at": "2026-02-23T10:00:00Z",
    "updated_at": "2026-02-23T10:00:00Z"
  }
]
```

---

### 6.5. Add Bank Account

Save a new bank account for withdrawals.

**Endpoint:** `POST /api/v1/wallet/bank-accounts`
**Auth:** Required

#### Request Body

```json
{
  "bank_bin": "970436",
  "bank_name": "Vietcombank",
  "account_number": "1234567890",
  "account_holder_name": "NGUYEN VAN A"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `bank_bin` | string | Yes | Max 20 chars | Bank BIN code (from VietQR/Napas bank list) |
| `bank_name` | string | Yes | Max 100 chars | Bank display name |
| `account_number` | string | Yes | Max 50 chars | Bank account number |
| `account_holder_name` | string | Yes | Max 200 chars | Account holder full name |

#### Response: 201 Created

```json
{
  "id": 1,
  "user_id": 1,
  "bank_bin": "970436",
  "bank_name": "Vietcombank",
  "account_number": "1234567890",
  "account_holder_name": "NGUYEN VAN A",
  "is_default": false,
  "created_at": "2026-02-23T10:00:00Z",
  "updated_at": "2026-02-23T10:00:00Z"
}
```

#### Errors

- `400` - Validation error (missing required fields, invalid format)

---

### 6.6. Delete Bank Account

Delete a saved bank account. Only the account owner can delete.

**Endpoint:** `DELETE /api/v1/wallet/bank-accounts/:id`
**Auth:** Required (ownership check)

#### Response: 200 OK

```json
{
  "message": "bank account deleted"
}
```

#### Errors

- `400` - Invalid bank account ID
- `403` - Not the owner of this bank account
- `404` - Bank account not found

---

### 6.7. Withdraw Funds

Withdraw funds from wallet to a saved bank account via PayOS payout.

**Endpoint:** `POST /api/v1/wallet/withdraw`
**Auth:** Required
**Rate Limit:** Finance rate limited (stricter than default)

#### Request Body

```json
{
  "amount": 50000,
  "bank_account_id": 1
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `amount` | int64 | Yes | Min 10000, max 200000, multiple of 1000 | Withdrawal amount in VND |
| `bank_account_id` | int64 | Yes | Must exist and belong to user | Target bank account |

#### Response: 200 OK

```json
{
  "transaction_id": 42,
  "status": "pending"
}
```

The withdrawal is processed asynchronously. A background poller checks PayOS payout status every 30 seconds. The transaction status will update to `success` or `failed` once PayOS confirms.

#### Side Effects

- Wallet balance debited immediately
- `TotalWithdrawn` incremented
- Pending `withdrawal` transaction created
- PayOS CreatePayout API called
- Background poller monitors payout status

#### Errors

- `400` - Invalid amount (not in range, not multiple of 1000) / Bank account not found or not owned
- `500` - Insufficient available balance / PayOS payout creation failed

---

## 7. Payments (Escrow)

These endpoints manage escrow payments for task lifecycle. All require authentication.

### 7.1. Create Escrow Payment

Create an escrow payment for a task. Holds funds from requester's wallet.

**Endpoint:** `POST /api/v1/payments/escrow`
**Auth:** Required (must be task requester)

#### Request Body

```json
{
  "task_id": 1
}
```

#### Response: 200 OK

```json
{
  "transaction": {
    "id": 1,
    "task_id": 1,
    "payer_id": 1,
    "payee_id": 2,
    "amount": 20000,
    "platform_fee": 0,
    "net_amount": 20000,
    "type": "escrow",
    "status": "success",
    "description": "Escrow payment for task #1",
    "created_at": "2026-02-14T11:00:00Z",
    "updated_at": "2026-02-14T11:00:00Z"
  },
  "checkout_url": ""
}
```

#### Side Effects

- Deducts amount from requester's wallet balance
- Adds amount to requester's escrow balance
- Task status changes to `in_progress`

#### Errors

- `400` - Invalid request
- `500` - Insufficient balance / Task not in correct state

---

### 7.2. Release Payment

Release escrowed funds to tasker after task completion.

**Endpoint:** `POST /api/v1/payments/release`
**Auth:** Required (must be task requester)

#### Request Body

```json
{
  "task_id": 1
}
```

#### Response: 200 OK

```json
{
  "message": "Payment released successfully"
}
```

#### Side Effects

- Releases funds from requester's escrow
- Credits tasker's wallet (minus platform fee)
- Creates `release` and `platform_fee` transaction records

---

### 7.3. Refund Payment

Refund escrowed funds to requester.

**Endpoint:** `POST /api/v1/payments/refund`
**Auth:** Required (must be task requester)

#### Request Body

```json
{
  "task_id": 1,
  "reason": "Task cancelled by requester"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task_id` | int64 | Yes | Task ID |
| `reason` | string | Yes | Refund reason |

#### Response: 200 OK

```json
{
  "message": "Payment refunded successfully"
}
```

#### Side Effects

- Returns funds from escrow to requester's available balance
- Creates `refund` transaction record

---

## 8. Payment Link (PayOS)

Legacy/utility payment endpoints for direct PayOS integration.

### 8.1. Create Payment Link

Create a direct PayOS payment link (not escrow).

**Endpoint:** `POST /api/v1/payment/create`
**Auth:** Required

#### Request Body

```json
{
  "amount": 50000,
  "description": "Payment for service"
}
```

#### Response: 200 OK

```json
{
  "orderCode": 1707900000000,
  "checkoutUrl": "https://pay.payos.vn/web/...",
  "qrCode": "..."
}
```

---

### 8.2. Payment Return

Handles redirect after PayOS checkout. Redirects to `viecz://` deep link.

**Endpoint:** `GET /api/v1/payment/return`
**Auth:** None

This is a redirect endpoint used by PayOS. Users are redirected to:
- `viecz://payment/success?orderCode=...&amount=...&status=...` on success
- `viecz://payment/cancelled?orderCode=...` on cancellation
- `viecz://payment/error?code=...&orderCode=...` on error

---

## 9. Webhooks

### 9.1. PayOS Webhook

Receives payment notifications from PayOS. Processes deposit completions and escrow status changes.

**Endpoint:** `POST /api/v1/payment/webhook`
**Auth:** None (verified via PayOS signature)

#### Request Body (from PayOS)

```json
{
  "code": "00",
  "desc": "success",
  "success": true,
  "data": {
    "orderCode": 1707900000000,
    "code": "00",
    "amount": 50000
  }
}
```

#### Response: 200 OK

```json
{
  "code": "00",
  "desc": "success"
}
```

#### Side Effects

On success (`code: "00"`):
- For `deposit` transactions: credits user's wallet
- For `escrow` transactions: updates task status to `in_progress`

On cancellation (`code: "01"`):
- Marks transaction as `cancelled`

---

### 9.2. Confirm Webhook URL

Register a webhook URL with PayOS.

**Endpoint:** `POST /api/v1/payment/confirm-webhook`
**Auth:** Required

#### Request Body

```json
{
  "webhook_url": "https://your-server.com/api/v1/payment/webhook"
}
```

#### Response: 200 OK

```json
{
  "message": "Webhook URL confirmed",
  "webhook_url": "https://your-server.com/api/v1/payment/webhook"
}
```

---

## 10. Conversations & Messages

All conversation endpoints require authentication.

### 10.1. List Conversations

Get all conversations for the authenticated user.

**Endpoint:** `GET /api/v1/conversations`
**Auth:** Required

#### Response: 200 OK

```json
[
  {
    "id": 1,
    "task_id": 1,
    "poster_id": 1,
    "tasker_id": 2,
    "last_message_at": "2026-02-14T14:30:00Z",
    "last_message": "I delivered the items.",
    "created_at": "2026-02-14T10:00:00Z",
    "updated_at": "2026-02-14T14:30:00Z"
  }
]
```

---

### 10.2. Create Conversation

Create a conversation for a task between poster and tasker.

**Endpoint:** `POST /api/v1/conversations`
**Auth:** Required

#### Request Body

```json
{
  "task_id": 1,
  "tasker_id": 2
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task_id` | uint | Yes | Task ID |
| `tasker_id` | uint | Yes | Tasker's user ID |

If a conversation already exists for the task, the existing one is returned.

#### Response: 201 Created

```json
{
  "id": 1,
  "task_id": 1,
  "poster_id": 1,
  "tasker_id": 2,
  "last_message": "",
  "created_at": "2026-02-14T10:00:00Z",
  "updated_at": "2026-02-14T10:00:00Z"
}
```

---

### 10.3. Get Conversation

Get a single conversation with preloaded poster, tasker, and task details.

**Endpoint:** `GET /api/v1/conversations/:id`
**Auth:** Required (must be poster or tasker in the conversation)

#### Response: 200 OK

```json
{
  "id": 1,
  "task_id": 1,
  "poster_id": 1,
  "tasker_id": 2,
  "last_message_at": "2026-02-14T14:30:00Z",
  "last_message": "I delivered the items.",
  "created_at": "2026-02-14T10:00:00Z",
  "updated_at": "2026-02-14T14:30:00Z",
  "poster": { "id": 1, "name": "Alice" },
  "tasker": { "id": 2, "name": "Bob" },
  "task": { "id": 1, "title": "Deliver groceries" }
}
```

#### Errors

- `404` - Conversation not found or user not authorized

---

### 10.4. Get Conversation Messages

Get message history for a conversation.

**Endpoint:** `GET /api/v1/conversations/:id/messages`
**Auth:** Required (must be poster or tasker in the conversation)

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | int | 50 | Number of messages |
| `offset` | int | 0 | Offset for pagination |

#### Response: 200 OK

```json
[
  {
    "id": 1,
    "conversation_id": 1,
    "sender_id": 1,
    "content": "Can you deliver within 30 minutes?",
    "is_read": true,
    "read_at": "2026-02-14T14:05:00Z",
    "created_at": "2026-02-14T14:00:00Z",
    "updated_at": "2026-02-14T14:05:00Z"
  },
  {
    "id": 2,
    "conversation_id": 1,
    "sender_id": 2,
    "content": "Yes, I will come right away!",
    "is_read": false,
    "created_at": "2026-02-14T14:06:00Z",
    "updated_at": "2026-02-14T14:06:00Z"
  }
]
```

#### Errors

- `403` - User not authorized to view this conversation

---

## 11. WebSocket

### 11.1. Connect

Establish a WebSocket connection for real-time messaging.

**Endpoint:** `GET /api/v1/ws?token=<jwt_token>`
**Auth:** JWT token in query parameter or `Authorization` header

```javascript
const ws = new WebSocket("ws://localhost:9999/api/v1/ws?token=YOUR_JWT_TOKEN");
```

### 11.2. Message Types (Client to Server)

#### Join Conversation

Must join a conversation before sending/receiving messages in it.

```json
{
  "type": "join",
  "conversation_id": 1
}
```

**Server response:**

```json
{
  "type": "joined",
  "conversation_id": 1,
  "created_at": "2026-02-14T14:00:00Z"
}
```

#### Send Message

```json
{
  "type": "message",
  "conversation_id": 1,
  "content": "Hello!"
}
```

**Server response to sender:**

```json
{
  "type": "message_sent",
  "conversation_id": 1,
  "message_id": 123,
  "sender_id": 1,
  "content": "Hello!",
  "created_at": "2026-02-14T14:30:00Z"
}
```

**Broadcast to other participants:**

```json
{
  "type": "message",
  "conversation_id": 1,
  "message_id": 123,
  "sender_id": 1,
  "content": "Hello!",
  "created_at": "2026-02-14T14:30:00Z"
}
```

#### Typing Indicator

```json
{
  "type": "typing",
  "conversation_id": 1
}
```

**Broadcast to other participants:**

```json
{
  "type": "typing",
  "conversation_id": 1,
  "sender_id": 1
}
```

#### Mark Messages Read

```json
{
  "type": "read",
  "conversation_id": 1
}
```

**Server response:**

```json
{
  "type": "read_confirmed",
  "conversation_id": 1,
  "created_at": "2026-02-14T14:35:00Z"
}
```

### 11.3. Error Messages

```json
{
  "type": "error",
  "error": "conversation not found"
}
```

### 11.4. Connection Parameters

| Parameter | Value |
|-----------|-------|
| Max message size | 512 KB |
| Ping interval | 54 seconds |
| Pong timeout | 60 seconds |
| Write timeout | 10 seconds |
| Send buffer | 256 messages |

---

## 12. Notifications

All notification endpoints require authentication. Users can only access their own notifications.

### 12.1. List Notifications

Get paginated list of notifications for the authenticated user.

**Endpoint:** `GET /api/v1/notifications`
**Auth:** Required

#### Query Parameters

| Parameter | Type | Default | Constraints | Description |
|-----------|------|---------|-------------|-------------|
| `limit` | int | 20 | 1-100 | Number of notifications |
| `offset` | int | 0 | >= 0 | Offset for pagination |

#### Response: 200 OK

```json
{
  "notifications": [
    {
      "id": 1,
      "user_id": 1,
      "type": "application_received",
      "title": "New Application",
      "message": "Someone applied to your task 'Deliver lunch'",
      "task_id": 5,
      "is_read": false,
      "created_at": "2026-02-15T10:00:00Z"
    }
  ],
  "total": 12
}
```

---

### 12.2. Get Unread Count

Get the number of unread notifications for the authenticated user.

**Endpoint:** `GET /api/v1/notifications/unread-count`
**Auth:** Required

#### Response: 200 OK

```json
{
  "unread_count": 3
}
```

---

### 12.3. Mark as Read

Mark a single notification as read.

**Endpoint:** `POST /api/v1/notifications/:id/read`
**Auth:** Required (must be notification owner)

#### Response: 200 OK

```json
{
  "message": "notification marked as read"
}
```

#### Errors

- `400` - Invalid notification ID
- `404` - Notification not found or not owned by user

---

### 12.4. Mark All as Read

Mark all notifications as read for the authenticated user.

**Endpoint:** `POST /api/v1/notifications/read-all`
**Auth:** Required

#### Response: 200 OK

```json
{
  "message": "all notifications marked as read"
}
```

---

### 12.5. Delete Notification

Delete a single notification.

**Endpoint:** `DELETE /api/v1/notifications/:id`
**Auth:** Required (must be notification owner)

#### Response: 200 OK

```json
{
  "message": "notification deleted"
}
```

#### Errors

- `400` - Invalid notification ID
- `404` - Notification not found or not owned by user

---

### 12.6. Notification Types

Notifications are created server-side at these trigger points:

| Type | Recipient | Trigger |
|------|-----------|---------|
| `task_created` | Task creator | Task posted successfully |
| `application_received` | Task creator | Someone applied to their task |
| `application_sent` | Applicant | Application submitted |
| `application_accepted` | Applicant | Task creator accepted their application |
| `task_completed` | Both parties | Task marked complete |
| `payment_received` | Tasker | Escrow released to their wallet |
| `task_cancelled` | Rejected applicants | Task creator deletes/cancels the task |

### 12.7. Real-Time Delivery

When a notification is created, if the recipient is connected via WebSocket, a real-time message is sent:

```json
{
  "type": "notification",
  "content": "Someone applied to your task 'Deliver lunch'"
}
```

---

## 13. Banks

### 13.1. List Banks

Get the list of Vietnamese banks that support transfers (from VietQR/Napas). Results are cached server-side for 24 hours.

**Endpoint:** `GET /api/v1/banks`
**Auth:** None

#### Response: 200 OK

```json
[
  {
    "id": 17,
    "name": "Ngân hàng TMCP Ngoại thương Việt Nam",
    "code": "VCB",
    "bin": "970436",
    "shortName": "Vietcombank",
    "logo": "https://api.vietqr.io/img/VCB.png",
    "transferSupported": 1,
    "lookupSupported": 1
  }
]
```

The response contains only banks where `transferSupported == 1`. The full bank list is fetched from `https://api.vietqr.io/v2/banks` and filtered. On fetch error, stale cache is returned (graceful degradation).

---

## 14. Error Responses

### Standard Error Format

```json
{
  "error": "error_code_or_message"
}
```

Or with message detail:

```json
{
  "error": "error_code",
  "message": "Human-readable description"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Resource created |
| 302 | Redirect (payment return) |
| 400 | Bad request / Validation error |
| 401 | Missing or invalid authentication |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Conflict (e.g., duplicate email) |
| 500 | Internal server error |

---

## 15. Appendices

### A. Health Check

**Endpoint:** `GET /api/v1/health`
**Auth:** None

```json
{
  "status": "ok"
}
```

### B. Task Status Lifecycle

```
open --> in_progress --> completed
  |
  +--> cancelled
```

| Transition | Trigger |
|------------|---------|
| `open` -> `in_progress` | Escrow payment created (via webhook confirmation) |
| `in_progress` -> `completed` | Requester calls `POST /tasks/:id/complete` |
| `open` -> `cancelled` | Requester deletes task. Side effects: all pending applications rejected, applicants notified via `task_cancelled` notification |

### C. Payment Flow

```
1. Requester creates task (status: open)
2. Tasker applies for task
3. Requester accepts application (tasker assigned)
4. Requester creates escrow: POST /payments/escrow
   -> Wallet debited, escrow balance increases
   -> Task status: in_progress
5. Tasker completes work
6. Requester marks complete: POST /tasks/:id/complete
   -> Task status: completed
7. Requester releases payment: POST /payments/release
   -> Escrow released to tasker's wallet (minus platform fee)
```

### D. Wallet Deposit Flow (PayOS)

```
1. User requests deposit: POST /wallet/deposit
   -> Creates pending transaction
   -> Returns PayOS checkout URL
2. User completes payment on PayOS
3. PayOS sends webhook: POST /payment/webhook
   -> Transaction marked as success
   -> Wallet balance credited
```

On the test server, step 2-3 happen automatically (mock PayOS fires webhook after 100ms).

### E. Data Types

| Type | Format |
|------|--------|
| Currency | VND, int64, no decimals |
| DateTime | ISO 8601 / RFC 3339: `2026-02-14T10:00:00Z` |
| IDs | int64 (users, tasks, transactions) or uint (conversations, messages) |

### F. Configuration Defaults

| Config | Default | Description |
|--------|---------|-------------|
| `MAX_WALLET_BALANCE` | 200,000 VND | Maximum wallet balance per user |
| `PLATFORM_FEE_RATE` | 0 (beta) | Platform fee as decimal (0.10 = 10%) |
| `PORT` | 8080 (prod) / 9999 (test) | Server port |

### G. Test Server

The test server (`cmd/testserver/main.go`) provides an identical API with:
- PostgreSQL test database (port 5433, Docker tmpfs -- drops all tables on each restart)
- Mock PayOS (auto-completes deposits via internal webhook)
- JWT secret: `e2e-test-secret-key`
- Max wallet balance: 200,000 VND
- Seeded test users: `nhan1@gmail.com` / `Password123` and `nhan2@gmail.com` / `Password123` (both taskers)
- Seeded wallets: 10,000,000 VND each for test users
- Seeded tasks: 10 sample tasks in Vietnamese across various categories
- Port: 9999

### H. Route Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/health` | No | Health check |
| POST | `/api/v1/auth/register` | No | Register |
| POST | `/api/v1/auth/login` | No | Login |
| POST | `/api/v1/auth/google` | No | Google OAuth login |
| POST | `/api/v1/auth/verify-email` | No | Verify email |
| POST | `/api/v1/auth/refresh` | No | Refresh token |
| POST | `/api/v1/auth/resend-verification` | Yes | Resend verification email |
| GET | `/api/v1/categories` | No | List categories |
| GET | `/api/v1/banks` | No | List banks (VietQR) |
| GET | `/api/v1/users/:id` | No | Get user profile |
| GET | `/api/v1/users/me` | Yes | Get my profile |
| PUT | `/api/v1/users/me` | Yes | Update my profile |
| POST | `/api/v1/users/me/avatar` | Yes | Upload avatar |
| POST | `/api/v1/users/become-tasker` | Yes | Become tasker |
| POST | `/api/v1/tasks` | Yes | Create task |
| GET | `/api/v1/tasks` | Yes | List tasks |
| GET | `/api/v1/tasks/:id` | Yes | Get task |
| PUT | `/api/v1/tasks/:id` | Yes | Update task |
| DELETE | `/api/v1/tasks/:id` | Yes | Delete task |
| POST | `/api/v1/tasks/:id/applications` | Yes | Apply for task |
| GET | `/api/v1/tasks/:id/applications` | Yes | Get task applications |
| POST | `/api/v1/tasks/:id/complete` | Yes | Complete task |
| POST | `/api/v1/applications/:id/accept` | Yes | Accept application |
| GET | `/api/v1/wallet` | Yes | Get wallet |
| POST | `/api/v1/wallet/deposit` | Yes | Deposit funds |
| GET | `/api/v1/wallet/transactions` | Yes | Transaction history |
| GET | `/api/v1/wallet/bank-accounts` | Yes | List bank accounts |
| POST | `/api/v1/wallet/bank-accounts` | Yes | Add bank account |
| DELETE | `/api/v1/wallet/bank-accounts/:id` | Yes | Delete bank account |
| POST | `/api/v1/wallet/withdraw` | Yes | Withdraw funds |
| POST | `/api/v1/payments/escrow` | Yes | Create escrow |
| POST | `/api/v1/payments/release` | Yes | Release payment |
| POST | `/api/v1/payments/refund` | Yes | Refund payment |
| POST | `/api/v1/payment/create` | Yes | Create payment link |
| GET | `/api/v1/payment/return` | No | Payment return redirect |
| POST | `/api/v1/payment/webhook` | No | PayOS webhook |
| POST | `/api/v1/payment/confirm-webhook` | Yes | Confirm webhook URL |
| GET | `/api/v1/notifications` | Yes | List notifications |
| GET | `/api/v1/notifications/unread-count` | Yes | Get unread count |
| POST | `/api/v1/notifications/:id/read` | Yes | Mark notification as read |
| POST | `/api/v1/notifications/read-all` | Yes | Mark all as read |
| DELETE | `/api/v1/notifications/:id` | Yes | Delete notification |
| GET | `/api/v1/conversations` | Yes | List conversations |
| POST | `/api/v1/conversations` | Yes | Create conversation |
| GET | `/api/v1/conversations/:id` | Yes | Get conversation details |
| GET | `/api/v1/conversations/:id/messages` | Yes | Get messages |
| GET | `/api/v1/ws` | Yes* | WebSocket (token via query param) |

---

**End of API Reference**
