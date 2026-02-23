package auth

import (
	"context"
	"errors"
	"testing"

	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/services"
)

// Mock user repository
type mockUserRepository struct {
	users map[string]*models.User
}

func newMockUserRepository() *mockUserRepository {
	return &mockUserRepository{
		users: make(map[string]*models.User),
	}
}

func (m *mockUserRepository) Create(ctx context.Context, user *models.User) error {
	if _, exists := m.users[user.Email]; exists {
		return errors.New("email already exists")
	}
	user.ID = int64(len(m.users) + 1)
	m.users[user.Email] = user
	return nil
}

func (m *mockUserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	user, exists := m.users[email]
	if !exists {
		return nil, errors.New("user not found")
	}
	return user, nil
}

func (m *mockUserRepository) GetByID(ctx context.Context, id int64) (*models.User, error) {
	for _, user := range m.users {
		if user.ID == id {
			return user, nil
		}
	}
	return nil, errors.New("user not found")
}

func (m *mockUserRepository) Update(ctx context.Context, user *models.User) error {
	for email, u := range m.users {
		if u.ID == user.ID {
			m.users[email] = user
			return nil
		}
	}
	return errors.New("user not found")
}

func (m *mockUserRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	_, exists := m.users[email]
	return exists, nil
}

func (m *mockUserRepository) IncrementTasksPosted(ctx context.Context, userID int64) error {
	return nil
}

func (m *mockUserRepository) IncrementTasksCompleted(ctx context.Context, userID int64) error {
	return nil
}

func (m *mockUserRepository) IncrementEarnings(ctx context.Context, userID int64, amount int64) error {
	return nil
}

func (m *mockUserRepository) BecomeTasker(ctx context.Context, userID int64, bio string, skills []string) error {
	for _, user := range m.users {
		if user.ID == userID {
			user.IsTasker = true
			return nil
		}
	}
	return errors.New("user not found")
}

func (m *mockUserRepository) UpdateRating(ctx context.Context, userID int64, rating float64) error {
	for _, user := range m.users {
		if user.ID == userID {
			user.Rating = rating
			return nil
		}
	}
	return errors.New("user not found")
}

func (m *mockUserRepository) GetByGoogleID(ctx context.Context, googleID string) (*models.User, error) {
	for _, user := range m.users {
		if user.GoogleID != nil && *user.GoogleID == googleID {
			return user, nil
		}
	}
	return nil, errors.New("user not found")
}

func (m *mockUserRepository) SetEmailVerified(ctx context.Context, userID int64) error {
	for _, user := range m.users {
		if user.ID == userID {
			user.EmailVerified = true
			return nil
		}
	}
	return errors.New("user not found")
}

func TestAuthService_Register(t *testing.T) {
	tests := []struct {
		name        string
		email       string
		password    string
		userName    string
		setupRepo   func(*mockUserRepository)
		wantErr     bool
		errContains string
	}{
		{
			name:      "valid registration",
			email:     "test@example.com",
			password:  "Password123",
			userName:  "Test User",
			setupRepo: func(repo *mockUserRepository) {},
			wantErr:   false,
		},
		{
			name:        "invalid email",
			email:       "invalid-email",
			password:    "Password123",
			userName:    "Test User",
			setupRepo:   func(repo *mockUserRepository) {},
			wantErr:     true,
			errContains: "invalid email",
		},
		{
			name:        "weak password - too short",
			email:       "test@example.com",
			password:    "Pass1",
			userName:    "Test User",
			setupRepo:   func(repo *mockUserRepository) {},
			wantErr:     true,
			errContains: "password does not meet strength requirements",
		},
		{
			name:        "weak password - no uppercase",
			email:       "test@example.com",
			password:    "password123",
			userName:    "Test User",
			setupRepo:   func(repo *mockUserRepository) {},
			wantErr:     true,
			errContains: "password does not meet strength requirements",
		},
		{
			name:        "weak password - no lowercase",
			email:       "test@example.com",
			password:    "PASSWORD123",
			userName:    "Test User",
			setupRepo:   func(repo *mockUserRepository) {},
			wantErr:     true,
			errContains: "password does not meet strength requirements",
		},
		{
			name:        "weak password - no number",
			email:       "test@example.com",
			password:    "PasswordABC",
			userName:    "Test User",
			setupRepo:   func(repo *mockUserRepository) {},
			wantErr:     true,
			errContains: "password does not meet strength requirements",
		},
		{
			name:     "email already exists",
			email:    "existing@example.com",
			password: "Password123",
			userName: "Test User",
			setupRepo: func(repo *mockUserRepository) {
				repo.users["existing@example.com"] = &models.User{
					ID:    1,
					Email: "existing@example.com",
				}
			},
			wantErr:     true,
			errContains: "email already exists",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newMockUserRepository()
			if tt.setupRepo != nil {
				tt.setupRepo(repo)
			}

			service := NewAuthService(repo, &services.NoOpEmailVerifier{}, &services.NoOpEmailService{}, "test-secret")
			ctx := context.Background()

			user, err := service.Register(ctx, tt.email, tt.password, tt.userName)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error containing '%s', got nil", tt.errContains)
				} else if tt.errContains != "" && !contains(err.Error(), tt.errContains) {
					t.Errorf("Expected error containing '%s', got '%s'", tt.errContains, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if user == nil {
					t.Fatal("Expected user to be created, got nil")
				}
				if user.Email != tt.email {
					t.Errorf("Expected email '%s', got '%s'", tt.email, user.Email)
				}
				if user.Name != tt.userName {
					t.Errorf("Expected name '%s', got '%s'", tt.userName, user.Name)
				}
				if user.PasswordHash == nil || *user.PasswordHash == "" {
					t.Error("Expected password to be hashed, got empty string")
				}
				if user.PasswordHash != nil && *user.PasswordHash == tt.password {
					t.Error("Expected password to be hashed, got plain text")
				}
			}
		})
	}
}

func TestAuthService_Login(t *testing.T) {
	tests := []struct {
		name        string
		email       string
		password    string
		setupRepo   func(*mockUserRepository)
		wantErr     bool
		errContains string
	}{
		{
			name:     "valid login",
			email:    "test@example.com",
			password: "Password123",
			setupRepo: func(repo *mockUserRepository) {
				// Register a user first
				service := NewAuthService(repo, &services.NoOpEmailVerifier{}, &services.NoOpEmailService{}, "test-secret")
				_, _ = service.Register(context.Background(), "test@example.com", "Password123", "Test User")
			},
			wantErr: false,
		},
		{
			name:        "user not found",
			email:       "nonexistent@example.com",
			password:    "Password123",
			setupRepo:   func(repo *mockUserRepository) {},
			wantErr:     true,
			errContains: "invalid email or password",
		},
		{
			name:     "wrong password",
			email:    "test@example.com",
			password: "WrongPassword123",
			setupRepo: func(repo *mockUserRepository) {
				service := NewAuthService(repo, &services.NoOpEmailVerifier{}, &services.NoOpEmailService{}, "test-secret")
				_, _ = service.Register(context.Background(), "test@example.com", "Password123", "Test User")
			},
			wantErr:     true,
			errContains: "invalid email or password",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newMockUserRepository()
			if tt.setupRepo != nil {
				tt.setupRepo(repo)
			}

			service := NewAuthService(repo, &services.NoOpEmailVerifier{}, &services.NoOpEmailService{}, "test-secret")
			ctx := context.Background()

			user, err := service.Login(ctx, tt.email, tt.password)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error containing '%s', got nil", tt.errContains)
				} else if tt.errContains != "" && !contains(err.Error(), tt.errContains) {
					t.Errorf("Expected error containing '%s', got '%s'", tt.errContains, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if user == nil {
					t.Fatal("Expected user to be returned, got nil")
				}
				if user.Email != tt.email {
					t.Errorf("Expected email '%s', got '%s'", tt.email, user.Email)
				}
			}
		})
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 || (len(s) > 0 && len(substr) > 0 && hasSubstring(s, substr)))
}

func hasSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
