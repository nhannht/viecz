package auth

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/repository"
)

// EmailVerifiedRequired is a middleware that checks if the user's email is verified.
// Must be applied AFTER AuthRequired.
func EmailVerifiedRequired(userRepo repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := GetUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authorization required"})
			c.Abort()
			return
		}

		user, err := userRepo.GetByID(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
			c.Abort()
			return
		}

		// Google OAuth users are always verified
		if user.AuthProvider == "google" {
			c.Next()
			return
		}

		if !user.EmailVerified {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "email_not_verified",
				"message": "Please verify your email address before performing this action",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
