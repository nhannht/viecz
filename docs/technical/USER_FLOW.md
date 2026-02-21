# USER_FLOW.md - User Journey Documentation

> **Viecz** -- P2P task marketplace for university students.
>
> Last updated: 2026-02-20

### Platform Note

Viecz has two clients that share the same Go backend API:

| Platform | Technology | Navigation | Token Storage |
|----------|-----------|------------|---------------|
| **Android** | Kotlin + Jetpack Compose | Bottom tabs + NavHost | EncryptedSharedPreferences |
| **Web** | Angular 21 + Material 3 | Sticky navbar + Router | localStorage |

All user flows below apply to **both platforms** unless noted otherwise. The flows reference Android screen names (e.g., `LoginScreen.kt`); the web equivalents are Angular components in `web/src/app/` (e.g., `auth/login.component.ts`).

**Key differences:**
- **App launch**: Android has `SplashScreen` → token check. Web loads directly to `/login` or the last route (auth guard handles redirect).
- **Navigation**: Android uses bottom tabs (Home, Chat, Profile). Web uses a sticky top navbar (Marketplace, Wallet, Chat) with notifications menu and user menu.
- **Deep links**: Android uses `task_detail/{taskId}`. Web uses `/tasks/:id`.
- **Offline**: Android caches data in Room. Web has no offline support.

---

## Table of Contents

1. [App Launch & Authentication](#1-app-launch--authentication)
2. [Main Screen & Navigation](#2-main-screen--navigation)
3. [Browse & Search Tasks](#3-browse--search-tasks)
4. [Create Task (Requester)](#4-create-task-requester)
5. [Edit Task (Requester)](#5-edit-task-requester)
6. [Apply for Task (Tasker)](#6-apply-for-task-tasker)
7. [Accept Application & Escrow Payment](#7-accept-application--escrow-payment)
8. [Task Completion & Payment Release](#8-task-completion--payment-release)
9. [Task Deletion / Cancellation](#9-task-deletion--cancellation)
10. [Chat Messaging](#10-chat-messaging)
11. [Wallet & Deposits](#11-wallet--deposits)
12. [Profile & Become Tasker](#12-profile--become-tasker)
13. [Notifications](#13-notifications)
14. [My Jobs](#14-my-jobs)
15. [Full Job Lifecycle (End-to-End)](#15-full-job-lifecycle-end-to-end)
16. [State Machines](#16-state-machines)

---

## 1. App Launch & Authentication

### 1.1 Launch Flow

```
App Opens
    |
    v
SplashScreen (1s delay)
    |
    +-- Has valid JWT? --YES--> MainScreen
    |
    +-- No token? ------NO---> LoginScreen
```

**Screen:** `SplashScreen.kt` -- Shows "Viecz" branding, checks `TokenManager.isLoggedIn`.

### 1.2 Registration

```
LoginScreen
    |
    v
Tap "Don't have an account? Register"
    |
    v
RegisterScreen
    |  Fields:
    |    - Full Name (required)
    |    - Email (validated format)
    |    - Password (min 8 chars, uppercase, lowercase, digit)
    |
    v
Tap "Register"
    |
    v
POST /api/v1/auth/register
    |
    v
JWT tokens saved --> MainScreen
```

**Screen:** `RegisterScreen.kt`
**API:** `POST /api/v1/auth/register` -- `{ email, password, name }`
**Response:** `{ access_token, refresh_token, user }`

### 1.3 Login

```
LoginScreen
    |  Fields:
    |    - Email
    |    - Password
    |
    v
Tap "Login"
    |
    v
POST /api/v1/auth/login
    |
    v
JWT tokens saved --> MainScreen
```

**Screen:** `LoginScreen.kt`
**API:** `POST /api/v1/auth/login` -- `{ email, password }`

### 1.4 Google OAuth Login

```
LoginScreen
    |
    v
Tap "Sign in with Google"
    |
    v
Google Sign-In SDK launches Google account picker
    |
    v
User selects Google account and grants consent
    |
    v
Google returns ID token to the app
    |
    v
POST /api/v1/auth/google  { id_token }
    |
    v
Server-side:
    1. Verify ID token with Google OIDC provider
    2. Extract user info (email, name, avatar, Google ID)
    3. Look up user by Google ID:
       - Existing user: update profile (name, avatar) if changed, return JWT
       - New user: create account (auth_provider="google", email_verified=true), return JWT
    4. If email already used by email-based account: reject (409 conflict)
    |
    v
JWT tokens saved --> MainScreen
```

**Screen:** `LoginScreen.kt`
**API:** `POST /api/v1/auth/google` -- `{ id_token }`
**Response:** `{ access_token, refresh_token, user }`
**Notes:**
- Google users do not have a password; `PasswordHash` is null
- `AuthProvider` field is set to `"google"` (vs `"email"` for regular accounts)
- `EmailVerified` is automatically `true` (Google pre-verifies emails)
- If a Google user's name or avatar changes on Google's side, it is updated on next login

### 1.5 Logout

```
ProfileContent (Profile tab or standalone ProfileScreen)
    |
    v
Tap "Logout" --> Confirmation dialog
    |
    v
Tap "Logout" (confirm) --> Clear tokens --> LoginScreen
```

---

## 2. Main Screen & Navigation

`MainScreen.kt` is the primary container after login. It provides a bottom navigation bar and a shared top bar.

### 2.1 Bottom Navigation Tabs

| Tab Index | Label       | Icon                  | Content                  |
|-----------|-------------|-----------------------|--------------------------|
| 0         | Marketplace | Home                  | `HomeContent` -- task list |
| 1         | Profile     | Person                | `ProfileContent` -- user profile |
| 2         | Messages    | Chat                  | `ConversationListContent` -- conversations |
| 3         | Wallet      | AccountBalanceWallet  | `WalletContent` -- balance & history |

### 2.2 Top Bar Actions (Context-Sensitive)

| Tab         | Actions                                  |
|-------------|------------------------------------------|
| Marketplace | Search toggle, Add Job (+), Notifications |
| Wallet      | Deposit (+), Notifications               |
| Others      | Notifications only                       |

### 2.3 Navigation Routes

```
NavigationRoutes (Navigation.kt):

splash ---------> login | main
login ----------> register | main
register -------> main
main -----------> (tabs: HomeContent, ProfileContent, ConversationListContent, WalletContent)

From MainScreen:
  create_task ------------> task_detail/{taskId}
  task_detail/{taskId} ---> apply_task/{taskId}/{price} | edit_task/{taskId} | chat/{conversationId}
  profile (standalone) ---> my_jobs/{mode}
  notifications ----------> task_detail/{taskId}
  chat/{conversationId}
  wallet (standalone)
  my_jobs/{mode} ---------> task_detail/{taskId}
```

---

## 3. Browse & Search Tasks

```
MainScreen > Marketplace tab (tab 0)
    |
    v
HomeContent loads tasks via TaskListViewModel
    |
    +-- Category filter chips (LazyRow)
    |     All | Viec nha | Van chuyen | Day kem | ...
    |
    +-- Search bar (toggle via top bar Search icon)
    |     Type query --> taskListViewModel.searchTasks(query)
    |
    +-- Task list (LazyColumn, paginated, pull-to-refresh)
    |     Each TaskCard shows: title, price, location, status
    |     Own tasks (requesterId == currentUserId) show "Your Task" badge
    |
    v
Tap TaskCard --> navigate to task_detail/{taskId}
```

**Screen:** `HomeScreen.kt` (`HomeContent` composable)
**API:** `GET /api/v1/tasks?page=N&category_id=X&search=Q`
**Features:** Infinite scroll (`loadMore()`), pull-to-refresh, shimmer loading, own-task indicator

**Auto-refresh:** The marketplace uses `repeatOnLifecycle(Lifecycle.State.RESUMED)` to automatically refresh the task list whenever the user returns to the Marketplace tab (e.g., after navigating back from task detail). This ensures that tasks whose status changed (e.g., moved to `in_progress` after accepting an application) disappear from the marketplace list without manual refresh.

---

## 4. Create Task (Requester)

```
MainScreen > Tap "Add Job" (+) in top bar
    |
    v
CreateTaskScreen
    |  Required fields:
    |    - Task Title
    |    - Description (4-8 lines)
    |    - Category (dialog picker from server list)
    |    - Price (VND, numeric)
    |    - Location
    |
    v
Tap "Create Task"
    |
    v
POST /api/v1/tasks
    |
    v
Navigate to TaskDetailScreen (new task)
+ MainScreen refresh triggered via savedStateHandle
```

**Screen:** `CreateTaskScreen.kt`
**API:** `POST /api/v1/tasks` -- `{ title, description, category_id, price, location }`
**Validation:** Client-side field errors shown inline

---

## 5. Edit Task (Requester)

```
TaskDetailScreen (requester view, task status == OPEN)
    |
    v
Top bar shows pencil icon (edit button) next to trash icon
    Visible only when: isOwnTask == true && task.status == "open"
    |
    v
Tap pencil icon
    |
    v
Navigate to CreateTaskScreen in edit mode (edit_task/{taskId})
    |
    v
CreateTaskScreen (edit mode):
    - TopAppBar title: "Edit Task"
    - All fields pre-populated from existing task data
    - Submit button text: "Save Changes"
    |
    v
Tap "Save Changes"
    |
    v
PUT /api/v1/tasks/:id
    |
    v
Navigate back to TaskDetailScreen (task refreshed)
```

**Screen:** `CreateTaskScreen.kt` (reused with `taskId` parameter)
**Route:** `edit_task/{taskId}`
**API:** `PUT /api/v1/tasks/:id` -- `{ title, description, category_id, price, location, deadline }`
**Conditions:** Only the task owner can edit; task must be in OPEN status

---

## 6. Apply for Task (Tasker)

```
TaskDetailScreen (task with status OPEN)
    |
    +-- Own task (requesterId == currentUserId): Apply section hidden
    |
    +-- Non-tasker user (!isTasker): "Register as Tasker" CTA card
    |     Navigates to Profile screen to become a tasker
    |
    +-- Task NOT yet applied: "Apply for this Task" button
    |   |
    |   v
    |   Navigate to ApplyTaskScreen with (taskId, task.price)
    |     Fields:
    |       - Proposed Price (optional, defaults to task price)
    |       - Message (optional, max 500 chars)
    |     |
    |     v
    |     Tap "Submit Application"
    |     POST /api/v1/tasks/{id}/applications
    |     |
    |     v
    |     Navigate back to TaskDetailScreen
    |
    +-- Already applied: Shows "Application Pending" badge
```

**Screens:** `TaskDetailScreen.kt`, `ApplyTaskScreen.kt`
**Navigation:** `TaskDetailScreen` passes `(taskId, task.price)` to `Navigation.kt`, which routes to `apply_task/{taskId}/{price}`. The price is used as the default value for the Proposed Price field.
**API:** `POST /api/v1/tasks/{id}/applications` -- `{ proposed_price?, message? }`
**Condition:** User must be a tasker (`user.isTasker == true`)

---

## 7. Accept Application & Escrow Payment

This is triggered by the task requester (poster) on the TaskDetailScreen.

```
TaskDetailScreen (requester view, task OPEN, has applications)
    |
    v
Applications section shows list of ApplicationCards:
    Each card displays:
      - Tasker ID
      - Application status badge (Pending/Accepted/Rejected)
      - Message (if any)
      - Proposed price (if different from task price)
      - "Accept Application" button (if PENDING)
    |
    v
Tap "Accept Application"
    |
    v
Confirmation dialog:
    "Accept Application & Create Payment"
    Shows escrow amount (proposed price or task price)
    |
    v
Tap "Accept"
    |
    v
Android makes two sequential API calls:
    Step 1: POST /api/v1/applications/{id}/accept
      - Application status --> ACCEPTED
      - Other applications --> REJECTED
      - Tasker assigned to task
    Step 2: POST /api/v1/payments/escrow
      - Escrow payment created (deducts from requester wallet)
      - Task status --> IN_PROGRESS
    |
    v
Snackbar: "Payment processed successfully!"
TaskDetailScreen refreshes (shows IN_PROGRESS status)
```

**Screen:** `TaskDetailScreen.kt` (accept dialog)
**APIs:** `POST /api/v1/applications/{id}/accept` then `POST /api/v1/payments/escrow`
**Key detail:** Escrow amount = proposed_price (if set) OR task.price

---

## 8. Task Completion & Payment Release

```
TaskDetailScreen (task IN_PROGRESS, requester view)
    |
    +-- "Message" button (navigate to chat)
    +-- "Mark as Completed" button
    |
    v
Tap "Mark as Completed"
    |
    v
Android makes two sequential API calls:
    Step 1: POST /api/v1/payments/release
      - Escrow released to tasker wallet (minus platform fee)
      - Platform fee deducted
    Step 2: POST /api/v1/tasks/{taskId}/complete
      - Task status --> COMPLETED
    |
    v
Task status badge shows "Completed"
```

**Screen:** `TaskDetailScreen.kt`
**APIs:** `POST /api/v1/payments/release` then `POST /api/v1/tasks/{taskId}/complete`
**Payment split:** Tasker receives escrow amount (platform fee may apply)

---

## 9. Task Deletion / Cancellation

The task requester can delete (soft-cancel) their own open task from the TaskDetailScreen.

```
TaskDetailScreen (requester view, task status == OPEN)
    |
    v
Top bar shows trash icon (delete button)
    Visible only when: isOwnTask == true && task.status == "open"
    |
    v
Tap trash icon
    |
    v
Confirmation dialog:
    "Are you sure you want to delete this task?"
    [Cancel]  [Delete]
    |
    v
Tap "Delete"
    |
    v
DELETE /api/v1/tasks/:id
    |
    v
Server-side effects:
    1. Task status --> CANCELLED (soft delete)
    2. All pending applications --> REJECTED
    3. Applicants notified (task_cancelled notification)
    |
    v
Navigate back to marketplace (HomeContent)
```

**Screen:** `TaskDetailScreen.kt` (trash icon in top bar + confirmation dialog)
**API:** `DELETE /api/v1/tasks/:id`
**Conditions:** Only the task owner can delete; task must be in OPEN status (no escrow to refund)

---

## 10. Chat Messaging

### 9.1 Opening a Chat

```
TaskDetailScreen (task IN_PROGRESS)
    |
    v
Tap "Message" button
    |
    v
TaskDetailViewModel.getOrCreateConversation()
    POST /api/v1/conversations (if new)
    |
    v
Navigate to ChatScreen (chat/{conversationId})
```

### 9.2 Chat Screen

```
ChatScreen
    |
    v
Load message history: GET /api/v1/conversations/{id}/messages
    |
    v
Connect WebSocket: ws://{host}/api/v1/ws?token=JWT
    Send: {"type":"join", "conversationId": N}
    |
    v
Connection status shown in top bar:
    Connected (green) | Connecting... | Disconnected | Error
    |
    v
Send message:
    Type text --> Tap send FAB
    WebSocket sends: {"type":"message", "conversationId":N, "content":"..."}
    Message appears as right-aligned bubble (sent)
    |
    v
Receive message:
    WebSocket delivers broadcast
    Message appears as left-aligned bubble (received) with sender name
    |
    v
Typing indicator:
    Text input onChange --> viewModel.sendTypingIndicator()
    Other user sees animated dots
    |
    v
Task finished (COMPLETED/CANCELLED):
    Chat input replaced with "This task is completed/cancelled. Chat is closed."
```

**Screen:** `ChatScreen.kt`
**WebSocket:** `/api/v1/ws?token=JWT`
**Message types:** `join`, `joined`, `message`, `message_sent`, `typing`, `read`

### 9.3 Conversation List

```
MainScreen > Messages tab (tab 2)
    |
    v
ConversationListContent
    GET /api/v1/conversations
    |
    v
Each ConversationCard shows:
    - Other user name + icon
    - Task title
    - Last message preview
    - Timestamp
    - Dimmed appearance if task completed/cancelled
    |
    v
Tap card --> ChatScreen (chat/{conversationId})
```

**Screen:** `ConversationListScreen.kt`

---

## 11. Wallet & Deposits

### 10.1 Viewing Wallet

```
MainScreen > Wallet tab (tab 3)
    |
    v
WalletContent
    |
    +-- Balance card:
    |     - Available Balance
    |     - In Escrow
    |     - Total Earned
    |     - Total Spent
    |
    +-- Transaction history (list):
          Each item: description, type, amount (+/-), balance after, timestamp
```

**Screen:** `WalletScreen.kt` (`WalletContent` composable)
**APIs:**
- `GET /api/v1/wallet`
- `GET /api/v1/wallet/transactions`

### 10.2 Deposit Flow (PayOS)

```
Wallet tab > Tap Deposit (+) in top bar
    |
    v
DepositDialog
    Fields:
      - Amount (VND, min 2000)
      - Description (default: "Wallet deposit")
    |
    v
Tap "Deposit"
    POST /api/v1/wallet/deposit
    |
    v
Server returns PayOS checkout URL
    |
    v
Open browser (ACTION_VIEW intent)
    User completes payment in PayOS
    |
    v
PayOS webhook fires to server
    Server credits wallet
    |
    v
Return to app (lifecycle RESUMED triggers refresh)
    Balance updated
```

**Screen:** `WalletScreen.kt` (`DepositDialog`)
**API:** `POST /api/v1/wallet/deposit` -- `{ amount, description }`
**Constraint:** Max wallet balance = 200,000 VND for deposits (earnings bypass limit)
**Test server:** Mock PayOS auto-fires webhook after 100ms

### 10.3 Transaction Types

| Type              | Direction | Description                         |
|-------------------|-----------|-------------------------------------|
| `DEPOSIT`         | +         | Funds added via PayOS               |
| `WITHDRAWAL`      | -         | Withdraw to bank (not yet implemented) |
| `ESCROW_HOLD`     | -         | Funds locked when accepting application |
| `ESCROW_RELEASE`  | +         | Escrow paid to tasker on completion  |
| `ESCROW_REFUND`   | +         | Escrow returned on cancellation     |
| `PAYMENT_RECEIVED`| +         | Payment credited to tasker           |
| `PLATFORM_FEE`    | -         | Platform commission deducted         |

---

## 12. Profile & Become Tasker

### 11.1 Profile View

```
MainScreen > Profile tab (tab 1)
    |
    v
ProfileContent
    GET /api/v1/users/me
    |
    +-- Header card: name, email, "Tasker" badge (if isTasker)
    +-- Statistics: rating, completed, posted
    +-- Account info: email, university, verified status
    +-- My Jobs section:
    |     - My Posted Jobs --> my_jobs/posted
    |     - My Applied Jobs --> my_jobs/applied
    |     - My Completed Jobs --> my_jobs/completed
    +-- "Become a Tasker" button (if !isTasker)
    +-- "Logout" button
```

**Screen:** `ProfileScreen.kt` (`ProfileContent` composable, used both in tab and standalone)

### 11.2 Become Tasker

```
Profile tab > Tap "Become a Tasker"
    |
    v
Confirmation dialog:
    "Do you want to register as a tasker?"
    |
    v
Tap "Yes, Register"
    POST /api/v1/users/become-tasker
    |
    v
user.isTasker = true
Snackbar: "You are now registered as a tasker!"
"Become a Tasker" button disappears, "Tasker" badge appears
```

**API:** `POST /api/v1/users/become-tasker`
**Note:** Current implementation is a simple toggle (no bio/skills form required).

### 11.3 Edit Profile

```
Profile tab > Tap "Edit Profile" (pencil icon)
    |
    v
EditProfileScreen / Web profile edit form
    |  Pre-filled with current data from GET /api/v1/users/me
    |
    +-- Editable fields:
    |     - Name (text)
    |     - Bio (text, optional)
    |     - Phone (text, optional)
    |
    +-- Avatar upload:
    |     Tap avatar circle > Image picker
    |     POST /api/v1/users/me/avatar (multipart/form-data, field: "avatar")
    |       - Max 5MB, JPEG/PNG/WebP only (validated via magic bytes)
    |       - Old avatar deleted server-side on successful upload
    |       - Returns updated user with new avatar_url
    |
    v
Tap "Save"
    PUT /api/v1/users/me  { name?, bio?, phone?, avatar_url? }
    |
    v
Profile refreshed with updated data
Snackbar: "Profile updated"
```

**Android:** `EditProfileScreen.kt` — standalone screen navigated from ProfileScreen
**Web:** `profile.component.ts` — inline edit mode within profile page
**API:** `PUT /api/v1/users/me` (profile fields), `POST /api/v1/users/me/avatar` (image upload)

---

## 13. Notifications

```
MainScreen > Tap notification bell in top bar
    |
    v
NotificationScreen
    |
    +-- Notification list (server-fetched + locally cached):
    |     GET /api/v1/notifications
    |     Each item: icon (by type), title, message, relative time
    |     Unread items highlighted
    |
    +-- Real-time delivery via WebSocket:
    |     ws://{host}/api/v1/ws?token=JWT
    |     Server pushes new notifications instantly
    |
    +-- Local Room cache (NotificationEntity) for offline access
    |
    +-- Top bar actions: Mark all read, Clear all
    |
    v
Tap notification --> Mark as read + navigate to task_detail/{taskId}
```

**Screen:** `NotificationScreen.kt`
**Storage:** Server-fetched via REST API (`GET /api/v1/notifications`), real-time delivery via WebSocket, local Room cache (`NotificationEntity`) for offline access
**Types:** `task_created`, `application_received`, `application_accepted`, `application_rejected`, `task_completed`, `payment_received`, `task_cancelled`
**Badge:** Unread count shown on notification bell icon across all tabs

---

## 14. My Jobs

```
Profile > Tap "My Posted Jobs" / "My Applied Jobs" / "My Completed Jobs"
    |
    v
MyJobsScreen (mode = "posted" | "applied" | "completed")
    |
    +-- posted: GET /api/v1/tasks?requester_id={userId}
    +-- applied: GET /api/v1/tasks?tasker_id={userId}&status=in_progress
    +-- completed: GET /api/v1/tasks?tasker_id={userId}&status=completed
    |
    v
Task list (paginated, pull-to-refresh)
    Tap task --> task_detail/{taskId}
```

**Screen:** `MyJobsScreen.kt`
**Route:** `my_jobs/{mode}` where mode is `posted`, `applied`, or `completed`

---

## 15. Full Job Lifecycle (End-to-End)

This is the complete happy-path flow tested by `S13_FullJobLifecycleE2ETest`:

```
REQUESTER (Alice)                          TASKER (Bob)
================                           ===========

1. Register                                5. Register
2. Deposit 200k VND                        6. Become Tasker
3. Create task (100k VND)                  7. Apply for task
4. Logout                                  8. Logout

9. Login
10. Accept application
    (escrow: 100k deducted)
11. Mark as Completed
    (release: 90k to Bob, 10k fee)

12. Verify wallet = 100k                   13. Login & verify wallet = 90k
```

### Financial Summary

| Event                | Alice Wallet | Bob Wallet | Platform |
|----------------------|-------------|------------|----------|
| Alice deposits       | +200,000    | 0          | 0        |
| Escrow (accept)      | -100,000    | 0          | holds 100k |
| Task completed       | 0           | +90,000    | +10,000  |
| **Final**            | **100,000** | **90,000** | **10,000** |

### With Price Negotiation (S16)

When Bob proposes 90k instead of the task price 100k:
- Escrow uses proposed price (90k, not 100k)
- Alice wallet after escrow = 110k
- Bob receives 90k on completion

---

## 16. State Machines

### 16.1 Task Status

```
OPEN ---[accept application + escrow payment]--> IN_PROGRESS ---[complete]--> COMPLETED
  |                                                  |
  +---[DELETE /api/v1/tasks/:id (soft delete)]-->  CANCELLED
                                                     ^
  IN_PROGRESS ---[POST /payments/refund]-------------+
```

| Status       | Trigger                                          | Actions Taken                                               |
|--------------|--------------------------------------------------|-------------------------------------------------------------|
| OPEN         | Task created                                     | Visible to all, applications accepted                       |
| IN_PROGRESS  | Accept application + escrow payment               | Escrow created, other apps rejected, chat enabled           |
| COMPLETED    | Requester marks complete                         | Escrow released to tasker (minus platform fee)              |
| CANCELLED    | `DELETE /api/v1/tasks/:id` (soft delete, from OPEN) | Pending apps rejected, applicants notified                 |
| CANCELLED    | `POST /payments/refund` (from IN_PROGRESS)        | Escrow refunded to requester                                |

### 16.2 Application Status

```
PENDING ---[requester accepts]--> ACCEPTED
    |
    +---[other app accepted]---> REJECTED
```

### 16.3 Escrow Transaction Flow

```
Deposit (PayOS webhook) --> Wallet credited
    |
    v
Accept application --> ESCROW_HOLD (wallet debited, escrow balance increased)
    |
    v
Task completed --> ESCROW_RELEASE (escrow to tasker) + PLATFORM_FEE
    |
    OR
    v
Task cancelled --> ESCROW_REFUND (escrow returned to requester)
```

---

## Screen Reference

| Screen                     | File                          | Route                       |
|---------------------------|-------------------------------|-----------------------------|
| SplashScreen              | `SplashScreen.kt`             | `splash`                    |
| LoginScreen               | `LoginScreen.kt`              | `login`                     |
| RegisterScreen            | `RegisterScreen.kt`           | `register`                  |
| MainScreen                | `MainScreen.kt`               | `main` (4 tabs)             |
| HomeContent (Marketplace) | `HomeScreen.kt`               | Tab 0 of `main`             |
| ProfileContent            | `ProfileScreen.kt`            | Tab 1 of `main`             |
| ConversationListContent   | `ConversationListScreen.kt`   | Tab 2 of `main`             |
| WalletContent             | `WalletScreen.kt`             | Tab 3 of `main`             |
| TaskDetailScreen          | `TaskDetailScreen.kt`         | `task_detail/{taskId}`      |
| CreateTaskScreen          | `CreateTaskScreen.kt`         | `create_task`               |
| EditTaskScreen (reuses CreateTaskScreen) | `CreateTaskScreen.kt` | `edit_task/{taskId}`        |
| ApplyTaskScreen           | `ApplyTaskScreen.kt`          | `apply_task/{taskId}/{price}` |
| ChatScreen                | `ChatScreen.kt`               | `chat/{conversationId}`     |
| NotificationScreen        | `NotificationScreen.kt`       | `notifications`             |
| MyJobsScreen              | `MyJobsScreen.kt`             | `my_jobs/{mode}`            |
| ProfileScreen (standalone)| `ProfileScreen.kt`            | `profile`                   |
| WalletScreen (standalone) | `WalletScreen.kt`             | `wallet`                    |

All screen files are located in:
`android/app/src/main/java/com/viecz/vieczandroid/ui/screens/`

---

## E2E Test Coverage

| Test Class                          | Scenarios Covered                           |
|-------------------------------------|---------------------------------------------|
| `S01_AuthFlowE2ETest`              | Registration, login, splash redirect        |
| `S04_BrowseTasksE2ETest`           | Browse tasks, categories, task detail       |
| `S06_CreateTaskE2ETest`            | Task creation form and submission           |
| `S08_ProfileFlowE2ETest`           | Profile view, become tasker                 |
| `S13_FullJobLifecycleE2ETest`      | Full 2-user lifecycle (register through payment) |
| `S14_ChatMessagingE2ETest`         | Chat via WebSocket, message history         |
| `S15_MultiUserChatE2ETest`         | Multi-user chat with message exchange       |
| `S16_EscrowNegotiationE2ETest`     | Price negotiation, proposed price escrow    |
| `S17_WalletFlowE2ETest`            | Wallet deposit and balance display          |
| `S18_WalletBalanceLimitE2ETest`    | 200k max deposit limit, earnings bypass     |

Test files: `android/app/src/androidTest/java/com/viecz/vieczandroid/e2e/`
Scenario docs: `android/e2escenarios/`

---

**Last Updated:** 2026-02-18
**Version:** 2.5
