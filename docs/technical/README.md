# Technical Documentation

**Project:** Viecz - Dịch Vụ Nhỏ Cho Sinh Viên
**Last Updated:** 2026-02-04
**Version:** 0.1.0

This directory contains comprehensive technical documentation for the Viecz platform - a P2P marketplace connecting 100,000+ university students at ĐHQG-HCM for small services.

---

## Table of Contents

- [Documentation Index](#documentation-index)
- [Quick Start](#quick-start)
- [Document Relationships](#document-relationships)
- [For Different Audiences](#for-different-audiences)
- [How to Navigate](#how-to-navigate)

---

## Documentation Index

### Core Documentation

| Document | Description | Key Topics |
|----------|-------------|------------|
| **[DATA_STRUCTURE.md](./DATA_STRUCTURE.md)** | Complete data model documentation | 11 database models, schemas, ER diagrams, constraints |
| **[API_REFERENCE.md](./API_REFERENCE.md)** | API endpoint reference | 43 REST endpoints + WebSocket, curl examples |
| **[SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)** | System architecture & design | High-level architecture, tech stack, patterns |
| **[USER_FLOW.md](./USER_FLOW.md)** | User journey documentation | 7 major flows with ASCII diagrams |
| **[ALGORITHM.md](./ALGORITHM.md)** | Core algorithms & complexity | Payment logic, search, Big O analysis |
| **[SECURITY.md](./SECURITY.md)** | Security measures & threats | Auth, authorization, threat modeling |

### Existing Documentation

| Document | Description |
|----------|-------------|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Original architecture overview |
| **[ZALOPAY_INTEGRATION.md](./ZALOPAY_INTEGRATION.md)** | ZaloPay payment integration guide |

---

## Quick Start

### For New Developers

Read in this order:
1. **[SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)** - Understand the big picture
2. **[DATA_STRUCTURE.md](./DATA_STRUCTURE.md)** - Learn the data models
3. **[API_REFERENCE.md](./API_REFERENCE.md)** - Explore available endpoints
4. **[USER_FLOW.md](./USER_FLOW.md)** - Understand user journeys

### For Backend Developers

1. **[DATA_STRUCTURE.md](./DATA_STRUCTURE.md)** - Database models and schemas
2. **[API_REFERENCE.md](./API_REFERENCE.md)** - Endpoint specifications
3. **[ALGORITHM.md](./ALGORITHM.md)** - Core business logic
4. **[SECURITY.md](./SECURITY.md)** - Security implementation

### For Frontend Developers

1. **[USER_FLOW.md](./USER_FLOW.md)** - User journeys and page flows
2. **[API_REFERENCE.md](./API_REFERENCE.md)** - Backend API contracts
3. **[DATA_STRUCTURE.md](./DATA_STRUCTURE.md)** → TypeScript types section
4. **[SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)** → Frontend architecture section

### For DevOps Engineers

1. **[SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)** → Infrastructure & deployment
2. **[SECURITY.md](./SECURITY.md)** → Security checklist
3. **[API_REFERENCE.md](./API_REFERENCE.md)** → Endpoint inventory

### For QA Engineers

1. **[USER_FLOW.md](./USER_FLOW.md)** - Test scenarios and flows
2. **[API_REFERENCE.md](./API_REFERENCE.md)** - Endpoint testing
3. **[SECURITY.md](./SECURITY.md)** - Security test cases

---

## Document Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                     SYSTEM_DESIGN.md                        │
│                  (High-level architecture)                  │
└────────────┬───────────────────────────────┬────────────────┘
             │                               │
     ┌───────▼──────────┐           ┌───────▼──────────┐
     │ DATA_STRUCTURE.md│           │  USER_FLOW.md    │
     │  (Data models)   │           │ (User journeys)  │
     └───────┬──────────┘           └───────┬──────────┘
             │                               │
             │                               │
     ┌───────▼──────────┐           ┌───────▼──────────┐
     │ API_REFERENCE.md │           │  ALGORITHM.md    │
     │  (Endpoints)     │           │ (Business logic) │
     └───────┬──────────┘           └───────┬──────────┘
             │                               │
             └───────────┬───────────────────┘
                         │
                 ┌───────▼──────────┐
                 │   SECURITY.md    │
                 │ (Security model) │
                 └──────────────────┘
```

**Legend:**
- Top-level document (SYSTEM_DESIGN) provides overview
- Mid-level documents detail specific aspects (data, flows, endpoints)
- SECURITY cuts across all layers

---

## For Different Audiences

### Product Managers

**Goal:** Understand what the system does and how users interact with it

**Read:**
1. [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) - Architecture overview
2. [USER_FLOW.md](./USER_FLOW.md) - User stories and journeys
3. [API_REFERENCE.md](./API_REFERENCE.md) - Feature inventory

**Key Sections:**
- USER_FLOW.md → User Stories
- SYSTEM_DESIGN.md → Component Architecture
- API_REFERENCE.md → Endpoint summaries

### Technical Architects

**Goal:** Evaluate design decisions and scalability

**Read:**
1. [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) - Complete architecture
2. [DATA_STRUCTURE.md](./DATA_STRUCTURE.md) - Data modeling
3. [ALGORITHM.md](./ALGORITHM.md) - Core algorithms
4. [SECURITY.md](./SECURITY.md) - Security architecture

**Key Sections:**
- SYSTEM_DESIGN.md → Architecture Patterns, Scalability
- DATA_STRUCTURE.md → ER Diagrams, Relationships
- ALGORITHM.md → Complexity Analysis
- SECURITY.md → Threat Modeling

### Security Auditors

**Goal:** Assess security posture and identify vulnerabilities

**Read:**
1. [SECURITY.md](./SECURITY.md) - Complete security documentation
2. [API_REFERENCE.md](./API_REFERENCE.md) - Endpoint authentication
3. [ALGORITHM.md](./ALGORITHM.md) - Payment algorithms

**Key Sections:**
- SECURITY.md → Known Vulnerabilities, Threat Modeling, Security Checklist
- API_REFERENCE.md → Authentication Requirements
- ALGORITHM.md → Escrow Payment Flow

### New Team Members

**Goal:** Onboard quickly and understand the codebase

**Day 1-2:** Big picture
- [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)
- [USER_FLOW.md](./USER_FLOW.md)

**Day 3-5:** Deep dive
- [DATA_STRUCTURE.md](./DATA_STRUCTURE.md)
- [API_REFERENCE.md](./API_REFERENCE.md)

**Week 2+:** Specialized knowledge
- [ALGORITHM.md](./ALGORITHM.md)
- [SECURITY.md](./SECURITY.md)

---

## How to Navigate

### By Feature

**Task Management:**
- DATA_STRUCTURE.md → Task, TaskApplication models
- API_REFERENCE.md → Tasks endpoints (11 endpoints)
- USER_FLOW.md → Requester Flow, Tasker Flow
- ALGORITHM.md → Task Search & Filtering

**Payment System:**
- DATA_STRUCTURE.md → Transaction, Wallet models
- API_REFERENCE.md → Payments & Wallet endpoints
- ALGORITHM.md → Payment & Fee Calculation
- SECURITY.md → Payment Security
- ZALOPAY_INTEGRATION.md → ZaloPay details

**Authentication:**
- DATA_STRUCTURE.md → User model
- API_REFERENCE.md → Authentication endpoints
- USER_FLOW.md → Authentication Flow
- SECURITY.md → Authentication & Authorization

**Real-time Chat:**
- DATA_STRUCTURE.md → Message model
- API_REFERENCE.md → WebSocket endpoint
- USER_FLOW.md → Chat Flow
- SECURITY.md → WebSocket Security

### By Technology

**Backend (FastAPI):**
- SYSTEM_DESIGN.md → Backend Architecture
- DATA_STRUCTURE.md → Models & Schemas
- API_REFERENCE.md → All endpoints
- ALGORITHM.md → Business logic

**Frontend (React + Zalo):**
- SYSTEM_DESIGN.md → Frontend Architecture
- DATA_STRUCTURE.md → TypeScript types
- USER_FLOW.md → Page flows
- API_REFERENCE.md → API integration

**Database (SQLite):**
- DATA_STRUCTURE.md → Complete schema
- SYSTEM_DESIGN.md → Data Layer
- ALGORITHM.md → Query patterns

**Infrastructure:**
- SYSTEM_DESIGN.md → Infrastructure & Deployment
- SECURITY.md → Security Checklist

---

## Document Formats

All documents follow these conventions:

- **Markdown format** with GFM (GitHub Flavored Markdown)
- **Code snippets** with language tags and line numbers
- **ASCII art diagrams** for flows and architecture
- **Tables** for comparisons and summaries
- **File references** with absolute paths and line numbers (e.g., `backend/app/main.py:51`)
- **Cross-references** between documents
- **Last Updated** timestamp in each file

---

## Contributing to Documentation

When updating code, also update relevant documentation:

| Code Change | Update These Docs |
|-------------|-------------------|
| Add/modify database model | DATA_STRUCTURE.md |
| Add/modify API endpoint | API_REFERENCE.md |
| Change architecture pattern | SYSTEM_DESIGN.md |
| Add user feature | USER_FLOW.md |
| Implement new algorithm | ALGORITHM.md |
| Add security feature | SECURITY.md |

---

## Glossary

**Requester:** User who posts tasks
**Tasker:** User who performs tasks (must register)
**Escrow:** Platform holds payment until task completion
**Mock Payment:** Virtual wallet system for development (MOCK_PAYMENT_ENABLED=true)
**ZaloPay:** Real payment provider (for production)
**Zalo OAuth:** Authentication via Zalo platform
**JWT:** JSON Web Token for API authentication
**WebSocket:** Real-time bidirectional communication protocol

---

## External Resources

- **Backend Repo:** (Root directory)
- **Frontend Repo:** `vieczzalo/`
- **Project CLAUDE.md:** `CLAUDE.md` (project overview)
- **Backend CLAUDE.md:** `backend/CLAUDE.md`
- **Frontend CLAUDE.md:** `vieczzalo/CLAUDE.md`
- **Development Journal:** `DEVELOPMENT_JOURNAL.md`

---

## Document Metadata

| Document | Lines | Last Updated | Completeness |
|----------|-------|--------------|--------------|
| DATA_STRUCTURE.md | ~2,000 | 2026-02-04 | ✅ Complete |
| API_REFERENCE.md | ~3,500 | 2026-02-04 | ✅ Complete |
| SYSTEM_DESIGN.md | ~2,800 | 2026-02-04 | ✅ Complete |
| USER_FLOW.md | ~2,500 | 2026-02-04 | ✅ Complete |
| ALGORITHM.md | ~1,800 | 2026-02-04 | ✅ Complete |
| SECURITY.md | ~2,200 | 2026-02-04 | ✅ Complete |

**Total Documentation:** ~15,000 lines covering all aspects of the system

---

## Need Help?

- **General Questions:** Read SYSTEM_DESIGN.md first
- **API Integration:** Check API_REFERENCE.md
- **Data Models:** See DATA_STRUCTURE.md
- **User Flows:** Review USER_FLOW.md
- **Security Issues:** Consult SECURITY.md

For questions not covered in documentation, refer to:
- Project CLAUDE.md files
- Development Journal (DEVELOPMENT_JOURNAL.md)
- Code comments in source files

---

**Last Updated:** 2026-02-04
**Maintained By:** Development Team
**Documentation Version:** 1.0.0
