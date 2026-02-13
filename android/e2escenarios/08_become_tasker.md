# Scenario 8: Become a Tasker

**Steps:**
1. Tap Profile tab in bottom bar
2. If not already a tasker, tap "Become a Tasker"
3. Confirm in dialog by tapping "Yes, Register"

**Expected Results:**
- [ ] Profile loads with user info
- [ ] Shows stats (rating, completed tasks, posted tasks)
- [ ] "Become a Tasker" button visible if not yet a tasker
- [ ] Dialog shows confirmation
- [ ] After confirmation: User becomes tasker
- [ ] Snackbar shows success message
- [ ] "Tasker" badge appears on profile

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

**Automated Test:** `S13_FullJobLifecycleE2ETest` (Step 6: Bob becomes a tasker)
