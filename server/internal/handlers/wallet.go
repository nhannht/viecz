package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
	"viecz.vieczserver/internal/services"
)

// WalletHandler handles wallet-related HTTP requests
type WalletHandler struct {
	walletService      *services.WalletService
	payosService       services.PayOSServicer
	transactionRepo    repository.TransactionRepository
	taskRepo           repository.TaskRepository
	bankAccountRepo    repository.BankAccountRepository
	payosReturnBaseURL string
	minWithdrawal      int64
	maxWithdrawal      int64
}

// NewWalletHandler creates a new wallet handler
func NewWalletHandler(
	walletService *services.WalletService,
	payosService services.PayOSServicer,
	transactionRepo repository.TransactionRepository,
	taskRepo repository.TaskRepository,
	payosReturnBaseURL string,
) *WalletHandler {
	return &WalletHandler{
		walletService:      walletService,
		payosService:       payosService,
		transactionRepo:    transactionRepo,
		taskRepo:           taskRepo,
		payosReturnBaseURL: payosReturnBaseURL,
		minWithdrawal:      10000,
		maxWithdrawal:      200000,
	}
}

// NewWalletHandlerWithWithdrawal creates a wallet handler with withdrawal support
func NewWalletHandlerWithWithdrawal(
	walletService *services.WalletService,
	payosService services.PayOSServicer,
	transactionRepo repository.TransactionRepository,
	taskRepo repository.TaskRepository,
	bankAccountRepo repository.BankAccountRepository,
	payosReturnBaseURL string,
	minWithdrawal, maxWithdrawal int64,
) *WalletHandler {
	return &WalletHandler{
		walletService:      walletService,
		payosService:       payosService,
		transactionRepo:    transactionRepo,
		taskRepo:           taskRepo,
		bankAccountRepo:    bankAccountRepo,
		payosReturnBaseURL: payosReturnBaseURL,
		minWithdrawal:      minWithdrawal,
		maxWithdrawal:      maxWithdrawal,
	}
}

// WalletResponse extends Wallet with computed available balance
type WalletResponse struct {
	models.Wallet
	AvailableBalance int64 `json:"available_balance"`
}

// GetWallet retrieves user's wallet information
// @Summary Get wallet
// @Description Retrieves wallet information for the authenticated user
// @Tags wallet
// @Produce json
// @Success 200 {object} models.Wallet
// @Failure 401 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /wallet [get]
// @Security BearerAuth
func (h *WalletHandler) GetWallet(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	wallet, err := h.walletService.GetOrCreateWallet(c.Request.Context(), userID.(int64))
	if err != nil {
		log.Printf("Failed to get wallet: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "fetch_failed",
			Message: err.Error(),
		})
		return
	}

	// Compute available balance (balance - escrow - sum of open task prices)
	var availableBalance int64
	if h.taskRepo != nil {
		availableBalance, err = h.walletService.GetAvailableBalance(c.Request.Context(), userID.(int64), h.taskRepo)
		if err != nil {
			log.Printf("Failed to compute available balance: %v (returning wallet without it)", err)
			availableBalance = wallet.Balance - wallet.EscrowBalance
		}
	} else {
		availableBalance = wallet.Balance - wallet.EscrowBalance
	}

	c.JSON(http.StatusOK, WalletResponse{
		Wallet:           *wallet,
		AvailableBalance: availableBalance,
	})
}

// DepositRequest represents request to deposit funds via PayOS
type DepositRequest struct {
	Amount      int64  `json:"amount" binding:"required,min=2000"`
	Description string `json:"description"`
	ReturnURL   string `json:"return_url"`
}

// DepositResponse represents the response with PayOS checkout URL
type DepositResponse struct {
	CheckoutURL   string `json:"checkout_url"`
	OrderCode     int64  `json:"order_code"`
	QrCode        string `json:"qr_code"`
	AccountNumber string `json:"account_number"`
	AccountName   string `json:"account_name"`
	Amount        int    `json:"amount"`
	Description   string `json:"description"`
}

// Deposit creates a PayOS payment link for wallet top-up
// @Summary Deposit funds
// @Description Creates a PayOS payment link for depositing funds to wallet
// @Tags wallet
// @Accept json
// @Produce json
// @Param request body DepositRequest true "Deposit request"
// @Success 200 {object} DepositResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /wallet/deposit [post]
// @Security BearerAuth
func (h *WalletHandler) Deposit(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	var req DepositRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_request",
			Message: err.Error(),
		})
		return
	}

	if req.Description == "" {
		req.Description = "Wallet deposit"
	}
	// PayOS limits description to 25 characters
	if len([]rune(req.Description)) > 25 {
		req.Description = string([]rune(req.Description)[:25])
	}

	// Validate deposit against max wallet balance before creating payment link
	if err := h.walletService.ValidateDeposit(c.Request.Context(), userID.(int64), req.Amount); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   err.Error(),
			Message: err.Error(),
		})
		return
	}

	// Generate unique order code
	orderCode := time.Now().UnixNano() / int64(time.Millisecond)

	// Create pending transaction record
	transaction := &models.Transaction{
		PayerID:        userID.(int64),
		Amount:         req.Amount,
		PlatformFee:    0,
		NetAmount:      req.Amount,
		Type:           models.TransactionTypeDeposit,
		Status:         models.TransactionStatusPending,
		PayOSOrderCode: &orderCode,
		Description:    req.Description,
	}

	if err := h.transactionRepo.Create(c.Request.Context(), transaction); err != nil {
		log.Printf("Failed to create deposit transaction: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "deposit_failed",
			Message: "Failed to create transaction",
		})
		return
	}

	// Create PayOS payment link
	var returnURL, cancelURL string
	if req.ReturnURL != "" {
		returnURL = req.ReturnURL
		cancelURL = req.ReturnURL
	} else {
		returnURL = fmt.Sprintf("%s/api/v1/payment/return", h.payosReturnBaseURL)
		cancelURL = fmt.Sprintf("%s/api/v1/payment/return", h.payosReturnBaseURL)
	}
	log.Printf("Deposit: return_url from client=%q, using returnURL=%s", req.ReturnURL, returnURL)

	result, err := h.payosService.CreatePaymentLink(
		c.Request.Context(),
		orderCode,
		int(req.Amount),
		req.Description,
		returnURL,
		cancelURL,
	)
	if err != nil {
		log.Printf("Failed to create PayOS payment link: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "deposit_failed",
			Message: "Failed to create payment link",
		})
		return
	}

	c.JSON(http.StatusOK, DepositResponse{
		CheckoutURL:   result.CheckoutUrl,
		OrderCode:     orderCode,
		QrCode:        result.QrCode,
		AccountNumber: result.AccountNumber,
		AccountName:   result.AccountName,
		Amount:        result.Amount,
		Description:   req.Description,
	})
}

// GetDepositStatus returns the current status of a deposit by order code.
// @Summary Get deposit status
// @Tags wallet
// @Produce json
// @Param orderCode path string true "PayOS order code"
// @Success 200 {object} map[string]string
// @Failure 401 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Router /wallet/deposit/status/{orderCode} [get]
// @Security BearerAuth
func (h *WalletHandler) GetDepositStatus(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	orderCodeStr := c.Param("orderCode")
	orderCode, err := strconv.ParseInt(orderCodeStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_order_code",
			Message: "Invalid order code",
		})
		return
	}

	tx, err := h.transactionRepo.GetByOrderCode(c.Request.Context(), orderCode)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Transaction not found",
		})
		return
	}

	// Verify the transaction belongs to the requesting user
	if tx.PayerID != userID.(int64) {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Transaction not found",
		})
		return
	}

	// Map internal status to simple client status
	status := "pending"
	switch tx.Status {
	case models.TransactionStatusSuccess:
		status = "success"
	case models.TransactionStatusFailed:
		status = "failed"
	case models.TransactionStatusCancelled:
		status = "cancelled"
	}

	c.JSON(http.StatusOK, gin.H{"status": status})
}

// GetTransactionHistory retrieves wallet transaction history
// @Summary Get transaction history
// @Description Retrieves wallet transaction history for the authenticated user
// @Tags wallet
// @Produce json
// @Param limit query int false "Limit" default(20)
// @Param offset query int false "Offset" default(0)
// @Success 200 {array} models.WalletTransaction
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /wallet/transactions [get]
// @Security BearerAuth
func (h *WalletHandler) GetTransactionHistory(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	// Parse pagination parameters
	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 0 {
		limit = 20
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	transactions, err := h.walletService.GetTransactionHistory(
		c.Request.Context(),
		userID.(int64),
		limit,
		offset,
	)
	if err != nil {
		log.Printf("Failed to get transaction history: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "fetch_failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, transactions)
}

// WithdrawalRequest represents a request to withdraw funds
type WithdrawalRequest struct {
	Amount        int64 `json:"amount" binding:"required,min=1"`
	BankAccountID int64 `json:"bank_account_id" binding:"required"`
}

// WithdrawalResponse represents the withdrawal response
type WithdrawalResponse struct {
	TransactionID int64  `json:"transaction_id"`
	Status        string `json:"status"`
}

// HandleWithdrawal processes a withdrawal request via PayOS payout
func (h *WalletHandler) HandleWithdrawal(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	var req WithdrawalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_request",
			Message: err.Error(),
		})
		return
	}

	// Validate amount
	if req.Amount < h.minWithdrawal {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_amount",
			Message: fmt.Sprintf("Minimum withdrawal is %d VND", h.minWithdrawal),
		})
		return
	}
	if req.Amount > h.maxWithdrawal {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_amount",
			Message: fmt.Sprintf("Maximum withdrawal is %d VND", h.maxWithdrawal),
		})
		return
	}
	if req.Amount%1000 != 0 {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_amount",
			Message: "Amount must be a multiple of 1,000 VND",
		})
		return
	}

	// Check available balance
	uid := userID.(int64)
	availableBalance, err := h.walletService.GetAvailableBalance(c.Request.Context(), uid, h.taskRepo)
	if err != nil {
		log.Printf("Failed to check available balance: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "withdrawal_failed",
			Message: "Failed to check balance",
		})
		return
	}
	if req.Amount > availableBalance {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "insufficient_balance",
			Message: "Insufficient available balance",
		})
		return
	}

	// Fetch and verify bank account ownership
	if h.bankAccountRepo == nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "withdrawal_failed",
			Message: "Withdrawal not configured",
		})
		return
	}
	bankAccount, err := h.bankAccountRepo.GetByIDAndUserID(c.Request.Context(), req.BankAccountID, uid)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Bank account not found",
		})
		return
	}

	// Create pending transaction
	referenceID := fmt.Sprintf("wd_%d_%d", uid, time.Now().UnixMilli())
	transaction := &models.Transaction{
		PayerID:     uid,
		Amount:      req.Amount,
		PlatformFee: 0,
		NetAmount:   req.Amount,
		Type:        models.TransactionTypeWithdrawal,
		Status:      models.TransactionStatusPending,
		Description: fmt.Sprintf("Withdrawal to %s %s", bankAccount.BankName, bankAccount.AccountNumber),
	}

	if err := h.transactionRepo.Create(c.Request.Context(), transaction); err != nil {
		log.Printf("Failed to create withdrawal transaction: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "withdrawal_failed",
			Message: "Failed to create transaction",
		})
		return
	}

	// Call PayOS payout
	payoutResp, err := h.payosService.CreatePayout(
		c.Request.Context(),
		referenceID,
		int(req.Amount),
		"Rut tien vi Viecz",
		bankAccount.BankBin,
		bankAccount.AccountNumber,
	)
	if err != nil {
		log.Printf("PayOS payout failed: %v", err)
		// Mark transaction as failed
		transaction.Status = models.TransactionStatusFailed
		failureReason := err.Error()
		transaction.FailureReason = &failureReason
		_ = h.transactionRepo.Update(c.Request.Context(), transaction)

		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "payout_failed",
			Message: "Failed to initiate bank transfer",
		})
		return
	}

	// Store PayOS payout ID on transaction
	transaction.PayOSPayoutID = &payoutResp.ID
	if err := h.transactionRepo.Update(c.Request.Context(), transaction); err != nil {
		log.Printf("Failed to update transaction with payout ID: %v", err)
	}

	// Debit wallet immediately
	if err := h.walletService.Withdraw(c.Request.Context(), nil, uid, req.Amount, transaction.Description, &transaction.ID); err != nil {
		log.Printf("Wallet debit failed after PayOS payout created: %v (payoutID=%s)", err, payoutResp.ID)
		// Edge case: payout was created but wallet debit failed
		// Mark transaction as failed — the poller will detect the mismatch
		transaction.Status = models.TransactionStatusFailed
		failureReason := fmt.Sprintf("wallet debit failed: %s", err.Error())
		transaction.FailureReason = &failureReason
		_ = h.transactionRepo.Update(c.Request.Context(), transaction)

		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "withdrawal_failed",
			Message: "Failed to debit wallet",
		})
		return
	}

	c.JSON(http.StatusOK, WithdrawalResponse{
		TransactionID: transaction.ID,
		Status:        string(transaction.Status),
	})
}
