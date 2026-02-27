package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/auth"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
	"viecz.vieczserver/internal/services"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct {
	authService        *auth.AuthService
	googleOAuthService *auth.GoogleOAuthService
	turnstileService   *services.TurnstileService
	jwtSecret          string
	resendLimiter      *auth.ResendRateLimiter
	firebaseVerifier   auth.FirebaseVerifier
	userRepo           repository.UserRepository
}

// NewAuthHandler creates a new auth handler.
// turnstileService may be nil — if nil, Turnstile validation is skipped (dev/test).
// firebaseVerifier may be nil — if nil, phone verification returns 503.
// userRepo may be nil — required only for phone verification.
func NewAuthHandler(authService *auth.AuthService, googleOAuthService *auth.GoogleOAuthService, jwtSecret string, turnstileService *services.TurnstileService, firebaseVerifier auth.FirebaseVerifier, userRepo repository.UserRepository) *AuthHandler {
	return &AuthHandler{
		authService:        authService,
		googleOAuthService: googleOAuthService,
		turnstileService:   turnstileService,
		jwtSecret:          jwtSecret,
		resendLimiter:      auth.NewResendRateLimiter(),
		firebaseVerifier:   firebaseVerifier,
		userRepo:           userRepo,
	}
}

// RegisterRequest represents the registration request
type RegisterRequest struct {
	Email          string `json:"email" binding:"required,email"`
	Password       string `json:"password" binding:"required,min=8"`
	Name           string `json:"name" binding:"required"`
	TurnstileToken string `json:"turnstile_token"`
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

	// Verify Turnstile token (skip if service not configured)
	if h.turnstileService != nil {
		if err := h.turnstileService.Verify(req.TurnstileToken, c.ClientIP()); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "bot verification failed"})
			return
		}
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
	claimsEmail := claims.Email
	user := &models.User{
		ID:    claims.UserID,
		Email: &claimsEmail,
		Name:  claims.Name,
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

// VerifyPhone verifies a user's phone via Firebase ID token.
// POST /api/v1/auth/verify-phone
func (h *AuthHandler) VerifyPhone(c *gin.Context) {
	userID, exists := auth.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authorization required"})
		return
	}

	if h.firebaseVerifier == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "phone verification not configured"})
		return
	}

	var req struct {
		IDToken string `json:"id_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id_token is required"})
		return
	}

	phoneNumber, err := h.firebaseVerifier.VerifyPhoneToken(c.Request.Context(), req.IDToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "phone verification failed: " + err.Error()})
		return
	}

	// Update user's phone and phone_verified
	if err := h.userRepo.SetPhoneVerified(c.Request.Context(), userID, phoneNumber); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update phone verification"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"phone": phoneNumber, "phone_verified": true})
}

// PhoneLoginRequest represents the phone authentication request
type PhoneLoginRequest struct {
	IDToken string `json:"id_token" binding:"required"`
}

// PhoneLogin handles phone-first authentication via Firebase.
// POST /api/v1/auth/phone
func (h *AuthHandler) PhoneLogin(c *gin.Context) {
	if h.firebaseVerifier == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "phone authentication not configured"})
		return
	}

	var req PhoneLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id_token is required"})
		return
	}

	// Verify Firebase phone token
	phoneNumber, err := h.firebaseVerifier.VerifyPhoneToken(c.Request.Context(), req.IDToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "phone verification failed: " + err.Error()})
		return
	}

	// Try to find existing user by phone
	user, err := h.userRepo.GetByPhone(c.Request.Context(), phoneNumber)
	if err != nil {
		// User not found — create a new user
		user = &models.User{
			Phone:         &phoneNumber,
			PhoneVerified: true,
			AuthProvider:  "phone",
			EmailVerified: false,
			Name:          "User",
		}

		if createErr := h.userRepo.Create(c.Request.Context(), user); createErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
			return
		}
	}

	// Generate JWT tokens
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

	c.JSON(http.StatusOK, TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         user,
	})
}
