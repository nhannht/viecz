package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"viecz.vieczserver/internal/auth"
	"viecz.vieczserver/internal/database"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
	"viecz.vieczserver/internal/services"
)

// --- E2E mock for PayOSServicer (lives in handlers package to avoid import cycles) ---

type e2eMockPayOS struct {
	lastOrderCode int64
}

var _ services.PayOSServicer = (*e2eMockPayOS)(nil)

func (m *e2eMockPayOS) CreatePaymentLink(_ context.Context, orderCode int64, amount int, description, returnURL, cancelURL string) (*services.PaymentLinkResponse, error) {
	m.lastOrderCode = orderCode
	return &services.PaymentLinkResponse{
		CheckoutUrl:   "https://pay.payos.vn/test-checkout",
		PaymentLinkId: fmt.Sprintf("pl_%d", orderCode),
		OrderCode:     orderCode,
		Amount:        amount,
		Status:        "PENDING",
	}, nil
}

func (m *e2eMockPayOS) VerifyWebhookData(_ context.Context, webhookData map[string]interface{}) (map[string]interface{}, error) {
	// Simulate PayOS SDK: return the "data" field directly
	if data, ok := webhookData["data"].(map[string]interface{}); ok {
		return data, nil
	}
	return webhookData, nil
}

func (m *e2eMockPayOS) ConfirmWebhook(_ context.Context, webhookURL string) (string, error) {
	return webhookURL, nil
}

// --- E2E test infrastructure ---

const e2eJWTSecret = "e2e-test-secret-key"

func setupE2ERouter(t *testing.T) (*gin.Engine, *e2eMockPayOS, func()) {
	t.Helper()

	// 1. In-memory SQLite
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("Failed to create in-memory DB: %v", err)
	}

	// 2. AutoMigrate all tables
	if err := database.AutoMigrate(db); err != nil {
		t.Fatalf("AutoMigrate failed: %v", err)
	}

	// 3. Seed a category (required for task creation)
	cat := &models.Category{Name: "Moving & Transport", NameVi: "Vận chuyển"}
	if err := db.Create(cat).Error; err != nil {
		t.Fatalf("Failed to seed category: %v", err)
	}

	// 4. GORM repositories (real)
	userRepo := repository.NewUserGormRepository(db)
	taskRepo := repository.NewTaskGormRepository(db)
	applicationRepo := repository.NewTaskApplicationGormRepository(db)
	categoryRepo := repository.NewCategoryGormRepository(db)
	transactionRepo := repository.NewTransactionGormRepository(db)
	walletRepo := repository.NewWalletGormRepository(db)
	walletTransactionRepo := repository.NewWalletTransactionGormRepository(db)

	// 5. Real services
	authService := auth.NewAuthService(userRepo)
	userService := services.NewUserService(userRepo, taskRepo)
	walletService := services.NewWalletService(walletRepo, walletTransactionRepo, db, 200000)
	taskService := services.NewTaskService(taskRepo, applicationRepo, categoryRepo, userRepo, walletService, nil, nil, nil)

	// 6. MockPayOS
	mockPayOS := &e2eMockPayOS{}

	// 7. PaymentService (uses real wallet service)
	paymentService := services.NewPaymentService(
		transactionRepo, taskRepo, applicationRepo, walletService, 0, nil,
	)

	// 9. Handlers
	authHandler := NewAuthHandler(authService, nil, e2eJWTSecret)
	userHandler := NewUserHandler(userService)
	taskHandler := NewTaskHandler(taskService, applicationRepo)
	walletHandler := NewWalletHandler(walletService, mockPayOS, transactionRepo, taskRepo, "http://localhost:8080")
	webhookHandler := NewWebhookHandler(mockPayOS, transactionRepo, taskRepo, walletService)
	paymentHandler := NewPaymentHandler(nil, paymentService, "http://localhost:3000", "http://localhost:8080")
	categoryHandler := NewCategoryHandler(categoryRepo)

	// 10. Gin router (mirrors main.go routes)
	gin.SetMode(gin.TestMode)
	router := gin.New()

	api := router.Group("/api/v1")
	{
		// Auth routes (public)
		authRoutes := api.Group("/auth")
		{
			authRoutes.POST("/register", authHandler.Register)
			authRoutes.POST("/login", authHandler.Login)
		}

		// Payment webhook (public)
		payment := api.Group("/payment")
		{
			payment.POST("/webhook", webhookHandler.HandleWebhook)
			payment.POST("/confirm-webhook", webhookHandler.ConfirmWebhook)
		}

		// Categories (public)
		api.GET("/categories", categoryHandler.GetCategories)

		// Users (protected)
		users := api.Group("/users")
		{
			users.GET("/:id", userHandler.GetProfile)

			protected := users.Group("")
			protected.Use(auth.AuthRequired(e2eJWTSecret))
			{
				protected.GET("/me", userHandler.GetMyProfile)
				protected.PUT("/me", userHandler.UpdateProfile)
				protected.POST("/become-tasker", userHandler.BecomeTasker)
			}
		}

		// Tasks (protected)
		tasks := api.Group("/tasks")
		tasks.Use(auth.AuthRequired(e2eJWTSecret))
		{
			tasks.POST("", taskHandler.CreateTask)
			tasks.GET("", taskHandler.ListTasks)
			tasks.GET("/:id", taskHandler.GetTask)
			tasks.PUT("/:id", taskHandler.UpdateTask)
			tasks.DELETE("/:id", taskHandler.DeleteTask)
			tasks.POST("/:id/applications", taskHandler.ApplyForTask)
			tasks.GET("/:id/applications", taskHandler.GetTaskApplications)
			tasks.POST("/:id/complete", taskHandler.CompleteTask)
		}

		// Applications (protected)
		applications := api.Group("/applications")
		applications.Use(auth.AuthRequired(e2eJWTSecret))
		{
			applications.POST("/:id/accept", taskHandler.AcceptApplication)
		}

		// Wallet (protected)
		wallet := api.Group("/wallet")
		wallet.Use(auth.AuthRequired(e2eJWTSecret))
		{
			wallet.GET("", walletHandler.GetWallet)
			wallet.POST("/deposit", walletHandler.Deposit)
			wallet.GET("/transactions", walletHandler.GetTransactionHistory)
		}

		// Payments (protected)
		payments := api.Group("/payments")
		payments.Use(auth.AuthRequired(e2eJWTSecret))
		{
			payments.POST("/escrow", paymentHandler.CreateEscrowPayment)
			payments.POST("/release", paymentHandler.ReleasePayment)
			payments.POST("/refund", paymentHandler.RefundPayment)
		}
	}

	cleanup := func() {
		sqlDB, _ := db.DB()
		if sqlDB != nil {
			sqlDB.Close()
		}
	}

	return router, mockPayOS, cleanup
}

// --- E2E helper functions ---

type registerResponse struct {
	AccessToken  string          `json:"access_token"`
	RefreshToken string          `json:"refresh_token"`
	User         json.RawMessage `json:"user"`
}

func registerUser(t *testing.T, router *gin.Engine, email, password, name string) (accessToken string, userID int64) {
	t.Helper()

	body, _ := json.Marshal(map[string]string{
		"email":    email,
		"password": password,
		"name":     name,
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Register %s: expected 201, got %d: %s", email, w.Code, w.Body.String())
	}

	var resp registerResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to parse register response: %v", err)
	}

	// Extract user ID from nested user object
	var user struct {
		ID int64 `json:"id"`
	}
	if err := json.Unmarshal(resp.User, &user); err != nil {
		t.Fatalf("Failed to parse user from register response: %v", err)
	}

	return resp.AccessToken, user.ID
}

func authRequest(method, url, token string, body interface{}) *http.Request {
	var bodyReader *bytes.Reader
	if body != nil {
		bodyBytes, _ := json.Marshal(body)
		bodyReader = bytes.NewReader(bodyBytes)
	} else {
		bodyReader = bytes.NewReader(nil)
	}

	req := httptest.NewRequest(method, url, bodyReader)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	return req
}

func doRequest(t *testing.T, router *gin.Engine, method, url, token string, body interface{}) *httptest.ResponseRecorder {
	t.Helper()
	w := httptest.NewRecorder()
	req := authRequest(method, url, token, body)
	router.ServeHTTP(w, req)
	return w
}

// --- The main E2E test ---

func TestE2E_FullJobLifecycle(t *testing.T) {
	router, _, cleanup := setupE2ERouter(t)
	defer cleanup()

	// =====================
	// Step 1: Register Alice (job creator)
	// =====================
	aliceToken, aliceID := registerUser(t, router, "alice@example.com", "Password123", "Alice")
	t.Logf("Alice registered: ID=%d", aliceID)

	// =====================
	// Step 2: Register Bob (tasker)
	// =====================
	bobToken, bobID := registerUser(t, router, "bob@example.com", "Password123", "Bob")
	t.Logf("Bob registered: ID=%d", bobID)

	// =====================
	// Step 3: Bob becomes a tasker
	// =====================
	w := doRequest(t, router, "POST", "/api/v1/users/become-tasker", bobToken, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("Bob become-tasker: expected 200, got %d: %s", w.Code, w.Body.String())
	}
	t.Log("Bob is now a tasker")

	// =====================
	// Step 4: Alice deposits 200000 via PayOS
	// =====================
	w = doRequest(t, router, "POST", "/api/v1/wallet/deposit", aliceToken, map[string]interface{}{
		"amount": 200000,
	})
	if w.Code != http.StatusOK {
		t.Fatalf("Alice deposit: expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var depositResp struct {
		CheckoutURL string `json:"checkout_url"`
		OrderCode   int64  `json:"order_code"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &depositResp); err != nil {
		t.Fatalf("Failed to parse deposit response: %v", err)
	}
	if depositResp.CheckoutURL == "" {
		t.Fatal("Expected checkout_url in deposit response")
	}
	if depositResp.OrderCode == 0 {
		t.Fatal("Expected order_code in deposit response")
	}
	t.Logf("Deposit initiated: orderCode=%d, checkoutURL=%s", depositResp.OrderCode, depositResp.CheckoutURL)

	// =====================
	// Step 5: Simulate PayOS webhook (payment success)
	// =====================
	webhookPayload := map[string]interface{}{
		"code":    "00",
		"desc":    "success",
		"success": true,
		"data": map[string]interface{}{
			"orderCode": float64(depositResp.OrderCode),
			"code":      "00",
			"amount":    float64(200000),
		},
	}
	w = doRequest(t, router, "POST", "/api/v1/payment/webhook", "", webhookPayload)
	if w.Code != http.StatusOK {
		t.Fatalf("Webhook: expected 200, got %d: %s", w.Code, w.Body.String())
	}
	t.Log("Webhook processed: deposit credited")

	// =====================
	// Step 6: Alice checks wallet balance = 200000
	// =====================
	w = doRequest(t, router, "GET", "/api/v1/wallet", aliceToken, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("Get wallet: expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var aliceWallet models.Wallet
	if err := json.Unmarshal(w.Body.Bytes(), &aliceWallet); err != nil {
		t.Fatalf("Failed to parse wallet: %v", err)
	}
	if aliceWallet.Balance != 200000 {
		t.Fatalf("Alice balance: expected 200000, got %d", aliceWallet.Balance)
	}
	t.Logf("Alice wallet balance: %d", aliceWallet.Balance)

	// =====================
	// Step 7: Alice creates a task (price=100000)
	// =====================
	w = doRequest(t, router, "POST", "/api/v1/tasks", aliceToken, map[string]interface{}{
		"title":       "Help me move",
		"description": "Need help moving furniture to new apartment",
		"price":       100000,
		"category_id": 1,
		"location":    "Ho Chi Minh City",
	})
	if w.Code != http.StatusCreated {
		t.Fatalf("Create task: expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var task models.Task
	if err := json.Unmarshal(w.Body.Bytes(), &task); err != nil {
		t.Fatalf("Failed to parse task: %v", err)
	}
	if task.Status != models.TaskStatusOpen {
		t.Fatalf("Task status: expected 'open', got '%s'", task.Status)
	}
	taskID := task.ID
	t.Logf("Task created: ID=%d, status=%s, price=%d", taskID, task.Status, task.Price)

	// =====================
	// Step 8: Bob applies for the task
	// =====================
	w = doRequest(t, router, "POST", fmt.Sprintf("/api/v1/tasks/%d/applications", taskID), bobToken, map[string]interface{}{
		"message": "I can help with the move!",
	})
	if w.Code != http.StatusCreated {
		t.Fatalf("Apply for task: expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var application models.TaskApplication
	if err := json.Unmarshal(w.Body.Bytes(), &application); err != nil {
		t.Fatalf("Failed to parse application: %v", err)
	}
	if application.Status != models.ApplicationStatusPending {
		t.Fatalf("Application status: expected 'pending', got '%s'", application.Status)
	}
	t.Logf("Application created: ID=%d, status=%s", application.ID, application.Status)

	// =====================
	// Step 9: Alice gets task applications
	// =====================
	w = doRequest(t, router, "GET", fmt.Sprintf("/api/v1/tasks/%d/applications", taskID), aliceToken, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("Get applications: expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var applications []models.TaskApplication
	if err := json.Unmarshal(w.Body.Bytes(), &applications); err != nil {
		t.Fatalf("Failed to parse applications: %v", err)
	}
	if len(applications) != 1 {
		t.Fatalf("Expected 1 application, got %d", len(applications))
	}
	appID := applications[0].ID
	t.Logf("Found application ID=%d from tasker ID=%d", appID, applications[0].TaskerID)

	// =====================
	// Step 10: Alice accepts Bob's application
	// (After bug fix: task stays "open", only escrow moves it to "in_progress")
	// =====================
	w = doRequest(t, router, "POST", fmt.Sprintf("/api/v1/applications/%d/accept", appID), aliceToken, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("Accept application: expected 200, got %d: %s", w.Code, w.Body.String())
	}
	t.Log("Application accepted")

	// Verify task is still "open" (bug fix validated here)
	w = doRequest(t, router, "GET", fmt.Sprintf("/api/v1/tasks/%d", taskID), aliceToken, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("Get task: expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var taskAfterAccept struct {
		models.Task
		UserHasApplied bool `json:"user_has_applied"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &taskAfterAccept); err != nil {
		t.Fatalf("Failed to parse task: %v", err)
	}
	if taskAfterAccept.Status != models.TaskStatusOpen {
		t.Fatalf("Task status after accept: expected 'open' (bug fix), got '%s'", taskAfterAccept.Status)
	}
	if taskAfterAccept.TaskerID == nil || *taskAfterAccept.TaskerID != bobID {
		t.Fatalf("Task tasker_id: expected %d, got %v", bobID, taskAfterAccept.TaskerID)
	}
	t.Logf("Task after accept: status=%s, tasker_id=%d (bug fix validated)", taskAfterAccept.Status, *taskAfterAccept.TaskerID)

	// =====================
	// Step 11: Alice creates escrow payment (mock mode: holds from wallet, task → in_progress)
	// =====================
	w = doRequest(t, router, "POST", "/api/v1/payments/escrow", aliceToken, map[string]interface{}{
		"task_id": taskID,
	})
	if w.Code != http.StatusOK {
		t.Fatalf("Create escrow: expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var escrowResp struct {
		Transaction struct {
			ID     int64                    `json:"id"`
			Status models.TransactionStatus `json:"status"`
			Amount int64                    `json:"amount"`
		} `json:"transaction"`
		CheckoutURL string `json:"checkout_url"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &escrowResp); err != nil {
		t.Fatalf("Failed to parse escrow response: %v", err)
	}
	if escrowResp.Transaction.Status != models.TransactionStatusSuccess {
		t.Fatalf("Escrow status: expected 'success', got '%s'", escrowResp.Transaction.Status)
	}
	t.Logf("Escrow created: txID=%d, status=%s, amount=%d", escrowResp.Transaction.ID, escrowResp.Transaction.Status, escrowResp.Transaction.Amount)

	// =====================
	// Step 12: Alice checks wallet balance = 100000 (200k - 100k escrow)
	// =====================
	w = doRequest(t, router, "GET", "/api/v1/wallet", aliceToken, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("Get wallet after escrow: expected 200, got %d: %s", w.Code, w.Body.String())
	}

	if err := json.Unmarshal(w.Body.Bytes(), &aliceWallet); err != nil {
		t.Fatalf("Failed to parse wallet: %v", err)
	}
	if aliceWallet.Balance != 100000 {
		t.Fatalf("Alice balance after escrow: expected 100000, got %d", aliceWallet.Balance)
	}
	t.Logf("Alice wallet after escrow: balance=%d, escrow=%d", aliceWallet.Balance, aliceWallet.EscrowBalance)

	// =====================
	// Step 13: Alice releases payment (90000 to Bob after 10% fee)
	// =====================
	w = doRequest(t, router, "POST", "/api/v1/payments/release", aliceToken, map[string]interface{}{
		"task_id": taskID,
	})
	if w.Code != http.StatusOK {
		t.Fatalf("Release payment: expected 200, got %d: %s", w.Code, w.Body.String())
	}
	t.Log("Payment released")

	// =====================
	// Step 13b: Alice completes the task (sets status to completed)
	// =====================
	w = doRequest(t, router, "POST", fmt.Sprintf("/api/v1/tasks/%d/complete", taskID), aliceToken, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("Complete task: expected 200, got %d: %s", w.Code, w.Body.String())
	}
	t.Log("Task completed")

	// =====================
	// Step 14: Alice checks wallet balance = 100000 (escrow already deducted)
	// =====================
	w = doRequest(t, router, "GET", "/api/v1/wallet", aliceToken, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("Get wallet after release: expected 200, got %d: %s", w.Code, w.Body.String())
	}

	if err := json.Unmarshal(w.Body.Bytes(), &aliceWallet); err != nil {
		t.Fatalf("Failed to parse wallet: %v", err)
	}
	if aliceWallet.Balance != 100000 {
		t.Fatalf("Alice balance after release: expected 100000, got %d", aliceWallet.Balance)
	}
	t.Logf("Alice wallet after release: balance=%d", aliceWallet.Balance)

	// =====================
	// Step 15: Bob checks wallet balance = 100000 (0% platform fee in beta)
	// =====================
	w = doRequest(t, router, "GET", "/api/v1/wallet", bobToken, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("Get Bob wallet: expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var bobWallet models.Wallet
	if err := json.Unmarshal(w.Body.Bytes(), &bobWallet); err != nil {
		t.Fatalf("Failed to parse Bob wallet: %v", err)
	}
	if bobWallet.Balance != 100000 {
		t.Fatalf("Bob balance: expected 100000, got %d", bobWallet.Balance)
	}
	t.Logf("Bob wallet: balance=%d", bobWallet.Balance)

	// =====================
	// Step 16: Alice verifies task is completed
	// =====================
	w = doRequest(t, router, "GET", fmt.Sprintf("/api/v1/tasks/%d", taskID), aliceToken, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("Get final task: expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var finalTask struct {
		models.Task
		UserHasApplied bool `json:"user_has_applied"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &finalTask); err != nil {
		t.Fatalf("Failed to parse final task: %v", err)
	}
	if finalTask.Status != models.TaskStatusCompleted {
		t.Fatalf("Final task status: expected 'completed', got '%s'", finalTask.Status)
	}
	t.Logf("Final task: status=%s", finalTask.Status)

	t.Log("=== E2E Full Job Lifecycle: PASSED ===")
}
