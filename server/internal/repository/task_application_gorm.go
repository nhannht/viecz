package repository

import (
	"context"
	"fmt"

	"gorm.io/gorm"
	"viecz.vieczserver/internal/models"
)

type taskApplicationGormRepository struct {
	db *gorm.DB
}

// NewTaskApplicationGormRepository creates a new GORM-based TaskApplicationRepository
func NewTaskApplicationGormRepository(db *gorm.DB) TaskApplicationRepository {
	return &taskApplicationGormRepository{db: db}
}

// Verify interface compliance
var _ TaskApplicationRepository = (*taskApplicationGormRepository)(nil)

func (r *taskApplicationGormRepository) Create(ctx context.Context, app *models.TaskApplication) error {
	if err := r.db.WithContext(ctx).Create(app).Error; err != nil {
		return fmt.Errorf("failed to create application: %w", err)
	}
	return nil
}

func (r *taskApplicationGormRepository) GetByID(ctx context.Context, id int64) (*models.TaskApplication, error) {
	var app models.TaskApplication
	if err := r.db.WithContext(ctx).First(&app, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("application not found")
		}
		return nil, fmt.Errorf("failed to get application: %w", err)
	}
	return &app, nil
}

func (r *taskApplicationGormRepository) GetByTaskID(ctx context.Context, taskID int64) ([]*models.TaskApplication, error) {
	var apps []*models.TaskApplication
	if err := r.db.WithContext(ctx).Preload("Tasker").Where("task_id = ?", taskID).Order("created_at ASC").Find(&apps).Error; err != nil {
		return nil, fmt.Errorf("failed to get applications: %w", err)
	}
	return apps, nil
}

func (r *taskApplicationGormRepository) GetByTaskerID(ctx context.Context, taskerID int64) ([]*models.TaskApplication, error) {
	var apps []*models.TaskApplication
	if err := r.db.WithContext(ctx).Where("tasker_id = ?", taskerID).Order("created_at DESC").Find(&apps).Error; err != nil {
		return nil, fmt.Errorf("failed to get applications: %w", err)
	}
	return apps, nil
}

func (r *taskApplicationGormRepository) UpdateStatus(ctx context.Context, id int64, status models.ApplicationStatus) error {
	// First, get the application
	var app models.TaskApplication
	if err := r.db.WithContext(ctx).First(&app, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("application not found")
		}
		return fmt.Errorf("failed to get application: %w", err)
	}

	// Update status
	app.Status = status
	if err := r.db.WithContext(ctx).Save(&app).Error; err != nil {
		return fmt.Errorf("failed to update application status: %w", err)
	}

	return nil
}

func (r *taskApplicationGormRepository) Delete(ctx context.Context, id int64) error {
	result := r.db.WithContext(ctx).Delete(&models.TaskApplication{}, id)
	if result.Error != nil {
		return fmt.Errorf("failed to delete application: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("application not found")
	}
	return nil
}

func (r *taskApplicationGormRepository) ExistsByTaskAndTasker(ctx context.Context, taskID, taskerID int64) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&models.TaskApplication{}).
		Where("task_id = ? AND tasker_id = ?", taskID, taskerID).
		Count(&count).Error; err != nil {
		return false, fmt.Errorf("failed to check application existence: %w", err)
	}
	return count > 0, nil
}

func (r *taskApplicationGormRepository) CountByTaskIDs(ctx context.Context, taskIDs []int64) (map[int64]int64, error) {
	result := make(map[int64]int64)
	if len(taskIDs) == 0 {
		return result, nil
	}

	type countResult struct {
		TaskID int64
		Count  int64
	}
	var results []countResult
	if err := r.db.WithContext(ctx).Model(&models.TaskApplication{}).
		Select("task_id, count(*) as count").
		Where("task_id IN ?", taskIDs).
		Group("task_id").
		Find(&results).Error; err != nil {
		return nil, fmt.Errorf("failed to count applications by task IDs: %w", err)
	}

	for _, r := range results {
		result[r.TaskID] = r.Count
	}

	return result, nil
}
