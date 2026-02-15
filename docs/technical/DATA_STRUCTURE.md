# DATA_STRUCTURE.md

**Project:** Viecz - Go Backend Data Models
**Last Updated:** 2026-02-15

This document describes all data models in the Go backend (`server/internal/models/`), their GORM mappings, relationships, hooks, and constants.

---

## Table of Contents

1. [Database Overview](#database-overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Models](#models)
   - [User](#1-user)
   - [Category](#2-category)
   - [Task](#3-task)
   - [TaskApplication](#4-taskapplication)
   - [Transaction](#5-transaction)
   - [Wallet](#6-wallet)
   - [WalletTransaction](#7-wallettransaction)
   - [Conversation](#8-conversation)
   - [Message](#9-message)
   - [Notification](#10-notification)
4. [Request/Response DTOs](#requestresponse-dtos)
5. [Enums and Constants](#enums-and-constants)
6. [GORM Hooks](#gorm-hooks)
7. [Indexes and Constraints](#indexes-and-constraints)
8. [Helper Functions](#helper-functions)

---

## Database Overview

- **ORM**: GORM v2
- **Production DB**: PostgreSQL (via `gorm.io/driver/postgres`)
- **Test DB**: PostgreSQL (port 5433, Docker tmpfs via `docker-compose.testdb.yml`)
- **Migration**: GORM AutoMigrate + golang-migrate for production

**AutoMigrate order** (`server/internal/database/gorm.go`):
```go
db.AutoMigrate(
    &models.User{},
    &models.Category{},
    &models.Task{},
    &models.TaskApplication{},
    &models.Transaction{},
    &models.Wallet{},
    &models.WalletTransaction{},
    &models.Conversation{},
    &models.Message{},
    &models.Notification{},
)
```

---

## Entity Relationship Diagram

```mermaid
erDiagram
    User {
        int64 id PK
        string email UK
        string password_hash
        string name
        string university
        float64 rating
        bool is_tasker
    }

    Category {
        int id PK
        string name
        string name_vi
        bool is_active
    }

    Task {
        int64 id PK
        int64 requester_id FK
        int64 tasker_id FK
        int64 category_id FK
        string title
        int64 price
        string status
    }

    TaskApplication {
        int64 id PK
        int64 task_id FK
        int64 tasker_id FK
        string status
    }

    Transaction {
        int64 id PK
        int64 payer_id FK
        int64 task_id FK
        int64 payee_id FK
        string type
        string status
        int64 amount
    }

    Wallet {
        int64 id PK
        int64 user_id FK UK
        int64 balance
        int64 escrow_balance
    }

    WalletTransaction {
        int64 id PK
        int64 wallet_id FK
        int64 transaction_id FK
        int64 task_id FK
        string type
        int64 amount
    }

    Conversation {
        int id PK
        int task_id FK
        int poster_id FK
        int tasker_id FK
        string last_message
    }

    Message {
        int id PK
        int conversation_id FK
        int sender_id FK
        string content
        bool is_read
    }

    Notification {
        int64 id PK
        int64 user_id FK
        string type
        string title
        string message
        int64 task_id FK
        bool is_read
        timestamp created_at
    }

    User ||--|| Wallet : "has one"
    User ||--o{ Task : "posts requester"
    User ||--o{ Task : "works tasker"
    User ||--o{ TaskApplication : "applies"
    User ||--o{ Transaction : "pays payer"
    User ||--o{ Transaction : "receives payee"
    User ||--o{ Conversation : "as poster"
    User ||--o{ Conversation : "as tasker"
    User ||--o{ Message : "sends"
    User ||--o{ Notification : "receives"
    Category ||--o{ Task : "classifies"
    Task ||--o{ TaskApplication : "has"
    Task ||--o{ Transaction : "has"
    Task ||--o| Conversation : "has"
    Task ||--o{ Notification : "triggers"
    Wallet ||--o{ WalletTransaction : "has"
    Transaction ||--o{ WalletTransaction : "linked to"
    Conversation ||--o{ Message : "contains"
```

---

## Models

### 1. User

**File:** `server/internal/models/user.go`
**Table:** `users`

```go
type User struct {
    ID                  int64          `gorm:"primaryKey;autoIncrement" json:"id"`
    Email               string         `gorm:"unique;size:255;not null" json:"email"`
    PasswordHash        string         `gorm:"size:255;not null" json:"-"`
    Name                string         `gorm:"size:100;not null" json:"name"`
    AvatarURL           *string        `gorm:"type:text" json:"avatar_url,omitempty"`
    Phone               *string        `gorm:"size:20" json:"phone,omitempty"`
    University          string         `gorm:"size:255;not null;default:'ĐHQG-HCM'" json:"university"`
    StudentID           *string        `gorm:"size:50" json:"student_id,omitempty"`
    IsVerified          bool           `gorm:"default:false" json:"is_verified"`
    Rating              float64        `gorm:"type:decimal(3,2);default:0" json:"rating"`
    TotalTasksCompleted int            `gorm:"default:0" json:"total_tasks_completed"`
    TotalTasksPosted    int            `gorm:"default:0" json:"total_tasks_posted"`
    TotalEarnings       int64          `gorm:"default:0" json:"total_earnings"`
    IsTasker            bool           `gorm:"default:false" json:"is_tasker"`
    TaskerBio           *string        `gorm:"size:500" json:"tasker_bio,omitempty"`
    TaskerSkills        pq.StringArray `gorm:"type:text[]" json:"tasker_skills,omitempty"`
    CreatedAt           time.Time      `gorm:"autoCreateTime" json:"created_at"`
    UpdatedAt           time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
}
```

| Field | Type | GORM Tags | Description |
|-------|------|-----------|-------------|
| ID | int64 | primaryKey, autoIncrement | Auto-incrementing primary key |
| Email | string | unique, size:255, not null | User login email (unique) |
| PasswordHash | string | size:255, not null | bcrypt hash, never exposed in JSON (`json:"-"`) |
| Name | string | size:100, not null | Display name |
| AvatarURL | *string | type:text | Profile image URL (nullable) |
| Phone | *string | size:20 | Phone number (nullable) |
| University | string | size:255, not null, default:'ĐHQG-HCM' | University affiliation |
| StudentID | *string | size:50 | Student ID (nullable) |
| IsVerified | bool | default:false | Student verification status |
| Rating | float64 | type:decimal(3,2), default:0 | Average rating 0-5 |
| TotalTasksCompleted | int | default:0 | Denormalized completed task count |
| TotalTasksPosted | int | default:0 | Denormalized posted task count |
| TotalEarnings | int64 | default:0 | Denormalized lifetime earnings (VND) |
| IsTasker | bool | default:false | Whether user can accept tasks |
| TaskerBio | *string | size:500 | Tasker biography (nullable) |
| TaskerSkills | pq.StringArray | type:text[] | PostgreSQL text array of skills |
| CreatedAt | time.Time | autoCreateTime | Record creation timestamp |
| UpdatedAt | time.Time | autoUpdateTime | Last update timestamp |

**Validation rules** (`Validate()`):
- Email: required, must match regex `^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`
- Name: required, max 100 chars
- PasswordHash: required
- Rating: 0-5
- TotalTasksCompleted, TotalTasksPosted: >= 0
- TotalEarnings: >= 0
- If IsTasker: TaskerBio max 500 chars, TaskerSkills max 10 items

**GORM Hooks:** `BeforeCreate`, `BeforeUpdate` -- both call `Validate()`

---

### 2. Category

**File:** `server/internal/models/category.go`
**Table:** `categories`

```go
type Category struct {
    ID       int     `gorm:"primaryKey;autoIncrement" json:"id"`
    Name     string  `gorm:"size:50;not null" json:"name"`
    NameVi   string  `gorm:"size:50;not null" json:"name_vi"`
    Icon     *string `gorm:"size:50" json:"icon,omitempty"`
    IsActive bool    `gorm:"default:true" json:"is_active"`
}
```

| Field | Type | GORM Tags | Description |
|-------|------|-----------|-------------|
| ID | int | primaryKey, autoIncrement | Primary key |
| Name | string | size:50, not null | English category name |
| NameVi | string | size:50, not null | Vietnamese category name |
| Icon | *string | size:50 | Icon identifier (nullable) |
| IsActive | bool | default:true | Soft-disable flag |

**Validation rules:** Name required (max 50), NameVi required (max 50).

**GORM Hooks:** `BeforeCreate`, `BeforeUpdate` -- both call `Validate()`

**Seed data** (from `server/internal/database/seed.go`):
- Moving & Transport / Van chuyen & Di chuyen
- Delivery / Giao hang
- Assembly & Installation / Lap rap & Cai dat
- Cleaning / Don dep
- Tutoring & Teaching / Gia su & Giang day
- Tech Support / Ho tro ky thuat
- Event Help / Ho tro su kien
- Shopping & Errands / Mua sam & Viec vat
- Pet Care / Cham soc thu cung
- Photography / Chup anh
- Other / Khac

---

### 3. Task

**File:** `server/internal/models/task.go`
**Table:** `tasks`

```go
type Task struct {
    ID                int64      `gorm:"primaryKey;autoIncrement" json:"id"`
    RequesterID       int64      `gorm:"not null;index" json:"requester_id"`
    TaskerID          *int64     `gorm:"index" json:"tasker_id,omitempty"`
    CategoryID        int64      `gorm:"not null;index" json:"category_id"`
    Title             string     `gorm:"size:200;not null" json:"title"`
    Description       string     `gorm:"type:text;not null" json:"description"`
    Price             int64      `gorm:"not null" json:"price"`
    Location          string     `gorm:"size:255;not null" json:"location"`
    Latitude          *float64   `gorm:"type:decimal(10,8)" json:"latitude,omitempty"`
    Longitude         *float64   `gorm:"type:decimal(11,8)" json:"longitude,omitempty"`
    Status            TaskStatus `gorm:"type:varchar(20);default:'open';index" json:"status"`
    ScheduledFor      *time.Time `json:"scheduled_for,omitempty"`
    CompletedAt       *time.Time `json:"completed_at,omitempty"`
    ImageURLs         []string   `gorm:"type:text[]" json:"image_urls,omitempty"`
    RequesterRatingID *int64     `json:"requester_rating_id,omitempty"`
    TaskerRatingID    *int64     `json:"tasker_rating_id,omitempty"`
    CreatedAt         time.Time  `gorm:"autoCreateTime" json:"created_at"`
    UpdatedAt         time.Time  `gorm:"autoUpdateTime" json:"updated_at"`

    // Associations (not serialized to JSON)
    Requester User     `gorm:"foreignKey:RequesterID" json:"-"`
    Tasker    *User    `gorm:"foreignKey:TaskerID" json:"-"`
    Category  Category `gorm:"foreignKey:CategoryID" json:"-"`
}
```

| Field | Type | GORM Tags | Description |
|-------|------|-----------|-------------|
| ID | int64 | primaryKey, autoIncrement | Primary key |
| RequesterID | int64 | not null, index | FK to users.id (task poster) |
| TaskerID | *int64 | index | FK to users.id (assigned worker, nullable) |
| CategoryID | int64 | not null, index | FK to categories.id |
| Title | string | size:200, not null | Task title |
| Description | string | type:text, not null | Full description |
| Price | int64 | not null | Price in VND (must be > 0) |
| Location | string | size:255, not null | Location text |
| Latitude | *float64 | type:decimal(10,8) | GPS latitude (nullable) |
| Longitude | *float64 | type:decimal(11,8) | GPS longitude (nullable) |
| Status | TaskStatus | type:varchar(20), default:'open', index | Current status |
| ScheduledFor | *time.Time | -- | When the task should be done (nullable) |
| CompletedAt | *time.Time | -- | Completion timestamp (nullable) |
| ImageURLs | []string | type:text[] | Up to 5 image URLs |
| RequesterRatingID | *int64 | -- | Rating given by requester (nullable) |
| TaskerRatingID | *int64 | -- | Rating given by tasker (nullable) |
| CreatedAt | time.Time | autoCreateTime | Record creation |
| UpdatedAt | time.Time | autoUpdateTime | Last update |

**Associations:**
- `Requester` -> User (foreignKey: RequesterID)
- `Tasker` -> *User (foreignKey: TaskerID)
- `Category` -> Category (foreignKey: CategoryID)

**Validation rules:**
- RequesterID, CategoryID: required (non-zero)
- Title: required, max 200 chars
- Description: required, max 2000 chars
- Price: > 0
- Location: required, max 255 chars
- Status: must be one of the valid TaskStatus values
- ImageURLs: max 5 items

**GORM Hooks:** `BeforeCreate`, `BeforeUpdate` -- both call `Validate()`

**State transitions:**
```
open --> in_progress --> completed
  |                        |
  +--> cancelled    cancelled
```

---

### 4. TaskApplication

**File:** `server/internal/models/task_application.go`
**Table:** `task_applications`

```go
type TaskApplication struct {
    ID            int64             `gorm:"primaryKey;autoIncrement" json:"id"`
    TaskID        int64             `gorm:"not null;index" json:"task_id"`
    TaskerID      int64             `gorm:"not null;index" json:"tasker_id"`
    ProposedPrice *int64            `json:"proposed_price,omitempty"`
    Message       *string           `gorm:"size:500" json:"message,omitempty"`
    Status        ApplicationStatus `gorm:"type:varchar(20);default:'pending';index" json:"status"`
    CreatedAt     time.Time         `gorm:"autoCreateTime" json:"created_at"`
    UpdatedAt     time.Time         `gorm:"autoUpdateTime" json:"updated_at"`

    // Associations
    Task   Task `gorm:"foreignKey:TaskID" json:"-"`
    Tasker User `gorm:"foreignKey:TaskerID" json:"-"`
}
```

| Field | Type | GORM Tags | Description |
|-------|------|-----------|-------------|
| ID | int64 | primaryKey, autoIncrement | Primary key |
| TaskID | int64 | not null, index | FK to tasks.id |
| TaskerID | int64 | not null, index | FK to users.id (applicant) |
| ProposedPrice | *int64 | -- | Counter-offer price (nullable) |
| Message | *string | size:500 | Application message (nullable) |
| Status | ApplicationStatus | type:varchar(20), default:'pending', index | Application status |
| CreatedAt | time.Time | autoCreateTime | Record creation |
| UpdatedAt | time.Time | autoUpdateTime | Last update |

**Validation rules:**
- TaskID, TaskerID: required (non-zero)
- ProposedPrice: if set, must be > 0
- Message: max 500 chars
- Status: must be valid ApplicationStatus

**GORM Hooks:** `BeforeCreate`, `BeforeUpdate` -- both call `Validate()`

**Uniqueness:** Enforced at application level via `ExistsByTaskAndTasker()` repository method (one application per tasker per task).

---

### 5. Transaction

**File:** `server/internal/models/transaction.go`
**Table:** `transactions`

```go
type Transaction struct {
    ID              int64             `gorm:"primaryKey;autoIncrement" json:"id"`
    TaskID          *int64            `gorm:"index" json:"task_id,omitempty"`
    PayerID         int64             `gorm:"not null;index" json:"payer_id"`
    PayeeID         *int64            `gorm:"index" json:"payee_id,omitempty"`
    Amount          int64             `gorm:"not null" json:"amount"`
    PlatformFee     int64             `gorm:"not null;default:0" json:"platform_fee"`
    NetAmount       int64             `gorm:"not null" json:"net_amount"`
    Type            TransactionType   `gorm:"type:varchar(20);not null;index" json:"type"`
    Status          TransactionStatus `gorm:"type:varchar(20);not null;default:'pending';index" json:"status"`
    PayOSOrderCode  *int64            `gorm:"unique" json:"payos_order_code,omitempty"`
    PayOSPaymentID  *string           `gorm:"type:text" json:"payos_payment_id,omitempty"`
    Description     string            `gorm:"type:text" json:"description"`
    FailureReason   *string           `gorm:"type:text" json:"failure_reason,omitempty"`
    CompletedAt     *time.Time        `json:"completed_at,omitempty"`
    CreatedAt       time.Time         `gorm:"autoCreateTime" json:"created_at"`
    UpdatedAt       time.Time         `gorm:"autoUpdateTime" json:"updated_at"`

    // Associations
    Task  *Task `gorm:"foreignKey:TaskID" json:"-"`
    Payer User  `gorm:"foreignKey:PayerID" json:"-"`
    Payee *User `gorm:"foreignKey:PayeeID" json:"-"`
}
```

| Field | Type | GORM Tags | Description |
|-------|------|-----------|-------------|
| ID | int64 | primaryKey, autoIncrement | Primary key |
| TaskID | *int64 | index | FK to tasks.id (nullable for deposits) |
| PayerID | int64 | not null, index | FK to users.id (who pays) |
| PayeeID | *int64 | index | FK to users.id (who receives, nullable) |
| Amount | int64 | not null | Gross amount in VND (> 0) |
| PlatformFee | int64 | not null, default:0 | Platform commission (>= 0) |
| NetAmount | int64 | not null | Amount - PlatformFee (auto-calculated) |
| Type | TransactionType | type:varchar(20), not null, index | Transaction type |
| Status | TransactionStatus | type:varchar(20), not null, default:'pending', index | Transaction status |
| PayOSOrderCode | *int64 | unique | PayOS order code (nullable, unique) |
| PayOSPaymentID | *string | type:text | PayOS payment ID (nullable) |
| Description | string | type:text | Human-readable description |
| FailureReason | *string | type:text | Reason for failure (nullable) |
| CompletedAt | *time.Time | -- | Completion timestamp (nullable) |
| CreatedAt | time.Time | autoCreateTime | Record creation |
| UpdatedAt | time.Time | autoUpdateTime | Last update |

**Method:** `CalculateNetAmount()` sets `NetAmount = Amount - PlatformFee`

**Validation rules:**
- PayerID: required (non-zero)
- Amount: > 0
- PlatformFee: >= 0
- NetAmount: >= 0
- Type: must be valid TransactionType
- Status: must be valid TransactionStatus

**GORM Hooks:**
- `BeforeCreate`: calls `CalculateNetAmount()` then `Validate()`
- `BeforeUpdate`: calls `CalculateNetAmount()` then `Validate()`

---

### 6. Wallet

**File:** `server/internal/models/wallet.go`
**Table:** `wallets`

```go
type Wallet struct {
    ID              int64     `gorm:"primaryKey;autoIncrement" json:"id"`
    UserID          int64     `gorm:"unique;not null;index" json:"user_id"`
    Balance         int64     `gorm:"not null;default:0" json:"balance"`
    EscrowBalance   int64     `gorm:"not null;default:0" json:"escrow_balance"`
    TotalDeposited  int64     `gorm:"not null;default:0" json:"total_deposited"`
    TotalWithdrawn  int64     `gorm:"not null;default:0" json:"total_withdrawn"`
    TotalEarned     int64     `gorm:"not null;default:0" json:"total_earned"`
    TotalSpent      int64     `gorm:"not null;default:0" json:"total_spent"`
    CreatedAt       time.Time `gorm:"autoCreateTime" json:"created_at"`
    UpdatedAt       time.Time `gorm:"autoUpdateTime" json:"updated_at"`

    // Associations
    User User `gorm:"foreignKey:UserID" json:"-"`
}
```

| Field | Type | GORM Tags | Description |
|-------|------|-----------|-------------|
| ID | int64 | primaryKey, autoIncrement | Primary key |
| UserID | int64 | unique, not null, index | FK to users.id (one wallet per user) |
| Balance | int64 | not null, default:0 | Available balance in VND |
| EscrowBalance | int64 | not null, default:0 | Amount held in escrow |
| TotalDeposited | int64 | not null, default:0 | Lifetime deposits |
| TotalWithdrawn | int64 | not null, default:0 | Lifetime withdrawals |
| TotalEarned | int64 | not null, default:0 | Lifetime earnings from tasks |
| TotalSpent | int64 | not null, default:0 | Lifetime spending on tasks |
| CreatedAt | time.Time | autoCreateTime | Record creation |
| UpdatedAt | time.Time | autoUpdateTime | Last update |

**Methods:**
- `HasSufficientBalance(amount int64) bool` -- checks Balance >= amount
- `Deduct(amount int64) error` -- subtracts from Balance
- `Credit(amount int64)` -- adds to Balance
- `HoldInEscrow(amount int64) error` -- deducts from Balance, adds to EscrowBalance and TotalSpent
- `ReleaseFromEscrow(amount int64) error` -- subtracts from EscrowBalance (funds go to payee)
- `RefundFromEscrow(amount int64) error` -- moves from EscrowBalance back to Balance, reverses TotalSpent

**Validation rules:** UserID required, all balance fields >= 0.

**GORM Hooks:** `BeforeCreate`, `BeforeUpdate` -- both call `Validate()`

---

### 7. WalletTransaction

**File:** `server/internal/models/wallet_transaction.go`
**Table:** `wallet_transactions`

```go
type WalletTransaction struct {
    ID              int64                 `gorm:"primaryKey;autoIncrement" json:"id"`
    WalletID        int64                 `gorm:"not null;index" json:"wallet_id"`
    TransactionID   *int64                `gorm:"index" json:"transaction_id,omitempty"`
    TaskID          *int64                `gorm:"index" json:"task_id,omitempty"`
    Type            WalletTransactionType `gorm:"type:varchar(30);not null;index" json:"type"`
    Amount          int64                 `gorm:"not null" json:"amount"`
    BalanceBefore   int64                 `gorm:"not null" json:"balance_before"`
    BalanceAfter    int64                 `gorm:"not null" json:"balance_after"`
    EscrowBefore    int64                 `gorm:"not null" json:"escrow_before"`
    EscrowAfter     int64                 `gorm:"not null" json:"escrow_after"`
    Description     string                `gorm:"type:text" json:"description"`
    ReferenceUserID *int64                `gorm:"index" json:"reference_user_id,omitempty"`
    CreatedAt       time.Time             `gorm:"autoCreateTime;index" json:"created_at"`

    // Associations
    Wallet        Wallet       `gorm:"foreignKey:WalletID" json:"-"`
    Transaction   *Transaction `gorm:"foreignKey:TransactionID" json:"-"`
    Task          *Task        `gorm:"foreignKey:TaskID" json:"-"`
    ReferenceUser *User        `gorm:"foreignKey:ReferenceUserID" json:"-"`
}
```

| Field | Type | GORM Tags | Description |
|-------|------|-----------|-------------|
| ID | int64 | primaryKey, autoIncrement | Primary key |
| WalletID | int64 | not null, index | FK to wallets.id |
| TransactionID | *int64 | index | FK to transactions.id (nullable) |
| TaskID | *int64 | index | FK to tasks.id (nullable) |
| Type | WalletTransactionType | type:varchar(30), not null, index | Entry type |
| Amount | int64 | not null | Transaction amount (non-zero) |
| BalanceBefore | int64 | not null | Wallet balance snapshot before |
| BalanceAfter | int64 | not null | Wallet balance snapshot after |
| EscrowBefore | int64 | not null | Escrow balance snapshot before |
| EscrowAfter | int64 | not null | Escrow balance snapshot after |
| Description | string | type:text | Human-readable description |
| ReferenceUserID | *int64 | index | FK to users.id (other party, nullable) |
| CreatedAt | time.Time | autoCreateTime, index | Record creation (indexed for sorting) |

**Validation rules:**
- WalletID: required (non-zero)
- Amount: != 0
- Type: must be valid WalletTransactionType
- BalanceBefore, BalanceAfter, EscrowBefore, EscrowAfter: >= 0

**GORM Hooks:** `BeforeCreate` -- calls `Validate()` (no BeforeUpdate -- wallet transactions are immutable ledger entries)

---

### 8. Conversation

**File:** `server/internal/models/conversation.go`
**Table:** `conversations`

```go
type Conversation struct {
    ID        uint           `gorm:"primarykey" json:"id"`
    CreatedAt time.Time      `json:"created_at"`
    UpdatedAt time.Time      `json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

    TaskID uint  `gorm:"not null;index" json:"task_id"`
    Task   *Task `gorm:"constraint:OnDelete:CASCADE" json:"task,omitempty"`

    PosterID uint  `gorm:"not null;index" json:"poster_id"`
    Poster   *User `gorm:"foreignKey:PosterID" json:"poster,omitempty"`

    TaskerID uint  `gorm:"not null;index" json:"tasker_id"`
    Tasker   *User `gorm:"foreignKey:TaskerID" json:"tasker,omitempty"`

    LastMessageAt *time.Time `json:"last_message_at"`
    LastMessage   string     `gorm:"type:text" json:"last_message"`

    Messages []Message `gorm:"foreignKey:ConversationID" json:"messages,omitempty"`
}
```

| Field | Type | GORM Tags | Description |
|-------|------|-----------|-------------|
| ID | uint | primarykey | Primary key |
| CreatedAt | time.Time | -- | Record creation |
| UpdatedAt | time.Time | -- | Last update |
| DeletedAt | gorm.DeletedAt | index | Soft-delete timestamp (GORM soft delete) |
| TaskID | uint | not null, index | FK to tasks.id |
| PosterID | uint | not null, index | FK to users.id (task poster) |
| TaskerID | uint | not null, index | FK to users.id (task worker) |
| LastMessageAt | *time.Time | -- | Timestamp of last message (nullable) |
| LastMessage | string | type:text | Preview of last message |

**Associations:**
- `Task` -> *Task (constraint: OnDelete:CASCADE)
- `Poster` -> *User (foreignKey: PosterID)
- `Tasker` -> *User (foreignKey: TaskerID)
- `Messages` -> []Message (foreignKey: ConversationID)

**Soft Delete:** This model uses GORM soft delete via `gorm.DeletedAt`. Deleted records are retained in the database with a non-null `deleted_at` timestamp.

**Custom TableName:** `func (Conversation) TableName() string { return "conversations" }`

**GORM Hooks:** None.

---

### 9. Message

**File:** `server/internal/models/message.go`
**Table:** `messages`

```go
type Message struct {
    ID        uint           `gorm:"primarykey" json:"id"`
    CreatedAt time.Time      `json:"created_at"`
    UpdatedAt time.Time      `json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

    ConversationID uint          `gorm:"not null;index" json:"conversation_id"`
    Conversation   *Conversation `gorm:"constraint:OnDelete:CASCADE" json:"conversation,omitempty"`

    SenderID uint  `gorm:"not null;index" json:"sender_id"`
    Sender   *User `gorm:"foreignKey:SenderID" json:"sender,omitempty"`

    Content string     `gorm:"type:text;not null" json:"content"`
    IsRead  bool       `gorm:"default:false" json:"is_read"`
    ReadAt  *time.Time `json:"read_at,omitempty"`
}
```

| Field | Type | GORM Tags | Description |
|-------|------|-----------|-------------|
| ID | uint | primarykey | Primary key |
| CreatedAt | time.Time | -- | Record creation |
| UpdatedAt | time.Time | -- | Last update |
| DeletedAt | gorm.DeletedAt | index | Soft-delete timestamp |
| ConversationID | uint | not null, index | FK to conversations.id |
| SenderID | uint | not null, index | FK to users.id |
| Content | string | type:text, not null | Message body |
| IsRead | bool | default:false | Read status |
| ReadAt | *time.Time | -- | When message was read (nullable) |

**Associations:**
- `Conversation` -> *Conversation (constraint: OnDelete:CASCADE)
- `Sender` -> *User (foreignKey: SenderID)

**Soft Delete:** Uses GORM soft delete via `gorm.DeletedAt`.

**Custom TableName:** `func (Message) TableName() string { return "messages" }`

**GORM Hooks:** None.

---

### 10. Notification

**File:** `server/internal/models/notification.go`
**Table:** `notifications`

```go
type Notification struct {
    ID        int64            `gorm:"primaryKey;autoIncrement" json:"id"`
    UserID    int64            `gorm:"index;not null" json:"user_id"`
    Type      NotificationType `gorm:"type:varchar(50);not null" json:"type"`
    Title     string           `gorm:"type:varchar(255);not null" json:"title"`
    Message   string           `gorm:"type:text;not null" json:"message"`
    TaskID    *int64           `gorm:"index" json:"task_id,omitempty"`
    IsRead    bool             `gorm:"default:false" json:"is_read"`
    CreatedAt time.Time        `gorm:"autoCreateTime" json:"created_at"`
    User      User             `gorm:"foreignKey:UserID" json:"-"`
}
```

| Field | Type | GORM Tags | Description |
|-------|------|-----------|-------------|
| ID | int64 | primaryKey, autoIncrement | Primary key |
| UserID | int64 | index, not null | FK to users.id (notification recipient) |
| Type | NotificationType | type:varchar(50), not null | Notification type (see NotificationType enum) |
| Title | string | type:varchar(255), not null | Notification title |
| Message | string | type:text, not null | Notification message body |
| TaskID | *int64 | index | FK to tasks.id (nullable, context link) |
| IsRead | bool | default:false | Whether the user has read this notification |
| CreatedAt | time.Time | autoCreateTime | Record creation timestamp |

**Associations:**
- `User` -> User (foreignKey: UserID)

**GORM Hooks:** None.

---

## Request/Response DTOs

**File:** `server/internal/models/payment.go`

These are not database models -- they are used for API request/response serialization only.

```go
// POST /api/v1/payments/deposit request body
type CreatePaymentRequest struct {
    Amount      int    `json:"amount" binding:"required,min=1"`
    Description string `json:"description" binding:"required"`
}

// POST /api/v1/payments/deposit response
type CreatePaymentResponse struct {
    OrderCode   int    `json:"orderCode"`
    CheckoutURL string `json:"checkoutUrl"`
    QRCode      string `json:"qrCode"`
}

// Generic error response
type ErrorResponse struct {
    Error   string `json:"error"`
    Message string `json:"message,omitempty"`
}

// GET /api/v1/health response
type HealthResponse struct {
    Status string `json:"status"`
}

// Webhook confirmation response
type WebhookResponse struct {
    Success bool   `json:"success"`
    Message string `json:"message"`
}
```

**WebSocket types** (also in `message.go`):

```go
// WebSocketMessage -- sent/received over WebSocket connections
type WebSocketMessage struct {
    Type           string   `json:"type"`            // "message", "typing", "read", "error"
    ConversationID uint     `json:"conversation_id"`
    MessageID      uint     `json:"message_id,omitempty"`
    SenderID       uint     `json:"sender_id"`
    Content        string   `json:"content"`
    CreatedAt      FlexTime `json:"created_at"`
    Error          string   `json:"error,omitempty"`
}

// FlexTime -- time.Time wrapper that gracefully handles empty strings from clients
type FlexTime struct { time.Time }
```

`FlexTime` handles `""`, `null`, and unparseable time values from WebSocket clients by defaulting to zero time.

---

## Enums and Constants

### TaskStatus

**File:** `server/internal/models/task.go`

```go
type TaskStatus string

const (
    TaskStatusOpen       TaskStatus = "open"
    TaskStatusInProgress TaskStatus = "in_progress"
    TaskStatusCompleted  TaskStatus = "completed"
    TaskStatusCancelled  TaskStatus = "cancelled"
)
```

### ApplicationStatus

**File:** `server/internal/models/task_application.go`

```go
type ApplicationStatus string

const (
    ApplicationStatusPending  ApplicationStatus = "pending"
    ApplicationStatusAccepted ApplicationStatus = "accepted"
    ApplicationStatusRejected ApplicationStatus = "rejected"
)
```

### TransactionType

**File:** `server/internal/models/transaction.go`

```go
type TransactionType string

const (
    TransactionTypeEscrow      TransactionType = "escrow"
    TransactionTypeRelease     TransactionType = "release"
    TransactionTypeRefund      TransactionType = "refund"
    TransactionTypePlatformFee TransactionType = "platform_fee"
    TransactionTypeDeposit     TransactionType = "deposit"
    TransactionTypeWithdrawal  TransactionType = "withdrawal"
)
```

### TransactionStatus

**File:** `server/internal/models/transaction.go`

```go
type TransactionStatus string

const (
    TransactionStatusPending   TransactionStatus = "pending"
    TransactionStatusSuccess   TransactionStatus = "success"
    TransactionStatusFailed    TransactionStatus = "failed"
    TransactionStatusCancelled TransactionStatus = "cancelled"
)
```

### WalletTransactionType

**File:** `server/internal/models/wallet_transaction.go`

```go
type WalletTransactionType string

const (
    WalletTransactionTypeDeposit         WalletTransactionType = "deposit"
    WalletTransactionTypeWithdrawal      WalletTransactionType = "withdrawal"
    WalletTransactionTypeEscrowHold      WalletTransactionType = "escrow_hold"
    WalletTransactionTypeEscrowRelease   WalletTransactionType = "escrow_release"
    WalletTransactionTypeEscrowRefund    WalletTransactionType = "escrow_refund"
    WalletTransactionTypePaymentReceived WalletTransactionType = "payment_received"
    WalletTransactionTypePlatformFee     WalletTransactionType = "platform_fee"
)
```

### NotificationType

**File:** `server/internal/models/notification.go`

```go
type NotificationType string

const (
    NotificationTypeTaskCreated         NotificationType = "task_created"
    NotificationTypeApplicationReceived NotificationType = "application_received"
    NotificationTypeApplicationSent     NotificationType = "application_sent"
    NotificationTypeApplicationAccepted NotificationType = "application_accepted"
    NotificationTypeTaskCompleted       NotificationType = "task_completed"
    NotificationTypePaymentReceived     NotificationType = "payment_received"
)
```

### PaymentStatus

**File:** `server/internal/models/payment.go`

```go
type PaymentStatus string

const (
    PaymentStatusPending   PaymentStatus = "PENDING"
    PaymentStatusPaid      PaymentStatus = "PAID"
    PaymentStatusCancelled PaymentStatus = "CANCELLED"
    PaymentStatusExpired   PaymentStatus = "EXPIRED"
)
```

---

## GORM Hooks

| Model | BeforeCreate | BeforeUpdate | Notes |
|-------|:---:|:---:|-------|
| User | Validate() | Validate() | Validates email format, name, password hash, rating range, tasker fields |
| Category | Validate() | Validate() | Validates name and name_vi |
| Task | Validate() | Validate() | Validates all required fields, status, image count |
| TaskApplication | Validate() | Validate() | Validates IDs, proposed_price, message length, status |
| Transaction | CalculateNetAmount() + Validate() | CalculateNetAmount() + Validate() | Auto-calculates NetAmount before validation |
| Wallet | Validate() | Validate() | Validates all balance fields >= 0 |
| WalletTransaction | Validate() | -- | Immutable ledger entries (no update hook) |
| Conversation | -- | -- | No hooks |
| Message | -- | -- | No hooks |
| Notification | -- | -- | No hooks |

---

## Indexes and Constraints

### Primary Keys

All models use auto-incrementing primary keys. Most use `int64`; Conversation and Message use `uint`.

### Unique Constraints

| Table | Column(s) | Purpose |
|-------|-----------|---------|
| users | email | One account per email |
| wallets | user_id | One wallet per user |
| transactions | payos_order_code | Unique PayOS order codes |

### Indexes

| Table | Column | Type | Purpose |
|-------|--------|------|---------|
| users | email | UNIQUE | Auth lookups |
| tasks | requester_id | INDEX | Filter tasks by poster |
| tasks | tasker_id | INDEX | Filter tasks by worker |
| tasks | category_id | INDEX | Filter tasks by category |
| tasks | status | INDEX | Filter tasks by status |
| task_applications | task_id | INDEX | Get applications for a task |
| task_applications | tasker_id | INDEX | Get applications by a tasker |
| task_applications | status | INDEX | Filter by application status |
| transactions | task_id | INDEX | Get transactions for a task |
| transactions | payer_id | INDEX | Get transactions by payer |
| transactions | payee_id | INDEX | Get transactions by payee |
| transactions | type | INDEX | Filter by transaction type |
| transactions | status | INDEX | Filter by transaction status |
| transactions | payos_order_code | UNIQUE | PayOS lookup |
| wallets | user_id | UNIQUE + INDEX | Wallet lookup by user |
| wallet_transactions | wallet_id | INDEX | Get entries for a wallet |
| wallet_transactions | transaction_id | INDEX | Link to parent transaction |
| wallet_transactions | task_id | INDEX | Get entries for a task |
| wallet_transactions | type | INDEX | Filter by type |
| wallet_transactions | reference_user_id | INDEX | Filter by other party |
| wallet_transactions | created_at | INDEX | Sort by date |
| conversations | task_id | INDEX | Find conversation for a task |
| conversations | poster_id | INDEX | Find conversations by poster |
| conversations | tasker_id | INDEX | Find conversations by tasker |
| conversations | deleted_at | INDEX | GORM soft-delete filter |
| messages | conversation_id | INDEX | Get messages in conversation |
| messages | sender_id | INDEX | Get messages by sender |
| messages | deleted_at | INDEX | GORM soft-delete filter |
| notifications | user_id | INDEX | Get notifications for a user |
| notifications | task_id | INDEX | Get notifications for a task |

### Foreign Key Constraints

| Child Table | Column | References | On Delete |
|-------------|--------|------------|-----------|
| tasks | requester_id | users.id | -- (default) |
| tasks | tasker_id | users.id | -- |
| tasks | category_id | categories.id | -- |
| task_applications | task_id | tasks.id | -- |
| task_applications | tasker_id | users.id | -- |
| transactions | task_id | tasks.id | -- |
| transactions | payer_id | users.id | -- |
| transactions | payee_id | users.id | -- |
| wallets | user_id | users.id | -- |
| wallet_transactions | wallet_id | wallets.id | -- |
| wallet_transactions | transaction_id | transactions.id | -- |
| wallet_transactions | task_id | tasks.id | -- |
| wallet_transactions | reference_user_id | users.id | -- |
| conversations | task_id | tasks.id | CASCADE |
| conversations | poster_id | users.id | -- |
| conversations | tasker_id | users.id | -- |
| messages | conversation_id | conversations.id | CASCADE |
| messages | sender_id | users.id | -- |
| notifications | user_id | users.id | -- |
| notifications | task_id | tasks.id | -- |

---

## Helper Functions

**File:** `server/internal/models/user.go`

```go
// IsValidEmail checks email format against regex
func IsValidEmail(email string) bool

// IsStrongPassword checks: min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit
func IsStrongPassword(password string) bool
```

---

## Data Relationships Summary

### One-to-One
- User <-> Wallet (UserID unique in wallets)

### One-to-Many
- User -> Task (as RequesterID)
- User -> Task (as TaskerID)
- User -> TaskApplication (as TaskerID)
- User -> Transaction (as PayerID)
- User -> Transaction (as PayeeID)
- User -> Conversation (as PosterID)
- User -> Conversation (as TaskerID)
- User -> Message (as SenderID)
- User -> Notification (as UserID)
- User -> WalletTransaction (as ReferenceUserID)
- Category -> Task
- Task -> TaskApplication
- Task -> Transaction
- Task -> WalletTransaction
- Task -> Notification
- Task -> Conversation
- Wallet -> WalletTransaction
- Transaction -> WalletTransaction
- Conversation -> Message

### Soft-Deleted Models
- Conversation (gorm.DeletedAt)
- Message (gorm.DeletedAt)

---

## Key Design Patterns

1. **Email-based auth**: Users authenticate with email + bcrypt password (no Zalo/OAuth)
2. **Single user table**: Both requesters and taskers share the same User model; `is_tasker` flag controls task acceptance
3. **GORM hooks for validation**: All domain validation runs in BeforeCreate/BeforeUpdate hooks
4. **Immutable ledger**: WalletTransaction has no BeforeUpdate hook -- entries are append-only
5. **Balance snapshots**: WalletTransaction stores BalanceBefore/After and EscrowBefore/After for auditability
6. **Auto-calculated fields**: Transaction.NetAmount is computed from Amount - PlatformFee in hooks
7. **Soft delete**: Conversation and Message use GORM soft delete; all other models use hard delete
8. **PayOS integration**: Transaction stores PayOSOrderCode (unique) and PayOSPaymentID for payment gateway tracking
9. **PostgreSQL arrays**: User.TaskerSkills and Task.ImageURLs use `text[]` PostgreSQL array type via `pq.StringArray`/`[]string`
10. **Denormalized counters**: User stores TotalTasksCompleted, TotalTasksPosted, TotalEarnings for fast reads

---

**End of Document**
