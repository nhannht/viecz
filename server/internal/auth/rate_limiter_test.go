package auth

import (
	"testing"
	"time"
)

func TestResendRateLimiter_FirstRequest(t *testing.T) {
	rl := NewResendRateLimiter()
	if err := rl.Allow(1); err != nil {
		t.Errorf("First request should be allowed, got: %v", err)
	}
}

func TestResendRateLimiter_PerMinuteLimit(t *testing.T) {
	rl := NewResendRateLimiter()

	// First request — allowed
	if err := rl.Allow(1); err != nil {
		t.Fatalf("First request should be allowed: %v", err)
	}

	// Second request within a minute — denied
	if err := rl.Allow(1); err == nil {
		t.Error("Second request within a minute should be denied")
	}
}

func TestResendRateLimiter_PerMinuteReset(t *testing.T) {
	rl := NewResendRateLimiter()

	if err := rl.Allow(1); err != nil {
		t.Fatalf("First request should be allowed: %v", err)
	}

	// Simulate time passing by manipulating entry directly
	rl.mu.Lock()
	rl.entries[1].lastRequest = time.Now().Add(-2 * time.Minute)
	rl.mu.Unlock()

	if err := rl.Allow(1); err != nil {
		t.Errorf("Request after minute should be allowed: %v", err)
	}
}

func TestResendRateLimiter_HourlyLimit(t *testing.T) {
	rl := NewResendRateLimiter()

	// Make 5 requests (each after resetting per-minute limit)
	for i := 0; i < 5; i++ {
		if err := rl.Allow(1); err != nil {
			t.Fatalf("Request %d should be allowed: %v", i+1, err)
		}
		// Reset per-minute limit
		rl.mu.Lock()
		rl.entries[1].lastRequest = time.Now().Add(-2 * time.Minute)
		rl.mu.Unlock()
	}

	// 6th request — should be denied (hourly limit)
	if err := rl.Allow(1); err == nil {
		t.Error("6th request within an hour should be denied")
	}
}

func TestResendRateLimiter_HourlyReset(t *testing.T) {
	rl := NewResendRateLimiter()

	// Exhaust hourly limit
	for i := 0; i < 5; i++ {
		rl.Allow(1)
		rl.mu.Lock()
		rl.entries[1].lastRequest = time.Now().Add(-2 * time.Minute)
		rl.mu.Unlock()
	}

	// Reset hourly window
	rl.mu.Lock()
	rl.entries[1].hourStart = time.Now().Add(-2 * time.Hour)
	rl.entries[1].lastRequest = time.Now().Add(-2 * time.Minute)
	rl.mu.Unlock()

	if err := rl.Allow(1); err != nil {
		t.Errorf("Request after hourly reset should be allowed: %v", err)
	}
}

func TestResendRateLimiter_DifferentUsers(t *testing.T) {
	rl := NewResendRateLimiter()

	if err := rl.Allow(1); err != nil {
		t.Fatalf("User 1 first request should be allowed: %v", err)
	}

	// User 2 should not be affected by user 1's limit
	if err := rl.Allow(2); err != nil {
		t.Errorf("User 2 first request should be allowed: %v", err)
	}
}
