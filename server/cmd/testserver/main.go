package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
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
// Payouts are auto-completed (stored in memory, GetPayout returns SUCCEEDED).
type mockPayOS struct {
	payouts    sync.Map // payoutID -> true (all payouts auto-succeed)
	returnURLs sync.Map // orderCode -> returnURL (for mock checkout redirect)
}

var _ services.PayOSServicer = (*mockPayOS)(nil)

func (m *mockPayOS) CreatePaymentLink(_ context.Context, orderCode int64, amount int, description, returnURL, cancelURL string) (*services.PaymentLinkResponse, error) {
	// Store returnURL for mock checkout page redirect
	if returnURL != "" {
		m.returnURLs.Store(orderCode, returnURL)
	}

	// Fire webhook in background to auto-complete deposit after 10s delay
	// so the Terminal Receipt UI is visible for testing
	go func() {
		time.Sleep(10 * time.Second)

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

	// Return realistic mock data so the Terminal Receipt UI renders properly
	mockAccountNumber := "000336657"
	mockAccountName := "CONG TY CP VIECZ TEST"
	// Simplified VietQR-like string that the qrcode library can render
	mockQrCode := fmt.Sprintf("00020101021238570010A000000727012700069704030113%s0208QRIBFTTA5303704540%d5802VN6209%s6304ABCD",
		mockAccountNumber, amount, description)

	return &services.PaymentLinkResponse{
		CheckoutUrl:   fmt.Sprintf("%s/mock-checkout/%d", serverURL, orderCode),
		PaymentLinkId: fmt.Sprintf("pl_%d", orderCode),
		OrderCode:     orderCode,
		Amount:        amount,
		Status:        "PENDING",
		QrCode:        mockQrCode,
		AccountNumber: mockAccountNumber,
		AccountName:   mockAccountName,
		Bin:           "970422", // MB Bank BIN for testing
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

func (m *mockPayOS) CreatePayout(_ context.Context, referenceID string, amount int, description, toBin, toAccountNumber string) (*services.PayoutResponse, error) {
	payoutID := fmt.Sprintf("mock_payout_%s_%d", referenceID, time.Now().UnixMilli())
	m.payouts.Store(payoutID, true)
	log.Printf("[MockPayOS] Created payout: id=%s, ref=%s, amount=%d, bin=%s, account=%s", payoutID, referenceID, amount, toBin, toAccountNumber)
	return &services.PayoutResponse{
		ID:            payoutID,
		ReferenceID:   referenceID,
		ApprovalState: "APPROVED",
	}, nil
}

func (m *mockPayOS) GetPayout(_ context.Context, payoutID string) (*services.PayoutStatusResponse, error) {
	if _, ok := m.payouts.Load(payoutID); !ok {
		return nil, fmt.Errorf("payout not found: %s", payoutID)
	}
	// Mock payouts auto-succeed
	return &services.PayoutStatusResponse{
		ID:    payoutID,
		State: "SUCCEEDED",
	}, nil
}

func (m *mockPayOS) CancelPaymentLink(_ context.Context, _ int64, _ string) error {
	return nil
}

// dropAllTables drops all tables for a fresh database on each test server start.
func dropAllTables(db *gorm.DB) {
	tables := []string{
		"notifications", "messages", "conversations",
		"wallet_transactions", "wallets", "transactions",
		"bank_accounts", "task_applications", "tasks", "categories", "users",
	}
	for _, table := range tables {
		db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s CASCADE", table))
	}
	log.Println("Dropped all tables for fresh start")
}

func main() {
	log.Println("=== Viecz Test Server ===")
	log.Println("PostgreSQL (port 5433) | Mock PayOS | Auto-complete deposits")

	// Initialize Sentry (defaults to viecz-server project; override with SENTRY_DSN env var)
	sentryDSN := getEnvDefault("SENTRY_DSN", "https://a2beebfa6dfe4731a997600d29dae69c@glitchtip.fishcmus.io.vn/1")
	if sentryDSN != "" {
		if err := sentry.Init(sentry.ClientOptions{
			Dsn:              sentryDSN,
			Environment:      "development",
			TracesSampleRate: 0.2,
			EnableTracing:    true,
		}); err != nil {
			log.Printf("WARNING: Sentry init failed: %v", err)
		} else {
			log.Println("Sentry error tracking enabled (development)")
		}
		defer sentry.Flush(2 * time.Second)
	}

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
	otpRepo := repository.NewOTPGormRepository(db)
	otpService := services.NewOTPService(otpRepo, emailService)
	authService := auth.NewAuthService(userRepo, &services.NoOpEmailVerifier{}, emailService, otpService, jwtSecret)

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

	// Start payout poller for test server (5s interval for faster feedback)
	payoutPoller := services.NewPayoutPoller(transactionRepo, walletService, mockPayOS, db, 5*time.Second)
	payoutPoller.Start()
	defer payoutPoller.Stop()

	paymentService := services.NewPaymentService(
		transactionRepo, taskRepo, applicationRepo, walletService, 0, notificationService, db, searchService,
	)

	taskService := services.NewTaskService(taskRepo, applicationRepo, categoryRepo, userRepo, walletService, notificationService, db, searchService, paymentService)

	messageService := services.NewMessageService(messageRepo, conversationRepo, hub)

	// Bank account repository
	bankAccountRepo := repository.NewBankAccountGormRepository(db)

	// Firebase phone auth (real verification, same as production)
	firebaseVerifier, err := auth.NewFirebaseService("firebase-service-account.json")
	if err != nil {
		log.Fatalf("Failed to initialize Firebase: %v\nHint: place firebase-service-account.json in server/", err)
	}
	log.Println("Firebase phone auth enabled")

	// 6. Handlers
	authHandler := handlers.NewAuthHandler(authService, googleOAuthService, jwtSecret, nil, firebaseVerifier, userRepo, true)
	userHandler := handlers.NewUserHandler(userService)
	paymentHandler := handlers.NewPaymentHandler(nil, paymentService, serverURL, serverURL) // serverURL used as payosReturnBaseURL for test
	refRepo := repository.NewPaymentReferenceGormRepository(db)
	webhookHandler := handlers.NewWebhookHandler(mockPayOS, transactionRepo, taskRepo, walletService, refRepo)
	taskHandler := handlers.NewTaskHandler(taskService, applicationRepo)
	notificationHandler := handlers.NewNotificationHandler(notificationService)
	categoryHandler := handlers.NewCategoryHandler(categoryRepo)
	walletHandler := handlers.NewWalletHandlerWithWithdrawal(walletService, mockPayOS, transactionRepo, taskRepo, bankAccountRepo, serverURL, 10000, 200000)
	bankAccountHandler := handlers.NewBankAccountHandler(bankAccountRepo)
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
	router.Use(middleware.RequestLogger())
	router.Use(middleware.SentryMiddleware())
	router.Use(middleware.CORS("*"))
	router.Use(middleware.PrometheusMiddleware())

	// Prometheus metrics endpoint
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// Serve uploaded files (avatars, etc.)
	router.Static("/uploads", "./uploads")

	// Mock checkout page — simulates PayOS payment page, redirects back to app
	// Uses Android Intent URI because Chrome blocks custom scheme (viecz://) navigation
	router.GET("/mock-checkout/:orderCode", func(c *gin.Context) {
		orderCode := c.Param("orderCode")

		// Android Intent URI — Chrome will open the app via intent filter
		intentURI := fmt.Sprintf("intent://payment/return?status=success&orderCode=%s#Intent;scheme=viecz;end", orderCode)

		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusOK, fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Mock Payment</title>
    <style>
        body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
        .card { background: white; border-radius: 12px; padding: 32px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 400px; }
        h2 { color: #16a34a; margin-bottom: 8px; }
        p { color: #666; margin-bottom: 24px; }
        .amount { font-size: 24px; font-weight: bold; color: #1a1a1a; }
        a { display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; }
        .auto { color: #999; font-size: 14px; margin-top: 16px; }
    </style>
</head>
<body>
    <div class="card">
        <h2>Payment Successful</h2>
        <p>Order #%s</p>
        <p class="amount">Mock PayOS — Auto-completed</p>
        <a id="returnBtn" href="%s">Return to App</a>
        <p class="auto">Redirecting automatically in 2 seconds...</p>
    </div>
    <script>setTimeout(function(){ window.location.href = "%s"; }, 2000);</script>
</body>
</html>`, orderCode, intentURI, intentURI))
	})

	api := router.Group("/api/v1")
	{
		// Health check (enhanced — checks DB connectivity)
		healthHandler := handlers.NewHealthHandler(db)
		api.GET("/health", healthHandler.Health)

		// Auth routes (public)
		authRoutes := api.Group("/auth")
		{
			authRoutes.POST("/otp/request", authHandler.RequestOTP)
			authRoutes.POST("/otp/verify", func(c *gin.Context) {
				authHandler.VerifyOTP(c)
				if c.Writer.Status() == http.StatusOK {
					// Auto-credit wallet for new test users
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
							email := ""
							if user.Email != nil {
								email = *user.Email
							}
							log.Printf("[TestServer] Auto-seeded 100,000 VND for new user %d (%s)", user.ID, email)
						}
					}()
				}
			})
			authRoutes.POST("/google", authHandler.GoogleLogin)
			authRoutes.POST("/phone", authHandler.PhoneLogin)
			authRoutes.POST("/refresh", authHandler.RefreshToken)
			authRoutes.POST("/verify-email", authHandler.VerifyEmail)
		}

		// Auth routes (authenticated) — resend verification + phone verification
		authProtected := api.Group("/auth")
		authProtected.Use(auth.AuthRequired(jwtSecret))
		{
			authProtected.POST("/resend-verification", authHandler.ResendVerification)
			authProtected.POST("/verify-phone", authHandler.VerifyPhone)
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

		// Bank list route (public, cached from VietQR)
		bankListHandler := handlers.NewBankListHandler()
		api.GET("/banks", bankListHandler.GetBanks)

		// Maps proxy (uses env var GOOGLE_MAPS_SERVER_KEY if set, or test key)
		mapsKey := os.Getenv("GOOGLE_MAPS_SERVER_KEY")
		if mapsKey != "" {
			mapsHandler := handlers.NewMapsHandler(mapsKey)
			api.GET("/maps/static", mapsHandler.GetStaticMap)
			log.Println("Static maps proxy enabled")
		}

		// Geocoding proxy (self-hosted Nominatim)
		nominatimURL := getEnvDefault("NOMINATIM_URL", "http://127.0.0.1:8085")
		geocodingHandler := handlers.NewGeocodingHandler(nominatimURL)
		geocodeGroup := api.Group("/geocode")
		{
			geocodeGroup.GET("/search", geocodingHandler.Search)
			geocodeGroup.GET("/reverse", geocodingHandler.Reverse)
		}
		log.Printf("Geocoding proxy enabled: %s", nominatimURL)

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
			wallet.GET("/deposit/status/:orderCode", walletHandler.GetDepositStatus)
			wallet.GET("/transactions", walletHandler.GetTransactionHistory)
			wallet.GET("/bank-accounts", bankAccountHandler.ListBankAccounts)
			wallet.POST("/bank-accounts", bankAccountHandler.AddBankAccount)
			wallet.DELETE("/bank-accounts/:id", bankAccountHandler.DeleteBankAccount)
			wallet.POST("/withdraw", walletHandler.HandleWithdrawal)
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

func getEnvDefault(key, defaultValue string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultValue
}
