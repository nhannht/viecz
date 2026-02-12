# Scenario 10: View Applications (As Requester)

**Prerequisites:** Someone must apply to your task (Scenario 9)

**Steps:**
1. Login as task requester
2. Navigate to task detail of task with applications (tap on Marketplace tab)
3. View applications section

**Expected Results:**
- [ ] Task detail shows applications section
- [ ] Can see list of applicants
- [ ] Each application shows: Name, proposed price, message
- [ ] "Accept Application" button visible

**What to Check in Logcat:**
```
TaskDetailViewModel: Loading task applications
OkHttp: --> GET http://localhost:8080/api/v1/tasks/1/applications
AuthInterceptor: Adding Authorization header
OkHttp: <-- 200 OK
TaskDetailViewModel: N application(s) loaded
```

**Automated Test:** `FullJobLifecycleE2ETest` (Step 10: Alice views and accepts)
