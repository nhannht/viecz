package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/services"
	"viecz.vieczserver/internal/testutil"
)

func setupTaskHandlerTest(t *testing.T) (*TaskHandler, *testutil.MockTaskRepository, func()) {
	t.Helper()

	taskRepo := testutil.NewMockTaskRepository()
	appRepo := newMockTaskApplicationRepository()
	catRepo := newMockTaskCategoryRepository()
	userRepo := newMockTaskUserRepository()

	// Add some default data
	catRepo.categories[1] = &models.Category{ID: 1, Name: "Moving"}
	userRepo.users[1] = &models.User{ID: 1, Email: "requester@test.com"}
	userRepo.users[2] = &models.User{ID: 2, Email: "tasker@test.com", IsTasker: true}

	taskService := services.NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, nil, nil, nil, nil)
	handler := NewTaskHandler(taskService, appRepo)

	cleanup := func() {
		// No cleanup needed for mock repositories
	}

	return handler, taskRepo, cleanup
}

// Mock repositories for task handler tests
type mockTaskApplicationRepository struct {
	applications map[int64]*models.TaskApplication
}

func newMockTaskApplicationRepository() *mockTaskApplicationRepository {
	return &mockTaskApplicationRepository{
		applications: make(map[int64]*models.TaskApplication),
	}
}

func (m *mockTaskApplicationRepository) Create(ctx context.Context, app *models.TaskApplication) error {
	app.ID = int64(len(m.applications) + 1)
	m.applications[app.ID] = app
	return nil
}

func (m *mockTaskApplicationRepository) GetByID(ctx context.Context, id int64) (*models.TaskApplication, error) {
	app, exists := m.applications[id]
	if !exists {
		return nil, errors.New("application not found")
	}
	return app, nil
}

func (m *mockTaskApplicationRepository) GetByTaskID(ctx context.Context, taskID int64) ([]*models.TaskApplication, error) {
	var apps []*models.TaskApplication
	for _, app := range m.applications {
		if app.TaskID == taskID {
			apps = append(apps, app)
		}
	}
	return apps, nil
}

func (m *mockTaskApplicationRepository) GetByTaskerID(ctx context.Context, taskerID int64) ([]*models.TaskApplication, error) {
	var apps []*models.TaskApplication
	for _, app := range m.applications {
		if app.TaskerID == taskerID {
			apps = append(apps, app)
		}
	}
	return apps, nil
}

func (m *mockTaskApplicationRepository) UpdateStatus(ctx context.Context, id int64, status models.ApplicationStatus) error {
	app, exists := m.applications[id]
	if !exists {
		return errors.New("application not found")
	}
	app.Status = status
	return nil
}

func (m *mockTaskApplicationRepository) Delete(ctx context.Context, id int64) error {
	if _, exists := m.applications[id]; !exists {
		return errors.New("application not found")
	}
	delete(m.applications, id)
	return nil
}

func (m *mockTaskApplicationRepository) ExistsByTaskAndTasker(ctx context.Context, taskID, taskerID int64) (bool, error) {
	for _, app := range m.applications {
		if app.TaskID == taskID && app.TaskerID == taskerID {
			return true, nil
		}
	}
	return false, nil
}

type mockTaskCategoryRepository struct {
	categories map[int64]*models.Category
}

func newMockTaskCategoryRepository() *mockTaskCategoryRepository {
	return &mockTaskCategoryRepository{
		categories: make(map[int64]*models.Category),
	}
}

func (m *mockTaskCategoryRepository) GetByID(ctx context.Context, id int64) (*models.Category, error) {
	cat, exists := m.categories[id]
	if !exists {
		return nil, errors.New("category not found")
	}
	return cat, nil
}

func (m *mockTaskCategoryRepository) GetAll(ctx context.Context) ([]*models.Category, error) {
	var categories []*models.Category
	for _, cat := range m.categories {
		categories = append(categories, cat)
	}
	return categories, nil
}

func (m *mockTaskCategoryRepository) Create(ctx context.Context, category *models.Category) error {
	category.ID = len(m.categories) + 1
	m.categories[int64(category.ID)] = category
	return nil
}

func (m *mockTaskCategoryRepository) Update(ctx context.Context, category *models.Category) error {
	if _, exists := m.categories[int64(category.ID)]; !exists {
		return errors.New("category not found")
	}
	m.categories[int64(category.ID)] = category
	return nil
}

func (m *mockTaskCategoryRepository) Delete(ctx context.Context, id int64) error {
	delete(m.categories, id)
	return nil
}

type mockTaskUserRepository struct {
	users map[int64]*models.User
}

func newMockTaskUserRepository() *mockTaskUserRepository {
	return &mockTaskUserRepository{
		users: make(map[int64]*models.User),
	}
}

func (m *mockTaskUserRepository) GetByID(ctx context.Context, id int64) (*models.User, error) {
	user, exists := m.users[id]
	if !exists {
		return nil, errors.New("user not found")
	}
	return user, nil
}

func (m *mockTaskUserRepository) Create(ctx context.Context, user *models.User) error {
	user.ID = int64(len(m.users) + 1)
	m.users[user.ID] = user
	return nil
}

func (m *mockTaskUserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	for _, user := range m.users {
		if user.Email == email {
			return user, nil
		}
	}
	return nil, errors.New("user not found")
}

func (m *mockTaskUserRepository) Update(ctx context.Context, user *models.User) error {
	if _, exists := m.users[user.ID]; !exists {
		return errors.New("user not found")
	}
	m.users[user.ID] = user
	return nil
}

func (m *mockTaskUserRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	for _, user := range m.users {
		if user.Email == email {
			return true, nil
		}
	}
	return false, nil
}

func (m *mockTaskUserRepository) IncrementTasksPosted(ctx context.Context, userID int64) error {
	return nil
}

func (m *mockTaskUserRepository) IncrementTasksCompleted(ctx context.Context, userID int64) error {
	return nil
}

func (m *mockTaskUserRepository) IncrementEarnings(ctx context.Context, userID int64, amount int64) error {
	return nil
}

func (m *mockTaskUserRepository) BecomeTasker(ctx context.Context, userID int64, bio string, skills []string) error {
	user, exists := m.users[userID]
	if !exists {
		return errors.New("user not found")
	}
	user.IsTasker = true
	return nil
}

func (m *mockTaskUserRepository) UpdateRating(ctx context.Context, userID int64, rating float64) error {
	return nil
}

func (m *mockTaskUserRepository) GetByGoogleID(ctx context.Context, googleID string) (*models.User, error) {
	for _, user := range m.users {
		if user.GoogleID != nil && *user.GoogleID == googleID {
			return user, nil
		}
	}
	return nil, errors.New("user not found")
}

func TestTaskHandler_CreateTask(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		setupContext   func(*gin.Context)
		requestBody    interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name: "successful task creation",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			requestBody: services.CreateTaskInput{
				Title:       "Test Task",
				Description: "Test Description",
				CategoryID:  1,
				Price:       10000,
				Location:    "HCMUS",
			},
			expectedStatus: http.StatusCreated,
		},
		{
			name: "unauthorized - no user_id",
			setupContext: func(c *gin.Context) {
				// Don't set user_id
			},
			requestBody: services.CreateTaskInput{
				Title: "Test Task",
			},
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "unauthorized",
		},
		{
			name: "invalid request body",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			requestBody:    "invalid json",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, _, cleanup := setupTaskHandlerTest(t)
			defer cleanup()

			var bodyBytes []byte
			if str, ok := tt.requestBody.(string); ok {
				bodyBytes = []byte(str)
			} else {
				bodyBytes, _ = json.Marshal(tt.requestBody)
			}

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodPost, "/tasks", bytes.NewReader(bodyBytes))
			c.Request.Header.Set("Content-Type", "application/json")
			tt.setupContext(c)

			handler.CreateTask(c)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d. Body: %s", tt.expectedStatus, w.Code, w.Body.String())
			}
		})
	}
}

func TestTaskHandler_GetTask(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		taskID         string
		setupMocks     func(*testutil.MockTaskRepository)
		expectedStatus int
	}{
		{
			name:   "successful retrieval",
			taskID: "1",
			setupMocks: func(taskRepo *testutil.MockTaskRepository) {
				taskRepo.Tasks[1] = testutil.NewTaskBuilder().WithID(1).WithStatus(models.TaskStatusOpen).Build()
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "task not found",
			taskID:         "999",
			setupMocks:     func(taskRepo *testutil.MockTaskRepository) {},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid task ID",
			taskID:         "invalid",
			setupMocks:     func(taskRepo *testutil.MockTaskRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, taskRepo, cleanup := setupTaskHandlerTest(t)
			defer cleanup()

			if tt.setupMocks != nil {
				tt.setupMocks(taskRepo)
			}

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodGet, "/tasks/"+tt.taskID, nil)
			c.Params = gin.Params{{Key: "id", Value: tt.taskID}}

			handler.GetTask(c)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d. Body: %s", tt.expectedStatus, w.Code, w.Body.String())
			}
		})
	}
}

func TestTaskHandler_UpdateTask(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		taskID         string
		setupContext   func(*gin.Context)
		setupMocks     func(*testutil.MockTaskRepository)
		requestBody    interface{}
		expectedStatus int
	}{
		{
			name:   "successful update",
			taskID: "1",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			setupMocks: func(taskRepo *testutil.MockTaskRepository) {
				taskRepo.Tasks[1] = testutil.NewTaskBuilder().
					WithID(1).
					WithRequesterID(1).
					WithStatus(models.TaskStatusOpen).
					Build()
			},
			requestBody: services.CreateTaskInput{
				Title:       "Updated Task",
				Description: "Updated Description",
				CategoryID:  1,
				Price:       15000,
				Location:    "Updated Location",
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:   "unauthorized",
			taskID: "1",
			setupContext: func(c *gin.Context) {
				// Don't set user_id
			},
			requestBody:    services.CreateTaskInput{},
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:   "invalid task ID",
			taskID: "invalid",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			requestBody:    services.CreateTaskInput{},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, taskRepo, cleanup := setupTaskHandlerTest(t)
			defer cleanup()

			if tt.setupMocks != nil {
				tt.setupMocks(taskRepo)
			}

			var bodyBytes []byte
			if str, ok := tt.requestBody.(string); ok {
				bodyBytes = []byte(str)
			} else {
				bodyBytes, _ = json.Marshal(tt.requestBody)
			}

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodPut, "/tasks/"+tt.taskID, bytes.NewReader(bodyBytes))
			c.Request.Header.Set("Content-Type", "application/json")
			c.Params = gin.Params{{Key: "id", Value: tt.taskID}}
			tt.setupContext(c)

			handler.UpdateTask(c)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d. Body: %s", tt.expectedStatus, w.Code, w.Body.String())
			}
		})
	}
}

func TestTaskHandler_DeleteTask(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		taskID         string
		setupContext   func(*gin.Context)
		setupMocks     func(*testutil.MockTaskRepository)
		expectedStatus int
	}{
		{
			name:   "successful deletion",
			taskID: "1",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			setupMocks: func(taskRepo *testutil.MockTaskRepository) {
				taskRepo.Tasks[1] = testutil.NewTaskBuilder().
					WithID(1).
					WithRequesterID(1).
					WithStatus(models.TaskStatusOpen).
					Build()
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:   "unauthorized",
			taskID: "1",
			setupContext: func(c *gin.Context) {
				// Don't set user_id
			},
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:   "invalid task ID",
			taskID: "invalid",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, taskRepo, cleanup := setupTaskHandlerTest(t)
			defer cleanup()

			if tt.setupMocks != nil {
				tt.setupMocks(taskRepo)
			}

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodDelete, "/tasks/"+tt.taskID, nil)
			c.Params = gin.Params{{Key: "id", Value: tt.taskID}}
			tt.setupContext(c)

			handler.DeleteTask(c)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d. Body: %s", tt.expectedStatus, w.Code, w.Body.String())
			}
		})
	}
}

func TestTaskHandler_ListTasks(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		queryParams    map[string]string
		setupMocks     func(*testutil.MockTaskRepository)
		expectedStatus int
		expectedCount  int
	}{
		{
			name:        "list all tasks - no filters",
			queryParams: map[string]string{},
			setupMocks: func(taskRepo *testutil.MockTaskRepository) {
				taskRepo.Tasks[1] = testutil.NewTaskBuilder().WithID(1).Build()
				taskRepo.Tasks[2] = testutil.NewTaskBuilder().WithID(2).Build()
			},
			expectedStatus: http.StatusOK,
			expectedCount:  2,
		},
		{
			name: "filter by category",
			queryParams: map[string]string{
				"category_id": "1",
			},
			setupMocks: func(taskRepo *testutil.MockTaskRepository) {
				taskRepo.Tasks[1] = testutil.NewTaskBuilder().WithID(1).Build()
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "pagination with limit",
			queryParams: map[string]string{
				"limit": "10",
				"page":  "1",
			},
			setupMocks: func(taskRepo *testutil.MockTaskRepository) {
				taskRepo.Tasks[1] = testutil.NewTaskBuilder().WithID(1).Build()
			},
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, taskRepo, cleanup := setupTaskHandlerTest(t)
			defer cleanup()

			if tt.setupMocks != nil {
				tt.setupMocks(taskRepo)
			}

			url := "/tasks"
			if len(tt.queryParams) > 0 {
				url += "?"
				first := true
				for k, v := range tt.queryParams {
					if !first {
						url += "&"
					}
					url += k + "=" + v
					first = false
				}
			}

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodGet, url, nil)

			handler.ListTasks(c)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d. Body: %s", tt.expectedStatus, w.Code, w.Body.String())
			}
		})
	}
}

func TestTaskHandler_ApplyForTask(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		taskID         string
		setupContext   func(*gin.Context)
		setupMocks     func(*testutil.MockTaskRepository)
		requestBody    interface{}
		expectedStatus int
	}{
		{
			name:   "successful application",
			taskID: "1",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(2)) // Tasker
			},
			setupMocks: func(taskRepo *testutil.MockTaskRepository) {
				taskRepo.Tasks[1] = testutil.NewTaskBuilder().
					WithID(1).
					WithRequesterID(1).
					WithStatus(models.TaskStatusOpen).
					Build()
			},
			requestBody: services.ApplyForTaskInput{
				Message: "I can help",
			},
			expectedStatus: http.StatusCreated,
		},
		{
			name:   "unauthorized",
			taskID: "1",
			setupContext: func(c *gin.Context) {
				// Don't set user_id
			},
			requestBody:    services.ApplyForTaskInput{},
			expectedStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, taskRepo, cleanup := setupTaskHandlerTest(t)
			defer cleanup()

			if tt.setupMocks != nil {
				tt.setupMocks(taskRepo)
			}

			var bodyBytes []byte
			if str, ok := tt.requestBody.(string); ok {
				bodyBytes = []byte(str)
			} else {
				bodyBytes, _ = json.Marshal(tt.requestBody)
			}

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodPost, "/tasks/"+tt.taskID+"/applications", bytes.NewReader(bodyBytes))
			c.Request.Header.Set("Content-Type", "application/json")
			c.Params = gin.Params{{Key: "id", Value: tt.taskID}}
			tt.setupContext(c)

			handler.ApplyForTask(c)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d. Body: %s", tt.expectedStatus, w.Code, w.Body.String())
			}
		})
	}
}

func TestTaskHandler_CompleteTask(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		taskID         string
		setupContext   func(*gin.Context)
		setupMocks     func(*testutil.MockTaskRepository)
		expectedStatus int
	}{
		{
			name:   "successful completion",
			taskID: "1",
			setupContext: func(c *gin.Context) {
				c.Set("user_id", int64(1))
			},
			setupMocks: func(taskRepo *testutil.MockTaskRepository) {
				taskerID := int64(2)
				taskRepo.Tasks[1] = testutil.NewTaskBuilder().
					WithID(1).
					WithRequesterID(1).
					WithTaskerID(taskerID).
					WithStatus(models.TaskStatusInProgress).
					Build()
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:   "unauthorized",
			taskID: "1",
			setupContext: func(c *gin.Context) {
				// Don't set user_id
			},
			expectedStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, taskRepo, cleanup := setupTaskHandlerTest(t)
			defer cleanup()

			if tt.setupMocks != nil {
				tt.setupMocks(taskRepo)
			}

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodPost, "/tasks/"+tt.taskID+"/complete", nil)
			c.Params = gin.Params{{Key: "id", Value: tt.taskID}}
			tt.setupContext(c)

			handler.CompleteTask(c)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d. Body: %s", tt.expectedStatus, w.Code, w.Body.String())
			}
		})
	}
}
