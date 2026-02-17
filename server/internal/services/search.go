package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/meilisearch/meilisearch-go"
	"viecz.vieczserver/internal/models"
)

const tasksIndexUID = "tasks"

// SearchFilters holds optional filters for search queries.
type SearchFilters struct {
	CategoryID *int64
	Status     *models.TaskStatus
	MinPrice   *int64
	MaxPrice   *int64
	Limit      int
	Offset     int
}

// SearchServicer abstracts the search engine (Meilisearch or NoOp fallback).
type SearchServicer interface {
	IndexTask(ctx context.Context, task *models.Task) error
	DeleteTask(ctx context.Context, taskID int64) error
	SearchTasks(ctx context.Context, query string, filters SearchFilters) (taskIDs []int64, total int, err error)
	BulkIndexTasks(ctx context.Context, tasks []*models.Task) error
}

// --- NoOp implementation (fallback when Meilisearch is not configured) ---

// NoOpSearchService returns empty results, signalling the caller to use
// the existing PostgreSQL LIKE query.
type NoOpSearchService struct{}

func (n *NoOpSearchService) IndexTask(_ context.Context, _ *models.Task) error       { return nil }
func (n *NoOpSearchService) DeleteTask(_ context.Context, _ int64) error              { return nil }
func (n *NoOpSearchService) BulkIndexTasks(_ context.Context, _ []*models.Task) error { return nil }
func (n *NoOpSearchService) SearchTasks(_ context.Context, _ string, _ SearchFilters) ([]int64, int, error) {
	return nil, 0, nil // empty = caller falls back to LIKE
}

// --- Meilisearch implementation ---

// MeilisearchService is the real search engine backed by Meilisearch.
type MeilisearchService struct {
	client meilisearch.ServiceManager
	index  meilisearch.IndexManager
}

// NewMeilisearchService connects to a Meilisearch instance and configures the
// "tasks" index (searchable, filterable, sortable attributes).
func NewMeilisearchService(url, apiKey string) (*MeilisearchService, error) {
	var opts []meilisearch.Option
	if apiKey != "" {
		opts = append(opts, meilisearch.WithAPIKey(apiKey))
	}
	client := meilisearch.New(url, opts...)

	// Verify connectivity
	if !client.IsHealthy() {
		return nil, fmt.Errorf("meilisearch at %s is not healthy", url)
	}

	index := client.Index(tasksIndexUID)

	const waitInterval = 100 * time.Millisecond

	// Configure index settings (async — fire and wait)
	taskInfo, err := index.UpdateSearchableAttributes(&[]string{"title", "description"})
	if err != nil {
		return nil, fmt.Errorf("failed to update searchable attributes: %w", err)
	}
	if _, err := client.WaitForTask(taskInfo.TaskUID, waitInterval); err != nil {
		return nil, fmt.Errorf("failed waiting for searchable attributes: %w", err)
	}

	filterableAttrs := []interface{}{"category_id", "status", "price", "deadline"}
	taskInfo, err = index.UpdateFilterableAttributes(&filterableAttrs)
	if err != nil {
		return nil, fmt.Errorf("failed to update filterable attributes: %w", err)
	}
	if _, err := client.WaitForTask(taskInfo.TaskUID, waitInterval); err != nil {
		return nil, fmt.Errorf("failed waiting for filterable attributes: %w", err)
	}

	taskInfo, err = index.UpdateSortableAttributes(&[]string{"price", "created_at", "deadline"})
	if err != nil {
		return nil, fmt.Errorf("failed to update sortable attributes: %w", err)
	}
	if _, err := client.WaitForTask(taskInfo.TaskUID, waitInterval); err != nil {
		return nil, fmt.Errorf("failed waiting for sortable attributes: %w", err)
	}

	log.Printf("[MeilisearchService] Index '%s' configured (searchable: title/description, filterable: category_id/status/price)", tasksIndexUID)

	return &MeilisearchService{client: client, index: index}, nil
}

// taskToDocument converts a Task model to a flat map for indexing.
func taskToDocument(task *models.Task) map[string]interface{} {
	doc := map[string]interface{}{
		"id":          task.ID,
		"title":       task.Title,
		"description": task.Description,
		"category_id": task.CategoryID,
		"status":      string(task.Status),
		"price":       task.Price,
		"location":    task.Location,
		"created_at":  task.CreatedAt.Unix(),
	}
	if task.Deadline != nil {
		doc["deadline"] = task.Deadline.Unix()
	}
	return doc
}

func primaryKeyOpt() *meilisearch.DocumentOptions {
	pk := "id"
	return &meilisearch.DocumentOptions{PrimaryKey: &pk}
}

func (s *MeilisearchService) IndexTask(_ context.Context, task *models.Task) error {
	doc := taskToDocument(task)
	_, err := s.index.AddDocuments([]map[string]interface{}{doc}, primaryKeyOpt())
	if err != nil {
		return fmt.Errorf("failed to index task %d: %w", task.ID, err)
	}
	return nil
}

func (s *MeilisearchService) DeleteTask(_ context.Context, taskID int64) error {
	_, err := s.index.DeleteDocument(strconv.FormatInt(taskID, 10), nil)
	if err != nil {
		return fmt.Errorf("failed to delete task %d from index: %w", taskID, err)
	}
	return nil
}

func (s *MeilisearchService) BulkIndexTasks(_ context.Context, tasks []*models.Task) error {
	if len(tasks) == 0 {
		return nil
	}
	docs := make([]map[string]interface{}, len(tasks))
	for i, task := range tasks {
		docs[i] = taskToDocument(task)
	}
	_, err := s.index.AddDocuments(docs, primaryKeyOpt())
	if err != nil {
		return fmt.Errorf("failed to bulk index %d tasks: %w", len(tasks), err)
	}
	return nil
}

func (s *MeilisearchService) SearchTasks(_ context.Context, query string, filters SearchFilters) ([]int64, int, error) {
	// Build Meilisearch filter string
	var filterParts []string
	if filters.CategoryID != nil {
		filterParts = append(filterParts, fmt.Sprintf("category_id = %d", *filters.CategoryID))
	}
	if filters.Status != nil {
		filterParts = append(filterParts, fmt.Sprintf("status = \"%s\"", string(*filters.Status)))
	}
	if filters.MinPrice != nil {
		filterParts = append(filterParts, fmt.Sprintf("price >= %d", *filters.MinPrice))
	}
	if filters.MaxPrice != nil {
		filterParts = append(filterParts, fmt.Sprintf("price <= %d", *filters.MaxPrice))
	}

	filterStr := ""
	for i, part := range filterParts {
		if i > 0 {
			filterStr += " AND "
		}
		filterStr += part
	}

	limit := int64(20)
	if filters.Limit > 0 {
		limit = int64(filters.Limit)
	}
	offset := int64(0)
	if filters.Offset > 0 {
		offset = int64(filters.Offset)
	}

	searchReq := &meilisearch.SearchRequest{
		Limit:  limit,
		Offset: offset,
	}
	if filterStr != "" {
		searchReq.Filter = filterStr
	}

	res, err := s.index.Search(query, searchReq)
	if err != nil {
		return nil, 0, fmt.Errorf("meilisearch search failed: %w", err)
	}

	// Hit is map[string]json.RawMessage — decode the "id" field
	taskIDs := make([]int64, 0, len(res.Hits))
	for _, hit := range res.Hits {
		idRaw, exists := hit["id"]
		if !exists {
			continue
		}
		var id int64
		if err := json.Unmarshal(idRaw, &id); err != nil {
			continue
		}
		taskIDs = append(taskIDs, id)
	}

	return taskIDs, int(res.EstimatedTotalHits), nil
}
