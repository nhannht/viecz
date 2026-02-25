package handlers

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// MapsHandler proxies Google Static Maps API requests through the server
// to leverage Cloudflare edge caching and avoid exposing the server-side API key.
type MapsHandler struct {
	apiKey string
	client *http.Client
}

// NewMapsHandler creates a handler with the given Google Maps server API key
func NewMapsHandler(apiKey string) *MapsHandler {
	return &MapsHandler{
		apiKey: apiKey,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

// GetStaticMap proxies a static map image from Google, setting long cache headers
// so Cloudflare caches the response at the edge.
//
// Query params: lat, lng, zoom (default 15), size (default 600x200)
func (h *MapsHandler) GetStaticMap(c *gin.Context) {
	latStr := c.Query("lat")
	lngStr := c.Query("lng")
	if latStr == "" || lngStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "lat and lng are required"})
		return
	}

	lat, err := strconv.ParseFloat(latStr, 64)
	if err != nil || lat < -90 || lat > 90 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid lat"})
		return
	}

	lng, err := strconv.ParseFloat(lngStr, 64)
	if err != nil || lng < -180 || lng > 180 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid lng"})
		return
	}

	zoom := c.DefaultQuery("zoom", "15")
	z, err := strconv.Atoi(zoom)
	if err != nil || z < 1 || z > 20 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid zoom (1-20)"})
		return
	}

	size := c.DefaultQuery("size", "600x200")

	url := fmt.Sprintf(
		"https://maps.googleapis.com/maps/api/staticmap?center=%f,%f&zoom=%d&size=%s&markers=color:red%%7C%f,%f&key=%s",
		lat, lng, z, size, lat, lng, h.apiKey,
	)

	resp, err := h.client.Get(url)
	if err != nil {
		log.Printf("[Maps] Failed to fetch static map: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to fetch map image"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("[Maps] Google returned status %d", resp.StatusCode)
		c.JSON(http.StatusBadGateway, gin.H{"error": "Google Maps API error"})
		return
	}

	// Set cache headers for Cloudflare edge caching (30 days)
	c.Header("Cache-Control", "public, max-age=2592000")
	c.Header("Content-Type", resp.Header.Get("Content-Type"))

	if _, err := io.Copy(c.Writer, resp.Body); err != nil {
		log.Printf("[Maps] Failed to stream response: %v", err)
	}
}
