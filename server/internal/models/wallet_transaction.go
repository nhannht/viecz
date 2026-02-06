package models

import (
	"fmt"
	"time"

	"gorm.io/gorm"
)

// WalletTransactionType represents the type of wallet transaction
type WalletTransactionType string

const (
	WalletTransactionTypeDeposit          WalletTransactionType = "deposit"
	WalletTransactionTypeWithdrawal       WalletTransactionType = "withdrawal"
	WalletTransactionTypeEscrowHold       WalletTransactionType = "escrow_hold"
	WalletTransactionTypeEscrowRelease    WalletTransactionType = "escrow_release"
	WalletTransactionTypeEscrowRefund     WalletTransactionType = "escrow_refund"
	WalletTransactionTypePaymentReceived  WalletTransactionType = "payment_received"
	WalletTransactionTypePlatformFee      WalletTransactionType = "platform_fee"
)

// WalletTransaction represents a transaction history entry for a wallet
type WalletTransaction struct {
	ID              int64                 `gorm:"primaryKey;autoIncrement" json:"id"`
	WalletID        int64                 `gorm:"not null;index" json:"wallet_id"`
	TransactionID   *int64                `gorm:"index" json:"transaction_id,omitempty"`
	TaskID          *int64                `gorm:"index" json:"task_id,omitempty"`
	Type            WalletTransactionType `gorm:"type:varchar(30);not null;index" json:"type"`
	Amount          int64                 `gorm:"not null" json:"amount"`
	BalanceBefore   int64                 `gorm:"not null" json:"balance_before"`
	BalanceAfter    int64                 `gorm:"not null" json:"balance_after"`
	EscrowBefore    int64                 `gorm:"not null" json:"escrow_before"`
	EscrowAfter     int64                 `gorm:"not null" json:"escrow_after"`
	Description     string                `gorm:"type:text" json:"description"`
	ReferenceUserID *int64                `gorm:"index" json:"reference_user_id,omitempty"` // Other party in transaction
	CreatedAt       time.Time             `gorm:"autoCreateTime;index" json:"created_at"`

	// Associations
	Wallet        Wallet       `gorm:"foreignKey:WalletID" json:"-"`
	Transaction   *Transaction `gorm:"foreignKey:TransactionID" json:"-"`
	Task          *Task        `gorm:"foreignKey:TaskID" json:"-"`
	ReferenceUser *User        `gorm:"foreignKey:ReferenceUserID" json:"-"`
}

// Validate validates the wallet transaction model
func (wt *WalletTransaction) Validate() error {
	if wt.WalletID == 0 {
		return fmt.Errorf("wallet_id is required")
	}

	if wt.Amount == 0 {
		return fmt.Errorf("amount cannot be zero")
	}

	validTypes := map[WalletTransactionType]bool{
		WalletTransactionTypeDeposit:         true,
		WalletTransactionTypeWithdrawal:      true,
		WalletTransactionTypeEscrowHold:      true,
		WalletTransactionTypeEscrowRelease:   true,
		WalletTransactionTypeEscrowRefund:    true,
		WalletTransactionTypePaymentReceived: true,
		WalletTransactionTypePlatformFee:     true,
	}
	if !validTypes[wt.Type] {
		return fmt.Errorf("invalid wallet transaction type: %s", wt.Type)
	}

	if wt.BalanceBefore < 0 {
		return fmt.Errorf("balance_before cannot be negative")
	}

	if wt.BalanceAfter < 0 {
		return fmt.Errorf("balance_after cannot be negative")
	}

	if wt.EscrowBefore < 0 {
		return fmt.Errorf("escrow_before cannot be negative")
	}

	if wt.EscrowAfter < 0 {
		return fmt.Errorf("escrow_after cannot be negative")
	}

	return nil
}

// BeforeCreate hook is called before creating a wallet transaction
func (wt *WalletTransaction) BeforeCreate(tx *gorm.DB) error {
	return wt.Validate()
}
