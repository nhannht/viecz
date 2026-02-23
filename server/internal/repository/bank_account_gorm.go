package repository

import (
	"context"
	"fmt"

	"gorm.io/gorm"
	"viecz.vieczserver/internal/models"
)

type bankAccountGormRepository struct {
	db *gorm.DB
}

// NewBankAccountGormRepository creates a new GORM-based BankAccountRepository
func NewBankAccountGormRepository(db *gorm.DB) BankAccountRepository {
	return &bankAccountGormRepository{db: db}
}

// Verify interface compliance
var _ BankAccountRepository = (*bankAccountGormRepository)(nil)

func (r *bankAccountGormRepository) Create(ctx context.Context, bankAccount *models.BankAccount) error {
	if err := r.db.WithContext(ctx).Create(bankAccount).Error; err != nil {
		return fmt.Errorf("failed to create bank account: %w", err)
	}
	return nil
}

func (r *bankAccountGormRepository) GetByID(ctx context.Context, id int64) (*models.BankAccount, error) {
	var bankAccount models.BankAccount
	if err := r.db.WithContext(ctx).First(&bankAccount, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("bank account not found")
		}
		return nil, fmt.Errorf("failed to get bank account: %w", err)
	}
	return &bankAccount, nil
}

func (r *bankAccountGormRepository) GetByIDAndUserID(ctx context.Context, id, userID int64) (*models.BankAccount, error) {
	var bankAccount models.BankAccount
	if err := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).First(&bankAccount).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("bank account not found")
		}
		return nil, fmt.Errorf("failed to get bank account: %w", err)
	}
	return &bankAccount, nil
}

func (r *bankAccountGormRepository) GetByUserID(ctx context.Context, userID int64) ([]*models.BankAccount, error) {
	var bankAccounts []*models.BankAccount
	if err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("created_at DESC").Find(&bankAccounts).Error; err != nil {
		return nil, fmt.Errorf("failed to get bank accounts: %w", err)
	}
	return bankAccounts, nil
}

func (r *bankAccountGormRepository) Delete(ctx context.Context, id int64) error {
	result := r.db.WithContext(ctx).Delete(&models.BankAccount{}, id)
	if result.Error != nil {
		return fmt.Errorf("failed to delete bank account: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("bank account not found")
	}
	return nil
}
