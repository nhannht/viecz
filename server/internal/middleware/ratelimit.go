package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimitConfig defines limits for a route group.
type RateLimitConfig struct {
	Window      time.Duration
	MaxRequests int
	// KeyFunc extracts the rate limit key from the request.
	// Returns (key, true) to rate-limit, or ("", false) to skip.
	KeyFunc func(c *gin.Context) (string, bool)
}

// windowCounter tracks requests in a fixed time window.
type windowCounter struct {
	count     int
	startTime time.Time
}

// clientCounter tracks current and previous window for sliding window estimation.
type clientCounter struct {
	current  windowCounter
	previous windowCounter
	lastSeen time.Time
}

// rateLimitStore is the in-memory store for a single rate limiter instance.
type rateLimitStore struct {
	mu       sync.Mutex
	counters map[string]*clientCounter
	config   RateLimitConfig
	nowFunc  func() time.Time // injectable for testing
}

func newRateLimitStore(cfg RateLimitConfig) *rateLimitStore {
	return &rateLimitStore{
		counters: make(map[string]*clientCounter),
		config:   cfg,
		nowFunc:  time.Now,
	}
}

// allow checks if a request is allowed. Returns (allowed, retryAfter).
func (s *rateLimitStore) allow(key string) (bool, time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := s.nowFunc()
	window := s.config.Window

	cc, exists := s.counters[key]
	if !exists {
		s.counters[key] = &clientCounter{
			current:  windowCounter{count: 1, startTime: now},
			lastSeen: now,
		}
		return true, 0
	}

	cc.lastSeen = now

	// Rotate windows if we've moved past the current window
	elapsed := now.Sub(cc.current.startTime)
	if elapsed >= window {
		if elapsed < 2*window {
			// Moved to next window — current becomes previous
			cc.previous = cc.current
		} else {
			// Skipped entire window — previous is empty
			cc.previous = windowCounter{}
		}
		cc.current = windowCounter{count: 0, startTime: now.Truncate(window)}
		// Align to window boundary
		windowStart := now.Truncate(window)
		if windowStart.IsZero() || windowStart.After(now) {
			windowStart = now
		}
		cc.current.startTime = windowStart
	}

	// Sliding window estimation
	elapsedInCurrent := now.Sub(cc.current.startTime)
	overlapFraction := float64(window-elapsedInCurrent) / float64(window)
	if overlapFraction < 0 {
		overlapFraction = 0
	}
	estimatedRate := float64(cc.previous.count)*overlapFraction + float64(cc.current.count)

	if estimatedRate >= float64(s.config.MaxRequests) {
		retryAfter := window - elapsedInCurrent
		if retryAfter < time.Second {
			retryAfter = time.Second
		}
		return false, retryAfter
	}

	cc.current.count++
	return true, 0
}

// cleanupLoop removes stale entries periodically.
func (s *rateLimitStore) cleanupLoop() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		s.cleanup()
	}
}

func (s *rateLimitStore) cleanup() {
	s.mu.Lock()
	defer s.mu.Unlock()

	threshold := s.nowFunc().Add(-2 * s.config.Window)
	for key, cc := range s.counters {
		if cc.lastSeen.Before(threshold) {
			delete(s.counters, key)
		}
	}
}

// RateLimit creates a rate limiting middleware.
// Each call creates an independent store (different route groups don't share state).
func RateLimit(cfg RateLimitConfig) gin.HandlerFunc {
	if cfg.MaxRequests <= 0 {
		return func(c *gin.Context) { c.Next() }
	}

	store := newRateLimitStore(cfg)
	go store.cleanupLoop()

	return func(c *gin.Context) {
		key, found := cfg.KeyFunc(c)
		if !found {
			c.Next()
			return
		}

		allowed, retryAfter := store.allow(key)
		if !allowed {
			c.Header("Retry-After", strconv.Itoa(int(retryAfter.Seconds())))
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "too many requests",
				"retry_after": int(retryAfter.Seconds()),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// --- Key extraction functions ---

// IPKey extracts the client IP as rate limit key (for unauthenticated endpoints).
func IPKey(c *gin.Context) (string, bool) {
	ip := c.ClientIP()
	return "ip:" + ip, ip != ""
}

// UserKey extracts the user ID as rate limit key (for authenticated endpoints).
// Falls back to IP if user_id is not in context.
func UserKey(c *gin.Context) (string, bool) {
	if userID, exists := c.Get("user_id"); exists {
		if id, ok := userID.(int64); ok {
			return "user:" + strconv.FormatInt(id, 10), true
		}
	}
	return IPKey(c)
}

// UserOrIPKey uses user ID if authenticated, IP otherwise (for optional-auth routes).
func UserOrIPKey(c *gin.Context) (string, bool) {
	if userID, exists := c.Get("user_id"); exists {
		if id, ok := userID.(int64); ok && id > 0 {
			return "user:" + strconv.FormatInt(id, 10), true
		}
	}
	return IPKey(c)
}
