package models

import (
	"fmt"
	"time"

	"gorm.io/gorm"
)

// BankAccount represents a user's saved bank account for withdrawals
type BankAccount struct {
	ID                int64     `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID            int64     `gorm:"not null;index" json:"user_id"`
	BankBin           string    `gorm:"type:varchar(20);not null" json:"bank_bin"`
	BankName          string    `gorm:"type:varchar(100);not null" json:"bank_name"`
	AccountNumber     string    `gorm:"type:varchar(50);not null" json:"account_number"`
	AccountHolderName string    `gorm:"type:varchar(200);not null" json:"account_holder_name"`
	IsDefault         bool      `gorm:"not null;default:false" json:"is_default"`
	CreatedAt         time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt         time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	// Associations
	User User `gorm:"foreignKey:UserID" json:"-"`
}

// TableName overrides the table name
func (BankAccount) TableName() string {
	return "bank_accounts"
}

// Validate validates the bank account model
func (ba *BankAccount) Validate() error {
	if ba.UserID == 0 {
		return fmt.Errorf("user_id is required")
	}
	if ba.BankBin == "" {
		return fmt.Errorf("bank_bin is required")
	}
	if ba.BankName == "" {
		return fmt.Errorf("bank_name is required")
	}
	if ba.AccountNumber == "" {
		return fmt.Errorf("account_number is required")
	}
	if ba.AccountHolderName == "" {
		return fmt.Errorf("account_holder_name is required")
	}
	return nil
}

// BeforeCreate hook is called before creating a bank account
func (ba *BankAccount) BeforeCreate(tx *gorm.DB) error {
	return ba.Validate()
}
