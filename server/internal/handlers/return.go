package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/services"
)

// ReturnHandler handles payment return URL redirects
type ReturnHandler struct {
	payos     *services.PayOSService
	clientURL string
}

// NewReturnHandler creates a new return handler
func NewReturnHandler(payos *services.PayOSService, clientURL string) *ReturnHandler {
	return &ReturnHandler{
		payos:     payos,
		clientURL: clientURL,
	}
}

// HandleReturn processes the return from PayOS and redirects to client
func (h *ReturnHandler) HandleReturn(c *gin.Context) {
	// Get query parameters from PayOS
	code := c.Query("code")
	id := c.Query("id")
	cancel := c.Query("cancel")
	status := c.Query("status")
	orderCode := c.Query("orderCode")

	log.Printf("Payment return - Code: %s, ID: %s, Cancel: %s, Status: %s, OrderCode: %s",
		code, id, cancel, status, orderCode)

	// Determine redirect URL based on payment status
	var redirectURL string

	// If cancel=true, payment was cancelled
	if cancel == "true" {
		redirectURL = fmt.Sprintf("viecz://payment/cancelled?orderCode=%s", orderCode)
		c.Redirect(http.StatusFound, redirectURL)
		return
	}

	// Check payment status code
	switch code {
	case "00":
		// Payment successful
		orderCodeInt, _ := strconv.ParseInt(orderCode, 10, 64)

		// Optionally verify payment status with PayOS
		paymentInfo, err := h.payos.GetPaymentInfo(c.Request.Context(), orderCodeInt)
		if err != nil {
			log.Printf("Failed to verify payment info: %v", err)
			redirectURL = fmt.Sprintf("viecz://payment/error?code=verification_failed&orderCode=%s", orderCode)
		} else {
			log.Printf("Payment verified - Status: %s, Amount: %d", string(paymentInfo.Status), paymentInfo.Amount)
			redirectURL = fmt.Sprintf("viecz://payment/success?orderCode=%s&amount=%d&status=%s",
				orderCode, paymentInfo.Amount, string(paymentInfo.Status))
		}

	case "01":
		// Payment cancelled
		redirectURL = fmt.Sprintf("viecz://payment/cancelled?orderCode=%s", orderCode)

	default:
		// Unknown status or error
		redirectURL = fmt.Sprintf("viecz://payment/error?code=%s&orderCode=%s", code, orderCode)
	}

	// Redirect to client app using deep link
	c.Redirect(http.StatusFound, redirectURL)
}
