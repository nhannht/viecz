package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/services"
)

func TestUserHandler_GetProfile(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		userIDParam    string
		setupMock      func(*mockUserRepository)
		expectedStatus int
		checkResponse  func(*testing.T, *httptest.ResponseRecorder)
	}{
		{
			name:        "successfully get user profile",
			userIDParam: "1",
			setupMock: func(repo *mockUserRepository) {
				repo.usersById[1] = &models.User{
					ID:       1,
					Email:    strPtr("test@example.com"),
					Name:     "Test User",
					IsTasker: false,
				}
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var user models.User
				if err := json.Unmarshal(w.Body.Bytes(), &user); err != nil {
					t.Fatalf("Failed to unmarshal response: %v", err)
				}
				if user.Email == nil || *user.Email != "test@example.com" {
					t.Errorf("Expected email 'test@example.com', got '%v'", user.Email)
				}
			},
		},
		{
			name:           "invalid user ID",
			userIDParam:    "invalid",
			setupMock:      func(repo *mockUserRepository) {},
			expectedStatus: http.StatusBadRequest,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response map[string]string
				if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
					t.Fatalf("Failed to unmarshal response: %v", err)
				}
				if response["error"] != "invalid user ID" {
					t.Errorf("Expected error 'invalid user ID', got '%s'", response["error"])
				}
			},
		},
		{
			name:           "user not found",
			userIDParam:    "999",
			setupMock:      func(repo *mockUserRepository) {},
			expectedStatus: http.StatusNotFound,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response map[string]string
				if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
					t.Fatalf("Failed to unmarshal response: %v", err)
				}
				if _, exists := response["error"]; !exists {
					t.Error("Expected error field in response")
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			mockRepo := newMockUserRepository()
			if tt.setupMock != nil {
				tt.setupMock(mockRepo)
			}

			userService := services.NewUserService(mockRepo, nil)
			handler := NewUserHandler(userService)

			// Create request and response recorder
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request, _ = http.NewRequest(http.MethodGet, "/api/v1/users/"+tt.userIDParam, nil)
			c.Params = gin.Params{{Key: "id", Value: tt.userIDParam}}

			// Execute
			handler.GetProfile(c)

			// Assert
			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			if tt.checkResponse != nil {
				tt.checkResponse(t, w)
			}
		})
	}
}

func TestUserHandler_GetMyProfile(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		setUserID      bool
		userID         int64
		setupMock      func(*mockUserRepository)
		expectedStatus int
		checkResponse  func(*testing.T, *httptest.ResponseRecorder)
	}{
		{
			name:      "successfully get own profile",
			setUserID: true,
			userID:    1,
			setupMock: func(repo *mockUserRepository) {
				repo.usersById[1] = &models.User{
					ID:    1,
					Email: strPtr("test@example.com"),
					Name:  "Test User",
				}
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var user models.User
				if err := json.Unmarshal(w.Body.Bytes(), &user); err != nil {
					t.Fatalf("Failed to unmarshal response: %v", err)
				}
				if user.ID != 1 {
					t.Errorf("Expected user ID 1, got %d", user.ID)
				}
			},
		},
		{
			name:           "unauthorized - no user ID in context",
			setUserID:      false,
			setupMock:      func(repo *mockUserRepository) {},
			expectedStatus: http.StatusUnauthorized,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response map[string]string
				if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
					t.Fatalf("Failed to unmarshal response: %v", err)
				}
				if response["error"] != "unauthorized" {
					t.Errorf("Expected error 'unauthorized', got '%s'", response["error"])
				}
			},
		},
		{
			name:           "user not found",
			setUserID:      true,
			userID:         999,
			setupMock:      func(repo *mockUserRepository) {},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			mockRepo := newMockUserRepository()
			if tt.setupMock != nil {
				tt.setupMock(mockRepo)
			}

			userService := services.NewUserService(mockRepo, nil)
			handler := NewUserHandler(userService)

			// Create request and response recorder
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request, _ = http.NewRequest(http.MethodGet, "/api/v1/users/me", nil)

			// Set user ID in context if needed
			if tt.setUserID {
				c.Set("user_id", tt.userID)
			}

			// Execute
			handler.GetMyProfile(c)

			// Assert
			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			if tt.checkResponse != nil {
				tt.checkResponse(t, w)
			}
		})
	}
}

func TestUserHandler_UpdateProfile(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		setUserID      bool
		userID         int64
		requestBody    interface{}
		setupMock      func(*mockUserRepository)
		expectedStatus int
		checkResponse  func(*testing.T, *httptest.ResponseRecorder)
	}{
		{
			name:      "successfully update profile",
			setUserID: true,
			userID:    1,
			requestBody: services.UpdateProfileInput{
				Name: stringPtr("Updated Name"),
			},
			setupMock: func(repo *mockUserRepository) {
				repo.usersById[1] = &models.User{
					ID:    1,
					Email: strPtr("old@example.com"),
					Name:  "Old Name",
				}
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var user models.User
				if err := json.Unmarshal(w.Body.Bytes(), &user); err != nil {
					t.Fatalf("Failed to unmarshal response: %v", err)
				}
				if user.Name != "Updated Name" {
					t.Errorf("Expected name 'Updated Name', got '%s'", user.Name)
				}
			},
		},
		{
			name:           "unauthorized - no user ID",
			setUserID:      false,
			requestBody:    services.UpdateProfileInput{},
			setupMock:      func(repo *mockUserRepository) {},
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "invalid JSON body",
			setUserID:      true,
			userID:         1,
			requestBody:    "invalid json",
			setupMock:      func(repo *mockUserRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:      "repository error",
			setUserID: true,
			userID:    1,
			requestBody: services.UpdateProfileInput{
				Name: stringPtr("Test"),
			},
			setupMock: func(repo *mockUserRepository) {
				repo.usersById[1] = &models.User{
					ID:    1,
					Email: strPtr("test@example.com"),
					Name:  "Test",
				}
				repo.shouldFail = true
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			mockRepo := newMockUserRepository()
			if tt.setupMock != nil {
				tt.setupMock(mockRepo)
			}

			userService := services.NewUserService(mockRepo, nil)
			handler := NewUserHandler(userService)

			// Create request body
			var bodyBytes []byte
			var err error
			if str, ok := tt.requestBody.(string); ok {
				bodyBytes = []byte(str)
			} else {
				bodyBytes, err = json.Marshal(tt.requestBody)
				if err != nil {
					t.Fatalf("Failed to marshal request body: %v", err)
				}
			}

			// Create request and response recorder
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request, _ = http.NewRequest(http.MethodPut, "/api/v1/users/me", bytes.NewBuffer(bodyBytes))
			c.Request.Header.Set("Content-Type", "application/json")

			// Set user ID in context if needed
			if tt.setUserID {
				c.Set("user_id", tt.userID)
			}

			// Execute
			handler.UpdateProfile(c)

			// Assert
			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			if tt.checkResponse != nil {
				tt.checkResponse(t, w)
			}
		})
	}
}

func TestUserHandler_BecomeTasker(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		setUserID      bool
		userID         int64
		setupMock      func(*mockUserRepository)
		expectedStatus int
		checkResponse  func(*testing.T, *httptest.ResponseRecorder)
	}{
		{
			name:      "successfully become tasker",
			setUserID: true,
			userID:    1,
			setupMock: func(repo *mockUserRepository) {
				repo.usersById[1] = &models.User{
					ID:       1,
					Email:    strPtr("test@example.com"),
					IsTasker: false,
				}
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var user models.User
				if err := json.Unmarshal(w.Body.Bytes(), &user); err != nil {
					t.Fatalf("Failed to unmarshal response: %v", err)
				}
				if !user.IsTasker {
					t.Error("Expected user to be a tasker")
				}
			},
		},
		{
			name:           "unauthorized - no user ID",
			setUserID:      false,
			setupMock:      func(repo *mockUserRepository) {},
			expectedStatus: http.StatusUnauthorized,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response map[string]string
				if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
					t.Fatalf("Failed to unmarshal response: %v", err)
				}
				if response["error"] != "unauthorized" {
					t.Errorf("Expected error 'unauthorized', got '%s'", response["error"])
				}
			},
		},
		{
			name:      "already a tasker",
			setUserID: true,
			userID:    1,
			setupMock: func(repo *mockUserRepository) {
				repo.usersById[1] = &models.User{
					ID:       1,
					Email:    strPtr("test@example.com"),
					IsTasker: true,
				}
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			mockRepo := newMockUserRepository()
			if tt.setupMock != nil {
				tt.setupMock(mockRepo)
			}

			userService := services.NewUserService(mockRepo, nil)
			handler := NewUserHandler(userService)

			// Create request and response recorder
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request, _ = http.NewRequest(http.MethodPost, "/api/v1/users/become-tasker", nil)

			// Set user ID in context if needed
			if tt.setUserID {
				c.Set("user_id", tt.userID)
			}

			// Execute
			handler.BecomeTasker(c)

			// Assert
			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			if tt.checkResponse != nil {
				tt.checkResponse(t, w)
			}
		})
	}
}

func stringPtr(s string) *string {
	return &s
}
