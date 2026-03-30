package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"viecz.vieczserver/internal/auth"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
	"viecz.vieczserver/internal/services"
)

// Mock user repository for testing
type mockUserRepository struct {
	users      map[string]*models.User // keyed by email
	usersById  map[int64]*models.User  // keyed by ID
	shouldFail bool                    // for testing error cases
}

func newMockUserRepository() *mockUserRepository {
	return &mockUserRepository{
		users:     make(map[string]*models.User),
		usersById: make(map[int64]*models.User),
	}
}

func (m *mockUserRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	if m.shouldFail {
		return false, errors.New("database error")
	}
	_, exists := m.users[email]
	return exists, nil
}

func (m *mockUserRepository) GetByPhone(ctx context.Context, phone string) (*models.User, error) {
	if m.shouldFail {
		return nil, errors.New("user not found")
	}
	for _, user := range m.usersById {
		if user.Phone != nil && *user.Phone == phone {
			return user, nil
		}
	}
	return nil, errors.New("user not found")
}

func (m *mockUserRepository) Delete(ctx context.Context, id int64) error {
	if m.shouldFail {
		return errors.New("delete failed")
	}
	delete(m.usersById, id)
	return nil
}

func (m *mockUserRepository) ExistsByPhone(ctx context.Context, phone string) (bool, error) {
	if m.shouldFail {
		return false, errors.New("database error")
	}
	for _, user := range m.usersById {
		if user.Phone != nil && *user.Phone == phone {
			return true, nil
		}
	}
	return false, nil
}

func strPtr(s string) *string { return &s }

func (m *mockUserRepository) Create(ctx context.Context, user *models.User) error {
	if m.shouldFail {
		return errors.New("create failed")
	}
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
	}
	m.usersById[user.ID] = user
	return nil
}

func (m *mockUserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	if m.shouldFail {
		return nil, errors.New("user not found")
	}
	user, exists := m.users[email]
	if !exists {
		return nil, errors.New("user not found")
	}
	return user, nil
}

func (m *mockUserRepository) GetByID(ctx context.Context, id int64) (*models.User, error) {
	if m.shouldFail {
		return nil, errors.New("user not found")
	}
	user, exists := m.usersById[id]
	if !exists {
		return nil, errors.New("user not found")
	}
	return user, nil
}

func (m *mockUserRepository) Update(ctx context.Context, user *models.User) error {
	if m.shouldFail {
		return errors.New("update failed")
	}
	m.usersById[user.ID] = user
	if user.Email != nil {
		m.users[*user.Email] = user
	}
	return nil
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
	return nil
}

func (m *mockUserRepository) GetByGoogleID(ctx context.Context, googleID string) (*models.User, error) {
	if m.shouldFail {
		return nil, errors.New("user not found")
	}
	for _, user := range m.usersById {
		if user.GoogleID != nil && *user.GoogleID == googleID {
			return user, nil
		}
	}
	return nil, errors.New("user not found")
}

func (m *mockUserRepository) SetEmailVerified(ctx context.Context, userID int64) error {
	if m.shouldFail {
		return errors.New("update failed")
	}
	user, exists := m.usersById[userID]
	if !exists {
		return errors.New("user not found")
	}
	user.EmailVerified = true
	return nil
}

func (m *mockUserRepository) SetPhoneVerified(ctx context.Context, userID int64, phone string) error {
	if m.shouldFail {
		return errors.New("update failed")
	}
	user, exists := m.usersById[userID]
	if !exists {
		return errors.New("user not found")
	}
	user.Phone = &phone
	user.PhoneVerified = true
	return nil
}

// Mock OTP repository for testing
type mockOTPRepository struct {
	otps       map[string]*models.EmailOTP
	shouldFail bool
}

func newMockOTPRepository() *mockOTPRepository {
	return &mockOTPRepository{
		otps: make(map[string]*models.EmailOTP),
	}
}

func (m *mockOTPRepository) Create(ctx context.Context, otp *models.EmailOTP) error {
	if m.shouldFail {
		return errors.New("create failed")
	}
	otp.ID = int64(len(m.otps) + 1)
	m.otps[otp.Email] = otp
	return nil
}

func (m *mockOTPRepository) GetLatestValid(ctx context.Context, email string) (*models.EmailOTP, error) {
	if m.shouldFail {
		return nil, errors.New("not found")
	}
	otp, exists := m.otps[email]
	if !exists {
		return nil, fmt.Errorf("no valid OTP found")
	}
	if otp.UsedAt != nil || otp.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("OTP expired or used")
	}
	return otp, nil
}

func (m *mockOTPRepository) IncrementAttempts(ctx context.Context, otpID int64) error {
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
	delete(m.otps, email)
	return nil
}

func (m *mockOTPRepository) CountRecentByEmail(ctx context.Context, email string, window time.Duration) (int64, error) {
	return 0, nil
}

func (m *mockOTPRepository) GetLastCreatedAt(ctx context.Context, email string) (*time.Time, error) {
	return nil, nil
}

func (m *mockOTPRepository) DeleteExpired(ctx context.Context) error {
	return nil
}

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return gin.New()
}

func createTestHandler(userRepo repository.UserRepository, otpRepo repository.OTPRepository, jwtSecret string, turnstileSvc *services.TurnstileService) *AuthHandler {
	otpService := services.NewOTPService(otpRepo, &services.NoOpEmailService{})
	authService := auth.NewAuthService(userRepo, &services.NoOpEmailVerifier{}, &services.NoOpEmailService{}, otpService, jwtSecret)
	return NewAuthHandler(authService, nil, jwtSecret, turnstileSvc, nil, userRepo, true)
}

func TestAuthHandler_RequestOTP(t *testing.T) {
	jwtSecret := "test-secret-key-for-testing-12345"

	tests := []struct {
		name               string
		requestBody        interface{}
		expectedStatusCode int
		checkResponse      func(*testing.T, map[string]interface{})
	}{
		{
			name: "successful OTP request for new user",
			requestBody: RequestOTPRequest{
				Email: "newuser@example.com",
			},
			expectedStatusCode: http.StatusOK,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				if response["message"] == nil {
					t.Error("Expected message in response")
				}
				if response["is_new_user"] != true {
					t.Error("Expected is_new_user to be true for new user")
				}
			},
		},
		{
			name: "successful OTP request for existing user",
			requestBody: RequestOTPRequest{
				Email: "existing@example.com",
			},
			expectedStatusCode: http.StatusOK,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				if response["is_new_user"] != false {
					t.Error("Expected is_new_user to be false for existing user")
				}
			},
		},
		{
			name: "invalid email format",
			requestBody: RequestOTPRequest{
				Email: "invalid-email",
			},
			expectedStatusCode: http.StatusBadRequest,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				if response["error"] == nil {
					t.Error("Expected error message in response")
				}
			},
		},
		{
			name: "missing email",
			requestBody: map[string]interface{}{},
			expectedStatusCode: http.StatusBadRequest,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				if response["error"] == nil {
					t.Error("Expected validation error in response")
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserRepo := newMockUserRepository()
			// Add existing user for the "existing user" test case
			mockUserRepo.users["existing@example.com"] = &models.User{
				ID:           1,
				Email:        strPtr("existing@example.com"),
				Name:         "Existing User",
				AuthProvider: "email",
			}
			mockUserRepo.usersById[1] = mockUserRepo.users["existing@example.com"]

			mockOTPRepo := newMockOTPRepository()
			handler := createTestHandler(mockUserRepo, mockOTPRepo, jwtSecret, nil)
			router := setupTestRouter()
			router.POST("/auth/otp/request", handler.RequestOTP)

			body, _ := json.Marshal(tt.requestBody)
			req := httptest.NewRequest(http.MethodPost, "/auth/otp/request", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tt.expectedStatusCode {
				t.Errorf("Expected status code %d, got %d. Response: %s",
					tt.expectedStatusCode, w.Code, w.Body.String())
			}

			var response map[string]interface{}
			if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
				t.Fatalf("Failed to parse response: %v", err)
			}

			if tt.checkResponse != nil {
				tt.checkResponse(t, response)
			}
		})
	}
}

func TestAuthHandler_VerifyOTP(t *testing.T) {
	jwtSecret := "test-secret-key-for-testing-12345"

	tests := []struct {
		name               string
		requestBody        interface{}
		setupOTP           func(*mockOTPRepository)
		setupUser          func(*mockUserRepository)
		expectedStatusCode int
		checkResponse      func(*testing.T, map[string]interface{})
	}{
		{
			name: "successful verification for new user",
			requestBody: VerifyOTPRequest{
				Email: "new@example.com",
				Code:  "123456",
				Name:  "New User",
			},
			setupOTP: func(repo *mockOTPRepository) {
				repo.otps["new@example.com"] = &models.EmailOTP{
					ID:          1,
					Email:       "new@example.com",
					Code:        "123456",
					MaxAttempts: 5,
					ExpiresAt:   time.Now().Add(10 * time.Minute),
				}
			},
			setupUser:          func(repo *mockUserRepository) {},
			expectedStatusCode: http.StatusOK,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				if response["access_token"] == nil {
					t.Error("Expected access_token in response")
				}
				if response["refresh_token"] == nil {
					t.Error("Expected refresh_token in response")
				}
				if response["user"] == nil {
					t.Error("Expected user in response")
				}
			},
		},
		{
			name: "invalid OTP code",
			requestBody: VerifyOTPRequest{
				Email: "test@example.com",
				Code:  "999999",
			},
			setupOTP: func(repo *mockOTPRepository) {
				repo.otps["test@example.com"] = &models.EmailOTP{
					ID:          1,
					Email:       "test@example.com",
					Code:        "123456",
					MaxAttempts: 5,
					ExpiresAt:   time.Now().Add(10 * time.Minute),
				}
			},
			setupUser:          func(repo *mockUserRepository) {},
			expectedStatusCode: http.StatusUnauthorized,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				if response["error"] == nil {
					t.Error("Expected error message in response")
				}
			},
		},
		{
			name: "missing code",
			requestBody: map[string]interface{}{
				"email": "test@example.com",
			},
			setupOTP:           func(repo *mockOTPRepository) {},
			setupUser:          func(repo *mockUserRepository) {},
			expectedStatusCode: http.StatusBadRequest,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				if response["error"] == nil {
					t.Error("Expected validation error in response")
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserRepo := newMockUserRepository()
			mockOTPRepo := newMockOTPRepository()
			if tt.setupOTP != nil {
				tt.setupOTP(mockOTPRepo)
			}
			if tt.setupUser != nil {
				tt.setupUser(mockUserRepo)
			}

			handler := createTestHandler(mockUserRepo, mockOTPRepo, jwtSecret, nil)
			router := setupTestRouter()
			router.POST("/auth/otp/verify", handler.VerifyOTP)

			body, _ := json.Marshal(tt.requestBody)
			req := httptest.NewRequest(http.MethodPost, "/auth/otp/verify", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tt.expectedStatusCode {
				t.Errorf("Expected status code %d, got %d. Response: %s",
					tt.expectedStatusCode, w.Code, w.Body.String())
			}

			var response map[string]interface{}
			if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
				t.Fatalf("Failed to parse response: %v", err)
			}

			if tt.checkResponse != nil {
				tt.checkResponse(t, response)
			}
		})
	}
}

func TestAuthHandler_RefreshToken(t *testing.T) {
	jwtSecret := "test-secret-key-for-testing-12345"

	// Generate a valid refresh token for testing
	user := &models.User{
		ID:    123,
		Email: strPtr("test@example.com"),
		Name:  "Test User",
	}
	validRefreshToken, _ := auth.GenerateRefreshToken(user, jwtSecret, 7)

	tests := []struct {
		name               string
		requestBody        interface{}
		expectedStatusCode int
		checkResponse      func(*testing.T, map[string]interface{})
	}{
		{
			name: "successful token refresh",
			requestBody: map[string]interface{}{
				"refresh_token": validRefreshToken,
			},
			expectedStatusCode: http.StatusOK,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				if response["access_token"] == nil {
					t.Error("Expected access_token in response")
				}
				accessToken := response["access_token"].(string)
				if accessToken == "" {
					t.Error("Expected non-empty access token")
				}
			},
		},
		{
			name: "invalid refresh token",
			requestBody: map[string]interface{}{
				"refresh_token": "invalid.token.here",
			},
			expectedStatusCode: http.StatusUnauthorized,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				if response["error"] == nil {
					t.Error("Expected error message in response")
				}
				errorMsg := response["error"].(string)
				if errorMsg != "invalid refresh token" {
					t.Errorf("Expected 'invalid refresh token', got '%s'", errorMsg)
				}
			},
		},
		{
			name: "missing refresh token",
			requestBody: map[string]interface{}{},
			expectedStatusCode: http.StatusBadRequest,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				if response["error"] == nil {
					t.Error("Expected validation error in response")
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserRepo := newMockUserRepository()
			mockOTPRepo := newMockOTPRepository()
			handler := createTestHandler(mockUserRepo, mockOTPRepo, jwtSecret, nil)
			router := setupTestRouter()
			router.POST("/auth/refresh", handler.RefreshToken)

			body, _ := json.Marshal(tt.requestBody)
			req := httptest.NewRequest(http.MethodPost, "/auth/refresh", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tt.expectedStatusCode {
				t.Errorf("Expected status code %d, got %d. Response: %s",
					tt.expectedStatusCode, w.Code, w.Body.String())
			}

			var response map[string]interface{}
			if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
				t.Fatalf("Failed to parse response: %v", err)
			}

			if tt.checkResponse != nil {
				tt.checkResponse(t, response)
			}
		})
	}
}

func TestAuthHandler_VerifyEmail(t *testing.T) {
	jwtSecret := "test-secret-key-for-testing-12345"

	tests := []struct {
		name               string
		requestBody        interface{}
		setupRepo          func(*mockUserRepository)
		expectedStatusCode int
	}{
		{
			name: "valid token",
			setupRepo: func(repo *mockUserRepository) {
				hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("Password123"), bcrypt.DefaultCost)
				hashedPasswordStr := string(hashedPassword)
				repo.users["test@example.com"] = &models.User{
					ID:           1,
					Email:        strPtr("test@example.com"),
					Name:         "Test",
					PasswordHash: &hashedPasswordStr,
					AuthProvider: "email",
				}
				repo.usersById[1] = repo.users["test@example.com"]
			},
			requestBody: func() interface{} {
				token, _ := auth.GenerateEmailVerifyToken(1, "test@example.com", jwtSecret)
				return map[string]string{"token": token}
			}(),
			expectedStatusCode: http.StatusOK,
		},
		{
			name:               "invalid token",
			setupRepo:          func(repo *mockUserRepository) {},
			requestBody:        map[string]string{"token": "invalid.token.here"},
			expectedStatusCode: http.StatusBadRequest,
		},
		{
			name:               "missing token",
			setupRepo:          func(repo *mockUserRepository) {},
			requestBody:        map[string]string{},
			expectedStatusCode: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserRepo := newMockUserRepository()
			if tt.setupRepo != nil {
				tt.setupRepo(mockUserRepo)
			}
			mockOTPRepo := newMockOTPRepository()
			handler := createTestHandler(mockUserRepo, mockOTPRepo, jwtSecret, nil)
			router := setupTestRouter()
			router.POST("/auth/verify-email", handler.VerifyEmail)

			body, _ := json.Marshal(tt.requestBody)
			req := httptest.NewRequest(http.MethodPost, "/auth/verify-email", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tt.expectedStatusCode {
				t.Errorf("Expected %d, got %d: %s", tt.expectedStatusCode, w.Code, w.Body.String())
			}
		})
	}
}

func TestAuthHandler_ResendVerification(t *testing.T) {
	jwtSecret := "test-secret-key-for-testing-12345"

	mockUserRepo := newMockUserRepository()
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("Password123"), bcrypt.DefaultCost)
	hashedPasswordStr := string(hashedPassword)
	mockUserRepo.users["test@example.com"] = &models.User{
		ID:           1,
		Email:        strPtr("test@example.com"),
		Name:         "Test",
		PasswordHash: &hashedPasswordStr,
		AuthProvider: "email",
	}
	mockUserRepo.usersById[1] = mockUserRepo.users["test@example.com"]

	mockOTPRepo := newMockOTPRepository()
	handler := createTestHandler(mockUserRepo, mockOTPRepo, jwtSecret, nil)
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("user_id", int64(1))
		c.Next()
	})
	router.POST("/auth/resend-verification", handler.ResendVerification)

	// First request should succeed
	req := httptest.NewRequest(http.MethodPost, "/auth/resend-verification", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d: %s", w.Code, w.Body.String())
	}

	// Second request should be rate limited
	req2 := httptest.NewRequest(http.MethodPost, "/auth/resend-verification", nil)
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)

	if w2.Code != http.StatusTooManyRequests {
		t.Errorf("Expected 429, got %d: %s", w2.Code, w2.Body.String())
	}
}

func TestAuthHandler_RequestOTP_WithTurnstile(t *testing.T) {
	jwtSecret := "test-secret-key-for-testing-12345"

	// Start mock Turnstile server
	turnstileServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.ParseForm()
		token := r.FormValue("response")
		w.Header().Set("Content-Type", "application/json")
		if token == "valid-turnstile-token" {
			w.Write([]byte(`{"success":true}`))
		} else {
			w.Write([]byte(`{"success":false,"error-codes":["invalid-input-response"]}`))
		}
	}))
	defer turnstileServer.Close()

	turnstileSvc := services.NewTurnstileService("test-secret")
	turnstileSvc.SetVerifyURL(turnstileServer.URL)

	tests := []struct {
		name               string
		requestBody        interface{}
		expectedStatusCode int
	}{
		{
			name: "OTP request with valid turnstile token",
			requestBody: map[string]string{
				"email":           "test@example.com",
				"turnstile_token": "valid-turnstile-token",
			},
			expectedStatusCode: http.StatusOK,
		},
		{
			name: "OTP request with invalid turnstile token",
			requestBody: map[string]string{
				"email":           "test@example.com",
				"turnstile_token": "bad-token",
			},
			expectedStatusCode: http.StatusBadRequest,
		},
		{
			name: "OTP request with missing turnstile token",
			requestBody: map[string]string{
				"email": "test2@example.com",
			},
			expectedStatusCode: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserRepo := newMockUserRepository()
			mockOTPRepo := newMockOTPRepository()
			handler := createTestHandler(mockUserRepo, mockOTPRepo, jwtSecret, turnstileSvc)
			router := setupTestRouter()
			router.POST("/auth/otp/request", handler.RequestOTP)

			body, _ := json.Marshal(tt.requestBody)
			req := httptest.NewRequest(http.MethodPost, "/auth/otp/request", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tt.expectedStatusCode {
				t.Errorf("Expected %d, got %d: %s", tt.expectedStatusCode, w.Code, w.Body.String())
			}
		})
	}
}
