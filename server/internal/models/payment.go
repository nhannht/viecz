package models

// CreatePaymentRequest represents the request body for creating a payment
type CreatePaymentRequest struct {
	Amount      int    `json:"amount" binding:"required,min=1"`
	Description string `json:"description" binding:"required"`
}

// CreatePaymentResponse represents the response for a payment creation
type CreatePaymentResponse struct {
	OrderCode   int    `json:"orderCode"`
	CheckoutURL string `json:"checkoutUrl"`
	QRCode      string `json:"qrCode"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

// HealthResponse represents health check response
type HealthResponse struct {
	Status string `json:"status"`
}

// WebhookResponse represents webhook confirmation response
type WebhookResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// PaymentStatus represents possible payment statuses
type PaymentStatus string

const (
	PaymentStatusPending   PaymentStatus = "PENDING"
	PaymentStatusPaid      PaymentStatus = "PAID"
	PaymentStatusCancelled PaymentStatus = "CANCELLED"
	PaymentStatusExpired   PaymentStatus = "EXPIRED"
)
