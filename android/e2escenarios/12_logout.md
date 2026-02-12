# Scenario 12: Logout

**Steps:**
1. Tap Profile tab in bottom bar
2. Scroll down to "Logout" button
3. Tap "Logout"
4. Confirm in logout dialog

**Expected Results:**
- [ ] Logout button visible at bottom of profile content (scroll down)
- [ ] Logout confirmation dialog shows: "Are you sure you want to logout?"
- [ ] After confirm: Tokens cleared from DataStore
- [ ] Navigate to Login screen ("Welcome Back")
- [ ] Next app launch goes to Login (not MainScreen)

**What to Check in Logcat:**
```
ProfileViewModel: Logout called
TokenManager: Clearing tokens from DataStore
AuthViewModel: Tokens cleared
Navigation: Navigate to Login screen
```

**Automated Test:** `ProfileFlowE2ETest.logoutNavigatesToLogin()`

**Testing Note:** The Logout button is inside a LazyColumn. In instrumented tests, use `performScrollToNode(hasText("Logout"))` on the scrollable container — `performScrollTo()` does NOT work for off-screen LazyColumn items.
