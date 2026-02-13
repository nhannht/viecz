# Technical Documentation

**Project:** Viecz - Dịch Vụ Nhỏ Cho Sinh Viên
**Last Updated:** 2026-02-13
**Stack:** Go (Gin) backend + Native Kotlin/Jetpack Compose Android app

---

## Documentation Index

| Document | Description | Key Topics |
|----------|-------------|------------|
| **[SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)** | System architecture & design | High-level architecture, tech stack, patterns |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Package structure & patterns | Go backend layers, Android MVVM, ER diagram |
| **[DATA_STRUCTURE.md](./DATA_STRUCTURE.md)** | Data models | 9 GORM models, schemas, relationships |
| **[API_REFERENCE.md](./API_REFERENCE.md)** | API endpoint reference | 32 REST endpoints + WebSocket, request/response examples |
| **[USER_FLOW.md](./USER_FLOW.md)** | User journey documentation | Auth, task, payment, chat flows |
| **[ALGORITHM.md](./ALGORITHM.md)** | Core algorithms & complexity | JWT, escrow, WebSocket routing, wallet management |
| **[SECURITY.md](./SECURITY.md)** | Security measures | JWT auth, bcrypt, CORS, PayOS webhook verification |
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | Deployment & infrastructure | Docker Compose, Cloudflare tunnel, Android build flavors |

---

## Quick Start

### For New Developers

Read in this order:
1. **[SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)** - Big picture
2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Package structure
3. **[DATA_STRUCTURE.md](./DATA_STRUCTURE.md)** - Data models
4. **[API_REFERENCE.md](./API_REFERENCE.md)** - Endpoints

### For Backend Developers

1. **[DATA_STRUCTURE.md](./DATA_STRUCTURE.md)** - GORM models and schemas
2. **[API_REFERENCE.md](./API_REFERENCE.md)** - Endpoint specifications
3. **[ALGORITHM.md](./ALGORITHM.md)** - Business logic (escrow, wallet)
4. **[SECURITY.md](./SECURITY.md)** - JWT, middleware, PayOS verification

### For Android Developers

1. **[USER_FLOW.md](./USER_FLOW.md)** - User journeys and screen flows
2. **[API_REFERENCE.md](./API_REFERENCE.md)** - Backend API contracts
3. **[DATA_STRUCTURE.md](./DATA_STRUCTURE.md)** - Models
4. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Android MVVM architecture

### For DevOps

1. **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Docker, Cloudflare tunnel, env config
2. **[SECURITY.md](./SECURITY.md)** - Security checklist
3. **[SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)** - Infrastructure overview

---

## Document Relationships

```plantuml
@startuml Document Relationships

skinparam rectangle {
    BackgroundColor #F7F7F7
    BorderColor #333333
    FontSize 12
    RoundCorner 10
}
skinparam arrow {
    Color #333333
    FontSize 10
}
skinparam defaultTextAlignment center

rectangle "SYSTEM_DESIGN.md\n(High-level architecture)" as SD
rectangle "DATA_STRUCTURE.md\n(Data models)" as DS
rectangle "USER_FLOW.md\n(User journeys)" as UF
rectangle "API_REFERENCE.md\n(Endpoints)" as API
rectangle "ALGORITHM.md\n(Business logic)" as ALG
rectangle "SECURITY.md\n(Security model)" as SEC
rectangle "ARCHITECTURE.md\n(Detailed package structure)" as ARCH
rectangle "DEPLOYMENT.md\n(Infrastructure & operations)" as DEP

SD --> DS
SD --> UF
DS --> API
UF --> ALG
API --> SEC
ALG --> SEC

ARCH ..> SD
DEP ..> SD

@enduml
```

---

## Navigate by Feature

**Task Management:**
- DATA_STRUCTURE.md → Task, TaskApplication models
- API_REFERENCE.md → Task endpoints
- USER_FLOW.md → Requester & Tasker flows
- ALGORITHM.md → Task matching

**Payment System (PayOS):**
- DATA_STRUCTURE.md → Transaction, Wallet models
- API_REFERENCE.md → Payment & Wallet endpoints
- ALGORITHM.md → Escrow & fee calculation
- SECURITY.md → PayOS webhook verification

**Authentication (JWT):**
- DATA_STRUCTURE.md → User model
- API_REFERENCE.md → Auth endpoints
- SECURITY.md → JWT implementation
- ALGORITHM.md → Token lifecycle

**Real-time Chat (WebSocket):**
- DATA_STRUCTURE.md → Conversation, Message models
- API_REFERENCE.md → WebSocket endpoint
- ALGORITHM.md → WebSocket hub routing
- SECURITY.md → WebSocket auth

---

## Glossary

| Term | Definition |
|------|-----------|
| **Requester** | User who posts tasks |
| **Tasker** | User who performs tasks (must register) |
| **Escrow** | Platform holds payment until task completion |
| **PayOS** | Payment gateway for VND deposits |
| **JWT** | JSON Web Token for API authentication |
| **WebSocket** | Real-time bidirectional messaging protocol |
| **GORM** | Go ORM used for database access |
| **Gin** | Go HTTP web framework |

---

**Last Updated:** 2026-02-13
**Maintained By:** Development Team
