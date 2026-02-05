# API Reference

**Project:** Dịch Vụ Nhỏ Cho Sinh Viên (Mini Services for Students)
**Version:** 1.0.0
**Base URL:** `http://localhost:8000/api/v1`
**WebSocket URL:** `ws://localhost:8000`
**Last Updated:** 2026-02-04

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Users](#2-users)
3. [Tasks](#3-tasks)
4. [Payments](#4-payments)
5. [Wallet](#5-wallet)
6. [Messages](#6-messages)
7. [Notifications](#7-notifications)
8. [Categories](#8-categories)
9. [WebSocket](#9-websocket)
10. [Error Responses](#10-error-responses)

---

## 1. Authentication

### 1.1. Zalo Login

Login with Zalo OAuth access token.

**Endpoint:** `POST /api/v1/auth/zalo`
**Authentication:** None
**Content-Type:** `application/json`

#### Request Body

```json
{
  "access_token": "string"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `access_token` | string | Yes | Zalo access token from Mini App SDK |

#### Response: 200 OK

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

#### cURL Example

```bash
curl -X POST http://localhost:8000/api/v1/auth/zalo \
  -H "Content-Type: application/json" \
  -d '{
    "access_token": "zalo_access_token_here"
  }'
```

#### Error Responses

- `401 Unauthorized` - Invalid Zalo access token
- `503 Service Unavailable` - Unable to connect to Zalo API

---

### 1.2. Refresh Token

Refresh JWT access token using refresh token.

**Endpoint:** `POST /api/v1/auth/refresh`
**Authentication:** None
**Content-Type:** `application/json`

#### Request Body

```json
{
  "refresh_token": "string"
}
```

#### Response: 200 OK

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

#### cURL Example

```bash
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "your_refresh_token_here"
  }'
```

#### Error Responses

- `401 Unauthorized` - Invalid or expired refresh token

---

### 1.3. Logout

Logout user (client should delete tokens locally).

**Endpoint:** `POST /api/v1/auth/logout`
**Authentication:** None

#### Response: 200 OK

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### cURL Example

```bash
curl -X POST http://localhost:8000/api/v1/auth/logout
```

---

### 1.4. Dev Login

**⚠️ DEBUG MODE ONLY** - Create test user without Zalo OAuth.

**Endpoint:** `POST /api/v1/auth/dev-login`
**Authentication:** None
**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `name` | string | No | "Test User" | Name for test user |

#### Response: 200 OK

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

#### cURL Example

```bash
curl -X POST "http://localhost:8000/api/v1/auth/dev-login?name=TestUser"
```

#### Error Responses

- `404 Not Found` - DEBUG mode is disabled

---

## 2. Users

All user endpoints require authentication via Bearer token.

### 2.1. Get Current User Profile

Get current authenticated user's full profile including wallet balance.

**Endpoint:** `GET /api/v1/users/me`
**Authentication:** Required (Bearer token)

#### Response: 200 OK

```json
{
  "id": 1,
  "zalo_id": "1234567890",
  "name": "Nguyễn Văn A",
  "avatar_url": "https://example.com/avatar.jpg",
  "phone": "0901234567",
  "email": "user@example.com",
  "university": "ĐHQG-HCM",
  "student_id": "20120001",
  "is_verified": true,
  "rating": 4.5,
  "total_tasks_completed": 10,
  "total_tasks_posted": 5,
  "balance": 1000000,
  "is_tasker": true,
  "tasker_bio": "Experienced in delivery and tutoring",
  "tasker_skills": ["Giao hàng", "Dạy học"],
  "created_at": "2024-01-01T00:00:00",
  "updated_at": "2024-01-01T00:00:00"
}
```

#### cURL Example

```bash
curl -X GET http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 2.2. Update Current User Profile

Update current user's profile information.

**Endpoint:** `PUT /api/v1/users/me`
**Authentication:** Required (Bearer token)
**Content-Type:** `application/json`

#### Request Body

```json
{
  "name": "Nguyễn Văn B",
  "email": "newmail@example.com",
  "phone": "0987654321",
  "student_id": "20120002",
  "avatar_url": "https://example.com/new-avatar.jpg"
}
```

All fields are optional.

#### Response: 200 OK

Returns updated user profile (same format as 2.1).

#### cURL Example

```bash
curl -X PUT http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "phone": "0987654321"
  }'
```

---

### 2.3. Get User Public Profile

Get public profile of any user by ID.

**Endpoint:** `GET /api/v1/users/{user_id}`
**Authentication:** Required (Bearer token)

#### Response: 200 OK

```json
{
  "id": 2,
  "name": "Trần Thị B",
  "avatar_url": "https://example.com/avatar2.jpg",
  "university": "ĐHQG-HCM",
  "is_verified": true,
  "rating": 4.8,
  "total_tasks_completed": 25,
  "is_tasker": true,
  "tasker_bio": "Fast and reliable delivery service",
  "tasker_skills": ["Giao hàng", "Mua hộ"]
}
```

#### cURL Example

```bash
curl -X GET http://localhost:8000/api/v1/users/2 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Error Responses

- `404 Not Found` - User not found

---

### 2.4. Become Tasker

Register as a Tasker (service provider).

**Endpoint:** `POST /api/v1/users/become-tasker`
**Authentication:** Required (Bearer token)
**Content-Type:** `application/json`

#### Request Body

```json
{
  "tasker_bio": "I'm a reliable student looking to help with deliveries and tutoring.",
  "tasker_skills": ["Giao hàng", "Dạy học", "Mua hộ"]
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `tasker_bio` | string | Yes | 10-500 chars | Bio/description |
| `tasker_skills` | array[string] | Yes | 1-10 items | List of skills |

#### Response: 200 OK

Returns full user profile with `is_tasker: true`.

#### cURL Example

```bash
curl -X POST http://localhost:8000/api/v1/users/become-tasker \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tasker_bio": "I am good at delivery and tutoring",
    "tasker_skills": ["Giao hàng", "Dạy học"]
  }'
```

#### Error Responses

- `400 Bad Request` - Already a Tasker
- `422 Unprocessable Entity` - Validation error

---

### 2.5. Update Tasker Profile

Update Tasker bio and skills.

**Endpoint:** `PUT /api/v1/users/tasker-profile`
**Authentication:** Required (Bearer token, must be Tasker)
**Content-Type:** `application/json`

#### Request Body

Same format as 2.4 (both fields required).

#### Response: 200 OK

Returns updated user profile.

#### cURL Example

```bash
curl -X PUT http://localhost:8000/api/v1/users/tasker-profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tasker_bio": "Updated bio",
    "tasker_skills": ["Giao hàng", "Mua hộ", "Dạy học"]
  }'
```

#### Error Responses

- `400 Bad Request` - Not a Tasker

---

## 3. Tasks

### 3.1. List Tasks

Get paginated list of tasks with filtering and sorting.

**Endpoint:** `GET /api/v1/tasks`
**Authentication:** Required (Bearer token)

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `status` | string | No | "open" | Filter by status (open, accepted, in_progress, completed, cancelled) |
| `category_id` | integer | No | - | Filter by single category |
| `category_ids` | array[integer] | No | - | Filter by multiple categories |
| `search` | string | No | - | Search in task title |
| `min_price` | integer | No | - | Minimum price (VND) |
| `max_price` | integer | No | - | Maximum price (VND, max 10M) |
| `sort` | string | No | "created_at" | Sort field (created_at, price, deadline) |
| `order` | string | No | "desc" | Sort order (asc, desc) |
| `page` | integer | No | 1 | Page number (min 1) |
| `limit` | integer | No | 20 | Items per page (1-100) |

#### Response: 200 OK

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Giao đồ ăn từ quán cơm đến KTX A",
      "price": 20000,
      "price_negotiable": false,
      "status": "open",
      "location_from": "Quán cơm gần cổng chính",
      "deadline": "2024-01-02T12:00:00",
      "created_at": "2024-01-01T10:00:00",
      "requester": {
        "id": 1,
        "name": "Nguyễn Văn A",
        "avatar_url": "https://example.com/avatar.jpg",
        "rating": 4.5
      },
      "category": {
        "id": 1,
        "name": "delivery",
        "name_vi": "Giao hàng",
        "icon": "🚚"
      },
      "application_count": 3
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

#### cURL Example

```bash
# Basic list
curl -X GET "http://localhost:8000/api/v1/tasks" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# With filters
curl -X GET "http://localhost:8000/api/v1/tasks?category_id=1&min_price=10000&max_price=50000&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Search
curl -X GET "http://localhost:8000/api/v1/tasks?search=giao%20hàng" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 3.2. Get My Posted Tasks

Get tasks posted by current user.

**Endpoint:** `GET /api/v1/tasks/my-posted`
**Authentication:** Required (Bearer token)

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `status` | string | No | - | Filter by status |
| `page` | integer | No | 1 | Page number |
| `limit` | integer | No | 20 | Items per page (1-100) |

#### Response: 200 OK

Same format as 3.1.

#### cURL Example

```bash
curl -X GET "http://localhost:8000/api/v1/tasks/my-posted?status=open" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 3.3. Get My Assigned Tasks

Get tasks assigned to current user (as Tasker).

**Endpoint:** `GET /api/v1/tasks/my-assigned`
**Authentication:** Required (Bearer token)

#### Query Parameters

Same as 3.2.

#### Response: 200 OK

Same format as 3.1.

#### cURL Example

```bash
curl -X GET "http://localhost:8000/api/v1/tasks/my-assigned?status=in_progress" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 3.4. Create Task

Create a new task posting.

**Endpoint:** `POST /api/v1/tasks`
**Authentication:** Required (Bearer token)
**Content-Type:** `application/json`

#### Request Body

```json
{
  "title": "Giao đồ ăn từ quán cơm đến KTX A",
  "description": "Cần người giao cơm trưa, số lượng 2 phần. Đồ ăn đã đặt trước.",
  "price": 20000,
  "price_negotiable": false,
  "category_id": 1,
  "location_from": "Quán cơm gần cổng chính",
  "location_to": "KTX Khu A, phòng 302",
  "deadline": "2024-01-02T12:00:00"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `title` | string | Yes | 5-200 chars | Task title |
| `description` | string | No | Max 2000 chars | Task description |
| `price` | integer | Yes | 1-10,000,000 | Price in VND |
| `price_negotiable` | boolean | No | - | Default: false |
| `category_id` | integer | Yes | Valid category | Category ID |
| `location_from` | string | No | Max 200 chars | Starting location |
| `location_to` | string | No | Max 200 chars | Destination |
| `deadline` | datetime | No | ISO 8601 | Task deadline |

#### Response: 201 Created

```json
{
  "id": 1,
  "title": "Giao đồ ăn từ quán cơm đến KTX A",
  "description": "Cần người giao cơm trưa...",
  "price": 20000,
  "price_negotiable": false,
  "status": "open",
  "location_from": "Quán cơm gần cổng chính",
  "location_to": "KTX Khu A, phòng 302",
  "deadline": "2024-01-02T12:00:00",
  "completed_at": null,
  "created_at": "2024-01-01T10:00:00",
  "updated_at": "2024-01-01T10:00:00",
  "requester": {
    "id": 1,
    "name": "Nguyễn Văn A",
    "avatar_url": "https://example.com/avatar.jpg",
    "rating": 4.5
  },
  "tasker": null,
  "category": {
    "id": 1,
    "name": "delivery",
    "name_vi": "Giao hàng",
    "icon": "🚚"
  },
  "application_count": 0
}
```

#### cURL Example

```bash
curl -X POST http://localhost:8000/api/v1/tasks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Giao đồ ăn từ quán cơm đến KTX A",
    "description": "Cần người giao cơm trưa",
    "price": 20000,
    "category_id": 1,
    "location_from": "Quán cơm",
    "location_to": "KTX A"
  }'
```

#### Error Responses

- `400 Bad Request` - Invalid category ID
- `422 Unprocessable Entity` - Validation error

---

### 3.5. Get Task Details

Get full details of a specific task.

**Endpoint:** `GET /api/v1/tasks/{task_id}`
**Authentication:** Required (Bearer token)

#### Response: 200 OK

Same format as 3.4 Create Task response.

#### cURL Example

```bash
curl -X GET http://localhost:8000/api/v1/tasks/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Error Responses

- `404 Not Found` - Task not found

---

### 3.6. Update Task

Update task details. Only requester can update, only open tasks.

**Endpoint:** `PUT /api/v1/tasks/{task_id}`
**Authentication:** Required (Bearer token, must be requester)
**Content-Type:** `application/json`

#### Request Body

All fields optional:

```json
{
  "title": "Updated title",
  "description": "Updated description",
  "price": 25000,
  "price_negotiable": true,
  "location_from": "New location",
  "location_to": "New destination",
  "deadline": "2024-01-03T12:00:00"
}
```

#### Response: 200 OK

Returns updated task (same format as 3.4).

#### cURL Example

```bash
curl -X PUT http://localhost:8000/api/v1/tasks/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 25000,
    "price_negotiable": true
  }'
```

#### Error Responses

- `404 Not Found` - Task not found
- `403 Forbidden` - Not authorized (not requester)
- `400 Bad Request` - Can only update open tasks

---

### 3.7. Cancel Task

Cancel a task. Only requester can cancel open or accepted tasks.

**Endpoint:** `DELETE /api/v1/tasks/{task_id}`
**Authentication:** Required (Bearer token, must be requester)

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reason` | string | No | Cancellation reason |

#### Response: 200 OK

```json
{
  "success": true,
  "message": "Task cancelled"
}
```

#### cURL Example

```bash
curl -X DELETE "http://localhost:8000/api/v1/tasks/1?reason=No%20longer%20needed" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Error Responses

- `404 Not Found` - Task not found
- `403 Forbidden` - Not authorized
- `400 Bad Request` - Cannot cancel task in current status

---

### 3.8. Apply for Task

Apply for a task as a Tasker.

**Endpoint:** `POST /api/v1/tasks/{task_id}/apply`
**Authentication:** Required (Bearer token, must be Tasker)
**Content-Type:** `application/json`

#### Request Body

```json
{
  "proposed_price": 18000,
  "message": "I can complete this within 30 minutes. I'm near the area."
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `proposed_price` | integer | No | 1-10,000,000 | Counter-offer price |
| `message` | string | No | Max 500 chars | Application message |

#### Response: 200 OK

```json
{
  "id": 1,
  "task_id": 1,
  "tasker": {
    "id": 2,
    "name": "Trần Thị B",
    "avatar_url": "https://example.com/avatar2.jpg",
    "rating": 4.8
  },
  "proposed_price": 18000,
  "message": "I can complete this within 30 minutes...",
  "status": "pending",
  "created_at": "2024-01-01T10:30:00"
}
```

#### cURL Example

```bash
curl -X POST http://localhost:8000/api/v1/tasks/1/apply \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "proposed_price": 18000,
    "message": "I can help with this!"
  }'
```

#### Error Responses

- `404 Not Found` - Task not found
- `400 Bad Request` - Task not open / Cannot apply to own task
- `409 Conflict` - Already applied

---

### 3.9. Get Task Applications

Get all applications for a task. Only requester can view.

**Endpoint:** `GET /api/v1/tasks/{task_id}/applications`
**Authentication:** Required (Bearer token, must be requester)

#### Response: 200 OK

```json
[
  {
    "id": 1,
    "task_id": 1,
    "tasker": {
      "id": 2,
      "name": "Trần Thị B",
      "avatar_url": "https://example.com/avatar2.jpg",
      "rating": 4.8
    },
    "proposed_price": 18000,
    "message": "I can complete this quickly",
    "status": "pending",
    "created_at": "2024-01-01T10:30:00"
  },
  {
    "id": 2,
    "task_id": 1,
    "tasker": {
      "id": 3,
      "name": "Lê Văn C",
      "avatar_url": null,
      "rating": 4.2
    },
    "proposed_price": null,
    "message": "I'm available now",
    "status": "pending",
    "created_at": "2024-01-01T10:45:00"
  }
]
```

#### cURL Example

```bash
curl -X GET http://localhost:8000/api/v1/tasks/1/applications \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Error Responses

- `404 Not Found` - Task not found
- `403 Forbidden` - Not authorized (not requester)

---

### 3.10. Accept Application

Accept a Tasker's application. Only requester can accept.

**Endpoint:** `POST /api/v1/tasks/{task_id}/accept/{application_id}`
**Authentication:** Required (Bearer token, must be requester)

#### Response: 200 OK

```json
{
  "success": true,
  "message": "Application accepted"
}
```

#### Side Effects

- Task status → `accepted`
- Accepted application status → `accepted`
- Other applications → `rejected`
- Task price updated to proposed_price (if provided)
- Tasker assigned to task

#### cURL Example

```bash
curl -X POST http://localhost:8000/api/v1/tasks/1/accept/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Error Responses

- `404 Not Found` - Task or application not found
- `403 Forbidden` - Not authorized
- `400 Bad Request` - Task is not open

---

### 3.11. Complete Task

Mark task as completed. Only requester can complete.

**Endpoint:** `POST /api/v1/tasks/{task_id}/complete`
**Authentication:** Required (Bearer token, must be requester)

#### Response: 200 OK

```json
{
  "success": true,
  "message": "Task marked as completed"
}
```

#### Side Effects

- Task status → `completed`
- Tasker's `total_tasks_completed` incremented
- Ready for payment release

#### cURL Example

```bash
curl -X POST http://localhost:8000/api/v1/tasks/1/complete \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Error Responses

- `404 Not Found` - Task not found
- `403 Forbidden` - Not authorized
- `400 Bad Request` - Task must be in progress

---

## 4. Payments

### 4.1. Create Payment

Create escrow payment for a task. Uses mock payment if `MOCK_PAYMENT_ENABLED=true`.

**Endpoint:** `POST /api/v1/payments/create`
**Authentication:** Required (Bearer token, must be requester)
**Content-Type:** `application/json`

#### Request Body

```json
{
  "task_id": 1
}
```

#### Response: 200 OK (Mock Mode)

```json
{
  "success": true,
  "transaction_id": 1,
  "app_trans_id": "240101_MOCK_abc123",
  "order_url": null,
  "zp_trans_token": null
}
```

#### Response: 200 OK (ZaloPay Mode)

```json
{
  "success": true,
  "transaction_id": 1,
  "app_trans_id": "240101_1",
  "order_url": "https://sbgateway.zalopay.vn/openinapp?order_token=xyz",
  "zp_trans_token": "xyz123"
}
```

#### cURL Example

```bash
curl -X POST http://localhost:8000/api/v1/payments/create \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": 1
  }'
```

#### Error Responses

- `404 Not Found` - Task not found
- `403 Forbidden` - Only requester can create payment
- `400 Bad Request` - Task must be accepted / Insufficient balance (mock mode)
- `409 Conflict` - Payment already exists

---

### 4.2. Get Payment Status

Get status of a payment transaction.

**Endpoint:** `GET /api/v1/payments/status/{transaction_id}`
**Authentication:** Required (Bearer token, must be payer or payee)

#### Response: 200 OK

```json
{
  "transaction_id": 1,
  "status": "success",
  "amount": 20000,
  "type": "escrow",
  "created_at": "2024-01-01T11:00:00",
  "completed_at": "2024-01-01T11:00:05"
}
```

#### Status Values

- `pending` - Payment initiated but not completed
- `success` - Payment successful, funds in escrow
- `released` - Funds released to Tasker
- `refunded` - Refunded to requester
- `failed` - Payment failed

#### cURL Example

```bash
curl -X GET http://localhost:8000/api/v1/payments/status/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Error Responses

- `404 Not Found` - Transaction not found
- `403 Forbidden` - Not authorized

---

### 4.3. ZaloPay Callback

**Internal endpoint** - ZaloPay callback for payment confirmation.

**Endpoint:** `POST /api/v1/payments/callback`
**Authentication:** None (verified via MAC)

Not for direct client use.

---

### 4.4. Release Payment

Release escrow payment to Tasker after task completion.

**Endpoint:** `POST /api/v1/payments/release/{task_id}`
**Authentication:** Required (Bearer token, must be requester)

#### Response: 200 OK (Mock Mode)

```json
{
  "success": true,
  "message": "Payment released to tasker",
  "total_amount": 20000,
  "platform_fee": 2000,
  "tasker_amount": 18000
}
```

#### Side Effects

- Escrow transaction status → `released`
- Creates new `release` transaction
- Platform fee deducted (10%)
- Tasker receives funds (90%)
- Tasker's `total_earnings` incremented

#### cURL Example

```bash
curl -X POST http://localhost:8000/api/v1/payments/release/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Error Responses

- `404 Not Found` - Task or escrow payment not found
- `403 Forbidden` - Only requester can release
- `400 Bad Request` - Task must be completed

---

### 4.5. Refund Payment

Refund escrow payment to requester (when task cancelled).

**Endpoint:** `POST /api/v1/payments/refund/{task_id}`
**Authentication:** Required (Bearer token, must be requester)

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reason` | string | No | Refund reason |

#### Response: 200 OK (Mock Mode)

```json
{
  "success": true,
  "message": "Payment refunded",
  "amount": 20000
}
```

#### cURL Example

```bash
curl -X POST "http://localhost:8000/api/v1/payments/refund/1?reason=Task%20cancelled" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Error Responses

- `404 Not Found` - Task or escrow payment not found
- `403 Forbidden` - Only requester can request refund
- `501 Not Implemented` - ZaloPay refund not implemented

---

### 4.6. Get Payment History

Get payment transaction history for current user.

**Endpoint:** `GET /api/v1/payments/history`
**Authentication:** Required (Bearer token)

#### Response: 200 OK

```json
{
  "success": true,
  "mock_mode": true,
  "data": [
    {
      "id": 1,
      "task_id": 1,
      "amount": 20000,
      "type": "escrow",
      "status": "success",
      "is_payer": true,
      "created_at": "2024-01-01T11:00:00"
    },
    {
      "id": 2,
      "task_id": 1,
      "amount": 18000,
      "type": "release",
      "status": "success",
      "is_payer": false,
      "created_at": "2024-01-01T15:00:00"
    }
  ]
}
```

#### cURL Example

```bash
curl -X GET http://localhost:8000/api/v1/payments/history \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 4.7. Get Payment Mode

Check if using mock or real ZaloPay.

**Endpoint:** `GET /api/v1/payments/mode`
**Authentication:** None

#### Response: 200 OK

```json
{
  "mock_enabled": true,
  "message": "Đang sử dụng thanh toán giả lập"
}
```

#### cURL Example

```bash
curl -X GET http://localhost:8000/api/v1/payments/mode
```

---

## 5. Wallet

**Note:** Wallet endpoints only available when `MOCK_PAYMENT_ENABLED=true`.

### 5.1. Get Wallet Balance

Get current user's wallet balance.

**Endpoint:** `GET /api/v1/wallet/balance`
**Authentication:** Required (Bearer token)

#### Response: 200 OK

```json
{
  "balance": 1000000,
  "frozen_balance": 20000,
  "available_balance": 980000,
  "currency": "VND",
  "mock_mode": true
}
```

#### Field Descriptions

- `balance` - Total balance
- `frozen_balance` - Amount held in escrow
- `available_balance` - Available for spending

#### cURL Example

```bash
curl -X GET http://localhost:8000/api/v1/wallet/balance \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Error Responses

- `400 Bad Request` - Wallet only available in mock mode

---

### 5.2. Get Wallet Transaction History

Get wallet transaction history.

**Endpoint:** `GET /api/v1/wallet/history`
**Authentication:** Required (Bearer token)

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 20 | Number of transactions (1-100) |

#### Response: 200 OK

```json
[
  {
    "id": 1,
    "type": "deposit",
    "amount": 1000000,
    "direction": "credit",
    "balance_after": 1000000,
    "description": "Initial balance",
    "created_at": "2024-01-01T00:00:00"
  },
  {
    "id": 2,
    "type": "escrow_hold",
    "amount": 20000,
    "direction": "debit",
    "balance_after": 980000,
    "description": "Escrow for task #1",
    "created_at": "2024-01-01T11:00:00"
  }
]
```

#### Transaction Types

- `deposit` - Funds added to wallet
- `escrow_hold` - Funds held in escrow
- `escrow_release` - Funds released from escrow (received)
- `escrow_refund` - Refund from cancelled task
- `platform_fee` - Platform commission

#### cURL Example

```bash
curl -X GET "http://localhost:8000/api/v1/wallet/history?limit=50" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 5.3. Add Funds to Wallet

**Test endpoint** - Add funds to wallet (development only).

**Endpoint:** `POST /api/v1/wallet/add-funds`
**Authentication:** Required (Bearer token)
**Content-Type:** `application/json`

#### Request Body

```json
{
  "amount": 500000
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `amount` | integer | Yes | 1-100,000,000 | Amount to add (VND) |

#### Response: 200 OK

```json
{
  "success": true,
  "new_balance": 1500000,
  "message": "Added 500,000 VND to wallet"
}
```

#### cURL Example

```bash
curl -X POST http://localhost:8000/api/v1/wallet/add-funds \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500000
  }'
```

#### Error Responses

- `400 Bad Request` - Only available in mock mode

---

### 5.4. Get Wallet Statistics

Get detailed wallet statistics.

**Endpoint:** `GET /api/v1/wallet/stats`
**Authentication:** Required (Bearer token)

#### Response: 200 OK

```json
{
  "wallet_id": 1,
  "current_balance": 1000000,
  "frozen_balance": 20000,
  "available_balance": 980000,
  "total_deposits": 1000000,
  "total_payments": 20000,
  "total_received": 0,
  "total_refunds": 0,
  "transaction_breakdown": {
    "deposit": {
      "count": 1,
      "total": 1000000
    },
    "escrow_hold": {
      "count": 1,
      "total": 20000
    }
  }
}
```

#### cURL Example

```bash
curl -X GET http://localhost:8000/api/v1/wallet/stats \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 6. Messages

### 6.1. List Conversations

Get all conversations (grouped by task) for current user.

**Endpoint:** `GET /api/v1/messages/conversations`
**Authentication:** Required (Bearer token)

#### Response: 200 OK

```json
[
  {
    "task_id": 1,
    "task_title": "Giao đồ ăn từ quán cơm đến KTX A",
    "other_user_id": 2,
    "other_user_name": "Trần Thị B",
    "other_user_avatar": "https://example.com/avatar2.jpg",
    "last_message": "Tôi đã giao xong rồi nhé!",
    "last_message_time": "2024-01-01T14:30:00",
    "unread_count": 2
  }
]
```

#### cURL Example

```bash
curl -X GET http://localhost:8000/api/v1/messages/conversations \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 6.2. Get Conversation Messages

Get messages for a specific task conversation.

**Endpoint:** `GET /api/v1/messages/task/{task_id}`
**Authentication:** Required (Bearer token, must be requester or tasker)

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number |
| `limit` | integer | No | 50 | Messages per page (1-100) |

#### Response: 200 OK

```json
{
  "task_id": 1,
  "task_title": "Giao đồ ăn từ quán cơm đến KTX A",
  "other_user_id": 2,
  "other_user_name": "Trần Thị B",
  "other_user_avatar": "https://example.com/avatar2.jpg",
  "messages": [
    {
      "id": 1,
      "task_id": 1,
      "sender_id": 1,
      "receiver_id": 2,
      "content": "Bạn có thể giao trong 30 phút không?",
      "is_read": true,
      "read_at": "2024-01-01T14:05:00",
      "created_at": "2024-01-01T14:00:00",
      "sender": {
        "id": 1,
        "name": "Nguyễn Văn A",
        "avatar_url": "https://example.com/avatar.jpg",
        "rating": 4.5
      }
    },
    {
      "id": 2,
      "task_id": 1,
      "sender_id": 2,
      "receiver_id": 1,
      "content": "Được ạ, tôi sẽ đến ngay!",
      "is_read": true,
      "read_at": "2024-01-01T14:10:00",
      "created_at": "2024-01-01T14:06:00",
      "sender": {
        "id": 2,
        "name": "Trần Thị B",
        "avatar_url": "https://example.com/avatar2.jpg",
        "rating": 4.8
      }
    }
  ],
  "total": 2,
  "page": 1,
  "limit": 50
}
```

#### Side Effects

- Marks messages as read for current user

#### cURL Example

```bash
curl -X GET "http://localhost:8000/api/v1/messages/task/1?page=1&limit=50" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Error Responses

- `404 Not Found` - Task not found
- `403 Forbidden` - Not authorized (not requester or tasker)

---

### 6.3. Send Message

Send a message in a task conversation.

**Endpoint:** `POST /api/v1/messages/task/{task_id}`
**Authentication:** Required (Bearer token, must be requester or tasker)
**Content-Type:** `application/json`

#### Request Body

```json
{
  "content": "Tôi đã nhận được đồ ăn. Cảm ơn bạn!"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | Yes | Message content |

#### Response: 201 Created

```json
{
  "id": 3,
  "task_id": 1,
  "sender_id": 1,
  "receiver_id": 2,
  "content": "Tôi đã nhận được đồ ăn. Cảm ơn bạn!",
  "is_read": false,
  "read_at": null,
  "created_at": "2024-01-01T14:35:00",
  "sender": {
    "id": 1,
    "name": "Nguyễn Văn A",
    "avatar_url": "https://example.com/avatar.jpg",
    "rating": 4.5
  }
}
```

#### cURL Example

```bash
curl -X POST http://localhost:8000/api/v1/messages/task/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Cảm ơn bạn!"
  }'
```

#### Error Responses

- `404 Not Found` - Task not found
- `403 Forbidden` - Not authorized
- `400 Bad Request` - No tasker assigned yet

---

### 6.4. Mark Message Read

Mark a specific message as read.

**Endpoint:** `PUT /api/v1/messages/{message_id}/read`
**Authentication:** Required (Bearer token, must be receiver)

#### Response: 200 OK

```json
{
  "success": true,
  "message": "Message marked as read"
}
```

#### cURL Example

```bash
curl -X PUT http://localhost:8000/api/v1/messages/3/read \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Error Responses

- `404 Not Found` - Message not found
- `403 Forbidden` - Not authorized (not receiver)

---

## 7. Notifications

### 7.1. List Notifications

Get paginated list of notifications for current user.

**Endpoint:** `GET /api/v1/notifications`
**Authentication:** Required (Bearer token)

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number |
| `limit` | integer | No | 20 | Items per page (1-100) |
| `unread_only` | boolean | No | false | Show only unread notifications |

#### Response: 200 OK

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "task_application",
      "title": "Có người ứng tuyển công việc",
      "message": "Trần Thị B đã ứng tuyển công việc 'Giao đồ ăn từ quán cơm đến KTX A'",
      "task_id": 1,
      "is_read": false,
      "created_at": "2024-01-01T10:30:00"
    },
    {
      "id": 2,
      "type": "application_accepted",
      "title": "Ứng tuyển được chấp nhận",
      "message": "Nguyễn Văn A đã chấp nhận ứng tuyển của bạn",
      "task_id": 1,
      "is_read": true,
      "created_at": "2024-01-01T10:45:00"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "total_pages": 1
  }
}
```

#### Notification Types

- `user_login` - User logged in
- `task_created` - Task created
- `task_application` - New application received
- `application_accepted` - Application accepted
- `application_rejected` - Application rejected
- `task_cancelled` - Task cancelled
- `task_completed` - Task completed
- `payment_sent` - Payment sent
- `payment_received` - Payment received
- `new_message` - New message received
- `became_tasker` - User became Tasker
- `wallet_deposit` - Wallet deposit

#### cURL Example

```bash
# All notifications
curl -X GET "http://localhost:8000/api/v1/notifications?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Unread only
curl -X GET "http://localhost:8000/api/v1/notifications?unread_only=true" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 7.2. Get Unread Count

Get count of unread notifications.

**Endpoint:** `GET /api/v1/notifications/unread-count`
**Authentication:** Required (Bearer token)

#### Response: 200 OK

```json
{
  "count": 5
}
```

#### cURL Example

```bash
curl -X GET http://localhost:8000/api/v1/notifications/unread-count \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 7.3. Mark Notification Read

Mark a single notification as read.

**Endpoint:** `PUT /api/v1/notifications/{notification_id}/read`
**Authentication:** Required (Bearer token, must be notification owner)

#### Response: 200 OK

```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

#### cURL Example

```bash
curl -X PUT http://localhost:8000/api/v1/notifications/1/read \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Error Responses

- `404 Not Found` - Notification not found

---

### 7.4. Mark All Notifications Read

Mark all notifications as read for current user.

**Endpoint:** `PUT /api/v1/notifications/read-all`
**Authentication:** Required (Bearer token)

#### Response: 200 OK

```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

#### cURL Example

```bash
curl -X PUT http://localhost:8000/api/v1/notifications/read-all \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 7.5. Delete Notification

Delete a notification.

**Endpoint:** `DELETE /api/v1/notifications/{notification_id}`
**Authentication:** Required (Bearer token, must be notification owner)

#### Response: 200 OK

```json
{
  "success": true,
  "message": "Notification deleted"
}
```

#### cURL Example

```bash
curl -X DELETE http://localhost:8000/api/v1/notifications/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Error Responses

- `404 Not Found` - Notification not found

---

## 8. Categories

### 8.1. List Categories

Get all active categories.

**Endpoint:** `GET /api/v1/categories`
**Authentication:** None (public endpoint)

#### Response: 200 OK

```json
[
  {
    "id": 1,
    "name": "delivery",
    "name_vi": "Giao hàng",
    "description": "Giao đồ ăn, tài liệu, hàng hóa",
    "icon": "🚚",
    "is_active": true
  },
  {
    "id": 2,
    "name": "tutoring",
    "name_vi": "Dạy học",
    "description": "Dạy kèm, gia sư",
    "icon": "📚",
    "is_active": true
  },
  {
    "id": 3,
    "name": "shopping",
    "name_vi": "Mua hộ",
    "description": "Mua đồ ăn, hàng hóa",
    "icon": "🛒",
    "is_active": true
  }
]
```

#### cURL Example

```bash
curl -X GET http://localhost:8000/api/v1/categories
```

---

### 8.2. Get Category

Get a single category by ID.

**Endpoint:** `GET /api/v1/categories/{category_id}`
**Authentication:** None (public endpoint)

#### Response: 200 OK

```json
{
  "id": 1,
  "name": "delivery",
  "name_vi": "Giao hàng",
  "description": "Giao đồ ăn, tài liệu, hàng hóa",
  "icon": "🚚",
  "is_active": true
}
```

#### cURL Example

```bash
curl -X GET http://localhost:8000/api/v1/categories/1
```

#### Error Responses

- `404 Not Found` - Category not found

---

## 9. WebSocket

### 9.1. Task Chat WebSocket

Real-time bidirectional chat for task conversations.

**Endpoint:** `ws://localhost:8000/ws/chat/{task_id}?token={jwt_token}`
**Authentication:** Required (JWT token in query parameter)

#### Connection

```javascript
const token = "YOUR_JWT_TOKEN";
const taskId = 1;
const ws = new WebSocket(`ws://localhost:8000/ws/chat/${taskId}?token=${token}`);

ws.onopen = () => {
  console.log("Connected to task chat");
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Received:", data);
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};

ws.onclose = (event) => {
  console.log("Disconnected:", event.code, event.reason);
};
```

#### Send Message

```javascript
ws.send(JSON.stringify({
  type: "message",
  content: "Hello, how are you?"
}));
```

**Message format (client → server):**

```json
{
  "type": "message",
  "content": "Hello!"
}
```

#### Receive Message

**Message format (server → client):**

```json
{
  "type": "message",
  "id": 123,
  "sender_id": 2,
  "sender_name": "Trần Thị B",
  "sender_avatar": "https://example.com/avatar2.jpg",
  "content": "Hello!",
  "timestamp": "2024-01-01T14:30:00"
}
```

#### Typing Indicator

**Send typing notification:**

```javascript
ws.send(JSON.stringify({
  type: "typing"
}));
```

**Receive typing notification:**

```json
{
  "type": "typing",
  "user_id": 2,
  "user_name": "Trần Thị B"
}
```

#### Mark Messages Read

**Send read receipt:**

```javascript
ws.send(JSON.stringify({
  type: "read",
  message_ids: [123, 124, 125]
}));
```

**Receive read confirmation:**

```json
{
  "type": "messages_read",
  "reader_id": 1,
  "message_ids": [123, 124, 125]
}
```

#### User Join/Leave Events

**User joined:**

```json
{
  "type": "user_joined",
  "user_id": 2,
  "user_name": "Trần Thị B",
  "timestamp": "2024-01-01T14:00:00"
}
```

**User left:**

```json
{
  "type": "user_left",
  "user_id": 2,
  "user_name": "Trần Thị B",
  "timestamp": "2024-01-01T15:00:00"
}
```

#### Error Messages

```json
{
  "type": "error",
  "message": "No recipient available"
}
```

#### Close Codes

- `4001` - Unauthorized (invalid token)
- `4003` - Forbidden (not task participant)
- `4004` - Task not found

#### Python Example (websockets library)

```python
import asyncio
import websockets
import json

async def chat():
    token = "YOUR_JWT_TOKEN"
    task_id = 1
    uri = f"ws://localhost:8000/ws/chat/{task_id}?token={token}"

    async with websockets.connect(uri) as websocket:
        # Send message
        await websocket.send(json.dumps({
            "type": "message",
            "content": "Hello from Python!"
        }))

        # Receive messages
        while True:
            message = await websocket.recv()
            data = json.loads(message)
            print(f"Received: {data}")

asyncio.run(chat())
```

---

## 10. Error Responses

### Standard Error Format

All error responses follow this format:

```json
{
  "detail": "Error message description"
}
```

### HTTP Status Codes

| Code | Name | Description |
|------|------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data or business logic violation |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Authenticated but not authorized for this action |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (e.g., duplicate entry) |
| 422 | Unprocessable Entity | Validation error |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | External service unavailable |

### Common Error Examples

#### 401 Unauthorized

```json
{
  "detail": "Could not validate credentials"
}
```

#### 403 Forbidden

```json
{
  "detail": "Not authorized to update this task"
}
```

#### 404 Not Found

```json
{
  "detail": "Task not found"
}
```

#### 422 Validation Error

```json
{
  "detail": [
    {
      "loc": ["body", "title"],
      "msg": "ensure this value has at least 5 characters",
      "type": "value_error.any_str.min_length"
    },
    {
      "loc": ["body", "price"],
      "msg": "ensure this value is greater than 0",
      "type": "value_error.number.not_gt"
    }
  ]
}
```

---

## Appendices

### A. Authentication Flow

```
1. User opens Zalo Mini App
2. App requests Zalo access_token via SDK
3. POST /api/v1/auth/zalo with access_token
4. Backend verifies with Zalo API
5. Backend returns JWT tokens
6. Client stores tokens
7. Client includes "Authorization: Bearer {access_token}" in all requests
8. When access_token expires, use refresh_token via POST /api/v1/auth/refresh
```

### B. Task Lifecycle

```
open → accepted → in_progress → completed
  ↓
cancelled (at any stage)
```

**State Transitions:**

1. **open** - Requester creates task
2. **accepted** - Requester accepts a Tasker's application
3. **in_progress** - Requester creates escrow payment
4. **completed** - Requester marks task complete
5. **cancelled** - Requester cancels task (from open/accepted states)

### C. Payment Flow (Mock Mode)

```
1. Task accepted by Requester
2. POST /payments/create → Deducts from wallet, holds in escrow
3. Task status → in_progress
4. Tasker completes task
5. POST /tasks/{id}/complete → status: completed
6. POST /payments/release/{task_id} → Releases funds to Tasker (minus 10% fee)
7. Payment complete
```

### D. Rate Limiting

Currently not implemented. May be added in production.

### E. Data Types

**Currency:** All prices/amounts in VND (Vietnamese Dong), integer type, no decimals.

**Datetime:** ISO 8601 format with UTC timezone: `"2024-01-01T12:00:00"`

**Boolean:** JSON boolean: `true` or `false`

---

## Support

- **API Docs (Swagger):** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/health
- **Repository:** https://github.com/nhannht/viecz

---

**End of API Reference**
