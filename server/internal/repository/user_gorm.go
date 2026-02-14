package repository

import (
	"context"
	"fmt"

	"github.com/lib/pq"
	"gorm.io/gorm"
	"viecz.vieczserver/internal/models"
)

type userGormRepository struct {
	db *gorm.DB
}

// NewUserGormRepository creates a new GORM-based UserRepository
func NewUserGormRepository(db *gorm.DB) UserRepository {
	return &userGormRepository{db: db}
}

// Verify interface compliance
var _ UserRepository = (*userGormRepository)(nil)

func (r *userGormRepository) Create(ctx context.Context, user *models.User) error {
	if err := r.db.WithContext(ctx).Create(user).Error; err != nil {
		if gorm.ErrDuplicatedKey == err || contains(err.Error(), "duplicate") || contains(err.Error(), "unique") {
			return fmt.Errorf("email already exists")
		}
		return fmt.Errorf("failed to create user: %w", err)
	}
	return nil
}

func (r *userGormRepository) GetByID(ctx context.Context, id int64) (*models.User, error) {
	var user models.User
	if err := r.db.WithContext(ctx).First(&user, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return &user, nil
}

func (r *userGormRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	if err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return &user, nil
}

// GetByGoogleID retrieves a user by Google ID
func (r *userGormRepository) GetByGoogleID(ctx context.Context, googleID string) (*models.User, error) {
	var user models.User
	if err := r.db.WithContext(ctx).Where("google_id = ?", googleID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user by google ID: %w", err)
	}
	return &user, nil
}

func (r *userGormRepository) Update(ctx context.Context, user *models.User) error {
	if err := r.db.WithContext(ctx).Save(user).Error; err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}
	return nil
}

func (r *userGormRepository) Delete(ctx context.Context, id int64) error {
	result := r.db.WithContext(ctx).Delete(&models.User{}, id)
	if result.Error != nil {
		return fmt.Errorf("failed to delete user: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("user not found")
	}
	return nil
}

func (r *userGormRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&models.User{}).Where("email = ?", email).Count(&count).Error; err != nil {
		return false, fmt.Errorf("failed to check email existence: %w", err)
	}
	return count > 0, nil
}

func (r *userGormRepository) BecomeTasker(ctx context.Context, userID int64, bio string, skills []string) error {
	updates := map[string]interface{}{
		"is_tasker":     true,
		"tasker_bio":    &bio,
		"tasker_skills": pq.Array(skills),
	}

	// Use UpdateColumns instead of Updates to skip BeforeUpdate validation hook
	// This allows partial field updates without validating the entire zero-valued User model
	result := r.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", userID).UpdateColumns(updates)
	if result.Error != nil {
		return fmt.Errorf("failed to update user to tasker: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("user not found")
	}
	return nil
}

func (r *userGormRepository) UpdateRating(ctx context.Context, userID int64, rating float64) error {
	// Use UpdateColumn instead of Update to skip BeforeUpdate validation hook
	// This allows updating just the rating field without validating the entire User model
	result := r.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", userID).UpdateColumn("rating", rating)
	if result.Error != nil {
		return fmt.Errorf("failed to update rating: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("user not found")
	}
	return nil
}

func (r *userGormRepository) IncrementTasksCompleted(ctx context.Context, userID int64) error {
	result := r.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", userID).
		UpdateColumn("total_tasks_completed", gorm.Expr("total_tasks_completed + ?", 1))
	if result.Error != nil {
		return fmt.Errorf("failed to increment tasks completed: %w", result.Error)
	}
	return nil
}

func (r *userGormRepository) IncrementEarnings(ctx context.Context, userID int64, amount int64) error {
	result := r.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", userID).
		UpdateColumn("total_earnings", gorm.Expr("total_earnings + ?", amount))
	if result.Error != nil {
		return fmt.Errorf("failed to increment earnings: %w", result.Error)
	}
	return nil
}

func (r *userGormRepository) IncrementTasksPosted(ctx context.Context, userID int64) error {
	result := r.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", userID).
		UpdateColumn("total_tasks_posted", gorm.Expr("total_tasks_posted + ?", 1))
	if result.Error != nil {
		return fmt.Errorf("failed to increment tasks posted: %w", result.Error)
	}
	return nil
}

// Helper function to check if string contains substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) && (s[:len(substr)] == substr || s[len(s)-len(substr):] == substr || containsMiddle(s, substr)))
}

func containsMiddle(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
