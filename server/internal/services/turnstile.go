package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const turnstileVerifyURL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

// TurnstileService verifies Cloudflare Turnstile tokens.
type TurnstileService struct {
	secretKey string
	verifyURL string // overridable for testing
	client    *http.Client
}

type turnstileResponse struct {
	Success    bool     `json:"success"`
	ErrorCodes []string `json:"error-codes"`
}

// NewTurnstileService creates a new TurnstileService.
func NewTurnstileService(secretKey string) *TurnstileService {
	return &TurnstileService{
		secretKey: secretKey,
		verifyURL: turnstileVerifyURL,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// SetVerifyURL overrides the Cloudflare API URL (for testing).
func (s *TurnstileService) SetVerifyURL(url string) {
	s.verifyURL = url
}

// Verify validates a Turnstile token against the Cloudflare API.
func (s *TurnstileService) Verify(token, remoteIP string) error {
	if token == "" {
		return fmt.Errorf("turnstile token is required")
	}

	data := url.Values{
		"secret":   {s.secretKey},
		"response": {token},
	}
	if remoteIP != "" {
		data.Set("remoteip", remoteIP)
	}

	resp, err := s.client.PostForm(s.verifyURL, data)
	if err != nil {
		return fmt.Errorf("turnstile verification request failed: %w", err)
	}
	defer resp.Body.Close()

	var result turnstileResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("failed to decode turnstile response: %w", err)
	}

	if !result.Success {
		return fmt.Errorf("turnstile verification failed: %s", strings.Join(result.ErrorCodes, ", "))
	}

	return nil
}
