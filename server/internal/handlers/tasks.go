package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
	"viecz.vieczserver/internal/services"
)

// TaskHandler handles task-related HTTP requests
type TaskHandler struct {
	taskService        *services.TaskService
	applicationRepo    repository.TaskApplicationRepository
}

// NewTaskHandler creates a new TaskHandler
func NewTaskHandler(taskService *services.TaskService, applicationRepo repository.TaskApplicationRepository) *TaskHandler {
	return &TaskHandler{
		taskService:     taskService,
		applicationRepo: applicationRepo,
	}
}

// TaskResponse represents a task with additional user-specific fields
type TaskResponse struct {
	*models.Task
	UserHasApplied bool `json:"user_has_applied"`
}

// CreateTask handles POST /api/v1/tasks
func (h *TaskHandler) CreateTask(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var input services.CreateTaskInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	task, err := h.taskService.CreateTask(c.Request.Context(), userID.(int64), &input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, task)
}

// GetTask handles GET /api/v1/tasks/:id
func (h *TaskHandler) GetTask(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}

	task, err := h.taskService.GetTask(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}

	// Check if the requesting user has applied for this task
	userHasApplied := false
	if userID, exists := c.Get("user_id"); exists {
		hasApplied, err := h.applicationRepo.ExistsByTaskAndTasker(c.Request.Context(), id, userID.(int64))
		if err == nil {
			userHasApplied = hasApplied
		}
	}

	response := TaskResponse{
		Task:           task,
		UserHasApplied: userHasApplied,
	}

	c.JSON(http.StatusOK, response)
}

// UpdateTask handles PUT /api/v1/tasks/:id
func (h *TaskHandler) UpdateTask(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}

	var input services.CreateTaskInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	task, err := h.taskService.UpdateTask(c.Request.Context(), id, userID.(int64), &input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, task)
}

// DeleteTask handles DELETE /api/v1/tasks/:id
func (h *TaskHandler) DeleteTask(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}

	if err := h.taskService.DeleteTask(c.Request.Context(), id, userID.(int64)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "task cancelled successfully"})
}

// ListTasks handles GET /api/v1/tasks
func (h *TaskHandler) ListTasks(c *gin.Context) {
	filters := repository.TaskFilters{
		Limit:  20,
		Offset: 0,
	}

	// Parse query parameters
	if categoryID := c.Query("category_id"); categoryID != "" {
		id, err := strconv.ParseInt(categoryID, 10, 64)
		if err == nil {
			filters.CategoryID = &id
		}
	}

	if requesterID := c.Query("requester_id"); requesterID != "" {
		id, err := strconv.ParseInt(requesterID, 10, 64)
		if err == nil {
			filters.RequesterID = &id
		}
	}

	if taskerID := c.Query("tasker_id"); taskerID != "" {
		id, err := strconv.ParseInt(taskerID, 10, 64)
		if err == nil {
			filters.TaskerID = &id
		}
	}

	if status := c.Query("status"); status != "" {
		taskStatus := models.TaskStatus(status)
		filters.Status = &taskStatus
	}

	if minPrice := c.Query("min_price"); minPrice != "" {
		price, err := strconv.ParseInt(minPrice, 10, 64)
		if err == nil {
			filters.MinPrice = &price
		}
	}

	if maxPrice := c.Query("max_price"); maxPrice != "" {
		price, err := strconv.ParseInt(maxPrice, 10, 64)
		if err == nil {
			filters.MaxPrice = &price
		}
	}

	if location := c.Query("location"); location != "" {
		filters.Location = &location
	}

	if search := c.Query("search"); search != "" {
		filters.Search = &search
	}

	if page := c.Query("page"); page != "" {
		pageNum, err := strconv.Atoi(page)
		if err == nil && pageNum > 0 {
			filters.Offset = (pageNum - 1) * filters.Limit
		}
	}

	if limit := c.Query("limit"); limit != "" {
		limitNum, err := strconv.Atoi(limit)
		if err == nil && limitNum > 0 && limitNum <= 100 {
			filters.Limit = limitNum
		}
	}

	tasks, total, err := h.taskService.ListTasks(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  tasks,
		"total": total,
		"page":  (filters.Offset / filters.Limit) + 1,
		"limit": filters.Limit,
	})
}

// ApplyForTask handles POST /api/v1/tasks/:id/applications
func (h *TaskHandler) ApplyForTask(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	taskID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}

	var input services.ApplyForTaskInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	application, err := h.taskService.ApplyForTask(c.Request.Context(), taskID, userID.(int64), &input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, application)
}

// GetTaskApplications handles GET /api/v1/tasks/:id/applications
func (h *TaskHandler) GetTaskApplications(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	taskID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}

	applications, err := h.taskService.GetTaskApplications(c.Request.Context(), taskID, userID.(int64))
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, applications)
}

// AcceptApplication handles POST /api/v1/applications/:id/accept
func (h *TaskHandler) AcceptApplication(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	appID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid application id"})
		return
	}

	if err := h.taskService.AcceptApplication(c.Request.Context(), appID, userID.(int64)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "application accepted successfully"})
}

// CompleteTask handles POST /api/v1/tasks/:id/complete
func (h *TaskHandler) CompleteTask(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	taskID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}

	if err := h.taskService.CompleteTask(c.Request.Context(), taskID, userID.(int64)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "task completed successfully"})
}
