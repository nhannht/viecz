package repository

import (
	"context"
	"fmt"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"viecz.vieczserver/internal/models"
)

type walletGormRepository struct {
	db *gorm.DB
}

// NewWalletGormRepository creates a new GORM-based WalletRepository
func NewWalletGormRepository(db *gorm.DB) WalletRepository {
	return &walletGormRepository{db: db}
}

// Verify interface compliance
var _ WalletRepository = (*walletGormRepository)(nil)

func (r *walletGormRepository) Create(ctx context.Context, wallet *models.Wallet) error {
	if err := r.db.WithContext(ctx).Create(wallet).Error; err != nil {
		return fmt.Errorf("failed to create wallet: %w", err)
	}
	return nil
}

func (r *walletGormRepository) GetByID(ctx context.Context, id int64) (*models.Wallet, error) {
	var wallet models.Wallet
	if err := r.db.WithContext(ctx).First(&wallet, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("wallet not found")
		}
		return nil, fmt.Errorf("failed to get wallet: %w", err)
	}
	return &wallet, nil
}

func (r *walletGormRepository) GetByUserID(ctx context.Context, userID int64) (*models.Wallet, error) {
	var wallet models.Wallet
	if err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&wallet).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("wallet not found for user")
		}
		return nil, fmt.Errorf("failed to get wallet: %w", err)
	}
	return &wallet, nil
}

func (r *walletGormRepository) Update(ctx context.Context, wallet *models.Wallet) error {
	if err := r.db.WithContext(ctx).Save(wallet).Error; err != nil {
		return fmt.Errorf("failed to update wallet: %w", err)
	}
	return nil
}

func (r *walletGormRepository) GetOrCreate(ctx context.Context, userID int64) (*models.Wallet, error) {
	wallet, err := r.GetByUserID(ctx, userID)
	if err == nil {
		return wallet, nil
	}

	// Wallet doesn't exist, create it
	newWallet := &models.Wallet{
		UserID:         userID,
		Balance:        0,
		EscrowBalance:  0,
		TotalDeposited: 0,
		TotalWithdrawn: 0,
		TotalEarned:    0,
		TotalSpent:     0,
	}

	if err := r.Create(ctx, newWallet); err != nil {
		return nil, fmt.Errorf("failed to create wallet: %w", err)
	}

	return newWallet, nil
}

func (r *walletGormRepository) GetByUserIDForUpdate(ctx context.Context, tx *gorm.DB, userID int64) (*models.Wallet, error) {
	db := tx
	if db == nil {
		db = r.db
	}
	var wallet models.Wallet
	if err := db.WithContext(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("user_id = ?", userID).First(&wallet).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("wallet not found for user")
		}
		return nil, fmt.Errorf("failed to get wallet for update: %w", err)
	}
	return &wallet, nil
}

func (r *walletGormRepository) GetOrCreateForUpdate(ctx context.Context, tx *gorm.DB, userID int64) (*models.Wallet, error) {
	wallet, err := r.GetByUserIDForUpdate(ctx, tx, userID)
	if err == nil {
		return wallet, nil
	}

	// Wallet doesn't exist, create it within the transaction
	db := tx
	if db == nil {
		db = r.db
	}
	newWallet := &models.Wallet{
		UserID:         userID,
		Balance:        0,
		EscrowBalance:  0,
		TotalDeposited: 0,
		TotalWithdrawn: 0,
		TotalEarned:    0,
		TotalSpent:     0,
	}
	if err := db.WithContext(ctx).Create(newWallet).Error; err != nil {
		return nil, fmt.Errorf("failed to create wallet: %w", err)
	}
	return newWallet, nil
}

func (r *walletGormRepository) UpdateWithTx(ctx context.Context, tx *gorm.DB, wallet *models.Wallet) error {
	db := tx
	if db == nil {
		db = r.db
	}
	if err := db.WithContext(ctx).Save(wallet).Error; err != nil {
		return fmt.Errorf("failed to update wallet: %w", err)
	}
	return nil
}
