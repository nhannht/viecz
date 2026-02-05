package main

import (
	"log"
	"strconv"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/auth"
	"viecz.vieczserver/internal/config"
	"viecz.vieczserver/internal/database"
	"viecz.vieczserver/internal/handlers"
	"viecz.vieczserver/internal/middleware"
	"viecz.vieczserver/internal/repository"
	"viecz.vieczserver/internal/services"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
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

	// Initialize services
	authService := auth.NewAuthService(userRepo)
	userService := services.NewUserService(userRepo)
	taskService := services.NewTaskService(taskRepo, applicationRepo, categoryRepo, userRepo)

	// Initialize PayOS service
	payosService, err := services.NewPayOSService(
		cfg.PayOSClientID,
		cfg.PayOSAPIKey,
		cfg.PayOSChecksumKey,
	)
	if err != nil {
		log.Fatalf("Failed to initialize PayOS service: %v", err)
	}

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService, cfg.JWTSecret)
	userHandler := handlers.NewUserHandler(userService)
	paymentHandler := handlers.NewPaymentHandler(payosService, cfg.ClientURL)
	webhookHandler := handlers.NewWebhookHandler(payosService)
	returnHandler := handlers.NewReturnHandler(payosService, cfg.ClientURL)
	taskHandler := handlers.NewTaskHandler(taskService)
	categoryHandler := handlers.NewCategoryHandler(categoryRepo)

	// Set Gin mode based on environment
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Create Gin router
	router := gin.Default()

	// Apply CORS middleware
	router.Use(middleware.CORS(cfg.ClientURL))

	// API routes
	api := router.Group("/api/v1")
	{
		// Health check
		api.GET("/health", paymentHandler.Health)

		// Auth routes (public)
		authRoutes := api.Group("/auth")
		{
			authRoutes.POST("/register", authHandler.Register)
			authRoutes.POST("/login", authHandler.Login)
			authRoutes.POST("/refresh", authHandler.RefreshToken)
		}

		// Payment routes (keeping for backward compatibility)
		payment := api.Group("/payment")
		{
			payment.POST("/create", paymentHandler.CreatePayment)
			payment.GET("/return", returnHandler.HandleReturn)
			payment.POST("/webhook", webhookHandler.HandleWebhook)
		}

		// Category routes (public)
		api.GET("/categories", categoryHandler.GetCategories)

		// User routes
		users := api.Group("/users")
		{
			// Public routes
			users.GET("/:id", userHandler.GetProfile)

			// Protected routes
			protected := users.Group("")
			protected.Use(auth.AuthRequired(cfg.JWTSecret))
			{
				protected.GET("/me", userHandler.GetMyProfile)
				protected.PUT("/me", userHandler.UpdateProfile)
				protected.POST("/become-tasker", userHandler.BecomeTasker)
			}
		}

		// Task routes (protected)
		tasks := api.Group("/tasks")
		tasks.Use(auth.AuthRequired(cfg.JWTSecret))
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
		applications.Use(auth.AuthRequired(cfg.JWTSecret))
		{
			applications.POST("/:id/accept", taskHandler.AcceptApplication)
		}
	}

	// Start server
	addr := ":" + cfg.Port
	log.Printf("Server starting on %s in %s mode", addr, cfg.Env)
	log.Printf("Client URL: %s", cfg.ClientURL)

	if err := router.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
