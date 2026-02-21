# Technical Architecture - Viecz

**Version:** 2.4
**Last Updated:** 2026-02-20

---

## Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Go Backend Architecture](#4-go-backend-architecture)
5. [Android App Architecture](#5-android-app-architecture)
6. [Web Client Architecture](#6-web-client-architecture)
7. [Database Layer](#7-database-layer)
8. [WebSocket Architecture](#8-websocket-architecture)
9. [Payment & Wallet System](#9-payment--wallet-system)
10. [Authentication](#10-authentication)
11. [API Routes](#11-api-routes)
12. [Deployment](#12-deployment)

---

## 1. Overview

Viecz is a P2P marketplace connecting university students for small services. The system consists of:

- **Go backend** (Gin + GORM) serving REST and WebSocket APIs
- **Native Android app** (Kotlin + Jetpack Compose) with MVVM architecture
- **Angular web client** (Angular 21 + Material Design 3) with SSR support
- **PostgreSQL** (production, port 5432) / **PostgreSQL** (test server, port 5433, Docker tmpfs) for persistence
- **PayOS** for payment processing (deposit via payment links, escrow via wallet)
- **Meilisearch** (optional) for full-text task search with relevance ranking; falls back to PostgreSQL LIKE when not configured

---

## 2. System Architecture

```mermaid
graph TD
    subgraph ANDROID_CLIENT["ANDROID CLIENT"]
        ComposeUI["Compose UI"]
        ViewModels["ViewModels<br/>(State)"]
        Repositories["Repositories<br/>(Data)"]
        Retrofit["Retrofit<br/>+ OkHttp"]
        WebSocketClient["WebSocket Client"]

        ComposeUI --> ViewModels
        ViewModels --> Repositories
        Repositories --> Retrofit
        WebSocketClient --> Retrofit
    end

    subgraph WEB_CLIENT["WEB CLIENT (Angular 21)"]
        AngularComponents["Components<br/>(Material 3)"]
        AngularServices["Services<br/>(RxJS + Signals)"]
        HttpClient["HttpClient<br/>+ Interceptors"]
        WsService["WebSocket<br/>Service"]

        AngularComponents --> AngularServices
        AngularServices --> HttpClient
        AngularServices --> WsService
    end

    CLOUDFLARE["Cloudflare Tunnel<br/>(SSL + Routing)"]

    Retrofit -- "HTTPS / WSS" --> CLOUDFLARE
    WebSocketClient -- "WSS" --> CLOUDFLARE
    HttpClient -- "HTTPS" --> CLOUDFLARE
    WsService -- "WSS" --> CLOUDFLARE

    subgraph GO_BACKEND["GO BACKEND (Gin)"]
        AuthMW["Auth Middleware<br/>(JWT)"]
        Handlers["Handlers<br/>(HTTP/WS)"]
        Services["Services<br/>(Business)"]
        Repository["Repository<br/>(GORM impl)"]
        WebSocketHub["WebSocket Hub<br/>(goroutine)"]

        AuthMW --> Handlers
        Handlers --> Services
        Services --> Repository
    end

    CLOUDFLARE --> Handlers

    DB[("PostgreSQL (Production :5432)<br/>PostgreSQL (Test :5433)")]
    PayOS(("PayOS<br/>(Payments)"))
    Meilisearch[("Meilisearch<br/>(Search, optional)")]

    Repository --> DB
    Repository --> PayOS
    Services --> Meilisearch
```

### Request Flow

```mermaid
graph TD
    A["Client<br/>(Android / Web)"]
    B["Cloudflare Tunnel<br/>(SSL termination)"]
    C["Gin Router"]
    D["CORS Middleware"]
    E["Auth Middleware<br/>(JWT validation -> sets<br/>user_id in context)"]
    F["Handler<br/>(parse request, call service)"]
    G["Service<br/>(business logic, validation)"]
    H["Repository<br/>(GORM queries -> database)"]
    I["Response<br/>(JSON -> Android)"]

    A -- "POST /api/v1/tasks<br/>Authorization: Bearer JWT" --> B
    Note["Both Android (Retrofit) and<br/>Web (Angular HttpClient)<br/>follow this same flow"]
    B -- "proxy_pass localhost:8080" --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
```

---

## 3. Technology Stack

### Backend

| Component        | Technology              | Version |
|------------------|-------------------------|---------|
| Language         | Go                      | 1.25.5  |
| HTTP Framework   | Gin                     | 1.11    |
| ORM              | GORM                    | 1.31    |
| Database (prod)  | PostgreSQL (via pgx)    | -       |
| Database (test)  | PostgreSQL (Docker tmpfs, port 5433) | -  |
| Auth             | golang-jwt/jwt          | v5.3    |
| WebSocket        | Gorilla WebSocket       | 1.5     |
| Payments         | PayOS SDK               | v2.0    |
| Config           | godotenv                | 1.5     |
| Logging          | zerolog                 | 1.34    |
| Crypto           | golang.org/x/crypto     | -       |
| Search (optional)| Meilisearch (meilisearch-go) | v1.16 |

### Android

| Component        | Technology              | Version   |
|------------------|-------------------------|-----------|
| Language         | Kotlin                  | 2.0       |
| UI Framework     | Jetpack Compose (M3)    | BOM 2024.12 |
| Navigation       | Navigation Compose      | 2.8       |
| DI               | Hilt                    | 2.52      |
| HTTP Client      | Retrofit + OkHttp       | 2.11 / 4.12 |
| JSON             | Moshi                   | 1.15      |
| Local DB         | Room                    | 2.6       |
| State            | ViewModel + StateFlow   | 2.8       |
| WebSocket        | OkHttp WebSocket        | 4.12      |
| Token Storage    | EncryptedSharedPrefs    | 1.0       |

### Web Client

| Component        | Technology              | Version   |
|------------------|-------------------------|-----------|
| Language         | TypeScript              | 5.9       |
| Framework        | Angular                 | 21.1      |
| UI Framework     | Angular Material (M3)   | 21.1      |
| Design System    | nhannht-metro-meow (13 components) | -  |
| CSS Framework    | Tailwind CSS 4          | 4.2       |
| State            | Angular Signals + RxJS  | 7.8       |
| HTTP Client      | Angular HttpClient      | 21.1      |
| WebSocket        | Native WebSocket (via WebSocketService) | -  |
| SSR              | Angular SSR (@angular/ssr) | 21.1   |
| Testing          | Vitest + jsdom          | 4.0       |
| Component Docs   | Storybook 9 + Compodoc  | 9.1       |
| Token Storage    | localStorage            | -         |

---

## 4. Go Backend Architecture

### Package Structure

```
server/
├── cmd/
│   ├── server/main.go           # Production entrypoint (PostgreSQL)
│   └── testserver/main.go       # Test server entrypoint (PostgreSQL test DB, mock PayOS)
│
├── internal/
│   ├── auth/
│   │   ├── auth.go              # AuthService (register, login, bcrypt)
│   │   ├── jwt.go               # JWT token generation & validation
│   │   └── middleware.go         # AuthRequired, OptionalAuth gin middlewares
│   │
│   ├── config/
│   │   └── config.go            # Env-based config (DB, JWT, PayOS, fees)
│   │
│   ├── database/
│   │   ├── database.go          # Option pattern for DB config
│   │   ├── gorm.go              # NewGORM (PostgreSQL), AutoMigrate
│   │   ├── migrate.go           # golang-migrate (file-based migrations)
│   │   └── seed.go              # Seed categories + test users
│   │
│   ├── handlers/                # HTTP handlers (parse request → call service → respond)
│   │   ├── auth.go              # Register, Login, RefreshToken
│   │   ├── users.go             # GetProfile, GetMyProfile, UpdateProfile, BecomeTasker
│   │   ├── tasks.go             # CRUD + Apply, Accept, Complete
│   │   ├── categories.go        # GetCategories
│   │   ├── notification.go      # CRUD notifications, mark read, unread count
│   │   ├── payment.go           # CreateEscrowPayment, ReleasePayment, RefundPayment
│   │   ├── wallet.go            # GetWallet, Deposit, GetTransactionHistory
│   │   ├── webhook.go           # PayOS webhook handler
│   │   ├── return.go            # PayOS return URL handler
│   │   ├── websocket.go         # WebSocket upgrade + MessageHandler (REST conversation endpoints)
│   │   └── *_test.go            # Handler tests
│   │
│   ├── services/                # Business logic
│   │   ├── user.go              # UserService
│   │   ├── task.go              # TaskService (create, list, apply, accept, complete)
│   │   ├── notification.go      # NotificationService (create + WebSocket delivery)
│   │   ├── wallet.go            # WalletService (deposit, escrow, release, refund)
│   │   ├── payment.go           # PaymentService (orchestrates transactions + wallet)
│   │   ├── payos.go             # PayOSService (PayOSServicer interface + SDK wrapper)
│   │   ├── search.go            # SearchServicer interface + MeilisearchService + NoOpSearchService
│   │   ├── message.go           # MessageService (conversations + messages + WS broadcast)
│   │   └── *_test.go            # Service tests
│   │
│   ├── repository/              # Data access (interface + GORM implementation)
│   │   ├── user.go              # UserRepository interface
│   │   ├── user_gorm.go         # UserGormRepository (GORM implementation)
│   │   ├── task.go              # TaskRepository interface
│   │   ├── task_gorm.go         # TaskGormRepository
│   │   ├── task_application.go  # TaskApplicationRepository interface
│   │   ├── task_application_gorm.go
│   │   ├── category.go          # CategoryRepository interface
│   │   ├── category_gorm.go
│   │   ├── transaction.go       # TransactionRepository interface
│   │   ├── transaction_gorm.go
│   │   ├── wallet.go            # WalletRepository interface
│   │   ├── wallet_gorm.go
│   │   ├── wallet_transaction.go
│   │   ├── wallet_transaction_gorm.go
│   │   ├── conversation.go      # ConversationRepository interface
│   │   ├── conversation_gorm.go
│   │   ├── message.go           # MessageRepository interface
│   │   ├── message_gorm.go
│   │   ├── notification.go      # NotificationRepository interface
│   │   ├── notification_gorm.go
│   │   └── *_gorm_test.go       # Repository tests
│   │
│   ├── models/                  # GORM models (struct + Validate + BeforeCreate hooks)
│   │   ├── user.go
│   │   ├── task.go
│   │   ├── task_application.go
│   │   ├── category.go
│   │   ├── transaction.go
│   │   ├── wallet.go
│   │   ├── wallet_transaction.go
│   │   ├── conversation.go
│   │   ├── message.go           # Also defines WebSocketMessage and FlexTime
│   │   ├── notification.go      # Notification model + NotificationType enum
│   │   └── payment.go
│   │
│   ├── middleware/
│   │   └── cors.go              # CORS middleware for Gin
│   │
│   ├── websocket/
│   │   ├── hub.go               # Hub (register/unregister clients, broadcast to conversations)
│   │   └── client.go            # Client (readPump/writePump, Gorilla WebSocket)
│   │
│   ├── logger/
│   │   └── logger.go            # Zerolog setup
│   │
│   └── testutil/                # Test helpers
│       ├── assertions.go
│       ├── fixtures.go
│       ├── gorm_mock.go
│       └── mocks.go
│
├── migrations/                  # SQL migration files (golang-migrate)
├── static/                      # .well-known, privacy-policy.html
├── go.mod
└── go.sum
```

### Key Patterns

**Repository Interface Pattern**: Every data access concern is defined as an interface in `repository/<entity>.go`, with its GORM implementation in `repository/<entity>_gorm.go`. This enables testing with mock implementations.

```go
// repository/user.go — Interface
type UserRepository interface {
    Create(ctx context.Context, user *models.User) error
    GetByID(ctx context.Context, id int64) (*models.User, error)
    GetByEmail(ctx context.Context, email string) (*models.User, error)
    // ...
}

// repository/user_gorm.go — GORM Implementation
type userGormRepository struct { db *gorm.DB }
func NewUserGormRepository(db *gorm.DB) UserRepository { ... }
```

**TaskRepository Interface**: Includes `GetByIDForUpdate(ctx context.Context, tx *gorm.DB, id int64) (*models.Task, error)` which executes `SELECT ... FOR UPDATE` within a GORM transaction for row-level locking. Used by `TaskService.DeleteTask` to prevent concurrent modifications during task deletion.

**SearchServicer Interface Pattern** (same as PayOSServicer): `SearchServicer` is defined in `services/search.go` with two implementations:
- `MeilisearchService` -- real search engine backed by Meilisearch
- `NoOpSearchService` -- returns empty results, signalling the caller to fall back to PostgreSQL LIKE

The wiring logic in `cmd/server/main.go` and `cmd/testserver/main.go` checks `MEILISEARCH_URL`: if set, creates `MeilisearchService`; otherwise uses `NoOpSearchService`. `TaskService` receives the `SearchServicer` via constructor injection.

**Service Layer**: Services encapsulate business logic and depend on repository interfaces, not concrete implementations. Services are injected into handlers.

**MessageHandler** (defined in `handlers/websocket.go`): Handles REST conversation endpoints. Depends on `MessageService`.

| Method                   | Route                              | Description                       |
|--------------------------|------------------------------------|-----------------------------------|
| `GetConversations()`     | `GET /api/v1/conversations`        | List user's conversations         |
| `CreateConversation()`   | `POST /api/v1/conversations`       | Create a new conversation         |
| `GetConversationMessages()` | `GET /api/v1/conversations/:id/messages` | Get message history for a conversation |

**Model Validation Hooks**: GORM models implement `BeforeCreate` and `BeforeUpdate` hooks that call `Validate()`, enforcing data integrity at the ORM level.

**Dependency Wiring** (in `cmd/server/main.go`):
```
Config → Database → Repositories → Services → Handlers → Gin Router
```

**Service Dependencies:**
- `UserService` depends on `UserRepository` and `TaskRepository` (for computing dynamic user stats via `CountByFilters`)
- `TaskService` depends on `TaskRepository`, `TaskApplicationRepository`, `CategoryRepository`, `UserRepository`, `WalletService`, `NotificationService`, `SearchServicer`, and `*gorm.DB` (used for DB transactions with `SELECT ... FOR UPDATE` row locking in `DeleteTask`)
- `PaymentService` depends on `TransactionRepository`, `TaskRepository`, `TaskApplicationRepository`, `WalletService`, and `NotificationService`
- `NotificationService` depends on `NotificationRepository` and `WebSocket Hub`
- `WalletService` depends on `WalletRepository`, `WalletTransactionRepository`, and `*gorm.DB`
- `MessageService` depends on `MessageRepository`, `ConversationRepository`, and `WebSocket Hub`

---

## 5. Android App Architecture

### Package Structure

```
android/app/src/main/java/com/viecz/vieczandroid/
├── VieczApplication.kt              # @HiltAndroidApp entry point
├── MainActivity.kt                  # Single Activity (Compose host)
│
├── data/
│   ├── api/                         # Retrofit API interfaces
│   │   ├── AuthApi.kt               # POST /auth/register, /auth/login, /auth/refresh
│   │   ├── TaskApi.kt               # CRUD + apply/accept/complete
│   │   ├── CategoryApi.kt           # GET /categories
│   │   ├── UserApi.kt               # GET/PUT /users/me, /become-tasker
│   │   ├── WalletApi.kt             # GET /wallet, POST /wallet/deposit
│   │   ├── PaymentApi.kt            # Escrow/release/refund
│   │   ├── MessageApi.kt            # Conversations + messages
│   │   ├── NotificationApi.kt       # Notifications CRUD + mark read
│   │   ├── AuthInterceptor.kt       # OkHttp interceptor (injects Bearer token)
│   │   └── ErrorResponse.kt         # Error parsing
│   │
│   ├── auth/
│   │   └── AuthEventManager.kt      # Emits auth events (token expired → force logout)
│   │
│   ├── local/
│   │   ├── TokenManager.kt          # EncryptedSharedPreferences for JWT storage
│   │   ├── database/
│   │   │   ├── AppDatabase.kt       # Room database (tasks, categories, notifications)
│   │   │   └── Converters.kt        # Room type converters
│   │   ├── dao/
│   │   │   ├── TaskDao.kt
│   │   │   ├── CategoryDao.kt
│   │   │   └── NotificationDao.kt
│   │   └── entities/
│   │       ├── TaskEntity.kt
│   │       ├── CategoryEntity.kt
│   │       └── NotificationEntity.kt
│   │
│   ├── models/                      # Data classes (API response/request DTOs)
│   │   ├── AuthModels.kt
│   │   ├── Task.kt
│   │   ├── TaskApplication.kt
│   │   ├── Category.kt
│   │   ├── User.kt
│   │   ├── Wallet.kt
│   │   ├── Transaction.kt
│   │   ├── Conversation.kt
│   │   ├── Message.kt
│   │   ├── PaymentRequest.kt
│   │   ├── PaymentResponse.kt
│   │   └── Notification.kt          # ServerNotification + response DTOs
│   │
│   ├── repository/                  # Repository classes (API + local cache)
│   │   ├── AuthRepository.kt       # AuthApi + TokenManager
│   │   ├── TaskRepository.kt       # TaskApi + TaskDao (offline cache)
│   │   ├── CategoryRepository.kt   # CategoryApi + CategoryDao
│   │   ├── UserRepository.kt       # UserApi
│   │   ├── WalletRepository.kt     # WalletApi
│   │   ├── PaymentRepository.kt    # PaymentApi
│   │   ├── MessageRepository.kt    # MessageApi
│   │   └── NotificationRepository.kt # NotificationApi + NotificationDao (network-first, local cache)
│   │
│   └── websocket/
│       └── WebSocketClient.kt      # OkHttp WebSocket (connect, join, send, typing, read)
│
├── di/                              # Hilt DI modules
│   ├── NetworkModule.kt             # OkHttp, Retrofit, Moshi, API interfaces
│   └── DataModule.kt               # TokenManager, Room DB, DAOs, Repositories
│
├── ui/
│   ├── navigation/
│   │   └── Navigation.kt           # NavHost + all route definitions
│   │
│   ├── screens/                     # Composable screens
│   │   ├── SplashScreen.kt
│   │   ├── LoginScreen.kt
│   │   ├── RegisterScreen.kt
│   │   ├── MainScreen.kt           # Bottom navigation shell (Home, Chat, Profile tabs)
│   │   ├── HomeScreen.kt           # Task list feed
│   │   ├── TaskDetailScreen.kt     # Task details + apply/accept/complete actions
│   │   ├── CreateTaskScreen.kt
│   │   ├── ApplyTaskScreen.kt
│   │   ├── MyJobsScreen.kt         # Posted / Applied / Completed jobs
│   │   ├── ProfileScreen.kt
│   │   ├── EditProfileScreen.kt    # Edit profile + avatar upload
│   │   ├── WalletScreen.kt         # Balance, deposit, transaction history
│   │   ├── ChatScreen.kt           # Real-time chat (WebSocket)
│   │   ├── ConversationListScreen.kt
│   │   ├── NotificationScreen.kt
│   │   └── PaymentScreen.kt
│   │
│   ├── viewmodels/                  # ViewModels (Hilt-injected, expose StateFlow)
│   │   ├── AuthViewModel.kt
│   │   ├── TaskListViewModel.kt
│   │   ├── TaskDetailViewModel.kt
│   │   ├── CreateTaskViewModel.kt
│   │   ├── CategoryViewModel.kt
│   │   ├── ChatViewModel.kt
│   │   ├── ConversationListViewModel.kt
│   │   ├── WalletViewModel.kt
│   │   ├── PaymentViewModel.kt
│   │   └── NotificationViewModel.kt
│   │
│   ├── components/
│   │   └── TaskCard.kt              # Reusable task card (isOwnTask badge support)
│   │
│   └── theme/
│       ├── Color.kt
│       ├── Theme.kt
│       └── Type.kt
│
└── utils/
    ├── FormatUtils.kt               # Currency/date formatting
    ├── HttpErrorParser.kt           # Parse error responses (parseErrorMessage extension)
    └── ValidationUtils.kt           # Input validation
```

### Android Error Handling Pattern

All repository classes (`TaskRepository`, `PaymentRepository`, etc.) use a consistent error handling pattern with `HttpErrorParser.parseErrorMessage()`:

```kotlin
suspend fun someApiCall(): Result<T> {
    return try {
        val response = api.call()
        Result.success(response)
    } catch (e: HttpException) {
        val errorMessage = e.parseErrorMessage()  // Extracts server error message from JSON body
        Result.failure(Exception(errorMessage))
    } catch (e: IOException) {
        Result.failure(Exception("Network error. Please check your connection."))
    }
}
```

`parseErrorMessage()` (in `HttpErrorParser.kt`) parses the JSON error body `{"error": "..."}` from server responses to extract user-friendly messages (e.g., "insufficient available balance: have 0, need 100000") instead of showing raw HTTP status codes (e.g., "HTTP 500 Internal Server Error").

### Lifecycle-Aware Auto-Refresh

`MainScreen.kt` uses `repeatOnLifecycle(Lifecycle.State.RESUMED)` to auto-refresh data when the user navigates back to a tab:

- **Marketplace tab (tab 0)**: Refreshes the task list via `taskListViewModel.refresh()` on every `RESUMED` lifecycle event. This ensures tasks that moved to `in_progress` or `completed` disappear from the marketplace without manual pull-to-refresh.
- **Wallet tab (tab 3)**: Refreshes wallet balance and transaction history on `RESUMED`, so deposits completed in the browser are reflected when the user returns to the app.

### Debounced Search Pattern

`TaskListViewModel` implements debounced auto-search using `Flow.debounce(1000ms)`:

```
User types → _searchQueryText (MutableStateFlow)
  → .drop(1).debounce(1000).distinctUntilChanged()
  → updates uiState.searchQuery → loadTasks(refresh=true)
  → GET /api/v1/tasks?search=<query>
```

The search bar (`HomeScreen.kt`) includes a clear (X) button. Clearing resets the query and restores the full task list. Server-side search uses Meilisearch for relevance-ranked full-text search when configured, falling back to case-insensitive PostgreSQL `LIKE` matching on task title and description.

### MVVM Data Flow

```mermaid
graph LR
    ComposeScreen["Compose Screen"]
    ViewModel["ViewModel<br/>(StateFlow)"]
    Repository["Repository<br/>(API + Room)"]
    RetrofitAPI["Retrofit API<br/>(Network)"]
    RoomDAO["Room DAO<br/>(Local DB)"]

    ComposeScreen -- "event (onClick)" --> ViewModel
    ViewModel -- "state" --> ComposeScreen
    ViewModel -- "call (function)" --> Repository
    Repository -- "data" --> ViewModel
    Repository --> RetrofitAPI
    Repository --> RoomDAO
```

### Hilt Dependency Graph

```
NetworkModule (@Singleton)
├── OkHttpClient (AuthInterceptor + LoggingInterceptor)
├── Retrofit (Moshi converter)
├── AuthApi, TaskApi, CategoryApi, UserApi, WalletApi, PaymentApi, MessageApi, NotificationApi

DataModule (@Singleton)
├── TokenManager (EncryptedSharedPreferences)
├── AppDatabase (Room)
├── TaskDao, CategoryDao, NotificationDao
├── AuthRepository, TaskRepository, CategoryRepository
├── UserRepository, WalletRepository, PaymentRepository, NotificationRepository(NotificationApi + NotificationDao)
```

### Navigation Routes

| Route                    | Screen                   | Auth Required |
|--------------------------|--------------------------|---------------|
| `splash`                 | SplashScreen             | No            |
| `login`                  | LoginScreen              | No            |
| `register`               | RegisterScreen           | No            |
| `main`                   | MainScreen (bottom tabs) | Yes           |
| `task_detail/{taskId}`   | TaskDetailScreen         | Yes           |
| `create_task`            | CreateTaskScreen         | Yes           |
| `edit_task/{taskId}`     | CreateTaskScreen (edit mode) | Yes       |
| `apply_task/{taskId}/{price}` | ApplyTaskScreen     | Yes           |
| `profile`                | ProfileScreen            | Yes           |
| `wallet`                 | WalletScreen             | Yes           |
| `chat/{conversationId}`  | ChatScreen               | Yes           |
| `notifications`          | NotificationScreen       | Yes           |
| `my_jobs/{mode}`         | MyJobsScreen             | Yes           |

### Product Flavors

| Flavor | API Base URL                        | App Name    | Application ID Suffix |
|--------|-------------------------------------|-------------|----------------------|
| `dev`  | `http://10.0.2.2:9999/api/v1/`      | Viecz Dev   | `.dev`               |
| `prod` | Production server URL               | Viecz       | (none)               |

---

## 6. Web Client Architecture

### Package Structure

```
web/src/app/
├── app.routes.ts                # Route definitions (lazy-loaded)
├── app.config.ts                # Provider configuration (HttpClient, Router, Material)
├── app.config.server.ts         # SSR server config
├── app.ts                       # Root component
│
├── core/                        # Singleton services and utilities
│   ├── auth.service.ts          # Login, register, token management (localStorage)
│   ├── auth.guard.ts            # Route protection (functional CanActivateFn)
│   ├── auth.interceptor.ts      # JWT Bearer injection + 401 refresh with rotation
│   ├── error.interceptor.ts     # Global error handler (MatSnackBar)
│   ├── task.service.ts          # Task CRUD, applications, completion
│   ├── wallet.service.ts        # Balance, transactions, deposit
│   ├── payment.service.ts       # Escrow creation, release, refund
│   ├── user.service.ts          # Profile retrieval/update, avatar upload
│   ├── chat.service.ts          # Conversations and messages
│   ├── notification.service.ts  # Notifications list, mark read, unread count
│   ├── category.service.ts      # Cached category list (signal-based)
│   ├── application.service.ts   # Task applications
│   ├── websocket.service.ts     # WebSocket with exponential backoff reconnect
│   ├── models.ts                # TypeScript interfaces (User, Task, Wallet, etc.)
│   └── pipes.ts                 # Custom template pipes
│
├── auth/                        # Auth screens (public)
│   ├── login.component.ts
│   └── register.component.ts
│
├── layout/
│   └── shell.component.ts       # Navbar + router-outlet (protected shell)
│
├── marketplace/                 # Task browsing (default route)
├── task-form/                   # Create/edit task
├── task-detail/                 # Task details + delete/escrow dialogs
├── apply-task/                  # Application form
├── wallet/                      # Wallet balance + deposit dialog + transactions
├── chat/                        # Real-time messaging
├── my-jobs/                     # Posted & applied tasks
├── notifications/               # Notification center
├── profile/                     # User profile + redirect component
│
├── shared/components/           # Reusable UI components
│   ├── task-card.component.ts
│   ├── application-card.component.ts
│   ├── message-bubble.component.ts
│   ├── empty-state.component.ts
│   ├── error-fallback.component.ts
│   ├── loading-skeleton.component.ts
│   ├── category-chips.component.ts
│   ├── nhannht-metro-button.component.ts    # Design system components (13)
│   ├── nhannht-metro-input.component.ts
│   ├── nhannht-metro-textarea.component.ts
│   ├── nhannht-metro-select.component.ts
│   ├── nhannht-metro-datepicker.component.ts
│   ├── nhannht-metro-card.component.ts
│   ├── nhannht-metro-dialog.component.ts
│   ├── nhannht-metro-badge.component.ts
│   ├── nhannht-metro-icon.component.ts
│   ├── nhannht-metro-spinner.component.ts
│   ├── nhannht-metro-divider.component.ts
│   ├── nhannht-metro-snackbar.component.ts
│   └── nhannht-metro-tabs.component.ts
│
└── environments/                # Environment configs
    ├── environment.ts           # Dev: localhost:9999
    └── environment.prod.ts      # Prod: relative URLs (same origin)
```

### Key Patterns

**Standalone Components**: All components are standalone (no NgModules). Routes use lazy-loaded imports for code splitting.

**Signal-Based State**: Services use Angular Signals for reactive state (e.g., `currentUser`, `categories`, `unreadCount`). Components read signals directly in templates.

**Functional Interceptors**: HTTP interceptors use the `HttpInterceptorFn` pattern:
- `authInterceptor` — Attaches `Authorization: Bearer <token>`, handles 401 with token refresh and retry
- `errorInterceptor` — Catches non-401 errors, shows MatSnackBar notifications

**Token Storage**: JWT tokens stored in `localStorage` with keys `viecz_access_token`, `viecz_refresh_token`, `viecz_user`. Checks `isPlatformBrowser()` for SSR safety.

**WebSocket**: Connects to `/api/v1/ws?token=<jwt>`. Auto-selects `ws:` or `wss:` based on page protocol. Exponential backoff reconnect (max 5 retries, max 30s delay).

### Routes

| Path | Component | Auth Required |
|------|-----------|---------------|
| `/login` | LoginComponent | No |
| `/register` | RegisterComponent | No |
| `/` (root) | ShellComponent (layout) | Yes (authGuard) |
| `` (default child) | MarketplaceComponent | Yes |
| `/tasks/new` | TaskFormComponent | Yes |
| `/tasks/:id/edit` | TaskFormComponent | Yes |
| `/tasks/:id/apply` | ApplyTaskComponent | Yes |
| `/tasks/:id` | TaskDetailComponent | Yes |
| `/wallet` | WalletComponent | Yes |
| `/chat` | ChatComponent | Yes |
| `/messages` | ConversationListComponent | Yes |
| `/messages/:conversationId` | ChatComponent | Yes |
| `/my-jobs/:mode` | MyJobsComponent | Yes |
| `/notifications` | NotificationListComponent | Yes |
| `/profile` | ProfileRedirectComponent | Yes |
| `/profile/:id` | ProfileComponent | Yes |

### Navigation

Sticky Material toolbar with: Logo, nav links (Marketplace, Wallet, Chat), notifications menu with badge, user menu (Profile, Logout). Responsive — hides nav labels on mobile (<600px).

### SSR (Server-Side Rendering)

- **Builder**: `@angular/build:application` with `outputMode: "server"`
- **Server entry**: `src/server.ts` (Express 5)
- **Hydration**: `provideClientHydration(withEventReplay())`
- **Run**: `npm run serve:ssr:web` → `node dist/web/server/server.mjs`

### Environment Config

| Environment | API URL | WebSocket URL |
|-------------|---------|---------------|
| Development | `http://localhost:9999/api/v1` | `ws://localhost:9999/api/v1/ws` |
| Production | `/api/v1` (relative, same origin) | `/api/v1/ws` (relative) |

---

## 7. Database Layer

### GORM Models (AutoMigrate)

The following models are auto-migrated on server startup:

```
User, Category, Task, TaskApplication, Transaction,
Wallet, WalletTransaction, Conversation, Message, Notification
```

### Entity Relationship Diagram

```mermaid
erDiagram
    User {
        int id PK
        string email UK
        string password_hash
        string name
        string avatar_url
        string phone
        string university
        string student_id
        bool is_verified
        bool email_verified
        string auth_provider
        string google_id
        float rating
        bool is_tasker
        string tasker_bio
        string tasker_skills
        timestamp created_at
        timestamp updated_at
    }

    Category {
        int id PK
        string name
        string name_vi
        string icon
        bool is_active
    }

    Task {
        int id PK
        int requester_id FK
        int tasker_id FK
        int category_id FK
        string title
        string description
        int64 price
        string location
        float lat
        float lng
        string status
        timestamp deadline
        timestamp completed_at
        string image_urls
    }

    TaskApplication {
        int id PK
        int task_id FK
        int tasker_id FK
        int64 proposed_price
        string message
        string status
    }

    Wallet {
        int id PK
        int user_id FK
        int64 balance
        int64 escrow_balance
    }

    WalletTransaction {
        int id PK
        int wallet_id FK
        int transaction_id
        int task_id
        string type
        int64 amount
        int64 balance_before
        int64 balance_after
        int64 escrow_before
        int64 escrow_after
        string description
        int reference_user_id
    }

    Conversation {
        uint id PK
        int task_id FK
        int poster_id
        int tasker_id
        string last_message
    }

    Message {
        uint id PK
        uint conversation_id FK
        int sender_id
        string content
        bool is_read
    }

    Transaction {
        int id PK
        int task_id FK
        int payer_id FK
        int payee_id FK
        int64 amount
        int64 platform_fee
        int64 net_amount
        string type "escrow | release | refund | deposit | withdrawal | platform_fee"
        string status "pending | success | failed | cancelled"
        string payos_order_code
        string description
    }

    Notification {
        int id PK
        int user_id FK
        string type
        string title
        string message
        int task_id FK
        bool is_read
        timestamp created_at
    }

    User ||--o{ Task : "requester"
    Category ||--o{ Task : "has"
    Task ||--o{ TaskApplication : "has"
    User ||--o{ TaskApplication : "tasker"
    User ||--|| Wallet : "owns"
    Wallet ||--o{ WalletTransaction : "has"
    Task ||--o{ Conversation : "has"
    Conversation ||--o{ Message : "contains"
    User ||--o{ Transaction : "payer"
    User ||--o{ Transaction : "payee"
    Task ||--o{ Transaction : "has"
    User ||--o{ Notification : "receives"
    Task ||--o{ Notification : "triggers"
```

### Production vs Test Server Database

| Aspect          | Production (`cmd/server`)     | Test (`cmd/testserver`)          |
|-----------------|-------------------------------|----------------------------------|
| Database        | PostgreSQL (via GORM driver)  | PostgreSQL (Docker tmpfs, port 5433) |
| Connection      | `database.NewGORM()` + options| `database.NewGORM()` + test DB options |
| Migrations      | AutoMigrate + golang-migrate  | AutoMigrate only                 |
| Seed Data       | Categories + test users       | Categories + 2 test users + wallets (10M VND) + 10 sample tasks |
| PayOS           | Real PayOS SDK                | Mock (auto-fires webhook)        |
| Port            | Configurable (default 8080)   | 9999 (hardcoded)                 |
| JWT Secret      | From env var                  | `e2e-test-secret-key`            |

### Android Local Database (Room)

Room is used for offline caching on the Android side:

| Entity            | Purpose                           |
|-------------------|-----------------------------------|
| `TaskEntity`      | Cache task list for offline view  |
| `CategoryEntity`  | Cache categories                  |
| `NotificationEntity` | Server notification cache (network-first) |

---

## 8. WebSocket Architecture

### Server-Side (Gorilla WebSocket)

```mermaid
graph TD
    subgraph Hub["WebSocket Hub (goroutine)"]
        HubState["<b>State:</b><br/>clients: map[userID] -> *Client<br/>conversations: map[conversationID] -> map[*Client]bool<br/><br/><b>Channels:</b><br/>Register -- new client connections<br/>Unregister -- client disconnections<br/>Broadcast -- messages to broadcast<br/><br/><b>Methods:</b><br/>JoinConversation(client, conversationID)<br/>LeaveConversation(client, conversationID)<br/>SendToUser(userID, message)<br/>IsUserOnline(userID) bool"]
    end

    subgraph Client1["Client UserID=1"]
        rp1["readPump<br/>(reads from conn)"]
        wp1["writePump<br/>(writes to conn)"]
        sc1["send chan"]
    end

    subgraph Client2["Client UserID=2"]
        rp2["readPump<br/>(reads from conn)"]
        wp2["writePump<br/>(writes to conn)"]
        sc2["send chan"]
    end

    Hub --> Client1
    Hub --> Client2
```

### Connection Flow

```mermaid
sequenceDiagram
    participant Android
    participant Server

    Android->>Server: GET /api/v1/ws?token=JWT
    Note right of Server: Validate JWT<br/>Upgrade to WebSocket
    Server-->>Android: 101 Switching Protocols
    Note right of Server: Create Client, Register with Hub

    Android->>Server: {"type":"join",<br/>"conversation_id":5}
    Note right of Server: Hub.JoinConversation(client, 5)

    Android->>Server: {"type":"message",<br/>"conversation_id":5,<br/>"content":"Hello"}
    Note right of Server: MessageService.HandleMessage<br/>-> Save to DB<br/>-> Hub.Broadcast to conv 5

    Server-->>Android: {"type":"message",<br/>"sender_id":2,<br/>"content":"Hi back"}
    Note right of Server: Broadcast from other user
```

### WebSocket Message Types

| Type      | Direction      | Description                          |
|-----------|----------------|--------------------------------------|
| `join`    | Client → Server | Join a conversation room             |
| `leave`   | Client → Server | Leave a conversation room            |
| `message` | Bidirectional  | Chat message                         |
| `typing`  | Client → Server | Typing indicator                     |
| `read`    | Client → Server | Mark conversation as read            |
| `notification` | Server → Client | Real-time notification push     |
| `error`   | Server → Client | Error response                       |

### Client-Side (OkHttp WebSocket)

The Android `WebSocketClient` is a `@Singleton` injected via Hilt. It:
- Connects with `ws://<base_url>/ws?token=<jwt>`
- Exposes `connectionState: StateFlow<WebSocketState>`
- Exposes `messages: Channel<WebSocketMessage>` for incoming messages
- Provides methods: `connect()`, `joinConversation()`, `sendChatMessage()`, `sendTypingIndicator()`, `markAsRead()`, `disconnect()`

---

## 9. Payment & Wallet System

### Wallet-Based Escrow Flow

```mermaid
sequenceDiagram
    participant User as User / Requester
    participant Server
    participant PayOS
    participant Tasker

    rect rgb(240, 248, 255)
        Note over User, Tasker: Phase 1: Deposit (PayOS -> Wallet)
        User->>Server: POST /wallet/deposit
        Server->>PayOS: CreatePaymentLink
        PayOS-->>Server: checkout_url
        Server-->>User: checkout_url

        User->>PayOS: User pays via PayOS
        PayOS->>Server: Webhook: paid
        Note right of Server: WalletService.Deposit(userID, amount)<br/>-> wallet.Credit(amount)<br/>-> create WalletTransaction
    end

    rect rgb(240, 255, 240)
        Note over User, Tasker: Phase 2: Escrow Hold (Accept Task Application)
        User->>Server: POST /payments/escrow
        Note right of Server: WalletService.HoldInEscrow(requesterID, amount, taskID)<br/>-> wallet.Balance -= amount<br/>-> wallet.EscrowBalance += amount<br/>-> create Transaction (type=escrow)<br/>-> create WalletTransaction (type=escrow_hold)
        Server-->>User: OK
    end

    rect rgb(255, 248, 240)
        Note over User, Tasker: Phase 3: Release (Task Completed)
        User->>Server: POST /payments/release
        Note right of Server: WalletService.ReleaseFromEscrow<br/>-> requester.EscrowBalance -= amount<br/>-> tasker.Balance += amount<br/>-> create WalletTransactions for both
        Server-->>User: OK
        Server-->>Tasker: Funds credited
    end
```

### Wallet Transaction Types

| Type               | Amount Sign | Description                        |
|--------------------|-------------|------------------------------------|
| `deposit`          | +           | PayOS deposit credited to wallet   |
| `withdrawal`       | -           | Withdrawn from wallet              |
| `escrow_hold`      | -           | Balance → escrow (task accepted)   |
| `escrow_release`   | -           | Escrow → payee (task completed)    |
| `escrow_refund`    | +           | Escrow → balance (task cancelled)  |
| `payment_received` | +           | Received from escrow release       |
| `platform_fee`     | -           | Platform fee deduction             |

### Max Wallet Balance

Configurable via `MAX_WALLET_BALANCE` env var (default: 200,000 VND). Deposits that would exceed this limit are rejected before creating the PayOS payment link.

---

## 10. Authentication

### Flow

```mermaid
sequenceDiagram
    participant Android as Android App
    participant Server as Go Server

    rect rgb(240, 248, 255)
        Note over Android, Server: Registration
        Android->>Server: POST /api/v1/auth/register<br/>{ email, password, name }
        Note right of Server: bcrypt.Hash(password)<br/>userRepo.Create(user)<br/>jwt.GenerateToken(user)
        Server-->>Android: { token, user }

        Note over Android: Store token in<br/>EncryptedSharedPreferences
    end

    rect rgb(240, 255, 240)
        Note over Android, Server: Subsequent Requests
        Android->>Server: Authorization: Bearer token
        Note right of Server: auth.AuthRequired middleware<br/>-> ValidateToken(token, secret)<br/>-> Set user_id in gin.Context
    end
```

### JWT Claims

```go
type Claims struct {
    UserID   int64  `json:"user_id"`
    Email    string `json:"email"`
    Name     string `json:"name"`
    IsTasker bool   `json:"is_tasker"`
    jwt.RegisteredClaims
}
```

### Middleware

- `AuthRequired(jwtSecret)` -- Rejects requests without valid Bearer token. Sets `user_id`, `email`, `name`, `is_tasker` in gin context.
- `OptionalAuth(jwtSecret)` -- Extracts user info if token present, but allows unauthenticated access.
- `auth.GetUserID(c *gin.Context)` -- Helper to extract user ID from context.

### Android Side

- `AuthInterceptor` (OkHttp interceptor) reads token from `TokenManager` and adds `Authorization: Bearer <token>` to every request.
- `AuthEventManager` emits events when token expires (401 response), triggering force logout in the UI.

---

## 11. API Routes

All routes are prefixed with `/api/v1/`.

### Public Routes

| Method | Path                      | Handler                    |
|--------|---------------------------|----------------------------|
| GET    | `/health`                 | Health check               |
| POST   | `/auth/register`          | Register new user          |
| POST   | `/auth/login`             | Login (email + password)   |
| POST   | `/auth/refresh`           | Refresh JWT token          |
| POST   | `/auth/google`            | Google OAuth login         |
| GET    | `/categories`             | List all categories        |
| GET    | `/users/:id`              | Get public user profile    |
| POST   | `/payment/webhook`        | PayOS webhook callback     |
| POST   | `/payment/confirm-webhook`| Confirm webhook URL        |

### Protected Routes (require `Authorization: Bearer <token>`)

| Method | Path                           | Handler                       |
|--------|--------------------------------|-------------------------------|
| GET    | `/users/me`                    | Get current user profile      |
| PUT    | `/users/me`                    | Update profile                |
| POST   | `/users/become-tasker`         | Register as tasker            |
| POST   | `/tasks`                       | Create task                   |
| GET    | `/tasks`                       | List tasks (with filters)     |
| GET    | `/tasks/:id`                   | Get task detail               |
| PUT    | `/tasks/:id`                   | Update task                   |
| DELETE | `/tasks/:id`                   | Delete task                   |
| POST   | `/tasks/:id/applications`      | Apply for task                |
| GET    | `/tasks/:id/applications`      | Get task applications         |
| POST   | `/tasks/:id/complete`          | Mark task completed           |
| POST   | `/applications/:id/accept`     | Accept application            |
| GET    | `/wallet`                      | Get wallet balance            |
| POST   | `/wallet/deposit`              | Create deposit (PayOS link)   |
| GET    | `/wallet/transactions`         | Wallet transaction history    |
| POST   | `/payments/escrow`             | Create escrow payment         |
| POST   | `/payments/release`            | Release escrow to tasker      |
| POST   | `/payments/refund`             | Refund escrow to requester    |
| GET    | `/notifications`               | List notifications            |
| GET    | `/notifications/unread-count`  | Get unread count              |
| POST   | `/notifications/:id/read`      | Mark notification as read     |
| POST   | `/notifications/read-all`      | Mark all as read              |
| DELETE | `/notifications/:id`           | Delete notification           |
| GET    | `/conversations`               | List user's conversations     |
| POST   | `/conversations`               | Create conversation           |
| GET    | `/conversations/:id/messages`  | Get conversation messages     |
| GET    | `/ws?token=<jwt>`              | WebSocket upgrade             |

---

## 12. Deployment

### Server Infrastructure

Production runs on a dedicated bare metal server. Infrastructure details (IP, hostname, provider specs) are maintained separately and not included in public documentation.

### Production Stack

```mermaid
graph LR
    Internet(("Internet"))
    Cloudflare["Cloudflare Tunnel<br/>(SSL)"]
    GoBinary["Go Binary<br/>(:8080)"]
    PostgreSQL[("PostgreSQL<br/>(:5432)")]
    PayOS(("PayOS API"))

    Meilisearch[("Meilisearch<br/>(optional)")]

    Internet --> Cloudflare
    Cloudflare --> GoBinary
    GoBinary --> PostgreSQL
    GoBinary --> PayOS
    GoBinary -.-> Meilisearch
```

### Test Server Stack

```mermaid
graph LR
    Device["Emulator / Device"]
    GoBinary["Go Binary<br/>(:9999)"]
    PostgreSQLTest[("PostgreSQL<br/>(:5433 tmpfs)")]
    MockPayOS["Mock PayOS<br/>(auto-webhook)"]

    Meilisearch[("Meilisearch<br/>(:7700, optional)")]

    Device --> GoBinary
    GoBinary --> PostgreSQLTest
    GoBinary --> MockPayOS
    GoBinary -.-> Meilisearch
```

---

*This is a living document. Update as the architecture evolves.*
