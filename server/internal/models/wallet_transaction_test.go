package models

import (
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func validWalletTransaction() *WalletTransaction {
	return &WalletTransaction{
		WalletID:      1,
		Type:          WalletTransactionTypeDeposit,
		Amount:        10000,
		BalanceBefore: 0,
		BalanceAfter:  10000,
		EscrowBefore:  0,
		EscrowAfter:   0,
		Description:   "Deposit via PayOS",
	}
}

func TestWalletTransaction_Validate(t *testing.T) {
	tests := []struct {
		name    string
		wt      *WalletTransaction
		wantErr bool
		errMsg  string
	}{
		{
			name:    "valid wallet transaction - deposit",
			wt:      validWalletTransaction(),
			wantErr: false,
		},
		{
			name: "valid wallet transaction - withdrawal",
			wt: func() *WalletTransaction {
				wt := validWalletTransaction()
				wt.Type = WalletTransactionTypeWithdrawal
				return wt
			}(),
			wantErr: false,
		},
		{
			name: "valid wallet transaction - escrow_hold",
			wt: func() *WalletTransaction {
				wt := validWalletTransaction()
				wt.Type = WalletTransactionTypeEscrowHold
				return wt
			}(),
			wantErr: false,
		},
		{
			name: "valid wallet transaction - escrow_release",
			wt: func() *WalletTransaction {
				wt := validWalletTransaction()
				wt.Type = WalletTransactionTypeEscrowRelease
				return wt
			}(),
			wantErr: false,
		},
		{
			name: "valid wallet transaction - escrow_refund",
			wt: func() *WalletTransaction {
				wt := validWalletTransaction()
				wt.Type = WalletTransactionTypeEscrowRefund
				return wt
			}(),
			wantErr: false,
		},
		{
			name: "valid wallet transaction - payment_received",
			wt: func() *WalletTransaction {
				wt := validWalletTransaction()
				wt.Type = WalletTransactionTypePaymentReceived
				return wt
			}(),
			wantErr: false,
		},
		{
			name: "valid wallet transaction - platform_fee",
			wt: func() *WalletTransaction {
				wt := validWalletTransaction()
				wt.Type = WalletTransactionTypePlatformFee
				return wt
			}(),
			wantErr: false,
		},
		{
			name: "missing wallet_id",
			wt: func() *WalletTransaction {
				wt := validWalletTransaction()
				wt.WalletID = 0
				return wt
			}(),
			wantErr: true,
			errMsg:  "wallet_id is required",
		},
		{
			name: "zero amount",
			wt: func() *WalletTransaction {
				wt := validWalletTransaction()
				wt.Amount = 0
				return wt
			}(),
			wantErr: true,
			errMsg:  "amount cannot be zero",
		},
		{
			name: "invalid type",
			wt: func() *WalletTransaction {
				wt := validWalletTransaction()
				wt.Type = "invalid_type"
				return wt
			}(),
			wantErr: true,
			errMsg:  "invalid wallet transaction type: invalid_type",
		},
		{
			name: "negative balance_before",
			wt: func() *WalletTransaction {
				wt := validWalletTransaction()
				wt.BalanceBefore = -1
				return wt
			}(),
			wantErr: true,
			errMsg:  "balance_before cannot be negative",
		},
		{
			name: "negative balance_after",
			wt: func() *WalletTransaction {
				wt := validWalletTransaction()
				wt.BalanceAfter = -1
				return wt
			}(),
			wantErr: true,
			errMsg:  "balance_after cannot be negative",
		},
		{
			name: "negative escrow_before",
			wt: func() *WalletTransaction {
				wt := validWalletTransaction()
				wt.EscrowBefore = -1
				return wt
			}(),
			wantErr: true,
			errMsg:  "escrow_before cannot be negative",
		},
		{
			name: "negative escrow_after",
			wt: func() *WalletTransaction {
				wt := validWalletTransaction()
				wt.EscrowAfter = -1
				return wt
			}(),
			wantErr: true,
			errMsg:  "escrow_after cannot be negative",
		},
		{
			name: "negative amount - valid (withdrawals are negative)",
			wt: func() *WalletTransaction {
				wt := validWalletTransaction()
				wt.Amount = -5000
				wt.Type = WalletTransactionTypeWithdrawal
				return wt
			}(),
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.wt.Validate()

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

func TestWalletTransaction_BeforeCreate(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{
		Logger:                                   logger.Default.LogMode(logger.Silent),
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(&WalletTransaction{}); err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}

	tests := []struct {
		name    string
		wt      *WalletTransaction
		wantErr bool
	}{
		{
			name:    "valid wallet transaction - hook passes",
			wt:      validWalletTransaction(),
			wantErr: false,
		},
		{
			name: "invalid wallet transaction - missing wallet_id",
			wt: func() *WalletTransaction {
				wt := validWalletTransaction()
				wt.WalletID = 0
				return wt
			}(),
			wantErr: true,
		},
		{
			name: "invalid wallet transaction - zero amount",
			wt: func() *WalletTransaction {
				wt := validWalletTransaction()
				wt.Amount = 0
				return wt
			}(),
			wantErr: true,
		},
		{
			name: "invalid wallet transaction - invalid type",
			wt: func() *WalletTransaction {
				wt := validWalletTransaction()
				wt.Type = "bogus"
				return wt
			}(),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := db.Create(tt.wt).Error

			if tt.wantErr {
				if err == nil {
					t.Error("Expected BeforeCreate hook to fail, but it passed")
				}
			} else {
				if err != nil {
					t.Errorf("Expected BeforeCreate hook to pass, got error: %v", err)
				}
				if tt.wt.ID == 0 {
					t.Error("Expected ID to be set after create")
				}
			}
		})
	}
}
