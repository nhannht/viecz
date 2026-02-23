package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/testutil"
)

func TestBankAccountHandler_AddBankAccount(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		setupContext   func(*gin.Context)
		requestBody    interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name: "successful add",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			requestBody: AddBankAccountRequest{
				BankBin:           "970422",
				BankName:          "MB Bank",
				AccountNumber:     "0123456789",
				AccountHolderName: "NGUYEN VAN A",
			},
			expectedStatus: http.StatusCreated,
		},
		{
			name: "unauthorized - no user ID",
			setupContext: func(c *gin.Context) {
				// Don't set userID
			},
			requestBody: AddBankAccountRequest{
				BankBin:           "970422",
				BankName:          "MB Bank",
				AccountNumber:     "0123456789",
				AccountHolderName: "NGUYEN VAN A",
			},
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "unauthorized",
		},
		{
			name: "missing bank_bin",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			requestBody: map[string]string{
				"bank_name":           "MB Bank",
				"account_number":      "0123456789",
				"account_holder_name": "NGUYEN VAN A",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid_request",
		},
		{
			name: "missing account_number",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			requestBody: map[string]string{
				"bank_bin":            "970422",
				"bank_name":           "MB Bank",
				"account_holder_name": "NGUYEN VAN A",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid_request",
		},
		{
			name: "missing account_holder_name",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			requestBody: map[string]string{
				"bank_bin":        "970422",
				"bank_name":       "MB Bank",
				"account_number":  "0123456789",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid_request",
		},
		{
			name: "malformed JSON",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			requestBody:    "invalid json",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid_request",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockBankAccountRepo := testutil.NewMockBankAccountRepository()
			handler := NewBankAccountHandler(mockBankAccountRepo)

			var bodyBytes []byte
			if str, ok := tt.requestBody.(string); ok {
				bodyBytes = []byte(str)
			} else {
				bodyBytes, _ = json.Marshal(tt.requestBody)
			}

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodPost, "/bank-accounts", bytes.NewReader(bodyBytes))
			c.Request.Header.Set("Content-Type", "application/json")
			tt.setupContext(c)

			handler.AddBankAccount(c)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d. Body: %s", tt.expectedStatus, w.Code, w.Body.String())
			}

			if tt.expectedError != "" {
				var errResp models.ErrorResponse
				if err := json.Unmarshal(w.Body.Bytes(), &errResp); err != nil {
					t.Fatalf("Failed to unmarshal error response: %v", err)
				}
				if errResp.Error != tt.expectedError {
					t.Errorf("Expected error '%s', got '%s'", tt.expectedError, errResp.Error)
				}
			}

			if tt.expectedStatus == http.StatusCreated {
				var account models.BankAccount
				if err := json.Unmarshal(w.Body.Bytes(), &account); err != nil {
					t.Fatalf("Failed to unmarshal bank account response: %v", err)
				}
				if account.ID == 0 {
					t.Error("Expected bank account ID to be non-zero")
				}
				if account.UserID != 1 {
					t.Errorf("Expected user_id 1, got %d", account.UserID)
				}
			}
		})
	}
}

func TestBankAccountHandler_ListBankAccounts(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		setupContext   func(*gin.Context)
		setupRepo      func(*testutil.MockBankAccountRepository)
		expectedStatus int
		expectedError  string
		expectedCount  int
	}{
		{
			name: "list accounts for user",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			setupRepo: func(repo *testutil.MockBankAccountRepository) {
				repo.Accounts[1] = &models.BankAccount{
					ID:                1,
					UserID:            1,
					BankBin:           "970422",
					BankName:          "MB Bank",
					AccountNumber:     "111",
					AccountHolderName: "A",
				}
				repo.Accounts[2] = &models.BankAccount{
					ID:                2,
					UserID:            1,
					BankBin:           "970415",
					BankName:          "Vietinbank",
					AccountNumber:     "222",
					AccountHolderName: "A",
				}
				// Account for a different user
				repo.Accounts[3] = &models.BankAccount{
					ID:                3,
					UserID:            2,
					BankBin:           "970436",
					BankName:          "Vietcombank",
					AccountNumber:     "333",
					AccountHolderName: "B",
				}
			},
			expectedStatus: http.StatusOK,
			expectedCount:  2,
		},
		{
			name: "empty list",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			setupRepo:      func(repo *testutil.MockBankAccountRepository) {},
			expectedStatus: http.StatusOK,
			expectedCount:  0,
		},
		{
			name: "unauthorized",
			setupContext: func(c *gin.Context) {
				// Don't set userID
			},
			setupRepo:      func(repo *testutil.MockBankAccountRepository) {},
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "unauthorized",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockBankAccountRepo := testutil.NewMockBankAccountRepository()
			if tt.setupRepo != nil {
				tt.setupRepo(mockBankAccountRepo)
			}
			handler := NewBankAccountHandler(mockBankAccountRepo)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodGet, "/bank-accounts", nil)
			tt.setupContext(c)

			handler.ListBankAccounts(c)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d. Body: %s", tt.expectedStatus, w.Code, w.Body.String())
			}

			if tt.expectedError != "" {
				var errResp models.ErrorResponse
				if err := json.Unmarshal(w.Body.Bytes(), &errResp); err != nil {
					t.Fatalf("Failed to unmarshal error response: %v", err)
				}
				if errResp.Error != tt.expectedError {
					t.Errorf("Expected error '%s', got '%s'", tt.expectedError, errResp.Error)
				}
			}

			if w.Code == http.StatusOK {
				var accounts []*models.BankAccount
				if err := json.Unmarshal(w.Body.Bytes(), &accounts); err != nil {
					t.Fatalf("Failed to unmarshal accounts response: %v", err)
				}
				if len(accounts) != tt.expectedCount {
					t.Errorf("Expected %d accounts, got %d", tt.expectedCount, len(accounts))
				}
			}
		})
	}
}

func TestBankAccountHandler_DeleteBankAccount(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		setupContext   func(*gin.Context)
		setupRepo      func(*testutil.MockBankAccountRepository)
		paramID        string
		expectedStatus int
		expectedError  string
	}{
		{
			name: "successful delete own account",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			setupRepo: func(repo *testutil.MockBankAccountRepository) {
				repo.Accounts[1] = &models.BankAccount{
					ID:                1,
					UserID:            1,
					BankBin:           "970422",
					BankName:          "MB Bank",
					AccountNumber:     "111",
					AccountHolderName: "A",
				}
			},
			paramID:        "1",
			expectedStatus: http.StatusOK,
		},
		{
			name: "cannot delete another user's account",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(2))
			},
			setupRepo: func(repo *testutil.MockBankAccountRepository) {
				repo.Accounts[1] = &models.BankAccount{
					ID:                1,
					UserID:            1,
					BankBin:           "970422",
					BankName:          "MB Bank",
					AccountNumber:     "111",
					AccountHolderName: "A",
				}
			},
			paramID:        "1",
			expectedStatus: http.StatusNotFound,
			expectedError:  "not_found",
		},
		{
			name: "non-existent account",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			setupRepo:      func(repo *testutil.MockBankAccountRepository) {},
			paramID:        "999",
			expectedStatus: http.StatusNotFound,
			expectedError:  "not_found",
		},
		{
			name: "invalid ID format",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			setupRepo:      func(repo *testutil.MockBankAccountRepository) {},
			paramID:        "abc",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid_id",
		},
		{
			name: "unauthorized",
			setupContext: func(c *gin.Context) {
				// Don't set userID
			},
			setupRepo:      func(repo *testutil.MockBankAccountRepository) {},
			paramID:        "1",
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "unauthorized",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockBankAccountRepo := testutil.NewMockBankAccountRepository()
			if tt.setupRepo != nil {
				tt.setupRepo(mockBankAccountRepo)
			}
			handler := NewBankAccountHandler(mockBankAccountRepo)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodDelete, "/bank-accounts/"+tt.paramID, nil)
			c.Params = gin.Params{{Key: "id", Value: tt.paramID}}
			tt.setupContext(c)

			handler.DeleteBankAccount(c)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d. Body: %s", tt.expectedStatus, w.Code, w.Body.String())
			}

			if tt.expectedError != "" {
				var errResp models.ErrorResponse
				if err := json.Unmarshal(w.Body.Bytes(), &errResp); err != nil {
					t.Fatalf("Failed to unmarshal error response: %v", err)
				}
				if errResp.Error != tt.expectedError {
					t.Errorf("Expected error '%s', got '%s'", tt.expectedError, errResp.Error)
				}
			}

			if tt.expectedStatus == http.StatusOK {
				// Verify account was actually deleted
				if _, exists := mockBankAccountRepo.Accounts[1]; exists {
					t.Error("Bank account should have been deleted from repository")
				}
			}
		})
	}
}
