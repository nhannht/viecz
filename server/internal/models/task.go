package models

import (
	"fmt"
	"time"

	"gorm.io/gorm"
)

// TaskStatus represents the status of a task
type TaskStatus string

const (
	TaskStatusOpen       TaskStatus = "open"
	TaskStatusInProgress TaskStatus = "in_progress"
	TaskStatusCompleted  TaskStatus = "completed"
	TaskStatusCancelled  TaskStatus = "cancelled"
)

// Task represents a task in the system
type Task struct {
	ID                int64      `gorm:"primaryKey;autoIncrement" json:"id"`
	RequesterID       int64      `gorm:"not null;index" json:"requester_id"`
	TaskerID          *int64     `gorm:"index" json:"tasker_id,omitempty"`
	CategoryID        int64      `gorm:"not null;index" json:"category_id"`
	Title             string     `gorm:"size:200;not null" json:"title"`
	Description       string     `gorm:"type:text;not null" json:"description"`
	Price             int64      `gorm:"not null" json:"price"`
	Location          string     `gorm:"size:255;not null" json:"location"`
	Latitude          *float64   `gorm:"type:decimal(10,8)" json:"latitude,omitempty"`
	Longitude         *float64   `gorm:"type:decimal(11,8)" json:"longitude,omitempty"`
	Status            TaskStatus `gorm:"type:varchar(20);default:'open';index" json:"status"`
	Deadline          *time.Time `gorm:"column:deadline" json:"deadline,omitempty"`
	CompletedAt       *time.Time `json:"completed_at,omitempty"`
	ImageURLs         []string   `gorm:"type:text[]" json:"image_urls,omitempty"`
	RequesterRatingID *int64     `json:"requester_rating_id,omitempty"`
	TaskerRatingID    *int64     `json:"tasker_rating_id,omitempty"`
	CreatedAt         time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt         time.Time  `gorm:"autoUpdateTime" json:"updated_at"`

	// Associations
	Requester User     `gorm:"foreignKey:RequesterID" json:"-"`
	Tasker    *User    `gorm:"foreignKey:TaskerID" json:"-"`
	Category  Category `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
}

// Validate validates the task model
func (t *Task) Validate() error {
	if t.RequesterID == 0 {
		return fmt.Errorf("requester_id is required")
	}

	if t.CategoryID == 0 {
		return fmt.Errorf("category_id is required")
	}

	if t.Title == "" {
		return fmt.Errorf("title is required")
	}

	if len(t.Title) > 200 {
		return fmt.Errorf("title must be less than 200 characters")
	}

	if t.Description == "" {
		return fmt.Errorf("description is required")
	}

	if len(t.Description) > 2000 {
		return fmt.Errorf("description must be less than 2000 characters")
	}

	if t.Price <= 0 {
		return fmt.Errorf("price must be greater than 0")
	}

	if t.Location == "" {
		return fmt.Errorf("location is required")
	}

	if len(t.Location) > 255 {
		return fmt.Errorf("location must be less than 255 characters")
	}

	validStatuses := map[TaskStatus]bool{
		TaskStatusOpen:       true,
		TaskStatusInProgress: true,
		TaskStatusCompleted:  true,
		TaskStatusCancelled:  true,
	}
	if !validStatuses[t.Status] {
		return fmt.Errorf("invalid status: %s", t.Status)
	}

	if len(t.ImageURLs) > 5 {
		return fmt.Errorf("cannot have more than 5 images")
	}

	return nil
}

// BeforeCreate hook is called before creating a task
func (t *Task) BeforeCreate(tx *gorm.DB) error {
	return t.Validate()
}

// BeforeUpdate hook is called before updating a task
func (t *Task) BeforeUpdate(tx *gorm.DB) error {
	return t.Validate()
}

// IsOverdue returns true if the task has a deadline that has passed.
func (t *Task) IsOverdue() bool {
	return t.Deadline != nil && time.Now().After(*t.Deadline)
}
