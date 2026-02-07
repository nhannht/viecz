package services

import (
	"context"
	"errors"
	"testing"

	"viecz.vieczserver/internal/models"
)

// Mock repositories with minimal viable implementation
type mockMessageRepository struct {
	messages         map[uint]*models.Message
	nextID           uint
	shouldFail       bool
	conversationMsgs map[uint][]models.Message
}

func newMockMessageRepository() *mockMessageRepository {
	return &mockMessageRepository{
		messages:         make(map[uint]*models.Message),
		nextID:           1,
		conversationMsgs: make(map[uint][]models.Message),
	}
}

func (m *mockMessageRepository) Create(ctx context.Context, message *models.Message) error {
	if m.shouldFail {
		return errors.New("repository error")
	}
	message.ID = m.nextID
	m.nextID++
	m.messages[message.ID] = message
	return nil
}

func (m *mockMessageRepository) GetByID(ctx context.Context, id uint) (*models.Message, error) {
	if m.shouldFail {
		return nil, errors.New("repository error")
	}
	msg, exists := m.messages[id]
	if !exists {
		return nil, errors.New("message not found")
	}
	return msg, nil
}

func (m *mockMessageRepository) GetByConversation(ctx context.Context, conversationID uint, limit, offset int) ([]models.Message, error) {
	if m.shouldFail {
		return nil, errors.New("repository error")
	}
	msgs, exists := m.conversationMsgs[conversationID]
	if !exists {
		return []models.Message{}, nil
	}

	start := offset
	if start >= len(msgs) {
		return []models.Message{}, nil
	}

	end := start + limit
	if end > len(msgs) {
		end = len(msgs)
	}

	return msgs[start:end], nil
}

func (m *mockMessageRepository) MarkConversationAsRead(ctx context.Context, conversationID uint, userID uint) error {
	if m.shouldFail {
		return errors.New("repository error")
	}
	return nil
}

func (m *mockMessageRepository) GetUnreadCount(ctx context.Context, conversationID uint, userID uint) (int64, error) {
	if m.shouldFail {
		return 0, errors.New("repository error")
	}
	return 0, nil
}

func (m *mockMessageRepository) MarkAsRead(ctx context.Context, messageID uint) error {
	if m.shouldFail {
		return errors.New("repository error")
	}
	return nil
}

func (m *mockMessageRepository) Delete(ctx context.Context, id uint) error {
	if m.shouldFail {
		return errors.New("repository error")
	}
	delete(m.messages, id)
	return nil
}

type mockConversationRepository struct {
	conversations     map[uint]*models.Conversation
	nextID            uint
	shouldFail        bool
	taskConversations map[uint]*models.Conversation
	userConversations map[uint][]models.Conversation
}

func newMockConversationRepository() *mockConversationRepository {
	return &mockConversationRepository{
		conversations:     make(map[uint]*models.Conversation),
		nextID:            1,
		taskConversations: make(map[uint]*models.Conversation),
		userConversations: make(map[uint][]models.Conversation),
	}
}

func (m *mockConversationRepository) Create(ctx context.Context, conv *models.Conversation) error {
	if m.shouldFail {
		return errors.New("repository error")
	}
	conv.ID = m.nextID
	m.nextID++
	m.conversations[conv.ID] = conv
	m.taskConversations[conv.TaskID] = conv
	return nil
}

func (m *mockConversationRepository) GetByID(ctx context.Context, id uint) (*models.Conversation, error) {
	if m.shouldFail {
		return nil, errors.New("repository error")
	}
	conv, exists := m.conversations[id]
	if !exists {
		return nil, nil
	}
	return conv, nil
}

func (m *mockConversationRepository) GetByTask(ctx context.Context, taskID uint) (*models.Conversation, error) {
	if m.shouldFail {
		return nil, errors.New("repository error")
	}
	conv, exists := m.taskConversations[taskID]
	if !exists {
		return nil, nil
	}
	return conv, nil
}

func (m *mockConversationRepository) GetByUser(ctx context.Context, userID uint) ([]models.Conversation, error) {
	if m.shouldFail {
		return nil, errors.New("repository error")
	}
	convs, exists := m.userConversations[userID]
	if !exists {
		return []models.Conversation{}, nil
	}
	return convs, nil
}

func (m *mockConversationRepository) Update(ctx context.Context, conv *models.Conversation) error {
	if m.shouldFail {
		return errors.New("repository error")
	}
	if _, exists := m.conversations[conv.ID]; !exists {
		return errors.New("conversation not found")
	}
	m.conversations[conv.ID] = conv
	return nil
}

func (m *mockConversationRepository) Delete(ctx context.Context, id uint) error {
	if m.shouldFail {
		return errors.New("repository error")
	}
	delete(m.conversations, id)
	return nil
}

func (m *mockConversationRepository) GetWithMessages(ctx context.Context, id uint, limit, offset int) (*models.Conversation, error) {
	if m.shouldFail {
		return nil, errors.New("repository error")
	}
	conv, exists := m.conversations[id]
	if !exists {
		return nil, nil
	}
	return conv, nil
}

// Simplified tests that don't try to capture WebSocket sends
func TestMessageService_GetConversationHistory(t *testing.T) {
	tests := []struct {
		name        string
		setupMocks  func(*mockMessageRepository, *mockConversationRepository)
		convID      uint
		userID      uint
		limit       int
		offset      int
		wantCount   int
		wantErr     bool
		errContains string
	}{
		{
			name: "successful retrieval",
			setupMocks: func(msgRepo *mockMessageRepository, convRepo *mockConversationRepository) {
				convRepo.conversations[1] = &models.Conversation{
					ID:       1,
					PosterID: 10,
					TaskerID: 20,
				}
				msgRepo.conversationMsgs[1] = []models.Message{
					{ID: 1, ConversationID: 1, Content: "Message 1"},
					{ID: 2, ConversationID: 1, Content: "Message 2"},
					{ID: 3, ConversationID: 1, Content: "Message 3"},
				}
			},
			convID:    1,
			userID:    10,
			limit:     10,
			offset:    0,
			wantCount: 3,
			wantErr:   false,
		},
		{
			name: "pagination",
			setupMocks: func(msgRepo *mockMessageRepository, convRepo *mockConversationRepository) {
				convRepo.conversations[1] = &models.Conversation{
					ID:       1,
					PosterID: 10,
					TaskerID: 20,
				}
				msgs := make([]models.Message, 10)
				for i := 0; i < 10; i++ {
					msgs[i] = models.Message{ID: uint(i + 1), ConversationID: 1}
				}
				msgRepo.conversationMsgs[1] = msgs
			},
			convID:    1,
			userID:    10,
			limit:     5,
			offset:    2,
			wantCount: 5,
			wantErr:   false,
		},
		{
			name:        "conversation not found",
			setupMocks:  func(msgRepo *mockMessageRepository, convRepo *mockConversationRepository) {},
			convID:      999,
			userID:      10,
			limit:       10,
			offset:      0,
			wantErr:     true,
			errContains: "conversation not found",
		},
		{
			name: "unauthorized user",
			setupMocks: func(msgRepo *mockMessageRepository, convRepo *mockConversationRepository) {
				convRepo.conversations[1] = &models.Conversation{
					ID:       1,
					PosterID: 10,
					TaskerID: 20,
				}
			},
			convID:      1,
			userID:      99,
			limit:       10,
			offset:      0,
			wantErr:     true,
			errContains: "not authorized",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			msgRepo := newMockMessageRepository()
			convRepo := newMockConversationRepository()

			if tt.setupMocks != nil {
				tt.setupMocks(msgRepo, convRepo)
			}

			service := NewMessageService(msgRepo, convRepo, nil)

			messages, err := service.GetConversationHistory(context.Background(), tt.convID, tt.userID, tt.limit, tt.offset)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error containing '%s', got nil", tt.errContains)
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if len(messages) != tt.wantCount {
					t.Errorf("Expected %d messages, got %d", tt.wantCount, len(messages))
				}
			}
		})
	}
}

func TestMessageService_CreateConversation(t *testing.T) {
	tests := []struct {
		name        string
		setupMocks  func(*mockConversationRepository)
		taskID      uint
		posterID    uint
		taskerID    uint
		wantNew     bool
		wantErr     bool
		errContains string
	}{
		{
			name:       "create new conversation",
			setupMocks: func(convRepo *mockConversationRepository) {},
			taskID:     1,
			posterID:   10,
			taskerID:   20,
			wantNew:    true,
			wantErr:    false,
		},
		{
			name: "return existing conversation",
			setupMocks: func(convRepo *mockConversationRepository) {
				convRepo.taskConversations[1] = &models.Conversation{
					ID:       5,
					TaskID:   1,
					PosterID: 10,
					TaskerID: 20,
				}
			},
			taskID:   1,
			posterID: 10,
			taskerID: 20,
			wantNew:  false,
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			msgRepo := newMockMessageRepository()
			convRepo := newMockConversationRepository()

			if tt.setupMocks != nil {
				tt.setupMocks(convRepo)
			}

			service := NewMessageService(msgRepo, convRepo, nil)

			conv, err := service.CreateConversation(context.Background(), tt.taskID, tt.posterID, tt.taskerID)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error containing '%s', got nil", tt.errContains)
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if conv == nil {
					t.Error("Expected conversation to be returned")
				}
				if tt.wantNew && conv.ID != 1 {
					t.Errorf("Expected new conversation with ID 1, got %d", conv.ID)
				}
				if !tt.wantNew && conv.ID != 5 {
					t.Errorf("Expected existing conversation with ID 5, got %d", conv.ID)
				}
			}
		})
	}
}

func TestMessageService_GetUserConversations(t *testing.T) {
	tests := []struct {
		name        string
		setupMocks  func(*mockConversationRepository)
		userID      uint
		wantCount   int
		wantErr     bool
		errContains string
	}{
		{
			name: "user has conversations",
			setupMocks: func(convRepo *mockConversationRepository) {
				convRepo.userConversations[10] = []models.Conversation{
					{ID: 1, PosterID: 10, TaskerID: 20},
					{ID: 2, PosterID: 10, TaskerID: 30},
				}
			},
			userID:    10,
			wantCount: 2,
			wantErr:   false,
		},
		{
			name:       "user has no conversations",
			setupMocks: func(convRepo *mockConversationRepository) {},
			userID:     10,
			wantCount:  0,
			wantErr:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			msgRepo := newMockMessageRepository()
			convRepo := newMockConversationRepository()

			if tt.setupMocks != nil {
				tt.setupMocks(convRepo)
			}

			service := NewMessageService(msgRepo, convRepo, nil)

			convs, err := service.GetUserConversations(context.Background(), tt.userID)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error containing '%s', got nil", tt.errContains)
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if len(convs) != tt.wantCount {
					t.Errorf("Expected %d conversations, got %d", tt.wantCount, len(convs))
				}
			}
		})
	}
}

// Note: WebSocket HandleMessage tests are skipped because they require complex mocking
// of the websocket.Client and websocket.Hub which have private channels. These methods
// are better tested via integration tests.
