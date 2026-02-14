package auth

import (
	"context"
	"fmt"

	"golang.org/x/crypto/bcrypt"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
)

// Custom errors
var (
	ErrInvalidEmail            = fmt.Errorf("invalid email format")
	ErrWeakPassword            = fmt.Errorf("password does not meet strength requirements")
	ErrEmailAlreadyExists      = fmt.Errorf("email already exists")
	ErrInvalidCredentials      = fmt.Errorf("invalid email or password")
	ErrGoogleAuthFailed        = fmt.Errorf("google authentication failed")
	ErrEmailAlreadyUsedByEmail = fmt.Errorf("email already registered with email/password")
	ErrEmailAlreadyUsedByGoogle = fmt.Errorf("email already registered with Google")
)

// AuthService handles authentication operations
type AuthService struct {
	userRepo repository.UserRepository
}

// NewAuthService creates a new authentication service
func NewAuthService(userRepo repository.UserRepository) *AuthService {
	return &AuthService{
		userRepo: userRepo,
	}
}

// Register creates a new user with hashed password
func (s *AuthService) Register(ctx context.Context, email, password, name string) (*models.User, error) {
	// Validate email format
	if !models.IsValidEmail(email) {
		return nil, ErrInvalidEmail
	}

	// Validate password strength
	if !models.IsStrongPassword(password) {
		return nil, ErrWeakPassword
	}

	// Check if email already exists
	exists, err := s.userRepo.ExistsByEmail(ctx, email)
	if err != nil {
		return nil, fmt.Errorf("failed to check email: %w", err)
	}
	if exists {
		return nil, ErrEmailAlreadyExists
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user
	hashedPasswordStr := string(hashedPassword)
	user := &models.User{
		Email:        email,
		PasswordHash: &hashedPasswordStr,
		Name:         name,
		University:   "ĐHQG-HCM", // Default university
		AuthProvider: "email", // Email/password authentication
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		if err.Error() == "email already exists" {
			return nil, ErrEmailAlreadyExists
		}
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

// Login verifies credentials and returns the user
func (s *AuthService) Login(ctx context.Context, email, password string) (*models.User, error) {
	// Get user by email
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		// Don't reveal whether email exists or not
		return nil, ErrInvalidCredentials
	}

	// Ensure user uses email/password authentication
	if user.AuthProvider != "email" || user.PasswordHash == nil {
		return nil, ErrInvalidCredentials
	}

	// Compare password with hash
	if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	return user, nil
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
	user = &models.User{
		Email:         googleInfo.Email,
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
