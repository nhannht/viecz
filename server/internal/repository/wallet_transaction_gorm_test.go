package repository

import (
	"context"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"viecz.vieczserver/internal/models"
)

func setupWalletTransactionTestDB(t *testing.T) (*gorm.DB, func()) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// Auto migrate the schema
	if err := db.AutoMigrate(&models.WalletTransaction{}, &models.Wallet{}); err != nil {
		t.Fatalf("Failed to migrate schema: %v", err)
	}

	cleanup := func() {
		sqlDB, _ := db.DB()
		if sqlDB != nil {
			sqlDB.Close()
		}
	}

	return db, cleanup
}

func TestWalletTransactionGormRepository_Create(t *testing.T) {
	tests := []struct {
		name        string
		transaction *models.WalletTransaction
		wantErr     bool
	}{
		{
			name: "create transaction successfully",
			transaction: &models.WalletTransaction{
				WalletID:      1,
				Type:          models.WalletTransactionTypeDeposit,
				Amount:        100000,
				BalanceBefore: 0,
				BalanceAfter:  100000,
				EscrowBefore:  0,
				EscrowAfter:   0,
				Description:   "Test deposit",
			},
			wantErr: false,
		},
		{
			name: "create transaction with task ID",
			transaction: &models.WalletTransaction{
				WalletID:      1,
				TaskID:        func() *int64 { id := int64(1); return &id }(),
				Type:          models.WalletTransactionTypeEscrowHold,
				Amount:        -50000,
				BalanceBefore: 100000,
				BalanceAfter:  50000,
				EscrowBefore:  0,
				EscrowAfter:   50000,
				Description:   "Escrow hold for task",
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupWalletTransactionTestDB(t)
			defer cleanup()

			repo := NewWalletTransactionGormRepository(db)
			ctx := context.Background()

			err := repo.Create(ctx, tt.transaction)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error, got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if tt.transaction.ID == 0 {
					t.Error("Expected transaction ID to be set after creation")
				}
			}
		})
	}
}

func TestWalletTransactionGormRepository_GetByID(t *testing.T) {
	tests := []struct {
		name          string
		setup         func(*gorm.DB) int64
		transactionID int64
		wantErr       bool
		errContains   string
		checkTx       func(*testing.T, *models.WalletTransaction)
	}{
		{
			name: "get existing transaction",
			setup: func(db *gorm.DB) int64 {
				tx := &models.WalletTransaction{
					WalletID:      1,
					Type:          models.WalletTransactionTypeDeposit,
					Amount:        50000,
					BalanceBefore: 0,
					BalanceAfter:  50000,
					EscrowBefore:  0,
					EscrowAfter:   0,
					Description:   "Test transaction",
				}
				db.Create(tx)
				return tx.ID
			},
			wantErr: false,
			checkTx: func(t *testing.T, tx *models.WalletTransaction) {
				if tx.Amount != 50000 {
					t.Errorf("Expected Amount 50000, got %d", tx.Amount)
				}
				if tx.Type != models.WalletTransactionTypeDeposit {
					t.Errorf("Expected Type Deposit, got %s", tx.Type)
				}
			},
		},
		{
			name: "transaction not found",
			setup: func(db *gorm.DB) int64 {
				return 999
			},
			transactionID: 999,
			wantErr:       true,
			errContains:   "wallet transaction not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupWalletTransactionTestDB(t)
			defer cleanup()

			var txID int64
			if tt.setup != nil {
				txID = tt.setup(db)
			}
			if tt.transactionID != 0 {
				txID = tt.transactionID
			}

			repo := NewWalletTransactionGormRepository(db)
			ctx := context.Background()

			transaction, err := repo.GetByID(ctx, txID)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error containing '%s', got nil", tt.errContains)
				} else if tt.errContains != "" && !contains(err.Error(), tt.errContains) {
					t.Errorf("Expected error containing '%s', got '%s'", tt.errContains, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if transaction == nil {
					t.Fatal("Expected transaction to be returned, got nil")
				}
				if tt.checkTx != nil {
					tt.checkTx(t, transaction)
				}
			}
		})
	}
}

func TestWalletTransactionGormRepository_GetByWalletID(t *testing.T) {
	tests := []struct {
		name       string
		setup      func(*gorm.DB)
		walletID   int64
		limit      int
		offset     int
		wantErr    bool
		checkCount int
	}{
		{
			name: "get all transactions for wallet",
			setup: func(db *gorm.DB) {
				for i := 1; i <= 5; i++ {
					tx := &models.WalletTransaction{
						WalletID:      1,
						Type:          models.WalletTransactionTypeDeposit,
						Amount:        int64(i * 10000),
						BalanceBefore: 0,
						BalanceAfter:  int64(i * 10000),
						EscrowBefore:  0,
						EscrowAfter:   0,
					}
					db.Create(tx)
				}
			},
			walletID:   1,
			limit:      0,
			offset:     0,
			wantErr:    false,
			checkCount: 5,
		},
		{
			name: "get transactions with limit",
			setup: func(db *gorm.DB) {
				for i := 1; i <= 5; i++ {
					tx := &models.WalletTransaction{
						WalletID:      2,
						Type:          models.WalletTransactionTypeDeposit,
						Amount:        int64(i * 10000),
						BalanceBefore: 0,
						BalanceAfter:  int64(i * 10000),
						EscrowBefore:  0,
						EscrowAfter:   0,
					}
					db.Create(tx)
				}
			},
			walletID:   2,
			limit:      3,
			offset:     0,
			wantErr:    false,
			checkCount: 3,
		},
		{
			name: "get transactions with offset",
			setup: func(db *gorm.DB) {
				for i := 1; i <= 5; i++ {
					tx := &models.WalletTransaction{
						WalletID:      3,
						Type:          models.WalletTransactionTypeDeposit,
						Amount:        int64(i * 10000),
						BalanceBefore: 0,
						BalanceAfter:  int64(i * 10000),
						EscrowBefore:  0,
						EscrowAfter:   0,
					}
					db.Create(tx)
				}
			},
			walletID:   3,
			limit:      0,
			offset:     2,
			wantErr:    false,
			checkCount: 3,
		},
		{
			name: "get transactions with limit and offset",
			setup: func(db *gorm.DB) {
				for i := 1; i <= 5; i++ {
					tx := &models.WalletTransaction{
						WalletID:      4,
						Type:          models.WalletTransactionTypeDeposit,
						Amount:        int64(i * 10000),
						BalanceBefore: 0,
						BalanceAfter:  int64(i * 10000),
						EscrowBefore:  0,
						EscrowAfter:   0,
					}
					db.Create(tx)
				}
			},
			walletID:   4,
			limit:      2,
			offset:     1,
			wantErr:    false,
			checkCount: 2,
		},
		{
			name:       "no transactions for wallet",
			setup:      func(db *gorm.DB) {},
			walletID:   999,
			limit:      10,
			offset:     0,
			wantErr:    false,
			checkCount: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupWalletTransactionTestDB(t)
			defer cleanup()

			if tt.setup != nil {
				tt.setup(db)
			}

			repo := NewWalletTransactionGormRepository(db)
			ctx := context.Background()

			transactions, err := repo.GetByWalletID(ctx, tt.walletID, tt.limit, tt.offset)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error, got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if transactions == nil {
					t.Fatal("Expected transactions slice to be returned, got nil")
				}
				if len(transactions) != tt.checkCount {
					t.Errorf("Expected %d transactions, got %d", tt.checkCount, len(transactions))
				}
			}
		})
	}
}

func TestWalletTransactionGormRepository_GetByTaskID(t *testing.T) {
	tests := []struct {
		name       string
		setup      func(*gorm.DB)
		taskID     int64
		wantErr    bool
		checkCount int
	}{
		{
			name: "get transactions for task",
			setup: func(db *gorm.DB) {
				taskID := int64(1)
				for i := 1; i <= 3; i++ {
					tx := &models.WalletTransaction{
						WalletID:      int64(i),
						TaskID:        &taskID,
						Type:          models.WalletTransactionTypeEscrowHold,
						Amount:        int64(i * 10000),
						BalanceBefore: 0,
						BalanceAfter:  0,
						EscrowBefore:  0,
						EscrowAfter:   0,
					}
					db.Create(tx)
				}
			},
			taskID:     1,
			wantErr:    false,
			checkCount: 3,
		},
		{
			name: "no transactions for task",
			setup: func(db *gorm.DB) {
				taskID := int64(2)
				tx := &models.WalletTransaction{
					WalletID:      1,
					TaskID:        &taskID,
					Type:          models.WalletTransactionTypeEscrowHold,
					Amount:        10000,
					BalanceBefore: 0,
					BalanceAfter:  0,
					EscrowBefore:  0,
					EscrowAfter:   0,
				}
				db.Create(tx)
			},
			taskID:     999,
			wantErr:    false,
			checkCount: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupWalletTransactionTestDB(t)
			defer cleanup()

			if tt.setup != nil {
				tt.setup(db)
			}

			repo := NewWalletTransactionGormRepository(db)
			ctx := context.Background()

			transactions, err := repo.GetByTaskID(ctx, tt.taskID)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error, got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if transactions == nil {
					t.Fatal("Expected transactions slice to be returned, got nil")
				}
				if len(transactions) != tt.checkCount {
					t.Errorf("Expected %d transactions, got %d", tt.checkCount, len(transactions))
				}
			}
		})
	}
}
