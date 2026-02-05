package com.viecz.vieczandroid.data.api

import com.viecz.vieczandroid.data.models.PaymentRequest
import com.viecz.vieczandroid.data.models.PaymentResponse
import retrofit2.http.Body
import retrofit2.http.POST

interface PaymentApi {
    @POST("payment/create")
    suspend fun createPayment(@Body request: PaymentRequest): PaymentResponse
}
