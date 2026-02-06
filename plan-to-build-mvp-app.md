# Plan: Build Viecz MVP - P2P Task Marketplace

## Executive Summary

Build Viecz MVP by February 28, 2026 (23 days) - a P2P task marketplace for university students connecting task requesters with taskers. Stack: **Golang backend** (following Uber Go Style Guide) + **Native Android** (Jetpack Compose).

**Deadline:** February 28, 2026 (23 days from now)
**Competition:** SV_STARTUP VIII

## MVP Features

- **Authentication:** Custom email/password + JWT tokens (no Zalo)
- **User Management:** Registration, login, profiles, tasker registration, ratings (1-5 stars)
- **Task Marketplace:** Post, browse, search, filter by category/price/location
- **Applications:** Taskers apply with counter-offers, requesters accept
- **Real-time Chat:** WebSocket chat per task between requester and tasker
- **Payment/Wallet:** Mock wallet (dev) + PayOS escrow payments
- **Notifications:** In-app real-time alerts for tasks, applications, messages
- **Reviews:** Post-completion ratings for both parties

**Data Models (11):** User (with email/password), Task, TaskApplication, Category, Transaction, Wallet, WalletTransaction, Message, Review, Notification

**API Endpoints:** 43+ REST endpoints + 1 WebSocket endpoint

## Current State Analysis

### Backend (Go) - Existing Foundation
- ✅ Gin framework, PayOS SDK integration
- ✅ Payment creation + webhook handling
- ✅ CORS middleware, logging infrastructure
- ❌ No database, authentication, or core Viecz features

**Reusable:**
- `/home/larvartar/nhannht-projects/viecz/server/internal/services/payos.go` - PayOS service wrapper
- `/home/larvartar/nhannht-projects/viecz/server/internal/handlers/webhook.go` - Webhook verification
- `/home/larvartar/nhannht-projects/viecz/server/internal/handlers/return.go` - Deep link generation

### Android - Existing Foundation
- ✅ Jetpack Compose + Material 3
- ✅ MVVM architecture with ViewModel + Repository
- ✅ Retrofit + Moshi networking
- ✅ Navigation Compose
- ❌ No authentication, task marketplace, or chat features

**Reusable:**
- `/home/larvartar/nhannht-projects/viecz/android/app/src/main/java/com/viecz/vieczandroid/data/api/RetrofitClient.kt`
- `/home/larvartar/nhannht-projects/viecz/android/app/src/main/java/com/viecz/vieczandroid/data/repository/PaymentRepository.kt` - Repository pattern
- `/home/larvartar/nhannht-projects/viecz/android/app/src/main/java/com/viecz/vieczandroid/ui/viewmodels/PaymentViewModel.kt` - ViewModel pattern

## Architecture Decisions

### Database ORM: GORM

**Decision:** Use GORM instead of database/sql + pgx

**Rationale:**
- **Simplicity:** GORM provides higher-level abstractions, reducing boilerplate code
- **Auto-migrations:** Automatic schema management based on Go structs
- **Type safety:** Better compile-time checking with struct tags
- **Productivity:** Faster development with built-in query builders
- **Maintainability:** Easier to understand and modify compared to raw SQL

**Implementation:**
- Models use GORM struct tags (`gorm:"primaryKey;autoIncrement"`)
- Null values handled with pointers (`*string`, `*int64`) instead of `sql.NullString`
- Repositories use GORM methods (`db.Create()`, `db.Find()`, `db.Where()`)
- Auto-migration on startup with `db.AutoMigrate(&models.User{}, &models.Task{}, ...)`
- GORM hooks for validation (`BeforeCreate`, `BeforeUpdate`)

**Trade-offs:**
- Slightly less control over exact SQL queries (acceptable for MVP)
- Small performance overhead vs raw SQL (negligible for our scale)
- Learning curve for team members unfamiliar with GORM (mitigated by good documentation)

## Implementation Phases

### Phase 1: Foundation (Days 1-4) - Database & Authentication ✅ COMPLETED

**Backend:**
1. ✅ Set up PostgreSQL database with GORM
2. ✅ Create models with GORM tags (User, Task, TaskApplication, Category)
3. ✅ Implement GORM-based repositories for each model
4. ✅ Set up GORM auto-migration
5. ✅ Implement custom user registration/login with bcrypt password hashing
6. ✅ Implement JWT generation/validation (30min access, 7day refresh)
7. ✅ Create auth middleware for Gin (Bearer token validation)
8. ✅ Add email and password strength validation

**Android:**
1. ✅ Create auth API interface and data models
2. ✅ Implement token storage with DataStore
3. ✅ Build registration screen with email/password validation
4. ✅ Build login screen with email/password
5. ✅ Implement splash screen with token validation
6. ✅ Set up Navigation Compose with auth flow

**Critical Files Created (Backend):**
```
server/internal/
├── database/
│   ├── gorm.go                  # GORM connection + AutoMigrate ✅
│   └── database.go              # Legacy (kept for reference)
├── models/
│   ├── user.go                  # User model with GORM tags ✅
│   ├── task.go                  # Task model with associations ✅
│   ├── task_application.go      # TaskApplication model ✅
│   └── category.go              # Category model ✅
├── repository/
│   ├── user_gorm.go             # GORM UserRepository ✅
│   ├── task_gorm.go             # GORM TaskRepository ✅
│   ├── task_application_gorm.go # GORM TaskApplicationRepository ✅
│   └── category_gorm.go         # GORM CategoryRepository ✅
├── services/
│   └── task.go                  # Task business logic ✅
├── handlers/
│   ├── tasks.go                 # Task API endpoints ✅
│   ├── categories.go            # Category API endpoints ✅
│   └── auth.go                  # Auth API endpoints ✅
└── auth/
    ├── auth.go                  # Register/Login with bcrypt ✅
    ├── jwt.go                   # JWT functions ✅
    └── middleware.go            # AuthRequired() middleware ✅
```

**Critical Files to Create (Android):**
```
android/app/src/main/java/com/viecz/vieczandroid/
├── data/
│   ├── api/AuthApi.kt
│   ├── models/
│   │   ├── User.kt
│   │   ├── RegisterRequest.kt
│   │   ├── LoginRequest.kt
│   │   └── TokenResponse.kt
│   ├── repository/AuthRepository.kt
│   └── local/
│       └── TokenManager.kt      # DataStore for tokens
├── ui/
│   ├── screens/
│   │   ├── SplashScreen.kt
│   │   ├── RegisterScreen.kt
│   │   └── LoginScreen.kt
│   └── viewmodels/
│       └── AuthViewModel.kt
```

**Custom Authentication Implementation (Go):**
```go
// auth/auth.go
package auth

import "golang.org/x/crypto/bcrypt"

type AuthService struct {
    userRepo repository.UserRepository
}

// Register creates new user with hashed password
func (s *AuthService) Register(ctx context.Context, email, password, name string) (*models.User, error) {
    // Validate email format
    if !isValidEmail(email) {
        return nil, ErrInvalidEmail
    }

    // Validate password strength (min 8 chars, uppercase, lowercase, number)
    if !isStrongPassword(password) {
        return nil, ErrWeakPassword
    }

    // Check if email already exists
    exists, err := s.userRepo.ExistsByEmail(ctx, email)
    if err != nil {
        return nil, fmt.Errorf("failed to check email: %w", err)
    }
    if exists {
        return nil, ErrEmailAlreadyExists
    }

    // Hash password with bcrypt
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    if err != nil {
        return nil, fmt.Errorf("failed to hash password: %w", err)
    }

    user := &models.User{
        Email:        email,
        PasswordHash: string(hashedPassword),
        Name:         name,
        CreatedAt:    time.Now(),
    }

    if err := s.userRepo.Create(ctx, user); err != nil {
        return nil, fmt.Errorf("failed to create user: %w", err)
    }

    return user, nil
}

// Login verifies credentials and returns user
func (s *AuthService) Login(ctx context.Context, email, password string) (*models.User, error) {
    user, err := s.userRepo.GetByEmail(ctx, email)
    if err != nil {
        return nil, ErrInvalidCredentials
    }

    // Compare password with hash
    if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
        return nil, ErrInvalidCredentials
    }

    return user, nil
}
```

**Key Patterns (Go - from docs/go-guild/):**
- Functional options pattern for database config
- Repository interfaces with implementation
- Error wrapping: `fmt.Errorf("context: %w", err)`
- No `init()` functions, no globals
- Use `time.Time` and `time.Duration` (not int/float)
- Verify interface compliance: `var _ UserRepository = (*userRepository)(nil)`
- bcrypt for password hashing (NOT plain text or MD5)

**Custom Authentication (Android):**
```kotlin
// data/api/AuthApi.kt
interface AuthApi {
    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): TokenResponse

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): TokenResponse

    @POST("auth/refresh")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): TokenResponse
}

// data/models/RegisterRequest.kt
data class RegisterRequest(
    val email: String,
    val password: String,
    val name: String
)

// ui/screens/RegisterScreen.kt
@Composable
fun RegisterScreen(
    viewModel: AuthViewModel = viewModel(),
    onRegisterSuccess: () -> Unit,
    onNavigateToLogin: () -> Unit
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var emailError by remember { mutableStateOf<String?>(null) }
    var passwordError by remember { mutableStateOf<String?>(null) }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Create Account", style = MaterialTheme.typography.headlineMedium)

        Spacer(modifier = Modifier.height(32.dp))

        OutlinedTextField(
            value = name,
            onValueChange = { name = it },
            label = { Text("Full Name") },
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = email,
            onValueChange = {
                email = it
                emailError = if (!isValidEmail(it)) "Invalid email format" else null
            },
            label = { Text("Email") },
            isError = emailError != null,
            supportingText = { emailError?.let { Text(it) } },
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = password,
            onValueChange = {
                password = it
                passwordError = when {
                    it.length < 8 -> "Password must be at least 8 characters"
                    !it.any { c -> c.isUpperCase() } -> "Must contain uppercase letter"
                    !it.any { c -> c.isLowerCase() } -> "Must contain lowercase letter"
                    !it.any { c -> c.isDigit() } -> "Must contain number"
                    else -> null
                }
            },
            label = { Text("Password") },
            isError = passwordError != null,
            supportingText = { passwordError?.let { Text(it) } },
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(32.dp))

        Button(
            onClick = {
                if (emailError == null && passwordError == null) {
                    viewModel.register(email, password, name)
                }
            },
            enabled = email.isNotBlank() && password.isNotBlank() && name.isNotBlank(),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Register")
        }

        TextButton(
            onClick = onNavigateToLogin,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Already have an account? Login")
        }
    }
}
```

**Milestone:** User can register with email/password, login, JWT tokens stored, protected routes work

---

### Phase 2: Core Features (Days 5-12) - Tasks & Applications

**Backend:**
1. Implement task service with business logic (`internal/services/task.go`)
2. Create task handlers (CRUD, apply, accept, complete)
3. Implement application service
4. Create user service (profile, become-tasker)
5. Seed categories in database
6. Add search/filter logic with query builder

**Android:**
1. Create Task data models and API interfaces
2. Implement Room database for offline caching
3. Build task repository with network + cache pattern
4. Create HomeScreen with task list (LazyColumn, infinite scroll)
5. Build TaskDetailScreen
6. Create CreateTaskScreen with form validation
7. Build ApplyTaskScreen
8. Implement profile screens (view + edit)

**Critical Files (Backend):**
```
server/internal/
├── services/
│   ├── task.go                  # CreateTask, ApplyForTask, AcceptApplication, CompleteTask
│   ├── user.go                  # UpdateProfile, BecomeTasker
│   └── application.go
├── handlers/
│   ├── tasks.go                 # 11 task endpoints
│   ├── users.go                 # 5 user endpoints
│   └── categories.go            # 2 category endpoints
```

**Critical Files (Android):**
```
android/app/src/main/java/com/viecz/vieczandroid/
├── data/
│   ├── api/
│   │   ├── TaskApi.kt
│   │   └── CategoryApi.kt
│   ├── models/
│   │   ├── Task.kt
│   │   ├── TaskApplication.kt
│   │   └── Category.kt
│   ├── repository/
│   │   ├── TaskRepository.kt
│   │   └── CategoryRepository.kt
│   └── local/
│       ├── dao/TaskDao.kt
│       └── database/AppDatabase.kt (Room)
├── ui/
│   ├── screens/
│   │   ├── home/HomeScreen.kt
│   │   ├── task/
│   │   │   ├── TaskDetailScreen.kt
│   │   │   ├── CreateTaskScreen.kt
│   │   │   └── ApplyTaskScreen.kt
│   │   └── profile/
│   │       ├── ProfileScreen.kt
│   │       └── EditProfileScreen.kt
│   └── viewmodels/
│       ├── TaskListViewModel.kt
│       ├── TaskDetailViewModel.kt
│       └── ProfileViewModel.kt
```

**Task Service Example (Go):**
```go
// services/task.go
func (s *TaskService) CreateTask(ctx context.Context, requesterID int64, input *CreateTaskInput) (*models.Task, error) {
    if err := input.Validate(); err != nil {
        return nil, fmt.Errorf("validation failed: %w", err)
    }

    task := &models.Task{
        RequesterID: requesterID,
        Status:      models.TaskStatusOpen,
        // ...
    }

    if err := s.taskRepo.Create(ctx, task); err != nil {
        return nil, fmt.Errorf("failed to create task: %w", err)
    }

    // Async notification
    go s.notificationSvc.NotifyTaskCreated(context.Background(), task)

    return task, nil
}
```

**Android Repository Pattern:**
```kotlin
// TaskRepository.kt
class TaskRepository(private val api: TaskApi, private val dao: TaskDao) {
    suspend fun getTasks(page: Int = 1): Result<PaginatedResponse<Task>> {
        return try {
            val response = api.getTasks(page = page)
            if (page == 1) {
                dao.deleteAll()
                dao.insertAll(response.data)
            }
            Result.success(response)
        } catch (e: Exception) {
            // Return cached data on error
            if (page == 1) {
                val cached = dao.getAll()
                if (cached.isNotEmpty()) {
                    return Result.success(PaginatedResponse(data = cached))
                }
            }
            Result.failure(e)
        }
    }
}
```

**Milestone:** Users can post tasks, browse marketplace, apply for tasks, requesters can accept applications

---

### Phase 3: Payments & Wallet (Days 13-16)

**Backend:**
1. Extend existing PayOS service for escrow payments
2. Implement wallet service (mock mode for dev)
3. Create payment orchestration service
4. Implement escrow logic (hold, release, refund)
5. Add wallet transaction tracking
6. Update payment webhook handler for task completion

**Android:**
1. Update payment repository for escrow flow
2. Create wallet API and repository
3. Build payment flow screens
4. Add wallet balance display
5. Create transaction history screen
6. Handle deep links for PayOS return URLs

**Critical Files (Backend):**
```
server/internal/services/
├── payment.go                   # CreateEscrowPayment, ReleasePayment, RefundPayment
└── wallet.go                    # HoldInEscrow, ReleaseFromEscrow (mock mode)
```

**Payment Flow:**
1. Requester accepts application → Escrow payment created
2. Mock mode: Deduct from requester wallet, hold in escrow
3. Real mode: Generate PayOS checkout URL
4. Task status → `in_progress`
5. Requester marks complete → Escrow released to tasker
6. Platform fee extracted automatically

**Escrow Logic (Go):**
```go
func (s *PaymentService) CreateEscrowPayment(ctx context.Context, taskID, payerID int64) (*models.Transaction, string, error) {
    task, err := s.taskRepo.GetByID(ctx, taskID)
    if err != nil {
        return nil, "", fmt.Errorf("task not found: %w", err)
    }

    transaction := &models.Transaction{
        TaskID:      &taskID,
        Amount:      task.Price,
        PlatformFee: task.Price / 10,
        Type:        models.TransactionTypeEscrow,
        Status:      models.TransactionStatusPending,
    }

    if s.isMockMode() {
        // Mock wallet deduction
        if err := s.walletSvc.HoldInEscrow(ctx, payerID, task.Price, taskID); err != nil {
            return nil, "", fmt.Errorf("insufficient balance: %w", err)
        }
        transaction.Status = models.TransactionStatusSuccess
        // ...
        return transaction, "", nil
    }

    // Real PayOS payment
    result, err := s.payos.CreatePaymentLink(ctx, orderCode, task.Price, description, returnURL, cancelURL)
    // ...
    return transaction, result.CheckoutUrl, nil
}
```

**Milestone:** Payment escrow works (mock wallet for dev), PayOS integration for production, payment released after task completion

---

### Phase 4: Real-time Features (Days 17-19) - Chat & Notifications

**Backend:**
1. Implement WebSocket Hub with connection manager (`internal/websocket/hub.go`)
2. Create WebSocket client handler (`internal/websocket/client.go`)
3. Implement message persistence repository
4. Add WebSocket upgrade handler with JWT auth
5. Create notification service
6. Add notification endpoints

**Android:**
1. Create WebSocket client using OkHttp
2. Implement message repository
3. Build ChatScreen with message list
4. Add real-time message handling with SharedFlow
5. Implement typing indicators
6. Add notification handling

**Critical Files (Backend):**
```
server/internal/
├── websocket/
│   ├── hub.go                   # Connection manager with broadcast channels
│   ├── client.go                # Client with readPump/writePump
│   └── message.go               # Message types
└── handlers/
    └── websocket.go             # WebSocket upgrade handler
```

**WebSocket Hub Pattern (Go):**
```go
// websocket/hub.go
type Hub struct {
    clients    map[int64]map[*Client]bool  // taskID -> clients
    broadcast  chan *BroadcastMessage
    register   chan *Client
    unregister chan *Client
}

func (h *Hub) Run() {
    for {
        select {
        case client := <-h.register:
            // Register client to task
        case client := <-h.unregister:
            // Cleanup client connection
        case msg := <-h.broadcast:
            // Broadcast to all task participants
        }
    }
}
```

**Android WebSocket Client:**
```kotlin
class ChatWebSocketClient(private val taskId: Long, private val token: String) {
    private var webSocket: WebSocket? = null
    private val _messages = MutableSharedFlow<WebSocketMessage>()
    val messages: SharedFlow<WebSocketMessage> = _messages.asSharedFlow()

    fun connect() {
        val request = Request.Builder()
            .url("ws://localhost:8080/ws/chat/$taskId?token=$token")
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onMessage(webSocket: WebSocket, text: String) {
                val message = Json.decodeFromString<WebSocketMessage>(text)
                CoroutineScope(Dispatchers.IO).launch {
                    _messages.emit(message)
                }
            }
        })
    }

    fun sendMessage(content: String, receiverId: Long) {
        val message = mapOf("type" to "message", "content" to content)
        webSocket?.send(Json.encodeToString(message))
    }
}
```

**Milestone:** Real-time chat working between requester and tasker, typing indicators, notifications for task events

---

### Phase 5: Polish & Testing (Days 20-23)

**Backend:**
1. Implement review service and endpoints
2. Write unit tests (table-driven tests for services)
3. Add integration tests for critical flows
4. Performance optimization (database indexes, query optimization)
5. Load testing (1000 concurrent users)
6. Bug fixes and refinements

**Android:**
1. Create review screens
2. Add pull-to-refresh on task list
3. Implement error handling and retry logic
4. Add loading states and shimmer effects
5. Performance optimization (image caching with Coil)
6. UI polish and animations
7. Testing (ViewModel tests, Repository tests)

**Review Service (Backend):**
```go
func (s *ReviewService) CreateReview(ctx context.Context, taskID, reviewerID int64, input *CreateReviewInput) error {
    task, err := s.taskRepo.GetByID(ctx, taskID)
    if err != nil {
        return fmt.Errorf("task not found: %w", err)
    }

    if task.Status != models.TaskStatusCompleted {
        return ErrTaskNotCompleted
    }

    // Determine reviewee
    var revieweeID int64
    if task.RequesterID == reviewerID {
        revieweeID = *task.TaskerID
    } else {
        revieweeID = task.RequesterID
    }

    // Create review and update rating (in transaction)
    tx, err := s.reviewRepo.BeginTx(ctx)
    defer tx.Rollback()

    review := &models.Review{
        TaskID:     taskID,
        ReviewerID: reviewerID,
        RevieweeID: revieweeID,
        Rating:     input.Rating,
    }

    if err := s.reviewRepo.CreateTx(ctx, tx, review); err != nil {
        return fmt.Errorf("failed to create review: %w", err)
    }

    avgRating, _ := s.reviewRepo.GetAverageRatingTx(ctx, tx, revieweeID)
    if err := s.userRepo.UpdateRatingTx(ctx, tx, revieweeID, avgRating); err != nil {
        return fmt.Errorf("failed to update rating: %w", err)
    }

    return tx.Commit()
}
```

**Testing Strategy (Go - following docs/go-guild/test-table.md):**
```go
func TestTaskService_CreateTask(t *testing.T) {
    tests := []struct {
        name      string
        input     *CreateTaskInput
        wantErr   bool
        errType   error
    }{
        {
            name:    "valid task",
            input:   &CreateTaskInput{Title: "Test", CategoryID: 1, Price: 10000},
            wantErr: false,
        },
        {
            name:    "invalid category",
            input:   &CreateTaskInput{Title: "Test", CategoryID: 999, Price: 10000},
            wantErr: true,
            errType: ErrCategoryNotFound,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Setup, Execute, Assert
        })
    }
}
```

**Milestone:** MVP complete with all features, tested, performant, ready for demo

---

## Key Architectural Decisions

### Backend (Go) - Following docs/go-guild/

1. **Package Structure:** No "common/util" packages, focused packages by domain
2. **Repository Pattern:** One interface per model, implementation separate
3. **Service Layer:** Business logic isolated from handlers
4. **Functional Options:** For service/database configuration
5. **Error Handling:** Always wrap errors with context: `fmt.Errorf("context: %w", err)`
6. **Table-Driven Tests:** All service tests use table-driven pattern
7. **Context Propagation:** Pass `context.Context` to all I/O operations
8. **No Globals:** Dependency injection via constructors
9. **No init():** Configure in main() or setup functions
10. **Goroutine Lifecycle:** Every goroutine must be stoppable (use WaitGroup or done channel)

### Android (Kotlin)

1. **MVVM Architecture:** ViewModel + Repository + Room
2. **StateFlow:** For state management (not LiveData)
3. **Jetpack Compose:** Pure Compose, no XML layouts
4. **Navigation Compose:** Type-safe navigation
5. **Retrofit + Moshi:** For REST API
6. **OkHttp WebSocket:** For real-time chat
7. **DataStore:** For preferences (not SharedPreferences)
8. **Coroutines:** For all async operations
9. **Repository Pattern:** Network + Cache strategy with Room
10. **Dependency Injection:** Manual DI or Hilt (optional)

---

## Implementation Timeline

| Phase | Days | Backend Deliverables | Android Deliverables | Milestone |
|-------|------|---------------------|---------------------|-----------|
| Phase 1 | 1-4 | PostgreSQL + Auth + Repos | Login + Token storage | ✅ User can login |
| Phase 2 | 5-12 | Task CRUD + Applications | Task UI + Marketplace | ✅ Can post/apply/accept |
| Phase 3 | 13-16 | Escrow payments + Wallet | Payment flow + Wallet | ✅ Can pay for tasks |
| Phase 4 | 17-19 | WebSocket + Notifications | Chat + Push | ✅ Real-time chat |
| Phase 5 | 20-23 | Reviews + Tests | Reviews + Polish | ✅ MVP ready |

**Total: 23 days (Feb 5 - Feb 28, 2026)**

---

## Verification & Testing

### Backend Verification

**Phase 1 (Auth):**
```bash
# Start server
cd server
go run cmd/server/main.go

# Test registration
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "SecurePass123!", "name": "John Doe"}'

# Test login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "SecurePass123!"}'

# Expected: {"access_token": "jwt_token", "refresh_token": "refresh_token", "user": {...}}
```

**Phase 2 (Tasks):**
```bash
# Create task (with auth token)
curl -X POST http://localhost:8080/api/v1/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Help move furniture", "category_id": 1, "price": 50000}'

# List tasks
curl http://localhost:8080/api/v1/tasks?page=1&category_id=1

# Apply for task
curl -X POST http://localhost:8080/api/v1/tasks/1/applications \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"proposed_price": 45000, "message": "I can help!"}'
```

**Phase 3 (Payments):**
```bash
# Create escrow payment
curl -X POST http://localhost:8080/api/v1/payments/escrow \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"task_id": 1}'

# Release payment
curl -X POST http://localhost:8080/api/v1/payments/release \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"task_id": 1}'
```

**Phase 4 (WebSocket):**
```bash
# Connect via wscat
wscat -c "ws://localhost:8080/ws/chat/1?token=$TOKEN"

# Send message
{"type": "message", "content": "Hello!", "receiver_id": 2}
```

### Android Verification

**Phase 1:**
- Registration screen appears → Enter email/password/name → Account created
- Login screen → Enter credentials → Redirected to home → Token saved
- Password validation works (min 8 chars, uppercase, lowercase, number)
- Email validation works (valid email format)

**Phase 2:**
- Home shows task list → Can scroll infinitely
- Tap task → Detail screen shows → Can apply
- Create task → Form validation works → Task appears in list
- Profile shows stats → Can edit name/avatar

**Phase 3:**
- Accept application → Payment flow starts
- Mock mode: Balance deducted → Task status changes to "in progress"
- Real mode: PayOS page opens → After payment → Deep link returns to app
- Wallet screen shows balance and transactions

**Phase 4:**
- Open chat from task detail → WebSocket connects
- Send message → Other user receives instantly
- Typing indicator appears when other user types
- Notification arrives when message received (app in background)

**Phase 5:**
- Complete task → Can leave review
- Rating appears on user profile
- Pull to refresh works on task list
- Error states show retry buttons
- Loading states show shimmer

### Load Testing

```bash
# Install Apache Bench
sudo pacman -S apache-bench

# Test task list endpoint (1000 requests, 100 concurrent)
ab -n 1000 -c 100 -H "Authorization: Bearer $TOKEN" \
   http://localhost:8080/api/v1/tasks

# Expected: p95 < 200ms, no failures
```

---

## Risk Mitigation

**High-Risk Areas:**

1. **Database migrations**
    - Risk: Schema changes break existing data
    - Mitigation: Test migrations on dev database first, have rollback scripts

2. **WebSocket stability**
    - Risk: Connections drop, memory leaks from unclosed clients
    - Mitigation: Implement reconnection logic in Android, use defer for cleanup in Go, fallback to polling

3. **PayOS integration**
    - Risk: Payment gateway unavailable, webhook verification fails
    - Mitigation: Mock wallet mode as backup, comprehensive logging for debugging

4. **Authentication security**
    - Risk: JWT secret compromised, token not refreshed
    - Mitigation: Rotate JWT secret via environment, implement refresh token flow early

5. **Performance under load**
    - Risk: Database queries slow, WebSocket doesn't scale
    - Mitigation: Add indexes (defined in DATA_STRUCTURE.md), use connection pooling, load test early

**Fallback Plans:**
- WebSocket fails → Implement polling (every 5s)
- PayOS fails → Use mock wallet for demo
- Auth issues → Temporary dev-mode bypass
- Performance issues → Reduce scope (remove typing indicators, limit chat history)

---

## Success Criteria

**MVP Launch Ready When:**

✅ User can register/login with email and password (custom auth system)
✅ User can post tasks with title, description, price, category
✅ Taskers can browse and filter task marketplace
✅ Taskers can apply for tasks with counter-offers
✅ Requesters can accept applications
✅ Escrow payment holds funds when task accepted
✅ Real-time chat works between requester and tasker
✅ Payment released when task marked complete
✅ Both parties can leave reviews after completion
✅ User profiles show ratings and completed task counts
✅ Backend handles 1,000 concurrent users with <200ms p95 latency
✅ Android app works on Android 11+ devices
✅ Core flows have unit test coverage (>60% for services)

---

## Notes

- **Server must run on port 8080** (configured in Android app)
- **Use ADB reverse port forwarding** for physical device testing: `adb reverse tcp:8080 tcp:8080`
- **Mock wallet mode** for development (add funds via `/api/v1/wallet/add-funds`)
- **PayOS credentials** must be configured in `.env` for production mode
- **Database backups** before running migrations
- **Follow Uber Go Style Guide** strictly (docs/go-guild/)
- **Existing PayOS integration** will be extended for escrow, not rewritten
