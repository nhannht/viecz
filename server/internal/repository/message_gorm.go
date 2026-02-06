package repository

import (
	"context"
	"errors"
	"time"

	"viecz.vieczserver/internal/models"
	"gorm.io/gorm"
)

type messageGormRepo struct {
	db *gorm.DB
}

// NewMessageGormRepository creates a new GORM-based message repository
func NewMessageGormRepository(db *gorm.DB) MessageRepository {
	return &messageGormRepo{db: db}
}

func (r *messageGormRepo) Create(ctx context.Context, message *models.Message) error {
	return r.db.WithContext(ctx).Create(message).Error
}

func (r *messageGormRepo) GetByID(ctx context.Context, id uint) (*models.Message, error) {
	var message models.Message
	err := r.db.WithContext(ctx).
		Preload("Sender").
		Preload("Conversation").
		First(&message, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &message, nil
}

func (r *messageGormRepo) GetByConversation(ctx context.Context, conversationID uint, limit, offset int) ([]models.Message, error) {
	var messages []models.Message
	err := r.db.WithContext(ctx).
		Preload("Sender").
		Where("conversation_id = ?", conversationID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&messages).Error
	if err != nil {
		return nil, err
	}
	return messages, nil
}

func (r *messageGormRepo) MarkAsRead(ctx context.Context, messageID uint) error {
	now := time.Now()
	return r.db.WithContext(ctx).
		Model(&models.Message{}).
		Where("id = ?", messageID).
		Updates(map[string]interface{}{
			"is_read": true,
			"read_at": now,
		}).Error
}

func (r *messageGormRepo) MarkConversationAsRead(ctx context.Context, conversationID, userID uint) error {
	now := time.Now()
	return r.db.WithContext(ctx).
		Model(&models.Message{}).
		Where("conversation_id = ? AND sender_id != ? AND is_read = ?", conversationID, userID, false).
		Updates(map[string]interface{}{
			"is_read": true,
			"read_at": now,
		}).Error
}

func (r *messageGormRepo) GetUnreadCount(ctx context.Context, conversationID, userID uint) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.Message{}).
		Where("conversation_id = ? AND sender_id != ? AND is_read = ?", conversationID, userID, false).
		Count(&count).Error
	return count, err
}

func (r *messageGormRepo) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&models.Message{}, id).Error
}
