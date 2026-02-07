package testutil

import (
	"time"

	"viecz.vieczserver/internal/models"
)

// WalletBuilder provides a fluent interface for building test wallets
type WalletBuilder struct {
	wallet *models.Wallet
}

func NewWalletBuilder() *WalletBuilder {
	return &WalletBuilder{
		wallet: &models.Wallet{
			ID:              1,
			UserID:          1,
			Balance:         0,
			EscrowBalance:   0,
			TotalDeposited:  0,
			TotalWithdrawn:  0,
			TotalEarned:     0,
			TotalSpent:      0,
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		},
	}
}

func (b *WalletBuilder) WithID(id int64) *WalletBuilder {
	b.wallet.ID = id
	return b
}

func (b *WalletBuilder) WithUserID(userID int64) *WalletBuilder {
	b.wallet.UserID = userID
	return b
}

func (b *WalletBuilder) WithBalance(balance int64) *WalletBuilder {
	b.wallet.Balance = balance
	return b
}

func (b *WalletBuilder) WithEscrowBalance(escrow int64) *WalletBuilder {
	b.wallet.EscrowBalance = escrow
	return b
}

func (b *WalletBuilder) WithTotalDeposited(amount int64) *WalletBuilder {
	b.wallet.TotalDeposited = amount
	return b
}

func (b *WalletBuilder) WithTotalEarned(amount int64) *WalletBuilder {
	b.wallet.TotalEarned = amount
	return b
}

func (b *WalletBuilder) WithTotalSpent(amount int64) *WalletBuilder {
	b.wallet.TotalSpent = amount
	return b
}

func (b *WalletBuilder) Build() *models.Wallet {
	return b.wallet
}

// TaskBuilder provides a fluent interface for building test tasks
type TaskBuilder struct {
	task *models.Task
}

func NewTaskBuilder() *TaskBuilder {
	return &TaskBuilder{
		task: &models.Task{
			ID:          1,
			Title:       "Test Task",
			Description: "Test Description",
			CategoryID:  1,
			RequesterID: 1,
			Price:       100000,
			Status:      models.TaskStatusOpen,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
	}
}

func (b *TaskBuilder) WithID(id int64) *TaskBuilder {
	b.task.ID = id
	return b
}

func (b *TaskBuilder) WithRequesterID(requesterID int64) *TaskBuilder {
	b.task.RequesterID = requesterID
	return b
}

func (b *TaskBuilder) WithTaskerID(taskerID int64) *TaskBuilder {
	b.task.TaskerID = &taskerID
	return b
}

func (b *TaskBuilder) WithPrice(price int64) *TaskBuilder {
	b.task.Price = price
	return b
}

func (b *TaskBuilder) WithStatus(status models.TaskStatus) *TaskBuilder {
	b.task.Status = status
	return b
}

func (b *TaskBuilder) Build() *models.Task {
	return b.task
}

// TransactionBuilder provides a fluent interface for building test transactions
type TransactionBuilder struct {
	transaction *models.Transaction
}

func NewTransactionBuilder() *TransactionBuilder {
	return &TransactionBuilder{
		transaction: &models.Transaction{
			ID:          1,
			PayerID:     1,
			Amount:      100000,
			PlatformFee: 10000,
			NetAmount:   90000,
			Type:        models.TransactionTypeEscrow,
			Status:      models.TransactionStatusPending,
			Description: "Test Transaction",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
	}
}

func (b *TransactionBuilder) WithID(id int64) *TransactionBuilder {
	b.transaction.ID = id
	return b
}

func (b *TransactionBuilder) WithTaskID(taskID int64) *TransactionBuilder {
	b.transaction.TaskID = &taskID
	return b
}

func (b *TransactionBuilder) WithPayerID(payerID int64) *TransactionBuilder {
	b.transaction.PayerID = payerID
	return b
}

func (b *TransactionBuilder) WithPayeeID(payeeID int64) *TransactionBuilder {
	b.transaction.PayeeID = &payeeID
	return b
}

func (b *TransactionBuilder) WithAmount(amount int64) *TransactionBuilder {
	b.transaction.Amount = amount
	return b
}

func (b *TransactionBuilder) WithPlatformFee(fee int64) *TransactionBuilder {
	b.transaction.PlatformFee = fee
	b.transaction.NetAmount = b.transaction.Amount - fee
	return b
}

func (b *TransactionBuilder) WithType(txType models.TransactionType) *TransactionBuilder {
	b.transaction.Type = txType
	return b
}

func (b *TransactionBuilder) WithStatus(status models.TransactionStatus) *TransactionBuilder {
	b.transaction.Status = status
	return b
}

func (b *TransactionBuilder) Build() *models.Transaction {
	return b.transaction
}

// WalletTransactionBuilder provides a fluent interface for building test wallet transactions
type WalletTransactionBuilder struct {
	transaction *models.WalletTransaction
}

func NewWalletTransactionBuilder() *WalletTransactionBuilder {
	return &WalletTransactionBuilder{
		transaction: &models.WalletTransaction{
			ID:            1,
			WalletID:      1,
			Type:          models.WalletTransactionTypeDeposit,
			Amount:        100000,
			BalanceBefore: 0,
			BalanceAfter:  100000,
			EscrowBefore:  0,
			EscrowAfter:   0,
			Description:   "Test Transaction",
			CreatedAt:     time.Now(),
		},
	}
}

func (b *WalletTransactionBuilder) WithWalletID(walletID int64) *WalletTransactionBuilder {
	b.transaction.WalletID = walletID
	return b
}

func (b *WalletTransactionBuilder) WithTaskID(taskID int64) *WalletTransactionBuilder {
	b.transaction.TaskID = &taskID
	return b
}

func (b *WalletTransactionBuilder) WithType(txType models.WalletTransactionType) *WalletTransactionBuilder {
	b.transaction.Type = txType
	return b
}

func (b *WalletTransactionBuilder) WithAmount(amount int64) *WalletTransactionBuilder {
	b.transaction.Amount = amount
	return b
}

func (b *WalletTransactionBuilder) Build() *models.WalletTransaction {
	return b.transaction
}
