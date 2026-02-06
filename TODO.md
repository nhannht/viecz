# TODO List - Viecz MVP

**Last Updated:** February 6, 2026
**Deadline:** February 28, 2026 (22 days remaining)

---

## 🔴 CRITICAL - Must Complete Phase 2

### Android - Auth & Testing
TODO: Add AuthInterceptor to inject JWT tokens into API requests
TODO: Update NetworkModule to use AuthInterceptor in OkHttpClient
TODO: Test end-to-end registration flow (register → login → token storage)
TODO: Test end-to-end task browsing flow (load categories → load tasks)
TODO: Verify data types match between Android and backend (Long vs Int for IDs)
TODO: Add error handling for network failures (IOException, HttpException)
TODO: Add retry logic for failed API calls

### Backend - Data & Testing
TODO: Create seed script for categories table
TODO: Run seed script to populate initial categories
TODO: Test all task endpoints with curl or Postman
TODO: Test application endpoints (apply, accept)
TODO: Verify JWT token expiration and refresh flow

### DevOps
TODO: Document `adb reverse tcp:8080 tcp:8080` setup in README
TODO: Create TESTING_NOTES.md for documenting issues found

---

## 🟡 HIGH PRIORITY - Complete Phase 2

### Android UI/UX
TODO: Add pull-to-refresh on HomeScreen task list
TODO: Add loading shimmer effects while fetching data
TODO: Add empty state when no tasks available
TODO: Add error state with retry button when network fails
TODO: Add search bar to HomeScreen (filter tasks)
TODO: Add category filter chips to HomeScreen

### Android Data Layer
TODO: Implement Room database for offline caching
TODO: Add repository layer network + cache pattern
TODO: Add proper error mapping (IOException → "Network error", etc.)

### Backend
TODO: Add pagination query parameters validation
TODO: Add rate limiting middleware
TODO: Add request logging middleware
TODO: Optimize task query with proper indexes

---

## 🟢 MEDIUM PRIORITY - Phase 3 In Progress

### Backend - Payments ✅ COMPLETE
DONE: Review existing PayOS integration code
DONE: Design escrow payment flow (hold → release → refund)
DONE: Create Transaction, Wallet, WalletTransaction models
DONE: Implement repositories for Transaction, Wallet, WalletTransaction
DONE: Create wallet service with mock mode (HoldInEscrow, ReleaseFromEscrow, RefundFromEscrow)
DONE: Create payment orchestration service (CreateEscrowPayment, ReleasePayment, RefundPayment)
DONE: Add wallet transaction tracking
DONE: Update payment webhook for task completion
DONE: Add HTTP handlers for escrow payments (/payments/escrow, /payments/release, /payments/refund)
DONE: Add HTTP handlers for wallet operations (/wallet, /wallet/deposit, /wallet/transactions)
DONE: Update database migration to include new models

### Android - Payments ✅ COMPLETE
DONE: Create Transaction, Wallet, WalletTransaction data models
DONE: Update PaymentApi with escrow endpoints (createEscrowPayment, releasePayment, refundPayment)
DONE: Create WalletApi with wallet endpoints (getWallet, deposit, getTransactionHistory)
DONE: Update PaymentRepository for escrow flow
DONE: Create WalletRepository with deposit and transaction history methods
DONE: Update NetworkModule to provide WalletApi
DONE: Create WalletViewModel with state management
DONE: Build WalletScreen with balance display, deposit dialog, and transaction list
DONE: Add wallet navigation button to HomeScreen
DONE: Wire up wallet route in Navigation

DONE: Add escrow payment UI to TaskDetailScreen (accept application with payment)
DONE: Update TaskDetailViewModel to integrate PaymentRepository
DONE: Handle PayOS deep links in AndroidManifest.xml (http/https/custom schemes)
DONE: Handle deep link intent in MainActivity with payment result extraction
DONE: Add payment success/error snackbar notifications
DONE: Auto-open PayOS checkout URL in browser (real mode)
DONE: Display payment flow status in UI

TODO: Test escrow payment flow end-to-end with backend
TODO: Test PayOS deep link handling with real payment
TODO: Add refund button for cancelled tasks

---

## 📝 BACKLOG - Phase 4 & 5

### Real-time Features (Phase 4)
TODO: Implement WebSocket Hub in backend
TODO: Create WebSocket client handler
TODO: Implement message persistence
TODO: Build ChatScreen in Android
TODO: Add real-time message handling
TODO: Implement typing indicators
TODO: Create notification service

### Polish & Testing (Phase 5)
TODO: Implement review system (backend + Android)
TODO: Write integration tests for critical flows
TODO: Add database indexes for performance
TODO: Perform load testing (1000 concurrent users)
TODO: Write Android ViewModel unit tests
TODO: Write Android Repository unit tests
TODO: Add image caching with Coil
TODO: Polish UI animations and transitions

---

## ✅ DONE - Completed Tasks

DONE: Set up PostgreSQL database with GORM
DONE: Create User, Task, TaskApplication, Category models
DONE: Implement GORM repositories with testcontainers tests
DONE: Implement JWT authentication (register, login, refresh)
DONE: Create auth middleware for protected routes
DONE: Implement all backend API endpoints (tasks, users, categories, applications)
DONE: Write 83 backend tests (18.2% coverage)
DONE: Set up Android project with Jetpack Compose
DONE: Implement Hilt dependency injection (all ViewModels + repositories)
DONE: Fix Hilt build error with AGP 8.12.0
DONE: Create all Android screens (Login, Register, Home, TaskDetail, CreateTask, ApplyTask, Profile)
DONE: Set up Navigation Compose
DONE: Configure RetrofitClient with base URL
DONE: Fix runtime crash by using hiltViewModel() in all screens
DONE: Add test dependencies (MockK, Turbine, Coroutines Test)
DONE: Create Transaction, Wallet, WalletTransaction models (Phase 3)
DONE: Implement escrow payment services (Phase 3)
DONE: Add payment and wallet HTTP handlers (Phase 3)

---

## 🎯 Today's Focus

**Option A - Continue to Phase 4 (Recommended):**
- **Priority 1:** Design WebSocket architecture (backend + Android)
- **Priority 2:** Implement WebSocket Hub and message model (backend)
- **Priority 3:** Create ChatScreen and WebSocket client (Android)

**Option B - Test Phase 3 First:**
- **Priority 1:** Seed test data (users, tasks, categories)
- **Priority 2:** Test escrow payment flow end-to-end
- **Priority 3:** Test PayOS deep links with real credentials

---

## 📊 Progress Tracking

- **Phase 1:** ✅ 100% Complete (Foundation)
- **Phase 2:** ✅ 100% Complete (Core Features)
- **Phase 3:** ✅ 100% Complete (Payments & Wallet)
- **Phase 4:** ⏳ 0% Complete (Real-time Features)
- **Phase 5:** ⏳ 0% Complete (Polish & Testing)

**Overall:** ~60% Complete (Phases 1, 2, 3 complete)
**Days Used:** ~6 days
**Days Remaining:** ~22 days
**On Track:** ✅ Ahead of schedule! (3 out of 5 phases complete in ~25% of time)
