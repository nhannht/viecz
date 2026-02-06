package com.viecz.vieczandroid.data.repository

import android.util.Log
import com.viecz.vieczandroid.data.api.WalletApi
import com.viecz.vieczandroid.data.models.DepositRequest
import com.viecz.vieczandroid.data.models.Wallet
import com.viecz.vieczandroid.data.models.WalletTransaction
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

    suspend fun deposit(amount: Long, description: String = "Manual deposit"): Result<String> {
        return try {
            Log.d(TAG, "Depositing $amount to wallet")
            val response = api.deposit(DepositRequest(amount, description))
            Log.d(TAG, "Deposit successful")
            Result.success(response.message)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to deposit", e)
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
