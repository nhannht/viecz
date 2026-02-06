package models

import (
	"time"

	"gorm.io/gorm"
)

// Message represents a chat message in a conversation
type Message struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Conversation this message belongs to
	ConversationID uint          `gorm:"not null;index" json:"conversation_id"`
	Conversation   *Conversation `gorm:"constraint:OnDelete:CASCADE" json:"conversation,omitempty"`

	// Sender of the message
	SenderID uint  `gorm:"not null;index" json:"sender_id"`
	Sender   *User `gorm:"foreignKey:SenderID" json:"sender,omitempty"`

	// Message content
	Content string `gorm:"type:text;not null" json:"content"`

	// Read status
	IsRead bool `gorm:"default:false" json:"is_read"`
	ReadAt *time.Time `json:"read_at,omitempty"`
}

// TableName specifies the table name for Message
func (Message) TableName() string {
	return "messages"
}

// WebSocketMessage represents a message sent over WebSocket
type WebSocketMessage struct {
	Type           string    `json:"type"` // "message", "typing", "read", "error"
	ConversationID uint      `json:"conversation_id"`
	MessageID      uint      `json:"message_id,omitempty"`
	SenderID       uint      `json:"sender_id"`
	Content        string    `json:"content"`
	CreatedAt      time.Time `json:"created_at"`
	Error          string    `json:"error,omitempty"`
}
