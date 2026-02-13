package database

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"viecz.vieczserver/internal/models"
)

// NewGORM creates a new GORM database connection
func NewGORM(opts ...Option) (*gorm.DB, error) {
	cfg := &Config{
		host:         "localhost",
		port:         5432,
		user:         "postgres",
		password:     "",
		dbname:       "viecz",
		sslMode:      "disable",
		maxOpenConns: 25,
		maxIdleConns: 5,
	}

	// Apply options
	for _, opt := range opts {
		opt(cfg)
	}

	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.host, cfg.port, cfg.user, cfg.password, cfg.dbname, cfg.sslMode,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Get underlying SQL DB for connection pool configuration
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying database: %w", err)
	}

	sqlDB.SetMaxOpenConns(cfg.maxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.maxIdleConns)
	if cfg.maxLifetime > 0 {
		sqlDB.SetConnMaxLifetime(cfg.maxLifetime)
	}

	return db, nil
}

// AutoMigrate runs auto migration for all models
func AutoMigrate(db *gorm.DB) error {
	log.Println("Running GORM auto migrations...")

	err := db.AutoMigrate(
		&models.User{},
		&models.Category{},
		&models.Task{},
		&models.TaskApplication{},
		&models.Transaction{},
		&models.Wallet{},
		&models.WalletTransaction{},
		&models.Conversation{},
		&models.Message{},
	)

	if err != nil {
		return fmt.Errorf("failed to auto migrate: %w", err)
	}

	log.Println("Auto migrations completed successfully")
	return nil
}
