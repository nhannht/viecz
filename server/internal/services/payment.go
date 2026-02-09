package services

import (
	"context"
	"fmt"
	"os"
	"time"

	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
)

// PaymentService handles payment orchestration with escrow logic
type PaymentService struct {
	transactionRepo repository.TransactionRepository
	taskRepo        repository.TaskRepository
	walletService   *WalletService
	payosService    *PayOSService
	mockMode        bool
	platformFeeRate float64 // Platform fee as percentage (e.g., 0.10 for 10%)
	serverURL       string
}

// NewPaymentService creates a new payment service
func NewPaymentService(
	transactionRepo repository.TransactionRepository,
	taskRepo repository.TaskRepository,
	walletService *WalletService,
	payosService *PayOSService,
	serverURL string,
) *PaymentService {
	// Check if mock mode is enabled via environment variable
	mockMode := os.Getenv("PAYMENT_MOCK_MODE") == "true"

	// Platform fee rate (default 10%)
	platformFeeRate := 0.10

	return &PaymentService{
		transactionRepo: transactionRepo,
		taskRepo:        taskRepo,
		walletService:   walletService,
		payosService:    payosService,
		mockMode:        mockMode,
		platformFeeRate: platformFeeRate,
		serverURL:       serverURL,
	}
}

// CreateEscrowPayment creates an escrow payment when application is accepted
func (s *PaymentService) CreateEscrowPayment(ctx context.Context, taskID, payerID int64) (*models.Transaction, string, error) {
	// Get task details
	task, err := s.taskRepo.GetByID(ctx, taskID)
	if err != nil {
		return nil, "", fmt.Errorf("task not found: %w", err)
	}

	// Validate task status
	if task.Status != models.TaskStatusOpen {
		return nil, "", fmt.Errorf("task is not in open status")
	}

	// Validate payer is the requester
	if task.RequesterID != payerID {
		return nil, "", fmt.Errorf("only requester can create escrow payment")
	}

	// Calculate platform fee
	platformFee := int64(float64(task.Price) * s.platformFeeRate)
	netAmount := task.Price - platformFee

	// Create transaction record
	transaction := &models.Transaction{
		TaskID:      &taskID,
		PayerID:     payerID,
		PayeeID:     task.TaskerID,
		Amount:      task.Price,
		PlatformFee: platformFee,
		NetAmount:   netAmount,
		Type:        models.TransactionTypeEscrow,
		Status:      models.TransactionStatusPending,
		Description: fmt.Sprintf("Escrow payment for task: %s", task.Title),
	}

	if s.mockMode {
		// Mock mode: Use wallet service
		if err := s.walletService.HoldInEscrow(ctx, payerID, task.Price, taskID, nil); err != nil {
			transaction.Status = models.TransactionStatusFailed
			transaction.FailureReason = stringPtr(err.Error())
			if createErr := s.transactionRepo.Create(ctx, transaction); createErr != nil {
				return nil, "", fmt.Errorf("failed to create transaction: %w", createErr)
			}
			return transaction, "", err
		}

		transaction.Status = models.TransactionStatusSuccess
		now := time.Now()
		transaction.CompletedAt = &now

		if err := s.transactionRepo.Create(ctx, transaction); err != nil {
			return nil, "", fmt.Errorf("failed to create transaction: %w", err)
		}

		// Update task status to in_progress
		task.Status = models.TaskStatusInProgress
		if err := s.taskRepo.Update(ctx, task); err != nil {
			return nil, "", fmt.Errorf("failed to update task status: %w", err)
		}

		return transaction, "", nil
	}

	// Real mode: Use PayOS
	orderCode := time.Now().Unix()
	transaction.PayOSOrderCode = &orderCode

	returnURL := fmt.Sprintf("%s/api/v1/payment/return", s.serverURL)
	cancelURL := fmt.Sprintf("%s/api/v1/payment/return", s.serverURL)

	// Create payment link with PayOS
	result, err := s.payosService.CreatePaymentLink(
		ctx,
		orderCode,
		int(task.Price),
		transaction.Description,
		returnURL,
		cancelURL,
	)
	if err != nil {
		transaction.Status = models.TransactionStatusFailed
		transaction.FailureReason = stringPtr(err.Error())
		if createErr := s.transactionRepo.Create(ctx, transaction); createErr != nil {
			return nil, "", fmt.Errorf("failed to create transaction: %w", createErr)
		}
		return transaction, "", fmt.Errorf("failed to create payment link: %w", err)
	}

	transaction.PayOSPaymentID = &result.PaymentLinkId

	if err := s.transactionRepo.Create(ctx, transaction); err != nil {
		return nil, "", fmt.Errorf("failed to create transaction: %w", err)
	}

	return transaction, result.CheckoutUrl, nil
}

// ReleasePayment releases funds from escrow to tasker when task is completed
func (s *PaymentService) ReleasePayment(ctx context.Context, taskID, requesterID int64) error {
	// Get task details
	task, err := s.taskRepo.GetByID(ctx, taskID)
	if err != nil {
		return fmt.Errorf("task not found: %w", err)
	}

	// Validate requester
	if task.RequesterID != requesterID {
		return fmt.Errorf("only requester can release payment")
	}

	// Validate task status
	if task.Status != models.TaskStatusInProgress {
		return fmt.Errorf("task is not in progress")
	}

	// Validate tasker is assigned
	if task.TaskerID == nil {
		return fmt.Errorf("no tasker assigned to task")
	}

	// Find escrow transaction
	transactions, err := s.transactionRepo.GetByTaskID(ctx, taskID)
	if err != nil {
		return fmt.Errorf("failed to get transactions: %w", err)
	}

	var escrowTx *models.Transaction
	for _, tx := range transactions {
		if tx.Type == models.TransactionTypeEscrow && tx.Status == models.TransactionStatusSuccess {
			escrowTx = tx
			break
		}
	}

	if escrowTx == nil {
		return fmt.Errorf("no successful escrow transaction found for task")
	}

	// Create release transaction
	releaseTx := &models.Transaction{
		TaskID:      &taskID,
		PayerID:     requesterID,
		PayeeID:     task.TaskerID,
		Amount:      escrowTx.NetAmount, // Release net amount (after platform fee)
		PlatformFee: 0,
		NetAmount:   escrowTx.NetAmount,
		Type:        models.TransactionTypeRelease,
		Status:      models.TransactionStatusPending,
		Description: fmt.Sprintf("Payment release for task: %s", task.Title),
	}

	if s.mockMode {
		// Mock mode: Release from escrow in wallet
		if err := s.walletService.ReleaseFromEscrow(
			ctx,
			requesterID,
			*task.TaskerID,
			escrowTx.NetAmount,
			taskID,
			&escrowTx.ID,
		); err != nil {
			releaseTx.Status = models.TransactionStatusFailed
			releaseTx.FailureReason = stringPtr(err.Error())
			if createErr := s.transactionRepo.Create(ctx, releaseTx); createErr != nil {
				return fmt.Errorf("failed to create release transaction: %w", createErr)
			}
			return err
		}

		releaseTx.Status = models.TransactionStatusSuccess
		now := time.Now()
		releaseTx.CompletedAt = &now

		if err := s.transactionRepo.Create(ctx, releaseTx); err != nil {
			return fmt.Errorf("failed to create release transaction: %w", err)
		}

		// Create platform fee transaction
		feeTx := &models.Transaction{
			TaskID:      &taskID,
			PayerID:     requesterID,
			PayeeID:     nil, // Platform
			Amount:      escrowTx.PlatformFee,
			PlatformFee: 0,
			NetAmount:   escrowTx.PlatformFee,
			Type:        models.TransactionTypePlatformFee,
			Status:      models.TransactionStatusSuccess,
			Description: fmt.Sprintf("Platform fee for task: %s", task.Title),
			CompletedAt: &now,
		}

		if err := s.transactionRepo.Create(ctx, feeTx); err != nil {
			return fmt.Errorf("failed to create platform fee transaction: %w", err)
		}
	} else {
		// Real mode: Platform fee is already deducted in escrow
		// In production, this would trigger actual fund transfer
		releaseTx.Status = models.TransactionStatusSuccess
		now := time.Now()
		releaseTx.CompletedAt = &now

		if err := s.transactionRepo.Create(ctx, releaseTx); err != nil {
			return fmt.Errorf("failed to create release transaction: %w", err)
		}
	}

	// Update task status to completed
	task.Status = models.TaskStatusCompleted
	now := time.Now()
	task.CompletedAt = &now

	if err := s.taskRepo.Update(ctx, task); err != nil {
		return fmt.Errorf("failed to update task status: %w", err)
	}

	return nil
}

// RefundPayment refunds escrow payment to requester when task is cancelled
func (s *PaymentService) RefundPayment(ctx context.Context, taskID, requesterID int64, reason string) error {
	// Get task details
	task, err := s.taskRepo.GetByID(ctx, taskID)
	if err != nil {
		return fmt.Errorf("task not found: %w", err)
	}

	// Validate requester
	if task.RequesterID != requesterID {
		return fmt.Errorf("only requester can refund payment")
	}

	// Validate task status
	if task.Status != models.TaskStatusInProgress {
		return fmt.Errorf("task is not in progress")
	}

	// Find escrow transaction
	transactions, err := s.transactionRepo.GetByTaskID(ctx, taskID)
	if err != nil {
		return fmt.Errorf("failed to get transactions: %w", err)
	}

	var escrowTx *models.Transaction
	for _, tx := range transactions {
		if tx.Type == models.TransactionTypeEscrow && tx.Status == models.TransactionStatusSuccess {
			escrowTx = tx
			break
		}
	}

	if escrowTx == nil {
		return fmt.Errorf("no successful escrow transaction found for task")
	}

	// Create refund transaction
	refundTx := &models.Transaction{
		TaskID:      &taskID,
		PayerID:     requesterID,
		PayeeID:     nil,
		Amount:      escrowTx.Amount, // Refund full amount (including platform fee)
		PlatformFee: 0,
		NetAmount:   escrowTx.Amount,
		Type:        models.TransactionTypeRefund,
		Status:      models.TransactionStatusPending,
		Description: fmt.Sprintf("Refund for task: %s. Reason: %s", task.Title, reason),
	}

	if s.mockMode {
		// Mock mode: Refund from escrow in wallet
		if err := s.walletService.RefundFromEscrow(
			ctx,
			requesterID,
			escrowTx.Amount,
			taskID,
			&escrowTx.ID,
		); err != nil {
			refundTx.Status = models.TransactionStatusFailed
			refundTx.FailureReason = stringPtr(err.Error())
			if createErr := s.transactionRepo.Create(ctx, refundTx); createErr != nil {
				return fmt.Errorf("failed to create refund transaction: %w", createErr)
			}
			return err
		}

		refundTx.Status = models.TransactionStatusSuccess
		now := time.Now()
		refundTx.CompletedAt = &now

		if err := s.transactionRepo.Create(ctx, refundTx); err != nil {
			return fmt.Errorf("failed to create refund transaction: %w", err)
		}
	} else {
		// Real mode: Cancel PayOS payment link
		if escrowTx.PayOSOrderCode != nil {
			if _, err := s.payosService.CancelPaymentLink(ctx, *escrowTx.PayOSOrderCode, reason); err != nil {
				return fmt.Errorf("failed to cancel PayOS payment: %w", err)
			}
		}

		refundTx.Status = models.TransactionStatusSuccess
		now := time.Now()
		refundTx.CompletedAt = &now

		if err := s.transactionRepo.Create(ctx, refundTx); err != nil {
			return fmt.Errorf("failed to create refund transaction: %w", err)
		}
	}

	// Update task status to cancelled
	task.Status = models.TaskStatusCancelled

	if err := s.taskRepo.Update(ctx, task); err != nil {
		return fmt.Errorf("failed to update task status: %w", err)
	}

	return nil
}

// GetTransactionsByTask retrieves all transactions for a task
func (s *PaymentService) GetTransactionsByTask(ctx context.Context, taskID int64) ([]*models.Transaction, error) {
	transactions, err := s.transactionRepo.GetByTaskID(ctx, taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to get transactions: %w", err)
	}
	return transactions, nil
}

// Helper function to create string pointer
func stringPtr(s string) *string {
	return &s
}
