package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the application
type Config struct {
	Port             string
	Env              string
	ServerURL        string
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
		ServerURL:        getEnv("SERVER_URL", "http://localhost:8080"),
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
	}

	// Validate required fields (PayOS only required for payment features)
	// Database and JWT are always required
	if cfg.JWTSecret == "your-secret-key-change-in-production" && cfg.Env == "production" {
		return nil, fmt.Errorf("JWT_SECRET must be set in production")
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
