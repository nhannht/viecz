package services

import (
	"context"
	"fmt"
	"time"

	"github.com/payOSHQ/payos-lib-golang/v2"
)

// PayoutResponse represents the response from creating a payout
type PayoutResponse struct {
	ID            string
	ReferenceID   string
	ApprovalState string
}

// PayoutStatusResponse represents the response from checking payout status
type PayoutStatusResponse struct {
	ID           string
	State        string
	ErrorMessage string
}

// PayOSServicer defines the interface for PayOS operations used by handlers.
// Methods returning SDK-specific types (GetPaymentInfo)
// stay on the concrete struct only.
type PayOSServicer interface {
	CreatePaymentLink(ctx context.Context, orderCode int64, amount int, description, returnURL, cancelURL string) (*PaymentLinkResponse, error)
	VerifyWebhookData(ctx context.Context, webhookData map[string]interface{}) (map[string]interface{}, error)
	ConfirmWebhook(ctx context.Context, webhookURL string) (string, error)
	CancelPaymentLink(ctx context.Context, orderCode int64, reason string) error
	CreatePayout(ctx context.Context, referenceID string, amount int, description, toBin, toAccountNumber string) (*PayoutResponse, error)
	GetPayout(ctx context.Context, payoutID string) (*PayoutStatusResponse, error)
}

// Verify interface compliance
var _ PayOSServicer = (*PayOSService)(nil)

// PayOSService wraps the PayOS SDK clients.
// client is used for deposits (payment links, webhooks).
// payoutClient is used for disbursements (payouts).
type PayOSService struct {
	client       *payos.PayOS // deposit channel
	payoutClient *payos.PayOS // payout channel (nil if not configured)
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

// NewPayOSService creates a new PayOS service instance with separate deposit and payout clients.
// payoutClientID/payoutAPIKey/payoutChecksumKey are optional — if empty, payout methods return an error.
func NewPayOSService(clientID, apiKey, checksumKey, payoutClientID, payoutAPIKey, payoutChecksumKey string) (*PayOSService, error) {
	client, err := payos.NewPayOS(&payos.PayOSOptions{
		ClientId:    clientID,
		ApiKey:      apiKey,
		ChecksumKey: checksumKey,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to initialize PayOS deposit client: %w", err)
	}

	svc := &PayOSService{
		client: client,
	}

	// Initialize payout client only if credentials are provided
	if payoutClientID != "" && payoutAPIKey != "" && payoutChecksumKey != "" {
		payoutClient, err := payos.NewPayOS(&payos.PayOSOptions{
			ClientId:    payoutClientID,
			ApiKey:      payoutAPIKey,
			ChecksumKey: payoutChecksumKey,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to initialize PayOS payout client: %w", err)
		}
		svc.payoutClient = payoutClient
	}

	return svc, nil
}

// CreatePaymentLink creates a payment link with PayOS
func (s *PayOSService) CreatePaymentLink(ctx context.Context, orderCode int64, amount int, description string, returnURL, cancelURL string) (*PaymentLinkResponse, error) {
	if s.client == nil || s.client.PaymentRequests == nil {
		return nil, fmt.Errorf("PayOS client not configured (missing API credentials)")
	}

	// Expire the payment link after 5 minutes to prevent duplicate payments
	// on the same QR code. PayOS won't let us cancel a paid order, so short
	// expiry is the only way to limit the window.
	expiredAt := int(time.Now().Add(5 * time.Minute).Unix())

	// Create payment link request
	request := payos.CreatePaymentLinkRequest{
		OrderCode:   orderCode,
		Amount:      amount,
		Description: description,
		ReturnUrl:   returnURL,
		CancelUrl:   cancelURL,
		ExpiredAt:   &expiredAt,
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

// CreatePayout creates a payout via PayOS using the dedicated payout client
func (s *PayOSService) CreatePayout(ctx context.Context, referenceID string, amount int, description, toBin, toAccountNumber string) (*PayoutResponse, error) {
	if s.payoutClient == nil || s.payoutClient.Payouts == nil {
		return nil, fmt.Errorf("PayOS payout client not configured (set PAYOS_PAYOUT_CLIENT_ID, PAYOS_PAYOUT_API_KEY, PAYOS_PAYOUT_CHECKSUM_KEY)")
	}

	request := payos.PayoutRequest{
		ReferenceId:     referenceID,
		Amount:          amount,
		Description:     description,
		ToBin:           toBin,
		ToAccountNumber: toAccountNumber,
	}

	result, err := s.payoutClient.Payouts.Create(ctx, request, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create payout: %w", err)
	}

	return &PayoutResponse{
		ID:            result.Id,
		ReferenceID:   result.ReferenceId,
		ApprovalState: string(result.ApprovalState),
	}, nil
}

// GetPayout retrieves payout status from PayOS using the dedicated payout client
func (s *PayOSService) GetPayout(ctx context.Context, payoutID string) (*PayoutStatusResponse, error) {
	if s.payoutClient == nil || s.payoutClient.Payouts == nil {
		return nil, fmt.Errorf("PayOS payout client not configured (set PAYOS_PAYOUT_CLIENT_ID, PAYOS_PAYOUT_API_KEY, PAYOS_PAYOUT_CHECKSUM_KEY)")
	}

	result, err := s.payoutClient.Payouts.Get(ctx, payoutID)
	if err != nil {
		return nil, fmt.Errorf("failed to get payout: %w", err)
	}

	resp := &PayoutStatusResponse{
		ID:    result.Id,
		State: string(result.ApprovalState),
	}

	// Check transaction-level state for more detail
	if len(result.Transactions) > 0 {
		tx := result.Transactions[0]
		resp.State = string(tx.State)
		if tx.ErrorMessage != nil {
			resp.ErrorMessage = *tx.ErrorMessage
		}
	}

	return resp, nil
}

// GetPaymentInfo retrieves payment information by order code
func (s *PayOSService) GetPaymentInfo(ctx context.Context, orderCode int64) (*payos.PaymentLink, error) {
	result, err := s.client.PaymentRequests.Get(ctx, orderCode)
	if err != nil {
		return nil, fmt.Errorf("failed to get payment info: %w", err)
	}

	return result, nil
}

// CancelPaymentLink cancels a payment link so the QR code stops accepting payments.
func (s *PayOSService) CancelPaymentLink(ctx context.Context, orderCode int64, reason string) error {
	_, err := s.client.PaymentRequests.Cancel(ctx, orderCode, &reason)
	if err != nil {
		return fmt.Errorf("failed to cancel payment link: %w", err)
	}

	return nil
}
