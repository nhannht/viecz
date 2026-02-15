package repository

import (
	"context"

	"viecz.vieczserver/internal/models"
)

// NotificationRepository defines the interface for notification data operations
type NotificationRepository interface {
	Create(ctx context.Context, notification *models.Notification) error
	GetByUserID(ctx context.Context, userID int64, limit, offset int) ([]*models.Notification, int64, error)
	GetUnreadCountByUserID(ctx context.Context, userID int64) (int64, error)
	MarkAsRead(ctx context.Context, id, userID int64) error
	MarkAllAsReadByUserID(ctx context.Context, userID int64) error
	Delete(ctx context.Context, id, userID int64) error
}
