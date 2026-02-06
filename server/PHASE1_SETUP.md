# Phase 1 Setup: Database & Authentication

## Prerequisites

- Go 1.21+
- Docker & Docker Compose (for PostgreSQL)
- PostgreSQL client tools (optional, for manual DB access)

## Setup Instructions

### 1. Start PostgreSQL Database

```bash
# Start PostgreSQL with Docker Compose
docker-compose up -d

# Verify it's running
docker-compose ps

# Check logs
docker-compose logs -f postgres
```

### 2. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env file with your settings
# Default values work for local development
nano .env
```

### 3. Run Migrations & Start Server

```bash
# Install dependencies
go mod download

# Run the server (it will auto-run migrations on startup)
go run cmd/server/main.go
```

The server will:
1. Connect to PostgreSQL
2. Run all pending migrations
3. Start on port 8080

## Test Auth Endpoints

### 1. Register a New User

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }'
```

**Expected Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "university": "ĐHQG-HCM",
    "is_verified": false,
    "rating": 0,
    "is_tasker": false,
    "created_at": "2026-02-05T..."
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### 3. Refresh Access Token

```bash
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN_HERE"
  }'
```

### 4. Test Protected Route (Example)

```bash
# Use the access token from login/register
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl http://localhost:8080/api/v1/health \
  -H "Authorization: Bearer $TOKEN"
```

## Database Schema

The following tables are created automatically:

1. **users** - User accounts with email/password
2. **categories** - Task categories
3. **tasks** - Posted tasks
4. **task_applications** - Tasker applications
5. **wallets** - User wallets (mock & real)
6. **transactions** - Payment transactions
7. **wallet_transactions** - Wallet transaction history
8. **messages** - Chat messages
9. **reviews** - User reviews
10. **notifications** - User notifications

## Database Management

### Connect to PostgreSQL

```bash
# Via Docker
docker exec -it viecz-postgres psql -U postgres -d viecz

# Or via local psql client
psql -h localhost -U postgres -d viecz
```

### Useful SQL Queries

```sql
-- List all users
SELECT id, email, name, is_tasker, created_at FROM users;

-- Check user count
SELECT COUNT(*) FROM users;

-- View all tables
\dt

-- Describe users table
\d users
```

### Reset Database

```bash
# Stop containers and remove volumes
docker-compose down -v

# Start fresh
docker-compose up -d

# Migrations will run automatically on next server start
go run cmd/server/main.go
```

## Troubleshooting

### "connection refused" Error

Make sure PostgreSQL is running:
```bash
docker-compose ps
```

### "email already exists" Error

The email is already registered. Try:
1. Use a different email
2. Login instead of register
3. Reset the database (see above)

### Migration Errors

If migrations fail:
```bash
# Check migration files
ls -la internal/database/migrations/

# View PostgreSQL logs
docker-compose logs postgres

# Manually connect and check
docker exec -it viecz-postgres psql -U postgres -d viecz -c "\dt"
```

## Next Steps

Phase 1 ✅ Complete! You now have:
- ✅ PostgreSQL database with all tables
- ✅ User registration with bcrypt password hashing
- ✅ Login with JWT tokens
- ✅ Token refresh mechanism
- ✅ Auth middleware ready for protected routes

**Ready for Phase 2:** Task & Application Management
