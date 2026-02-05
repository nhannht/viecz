# USER_FLOW.md - User Journey Documentation

> **Viecz - Dịch Vụ Nhỏ Cho Sinh Viên**
> Comprehensive user flow documentation for all major journeys in the P2P marketplace.
>
> Last updated: 2026-02-04

---

## Table of Contents

1. [Authentication Flow](#1-authentication-flow)
2. [Requester Flow](#2-requester-flow)
3. [Tasker Flow](#3-tasker-flow)
4. [Chat Flow](#4-chat-flow)
5. [Profile & Tasker Registration Flow](#5-profile--tasker-registration-flow)
6. [Wallet & Transaction Flow](#6-wallet--transaction-flow)
7. [Navigation Map](#7-navigation-map)
8. [State Transitions](#8-state-transitions)
9. [Error Cases & Recovery](#9-error-cases--recovery)
10. [User Stories](#10-user-stories)

---

## 1. Authentication Flow

### 1.1 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                              │
└─────────────────────────────────────────────────────────────────────────┘

                         ┌──────────────┐
                         │  Open App    │
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                    ┌────┤ Has JWT?     │────┐
                    │    └──────────────┘    │
                   YES                       NO
                    │                         │
                    ▼                         ▼
            ┌───────────────┐         ┌──────────────┐
            │ Verify Token  │         │  Login Page  │
            └───────┬───────┘         └──────┬───────┘
                    │                         │
              ┌─────┴─────┐                   │
              │           │                   │
             VALID      INVALID              │
              │           │                   │
              │           └───────────────────┤
              │                               │
              ▼                               ▼
       ┌─────────────┐              ┌────────────────┐
       │  Dashboard  │              │  Choose Login  │
       └─────────────┘              └────────┬───────┘
                                             │
                                ┌────────────┴────────────┐
                                │                         │
                                ▼                         ▼
                      ┌──────────────────┐      ┌────────────────┐
                      │  Zalo OAuth      │      │  Dev Login     │
                      │  (Production)    │      │  (DEBUG mode)  │
                      └─────────┬────────┘      └────────┬───────┘
                                │                         │
                                ▼                         ▼
                      ┌──────────────────┐      ┌────────────────┐
                      │ Zalo SDK Token   │      │  Enter Name    │
                      └─────────┬────────┘      └────────┬───────┘
                                │                         │
                                ▼                         │
                      ┌──────────────────┐               │
                      │ POST /auth/zalo  │               │
                      └─────────┬────────┘               │
                                │                         │
                                │                         ▼
                                │               ┌────────────────┐
                                │               │ POST /auth/    │
                                │               │   dev-login    │
                                │               └────────┬───────┘
                                │                         │
                                └─────────┬───────────────┘
                                          │
                                          ▼
                                ┌──────────────────┐
                                │  Receive JWT     │
                                │  - access_token  │
                                │  - refresh_token │
                                └─────────┬────────┘
                                          │
                                          ▼
                                ┌──────────────────┐
                                │ Store in         │
                                │ localStorage     │
                                └─────────┬────────┘
                                          │
                                          ▼
                                ┌──────────────────┐
                                │ Create/Update    │
                                │ User in DB       │
                                └─────────┬────────┘
                                          │
                                          ▼
                                ┌──────────────────┐
                                │ Create Wallet    │
                                │ (Mock Mode)      │
                                └─────────┬────────┘
                                          │
                                          ▼
                                ┌──────────────────┐
                                │ Redirect to      │
                                │   Dashboard      │
                                └──────────────────┘
```

### 1.2 Detailed Steps

#### **Zalo OAuth Flow (Production)**

1. **User Action**: Click "Đăng nhập bằng Zalo"
2. **Frontend**: Call `zmp-sdk.getAccessToken()`
3. **Frontend**: Send access token to backend
   - **API**: `POST /api/v1/auth/zalo`
   - **Request**: `{ access_token: string }`
4. **Backend**: Verify token with Zalo API
   - **External**: `GET https://graph.zalo.me/v2.0/me`
   - **Headers**:
     - `access_token: <token>`
     - `appsecret_proof: HMAC-SHA256(token, app_secret)`
5. **Backend**: Extract user info (zalo_id, name, avatar)
6. **Backend**: Find or create user in database
7. **Backend**: Create JWT tokens (access + refresh)
8. **Backend**: Send notification "Welcome"
9. **Backend**: Return tokens
   - **Response**: `{ access_token, refresh_token, expires_in }`
10. **Frontend**: Store tokens in localStorage
11. **Frontend**: Update auth state (Jotai)
12. **Frontend**: Redirect to home (`/`)

#### **Dev Login Flow (DEBUG mode)**

1. **User Action**: Click "Đăng nhập cho nhà phát triển"
2. **User Action**: Enter name in input
3. **Frontend**: Send name to backend
   - **API**: `POST /api/v1/auth/dev-login?name={name}`
4. **Backend**: Generate unique zalo_id (`dev_<uuid>`)
5. **Backend**: Create test user
6. **Backend**: Create wallet with initial balance (1,000,000 VND)
7. **Backend**: Create JWT tokens
8. **Backend**: Return tokens
9. **Frontend**: Store and redirect (same as Zalo flow)

### 1.3 Pages Involved

| Page | Path | Purpose |
|------|------|---------|
| LoginPage | `/login` | Login UI with both options |
| HomePage | `/` | Redirect destination after login |

### 1.4 API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/auth/zalo` | POST | No | Zalo OAuth login |
| `/auth/dev-login` | POST | No | Dev login (DEBUG only) |
| `/auth/refresh` | POST | No | Refresh JWT tokens |
| `/auth/logout` | POST | Yes | Logout (stateless) |

### 1.5 State Changes

- **localStorage**: Store `access_token`, `refresh_token`
- **Jotai**: Update `userAtom` with user data
- **Database**: Create/update User record
- **Database**: Create Wallet record (dev login)

### 1.6 Error Cases

| Error | Cause | Recovery |
|-------|-------|----------|
| Invalid Zalo token | Token expired/invalid | Show error, retry login |
| Zalo API unavailable | Network/service down | Show error, allow dev login |
| Database error | DB connection failure | Show error, retry |
| Missing DEBUG flag | Dev login in production | Hide dev login button |

---

## 2. Requester Flow

### 2.1 Complete Requester Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          REQUESTER FLOW                                  │
│        (Post Task → Review Applications → Pay → Complete → Review)      │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │  Dashboard   │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Click "Đăng  │
    │  công việc"  │
    └──────┬───────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: CREATE TASK                                                      │
└──────────────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ /tasks/create    │
    │                  │
    │ Fill Form:       │
    │ - Title*         │
    │ - Description    │
    │ - Price* (VND)   │
    │ - Negotiable?    │
    │ - Category*      │
    │ - Location       │
    │ - Deadline       │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Click "Đăng"     │
    │ POST /tasks      │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Task Created     │
    │ Status: OPEN     │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Notifications    │
    │ sent to Taskers  │
    │ (new task alert) │
    └──────┬───────────┘
           │
┌──────────┴────────────────────────────────────────────────────────────────┐
│ PHASE 2: REVIEW APPLICATIONS                                               │
└────────────────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ Taskers Apply    │
    │ (Applications    │
    │  arrive)         │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Notification:    │
    │ "Có người ứng    │
    │  tuyển"          │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ /tasks/:id       │
    │ View Task        │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ View Applications│
    │ - Tasker profile │
    │ - Rating         │
    │ - Proposed price │
    │ - Message        │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Select Best      │
    │ Applicant        │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Click "Chấp nhận"│
    │ POST /tasks/:id/ │
    │   accept/:app_id │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Task Updated:    │
    │ - Status: ACCEPTED│
    │ - tasker_id set  │
    │ - price updated  │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Other applications│
    │ auto-rejected    │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Notifications:   │
    │ - Accepted tasker│
    │ - Rejected taskers│
    └──────┬───────────┘
           │
┌──────────┴────────────────────────────────────────────────────────────────┐
│ PHASE 3: PAYMENT (ESCROW)                                                  │
└────────────────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ /tasks/:id       │
    │ "Thanh toán"     │
    │ button appears   │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Click "Thanh toán"│
    │ POST /payments/  │
    │      create      │
    └──────┬───────────┘
           │
           ▼
    ┌─────────────────────────────────────────┐
    │  MOCK MODE?                             │
    └─────┬───────────────────────┬───────────┘
         YES                     NO
          │                       │
          ▼                       ▼
   ┌──────────────┐      ┌─────────────────┐
   │ Deduct from  │      │ ZaloPay Order   │
   │ user wallet  │      │ Created         │
   └──────┬───────┘      └─────────┬───────┘
          │                        │
          │                        ▼
          │              ┌─────────────────┐
          │              │ Redirect to     │
          │              │ ZaloPay payment │
          │              └─────────┬───────┘
          │                        │
          │                        ▼
          │              ┌─────────────────┐
          │              │ User pays       │
          │              │ in ZaloPay app  │
          │              └─────────┬───────┘
          │                        │
          │                        ▼
          │              ┌─────────────────┐
          │              │ Callback to     │
          │              │ /payments/      │
          │              │   callback      │
          │              └─────────┬───────┘
          │                        │
          └────────────┬───────────┘
                       │
                       ▼
            ┌──────────────────┐
            │ Transaction:     │
            │ - Type: ESCROW   │
            │ - Status: SUCCESS│
            │ - Money in escrow│
            └──────┬───────────┘
                   │
                   ▼
            ┌──────────────────┐
            │ Task Status:     │
            │ IN_PROGRESS      │
            └──────┬───────────┘
                   │
                   ▼
            ┌──────────────────┐
            │ Notification:    │
            │ "Payment sent"   │
            │ (to requester)   │
            └──────┬───────────┘
                   │
┌──────────────────┴────────────────────────────────────────────────────────┐
│ PHASE 4: WORK & COMMUNICATION                                              │
└────────────────────────────────────────────────────────────────────────────┘
                   │
                   ▼
            ┌──────────────────┐
            │ Tasker performs  │
            │ the work         │
            └──────┬───────────┘
                   │
                   ▼
            ┌──────────────────┐
            │ Chat available:  │
            │ /messages/:taskId│
            └──────┬───────────┘
                   │
                   ▼
            ┌──────────────────┐
            │ WebSocket        │
            │ connection       │
            │ Real-time chat   │
            └──────┬───────────┘
                   │
┌──────────────────┴────────────────────────────────────────────────────────┐
│ PHASE 5: COMPLETION                                                        │
└────────────────────────────────────────────────────────────────────────────┘
                   │
                   ▼
            ┌──────────────────┐
            │ Tasker notifies  │
            │ work complete    │
            └──────┬───────────┘
                   │
                   ▼
            ┌──────────────────┐
            │ Requester verifies│
            └──────┬───────────┘
                   │
                   ▼
            ┌──────────────────┐
            │ Click "Hoàn thành"│
            │ POST /tasks/:id/ │
            │      complete    │
            └──────┬───────────┘
                   │
                   ▼
            ┌──────────────────┐
            │ Task Status:     │
            │ COMPLETED        │
            │ completed_at set │
            └──────┬───────────┘
                   │
                   ▼
            ┌──────────────────┐
            │ Notification:    │
            │ "Task completed" │
            │ (to tasker)      │
            └──────┬───────────┘
                   │
┌──────────────────┴────────────────────────────────────────────────────────┐
│ PHASE 6: RELEASE PAYMENT                                                   │
└────────────────────────────────────────────────────────────────────────────┘
                   │
                   ▼
            ┌──────────────────┐
            │ "Giải ngân"      │
            │ button appears   │
            └──────┬───────────┘
                   │
                   ▼
            ┌──────────────────┐
            │ Click "Giải ngân"│
            │ POST /payments/  │
            │   release/:taskId│
            └──────┬───────────┘
                   │
                   ▼
            ┌──────────────────┐
            │ Calculate split: │
            │ - Platform: 10%  │
            │ - Tasker: 90%    │
            └──────┬───────────┘
                   │
                   ▼
            ┌──────────────────┐
            │ Release funds:   │
            │ - To tasker wallet│
            │ - To platform    │
            └──────┬───────────┘
                   │
                   ▼
            ┌──────────────────┐
            │ Transaction:     │
            │ - Type: RELEASE  │
            │ - Status: SUCCESS│
            └──────┬───────────┘
                   │
                   ▼
            ┌──────────────────┐
            │ Update totals:   │
            │ - tasker.earnings│
            │ - tasker.completed│
            └──────┬───────────┘
                   │
                   ▼
            ┌──────────────────┐
            │ Notification:    │
            │ "Payment received"│
            │ (to tasker)      │
            └──────┬───────────┘
                   │
┌──────────────────┴────────────────────────────────────────────────────────┐
│ PHASE 7: REVIEW (OPTIONAL)                                                 │
└────────────────────────────────────────────────────────────────────────────┘
                   │
                   ▼
            ┌──────────────────┐
            │ Review form      │
            │ appears          │
            └──────┬───────────┘
                   │
                   ▼
            ┌──────────────────┐
            │ Rate tasker:     │
            │ - Stars (1-5)    │
            │ - Comment        │
            └──────┬───────────┘
                   │
                   ▼
            ┌──────────────────┐
            │ POST /reviews    │
            └──────┬───────────┘
                   │
                   ▼
            ┌──────────────────┐
            │ Update tasker    │
            │ rating (avg)     │
            └──────┬───────────┘
                   │
                   ▼
            ┌──────────────────┐
            │ Done!            │
            └──────────────────┘
```

### 2.2 Pages Involved

| Page | Path | Purpose |
|------|------|---------|
| HomePage | `/` | Entry point, quick actions |
| CreateTaskPage | `/tasks/create` | Task creation form |
| TaskDetailPage | `/tasks/:id` | View task, applications, actions |
| ChatPage | `/messages/:taskId` | Communicate with tasker |
| MyTasksPage | `/my-tasks` | View posted tasks |

### 2.3 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/tasks` | POST | Create task |
| `/tasks/:id` | GET | Get task details |
| `/tasks/:id` | PUT | Update task |
| `/tasks/:id/applications` | GET | View applications |
| `/tasks/:id/accept/:app_id` | POST | Accept application |
| `/tasks/:id/complete` | POST | Mark complete |
| `/payments/create` | POST | Create escrow |
| `/payments/release/:task_id` | POST | Release payment |

### 2.4 State Transitions

**Task Status Flow:**
```
OPEN → ACCEPTED → IN_PROGRESS → COMPLETED
  │
  └──→ CANCELLED
```

**Transaction Status Flow:**
```
ESCROW (PENDING) → SUCCESS → RELEASED
```

---

## 3. Tasker Flow

### 3.1 Complete Tasker Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TASKER FLOW                                    │
│      (Browse → Apply → Get Accepted → Work → Get Paid → Review)        │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │  Dashboard   │
    └──────┬───────┘
           │
┌──────────┴────────────────────────────────────────────────────────────────┐
│ PHASE 1: BECOME TASKER (First Time)                                       │
└────────────────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ Not a tasker yet?│
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ /profile         │
    │ Click "Trở thành │
    │  Tasker"         │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ /profile/tasker  │
    │                  │
    │ Fill form:       │
    │ - Bio (10-500)   │
    │ - Skills (array) │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ POST /users/     │
    │   become-tasker  │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ User.is_tasker   │
    │ = true           │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Notification:    │
    │ "You're now a    │
    │  tasker!"        │
    └──────┬───────────┘
           │
┌──────────┴────────────────────────────────────────────────────────────────┐
│ PHASE 2: BROWSE TASKS                                                      │
└────────────────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ /tasks           │
    │ Browse open tasks│
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Use filters:     │
    │ - Category       │
    │ - Price range    │
    │ - Search keyword │
    │ - Sort by price  │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ GET /tasks?      │
    │   status=open    │
    │   category=...   │
    │   min_price=...  │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ View task cards  │
    │ - Title          │
    │ - Price          │
    │ - Location       │
    │ - Requester      │
    └──────┬───────────┘
           │
┌──────────┴────────────────────────────────────────────────────────────────┐
│ PHASE 3: APPLY FOR TASK                                                    │
└────────────────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ Click task       │
    │ /tasks/:id       │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Read full details│
    │ - Description    │
    │ - Requirements   │
    │ - Deadline       │
    │ - Requester info │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Click "Ứng tuyển"│
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Application form:│
    │ - Message        │
    │ - Proposed price │
    │   (optional)     │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ POST /tasks/:id/ │
    │      apply       │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Application      │
    │ Status: PENDING  │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Notification to  │
    │ requester        │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Wait for response│
    └──────┬───────────┘
           │
┌──────────┴────────────────────────────────────────────────────────────────┐
│ PHASE 4: GET ACCEPTED                                                      │
└────────────────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ Requester reviews│
    │ and accepts      │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Notification:    │
    │ "Đơn của bạn đã  │
    │  được chấp nhận" │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Application      │
    │ Status: ACCEPTED │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Task.tasker_id = │
    │ current_user.id  │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ View in /my-tasks│
    │ "Assigned" tab   │
    └──────┬───────────┘
           │
┌──────────┴────────────────────────────────────────────────────────────────┐
│ PHASE 5: WAIT FOR PAYMENT                                                  │
└────────────────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ Requester pays   │
    │ (escrow)         │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Task Status:     │
    │ IN_PROGRESS      │
    └──────┬───────────┘
           │
┌──────────┴────────────────────────────────────────────────────────────────┐
│ PHASE 6: PERFORM WORK                                                      │
└────────────────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ Do the work      │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Chat with        │
    │ requester        │
    │ /messages/:taskId│
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Update progress  │
    │ via chat         │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Complete work    │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Notify requester │
    │ via chat         │
    └──────┬───────────┘
           │
┌──────────┴────────────────────────────────────────────────────────────────┐
│ PHASE 7: GET PAID                                                          │
└────────────────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ Requester marks  │
    │ task complete    │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Notification:    │
    │ "Task completed" │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Requester releases│
    │ payment          │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Payment split:   │
    │ Platform: 10%    │
    │ Tasker: 90%      │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Funds added to   │
    │ tasker wallet    │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Notification:    │
    │ "Payment received│
    │  X VND"          │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ User stats update│
    │ - total_earnings │
    │ - tasks_completed│
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ View in /wallet  │
    └──────┬───────────┘
           │
┌──────────┴────────────────────────────────────────────────────────────────┐
│ PHASE 8: REVIEW (OPTIONAL)                                                 │
└────────────────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ Review requester │
    │ - Stars (1-5)    │
    │ - Comment        │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ POST /reviews    │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Done!            │
    └──────────────────┘
```

### 3.2 Pages Involved

| Page | Path | Purpose |
|------|------|---------|
| TaskerProfilePage | `/profile/tasker` | Become tasker |
| TasksPage | `/tasks` | Browse available tasks |
| TaskDetailPage | `/tasks/:id` | View & apply |
| MyTasksPage | `/my-tasks` | View assigned tasks |
| ChatPage | `/messages/:taskId` | Communicate |
| WalletPage | `/wallet` | View earnings |

### 3.3 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/users/become-tasker` | POST | Register as tasker |
| `/tasks` | GET | List tasks (filter status=open) |
| `/tasks/:id` | GET | Task details |
| `/tasks/:id/apply` | POST | Apply for task |
| `/tasks/my-assigned` | GET | My assigned tasks |
| `/wallet/balance` | GET | Check earnings |

### 3.4 State Transitions

**Application Status:**
```
PENDING → ACCEPTED
   │
   └──→ REJECTED
```

---

## 4. Chat Flow

### 4.1 WebSocket Chat Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CHAT FLOW                                     │
│            (Real-time messaging with WebSocket)                         │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ INITIALIZATION                                                            │
└──────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │ User clicks  │
    │ "Chat" button│
    │ on task      │
    └──────┬───────┘
           │
           ▼
    ┌──────────────────┐
    │ Navigate to      │
    │ /messages/:taskId│
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ GET /messages/   │
    │   task/:taskId   │
    │ (fetch history)  │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Display messages │
    │ (paginated)      │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Establish        │
    │ WebSocket        │
    │ connection       │
    └──────┬───────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ ws://localhost:8000/ws/chat/:taskId?token=<jwt>                          │
└──────────────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ Connection       │
    │ established      │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Server sends:    │
    │ {                │
    │   type: "user_   │
    │     joined",     │
    │   user: {...}    │
    │ }                │
    └──────┬───────────┘
           │
┌──────────┴────────────────────────────────────────────────────────────────┐
│ SENDING MESSAGES                                                           │
└────────────────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ User types       │
    │ message          │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ (Optional)       │
    │ Send "typing"    │
    │ indicator        │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ User clicks send │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ WebSocket send:  │
    │ {                │
    │   type: "message"│
    │   content: "..."  │
    │ }                │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Server receives  │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Save to DB:      │
    │ POST /messages/  │
    │   task/:taskId   │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Broadcast to     │
    │ both users       │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Both clients     │
    │ receive message  │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Append to chat   │
    │ UI               │
    └──────┬───────────┘
           │
┌──────────┴────────────────────────────────────────────────────────────────┐
│ RECEIVING MESSAGES                                                         │
└────────────────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ WebSocket        │
    │ onMessage event  │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Parse JSON       │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────────────────┐
    │ Check message type           │
    └───┬──────────┬───────────┬───┘
        │          │           │
     message    typing      read
        │          │           │
        ▼          ▼           ▼
   ┌────────┐  ┌─────┐   ┌────────┐
   │ Append │  │Show │   │ Mark as│
   │ to chat│  │ ...  │   │  read  │
   └────────┘  └─────┘   └────────┘
        │
        ▼
    ┌──────────────────┐
    │ Scroll to bottom │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Mark as read:    │
    │ PUT /messages/   │
    │   :id/read       │
    └──────┬───────────┘
           │
┌──────────┴────────────────────────────────────────────────────────────────┐
│ TYPING INDICATOR                                                           │
└────────────────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ User typing      │
    │ (onChange)       │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Debounce (500ms) │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Send typing:     │
    │ {                │
    │   type: "typing" │
    │   is_typing: true│
    │ }                │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Other user sees  │
    │ "Đang nhập..."   │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Stop after 3s    │
    └──────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ DISCONNECTION                                                             │
└──────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │ User leaves page │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ WebSocket close  │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Server detects   │
    │ disconnect       │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Broadcast:       │
    │ {                │
    │   type: "user_   │
    │     left"        │
    │ }                │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Other user sees  │
    │ "Đã thoát"       │
    └──────────────────┘
```

### 4.2 Message Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `message` | Bidirectional | Send/receive chat message |
| `typing` | Bidirectional | Show typing indicator |
| `read` | Client → Server | Mark message as read |
| `user_joined` | Server → Client | User connected |
| `user_left` | Server → Client | User disconnected |

### 4.3 Pages Involved

| Page | Path | Purpose |
|------|------|---------|
| MessagesPage | `/messages` | List conversations |
| ChatPage | `/messages/:taskId` | Real-time chat |

### 4.4 API Endpoints

| Endpoint | Method | Protocol | Purpose |
|----------|--------|----------|---------|
| `/messages/conversations` | GET | HTTP | List conversations |
| `/messages/task/:taskId` | GET | HTTP | Get message history |
| `/messages/task/:taskId` | POST | HTTP | Send message (fallback) |
| `/messages/:id/read` | PUT | HTTP | Mark as read |
| `/ws/chat/:taskId?token=<jwt>` | - | WebSocket | Real-time chat |

---

## 5. Profile & Tasker Registration Flow

### 5.1 Profile Management Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      PROFILE & TASKER FLOW                               │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │ Click Profile│
    │ in BottomNav │
    └──────┬───────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ VIEW PROFILE (/profile)                                                   │
└──────────────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ GET /users/me    │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Display:         │
    │ - Avatar         │
    │ - Name           │
    │ - Rating ⭐      │
    │ - Stats          │
    │ - Balance        │
    │ - is_tasker?     │
    └──────┬───────────┘
           │
           ▼
    ┌────────────────────────────────┐
    │ User action?                   │
    └─┬─────────┬────────────┬───────┘
      │         │            │
   Edit      Tasker      Logout
   Profile   Setup
      │         │            │
      ▼         ▼            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ EDIT PROFILE (/profile/edit)                                             │
└─────────────────────────────────────────────────────────────────────────┘
      │
      ▼
    ┌──────────────────┐
    │ Edit form:       │
    │ - Name           │
    │ - Email          │
    │ - Phone          │
    │ - Student ID     │
    │ - University     │
    │ - Avatar URL     │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ PUT /users/me    │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Update DB        │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Success message  │
    │ Navigate back    │
    └──────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ BECOME TASKER (/profile/tasker)                                          │
└─────────────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ Check is_tasker? │
    └──────┬───────────┘
           │
      ┌────┴────┐
     NO        YES
      │          │
      ▼          ▼
┌──────────┐  ┌──────────┐
│ Register │  │  Update  │
│   Form   │  │   Form   │
└─────┬────┘  └─────┬────┘
      │             │
      ▼             ▼
┌──────────────────────────┐
│ Form fields:             │
│ - Bio (textarea)         │
│   * Min 10 chars         │
│   * Max 500 chars        │
│ - Skills (multi-select)  │
│   * "Giao hàng"          │
│   * "Dạy kèm"            │
│   * "Thiết kế"           │
│   * "Lập trình"          │
│   * "Nhiếp ảnh"          │
│   * "Dịch thuật"         │
│   * "Sửa chữa"           │
│   * "Khác"               │
└──────────┬───────────────┘
           │
           ▼
    ┌──────────────────┐
    │ Validate         │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ POST /users/     │
    │   become-tasker  │
    │ OR               │
    │ PUT /users/      │
    │   tasker-profile │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Update:          │
    │ - is_tasker=true │
    │ - tasker_bio     │
    │ - tasker_skills  │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Notification:    │
    │ "Welcome tasker!"│
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Navigate back    │
    │ to /profile      │
    └──────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ LOGOUT                                                                    │
└─────────────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ Confirm dialog   │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ POST /auth/logout│
    │ (optional)       │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Clear tokens     │
    │ from localStorage│
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Clear Jotai state│
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Navigate to      │
    │ /login           │
    └──────────────────┘
```

### 5.2 Pages Involved

| Page | Path | Purpose |
|------|------|---------|
| ProfilePage | `/profile` | View profile |
| EditProfilePage | `/profile/edit` | Edit user info |
| TaskerProfilePage | `/profile/tasker` | Become/manage tasker |

### 5.3 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/users/me` | GET | Get current user |
| `/users/me` | PUT | Update profile |
| `/users/become-tasker` | POST | Register as tasker |
| `/users/tasker-profile` | PUT | Update tasker info |

---

## 6. Wallet & Transaction Flow

### 6.1 Mock Payment Wallet Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       WALLET & TRANSACTION FLOW                          │
│                     (Mock Payment Mode Only)                            │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │ User logs in │
    └──────┬───────┘
           │
           ▼
    ┌──────────────────┐
    │ Create wallet    │
    │ (if not exists)  │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Initial balance: │
    │ 1,000,000 VND    │
    │ (dev mode)       │
    └──────┬───────────┘
           │
┌──────────┴────────────────────────────────────────────────────────────────┐
│ VIEW WALLET (/wallet)                                                      │
└────────────────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ GET /wallet/     │
    │     balance      │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Display:         │
    │ - Balance        │
    │ - Frozen balance │
    │ - Available      │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ GET /wallet/     │
    │     history      │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Display txns:    │
    │ - Type           │
    │ - Amount         │
    │ - Direction      │
    │ - Balance after  │
    │ - Timestamp      │
    └──────┬───────────┘
           │
┌──────────┴────────────────────────────────────────────────────────────────┐
│ ADD FUNDS (Dev Mode)                                                       │
└────────────────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ Click "Nạp tiền" │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Enter amount     │
    │ (max 100M VND)   │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ POST /wallet/    │
    │   add-funds      │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Create txn:      │
    │ - Type: DEPOSIT  │
    │ - Direction: CR  │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Update balance   │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Notification:    │
    │ "Nạp tiền thành  │
    │  công X VND"     │
    └──────┬───────────┘
           │
┌──────────┴────────────────────────────────────────────────────────────────┐
│ PAYMENT ESCROW                                                             │
└────────────────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ Task accepted    │
    │ by tasker        │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Requester clicks │
    │ "Thanh toán"     │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ POST /payments/  │
    │      create      │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Check balance    │
    │ sufficient?      │
    └──────┬───────────┘
           │
      ┌────┴────┐
     YES       NO
      │         │
      │         ▼
      │    ┌────────┐
      │    │ Error  │
      │    │"Không đủ│
      │    │ tiền"  │
      │    └────────┘
      │
      ▼
    ┌──────────────────┐
    │ Deduct from      │
    │ requester wallet │
    │ - Balance -= X   │
    │ - Frozen += X    │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Create escrow    │
    │ transaction      │
    │ Type: ESCROW_HOLD│
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Create Transaction│
    │ record in DB     │
    │ Status: SUCCESS  │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Task Status:     │
    │ IN_PROGRESS      │
    └──────┬───────────┘
           │
┌──────────┴────────────────────────────────────────────────────────────────┐
│ PAYMENT RELEASE                                                            │
└────────────────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ Task completed   │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Requester clicks │
    │ "Giải ngân"      │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ POST /payments/  │
    │   release/:taskId│
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Calculate split: │
    │ Total = X VND    │
    │ Platform = X*10% │
    │ Tasker = X*90%   │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Unfreeze from    │
    │ requester wallet │
    │ Frozen -= X      │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Add to tasker    │
    │ wallet           │
    │ Balance += X*90% │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Add to platform  │
    │ wallet           │
    │ Balance += X*10% │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Create txns:     │
    │ - ESCROW_RELEASE │
    │ - PLATFORM_FEE   │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Update tasker:   │
    │ total_earnings   │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Notification:    │
    │ "Received X VND" │
    │ (to tasker)      │
    └──────┬───────────┘
           │
┌──────────┴────────────────────────────────────────────────────────────────┐
│ REFUND                                                                     │
└────────────────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ Task cancelled   │
    │ (before complete)│
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ POST /payments/  │
    │   refund/:taskId │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Unfreeze money   │
    │ Frozen -= X      │
    │ Balance += X     │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Create txn:      │
    │ ESCROW_REFUND    │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │ Notification:    │
    │ "Refunded X VND" │
    └──────────────────┘
```

### 6.2 Transaction Types

| Type | Direction | Description |
|------|-----------|-------------|
| `DEPOSIT` | Credit | Add funds to wallet |
| `WITHDRAW` | Debit | Withdraw to bank (not implemented) |
| `ESCROW_HOLD` | Debit | Lock funds in escrow |
| `ESCROW_RELEASE` | Credit | Release escrow to tasker |
| `ESCROW_REFUND` | Credit | Refund escrow to requester |
| `PLATFORM_FEE` | Debit | Platform commission (10%) |

### 6.3 Pages Involved

| Page | Path | Purpose |
|------|------|---------|
| WalletPage | `/wallet` | View balance & history |
| TaskDetailPage | `/tasks/:id` | Initiate payments |

### 6.4 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/wallet/balance` | GET | Get wallet balance |
| `/wallet/history` | GET | Transaction history |
| `/wallet/add-funds` | POST | Add test funds (dev) |
| `/wallet/stats` | GET | Wallet statistics |
| `/payments/create` | POST | Create escrow |
| `/payments/release/:task_id` | POST | Release payment |
| `/payments/refund/:task_id` | POST | Refund payment |

---

## 7. Navigation Map

### 7.1 Complete Page Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         NAVIGATION MAP                                   │
│                    (All 15+ Pages & Routes)                             │
└─────────────────────────────────────────────────────────────────────────┘

/login                             [PUBLIC]
  │
  ├─ Zalo OAuth button
  ├─ Dev login button (DEBUG mode)
  └─ → Redirects to /

/                                  [PROTECTED]
  │ HomePage - Dashboard
  ├─ Quick Actions:
  │  ├─ "Đăng công việc" → /tasks/create
  │  ├─ "Tìm việc" → /tasks
  │  ├─ "Ví của tôi" → /wallet
  │  └─ "Trở thành Tasker" → /profile/tasker
  ├─ Category chips → /tasks?category_id=X
  └─ Recent tasks → /tasks/:id

/tasks                             [PROTECTED]
  │ TasksPage - Browse tasks
  ├─ Search bar
  ├─ Filters (category, price, sort)
  ├─ Task cards → /tasks/:id
  └─ Bottom Nav

/tasks/create                      [PROTECTED]
  │ CreateTaskPage
  ├─ Form (title, description, price, category, location, deadline)
  ├─ Submit → POST /tasks
  └─ Success → /tasks/:id (created)

/tasks/:id                         [PROTECTED]
  │ TaskDetailPage
  ├─ View mode (all users)
  ├─ Requester actions:
  │  ├─ Edit (if OPEN)
  │  ├─ View applications → /tasks/:id/applications
  │  ├─ Accept application
  │  ├─ Pay escrow
  │  ├─ Complete task
  │  └─ Release payment
  ├─ Tasker actions:
  │  ├─ Apply (if OPEN)
  │  └─ View status
  ├─ Chat button → /messages/:taskId
  └─ Bottom Nav

/my-tasks                          [PROTECTED]
  │ MyTasksPage
  ├─ Tabs:
  │  ├─ Posted (requester tasks) → GET /tasks/my-posted
  │  └─ Assigned (tasker tasks) → GET /tasks/my-assigned
  ├─ Task cards → /tasks/:id
  └─ Bottom Nav

/profile                           [PROTECTED]
  │ ProfilePage
  ├─ User info (avatar, name, rating, stats)
  ├─ Actions:
  │  ├─ Edit profile → /profile/edit
  │  ├─ Become tasker → /profile/tasker (if !is_tasker)
  │  ├─ Manage tasker profile → /profile/tasker (if is_tasker)
  │  └─ Logout → /login
  └─ Bottom Nav

/profile/edit                      [PROTECTED]
  │ EditProfilePage
  ├─ Form (name, email, phone, student_id, university, avatar_url)
  ├─ Save → PUT /users/me
  └─ Back → /profile

/profile/tasker                    [PROTECTED]
  │ TaskerProfilePage
  ├─ Form (bio, skills)
  ├─ Save → POST /users/become-tasker or PUT /users/tasker-profile
  └─ Back → /profile

/messages                          [PROTECTED]
  │ MessagesPage - Conversations list
  ├─ GET /messages/conversations
  ├─ Conversation cards:
  │  ├─ Other user avatar & name
  │  ├─ Task title
  │  ├─ Last message preview
  │  ├─ Unread badge
  │  └─ → /messages/:taskId
  └─ Bottom Nav

/messages/:taskId                  [PROTECTED]
  │ ChatPage - Real-time chat
  ├─ WebSocket connection
  ├─ Message history (paginated)
  ├─ Message bubbles
  ├─ Typing indicator
  ├─ Chat input
  └─ Back → /messages

/notifications                     [PROTECTED]
  │ NotificationsPage
  ├─ GET /notifications
  ├─ Notification list:
  │  ├─ Type icon
  │  ├─ Title & message
  │  ├─ Timestamp
  │  ├─ Read status
  │  └─ Click → Navigate to related page
  ├─ Mark as read
  ├─ Mark all read
  └─ Bottom Nav

/wallet                            [PROTECTED]
  │ WalletPage
  ├─ Balance card:
  │  ├─ Available balance
  │  └─ Frozen balance
  ├─ Add funds button (dev mode)
  ├─ Transaction history:
  │  ├─ Type icon & color
  │  ├─ Description
  │  ├─ Amount (+/-)
  │  └─ Timestamp
  └─ Bottom Nav

* (fallback)                       [ALL]
  └─ Navigate to /
```

### 7.2 Bottom Navigation

Present on all main protected pages:

| Tab | Icon | Route | Label |
|-----|------|-------|-------|
| Home | 🏠 | `/` | Trang chủ |
| Tasks | 📋 | `/tasks` | Công việc |
| Messages | 💬 | `/messages` | Tin nhắn |
| Notifications | 🔔 | `/notifications` | Thông báo |
| Profile | 👤 | `/profile` | Cá nhân |

---

## 8. State Transitions

### 8.1 Task Status State Machine

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      TASK STATUS TRANSITIONS                             │
└─────────────────────────────────────────────────────────────────────────┘

                        ┌──────────┐
                        │   OPEN   │ ◄── Initial state
                        └─────┬────┘
                              │
                              │ Requester accepts application
                              │ POST /tasks/:id/accept/:app_id
                              ▼
                        ┌──────────┐
                        │ ACCEPTED │
                        └─────┬────┘
                              │
                              │ Requester pays (escrow)
                              │ POST /payments/create
                              ▼
                        ┌──────────────┐
                        │ IN_PROGRESS  │
                        └─────┬────────┘
                              │
                              │ Requester marks complete
                              │ POST /tasks/:id/complete
                              ▼
                        ┌──────────┐
                        │COMPLETED │ ◄── Final state
                        └──────────┘

    OPEN/ACCEPTED can also transition to:
                              ▼
                        ┌──────────┐
                        │CANCELLED │ ◄── Final state
                        └──────────┘
                              │
                              │ DELETE /tasks/:id
                              │ (requester only)

    (DISPUTED state exists but not implemented in current flow)
```

### 8.2 Application Status Transitions

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  APPLICATION STATUS TRANSITIONS                          │
└─────────────────────────────────────────────────────────────────────────┘

                        ┌──────────┐
                        │ PENDING  │ ◄── Initial state
                        └─────┬────┘
                              │
                              │ POST /tasks/:id/apply
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    │ Requester reviews │
                    │                   │
              ┌─────▼─────┐       ┌─────▼─────┐
              │ ACCEPTED  │       │ REJECTED  │
              └───────────┘       └───────────┘
                 Final               Final
```

### 8.3 Transaction Status Transitions

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   TRANSACTION STATUS TRANSITIONS                         │
└─────────────────────────────────────────────────────────────────────────┘

For Escrow Transactions:

                        ┌──────────┐
                        │ PENDING  │ ◄── ZaloPay only (awaiting payment)
                        └─────┬────┘
                              │
                              │ ZaloPay callback
                              │
                              ▼
                        ┌──────────┐
                        │ SUCCESS  │ ◄── Mock mode (instant)
                        └─────┬────┘
                              │
                              │ POST /payments/release/:task_id
                              │
                              ▼
                        ┌──────────┐
                        │ RELEASED │ ◄── Final state
                        └──────────┘

                        ┌──────────┐
                        │ SUCCESS  │
                        └─────┬────┘
                              │
                              │ POST /payments/refund/:task_id
                              │
                              ▼
                        ┌──────────┐
                        │ REFUNDED │ ◄── Final state
                        └──────────┘

                        ┌──────────┐
                        │ PENDING  │
                        └─────┬────┘
                              │
                              │ Payment fails
                              │
                              ▼
                        ┌──────────┐
                        │  FAILED  │ ◄── Final state
                        └──────────┘
```

---

## 9. Error Cases & Recovery

### 9.1 Common Error Scenarios

| Scenario | Error | User Impact | Recovery |
|----------|-------|-------------|----------|
| **Network Failure** | Request timeout | Can't load data | Retry button, pull-to-refresh |
| **Invalid Token** | 401 Unauthorized | Logged out | Auto-refresh token, then re-login |
| **Insufficient Balance** | 400 Bad Request | Can't pay | Show balance, "Add funds" button |
| **Task Already Accepted** | 409 Conflict | Can't apply | Show message, redirect to /tasks |
| **Not Authorized** | 403 Forbidden | Can't perform action | Show error, suggest correct role |
| **Resource Not Found** | 404 Not Found | Page not found | Redirect to home or previous page |
| **Validation Error** | 422 Unprocessable | Form error | Show field-specific errors |
| **Server Error** | 500 Internal Server | Service unavailable | Show error, contact support |
| **WebSocket Disconnect** | Connection lost | Chat stops working | Auto-reconnect with backoff |
| **Zalo API Down** | 503 Service Unavailable | Can't login with Zalo | Show dev login option |

### 9.2 Error Recovery Strategies

#### **Token Refresh Flow**

```
API Request → 401 Unauthorized
     │
     ▼
Check refresh_token exists?
     │
    YES
     │
     ▼
POST /auth/refresh with refresh_token
     │
  ┌──┴──┐
 OK   FAIL
  │     │
  │     └─→ Clear tokens → Navigate to /login
  │
  ▼
Store new tokens
  │
  ▼
Retry original request
```

#### **Network Retry Strategy**

```
Request fails
     │
     ▼
Exponential backoff:
- 1st retry: 1s
- 2nd retry: 2s
- 3rd retry: 4s
- Max 3 retries
     │
     ▼
Still fails?
     │
     ▼
Show error message
+ "Retry" button
+ "Go back" button
```

#### **WebSocket Reconnection**

```
Connection lost
     │
     ▼
Wait 2s
     │
     ▼
Attempt reconnect
     │
  ┌──┴──┐
 OK   FAIL
  │     │
  │     ├─→ Wait 4s → Retry
  │     ├─→ Wait 8s → Retry
  │     └─→ Wait 16s → Give up
  │
  ▼
Reconnected
  │
  ▼
Fetch missed messages
```

---

## 10. User Stories

### 10.1 Requester User Stories

#### Story 1: First-Time Requester Posts a Task

**As a** university student needing help with moving dorm items
**I want to** post a task with details and price
**So that** taskers can see and apply for my job

**Acceptance Criteria:**
- I can fill in title, description, price, category, location, and deadline
- I can mark price as negotiable
- System validates required fields
- Task appears in public task list immediately
- Other students receive notifications (optional)

**Flow:**
1. Login with Zalo
2. Navigate to Home → Click "Đăng công việc"
3. Fill form: "Giúp chuyển đồ từ KTX A sang B"
4. Category: "Giao hàng", Price: 50,000 VND
5. Submit → Task created with status OPEN
6. Redirect to task detail page

---

#### Story 2: Requester Reviews and Accepts Applicant

**As a** requester with multiple applications
**I want to** review tasker profiles and accept the best one
**So that** I can hire the most suitable person

**Acceptance Criteria:**
- I can see all applicants with their ratings and proposed prices
- I can view each tasker's profile and completed tasks
- I can accept one application
- Other applications are auto-rejected
- Accepted tasker receives notification

**Flow:**
1. Receive notification "Có 3 người ứng tuyển"
2. Navigate to task detail → View applications section
3. Review each applicant:
   - Tasker A: Rating 4.8, 20 tasks, proposed 45,000 VND
   - Tasker B: Rating 4.5, 10 tasks, original price
   - Tasker C: Rating 4.9, 30 tasks, proposed 55,000 VND
4. Click "Chấp nhận" on Tasker C
5. Task status → ACCEPTED, price updated to 55,000 VND

---

#### Story 3: Requester Pays via Mock Wallet

**As a** requester who accepted a tasker
**I want to** pay securely via escrow
**So that** work can begin and money is protected

**Acceptance Criteria:**
- Payment button appears after accepting tasker
- System checks wallet balance
- Money is deducted and frozen
- Task status changes to IN_PROGRESS
- Both parties can now chat

**Flow:**
1. Task accepted, view task detail
2. See "Thanh toán" button
3. Click → Confirm payment of 55,000 VND
4. System checks wallet: 1,000,000 VND available
5. Deduct: Balance = 945,000 VND, Frozen = 55,000 VND
6. Task status → IN_PROGRESS
7. Chat becomes active

---

#### Story 4: Requester Completes and Releases Payment

**As a** requester whose task is done
**I want to** mark task complete and release payment
**So that** tasker gets paid and task is closed

**Acceptance Criteria:**
- Complete button appears after payment
- I can verify work before completing
- Completion marks task as done
- Release button appears after completion
- Payment is split: 90% to tasker, 10% platform fee
- Tasker receives notification and funds

**Flow:**
1. Tasker notifies work done via chat
2. I verify the work is satisfactory
3. Click "Hoàn thành" → Task status = COMPLETED
4. Click "Giải ngân"
5. System calculates: Tasker = 49,500 VND, Platform = 5,500 VND
6. Tasker wallet updated, notification sent
7. Optionally leave review

---

### 10.2 Tasker User Stories

#### Story 5: Student Becomes a Tasker

**As a** student wanting to earn money
**I want to** register as a tasker
**So that** I can apply for tasks

**Acceptance Criteria:**
- I can write a bio (10-500 characters)
- I can select multiple skills
- My profile shows "Tasker" badge
- I can now apply for tasks
- I receive welcome notification

**Flow:**
1. Navigate to Profile
2. Click "Trở thành Tasker"
3. Fill form:
   - Bio: "Sinh viên năm 3, có xe máy, nhiệt tình..."
   - Skills: ["Giao hàng", "Sửa chữa"]
4. Submit → is_tasker = true
5. Notification: "Chào mừng bạn trở thành Tasker!"

---

#### Story 6: Tasker Browses and Applies for Tasks

**As a** registered tasker
**I want to** browse available tasks and apply
**So that** I can find work matching my skills

**Acceptance Criteria:**
- I can filter by category, price range
- I can search by keyword
- I can view task details before applying
- I can propose a different price
- I can write a message to requester
- Application is saved with PENDING status

**Flow:**
1. Navigate to "Công việc" tab
2. Filter: Category = "Giao hàng", Min price = 50,000
3. Find "Giúp chuyển đồ từ KTX A sang B"
4. Click to view details
5. Click "Ứng tuyển"
6. Fill: Message = "Em có xe máy, có thể làm ngay!"
7. Proposed price: 45,000 VND (lower to be competitive)
8. Submit → Application created

---

#### Story 7: Tasker Gets Accepted and Works

**As a** tasker whose application was accepted
**I want to** receive notification and start work
**So that** I can earn money

**Acceptance Criteria:**
- I receive notification when accepted
- Task appears in "My Tasks - Assigned" tab
- I can chat with requester
- I can see payment is in escrow
- I can update requester on progress

**Flow:**
1. Receive notification: "Đơn của bạn đã được chấp nhận"
2. Navigate to "My Tasks" → Assigned tab
3. See task status: IN_PROGRESS
4. Open chat → "Chào anh, em sẽ đến lúc 14:00 nhé"
5. Perform the work
6. Send message: "Em đã xong rồi ạ!"

---

#### Story 8: Tasker Receives Payment

**As a** tasker who completed work
**I want to** receive payment automatically
**So that** I get paid for my work

**Acceptance Criteria:**
- Requester marks task complete
- Requester releases payment
- I receive 90% of task price
- My wallet balance increases
- I receive notification with amount
- My stats (total_earnings, tasks_completed) update

**Flow:**
1. Wait for requester to verify work
2. Receive notification: "Công việc đã hoàn thành"
3. Receive notification: "Bạn nhận được 49,500 VND"
4. Navigate to Wallet
5. See transaction: +49,500 VND (ESCROW_RELEASE)
6. Balance updated: 1,049,500 VND
7. Profile shows: Tasks completed = 1, Total earnings = 49,500

---

### 10.3 Communication User Stories

#### Story 9: Real-Time Chat Between Users

**As a** requester or tasker
**I want to** chat in real-time
**So that** we can coordinate work details

**Acceptance Criteria:**
- Chat is available after task is accepted
- Messages appear instantly via WebSocket
- I can see typing indicator
- Messages are marked as read automatically
- Chat history is preserved
- I receive notification if chat is closed

**Flow:**
1. Click "Chat" button on task detail
2. WebSocket connects
3. Type message → See typing indicator on other side
4. Send message → Appears on both screens instantly
5. Receive response → Message marked as read
6. Chat history saved in database

---

### 10.4 Error Recovery User Stories

#### Story 10: Handle Insufficient Wallet Balance

**As a** requester trying to pay
**I want to** be notified if balance is low
**So that** I can add funds before paying

**Acceptance Criteria:**
- Payment fails with clear error message
- Current balance is shown
- "Add funds" button is available
- After adding funds, I can retry payment

**Flow:**
1. Click "Thanh toán" on 200,000 VND task
2. Wallet balance: 50,000 VND
3. Error: "Số dư không đủ. Bạn cần 200,000 VND"
4. See current balance: 50,000 VND
5. Click "Nạp tiền"
6. Add 200,000 VND
7. Return to task → Retry payment → Success

---

## Summary

This document covers **7 major flows**, **15+ pages**, **50+ API endpoints**, and **10 user stories** for the Viecz platform. Each flow includes:

- ASCII art diagrams
- Step-by-step breakdowns
- Frontend pages involved
- Backend API endpoints
- State transitions
- Error handling
- Real-world user scenarios

**Key Highlights:**

1. **Authentication**: Zalo OAuth + Dev Login for testing
2. **Dual User Roles**: Requester and Tasker with distinct flows
3. **Escrow Payment**: Mock wallet system with transaction tracking
4. **Real-Time Chat**: WebSocket-based messaging
5. **Comprehensive State Management**: Task, Application, Transaction states
6. **Error Resilience**: Token refresh, retry logic, reconnection strategies

---

**Last Updated:** 2026-02-04
**Version:** 1.0
**Maintained By:** Claude Code Assistant
