# Scenario 1: User Registration Flow

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

**Automated Test:** `S01_AuthFlowE2ETest.loginToRegisterToHome()`
