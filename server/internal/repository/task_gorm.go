package repository

import (
	"context"
	"fmt"
	"sort"

	"gorm.io/gorm"
	"viecz.vieczserver/internal/models"
)

type taskGormRepository struct {
	db *gorm.DB
}

// NewTaskGormRepository creates a new GORM-based TaskRepository
func NewTaskGormRepository(db *gorm.DB) TaskRepository {
	return &taskGormRepository{db: db}
}

// Verify interface compliance
var _ TaskRepository = (*taskGormRepository)(nil)

func (r *taskGormRepository) Create(ctx context.Context, task *models.Task) error {
	if err := r.db.WithContext(ctx).Create(task).Error; err != nil {
		return fmt.Errorf("failed to create task: %w", err)
	}
	return nil
}

func (r *taskGormRepository) GetByIDForUpdate(ctx context.Context, tx *gorm.DB, id int64) (*models.Task, error) {
	var task models.Task
	db := tx
	if db == nil {
		db = r.db
	}
	if err := db.WithContext(ctx).Set("gorm:query_option", "FOR UPDATE").First(&task, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("task not found")
		}
		return nil, fmt.Errorf("failed to get task for update: %w", err)
	}
	return &task, nil
}

func (r *taskGormRepository) GetByID(ctx context.Context, id int64) (*models.Task, error) {
	var task models.Task
	if err := r.db.WithContext(ctx).Preload("Category").First(&task, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("task not found")
		}
		return nil, fmt.Errorf("failed to get task: %w", err)
	}
	return &task, nil
}

func (r *taskGormRepository) Update(ctx context.Context, task *models.Task) error {
	if err := r.db.WithContext(ctx).Save(task).Error; err != nil {
		return fmt.Errorf("failed to update task: %w", err)
	}
	return nil
}

func (r *taskGormRepository) UpdateWithTx(ctx context.Context, tx *gorm.DB, task *models.Task) error {
	db := tx
	if db == nil {
		db = r.db
	}
	if err := db.WithContext(ctx).Save(task).Error; err != nil {
		return fmt.Errorf("failed to update task: %w", err)
	}
	return nil
}

func (r *taskGormRepository) Delete(ctx context.Context, id int64) error {
	result := r.db.WithContext(ctx).Delete(&models.Task{}, id)
	if result.Error != nil {
		return fmt.Errorf("failed to delete task: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("task not found")
	}
	return nil
}

func (r *taskGormRepository) List(ctx context.Context, filters TaskFilters) ([]*models.Task, error) {
	query := r.db.WithContext(ctx).Model(&models.Task{})

	// Apply filters
	if filters.CategoryID != nil {
		query = query.Where("category_id = ?", *filters.CategoryID)
	}
	if filters.RequesterID != nil {
		query = query.Where("requester_id = ?", *filters.RequesterID)
	}
	if filters.TaskerID != nil {
		query = query.Where("tasker_id = ?", *filters.TaskerID)
	}
	if filters.Status != nil {
		query = query.Where("status = ?", *filters.Status)
	}
	if filters.MinPrice != nil {
		query = query.Where("price >= ?", *filters.MinPrice)
	}
	if filters.MaxPrice != nil {
		query = query.Where("price <= ?", *filters.MaxPrice)
	}
	if filters.Location != nil {
		query = query.Where("location ILIKE ?", "%"+*filters.Location+"%")
	}
	if filters.Search != nil && *filters.Search != "" {
		searchPattern := "%" + *filters.Search + "%"
		query = query.Where("LOWER(title) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?)", searchPattern, searchPattern)
	}

	// Order and pagination
	query = query.Order("created_at DESC")
	if filters.Limit > 0 {
		query = query.Limit(filters.Limit)
	}
	if filters.Offset > 0 {
		query = query.Offset(filters.Offset)
	}

	var tasks []*models.Task
	if err := query.Preload("Category").Find(&tasks).Error; err != nil {
		return nil, fmt.Errorf("failed to list tasks: %w", err)
	}

	return tasks, nil
}

func (r *taskGormRepository) CountByFilters(ctx context.Context, filters TaskFilters) (int, error) {
	query := r.db.WithContext(ctx).Model(&models.Task{})

	// Apply filters (same as List)
	if filters.CategoryID != nil {
		query = query.Where("category_id = ?", *filters.CategoryID)
	}
	if filters.RequesterID != nil {
		query = query.Where("requester_id = ?", *filters.RequesterID)
	}
	if filters.TaskerID != nil {
		query = query.Where("tasker_id = ?", *filters.TaskerID)
	}
	if filters.Status != nil {
		query = query.Where("status = ?", *filters.Status)
	}
	if filters.MinPrice != nil {
		query = query.Where("price >= ?", *filters.MinPrice)
	}
	if filters.MaxPrice != nil {
		query = query.Where("price <= ?", *filters.MaxPrice)
	}
	if filters.Location != nil {
		query = query.Where("location ILIKE ?", "%"+*filters.Location+"%")
	}
	if filters.Search != nil && *filters.Search != "" {
		searchPattern := "%" + *filters.Search + "%"
		query = query.Where("LOWER(title) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?)", searchPattern, searchPattern)
	}

	var count int64
	if err := query.Count(&count).Error; err != nil {
		return 0, fmt.Errorf("failed to count tasks: %w", err)
	}

	return int(count), nil
}

func (r *taskGormRepository) UpdateStatus(ctx context.Context, id int64, status models.TaskStatus) error {
	result := r.db.WithContext(ctx).Model(&models.Task{}).Where("id = ?", id).UpdateColumn("status", status)
	if result.Error != nil {
		return fmt.Errorf("failed to update task status: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("task not found")
	}
	return nil
}

func (r *taskGormRepository) UpdateStatusWithTx(ctx context.Context, tx *gorm.DB, id int64, status models.TaskStatus) error {
	db := tx
	if db == nil {
		db = r.db
	}
	result := db.WithContext(ctx).Model(&models.Task{}).Where("id = ?", id).UpdateColumn("status", status)
	if result.Error != nil {
		return fmt.Errorf("failed to update task status: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("task not found")
	}
	return nil
}

func (r *taskGormRepository) SumOpenTaskPricesByRequester(ctx context.Context, requesterID int64) (int64, error) {
	var total *int64
	err := r.db.WithContext(ctx).Model(&models.Task{}).
		Select("COALESCE(SUM(price), 0)").
		Where("requester_id = ? AND status = ?", requesterID, models.TaskStatusOpen).
		Scan(&total).Error
	if err != nil {
		return 0, fmt.Errorf("failed to sum open task prices: %w", err)
	}
	if total == nil {
		return 0, nil
	}
	return *total, nil
}

func (r *taskGormRepository) GetByIDs(ctx context.Context, ids []int64) ([]*models.Task, error) {
	if len(ids) == 0 {
		return []*models.Task{}, nil
	}

	var tasks []*models.Task
	if err := r.db.WithContext(ctx).Preload("Category").Where("id IN ?", ids).Find(&tasks).Error; err != nil {
		return nil, fmt.Errorf("failed to get tasks by IDs: %w", err)
	}

	// Preserve caller's ordering (Meilisearch relevance)
	idOrder := make(map[int64]int, len(ids))
	for i, id := range ids {
		idOrder[id] = i
	}
	sort.Slice(tasks, func(i, j int) bool {
		return idOrder[tasks[i].ID] < idOrder[tasks[j].ID]
	})

	return tasks, nil
}

func (r *taskGormRepository) AssignTasker(ctx context.Context, taskID, taskerID int64) error {
	// First, get the task
	var task models.Task
	if err := r.db.WithContext(ctx).First(&task, taskID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("task not found")
		}
		return fmt.Errorf("failed to get task: %w", err)
	}

	// Update fields — only assign tasker, don't change status.
	// Status transitions to in_progress when escrow payment is created.
	task.TaskerID = &taskerID

	// Save the task
	if err := r.db.WithContext(ctx).Save(&task).Error; err != nil {
		return fmt.Errorf("failed to assign tasker: %w", err)
	}

	return nil
}
