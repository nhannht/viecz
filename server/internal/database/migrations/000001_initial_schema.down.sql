-- Drop triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets;
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables in reverse order (respecting foreign key dependencies)
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS wallet_transactions;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS wallets;
DROP TABLE IF EXISTS task_applications;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
