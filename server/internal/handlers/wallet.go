package handlers

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/services"
)

// WalletHandler handles wallet-related HTTP requests
type WalletHandler struct {
	walletService *services.WalletService
}

// NewWalletHandler creates a new wallet handler
func NewWalletHandler(walletService *services.WalletService) *WalletHandler {
	return &WalletHandler{
		walletService: walletService,
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

// DepositRequest represents request to deposit funds (dev/test mode only)
type DepositRequest struct {
	Amount      int64  `json:"amount" binding:"required,min=1"`
	Description string `json:"description"`
}

// Deposit adds funds to wallet (for testing/dev mode)
// @Summary Deposit funds
// @Description Adds funds to wallet (development/testing only)
// @Tags wallet
// @Accept json
// @Produce json
// @Param request body DepositRequest true "Deposit request"
// @Success 200 {object} map[string]string
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
		req.Description = "Manual deposit"
	}

	if err := h.walletService.Deposit(
		c.Request.Context(),
		userID.(int64),
		req.Amount,
		req.Description,
	); err != nil {
		log.Printf("Failed to deposit funds: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "deposit_failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Funds deposited successfully",
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
