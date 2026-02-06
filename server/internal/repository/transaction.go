package repository

import (
	"context"

	"viecz.vieczserver/internal/models"
)

// TransactionRepository defines the interface for transaction data access
type TransactionRepository interface {
	Create(ctx context.Context, transaction *models.Transaction) error
	GetByID(ctx context.Context, id int64) (*models.Transaction, error)
	GetByTaskID(ctx context.Context, taskID int64) ([]*models.Transaction, error)
	GetByPayerID(ctx context.Context, payerID int64, limit, offset int) ([]*models.Transaction, error)
	GetByPayeeID(ctx context.Context, payeeID int64, limit, offset int) ([]*models.Transaction, error)
	GetByOrderCode(ctx context.Context, orderCode int64) (*models.Transaction, error)
	Update(ctx context.Context, transaction *models.Transaction) error
	UpdateStatus(ctx context.Context, id int64, status models.TransactionStatus) error
}
