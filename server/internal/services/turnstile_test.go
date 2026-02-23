package services

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestTurnstileService_Verify(t *testing.T) {
	tests := []struct {
		name       string
		token      string
		remoteIP   string
		response   turnstileResponse
		httpStatus int
		wantErr    bool
		errMsg     string
	}{
		{
			name:     "success",
			token:    "valid-token",
			remoteIP: "1.2.3.4",
			response: turnstileResponse{Success: true},
			wantErr:  false,
		},
		{
			name:     "empty token",
			token:    "",
			remoteIP: "",
			wantErr:  true,
			errMsg:   "turnstile token is required",
		},
		{
			name:     "verification failed",
			token:    "bad-token",
			remoteIP: "1.2.3.4",
			response: turnstileResponse{
				Success:    false,
				ErrorCodes: []string{"invalid-input-response"},
			},
			wantErr: true,
			errMsg:  "turnstile verification failed: invalid-input-response",
		},
		{
			name:     "timeout or duplicate",
			token:    "used-token",
			remoteIP: "",
			response: turnstileResponse{
				Success:    false,
				ErrorCodes: []string{"timeout-or-duplicate"},
			},
			wantErr: true,
			errMsg:  "turnstile verification failed: timeout-or-duplicate",
		},
		{
			name:     "success without remote IP",
			token:    "valid-token",
			remoteIP: "",
			response: turnstileResponse{Success: true},
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Skip mock server for empty token test
			if tt.token == "" {
				svc := NewTurnstileService("test-secret")
				err := svc.Verify(tt.token, tt.remoteIP)
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				if err.Error() != tt.errMsg {
					t.Errorf("expected error %q, got %q", tt.errMsg, err.Error())
				}
				return
			}

			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.Method != http.MethodPost {
					t.Errorf("expected POST, got %s", r.Method)
				}

				if err := r.ParseForm(); err != nil {
					t.Fatalf("failed to parse form: %v", err)
				}

				if r.FormValue("secret") != "test-secret" {
					t.Errorf("expected secret 'test-secret', got %q", r.FormValue("secret"))
				}
				if r.FormValue("response") != tt.token {
					t.Errorf("expected response %q, got %q", tt.token, r.FormValue("response"))
				}

				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(tt.response)
			}))
			defer server.Close()

			svc := NewTurnstileService("test-secret")
			svc.verifyURL = server.URL

			err := svc.Verify(tt.token, tt.remoteIP)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				if tt.errMsg != "" && err.Error() != tt.errMsg {
					t.Errorf("expected error %q, got %q", tt.errMsg, err.Error())
				}
			} else {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
			}
		})
	}
}

func TestTurnstileService_Verify_HTTPError(t *testing.T) {
	svc := NewTurnstileService("test-secret")
	svc.verifyURL = "http://localhost:1" // connection refused

	err := svc.Verify("some-token", "1.2.3.4")
	if err == nil {
		t.Fatal("expected error for unreachable server")
	}
}

func TestTurnstileService_Verify_InvalidJSON(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("not json"))
	}))
	defer server.Close()

	svc := NewTurnstileService("test-secret")
	svc.verifyURL = server.URL

	err := svc.Verify("some-token", "1.2.3.4")
	if err == nil {
		t.Fatal("expected error for invalid JSON")
	}
}
