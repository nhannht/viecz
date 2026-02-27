package auth

import (
	"context"
	"errors"
	"testing"

	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/services"
)

func strPtr(s string) *string { return &s }

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
	key := ""
	if user.Email != nil {
		key = *user.Email
	}
	if key != "" {
		if _, exists := m.users[key]; exists {
			return errors.New("email already exists")
		}
	}
	user.ID = int64(len(m.users) + 1)
	if key != "" {
		m.users[key] = user
	} else if user.Phone != nil {
		m.users[*user.Phone] = user
	}
	return nil
}

func (m *mockUserRepository) GetByPhone(ctx context.Context, phone string) (*models.User, error) {
	for _, user := range m.users {
		if user.Phone != nil && *user.Phone == phone {
			return user, nil
		}
	}
	return nil, errors.New("user not found")
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

func (m *mockUserRepository) SetPhoneVerified(ctx context.Context, userID int64, phone string) error {
	for _, user := range m.users {
		if user.ID == userID {
			user.Phone = &phone
			user.PhoneVerified = true
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
					Email: strPtr("existing@example.com"),
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
				if user.Email == nil || *user.Email != tt.email {
					t.Errorf("Expected email '%s', got '%v'", tt.email, user.Email)
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
				if user.Email == nil || *user.Email != tt.email {
					t.Errorf("Expected email '%s', got '%v'", tt.email, user.Email)
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

func TestAuthService_LoginWithGoogle(t *testing.T) {
	tests := []struct {
		name        string
		googleInfo  *GoogleUserInfo
		setupRepo   func(*mockUserRepository)
		wantErr     bool
		wantErrIs   error
		checkUser   func(t *testing.T, user *models.User)
	}{
		{
			name: "new user - no existing google ID or email",
			googleInfo: &GoogleUserInfo{
				GoogleID:  "google-123",
				Email:     "newuser@gmail.com",
				Name:      "New User",
				AvatarURL: "https://example.com/avatar.png",
			},
			setupRepo: func(repo *mockUserRepository) {},
			wantErr:   false,
			checkUser: func(t *testing.T, user *models.User) {
				if user.Email == nil || *user.Email != "newuser@gmail.com" {
					t.Errorf("Expected email 'newuser@gmail.com', got '%v'", user.Email)
				}
				if user.Name != "New User" {
					t.Errorf("Expected name 'New User', got '%s'", user.Name)
				}
				if user.AuthProvider != "google" {
					t.Errorf("Expected auth provider 'google', got '%s'", user.AuthProvider)
				}
				if user.GoogleID == nil || *user.GoogleID != "google-123" {
					t.Error("Expected GoogleID to be 'google-123'")
				}
				if !user.EmailVerified {
					t.Error("Expected EmailVerified to be true for Google users")
				}
				if user.AvatarURL == nil || *user.AvatarURL != "https://example.com/avatar.png" {
					t.Error("Expected AvatarURL to be set")
				}
			},
		},
		{
			name: "existing google user - returns existing user",
			googleInfo: &GoogleUserInfo{
				GoogleID:  "google-456",
				Email:     "existing@gmail.com",
				Name:      "Existing User",
				AvatarURL: "https://example.com/avatar.png",
			},
			setupRepo: func(repo *mockUserRepository) {
				googleID := "google-456"
				avatarURL := "https://example.com/avatar.png"
				repo.users["existing@gmail.com"] = &models.User{
					ID:            1,
					Email:         strPtr("existing@gmail.com"),
					Name:          "Existing User",
					AuthProvider:  "google",
					GoogleID:      &googleID,
					AvatarURL:     &avatarURL,
					EmailVerified: true,
				}
			},
			wantErr: false,
			checkUser: func(t *testing.T, user *models.User) {
				if user.ID != 1 {
					t.Errorf("Expected existing user ID 1, got %d", user.ID)
				}
				if user.Email == nil || *user.Email != "existing@gmail.com" {
					t.Errorf("Expected email 'existing@gmail.com', got '%v'", user.Email)
				}
			},
		},
		{
			name: "existing google user with changed name - updates name",
			googleInfo: &GoogleUserInfo{
				GoogleID:  "google-789",
				Email:     "changed@gmail.com",
				Name:      "Updated Name",
				AvatarURL: "https://example.com/new-avatar.png",
			},
			setupRepo: func(repo *mockUserRepository) {
				googleID := "google-789"
				oldAvatar := "https://example.com/old-avatar.png"
				repo.users["changed@gmail.com"] = &models.User{
					ID:            1,
					Email:         strPtr("changed@gmail.com"),
					Name:          "Old Name",
					AuthProvider:  "google",
					GoogleID:      &googleID,
					AvatarURL:     &oldAvatar,
					EmailVerified: true,
				}
			},
			wantErr: false,
			checkUser: func(t *testing.T, user *models.User) {
				if user.Name != "Updated Name" {
					t.Errorf("Expected name to be updated to 'Updated Name', got '%s'", user.Name)
				}
				if user.AvatarURL == nil || *user.AvatarURL != "https://example.com/new-avatar.png" {
					t.Error("Expected AvatarURL to be updated")
				}
			},
		},
		{
			name: "email already used by email auth",
			googleInfo: &GoogleUserInfo{
				GoogleID:  "google-new",
				Email:     "emailuser@example.com",
				Name:      "Google User",
				AvatarURL: "https://example.com/avatar.png",
			},
			setupRepo: func(repo *mockUserRepository) {
				passwordHash := "$2a$10$hashedpassword"
				repo.users["emailuser@example.com"] = &models.User{
					ID:           1,
					Email:        strPtr("emailuser@example.com"),
					Name:         "Email User",
					AuthProvider: "email",
					PasswordHash: &passwordHash,
				}
			},
			wantErr:   true,
			wantErrIs: ErrEmailAlreadyUsedByEmail,
		},
		{
			name: "email already used by another google account",
			googleInfo: &GoogleUserInfo{
				GoogleID:  "google-different",
				Email:     "googleuser@example.com",
				Name:      "Another Google User",
				AvatarURL: "https://example.com/avatar.png",
			},
			setupRepo: func(repo *mockUserRepository) {
				otherGoogleID := "google-original"
				repo.users["googleuser@example.com"] = &models.User{
					ID:            1,
					Email:         strPtr("googleuser@example.com"),
					Name:          "Original Google User",
					AuthProvider:  "google",
					GoogleID:      &otherGoogleID,
					EmailVerified: true,
				}
			},
			wantErr:   true,
			wantErrIs: ErrEmailAlreadyUsedByGoogle,
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

			user, err := service.LoginWithGoogle(ctx, tt.googleInfo)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error %v, got nil", tt.wantErrIs)
				} else if tt.wantErrIs != nil && err != tt.wantErrIs {
					t.Errorf("Expected error %v, got %v", tt.wantErrIs, err)
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if user == nil {
					t.Fatal("Expected user to be returned, got nil")
				}
				if tt.checkUser != nil {
					tt.checkUser(t, user)
				}
			}
		})
	}
}

func TestAuthService_VerifyEmail(t *testing.T) {
	const testSecret = "test-secret"

	tests := []struct {
		name      string
		setupRepo func(*mockUserRepository) int64 // returns userID for token generation
		makeToken func(userID int64) string
		wantErr   bool
		wantErrIs error
	}{
		{
			name: "valid token and unverified user - success",
			setupRepo: func(repo *mockUserRepository) int64 {
				repo.users["verify@example.com"] = &models.User{
					ID:            1,
					Email:         strPtr("verify@example.com"),
					Name:          "Verify User",
					AuthProvider:  "email",
					EmailVerified: false,
				}
				return 1
			},
			makeToken: func(userID int64) string {
				token, _ := GenerateEmailVerifyToken(userID, "verify@example.com", testSecret)
				return token
			},
			wantErr: false,
		},
		{
			name: "invalid token",
			setupRepo: func(repo *mockUserRepository) int64 {
				return 0
			},
			makeToken: func(userID int64) string {
				return "invalid-token-string"
			},
			wantErr:   true,
			wantErrIs: ErrInvalidVerifyToken,
		},
		{
			name: "already verified user",
			setupRepo: func(repo *mockUserRepository) int64 {
				repo.users["verified@example.com"] = &models.User{
					ID:            2,
					Email:         strPtr("verified@example.com"),
					Name:          "Already Verified",
					AuthProvider:  "email",
					EmailVerified: true,
				}
				return 2
			},
			makeToken: func(userID int64) string {
				token, _ := GenerateEmailVerifyToken(userID, "verified@example.com", testSecret)
				return token
			},
			wantErr:   true,
			wantErrIs: ErrEmailAlreadyVerified,
		},
		{
			name: "email mismatch - user changed email after token generation",
			setupRepo: func(repo *mockUserRepository) int64 {
				repo.users["newemail@example.com"] = &models.User{
					ID:            3,
					Email:         strPtr("newemail@example.com"),
					Name:          "Changed Email User",
					AuthProvider:  "email",
					EmailVerified: false,
				}
				return 3
			},
			makeToken: func(userID int64) string {
				// Generate token with old email that no longer matches
				token, _ := GenerateEmailVerifyToken(userID, "oldemail@example.com", testSecret)
				return token
			},
			wantErr:   true,
			wantErrIs: ErrInvalidVerifyToken,
		},
		{
			name: "user not found",
			setupRepo: func(repo *mockUserRepository) int64 {
				// Don't add any user - use ID that doesn't exist
				return 999
			},
			makeToken: func(userID int64) string {
				token, _ := GenerateEmailVerifyToken(userID, "ghost@example.com", testSecret)
				return token
			},
			wantErr:   true,
			wantErrIs: ErrInvalidVerifyToken,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newMockUserRepository()
			userID := tt.setupRepo(repo)
			token := tt.makeToken(userID)

			service := NewAuthService(repo, &services.NoOpEmailVerifier{}, &services.NoOpEmailService{}, testSecret)
			ctx := context.Background()

			err := service.VerifyEmail(ctx, token)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error %v, got nil", tt.wantErrIs)
				} else if tt.wantErrIs != nil && err != tt.wantErrIs {
					t.Errorf("Expected error %v, got %v", tt.wantErrIs, err)
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				// Verify the user is now marked as verified
				user, getErr := repo.GetByID(ctx, userID)
				if getErr != nil {
					t.Fatalf("Failed to get user after verification: %v", getErr)
				}
				if !user.EmailVerified {
					t.Error("Expected user.EmailVerified to be true after successful verification")
				}
			}
		})
	}
}

func TestAuthService_SendVerificationEmail(t *testing.T) {
	tests := []struct {
		name      string
		setupRepo func(*mockUserRepository) int64 // returns userID
		wantErr   bool
		wantErrIs error
	}{
		{
			name: "valid unverified email user - success",
			setupRepo: func(repo *mockUserRepository) int64 {
				repo.users["unverified@example.com"] = &models.User{
					ID:            1,
					Email:         strPtr("unverified@example.com"),
					Name:          "Unverified User",
					AuthProvider:  "email",
					EmailVerified: false,
				}
				return 1
			},
			wantErr: false,
		},
		{
			name: "already verified user",
			setupRepo: func(repo *mockUserRepository) int64 {
				repo.users["verified@example.com"] = &models.User{
					ID:            2,
					Email:         strPtr("verified@example.com"),
					Name:          "Verified User",
					AuthProvider:  "email",
					EmailVerified: true,
				}
				return 2
			},
			wantErr:   true,
			wantErrIs: ErrEmailAlreadyVerified,
		},
		{
			name: "google auth user - returns ErrEmailAlreadyVerified",
			setupRepo: func(repo *mockUserRepository) int64 {
				googleID := "google-123"
				repo.users["googleuser@example.com"] = &models.User{
					ID:            3,
					Email:         strPtr("googleuser@example.com"),
					Name:          "Google User",
					AuthProvider:  "google",
					GoogleID:      &googleID,
					EmailVerified: true,
				}
				return 3
			},
			wantErr:   true,
			wantErrIs: ErrEmailAlreadyVerified,
		},
		{
			name: "user not found",
			setupRepo: func(repo *mockUserRepository) int64 {
				// Don't add any user
				return 999
			},
			wantErr: true,
			// Not checking wantErrIs - just that an error is returned
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newMockUserRepository()
			userID := tt.setupRepo(repo)

			service := NewAuthService(repo, &services.NoOpEmailVerifier{}, &services.NoOpEmailService{}, "test-secret")
			ctx := context.Background()

			err := service.SendVerificationEmail(ctx, userID)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error, got nil")
				} else if tt.wantErrIs != nil && err != tt.wantErrIs {
					t.Errorf("Expected error %v, got %v", tt.wantErrIs, err)
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
			}
		})
	}
}
