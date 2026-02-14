package auth

import (
	"context"
	"fmt"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

// GoogleOAuthService handles Google OAuth authentication
type GoogleOAuthService struct {
	verifier *oidc.IDTokenVerifier
	config   *oauth2.Config
}

// GoogleUserInfo contains user information extracted from Google ID token
type GoogleUserInfo struct {
	GoogleID      string
	Email         string
	Name          string
	AvatarURL     string
	EmailVerified bool
}

// NewGoogleOAuthService creates a new GoogleOAuthService
func NewGoogleOAuthService(clientID, clientSecret, redirectURL string) (*GoogleOAuthService, error) {
	provider, err := oidc.NewProvider(context.Background(), "https://accounts.google.com")
	if err != nil {
		return nil, fmt.Errorf("failed to create OIDC provider: %w", err)
	}

	verifier := provider.Verifier(&oidc.Config{
		ClientID: clientID,
	})

	config := &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Endpoint:     google.Endpoint,
		Scopes:       []string{oidc.ScopeOpenID, "profile", "email"},
	}

	return &GoogleOAuthService{
		verifier: verifier,
		config:   config,
	}, nil
}

// VerifyIDToken verifies a Google ID token and extracts user information
func (s *GoogleOAuthService) VerifyIDToken(ctx context.Context, idToken string) (*GoogleUserInfo, error) {
	// Verify the ID token signature and claims
	token, err := s.verifier.Verify(ctx, idToken)
	if err != nil {
		return nil, fmt.Errorf("failed to verify ID token: %w", err)
	}

	// Extract claims from the token
	var claims struct {
		Email         string `json:"email"`
		EmailVerified bool   `json:"email_verified"`
		Name          string `json:"name"`
		Picture       string `json:"picture"`
		Sub           string `json:"sub"` // Google's unique user ID
	}

	if err := token.Claims(&claims); err != nil {
		return nil, fmt.Errorf("failed to parse claims: %w", err)
	}

	// Ensure email is verified
	if !claims.EmailVerified {
		return nil, fmt.Errorf("email not verified by Google")
	}

	return &GoogleUserInfo{
		GoogleID:      claims.Sub,
		Email:         claims.Email,
		Name:          claims.Name,
		AvatarURL:     claims.Picture,
		EmailVerified: claims.EmailVerified,
	}, nil
}
