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

func TestNormalizeVietnameseAddress(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "full address with abbreviations",
			input:    "KTX KHU B, Đ. Mạc Đĩnh Chi, Khu phố Tân Hòa, Dĩ An, Bình Dương, Việt Nam",
			expected: "KTX KHU B, Mạc Đĩnh Chi, Khu phố Tân Hòa",
		},
		{
			name:     "address with P. and Q. abbreviations",
			input:    "123 Nguyễn Huệ, P. Bến Nghé, Q. 1, Tp. Hồ Chí Minh, Việt Nam",
			expected: "123 Nguyễn Huệ, Bến Nghé, 1",
		},
		{
			name:     "short query without commas unchanged",
			input:    "KTX khu B",
			expected: "KTX khu B",
		},
		{
			name:     "strips Vietnam suffix case-insensitive",
			input:    "Some Place, Hà Nội, Vietnam",
			expected: "Some Place, Hà Nội",
		},
		{
			name:     "two segments kept as-is",
			input:    "KTX KHU B, Mạc Đĩnh Chi",
			expected: "KTX KHU B, Mạc Đĩnh Chi",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := normalizeVietnameseAddress(tt.input)
			if got != tt.expected {
				t.Errorf("normalizeVietnameseAddress(%q)\n  got:  %q\n  want: %q", tt.input, got, tt.expected)
			}
		})
	}
}

func TestGeocodingSearch_FallbackOnEmptyResult(t *testing.T) {
	gin.SetMode(gin.TestMode)

	requestCount := 0
	// Mock Nominatim: returns empty for first request (full address), results for second (normalized)
	mockNominatim := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		q := r.URL.Query().Get("q")
		w.Header().Set("Content-Type", "application/json")

		if requestCount == 1 {
			// First request: full address → empty
			json.NewEncoder(w).Encode([]map[string]interface{}{})
		} else {
			// Second request: normalized → results
			json.NewEncoder(w).Encode([]map[string]interface{}{
				{"place_id": 1, "display_name": "KTX Khu B", "lat": "10.88", "lon": "106.78"},
			})
			_ = q
		}
	}))
	defer mockNominatim.Close()

	h := NewGeocodingHandler(mockNominatim.URL)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET",
		"/api/v1/geocode/search?q=KTX+KHU+B,+Đ.+Mạc+Đĩnh+Chi,+Khu+phố+Tân+Hòa,+Dĩ+An,+Bình+Dương,+Việt+Nam&limit=5&countrycodes=vn",
		nil)

	h.Search(c)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	if requestCount != 2 {
		t.Errorf("expected 2 Nominatim requests (original + retry), got %d", requestCount)
	}

	// Verify we got the retry result
	var results []map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &results)
	if len(results) != 1 {
		t.Errorf("expected 1 result from retry, got %d", len(results))
	}
}

func TestGeocodingSearch_NoFallbackWhenResultsExist(t *testing.T) {
	gin.SetMode(gin.TestMode)

	requestCount := 0
	mockNominatim := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		w.Header().Set("Content-Type", "application/json")
		// Always return results
		json.NewEncoder(w).Encode([]map[string]interface{}{
			{"place_id": 1, "display_name": "Some Place"},
		})
	}))
	defer mockNominatim.Close()

	h := NewGeocodingHandler(mockNominatim.URL)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET",
		"/api/v1/geocode/search?q=KTX+KHU+B,+Đ.+Mạc+Đĩnh+Chi,+Việt+Nam&limit=5",
		nil)

	h.Search(c)

	if requestCount != 1 {
		t.Errorf("expected only 1 Nominatim request (no retry needed), got %d", requestCount)
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
