package services

import (
	"context"
	"errors"
	"testing"

	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
)

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

func (m *mockTaskRepository) UpdateStatus(ctx context.Context, taskID int64, status models.TaskStatus) error {
	task, exists := m.tasks[taskID]
	if !exists {
		return errors.New("task not found")
	}
	task.Status = status
	return nil
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
		if user.Email == email {
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
		if user.Email == email {
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

func (m *mockUserRepository) BecomeTasker(ctx context.Context, userID int64, bio string, skills []string) error {
	user, exists := m.users[userID]
	if !exists {
		return errors.New("user not found")
	}
	user.IsTasker = true
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
				userRepo.users[1] = &models.User{ID: 1, Email: "test@test.com"}
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
				userRepo.users[1] = &models.User{ID: 1, Email: "test@test.com"}
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
				userRepo.users[1] = &models.User{ID: 1, Email: "test@test.com"}
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
				userRepo.users[1] = &models.User{ID: 1, Email: "test@test.com"}
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

			service := NewTaskService(taskRepo, appRepo, catRepo, userRepo)
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
				userRepo.users[2] = &models.User{ID: 2, IsTasker: true}
			},
			wantErr: false,
		},
		{
			name:     "task not found",
			taskID:   999,
			taskerID: 2,
			input:    &ApplyForTaskInput{},
			setupRepo: func(taskRepo *mockTaskRepository, appRepo *mockApplicationRepository, userRepo *mockUserRepository) {
				userRepo.users[2] = &models.User{ID: 2, IsTasker: true}
			},
			wantErr:     true,
			errContains: "task not found",
		},
		{
			name:     "user not tasker",
			taskID:   1,
			taskerID: 2,
			input:    &ApplyForTaskInput{},
			setupRepo: func(taskRepo *mockTaskRepository, appRepo *mockApplicationRepository, userRepo *mockUserRepository) {
				taskRepo.tasks[1] = &models.Task{
					ID:          1,
					RequesterID: 1,
					Status:      models.TaskStatusOpen,
				}
				userRepo.users[2] = &models.User{ID: 2, IsTasker: false}
			},
			wantErr:     true,
			errContains: "not registered as a tasker",
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
				userRepo.users[2] = &models.User{ID: 2, IsTasker: true}
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
				userRepo.users[1] = &models.User{ID: 1, IsTasker: true}
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

			service := NewTaskService(taskRepo, appRepo, catRepo, userRepo)
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

			service := NewTaskService(taskRepo, appRepo, catRepo, userRepo)
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

			service := NewTaskService(taskRepo, appRepo, catRepo, userRepo)
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

			service := NewTaskService(taskRepo, appRepo, catRepo, userRepo)
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
		setupRepo   func(*mockTaskRepository)
		wantErr     bool
		errContains string
	}{
		{
			name:        "valid deletion",
			taskID:      1,
			requesterID: 1,
			setupRepo: func(taskRepo *mockTaskRepository) {
				taskRepo.tasks[1] = &models.Task{
					ID:          1,
					RequesterID: 1,
					Status:      models.TaskStatusOpen,
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
			setupRepo: func(taskRepo *mockTaskRepository) {
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
				tt.setupRepo(taskRepo)
			}

			service := NewTaskService(taskRepo, appRepo, catRepo, userRepo)
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

			service := NewTaskService(taskRepo, appRepo, catRepo, userRepo)
			ctx := context.Background()

			tasks, total, err := service.ListTasks(ctx, tt.filters)

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

			service := NewTaskService(taskRepo, appRepo, catRepo, userRepo)
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

			service := NewTaskService(taskRepo, appRepo, catRepo, userRepo)
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

