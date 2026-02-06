package com.viecz.vieczandroid.data.local.dao

import androidx.room.*
import com.viecz.vieczandroid.data.local.entities.CategoryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CategoryDao {

    @Query("SELECT * FROM categories WHERE is_active = 1 ORDER BY name")
    fun getAllCategories(): Flow<List<CategoryEntity>>

    @Query("SELECT * FROM categories WHERE id = :categoryId")
    suspend fun getCategoryById(categoryId: Int): CategoryEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCategory(category: CategoryEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCategories(categories: List<CategoryEntity>)

    @Update
    suspend fun updateCategory(category: CategoryEntity)

    @Delete
    suspend fun deleteCategory(category: CategoryEntity)

    @Query("DELETE FROM categories")
    suspend fun deleteAllCategories()
}
