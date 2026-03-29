package auth

import (
	"context"
	"fmt"

	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
	"viecz.vieczserver/internal/services"
)

// Custom errors
var (
	ErrInvalidEmail             = fmt.Errorf("invalid email format")
	ErrEmailAlreadyExists       = fmt.Errorf("email already exists")
	ErrGoogleAuthFailed         = fmt.Errorf("google authentication failed")
	ErrEmailAlreadyUsedByEmail  = fmt.Errorf("email already registered with email/password")
	ErrEmailAlreadyUsedByGoogle = fmt.Errorf("email already registered with Google")
	ErrDisposableEmail          = fmt.Errorf("disposable email addresses are not allowed")
	ErrNoMXRecords              = fmt.Errorf("email domain does not have valid mail servers")
	ErrRoleAccount              = fmt.Errorf("role-based email addresses are not allowed")
	ErrEmailAlreadyVerified     = fmt.Errorf("email is already verified")
	ErrInvalidVerifyToken       = fmt.Errorf("invalid or expired verification token")
	ErrNameRequired             = fmt.Errorf("name is required for new users")
)

// AuthService handles authentication operations
type AuthService struct {
	userRepo      repository.UserRepository
	emailVerifier services.EmailVerifierService
	emailService  services.EmailService
	otpService    *services.OTPService
	jwtSecret     string
}

// NewAuthService creates a new authentication service
func NewAuthService(userRepo repository.UserRepository, emailVerifier services.EmailVerifierService, emailService services.EmailService, otpService *services.OTPService, jwtSecret string) *AuthService {
	return &AuthService{
		userRepo:      userRepo,
		emailVerifier: emailVerifier,
		emailService:  emailService,
		otpService:    otpService,
		jwtSecret:     jwtSecret,
	}
}

// RequestOTP validates the email and sends an OTP code.
// Returns isNewUser=true if no account exists for this email yet.
// The OTP code is returned for dev mode (when SMTP is not configured).
func (s *AuthService) RequestOTP(ctx context.Context, email string) (isNewUser bool, otpCode string, err error) {
	if !models.IsValidEmail(email) {
		return false, "", ErrInvalidEmail
	}

	// Validate email domain
	if err := s.emailVerifier.ValidateEmailDomain(email); err != nil {
		switch err {
		case services.ErrNoMXRecords:
			return false, "", ErrNoMXRecords
		case services.ErrDisposableEmail:
			return false, "", ErrDisposableEmail
		case services.ErrRoleAccount:
			return false, "", ErrRoleAccount
		default:
			return false, "", fmt.Errorf("email validation failed: %w", err)
		}
	}

	// Check if user exists
	_, userErr := s.userRepo.GetByEmail(ctx, email)
	isNewUser = userErr != nil // user not found = new user

	// Generate and send OTP
	code, err := s.otpService.GenerateAndSend(ctx, email)
	if err != nil {
		return false, "", err
	}

	return isNewUser, code, nil
}

// VerifyOTPAndAuth verifies the OTP code and authenticates the user.
// For new users, name is required and an account is created.
// Returns the user, access token, and refresh token.
func (s *AuthService) VerifyOTPAndAuth(ctx context.Context, email, code, name string) (*models.User, string, string, error) {
	// Verify OTP
	if err := s.otpService.Verify(ctx, email, code); err != nil {
		return nil, "", "", err
	}

	// Check if user exists
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		// New user — create account
		if name == "" {
			return nil, "", "", ErrNameRequired
		}

		emailCopy := email
		user = &models.User{
			Email:         &emailCopy,
			Name:          name,
			AuthProvider:  "email",
			EmailVerified: true, // OTP proves email ownership
			University:    "ĐHQG-HCM",
		}

		if err := s.userRepo.Create(ctx, user); err != nil {
			if err.Error() == "email already exists" {
				return nil, "", "", ErrEmailAlreadyExists
			}
			return nil, "", "", fmt.Errorf("failed to create user: %w", err)
		}
	} else {
		// Existing user — ensure email is verified (OTP proves it)
		if !user.EmailVerified {
			_ = s.userRepo.SetEmailVerified(ctx, user.ID)
			user.EmailVerified = true
		}
	}

	// Generate tokens
	accessToken, err := GenerateAccessToken(user, s.jwtSecret, 30)
	if err != nil {
		return nil, "", "", fmt.Errorf("failed to generate access token: %w", err)
	}

	refreshToken, err := GenerateRefreshToken(user, s.jwtSecret, 7)
	if err != nil {
		return nil, "", "", fmt.Errorf("failed to generate refresh token: %w", err)
	}

	return user, accessToken, refreshToken, nil
}

// LoginWithGoogle creates or logs in a user using Google OAuth
func (s *AuthService) LoginWithGoogle(ctx context.Context, googleInfo *GoogleUserInfo) (*models.User, error) {
	// Check if user exists with this Google ID
	user, err := s.userRepo.GetByGoogleID(ctx, googleInfo.GoogleID)
	if err == nil {
		// User exists - update name and avatar if changed
		needsUpdate := false
		if user.Name != googleInfo.Name {
			user.Name = googleInfo.Name
			needsUpdate = true
		}
		if googleInfo.AvatarURL != "" && (user.AvatarURL == nil || *user.AvatarURL != googleInfo.AvatarURL) {
			user.AvatarURL = &googleInfo.AvatarURL
			needsUpdate = true
		}

		if needsUpdate {
			if err := s.userRepo.Update(ctx, user); err != nil {
				// Log but don't fail - outdated profile is not critical
				fmt.Printf("Failed to update Google user profile: %v\n", err)
			}
		}
		return user, nil
	}

	// User doesn't exist - check if email is already used
	existingUser, err := s.userRepo.GetByEmail(ctx, googleInfo.Email)
	if err == nil {
		// Email exists - check auth provider
		if existingUser.AuthProvider == "email" {
			return nil, ErrEmailAlreadyUsedByEmail
		}
		// Should not happen (email unique per Google ID), but handle defensively
		return nil, ErrEmailAlreadyUsedByGoogle
	}

	// Create new Google user
	googleID := googleInfo.GoogleID
	avatarURL := googleInfo.AvatarURL
	googleEmail := googleInfo.Email
	user = &models.User{
		Email:         &googleEmail,
		Name:          googleInfo.Name,
		AvatarURL:     &avatarURL,
		AuthProvider:  "google",
		GoogleID:      &googleID,
		EmailVerified: true, // Google pre-verifies emails
		University:    "ĐHQG-HCM", // Default
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to create Google user: %w", err)
	}

	return user, nil
}

// VerifyEmail validates a verification token and marks the user's email as verified.
func (s *AuthService) VerifyEmail(ctx context.Context, token string) error {
	claims, err := ValidateEmailVerifyToken(token, s.jwtSecret)
	if err != nil {
		return ErrInvalidVerifyToken
	}

	// Fetch user to check current state
	user, err := s.userRepo.GetByID(ctx, claims.UserID)
	if err != nil {
		return ErrInvalidVerifyToken
	}

	// Ensure the token email matches the user's current email
	userEmailStr := ""
	if user.Email != nil {
		userEmailStr = *user.Email
	}
	if userEmailStr != claims.Email {
		return ErrInvalidVerifyToken
	}

	if user.EmailVerified {
		return ErrEmailAlreadyVerified
	}

	return s.userRepo.SetEmailVerified(ctx, claims.UserID)
}

// SendVerificationEmail generates a verification token and sends the email.
func (s *AuthService) SendVerificationEmail(ctx context.Context, userID int64) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	if user.EmailVerified {
		return ErrEmailAlreadyVerified
	}

	// Only email-auth users need verification
	if user.AuthProvider != "email" {
		return ErrEmailAlreadyVerified
	}

	emailStr := ""
	if user.Email != nil {
		emailStr = *user.Email
	}
	token, err := GenerateEmailVerifyToken(user.ID, emailStr, s.jwtSecret)
	if err != nil {
		return fmt.Errorf("failed to generate verify token: %w", err)
	}

	return s.emailService.SendVerificationEmail(emailStr, user.Name, token)
}
