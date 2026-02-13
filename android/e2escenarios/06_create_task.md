# Scenario 6: Create New Task

**Steps:**
1. At MainScreen Marketplace tab, tap "Add Job" icon in top bar
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
- [ ] Task shows in Marketplace task list

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

**Automated Test:** `S06_CreateTaskE2ETest.homeToCreateTaskFillFormAndSubmit()`
