package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/services"
)

// PaymentHandler handles payment-related requests
type PaymentHandler struct {
	payos          *services.PayOSService
	paymentService *services.PaymentService
	clientURL      string
}

// NewPaymentHandler creates a new payment handler
func NewPaymentHandler(payos *services.PayOSService, paymentService *services.PaymentService, clientURL string) *PaymentHandler {
	return &PaymentHandler{
		payos:          payos,
		paymentService: paymentService,
		clientURL:      clientURL,
	}
}

// CreatePayment handles payment link creation
func (h *PaymentHandler) CreatePayment(c *gin.Context) {
	var req models.CreatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_request",
			Message: err.Error(),
		})
		return
	}

	// Generate unique order code using timestamp in milliseconds
	orderCode := time.Now().UnixNano() / int64(time.Millisecond)

	// Build return and cancel URLs - these are server URLs that will redirect to the app
	returnURL := fmt.Sprintf("http://localhost:8080/api/payment/return")
	cancelURL := fmt.Sprintf("http://localhost:8080/api/payment/return")

	// Create payment link
	result, err := h.payos.CreatePaymentLink(
		c.Request.Context(),
		orderCode,
		req.Amount,
		req.Description,
		returnURL,
		cancelURL,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "payment_creation_failed",
			Message: err.Error(),
		})
		return
	}

	// Return response
	c.JSON(http.StatusOK, models.CreatePaymentResponse{
		OrderCode:   int(result.OrderCode),
		CheckoutURL: result.CheckoutUrl,
		QRCode:      result.QrCode,
	})
}

// Health returns server health status
func (h *PaymentHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, models.HealthResponse{
		Status: "ok",
	})
}

// CreateEscrowPaymentRequest represents request to create escrow payment
type CreateEscrowPaymentRequest struct {
	TaskID int64 `json:"task_id" binding:"required"`
}

// CreateEscrowPaymentResponse represents escrow payment response
type CreateEscrowPaymentResponse struct {
	Transaction *models.Transaction `json:"transaction"`
	CheckoutURL string              `json:"checkout_url,omitempty"`
}

// CreateEscrowPayment creates an escrow payment for a task
func (h *PaymentHandler) CreateEscrowPayment(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	var req CreateEscrowPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_request",
			Message: err.Error(),
		})
		return
	}

	transaction, checkoutURL, err := h.paymentService.CreateEscrowPayment(
		c.Request.Context(),
		req.TaskID,
		userID.(int64),
	)
	if err != nil {
		log.Printf("Failed to create escrow payment: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "payment_failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, CreateEscrowPaymentResponse{
		Transaction: transaction,
		CheckoutURL: checkoutURL,
	})
}

// ReleasePaymentRequest represents request to release payment
type ReleasePaymentRequest struct {
	TaskID int64 `json:"task_id" binding:"required"`
}

// ReleasePayment releases escrowed funds to tasker when task is completed
func (h *PaymentHandler) ReleasePayment(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	var req ReleasePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_request",
			Message: err.Error(),
		})
		return
	}

	if err := h.paymentService.ReleasePayment(
		c.Request.Context(),
		req.TaskID,
		userID.(int64),
	); err != nil {
		log.Printf("Failed to release payment: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "release_failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Payment released successfully",
	})
}

// RefundPaymentRequest represents request to refund payment
type RefundPaymentRequest struct {
	TaskID int64  `json:"task_id" binding:"required"`
	Reason string `json:"reason" binding:"required"`
}

// RefundPayment refunds escrowed funds to requester when task is cancelled
func (h *PaymentHandler) RefundPayment(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	var req RefundPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_request",
			Message: err.Error(),
		})
		return
	}

	if err := h.paymentService.RefundPayment(
		c.Request.Context(),
		req.TaskID,
		userID.(int64),
		req.Reason,
	); err != nil {
		log.Printf("Failed to refund payment: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "refund_failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Payment refunded successfully",
	})
}

// GetTransactionsByTask retrieves all transactions for a task
func (h *PaymentHandler) GetTransactionsByTask(c *gin.Context) {
	taskIDStr := c.Param("task_id")
	taskID, err := strconv.ParseInt(taskIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_task_id",
			Message: "Task ID must be a valid number",
		})
		return
	}

	transactions, err := h.paymentService.GetTransactionsByTask(c.Request.Context(), taskID)
	if err != nil {
		log.Printf("Failed to get transactions: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "fetch_failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, transactions)
}
