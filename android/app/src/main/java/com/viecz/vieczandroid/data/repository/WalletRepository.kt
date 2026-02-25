package com.viecz.vieczandroid.data.repository

import android.util.Log
import com.viecz.vieczandroid.data.api.WalletApi
import com.viecz.vieczandroid.data.models.DepositRequest
import com.viecz.vieczandroid.data.models.DepositResponse
import com.viecz.vieczandroid.data.models.Wallet
import com.viecz.vieczandroid.data.models.WalletTransaction
import com.viecz.vieczandroid.data.models.WithdrawalRequest
import com.viecz.vieczandroid.data.models.WithdrawalResponse
import com.viecz.vieczandroid.utils.parseErrorMessage
import retrofit2.HttpException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WalletRepository @Inject constructor(
    private val api: WalletApi
) {
    companion object {
        private const val TAG = "WalletRepository"
    }

    suspend fun getWallet(): Result<Wallet> {
        return try {
            Log.d(TAG, "Fetching wallet")
            val wallet = api.getWallet()
            Log.d(TAG, "Wallet fetched: balance=${wallet.balance}, escrow=${wallet.escrowBalance}")
            Result.success(wallet)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to fetch wallet", e)
            Result.failure(e)
        }
    }

    suspend fun deposit(amount: Long, description: String = "Wallet deposit"): Result<DepositResponse> {
        return try {
            Log.d(TAG, "Creating deposit for $amount")
            val response = api.deposit(DepositRequest(amount, description))
            Log.d(TAG, "Deposit created: checkoutUrl=${response.checkoutUrl}")
            Result.success(response)
        } catch (e: HttpException) {
            val errorMessage = e.parseErrorMessage()
            Log.e(TAG, "HTTP error depositing: ${e.code()} - $errorMessage", e)
            Result.failure(Exception(errorMessage))
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create deposit", e)
            Result.failure(e)
        }
    }

    suspend fun withdraw(amount: Long, bankAccountId: Long): Result<WithdrawalResponse> {
        return try {
            Log.d(TAG, "Creating withdrawal for $amount to bank account $bankAccountId")
            val response = api.withdraw(WithdrawalRequest(amount, bankAccountId))
            Log.d(TAG, "Withdrawal created: transactionId=${response.transactionId}")
            Result.success(response)
        } catch (e: HttpException) {
            val errorMessage = e.parseErrorMessage()
            Log.e(TAG, "HTTP error withdrawing: ${e.code()} - $errorMessage", e)
            Result.failure(Exception(errorMessage))
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create withdrawal", e)
            Result.failure(e)
        }
    }

    suspend fun getTransactionHistory(limit: Int = 20, offset: Int = 0): Result<List<WalletTransaction>> {
        return try {
            Log.d(TAG, "Fetching transaction history (limit=$limit, offset=$offset)")
            val transactions = api.getTransactionHistory(limit, offset)
            Log.d(TAG, "Fetched ${transactions.size} transactions")
            Result.success(transactions)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to fetch transaction history", e)
            Result.failure(e)
        }
    }
}
