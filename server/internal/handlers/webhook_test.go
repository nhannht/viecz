package handlers

import (
	"context"
	"testing"
	"time"

	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/services"
	"viecz.vieczserver/internal/testutil"
)

// TestWebhookHandler_handlePaymentSuccess tests the payment success handler
func TestWebhookHandler_handlePaymentSuccess(t *testing.T) {
	tests := []struct {
		name               string
		orderCode          int64
		reference          string
		amount             int64
		mockTransaction    *models.Transaction
		mockTask           *models.Task
		expectedTxStatus   models.TransactionStatus
		expectedTaskStatus *models.TaskStatus
		expectError        bool
	}{
		{
			name:      "successful payment - escrow transaction with task",
			orderCode: 12345,
			reference: "FT20260101000001",
			amount:    100000,
			mockTransaction: &models.Transaction{
				ID:             1,
				TaskID:         int64Ptr(1),
				Type:           models.TransactionTypeEscrow,
				Status:         models.TransactionStatusPending,
				PayOSOrderCode: int64Ptr(12345),
			},
			mockTask: testutil.NewTaskBuilder().
				WithID(1).
				WithStatus(models.TaskStatusOpen).
				Build(),
			expectedTxStatus:   models.TransactionStatusSuccess,
			expectedTaskStatus: taskStatusPtr(models.TaskStatusInProgress),
		},
		{
			name:      "successful payment - escrow without task",
			orderCode: 12347,
			reference: "FT20260101000003",
			amount:    50000,
			mockTransaction: &models.Transaction{
				ID:             3,
				Type:           models.TransactionTypeEscrow,
				Status:         models.TransactionStatusPending,
				PayOSOrderCode: int64Ptr(12347),
			},
			expectedTxStatus: models.TransactionStatusSuccess,
		},
		{
			name:        "transaction not found",
			orderCode:   99999,
			reference:   "FT20260101999999",
			amount:      10000,
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup mock repositories
			mockTransactionRepo := testutil.NewMockTransactionRepository()
			mockTaskRepo := testutil.NewMockTaskRepository()
			mockRefRepo := testutil.NewMockPaymentReferenceRepository()

			if tt.mockTransaction != nil {
				mockTransactionRepo.Transactions[tt.mockTransaction.ID] = tt.mockTransaction
			}

			if tt.mockTask != nil {
				mockTaskRepo.Tasks[tt.mockTask.ID] = tt.mockTask
			}

			// Create handler
			handler := &WebhookHandler{
				payos:           &mockPayOSForWebhook{},
				transactionRepo: mockTransactionRepo,
				taskRepo:        mockTaskRepo,
				walletService:   nil,
				refRepo:         mockRefRepo,
			}

			// Execute handler method
			err := handler.handlePaymentSuccess(context.Background(), tt.orderCode, tt.reference, tt.amount)

			// Verify error expectation
			if tt.expectError {
				if err == nil {
					t.Error("Expected error but got nil")
				}
				return
			}

			if err != nil {
				t.Errorf("Unexpected error: %v", err)
				return
			}

			// Verify transaction status update
			if tt.mockTransaction != nil {
				updatedTx := mockTransactionRepo.Transactions[tt.mockTransaction.ID]
				if updatedTx.Status != tt.expectedTxStatus {
					t.Errorf("Expected transaction status '%s', got '%s'", tt.expectedTxStatus, updatedTx.Status)
				}
				if updatedTx.CompletedAt == nil {
					t.Error("Expected CompletedAt to be set")
				}
				// Verify CompletedAt is recent
				if time.Since(*updatedTx.CompletedAt) > time.Minute {
					t.Error("CompletedAt timestamp is too old")
				}
			}

			// Verify task status update if expected
			if tt.expectedTaskStatus != nil && tt.mockTask != nil {
				updatedTask := mockTaskRepo.Tasks[tt.mockTask.ID]
				if updatedTask.Status != *tt.expectedTaskStatus {
					t.Errorf("Expected task status '%s', got '%s'", *tt.expectedTaskStatus, updatedTask.Status)
				}
			}
		})
	}
}

// TestWebhookHandler_handlePaymentSuccess_Deposit tests deposit webhook crediting wallet
func TestWebhookHandler_handlePaymentSuccess_Deposit(t *testing.T) {
	// Setup mock repositories
	mockTransactionRepo := testutil.NewMockTransactionRepository()
	mockTaskRepo := testutil.NewMockTaskRepository()
	mockRefRepo := testutil.NewMockPaymentReferenceRepository()

	// Setup real wallet service with mock repos
	mockWalletRepo := testutil.NewMockWalletRepository()
	mockWalletTxRepo := testutil.NewMockWalletTransactionRepository()

	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock GORM DB: %v", err)
	}
	defer cleanup()

	walletService := services.NewWalletService(mockWalletRepo, mockWalletTxRepo, mockDB, 200000)

	// Pre-create a wallet for user 1
	mockWalletRepo.Wallets[1] = testutil.NewWalletBuilder().WithID(1).WithUserID(1).WithBalance(0).Build()

	// Create a pending deposit transaction
	depositTx := &models.Transaction{
		ID:             1,
		PayerID:        1,
		Amount:         50000,
		NetAmount:      50000,
		Type:           models.TransactionTypeDeposit,
		Status:         models.TransactionStatusPending,
		PayOSOrderCode: int64Ptr(99999),
		Description:    "Wallet deposit",
	}
	mockTransactionRepo.Transactions[depositTx.ID] = depositTx

	handler := &WebhookHandler{
		payos:           &mockPayOSForWebhook{},
		transactionRepo: mockTransactionRepo,
		taskRepo:        mockTaskRepo,
		walletService:   walletService,
		refRepo:         mockRefRepo,
	}

	// Simulate webhook success
	err = handler.handlePaymentSuccess(context.Background(), 99999, "FT20260101000010", 50000)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	// Verify transaction is now success
	updatedTx := mockTransactionRepo.Transactions[1]
	if updatedTx.Status != models.TransactionStatusSuccess {
		t.Errorf("Expected transaction status 'success', got '%s'", updatedTx.Status)
	}

	// Verify wallet was credited
	wallet := mockWalletRepo.Wallets[1]
	if wallet.Balance != 50000 {
		t.Errorf("Expected wallet balance 50000, got %d", wallet.Balance)
	}
}

// TestWebhookHandler_handlePaymentSuccess_DuplicateReference tests that same reference is skipped (webhook retry)
func TestWebhookHandler_handlePaymentSuccess_DuplicateReference(t *testing.T) {
	mockTransactionRepo := testutil.NewMockTransactionRepository()
	mockTaskRepo := testutil.NewMockTaskRepository()
	mockRefRepo := testutil.NewMockPaymentReferenceRepository()

	// Pre-populate the reference as already processed
	mockRefRepo.References["FT20260101000020"] = &models.PaymentReference{
		OrderCode: 11111,
		Reference: "FT20260101000020",
		Amount:    50000,
	}

	handler := &WebhookHandler{
		payos:           &mockPayOSForWebhook{},
		transactionRepo: mockTransactionRepo,
		taskRepo:        mockTaskRepo,
		walletService:   nil, // Should not be called
		refRepo:         mockRefRepo,
	}

	// Should return nil without error (skip processing — webhook retry)
	err := handler.handlePaymentSuccess(context.Background(), 11111, "FT20260101000020", 50000)
	if err != nil {
		t.Fatalf("Expected no error for duplicate reference, got: %v", err)
	}
}

// TestWebhookHandler_handlePaymentSuccess_AdditionalDeposit tests that a second unique reference
// credits the wallet (user paid the same QR twice)
func TestWebhookHandler_handlePaymentSuccess_AdditionalDeposit(t *testing.T) {
	mockTransactionRepo := testutil.NewMockTransactionRepository()
	mockTaskRepo := testutil.NewMockTaskRepository()
	mockRefRepo := testutil.NewMockPaymentReferenceRepository()

	mockWalletRepo := testutil.NewMockWalletRepository()
	mockWalletTxRepo := testutil.NewMockWalletTransactionRepository()
	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock GORM DB: %v", err)
	}
	defer cleanup()

	walletService := services.NewWalletService(mockWalletRepo, mockWalletTxRepo, mockDB, 200000)
	mockWalletRepo.Wallets[1] = testutil.NewWalletBuilder().WithID(1).WithUserID(1).WithBalance(50000).Build()

	// Transaction already marked success (first payment already processed)
	completedAt := time.Now().Add(-1 * time.Hour)
	depositTx := &models.Transaction{
		ID:             1,
		PayerID:        1,
		Amount:         50000,
		NetAmount:      50000,
		Type:           models.TransactionTypeDeposit,
		Status:         models.TransactionStatusSuccess,
		PayOSOrderCode: int64Ptr(22222),
		Description:    "Wallet deposit",
		CompletedAt:    &completedAt,
	}
	mockTransactionRepo.Transactions[depositTx.ID] = depositTx

	handler := &WebhookHandler{
		payos:           &mockPayOSForWebhook{},
		transactionRepo: mockTransactionRepo,
		taskRepo:        mockTaskRepo,
		walletService:   walletService,
		refRepo:         mockRefRepo,
	}

	// Second payment with a NEW reference (different bank transfer)
	err = handler.handlePaymentSuccess(context.Background(), 22222, "FT20260101000030", 50000)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	// Verify wallet was credited with the additional amount
	wallet := mockWalletRepo.Wallets[1]
	if wallet.Balance != 100000 {
		t.Errorf("Expected wallet balance 100000 (50000 + 50000), got %d", wallet.Balance)
	}
}

// TestWebhookHandler_handlePaymentSuccess_EscrowDuplicate tests that a second escrow payment
// is logged but doesn't double-fund the task
func TestWebhookHandler_handlePaymentSuccess_EscrowDuplicate(t *testing.T) {
	mockTransactionRepo := testutil.NewMockTransactionRepository()
	mockTaskRepo := testutil.NewMockTaskRepository()
	mockRefRepo := testutil.NewMockPaymentReferenceRepository()

	// Transaction already completed (first escrow payment)
	completedAt := time.Now().Add(-1 * time.Hour)
	escrowTx := &models.Transaction{
		ID:             1,
		PayerID:        1,
		TaskID:         int64Ptr(1),
		Amount:         100000,
		NetAmount:      100000,
		Type:           models.TransactionTypeEscrow,
		Status:         models.TransactionStatusSuccess,
		PayOSOrderCode: int64Ptr(33333),
		CompletedAt:    &completedAt,
	}
	mockTransactionRepo.Transactions[escrowTx.ID] = escrowTx

	task := testutil.NewTaskBuilder().WithID(1).WithStatus(models.TaskStatusInProgress).Build()
	mockTaskRepo.Tasks[1] = task

	handler := &WebhookHandler{
		payos:           &mockPayOSForWebhook{},
		transactionRepo: mockTransactionRepo,
		taskRepo:        mockTaskRepo,
		walletService:   nil, // Should not be called for escrow duplicate
		refRepo:         mockRefRepo,
	}

	// Second escrow payment with different reference — should log ALERT but not error
	err := handler.handlePaymentSuccess(context.Background(), 33333, "FT20260101000040", 100000)
	if err != nil {
		t.Fatalf("Expected no error for duplicate escrow, got: %v", err)
	}

	// Task should still be in_progress, not changed
	if mockTaskRepo.Tasks[1].Status != models.TaskStatusInProgress {
		t.Errorf("Expected task status in_progress, got %s", mockTaskRepo.Tasks[1].Status)
	}
}

// TestWebhookHandler_handlePaymentCancelled tests the payment cancellation handler
func TestWebhookHandler_handlePaymentCancelled(t *testing.T) {
	tests := []struct {
		name             string
		orderCode        int64
		mockTransaction  *models.Transaction
		expectedTxStatus models.TransactionStatus
		expectError      bool
	}{
		{
			name:      "successful cancellation",
			orderCode: 12345,
			mockTransaction: &models.Transaction{
				ID:             1,
				Status:         models.TransactionStatusPending,
				PayOSOrderCode: int64Ptr(12345),
			},
			expectedTxStatus: models.TransactionStatusCancelled,
		},
		{
			name:      "cancel already successful transaction",
			orderCode: 12346,
			mockTransaction: &models.Transaction{
				ID:             2,
				Status:         models.TransactionStatusSuccess,
				PayOSOrderCode: int64Ptr(12346),
			},
			expectedTxStatus: models.TransactionStatusCancelled,
		},
		{
			name:        "transaction not found",
			orderCode:   99999,
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup mock repositories
			mockTransactionRepo := testutil.NewMockTransactionRepository()
			mockTaskRepo := testutil.NewMockTaskRepository()

			if tt.mockTransaction != nil {
				mockTransactionRepo.Transactions[tt.mockTransaction.ID] = tt.mockTransaction
			}

			// Create handler
			handler := &WebhookHandler{
				payos:           &mockPayOSForWebhook{},
				transactionRepo: mockTransactionRepo,
				taskRepo:        mockTaskRepo,
				walletService:   nil,
			}

			// Execute handler method
			err := handler.handlePaymentCancelled(context.Background(), tt.orderCode)

			// Verify error expectation
			if tt.expectError {
				if err == nil {
					t.Error("Expected error but got nil")
				}
				return
			}

			if err != nil {
				t.Errorf("Unexpected error: %v", err)
				return
			}

			// Verify transaction status update
			if tt.mockTransaction != nil {
				updatedTx := mockTransactionRepo.Transactions[tt.mockTransaction.ID]
				if updatedTx.Status != tt.expectedTxStatus {
					t.Errorf("Expected transaction status '%s', got '%s'", tt.expectedTxStatus, updatedTx.Status)
				}
			}
		})
	}
}

// Helper functions for pointer conversion
func int64Ptr(i int64) *int64 {
	return &i
}

func taskStatusPtr(s models.TaskStatus) *models.TaskStatus {
	return &s
}
