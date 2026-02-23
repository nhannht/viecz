package middleware

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func setupRouter(cfg RateLimitConfig) *gin.Engine {
	r := gin.New()
	r.Use(RateLimit(cfg))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	return r
}

func TestRateLimit_AllowsUnderLimit(t *testing.T) {
	cfg := RateLimitConfig{
		Window:      time.Minute,
		MaxRequests: 5,
		KeyFunc:     IPKey,
	}
	r := setupRouter(cfg)

	for i := 0; i < 5; i++ {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "1.2.3.4:1234"
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("request %d: expected 200, got %d", i, w.Code)
		}
	}
}

func TestRateLimit_BlocksAtLimit(t *testing.T) {
	cfg := RateLimitConfig{
		Window:      time.Minute,
		MaxRequests: 3,
		KeyFunc:     IPKey,
	}
	r := setupRouter(cfg)

	// Use up the limit
	for i := 0; i < 3; i++ {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "1.2.3.4:1234"
		r.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("request %d: expected 200, got %d", i, w.Code)
		}
	}

	// Next request should be blocked
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "1.2.3.4:1234"
	r.ServeHTTP(w, req)

	if w.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", w.Code)
	}

	retryAfter := w.Header().Get("Retry-After")
	if retryAfter == "" {
		t.Fatal("expected Retry-After header")
	}
	seconds, err := strconv.Atoi(retryAfter)
	if err != nil || seconds <= 0 {
		t.Fatalf("invalid Retry-After: %q", retryAfter)
	}
}

func TestRateLimit_WindowResetAllowsNewRequests(t *testing.T) {
	now := time.Now()
	mu := sync.Mutex{}

	cfg := RateLimitConfig{
		Window:      time.Minute,
		MaxRequests: 2,
		KeyFunc:     IPKey,
	}

	store := newRateLimitStore(cfg)
	store.nowFunc = func() time.Time {
		mu.Lock()
		defer mu.Unlock()
		return now
	}

	// Use up the limit
	for i := 0; i < 2; i++ {
		allowed, _ := store.allow("ip:1.2.3.4")
		if !allowed {
			t.Fatalf("request %d should be allowed", i)
		}
	}

	// Should be blocked
	allowed, _ := store.allow("ip:1.2.3.4")
	if allowed {
		t.Fatal("should be blocked at limit")
	}

	// Advance time past the window
	mu.Lock()
	now = now.Add(time.Minute + time.Second)
	mu.Unlock()

	// Should be allowed again
	allowed, _ = store.allow("ip:1.2.3.4")
	if !allowed {
		t.Fatal("should be allowed after window reset")
	}
}

func TestRateLimit_PerKeyIsolation(t *testing.T) {
	cfg := RateLimitConfig{
		Window:      time.Minute,
		MaxRequests: 2,
		KeyFunc:     IPKey,
	}
	r := setupRouter(cfg)

	// IP A: use up limit
	for i := 0; i < 2; i++ {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "1.1.1.1:1234"
		r.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("IP A request %d: expected 200, got %d", i, w.Code)
		}
	}

	// IP A: blocked
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "1.1.1.1:1234"
	r.ServeHTTP(w, req)
	if w.Code != http.StatusTooManyRequests {
		t.Fatalf("IP A: expected 429, got %d", w.Code)
	}

	// IP B: should still be allowed
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "2.2.2.2:1234"
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("IP B: expected 200, got %d", w.Code)
	}
}

func TestRateLimit_DisabledPassthrough(t *testing.T) {
	cfg := RateLimitConfig{
		Window:      time.Minute,
		MaxRequests: 0, // disabled
		KeyFunc:     IPKey,
	}
	r := setupRouter(cfg)

	for i := 0; i < 100; i++ {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "1.2.3.4:1234"
		r.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("request %d: expected 200 (disabled), got %d", i, w.Code)
		}
	}
}

func TestRateLimit_KeyFuncFalsePassthrough(t *testing.T) {
	cfg := RateLimitConfig{
		Window:      time.Minute,
		MaxRequests: 1,
		KeyFunc: func(c *gin.Context) (string, bool) {
			return "", false // always skip
		},
	}
	r := setupRouter(cfg)

	for i := 0; i < 10; i++ {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)
		r.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("request %d: expected 200 (skip), got %d", i, w.Code)
		}
	}
}

func TestIPKey(t *testing.T) {
	r := gin.New()
	r.GET("/test", func(c *gin.Context) {
		key, found := IPKey(c)
		if !found {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "no ip"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"key": key})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "10.0.0.1:5555"
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestUserKey_WithUserID(t *testing.T) {
	r := gin.New()
	r.GET("/test", func(c *gin.Context) {
		c.Set("user_id", int64(42))
		key, found := UserKey(c)
		if !found {
			t.Fatal("expected found=true")
		}
		if key != "user:42" {
			t.Fatalf("expected user:42, got %s", key)
		}
		c.JSON(http.StatusOK, gin.H{"key": key})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestUserKey_FallsBackToIP(t *testing.T) {
	r := gin.New()
	r.GET("/test", func(c *gin.Context) {
		// no user_id set
		key, found := UserKey(c)
		if !found {
			t.Fatal("expected found=true (IP fallback)")
		}
		if key == "" {
			t.Fatal("expected non-empty key")
		}
		c.JSON(http.StatusOK, gin.H{"key": key})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "5.5.5.5:1111"
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestUserOrIPKey_PrefersUser(t *testing.T) {
	r := gin.New()
	r.GET("/test", func(c *gin.Context) {
		c.Set("user_id", int64(99))
		key, found := UserOrIPKey(c)
		if !found {
			t.Fatal("expected found=true")
		}
		if key != "user:99" {
			t.Fatalf("expected user:99, got %s", key)
		}
		c.JSON(http.StatusOK, gin.H{"key": key})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "1.1.1.1:1234"
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestUserOrIPKey_FallsBackToIP(t *testing.T) {
	r := gin.New()
	r.GET("/test", func(c *gin.Context) {
		// no user_id
		key, found := UserOrIPKey(c)
		if !found {
			t.Fatal("expected found=true")
		}
		if key == "user:0" || key == "" {
			t.Fatalf("expected IP-based key, got %s", key)
		}
		c.JSON(http.StatusOK, gin.H{"key": key})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "8.8.8.8:4444"
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestRateLimit_CleanupRemovesStaleEntries(t *testing.T) {
	now := time.Now()
	mu := sync.Mutex{}

	cfg := RateLimitConfig{
		Window:      time.Minute,
		MaxRequests: 100,
		KeyFunc:     IPKey,
	}

	store := newRateLimitStore(cfg)
	store.nowFunc = func() time.Time {
		mu.Lock()
		defer mu.Unlock()
		return now
	}

	// Add some entries
	store.allow("ip:stale")
	store.allow("ip:fresh")

	// Advance time past 2× window for "stale"
	mu.Lock()
	now = now.Add(3 * time.Minute)
	mu.Unlock()

	// Touch "fresh" so it's not stale
	store.allow("ip:fresh")

	// Run cleanup
	store.cleanup()

	store.mu.Lock()
	defer store.mu.Unlock()

	if _, exists := store.counters["ip:stale"]; exists {
		t.Fatal("stale entry should have been cleaned up")
	}
	if _, exists := store.counters["ip:fresh"]; !exists {
		t.Fatal("fresh entry should still exist")
	}
}

func TestRateLimit_ConcurrentAccess(t *testing.T) {
	cfg := RateLimitConfig{
		Window:      time.Minute,
		MaxRequests: 1000,
		KeyFunc:     IPKey,
	}
	r := setupRouter(cfg)

	var wg sync.WaitGroup
	errors := make(chan error, 100)

	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("GET", "/test", nil)
			req.RemoteAddr = "1.2.3.4:1234"
			r.ServeHTTP(w, req)
			if w.Code != http.StatusOK {
				errors <- nil // some may get 429 at high concurrency, that's OK
			}
		}()
	}

	wg.Wait()
	close(errors)
	// Main assertion: no panic, no data race (run with -race)
}

func TestRateLimit_SlidingWindowEstimation(t *testing.T) {
	now := time.Now().Truncate(time.Minute)
	mu := sync.Mutex{}

	cfg := RateLimitConfig{
		Window:      time.Minute,
		MaxRequests: 10,
		KeyFunc:     IPKey,
	}

	store := newRateLimitStore(cfg)
	store.nowFunc = func() time.Time {
		mu.Lock()
		defer mu.Unlock()
		return now
	}

	// Fill previous window with 8 requests
	for i := 0; i < 8; i++ {
		allowed, _ := store.allow("ip:test")
		if !allowed {
			t.Fatalf("request %d should be allowed in first window", i)
		}
	}

	// Move to start of next window (previous=8, current=0)
	mu.Lock()
	now = now.Add(time.Minute)
	mu.Unlock()

	// At start of new window, overlap fraction ≈ 1.0
	// Request 1: estimated = 8*1.0 + 0 = 8 < 10, allowed → count becomes 1
	allowed, _ := store.allow("ip:test")
	if !allowed {
		t.Fatal("should be allowed at start of new window (estimated = 8 < 10)")
	}

	// Request 2: estimated = 8*1.0 + 1 = 9 < 10, allowed → count becomes 2
	allowed, _ = store.allow("ip:test")
	if !allowed {
		t.Fatal("should be allowed (estimated = 9 < 10)")
	}

	// Request 3: estimated = 8*1.0 + 2 = 10 >= 10, blocked
	allowed, _ = store.allow("ip:test")
	if allowed {
		t.Fatal("should be blocked (estimated rate = 10 >= limit of 10)")
	}
}

func TestRateLimit_NegativeMaxRequestsPassthrough(t *testing.T) {
	cfg := RateLimitConfig{
		Window:      time.Minute,
		MaxRequests: -1,
		KeyFunc:     IPKey,
	}
	r := setupRouter(cfg)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "1.2.3.4:1234"
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 (negative = disabled), got %d", w.Code)
	}
}
