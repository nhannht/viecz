package middleware

import (
	"time"

	sentrygin "github.com/getsentry/sentry-go/gin"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

// RequestLogger logs each HTTP request with method, path, status, latency, client IP,
// user ID (if authenticated), and a unique request ID. Skips /health and /metrics
// to reduce noise. Sets X-Request-ID response header and correlates with Sentry.
func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip noisy endpoints
		path := c.Request.URL.Path
		if path == "/api/v1/health" || path == "/metrics" {
			c.Next()
			return
		}

		// Generate request ID
		reqID := uuid.New().String()
		c.Set("request_id", reqID)
		c.Writer.Header().Set("X-Request-ID", reqID)

		// Correlate with Sentry
		if hub := sentrygin.GetHubFromContext(c); hub != nil {
			hub.Scope().SetTag("request_id", reqID)
		}

		start := time.Now()

		c.Next()

		latency := time.Since(start)

		event := log.Info().
			Str("request_id", reqID).
			Str("method", c.Request.Method).
			Str("path", path).
			Int("status", c.Writer.Status()).
			Dur("latency", latency).
			Str("client_ip", c.ClientIP())

		if userID, exists := c.Get("user_id"); exists {
			event = event.Interface("user_id", userID)
		}

		event.Msg("request")
	}
}
