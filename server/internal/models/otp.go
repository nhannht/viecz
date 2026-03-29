package models

import "time"

// EmailOTP stores one-time passcodes for passwordless email authentication.
type EmailOTP struct {
	ID          int64      `gorm:"primaryKey;autoIncrement" json:"id"`
	Email       string     `gorm:"size:255;not null;index:idx_email_otps_email_expires" json:"email"`
	Code        string     `gorm:"size:6;not null" json:"-"`
	Attempts    int        `gorm:"default:0" json:"attempts"`
	MaxAttempts int        `gorm:"default:5" json:"max_attempts"`
	ExpiresAt   time.Time  `gorm:"not null;index:idx_email_otps_email_expires" json:"expires_at"`
	UsedAt      *time.Time `json:"used_at,omitempty"`
	CreatedAt   time.Time  `gorm:"autoCreateTime" json:"created_at"`
}
