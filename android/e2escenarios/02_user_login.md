# Scenario 2: User Login Flow

**Steps:**
1. If already logged in, logout first (Profile tab → scroll to Logout)
2. At Login screen, enter:
   - Email: nhannht.alpha@gmail.com
   - Password: Password123
3. Tap "Login"

**Expected Results:**
- [ ] Loading spinner shows during login
- [ ] Login succeeds → Navigates to MainScreen (bottom bar visible)
- [ ] Token saved to DataStore
- [ ] OkHttp logs show successful POST /auth/login

**What to Check in Logcat:**
```
AuthViewModel: login called with email=nhannht.alpha@gmail.com
OkHttp: --> POST http://localhost:8080/api/v1/auth/login
OkHttp: <-- 200 OK
AuthViewModel: Login successful, tokens saved
```

**Automated Test:** `S01_AuthFlowE2ETest.splashToLoginToHome()`
