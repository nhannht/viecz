package com.viecz.vieczandroid.data.models

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class Transaction(
    val id: Long,
    @Json(name = "task_id") val taskId: Long?,
    @Json(name = "payer_id") val payerId: Long,
    @Json(name = "payee_id") val payeeId: Long?,
    val amount: Long,
    @Json(name = "platform_fee") val platformFee: Long,
    @Json(name = "net_amount") val netAmount: Long,
    val type: TransactionType,
    val status: TransactionStatus,
    @Json(name = "payos_order_code") val payosOrderCode: Long?,
    @Json(name = "payos_payment_id") val payosPaymentId: String?,
    val description: String,
    @Json(name = "failure_reason") val failureReason: String?,
    @Json(name = "completed_at") val completedAt: String?,
    @Json(name = "created_at") val createdAt: String,
    @Json(name = "updated_at") val updatedAt: String
)

enum class TransactionType {
    @Json(name = "escrow") ESCROW,
    @Json(name = "release") RELEASE,
    @Json(name = "refund") REFUND,
    @Json(name = "platform_fee") PLATFORM_FEE,
    @Json(name = "deposit") DEPOSIT,
    @Json(name = "withdrawal") WITHDRAWAL
}

enum class TransactionStatus {
    @Json(name = "pending") PENDING,
    @Json(name = "success") SUCCESS,
    @Json(name = "failed") FAILED,
    @Json(name = "cancelled") CANCELLED
}

// Request models
@JsonClass(generateAdapter = true)
data class CreateEscrowPaymentRequest(
    @Json(name = "task_id") val taskId: Long
)

@JsonClass(generateAdapter = true)
data class CreateEscrowPaymentResponse(
    val transaction: Transaction,
    @Json(name = "checkout_url") val checkoutUrl: String?
)

@JsonClass(generateAdapter = true)
data class ReleasePaymentRequest(
    @Json(name = "task_id") val taskId: Long
)

@JsonClass(generateAdapter = true)
data class RefundPaymentRequest(
    @Json(name = "task_id") val taskId: Long,
    val reason: String
)
