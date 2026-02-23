package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/auth"
	"viecz.vieczserver/internal/models"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct {
	authService        *auth.AuthService
	googleOAuthService *auth.GoogleOAuthService
	jwtSecret          string
	resendLimiter      *auth.ResendRateLimiter
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(authService *auth.AuthService, googleOAuthService *auth.GoogleOAuthService, jwtSecret string) *AuthHandler {
	return &AuthHandler{
		authService:        authService,
		googleOAuthService: googleOAuthService,
		jwtSecret:          jwtSecret,
		resendLimiter:      auth.NewResendRateLimiter(),
	}
}

// RegisterRequest represents the registration request
type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Name     string `json:"name" binding:"required"`
}

// LoginRequest represents the login request
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// GoogleLoginRequest represents the Google OAuth login request
type GoogleLoginRequest struct {
	IDToken string `json:"id_token" binding:"required"`
}

// TokenResponse represents the authentication response
type TokenResponse struct {
	AccessToken  string      `json:"access_token"`
	RefreshToken string      `json:"refresh_token"`
	User         interface{} `json:"user"`
}

// Register handles user registration
// POST /api/v1/auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Register user
	user, err := h.authService.Register(c.Request.Context(), req.Email, req.Password, req.Name)
	if err != nil {
		switch err {
		case auth.ErrInvalidEmail:
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid email format"})
		case auth.ErrDisposableEmail:
			c.JSON(http.StatusBadRequest, gin.H{"error": "disposable email addresses are not allowed"})
		case auth.ErrNoMXRecords:
			c.JSON(http.StatusBadRequest, gin.H{"error": "email domain does not have valid mail servers"})
		case auth.ErrRoleAccount:
			c.JSON(http.StatusBadRequest, gin.H{"error": "role-based email addresses (admin@, info@, etc.) are not allowed"})
		case auth.ErrWeakPassword:
			c.JSON(http.StatusBadRequest, gin.H{"error": "password must be at least 8 characters with uppercase, lowercase, and number"})
		case auth.ErrEmailAlreadyExists:
			c.JSON(http.StatusConflict, gin.H{"error": "email already exists"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to register user"})
		}
		return
	}

	// Generate tokens
	accessToken, err := auth.GenerateAccessToken(user, h.jwtSecret, 30) // 30 minutes
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate access token"})
		return
	}

	refreshToken, err := auth.GenerateRefreshToken(user, h.jwtSecret, 7) // 7 days
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate refresh token"})
		return
	}

	// Return response
	c.JSON(http.StatusCreated, TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         user,
	})
}

// Login handles user login
// POST /api/v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Login user
	user, err := h.authService.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		if err == auth.ErrInvalidCredentials {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to login"})
		}
		return
	}

	// Generate tokens
	accessToken, err := auth.GenerateAccessToken(user, h.jwtSecret, 30) // 30 minutes
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate access token"})
		return
	}

	refreshToken, err := auth.GenerateRefreshToken(user, h.jwtSecret, 7) // 7 days
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate refresh token"})
		return
	}

	// Return response
	c.JSON(http.StatusOK, TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         user,
	})
}

// GoogleLogin handles Google OAuth login
// POST /api/v1/auth/google
func (h *AuthHandler) GoogleLogin(c *gin.Context) {
	var req GoogleLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify Google ID token
	googleInfo, err := h.googleOAuthService.VerifyIDToken(c.Request.Context(), req.IDToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid Google ID token"})
		return
	}

	// Login or create user with Google info
	user, err := h.authService.LoginWithGoogle(c.Request.Context(), googleInfo)
	if err != nil {
		switch err {
		case auth.ErrEmailAlreadyUsedByEmail:
			c.JSON(http.StatusConflict, gin.H{"error": "email already registered with email/password authentication"})
		case auth.ErrGoogleAuthFailed:
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Google authentication failed"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to authenticate with Google"})
		}
		return
	}

	// Generate tokens
	accessToken, err := auth.GenerateAccessToken(user, h.jwtSecret, 30) // 30 minutes
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate access token"})
		return
	}

	refreshToken, err := auth.GenerateRefreshToken(user, h.jwtSecret, 7) // 7 days
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate refresh token"})
		return
	}

	// Return response
	c.JSON(http.StatusOK, TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         user,
	})
}

// RefreshToken handles token refresh
// POST /api/v1/auth/refresh
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate refresh token
	claims, err := auth.ValidateToken(req.RefreshToken, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid refresh token"})
		return
	}

	// Generate new access token
	// Note: In production, you'd want to fetch the user from database to get updated info
	user := &models.User{
		ID:       claims.UserID,
		Email:    claims.Email,
		Name:     claims.Name,
		IsTasker: claims.IsTasker,
	}

	accessToken, err := auth.GenerateAccessToken(user, h.jwtSecret, 30)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate access token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token": accessToken,
	})
}

// VerifyEmail handles email verification via token
// POST /api/v1/auth/verify-email
func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	var req struct {
		Token string `json:"token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "token is required"})
		return
	}

	if err := h.authService.VerifyEmail(c.Request.Context(), req.Token); err != nil {
		switch err {
		case auth.ErrEmailAlreadyVerified:
			c.JSON(http.StatusOK, gin.H{"message": "email is already verified"})
		case auth.ErrInvalidVerifyToken:
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or expired verification link"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify email"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "email verified successfully"})
}

// ResendVerification sends a new verification email
// POST /api/v1/auth/resend-verification
func (h *AuthHandler) ResendVerification(c *gin.Context) {
	userID, exists := auth.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authorization required"})
		return
	}

	// Rate limit
	if err := h.resendLimiter.Allow(userID); err != nil {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": err.Error()})
		return
	}

	if err := h.authService.SendVerificationEmail(c.Request.Context(), userID); err != nil {
		switch err {
		case auth.ErrEmailAlreadyVerified:
			c.JSON(http.StatusOK, gin.H{"message": "email is already verified"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to send verification email"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "verification email sent"})
}
