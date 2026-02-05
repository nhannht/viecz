package models

import (
	"fmt"
	"regexp"
	"time"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

// User represents a user in the system
type User struct {
	ID                  int64     `gorm:"primaryKey;autoIncrement" json:"id"`
	Email               string    `gorm:"unique;size:255;not null" json:"email"`
	PasswordHash        string    `gorm:"size:255;not null" json:"-"` // Never expose password hash in JSON
	Name                string    `gorm:"size:100;not null" json:"name"`
	AvatarURL           *string   `gorm:"type:text" json:"avatar_url,omitempty"`
	Phone               *string   `gorm:"size:20" json:"phone,omitempty"`
	University          string    `gorm:"size:255;not null;default:'ĐHQG-HCM'" json:"university"`
	StudentID           *string   `gorm:"size:50" json:"student_id,omitempty"`
	IsVerified          bool      `gorm:"default:false" json:"is_verified"`
	Rating              float64   `gorm:"type:decimal(3,2);default:0" json:"rating"`
	TotalTasksCompleted int       `gorm:"default:0" json:"total_tasks_completed"`
	TotalTasksPosted    int       `gorm:"default:0" json:"total_tasks_posted"`
	TotalEarnings       int64     `gorm:"default:0" json:"total_earnings"`
	IsTasker            bool           `gorm:"default:false" json:"is_tasker"`
	TaskerBio           *string        `gorm:"size:500" json:"tasker_bio,omitempty"`
	TaskerSkills        pq.StringArray `gorm:"type:text[]" json:"tasker_skills,omitempty"`
	CreatedAt           time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt           time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

// Validate validates the user model
func (u *User) Validate() error {
	if u.Email == "" {
		return fmt.Errorf("email is required")
	}

	if !emailRegex.MatchString(u.Email) {
		return fmt.Errorf("invalid email format")
	}

	if u.Name == "" {
		return fmt.Errorf("name is required")
	}

	if len(u.Name) > 100 {
		return fmt.Errorf("name must be less than 100 characters")
	}

	if u.PasswordHash == "" {
		return fmt.Errorf("password hash is required")
	}

	if u.Rating < 0 || u.Rating > 5 {
		return fmt.Errorf("rating must be between 0 and 5")
	}

	if u.TotalTasksCompleted < 0 {
		return fmt.Errorf("total tasks completed cannot be negative")
	}

	if u.TotalTasksPosted < 0 {
		return fmt.Errorf("total tasks posted cannot be negative")
	}

	if u.TotalEarnings < 0 {
		return fmt.Errorf("total earnings cannot be negative")
	}

	if u.IsTasker {
		if u.TaskerBio != nil && len(*u.TaskerBio) > 500 {
			return fmt.Errorf("tasker bio must be less than 500 characters")
		}

		if len(u.TaskerSkills) > 10 {
			return fmt.Errorf("tasker skills cannot exceed 10 items")
		}
	}

	return nil
}

// IsValidEmail checks if the email format is valid
func IsValidEmail(email string) bool {
	return emailRegex.MatchString(email)
}

// IsStrongPassword checks if the password meets strength requirements
// Minimum 8 characters, at least one uppercase, one lowercase, and one number
func IsStrongPassword(password string) bool {
	if len(password) < 8 {
		return false
	}

	var (
		hasUpper bool
		hasLower bool
		hasDigit bool
	)

	for _, char := range password {
		switch {
		case char >= 'A' && char <= 'Z':
			hasUpper = true
		case char >= 'a' && char <= 'z':
			hasLower = true
		case char >= '0' && char <= '9':
			hasDigit = true
		}
	}

	return hasUpper && hasLower && hasDigit
}

// BeforeCreate hook is called before creating a user
func (u *User) BeforeCreate(tx *gorm.DB) error {
	return u.Validate()
}

// BeforeUpdate hook is called before updating a user
func (u *User) BeforeUpdate(tx *gorm.DB) error {
	return u.Validate()
}
