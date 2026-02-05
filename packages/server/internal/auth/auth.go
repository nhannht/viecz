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
	ErrInvalidEmail       = fmt.Errorf("invalid email format")
	ErrWeakPassword       = fmt.Errorf("password does not meet strength requirements")
	ErrEmailAlreadyExists = fmt.Errorf("email already exists")
	ErrInvalidCredentials = fmt.Errorf("invalid email or password")
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
	user := &models.User{
		Email:        email,
		PasswordHash: string(hashedPassword),
		Name:         name,
		University:   "ĐHQG-HCM", // Default university
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

	// Compare password with hash
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	return user, nil
}
