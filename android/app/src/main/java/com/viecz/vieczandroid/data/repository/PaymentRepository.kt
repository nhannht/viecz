package com.viecz.vieczandroid.data.repository

import android.util.Log
import com.viecz.vieczandroid.data.api.PaymentApi
import com.viecz.vieczandroid.data.models.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PaymentRepository @Inject constructor(
    private val api: PaymentApi
) {
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

    suspend fun createEscrowPayment(taskId: Long): Result<CreateEscrowPaymentResponse> {
        return try {
            Log.d(TAG, "Creating escrow payment for task: $taskId")
            val response = api.createEscrowPayment(CreateEscrowPaymentRequest(taskId))
            Log.d(TAG, "Escrow payment created successfully")
            Result.success(response)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create escrow payment", e)
            Result.failure(e)
        }
    }

    suspend fun releasePayment(taskId: Long): Result<String> {
        return try {
            Log.d(TAG, "Releasing payment for task: $taskId")
            val response = api.releasePayment(ReleasePaymentRequest(taskId))
            Log.d(TAG, "Payment released successfully")
            Result.success(response.message)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to release payment", e)
            Result.failure(e)
        }
    }

    suspend fun refundPayment(taskId: Long, reason: String): Result<String> {
        return try {
            Log.d(TAG, "Refunding payment for task: $taskId")
            val response = api.refundPayment(RefundPaymentRequest(taskId, reason))
            Log.d(TAG, "Payment refunded successfully")
            Result.success(response.message)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to refund payment", e)
            Result.failure(e)
        }
    }

    suspend fun getTransactionsByTask(taskId: Long): Result<List<Transaction>> {
        return try {
            Log.d(TAG, "Fetching transactions for task: $taskId")
            val transactions = api.getTransactionsByTask(taskId)
            Log.d(TAG, "Fetched ${transactions.size} transactions")
            Result.success(transactions)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to fetch transactions", e)
            Result.failure(e)
        }
    }
}
