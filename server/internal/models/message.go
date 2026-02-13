package models

import (
	"encoding/json"
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
	Type           string   `json:"type"` // "message", "typing", "read", "error"
	ConversationID uint     `json:"conversation_id"`
	MessageID      uint     `json:"message_id,omitempty"`
	SenderID       uint     `json:"sender_id"`
	Content        string   `json:"content"`
	CreatedAt      FlexTime `json:"created_at"`
	Error          string   `json:"error,omitempty"`
}

// FlexTime wraps time.Time to gracefully handle empty strings during JSON unmarshal.
// Android WebSocket clients may send "created_at": "" for client-originated messages.
type FlexTime struct {
	time.Time
}

func (t *FlexTime) UnmarshalJSON(data []byte) error {
	s := string(data)
	// Handle empty string, null, or missing
	if s == `""` || s == "null" || s == "" {
		t.Time = time.Time{}
		return nil
	}
	var parsed time.Time
	if err := json.Unmarshal(data, &parsed); err != nil {
		// Silently accept unparseable time (e.g. from client messages)
		t.Time = time.Time{}
		return nil
	}
	t.Time = parsed
	return nil
}

func (t FlexTime) MarshalJSON() ([]byte, error) {
	if t.Time.IsZero() {
		return []byte("null"), nil
	}
	return json.Marshal(t.Time)
}
