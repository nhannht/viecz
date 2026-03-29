package repository

import (
	"context"
	"time"

	"viecz.vieczserver/internal/models"
)

// OTPRepository defines the interface for OTP data operations.
type OTPRepository interface {
	Create(ctx context.Context, otp *models.EmailOTP) error
	GetLatestValid(ctx context.Context, email string) (*models.EmailOTP, error)
	IncrementAttempts(ctx context.Context, otpID int64) error
	MarkUsed(ctx context.Context, otpID int64) error
	InvalidateAllForEmail(ctx context.Context, email string) error
	CountRecentByEmail(ctx context.Context, email string, window time.Duration) (int64, error)
	GetLastCreatedAt(ctx context.Context, email string) (*time.Time, error)
	DeleteExpired(ctx context.Context) error
}
