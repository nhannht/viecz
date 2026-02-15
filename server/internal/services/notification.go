package services

import (
	"context"
	"fmt"
	"log"

	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
	"viecz.vieczserver/internal/websocket"
)

// NotificationService handles notification business logic
type NotificationService struct {
	notificationRepo repository.NotificationRepository
	hub              *websocket.Hub
}

// NewNotificationService creates a new NotificationService
func NewNotificationService(
	notificationRepo repository.NotificationRepository,
	hub *websocket.Hub,
) *NotificationService {
	return &NotificationService{
		notificationRepo: notificationRepo,
		hub:              hub,
	}
}

// CreateNotification creates a notification, saves it to DB, and sends via WebSocket if user is online
func (s *NotificationService) CreateNotification(ctx context.Context, userID int64, notifType models.NotificationType, title, message string, taskID *int64) error {
	notification := &models.Notification{
		UserID:  userID,
		Type:    notifType,
		Title:   title,
		Message: message,
		TaskID:  taskID,
	}

	if err := s.notificationRepo.Create(ctx, notification); err != nil {
		return fmt.Errorf("failed to create notification: %w", err)
	}

	// Send via WebSocket if user is online
	if s.hub != nil && userID > 0 && s.hub.IsUserOnline(uint(userID)) {
		wsMsg := &models.WebSocketMessage{
			Type:    "notification",
			Content: message,
		}
		s.hub.SendToUser(uint(userID), wsMsg)
		log.Printf("[NotificationService] sent real-time notification to user %d: %s", userID, title)
	}

	return nil
}

// GetNotifications retrieves paginated notifications for a user
func (s *NotificationService) GetNotifications(ctx context.Context, userID int64, limit, offset int) ([]*models.Notification, int64, error) {
	return s.notificationRepo.GetByUserID(ctx, userID, limit, offset)
}

// GetUnreadCount returns the number of unread notifications for a user
func (s *NotificationService) GetUnreadCount(ctx context.Context, userID int64) (int64, error) {
	return s.notificationRepo.GetUnreadCountByUserID(ctx, userID)
}

// MarkAsRead marks a single notification as read
func (s *NotificationService) MarkAsRead(ctx context.Context, id, userID int64) error {
	return s.notificationRepo.MarkAsRead(ctx, id, userID)
}

// MarkAllAsRead marks all notifications as read for a user
func (s *NotificationService) MarkAllAsRead(ctx context.Context, userID int64) error {
	return s.notificationRepo.MarkAllAsReadByUserID(ctx, userID)
}

// DeleteNotification deletes a notification
func (s *NotificationService) DeleteNotification(ctx context.Context, id, userID int64) error {
	return s.notificationRepo.Delete(ctx, id, userID)
}
