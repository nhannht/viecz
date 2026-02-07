package repository

import (
	"context"
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"viecz.vieczserver/internal/models"
)

func setupMessageTestDB(t *testing.T) (*gorm.DB, func()) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// Auto migrate the schema
	if err := db.AutoMigrate(&models.Message{}, &models.Conversation{}, &models.User{}); err != nil {
		t.Fatalf("Failed to migrate schema: %v", err)
	}

	cleanup := func() {
		sqlDB, _ := db.DB()
		if sqlDB != nil {
			sqlDB.Close()
		}
	}

	return db, cleanup
}

func TestMessageGormRepository_Create(t *testing.T) {
	tests := []struct {
		name    string
		message *models.Message
		wantErr bool
	}{
		{
			name: "create message successfully",
			message: &models.Message{
				ConversationID: 1,
				SenderID:       1,
				Content:        "Hello, world!",
				IsRead:         false,
			},
			wantErr: false,
		},
		{
			name: "create message with empty content",
			message: &models.Message{
				ConversationID: 1,
				SenderID:       1,
				Content:        "",
				IsRead:         false,
			},
			wantErr: false, // Empty content is allowed at DB level
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupMessageTestDB(t)
			defer cleanup()

			repo := NewMessageGormRepository(db)
			ctx := context.Background()

			err := repo.Create(ctx, tt.message)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error but got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if tt.message.ID == 0 {
					t.Error("Expected message ID to be set")
				}
			}
		})
	}
}

func TestMessageGormRepository_GetByID(t *testing.T) {
	tests := []struct {
		name       string
		setup      func(*gorm.DB) uint
		messageID  uint
		wantNil    bool
		wantErr    bool
		checkMsg   func(*testing.T, *models.Message)
	}{
		{
			name: "message exists",
			setup: func(db *gorm.DB) uint {
				msg := &models.Message{
					ConversationID: 1,
					SenderID:       1,
					Content:        "Test message",
					IsRead:         false,
				}
				db.Create(msg)
				return msg.ID
			},
			wantNil: false,
			wantErr: false,
			checkMsg: func(t *testing.T, msg *models.Message) {
				if msg.Content != "Test message" {
					t.Errorf("Expected content 'Test message', got '%s'", msg.Content)
				}
			},
		},
		{
			name: "message not found",
			setup: func(db *gorm.DB) uint {
				return 999
			},
			messageID: 999,
			wantNil:   true,
			wantErr:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupMessageTestDB(t)
			defer cleanup()

			var messageID uint
			if tt.setup != nil {
				messageID = tt.setup(db)
			}
			if tt.messageID != 0 {
				messageID = tt.messageID
			}

			repo := NewMessageGormRepository(db)
			ctx := context.Background()

			msg, err := repo.GetByID(ctx, messageID)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error but got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
			}

			if tt.wantNil {
				if msg != nil {
					t.Error("Expected nil message")
				}
			} else {
				if msg == nil {
					t.Fatal("Expected message to be returned")
				}
				if tt.checkMsg != nil {
					tt.checkMsg(t, msg)
				}
			}
		})
	}
}

func TestMessageGormRepository_GetByConversation(t *testing.T) {
	tests := []struct {
		name      string
		setup     func(*gorm.DB)
		convID    uint
		limit     int
		offset    int
		wantCount int
		wantErr   bool
		checkMsgs func(*testing.T, []models.Message)
	}{
		{
			name: "get messages for conversation",
			setup: func(db *gorm.DB) {
				// Create messages with slight time differences
				for i := 0; i < 3; i++ {
					msg := &models.Message{
						ConversationID: 1,
						SenderID:       1,
						Content:        "Message",
						IsRead:         false,
					}
					db.Create(msg)
					time.Sleep(1 * time.Millisecond) // Ensure different timestamps
				}
			},
			convID:    1,
			limit:     10,
			offset:    0,
			wantCount: 3,
			wantErr:   false,
		},
		{
			name: "pagination",
			setup: func(db *gorm.DB) {
				for i := 0; i < 10; i++ {
					msg := &models.Message{
						ConversationID: 1,
						SenderID:       1,
						Content:        "Message",
						IsRead:         false,
					}
					db.Create(msg)
					time.Sleep(1 * time.Millisecond)
				}
			},
			convID:    1,
			limit:     5,
			offset:    2,
			wantCount: 5,
			wantErr:   false,
		},
		{
			name:      "no messages",
			setup:     func(db *gorm.DB) {},
			convID:    999,
			limit:     10,
			offset:    0,
			wantCount: 0,
			wantErr:   false,
		},
		{
			name: "messages ordered by created_at DESC",
			setup: func(db *gorm.DB) {
				// Create messages in order
				for i := 1; i <= 3; i++ {
					msg := &models.Message{
						ConversationID: 1,
						SenderID:       1,
						Content:        "Message",
						IsRead:         false,
					}
					db.Create(msg)
					time.Sleep(2 * time.Millisecond) // Ensure different timestamps
				}
			},
			convID:    1,
			limit:     10,
			offset:    0,
			wantCount: 3,
			wantErr:   false,
			checkMsgs: func(t *testing.T, msgs []models.Message) {
				// Messages should be in descending order (newest first)
				for i := 0; i < len(msgs)-1; i++ {
					if msgs[i].CreatedAt.Before(msgs[i+1].CreatedAt) {
						t.Error("Messages not in descending order by created_at")
					}
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupMessageTestDB(t)
			defer cleanup()

			if tt.setup != nil {
				tt.setup(db)
			}

			repo := NewMessageGormRepository(db)
			ctx := context.Background()

			msgs, err := repo.GetByConversation(ctx, tt.convID, tt.limit, tt.offset)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error but got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if len(msgs) != tt.wantCount {
					t.Errorf("Expected %d messages, got %d", tt.wantCount, len(msgs))
				}
				if tt.checkMsgs != nil {
					tt.checkMsgs(t, msgs)
				}
			}
		})
	}
}

func TestMessageGormRepository_MarkAsRead(t *testing.T) {
	tests := []struct {
		name      string
		setup     func(*gorm.DB) uint
		messageID uint
		wantErr   bool
	}{
		{
			name: "mark message as read",
			setup: func(db *gorm.DB) uint {
				msg := &models.Message{
					ConversationID: 1,
					SenderID:       1,
					Content:        "Test",
					IsRead:         false,
				}
				db.Create(msg)
				return msg.ID
			},
			wantErr: false,
		},
		{
			name: "mark non-existent message",
			setup: func(db *gorm.DB) uint {
				return 999
			},
			messageID: 999,
			wantErr:   false, // GORM doesn't error on Update with no matches
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupMessageTestDB(t)
			defer cleanup()

			var messageID uint
			if tt.setup != nil {
				messageID = tt.setup(db)
			}
			if tt.messageID != 0 {
				messageID = tt.messageID
			}

			repo := NewMessageGormRepository(db)
			ctx := context.Background()

			err := repo.MarkAsRead(ctx, messageID)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error but got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}

				// Verify message was marked as read
				var msg models.Message
				if db.First(&msg, messageID).Error == nil {
					if !msg.IsRead {
						t.Error("Expected message to be marked as read")
					}
					if msg.ReadAt == nil {
						t.Error("Expected ReadAt to be set")
					}
				}
			}
		})
	}
}

func TestMessageGormRepository_MarkConversationAsRead(t *testing.T) {
	tests := []struct {
		name       string
		setup      func(*gorm.DB)
		convID     uint
		userID     uint
		wantErr    bool
		checkCount func(*testing.T, *gorm.DB)
	}{
		{
			name: "mark all unread messages in conversation",
			setup: func(db *gorm.DB) {
				// Create messages from different senders
				db.Create(&models.Message{ConversationID: 1, SenderID: 2, Content: "From user 2", IsRead: false})
				db.Create(&models.Message{ConversationID: 1, SenderID: 3, Content: "From user 3", IsRead: false})
				db.Create(&models.Message{ConversationID: 1, SenderID: 1, Content: "From user 1 (self)", IsRead: false})
			},
			convID:  1,
			userID:  1, // Mark as read for user 1
			wantErr: false,
			checkCount: func(t *testing.T, db *gorm.DB) {
				var count int64
				db.Model(&models.Message{}).Where("conversation_id = ? AND is_read = ?", 1, true).Count(&count)
				if count != 2 {
					t.Errorf("Expected 2 messages marked as read, got %d", count)
				}
			},
		},
		{
			name:    "no messages to mark",
			setup:   func(db *gorm.DB) {},
			convID:  999,
			userID:  1,
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupMessageTestDB(t)
			defer cleanup()

			if tt.setup != nil {
				tt.setup(db)
			}

			repo := NewMessageGormRepository(db)
			ctx := context.Background()

			err := repo.MarkConversationAsRead(ctx, tt.convID, tt.userID)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error but got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if tt.checkCount != nil {
					tt.checkCount(t, db)
				}
			}
		})
	}
}

func TestMessageGormRepository_GetUnreadCount(t *testing.T) {
	tests := []struct {
		name      string
		setup     func(*gorm.DB)
		convID    uint
		userID    uint
		wantCount int64
		wantErr   bool
	}{
		{
			name: "count unread messages",
			setup: func(db *gorm.DB) {
				db.Create(&models.Message{ConversationID: 1, SenderID: 2, Content: "Unread 1", IsRead: false})
				db.Create(&models.Message{ConversationID: 1, SenderID: 2, Content: "Unread 2", IsRead: false})
				db.Create(&models.Message{ConversationID: 1, SenderID: 2, Content: "Read", IsRead: true})
				db.Create(&models.Message{ConversationID: 1, SenderID: 1, Content: "Self message", IsRead: false})
			},
			convID:    1,
			userID:    1,
			wantCount: 2, // Only messages from sender 2 that are unread
			wantErr:   false,
		},
		{
			name:      "no unread messages",
			setup:     func(db *gorm.DB) {},
			convID:    1,
			userID:    1,
			wantCount: 0,
			wantErr:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupMessageTestDB(t)
			defer cleanup()

			if tt.setup != nil {
				tt.setup(db)
			}

			repo := NewMessageGormRepository(db)
			ctx := context.Background()

			count, err := repo.GetUnreadCount(ctx, tt.convID, tt.userID)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error but got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if count != tt.wantCount {
					t.Errorf("Expected count %d, got %d", tt.wantCount, count)
				}
			}
		})
	}
}

func TestMessageGormRepository_Delete(t *testing.T) {
	tests := []struct {
		name      string
		setup     func(*gorm.DB) uint
		messageID uint
		wantErr   bool
	}{
		{
			name: "delete message successfully",
			setup: func(db *gorm.DB) uint {
				msg := &models.Message{
					ConversationID: 1,
					SenderID:       1,
					Content:        "To be deleted",
					IsRead:         false,
				}
				db.Create(msg)
				return msg.ID
			},
			wantErr: false,
		},
		{
			name: "delete non-existent message",
			setup: func(db *gorm.DB) uint {
				return 999
			},
			messageID: 999,
			wantErr:   false, // GORM soft delete doesn't error on non-existent records
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupMessageTestDB(t)
			defer cleanup()

			var messageID uint
			if tt.setup != nil {
				messageID = tt.setup(db)
			}
			if tt.messageID != 0 {
				messageID = tt.messageID
			}

			repo := NewMessageGormRepository(db)
			ctx := context.Background()

			err := repo.Delete(ctx, messageID)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error but got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}

				// Verify message was soft deleted
				var msg models.Message
				err := db.First(&msg, messageID).Error
				if err == nil {
					t.Error("Expected message to be soft deleted (not found)")
				}
			}
		})
	}
}
