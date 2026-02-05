# MIGRATION PLAN: Zalo Mini App → Standalone Mobile App

**Project:** Viecz - Dịch Vụ Nhỏ Cho Sinh Viên
**Document Version:** 1.0
**Created:** 2026-02-04
**Author:** Technical Architecture Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Comparison](#2-architecture-comparison)
3. [Technology Stack Migration](#3-technology-stack-migration)
4. [Database Schema Migration](#4-database-schema-migration)
5. [API Endpoint Mapping](#5-api-endpoint-mapping)
6. [New Authentication System](#6-new-authentication-system)
7. [Payment Integration (ZaloPay → PayOS)](#7-payment-integration-zalopay--payos)
8. [Frontend Migration (React/Zalo → React Native)](#8-frontend-migration-reactzalo--react-native)
9. [Security Considerations](#9-security-considerations)
10. [Data Migration Strategy](#10-data-migration-strategy)
11. [Implementation Phases](#11-implementation-phases)
12. [Testing Strategy](#12-testing-strategy)
13. [Deployment Strategy](#13-deployment-strategy)
14. [Rollback Plan](#14-rollback-plan)
15. [Code Examples](#15-code-examples)
16. [Migration Checklist](#16-migration-checklist)

---

## 1. Executive Summary

### 1.1 Migration Rationale

**Problem:** Current system is locked into Zalo ecosystem
- **Platform Dependency:** Must run as Zalo Mini App only
- **User Limitation:** Only accessible to Zalo users (75M in Vietnam)
- **Auth Lock-in:** Zalo OAuth only, no direct user accounts
- **Payment Lock-in:** ZaloPay integration (not yet fully implemented)
- **Distribution Control:** Zalo controls app approval and updates
- **Limited Reach:** Cannot reach iOS App Store or Google Play Store users

**Solution:** Migrate to standalone mobile app
- **Platform Independence:** React Native app on iOS & Android
- **User Control:** Email/password authentication + optional social login
- **Payment Flexibility:** PayOS integration (supports multiple payment methods)
- **Direct Distribution:** Publish to App Store + Play Store
- **Global Reach:** Not limited to Vietnam/Zalo users

### 1.2 Key Benefits

| Benefit | Old System | New System |
|---------|-----------|------------|
| **User Reach** | 75M Zalo users (Vietnam only) | Global iOS & Android users |
| **Authentication** | Zalo OAuth only | Email/password + social login |
| **Payment Methods** | ZaloPay only | PayOS (cards, bank transfer, e-wallets) |
| **Distribution** | Zalo approval required | Direct App Store/Play Store |
| **Platform Control** | Dependent on Zalo | Fully independent |
| **Tech Stack** | FastAPI (Python) + React + Zalo SDK | Gin (Go) + React Native |

### 1.3 Migration Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Data Loss** | High | Comprehensive backup strategy, rollback plan |
| **User Migration** | High | Export Zalo users, email verification system |
| **Downtime** | Medium | Phased migration, parallel systems |
| **Payment Integration** | Medium | Thorough PayOS testing, mock mode first |
| **Performance** | Low | Go is faster than Python, load testing |
| **Learning Curve** | Medium | Go/React Native training, code examples |

### 1.4 Timeline Overview

**Total Estimated Time:** 12-16 weeks

- **Phase 1:** Backend Setup (3 weeks)
- **Phase 2:** Core API Migration (3 weeks)
- **Phase 3:** Payment Integration (2 weeks)
- **Phase 4:** Real-time Features (2 weeks)
- **Phase 5:** React Native Development (4 weeks)
- **Phase 6:** Testing & QA (2 weeks)
- **Phase 7:** Deployment (1 week)

---

## 2. Architecture Comparison

### 2.1 High-Level Architecture Diagrams

#### OLD STACK (Current System)

```
┌──────────────────────────────────────────────────────────────────────┐
│                         ZALO ECOSYSTEM                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              Zalo App (iOS/Android/Web)                      │    │
│  └────────────────────────┬─────────────────────────────────────┘    │
│                           │                                           │
│                           │ WebView                                   │
│                           ▼                                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │           Zalo Mini App (React 19 + MUI)                     │    │
│  │           - HashRouter (required for webview)                │    │
│  │           - zmp-sdk (Zalo Mini Program SDK)                  │    │
│  │           - Jotai (state management)                         │    │
│  └────────────────────────┬─────────────────────────────────────┘    │
│                           │                                           │
└───────────────────────────┼───────────────────────────────────────────┘
                            │
                            │ HTTPS API Calls
                            │
┌───────────────────────────┼───────────────────────────────────────────┐
│                      BACKEND LAYER                                    │
├───────────────────────────┼───────────────────────────────────────────┤
│                           ▼                                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │               FastAPI Server (Python 3.11)                   │    │
│  │               - Uvicorn ASGI server                          │    │
│  │               - Pydantic validation                          │    │
│  │               - SQLAlchemy 2.x ORM                           │    │
│  │               - JWT authentication                           │    │
│  │               - WebSocket (Starlette)                        │    │
│  └────────────────────────┬─────────────────────────────────────┘    │
│                           │                                           │
│                           ▼                                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   SQLite Database                            │    │
│  │                   - Single file (viecz.db)                 │    │
│  │                   - 11 tables                                │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
                            │
                            │ External APIs
                            ▼
┌───────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                                │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐      ┌──────────────────┐                     │
│  │   Zalo OAuth     │      │     ZaloPay      │                     │
│  │                  │      │   (Not Impl.)    │                     │
│  │  Authentication  │      │    Payments      │                     │
│  └──────────────────┘      └──────────────────┘                     │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

#### NEW STACK (Target System)

```
┌──────────────────────────────────────────────────────────────────────┐
│                         MOBILE APPS                                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────┐       ┌──────────────────────────┐    │
│  │     iOS App              │       │     Android App          │    │
│  │  (React Native 0.73+)    │       │  (React Native 0.73+)    │    │
│  │  - React Navigation      │       │  - React Navigation      │    │
│  │  - Redux Toolkit         │       │  - Redux Toolkit         │    │
│  │  - Axios HTTP client     │       │  - Axios HTTP client     │    │
│  │  - AsyncStorage          │       │  - AsyncStorage          │    │
│  └────────────┬─────────────┘       └────────────┬─────────────┘    │
│               │                                   │                  │
│               └─────────────┬─────────────────────┘                  │
│                             │                                        │
└─────────────────────────────┼────────────────────────────────────────┘
                              │
                              │ HTTPS REST API + WebSocket
                              │
┌─────────────────────────────┼────────────────────────────────────────┐
│                         BACKEND LAYER                                 │
├─────────────────────────────┼────────────────────────────────────────┤
│                             ▼                                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                  Gin Web Framework (Go 1.21+)                 │   │
│  │                  - HTTP router (Gin)                          │   │
│  │                  - JWT middleware                             │   │
│  │                  - GORM ORM                                   │   │
│  │                  - Gorilla WebSocket                          │   │
│  │                  - bcrypt password hashing                    │   │
│  └────────────────────────┬──────────────────────────────────────┘   │
│                           │                                           │
│                           ▼                                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │               PostgreSQL Database (15+)                       │   │
│  │               - 11 tables (migrated from SQLite)              │   │
│  │               - Full-text search                              │   │
│  │               - JSON columns                                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└───────────────────────────┬───────────────────────────────────────────┘
                            │
                            │ External APIs
                            ▼
┌───────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                                │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐      ┌──────────────────┐                     │
│  │      PayOS       │      │   SMTP Server    │                     │
│  │                  │      │   (SendGrid)     │                     │
│  │  Payment Gateway │      │  Email Sending   │                     │
│  └──────────────────┘      └──────────────────┘                     │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Mapping

| Old Component | New Component | Changes |
|---------------|---------------|---------|
| **Zalo Mini App** | **React Native App** | Complete rewrite, native APIs |
| **FastAPI (Python)** | **Gin (Go)** | Complete rewrite, same API contracts |
| **SQLite** | **PostgreSQL** | Schema migration, data export/import |
| **Zalo OAuth** | **Email/Password + JWT** | New auth system, user migration |
| **ZaloPay** | **PayOS** | New payment integration |
| **zmp-sdk** | **Native modules** | Platform-specific implementations |
| **HashRouter** | **React Navigation** | Native navigation stack |
| **Jotai** | **Redux Toolkit** | More robust state management |

### 2.3 Infrastructure Changes

| Aspect | Old | New |
|--------|-----|-----|
| **Hosting** | Bare metal server (owned) | Cloud (Railway/Render/AWS) |
| **Database** | SQLite file | PostgreSQL (managed) |
| **Storage** | Local filesystem | S3/R2 (cloud storage) |
| **SSL** | Let's Encrypt (manual) | Managed by cloud provider |
| **Scaling** | Vertical only | Horizontal + Vertical |
| **Deployment** | Manual SSH | CI/CD (GitHub Actions) |

---

## 3. Technology Stack Migration

### 3.1 Backend Migration (FastAPI → Gin)

#### Framework Comparison

| Feature | FastAPI (Python) | Gin (Go) |
|---------|------------------|----------|
| **Type System** | Dynamic (with hints) | Static, compile-time checked |
| **Performance** | ~10K req/s | ~40K req/s (4x faster) |
| **Concurrency** | async/await | Goroutines (native) |
| **Memory Usage** | ~100MB baseline | ~20MB baseline |
| **Startup Time** | ~1s | ~50ms |
| **Deployment** | Python + dependencies | Single binary |
| **Learning Curve** | Easy | Moderate |

#### HTTP Routing Patterns

**FastAPI (Old):**
```python
from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])

@router.get("/")
async def list_tasks(
    current_user: User = Depends(get_current_user),
    status: str = "open",
    page: int = 1,
    limit: int = 20
):
    # Logic here
    return {"data": tasks, "meta": {...}}
```

**Gin (New):**
```go
package routes

import (
    "github.com/gin-gonic/gin"
    "viecz/middleware"
    "viecz/handlers"
)

func SetupTaskRoutes(r *gin.RouterGroup) {
    tasks := r.Group("/tasks")
    tasks.Use(middleware.AuthRequired())
    {
        tasks.GET("/", handlers.ListTasks)
        tasks.POST("/", handlers.CreateTask)
        tasks.GET("/:id", handlers.GetTask)
    }
}
```

#### Middleware Equivalents

| FastAPI | Gin | Purpose |
|---------|-----|---------|
| `Depends(get_current_user)` | `middleware.AuthRequired()` | JWT authentication |
| `CORSMiddleware` | `cors.Default()` | CORS handling |
| Pydantic validation | `binding:"required"` tags | Request validation |
| `try/except` blocks | `recover()` middleware | Error handling |

### 3.2 ORM Migration (SQLAlchemy → GORM)

#### Comparison

| Feature | SQLAlchemy 2.x | GORM |
|---------|----------------|------|
| **Query Style** | SQL-like methods | Chainable methods |
| **Migrations** | Alembic (separate tool) | AutoMigrate (built-in) |
| **Associations** | `relationship()` | Struct tags + preload |
| **Transactions** | `session.begin()` | `db.Transaction()` |
| **Raw SQL** | `session.execute()` | `db.Raw()` |

#### Example Model Definition

**SQLAlchemy (Old):**
```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    price = Column(Integer, nullable=False)
    requester_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    requester = relationship("User", back_populates="posted_tasks")
```

**GORM (New):**
```go
package models

import (
    "time"
    "gorm.io/gorm"
)

type Task struct {
    ID          uint      `gorm:"primaryKey" json:"id"`
    Title       string    `gorm:"size:200;not null" json:"title"`
    Price       int       `gorm:"not null" json:"price"`
    RequesterID uint      `gorm:"not null;index" json:"requester_id"`
    CreatedAt   time.Time `json:"created_at"`

    // Associations
    Requester   User      `gorm:"foreignKey:RequesterID" json:"requester,omitempty"`
}
```

### 3.3 Dependency Injection

**FastAPI (Old):**
```python
from fastapi import Depends
from sqlalchemy.orm import Session
from app.database import get_db

@router.get("/tasks")
async def list_tasks(db: Session = Depends(get_db)):
    tasks = db.query(Task).all()
    return tasks
```

**Gin (New):**
```go
package handlers

import (
    "github.com/gin-gonic/gin"
    "viecz/database"
)

func ListTasks(c *gin.Context) {
    db := database.GetDB() // Global singleton or context injection

    var tasks []models.Task
    db.Find(&tasks)

    c.JSON(200, gin.H{"data": tasks})
}
```

### 3.4 Database Connection

**Old (SQLAlchemy):**
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./data/viecz.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**New (GORM):**
```go
package database

import (
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "log"
)

var DB *gorm.DB

func Connect() {
    dsn := "host=localhost user=postgres password=secret dbname=viecz port=5432 sslmode=disable"

    var err error
    DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }

    log.Println("Database connected successfully")
}

func GetDB() *gorm.DB {
    return DB
}
```

---

## 4. Database Schema Migration

### 4.1 SQLite → PostgreSQL Translation

**Key Differences:**

| SQLite | PostgreSQL | Migration Note |
|--------|------------|----------------|
| `INTEGER` | `INTEGER` or `BIGINT` | Use BIGINT for large numbers |
| `TEXT` | `TEXT` or `VARCHAR(n)` | VARCHAR for indexed strings |
| `REAL` | `DOUBLE PRECISION` | Same precision |
| `BLOB` | `BYTEA` | Binary data |
| `JSON` | `JSONB` | JSONB is faster, indexed |
| `DATETIME` | `TIMESTAMP` | Use `TIMESTAMPTZ` for timezone |
| `AUTOINCREMENT` | `SERIAL` or `BIGSERIAL` | Auto-incrementing IDs |

### 4.2 Schema Translation for All 11 Models

#### 1. Users Table

**SQLite (Old):**
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zalo_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    phone VARCHAR(20),
    email VARCHAR(100),
    university VARCHAR(100) DEFAULT 'ĐHQG-HCM',
    student_id VARCHAR(20),
    is_verified BOOLEAN DEFAULT FALSE,
    rating REAL DEFAULT 5.0,
    total_tasks_completed INTEGER DEFAULT 0,
    total_tasks_posted INTEGER DEFAULT 0,
    is_tasker BOOLEAN DEFAULT FALSE,
    tasker_bio VARCHAR(500),
    tasker_skills JSON DEFAULT '[]',
    total_earnings INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**PostgreSQL (New) - WITH NEW FIELDS:**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    -- NEW: Email/password authentication
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(100),
    email_verification_expires TIMESTAMP,
    password_reset_token VARCHAR(100),
    password_reset_expires TIMESTAMP,

    -- REMOVED: zalo_id (no longer needed)

    -- Existing fields
    name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    phone VARCHAR(20),
    university VARCHAR(100) DEFAULT 'ĐHQG-HCM',
    student_id VARCHAR(20),
    is_verified BOOLEAN DEFAULT FALSE,
    rating DOUBLE PRECISION DEFAULT 5.0,
    total_tasks_completed INTEGER DEFAULT 0,
    total_tasks_posted INTEGER DEFAULT 0,
    is_tasker BOOLEAN DEFAULT FALSE,
    tasker_bio VARCHAR(500),
    tasker_skills JSONB DEFAULT '[]',
    total_earnings BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_email_verified ON users(email_verified);
```

**GORM Model (Go):**
```go
package models

import (
    "time"
    "gorm.io/datatypes"
    "gorm.io/gorm"
)

type User struct {
    ID        uint      `gorm:"primaryKey" json:"id"`

    // NEW: Email/password authentication
    Email                    string    `gorm:"uniqueIndex;size:100;not null" json:"email"`
    PasswordHash             string    `gorm:"size:255;not null" json:"-"` // Don't expose in JSON
    EmailVerified            bool      `gorm:"default:false" json:"email_verified"`
    EmailVerificationToken   *string   `gorm:"size:100" json:"-"`
    EmailVerificationExpires *time.Time `json:"-"`
    PasswordResetToken       *string   `gorm:"size:100" json:"-"`
    PasswordResetExpires     *time.Time `json:"-"`

    // Existing fields
    Name                 string         `gorm:"size:100;not null" json:"name"`
    AvatarURL            *string        `gorm:"size:500" json:"avatar_url,omitempty"`
    Phone                *string        `gorm:"size:20" json:"phone,omitempty"`
    University           string         `gorm:"size:100;default:ĐHQG-HCM" json:"university"`
    StudentID            *string        `gorm:"size:20" json:"student_id,omitempty"`
    IsVerified           bool           `gorm:"default:false" json:"is_verified"`
    Rating               float64        `gorm:"default:5.0" json:"rating"`
    TotalTasksCompleted  int            `gorm:"default:0" json:"total_tasks_completed"`
    TotalTasksPosted     int            `gorm:"default:0" json:"total_tasks_posted"`
    IsTasker             bool           `gorm:"default:false" json:"is_tasker"`
    TaskerBio            *string        `gorm:"size:500" json:"tasker_bio,omitempty"`
    TaskerSkills         datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"tasker_skills"`
    TotalEarnings        int64          `gorm:"default:0" json:"total_earnings"`
    CreatedAt            time.Time      `json:"created_at"`
    UpdatedAt            time.Time      `json:"updated_at"`

    // Associations
    PostedTasks     []Task           `gorm:"foreignKey:RequesterID" json:"posted_tasks,omitempty"`
    AcceptedTasks   []Task           `gorm:"foreignKey:TaskerID" json:"accepted_tasks,omitempty"`
    Applications    []TaskApplication `gorm:"foreignKey:TaskerID" json:"applications,omitempty"`
    SentMessages    []Message        `gorm:"foreignKey:SenderID" json:"sent_messages,omitempty"`
    ReceivedMessages []Message       `gorm:"foreignKey:ReceiverID" json:"received_messages,omitempty"`
    Wallet          *Wallet          `gorm:"foreignKey:UserID" json:"wallet,omitempty"`
}

// Hooks
func (u *User) BeforeCreate(tx *gorm.DB) error {
    // Ensure timestamps
    now := time.Now()
    u.CreatedAt = now
    u.UpdatedAt = now
    return nil
}

func (u *User) BeforeUpdate(tx *gorm.DB) error {
    u.UpdatedAt = time.Now()
    return nil
}
```

#### 2. Tasks Table

**PostgreSQL (New):**
```sql
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tasker_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    price INTEGER NOT NULL CHECK (price > 0),
    price_negotiable BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'in_progress', 'completed', 'cancelled', 'disputed')),
    location_from VARCHAR(200),
    location_to VARCHAR(200),
    deadline TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_requester ON tasks(requester_id);
CREATE INDEX idx_tasks_tasker ON tasks(tasker_id);
CREATE INDEX idx_tasks_category ON tasks(category_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created ON tasks(created_at DESC);
```

**GORM Model (Go):**
```go
package models

import (
    "time"
    "gorm.io/gorm"
)

type TaskStatus string

const (
    TaskStatusOpen       TaskStatus = "open"
    TaskStatusAccepted   TaskStatus = "accepted"
    TaskStatusInProgress TaskStatus = "in_progress"
    TaskStatusCompleted  TaskStatus = "completed"
    TaskStatusCancelled  TaskStatus = "cancelled"
    TaskStatusDisputed   TaskStatus = "disputed"
)

type Task struct {
    ID                  uint       `gorm:"primaryKey" json:"id"`
    RequesterID         uint       `gorm:"not null;index" json:"requester_id"`
    TaskerID            *uint      `gorm:"index" json:"tasker_id,omitempty"`
    CategoryID          uint       `gorm:"not null;index" json:"category_id"`
    Title               string     `gorm:"size:200;not null" json:"title"`
    Description         *string    `gorm:"type:text" json:"description,omitempty"`
    Price               int        `gorm:"not null;check:price > 0" json:"price"`
    PriceNegotiable     bool       `gorm:"default:false" json:"price_negotiable"`
    Status              TaskStatus `gorm:"size:20;default:open;index" json:"status"`
    LocationFrom        *string    `gorm:"size:200" json:"location_from,omitempty"`
    LocationTo          *string    `gorm:"size:200" json:"location_to,omitempty"`
    Deadline            *time.Time `json:"deadline,omitempty"`
    CompletedAt         *time.Time `json:"completed_at,omitempty"`
    CancelledAt         *time.Time `json:"cancelled_at,omitempty"`
    CancellationReason  *string    `gorm:"size:500" json:"cancellation_reason,omitempty"`
    CreatedAt           time.Time  `gorm:"index:idx_tasks_created,sort:desc" json:"created_at"`
    UpdatedAt           time.Time  `json:"updated_at"`

    // Associations
    Requester     User              `gorm:"foreignKey:RequesterID" json:"requester"`
    Tasker        *User             `gorm:"foreignKey:TaskerID" json:"tasker,omitempty"`
    Category      Category          `gorm:"foreignKey:CategoryID" json:"category"`
    Applications  []TaskApplication `gorm:"foreignKey:TaskID" json:"applications,omitempty"`
    Messages      []Message         `gorm:"foreignKey:TaskID" json:"messages,omitempty"`
    Transactions  []Transaction     `gorm:"foreignKey:TaskID" json:"transactions,omitempty"`
}
```

#### 3. Categories Table

**PostgreSQL:**
```sql
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    name_vi VARCHAR(50) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE
);
```

**GORM Model:**
```go
type Category struct {
    ID          uint   `gorm:"primaryKey" json:"id"`
    Name        string `gorm:"size:50;not null" json:"name"`
    NameVi      string `gorm:"size:50;not null" json:"name_vi"`
    Description string `gorm:"type:text" json:"description,omitempty"`
    Icon        string `gorm:"size:50" json:"icon,omitempty"`
    IsActive    bool   `gorm:"default:true" json:"is_active"`

    Tasks []Task `gorm:"foreignKey:CategoryID" json:"tasks,omitempty"`
}
```

#### 4. TaskApplications Table

**PostgreSQL:**
```sql
CREATE TABLE task_applications (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tasker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    proposed_price INTEGER CHECK (proposed_price > 0),
    message VARCHAR(500),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, tasker_id)
);

CREATE INDEX idx_applications_task ON task_applications(task_id);
CREATE INDEX idx_applications_tasker ON task_applications(tasker_id);
```

**GORM Model:**
```go
type ApplicationStatus string

const (
    ApplicationStatusPending  ApplicationStatus = "pending"
    ApplicationStatusAccepted ApplicationStatus = "accepted"
    ApplicationStatusRejected ApplicationStatus = "rejected"
)

type TaskApplication struct {
    ID            uint              `gorm:"primaryKey" json:"id"`
    TaskID        uint              `gorm:"not null;index;uniqueIndex:idx_task_tasker" json:"task_id"`
    TaskerID      uint              `gorm:"not null;index;uniqueIndex:idx_task_tasker" json:"tasker_id"`
    ProposedPrice *int              `gorm:"check:proposed_price > 0" json:"proposed_price,omitempty"`
    Message       *string           `gorm:"size:500" json:"message,omitempty"`
    Status        ApplicationStatus `gorm:"size:20;default:pending" json:"status"`
    CreatedAt     time.Time         `json:"created_at"`

    Task   Task `gorm:"foreignKey:TaskID" json:"task"`
    Tasker User `gorm:"foreignKey:TaskerID" json:"tasker"`
}
```

#### 5. Transactions Table

**PostgreSQL:**
```sql
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    payer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    payee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL,
    platform_fee INTEGER DEFAULT 0,
    type VARCHAR(20) NOT NULL CHECK (type IN ('escrow', 'release', 'refund', 'withdrawal')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'released', 'refunded')),
    payos_order_id VARCHAR(100),
    payos_transaction_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_task ON transactions(task_id);
CREATE INDEX idx_transactions_payos_order ON transactions(payos_order_id);
```

**GORM Model:**
```go
type TransactionType string
type TransactionStatus string

const (
    TransactionTypeEscrow     TransactionType = "escrow"
    TransactionTypeRelease    TransactionType = "release"
    TransactionTypeRefund     TransactionType = "refund"
    TransactionTypeWithdrawal TransactionType = "withdrawal"

    TransactionStatusPending    TransactionStatus = "pending"
    TransactionStatusProcessing TransactionStatus = "processing"
    TransactionStatusSuccess    TransactionStatus = "success"
    TransactionStatusFailed     TransactionStatus = "failed"
    TransactionStatusReleased   TransactionStatus = "released"
    TransactionStatusRefunded   TransactionStatus = "refunded"
)

type Transaction struct {
    ID                   uint              `gorm:"primaryKey" json:"id"`
    TaskID               *uint             `gorm:"index" json:"task_id,omitempty"`
    PayerID              *uint             `json:"payer_id,omitempty"`
    PayeeID              *uint             `json:"payee_id,omitempty"`
    Amount               int               `gorm:"not null" json:"amount"`
    PlatformFee          int               `gorm:"default:0" json:"platform_fee"`
    Type                 TransactionType   `gorm:"size:20;not null" json:"type"`
    Status               TransactionStatus `gorm:"size:20;default:pending" json:"status"`
    PayOSOrderID         *string           `gorm:"size:100;index" json:"payos_order_id,omitempty"`
    PayOSTransactionID   *string           `gorm:"size:100" json:"payos_transaction_id,omitempty"`
    CreatedAt            time.Time         `json:"created_at"`
    UpdatedAt            time.Time         `json:"updated_at"`

    Task *Task `gorm:"foreignKey:TaskID" json:"task,omitempty"`
}
```

#### 6-11. Remaining Tables (Wallets, Messages, Reviews, Notifications, Reports)

**I'll provide PostgreSQL schemas and GORM models for all remaining tables:**

**Wallets:**
```sql
CREATE TABLE wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id),
    type VARCHAR(20) DEFAULT 'user' CHECK (type IN ('user', 'escrow', 'platform')),
    balance BIGINT DEFAULT 0,
    frozen_balance BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

```go
type WalletType string

const (
    WalletTypeUser     WalletType = "user"
    WalletTypeEscrow   WalletType = "escrow"
    WalletTypePlatform WalletType = "platform"
)

type Wallet struct {
    ID            uint       `gorm:"primaryKey" json:"id"`
    UserID        *uint      `gorm:"uniqueIndex" json:"user_id,omitempty"`
    Type          WalletType `gorm:"size:20;default:user" json:"type"`
    Balance       int64      `gorm:"default:0" json:"balance"`
    FrozenBalance int64      `gorm:"default:0" json:"frozen_balance"`
    CreatedAt     time.Time  `json:"created_at"`
    UpdatedAt     time.Time  `json:"updated_at"`

    User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// Computed property
func (w *Wallet) AvailableBalance() int64 {
    return w.Balance - w.FrozenBalance
}
```

**Messages:**
```sql
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_task ON messages(task_id);
```

```go
type Message struct {
    ID         uint      `gorm:"primaryKey" json:"id"`
    TaskID     uint      `gorm:"not null;index" json:"task_id"`
    SenderID   uint      `gorm:"not null" json:"sender_id"`
    ReceiverID uint      `gorm:"not null" json:"receiver_id"`
    Content    string    `gorm:"type:text;not null" json:"content"`
    IsRead     bool      `gorm:"default:false" json:"is_read"`
    ReadAt     *time.Time `json:"read_at,omitempty"`
    CreatedAt  time.Time `json:"created_at"`

    Task     Task `gorm:"foreignKey:TaskID" json:"task"`
    Sender   User `gorm:"foreignKey:SenderID" json:"sender"`
    Receiver User `gorm:"foreignKey:ReceiverID" json:"receiver"`
}
```

**Reviews:**
```sql
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment VARCHAR(500),
    is_for_tasker BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, reviewer_id)
);
```

```go
type Review struct {
    ID          uint      `gorm:"primaryKey" json:"id"`
    TaskID      uint      `gorm:"not null;uniqueIndex:idx_task_reviewer" json:"task_id"`
    ReviewerID  uint      `gorm:"not null;uniqueIndex:idx_task_reviewer" json:"reviewer_id"`
    RevieweeID  uint      `gorm:"not null" json:"reviewee_id"`
    Rating      int       `gorm:"not null;check:rating >= 1 AND rating <= 5" json:"rating"`
    Comment     *string   `gorm:"size:500" json:"comment,omitempty"`
    IsForTasker bool      `gorm:"not null" json:"is_for_tasker"`
    CreatedAt   time.Time `json:"created_at"`

    Task     Task `gorm:"foreignKey:TaskID" json:"task"`
    Reviewer User `gorm:"foreignKey:ReviewerID" json:"reviewer"`
    Reviewee User `gorm:"foreignKey:RevieweeID" json:"reviewee"`
}
```

**Notifications:**
```sql
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    title VARCHAR(100) NOT NULL,
    message VARCHAR(500),
    type VARCHAR(30) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
```

```go
type NotificationType string

const (
    NotificationTypeTaskCreated         NotificationType = "task_created"
    NotificationTypeNewApplication      NotificationType = "new_application"
    NotificationTypeApplicationAccepted NotificationType = "application_accepted"
    NotificationTypeTaskCompleted       NotificationType = "task_completed"
    NotificationTypePaymentReceived     NotificationType = "payment_received"
    NotificationTypeNewMessage          NotificationType = "new_message"
    NotificationTypeSystem              NotificationType = "system"
)

type Notification struct {
    ID        uint             `gorm:"primaryKey" json:"id"`
    UserID    uint             `gorm:"not null;index" json:"user_id"`
    TaskID    *uint            `json:"task_id,omitempty"`
    Title     string           `gorm:"size:100;not null" json:"title"`
    Message   *string          `gorm:"size:500" json:"message,omitempty"`
    Type      NotificationType `gorm:"size:30;not null" json:"type"`
    IsRead    bool             `gorm:"default:false;index" json:"is_read"`
    ReadAt    *time.Time       `json:"read_at,omitempty"`
    CreatedAt time.Time        `json:"created_at"`

    User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
```

**Reports:**
```sql
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

```go
type ReportStatus string

const (
    ReportStatusPending       ReportStatus = "pending"
    ReportStatusInvestigating ReportStatus = "investigating"
    ReportStatusResolved      ReportStatus = "resolved"
    ReportStatusDismissed     ReportStatus = "dismissed"
)

type Report struct {
    ID             uint         `gorm:"primaryKey" json:"id"`
    ReporterID     uint         `gorm:"not null" json:"reporter_id"`
    ReportedUserID uint         `gorm:"not null" json:"reported_user_id"`
    TaskID         *uint        `json:"task_id,omitempty"`
    Reason         string       `gorm:"type:text;not null" json:"reason"`
    Status         ReportStatus `gorm:"size:20;default:pending" json:"status"`
    AdminNotes     *string      `gorm:"type:text" json:"admin_notes,omitempty"`
    CreatedAt      time.Time    `json:"created_at"`
}
```

### 4.3 Data Type Mappings Reference

| SQLite Type | PostgreSQL Type | Go Type (GORM) | Notes |
|-------------|-----------------|----------------|-------|
| `INTEGER` | `INTEGER` | `int`, `uint` | 32-bit |
| `INTEGER` (large) | `BIGINT` | `int64`, `uint64` | 64-bit |
| `REAL` | `DOUBLE PRECISION` | `float64` | 8-byte float |
| `TEXT` | `TEXT` | `string` | Unlimited length |
| `VARCHAR(n)` | `VARCHAR(n)` | `string` | Fixed max length |
| `BOOLEAN` | `BOOLEAN` | `bool` | True/False |
| `DATETIME` | `TIMESTAMP` | `time.Time` | Without timezone |
| `DATETIME` | `TIMESTAMPTZ` | `time.Time` | With timezone (recommended) |
| `JSON` | `JSONB` | `datatypes.JSON` | Indexed JSON |
| `BLOB` | `BYTEA` | `[]byte` | Binary data |

### 4.4 Index Strategy for PostgreSQL

```sql
-- Performance indexes for common queries

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_email_verified ON users(email_verified) WHERE email_verified = false;

-- Tasks
CREATE INDEX idx_tasks_status_category ON tasks(status, category_id);
CREATE INDEX idx_tasks_status_created ON tasks(status, created_at DESC);
CREATE INDEX idx_tasks_requester_status ON tasks(requester_id, status);
CREATE INDEX idx_tasks_tasker_status ON tasks(tasker_id, status) WHERE tasker_id IS NOT NULL;

-- Full-text search on task titles
CREATE INDEX idx_tasks_title_search ON tasks USING gin(to_tsvector('english', title));

-- Messages
CREATE INDEX idx_messages_task_created ON messages(task_id, created_at DESC);
CREATE INDEX idx_messages_unread ON messages(receiver_id, is_read) WHERE is_read = false;

-- Notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE is_read = false;

-- Transactions
CREATE INDEX idx_transactions_user_created ON transactions(payer_id, created_at DESC);
CREATE INDEX idx_transactions_payee_created ON transactions(payee_id, created_at DESC);
```

---

## 5. API Endpoint Mapping

### 5.1 Complete Endpoint Inventory (43 Endpoints)

All endpoints from `/api/v1` will be preserved with same request/response contracts.

#### Authentication Endpoints (7 endpoints)

| Old Endpoint | Method | New Endpoint | Method | Changes |
|--------------|--------|--------------|--------|---------|
| `/auth/zalo` | POST | **REMOVED** | - | Zalo OAuth removed |
| `/auth/dev-login` | POST | **REMOVED** | - | Debug endpoint removed |
| `/auth/refresh` | POST | `/auth/refresh` | POST | ✅ Same logic |
| `/auth/logout` | POST | `/auth/logout` | POST | ✅ Same |
| - | - | `/auth/register` | POST | ✨ NEW |
| - | - | `/auth/login` | POST | ✨ NEW |
| - | - | `/auth/verify-email` | POST | ✨ NEW |
| - | - | `/auth/forgot-password` | POST | ✨ NEW |
| - | - | `/auth/reset-password` | POST | ✨ NEW |

#### Users Endpoints (4 endpoints)

| Endpoint | Method | Status | Changes |
|----------|--------|--------|---------|
| `/users/me` | GET | ✅ Keep | Response removes `zalo_id`, adds `email` |
| `/users/me` | PUT | ✅ Keep | Add `password` change support |
| `/users/:id` | GET | ✅ Keep | Public profile unchanged |
| `/users/become-tasker` | POST | ✅ Keep | No changes |
| `/users/tasker-profile` | PUT | ✅ Keep | No changes |

#### Tasks Endpoints (11 endpoints)

| Endpoint | Method | Status |
|----------|--------|--------|
| `/tasks` | GET | ✅ Keep |
| `/tasks` | POST | ✅ Keep |
| `/tasks/:id` | GET | ✅ Keep |
| `/tasks/:id` | PUT | ✅ Keep |
| `/tasks/:id` | DELETE | ✅ Keep |
| `/tasks/my-posted` | GET | ✅ Keep |
| `/tasks/my-assigned` | GET | ✅ Keep |
| `/tasks/:id/apply` | POST | ✅ Keep |
| `/tasks/:id/applications` | GET | ✅ Keep |
| `/tasks/:id/accept/:app_id` | POST | ✅ Keep |
| `/tasks/:id/complete` | POST | ✅ Keep |

#### Payments Endpoints (7 endpoints)

| Endpoint | Method | Status | Changes |
|----------|--------|--------|---------|
| `/payments/create` | POST | ⚠️ Modify | Replace ZaloPay with PayOS |
| `/payments/status/:id` | GET | ✅ Keep | Change trans ID field |
| `/payments/callback` | POST | ⚠️ Modify | PayOS webhook format |
| `/payments/release/:task_id` | POST | ✅ Keep | Same logic |
| `/payments/refund/:task_id` | POST | ⚠️ Modify | PayOS refund API |
| `/payments/history` | GET | ✅ Keep | No changes |
| `/payments/mode` | GET | ✅ Keep | Show PayOS mode |

#### Wallet Endpoints (4 endpoints)

| Endpoint | Method | Status |
|----------|--------|--------|
| `/wallet/balance` | GET | ✅ Keep |
| `/wallet/history` | GET | ✅ Keep |
| `/wallet/add-funds` | POST | ✅ Keep (dev only) |
| `/wallet/stats` | GET | ✅ Keep |

#### Messages Endpoints (4 endpoints)

| Endpoint | Method | Status |
|----------|--------|--------|
| `/messages/conversations` | GET | ✅ Keep |
| `/messages/task/:id` | GET | ✅ Keep |
| `/messages/task/:id` | POST | ✅ Keep |
| `/messages/:id/read` | PUT | ✅ Keep |

#### Notifications Endpoints (5 endpoints)

| Endpoint | Method | Status |
|----------|--------|--------|
| `/notifications` | GET | ✅ Keep |
| `/notifications/unread-count` | GET | ✅ Keep |
| `/notifications/:id/read` | PUT | ✅ Keep |
| `/notifications/read-all` | PUT | ✅ Keep |
| `/notifications/:id` | DELETE | ✅ Keep |

#### Categories Endpoints (2 endpoints)

| Endpoint | Method | Status |
|----------|--------|--------|
| `/categories` | GET | ✅ Keep |
| `/categories/:id` | GET | ✅ Keep |

#### WebSocket (1 endpoint)

| Endpoint | Protocol | Status |
|----------|----------|--------|
| `/ws/chat/:task_id` | WebSocket | ✅ Keep |

### 5.2 Gin Router Setup

**Project Structure:**
```
backend-go/
├── main.go
├── config/
│   └── config.go
├── database/
│   ├── db.go
│   └── migrate.go
├── models/
│   ├── user.go
│   ├── task.go
│   ├── ...
├── handlers/
│   ├── auth.go
│   ├── users.go
│   ├── tasks.go
│   ├── payments.go
│   ├── messages.go
│   ├── notifications.go
│   └── websocket.go
├── middleware/
│   ├── auth.go
│   ├── cors.go
│   └── logger.go
├── services/
│   ├── auth_service.go
│   ├── task_service.go
│   ├── payment_service.go
│   └── email_service.go
├── routes/
│   └── routes.go
└── utils/
    ├── jwt.go
    ├── password.go
    └── response.go
```

**Main Router (routes/routes.go):**
```go
package routes

import (
    "github.com/gin-gonic/gin"
    "github.com/gin-contrib/cors"
    "viecz/handlers"
    "viecz/middleware"
)

func SetupRoutes() *gin.Engine {
    r := gin.Default()

    // CORS middleware
    r.Use(cors.New(cors.Config{
        AllowOrigins:     []string{"*"}, // Configure in production
        AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
        AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
        ExposeHeaders:    []string{"Content-Length"},
        AllowCredentials: true,
    }))

    // Health check
    r.GET("/health", handlers.HealthCheck)

    // API v1 group
    v1 := r.Group("/api/v1")
    {
        // Public routes (no auth)
        SetupAuthRoutes(v1)
        SetupCategoryRoutes(v1)

        // Protected routes (require auth)
        protected := v1.Group("")
        protected.Use(middleware.AuthRequired())
        {
            SetupUserRoutes(protected)
            SetupTaskRoutes(protected)
            SetupPaymentRoutes(protected)
            SetupWalletRoutes(protected)
            SetupMessageRoutes(protected)
            SetupNotificationRoutes(protected)
        }
    }

    // WebSocket (auth via query param)
    r.GET("/ws/chat/:task_id", handlers.HandleWebSocketChat)

    return r
}

func SetupAuthRoutes(rg *gin.RouterGroup) {
    auth := rg.Group("/auth")
    {
        auth.POST("/register", handlers.Register)
        auth.POST("/login", handlers.Login)
        auth.POST("/verify-email", handlers.VerifyEmail)
        auth.POST("/refresh", handlers.RefreshToken)
        auth.POST("/logout", handlers.Logout)
        auth.POST("/forgot-password", handlers.ForgotPassword)
        auth.POST("/reset-password", handlers.ResetPassword)
    }
}

func SetupUserRoutes(rg *gin.RouterGroup) {
    users := rg.Group("/users")
    {
        users.GET("/me", handlers.GetCurrentUser)
        users.PUT("/me", handlers.UpdateCurrentUser)
        users.GET("/:id", handlers.GetUserByID)
        users.POST("/become-tasker", handlers.BecomeTasker)
        users.PUT("/tasker-profile", handlers.UpdateTaskerProfile)
    }
}

func SetupTaskRoutes(rg *gin.RouterGroup) {
    tasks := rg.Group("/tasks")
    {
        tasks.GET("", handlers.ListTasks)
        tasks.POST("", handlers.CreateTask)
        tasks.GET("/my-posted", handlers.GetMyPostedTasks)
        tasks.GET("/my-assigned", handlers.GetMyAssignedTasks)
        tasks.GET("/:id", handlers.GetTask)
        tasks.PUT("/:id", handlers.UpdateTask)
        tasks.DELETE("/:id", handlers.CancelTask)
        tasks.POST("/:id/apply", handlers.ApplyForTask)
        tasks.GET("/:id/applications", handlers.GetTaskApplications)
        tasks.POST("/:id/accept/:app_id", handlers.AcceptApplication)
        tasks.POST("/:id/complete", handlers.CompleteTask)
    }
}

func SetupPaymentRoutes(rg *gin.RouterGroup) {
    payments := rg.Group("/payments")
    {
        payments.POST("/create", handlers.CreatePayment)
        payments.GET("/status/:id", handlers.GetPaymentStatus)
        payments.POST("/release/:task_id", handlers.ReleasePayment)
        payments.POST("/refund/:task_id", handlers.RefundPayment)
        payments.GET("/history", handlers.GetPaymentHistory)
        payments.GET("/mode", handlers.GetPaymentMode)

        // Public webhook (no auth)
        rg.POST("/payments/callback", handlers.PayOSCallback)
    }
}

func SetupCategoryRoutes(rg *gin.RouterGroup) {
    categories := rg.Group("/categories")
    {
        categories.GET("", handlers.ListCategories)
        categories.GET("/:id", handlers.GetCategory)
    }
}

// ... similar for other routes
```

### 5.3 Handler Function Signatures

**Example Handler (handlers/tasks.go):**
```go
package handlers

import (
    "net/http"
    "strconv"
    "github.com/gin-gonic/gin"
    "viecz/models"
    "viecz/database"
    "viecz/utils"
)

// ListTasks - GET /api/v1/tasks
func ListTasks(c *gin.Context) {
    // Get query parameters
    status := c.DefaultQuery("status", "open")
    categoryID := c.Query("category_id")
    search := c.Query("search")
    page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
    limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

    // Get current user from middleware
    currentUser, _ := c.Get("user")
    user := currentUser.(*models.User)

    // Query database
    db := database.GetDB()
    var tasks []models.Task
    query := db.Preload("Requester").Preload("Category").Where("status = ?", status)

    if categoryID != "" {
        query = query.Where("category_id = ?", categoryID)
    }
    if search != "" {
        query = query.Where("title ILIKE ?", "%"+search+"%")
    }

    // Pagination
    offset := (page - 1) * limit
    var total int64
    query.Count(&total)

    query = query.Offset(offset).Limit(limit).Order("created_at DESC")

    if err := query.Find(&tasks).Error; err != nil {
        c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to fetch tasks"))
        return
    }

    // Response
    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    tasks,
        "meta": gin.H{
            "page":        page,
            "limit":       limit,
            "total":       total,
            "total_pages": (total + int64(limit) - 1) / int64(limit),
        },
    })
}

// CreateTask - POST /api/v1/tasks
func CreateTask(c *gin.Context) {
    var req struct {
        Title           string  `json:"title" binding:"required,min=5,max=200"`
        Description     *string `json:"description"`
        Price           int     `json:"price" binding:"required,gt=0,lte=10000000"`
        PriceNegotiable bool    `json:"price_negotiable"`
        CategoryID      uint    `json:"category_id" binding:"required"`
        LocationFrom    *string `json:"location_from"`
        LocationTo      *string `json:"location_to"`
        Deadline        *string `json:"deadline"` // ISO 8601 string
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, utils.ValidationErrorResponse(err))
        return
    }

    // Get current user
    currentUser, _ := c.Get("user")
    user := currentUser.(*models.User)

    // Create task
    task := models.Task{
        RequesterID:     user.ID,
        Title:           req.Title,
        Description:     req.Description,
        Price:           req.Price,
        PriceNegotiable: req.PriceNegotiable,
        CategoryID:      req.CategoryID,
        LocationFrom:    req.LocationFrom,
        LocationTo:      req.LocationTo,
        Status:          models.TaskStatusOpen,
    }

    // Parse deadline if provided
    if req.Deadline != nil {
        deadline, err := time.Parse(time.RFC3339, *req.Deadline)
        if err == nil {
            task.Deadline = &deadline
        }
    }

    db := database.GetDB()
    if err := db.Create(&task).Error; err != nil {
        c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to create task"))
        return
    }

    // Preload associations
    db.Preload("Requester").Preload("Category").First(&task, task.ID)

    c.JSON(http.StatusCreated, task)
}
```

---

## 6. New Authentication System

### 6.1 Email/Password Registration Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    REGISTRATION FLOW                                      │
└──────────────────────────────────────────────────────────────────────────┘

1. User fills registration form
   ├── Email
   ├── Password (min 8 chars, 1 uppercase, 1 number, 1 special)
   ├── Name
   └── University (optional)

2. Frontend sends POST /api/v1/auth/register

3. Backend validates:
   ├── Email format (RFC 5322)
   ├── Email unique (not already registered)
   ├── Password strength
   └── Required fields

4. Backend creates user:
   ├── Hash password (bcrypt cost 12)
   ├── Generate email verification token (UUID)
   ├── Set email_verified = false
   ├── Save to database
   └── Create wallet with balance 0

5. Backend sends verification email:
   ├── Generate verification link
   ├── Send via SendGrid/SMTP
   └── Expires in 24 hours

6. Response to client:
   {
     "success": true,
     "message": "Please verify your email",
     "user_id": 123
   }

7. User clicks email link → POST /api/v1/auth/verify-email

8. Backend verifies token:
   ├── Check token exists
   ├── Check not expired
   ├── Set email_verified = true
   └── Clear verification token

9. User can now login
```

### 6.2 Authentication Endpoint Definitions

#### 6.2.1 Register Endpoint

**Endpoint:** `POST /api/v1/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "Nguyen Van A",
  "university": "ĐHQG-HCM",
  "phone": "0901234567"
}
```

**Validation Rules:**
- `email`: Valid email format, max 100 chars, unique
- `password`: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
- `name`: 1-100 chars, required
- `university`: Max 100 chars, optional
- `phone`: Max 20 chars, optional

**Response: 201 Created**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "user_id": 123
}
```

**Errors:**
- `400 Bad Request` - Validation failed or email already exists
- `500 Internal Server Error` - Server error

**Go Handler:**
```go
package handlers

import (
    "net/http"
    "time"
    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "viecz/models"
    "viecz/database"
    "viecz/utils"
    "viecz/services"
)

type RegisterRequest struct {
    Email      string  `json:"email" binding:"required,email,max=100"`
    Password   string  `json:"password" binding:"required,min=8,max=100"`
    Name       string  `json:"name" binding:"required,min=1,max=100"`
    University *string `json:"university" binding:"omitempty,max=100"`
    Phone      *string `json:"phone" binding:"omitempty,max=20"`
}

func Register(c *gin.Context) {
    var req RegisterRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, utils.ValidationErrorResponse(err))
        return
    }

    // Additional password validation
    if !utils.IsStrongPassword(req.Password) {
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "error":   "Password must contain uppercase, lowercase, number, and special character",
        })
        return
    }

    db := database.GetDB()

    // Check if email already exists
    var existingUser models.User
    if err := db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "error":   "Email already registered",
        })
        return
    }

    // Hash password
    passwordHash, err := utils.HashPassword(req.Password)
    if err != nil {
        c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to process password"))
        return
    }

    // Generate verification token
    verificationToken := uuid.New().String()
    verificationExpires := time.Now().Add(24 * time.Hour)

    // Create user
    user := models.User{
        Email:                    req.Email,
        PasswordHash:             passwordHash,
        Name:                     req.Name,
        University:               utils.StringOrDefault(req.University, "ĐHQG-HCM"),
        Phone:                    req.Phone,
        EmailVerified:            false,
        EmailVerificationToken:   &verificationToken,
        EmailVerificationExpires: &verificationExpires,
    }

    // Start transaction
    tx := db.Begin()

    if err := tx.Create(&user).Error; err != nil {
        tx.Rollback()
        c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to create user"))
        return
    }

    // Create user wallet
    wallet := models.Wallet{
        UserID:  &user.ID,
        Type:    models.WalletTypeUser,
        Balance: 0,
    }

    if err := tx.Create(&wallet).Error; err != nil {
        tx.Rollback()
        c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to create wallet"))
        return
    }

    tx.Commit()

    // Send verification email (async)
    go services.SendVerificationEmail(user.Email, user.Name, verificationToken)

    c.JSON(http.StatusCreated, gin.H{
        "success": true,
        "message": "Registration successful. Please check your email to verify your account.",
        "user_id": user.ID,
    })
}
```

#### 6.2.2 Login Endpoint

**Endpoint:** `POST /api/v1/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response: 200 OK**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": 123,
    "email": "user@example.com",
    "name": "Nguyen Van A",
    "email_verified": true,
    "is_tasker": false
  }
}
```

**Errors:**
- `400 Bad Request` - Email not verified
- `401 Unauthorized` - Invalid credentials
- `500 Internal Server Error` - Server error

**Go Handler:**
```go
type LoginRequest struct {
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
    AccessToken  string      `json:"access_token"`
    RefreshToken string      `json:"refresh_token"`
    TokenType    string      `json:"token_type"`
    ExpiresIn    int         `json:"expires_in"`
    User         models.User `json:"user"`
}

func Login(c *gin.Context) {
    var req LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, utils.ValidationErrorResponse(err))
        return
    }

    db := database.GetDB()

    // Find user by email
    var user models.User
    if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{
            "success": false,
            "error":   "Invalid email or password",
        })
        return
    }

    // Check email verified
    if !user.EmailVerified {
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "error":   "Please verify your email before logging in",
        })
        return
    }

    // Verify password
    if !utils.CheckPasswordHash(req.Password, user.PasswordHash) {
        c.JSON(http.StatusUnauthorized, gin.H{
            "success": false,
            "error":   "Invalid email or password",
        })
        return
    }

    // Generate JWT tokens
    accessToken, err := utils.GenerateAccessToken(user.ID, user.Email)
    if err != nil {
        c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to generate token"))
        return
    }

    refreshToken, err := utils.GenerateRefreshToken(user.ID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to generate token"))
        return
    }

    // Remove sensitive data
    user.PasswordHash = ""

    c.JSON(http.StatusOK, LoginResponse{
        AccessToken:  accessToken,
        RefreshToken: refreshToken,
        TokenType:    "Bearer",
        ExpiresIn:    3600, // 1 hour
        User:         user,
    })
}
```

#### 6.2.3 Verify Email Endpoint

**Endpoint:** `POST /api/v1/auth/verify-email`

**Request Body:**
```json
{
  "token": "uuid-token-from-email"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Email verified successfully. You can now log in."
}
```

**Go Handler:**
```go
type VerifyEmailRequest struct {
    Token string `json:"token" binding:"required"`
}

func VerifyEmail(c *gin.Context) {
    var req VerifyEmailRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, utils.ValidationErrorResponse(err))
        return
    }

    db := database.GetDB()

    // Find user with this verification token
    var user models.User
    if err := db.Where("email_verification_token = ?", req.Token).First(&user).Error; err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "error":   "Invalid or expired verification token",
        })
        return
    }

    // Check if token expired
    if user.EmailVerificationExpires != nil && time.Now().After(*user.EmailVerificationExpires) {
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "error":   "Verification token has expired. Please request a new one.",
        })
        return
    }

    // Check if already verified
    if user.EmailVerified {
        c.JSON(http.StatusOK, gin.H{
            "success": true,
            "message": "Email already verified",
        })
        return
    }

    // Update user
    user.EmailVerified = true
    user.EmailVerificationToken = nil
    user.EmailVerificationExpires = nil

    if err := db.Save(&user).Error; err != nil {
        c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to verify email"))
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": "Email verified successfully. You can now log in.",
    })
}
```

#### 6.2.4 Forgot Password Endpoint

**Endpoint:** `POST /api/v1/auth/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Password reset link sent to your email"
}
```

**Go Handler:**
```go
type ForgotPasswordRequest struct {
    Email string `json:"email" binding:"required,email"`
}

func ForgotPassword(c *gin.Context) {
    var req ForgotPasswordRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, utils.ValidationErrorResponse(err))
        return
    }

    db := database.GetDB()

    var user models.User
    if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
        // Don't reveal if email exists or not (security)
        c.JSON(http.StatusOK, gin.H{
            "success": true,
            "message": "If that email exists, a password reset link has been sent.",
        })
        return
    }

    // Generate reset token
    resetToken := uuid.New().String()
    resetExpires := time.Now().Add(1 * time.Hour) // 1 hour expiry

    user.PasswordResetToken = &resetToken
    user.PasswordResetExpires = &resetExpires

    if err := db.Save(&user).Error; err != nil {
        c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to process request"))
        return
    }

    // Send reset email (async)
    go services.SendPasswordResetEmail(user.Email, user.Name, resetToken)

    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": "If that email exists, a password reset link has been sent.",
    })
}
```

#### 6.2.5 Reset Password Endpoint

**Endpoint:** `POST /api/v1/auth/reset-password`

**Request Body:**
```json
{
  "token": "uuid-reset-token",
  "new_password": "NewSecurePass123!"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Password reset successfully. You can now log in with your new password."
}
```

**Go Handler:**
```go
type ResetPasswordRequest struct {
    Token       string `json:"token" binding:"required"`
    NewPassword string `json:"new_password" binding:"required,min=8,max=100"`
}

func ResetPassword(c *gin.Context) {
    var req ResetPasswordRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, utils.ValidationErrorResponse(err))
        return
    }

    // Validate password strength
    if !utils.IsStrongPassword(req.NewPassword) {
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "error":   "Password must contain uppercase, lowercase, number, and special character",
        })
        return
    }

    db := database.GetDB()

    var user models.User
    if err := db.Where("password_reset_token = ?", req.Token).First(&user).Error; err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "error":   "Invalid or expired reset token",
        })
        return
    }

    // Check expiry
    if user.PasswordResetExpires != nil && time.Now().After(*user.PasswordResetExpires) {
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "error":   "Reset token has expired. Please request a new one.",
        })
        return
    }

    // Hash new password
    passwordHash, err := utils.HashPassword(req.NewPassword)
    if err != nil {
        c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to process password"))
        return
    }

    // Update password and clear reset token
    user.PasswordHash = passwordHash
    user.PasswordResetToken = nil
    user.PasswordResetExpires = nil

    if err := db.Save(&user).Error; err != nil {
        c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Failed to reset password"))
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": "Password reset successfully. You can now log in with your new password.",
    })
}
```

### 6.3 JWT Implementation in Go

**utils/jwt.go:**
```go
package utils

import (
    "time"
    "errors"
    "github.com/golang-jwt/jwt/v5"
    "viecz/config"
)

type Claims struct {
    UserID uint   `json:"user_id"`
    Email  string `json:"email"`
    jwt.RegisteredClaims
}

// GenerateAccessToken creates a JWT access token (1 hour)
func GenerateAccessToken(userID uint, email string) (string, error) {
    claims := Claims{
        UserID: userID,
        Email:  email,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
            Issuer:    "viecz",
        },
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(config.Get().JWTSecret))
}

// GenerateRefreshToken creates a refresh token (7 days)
func GenerateRefreshToken(userID uint) (string, error) {
    claims := Claims{
        UserID: userID,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
            Issuer:    "viecz-refresh",
        },
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(config.Get().JWTSecret))
}

// ValidateToken parses and validates a JWT token
func ValidateToken(tokenString string) (*Claims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
        // Validate signing method
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, errors.New("unexpected signing method")
        }
        return []byte(config.Get().JWTSecret), nil
    })

    if err != nil {
        return nil, err
    }

    if claims, ok := token.Claims.(*Claims); ok && token.Valid {
        return claims, nil
    }

    return nil, errors.New("invalid token")
}
```

**middleware/auth.go:**
```go
package middleware

import (
    "net/http"
    "strings"
    "github.com/gin-gonic/gin"
    "viecz/utils"
    "viecz/database"
    "viecz/models"
)

func AuthRequired() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Get token from Authorization header
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.JSON(http.StatusUnauthorized, gin.H{
                "error": "Authorization header required",
            })
            c.Abort()
            return
        }

        // Extract token (format: "Bearer <token>")
        parts := strings.SplitN(authHeader, " ", 2)
        if len(parts) != 2 || parts[0] != "Bearer" {
            c.JSON(http.StatusUnauthorized, gin.H{
                "error": "Invalid authorization header format",
            })
            c.Abort()
            return
        }

        tokenString := parts[1]

        // Validate token
        claims, err := utils.ValidateToken(tokenString)
        if err != nil {
            c.JSON(http.StatusUnauthorized, gin.H{
                "error": "Invalid or expired token",
            })
            c.Abort()
            return
        }

        // Get user from database
        db := database.GetDB()
        var user models.User
        if err := db.First(&user, claims.UserID).Error; err != nil {
            c.JSON(http.StatusUnauthorized, gin.H{
                "error": "User not found",
            })
            c.Abort()
            return
        }

        // Store user in context
        c.Set("user", &user)
        c.Set("user_id", user.ID)

        c.Next()
    }
}
```

### 6.4 Password Security

**utils/password.go:**
```go
package utils

import (
    "regexp"
    "golang.org/x/crypto/bcrypt"
)

const BcryptCost = 12 // Bcrypt cost factor (higher = more secure but slower)

// HashPassword hashes a password using bcrypt
func HashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), BcryptCost)
    return string(bytes), err
}

// CheckPasswordHash compares a password with a hash
func CheckPasswordHash(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}

// IsStrongPassword validates password strength
func IsStrongPassword(password string) bool {
    if len(password) < 8 {
        return false
    }

    // Check for uppercase letter
    hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
    // Check for lowercase letter
    hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
    // Check for number
    hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)
    // Check for special character
    hasSpecial := regexp.MustCompile(`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]`).MatchString(password)

    return hasUpper && hasLower && hasNumber && hasSpecial
}
```

### 6.5 Email Service (SendGrid)

**services/email_service.go:**
```go
package services

import (
    "fmt"
    "log"
    "github.com/sendgrid/sendgrid-go"
    "github.com/sendgrid/sendgrid-go/helpers/mail"
    "viecz/config"
)

func SendVerificationEmail(toEmail, toName, token string) error {
    from := mail.NewEmail("Viecz", "noreply@viecz.vn")
    to := mail.NewEmail(toName, toEmail)
    subject := "Verify your Viecz account"

    verifyURL := fmt.Sprintf("%s/verify-email?token=%s", config.Get().FrontendURL, token)

    htmlContent := fmt.Sprintf(`
        <html>
            <body>
                <h2>Welcome to Viecz!</h2>
                <p>Hi %s,</p>
                <p>Thank you for registering. Please click the link below to verify your email address:</p>
                <p><a href="%s">Verify Email</a></p>
                <p>This link will expire in 24 hours.</p>
                <p>If you didn't create this account, please ignore this email.</p>
                <br>
                <p>Best regards,<br>The Viecz Team</p>
            </body>
        </html>
    `, toName, verifyURL)

    message := mail.NewSingleEmail(from, subject, to, "", htmlContent)
    client := sendgrid.NewSendClient(config.Get().SendGridAPIKey)

    response, err := client.Send(message)
    if err != nil {
        log.Printf("Failed to send verification email: %v", err)
        return err
    }

    if response.StatusCode >= 400 {
        log.Printf("SendGrid returned error status: %d", response.StatusCode)
        return fmt.Errorf("failed to send email: status %d", response.StatusCode)
    }

    return nil
}

func SendPasswordResetEmail(toEmail, toName, token string) error {
    from := mail.NewEmail("Viecz", "noreply@viecz.vn")
    to := mail.NewEmail(toName, toEmail)
    subject := "Reset your Viecz password"

    resetURL := fmt.Sprintf("%s/reset-password?token=%s", config.Get().FrontendURL, token)

    htmlContent := fmt.Sprintf(`
        <html>
            <body>
                <h2>Password Reset Request</h2>
                <p>Hi %s,</p>
                <p>We received a request to reset your password. Click the link below to set a new password:</p>
                <p><a href="%s">Reset Password</a></p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
                <br>
                <p>Best regards,<br>The Viecz Team</p>
            </body>
        </html>
    `, toName, resetURL)

    message := mail.NewSingleEmail(from, subject, to, "", htmlContent)
    client := sendgrid.NewSendClient(config.Get().SendGridAPIKey)

    response, err := client.Send(message)
    if err != nil {
        log.Printf("Failed to send password reset email: %v", err)
        return err
    }

    if response.StatusCode >= 400 {
        log.Printf("SendGrid returned error status: %d", response.StatusCode)
        return fmt.Errorf("failed to send email: status %d", response.StatusCode)
    }

    return nil
}
```

### 6.6 Configuration

**config/config.go:**
```go
package config

import (
    "log"
    "os"
    "github.com/joho/godotenv"
)

type Config struct {
    // Server
    Port string
    Environment string

    // Database
    DatabaseURL string

    // JWT
    JWTSecret string

    // SendGrid
    SendGridAPIKey string

    // Frontend
    FrontendURL string

    // PayOS
    PayOSClientID string
    PayOSAPIKey string
    PayOSChecksumKey string
}

var config *Config

func Load() {
    // Load .env file in development
    if os.Getenv("ENVIRONMENT") != "production" {
        if err := godotenv.Load(); err != nil {
            log.Println("No .env file found, using environment variables")
        }
    }

    config = &Config{
        Port:             getEnv("PORT", "8080"),
        Environment:      getEnv("ENVIRONMENT", "development"),
        DatabaseURL:      getEnv("DATABASE_URL", ""),
        JWTSecret:        getEnv("JWT_SECRET", ""),
        SendGridAPIKey:   getEnv("SENDGRID_API_KEY", ""),
        FrontendURL:      getEnv("FRONTEND_URL", "http://localhost:3000"),
        PayOSClientID:    getEnv("PAYOS_CLIENT_ID", ""),
        PayOSAPIKey:      getEnv("PAYOS_API_KEY", ""),
        PayOSChecksumKey: getEnv("PAYOS_CHECKSUM_KEY", ""),
    }

    // Validate required config
    if config.JWTSecret == "" {
        log.Fatal("JWT_SECRET environment variable is required")
    }
    if config.DatabaseURL == "" {
        log.Fatal("DATABASE_URL environment variable is required")
    }
}

func Get() *Config {
    return config
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}
```

**.env.example:**
```env
# Server
PORT=8080
ENVIRONMENT=development

# Database
DATABASE_URL=postgres://user:password@localhost:5432/viecz?sslmode=disable

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# SendGrid
SENDGRID_API_KEY=SG.xxx

# Frontend
FRONTEND_URL=http://localhost:3000

# PayOS
PAYOS_CLIENT_ID=your-client-id
PAYOS_API_KEY=your-api-key
PAYOS_CHECKSUM_KEY=your-checksum-key
```

---

## 7. Payment Integration Migration (ZaloPay → PayOS)

### 7.1 PayOS Overview

**PayOS** is a Vietnamese payment gateway aggregator supporting multiple payment methods:
- ATM cards (domestic)
- Visa/Mastercard (international)
- Bank transfer (QR code)
- E-wallets (MoMo, ZaloPay, VNPay, etc.)
- Installment payments

**Key Advantages over ZaloPay:**
- Multi-channel support (not locked to one wallet)
- Lower transaction fees (1.5-2% vs 2.5-3%)
- Better developer experience
- Modern REST API
- Webhook support for real-time updates

### 7.2 PayOS API Overview

**Base URL:** `https://api-merchant.payos.vn`

**Authentication:** API Key + Checksum signature

**Key Endpoints:**
- `POST /v2/payment-requests` - Create payment link
- `GET /v2/payment-requests/{orderCode}` - Get payment status
- `POST /v2/payment-requests/{orderCode}/cancel` - Cancel payment
- `POST /v2/webhook` - Receive payment updates (configured in dashboard)

### 7.3 PayOS Go SDK Integration

**Install SDK:**
```bash
go get github.com/payos-official/payos-go
```

**services/payment_service.go:**
```go
package services

import (
    "fmt"
    "time"
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "github.com/payos-official/payos-go"
    "viecz/config"
    "viecz/models"
    "viecz/database"
)

type PaymentService struct {
    client *payos.Client
}

func NewPaymentService() *PaymentService {
    cfg := config.Get()
    client := payos.NewClient(
        cfg.PayOSClientID,
        cfg.PayOSAPIKey,
        cfg.PayOSChecksumKey,
    )

    return &PaymentService{
        client: client,
    }
}

// CreatePaymentLink creates a PayOS payment link for task escrow
func (ps *PaymentService) CreatePaymentLink(task *models.Task, user *models.User) (string, *models.Transaction, error) {
    db := database.GetDB()

    // Calculate fees
    platformFeePercent := 5 // 5% platform fee
    platformFee := (task.Price * platformFeePercent) / 100
    totalAmount := task.Price + platformFee

    // Create transaction record
    transaction := &models.Transaction{
        TaskID:      &task.ID,
        PayerID:     &user.ID,
        PayeeID:     &task.TaskerID, // Will be set when tasker accepts
        Amount:      task.Price,
        PlatformFee: platformFee,
        Type:        models.TransactionTypeEscrow,
        Status:      models.TransactionStatusPending,
    }

    if err := db.Create(transaction).Error; err != nil {
        return "", nil, fmt.Errorf("failed to create transaction: %w", err)
    }

    // Generate order code (must be unique and max 6 digits)
    orderCode := fmt.Sprintf("%d", transaction.ID)

    // Update transaction with PayOS order ID
    transaction.PayOSOrderID = &orderCode
    db.Save(transaction)

    // Create payment request
    paymentRequest := &payos.PaymentRequest{
        OrderCode:   orderCode,
        Amount:      totalAmount,
        Description: fmt.Sprintf("Escrow for task: %s", task.Title),
        Items: []payos.Item{
            {
                Name:     task.Title,
                Quantity: 1,
                Price:    task.Price,
            },
            {
                Name:     "Platform Fee",
                Quantity: 1,
                Price:    platformFee,
            },
        },
        CancelUrl: fmt.Sprintf("%s/tasks/%d/payment-cancelled", config.Get().FrontendURL, task.ID),
        ReturnUrl: fmt.Sprintf("%s/tasks/%d/payment-success", config.Get().FrontendURL, task.ID),
        BuyerName: user.Name,
        BuyerEmail: &user.Email,
        BuyerPhone: user.Phone,
    }

    // Create payment link
    response, err := ps.client.CreatePaymentLink(paymentRequest)
    if err != nil {
        // Update transaction status to failed
        transaction.Status = models.TransactionStatusFailed
        db.Save(transaction)
        return "", nil, fmt.Errorf("PayOS API error: %w", err)
    }

    return response.CheckoutUrl, transaction, nil
}

// VerifyWebhookSignature validates PayOS webhook signature
func (ps *PaymentService) VerifyWebhookSignature(data string, receivedSignature string) bool {
    cfg := config.Get()
    h := hmac.New(sha256.New, []byte(cfg.PayOSChecksumKey))
    h.Write([]byte(data))
    expectedSignature := hex.EncodeToString(h.Sum(nil))

    return hmac.Equal([]byte(expectedSignature), []byte(receivedSignature))
}

// HandlePaymentSuccess processes successful payment webhook
func (ps *PaymentService) HandlePaymentSuccess(orderCode string, payosTransactionID string) error {
    db := database.GetDB()

    // Find transaction by PayOS order ID
    var transaction models.Transaction
    if err := db.Where("payos_order_id = ?", orderCode).First(&transaction).Error; err != nil {
        return fmt.Errorf("transaction not found: %w", err)
    }

    // Update transaction
    transaction.Status = models.TransactionStatusSuccess
    transaction.PayOSTransactionID = &payosTransactionID

    if err := db.Save(&transaction).Error; err != nil {
        return fmt.Errorf("failed to update transaction: %w", err)
    }

    // Move funds to escrow wallet
    if err := ps.MoveToEscrow(&transaction); err != nil {
        return fmt.Errorf("failed to move funds to escrow: %w", err)
    }

    // Update task status to "accepted" (if not already)
    if transaction.TaskID != nil {
        var task models.Task
        if err := db.First(&task, *transaction.TaskID).Error; err == nil {
            if task.Status == models.TaskStatusOpen {
                task.Status = models.TaskStatusAccepted
                db.Save(&task)
            }
        }
    }

    // Send notification to both users
    // TODO: Implement notification service

    return nil
}

// MoveToEscrow transfers payment to escrow wallet
func (ps *PaymentService) MoveToEscrow(transaction *models.Transaction) error {
    db := database.GetDB()

    // Get or create escrow wallet
    var escrowWallet models.Wallet
    if err := db.Where("type = ?", models.WalletTypeEscrow).First(&escrowWallet).Error; err != nil {
        // Create escrow wallet if doesn't exist
        escrowWallet = models.Wallet{
            Type:    models.WalletTypeEscrow,
            Balance: 0,
        }
        if err := db.Create(&escrowWallet).Error; err != nil {
            return err
        }
    }

    // Add to escrow balance
    escrowWallet.Balance += int64(transaction.Amount)
    if err := db.Save(&escrowWallet).Error; err != nil {
        return err
    }

    // Update transaction status
    transaction.Status = models.TransactionStatusReleased
    return db.Save(transaction).Error
}

// ReleasePayment releases escrow to tasker when task completed
func (ps *PaymentService) ReleasePayment(taskID uint) error {
    db := database.GetDB()

    // Get task
    var task models.Task
    if err := db.Preload("Tasker").First(&task, taskID).Error; err != nil {
        return fmt.Errorf("task not found: %w", err)
    }

    if task.Status != models.TaskStatusCompleted {
        return fmt.Errorf("task is not completed")
    }

    if task.TaskerID == nil {
        return fmt.Errorf("task has no assigned tasker")
    }

    // Find escrow transaction
    var transaction models.Transaction
    if err := db.Where("task_id = ? AND type = ?", taskID, models.TransactionTypeEscrow).
        First(&transaction).Error; err != nil {
        return fmt.Errorf("escrow transaction not found: %w", err)
    }

    if transaction.Status != models.TransactionStatusReleased {
        return fmt.Errorf("transaction not in escrow")
    }

    // Start transaction
    tx := db.Begin()

    // Get escrow wallet
    var escrowWallet models.Wallet
    if err := tx.Where("type = ?", models.WalletTypeEscrow).First(&escrowWallet).Error; err != nil {
        tx.Rollback()
        return err
    }

    // Deduct from escrow
    escrowWallet.Balance -= int64(transaction.Amount)
    if err := tx.Save(&escrowWallet).Error; err != nil {
        tx.Rollback()
        return err
    }

    // Get tasker wallet
    var taskerWallet models.Wallet
    if err := tx.Where("user_id = ?", task.TaskerID).First(&taskerWallet).Error; err != nil {
        tx.Rollback()
        return err
    }

    // Add to tasker balance
    taskerWallet.Balance += int64(transaction.Amount)
    if err := tx.Save(&taskerWallet).Error; err != nil {
        tx.Rollback()
        return err
    }

    // Update transaction
    transaction.Status = models.TransactionStatusReleased
    transaction.PayeeID = task.TaskerID
    if err := tx.Save(&transaction).Error; err != nil {
        tx.Rollback()
        return err
    }

    // Create release transaction record
    releaseTransaction := models.Transaction{
        TaskID:      &taskID,
        PayerID:     transaction.PayerID,
        PayeeID:     task.TaskerID,
        Amount:      transaction.Amount,
        PlatformFee: 0,
        Type:        models.TransactionTypeRelease,
        Status:      models.TransactionStatusSuccess,
    }
    if err := tx.Create(&releaseTransaction).Error; err != nil {
        tx.Rollback()
        return err
    }

    // Transfer platform fee
    var platformWallet models.Wallet
    if err := tx.Where("type = ?", models.WalletTypePlatform).First(&platformWallet).Error; err != nil {
        // Create platform wallet if doesn't exist
        platformWallet = models.Wallet{
            Type:    models.WalletTypePlatform,
            Balance: 0,
        }
        tx.Create(&platformWallet)
    }
    platformWallet.Balance += int64(transaction.PlatformFee)
    tx.Save(&platformWallet)

    tx.Commit()

    // Send notifications
    // TODO: Implement notification service

    return nil
}

// RefundPayment refunds payment from escrow to requester
func (ps *PaymentService) RefundPayment(taskID uint, reason string) error {
    db := database.GetDB()

    // Get task
    var task models.Task
    if err := db.Preload("Requester").First(&task, taskID).Error; err != nil {
        return fmt.Errorf("task not found: %w", err)
    }

    // Find escrow transaction
    var transaction models.Transaction
    if err := db.Where("task_id = ? AND type = ?", taskID, models.TransactionTypeEscrow).
        First(&transaction).Error; err != nil {
        return fmt.Errorf("escrow transaction not found: %w", err)
    }

    if transaction.Status != models.TransactionStatusReleased {
        return fmt.Errorf("transaction not in escrow")
    }

    // Start transaction
    tx := db.Begin()

    // Get escrow wallet
    var escrowWallet models.Wallet
    if err := tx.Where("type = ?", models.WalletTypeEscrow).First(&escrowWallet).Error; err != nil {
        tx.Rollback()
        return err
    }

    // Deduct from escrow
    escrowWallet.Balance -= int64(transaction.Amount)
    if err := tx.Save(&escrowWallet).Error; err != nil {
        tx.Rollback()
        return err
    }

    // Get requester wallet
    var requesterWallet models.Wallet
    if err := tx.Where("user_id = ?", task.RequesterID).First(&requesterWallet).Error; err != nil {
        tx.Rollback()
        return err
    }

    // Add to requester balance
    requesterWallet.Balance += int64(transaction.Amount)
    if err := tx.Save(&requesterWallet).Error; err != nil {
        tx.Rollback()
        return err
    }

    // Update original transaction
    transaction.Status = models.TransactionStatusRefunded
    if err := tx.Save(&transaction).Error; err != nil {
        tx.Rollback()
        return err
    }

    // Create refund transaction record
    refundTransaction := models.Transaction{
        TaskID:      &taskID,
        PayerID:     transaction.PayerID,
        PayeeID:     transaction.PayerID, // Refund to payer
        Amount:      transaction.Amount,
        PlatformFee: 0,
        Type:        models.TransactionTypeRefund,
        Status:      models.TransactionStatusSuccess,
    }
    if err := tx.Create(&refundTransaction).Error; err != nil {
        tx.Rollback()
        return err
    }

    // Update task status
    task.Status = models.TaskStatusCancelled
    task.CancellationReason = &reason
    now := time.Now()
    task.CancelledAt = &now
    if err := tx.Save(&task).Error; err != nil {
        tx.Rollback()
        return err
    }

    tx.Commit()

    return nil
}

// GetPaymentStatus checks payment status with PayOS
func (ps *PaymentService) GetPaymentStatus(orderCode string) (*payos.PaymentStatus, error) {
    return ps.client.GetPaymentLinkInformation(orderCode)
}

// CancelPayment cancels pending payment
func (ps *PaymentService) CancelPayment(orderCode string, reason string) error {
    return ps.client.CancelPaymentLink(orderCode, reason)
}
```

### 7.4 Payment Webhook Handler

**handlers/payments.go:**
```go
package handlers

import (
    "encoding/json"
    "io/ioutil"
    "net/http"
    "github.com/gin-gonic/gin"
    "viecz/services"
    "viecz/database"
    "viecz/models"
    "viecz/utils"
)

var paymentService = services.NewPaymentService()

// CreatePayment - POST /api/v1/payments/create
func CreatePayment(c *gin.Context) {
    var req struct {
        TaskID uint `json:"task_id" binding:"required"`
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, utils.ValidationErrorResponse(err))
        return
    }

    // Get current user
    currentUser, _ := c.Get("user")
    user := currentUser.(*models.User)

    // Get task
    db := database.GetDB()
    var task models.Task
    if err := db.First(&task, req.TaskID).Error; err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
        return
    }

    // Validate task belongs to user
    if task.RequesterID != user.ID {
        c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
        return
    }

    // Validate task has tasker
    if task.TaskerID == nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Task has no assigned tasker"})
        return
    }

    // Create payment link
    checkoutURL, transaction, err := paymentService.CreatePaymentLink(&task, user)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "checkout_url":   checkoutURL,
        "transaction_id": transaction.ID,
        "amount":         transaction.Amount + transaction.PlatformFee,
    })
}

// PayOSCallback - POST /api/v1/payments/callback (webhook)
func PayOSCallback(c *gin.Context) {
    // Read raw body
    bodyBytes, err := ioutil.ReadAll(c.Request.Body)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read body"})
        return
    }

    // Get signature from header
    signature := c.GetHeader("X-PayOS-Signature")
    if signature == "" {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing signature"})
        return
    }

    // Verify signature
    if !paymentService.VerifyWebhookSignature(string(bodyBytes), signature) {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid signature"})
        return
    }

    // Parse webhook data
    var webhook struct {
        Code string `json:"code"`
        Desc string `json:"desc"`
        Data struct {
            OrderCode         string `json:"orderCode"`
            Amount            int    `json:"amount"`
            Description       string `json:"description"`
            TransactionID     string `json:"transactionDateTime"`
            Reference         string `json:"reference"`
            Status            string `json:"status"` // "PAID" or "CANCELLED"
        } `json:"data"`
    }

    if err := json.Unmarshal(bodyBytes, &webhook); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
        return
    }

    // Process based on status
    switch webhook.Data.Status {
    case "PAID":
        err = paymentService.HandlePaymentSuccess(
            webhook.Data.OrderCode,
            webhook.Data.TransactionID,
        )
    case "CANCELLED":
        // Update transaction to cancelled
        db := database.GetDB()
        db.Model(&models.Transaction{}).
            Where("payos_order_id = ?", webhook.Data.OrderCode).
            Update("status", models.TransactionStatusFailed)
    }

    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, gin.H{"success": true})
}

// ReleasePayment - POST /api/v1/payments/release/:task_id
func ReleasePayment(c *gin.Context) {
    taskID := c.Param("task_id")

    var task models.Task
    db := database.GetDB()
    if err := db.First(&task, taskID).Error; err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
        return
    }

    // Get current user
    currentUser, _ := c.Get("user")
    user := currentUser.(*models.User)

    // Only requester can release payment
    if task.RequesterID != user.ID {
        c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
        return
    }

    // Release payment
    if err := paymentService.ReleasePayment(task.ID); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": "Payment released to tasker",
    })
}

// RefundPayment - POST /api/v1/payments/refund/:task_id
func RefundPayment(c *gin.Context) {
    taskID := c.Param("task_id")

    var req struct {
        Reason string `json:"reason" binding:"required,min=10,max=500"`
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, utils.ValidationErrorResponse(err))
        return
    }

    var task models.Task
    db := database.GetDB()
    if err := db.First(&task, taskID).Error; err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
        return
    }

    // Get current user
    currentUser, _ := c.Get("user")
    user := currentUser.(*models.User)

    // Only requester or admin can refund
    if task.RequesterID != user.ID {
        c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
        return
    }

    // Refund payment
    if err := paymentService.RefundPayment(task.ID, req.Reason); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": "Payment refunded",
    })
}

// GetPaymentStatus - GET /api/v1/payments/status/:order_code
func GetPaymentStatus(c *gin.Context) {
    orderCode := c.Param("order_code")

    status, err := paymentService.GetPaymentStatus(orderCode)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, status)
}

// GetPaymentHistory - GET /api/v1/payments/history
func GetPaymentHistory(c *gin.Context) {
    currentUser, _ := c.Get("user")
    user := currentUser.(*models.User)

    db := database.GetDB()
    var transactions []models.Transaction

    query := db.Where("payer_id = ? OR payee_id = ?", user.ID, user.ID).
        Preload("Task").
        Order("created_at DESC")

    if err := query.Find(&transactions).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch history"})
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    transactions,
    })
}

// GetPaymentMode - GET /api/v1/payments/mode
func GetPaymentMode(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H{
        "mode": "payos",
        "provider": "PayOS",
    })
}
```

### 7.5 Payment Flow Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                    ESCROW PAYMENT FLOW                              │
└────────────────────────────────────────────────────────────────────┘

STEP 1: Requester posts task
   User A creates task: "Help move furniture" (100,000 VND)
   Status: OPEN

STEP 2: Tasker applies and gets accepted
   User B applies → User A accepts
   Status: ACCEPTED

STEP 3: Create payment (escrow deposit)
   User A clicks "Pay Now"
   ├── Frontend: POST /api/v1/payments/create { task_id: 123 }
   ├── Backend creates transaction record
   ├── Backend calls PayOS API
   └── Backend returns checkout URL

STEP 4: User completes payment
   User A redirected to PayOS payment page
   ├── Selects payment method (bank, card, wallet)
   ├── Completes payment
   └── PayOS sends webhook to /api/v1/payments/callback

STEP 5: Webhook processing
   Backend receives PayOS webhook
   ├── Verify signature
   ├── Update transaction status → SUCCESS
   ├── Transfer to escrow wallet
   └── Update task status → IN_PROGRESS

STEP 6: Tasker completes task
   User B marks task complete
   Status: COMPLETED (pending requester confirmation)

STEP 7: Requester confirms completion
   User A confirms work done
   ├── POST /api/v1/payments/release/123
   ├── Backend transfers from escrow → tasker wallet
   ├── Platform fee (5%) → platform wallet
   └── Notification sent to both users

   Final balances:
   - User A: -105,000 VND (task + fee)
   - User B: +100,000 VND (in wallet)
   - Platform: +5,000 VND

STEP 8 (Alternative): Dispute/Refund
   If User A reports issue:
   ├── POST /api/v1/payments/refund/123
   ├── Backend transfers from escrow → requester wallet
   ├── Task status → CANCELLED
   └── Both users notified
```

---

## 8. React Native Frontend Migration

### 8.1 Project Initialization

**Create new React Native project:**
```bash
npx react-native init VieczApp --template react-native-template-typescript
cd VieczApp
```

**Install dependencies:**
```bash
# Navigation
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context

# State management
npm install @reduxjs/toolkit react-redux

# HTTP client
npm install axios

# Forms
npm install react-hook-form yup @hookform/resolvers

# Storage
npm install @react-native-async-storage/async-storage

# UI components
npm install react-native-paper react-native-vector-icons

# Date/time
npm install date-fns

# Push notifications
npm install @react-native-firebase/app @react-native-firebase/messaging

# iOS specific
cd ios && pod install && cd ..
```

### 8.2 Project Structure

```
VieczApp/
├── src/
│   ├── api/
│   │   ├── client.ts              # Axios configuration
│   │   ├── auth.ts                # Auth endpoints
│   │   ├── tasks.ts               # Task endpoints
│   │   ├── payments.ts            # Payment endpoints
│   │   └── users.ts               # User endpoints
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   └── Loading.tsx
│   │   ├── tasks/
│   │   │   ├── TaskCard.tsx
│   │   │   ├── TaskList.tsx
│   │   │   └── TaskFilter.tsx
│   │   └── payments/
│   │       ├── PaymentButton.tsx
│   │       └── WalletBalance.tsx
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   ├── VerifyEmailScreen.tsx
│   │   │   └── ForgotPasswordScreen.tsx
│   │   ├── tasks/
│   │   │   ├── TaskListScreen.tsx
│   │   │   ├── TaskDetailScreen.tsx
│   │   │   ├── CreateTaskScreen.tsx
│   │   │   └── MyTasksScreen.tsx
│   │   ├── profile/
│   │   │   ├── ProfileScreen.tsx
│   │   │   ├── EditProfileScreen.tsx
│   │   │   └── BecomeTaskerScreen.tsx
│   │   └── payments/
│   │       ├── WalletScreen.tsx
│   │       └── PaymentHistoryScreen.tsx
│   ├── navigation/
│   │   ├── AppNavigator.tsx       # Root navigator
│   │   ├── AuthNavigator.tsx      # Auth stack
│   │   └── MainNavigator.tsx      # Main tab navigator
│   ├── store/
│   │   ├── index.ts               # Redux store
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   ├── taskSlice.ts
│   │   │   └── userSlice.ts
│   │   └── hooks.ts               # Typed hooks
│   ├── types/
│   │   ├── api.ts                 # API types
│   │   ├── models.ts              # Data models
│   │   └── navigation.ts          # Navigation types
│   ├── utils/
│   │   ├── storage.ts             # AsyncStorage helpers
│   │   ├── validation.ts          # Form validation
│   │   └── formatters.ts          # Date/currency formatters
│   └── App.tsx                    # Root component
├── android/                        # Android native code
├── ios/                           # iOS native code
├── package.json
└── tsconfig.json
```

### 8.3 API Client Configuration

**src/api/client.ts:**
```typescript
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const API_BASE_URL = __DEV__
  ? 'http://localhost:8080/api/v1' // Development
  : 'https://api.viecz.vn/api/v1'; // Production

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add JWT token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized - Try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token: newRefreshToken } = response.data;

          // Save new tokens
          await AsyncStorage.setItem('access_token', access_token);
          await AsyncStorage.setItem('refresh_token', newRefreshToken);

          // Retry original request
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - logout user
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
        Alert.alert('Session Expired', 'Please log in again.');
        // Navigate to login screen (handled by navigation)
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    if (error.response) {
      const message = error.response.data?.error || 'An error occurred';
      Alert.alert('Error', message);
    } else if (error.request) {
      Alert.alert('Network Error', 'Please check your internet connection');
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

**src/api/auth.ts:**
```typescript
import apiClient from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  university?: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface User {
  id: number;
  email: string;
  name: string;
  email_verified: boolean;
  is_tasker: boolean;
  avatar_url?: string;
  rating: number;
  total_tasks_completed: number;
  total_tasks_posted: number;
}

export const authApi = {
  register: async (data: RegisterRequest) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', data);

    // Save tokens and user
    await AsyncStorage.setItem('access_token', response.data.access_token);
    await AsyncStorage.setItem('refresh_token', response.data.refresh_token);
    await AsyncStorage.setItem('user', JSON.stringify(response.data.user));

    return response.data;
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      // Clear local storage
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
    }
  },

  verifyEmail: async (token: string) => {
    const response = await apiClient.post('/auth/verify-email', { token });
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string) => {
    const response = await apiClient.post('/auth/reset-password', {
      token,
      new_password: newPassword,
    });
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/users/me');
    return response.data;
  },
};
```

### 8.4 Redux Store Setup

**src/store/index.ts:**
```typescript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import taskReducer from './slices/taskSlice';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tasks: taskReducer,
    user: userReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Disable for Date objects
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

**src/store/hooks.ts:**
```typescript
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

**src/store/slices/authSlice.ts:**
```typescript
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authApi, User, LoginRequest, RegisterRequest } from '../../api/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest) => {
    const response = await authApi.login(credentials);
    return response.user;
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (data: RegisterRequest) => {
    return await authApi.register(data);
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await authApi.logout();
});

export const loadUser = createAsyncThunk('auth/loadUser', async () => {
  return await authApi.getCurrentUser();
});

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Login failed';
      })
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Registration failed';
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
      })
      // Load user
      .addCase(loadUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.isAuthenticated = true;
        state.user = action.payload;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
```

### 8.5 Navigation Setup

**src/navigation/AppNavigator.tsx:**
```typescript
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadUser } from '../store/slices/authSlice';

import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import SplashScreen from '../screens/SplashScreen';

const Stack = createStackNavigator();

const AppNavigator: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      try {
        await dispatch(loadUser()).unwrap();
      } catch (error) {
        console.log('Failed to load user:', error);
      }
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated && user ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
```

**src/navigation/MainNavigator.tsx:**
```typescript
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Screens
import TaskListScreen from '../screens/tasks/TaskListScreen';
import TaskDetailScreen from '../screens/tasks/TaskDetailScreen';
import CreateTaskScreen from '../screens/tasks/CreateTaskScreen';
import MyTasksScreen from '../screens/tasks/MyTasksScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import WalletScreen from '../screens/payments/WalletScreen';

const Tab = createBottomTabNavigator();
const TaskStack = createStackNavigator();
const ProfileStack = createStackNavigator();

const TaskStackNavigator = () => (
  <TaskStack.Navigator>
    <TaskStack.Screen
      name="TaskList"
      component={TaskListScreen}
      options={{ title: 'Find Tasks' }}
    />
    <TaskStack.Screen
      name="TaskDetail"
      component={TaskDetailScreen}
      options={{ title: 'Task Details' }}
    />
    <TaskStack.Screen
      name="CreateTask"
      component={CreateTaskScreen}
      options={{ title: 'Post New Task' }}
    />
  </TaskStack.Navigator>
);

const ProfileStackNavigator = () => (
  <ProfileStack.Navigator>
    <ProfileStack.Screen
      name="ProfileMain"
      component={ProfileScreen}
      options={{ title: 'Profile' }}
    />
    <ProfileStack.Screen
      name="Wallet"
      component={WalletScreen}
      options={{ title: 'Wallet' }}
    />
  </ProfileStack.Navigator>
);

const MainNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
      }}
    >
      <Tab.Screen
        name="Tasks"
        component={TaskStackNavigator}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Icon name="briefcase-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MyTasks"
        component={MyTasksScreen}
        options={{
          title: 'My Tasks',
          tabBarIcon: ({ color, size }) => (
            <Icon name="clipboard-list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Icon name="account-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
```

### 8.6 Example Screens

**src/screens/auth/LoginScreen.tsx:**
```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { login } from '../../store/slices/authSlice';

const LoginScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await dispatch(login({ email, password })).unwrap();
      // Navigation handled by AppNavigator
    } catch (err) {
      // Error shown by interceptor
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Log in to your account</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Logging in...' : 'Log In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword' as never)}
          >
            <Text style={styles.linkText}>Forgot password?</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register' as never)}
            >
              <Text style={styles.linkText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkText: {
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 15,
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
});

export default LoginScreen;
```

**src/screens/tasks/TaskListScreen.tsx:**
```typescript
import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../api/client';
import TaskCard from '../../components/tasks/TaskCard';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface Task {
  id: number;
  title: string;
  description: string;
  price: number;
  status: string;
  category: {
    id: number;
    name_vi: string;
  };
  requester: {
    id: number;
    name: string;
    rating: number;
  };
  created_at: string;
}

const TaskListScreen: React.FC = () => {
  const navigation = useNavigation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/tasks', {
        params: { status: 'open', limit: 50 },
      });
      setTasks(response.data.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const handleTaskPress = (taskId: number) => {
    navigation.navigate('TaskDetail' as never, { taskId } as never);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TaskCard task={item} onPress={() => handleTaskPress(item.id)} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tasks available</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateTask' as never)}
      >
        <Icon name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default TaskListScreen;
```

### 8.7 Platform-Specific Considerations

**iOS Configuration (ios/VieczApp/Info.plist):**
```xml
<key>NSCameraUsageDescription</key>
<string>This app needs camera access to upload profile pictures</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>This app needs photo library access to select profile pictures</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app needs location access to find nearby tasks</string>
```

**Android Configuration (android/app/src/main/AndroidManifest.xml):**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
```

---

## 9. Security Implementation Details

### 9.1 Password Requirements

**Minimum Requirements:**
- Length: 8-100 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*)

**Implementation (utils/password.go):**
```go
func IsStrongPassword(password string) bool {
    if len(password) < 8 || len(password) > 100 {
        return false
    }

    hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
    hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
    hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)
    hasSpecial := regexp.MustCompile(`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]`).MatchString(password)

    return hasUpper && hasLower && hasNumber && hasSpecial
}
```

### 9.2 JWT Token Security

**Token Configuration:**
- Access token expiry: 1 hour
- Refresh token expiry: 7 days
- Algorithm: HS256
- Secret: 256-bit random key (stored in environment)

**Secret Rotation Strategy:**
```go
// Support multiple JWT secrets for rotation
type JWTSecrets struct {
    Current  string
    Previous string // Keep old secret for 24h during rotation
}

func ValidateToken(tokenString string) (*Claims, error) {
    secrets := GetJWTSecrets()

    // Try current secret first
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
        return []byte(secrets.Current), nil
    })

    if err != nil && secrets.Previous != "" {
        // Try previous secret (during rotation period)
        token, err = jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
            return []byte(secrets.Previous), nil
        })
    }

    if err != nil {
        return nil, err
    }

    if claims, ok := token.Claims.(*Claims); ok && token.Valid {
        return claims, nil
    }

    return nil, errors.New("invalid token")
}
```

### 9.3 Rate Limiting

**Implementation with gin-rate-limiter:**

```bash
go get github.com/JGLTechnologies/gin-rate-limit
```

**middleware/rate_limit.go:**
```go
package middleware

import (
    "time"
    "github.com/gin-gonic/gin"
    "github.com/JGLTechnologies/gin-rate-limit"
    "github.com/go-redis/redis/v8"
)

func RateLimitMiddleware() gin.HandlerFunc {
    // Use Redis for distributed rate limiting
    store := ratelimit.RedisStore(&ratelimit.RedisOptions{
        RedisClient: redis.NewClient(&redis.Options{
            Addr: "localhost:6379",
        }),
        Rate: time.Minute,
        Limit: 100, // 100 requests per minute
    })

    mw := ratelimit.RateLimiter(store, &ratelimit.Options{
        ErrorHandler: func(c *gin.Context, info ratelimit.Info) {
            c.JSON(429, gin.H{
                "error": "Too many requests. Please try again later.",
                "retry_after": info.ResetTime.Unix(),
            })
        },
        KeyFunc: func(c *gin.Context) string {
            // Rate limit by IP address
            return c.ClientIP()
        },
    })

    return mw
}

// Stricter rate limit for auth endpoints
func AuthRateLimitMiddleware() gin.HandlerFunc {
    store := ratelimit.RedisStore(&ratelimit.RedisOptions{
        RedisClient: redis.NewClient(&redis.Options{
            Addr: "localhost:6379",
        }),
        Rate: time.Minute,
        Limit: 5, // Only 5 login attempts per minute
    })

    mw := ratelimit.RateLimiter(store, &ratelimit.Options{
        ErrorHandler: func(c *gin.Context, info ratelimit.Info) {
            c.JSON(429, gin.H{
                "error": "Too many login attempts. Please try again later.",
                "retry_after": info.ResetTime.Unix(),
            })
        },
        KeyFunc: func(c *gin.Context) string {
            // Rate limit by IP + email combination
            email := c.PostForm("email")
            return c.ClientIP() + ":" + email
        },
    })

    return mw
}
```

**Apply rate limiting:**
```go
func SetupAuthRoutes(rg *gin.RouterGroup) {
    auth := rg.Group("/auth")
    auth.Use(middleware.AuthRateLimitMiddleware()) // Stricter limit
    {
        auth.POST("/register", handlers.Register)
        auth.POST("/login", handlers.Login)
        auth.POST("/forgot-password", handlers.ForgotPassword)
    }
}
```

### 9.4 Input Validation and Sanitization

**Gin validation tags:**
```go
type RegisterRequest struct {
    Email      string  `json:"email" binding:"required,email,max=100"`
    Password   string  `json:"password" binding:"required,min=8,max=100"`
    Name       string  `json:"name" binding:"required,min=1,max=100"`
    University *string `json:"university" binding:"omitempty,max=100"`
    Phone      *string `json:"phone" binding:"omitempty,e164"` // E.164 phone format
}
```

**Custom validators:**
```go
package validators

import (
    "github.com/go-playground/validator/v10"
    "regexp"
)

// Register custom validators
func RegisterCustomValidators(v *validator.Validate) {
    v.RegisterValidation("no_sql_injection", validateNoSQLInjection)
    v.RegisterValidation("no_xss", validateNoXSS)
}

func validateNoSQLInjection(fl validator.FieldLevel) bool {
    value := fl.Field().String()
    // Block common SQL injection patterns
    sqlPatterns := []string{
        `(?i)(\bOR\b|\bAND\b).*=.*`,
        `(?i)UNION.*SELECT`,
        `(?i)DROP.*TABLE`,
        `(?i)INSERT.*INTO`,
        `(?i)DELETE.*FROM`,
        `--`,
        `;`,
    }

    for _, pattern := range sqlPatterns {
        matched, _ := regexp.MatchString(pattern, value)
        if matched {
            return false
        }
    }
    return true
}

func validateNoXSS(fl validator.FieldLevel) bool {
    value := fl.Field().String()
    // Block common XSS patterns
    xssPatterns := []string{
        `<script`,
        `javascript:`,
        `onerror=`,
        `onclick=`,
        `<iframe`,
    }

    for _, pattern := range xssPatterns {
        matched, _ := regexp.MatchString(`(?i)`+pattern, value)
        if matched {
            return false
        }
    }
    return true
}
```

### 9.5 SQL Injection Prevention

**GORM automatically prevents SQL injection via parameterized queries:**

**SAFE (parameterized):**
```go
// ✅ SAFE - GORM uses placeholders
db.Where("email = ?", userInput).First(&user)

// ✅ SAFE - Named parameters
db.Where("price BETWEEN ? AND ?", minPrice, maxPrice).Find(&tasks)
```

**UNSAFE (string concatenation):**
```go
// ❌ DANGEROUS - Don't do this!
db.Raw("SELECT * FROM users WHERE email = '" + userInput + "'").Scan(&user)
```

**Raw queries (when necessary):**
```go
// ✅ SAFE - Use placeholders with Raw()
db.Raw("SELECT * FROM users WHERE email = ?", userInput).Scan(&user)
```

### 9.6 XSS Prevention

**Backend (Go):**
```go
import "html"

func SanitizeHTML(input string) string {
    return html.EscapeString(input)
}

// Use in handlers
task.Description = SanitizeHTML(req.Description)
```

**Frontend (React Native):**
```typescript
import DOMPurify from 'isomorphic-dompurify';

// Sanitize before rendering user content
const sanitizedDescription = DOMPurify.sanitize(task.description);
```

### 9.7 CORS Configuration

**middleware/cors.go:**
```go
package middleware

import (
    "github.com/gin-contrib/cors"
    "github.com/gin-gonic/gin"
    "viecz/config"
)

func SetupCORS() gin.HandlerFunc {
    cfg := config.Get()

    corsConfig := cors.Config{
        AllowOrigins: []string{
            cfg.FrontendURL,              // React Native dev server
            "https://viecz.vn",         // Production domain
            "https://www.viecz.vn",
        },
        AllowMethods: []string{
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS",
        },
        AllowHeaders: []string{
            "Origin",
            "Content-Type",
            "Content-Length",
            "Accept",
            "Authorization",
            "X-Requested-With",
        },
        ExposeHeaders: []string{
            "Content-Length",
            "Content-Type",
        },
        AllowCredentials: true,
        MaxAge:           12 * 3600, // 12 hours
    }

    return cors.New(corsConfig)
}
```

### 9.8 HTTPS Enforcement

**Middleware to redirect HTTP → HTTPS:**
```go
func RedirectHTTPS() gin.HandlerFunc {
    return func(c *gin.Context) {
        if c.Request.Header.Get("X-Forwarded-Proto") == "http" {
            httpsURL := "https://" + c.Request.Host + c.Request.RequestURI
            c.Redirect(301, httpsURL)
            c.Abort()
            return
        }
        c.Next()
    }
}

// Apply in production only
if config.Get().Environment == "production" {
    r.Use(middleware.RedirectHTTPS())
}
```

### 9.9 Account Lockout

**Track failed login attempts:**

**models/failed_login_attempt.go:**
```go
type FailedLoginAttempt struct {
    ID        uint      `gorm:"primaryKey"`
    Email     string    `gorm:"index;size:100"`
    IPAddress string    `gorm:"size:45"`
    Attempts  int       `gorm:"default:1"`
    LockedUntil *time.Time
    CreatedAt time.Time
    UpdatedAt time.Time
}
```

**services/auth_service.go:**
```go
const (
    MaxLoginAttempts = 5
    LockoutDuration  = 15 * time.Minute
)

func CheckAccountLocked(email string) error {
    db := database.GetDB()

    var attempt FailedLoginAttempt
    if err := db.Where("email = ?", email).First(&attempt).Error; err != nil {
        // No failed attempts recorded
        return nil
    }

    if attempt.LockedUntil != nil && time.Now().Before(*attempt.LockedUntil) {
        return fmt.Errorf("account locked until %s", attempt.LockedUntil.Format("15:04:05"))
    }

    return nil
}

func RecordFailedLogin(email, ipAddress string) error {
    db := database.GetDB()

    var attempt FailedLoginAttempt
    if err := db.Where("email = ?", email).First(&attempt).Error; err != nil {
        // First failed attempt
        attempt = FailedLoginAttempt{
            Email:     email,
            IPAddress: ipAddress,
            Attempts:  1,
        }
        return db.Create(&attempt).Error
    }

    // Increment attempts
    attempt.Attempts++
    attempt.IPAddress = ipAddress

    if attempt.Attempts >= MaxLoginAttempts {
        lockUntil := time.Now().Add(LockoutDuration)
        attempt.LockedUntil = &lockUntil
    }

    return db.Save(&attempt).Error
}

func ClearFailedAttempts(email string) error {
    db := database.GetDB()
    return db.Where("email = ?", email).Delete(&FailedLoginAttempt{}).Error
}
```

**Use in login handler:**
```go
func Login(c *gin.Context) {
    var req LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, utils.ValidationErrorResponse(err))
        return
    }

    // Check if account is locked
    if err := services.CheckAccountLocked(req.Email); err != nil {
        c.JSON(http.StatusTooManyRequests, gin.H{
            "success": false,
            "error":   err.Error(),
        })
        return
    }

    // Find user...
    var user models.User
    if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
        services.RecordFailedLogin(req.Email, c.ClientIP())
        c.JSON(http.StatusUnauthorized, gin.H{
            "success": false,
            "error":   "Invalid email or password",
        })
        return
    }

    // Verify password...
    if !utils.CheckPasswordHash(req.Password, user.PasswordHash) {
        services.RecordFailedLogin(req.Email, c.ClientIP())
        c.JSON(http.StatusUnauthorized, gin.H{
            "success": false,
            "error":   "Invalid email or password",
        })
        return
    }

    // Clear failed attempts on successful login
    services.ClearFailedAttempts(req.Email)

    // Generate tokens and respond...
}
```

### 9.10 Email Verification Enforcement

**Middleware to check email verification:**
```go
func RequireEmailVerification() gin.HandlerFunc {
    return func(c *gin.Context) {
        user, exists := c.Get("user")
        if !exists {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
            c.Abort()
            return
        }

        u := user.(*models.User)
        if !u.EmailVerified {
            c.JSON(http.StatusForbidden, gin.H{
                "error": "Please verify your email before accessing this resource",
            })
            c.Abort()
            return
        }

        c.Next()
    }
}

// Apply to specific routes
tasks.POST("", middleware.RequireEmailVerification(), handlers.CreateTask)
```

### 9.11 Fraud Prevention (Placeholder)

**Future Implementation Strategy:**

```go
// services/fraud_detection.go
package services

// Fraud detection will be implemented in future phases
// Current approach: Manual review of suspicious activities

type FraudScore struct {
    UserID     uint
    Score      int // 0-100 (higher = more suspicious)
    Reasons    []string
    ReviewedBy *uint
    ReviewedAt *time.Time
}

// Placeholder signals for fraud detection:
// - Multiple accounts from same IP
// - Rapid task creation/completion
// - Price manipulation patterns
// - Fake reviews
// - Suspicious payment patterns

func CalculateFraudScore(userID uint) int {
    // TODO: Implement fraud detection algorithm
    // - Check for multiple accounts from same device
    // - Analyze task completion patterns
    // - Review rating patterns
    // - Check payment anomalies
    return 0
}

func FlagForManualReview(userID uint, reason string) error {
    // TODO: Create admin dashboard notification
    return nil
}
```

### 9.12 User Verification (Placeholder)

**Future KYC/Identity Verification:**

```go
// models/verification.go
type UserVerification struct {
    ID                uint      `gorm:"primaryKey"`
    UserID            uint      `gorm:"uniqueIndex"`
    VerificationType  string    // "student_id", "government_id", "phone"
    DocumentType      string    // "student_card", "passport", "id_card"
    DocumentNumber    string    // Encrypted
    DocumentImageURL  string    // S3 URL
    Status            string    // "pending", "approved", "rejected"
    RejectionReason   *string
    VerifiedBy        *uint     // Admin user ID
    VerifiedAt        *time.Time
    CreatedAt         time.Time
}

// Future integration:
// - Student ID verification via university database
// - Government ID verification via eKYC providers
// - Phone number verification via SMS OTP
// - Face matching for profile pictures
```

---

## 10. Data Migration Procedures

### 10.1 SQLite Export Script

**scripts/export_sqlite.py:**
```python
#!/usr/bin/env python3
"""
Export data from SQLite to JSON format
"""

import sqlite3
import json
import os
from datetime import datetime

DB_PATH = "../backend/data/viecz.db"
OUTPUT_DIR = "./migration_data"

def export_table(cursor, table_name, output_file):
    """Export table to JSON file"""
    cursor.execute(f"SELECT * FROM {table_name}")
    columns = [description[0] for description in cursor.description]
    rows = cursor.fetchall()

    data = []
    for row in rows:
        record = {}
        for i, column in enumerate(columns):
            value = row[i]
            # Convert datetime strings to ISO format
            if isinstance(value, str) and ('_at' in column or column.endswith('_date')):
                try:
                    dt = datetime.fromisoformat(value)
                    value = dt.isoformat()
                except:
                    pass
            record[column] = value
        data.append(record)

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✓ Exported {len(data)} records from {table_name}")
    return len(data)

def main():
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Connect to SQLite
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]

    print(f"Found {len(tables)} tables to export\n")

    total_records = 0
    for table in tables:
        if table.startswith('sqlite_'):
            continue  # Skip SQLite system tables

        output_file = os.path.join(OUTPUT_DIR, f"{table}.json")
        count = export_table(cursor, table, output_file)
        total_records += count

    conn.close()

    print(f"\n✓ Export complete: {total_records} total records")
    print(f"Output directory: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
```

**Run export:**
```bash
cd scripts
python export_sqlite.py
```

### 10.2 Data Transformation Script

**scripts/transform_data.py:**
```python
#!/usr/bin/env python3
"""
Transform exported data for PostgreSQL import
- Remove zalo_id field from users
- Add placeholder email for users without one
- Convert SQLite types to PostgreSQL types
"""

import json
import os
import hashlib

INPUT_DIR = "./migration_data"
OUTPUT_DIR = "./migration_data_transformed"

def generate_placeholder_email(zalo_id):
    """Generate unique placeholder email for users without email"""
    # Use hash to ensure uniqueness
    hash_suffix = hashlib.md5(zalo_id.encode()).hexdigest()[:8]
    return f"migrated_{hash_suffix}@viecz.temp.vn"

def transform_users(users):
    """Transform users table"""
    transformed = []

    for user in users:
        # Remove zalo_id
        if 'zalo_id' in user:
            zalo_id = user.pop('zalo_id')

            # If no email, create placeholder
            if not user.get('email'):
                user['email'] = generate_placeholder_email(zalo_id)

        # Add new auth fields
        user['password_hash'] = ''  # Will need manual reset
        user['email_verified'] = False  # Require re-verification
        user['email_verification_token'] = None
        user['email_verification_expires'] = None
        user['password_reset_token'] = None
        user['password_reset_expires'] = None

        # Convert tasker_skills from string to JSONB if needed
        if 'tasker_skills' in user and isinstance(user['tasker_skills'], str):
            try:
                user['tasker_skills'] = json.loads(user['tasker_skills'])
            except:
                user['tasker_skills'] = []

        transformed.append(user)

    return transformed

def transform_transactions(transactions):
    """Transform transactions table"""
    transformed = []

    for txn in transactions:
        # Rename ZaloPay fields to PayOS fields
        if 'zalopay_order_id' in txn:
            txn['payos_order_id'] = txn.pop('zalopay_order_id')
        if 'zalopay_transaction_id' in txn:
            txn['payos_transaction_id'] = txn.pop('zalopay_transaction_id')

        transformed.append(txn)

    return transformed

def transform_table(table_name, data):
    """Apply transformations based on table name"""
    if table_name == 'users':
        return transform_users(data)
    elif table_name == 'transactions':
        return transform_transactions(data)
    else:
        return data  # No transformation needed

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for filename in os.listdir(INPUT_DIR):
        if not filename.endswith('.json'):
            continue

        input_path = os.path.join(INPUT_DIR, filename)
        output_path = os.path.join(OUTPUT_DIR, filename)

        with open(input_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        table_name = filename.replace('.json', '')
        transformed = transform_table(table_name, data)

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(transformed, f, indent=2, ensure_ascii=False)

        print(f"✓ Transformed {table_name}: {len(data)} → {len(transformed)} records")

    print(f"\n✓ Transformation complete")
    print(f"Output directory: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
```

### 10.3 PostgreSQL Import Script

**scripts/import_postgres.py:**
```python
#!/usr/bin/env python3
"""
Import transformed data into PostgreSQL
"""

import json
import os
import psycopg2
from psycopg2.extras import execute_values

INPUT_DIR = "./migration_data_transformed"
DB_CONFIG = {
    'dbname': 'viecz',
    'user': 'postgres',
    'password': 'your_password',
    'host': 'localhost',
    'port': '5432'
}

# Table import order (respects foreign key constraints)
TABLE_ORDER = [
    'users',
    'categories',
    'tasks',
    'task_applications',
    'wallets',
    'transactions',
    'messages',
    'reviews',
    'notifications',
    'reports',
]

def import_table(cursor, table_name, data):
    """Import data into PostgreSQL table"""
    if not data:
        print(f"⊘ Skipping {table_name} (no data)")
        return 0

    # Get column names from first record
    columns = list(data[0].keys())
    placeholders = ', '.join(['%s'] * len(columns))
    insert_query = f"""
        INSERT INTO {table_name} ({', '.join(columns)})
        VALUES ({placeholders})
        ON CONFLICT DO NOTHING
    """

    # Prepare values
    values = []
    for record in data:
        row = [record.get(col) for col in columns]
        values.append(row)

    # Execute batch insert
    execute_values(cursor, insert_query, values)

    print(f"✓ Imported {len(values)} records into {table_name}")
    return len(values)

def main():
    # Connect to PostgreSQL
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    print("Connected to PostgreSQL\n")

    total_records = 0
    for table_name in TABLE_ORDER:
        filename = f"{table_name}.json"
        filepath = os.path.join(INPUT_DIR, filename)

        if not os.path.exists(filepath):
            print(f"⊘ Skipping {table_name} (file not found)")
            continue

        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        try:
            count = import_table(cursor, table_name, data)
            total_records += count
            conn.commit()
        except Exception as e:
            print(f"✗ Error importing {table_name}: {e}")
            conn.rollback()

    # Reset sequences
    print("\nResetting PostgreSQL sequences...")
    for table in TABLE_ORDER:
        cursor.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE(MAX(id), 1)) FROM {table}")
    conn.commit()

    cursor.close()
    conn.close()

    print(f"\n✓ Import complete: {total_records} total records")

if __name__ == "__main__":
    main()
```

### 10.4 User Migration Email Campaign

**Email template for existing users:**

**Subject:** 🚀 Viecz is Going Mobile - Action Required

**Body:**
```
Hi [User Name],

We have exciting news! Viecz is launching as a standalone mobile app for iOS and Android.

**What's Changing:**
- New standalone app (no longer Zalo Mini App)
- Better performance and features
- New email/password login system

**Action Required:**
To continue using Viecz, please:

1. Download the new app:
   - iOS: [App Store Link]
   - Android: [Play Store Link]

2. Register with this email: [user@example.com]
   (We've pre-filled this for you)

3. Verify your email

4. Your previous task history and wallet balance will be automatically migrated

**Need Help?**
Contact support: support@viecz.vn

Best regards,
The Viecz Team
```

### 10.5 Rollback Procedures

**Rollback checklist if migration fails:**

1. **Restore SQLite database from backup:**
   ```bash
   cp backup/viecz.db.backup backend/data/viecz.db
   ```

2. **Restart old FastAPI backend:**
   ```bash
   cd backend
   uv run uvicorn app.main:app --reload
   ```

3. **Revert DNS/load balancer to old server**

4. **Notify users of temporary rollback**

5. **Investigate and fix migration issues**

6. **Retry migration during off-peak hours**

---

## 11. WebSocket Migration (Real-time Chat)

### 11.1 Gorilla WebSocket Library

**Install:**
```bash
go get github.com/gorilla/websocket
```

### 11.2 WebSocket Server Implementation

**websocket/hub.go:**
```go
package websocket

import (
    "sync"
)

// Hub maintains active connections and broadcasts messages
type Hub struct {
    // Registered clients (keyed by task ID)
    rooms map[uint]map[*Client]bool

    // Register requests from clients
    register chan *Client

    // Unregister requests from clients
    unregister chan *Client

    // Broadcast messages to a specific room (task)
    broadcast chan *Message

    mu sync.RWMutex
}

type Message struct {
    TaskID    uint   `json:"task_id"`
    SenderID  uint   `json:"sender_id"`
    Content   string `json:"content"`
}

func NewHub() *Hub {
    return &Hub{
        rooms:      make(map[uint]map[*Client]bool),
        register:   make(chan *Client),
        unregister: make(chan *Client),
        broadcast:  make(chan *Message),
    }
}

func (h *Hub) Run() {
    for {
        select {
        case client := <-h.register:
            h.mu.Lock()
            if h.rooms[client.taskID] == nil {
                h.rooms[client.taskID] = make(map[*Client]bool)
            }
            h.rooms[client.taskID][client] = true
            h.mu.Unlock()

        case client := <-h.unregister:
            h.mu.Lock()
            if clients, ok := h.rooms[client.taskID]; ok {
                if _, ok := clients[client]; ok {
                    delete(clients, client)
                    close(client.send)

                    // Remove room if empty
                    if len(clients) == 0 {
                        delete(h.rooms, client.taskID)
                    }
                }
            }
            h.mu.Unlock()

        case message := <-h.broadcast:
            h.mu.RLock()
            clients := h.rooms[message.TaskID]
            h.mu.RUnlock()

            for client := range clients {
                select {
                case client.send <- message:
                default:
                    close(client.send)
                    delete(clients, client)
                }
            }
        }
    }
}
```

**websocket/client.go:**
```go
package websocket

import (
    "encoding/json"
    "log"
    "time"
    "github.com/gorilla/websocket"
    "viecz/models"
    "viecz/database"
)

const (
    writeWait      = 10 * time.Second
    pongWait       = 60 * time.Second
    pingPeriod     = (pongWait * 9) / 10
    maxMessageSize = 512
)

type Client struct {
    hub      *Hub
    conn     *websocket.Conn
    send     chan *Message
    userID   uint
    taskID   uint
}

func (c *Client) readPump() {
    defer func() {
        c.hub.unregister <- c
        c.conn.Close()
    }()

    c.conn.SetReadLimit(maxMessageSize)
    c.conn.SetReadDeadline(time.Now().Add(pongWait))
    c.conn.SetPongHandler(func(string) error {
        c.conn.SetReadDeadline(time.Now().Add(pongWait))
        return nil
    })

    for {
        var msg struct {
            Content string `json:"content"`
        }

        err := c.conn.ReadJSON(&msg)
        if err != nil {
            if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
                log.Printf("WebSocket error: %v", err)
            }
            break
        }

        // Save message to database
        message := models.Message{
            TaskID:     c.taskID,
            SenderID:   c.userID,
            ReceiverID: 0, // Will be set by handler
            Content:    msg.Content,
            IsRead:     false,
        }

        db := database.GetDB()
        if err := db.Create(&message).Error; err != nil {
            log.Printf("Failed to save message: %v", err)
            continue
        }

        // Broadcast to room
        c.hub.broadcast <- &Message{
            TaskID:   c.taskID,
            SenderID: c.userID,
            Content:  msg.Content,
        }
    }
}

func (c *Client) writePump() {
    ticker := time.NewTicker(pingPeriod)
    defer func() {
        ticker.Stop()
        c.conn.Close()
    }()

    for {
        select {
        case message, ok := <-c.send:
            c.conn.SetWriteDeadline(time.Now().Add(writeWait))
            if !ok {
                c.conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            }

            err := c.conn.WriteJSON(message)
            if err != nil {
                return
            }

        case <-ticker.C:
            c.conn.SetWriteDeadline(time.Now().Add(writeWait))
            if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                return
            }
        }
    }
}
```

**handlers/websocket.go:**
```go
package handlers

import (
    "net/http"
    "strconv"
    "github.com/gin-gonic/gin"
    "github.com/gorilla/websocket"
    ws "viecz/websocket"
    "viecz/utils"
    "viecz/database"
    "viecz/models"
)

var (
    upgrader = websocket.Upgrader{
        ReadBufferSize:  1024,
        WriteBufferSize: 1024,
        CheckOrigin: func(r *http.Request) bool {
            return true // Configure properly in production
        },
    }

    hub = ws.NewHub()
)

func init() {
    go hub.Run()
}

// HandleWebSocketChat - GET /ws/chat/:task_id?token=<jwt>
func HandleWebSocketChat(c *gin.Context) {
    taskIDStr := c.Param("task_id")
    taskID, err := strconv.ParseUint(taskIDStr, 10, 32)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
        return
    }

    // Get token from query param
    token := c.Query("token")
    if token == "" {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Token required"})
        return
    }

    // Validate token
    claims, err := utils.ValidateToken(token)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
        return
    }

    // Check if user is part of this task (requester or tasker)
    db := database.GetDB()
    var task models.Task
    if err := db.First(&task, taskID).Error; err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
        return
    }

    isAuthorized := task.RequesterID == claims.UserID ||
        (task.TaskerID != nil && *task.TaskerID == claims.UserID)

    if !isAuthorized {
        c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized for this chat"})
        return
    }

    // Upgrade connection
    conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
    if err != nil {
        log.Printf("Failed to upgrade connection: %v", err)
        return
    }

    client := &ws.Client{
        Hub:    hub,
        Conn:   conn,
        Send:   make(chan *ws.Message, 256),
        UserID: claims.UserID,
        TaskID: uint(taskID),
    }

    hub.Register <- client

    // Start pumps
    go client.WritePump()
    go client.ReadPump()
}
```

### 11.3 React Native WebSocket Client

**src/services/chatService.ts:**
```typescript
import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Message {
  task_id: number;
  sender_id: number;
  content: string;
  timestamp?: string;
}

export const useChatWebSocket = (taskId: number) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [taskId]);

  const connectWebSocket = async () => {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) {
      console.error('No access token');
      return;
    }

    const wsURL = __DEV__
      ? `ws://localhost:8080/ws/chat/${taskId}?token=${token}`
      : `wss://api.viecz.vn/ws/chat/${taskId}?token=${token}`;

    const ws = new WebSocket(wsURL);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const message: Message = JSON.parse(event.data);
      setMessages((prev) => [...prev, message]);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);

      // Reconnect after 3 seconds
      setTimeout(() => {
        connectWebSocket();
      }, 3000);
    };

    wsRef.current = ws;
  };

  const sendMessage = (content: string) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({ content }));
    }
  };

  return {
    messages,
    isConnected,
    sendMessage,
  };
};
```

**Usage in component:**
```typescript
import React, { useState } from 'react';
import { View, TextInput, FlatList, Text, TouchableOpacity } from 'react-native';
import { useChatWebSocket } from '../../services/chatService';

const ChatScreen: React.FC<{ taskId: number }> = ({ taskId }) => {
  const { messages, isConnected, sendMessage } = useChatWebSocket(taskId);
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (inputText.trim()) {
      sendMessage(inputText);
      setInputText('');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={messages}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <View>
            <Text>{item.content}</Text>
          </View>
        )}
      />

      <View style={{ flexDirection: 'row', padding: 10 }}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          style={{ flex: 1, borderWidth: 1, padding: 10 }}
        />
        <TouchableOpacity onPress={handleSend}>
          <Text>Send</Text>
        </TouchableOpacity>
      </View>

      {!isConnected && <Text style={{ color: 'red' }}>Reconnecting...</Text>}
    </View>
  );
};
```

---

## 12. Testing Strategy

### 12.1 Unit Testing in Go

**Install testing tools:**
```bash
go get github.com/stretchr/testify/assert
go get github.com/stretchr/testify/mock
```

**Example test (handlers/auth_test.go):**
```go
package handlers_test

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/assert"
    "viecz/handlers"
    "viecz/database"
)

func setupTestDB() {
    // Setup test database
    database.Connect()
    database.DB.Exec("DELETE FROM users") // Clean slate
}

func TestRegister(t *testing.T) {
    setupTestDB()

    gin.SetMode(gin.TestMode)
    router := gin.Default()
    router.POST("/register", handlers.Register)

    tests := []struct {
        name       string
        payload    map[string]interface{}
        wantStatus int
    }{
        {
            name: "Valid registration",
            payload: map[string]interface{}{
                "email":    "test@example.com",
                "password": "SecurePass123!",
                "name":     "Test User",
            },
            wantStatus: http.StatusCreated,
        },
        {
            name: "Invalid email",
            payload: map[string]interface{}{
                "email":    "invalid-email",
                "password": "SecurePass123!",
                "name":     "Test User",
            },
            wantStatus: http.StatusBadRequest,
        },
        {
            name: "Weak password",
            payload: map[string]interface{}{
                "email":    "test2@example.com",
                "password": "weak",
                "name":     "Test User",
            },
            wantStatus: http.StatusBadRequest,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            body, _ := json.Marshal(tt.payload)
            req := httptest.NewRequest("POST", "/register", bytes.NewBuffer(body))
            req.Header.Set("Content-Type", "application/json")

            w := httptest.NewRecorder()
            router.ServeHTTP(w, req)

            assert.Equal(t, tt.wantStatus, w.Code)
        })
    }
}
```

**Run tests:**
```bash
go test ./... -v
```

### 12.2 Integration Testing

**API contract tests with newman:**
```bash
npm install -g newman
```

**Postman collection export → run with newman:**
```bash
newman run viecz_api_tests.json -e production.json
```

### 12.3 React Native Testing

**Install:**
```bash
npm install --save-dev @testing-library/react-native @testing-library/jest-native
```

**Example test:**
```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../screens/auth/LoginScreen';

describe('LoginScreen', () => {
  it('should show error for invalid credentials', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrong');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(getByText('Invalid email or password')).toBeTruthy();
    });
  });
});
```

### 12.4 Load Testing with k6

**Install:**
```bash
brew install k6  # macOS
```

**Test script (load_test.js):**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
};

export default function () {
  // Test task listing endpoint
  const res = http.get('https://api.viecz.vn/api/v1/tasks');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

**Run:**
```bash
k6 run load_test.js
```

---

## 13. Deployment Architecture

### 13.1 Docker Containerization

**Dockerfile (backend):**
```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /viecz-api .

# Runtime stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/

COPY --from=builder /viecz-api .

EXPOSE 8080

CMD ["./viecz-api"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: viecz
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build: .
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgres://postgres:${DB_PASSWORD}@postgres:5432/viecz
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      SENDGRID_API_KEY: ${SENDGRID_API_KEY}
      PAYOS_CLIENT_ID: ${PAYOS_CLIENT_ID}
      PAYOS_API_KEY: ${PAYOS_API_KEY}
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
```

### 13.2 PostgreSQL Hosting Options

| Option | Pros | Cons | Cost |
|--------|------|------|------|
| **Supabase** | Free tier, built-in auth, easy setup | Limited free tier | Free/$25/mo |
| **Railway** | Simple deployment, automatic backups | No free tier | $5/mo+ |
| **AWS RDS** | Highly scalable, enterprise features | Complex setup | $15/mo+ |
| **DigitalOcean Managed DB** | Simple, reliable | No free tier | $15/mo+ |

**Recommendation:** Start with Supabase free tier, migrate to Railway for production.

### 13.3 Backend Deployment (Railway)

**Deploy to Railway:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Deploy
railway up
```

**railway.json:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "./viecz-api",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 13.4 React Native Deployment

**iOS (App Store):**
```bash
cd ios
pod install
cd ..

# Build release
npx react-native run-ios --configuration Release

# Archive and upload via Xcode
```

**Android (Play Store):**
```bash
cd android

# Generate release AAB
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### 13.5 CI/CD Pipeline (GitHub Actions)

**.github/workflows/deploy.yml:**
```yaml
name: Deploy Backend

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'

      - name: Run tests
        run: go test ./... -v

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          npm install -g @railway/cli
          railway up --service api

  notify:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - name: Send notification
        run: echo "Deployment successful!"
```

### 13.6 Monitoring and Logging

**Sentry for error tracking:**
```bash
go get github.com/getsentry/sentry-go
```

**Initialize:**
```go
import "github.com/getsentry/sentry-go"

func main() {
    err := sentry.Init(sentry.ClientOptions{
        Dsn: "https://xxx@xxx.ingest.sentry.io/xxx",
        Environment: config.Get().Environment,
    })
    if err != nil {
        log.Fatalf("sentry.Init: %s", err)
    }
    defer sentry.Flush(2 * time.Second)

    // ... rest of app
}
```

---

## 14. Implementation Timeline & Phases

### Phase 1: Backend Foundation (Weeks 1-3)

**Week 1: Project Setup**
- [ ] Initialize Go project
- [ ] Setup PostgreSQL database
- [ ] Create GORM models (all 11 tables)
- [ ] Setup Gin router
- [ ] Configure environment variables
- [ ] Setup Docker containers

**Week 2: Core Infrastructure**
- [ ] Implement database connection
- [ ] Create migration scripts
- [ ] Setup Redis for caching
- [ ] Implement JWT authentication
- [ ] Create auth middleware
- [ ] Setup CORS

**Week 3: Testing & CI/CD**
- [ ] Write unit tests for auth
- [ ] Setup GitHub Actions
- [ ] Deploy to Railway staging
- [ ] Load testing setup

### Phase 2: Authentication System (Week 4)

- [ ] Register endpoint
- [ ] Login endpoint
- [ ] Email verification
- [ ] Forgot password
- [ ] Reset password
- [ ] SendGrid integration
- [ ] Rate limiting
- [ ] Account lockout

### Phase 3: Core APIs (Weeks 5-7)

**Week 5: Task APIs**
- [ ] Create task
- [ ] List tasks (with filters)
- [ ] Task detail
- [ ] Update task
- [ ] Delete/cancel task
- [ ] Apply for task
- [ ] Accept application

**Week 6: User & Category APIs**
- [ ] Get user profile
- [ ] Update profile
- [ ] Become tasker
- [ ] List categories
- [ ] User statistics

**Week 7: Reviews & Notifications**
- [ ] Submit review
- [ ] List reviews
- [ ] Create notification
- [ ] List notifications
- [ ] Mark as read

### Phase 4: PayOS Integration (Week 8)

- [ ] Setup PayOS SDK
- [ ] Create payment link
- [ ] Webhook handler
- [ ] Escrow logic
- [ ] Release payment
- [ ] Refund payment
- [ ] Transaction history

### Phase 5: WebSocket Chat (Week 9)

- [ ] Gorilla WebSocket setup
- [ ] Hub implementation
- [ ] Client management
- [ ] Message persistence
- [ ] Testing with multiple clients

### Phase 6: React Native App (Weeks 10-12)

**Week 10: Foundation**
- [ ] Project initialization
- [ ] Navigation setup
- [ ] Redux store
- [ ] API client
- [ ] Auth screens

**Week 11: Core Features**
- [ ] Task list screen
- [ ] Task detail screen
- [ ] Create task screen
- [ ] My tasks screen
- [ ] Profile screen

**Week 12: Advanced Features**
- [ ] Chat screen (WebSocket)
- [ ] Payment integration
- [ ] Push notifications
- [ ] Image upload
- [ ] Polish UI/UX

### Phase 7: Testing & QA (Weeks 13-14)

**Week 13: Testing**
- [ ] Unit tests (Go)
- [ ] Integration tests
- [ ] E2E tests (React Native)
- [ ] Load testing
- [ ] Security testing

**Week 14: Bug Fixes & Polish**
- [ ] Fix critical bugs
- [ ] Performance optimization
- [ ] UI/UX improvements
- [ ] Documentation

### Phase 8: Deployment & Launch (Week 15)

- [ ] Production database setup
- [ ] Deploy backend to production
- [ ] Deploy to App Store
- [ ] Deploy to Play Store
- [ ] Data migration from old system
- [ ] Email existing users
- [ ] Monitor for issues
- [ ] Marketing launch

---

## 15. Migration Checklist

### Pre-Migration

**Backend Preparation:**
- [ ] Go backend fully developed and tested
- [ ] All API endpoints working
- [ ] PayOS integration tested in sandbox
- [ ] WebSocket chat working
- [ ] Production database provisioned
- [ ] Environment variables configured
- [ ] SSL certificates ready

**Frontend Preparation:**
- [ ] React Native app fully developed
- [ ] All screens implemented
- [ ] App Store account ready ($99/year)
- [ ] Play Store account ready ($25 one-time)
- [ ] App icons and screenshots prepared
- [ ] Privacy policy and terms of service written

**Data Preparation:**
- [ ] SQLite export script tested
- [ ] Data transformation script tested
- [ ] PostgreSQL import script tested
- [ ] Test migration on staging environment
- [ ] Rollback procedure documented
- [ ] Backup of production SQLite database

### Migration Day

**T-24 hours:**
- [ ] Announce maintenance window to users
- [ ] Backup current SQLite database
- [ ] Test all migration scripts one final time

**T-0: Start Migration**
1. [ ] Put old system in read-only mode
2. [ ] Export SQLite data
3. [ ] Transform data for PostgreSQL
4. [ ] Import into PostgreSQL
5. [ ] Verify data integrity
6. [ ] Start new backend server
7. [ ] Smoke test all endpoints
8. [ ] Update DNS/load balancer

**T+1 hour: Verification**
- [ ] All data migrated correctly
- [ ] API endpoints responding
- [ ] Payment gateway working
- [ ] WebSocket connections working
- [ ] Email notifications working

**T+4 hours: App Store Deployment**
- [ ] Submit iOS app for review
- [ ] Submit Android app for review
- [ ] Email all users with migration instructions

### Post-Migration

**Day 1:**
- [ ] Monitor error logs
- [ ] Check payment transactions
- [ ] Respond to user support tickets
- [ ] Fix critical bugs

**Week 1:**
- [ ] Track user migration rate
- [ ] Monitor app store reviews
- [ ] Optimize performance
- [ ] Address user feedback

**Month 1:**
- [ ] Evaluate migration success
- [ ] Deprecate old Zalo Mini App
- [ ] Archive old SQLite database
- [ ] Celebrate launch! 🎉

---

## 16. Code Repository Structure

**New project structure:**
```
viecz-v2/
├── backend/                    # Golang + Gin
│   ├── main.go
│   ├── go.mod
│   ├── go.sum
│   ├── Dockerfile
│   ├── config/
│   ├── database/
│   ├── handlers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── websocket/
│   └── tests/
├── mobile/                     # React Native
│   ├── android/
│   ├── ios/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── navigation/
│   │   ├── screens/
│   │   ├── store/
│   │   ├── types/
│   │   └── utils/
│   ├── App.tsx
│   ├── package.json
│   └── tsconfig.json
├── docs/                       # Documentation
│   ├── MIGRATION_PLAN.md
│   ├── API_REFERENCE.md
│   ├── DEPLOYMENT.md
│   └── USER_GUIDE.md
├── scripts/                    # Migration scripts
│   ├── export_sqlite.py
│   ├── transform_data.py
│   ├── import_postgres.py
│   └── seed_categories.sql
├── docker/                     # Docker configs
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── nginx.conf
├── .github/
│   └── workflows/
│       ├── backend-deploy.yml
│       └── mobile-test.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## 17. Dependencies & Libraries

### Go Dependencies (go.mod)

```go
module viecz

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/gin-contrib/cors v1.5.0
    gorm.io/gorm v1.25.5
    gorm.io/driver/postgres v1.5.4
    github.com/golang-jwt/jwt/v5 v5.2.0
    golang.org/x/crypto v0.17.0
    github.com/google/uuid v1.5.0
    github.com/sendgrid/sendgrid-go v3.13.0+incompatible
    github.com/payos-official/payos-go v1.0.0
    github.com/gorilla/websocket v1.5.1
    github.com/go-redis/redis/v8 v8.11.5
    github.com/JGLTechnologies/gin-rate-limit v1.4.0
    github.com/joho/godotenv v1.5.1
    github.com/getsentry/sentry-go v0.26.0
    github.com/stretchr/testify v1.8.4
)
```

### React Native Dependencies (package.json)

```json
{
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.73.0",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/stack": "^6.3.20",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "@reduxjs/toolkit": "^2.0.1",
    "react-redux": "^9.0.4",
    "axios": "^1.6.2",
    "react-hook-form": "^7.49.2",
    "yup": "^1.3.3",
    "@hookform/resolvers": "^3.3.3",
    "@react-native-async-storage/async-storage": "^1.21.0",
    "react-native-paper": "^5.11.3",
    "react-native-vector-icons": "^10.0.3",
    "date-fns": "^3.0.6",
    "@react-native-firebase/app": "^19.0.1",
    "@react-native-firebase/messaging": "^19.0.1"
  },
  "devDependencies": {
    "@babel/core": "^7.23.5",
    "@babel/preset-env": "^7.23.5",
    "@babel/runtime": "^7.23.5",
    "@testing-library/react-native": "^12.4.2",
    "@testing-library/jest-native": "^5.4.3",
    "typescript": "^5.3.3"
  }
}
```

---

## 18. Risk Mitigation

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Data loss during migration** | Low | Critical | Multiple backups, test migrations, rollback plan |
| **Performance issues with Go** | Low | Medium | Load testing, profiling, optimization |
| **PayOS integration bugs** | Medium | High | Thorough testing in sandbox, fallback to manual processing |
| **WebSocket connection issues** | Medium | Medium | Automatic reconnection, fallback to REST polling |
| **React Native crashes** | Low | High | Comprehensive testing, error boundaries, Sentry |
| **App Store rejection** | Medium | Medium | Follow guidelines strictly, prepare for resubmission |

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **User resistance to change** | High | High | Clear communication, migration guide, support team |
| **Loss of users during transition** | Medium | High | Email campaign, incentives for early adopters |
| **Competitors gain market share** | Medium | Medium | Fast migration timeline, better features |
| **Budget overruns** | Medium | Medium | Phased development, MVP first approach |

### Mitigation Strategies

**Communication Plan:**
1. Announce migration 4 weeks in advance
2. Weekly email updates
3. In-app notifications
4. Dedicated support email
5. FAQ page
6. Video tutorial for new app

**User Retention Strategy:**
1. Early adopter bonus (e.g., 50,000 VND credit)
2. Referral program
3. Loyalty program for existing users
4. Feature improvements (faster, better UI)

**Rollback Plan:**
- Keep old system running for 2 weeks
- Easy switch back if critical issues
- Gradual user migration (10% → 50% → 100%)

---

> **Last Updated:** 2026-02-04
> **Document Version:** 2.0 (Complete)
> **Total Sections:** 18