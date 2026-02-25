package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestGeocodingSearch_MissingQuery(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewGeocodingHandler("http://localhost:8085")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/api/v1/geocode/search", nil)

	h.Search(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestGeocodingReverse_MissingParams(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewGeocodingHandler("http://localhost:8085")
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/api/v1/geocode/reverse", nil)

	h.Reverse(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestGeocodingSearch_ProxiesToNominatim(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Mock Nominatim server
	mockNominatim := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/search" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		if r.URL.Query().Get("q") != "test" {
			t.Errorf("expected q=test, got %s", r.URL.Query().Get("q"))
		}
		if r.URL.Query().Get("format") != "json" {
			t.Errorf("expected format=json")
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]map[string]interface{}{
			{"place_id": 1, "display_name": "Test Place", "lat": "10.7769", "lon": "106.7009"},
		})
	}))
	defer mockNominatim.Close()

	h := NewGeocodingHandler(mockNominatim.URL)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/api/v1/geocode/search?q=test&limit=5&countrycodes=VN", nil)

	h.Search(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	// Verify cache header
	if w.Header().Get("Cache-Control") != "public, max-age=3600" {
		t.Errorf("expected cache header, got %s", w.Header().Get("Cache-Control"))
	}
}

func TestGeocodingReverse_ProxiesToNominatim(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockNominatim := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/reverse" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		if r.URL.Query().Get("lat") != "10.7769" {
			t.Errorf("expected lat=10.7769")
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"place_id": 1, "display_name": "Test Place", "lat": "10.7769", "lon": "106.7009",
		})
	}))
	defer mockNominatim.Close()

	h := NewGeocodingHandler(mockNominatim.URL)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/api/v1/geocode/reverse?lat=10.7769&lon=106.7009", nil)

	h.Reverse(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}
