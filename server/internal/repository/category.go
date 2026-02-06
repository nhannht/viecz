package repository

import (
	"context"
	"database/sql"
	"fmt"

	"viecz.vieczserver/internal/models"
)

// CategoryRepository defines the interface for category data operations
type CategoryRepository interface {
	Create(ctx context.Context, category *models.Category) error
	GetByID(ctx context.Context, id int64) (*models.Category, error)
	GetAll(ctx context.Context) ([]*models.Category, error)
	Update(ctx context.Context, category *models.Category) error
	Delete(ctx context.Context, id int64) error
}

type categoryRepository struct {
	db *sql.DB
}

// NewCategoryRepository creates a new CategoryRepository
func NewCategoryRepository(db *sql.DB) CategoryRepository {
	return &categoryRepository{db: db}
}

// Verify interface compliance
var _ CategoryRepository = (*categoryRepository)(nil)

func (r *categoryRepository) Create(ctx context.Context, category *models.Category) error {
	if err := category.Validate(); err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}

	query := `
		INSERT INTO categories (name, name_vi, icon, is_active)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`

	err := r.db.QueryRowContext(
		ctx, query,
		category.Name, category.NameVi, category.Icon, category.IsActive,
	).Scan(&category.ID)

	if err != nil {
		return fmt.Errorf("failed to create category: %w", err)
	}

	return nil
}

func (r *categoryRepository) GetByID(ctx context.Context, id int64) (*models.Category, error) {
	query := `
		SELECT id, name, name_vi, icon, is_active
		FROM categories
		WHERE id = $1
	`

	category := &models.Category{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&category.ID, &category.Name, &category.NameVi,
		&category.Icon, &category.IsActive,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("category not found")
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get category: %w", err)
	}

	return category, nil
}

func (r *categoryRepository) GetAll(ctx context.Context) ([]*models.Category, error) {
	query := `
		SELECT id, name, name_vi, icon, is_active
		FROM categories
		WHERE is_active = TRUE
		ORDER BY name ASC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list categories: %w", err)
	}
	defer rows.Close()

	categories := []*models.Category{}
	for rows.Next() {
		category := &models.Category{}
		err := rows.Scan(
			&category.ID, &category.Name, &category.NameVi,
			&category.Icon, &category.IsActive,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan category: %w", err)
		}
		categories = append(categories, category)
	}

	return categories, nil
}

func (r *categoryRepository) Update(ctx context.Context, category *models.Category) error {
	if err := category.Validate(); err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}

	query := `
		UPDATE categories
		SET name = $1, name_vi = $2, icon = $3, is_active = $4
		WHERE id = $5
	`

	result, err := r.db.ExecContext(
		ctx, query,
		category.Name, category.NameVi, category.Icon, category.IsActive, category.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update category: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("category not found")
	}

	return nil
}

func (r *categoryRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM categories WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete category: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("category not found")
	}

	return nil
}
