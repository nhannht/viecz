package models

import (
	"time"
)

// NotificationType represents the type of notification
type NotificationType string

const (
	NotificationTypeTaskCreated         NotificationType = "task_created"
	NotificationTypeApplicationReceived NotificationType = "application_received"
	NotificationTypeApplicationSent     NotificationType = "application_sent"
	NotificationTypeApplicationAccepted NotificationType = "application_accepted"
	NotificationTypeTaskCompleted       NotificationType = "task_completed"
	NotificationTypePaymentReceived     NotificationType = "payment_received"
)

// Notification represents a notification for a user
type Notification struct {
	ID        int64            `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    int64            `gorm:"index;not null" json:"user_id"`
	Type      NotificationType `gorm:"type:varchar(50);not null" json:"type"`
	Title     string           `gorm:"type:varchar(255);not null" json:"title"`
	Message   string           `gorm:"type:text;not null" json:"message"`
	TaskID    *int64           `gorm:"index" json:"task_id,omitempty"`
	IsRead    bool             `gorm:"default:false" json:"is_read"`
	CreatedAt time.Time        `gorm:"autoCreateTime" json:"created_at"`
	User      User             `gorm:"foreignKey:UserID" json:"-"`
}
