package com.viecz.vieczandroid.data.repository

import android.util.Log
import com.viecz.vieczandroid.data.api.RetrofitClient
import com.viecz.vieczandroid.data.models.Category
import retrofit2.HttpException
import java.io.IOException

class CategoryRepository {
    private val api = RetrofitClient.categoryApi

    companion object {
        private const val TAG = "CategoryRepository"
    }

    suspend fun getCategories(): Result<List<Category>> {
        return try {
            Log.d(TAG, "Fetching categories")
            val response = api.getCategories()
            Log.d(TAG, "Categories fetched successfully: ${response.categories.size} categories")
            Result.success(response.categories)
        } catch (e: HttpException) {
            Log.e(TAG, "HTTP error fetching categories: ${e.code()}", e)
            Result.failure(e)
        } catch (e: IOException) {
            Log.e(TAG, "Network error fetching categories", e)
            Result.failure(e)
        } catch (e: Exception) {
            Log.e(TAG, "Unknown error fetching categories", e)
            Result.failure(e)
        }
    }
}
