package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"viecz.vieczserver/internal/auth"
	"viecz.vieczserver/internal/database"
	"viecz.vieczserver/internal/handlers"
	"viecz.vieczserver/internal/middleware"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
	"viecz.vieczserver/internal/services"
	"viecz.vieczserver/internal/websocket"
)

const (
	jwtSecret = "e2e-test-secret-key"
	serverURL = "http://localhost:9999"
	port      = "9999"
)

// mockPayOS implements services.PayOSServicer for the test server.
// When CreatePaymentLink is called, it spawns a goroutine that POSTs
// a webhook to auto-credit the wallet after a short delay.
type mockPayOS struct{}

var _ services.PayOSServicer = (*mockPayOS)(nil)

func (m *mockPayOS) CreatePaymentLink(_ context.Context, orderCode int64, amount int, description, returnURL, cancelURL string) (*services.PaymentLinkResponse, error) {
	// Fire webhook in background to auto-complete deposit
	go func() {
		time.Sleep(100 * time.Millisecond)

		webhookPayload := map[string]interface{}{
			"code":    "00",
			"desc":    "success",
			"success": true,
			"data": map[string]interface{}{
				"orderCode": float64(orderCode),
				"code":      "00",
				"amount":    float64(amount),
			},
		}

		body, _ := json.Marshal(webhookPayload)
		resp, err := http.Post(
			fmt.Sprintf("%s/api/v1/payment/webhook", serverURL),
			"application/json",
			bytes.NewReader(body),
		)
		if err != nil {
			log.Printf("[MockPayOS] Webhook POST failed: %v", err)
			return
		}
		resp.Body.Close()
		log.Printf("[MockPayOS] Auto-completed deposit: orderCode=%d, amount=%d", orderCode, amount)
	}()

	return &services.PaymentLinkResponse{
		CheckoutUrl:   fmt.Sprintf("%s/mock-checkout/%d", serverURL, orderCode),
		PaymentLinkId: fmt.Sprintf("pl_%d", orderCode),
		OrderCode:     orderCode,
		Amount:        amount,
		Status:        "PENDING",
	}, nil
}

func (m *mockPayOS) VerifyWebhookData(_ context.Context, webhookData map[string]interface{}) (map[string]interface{}, error) {
	if data, ok := webhookData["data"].(map[string]interface{}); ok {
		return data, nil
	}
	return webhookData, nil
}

func (m *mockPayOS) ConfirmWebhook(_ context.Context, webhookURL string) (string, error) {
	return webhookURL, nil
}

func main() {
	log.Println("=== Viecz Test Server ===")
	log.Println("SQLite in-memory | Mock PayOS | Auto-complete deposits")

	// 1. In-memory SQLite
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("Failed to create in-memory DB: %v", err)
	}

	// 2. AutoMigrate all tables
	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("AutoMigrate failed: %v", err)
	}

	// Also migrate conversation/message tables
	if err := db.AutoMigrate(&models.Conversation{}, &models.Message{}); err != nil {
		log.Fatalf("AutoMigrate (messaging) failed: %v", err)
	}

	// 3. Seed categories
	if err := database.SeedData(db); err != nil {
		log.Printf("Seed data warning: %v (continuing anyway)", err)
	}

	// 4. GORM repositories
	userRepo := repository.NewUserGormRepository(db)
	taskRepo := repository.NewTaskGormRepository(db)
	applicationRepo := repository.NewTaskApplicationGormRepository(db)
	categoryRepo := repository.NewCategoryGormRepository(db)
	transactionRepo := repository.NewTransactionGormRepository(db)
	walletRepo := repository.NewWalletGormRepository(db)
	walletTransactionRepo := repository.NewWalletTransactionGormRepository(db)
	conversationRepo := repository.NewConversationGormRepository(db)
	messageRepo := repository.NewMessageGormRepository(db)

	// 5. Services
	authService := auth.NewAuthService(userRepo)

	// Initialize Google OAuth service for testing (optional - will fail gracefully if credentials not set)
	googleOAuthService, err := auth.NewGoogleOAuthService(
		"test-google-client-id", // Mock client ID for test server
		"",                       // Client secret not needed
		"",                       // Redirect URL not needed
	)
	if err != nil {
		log.Printf("Warning: Google OAuth not available in test server: %v", err)
		// Continue without Google OAuth - the endpoint will return 401 if used
	}

	userService := services.NewUserService(userRepo)
	walletService := services.NewWalletService(walletRepo, walletTransactionRepo, db, 200000)

	// WebSocket Hub
	hub := websocket.NewHub()
	go hub.Run()

	// Notification service
	notificationRepo := repository.NewNotificationGormRepository(db)
	notificationService := services.NewNotificationService(notificationRepo, hub)

	taskService := services.NewTaskService(taskRepo, applicationRepo, categoryRepo, userRepo, walletService, notificationService)

	mockPayOS := &mockPayOS{}

	paymentService := services.NewPaymentService(
		transactionRepo, taskRepo, applicationRepo, walletService, 0, notificationService,
	)

	messageService := services.NewMessageService(messageRepo, conversationRepo, hub)

	// 6. Handlers
	authHandler := handlers.NewAuthHandler(authService, googleOAuthService, jwtSecret)
	userHandler := handlers.NewUserHandler(userService)
	paymentHandler := handlers.NewPaymentHandler(nil, paymentService, serverURL, serverURL)
	webhookHandler := handlers.NewWebhookHandler(mockPayOS, transactionRepo, taskRepo, walletService)
	taskHandler := handlers.NewTaskHandler(taskService, applicationRepo)
	notificationHandler := handlers.NewNotificationHandler(notificationService)
	categoryHandler := handlers.NewCategoryHandler(categoryRepo)
	walletHandler := handlers.NewWalletHandler(walletService, mockPayOS, transactionRepo, taskRepo, serverURL)
	websocketHandler := handlers.NewWebSocketHandler(hub, messageService, jwtSecret)
	messageHandler := handlers.NewMessageHandler(messageService)

	// 7. Gin router (mirrors cmd/server/main.go routes exactly)
	gin.SetMode(gin.DebugMode)
	router := gin.Default()
	router.Use(middleware.CORS("*"))

	api := router.Group("/api/v1")
	{
		// Health check
		api.GET("/health", paymentHandler.Health)

		// Auth routes (public)
		authRoutes := api.Group("/auth")
		{
			authRoutes.POST("/register", authHandler.Register)
			authRoutes.POST("/login", authHandler.Login)
			authRoutes.POST("/google", authHandler.GoogleLogin)
			authRoutes.POST("/refresh", authHandler.RefreshToken)
		}

		// Payment routes (public — webhook)
		payment := api.Group("/payment")
		{
			payment.POST("/webhook", webhookHandler.HandleWebhook)
			payment.POST("/confirm-webhook", webhookHandler.ConfirmWebhook)
		}

		// Category routes (public)
		api.GET("/categories", categoryHandler.GetCategories)

		// User routes
		users := api.Group("/users")
		{
			users.GET("/:id", userHandler.GetProfile)

			protected := users.Group("")
			protected.Use(auth.AuthRequired(jwtSecret))
			{
				protected.GET("/me", userHandler.GetMyProfile)
				protected.PUT("/me", userHandler.UpdateProfile)
				protected.POST("/become-tasker", userHandler.BecomeTasker)
			}
		}

		// Task routes (protected)
		tasks := api.Group("/tasks")
		tasks.Use(auth.AuthRequired(jwtSecret))
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

		// Application routes (protected)
		applications := api.Group("/applications")
		applications.Use(auth.AuthRequired(jwtSecret))
		{
			applications.POST("/:id/accept", taskHandler.AcceptApplication)
		}

		// Wallet routes (protected)
		wallet := api.Group("/wallet")
		wallet.Use(auth.AuthRequired(jwtSecret))
		{
			wallet.GET("", walletHandler.GetWallet)
			wallet.POST("/deposit", walletHandler.Deposit)
			wallet.GET("/transactions", walletHandler.GetTransactionHistory)
		}

		// Payment routes (protected)
		payments := api.Group("/payments")
		payments.Use(auth.AuthRequired(jwtSecret))
		{
			payments.POST("/escrow", paymentHandler.CreateEscrowPayment)
			payments.POST("/release", paymentHandler.ReleasePayment)
			payments.POST("/refund", paymentHandler.RefundPayment)
		}

		// Notification routes (protected)
		notifications := api.Group("/notifications")
		notifications.Use(auth.AuthRequired(jwtSecret))
		{
			notifications.GET("", notificationHandler.GetNotifications)
			notifications.GET("/unread-count", notificationHandler.GetUnreadCount)
			notifications.POST("/:id/read", notificationHandler.MarkAsRead)
			notifications.POST("/read-all", notificationHandler.MarkAllAsRead)
			notifications.DELETE("/:id", notificationHandler.DeleteNotification)
		}

		// WebSocket route
		api.GET("/ws", websocketHandler.HandleWebSocket)

		// Conversation/Message routes (protected)
		conversations := api.Group("/conversations")
		conversations.Use(auth.AuthRequired(jwtSecret))
		{
			conversations.GET("", messageHandler.GetConversations)
			conversations.POST("", messageHandler.CreateConversation)
			conversations.GET("/:id/messages", messageHandler.GetConversationMessages)
		}
	}

	// 8. Start server
	addr := "0.0.0.0:" + port
	log.Printf("Test server starting on %s", addr)
	log.Printf("Health: GET %s/api/v1/health", serverURL)
	if err := router.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
