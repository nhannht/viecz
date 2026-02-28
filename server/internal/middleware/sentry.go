package middleware

import (
	"fmt"

	"github.com/getsentry/sentry-go"
	sentrygin "github.com/getsentry/sentry-go/gin"
	"github.com/gin-gonic/gin"
)

// SentryMiddleware returns Gin middleware that captures panics and reports them to Sentry.
// Repanic is enabled so Gin's default recovery middleware can also handle the panic.
func SentryMiddleware() gin.HandlerFunc {
	return sentrygin.New(sentrygin.Options{
		Repanic: true,
	})
}

// SetSentryUser sets user context on the Sentry scope from the authenticated user ID.
// Must be placed after auth middleware so that "user_id" is present in the context.
func SetSentryUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		if hub := sentrygin.GetHubFromContext(c); hub != nil {
			if userID, exists := c.Get("user_id"); exists {
				hub.Scope().SetUser(sentry.User{
					ID: fmt.Sprintf("%v", userID),
				})
			}
		}
		c.Next()
	}
}
