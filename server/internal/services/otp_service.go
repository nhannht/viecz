package services

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"time"

	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
)

const (
	otpLength       = 6
	otpExpiry       = 10 * time.Minute
	otpMaxPerHour   = 5
	otpMinGap       = 1 * time.Minute
	otpMaxAttempts  = 5
)

var (
	ErrOTPRateLimited    = fmt.Errorf("too many OTP requests, please wait before trying again")
	ErrOTPTooSoon        = fmt.Errorf("please wait at least 1 minute before requesting a new code")
	ErrOTPInvalid        = fmt.Errorf("invalid or expired verification code")
	ErrOTPTooManyAttempts = fmt.Errorf("too many failed attempts, please request a new code")
)

// OTPService handles OTP generation, sending, and verification.
type OTPService struct {
	otpRepo      repository.OTPRepository
	emailService EmailService
}

// NewOTPService creates a new OTP service.
func NewOTPService(otpRepo repository.OTPRepository, emailService EmailService) *OTPService {
	return &OTPService{
		otpRepo:      otpRepo,
		emailService: emailService,
	}
}

// GenerateAndSend invalidates existing OTPs, generates a new 6-digit code, stores it, and sends it via email.
func (s *OTPService) GenerateAndSend(ctx context.Context, email string) (string, error) {
	// Rate limit: max 5 per hour
	count, err := s.otpRepo.CountRecentByEmail(ctx, email, time.Hour)
	if err != nil {
		return "", fmt.Errorf("failed to check rate limit: %w", err)
	}
	if count >= otpMaxPerHour {
		return "", ErrOTPRateLimited
	}

	// Rate limit: min 1 minute gap
	lastCreatedAt, err := s.otpRepo.GetLastCreatedAt(ctx, email)
	if err != nil {
		return "", fmt.Errorf("failed to check last OTP: %w", err)
	}
	if lastCreatedAt != nil && time.Since(*lastCreatedAt) < otpMinGap {
		return "", ErrOTPTooSoon
	}

	// Invalidate all existing valid OTPs for this email
	if err := s.otpRepo.InvalidateAllForEmail(ctx, email); err != nil {
		return "", fmt.Errorf("failed to invalidate old OTPs: %w", err)
	}

	// Generate cryptographically random 6-digit code
	code, err := generateOTPCode()
	if err != nil {
		return "", fmt.Errorf("failed to generate OTP code: %w", err)
	}

	// Store in DB
	otp := &models.EmailOTP{
		Email:       email,
		Code:        code,
		MaxAttempts: otpMaxAttempts,
		ExpiresAt:   time.Now().Add(otpExpiry),
	}
	if err := s.otpRepo.Create(ctx, otp); err != nil {
		return "", fmt.Errorf("failed to store OTP: %w", err)
	}

	// Send email
	if err := s.emailService.SendOTPEmail(email, code); err != nil {
		return "", fmt.Errorf("failed to send OTP email: %w", err)
	}

	return code, nil
}

// Verify checks the OTP code for the given email.
func (s *OTPService) Verify(ctx context.Context, email, code string) error {
	otp, err := s.otpRepo.GetLatestValid(ctx, email)
	if err != nil {
		return ErrOTPInvalid
	}

	// Check max attempts
	if otp.Attempts >= otp.MaxAttempts {
		return ErrOTPTooManyAttempts
	}

	// Compare codes
	if otp.Code != code {
		_ = s.otpRepo.IncrementAttempts(ctx, otp.ID)
		return ErrOTPInvalid
	}

	// Mark as used
	if err := s.otpRepo.MarkUsed(ctx, otp.ID); err != nil {
		return fmt.Errorf("failed to mark OTP as used: %w", err)
	}

	return nil
}

// generateOTPCode generates a cryptographically random 6-digit numeric string.
func generateOTPCode() (string, error) {
	max := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(otpLength)), nil)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%0*d", otpLength, n.Int64()), nil
}
