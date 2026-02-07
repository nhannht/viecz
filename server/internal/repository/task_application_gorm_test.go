package repository

import (
	"context"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"viecz.vieczserver/internal/models"
)

func setupTaskApplicationTestDB(t *testing.T) (*gorm.DB, func()) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// Auto migrate the schema
	if err := db.AutoMigrate(&models.TaskApplication{}, &models.Task{}, &models.User{}); err != nil {
		t.Fatalf("Failed to migrate schema: %v", err)
	}

	cleanup := func() {
		sqlDB, _ := db.DB()
		if sqlDB != nil {
			sqlDB.Close()
		}
	}

	return db, cleanup
}

func TestTaskApplicationGormRepository_Create(t *testing.T) {
	tests := []struct {
		name        string
		setup       func(*gorm.DB)
		app         *models.TaskApplication
		wantErr     bool
		errContains string
	}{
		{
			name:  "valid application creation",
			setup: func(db *gorm.DB) {},
			app: &models.TaskApplication{
				TaskID:        1,
				TaskerID:      2,
				Message:       stringPtr("I'm interested"),
				Status:        models.ApplicationStatusPending,
				ProposedPrice: int64Ptr(10000),
			},
			wantErr: false,
		},
		{
			name:  "application with empty message",
			setup: func(db *gorm.DB) {},
			app: &models.TaskApplication{
				TaskID:        1,
				TaskerID:      2,
				Message:       stringPtr(""),
				Status:        models.ApplicationStatusPending,
				ProposedPrice: int64Ptr(10000),
			},
			wantErr: false, // Empty message is allowed
		},
		{
			name:  "application with nil message and price",
			setup: func(db *gorm.DB) {},
			app: &models.TaskApplication{
				TaskID:        1,
				TaskerID:      2,
				Message:       nil,
				Status:        models.ApplicationStatusPending,
				ProposedPrice: nil,
			},
			wantErr: false, // Nil values are allowed
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupTaskApplicationTestDB(t)
			defer cleanup()

			if tt.setup != nil {
				tt.setup(db)
			}

			repo := NewTaskApplicationGormRepository(db)
			ctx := context.Background()

			err := repo.Create(ctx, tt.app)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error containing '%s', got nil", tt.errContains)
				} else if tt.errContains != "" && !contains(err.Error(), tt.errContains) {
					t.Errorf("Expected error containing '%s', got '%s'", tt.errContains, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if tt.app.ID == 0 {
					t.Error("Expected application ID to be set")
				}
			}
		})
	}
}

func TestTaskApplicationGormRepository_GetByID(t *testing.T) {
	tests := []struct {
		name        string
		setup       func(*gorm.DB) int64
		appID       int64
		wantErr     bool
		errContains string
		checkApp    func(*testing.T, *models.TaskApplication)
	}{
		{
			name: "application exists",
			setup: func(db *gorm.DB) int64 {
				app := &models.TaskApplication{
					TaskID:        1,
					TaskerID:      2,
					Message:       stringPtr("Test Application"),
					Status:        models.ApplicationStatusPending,
					ProposedPrice: int64Ptr(10000),
				}
				db.Create(app)
				return app.ID
			},
			wantErr: false,
			checkApp: func(t *testing.T, app *models.TaskApplication) {
				if app.Message == nil || *app.Message != "Test Application" {
					t.Errorf("Expected message 'Test Application', got %v", app.Message)
				}
				if app.ProposedPrice == nil || *app.ProposedPrice != 10000 {
					t.Errorf("Expected proposed price 10000, got %v", app.ProposedPrice)
				}
			},
		},
		{
			name: "application not found",
			setup: func(db *gorm.DB) int64 {
				return 999
			},
			appID:       999,
			wantErr:     true,
			errContains: "application not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupTaskApplicationTestDB(t)
			defer cleanup()

			var appID int64
			if tt.setup != nil {
				appID = tt.setup(db)
			}
			if tt.appID != 0 {
				appID = tt.appID
			}

			repo := NewTaskApplicationGormRepository(db)
			ctx := context.Background()

			app, err := repo.GetByID(ctx, appID)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error containing '%s', got nil", tt.errContains)
				} else if tt.errContains != "" && !contains(err.Error(), tt.errContains) {
					t.Errorf("Expected error containing '%s', got '%s'", tt.errContains, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if app == nil {
					t.Fatal("Expected application to be returned")
				}
				if tt.checkApp != nil {
					tt.checkApp(t, app)
				}
			}
		})
	}
}

func TestTaskApplicationGormRepository_GetByTaskID(t *testing.T) {
	tests := []struct {
		name      string
		setup     func(*gorm.DB)
		taskID    int64
		wantCount int
		wantErr   bool
		checkApps func(*testing.T, []*models.TaskApplication)
	}{
		{
			name: "get applications for task",
			setup: func(db *gorm.DB) {
				db.Create(&models.TaskApplication{TaskID: 1, TaskerID: 2, Status: models.ApplicationStatusPending})
				db.Create(&models.TaskApplication{TaskID: 1, TaskerID: 3, Status: models.ApplicationStatusPending})
				db.Create(&models.TaskApplication{TaskID: 2, TaskerID: 4, Status: models.ApplicationStatusPending})
			},
			taskID:    1,
			wantCount: 2,
			wantErr:   false,
		},
		{
			name: "no applications for task",
			setup: func(db *gorm.DB) {
				db.Create(&models.TaskApplication{TaskID: 1, TaskerID: 2, Status: models.ApplicationStatusPending})
			},
			taskID:    999,
			wantCount: 0,
			wantErr:   false,
		},
		{
			name: "applications ordered by created_at ASC",
			setup: func(db *gorm.DB) {
				// Create in specific order to test sorting
				db.Create(&models.TaskApplication{TaskID: 1, TaskerID: 2, Message: stringPtr("First"), Status: models.ApplicationStatusPending})
				db.Create(&models.TaskApplication{TaskID: 1, TaskerID: 3, Message: stringPtr("Second"), Status: models.ApplicationStatusPending})
				db.Create(&models.TaskApplication{TaskID: 1, TaskerID: 4, Message: stringPtr("Third"), Status: models.ApplicationStatusPending})
			},
			taskID:    1,
			wantCount: 3,
			wantErr:   false,
			checkApps: func(t *testing.T, apps []*models.TaskApplication) {
				if len(apps) != 3 {
					t.Fatalf("Expected 3 applications, got %d", len(apps))
				}
				// Check chronological order (earliest first)
				if apps[0].Message == nil || *apps[0].Message != "First" {
					t.Errorf("Expected first application to have message 'First', got %v", apps[0].Message)
				}
				if apps[2].Message == nil || *apps[2].Message != "Third" {
					t.Errorf("Expected third application to have message 'Third', got %v", apps[2].Message)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupTaskApplicationTestDB(t)
			defer cleanup()

			if tt.setup != nil {
				tt.setup(db)
			}

			repo := NewTaskApplicationGormRepository(db)
			ctx := context.Background()

			apps, err := repo.GetByTaskID(ctx, tt.taskID)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error but got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if len(apps) != tt.wantCount {
					t.Errorf("Expected %d applications, got %d", tt.wantCount, len(apps))
				}
				if tt.checkApps != nil {
					tt.checkApps(t, apps)
				}
			}
		})
	}
}

func TestTaskApplicationGormRepository_GetByTaskerID(t *testing.T) {
	tests := []struct {
		name      string
		setup     func(*gorm.DB)
		taskerID  int64
		wantCount int
		wantErr   bool
		checkApps func(*testing.T, []*models.TaskApplication)
	}{
		{
			name: "get applications by tasker",
			setup: func(db *gorm.DB) {
				db.Create(&models.TaskApplication{TaskID: 1, TaskerID: 2, Status: models.ApplicationStatusPending})
				db.Create(&models.TaskApplication{TaskID: 2, TaskerID: 2, Status: models.ApplicationStatusPending})
				db.Create(&models.TaskApplication{TaskID: 3, TaskerID: 3, Status: models.ApplicationStatusPending})
			},
			taskerID:  2,
			wantCount: 2,
			wantErr:   false,
		},
		{
			name: "no applications by tasker",
			setup: func(db *gorm.DB) {
				db.Create(&models.TaskApplication{TaskID: 1, TaskerID: 2, Status: models.ApplicationStatusPending})
			},
			taskerID:  999,
			wantCount: 0,
			wantErr:   false,
		},
		{
			name: "applications ordered by created_at DESC",
			setup: func(db *gorm.DB) {
				// Create in specific order to test sorting
				db.Create(&models.TaskApplication{TaskID: 1, TaskerID: 2, Message: stringPtr("First"), Status: models.ApplicationStatusPending})
				db.Create(&models.TaskApplication{TaskID: 2, TaskerID: 2, Message: stringPtr("Second"), Status: models.ApplicationStatusPending})
				db.Create(&models.TaskApplication{TaskID: 3, TaskerID: 2, Message: stringPtr("Third"), Status: models.ApplicationStatusPending})
			},
			taskerID:  2,
			wantCount: 3,
			wantErr:   false,
			checkApps: func(t *testing.T, apps []*models.TaskApplication) {
				if len(apps) != 3 {
					t.Fatalf("Expected 3 applications, got %d", len(apps))
				}
				// Check reverse chronological order (newest first)
				if apps[0].Message == nil || *apps[0].Message != "Third" {
					t.Errorf("Expected first application to have message 'Third' (newest), got %v", apps[0].Message)
				}
				if apps[2].Message == nil || *apps[2].Message != "First" {
					t.Errorf("Expected third application to have message 'First' (oldest), got %v", apps[2].Message)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupTaskApplicationTestDB(t)
			defer cleanup()

			if tt.setup != nil {
				tt.setup(db)
			}

			repo := NewTaskApplicationGormRepository(db)
			ctx := context.Background()

			apps, err := repo.GetByTaskerID(ctx, tt.taskerID)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error but got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if len(apps) != tt.wantCount {
					t.Errorf("Expected %d applications, got %d", tt.wantCount, len(apps))
				}
				if tt.checkApps != nil {
					tt.checkApps(t, apps)
				}
			}
		})
	}
}

func TestTaskApplicationGormRepository_UpdateStatus(t *testing.T) {
	tests := []struct {
		name        string
		setup       func(*gorm.DB) int64
		appID       int64
		newStatus   models.ApplicationStatus
		wantErr     bool
		errContains string
	}{
		{
			name: "successful status update",
			setup: func(db *gorm.DB) int64 {
				app := &models.TaskApplication{
					TaskID:   1,
					TaskerID: 2,
					Status:   models.ApplicationStatusPending,
				}
				db.Create(app)
				return app.ID
			},
			newStatus: models.ApplicationStatusAccepted,
			wantErr:   false,
		},
		{
			name: "update to rejected status",
			setup: func(db *gorm.DB) int64 {
				app := &models.TaskApplication{
					TaskID:   1,
					TaskerID: 2,
					Status:   models.ApplicationStatusPending,
				}
				db.Create(app)
				return app.ID
			},
			newStatus: models.ApplicationStatusRejected,
			wantErr:   false,
		},
		{
			name: "application not found",
			setup: func(db *gorm.DB) int64 {
				return 999
			},
			appID:       999,
			newStatus:   models.ApplicationStatusAccepted,
			wantErr:     true,
			errContains: "application not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupTaskApplicationTestDB(t)
			defer cleanup()

			var appID int64
			if tt.setup != nil {
				appID = tt.setup(db)
			}
			if tt.appID != 0 {
				appID = tt.appID
			}

			repo := NewTaskApplicationGormRepository(db)
			ctx := context.Background()

			err := repo.UpdateStatus(ctx, appID, tt.newStatus)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error containing '%s', got nil", tt.errContains)
				} else if tt.errContains != "" && !contains(err.Error(), tt.errContains) {
					t.Errorf("Expected error containing '%s', got '%s'", tt.errContains, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				// Verify status was updated
				app, _ := repo.GetByID(ctx, appID)
				if app != nil && app.Status != tt.newStatus {
					t.Errorf("Expected status %s, got %s", tt.newStatus, app.Status)
				}
			}
		})
	}
}

func TestTaskApplicationGormRepository_Delete(t *testing.T) {
	tests := []struct {
		name        string
		setup       func(*gorm.DB) int64
		appID       int64
		wantErr     bool
		errContains string
	}{
		{
			name: "successful deletion",
			setup: func(db *gorm.DB) int64 {
				app := &models.TaskApplication{
					TaskID:   1,
					TaskerID: 2,
					Status:   models.ApplicationStatusPending,
				}
				db.Create(app)
				return app.ID
			},
			wantErr: false,
		},
		{
			name: "application not found",
			setup: func(db *gorm.DB) int64 {
				return 999
			},
			appID:       999,
			wantErr:     true,
			errContains: "application not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupTaskApplicationTestDB(t)
			defer cleanup()

			var appID int64
			if tt.setup != nil {
				appID = tt.setup(db)
			}
			if tt.appID != 0 {
				appID = tt.appID
			}

			repo := NewTaskApplicationGormRepository(db)
			ctx := context.Background()

			err := repo.Delete(ctx, appID)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error containing '%s', got nil", tt.errContains)
				} else if tt.errContains != "" && !contains(err.Error(), tt.errContains) {
					t.Errorf("Expected error containing '%s', got '%s'", tt.errContains, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				// Verify application is actually deleted
				_, err := repo.GetByID(ctx, appID)
				if err == nil {
					t.Error("Expected application to be deleted")
				}
			}
		})
	}
}

func TestTaskApplicationGormRepository_ExistsByTaskAndTasker(t *testing.T) {
	tests := []struct {
		name       string
		setup      func(*gorm.DB)
		taskID     int64
		taskerID   int64
		wantExists bool
		wantErr    bool
	}{
		{
			name: "application exists",
			setup: func(db *gorm.DB) {
				db.Create(&models.TaskApplication{
					TaskID:   1,
					TaskerID: 2,
					Status:   models.ApplicationStatusPending,
				})
			},
			taskID:     1,
			taskerID:   2,
			wantExists: true,
			wantErr:    false,
		},
		{
			name: "application does not exist - different task",
			setup: func(db *gorm.DB) {
				db.Create(&models.TaskApplication{
					TaskID:   1,
					TaskerID: 2,
					Status:   models.ApplicationStatusPending,
				})
			},
			taskID:     999,
			taskerID:   2,
			wantExists: false,
			wantErr:    false,
		},
		{
			name: "application does not exist - different tasker",
			setup: func(db *gorm.DB) {
				db.Create(&models.TaskApplication{
					TaskID:   1,
					TaskerID: 2,
					Status:   models.ApplicationStatusPending,
				})
			},
			taskID:     1,
			taskerID:   999,
			wantExists: false,
			wantErr:    false,
		},
		{
			name:       "no applications at all",
			setup:      func(db *gorm.DB) {},
			taskID:     1,
			taskerID:   2,
			wantExists: false,
			wantErr:    false,
		},
		{
			name: "multiple applications but checking specific pair",
			setup: func(db *gorm.DB) {
				db.Create(&models.TaskApplication{TaskID: 1, TaskerID: 2, Status: models.ApplicationStatusPending})
				db.Create(&models.TaskApplication{TaskID: 1, TaskerID: 3, Status: models.ApplicationStatusPending})
				db.Create(&models.TaskApplication{TaskID: 2, TaskerID: 2, Status: models.ApplicationStatusPending})
			},
			taskID:     1,
			taskerID:   2,
			wantExists: true,
			wantErr:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupTaskApplicationTestDB(t)
			defer cleanup()

			if tt.setup != nil {
				tt.setup(db)
			}

			repo := NewTaskApplicationGormRepository(db)
			ctx := context.Background()

			exists, err := repo.ExistsByTaskAndTasker(ctx, tt.taskID, tt.taskerID)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error but got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if exists != tt.wantExists {
					t.Errorf("Expected exists=%v, got %v", tt.wantExists, exists)
				}
			}
		})
	}
}

// Helper functions
func int64Ptr(i int64) *int64 {
	return &i
}

func stringPtr(s string) *string {
	return &s
}
