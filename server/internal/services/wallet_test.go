package services

import (
	"context"
	"testing"

	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/testutil"
)

func TestWalletService_GetOrCreateWallet(t *testing.T) {
	tests := []struct {
		name      string
		userID    int64
		setupRepo func(*testutil.MockWalletRepository)
		wantErr   bool
		checkFunc func(*testing.T, *models.Wallet)
	}{
		{
			name:   "create new wallet",
			userID: 1,
			setupRepo: func(repo *testutil.MockWalletRepository) {
				// No existing wallet
			},
			wantErr: false,
			checkFunc: func(t *testing.T, wallet *models.Wallet) {
				testutil.AssertEqual(t, wallet.UserID, int64(1), "UserID")
				testutil.AssertEqual(t, wallet.Balance, int64(0), "Balance should be 0")
				testutil.AssertEqual(t, wallet.EscrowBalance, int64(0), "EscrowBalance should be 0")
			},
		},
		{
			name:   "get existing wallet",
			userID: 1,
			setupRepo: func(repo *testutil.MockWalletRepository) {
				wallet := testutil.NewWalletBuilder().
					WithUserID(1).
					WithBalance(50000).
					Build()
				repo.Wallets[wallet.ID] = wallet
			},
			wantErr: false,
			checkFunc: func(t *testing.T, wallet *models.Wallet) {
				testutil.AssertEqual(t, wallet.UserID, int64(1), "UserID")
				testutil.AssertEqual(t, wallet.Balance, int64(50000), "Balance should be preserved")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			walletRepo := testutil.NewMockWalletRepository()
			walletTxRepo := testutil.NewMockWalletTransactionRepository()
			mockDB, cleanup, err := testutil.NewMockGormDB()
			if err != nil {
				t.Fatalf("Failed to create mock DB: %v", err)
			}
			defer cleanup()

			if tt.setupRepo != nil {
				tt.setupRepo(walletRepo)
			}

			service := NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
			ctx := context.Background()

			wallet, err := service.GetOrCreateWallet(ctx, tt.userID)

			testutil.AssertError(t, err, tt.wantErr, "")
			if !tt.wantErr {
				testutil.AssertNotNil(t, wallet, "Wallet should not be nil")
				if tt.checkFunc != nil {
					tt.checkFunc(t, wallet)
				}
			}
		})
	}
}

func TestWalletService_GetWalletByUserID(t *testing.T) {
	tests := []struct {
		name        string
		userID      int64
		setupRepo   func(*testutil.MockWalletRepository)
		wantErr     bool
		errContains string
	}{
		{
			name:   "get existing wallet",
			userID: 1,
			setupRepo: func(repo *testutil.MockWalletRepository) {
				wallet := testutil.NewWalletBuilder().WithUserID(1).Build()
				repo.Wallets[wallet.ID] = wallet
			},
			wantErr: false,
		},
		{
			name:        "wallet not found",
			userID:      999,
			setupRepo:   func(repo *testutil.MockWalletRepository) {},
			wantErr:     true,
			errContains: "wallet not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			walletRepo := testutil.NewMockWalletRepository()
			walletTxRepo := testutil.NewMockWalletTransactionRepository()
			mockDB, cleanup, err := testutil.NewMockGormDB()
			if err != nil {
				t.Fatalf("Failed to create mock DB: %v", err)
			}
			defer cleanup()

			if tt.setupRepo != nil {
				tt.setupRepo(walletRepo)
			}

			service := NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
			ctx := context.Background()

			wallet, err := service.GetWalletByUserID(ctx, tt.userID)

			testutil.AssertError(t, err, tt.wantErr, tt.errContains)
			if !tt.wantErr {
				testutil.AssertNotNil(t, wallet, "Wallet should not be nil")
			}
		})
	}
}

func TestWalletService_Deposit(t *testing.T) {
	tests := []struct {
		name        string
		userID      int64
		amount      int64
		description string
		setupRepo   func(*testutil.MockWalletRepository)
		wantErr     bool
		errContains string
		checkFunc   func(*testing.T, *testutil.MockWalletRepository, *testutil.MockWalletTransactionRepository)
	}{
		{
			name:        "successful deposit",
			userID:      1,
			amount:      100000,
			description: "Test deposit",
			setupRepo: func(repo *testutil.MockWalletRepository) {
				wallet := testutil.NewWalletBuilder().
					WithUserID(1).
					WithBalance(50000).
					Build()
				repo.Wallets[wallet.ID] = wallet
			},
			wantErr: false,
			checkFunc: func(t *testing.T, walletRepo *testutil.MockWalletRepository, txRepo *testutil.MockWalletTransactionRepository) {
				// Check wallet balance updated
				var wallet *models.Wallet
				for _, w := range walletRepo.Wallets {
					if w.UserID == 1 {
						wallet = w
						break
					}
				}
				testutil.AssertNotNil(t, wallet, "Wallet should exist")
				testutil.AssertEqual(t, wallet.Balance, int64(150000), "Balance should be updated")
				testutil.AssertEqual(t, wallet.TotalDeposited, int64(100000), "TotalDeposited should be updated")

				// Check transaction created
				testutil.AssertTrue(t, len(txRepo.Transactions) > 0, "Transaction should be created")
				for _, tx := range txRepo.Transactions {
					testutil.AssertEqual(t, tx.Type, models.WalletTransactionTypeDeposit, "Transaction type")
					testutil.AssertEqual(t, tx.Amount, int64(100000), "Transaction amount")
				}
			},
		},
		{
			name:        "deposit with zero balance",
			userID:      1,
			amount:      100000,
			description: "First deposit",
			setupRepo:   func(repo *testutil.MockWalletRepository) {},
			wantErr:     false,
			checkFunc: func(t *testing.T, walletRepo *testutil.MockWalletRepository, txRepo *testutil.MockWalletTransactionRepository) {
				var wallet *models.Wallet
				for _, w := range walletRepo.Wallets {
					if w.UserID == 1 {
						wallet = w
						break
					}
				}
				testutil.AssertNotNil(t, wallet, "Wallet should be created")
				testutil.AssertEqual(t, wallet.Balance, int64(100000), "Balance")
			},
		},
		{
			name:        "negative amount rejected",
			userID:      1,
			amount:      -100000,
			description: "Invalid deposit",
			setupRepo:   func(repo *testutil.MockWalletRepository) {},
			wantErr:     true,
			errContains: "must be positive",
		},
		{
			name:        "zero amount rejected",
			userID:      1,
			amount:      0,
			description: "Invalid deposit",
			setupRepo:   func(repo *testutil.MockWalletRepository) {},
			wantErr:     true,
			errContains: "must be positive",
		},
		{
			name:        "deposit exceeding max wallet balance rejected",
			userID:      1,
			amount:      150001,
			description: "Over limit deposit",
			setupRepo: func(repo *testutil.MockWalletRepository) {
				wallet := testutil.NewWalletBuilder().
					WithUserID(1).
					WithBalance(50000).
					Build()
				repo.Wallets[wallet.ID] = wallet
			},
			wantErr:     true,
			errContains: "exceed maximum wallet balance",
		},
		{
			name:        "deposit up to exact max wallet balance succeeds",
			userID:      1,
			amount:      150000,
			description: "Exact limit deposit",
			setupRepo: func(repo *testutil.MockWalletRepository) {
				wallet := testutil.NewWalletBuilder().
					WithUserID(1).
					WithBalance(50000).
					Build()
				repo.Wallets[wallet.ID] = wallet
			},
			wantErr: false,
			checkFunc: func(t *testing.T, walletRepo *testutil.MockWalletRepository, txRepo *testutil.MockWalletTransactionRepository) {
				var wallet *models.Wallet
				for _, w := range walletRepo.Wallets {
					if w.UserID == 1 {
						wallet = w
						break
					}
				}
				testutil.AssertNotNil(t, wallet, "Wallet should exist")
				testutil.AssertEqual(t, wallet.Balance, int64(200000), "Balance should be at max")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			walletRepo := testutil.NewMockWalletRepository()
			walletTxRepo := testutil.NewMockWalletTransactionRepository()
			mockDB, cleanup, err := testutil.NewMockGormDB()
			if err != nil {
				t.Fatalf("Failed to create mock DB: %v", err)
			}
			defer cleanup()

			if tt.setupRepo != nil {
				tt.setupRepo(walletRepo)
			}

			service := NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
			ctx := context.Background()

			err = service.Deposit(ctx, tt.userID, tt.amount, tt.description)

			testutil.AssertError(t, err, tt.wantErr, tt.errContains)
			if !tt.wantErr && tt.checkFunc != nil {
				tt.checkFunc(t, walletRepo, walletTxRepo)
			}
		})
	}
}

func TestWalletService_ValidateDeposit(t *testing.T) {
	tests := []struct {
		name        string
		userID      int64
		amount      int64
		setupRepo   func(*testutil.MockWalletRepository)
		wantErr     bool
		errContains string
	}{
		{
			name:   "valid deposit allowed",
			userID: 1,
			amount: 100000,
			setupRepo: func(repo *testutil.MockWalletRepository) {
				wallet := testutil.NewWalletBuilder().
					WithUserID(1).
					WithBalance(50000).
					Build()
				repo.Wallets[wallet.ID] = wallet
			},
			wantErr: false,
		},
		{
			name:   "deposit from zero to over max rejected",
			userID: 1,
			amount: 200001,
			setupRepo: func(repo *testutil.MockWalletRepository) {
				wallet := testutil.NewWalletBuilder().
					WithUserID(1).
					WithBalance(0).
					Build()
				repo.Wallets[wallet.ID] = wallet
			},
			wantErr:     true,
			errContains: "exceed maximum wallet balance",
		},
		{
			name:   "deposit from 199000 to 201000 rejected",
			userID: 1,
			amount: 2000,
			setupRepo: func(repo *testutil.MockWalletRepository) {
				wallet := testutil.NewWalletBuilder().
					WithUserID(1).
					WithBalance(199000).
					Build()
				repo.Wallets[wallet.ID] = wallet
			},
			wantErr:     true,
			errContains: "exceed maximum wallet balance",
		},
		{
			name:   "deposit to exact max allowed",
			userID: 1,
			amount: 1000,
			setupRepo: func(repo *testutil.MockWalletRepository) {
				wallet := testutil.NewWalletBuilder().
					WithUserID(1).
					WithBalance(199000).
					Build()
				repo.Wallets[wallet.ID] = wallet
			},
			wantErr: false,
		},
		{
			name:        "negative amount rejected",
			userID:      1,
			amount:      -100,
			setupRepo:   func(repo *testutil.MockWalletRepository) {},
			wantErr:     true,
			errContains: "must be positive",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			walletRepo := testutil.NewMockWalletRepository()
			walletTxRepo := testutil.NewMockWalletTransactionRepository()
			mockDB, cleanup, err := testutil.NewMockGormDB()
			if err != nil {
				t.Fatalf("Failed to create mock DB: %v", err)
			}
			defer cleanup()

			if tt.setupRepo != nil {
				tt.setupRepo(walletRepo)
			}

			service := NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
			ctx := context.Background()

			err = service.ValidateDeposit(ctx, tt.userID, tt.amount)

			testutil.AssertError(t, err, tt.wantErr, tt.errContains)
		})
	}
}

func TestWalletService_HoldInEscrow(t *testing.T) {
	tests := []struct {
		name        string
		userID      int64
		amount      int64
		taskID      int64
		setupRepo   func(*testutil.MockWalletRepository)
		wantErr     bool
		errContains string
		checkFunc   func(*testing.T, *models.Wallet, *testutil.MockWalletTransactionRepository)
	}{
		{
			name:   "successful escrow hold",
			userID: 1,
			amount: 50000,
			taskID: 1,
			setupRepo: func(repo *testutil.MockWalletRepository) {
				wallet := testutil.NewWalletBuilder().
					WithUserID(1).
					WithBalance(100000).
					Build()
				repo.Wallets[wallet.ID] = wallet
			},
			wantErr: false,
			checkFunc: func(t *testing.T, wallet *models.Wallet, txRepo *testutil.MockWalletTransactionRepository) {
				testutil.AssertEqual(t, wallet.Balance, int64(50000), "Balance should decrease")
				testutil.AssertEqual(t, wallet.EscrowBalance, int64(50000), "Escrow should increase")
				testutil.AssertEqual(t, wallet.TotalSpent, int64(50000), "TotalSpent should increase")

				// Check transaction
				testutil.AssertTrue(t, len(txRepo.Transactions) > 0, "Transaction should be created")
				for _, tx := range txRepo.Transactions {
					testutil.AssertEqual(t, tx.Type, models.WalletTransactionTypeEscrowHold, "Transaction type")
					testutil.AssertEqual(t, tx.Amount, int64(-50000), "Amount should be negative")
				}
			},
		},
		{
			name:   "insufficient balance",
			userID: 1,
			amount: 150000,
			taskID: 1,
			setupRepo: func(repo *testutil.MockWalletRepository) {
				wallet := testutil.NewWalletBuilder().
					WithUserID(1).
					WithBalance(100000).
					Build()
				repo.Wallets[wallet.ID] = wallet
			},
			wantErr:     true,
			errContains: "insufficient balance",
		},
		{
			name:        "negative amount rejected",
			userID:      1,
			amount:      -50000,
			taskID:      1,
			setupRepo:   func(repo *testutil.MockWalletRepository) {},
			wantErr:     true,
			errContains: "must be positive",
		},
		{
			name:        "wallet not found",
			userID:      999,
			amount:      50000,
			taskID:      1,
			setupRepo:   func(repo *testutil.MockWalletRepository) {},
			wantErr:     true,
			errContains: "wallet not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			walletRepo := testutil.NewMockWalletRepository()
			walletTxRepo := testutil.NewMockWalletTransactionRepository()
			mockDB, cleanup, err := testutil.NewMockGormDB()
			if err != nil {
				t.Fatalf("Failed to create mock DB: %v", err)
			}
			defer cleanup()

			if tt.setupRepo != nil {
				tt.setupRepo(walletRepo)
			}

			service := NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
			ctx := context.Background()

			err = service.HoldInEscrow(ctx, tt.userID, tt.amount, tt.taskID, nil)

			testutil.AssertError(t, err, tt.wantErr, tt.errContains)
			if !tt.wantErr {
				wallet, _ := walletRepo.GetByUserID(ctx, tt.userID)
				testutil.AssertNotNil(t, wallet, "Wallet should exist")
				if tt.checkFunc != nil {
					tt.checkFunc(t, wallet, walletTxRepo)
				}
			}
		})
	}
}

func TestWalletService_ReleaseFromEscrow(t *testing.T) {
	tests := []struct {
		name        string
		payerID     int64
		payeeID     int64
		amount      int64
		taskID      int64
		setupRepo   func(*testutil.MockWalletRepository)
		wantErr     bool
		errContains string
		checkFunc   func(*testing.T, *testutil.MockWalletRepository, *testutil.MockWalletTransactionRepository)
	}{
		{
			name:    "successful release to payee",
			payerID: 1,
			payeeID: 2,
			amount:  50000,
			taskID:  1,
			setupRepo: func(repo *testutil.MockWalletRepository) {
				// Payer wallet with escrow
				payerWallet := testutil.NewWalletBuilder().
					WithUserID(1).
					WithBalance(50000).
					WithEscrowBalance(50000).
					WithTotalSpent(50000).
					Build()
				repo.Wallets[payerWallet.ID] = payerWallet

				// Payee wallet (will be created if doesn't exist)
			},
			wantErr: false,
			checkFunc: func(t *testing.T, walletRepo *testutil.MockWalletRepository, txRepo *testutil.MockWalletTransactionRepository) {
				// Check payer wallet
				var payerWallet *models.Wallet
				for _, w := range walletRepo.Wallets {
					if w.UserID == 1 {
						payerWallet = w
						break
					}
				}
				testutil.AssertNotNil(t, payerWallet, "Payer wallet should exist")
				testutil.AssertEqual(t, payerWallet.EscrowBalance, int64(0), "Payer escrow should be released")

				// Check payee wallet
				var payeeWallet *models.Wallet
				for _, w := range walletRepo.Wallets {
					if w.UserID == 2 {
						payeeWallet = w
						break
					}
				}
				testutil.AssertNotNil(t, payeeWallet, "Payee wallet should exist")
				testutil.AssertEqual(t, payeeWallet.Balance, int64(50000), "Payee balance should increase")
				testutil.AssertEqual(t, payeeWallet.TotalEarned, int64(50000), "Payee TotalEarned should increase")

				// Check transactions (2 should be created: payer and payee)
				testutil.AssertTrue(t, len(txRepo.Transactions) == 2, "Two transactions should be created")
			},
		},
		{
			name:    "insufficient escrow",
			payerID: 1,
			payeeID: 2,
			amount:  100000,
			taskID:  1,
			setupRepo: func(repo *testutil.MockWalletRepository) {
				payerWallet := testutil.NewWalletBuilder().
					WithUserID(1).
					WithEscrowBalance(50000).
					Build()
				repo.Wallets[payerWallet.ID] = payerWallet
			},
			wantErr:     true,
			errContains: "insufficient escrow balance",
		},
		{
			name:        "payer wallet not found",
			payerID:     999,
			payeeID:     2,
			amount:      50000,
			taskID:      1,
			setupRepo:   func(repo *testutil.MockWalletRepository) {},
			wantErr:     true,
			errContains: "wallet not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			walletRepo := testutil.NewMockWalletRepository()
			walletTxRepo := testutil.NewMockWalletTransactionRepository()
			mockDB, cleanup, err := testutil.NewMockGormDB()
			if err != nil {
				t.Fatalf("Failed to create mock DB: %v", err)
			}
			defer cleanup()

			if tt.setupRepo != nil {
				tt.setupRepo(walletRepo)
			}

			service := NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
			ctx := context.Background()

			err = service.ReleaseFromEscrow(ctx, tt.payerID, tt.payeeID, tt.amount, tt.taskID, nil)

			testutil.AssertError(t, err, tt.wantErr, tt.errContains)
			if !tt.wantErr && tt.checkFunc != nil {
				tt.checkFunc(t, walletRepo, walletTxRepo)
			}
		})
	}
}

func TestWalletService_RefundFromEscrow(t *testing.T) {
	tests := []struct {
		name        string
		userID      int64
		amount      int64
		taskID      int64
		setupRepo   func(*testutil.MockWalletRepository)
		wantErr     bool
		errContains string
		checkFunc   func(*testing.T, *models.Wallet, *testutil.MockWalletTransactionRepository)
	}{
		{
			name:   "successful refund",
			userID: 1,
			amount: 50000,
			taskID: 1,
			setupRepo: func(repo *testutil.MockWalletRepository) {
				wallet := testutil.NewWalletBuilder().
					WithUserID(1).
					WithBalance(50000).
					WithEscrowBalance(50000).
					WithTotalSpent(50000).
					Build()
				repo.Wallets[wallet.ID] = wallet
			},
			wantErr: false,
			checkFunc: func(t *testing.T, wallet *models.Wallet, txRepo *testutil.MockWalletTransactionRepository) {
				testutil.AssertEqual(t, wallet.Balance, int64(100000), "Balance should increase")
				testutil.AssertEqual(t, wallet.EscrowBalance, int64(0), "Escrow should decrease")
				testutil.AssertEqual(t, wallet.TotalSpent, int64(0), "TotalSpent should be reversed")

				// Check transaction
				testutil.AssertTrue(t, len(txRepo.Transactions) > 0, "Transaction should be created")
				for _, tx := range txRepo.Transactions {
					testutil.AssertEqual(t, tx.Type, models.WalletTransactionTypeEscrowRefund, "Transaction type")
					testutil.AssertEqual(t, tx.Amount, int64(50000), "Amount should be positive")
				}
			},
		},
		{
			name:   "insufficient escrow",
			userID: 1,
			amount: 100000,
			taskID: 1,
			setupRepo: func(repo *testutil.MockWalletRepository) {
				wallet := testutil.NewWalletBuilder().
					WithUserID(1).
					WithEscrowBalance(50000).
					Build()
				repo.Wallets[wallet.ID] = wallet
			},
			wantErr:     true,
			errContains: "insufficient escrow balance",
		},
		{
			name:        "negative amount rejected",
			userID:      1,
			amount:      -50000,
			taskID:      1,
			setupRepo:   func(repo *testutil.MockWalletRepository) {},
			wantErr:     true,
			errContains: "must be positive",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			walletRepo := testutil.NewMockWalletRepository()
			walletTxRepo := testutil.NewMockWalletTransactionRepository()
			mockDB, cleanup, err := testutil.NewMockGormDB()
			if err != nil {
				t.Fatalf("Failed to create mock DB: %v", err)
			}
			defer cleanup()

			if tt.setupRepo != nil {
				tt.setupRepo(walletRepo)
			}

			service := NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
			ctx := context.Background()

			err = service.RefundFromEscrow(ctx, tt.userID, tt.amount, tt.taskID, nil)

			testutil.AssertError(t, err, tt.wantErr, tt.errContains)
			if !tt.wantErr {
				wallet, _ := walletRepo.GetByUserID(ctx, tt.userID)
				testutil.AssertNotNil(t, wallet, "Wallet should exist")
				if tt.checkFunc != nil {
					tt.checkFunc(t, wallet, walletTxRepo)
				}
			}
		})
	}
}

func TestWalletService_GetTransactionHistory(t *testing.T) {
	tests := []struct {
		name        string
		userID      int64
		limit       int
		offset      int
		setupRepo   func(*testutil.MockWalletRepository, *testutil.MockWalletTransactionRepository)
		wantErr     bool
		errContains string
		checkCount  int
	}{
		{
			name:   "get transaction history with limit",
			userID: 1,
			limit:  2,
			offset: 0,
			setupRepo: func(walletRepo *testutil.MockWalletRepository, txRepo *testutil.MockWalletTransactionRepository) {
				wallet := testutil.NewWalletBuilder().WithUserID(1).Build()
				walletRepo.Wallets[wallet.ID] = wallet

				// Create 3 transactions
				for i := int64(1); i <= 3; i++ {
					tx := testutil.NewWalletTransactionBuilder().
						WithWalletID(wallet.ID).
						WithAmount(i * 10000).
						Build()
					tx.ID = i
					txRepo.Transactions[tx.ID] = tx
				}
			},
			wantErr:    false,
			checkCount: 2,
		},
		{
			name:   "get all transactions",
			userID: 1,
			limit:  0,
			offset: 0,
			setupRepo: func(walletRepo *testutil.MockWalletRepository, txRepo *testutil.MockWalletTransactionRepository) {
				wallet := testutil.NewWalletBuilder().WithUserID(1).Build()
				walletRepo.Wallets[wallet.ID] = wallet

				for i := int64(1); i <= 5; i++ {
					tx := testutil.NewWalletTransactionBuilder().
						WithWalletID(wallet.ID).
						Build()
					tx.ID = i
					txRepo.Transactions[tx.ID] = tx
				}
			},
			wantErr:    false,
			checkCount: 5,
		},
		{
			name:        "wallet not found",
			userID:      999,
			limit:       10,
			offset:      0,
			setupRepo:   func(walletRepo *testutil.MockWalletRepository, txRepo *testutil.MockWalletTransactionRepository) {},
			wantErr:     true,
			errContains: "wallet not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			walletRepo := testutil.NewMockWalletRepository()
			walletTxRepo := testutil.NewMockWalletTransactionRepository()
			mockDB, cleanup, err := testutil.NewMockGormDB()
			if err != nil {
				t.Fatalf("Failed to create mock DB: %v", err)
			}
			defer cleanup()

			if tt.setupRepo != nil {
				tt.setupRepo(walletRepo, walletTxRepo)
			}

			service := NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
			ctx := context.Background()

			transactions, err := service.GetTransactionHistory(ctx, tt.userID, tt.limit, tt.offset)

			testutil.AssertError(t, err, tt.wantErr, tt.errContains)
			if !tt.wantErr {
				testutil.AssertNotNil(t, transactions, "Transactions should not be nil")
				if tt.checkCount > 0 {
					testutil.AssertEqual(t, len(transactions), tt.checkCount, "Transaction count")
				}
			}
		})
	}
}
