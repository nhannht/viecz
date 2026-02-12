# Scenario 11: Accept Application

**Steps:**
1. As requester, view task with applications
2. Tap "Accept Application"
3. Confirm in "Accept Application & Create Payment" dialog
4. Tap "Accept"

**Expected Results:**
- [ ] Confirmation dialog shows
- [ ] After accept: Escrow payment processed
- [ ] "Payment processed successfully!" message shown
- [ ] Task status → In Progress
- [ ] "Mark as Completed" button appears
- [ ] Wallet balance reduced by task price (escrow)

**What to Check in Logcat:**
```
TaskDetailViewModel: Accepting application ID 1
OkHttp: --> POST http://localhost:8080/api/v1/applications/1/accept
AuthInterceptor: Adding Authorization header
OkHttp: <-- 200 OK
TaskDetailViewModel: Application accepted, escrow created
```

**Automated Test:** `FullJobLifecycleE2ETest` (Steps 10-11: Alice accepts, marks completed)
