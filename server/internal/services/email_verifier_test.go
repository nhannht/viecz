package services

import (
	"testing"
)

func TestRealEmailVerifier_ValidDomain(t *testing.T) {
	v := NewRealEmailVerifier()
	err := v.ValidateEmailDomain("testperson@gmail.com")
	if err != nil {
		t.Errorf("Expected no error for testperson@gmail.com, got: %v", err)
	}
}

func TestRealEmailVerifier_DisposableDomain(t *testing.T) {
	v := NewRealEmailVerifier()
	err := v.ValidateEmailDomain("user@mailinator.com")
	if err != ErrDisposableEmail {
		t.Errorf("Expected ErrDisposableEmail for mailinator.com, got: %v", err)
	}
}

func TestRealEmailVerifier_NoMXRecords(t *testing.T) {
	v := NewRealEmailVerifier()
	err := v.ValidateEmailDomain("user@nonexistentdomain99999.invalid")
	if err != ErrNoMXRecords {
		t.Errorf("Expected ErrNoMXRecords for nonexistent domain, got: %v", err)
	}
}

func TestRealEmailVerifier_RoleAccount(t *testing.T) {
	v := NewRealEmailVerifier()
	err := v.ValidateEmailDomain("admin@gmail.com")
	if err != ErrRoleAccount {
		t.Errorf("Expected ErrRoleAccount for admin@gmail.com, got: %v", err)
	}
}

func TestNoOpEmailVerifier(t *testing.T) {
	v := &NoOpEmailVerifier{}
	err := v.ValidateEmailDomain("anything@whatever.fake")
	if err != nil {
		t.Errorf("NoOpEmailVerifier should always return nil, got: %v", err)
	}
}
