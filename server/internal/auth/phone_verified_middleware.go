package auth

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/repository"
)

// PhoneVerifiedRequired is a middleware that checks if the user's phone is verified.
// Must be applied AFTER AuthRequired. Used for money operations (deposit, escrow, withdraw).
func PhoneVerifiedRequired(userRepo repository.UserRepository) gin.HandlerFunc {
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

		if !user.PhoneVerified {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "phone_not_verified",
				"message": "Please verify your phone number before performing this action",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
