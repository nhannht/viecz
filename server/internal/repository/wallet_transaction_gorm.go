package repository

import (
	"context"
	"fmt"

	"gorm.io/gorm"
	"viecz.vieczserver/internal/models"
)

type walletTransactionGormRepository struct {
	db *gorm.DB
}

// NewWalletTransactionGormRepository creates a new GORM-based WalletTransactionRepository
func NewWalletTransactionGormRepository(db *gorm.DB) WalletTransactionRepository {
	return &walletTransactionGormRepository{db: db}
}

// Verify interface compliance
var _ WalletTransactionRepository = (*walletTransactionGormRepository)(nil)

func (r *walletTransactionGormRepository) Create(ctx context.Context, transaction *models.WalletTransaction) error {
	if err := r.db.WithContext(ctx).Create(transaction).Error; err != nil {
		return fmt.Errorf("failed to create wallet transaction: %w", err)
	}
	return nil
}

func (r *walletTransactionGormRepository) GetByID(ctx context.Context, id int64) (*models.WalletTransaction, error) {
	var transaction models.WalletTransaction
	if err := r.db.WithContext(ctx).First(&transaction, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("wallet transaction not found")
		}
		return nil, fmt.Errorf("failed to get wallet transaction: %w", err)
	}
	return &transaction, nil
}

func (r *walletTransactionGormRepository) GetByWalletID(ctx context.Context, walletID int64, limit, offset int) ([]*models.WalletTransaction, error) {
	var transactions []*models.WalletTransaction
	query := r.db.WithContext(ctx).
		Where("wallet_id = ?", walletID).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	if err := query.Find(&transactions).Error; err != nil {
		return nil, fmt.Errorf("failed to get wallet transactions: %w", err)
	}
	return transactions, nil
}

func (r *walletTransactionGormRepository) GetByTaskID(ctx context.Context, taskID int64) ([]*models.WalletTransaction, error) {
	var transactions []*models.WalletTransaction
	if err := r.db.WithContext(ctx).
		Where("task_id = ?", taskID).
		Order("created_at DESC").
		Find(&transactions).Error; err != nil {
		return nil, fmt.Errorf("failed to get wallet transactions by task ID: %w", err)
	}
	return transactions, nil
}

func (r *walletTransactionGormRepository) CreateWithTx(ctx context.Context, tx *gorm.DB, transaction *models.WalletTransaction) error {
	db := tx
	if db == nil {
		db = r.db
	}
	if err := db.WithContext(ctx).Create(transaction).Error; err != nil {
		return fmt.Errorf("failed to create wallet transaction: %w", err)
	}
	return nil
}
