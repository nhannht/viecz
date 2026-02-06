package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/repository"
)

// CategoryHandler handles category-related HTTP requests
type CategoryHandler struct {
	categoryRepo repository.CategoryRepository
}

// NewCategoryHandler creates a new CategoryHandler
func NewCategoryHandler(categoryRepo repository.CategoryRepository) *CategoryHandler {
	return &CategoryHandler{categoryRepo: categoryRepo}
}

// GetCategories handles GET /api/v1/categories
func (h *CategoryHandler) GetCategories(c *gin.Context) {
	categories, err := h.categoryRepo.GetAll(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, categories)
}
