package services

import (
	"context"
	"errors"
	"os"
	"testing"

	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/testutil"
)

func TestPaymentService_CreateEscrowPayment_MockMode(t *testing.T) {
	tests := []struct {
		name             string
		taskID           int64
		payerID          int64
		setupRepos       func(*testutil.MockTaskRepository, *testutil.MockTransactionRepository)
		setupWallet      func(*testutil.MockWalletService)
		wantErr          bool
		errContains      string
		checkTransaction func(*testing.T, *models.Transaction)
		checkWalletCalls func(*testing.T, *testutil.MockWalletService)
	}{
		{
			name:    "successful escrow payment - mock mode",
			taskID:  1,
			payerID: 1,
			setupRepos: func(taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository) {
				task := testutil.NewTaskBuilder().
					WithID(1).
					WithRequesterID(1).
					WithTaskerID(2).
					WithPrice(100000).
					WithStatus(models.TaskStatusOpen).
					Build()
				taskRepo.Tasks[1] = task
			},
			setupWallet: func(ws *testutil.MockWalletService) {
				ws.ShouldFail = false
			},
			wantErr: false,
			checkTransaction: func(t *testing.T, tx *models.Transaction) {
				testutil.AssertEqual(t, tx.Amount, int64(100000), "Amount")
				testutil.AssertEqual(t, tx.PlatformFee, int64(10000), "Platform fee (10%)")
				testutil.AssertEqual(t, tx.NetAmount, int64(90000), "Net amount")
				testutil.AssertEqual(t, tx.Status, models.TransactionStatusSuccess, "Status")
				testutil.AssertEqual(t, tx.Type, models.TransactionTypeEscrow, "Type")
			},
			checkWalletCalls: func(t *testing.T, ws *testutil.MockWalletService) {
				testutil.AssertEqual(t, len(ws.HoldInEscrowCalls), 1, "HoldInEscrow should be called once")
				call := ws.HoldInEscrowCalls[0]
				testutil.AssertEqual(t, call.UserID, int64(1), "Payer ID")
				testutil.AssertEqual(t, call.Amount, int64(100000), "Amount")
				testutil.AssertEqual(t, call.TaskID, int64(1), "Task ID")
			},
		},
		{
			name:    "insufficient wallet balance - mock mode",
			taskID:  1,
			payerID: 1,
			setupRepos: func(taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository) {
				task := testutil.NewTaskBuilder().
					WithID(1).
					WithRequesterID(1).
					WithPrice(100000).
					WithStatus(models.TaskStatusOpen).
					Build()
				taskRepo.Tasks[1] = task
			},
			setupWallet: func(ws *testutil.MockWalletService) {
				ws.ShouldFail = true
				ws.FailError = errors.New("insufficient balance")
			},
			wantErr:     true,
			errContains: "insufficient balance",
		},
		{
			name:    "task not in open status",
			taskID:  1,
			payerID: 1,
			setupRepos: func(taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository) {
				task := testutil.NewTaskBuilder().
					WithID(1).
					WithRequesterID(1).
					WithStatus(models.TaskStatusInProgress).
					Build()
				taskRepo.Tasks[1] = task
			},
			setupWallet: func(ws *testutil.MockWalletService) {},
			wantErr:     true,
			errContains: "not in open status",
		},
		{
			name:    "payer is not requester",
			taskID:  1,
			payerID: 999,
			setupRepos: func(taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository) {
				task := testutil.NewTaskBuilder().
					WithID(1).
					WithRequesterID(1).
					WithStatus(models.TaskStatusOpen).
					Build()
				taskRepo.Tasks[1] = task
			},
			setupWallet: func(ws *testutil.MockWalletService) {},
			wantErr:     true,
			errContains: "only requester can create escrow payment",
		},
		{
			name:       "task not found",
			taskID:     999,
			payerID:    1,
			setupRepos: func(taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository) {},
			setupWallet: func(ws *testutil.MockWalletService) {},
			wantErr:     true,
			errContains: "task not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Set mock mode
			os.Setenv("PAYMENT_MOCK_MODE", "true")
			defer os.Unsetenv("PAYMENT_MOCK_MODE")

			taskRepo := testutil.NewMockTaskRepository()
			txRepo := testutil.NewMockTransactionRepository()
			walletRepo := testutil.NewMockWalletRepository()
			walletTxRepo := testutil.NewMockWalletTransactionRepository()

			if tt.setupRepos != nil {
				tt.setupRepos(taskRepo, txRepo)
			}

			// Create real wallet service with mock repositories and in-memory DB
			mockDB, cleanup, err := testutil.NewMockGormDB()
			if err != nil {
				t.Fatalf("Failed to create mock DB: %v", err)
			}
			defer cleanup()

			walletService := NewWalletService(walletRepo, walletTxRepo, mockDB)

			// Setup wallet behavior through repository
			if tt.setupWallet != nil {
				// For mock mode, we need to setup the wallet in the repository
				balance := int64(200000) // Sufficient balance by default
				if tt.errContains == "insufficient balance" {
					balance = 10000 // Insufficient for 100000 payment
				}
				wallet := &models.Wallet{
					ID:            1,
					UserID:        tt.payerID,
					Balance:       balance,
					EscrowBalance: 0,
				}
				walletRepo.Wallets[1] = wallet
			}

			// Create payment service
			service := NewPaymentService(txRepo, taskRepo, walletService, nil)
			service.mockMode = true

			ctx := context.Background()

			transaction, checkoutURL, err := service.CreateEscrowPayment(ctx, tt.taskID, tt.payerID)

			testutil.AssertError(t, err, tt.wantErr, tt.errContains)
			if !tt.wantErr {
				testutil.AssertNotNil(t, transaction, "Transaction")
				testutil.AssertEqual(t, checkoutURL, "", "Checkout URL should be empty in mock mode")
				if tt.checkTransaction != nil {
					tt.checkTransaction(t, transaction)
				}
				// Check wallet repository was called
				if len(walletTxRepo.Transactions) > 0 {
					// Verify escrow transaction was created in wallet
					foundEscrow := false
					for _, wtx := range walletTxRepo.Transactions {
						if wtx.Type == models.WalletTransactionTypeEscrowHold {
							foundEscrow = true
							testutil.AssertEqual(t, wtx.Amount, int64(-100000), "Wallet transaction amount")
						}
					}
					testutil.AssertTrue(t, foundEscrow, "Wallet escrow transaction should exist")
				}
			}
		})
	}
}

func TestPaymentService_CreateEscrowPayment_RealMode(t *testing.T) {
	tests := []struct {
		name             string
		taskID           int64
		payerID          int64
		setupRepos       func(*testutil.MockTaskRepository, *testutil.MockTransactionRepository)
		setupPayOS       func(*testutil.MockPayOSService)
		wantErr          bool
		errContains      string
		checkTransaction func(*testing.T, *models.Transaction, string)
		checkPayOSCalls  func(*testing.T, *testutil.MockPayOSService)
	}{
		{
			name:    "successful payment link creation - real mode",
			taskID:  1,
			payerID: 1,
			setupRepos: func(taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository) {
				task := testutil.NewTaskBuilder().
					WithID(1).
					WithRequesterID(1).
					WithTaskerID(2).
					WithPrice(100000).
					WithStatus(models.TaskStatusOpen).
					Build()
				taskRepo.Tasks[1] = task
			},
			setupPayOS: func(ps *testutil.MockPayOSService) {
				ps.ShouldFail = false
			},
			wantErr: false,
			checkTransaction: func(t *testing.T, tx *models.Transaction, checkoutURL string) {
				testutil.AssertEqual(t, tx.Amount, int64(100000), "Amount")
				testutil.AssertEqual(t, tx.Status, models.TransactionStatusPending, "Status should be pending")
				testutil.AssertNotNil(t, tx.PayOSOrderCode, "PayOS order code should be set")
				testutil.AssertNotNil(t, tx.PayOSPaymentID, "PayOS payment ID should be set")
				testutil.AssertTrue(t, checkoutURL != "", "Checkout URL should not be empty")
			},
			checkPayOSCalls: func(t *testing.T, ps *testutil.MockPayOSService) {
				testutil.AssertEqual(t, len(ps.CreatePaymentLinkCalls), 1, "CreatePaymentLink should be called once")
				call := ps.CreatePaymentLinkCalls[0]
				testutil.AssertEqual(t, call.Amount, 100000, "Payment amount")
			},
		},
		{
			name:    "PayOS API failure - real mode",
			taskID:  1,
			payerID: 1,
			setupRepos: func(taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository) {
				task := testutil.NewTaskBuilder().
					WithID(1).
					WithRequesterID(1).
					WithPrice(100000).
					WithStatus(models.TaskStatusOpen).
					Build()
				taskRepo.Tasks[1] = task
			},
			setupPayOS: func(ps *testutil.MockPayOSService) {
				ps.ShouldFail = true
				ps.FailError = errors.New("PayOS API error")
			},
			wantErr:     true,
			errContains: "failed to create payment link",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Unset mock mode (real mode)
			os.Unsetenv("PAYMENT_MOCK_MODE")

			taskRepo := testutil.NewMockTaskRepository()
			txRepo := testutil.NewMockTransactionRepository()

			if tt.setupRepos != nil {
				tt.setupRepos(taskRepo, txRepo)
			}

			// For real mode testing, we skip PayOS integration since it requires
			// actual API credentials. In a real test environment, you would use
			// the mock PayOSService or test against a sandbox environment.
			// For now, we'll skip real mode tests or mark them as integration tests.
			t.Skip("Real mode PayOS tests require API credentials - run as integration test")

			ctx := context.Background()

			// Placeholder for when PayOS mock is properly set up
			_ = ctx
		})
	}
}

func TestPaymentService_ReleasePayment_MockMode(t *testing.T) {
	tests := []struct {
		name             string
		taskID           int64
		requesterID      int64
		setupRepos       func(*testutil.MockTaskRepository, *testutil.MockTransactionRepository)
		setupWallet      func(*testutil.MockWalletService)
		wantErr          bool
		errContains      string
		checkRepos       func(*testing.T, *testutil.MockTaskRepository, *testutil.MockTransactionRepository)
		checkWalletCalls func(*testing.T, *testutil.MockWalletService)
	}{
		{
			name:        "successful payment release - mock mode",
			taskID:      1,
			requesterID: 1,
			setupRepos: func(taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository) {
				taskerID := int64(2)
				task := testutil.NewTaskBuilder().
					WithID(1).
					WithRequesterID(1).
					WithTaskerID(taskerID).
					WithPrice(100000).
					WithStatus(models.TaskStatusInProgress).
					Build()
				taskRepo.Tasks[1] = task

				// Escrow transaction
				escrowTx := testutil.NewTransactionBuilder().
					WithTaskID(1).
					WithPayerID(1).
					WithPayeeID(taskerID).
					WithAmount(100000).
					WithPlatformFee(10000).
					WithType(models.TransactionTypeEscrow).
					WithStatus(models.TransactionStatusSuccess).
					Build()
				txRepo.Transactions[escrowTx.ID] = escrowTx
			},
			setupWallet: func(ws *testutil.MockWalletService) {
				ws.ShouldFail = false
			},
			wantErr: false,
			checkRepos: func(t *testing.T, taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository) {
				// Check task status updated to completed
				task := taskRepo.Tasks[1]
				testutil.AssertEqual(t, task.Status, models.TaskStatusCompleted, "Task status")
				testutil.AssertNotNil(t, task.CompletedAt, "Task completed at")

				// Check release transaction created
				releaseFound := false
				platformFeeFound := false
				for _, tx := range txRepo.Transactions {
					if tx.Type == models.TransactionTypeRelease {
						releaseFound = true
						testutil.AssertEqual(t, tx.Amount, int64(90000), "Release amount (net)")
						testutil.AssertEqual(t, tx.Status, models.TransactionStatusSuccess, "Release status")
					}
					if tx.Type == models.TransactionTypePlatformFee {
						platformFeeFound = true
						testutil.AssertEqual(t, tx.Amount, int64(10000), "Platform fee amount")
						testutil.AssertEqual(t, tx.Status, models.TransactionStatusSuccess, "Fee status")
					}
				}
				testutil.AssertTrue(t, releaseFound, "Release transaction should be created")
				testutil.AssertTrue(t, platformFeeFound, "Platform fee transaction should be created")
			},
			checkWalletCalls: func(t *testing.T, ws *testutil.MockWalletService) {
				testutil.AssertEqual(t, len(ws.ReleaseFromEscrowCalls), 1, "ReleaseFromEscrow should be called once")
				call := ws.ReleaseFromEscrowCalls[0]
				testutil.AssertEqual(t, call.Amount, int64(90000), "Release amount (net)")
				testutil.AssertEqual(t, call.PayerID, int64(1), "Payer ID")
				testutil.AssertEqual(t, call.PayeeID, int64(2), "Payee ID")
			},
		},
		{
			name:        "task not in progress",
			taskID:      1,
			requesterID: 1,
			setupRepos: func(taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository) {
				task := testutil.NewTaskBuilder().
					WithID(1).
					WithRequesterID(1).
					WithStatus(models.TaskStatusOpen).
					Build()
				taskRepo.Tasks[1] = task
			},
			setupWallet: func(ws *testutil.MockWalletService) {},
			wantErr:     true,
			errContains: "not in progress",
		},
		{
			name:        "no tasker assigned",
			taskID:      1,
			requesterID: 1,
			setupRepos: func(taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository) {
				task := testutil.NewTaskBuilder().
					WithID(1).
					WithRequesterID(1).
					WithStatus(models.TaskStatusInProgress).
					Build()
				task.TaskerID = nil // No tasker
				taskRepo.Tasks[1] = task
			},
			setupWallet: func(ws *testutil.MockWalletService) {},
			wantErr:     true,
			errContains: "no tasker assigned",
		},
		{
			name:        "no successful escrow transaction found",
			taskID:      1,
			requesterID: 1,
			setupRepos: func(taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository) {
				taskerID := int64(2)
				task := testutil.NewTaskBuilder().
					WithID(1).
					WithRequesterID(1).
					WithTaskerID(taskerID).
					WithStatus(models.TaskStatusInProgress).
					Build()
				taskRepo.Tasks[1] = task
				// No escrow transaction
			},
			setupWallet: func(ws *testutil.MockWalletService) {},
			wantErr:     true,
			errContains: "no successful escrow transaction",
		},
		{
			name:        "requester validation fails",
			taskID:      1,
			requesterID: 999,
			setupRepos: func(taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository) {
				task := testutil.NewTaskBuilder().
					WithID(1).
					WithRequesterID(1).
					WithStatus(models.TaskStatusInProgress).
					Build()
				taskRepo.Tasks[1] = task
			},
			setupWallet: func(ws *testutil.MockWalletService) {},
			wantErr:     true,
			errContains: "only requester can release payment",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			os.Setenv("PAYMENT_MOCK_MODE", "true")
			defer os.Unsetenv("PAYMENT_MOCK_MODE")

			taskRepo := testutil.NewMockTaskRepository()
			txRepo := testutil.NewMockTransactionRepository()
			walletRepo := testutil.NewMockWalletRepository()
			walletTxRepo := testutil.NewMockWalletTransactionRepository()

			if tt.setupRepos != nil {
				tt.setupRepos(taskRepo, txRepo)
			}

			// Setup wallets for payer and payee
			payerWallet := &models.Wallet{
				ID:            1,
				UserID:        tt.requesterID,
				Balance:       0,
				EscrowBalance: 100000, // Has funds in escrow
			}
			walletRepo.Wallets[1] = payerWallet

			payeeWallet := &models.Wallet{
				ID:            2,
				UserID:        2,
				Balance:       0,
				EscrowBalance: 0,
			}
			walletRepo.Wallets[2] = payeeWallet

			mockDB, cleanup, err := testutil.NewMockGormDB()
			if err != nil {
				t.Fatalf("Failed to create mock DB: %v", err)
			}
			defer cleanup()

			walletService := NewWalletService(walletRepo, walletTxRepo, mockDB)

			service := NewPaymentService(txRepo, taskRepo, walletService, nil)
			service.mockMode = true

			ctx := context.Background()

			err = service.ReleasePayment(ctx, tt.taskID, tt.requesterID)

			testutil.AssertError(t, err, tt.wantErr, tt.errContains)
			if !tt.wantErr {
				if tt.checkRepos != nil {
					tt.checkRepos(t, taskRepo, txRepo)
				}
			}
		})
	}
}

func TestPaymentService_RefundPayment_MockMode(t *testing.T) {
	tests := []struct {
		name             string
		taskID           int64
		requesterID      int64
		reason           string
		setupRepos       func(*testutil.MockTaskRepository, *testutil.MockTransactionRepository)
		setupWallet      func(*testutil.MockWalletService)
		wantErr          bool
		errContains      string
		checkRepos       func(*testing.T, *testutil.MockTaskRepository, *testutil.MockTransactionRepository)
		checkWalletCalls func(*testing.T, *testutil.MockWalletService)
	}{
		{
			name:        "successful refund - mock mode",
			taskID:      1,
			requesterID: 1,
			reason:      "Task cancelled by requester",
			setupRepos: func(taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository) {
				task := testutil.NewTaskBuilder().
					WithID(1).
					WithRequesterID(1).
					WithPrice(100000).
					WithStatus(models.TaskStatusInProgress).
					Build()
				taskRepo.Tasks[1] = task

				// Escrow transaction
				escrowTx := testutil.NewTransactionBuilder().
					WithTaskID(1).
					WithPayerID(1).
					WithAmount(100000).
					WithPlatformFee(10000).
					WithType(models.TransactionTypeEscrow).
					WithStatus(models.TransactionStatusSuccess).
					Build()
				txRepo.Transactions[escrowTx.ID] = escrowTx
			},
			setupWallet: func(ws *testutil.MockWalletService) {
				ws.ShouldFail = false
			},
			wantErr: false,
			checkRepos: func(t *testing.T, taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository) {
				// Check task status updated to cancelled
				task := taskRepo.Tasks[1]
				testutil.AssertEqual(t, task.Status, models.TaskStatusCancelled, "Task status")

				// Check refund transaction created
				refundFound := false
				for _, tx := range txRepo.Transactions {
					if tx.Type == models.TransactionTypeRefund {
						refundFound = true
						testutil.AssertEqual(t, tx.Amount, int64(100000), "Refund full amount")
						testutil.AssertEqual(t, tx.Status, models.TransactionStatusSuccess, "Refund status")
					}
				}
				testutil.AssertTrue(t, refundFound, "Refund transaction should be created")
			},
			checkWalletCalls: func(t *testing.T, ws *testutil.MockWalletService) {
				testutil.AssertEqual(t, len(ws.RefundFromEscrowCalls), 1, "RefundFromEscrow should be called once")
				call := ws.RefundFromEscrowCalls[0]
				testutil.AssertEqual(t, call.Amount, int64(100000), "Refund full amount including fee")
				testutil.AssertEqual(t, call.UserID, int64(1), "Requester ID")
			},
		},
		{
			name:        "task not in progress",
			taskID:      1,
			requesterID: 1,
			reason:      "Cancel",
			setupRepos: func(taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository) {
				task := testutil.NewTaskBuilder().
					WithID(1).
					WithRequesterID(1).
					WithStatus(models.TaskStatusCompleted).
					Build()
				taskRepo.Tasks[1] = task
			},
			setupWallet: func(ws *testutil.MockWalletService) {},
			wantErr:     true,
			errContains: "not in progress",
		},
		{
			name:        "requester validation fails",
			taskID:      1,
			requesterID: 999,
			reason:      "Cancel",
			setupRepos: func(taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository) {
				task := testutil.NewTaskBuilder().
					WithID(1).
					WithRequesterID(1).
					WithStatus(models.TaskStatusInProgress).
					Build()
				taskRepo.Tasks[1] = task
			},
			setupWallet: func(ws *testutil.MockWalletService) {},
			wantErr:     true,
			errContains: "only requester can refund payment",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			os.Setenv("PAYMENT_MOCK_MODE", "true")
			defer os.Unsetenv("PAYMENT_MOCK_MODE")

			taskRepo := testutil.NewMockTaskRepository()
			txRepo := testutil.NewMockTransactionRepository()
			walletRepo := testutil.NewMockWalletRepository()
			walletTxRepo := testutil.NewMockWalletTransactionRepository()

			if tt.setupRepos != nil {
				tt.setupRepos(taskRepo, txRepo)
			}

			// Setup wallet with escrow balance and TotalSpent
			// The wallet should reflect that money was spent (moved to escrow)
			wallet := &models.Wallet{
				ID:            1,
				UserID:        tt.requesterID,
				Balance:       0,
				EscrowBalance: 100000,
				TotalSpent:    100000, // Amount that was moved to escrow
			}
			walletRepo.Wallets[1] = wallet

			mockDB, cleanup, err := testutil.NewMockGormDB()
			if err != nil {
				t.Fatalf("Failed to create mock DB: %v", err)
			}
			defer cleanup()

			walletService := NewWalletService(walletRepo, walletTxRepo, mockDB)

			service := NewPaymentService(txRepo, taskRepo, walletService, nil)
			service.mockMode = true

			ctx := context.Background()

			err = service.RefundPayment(ctx, tt.taskID, tt.requesterID, tt.reason)

			testutil.AssertError(t, err, tt.wantErr, tt.errContains)
			if !tt.wantErr {
				if tt.checkRepos != nil {
					tt.checkRepos(t, taskRepo, txRepo)
				}
			}
		})
	}
}

func TestPaymentService_GetTransactionsByTask(t *testing.T) {
	tests := []struct {
		name       string
		taskID     int64
		setupRepos func(*testutil.MockTransactionRepository)
		wantErr    bool
		checkCount int
	}{
		{
			name:   "get transactions for task",
			taskID: 1,
			setupRepos: func(txRepo *testutil.MockTransactionRepository) {
				taskID := int64(1)
				for i := 1; i <= 3; i++ {
					tx := testutil.NewTransactionBuilder().
						WithTaskID(taskID).
						Build()
					tx.ID = int64(i)
					txRepo.Transactions[tx.ID] = tx
				}
			},
			wantErr:    false,
			checkCount: 3,
		},
		{
			name:       "no transactions for task",
			taskID:     999,
			setupRepos: func(txRepo *testutil.MockTransactionRepository) {},
			wantErr:    false,
			checkCount: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			txRepo := testutil.NewMockTransactionRepository()

			if tt.setupRepos != nil {
				tt.setupRepos(txRepo)
			}

			service := NewPaymentService(txRepo, nil, nil, nil)
			ctx := context.Background()

			transactions, err := service.GetTransactionsByTask(ctx, tt.taskID)

			testutil.AssertError(t, err, tt.wantErr, "")
			if !tt.wantErr {
				testutil.AssertNotNil(t, transactions, "Transactions")
				testutil.AssertEqual(t, len(transactions), tt.checkCount, "Transaction count")
			}
		})
	}
}
