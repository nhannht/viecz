package auth

import (
	"context"
	"fmt"

	firebase "firebase.google.com/go/v4"
	firebaseAuth "firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

// FirebaseVerifier verifies Firebase ID tokens.
type FirebaseVerifier interface {
	VerifyPhoneToken(ctx context.Context, idToken string) (phoneNumber string, err error)
}

// FirebaseService implements FirebaseVerifier using the Firebase Admin SDK.
type FirebaseService struct {
	authClient *firebaseAuth.Client
}

// NewFirebaseService creates a FirebaseService from a service account JSON file.
func NewFirebaseService(credentialsFile string) (*FirebaseService, error) {
	ctx := context.Background()
	app, err := firebase.NewApp(ctx, nil, option.WithCredentialsFile(credentialsFile))
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Firebase app: %w", err)
	}

	authClient, err := app.Auth(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get Firebase auth client: %w", err)
	}

	return &FirebaseService{authClient: authClient}, nil
}

// VerifyPhoneToken verifies a Firebase ID token and extracts the phone number.
// Returns the phone number from the token claims.
func (s *FirebaseService) VerifyPhoneToken(ctx context.Context, idToken string) (string, error) {
	token, err := s.authClient.VerifyIDToken(ctx, idToken)
	if err != nil {
		return "", fmt.Errorf("invalid Firebase ID token: %w", err)
	}

	// Verify the sign-in provider is phone
	if token.Firebase.SignInProvider != "phone" {
		return "", fmt.Errorf("token is not from phone authentication (provider: %s)", token.Firebase.SignInProvider)
	}

	// Extract phone number from claims
	phoneNumber, ok := token.Claims["phone_number"].(string)
	if !ok || phoneNumber == "" {
		return "", fmt.Errorf("phone number not found in token claims")
	}

	return phoneNumber, nil
}

// NoOpFirebaseVerifier is a mock verifier for testing that accepts any token.
type NoOpFirebaseVerifier struct{}

// VerifyPhoneToken in mock mode extracts the phone from the token string directly.
// For testing, pass the phone number AS the token (e.g., "+84912345678").
func (n *NoOpFirebaseVerifier) VerifyPhoneToken(_ context.Context, idToken string) (string, error) {
	if idToken == "" {
		return "", fmt.Errorf("empty token")
	}
	// In test mode, the "token" IS the phone number
	return idToken, nil
}
