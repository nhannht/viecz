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

	ids, total, _, err := svc.SearchTasks(ctx, "anything", SearchFilters{})
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
	tasks, total, _, err := service.ListTasks(ctx, repository.TaskFilters{Search: &search})
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

func TestSearchFilters_GeoFields(t *testing.T) {
	lat := 10.7769
	lng := 106.7009
	radius := 5000

	filters := SearchFilters{
		Latitude:      &lat,
		Longitude:     &lng,
		RadiusMeters:  &radius,
		SortByDistance: true,
		Limit:         20,
	}

	if *filters.Latitude != 10.7769 {
		t.Errorf("expected Latitude=10.7769, got %f", *filters.Latitude)
	}
	if *filters.Longitude != 106.7009 {
		t.Errorf("expected Longitude=106.7009, got %f", *filters.Longitude)
	}
	if *filters.RadiusMeters != 5000 {
		t.Errorf("expected RadiusMeters=5000, got %d", *filters.RadiusMeters)
	}
	if !filters.SortByDistance {
		t.Error("expected SortByDistance=true")
	}
}

func TestTaskToDocument_IncludesGeo(t *testing.T) {
	lat := 10.7769
	lng := 106.7009
	task := &models.Task{
		ID:        1,
		Title:     "Test task",
		Status:    models.TaskStatusOpen,
		Price:     50000,
		Latitude:  &lat,
		Longitude: &lng,
	}

	doc := taskToDocument(task)

	geo, ok := doc["_geo"].(map[string]float64)
	if !ok {
		t.Fatal("expected _geo to be map[string]float64")
	}
	if geo["lat"] != 10.7769 {
		t.Errorf("expected _geo.lat=10.7769, got %f", geo["lat"])
	}
	if geo["lng"] != 106.7009 {
		t.Errorf("expected _geo.lng=106.7009, got %f", geo["lng"])
	}
}

func TestTaskToDocument_NoGeoWhenNilCoords(t *testing.T) {
	task := &models.Task{
		ID:     1,
		Title:  "No coords",
		Status: models.TaskStatusOpen,
		Price:  50000,
	}

	doc := taskToDocument(task)
	if _, exists := doc["_geo"]; exists {
		t.Error("expected no _geo field when lat/lng are nil")
	}
}

func TestHaversine_KnownDistance(t *testing.T) {
	// HCMC (10.7769, 106.7009) to Hanoi (21.0285, 105.8542) ≈ 1,150 km
	dist := Haversine(10.7769, 106.7009, 21.0285, 105.8542)
	if dist < 1_100_000 || dist > 1_200_000 {
		t.Errorf("expected ~1150km between HCMC and Hanoi, got %d meters", dist)
	}
}

func TestHaversine_SamePoint(t *testing.T) {
	dist := Haversine(10.7769, 106.7009, 10.7769, 106.7009)
	if dist != 0 {
		t.Errorf("expected 0 distance for same point, got %d", dist)
	}
}

func TestListTasks_HaversineFallback_WithGeoSort(t *testing.T) {
	taskRepo := newMockTaskRepository()
	appRepo := newMockApplicationRepository()
	catRepo := newMockCategoryRepository()
	userRepo := newMockUserRepository()

	lat1, lng1 := 10.7769, 106.7009  // HCMC center
	lat2, lng2 := 10.78, 106.70       // ~350m away
	lat3, lng3 := 10.80, 106.70       // ~2.6km away

	taskRepo.tasks[1] = &models.Task{ID: 1, Title: "Far", Status: models.TaskStatusOpen, Latitude: &lat3, Longitude: &lng3}
	taskRepo.tasks[2] = &models.Task{ID: 2, Title: "Near", Status: models.TaskStatusOpen, Latitude: &lat2, Longitude: &lng2}

	service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, nil, nil, nil, nil)
	ctx := context.Background()

	tasks, _, distances, err := service.ListTasks(ctx, repository.TaskFilters{
		Latitude:      &lat1,
		Longitude:     &lng1,
		SortByDistance: true,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// With NoOpSearchService, falls back to DB + Haversine
	if len(tasks) != 2 {
		t.Fatalf("expected 2 tasks, got %d", len(tasks))
	}
	// Should be sorted by distance (nearest first)
	if tasks[0].ID != 2 {
		t.Errorf("expected nearest task first (ID=2), got ID=%d", tasks[0].ID)
	}
	if tasks[1].ID != 1 {
		t.Errorf("expected farthest task second (ID=1), got ID=%d", tasks[1].ID)
	}

	// Distances should be populated
	if distances == nil {
		t.Fatal("expected distances map, got nil")
	}
	if distances[2] > distances[1] {
		t.Errorf("expected distance[2] < distance[1], got %d vs %d", distances[2], distances[1])
	}
}

func TestListTasks_RadiusFilter_Fallback(t *testing.T) {
	taskRepo := newMockTaskRepository()
	appRepo := newMockApplicationRepository()
	catRepo := newMockCategoryRepository()
	userRepo := newMockUserRepository()

	lat1, lng1 := 10.7769, 106.7009 // center
	lat2, lng2 := 10.78, 106.70      // ~350m away
	lat3, lng3 := 10.85, 106.70      // ~8km away

	taskRepo.tasks[1] = &models.Task{ID: 1, Title: "Close", Status: models.TaskStatusOpen, Latitude: &lat2, Longitude: &lng2}
	taskRepo.tasks[2] = &models.Task{ID: 2, Title: "Far", Status: models.TaskStatusOpen, Latitude: &lat3, Longitude: &lng3}

	service := NewTaskService(taskRepo, appRepo, catRepo, userRepo, nil, nil, nil, nil, nil)
	ctx := context.Background()

	radius := 1000 // 1km
	tasks, total, _, err := service.ListTasks(ctx, repository.TaskFilters{
		Latitude:     &lat1,
		Longitude:    &lng1,
		RadiusMeters: &radius,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Only the close task (350m) should be within 1km radius
	if len(tasks) != 1 {
		t.Fatalf("expected 1 task within radius, got %d", len(tasks))
	}
	if tasks[0].ID != 1 {
		t.Errorf("expected task ID=1, got ID=%d", tasks[0].ID)
	}
	if total != 1 {
		t.Errorf("expected total=1, got %d", total)
	}
}
