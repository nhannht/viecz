package com.viecz.vieczandroid.data.models

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class PaymentRequest(
    val amount: Int,
    val description: String
)
