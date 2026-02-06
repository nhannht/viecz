package models

import (
	"fmt"
	"time"

	"gorm.io/gorm"
)

// Wallet represents a user's wallet for mock payments (dev mode)
type Wallet struct {
	ID              int64     `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID          int64     `gorm:"unique;not null;index" json:"user_id"`
	Balance         int64     `gorm:"not null;default:0" json:"balance"`          // Available balance
	EscrowBalance   int64     `gorm:"not null;default:0" json:"escrow_balance"`   // Held in escrow
	TotalDeposited  int64     `gorm:"not null;default:0" json:"total_deposited"`  // Lifetime deposits
	TotalWithdrawn  int64     `gorm:"not null;default:0" json:"total_withdrawn"`  // Lifetime withdrawals
	TotalEarned     int64     `gorm:"not null;default:0" json:"total_earned"`     // Lifetime earnings
	TotalSpent      int64     `gorm:"not null;default:0" json:"total_spent"`      // Lifetime spending
	CreatedAt       time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	// Associations
	User User `gorm:"foreignKey:UserID" json:"-"`
}

// Validate validates the wallet model
func (w *Wallet) Validate() error {
	if w.UserID == 0 {
		return fmt.Errorf("user_id is required")
	}

	if w.Balance < 0 {
		return fmt.Errorf("balance cannot be negative")
	}

	if w.EscrowBalance < 0 {
		return fmt.Errorf("escrow_balance cannot be negative")
	}

	if w.TotalDeposited < 0 {
		return fmt.Errorf("total_deposited cannot be negative")
	}

	if w.TotalWithdrawn < 0 {
		return fmt.Errorf("total_withdrawn cannot be negative")
	}

	if w.TotalEarned < 0 {
		return fmt.Errorf("total_earned cannot be negative")
	}

	if w.TotalSpent < 0 {
		return fmt.Errorf("total_spent cannot be negative")
	}

	return nil
}

// HasSufficientBalance checks if wallet has enough balance for a transaction
func (w *Wallet) HasSufficientBalance(amount int64) bool {
	return w.Balance >= amount
}

// Deduct deducts amount from available balance
func (w *Wallet) Deduct(amount int64) error {
	if !w.HasSufficientBalance(amount) {
		return fmt.Errorf("insufficient balance: have %d, need %d", w.Balance, amount)
	}
	w.Balance -= amount
	return nil
}

// Credit adds amount to available balance
func (w *Wallet) Credit(amount int64) {
	w.Balance += amount
}

// HoldInEscrow moves amount from balance to escrow
func (w *Wallet) HoldInEscrow(amount int64) error {
	if err := w.Deduct(amount); err != nil {
		return err
	}
	w.EscrowBalance += amount
	w.TotalSpent += amount
	return nil
}

// ReleaseFromEscrow moves amount from escrow (does not add to balance, goes to payee)
func (w *Wallet) ReleaseFromEscrow(amount int64) error {
	if w.EscrowBalance < amount {
		return fmt.Errorf("insufficient escrow balance: have %d, need %d", w.EscrowBalance, amount)
	}
	w.EscrowBalance -= amount
	return nil
}

// RefundFromEscrow moves amount from escrow back to balance
func (w *Wallet) RefundFromEscrow(amount int64) error {
	if w.EscrowBalance < amount {
		return fmt.Errorf("insufficient escrow balance: have %d, need %d", w.EscrowBalance, amount)
	}
	w.EscrowBalance -= amount
	w.Balance += amount
	w.TotalSpent -= amount // Reverse the spend since it's refunded
	return nil
}

// BeforeCreate hook is called before creating a wallet
func (w *Wallet) BeforeCreate(tx *gorm.DB) error {
	return w.Validate()
}

// BeforeUpdate hook is called before updating a wallet
func (w *Wallet) BeforeUpdate(tx *gorm.DB) error {
	return w.Validate()
}
