package repository

import (
	"context"

	"viecz.vieczserver/internal/models"
)

// ConversationRepository defines the interface for conversation data access
type ConversationRepository interface {
	Create(ctx context.Context, conversation *models.Conversation) error
	GetByID(ctx context.Context, id uint) (*models.Conversation, error)
	GetByTask(ctx context.Context, taskID uint) (*models.Conversation, error)
	GetByUser(ctx context.Context, userID uint) ([]models.Conversation, error)
	GetWithMessages(ctx context.Context, id uint, limit, offset int) (*models.Conversation, error)
	Update(ctx context.Context, conversation *models.Conversation) error
	Delete(ctx context.Context, id uint) error
}
