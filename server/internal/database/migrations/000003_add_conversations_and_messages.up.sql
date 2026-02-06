-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,

    task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    poster_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tasker_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    last_message_at TIMESTAMP,
    last_message TEXT,

    UNIQUE(task_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,

    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP
);

-- Create indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_task_id ON conversations(task_id);
CREATE INDEX IF NOT EXISTS idx_conversations_poster_id ON conversations(poster_id);
CREATE INDEX IF NOT EXISTS idx_conversations_tasker_id ON conversations(tasker_id);
CREATE INDEX IF NOT EXISTS idx_conversations_deleted_at ON conversations(deleted_at);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read) WHERE is_read = false;
