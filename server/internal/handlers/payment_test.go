package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/services"
	"viecz.vieczserver/internal/testutil"
)

// setupPaymentHandlerTest creates a payment handler with mock dependencies
func setupPaymentHandlerTest(t *testing.T, setupRepos func(*testutil.MockTaskRepository, *testutil.MockTransactionRepository, *testutil.MockWalletRepository)) (*PaymentHandler, func()) {
	t.Helper()

	taskRepo := testutil.NewMockTaskRepository()
	txRepo := testutil.NewMockTransactionRepository()
	walletRepo := testutil.NewMockWalletRepository()
	walletTxRepo := testutil.NewMockWalletTransactionRepository()

	if setupRepos != nil {
		setupRepos(taskRepo, txRepo, walletRepo)
	}

	// Create mock GORM DB
	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}

	// Create services
	walletService := services.NewWalletService(walletRepo, walletTxRepo, mockDB, 200000)
	paymentService := services.NewPaymentService(txRepo, taskRepo, nil, walletService, 0, nil, mockDB)

	handler := NewPaymentHandler(nil, paymentService, "http://localhost:3000", "http://localhost:8080") // payosReturnBaseURL

	return handler, func() {
		cleanup()
	}
}

func TestPaymentHandler_CreateEscrowPayment(t *testing.T) {
	tests := []struct {
		name               string
		userID             *int64
		requestBody        interface{}
		setupRepos         func(*testutil.MockTaskRepository, *testutil.MockTransactionRepository, *testutil.MockWalletRepository)
		expectedStatusCode int
	}{
		{
			name:   "successful escrow payment",
			userID: func() *int64 { id := int64(1); return &id }(),
			requestBody: CreateEscrowPaymentRequest{
				TaskID: 1,
			},
			setupRepos: func(taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository, walletRepo *testutil.MockWalletRepository) {
				task := testutil.NewTaskBuilder().
					WithID(1).
					WithRequesterID(1).
					WithPrice(100000).
					WithStatus(models.TaskStatusOpen).
					Build()
				taskRepo.Tasks[1] = task

				wallet := &models.Wallet{
					ID:      1,
					UserID:  1,
					Balance: 200000,
				}
				walletRepo.Wallets[1] = wallet
			},
			expectedStatusCode: http.StatusOK,
		},
		{
			name:               "unauthorized",
			userID:             nil,
			requestBody:        CreateEscrowPaymentRequest{TaskID: 1},
			setupRepos:         func(taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository, walletRepo *testutil.MockWalletRepository) {},
			expectedStatusCode: http.StatusUnauthorized,
		},
		{
			name:               "invalid request",
			userID:             func() *int64 { id := int64(1); return &id }(),
			requestBody:        map[string]interface{}{},
			setupRepos:         func(taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository, walletRepo *testutil.MockWalletRepository) {},
			expectedStatusCode: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			router := gin.New()

			handler, cleanup := setupPaymentHandlerTest(t, tt.setupRepos)
			defer cleanup()

			router.POST("/escrow", func(c *gin.Context) {
				if tt.userID != nil {
					c.Set("user_id", *tt.userID)
				}
				handler.CreateEscrowPayment(c)
			})

			bodyBytes, _ := json.Marshal(tt.requestBody)
			req, _ := http.NewRequest(http.MethodPost, "/escrow", bytes.NewBuffer(bodyBytes))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tt.expectedStatusCode {
				t.Errorf("Expected status %d, got %d. Body: %s", tt.expectedStatusCode, w.Code, w.Body.String())
			}
		})
	}
}

func TestPaymentHandler_ReleasePayment(t *testing.T) {
	tests := []struct {
		name               string
		userID             *int64
		requestBody        interface{}
		setupRepos         func(*testutil.MockTaskRepository, *testutil.MockTransactionRepository, *testutil.MockWalletRepository)
		expectedStatusCode int
	}{
		{
			name:   "successful release",
			userID: func() *int64 { id := int64(1); return &id }(),
			requestBody: ReleasePaymentRequest{
				TaskID: 1,
			},
			setupRepos: func(taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository, walletRepo *testutil.MockWalletRepository) {
				taskerID := int64(2)
				task := testutil.NewTaskBuilder().
					WithID(1).
					WithRequesterID(1).
					WithTaskerID(taskerID).
					WithPrice(100000).
					WithStatus(models.TaskStatusInProgress).
					Build()
				taskRepo.Tasks[1] = task

				escrowTx := testutil.NewTransactionBuilder().
					WithTaskID(1).
					WithPayerID(1).
					WithPayeeID(taskerID).
					WithAmount(100000).
					WithPlatformFee(10000).
					WithType(models.TransactionTypeEscrow).
					WithStatus(models.TransactionStatusSuccess).
					Build()
				txRepo.Transactions[escrowTx.ID] = escrowTx

				// Setup wallets
				payerWallet := &models.Wallet{
					ID:            1,
					UserID:        1,
					Balance:       0,
					EscrowBalance: 100000,
				}
				walletRepo.Wallets[1] = payerWallet

				payeeWallet := &models.Wallet{
					ID:     2,
					UserID: 2,
				}
				walletRepo.Wallets[2] = payeeWallet
			},
			expectedStatusCode: http.StatusOK,
		},
		{
			name:               "unauthorized",
			userID:             nil,
			requestBody:        ReleasePaymentRequest{TaskID: 1},
			setupRepos:         func(taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository, walletRepo *testutil.MockWalletRepository) {},
			expectedStatusCode: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			router := gin.New()

			handler, cleanup := setupPaymentHandlerTest(t, tt.setupRepos)
			defer cleanup()

			router.POST("/release", func(c *gin.Context) {
				if tt.userID != nil {
					c.Set("user_id", *tt.userID)
				}
				handler.ReleasePayment(c)
			})

			bodyBytes, _ := json.Marshal(tt.requestBody)
			req, _ := http.NewRequest(http.MethodPost, "/release", bytes.NewBuffer(bodyBytes))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tt.expectedStatusCode {
				t.Errorf("Expected status %d, got %d", tt.expectedStatusCode, w.Code)
			}
		})
	}
}

func TestPaymentHandler_RefundPayment(t *testing.T) {
	tests := []struct {
		name               string
		userID             *int64
		requestBody        interface{}
		setupRepos         func(*testutil.MockTaskRepository, *testutil.MockTransactionRepository, *testutil.MockWalletRepository)
		expectedStatusCode int
	}{
		{
			name:   "successful refund",
			userID: func() *int64 { id := int64(1); return &id }(),
			requestBody: RefundPaymentRequest{
				TaskID: 1,
				Reason: "Task cancelled",
			},
			setupRepos: func(taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository, walletRepo *testutil.MockWalletRepository) {
				task := testutil.NewTaskBuilder().
					WithID(1).
					WithRequesterID(1).
					WithPrice(100000).
					WithStatus(models.TaskStatusInProgress).
					Build()
				taskRepo.Tasks[1] = task

				escrowTx := testutil.NewTransactionBuilder().
					WithTaskID(1).
					WithPayerID(1).
					WithAmount(100000).
					WithPlatformFee(10000).
					WithType(models.TransactionTypeEscrow).
					WithStatus(models.TransactionStatusSuccess).
					Build()
				txRepo.Transactions[escrowTx.ID] = escrowTx

				wallet := &models.Wallet{
					ID:            1,
					UserID:        1,
					Balance:       0,
					EscrowBalance: 100000,
					TotalSpent:    100000,
				}
				walletRepo.Wallets[1] = wallet
			},
			expectedStatusCode: http.StatusOK,
		},
		{
			name:               "unauthorized",
			userID:             nil,
			requestBody:        RefundPaymentRequest{TaskID: 1, Reason: "Cancel"},
			setupRepos:         func(taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository, walletRepo *testutil.MockWalletRepository) {},
			expectedStatusCode: http.StatusUnauthorized,
		},
		{
			name:               "invalid request - missing reason",
			userID:             func() *int64 { id := int64(1); return &id }(),
			requestBody:        map[string]interface{}{"task_id": 1},
			setupRepos:         func(taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository, walletRepo *testutil.MockWalletRepository) {},
			expectedStatusCode: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			router := gin.New()

			handler, cleanup := setupPaymentHandlerTest(t, tt.setupRepos)
			defer cleanup()

			router.POST("/refund", func(c *gin.Context) {
				if tt.userID != nil {
					c.Set("user_id", *tt.userID)
				}
				handler.RefundPayment(c)
			})

			bodyBytes, _ := json.Marshal(tt.requestBody)
			req, _ := http.NewRequest(http.MethodPost, "/refund", bytes.NewBuffer(bodyBytes))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tt.expectedStatusCode {
				t.Errorf("Expected status %d, got %d", tt.expectedStatusCode, w.Code)
			}
		})
	}
}

func TestPaymentHandler_GetTransactionsByTask(t *testing.T) {
	tests := []struct {
		name               string
		taskID             string
		setupRepos         func(*testutil.MockTaskRepository, *testutil.MockTransactionRepository, *testutil.MockWalletRepository)
		expectedStatusCode int
	}{
		{
			name:   "successful fetch",
			taskID: "1",
			setupRepos: func(taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository, walletRepo *testutil.MockWalletRepository) {
				tx1 := testutil.NewTransactionBuilder().WithTaskID(1).Build()
				tx2 := testutil.NewTransactionBuilder().WithTaskID(1).Build()
				txRepo.Transactions[tx1.ID] = tx1
				txRepo.Transactions[tx2.ID] = tx2
			},
			expectedStatusCode: http.StatusOK,
		},
		{
			name:               "invalid task ID",
			taskID:             "invalid",
			setupRepos:         func(taskRepo *testutil.MockTaskRepository, txRepo *testutil.MockTransactionRepository, walletRepo *testutil.MockWalletRepository) {},
			expectedStatusCode: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			router := gin.New()

			handler, cleanup := setupPaymentHandlerTest(t, tt.setupRepos)
			defer cleanup()

			router.GET("/transactions/:task_id", handler.GetTransactionsByTask)

			req, _ := http.NewRequest(http.MethodGet, "/transactions/"+tt.taskID, nil)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tt.expectedStatusCode {
				t.Errorf("Expected status %d, got %d", tt.expectedStatusCode, w.Code)
			}
		})
	}
}

func TestPaymentHandler_Health(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	handler := &PaymentHandler{}
	router.GET("/health", handler.Health)

	req, _ := http.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp["status"] != "ok" {
		t.Errorf("Expected status 'ok', got %v", resp["status"])
	}
}
