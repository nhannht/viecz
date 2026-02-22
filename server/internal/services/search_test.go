package services

import (
	"context"
	"testing"

	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
)

func TestNoOpSearchService_SearchTasks_ReturnsEmpty(t *testing.T) {
	svc := &NoOpSearchService{}
	ctx := context.Background()

	ids, total, err := svc.SearchTasks(ctx, "anything", SearchFilters{})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(ids) != 0 {
		t.Errorf("expected empty IDs, got %v", ids)
	}
	if total != 0 {
		t.Errorf("expected total 0, got %d", total)
	}
}

func TestNoOpSearchService_IndexTask_Noop(t *testing.T) {
	svc := &NoOpSearchService{}
	ctx := context.Background()

	task := &models.Task{ID: 1, Title: "Test"}
	if err := svc.IndexTask(ctx, task); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestNoOpSearchService_DeleteTask_Noop(t *testing.T) {
	svc := &NoOpSearchService{}
	ctx := context.Background()

	if err := svc.DeleteTask(ctx, 1); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestNoOpSearchService_BulkIndexTasks_Noop(t *testing.T) {
	svc := &NoOpSearchService{}
	ctx := context.Background()

	tasks := []*models.Task{{ID: 1}, {ID: 2}}
	if err := svc.BulkIndexTasks(ctx, tasks); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestTaskToDocument_MapsFieldsCorrectly(t *testing.T) {
	task := &models.Task{
		ID:          42,
		Title:       "Dọn dẹp nhà cửa",
		Description: "Dọn dẹp căn hộ 2 phòng ngủ",
		CategoryID:  3,
		Status:      models.TaskStatusOpen,
		Price:       200000,
		Location:    "Quận 7, TP.HCM",
	}

	doc := taskToDocument(task)

	if doc["id"] != int64(42) {
		t.Errorf("expected id=42, got %v", doc["id"])
	}
	if doc["title"] != "Dọn dẹp nhà cửa" {
		t.Errorf("expected title='Dọn dẹp nhà cửa', got %v", doc["title"])
	}
	if doc["description"] != "Dọn dẹp căn hộ 2 phòng ngủ" {
		t.Errorf("expected description match, got %v", doc["description"])
	}
	if doc["category_id"] != int64(3) {
		t.Errorf("expected category_id=3, got %v", doc["category_id"])
	}
	if doc["status"] != "open" {
		t.Errorf("expected status='open', got %v", doc["status"])
	}
	if doc["price"] != int64(200000) {
		t.Errorf("expected price=200000, got %v", doc["price"])
	}
	if doc["location"] != "Quận 7, TP.HCM" {
		t.Errorf("expected location match, got %v", doc["location"])
	}
}

func TestListTasks_FallsBackToLIKE_WhenNoOpSearchService(t *testing.T) {
	taskRepo := newMockTaskRepository()
	appRepo := newMockApplicationRepository()
	catRepo := newMockCategoryRepository()
	userRepo := newMockUserRepository()

	// Add tasks to the mock repo
	taskRepo.tasks[1] = &models.Task{ID: 1, Title: "Dọn dẹp", Status: models.TaskStatusOpen}
	taskRepo.tasks[2] = &models.Task{ID: 2, Title: "Sửa laptop", Status: models.TaskStatusOpen}

	// NoOp search service — should fall through to LIKE
	service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, nil, nil, nil, nil)
	ctx := context.Background()

	search := "dọn"
	tasks, total, err := service.ListTasks(ctx, repository.TaskFilters{Search: &search})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Mock repo doesn't actually filter by search — it returns all tasks.
	// The point is that it doesn't panic and does fall back to the repo.
	if tasks == nil {
		t.Error("expected tasks to be returned, got nil")
	}
	if total != len(taskRepo.tasks) {
		t.Errorf("expected total=%d, got %d", len(taskRepo.tasks), total)
	}
}

func TestSearchFilters_BuildsCorrectly(t *testing.T) {
	// Verify SearchFilters struct can be constructed with all fields
	catID := int64(3)
	status := models.TaskStatusOpen
	minPrice := int64(10000)
	maxPrice := int64(50000)

	filters := SearchFilters{
		CategoryID: &catID,
		Status:     &status,
		MinPrice:   &minPrice,
		MaxPrice:   &maxPrice,
		Limit:      20,
		Offset:     10,
	}

	if *filters.CategoryID != 3 {
		t.Errorf("expected CategoryID=3, got %d", *filters.CategoryID)
	}
	if *filters.Status != models.TaskStatusOpen {
		t.Errorf("expected Status=open, got %s", *filters.Status)
	}
	if *filters.MinPrice != 10000 {
		t.Errorf("expected MinPrice=10000, got %d", *filters.MinPrice)
	}
	if *filters.MaxPrice != 50000 {
		t.Errorf("expected MaxPrice=50000, got %d", *filters.MaxPrice)
	}
	if filters.Limit != 20 {
		t.Errorf("expected Limit=20, got %d", filters.Limit)
	}
	if filters.Offset != 10 {
		t.Errorf("expected Offset=10, got %d", filters.Offset)
	}
}
