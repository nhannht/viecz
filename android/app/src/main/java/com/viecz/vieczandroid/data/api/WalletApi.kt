package com.viecz.vieczandroid.data.api

import com.viecz.vieczandroid.data.models.DepositRequest
import com.viecz.vieczandroid.data.models.DepositResponse
import com.viecz.vieczandroid.data.models.Wallet
import com.viecz.vieczandroid.data.models.WalletTransaction
import com.viecz.vieczandroid.data.models.WithdrawalRequest
import com.viecz.vieczandroid.data.models.WithdrawalResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface WalletApi {
    @GET("wallet")
    suspend fun getWallet(): Wallet

    @POST("wallet/deposit")
    suspend fun deposit(@Body request: DepositRequest): DepositResponse

    @POST("wallet/withdraw")
    suspend fun withdraw(@Body request: WithdrawalRequest): WithdrawalResponse

    @GET("wallet/transactions")
    suspend fun getTransactionHistory(
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): List<WalletTransaction>
}
