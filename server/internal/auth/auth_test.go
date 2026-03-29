package auth

import (
	"context"
	"errors"
	"testing"
	"time"

	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
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

// Mock OTP repository for testing
type mockOTPRepository struct {
	otps []*models.EmailOTP
}

func newMockOTPRepository() *mockOTPRepository {
	return &mockOTPRepository{otps: make([]*models.EmailOTP, 0)}
}

func (m *mockOTPRepository) Create(ctx context.Context, otp *models.EmailOTP) error {
	otp.ID = int64(len(m.otps) + 1)
	m.otps = append(m.otps, otp)
	return nil
}

func (m *mockOTPRepository) GetLatestValid(ctx context.Context, email string) (*models.EmailOTP, error) {
	for i := len(m.otps) - 1; i >= 0; i-- {
		otp := m.otps[i]
		if otp.Email == email && otp.UsedAt == nil && otp.ExpiresAt.After(time.Now()) {
			return otp, nil
		}
	}
	return nil, errors.New("no valid OTP found")
}

func (m *mockOTPRepository) IncrementAttempts(ctx context.Context, otpID int64) error {
	for _, otp := range m.otps {
		if otp.ID == otpID {
			otp.Attempts++
			return nil
		}
	}
	return nil
}

func (m *mockOTPRepository) MarkUsed(ctx context.Context, otpID int64) error {
	for _, otp := range m.otps {
		if otp.ID == otpID {
			now := time.Now()
			otp.UsedAt = &now
			return nil
		}
	}
	return nil
}

func (m *mockOTPRepository) InvalidateAllForEmail(ctx context.Context, email string) error {
	now := time.Now()
	for _, otp := range m.otps {
		if otp.Email == email && otp.UsedAt == nil {
			otp.UsedAt = &now
		}
	}
	return nil
}

func (m *mockOTPRepository) CountRecentByEmail(ctx context.Context, email string, window time.Duration) (int64, error) {
	var count int64
	since := time.Now().Add(-window)
	for _, otp := range m.otps {
		if otp.Email == email && otp.CreatedAt.After(since) {
			count++
		}
	}
	return count, nil
}

func (m *mockOTPRepository) GetLastCreatedAt(ctx context.Context, email string) (*time.Time, error) {
	for i := len(m.otps) - 1; i >= 0; i-- {
		if m.otps[i].Email == email {
			return &m.otps[i].CreatedAt, nil
		}
	}
	return nil, nil
}

func (m *mockOTPRepository) DeleteExpired(ctx context.Context) error {
	return nil
}

// Ensure mock implements interface
var _ repository.OTPRepository = (*mockOTPRepository)(nil)

func newTestAuthService(repo *mockUserRepository) (*AuthService, *mockOTPRepository) {
	otpRepo := newMockOTPRepository()
	otpService := services.NewOTPService(otpRepo, &services.NoOpEmailService{})
	svc := NewAuthService(repo, &services.NoOpEmailVerifier{}, &services.NoOpEmailService{}, otpService, "test-secret")
	return svc, otpRepo
}

func TestAuthService_RequestOTP(t *testing.T) {
	tests := []struct {
		name        string
		email       string
		setupRepo   func(*mockUserRepository)
		wantNewUser bool
		wantErr     bool
	}{
		{
			name:        "new user - OTP sent",
			email:       "new@example.com",
			setupRepo:   func(repo *mockUserRepository) {},
			wantNewUser: true,
			wantErr:     false,
		},
		{
			name:  "existing user - OTP sent",
			email: "existing@example.com",
			setupRepo: func(repo *mockUserRepository) {
				repo.users["existing@example.com"] = &models.User{
					ID:           1,
					Email:        strPtr("existing@example.com"),
					Name:         "Existing User",
					AuthProvider: "email",
				}
			},
			wantNewUser: false,
			wantErr:     false,
		},
		{
			name:      "invalid email format",
			email:     "not-an-email",
			setupRepo: func(repo *mockUserRepository) {},
			wantErr:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newMockUserRepository()
			tt.setupRepo(repo)
			svc, _ := newTestAuthService(repo)
			ctx := context.Background()

			isNewUser, _, err := svc.RequestOTP(ctx, tt.email)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error, got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if isNewUser != tt.wantNewUser {
					t.Errorf("Expected isNewUser=%v, got %v", tt.wantNewUser, isNewUser)
				}
			}
		})
	}
}

func TestAuthService_VerifyOTPAndAuth(t *testing.T) {
	t.Run("new user signup", func(t *testing.T) {
		repo := newMockUserRepository()
		svc, otpRepo := newTestAuthService(repo)
		ctx := context.Background()

		// Request OTP
		_, code, err := svc.RequestOTP(ctx, "new@example.com")
		if err != nil {
			t.Fatalf("RequestOTP failed: %v", err)
		}

		// Get the actual code from the OTP repo (since NoOpEmailService doesn't send)
		otp, _ := otpRepo.GetLatestValid(ctx, "new@example.com")
		if otp != nil {
			code = otp.Code
		}

		// Verify OTP with name
		user, accessToken, refreshToken, err := svc.VerifyOTPAndAuth(ctx, "new@example.com", code, "New User")
		if err != nil {
			t.Fatalf("VerifyOTPAndAuth failed: %v", err)
		}
		if user == nil {
			t.Fatal("Expected user to be created")
		}
		if user.Name != "New User" {
			t.Errorf("Expected name 'New User', got '%s'", user.Name)
		}
		if !user.EmailVerified {
			t.Error("Expected email to be verified")
		}
		if accessToken == "" || refreshToken == "" {
			t.Error("Expected tokens to be generated")
		}
	})

	t.Run("new user without name fails", func(t *testing.T) {
		repo := newMockUserRepository()
		svc, otpRepo := newTestAuthService(repo)
		ctx := context.Background()

		_, _, err := svc.RequestOTP(ctx, "noname@example.com")
		if err != nil {
			t.Fatalf("RequestOTP failed: %v", err)
		}

		otp, _ := otpRepo.GetLatestValid(ctx, "noname@example.com")
		_, _, _, err = svc.VerifyOTPAndAuth(ctx, "noname@example.com", otp.Code, "")
		if err != ErrNameRequired {
			t.Errorf("Expected ErrNameRequired, got %v", err)
		}
	})

	t.Run("existing user login", func(t *testing.T) {
		repo := newMockUserRepository()
		repo.users["existing@example.com"] = &models.User{
			ID:           1,
			Email:        strPtr("existing@example.com"),
			Name:         "Existing User",
			AuthProvider: "email",
		}
		svc, otpRepo := newTestAuthService(repo)
		ctx := context.Background()

		_, _, err := svc.RequestOTP(ctx, "existing@example.com")
		if err != nil {
			t.Fatalf("RequestOTP failed: %v", err)
		}

		otp, _ := otpRepo.GetLatestValid(ctx, "existing@example.com")
		user, accessToken, refreshToken, err := svc.VerifyOTPAndAuth(ctx, "existing@example.com", otp.Code, "")
		if err != nil {
			t.Fatalf("VerifyOTPAndAuth failed: %v", err)
		}
		if user.ID != 1 {
			t.Errorf("Expected existing user ID 1, got %d", user.ID)
		}
		if accessToken == "" || refreshToken == "" {
			t.Error("Expected tokens to be generated")
		}
	})

	t.Run("wrong code fails", func(t *testing.T) {
		repo := newMockUserRepository()
		svc, _ := newTestAuthService(repo)
		ctx := context.Background()

		_, _, err := svc.RequestOTP(ctx, "wrong@example.com")
		if err != nil {
			t.Fatalf("RequestOTP failed: %v", err)
		}

		_, _, _, err = svc.VerifyOTPAndAuth(ctx, "wrong@example.com", "000000", "")
		if err == nil {
			t.Error("Expected error for wrong code")
		}
	})
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
				if user.AuthProvider != "google" {
					t.Errorf("Expected auth provider 'google', got '%s'", user.AuthProvider)
				}
				if !user.EmailVerified {
					t.Error("Expected EmailVerified to be true for Google users")
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
				repo.users["emailuser@example.com"] = &models.User{
					ID:           1,
					Email:        strPtr("emailuser@example.com"),
					Name:         "Email User",
					AuthProvider: "email",
				}
			},
			wantErr:   true,
			wantErrIs: ErrEmailAlreadyUsedByEmail,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newMockUserRepository()
			if tt.setupRepo != nil {
				tt.setupRepo(repo)
			}

			svc, _ := newTestAuthService(repo)
			ctx := context.Background()

			user, err := svc.LoginWithGoogle(ctx, tt.googleInfo)

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
		setupRepo func(*mockUserRepository) int64
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
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newMockUserRepository()
			userID := tt.setupRepo(repo)
			token := tt.makeToken(userID)

			svc, _ := newTestAuthService(repo)
			ctx := context.Background()

			err := svc.VerifyEmail(ctx, token)

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
