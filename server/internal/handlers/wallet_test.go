package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/services"
	"viecz.vieczserver/internal/testutil"
)

func TestWalletHandler_GetWallet(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		setupContext   func(*gin.Context)
		mockWallet     *models.Wallet
		mockError      error
		expectedStatus int
		expectedError  string
	}{
		{
			name: "successful wallet retrieval",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			mockWallet:     testutil.NewWalletBuilder().WithUserID(1).WithBalance(100000).Build(),
			mockError:      nil,
			expectedStatus: http.StatusOK,
		},
		{
			name: "unauthorized - no user ID",
			setupContext: func(c *gin.Context) {
				// Don't set userID
			},
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "unauthorized",
		},
		{
			name: "wallet creation for new user",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(999)) // Non-existent user - wallet will be created
			},
			mockError:      nil,
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup mock wallet service
			mockWalletRepo := testutil.NewMockWalletRepository()
			mockWalletTxRepo := testutil.NewMockWalletTransactionRepository()

			if tt.mockWallet != nil {
				mockWalletRepo.Wallets[tt.mockWallet.ID] = tt.mockWallet
			}

			if tt.mockError != nil {
				// Inject error by using a custom wallet service that returns the error
				// For simplicity, we'll skip the wallet in the repo to trigger "not found"
				// or we create a failing scenario
			}

			// Create mock GORM DB
			mockDB, cleanup, err := testutil.NewMockGormDB()
			if err != nil {
				t.Fatalf("Failed to create mock GORM DB: %v", err)
			}
			defer cleanup()

			walletService := services.NewWalletService(mockWalletRepo, mockWalletTxRepo, mockDB)
			handler := NewWalletHandler(walletService)

			// Create test request
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodGet, "/wallet", nil)
			tt.setupContext(c)

			// Execute handler
			handler.GetWallet(c)

			// Verify response
			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
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

			if tt.mockWallet != nil && w.Code == http.StatusOK {
				var wallet models.Wallet
				if err := json.Unmarshal(w.Body.Bytes(), &wallet); err != nil {
					t.Fatalf("Failed to unmarshal wallet response: %v", err)
				}
				if wallet.UserID != tt.mockWallet.UserID {
					t.Errorf("Expected userID %d, got %d", tt.mockWallet.UserID, wallet.UserID)
				}
				if wallet.Balance != tt.mockWallet.Balance {
					t.Errorf("Expected balance %d, got %d", tt.mockWallet.Balance, wallet.Balance)
				}
			}
		})
	}
}

func TestWalletHandler_Deposit(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		setupContext   func(*gin.Context)
		requestBody    interface{}
		mockWallet     *models.Wallet
		expectedStatus int
		expectedError  string
	}{
		{
			name: "successful deposit",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			requestBody: DepositRequest{
				Amount:      50000,
				Description: "Test deposit",
			},
			mockWallet:     testutil.NewWalletBuilder().WithUserID(1).WithBalance(0).Build(),
			expectedStatus: http.StatusOK,
		},
		{
			name: "successful deposit with default description",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			requestBody: DepositRequest{
				Amount: 50000,
				// No description - should use default
			},
			mockWallet:     testutil.NewWalletBuilder().WithUserID(1).WithBalance(0).Build(),
			expectedStatus: http.StatusOK,
		},
		{
			name: "unauthorized - no user ID",
			setupContext: func(c *gin.Context) {
				// Don't set userID
			},
			requestBody: DepositRequest{
				Amount: 50000,
			},
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "unauthorized",
		},
		{
			name: "invalid request - negative amount",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			requestBody: DepositRequest{
				Amount: -1000,
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid_request",
		},
		{
			name: "invalid request - zero amount",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			requestBody: DepositRequest{
				Amount: 0,
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid_request",
		},
		{
			name: "invalid request - malformed JSON",
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
			// Setup mock wallet service
			mockWalletRepo := testutil.NewMockWalletRepository()
			mockWalletTxRepo := testutil.NewMockWalletTransactionRepository()

			if tt.mockWallet != nil {
				mockWalletRepo.Wallets[tt.mockWallet.ID] = tt.mockWallet
			}

			// Create mock GORM DB
			mockDB, cleanup, err := testutil.NewMockGormDB()
			if err != nil {
				t.Fatalf("Failed to create mock GORM DB: %v", err)
			}
			defer cleanup()

			walletService := services.NewWalletService(mockWalletRepo, mockWalletTxRepo, mockDB)
			handler := NewWalletHandler(walletService)

			// Create request body
			var bodyBytes []byte
			if str, ok := tt.requestBody.(string); ok {
				bodyBytes = []byte(str)
			} else {
				bodyBytes, _ = json.Marshal(tt.requestBody)
			}

			// Create test request
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodPost, "/wallet/deposit", bytes.NewReader(bodyBytes))
			c.Request.Header.Set("Content-Type", "application/json")
			tt.setupContext(c)

			// Execute handler
			handler.Deposit(c)

			// Verify response
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
		})
	}
}

func TestWalletHandler_GetTransactionHistory(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name             string
		setupContext     func(*gin.Context)
		queryParams      map[string]string
		mockWallet       *models.Wallet
		mockTransactions []*models.WalletTransaction
		expectedStatus   int
		expectedError    string
		expectedCount    int
	}{
		{
			name: "successful retrieval with default pagination",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			queryParams: map[string]string{},
			mockWallet:  testutil.NewWalletBuilder().WithID(1).WithUserID(1).Build(),
			mockTransactions: []*models.WalletTransaction{
				{ID: 1, WalletID: 1, Amount: 10000, Type: models.WalletTransactionTypeDeposit},
				{ID: 2, WalletID: 1, Amount: 20000, Type: models.WalletTransactionTypeDeposit},
			},
			expectedStatus: http.StatusOK,
			expectedCount:  2,
		},
		{
			name: "successful retrieval with custom limit",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			queryParams: map[string]string{
				"limit":  "1",
				"offset": "0",
			},
			mockWallet: testutil.NewWalletBuilder().WithID(1).WithUserID(1).Build(),
			mockTransactions: []*models.WalletTransaction{
				{ID: 1, WalletID: 1, Amount: 10000, Type: models.WalletTransactionTypeDeposit},
				{ID: 2, WalletID: 1, Amount: 20000, Type: models.WalletTransactionTypeDeposit},
			},
			expectedStatus: http.StatusOK,
			expectedCount:  1,
		},
		{
			name: "successful retrieval with offset",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			queryParams: map[string]string{
				"limit":  "10",
				"offset": "1",
			},
			mockWallet: testutil.NewWalletBuilder().WithID(1).WithUserID(1).Build(),
			mockTransactions: []*models.WalletTransaction{
				{ID: 1, WalletID: 1, Amount: 10000, Type: models.WalletTransactionTypeDeposit},
				{ID: 2, WalletID: 1, Amount: 20000, Type: models.WalletTransactionTypeDeposit},
			},
			expectedStatus: http.StatusOK,
			expectedCount:  1,
		},
		{
			name: "invalid limit parameter - fallback to default",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			queryParams: map[string]string{
				"limit": "invalid",
			},
			mockWallet:     testutil.NewWalletBuilder().WithUserID(1).Build(),
			expectedStatus: http.StatusOK,
			expectedCount:  0,
		},
		{
			name: "negative limit parameter - fallback to default",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			queryParams: map[string]string{
				"limit": "-1",
			},
			mockWallet:     testutil.NewWalletBuilder().WithUserID(1).Build(),
			expectedStatus: http.StatusOK,
			expectedCount:  0,
		},
		{
			name: "unauthorized - no user ID",
			setupContext: func(c *gin.Context) {
				// Don't set userID
			},
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "unauthorized",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup mock wallet service
			mockWalletRepo := testutil.NewMockWalletRepository()
			mockWalletTxRepo := testutil.NewMockWalletTransactionRepository()

			if tt.mockWallet != nil {
				mockWalletRepo.Wallets[tt.mockWallet.ID] = tt.mockWallet
			}

			for _, tx := range tt.mockTransactions {
				mockWalletTxRepo.Transactions[tx.ID] = tx
			}

			// Create mock GORM DB
			mockDB, cleanup, err := testutil.NewMockGormDB()
			if err != nil {
				t.Fatalf("Failed to create mock GORM DB: %v", err)
			}
			defer cleanup()

			walletService := services.NewWalletService(mockWalletRepo, mockWalletTxRepo, mockDB)
			handler := NewWalletHandler(walletService)

			// Create test request with query params
			url := "/wallet/transactions"
			if len(tt.queryParams) > 0 {
				url += "?"
				first := true
				for k, v := range tt.queryParams {
					if !first {
						url += "&"
					}
					url += k + "=" + v
					first = false
				}
			}

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodGet, url, nil)
			tt.setupContext(c)

			// Execute handler
			handler.GetTransactionHistory(c)

			// Verify response
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
				var transactions []*models.WalletTransaction
				if err := json.Unmarshal(w.Body.Bytes(), &transactions); err != nil {
					t.Fatalf("Failed to unmarshal transactions response: %v", err)
				}
				if len(transactions) != tt.expectedCount {
					t.Errorf("Expected %d transactions, got %d", tt.expectedCount, len(transactions))
				}
			}
		})
	}
}

// Mock wallet service for testing error scenarios
type mockWalletServiceWithError struct {
	getOrCreateError          error
	depositError              error
	getTransactionHistoryError error
}

func (m *mockWalletServiceWithError) GetOrCreateWallet(ctx context.Context, userID int64) (*models.Wallet, error) {
	return nil, m.getOrCreateError
}

func (m *mockWalletServiceWithError) Deposit(ctx context.Context, userID, amount int64, description string) error {
	return m.depositError
}

func (m *mockWalletServiceWithError) GetTransactionHistory(ctx context.Context, userID int64, limit, offset int) ([]*models.WalletTransaction, error) {
	return nil, m.getTransactionHistoryError
}

func (m *mockWalletServiceWithError) HoldInEscrow(ctx context.Context, userID, amount, taskID int64, transactionID *int64) error {
	return nil
}

func (m *mockWalletServiceWithError) ReleaseFromEscrow(ctx context.Context, payerID, payeeID, amount, taskID int64, transactionID *int64) error {
	return nil
}

func (m *mockWalletServiceWithError) RefundFromEscrow(ctx context.Context, userID, amount, taskID int64, transactionID *int64) error {
	return nil
}
