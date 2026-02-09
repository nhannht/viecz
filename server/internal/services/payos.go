package services

import (
	"context"
	"fmt"

	"github.com/payOSHQ/payos-lib-golang/v2"
)

// PayOSServicer defines the interface for PayOS operations used by handlers.
// Methods returning SDK-specific types (GetPaymentInfo, CancelPaymentLink)
// stay on the concrete struct only.
type PayOSServicer interface {
	CreatePaymentLink(ctx context.Context, orderCode int64, amount int, description, returnURL, cancelURL string) (*PaymentLinkResponse, error)
	VerifyWebhookData(ctx context.Context, webhookData map[string]interface{}) (map[string]interface{}, error)
	ConfirmWebhook(ctx context.Context, webhookURL string) (string, error)
}

// Verify interface compliance
var _ PayOSServicer = (*PayOSService)(nil)

// PayOSService wraps the PayOS SDK client
type PayOSService struct {
	client *payos.PayOS
}

// PaymentLinkResponse represents the response from creating a payment link
type PaymentLinkResponse struct {
	CheckoutUrl     string
	QrCode          string
	PaymentLinkId   string
	OrderCode       int64
	Amount          int
	Status          string
	AccountNumber   string
	AccountName     string
}

// NewPayOSService creates a new PayOS service instance
func NewPayOSService(clientID, apiKey, checksumKey string) (*PayOSService, error) {
	client, err := payos.NewPayOS(&payos.PayOSOptions{
		ClientId:    clientID,
		ApiKey:      apiKey,
		ChecksumKey: checksumKey,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to initialize PayOS client: %w", err)
	}

	return &PayOSService{
		client: client,
	}, nil
}

// CreatePaymentLink creates a payment link with PayOS
func (s *PayOSService) CreatePaymentLink(ctx context.Context, orderCode int64, amount int, description string, returnURL, cancelURL string) (*PaymentLinkResponse, error) {
	// Create payment link request
	request := payos.CreatePaymentLinkRequest{
		OrderCode:   orderCode,
		Amount:      amount,
		Description: description,
		ReturnUrl:   returnURL,
		CancelUrl:   cancelURL,
	}

	// Create payment link (pass by value, not pointer)
	result, err := s.client.PaymentRequests.Create(ctx, request)
	if err != nil {
		return nil, fmt.Errorf("failed to create payment link: %w", err)
	}

	return &PaymentLinkResponse{
		CheckoutUrl:   result.CheckoutUrl,
		QrCode:        result.QrCode,
		PaymentLinkId: result.PaymentLinkId,
		OrderCode:     result.OrderCode,
		Amount:        result.Amount,
		Status:        string(result.Status),
		AccountNumber: result.AccountNumber,
		AccountName:   result.AccountName,
	}, nil
}

// VerifyWebhookData verifies the webhook signature
func (s *PayOSService) VerifyWebhookData(ctx context.Context, webhookData map[string]interface{}) (map[string]interface{}, error) {
	verifiedData, err := s.client.Webhooks.VerifyData(ctx, webhookData)
	if err != nil {
		return nil, fmt.Errorf("webhook verification failed: %w", err)
	}

	// Type assert the result
	result, ok := verifiedData.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("unexpected webhook data format")
	}

	return result, nil
}

// ConfirmWebhook registers/confirms the webhook URL with PayOS
func (s *PayOSService) ConfirmWebhook(ctx context.Context, webhookURL string) (string, error) {
	confirmedURL, err := s.client.Webhooks.Confirm(ctx, webhookURL)
	if err != nil {
		return "", fmt.Errorf("failed to confirm webhook URL: %w", err)
	}
	return confirmedURL, nil
}

// GetPaymentInfo retrieves payment information by order code
func (s *PayOSService) GetPaymentInfo(ctx context.Context, orderCode int64) (*payos.PaymentLink, error) {
	result, err := s.client.PaymentRequests.Get(ctx, orderCode)
	if err != nil {
		return nil, fmt.Errorf("failed to get payment info: %w", err)
	}

	return result, nil
}

// CancelPaymentLink cancels a payment link
func (s *PayOSService) CancelPaymentLink(ctx context.Context, orderCode int64, reason string) (*payos.PaymentLink, error) {
	result, err := s.client.PaymentRequests.Cancel(ctx, orderCode, &reason)
	if err != nil {
		return nil, fmt.Errorf("failed to cancel payment link: %w", err)
	}

	return result, nil
}
