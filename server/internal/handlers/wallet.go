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
	walletService   *services.WalletService
	payosService    services.PayOSServicer
	transactionRepo repository.TransactionRepository
	serverURL       string
}

// NewWalletHandler creates a new wallet handler
func NewWalletHandler(
	walletService *services.WalletService,
	payosService services.PayOSServicer,
	transactionRepo repository.TransactionRepository,
	serverURL string,
) *WalletHandler {
	return &WalletHandler{
		walletService:   walletService,
		payosService:    payosService,
		transactionRepo: transactionRepo,
		serverURL:       serverURL,
	}
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

	c.JSON(http.StatusOK, wallet)
}

// DepositRequest represents request to deposit funds via PayOS
type DepositRequest struct {
	Amount      int64  `json:"amount" binding:"required,min=2000"`
	Description string `json:"description"`
}

// DepositResponse represents the response with PayOS checkout URL
type DepositResponse struct {
	CheckoutURL string `json:"checkout_url"`
	OrderCode   int64  `json:"order_code"`
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
	returnURL := fmt.Sprintf("%s/api/v1/payment/return", h.serverURL)
	cancelURL := fmt.Sprintf("%s/api/v1/payment/return", h.serverURL)

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
		CheckoutURL: result.CheckoutUrl,
		OrderCode:   orderCode,
	})
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
