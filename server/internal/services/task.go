package services

import (
	"context"
	"fmt"

	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
)

// TaskService handles business logic for tasks
type TaskService struct {
	taskRepo            repository.TaskRepository
	applicationRepo     repository.TaskApplicationRepository
	categoryRepo        repository.CategoryRepository
	userRepo            repository.UserRepository
	walletService       *WalletService
	notificationService *NotificationService
}

// NewTaskService creates a new TaskService
func NewTaskService(
	taskRepo repository.TaskRepository,
	applicationRepo repository.TaskApplicationRepository,
	categoryRepo repository.CategoryRepository,
	userRepo repository.UserRepository,
	walletService *WalletService,
	notificationService *NotificationService,
) *TaskService {
	return &TaskService{
		taskRepo:            taskRepo,
		applicationRepo:     applicationRepo,
		categoryRepo:        categoryRepo,
		userRepo:            userRepo,
		walletService:       walletService,
		notificationService: notificationService,
	}
}

// CreateTaskInput represents input for creating a task
type CreateTaskInput struct {
	CategoryID   int64    `json:"category_id"`
	Title        string   `json:"title"`
	Description  string   `json:"description"`
	Price        int64    `json:"price"`
	Location     string   `json:"location"`
	Latitude     *float64 `json:"latitude,omitempty"`
	Longitude    *float64 `json:"longitude,omitempty"`
	ScheduledFor *string  `json:"scheduled_for,omitempty"`
	ImageURLs    []string `json:"image_urls,omitempty"`
}

// CreateTask creates a new task
func (s *TaskService) CreateTask(ctx context.Context, requesterID int64, input *CreateTaskInput) (*models.Task, error) {
	// Verify category exists
	_, err := s.categoryRepo.GetByID(ctx, input.CategoryID)
	if err != nil {
		return nil, fmt.Errorf("invalid category: %w", err)
	}

	// Verify requester exists
	_, err = s.userRepo.GetByID(ctx, requesterID)
	if err != nil {
		return nil, fmt.Errorf("requester not found: %w", err)
	}

	// Validate available balance covers task price
	if s.walletService != nil {
		available, err := s.walletService.GetAvailableBalance(ctx, requesterID, s.taskRepo)
		if err != nil {
			return nil, fmt.Errorf("failed to check available balance: %w", err)
		}
		if available < input.Price {
			return nil, fmt.Errorf("insufficient available balance: have %d, need %d", available, input.Price)
		}
	}

	task := &models.Task{
		RequesterID: requesterID,
		CategoryID:  input.CategoryID,
		Title:       input.Title,
		Description: input.Description,
		Price:       input.Price,
		Location:    input.Location,
		Status:      models.TaskStatusOpen,
		ImageURLs:   input.ImageURLs,
	}

	// Set optional fields
	if input.Latitude != nil {
		task.Latitude = input.Latitude
	}

	if input.Longitude != nil {
		task.Longitude = input.Longitude
	}

	if err := s.taskRepo.Create(ctx, task); err != nil {
		return nil, fmt.Errorf("failed to create task: %w", err)
	}

	// Notify creator
	if s.notificationService != nil {
		_ = s.notificationService.CreateNotification(ctx, requesterID,
			models.NotificationTypeTaskCreated, "Task Posted",
			fmt.Sprintf("Your task '%s' has been posted", task.Title), &task.ID)
	}

	return task, nil
}

// GetTask retrieves a task by ID
func (s *TaskService) GetTask(ctx context.Context, id int64) (*models.Task, error) {
	task, err := s.taskRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("task not found: %w", err)
	}
	return task, nil
}

// UpdateTask updates a task
func (s *TaskService) UpdateTask(ctx context.Context, taskID, requesterID int64, input *CreateTaskInput) (*models.Task, error) {
	// Get existing task
	task, err := s.taskRepo.GetByID(ctx, taskID)
	if err != nil {
		return nil, fmt.Errorf("task not found: %w", err)
	}

	// Verify ownership
	if task.RequesterID != requesterID {
		return nil, fmt.Errorf("not authorized to update this task")
	}

	// Can only update open tasks
	if task.Status != models.TaskStatusOpen {
		return nil, fmt.Errorf("can only update tasks with status 'open'")
	}

	// Validate available balance if price is increasing
	if s.walletService != nil && input.Price > task.Price {
		available, err := s.walletService.GetAvailableBalance(ctx, requesterID, s.taskRepo)
		if err != nil {
			return nil, fmt.Errorf("failed to check available balance: %w", err)
		}
		delta := input.Price - task.Price
		if available < delta {
			return nil, fmt.Errorf("insufficient available balance for price increase: have %d, need %d", available, delta)
		}
	}

	// Update fields
	task.CategoryID = input.CategoryID
	task.Title = input.Title
	task.Description = input.Description
	task.Price = input.Price
	task.Location = input.Location
	task.ImageURLs = input.ImageURLs

	if input.Latitude != nil {
		task.Latitude = input.Latitude
	}

	if input.Longitude != nil {
		task.Longitude = input.Longitude
	}

	if err := s.taskRepo.Update(ctx, task); err != nil {
		return nil, fmt.Errorf("failed to update task: %w", err)
	}

	return task, nil
}

// DeleteTask deletes a task
func (s *TaskService) DeleteTask(ctx context.Context, taskID, requesterID int64) error {
	// Get task
	task, err := s.taskRepo.GetByID(ctx, taskID)
	if err != nil {
		return fmt.Errorf("task not found: %w", err)
	}

	// Verify ownership
	if task.RequesterID != requesterID {
		return fmt.Errorf("not authorized to delete this task")
	}

	// Can only delete open tasks
	if task.Status != models.TaskStatusOpen {
		return fmt.Errorf("can only delete tasks with status 'open'")
	}

	if err := s.taskRepo.Delete(ctx, taskID); err != nil {
		return fmt.Errorf("failed to delete task: %w", err)
	}

	return nil
}

// ListTasks lists tasks with filters
func (s *TaskService) ListTasks(ctx context.Context, filters repository.TaskFilters) ([]*models.Task, int, error) {
	tasks, err := s.taskRepo.List(ctx, filters)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list tasks: %w", err)
	}

	total, err := s.taskRepo.CountByFilters(ctx, filters)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count tasks: %w", err)
	}

	return tasks, total, nil
}

// ApplyForTaskInput represents input for applying to a task
type ApplyForTaskInput struct {
	ProposedPrice *int64 `json:"proposed_price,omitempty"`
	Message       string `json:"message"`
}

// ApplyForTask creates an application for a task
func (s *TaskService) ApplyForTask(ctx context.Context, taskID, taskerID int64, input *ApplyForTaskInput) (*models.TaskApplication, error) {
	// Verify task exists and is open
	task, err := s.taskRepo.GetByID(ctx, taskID)
	if err != nil {
		return nil, fmt.Errorf("task not found: %w", err)
	}

	if task.Status != models.TaskStatusOpen {
		return nil, fmt.Errorf("task is not open for applications")
	}

	// Can't apply to own task
	if task.RequesterID == taskerID {
		return nil, fmt.Errorf("cannot apply to your own task")
	}

	// Verify tasker exists and is a tasker
	user, err := s.userRepo.GetByID(ctx, taskerID)
	if err != nil {
		return nil, fmt.Errorf("tasker not found: %w", err)
	}

	if !user.IsTasker {
		return nil, fmt.Errorf("user is not registered as a tasker")
	}

	// Check if already applied
	exists, err := s.applicationRepo.ExistsByTaskAndTasker(ctx, taskID, taskerID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing application: %w", err)
	}

	if exists {
		return nil, fmt.Errorf("already applied to this task")
	}

	application := &models.TaskApplication{
		TaskID:        taskID,
		TaskerID:      taskerID,
		ProposedPrice: input.ProposedPrice,
		Status:        models.ApplicationStatusPending,
	}

	if input.Message != "" {
		application.Message = &input.Message
	}

	if err := s.applicationRepo.Create(ctx, application); err != nil {
		return nil, fmt.Errorf("failed to create application: %w", err)
	}

	// Notify task creator about new application
	if s.notificationService != nil {
		_ = s.notificationService.CreateNotification(ctx, task.RequesterID,
			models.NotificationTypeApplicationReceived, "New Application",
			fmt.Sprintf("Someone applied to your task '%s'", task.Title), &taskID)

		// Notify applicant
		_ = s.notificationService.CreateNotification(ctx, taskerID,
			models.NotificationTypeApplicationSent, "Application Sent",
			fmt.Sprintf("You applied for '%s'", task.Title), &taskID)
	}

	return application, nil
}

// AcceptApplication accepts a task application
func (s *TaskService) AcceptApplication(ctx context.Context, applicationID, requesterID int64) error {
	// Get application
	app, err := s.applicationRepo.GetByID(ctx, applicationID)
	if err != nil {
		return fmt.Errorf("application not found: %w", err)
	}

	// Get task
	task, err := s.taskRepo.GetByID(ctx, app.TaskID)
	if err != nil {
		return fmt.Errorf("task not found: %w", err)
	}

	// Verify ownership
	if task.RequesterID != requesterID {
		return fmt.Errorf("not authorized to accept this application")
	}

	// Task must be open
	if task.Status != models.TaskStatusOpen {
		return fmt.Errorf("task is not open")
	}

	// Application must be pending
	if app.Status != models.ApplicationStatusPending {
		return fmt.Errorf("application is not pending")
	}

	// Accept application
	if err := s.applicationRepo.UpdateStatus(ctx, applicationID, models.ApplicationStatusAccepted); err != nil {
		return fmt.Errorf("failed to accept application: %w", err)
	}

	// Assign tasker to task
	if err := s.taskRepo.AssignTasker(ctx, task.ID, app.TaskerID); err != nil {
		return fmt.Errorf("failed to assign tasker: %w", err)
	}

	// Reject other pending applications
	applications, err := s.applicationRepo.GetByTaskID(ctx, task.ID)
	if err != nil {
		return fmt.Errorf("failed to get applications: %w", err)
	}

	for _, otherApp := range applications {
		if otherApp.ID != applicationID && otherApp.Status == models.ApplicationStatusPending {
			_ = s.applicationRepo.UpdateStatus(ctx, otherApp.ID, models.ApplicationStatusRejected)
		}
	}

	// Notify applicant that their application was accepted
	if s.notificationService != nil {
		_ = s.notificationService.CreateNotification(ctx, app.TaskerID,
			models.NotificationTypeApplicationAccepted, "Application Accepted",
			fmt.Sprintf("Your application for '%s' was accepted", task.Title), &task.ID)
	}

	return nil
}

// CompleteTask marks a task as completed
func (s *TaskService) CompleteTask(ctx context.Context, taskID, requesterID int64) error {
	// Get task
	task, err := s.taskRepo.GetByID(ctx, taskID)
	if err != nil {
		return fmt.Errorf("task not found: %w", err)
	}

	// Verify ownership
	if task.RequesterID != requesterID {
		return fmt.Errorf("not authorized to complete this task")
	}

	// Task must be in progress
	if task.Status != models.TaskStatusInProgress {
		return fmt.Errorf("task is not in progress")
	}

	// Update status
	if err := s.taskRepo.UpdateStatus(ctx, taskID, models.TaskStatusCompleted); err != nil {
		return fmt.Errorf("failed to complete task: %w", err)
	}

	// Notify both parties
	if s.notificationService != nil {
		_ = s.notificationService.CreateNotification(ctx, requesterID,
			models.NotificationTypeTaskCompleted, "Task Completed",
			fmt.Sprintf("Task '%s' has been completed", task.Title), &taskID)

		if task.TaskerID != nil {
			_ = s.notificationService.CreateNotification(ctx, *task.TaskerID,
				models.NotificationTypeTaskCompleted, "Task Completed",
				fmt.Sprintf("Task '%s' has been completed", task.Title), &taskID)
		}
	}

	return nil
}

// GetTaskApplications retrieves all applications for a task
func (s *TaskService) GetTaskApplications(ctx context.Context, taskID, requesterID int64) ([]*models.TaskApplication, error) {
	// Get task
	task, err := s.taskRepo.GetByID(ctx, taskID)
	if err != nil {
		return nil, fmt.Errorf("task not found: %w", err)
	}

	// Verify ownership
	if task.RequesterID != requesterID {
		return nil, fmt.Errorf("not authorized to view applications for this task")
	}

	applications, err := s.applicationRepo.GetByTaskID(ctx, taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to get applications: %w", err)
	}

	return applications, nil
}
