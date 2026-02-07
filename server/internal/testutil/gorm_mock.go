package testutil

import (
	"context"
	"database/sql"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// NewMockGormDB creates an in-memory SQLite database for testing
// This is useful for testing code that needs gorm.DB.Transaction()
func NewMockGormDB() (*gorm.DB, func(), error) {
	// Use in-memory SQLite for fast tests
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, nil, err
	}

	cleanup := func() {
		sqlDB, _ := db.DB()
		if sqlDB != nil {
			sqlDB.Close()
		}
	}

	return db, cleanup, nil
}

// MockDB is a simple mock that implements the minimal gorm.DB interface needed for transactions
type MockDB struct {
	TransactionFunc func(fc func(tx *gorm.DB) error, opts ...*sql.TxOptions) error
	WithContextFunc func(ctx context.Context) *gorm.DB
}

// Transaction mocks gorm.DB.Transaction
func (m *MockDB) Transaction(fc func(tx *gorm.DB) error, opts ...*sql.TxOptions) error {
	if m.TransactionFunc != nil {
		return m.TransactionFunc(fc, opts...)
	}
	// Default: just call the function without actual transaction
	return fc(nil)
}

// WithContext mocks gorm.DB.WithContext
func (m *MockDB) WithContext(ctx context.Context) *gorm.DB {
	if m.WithContextFunc != nil {
		return m.WithContextFunc(ctx)
	}
	return nil
}

// NewMockDB creates a new MockDB with default behavior
func NewMockDB() *MockDB {
	mock := &MockDB{}
	// Default transaction behavior: just call the function
	mock.TransactionFunc = func(fc func(tx *gorm.DB) error, opts ...*sql.TxOptions) error {
		return fc(nil)
	}
	mock.WithContextFunc = func(ctx context.Context) *gorm.DB {
		return &gorm.DB{}
	}
	return mock
}
