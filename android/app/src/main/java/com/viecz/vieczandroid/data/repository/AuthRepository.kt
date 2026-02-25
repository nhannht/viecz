package com.viecz.vieczandroid.data.repository

import android.util.Log
import com.viecz.vieczandroid.data.api.AuthApi
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.models.GoogleLoginRequest
import com.viecz.vieczandroid.data.models.LoginRequest
import com.viecz.vieczandroid.data.models.PhoneLoginRequest
import com.viecz.vieczandroid.data.models.RefreshTokenRequest
import com.viecz.vieczandroid.data.models.RegisterRequest
import com.viecz.vieczandroid.data.models.TokenResponse
import com.viecz.vieczandroid.data.models.User
import org.json.JSONObject
import retrofit2.HttpException
import java.io.IOException

class AuthRepository(
    private val api: AuthApi,
    private val tokenManager: TokenManager
) {
    companion object {
        private const val TAG = "AuthRepository"
    }

    /**
     * Parse error response from backend
     */
    private fun parseErrorMessage(exception: Exception): String {
        return when (exception) {
            is HttpException -> {
                try {
                    val errorBody = exception.response()?.errorBody()?.string()
                    if (errorBody != null) {
                        val json = JSONObject(errorBody)
                        json.optString("error", "An error occurred")
                    } else {
                        "An error occurred"
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to parse error response", e)
                    "An error occurred"
                }
            }
            is IOException -> "Network error. Please check your connection."
            else -> exception.message ?: "An unknown error occurred"
        }
    }

    /**
     * Register a new user
     */
    suspend fun register(email: String, password: String, name: String): Result<User> {
        return try {
            Log.d(TAG, "Registering user: $email")
            val response = api.register(RegisterRequest(email, password, name))

            // Save tokens
            tokenManager.saveTokens(response.accessToken, response.refreshToken)
            tokenManager.saveUserInfo(response.user.id, response.user.email, response.user.name, response.user.isTasker)

            Log.d(TAG, "Registration successful for user ID: ${response.user.id}")
            Result.success(response.user)
        } catch (e: Exception) {
            val errorMessage = parseErrorMessage(e)
            Log.e(TAG, "Registration failed: $errorMessage", e)
            Result.failure(Exception(errorMessage))
        }
    }

    /**
     * Login with email and password
     */
    suspend fun login(email: String, password: String): Result<User> {
        return try {
            Log.d(TAG, "Logging in user: $email")
            val response = api.login(LoginRequest(email, password))

            // Save tokens
            tokenManager.saveTokens(response.accessToken, response.refreshToken)
            tokenManager.saveUserInfo(response.user.id, response.user.email, response.user.name, response.user.isTasker)

            Log.d(TAG, "Login successful for user ID: ${response.user.id}")
            Result.success(response.user)
        } catch (e: Exception) {
            val errorMessage = parseErrorMessage(e)
            Log.e(TAG, "Login failed: $errorMessage", e)
            Result.failure(Exception(errorMessage))
        }
    }

    /**
     * Login with Google ID token
     */
    suspend fun loginWithGoogle(idToken: String): Result<User> {
        return try {
            Log.d(TAG, "Logging in with Google")
            val response = api.googleLogin(GoogleLoginRequest(idToken))

            // Save tokens
            tokenManager.saveTokens(response.accessToken, response.refreshToken)
            tokenManager.saveUserInfo(response.user.id, response.user.email, response.user.name, response.user.isTasker)

            Log.d(TAG, "Google login successful for user ID: ${response.user.id}")
            Result.success(response.user)
        } catch (e: Exception) {
            val errorMessage = parseErrorMessage(e)
            Log.e(TAG, "Google login failed: $errorMessage", e)
            Result.failure(Exception(errorMessage))
        }
    }

    /**
     * Login with Firebase phone auth ID token
     */
    suspend fun loginWithPhone(idToken: String): Result<User> {
        return try {
            Log.d(TAG, "Logging in with phone")
            val response = api.phoneLogin(PhoneLoginRequest(idToken))

            // Save tokens
            tokenManager.saveTokens(response.accessToken, response.refreshToken)
            tokenManager.saveUserInfo(response.user.id, response.user.email, response.user.name, response.user.isTasker)

            Log.d(TAG, "Phone login successful for user ID: ${response.user.id}")
            Result.success(response.user)
        } catch (e: Exception) {
            val errorMessage = parseErrorMessage(e)
            Log.e(TAG, "Phone login failed: $errorMessage", e)
            Result.failure(Exception(errorMessage))
        }
    }

    /**
     * Refresh access token using refresh token
     */
    suspend fun refreshAccessToken(refreshToken: String): Result<String> {
        return try {
            Log.d(TAG, "Refreshing access token")
            val response = api.refreshToken(RefreshTokenRequest(refreshToken))

            // Update access token
            tokenManager.updateAccessToken(response.accessToken)

            Log.d(TAG, "Access token refreshed successfully")
            Result.success(response.accessToken)
        } catch (e: Exception) {
            Log.e(TAG, "Token refresh failed", e)
            Result.failure(e)
        }
    }

    /**
     * Logout (clear all tokens)
     */
    suspend fun logout() {
        Log.d(TAG, "Logging out user")
        tokenManager.clearTokens()
    }
}
