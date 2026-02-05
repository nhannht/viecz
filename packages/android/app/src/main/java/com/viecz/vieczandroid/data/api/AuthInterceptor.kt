package com.viecz.vieczandroid.data.api

import com.viecz.vieczandroid.data.local.TokenManager
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

/**
 * Interceptor that adds JWT authentication token to API requests.
 *
 * Automatically injects the Authorization header with Bearer token
 * for all requests that require authentication.
 */
class AuthInterceptor(
    private val tokenManager: TokenManager
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        // Get the access token from TokenManager
        // Using runBlocking since Interceptor.intercept is synchronous
        val token = runBlocking {
            tokenManager.accessToken.first()
        }

        // If token exists, add Authorization header
        val request = if (token != null) {
            originalRequest.newBuilder()
                .addHeader("Authorization", "Bearer $token")
                .build()
        } else {
            originalRequest
        }

        return chain.proceed(request)
    }
}
