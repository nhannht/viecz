package com.viecz.vieczandroid.data.repository

import android.util.Log
import com.viecz.vieczandroid.data.api.BankApi
import com.viecz.vieczandroid.data.models.AddBankAccountRequest
import com.viecz.vieczandroid.data.models.BankAccount
import com.viecz.vieczandroid.data.models.VietQRBank
import com.viecz.vieczandroid.utils.parseErrorMessage
import retrofit2.HttpException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BankRepository @Inject constructor(
    private val api: BankApi
) {
    companion object {
        private const val TAG = "BankRepository"
    }

    suspend fun getBanks(): Result<List<VietQRBank>> {
        return try {
            Log.d(TAG, "Fetching VietQR banks")
            val banks = api.getBanks()
            Log.d(TAG, "Fetched ${banks.size} banks")
            Result.success(banks)
        } catch (e: HttpException) {
            val errorMessage = e.parseErrorMessage()
            Log.e(TAG, "HTTP error fetching banks: ${e.code()} - $errorMessage", e)
            Result.failure(Exception(errorMessage))
        } catch (e: Exception) {
            Log.e(TAG, "Failed to fetch banks", e)
            Result.failure(e)
        }
    }

    suspend fun getBankAccounts(): Result<List<BankAccount>> {
        return try {
            Log.d(TAG, "Fetching bank accounts")
            val accounts = api.getBankAccounts()
            Log.d(TAG, "Fetched ${accounts.size} bank accounts")
            Result.success(accounts)
        } catch (e: HttpException) {
            val errorMessage = e.parseErrorMessage()
            Log.e(TAG, "HTTP error fetching bank accounts: ${e.code()} - $errorMessage", e)
            Result.failure(Exception(errorMessage))
        } catch (e: Exception) {
            Log.e(TAG, "Failed to fetch bank accounts", e)
            Result.failure(e)
        }
    }

    suspend fun addBankAccount(
        bankBin: String,
        bankName: String,
        accountNumber: String,
        accountHolderName: String
    ): Result<BankAccount> {
        return try {
            Log.d(TAG, "Adding bank account: $bankName")
            val account = api.addBankAccount(
                AddBankAccountRequest(bankBin, bankName, accountNumber, accountHolderName)
            )
            Log.d(TAG, "Bank account added: id=${account.id}")
            Result.success(account)
        } catch (e: HttpException) {
            val errorMessage = e.parseErrorMessage()
            Log.e(TAG, "HTTP error adding bank account: ${e.code()} - $errorMessage", e)
            Result.failure(Exception(errorMessage))
        } catch (e: Exception) {
            Log.e(TAG, "Failed to add bank account", e)
            Result.failure(e)
        }
    }

    suspend fun deleteBankAccount(id: Long): Result<Unit> {
        return try {
            Log.d(TAG, "Deleting bank account: $id")
            api.deleteBankAccount(id)
            Log.d(TAG, "Bank account deleted: $id")
            Result.success(Unit)
        } catch (e: HttpException) {
            val errorMessage = e.parseErrorMessage()
            Log.e(TAG, "HTTP error deleting bank account: ${e.code()} - $errorMessage", e)
            Result.failure(Exception(errorMessage))
        } catch (e: Exception) {
            Log.e(TAG, "Failed to delete bank account", e)
            Result.failure(e)
        }
    }
}
