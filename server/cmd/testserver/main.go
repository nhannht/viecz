package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

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

// dropAllTables drops all tables for a fresh database on each test server start.
func dropAllTables(db *gorm.DB) {
	tables := []string{
		"notifications", "messages", "conversations",
		"wallet_transactions", "wallets", "transactions",
		"task_applications", "tasks", "categories", "users",
	}
	for _, table := range tables {
		db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s CASCADE", table))
	}
	log.Println("Dropped all tables for fresh start")
}

func main() {
	log.Println("=== Viecz Test Server ===")
	log.Println("PostgreSQL (port 5433) | Mock PayOS | Auto-complete deposits")

	// 1. PostgreSQL test database (docker-compose.testdb.yml)
	db, err := database.NewGORM(
		database.WithHost("localhost"),
		database.WithPort(5433),
		database.WithUser("postgres"),
		database.WithPassword("testpass"),
		database.WithDatabase("viecz_test"),
		database.WithSSLMode("disable"),
	)
	if err != nil {
		log.Fatalf("Failed to connect to test database: %v\nHint: run 'docker compose -f docker-compose.testdb.yml up -d' first", err)
	}

	// Drop all tables for a fresh start (equivalent to in-memory SQLite reset)
	dropAllTables(db)

	// 2. AutoMigrate all tables
	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("AutoMigrate failed: %v", err)
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
	emailService := services.NewRealEmailService(
		"localhost", 1025,
		"", "", // Mailpit: no auth required
		"noreply@viecz.local", "http://localhost:4200",
	)
	authService := auth.NewAuthService(userRepo, &services.NoOpEmailVerifier{}, emailService, jwtSecret)

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

	userService := services.NewUserService(userRepo, taskRepo)
	walletService := services.NewWalletService(walletRepo, walletTransactionRepo, db, 200000)

	// WebSocket Hub
	hub := websocket.NewHub()
	go hub.Run()

	// Notification service
	notificationRepo := repository.NewNotificationGormRepository(db)
	notificationService := services.NewNotificationService(notificationRepo, hub)

	// Initialize search service (optional for test server)
	var searchService services.SearchServicer
	meilisearchURL := os.Getenv("MEILISEARCH_URL")
	if meilisearchURL == "" {
		meilisearchURL = "http://localhost:7700"
	}
	ms, msErr := services.NewMeilisearchService(meilisearchURL, "")
	if msErr != nil {
		log.Printf("Meilisearch not available, using DB search: %v", msErr)
		searchService = &services.NoOpSearchService{}
	} else {
		searchService = ms
		log.Println("Meilisearch enabled for test server")

		// Bulk index seed tasks
		var seedTasks []*models.Task
		db.Where("status = ?", "open").Find(&seedTasks)
		if len(seedTasks) > 0 {
			if err := searchService.BulkIndexTasks(context.Background(), seedTasks); err != nil {
				log.Printf("Failed to bulk index seed tasks: %v", err)
			} else {
				log.Printf("Bulk indexed %d seed tasks into Meilisearch", len(seedTasks))
			}
		}
	}

	mockPayOS := &mockPayOS{}

	paymentService := services.NewPaymentService(
		transactionRepo, taskRepo, applicationRepo, walletService, 0, notificationService, db, searchService,
	)

	taskService := services.NewTaskService(taskRepo, applicationRepo, categoryRepo, userRepo, walletService, notificationService, db, searchService, paymentService)

	messageService := services.NewMessageService(messageRepo, conversationRepo, hub)

	// 6. Handlers
	authHandler := handlers.NewAuthHandler(authService, googleOAuthService, jwtSecret)
	userHandler := handlers.NewUserHandler(userService)
	paymentHandler := handlers.NewPaymentHandler(nil, paymentService, serverURL, serverURL) // serverURL used as payosReturnBaseURL for test
	webhookHandler := handlers.NewWebhookHandler(mockPayOS, transactionRepo, taskRepo, walletService)
	taskHandler := handlers.NewTaskHandler(taskService, applicationRepo)
	notificationHandler := handlers.NewNotificationHandler(notificationService)
	categoryHandler := handlers.NewCategoryHandler(categoryRepo)
	walletHandler := handlers.NewWalletHandler(walletService, mockPayOS, transactionRepo, taskRepo, serverURL)
	websocketHandler := handlers.NewWebSocketHandler(hub, messageService, jwtSecret)
	messageHandler := handlers.NewMessageHandler(messageService)
	uploadHandler := handlers.NewUploadHandler("./uploads", userService)

	// Ensure upload directories exist
	if err := os.MkdirAll("./uploads/avatars", 0755); err != nil {
		log.Printf("Warning: failed to create uploads directory: %v", err)
	}

	// 7. Gin router (mirrors cmd/server/main.go routes exactly)
	gin.SetMode(gin.DebugMode)
	router := gin.Default()
	router.Use(middleware.CORS("*"))

	// Serve uploaded files (avatars, etc.)
	router.Static("/uploads", "./uploads")

	api := router.Group("/api/v1")
	{
		// Health check
		api.GET("/health", paymentHandler.Health)

		// Auth routes (public)
		authRoutes := api.Group("/auth")
		{
			authRoutes.POST("/register", func(c *gin.Context) {
				authHandler.Register(c)
				if c.Writer.Status() == http.StatusCreated || c.Writer.Status() == http.StatusOK {
					// Auto-credit wallet for test users (email verification via Mailpit)
					go func() {
						time.Sleep(200 * time.Millisecond)
						var user models.User
						if err := db.Order("id DESC").First(&user).Error; err != nil {
							log.Printf("[TestServer] Failed to find new user for wallet seed: %v", err)
							return
						}
						wallet, err := walletService.GetOrCreateWallet(context.Background(), user.ID)
						if err != nil {
							log.Printf("[TestServer] Failed to create wallet for user %d: %v", user.ID, err)
							return
						}
						if wallet.Balance == 0 {
							wallet.Balance = 100000
							wallet.TotalDeposited = 100000
							if err := db.Save(wallet).Error; err != nil {
								log.Printf("[TestServer] Failed to seed wallet for user %d: %v", user.ID, err)
								return
							}
							log.Printf("[TestServer] Auto-seeded 100,000 VND for new user %d (%s)", user.ID, user.Email)
						}
					}()
				}
			})
			authRoutes.POST("/login", authHandler.Login)
			authRoutes.POST("/google", authHandler.GoogleLogin)
			authRoutes.POST("/refresh", authHandler.RefreshToken)
			authRoutes.POST("/verify-email", authHandler.VerifyEmail)
		}

		// Auth routes (authenticated) — resend verification
		authProtected := api.Group("/auth")
		authProtected.Use(auth.AuthRequired(jwtSecret))
		{
			authProtected.POST("/resend-verification", authHandler.ResendVerification)
		}

		// Payment routes — public (mock PayOS webhook callback)
		payment := api.Group("/payment")
		{
			payment.POST("/webhook", webhookHandler.HandleWebhook)
		}
		// Payment routes — protected (requires auth)
		paymentProtected := api.Group("/payment")
		paymentProtected.Use(auth.AuthRequired(jwtSecret))
		{
			paymentProtected.POST("/confirm-webhook", webhookHandler.ConfirmWebhook)
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
				protected.POST("/me/avatar", uploadHandler.UploadAvatar)
				protected.POST("/become-tasker", userHandler.BecomeTasker)
			}
		}

		// Task routes — public (read-only, optional auth for user context)
		publicTasks := api.Group("/tasks")
		publicTasks.Use(auth.OptionalAuth(jwtSecret))
		{
			publicTasks.GET("", taskHandler.ListTasks)
			publicTasks.GET("/:id", taskHandler.GetTask)
		}

		// Task routes — protected (write operations)
		tasks := api.Group("/tasks")
		tasks.Use(auth.AuthRequired(jwtSecret))
		{
			tasks.POST("", taskHandler.CreateTask)
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
			conversations.GET("/:id", messageHandler.GetConversation)
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
