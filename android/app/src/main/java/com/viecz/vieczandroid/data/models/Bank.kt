package com.viecz.vieczandroid.data.models

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class VietQRBank(
    val id: Long,
    val name: String,
    val code: String,
    val bin: String,
    @Json(name = "shortName") val shortName: String,
    val logo: String,
    @Json(name = "transferSupported") val transferSupported: Int,
    @Json(name = "lookupSupported") val lookupSupported: Int
)

@JsonClass(generateAdapter = true)
data class BankAccount(
    val id: Long,
    @Json(name = "user_id") val userId: Long,
    @Json(name = "bank_bin") val bankBin: String,
    @Json(name = "bank_name") val bankName: String,
    @Json(name = "account_number") val accountNumber: String,
    @Json(name = "account_holder_name") val accountHolderName: String,
    @Json(name = "is_default") val isDefault: Boolean = false,
    @Json(name = "created_at") val createdAt: String = "",
    @Json(name = "updated_at") val updatedAt: String = ""
)

@JsonClass(generateAdapter = true)
data class AddBankAccountRequest(
    @Json(name = "bank_bin") val bankBin: String,
    @Json(name = "bank_name") val bankName: String,
    @Json(name = "account_number") val accountNumber: String,
    @Json(name = "account_holder_name") val accountHolderName: String
)

@JsonClass(generateAdapter = true)
data class WithdrawalRequest(
    val amount: Long,
    @Json(name = "bank_account_id") val bankAccountId: Long
)

@JsonClass(generateAdapter = true)
data class WithdrawalResponse(
    @Json(name = "transaction_id") val transactionId: Long,
    val status: String
)
