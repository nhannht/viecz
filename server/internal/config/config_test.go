package config

import (
	"os"
	"testing"
)

func clearEnv() {
	// Clear all config-related env vars
	vars := []string{
		"GO_ENV", "PORT", "JWT_SECRET", "DB_HOST", "DB_PORT", "DB_USER",
		"DB_PASSWORD", "DB_NAME", "DB_SSLMODE", "CLIENT_URL",
		"SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM",
		"PAYOS_CLIENT_ID", "PAYOS_API_KEY", "PAYOS_CHECKSUM_KEY",
		"PAYOS_RETURN_BASE_URL", "PAYOS_PAYOUT_CLIENT_ID",
		"PAYOS_PAYOUT_API_KEY", "PAYOS_PAYOUT_CHECKSUM_KEY",
		"GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
		"TURNSTILE_SECRET_KEY", "GOOGLE_MAPS_SERVER_KEY",
		"NOMINATIM_URL", "FIREBASE_CREDENTIALS_FILE",
		"MEILISEARCH_URL", "MEILISEARCH_API_KEY",
		"SENTRY_DSN", "LOG_LEVEL",
		"RATE_LIMIT_ENABLED", "RATE_LIMIT_AUTH_PER_MIN",
		"RATE_LIMIT_API_PER_MIN", "RATE_LIMIT_READ_PER_MIN",
		"RATE_LIMIT_FINANCE_PER_MIN",
		"PLATFORM_FEE_RATE", "MAX_WALLET_BALANCE",
		"MIN_WITHDRAWAL_AMOUNT", "MAX_WITHDRAWAL_AMOUNT",
	}
	for _, v := range vars {
		os.Unsetenv(v)
	}
}

func TestGetEnv_ReturnsValue(t *testing.T) {
	os.Setenv("TEST_KEY_123", "hello")
	defer os.Unsetenv("TEST_KEY_123")

	if got := getEnv("TEST_KEY_123", "default"); got != "hello" {
		t.Errorf("expected hello, got %q", got)
	}
}

func TestGetEnv_ReturnsDefault(t *testing.T) {
	os.Unsetenv("TEST_KEY_MISSING")

	if got := getEnv("TEST_KEY_MISSING", "fallback"); got != "fallback" {
		t.Errorf("expected fallback, got %q", got)
	}
}

func TestLoad_DefaultValues(t *testing.T) {
	clearEnv()
	os.Setenv("GO_ENV", "production") // skip .env loading
	os.Setenv("JWT_SECRET", "test-secret-that-is-not-default")
	defer clearEnv()

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}

	if cfg.Port != "8080" {
		t.Errorf("expected default port 8080, got %q", cfg.Port)
	}
	if cfg.DBHost != "localhost" {
		t.Errorf("expected default DB host localhost, got %q", cfg.DBHost)
	}
	if cfg.DBPort != "5432" {
		t.Errorf("expected default DB port 5432, got %q", cfg.DBPort)
	}
	if cfg.DBSSLMode != "disable" {
		t.Errorf("expected default sslmode disable, got %q", cfg.DBSSLMode)
	}
	if cfg.NominatimURL != "http://127.0.0.1:8085" {
		t.Errorf("expected default nominatim URL, got %q", cfg.NominatimURL)
	}
	if cfg.SMTPPort != 587 {
		t.Errorf("expected default SMTP port 587, got %d", cfg.SMTPPort)
	}
	if cfg.RateLimitEnabled {
		t.Error("expected rate limiting disabled by default")
	}
	if cfg.PlatformFeeRate != 0 {
		t.Errorf("expected default fee rate 0, got %f", cfg.PlatformFeeRate)
	}
	if cfg.MaxWalletBalance != 200000 {
		t.Errorf("expected default max wallet 200000, got %d", cfg.MaxWalletBalance)
	}
}

func TestLoad_CustomValues(t *testing.T) {
	clearEnv()
	os.Setenv("GO_ENV", "production")
	os.Setenv("JWT_SECRET", "my-secure-secret")
	os.Setenv("PORT", "9999")
	os.Setenv("DB_HOST", "db.example.com")
	os.Setenv("RATE_LIMIT_ENABLED", "true")
	os.Setenv("RATE_LIMIT_AUTH_PER_MIN", "20")
	os.Setenv("PLATFORM_FEE_RATE", "0.05")
	os.Setenv("MAX_WALLET_BALANCE", "500000")
	defer clearEnv()

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}

	if cfg.Port != "9999" {
		t.Errorf("expected port 9999, got %q", cfg.Port)
	}
	if cfg.DBHost != "db.example.com" {
		t.Errorf("expected custom DB host, got %q", cfg.DBHost)
	}
	if !cfg.RateLimitEnabled {
		t.Error("expected rate limiting enabled")
	}
	if cfg.RateLimitAuthPerMin != 20 {
		t.Errorf("expected auth rate 20, got %d", cfg.RateLimitAuthPerMin)
	}
	if cfg.PlatformFeeRate != 0.05 {
		t.Errorf("expected fee rate 0.05, got %f", cfg.PlatformFeeRate)
	}
	if cfg.MaxWalletBalance != 500000 {
		t.Errorf("expected max wallet 500000, got %d", cfg.MaxWalletBalance)
	}
}

func TestLoad_FailsOnDefaultJWTSecret(t *testing.T) {
	clearEnv()
	os.Setenv("GO_ENV", "production")
	// JWT_SECRET not set — should use default and fail validation
	defer clearEnv()

	_, err := Load()
	if err == nil {
		t.Error("expected error for default JWT secret")
	}
}

func TestLoad_FailsOnInvalidSMTPPort(t *testing.T) {
	clearEnv()
	os.Setenv("GO_ENV", "production")
	os.Setenv("JWT_SECRET", "valid-secret")
	os.Setenv("SMTP_PORT", "not-a-number")
	defer clearEnv()

	_, err := Load()
	if err == nil {
		t.Error("expected error for invalid SMTP port")
	}
}

func TestLoad_FailsOnInvalidRateLimitValue(t *testing.T) {
	clearEnv()
	os.Setenv("GO_ENV", "production")
	os.Setenv("JWT_SECRET", "valid-secret")
	os.Setenv("RATE_LIMIT_AUTH_PER_MIN", "abc")
	defer clearEnv()

	_, err := Load()
	if err == nil {
		t.Error("expected error for invalid rate limit value")
	}
}

func TestLoad_FailsOnInvalidPlatformFeeRate(t *testing.T) {
	clearEnv()
	os.Setenv("GO_ENV", "production")
	os.Setenv("JWT_SECRET", "valid-secret")
	os.Setenv("PLATFORM_FEE_RATE", "not-a-float")
	defer clearEnv()

	_, err := Load()
	if err == nil {
		t.Error("expected error for invalid platform fee rate")
	}
}
