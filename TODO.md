# TODO List - Viecz MVP

**Last Updated:** February 5, 2026
**Deadline:** February 28, 2026 (23 days remaining)

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

## 🟢 MEDIUM PRIORITY - Phase 3 Preparation

### Backend - Payments
TODO: Review existing PayOS integration code
TODO: Design escrow payment flow (hold → release → refund)
TODO: Create wallet service with mock mode
TODO: Add wallet transaction tracking
TODO: Update payment webhook for task completion

### Android - Payments
TODO: Update PaymentRepository for escrow flow
TODO: Create WalletApi and WalletRepository
TODO: Build wallet balance display screen
TODO: Create transaction history screen
TODO: Handle PayOS deep links for return URLs

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

---

## 🎯 Today's Focus

**Priority 1:** Add AuthInterceptor to Android (30 min)
**Priority 2:** Seed backend categories (15 min)
**Priority 3:** Test end-to-end flow and document issues (1-2 hours)

---

## 📊 Progress Tracking

- **Phase 1:** ✅ 100% Complete
- **Phase 2:** 🟡 80% Complete (Backend done, Android needs testing)
- **Phase 3:** ⏳ 0% Complete
- **Phase 4:** ⏳ 0% Complete
- **Phase 5:** ⏳ 0% Complete

**Overall:** ~35% Complete (Phase 1 + 80% of Phase 2)
**Days Used:** 4-5 days
**Days Remaining:** 18-19 days
**On Track:** ⚠️ Need to accelerate (should be at ~20% after 4 days)
