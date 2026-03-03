package models

import (
	"fmt"
	"time"

	"gorm.io/gorm"
)

// TransactionType represents the type of transaction
type TransactionType string

const (
	TransactionTypeEscrow      TransactionType = "escrow"
	TransactionTypeRelease     TransactionType = "release"
	TransactionTypeRefund      TransactionType = "refund"
	TransactionTypePlatformFee TransactionType = "platform_fee"
	TransactionTypeDeposit     TransactionType = "deposit"
	TransactionTypeWithdrawal  TransactionType = "withdrawal"
)

// TransactionStatus represents the status of a transaction
type TransactionStatus string

const (
	TransactionStatusPending   TransactionStatus = "pending"
	TransactionStatusSuccess   TransactionStatus = "success"
	TransactionStatusFailed    TransactionStatus = "failed"
	TransactionStatusCancelled TransactionStatus = "cancelled"
)

// Transaction represents a payment transaction in the system
type Transaction struct {
	ID              int64             `gorm:"primaryKey;autoIncrement" json:"id"`
	TaskID          *int64            `gorm:"index" json:"task_id,omitempty"`
	PayerID         int64             `gorm:"not null;index" json:"payer_id"`
	PayeeID         *int64            `gorm:"index" json:"payee_id,omitempty"`
	Amount          int64             `gorm:"not null" json:"amount"`
	PlatformFee     int64             `gorm:"not null;default:0" json:"platform_fee"`
	NetAmount       int64             `gorm:"not null" json:"net_amount"` // Amount - PlatformFee
	Type            TransactionType   `gorm:"type:varchar(20);not null;index" json:"type"`
	Status          TransactionStatus `gorm:"type:varchar(20);not null;default:'pending';index" json:"status"`
	PayOSOrderCode  *int64            `gorm:"unique" json:"payos_order_code,omitempty"`
	PayOSPaymentID  *string           `gorm:"type:text" json:"payos_payment_id,omitempty"`
	PayOSPayoutID   *string           `gorm:"type:text" json:"payos_payout_id,omitempty"`
	Description     string            `gorm:"type:text" json:"description"`
	FailureReason   *string           `gorm:"type:text" json:"failure_reason,omitempty"`
	CompletedAt     *time.Time        `json:"completed_at,omitempty"`
	CreatedAt       time.Time         `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time         `gorm:"autoUpdateTime" json:"updated_at"`

	// Associations
	Task  *Task `gorm:"foreignKey:TaskID" json:"-"`
	Payer User  `gorm:"foreignKey:PayerID" json:"-"`
	Payee *User `gorm:"foreignKey:PayeeID" json:"-"`
}

// Validate validates the transaction model
func (t *Transaction) Validate() error {
	if t.PayerID == 0 {
		return fmt.Errorf("payer_id is required")
	}

	if t.Amount <= 0 {
		return fmt.Errorf("amount must be greater than 0")
	}

	if t.PlatformFee < 0 {
		return fmt.Errorf("platform_fee cannot be negative")
	}

	if t.NetAmount < 0 {
		return fmt.Errorf("net_amount cannot be negative")
	}

	validTypes := map[TransactionType]bool{
		TransactionTypeEscrow:      true,
		TransactionTypeRelease:     true,
		TransactionTypeRefund:      true,
		TransactionTypePlatformFee: true,
		TransactionTypeDeposit:     true,
		TransactionTypeWithdrawal:  true,
	}
	if !validTypes[t.Type] {
		return fmt.Errorf("invalid transaction type: %s", t.Type)
	}

	validStatuses := map[TransactionStatus]bool{
		TransactionStatusPending:   true,
		TransactionStatusSuccess:   true,
		TransactionStatusFailed:    true,
		TransactionStatusCancelled: true,
	}
	if !validStatuses[t.Status] {
		return fmt.Errorf("invalid transaction status: %s", t.Status)
	}

	return nil
}

// CalculateNetAmount calculates net amount after platform fee
func (t *Transaction) CalculateNetAmount() {
	t.NetAmount = t.Amount - t.PlatformFee
}

// BeforeCreate hook is called before creating a transaction
func (t *Transaction) BeforeCreate(tx *gorm.DB) error {
	t.CalculateNetAmount()
	return t.Validate()
}

// BeforeUpdate hook is called before updating a transaction
func (t *Transaction) BeforeUpdate(tx *gorm.DB) error {
	t.CalculateNetAmount()
	return t.Validate()
}

// PaymentReference tracks processed bank transfer references from PayOS webhooks.
// Each QR code scan is a separate bank transfer with a unique reference.
// This table deduplicates by reference (not order code) so that if a user pays
// the same QR twice, we credit their wallet for each actual bank transfer.
type PaymentReference struct {
	ID          int64     `gorm:"primaryKey;autoIncrement"`
	OrderCode   int64     `gorm:"not null;index"`
	Reference   string    `gorm:"type:varchar(255);uniqueIndex;not null"`
	Amount      int64     `gorm:"not null"`
	ProcessedAt time.Time `gorm:"autoCreateTime"`
}
