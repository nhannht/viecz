package models

import (
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func validTransaction() *Transaction {
	return &Transaction{
		PayerID:     1,
		Amount:      10000,
		PlatformFee: 500,
		NetAmount:   9500,
		Type:        TransactionTypeDeposit,
		Status:      TransactionStatusPending,
	}
}

func TestTransaction_Validate(t *testing.T) {
	tests := []struct {
		name    string
		tx      *Transaction
		wantErr bool
		errMsg  string
	}{
		{
			name:    "valid transaction - deposit pending",
			tx:      validTransaction(),
			wantErr: false,
		},
		{
			name: "valid transaction - escrow success",
			tx: func() *Transaction {
				txn := validTransaction()
				txn.Type = TransactionTypeEscrow
				txn.Status = TransactionStatusSuccess
				return txn
			}(),
			wantErr: false,
		},
		{
			name: "valid transaction - release",
			tx: func() *Transaction {
				txn := validTransaction()
				txn.Type = TransactionTypeRelease
				return txn
			}(),
			wantErr: false,
		},
		{
			name: "valid transaction - refund",
			tx: func() *Transaction {
				txn := validTransaction()
				txn.Type = TransactionTypeRefund
				return txn
			}(),
			wantErr: false,
		},
		{
			name: "valid transaction - platform_fee",
			tx: func() *Transaction {
				txn := validTransaction()
				txn.Type = TransactionTypePlatformFee
				return txn
			}(),
			wantErr: false,
		},
		{
			name: "valid transaction - withdrawal",
			tx: func() *Transaction {
				txn := validTransaction()
				txn.Type = TransactionTypeWithdrawal
				return txn
			}(),
			wantErr: false,
		},
		{
			name: "valid transaction - status failed",
			tx: func() *Transaction {
				txn := validTransaction()
				txn.Status = TransactionStatusFailed
				return txn
			}(),
			wantErr: false,
		},
		{
			name: "valid transaction - status cancelled",
			tx: func() *Transaction {
				txn := validTransaction()
				txn.Status = TransactionStatusCancelled
				return txn
			}(),
			wantErr: false,
		},
		{
			name: "missing payer_id",
			tx: func() *Transaction {
				txn := validTransaction()
				txn.PayerID = 0
				return txn
			}(),
			wantErr: true,
			errMsg:  "payer_id is required",
		},
		{
			name: "amount zero",
			tx: func() *Transaction {
				txn := validTransaction()
				txn.Amount = 0
				return txn
			}(),
			wantErr: true,
			errMsg:  "amount must be greater than 0",
		},
		{
			name: "amount negative",
			tx: func() *Transaction {
				txn := validTransaction()
				txn.Amount = -100
				return txn
			}(),
			wantErr: true,
			errMsg:  "amount must be greater than 0",
		},
		{
			name: "negative platform_fee",
			tx: func() *Transaction {
				txn := validTransaction()
				txn.PlatformFee = -1
				return txn
			}(),
			wantErr: true,
			errMsg:  "platform_fee cannot be negative",
		},
		{
			name: "negative net_amount",
			tx: func() *Transaction {
				txn := validTransaction()
				txn.NetAmount = -1
				return txn
			}(),
			wantErr: true,
			errMsg:  "net_amount cannot be negative",
		},
		{
			name: "invalid type",
			tx: func() *Transaction {
				txn := validTransaction()
				txn.Type = "invalid_type"
				return txn
			}(),
			wantErr: true,
			errMsg:  "invalid transaction type: invalid_type",
		},
		{
			name: "invalid status",
			tx: func() *Transaction {
				txn := validTransaction()
				txn.Status = "invalid_status"
				return txn
			}(),
			wantErr: true,
			errMsg:  "invalid transaction status: invalid_status",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.tx.Validate()

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error '%s', got nil", tt.errMsg)
				} else if err.Error() != tt.errMsg {
					t.Errorf("Expected error '%s', got '%s'", tt.errMsg, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
			}
		})
	}
}

func TestTransaction_CalculateNetAmount(t *testing.T) {
	tests := []struct {
		name        string
		amount      int64
		platformFee int64
		wantNet     int64
	}{
		{
			name:        "standard calculation",
			amount:      10000,
			platformFee: 500,
			wantNet:     9500,
		},
		{
			name:        "zero platform fee",
			amount:      10000,
			platformFee: 0,
			wantNet:     10000,
		},
		{
			name:        "fee equals amount",
			amount:      500,
			platformFee: 500,
			wantNet:     0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			txn := &Transaction{
				Amount:      tt.amount,
				PlatformFee: tt.platformFee,
			}
			txn.CalculateNetAmount()
			if txn.NetAmount != tt.wantNet {
				t.Errorf("CalculateNetAmount() NetAmount = %d, want %d", txn.NetAmount, tt.wantNet)
			}
		})
	}
}

func TestTransaction_BeforeCreate(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{
		Logger:                                   logger.Default.LogMode(logger.Silent),
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(&Transaction{}); err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}

	tests := []struct {
		name    string
		tx      *Transaction
		wantErr bool
	}{
		{
			name:    "valid transaction - hook passes",
			tx:      validTransaction(),
			wantErr: false,
		},
		{
			name: "invalid transaction - missing payer_id",
			tx: func() *Transaction {
				txn := validTransaction()
				txn.PayerID = 0
				return txn
			}(),
			wantErr: true,
		},
		{
			name: "invalid transaction - zero amount",
			tx: func() *Transaction {
				txn := validTransaction()
				txn.Amount = 0
				return txn
			}(),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := db.Create(tt.tx).Error

			if tt.wantErr {
				if err == nil {
					t.Error("Expected BeforeCreate hook to fail, but it passed")
				}
			} else {
				if err != nil {
					t.Errorf("Expected BeforeCreate hook to pass, got error: %v", err)
				}
				if tt.tx.ID == 0 {
					t.Error("Expected ID to be set after create")
				}
			}
		})
	}
}

func TestTransaction_BeforeCreate_CalculatesNetAmount(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{
		Logger:                                   logger.Default.LogMode(logger.Silent),
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(&Transaction{}); err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}

	txn := &Transaction{
		PayerID:     1,
		Amount:      10000,
		PlatformFee: 1000,
		NetAmount:   0, // deliberately wrong - BeforeCreate should recalculate
		Type:        TransactionTypeDeposit,
		Status:      TransactionStatusPending,
	}

	if err := db.Create(txn).Error; err != nil {
		t.Fatalf("Failed to create transaction: %v", err)
	}

	if txn.NetAmount != 9000 {
		t.Errorf("BeforeCreate should calculate NetAmount = 9000, got %d", txn.NetAmount)
	}
}

func TestTransaction_BeforeUpdate(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{
		Logger:                                   logger.Default.LogMode(logger.Silent),
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(&Transaction{}); err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}

	tests := []struct {
		name    string
		update  func(*Transaction)
		wantErr bool
	}{
		{
			name: "valid update - hook passes",
			update: func(txn *Transaction) {
				txn.Status = TransactionStatusSuccess
			},
			wantErr: false,
		},
		{
			name: "invalid update - zero amount",
			update: func(txn *Transaction) {
				txn.Amount = 0
			},
			wantErr: true,
		},
		{
			name: "invalid update - invalid type",
			update: func(txn *Transaction) {
				txn.Type = "bogus"
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			testTxn := validTransaction()
			if err := db.Create(testTxn).Error; err != nil {
				t.Fatalf("Failed to create test transaction: %v", err)
			}

			tt.update(testTxn)
			err := db.Save(testTxn).Error

			if tt.wantErr {
				if err == nil {
					t.Error("Expected BeforeUpdate hook to fail, but it passed")
				}
			} else {
				if err != nil {
					t.Errorf("Expected BeforeUpdate hook to pass, got error: %v", err)
				}
			}
		})
	}
}
