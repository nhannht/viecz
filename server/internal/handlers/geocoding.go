package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// GeocodingHandler proxies geocoding requests to a self-hosted Nominatim instance.
type GeocodingHandler struct {
	nominatimURL string
	client       *http.Client
}

// NewGeocodingHandler creates a handler that proxies to the given Nominatim URL.
func NewGeocodingHandler(nominatimURL string) *GeocodingHandler {
	return &GeocodingHandler{
		nominatimURL: nominatimURL,
		client:       &http.Client{Timeout: 10 * time.Second},
	}
}

// Search proxies a forward geocoding request to Nominatim.
// If the original query returns no results and looks like a full address (contains commas),
// the query is normalized (Vietnamese abbreviations stripped, trimmed to key segments) and retried.
//
// Query params: q (required), limit, language, countrycodes, viewbox, bounded
func (h *GeocodingHandler) Search(c *gin.Context) {
	q := c.Query("q")
	if q == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "q is required"})
		return
	}

	params := h.buildSearchParams(c, q)

	result, err := h.fetchNominatim(h.nominatimURL + "/search?" + params.Encode())
	if err != nil {
		log.Printf("[Geocoding] Failed to proxy to Nominatim: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "Geocoding service unavailable"})
		return
	}

	// If no results and query looks like a pasted full address, retry with normalized query
	if len(result) == 0 && strings.Contains(q, ",") {
		normalized := normalizeVietnameseAddress(q)
		if normalized != "" && normalized != q {
			log.Printf("[Geocoding] No results for %q, retrying with normalized: %q", q, normalized)
			params.Set("q", normalized)
			retryResult, retryErr := h.fetchNominatim(h.nominatimURL + "/search?" + params.Encode())
			if retryErr == nil && len(retryResult) > 0 {
				result = retryResult
			}
		}
	}

	c.Header("Cache-Control", "public, max-age=3600")
	c.JSON(http.StatusOK, result)
}

// buildSearchParams extracts common Nominatim search params from the gin context.
func (h *GeocodingHandler) buildSearchParams(c *gin.Context, q string) url.Values {
	params := url.Values{}
	params.Set("format", "json")
	params.Set("q", q)

	for _, key := range []string{"limit", "countrycodes", "viewbox", "bounded", "addressdetails"} {
		if v := c.Query(key); v != "" {
			params.Set(key, v)
		}
	}
	if v := c.Query("language"); v != "" {
		params.Set("accept-language", v)
	}
	return params
}

// fetchNominatim performs a GET to Nominatim and returns the decoded JSON array.
func (h *GeocodingHandler) fetchNominatim(reqURL string) ([]interface{}, error) {
	resp, err := h.client.Get(reqURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("nominatim returned status %d", resp.StatusCode)
	}

	var result []interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result, nil
}

// Reverse proxies a reverse geocoding request to Nominatim.
//
// Query params: lat (required), lon (required), language
func (h *GeocodingHandler) Reverse(c *gin.Context) {
	lat := c.Query("lat")
	lon := c.Query("lon")
	if lat == "" || lon == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "lat and lon are required"})
		return
	}

	params := url.Values{}
	params.Set("format", "json")
	params.Set("lat", lat)
	params.Set("lon", lon)

	if v := c.Query("language"); v != "" {
		params.Set("accept-language", v)
	}

	h.proxyRequest(c, h.nominatimURL+"/reverse?"+params.Encode())
}

func (h *GeocodingHandler) proxyRequest(c *gin.Context, reqURL string) {
	resp, err := h.client.Get(reqURL)
	if err != nil {
		log.Printf("[Geocoding] Failed to proxy to Nominatim: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "Geocoding service unavailable"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("[Geocoding] Nominatim returned status %d for %s", resp.StatusCode, reqURL)
		c.JSON(http.StatusBadGateway, gin.H{"error": "Geocoding service error"})
		return
	}

	// Decode and re-encode to ensure valid JSON (avoid raw proxy pitfalls)
	var result interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		log.Printf("[Geocoding] Failed to decode Nominatim response: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "Invalid geocoding response"})
		return
	}

	// Cache for 1 hour — geocoding results rarely change
	c.Header("Cache-Control", "public, max-age=3600")
	c.JSON(http.StatusOK, result)
}

// viAbbrevRe matches common Vietnamese address abbreviations like "Đ.", "P.", "Q.", "Tp.", "TX."
// Uses (?:^|\s) instead of \b since Go's regex doesn't support \b with Unicode.
var viAbbrevRe = regexp.MustCompile(`(?i)(?:^|\s)(Đ|P|Q|Tp|TX|TT)\.\s*`)

// normalizeVietnameseAddress cleans a pasted Vietnamese address for better Nominatim matching.
// It strips common abbreviations and trims to the first 2 comma-separated segments.
func normalizeVietnameseAddress(q string) string {
	// Split by commas
	segments := strings.Split(q, ",")

	// Strip "Việt Nam" / "Vietnam" from the last segment
	for i := len(segments) - 1; i >= 0; i-- {
		trimmed := strings.TrimSpace(segments[i])
		lower := strings.ToLower(trimmed)
		if lower == "việt nam" || lower == "vietnam" || lower == "viet nam" {
			segments = segments[:i]
		} else {
			break
		}
	}

	// Take at most the first 3 segments (place name + street + district is usually enough)
	maxSegments := 3
	if len(segments) > maxSegments {
		segments = segments[:maxSegments]
	}

	joined := strings.Join(segments, ", ")

	// Strip Vietnamese abbreviations: "Đ." → "", "P." → "", "Q." → "", "Tp." → "", etc.
	joined = viAbbrevRe.ReplaceAllString(joined, "")

	// Collapse multiple spaces
	joined = strings.Join(strings.Fields(joined), " ")

	return strings.TrimSpace(joined)
}
