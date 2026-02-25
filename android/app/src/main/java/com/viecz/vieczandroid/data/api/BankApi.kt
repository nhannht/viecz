package com.viecz.vieczandroid.data.api

import com.viecz.vieczandroid.data.models.AddBankAccountRequest
import com.viecz.vieczandroid.data.models.BankAccount
import com.viecz.vieczandroid.data.models.MessageResponse
import com.viecz.vieczandroid.data.models.VietQRBank
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface BankApi {
    @GET("banks")
    suspend fun getBanks(): List<VietQRBank>

    @GET("wallet/bank-accounts")
    suspend fun getBankAccounts(): List<BankAccount>

    @POST("wallet/bank-accounts")
    suspend fun addBankAccount(@Body request: AddBankAccountRequest): BankAccount

    @DELETE("wallet/bank-accounts/{id}")
    suspend fun deleteBankAccount(@Path("id") id: Long): MessageResponse
}
