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
	payos           services.PayOSServicer
	transactionRepo repository.TransactionRepository
	taskRepo        repository.TaskRepository
	walletService   *services.WalletService
}

// NewWebhookHandler creates a new webhook handler
func NewWebhookHandler(
	payos services.PayOSServicer,
	transactionRepo repository.TransactionRepository,
	taskRepo repository.TaskRepository,
	walletService *services.WalletService,
) *WebhookHandler {
	return &WebhookHandler{
		payos:           payos,
		transactionRepo: transactionRepo,
		taskRepo:        taskRepo,
		walletService:   walletService,
	}
}

// HandleWebhook processes webhook notifications from PayOS
// PayOS sends: {"code":"00","desc":"success","success":true,"data":{...},"signature":"..."}
// SDK VerifyData returns the inner "data" object directly after signature verification
func (h *WebhookHandler) HandleWebhook(c *gin.Context) {
	// Parse webhook body
	var webhookData map[string]interface{}
	if err := c.ShouldBindJSON(&webhookData); err != nil {
		log.Printf("Failed to parse webhook body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"code": "01",
			"desc": "Failed to parse request body",
		})
		return
	}

	// Verify webhook signature — returns the inner "data" object
	verifiedData, err := h.payos.VerifyWebhookData(c.Request.Context(), webhookData)
	if err != nil {
		log.Printf("Webhook verification failed: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{
			"code": "01",
			"desc": "Invalid webhook signature",
		})
		return
	}

	log.Printf("Webhook received and verified: %v", verifiedData)

	// Extract orderCode and code directly from verified data
	// (VerifyData returns the inner "data" object, not the wrapper)
	if orderCode, ok := verifiedData["orderCode"].(float64); ok {
		orderCodeInt := int64(orderCode)
		if code, ok := verifiedData["code"].(string); ok {
			switch code {
			case "00":
				log.Printf("Payment successful for order %d", orderCodeInt)
				if err := h.handlePaymentSuccess(c.Request.Context(), orderCodeInt); err != nil {
					log.Printf("Failed to handle payment success: %v", err)
				}
			case "01":
				log.Printf("Payment cancelled for order %d", orderCodeInt)
				if err := h.handlePaymentCancelled(c.Request.Context(), orderCodeInt); err != nil {
					log.Printf("Failed to handle payment cancellation: %v", err)
				}
			default:
				log.Printf("Unknown payment status code: %s for order %d", code, orderCodeInt)
			}
		}
	}

	// Respond with PayOS expected format
	c.JSON(http.StatusOK, gin.H{
		"code": "00",
		"desc": "success",
	})
}

// ConfirmWebhook registers the webhook URL with PayOS
func (h *WebhookHandler) ConfirmWebhook(c *gin.Context) {
	var req struct {
		WebhookURL string `json:"webhook_url" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_request",
			Message: err.Error(),
		})
		return
	}

	confirmedURL, err := h.payos.ConfirmWebhook(c.Request.Context(), req.WebhookURL)
	if err != nil {
		log.Printf("Failed to confirm webhook: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "confirm_failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Webhook URL confirmed",
		"webhook_url": confirmedURL,
	})
}

// handlePaymentSuccess handles successful payment webhook
func (h *WebhookHandler) handlePaymentSuccess(ctx context.Context, orderCode int64) error {
	// Find transaction by order code
	transaction, err := h.transactionRepo.GetByOrderCode(ctx, orderCode)
	if err != nil {
		return err
	}

	// Guard: skip if already processed (prevents double-crediting on webhook retry)
	if transaction.Status == models.TransactionStatusSuccess {
		log.Printf("Transaction %d already successful, skipping", transaction.ID)
		return nil
	}

	// Update transaction status
	transaction.Status = models.TransactionStatusSuccess
	now := time.Now()
	transaction.CompletedAt = &now

	if err := h.transactionRepo.Update(ctx, transaction); err != nil {
		return err
	}

	switch transaction.Type {
	case models.TransactionTypeDeposit:
		// Credit the user's wallet
		if err := h.walletService.Deposit(ctx, transaction.PayerID, transaction.Amount, transaction.Description); err != nil {
			return err
		}

	case models.TransactionTypeEscrow:
		// Update task status to in_progress
		if transaction.TaskID != nil {
			task, err := h.taskRepo.GetByID(ctx, *transaction.TaskID)
			if err != nil {
				return err
			}

			task.Status = models.TaskStatusInProgress
			if err := h.taskRepo.Update(ctx, task); err != nil {
				return err
			}
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
