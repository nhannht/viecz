package repository

import (
	"context"
	"fmt"

	"gorm.io/gorm"
	"viecz.vieczserver/internal/models"
)

type notificationGormRepository struct {
	db *gorm.DB
}

// NewNotificationGormRepository creates a new GORM-based NotificationRepository
func NewNotificationGormRepository(db *gorm.DB) NotificationRepository {
	return &notificationGormRepository{db: db}
}

// Verify interface compliance
var _ NotificationRepository = (*notificationGormRepository)(nil)

func (r *notificationGormRepository) Create(ctx context.Context, notification *models.Notification) error {
	if err := r.db.WithContext(ctx).Create(notification).Error; err != nil {
		return fmt.Errorf("failed to create notification: %w", err)
	}
	return nil
}

func (r *notificationGormRepository) GetByUserID(ctx context.Context, userID int64, limit, offset int) ([]*models.Notification, int64, error) {
	var notifications []*models.Notification
	var total int64

	query := r.db.WithContext(ctx).Model(&models.Notification{}).Where("user_id = ?", userID)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count notifications: %w", err)
	}

	if limit <= 0 {
		limit = 20
	}

	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&notifications).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to get notifications: %w", err)
	}

	return notifications, total, nil
}

func (r *notificationGormRepository) GetUnreadCountByUserID(ctx context.Context, userID int64) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Count(&count).Error; err != nil {
		return 0, fmt.Errorf("failed to count unread notifications: %w", err)
	}
	return count, nil
}

func (r *notificationGormRepository) MarkAsRead(ctx context.Context, id, userID int64) error {
	result := r.db.WithContext(ctx).Model(&models.Notification{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("is_read", true)
	if result.Error != nil {
		return fmt.Errorf("failed to mark notification as read: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("notification not found")
	}
	return nil
}

func (r *notificationGormRepository) MarkAllAsReadByUserID(ctx context.Context, userID int64) error {
	if err := r.db.WithContext(ctx).Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Update("is_read", true).Error; err != nil {
		return fmt.Errorf("failed to mark all notifications as read: %w", err)
	}
	return nil
}

func (r *notificationGormRepository) Delete(ctx context.Context, id, userID int64) error {
	result := r.db.WithContext(ctx).
		Where("id = ? AND user_id = ?", id, userID).
		Delete(&models.Notification{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete notification: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("notification not found")
	}
	return nil
}
