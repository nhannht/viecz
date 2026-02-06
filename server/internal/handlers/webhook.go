package handlers

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
	"viecz.vieczserver/internal/services"
)

// WebhookHandler handles PayOS webhook requests
type WebhookHandler struct {
	payos           *services.PayOSService
	transactionRepo repository.TransactionRepository
	taskRepo        repository.TaskRepository
}

// NewWebhookHandler creates a new webhook handler
func NewWebhookHandler(
	payos *services.PayOSService,
	transactionRepo repository.TransactionRepository,
	taskRepo repository.TaskRepository,
) *WebhookHandler {
	return &WebhookHandler{
		payos:           payos,
		transactionRepo: transactionRepo,
		taskRepo:        taskRepo,
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
			orderCodeInt := int64(orderCode)
			if code, ok := data["code"].(string); ok {
				switch code {
				case "00":
					log.Printf("Payment successful for order %d", orderCodeInt)
					// Update transaction status to success
					if err := h.handlePaymentSuccess(c.Request.Context(), orderCodeInt); err != nil {
						log.Printf("Failed to handle payment success: %v", err)
					}
				case "01":
					log.Printf("Payment cancelled for order %d", orderCodeInt)
					// Update transaction status to cancelled
					if err := h.handlePaymentCancelled(c.Request.Context(), orderCodeInt); err != nil {
						log.Printf("Failed to handle payment cancellation: %v", err)
					}
				default:
					log.Printf("Unknown payment status code: %s for order %d", code, orderCodeInt)
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

// handlePaymentSuccess handles successful payment webhook
func (h *WebhookHandler) handlePaymentSuccess(ctx context.Context, orderCode int64) error {
	// Find transaction by order code
	transaction, err := h.transactionRepo.GetByOrderCode(ctx, orderCode)
	if err != nil {
		return err
	}

	// Update transaction status
	transaction.Status = models.TransactionStatusSuccess
	now := time.Now()
	transaction.CompletedAt = &now

	if err := h.transactionRepo.Update(ctx, transaction); err != nil {
		return err
	}

	// If this is an escrow transaction, update task status to in_progress
	if transaction.Type == models.TransactionTypeEscrow && transaction.TaskID != nil {
		task, err := h.taskRepo.GetByID(ctx, *transaction.TaskID)
		if err != nil {
			return err
		}

		task.Status = models.TaskStatusInProgress
		if err := h.taskRepo.Update(ctx, task); err != nil {
			return err
		}
	}

	return nil
}

// handlePaymentCancelled handles cancelled payment webhook
func (h *WebhookHandler) handlePaymentCancelled(ctx context.Context, orderCode int64) error {
	// Find transaction by order code
	transaction, err := h.transactionRepo.GetByOrderCode(ctx, orderCode)
	if err != nil {
		return err
	}

	// Update transaction status
	transaction.Status = models.TransactionStatusCancelled
	if err := h.transactionRepo.Update(ctx, transaction); err != nil {
		return err
	}

	return nil
}
