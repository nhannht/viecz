package handlers

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"viecz.vieczserver/internal/models"
	"viecz.vieczserver/internal/repository"
)

// BankAccountHandler handles bank account CRUD operations
type BankAccountHandler struct {
	bankAccountRepo repository.BankAccountRepository
}

// NewBankAccountHandler creates a new bank account handler
func NewBankAccountHandler(bankAccountRepo repository.BankAccountRepository) *BankAccountHandler {
	return &BankAccountHandler{bankAccountRepo: bankAccountRepo}
}

// AddBankAccountRequest represents the request to add a bank account
type AddBankAccountRequest struct {
	BankBin           string `json:"bank_bin" binding:"required"`
	BankName          string `json:"bank_name" binding:"required"`
	AccountNumber     string `json:"account_number" binding:"required"`
	AccountHolderName string `json:"account_holder_name" binding:"required"`
}

// AddBankAccount adds a new bank account for the user
func (h *BankAccountHandler) AddBankAccount(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	var req AddBankAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_request",
			Message: err.Error(),
		})
		return
	}

	bankAccount := &models.BankAccount{
		UserID:            userID.(int64),
		BankBin:           req.BankBin,
		BankName:          req.BankName,
		AccountNumber:     req.AccountNumber,
		AccountHolderName: req.AccountHolderName,
	}

	if err := h.bankAccountRepo.Create(c.Request.Context(), bankAccount); err != nil {
		log.Printf("Failed to create bank account: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "create_failed",
			Message: "Failed to save bank account",
		})
		return
	}

	c.JSON(http.StatusCreated, bankAccount)
}

// ListBankAccounts returns all bank accounts for the user
func (h *BankAccountHandler) ListBankAccounts(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	accounts, err := h.bankAccountRepo.GetByUserID(c.Request.Context(), userID.(int64))
	if err != nil {
		log.Printf("Failed to list bank accounts: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "fetch_failed",
			Message: "Failed to fetch bank accounts",
		})
		return
	}

	c.JSON(http.StatusOK, accounts)
}

// DeleteBankAccount deletes a bank account (ownership check)
func (h *BankAccountHandler) DeleteBankAccount(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "unauthorized",
			Message: "User not authenticated",
		})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_id",
			Message: "Invalid bank account ID",
		})
		return
	}

	// Verify ownership
	_, err = h.bankAccountRepo.GetByIDAndUserID(c.Request.Context(), id, userID.(int64))
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Bank account not found",
		})
		return
	}

	if err := h.bankAccountRepo.Delete(c.Request.Context(), id); err != nil {
		log.Printf("Failed to delete bank account: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "delete_failed",
			Message: "Failed to delete bank account",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Bank account deleted"})
}
