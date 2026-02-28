package services

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"viecz.vieczserver/internal/database"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
)

// setupConcurrentTestDB starts a PostgreSQL testcontainer and returns a GORM DB with all models migrated.
func setupConcurrentTestDB(t *testing.T) (*gorm.DB, func()) {
	t.Helper()
	ctx := context.Background()

	req := testcontainers.ContainerRequest{
		Image:        "postgres:15-alpine",
		ExposedPorts: []string{"5432/tcp"},
		Env: map[string]string{
			"POSTGRES_DB":       "testdb",
			"POSTGRES_USER":     "testuser",
			"POSTGRES_PASSWORD": "testpass",
		},
		WaitingFor: wait.ForLog("database system is ready to accept connections").
			WithOccurrence(2).
			WithStartupTimeout(60 * time.Second),
	}

	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil {
		t.Fatalf("Failed to start PostgreSQL container: %v", err)
	}

	host, err := container.Host(ctx)
	if err != nil {
		t.Fatalf("Failed to get container host: %v", err)
	}

	port, err := container.MappedPort(ctx, "5432")
	if err != nil {
		t.Fatalf("Failed to get container port: %v", err)
	}

	connStr := fmt.Sprintf("host=%s port=%s user=testuser password=testpass dbname=testdb sslmode=disable",
		host, port.Port())

	db, err := gorm.Open(postgres.Open(connStr), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// Use the project's AutoMigrate which includes the partial unique index
	if err := database.AutoMigrate(db); err != nil {
		t.Fatalf("Failed to migrate database: %v", err)
	}

	cleanup := func() {
		if err := container.Terminate(ctx); err != nil {
			t.Logf("Failed to terminate container: %v", err)
		}
	}

	return db, cleanup
}

// createTestUser inserts a user and returns its ID.
func createTestUser(t *testing.T, db *gorm.DB, email string) int64 {
	t.Helper()
	hash := "hashed"
	user := &models.User{
		Email:        &email,
		PasswordHash: &hash,
		Name:         "Test User",
		AuthProvider: "email",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}
	return user.ID
}

// createTestCategory inserts a category and returns its ID.
func createTestCategory(t *testing.T, db *gorm.DB) int {
	t.Helper()
	icon := "test"
	cat := &models.Category{Name: "Test", NameVi: "Test", Icon: &icon, IsActive: true}
	if err := db.Create(cat).Error; err != nil {
		t.Fatalf("Failed to create test category: %v", err)
	}
	return cat.ID
}

// createTestTask inserts a task in Open status and returns the model.
func createTestTask(t *testing.T, db *gorm.DB, requesterID, taskerID int64, categoryID int, price int64) *models.Task {
	t.Helper()
	task := &models.Task{
		RequesterID: requesterID,
		TaskerID:    &taskerID,
		CategoryID:  int64(categoryID),
		Title:       "Test Task",
		Description: "Test task description",
		Price:       price,
		Location:    "Test Location",
		Status:      models.TaskStatusOpen,
	}
	if err := db.Create(task).Error; err != nil {
		t.Fatalf("Failed to create test task: %v", err)
	}
	return task
}

func TestConcurrentDeposit(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	db, cleanup := setupConcurrentTestDB(t)
	defer cleanup()

	walletRepo := repository.NewWalletGormRepository(db)
	walletTxRepo := repository.NewWalletTransactionGormRepository(db)
	walletService := NewWalletService(walletRepo, walletTxRepo, db, 0)

	userID := createTestUser(t, db, "deposit@test.com")
	ctx := context.Background()

	// Pre-create wallet with a seed deposit (must succeed before concurrent test)
	if err := walletService.Deposit(ctx, nil, userID, 1000, "seed"); err != nil {
		t.Fatalf("Failed to seed wallet: %v", err)
	}

	const numGoroutines = 10
	const depositAmount int64 = 1000

	var wg sync.WaitGroup
	errs := make(chan error, numGoroutines)

	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			err := walletService.Deposit(ctx, nil, userID, depositAmount,
				fmt.Sprintf("concurrent deposit %d", i))
			if err != nil {
				errs <- err
			}
		}(i)
	}

	wg.Wait()
	close(errs)

	errCount := 0
	for err := range errs {
		errCount++
		t.Logf("deposit error %d: %v", errCount, err)
	}
	if errCount > 0 {
		t.Errorf("%d out of %d deposits failed (see errors above)", errCount, numGoroutines)
	}

	// Verify final balance: seed(1000) + 10 * 1000 = 11000
	var wallet models.Wallet
	if err := db.Where("user_id = ?", userID).First(&wallet).Error; err != nil {
		t.Fatalf("Failed to get wallet: %v", err)
	}

	expectedBalance := int64(1000) + numGoroutines*depositAmount
	if wallet.Balance != expectedBalance {
		t.Errorf("expected balance %d, got %d (double-spend detected!)", expectedBalance, wallet.Balance)
	}
}

func TestConcurrentHoldInEscrow(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	db, cleanup := setupConcurrentTestDB(t)
	defer cleanup()

	walletRepo := repository.NewWalletGormRepository(db)
	walletTxRepo := repository.NewWalletTransactionGormRepository(db)
	walletService := NewWalletService(walletRepo, walletTxRepo, db, 0)

	userID := createTestUser(t, db, "escrow@test.com")
	catID := createTestCategory(t, db)
	ctx := context.Background()

	// Deposit enough for exactly 1 escrow hold
	const escrowAmount int64 = 50000
	if err := walletService.Deposit(ctx, nil, userID, escrowAmount, "initial deposit"); err != nil {
		t.Fatalf("Failed to deposit: %v", err)
	}

	const numGoroutines = 5
	var wg sync.WaitGroup
	successes := make(chan int, numGoroutines)
	failures := make(chan int, numGoroutines)

	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			// Create a task for each goroutine
			task := &models.Task{
				RequesterID: userID,
				CategoryID:  int64(catID),
				Title:       fmt.Sprintf("Task %d", i),
				Description: "test",
				Price:       escrowAmount,
				Location:    "Test Location",
				Status:      models.TaskStatusOpen,
			}
			if err := db.Create(task).Error; err != nil {
				failures <- i
				return
			}

			err := walletService.HoldInEscrow(ctx, nil, userID, escrowAmount, task.ID, nil)
			if err != nil {
				failures <- i
			} else {
				successes <- i
			}
		}(i)
	}

	wg.Wait()
	close(successes)
	close(failures)

	successCount := 0
	for range successes {
		successCount++
	}
	failureCount := 0
	for range failures {
		failureCount++
	}

	if successCount != 1 {
		t.Errorf("expected exactly 1 successful escrow hold, got %d (double-spend!)", successCount)
	}
	if failureCount != numGoroutines-1 {
		t.Errorf("expected %d failed escrow holds, got %d", numGoroutines-1, failureCount)
	}

	// Verify wallet state
	var wallet models.Wallet
	if err := db.Where("user_id = ?", userID).First(&wallet).Error; err != nil {
		t.Fatalf("Failed to get wallet: %v", err)
	}

	if wallet.Balance != 0 {
		t.Errorf("expected balance 0, got %d", wallet.Balance)
	}
	if wallet.EscrowBalance != escrowAmount {
		t.Errorf("expected escrow balance %d, got %d", escrowAmount, wallet.EscrowBalance)
	}
}

func TestConcurrentReleaseFromEscrow(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	db, cleanup := setupConcurrentTestDB(t)
	defer cleanup()

	walletRepo := repository.NewWalletGormRepository(db)
	walletTxRepo := repository.NewWalletTransactionGormRepository(db)
	transactionRepo := repository.NewTransactionGormRepository(db)
	taskRepo := repository.NewTaskGormRepository(db)
	appRepo := repository.NewTaskApplicationGormRepository(db)
	walletService := NewWalletService(walletRepo, walletTxRepo, db, 0)
	paymentService := NewPaymentService(transactionRepo, taskRepo, appRepo, walletService, 0.1, nil, db, nil)

	ctx := context.Background()

	payerID := createTestUser(t, db, "payer-release@test.com")
	payeeID := createTestUser(t, db, "payee-release@test.com")
	catID := createTestCategory(t, db)

	// Deposit funds for payer
	if err := walletService.Deposit(ctx, nil, payerID, 100000, "deposit"); err != nil {
		t.Fatalf("Failed to deposit: %v", err)
	}

	// Create task and escrow
	task := createTestTask(t, db, payerID, payeeID, catID, 50000)
	_, _, err := paymentService.CreateEscrowPayment(ctx, task.ID, payerID)
	if err != nil {
		t.Fatalf("Failed to create escrow: %v", err)
	}

	// Two goroutines try to release the same escrow
	const numGoroutines = 2
	var wg sync.WaitGroup
	results := make(chan error, numGoroutines)

	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			results <- paymentService.ReleasePayment(ctx, task.ID, payerID)
		}()
	}

	wg.Wait()
	close(results)

	successCount := 0
	for err := range results {
		if err == nil {
			successCount++
		}
	}

	// Both should succeed due to idempotent release logic, but the payee should only be credited once
	var payeeWallet models.Wallet
	if err := db.Where("user_id = ?", payeeID).First(&payeeWallet).Error; err != nil {
		t.Fatalf("Failed to get payee wallet: %v", err)
	}

	// Net amount = 50000 - 10% fee = 45000
	expectedPayeeBalance := int64(45000)
	if payeeWallet.Balance != expectedPayeeBalance {
		t.Errorf("expected payee balance %d, got %d (double-credit!)", expectedPayeeBalance, payeeWallet.Balance)
	}

	// Verify only one release transaction exists
	var releaseCount int64
	db.Model(&models.Transaction{}).
		Where("task_id = ? AND type = ? AND status = ?", task.ID, models.TransactionTypeRelease, models.TransactionStatusSuccess).
		Count(&releaseCount)
	if releaseCount != 1 {
		t.Errorf("expected 1 release transaction, got %d", releaseCount)
	}
}

func TestConcurrentCreateEscrowPayment(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	db, cleanup := setupConcurrentTestDB(t)
	defer cleanup()

	walletRepo := repository.NewWalletGormRepository(db)
	walletTxRepo := repository.NewWalletTransactionGormRepository(db)
	transactionRepo := repository.NewTransactionGormRepository(db)
	taskRepo := repository.NewTaskGormRepository(db)
	appRepo := repository.NewTaskApplicationGormRepository(db)
	walletService := NewWalletService(walletRepo, walletTxRepo, db, 0)
	paymentService := NewPaymentService(transactionRepo, taskRepo, appRepo, walletService, 0.1, nil, db, nil)

	ctx := context.Background()

	payerID := createTestUser(t, db, "payer-concurrent@test.com")
	payeeID := createTestUser(t, db, "payee-concurrent@test.com")
	catID := createTestCategory(t, db)

	// Deposit enough funds
	if err := walletService.Deposit(ctx, nil, payerID, 500000, "deposit"); err != nil {
		t.Fatalf("Failed to deposit: %v", err)
	}

	// Create one task
	task := createTestTask(t, db, payerID, payeeID, catID, 50000)

	// Multiple goroutines try to create escrow for the same task
	const numGoroutines = 5
	var wg sync.WaitGroup
	successes := make(chan *models.Transaction, numGoroutines)
	failures := make(chan error, numGoroutines)

	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			tx, _, err := paymentService.CreateEscrowPayment(ctx, task.ID, payerID)
			if err != nil {
				failures <- err
			} else if tx != nil && tx.Status == models.TransactionStatusSuccess {
				successes <- tx
			} else {
				failures <- fmt.Errorf("unexpected result: tx=%v", tx)
			}
		}()
	}

	wg.Wait()
	close(successes)
	close(failures)

	successCount := 0
	for range successes {
		successCount++
	}

	if successCount != 1 {
		t.Errorf("expected exactly 1 successful escrow, got %d (double-spend!)", successCount)
	}

	// Verify DB state: exactly 1 successful escrow transaction
	var escrowCount int64
	db.Model(&models.Transaction{}).
		Where("task_id = ? AND type = ? AND status = ?", task.ID, models.TransactionTypeEscrow, models.TransactionStatusSuccess).
		Count(&escrowCount)
	if escrowCount != 1 {
		t.Errorf("expected 1 successful escrow transaction in DB, got %d", escrowCount)
	}

	// Verify wallet balance consistency: 500000 - 50000 = 450000
	var wallet models.Wallet
	if err := db.Where("user_id = ?", payerID).First(&wallet).Error; err != nil {
		t.Fatalf("Failed to get wallet: %v", err)
	}

	expectedBalance := int64(500000 - 50000)
	if wallet.Balance != expectedBalance {
		t.Errorf("expected balance %d, got %d", expectedBalance, wallet.Balance)
	}
	expectedEscrow := int64(50000)
	if wallet.EscrowBalance != expectedEscrow {
		t.Errorf("expected escrow balance %d, got %d", expectedEscrow, wallet.EscrowBalance)
	}
}
