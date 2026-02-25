package auth

import (
	"context"
	"testing"
)

func TestNoOpFirebaseVerifier_AcceptsPhoneAsToken(t *testing.T) {
	v := &NoOpFirebaseVerifier{}
	phone, err := v.VerifyPhoneToken(context.Background(), "+84912345678")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if phone != "+84912345678" {
		t.Errorf("expected +84912345678, got %s", phone)
	}
}

func TestNoOpFirebaseVerifier_RejectsEmptyToken(t *testing.T) {
	v := &NoOpFirebaseVerifier{}
	_, err := v.VerifyPhoneToken(context.Background(), "")
	if err == nil {
		t.Error("expected error for empty token")
	}
}

func TestNoOpFirebaseVerifier_AcceptsVariousPhoneFormats(t *testing.T) {
	v := &NoOpFirebaseVerifier{}

	phones := []string{
		"+84912345678",
		"+1234567890",
		"+442071234567",
	}

	for _, phone := range phones {
		result, err := v.VerifyPhoneToken(context.Background(), phone)
		if err != nil {
			t.Errorf("unexpected error for phone %s: %v", phone, err)
		}
		if result != phone {
			t.Errorf("expected %s, got %s", phone, result)
		}
	}
}
