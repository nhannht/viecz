# Go Backend Architecture

## Directory Structure
```
server/internal/
├── auth/          # JWT token generation/validation
├── config/        # Environment config, .env loading
├── database/      # DB connection, migrations, seeding
├── handlers/      # HTTP handlers (Gin)
├── middleware/     # CORS, rate limiting, Sentry, Prometheus, request logging
├── models/        # GORM models with validation hooks
├── repository/    # Interface + GORM implementation pattern
├── services/      # Business logic
├── testutil/      # Test helpers
└── websocket/     # WebSocket hub for real-time chat
```

## Models (12)
User, Task, TaskApplication, Category, Wallet, WalletTransaction, Transaction, Payment, Message, Conversation, Notification, BankAccount

## Services
wallet, payment, payos (dual: deposit+payout), payout_poller, task, user, message, notification, search (Meilisearch), email_verifier, email_service, turnstile

## Handlers
auth, tasks, users, categories, payment, wallet, webhook, websocket, bank_account, bank_list, return, upload, notification, health, geocoding, maps

## Repository Pattern
Each entity has: interface file (e.g., `user.go`) + GORM implementation (e.g., `user_gorm.go`) + tests (e.g., `user_gorm_test.go`)

## Key Patterns
- Constructor injection: `NewXxxService(repo XxxRepository, ...)` 
- GORM hooks: `BeforeCreate`, `BeforeUpdate` for validation
- Wallet: Available balance = balance - escrow held amounts
- PayOS: Dual client (deposit channel + payout channel)
- WebSocket: Hub pattern with private conversation channels
- Middleware stack: RequestLogger → Sentry → CORS → Prometheus → (route handlers)
- Prometheus metrics exposed at `/metrics` (outside `/api/v1`, no auth)
- Sentry/GlitchTip error tracking via sentry-go SDK
