package repository

import (
	"context"

	"viecz.vieczserver/internal/models"
)

// BankAccountRepository defines the interface for bank account data access
type BankAccountRepository interface {
	Create(ctx context.Context, bankAccount *models.BankAccount) error
	GetByID(ctx context.Context, id int64) (*models.BankAccount, error)
	GetByIDAndUserID(ctx context.Context, id, userID int64) (*models.BankAccount, error)
	GetByUserID(ctx context.Context, userID int64) ([]*models.BankAccount, error)
	Delete(ctx context.Context, id int64) error
}
