package com.viecz.vieczandroid.data.api

import android.util.Log
import com.viecz.vieczandroid.data.auth.AuthEventManager
import com.viecz.vieczandroid.data.local.TokenManager
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

/**
 * Interceptor that adds JWT authentication token to API requests
 * and handles 401 Unauthorized responses by clearing tokens
 * and emitting an unauthorized event.
 */
class AuthInterceptor(
    private val tokenManager: TokenManager,
    private val authEventManager: AuthEventManager
) : Interceptor {

    companion object {
        private const val TAG = "AuthInterceptor"
    }

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        val token = runBlocking {
            tokenManager.accessToken.first()
        }

        val request = if (token != null) {
            originalRequest.newBuilder()
                .addHeader("Authorization", "Bearer $token")
                .build()
        } else {
            originalRequest
        }

        val response = chain.proceed(request)

        // Only handle 401 for authenticated endpoints — skip auth endpoints
        // where 401 means "wrong credentials", not "expired token"
        val path = originalRequest.url.encodedPath
        val isAuthEndpoint = path.contains("/auth/login") || path.contains("/auth/register")

        if (response.code == 401 && !isAuthEndpoint) {
            Log.d(TAG, "401 Unauthorized received, clearing tokens")
            runBlocking {
                tokenManager.clearTokens()
            }
            authEventManager.emitUnauthorized()
        }

        return response
    }
}
