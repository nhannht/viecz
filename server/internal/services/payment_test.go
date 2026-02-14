package services

import (
	"context"
	"errors"
	"testing"

	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/testutil"
)

func TestPaymentService_CreateEscrowPayment(t *testing.T) {
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
			name:    "successful escrow payment",
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
				testutil.AssertEqual(t, tx.PlatformFee, int64(0), "Platform fee (0% beta)")
				testutil.AssertEqual(t, tx.NetAmount, int64(100000), "Net amount")
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
			name:    "insufficient wallet balance",
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
			taskRepo := testutil.NewMockTaskRepository()
			txRepo := testutil.NewMockTransactionRepository()
			walletRepo := testutil.NewMockWalletRepository()
			walletTxRepo := testutil.NewMockWalletTransactionRepository()

			if tt.setupRepos != nil {
				tt.setupRepos(taskRepo, txRepo)
			}

			mockDB, cleanup, err := testutil.NewMockGormDB()
			if err != nil {
				t.Fatalf("Failed to create mock DB: %v", err)
			}
			defer cleanup()

			walletService := NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)

			if tt.setupWallet != nil {
				balance := int64(200000)
				if tt.errContains == "insufficient balance" {
					balance = 10000
				}
				wallet := &models.Wallet{
					ID:            1,
					UserID:        tt.payerID,
					Balance:       balance,
					EscrowBalance: 0,
				}
				walletRepo.Wallets[1] = wallet
			}

			service := NewPaymentService(txRepo, taskRepo, nil, walletService, 0)

			ctx := context.Background()

			transaction, checkoutURL, err := service.CreateEscrowPayment(ctx, tt.taskID, tt.payerID)

			testutil.AssertError(t, err, tt.wantErr, tt.errContains)
			if !tt.wantErr {
				testutil.AssertNotNil(t, transaction, "Transaction")
				testutil.AssertEqual(t, checkoutURL, "", "Checkout URL should be empty")
				if tt.checkTransaction != nil {
					tt.checkTransaction(t, transaction)
				}
				if len(walletTxRepo.Transactions) > 0 {
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

func TestPaymentService_CreateEscrowPayment_WithProposedPrice(t *testing.T) {
	taskRepo := testutil.NewMockTaskRepository()
	txRepo := testutil.NewMockTransactionRepository()
	appRepo := testutil.NewMockTaskApplicationRepository()
	walletRepo := testutil.NewMockWalletRepository()
	walletTxRepo := testutil.NewMockWalletTransactionRepository()

	task := testutil.NewTaskBuilder().
		WithID(1).
		WithRequesterID(1).
		WithTaskerID(2).
		WithPrice(100000).
		WithStatus(models.TaskStatusOpen).
		Build()
	taskRepo.Tasks[1] = task

	proposedPrice := int64(90000)
	app := &models.TaskApplication{
		TaskID:        1,
		TaskerID:      2,
		ProposedPrice: &proposedPrice,
		Status:        models.ApplicationStatusAccepted,
	}
	appRepo.Create(context.Background(), app)

	wallet := &models.Wallet{
		ID:            1,
		UserID:        1,
		Balance:       200000,
		EscrowBalance: 0,
	}
	walletRepo.Wallets[1] = wallet

	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	walletService := NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)

	service := NewPaymentService(txRepo, taskRepo, appRepo, walletService, 0.10)

	transaction, checkoutURL, err := service.CreateEscrowPayment(context.Background(), 1, 1)

	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	testutil.AssertNotNil(t, transaction, "Transaction")
	testutil.AssertEqual(t, checkoutURL, "", "Checkout URL should be empty")

	testutil.AssertEqual(t, transaction.Amount, int64(90000), "Amount should use proposed price")
	testutil.AssertEqual(t, transaction.PlatformFee, int64(9000), "Platform fee (10% of 90000)")
	testutil.AssertEqual(t, transaction.NetAmount, int64(81000), "Net amount (90000 - 9000)")
	testutil.AssertEqual(t, transaction.Status, models.TransactionStatusSuccess, "Status")

	foundEscrow := false
	for _, wtx := range walletTxRepo.Transactions {
		if wtx.Type == models.WalletTransactionTypeEscrowHold {
			foundEscrow = true
			testutil.AssertEqual(t, wtx.Amount, int64(-90000), "Wallet escrow amount should be proposed price")
		}
	}
	testutil.AssertTrue(t, foundEscrow, "Wallet escrow transaction should exist")
}

func TestPaymentService_ReleasePayment(t *testing.T) {
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
			name:        "successful payment release",
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
				task := taskRepo.Tasks[1]
				testutil.AssertEqual(t, task.Status, models.TaskStatusInProgress, "Task status should remain in_progress")

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
				task.TaskerID = nil
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
			taskRepo := testutil.NewMockTaskRepository()
			txRepo := testutil.NewMockTransactionRepository()
			walletRepo := testutil.NewMockWalletRepository()
			walletTxRepo := testutil.NewMockWalletTransactionRepository()

			if tt.setupRepos != nil {
				tt.setupRepos(taskRepo, txRepo)
			}

			payerWallet := &models.Wallet{
				ID:            1,
				UserID:        tt.requesterID,
				Balance:       0,
				EscrowBalance: 100000,
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

			walletService := NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)

			service := NewPaymentService(txRepo, taskRepo, nil, walletService, 0)

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

func TestPaymentService_RefundPayment(t *testing.T) {
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
			name:        "successful refund",
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
				task := taskRepo.Tasks[1]
				testutil.AssertEqual(t, task.Status, models.TaskStatusCancelled, "Task status")

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
			taskRepo := testutil.NewMockTaskRepository()
			txRepo := testutil.NewMockTransactionRepository()
			walletRepo := testutil.NewMockWalletRepository()
			walletTxRepo := testutil.NewMockWalletTransactionRepository()

			if tt.setupRepos != nil {
				tt.setupRepos(taskRepo, txRepo)
			}

			wallet := &models.Wallet{
				ID:            1,
				UserID:        tt.requesterID,
				Balance:       0,
				EscrowBalance: 100000,
				TotalSpent:    100000,
			}
			walletRepo.Wallets[1] = wallet

			mockDB, cleanup, err := testutil.NewMockGormDB()
			if err != nil {
				t.Fatalf("Failed to create mock DB: %v", err)
			}
			defer cleanup()

			walletService := NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)

			service := NewPaymentService(txRepo, taskRepo, nil, walletService, 0)

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

			service := NewPaymentService(txRepo, nil, nil, nil, 0)
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
