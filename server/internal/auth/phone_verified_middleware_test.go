package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/services"
)

func setupPhoneMiddlewareTestRouter(userRepo *mockUserRepository, jwtSecret string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	protected := router.Group("/test")
	protected.Use(AuthRequired(jwtSecret), PhoneVerifiedRequired(userRepo))
	protected.GET("", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "ok"})
	})

	return router
}

func TestPhoneVerifiedRequired_VerifiedPasses(t *testing.T) {
	secret := "test-secret"
	repo := newMockUserRepository()

	svc := NewAuthService(repo, &services.NoOpEmailVerifier{}, &services.NoOpEmailService{}, secret)
	user, _ := svc.Register(nil, "verified@example.com", "Password123", "Verified User")
	phone := "+84912345678"
	user.Phone = &phone
	user.PhoneVerified = true

	router := setupPhoneMiddlewareTestRouter(repo, secret)

	token, _ := GenerateAccessToken(user, secret, 30)
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestPhoneVerifiedRequired_UnverifiedReturns403(t *testing.T) {
	secret := "test-secret"
	repo := newMockUserRepository()

	svc := NewAuthService(repo, &services.NoOpEmailVerifier{}, &services.NoOpEmailService{}, secret)
	user, _ := svc.Register(nil, "unverified@example.com", "Password123", "Unverified User")
	// PhoneVerified defaults to false
	_ = user

	router := setupPhoneMiddlewareTestRouter(repo, secret)

	token, _ := GenerateAccessToken(user, secret, 30)
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("Expected 403, got %d: %s", w.Code, w.Body.String())
	}
}

func TestPhoneVerifiedRequired_NoAuthReturns401(t *testing.T) {
	secret := "test-secret"
	repo := newMockUserRepository()

	router := setupPhoneMiddlewareTestRouter(repo, secret)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

func TestPhoneVerifiedRequired_UserNotFoundReturns401(t *testing.T) {
	secret := "test-secret"
	repo := newMockUserRepository()

	// Create a token for a user that doesn't exist in the repo
	user := &models.User{
		ID:    999,
		Email: strPtr("ghost@example.com"),
		Name:  "Ghost User",
	}

	router := setupPhoneMiddlewareTestRouter(repo, secret)

	token, _ := GenerateAccessToken(user, secret, 30)
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401, got %d: %s", w.Code, w.Body.String())
	}
}
