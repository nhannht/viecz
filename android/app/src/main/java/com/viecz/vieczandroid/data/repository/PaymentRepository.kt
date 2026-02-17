package com.viecz.vieczandroid.data.repository

import android.util.Log
import com.viecz.vieczandroid.data.api.PaymentApi
import com.viecz.vieczandroid.data.models.*
import com.viecz.vieczandroid.utils.parseErrorMessage
import retrofit2.HttpException
import java.io.IOException
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
            val response = api.createPayment(PaymentRequest(amount, description))
            Log.d(TAG, "API call successful")
            Result.success(response)
        } catch (e: HttpException) {
            val errorMessage = e.parseErrorMessage()
            Log.e(TAG, "HTTP error creating payment: ${e.code()} - $errorMessage", e)
            Result.failure(Exception(errorMessage))
        } catch (e: IOException) {
            Log.e(TAG, "Network error creating payment", e)
            Result.failure(Exception("Network error. Please check your connection."))
        } catch (e: Exception) {
            Log.e(TAG, "Unknown error creating payment", e)
            Result.failure(e)
        }
    }

    suspend fun createEscrowPayment(taskId: Long): Result<CreateEscrowPaymentResponse> {
        return try {
            Log.d(TAG, "Creating escrow payment for task: $taskId")
            val response = api.createEscrowPayment(CreateEscrowPaymentRequest(taskId))
            Log.d(TAG, "Escrow payment created successfully")
            Result.success(response)
        } catch (e: HttpException) {
            val errorMessage = e.parseErrorMessage()
            Log.e(TAG, "HTTP error creating escrow: ${e.code()} - $errorMessage", e)
            Result.failure(Exception(errorMessage))
        } catch (e: IOException) {
            Log.e(TAG, "Network error creating escrow", e)
            Result.failure(Exception("Network error. Please check your connection."))
        } catch (e: Exception) {
            Log.e(TAG, "Unknown error creating escrow", e)
            Result.failure(e)
        }
    }

    suspend fun releasePayment(taskId: Long): Result<String> {
        return try {
            Log.d(TAG, "Releasing payment for task: $taskId")
            val response = api.releasePayment(ReleasePaymentRequest(taskId))
            Log.d(TAG, "Payment released successfully")
            Result.success(response.message)
        } catch (e: HttpException) {
            val errorMessage = e.parseErrorMessage()
            Log.e(TAG, "HTTP error releasing payment: ${e.code()} - $errorMessage", e)
            Result.failure(Exception(errorMessage))
        } catch (e: IOException) {
            Log.e(TAG, "Network error releasing payment", e)
            Result.failure(Exception("Network error. Please check your connection."))
        } catch (e: Exception) {
            Log.e(TAG, "Unknown error releasing payment", e)
            Result.failure(e)
        }
    }

    suspend fun refundPayment(taskId: Long, reason: String): Result<String> {
        return try {
            Log.d(TAG, "Refunding payment for task: $taskId")
            val response = api.refundPayment(RefundPaymentRequest(taskId, reason))
            Log.d(TAG, "Payment refunded successfully")
            Result.success(response.message)
        } catch (e: HttpException) {
            val errorMessage = e.parseErrorMessage()
            Log.e(TAG, "HTTP error refunding payment: ${e.code()} - $errorMessage", e)
            Result.failure(Exception(errorMessage))
        } catch (e: IOException) {
            Log.e(TAG, "Network error refunding payment", e)
            Result.failure(Exception("Network error. Please check your connection."))
        } catch (e: Exception) {
            Log.e(TAG, "Unknown error refunding payment", e)
            Result.failure(e)
        }
    }

    suspend fun getTransactionsByTask(taskId: Long): Result<List<Transaction>> {
        return try {
            Log.d(TAG, "Fetching transactions for task: $taskId")
            val transactions = api.getTransactionsByTask(taskId)
            Log.d(TAG, "Fetched ${transactions.size} transactions")
            Result.success(transactions)
        } catch (e: HttpException) {
            val errorMessage = e.parseErrorMessage()
            Log.e(TAG, "HTTP error fetching transactions: ${e.code()} - $errorMessage", e)
            Result.failure(Exception(errorMessage))
        } catch (e: IOException) {
            Log.e(TAG, "Network error fetching transactions", e)
            Result.failure(Exception("Network error. Please check your connection."))
        } catch (e: Exception) {
            Log.e(TAG, "Unknown error fetching transactions", e)
            Result.failure(e)
        }
    }
}
