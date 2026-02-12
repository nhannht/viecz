# Scenario 3: Token Persistence & Splash Screen

**Steps:**
1. Login with test user
2. Close app completely (swipe away from recent apps)
3. Open app again

**Expected Results:**
- [ ] Splash screen shows for 1 second
- [ ] Token is read from DataStore
- [ ] Splash → Automatically navigates to MainScreen (skips Login)
- [ ] No authentication required

**What to Check in Logcat:**
```
AuthViewModel: Checking if user is logged in
TokenManager: Access token found in DataStore
AuthViewModel: User is logged in, navigate to Home
```

**Automated Test:** None (requires app restart, not covered by instrumented tests)
