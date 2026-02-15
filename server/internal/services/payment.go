package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
)

// PaymentService handles payment orchestration with escrow logic.
// All escrow/release/refund operations use the wallet — PayOS is only for deposits.
type PaymentService struct {
	transactionRepo     repository.TransactionRepository
	taskRepo            repository.TaskRepository
	applicationRepo     repository.TaskApplicationRepository
	walletService       *WalletService
	platformFeeRate     float64 // Platform fee as percentage (e.g., 0.10 for 10%)
	notificationService *NotificationService
}

// NewPaymentService creates a new payment service.
// platformFeeRate is the fee as a fraction (e.g. 0.10 for 10%, 0 for beta).
func NewPaymentService(
	transactionRepo repository.TransactionRepository,
	taskRepo repository.TaskRepository,
	applicationRepo repository.TaskApplicationRepository,
	walletService *WalletService,
	platformFeeRate float64,
	notificationService *NotificationService,
) *PaymentService {
	return &PaymentService{
		transactionRepo:     transactionRepo,
		taskRepo:            taskRepo,
		applicationRepo:     applicationRepo,
		walletService:       walletService,
		platformFeeRate:     platformFeeRate,
		notificationService: notificationService,
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

	// Determine effective price: use accepted application's proposed price if available
	effectivePrice := task.Price
	if s.applicationRepo != nil {
		apps, err := s.applicationRepo.GetByTaskID(ctx, taskID)
		if err == nil {
			for _, app := range apps {
				if app.Status == models.ApplicationStatusAccepted && app.ProposedPrice != nil {
					effectivePrice = *app.ProposedPrice
					break
				}
			}
		}
	}

	// Calculate platform fee
	platformFee := int64(float64(effectivePrice) * s.platformFeeRate)
	netAmount := effectivePrice - platformFee

	// Create transaction record
	transaction := &models.Transaction{
		TaskID:      &taskID,
		PayerID:     payerID,
		PayeeID:     task.TaskerID,
		Amount:      effectivePrice,
		PlatformFee: platformFee,
		NetAmount:   netAmount,
		Type:        models.TransactionTypeEscrow,
		Status:      models.TransactionStatusPending,
		Description: truncatePayOSDescription(fmt.Sprintf("Escrow: %s", task.Title)),
	}

	// Hold funds in escrow from requester's wallet
	if err := s.walletService.HoldInEscrow(ctx, payerID, effectivePrice, taskID, nil); err != nil {
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

	// Release from escrow in wallet
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

	// Create platform fee transaction (only if fee > 0)
	if escrowTx.PlatformFee > 0 {
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
	}

	// Notify tasker about payment received (non-critical — log and continue on failure)
	if s.notificationService != nil && task.TaskerID != nil {
		if err := s.notificationService.CreateNotification(ctx, *task.TaskerID,
			models.NotificationTypePaymentReceived, "Payment Received",
			fmt.Sprintf("You received payment for task '%s'", task.Title), &taskID); err != nil {
			log.Printf("[PaymentService] failed to send payment_received notification: %v", err)
		}
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

	// Refund from escrow in wallet
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

// truncatePayOSDescription ensures description fits PayOS's 25-character limit
func truncatePayOSDescription(s string) string {
	if len([]rune(s)) <= 25 {
		return s
	}
	return string([]rune(s)[:25])
}
