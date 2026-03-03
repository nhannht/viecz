package testutil

import (
	"context"
	"errors"

	"gorm.io/gorm"
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

func (m *MockWalletRepository) GetByUserIDForUpdate(ctx context.Context, tx *gorm.DB, userID int64) (*models.Wallet, error) {
	return m.GetByUserID(ctx, userID)
}

func (m *MockWalletRepository) GetOrCreateForUpdate(ctx context.Context, tx *gorm.DB, userID int64) (*models.Wallet, error) {
	return m.GetOrCreate(ctx, userID)
}

func (m *MockWalletRepository) UpdateWithTx(ctx context.Context, tx *gorm.DB, wallet *models.Wallet) error {
	return m.Update(ctx, wallet)
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

func (m *MockWalletTransactionRepository) CreateWithTx(ctx context.Context, tx *gorm.DB, transaction *models.WalletTransaction) error {
	return m.Create(ctx, transaction)
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

func (m *MockTransactionRepository) CreateWithTx(ctx context.Context, tx *gorm.DB, transaction *models.Transaction) error {
	return m.Create(ctx, transaction)
}

func (m *MockTransactionRepository) GetByTaskIDWithTx(ctx context.Context, tx *gorm.DB, taskID int64) ([]*models.Transaction, error) {
	return m.GetByTaskID(ctx, taskID)
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

func (m *MockTaskRepository) GetByIDForUpdate(ctx context.Context, tx *gorm.DB, id int64) (*models.Task, error) {
	return m.GetByID(ctx, id)
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

func (m *MockTaskRepository) UpdateStatusWithTx(ctx context.Context, tx *gorm.DB, taskID int64, status models.TaskStatus) error {
	return m.UpdateStatus(ctx, taskID, status)
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

func (m *MockTaskRepository) SumOpenTaskPricesByRequester(ctx context.Context, requesterID int64) (int64, error) {
	var total int64
	for _, task := range m.Tasks {
		if task.RequesterID == requesterID && task.Status == models.TaskStatusOpen {
			total += task.Price
		}
	}
	return total, nil
}

func (m *MockTaskRepository) AssignTasker(ctx context.Context, taskID, taskerID int64) error {
	task, exists := m.Tasks[taskID]
	if !exists {
		return errors.New("task not found")
	}
	task.TaskerID = &taskerID
	return nil
}

func (m *MockTaskRepository) UpdateWithTx(ctx context.Context, tx *gorm.DB, task *models.Task) error {
	return m.Update(ctx, task)
}

func (m *MockTaskRepository) GetByIDs(ctx context.Context, ids []int64) ([]*models.Task, error) {
	var tasks []*models.Task
	for _, id := range ids {
		if task, exists := m.Tasks[id]; exists {
			tasks = append(tasks, task)
		}
	}
	return tasks, nil
}

// MockTaskApplicationRepository is a mock implementation of repository.TaskApplicationRepository
type MockTaskApplicationRepository struct {
	Applications map[int64]*models.TaskApplication
}

func NewMockTaskApplicationRepository() *MockTaskApplicationRepository {
	return &MockTaskApplicationRepository{
		Applications: make(map[int64]*models.TaskApplication),
	}
}

func (m *MockTaskApplicationRepository) Create(ctx context.Context, app *models.TaskApplication) error {
	app.ID = int64(len(m.Applications) + 1)
	m.Applications[app.ID] = app
	return nil
}

func (m *MockTaskApplicationRepository) GetByID(ctx context.Context, id int64) (*models.TaskApplication, error) {
	app, exists := m.Applications[id]
	if !exists {
		return nil, errors.New("application not found")
	}
	return app, nil
}

func (m *MockTaskApplicationRepository) GetByTaskID(ctx context.Context, taskID int64) ([]*models.TaskApplication, error) {
	var apps []*models.TaskApplication
	for _, app := range m.Applications {
		if app.TaskID == taskID {
			apps = append(apps, app)
		}
	}
	return apps, nil
}

func (m *MockTaskApplicationRepository) GetByTaskerID(ctx context.Context, taskerID int64) ([]*models.TaskApplication, error) {
	var apps []*models.TaskApplication
	for _, app := range m.Applications {
		if app.TaskerID == taskerID {
			apps = append(apps, app)
		}
	}
	return apps, nil
}

func (m *MockTaskApplicationRepository) UpdateStatus(ctx context.Context, id int64, status models.ApplicationStatus) error {
	app, exists := m.Applications[id]
	if !exists {
		return errors.New("application not found")
	}
	app.Status = status
	return nil
}

func (m *MockTaskApplicationRepository) Delete(ctx context.Context, id int64) error {
	if _, exists := m.Applications[id]; !exists {
		return errors.New("application not found")
	}
	delete(m.Applications, id)
	return nil
}

func (m *MockTaskApplicationRepository) ExistsByTaskAndTasker(ctx context.Context, taskID, taskerID int64) (bool, error) {
	for _, app := range m.Applications {
		if app.TaskID == taskID && app.TaskerID == taskerID {
			return true, nil
		}
	}
	return false, nil
}

func (m *MockTaskApplicationRepository) CountByTaskIDs(ctx context.Context, taskIDs []int64) (map[int64]int64, error) {
	result := make(map[int64]int64)
	for _, app := range m.Applications {
		for _, id := range taskIDs {
			if app.TaskID == id {
				result[id]++
			}
		}
	}
	return result, nil
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

// MockPayOSService is a mock implementation for testing payment service.
// Note: This mock is used by services/payment_test.go which creates PaymentService
// directly with mockMode=true. For handler-level tests that need the PayOSServicer
// interface, create a mock in the test file that returns *services.PaymentLinkResponse.
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

func (m *MockPayOSService) CancelPaymentLink(ctx context.Context, orderCode int64, reason string) error {
	m.CancelPaymentLinkCalls = append(m.CancelPaymentLinkCalls, CancelPaymentLinkCall{
		OrderCode: orderCode,
		Reason:    reason,
	})
	if m.ShouldFail {
		return m.FailError
	}
	return nil
}

// MockNotificationRepository is a mock implementation of repository.NotificationRepository
type MockNotificationRepository struct {
	Notifications map[int64]*models.Notification
}

func NewMockNotificationRepository() *MockNotificationRepository {
	return &MockNotificationRepository{
		Notifications: make(map[int64]*models.Notification),
	}
}

func (m *MockNotificationRepository) Create(ctx context.Context, notification *models.Notification) error {
	notification.ID = int64(len(m.Notifications) + 1)
	m.Notifications[notification.ID] = notification
	return nil
}

func (m *MockNotificationRepository) GetByUserID(ctx context.Context, userID int64, limit, offset int) ([]*models.Notification, int64, error) {
	var notifications []*models.Notification
	for _, n := range m.Notifications {
		if n.UserID == userID {
			notifications = append(notifications, n)
		}
	}
	return notifications, int64(len(notifications)), nil
}

func (m *MockNotificationRepository) GetUnreadCountByUserID(ctx context.Context, userID int64) (int64, error) {
	var count int64
	for _, n := range m.Notifications {
		if n.UserID == userID && !n.IsRead {
			count++
		}
	}
	return count, nil
}

func (m *MockNotificationRepository) MarkAsRead(ctx context.Context, id, userID int64) error {
	n, exists := m.Notifications[id]
	if !exists || n.UserID != userID {
		return errors.New("notification not found")
	}
	n.IsRead = true
	return nil
}

func (m *MockNotificationRepository) MarkAllAsReadByUserID(ctx context.Context, userID int64) error {
	for _, n := range m.Notifications {
		if n.UserID == userID {
			n.IsRead = true
		}
	}
	return nil
}

func (m *MockNotificationRepository) Delete(ctx context.Context, id, userID int64) error {
	n, exists := m.Notifications[id]
	if !exists || n.UserID != userID {
		return errors.New("notification not found")
	}
	delete(m.Notifications, id)
	return nil
}

// GetPendingPayouts returns pending payout transactions
func (m *MockTransactionRepository) GetPendingPayouts(ctx context.Context) ([]*models.Transaction, error) {
	var pending []*models.Transaction
	for _, tx := range m.Transactions {
		if tx.Status == models.TransactionStatusPending && tx.Type == models.TransactionTypeWithdrawal {
			pending = append(pending, tx)
		}
	}
	return pending, nil
}

// MockPaymentReferenceRepository is a mock implementation of repository.PaymentReferenceRepository.
// Uses an in-memory map keyed by reference string.
type MockPaymentReferenceRepository struct {
	References map[string]*models.PaymentReference
}

func NewMockPaymentReferenceRepository() *MockPaymentReferenceRepository {
	return &MockPaymentReferenceRepository{
		References: make(map[string]*models.PaymentReference),
	}
}

func (m *MockPaymentReferenceRepository) CreateIfNotExists(ctx context.Context, ref *models.PaymentReference) (bool, error) {
	if _, exists := m.References[ref.Reference]; exists {
		return false, nil
	}
	m.References[ref.Reference] = ref
	return true, nil
}

// MockBankAccountRepository is a mock implementation of repository.BankAccountRepository
type MockBankAccountRepository struct {
	Accounts map[int64]*models.BankAccount
}

func NewMockBankAccountRepository() *MockBankAccountRepository {
	return &MockBankAccountRepository{
		Accounts: make(map[int64]*models.BankAccount),
	}
}

func (m *MockBankAccountRepository) Create(ctx context.Context, bankAccount *models.BankAccount) error {
	bankAccount.ID = int64(len(m.Accounts) + 1)
	m.Accounts[bankAccount.ID] = bankAccount
	return nil
}

func (m *MockBankAccountRepository) GetByID(ctx context.Context, id int64) (*models.BankAccount, error) {
	account, exists := m.Accounts[id]
	if !exists {
		return nil, errors.New("bank account not found")
	}
	return account, nil
}

func (m *MockBankAccountRepository) GetByIDAndUserID(ctx context.Context, id, userID int64) (*models.BankAccount, error) {
	account, exists := m.Accounts[id]
	if !exists || account.UserID != userID {
		return nil, errors.New("bank account not found")
	}
	return account, nil
}

func (m *MockBankAccountRepository) GetByUserID(ctx context.Context, userID int64) ([]*models.BankAccount, error) {
	var accounts []*models.BankAccount
	for _, account := range m.Accounts {
		if account.UserID == userID {
			accounts = append(accounts, account)
		}
	}
	return accounts, nil
}

func (m *MockBankAccountRepository) Delete(ctx context.Context, id int64) error {
	if _, exists := m.Accounts[id]; !exists {
		return errors.New("bank account not found")
	}
	delete(m.Accounts, id)
	return nil
}
