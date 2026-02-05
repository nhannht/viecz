# System Design - Dịch Vụ Nhỏ Cho Sinh Viên

**Version:** 1.0
**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Competition:** SV_STARTUP VIII (Deadline: Feb 28, 2026)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Architecture Patterns](#4-architecture-patterns)
5. [Component Architecture](#5-component-architecture)
6. [Data Flow Diagrams](#6-data-flow-diagrams)
7. [Scalability Considerations](#7-scalability-considerations)
8. [Infrastructure & Deployment](#8-infrastructure--deployment)
9. [Appendix](#9-appendix)

---

## 1. Executive Summary

### 1.1 System Overview

**Dịch Vụ Nhỏ Cho Sinh Viên** is a peer-to-peer marketplace platform designed as a Zalo Mini App, connecting university students for small tasks and services. The system handles real-time task matching, secure escrow payments, instant messaging, and notifications for 100,000+ potential users.

### 1.2 Key Design Goals

| Goal | Target | Status |
|------|--------|--------|
| **MVP Delivery** | Feb 28, 2026 | In Progress |
| **API Response Time** | < 200ms (p95) | Target |
| **Concurrent Users** | 1,000 (Year 1) | Target |
| **Availability** | 99% uptime | Target |
| **Security** | OWASP Top 10 compliant | In Progress |

### 1.3 Architecture Philosophy

- **Simplicity First**: Monolithic architecture for MVP speed
- **Security by Design**: JWT auth, HTTPS, input validation
- **Fail Gracefully**: Comprehensive error handling
- **Stateless Services**: Horizontally scalable API servers
- **Progressive Enhancement**: Start simple, scale as needed

---

## 2. High-Level Architecture

### 2.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER (Zalo Ecosystem)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐              │
│  │  Zalo App    │      │  Zalo App    │      │  Zalo App    │              │
│  │  (Android)   │      │    (iOS)     │      │    (Web)     │              │
│  └──────┬───────┘      └──────┬───────┘      └──────┬───────┘              │
│         │                     │                     │                       │
│         └─────────────────────┼─────────────────────┘                       │
│                               │                                             │
│                    ┌──────────▼──────────┐                                  │
│                    │  Zalo Mini App      │                                  │
│                    │  (React 19 + MUI)   │                                  │
│                    │  - HashRouter       │                                  │
│                    │  - Jotai State      │                                  │
│                    │  - zmp-sdk          │                                  │
│                    └──────────┬──────────┘                                  │
│                               │                                             │
└───────────────────────────────┼─────────────────────────────────────────────┘
                                │
                                │ HTTPS/WSS
                                │
┌───────────────────────────────┼─────────────────────────────────────────────┐
│                        GATEWAY LAYER                                         │
├───────────────────────────────┼─────────────────────────────────────────────┤
│                    ┌──────────▼──────────┐                                  │
│                    │      Nginx          │                                  │
│                    │  Reverse Proxy      │                                  │
│                    │  - SSL/TLS 1.3      │                                  │
│                    │  - Rate Limiting    │                                  │
│                    │  - Load Balancing   │                                  │
│                    │  - Static Assets    │                                  │
│                    └──────────┬──────────┘                                  │
│                               │                                             │
└───────────────────────────────┼─────────────────────────────────────────────┘
                                │
                                │ Proxy Pass (HTTP/WS)
                                │
┌───────────────────────────────┼─────────────────────────────────────────────┐
│                       APPLICATION LAYER                                      │
├───────────────────────────────┼─────────────────────────────────────────────┤
│                    ┌──────────▼──────────┐                                  │
│                    │  FastAPI Server     │                                  │
│                    │  (Uvicorn/Gunicorn) │                                  │
│                    │                     │                                  │
│                    │  ┌───────────────┐  │                                  │
│                    │  │   Routers     │  │ - REST API Endpoints             │
│                    │  │   /auth       │  │ - Request Validation             │
│                    │  │   /tasks      │  │ - Business Logic                 │
│                    │  │   /users      │  │ - WebSocket Handling             │
│                    │  │   /payments   │  │ - JWT Authentication             │
│                    │  └───────┬───────┘  │                                  │
│                    │          │          │                                  │
│                    │  ┌───────▼───────┐  │                                  │
│                    │  │   Services    │  │ - MockPaymentService             │
│                    │  │               │  │ - ZaloPayService                 │
│                    │  │               │  │ - NotificationService            │
│                    │  └───────┬───────┘  │                                  │
│                    │          │          │                                  │
│                    │  ┌───────▼───────┐  │                                  │
│                    │  │ SQLAlchemy    │  │ - ORM Models                     │
│                    │  │   Models      │  │ - Database Operations            │
│                    │  └───────┬───────┘  │                                  │
│                    └──────────┼──────────┘                                  │
│                               │                                             │
└───────────────────────────────┼─────────────────────────────────────────────┘
                                │
                                │ SQL
                                │
┌───────────────────────────────┼─────────────────────────────────────────────┐
│                          DATA LAYER                                          │
├───────────────────────────────┼─────────────────────────────────────────────┤
│                    ┌──────────▼──────────┐                                  │
│                    │   SQLite Database   │                                  │
│                    │   (Single File)     │                                  │
│                    │                     │                                  │
│                    │  - Users            │  Primary Data Store              │
│                    │  - Tasks            │  - ACID Transactions             │
│                    │  - Messages         │  - Relational Schema             │
│                    │  - Transactions     │  - Full-text Search (FTS5)       │
│                    │  - Wallets          │  - Foreign Keys                  │
│                    │  - Notifications    │  - Indexes                       │
│                    │                     │                                  │
│                    └─────────────────────┘                                  │
│                                                                              │
│                    ┌─────────────────────┐                                  │
│                    │   File Storage      │                                  │
│                    │   (Local FS)        │                                  │
│                    │                     │                                  │
│                    │  - User Avatars     │  File System Storage             │
│                    │  - Task Images      │  (Future: S3/Cloud)              │
│                    │                     │                                  │
│                    └─────────────────────┘                                  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐            │
│  │   Zalo OAuth    │   │    ZaloPay      │   │    Zalo ZNS     │            │
│  │                 │   │                 │   │                 │            │
│  │  User Auth      │   │  Payment        │   │  Push Notifs    │            │
│  │  Profile Data   │   │  Processing     │   │  (Future)       │            │
│  │                 │   │  Escrow         │   │                 │            │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Responsibilities

| Layer | Component | Responsibilities | Technology |
|-------|-----------|-----------------|------------|
| **Client** | Zalo Mini App | UI rendering, routing, state management, user interactions | React 19, MUI, Jotai |
| **Gateway** | Nginx | SSL termination, reverse proxy, rate limiting, static files | Nginx 1.24+ |
| **API** | FastAPI Server | REST endpoints, business logic, authentication, WebSocket | Python 3.11, FastAPI 0.109+ |
| **Data** | SQLite | Primary data storage, ACID transactions | SQLite 3.x |
| **External** | Zalo OAuth | User authentication and profile | Zalo API |
| **External** | ZaloPay | Payment processing and escrow | ZaloPay API |

---

## 3. Technology Stack

### 3.1 Frontend Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │              PRESENTATION LAYER                    │     │
│  ├────────────────────────────────────────────────────┤     │
│  │  React 19 + TypeScript                            │     │
│  │  - Functional Components                          │     │
│  │  - React Hooks                                    │     │
│  │  - HashRouter (react-router-dom v7)              │     │
│  │                                                   │     │
│  │  Material UI v7                                  │     │
│  │  - Pre-built components                         │     │
│  │  - Theming system                               │     │
│  │  - Responsive design                            │     │
│  └───────────────────┬────────────────────────────┘     │
│                      │                                    │
│  ┌───────────────────▼────────────────────────────┐     │
│  │           STATE MANAGEMENT LAYER               │     │
│  ├────────────────────────────────────────────────┤     │
│  │  Jotai (Atomic State)                         │     │
│  │  - userAtom                                   │     │
│  │  - tasksAtom                                  │     │
│  │  - conversationsAtom                          │     │
│  │  - notificationsAtom                          │     │
│  │  - walletBalanceAtom                          │     │
│  │  - snackbarAtom                               │     │
│  └───────────────────┬────────────────────────────┘     │
│                      │                                    │
│  ┌───────────────────▼────────────────────────────┐     │
│  │              SERVICE LAYER                     │     │
│  ├────────────────────────────────────────────────┤     │
│  │  API Client (Fetch API)                       │     │
│  │  - JWT token injection                        │     │
│  │  - Auto token refresh                         │     │
│  │  - Error handling                             │     │
│  │                                                │     │
│  │  Services:                                    │     │
│  │  - authService                                │     │
│  │  - tasksService                               │     │
│  │  - usersService                               │     │
│  │  - messagesService                            │     │
│  │  - paymentsService                            │     │
│  │  - walletService                              │     │
│  └───────────────────┬────────────────────────────┘     │
│                      │                                    │
│  ┌───────────────────▼────────────────────────────┐     │
│  │          INTEGRATION LAYER                     │     │
│  ├────────────────────────────────────────────────┤     │
│  │  zmp-sdk (Zalo Mini App SDK)                  │     │
│  │  - getAccessToken()                           │     │
│  │  - getUserInfo()                              │     │
│  │  - openWebview()                              │     │
│  │                                                │     │
│  │  WebSocket Client                             │     │
│  │  - Real-time chat                             │     │
│  │  - Typing indicators                          │     │
│  └────────────────────────────────────────────────┘     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Key Technologies:**

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Framework** | React | 19.x | UI rendering, component model |
| **Language** | TypeScript | 5.x | Type safety, better DX |
| **UI Library** | Material UI | 7.x | Pre-built components, theming |
| **Routing** | React Router | 7.x | HashRouter for Zalo webview |
| **State** | Jotai | 2.x | Atomic state management |
| **Build Tool** | Vite | 5.x | Fast dev server, HMR |
| **SDK** | zmp-sdk | Latest | Zalo Mini App integration |
| **HTTP Client** | Fetch API | Native | RESTful API calls |

### 3.2 Backend Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │               ROUTING LAYER                        │     │
│  ├────────────────────────────────────────────────────┤     │
│  │  FastAPI Routers                                  │     │
│  │  - /api/v1/auth       Authentication              │     │
│  │  - /api/v1/users      User management             │     │
│  │  - /api/v1/tasks      Task CRUD                   │     │
│  │  - /api/v1/payments   Payment processing          │     │
│  │  - /api/v1/wallet     Wallet operations           │     │
│  │  - /api/v1/messages   Chat messages               │     │
│  │  - /api/v1/notifications                          │     │
│  │  - /ws/chat/{task_id} WebSocket chat              │     │
│  └───────────────────┬────────────────────────────────┘     │
│                      │                                       │
│  ┌───────────────────▼────────────────────────────────┐     │
│  │            MIDDLEWARE LAYER                        │     │
│  ├────────────────────────────────────────────────────┤     │
│  │  - CORS middleware                                │     │
│  │  - Origin logger                                  │     │
│  │  - Exception handlers                             │     │
│  │  - Request validation (Pydantic)                  │     │
│  └───────────────────┬────────────────────────────────┘     │
│                      │                                       │
│  ┌───────────────────▼────────────────────────────────┐     │
│  │           BUSINESS LOGIC LAYER                     │     │
│  ├────────────────────────────────────────────────────┤     │
│  │  Services (Domain Logic)                          │     │
│  │  - MockPaymentService   Virtual wallet            │     │
│  │  - ZaloPayService       Real payments             │     │
│  │  - NotificationService  Push notifications        │     │
│  │                                                    │     │
│  │  Core Utilities                                   │     │
│  │  - security.py          JWT, hashing              │     │
│  │  - dependencies.py      Dependency injection      │     │
│  │  - exceptions.py        Custom errors             │     │
│  └───────────────────┬────────────────────────────────┘     │
│                      │                                       │
│  ┌───────────────────▼────────────────────────────────┐     │
│  │              DATA ACCESS LAYER                     │     │
│  ├────────────────────────────────────────────────────┤     │
│  │  SQLAlchemy 2.x ORM                               │     │
│  │  - Models (User, Task, Message, etc.)            │     │
│  │  - Async queries (future)                        │     │
│  │  - Relationships                                  │     │
│  │  - Migrations (Alembic)                          │     │
│  └───────────────────┬────────────────────────────────┘     │
│                      │                                       │
│  ┌───────────────────▼────────────────────────────────┐     │
│  │           WEBSOCKET LAYER                          │     │
│  ├────────────────────────────────────────────────────┤     │
│  │  ConnectionManager                                │     │
│  │  - Task connections: Dict[int, List[WebSocket]]  │     │
│  │  - User connections: Dict[int, List[WebSocket]]  │     │
│  │  - Broadcast methods                              │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Key Technologies:**

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Framework** | FastAPI | 0.109+ | High-performance async API |
| **Runtime** | Python | 3.11+ | Modern async, type hints |
| **Validation** | Pydantic | 2.x | Request/response schemas |
| **ORM** | SQLAlchemy | 2.x | Database abstraction |
| **Database** | SQLite | 3.x | Zero-config, file-based DB |
| **Auth** | python-jose | 3.3+ | JWT token handling |
| **Migrations** | Alembic | 1.13+ | Database versioning |
| **ASGI Server** | Uvicorn | 0.27+ | Production server |
| **Process Manager** | Gunicorn | Latest | Multiple workers |
| **Package Manager** | uv | Latest | Fast Python package manager |

### 3.3 Infrastructure Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Web Server** | Nginx 1.24+ | Reverse proxy, SSL, rate limiting |
| **SSL** | Let's Encrypt | Free SSL certificates |
| **OS** | Ubuntu 22.04 LTS | Stable Linux distribution |
| **Process Manager** | Systemd | Service management |
| **Server** | Bare Metal | Zero hosting cost |

---

## 4. Architecture Patterns

### 4.1 Backend: Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  LAYERED ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────┘

Request Flow (Top to Bottom):

┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: ROUTERS (API Endpoints)                           │
├─────────────────────────────────────────────────────────────┤
│  Responsibilities:                                          │
│  - HTTP request handling                                    │
│  - Route definitions                                        │
│  - Input validation (Pydantic schemas)                      │
│  - Response formatting                                      │
│                                                             │
│  Example: /api/v1/tasks                                    │
│  @router.post("/tasks")                                    │
│  def create_task(task_data: TaskCreate, user: User):      │
│      return task_service.create_task(user.id, task_data)  │
└────────────────────┬────────────────────────────────────────┘
                     │ Calls
┌────────────────────▼────────────────────────────────────────┐
│  LAYER 2: SERVICES (Business Logic)                        │
├─────────────────────────────────────────────────────────────┤
│  Responsibilities:                                          │
│  - Business rules enforcement                               │
│  - Complex operations                                       │
│  - Transaction coordination                                 │
│  - External service integration                             │
│                                                             │
│  Example: TaskService                                      │
│  def create_task(user_id, data):                          │
│      # Validate business rules                            │
│      # Save to database                                   │
│      # Send notifications                                 │
└────────────────────┬────────────────────────────────────────┘
                     │ Uses
┌────────────────────▼────────────────────────────────────────┐
│  LAYER 3: MODELS (Data Access)                             │
├─────────────────────────────────────────────────────────────┤
│  Responsibilities:                                          │
│  - Database schema definition                               │
│  - ORM relationships                                        │
│  - Data validation                                          │
│  - Query methods                                            │
│                                                             │
│  Example: Task Model                                       │
│  class Task(Base):                                         │
│      __tablename__ = "tasks"                               │
│      id = Column(Integer, primary_key=True)                │
│      title = Column(String, nullable=False)                │
└────────────────────┬────────────────────────────────────────┘
                     │ Queries
┌────────────────────▼────────────────────────────────────────┐
│  LAYER 4: DATABASE (SQLite)                                │
├─────────────────────────────────────────────────────────────┤
│  Responsibilities:                                          │
│  - Data persistence                                         │
│  - ACID transactions                                        │
│  - Query execution                                          │
│  - Indexing                                                 │
└─────────────────────────────────────────────────────────────┘
```

**Benefits:**
- Clear separation of concerns
- Easy to test each layer independently
- Simple to understand and maintain
- Scales with team size

**Design Patterns Used:**

1. **Dependency Injection**: FastAPI's `Depends()` for injecting database sessions, current user
2. **Repository Pattern**: SQLAlchemy models encapsulate data access
3. **Service Layer Pattern**: Business logic separated from routing
4. **DTO Pattern**: Pydantic schemas for data transfer

### 4.2 Frontend: Atomic State Management

```
┌─────────────────────────────────────────────────────────────┐
│              JOTAI ATOMIC STATE PATTERN                      │
└─────────────────────────────────────────────────────────────┘

State Structure (Atoms):

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   userAtom      │    │   tasksAtom     │    │  walletAtom     │
│   ─────────     │    │   ──────────    │    │  ───────────    │
│   User | null   │    │   Task[]        │    │  number         │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                       │
         └──────────────────────┼───────────────────────┘
                                │
                    ┌───────────▼────────────┐
                    │   React Components     │
                    │   - Auto re-render on  │
                    │     atom changes       │
                    │   - Subscribe only to  │
                    │     used atoms         │
                    └────────────────────────┘

Flow:

User Action → Hook (useAuth, useTasks) → Service (API call) → Update Atom → Component Re-render
```

**Benefits:**
- No prop drilling
- Fine-grained reactivity (only subscribed components re-render)
- Simple API: `useAtom(atomName)`
- TypeScript friendly

### 4.3 Communication Patterns

**1. REST API (Request-Response)**

```
Frontend → HTTP Request → Backend → Database → Response → Frontend
```

**2. WebSocket (Real-time)**

```
Frontend ←→ WebSocket Connection ←→ Backend
   │                                    │
   └─── Send message                    │
   │                                    │
   ←─── Receive message ─────────────────┘
```

**3. Pub/Sub (Notifications - Future)**

```
Backend Event → Message Queue → Notification Service → Zalo ZNS → User Device
```

---

## 5. Component Architecture

### 5.1 Backend Module Structure

```
backend/app/
│
├── main.py                  # FastAPI app entry, middleware, lifespan
├── config.py                # Pydantic Settings (env vars)
├── database.py              # SQLAlchemy engine, session factory
│
├── models/                  # SQLAlchemy ORM Models
│   ├── __init__.py
│   ├── user.py              # User, authentication
│   ├── task.py              # Task, TaskApplication, TaskStatus
│   ├── message.py           # Message (chat)
│   ├── transaction.py       # Transaction (payments)
│   ├── wallet.py            # Wallet, WalletTransaction (mock payment)
│   ├── notification.py      # Notification
│   └── category.py          # Category (task categories)
│
├── schemas/                 # Pydantic Schemas (validation)
│   ├── __init__.py
│   ├── user.py              # UserCreate, UserUpdate, UserResponse
│   ├── task.py              # TaskCreate, TaskUpdate, TaskResponse
│   ├── message.py           # MessageCreate, MessageResponse
│   ├── auth.py              # LoginRequest, TokenResponse
│   └── common.py            # PaginationParams, ErrorResponse
│
├── routers/                 # API Route Handlers
│   ├── __init__.py
│   ├── auth.py              # POST /auth/zalo, /auth/dev-login
│   ├── users.py             # GET /users/me, PUT /users/me
│   ├── tasks.py             # CRUD /tasks, /tasks/{id}/apply
│   ├── payments.py          # POST /payments/create, /payments/release
│   ├── wallet.py            # GET /wallet/balance, /wallet/history
│   ├── messages.py          # GET /tasks/{id}/messages
│   ├── notifications.py     # GET /notifications
│   └── categories.py        # GET /categories
│
├── services/                # Business Logic Layer
│   ├── __init__.py
│   ├── mock_payment.py      # MockPaymentService (virtual wallets)
│   ├── zalopay.py           # ZaloPayService (real payment integration)
│   └── notification.py      # NotificationService (create, send)
│
├── core/                    # Core Utilities
│   ├── __init__.py
│   ├── security.py          # JWT creation, verification, password hashing
│   ├── dependencies.py      # get_current_user, get_db
│   └── exceptions.py        # HTTPException wrappers
│
└── websocket/               # WebSocket Handlers
    ├── __init__.py
    ├── manager.py           # ConnectionManager (connection tracking)
    └── chat.py              # chat_websocket() endpoint
```

**Key Models:**

| Model | Fields | Relationships |
|-------|--------|---------------|
| **User** | id, zalo_id, name, avatar, email, university, balance, is_tasker | posted_tasks, accepted_tasks, applications, messages |
| **Task** | id, title, description, price, status, requester_id, tasker_id, category_id | requester, tasker, applications, messages, transactions |
| **TaskApplication** | id, task_id, tasker_id, proposed_price, message, status | task, tasker |
| **Message** | id, task_id, sender_id, content, is_read, created_at | task, sender |
| **Transaction** | id, task_id, payer_id, payee_id, amount, platform_fee, type, status | task |
| **Wallet** | id, user_id, type, balance | user, transactions |

### 5.2 Frontend Component Structure

```
vieczzalo/src/
│
├── components/
│   ├── App.tsx              # Root component, routing, auth guard
│   │
│   ├── layout/              # Layout Components
│   │   ├── BottomNav.tsx    # Bottom navigation bar (Home, Tasks, Messages, Profile)
│   │   ├── AppHeader.tsx    # Top app bar with title, back button
│   │   └── PageContainer.tsx # Page wrapper with padding, scroll
│   │
│   ├── common/              # Reusable UI Components
│   │   ├── LoadingSpinner.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorDisplay.tsx
│   │   ├── GlobalSnackbar.tsx
│   │   ├── ConfirmDialog.tsx
│   │   └── PullToRefresh.tsx
│   │
│   ├── task/                # Task-specific Components
│   │   ├── TaskCard.tsx     # Task item display
│   │   ├── TaskList.tsx     # List of tasks
│   │   └── TaskFilters.tsx  # Filter sidebar/modal
│   │
│   ├── user/                # User Components
│   │   ├── UserAvatar.tsx
│   │   ├── RatingStars.tsx
│   │   └── UserProfileCard.tsx
│   │
│   └── chat/                # Chat Components
│       ├── ChatBubble.tsx
│       ├── ChatInput.tsx
│       ├── ConversationItem.tsx
│       └── TypingIndicator.tsx
│
├── pages/                   # Page Components (Routes)
│   ├── login.tsx
│   ├── home.tsx
│   ├── tasks/
│   │   ├── index.tsx        # Task listing
│   │   ├── create.tsx       # Create task form
│   │   └── detail.tsx       # Task detail view
│   ├── profile/
│   │   ├── index.tsx        # User profile
│   │   ├── edit.tsx         # Edit profile
│   │   └── tasker.tsx       # Become tasker registration
│   ├── messages/
│   │   ├── index.tsx        # Conversations list
│   │   └── chat.tsx         # Chat room
│   ├── notifications.tsx
│   ├── wallet.tsx
│   └── my-tasks.tsx
│
├── services/                # API Service Layer
│   ├── api.ts               # Base API client (JWT handling)
│   ├── auth.service.ts      # Login, logout, refresh
│   ├── tasks.service.ts     # Task CRUD, apply, accept
│   ├── users.service.ts     # Get profile, update
│   ├── messages.service.ts  # Chat, WebSocket
│   ├── payments.service.ts  # Payment operations
│   ├── wallet.service.ts    # Wallet balance, history
│   ├── notifications.service.ts
│   └── categories.service.ts
│
├── stores/                  # Jotai State Atoms
│   ├── auth.store.ts        # userAtom, tokenAtom
│   ├── tasks.store.ts       # tasksAtom, selectedTaskAtom
│   ├── chat.store.ts        # conversationsAtom, messagesAtom
│   ├── notifications.store.ts # notificationsAtom, unreadCountAtom
│   ├── wallet.store.ts      # walletBalanceAtom
│   └── ui.store.ts          # snackbarAtom, dialogAtom
│
├── hooks/                   # Custom React Hooks
│   ├── useAuth.ts           # Login, logout, checkAuth
│   ├── useTasks.ts          # Fetch tasks, create, update
│   ├── useChat.ts           # WebSocket connection, send message
│   ├── useNotifications.ts  # Fetch, mark as read
│   └── useWallet.ts         # Get balance, history
│
├── types/
│   └── index.ts             # TypeScript type definitions
│
└── utils/
    ├── format.ts            # Currency, date formatting
    └── constants.ts         # API URLs, status enums
```

**Component Hierarchy Example:**

```
App
├── RequireAuth
│   └── HomePage
│       ├── AppHeader
│       ├── PageContainer
│       │   ├── TaskList
│       │   │   └── TaskCard (x N)
│       │   └── EmptyState
│       └── BottomNav
└── GlobalSnackbar
```

---

## 6. Data Flow Diagrams

### 6.1 Authentication Flow (Zalo OAuth → JWT)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  User Opens  │     │  Zalo Mini   │     │   Backend    │     │   Database   │
│  Mini App    │     │     App      │     │   Server     │     │   (SQLite)   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       │  1. Launch         │                    │                    │
       │───────────────────►│                    │                    │
       │                    │                    │                    │
       │                    │  2. Check token    │                    │
       │                    │     in localStorage│                    │
       │                    │                    │                    │
       │                    │  3. No token found │                    │
       │                    │     → Redirect to  │                    │
       │                    │       /login       │                    │
       │                    │                    │                    │
       │  4. Click "Login"  │                    │                    │
       │◄───────────────────│                    │                    │
       │                    │                    │                    │
       │                    │  5. zmp.getAccessToken()               │
       │                    │─────────────────────────►              │
       │                    │                    │  (Zalo SDK)        │
       │                    │                    │                    │
       │                    │  6. Zalo access_token                  │
       │                    │◄─────────────────────────              │
       │                    │                    │                    │
       │                    │  7. POST /auth/zalo                    │
       │                    │  { access_token }  │                    │
       │                    │───────────────────►│                    │
       │                    │                    │                    │
       │                    │                    │  8. Verify token   │
       │                    │                    │     with Zalo API  │
       │                    │                    │                    │
       │                    │                    │  9. Get user profile
       │                    │                    │     (zalo_id, name)│
       │                    │                    │                    │
       │                    │                    │  10. Find or create│
       │                    │                    │      user record   │
       │                    │                    │───────────────────►│
       │                    │                    │                    │
       │                    │                    │  11. User record   │
       │                    │                    │◄───────────────────│
       │                    │                    │                    │
       │                    │                    │  12. Generate JWT  │
       │                    │                    │      - access_token│
       │                    │                    │      - refresh_token
       │                    │                    │      (15 min exp)  │
       │                    │                    │                    │
       │                    │  13. Return tokens │                    │
       │                    │  { access_token,   │                    │
       │                    │    refresh_token,  │                    │
       │                    │    user: {...} }   │                    │
       │                    │◄───────────────────│                    │
       │                    │                    │                    │
       │                    │  14. Store tokens  │                    │
       │                    │      in localStorage                    │
       │                    │                    │                    │
       │                    │  15. Update userAtom                    │
       │                    │      (Jotai)       │                    │
       │                    │                    │                    │
       │                    │  16. Redirect to   │                    │
       │                    │      HomePage      │                    │
       │                    │                    │                    │
       ▼                    ▼                    ▼                    ▼
```

**Subsequent Requests:**

```
Every API Request:

Frontend                 Backend
   │                        │
   │  GET /api/v1/tasks     │
   │  Authorization: Bearer │
   │  <access_token>        │
   │───────────────────────►│
   │                        │
   │                        │  Middleware: Verify JWT
   │                        │  - Check signature
   │                        │  - Check expiry
   │                        │  - Extract user_id
   │                        │
   │  Response              │
   │◄───────────────────────│
   │                        │

If token expired (401):

   │  401 Unauthorized      │
   │◄───────────────────────│
   │                        │
   │  POST /auth/refresh    │
   │  { refresh_token }     │
   │───────────────────────►│
   │                        │
   │  New access_token      │
   │◄───────────────────────│
   │                        │
   │  Retry original request│
   │───────────────────────►│
```

### 6.2 Task Creation and Payment Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TASK CREATION & PAYMENT FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

PHASE 1: Task Creation (Requester)

┌────────────┐      ┌────────────┐      ┌────────────┐      ┌────────────┐
│ Requester  │      │  Frontend  │      │  Backend   │      │  Database  │
└─────┬──────┘      └─────┬──────┘      └─────┬──────┘      └─────┬──────┘
      │                   │                   │                   │
      │  1. Fill form     │                   │                   │
      │  - Title          │                   │                   │
      │  - Description    │                   │                   │
      │  - Price          │                   │                   │
      │  - Category       │                   │                   │
      │──────────────────►│                   │                   │
      │                   │                   │                   │
      │  2. Submit        │                   │                   │
      │──────────────────►│                   │                   │
      │                   │                   │                   │
      │                   │  3. POST /tasks   │                   │
      │                   │  { title, desc,   │                   │
      │                   │    price, cat_id }│                   │
      │                   │──────────────────►│                   │
      │                   │                   │                   │
      │                   │                   │  4. Validate      │
      │                   │                   │     - Auth check  │
      │                   │                   │     - Input valid │
      │                   │                   │                   │
      │                   │                   │  5. INSERT task   │
      │                   │                   │     status='open' │
      │                   │                   │──────────────────►│
      │                   │                   │                   │
      │                   │                   │  6. Task record   │
      │                   │                   │◄──────────────────│
      │                   │                   │                   │
      │                   │  7. Task created  │                   │
      │                   │◄──────────────────│                   │
      │                   │                   │                   │
      │  8. Show success  │                   │                   │
      │◄──────────────────│                   │                   │
      │                   │                   │                   │

PHASE 2: Task Application (Tasker)

┌────────────┐      ┌────────────┐      ┌────────────┐      ┌────────────┐
│   Tasker   │      │  Frontend  │      │  Backend   │      │  Database  │
└─────┬──────┘      └─────┬──────┘      └─────┬──────┘      └─────┬──────┘
      │                   │                   │                   │
      │  9. Browse tasks  │                   │                   │
      │──────────────────►│                   │                   │
      │                   │                   │                   │
      │                   │  10. GET /tasks   │                   │
      │                   │  ?status=open     │                   │
      │                   │──────────────────►│                   │
      │                   │                   │                   │
      │                   │                   │  11. Query tasks  │
      │                   │                   │──────────────────►│
      │                   │                   │                   │
      │                   │  12. Task list    │                   │
      │                   │◄──────────────────│                   │
      │                   │                   │                   │
      │  13. Select task  │                   │                   │
      │  14. Click "Apply"│                   │                   │
      │──────────────────►│                   │                   │
      │                   │                   │                   │
      │                   │  15. POST /tasks/{id}/apply          │
      │                   │  { proposed_price,│                   │
      │                   │    message }      │                   │
      │                   │──────────────────►│                   │
      │                   │                   │                   │
      │                   │                   │  16. INSERT       │
      │                   │                   │      application  │
      │                   │                   │──────────────────►│
      │                   │                   │                   │
      │                   │                   │  17. Notify       │
      │                   │                   │      requester    │
      │                   │                   │                   │
      │  18. Applied      │                   │                   │
      │◄──────────────────│                   │                   │
      │                   │                   │                   │

PHASE 3: Accept & Payment (Requester)

┌────────────┐      ┌────────────┐      ┌────────────┐      ┌────────────┐
│ Requester  │      │  Frontend  │      │  Backend   │      │  Database  │
└─────┬──────┘      └─────┬──────┘      └─────┬──────┘      └─────┬──────┘
      │                   │                   │                   │
      │  19. View         │                   │                   │
      │      applications │                   │                   │
      │──────────────────►│                   │                   │
      │                   │                   │                   │
      │  20. Select tasker│                   │                   │
      │  21. Click "Accept"                   │                   │
      │──────────────────►│                   │                   │
      │                   │                   │                   │
      │                   │  22. POST /tasks/{id}/accept         │
      │                   │  { application_id }                  │
      │                   │──────────────────►│                   │
      │                   │                   │                   │
      │                   │                   │  23. UPDATE task  │
      │                   │                   │      status='accepted'
      │                   │                   │      tasker_id=X  │
      │                   │                   │──────────────────►│
      │                   │                   │                   │
      │  24. Confirm      │                   │                   │
      │      payment?     │                   │                   │
      │◄──────────────────│                   │                   │
      │                   │                   │                   │
      │  25. Confirm      │                   │                   │
      │──────────────────►│                   │                   │
      │                   │                   │                   │
      │                   │  26. POST /payments/create           │
      │                   │  { task_id }      │                   │
      │                   │──────────────────►│                   │
      │                   │                   │                   │
      │                   │                   │  27. Check balance│
      │                   │                   │──────────────────►│
      │                   │                   │                   │
      │                   │                   │  28. Move money:  │
      │                   │                   │   User wallet →   │
      │                   │                   │   Escrow wallet   │
      │                   │                   │──────────────────►│
      │                   │                   │                   │
      │                   │                   │  29. CREATE       │
      │                   │                   │      transaction  │
      │                   │                   │──────────────────►│
      │                   │                   │                   │
      │                   │  30. Payment      │                   │
      │                   │      escrowed     │                   │
      │                   │◄──────────────────│                   │
      │                   │                   │                   │
      │  31. Payment      │                   │                   │
      │      confirmed    │                   │                   │
      │◄──────────────────│                   │                   │
      │                   │                   │                   │

PHASE 4: Task Completion & Release

┌────────────┐      ┌────────────┐      ┌────────────┐      ┌────────────┐
│ Requester/ │      │  Frontend  │      │  Backend   │      │  Database  │
│  Tasker    │      │            │      │            │      │            │
└─────┬──────┘      └─────┬──────┘      └─────┬──────┘      └─────┬──────┘
      │                   │                   │                   │
      │  32. Complete task│                   │                   │
      │──────────────────►│                   │                   │
      │                   │                   │                   │
      │                   │  33. POST /tasks/{id}/complete       │
      │                   │──────────────────►│                   │
      │                   │                   │                   │
      │                   │                   │  34. UPDATE task  │
      │                   │                   │      status=      │
      │                   │                   │      'completed'  │
      │                   │                   │──────────────────►│
      │                   │                   │                   │
      │                   │  35. POST /payments/release/{task_id}│
      │                   │──────────────────►│                   │
      │                   │                   │                   │
      │                   │                   │  36. Calculate    │
      │                   │                   │      amounts:     │
      │                   │                   │      - Tasker: 90%│
      │                   │                   │      - Platform:  │
      │                   │                   │        10% fee    │
      │                   │                   │                   │
      │                   │                   │  37. Move money:  │
      │                   │                   │   Escrow →        │
      │                   │                   │   Tasker wallet   │
      │                   │                   │   + Platform      │
      │                   │                   │──────────────────►│
      │                   │                   │                   │
      │                   │  38. Payment      │                   │
      │                   │      released     │                   │
      │                   │◄──────────────────│                   │
      │                   │                   │                   │
      │  39. Payment      │                   │                   │
      │      received     │                   │                   │
      │◄──────────────────│                   │                   │
      │                   │                   │                   │
```

### 6.3 Real-time Chat (WebSocket)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       REAL-TIME CHAT FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

CONNECTION ESTABLISHMENT:

┌────────────┐      ┌────────────┐      ┌────────────┐      ┌────────────┐
│   User A   │      │  Frontend  │      │  Backend   │      │  Database  │
│(Requester) │      │            │      │ WebSocket  │      │            │
└─────┬──────┘      └─────┬──────┘      └─────┬──────┘      └─────┬──────┘
      │                   │                   │                   │
      │  1. Open chat     │                   │                   │
      │──────────────────►│                   │                   │
      │                   │                   │                   │
      │                   │  2. ws.connect    │                   │
      │                   │  /ws/chat/{task_id}                  │
      │                   │  ?token=<jwt>     │                   │
      │                   │──────────────────►│                   │
      │                   │                   │                   │
      │                   │                   │  3. Verify JWT    │
      │                   │                   │     - Valid?      │
      │                   │                   │     - User has    │
      │                   │                   │       access?     │
      │                   │                   │                   │
      │                   │                   │  4. Query task    │
      │                   │                   │──────────────────►│
      │                   │                   │                   │
      │                   │                   │  5. Task data     │
      │                   │                   │◄──────────────────│
      │                   │                   │                   │
      │                   │  6. Connection    │                   │
      │                   │     accepted      │                   │
      │                   │◄──────────────────│                   │
      │                   │                   │                   │
      │                   │                   │  7. Add to        │
      │                   │                   │     connection    │
      │                   │                   │     manager:      │
      │                   │                   │     task_connections
      │                   │                   │     [task_id].append(ws)
      │                   │                   │                   │
      │  8. Connected     │                   │                   │
      │◄──────────────────│                   │                   │
      │                   │                   │                   │

┌────────────┐      ┌────────────┐      ┌────────────┐      ┌────────────┐
│   User B   │      │  Frontend  │      │  Backend   │      │  Database  │
│  (Tasker)  │      │            │      │ WebSocket  │      │            │
└─────┬──────┘      └─────┬──────┘      └─────┬──────┘      └─────┬──────┘
      │                   │                   │                   │
      │  9. Open chat     │                   │                   │
      │──────────────────►│                   │                   │
      │                   │                   │                   │
      │                   │  10. ws.connect   │                   │
      │                   │──────────────────►│                   │
      │                   │                   │                   │
      │                   │  11. Connection   │                   │
      │                   │      accepted     │                   │
      │                   │◄──────────────────│                   │
      │                   │                   │                   │
      │                   │                   │  12. Broadcast    │
      │                   │                   │      "user_joined"│
      │  13. "User B joined"                 │      to all in    │
      │◄──────────────────│◄──────────────────│      task_id      │
      │                   │                   │                   │

SENDING MESSAGES:

┌────────────┐      ┌────────────┐      ┌────────────┐      ┌────────────┐
│   User A   │      │  Frontend  │      │  Backend   │      │  Database  │
└─────┬──────┘      └─────┬──────┘      └─────┬──────┘      └─────┬──────┘
      │                   │                   │                   │
      │  14. Type message │                   │                   │
      │  15. Press send   │                   │                   │
      │──────────────────►│                   │                   │
      │                   │                   │                   │
      │                   │  16. ws.send()    │                   │
      │                   │  { type: "message"│                   │
      │                   │    content: "Hi!" }                   │
      │                   │──────────────────►│                   │
      │                   │                   │                   │
      │                   │                   │  17. INSERT msg   │
      │                   │                   │      in database  │
      │                   │                   │──────────────────►│
      │                   │                   │                   │
      │                   │                   │  18. Message      │
      │                   │                   │      saved        │
      │                   │                   │◄──────────────────│
      │                   │                   │                   │
      │                   │                   │  19. Broadcast    │
      │                   │                   │      to all       │
      │                   │                   │      connections  │
      │                   │                   │      in task      │
      │                   │                   │                   │
┌────────────┐      ┌────────────┐              │                   │
│   User B   │      │  Frontend  │              │                   │
└─────┬──────┘      └─────┬──────┘              │                   │
      │                   │                   │                   │
      │                   │  20. ws.onmessage │                   │
      │                   │  { type: "message"│                   │
      │                   │    content: "Hi!" }                   │
      │                   │◄──────────────────│                   │
      │                   │                   │                   │
      │  21. Display msg  │                   │                   │
      │◄──────────────────│                   │                   │
      │                   │                   │                   │
      │                   │  22. CREATE       │                   │
      │                   │      notification │                   │
      │                   │──────────────────►│                   │
      │                   │                   │──────────────────►│
      │                   │                   │                   │

TYPING INDICATOR:

┌────────────┐      ┌────────────┐      ┌────────────┐
│   User A   │      │  Frontend  │      │  Backend   │
└─────┬──────┘      └─────┬──────┘      └─────┬──────┘
      │                   │                   │
      │  23. Start typing │                   │
      │──────────────────►│                   │
      │                   │                   │
      │                   │  24. ws.send()    │
      │                   │  { type: "typing" │
      │                   │    is_typing: true}
      │                   │──────────────────►│
      │                   │                   │
      │                   │                   │  25. Broadcast
      │                   │                   │      to others
      │                   │                   │      (not sender)
      │                   │                   │
┌────────────┐      ┌────────────┐              │
│   User B   │      │  Frontend  │              │
└─────┬──────┘      └─────┬──────┘              │
      │                   │                   │
      │                   │  26. ws.onmessage │
      │                   │  { type: "typing" }
      │                   │◄──────────────────│
      │                   │                   │
      │  27. Show "User A │                   │
      │      is typing..."│                   │
      │◄──────────────────│                   │
      │                   │                   │
```

---

## 7. Scalability Considerations

### 7.1 Current Architecture Capacity

| Component | Current Capacity | Bottleneck |
|-----------|------------------|------------|
| **FastAPI Server** | ~500 req/s (4 workers) | CPU, worker count |
| **SQLite Database** | ~50 concurrent writes | Single-file lock |
| **WebSocket** | ~1,000 concurrent connections | Memory, event loop |
| **Nginx** | ~10,000 req/s | Upstream backend |
| **Network** | 1 Gbps | Bare metal server |

### 7.2 Scaling Strategy (3 Phases)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SCALING ROADMAP                                      │
└─────────────────────────────────────────────────────────────────────────────┘

PHASE 1: MVP (Current) - Up to 1,000 Daily Users
┌─────────────────────────────────────────────────────────────┐
│                      Single Server                           │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │  Nginx   │───►│ FastAPI  │───►│  SQLite  │              │
│  │          │    │ 4 workers│    │          │              │
│  └──────────┘    └──────────┘    └──────────┘              │
│                                                             │
│  Capacity: 1K users, 500 req/s                             │
│  Cost: 0 VND (bare metal)                                  │
└─────────────────────────────────────────────────────────────┘
         │
         │ When: >1,000 daily users, >10K tasks
         ▼

PHASE 2: Database Migration - Up to 10,000 Daily Users
┌─────────────────────────────────────────────────────────────┐
│                      Single Server                           │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐          │
│  │  Nginx   │───►│ FastAPI  │───►│ PostgreSQL   │          │
│  │          │    │ 8 workers│    │ (Separate DB)│          │
│  └──────────┘    └──────────┘    └──────────────┘          │
│                                                             │
│  Capacity: 10K users, 1K req/s                             │
│  Cost: ~200K VND/month (managed PostgreSQL)                │
│                                                             │
│  Changes:                                                   │
│  - Migrate from SQLite to PostgreSQL                       │
│  - Add connection pooling                                  │
│  - Increase worker count                                   │
│  - Add database indexes                                    │
└─────────────────────────────────────────────────────────────┘
         │
         │ When: >10,000 daily users, response time degradation
         ▼

PHASE 3: Horizontal Scaling - Up to 100,000+ Daily Users
┌─────────────────────────────────────────────────────────────┐
│                    Multi-Server Architecture                 │
│                                                             │
│  ┌──────────────────────────────────────────────┐          │
│  │          Nginx Load Balancer                 │          │
│  └─────────────┬─────────────┬──────────────────┘          │
│                │             │                              │
│     ┌──────────▼────┐   ┌────▼──────────┐                  │
│     │  FastAPI #1   │   │  FastAPI #2   │                  │
│     │  8 workers    │   │  8 workers    │                  │
│     └──────────┬────┘   └────┬──────────┘                  │
│                │             │                              │
│                └─────┬───────┘                              │
│                      │                                      │
│              ┌───────▼───────┐                              │
│              │  PostgreSQL   │                              │
│              │  (Replicated) │                              │
│              │  Primary +    │                              │
│              │  Read Replicas│                              │
│              └───────────────┘                              │
│                                                             │
│  ┌──────────────────────────────────────────────┐          │
│  │          Redis (Session + Cache)             │          │
│  └──────────────────────────────────────────────┘          │
│                                                             │
│  Capacity: 100K+ users, 5K req/s                           │
│  Cost: ~2M VND/month (cloud hosting)                       │
│                                                             │
│  Changes:                                                   │
│  - Add 2+ API servers                                      │
│  - Nginx load balancing (round-robin)                      │
│  - PostgreSQL replication (primary + read replicas)        │
│  - Redis for session storage and caching                   │
│  - CDN for static assets                                   │
│  - Separate WebSocket servers                              │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 Optimization Techniques

**Database Optimization:**
- Add composite indexes for common queries
- Implement query result caching (Redis)
- Use read replicas for read-heavy operations
- Connection pooling (PgBouncer)

**API Optimization:**
- Response compression (gzip)
- API response caching (Redis)
- Pagination for list endpoints
- Field selection (sparse fieldsets)

**Frontend Optimization:**
- Code splitting (React.lazy)
- Image lazy loading
- Service Worker caching
- Bundle size optimization

**WebSocket Optimization:**
- Separate WebSocket servers from API
- Redis Pub/Sub for cross-server messaging
- Message batching
- Connection pooling

---

## 8. Infrastructure & Deployment

### 8.1 Current Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       BARE METAL SERVER                                      │
│                       (Ubuntu 22.04 LTS)                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        NGINX (Port 80/443)                             │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │  Configuration:                                                        │ │
│  │  - SSL/TLS termination (Let's Encrypt)                                │ │
│  │  - Reverse proxy to FastAPI (localhost:8000)                          │ │
│  │  - Rate limiting: 100 req/min per IP                                  │ │
│  │  - Request size limit: 10MB                                           │ │
│  │  - Security headers (HSTS, CSP, X-Frame-Options)                      │ │
│  │  - Gzip compression                                                   │ │
│  │  - Static file serving                                                │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                                    │ Proxy Pass                              │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                  GUNICORN + UVICORN (Port 8000)                        │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │  Configuration:                                                        │ │
│  │  - 4 Uvicorn workers                                                  │ │
│  │  - Worker class: uvicorn.workers.UvicornWorker                        │ │
│  │  - Bind: 127.0.0.1:8000                                               │ │
│  │  - Graceful restart (systemd)                                         │ │
│  │  - Access/Error logs                                                  │ │
│  │                                                                        │ │
│  │  FastAPI Application:                                                 │ │
│  │  - /api/v1/* endpoints                                                │ │
│  │  - /ws/chat/* WebSocket                                               │ │
│  │  - /health, /docs                                                     │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                                    │ SQLAlchemy                              │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                   SQLITE DATABASE                                      │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │  Location: /var/www/viecz-backend/data/viecz.db                   │ │
│  │  Backup: Daily cron job → S3/Cloud storage                            │ │
│  │  Permissions: www-data:www-data (644)                                 │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      FILE STORAGE                                      │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │  Location: /var/www/viecz-backend/uploads/                          │ │
│  │  - avatars/                                                            │ │
│  │  - task_images/                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                       SYSTEMD SERVICE                                  │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │  Unit: viecz.service                                                │ │
│  │  - Auto-restart on failure                                            │ │
│  │  - Starts after network.target                                        │ │
│  │  - User: www-data                                                     │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         MONITORING                                     │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │  Logs:                                                                │ │
│  │  - /var/log/nginx/access.log                                          │ │
│  │  - /var/log/nginx/error.log                                           │ │
│  │  - /var/log/viecz/app.log                                           │ │
│  │                                                                        │ │
│  │  Health Check: /health endpoint (every 1 min)                         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Deployment Process

```bash
# Deployment Script: /home/deploy/deploy.sh

#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# 1. Pull latest code
cd /var/www/viecz-backend
git fetch origin
git checkout main
git pull origin main

# 2. Activate virtual environment (uv)
source .venv/bin/activate

# 3. Install dependencies
uv sync

# 4. Run database migrations
uv run alembic upgrade head

# 5. Run tests (optional in production)
# uv run pytest tests/ -v

# 6. Restart FastAPI service
sudo systemctl restart viecz

# 7. Verify service is running
sleep 3
sudo systemctl status viecz

# 8. Test health endpoint
curl http://localhost:8000/health

echo "✅ Deployment complete!"
```

### 8.3 Nginx Configuration

```nginx
# /etc/nginx/sites-available/viecz

upstream backend {
    server 127.0.0.1:8000;
}

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name api.viecz.vn;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name api.viecz.vn;

    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.viecz.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.viecz.vn/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    # Max Request Size
    client_max_body_size 10M;

    # API Endpoints
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;  # 1 hour timeout for WebSocket
        proxy_send_timeout 3600s;
    }

    # Health Check
    location /health {
        proxy_pass http://backend;
        access_log off;
    }

    # Static Files (if any)
    location /static/ {
        alias /var/www/viecz-backend/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Deny access to sensitive files
    location ~ /\. {
        deny all;
    }
}
```

### 8.4 Systemd Service Configuration

```ini
# /etc/systemd/system/viecz.service

[Unit]
Description=Viecz FastAPI Application
After=network.target

[Service]
Type=exec
User=www-data
Group=www-data
WorkingDirectory=/var/www/viecz-backend
Environment="PATH=/var/www/viecz-backend/.venv/bin"
ExecStart=/var/www/viecz-backend/.venv/bin/gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 \
    --access-logfile /var/log/viecz/access.log \
    --error-logfile /var/log/viecz/error.log \
    --log-level info
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 8.5 Backup Strategy

```bash
# Backup Script: /home/deploy/backup.sh

#!/bin/bash
# Run daily via cron: 0 2 * * * /home/deploy/backup.sh

BACKUP_DIR="/backups/viecz"
DATE=$(date +%Y%m%d_%H%M%S)
DB_FILE="/var/www/viecz-backend/data/viecz.db"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
sqlite3 $DB_FILE ".backup '$BACKUP_DIR/viecz_$DATE.db'"

# Compress
gzip $BACKUP_DIR/viecz_$DATE.db

# Upload to S3/Cloud (future)
# aws s3 cp $BACKUP_DIR/viecz_$DATE.db.gz s3://viecz-backups/

# Keep only last 7 days
find $BACKUP_DIR -name "viecz_*.db.gz" -mtime +7 -delete

echo "Backup completed: viecz_$DATE.db.gz"
```

---

## 9. Appendix

### 9.1 Technology Decision Matrix

| Decision Point | Options Considered | Chosen | Rationale |
|----------------|-------------------|--------|-----------|
| **Backend Framework** | FastAPI, Django, Flask | **FastAPI** | High performance, async, auto OpenAPI docs, modern Python |
| **Database (MVP)** | SQLite, PostgreSQL, MySQL | **SQLite** | Zero-config, serverless, sufficient for <10K users |
| **Frontend Framework** | React, Vue, Angular | **React** | Large ecosystem, team expertise, Zalo SDK support |
| **State Management** | Redux, Jotai, Zustand | **Jotai** | Atomic, simple API, TypeScript friendly, less boilerplate |
| **UI Library** | Material UI, Ant Design, Custom | **Material UI** | Rich components, good documentation, theming |
| **Router** | BrowserRouter, HashRouter | **HashRouter** | Required for Zalo webview (no server-side routing) |
| **Authentication** | JWT, Session | **JWT** | Stateless, scalable, mobile-friendly |
| **Real-time** | WebSocket, Polling, SSE | **WebSocket** | Full-duplex, low latency, built into FastAPI |

### 9.2 API Endpoint Summary

| Category | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| **Auth** | `/api/v1/auth/zalo` | POST | Zalo OAuth login |
| | `/api/v1/auth/dev-login` | POST | Dev login (DEBUG only) |
| | `/api/v1/auth/refresh` | POST | Refresh JWT token |
| **Users** | `/api/v1/users/me` | GET | Current user profile |
| | `/api/v1/users/me` | PUT | Update profile |
| | `/api/v1/users/become-tasker` | POST | Register as Tasker |
| **Tasks** | `/api/v1/tasks` | GET | List tasks (with filters) |
| | `/api/v1/tasks` | POST | Create task |
| | `/api/v1/tasks/{id}` | GET | Task details |
| | `/api/v1/tasks/{id}` | PUT | Update task |
| | `/api/v1/tasks/{id}` | DELETE | Cancel task |
| | `/api/v1/tasks/{id}/apply` | POST | Apply for task (Tasker) |
| | `/api/v1/tasks/{id}/accept` | POST | Accept application (Requester) |
| | `/api/v1/tasks/{id}/complete` | POST | Mark task complete |
| **Payments** | `/api/v1/payments/create` | POST | Create escrow payment |
| | `/api/v1/payments/release/{task_id}` | POST | Release payment to tasker |
| **Wallet** | `/api/v1/wallet/balance` | GET | Get wallet balance |
| | `/api/v1/wallet/history` | GET | Transaction history |
| **Messages** | `/api/v1/tasks/{id}/messages` | GET | Get chat messages |
| | `/ws/chat/{task_id}` | WS | WebSocket chat |
| **Notifications** | `/api/v1/notifications` | GET | Get notifications |
| | `/api/v1/notifications/{id}/read` | PUT | Mark as read |
| **Categories** | `/api/v1/categories` | GET | List categories |

### 9.3 Database Schema Summary

```sql
-- Core Tables

users (
  id, zalo_id, name, avatar_url, email, university,
  student_id, is_verified, rating, balance, is_tasker,
  tasker_bio, tasker_skills, created_at, updated_at
)

categories (
  id, name, name_vi, icon, is_active
)

tasks (
  id, requester_id, tasker_id, category_id, title,
  description, price, status, location_from, location_to,
  deadline, created_at, updated_at
)

task_applications (
  id, task_id, tasker_id, proposed_price, message,
  status, created_at
)

messages (
  id, task_id, sender_id, content, is_read, created_at
)

transactions (
  id, task_id, payer_id, payee_id, amount, platform_fee,
  type, status, zalopay_transaction_id, created_at
)

wallets (
  id, user_id, type, balance, created_at, updated_at
)

wallet_transactions (
  id, wallet_id, amount, direction, trans_type, task_id,
  description, created_at
)

notifications (
  id, user_id, title, content, type, reference_id,
  is_read, created_at
)
```

### 9.4 Environment Variables Reference

```bash
# Backend (.env)

# Server
ENVIRONMENT=production
DEBUG=false
API_URL=https://api.viecz.vn
CORS_ORIGINS=["https://h5.zalo.me","https://stc-h5.zalo.me"]

# Database
DATABASE_URL=sqlite:///./data/viecz.db

# JWT
JWT_SECRET=your-super-secret-key-at-least-32-chars
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Zalo
ZALO_APP_ID=your-app-id
ZALO_APP_SECRET=your-app-secret
ZALO_MINIAPP_ID=your-miniapp-id
ZALO_OAUTH_REDIRECT_URL=https://api.viecz.vn/api/v1/auth/zalo/callback

# ZaloPay
ZALOPAY_APP_ID=2553
ZALOPAY_KEY1=PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL
ZALOPAY_KEY2=kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz
ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn/v2

# Platform
PLATFORM_FEE_PERCENT=10

# Mock Payment
MOCK_PAYMENT_ENABLED=true
MOCK_INITIAL_BALANCE=1000000

# Logging
LOG_LEVEL=INFO
LOG_DIR=/var/log/viecz
```

```bash
# Frontend (.env)

APP_ID=your_zalo_app_id
ZMP_TOKEN=your_zmp_token
VITE_API_URL=https://api.viecz.vn/api/v1
VITE_WS_URL=wss://api.viecz.vn
```

### 9.5 Performance Benchmarks (Target)

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| **API Response Time** | p50: <100ms | TBD | Average response time |
| | p95: <200ms | TBD | 95th percentile |
| | p99: <500ms | TBD | 99th percentile |
| **Database Query** | <50ms | TBD | Simple queries |
| **Page Load Time** | <2s | TBD | First contentful paint |
| **WebSocket Latency** | <100ms | TBD | Message delivery |
| **Concurrent Users** | 1,000 | TBD | Simultaneous connections |
| **Requests/Second** | 500 | TBD | Peak throughput |

### 9.6 Security Checklist

```markdown
## Production Security Checklist

### Infrastructure
- [x] HTTPS enforced (TLS 1.2+)
- [x] Firewall configured (ports 80, 443, 22 only)
- [ ] SSH key-only authentication
- [ ] Fail2ban configured
- [ ] Regular OS security updates

### Application
- [x] JWT secret is strong (32+ chars)
- [x] CORS configured (whitelist origins)
- [x] Input validation (Pydantic)
- [x] SQL injection prevention (SQLAlchemy ORM)
- [x] XSS prevention (output encoding)
- [ ] CSRF protection tested
- [x] Rate limiting configured
- [ ] Error messages don't leak info

### Data
- [x] Database access restricted
- [ ] Daily automated backups
- [ ] Backup encryption
- [ ] PII handling compliant (PDPA)
- [x] Logging excludes sensitive data

### Monitoring
- [ ] Failed login attempts logged
- [ ] Suspicious activity alerts
- [ ] Security headers verified
- [ ] SSL certificate auto-renewal
```

### 9.7 Related Documentation

| Document | Location | Purpose |
|----------|----------|---------|
| **Architecture** | `technical/ARCHITECTURE.md` | Detailed architecture document |
| **ZaloPay Integration** | `technical/ZALOPAY_INTEGRATION.md` | Payment integration guide |
| **Backend README** | `backend/README.md` | Backend setup and API |
| **Frontend README** | `vieczzalo/README.md` | Frontend setup and structure |
| **Business Plan** | `research/Business-Plan-Dich-Vu-Nho-SV-v2.md` | Business strategy |
| **Project CLAUDE.md** | `CLAUDE.md` | Project overview for AI |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-04 | Claude Code | Initial system design document |

---

**This is a living document. Update as the system evolves.**
