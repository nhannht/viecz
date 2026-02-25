package models

import (
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestWallet_Validate(t *testing.T) {
	tests := []struct {
		name    string
		wallet  *Wallet
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid wallet",
			wallet: &Wallet{
				UserID:         1,
				Balance:        1000,
				EscrowBalance:  200,
				TotalDeposited: 5000,
				TotalWithdrawn: 500,
				TotalEarned:    2000,
				TotalSpent:     1000,
			},
			wantErr: false,
		},
		{
			name: "valid wallet with zero balances",
			wallet: &Wallet{
				UserID: 1,
			},
			wantErr: false,
		},
		{
			name:    "missing user_id",
			wallet:  &Wallet{Balance: 1000},
			wantErr: true,
			errMsg:  "user_id is required",
		},
		{
			name: "negative balance",
			wallet: &Wallet{
				UserID:  1,
				Balance: -100,
			},
			wantErr: true,
			errMsg:  "balance cannot be negative",
		},
		{
			name: "negative escrow_balance",
			wallet: &Wallet{
				UserID:        1,
				EscrowBalance: -50,
			},
			wantErr: true,
			errMsg:  "escrow_balance cannot be negative",
		},
		{
			name: "negative total_deposited",
			wallet: &Wallet{
				UserID:         1,
				TotalDeposited: -1,
			},
			wantErr: true,
			errMsg:  "total_deposited cannot be negative",
		},
		{
			name: "negative total_withdrawn",
			wallet: &Wallet{
				UserID:         1,
				TotalWithdrawn: -1,
			},
			wantErr: true,
			errMsg:  "total_withdrawn cannot be negative",
		},
		{
			name: "negative total_earned",
			wallet: &Wallet{
				UserID:      1,
				TotalEarned: -1,
			},
			wantErr: true,
			errMsg:  "total_earned cannot be negative",
		},
		{
			name: "negative total_spent",
			wallet: &Wallet{
				UserID:     1,
				TotalSpent: -1,
			},
			wantErr: true,
			errMsg:  "total_spent cannot be negative",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.wallet.Validate()

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

func TestWallet_HasSufficientBalance(t *testing.T) {
	tests := []struct {
		name    string
		balance int64
		amount  int64
		want    bool
	}{
		{
			name:    "sufficient balance",
			balance: 1000,
			amount:  500,
			want:    true,
		},
		{
			name:    "insufficient balance",
			balance: 100,
			amount:  500,
			want:    false,
		},
		{
			name:    "exact balance",
			balance: 500,
			amount:  500,
			want:    true,
		},
		{
			name:    "zero balance zero amount",
			balance: 0,
			amount:  0,
			want:    true,
		},
		{
			name:    "zero balance positive amount",
			balance: 0,
			amount:  1,
			want:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := &Wallet{Balance: tt.balance}
			got := w.HasSufficientBalance(tt.amount)
			if got != tt.want {
				t.Errorf("HasSufficientBalance(%d) = %v, want %v (balance=%d)", tt.amount, got, tt.want, tt.balance)
			}
		})
	}
}

func TestWallet_Deduct(t *testing.T) {
	tests := []struct {
		name            string
		balance         int64
		amount          int64
		wantErr         bool
		expectedBalance int64
	}{
		{
			name:            "successful deduction",
			balance:         1000,
			amount:          300,
			wantErr:         false,
			expectedBalance: 700,
		},
		{
			name:            "deduct exact balance",
			balance:         500,
			amount:          500,
			wantErr:         false,
			expectedBalance: 0,
		},
		{
			name:    "insufficient balance",
			balance: 100,
			amount:  500,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := &Wallet{Balance: tt.balance}
			err := w.Deduct(tt.amount)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error, got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if w.Balance != tt.expectedBalance {
					t.Errorf("Expected balance %d, got %d", tt.expectedBalance, w.Balance)
				}
			}
		})
	}
}

func TestWallet_Credit(t *testing.T) {
	tests := []struct {
		name            string
		balance         int64
		amount          int64
		expectedBalance int64
	}{
		{
			name:            "credit to zero balance",
			balance:         0,
			amount:          500,
			expectedBalance: 500,
		},
		{
			name:            "credit to existing balance",
			balance:         1000,
			amount:          500,
			expectedBalance: 1500,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := &Wallet{Balance: tt.balance}
			w.Credit(tt.amount)
			if w.Balance != tt.expectedBalance {
				t.Errorf("Expected balance %d, got %d", tt.expectedBalance, w.Balance)
			}
		})
	}
}

func TestWallet_HoldInEscrow(t *testing.T) {
	tests := []struct {
		name            string
		balance         int64
		escrowBalance   int64
		totalSpent      int64
		amount          int64
		wantErr         bool
		expectedBalance int64
		expectedEscrow  int64
		expectedSpent   int64
	}{
		{
			name:            "successful escrow hold",
			balance:         1000,
			escrowBalance:   0,
			totalSpent:      0,
			amount:          300,
			wantErr:         false,
			expectedBalance: 700,
			expectedEscrow:  300,
			expectedSpent:   300,
		},
		{
			name:            "escrow hold with existing escrow",
			balance:         1000,
			escrowBalance:   200,
			totalSpent:      200,
			amount:          300,
			wantErr:         false,
			expectedBalance: 700,
			expectedEscrow:  500,
			expectedSpent:   500,
		},
		{
			name:          "insufficient balance for escrow",
			balance:       100,
			escrowBalance: 0,
			totalSpent:    0,
			amount:        500,
			wantErr:       true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := &Wallet{
				Balance:       tt.balance,
				EscrowBalance: tt.escrowBalance,
				TotalSpent:    tt.totalSpent,
			}
			err := w.HoldInEscrow(tt.amount)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error, got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if w.Balance != tt.expectedBalance {
					t.Errorf("Expected balance %d, got %d", tt.expectedBalance, w.Balance)
				}
				if w.EscrowBalance != tt.expectedEscrow {
					t.Errorf("Expected escrow %d, got %d", tt.expectedEscrow, w.EscrowBalance)
				}
				if w.TotalSpent != tt.expectedSpent {
					t.Errorf("Expected total_spent %d, got %d", tt.expectedSpent, w.TotalSpent)
				}
			}
		})
	}
}

func TestWallet_ReleaseFromEscrow(t *testing.T) {
	tests := []struct {
		name           string
		escrowBalance  int64
		amount         int64
		wantErr        bool
		expectedEscrow int64
	}{
		{
			name:           "successful release",
			escrowBalance:  500,
			amount:         300,
			wantErr:        false,
			expectedEscrow: 200,
		},
		{
			name:           "release exact escrow",
			escrowBalance:  500,
			amount:         500,
			wantErr:        false,
			expectedEscrow: 0,
		},
		{
			name:          "insufficient escrow",
			escrowBalance: 100,
			amount:        500,
			wantErr:       true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := &Wallet{EscrowBalance: tt.escrowBalance}
			err := w.ReleaseFromEscrow(tt.amount)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error, got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if w.EscrowBalance != tt.expectedEscrow {
					t.Errorf("Expected escrow %d, got %d", tt.expectedEscrow, w.EscrowBalance)
				}
			}
		})
	}
}

func TestWallet_RefundFromEscrow(t *testing.T) {
	tests := []struct {
		name            string
		balance         int64
		escrowBalance   int64
		totalSpent      int64
		amount          int64
		wantErr         bool
		expectedBalance int64
		expectedEscrow  int64
		expectedSpent   int64
	}{
		{
			name:            "successful refund",
			balance:         500,
			escrowBalance:   300,
			totalSpent:      300,
			amount:          200,
			wantErr:         false,
			expectedBalance: 700,
			expectedEscrow:  100,
			expectedSpent:   100,
		},
		{
			name:            "refund full escrow",
			balance:         500,
			escrowBalance:   300,
			totalSpent:      300,
			amount:          300,
			wantErr:         false,
			expectedBalance: 800,
			expectedEscrow:  0,
			expectedSpent:   0,
		},
		{
			name:          "insufficient escrow for refund",
			balance:       500,
			escrowBalance: 100,
			totalSpent:    100,
			amount:        500,
			wantErr:       true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := &Wallet{
				Balance:       tt.balance,
				EscrowBalance: tt.escrowBalance,
				TotalSpent:    tt.totalSpent,
			}
			err := w.RefundFromEscrow(tt.amount)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error, got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if w.Balance != tt.expectedBalance {
					t.Errorf("Expected balance %d, got %d", tt.expectedBalance, w.Balance)
				}
				if w.EscrowBalance != tt.expectedEscrow {
					t.Errorf("Expected escrow %d, got %d", tt.expectedEscrow, w.EscrowBalance)
				}
				if w.TotalSpent != tt.expectedSpent {
					t.Errorf("Expected total_spent %d, got %d", tt.expectedSpent, w.TotalSpent)
				}
			}
		})
	}
}

func TestWallet_BeforeCreate(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{
		Logger:                                   logger.Default.LogMode(logger.Silent),
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(&Wallet{}); err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}

	tests := []struct {
		name    string
		wallet  *Wallet
		wantErr bool
	}{
		{
			name:    "valid wallet - hook passes",
			wallet:  &Wallet{UserID: 1, Balance: 100},
			wantErr: false,
		},
		{
			name:    "invalid wallet - missing user_id",
			wallet:  &Wallet{Balance: 100},
			wantErr: true,
		},
		{
			name:    "invalid wallet - negative balance",
			wallet:  &Wallet{UserID: 2, Balance: -1},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := db.Create(tt.wallet).Error

			if tt.wantErr {
				if err == nil {
					t.Error("Expected BeforeCreate hook to fail, but it passed")
				}
			} else {
				if err != nil {
					t.Errorf("Expected BeforeCreate hook to pass, got error: %v", err)
				}
				if tt.wallet.ID == 0 {
					t.Error("Expected ID to be set after create")
				}
			}
		})
	}
}

func TestWallet_BeforeUpdate(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{
		Logger:                                   logger.Default.LogMode(logger.Silent),
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(&Wallet{}); err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}

	tests := []struct {
		name    string
		userID  int64
		update  func(*Wallet)
		wantErr bool
	}{
		{
			name:   "valid update - hook passes",
			userID: 10,
			update: func(w *Wallet) {
				w.Balance = 2000
			},
			wantErr: false,
		},
		{
			name:   "invalid update - negative balance",
			userID: 11,
			update: func(w *Wallet) {
				w.Balance = -1
			},
			wantErr: true,
		},
		{
			name:   "invalid update - negative escrow",
			userID: 12,
			update: func(w *Wallet) {
				w.EscrowBalance = -1
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			testWallet := &Wallet{UserID: tt.userID, Balance: 1000}
			if err := db.Create(testWallet).Error; err != nil {
				t.Fatalf("Failed to create test wallet: %v", err)
			}

			tt.update(testWallet)
			err := db.Save(testWallet).Error

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
