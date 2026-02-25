package com.viecz.vieczandroid.data.api

import com.viecz.vieczandroid.data.models.GoogleLoginRequest
import com.viecz.vieczandroid.data.models.LoginRequest
import com.viecz.vieczandroid.data.models.PhoneLoginRequest
import com.viecz.vieczandroid.data.models.RefreshTokenRequest
import com.viecz.vieczandroid.data.models.RefreshTokenResponse
import com.viecz.vieczandroid.data.models.RegisterRequest
import com.viecz.vieczandroid.data.models.TokenResponse
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthApi {
    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): TokenResponse

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): TokenResponse

    @POST("auth/google")
    suspend fun googleLogin(@Body request: GoogleLoginRequest): TokenResponse

    @POST("auth/phone")
    suspend fun phoneLogin(@Body request: PhoneLoginRequest): TokenResponse

    @POST("auth/refresh")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): RefreshTokenResponse
}
