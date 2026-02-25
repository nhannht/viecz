package repository

import (
	"context"
	"database/sql"
	"fmt"

	"viecz.vieczserver/internal/models"
)

// TaskApplicationRepository defines the interface for task application data operations
type TaskApplicationRepository interface {
	Create(ctx context.Context, app *models.TaskApplication) error
	GetByID(ctx context.Context, id int64) (*models.TaskApplication, error)
	GetByTaskID(ctx context.Context, taskID int64) ([]*models.TaskApplication, error)
	GetByTaskerID(ctx context.Context, taskerID int64) ([]*models.TaskApplication, error)
	UpdateStatus(ctx context.Context, id int64, status models.ApplicationStatus) error
	Delete(ctx context.Context, id int64) error
	ExistsByTaskAndTasker(ctx context.Context, taskID, taskerID int64) (bool, error)
	CountByTaskIDs(ctx context.Context, taskIDs []int64) (map[int64]int64, error)
}

type taskApplicationRepository struct {
	db *sql.DB
}

// NewTaskApplicationRepository creates a new TaskApplicationRepository
func NewTaskApplicationRepository(db *sql.DB) TaskApplicationRepository {
	return &taskApplicationRepository{db: db}
}

// Verify interface compliance
var _ TaskApplicationRepository = (*taskApplicationRepository)(nil)

func (r *taskApplicationRepository) Create(ctx context.Context, app *models.TaskApplication) error {
	if err := app.Validate(); err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}

	query := `
		INSERT INTO task_applications (task_id, tasker_id, proposed_price, message, status)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at
	`

	err := r.db.QueryRowContext(
		ctx, query,
		app.TaskID, app.TaskerID, app.ProposedPrice, app.Message, app.Status,
	).Scan(&app.ID, &app.CreatedAt, &app.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create application: %w", err)
	}

	return nil
}

func (r *taskApplicationRepository) GetByID(ctx context.Context, id int64) (*models.TaskApplication, error) {
	query := `
		SELECT id, task_id, tasker_id, proposed_price, message, status, created_at, updated_at
		FROM task_applications
		WHERE id = $1
	`

	app := &models.TaskApplication{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&app.ID, &app.TaskID, &app.TaskerID, &app.ProposedPrice,
		&app.Message, &app.Status, &app.CreatedAt, &app.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("application not found")
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get application: %w", err)
	}

	return app, nil
}

func (r *taskApplicationRepository) GetByTaskID(ctx context.Context, taskID int64) ([]*models.TaskApplication, error) {
	query := `
		SELECT id, task_id, tasker_id, proposed_price, message, status, created_at, updated_at
		FROM task_applications
		WHERE task_id = $1
		ORDER BY created_at ASC
	`

	rows, err := r.db.QueryContext(ctx, query, taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to get applications: %w", err)
	}
	defer rows.Close()

	apps := []*models.TaskApplication{}
	for rows.Next() {
		app := &models.TaskApplication{}
		err := rows.Scan(
			&app.ID, &app.TaskID, &app.TaskerID, &app.ProposedPrice,
			&app.Message, &app.Status, &app.CreatedAt, &app.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan application: %w", err)
		}
		apps = append(apps, app)
	}

	return apps, nil
}

func (r *taskApplicationRepository) GetByTaskerID(ctx context.Context, taskerID int64) ([]*models.TaskApplication, error) {
	query := `
		SELECT id, task_id, tasker_id, proposed_price, message, status, created_at, updated_at
		FROM task_applications
		WHERE tasker_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, taskerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get applications: %w", err)
	}
	defer rows.Close()

	apps := []*models.TaskApplication{}
	for rows.Next() {
		app := &models.TaskApplication{}
		err := rows.Scan(
			&app.ID, &app.TaskID, &app.TaskerID, &app.ProposedPrice,
			&app.Message, &app.Status, &app.CreatedAt, &app.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan application: %w", err)
		}
		apps = append(apps, app)
	}

	return apps, nil
}

func (r *taskApplicationRepository) UpdateStatus(ctx context.Context, id int64, status models.ApplicationStatus) error {
	query := `
		UPDATE task_applications
		SET status = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`

	result, err := r.db.ExecContext(ctx, query, status, id)
	if err != nil {
		return fmt.Errorf("failed to update application status: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("application not found")
	}

	return nil
}

func (r *taskApplicationRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM task_applications WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete application: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("application not found")
	}

	return nil
}

func (r *taskApplicationRepository) ExistsByTaskAndTasker(ctx context.Context, taskID, taskerID int64) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM task_applications WHERE task_id = $1 AND tasker_id = $2)`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, taskID, taskerID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check application existence: %w", err)
	}

	return exists, nil
}

func (r *taskApplicationRepository) CountByTaskIDs(ctx context.Context, taskIDs []int64) (map[int64]int64, error) {
	result := make(map[int64]int64)
	if len(taskIDs) == 0 {
		return result, nil
	}

	// Build placeholder list ($1, $2, ...)
	placeholders := ""
	args := make([]interface{}, len(taskIDs))
	for i, id := range taskIDs {
		if i > 0 {
			placeholders += ", "
		}
		placeholders += fmt.Sprintf("$%d", i+1)
		args[i] = id
	}

	query := fmt.Sprintf(`
		SELECT task_id, COUNT(*) as count
		FROM task_applications
		WHERE task_id IN (%s)
		GROUP BY task_id
	`, placeholders)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to count applications by task IDs: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var taskID, count int64
		if err := rows.Scan(&taskID, &count); err != nil {
			return nil, fmt.Errorf("failed to scan application count: %w", err)
		}
		result[taskID] = count
	}

	return result, nil
}
