---
name: server-api
description: "Viecz Go API — REST endpoints, authentication, rate limiting, middleware for the task marketplace platform"
metadata:
  languages: "go"
  versions: "1.0.0"
  source: maintainer
  tags: "viecz,go,gin,api,rest,authentication,websocket"
  updated-on: "2026-03-29"
---

# Viecz Server API

Go backend using Gin framework, GORM (PostgreSQL), JWT auth, WebSocket, PayOS payments, Meilisearch.

## Base URL

All endpoints are prefixed with `/api/v1`.

## Authentication

Three auth methods. All return `{ access_token, refresh_token, user }`.

### Email OTP (default)

```
POST /api/v1/auth/otp/request
Body: { "email": "user@example.com", "turnstile_token": "..." }
Response: { "message": "OTP sent" }
# Dev mode (SMTP_HOST empty): response includes { "otp": "123456" }

POST /api/v1/auth/otp/verify
Body: { "email": "user@example.com", "code": "123456", "name": "Display Name" }
Response: { "access_token": "...", "refresh_token": "...", "user": {...} }
```

### Google OAuth

```
POST /api/v1/auth/google
Body: { "id_token": "google-id-token" }
Response: { "access_token": "...", "refresh_token": "...", "user": {...} }
```

### Firebase Phone

```
POST /api/v1/auth/phone
Body: { "id_token": "firebase-id-token" }
Response: { "access_token": "...", "refresh_token": "...", "user": {...} }
```

### Token Refresh

```
POST /api/v1/auth/refresh
Body: { "refresh_token": "..." }
Response: { "access_token": "..." }
```

### Verification

```
POST /api/v1/auth/verify-email     # Body: { "token": "..." } — public
POST /api/v1/auth/resend-verification  # Auth required
POST /api/v1/auth/verify-phone     # Body: { "id_token": "..." } — auth required
```

## Auth Middleware

```go
// Apply to routes:
auth.AuthRequired()          // JWT required
auth.OptionalAuth()          // JWT optional (adds user context if present)
auth.EmailVerifiedRequired() // JWT + email_verified = true
auth.PhoneVerifiedRequired() // JWT + phone_verified = true
```

JWT is passed via `Authorization: Bearer <token>` header.

## Task Endpoints

```
GET    /api/v1/tasks              # List tasks (public, optional auth)
  Query: category_id, status, search, price_min, price_max,
         lat, lng, radius, sort, page, limit

GET    /api/v1/tasks/:id          # Get task detail (public)
POST   /api/v1/tasks              # Create task (auth required)
PUT    /api/v1/tasks/:id          # Update task (auth required, owner only)
DELETE /api/v1/tasks/:id          # Delete task (auth required, owner only)

POST   /api/v1/tasks/:id/applications   # Apply for task (auth required)
  Body: { "proposed_price": 50000, "message": "I can do this" }

GET    /api/v1/tasks/:id/applications   # List applications (auth, owner only)
POST   /api/v1/tasks/:id/complete       # Complete task (auth, owner only)
```

### Task Create/Update Body

```json
{
  "title": "Fix my laptop",
  "description": "Screen is cracked...",
  "category_id": 1,
  "price": 200000,
  "location": "District 1, Ho Chi Minh City",
  "latitude": 10.7769,
  "longitude": 106.7009,
  "deadline": "2026-04-15T00:00:00Z",
  "image_urls": ["https://..."]
}
```

## Application Endpoints

```
POST /api/v1/applications/:id/accept   # Accept application (auth, task owner)
```

## Wallet Endpoints

```
GET    /api/v1/wallet                        # Get balance (auth)
POST   /api/v1/wallet/deposit                # Create PayOS deposit (auth + phone verified)
  Body: { "amount": 100000, "description": "Top up" }
  Response: { "checkout_url", "order_code", "qr_code", "account_number", ... }

GET    /api/v1/wallet/deposit/status/:code   # Check deposit status (auth)
GET    /api/v1/wallet/transactions           # Transaction history (auth)
  Query: limit, offset

POST   /api/v1/wallet/withdraw               # Withdraw (auth + phone verified)
  Body: { "amount": 50000, "bank_account_id": 1 }

GET    /api/v1/wallet/bank-accounts          # List bank accounts (auth)
POST   /api/v1/wallet/bank-accounts          # Add bank account (auth)
DELETE /api/v1/wallet/bank-accounts/:id      # Delete bank account (auth)
```

## Payment Endpoints

```
POST /api/v1/payments/escrow    # Hold funds in escrow (auth + phone verified)
  Body: { "task_id": 123 }

POST /api/v1/payments/release   # Release to tasker (auth, task owner)
  Body: { "task_id": 123 }

POST /api/v1/payments/refund    # Refund to requester (auth, task owner)
  Body: { "task_id": 123, "reason": "..." }
```

### PayOS Webhooks (public)

```
POST /api/v1/payment/webhook    # PayOS callback (signature-verified)
GET  /api/v1/payment/return     # Return URL after payment
```

## User Endpoints

```
GET  /api/v1/users/:id    # Public profile (public)
GET  /api/v1/users/me     # Own profile (auth)
PUT  /api/v1/users/me     # Update profile (auth)
  Body: { "name", "bio", "university", "student_id" }
POST /api/v1/users/me/avatar  # Upload avatar (auth, multipart/form-data)
```

## Notification Endpoints

```
GET    /api/v1/notifications              # List (auth)
GET    /api/v1/notifications/unread-count # Unread count (auth)
POST   /api/v1/notifications/:id/read    # Mark read (auth)
POST   /api/v1/notifications/read-all    # Mark all read (auth)
DELETE /api/v1/notifications/:id         # Delete (auth)
```

## Chat Endpoints

```
GET  /api/v1/conversations              # List conversations (auth)
POST /api/v1/conversations              # Create conversation (auth)
  Body: { "task_id": 123, "tasker_id": 456 }
GET  /api/v1/conversations/:id          # Get conversation (auth)
GET  /api/v1/conversations/:id/messages # Get messages (auth)
  Query: limit, offset
```

### WebSocket

```
GET /api/v1/ws?token=JWT_TOKEN

# Message types (JSON):
{ "type": "message", "conversation_id": 1, "content": "Hello" }
{ "type": "typing", "conversation_id": 1 }
{ "type": "read", "conversation_id": 1 }
{ "type": "join", "conversation_id": 1 }
```

## Other Endpoints

```
GET /api/v1/categories        # List task categories (public)
GET /api/v1/banks             # VietQR bank list (public)
GET /api/v1/health            # Health check with DB ping
GET /api/v1/maps/static       # Static map image (requires GOOGLE_MAPS_SERVER_KEY)
GET /api/v1/geocode/search    # Geocode address (Nominatim)
GET /api/v1/geocode/reverse   # Reverse geocode (Nominatim)
```

## Rate Limiting

Configurable per endpoint group via env vars:

| Group | Default | Scope | Endpoints |
|-------|---------|-------|-----------|
| Auth | 10/min | IP | login, OTP |
| Read | 60/min | User/IP | tasks, profiles |
| Write | 30/min | User | create/update |
| Finance | 10/min | User | escrow, withdraw |
| High-freq | 60/min | User | chat, notifications |

Disable with `RATE_LIMIT_ENABLED=false`.

## Server Architecture

```
server/
├── cmd/server/main.go          # Entry point, DI, route registration
├── internal/
│   ├── config/config.go        # Env-based config
│   ├── models/                 # 13 GORM models
│   ├── repository/             # Data access layer (interfaces + GORM impls)
│   ├── services/               # Business logic (14 services)
│   ├── handlers/               # HTTP handlers (request/response)
│   ├── auth/                   # JWT, middleware, OAuth, rate limiter
│   ├── middleware/              # CORS, logging, Sentry, Prometheus
│   ├── websocket/              # Hub + Client for real-time messaging
│   └── database/               # GORM setup, migrations, seeds
```

## Dev Mode

When `SMTP_HOST` is empty:
- OTP codes returned in API response
- Firebase phone verification mocked (`NoOpFirebaseVerifier`)
- Turnstile bot check skipped (when `TURNSTILE_SECRET_KEY` empty)
