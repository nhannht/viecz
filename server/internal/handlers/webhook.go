package handlers

import (
	"context"
	"fmt"
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
	refRepo         repository.PaymentReferenceRepository
}

// NewWebhookHandler creates a new webhook handler
func NewWebhookHandler(
	payos services.PayOSServicer,
	transactionRepo repository.TransactionRepository,
	taskRepo repository.TaskRepository,
	walletService *services.WalletService,
	refRepo repository.PaymentReferenceRepository,
) *WebhookHandler {
	return &WebhookHandler{
		payos:           payos,
		transactionRepo: transactionRepo,
		taskRepo:        taskRepo,
		walletService:   walletService,
		refRepo:         refRepo,
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

	// PayOS sends a test webhook when confirming the URL in the dashboard.
	// Detect it by checking the data.description field and return 200 immediately.
	if data, ok := webhookData["data"].(map[string]interface{}); ok {
		if desc, ok := data["description"].(string); ok {
			if desc == "Ma giao dich thu nghiem" || desc == "VQRIO123" {
				log.Printf("PayOS test webhook received (description=%q), responding OK", desc)
				c.JSON(http.StatusOK, gin.H{"code": "00", "desc": "success"})
				return
			}
		}
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
				// Extract reference and amount from verified data
				reference, _ := verifiedData["reference"].(string)
				var amount int64
				if amountF, ok := verifiedData["amount"].(float64); ok {
					amount = int64(amountF)
				}

				log.Printf("Payment successful for order %d (ref=%s, amount=%d)", orderCodeInt, reference, amount)
				if err := h.handlePaymentSuccess(c.Request.Context(), orderCodeInt, reference, amount); err != nil {
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
func (h *WebhookHandler) handlePaymentSuccess(ctx context.Context, orderCode int64, reference string, amount int64) error {
	// Deduplicate by PayOS bank transfer reference (not order code).
	// Each QR scan is a separate bank transfer with a unique reference.
	// If the same reference arrives again, it's a webhook retry — skip.
	if reference != "" && h.refRepo != nil {
		ref := &models.PaymentReference{
			OrderCode: orderCode,
			Reference: reference,
			Amount:    amount,
		}
		isNew, err := h.refRepo.CreateIfNotExists(ctx, ref)
		if err != nil {
			return fmt.Errorf("failed to check payment reference: %w", err)
		}
		if !isNew {
			log.Printf("Payment reference %q already processed, skipping (webhook retry)", reference)
			return nil
		}
	}

	// Find transaction by order code
	transaction, err := h.transactionRepo.GetByOrderCode(ctx, orderCode)
	if err != nil {
		return err
	}

	// Determine if this is the first payment or an additional one
	isFirstPayment := transaction.Status != models.TransactionStatusSuccess

	switch transaction.Type {
	case models.TransactionTypeDeposit:
		if isFirstPayment {
			// First payment: mark transaction success and credit wallet
			transaction.Status = models.TransactionStatusSuccess
			now := time.Now()
			transaction.CompletedAt = &now
			if err := h.transactionRepo.Update(ctx, transaction); err != nil {
				return err
			}
			if err := h.walletService.Deposit(ctx, nil, transaction.PayerID, transaction.Amount, transaction.Description); err != nil {
				return err
			}
			// Cancel the payment link so the QR code stops accepting further payments.
			// Best-effort: log but don't fail if cancellation fails.
			if err := h.payos.CancelPaymentLink(ctx, orderCode, "completed"); err != nil {
				log.Printf("Warning: failed to cancel payment link for order %d: %v", orderCode, err)
			}
		} else {
			// Additional payment: user paid the same QR twice. Money is in our bank,
			// so credit their wallet for the actual amount transferred.
			depositAmount := amount
			if depositAmount == 0 {
				depositAmount = transaction.Amount // fallback if amount not in webhook
			}
			desc := fmt.Sprintf("Additional deposit (ref=%s)", reference)
			if err := h.walletService.Deposit(ctx, nil, transaction.PayerID, depositAmount, desc); err != nil {
				return err
			}
			log.Printf("Additional deposit credited: user=%d amount=%d ref=%s order=%d",
				transaction.PayerID, depositAmount, reference, orderCode)
		}

	case models.TransactionTypeEscrow:
		if isFirstPayment {
			// First payment: normal escrow flow
			transaction.Status = models.TransactionStatusSuccess
			now := time.Now()
			transaction.CompletedAt = &now
			if err := h.transactionRepo.Update(ctx, transaction); err != nil {
				return err
			}
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
			if err := h.payos.CancelPaymentLink(ctx, orderCode, "completed"); err != nil {
				log.Printf("Warning: failed to cancel payment link for order %d: %v", orderCode, err)
			}
		} else {
			// Additional escrow payment: can't double-fund a task.
			// Log ALERT for manual refund investigation.
			log.Printf("ALERT: duplicate escrow payment received for order %d (ref=%s, amount=%d). "+
				"Manual refund may be required.", orderCode, reference, amount)
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
