package handlers

import (
	"context"
	"testing"
	"time"

	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/testutil"
)

// TestWebhookHandler_handlePaymentSuccess tests the payment success handler
func TestWebhookHandler_handlePaymentSuccess(t *testing.T) {
	tests := []struct {
		name               string
		orderCode          int64
		mockTransaction    *models.Transaction
		mockTask           *models.Task
		expectedTxStatus   models.TransactionStatus
		expectedTaskStatus *models.TaskStatus
		expectError        bool
	}{
		{
			name:      "successful payment - escrow transaction with task",
			orderCode: 12345,
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
			name:      "successful payment - non-escrow transaction",
			orderCode: 12346,
			mockTransaction: &models.Transaction{
				ID:             2,
				Type:           models.TransactionTypeDeposit,
				Status:         models.TransactionStatusPending,
				PayOSOrderCode: int64Ptr(12346),
			},
			expectedTxStatus: models.TransactionStatusSuccess,
		},
		{
			name:      "successful payment - escrow without task",
			orderCode: 12347,
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

			if tt.mockTask != nil {
				mockTaskRepo.Tasks[tt.mockTask.ID] = tt.mockTask
			}

			// Create handler (PayOS service can be nil for this test)
			handler := &WebhookHandler{
				payos:           nil,
				transactionRepo: mockTransactionRepo,
				taskRepo:        mockTaskRepo,
			}

			// Execute handler method
			err := handler.handlePaymentSuccess(context.Background(), tt.orderCode)

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

			// Create handler (PayOS service can be nil for this test)
			handler := &WebhookHandler{
				payos:           nil,
				transactionRepo: mockTransactionRepo,
				taskRepo:        mockTaskRepo,
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
