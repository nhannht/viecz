package models

import (
	"fmt"
	"time"

	"gorm.io/gorm"
)

// ApplicationStatus represents the status of a task application
type ApplicationStatus string

const (
	ApplicationStatusPending  ApplicationStatus = "pending"
	ApplicationStatusAccepted ApplicationStatus = "accepted"
	ApplicationStatusRejected ApplicationStatus = "rejected"
)

// TaskApplication represents a tasker's application to a task
type TaskApplication struct {
	ID            int64             `gorm:"primaryKey;autoIncrement" json:"id"`
	TaskID        int64             `gorm:"not null;index" json:"task_id"`
	TaskerID      int64             `gorm:"not null;index" json:"tasker_id"`
	ProposedPrice *int64            `json:"proposed_price,omitempty"`
	Message       *string           `gorm:"size:500" json:"message,omitempty"`
	Status        ApplicationStatus `gorm:"type:varchar(20);default:'pending';index" json:"status"`
	CreatedAt     time.Time         `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time         `gorm:"autoUpdateTime" json:"updated_at"`

	// Associations
	Task   Task  `gorm:"foreignKey:TaskID" json:"-"`
	Tasker *User `gorm:"foreignKey:TaskerID" json:"tasker,omitempty"`
}

// Validate validates the task application model
func (ta *TaskApplication) Validate() error {
	if ta.TaskID == 0 {
		return fmt.Errorf("task_id is required")
	}

	if ta.TaskerID == 0 {
		return fmt.Errorf("tasker_id is required")
	}

	if ta.ProposedPrice != nil && *ta.ProposedPrice <= 0 {
		return fmt.Errorf("proposed_price must be greater than 0")
	}

	if ta.Message != nil && len(*ta.Message) > 500 {
		return fmt.Errorf("message must be less than 500 characters")
	}

	validStatuses := map[ApplicationStatus]bool{
		ApplicationStatusPending:  true,
		ApplicationStatusAccepted: true,
		ApplicationStatusRejected: true,
	}
	if !validStatuses[ta.Status] {
		return fmt.Errorf("invalid status: %s", ta.Status)
	}

	return nil
}

// BeforeCreate hook is called before creating a task application
func (ta *TaskApplication) BeforeCreate(tx *gorm.DB) error {
	return ta.Validate()
}

// BeforeUpdate hook is called before updating a task application
func (ta *TaskApplication) BeforeUpdate(tx *gorm.DB) error {
	return ta.Validate()
}
