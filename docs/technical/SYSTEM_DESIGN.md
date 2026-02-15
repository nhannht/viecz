# System Design - Viecz

**Last Updated:** 2026-02-14

---

## 1. Overview

Viecz is a peer-to-peer task marketplace for university students. A **requester** posts
a small job (delivery, tutoring, cleaning, etc.), a **tasker** applies, and the platform
handles escrow payments and real-time chat between the two parties.

The system is a monolithic client-server architecture:

- **Client** -- Native Android app (Kotlin / Jetpack Compose)
- **Server** -- Go REST API + WebSocket (Gin framework)
- **Database** -- PostgreSQL (production, port 5432) / PostgreSQL (test server, port 5433, Docker tmpfs)
- **Payments** -- PayOS integration for deposits; wallet-based escrow for task payments

---

## 2. High-Level Architecture

```mermaid
graph TD
    subgraph AndroidApp["Android App (Kotlin/Compose)"]
        Retrofit["Retrofit - HTTP"]
        OkHttp["OkHttp - WebSocket"]
    end

    subgraph Nginx["Nginx (reverse proxy)"]
        NginxProxy["HTTPS / WSS"]
    end

    subgraph GoServer["Go Server (Gin)"]
        Handlers
        Services
        Repos["Repository"]
        WebSocketHub["WebSocket Hub"]
        GORM["GORM (ORM)"]

        Handlers --> Services
        Services --> Repos
        Repos --> GORM
    end

    subgraph Database
        PostgreSQL["PostgreSQL (prod :5432)"]
        PostgreSQLTest["PostgreSQL (test :5433)"]
    end

    PayOS["PayOS (payment gateway)"]

    Retrofit -->|HTTPS| NginxProxy
    OkHttp -->|WSS| NginxProxy
    NginxProxy --> Handlers
    NginxProxy --> WebSocketHub
    GORM --> PostgreSQL
    GORM --> PostgreSQLTest
    GORM -.->|external| PayOS
```

---

## 3. Tech Stack

| Layer        | Technology                                              |
|--------------|---------------------------------------------------------|
| Android UI   | Kotlin, Jetpack Compose, Material Design 3              |
| Android DI   | Hilt (Dagger)                                           |
| Android Net  | Retrofit + Moshi, OkHttp (HTTP + WebSocket)             |
| Android DB   | Room (local cache for tasks, categories, notifications) |
| Server       | Go 1.21+, Gin web framework                             |
| ORM          | GORM (PostgreSQL driver for prod + test)                |
| Auth         | JWT (HS256) via golang-jwt/jwt v5                       |
| WebSocket    | Gorilla WebSocket                                       |
| Payments     | PayOS (Vietnamese payment gateway)                      |
| Database     | PostgreSQL 15+ (prod :5432), PostgreSQL (test :5433, Docker tmpfs) |
| Config       | godotenv (.env) + OS environment variables              |

---

## 4. Server Architecture

### 4.1 Package Structure

```
server/
├── cmd/
│   ├── server/main.go        # Production entrypoint (PostgreSQL + real PayOS)
│   └── testserver/main.go    # Dev/E2E entrypoint (PostgreSQL test DB + mock PayOS)
├── internal/
│   ├── auth/                  # JWT generation, validation, middleware
│   ├── config/                # Env-based configuration
│   ├── database/              # GORM setup, AutoMigrate, seed data
│   ├── handlers/              # HTTP handlers (Gin)
│   ├── middleware/             # CORS
│   ├── models/                # Domain models + GORM tags + validation
│   ├── repository/            # Data access interfaces + GORM implementations
│   ├── services/              # Business logic
│   └── websocket/             # Hub + Client (real-time chat)
```

### 4.2 Layered Architecture

```mermaid
graph TD
    A["HTTP Request"] --> B["Handler<br/>Parse request, validate input,<br/>call service, return JSON"]
    B --> C["Service<br/>Business logic, orchestration,<br/>transactions"]
    C --> D["Repository<br/>GORM queries, interface-based<br/>(testable)"]
    D --> E["GORM<br/>ORM -> PostgreSQL"]
```

Each repository is defined as a Go interface (e.g. `UserRepository`, `TaskRepository`)
with a GORM-backed implementation (`UserGormRepository`, `TaskGormRepository`). This
allows swapping the data layer for testing. Both production and test servers use
PostgreSQL, ensuring identical code paths.

### 4.3 API Routes

All routes are under `/api/v1`.

**Public routes:**

| Method | Path                          | Description                |
|--------|-------------------------------|----------------------------|
| GET    | /health                       | Health check               |
| POST   | /auth/register                | Register new user          |
| POST   | /auth/login                   | Login, returns JWT pair    |
| POST   | /auth/refresh                 | Refresh access token       |
| GET    | /categories                   | List task categories       |
| GET    | /users/:id                    | Get user profile           |
| POST   | /payment/webhook              | PayOS webhook callback     |
| POST   | /payment/confirm-webhook      | PayOS webhook confirmation |

**Protected routes (JWT required via `Authorization: Bearer <token>`):**

| Method | Path                          | Description                     |
|--------|-------------------------------|---------------------------------|
| GET    | /users/me                     | Get current user profile        |
| PUT    | /users/me                     | Update profile                  |
| POST   | /users/become-tasker          | Upgrade to tasker role          |
| POST   | /tasks                        | Create a task                   |
| GET    | /tasks                        | List tasks (with filters)       |
| GET    | /tasks/:id                    | Get task details                |
| PUT    | /tasks/:id                    | Update task                     |
| DELETE | /tasks/:id                    | Delete task                     |
| POST   | /tasks/:id/applications       | Apply for a task                |
| GET    | /tasks/:id/applications       | List applications for a task    |
| POST   | /tasks/:id/complete           | Mark task as completed          |
| POST   | /applications/:id/accept      | Accept an application           |
| GET    | /wallet                       | Get wallet balance              |
| POST   | /wallet/deposit               | Initiate deposit (via PayOS)    |
| GET    | /wallet/transactions          | Wallet transaction history      |
| POST   | /payments/escrow              | Create escrow for a task        |
| POST   | /payments/release             | Release escrow to tasker        |
| POST   | /payments/refund              | Refund escrow to requester      |
| GET    | /ws?token=<jwt>               | WebSocket connection            |
| GET    | /conversations                | List user's conversations       |
| POST   | /conversations                | Create conversation for a task  |
| GET    | /conversations/:id/messages   | Get message history             |
| GET    | /notifications                | List notifications              |
| GET    | /notifications/unread-count   | Get unread count                |
| PUT    | /notifications/:id/read       | Mark as read                    |
| PUT    | /notifications/read-all       | Mark all as read                |
| DELETE | /notifications/:id            | Delete notification             |

### 4.4 Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server

    Client->>Server: POST /auth/register
    Note right of Server: Hash password (bcrypt), create user<br/>Generate JWT access (short-lived)<br/>+ refresh token (long-lived)
    Server-->>Client: { access_token, refresh_token }

    Client->>Server: POST /auth/login
    Note right of Server: Verify credentials, return tokens
    Server-->>Client: { access_token, refresh_token }

    Client->>Server: GET /tasks<br/>Authorization: Bearer <at>
    Note right of Server: AuthRequired middleware:<br/>Extract "Bearer" token<br/>ValidateToken(token, secret)<br/>Set user_id in Gin context
    Server-->>Client: 200 [...tasks]

    Client->>Server: POST /auth/refresh<br/>{ refresh_token }
    Note right of Server: Validate refresh token<br/>Generate new access token
    Server-->>Client: { access_token }
```

JWT claims contain: `sub` (user ID), `email`, `name`, `is_tasker`, standard
registered claims (exp, iat, nbf). Signed with HS256.

---

## 5. Domain Models & Database

### 5.1 Entity Relationship Diagram

```mermaid
erDiagram
    User {
        uint id PK
        string email
        string name
        bool is_tasker
        float rating
    }

    Task {
        uint id PK
        uint requester_id FK
        uint tasker_id FK
        uint category_id FK
        string title
        int price
        string status
        string location
    }

    TaskApplication {
        uint id PK
        uint task_id FK
        uint tasker_id FK
        int proposed_price
        string message
        string status
    }

    Wallet {
        uint id PK
        uint user_id FK
        int balance
        int escrow_balance
    }

    WalletTransaction {
        uint id PK
        uint wallet_id FK
        string type "deposit, escrow_hold, escrow_release, payment_received"
        int amount
        int balance_before
        int balance_after
    }

    Category {
        uint id PK
        string name
        string name_vi
    }

    Transaction {
        uint id PK
        string type
        string status
        int amount
        string payos_order_code
    }

    Conversation {
        uint id PK
        uint task_id FK
        uint poster_id FK
        uint tasker_id FK
        string last_message
    }

    Message {
        uint id PK
        uint conversation_id FK
        uint sender_id FK
        string content
        bool is_read
    }

    User ||--o{ Task : "creates (requester)"
    User ||--o{ Wallet : "has"
    Task ||--o{ TaskApplication : "receives"
    User ||--o{ TaskApplication : "submits (tasker)"
    Wallet ||--o{ WalletTransaction : "records"
    Category ||--o{ Task : "categorizes"
    Task ||--o{ Transaction : "has"
    Conversation ||--o{ Message : "contains"
    Notification {
        int64 id PK
        int64 user_id FK
        string type "NotificationType"
        string title
        string message
        int64 related_id "nullable"
        string related_type "nullable"
        bool is_read "default false"
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    Task ||--o| Conversation : "has"
    User ||--o{ Conversation : "participates"
    User ||--o{ Notification : "receives"
```

### 5.2 Key Models

**User** -- Email/password auth. Can be a requester (posts tasks) or a tasker
(applies for tasks). Has rating, university, optional skills/bio.

**Task** -- Created by a requester. Has category, title, description, price (VND),
location, status (`open` -> `in_progress` -> `completed` | `cancelled`).

**TaskApplication** -- A tasker's application to a task. Can include a proposed
price and message. Status: `pending` -> `accepted` | `rejected`.

**Wallet** -- One per user. Tracks `balance` (available) and `escrow_balance` (held).
Max balance enforced (default 200,000 VND).

**WalletTransaction** -- Immutable ledger of all wallet operations. Records
balance_before/after and escrow_before/after for auditability.

**Transaction** -- Payment transaction linking payer, payee, task. Tracks PayOS
order codes for external payments.

**Conversation** -- One-to-one chat between a task poster and an accepted tasker,
linked to a specific task.

**Message** -- Individual chat message within a conversation. Supports read receipts.

**Category** -- Bilingual (English + Vietnamese) task categories seeded on startup.

### 5.3 Status Machines

**Task lifecycle:**

```mermaid
stateDiagram-v2
    [*] --> open
    open --> in_progress : application accepted + escrow created
    open --> cancelled : deleted
    in_progress --> completed : completed
    in_progress --> cancelled : refunded
    completed --> [*]
    cancelled --> [*]
```

**Application lifecycle:**

```mermaid
stateDiagram-v2
    [*] --> pending
    pending --> accepted : accepted by requester
    pending --> rejected : rejected
    accepted --> [*]
    rejected --> [*]
```

---

## 6. Payment & Escrow Flow

### 6.1 Wallet Deposit (via PayOS)

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant PayOS

    Client->>Server: POST /wallet/deposit { amount: 50000 }
    Server->>PayOS: CreatePaymentLink()
    PayOS-->>Server: { checkoutUrl }
    Server-->>Client: { checkoutUrl }

    Note over Client, PayOS: User pays via PayOS

    PayOS->>Server: POST /payment/webhook { orderCode, amount }
    Note over Server: Verify webhook<br/>Credit wallet<br/>Record WalletTransaction
    Server-->>Client: (wallet updated)
```

### 6.2 Task Escrow Flow

```mermaid
sequenceDiagram
    participant Requester
    participant Server
    participant Tasker

    rect rgb(240, 248, 255)
        Note over Requester, Tasker: Phase 1: Task Creation & Application
        Requester->>Server: POST /tasks (create task, status: open)
        Tasker->>Server: POST /tasks/:id/applications (apply, status: pending)
        Requester->>Server: POST /applications/:id/accept
    end

    rect rgb(240, 255, 240)
        Note over Requester, Tasker: Phase 2: Escrow Hold
        Requester->>Server: POST /payments/escrow { task_id }
        Note over Server: Debit requester wallet<br/>Hold in escrow<br/>Create Transaction (type: escrow)<br/>Task status -> in_progress
    end

    alt Task completed successfully
        Note over Requester, Tasker: Phase 3a: Release
        Requester->>Server: POST /payments/release { task_id }
        Note over Server: Release escrow from requester wallet<br/>Credit tasker wallet (net after fee)<br/>Create Transaction (type: release)<br/>Task status -> completed
        Server-->>Tasker: Wallet credited
    else Task cancelled
        Note over Requester, Tasker: Phase 3b: Refund
        Requester->>Server: POST /payments/refund { task_id, reason }
        Note over Server: Refund escrow to requester wallet<br/>Create Transaction (type: refund)<br/>Task status -> cancelled
        Server-->>Requester: Wallet refunded
    end
```

### 6.3 Mock vs Production Payment Mode

- **Production:** Real PayOS API calls for deposits. Escrow uses wallet balances.
- **Test server:** `mockPayOS` auto-fires a webhook 100ms after `CreatePaymentLink`,
  instantly crediting the wallet. `PAYMENT_MOCK_MODE=true` enables wallet-based
  escrow/release without real payment gateway calls.

---

## 7. WebSocket & Real-Time Chat

### 7.1 Architecture

```mermaid
graph LR
    A["Client A<br/>(OkHttp WS)"] <-->|WebSocket| Hub["Hub<br/>clients / convos / broadcast"]
    Hub <-->|WebSocket| B["Client B<br/>(OkHttp WS)"]
```

The **Hub** is a central goroutine that:
- Registers/unregisters WebSocket clients (keyed by user ID)
- Tracks which clients are in which conversation rooms
- Broadcasts messages to conversation participants (excluding sender)

Each **Client** has two goroutines:
- `readPump` -- reads incoming WebSocket messages, dispatches to `MessageService`
- `writePump` -- writes outgoing messages + periodic pings (54s interval, 60s timeout)

### 7.2 WebSocket Message Types

```json
// Client → Server
{ "type": "join",    "conversation_id": 1 }           // Join a conversation room
{ "type": "message", "conversation_id": 1, "content": "Hello" }  // Send chat message
{ "type": "typing",  "conversation_id": 1 }           // Typing indicator
{ "type": "read",    "conversation_id": 1 }           // Mark messages as read

// Server → Client
{ "type": "joined",         "conversation_id": 1 }    // Join confirmed
{ "type": "message_sent",   "conversation_id": 1, ... } // Send confirmed (to sender)
{ "type": "message",        "conversation_id": 1, ... } // New message (to recipient)
{ "type": "typing",         "conversation_id": 1, ... } // Typing indicator (to recipient)
{ "type": "read_confirmed", "conversation_id": 1 }    // Read receipt confirmed
{ "type": "error",          "error": "..." }           // Error
```

### 7.3 Message Flow

```mermaid
sequenceDiagram
    participant A as Client A
    participant S as Server
    participant B as Client B

    A->>S: WS: {type:"join", conv_id:1}
    Note over S: hub.JoinConversation()
    S-->>A: {type:"joined"}

    A->>S: WS: {type:"message", conv_id:1, content:"Hi"}
    Note over S: 1. Validate participant<br/>2. Save to DB (Message)<br/>3. Update Conversation last_message
    S-->>A: {type:"message_sent"}
    Note over S: 4. Broadcast to conv room
    S->>B: {type:"message"}
```

---

## 8. Android App Architecture

### 8.1 Package Structure

```
android/app/src/main/java/com/viecz/vieczandroid/
├── VieczApplication.kt          # @HiltAndroidApp
├── MainActivity.kt              # Single activity, hosts NavHost
├── data/
│   ├── api/                     # Retrofit API interfaces
│   │   ├── AuthApi.kt           #   POST /auth/register, /login, /refresh
│   │   ├── TaskApi.kt           #   CRUD /tasks, /applications
│   │   ├── CategoryApi.kt       #   GET /categories
│   │   ├── UserApi.kt           #   GET/PUT /users
│   │   ├── WalletApi.kt         #   GET/POST /wallet
│   │   ├── PaymentApi.kt        #   POST /payments/escrow, /release, /refund
│   │   ├── MessageApi.kt        #   GET/POST /conversations
│   │   ├── AuthInterceptor.kt   #   Injects Bearer token from TokenManager
│   │   └── ErrorResponse.kt     #   Error model
│   ├── auth/
│   │   └── AuthEventManager.kt  # Emits 401 events for global logout
│   ├── local/
│   │   ├── TokenManager.kt      # SharedPreferences for JWT tokens
│   │   ├── database/
│   │   │   ├── AppDatabase.kt   # Room database (tasks, categories, notifications)
│   │   │   └── Converters.kt    # Room type converters
│   │   ├── dao/                  # Room DAOs
│   │   └── entities/             # Room entities
│   ├── models/                   # API data classes (Task, User, Wallet, etc.)
│   ├── repository/               # Repository classes (API + optional Room cache)
│   └── websocket/
│       └── WebSocketClient.kt   # OkHttp WebSocket client, Moshi serialization
├── di/
│   ├── NetworkModule.kt         # Hilt: OkHttp, Retrofit, Moshi, API interfaces
│   └── DataModule.kt            # Hilt: TokenManager, Room DB, Repositories
├── ui/
│   ├── navigation/
│   │   └── Navigation.kt       # NavHost with all routes
│   ├── screens/                 # Composable screens
│   │   ├── SplashScreen.kt
│   │   ├── LoginScreen.kt
│   │   ├── RegisterScreen.kt
│   │   ├── MainScreen.kt       # Bottom nav container (Home, Chat, Profile tabs)
│   │   ├── HomeScreen.kt       # Task feed
│   │   ├── TaskDetailScreen.kt
│   │   ├── CreateTaskScreen.kt
│   │   ├── ApplyTaskScreen.kt
│   │   ├── WalletScreen.kt
│   │   ├── ChatScreen.kt
│   │   ├── ConversationListScreen.kt
│   │   ├── ProfileScreen.kt
│   │   ├── MyJobsScreen.kt
│   │   └── NotificationScreen.kt
│   ├── viewmodels/              # Hilt ViewModels with StateFlow
│   ├── components/              # Reusable composables (TaskCard, etc.)
│   └── theme/                   # Material 3 theme, colors, typography
└── utils/                       # Formatting, validation, HTTP error parsing
```

### 8.2 MVVM Data Flow

```mermaid
graph TD
    Screen["Composable<br/>Screen"] <--> ViewModel["ViewModel<br/>(StateFlow)"]
    ViewModel <--> Repository
    Repository <--> Retrofit["Retrofit<br/>API"]
    Repository --> Room["Room<br/>(optional local cache)"]
```

- **Screen** observes ViewModel `StateFlow` via `collectAsState()`
- **ViewModel** calls Repository methods, updates state
- **Repository** coordinates between Retrofit (remote) and Room (local cache)
- **Hilt** provides all dependencies via constructor injection

### 8.3 Navigation

Single-activity app with Jetpack Navigation Compose. Key routes:

```
splash → login ↔ register → main (bottom nav: home, conversations, profile)
                                    │
                                    ├── task_detail/{taskId}
                                    ├── create_task
                                    ├── apply_task/{taskId}/{price}
                                    ├── chat/{conversationId}
                                    ├── wallet
                                    ├── my_jobs/{mode}
                                    └── notifications
```

### 8.4 Product Flavors

| Flavor | API Base URL                        | App Name   | App ID Suffix |
|--------|-------------------------------------|------------|---------------|
| `dev`  | `http://10.0.2.2:9999/api/v1/`      | Viecz Dev  | `.dev`        |
| `prod` | Production server URL               | Viecz      | (none)        |

Both flavors can coexist on the same device.

---

## 9. Test Server

`server/cmd/testserver/main.go` provides a dev server that requires only a test PostgreSQL container:

- **PostgreSQL (port 5433, Docker tmpfs)** -- drops all tables on startup for fresh state; same DB engine as production
- **Mock PayOS** -- `CreatePaymentLink` auto-fires a webhook after 100ms to
  instantly credit the wallet
- **Port 9999** (hardcoded), JWT secret `e2e-test-secret-key`
- **Seed data** -- 11 categories + 2 test users (tasker-enabled)
- **Mock escrow** -- `PAYMENT_MOCK_MODE=true` for wallet-based escrow operations

**Prerequisite:** Start the test DB container: `docker compose -f docker-compose.testdb.yml up -d`

Used for: local Android development, E2E instrumented tests, manual API testing.

---

## 10. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Monolithic Go server** | MVP speed; single deployable binary |
| **GORM with interface repos** | Same PostgreSQL for prod and test; testable via interfaces |
| **Wallet-based escrow** | Simpler than real-time payment holds; no external escrow service |
| **WebSocket Hub pattern** | Standard Go concurrency pattern; scales to thousands of connections |
| **JWT access + refresh** | Stateless auth; short-lived access tokens for security |
| **Room local cache** | Offline-first for tasks/categories; reduces API calls |
| **Hilt DI** | Standard Android DI; integrates with ViewModel lifecycle |
| **Single-activity Compose** | Modern Android navigation; no fragment complexity |
| **PayOS for Vietnam** | Native VND support; QR code payments popular with students |
| **Max wallet balance** | Risk mitigation; configurable via `MAX_WALLET_BALANCE` env var |
