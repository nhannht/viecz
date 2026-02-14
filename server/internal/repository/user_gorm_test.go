package repository

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"viecz.vieczserver/internal/models"
)

// setupTestDB creates a PostgreSQL container and returns a connected GORM DB
func setupTestDB(t *testing.T) (*gorm.DB, func()) {
	ctx := context.Background()

	// Start PostgreSQL container
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

	postgresContainer, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil {
		t.Fatalf("Failed to start PostgreSQL container: %v", err)
	}

	// Get connection details
	host, err := postgresContainer.Host(ctx)
	if err != nil {
		t.Fatalf("Failed to get container host: %v", err)
	}

	port, err := postgresContainer.MappedPort(ctx, "5432")
	if err != nil {
		t.Fatalf("Failed to get container port: %v", err)
	}

	// Build connection string
	connStr := fmt.Sprintf("host=%s port=%s user=testuser password=testpass dbname=testdb sslmode=disable",
		host, port.Port())

	// Connect with GORM
	db, err := gorm.Open(postgres.Open(connStr), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// Auto-migrate models
	if err := db.AutoMigrate(
		&models.User{},
		&models.Category{},
		&models.Task{},
		&models.TaskApplication{},
	); err != nil {
		t.Fatalf("Failed to migrate database: %v", err)
	}

	// Cleanup function
	cleanup := func() {
		if err := postgresContainer.Terminate(ctx); err != nil {
			t.Logf("Failed to terminate container: %v", err)
		}
	}

	return db, cleanup
}

func TestUserGormRepository_Create(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	repo := NewUserGormRepository(db)
	ctx := context.Background()

	t.Run("create user successfully", func(t *testing.T) {
		user := &models.User{
			Email:        "test@example.com",
			PasswordHash: func() *string { s := "hashed_password"; return &s }(),
			AuthProvider: "email",
			Name:         "Test User",
		}

		err := repo.Create(ctx, user)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		// Verify ID was set
		if user.ID == 0 {
			t.Error("Expected ID to be set after creation")
		}

		// Verify user is in database
		var found models.User
		if err := db.First(&found, user.ID).Error; err != nil {
			t.Fatalf("Failed to find created user: %v", err)
		}

		if found.Email != user.Email {
			t.Errorf("Expected email %s, got %s", user.Email, found.Email)
		}
		if found.Name != user.Name {
			t.Errorf("Expected name %s, got %s", user.Name, found.Name)
		}
	})

	t.Run("duplicate email error", func(t *testing.T) {
		// Create first user
		user1 := &models.User{
			Email:        "duplicate@example.com",
			PasswordHash: func() *string { s := "hashed_password"; return &s }(),
			AuthProvider: "email",
			Name:         "User 1",
		}
		if err := repo.Create(ctx, user1); err != nil {
			t.Fatalf("Failed to create first user: %v", err)
		}

		// Try to create second user with same email
		user2 := &models.User{
			Email:        "duplicate@example.com",
			PasswordHash: func() *string { s := "hashed_password"; return &s }(),
			AuthProvider: "email",
			Name:         "User 2",
		}
		err := repo.Create(ctx, user2)
		if err == nil {
			t.Error("Expected error for duplicate email, got nil")
		}
		if err != nil && !containsStr(err.Error(), "email already exists") {
			t.Errorf("Expected 'email already exists' error, got: %v", err)
		}
	})

	t.Run("timestamps are set", func(t *testing.T) {
		user := &models.User{
			Email:        "timestamps@example.com",
			PasswordHash: func() *string { s := "hashed_password"; return &s }(),
			AuthProvider: "email",
			Name:         "Timestamp User",
		}

		err := repo.Create(ctx, user)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		if user.CreatedAt.IsZero() {
			t.Error("Expected CreatedAt to be set")
		}
		if user.UpdatedAt.IsZero() {
			t.Error("Expected UpdatedAt to be set")
		}
	})
}

func TestUserGormRepository_GetByID(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	repo := NewUserGormRepository(db)
	ctx := context.Background()

	t.Run("get existing user", func(t *testing.T) {
		// Create user
		user := &models.User{
			Email:        "getbyid@example.com",
			PasswordHash: func() *string { s := "hashed_password"; return &s }(),
			AuthProvider: "email",
			Name:         "Get By ID User",
		}
		if err := repo.Create(ctx, user); err != nil {
			t.Fatalf("Failed to create user: %v", err)
		}

		// Get by ID
		found, err := repo.GetByID(ctx, user.ID)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		if found.Email != user.Email {
			t.Errorf("Expected email %s, got %s", user.Email, found.Email)
		}
		if found.Name != user.Name {
			t.Errorf("Expected name %s, got %s", user.Name, found.Name)
		}
	})

	t.Run("user not found", func(t *testing.T) {
		_, err := repo.GetByID(ctx, 99999)
		if err == nil {
			t.Error("Expected error for non-existent user, got nil")
		}
		if err != nil && !containsStr(err.Error(), "user not found") {
			t.Errorf("Expected 'user not found' error, got: %v", err)
		}
	})
}

func TestUserGormRepository_GetByEmail(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	repo := NewUserGormRepository(db)
	ctx := context.Background()

	t.Run("get existing user by email", func(t *testing.T) {
		// Create user
		user := &models.User{
			Email:        "getbyemail@example.com",
			PasswordHash: func() *string { s := "hashed_password"; return &s }(),
			AuthProvider: "email",
			Name:         "Get By Email User",
		}
		if err := repo.Create(ctx, user); err != nil {
			t.Fatalf("Failed to create user: %v", err)
		}

		// Get by email
		found, err := repo.GetByEmail(ctx, user.Email)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		if found.ID != user.ID {
			t.Errorf("Expected ID %d, got %d", user.ID, found.ID)
		}
		if found.Name != user.Name {
			t.Errorf("Expected name %s, got %s", user.Name, found.Name)
		}
	})

	t.Run("user not found by email", func(t *testing.T) {
		_, err := repo.GetByEmail(ctx, "nonexistent@example.com")
		if err == nil {
			t.Error("Expected error for non-existent email, got nil")
		}
		if err != nil && !containsStr(err.Error(), "user not found") {
			t.Errorf("Expected 'user not found' error, got: %v", err)
		}
	})

	t.Run("case sensitive email search", func(t *testing.T) {
		// Create user
		user := &models.User{
			Email:        "CaseSensitive@example.com",
			PasswordHash: func() *string { s := "hashed_password"; return &s }(),
			AuthProvider: "email",
			Name:         "Case User",
		}
		if err := repo.Create(ctx, user); err != nil {
			t.Fatalf("Failed to create user: %v", err)
		}

		// Try to get with different case
		_, err := repo.GetByEmail(ctx, "casesensitive@example.com")
		// PostgreSQL email columns might be case-sensitive depending on setup
		// This test documents the behavior
		if err != nil {
			t.Logf("Email search is case-sensitive: %v", err)
		}
	})
}

func TestUserGormRepository_Update(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	repo := NewUserGormRepository(db)
	ctx := context.Background()

	t.Run("update user successfully", func(t *testing.T) {
		// Create user
		user := &models.User{
			Email:        "update@example.com",
			PasswordHash: func() *string { s := "hashed_password"; return &s }(),
			AuthProvider: "email",
			Name:         "Original Name",
		}
		if err := repo.Create(ctx, user); err != nil {
			t.Fatalf("Failed to create user: %v", err)
		}

		// Update user
		user.Name = "Updated Name"
		avatarURL := "https://example.com/avatar.jpg"
		user.AvatarURL = &avatarURL

		err := repo.Update(ctx, user)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		// Verify update
		found, err := repo.GetByID(ctx, user.ID)
		if err != nil {
			t.Fatalf("Failed to get updated user: %v", err)
		}

		if found.Name != "Updated Name" {
			t.Errorf("Expected name 'Updated Name', got %s", found.Name)
		}
		if found.AvatarURL == nil || *found.AvatarURL != avatarURL {
			t.Errorf("Expected avatar URL %s, got %v", avatarURL, found.AvatarURL)
		}
	})

	t.Run("update timestamps", func(t *testing.T) {
		// Create user
		user := &models.User{
			Email:        "timestamps-update@example.com",
			PasswordHash: func() *string { s := "hashed_password"; return &s }(),
			AuthProvider: "email",
			Name:         "Timestamp User",
		}
		if err := repo.Create(ctx, user); err != nil {
			t.Fatalf("Failed to create user: %v", err)
		}

		originalUpdatedAt := user.UpdatedAt
		time.Sleep(10 * time.Millisecond) // Ensure time difference

		// Update user
		user.Name = "Updated"
		if err := repo.Update(ctx, user); err != nil {
			t.Fatalf("Failed to update user: %v", err)
		}

		// Verify UpdatedAt changed
		found, _ := repo.GetByID(ctx, user.ID)
		if !found.UpdatedAt.After(originalUpdatedAt) {
			t.Error("Expected UpdatedAt to be updated")
		}
	})
}

func TestUserGormRepository_ExistsByEmail(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	repo := NewUserGormRepository(db)
	ctx := context.Background()

	t.Run("email exists", func(t *testing.T) {
		// Create user
		user := &models.User{
			Email:        "exists@example.com",
			PasswordHash: func() *string { s := "hashed_password"; return &s }(),
			AuthProvider: "email",
			Name:         "Exists User",
		}
		if err := repo.Create(ctx, user); err != nil {
			t.Fatalf("Failed to create user: %v", err)
		}

		// Check exists
		exists, err := repo.ExistsByEmail(ctx, "exists@example.com")
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}
		if !exists {
			t.Error("Expected email to exist")
		}
	})

	t.Run("email does not exist", func(t *testing.T) {
		exists, err := repo.ExistsByEmail(ctx, "nonexistent@example.com")
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}
		if exists {
			t.Error("Expected email not to exist")
		}
	})
}

func TestUserGormRepository_BecomeTasker(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	repo := NewUserGormRepository(db)
	ctx := context.Background()

	t.Run("become tasker successfully", func(t *testing.T) {
		// Create user
		user := &models.User{
			Email:        "tasker@example.com",
			PasswordHash: func() *string { s := "hashed_password"; return &s }(),
			AuthProvider: "email",
			Name:         "Future Tasker",
			IsTasker:     false,
		}
		if err := repo.Create(ctx, user); err != nil {
			t.Fatalf("Failed to create user: %v", err)
		}

		// Become tasker
		bio := "I'm a great tasker!"
		skills := []string{"cleaning", "moving", "gardening"}
		err := repo.BecomeTasker(ctx, user.ID, bio, skills)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		// Verify
		found, _ := repo.GetByID(ctx, user.ID)
		if !found.IsTasker {
			t.Error("Expected IsTasker to be true")
		}
		if found.TaskerBio == nil || *found.TaskerBio != bio {
			t.Errorf("Expected bio %s, got %v", bio, found.TaskerBio)
		}
		if len(found.TaskerSkills) != 3 {
			t.Errorf("Expected 3 skills, got %d", len(found.TaskerSkills))
		}
	})

	t.Run("user not found", func(t *testing.T) {
		err := repo.BecomeTasker(ctx, 99999, "bio", []string{"skill"})
		if err == nil {
			t.Error("Expected error for non-existent user, got nil")
		}
	})
}

func TestUserGormRepository_UpdateRating(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	repo := NewUserGormRepository(db)
	ctx := context.Background()

	t.Run("update rating successfully", func(t *testing.T) {
		// Create user
		user := &models.User{
			Email:        "rating@example.com",
			PasswordHash: func() *string { s := "hashed_password"; return &s }(),
			AuthProvider: "email",
			Name:         "Rating User",
			Rating:       0.0,
		}
		if err := repo.Create(ctx, user); err != nil {
			t.Fatalf("Failed to create user: %v", err)
		}

		// Update rating
		err := repo.UpdateRating(ctx, user.ID, 4.5)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		// Verify
		found, _ := repo.GetByID(ctx, user.ID)
		if found.Rating != 4.5 {
			t.Errorf("Expected rating 4.5, got %f", found.Rating)
		}
	})

	t.Run("user not found", func(t *testing.T) {
		err := repo.UpdateRating(ctx, 99999, 4.5)
		if err == nil {
			t.Error("Expected error for non-existent user, got nil")
		}
		if err != nil && !containsStr(err.Error(), "user not found") {
			t.Errorf("Expected 'user not found' error, got: %v", err)
		}
	})
}

func TestUserGormRepository_IncrementCounters(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	repo := NewUserGormRepository(db)
	ctx := context.Background()

	// Create user
	user := &models.User{
		Email:                "counter@example.com",
		PasswordHash: func() *string { s := "hashed_password"; return &s }(),
			AuthProvider: "email",
		Name:                 "Counter User",
		TotalTasksCompleted:  0,
		TotalTasksPosted:     0,
		TotalEarnings:        0,
	}
	if err := repo.Create(ctx, user); err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	t.Run("increment tasks completed", func(t *testing.T) {
		err := repo.IncrementTasksCompleted(ctx, user.ID)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		// Verify
		found, _ := repo.GetByID(ctx, user.ID)
		if found.TotalTasksCompleted != 1 {
			t.Errorf("Expected TotalTasksCompleted 1, got %d", found.TotalTasksCompleted)
		}
	})

	t.Run("increment tasks posted", func(t *testing.T) {
		err := repo.IncrementTasksPosted(ctx, user.ID)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		// Verify
		found, _ := repo.GetByID(ctx, user.ID)
		if found.TotalTasksPosted != 1 {
			t.Errorf("Expected TotalTasksPosted 1, got %d", found.TotalTasksPosted)
		}
	})

	t.Run("increment earnings", func(t *testing.T) {
		err := repo.IncrementEarnings(ctx, user.ID, 50000)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		// Verify
		found, _ := repo.GetByID(ctx, user.ID)
		if found.TotalEarnings != 50000 {
			t.Errorf("Expected TotalEarnings 50000, got %d", found.TotalEarnings)
		}

		// Increment again
		err = repo.IncrementEarnings(ctx, user.ID, 25000)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		found, _ = repo.GetByID(ctx, user.ID)
		if found.TotalEarnings != 75000 {
			t.Errorf("Expected TotalEarnings 75000, got %d", found.TotalEarnings)
		}
	})

	t.Run("multiple increments", func(t *testing.T) {
		// Increment tasks completed multiple times
		for i := 0; i < 5; i++ {
			if err := repo.IncrementTasksCompleted(ctx, user.ID); err != nil {
				t.Fatalf("Failed to increment: %v", err)
			}
		}

		found, _ := repo.GetByID(ctx, user.ID)
		// Should be 6 total (1 from previous test + 5 new)
		if found.TotalTasksCompleted != 6 {
			t.Errorf("Expected TotalTasksCompleted 6, got %d", found.TotalTasksCompleted)
		}
	})
}

// Helper function
func containsStr(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) && hasSubstr(s, substr))
}

func hasSubstr(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
