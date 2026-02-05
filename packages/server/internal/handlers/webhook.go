package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/services"
)

// WebhookHandler handles PayOS webhook requests
type WebhookHandler struct {
	payos *services.PayOSService
}

// NewWebhookHandler creates a new webhook handler
func NewWebhookHandler(payos *services.PayOSService) *WebhookHandler {
	return &WebhookHandler{
		payos: payos,
	}
}

// HandleWebhook processes webhook notifications from PayOS
func (h *WebhookHandler) HandleWebhook(c *gin.Context) {
	// Parse webhook body
	var webhookData map[string]interface{}
	if err := c.ShouldBindJSON(&webhookData); err != nil {
		log.Printf("Failed to parse webhook body: %v", err)
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_webhook_data",
			Message: "Failed to parse request body",
		})
		return
	}

	// Verify webhook signature
	verifiedData, err := h.payos.VerifyWebhookData(c.Request.Context(), webhookData)
	if err != nil {
		log.Printf("Webhook verification failed: %v", err)
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "verification_failed",
			Message: "Invalid webhook signature",
		})
		return
	}

	// Extract data from verified webhook
	log.Printf("Webhook received and verified: %v", verifiedData)

	// Try to extract order code and status if available
	if data, ok := verifiedData["data"].(map[string]interface{}); ok {
		if orderCode, ok := data["orderCode"].(float64); ok {
			if code, ok := data["code"].(string); ok {
				switch code {
				case "00":
					log.Printf("Payment successful for order %d", int64(orderCode))
				case "01":
					log.Printf("Payment cancelled for order %d", int64(orderCode))
				default:
					log.Printf("Unknown payment status code: %s for order %d", code, int64(orderCode))
				}
			}
		}
	}

	// Respond with success
	c.JSON(http.StatusOK, models.WebhookResponse{
		Success: true,
		Message: "Webhook processed successfully",
	})
}
