package services

import (
	"context"
	"testing"
	"time"

	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/testutil"
)

// mockPayOSForPoller implements PayOSServicer for payout poller tests
type mockPayOSForPoller struct {
	payoutStatuses map[string]*PayoutStatusResponse
	getPayoutErr   error
}

func newMockPayOSForPoller() *mockPayOSForPoller {
	return &mockPayOSForPoller{
		payoutStatuses: make(map[string]*PayoutStatusResponse),
	}
}

func (m *mockPayOSForPoller) CreatePaymentLink(_ context.Context, _ int64, _ int, _, _, _ string) (*PaymentLinkResponse, error) {
	return nil, nil
}

func (m *mockPayOSForPoller) VerifyWebhookData(_ context.Context, _ map[string]interface{}) (map[string]interface{}, error) {
	return nil, nil
}

func (m *mockPayOSForPoller) ConfirmWebhook(_ context.Context, _ string) (string, error) {
	return "", nil
}

func (m *mockPayOSForPoller) CreatePayout(_ context.Context, _ string, _ int, _, _, _ string) (*PayoutResponse, error) {
	return nil, nil
}

func (m *mockPayOSForPoller) GetPayout(_ context.Context, payoutID string) (*PayoutStatusResponse, error) {
	if m.getPayoutErr != nil {
		return nil, m.getPayoutErr
	}
	status, exists := m.payoutStatuses[payoutID]
	if !exists {
		return &PayoutStatusResponse{ID: payoutID, State: "PROCESSING"}, nil
	}
	return status, nil
}

func TestPayoutPoller_NoPendingTransactions(t *testing.T) {
	txRepo := testutil.NewMockTransactionRepository()
	walletRepo := testutil.NewMockWalletRepository()
	walletTxRepo := testutil.NewMockWalletTransactionRepository()
	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	walletService := NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
	payos := newMockPayOSForPoller()

	poller := NewPayoutPoller(txRepo, walletService, payos, mockDB, time.Second)

	// Call pollPendingPayouts directly
	poller.pollPendingPayouts()

	// No transactions should have been modified
	testutil.AssertEqual(t, len(txRepo.Transactions), 0, "No transactions should exist")
}

func TestPayoutPoller_SucceededPayout(t *testing.T) {
	txRepo := testutil.NewMockTransactionRepository()
	walletRepo := testutil.NewMockWalletRepository()
	walletTxRepo := testutil.NewMockWalletTransactionRepository()
	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	// Create a wallet for the payer (needed for potential refunds)
	wallet := testutil.NewWalletBuilder().WithUserID(1).WithBalance(50000).Build()
	walletRepo.Wallets[wallet.ID] = wallet

	// Create pending withdrawal transaction with payout ID
	payoutID := "payout_123"
	tx := &models.Transaction{
		PayerID:       1,
		Amount:        30000,
		PlatformFee:   0,
		NetAmount:     30000,
		Type:          models.TransactionTypeWithdrawal,
		Status:        models.TransactionStatusPending,
		PayOSPayoutID: &payoutID,
		Description:   "Test withdrawal",
	}
	if err := txRepo.Create(context.Background(), tx); err != nil {
		t.Fatalf("Failed to create transaction: %v", err)
	}

	walletService := NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
	payos := newMockPayOSForPoller()
	payos.payoutStatuses[payoutID] = &PayoutStatusResponse{
		ID:    payoutID,
		State: "SUCCEEDED",
	}

	poller := NewPayoutPoller(txRepo, walletService, payos, mockDB, time.Second)
	poller.pollPendingPayouts()

	// Transaction should be updated to success
	updatedTx, err := txRepo.GetByID(context.Background(), tx.ID)
	if err != nil {
		t.Fatalf("Failed to get updated transaction: %v", err)
	}
	testutil.AssertEqual(t, updatedTx.Status, models.TransactionStatusSuccess, "Transaction status should be success")
	if updatedTx.CompletedAt == nil {
		t.Error("CompletedAt should be set")
	}

	// Wallet should NOT be refunded (success = money left the wallet)
	testutil.AssertEqual(t, wallet.Balance, int64(50000), "Wallet balance should remain unchanged on success")
}

func TestPayoutPoller_FailedPayout(t *testing.T) {
	txRepo := testutil.NewMockTransactionRepository()
	walletRepo := testutil.NewMockWalletRepository()
	walletTxRepo := testutil.NewMockWalletTransactionRepository()
	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	// Create a wallet for the payer that will receive the refund
	wallet := testutil.NewWalletBuilder().WithUserID(1).WithBalance(50000).Build()
	walletRepo.Wallets[wallet.ID] = wallet

	// Create pending withdrawal transaction
	payoutID := "payout_456"
	tx := &models.Transaction{
		PayerID:       1,
		Amount:        30000,
		PlatformFee:   0,
		NetAmount:     30000,
		Type:          models.TransactionTypeWithdrawal,
		Status:        models.TransactionStatusPending,
		PayOSPayoutID: &payoutID,
		Description:   "Test withdrawal",
	}
	if err := txRepo.Create(context.Background(), tx); err != nil {
		t.Fatalf("Failed to create transaction: %v", err)
	}

	walletService := NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
	payos := newMockPayOSForPoller()
	payos.payoutStatuses[payoutID] = &PayoutStatusResponse{
		ID:           payoutID,
		State:        "FAILED",
		ErrorMessage: "Bank rejected",
	}

	poller := NewPayoutPoller(txRepo, walletService, payos, mockDB, time.Second)
	poller.pollPendingPayouts()

	// Transaction should be updated to failed
	updatedTx, err := txRepo.GetByID(context.Background(), tx.ID)
	if err != nil {
		t.Fatalf("Failed to get updated transaction: %v", err)
	}
	testutil.AssertEqual(t, updatedTx.Status, models.TransactionStatusFailed, "Transaction status should be failed")
	if updatedTx.CompletedAt == nil {
		t.Error("CompletedAt should be set")
	}
	if updatedTx.FailureReason == nil {
		t.Error("FailureReason should be set")
	} else {
		testutil.AssertTrue(t, *updatedTx.FailureReason == "FAILED: Bank rejected", "FailureReason should contain state and message")
	}

	// Wallet should be refunded
	testutil.AssertEqual(t, wallet.Balance, int64(80000), "Wallet balance should be refunded (50000 + 30000)")
}

func TestPayoutPoller_ProcessingPayout(t *testing.T) {
	txRepo := testutil.NewMockTransactionRepository()
	walletRepo := testutil.NewMockWalletRepository()
	walletTxRepo := testutil.NewMockWalletTransactionRepository()
	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	wallet := testutil.NewWalletBuilder().WithUserID(1).WithBalance(50000).Build()
	walletRepo.Wallets[wallet.ID] = wallet

	// Create pending withdrawal transaction
	payoutID := "payout_789"
	tx := &models.Transaction{
		PayerID:       1,
		Amount:        30000,
		PlatformFee:   0,
		NetAmount:     30000,
		Type:          models.TransactionTypeWithdrawal,
		Status:        models.TransactionStatusPending,
		PayOSPayoutID: &payoutID,
		Description:   "Test withdrawal",
	}
	if err := txRepo.Create(context.Background(), tx); err != nil {
		t.Fatalf("Failed to create transaction: %v", err)
	}

	walletService := NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
	payos := newMockPayOSForPoller()
	payos.payoutStatuses[payoutID] = &PayoutStatusResponse{
		ID:    payoutID,
		State: "PROCESSING",
	}

	poller := NewPayoutPoller(txRepo, walletService, payos, mockDB, time.Second)
	poller.pollPendingPayouts()

	// Transaction should remain pending (no changes)
	updatedTx, err := txRepo.GetByID(context.Background(), tx.ID)
	if err != nil {
		t.Fatalf("Failed to get updated transaction: %v", err)
	}
	testutil.AssertEqual(t, updatedTx.Status, models.TransactionStatusPending, "Transaction status should remain pending")
	if updatedTx.CompletedAt != nil {
		t.Error("CompletedAt should remain nil for processing payout")
	}

	// Wallet should not be modified
	testutil.AssertEqual(t, wallet.Balance, int64(50000), "Wallet balance should remain unchanged")
}

func TestPayoutPoller_CancelledPayout(t *testing.T) {
	txRepo := testutil.NewMockTransactionRepository()
	walletRepo := testutil.NewMockWalletRepository()
	walletTxRepo := testutil.NewMockWalletTransactionRepository()
	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	wallet := testutil.NewWalletBuilder().WithUserID(1).WithBalance(70000).Build()
	walletRepo.Wallets[wallet.ID] = wallet

	payoutID := "payout_cancelled"
	tx := &models.Transaction{
		PayerID:       1,
		Amount:        20000,
		PlatformFee:   0,
		NetAmount:     20000,
		Type:          models.TransactionTypeWithdrawal,
		Status:        models.TransactionStatusPending,
		PayOSPayoutID: &payoutID,
		Description:   "Test withdrawal",
	}
	if err := txRepo.Create(context.Background(), tx); err != nil {
		t.Fatalf("Failed to create transaction: %v", err)
	}

	walletService := NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
	payos := newMockPayOSForPoller()
	payos.payoutStatuses[payoutID] = &PayoutStatusResponse{
		ID:    payoutID,
		State: "CANCELLED",
	}

	poller := NewPayoutPoller(txRepo, walletService, payos, mockDB, time.Second)
	poller.pollPendingPayouts()

	// Transaction should be updated to failed (CANCELLED maps to failed)
	updatedTx, err := txRepo.GetByID(context.Background(), tx.ID)
	if err != nil {
		t.Fatalf("Failed to get updated transaction: %v", err)
	}
	testutil.AssertEqual(t, updatedTx.Status, models.TransactionStatusFailed, "Transaction status should be failed for cancelled payout")

	// Wallet should be refunded
	testutil.AssertEqual(t, wallet.Balance, int64(90000), "Wallet balance should be refunded (70000 + 20000)")
}

func TestPayoutPoller_StartStop(t *testing.T) {
	txRepo := testutil.NewMockTransactionRepository()
	walletRepo := testutil.NewMockWalletRepository()
	walletTxRepo := testutil.NewMockWalletTransactionRepository()
	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	walletService := NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
	payos := newMockPayOSForPoller()

	poller := NewPayoutPoller(txRepo, walletService, payos, mockDB, 100*time.Millisecond)

	// Start should not panic
	poller.Start()

	// Give it time to tick at least once
	time.Sleep(250 * time.Millisecond)

	// Stop should not panic or deadlock
	poller.Stop()

	// Give goroutine time to exit
	time.Sleep(50 * time.Millisecond)
}
