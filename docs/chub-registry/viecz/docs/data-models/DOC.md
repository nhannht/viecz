---
name: data-models
description: "Viecz data models — Go GORM structs and TypeScript interfaces for User, Task, Wallet, Transaction, Notification, Chat"
metadata:
  languages: "go,typescript"
  versions: "1.0.0"
  source: maintainer
  tags: "viecz,models,gorm,postgresql,typescript,interfaces"
  updated-on: "2026-03-29"
---

# Viecz Data Models

13 PostgreSQL tables via GORM. TypeScript interfaces mirror the JSON responses.

## User

```go
type User struct {
    ID                  int64      `json:"id" gorm:"primaryKey"`
    Email               *string    `json:"email" gorm:"uniqueIndex"`
    Phone               *string    `json:"phone" gorm:"uniqueIndex"`
    Name                string     `json:"name" binding:"required"`
    AvatarURL           *string    `json:"avatar_url"`
    Bio                 *string    `json:"bio" binding:"max=500"`
    University          string     `json:"university" gorm:"default:'ĐHQG-HCM'"`
    StudentID           *string    `json:"student_id"`
    AuthProvider        string     `json:"auth_provider"` // "email" | "google" | "phone"
    GoogleID            *string    `json:"-" gorm:"uniqueIndex"`
    EmailVerified       bool       `json:"email_verified" gorm:"default:false"`
    PhoneVerified       bool       `json:"phone_verified" gorm:"default:false"`
    PasswordHash        *string    `json:"-"`
    Rating              float64    `json:"rating" gorm:"default:0"`
    TotalTasksCompleted int        `json:"total_tasks_completed" gorm:"default:0"`
    TotalTasksPosted    int        `json:"total_tasks_posted" gorm:"default:0"`
    TotalEarnings       int64      `json:"total_earnings" gorm:"default:0"`
    IsVerified          bool       `json:"is_verified" gorm:"default:false"`
    CreatedAt           time.Time  `json:"created_at"`
    UpdatedAt           time.Time  `json:"updated_at"`
}
```

```typescript
interface User {
  id: number;
  email: string;
  name: string;
  avatar_url: string;
  phone: string;
  bio: string;
  university: string;
  student_id: string;
  is_verified: boolean;
  rating: number;
  total_tasks_completed: number;
  total_tasks_posted: number;
  total_earnings: number;
  auth_provider: string;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
}
```

## Task

```go
type TaskStatus string
const (
    TaskStatusOpen       TaskStatus = "open"
    TaskStatusInProgress TaskStatus = "in_progress"
    TaskStatusCompleted  TaskStatus = "completed"
    TaskStatusCancelled  TaskStatus = "cancelled"
)

type Task struct {
    ID                int64       `json:"id" gorm:"primaryKey"`
    RequesterID       int64       `json:"requester_id" gorm:"index"`
    TaskerID          *int64      `json:"tasker_id" gorm:"index"`
    CategoryID        int64       `json:"category_id"`
    Title             string      `json:"title" binding:"required,max=200"`
    Description       string      `json:"description" binding:"required,max=2000"`
    Price             int64       `json:"price" binding:"required,gt=0"`
    Location          string      `json:"location" binding:"required,max=255"`
    Latitude          *float64    `json:"latitude"`
    Longitude         *float64    `json:"longitude"`
    ImageURLs         []string    `json:"image_urls" gorm:"type:text[]"`
    Status            TaskStatus  `json:"status" gorm:"default:'open';index"`
    Deadline          *time.Time  `json:"deadline"`
    CompletedAt       *time.Time  `json:"completed_at"`
    CreatedAt         time.Time   `json:"created_at"`
    UpdatedAt         time.Time   `json:"updated_at"`
    // Relations
    Category          *Category   `json:"category,omitempty"`
}
```

```typescript
type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

interface Task {
  id: number;
  requester_id: number;
  tasker_id: number | null;
  category_id: number;
  title: string;
  description: string;
  price: number;           // VND, must be > 0
  location: string;
  latitude: number | null;
  longitude: number | null;
  status: TaskStatus;
  deadline: string | null;
  completed_at: string | null;
  image_urls: string[];
  created_at: string;
  updated_at: string;
  // Computed fields (from API):
  user_has_applied: boolean;
  is_overdue: boolean;
  category?: Category;
  application_count?: number;
  distance_km?: number;    // populated when lat/lng query params sent
}
```

## TaskApplication

```go
type ApplicationStatus string
const (
    ApplicationPending  ApplicationStatus = "pending"
    ApplicationAccepted ApplicationStatus = "accepted"
    ApplicationRejected ApplicationStatus = "rejected"
)

type TaskApplication struct {
    ID            int64             `json:"id" gorm:"primaryKey"`
    TaskID        int64             `json:"task_id" gorm:"index"`
    TaskerID      int64             `json:"tasker_id" gorm:"index"`
    ProposedPrice *int64            `json:"proposed_price"`
    Message       *string           `json:"message" binding:"max=500"`
    Status        ApplicationStatus `json:"status" gorm:"default:'pending'"`
    CreatedAt     time.Time         `json:"created_at"`
    UpdatedAt     time.Time         `json:"updated_at"`
    Tasker        *User             `json:"tasker,omitempty"`
}
```

## Wallet

```go
type Wallet struct {
    ID             int64     `json:"id" gorm:"primaryKey"`
    UserID         int64     `json:"user_id" gorm:"uniqueIndex"`
    Balance        int64     `json:"balance" gorm:"default:0"`
    EscrowBalance  int64     `json:"escrow_balance" gorm:"default:0"`
    TotalDeposited int64     `json:"total_deposited" gorm:"default:0"`
    TotalWithdrawn int64     `json:"total_withdrawn" gorm:"default:0"`
    TotalEarned    int64     `json:"total_earned" gorm:"default:0"`
    TotalSpent     int64     `json:"total_spent" gorm:"default:0"`
    CreatedAt      time.Time `json:"created_at"`
    UpdatedAt      time.Time `json:"updated_at"`
}

// Key methods:
func (w *Wallet) HasSufficientBalance(amount int64) bool
func (w *Wallet) Deduct(amount int64) error
func (w *Wallet) Credit(amount int64)
func (w *Wallet) HoldInEscrow(amount int64) error
func (w *Wallet) ReleaseFromEscrow(amount int64) error
func (w *Wallet) RefundFromEscrow(amount int64) error
```

```typescript
interface Wallet {
  id: number;
  user_id: number;
  balance: number;
  escrow_balance: number;
  available_balance: number;  // balance - escrow (computed by API)
  total_deposited: number;
  total_withdrawn: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}
```

## Transaction

```go
type TransactionType string
const (
    TransactionEscrow      TransactionType = "escrow"
    TransactionRelease     TransactionType = "release"
    TransactionRefund      TransactionType = "refund"
    TransactionPlatformFee TransactionType = "platform_fee"
    TransactionDeposit     TransactionType = "deposit"
    TransactionWithdrawal  TransactionType = "withdrawal"
)

type TransactionStatus string
const (
    TransactionPending   TransactionStatus = "pending"
    TransactionSuccess   TransactionStatus = "success"
    TransactionFailed    TransactionStatus = "failed"
    TransactionCancelled TransactionStatus = "cancelled"
)
```

## WalletTransaction (Ledger)

```go
type WalletTransactionType string
const (
    WTDeposit        WalletTransactionType = "deposit"
    WTWithdrawal     WalletTransactionType = "withdrawal"
    WTEscrowHold     WalletTransactionType = "escrow_hold"
    WTEscrowRelease  WalletTransactionType = "escrow_release"
    WTEscrowRefund   WalletTransactionType = "escrow_refund"
    WTPaymentReceived WalletTransactionType = "payment_received"
    WTPlatformFee    WalletTransactionType = "platform_fee"
)

type WalletTransaction struct {
    ID              int64                 `json:"id"`
    WalletID        int64                 `json:"wallet_id"`
    TransactionID   *int64                `json:"transaction_id"`
    TaskID          *int64                `json:"task_id"`
    Type            WalletTransactionType `json:"type"`
    Amount          int64                 `json:"amount"`
    BalanceBefore   int64                 `json:"balance_before"`
    BalanceAfter    int64                 `json:"balance_after"`
    EscrowBefore    int64                 `json:"escrow_before"`
    EscrowAfter     int64                 `json:"escrow_after"`
    Description     string                `json:"description"`
    ReferenceUserID *int64                `json:"reference_user_id"`
    CreatedAt       time.Time             `json:"created_at"`
}
```

## Notification

```go
type NotificationType string
const (
    NotifTaskCreated         NotificationType = "task_created"
    NotifApplicationReceived NotificationType = "application_received"
    NotifApplicationSent     NotificationType = "application_sent"
    NotifApplicationAccepted NotificationType = "application_accepted"
    NotifTaskCompleted       NotificationType = "task_completed"
    NotifPaymentReceived     NotificationType = "payment_received"
    NotifTaskCancelled       NotificationType = "task_cancelled"
)
```

## Conversation & Message

```go
type Conversation struct {
    ID            uint       `json:"id" gorm:"primaryKey"`
    TaskID        uint       `json:"task_id" gorm:"index"`
    PosterID      uint       `json:"poster_id" gorm:"index"`
    TaskerID      uint       `json:"tasker_id" gorm:"index"`
    LastMessageAt *time.Time `json:"last_message_at"`
    LastMessage   string     `json:"last_message"`
}

type Message struct {
    ID             uint       `json:"id" gorm:"primaryKey"`
    ConversationID uint       `json:"conversation_id" gorm:"index"`
    SenderID       uint       `json:"sender_id" gorm:"index"`
    Content        string     `json:"content" binding:"required"`
    IsRead         bool       `json:"is_read" gorm:"default:false"`
    ReadAt         *time.Time `json:"read_at"`
}
```

## Category

```go
type Category struct {
    ID       int64  `json:"id" gorm:"primaryKey"`
    Name     string `json:"name"`
    NameVI   string `json:"name_vi"`
    IsActive bool   `json:"is_active"`
}
```

## BankAccount

```go
type BankAccount struct {
    ID                int64     `json:"id" gorm:"primaryKey"`
    UserID            int64     `json:"user_id" gorm:"index"`
    BankBIN           string    `json:"bank_bin"`
    BankName          string    `json:"bank_name"`
    AccountNumber     string    `json:"account_number"`
    AccountHolderName string    `json:"account_holder_name"`
    IsDefault         bool      `json:"is_default"`
    CreatedAt         time.Time `json:"created_at"`
}
```

## Currency

All monetary values are in **VND (Vietnamese Dong)**, stored as `int64`. Prices must be multiples of 1000.
