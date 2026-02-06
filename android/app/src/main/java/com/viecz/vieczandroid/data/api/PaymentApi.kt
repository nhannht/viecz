package com.viecz.vieczandroid.data.api

import com.viecz.vieczandroid.data.models.*
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface PaymentApi {
    @POST("payment/create")
    suspend fun createPayment(@Body request: PaymentRequest): PaymentResponse

    // Escrow payment endpoints
    @POST("payments/escrow")
    suspend fun createEscrowPayment(@Body request: CreateEscrowPaymentRequest): CreateEscrowPaymentResponse

    @POST("payments/release")
    suspend fun releasePayment(@Body request: ReleasePaymentRequest): MessageResponse

    @POST("payments/refund")
    suspend fun refundPayment(@Body request: RefundPaymentRequest): MessageResponse

    @GET("tasks/{task_id}/transactions")
    suspend fun getTransactionsByTask(@Path("task_id") taskId: Long): List<Transaction>
}
