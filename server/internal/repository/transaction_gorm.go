package repository

import (
	"context"
	"fmt"

	"gorm.io/gorm"
	"viecz.vieczserver/internal/models"
)

type transactionGormRepository struct {
	db *gorm.DB
}

// NewTransactionGormRepository creates a new GORM-based TransactionRepository
func NewTransactionGormRepository(db *gorm.DB) TransactionRepository {
	return &transactionGormRepository{db: db}
}

// Verify interface compliance
var _ TransactionRepository = (*transactionGormRepository)(nil)

func (r *transactionGormRepository) Create(ctx context.Context, transaction *models.Transaction) error {
	if err := r.db.WithContext(ctx).Create(transaction).Error; err != nil {
		return fmt.Errorf("failed to create transaction: %w", err)
	}
	return nil
}

func (r *transactionGormRepository) GetByID(ctx context.Context, id int64) (*models.Transaction, error) {
	var transaction models.Transaction
	if err := r.db.WithContext(ctx).First(&transaction, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("transaction not found")
		}
		return nil, fmt.Errorf("failed to get transaction: %w", err)
	}
	return &transaction, nil
}

func (r *transactionGormRepository) GetByTaskID(ctx context.Context, taskID int64) ([]*models.Transaction, error) {
	var transactions []*models.Transaction
	if err := r.db.WithContext(ctx).
		Where("task_id = ?", taskID).
		Order("created_at DESC").
		Find(&transactions).Error; err != nil {
		return nil, fmt.Errorf("failed to get transactions by task ID: %w", err)
	}
	return transactions, nil
}

func (r *transactionGormRepository) GetByPayerID(ctx context.Context, payerID int64, limit, offset int) ([]*models.Transaction, error) {
	var transactions []*models.Transaction
	query := r.db.WithContext(ctx).
		Where("payer_id = ?", payerID).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	if err := query.Find(&transactions).Error; err != nil {
		return nil, fmt.Errorf("failed to get transactions by payer ID: %w", err)
	}
	return transactions, nil
}

func (r *transactionGormRepository) GetByPayeeID(ctx context.Context, payeeID int64, limit, offset int) ([]*models.Transaction, error) {
	var transactions []*models.Transaction
	query := r.db.WithContext(ctx).
		Where("payee_id = ?", payeeID).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	if err := query.Find(&transactions).Error; err != nil {
		return nil, fmt.Errorf("failed to get transactions by payee ID: %w", err)
	}
	return transactions, nil
}

func (r *transactionGormRepository) GetByOrderCode(ctx context.Context, orderCode int64) (*models.Transaction, error) {
	var transaction models.Transaction
	if err := r.db.WithContext(ctx).
		Where("pay_os_order_code = ?", orderCode).
		First(&transaction).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("transaction not found")
		}
		return nil, fmt.Errorf("failed to get transaction by order code: %w", err)
	}
	return &transaction, nil
}

func (r *transactionGormRepository) Update(ctx context.Context, transaction *models.Transaction) error {
	if err := r.db.WithContext(ctx).Save(transaction).Error; err != nil {
		return fmt.Errorf("failed to update transaction: %w", err)
	}
	return nil
}

func (r *transactionGormRepository) UpdateStatus(ctx context.Context, id int64, status models.TransactionStatus) error {
	if err := r.db.WithContext(ctx).
		Model(&models.Transaction{}).
		Where("id = ?", id).
		Update("status", status).Error; err != nil {
		return fmt.Errorf("failed to update transaction status: %w", err)
	}
	return nil
}

func (r *transactionGormRepository) CreateWithTx(ctx context.Context, tx *gorm.DB, transaction *models.Transaction) error {
	db := tx
	if db == nil {
		db = r.db
	}
	if err := db.WithContext(ctx).Create(transaction).Error; err != nil {
		return fmt.Errorf("failed to create transaction: %w", err)
	}
	return nil
}

func (r *transactionGormRepository) GetByTaskIDWithTx(ctx context.Context, tx *gorm.DB, taskID int64) ([]*models.Transaction, error) {
	db := tx
	if db == nil {
		db = r.db
	}
	var transactions []*models.Transaction
	if err := db.WithContext(ctx).
		Where("task_id = ?", taskID).
		Order("created_at DESC").
		Find(&transactions).Error; err != nil {
		return nil, fmt.Errorf("failed to get transactions by task ID: %w", err)
	}
	return transactions, nil
}
