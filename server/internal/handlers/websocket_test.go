package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/services"
)

// mockConversationRepo implements repository.ConversationRepository for testing
type mockConversationRepo struct {
	conversations map[uint]*models.Conversation
}

func newMockConversationRepo() *mockConversationRepo {
	return &mockConversationRepo{conversations: make(map[uint]*models.Conversation)}
}

func (m *mockConversationRepo) Create(_ context.Context, conv *models.Conversation) error {
	conv.ID = uint(len(m.conversations) + 1)
	m.conversations[conv.ID] = conv
	return nil
}
func (m *mockConversationRepo) GetByID(_ context.Context, id uint) (*models.Conversation, error) {
	return m.conversations[id], nil
}
func (m *mockConversationRepo) GetByTask(_ context.Context, _ uint) (*models.Conversation, error) {
	return nil, nil
}
func (m *mockConversationRepo) GetByUser(_ context.Context, _ uint) ([]models.Conversation, error) {
	return []models.Conversation{}, nil
}
func (m *mockConversationRepo) GetWithMessages(_ context.Context, _ uint, _, _ int) (*models.Conversation, error) {
	return nil, nil
}
func (m *mockConversationRepo) Update(_ context.Context, _ *models.Conversation) error { return nil }
func (m *mockConversationRepo) Delete(_ context.Context, _ uint) error                 { return nil }

// mockMessageRepo implements repository.MessageRepository for testing
type mockMessageRepo struct{}

func (m *mockMessageRepo) Create(_ context.Context, _ *models.Message) error { return nil }
func (m *mockMessageRepo) GetByID(_ context.Context, _ uint) (*models.Message, error) {
	return nil, nil
}
func (m *mockMessageRepo) GetByConversation(_ context.Context, _ uint, _, _ int) ([]models.Message, error) {
	return []models.Message{}, nil
}
func (m *mockMessageRepo) MarkAsRead(_ context.Context, _ uint) error                 { return nil }
func (m *mockMessageRepo) MarkConversationAsRead(_ context.Context, _, _ uint) error   { return nil }
func (m *mockMessageRepo) GetUnreadCount(_ context.Context, _, _ uint) (int64, error)  { return 0, nil }
func (m *mockMessageRepo) Delete(_ context.Context, _ uint) error                      { return nil }

func newTestMessageHandler() *MessageHandler {
	msgService := services.NewMessageService(&mockMessageRepo{}, newMockConversationRepo(), nil)
	return NewMessageHandler(msgService)
}

func TestMessageHandler_GetConversations_UserIDType(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		setupContext   func(*gin.Context)
		expectedStatus int
	}{
		{
			name: "int64 user_id does not panic",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "missing user_id returns 401",
			setupContext: func(c *gin.Context) {
				// Don't set user_id
			},
			expectedStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := newTestMessageHandler()

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("GET", "/api/v1/conversations", nil)
			tt.setupContext(c)

			// Should not panic from type assertion
			func() {
				defer func() {
					if r := recover(); r != nil {
						t.Fatalf("handler panicked: %v", r)
					}
				}()
				handler.GetConversations(c)
			}()

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}
		})
	}
}

func TestMessageHandler_CreateConversation_UserIDType(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		setupContext   func(*gin.Context)
		body           any
		expectedStatus int
	}{
		{
			name: "int64 user_id does not panic",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			body:           map[string]any{"task_id": 1, "tasker_id": 2},
			expectedStatus: http.StatusCreated,
		},
		{
			name: "missing user_id returns 401",
			setupContext: func(c *gin.Context) {
				// Don't set user_id
			},
			body:           map[string]any{"task_id": 1, "tasker_id": 2},
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "invalid body returns 400",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			body:           map[string]any{},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := newTestMessageHandler()

			bodyBytes, _ := json.Marshal(tt.body)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("POST", "/api/v1/conversations", bytes.NewReader(bodyBytes))
			c.Request.Header.Set("Content-Type", "application/json")
			tt.setupContext(c)

			// Should not panic from type assertion
			func() {
				defer func() {
					if r := recover(); r != nil {
						t.Fatalf("handler panicked: %v", r)
					}
				}()
				handler.CreateConversation(c)
			}()

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}
		})
	}
}

func TestMessageHandler_GetConversationMessages_UserIDType(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		setupContext   func(*gin.Context)
		conversationID string
		expectedStatus int
	}{
		{
			name: "int64 user_id does not panic",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			conversationID: "1",
			// 500 because conversation doesn't exist in mock - the key test is no panic
			expectedStatus: http.StatusInternalServerError,
		},
		{
			name: "missing user_id returns 401",
			setupContext: func(c *gin.Context) {
				// Don't set user_id
			},
			conversationID: "1",
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "invalid conversation ID returns 400",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			conversationID: "invalid",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := newTestMessageHandler()

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("GET", "/api/v1/conversations/"+tt.conversationID+"/messages", nil)
			c.Params = gin.Params{{Key: "id", Value: tt.conversationID}}
			tt.setupContext(c)

			// Should not panic from type assertion
			func() {
				defer func() {
					if r := recover(); r != nil {
						t.Fatalf("handler panicked: %v", r)
					}
				}()
				handler.GetConversationMessages(c)
			}()

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}
		})
	}
}
