#!/bin/bash
set -euo pipefail

DOCKER_ID=$(docker ps --filter "publish=5433" -q)
DB_CMD="docker exec -i $DOCKER_ID psql -U postgres -d viecz_test"

echo "=== Step 1: Truncate task-related tables ==="
$DB_CMD <<'SQL'
TRUNCATE TABLE tasks, task_applications, conversations, messages,
  transactions, wallet_transactions, notifications, payment_references
  RESTART IDENTITY CASCADE;
SQL
echo "Done."

echo "=== Step 2: Reset wallet balances ==="
$DB_CMD <<'SQL'
UPDATE wallets SET
  balance = 10000000,
  escrow_balance = 0,
  total_deposited = 10000000,
  total_withdrawn = 0,
  total_earned = 0,
  total_spent = 0;
SQL
echo "Done."

echo "=== Step 3: Remove leftover demo user ==="
$DB_CMD -c "DELETE FROM users WHERE phone = '+84371234581';"
echo "Done."

echo "=== Step 4: Restart Go server ==="
# Kill the running server in tmux pane 2.1
tmux send-keys -t viecz:2.1 C-c ""
sleep 3
tmux send-keys -t viecz:2.1 "set -a && source .env.dev && set +a && go run cmd/server/main.go" Enter

echo "Waiting for server health..."
for i in $(seq 1 60); do
  if curl -sf http://localhost:9999/api/v1/health > /dev/null 2>&1; then
    echo "Server is healthy!"
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "ERROR: Server did not start within 60 seconds"
    exit 1
  fi
  sleep 1
done

echo "=== Step 5: Verify seed ==="
TASK_COUNT=$($DB_CMD -t -c "SELECT COUNT(*) FROM tasks;")
FUTURE_DEADLINES=$($DB_CMD -t -c "SELECT COUNT(*) FROM tasks WHERE deadline > NOW();")
echo "Tasks: $TASK_COUNT (future deadlines: $FUTURE_DEADLINES)"

WALLET_CHECK=$($DB_CMD -t -c "SELECT COUNT(*) FROM wallets WHERE balance = 10000000;")
echo "Wallets at 10M VND: $WALLET_CHECK"

echo "=== Reseed complete ==="
