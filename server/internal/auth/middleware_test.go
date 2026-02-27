package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/models"
)

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return gin.New()
}

func TestAuthRequired(t *testing.T) {
	secret := "test-secret-key-for-jwt-testing-12345"
	user := &models.User{
		ID:    123,
		Email: strPtr("test@example.com"),
		Name:  "Test User",
	}

	validToken, _ := GenerateAccessToken(user, secret, 30)

	tests := []struct {
		name           string
		authHeader     string
		wantStatusCode int
		wantUserID     bool
	}{
		{
			name:           "valid bearer token",
			authHeader:     "Bearer " + validToken,
			wantStatusCode: http.StatusOK,
			wantUserID:     true,
		},
		{
			name:           "missing authorization header",
			authHeader:     "",
			wantStatusCode: http.StatusUnauthorized,
			wantUserID:     false,
		},
		{
			name:           "invalid token format - no Bearer prefix",
			authHeader:     validToken,
			wantStatusCode: http.StatusUnauthorized,
			wantUserID:     false,
		},
		{
			name:           "invalid token format - Bearer only",
			authHeader:     "Bearer",
			wantStatusCode: http.StatusUnauthorized,
			wantUserID:     false,
		},
		{
			name:           "invalid token - malformed",
			authHeader:     "Bearer invalid.token.here",
			wantStatusCode: http.StatusUnauthorized,
			wantUserID:     false,
		},
		{
			name:           "invalid token - wrong secret",
			authHeader:     "Bearer " + func() string { token, _ := GenerateAccessToken(user, "wrong-secret", 30); return token }(),
			wantStatusCode: http.StatusUnauthorized,
			wantUserID:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := setupTestRouter()

			var capturedUserID int64
			router.GET("/protected", AuthRequired(secret), func(c *gin.Context) {
				// Get user ID from context
				userID, exists := GetUserID(c)
				if exists {
					capturedUserID = userID
				}
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req := httptest.NewRequest("GET", "/protected", nil)
			if tt.authHeader != "" {
				req.Header.Set("Authorization", tt.authHeader)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tt.wantStatusCode {
				t.Errorf("Expected status code %d, got %d", tt.wantStatusCode, w.Code)
			}

			if tt.wantUserID {
				if capturedUserID == 0 {
					t.Error("Expected user_id to be set in context, got 0")
				} else {
					if capturedUserID != user.ID {
						t.Errorf("Expected UserID %d, got %d", user.ID, capturedUserID)
					}
				}
			}
		})
	}
}

func TestOptionalAuth(t *testing.T) {
	secret := "test-secret-key-for-jwt-testing-12345"
	user := &models.User{
		ID:    123,
		Email: strPtr("test@example.com"),
		Name:  "Test User",
	}

	validToken, _ := GenerateAccessToken(user, secret, 30)

	tests := []struct {
		name           string
		authHeader     string
		wantStatusCode int
		wantUserID     bool
	}{
		{
			name:           "valid bearer token",
			authHeader:     "Bearer " + validToken,
			wantStatusCode: http.StatusOK,
			wantUserID:     true,
		},
		{
			name:           "missing authorization header - still succeeds",
			authHeader:     "",
			wantStatusCode: http.StatusOK,
			wantUserID:     false,
		},
		{
			name:           "invalid token - still succeeds",
			authHeader:     "Bearer invalid.token.here",
			wantStatusCode: http.StatusOK,
			wantUserID:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := setupTestRouter()

			var capturedUserID int64
			router.GET("/optional", OptionalAuth(secret), func(c *gin.Context) {
				// Get user ID from context
				userID, exists := GetUserID(c)
				if exists {
					capturedUserID = userID
				}
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req := httptest.NewRequest("GET", "/optional", nil)
			if tt.authHeader != "" {
				req.Header.Set("Authorization", tt.authHeader)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tt.wantStatusCode {
				t.Errorf("Expected status code %d, got %d", tt.wantStatusCode, w.Code)
			}

			if tt.wantUserID {
				if capturedUserID == 0 {
					t.Error("Expected user_id to be set in context, got 0")
				} else {
					if capturedUserID != user.ID {
						t.Errorf("Expected UserID %d, got %d", user.ID, capturedUserID)
					}
				}
			}
		})
	}
}

func TestGetUserID(t *testing.T) {
	tests := []struct {
		name       string
		setupCtx   func() *gin.Context
		wantUserID int64
		wantExists bool
	}{
		{
			name: "valid user_id in context",
			setupCtx: func() *gin.Context {
				c, _ := gin.CreateTestContext(httptest.NewRecorder())
				c.Set("user_id", int64(123))
				return c
			},
			wantUserID: 123,
			wantExists: true,
		},
		{
			name: "no user_id in context",
			setupCtx: func() *gin.Context {
				c, _ := gin.CreateTestContext(httptest.NewRecorder())
				return c
			},
			wantUserID: 0,
			wantExists: false,
		},
		{
			name: "wrong type in context",
			setupCtx: func() *gin.Context {
				c, _ := gin.CreateTestContext(httptest.NewRecorder())
				c.Set("user_id", "not-an-int64")
				return c
			},
			wantUserID: 0,
			wantExists: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := tt.setupCtx()
			userID, exists := GetUserID(c)

			if exists != tt.wantExists {
				t.Errorf("Expected exists=%v, got %v", tt.wantExists, exists)
			}

			if userID != tt.wantUserID {
				t.Errorf("Expected UserID %d, got %d", tt.wantUserID, userID)
			}
		})
	}
}
