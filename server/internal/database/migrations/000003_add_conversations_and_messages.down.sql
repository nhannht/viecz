-- Drop indexes for messages
DROP INDEX IF EXISTS idx_messages_is_read;
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_messages_deleted_at;
DROP INDEX IF EXISTS idx_messages_sender_id;
DROP INDEX IF EXISTS idx_messages_conversation_id;

-- Drop indexes for conversations
DROP INDEX IF EXISTS idx_conversations_last_message_at;
DROP INDEX IF EXISTS idx_conversations_deleted_at;
DROP INDEX IF EXISTS idx_conversations_tasker_id;
DROP INDEX IF EXISTS idx_conversations_poster_id;
DROP INDEX IF EXISTS idx_conversations_task_id;

-- Drop tables
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
