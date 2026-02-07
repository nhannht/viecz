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

func setupConversationTestDB(t *testing.T) (*gorm.DB, func()) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// Auto migrate the schema
	if err := db.AutoMigrate(&models.Conversation{}, &models.Message{}, &models.User{}, &models.Task{}); err != nil {
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

func TestConversationGormRepository_Create(t *testing.T) {
	tests := []struct {
		name         string
		conversation *models.Conversation
		wantErr      bool
	}{
		{
			name: "create conversation successfully",
			conversation: &models.Conversation{
				TaskID:   1,
				PosterID: 1,
				TaskerID: 2,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupConversationTestDB(t)
			defer cleanup()

			repo := NewConversationGormRepository(db)
			ctx := context.Background()

			err := repo.Create(ctx, tt.conversation)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error but got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if tt.conversation.ID == 0 {
					t.Error("Expected conversation ID to be set")
				}
			}
		})
	}
}

func TestConversationGormRepository_GetByID(t *testing.T) {
	tests := []struct {
		name   string
		setup  func(*gorm.DB) uint
		convID uint
		wantNil bool
		wantErr bool
		checkConv func(*testing.T, *models.Conversation)
	}{
		{
			name: "conversation exists",
			setup: func(db *gorm.DB) uint {
				conv := &models.Conversation{
					TaskID:   1,
					PosterID: 1,
					TaskerID: 2,
				}
				db.Create(conv)
				return conv.ID
			},
			wantNil: false,
			wantErr: false,
			checkConv: func(t *testing.T, conv *models.Conversation) {
				if conv.TaskID != 1 {
					t.Errorf("Expected TaskID 1, got %d", conv.TaskID)
				}
				if conv.PosterID != 1 {
					t.Errorf("Expected PosterID 1, got %d", conv.PosterID)
				}
				if conv.TaskerID != 2 {
					t.Errorf("Expected TaskerID 2, got %d", conv.TaskerID)
				}
			},
		},
		{
			name: "conversation not found",
			setup: func(db *gorm.DB) uint {
				return 999
			},
			convID:  999,
			wantNil: true,
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupConversationTestDB(t)
			defer cleanup()

			var convID uint
			if tt.setup != nil {
				convID = tt.setup(db)
			}
			if tt.convID != 0 {
				convID = tt.convID
			}

			repo := NewConversationGormRepository(db)
			ctx := context.Background()

			conv, err := repo.GetByID(ctx, convID)

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
				if conv != nil {
					t.Error("Expected nil conversation")
				}
			} else {
				if conv == nil {
					t.Fatal("Expected conversation to be returned")
				}
				if tt.checkConv != nil {
					tt.checkConv(t, conv)
				}
			}
		})
	}
}

func TestConversationGormRepository_GetByTask(t *testing.T) {
	tests := []struct {
		name    string
		setup   func(*gorm.DB)
		taskID  uint
		wantNil bool
		wantErr bool
		checkConv func(*testing.T, *models.Conversation)
	}{
		{
			name: "conversation exists for task",
			setup: func(db *gorm.DB) {
				conv := &models.Conversation{
					TaskID:   1,
					PosterID: 10,
					TaskerID: 20,
				}
				db.Create(conv)
			},
			taskID:  1,
			wantNil: false,
			wantErr: false,
			checkConv: func(t *testing.T, conv *models.Conversation) {
				if conv.TaskID != 1 {
					t.Errorf("Expected TaskID 1, got %d", conv.TaskID)
				}
			},
		},
		{
			name:    "conversation not found for task",
			setup:   func(db *gorm.DB) {},
			taskID:  999,
			wantNil: true,
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupConversationTestDB(t)
			defer cleanup()

			if tt.setup != nil {
				tt.setup(db)
			}

			repo := NewConversationGormRepository(db)
			ctx := context.Background()

			conv, err := repo.GetByTask(ctx, tt.taskID)

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
				if conv != nil {
					t.Error("Expected nil conversation")
				}
			} else {
				if conv == nil {
					t.Fatal("Expected conversation to be returned")
				}
				if tt.checkConv != nil {
					tt.checkConv(t, conv)
				}
			}
		})
	}
}

func TestConversationGormRepository_GetByUser(t *testing.T) {
	tests := []struct {
		name      string
		setup     func(*gorm.DB)
		userID    uint
		wantCount int
		wantErr   bool
		checkConvs func(*testing.T, []models.Conversation)
	}{
		{
			name: "user has conversations as poster",
			setup: func(db *gorm.DB) {
				db.Create(&models.Conversation{TaskID: 1, PosterID: 10, TaskerID: 20})
				db.Create(&models.Conversation{TaskID: 2, PosterID: 10, TaskerID: 30})
			},
			userID:    10,
			wantCount: 2,
			wantErr:   false,
		},
		{
			name: "user has conversations as tasker",
			setup: func(db *gorm.DB) {
				db.Create(&models.Conversation{TaskID: 1, PosterID: 20, TaskerID: 10})
				db.Create(&models.Conversation{TaskID: 2, PosterID: 30, TaskerID: 10})
			},
			userID:    10,
			wantCount: 2,
			wantErr:   false,
		},
		{
			name: "user has conversations as both poster and tasker",
			setup: func(db *gorm.DB) {
				db.Create(&models.Conversation{TaskID: 1, PosterID: 10, TaskerID: 20})
				db.Create(&models.Conversation{TaskID: 2, PosterID: 20, TaskerID: 10})
			},
			userID:    10,
			wantCount: 2,
			wantErr:   false,
		},
		{
			name:      "user has no conversations",
			setup:     func(db *gorm.DB) {},
			userID:    10,
			wantCount: 0,
			wantErr:   false,
		},
		{
			name: "conversations ordered by last_message_at DESC",
			setup: func(db *gorm.DB) {
				// Create conversations with different last message times
				now := time.Now()
				conv1 := &models.Conversation{TaskID: 1, PosterID: 10, TaskerID: 20}
				conv1.LastMessageAt = &now
				db.Create(conv1)

				later := now.Add(5 * time.Minute)
				conv2 := &models.Conversation{TaskID: 2, PosterID: 10, TaskerID: 30}
				conv2.LastMessageAt = &later
				db.Create(conv2)
			},
			userID:    10,
			wantCount: 2,
			wantErr:   false,
			checkConvs: func(t *testing.T, convs []models.Conversation) {
				if len(convs) != 2 {
					t.Fatalf("Expected 2 conversations, got %d", len(convs))
				}
				// Most recent should be first (TaskID 2)
				if convs[0].TaskID != 2 {
					t.Errorf("Expected first conversation TaskID 2, got %d", convs[0].TaskID)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupConversationTestDB(t)
			defer cleanup()

			if tt.setup != nil {
				tt.setup(db)
			}

			repo := NewConversationGormRepository(db)
			ctx := context.Background()

			convs, err := repo.GetByUser(ctx, tt.userID)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error but got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if len(convs) != tt.wantCount {
					t.Errorf("Expected %d conversations, got %d", tt.wantCount, len(convs))
				}
				if tt.checkConvs != nil {
					tt.checkConvs(t, convs)
				}
			}
		})
	}
}

func TestConversationGormRepository_GetWithMessages(t *testing.T) {
	tests := []struct {
		name      string
		setup     func(*gorm.DB) uint
		convID    uint
		limit     int
		offset    int
		wantNil   bool
		wantErr   bool
		checkConv func(*testing.T, *models.Conversation)
	}{
		{
			name: "conversation with messages",
			setup: func(db *gorm.DB) uint {
				conv := &models.Conversation{
					TaskID:   1,
					PosterID: 10,
					TaskerID: 20,
				}
				db.Create(conv)

				// Create messages
				for i := 0; i < 5; i++ {
					db.Create(&models.Message{
						ConversationID: conv.ID,
						SenderID:       10,
						Content:        "Message",
						IsRead:         false,
					})
					time.Sleep(1 * time.Millisecond)
				}

				return conv.ID
			},
			limit:   10,
			offset:  0,
			wantNil: false,
			wantErr: false,
			checkConv: func(t *testing.T, conv *models.Conversation) {
				if len(conv.Messages) != 5 {
					t.Errorf("Expected 5 messages, got %d", len(conv.Messages))
				}
			},
		},
		{
			name: "conversation with paginated messages",
			setup: func(db *gorm.DB) uint {
				conv := &models.Conversation{
					TaskID:   1,
					PosterID: 10,
					TaskerID: 20,
				}
				db.Create(conv)

				for i := 0; i < 10; i++ {
					db.Create(&models.Message{
						ConversationID: conv.ID,
						SenderID:       10,
						Content:        "Message",
						IsRead:         false,
					})
					time.Sleep(1 * time.Millisecond)
				}

				return conv.ID
			},
			limit:   5,
			offset:  2,
			wantNil: false,
			wantErr: false,
			checkConv: func(t *testing.T, conv *models.Conversation) {
				if len(conv.Messages) != 5 {
					t.Errorf("Expected 5 messages (paginated), got %d", len(conv.Messages))
				}
			},
		},
		{
			name: "conversation not found",
			setup: func(db *gorm.DB) uint {
				return 999
			},
			convID:  999,
			limit:   10,
			offset:  0,
			wantNil: true,
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupConversationTestDB(t)
			defer cleanup()

			var convID uint
			if tt.setup != nil {
				convID = tt.setup(db)
			}
			if tt.convID != 0 {
				convID = tt.convID
			}

			repo := NewConversationGormRepository(db)
			ctx := context.Background()

			conv, err := repo.GetWithMessages(ctx, convID, tt.limit, tt.offset)

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
				if conv != nil {
					t.Error("Expected nil conversation")
				}
			} else {
				if conv == nil {
					t.Fatal("Expected conversation to be returned")
				}
				if tt.checkConv != nil {
					tt.checkConv(t, conv)
				}
			}
		})
	}
}

func TestConversationGormRepository_Update(t *testing.T) {
	tests := []struct {
		name       string
		setup      func(*gorm.DB) *models.Conversation
		updateFunc func(*models.Conversation)
		wantErr    bool
		checkConv  func(*testing.T, *models.Conversation)
	}{
		{
			name: "update conversation successfully",
			setup: func(db *gorm.DB) *models.Conversation {
				conv := &models.Conversation{
					TaskID:      1,
					PosterID:    10,
					TaskerID:    20,
					LastMessage: "Old message",
				}
				db.Create(conv)
				return conv
			},
			updateFunc: func(conv *models.Conversation) {
				conv.LastMessage = "New message"
			},
			wantErr: false,
			checkConv: func(t *testing.T, conv *models.Conversation) {
				if conv.LastMessage != "New message" {
					t.Errorf("Expected LastMessage 'New message', got '%s'", conv.LastMessage)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupConversationTestDB(t)
			defer cleanup()

			var conv *models.Conversation
			if tt.setup != nil {
				conv = tt.setup(db)
			}

			if tt.updateFunc != nil {
				tt.updateFunc(conv)
			}

			repo := NewConversationGormRepository(db)
			ctx := context.Background()

			err := repo.Update(ctx, conv)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error but got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}

				// Re-fetch to verify update
				updated, _ := repo.GetByID(ctx, conv.ID)
				if tt.checkConv != nil {
					tt.checkConv(t, updated)
				}
			}
		})
	}
}

func TestConversationGormRepository_Delete(t *testing.T) {
	tests := []struct {
		name   string
		setup  func(*gorm.DB) uint
		convID uint
		wantErr bool
	}{
		{
			name: "delete conversation successfully",
			setup: func(db *gorm.DB) uint {
				conv := &models.Conversation{
					TaskID:   1,
					PosterID: 10,
					TaskerID: 20,
				}
				db.Create(conv)
				return conv.ID
			},
			wantErr: false,
		},
		{
			name: "delete non-existent conversation",
			setup: func(db *gorm.DB) uint {
				return 999
			},
			convID:  999,
			wantErr: false, // GORM soft delete doesn't error
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupConversationTestDB(t)
			defer cleanup()

			var convID uint
			if tt.setup != nil {
				convID = tt.setup(db)
			}
			if tt.convID != 0 {
				convID = tt.convID
			}

			repo := NewConversationGormRepository(db)
			ctx := context.Background()

			err := repo.Delete(ctx, convID)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error but got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}

				// Verify conversation was soft deleted
				var conv models.Conversation
				err := db.First(&conv, convID).Error
				if err == nil {
					t.Error("Expected conversation to be soft deleted")
				}
			}
		})
	}
}
