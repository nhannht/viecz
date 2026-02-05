package com.viecz.vieczandroid.data.repository

import android.util.Log
import com.viecz.vieczandroid.data.api.RetrofitClient
import com.viecz.vieczandroid.data.api.UpdateProfileRequest
import com.viecz.vieczandroid.data.models.User
import retrofit2.HttpException
import java.io.IOException

class UserRepository {
    private val api = RetrofitClient.userApi

    companion object {
        private const val TAG = "UserRepository"
    }

    suspend fun getUserProfile(userId: Long): Result<User> {
        return try {
            Log.d(TAG, "Fetching user profile: id=$userId")
            val user = api.getUserProfile(userId)
            Log.d(TAG, "User profile fetched successfully: ${user.name}")
            Result.success(user)
        } catch (e: HttpException) {
            Log.e(TAG, "HTTP error fetching user profile: ${e.code()}", e)
            Result.failure(e)
        } catch (e: IOException) {
            Log.e(TAG, "Network error fetching user profile", e)
            Result.failure(e)
        } catch (e: Exception) {
            Log.e(TAG, "Unknown error fetching user profile", e)
            Result.failure(e)
        }
    }

    suspend fun getMyProfile(): Result<User> {
        return try {
            Log.d(TAG, "Fetching my profile")
            val user = api.getMyProfile()
            Log.d(TAG, "My profile fetched successfully: ${user.name}")
            Result.success(user)
        } catch (e: HttpException) {
            Log.e(TAG, "HTTP error fetching my profile: ${e.code()}", e)
            Result.failure(e)
        } catch (e: IOException) {
            Log.e(TAG, "Network error fetching my profile", e)
            Result.failure(e)
        } catch (e: Exception) {
            Log.e(TAG, "Unknown error fetching my profile", e)
            Result.failure(e)
        }
    }

    suspend fun updateProfile(request: UpdateProfileRequest): Result<User> {
        return try {
            Log.d(TAG, "Updating profile")
            val user = api.updateProfile(request)
            Log.d(TAG, "Profile updated successfully")
            Result.success(user)
        } catch (e: HttpException) {
            Log.e(TAG, "HTTP error updating profile: ${e.code()}", e)
            Result.failure(e)
        } catch (e: IOException) {
            Log.e(TAG, "Network error updating profile", e)
            Result.failure(e)
        } catch (e: Exception) {
            Log.e(TAG, "Unknown error updating profile", e)
            Result.failure(e)
        }
    }

    suspend fun becomeTasker(): Result<User> {
        return try {
            Log.d(TAG, "Becoming tasker")
            val user = api.becomeTasker()
            Log.d(TAG, "Successfully became tasker")
            Result.success(user)
        } catch (e: HttpException) {
            Log.e(TAG, "HTTP error becoming tasker: ${e.code()}", e)
            Result.failure(e)
        } catch (e: IOException) {
            Log.e(TAG, "Network error becoming tasker", e)
            Result.failure(e)
        } catch (e: Exception) {
            Log.e(TAG, "Unknown error becoming tasker", e)
            Result.failure(e)
        }
    }
}
