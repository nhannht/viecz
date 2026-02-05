package com.viecz.vieczandroid.data.repository

import android.util.Log
import com.viecz.vieczandroid.data.api.PaymentApi
import com.viecz.vieczandroid.data.models.PaymentRequest
import com.viecz.vieczandroid.data.models.PaymentResponse

class PaymentRepository(private val api: PaymentApi) {
    companion object {
        private const val TAG = "PaymentRepository"
    }

    suspend fun createPayment(amount: Int, description: String): Result<PaymentResponse> {
        return try {
            Log.d(TAG, "Making API call to create payment")
            Log.d(TAG, "Request: amount=$amount, description=$description")

            val response = api.createPayment(PaymentRequest(amount, description))

            Log.d(TAG, "API call successful")
            Log.d(TAG, "Response: $response")
            Result.success(response)
        } catch (e: Exception) {
            Log.e(TAG, "API call failed", e)
            Log.e(TAG, "Exception type: ${e.javaClass.simpleName}")
            Log.e(TAG, "Exception message: ${e.message}")
            Result.failure(e)
        }
    }
}
