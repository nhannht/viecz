package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/models"
)

func setupMiddlewareTestRouter(userRepo *mockUserRepository, jwtSecret string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	protected := router.Group("/test")
	protected.Use(AuthRequired(jwtSecret), EmailVerifiedRequired(userRepo))
	protected.GET("", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "ok"})
	})

	return router
}

func TestEmailVerifiedRequired_VerifiedPasses(t *testing.T) {
	secret := "test-secret"
	repo := newMockUserRepository()

	user := &models.User{
		ID:            1,
		Email:         strPtr("verified@example.com"),
		Name:          "Verified User",
		AuthProvider:  "email",
		EmailVerified: true,
	}
	repo.users["verified@example.com"] = user

	router := setupMiddlewareTestRouter(repo, secret)

	token, _ := GenerateAccessToken(user, secret, 30)
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEmailVerifiedRequired_UnverifiedReturns403(t *testing.T) {
	secret := "test-secret"
	repo := newMockUserRepository()

	user := &models.User{
		ID:            1,
		Email:         strPtr("unverified@example.com"),
		Name:          "Unverified User",
		AuthProvider:  "email",
		EmailVerified: false,
	}
	repo.users["unverified@example.com"] = user

	router := setupMiddlewareTestRouter(repo, secret)

	token, _ := GenerateAccessToken(user, secret, 30)
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("Expected 403, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEmailVerifiedRequired_GoogleUserPasses(t *testing.T) {
	secret := "test-secret"
	repo := newMockUserRepository()

	googleID := "google123"
	user := &models.User{
		ID:            1,
		Email:         strPtr("google@example.com"),
		Name:          "Google User",
		AuthProvider:  "google",
		GoogleID:      &googleID,
		EmailVerified: true,
	}
	repo.users[*user.Email] = user

	router := setupMiddlewareTestRouter(repo, secret)

	token, _ := GenerateAccessToken(user, secret, 30)
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEmailVerifiedRequired_NoAuthReturns401(t *testing.T) {
	secret := "test-secret"
	repo := newMockUserRepository()

	router := setupMiddlewareTestRouter(repo, secret)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401, got %d: %s", w.Code, w.Body.String())
	}
}
