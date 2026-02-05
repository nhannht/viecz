# Technical Architecture - Dịch Vụ Nhỏ Cho Sinh Viên

**Author:** Tech Lead
**Version:** 1.1
**Created:** 2026-01-14
**Last Updated:** 2026-01-14

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Architecture Principles](#3-architecture-principles)
4. [Technology Stack](#4-technology-stack)
5. [System Architecture](#5-system-architecture)
6. [Database Design](#6-database-design)
7. [API Design](#7-api-design)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Real-time Communication](#9-real-time-communication)
10. [Payment Integration](#10-payment-integration)
11. [Security Architecture](#11-security-architecture)
12. [Infrastructure & Deployment](#12-infrastructure--deployment)
13. [Monitoring & Observability](#13-monitoring--observability)
14. [Scalability Strategy](#14-scalability-strategy)
15. [Development Workflow](#15-development-workflow)
16. [Technical Roadmap](#16-technical-roadmap)
17. [Risk Assessment](#17-risk-assessment)
18. [Appendix](#18-appendix)

---

## 1. Executive Summary

### 1.1 Purpose

This document defines the technical architecture for "Dịch Vụ Nhỏ Cho Sinh Viên" - a P2P marketplace platform connecting university students for small services. The system must handle real-time task matching, secure payments, and instant messaging while maintaining high availability for 100,000+ potential users.

### 1.2 Key Technical Goals

| Goal | Target | Priority |
|------|--------|----------|
| **Time to MVP** | 7 weeks (by Feb 28, 2026) | P0 |
| **Availability** | 99% uptime | P1 |
| **Response Time** | < 200ms API response | P1 |
| **Concurrent Users** | 1,000 (Year 1) | P2 |
| **Data Consistency** | Strong consistency for payments | P0 |
| **Security** | OWASP Top 10 compliant | P0 |

### 1.3 Constraints

- **Budget:** 10M VND (hosting cost = 0 due to bare metal server)
- **Team:** 2 developers (1 senior, 1 junior)
- **Timeline:** MVP in 7 weeks
- **Platform:** Must run as Zalo Mini App

---

## 2. System Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌──────────────┐         ┌──────────────┐         ┌──────────────┐       │
│    │   Zalo App   │         │   Zalo App   │         │   Zalo App   │       │
│    │  (Android)   │         │    (iOS)     │         │    (Web)     │       │
│    └──────┬───────┘         └──────┬───────┘         └──────┬───────┘       │
│           │                        │                        │               │
│           └────────────────────────┼────────────────────────┘               │
│                                    │                                        │
│                         ┌──────────▼──────────┐                             │
│                         │  Zalo Mini App      │                             │
│                         │  (React + MUI)      │                             │
│                         └──────────┬──────────┘                             │
│                                    │                                        │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │ HTTPS
┌────────────────────────────────────┼────────────────────────────────────────┐
│                           GATEWAY LAYER                                      │
├────────────────────────────────────┼────────────────────────────────────────┤
│                         ┌──────────▼──────────┐                             │
│                         │       Nginx         │                             │
│                         │  (Reverse Proxy)    │                             │
│                         │  - SSL Termination  │                             │
│                         │  - Rate Limiting    │                             │
│                         │  - Load Balancing   │                             │
│                         └──────────┬──────────┘                             │
│                                    │                                        │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                          APPLICATION LAYER                                   │
├────────────────────────────────────┼────────────────────────────────────────┤
│                                    │                                        │
│                         ┌──────────▼──────────┐                             │
│                         │   FastAPI Server    │                             │
│                         │   (Uvicorn)         │                             │
│                         │                     │                             │
│                         │  - REST API         │                             │
│                         │  - WebSocket        │                             │
│                         │  - Authentication   │                             │
│                         │  - Task CRUD        │                             │
│                         │  - User Management  │                             │
│                         │  - Payment Processing│                            │
│                         └──────────┬──────────┘                             │
│                                    │                                        │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                            DATA LAYER                                        │
├────────────────────────────────────┼────────────────────────────────────────┤
│                    ┌───────────────┴───────────────┐                        │
│                    │                               │                        │
│         ┌──────────▼──────────┐         ┌─────────▼─────────┐              │
│         │      SQLite         │         │   File Storage    │              │
│         │                     │         │                   │              │
│         │  - Users            │         │  - User Avatars   │              │
│         │  - Tasks            │         │  - Task Images    │              │
│         │  - Messages         │         │                   │              │
│         │  - Transactions     │         │                   │              │
│         └─────────────────────┘         └───────────────────┘              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐            │
│  │   Zalo OAuth    │   │    ZaloPay      │   │    Zalo ZNS     │            │
│  │                 │   │                 │   │                 │            │
│  │  Authentication │   │    Payments     │   │  Push Notifs    │            │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Responsibilities

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| **Zalo Mini App** | User interface, client-side routing | React 19, MUI, HashRouter |
| **Nginx** | SSL, reverse proxy, rate limiting | Nginx 1.24+ |
| **REST API** | Business logic, CRUD operations | Python 3.11, FastAPI |
| **WebSocket** | Real-time communication | FastAPI WebSocket |
| **SQLite** | Primary data store | SQLite 3.x |
| **Zalo OAuth** | User authentication | Zalo API |
| **ZaloPay** | Payment processing | ZaloPay API |

---

## 3. Architecture Principles

### 3.1 Design Principles

| Principle | Description | Application |
|-----------|-------------|-------------|
| **Simplicity First** | Avoid over-engineering; build what's needed for MVP | Monolithic architecture for now |
| **Security by Design** | Security is not an afterthought | JWT, HTTPS, input validation |
| **Fail Gracefully** | Handle errors without crashing | Try-catch, error middleware |
| **Stateless Services** | API servers should be stateless | Sessions in Redis, not memory |
| **Single Source of Truth** | PostgreSQL is authoritative | Cache invalidation strategy |

### 3.2 Architectural Decisions

#### ADR-001: Monolithic vs Microservices

**Decision:** Monolithic architecture for MVP

**Context:**
- Team size: 2 developers
- Timeline: 7 weeks
- Expected users: 1,000 in Year 1

**Rationale:**
- Faster development and deployment
- Simpler debugging and testing
- Lower operational complexity
- Can be split later if needed

**Trade-offs:**
- ✅ Fast development
- ✅ Easy deployment
- ❌ Harder to scale individual components
- ❌ Single point of failure

#### ADR-002: HashRouter vs BrowserRouter

**Decision:** HashRouter for Zalo Mini App

**Context:**
- Zalo Mini App runs in webview
- Webview doesn't control URL routing

**Rationale:**
- BrowserRouter causes blank screen in Zalo
- HashRouter works entirely client-side
- No server configuration needed

#### ADR-003: SQLite vs PostgreSQL

**Decision:** SQLite for MVP

**Context:**
- MVP phase with limited users (< 1,000)
- Relational data (users, tasks, applications)
- Need for simplicity and zero-config deployment
- Budget constraint (10M VND)

**Rationale:**
- Zero configuration, serverless
- Single file database, easy backup
- ACID compliant (sufficient for MVP transactions)
- No separate database server to maintain
- Fast read performance for small datasets
- Easy to migrate to PostgreSQL later if needed

**Trade-offs:**
- ✅ Simple deployment
- ✅ No database server management
- ✅ Fast development
- ❌ Limited concurrent write performance
- ❌ May need migration at scale (>10K users)

---

## 4. Technology Stack

### 4.1 Frontend Stack

| Layer | Technology | Version | Justification |
|-------|------------|---------|---------------|
| **Platform** | Zalo Mini App | Latest | 75M users, no app download needed |
| **Framework** | React | 19.x | Modern features, team expertise |
| **UI Library** | Material UI | 7.x | Rich components, theming support |
| **Routing** | React Router | 7.x | HashRouter for webview |
| **State Management** | Jotai | 2.x | Simple atomic state (if needed) |
| **HTTP Client** | Fetch API | Native | Built-in, no extra dependency |
| **Build Tool** | Vite | 5.x | Fast HMR, modern bundling |

### 4.2 Backend Stack

| Layer | Technology | Version | Justification |
|-------|------------|---------|---------------|
| **Runtime** | Python | 3.11+ | Modern async, type hints, rich ecosystem |
| **Framework** | FastAPI | 0.109+ | High performance, automatic OpenAPI docs, async |
| **Validation** | Pydantic | 2.x | Built into FastAPI, type-safe |
| **ORM** | SQLAlchemy | 2.x | Mature, flexible, async support |
| **Authentication** | JWT (python-jose) | - | Stateless, scalable |
| **Real-time** | WebSocket (Starlette) | - | Built into FastAPI |

### 4.3 Data Stack

| Layer | Technology | Version | Justification |
|-------|------------|---------|---------------|
| **Primary DB** | SQLite | 3.x | Zero-config, serverless, sufficient for MVP |
| **Cache** | In-memory (optional) | - | Simple caching if needed |
| **File Storage** | Local FS → S3 | - | Simple now, migrate later |

### 4.4 Infrastructure Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Server** | Bare metal (owned) | Zero hosting cost |
| **OS** | Ubuntu 22.04 LTS | Stable, long-term support |
| **Web Server** | Nginx | Reverse proxy, SSL, rate limiting |
| **SSL** | Let's Encrypt | Free, automated renewal |
| **ASGI Server** | Uvicorn + Gunicorn | Production-ready async server |
| **Process Manager** | Systemd | Native Linux service management |

---

## 5. System Architecture

### 5.1 Request Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           REQUEST FLOW DIAGRAM                                │
└──────────────────────────────────────────────────────────────────────────────┘

User Action (Create Task)
         │
         ▼
┌─────────────────┐
│  Zalo Mini App  │  1. User fills task form, clicks submit
└────────┬────────┘
         │
         │  HTTP POST /api/tasks
         │  Headers: Authorization: Bearer <JWT>
         │  Body: { title, description, price, category_id }
         ▼
┌─────────────────┐
│     Nginx       │  2. SSL termination, rate limit check
└────────┬────────┘
         │
         │  Proxy pass to localhost:3000
         ▼
┌─────────────────┐
│  FastAPI        │  3. Middleware/Dependencies:
│                 │     - CORS check
│                 │     - Pydantic validation
│                 │     - JWT verification (Depends)
│                 │     - Request validation
└────────┬────────┘
         │
         │  4. Business logic in TaskService
         ▼
┌─────────────────┐
│  TaskService    │  5. Create task:
│                 │     - Validate business rules
│                 │     - Check user balance
│                 │     - Insert into database
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     SQLite      │
│                 │
│  INSERT task    │
│                 │
└────────┬────────┘
         │
         │  6. Return task object
         ▼
┌─────────────────┐
│  WebSocket      │  7. Broadcast to relevant users:
│  (FastAPI)      │     - Taskers in same category
│                 │     - Nearby users
└────────┬────────┘
         │
         │  8. JSON response
         ▼
┌─────────────────┐
│  Zalo Mini App  │  9. Update UI, show success
└─────────────────┘
```

### 5.2 Directory Structure

```
/backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Settings & environment variables
│   ├── database.py             # SQLAlchemy engine & session
│   │
│   ├── models/                 # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── task.py
│   │   ├── message.py
│   │   ├── transaction.py
│   │   └── notification.py
│   │
│   ├── schemas/                # Pydantic schemas (request/response)
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── task.py
│   │   ├── message.py
│   │   └── common.py
│   │
│   ├── routers/                # API route handlers
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── tasks.py
│   │   ├── messages.py
│   │   ├── categories.py
│   │   └── notifications.py
│   │
│   ├── services/               # Business logic
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── task.py
│   │   ├── message.py
│   │   └── zalopay.py
│   │
│   ├── core/                   # Core utilities
│   │   ├── __init__.py
│   │   ├── security.py         # JWT, password hashing
│   │   ├── dependencies.py     # FastAPI dependencies
│   │   └── exceptions.py       # Custom exceptions
│   │
│   └── websocket/              # WebSocket handlers
│       ├── __init__.py
│       └── chat.py
│
├── alembic/                    # Database migrations
│   ├── versions/
│   └── env.py
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_tasks.py
│   └── test_users.py
│
├── data/
│   └── viecz.db              # SQLite database file
│
├── .env.example
├── requirements.txt
├── alembic.ini
└── README.md
```

---

## 6. Database Design

### 6.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ENTITY RELATIONSHIP DIAGRAM                           │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌───────────────────┐
                              │     CATEGORIES    │
                              ├───────────────────┤
                              │ id (PK)           │
                              │ name              │
                              │ name_vi           │
                              │ icon              │
                              │ is_active         │
                              └─────────┬─────────┘
                                        │
                                        │ 1:N
                                        ▼
┌───────────────────┐         ┌───────────────────┐         ┌───────────────────┐
│      USERS        │         │      TASKS        │         │    APPLICATIONS   │
├───────────────────┤         ├───────────────────┤         ├───────────────────┤
│ id (PK)           │◄────────┤ requester_id (FK) │         │ id (PK)           │
│ zalo_id (UNIQUE)  │    1:N  │ tasker_id (FK)────┼────────►│ task_id (FK)      │
│ name              │         │ category_id (FK)  │    1:N  │ tasker_id (FK)    │
│ avatar_url        │         │ id (PK)           │         │ proposed_price    │
│ phone             │         │ title             │         │ message           │
│ email             │         │ description       │         │ status            │
│ university        │         │ price             │         │ created_at        │
│ student_id        │         │ status            │         └───────────────────┘
│ is_verified       │         │ location_from     │
│ rating            │         │ location_to       │
│ total_completed   │         │ deadline          │         ┌───────────────────┐
│ total_posted      │         │ created_at        │         │     MESSAGES      │
│ balance           │         │ updated_at        │         ├───────────────────┤
│ is_tasker         │         └─────────┬─────────┘         │ id (PK)           │
│ tasker_bio        │                   │                   │ task_id (FK)──────┼───┐
│ tasker_skills[]   │                   │ 1:N               │ sender_id (FK)    │   │
│ created_at        │                   │                   │ content           │   │
│ updated_at        │                   ▼                   │ is_read           │   │
└─────────┬─────────┘         ┌───────────────────┐         │ created_at        │   │
          │                   │     REVIEWS       │         └───────────────────┘   │
          │                   ├───────────────────┤                                 │
          │                   │ id (PK)           │                                 │
          │              ┌────┤ task_id (FK)──────┼─────────────────────────────────┘
          │              │    │ reviewer_id (FK)  │
          │              │    │ reviewee_id (FK)  │
          │              │    │ rating (1-5)      │
          │              │    │ comment           │
          │              │    │ is_for_tasker     │
          │              │    │ created_at        │
          │              │    └───────────────────┘
          │              │
          │              │    ┌───────────────────┐
          │              │    │   TRANSACTIONS    │
          │              │    ├───────────────────┤
          │              └───►│ id (PK)           │
          │                   │ task_id (FK)      │
          │                   │ payer_id (FK)     │
          │                   │ payee_id (FK)     │
          │                   │ amount            │
          │                   │ platform_fee      │
          │                   │ type              │
          │                   │ status            │
          │                   │ zalopay_txn_id    │
          │                   │ created_at        │
          │                   └───────────────────┘
          │
          │              ┌───────────────────┐
          │              │   NOTIFICATIONS   │
          │              ├───────────────────┤
          └─────────────►│ id (PK)           │
                         │ user_id (FK)      │
                         │ title             │
                         │ content           │
                         │ type              │
                         │ reference_id      │
                         │ is_read           │
                         │ created_at        │
                         └───────────────────┘
```

### 6.2 SQLAlchemy Models

```python
# app/models/base.py
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./data/viecz.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite specific
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# app/models/user.py
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    zalo_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    university = Column(String, default="ĐHQG-HCM")
    student_id = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    rating = Column(Float, default=5.0)
    total_tasks_completed = Column(Integer, default=0)
    total_tasks_posted = Column(Integer, default=0)
    balance = Column(Integer, default=0)
    is_tasker = Column(Boolean, default=False)
    tasker_bio = Column(String, nullable=True)
    tasker_skills = Column(JSON, default=list)  # JSON array for SQLite
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    posted_tasks = relationship("Task", back_populates="requester", foreign_keys="Task.requester_id")
    accepted_tasks = relationship("Task", back_populates="tasker", foreign_keys="Task.tasker_id")
    applications = relationship("TaskApplication", back_populates="tasker")
    sent_messages = relationship("Message", back_populates="sender")
    reviews_given = relationship("Review", back_populates="reviewer", foreign_keys="Review.reviewer_id")
    reviews_received = relationship("Review", back_populates="reviewee", foreign_keys="Review.reviewee_id")
    notifications = relationship("Notification", back_populates="user")


# app/models/category.py
class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    name_vi = Column(String, nullable=False)
    icon = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    tasks = relationship("Task", back_populates="category")


# app/models/task.py
import enum

class TaskStatus(str, enum.Enum):
    OPEN = "open"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tasker_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    price = Column(Integer, nullable=False)
    price_negotiable = Column(Boolean, default=False)
    status = Column(String, default=TaskStatus.OPEN.value, index=True)
    location_from = Column(String, nullable=True)
    location_to = Column(String, nullable=True)
    deadline = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    cancellation_reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    requester = relationship("User", back_populates="posted_tasks", foreign_keys=[requester_id])
    tasker = relationship("User", back_populates="accepted_tasks", foreign_keys=[tasker_id])
    category = relationship("Category", back_populates="tasks")
    applications = relationship("TaskApplication", back_populates="task", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="task", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="task", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="task")


# app/models/task_application.py
class ApplicationStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"

class TaskApplication(Base):
    __tablename__ = "task_applications"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    tasker_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    proposed_price = Column(Integer, nullable=True)
    message = Column(String, nullable=True)
    status = Column(String, default=ApplicationStatus.PENDING.value)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    task = relationship("Task", back_populates="applications")
    tasker = relationship("User", back_populates="applications")

    __table_args__ = (UniqueConstraint("task_id", "tasker_id"),)


# app/models/message.py
class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    task = relationship("Task", back_populates="messages")
    sender = relationship("User", back_populates="sent_messages")


# app/models/review.py
class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reviewee_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(String, nullable=True)
    is_for_tasker = Column(Boolean, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    task = relationship("Task", back_populates="reviews")
    reviewer = relationship("User", back_populates="reviews_given", foreign_keys=[reviewer_id])
    reviewee = relationship("User", back_populates="reviews_received", foreign_keys=[reviewee_id])

    __table_args__ = (UniqueConstraint("task_id", "reviewer_id"),)


# app/models/transaction.py
class TransactionType(str, enum.Enum):
    PAYMENT = "payment"
    PAYOUT = "payout"
    REFUND = "refund"

class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    payer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    payee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    amount = Column(Integer, nullable=False)
    platform_fee = Column(Integer, nullable=False)
    type = Column(String, nullable=False)
    status = Column(String, default=TransactionStatus.PENDING.value)
    zalopay_transaction_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    task = relationship("Task", back_populates="transactions")


# app/models/notification.py
class NotificationType(str, enum.Enum):
    TASK_UPDATE = "task_update"
    MESSAGE = "message"
    PAYMENT = "payment"
    REVIEW = "review"
    SYSTEM = "system"

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    content = Column(String, nullable=True)
    type = Column(String, nullable=False)
    reference_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")


# app/models/report.py
class ReportStatus(str, enum.Enum):
    PENDING = "pending"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reported_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    reason = Column(String, nullable=False)
    status = Column(String, default=ReportStatus.PENDING.value)
    admin_notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
```

### 6.3 Database Indexes Strategy

```sql
-- Performance indexes (defined in SQLAlchemy models via index=True)
-- These are automatically created by SQLAlchemy:
CREATE INDEX ix_users_zalo_id ON users(zalo_id);
CREATE INDEX ix_tasks_status ON tasks(status);
CREATE INDEX ix_messages_task_id ON messages(task_id);
CREATE INDEX ix_notifications_user_id ON notifications(user_id);
CREATE INDEX ix_notifications_is_read ON notifications(is_read);

-- Composite indexes for common queries (add via Alembic migration)
CREATE INDEX idx_tasks_status_category ON tasks(status, category_id);
CREATE INDEX idx_tasks_status_created ON tasks(status, created_at DESC);

-- Note: SQLite has limited index capabilities compared to PostgreSQL
-- Full-text search can be added using SQLite FTS5 extension if needed
```

---

## 7. API Design

### 7.1 API Standards

| Standard | Description |
|----------|-------------|
| **Protocol** | HTTPS only |
| **Format** | JSON |
| **Versioning** | URL path (`/api/v1/`) |
| **Authentication** | Bearer token (JWT) |
| **Pagination** | Cursor-based or offset |
| **Error Format** | Standard error object |

### 7.2 Response Format

```typescript
// Success Response
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "title", "message": "Title is required" }
    ]
  }
}
```

### 7.3 API Endpoints

#### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/zalo` | Zalo OAuth callback | No |
| POST | `/api/v1/auth/refresh` | Refresh JWT token | Yes |
| POST | `/api/v1/auth/logout` | Logout | Yes |

#### Users

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/users/me` | Get current user | Yes |
| PUT | `/api/v1/users/me` | Update profile | Yes |
| GET | `/api/v1/users/:id` | Get user public profile | Yes |
| POST | `/api/v1/users/become-tasker` | Register as Tasker | Yes |

#### Tasks

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/tasks` | List tasks (with filters) | Yes |
| POST | `/api/v1/tasks` | Create new task | Yes |
| GET | `/api/v1/tasks/:id` | Get task details | Yes |
| PUT | `/api/v1/tasks/:id` | Update task | Yes |
| DELETE | `/api/v1/tasks/:id` | Cancel task | Yes |
| POST | `/api/v1/tasks/:id/apply` | Apply for task | Yes |
| POST | `/api/v1/tasks/:id/accept/:applicationId` | Accept application | Yes |
| POST | `/api/v1/tasks/:id/complete` | Mark completed | Yes |
| POST | `/api/v1/tasks/:id/review` | Submit review | Yes |

#### Messages

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/tasks/:id/messages` | Get chat messages | Yes |
| POST | `/api/v1/tasks/:id/messages` | Send message | Yes |

#### Categories

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/categories` | List all categories | No |

#### Notifications

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/notifications` | Get user notifications | Yes |
| PUT | `/api/v1/notifications/:id/read` | Mark as read | Yes |
| PUT | `/api/v1/notifications/read-all` | Mark all as read | Yes |

### 7.4 Query Parameters

```
GET /api/v1/tasks?status=open&category=1&sort=created_at&order=desc&page=1&limit=20
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (open, accepted, etc.) |
| `category` | number | Filter by category ID |
| `search` | string | Search in title/description |
| `sort` | string | Sort field (created_at, price) |
| `order` | string | Sort order (asc, desc) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |

---

## 8. Authentication & Authorization

### 8.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ZALO OAUTH FLOW                                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Zalo Mini   │     │   Backend    │     │  Zalo OAuth  │     │  PostgreSQL  │
│     App      │     │   Server     │     │   Server     │     │   Database   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       │  1. User clicks    │                    │                    │
       │     "Login"        │                    │                    │
       │                    │                    │                    │
       │  2. getAccessToken()                    │                    │
       │─────────────────────────────────────────►                    │
       │                    │                    │                    │
       │  3. Zalo access_token                   │                    │
       │◄─────────────────────────────────────────                    │
       │                    │                    │                    │
       │  4. POST /auth/zalo                     │                    │
       │  { access_token }  │                    │                    │
       │───────────────────►│                    │                    │
       │                    │                    │                    │
       │                    │  5. Verify token   │                    │
       │                    │───────────────────►│                    │
       │                    │                    │                    │
       │                    │  6. User profile   │                    │
       │                    │◄───────────────────│                    │
       │                    │                    │                    │
       │                    │  7. Find or create │                    │
       │                    │     user           │                    │
       │                    │───────────────────────────────────────►│
       │                    │                    │                    │
       │                    │  8. User record    │                    │
       │                    │◄───────────────────────────────────────│
       │                    │                    │                    │
       │                    │  9. Generate JWT   │                    │
       │                    │     (15 min exp)   │                    │
       │                    │                    │                    │
       │  10. { jwt, user } │                    │                    │
       │◄───────────────────│                    │                    │
       │                    │                    │                    │
       │  11. Store JWT     │                    │                    │
       │      locally       │                    │                    │
       │                    │                    │                    │
```

### 8.2 JWT Structure

```javascript
// Header
{
  "alg": "HS256",
  "typ": "JWT"
}

// Payload
{
  "sub": "123",              // User ID
  "zalo_id": "xxx",          // Zalo user ID
  "name": "Nguyen Van A",    // User name
  "is_tasker": true,         // Tasker flag
  "iat": 1705200000,         // Issued at
  "exp": 1705200900          // Expires (15 min)
}

// Signature
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  JWT_SECRET
)
```

### 8.3 Authorization Rules

| Resource | Action | Requester | Tasker | Admin |
|----------|--------|-----------|--------|-------|
| Task | Create | ✅ | ✅ | ✅ |
| Task | Update | Owner only | ❌ | ✅ |
| Task | Delete | Owner only | ❌ | ✅ |
| Task | Apply | ❌ | ✅ | ✅ |
| Task | Accept | Owner only | ❌ | ✅ |
| Task | Complete | Owner | Assigned | ✅ |
| Message | Send | Participants | Participants | ✅ |
| Review | Create | Post-completion | Post-completion | ✅ |

---

## 9. Real-time Communication

### 9.1 WebSocket Architecture (FastAPI)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      WEBSOCKET ARCHITECTURE                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                           FASTAPI WEBSOCKET SERVER                           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                           ENDPOINTS                                      │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                          │ │
│  │  /ws/chat/{task_id}         Chat WebSocket for task participants        │ │
│  │  ├── connect                User connects with JWT auth                 │ │
│  │  ├── send_message           Send message to task chat                   │ │
│  │  ├── receive_message        Receive messages from others                │ │
│  │  └── typing                 Typing indicator                            │ │
│  │                                                                          │ │
│  │  /ws/notifications/{user_id} Notification WebSocket                     │ │
│  │  ├── connect                Subscribe to user notifications             │ │
│  │  ├── new_notification       Receive notification                        │ │
│  │  └── mark_read              Mark notification as read                   │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                     CONNECTION MANAGER                                   │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                          │ │
│  │  In-memory connection tracking (dict of WebSocket connections)          │ │
│  │  task_connections: Dict[int, List[WebSocket]]                           │ │
│  │  user_connections: Dict[int, List[WebSocket]]                           │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 WebSocket Events

```python
# app/websocket/chat.py

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List

class ConnectionManager:
    def __init__(self):
        self.task_connections: Dict[int, List[WebSocket]] = {}
        self.user_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, task_id: int, user_id: int):
        await websocket.accept()
        if task_id not in self.task_connections:
            self.task_connections[task_id] = []
        self.task_connections[task_id].append(websocket)

    def disconnect(self, websocket: WebSocket, task_id: int):
        self.task_connections[task_id].remove(websocket)

    async def broadcast_to_task(self, task_id: int, message: dict):
        for connection in self.task_connections.get(task_id, []):
            await connection.send_json(message)

# Message types
class ChatMessage:
    type: str = "message"
    task_id: int
    sender_id: int
    content: str
    timestamp: str

class TypingIndicator:
    type: str = "typing"
    task_id: int
    user_id: int
    is_typing: bool

class NewNotification:
    type: str = "notification"
    user_id: int
    title: str
    content: str
    notification_type: str
```

---

## 10. Payment Integration

### 10.1 Payment Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PAYMENT FLOW (ESCROW)                                │
└─────────────────────────────────────────────────────────────────────────────┘

Phase 1: Task Creation (No payment yet)
┌────────────┐                    ┌────────────┐
│ Requester  │──── Create Task ───►│   System   │
└────────────┘                    └────────────┘

Phase 2: Task Accepted (Escrow Payment)
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│ Requester  │     │   System   │     │  ZaloPay   │     │   Escrow   │
└─────┬──────┘     └─────┬──────┘     └─────┬──────┘     └─────┬──────┘
      │                  │                  │                  │
      │  Accept Tasker   │                  │                  │
      │─────────────────►│                  │                  │
      │                  │                  │                  │
      │  Payment Request │                  │                  │
      │◄─────────────────│                  │                  │
      │                  │                  │                  │
      │  Confirm Payment │                  │                  │
      │─────────────────►│                  │                  │
      │                  │                  │                  │
      │                  │  Create Order    │                  │
      │                  │─────────────────►│                  │
      │                  │                  │                  │
      │                  │  Payment URL     │                  │
      │                  │◄─────────────────│                  │
      │                  │                  │                  │
      │  Redirect to Pay │                  │                  │
      │◄─────────────────│                  │                  │
      │                  │                  │                  │
      │──────────────────────────Pay────────►                  │
      │                  │                  │                  │
      │                  │  Webhook: Paid   │                  │
      │                  │◄─────────────────│                  │
      │                  │                  │                  │
      │                  │  Hold in Escrow  │                  │
      │                  │─────────────────────────────────────►
      │                  │                  │                  │

Phase 3: Task Completed (Release Payment)
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│ Requester  │     │   System   │     │   Escrow   │     │   Tasker   │
└─────┬──────┘     └─────┬──────┘     └─────┬──────┘     └─────┬──────┘
      │                  │                  │                  │
      │  Mark Complete   │                  │                  │
      │─────────────────►│                  │                  │
      │                  │                  │                  │
      │                  │  Release Escrow  │                  │
      │                  │─────────────────►│                  │
      │                  │                  │                  │
      │                  │                  │  Transfer (90%)  │
      │                  │                  │─────────────────►│
      │                  │                  │                  │
      │                  │  Platform Fee    │                  │
      │                  │◄─────────────────│  (10% retained)  │
      │                  │                  │                  │
```

### 10.2 Payment States

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ PENDING  │────►│  PAID    │────►│ ESCROWED │────►│ RELEASED │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
      │                │                │                │
      │                │                │                │
      ▼                ▼                ▼                ▼
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ CANCELLED│     │  FAILED  │     │ DISPUTED │     │ REFUNDED │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

---

## 11. Security Architecture

### 11.1 Security Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SECURITY LAYERS                                     │
└─────────────────────────────────────────────────────────────────────────────┘

Layer 1: Network Security
┌─────────────────────────────────────────────────────────────────────────────┐
│  • HTTPS only (TLS 1.3)                                                     │
│  • Firewall (UFW): Only ports 80, 443, 22 open                             │
│  • DDoS protection (Cloudflare - future)                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
Layer 2: Application Gateway (Nginx)
┌─────────────────────────────────────────────────────────────────────────────┐
│  • Rate limiting: 100 req/min per IP                                        │
│  • Request size limit: 10MB                                                 │
│  • Security headers (X-Frame-Options, CSP, etc.)                           │
│  • Bot detection (future)                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
Layer 3: Application Security (FastAPI)
┌─────────────────────────────────────────────────────────────────────────────┐
│  • JWT authentication (python-jose)                                         │
│  • Input validation (Pydantic)                                             │
│  • SQL injection prevention (SQLAlchemy parameterized)                     │
│  • XSS prevention (output encoding)                                        │
│  • CSRF protection (SameSite cookies)                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
Layer 4: Data Security
┌─────────────────────────────────────────────────────────────────────────────┐
│  • Encrypted at rest (PostgreSQL)                                          │
│  • Encrypted in transit (TLS)                                              │
│  • PII minimization                                                        │
│  • Secure password storage (bcrypt - if needed)                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 OWASP Top 10 Mitigations

| Vulnerability | Mitigation |
|---------------|------------|
| **A01: Broken Access Control** | JWT + role-based authorization (FastAPI Depends) |
| **A02: Cryptographic Failures** | HTTPS, secure JWT secret, no sensitive data in logs |
| **A03: Injection** | SQLAlchemy ORM (parameterized queries), Pydantic validation |
| **A04: Insecure Design** | Security review, threat modeling |
| **A05: Security Misconfiguration** | Hardened Nginx config, no default credentials |
| **A06: Vulnerable Components** | pip-audit, Dependabot alerts |
| **A07: Auth Failures** | Zalo OAuth, JWT with short expiry, rate limiting |
| **A08: Data Integrity Failures** | Pydantic validation, signed JWTs |
| **A09: Logging Failures** | Structured logging (structlog), no PII in logs |
| **A10: SSRF** | Validate external URLs, whitelist domains |

### 11.3 Security Checklist

```markdown
## Pre-Launch Security Checklist

### Infrastructure
- [ ] HTTPS configured with valid certificate
- [ ] Firewall configured (UFW)
- [ ] SSH key-only authentication
- [ ] Regular security updates enabled

### Application
- [ ] JWT secret is strong and stored securely
- [ ] All inputs validated
- [ ] SQL injection tested
- [ ] XSS tested
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] Error messages don't leak info

### Data
- [ ] Database access restricted
- [ ] Backups encrypted
- [ ] PII handling compliant
- [ ] Logging excludes sensitive data

### Monitoring
- [ ] Failed login attempts logged
- [ ] Suspicious activity alerts
- [ ] Security headers verified
```

---

## 12. Infrastructure & Deployment

### 12.1 Server Configuration

```yaml
# Server Specs (Bare Metal)
CPU: 4 cores
RAM: 8GB
Storage: 100GB SSD
Bandwidth: 1Gbps
OS: Ubuntu 22.04 LTS
```

### 12.2 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT ARCHITECTURE                               │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────────┐
                         │    Bare Metal       │
                         │      Server         │
                         └──────────┬──────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│     Nginx       │      │  FastAPI App    │      │     SQLite      │
│   (Port 80/443) │      │  (Port 8000)    │      │                 │
│                 │      │                 │      │                 │
│  - SSL/TLS      │      │  - Gunicorn     │      │  - Single file  │
│  - Reverse proxy│─────►│  - 4 workers    │─────►│  - Daily backup │
│  - Static files │      │  - Systemd svc  │      │  - data/viecz │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

### 12.3 Nginx Configuration

```nginx
# /etc/nginx/sites-available/viecz

upstream backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name api.viecz.vn;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.viecz.vn;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.viecz.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.viecz.vn/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Request Size Limit
    client_max_body_size 10M;

    # API Proxy
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
    }

    # WebSocket Proxy
    location /ws/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 12.4 Systemd Service Configuration

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
Environment="PATH=/var/www/viecz-backend/venv/bin"
ExecStart=/var/www/viecz-backend/venv/bin/gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 \
    --access-logfile /var/log/viecz/access.log \
    --error-logfile /var/log/viecz/error.log
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 12.5 Deployment Script

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Deploying Viecz API..."

# Pull latest code
cd /var/www/viecz-backend
git pull origin main

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Restart service
sudo systemctl restart viecz

echo "✅ Deployment complete!"
```

---

## 13. Monitoring & Observability

### 13.1 Logging Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          LOGGING ARCHITECTURE                                │
└─────────────────────────────────────────────────────────────────────────────┘

Application Logs                    System Logs
      │                                  │
      ▼                                  ▼
┌─────────────────┐            ┌─────────────────┐
│  Python logging │            │    journald     │
│  + structlog    │            │                 │
│                 │            │  - Nginx logs   │
│  - JSON format  │            │  - Systemd logs │
│  - Levels       │            │                 │
│  - Timestamps   │            │                 │
└────────┬────────┘            └────────┬────────┘
         │                              │
         └──────────────┬───────────────┘
                        │
                        ▼
               ┌─────────────────┐
               │   Log Files     │
               │                 │
               │  /var/log/      │
               │  viecz/       │
               └────────┬────────┘
                        │
                        ▼
               ┌─────────────────┐
               │  Log Rotation   │
               │  (logrotate)    │
               │                 │
               │  - Daily        │
               │  - 7 days       │
               │  - Compress     │
               └─────────────────┘
```

### 13.2 Log Format

```python
# Log structure (using structlog)
{
    "timestamp": "2026-01-14T10:30:00.000Z",
    "level": "info",
    "event": "Task created",
    "service": "viecz-api",
    "request_id": "uuid-xxx",
    "user_id": 123,
    "task_id": 456,
    "duration_ms": 45,
    "status_code": 201
}
```

### 13.3 Health Checks

```python
# GET /health
{
    "status": "healthy",
    "timestamp": "2026-01-14T10:30:00.000Z",
    "uptime": 86400,
    "checks": {
        "database": {"status": "healthy", "latency_ms": 5},
        "memory": {"status": "healthy", "usage_percent": 45},
        "disk": {"status": "healthy", "usage_percent": 30}
    }
}
```

### 13.4 Monitoring Checklist

```markdown
## Monitoring Setup (MVP)

### Application Metrics
- [ ] Request count per endpoint
- [ ] Response time (p50, p95, p99)
- [ ] Error rate
- [ ] Active users (WebSocket connections)

### System Metrics
- [ ] CPU usage
- [ ] Memory usage
- [ ] Disk usage
- [ ] Network I/O

### Alerts (via simple script + Zalo notification)
- [ ] Server down
- [ ] High CPU (> 80%)
- [ ] High memory (> 80%)
- [ ] High error rate (> 5%)
- [ ] Database connection failed
```

---

## 14. Scalability Strategy

### 14.1 Current Architecture Limits

| Component | Current Capacity | Scaling Strategy |
|-----------|------------------|------------------|
| **API Server** | ~500 req/s | Gunicorn workers (4 workers) |
| **SQLite** | ~50 concurrent writes | Sufficient for MVP |
| **WebSocket** | ~1K concurrent | FastAPI WebSocket |

### 14.2 Future Scaling Path

```
Phase 1: MVP (Current)
┌────────────────┐
│  Single Server │
│  - FastAPI     │
│  - 4 workers   │
│  - SQLite      │
└────────────────┘
        │
        │ When: 1K+ daily users
        ▼
Phase 2: Database Migration
┌────────────────┐
│  Single Server │
│  - FastAPI     │
│  - 8 workers   │
│  - PostgreSQL  │  ← Migrate from SQLite
└────────────────┘
        │
        │ When: 10K+ daily users
        ▼
Phase 3: Horizontal Scaling
┌────────────────┐     ┌────────────────┐
│   App Server 1 │     │   App Server 2 │
│   (FastAPI)    │     │   (FastAPI)    │
└───────┬────────┘     └───────┬────────┘
        │                      │
        └──────────┬───────────┘
                   │
        ┌──────────▼──────────┐
        │    Load Balancer    │
        │    (Nginx/HAProxy)  │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │   Database Server   │
        │   (PostgreSQL)      │
        └─────────────────────┘
```

---

## 15. Development Workflow

### 15.1 Git Workflow

```
main (production)
  │
  └── develop (staging)
        │
        ├── feature/task-crud
        ├── feature/chat
        ├── fix/auth-bug
        └── ...

Branch Naming:
- feature/xxx - New features
- fix/xxx     - Bug fixes
- hotfix/xxx  - Production fixes
- refactor/xxx - Code refactoring
```

### 15.2 Development Process

```
1. Create branch from develop
   git checkout -b feature/task-crud develop

2. Write code + tests
   - Follow ESLint rules
   - Write unit tests
   - Update API docs

3. Create Pull Request
   - Self-review
   - Request review from team

4. Code Review
   - Check logic
   - Check security
   - Check performance

5. Merge to develop
   - Squash commits
   - Delete branch

6. Deploy to staging
   - Automated via PM2

7. QA Testing
   - Manual testing
   - Bug fixes if needed

8. Merge to main
   - Deploy to production
```

### 15.3 Code Quality Tools

```bash
# Development commands

# Start development server with auto-reload
uvicorn app.main:app --reload --port 8000

# Run linting
ruff check app/
ruff format app/

# Run type checking
mypy app/

# Run tests
pytest
pytest --cov=app --cov-report=html

# Database migrations
alembic revision --autogenerate -m "Description"
alembic upgrade head
alembic downgrade -1
```

```ini
# requirements.txt
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
sqlalchemy>=2.0.0
alembic>=1.13.0
pydantic>=2.5.0
python-jose[cryptography]>=3.3.0
python-multipart>=0.0.6
httpx>=0.26.0

# Development
pytest>=7.4.0
pytest-cov>=4.1.0
pytest-asyncio>=0.23.0
ruff>=0.1.0
mypy>=1.8.0
```

---

## 16. Technical Roadmap

### 16.1 MVP (Week 1-7)

```
Week 1-2: Foundation
├── [x] Server setup (Nginx, SSL, PostgreSQL, Redis)
├── [ ] Database schema implementation
├── [ ] Project structure setup
└── [ ] Basic Express server

Week 3-4: Core Backend
├── [ ] Zalo OAuth integration
├── [ ] User APIs (profile, become-tasker)
├── [ ] Task APIs (CRUD, apply, accept)
├── [ ] Application flow
└── [ ] API documentation

Week 5: Frontend Integration
├── [ ] Connect frontend to backend
├── [ ] End-to-end testing
└── [ ] Bug fixes

Week 6: Features
├── [ ] Basic chat (simplified)
├── [ ] Task status flow
├── [ ] Notifications (basic)
└── [ ] Beta testing

Week 7: Polish
├── [ ] Bug fixes
├── [ ] Performance optimization
├── [ ] Documentation
└── [ ] Submission prep
```

### 16.2 Post-MVP (Month 2-3)

```
Month 2: Enhanced Features
├── [ ] Full chat with Socket.io
├── [ ] Push notifications (Zalo ZNS)
├── [ ] Review & rating system
├── [ ] Search optimization
└── [ ] Admin dashboard (basic)

Month 3: Payment & Scale
├── [ ] ZaloPay integration
├── [ ] Escrow system
├── [ ] Transaction history
├── [ ] Performance tuning
└── [ ] Security audit
```

### 16.3 Future (Month 4+)

```
├── [ ] Advanced search (full-text)
├── [ ] Recommendation engine
├── [ ] Analytics dashboard
├── [ ] Multi-language support
├── [ ] Mobile push notifications
└── [ ] Microservices migration (if needed)
```

---

## 17. Risk Assessment

### 17.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Zalo API changes | Medium | High | Abstract Zalo SDK, monitor changes |
| Server downtime | Low | High | Daily backups, monitoring alerts |
| Security breach | Low | Critical | OWASP compliance, security review |
| Performance issues | Medium | Medium | Load testing, caching strategy |
| Tech debt | High | Medium | Code reviews, refactoring sprints |

### 17.2 Contingency Plans

```
Scenario: Server Failure
├── Detection: Health check fails
├── Response:
│   ├── 1. Check PM2 status
│   ├── 2. Check Nginx logs
│   ├── 3. Check PostgreSQL status
│   └── 4. Restart services
└── Recovery: Restore from backup if needed

Scenario: Database Corruption
├── Detection: Data inconsistency errors
├── Response:
│   ├── 1. Stop application
│   ├── 2. Assess damage
│   └── 3. Restore from backup
└── Recovery: Point-in-time recovery

Scenario: Security Incident
├── Detection: Anomaly in logs
├── Response:
│   ├── 1. Isolate affected systems
│   ├── 2. Assess breach scope
│   ├── 3. Notify users if PII affected
│   └── 4. Patch vulnerability
└── Recovery: Security audit, penetration testing
```

---

## 18. Appendix

### 18.1 Environment Variables

```bash
# .env.example

# Server
ENVIRONMENT=production
DEBUG=false
API_URL=https://api.viecz.vn

# Database (SQLite)
DATABASE_URL=sqlite:///./data/viecz.db

# JWT
JWT_SECRET=your-super-secret-key-at-least-32-chars
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15

# Zalo
ZALO_APP_ID=your-app-id
ZALO_APP_SECRET=your-app-secret
ZALO_OAUTH_REDIRECT_URL=https://api.viecz.vn/api/v1/auth/zalo/callback

# ZaloPay (future)
ZALOPAY_APP_ID=
ZALOPAY_KEY1=
ZALOPAY_KEY2=
ZALOPAY_ENDPOINT=

# Logging
LOG_LEVEL=INFO
LOG_DIR=/var/log/viecz

# CORS
CORS_ORIGINS=["https://your-zalo-miniapp-url.com"]
```

### 18.2 API Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_REQUIRED` | 401 | Authentication required |
| `AUTH_INVALID` | 401 | Invalid token |
| `AUTH_EXPIRED` | 401 | Token expired |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `DUPLICATE_ENTRY` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

### 18.3 References

- [Zalo Mini App Documentation](https://developers.zalo.me/docs)
- [ZaloPay API Documentation](https://docs.zalopay.vn/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-14 | Tech Lead | Initial architecture document |
| 1.1 | 2026-01-14 | Tech Lead | Migrated to FastAPI + SQLite stack |

---

*This is a living document. Update as the architecture evolves.*
