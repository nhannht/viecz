package repository

import (
	"context"
	"errors"
	"time"

	"viecz.vieczserver/internal/models"
	"gorm.io/gorm"
)

// ConversationGormRepo is the GORM implementation of ConversationRepository
type ConversationGormRepo struct {
	db *gorm.DB
}

// NewConversationGormRepository creates a new GORM-based conversation repository
func NewConversationGormRepository(db *gorm.DB) ConversationRepository {
	return &ConversationGormRepo{db: db}
}

func (r *ConversationGormRepo) Create(ctx context.Context, conversation *models.Conversation) error {
	return r.db.WithContext(ctx).Create(conversation).Error
}

func (r *ConversationGormRepo) GetByID(ctx context.Context, id uint) (*models.Conversation, error) {
	var conversation models.Conversation
	err := r.db.WithContext(ctx).
		Preload("Poster").
		Preload("Tasker").
		Preload("Task").
		First(&conversation, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &conversation, nil
}

func (r *ConversationGormRepo) GetByTask(ctx context.Context, taskID uint) (*models.Conversation, error) {
	var conversation models.Conversation
	err := r.db.WithContext(ctx).
		Preload("Poster").
		Preload("Tasker").
		Preload("Task").
		Where("task_id = ?", taskID).
		First(&conversation).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &conversation, nil
}

func (r *ConversationGormRepo) GetByUser(ctx context.Context, userID uint) ([]models.Conversation, error) {
	var conversations []models.Conversation
	err := r.db.WithContext(ctx).
		Preload("Poster").
		Preload("Tasker").
		Preload("Task").
		Where("poster_id = ? OR tasker_id = ?", userID, userID).
		Order("last_message_at DESC NULLS LAST").
		Find(&conversations).Error
	if err != nil {
		return nil, err
	}
	return conversations, nil
}

func (r *ConversationGormRepo) GetWithMessages(ctx context.Context, id uint, limit, offset int) (*models.Conversation, error) {
	var conversation models.Conversation
	err := r.db.WithContext(ctx).
		Preload("Poster").
		Preload("Tasker").
		Preload("Task").
		Preload("Messages", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC").Limit(limit).Offset(offset).Preload("Sender")
		}).
		First(&conversation, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &conversation, nil
}

func (r *ConversationGormRepo) Update(ctx context.Context, conversation *models.Conversation) error {
	return r.db.WithContext(ctx).Save(conversation).Error
}

func (r *ConversationGormRepo) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&models.Conversation{}, id).Error
}

// UpdateLastMessage updates the last message info for a conversation
func (r *ConversationGormRepo) UpdateLastMessage(ctx context.Context, conversationID uint, content string) error {
	now := time.Now()
	return r.db.WithContext(ctx).
		Model(&models.Conversation{}).
		Where("id = ?", conversationID).
		Updates(map[string]interface{}{
			"last_message":    content,
			"last_message_at": now,
		}).Error
}
