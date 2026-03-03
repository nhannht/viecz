package services

import (
	"context"
	"errors"
	"testing"
	"time"

	"gorm.io/gorm"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
	"viecz.vieczserver/internal/testutil"
)

func strPtr(s string) *string { return &s }

// Mock repositories
type mockTaskRepository struct {
	tasks map[int64]*models.Task
}

func newMockTaskRepository() *mockTaskRepository {
	return &mockTaskRepository{
		tasks: make(map[int64]*models.Task),
	}
}

func (m *mockTaskRepository) Create(ctx context.Context, task *models.Task) error {
	// Validate before creating (mimics GORM BeforeCreate hook)
	if err := task.Validate(); err != nil {
		return err
	}
	task.ID = int64(len(m.tasks) + 1)
	m.tasks[task.ID] = task
	return nil
}

func (m *mockTaskRepository) GetByIDForUpdate(ctx context.Context, tx *gorm.DB, id int64) (*models.Task, error) {
	return m.GetByID(ctx, id)
}

func (m *mockTaskRepository) GetByID(ctx context.Context, id int64) (*models.Task, error) {
	task, exists := m.tasks[id]
	if !exists {
		return nil, errors.New("task not found")
	}
	return task, nil
}

func (m *mockTaskRepository) Update(ctx context.Context, task *models.Task) error {
	if _, exists := m.tasks[task.ID]; !exists {
		return errors.New("task not found")
	}
	m.tasks[task.ID] = task
	return nil
}

func (m *mockTaskRepository) Delete(ctx context.Context, id int64) error {
	if _, exists := m.tasks[id]; !exists {
		return errors.New("task not found")
	}
	delete(m.tasks, id)
	return nil
}

func (m *mockTaskRepository) List(ctx context.Context, filters repository.TaskFilters) ([]*models.Task, error) {
	var tasks []*models.Task
	for _, task := range m.tasks {
		tasks = append(tasks, task)
	}
	return tasks, nil
}

func (m *mockTaskRepository) CountByFilters(ctx context.Context, filters repository.TaskFilters) (int, error) {
	return len(m.tasks), nil
}

func (m *mockTaskRepository) AssignTasker(ctx context.Context, taskID, taskerID int64) error {
	task, exists := m.tasks[taskID]
	if !exists {
		return errors.New("task not found")
	}
	task.TaskerID = &taskerID
	task.Status = models.TaskStatusInProgress
	return nil
}

func (m *mockTaskRepository) SumOpenTaskPricesByRequester(ctx context.Context, requesterID int64) (int64, error) {
	var total int64
	for _, task := range m.tasks {
		if task.RequesterID == requesterID && task.Status == models.TaskStatusOpen {
			total += task.Price
		}
	}
	return total, nil
}

func (m *mockTaskRepository) GetByIDs(ctx context.Context, ids []int64) ([]*models.Task, error) {
	var tasks []*models.Task
	for _, id := range ids {
		if task, exists := m.tasks[id]; exists {
			tasks = append(tasks, task)
		}
	}
	return tasks, nil
}

func (m *mockTaskRepository) UpdateWithTx(ctx context.Context, tx *gorm.DB, task *models.Task) error {
	return m.Update(ctx, task)
}

func (m *mockTaskRepository) UpdateStatus(ctx context.Context, taskID int64, status models.TaskStatus) error {
	task, exists := m.tasks[taskID]
	if !exists {
		return errors.New("task not found")
	}
	task.Status = status
	return nil
}

func (m *mockTaskRepository) UpdateStatusWithTx(ctx context.Context, tx *gorm.DB, taskID int64, status models.TaskStatus) error {
	return m.UpdateStatus(ctx, taskID, status)
}

type mockApplicationRepository struct {
	applications map[int64]*models.TaskApplication
}

func newMockApplicationRepository() *mockApplicationRepository {
	return &mockApplicationRepository{
		applications: make(map[int64]*models.TaskApplication),
	}
}

func (m *mockApplicationRepository) Create(ctx context.Context, app *models.TaskApplication) error {
	app.ID = int64(len(m.applications) + 1)
	m.applications[app.ID] = app
	return nil
}

func (m *mockApplicationRepository) GetByID(ctx context.Context, id int64) (*models.TaskApplication, error) {
	app, exists := m.applications[id]
	if !exists {
		return nil, errors.New("application not found")
	}
	return app, nil
}

func (m *mockApplicationRepository) GetByTaskID(ctx context.Context, taskID int64) ([]*models.TaskApplication, error) {
	var apps []*models.TaskApplication
	for _, app := range m.applications {
		if app.TaskID == taskID {
			apps = append(apps, app)
		}
	}
	return apps, nil
}

func (m *mockApplicationRepository) GetByTaskerID(ctx context.Context, taskerID int64) ([]*models.TaskApplication, error) {
	var apps []*models.TaskApplication
	for _, app := range m.applications {
		if app.TaskerID == taskerID {
			apps = append(apps, app)
		}
	}
	return apps, nil
}

func (m *mockApplicationRepository) UpdateStatus(ctx context.Context, id int64, status models.ApplicationStatus) error {
	app, exists := m.applications[id]
	if !exists {
		return errors.New("application not found")
	}
	app.Status = status
	return nil
}

func (m *mockApplicationRepository) Delete(ctx context.Context, id int64) error {
	if _, exists := m.applications[id]; !exists {
		return errors.New("application not found")
	}
	delete(m.applications, id)
	return nil
}

func (m *mockApplicationRepository) ExistsByTaskAndTasker(ctx context.Context, taskID, taskerID int64) (bool, error) {
	for _, app := range m.applications {
		if app.TaskID == taskID && app.TaskerID == taskerID {
			return true, nil
		}
	}
	return false, nil
}

func (m *mockApplicationRepository) CountByTaskIDs(ctx context.Context, taskIDs []int64) (map[int64]int64, error) {
	result := make(map[int64]int64)
	for _, app := range m.applications {
		for _, id := range taskIDs {
			if app.TaskID == id {
				result[id]++
			}
		}
	}
	return result, nil
}

type mockCategoryRepository struct {
	categories map[int64]*models.Category
}

func newMockCategoryRepository() *mockCategoryRepository {
	return &mockCategoryRepository{
		categories: make(map[int64]*models.Category),
	}
}

func (m *mockCategoryRepository) Create(ctx context.Context, category *models.Category) error {
	category.ID = len(m.categories) + 1
	m.categories[int64(category.ID)] = category
	return nil
}

func (m *mockCategoryRepository) GetByID(ctx context.Context, id int64) (*models.Category, error) {
	cat, exists := m.categories[id]
	if !exists {
		return nil, errors.New("category not found")
	}
	return cat, nil
}

func (m *mockCategoryRepository) GetAll(ctx context.Context) ([]*models.Category, error) {
	var categories []*models.Category
	for _, cat := range m.categories {
		categories = append(categories, cat)
	}
	return categories, nil
}

func (m *mockCategoryRepository) Delete(ctx context.Context, id int64) error {
	delete(m.categories, id)
	return nil
}

func (m *mockCategoryRepository) Update(ctx context.Context, category *models.Category) error {
	if _, exists := m.categories[int64(category.ID)]; !exists {
		return errors.New("category not found")
	}
	m.categories[int64(category.ID)] = category
	return nil
}

type mockUserRepository struct {
	users map[int64]*models.User
}

func newMockUserRepository() *mockUserRepository {
	return &mockUserRepository{
		users: make(map[int64]*models.User),
	}
}

func (m *mockUserRepository) Create(ctx context.Context, user *models.User) error {
	user.ID = int64(len(m.users) + 1)
	m.users[user.ID] = user
	return nil
}

func (m *mockUserRepository) GetByID(ctx context.Context, id int64) (*models.User, error) {
	user, exists := m.users[id]
	if !exists {
		return nil, errors.New("user not found")
	}
	return user, nil
}

func (m *mockUserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	for _, user := range m.users {
		if user.Email != nil && *user.Email == email {
			return user, nil
		}
	}
	return nil, errors.New("user not found")
}

func (m *mockUserRepository) GetByPhone(ctx context.Context, phone string) (*models.User, error) {
	for _, user := range m.users {
		if user.Phone != nil && *user.Phone == phone {
			return user, nil
		}
	}
	return nil, errors.New("user not found")
}

func (m *mockUserRepository) Update(ctx context.Context, user *models.User) error {
	if _, exists := m.users[user.ID]; !exists {
		return errors.New("user not found")
	}
	m.users[user.ID] = user
	return nil
}

func (m *mockUserRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	for _, user := range m.users {
		if user.Email != nil && *user.Email == email {
			return true, nil
		}
	}
	return false, nil
}

func (m *mockUserRepository) IncrementTasksPosted(ctx context.Context, userID int64) error {
	user, exists := m.users[userID]
	if !exists {
		return errors.New("user not found")
	}
	user.TotalTasksPosted++
	return nil
}

func (m *mockUserRepository) IncrementTasksCompleted(ctx context.Context, userID int64) error {
	user, exists := m.users[userID]
	if !exists {
		return errors.New("user not found")
	}
	user.TotalTasksCompleted++
	return nil
}

func (m *mockUserRepository) IncrementEarnings(ctx context.Context, userID int64, amount int64) error {
	user, exists := m.users[userID]
	if !exists {
		return errors.New("user not found")
	}
	user.TotalEarnings += amount
	return nil
}

func (m *mockUserRepository) UpdateRating(ctx context.Context, userID int64, rating float64) error {
	user, exists := m.users[userID]
	if !exists {
		return errors.New("user not found")
	}
	user.Rating = rating
	return nil
}

func (m *mockUserRepository) GetByGoogleID(ctx context.Context, googleID string) (*models.User, error) {
	for _, user := range m.users {
		if user.GoogleID != nil && *user.GoogleID == googleID {
			return user, nil
		}
	}
	return nil, errors.New("user not found")
}

func (m *mockUserRepository) SetEmailVerified(ctx context.Context, userID int64) error {
	user, exists := m.users[userID]
	if !exists {
		return errors.New("user not found")
	}
	user.EmailVerified = true
	return nil
}

func (m *mockUserRepository) SetPhoneVerified(ctx context.Context, userID int64, phone string) error {
	user, exists := m.users[userID]
	if !exists {
		return errors.New("user not found")
	}
	user.Phone = &phone
	user.PhoneVerified = true
	return nil
}

// Tests
func TestTaskService_CreateTask(t *testing.T) {
	tests := []struct {
		name        string
		requesterID int64
		input       *CreateTaskInput
		setupRepo   func(*mockCategoryRepository, *mockUserRepository)
		wantErr     bool
		errContains string
	}{
		{
			name:        "valid task",
			requesterID: 1,
			input: &CreateTaskInput{
				Title:       "Test Task",
				Description: "Test Description",
				CategoryID:  1,
				Price:       10000,
				Location:    "HCMUS",
			},
			setupRepo: func(catRepo *mockCategoryRepository, userRepo *mockUserRepository) {
				catRepo.categories[1] = &models.Category{ID: 1, Name: "Moving"}
				userRepo.users[1] = &models.User{ID: 1, Email: strPtr("test@test.com"), Name: "Test User"}
			},
			wantErr: false,
		},
		{
			name:        "invalid category",
			requesterID: 1,
			input: &CreateTaskInput{
				Title:       "Test Task",
				Description: "Test Description",
				CategoryID:  999,
				Price:       10000,
				Location:    "HCMUS",
			},
			setupRepo: func(catRepo *mockCategoryRepository, userRepo *mockUserRepository) {
				userRepo.users[1] = &models.User{ID: 1, Email: strPtr("test@test.com"), Name: "Test User"}
			},
			wantErr:     true,
			errContains: "category not found",
		},
		{
			name:        "empty title",
			requesterID: 1,
			input: &CreateTaskInput{
				Title:       "",
				Description: "Test Description",
				CategoryID:  1,
				Price:       10000,
				Location:    "HCMUS",
			},
			setupRepo: func(catRepo *mockCategoryRepository, userRepo *mockUserRepository) {
				catRepo.categories[1] = &models.Category{ID: 1, Name: "Moving"}
				userRepo.users[1] = &models.User{ID: 1, Email: strPtr("test@test.com"), Name: "Test User"}
			},
			wantErr:     true,
			errContains: "title is required",
		},
		{
			name:        "negative price",
			requesterID: 1,
			input: &CreateTaskInput{
				Title:       "Test Task",
				Description: "Test Description",
				CategoryID:  1,
				Price:       -100,
				Location:    "HCMUS",
			},
			setupRepo: func(catRepo *mockCategoryRepository, userRepo *mockUserRepository) {
				catRepo.categories[1] = &models.Category{ID: 1, Name: "Moving"}
				userRepo.users[1] = &models.User{ID: 1, Email: strPtr("test@test.com"), Name: "Test User"}
			},
			wantErr:     true,
			errContains: "price must be greater than 0",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			taskRepo := newMockTaskRepository()
			appRepo := newMockApplicationRepository()
			catRepo := newMockCategoryRepository()
			userRepo := newMockUserRepository()

			if tt.setupRepo != nil {
				tt.setupRepo(catRepo, userRepo)
			}

			service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, nil, nil, nil, nil)
			ctx := context.Background()

			task, err := service.CreateTask(ctx, tt.requesterID, tt.input)

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
					t.Error("Expected task to be created, got nil")
				}
				if task != nil && task.Status != models.TaskStatusOpen {
					t.Errorf("Expected status to be 'open', got '%s'", task.Status)
				}
			}
		})
	}
}

func newTestWalletService(t *testing.T) (*WalletService, *testutil.MockWalletRepository, func()) {
	t.Helper()
	walletRepo := testutil.NewMockWalletRepository()
	walletTxRepo := testutil.NewMockWalletTransactionRepository()
	db, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock GORM DB: %v", err)
	}
	ws := NewWalletService(walletRepo, walletTxRepo, db, 0)
	return ws, walletRepo, cleanup
}

func TestTaskService_CreateTask_BalanceValidation(t *testing.T) {
	tests := []struct {
		name        string
		requesterID int64
		input       *CreateTaskInput
		setup       func(*mockTaskRepository, *mockCategoryRepository, *mockUserRepository, *testutil.MockWalletRepository)
		wantErr     bool
		errContains string
	}{
		{
			name:        "insufficient available balance",
			requesterID: 1,
			input: &CreateTaskInput{
				Title:       "Expensive Task",
				Description: "Test",
				CategoryID:  1,
				Price:       100000,
				Location:    "HCMUS",
			},
			setup: func(taskRepo *mockTaskRepository, catRepo *mockCategoryRepository, userRepo *mockUserRepository, walletRepo *testutil.MockWalletRepository) {
				catRepo.categories[1] = &models.Category{ID: 1, Name: "Moving"}
				userRepo.users[1] = &models.User{ID: 1, Email: strPtr("test@test.com"), Name: "Test User"}
				walletRepo.Wallets[1] = &models.Wallet{ID: 1, UserID: 1, Balance: 50000, EscrowBalance: 0}
			},
			wantErr:     true,
			errContains: "insufficient available balance",
		},
		{
			name:        "available balance accounts for open tasks",
			requesterID: 1,
			input: &CreateTaskInput{
				Title:       "Another Task",
				Description: "Test",
				CategoryID:  1,
				Price:       100000,
				Location:    "HCMUS",
			},
			setup: func(taskRepo *mockTaskRepository, catRepo *mockCategoryRepository, userRepo *mockUserRepository, walletRepo *testutil.MockWalletRepository) {
				catRepo.categories[1] = &models.Category{ID: 1, Name: "Moving"}
				userRepo.users[1] = &models.User{ID: 1, Email: strPtr("test@test.com"), Name: "Test User"}
				walletRepo.Wallets[1] = &models.Wallet{ID: 1, UserID: 1, Balance: 200000, EscrowBalance: 0}
				// Existing open task worth 150k
				taskRepo.tasks[1] = &models.Task{ID: 1, RequesterID: 1, Price: 150000, Status: models.TaskStatusOpen}
			},
			wantErr:     true,
			errContains: "insufficient available balance",
		},
		{
			name:        "available balance accounts for escrow",
			requesterID: 1,
			input: &CreateTaskInput{
				Title:       "Task",
				Description: "Test",
				CategoryID:  1,
				Price:       150000,
				Location:    "HCMUS",
			},
			setup: func(taskRepo *mockTaskRepository, catRepo *mockCategoryRepository, userRepo *mockUserRepository, walletRepo *testutil.MockWalletRepository) {
				catRepo.categories[1] = &models.Category{ID: 1, Name: "Moving"}
				userRepo.users[1] = &models.User{ID: 1, Email: strPtr("test@test.com"), Name: "Test User"}
				walletRepo.Wallets[1] = &models.Wallet{ID: 1, UserID: 1, Balance: 200000, EscrowBalance: 100000}
			},
			wantErr:     true,
			errContains: "insufficient available balance",
		},
		{
			name:        "sufficient available balance",
			requesterID: 1,
			input: &CreateTaskInput{
				Title:       "Affordable Task",
				Description: "Test",
				CategoryID:  1,
				Price:       100000,
				Location:    "HCMUS",
			},
			setup: func(taskRepo *mockTaskRepository, catRepo *mockCategoryRepository, userRepo *mockUserRepository, walletRepo *testutil.MockWalletRepository) {
				catRepo.categories[1] = &models.Category{ID: 1, Name: "Moving"}
				userRepo.users[1] = &models.User{ID: 1, Email: strPtr("test@test.com"), Name: "Test User"}
				walletRepo.Wallets[1] = &models.Wallet{ID: 1, UserID: 1, Balance: 200000, EscrowBalance: 0}
				// Existing open task worth 50k
				taskRepo.tasks[1] = &models.Task{ID: 1, RequesterID: 1, Price: 50000, Status: models.TaskStatusOpen}
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			taskRepo := newMockTaskRepository()
			appRepo := newMockApplicationRepository()
			catRepo := newMockCategoryRepository()
			userRepo := newMockUserRepository()
			walletService, walletRepo, cleanup := newTestWalletService(t)
			defer cleanup()

			if tt.setup != nil {
				tt.setup(taskRepo, catRepo, userRepo, walletRepo)
			}

			service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, walletService, nil, nil, nil, nil)
			ctx := context.Background()

			task, err := service.CreateTask(ctx, tt.requesterID, tt.input)

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
					t.Error("Expected task to be created, got nil")
				}
			}
		})
	}
}

func TestTaskService_UpdateTask_BalanceValidation(t *testing.T) {
	tests := []struct {
		name        string
		taskID      int64
		requesterID int64
		input       *CreateTaskInput
		setup       func(*mockTaskRepository, *mockCategoryRepository, *mockUserRepository, *testutil.MockWalletRepository)
		wantErr     bool
		errContains string
	}{
		{
			name:        "price increase exceeds available balance",
			taskID:      1,
			requesterID: 1,
			input: &CreateTaskInput{
				Title:       "Updated Task",
				Description: "Test",
				CategoryID:  1,
				Price:       200000,
				Location:    "HCMUS",
			},
			setup: func(taskRepo *mockTaskRepository, catRepo *mockCategoryRepository, userRepo *mockUserRepository, walletRepo *testutil.MockWalletRepository) {
				catRepo.categories[1] = &models.Category{ID: 1, Name: "Moving"}
				userRepo.users[1] = &models.User{ID: 1, Email: strPtr("test@test.com"), Name: "Test User"}
				taskRepo.tasks[1] = &models.Task{ID: 1, RequesterID: 1, Price: 50000, Status: models.TaskStatusOpen, Title: "Old Task", Description: "Old", CategoryID: 1, Location: "HCMUS"}
				walletRepo.Wallets[1] = &models.Wallet{ID: 1, UserID: 1, Balance: 100000, EscrowBalance: 0}
			},
			wantErr:     true,
			errContains: "insufficient available balance for price increase",
		},
		{
			name:        "price decrease always allowed",
			taskID:      1,
			requesterID: 1,
			input: &CreateTaskInput{
				Title:       "Updated Task",
				Description: "Test",
				CategoryID:  1,
				Price:       30000,
				Location:    "HCMUS",
			},
			setup: func(taskRepo *mockTaskRepository, catRepo *mockCategoryRepository, userRepo *mockUserRepository, walletRepo *testutil.MockWalletRepository) {
				catRepo.categories[1] = &models.Category{ID: 1, Name: "Moving"}
				userRepo.users[1] = &models.User{ID: 1, Email: strPtr("test@test.com"), Name: "Test User"}
				taskRepo.tasks[1] = &models.Task{ID: 1, RequesterID: 1, Price: 50000, Status: models.TaskStatusOpen, Title: "Old Task", Description: "Old", CategoryID: 1, Location: "HCMUS"}
				walletRepo.Wallets[1] = &models.Wallet{ID: 1, UserID: 1, Balance: 10000, EscrowBalance: 0}
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			taskRepo := newMockTaskRepository()
			appRepo := newMockApplicationRepository()
			catRepo := newMockCategoryRepository()
			userRepo := newMockUserRepository()
			walletService, walletRepo, cleanup := newTestWalletService(t)
			defer cleanup()

			if tt.setup != nil {
				tt.setup(taskRepo, catRepo, userRepo, walletRepo)
			}

			service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, walletService, nil, nil, nil, nil)
			ctx := context.Background()

			task, err := service.UpdateTask(ctx, tt.taskID, tt.requesterID, tt.input)

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
					t.Error("Expected task to be updated, got nil")
				}
			}
		})
	}
}

func TestTaskService_ApplyForTask(t *testing.T) {
	tests := []struct {
		name        string
		taskID      int64
		taskerID    int64
		input       *ApplyForTaskInput
		setupRepo   func(*mockTaskRepository, *mockApplicationRepository, *mockUserRepository)
		wantErr     bool
		errContains string
	}{
		{
			name:     "valid application",
			taskID:   1,
			taskerID: 2,
			input: &ApplyForTaskInput{
				Message: "I can help",
			},
			setupRepo: func(taskRepo *mockTaskRepository, appRepo *mockApplicationRepository, userRepo *mockUserRepository) {
				taskRepo.tasks[1] = &models.Task{
					ID:          1,
					RequesterID: 1,
					Status:      models.TaskStatusOpen,
				}
				userRepo.users[2] = &models.User{ID: 2, Name: "Tasker", Bio: strPtr("I do tasks")}
			},
			wantErr: false,
		},
		{
			name:     "task not found",
			taskID:   999,
			taskerID: 2,
			input:    &ApplyForTaskInput{},
			setupRepo: func(taskRepo *mockTaskRepository, appRepo *mockApplicationRepository, userRepo *mockUserRepository) {
				userRepo.users[2] = &models.User{ID: 2, Name: "Tasker", Bio: strPtr("I do tasks")}
			},
			wantErr:     true,
			errContains: "task not found",
		},
		{
			name:     "task not open",
			taskID:   1,
			taskerID: 2,
			input:    &ApplyForTaskInput{},
			setupRepo: func(taskRepo *mockTaskRepository, appRepo *mockApplicationRepository, userRepo *mockUserRepository) {
				taskRepo.tasks[1] = &models.Task{
					ID:          1,
					RequesterID: 1,
					Status:      models.TaskStatusCompleted,
				}
				userRepo.users[2] = &models.User{ID: 2, Name: "Tasker", Bio: strPtr("I do tasks")}
			},
			wantErr:     true,
			errContains: "not open",
		},
		{
			name:     "requester cannot apply",
			taskID:   1,
			taskerID: 1,
			input:    &ApplyForTaskInput{},
			setupRepo: func(taskRepo *mockTaskRepository, appRepo *mockApplicationRepository, userRepo *mockUserRepository) {
				taskRepo.tasks[1] = &models.Task{
					ID:          1,
					RequesterID: 1,
					Status:      models.TaskStatusOpen,
				}
				userRepo.users[1] = &models.User{ID: 1, Name: "Test User", Bio: strPtr("bio")}
			},
			wantErr:     true,
			errContains: "cannot apply to your own task",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			taskRepo := newMockTaskRepository()
			appRepo := newMockApplicationRepository()
			catRepo := newMockCategoryRepository()
			userRepo := newMockUserRepository()

			if tt.setupRepo != nil {
				tt.setupRepo(taskRepo, appRepo, userRepo)
			}

			service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, nil, nil, nil, nil)
			ctx := context.Background()

			app, err := service.ApplyForTask(ctx, tt.taskID, tt.taskerID, tt.input)

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
					t.Error("Expected application to be created, got nil")
				}
				if app != nil && app.Status != models.ApplicationStatusPending {
					t.Errorf("Expected status to be 'pending', got '%s'", app.Status)
				}
			}
		})
	}
}

func TestTaskService_AcceptApplication(t *testing.T) {
	tests := []struct {
		name          string
		applicationID int64
		requesterID   int64
		setupRepo     func(*mockTaskRepository, *mockApplicationRepository)
		wantErr       bool
		errContains   string
	}{
		{
			name:          "valid acceptance",
			applicationID: 1,
			requesterID:   1,
			setupRepo: func(taskRepo *mockTaskRepository, appRepo *mockApplicationRepository) {
				taskRepo.tasks[1] = &models.Task{
					ID:          1,
					RequesterID: 1,
					Status:      models.TaskStatusOpen,
				}
				appRepo.applications[1] = &models.TaskApplication{
					ID:       1,
					TaskID:   1,
					TaskerID: 2,
					Status:   models.ApplicationStatusPending,
				}
			},
			wantErr: false,
		},
		{
			name:          "application not found",
			applicationID: 999,
			requesterID:   1,
			setupRepo:     func(taskRepo *mockTaskRepository, appRepo *mockApplicationRepository) {},
			wantErr:       true,
			errContains:   "application not found",
		},
		{
			name:          "not authorized",
			applicationID: 1,
			requesterID:   999,
			setupRepo: func(taskRepo *mockTaskRepository, appRepo *mockApplicationRepository) {
				taskRepo.tasks[1] = &models.Task{
					ID:          1,
					RequesterID: 1,
					Status:      models.TaskStatusOpen,
				}
				appRepo.applications[1] = &models.TaskApplication{
					ID:       1,
					TaskID:   1,
					TaskerID: 2,
					Status:   models.ApplicationStatusPending,
				}
			},
			wantErr:     true,
			errContains: "not authorized",
		},
		{
			name:          "task not open",
			applicationID: 1,
			requesterID:   1,
			setupRepo: func(taskRepo *mockTaskRepository, appRepo *mockApplicationRepository) {
				taskRepo.tasks[1] = &models.Task{
					ID:          1,
					RequesterID: 1,
					Status:      models.TaskStatusCompleted,
				}
				appRepo.applications[1] = &models.TaskApplication{
					ID:       1,
					TaskID:   1,
					TaskerID: 2,
					Status:   models.ApplicationStatusPending,
				}
			},
			wantErr:     true,
			errContains: "not open",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			taskRepo := newMockTaskRepository()
			appRepo := newMockApplicationRepository()
			catRepo := newMockCategoryRepository()
			userRepo := newMockUserRepository()

			if tt.setupRepo != nil {
				tt.setupRepo(taskRepo, appRepo)
			}

			service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, nil, nil, nil, nil)
			ctx := context.Background()

			err := service.AcceptApplication(ctx, tt.applicationID, tt.requesterID)

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
			}
		})
	}
}

func TestTaskService_GetTask(t *testing.T) {
	tests := []struct {
		name        string
		taskID      int64
		setupRepo   func(*mockTaskRepository)
		wantErr     bool
		errContains string
	}{
		{
			name:   "task exists",
			taskID: 1,
			setupRepo: func(taskRepo *mockTaskRepository) {
				taskRepo.tasks[1] = &models.Task{
					ID:          1,
					Title:       "Test Task",
					RequesterID: 1,
					Status:      models.TaskStatusOpen,
				}
			},
			wantErr: false,
		},
		{
			name:        "task not found",
			taskID:      999,
			setupRepo:   func(taskRepo *mockTaskRepository) {},
			wantErr:     true,
			errContains: "task not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			taskRepo := newMockTaskRepository()
			appRepo := newMockApplicationRepository()
			catRepo := newMockCategoryRepository()
			userRepo := newMockUserRepository()

			if tt.setupRepo != nil {
				tt.setupRepo(taskRepo)
			}

			service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, nil, nil, nil, nil)
			ctx := context.Background()

			task, err := service.GetTask(ctx, tt.taskID)

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
					t.Error("Expected task to be returned, got nil")
				}
			}
		})
	}
}

func TestTaskService_UpdateTask(t *testing.T) {
	tests := []struct {
		name        string
		taskID      int64
		requesterID int64
		input       *CreateTaskInput
		setupRepo   func(*mockTaskRepository, *mockCategoryRepository)
		wantErr     bool
		errContains string
	}{
		{
			name:        "valid update",
			taskID:      1,
			requesterID: 1,
			input: &CreateTaskInput{
				Title:       "Updated Task",
				Description: "Updated Description",
				CategoryID:  1,
				Price:       15000,
				Location:    "Updated Location",
			},
			setupRepo: func(taskRepo *mockTaskRepository, catRepo *mockCategoryRepository) {
				taskRepo.tasks[1] = &models.Task{
					ID:          1,
					RequesterID: 1,
					Status:      models.TaskStatusOpen,
				}
				catRepo.categories[1] = &models.Category{ID: 1, Name: "Moving"}
			},
			wantErr: false,
		},
		{
			name:        "task not found",
			taskID:      999,
			requesterID: 1,
			input:       &CreateTaskInput{Title: "Test", CategoryID: 1, Price: 10000},
			setupRepo:   func(taskRepo *mockTaskRepository, catRepo *mockCategoryRepository) {},
			wantErr:     true,
			errContains: "task not found",
		},
		{
			name:        "not authorized",
			taskID:      1,
			requesterID: 999,
			input:       &CreateTaskInput{Title: "Test", CategoryID: 1, Price: 10000},
			setupRepo: func(taskRepo *mockTaskRepository, catRepo *mockCategoryRepository) {
				taskRepo.tasks[1] = &models.Task{
					ID:          1,
					RequesterID: 1,
					Status:      models.TaskStatusOpen,
				}
			},
			wantErr:     true,
			errContains: "not authorized",
		},
		{
			name:        "task not open",
			taskID:      1,
			requesterID: 1,
			input:       &CreateTaskInput{Title: "Test", CategoryID: 1, Price: 10000},
			setupRepo: func(taskRepo *mockTaskRepository, catRepo *mockCategoryRepository) {
				taskRepo.tasks[1] = &models.Task{
					ID:          1,
					RequesterID: 1,
					Status:      models.TaskStatusCompleted,
				}
			},
			wantErr:     true,
			errContains: "only update tasks with status 'open'",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			taskRepo := newMockTaskRepository()
			appRepo := newMockApplicationRepository()
			catRepo := newMockCategoryRepository()
			userRepo := newMockUserRepository()

			if tt.setupRepo != nil {
				tt.setupRepo(taskRepo, catRepo)
			}

			service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, nil, nil, nil, nil)
			ctx := context.Background()

			task, err := service.UpdateTask(ctx, tt.taskID, tt.requesterID, tt.input)

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
					t.Error("Expected task to be updated, got nil")
				}
			}
		})
	}
}

func TestTaskService_DeleteTask(t *testing.T) {
	tests := []struct {
		name        string
		taskID      int64
		requesterID int64
		setupRepo   func(*mockTaskRepository, *mockApplicationRepository)
		wantErr     bool
		errContains string
		verifyAfter func(t *testing.T, taskRepo *mockTaskRepository, appRepo *mockApplicationRepository)
	}{
		{
			name:        "valid deletion - open task no applications",
			taskID:      1,
			requesterID: 1,
			setupRepo: func(taskRepo *mockTaskRepository, appRepo *mockApplicationRepository) {
				taskRepo.tasks[1] = &models.Task{
					ID:          1,
					RequesterID: 1,
					Status:      models.TaskStatusOpen,
					Title:       "Test Task",
				}
			},
			wantErr: false,
			verifyAfter: func(t *testing.T, taskRepo *mockTaskRepository, appRepo *mockApplicationRepository) {
				task := taskRepo.tasks[1]
				if task.Status != models.TaskStatusCancelled {
					t.Errorf("Expected task status 'cancelled', got '%s'", task.Status)
				}
			},
		},
		{
			name:        "valid deletion - open task with pending applications rejected",
			taskID:      1,
			requesterID: 1,
			setupRepo: func(taskRepo *mockTaskRepository, appRepo *mockApplicationRepository) {
				taskRepo.tasks[1] = &models.Task{
					ID:          1,
					RequesterID: 1,
					Status:      models.TaskStatusOpen,
					Title:       "Test Task",
				}
				appRepo.applications[1] = &models.TaskApplication{
					ID:       1,
					TaskID:   1,
					TaskerID: 2,
					Status:   models.ApplicationStatusPending,
				}
				appRepo.applications[2] = &models.TaskApplication{
					ID:       2,
					TaskID:   1,
					TaskerID: 3,
					Status:   models.ApplicationStatusPending,
				}
			},
			wantErr: false,
			verifyAfter: func(t *testing.T, taskRepo *mockTaskRepository, appRepo *mockApplicationRepository) {
				task := taskRepo.tasks[1]
				if task.Status != models.TaskStatusCancelled {
					t.Errorf("Expected task status 'cancelled', got '%s'", task.Status)
				}
				for _, app := range appRepo.applications {
					if app.TaskID == 1 && app.Status != models.ApplicationStatusRejected {
						t.Errorf("Expected application %d to be rejected, got '%s'", app.ID, app.Status)
					}
				}
			},
		},
		{
			name:        "blocked - accepted application exists",
			taskID:      1,
			requesterID: 1,
			setupRepo: func(taskRepo *mockTaskRepository, appRepo *mockApplicationRepository) {
				taskRepo.tasks[1] = &models.Task{
					ID:          1,
					RequesterID: 1,
					Status:      models.TaskStatusOpen,
				}
				appRepo.applications[1] = &models.TaskApplication{
					ID:       1,
					TaskID:   1,
					TaskerID: 2,
					Status:   models.ApplicationStatusAccepted,
				}
			},
			wantErr:     true,
			errContains: "cannot delete: an applicant has been accepted",
		},
		{
			name:        "task not found",
			taskID:      999,
			requesterID: 1,
			setupRepo:   func(taskRepo *mockTaskRepository, appRepo *mockApplicationRepository) {},
			wantErr:     true,
			errContains: "task not found",
		},
		{
			name:        "not authorized",
			taskID:      1,
			requesterID: 999,
			setupRepo: func(taskRepo *mockTaskRepository, appRepo *mockApplicationRepository) {
				taskRepo.tasks[1] = &models.Task{
					ID:          1,
					RequesterID: 1,
					Status:      models.TaskStatusOpen,
				}
			},
			wantErr:     true,
			errContains: "not authorized",
		},
		{
			name:        "task in progress",
			taskID:      1,
			requesterID: 1,
			setupRepo: func(taskRepo *mockTaskRepository, appRepo *mockApplicationRepository) {
				taskRepo.tasks[1] = &models.Task{
					ID:          1,
					RequesterID: 1,
					Status:      models.TaskStatusInProgress,
				}
			},
			wantErr:     true,
			errContains: "only delete tasks with status 'open'",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			taskRepo := newMockTaskRepository()
			appRepo := newMockApplicationRepository()
			catRepo := newMockCategoryRepository()
			userRepo := newMockUserRepository()

			if tt.setupRepo != nil {
				tt.setupRepo(taskRepo, appRepo)
			}

			service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, nil, nil, nil, nil)
			ctx := context.Background()

			err := service.DeleteTask(ctx, tt.taskID, tt.requesterID)

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
				if tt.verifyAfter != nil {
					tt.verifyAfter(t, taskRepo, appRepo)
				}
			}
		})
	}
}

func TestTaskService_ListTasks(t *testing.T) {
	tests := []struct {
		name      string
		filters   repository.TaskFilters
		setupRepo func(*mockTaskRepository)
		wantCount int
		wantErr   bool
	}{
		{
			name:    "list all tasks",
			filters: repository.TaskFilters{},
			setupRepo: func(taskRepo *mockTaskRepository) {
				taskRepo.tasks[1] = &models.Task{ID: 1, Status: models.TaskStatusOpen}
				taskRepo.tasks[2] = &models.Task{ID: 2, Status: models.TaskStatusOpen}
			},
			wantCount: 2,
			wantErr:   false,
		},
		{
			name:      "empty list",
			filters:   repository.TaskFilters{},
			setupRepo: func(taskRepo *mockTaskRepository) {},
			wantCount: 0,
			wantErr:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			taskRepo := newMockTaskRepository()
			appRepo := newMockApplicationRepository()
			catRepo := newMockCategoryRepository()
			userRepo := newMockUserRepository()

			if tt.setupRepo != nil {
				tt.setupRepo(taskRepo)
			}

			service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, nil, nil, nil, nil)
			ctx := context.Background()

			tasks, total, _, err := service.ListTasks(ctx, tt.filters)

			if tt.wantErr {
				if err == nil {
					t.Error("Expected error, got nil")
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if len(tasks) != tt.wantCount {
					t.Errorf("Expected %d tasks, got %d", tt.wantCount, len(tasks))
				}
				if total != tt.wantCount {
					t.Errorf("Expected total %d, got %d", tt.wantCount, total)
				}
			}
		})
	}
}

func TestTaskService_CompleteTask(t *testing.T) {
	tests := []struct {
		name        string
		taskID      int64
		requesterID int64
		setupRepo   func(*mockTaskRepository)
		wantErr     bool
		errContains string
	}{
		{
			name:        "valid completion",
			taskID:      1,
			requesterID: 1,
			setupRepo: func(taskRepo *mockTaskRepository) {
				taskerID := int64(2)
				taskRepo.tasks[1] = &models.Task{
					ID:          1,
					RequesterID: 1,
					TaskerID:    &taskerID,
					Status:      models.TaskStatusInProgress,
				}
			},
			wantErr: false,
		},
		{
			name:        "task not found",
			taskID:      999,
			requesterID: 1,
			setupRepo:   func(taskRepo *mockTaskRepository) {},
			wantErr:     true,
			errContains: "task not found",
		},
		{
			name:        "not authorized",
			taskID:      1,
			requesterID: 999,
			setupRepo: func(taskRepo *mockTaskRepository) {
				taskerID := int64(2)
				taskRepo.tasks[1] = &models.Task{
					ID:          1,
					RequesterID: 1,
					TaskerID:    &taskerID,
					Status:      models.TaskStatusInProgress,
				}
			},
			wantErr:     true,
			errContains: "not authorized",
		},
		{
			name:        "task not in progress",
			taskID:      1,
			requesterID: 1,
			setupRepo: func(taskRepo *mockTaskRepository) {
				taskRepo.tasks[1] = &models.Task{
					ID:          1,
					RequesterID: 1,
					Status:      models.TaskStatusOpen,
				}
			},
			wantErr:     true,
			errContains: "not in progress",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			taskRepo := newMockTaskRepository()
			appRepo := newMockApplicationRepository()
			catRepo := newMockCategoryRepository()
			userRepo := newMockUserRepository()

			if tt.setupRepo != nil {
				tt.setupRepo(taskRepo)
			}

			service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, nil, nil, nil, nil)
			ctx := context.Background()

			err := service.CompleteTask(ctx, tt.taskID, tt.requesterID)

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
			}
		})
	}
}

func TestTaskService_GetTaskApplications(t *testing.T) {
	tests := []struct {
		name        string
		taskID      int64
		requesterID int64
		setupRepo   func(*mockTaskRepository, *mockApplicationRepository)
		wantCount   int
		wantErr     bool
		errContains string
	}{
		{
			name:        "valid retrieval",
			taskID:      1,
			requesterID: 1,
			setupRepo: func(taskRepo *mockTaskRepository, appRepo *mockApplicationRepository) {
				taskRepo.tasks[1] = &models.Task{
					ID:          1,
					RequesterID: 1,
					Status:      models.TaskStatusOpen,
				}
				appRepo.applications[1] = &models.TaskApplication{ID: 1, TaskID: 1, TaskerID: 2}
				appRepo.applications[2] = &models.TaskApplication{ID: 2, TaskID: 1, TaskerID: 3}
			},
			wantCount: 2,
			wantErr:   false,
		},
		{
			name:        "task not found",
			taskID:      999,
			requesterID: 1,
			setupRepo:   func(taskRepo *mockTaskRepository, appRepo *mockApplicationRepository) {},
			wantErr:     true,
			errContains: "task not found",
		},
		{
			name:        "not authorized",
			taskID:      1,
			requesterID: 999,
			setupRepo: func(taskRepo *mockTaskRepository, appRepo *mockApplicationRepository) {
				taskRepo.tasks[1] = &models.Task{
					ID:          1,
					RequesterID: 1,
					Status:      models.TaskStatusOpen,
				}
			},
			wantErr:     true,
			errContains: "not authorized",
		},
		{
			name:        "no applications",
			taskID:      1,
			requesterID: 1,
			setupRepo: func(taskRepo *mockTaskRepository, appRepo *mockApplicationRepository) {
				taskRepo.tasks[1] = &models.Task{
					ID:          1,
					RequesterID: 1,
					Status:      models.TaskStatusOpen,
				}
			},
			wantCount: 0,
			wantErr:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			taskRepo := newMockTaskRepository()
			appRepo := newMockApplicationRepository()
			catRepo := newMockCategoryRepository()
			userRepo := newMockUserRepository()

			if tt.setupRepo != nil {
				tt.setupRepo(taskRepo, appRepo)
			}

			service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, nil, nil, nil, nil)
			ctx := context.Background()

			apps, err := service.GetTaskApplications(ctx, tt.taskID, tt.requesterID)

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
				if len(apps) != tt.wantCount {
					t.Errorf("Expected %d applications, got %d", tt.wantCount, len(apps))
				}
			}
		})
	}
}

func TestTaskService_CreateTask_Deadline(t *testing.T) {
	tests := []struct {
		name        string
		deadline    *string
		wantErr     bool
		errContains string
	}{
		{
			name: "valid deadline - 2 hours in future",
			deadline: func() *string {
				d := time.Now().Add(2 * time.Hour).Format(time.RFC3339)
				return &d
			}(),
			wantErr: false,
		},
		{
			name: "past deadline rejected",
			deadline: func() *string {
				d := time.Now().Add(-1 * time.Hour).Format(time.RFC3339)
				return &d
			}(),
			wantErr:     true,
			errContains: "deadline must be at least 1 hour in the future",
		},
		{
			name: "deadline too soon - 30 min",
			deadline: func() *string {
				d := time.Now().Add(30 * time.Minute).Format(time.RFC3339)
				return &d
			}(),
			wantErr:     true,
			errContains: "deadline must be at least 1 hour in the future",
		},
		{
			name: "invalid format rejected",
			deadline: func() *string {
				d := "not-a-date"
				return &d
			}(),
			wantErr:     true,
			errContains: "invalid deadline format",
		},
		{
			name:     "nil deadline allowed",
			deadline: nil,
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			taskRepo := newMockTaskRepository()
			appRepo := newMockApplicationRepository()
			catRepo := newMockCategoryRepository()
			userRepo := newMockUserRepository()

			catRepo.categories[1] = &models.Category{ID: 1, Name: "Moving"}
			userRepo.users[1] = &models.User{ID: 1, Email: strPtr("test@test.com"), Name: "Test User"}

			service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, nil, nil, nil, nil)
			ctx := context.Background()

			input := &CreateTaskInput{
				Title:       "Deadline Task",
				Description: "Test Description",
				CategoryID:  1,
				Price:       10000,
				Location:    "HCMUS",
				Deadline:    tt.deadline,
			}

			task, err := service.CreateTask(ctx, 1, input)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error containing '%s', got nil", tt.errContains)
				} else if !contains(err.Error(), tt.errContains) {
					t.Errorf("Expected error containing '%s', got '%s'", tt.errContains, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
				}
				if task == nil {
					t.Error("Expected task to be created, got nil")
				}
				if tt.deadline != nil && task != nil && task.Deadline == nil {
					t.Error("Expected task to have deadline set")
				}
				if tt.deadline == nil && task != nil && task.Deadline != nil {
					t.Error("Expected task to have no deadline")
				}
			}
		})
	}
}

func TestTaskService_ApplyForTask_Overdue(t *testing.T) {
	t.Run("apply for overdue task blocked", func(t *testing.T) {
		taskRepo := newMockTaskRepository()
		appRepo := newMockApplicationRepository()
		catRepo := newMockCategoryRepository()
		userRepo := newMockUserRepository()

		pastDeadline := time.Now().Add(-1 * time.Hour)
		taskRepo.tasks[1] = &models.Task{
			ID:          1,
			RequesterID: 1,
			Status:      models.TaskStatusOpen,
			Deadline:    &pastDeadline,
		}
		userRepo.users[2] = &models.User{ID: 2, Name: "Tasker", Bio: strPtr("I do tasks")}

		service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, nil, nil, nil, nil)
		ctx := context.Background()

		_, err := service.ApplyForTask(ctx, 1, 2, &ApplyForTaskInput{Message: "I can help"})

		if err == nil {
			t.Error("Expected error for overdue task, got nil")
		} else if !contains(err.Error(), "deadline has passed") {
			t.Errorf("Expected error containing 'deadline has passed', got '%s'", err.Error())
		}
	})

	t.Run("apply for task with future deadline allowed", func(t *testing.T) {
		taskRepo := newMockTaskRepository()
		appRepo := newMockApplicationRepository()
		catRepo := newMockCategoryRepository()
		userRepo := newMockUserRepository()

		futureDeadline := time.Now().Add(2 * time.Hour)
		taskRepo.tasks[1] = &models.Task{
			ID:          1,
			RequesterID: 1,
			Status:      models.TaskStatusOpen,
			Deadline:    &futureDeadline,
		}
		userRepo.users[2] = &models.User{ID: 2, Name: "Tasker", Bio: strPtr("I do tasks")}

		service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, nil, nil, nil, nil)
		ctx := context.Background()

		app, err := service.ApplyForTask(ctx, 1, 2, &ApplyForTaskInput{Message: "I can help"})

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if app == nil {
			t.Error("Expected application to be created, got nil")
		}
	})
}

func TestTaskService_CompleteTask_OverdueStillWorks(t *testing.T) {
	taskRepo := newMockTaskRepository()
	appRepo := newMockApplicationRepository()
	catRepo := newMockCategoryRepository()
	userRepo := newMockUserRepository()

	userRepo.users[1] = &models.User{ID: 1, Email: strPtr("test@test.com"), Name: "Test User"}
	taskerID := int64(2)
	pastDeadline := time.Now().Add(-1 * time.Hour)
	taskRepo.tasks[1] = &models.Task{
		ID:          1,
		RequesterID: 1,
		TaskerID:    &taskerID,
		Status:      models.TaskStatusInProgress,
		Deadline:    &pastDeadline,
	}

	service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, nil, nil, nil, nil)
	ctx := context.Background()

	err := service.CompleteTask(ctx, 1, 1)
	if err != nil {
		t.Errorf("Expected overdue in_progress task to still be completable, got error: %v", err)
	}
}

// Helper functions
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 || (len(s) > 0 && len(substr) > 0 && hasSubstring(s, substr)))
}

func hasSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}


// --- Tests for DeleteTask with gorm.DB (transactional path) ---

func TestTaskService_DeleteTask_WithDB(t *testing.T) {
	taskRepo := newMockTaskRepository()
	appRepo := newMockApplicationRepository()
	catRepo := newMockCategoryRepository()
	userRepo := newMockUserRepository()

	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	// Seed an open task owned by user 1
	taskRepo.tasks[1] = &models.Task{
		ID: 1, RequesterID: 1, Status: models.TaskStatusOpen, Title: "Test Task",
	}

	service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, nil, mockDB, nil, nil)
	err = service.DeleteTask(context.Background(), 1, 1)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	// Verify task status changed to cancelled (via UpdateStatus mock)
	task := taskRepo.tasks[1]
	if task.Status != models.TaskStatusCancelled {
		t.Errorf("Expected status cancelled, got %s", task.Status)
	}
}

func TestTaskService_DeleteTask_WithDB_BlockedByAccepted(t *testing.T) {
	taskRepo := newMockTaskRepository()
	appRepo := newMockApplicationRepository()
	catRepo := newMockCategoryRepository()
	userRepo := newMockUserRepository()

	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	// Seed task and an accepted application
	taskRepo.tasks[1] = &models.Task{
		ID: 1, RequesterID: 1, Status: models.TaskStatusOpen, Title: "Accepted Task",
	}
	appRepo.applications[10] = &models.TaskApplication{
		ID: 10, TaskID: 1, TaskerID: 2, Status: models.ApplicationStatusAccepted,
	}

	service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, nil, mockDB, nil, nil)
	err = service.DeleteTask(context.Background(), 1, 1)
	if err == nil {
		t.Fatal("Expected error when accepted application exists, got nil")
	}
	if !contains(err.Error(), "cannot delete") {
		t.Errorf("Expected error about accepted applicant, got: %s", err.Error())
	}

	// Task should still be open (transaction rolled back)
	if taskRepo.tasks[1].Status != models.TaskStatusOpen {
		t.Errorf("Expected task to remain open after rollback, got %s", taskRepo.tasks[1].Status)
	}
}

func TestTaskService_DeleteTask_WithDB_WithPendingApps(t *testing.T) {
	taskRepo := newMockTaskRepository()
	appRepo := newMockApplicationRepository()
	catRepo := newMockCategoryRepository()
	userRepo := newMockUserRepository()

	mockDB, cleanup, err := testutil.NewMockGormDB()
	if err != nil {
		t.Fatalf("Failed to create mock DB: %v", err)
	}
	defer cleanup()

	// Seed task with pending applications
	taskRepo.tasks[1] = &models.Task{
		ID: 1, RequesterID: 1, Status: models.TaskStatusOpen, Title: "Pending Apps Task",
	}
	appRepo.applications[10] = &models.TaskApplication{
		ID: 10, TaskID: 1, TaskerID: 2, Status: models.ApplicationStatusPending,
	}
	appRepo.applications[11] = &models.TaskApplication{
		ID: 11, TaskID: 1, TaskerID: 3, Status: models.ApplicationStatusPending,
	}

	service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, nil, mockDB, nil, nil)
	err = service.DeleteTask(context.Background(), 1, 1)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	// Verify task is cancelled
	if taskRepo.tasks[1].Status != models.TaskStatusCancelled {
		t.Errorf("Expected status cancelled, got %s", taskRepo.tasks[1].Status)
	}

	// Verify pending applications were rejected
	for _, app := range appRepo.applications {
		if app.TaskID == 1 && app.Status != models.ApplicationStatusRejected {
			t.Errorf("Expected application %d to be rejected, got %s", app.ID, app.Status)
		}
	}
}

func TestTaskService_DeleteTask_WithNotifications(t *testing.T) {
	taskRepo := newMockTaskRepository()
	appRepo := newMockApplicationRepository()
	catRepo := newMockCategoryRepository()
	userRepo := newMockUserRepository()
	notifRepo := testutil.NewMockNotificationRepository()
	notifService := NewNotificationService(notifRepo, nil)

	// Seed task with pending applications (no db, uses simple path with notifications)
	taskRepo.tasks[1] = &models.Task{
		ID: 1, RequesterID: 1, Status: models.TaskStatusOpen, Title: "Notify Task",
	}
	appRepo.applications[10] = &models.TaskApplication{
		ID: 10, TaskID: 1, TaskerID: 2, Status: models.ApplicationStatusPending,
	}
	appRepo.applications[11] = &models.TaskApplication{
		ID: 11, TaskID: 1, TaskerID: 3, Status: models.ApplicationStatusPending,
	}

	// Use nil db to exercise the simple (non-transactional) path with notifications
	service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, notifService, nil, nil, nil)
	err := service.DeleteTask(context.Background(), 1, 1)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	// Verify notifications were created for each pending applicant (2 applicants)
	if len(notifRepo.Notifications) != 2 {
		t.Errorf("Expected 2 notifications (one per pending applicant), got %d", len(notifRepo.Notifications))
	}

	// Verify notifications are task_cancelled type
	for _, n := range notifRepo.Notifications {
		if n.Type != models.NotificationTypeTaskCancelled {
			t.Errorf("Expected notification type task_cancelled, got %s", n.Type)
		}
	}
}

// --- Tests for CompleteTask with notifications and tasker ---

func TestTaskService_CompleteTask_WithNotificationsAndTasker(t *testing.T) {
	taskRepo := newMockTaskRepository()
	appRepo := newMockApplicationRepository()
	catRepo := newMockCategoryRepository()
	userRepo := newMockUserRepository()
	notifRepo := testutil.NewMockNotificationRepository()
	notifService := NewNotificationService(notifRepo, nil)

	taskerID := int64(2)
	taskRepo.tasks[1] = &models.Task{
		ID: 1, RequesterID: 1, TaskerID: &taskerID,
		Status: models.TaskStatusInProgress, Title: "Test Task",
	}

	// No paymentService, no db — exercises the notification branches directly
	service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, notifService, nil, nil, nil)
	err := service.CompleteTask(context.Background(), 1, 1)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	// Verify task is completed
	if taskRepo.tasks[1].Status != models.TaskStatusCompleted {
		t.Errorf("Expected status completed, got %s", taskRepo.tasks[1].Status)
	}

	// Verify 2 notifications: one for requester, one for tasker
	if len(notifRepo.Notifications) != 2 {
		t.Errorf("Expected 2 notifications, got %d", len(notifRepo.Notifications))
	}

	// Check that both user IDs received notifications
	notifiedUsers := make(map[int64]bool)
	for _, n := range notifRepo.Notifications {
		notifiedUsers[n.UserID] = true
		if n.Type != models.NotificationTypeTaskCompleted {
			t.Errorf("Expected notification type task_completed, got %s", n.Type)
		}
	}
	if !notifiedUsers[1] {
		t.Error("Expected requester (user 1) to receive a notification")
	}
	if !notifiedUsers[2] {
		t.Error("Expected tasker (user 2) to receive a notification")
	}
}

func TestTaskService_CompleteTask_WithNotificationsNoTasker(t *testing.T) {
	taskRepo := newMockTaskRepository()
	appRepo := newMockApplicationRepository()
	catRepo := newMockCategoryRepository()
	userRepo := newMockUserRepository()
	notifRepo := testutil.NewMockNotificationRepository()
	notifService := NewNotificationService(notifRepo, nil)

	// Task with no tasker (TaskerID is nil)
	taskRepo.tasks[1] = &models.Task{
		ID: 1, RequesterID: 1, TaskerID: nil,
		Status: models.TaskStatusInProgress, Title: "Solo Task",
	}

	service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, notifService, nil, nil, nil)
	err := service.CompleteTask(context.Background(), 1, 1)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	// Only 1 notification (requester only, no tasker)
	if len(notifRepo.Notifications) != 1 {
		t.Errorf("Expected 1 notification (requester only), got %d", len(notifRepo.Notifications))
	}
}

// --- Test ListTasks with search query (NoOpSearchService fallback) ---

func TestTaskService_ListTasks_WithSearchQuery(t *testing.T) {
	taskRepo := newMockTaskRepository()
	appRepo := newMockApplicationRepository()
	catRepo := newMockCategoryRepository()
	userRepo := newMockUserRepository()

	// Seed tasks
	taskRepo.tasks[1] = &models.Task{ID: 1, Status: models.TaskStatusOpen, Title: "Go programming", RequesterID: 1}
	taskRepo.tasks[2] = &models.Task{ID: 2, Status: models.TaskStatusOpen, Title: "Python scripting", RequesterID: 1}

	// searchService=nil means NewTaskService creates NoOpSearchService internally
	service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, nil, nil, nil, nil)

	search := "Go"
	tasks, total, _, err := service.ListTasks(context.Background(), repository.TaskFilters{
		Search: &search,
	})
	if err != nil {
		t.Fatalf("Expected no error with search query, got: %v", err)
	}

	// NoOpSearchService returns (nil, 0, nil), isNoOp check detects it,
	// falls through to DB (mock List returns all tasks)
	if tasks == nil {
		t.Fatal("Expected tasks from DB fallback, got nil")
	}
	// mock CountByFilters returns len(tasks)==2
	if total != 2 {
		t.Errorf("Expected total=2 from mock, got %d", total)
	}
}

func TestTaskService_ListTasks_WithEmptySearchQuery(t *testing.T) {
	taskRepo := newMockTaskRepository()
	appRepo := newMockApplicationRepository()
	catRepo := newMockCategoryRepository()
	userRepo := newMockUserRepository()

	taskRepo.tasks[1] = &models.Task{ID: 1, Status: models.TaskStatusOpen, Title: "Test", RequesterID: 1}

	service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, nil, nil, nil, nil)

	// Empty search string should skip the search branch entirely
	emptySearch := ""
	tasks, total, _, err := service.ListTasks(context.Background(), repository.TaskFilters{
		Search: &emptySearch,
	})
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}
	if tasks == nil {
		t.Fatal("Expected tasks, got nil")
	}
	if total != 1 {
		t.Errorf("Expected total=1, got %d", total)
	}
}

func TestTaskService_AcceptApplication_NotPending(t *testing.T) {
	taskRepo := newMockTaskRepository()
	appRepo := newMockApplicationRepository()
	catRepo := newMockCategoryRepository()
	userRepo := newMockUserRepository()

	taskRepo.tasks[1] = &models.Task{ID: 1, RequesterID: 1, Status: models.TaskStatusOpen}
	appRepo.applications[1] = &models.TaskApplication{ID: 1, TaskID: 1, TaskerID: 2, Status: models.ApplicationStatusRejected}

	service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, nil, nil, nil, nil)
	err := service.AcceptApplication(context.Background(), 1, 1)
	if err == nil {
		t.Fatal("Expected error for non-pending application, got nil")
	}
	if !contains(err.Error(), "not pending") {
		t.Errorf("Expected error containing 'not pending', got %q", err.Error())
	}
}

func TestTaskService_AcceptApplication_TaskNotOpen(t *testing.T) {
	taskRepo := newMockTaskRepository()
	appRepo := newMockApplicationRepository()
	catRepo := newMockCategoryRepository()
	userRepo := newMockUserRepository()

	taskRepo.tasks[1] = &models.Task{ID: 1, RequesterID: 1, Status: models.TaskStatusCompleted}
	appRepo.applications[1] = &models.TaskApplication{ID: 1, TaskID: 1, TaskerID: 2, Status: models.ApplicationStatusPending}

	service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, nil, nil, nil, nil)
	err := service.AcceptApplication(context.Background(), 1, 1)
	if err == nil {
		t.Fatal("Expected error for non-open task, got nil")
	}
	if !contains(err.Error(), "not open") {
		t.Errorf("Expected error containing 'not open', got %q", err.Error())
	}
}

func TestTaskService_AcceptApplication_WithNotificationsAndRejectsOthers(t *testing.T) {
	taskRepo := newMockTaskRepository()
	appRepo := newMockApplicationRepository()
	catRepo := newMockCategoryRepository()
	userRepo := newMockUserRepository()
	notifRepo := testutil.NewMockNotificationRepository()
	notifService := NewNotificationService(notifRepo, nil)

	taskRepo.tasks[1] = &models.Task{ID: 1, RequesterID: 1, Status: models.TaskStatusOpen, Title: "Test Task"}
	appRepo.applications[1] = &models.TaskApplication{ID: 1, TaskID: 1, TaskerID: 2, Status: models.ApplicationStatusPending}
	appRepo.applications[2] = &models.TaskApplication{ID: 2, TaskID: 1, TaskerID: 3, Status: models.ApplicationStatusPending}

	service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, notifService, nil, nil, nil)
	err := service.AcceptApplication(context.Background(), 1, 1)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	// Verify app 1 accepted
	if appRepo.applications[1].Status != models.ApplicationStatusAccepted {
		t.Errorf("Expected app 1 to be accepted, got %s", appRepo.applications[1].Status)
	}
	// Verify app 2 rejected
	if appRepo.applications[2].Status != models.ApplicationStatusRejected {
		t.Errorf("Expected app 2 to be rejected, got %s", appRepo.applications[2].Status)
	}

	// Verify notification sent to the accepted tasker
	if len(notifRepo.Notifications) != 1 {
		t.Errorf("Expected 1 notification, got %d", len(notifRepo.Notifications))
	}
}
