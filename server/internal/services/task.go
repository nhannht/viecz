package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"gorm.io/gorm"
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
	paymentService      *PaymentService
	db                  *gorm.DB
	searchService       SearchServicer
}

// NewTaskService creates a new TaskService
func NewTaskService(
	taskRepo repository.TaskRepository,
	applicationRepo repository.TaskApplicationRepository,
	categoryRepo repository.CategoryRepository,
	userRepo repository.UserRepository,
	walletService *WalletService,
	notificationService *NotificationService,
	db *gorm.DB,
	searchService SearchServicer,
	paymentService *PaymentService,
) *TaskService {
	if searchService == nil {
		searchService = &NoOpSearchService{}
	}
	return &TaskService{
		taskRepo:            taskRepo,
		applicationRepo:     applicationRepo,
		categoryRepo:        categoryRepo,
		userRepo:            userRepo,
		walletService:       walletService,
		notificationService: notificationService,
		paymentService:      paymentService,
		db:                  db,
		searchService:       searchService,
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
	Deadline     *string  `json:"deadline,omitempty"`
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

	// Parse and validate deadline
	if input.Deadline != nil {
		deadline, err := time.Parse(time.RFC3339, *input.Deadline)
		if err != nil {
			return nil, fmt.Errorf("invalid deadline format (use RFC3339): %w", err)
		}
		if time.Until(deadline) < time.Hour {
			return nil, fmt.Errorf("deadline must be at least 1 hour in the future")
		}
		task.Deadline = &deadline
	}

	if err := s.taskRepo.Create(ctx, task); err != nil {
		return nil, fmt.Errorf("failed to create task: %w", err)
	}

	// Notify creator (non-critical — log and continue on failure)
	if s.notificationService != nil {
		if err := s.notificationService.CreateNotification(ctx, requesterID,
			models.NotificationTypeTaskCreated, "Task Posted",
			fmt.Sprintf("Your task '%s' has been posted", task.Title), &task.ID,
			models.StringMap{"taskTitle": task.Title}); err != nil {
			log.Printf("[TaskService] failed to send task_created notification: %v", err)
		}
	}

	// Index in search engine (non-critical — log and continue on failure)
	if err := s.searchService.IndexTask(ctx, task); err != nil {
		log.Printf("[TaskService] failed to index task %d in search: %v", task.ID, err)
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

	// Parse and validate deadline (nil clears it)
	if input.Deadline != nil {
		deadline, err := time.Parse(time.RFC3339, *input.Deadline)
		if err != nil {
			return nil, fmt.Errorf("invalid deadline format (use RFC3339): %w", err)
		}
		if time.Until(deadline) < time.Hour {
			return nil, fmt.Errorf("deadline must be at least 1 hour in the future")
		}
		task.Deadline = &deadline
	} else {
		task.Deadline = nil
	}

	if err := s.taskRepo.Update(ctx, task); err != nil {
		return nil, fmt.Errorf("failed to update task: %w", err)
	}

	// Re-index in search engine (non-critical)
	if err := s.searchService.IndexTask(ctx, task); err != nil {
		log.Printf("[TaskService] failed to re-index task %d in search: %v", task.ID, err)
	}

	return task, nil
}

// DeleteTask soft-deletes a task by setting status to cancelled.
// Rejects all pending applications and notifies applicants.
// Blocks deletion when an accepted application exists.
// Uses a DB transaction with row locking to prevent race conditions.
func (s *TaskService) DeleteTask(ctx context.Context, taskID, requesterID int64) error {
	// Unit tests pass db=nil — use non-transactional path
	if s.db == nil {
		return s.deleteTaskSimple(ctx, taskID, requesterID)
	}

	var task *models.Task
	var pendingApps []*models.TaskApplication

	// Transactional path with row locking
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. SELECT task FOR UPDATE (row lock)
		var txErr error
		task, txErr = s.taskRepo.GetByIDForUpdate(ctx, tx, taskID)
		if txErr != nil {
			return fmt.Errorf("task not found: %w", txErr)
		}

		// 2. Verify ownership
		if task.RequesterID != requesterID {
			return fmt.Errorf("not authorized to delete this task")
		}

		// 3. Verify status == open
		if task.Status != models.TaskStatusOpen {
			return fmt.Errorf("can only delete tasks with status 'open'")
		}

		// 4. Check for accepted applications
		apps, txErr := s.applicationRepo.GetByTaskID(ctx, taskID)
		if txErr != nil {
			return fmt.Errorf("failed to get applications: %w", txErr)
		}

		for _, app := range apps {
			if app.Status == models.ApplicationStatusAccepted {
				return fmt.Errorf("cannot delete: an applicant has been accepted")
			}
			if app.Status == models.ApplicationStatusPending {
				pendingApps = append(pendingApps, app)
			}
		}

		// 5. Set task status to cancelled
		if txErr := s.taskRepo.UpdateStatus(ctx, taskID, models.TaskStatusCancelled); txErr != nil {
			return fmt.Errorf("failed to cancel task: %w", txErr)
		}

		// 6. Reject all pending applications
		for _, app := range pendingApps {
			if txErr := s.applicationRepo.UpdateStatus(ctx, app.ID, models.ApplicationStatusRejected); txErr != nil {
				log.Printf("[TaskService] failed to reject application %d: %v", app.ID, txErr)
			}
		}

		return nil
	})

	if err != nil {
		return err
	}

	// After commit (non-critical): notify rejected applicants
	if s.notificationService != nil && task != nil {
		for _, app := range pendingApps {
			if notifyErr := s.notificationService.CreateNotification(ctx, app.TaskerID,
				models.NotificationTypeTaskCancelled, "Task Cancelled",
				fmt.Sprintf("Task '%s' has been cancelled by the creator", task.Title), &taskID,
				models.StringMap{"taskTitle": task.Title}); notifyErr != nil {
				log.Printf("[TaskService] failed to send task_cancelled notification to user %d: %v", app.TaskerID, notifyErr)
			}
		}
	}

	// Remove from search index (non-critical)
	if delErr := s.searchService.DeleteTask(ctx, taskID); delErr != nil {
		log.Printf("[TaskService] failed to delete task %d from search index: %v", taskID, delErr)
	}

	return nil
}

// deleteTaskSimple is the non-transactional path for unit tests (db == nil).
func (s *TaskService) deleteTaskSimple(ctx context.Context, taskID, requesterID int64) error {
	task, err := s.taskRepo.GetByID(ctx, taskID)
	if err != nil {
		return fmt.Errorf("task not found: %w", err)
	}

	if task.RequesterID != requesterID {
		return fmt.Errorf("not authorized to delete this task")
	}

	if task.Status != models.TaskStatusOpen {
		return fmt.Errorf("can only delete tasks with status 'open'")
	}

	// Check for accepted applications
	apps, err := s.applicationRepo.GetByTaskID(ctx, taskID)
	if err != nil {
		return fmt.Errorf("failed to get applications: %w", err)
	}

	var pendingApps []*models.TaskApplication
	for _, app := range apps {
		if app.Status == models.ApplicationStatusAccepted {
			return fmt.Errorf("cannot delete: an applicant has been accepted")
		}
		if app.Status == models.ApplicationStatusPending {
			pendingApps = append(pendingApps, app)
		}
	}

	// Set status to cancelled (soft delete)
	if err := s.taskRepo.UpdateStatus(ctx, taskID, models.TaskStatusCancelled); err != nil {
		return fmt.Errorf("failed to cancel task: %w", err)
	}

	// Reject pending applications
	for _, app := range pendingApps {
		if err := s.applicationRepo.UpdateStatus(ctx, app.ID, models.ApplicationStatusRejected); err != nil {
			log.Printf("[TaskService] failed to reject application %d: %v", app.ID, err)
		}
	}

	// Notify rejected applicants (non-critical)
	if s.notificationService != nil {
		for _, app := range pendingApps {
			if err := s.notificationService.CreateNotification(ctx, app.TaskerID,
				models.NotificationTypeTaskCancelled, "Task Cancelled",
				fmt.Sprintf("Task '%s' has been cancelled by the creator", task.Title), &taskID,
				models.StringMap{"taskTitle": task.Title}); err != nil {
				log.Printf("[TaskService] failed to send task_cancelled notification to user %d: %v", app.TaskerID, err)
			}
		}
	}

	// Remove from search index (non-critical)
	if err := s.searchService.DeleteTask(ctx, taskID); err != nil {
		log.Printf("[TaskService] failed to delete task %d from search index: %v", taskID, err)
	}

	return nil
}

// ListTasks lists tasks with filters. When a search query is present and
// Meilisearch is configured, it delegates to the search engine for relevance-
// ranked results. Falls back to PostgreSQL LIKE on error or when Meilisearch
// is not available.
func (s *TaskService) ListTasks(ctx context.Context, filters repository.TaskFilters) ([]*models.Task, int, error) {
	// Try Meilisearch first if a search query is present
	if filters.Search != nil && *filters.Search != "" {
		searchFilters := SearchFilters{
			CategoryID: filters.CategoryID,
			Status:     filters.Status,
			MinPrice:   filters.MinPrice,
			MaxPrice:   filters.MaxPrice,
			Limit:      filters.Limit,
			Offset:     filters.Offset,
		}
		taskIDs, total, err := s.searchService.SearchTasks(ctx, *filters.Search, searchFilters)
		if err != nil {
			log.Printf("[TaskService] Meilisearch error, falling back to DB: %v", err)
			// Fall through to PostgreSQL LIKE
		} else if len(taskIDs) > 0 {
			tasks, err := s.taskRepo.GetByIDs(ctx, taskIDs)
			if err != nil {
				return nil, 0, fmt.Errorf("failed to fetch tasks by IDs: %w", err)
			}
			return tasks, total, nil
		} else if total == 0 && err == nil {
			// Meilisearch returned 0 results (genuinely no matches)
			// But NoOpSearchService also returns (nil, 0, nil) — distinguish:
			// if the underlying service is NoOp, fall through to LIKE.
			if _, isNoOp := s.searchService.(*NoOpSearchService); !isNoOp {
				return []*models.Task{}, 0, nil
			}
		}
	}

	// Fallback: existing PostgreSQL LIKE query
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

	// Block applications on overdue tasks
	if task.IsOverdue() {
		return nil, fmt.Errorf("deadline has passed, applications are closed")
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

	// Notify task creator about new application (non-critical — log and continue on failure)
	if s.notificationService != nil {
		if err := s.notificationService.CreateNotification(ctx, task.RequesterID,
			models.NotificationTypeApplicationReceived, "New Application",
			fmt.Sprintf("Someone applied to your task '%s'", task.Title), &taskID,
			models.StringMap{"taskTitle": task.Title}); err != nil {
			log.Printf("[TaskService] failed to send application_received notification: %v", err)
		}

		if err := s.notificationService.CreateNotification(ctx, taskerID,
			models.NotificationTypeApplicationSent, "Application Sent",
			fmt.Sprintf("You applied for '%s'", task.Title), &taskID,
			models.StringMap{"taskTitle": task.Title}); err != nil {
			log.Printf("[TaskService] failed to send application_sent notification: %v", err)
		}
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

	// Notify applicant that their application was accepted (non-critical — log and continue on failure)
	if s.notificationService != nil {
		if err := s.notificationService.CreateNotification(ctx, app.TaskerID,
			models.NotificationTypeApplicationAccepted, "Application Accepted",
			fmt.Sprintf("Your application for '%s' was accepted", task.Title), &task.ID,
			models.StringMap{"taskTitle": task.Title}); err != nil {
			log.Printf("[TaskService] failed to send application_accepted notification: %v", err)
		}
	}

	return nil
}

// CompleteTask marks a task as completed.
// If the task has an escrow payment, it atomically releases payment and sets status
// to completed in a single DB transaction via PaymentService.ReleasePayment.
// If no escrow exists (e.g., free tasks), it sets status to completed directly.
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

	// Try to release payment atomically (also sets status to completed)
	if s.paymentService != nil {
		if err := s.paymentService.ReleasePayment(ctx, taskID, requesterID); err != nil {
			return fmt.Errorf("failed to release payment: %w", err)
		}
		// ReleasePayment already set status to completed, sent notifications,
		// and removed from search index — we're done.
		return nil
	}

	// No payment service (e.g., free tasks or unit tests without payment) —
	// just set status to completed directly.
	if err := s.taskRepo.UpdateStatus(ctx, taskID, models.TaskStatusCompleted); err != nil {
		return fmt.Errorf("failed to complete task: %w", err)
	}

	// Notify both parties (non-critical — log and continue on failure)
	if s.notificationService != nil {
		if err := s.notificationService.CreateNotification(ctx, requesterID,
			models.NotificationTypeTaskCompleted, "Task Completed",
			fmt.Sprintf("Task '%s' has been completed", task.Title), &taskID,
			models.StringMap{"taskTitle": task.Title}); err != nil {
			log.Printf("[TaskService] failed to send task_completed notification to requester: %v", err)
		}

		if task.TaskerID != nil {
			if err := s.notificationService.CreateNotification(ctx, *task.TaskerID,
				models.NotificationTypeTaskCompleted, "Task Completed",
				fmt.Sprintf("Task '%s' has been completed", task.Title), &taskID,
				models.StringMap{"taskTitle": task.Title}); err != nil {
				log.Printf("[TaskService] failed to send task_completed notification to tasker: %v", err)
			}
		}
	}

	// Remove from search index (non-critical — completed tasks shouldn't appear in search)
	if err := s.searchService.DeleteTask(ctx, taskID); err != nil {
		log.Printf("[TaskService] failed to delete completed task %d from search index: %v", taskID, err)
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
