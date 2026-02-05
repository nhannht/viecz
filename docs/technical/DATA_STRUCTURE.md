# DATA_STRUCTURE.md

**Project:** Viecz - Dịch Vụ Nhỏ Cho Sinh Viên
**Last Updated:** 2026-02-04

This document provides a comprehensive overview of all data structures used in the Viecz platform, including database models, API schemas, and frontend types.

---

## Table of Contents

1. [Database Models (SQLAlchemy)](#database-models-sqlalchemy)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [API Schemas (Pydantic)](#api-schemas-pydantic)
4. [Frontend Types (TypeScript)](#frontend-types-typescript)
5. [Enums and Constants](#enums-and-constants)
6. [Indexes and Constraints](#indexes-and-constraints)

---

## Database Models (SQLAlchemy)

The backend uses SQLAlchemy 2.x ORM with SQLite. All models inherit from `app.database.Base`.

### 1. User Model

**Location:** `backend/app/models/user.py:12-103`

Represents both Requesters (who post tasks) and Taskers (who perform tasks).

```python
class User(Base):
    __tablename__ = "users"

    # Primary Key
    id: Integer (PK, indexed)

    # Identity
    zalo_id: String(50) (unique, indexed, NOT NULL)  # Zalo user ID
    name: String(100) (NOT NULL)
    avatar_url: String(500) (nullable)
    phone: String(20) (nullable)
    email: String(100) (nullable)

    # Student Information
    university: String(100) (default: "ĐHQG-HCM")
    student_id: String(20) (nullable)
    is_verified: Boolean (default: False)

    # Statistics
    rating: Float (default: 5.0)  # Average rating (1-5)
    total_tasks_completed: Integer (default: 0)
    total_tasks_posted: Integer (default: 0)
    total_earnings: Integer (default: 0)  # Display only, actual in Wallet

    # Tasker Profile
    is_tasker: Boolean (default: False)  # Has registered as Tasker
    tasker_bio: String(500) (nullable)
    tasker_skills: JSON (default: [])  # Array of skill strings

    # Timestamps
    created_at: DateTime (default: utcnow)
    updated_at: DateTime (onupdate: utcnow)

    # Relationships
    posted_tasks → Task[] (FK: Task.requester_id)
    accepted_tasks → Task[] (FK: Task.tasker_id)
    applications → TaskApplication[]
    sent_messages → Message[] (FK: Message.sender_id)
    received_messages → Message[] (FK: Message.receiver_id)
    reviews_given → Review[] (FK: Review.reviewer_id)
    reviews_received → Review[] (FK: Review.reviewee_id)
    notifications → Notification[]
    wallet → Wallet (one-to-one)
```

**Key Design Decisions:**
- Single user table for both roles (not separate Requester/Tasker tables)
- `is_tasker` flag determines if user can accept tasks
- Balance stored in separate Wallet model (not in User)
- `tasker_skills` stored as JSON array for flexibility

---

### 2. Task Model

**Location:** `backend/app/models/task.py:23-104`

Represents a service request posted by a Requester.

```python
class Task(Base):
    __tablename__ = "tasks"

    # Primary Key
    id: Integer (PK, indexed)

    # Foreign Keys
    requester_id: Integer (FK: users.id, ON DELETE CASCADE, indexed)
    tasker_id: Integer (FK: users.id, ON DELETE SET NULL, indexed, nullable)
    category_id: Integer (FK: categories.id, indexed)

    # Task Details
    title: String(200) (NOT NULL)
    description: Text (nullable)
    price: Integer (NOT NULL)  # Amount in VND
    price_negotiable: Boolean (default: False)

    # Status
    status: String(20) (default: "open", indexed)
        # Values: open, accepted, in_progress, completed, cancelled, disputed

    # Location
    location_from: String(200) (nullable)
    location_to: String(200) (nullable)

    # Timing
    deadline: DateTime (nullable)
    completed_at: DateTime (nullable)
    cancelled_at: DateTime (nullable)
    cancellation_reason: String(500) (nullable)

    # Timestamps
    created_at: DateTime (default: utcnow)
    updated_at: DateTime (onupdate: utcnow)

    # Relationships
    requester → User
    tasker → User (nullable)
    category → Category
    applications → TaskApplication[]
    messages → Message[]
    reviews → Review[]
    transactions → Transaction[]
```

**State Transitions:**
```
open → accepted → in_progress → completed
  ↓                   ↓
cancelled         cancelled
```

---

### 3. TaskApplication Model

**Location:** `backend/app/models/task_application.py:20-60`

Represents a Tasker's application to perform a task.

```python
class TaskApplication(Base):
    __tablename__ = "task_applications"

    # Primary Key
    id: Integer (PK, indexed)

    # Foreign Keys
    task_id: Integer (FK: tasks.id, ON DELETE CASCADE, indexed)
    tasker_id: Integer (FK: users.id, ON DELETE CASCADE, indexed)

    # Application Details
    proposed_price: Integer (nullable)  # Counter-offer price
    message: String(500) (nullable)     # Application message
    status: String(20) (default: "pending")
        # Values: pending, accepted, rejected

    # Timestamps
    created_at: DateTime (default: utcnow)

    # Relationships
    task → Task
    tasker → User

    # Constraints
    UNIQUE(task_id, tasker_id)  # One application per tasker per task
```

---

### 4. Category Model

**Location:** `backend/app/models/category.py:11-27`

Task categories for classification.

```python
class Category(Base):
    __tablename__ = "categories"

    # Primary Key
    id: Integer (PK, indexed)

    # Category Info
    name: String(50) (NOT NULL)        # English name
    name_vi: String(50) (NOT NULL)     # Vietnamese name
    icon: String(50) (nullable)        # Icon identifier
    is_active: Boolean (default: True)

    # Relationships
    tasks → Task[]
```

**Example Categories:**
- `delivery` / `Giao hàng`
- `tutoring` / `Gia sư`
- `cleaning` / `Dọn dẹp`
- `tech_support` / `Hỗ trợ kỹ thuật`

---

### 5. Transaction Model

**Location:** `backend/app/models/transaction.py:31-74`

Tracks payment transactions through ZaloPay (or mock system).

```python
class Transaction(Base):
    __tablename__ = "transactions"

    # Primary Key
    id: Integer (PK, indexed)

    # Foreign Keys
    task_id: Integer (FK: tasks.id, ON DELETE SET NULL, nullable)
    payer_id: Integer (FK: users.id, ON DELETE SET NULL, nullable)
    payee_id: Integer (FK: users.id, ON DELETE SET NULL, nullable)

    # Transaction Details
    amount: Integer (NOT NULL)  # Amount in VND
    platform_fee: Integer (default: 0)  # Platform commission
    type: String(20) (NOT NULL)
        # Values: escrow, release, refund, withdrawal
    status: String(20) (default: "pending")
        # Values: pending, processing, success, failed, released, refunded

    # ZaloPay Integration
    zalopay_trans_id: String(100) (indexed, nullable)      # Our transaction ID
    zalopay_zp_trans_id: String(100) (nullable)            # ZaloPay's transaction ID

    # Timestamps
    created_at: DateTime (default: utcnow)
    updated_at: DateTime (onupdate: utcnow)

    # Relationships
    task → Task
```

---

### 6. Wallet Model

**Location:** `backend/app/models/wallet.py:31-67`

Virtual wallet for mock payment system (dev mode).

```python
class Wallet(Base):
    __tablename__ = "wallets"

    # Primary Key
    id: Integer (PK, indexed)

    # Owner
    user_id: Integer (FK: users.id, unique, nullable)  # Null for platform wallets

    # Wallet Type
    type: String(20) (default: "user")
        # Values: user, escrow, platform

    # Balance
    balance: BigInteger (default: 0)         # Total balance in VND
    frozen_balance: BigInteger (default: 0)  # Amount locked in escrow

    # Timestamps
    created_at: DateTime (server_default: now())
    updated_at: DateTime (onupdate: now())

    # Relationships
    user → User (one-to-one)
    transactions → WalletTransaction[]

    # Computed Properties
    @property
    available_balance() -> int:
        return balance - frozen_balance
```

**Wallet Types:**
- **user**: Individual user wallet
- **escrow**: Platform escrow holding payments
- **platform**: Platform revenue wallet (fees)

---

### 7. WalletTransaction Model

**Location:** `backend/app/models/wallet.py:69-114`

Transaction history for wallet operations.

```python
class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    # Primary Key
    id: Integer (PK, indexed)

    # Foreign Keys
    wallet_id: Integer (FK: wallets.id, NOT NULL)
    task_id: Integer (FK: tasks.id, nullable)
    related_transaction_id: Integer (FK: transactions.id, nullable)

    # Transaction Details
    type: String(30) (NOT NULL)
        # Values: deposit, withdraw, escrow_hold, escrow_release,
        #         escrow_refund, platform_fee
    amount: BigInteger (NOT NULL)        # Absolute value
    direction: String(10) (NOT NULL)     # 'credit' or 'debit'
    balance_after: BigInteger (NOT NULL) # Balance snapshot after transaction
    description: String(500) (nullable)
    reference_id: String(100) (nullable) # External reference

    # Timestamps
    created_at: DateTime (server_default: now())

    # Relationships
    wallet → Wallet
    task → Task
```

---

### 8. Message Model

**Location:** `backend/app/models/message.py:12-52`

Chat messages between Requester and Tasker for a specific task.

```python
class Message(Base):
    __tablename__ = "messages"

    # Primary Key
    id: Integer (PK, indexed)

    # Foreign Keys
    task_id: Integer (FK: tasks.id, ON DELETE CASCADE, indexed)
    sender_id: Integer (FK: users.id, ON DELETE CASCADE)
    receiver_id: Integer (FK: users.id, ON DELETE CASCADE)

    # Message Content
    content: Text (NOT NULL)
    is_read: Boolean (default: False)
    read_at: DateTime (nullable)

    # Timestamps
    created_at: DateTime (default: utcnow)

    # Relationships
    task → Task
    sender → User
    receiver → User
```

**Design Note:** Messages are task-scoped (not user-to-user DMs). Each task has its own conversation thread.

---

### 9. Review Model

**Location:** `backend/app/models/review.py:12-64`

Ratings and reviews after task completion.

```python
class Review(Base):
    __tablename__ = "reviews"

    # Primary Key
    id: Integer (PK, indexed)

    # Foreign Keys
    task_id: Integer (FK: tasks.id, ON DELETE CASCADE)
    reviewer_id: Integer (FK: users.id, ON DELETE CASCADE)
    reviewee_id: Integer (FK: users.id, ON DELETE CASCADE)

    # Review Content
    rating: Integer (NOT NULL)  # 1-5 stars
    comment: String(500) (nullable)
    is_for_tasker: Boolean (NOT NULL)  # True if reviewing Tasker, False if Requester

    # Timestamps
    created_at: DateTime (default: utcnow)

    # Relationships
    task → Task
    reviewer → User
    reviewee → User

    # Constraints
    UNIQUE(task_id, reviewer_id)  # One review per user per task
```

**Review Flow:**
- Requester reviews Tasker (is_for_tasker=True)
- Tasker reviews Requester (is_for_tasker=False)

---

### 10. Notification Model

**Location:** `backend/app/models/notification.py:49-80`

User notifications for various events.

```python
class Notification(Base):
    __tablename__ = "notifications"

    # Primary Key
    id: Integer (PK, indexed)

    # Foreign Keys
    user_id: Integer (FK: users.id, ON DELETE CASCADE, indexed)
    task_id: Integer (FK: tasks.id, ON DELETE SET NULL, nullable)

    # Notification Content
    title: String(100) (NOT NULL)
    message: String(500) (nullable)
    type: String(20) (NOT NULL)
        # Values: task_created, task_update, task_completed, task_cancelled,
        #         new_application, application_accepted, application_rejected,
        #         payment, payment_received, wallet_deposit, wallet_withdraw,
        #         message, new_message, review, new_review,
        #         user_login, user_logout, became_tasker, system
    is_read: Boolean (default: False, indexed)
    read_at: DateTime (nullable)

    # Timestamps
    created_at: DateTime (default: utcnow)

    # Relationships
    user → User
```

---

### 11. Report Model

**Location:** `backend/app/models/report.py:20-54`

User reports for misconduct or disputes.

```python
class Report(Base):
    __tablename__ = "reports"

    # Primary Key
    id: Integer (PK, indexed)

    # Foreign Keys
    reporter_id: Integer (FK: users.id, ON DELETE CASCADE)
    reported_user_id: Integer (FK: users.id, ON DELETE CASCADE)
    task_id: Integer (FK: tasks.id, ON DELETE SET NULL, nullable)

    # Report Content
    reason: Text (NOT NULL)
    status: String(20) (default: "pending")
        # Values: pending, investigating, resolved, dismissed
    admin_notes: Text (nullable)

    # Timestamps
    created_at: DateTime (default: utcnow)
```

---

## Entity Relationship Diagram

```
┌─────────────────┐
│     User        │
│─────────────────│
│ id (PK)         │◄──────┐
│ zalo_id (UQ)    │       │
│ name            │       │
│ is_tasker       │       │
│ rating          │       │
│ ...             │       │
└─────────────────┘       │
     │ │ │ │             │
     │ │ │ │ 1:1        │
     │ │ │ └──────────┐  │
     │ │ │            │  │
     │ │ │            ▼  │
     │ │ │      ┌─────────────┐
     │ │ │      │   Wallet    │
     │ │ │      │─────────────│
     │ │ │      │ id (PK)     │
     │ │ │      │ user_id(FK) │
     │ │ │      │ balance     │
     │ │ │      │ frozen_bal  │
     │ │ │      └─────────────┘
     │ │ │                │
     │ │ │                │ 1:N
     │ │ │                ▼
     │ │ │      ┌────────────────────┐
     │ │ │      │ WalletTransaction  │
     │ │ │      │────────────────────│
     │ │ │      │ id (PK)            │
     │ │ │      │ wallet_id (FK)     │
     │ │ │      │ type               │
     │ │ │      │ amount             │
     │ │ │      └────────────────────┘
     │ │ │
     │ │ │ 1:N (as requester)
     │ │ └────────────────┐
     │ │                  │
     │ │ 1:N (as tasker)  │
     │ └──────────┐       │
     │            │       │
     │ 1:N        ▼       ▼
     │      ┌──────────────────────┐
     │      │  TaskApplication     │       ┌─────────────┐
     │      │──────────────────────│       │  Category   │
     │      │ id (PK)              │       │─────────────│
     │      │ task_id (FK) ────────┼──┐    │ id (PK)     │
     │      │ tasker_id (FK) ◄─────┼──┼───►│ name        │
     │      │ status               │  │    │ name_vi     │
     │      └──────────────────────┘  │    └─────────────┘
     │                                 │          │
     │                                 │          │ 1:N
     │                                 │          │
     │                                 ▼          ▼
     │                           ┌──────────────────────┐
     │                           │       Task           │
     │                           │──────────────────────│
     │                           │ id (PK)              │
     └───────────────────────────┤ requester_id (FK)    │
                                 │ tasker_id (FK)       │
                                 │ category_id (FK)     │
                                 │ title                │
                                 │ price                │
                                 │ status               │
                                 └──────────────────────┘
                                    │ │ │ │
                      ┌─────────────┘ │ │ └─────────┐
                      │ 1:N           │ │           │ 1:N
                      ▼               │ │           ▼
            ┌──────────────┐          │ │     ┌──────────────┐
            │   Message    │          │ │     │ Transaction  │
            │──────────────│          │ │     │──────────────│
            │ id (PK)      │          │ │     │ id (PK)      │
            │ task_id (FK) │          │ │     │ task_id (FK) │
            │ sender_id    │          │ │     │ payer_id     │
            │ receiver_id  │          │ │     │ amount       │
            │ content      │          │ │     │ type         │
            └──────────────┘          │ │     └──────────────┘
                                      │ │
                         1:N          │ │      1:N
                      ┌───────────────┘ └────────────┐
                      ▼                              ▼
              ┌──────────────┐              ┌──────────────┐
              │    Review    │              │ Notification │
              │──────────────│              │──────────────│
              │ id (PK)      │              │ id (PK)      │
              │ task_id (FK) │              │ user_id (FK) │
              │ reviewer_id  │              │ task_id (FK) │
              │ reviewee_id  │              │ title        │
              │ rating (1-5) │              │ is_read      │
              └──────────────┘              └──────────────┘
```

**Legend:**
- `(PK)`: Primary Key
- `(FK)`: Foreign Key
- `(UQ)`: Unique constraint
- `1:N`: One-to-many relationship
- `1:1`: One-to-one relationship

---

## API Schemas (Pydantic)

Pydantic schemas define request/response validation for the FastAPI backend.

### User Schemas

**Location:** `backend/app/schemas/user.py`

```python
# Request Schemas
UserBase(name, email?, phone?, university, student_id?)
UserCreate(UserBase + zalo_id)
UserUpdate(name?, email?, phone?, student_id?, avatar_url?)
BecomeTaskerRequest(tasker_bio, tasker_skills[])

# Response Schemas
UserResponse(
    id, zalo_id, name, avatar_url?, phone?, email?,
    university, student_id?, is_verified, rating,
    total_tasks_completed, total_tasks_posted, balance,
    is_tasker, tasker_bio?, tasker_skills[],
    created_at, updated_at
)

UserPublicResponse(
    id, name, avatar_url?, university, is_verified,
    rating, total_tasks_completed, is_tasker,
    tasker_bio?, tasker_skills[]
)

UserMinimalResponse(id, name, avatar_url?, rating)
```

**Validation Rules:**
- `name`: 1-100 characters
- `email`: max 100 characters
- `phone`: max 20 characters
- `student_id`: max 20 characters
- `tasker_bio`: 10-500 characters (required for Tasker)
- `tasker_skills`: 1-10 skills array

---

### Task Schemas

**Location:** `backend/app/schemas/task.py`

```python
# Request Schemas
TaskBase(
    title, description?, price, price_negotiable,
    category_id, location_from?, location_to?, deadline?
)
TaskCreate(TaskBase)  # Inherits all fields
TaskUpdate(
    title?, description?, price?, price_negotiable?,
    location_from?, location_to?, deadline?
)  # All fields optional

# Response Schemas
TaskResponse(
    id, title, description?, price, price_negotiable,
    status, location_from?, location_to?, deadline?,
    completed_at?, created_at, updated_at,
    requester: UserMinimalResponse,
    tasker?: UserMinimalResponse,
    category: CategoryInTask,
    application_count: int
)

TaskListResponse(
    id, title, price, price_negotiable, status,
    location_from?, deadline?, created_at,
    requester: UserMinimalResponse,
    category: CategoryInTask,
    application_count: int
)  # Lighter version for list views

# Task Application
TaskApplicationCreate(proposed_price?, message?)
TaskApplicationResponse(
    id, task_id, tasker: UserMinimalResponse,
    proposed_price?, message?, status, created_at
)

# Query Parameters
TaskQueryParams(
    status?, category_id?, search?,
    min_price?, max_price?,
    sort="created_at", order="desc",
    page=1, limit=20
)
```

**Validation Rules:**
- `title`: 5-200 characters
- `description`: max 2000 characters
- `price`: 1-10,000,000 VND (gt=0, le=10000000)
- `location_from/to`: max 200 characters
- `message`: max 500 characters

---

### Other Schemas

**Payment Schemas** (`backend/app/schemas/payment.py`):
```python
PaymentCreateRequest(task_id, amount)
PaymentReleaseRequest(task_id)
TransactionResponse(
    id, task_id?, payer_id?, payee_id?,
    amount, platform_fee, type, status,
    created_at, updated_at
)
```

**Message Schemas** (`backend/app/schemas/message.py`):
```python
MessageCreate(content, receiver_id)
MessageResponse(
    id, task_id, sender_id, receiver_id,
    content, is_read, created_at
)
ConversationResponse(
    task_id, task_title,
    other_user: UserMinimalResponse,
    last_message?, last_message_time?,
    unread_count
)
```

**Auth Schemas** (`backend/app/schemas/auth.py`):
```python
ZaloLoginRequest(code, code_verifier, app_id)
DevLoginRequest(name)
TokenResponse(
    access_token, refresh_token,
    token_type="bearer", expires_in
)
RefreshTokenRequest(refresh_token)
```

---

## Frontend Types (TypeScript)

**Location:** `vieczzalo/src/types/index.ts`

### Core Types

```typescript
// User Types
interface User {
  id: number;
  zalo_id: string;
  name: string;
  avatar_url: string | null;
  phone: string | null;
  email: string | null;
  university: string;
  student_id: string | null;
  is_verified: boolean;
  rating: number;
  total_tasks_completed: number;
  total_tasks_posted: number;
  balance: number;
  is_tasker: boolean;
  tasker_bio: string | null;
  tasker_skills: string[];
  created_at: string;  // ISO 8601
  updated_at: string;
}

interface UserMinimal {
  id: number;
  name: string;
  avatar_url: string | null;
  rating: number;
}

interface UserPublic {
  id: number;
  name: string;
  avatar_url: string | null;
  university: string;
  is_verified: boolean;
  rating: number;
  total_tasks_completed: number;
  is_tasker: boolean;
  tasker_bio: string | null;
  tasker_skills: string[];
}

// Task Types
type TaskStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

interface Task {
  id: number;
  title: string;
  description: string | null;
  price: number;
  price_negotiable: boolean;
  status: TaskStatus;
  location_from: string | null;
  location_to: string | null;
  deadline: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  requester: UserMinimal;
  tasker: UserMinimal | null;
  category: Category;
  application_count: number;
}

interface TaskListItem {
  id: number;
  title: string;
  price: number;
  price_negotiable: boolean;
  status: TaskStatus;
  location_from: string | null;
  deadline: string | null;
  created_at: string;
  requester: UserMinimal;
  category: Category;
  application_count: number;
}

interface TaskCreateInput {
  title: string;
  description?: string;
  price: number;
  price_negotiable?: boolean;
  category_id: number;
  location_from?: string;
  location_to?: string;
  deadline?: string;  // ISO 8601
}

// Application Types
type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

interface TaskApplication {
  id: number;
  task_id: number;
  tasker: UserMinimal;
  proposed_price: number | null;
  message: string | null;
  status: ApplicationStatus;
  created_at: string;
}

// Message Types
interface Message {
  id: number;
  task_id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  task_id: number;
  task_title: string;
  other_user: UserMinimal;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
}

// Notification Types
type NotificationType =
  | 'task_application'
  | 'application_accepted'
  | 'application_rejected'
  | 'task_completed'
  | 'payment_received'
  | 'new_message'
  | 'system';

interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  task_id: number | null;
  is_read: boolean;
  created_at: string;
}

// Wallet Types
interface Wallet {
  id: number;
  balance: number;
  type: string;
}

interface WalletTransaction {
  id: number;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

// Category Type
interface Category {
  id: number;
  name: string;
  name_vi: string;
  icon: string | null;
}
```

### API Response Types

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}
```

### Query Parameters

```typescript
interface TaskQueryParams {
  status?: TaskStatus;
  category_ids?: number[];  // Support multiple categories
  search?: string;
  min_price?: number;
  max_price?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

---

## Enums and Constants

### Backend Enums

**TaskStatus** (`backend/app/models/task.py:13-21`):
```python
class TaskStatus(str, enum.Enum):
    OPEN = "open"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"
```

**ApplicationStatus** (`backend/app/models/task_application.py:13-18`):
```python
class ApplicationStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
```

**TransactionType** (`backend/app/models/transaction.py:13-19`):
```python
class TransactionType(str, enum.Enum):
    ESCROW = "escrow"         # Payment held in escrow
    RELEASE = "release"       # Released to tasker
    REFUND = "refund"         # Refunded to requester
    WITHDRAWAL = "withdrawal" # Tasker withdraws balance
```

**TransactionStatus** (`backend/app/models/transaction.py:21-29`):
```python
class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    RELEASED = "released"
    REFUNDED = "refunded"
```

**WalletType** (`backend/app/models/wallet.py:14-19`):
```python
class WalletType(str, Enum):
    USER = "user"           # Regular user wallet
    ESCROW = "escrow"       # Platform escrow for holding payments
    PLATFORM = "platform"   # Platform revenue wallet
```

**WalletTransactionType** (`backend/app/models/wallet.py:21-29`):
```python
class WalletTransactionType(str, Enum):
    DEPOSIT = "deposit"
    WITHDRAW = "withdraw"
    ESCROW_HOLD = "escrow_hold"       # Move to escrow
    ESCROW_RELEASE = "escrow_release" # Release to tasker
    ESCROW_REFUND = "escrow_refund"   # Refund to requester
    PLATFORM_FEE = "platform_fee"     # Platform commission
```

**NotificationType** (`backend/app/models/notification.py:13-47`):
```python
class NotificationType(str, enum.Enum):
    # Task related
    TASK_CREATED = "task_created"
    TASK_UPDATE = "task_update"
    TASK_COMPLETED = "task_completed"
    TASK_CANCELLED = "task_cancelled"

    # Application related
    NEW_APPLICATION = "new_application"
    APPLICATION_ACCEPTED = "application_accepted"
    APPLICATION_REJECTED = "application_rejected"

    # Payment related
    PAYMENT = "payment"
    PAYMENT_RECEIVED = "payment_received"
    WALLET_DEPOSIT = "wallet_deposit"
    WALLET_WITHDRAW = "wallet_withdraw"

    # Message related
    MESSAGE = "message"
    NEW_MESSAGE = "new_message"

    # Review related
    REVIEW = "review"
    NEW_REVIEW = "new_review"

    # User related
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    BECAME_TASKER = "became_tasker"

    # System
    SYSTEM = "system"
```

**ReportStatus** (`backend/app/models/report.py:12-18`):
```python
class ReportStatus(str, enum.Enum):
    PENDING = "pending"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"
```

---

## Indexes and Constraints

### Primary Keys

All models use auto-incrementing integer primary keys (`id`).

### Foreign Key Constraints

| Child Table | Foreign Key | Parent Table | On Delete |
|-------------|-------------|--------------|-----------|
| tasks | requester_id | users.id | CASCADE |
| tasks | tasker_id | users.id | SET NULL |
| tasks | category_id | categories.id | - |
| task_applications | task_id | tasks.id | CASCADE |
| task_applications | tasker_id | users.id | CASCADE |
| messages | task_id | tasks.id | CASCADE |
| messages | sender_id | users.id | CASCADE |
| messages | receiver_id | users.id | CASCADE |
| reviews | task_id | tasks.id | CASCADE |
| reviews | reviewer_id | users.id | CASCADE |
| reviews | reviewee_id | users.id | CASCADE |
| transactions | task_id | tasks.id | SET NULL |
| transactions | payer_id | users.id | SET NULL |
| transactions | payee_id | users.id | SET NULL |
| notifications | user_id | users.id | CASCADE |
| notifications | task_id | tasks.id | SET NULL |
| reports | reporter_id | users.id | CASCADE |
| reports | reported_user_id | users.id | CASCADE |
| reports | task_id | tasks.id | SET NULL |
| wallets | user_id | users.id | - |
| wallet_transactions | wallet_id | wallets.id | - |
| wallet_transactions | task_id | tasks.id | - |

**On Delete Behaviors:**
- **CASCADE**: Delete child records when parent is deleted
- **SET NULL**: Set foreign key to NULL when parent is deleted
- **-**: Default behavior (prevent deletion if referenced)

### Unique Constraints

| Table | Columns | Name | Purpose |
|-------|---------|------|---------|
| users | zalo_id | - | One account per Zalo user |
| wallets | user_id | - | One wallet per user |
| task_applications | (task_id, tasker_id) | unique_task_tasker | One application per tasker per task |
| reviews | (task_id, reviewer_id) | unique_task_reviewer | One review per user per task |

### Indexes

| Table | Column | Type | Purpose |
|-------|--------|------|---------|
| users | id | PRIMARY | Fast user lookups |
| users | zalo_id | UNIQUE | Fast Zalo authentication |
| tasks | id | PRIMARY | Fast task lookups |
| tasks | requester_id | INDEX | Fast requester task queries |
| tasks | tasker_id | INDEX | Fast tasker task queries |
| tasks | category_id | INDEX | Fast category filtering |
| tasks | status | INDEX | Fast status filtering |
| task_applications | task_id | INDEX | Fast application lookups by task |
| task_applications | tasker_id | INDEX | Fast application lookups by tasker |
| messages | task_id | INDEX | Fast message retrieval for tasks |
| notifications | user_id | INDEX | Fast user notification queries |
| notifications | is_read | INDEX | Fast unread notification filtering |
| transactions | zalopay_trans_id | INDEX | Fast ZaloPay transaction lookups |

### Database-Level Constraints

**Check Constraints** (implicit in Pydantic validation):
- `price`: Must be > 0 and <= 10,000,000 VND
- `rating`: Must be 1-5 (integer or float)
- `proposed_price`: Must be > 0 and <= 10,000,000 VND

**Not Null Constraints:**
- All primary keys
- User: `zalo_id`, `name`
- Task: `requester_id`, `category_id`, `title`, `price`
- TaskApplication: `task_id`, `tasker_id`
- Message: `task_id`, `sender_id`, `receiver_id`, `content`
- Review: `task_id`, `reviewer_id`, `reviewee_id`, `rating`, `is_for_tasker`
- Transaction: `amount`, `platform_fee`, `type`
- Notification: `user_id`, `title`, `type`
- Report: `reporter_id`, `reported_user_id`, `reason`

---

## Data Relationships Summary

### One-to-One
- User ↔ Wallet (one user has one wallet)

### One-to-Many
- User → Tasks (as requester)
- User → Tasks (as tasker)
- User → TaskApplications
- User → Messages (as sender)
- User → Messages (as receiver)
- User → Reviews (as reviewer)
- User → Reviews (as reviewee)
- User → Notifications
- Category → Tasks
- Task → TaskApplications
- Task → Messages
- Task → Reviews
- Task → Transactions
- Wallet → WalletTransactions

### Many-to-Many
None (applications are explicit TaskApplication entities, not junction tables)

---

## Key Design Patterns

1. **Soft Delete**: Not implemented - relies on `ON DELETE` constraints
2. **Audit Trail**: `created_at` and `updated_at` timestamps on most models
3. **Computed Properties**: `Wallet.available_balance` = `balance - frozen_balance`
4. **Denormalization**: User statistics cached in User model (`total_tasks_completed`, `rating`)
5. **Type Safety**: Enums for status fields prevent invalid states
6. **Normalization**: Categories, users, and tasks are properly normalized (3NF)
7. **JSON Storage**: `tasker_skills` stored as JSON array for flexibility

---

## Data Size Estimates

**Field Limits:**
- Short text (name, title): 50-200 characters
- Medium text (bio, message): 500 characters
- Long text (description, reason): 2000 characters (Text type)
- Numeric (price): 1-10,000,000 VND (integer)
- Numeric (balance): BigInteger (up to 2^63-1)

**Storage Considerations:**
- SQLite database file: `backend/data/viecz.db`
- Estimated row sizes: 100-500 bytes per entity
- Indexes add ~10-20% overhead
- Expected dataset: 10,000 users, 50,000 tasks, 100,000 messages

---

**End of Document**

> For related documentation, see:
> - [API_REFERENCE.md](./API_REFERENCE.md) - API endpoint documentation
> - [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) - Architecture overview
> - [ALGORITHM.md](./ALGORITHM.md) - Core algorithms and business logic
