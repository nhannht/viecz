package repository

import (
	"context"

	"viecz.vieczserver/internal/models"
)

// MessageRepository defines the interface for message data access
type MessageRepository interface {
	Create(ctx context.Context, message *models.Message) error
	GetByID(ctx context.Context, id uint) (*models.Message, error)
	GetByConversation(ctx context.Context, conversationID uint, limit, offset int) ([]models.Message, error)
	MarkAsRead(ctx context.Context, messageID uint) error
	MarkConversationAsRead(ctx context.Context, conversationID, userID uint) error
	GetUnreadCount(ctx context.Context, conversationID, userID uint) (int64, error)
	Delete(ctx context.Context, id uint) error
}
