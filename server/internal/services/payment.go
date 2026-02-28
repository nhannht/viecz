package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"gorm.io/gorm"
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
	searchService       SearchServicer
	db                  *gorm.DB
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
	db *gorm.DB,
	searchService SearchServicer,
) *PaymentService {
	if searchService == nil {
		searchService = &NoOpSearchService{}
	}
	return &PaymentService{
		transactionRepo:     transactionRepo,
		taskRepo:            taskRepo,
		applicationRepo:     applicationRepo,
		walletService:       walletService,
		platformFeeRate:     platformFeeRate,
		notificationService: notificationService,
		searchService:       searchService,
		db:                  db,
	}
}

// CreateEscrowPayment creates an escrow payment when application is accepted
func (s *PaymentService) CreateEscrowPayment(ctx context.Context, taskID, payerID int64) (*models.Transaction, string, error) {
	var result *models.Transaction

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Lock task row to prevent concurrent escrow creation
		task, err := s.taskRepo.GetByIDForUpdate(ctx, tx, taskID)
		if err != nil {
			return fmt.Errorf("task not found: %w", err)
		}

		// Validate task status
		if task.Status != models.TaskStatusOpen {
			return fmt.Errorf("task is not in open status")
		}

		// Validate payer is the requester
		if task.RequesterID != payerID {
			return fmt.Errorf("only requester can create escrow payment")
		}

		// Defense-in-depth: check for existing successful escrow (alongside task status check and DB constraint)
		existingTxs, err := s.transactionRepo.GetByTaskIDWithTx(ctx, tx, taskID)
		if err != nil {
			return fmt.Errorf("failed to check existing transactions: %w", err)
		}
		for _, t := range existingTxs {
			if t.Type == models.TransactionTypeEscrow && t.Status == models.TransactionStatusSuccess {
				return fmt.Errorf("escrow already exists for task %d", taskID)
			}
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

		// Hold funds in escrow from requester's wallet (using the outer tx)
		if err := s.walletService.HoldInEscrow(ctx, tx, payerID, effectivePrice, taskID, nil); err != nil {
			transaction.Status = models.TransactionStatusFailed
			transaction.FailureReason = stringPtr(err.Error())
			if createErr := s.transactionRepo.CreateWithTx(ctx, tx, transaction); createErr != nil {
				return fmt.Errorf("failed to create transaction: %w", createErr)
			}
			result = transaction
			return err
		}

		transaction.Status = models.TransactionStatusSuccess
		now := time.Now()
		transaction.CompletedAt = &now

		if err := s.transactionRepo.CreateWithTx(ctx, tx, transaction); err != nil {
			return fmt.Errorf("failed to create transaction: %w", err)
		}

		// Update task status to in_progress
		task.Status = models.TaskStatusInProgress
		if err := s.taskRepo.UpdateWithTx(ctx, tx, task); err != nil {
			return fmt.Errorf("failed to update task status: %w", err)
		}

		result = transaction
		return nil
	})

	if err != nil {
		if result != nil {
			return result, "", err
		}
		return nil, "", err
	}
	return result, "", nil
}

// ReleasePayment releases funds from escrow to tasker and marks task as completed.
// Idempotent: if task is already completed and payment already released, returns nil.
func (s *PaymentService) ReleasePayment(ctx context.Context, taskID, requesterID int64) error {
	var task *models.Task

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Lock task row
		var err error
		task, err = s.taskRepo.GetByIDForUpdate(ctx, tx, taskID)
		if err != nil {
			return fmt.Errorf("task not found: %w", err)
		}

		// Validate requester
		if task.RequesterID != requesterID {
			return fmt.Errorf("only requester can release payment")
		}

		// Validate task status — accept in_progress (normal) or completed (idempotent retry)
		if task.Status != models.TaskStatusInProgress && task.Status != models.TaskStatusCompleted {
			return fmt.Errorf("task cannot be completed from status: %s", task.Status)
		}

		// Validate tasker is assigned
		if task.TaskerID == nil {
			return fmt.Errorf("no tasker assigned to task")
		}

		// Find escrow and release transactions
		transactions, err := s.transactionRepo.GetByTaskIDWithTx(ctx, tx, taskID)
		if err != nil {
			return fmt.Errorf("failed to get transactions: %w", err)
		}

		var escrowTx *models.Transaction
		hasRelease := false
		for _, t := range transactions {
			if t.Type == models.TransactionTypeEscrow && t.Status == models.TransactionStatusSuccess {
				escrowTx = t
			}
			if t.Type == models.TransactionTypeRelease && t.Status == models.TransactionStatusSuccess {
				hasRelease = true
			}
		}

		// Idempotent: if already released, just ensure task is completed
		if hasRelease {
			if task.Status == models.TaskStatusInProgress {
				if err := s.taskRepo.UpdateStatusWithTx(ctx, tx, taskID, models.TaskStatusCompleted); err != nil {
					return fmt.Errorf("failed to complete task: %w", err)
				}
			}
			return nil
		}

		if escrowTx == nil {
			return fmt.Errorf("no successful escrow transaction found for task")
		}

		// Create release transaction
		releaseTx := &models.Transaction{
			TaskID:      &taskID,
			PayerID:     requesterID,
			PayeeID:     task.TaskerID,
			Amount:      escrowTx.NetAmount,
			PlatformFee: 0,
			NetAmount:   escrowTx.NetAmount,
			Type:        models.TransactionTypeRelease,
			Status:      models.TransactionStatusPending,
			Description: fmt.Sprintf("Payment release for task: %s", task.Title),
		}

		// Release from escrow in wallet (using the outer tx)
		if err := s.walletService.ReleaseFromEscrow(
			ctx,
			tx,
			requesterID,
			*task.TaskerID,
			escrowTx.NetAmount,
			taskID,
			&escrowTx.ID,
		); err != nil {
			releaseTx.Status = models.TransactionStatusFailed
			releaseTx.FailureReason = stringPtr(err.Error())
			if createErr := s.transactionRepo.CreateWithTx(ctx, tx, releaseTx); createErr != nil {
				return fmt.Errorf("failed to create release transaction: %w", createErr)
			}
			return err
		}

		releaseTx.Status = models.TransactionStatusSuccess
		now := time.Now()
		releaseTx.CompletedAt = &now

		if err := s.transactionRepo.CreateWithTx(ctx, tx, releaseTx); err != nil {
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

			if err := s.transactionRepo.CreateWithTx(ctx, tx, feeTx); err != nil {
				return fmt.Errorf("failed to create platform fee transaction: %w", err)
			}
		}

		// Update task status to completed inside the transaction
		if task.Status == models.TaskStatusInProgress {
			if err := s.taskRepo.UpdateStatusWithTx(ctx, tx, taskID, models.TaskStatusCompleted); err != nil {
				return fmt.Errorf("failed to complete task: %w", err)
			}
		}

		return nil
	})

	if err != nil {
		return err
	}

	// Post-commit: notifications and search cleanup (non-critical)
	if task != nil {
		// Notify tasker about payment received
		if s.notificationService != nil && task.TaskerID != nil {
			if err := s.notificationService.CreateNotification(ctx, *task.TaskerID,
				models.NotificationTypePaymentReceived, "Payment Received",
				fmt.Sprintf("You received payment for task '%s'", task.Title), &taskID,
				models.StringMap{"taskTitle": task.Title}); err != nil {
				log.Printf("[PaymentService] failed to send payment_received notification: %v", err)
			}
		}

		// Notify both parties about task completion
		if s.notificationService != nil {
			if err := s.notificationService.CreateNotification(ctx, task.RequesterID,
				models.NotificationTypeTaskCompleted, "Task Completed",
				fmt.Sprintf("Task '%s' has been completed", task.Title), &taskID,
				models.StringMap{"taskTitle": task.Title}); err != nil {
				log.Printf("[PaymentService] failed to send task_completed notification to requester: %v", err)
			}
			if task.TaskerID != nil {
				if err := s.notificationService.CreateNotification(ctx, *task.TaskerID,
					models.NotificationTypeTaskCompleted, "Task Completed",
					fmt.Sprintf("Task '%s' has been completed", task.Title), &taskID,
					models.StringMap{"taskTitle": task.Title}); err != nil {
					log.Printf("[PaymentService] failed to send task_completed notification to tasker: %v", err)
				}
			}
		}

		// Remove from search index (completed tasks shouldn't appear in search)
		if err := s.searchService.DeleteTask(ctx, taskID); err != nil {
			log.Printf("[PaymentService] failed to delete completed task %d from search index: %v", taskID, err)
		}
	}

	return nil
}

// RefundPayment refunds escrow payment to requester when task is cancelled
func (s *PaymentService) RefundPayment(ctx context.Context, taskID, requesterID int64, reason string) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Lock task row
		task, err := s.taskRepo.GetByIDForUpdate(ctx, tx, taskID)
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
		transactions, err := s.transactionRepo.GetByTaskIDWithTx(ctx, tx, taskID)
		if err != nil {
			return fmt.Errorf("failed to get transactions: %w", err)
		}

		var escrowTx *models.Transaction
		for _, t := range transactions {
			if t.Type == models.TransactionTypeEscrow && t.Status == models.TransactionStatusSuccess {
				escrowTx = t
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
			Amount:      escrowTx.Amount,
			PlatformFee: 0,
			NetAmount:   escrowTx.Amount,
			Type:        models.TransactionTypeRefund,
			Status:      models.TransactionStatusPending,
			Description: fmt.Sprintf("Refund for task: %s. Reason: %s", task.Title, reason),
		}

		// Refund from escrow in wallet (using the outer tx)
		if err := s.walletService.RefundFromEscrow(
			ctx,
			tx,
			requesterID,
			escrowTx.Amount,
			taskID,
			&escrowTx.ID,
		); err != nil {
			refundTx.Status = models.TransactionStatusFailed
			refundTx.FailureReason = stringPtr(err.Error())
			if createErr := s.transactionRepo.CreateWithTx(ctx, tx, refundTx); createErr != nil {
				return fmt.Errorf("failed to create refund transaction: %w", createErr)
			}
			return err
		}

		refundTx.Status = models.TransactionStatusSuccess
		now := time.Now()
		refundTx.CompletedAt = &now

		if err := s.transactionRepo.CreateWithTx(ctx, tx, refundTx); err != nil {
			return fmt.Errorf("failed to create refund transaction: %w", err)
		}

		// Update task status to cancelled
		task.Status = models.TaskStatusCancelled

		if err := s.taskRepo.UpdateWithTx(ctx, tx, task); err != nil {
			return fmt.Errorf("failed to update task status: %w", err)
		}

		return nil
	})
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
