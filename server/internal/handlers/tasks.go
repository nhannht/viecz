package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
	"viecz.vieczserver/internal/services"
)

// handleServiceError checks if err is a ProfileIncompleteError and returns
// a structured 403 response. Otherwise it returns the given fallback status.
func handleServiceError(c *gin.Context, err error, fallbackStatus int) {
	var profileErr *services.ProfileIncompleteError
	if errors.As(err, &profileErr) {
		c.JSON(http.StatusForbidden, gin.H{
			"error":          "profile_incomplete",
			"missing_fields": profileErr.MissingFields,
			"action":         profileErr.Action,
			"message":        profileErr.Message,
		})
		return
	}
	c.JSON(fallbackStatus, gin.H{"error": err.Error()})
}

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
	UserHasApplied   bool     `json:"user_has_applied"`
	IsOverdue        bool     `json:"is_overdue"`
	ApplicationCount int64    `json:"application_count"`
	DistanceKm       *float64 `json:"distance_km,omitempty"`
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
		handleServiceError(c, err, http.StatusInternalServerError)
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

	// Get application count
	var appCount int64
	counts, err := h.applicationRepo.CountByTaskIDs(c.Request.Context(), []int64{id})
	if err == nil {
		appCount = counts[id]
	}

	response := TaskResponse{
		Task:             task,
		UserHasApplied:   userHasApplied,
		IsOverdue:        task.IsOverdue(),
		ApplicationCount: appCount,
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

	if lat := c.Query("lat"); lat != "" {
		if v, err := strconv.ParseFloat(lat, 64); err == nil {
			filters.Latitude = &v
		}
	}
	if lng := c.Query("lng"); lng != "" {
		if v, err := strconv.ParseFloat(lng, 64); err == nil {
			filters.Longitude = &v
		}
	}
	if radius := c.Query("radius"); radius != "" {
		if v, err := strconv.Atoi(radius); err == nil && v > 0 {
			filters.RadiusMeters = &v
		}
	}
	if c.Query("sort") == "distance" {
		filters.SortByDistance = true
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

	tasks, total, distances, err := h.taskService.ListTasks(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Batch-query application counts
	taskIDs := make([]int64, len(tasks))
	for i, t := range tasks {
		taskIDs[i] = t.ID
	}
	appCounts, _ := h.applicationRepo.CountByTaskIDs(c.Request.Context(), taskIDs)
	if appCounts == nil {
		appCounts = make(map[int64]int64)
	}

	// Wrap tasks in TaskResponse
	responses := make([]TaskResponse, len(tasks))
	for i, t := range tasks {
		resp := TaskResponse{
			Task:             t,
			IsOverdue:        t.IsOverdue(),
			ApplicationCount: appCounts[t.ID],
		}
		if distances != nil {
			if d, ok := distances[t.ID]; ok {
				km := float64(d) / 1000.0
				resp.DistanceKm = &km
			}
		}
		responses[i] = resp
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  responses,
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
		handleServiceError(c, err, http.StatusBadRequest)
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
