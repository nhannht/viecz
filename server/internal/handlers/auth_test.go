package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"viecz.vieczserver/internal/auth"
	"viecz.vieczserver/internal/models"
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

// Implement other UserRepository methods (not used in handler tests but required by interface)
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

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return gin.New()
}

func TestAuthHandler_Register(t *testing.T) {
	jwtSecret := "test-secret-key-for-testing-12345"

	tests := []struct {
		name               string
		requestBody        interface{}
		setupRepo          func(*mockUserRepository)
		expectedStatusCode int
		checkResponse      func(*testing.T, map[string]interface{})
	}{
		{
			name: "successful registration",
			requestBody: RegisterRequest{
				Email:    "test@example.com",
				Password: "Password123",
				Name:     "Test User",
			},
			setupRepo:          func(repo *mockUserRepository) {}, // Empty repo
			expectedStatusCode: http.StatusCreated,
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
			name: "invalid email format",
			requestBody: RegisterRequest{
				Email:    "invalid-email",
				Password: "Password123",
				Name:     "Test User",
			},
			setupRepo:          func(repo *mockUserRepository) {},
			expectedStatusCode: http.StatusBadRequest,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				if response["error"] == nil {
					t.Error("Expected error message in response")
				}
			},
		},
		{
			name: "weak password",
			requestBody: RegisterRequest{
				Email:    "test@example.com",
				Password: "weak",
				Name:     "Test User",
			},
			setupRepo:          func(repo *mockUserRepository) {},
			expectedStatusCode: http.StatusBadRequest,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				if response["error"] == nil {
					t.Error("Expected error message in response")
				}
			},
		},
		{
			name: "email already exists",
			requestBody: RegisterRequest{
				Email:    "existing@example.com",
				Password: "Password123",
				Name:     "Test User",
			},
			setupRepo: func(repo *mockUserRepository) {
				repo.users["existing@example.com"] = &models.User{
					ID:    1,
					Email: strPtr("existing@example.com"),
					Name:  "Existing User",
				}
			},
			expectedStatusCode: http.StatusConflict,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				if response["error"] == nil {
					t.Error("Expected error message in response")
				}
				errorMsg := response["error"].(string)
				if errorMsg != "email already exists" {
					t.Errorf("Expected 'email already exists', got '%s'", errorMsg)
				}
			},
		},
		{
			name: "missing required fields",
			requestBody: map[string]interface{}{
				"email": "test@example.com",
				// Missing password and name
			},
			setupRepo:          func(repo *mockUserRepository) {},
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
			// Setup
			mockUserRepo := newMockUserRepository()
			if tt.setupRepo != nil {
				tt.setupRepo(mockUserRepo)
			}
			authService := auth.NewAuthService(mockUserRepo, &services.NoOpEmailVerifier{}, &services.NoOpEmailService{}, jwtSecret)
			handler := NewAuthHandler(authService, nil, jwtSecret, nil, nil, nil)
			router := setupTestRouter()
			router.POST("/auth/register", handler.Register)

			// Create request
			body, _ := json.Marshal(tt.requestBody)
			req := httptest.NewRequest(http.MethodPost, "/auth/register", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			// Execute
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Assert status code
			if w.Code != tt.expectedStatusCode {
				t.Errorf("Expected status code %d, got %d. Response: %s",
					tt.expectedStatusCode, w.Code, w.Body.String())
			}

			// Parse and check response
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

func TestAuthHandler_Login(t *testing.T) {
	jwtSecret := "test-secret-key-for-testing-12345"

	tests := []struct {
		name               string
		requestBody        interface{}
		setupRepo          func(*mockUserRepository)
		expectedStatusCode int
		checkResponse      func(*testing.T, map[string]interface{})
	}{
		{
			name: "successful login",
			requestBody: LoginRequest{
				Email:    "test@example.com",
				Password: "Password123",
			},
			setupRepo: func(repo *mockUserRepository) {
				// Create user with hashed password
				hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("Password123"), bcrypt.DefaultCost)
				hashedPasswordStr := string(hashedPassword)
				repo.users["test@example.com"] = &models.User{
					ID:           1,
					Email:        strPtr("test@example.com"),
					Name:         "Test User",
					PasswordHash: &hashedPasswordStr,
					AuthProvider: "email",
				}
			},
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
			name: "invalid credentials",
			requestBody: LoginRequest{
				Email:    "test@example.com",
				Password: "WrongPassword",
			},
			setupRepo: func(repo *mockUserRepository) {
				hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("Password123"), bcrypt.DefaultCost)
				hashedPasswordStr := string(hashedPassword)
				repo.users["test@example.com"] = &models.User{
					ID:           1,
					Email:        strPtr("test@example.com"),
					Name:         "Test User",
					PasswordHash: &hashedPasswordStr,
					AuthProvider: "email",
				}
			},
			expectedStatusCode: http.StatusUnauthorized,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				if response["error"] == nil {
					t.Error("Expected error message in response")
				}
				errorMsg := response["error"].(string)
				if errorMsg != "invalid email or password" {
					t.Errorf("Expected 'invalid email or password', got '%s'", errorMsg)
				}
			},
		},
		{
			name: "user not found",
			requestBody: LoginRequest{
				Email:    "nonexistent@example.com",
				Password: "Password123",
			},
			setupRepo:          func(repo *mockUserRepository) {},
			expectedStatusCode: http.StatusUnauthorized,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				if response["error"] == nil {
					t.Error("Expected error message in response")
				}
			},
		},
		{
			name: "missing password",
			requestBody: map[string]interface{}{
				"email": "test@example.com",
				// Missing password
			},
			setupRepo:          func(repo *mockUserRepository) {},
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
			// Setup
			mockUserRepo := newMockUserRepository()
			if tt.setupRepo != nil {
				tt.setupRepo(mockUserRepo)
			}
			authService := auth.NewAuthService(mockUserRepo, &services.NoOpEmailVerifier{}, &services.NoOpEmailService{}, jwtSecret)
			handler := NewAuthHandler(authService, nil, jwtSecret, nil, nil, nil)
			router := setupTestRouter()
			router.POST("/auth/login", handler.Login)

			// Create request
			body, _ := json.Marshal(tt.requestBody)
			req := httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			// Execute
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Assert status code
			if w.Code != tt.expectedStatusCode {
				t.Errorf("Expected status code %d, got %d. Response: %s",
					tt.expectedStatusCode, w.Code, w.Body.String())
			}

			// Parse and check response
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
				// Verify it's a valid token
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
			requestBody: map[string]interface{}{
				// Missing refresh_token field
			},
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
			// Setup
			mockUserRepo := newMockUserRepository()
			authService := auth.NewAuthService(mockUserRepo, &services.NoOpEmailVerifier{}, &services.NoOpEmailService{}, jwtSecret)
			handler := NewAuthHandler(authService, nil, jwtSecret, nil, nil, nil)
			router := setupTestRouter()
			router.POST("/auth/refresh", handler.RefreshToken)

			// Create request
			body, _ := json.Marshal(tt.requestBody)
			req := httptest.NewRequest(http.MethodPost, "/auth/refresh", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			// Execute
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Assert status code
			if w.Code != tt.expectedStatusCode {
				t.Errorf("Expected status code %d, got %d. Response: %s",
					tt.expectedStatusCode, w.Code, w.Body.String())
			}

			// Parse and check response
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
			authService := auth.NewAuthService(mockUserRepo, &services.NoOpEmailVerifier{}, &services.NoOpEmailService{}, jwtSecret)
			handler := NewAuthHandler(authService, nil, jwtSecret, nil, nil, nil)
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

	authService := auth.NewAuthService(mockUserRepo, &services.NoOpEmailVerifier{}, &services.NoOpEmailService{}, jwtSecret)
	handler := NewAuthHandler(authService, nil, jwtSecret, nil, nil, nil)
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

func TestAuthHandler_Register_WithTurnstile(t *testing.T) {
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
	// Override URL to point to mock server
	turnstileSvc.SetVerifyURL(turnstileServer.URL)

	tests := []struct {
		name               string
		requestBody        interface{}
		expectedStatusCode int
	}{
		{
			name: "register with valid turnstile token",
			requestBody: map[string]string{
				"email":           "test@example.com",
				"password":        "Password123",
				"name":            "Test User",
				"turnstile_token": "valid-turnstile-token",
			},
			expectedStatusCode: http.StatusCreated,
		},
		{
			name: "register with invalid turnstile token",
			requestBody: map[string]string{
				"email":           "test@example.com",
				"password":        "Password123",
				"name":            "Test User",
				"turnstile_token": "bad-token",
			},
			expectedStatusCode: http.StatusBadRequest,
		},
		{
			name: "register with missing turnstile token",
			requestBody: map[string]string{
				"email":    "test2@example.com",
				"password": "Password123",
				"name":     "Test User",
			},
			expectedStatusCode: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserRepo := newMockUserRepository()
			authService := auth.NewAuthService(mockUserRepo, &services.NoOpEmailVerifier{}, &services.NoOpEmailService{}, jwtSecret)
			handler := NewAuthHandler(authService, nil, jwtSecret, turnstileSvc, nil, nil)
			router := setupTestRouter()
			router.POST("/auth/register", handler.Register)

			body, _ := json.Marshal(tt.requestBody)
			req := httptest.NewRequest(http.MethodPost, "/auth/register", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tt.expectedStatusCode {
				t.Errorf("Expected %d, got %d: %s", tt.expectedStatusCode, w.Code, w.Body.String())
			}
		})
	}
}
