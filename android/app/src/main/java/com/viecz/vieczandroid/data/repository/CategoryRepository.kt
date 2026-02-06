package com.viecz.vieczandroid.data.repository

import android.util.Log
import com.viecz.vieczandroid.data.api.CategoryApi
import com.viecz.vieczandroid.data.local.dao.CategoryDao
import com.viecz.vieczandroid.data.local.entities.toCategory
import com.viecz.vieczandroid.data.local.entities.toEntity
import com.viecz.vieczandroid.data.models.Category
import kotlinx.coroutines.flow.firstOrNull
import retrofit2.HttpException
import java.io.IOException

class CategoryRepository(
    private val api: CategoryApi,
    private val categoryDao: CategoryDao
) {

    companion object {
        private const val TAG = "CategoryRepository"
    }

    suspend fun getCategories(): Result<List<Category>> {
        return try {
            Log.d(TAG, "Fetching categories from network")
            val categories = api.getCategories()
            Log.d(TAG, "Categories fetched successfully: ${categories.size} categories")

            // Cache categories
            categoryDao.deleteAllCategories()
            categoryDao.insertCategories(categories.map { it.toEntity() })
            Log.d(TAG, "Cached ${categories.size} categories to database")

            Result.success(categories)
        } catch (e: HttpException) {
            Log.e(TAG, "HTTP error fetching categories: ${e.code()}", e)
            tryLoadCategoriesFromCache(e)
        } catch (e: IOException) {
            Log.e(TAG, "Network error fetching categories", e)
            tryLoadCategoriesFromCache(e)
        } catch (e: Exception) {
            Log.e(TAG, "Unknown error fetching categories", e)
            Result.failure(e)
        }
    }

    private suspend fun tryLoadCategoriesFromCache(originalError: Exception): Result<List<Category>> {
        val cachedEntities = categoryDao.getAllCategories().firstOrNull()
        return if (!cachedEntities.isNullOrEmpty()) {
            Log.d(TAG, "Returning ${cachedEntities.size} categories from cache")
            Result.success(cachedEntities.map { it.toCategory() })
        } else {
            Result.failure(originalError)
        }
    }
}
