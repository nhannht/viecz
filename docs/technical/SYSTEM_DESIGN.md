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
- **Database** -- PostgreSQL (production) / SQLite in-memory (test server)
- **Payments** -- PayOS integration for deposits; wallet-based escrow for task payments

---

## 2. High-Level Architecture

```plantuml
@startuml
skinparam componentStyle rectangle
skinparam packageStyle rectangle
skinparam defaultFontSize 12

package "Android App (Kotlin/Compose)" #LightBlue {
    [Retrofit - HTTP] as Retrofit
    [OkHttp - WebSocket] as OkHttp
}

package "Nginx (reverse proxy)" #LightGray {
    [HTTPS / WSS] as NginxProxy
}

package "Go Server (Gin)" #LightGreen {
    [Handlers] as Handlers
    [Services] as Services
    [Repository] as Repos
    [WebSocket Hub] as WebSocketHub
    [GORM (ORM)] as GORM

    Handlers --> Services
    Services --> Repos
    Repos --> GORM
}

package "Database" #Wheat {
    database "PostgreSQL (prod)" as PostgreSQL
    database "SQLite (test)" as SQLite
}

cloud "PayOS\n(payment gateway)" as PayOS #Pink

Retrofit --> NginxProxy : HTTPS
OkHttp --> NginxProxy : WSS
NginxProxy --> Handlers
NginxProxy --> WebSocketHub
GORM --> PostgreSQL
GORM --> SQLite
GORM ..> PayOS : external
@enduml
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
| ORM          | GORM (PostgreSQL driver + SQLite for tests)             |
| Auth         | JWT (HS256) via golang-jwt/jwt v5                       |
| WebSocket    | Gorilla WebSocket                                       |
| Payments     | PayOS (Vietnamese payment gateway)                      |
| Database     | PostgreSQL 15+ (prod), SQLite in-memory (test)          |
| Config       | godotenv (.env) + OS environment variables              |

---

## 4. Server Architecture

### 4.1 Package Structure

```
server/
├── cmd/
│   ├── server/main.go        # Production entrypoint (PostgreSQL + real PayOS)
│   └── testserver/main.go    # Dev/E2E entrypoint (SQLite + mock PayOS)
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

```plantuml
@startuml
skinparam componentStyle rectangle
skinparam rectangleBorderColor #333
skinparam rectangleBackgroundColor #FAFAFA

rectangle "**HTTP Request**" as A #LightBlue
rectangle "**Handler**\nParse request, validate input,\ncall service, return JSON" as B #LightGreen
rectangle "**Service**\nBusiness logic, orchestration,\ntransactions" as C #LightYellow
rectangle "**Repository**\nGORM queries, interface-based\n(testable)" as D #Wheat
rectangle "**GORM**\nORM -> PostgreSQL / SQLite" as E #LightGray

A --> B
B --> C
C --> D
D --> E
@enduml
```

Each repository is defined as a Go interface (e.g. `UserRepository`, `TaskRepository`)
with a GORM-backed implementation (`UserGormRepository`, `TaskGormRepository`). This
allows swapping the data layer for testing.

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

### 4.4 Authentication Flow

```plantuml
@startuml
participant Client
participant Server

Client -> Server : POST /auth/register
note right of Server
  Hash password (bcrypt), create user
  Generate JWT access (short-lived)
  + refresh token (long-lived)
end note
Server --> Client : { access_token, refresh_token }

Client -> Server : POST /auth/login
note right of Server : Verify credentials, return tokens
Server --> Client : { access_token, refresh_token }

Client -> Server : GET /tasks\nAuthorization: Bearer <at>
note right of Server
  AuthRequired middleware:
  Extract "Bearer" token
  ValidateToken(token, secret)
  Set user_id in Gin context
end note
Server --> Client : 200 [...tasks]

Client -> Server : POST /auth/refresh\n{ refresh_token }
note right of Server
  Validate refresh token
  Generate new access token
end note
Server --> Client : { access_token }
@enduml
```

JWT claims contain: `sub` (user ID), `email`, `name`, `is_tasker`, standard
registered claims (exp, iat, nbf). Signed with HS256.

---

## 5. Domain Models & Database

### 5.1 Entity Relationship Diagram

```plantuml
@startuml
skinparam linetype ortho

entity "User" as User {
    * id : uint <<PK>>
    --
    * email : string
    * name : string
    * is_tasker : bool
    rating : float
}

entity "Task" as Task {
    * id : uint <<PK>>
    --
    * requester_id : uint <<FK>>
    tasker_id : uint <<FK>>
    * category_id : uint <<FK>>
    * title : string
    * price : int
    * status : string
    location : string
}

entity "TaskApplication" as TaskApplication {
    * id : uint <<PK>>
    --
    * task_id : uint <<FK>>
    * tasker_id : uint <<FK>>
    proposed_price : int
    message : string
    * status : string
}

entity "Wallet" as Wallet {
    * id : uint <<PK>>
    --
    * user_id : uint <<FK>>
    * balance : int
    * escrow_balance : int
}

entity "WalletTransaction" as WalletTransaction {
    * id : uint <<PK>>
    --
    * wallet_id : uint <<FK>>
    * type : string
    * amount : int
    * balance_before : int
    * balance_after : int
}

note right of WalletTransaction::type
  deposit, escrow_hold,
  escrow_release, payment_received
end note

entity "Category" as Category {
    * id : uint <<PK>>
    --
    * name : string
    * name_vi : string
}

entity "Transaction" as Transaction {
    * id : uint <<PK>>
    --
    * type : string
    * status : string
    * amount : int
    payos_order_code : string
}

entity "Conversation" as Conversation {
    * id : uint <<PK>>
    --
    * task_id : uint <<FK>>
    * poster_id : uint <<FK>>
    * tasker_id : uint <<FK>>
    last_message : string
}

entity "Message" as Message {
    * id : uint <<PK>>
    --
    * conversation_id : uint <<FK>>
    * sender_id : uint <<FK>>
    * content : string
    * is_read : bool
}

User ||--o{ Task : "creates (requester)"
User ||--o{ Wallet : "has"
Task ||--o{ TaskApplication : "receives"
User ||--o{ TaskApplication : "submits (tasker)"
Wallet ||--o{ WalletTransaction : "records"
Category ||--o{ Task : "categorizes"
Task ||--o{ Transaction : "has"
Conversation ||--o{ Message : "contains"
Task ||--o| Conversation : "has"
User ||--o{ Conversation : "participates"
@enduml
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

```plantuml
@startuml
skinparam stateBackgroundColor #FAFAFA
skinparam stateBorderColor #333

[*] --> open
open --> in_progress : application accepted\n+ escrow created
open --> removed : deleted
in_progress --> completed : completed
in_progress --> cancelled : refunded
completed --> [*]
cancelled --> [*]
removed --> [*]

state open #LightBlue
state in_progress #LightYellow
state completed #LightGreen
state cancelled #Pink
state removed #LightGray
@enduml
```

**Application lifecycle:**

```plantuml
@startuml
skinparam stateBackgroundColor #FAFAFA
skinparam stateBorderColor #333

[*] --> pending
pending --> accepted : accepted by requester
pending --> rejected : rejected
accepted --> [*]
rejected --> [*]

state pending #LightBlue
state accepted #LightGreen
state rejected #Pink
@enduml
```

---

## 6. Payment & Escrow Flow

### 6.1 Wallet Deposit (via PayOS)

```plantuml
@startuml
participant Client
participant Server
participant PayOS

Client -> Server : POST /wallet/deposit { amount: 50000 }
Server -> PayOS : CreatePaymentLink()
PayOS --> Server : { checkoutUrl }
Server --> Client : { checkoutUrl }

note over Client, PayOS : User pays via PayOS

PayOS -> Server : POST /payment/webhook { orderCode, amount }
note over Server
  Verify webhook
  Credit wallet
  Record WalletTransaction
end note
Server --> Client : (wallet updated)
@enduml
```

### 6.2 Task Escrow Flow

```plantuml
@startuml
participant Requester
participant Server
participant Tasker

== Phase 1: Task Creation & Application ==

Requester -> Server : POST /tasks (create task, status: open)
Tasker -> Server : POST /tasks/:id/applications (apply, status: pending)
Requester -> Server : POST /applications/:id/accept

== Phase 2: Escrow Hold ==

Requester -> Server : POST /payments/escrow { task_id }
note over Server
  Debit requester wallet
  Hold in escrow
  Create Transaction (type: escrow)
  Task status -> in_progress
end note

alt Task completed successfully
    note over Requester, Tasker : Phase 3a: Release
    Requester -> Server : POST /payments/release { task_id }
    note over Server
      Release escrow from requester wallet
      Credit tasker wallet (net after fee)
      Create Transaction (type: release)
      Task status -> completed
    end note
    Server --> Tasker : Wallet credited
else Task cancelled
    note over Requester, Tasker : Phase 3b: Refund
    Requester -> Server : POST /payments/refund { task_id, reason }
    note over Server
      Refund escrow to requester wallet
      Create Transaction (type: refund)
      Task status -> cancelled
    end note
    Server --> Requester : Wallet refunded
end
@enduml
```

### 6.3 Mock vs Production Payment Mode

- **Production:** Real PayOS API calls for deposits. Escrow uses wallet balances.
- **Test server:** `mockPayOS` auto-fires a webhook 100ms after `CreatePaymentLink`,
  instantly crediting the wallet. `PAYMENT_MOCK_MODE=true` enables wallet-based
  escrow/release without real payment gateway calls.

---

## 7. WebSocket & Real-Time Chat

### 7.1 Architecture

```plantuml
@startuml
skinparam componentStyle rectangle

node "Client A\n(OkHttp WS)" as A #LightBlue
rectangle "Hub\nclients / convos / broadcast" as Hub #LightGreen
node "Client B\n(OkHttp WS)" as B #LightBlue

A <--> Hub : WebSocket
Hub <--> B : WebSocket
@enduml
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

```plantuml
@startuml
participant "Client A" as A
participant "Server" as S
participant "Client B" as B

A -> S : WS: {type:"join", conv_id:1}
note over S : hub.JoinConversation()
S --> A : {type:"joined"}

A -> S : WS: {type:"message", conv_id:1, content:"Hi"}
note over S
  1. Validate participant
  2. Save to DB (Message)
  3. Update Conversation last_message
end note
S --> A : {type:"message_sent"}
note over S : 4. Broadcast to conv room
S -> B : {type:"message"}
@enduml
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

```plantuml
@startuml
skinparam componentStyle rectangle
skinparam rectangleBorderColor #333

rectangle "Composable\nScreen" as Screen #LightBlue
rectangle "ViewModel\n(StateFlow)" as ViewModel #LightGreen
rectangle "Repository" as Repository #LightYellow
rectangle "Retrofit\nAPI" as Retrofit #Wheat
database "Room\n(optional local cache)" as Room #LightGray

Screen --> ViewModel
ViewModel --> Screen
ViewModel --> Repository
Repository --> ViewModel
Repository --> Retrofit
Retrofit --> Repository
Repository --> Room
@enduml
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

`server/cmd/testserver/main.go` provides a zero-dependency dev server:

- **SQLite in-memory** -- fresh database on each start, no PostgreSQL needed
- **Mock PayOS** -- `CreatePaymentLink` auto-fires a webhook after 100ms to
  instantly credit the wallet
- **Port 9999** (hardcoded), JWT secret `e2e-test-secret-key`
- **Seed data** -- 11 categories + 1 test user (tasker-enabled)
- **Mock escrow** -- `PAYMENT_MOCK_MODE=true` for wallet-based escrow operations

Used for: local Android development, E2E instrumented tests, manual API testing.

---

## 10. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Monolithic Go server** | MVP speed; single deployable binary |
| **GORM with interface repos** | Easy PostgreSQL/SQLite swap; testable |
| **Wallet-based escrow** | Simpler than real-time payment holds; no external escrow service |
| **WebSocket Hub pattern** | Standard Go concurrency pattern; scales to thousands of connections |
| **JWT access + refresh** | Stateless auth; short-lived access tokens for security |
| **Room local cache** | Offline-first for tasks/categories; reduces API calls |
| **Hilt DI** | Standard Android DI; integrates with ViewModel lifecycle |
| **Single-activity Compose** | Modern Android navigation; no fragment complexity |
| **PayOS for Vietnam** | Native VND support; QR code payments popular with students |
| **Max wallet balance** | Risk mitigation; configurable via `MAX_WALLET_BALANCE` env var |
