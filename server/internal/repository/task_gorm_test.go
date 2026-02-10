package repository

import (
	"context"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"viecz.vieczserver/internal/models"
)

func setupTaskTestDB(t *testing.T) (*gorm.DB, func()) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// Auto migrate the schema
	if err := db.AutoMigrate(&models.Task{}, &models.User{}, &models.Category{}); err != nil {
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

func TestTaskGormRepository_Create(t *testing.T) {
	tests := []struct {
		name        string
		setup       func(*gorm.DB)
		task        *models.Task
		wantErr     bool
		errContains string
	}{
		{
			name:  "valid task creation",
			setup: func(db *gorm.DB) {},
			task: &models.Task{
				RequesterID: 1,
				CategoryID:  1,
				Title:       "Test Task",
				Description: "Test Description",
				Price:       10000,
				Location:    "Test Location",
				Status:      models.TaskStatusOpen,
			},
			wantErr: false,
		},
		{
			name:  "task with zero price",
			setup: func(db *gorm.DB) {},
			task: &models.Task{
				RequesterID: 1,
				CategoryID:  1,
				Title:       "Test Task",
				Description: "Test Description",
				Price:       0,
				Location:    "Test Location",
				Status:      models.TaskStatusOpen,
			},
			wantErr:     true,
			errContains: "price must be greater than 0",
		},
		{
			name:  "task with empty title",
			setup: func(db *gorm.DB) {},
			task: &models.Task{
				RequesterID: 1,
				CategoryID:  1,
				Title:       "",
				Description: "Test Description",
				Price:       10000,
				Location:    "Test Location",
				Status:      models.TaskStatusOpen,
			},
			wantErr:     true,
			errContains: "title is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupTaskTestDB(t)
			defer cleanup()

			if tt.setup != nil {
				tt.setup(db)
			}

			repo := NewTaskGormRepository(db)
			ctx := context.Background()

			err := repo.Create(ctx, tt.task)

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
				if tt.task.ID == 0 {
					t.Error("Expected task ID to be set")
				}
			}
		})
	}
}

func TestTaskGormRepository_GetByID(t *testing.T) {
	tests := []struct {
		name        string
		setup       func(*gorm.DB) int64
		taskID      int64
		wantErr     bool
		errContains string
		checkTask   func(*testing.T, *models.Task)
	}{
		{
			name: "task exists",
			setup: func(db *gorm.DB) int64 {
				task := &models.Task{
					RequesterID: 1,
					CategoryID:  1,
					Title:       "Test Task",
					Description: "Test Description",
					Price:       10000,
					Location:    "Test Location",
					Status:      models.TaskStatusOpen,
				}
				db.Create(task)
				return task.ID
			},
			wantErr: false,
			checkTask: func(t *testing.T, task *models.Task) {
				if task.Title != "Test Task" {
					t.Errorf("Expected title 'Test Task', got '%s'", task.Title)
				}
				if task.Price != 10000 {
					t.Errorf("Expected price 10000, got %d", task.Price)
				}
			},
		},
		{
			name: "task not found",
			setup: func(db *gorm.DB) int64 {
				return 999
			},
			taskID:      999,
			wantErr:     true,
			errContains: "task not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupTaskTestDB(t)
			defer cleanup()

			var taskID int64
			if tt.setup != nil {
				taskID = tt.setup(db)
			}
			if tt.taskID != 0 {
				taskID = tt.taskID
			}

			repo := NewTaskGormRepository(db)
			ctx := context.Background()

			task, err := repo.GetByID(ctx, taskID)

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
				if task == nil {
					t.Fatal("Expected task to be returned")
				}
				if tt.checkTask != nil {
					tt.checkTask(t, task)
				}
			}
		})
	}
}

func TestTaskGormRepository_Update(t *testing.T) {
	tests := []struct {
		name        string
		setup       func(*gorm.DB) *models.Task
		updateFunc  func(*models.Task)
		wantErr     bool
		errContains string
		checkTask   func(*testing.T, *models.Task)
	}{
		{
			name: "successful update",
			setup: func(db *gorm.DB) *models.Task {
				task := &models.Task{
					RequesterID: 1,
					CategoryID:  1,
					Title:       "Original Title",
					Description: "Test Description",
					Price:       10000,
					Location:    "Test Location",
					Status:      models.TaskStatusOpen,
				}
				db.Create(task)
				return task
			},
			updateFunc: func(task *models.Task) {
				task.Title = "Updated Title"
				task.Price = 15000
			},
			wantErr: false,
			checkTask: func(t *testing.T, task *models.Task) {
				if task.Title != "Updated Title" {
					t.Errorf("Expected title 'Updated Title', got '%s'", task.Title)
				}
				if task.Price != 15000 {
					t.Errorf("Expected price 15000, got %d", task.Price)
				}
			},
		},
		{
			name: "update with invalid price",
			setup: func(db *gorm.DB) *models.Task {
				task := &models.Task{
					RequesterID: 1,
					CategoryID:  1,
					Title:       "Test Task",
					Description: "Test Description",
					Price:       10000,
					Location:    "Test Location",
					Status:      models.TaskStatusOpen,
				}
				db.Create(task)
				return task
			},
			updateFunc: func(task *models.Task) {
				task.Price = 0
			},
			wantErr:     true,
			errContains: "price must be greater than 0",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupTaskTestDB(t)
			defer cleanup()

			var task *models.Task
			if tt.setup != nil {
				task = tt.setup(db)
			}

			if tt.updateFunc != nil {
				tt.updateFunc(task)
			}

			repo := NewTaskGormRepository(db)
			ctx := context.Background()

			err := repo.Update(ctx, task)

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
				if tt.checkTask != nil {
					// Re-fetch to verify update
					updated, _ := repo.GetByID(ctx, task.ID)
					tt.checkTask(t, updated)
				}
			}
		})
	}
}

func TestTaskGormRepository_Delete(t *testing.T) {
	tests := []struct {
		name        string
		setup       func(*gorm.DB) int64
		taskID      int64
		wantErr     bool
		errContains string
	}{
		{
			name: "successful deletion",
			setup: func(db *gorm.DB) int64 {
				task := &models.Task{
					RequesterID: 1,
					CategoryID:  1,
					Title:       "Test Task",
					Description: "Test Description",
					Price:       10000,
					Location:    "Test Location",
					Status:      models.TaskStatusOpen,
				}
				db.Create(task)
				return task.ID
			},
			wantErr: false,
		},
		{
			name: "task not found",
			setup: func(db *gorm.DB) int64 {
				return 999
			},
			taskID:      999,
			wantErr:     true,
			errContains: "task not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupTaskTestDB(t)
			defer cleanup()

			var taskID int64
			if tt.setup != nil {
				taskID = tt.setup(db)
			}
			if tt.taskID != 0 {
				taskID = tt.taskID
			}

			repo := NewTaskGormRepository(db)
			ctx := context.Background()

			err := repo.Delete(ctx, taskID)

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
				// Verify task is actually deleted
				_, err := repo.GetByID(ctx, taskID)
				if err == nil {
					t.Error("Expected task to be deleted")
				}
			}
		})
	}
}

func TestTaskGormRepository_List(t *testing.T) {
	tests := []struct {
		name      string
		setup     func(*gorm.DB)
		filters   TaskFilters
		wantCount int
		wantErr   bool
	}{
		{
			name: "list all tasks - no filters",
			setup: func(db *gorm.DB) {
				db.Create(&models.Task{RequesterID: 1, CategoryID: 1, Title: "Task 1", Description: "Desc 1", Price: 10000, Location: "Location", Status: models.TaskStatusOpen})
				db.Create(&models.Task{RequesterID: 1, CategoryID: 1, Title: "Task 2", Description: "Desc 2", Price: 20000, Location: "Location", Status: models.TaskStatusOpen})
				db.Create(&models.Task{RequesterID: 1, CategoryID: 1, Title: "Task 3", Description: "Desc 3", Price: 30000, Location: "Location", Status: models.TaskStatusOpen})
			},
			filters:   TaskFilters{},
			wantCount: 3,
			wantErr:   false,
		},
		{
			name:      "empty list",
			setup:     func(db *gorm.DB) {},
			filters:   TaskFilters{},
			wantCount: 0,
			wantErr:   false,
		},
		{
			name: "filter by status",
			setup: func(db *gorm.DB) {
				db.Create(&models.Task{RequesterID: 1, CategoryID: 1, Title: "Task 1", Description: "Desc 1", Price: 10000, Location: "Location", Status: models.TaskStatusOpen})
				db.Create(&models.Task{RequesterID: 1, CategoryID: 1, Title: "Task 2", Description: "Desc 2", Price: 20000, Location: "Location", Status: models.TaskStatusCompleted})
				db.Create(&models.Task{RequesterID: 1, CategoryID: 1, Title: "Task 3", Description: "Desc 3", Price: 30000, Location: "Location", Status: models.TaskStatusOpen})
			},
			filters: TaskFilters{
				Status: statusPtr(models.TaskStatusOpen),
			},
			wantCount: 2,
			wantErr:   false,
		},
		{
			name: "pagination - offset and limit",
			setup: func(db *gorm.DB) {
				for i := 1; i <= 10; i++ {
					db.Create(&models.Task{
						RequesterID: 1,
						CategoryID:  1,
						Title:       "Task",
						Description: "Description",
						Price:       10000,
						Location:    "Location",
						Status:      models.TaskStatusOpen,
					})
				}
			},
			filters: TaskFilters{
				Offset: 2,
				Limit:  3,
			},
			wantCount: 3,
			wantErr:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupTaskTestDB(t)
			defer cleanup()

			if tt.setup != nil {
				tt.setup(db)
			}

			repo := NewTaskGormRepository(db)
			ctx := context.Background()

			tasks, err := repo.List(ctx, tt.filters)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error but got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if len(tasks) != tt.wantCount {
					t.Errorf("Expected %d tasks, got %d", tt.wantCount, len(tasks))
				}
			}
		})
	}
}

func TestTaskGormRepository_CountByFilters(t *testing.T) {
	tests := []struct {
		name      string
		setup     func(*gorm.DB)
		filters   TaskFilters
		wantCount int
		wantErr   bool
	}{
		{
			name: "count all tasks",
			setup: func(db *gorm.DB) {
				db.Create(&models.Task{RequesterID: 1, CategoryID: 1, Title: "Task 1", Description: "Desc 1", Price: 10000, Location: "Location", Status: models.TaskStatusOpen})
				db.Create(&models.Task{RequesterID: 1, CategoryID: 1, Title: "Task 2", Description: "Desc 2", Price: 20000, Location: "Location", Status: models.TaskStatusOpen})
			},
			filters:   TaskFilters{},
			wantCount: 2,
			wantErr:   false,
		},
		{
			name:      "count empty",
			setup:     func(db *gorm.DB) {},
			filters:   TaskFilters{},
			wantCount: 0,
			wantErr:   false,
		},
		{
			name: "count with status filter",
			setup: func(db *gorm.DB) {
				db.Create(&models.Task{RequesterID: 1, CategoryID: 1, Title: "Task 1", Description: "Desc 1", Price: 10000, Location: "Location", Status: models.TaskStatusOpen})
				db.Create(&models.Task{RequesterID: 1, CategoryID: 1, Title: "Task 2", Description: "Desc 2", Price: 20000, Location: "Location", Status: models.TaskStatusCompleted})
				db.Create(&models.Task{RequesterID: 1, CategoryID: 1, Title: "Task 3", Description: "Desc 3", Price: 30000, Location: "Location", Status: models.TaskStatusOpen})
			},
			filters: TaskFilters{
				Status: statusPtr(models.TaskStatusOpen),
			},
			wantCount: 2,
			wantErr:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupTaskTestDB(t)
			defer cleanup()

			if tt.setup != nil {
				tt.setup(db)
			}

			repo := NewTaskGormRepository(db)
			ctx := context.Background()

			count, err := repo.CountByFilters(ctx, tt.filters)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error but got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if count != tt.wantCount {
					t.Errorf("Expected count %d, got %d", tt.wantCount, count)
				}
			}
		})
	}
}

func TestTaskGormRepository_UpdateStatus(t *testing.T) {
	// Bug fixed: UpdateStatus now uses UpdateColumn to skip BeforeUpdate hooks
	tests := []struct {
		name        string
		setup       func(*gorm.DB) int64
		taskID      int64
		newStatus   models.TaskStatus
		wantErr     bool
		errContains string
	}{
		{
			name: "successful status update",
			setup: func(db *gorm.DB) int64 {
				task := &models.Task{
					RequesterID: 1,
					CategoryID:  1,
					Title:       "Test Task",
					Description: "Test Description",
					Price:       10000,
					Location:    "Test Location",
					Status:      models.TaskStatusInProgress,
				}
				db.Create(task)
				return task.ID
			},
			newStatus: models.TaskStatusCompleted,
			wantErr:   false,
		},
		{
			name: "task not found",
			setup: func(db *gorm.DB) int64 {
				return 999
			},
			taskID:      999,
			newStatus:   models.TaskStatusCompleted,
			wantErr:     true,
			errContains: "task not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupTaskTestDB(t)
			defer cleanup()

			var taskID int64
			if tt.setup != nil {
				taskID = tt.setup(db)
			}
			if tt.taskID != 0 {
				taskID = tt.taskID
			}

			repo := NewTaskGormRepository(db)
			ctx := context.Background()

			err := repo.UpdateStatus(ctx, taskID, tt.newStatus)

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
				task, _ := repo.GetByID(ctx, taskID)
				if task != nil && task.Status != tt.newStatus {
					t.Errorf("Expected status %s, got %s", tt.newStatus, task.Status)
				}
			}
		})
	}
}

func TestTaskGormRepository_AssignTasker(t *testing.T) {
	tests := []struct {
		name        string
		setup       func(*gorm.DB) int64
		taskID      int64
		taskerID    int64
		wantErr     bool
		errContains string
	}{
		{
			name: "successful assignment",
			setup: func(db *gorm.DB) int64 {
				task := &models.Task{
					RequesterID: 1,
					CategoryID:  1,
					Title:       "Test Task",
					Description: "Test Description",
					Price:       10000,
					Location:    "Test Location",
					Status:      models.TaskStatusOpen,
				}
				db.Create(task)
				return task.ID
			},
			taskerID: 2,
			wantErr:  false,
		},
		{
			name: "task not found",
			setup: func(db *gorm.DB) int64 {
				return 999
			},
			taskID:      999,
			taskerID:    2,
			wantErr:     true,
			errContains: "task not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, cleanup := setupTaskTestDB(t)
			defer cleanup()

			var taskID int64
			if tt.setup != nil {
				taskID = tt.setup(db)
			}
			if tt.taskID != 0 {
				taskID = tt.taskID
			}

			repo := NewTaskGormRepository(db)
			ctx := context.Background()

			err := repo.AssignTasker(ctx, taskID, tt.taskerID)

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
				// Verify tasker was assigned
				task, _ := repo.GetByID(ctx, taskID)
				if task != nil {
					if task.TaskerID == nil || *task.TaskerID != tt.taskerID {
						t.Errorf("Expected tasker ID %d, got %v", tt.taskerID, task.TaskerID)
					}
					if task.Status != models.TaskStatusOpen {
						t.Errorf("Expected status Open, got %s", task.Status)
					}
				}
			}
		})
	}
}

// Helper functions
func statusPtr(s models.TaskStatus) *models.TaskStatus {
	return &s
}
