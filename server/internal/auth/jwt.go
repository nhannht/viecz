package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"viecz.vieczserver/internal/models"
)

// Claims represents the JWT claims
type Claims struct {
	UserID int64  `json:"sub"`
	Email  string `json:"email"`
	Name   string `json:"name"`
	jwt.RegisteredClaims
}

// userEmail safely dereferences the user's Email pointer, returning "" if nil.
func userEmail(user *models.User) string {
	if user.Email != nil {
		return *user.Email
	}
	return ""
}

// GenerateAccessToken generates a JWT access token for a user
func GenerateAccessToken(user *models.User, secret string, expiryMinutes int) (string, error) {
	claims := Claims{
		UserID: user.ID,
		Email:  userEmail(user),
		Name:   user.Name,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expiryMinutes) * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

// GenerateRefreshToken generates a refresh token (longer lived)
func GenerateRefreshToken(user *models.User, secret string, expiryDays int) (string, error) {
	claims := Claims{
		UserID: user.ID,
		Email:  userEmail(user),
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expiryDays) * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", fmt.Errorf("failed to sign refresh token: %w", err)
	}

	return tokenString, nil
}

// EmailVerifyClaims represents claims for email verification tokens.
type EmailVerifyClaims struct {
	UserID  int64  `json:"sub"`
	Email   string `json:"email"`
	Purpose string `json:"purpose"` // "email_verify"
	jwt.RegisteredClaims
}

// GenerateEmailVerifyToken generates a JWT token for email verification (1h expiry).
func GenerateEmailVerifyToken(userID int64, email, secret string) (string, error) {
	claims := EmailVerifyClaims{
		UserID:  userID,
		Email:   email,
		Purpose: "email_verify",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", fmt.Errorf("failed to sign email verify token: %w", err)
	}

	return tokenString, nil
}

// ValidateEmailVerifyToken validates an email verification token and returns the claims.
func ValidateEmailVerifyToken(tokenString, secret string) (*EmailVerifyClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &EmailVerifyClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse email verify token: %w", err)
	}

	claims, ok := token.Claims.(*EmailVerifyClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid email verify token")
	}

	if claims.Purpose != "email_verify" {
		return nil, fmt.Errorf("token is not an email verification token")
	}

	return claims, nil
}

// ValidateToken validates a JWT token and returns the claims
func ValidateToken(tokenString string, secret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Verify signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return claims, nil
}
