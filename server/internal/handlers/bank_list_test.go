package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestBankListHandler_GetBanks_ReturnsCachedData(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := NewBankListHandler()
	handler.banks = []VietQRBank{
		{ID: 1, Name: "Test Bank", Code: "TB", Bin: "123456", ShortName: "TestBank", TransferSupported: 1},
		{ID: 2, Name: "Another Bank", Code: "AB", Bin: "789012", ShortName: "AnotherBank", TransferSupported: 1},
	}
	handler.fetchedAt = time.Now()

	router := gin.New()
	router.GET("/banks", handler.GetBanks)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/banks", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200, got %d", w.Code)
	}

	var banks []VietQRBank
	if err := json.Unmarshal(w.Body.Bytes(), &banks); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if len(banks) != 2 {
		t.Fatalf("Expected 2 banks, got %d", len(banks))
	}
	if banks[0].ShortName != "TestBank" {
		t.Errorf("Expected TestBank, got %s", banks[0].ShortName)
	}
}

func TestBankListHandler_CacheNotExpired(t *testing.T) {
	handler := NewBankListHandler()
	handler.banks = []VietQRBank{
		{ID: 1, ShortName: "Cached", Bin: "111"},
	}
	handler.fetchedAt = time.Now().Add(-1 * time.Hour) // 1 hour ago, TTL is 24h

	banks, err := handler.getCachedBanks()
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if len(banks) != 1 || banks[0].ShortName != "Cached" {
		t.Errorf("Expected cached data, got %v", banks)
	}
}

func TestBankListHandler_FetchFromVietQR(t *testing.T) {
	// This test hits the real VietQR API
	handler := NewBankListHandler()

	banks, err := handler.getCachedBanks()
	if err != nil {
		t.Fatalf("Failed to fetch from VietQR: %v", err)
	}

	if len(banks) == 0 {
		t.Fatal("Expected non-empty bank list from VietQR")
	}

	// All returned banks should have transferSupported == 1
	for _, b := range banks {
		if b.TransferSupported != 1 {
			t.Errorf("Bank %s has transferSupported=%d, expected 1", b.ShortName, b.TransferSupported)
		}
	}

	// Second call should return cached data (same pointer)
	banks2, err := handler.getCachedBanks()
	if err != nil {
		t.Fatalf("Second call failed: %v", err)
	}
	if len(banks2) != len(banks) {
		t.Errorf("Cache mismatch: first=%d, second=%d", len(banks), len(banks2))
	}
}

func TestNewBankListHandler_Defaults(t *testing.T) {
	handler := NewBankListHandler()
	if handler.cacheTTL != 24*time.Hour {
		t.Errorf("Expected 24h TTL, got %v", handler.cacheTTL)
	}
	if len(handler.banks) != 0 {
		t.Errorf("Expected empty initial cache, got %d banks", len(handler.banks))
	}
}
