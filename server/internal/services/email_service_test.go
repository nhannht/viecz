package services

import (
	"testing"
)

func TestNoOpEmailService_SendVerificationEmail(t *testing.T) {
	svc := &NoOpEmailService{}
	err := svc.SendVerificationEmail("test@example.com", "Test User", "some-token")
	if err != nil {
		t.Errorf("NoOpEmailService should return nil, got: %v", err)
	}
}
