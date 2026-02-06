package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/services"
)

// UserHandler handles user-related HTTP requests
type UserHandler struct {
	userService *services.UserService
}

// NewUserHandler creates a new user handler
func NewUserHandler(userService *services.UserService) *UserHandler {
	return &UserHandler{
		userService: userService,
	}
}

// GetProfile godoc
// @Summary Get user profile
// @Tags users
// @Accept json
// @Produce json
// @Param id path int true "User ID"
// @Success 200 {object} models.User
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /users/{id} [get]
func (h *UserHandler) GetProfile(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	user, err := h.userService.GetProfile(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user)
}

// GetMyProfile godoc
// @Summary Get current user's profile
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} models.User
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /users/me [get]
func (h *UserHandler) GetMyProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	user, err := h.userService.GetProfile(c.Request.Context(), userID.(int64))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user)
}

// UpdateProfile godoc
// @Summary Update user profile
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param input body services.UpdateProfileInput true "Profile update data"
// @Success 200 {object} models.User
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /users/me [put]
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var input services.UpdateProfileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userService.UpdateProfile(c.Request.Context(), userID.(int64), &input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user)
}

// BecomeTasker godoc
// @Summary Register as a tasker
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} models.User
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /users/become-tasker [post]
func (h *UserHandler) BecomeTasker(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	user, err := h.userService.BecomeTasker(c.Request.Context(), userID.(int64))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user)
}
