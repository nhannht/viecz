package repository

import (
	"context"

	"gorm.io/gorm"
	"viecz.vieczserver/internal/models"
)

// WalletTransactionRepository defines the interface for wallet transaction data access
type WalletTransactionRepository interface {
	Create(ctx context.Context, transaction *models.WalletTransaction) error
	GetByID(ctx context.Context, id int64) (*models.WalletTransaction, error)
	GetByWalletID(ctx context.Context, walletID int64, limit, offset int) ([]*models.WalletTransaction, error)
	GetByTaskID(ctx context.Context, taskID int64) ([]*models.WalletTransaction, error)
	// Transaction-aware method (pass tx from outer transaction, nil = use default db)
	CreateWithTx(ctx context.Context, tx *gorm.DB, transaction *models.WalletTransaction) error
}
