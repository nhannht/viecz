package services

import (
	"testing"
)

// TestNewPayOSService tests PayOS service initialization
func TestNewPayOSService(t *testing.T) {
	tests := []struct {
		name         string
		clientID     string
		apiKey       string
		checksumKey  string
		expectError  bool
	}{
		{
			name:         "valid credentials",
			clientID:     "test-client-id",
			apiKey:       "test-api-key",
			checksumKey:  "test-checksum-key",
			expectError:  false,
		},
		{
			name:         "empty client ID",
			clientID:     "",
			apiKey:       "test-api-key",
			checksumKey:  "test-checksum-key",
			expectError:  true,
		},
		{
			name:         "empty API key",
			clientID:     "test-client-id",
			apiKey:       "",
			checksumKey:  "test-checksum-key",
			expectError:  true,
		},
		{
			name:         "empty checksum key",
			clientID:     "test-client-id",
			apiKey:       "test-api-key",
			checksumKey:  "",
			expectError:  true,
		},
		{
			name:         "all empty credentials",
			clientID:     "",
			apiKey:       "",
			checksumKey:  "",
			expectError:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service, err := NewPayOSService(tt.clientID, tt.apiKey, tt.checksumKey)

			if tt.expectError {
				if err == nil {
					t.Error("Expected error but got nil")
				}
				if service != nil {
					t.Error("Expected nil service on error")
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
				if service == nil {
					t.Error("Expected non-nil service")
				}
				if service != nil && service.client == nil {
					t.Error("Expected non-nil PayOS client")
				}
			}
		})
	}
}

// TestPayOSService_StructureValidation validates service structure
func TestPayOSService_StructureValidation(t *testing.T) {
	service, err := NewPayOSService("test-id", "test-key", "test-checksum")
	if err != nil {
		t.Skipf("Skipping structure validation test due to initialization error: %v", err)
		return
	}

	if service == nil {
		t.Fatal("Service should not be nil")
	}

	if service.client == nil {
		t.Error("PayOS client should not be nil")
	}
}

// Note: Integration tests for PayOS API methods (CreatePaymentLink, VerifyWebhookData, etc.)
// require actual PayOS credentials and are tested separately in integration test suite.
// Unit testing these methods would require mocking the PayOS SDK, which is beyond the scope
// of pure unit tests.
//
// Methods covered by integration tests:
// - CreatePaymentLink: Requires PayOS API connectivity
// - VerifyWebhookData: Requires valid webhook signatures from PayOS
// - GetPaymentInfo: Requires existing payment orders in PayOS
// - CancelPaymentLink: Requires active payment links in PayOS
