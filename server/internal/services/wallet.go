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
	walletRepo           repository.WalletRepository
	walletTransactionRepo repository.WalletTransactionRepository
	db                   *gorm.DB
}

// NewWalletService creates a new wallet service
func NewWalletService(
	walletRepo repository.WalletRepository,
	walletTransactionRepo repository.WalletTransactionRepository,
	db *gorm.DB,
) *WalletService {
	return &WalletService{
		walletRepo:           walletRepo,
		walletTransactionRepo: walletTransactionRepo,
		db:                   db,
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

// Deposit adds funds to a wallet (for testing/dev mode)
func (s *WalletService) Deposit(ctx context.Context, userID, amount int64, description string) error {
	if amount <= 0 {
		return fmt.Errorf("deposit amount must be positive")
	}

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Get or create wallet
		wallet, err := s.walletRepo.GetOrCreate(ctx, userID)
		if err != nil {
			return fmt.Errorf("failed to get wallet: %w", err)
		}

		// Record balances before
		balanceBefore := wallet.Balance
		escrowBefore := wallet.EscrowBalance

		// Update wallet
		wallet.Credit(amount)
		wallet.TotalDeposited += amount

		if err := s.walletRepo.Update(ctx, wallet); err != nil {
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

		if err := s.walletTransactionRepo.Create(ctx, walletTx); err != nil {
			return fmt.Errorf("failed to create wallet transaction: %w", err)
		}

		return nil
	})
}

// HoldInEscrow moves funds from balance to escrow for a task
func (s *WalletService) HoldInEscrow(ctx context.Context, userID, amount, taskID int64, transactionID *int64) error {
	if amount <= 0 {
		return fmt.Errorf("escrow amount must be positive")
	}

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Get wallet
		wallet, err := s.walletRepo.GetByUserID(ctx, userID)
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

		if err := s.walletRepo.Update(ctx, wallet); err != nil {
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

		if err := s.walletTransactionRepo.Create(ctx, walletTx); err != nil {
			return fmt.Errorf("failed to create wallet transaction: %w", err)
		}

		return nil
	})
}

// ReleaseFromEscrow releases funds from escrow to payee when task is completed
func (s *WalletService) ReleaseFromEscrow(ctx context.Context, payerID, payeeID, amount, taskID int64, transactionID *int64) error {
	if amount <= 0 {
		return fmt.Errorf("release amount must be positive")
	}

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Get payer wallet and release from escrow
		payerWallet, err := s.walletRepo.GetByUserID(ctx, payerID)
		if err != nil {
			return fmt.Errorf("payer wallet not found: %w", err)
		}

		payerBalanceBefore := payerWallet.Balance
		payerEscrowBefore := payerWallet.EscrowBalance

		if err := payerWallet.ReleaseFromEscrow(amount); err != nil {
			return err
		}

		if err := s.walletRepo.Update(ctx, payerWallet); err != nil {
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

		if err := s.walletTransactionRepo.Create(ctx, payerTx); err != nil {
			return fmt.Errorf("failed to create payer wallet transaction: %w", err)
		}

		// Get or create payee wallet and credit
		payeeWallet, err := s.walletRepo.GetOrCreate(ctx, payeeID)
		if err != nil {
			return fmt.Errorf("failed to get payee wallet: %w", err)
		}

		payeeBalanceBefore := payeeWallet.Balance
		payeeEscrowBefore := payeeWallet.EscrowBalance

		payeeWallet.Credit(amount)
		payeeWallet.TotalEarned += amount

		if err := s.walletRepo.Update(ctx, payeeWallet); err != nil {
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

		if err := s.walletTransactionRepo.Create(ctx, payeeTx); err != nil {
			return fmt.Errorf("failed to create payee wallet transaction: %w", err)
		}

		return nil
	})
}

// RefundFromEscrow refunds funds from escrow back to payer when task is cancelled
func (s *WalletService) RefundFromEscrow(ctx context.Context, userID, amount, taskID int64, transactionID *int64) error {
	if amount <= 0 {
		return fmt.Errorf("refund amount must be positive")
	}

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Get wallet
		wallet, err := s.walletRepo.GetByUserID(ctx, userID)
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

		if err := s.walletRepo.Update(ctx, wallet); err != nil {
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

		if err := s.walletTransactionRepo.Create(ctx, walletTx); err != nil {
			return fmt.Errorf("failed to create wallet transaction: %w", err)
		}

		return nil
	})
}

// GetTransactionHistory retrieves wallet transaction history
func (s *WalletService) GetTransactionHistory(ctx context.Context, userID int64, limit, offset int) ([]*models.WalletTransaction, error) {
	wallet, err := s.walletRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("wallet not found: %w", err)
	}

	transactions, err := s.walletTransactionRepo.GetByWalletID(ctx, wallet.ID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get transaction history: %w", err)
	}

	return transactions, nil
}
