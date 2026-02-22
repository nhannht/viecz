package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
	"viecz.vieczserver/internal/websocket"
)

// MessageService handles message-related business logic
type MessageService struct {
	messageRepo      repository.MessageRepository
	conversationRepo repository.ConversationRepository
	hub              *websocket.Hub
}

// NewMessageService creates a new message service
func NewMessageService(
	messageRepo repository.MessageRepository,
	conversationRepo repository.ConversationRepository,
	hub *websocket.Hub,
) *MessageService {
	return &MessageService{
		messageRepo:      messageRepo,
		conversationRepo: conversationRepo,
		hub:              hub,
	}
}

// HandleMessage processes incoming WebSocket messages
func (s *MessageService) HandleMessage(client *websocket.Client, msg *models.WebSocketMessage) error {
	ctx := context.Background()

	switch msg.Type {
	case "message":
		return s.handleChatMessage(ctx, client, msg)
	case "typing":
		return s.handleTypingIndicator(ctx, client, msg)
	case "read":
		return s.handleReadReceipt(ctx, client, msg)
	case "join":
		return s.handleJoinConversation(ctx, client, msg)
	default:
		return fmt.Errorf("unknown message type: %s", msg.Type)
	}
}

func (s *MessageService) handleChatMessage(ctx context.Context, client *websocket.Client, msg *models.WebSocketMessage) error {
	// Validate conversation exists
	conversation, err := s.conversationRepo.GetByID(ctx, msg.ConversationID)
	if err != nil {
		return fmt.Errorf("failed to get conversation: %w", err)
	}
	if conversation == nil {
		return errors.New("conversation not found")
	}

	// Verify user is participant in the conversation
	if conversation.PosterID != client.UserID && conversation.TaskerID != client.UserID {
		return errors.New("user not authorized to send messages in this conversation")
	}

	// Create message in database
	message := &models.Message{
		ConversationID: msg.ConversationID,
		SenderID:       client.UserID,
		Content:        msg.Content,
	}

	if err := s.messageRepo.Create(ctx, message); err != nil {
		return fmt.Errorf("failed to create message: %w", err)
	}

	// Update conversation last message
	if convRepo, ok := s.conversationRepo.(*repository.ConversationGormRepo); ok {
		_ = convRepo.UpdateLastMessage(ctx, conversation.ID, msg.Content)
	}

	// Broadcast to conversation participants via WebSocket
	wsMessage := &models.WebSocketMessage{
		Type:           "message",
		ConversationID: conversation.ID,
		MessageID:      message.ID,
		SenderID:       client.UserID,
		Content:        message.Content,
		CreatedAt:      models.FlexTime{Time: message.CreatedAt},
	}

	s.hub.Broadcast <- &websocket.BroadcastMessage{
		ConversationID: conversation.ID,
		Message:        wsMessage,
		ExcludeUserID:  client.UserID,
	}

	// Send confirmation back to sender
	wsMessage.Type = "message_sent"
	client.Send(wsMessage)

	return nil
}

func (s *MessageService) handleTypingIndicator(ctx context.Context, client *websocket.Client, msg *models.WebSocketMessage) error {
	// Validate conversation exists
	conversation, err := s.conversationRepo.GetByID(ctx, msg.ConversationID)
	if err != nil {
		return fmt.Errorf("failed to get conversation: %w", err)
	}
	if conversation == nil {
		return errors.New("conversation not found")
	}

	// Verify user is participant
	if conversation.PosterID != client.UserID && conversation.TaskerID != client.UserID {
		return errors.New("user not authorized in this conversation")
	}

	// Broadcast typing indicator
	wsMessage := &models.WebSocketMessage{
		Type:           "typing",
		ConversationID: conversation.ID,
		SenderID:       client.UserID,
	}

	s.hub.Broadcast <- &websocket.BroadcastMessage{
		ConversationID: conversation.ID,
		Message:        wsMessage,
		ExcludeUserID:  client.UserID,
	}

	return nil
}

func (s *MessageService) handleReadReceipt(ctx context.Context, client *websocket.Client, msg *models.WebSocketMessage) error {
	// Mark all messages in conversation as read
	if err := s.messageRepo.MarkConversationAsRead(ctx, msg.ConversationID, client.UserID); err != nil {
		return fmt.Errorf("failed to mark messages as read: %w", err)
	}

	// Send confirmation
	wsMessage := &models.WebSocketMessage{
		Type:           "read_confirmed",
		ConversationID: msg.ConversationID,
		CreatedAt:      models.FlexTime{Time: time.Now()},
	}

	client.Send(wsMessage)

	return nil
}

func (s *MessageService) handleJoinConversation(ctx context.Context, client *websocket.Client, msg *models.WebSocketMessage) error {
	// Validate conversation exists
	conversation, err := s.conversationRepo.GetByID(ctx, msg.ConversationID)
	if err != nil {
		return fmt.Errorf("failed to get conversation: %w", err)
	}
	if conversation == nil {
		return errors.New("conversation not found")
	}

	// Verify user is participant
	if conversation.PosterID != client.UserID && conversation.TaskerID != client.UserID {
		return errors.New("user not authorized to join this conversation")
	}

	// Join conversation room in hub
	s.hub.JoinConversation(client, msg.ConversationID)

	// Send confirmation
	wsMessage := &models.WebSocketMessage{
		Type:           "joined",
		ConversationID: conversation.ID,
		CreatedAt:      models.FlexTime{Time: time.Now()},
	}

	client.Send(wsMessage)

	return nil
}

// GetConversationByID retrieves a single conversation with preloaded relations
func (s *MessageService) GetConversationByID(ctx context.Context, conversationID, userID uint) (*models.Conversation, error) {
	conversation, err := s.conversationRepo.GetByID(ctx, conversationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get conversation: %w", err)
	}
	if conversation == nil {
		return nil, errors.New("conversation not found")
	}

	if conversation.PosterID != userID && conversation.TaskerID != userID {
		return nil, errors.New("user not authorized to view this conversation")
	}

	return conversation, nil
}

// GetConversationHistory retrieves message history for a conversation
func (s *MessageService) GetConversationHistory(ctx context.Context, conversationID, userID uint, limit, offset int) ([]models.Message, error) {
	// Verify user is participant
	conversation, err := s.conversationRepo.GetByID(ctx, conversationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get conversation: %w", err)
	}
	if conversation == nil {
		return nil, errors.New("conversation not found")
	}

	if conversation.PosterID != userID && conversation.TaskerID != userID {
		return nil, errors.New("user not authorized to view this conversation")
	}

	// Get messages
	messages, err := s.messageRepo.GetByConversation(ctx, conversationID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get messages: %w", err)
	}

	return messages, nil
}

// CreateConversation creates a new conversation for a task
func (s *MessageService) CreateConversation(ctx context.Context, taskID, posterID, taskerID uint) (*models.Conversation, error) {
	// Check if conversation already exists
	existing, err := s.conversationRepo.GetByTask(ctx, taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing conversation: %w", err)
	}
	if existing != nil {
		return existing, nil
	}

	// Create new conversation
	conversation := &models.Conversation{
		TaskID:   taskID,
		PosterID: posterID,
		TaskerID: taskerID,
	}

	if err := s.conversationRepo.Create(ctx, conversation); err != nil {
		return nil, fmt.Errorf("failed to create conversation: %w", err)
	}

	return conversation, nil
}

// GetUserConversations retrieves all conversations for a user
func (s *MessageService) GetUserConversations(ctx context.Context, userID uint) ([]models.Conversation, error) {
	conversations, err := s.conversationRepo.GetByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get conversations: %w", err)
	}

	return conversations, nil
}
