package auth

import (
	"fmt"
	"sync"
	"time"
)

// ResendRateLimiter limits resend verification requests per user.
// 1 request per minute, max 5 per hour.
type ResendRateLimiter struct {
	mu      sync.Mutex
	entries map[int64]*rateLimitEntry
}

type rateLimitEntry struct {
	lastRequest time.Time
	hourlyCount int
	hourStart   time.Time
}

// NewResendRateLimiter creates a new rate limiter.
func NewResendRateLimiter() *ResendRateLimiter {
	return &ResendRateLimiter{
		entries: make(map[int64]*rateLimitEntry),
	}
}

// Allow checks if the user is allowed to make a resend request.
func (r *ResendRateLimiter) Allow(userID int64) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	entry, exists := r.entries[userID]

	if !exists {
		r.entries[userID] = &rateLimitEntry{
			lastRequest: now,
			hourlyCount: 1,
			hourStart:   now,
		}
		return nil
	}

	// Reset hourly window if expired
	if now.Sub(entry.hourStart) >= time.Hour {
		entry.hourlyCount = 0
		entry.hourStart = now
	}

	// Check per-minute limit
	if now.Sub(entry.lastRequest) < time.Minute {
		return fmt.Errorf("please wait before requesting another verification email")
	}

	// Check hourly limit
	if entry.hourlyCount >= 5 {
		return fmt.Errorf("too many verification email requests, try again later")
	}

	entry.lastRequest = now
	entry.hourlyCount++
	return nil
}
