# Scenario 7: View Task Detail

**Steps:**
1. From Marketplace tab task list, tap on a task
2. View task details

**Expected Results:**
- [ ] Task detail screen loads (pushes on top of MainScreen)
- [ ] Shows: Title, Description, Price, Location, Category, Status
- [ ] Shows requester info
- [ ] If you're the requester: Can't apply (your own task)
- [ ] If you're a tasker: Shows "Apply for this Task" button
- [ ] If not a tasker: Shows "Become Tasker" prompt
- [ ] Back button returns to MainScreen

**What to Check in Logcat:**
```
TaskDetailViewModel: Loading task ID 1
OkHttp: --> GET http://localhost:8080/api/v1/tasks/1
AuthInterceptor: Adding Authorization header
OkHttp: <-- 200 OK
TaskDetailViewModel: Task loaded successfully
```

**Automated Test:** `S04_BrowseTasksE2ETest` (partially covers task detail navigation)
