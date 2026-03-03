package repository

import (
	"context"

	"gorm.io/gorm"
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
	GetPendingPayouts(ctx context.Context) ([]*models.Transaction, error)
	// Transaction-aware methods (pass tx from outer transaction, nil = use default db)
	CreateWithTx(ctx context.Context, tx *gorm.DB, transaction *models.Transaction) error
	GetByTaskIDWithTx(ctx context.Context, tx *gorm.DB, taskID int64) ([]*models.Transaction, error)
}

// PaymentReferenceRepository tracks processed PayOS bank transfer references.
// Used to deduplicate webhook callbacks by reference (not order code).
type PaymentReferenceRepository interface {
	// CreateIfNotExists attempts to insert a new payment reference.
	// Returns true if the reference was newly created, false if it already existed.
	CreateIfNotExists(ctx context.Context, ref *models.PaymentReference) (bool, error)
}
