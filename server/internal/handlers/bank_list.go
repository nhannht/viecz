package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// VietQRBank represents a bank from VietQR API
type VietQRBank struct {
	ID                int    `json:"id"`
	Name              string `json:"name"`
	Code              string `json:"code"`
	Bin               string `json:"bin"`
	ShortName         string `json:"shortName"`
	Logo              string `json:"logo"`
	TransferSupported int    `json:"transferSupported"`
	LookupSupported   int    `json:"lookupSupported"`
}

type vietQRResponse struct {
	Code string       `json:"code"`
	Desc string       `json:"desc"`
	Data []VietQRBank `json:"data"`
}

// BankListHandler serves the cached VietQR bank list
type BankListHandler struct {
	mu        sync.RWMutex
	banks     []VietQRBank
	fetchedAt time.Time
	cacheTTL  time.Duration
}

// NewBankListHandler creates a handler with 24h cache TTL
func NewBankListHandler() *BankListHandler {
	return &BankListHandler{
		cacheTTL: 24 * time.Hour,
	}
}

// GetBanks returns the list of Vietnamese banks with transfer support
func (h *BankListHandler) GetBanks(c *gin.Context) {
	banks, err := h.getCachedBanks()
	if err != nil {
		log.Printf("[BankList] Failed to fetch banks: %v", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Failed to fetch bank list"})
		return
	}
	c.JSON(http.StatusOK, banks)
}

func (h *BankListHandler) getCachedBanks() ([]VietQRBank, error) {
	h.mu.RLock()
	if len(h.banks) > 0 && time.Since(h.fetchedAt) < h.cacheTTL {
		banks := h.banks
		h.mu.RUnlock()
		return banks, nil
	}
	h.mu.RUnlock()

	h.mu.Lock()
	defer h.mu.Unlock()

	// Double-check after acquiring write lock
	if len(h.banks) > 0 && time.Since(h.fetchedAt) < h.cacheTTL {
		return h.banks, nil
	}

	banks, err := fetchVietQRBanks()
	if err != nil {
		// If we have stale data, return it rather than error
		if len(h.banks) > 0 {
			log.Printf("[BankList] Using stale cache after fetch error: %v", err)
			return h.banks, nil
		}
		return nil, err
	}

	h.banks = banks
	h.fetchedAt = time.Now()
	log.Printf("[BankList] Cached %d banks from VietQR", len(banks))
	return banks, nil
}

func fetchVietQRBanks() ([]VietQRBank, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get("https://api.vietqr.io/v2/banks")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result vietQRResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	// Filter to banks that support transfers
	var banks []VietQRBank
	for _, b := range result.Data {
		if b.TransferSupported == 1 {
			banks = append(banks, b)
		}
	}
	return banks, nil
}
