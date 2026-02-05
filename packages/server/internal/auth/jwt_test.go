package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"viecz.vieczserver/internal/models"
)

func TestGenerateAccessToken(t *testing.T) {
	secret := "test-secret-key-for-jwt-testing-12345"
	user := &models.User{
		ID:       123,
		Email:    "test@example.com",
		Name:     "Test User",
		IsTasker: true,
	}
	expiryMinutes := 30

	token, err := GenerateAccessToken(user, secret, expiryMinutes)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if token == "" {
		t.Fatal("Expected token to be generated, got empty string")
	}

	// Validate the token
	claims, err := ValidateToken(token, secret)
	if err != nil {
		t.Fatalf("Failed to validate token: %v", err)
	}

	// Verify claims
	if claims.UserID != user.ID {
		t.Errorf("Expected UserID claim to be %d, got %d", user.ID, claims.UserID)
	}

	if claims.Email != user.Email {
		t.Errorf("Expected Email claim to be %s, got %s", user.Email, claims.Email)
	}

	if claims.Name != user.Name {
		t.Errorf("Expected Name claim to be %s, got %s", user.Name, claims.Name)
	}

	if claims.IsTasker != user.IsTasker {
		t.Errorf("Expected IsTasker claim to be %v, got %v", user.IsTasker, claims.IsTasker)
	}

	// Verify token expiration
	expectedExp := time.Now().Add(time.Duration(expiryMinutes) * time.Minute).Unix()
	actualExp := claims.ExpiresAt.Unix()
	if actualExp < expectedExp-60 || actualExp > expectedExp+60 {
		t.Errorf("Expected exp to be around %d, got %d", expectedExp, actualExp)
	}
}

func TestGenerateRefreshToken(t *testing.T) {
	secret := "test-secret-key-for-jwt-testing-12345"
	user := &models.User{
		ID:    123,
		Email: "test@example.com",
	}
	expiryDays := 7

	token, err := GenerateRefreshToken(user, secret, expiryDays)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if token == "" {
		t.Fatal("Expected token to be generated, got empty string")
	}

	// Validate the token
	claims, err := ValidateToken(token, secret)
	if err != nil {
		t.Fatalf("Failed to validate token: %v", err)
	}

	// Verify claims
	if claims.UserID != user.ID {
		t.Errorf("Expected UserID claim to be %d, got %d", user.ID, claims.UserID)
	}

	if claims.Email != user.Email {
		t.Errorf("Expected Email claim to be %s, got %s", user.Email, claims.Email)
	}

	// Verify token expiration (should be 7 days)
	expectedExp := time.Now().Add(time.Duration(expiryDays) * 24 * time.Hour).Unix()
	actualExp := claims.ExpiresAt.Unix()
	if actualExp < expectedExp-60 || actualExp > expectedExp+60 {
		t.Errorf("Expected exp to be around %d, got %d", expectedExp, actualExp)
	}
}

func TestValidateToken(t *testing.T) {
	secret := "test-secret-key-for-jwt-testing-12345"

	tests := []struct {
		name        string
		setupToken  func() string
		wantErr     bool
		errContains string
	}{
		{
			name: "valid access token",
			setupToken: func() string {
				user := &models.User{
					ID:       123,
					Email:    "test@example.com",
					Name:     "Test",
					IsTasker: false,
				}
				token, _ := GenerateAccessToken(user, secret, 30)
				return token
			},
			wantErr: false,
		},
		{
			name: "valid refresh token",
			setupToken: func() string {
				user := &models.User{
					ID:    123,
					Email: "test@example.com",
				}
				token, _ := GenerateRefreshToken(user, secret, 7)
				return token
			},
			wantErr: false,
		},
		{
			name: "expired token",
			setupToken: func() string {
				// Create token with past expiration
				claims := Claims{
					UserID: 123,
					Email:  "test@example.com",
					RegisteredClaims: jwt.RegisteredClaims{
						ExpiresAt: jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)),
						IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
						NotBefore: jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
					},
				}
				token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
				tokenString, _ := token.SignedString([]byte(secret))
				return tokenString
			},
			wantErr:     true,
			errContains: "expired",
		},
		{
			name: "invalid signature",
			setupToken: func() string {
				user := &models.User{
					ID:       123,
					Email:    "test@example.com",
					Name:     "Test",
					IsTasker: false,
				}
				token, _ := GenerateAccessToken(user, "wrong-secret", 30)
				return token
			},
			wantErr:     true,
			errContains: "invalid",
		},
		{
			name: "malformed token",
			setupToken: func() string {
				return "not.a.valid.jwt.token"
			},
			wantErr:     true,
			errContains: "invalid",
		},
		{
			name: "empty token",
			setupToken: func() string {
				return ""
			},
			wantErr:     true,
			errContains: "invalid",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token := tt.setupToken()
			claims, err := ValidateToken(token, secret)

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
				if claims == nil {
					t.Error("Expected claims to be returned, got nil")
				}
				if claims != nil {
					if claims.UserID == 0 {
						t.Error("Expected UserID claim to exist")
					}
					if claims.Email == "" {
						t.Error("Expected Email claim to exist")
					}
				}
			}
		})
	}
}

func TestTokenRoundTrip(t *testing.T) {
	secret := "test-secret-key-for-jwt-testing-12345"
	user := &models.User{
		ID:       999,
		Email:    "roundtrip@example.com",
		Name:     "Round Trip User",
		IsTasker: true,
	}

	// Generate token
	token, err := GenerateAccessToken(user, secret, 30)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	// Validate token
	claims, err := ValidateToken(token, secret)
	if err != nil {
		t.Fatalf("Failed to validate token: %v", err)
	}

	// Verify claims match original data
	if claims.UserID != user.ID {
		t.Errorf("Expected UserID to be %d, got %d", user.ID, claims.UserID)
	}

	if claims.Email != user.Email {
		t.Errorf("Expected Email to be %s, got %s", user.Email, claims.Email)
	}

	if claims.Name != user.Name {
		t.Errorf("Expected Name to be %s, got %s", user.Name, claims.Name)
	}

	if claims.IsTasker != user.IsTasker {
		t.Errorf("Expected IsTasker to be %v, got %v", user.IsTasker, claims.IsTasker)
	}
}
