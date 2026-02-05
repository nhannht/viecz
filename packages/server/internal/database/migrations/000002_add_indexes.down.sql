-- Drop all indexes
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_is_tasker;
DROP INDEX IF EXISTS idx_users_rating;

DROP INDEX IF EXISTS idx_tasks_status;
DROP INDEX IF EXISTS idx_tasks_requester_id;
DROP INDEX IF EXISTS idx_tasks_tasker_id;
DROP INDEX IF EXISTS idx_tasks_category_id;
DROP INDEX IF EXISTS idx_tasks_created_at;
DROP INDEX IF EXISTS idx_tasks_price;
DROP INDEX IF EXISTS idx_tasks_deadline;
DROP INDEX IF EXISTS idx_tasks_status_category;
DROP INDEX IF EXISTS idx_tasks_status_created_at;

DROP INDEX IF EXISTS idx_applications_task_id;
DROP INDEX IF EXISTS idx_applications_tasker_id;
DROP INDEX IF EXISTS idx_applications_status;

DROP INDEX IF EXISTS idx_wallets_user_id;
DROP INDEX IF EXISTS idx_wallets_type;

DROP INDEX IF EXISTS idx_transactions_task_id;
DROP INDEX IF EXISTS idx_transactions_payer_id;
DROP INDEX IF EXISTS idx_transactions_payee_id;
DROP INDEX IF EXISTS idx_transactions_status;
DROP INDEX IF EXISTS idx_transactions_created_at;

DROP INDEX IF EXISTS idx_wallet_transactions_wallet_id;
DROP INDEX IF EXISTS idx_wallet_transactions_task_id;
DROP INDEX IF EXISTS idx_wallet_transactions_created_at;

DROP INDEX IF EXISTS idx_messages_task_id;
DROP INDEX IF EXISTS idx_messages_sender_id;
DROP INDEX IF EXISTS idx_messages_receiver_id;
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_messages_is_read;

DROP INDEX IF EXISTS idx_reviews_task_id;
DROP INDEX IF EXISTS idx_reviews_reviewee_id;
DROP INDEX IF EXISTS idx_reviews_created_at;

DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_notifications_is_read;
DROP INDEX IF EXISTS idx_notifications_created_at;
