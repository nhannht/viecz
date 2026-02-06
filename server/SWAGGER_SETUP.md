# Swagger/OpenAPI Documentation Setup

This guide shows how to add automatic API documentation to your PayOS server (like FastAPI).

## Installation

```bash
# Install swag CLI
go install github.com/swaggo/swag/cmd/swag@latest

# Add dependencies
go get -u github.com/swaggo/gin-swagger
go get -u github.com/swaggo/files
```

## Usage

### 1. Annotate your handlers

```go
// CreatePayment creates a new payment link
// @Summary Create payment link
// @Description Create a PayOS payment link for the specified amount
// @Tags Payment
// @Accept json
// @Produce json
// @Param request body models.PaymentRequest true "Payment request"
// @Success 200 {object} models.PaymentResponse
// @Failure 400 {object} map[string]string
// @Router /api/payment/create [post]
func (h *PaymentHandler) CreatePayment(c *gin.Context) {
    // Your code...
}
```

### 2. Generate docs

```bash
swag init -g cmd/server/main.go -o docs
```

### 3. Access documentation

Start server and visit: http://localhost:8080/swagger/index.html

## Annotation Format

### Summary & Description
```go
// @Summary Short one-line description
// @Description Detailed multi-line description
```

### Request Body
```go
// @Param request body models.PaymentRequest true "Description"
```

### Query Parameters
```go
// @Param id query int true "Payment ID"
// @Param status query string false "Payment status"
```

### Path Parameters
```go
// @Param id path int true "Payment ID"
```

### Responses
```go
// @Success 200 {object} models.PaymentResponse "Success"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 500 {object} map[string]string "Internal error"
```

### Headers
```go
// @Header 200 {string} X-Request-ID "Request ID"
```

### Security (if using auth)
```go
// @Security ApiKeyAuth
// @Security Bearer
```

### Tags (grouping)
```go
// @Tags Payment
// @Tags System
// @Tags Webhook
```

## Example: Complete Handler

```go
// GetPayment retrieves payment details
// @Summary Get payment by ID
// @Description Get payment details including status and checkout URL
// @Tags Payment
// @Accept json
// @Produce json
// @Param id path int true "Payment ID"
// @Success 200 {object} models.PaymentResponse "Payment found"
// @Failure 404 {object} map[string]string "Payment not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /api/payment/{id} [get]
func (h *PaymentHandler) GetPayment(c *gin.Context) {
    id := c.Param("id")
    // Implementation...
}
```

## Regenerate After Changes

Every time you modify annotations:

```bash
swag init -g cmd/server/main.go -o docs
```

Or add to Makefile:

```makefile
# Generate API documentation
docs:
	swag init -g cmd/server/main.go -o docs
	@echo "Documentation generated at /swagger/index.html"
```

Then: `make docs`

## Models Documentation

Add JSON tags and comments to your models:

```go
// PaymentRequest represents a payment creation request
type PaymentRequest struct {
    // Amount in VND
    Amount int `json:"amount" example:"2000"`

    // Payment description
    Description string `json:"description" example:"Payment for order #123"`
}

// PaymentResponse represents the payment creation response
type PaymentResponse struct {
    // Unique order code from PayOS
    OrderCode int64 `json:"orderCode" example:"1770237417875"`

    // PayOS checkout URL
    CheckoutUrl string `json:"checkoutUrl" example:"https://pay.payos.vn/web/abc123"`

    // QR code data
    QrCode string `json:"qrCode"`
}
```

## Advanced: Multiple API Versions

```go
// @title PayOS Payment API v1
// @version 1.0
// @BasePath /api/v1

// @title PayOS Payment API v2
// @version 2.0
// @BasePath /api/v2
```

## CI/CD Integration

Add to your build pipeline:

```bash
# Generate docs before building
swag init -g cmd/server/main.go -o docs
go build -o server cmd/server/main.go
```
