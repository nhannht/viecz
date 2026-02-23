package models

import (
	"testing"
)

func TestBankAccount_Validate(t *testing.T) {
	tests := []struct {
		name    string
		account *BankAccount
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid bank account",
			account: &BankAccount{
				UserID:            1,
				BankBin:           "970422",
				BankName:          "MB Bank",
				AccountNumber:     "0123456789",
				AccountHolderName: "NGUYEN VAN A",
			},
			wantErr: false,
		},
		{
			name: "missing user_id",
			account: &BankAccount{
				BankBin:           "970422",
				BankName:          "MB Bank",
				AccountNumber:     "0123456789",
				AccountHolderName: "NGUYEN VAN A",
			},
			wantErr: true,
			errMsg:  "user_id is required",
		},
		{
			name: "missing bank_bin",
			account: &BankAccount{
				UserID:            1,
				BankName:          "MB Bank",
				AccountNumber:     "0123456789",
				AccountHolderName: "NGUYEN VAN A",
			},
			wantErr: true,
			errMsg:  "bank_bin is required",
		},
		{
			name: "missing bank_name",
			account: &BankAccount{
				UserID:            1,
				BankBin:           "970422",
				AccountNumber:     "0123456789",
				AccountHolderName: "NGUYEN VAN A",
			},
			wantErr: true,
			errMsg:  "bank_name is required",
		},
		{
			name: "missing account_number",
			account: &BankAccount{
				UserID:            1,
				BankBin:           "970422",
				BankName:          "MB Bank",
				AccountHolderName: "NGUYEN VAN A",
			},
			wantErr: true,
			errMsg:  "account_number is required",
		},
		{
			name: "missing account_holder_name",
			account: &BankAccount{
				UserID:            1,
				BankBin:           "970422",
				BankName:          "MB Bank",
				AccountNumber:     "0123456789",
			},
			wantErr: true,
			errMsg:  "account_holder_name is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.account.Validate()

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

func TestBankAccount_TableName(t *testing.T) {
	ba := BankAccount{}
	if ba.TableName() != "bank_accounts" {
		t.Errorf("Expected table name 'bank_accounts', got '%s'", ba.TableName())
	}
}
