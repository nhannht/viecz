package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// HealthHandler provides an enhanced health check that verifies backend dependencies.
// GET /api/v1/health — returns overall status plus per-component checks.
type HealthHandler struct {
	db *gorm.DB
}

// NewHealthHandler creates a HealthHandler with database connectivity check.
func NewHealthHandler(db *gorm.DB) *HealthHandler {
	return &HealthHandler{db: db}
}

// Health checks database connectivity and returns a structured health response.
func (h *HealthHandler) Health(c *gin.Context) {
	checks := map[string]string{}
	overall := "healthy"

	// Check database
	if sqlDB, err := h.db.DB(); err != nil {
		checks["database"] = "unhealthy"
		overall = "unhealthy"
	} else if err := sqlDB.Ping(); err != nil {
		checks["database"] = "unhealthy"
		overall = "unhealthy"
	} else {
		checks["database"] = "healthy"
	}

	status := http.StatusOK
	if overall != "healthy" {
		status = http.StatusServiceUnavailable
	}

	c.JSON(status, gin.H{
		"status": overall,
		"checks": checks,
	})
}
