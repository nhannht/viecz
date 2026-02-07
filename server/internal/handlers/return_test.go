package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestReturnHandler_HandleReturn(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name               string
		queryParams        map[string]string
		expectedStatusCode int
		expectedRedirect   string
	}{
		{
			name: "cancelled payment - code 01",
			queryParams: map[string]string{
				"code":      "01",
				"orderCode": "12347",
			},
			expectedStatusCode: http.StatusFound,
			expectedRedirect:   "viecz://payment/cancelled?orderCode=12347",
		},
		{
			name: "cancelled payment - cancel=true",
			queryParams: map[string]string{
				"cancel":    "true",
				"orderCode": "12348",
			},
			expectedStatusCode: http.StatusFound,
			expectedRedirect:   "viecz://payment/cancelled?orderCode=12348",
		},
		{
			name: "unknown status code",
			queryParams: map[string]string{
				"code":      "99",
				"orderCode": "12349",
			},
			expectedStatusCode: http.StatusFound,
			expectedRedirect:   "viecz://payment/error?code=99&orderCode=12349",
		},
		{
			name: "pending payment - code 02",
			queryParams: map[string]string{
				"code":      "02",
				"orderCode": "12350",
				"status":    "PENDING",
			},
			expectedStatusCode: http.StatusFound,
			expectedRedirect:   "viecz://payment/error?code=02&orderCode=12350",
		},
		{
			name: "cancel takes precedence over success code",
			queryParams: map[string]string{
				"code":      "00", // Success code
				"cancel":    "true",
				"orderCode": "12351",
			},
			expectedStatusCode: http.StatusFound,
			expectedRedirect:   "viecz://payment/cancelled?orderCode=12351",
		},
		{
			name: "cancelled with multiple params",
			queryParams: map[string]string{
				"cancel":    "true",
				"orderCode": "12352",
				"id":        "some-id",
				"status":    "CANCELLED",
			},
			expectedStatusCode: http.StatusFound,
			expectedRedirect:   "viecz://payment/cancelled?orderCode=12352",
		},
		{
			name: "failed payment - code 03",
			queryParams: map[string]string{
				"code":      "03",
				"orderCode": "12353",
			},
			expectedStatusCode: http.StatusFound,
			expectedRedirect:   "viecz://payment/error?code=03&orderCode=12353",
		},
		{
			name: "empty order code with cancel",
			queryParams: map[string]string{
				"cancel":    "true",
				"orderCode": "",
			},
			expectedStatusCode: http.StatusFound,
			expectedRedirect:   "viecz://payment/cancelled?orderCode=",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create handler with nil PayOS (tests that don't need it)
			handler := NewReturnHandler(nil, "http://localhost:3000")

			// Create test request with query params
			url := "/return"
			if len(tt.queryParams) > 0 {
				url += "?"
				first := true
				for k, v := range tt.queryParams {
					if !first {
						url += "&"
					}
					url += k + "=" + v
					first = false
				}
			}

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodGet, url, nil)

			// Execute handler
			handler.HandleReturn(c)

			// Verify redirect status code
			if w.Code != tt.expectedStatusCode {
				t.Errorf("Expected status %d, got %d", tt.expectedStatusCode, w.Code)
			}

			// Verify redirect location
			location := w.Header().Get("Location")
			if location != tt.expectedRedirect {
				t.Errorf("Expected redirect to '%s', got '%s'", tt.expectedRedirect, location)
			}
		})
	}
}

// Note: Tests for code "00" (successful payment) require PayOS service integration
// and are skipped here due to the concrete type limitation. These paths are covered
// by integration tests or manual testing with real PayOS API.
