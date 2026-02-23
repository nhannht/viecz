package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/lib/pq"
	"viecz.vieczserver/internal/models"
)

// UserRepository defines the interface for user data operations
type UserRepository interface {
	Create(ctx context.Context, user *models.User) error
	GetByID(ctx context.Context, id int64) (*models.User, error)
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	GetByGoogleID(ctx context.Context, googleID string) (*models.User, error)
	Update(ctx context.Context, user *models.User) error
	ExistsByEmail(ctx context.Context, email string) (bool, error)
	BecomeTasker(ctx context.Context, userID int64, bio string, skills []string) error
	UpdateRating(ctx context.Context, userID int64, rating float64) error
	IncrementTasksCompleted(ctx context.Context, userID int64) error
	IncrementTasksPosted(ctx context.Context, userID int64) error
	IncrementEarnings(ctx context.Context, userID int64, amount int64) error
	SetEmailVerified(ctx context.Context, userID int64) error
}

type userRepository struct {
	db *sql.DB
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *sql.DB) UserRepository {
	return &userRepository{db: db}
}

// Verify interface compliance at compile time
var _ UserRepository = (*userRepository)(nil)

// Create creates a new user
func (r *userRepository) Create(ctx context.Context, user *models.User) error {
	query := `
		INSERT INTO users (email, password_hash, name, avatar_url, phone, university, student_id, is_verified)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at
	`

	err := r.db.QueryRowContext(
		ctx,
		query,
		user.Email,
		user.PasswordHash,
		user.Name,
		user.AvatarURL,
		user.Phone,
		user.University,
		user.StudentID,
		user.IsVerified,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		// Check for unique constraint violation
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return fmt.Errorf("email already exists")
		}
		return fmt.Errorf("failed to create user: %w", err)
	}

	return nil
}

// GetByID retrieves a user by ID
func (r *userRepository) GetByID(ctx context.Context, id int64) (*models.User, error) {
	query := `
		SELECT id, email, password_hash, name, avatar_url, phone, university, student_id,
		       is_verified, rating, total_tasks_completed, total_tasks_posted, total_earnings,
		       is_tasker, tasker_bio, tasker_skills, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	user := &models.User{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Name,
		&user.AvatarURL,
		&user.Phone,
		&user.University,
		&user.StudentID,
		&user.IsVerified,
		&user.Rating,
		&user.TotalTasksCompleted,
		&user.TotalTasksPosted,
		&user.TotalEarnings,
		&user.IsTasker,
		&user.TaskerBio,
		pq.Array(&user.TaskerSkills),
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

// GetByEmail retrieves a user by email
func (r *userRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `
		SELECT id, email, password_hash, name, avatar_url, phone, university, student_id,
		       is_verified, rating, total_tasks_completed, total_tasks_posted, total_earnings,
		       is_tasker, tasker_bio, tasker_skills, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	user := &models.User{}
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Name,
		&user.AvatarURL,
		&user.Phone,
		&user.University,
		&user.StudentID,
		&user.IsVerified,
		&user.Rating,
		&user.TotalTasksCompleted,
		&user.TotalTasksPosted,
		&user.TotalEarnings,
		&user.IsTasker,
		&user.TaskerBio,
		pq.Array(&user.TaskerSkills),
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

// GetByGoogleID retrieves a user by Google ID
func (r *userRepository) GetByGoogleID(ctx context.Context, googleID string) (*models.User, error) {
	query := `
		SELECT id, email, password_hash, name, avatar_url, phone, university, student_id,
		       is_verified, rating, total_tasks_completed, total_tasks_posted, total_earnings,
		       is_tasker, tasker_bio, tasker_skills, created_at, updated_at
		FROM users
		WHERE google_id = $1
	`

	user := &models.User{}
	err := r.db.QueryRowContext(ctx, query, googleID).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Name,
		&user.AvatarURL,
		&user.Phone,
		&user.University,
		&user.StudentID,
		&user.IsVerified,
		&user.Rating,
		&user.TotalTasksCompleted,
		&user.TotalTasksPosted,
		&user.TotalEarnings,
		&user.IsTasker,
		&user.TaskerBio,
		pq.Array(&user.TaskerSkills),
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get user by google ID: %w", err)
	}

	return user, nil
}

// Update updates a user
func (r *userRepository) Update(ctx context.Context, user *models.User) error {
	query := `
		UPDATE users
		SET name = $1, avatar_url = $2, phone = $3, university = $4, student_id = $5
		WHERE id = $6
	`

	result, err := r.db.ExecContext(
		ctx,
		query,
		user.Name,
		user.AvatarURL,
		user.Phone,
		user.University,
		user.StudentID,
		user.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

// ExistsByEmail checks if a user with the given email exists
func (r *userRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, email).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check email existence: %w", err)
	}

	return exists, nil
}

// BecomeTasker upgrades a user to become a tasker
func (r *userRepository) BecomeTasker(ctx context.Context, userID int64, bio string, skills []string) error {
	query := `
		UPDATE users
		SET is_tasker = TRUE, tasker_bio = $1, tasker_skills = $2
		WHERE id = $3
	`

	result, err := r.db.ExecContext(ctx, query, bio, pq.Array(skills), userID)
	if err != nil {
		return fmt.Errorf("failed to update tasker status: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

// UpdateRating updates the user's rating
func (r *userRepository) UpdateRating(ctx context.Context, userID int64, rating float64) error {
	query := `UPDATE users SET rating = $1 WHERE id = $2`

	result, err := r.db.ExecContext(ctx, query, rating, userID)
	if err != nil {
		return fmt.Errorf("failed to update rating: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

// IncrementTasksCompleted increments the user's completed tasks count
func (r *userRepository) IncrementTasksCompleted(ctx context.Context, userID int64) error {
	query := `UPDATE users SET total_tasks_completed = total_tasks_completed + 1 WHERE id = $1`

	_, err := r.db.ExecContext(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to increment tasks completed: %w", err)
	}

	return nil
}

// IncrementTasksPosted increments the user's posted tasks count
func (r *userRepository) IncrementTasksPosted(ctx context.Context, userID int64) error {
	query := `UPDATE users SET total_tasks_posted = total_tasks_posted + 1 WHERE id = $1`

	_, err := r.db.ExecContext(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to increment tasks posted: %w", err)
	}

	return nil
}

// IncrementEarnings increments the user's total earnings
func (r *userRepository) IncrementEarnings(ctx context.Context, userID int64, amount int64) error {
	query := `UPDATE users SET total_earnings = total_earnings + $1 WHERE id = $2`

	_, err := r.db.ExecContext(ctx, query, amount, userID)
	if err != nil {
		return fmt.Errorf("failed to increment earnings: %w", err)
	}

	return nil
}

// SetEmailVerified marks a user's email as verified
func (r *userRepository) SetEmailVerified(ctx context.Context, userID int64) error {
	query := `UPDATE users SET email_verified = TRUE WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to set email verified: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}
