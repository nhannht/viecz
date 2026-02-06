package models

import (
	"time"

	"gorm.io/gorm"
)

// Conversation represents a chat conversation between users about a task
type Conversation struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Task this conversation is about
	TaskID uint  `gorm:"not null;index" json:"task_id"`
	Task   *Task `gorm:"constraint:OnDelete:CASCADE" json:"task,omitempty"`

	// Users participating in the conversation
	// For task conversations: poster and accepted tasker
	PosterID uint  `gorm:"not null;index" json:"poster_id"`
	Poster   *User `gorm:"foreignKey:PosterID" json:"poster,omitempty"`

	TaskerID uint  `gorm:"not null;index" json:"tasker_id"`
	Tasker   *User `gorm:"foreignKey:TaskerID" json:"tasker,omitempty"`

	// Last message info for conversation list
	LastMessageAt *time.Time `json:"last_message_at"`
	LastMessage   string     `gorm:"type:text" json:"last_message"`

	// Messages in this conversation
	Messages []Message `gorm:"foreignKey:ConversationID" json:"messages,omitempty"`
}

// TableName specifies the table name for Conversation
func (Conversation) TableName() string {
	return "conversations"
}
