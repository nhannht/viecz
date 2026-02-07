package repository

import (
	"context"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"viecz.vieczserver/internal/models"
)

func setupWalletTestDB(t *testing.T) (*gorm.DB, func()) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// Auto migrate the schema
	if err := db.AutoMigrate(&models.Wallet{}); err != nil {
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

func TestWalletGormRepository_Create(t *testing.T) {
	tests := []struct {
		name        string
		wallet      *models.Wallet
		wantErr     bool
		errContains string
	}{
		{
			name: "create wallet successfully",
			wallet: &models.Wallet{
				UserID:         1,
				Balance:        100000,
				EscrowBalance:  0,
				TotalDeposited: 100000,
			},
			wantErr: false,
		},
		{
			name: "create wallet with zero values",
			wallet: &models.Wallet{
				UserID:         2,
				Balance:        0,
				EscrowBalance:  0,
				TotalDeposited: 0,
			},
			wantErr: false,
		},
		{
			name: "validation error - missing user ID",
			wallet: &models.Wallet{
				UserID:  0,
				Balance: 100000,
			},
			wantErr:     true,
			errContains: "user_id is required",
		},
		{
			name: "validation error - negative balance",
			wallet: &models.Wallet{
				UserID:  1,
				Balance: -100000,
			},
			wantErr:     true,
			errContains: "balance cannot be negative",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupWalletTestDB(t)
			defer cleanup()

			repo := NewWalletGormRepository(db)
			ctx := context.Background()

			err := repo.Create(ctx, tt.wallet)

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
				if tt.wallet.ID == 0 {
					t.Error("Expected wallet ID to be set after creation")
				}
			}
		})
	}
}

func TestWalletGormRepository_GetByID(t *testing.T) {
	tests := []struct {
		name        string
		setup       func(*gorm.DB) int64
		walletID    int64
		wantErr     bool
		errContains string
		checkWallet func(*testing.T, *models.Wallet)
	}{
		{
			name: "get existing wallet",
			setup: func(db *gorm.DB) int64 {
				wallet := &models.Wallet{
					UserID:  1,
					Balance: 50000,
				}
				db.Create(wallet)
				return wallet.ID
			},
			wantErr: false,
			checkWallet: func(t *testing.T, wallet *models.Wallet) {
				if wallet.UserID != 1 {
					t.Errorf("Expected UserID 1, got %d", wallet.UserID)
				}
				if wallet.Balance != 50000 {
					t.Errorf("Expected Balance 50000, got %d", wallet.Balance)
				}
			},
		},
		{
			name: "wallet not found",
			setup: func(db *gorm.DB) int64 {
				return 999
			},
			walletID:    999,
			wantErr:     true,
			errContains: "wallet not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupWalletTestDB(t)
			defer cleanup()

			var walletID int64
			if tt.setup != nil {
				walletID = tt.setup(db)
			}
			if tt.walletID != 0 {
				walletID = tt.walletID
			}

			repo := NewWalletGormRepository(db)
			ctx := context.Background()

			wallet, err := repo.GetByID(ctx, walletID)

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
				if wallet == nil {
					t.Fatal("Expected wallet to be returned, got nil")
				}
				if tt.checkWallet != nil {
					tt.checkWallet(t, wallet)
				}
			}
		})
	}
}

func TestWalletGormRepository_GetByUserID(t *testing.T) {
	tests := []struct {
		name        string
		setup       func(*gorm.DB)
		userID      int64
		wantErr     bool
		errContains string
		checkWallet func(*testing.T, *models.Wallet)
	}{
		{
			name: "get existing wallet by user ID",
			setup: func(db *gorm.DB) {
				wallet := &models.Wallet{
					UserID:  1,
					Balance: 75000,
				}
				db.Create(wallet)
			},
			userID:  1,
			wantErr: false,
			checkWallet: func(t *testing.T, wallet *models.Wallet) {
				if wallet.UserID != 1 {
					t.Errorf("Expected UserID 1, got %d", wallet.UserID)
				}
				if wallet.Balance != 75000 {
					t.Errorf("Expected Balance 75000, got %d", wallet.Balance)
				}
			},
		},
		{
			name:        "wallet not found for user",
			setup:       func(db *gorm.DB) {},
			userID:      999,
			wantErr:     true,
			errContains: "wallet not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupWalletTestDB(t)
			defer cleanup()

			if tt.setup != nil {
				tt.setup(db)
			}

			repo := NewWalletGormRepository(db)
			ctx := context.Background()

			wallet, err := repo.GetByUserID(ctx, tt.userID)

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
				if wallet == nil {
					t.Fatal("Expected wallet to be returned, got nil")
				}
				if tt.checkWallet != nil {
					tt.checkWallet(t, wallet)
				}
			}
		})
	}
}

func TestWalletGormRepository_Update(t *testing.T) {
	tests := []struct {
		name        string
		setup       func(*gorm.DB) *models.Wallet
		updateFunc  func(*models.Wallet)
		wantErr     bool
		errContains string
		checkWallet func(*testing.T, *models.Wallet)
	}{
		{
			name: "update wallet successfully",
			setup: func(db *gorm.DB) *models.Wallet {
				wallet := &models.Wallet{
					UserID:  1,
					Balance: 50000,
				}
				db.Create(wallet)
				return wallet
			},
			updateFunc: func(wallet *models.Wallet) {
				wallet.Balance = 100000
				wallet.EscrowBalance = 25000
			},
			wantErr: false,
			checkWallet: func(t *testing.T, wallet *models.Wallet) {
				if wallet.Balance != 100000 {
					t.Errorf("Expected Balance 100000, got %d", wallet.Balance)
				}
				if wallet.EscrowBalance != 25000 {
					t.Errorf("Expected EscrowBalance 25000, got %d", wallet.EscrowBalance)
				}
			},
		},
		{
			name: "update with negative balance should fail",
			setup: func(db *gorm.DB) *models.Wallet {
				wallet := &models.Wallet{
					UserID:  1,
					Balance: 50000,
				}
				db.Create(wallet)
				return wallet
			},
			updateFunc: func(wallet *models.Wallet) {
				wallet.Balance = -10000
			},
			wantErr:     true,
			errContains: "balance cannot be negative",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupWalletTestDB(t)
			defer cleanup()

			var wallet *models.Wallet
			if tt.setup != nil {
				wallet = tt.setup(db)
			}

			if tt.updateFunc != nil {
				tt.updateFunc(wallet)
			}

			repo := NewWalletGormRepository(db)
			ctx := context.Background()

			err := repo.Update(ctx, wallet)

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
				if tt.checkWallet != nil {
					// Re-fetch to verify update
					updated, _ := repo.GetByID(ctx, wallet.ID)
					tt.checkWallet(t, updated)
				}
			}
		})
	}
}

func TestWalletGormRepository_GetOrCreate(t *testing.T) {
	tests := []struct {
		name        string
		setup       func(*gorm.DB)
		userID      int64
		wantErr     bool
		checkWallet func(*testing.T, *models.Wallet, bool)
	}{
		{
			name:   "create new wallet",
			setup:  func(db *gorm.DB) {},
			userID: 1,
			checkWallet: func(t *testing.T, wallet *models.Wallet, isNew bool) {
				if !isNew {
					t.Error("Expected wallet to be newly created")
				}
				if wallet.UserID != 1 {
					t.Errorf("Expected UserID 1, got %d", wallet.UserID)
				}
				if wallet.Balance != 0 {
					t.Errorf("Expected Balance 0, got %d", wallet.Balance)
				}
			},
		},
		{
			name: "get existing wallet",
			setup: func(db *gorm.DB) {
				wallet := &models.Wallet{
					UserID:  2,
					Balance: 50000,
				}
				db.Create(wallet)
			},
			userID: 2,
			checkWallet: func(t *testing.T, wallet *models.Wallet, isNew bool) {
				if isNew {
					t.Error("Expected existing wallet, not new")
				}
				if wallet.Balance != 50000 {
					t.Errorf("Expected Balance 50000, got %d", wallet.Balance)
				}
			},
		},
		{
			name: "idempotency - multiple calls return same wallet",
			setup: func(db *gorm.DB) {
				wallet := &models.Wallet{
					UserID:  3,
					Balance: 75000,
				}
				db.Create(wallet)
			},
			userID: 3,
			checkWallet: func(t *testing.T, wallet *models.Wallet, isNew bool) {
				if isNew {
					t.Error("Expected existing wallet on second call")
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupWalletTestDB(t)
			defer cleanup()

			if tt.setup != nil {
				tt.setup(db)
			}

			repo := NewWalletGormRepository(db)
			ctx := context.Background()

			// Check if wallet exists before
			_, existsBefore := repo.GetByUserID(ctx, tt.userID)
			isNew := existsBefore != nil

			wallet, err := repo.GetOrCreate(ctx, tt.userID)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error, got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if wallet == nil {
					t.Fatal("Expected wallet to be returned, got nil")
				}
				if tt.checkWallet != nil {
					tt.checkWallet(t, wallet, isNew)
				}

				// Test idempotency - call again
				wallet2, err2 := repo.GetOrCreate(ctx, tt.userID)
				if err2 != nil {
					t.Errorf("Expected no error on second call, got %v", err2)
				}
				if wallet2.ID != wallet.ID {
					t.Errorf("Expected same wallet ID %d, got %d", wallet.ID, wallet2.ID)
				}
			}
		})
	}
}

