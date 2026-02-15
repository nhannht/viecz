# Scenario 19: Task Deletion (Soft Delete)

## Overview
Verify that a task creator can delete (cancel) an open task, and that deletion is blocked when an accepted application exists.

## Preconditions
- Go test server running on port 9999
- Fresh database (test server restart)

## Test Cases

### Test 1: Delete open task with no applications
1. Alice registers and deposits 200k
2. Alice creates a task (100k)
3. Alice views task detail — Delete button visible (trash icon, top bar)
4. Alice taps Delete → confirmation dialog appears
5. Alice confirms deletion
6. App navigates back to marketplace
7. Task no longer appears in marketplace list
8. Wallet balance restored to 200k (available balance freed)

### Test 2: Delete open task with pending applications
1. Alice creates a task
2. Bob registers as tasker and applies for the task
3. Alice views task detail → taps Delete → confirms
4. Task cancelled, Bob's application rejected
5. Task gone from marketplace

### Test 3: Delete button hidden after application accepted
1. Alice creates task → Bob applies → Alice accepts (escrow paid, task in_progress)
2. Alice views task detail
3. Delete button NOT visible (task is no longer open)

## Expected Results
- Open tasks: Delete button visible, deletion succeeds, task status → cancelled
- In-progress tasks: Delete button hidden
- Pending applications rejected on deletion
- Available balance freed after cancellation
