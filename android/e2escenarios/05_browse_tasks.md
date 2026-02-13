# Scenario 5: Browse Tasks

**Steps:**
1. At MainScreen Marketplace tab, observe task list area

**Expected Results:**
- [ ] TaskListViewModel loads tasks automatically
- [ ] GET /tasks API called with auth token
- [ ] Empty state shown if no tasks, or task cards displayed
- [ ] Loading indicator shows while fetching
- [ ] No errors displayed

**What to Check in Logcat:**
```
TaskListViewModel: Loading tasks (page=1)
OkHttp: --> GET http://localhost:8080/api/v1/tasks?page=1&status=open
AuthInterceptor: Adding Authorization header
OkHttp: <-- 200 OK
TaskListViewModel: N tasks loaded
```

**Automated Test:** `S04_BrowseTasksE2ETest.homeScreenShowsTaskList()`
