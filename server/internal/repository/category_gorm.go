package repository

import (
	"context"
	"fmt"

	"gorm.io/gorm"
	"viecz.vieczserver/internal/models"
)

type categoryGormRepository struct {
	db *gorm.DB
}

// NewCategoryGormRepository creates a new GORM-based CategoryRepository
func NewCategoryGormRepository(db *gorm.DB) CategoryRepository {
	return &categoryGormRepository{db: db}
}

// Verify interface compliance
var _ CategoryRepository = (*categoryGormRepository)(nil)

func (r *categoryGormRepository) Create(ctx context.Context, category *models.Category) error {
	if err := r.db.WithContext(ctx).Create(category).Error; err != nil {
		return fmt.Errorf("failed to create category: %w", err)
	}
	return nil
}

func (r *categoryGormRepository) GetByID(ctx context.Context, id int64) (*models.Category, error) {
	var category models.Category
	if err := r.db.WithContext(ctx).First(&category, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("category not found")
		}
		return nil, fmt.Errorf("failed to get category: %w", err)
	}
	return &category, nil
}

func (r *categoryGormRepository) GetAll(ctx context.Context) ([]*models.Category, error) {
	var categories []*models.Category
	if err := r.db.WithContext(ctx).Where("is_active = ?", true).Order("name ASC").Find(&categories).Error; err != nil {
		return nil, fmt.Errorf("failed to list categories: %w", err)
	}
	return categories, nil
}

func (r *categoryGormRepository) Update(ctx context.Context, category *models.Category) error {
	result := r.db.WithContext(ctx).Save(category)
	if result.Error != nil {
		return fmt.Errorf("failed to update category: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("category not found")
	}
	return nil
}

func (r *categoryGormRepository) Delete(ctx context.Context, id int64) error {
	result := r.db.WithContext(ctx).Delete(&models.Category{}, id)
	if result.Error != nil {
		return fmt.Errorf("failed to delete category: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("category not found")
	}
	return nil
}
