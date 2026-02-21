package repository

import (
	"context"

	"gorm.io/gorm"
	"viecz.vieczserver/internal/models"
)

// WalletRepository defines the interface for wallet data access
type WalletRepository interface {
	Create(ctx context.Context, wallet *models.Wallet) error
	GetByID(ctx context.Context, id int64) (*models.Wallet, error)
	GetByUserID(ctx context.Context, userID int64) (*models.Wallet, error)
	Update(ctx context.Context, wallet *models.Wallet) error
	GetOrCreate(ctx context.Context, userID int64) (*models.Wallet, error)
	// Transaction-aware methods (pass tx from outer transaction, nil = use default db)
	GetByUserIDForUpdate(ctx context.Context, tx *gorm.DB, userID int64) (*models.Wallet, error)
	GetOrCreateForUpdate(ctx context.Context, tx *gorm.DB, userID int64) (*models.Wallet, error)
	UpdateWithTx(ctx context.Context, tx *gorm.DB, wallet *models.Wallet) error
}
