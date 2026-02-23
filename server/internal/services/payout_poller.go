package services

import (
	"context"
	"log"
	"time"

	"gorm.io/gorm"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
)

// PayoutPoller periodically checks pending payout transactions against PayOS
type PayoutPoller struct {
	transactionRepo repository.TransactionRepository
	walletService   *WalletService
	payosService    PayOSServicer
	db              *gorm.DB
	interval        time.Duration
	stopCh          chan struct{}
}

// NewPayoutPoller creates a new payout poller
func NewPayoutPoller(
	transactionRepo repository.TransactionRepository,
	walletService *WalletService,
	payosService PayOSServicer,
	db *gorm.DB,
	interval time.Duration,
) *PayoutPoller {
	return &PayoutPoller{
		transactionRepo: transactionRepo,
		walletService:   walletService,
		payosService:    payosService,
		db:              db,
		interval:        interval,
		stopCh:          make(chan struct{}),
	}
}

// Start begins the polling loop in a goroutine
func (p *PayoutPoller) Start() {
	go func() {
		ticker := time.NewTicker(p.interval)
		defer ticker.Stop()

		log.Printf("PayoutPoller started (interval: %s)", p.interval)

		for {
			select {
			case <-ticker.C:
				p.pollPendingPayouts()
			case <-p.stopCh:
				log.Println("PayoutPoller stopped")
				return
			}
		}
	}()
}

// Stop signals the poller to stop
func (p *PayoutPoller) Stop() {
	close(p.stopCh)
}

func (p *PayoutPoller) pollPendingPayouts() {
	ctx := context.Background()

	transactions, err := p.transactionRepo.GetPendingPayouts(ctx)
	if err != nil {
		log.Printf("[PayoutPoller] Failed to query pending payouts: %v", err)
		return
	}

	if len(transactions) == 0 {
		return
	}

	log.Printf("[PayoutPoller] Checking %d pending payout(s)", len(transactions))

	for _, tx := range transactions {
		p.checkPayout(ctx, tx)
	}
}

func (p *PayoutPoller) checkPayout(ctx context.Context, tx *models.Transaction) {
	if tx.PayOSPayoutID == nil {
		return
	}

	status, err := p.payosService.GetPayout(ctx, *tx.PayOSPayoutID)
	if err != nil {
		log.Printf("[PayoutPoller] Failed to get payout %s: %v", *tx.PayOSPayoutID, err)
		return
	}

	switch status.State {
	case "SUCCEEDED":
		now := time.Now()
		tx.Status = models.TransactionStatusSuccess
		tx.CompletedAt = &now
		if err := p.transactionRepo.Update(ctx, tx); err != nil {
			log.Printf("[PayoutPoller] Failed to update transaction %d to success: %v", tx.ID, err)
		} else {
			log.Printf("[PayoutPoller] Payout %s completed successfully (tx=%d)", *tx.PayOSPayoutID, tx.ID)
		}

	case "FAILED", "CANCELLED", "REVERSED":
		now := time.Now()
		tx.Status = models.TransactionStatusFailed
		tx.CompletedAt = &now
		reason := status.State
		if status.ErrorMessage != "" {
			reason = reason + ": " + status.ErrorMessage
		}
		tx.FailureReason = &reason
		if err := p.transactionRepo.Update(ctx, tx); err != nil {
			log.Printf("[PayoutPoller] Failed to update transaction %d to failed: %v", tx.ID, err)
			return
		}

		// Refund wallet
		refundDesc := "Withdrawal refund: payout " + status.State
		if err := p.walletService.Deposit(ctx, nil, tx.PayerID, tx.Amount, refundDesc); err != nil {
			log.Printf("[PayoutPoller] CRITICAL: Failed to refund wallet for tx %d (amount=%d, user=%d): %v", tx.ID, tx.Amount, tx.PayerID, err)
		} else {
			log.Printf("[PayoutPoller] Refunded %d VND to user %d (tx=%d, reason=%s)", tx.Amount, tx.PayerID, tx.ID, status.State)
		}

	default:
		// PROCESSING, RECEIVED, ON_HOLD — still in progress, skip
	}
}
