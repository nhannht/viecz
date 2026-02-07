package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/models"
)

// Mock CategoryRepository
type mockCategoryRepository struct {
	categories []*models.Category
	shouldFail bool
}

func (m *mockCategoryRepository) Create(ctx context.Context, category *models.Category) error {
	return nil
}

func (m *mockCategoryRepository) GetByID(ctx context.Context, id int64) (*models.Category, error) {
	return nil, nil
}

func (m *mockCategoryRepository) GetAll(ctx context.Context) ([]*models.Category, error) {
	if m.shouldFail {
		return nil, errors.New("database error")
	}
	return m.categories, nil
}

func (m *mockCategoryRepository) Update(ctx context.Context, category *models.Category) error {
	return nil
}

func (m *mockCategoryRepository) Delete(ctx context.Context, id int64) error {
	return nil
}

func TestCategoryHandler_GetCategories(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		setupMock      func(*mockCategoryRepository)
		expectedStatus int
		checkResponse  func(*testing.T, *httptest.ResponseRecorder)
	}{
		{
			name: "successfully get all categories",
			setupMock: func(repo *mockCategoryRepository) {
				repo.categories = []*models.Category{
					{ID: 1, Name: "Programming", NameVi: "Lập trình", IsActive: true},
					{ID: 2, Name: "Design", NameVi: "Thiết kế", IsActive: true},
					{ID: 3, Name: "Writing", NameVi: "Viết lách", IsActive: true},
				}
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var categories []*models.Category
				if err := json.Unmarshal(w.Body.Bytes(), &categories); err != nil {
					t.Fatalf("Failed to unmarshal response: %v", err)
				}
				if len(categories) != 3 {
					t.Errorf("Expected 3 categories, got %d", len(categories))
				}
				if categories[0].Name != "Programming" {
					t.Errorf("Expected first category 'Programming', got '%s'", categories[0].Name)
				}
			},
		},
		{
			name: "no categories found",
			setupMock: func(repo *mockCategoryRepository) {
				repo.categories = []*models.Category{}
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var categories []*models.Category
				if err := json.Unmarshal(w.Body.Bytes(), &categories); err != nil {
					t.Fatalf("Failed to unmarshal response: %v", err)
				}
				if len(categories) != 0 {
					t.Errorf("Expected 0 categories, got %d", len(categories))
				}
			},
		},
		{
			name: "repository error",
			setupMock: func(repo *mockCategoryRepository) {
				repo.shouldFail = true
			},
			expectedStatus: http.StatusInternalServerError,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response map[string]interface{}
				if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
					t.Fatalf("Failed to unmarshal response: %v", err)
				}
				if _, exists := response["error"]; !exists {
					t.Error("Expected error field in response")
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			mockRepo := &mockCategoryRepository{}
			if tt.setupMock != nil {
				tt.setupMock(mockRepo)
			}

			handler := NewCategoryHandler(mockRepo)

			// Create request and response recorder
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request, _ = http.NewRequest(http.MethodGet, "/api/v1/categories", nil)

			// Execute
			handler.GetCategories(c)

			// Assert
			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			if tt.checkResponse != nil {
				tt.checkResponse(t, w)
			}
		})
	}
}
