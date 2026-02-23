package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the application
type Config struct {
	Port             string
	Env              string
	PayOSReturnBaseURL string
	PayOSClientID    string
	PayOSAPIKey      string
	PayOSChecksumKey string
	ClientURL        string
	// Database
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string
	// JWT
	JWTSecret string
	// Google OAuth
	GoogleClientID     string
	GoogleClientSecret string
	// Meilisearch (optional — empty = disabled, falls back to PostgreSQL LIKE)
	MeilisearchURL    string
	MeilisearchAPIKey string
	// SMTP (optional — empty SMTPHost = no-op email service)
	SMTPHost     string
	SMTPPort     int
	SMTPUser     string
	SMTPPassword string
	SMTPFrom     string
	// Cloudflare Turnstile (optional — empty = skip bot validation)
	TurnstileSecretKey string
	// Platform
	PlatformFeeRate  float64 // e.g. 0.10 for 10%, 0 for beta
	MaxWalletBalance int64   // max balance per wallet in VND (e.g. 200000)
	// Rate Limiting
	RateLimitEnabled       bool
	RateLimitAuthPerMin    int // public auth endpoints (login/register), default 10
	RateLimitAPIPerMin     int // authenticated write endpoints, default 30
	RateLimitReadPerMin    int // read-heavy endpoints (tasks, notifications, chat), default 60
	RateLimitFinancePerMin int // financial ops (escrow/release/refund), default 10
}

// Load reads configuration from environment variables
func Load() (*Config, error) {
	// Load .env file if in development
	if os.Getenv("GO_ENV") != "production" {
		if err := godotenv.Load(); err != nil {
			// .env file is optional, don't fail if it doesn't exist
			fmt.Println("No .env file found, using system environment variables")
		}
	}

	cfg := &Config{
		Port:             getEnv("PORT", "8080"),
		Env:              getEnv("GO_ENV", "development"),
		PayOSReturnBaseURL: getEnv("PAYOS_RETURN_BASE_URL", "http://localhost:8080"),
		PayOSClientID:    os.Getenv("PAYOS_CLIENT_ID"),
		PayOSAPIKey:      os.Getenv("PAYOS_API_KEY"),
		PayOSChecksumKey: os.Getenv("PAYOS_CHECKSUM_KEY"),
		ClientURL:        getEnv("CLIENT_URL", "http://localhost:8081"),
		// Database
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "postgres"),
		DBName:     getEnv("DB_NAME", "viecz"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),
		// JWT
		JWTSecret: getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		// Google OAuth
		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
	}

	// Meilisearch (optional)
	cfg.MeilisearchURL = os.Getenv("MEILISEARCH_URL")
	cfg.MeilisearchAPIKey = os.Getenv("MEILISEARCH_API_KEY")

	// SMTP (optional — empty SMTPHost means no-op email service)
	cfg.SMTPHost = os.Getenv("SMTP_HOST")
	smtpPort, err := strconv.Atoi(getEnv("SMTP_PORT", "587"))
	if err != nil {
		return nil, fmt.Errorf("invalid SMTP_PORT: %w", err)
	}
	cfg.SMTPPort = smtpPort
	cfg.SMTPUser = os.Getenv("SMTP_USER")
	cfg.SMTPPassword = os.Getenv("SMTP_PASSWORD")
	cfg.SMTPFrom = getEnv("SMTP_FROM", "noreply@fishcmus.io.vn")

	// Cloudflare Turnstile (optional — empty = skip bot validation)
	cfg.TurnstileSecretKey = os.Getenv("TURNSTILE_SECRET_KEY")

	// Rate limiting (optional — disabled by default)
	cfg.RateLimitEnabled = getEnv("RATE_LIMIT_ENABLED", "false") == "true"
	rateLimitAuth, err := strconv.Atoi(getEnv("RATE_LIMIT_AUTH_PER_MIN", "10"))
	if err != nil {
		return nil, fmt.Errorf("invalid RATE_LIMIT_AUTH_PER_MIN: %w", err)
	}
	cfg.RateLimitAuthPerMin = rateLimitAuth
	rateLimitAPI, err := strconv.Atoi(getEnv("RATE_LIMIT_API_PER_MIN", "30"))
	if err != nil {
		return nil, fmt.Errorf("invalid RATE_LIMIT_API_PER_MIN: %w", err)
	}
	cfg.RateLimitAPIPerMin = rateLimitAPI
	rateLimitRead, err := strconv.Atoi(getEnv("RATE_LIMIT_READ_PER_MIN", "60"))
	if err != nil {
		return nil, fmt.Errorf("invalid RATE_LIMIT_READ_PER_MIN: %w", err)
	}
	cfg.RateLimitReadPerMin = rateLimitRead
	rateLimitFinance, err := strconv.Atoi(getEnv("RATE_LIMIT_FINANCE_PER_MIN", "10"))
	if err != nil {
		return nil, fmt.Errorf("invalid RATE_LIMIT_FINANCE_PER_MIN: %w", err)
	}
	cfg.RateLimitFinancePerMin = rateLimitFinance

	// Parse platform fee rate (default 0 for beta)
	platformFeeRate, err := strconv.ParseFloat(getEnv("PLATFORM_FEE_RATE", "0"), 64)
	if err != nil {
		return nil, fmt.Errorf("invalid PLATFORM_FEE_RATE: %w", err)
	}
	cfg.PlatformFeeRate = platformFeeRate

	// Parse max wallet balance (default 200000 VND)
	maxWalletBalance, err := strconv.ParseInt(getEnv("MAX_WALLET_BALANCE", "200000"), 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid MAX_WALLET_BALANCE: %w", err)
	}
	cfg.MaxWalletBalance = maxWalletBalance

	// Validate required fields (PayOS only required for payment features)
	// Database and JWT are always required
	if cfg.JWTSecret == "your-secret-key-change-in-production" || cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET environment variable must be set to a secure value")
	}

	return cfg, nil
}

// getEnv gets an environment variable with a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
