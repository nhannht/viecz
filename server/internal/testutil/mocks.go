package testutil

import (
	"context"
	"errors"

	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
)

// MockWalletRepository is a mock implementation of repository.WalletRepository
type MockWalletRepository struct {
	Wallets map[int64]*models.Wallet
}

func NewMockWalletRepository() *MockWalletRepository {
	return &MockWalletRepository{
		Wallets: make(map[int64]*models.Wallet),
	}
}

func (m *MockWalletRepository) Create(ctx context.Context, wallet *models.Wallet) error {
	if err := wallet.Validate(); err != nil {
		return err
	}
	wallet.ID = int64(len(m.Wallets) + 1)
	m.Wallets[wallet.ID] = wallet
	return nil
}

func (m *MockWalletRepository) GetByID(ctx context.Context, id int64) (*models.Wallet, error) {
	wallet, exists := m.Wallets[id]
	if !exists {
		return nil, errors.New("wallet not found")
	}
	return wallet, nil
}

func (m *MockWalletRepository) GetByUserID(ctx context.Context, userID int64) (*models.Wallet, error) {
	for _, wallet := range m.Wallets {
		if wallet.UserID == userID {
			return wallet, nil
		}
	}
	return nil, errors.New("wallet not found for user")
}

func (m *MockWalletRepository) Update(ctx context.Context, wallet *models.Wallet) error {
	if err := wallet.Validate(); err != nil {
		return err
	}
	if _, exists := m.Wallets[wallet.ID]; !exists {
		return errors.New("wallet not found")
	}
	m.Wallets[wallet.ID] = wallet
	return nil
}

func (m *MockWalletRepository) GetOrCreate(ctx context.Context, userID int64) (*models.Wallet, error) {
	wallet, err := m.GetByUserID(ctx, userID)
	if err == nil {
		return wallet, nil
	}

	newWallet := &models.Wallet{
		UserID:         userID,
		Balance:        0,
		EscrowBalance:  0,
		TotalDeposited: 0,
		TotalWithdrawn: 0,
		TotalEarned:    0,
		TotalSpent:     0,
	}

	if err := m.Create(ctx, newWallet); err != nil {
		return nil, err
	}

	return newWallet, nil
}

// MockWalletTransactionRepository is a mock implementation of repository.WalletTransactionRepository
type MockWalletTransactionRepository struct {
	Transactions map[int64]*models.WalletTransaction
}

func NewMockWalletTransactionRepository() *MockWalletTransactionRepository {
	return &MockWalletTransactionRepository{
		Transactions: make(map[int64]*models.WalletTransaction),
	}
}

func (m *MockWalletTransactionRepository) Create(ctx context.Context, transaction *models.WalletTransaction) error {
	transaction.ID = int64(len(m.Transactions) + 1)
	m.Transactions[transaction.ID] = transaction
	return nil
}

func (m *MockWalletTransactionRepository) GetByID(ctx context.Context, id int64) (*models.WalletTransaction, error) {
	tx, exists := m.Transactions[id]
	if !exists {
		return nil, errors.New("wallet transaction not found")
	}
	return tx, nil
}

func (m *MockWalletTransactionRepository) GetByWalletID(ctx context.Context, walletID int64, limit, offset int) ([]*models.WalletTransaction, error) {
	var transactions []*models.WalletTransaction
	for _, tx := range m.Transactions {
		if tx.WalletID == walletID {
			transactions = append(transactions, tx)
		}
	}

	// Simple pagination
	start := offset
	if start > len(transactions) {
		start = len(transactions)
	}
	end := start + limit
	if limit == 0 || end > len(transactions) {
		end = len(transactions)
	}

	if start >= len(transactions) {
		return []*models.WalletTransaction{}, nil
	}

	return transactions[start:end], nil
}

func (m *MockWalletTransactionRepository) GetByTaskID(ctx context.Context, taskID int64) ([]*models.WalletTransaction, error) {
	var transactions []*models.WalletTransaction
	for _, tx := range m.Transactions {
		if tx.TaskID != nil && *tx.TaskID == taskID {
			transactions = append(transactions, tx)
		}
	}
	return transactions, nil
}

// MockTransactionRepository is a mock implementation of repository.TransactionRepository
type MockTransactionRepository struct {
	Transactions map[int64]*models.Transaction
}

func NewMockTransactionRepository() *MockTransactionRepository {
	return &MockTransactionRepository{
		Transactions: make(map[int64]*models.Transaction),
	}
}

func (m *MockTransactionRepository) Create(ctx context.Context, transaction *models.Transaction) error {
	transaction.ID = int64(len(m.Transactions) + 1)
	m.Transactions[transaction.ID] = transaction
	return nil
}

func (m *MockTransactionRepository) GetByID(ctx context.Context, id int64) (*models.Transaction, error) {
	tx, exists := m.Transactions[id]
	if !exists {
		return nil, errors.New("transaction not found")
	}
	return tx, nil
}

func (m *MockTransactionRepository) Update(ctx context.Context, transaction *models.Transaction) error {
	if _, exists := m.Transactions[transaction.ID]; !exists {
		return errors.New("transaction not found")
	}
	m.Transactions[transaction.ID] = transaction
	return nil
}

func (m *MockTransactionRepository) UpdateStatus(ctx context.Context, id int64, status models.TransactionStatus) error {
	tx, exists := m.Transactions[id]
	if !exists {
		return errors.New("transaction not found")
	}
	tx.Status = status
	return nil
}

func (m *MockTransactionRepository) GetByTaskID(ctx context.Context, taskID int64) ([]*models.Transaction, error) {
	var transactions []*models.Transaction
	for _, tx := range m.Transactions {
		if tx.TaskID != nil && *tx.TaskID == taskID {
			transactions = append(transactions, tx)
		}
	}
	return transactions, nil
}

func (m *MockTransactionRepository) GetByPayerID(ctx context.Context, payerID int64, limit, offset int) ([]*models.Transaction, error) {
	var transactions []*models.Transaction
	for _, tx := range m.Transactions {
		if tx.PayerID == payerID {
			transactions = append(transactions, tx)
		}
	}

	// Simple pagination
	start := offset
	if start > len(transactions) {
		start = len(transactions)
	}
	end := start + limit
	if limit == 0 || end > len(transactions) {
		end = len(transactions)
	}

	if start >= len(transactions) {
		return []*models.Transaction{}, nil
	}

	return transactions[start:end], nil
}

func (m *MockTransactionRepository) GetByPayeeID(ctx context.Context, payeeID int64, limit, offset int) ([]*models.Transaction, error) {
	var transactions []*models.Transaction
	for _, tx := range m.Transactions {
		if tx.PayeeID != nil && *tx.PayeeID == payeeID {
			transactions = append(transactions, tx)
		}
	}

	// Simple pagination
	start := offset
	if start > len(transactions) {
		start = len(transactions)
	}
	end := start + limit
	if limit == 0 || end > len(transactions) {
		end = len(transactions)
	}

	if start >= len(transactions) {
		return []*models.Transaction{}, nil
	}

	return transactions[start:end], nil
}

func (m *MockTransactionRepository) GetByOrderCode(ctx context.Context, orderCode int64) (*models.Transaction, error) {
	for _, tx := range m.Transactions {
		if tx.PayOSOrderCode != nil && *tx.PayOSOrderCode == orderCode {
			return tx, nil
		}
	}
	return nil, errors.New("transaction not found")
}

// MockTaskRepository is a mock implementation of repository.TaskRepository for wallet tests
type MockTaskRepository struct {
	Tasks map[int64]*models.Task
}

func NewMockTaskRepository() *MockTaskRepository {
	return &MockTaskRepository{
		Tasks: make(map[int64]*models.Task),
	}
}

func (m *MockTaskRepository) GetByID(ctx context.Context, id int64) (*models.Task, error) {
	task, exists := m.Tasks[id]
	if !exists {
		return nil, errors.New("task not found")
	}
	return task, nil
}

func (m *MockTaskRepository) Update(ctx context.Context, task *models.Task) error {
	if _, exists := m.Tasks[task.ID]; !exists {
		return errors.New("task not found")
	}
	m.Tasks[task.ID] = task
	return nil
}

func (m *MockTaskRepository) UpdateStatus(ctx context.Context, taskID int64, status models.TaskStatus) error {
	task, exists := m.Tasks[taskID]
	if !exists {
		return errors.New("task not found")
	}
	task.Status = status
	return nil
}

func (m *MockTaskRepository) Create(ctx context.Context, task *models.Task) error {
	task.ID = int64(len(m.Tasks) + 1)
	m.Tasks[task.ID] = task
	return nil
}

func (m *MockTaskRepository) Delete(ctx context.Context, id int64) error {
	if _, exists := m.Tasks[id]; !exists {
		return errors.New("task not found")
	}
	delete(m.Tasks, id)
	return nil
}

func (m *MockTaskRepository) List(ctx context.Context, filters repository.TaskFilters) ([]*models.Task, error) {
	var tasks []*models.Task
	for _, task := range m.Tasks {
		tasks = append(tasks, task)
	}
	return tasks, nil
}

func (m *MockTaskRepository) CountByFilters(ctx context.Context, filters repository.TaskFilters) (int, error) {
	return len(m.Tasks), nil
}

func (m *MockTaskRepository) AssignTasker(ctx context.Context, taskID, taskerID int64) error {
	task, exists := m.Tasks[taskID]
	if !exists {
		return errors.New("task not found")
	}
	task.TaskerID = &taskerID
	task.Status = models.TaskStatusInProgress
	return nil
}

// MockWalletService is a mock implementation for testing payment service
type MockWalletService struct {
	HoldInEscrowCalls      []HoldInEscrowCall
	ReleaseFromEscrowCalls []ReleaseFromEscrowCall
	RefundFromEscrowCalls  []RefundFromEscrowCall
	ShouldFail             bool
	FailError              error
}

type HoldInEscrowCall struct {
	UserID        int64
	Amount        int64
	TaskID        int64
	TransactionID *int64
}

type ReleaseFromEscrowCall struct {
	PayerID       int64
	PayeeID       int64
	Amount        int64
	TaskID        int64
	TransactionID *int64
}

type RefundFromEscrowCall struct {
	UserID        int64
	Amount        int64
	TaskID        int64
	TransactionID *int64
}

func NewMockWalletService() *MockWalletService {
	return &MockWalletService{
		HoldInEscrowCalls:      make([]HoldInEscrowCall, 0),
		ReleaseFromEscrowCalls: make([]ReleaseFromEscrowCall, 0),
		RefundFromEscrowCalls:  make([]RefundFromEscrowCall, 0),
	}
}

func (m *MockWalletService) HoldInEscrow(ctx context.Context, userID, amount, taskID int64, transactionID *int64) error {
	m.HoldInEscrowCalls = append(m.HoldInEscrowCalls, HoldInEscrowCall{
		UserID:        userID,
		Amount:        amount,
		TaskID:        taskID,
		TransactionID: transactionID,
	})
	if m.ShouldFail {
		return m.FailError
	}
	return nil
}

func (m *MockWalletService) ReleaseFromEscrow(ctx context.Context, payerID, payeeID, amount, taskID int64, transactionID *int64) error {
	m.ReleaseFromEscrowCalls = append(m.ReleaseFromEscrowCalls, ReleaseFromEscrowCall{
		PayerID:       payerID,
		PayeeID:       payeeID,
		Amount:        amount,
		TaskID:        taskID,
		TransactionID: transactionID,
	})
	if m.ShouldFail {
		return m.FailError
	}
	return nil
}

func (m *MockWalletService) RefundFromEscrow(ctx context.Context, userID, amount, taskID int64, transactionID *int64) error {
	m.RefundFromEscrowCalls = append(m.RefundFromEscrowCalls, RefundFromEscrowCall{
		UserID:        userID,
		Amount:        amount,
		TaskID:        taskID,
		TransactionID: transactionID,
	})
	if m.ShouldFail {
		return m.FailError
	}
	return nil
}

// MockPayOSService is a mock implementation for testing payment service
type MockPayOSService struct {
	CreatePaymentLinkCalls []CreatePaymentLinkCall
	CancelPaymentLinkCalls []CancelPaymentLinkCall
	ShouldFail             bool
	FailError              error
	PaymentLink            *PaymentLinkResult
}

type CreatePaymentLinkCall struct {
	OrderCode   int64
	Amount      int
	Description string
	ReturnURL   string
	CancelURL   string
}

type CancelPaymentLinkCall struct {
	OrderCode int64
	Reason    string
}

type PaymentLinkResult struct {
	CheckoutUrl   string
	PaymentLinkId string
	OrderCode     int64
}

func NewMockPayOSService() *MockPayOSService {
	return &MockPayOSService{
		CreatePaymentLinkCalls: make([]CreatePaymentLinkCall, 0),
		CancelPaymentLinkCalls: make([]CancelPaymentLinkCall, 0),
		PaymentLink: &PaymentLinkResult{
			CheckoutUrl:   "https://pay.payos.vn/test-checkout",
			PaymentLinkId: "test-payment-link-id",
			OrderCode:     12345,
		},
	}
}

func (m *MockPayOSService) CreatePaymentLink(ctx context.Context, orderCode int64, amount int, description, returnURL, cancelURL string) (*PaymentLinkResult, error) {
	m.CreatePaymentLinkCalls = append(m.CreatePaymentLinkCalls, CreatePaymentLinkCall{
		OrderCode:   orderCode,
		Amount:      amount,
		Description: description,
		ReturnURL:   returnURL,
		CancelURL:   cancelURL,
	})
	if m.ShouldFail {
		return nil, m.FailError
	}
	return m.PaymentLink, nil
}

func (m *MockPayOSService) CancelPaymentLink(ctx context.Context, orderCode int64, reason string) (*PaymentLinkResult, error) {
	m.CancelPaymentLinkCalls = append(m.CancelPaymentLinkCalls, CancelPaymentLinkCall{
		OrderCode: orderCode,
		Reason:    reason,
	})
	if m.ShouldFail {
		return nil, m.FailError
	}
	return m.PaymentLink, nil
}
