package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"net/url"
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
//
// Query params: q (required), limit, language, countrycodes, viewbox, bounded
func (h *GeocodingHandler) Search(c *gin.Context) {
	q := c.Query("q")
	if q == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "q is required"})
		return
	}

	params := url.Values{}
	params.Set("format", "json")
	params.Set("q", q)

	if v := c.Query("limit"); v != "" {
		params.Set("limit", v)
	}
	if v := c.Query("language"); v != "" {
		params.Set("accept-language", v)
	}
	if v := c.Query("countrycodes"); v != "" {
		params.Set("countrycodes", v)
	}
	if v := c.Query("viewbox"); v != "" {
		params.Set("viewbox", v)
	}
	if v := c.Query("bounded"); v != "" {
		params.Set("bounded", v)
	}
	if v := c.Query("addressdetails"); v != "" {
		params.Set("addressdetails", v)
	}

	h.proxyRequest(c, h.nominatimURL+"/search?"+params.Encode())
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
