package repository

import (
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
	"viecz.vieczserver/internal/models"
)

type otpGormRepository struct {
	db *gorm.DB
}

// NewOTPGormRepository creates a new GORM-based OTPRepository.
func NewOTPGormRepository(db *gorm.DB) OTPRepository {
	return &otpGormRepository{db: db}
}

var _ OTPRepository = (*otpGormRepository)(nil)

func (r *otpGormRepository) Create(ctx context.Context, otp *models.EmailOTP) error {
	if err := r.db.WithContext(ctx).Create(otp).Error; err != nil {
		return fmt.Errorf("failed to create OTP: %w", err)
	}
	return nil
}

func (r *otpGormRepository) GetLatestValid(ctx context.Context, email string) (*models.EmailOTP, error) {
	var otp models.EmailOTP
	err := r.db.WithContext(ctx).
		Where("email = ? AND used_at IS NULL AND expires_at > ?", email, time.Now()).
		Order("created_at DESC").
		First(&otp).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("no valid OTP found")
		}
		return nil, fmt.Errorf("failed to get OTP: %w", err)
	}
	return &otp, nil
}

func (r *otpGormRepository) IncrementAttempts(ctx context.Context, otpID int64) error {
	result := r.db.WithContext(ctx).Model(&models.EmailOTP{}).
		Where("id = ?", otpID).
		UpdateColumn("attempts", gorm.Expr("attempts + ?", 1))
	if result.Error != nil {
		return fmt.Errorf("failed to increment OTP attempts: %w", result.Error)
	}
	return nil
}

func (r *otpGormRepository) MarkUsed(ctx context.Context, otpID int64) error {
	now := time.Now()
	result := r.db.WithContext(ctx).Model(&models.EmailOTP{}).
		Where("id = ?", otpID).
		UpdateColumn("used_at", now)
	if result.Error != nil {
		return fmt.Errorf("failed to mark OTP as used: %w", result.Error)
	}
	return nil
}

func (r *otpGormRepository) InvalidateAllForEmail(ctx context.Context, email string) error {
	now := time.Now()
	result := r.db.WithContext(ctx).Model(&models.EmailOTP{}).
		Where("email = ? AND used_at IS NULL AND expires_at > ?", email, time.Now()).
		UpdateColumn("used_at", now)
	if result.Error != nil {
		return fmt.Errorf("failed to invalidate OTPs: %w", result.Error)
	}
	return nil
}

func (r *otpGormRepository) CountRecentByEmail(ctx context.Context, email string, window time.Duration) (int64, error) {
	var count int64
	since := time.Now().Add(-window)
	err := r.db.WithContext(ctx).Model(&models.EmailOTP{}).
		Where("email = ? AND created_at > ?", email, since).
		Count(&count).Error
	if err != nil {
		return 0, fmt.Errorf("failed to count recent OTPs: %w", err)
	}
	return count, nil
}

func (r *otpGormRepository) GetLastCreatedAt(ctx context.Context, email string) (*time.Time, error) {
	var otp models.EmailOTP
	err := r.db.WithContext(ctx).
		Where("email = ?", email).
		Order("created_at DESC").
		First(&otp).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get last OTP: %w", err)
	}
	return &otp.CreatedAt, nil
}

func (r *otpGormRepository) DeleteExpired(ctx context.Context) error {
	result := r.db.WithContext(ctx).
		Where("expires_at < ?", time.Now()).
		Delete(&models.EmailOTP{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete expired OTPs: %w", result.Error)
	}
	return nil
}
