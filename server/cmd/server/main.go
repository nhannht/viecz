package main

import (
	"log"
	"os"
	"strconv"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"viecz.vieczserver/internal/auth"
	"viecz.vieczserver/internal/config"
	"viecz.vieczserver/internal/database"
	"viecz.vieczserver/internal/handlers"
	"viecz.vieczserver/internal/middleware"
	"viecz.vieczserver/internal/repository"
	"viecz.vieczserver/internal/services"
	"viecz.vieczserver/internal/websocket"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize Sentry (optional — empty DSN = disabled)
	if cfg.SentryDSN != "" {
		if err := sentry.Init(sentry.ClientOptions{
			Dsn:              cfg.SentryDSN,
			Environment:      cfg.Env,
			TracesSampleRate: 0.2,
			EnableTracing:    true,
		}); err != nil {
			log.Printf("WARNING: Sentry init failed: %v", err)
		} else {
			log.Println("Sentry error tracking enabled")
		}
		defer sentry.Flush(2 * time.Second)
	}

	// Initialize GORM database connection
	dbPort, err := strconv.Atoi(cfg.DBPort)
	if err != nil {
		log.Fatalf("Invalid DB_PORT: %v", err)
	}

	db, err := database.NewGORM(
		database.WithHost(cfg.DBHost),
		database.WithPort(dbPort),
		database.WithUser(cfg.DBUser),
		database.WithPassword(cfg.DBPassword),
		database.WithDatabase(cfg.DBName),
		database.WithSSLMode(cfg.DBSSLMode),
	)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	log.Println("Database connected successfully")

	// Run GORM auto migrations
	if err := database.AutoMigrate(db); err != nil {
		log.Printf("Auto migration warning: %v (continuing anyway)", err)
	}

	// Seed initial data (categories and test user)
	log.Println("Seeding initial data...")
	if err := database.SeedData(db); err != nil {
		log.Printf("Seed data warning: %v (continuing anyway)", err)
	}

	// Initialize GORM repositories
	userRepo := repository.NewUserGormRepository(db)
	taskRepo := repository.NewTaskGormRepository(db)
	applicationRepo := repository.NewTaskApplicationGormRepository(db)
	categoryRepo := repository.NewCategoryGormRepository(db)
	transactionRepo := repository.NewTransactionGormRepository(db)
	walletRepo := repository.NewWalletGormRepository(db)
	walletTransactionRepo := repository.NewWalletTransactionGormRepository(db)
	conversationRepo := repository.NewConversationGormRepository(db)
	messageRepo := repository.NewMessageGormRepository(db)

	// Initialize services
	emailVerifier := services.NewRealEmailVerifier()

	// Initialize email service (real SMTP if configured, no-op otherwise)
	var emailService services.EmailService
	if cfg.SMTPHost != "" {
		emailService = services.NewRealEmailService(
			cfg.SMTPHost, cfg.SMTPPort,
			cfg.SMTPUser, cfg.SMTPPassword,
			cfg.SMTPFrom, cfg.ClientURL,
		)
		log.Printf("SMTP email service enabled: %s:%d", cfg.SMTPHost, cfg.SMTPPort)
	} else {
		emailService = &services.NoOpEmailService{}
		log.Println("SMTP not configured, email service disabled")
	}

	authService := auth.NewAuthService(userRepo, emailVerifier, emailService, cfg.JWTSecret)

	// Initialize Google OAuth service
	googleOAuthService, err := auth.NewGoogleOAuthService(
		cfg.GoogleClientID,
		cfg.GoogleClientSecret,
		"", // redirectURL not needed for ID token verification
	)
	if err != nil {
		log.Fatalf("Failed to initialize Google OAuth service: %v", err)
	}

	userService := services.NewUserService(userRepo, taskRepo)
	// Initialize wallet and payment services (Phase 3)
	walletService := services.NewWalletService(walletRepo, walletTransactionRepo, db, cfg.MaxWalletBalance)

	// Initialize WebSocket Hub
	hub := websocket.NewHub()
	go hub.Run()
	log.Println("WebSocket Hub started")

	// Initialize notification service
	notificationRepo := repository.NewNotificationGormRepository(db)
	notificationService := services.NewNotificationService(notificationRepo, hub)

	// Initialize search service (optional — falls back to LIKE if not configured)
	var searchService services.SearchServicer
	if cfg.MeilisearchURL != "" {
		ms, err := services.NewMeilisearchService(cfg.MeilisearchURL, cfg.MeilisearchAPIKey)
		if err != nil {
			log.Printf("WARNING: Meilisearch init failed, falling back to DB search: %v", err)
			searchService = &services.NoOpSearchService{}
		} else {
			searchService = ms
			log.Printf("Meilisearch enabled: %s", cfg.MeilisearchURL)
		}
	} else {
		searchService = &services.NoOpSearchService{}
	}

	// Initialize PayOS service (deposit + payout channels)
	payosService, err := services.NewPayOSService(
		cfg.PayOSClientID,
		cfg.PayOSAPIKey,
		cfg.PayOSChecksumKey,
		cfg.PayOSPayoutClientID,
		cfg.PayOSPayoutAPIKey,
		cfg.PayOSPayoutChecksumKey,
	)
	if err != nil {
		log.Fatalf("Failed to initialize PayOS service: %v", err)
	}

	// Initialize payment orchestration service (Phase 3)
	paymentService := services.NewPaymentService(
		transactionRepo,
		taskRepo,
		applicationRepo,
		walletService,
		cfg.PlatformFeeRate,
		notificationService,
		db,
		searchService,
	)

	taskService := services.NewTaskService(taskRepo, applicationRepo, categoryRepo, userRepo, walletService, notificationService, db, searchService, paymentService)

	// Initialize message service (Phase 4)
	messageService := services.NewMessageService(messageRepo, conversationRepo, hub)

	// Initialize Turnstile service (optional — nil = skip bot validation)
	var turnstileService *services.TurnstileService
	if cfg.TurnstileSecretKey != "" {
		turnstileService = services.NewTurnstileService(cfg.TurnstileSecretKey)
		log.Println("Cloudflare Turnstile bot protection enabled")
	} else {
		log.Println("Turnstile not configured, bot validation disabled")
	}

	// Initialize GORM repositories (bank accounts)
	bankAccountRepo := repository.NewBankAccountGormRepository(db)

	// Initialize Firebase phone verification (optional — nil = phone verification disabled)
	var firebaseVerifier auth.FirebaseVerifier
	if cfg.FirebaseCredentialsFile != "" {
		fbSvc, err := auth.NewFirebaseService(cfg.FirebaseCredentialsFile)
		if err != nil {
			log.Printf("Warning: Firebase not available: %v", err)
		} else {
			firebaseVerifier = fbSvc
			log.Println("Firebase Phone Auth enabled")
		}
	} else {
		log.Println("FIREBASE_CREDENTIALS_FILE not set, phone verification disabled")
	}

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService, googleOAuthService, cfg.JWTSecret, turnstileService, firebaseVerifier, userRepo)
	userHandler := handlers.NewUserHandler(userService)
	paymentHandler := handlers.NewPaymentHandler(payosService, paymentService, cfg.ClientURL, cfg.PayOSReturnBaseURL)
	refRepo := repository.NewPaymentReferenceGormRepository(db)
	webhookHandler := handlers.NewWebhookHandler(payosService, transactionRepo, taskRepo, walletService, refRepo)
	returnHandler := handlers.NewReturnHandler(payosService, cfg.ClientURL)
	taskHandler := handlers.NewTaskHandler(taskService, applicationRepo)
	notificationHandler := handlers.NewNotificationHandler(notificationService)
	categoryHandler := handlers.NewCategoryHandler(categoryRepo)
	walletHandler := handlers.NewWalletHandlerWithWithdrawal(walletService, payosService, transactionRepo, taskRepo, bankAccountRepo, cfg.PayOSReturnBaseURL, cfg.MinWithdrawalAmount, cfg.MaxWithdrawalAmount)
	bankAccountHandler := handlers.NewBankAccountHandler(bankAccountRepo)
	websocketHandler := handlers.NewWebSocketHandler(hub, messageService, cfg.JWTSecret)
	messageHandler := handlers.NewMessageHandler(messageService)
	uploadHandler := handlers.NewUploadHandler("./uploads", userService)

	// Maps proxy handler (optional — only enabled if GOOGLE_MAPS_SERVER_KEY is set)
	var mapsHandler *handlers.MapsHandler
	if cfg.GoogleMapsServerKey != "" {
		mapsHandler = handlers.NewMapsHandler(cfg.GoogleMapsServerKey)
		log.Println("Google Maps static proxy enabled")
	} else {
		log.Println("GOOGLE_MAPS_SERVER_KEY not set, static maps proxy disabled")
	}

	// Geocoding proxy handler (self-hosted Nominatim)
	geocodingHandler := handlers.NewGeocodingHandler(cfg.NominatimURL)
	log.Printf("Geocoding proxy enabled: %s", cfg.NominatimURL)

	// Ensure upload directories exist
	if err := os.MkdirAll("./uploads/avatars", 0755); err != nil {
		log.Printf("Warning: failed to create uploads directory: %v", err)
	}

	// Set Gin mode based on environment
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize enhanced health handler
	healthHandler := handlers.NewHealthHandler(db)

	// Create Gin router
	router := gin.Default()

	// Trust Cloudflare's CF-Connecting-IP header for real client IP.
	// This has higher priority than X-Forwarded-For and cannot be spoofed by clients.
	router.TrustedPlatform = gin.PlatformCloudflare

	// Middleware chain: request logging → Sentry → CORS → Prometheus
	router.Use(middleware.RequestLogger())
	router.Use(middleware.SentryMiddleware())
	router.Use(middleware.CORS(cfg.ClientURL))
	router.Use(middleware.PrometheusMiddleware())

	// Prometheus metrics endpoint (unprotected, outside /api/v1)
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// Serve .well-known for Android App Links (deep link verification)
	router.Static("/.well-known", "./static/.well-known")

	// Serve uploaded files (avatars, etc.)
	router.Static("/uploads", "./uploads")

	// Serve privacy policy
	router.StaticFile("/privacy-policy", "./static/privacy-policy.html")

	// --- Rate limit helpers ---
	// When disabled, MaxRequests=0 makes the middleware a pass-through.
	rlLimit := func(perMin int) int {
		if !cfg.RateLimitEnabled {
			return 0
		}
		return perMin
	}
	authRL := middleware.RateLimit(middleware.RateLimitConfig{
		Window: time.Minute, MaxRequests: rlLimit(cfg.RateLimitAuthPerMin), KeyFunc: middleware.IPKey,
	})
	publicReadRL := middleware.RateLimit(middleware.RateLimitConfig{
		Window: time.Minute, MaxRequests: rlLimit(cfg.RateLimitReadPerMin), KeyFunc: middleware.UserOrIPKey,
	})
	apiWriteRL := middleware.RateLimit(middleware.RateLimitConfig{
		Window: time.Minute, MaxRequests: rlLimit(cfg.RateLimitAPIPerMin), KeyFunc: middleware.UserKey,
	})
	walletRL := middleware.RateLimit(middleware.RateLimitConfig{
		Window: time.Minute, MaxRequests: rlLimit(cfg.RateLimitAPIPerMin), KeyFunc: middleware.UserKey,
	})
	financeRL := middleware.RateLimit(middleware.RateLimitConfig{
		Window: time.Minute, MaxRequests: rlLimit(cfg.RateLimitFinancePerMin), KeyFunc: middleware.UserKey,
	})
	highFreqRL := middleware.RateLimit(middleware.RateLimitConfig{
		Window: time.Minute, MaxRequests: rlLimit(cfg.RateLimitReadPerMin), KeyFunc: middleware.UserKey,
	})
	profileRL := middleware.RateLimit(middleware.RateLimitConfig{
		Window: time.Minute, MaxRequests: rlLimit(cfg.RateLimitAPIPerMin), KeyFunc: middleware.UserKey,
	})
	categoryRL := middleware.RateLimit(middleware.RateLimitConfig{
		Window: time.Minute, MaxRequests: rlLimit(cfg.RateLimitAPIPerMin), KeyFunc: middleware.IPKey,
	})

	if cfg.RateLimitEnabled {
		log.Printf("Rate limiting enabled: auth=%d/min, api=%d/min, read=%d/min, finance=%d/min",
			cfg.RateLimitAuthPerMin, cfg.RateLimitAPIPerMin, cfg.RateLimitReadPerMin, cfg.RateLimitFinancePerMin)
	} else {
		log.Println("Rate limiting disabled")
	}

	// API routes
	api := router.Group("/api/v1")
	{
		// Health check (enhanced — checks DB connectivity)
		api.GET("/health", healthHandler.Health)

		// Auth routes (public) — IP-based rate limit
		authRoutes := api.Group("/auth")
		authRoutes.Use(authRL)
		{
			authRoutes.POST("/register", authHandler.Register)
			authRoutes.POST("/login", authHandler.Login)
			authRoutes.POST("/google", authHandler.GoogleLogin)
			authRoutes.POST("/phone", authHandler.PhoneLogin)
			authRoutes.POST("/refresh", authHandler.RefreshToken)
			authRoutes.POST("/verify-email", authHandler.VerifyEmail)
		}

		// Auth routes (authenticated)
		authProtected := api.Group("/auth")
		authProtected.Use(auth.AuthRequired(cfg.JWTSecret), middleware.SetSentryUser(), profileRL)
		{
			authProtected.POST("/resend-verification", authHandler.ResendVerification)
			authProtected.POST("/verify-phone", authHandler.VerifyPhone)
		}

		// Payment routes — public (PayOS callback + browser redirect) — NO rate limit
		payment := api.Group("/payment")
		{
			payment.GET("/return", returnHandler.HandleReturn)
			payment.POST("/webhook", webhookHandler.HandleWebhook)
		}
		// Payment routes — protected (requires auth)
		paymentProtected := api.Group("/payment")
		paymentProtected.Use(auth.AuthRequired(cfg.JWTSecret), financeRL)
		{
			paymentProtected.POST("/create", paymentHandler.CreatePayment)
			paymentProtected.POST("/confirm-webhook", webhookHandler.ConfirmWebhook)
		}

		// Category routes (public)
		categoriesGroup := api.Group("")
		categoriesGroup.Use(categoryRL)
		{
			categoriesGroup.GET("/categories", categoryHandler.GetCategories)
		}

		// Bank list route (public, cached from VietQR)
		bankListHandler := handlers.NewBankListHandler()
		bankListGroup := api.Group("")
		bankListGroup.Use(categoryRL)
		{
			bankListGroup.GET("/banks", bankListHandler.GetBanks)
		}

		// Maps proxy (public, cached at Cloudflare edge)
		if mapsHandler != nil {
			mapsGroup := api.Group("/maps")
			mapsGroup.Use(publicReadRL)
			{
				mapsGroup.GET("/static", mapsHandler.GetStaticMap)
			}
		}

		// Geocoding proxy (public, proxies to self-hosted Nominatim)
		geocodeGroup := api.Group("/geocode")
		geocodeGroup.Use(publicReadRL)
		{
			geocodeGroup.GET("/search", geocodingHandler.Search)
			geocodeGroup.GET("/reverse", geocodingHandler.Reverse)
		}

		// User routes
		users := api.Group("/users")
		{
			// Public routes
			publicUsers := users.Group("")
			publicUsers.Use(publicReadRL)
			{
				publicUsers.GET("/:id", userHandler.GetProfile)
			}

			// Protected routes
			protected := users.Group("")
			protected.Use(auth.AuthRequired(cfg.JWTSecret), profileRL)
			{
				protected.GET("/me", userHandler.GetMyProfile)
				protected.PUT("/me", userHandler.UpdateProfile)
				protected.POST("/me/avatar", uploadHandler.UploadAvatar)
			}
		}

		// Task routes — public (read-only, optional auth for user context)
		publicTasks := api.Group("/tasks")
		publicTasks.Use(auth.OptionalAuth(cfg.JWTSecret), publicReadRL)
		{
			publicTasks.GET("", taskHandler.ListTasks)
			publicTasks.GET("/:id", taskHandler.GetTask)
		}

		// Task routes — protected (write operations, email verified required)
		tasks := api.Group("/tasks")
		tasks.Use(auth.AuthRequired(cfg.JWTSecret), apiWriteRL)
		{
			tasks.POST("", taskHandler.CreateTask)
			tasks.PUT("/:id", taskHandler.UpdateTask)
			tasks.DELETE("/:id", taskHandler.DeleteTask)
			tasks.POST("/:id/applications", taskHandler.ApplyForTask)
			tasks.GET("/:id/applications", taskHandler.GetTaskApplications)
			tasks.POST("/:id/complete", taskHandler.CompleteTask)
		}

		// Application routes (protected, email verified required)
		applications := api.Group("/applications")
		applications.Use(auth.AuthRequired(cfg.JWTSecret), apiWriteRL)
		{
			applications.POST("/:id/accept", taskHandler.AcceptApplication)
		}

		// Wallet routes (protected) - Phase 3
		wallet := api.Group("/wallet")
		wallet.Use(auth.AuthRequired(cfg.JWTSecret), walletRL)
		{
			wallet.GET("", walletHandler.GetWallet)
			wallet.POST("/deposit", auth.PhoneVerifiedRequired(userRepo), walletHandler.Deposit)
			wallet.GET("/deposit/status/:orderCode", walletHandler.GetDepositStatus)
			wallet.GET("/transactions", walletHandler.GetTransactionHistory)
			wallet.GET("/bank-accounts", bankAccountHandler.ListBankAccounts)
			wallet.POST("/bank-accounts", bankAccountHandler.AddBankAccount)
			wallet.DELETE("/bank-accounts/:id", bankAccountHandler.DeleteBankAccount)
			wallet.POST("/withdraw", auth.PhoneVerifiedRequired(userRepo), financeRL, walletHandler.HandleWithdrawal)
		}

		// Payment routes (protected, email verified required) - Phase 3
		payments := api.Group("/payments")
		payments.Use(auth.AuthRequired(cfg.JWTSecret), financeRL)
		{
			payments.POST("/escrow", auth.PhoneVerifiedRequired(userRepo), paymentHandler.CreateEscrowPayment)
			payments.POST("/release", paymentHandler.ReleasePayment)
			payments.POST("/refund", paymentHandler.RefundPayment)
		}

		// Notification routes (protected)
		notifications := api.Group("/notifications")
		notifications.Use(auth.AuthRequired(cfg.JWTSecret), highFreqRL)
		{
			notifications.GET("", notificationHandler.GetNotifications)
			notifications.GET("/unread-count", notificationHandler.GetUnreadCount)
			notifications.POST("/:id/read", notificationHandler.MarkAsRead)
			notifications.POST("/read-all", notificationHandler.MarkAllAsRead)
			notifications.DELETE("/:id", notificationHandler.DeleteNotification)
		}

		// WebSocket route (protected via query param) - Phase 4 — NO rate limit
		api.GET("/ws", websocketHandler.HandleWebSocket)

		// Conversation/Message routes (protected, email verified required)
		conversations := api.Group("/conversations")
		conversations.Use(auth.AuthRequired(cfg.JWTSecret), highFreqRL)
		{
			conversations.GET("", messageHandler.GetConversations)
			conversations.POST("", messageHandler.CreateConversation)
			conversations.GET("/:id", messageHandler.GetConversation)
			conversations.GET("/:id/messages", messageHandler.GetConversationMessages)
		}
	}

	// Start payout status poller (checks pending PayOS payouts every 30s)
	payoutPoller := services.NewPayoutPoller(transactionRepo, walletService, payosService, db, 30*time.Second)
	payoutPoller.Start()
	defer payoutPoller.Stop()

	// Start server
	addr := ":" + cfg.Port
	log.Printf("Server starting on %s in %s mode", addr, cfg.Env)
	log.Printf("Client URL: %s", cfg.ClientURL)

	if err := router.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
