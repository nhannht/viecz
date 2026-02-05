package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/services"
)

// PaymentHandler handles payment-related requests
type PaymentHandler struct {
	payos     *services.PayOSService
	clientURL string
}

// NewPaymentHandler creates a new payment handler
func NewPaymentHandler(payos *services.PayOSService, clientURL string) *PaymentHandler {
	return &PaymentHandler{
		payos:     payos,
		clientURL: clientURL,
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
