package services

import (
	"context"
	"fmt"

	"gorm.io/gorm"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
)

// WalletService handles wallet operations for mock payment mode
type WalletService struct {
	walletRepo            repository.WalletRepository
	walletTransactionRepo repository.WalletTransactionRepository
	db                    *gorm.DB
	maxWalletBalance      int64
}

// NewWalletService creates a new wallet service
func NewWalletService(
	walletRepo repository.WalletRepository,
	walletTransactionRepo repository.WalletTransactionRepository,
	db *gorm.DB,
	maxWalletBalance int64,
) *WalletService {
	return &WalletService{
		walletRepo:            walletRepo,
		walletTransactionRepo: walletTransactionRepo,
		db:                    db,
		maxWalletBalance:      maxWalletBalance,
	}
}

// GetOrCreateWallet gets or creates a wallet for a user
func (s *WalletService) GetOrCreateWallet(ctx context.Context, userID int64) (*models.Wallet, error) {
	wallet, err := s.walletRepo.GetOrCreate(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get or create wallet: %w", err)
	}
	return wallet, nil
}

// GetWalletByUserID retrieves a wallet by user ID
func (s *WalletService) GetWalletByUserID(ctx context.Context, userID int64) (*models.Wallet, error) {
	wallet, err := s.walletRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get wallet: %w", err)
	}
	return wallet, nil
}

// ValidateDeposit checks if a deposit would exceed the max wallet balance (without modifying anything)
func (s *WalletService) ValidateDeposit(ctx context.Context, userID, amount int64) error {
	if amount <= 0 {
		return fmt.Errorf("deposit amount must be positive")
	}

	wallet, err := s.walletRepo.GetOrCreate(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get wallet: %w", err)
	}

	if s.maxWalletBalance > 0 && wallet.Balance+amount > s.maxWalletBalance {
		return fmt.Errorf("deposit would exceed maximum wallet balance of %d VND (current: %d, deposit: %d)", s.maxWalletBalance, wallet.Balance, amount)
	}

	return nil
}

// Deposit adds funds to a wallet.
// If outerTx is non-nil, uses it directly (caller manages the transaction).
// If outerTx is nil, creates its own transaction.
func (s *WalletService) Deposit(ctx context.Context, outerTx *gorm.DB, userID, amount int64, description string) error {
	if amount <= 0 {
		return fmt.Errorf("deposit amount must be positive")
	}

	do := func(tx *gorm.DB) error {
		// Get or create wallet with row lock
		wallet, err := s.walletRepo.GetOrCreateForUpdate(ctx, tx, userID)
		if err != nil {
			return fmt.Errorf("failed to get wallet: %w", err)
		}

		// Check max wallet balance limit
		if s.maxWalletBalance > 0 && wallet.Balance+amount > s.maxWalletBalance {
			return fmt.Errorf("deposit would exceed maximum wallet balance of %d VND (current: %d, deposit: %d)", s.maxWalletBalance, wallet.Balance, amount)
		}

		// Record balances before
		balanceBefore := wallet.Balance
		escrowBefore := wallet.EscrowBalance

		// Update wallet
		wallet.Credit(amount)
		wallet.TotalDeposited += amount

		if err := s.walletRepo.UpdateWithTx(ctx, tx, wallet); err != nil {
			return fmt.Errorf("failed to update wallet: %w", err)
		}

		// Create transaction record
		walletTx := &models.WalletTransaction{
			WalletID:      wallet.ID,
			Type:          models.WalletTransactionTypeDeposit,
			Amount:        amount,
			BalanceBefore: balanceBefore,
			BalanceAfter:  wallet.Balance,
			EscrowBefore:  escrowBefore,
			EscrowAfter:   wallet.EscrowBalance,
			Description:   description,
		}

		if err := s.walletTransactionRepo.CreateWithTx(ctx, tx, walletTx); err != nil {
			return fmt.Errorf("failed to create wallet transaction: %w", err)
		}

		return nil
	}

	if outerTx != nil {
		return do(outerTx)
	}
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return do(tx)
	})
}

// HoldInEscrow moves funds from balance to escrow for a task.
// If outerTx is non-nil, uses it directly (caller manages the transaction).
// If outerTx is nil, creates its own transaction.
func (s *WalletService) HoldInEscrow(ctx context.Context, outerTx *gorm.DB, userID, amount, taskID int64, transactionID *int64) error {
	if amount <= 0 {
		return fmt.Errorf("escrow amount must be positive")
	}

	do := func(tx *gorm.DB) error {
		// Get wallet with row lock
		wallet, err := s.walletRepo.GetByUserIDForUpdate(ctx, tx, userID)
		if err != nil {
			return fmt.Errorf("wallet not found: %w", err)
		}

		// Record balances before
		balanceBefore := wallet.Balance
		escrowBefore := wallet.EscrowBalance

		// Hold in escrow
		if err := wallet.HoldInEscrow(amount); err != nil {
			return err
		}

		if err := s.walletRepo.UpdateWithTx(ctx, tx, wallet); err != nil {
			return fmt.Errorf("failed to update wallet: %w", err)
		}

		// Create transaction record
		walletTx := &models.WalletTransaction{
			WalletID:      wallet.ID,
			TransactionID: transactionID,
			TaskID:        &taskID,
			Type:          models.WalletTransactionTypeEscrowHold,
			Amount:        -amount, // Negative because it's deducted from balance
			BalanceBefore: balanceBefore,
			BalanceAfter:  wallet.Balance,
			EscrowBefore:  escrowBefore,
			EscrowAfter:   wallet.EscrowBalance,
			Description:   fmt.Sprintf("Escrow hold for task #%d", taskID),
		}

		if err := s.walletTransactionRepo.CreateWithTx(ctx, tx, walletTx); err != nil {
			return fmt.Errorf("failed to create wallet transaction: %w", err)
		}

		return nil
	}

	if outerTx != nil {
		return do(outerTx)
	}
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return do(tx)
	})
}

// ReleaseFromEscrow releases funds from escrow to payee when task is completed.
// If outerTx is non-nil, uses it directly (caller manages the transaction).
// If outerTx is nil, creates its own transaction.
func (s *WalletService) ReleaseFromEscrow(ctx context.Context, outerTx *gorm.DB, payerID, payeeID, amount, taskID int64, transactionID *int64) error {
	if amount <= 0 {
		return fmt.Errorf("release amount must be positive")
	}

	do := func(tx *gorm.DB) error {
		// Get payer wallet with row lock and release from escrow
		payerWallet, err := s.walletRepo.GetByUserIDForUpdate(ctx, tx, payerID)
		if err != nil {
			return fmt.Errorf("payer wallet not found: %w", err)
		}

		payerBalanceBefore := payerWallet.Balance
		payerEscrowBefore := payerWallet.EscrowBalance

		if err := payerWallet.ReleaseFromEscrow(amount); err != nil {
			return err
		}

		if err := s.walletRepo.UpdateWithTx(ctx, tx, payerWallet); err != nil {
			return fmt.Errorf("failed to update payer wallet: %w", err)
		}

		// Record payer transaction
		payerTx := &models.WalletTransaction{
			WalletID:        payerWallet.ID,
			TransactionID:   transactionID,
			TaskID:          &taskID,
			Type:            models.WalletTransactionTypeEscrowRelease,
			Amount:          -amount, // Negative because it's removed from escrow
			BalanceBefore:   payerBalanceBefore,
			BalanceAfter:    payerWallet.Balance,
			EscrowBefore:    payerEscrowBefore,
			EscrowAfter:     payerWallet.EscrowBalance,
			Description:     fmt.Sprintf("Escrow released for task #%d", taskID),
			ReferenceUserID: &payeeID,
		}

		if err := s.walletTransactionRepo.CreateWithTx(ctx, tx, payerTx); err != nil {
			return fmt.Errorf("failed to create payer wallet transaction: %w", err)
		}

		// Get or create payee wallet with row lock and credit
		payeeWallet, err := s.walletRepo.GetOrCreateForUpdate(ctx, tx, payeeID)
		if err != nil {
			return fmt.Errorf("failed to get payee wallet: %w", err)
		}

		payeeBalanceBefore := payeeWallet.Balance
		payeeEscrowBefore := payeeWallet.EscrowBalance

		payeeWallet.Credit(amount)
		payeeWallet.TotalEarned += amount

		if err := s.walletRepo.UpdateWithTx(ctx, tx, payeeWallet); err != nil {
			return fmt.Errorf("failed to update payee wallet: %w", err)
		}

		// Record payee transaction
		payeeTx := &models.WalletTransaction{
			WalletID:        payeeWallet.ID,
			TransactionID:   transactionID,
			TaskID:          &taskID,
			Type:            models.WalletTransactionTypePaymentReceived,
			Amount:          amount,
			BalanceBefore:   payeeBalanceBefore,
			BalanceAfter:    payeeWallet.Balance,
			EscrowBefore:    payeeEscrowBefore,
			EscrowAfter:     payeeWallet.EscrowBalance,
			Description:     fmt.Sprintf("Payment received for task #%d", taskID),
			ReferenceUserID: &payerID,
		}

		if err := s.walletTransactionRepo.CreateWithTx(ctx, tx, payeeTx); err != nil {
			return fmt.Errorf("failed to create payee wallet transaction: %w", err)
		}

		return nil
	}

	if outerTx != nil {
		return do(outerTx)
	}
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return do(tx)
	})
}

// RefundFromEscrow refunds funds from escrow back to payer when task is cancelled.
// If outerTx is non-nil, uses it directly (caller manages the transaction).
// If outerTx is nil, creates its own transaction.
func (s *WalletService) RefundFromEscrow(ctx context.Context, outerTx *gorm.DB, userID, amount, taskID int64, transactionID *int64) error {
	if amount <= 0 {
		return fmt.Errorf("refund amount must be positive")
	}

	do := func(tx *gorm.DB) error {
		// Get wallet with row lock
		wallet, err := s.walletRepo.GetByUserIDForUpdate(ctx, tx, userID)
		if err != nil {
			return fmt.Errorf("wallet not found: %w", err)
		}

		// Record balances before
		balanceBefore := wallet.Balance
		escrowBefore := wallet.EscrowBalance

		// Refund from escrow
		if err := wallet.RefundFromEscrow(amount); err != nil {
			return err
		}

		if err := s.walletRepo.UpdateWithTx(ctx, tx, wallet); err != nil {
			return fmt.Errorf("failed to update wallet: %w", err)
		}

		// Create transaction record
		walletTx := &models.WalletTransaction{
			WalletID:      wallet.ID,
			TransactionID: transactionID,
			TaskID:        &taskID,
			Type:          models.WalletTransactionTypeEscrowRefund,
			Amount:        amount, // Positive because it's returned to balance
			BalanceBefore: balanceBefore,
			BalanceAfter:  wallet.Balance,
			EscrowBefore:  escrowBefore,
			EscrowAfter:   wallet.EscrowBalance,
			Description:   fmt.Sprintf("Escrow refund for task #%d", taskID),
		}

		if err := s.walletTransactionRepo.CreateWithTx(ctx, tx, walletTx); err != nil {
			return fmt.Errorf("failed to create wallet transaction: %w", err)
		}

		return nil
	}

	if outerTx != nil {
		return do(outerTx)
	}
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return do(tx)
	})
}

// GetTransactionHistory retrieves wallet transaction history
func (s *WalletService) GetTransactionHistory(ctx context.Context, userID int64, limit, offset int) ([]*models.WalletTransaction, error) {
	wallet, err := s.walletRepo.GetByUserID(ctx, userID)
	if err != nil {
		// Wallet not created yet — return empty list instead of error
		return []*models.WalletTransaction{}, nil
	}

	transactions, err := s.walletTransactionRepo.GetByWalletID(ctx, wallet.ID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get transaction history: %w", err)
	}

	return transactions, nil
}

// GetAvailableBalance computes the balance available for new task creation.
// Available = Balance - EscrowBalance - sum(prices of open tasks by this user).
func (s *WalletService) GetAvailableBalance(ctx context.Context, userID int64, taskRepo repository.TaskRepository) (int64, error) {
	wallet, err := s.walletRepo.GetOrCreate(ctx, userID)
	if err != nil {
		return 0, err
	}
	openTaskTotal, err := taskRepo.SumOpenTaskPricesByRequester(ctx, userID)
	if err != nil {
		return 0, err
	}
	available := wallet.Balance - wallet.EscrowBalance - openTaskTotal
	if available < 0 {
		available = 0
	}
	return available, nil
}
