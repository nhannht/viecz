package com.viecz.vieczandroid.data.models

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class Wallet(
    val id: Long,
    @Json(name = "user_id") val userId: Long,
    val balance: Long,
    @Json(name = "escrow_balance") val escrowBalance: Long,
    @Json(name = "total_deposited") val totalDeposited: Long,
    @Json(name = "total_withdrawn") val totalWithdrawn: Long,
    @Json(name = "total_earned") val totalEarned: Long,
    @Json(name = "total_spent") val totalSpent: Long,
    @Json(name = "created_at") val createdAt: String,
    @Json(name = "updated_at") val updatedAt: String
)

@JsonClass(generateAdapter = true)
data class WalletTransaction(
    val id: Long,
    @Json(name = "wallet_id") val walletId: Long,
    @Json(name = "transaction_id") val transactionId: Long?,
    @Json(name = "task_id") val taskId: Long?,
    val type: WalletTransactionType,
    val amount: Long,
    @Json(name = "balance_before") val balanceBefore: Long,
    @Json(name = "balance_after") val balanceAfter: Long,
    @Json(name = "escrow_before") val escrowBefore: Long,
    @Json(name = "escrow_after") val escrowAfter: Long,
    val description: String,
    @Json(name = "reference_user_id") val referenceUserId: Long?,
    @Json(name = "created_at") val createdAt: String
)

enum class WalletTransactionType {
    @Json(name = "deposit") DEPOSIT,
    @Json(name = "withdrawal") WITHDRAWAL,
    @Json(name = "escrow_hold") ESCROW_HOLD,
    @Json(name = "escrow_release") ESCROW_RELEASE,
    @Json(name = "escrow_refund") ESCROW_REFUND,
    @Json(name = "payment_received") PAYMENT_RECEIVED,
    @Json(name = "platform_fee") PLATFORM_FEE
}

// Request models
@JsonClass(generateAdapter = true)
data class DepositRequest(
    val amount: Long,
    val description: String = "Wallet deposit"
)

// Response models
@JsonClass(generateAdapter = true)
data class DepositResponse(
    @Json(name = "checkout_url") val checkoutUrl: String,
    @Json(name = "order_code") val orderCode: Long
)

@JsonClass(generateAdapter = true)
data class MessageResponse(
    val message: String
)
