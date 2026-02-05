# End-to-End Testing Guide - Viecz Android App

**Date:** February 5, 2026
**Device:** Z2458 (Android 14)
**Backend:** http://localhost:8080
**App Version:** 1.0 (Debug)

---

## ✅ Pre-Test Setup Complete

- [x] Backend server running on port 8080
- [x] Database seeded with 11 categories
- [x] Test user created: nhannht.alpha@gmail.com / Password123
- [x] ADB port forwarding configured (8080 → 8080)
- [x] Android app installed on device
- [x] AuthInterceptor configured to inject JWT tokens

---

## 🧪 E2E Test Scenarios

### Scenario 1: User Registration Flow

**Steps:**
1. Open app → Should show Splash screen for 1 second
2. Splash → Redirects to Login screen (no token)
3. Tap "Don't have an account? Register"
4. Fill in registration form:
   - Name: Test User
   - Email: testuser@example.com
   - Password: TestPass123
5. Tap "Register"

**Expected Results:**
- [ ] Email validation works (must be valid email format)
- [ ] Password validation works (min 8 chars, uppercase, lowercase, number)
- [ ] Loading spinner shows during registration
- [ ] Registration succeeds → Navigates to Home screen
- [ ] Token saved to DataStore
- [ ] OkHttp logs show successful POST /auth/register

**What to Check in Logcat:**
```
AuthViewModel: register called
OkHttp: --> POST http://localhost:8080/api/v1/auth/register
OkHttp: {"email":"testuser@example.com","password":"...","name":"Test User"}
OkHttp: <-- 200 OK (with access_token and refresh_token)
AuthViewModel: Registration successful, tokens saved
```

---

### Scenario 2: User Login Flow (Test User)

**Steps:**
1. If already logged in, logout first (Profile → Logout)
2. At Login screen, enter:
   - Email: nhannht.alpha@gmail.com
   - Password: Password123
3. Tap "Login"

**Expected Results:**
- [ ] Loading spinner shows during login
- [ ] Login succeeds → Navigates to Home screen
- [ ] Token saved to DataStore
- [ ] OkHttp logs show successful POST /auth/login

**What to Check in Logcat:**
```
AuthViewModel: login called with email=nhannht.alpha@gmail.com
OkHttp: --> POST http://localhost:8080/api/v1/auth/login
OkHttp: <-- 200 OK
AuthViewModel: Login successful, tokens saved
```

---

### Scenario 3: Token Persistence & Splash Screen

**Steps:**
1. Login with test user
2. Close app completely (swipe away from recent apps)
3. Open app again

**Expected Results:**
- [ ] Splash screen shows for 1 second
- [ ] Token is read from DataStore
- [ ] Splash → Automatically navigates to Home screen (skips Login)
- [ ] No authentication required

**What to Check in Logcat:**
```
AuthViewModel: Checking if user is logged in
TokenManager: Access token found in DataStore
AuthViewModel: User is logged in, navigate to Home
```

---

### Scenario 4: Browse Categories

**Steps:**
1. Login and reach Home screen
2. Observe the category filter section

**Expected Results:**
- [ ] Categories load automatically on Home screen
- [ ] 11 categories displayed:
  - Moving & Transport
  - Delivery
  - Assembly & Installation
  - Cleaning
  - Tutoring & Teaching
  - Tech Support
  - Event Help
  - Shopping & Errands
  - Pet Care
  - Photography
  - Other
- [ ] Categories shown with Vietnamese names
- [ ] Can select/deselect categories to filter tasks

**What to Check in Logcat:**
```
CategoryViewModel: Loading categories
OkHttp: --> GET http://localhost:8080/api/v1/categories
AuthInterceptor: Adding Authorization header
OkHttp: Authorization: Bearer eyJhbGc...
OkHttp: <-- 200 OK
CategoryViewModel: 11 categories loaded
```

---

### Scenario 5: Browse Tasks (Initially Empty)

**Steps:**
1. At Home screen, observe task list area

**Expected Results:**
- [ ] TaskListViewModel loads tasks automatically
- [ ] GET /tasks API called with auth token
- [ ] Empty state shown (no tasks yet)
- [ ] Loading indicator shows while fetching
- [ ] No errors displayed

**What to Check in Logcat:**
```
TaskListViewModel: Loading tasks (page=1)
OkHttp: --> GET http://localhost:8080/api/v1/tasks?page=1&status=open
AuthInterceptor: Adding Authorization header
OkHttp: <-- 200 OK
TaskListViewModel: 0 tasks loaded
```

---

### Scenario 6: Create New Task

**Steps:**
1. At Home screen, tap FAB (+ button)
2. Fill in Create Task form:
   - Title: Need help moving furniture
   - Description: Moving a sofa from 3rd floor
   - Category: Moving & Transport
   - Price: 150000
   - Location: District 1, HCMC
3. Tap "Create Task"

**Expected Results:**
- [ ] All fields validated (title, category, price required)
- [ ] Price must be > 0
- [ ] Loading spinner during creation
- [ ] Task created successfully
- [ ] Navigate to Task Detail screen
- [ ] Task shows in Home screen task list

**What to Check in Logcat:**
```
CreateTaskViewModel: Creating task
OkHttp: --> POST http://localhost:8080/api/v1/tasks
AuthInterceptor: Adding Authorization header
OkHttp: {"title":"Need help moving furniture",...}
OkHttp: <-- 201 Created
CreateTaskViewModel: Task created with ID: 1
TaskDetailViewModel: Loading task ID 1
```

---

### Scenario 7: View Task Detail

**Steps:**
1. From Home screen task list, tap on a task
2. View task details

**Expected Results:**
- [ ] Task detail screen loads
- [ ] Shows: Title, Description, Price, Location, Category, Status
- [ ] Shows requester info (nhannht)
- [ ] If you're the requester: Can't apply (your own task)
- [ ] If you're a tasker: Shows "Apply" button
- [ ] If not a tasker: Shows "Become Tasker" prompt

**What to Check in Logcat:**
```
TaskDetailViewModel: Loading task ID 1
OkHttp: --> GET http://localhost:8080/api/v1/tasks/1
AuthInterceptor: Adding Authorization header
OkHttp: <-- 200 OK
TaskDetailViewModel: Task loaded successfully
```

---

### Scenario 8: Become a Tasker

**Steps:**
1. Navigate to Profile screen (tap Profile icon)
2. If not already a tasker, tap "Become a Tasker"
3. Confirm in dialog

**Expected Results:**
- [ ] Profile loads with user info
- [ ] Shows stats (rating, completed tasks, posted tasks)
- [ ] Become Tasker button visible if not tasker
- [ ] Dialog shows confirmation
- [ ] After confirmation: User becomes tasker
- [ ] Button changes to "Tasker" badge

**What to Check in Logcat:**
```
ProfileViewModel: Loading profile
OkHttp: --> GET http://localhost:8080/api/v1/users/me
AuthInterceptor: Adding Authorization header
OkHttp: <-- 200 OK
ProfileViewModel: Becoming tasker
OkHttp: --> POST http://localhost:8080/api/v1/users/become-tasker
OkHttp: <-- 200 OK
ProfileViewModel: User is now a tasker
```

---

### Scenario 9: Apply for Task (As Tasker)

**Prerequisites:** Must be a tasker (complete Scenario 8 first)

**Steps:**
1. Create task with one account OR use existing task
2. Logout and create another account (or use test user)
3. Become tasker with second account
4. Navigate to task created by first account
5. Tap "Apply for Task"
6. Fill in application:
   - Proposed Price: 140000 (optional - can leave empty)
   - Message: I have experience with furniture moving
7. Tap "Submit Application"

**Expected Results:**
- [ ] Apply screen opens with original price shown
- [ ] Can enter proposed price (optional)
- [ ] Can enter message (optional)
- [ ] Price validation works (must be > 0 if provided)
- [ ] Message validation works (max 500 chars)
- [ ] Application submitted successfully
- [ ] Navigate back to task detail
- [ ] Task shows "Applied" status or disable apply button

**What to Check in Logcat:**
```
ApplyTaskViewModel: Applying for task ID 1
OkHttp: --> POST http://localhost:8080/api/v1/tasks/1/applications
AuthInterceptor: Adding Authorization header
OkHttp: {"proposed_price":140000,"message":"I have experience..."}
OkHttp: <-- 201 Created
ApplyTaskViewModel: Application submitted successfully
```

---

### Scenario 10: View Applications (As Requester)

**Prerequisites:** Someone must apply to your task (Scenario 9)

**Steps:**
1. Login as task requester
2. Navigate to task detail of task with applications
3. View applications section

**Expected Results:**
- [ ] Task detail shows applications count
- [ ] Can see list of applicants
- [ ] Each application shows: Name, proposed price, message
- [ ] Can tap "Accept" on an application

**What to Check in Logcat:**
```
TaskDetailViewModel: Loading task applications
OkHttp: --> GET http://localhost:8080/api/v1/tasks/1/applications
AuthInterceptor: Adding Authorization header
OkHttp: <-- 200 OK
TaskDetailViewModel: 1 application loaded
```

---

### Scenario 11: Accept Application

**Steps:**
1. As requester, view task with applications
2. Select an application
3. Tap "Accept"
4. Confirm in dialog

**Expected Results:**
- [ ] Confirmation dialog shows
- [ ] After accept: Application status → Accepted
- [ ] Task status → In Progress
- [ ] Other applications → Rejected automatically
- [ ] (Future: Escrow payment initiated)

**What to Check in Logcat:**
```
TaskDetailViewModel: Accepting application ID 1
OkHttp: --> POST http://localhost:8080/api/v1/applications/1/accept
AuthInterceptor: Adding Authorization header
OkHttp: <-- 200 OK
TaskDetailViewModel: Application accepted
```

---

### Scenario 12: Logout

**Steps:**
1. Navigate to Profile screen
2. Tap Logout icon (top right)
3. Confirm logout

**Expected Results:**
- [ ] Logout confirmation dialog shows
- [ ] After confirm: Tokens cleared from DataStore
- [ ] Navigate to Login screen
- [ ] Next app launch goes to Login (not Home)

**What to Check in Logcat:**
```
ProfileViewModel: Logout called
TokenManager: Clearing tokens from DataStore
AuthViewModel: Tokens cleared
Navigation: Navigate to Login screen
```

---

## 🐛 Common Issues & Troubleshooting

### Issue 1: Network Error / Connection Refused

**Symptoms:**
- App shows "Failed to load" errors
- Logcat shows: `java.net.ConnectException: Failed to connect to localhost/127.0.0.1:8080`

**Fix:**
```bash
# Verify backend is running
curl http://localhost:8080/api/v1/health

# Verify port forwarding
adb reverse --list
# Should show: tcp:8080 -> tcp:8080

# Re-setup port forwarding if needed
adb reverse tcp:8080 tcp:8080
```

---

### Issue 2: Unauthorized (401) Errors

**Symptoms:**
- Protected endpoints return 401
- Logcat shows: `<-- 401 Unauthorized`

**Check:**
1. Is AuthInterceptor adding Authorization header?
   ```
   Look for: AuthInterceptor: Adding Authorization header
   Look for: Authorization: Bearer eyJhbGc...
   ```
2. Is token valid?
   - Try logging in again
   - Check token expiration (30 min for access token)

---

### Issue 3: Empty Categories or Tasks

**Symptoms:**
- Categories don't load
- Tasks don't load

**Check:**
1. Is backend seeded?
   ```bash
   curl http://localhost:8080/api/v1/categories | jq length
   # Should return: 11
   ```
2. Check logs for API errors
3. Verify network connectivity

---

### Issue 4: JSON Parsing Errors

**Symptoms:**
- Logcat shows: `JsonDataException: Expected...`
- Data loads but app crashes

**Fix:**
- Check data type mismatches (Int vs Long)
- Verify API response matches Kotlin data classes
- Add detailed logging in Repository layer

---

## 📊 Logcat Monitoring Commands

### Start fresh logging session:
```bash
adb logcat -c
adb logcat -s AuthViewModel:D TaskListViewModel:D CategoryViewModel:D ProfileViewModel:D AuthInterceptor:D OkHttp:D AndroidRuntime:E *:E
```

### Filter by specific tags:
```bash
# Auth flow
adb logcat -s AuthViewModel:D AuthInterceptor:D OkHttp:D

# Task flow
adb logcat -s TaskListViewModel:D TaskDetailViewModel:D CreateTaskViewModel:D

# Errors only
adb logcat *:E
```

### Save logs to file:
```bash
adb logcat > /tmp/viecz-android-e2e.log
```

---

## ✅ Test Completion Checklist

**Phase 2 E2E Test Results:**

- [ ] Scenario 1: User Registration ✓/✗
- [ ] Scenario 2: User Login ✓/✗
- [ ] Scenario 3: Token Persistence ✓/✗
- [ ] Scenario 4: Browse Categories ✓/✗
- [ ] Scenario 5: Browse Tasks ✓/✗
- [ ] Scenario 6: Create Task ✓/✗
- [ ] Scenario 7: View Task Detail ✓/✗
- [ ] Scenario 8: Become Tasker ✓/✗
- [ ] Scenario 9: Apply for Task ✓/✗
- [ ] Scenario 10: View Applications ✓/✗
- [ ] Scenario 11: Accept Application ✓/✗
- [ ] Scenario 12: Logout ✓/✗

**Issues Found:** (Document below)

---

## 📝 Test Notes

**Date:** _____________
**Tester:** _____________
**Device:** Z2458 (Android 14)

### Issues Found:

1. Issue #1:
   - Scenario: ___________
   - Description: ___________
   - Severity: High/Medium/Low
   - Logcat: ___________
   - Fix: ___________

2. Issue #2:
   - ...

### Performance Notes:

- API response times: ___________
- UI lag or jank: ___________
- Memory usage: ___________

---

## 🎯 Next Steps After E2E

If all scenarios pass:
- ✅ Mark Phase 2 complete (100%)
- 🚀 Begin Phase 3: Payments & Wallet
- 📊 Update PROJECT_STATUS.md

If issues found:
- 🐛 Document all issues in this file
- 🔧 Fix critical issues first
- ♻️ Re-test failed scenarios
- 📝 Update TODO.md with fixes needed
