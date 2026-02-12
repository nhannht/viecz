# Scenario 9: Apply for Task (As Tasker)

**Prerequisites:** Must be a tasker (complete Scenario 8 first)

**Steps:**
1. Create task with one account OR use existing task
2. Logout and create another account (or use test user)
3. Become tasker with second account
4. Navigate to task created by first account on Marketplace tab
5. Tap task to open Task Detail
6. Tap "Apply for this Task"
7. Fill in application:
   - Proposed Price: 140000 (optional - can leave empty)
   - Message: I have experience with furniture moving
8. Tap "Submit Application"

**Expected Results:**
- [ ] Apply dialog opens with original price shown
- [ ] Can enter proposed price (optional)
- [ ] Can enter message (optional)
- [ ] Application submitted successfully
- [ ] Shows "Application Pending" status on task detail

**What to Check in Logcat:**
```
ApplyTaskViewModel: Applying for task ID 1
OkHttp: --> POST http://localhost:8080/api/v1/tasks/1/applications
AuthInterceptor: Adding Authorization header
OkHttp: {"proposed_price":140000,"message":"I have experience..."}
OkHttp: <-- 201 Created
ApplyTaskViewModel: Application submitted successfully
```

**Automated Test:** `FullJobLifecycleE2ETest` (Step 7: Bob applies for the task)
