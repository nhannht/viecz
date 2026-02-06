package database

import (
	"database/sql"
	"fmt"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// Config holds database configuration
type Config struct {
	host         string
	port         int
	user         string
	password     string
	dbname       string
	sslMode      string
	maxOpenConns int
	maxIdleConns int
	maxLifetime  time.Duration
}

// Option is a functional option for configuring the database
type Option func(*Config)

// WithHost sets the database host
func WithHost(host string) Option {
	return func(c *Config) {
		c.host = host
	}
}

// WithPort sets the database port
func WithPort(port int) Option {
	return func(c *Config) {
		c.port = port
	}
}

// WithUser sets the database user
func WithUser(user string) Option {
	return func(c *Config) {
		c.user = user
	}
}

// WithPassword sets the database password
func WithPassword(password string) Option {
	return func(c *Config) {
		c.password = password
	}
}

// WithDatabase sets the database name
func WithDatabase(dbname string) Option {
	return func(c *Config) {
		c.dbname = dbname
	}
}

// WithSSLMode sets the SSL mode
func WithSSLMode(mode string) Option {
	return func(c *Config) {
		c.sslMode = mode
	}
}

// WithMaxOpenConnections sets the maximum number of open connections
func WithMaxOpenConnections(max int) Option {
	return func(c *Config) {
		c.maxOpenConns = max
	}
}

// WithMaxIdleConnections sets the maximum number of idle connections
func WithMaxIdleConnections(max int) Option {
	return func(c *Config) {
		c.maxIdleConns = max
	}
}

// WithMaxConnectionLifetime sets the maximum connection lifetime
func WithMaxConnectionLifetime(d time.Duration) Option {
	return func(c *Config) {
		c.maxLifetime = d
	}
}

// New creates a new database connection with the given options
func New(opts ...Option) (*sql.DB, error) {
	// Default configuration
	cfg := &Config{
		host:         "localhost",
		port:         5432,
		user:         "postgres",
		password:     "",
		dbname:       "viecz",
		sslMode:      "disable",
		maxOpenConns: 25,
		maxIdleConns: 5,
		maxLifetime:  5 * time.Minute,
	}

	// Apply options
	for _, opt := range opts {
		opt(cfg)
	}

	// Build connection string
	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.host, cfg.port, cfg.user, cfg.password, cfg.dbname, cfg.sslMode,
	)

	// Open database connection
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(cfg.maxOpenConns)
	db.SetMaxIdleConns(cfg.maxIdleConns)
	db.SetConnMaxLifetime(cfg.maxLifetime)

	// Verify connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}
