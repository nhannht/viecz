# Security Documentation

**Project:** Viecz (Mini Services for Students)
**Last Updated:** 2026-02-14
**Status:** Development

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Authorization](#3-authorization)
4. [Password Hashing](#4-password-hashing)
5. [Input Validation](#5-input-validation)
6. [CORS Configuration](#6-cors-configuration)
7. [Payment Security](#7-payment-security)
8. [WebSocket Security](#8-websocket-security)
9. [Token Storage (Android)](#9-token-storage-android)
10. [Known Limitations](#10-known-limitations)

---

## 1. Overview

### 1.1 Security Architecture

```
                    +---------------------+
                    |  Android App        |
                    |  (Jetpack Compose)  |
                    +---------+-----------+
                              |
                              | HTTPS / Bearer JWT
                              |
+-----------------------------v-----------------------------------+
|                    Go Backend (Gin)                              |
|                                                                  |
|  +----------------------------------------------------------+   |
|  |  1. CORS Middleware                                       |   |
|  |     - Origin validation                                   |   |
|  |     - Preflight handling                                  |   |
|  +----------------------------------------------------------+   |
|                              |                                   |
|  +----------------------------------------------------------+   |
|  |  2. Auth Middleware (JWT HS256)                            |   |
|  |     - Bearer token extraction                             |   |
|  |     - Token validation + signing method check             |   |
|  |     - User context injection                              |   |
|  +----------------------------------------------------------+   |
|                              |                                   |
|  +----------------------------------------------------------+   |
|  |  3. Gin Binding Validation                                |   |
|  |     - Struct tag validation (required, email, min)        |   |
|  |     - JSON schema enforcement                             |   |
|  +----------------------------------------------------------+   |
|                              |                                   |
|  +----------------------------------------------------------+   |
|  |  4. Business Logic Layer                                  |   |
|  |     - Resource ownership checks                           |   |
|  |     - Escrow payment logic                                |   |
|  |     - Conversation participant verification               |   |
|  +----------------------------------------------------------+   |
|                              |                                   |
|  +----------------------------------------------------------+   |
|  |  5. Data Access Layer (GORM)                              |   |
|  |     - Parameterized queries                               |   |
|  |     - Model validation hooks (BeforeCreate/BeforeUpdate)  |   |
|  +----------------------------------------------------------+   |
+------------------------------------------------------------------+
                              |
                    +---------v-----------+
                    |  PostgreSQL (prod)  |
                    |  SQLite (test)      |
                    +---------------------+
```

### 1.2 Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend framework | Go + Gin |
| Authentication | Email/password + JWT (golang-jwt/jwt v5) |
| Password hashing | bcrypt (golang.org/x/crypto/bcrypt) |
| ORM | GORM (PostgreSQL prod, SQLite test) |
| Payment gateway | PayOS (payos-lib-golang v2) |
| WebSocket | Gorilla WebSocket |
| Android HTTP | OkHttp + Retrofit |
| Android token storage | EncryptedSharedPreferences (AES-256) |

---

## 2. Authentication

### 2.1 Auth Flow

The project uses custom email/password authentication. No third-party OAuth (no Zalo, no Google).

**Endpoints:**
- `POST /api/v1/auth/register` -- Create account
- `POST /api/v1/auth/login` -- Get access + refresh tokens
- `POST /api/v1/auth/refresh` -- Exchange refresh token for new access token

**Source:** `server/internal/handlers/auth.go`, `server/internal/auth/auth.go`

### 2.2 JWT Implementation

**Library:** `github.com/golang-jwt/jwt/v5`

#### Token Types

| Token Type | Lifetime | Claims | Use Case |
|------------|----------|--------|----------|
| Access Token | 30 minutes | `sub` (user ID), `email`, `name`, `is_tasker`, `exp`, `iat`, `nbf` | API authentication |
| Refresh Token | 7 days | `sub` (user ID), `email`, `exp`, `iat`, `nbf` | Token renewal |

Both tokens use **HS256** (HMAC-SHA256) signing.

#### Access Token Claims

```go
type Claims struct {
    UserID   int64  `json:"sub"`
    Email    string `json:"email"`
    Name     string `json:"name"`
    IsTasker bool   `json:"is_tasker"`
    jwt.RegisteredClaims // exp, iat, nbf
}
```

**Source:** `server/internal/auth/jwt.go`

#### Token Generation

```go
// Access token: 30 minutes
auth.GenerateAccessToken(user, jwtSecret, 30)

// Refresh token: 7 days
auth.GenerateRefreshToken(user, jwtSecret, 7)
```

Both `Register` and `Login` handlers return the same `TokenResponse`:

```json
{
  "access_token": "<jwt>",
  "refresh_token": "<jwt>",
  "user": { ... }
}
```

#### Token Validation

```go
func ValidateToken(tokenString string, secret string) (*Claims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
        // Verify signing method is HMAC (prevents algorithm confusion attacks)
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
        }
        return []byte(secret), nil
    })
    // ...
}
```

The validation checks:
1. Signing method is HMAC (rejects RSA/none algorithm attacks)
2. Signature validity
3. Token expiration (`exp` claim)
4. Not-before time (`nbf` claim)

**Source:** `server/internal/auth/jwt.go:64-84`

#### Token Refresh

`POST /api/v1/auth/refresh` accepts a `refresh_token`, validates it, and returns a new access token. The refresh token itself is not rotated.

**Note:** The refresh handler reconstructs a `User` from the refresh token claims rather than fetching from the database. This means stale user data (e.g., changed `is_tasker` flag) persists in new access tokens until the user performs a full login.

**Source:** `server/internal/handlers/auth.go:132-170`

### 2.3 JWT Secret Configuration

| Environment | Secret | Source |
|-------------|--------|--------|
| Development | `your-secret-key-change-in-production` | Default in `config.go` |
| Test server | `e2e-test-secret-key` | Hardcoded in `cmd/testserver/main.go` |
| Production | Must be set via `JWT_SECRET` env var | Enforced: config fails if default is used with `GO_ENV=production` |

**Source:** `server/internal/config/config.go:60, 79-81`

---

## 3. Authorization

### 3.1 Auth Middleware

**`AuthRequired`** -- Gin middleware that enforces JWT authentication.

```go
func AuthRequired(jwtSecret string) gin.HandlerFunc
```

Steps:
1. Extract `Authorization: Bearer <token>` header
2. Validate JWT token
3. Inject `user_id`, `email`, `name`, `is_tasker` into Gin context
4. Abort with 401 on failure

**`OptionalAuth`** -- Same extraction logic but does not abort if token is missing. Used for endpoints that behave differently for authenticated vs anonymous users.

**Source:** `server/internal/auth/middleware.go`

### 3.2 Protected Routes

The following route groups require `AuthRequired`:

| Route Group | Middleware |
|-------------|-----------|
| `GET/PUT /api/v1/users/me`, `POST /api/v1/users/become-tasker` | AuthRequired |
| `/api/v1/tasks/*` | AuthRequired |
| `/api/v1/applications/*` | AuthRequired |
| `/api/v1/wallet/*` | AuthRequired |
| `/api/v1/payments/*` | AuthRequired |
| `/api/v1/conversations/*` | AuthRequired |

Public routes (no auth): `/api/v1/auth/*`, `/api/v1/health`, `/api/v1/categories`, `GET /api/v1/users/:id`, `/api/v1/payment/webhook`.

**Source:** `server/cmd/server/main.go:132-224`

### 3.3 Resource Ownership

Authorization checks are enforced at the service/handler level:

- **Tasks:** Only the requester can update/delete their own tasks
- **Escrow payment:** Only the task requester can create escrow (`task.RequesterID != payerID`)
- **Release payment:** Only the requester can release (`task.RequesterID != requesterID`)
- **Refund payment:** Only the requester can refund
- **Conversations:** Only poster or tasker can send/read messages (`conversation.PosterID != client.UserID && conversation.TaskerID != client.UserID`)

---

## 4. Password Hashing

### 4.1 Registration

Passwords are hashed using **bcrypt** with `bcrypt.DefaultCost` (currently 10 rounds).

```go
hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
```

**Source:** `server/internal/auth/auth.go:53-57`

### 4.2 Login

Password comparison uses constant-time bcrypt verification:

```go
bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
```

Login returns a generic "invalid email or password" error for both non-existent emails and wrong passwords, preventing user enumeration.

**Source:** `server/internal/auth/auth.go:78-92`

### 4.3 Password Strength Validation

Enforced at registration time via `IsStrongPassword()`:

- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one digit (0-9)

**Source:** `server/internal/models/user.go:94-117`

### 4.4 User Model Security

- `PasswordHash` field has `json:"-"` tag, ensuring it is never serialized in API responses
- `BeforeCreate` and `BeforeUpdate` GORM hooks run validation before any database write
- Email format is validated via regex: `^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`
- Email has a `unique` database constraint

**Source:** `server/internal/models/user.go`

---

## 5. Input Validation

### 5.1 Gin Binding Validation

All request payloads are validated using Gin's struct binding tags:

| Endpoint | Field | Validation |
|----------|-------|------------|
| `POST /auth/register` | `email` | `required,email` |
| `POST /auth/register` | `password` | `required,min=8` |
| `POST /auth/register` | `name` | `required` |
| `POST /auth/login` | `email` | `required,email` |
| `POST /auth/login` | `password` | `required` |
| `POST /auth/refresh` | `refresh_token` | `required` |
| `POST /wallet/deposit` | `amount` | `required,min=2000` |
| `POST /payments/escrow` | `task_id` | `required` |
| `POST /payments/release` | `task_id` | `required` |
| `POST /payments/refund` | `task_id` | `required` |
| `POST /payments/refund` | `reason` | `required` |
| `POST /conversations` | `task_id` | `required` |
| `POST /conversations` | `tasker_id` | `required` |

**Source:** `server/internal/handlers/auth.go`, `server/internal/handlers/wallet.go`, `server/internal/handlers/payment.go`, `server/internal/handlers/websocket.go`

### 5.2 Model-Level Validation

The `User` model enforces constraints via `Validate()`:
- Email required, regex-validated
- Name required, max 100 characters
- Password hash required
- Rating between 0 and 5
- Non-negative counters (tasks completed, tasks posted, earnings)
- Tasker bio max 500 characters
- Tasker skills max 10 items

**Source:** `server/internal/models/user.go:37-85`

### 5.3 SQL Injection Prevention

GORM uses parameterized queries for all database operations. No raw SQL strings with user input.

---

## 6. CORS Configuration

### 6.1 Implementation

CORS is handled by a custom Gin middleware.

**Source:** `server/internal/middleware/cors.go`

#### Production Server

Accepts a single `allowedOrigin` from config (`CLIENT_URL`). Also permits `null` origin for WebView/file protocol contexts.

```go
// Headers set on every response:
Access-Control-Allow-Credentials: true
Access-Control-Allow-Headers: Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With
Access-Control-Allow-Methods: POST, OPTIONS, GET, PUT, DELETE
```

OPTIONS preflight requests return 204 immediately.

#### Test Server

Uses `"*"` as allowed origin for development convenience.

**Source:** `server/cmd/server/main.go:124`, `server/cmd/testserver/main.go:164`

---

## 7. Payment Security

### 7.1 PayOS Integration

The project uses [PayOS](https://payos.vn/) for payment processing.

**SDK:** `github.com/payOSHQ/payos-lib-golang/v2`

**Configuration (env vars):**
- `PAYOS_CLIENT_ID`
- `PAYOS_API_KEY`
- `PAYOS_CHECKSUM_KEY`

**Source:** `server/internal/services/payos.go`, `server/internal/config/config.go`

### 7.2 Webhook Signature Verification

PayOS webhooks are verified using the SDK's `Webhooks.VerifyData()` method, which validates the HMAC signature using the checksum key.

```go
func (h *WebhookHandler) HandleWebhook(c *gin.Context) {
    var webhookData map[string]interface{}
    c.ShouldBindJSON(&webhookData)

    // Verify webhook signature
    verifiedData, err := h.payos.VerifyWebhookData(c.Request.Context(), webhookData)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"code": "01", "desc": "Invalid webhook signature"})
        return
    }
    // Process verified data...
}
```

On signature failure, the webhook returns 401. On success, it returns 200 with `{"code": "00", "desc": "success"}`.

**Source:** `server/internal/handlers/webhook.go:41-93`

### 7.3 Idempotency Guard

The webhook handler checks if a transaction has already been marked successful before processing, preventing double-crediting on webhook retries:

```go
if transaction.Status == models.TransactionStatusSuccess {
    log.Printf("Transaction %d already successful, skipping", transaction.ID)
    return nil
}
```

**Source:** `server/internal/handlers/webhook.go:132-136`

### 7.4 Escrow Payment Model

```
1. Requester creates escrow  -->  Funds held in escrow (wallet or PayOS)
2. Task completed             -->  Release: net amount to tasker wallet
3. Platform fee               -->  Separate fee transaction recorded
4. Task cancelled             -->  Full refund to requester wallet
```

Authorization enforcement:
- `CreateEscrowPayment`: `task.RequesterID != payerID` check
- `ReleasePayment`: `task.RequesterID != requesterID` check + task must be in-progress + tasker must be assigned
- `RefundPayment`: `task.RequesterID != requesterID` check + task must be in-progress

**Source:** `server/internal/services/payment.go`

### 7.5 Wallet Balance Limits

- **Minimum deposit:** 2,000 VND (enforced by Gin binding `min=2000`)
- **Maximum wallet balance:** 200,000 VND by default (configurable via `MAX_WALLET_BALANCE` env var)
- Deposit is rejected if `wallet.Balance + amount > maxWalletBalance`

**Source:** `server/internal/services/wallet.go:64-65`, `server/internal/handlers/wallet.go:75`

### 7.6 Mock vs Real Payment Mode

Controlled by `PAYMENT_MOCK_MODE` env var:

| Mode | Behavior | Use Case |
|------|----------|----------|
| Mock (`true`) | Escrow/release uses wallet service directly, no PayOS | Development, E2E tests |
| Real (`false`) | Creates PayOS payment links, processes real webhooks | Production |

The test server (`cmd/testserver/main.go`) uses a `mockPayOS` that auto-fires webhooks after 100ms to simulate instant payment completion.

---

## 8. WebSocket Security

### 8.1 Connection Authentication

WebSocket connections authenticate via JWT token passed as a query parameter or `Authorization` header:

```
GET /api/v1/ws?token=<jwt_access_token>
```

The handler validates the JWT before upgrading the HTTP connection:

```go
claims, err := auth.ValidateToken(tokenString, h.jwtSecret)
if err != nil {
    c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
    return
}
```

**Source:** `server/internal/handlers/websocket.go:42-82`

### 8.2 Origin Checking

The WebSocket upgrader currently accepts all origins:

```go
CheckOrigin: func(r *http.Request) bool {
    // TODO: In production, check origin properly
    return true
},
```

This is a known limitation that should be hardened before production.

**Source:** `server/internal/handlers/websocket.go:18-21`

### 8.3 Conversation Access Control

Every WebSocket message action verifies the sender is a participant in the conversation:

```go
if conversation.PosterID != client.UserID && conversation.TaskerID != client.UserID {
    return errors.New("user not authorized to send messages in this conversation")
}
```

This check applies to: sending messages, typing indicators, joining conversations, and reading message history.

**Source:** `server/internal/services/message.go:63-65, 117-119, 166-168, 196-198`

### 8.4 WebSocket Limits

| Parameter | Value |
|-----------|-------|
| Max message size | 512 KB |
| Write timeout | 10 seconds |
| Pong wait | 60 seconds |
| Ping period | 54 seconds |
| Send buffer | 256 messages |

**Source:** `server/internal/websocket/client.go:12-24`

---

## 9. Token Storage (Android)

### 9.1 EncryptedSharedPreferences

Tokens are stored using Android's `EncryptedSharedPreferences` with AES-256 encryption:

```kotlin
private val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)

private val prefs: SharedPreferences = EncryptedSharedPreferences.create(
    "encrypted_auth_prefs",
    masterKeyAlias,
    context,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,    // key encryption
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM   // value encryption
)
```

**Stored values:** `access_token`, `refresh_token`, `user_id`, `user_email`, `user_name`

**Source:** `android/app/src/main/java/com/viecz/vieczandroid/data/local/TokenManager.kt`

### 9.2 AuthInterceptor

An OkHttp interceptor automatically attaches the access token to all API requests:

```kotlin
val request = originalRequest.newBuilder()
    .addHeader("Authorization", "Bearer $token")
    .build()
```

On receiving a 401 response (except for `/auth/login` and `/auth/register` endpoints), the interceptor:
1. Clears all stored tokens
2. Emits an unauthorized event to trigger re-login in the UI

**Source:** `android/app/src/main/java/com/viecz/vieczandroid/data/api/AuthInterceptor.kt`

---

## 10. Known Limitations

### 10.1 WebSocket Origin Check Disabled

The WebSocket upgrader accepts all origins. Should be restricted to known origins in production.

### 10.2 No Rate Limiting

No rate limiting is implemented on any endpoint. Auth endpoints (login, register) are vulnerable to brute-force attacks.

### 10.3 Refresh Token Not Rotated

The `/auth/refresh` endpoint issues a new access token but does not rotate the refresh token. A stolen refresh token remains valid for its full 7-day lifetime.

### 10.4 Refresh Token Uses Stale Claims

The refresh handler reconstructs a user from token claims instead of fetching fresh data from the database. Role changes (e.g., becoming a tasker) are not reflected in new access tokens until the user logs in again.

### 10.5 JWT Secret Shared Between Access and Refresh Tokens

Both token types use the same secret and same signing algorithm. There is no `type` claim to distinguish them. A refresh token could theoretically be used as an access token if the claims overlap sufficiently.

### 10.6 Webhook Endpoint Is Public

`POST /api/v1/payment/webhook` has no auth middleware (by design -- PayOS must reach it). Security relies entirely on the PayOS SDK signature verification.

### 10.7 Token in WebSocket Query String

JWT tokens passed via `?token=` are visible in server access logs and proxy logs. Mitigated by short (30-minute) token lifetime.

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2026-02-14 | Full rewrite to reflect Go backend + Android app (no Zalo, no FastAPI, no Python) |
| 1.0 | 2026-02-04 | Initial security documentation (outdated) |
