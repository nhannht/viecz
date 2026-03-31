package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// --- CORS Tests ---

func TestCORS_AllowsConfiguredOrigin(t *testing.T) {
	r := gin.New()
	r.Use(CORS("https://example.com"))
	r.GET("/test", func(c *gin.Context) { c.Status(200) })

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Origin", "https://example.com")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "https://example.com" {
		t.Errorf("expected origin https://example.com, got %q", got)
	}
	if got := w.Header().Get("Access-Control-Allow-Credentials"); got != "true" {
		t.Errorf("expected credentials true, got %q", got)
	}
}

func TestCORS_AllowsNullOrigin(t *testing.T) {
	r := gin.New()
	r.Use(CORS("https://example.com"))
	r.GET("/test", func(c *gin.Context) { c.Status(200) })

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Origin", "null")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "null" {
		t.Errorf("expected origin null, got %q", got)
	}
}

func TestCORS_EmptyOriginUsesConfigured(t *testing.T) {
	r := gin.New()
	r.Use(CORS("https://example.com"))
	r.GET("/test", func(c *gin.Context) { c.Status(200) })

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "https://example.com" {
		t.Errorf("expected configured origin, got %q", got)
	}
}

func TestCORS_DifferentOriginUsesConfigured(t *testing.T) {
	r := gin.New()
	r.Use(CORS("https://example.com"))
	r.GET("/test", func(c *gin.Context) { c.Status(200) })

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Origin", "https://evil.com")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "https://example.com" {
		t.Errorf("expected configured origin for mismatch, got %q", got)
	}
}

func TestCORS_OptionsReturns204(t *testing.T) {
	r := gin.New()
	r.Use(CORS("https://example.com"))
	r.GET("/test", func(c *gin.Context) { c.Status(200) })

	req := httptest.NewRequest("OPTIONS", "/test", nil)
	req.Header.Set("Origin", "https://example.com")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != 204 {
		t.Errorf("expected 204 for OPTIONS, got %d", w.Code)
	}
}

func TestCORS_SetsAllHeaders(t *testing.T) {
	r := gin.New()
	r.Use(CORS("https://example.com"))
	r.GET("/test", func(c *gin.Context) { c.Status(200) })

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Origin", "https://example.com")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	headers := []string{
		"Access-Control-Allow-Origin",
		"Access-Control-Allow-Credentials",
		"Access-Control-Allow-Headers",
		"Access-Control-Allow-Methods",
	}
	for _, h := range headers {
		if w.Header().Get(h) == "" {
			t.Errorf("missing CORS header %s", h)
		}
	}
}

// --- PrometheusMiddleware Tests ---

func TestPrometheusMiddleware_RecordsMetrics(t *testing.T) {
	r := gin.New()
	r.Use(PrometheusMiddleware())
	r.GET("/api/v1/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req := httptest.NewRequest("GET", "/api/v1/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestPrometheusMiddleware_UnmatchedRoute(t *testing.T) {
	r := gin.New()
	r.Use(PrometheusMiddleware())
	r.GET("/api/v1/test", func(c *gin.Context) { c.Status(200) })

	req := httptest.NewRequest("GET", "/nonexistent", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Should not panic on unmatched route (uses "unmatched" label)
	if w.Code != 404 {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

// --- RequestLogger Tests ---

func TestRequestLogger_SkipsHealthEndpoint(t *testing.T) {
	r := gin.New()
	r.Use(RequestLogger())
	r.GET("/api/v1/health", func(c *gin.Context) { c.Status(200) })

	req := httptest.NewRequest("GET", "/api/v1/health", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Health endpoint should not get X-Request-ID (skipped)
	if got := w.Header().Get("X-Request-ID"); got != "" {
		t.Errorf("expected no X-Request-ID for health, got %q", got)
	}
}

func TestRequestLogger_SkipsMetricsEndpoint(t *testing.T) {
	r := gin.New()
	r.Use(RequestLogger())
	r.GET("/metrics", func(c *gin.Context) { c.Status(200) })

	req := httptest.NewRequest("GET", "/metrics", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if got := w.Header().Get("X-Request-ID"); got != "" {
		t.Errorf("expected no X-Request-ID for metrics, got %q", got)
	}
}

func TestRequestLogger_SetsRequestID(t *testing.T) {
	r := gin.New()
	r.Use(RequestLogger())
	r.GET("/api/v1/tasks", func(c *gin.Context) { c.Status(200) })

	req := httptest.NewRequest("GET", "/api/v1/tasks", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	reqID := w.Header().Get("X-Request-ID")
	if reqID == "" {
		t.Error("expected X-Request-ID header to be set")
	}
	// UUID format: 8-4-4-4-12
	if len(reqID) != 36 {
		t.Errorf("expected UUID format request ID, got %q", reqID)
	}
}

func TestRequestLogger_WithUserID(t *testing.T) {
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("user_id", uint(42))
		c.Next()
	})
	r.Use(RequestLogger())
	r.GET("/api/v1/tasks", func(c *gin.Context) { c.Status(200) })

	req := httptest.NewRequest("GET", "/api/v1/tasks", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

// --- SentryMiddleware Tests ---

func TestSentryMiddleware_DoesNotPanic(t *testing.T) {
	r := gin.New()
	r.Use(SentryMiddleware())
	r.GET("/test", func(c *gin.Context) { c.Status(200) })

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestSetSentryUser_WithoutHub(t *testing.T) {
	r := gin.New()
	r.Use(SetSentryUser())
	r.GET("/test", func(c *gin.Context) { c.Status(200) })

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Should not panic even without Sentry hub
	if w.Code != 200 {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestSetSentryUser_WithUserID(t *testing.T) {
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("user_id", uint(99))
		c.Next()
	})
	r.Use(SetSentryUser())
	r.GET("/test", func(c *gin.Context) { c.Status(200) })

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Errorf("expected 200, got %d", w.Code)
	}
}
