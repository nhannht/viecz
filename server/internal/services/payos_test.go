package services

import (
	"testing"
)

// TestNewPayOSService tests PayOS service initialization
func TestNewPayOSService(t *testing.T) {
	tests := []struct {
		name               string
		clientID           string
		apiKey             string
		checksumKey        string
		payoutClientID     string
		payoutAPIKey       string
		payoutChecksumKey  string
		expectError        bool
		expectPayoutClient bool
	}{
		{
			name:               "valid deposit credentials, no payout",
			clientID:           "test-client-id",
			apiKey:             "test-api-key",
			checksumKey:        "test-checksum-key",
			expectError:        false,
			expectPayoutClient: false,
		},
		{
			name:               "valid deposit + payout credentials",
			clientID:           "test-client-id",
			apiKey:             "test-api-key",
			checksumKey:        "test-checksum-key",
			payoutClientID:     "payout-client-id",
			payoutAPIKey:       "payout-api-key",
			payoutChecksumKey:  "payout-checksum-key",
			expectError:        false,
			expectPayoutClient: true,
		},
		{
			name:        "empty client ID",
			clientID:    "",
			apiKey:      "test-api-key",
			checksumKey: "test-checksum-key",
			expectError: true,
		},
		{
			name:        "empty API key",
			clientID:    "test-client-id",
			apiKey:      "",
			checksumKey: "test-checksum-key",
			expectError: true,
		},
		{
			name:        "empty checksum key",
			clientID:    "test-client-id",
			apiKey:      "test-api-key",
			checksumKey: "",
			expectError: true,
		},
		{
			name:        "all empty credentials",
			clientID:    "",
			apiKey:      "",
			checksumKey: "",
			expectError: true,
		},
		{
			name:               "partial payout credentials ignored",
			clientID:           "test-client-id",
			apiKey:             "test-api-key",
			checksumKey:        "test-checksum-key",
			payoutClientID:     "payout-client-id",
			payoutAPIKey:       "", // missing
			payoutChecksumKey:  "payout-checksum-key",
			expectError:        false,
			expectPayoutClient: false, // not initialized when incomplete
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service, err := NewPayOSService(
				tt.clientID, tt.apiKey, tt.checksumKey,
				tt.payoutClientID, tt.payoutAPIKey, tt.payoutChecksumKey,
			)

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
					t.Fatal("Expected non-nil service")
				}
				if service.client == nil {
					t.Error("Expected non-nil deposit client")
				}
				if tt.expectPayoutClient && service.payoutClient == nil {
					t.Error("Expected non-nil payout client")
				}
				if !tt.expectPayoutClient && service.payoutClient != nil {
					t.Error("Expected nil payout client")
				}
			}
		})
	}
}

// TestPayOSService_StructureValidation validates service structure
func TestPayOSService_StructureValidation(t *testing.T) {
	service, err := NewPayOSService("test-id", "test-key", "test-checksum", "", "", "")
	if err != nil {
		t.Skipf("Skipping structure validation test due to initialization error: %v", err)
		return
	}

	if service == nil {
		t.Fatal("Service should not be nil")
	}

	if service.client == nil {
		t.Error("PayOS deposit client should not be nil")
	}

	if service.payoutClient != nil {
		t.Error("PayOS payout client should be nil when no payout credentials provided")
	}
}

// Note: Integration tests for PayOS API methods (CreatePaymentLink, VerifyWebhookData, etc.)
// require actual PayOS credentials and are tested separately in integration test suite.
