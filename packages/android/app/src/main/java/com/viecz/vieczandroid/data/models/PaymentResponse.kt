package com.viecz.vieczandroid.data.models

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class PaymentResponse(
    val orderCode: Long,  // Changed from Int to Long to handle large order codes from PayOS
    val checkoutUrl: String,
    val qrCode: String
)
