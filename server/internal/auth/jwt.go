package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"viecz.vieczserver/internal/models"
)

// Claims represents the JWT claims
type Claims struct {
	UserID   int64  `json:"sub"`
	Email    string `json:"email"`
	Name     string `json:"name"`
	IsTasker bool   `json:"is_tasker"`
	jwt.RegisteredClaims
}

// GenerateAccessToken generates a JWT access token for a user
func GenerateAccessToken(user *models.User, secret string, expiryMinutes int) (string, error) {
	claims := Claims{
		UserID:   user.ID,
		Email:    user.Email,
		Name:     user.Name,
		IsTasker: user.IsTasker,
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
		Email:  user.Email,
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
