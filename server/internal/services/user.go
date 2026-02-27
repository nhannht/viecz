package services

import (
	"context"
	"fmt"
	"log"

	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
)

// UserService handles user-related business logic
type UserService struct {
	userRepo repository.UserRepository
	taskRepo repository.TaskRepository
}

// NewUserService creates a new user service
func NewUserService(userRepo repository.UserRepository, taskRepo repository.TaskRepository) *UserService {
	return &UserService{
		userRepo: userRepo,
		taskRepo: taskRepo,
	}
}

// UpdateProfileInput represents user profile update request
type UpdateProfileInput struct {
	Name      *string `json:"name,omitempty"`
	AvatarURL *string `json:"avatar_url,omitempty"`
	Phone     *string `json:"phone,omitempty"`
	Bio       *string `json:"bio,omitempty"`
}

// UpdateProfile updates user profile information
func (s *UserService) UpdateProfile(ctx context.Context, userID int64, input *UpdateProfileInput) (*models.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Update fields if provided
	if input.Name != nil {
		user.Name = *input.Name
	}
	if input.AvatarURL != nil {
		user.AvatarURL = input.AvatarURL
	}
	if input.Phone != nil {
		user.Phone = input.Phone
	}
	if input.Bio != nil {
		user.Bio = input.Bio
	}

	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	return user, nil
}

// GetProfile returns user profile by ID with computed statistics
func (s *UserService) GetProfile(ctx context.Context, userID int64) (*models.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Compute stats from actual task data
	if s.taskRepo != nil {
		s.populateTaskStats(ctx, user)
	}

	return user, nil
}

// populateTaskStats computes task statistics from the tasks table
func (s *UserService) populateTaskStats(ctx context.Context, user *models.User) {
	requesterID := user.ID
	completedStatus := models.TaskStatusCompleted

	posted, err := s.taskRepo.CountByFilters(ctx, repository.TaskFilters{
		RequesterID: &requesterID,
	})
	if err != nil {
		log.Printf("[UserService] failed to count posted tasks for user %d: %v", user.ID, err)
	} else {
		user.TotalTasksPosted = posted
	}

	completed, err := s.taskRepo.CountByFilters(ctx, repository.TaskFilters{
		RequesterID: &requesterID,
		Status:      &completedStatus,
	})
	if err != nil {
		log.Printf("[UserService] failed to count completed tasks for user %d: %v", user.ID, err)
	} else {
		user.TotalTasksCompleted = completed
	}
}
