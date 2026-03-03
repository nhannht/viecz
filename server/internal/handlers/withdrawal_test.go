package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/services"
	"viecz.vieczserver/internal/testutil"
)

// mockPayOSForWithdrawal implements services.PayOSServicer for withdrawal handler tests
type mockPayOSForWithdrawal struct {
	createPayoutResp *services.PayoutResponse
	createPayoutErr  error
}

func (m *mockPayOSForWithdrawal) CreatePaymentLink(_ context.Context, _ int64, _ int, _, _, _ string) (*services.PaymentLinkResponse, error) {
	return &services.PaymentLinkResponse{CheckoutUrl: "https://example.com/pay"}, nil
}

func (m *mockPayOSForWithdrawal) VerifyWebhookData(_ context.Context, _ map[string]interface{}) (map[string]interface{}, error) {
	return nil, nil
}

func (m *mockPayOSForWithdrawal) ConfirmWebhook(_ context.Context, _ string) (string, error) {
	return "", nil
}

func (m *mockPayOSForWithdrawal) CreatePayout(_ context.Context, _ string, _ int, _, _, _ string) (*services.PayoutResponse, error) {
	if m.createPayoutErr != nil {
		return nil, m.createPayoutErr
	}
	return m.createPayoutResp, nil
}

func (m *mockPayOSForWithdrawal) GetPayout(_ context.Context, _ string) (*services.PayoutStatusResponse, error) {
	return &services.PayoutStatusResponse{State: "PROCESSING"}, nil
}

func (m *mockPayOSForWithdrawal) CancelPaymentLink(_ context.Context, _ int64, _ string) error {
	return nil
}

func newWithdrawalHandler(
	walletService *services.WalletService,
	payos services.PayOSServicer,
	txRepo *testutil.MockTransactionRepository,
	taskRepo *testutil.MockTaskRepository,
	bankAccountRepo *testutil.MockBankAccountRepository,
) *WalletHandler {
	return &WalletHandler{
		walletService:   walletService,
		payosService:    payos,
		transactionRepo: txRepo,
		taskRepo:        taskRepo,
		bankAccountRepo: bankAccountRepo,
		minWithdrawal:   10000,
		maxWithdrawal:   200000,
	}
}

func TestHandleWithdrawal_ValidRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)

	walletRepo := testutil.NewMockWalletRepository()
	walletTxRepo := testutil.NewMockWalletTransactionRepository()
	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	// Create wallet with sufficient balance
	wallet := testutil.NewWalletBuilder().WithUserID(1).WithBalance(100000).Build()
	walletRepo.Wallets[wallet.ID] = wallet

	txRepo := testutil.NewMockTransactionRepository()
	taskRepo := testutil.NewMockTaskRepository()
	bankAccountRepo := testutil.NewMockBankAccountRepository()
	bankAccountRepo.Accounts[1] = &models.BankAccount{
		ID:                1,
		UserID:            1,
		BankBin:           "970422",
		BankName:          "MB Bank",
		AccountNumber:     "0123456789",
		AccountHolderName: "NGUYEN VAN A",
	}

	walletService := services.NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
	payos := &mockPayOSForWithdrawal{
		createPayoutResp: &services.PayoutResponse{
			ID:          "payout_test_123",
			ReferenceID: "wd_1_123",
		},
	}

	handler := newWithdrawalHandler(walletService, payos, txRepo, taskRepo, bankAccountRepo)

	body, _ := json.Marshal(WithdrawalRequest{
		Amount:        50000,
		BankAccountID: 1,
	})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/wallet/withdraw", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("user_id", int64(1))

	handler.HandleWithdrawal(c)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}

	var resp WithdrawalResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}
	if resp.TransactionID == 0 {
		t.Error("Expected non-zero transaction ID")
	}
	if resp.Status != "pending" {
		t.Errorf("Expected status 'pending', got '%s'", resp.Status)
	}

	// Verify wallet was debited
	updatedWallet, _ := walletRepo.GetByUserID(context.Background(), 1)
	if updatedWallet.Balance != 50000 {
		t.Errorf("Expected wallet balance 50000, got %d", updatedWallet.Balance)
	}
}

func TestHandleWithdrawal_AmountBelowMinimum(t *testing.T) {
	gin.SetMode(gin.TestMode)

	walletRepo := testutil.NewMockWalletRepository()
	walletTxRepo := testutil.NewMockWalletTransactionRepository()
	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	wallet := testutil.NewWalletBuilder().WithUserID(1).WithBalance(100000).Build()
	walletRepo.Wallets[wallet.ID] = wallet

	txRepo := testutil.NewMockTransactionRepository()
	taskRepo := testutil.NewMockTaskRepository()
	bankAccountRepo := testutil.NewMockBankAccountRepository()

	walletService := services.NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
	payos := &mockPayOSForWithdrawal{}

	handler := newWithdrawalHandler(walletService, payos, txRepo, taskRepo, bankAccountRepo)

	body, _ := json.Marshal(WithdrawalRequest{
		Amount:        5000, // Below minimum of 10000
		BankAccountID: 1,
	})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/wallet/withdraw", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("user_id", int64(1))

	handler.HandleWithdrawal(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d. Body: %s", w.Code, w.Body.String())
	}

	var errResp models.ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &errResp); err != nil {
		t.Fatalf("Failed to unmarshal error response: %v", err)
	}
	if errResp.Error != "invalid_amount" {
		t.Errorf("Expected error 'invalid_amount', got '%s'", errResp.Error)
	}
}

func TestHandleWithdrawal_AmountAboveMaximum(t *testing.T) {
	gin.SetMode(gin.TestMode)

	walletRepo := testutil.NewMockWalletRepository()
	walletTxRepo := testutil.NewMockWalletTransactionRepository()
	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	wallet := testutil.NewWalletBuilder().WithUserID(1).WithBalance(500000).Build()
	walletRepo.Wallets[wallet.ID] = wallet

	txRepo := testutil.NewMockTransactionRepository()
	taskRepo := testutil.NewMockTaskRepository()
	bankAccountRepo := testutil.NewMockBankAccountRepository()

	walletService := services.NewWalletService(walletRepo, walletTxRepo, mockDB, 500000)
	payos := &mockPayOSForWithdrawal{}

	handler := newWithdrawalHandler(walletService, payos, txRepo, taskRepo, bankAccountRepo)

	body, _ := json.Marshal(WithdrawalRequest{
		Amount:        300000, // Above maximum of 200000
		BankAccountID: 1,
	})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/wallet/withdraw", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("user_id", int64(1))

	handler.HandleWithdrawal(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d. Body: %s", w.Code, w.Body.String())
	}

	var errResp models.ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &errResp); err != nil {
		t.Fatalf("Failed to unmarshal error response: %v", err)
	}
	if errResp.Error != "invalid_amount" {
		t.Errorf("Expected error 'invalid_amount', got '%s'", errResp.Error)
	}
}

func TestHandleWithdrawal_InsufficientBalance(t *testing.T) {
	gin.SetMode(gin.TestMode)

	walletRepo := testutil.NewMockWalletRepository()
	walletTxRepo := testutil.NewMockWalletTransactionRepository()
	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	// Wallet with only 20000 balance
	wallet := testutil.NewWalletBuilder().WithUserID(1).WithBalance(20000).Build()
	walletRepo.Wallets[wallet.ID] = wallet

	txRepo := testutil.NewMockTransactionRepository()
	taskRepo := testutil.NewMockTaskRepository()
	bankAccountRepo := testutil.NewMockBankAccountRepository()

	walletService := services.NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
	payos := &mockPayOSForWithdrawal{}

	handler := newWithdrawalHandler(walletService, payos, txRepo, taskRepo, bankAccountRepo)

	body, _ := json.Marshal(WithdrawalRequest{
		Amount:        50000, // More than available 20000
		BankAccountID: 1,
	})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/wallet/withdraw", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("user_id", int64(1))

	handler.HandleWithdrawal(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d. Body: %s", w.Code, w.Body.String())
	}

	var errResp models.ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &errResp); err != nil {
		t.Fatalf("Failed to unmarshal error response: %v", err)
	}
	if errResp.Error != "insufficient_balance" {
		t.Errorf("Expected error 'insufficient_balance', got '%s'", errResp.Error)
	}
}

func TestHandleWithdrawal_InvalidBankAccount(t *testing.T) {
	gin.SetMode(gin.TestMode)

	walletRepo := testutil.NewMockWalletRepository()
	walletTxRepo := testutil.NewMockWalletTransactionRepository()
	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	wallet := testutil.NewWalletBuilder().WithUserID(1).WithBalance(100000).Build()
	walletRepo.Wallets[wallet.ID] = wallet

	txRepo := testutil.NewMockTransactionRepository()
	taskRepo := testutil.NewMockTaskRepository()
	bankAccountRepo := testutil.NewMockBankAccountRepository()
	// No bank accounts in repo

	walletService := services.NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
	payos := &mockPayOSForWithdrawal{}

	handler := newWithdrawalHandler(walletService, payos, txRepo, taskRepo, bankAccountRepo)

	body, _ := json.Marshal(WithdrawalRequest{
		Amount:        50000,
		BankAccountID: 999, // Non-existent bank account
	})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/wallet/withdraw", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("user_id", int64(1))

	handler.HandleWithdrawal(c)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status 404, got %d. Body: %s", w.Code, w.Body.String())
	}

	var errResp models.ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &errResp); err != nil {
		t.Fatalf("Failed to unmarshal error response: %v", err)
	}
	if errResp.Error != "not_found" {
		t.Errorf("Expected error 'not_found', got '%s'", errResp.Error)
	}
}

func TestHandleWithdrawal_Unauthorized(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &WalletHandler{}

	body, _ := json.Marshal(WithdrawalRequest{
		Amount:        50000,
		BankAccountID: 1,
	})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/wallet/withdraw", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	// Don't set user_id

	handler.HandleWithdrawal(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status 401, got %d. Body: %s", w.Code, w.Body.String())
	}
}

func TestHandleWithdrawal_AmountNotMultipleOf1000(t *testing.T) {
	gin.SetMode(gin.TestMode)

	walletRepo := testutil.NewMockWalletRepository()
	walletTxRepo := testutil.NewMockWalletTransactionRepository()
	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	wallet := testutil.NewWalletBuilder().WithUserID(1).WithBalance(100000).Build()
	walletRepo.Wallets[wallet.ID] = wallet

	txRepo := testutil.NewMockTransactionRepository()
	taskRepo := testutil.NewMockTaskRepository()
	bankAccountRepo := testutil.NewMockBankAccountRepository()

	walletService := services.NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
	payos := &mockPayOSForWithdrawal{}

	handler := newWithdrawalHandler(walletService, payos, txRepo, taskRepo, bankAccountRepo)

	body, _ := json.Marshal(WithdrawalRequest{
		Amount:        10500, // Not a multiple of 1000
		BankAccountID: 1,
	})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/wallet/withdraw", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("user_id", int64(1))

	handler.HandleWithdrawal(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d. Body: %s", w.Code, w.Body.String())
	}

	var errResp models.ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &errResp); err != nil {
		t.Fatalf("Failed to unmarshal error response: %v", err)
	}
	if errResp.Error != "invalid_amount" {
		t.Errorf("Expected error 'invalid_amount', got '%s'", errResp.Error)
	}
}

func TestHandleWithdrawal_PayOSPayoutFailed(t *testing.T) {
	gin.SetMode(gin.TestMode)

	walletRepo := testutil.NewMockWalletRepository()
	walletTxRepo := testutil.NewMockWalletTransactionRepository()
	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	wallet := testutil.NewWalletBuilder().WithUserID(1).WithBalance(100000).Build()
	walletRepo.Wallets[wallet.ID] = wallet

	txRepo := testutil.NewMockTransactionRepository()
	taskRepo := testutil.NewMockTaskRepository()
	bankAccountRepo := testutil.NewMockBankAccountRepository()
	bankAccountRepo.Accounts[1] = &models.BankAccount{
		ID:                1,
		UserID:            1,
		BankBin:           "970422",
		BankName:          "MB Bank",
		AccountNumber:     "0123456789",
		AccountHolderName: "NGUYEN VAN A",
	}

	walletService := services.NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
	payos := &mockPayOSForWithdrawal{
		createPayoutErr: errors.New("PayOS API error"),
	}

	handler := newWithdrawalHandler(walletService, payos, txRepo, taskRepo, bankAccountRepo)

	body, _ := json.Marshal(WithdrawalRequest{
		Amount:        50000,
		BankAccountID: 1,
	})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/wallet/withdraw", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("user_id", int64(1))

	handler.HandleWithdrawal(c)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status 500, got %d. Body: %s", w.Code, w.Body.String())
	}

	var errResp models.ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &errResp); err != nil {
		t.Fatalf("Failed to unmarshal error response: %v", err)
	}
	if errResp.Error != "payout_failed" {
		t.Errorf("Expected error 'payout_failed', got '%s'", errResp.Error)
	}

	// Wallet balance should NOT have been debited (payout failed before wallet debit)
	updatedWallet, _ := walletRepo.GetByUserID(context.Background(), 1)
	if updatedWallet.Balance != 100000 {
		t.Errorf("Expected wallet balance 100000 (unchanged), got %d", updatedWallet.Balance)
	}
}
