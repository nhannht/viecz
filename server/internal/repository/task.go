package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"gorm.io/gorm"
	"viecz.vieczserver/internal/models"
)

// TaskRepository defines the interface for task data operations
type TaskRepository interface {
	Create(ctx context.Context, task *models.Task) error
	GetByID(ctx context.Context, id int64) (*models.Task, error)
	GetByIDForUpdate(ctx context.Context, tx *gorm.DB, id int64) (*models.Task, error)
	Update(ctx context.Context, task *models.Task) error
	UpdateWithTx(ctx context.Context, tx *gorm.DB, task *models.Task) error
	Delete(ctx context.Context, id int64) error
	List(ctx context.Context, filters TaskFilters) ([]*models.Task, error)
	CountByFilters(ctx context.Context, filters TaskFilters) (int, error)
	UpdateStatus(ctx context.Context, id int64, status models.TaskStatus) error
	AssignTasker(ctx context.Context, taskID, taskerID int64) error
	SumOpenTaskPricesByRequester(ctx context.Context, requesterID int64) (int64, error)
	GetByIDs(ctx context.Context, ids []int64) ([]*models.Task, error)
}

// TaskFilters represents filters for listing tasks
type TaskFilters struct {
	CategoryID  *int64
	RequesterID *int64
	TaskerID    *int64
	Status      *models.TaskStatus
	MinPrice    *int64
	MaxPrice    *int64
	Location    *string
	Search      *string
	Limit       int
	Offset      int
}

type taskRepository struct {
	db *sql.DB
}

// NewTaskRepository creates a new TaskRepository
func NewTaskRepository(db *sql.DB) TaskRepository {
	return &taskRepository{db: db}
}

// Verify interface compliance
var _ TaskRepository = (*taskRepository)(nil)

func (r *taskRepository) Create(ctx context.Context, task *models.Task) error {
	if err := task.Validate(); err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}

	query := `
		INSERT INTO tasks (
			requester_id, category_id, title, description, price,
			location, latitude, longitude, status, deadline, image_urls
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, created_at, updated_at
	`

	err := r.db.QueryRowContext(
		ctx, query,
		task.RequesterID, task.CategoryID, task.Title, task.Description, task.Price,
		task.Location, task.Latitude, task.Longitude, task.Status, task.Deadline, task.ImageURLs,
	).Scan(&task.ID, &task.CreatedAt, &task.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create task: %w", err)
	}

	return nil
}

func (r *taskRepository) GetByIDForUpdate(ctx context.Context, tx *gorm.DB, id int64) (*models.Task, error) {
	// SQL-based repository delegates to GetByID (no GORM transaction support)
	return r.GetByID(ctx, id)
}

func (r *taskRepository) GetByID(ctx context.Context, id int64) (*models.Task, error) {
	query := `
		SELECT id, requester_id, tasker_id, category_id, title, description,
			   price, location, latitude, longitude, status, deadline,
			   completed_at, image_urls, requester_rating_id, tasker_rating_id,
			   created_at, updated_at
		FROM tasks
		WHERE id = $1
	`

	task := &models.Task{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&task.ID, &task.RequesterID, &task.TaskerID, &task.CategoryID,
		&task.Title, &task.Description, &task.Price, &task.Location,
		&task.Latitude, &task.Longitude, &task.Status, &task.Deadline,
		&task.CompletedAt, &task.ImageURLs, &task.RequesterRatingID,
		&task.TaskerRatingID, &task.CreatedAt, &task.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("task not found")
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get task: %w", err)
	}

	return task, nil
}

func (r *taskRepository) Update(ctx context.Context, task *models.Task) error {
	if err := task.Validate(); err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}

	query := `
		UPDATE tasks SET
			title = $1, description = $2, price = $3, location = $4,
			latitude = $5, longitude = $6, status = $7, deadline = $8,
			image_urls = $9, updated_at = CURRENT_TIMESTAMP
		WHERE id = $10
		RETURNING updated_at
	`

	err := r.db.QueryRowContext(
		ctx, query,
		task.Title, task.Description, task.Price, task.Location,
		task.Latitude, task.Longitude, task.Status, task.Deadline,
		task.ImageURLs, task.ID,
	).Scan(&task.UpdatedAt)

	if err == sql.ErrNoRows {
		return fmt.Errorf("task not found")
	}

	if err != nil {
		return fmt.Errorf("failed to update task: %w", err)
	}

	return nil
}

func (r *taskRepository) UpdateWithTx(ctx context.Context, tx *gorm.DB, task *models.Task) error {
	// Legacy SQL implementation does not support GORM transactions; fall back to Update
	return r.Update(ctx, task)
}

func (r *taskRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM tasks WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete task: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("task not found")
	}

	return nil
}

func (r *taskRepository) List(ctx context.Context, filters TaskFilters) ([]*models.Task, error) {
	query := `
		SELECT id, requester_id, tasker_id, category_id, title, description,
			   price, location, latitude, longitude, status, deadline,
			   completed_at, image_urls, requester_rating_id, tasker_rating_id,
			   created_at, updated_at
		FROM tasks
		WHERE 1=1
	`

	args := []interface{}{}
	argCount := 1

	// Build WHERE clauses
	if filters.CategoryID != nil {
		query += fmt.Sprintf(" AND category_id = $%d", argCount)
		args = append(args, *filters.CategoryID)
		argCount++
	}

	if filters.RequesterID != nil {
		query += fmt.Sprintf(" AND requester_id = $%d", argCount)
		args = append(args, *filters.RequesterID)
		argCount++
	}

	if filters.TaskerID != nil {
		query += fmt.Sprintf(" AND tasker_id = $%d", argCount)
		args = append(args, *filters.TaskerID)
		argCount++
	}

	if filters.Status != nil {
		query += fmt.Sprintf(" AND status = $%d", argCount)
		args = append(args, *filters.Status)
		argCount++
	}

	if filters.MinPrice != nil {
		query += fmt.Sprintf(" AND price >= $%d", argCount)
		args = append(args, *filters.MinPrice)
		argCount++
	}

	if filters.MaxPrice != nil {
		query += fmt.Sprintf(" AND price <= $%d", argCount)
		args = append(args, *filters.MaxPrice)
		argCount++
	}

	if filters.Location != nil {
		query += fmt.Sprintf(" AND location ILIKE $%d", argCount)
		args = append(args, "%"+*filters.Location+"%")
		argCount++
	}

	if filters.Search != nil && *filters.Search != "" {
		searchPattern := "%" + strings.ToLower(*filters.Search) + "%"
		query += fmt.Sprintf(" AND (LOWER(title) LIKE $%d OR LOWER(description) LIKE $%d)", argCount, argCount)
		args = append(args, searchPattern)
		argCount++
	}

	// Order by created_at DESC
	query += " ORDER BY created_at DESC"

	// Add pagination
	if filters.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argCount)
		args = append(args, filters.Limit)
		argCount++
	}

	if filters.Offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", argCount)
		args = append(args, filters.Offset)
		argCount++
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list tasks: %w", err)
	}
	defer rows.Close()

	tasks := []*models.Task{}
	for rows.Next() {
		task := &models.Task{}
		err := rows.Scan(
			&task.ID, &task.RequesterID, &task.TaskerID, &task.CategoryID,
			&task.Title, &task.Description, &task.Price, &task.Location,
			&task.Latitude, &task.Longitude, &task.Status, &task.Deadline,
			&task.CompletedAt, &task.ImageURLs, &task.RequesterRatingID,
			&task.TaskerRatingID, &task.CreatedAt, &task.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan task: %w", err)
		}
		tasks = append(tasks, task)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating tasks: %w", err)
	}

	return tasks, nil
}

func (r *taskRepository) CountByFilters(ctx context.Context, filters TaskFilters) (int, error) {
	query := `SELECT COUNT(*) FROM tasks WHERE 1=1`

	args := []interface{}{}
	argCount := 1

	// Build WHERE clauses (same as List)
	if filters.CategoryID != nil {
		query += fmt.Sprintf(" AND category_id = $%d", argCount)
		args = append(args, *filters.CategoryID)
		argCount++
	}

	if filters.RequesterID != nil {
		query += fmt.Sprintf(" AND requester_id = $%d", argCount)
		args = append(args, *filters.RequesterID)
		argCount++
	}

	if filters.TaskerID != nil {
		query += fmt.Sprintf(" AND tasker_id = $%d", argCount)
		args = append(args, *filters.TaskerID)
		argCount++
	}

	if filters.Status != nil {
		query += fmt.Sprintf(" AND status = $%d", argCount)
		args = append(args, *filters.Status)
		argCount++
	}

	if filters.MinPrice != nil {
		query += fmt.Sprintf(" AND price >= $%d", argCount)
		args = append(args, *filters.MinPrice)
		argCount++
	}

	if filters.MaxPrice != nil {
		query += fmt.Sprintf(" AND price <= $%d", argCount)
		args = append(args, *filters.MaxPrice)
		argCount++
	}

	if filters.Location != nil {
		query += fmt.Sprintf(" AND location ILIKE $%d", argCount)
		args = append(args, "%"+*filters.Location+"%")
		argCount++
	}

	if filters.Search != nil && *filters.Search != "" {
		searchPattern := "%" + strings.ToLower(*filters.Search) + "%"
		query += fmt.Sprintf(" AND (LOWER(title) LIKE $%d OR LOWER(description) LIKE $%d)", argCount, argCount)
		args = append(args, searchPattern)
		argCount++
	}

	var count int
	err := r.db.QueryRowContext(ctx, query, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count tasks: %w", err)
	}

	return count, nil
}

func (r *taskRepository) UpdateStatus(ctx context.Context, id int64, status models.TaskStatus) error {
	query := `
		UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`

	result, err := r.db.ExecContext(ctx, query, status, id)
	if err != nil {
		return fmt.Errorf("failed to update task status: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("task not found")
	}

	return nil
}

func (r *taskRepository) SumOpenTaskPricesByRequester(ctx context.Context, requesterID int64) (int64, error) {
	query := `SELECT COALESCE(SUM(price), 0) FROM tasks WHERE requester_id = $1 AND status = $2`
	var total int64
	err := r.db.QueryRowContext(ctx, query, requesterID, models.TaskStatusOpen).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("failed to sum open task prices: %w", err)
	}
	return total, nil
}

func (r *taskRepository) GetByIDs(ctx context.Context, ids []int64) ([]*models.Task, error) {
	if len(ids) == 0 {
		return []*models.Task{}, nil
	}

	// Build IN clause: $1, $2, ...
	placeholders := ""
	args := make([]interface{}, len(ids))
	for i, id := range ids {
		if i > 0 {
			placeholders += ", "
		}
		placeholders += fmt.Sprintf("$%d", i+1)
		args[i] = id
	}

	query := fmt.Sprintf(`
		SELECT id, requester_id, tasker_id, category_id, title, description,
			   price, location, latitude, longitude, status, deadline,
			   completed_at, image_urls, requester_rating_id, tasker_rating_id,
			   created_at, updated_at
		FROM tasks
		WHERE id IN (%s)
	`, placeholders)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get tasks by IDs: %w", err)
	}
	defer rows.Close()

	taskMap := make(map[int64]*models.Task, len(ids))
	for rows.Next() {
		task := &models.Task{}
		err := rows.Scan(
			&task.ID, &task.RequesterID, &task.TaskerID, &task.CategoryID,
			&task.Title, &task.Description, &task.Price, &task.Location,
			&task.Latitude, &task.Longitude, &task.Status, &task.Deadline,
			&task.CompletedAt, &task.ImageURLs, &task.RequesterRatingID,
			&task.TaskerRatingID, &task.CreatedAt, &task.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan task: %w", err)
		}
		taskMap[task.ID] = task
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating tasks: %w", err)
	}

	// Preserve caller's ordering (Meilisearch relevance)
	result := make([]*models.Task, 0, len(ids))
	for _, id := range ids {
		if task, ok := taskMap[id]; ok {
			result = append(result, task)
		}
	}
	return result, nil
}

func (r *taskRepository) AssignTasker(ctx context.Context, taskID, taskerID int64) error {
	query := `
		UPDATE tasks SET tasker_id = $1, status = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
	`

	result, err := r.db.ExecContext(ctx, query, taskerID, models.TaskStatusInProgress, taskID)
	if err != nil {
		return fmt.Errorf("failed to assign tasker: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("task not found")
	}

	return nil
}
