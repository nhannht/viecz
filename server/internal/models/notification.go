package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// StringMap is a map[string]string that implements GORM's scanner/valuer for JSONB storage.
type StringMap map[string]string

func (m StringMap) Value() (driver.Value, error) {
	if m == nil {
		return nil, nil
	}
	return json.Marshal(m)
}

func (m *StringMap) Scan(src interface{}) error {
	if src == nil {
		*m = nil
		return nil
	}
	var source []byte
	switch v := src.(type) {
	case []byte:
		source = v
	case string:
		source = []byte(v)
	default:
		return fmt.Errorf("unsupported type for StringMap: %T", src)
	}
	return json.Unmarshal(source, m)
}

// NotificationType represents the type of notification
type NotificationType string

const (
	NotificationTypeTaskCreated         NotificationType = "task_created"
	NotificationTypeApplicationReceived NotificationType = "application_received"
	NotificationTypeApplicationSent     NotificationType = "application_sent"
	NotificationTypeApplicationAccepted NotificationType = "application_accepted"
	NotificationTypeTaskCompleted       NotificationType = "task_completed"
	NotificationTypePaymentReceived     NotificationType = "payment_received"
	NotificationTypeTaskCancelled       NotificationType = "task_cancelled"
)

// Notification represents a notification for a user
type Notification struct {
	ID        int64            `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    int64            `gorm:"index;not null" json:"user_id"`
	Type      NotificationType `gorm:"type:varchar(50);not null" json:"type"`
	Title     string           `gorm:"type:varchar(255);not null" json:"title"`
	Message   string           `gorm:"type:text;not null" json:"message"`
	Params    StringMap        `gorm:"type:jsonb" json:"params,omitempty"`
	TaskID    *int64           `gorm:"index" json:"task_id,omitempty"`
	IsRead    bool             `gorm:"default:false" json:"is_read"`
	CreatedAt time.Time        `gorm:"autoCreateTime" json:"created_at"`
	User      User             `gorm:"foreignKey:UserID" json:"-"`
}
