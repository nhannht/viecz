package services

import (
	"fmt"
	"strings"

	emailverifier "github.com/AfterShip/email-verifier"
)

// EmailVerifierService validates email domains during registration.
type EmailVerifierService interface {
	ValidateEmailDomain(email string) error
}

// Sentinel errors for email validation failures.
var (
	ErrNoMXRecords     = fmt.Errorf("email domain does not have valid mail servers")
	ErrDisposableEmail = fmt.Errorf("disposable email addresses are not allowed")
	ErrRoleAccount     = fmt.Errorf("role-based email addresses are not allowed")
)

// RealEmailVerifier uses AfterShip/email-verifier for DNS-based checks.
type RealEmailVerifier struct {
	verifier *emailverifier.Verifier
}

func NewRealEmailVerifier() *RealEmailVerifier {
	v := emailverifier.NewVerifier().EnableAutoUpdateDisposable()
	return &RealEmailVerifier{verifier: v}
}

func (r *RealEmailVerifier) ValidateEmailDomain(email string) error {
	parts := strings.SplitN(email, "@", 2)
	if len(parts) != 2 {
		return fmt.Errorf("invalid email format")
	}
	domain := parts[1]
	localPart := parts[0]

	// Check MX records
	mx, err := r.verifier.CheckMX(domain)
	if err != nil || !mx.HasMXRecord {
		return ErrNoMXRecords
	}

	// Check disposable domain
	if r.verifier.IsDisposable(domain) {
		return ErrDisposableEmail
	}

	// Check role account (admin@, info@, support@, etc.)
	if r.verifier.IsRoleAccount(localPart) {
		return ErrRoleAccount
	}

	return nil
}

// NoOpEmailVerifier always passes. Used in test server and unit tests.
type NoOpEmailVerifier struct{}

func (n *NoOpEmailVerifier) ValidateEmailDomain(email string) error {
	return nil
}
