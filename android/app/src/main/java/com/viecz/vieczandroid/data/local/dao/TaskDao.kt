package com.viecz.vieczandroid.data.local.dao

import androidx.room.*
import com.viecz.vieczandroid.data.local.entities.TaskEntity
import com.viecz.vieczandroid.data.models.TaskStatus
import kotlinx.coroutines.flow.Flow

@Dao
interface TaskDao {

    @Query("SELECT * FROM tasks ORDER BY created_at DESC")
    fun getAllTasks(): Flow<List<TaskEntity>>

    @Query("SELECT * FROM tasks WHERE id = :taskId")
    suspend fun getTaskById(taskId: Long): TaskEntity?

    @Query("SELECT * FROM tasks WHERE category_id = :categoryId ORDER BY created_at DESC")
    fun getTasksByCategory(categoryId: Long): Flow<List<TaskEntity>>

    @Query("SELECT * FROM tasks WHERE status = :status ORDER BY created_at DESC")
    fun getTasksByStatus(status: TaskStatus): Flow<List<TaskEntity>>

    @Query("SELECT * FROM tasks WHERE title LIKE '%' || :query || '%' OR description LIKE '%' || :query || '%' ORDER BY created_at DESC")
    fun searchTasks(query: String): Flow<List<TaskEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTask(task: TaskEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTasks(tasks: List<TaskEntity>)

    @Update
    suspend fun updateTask(task: TaskEntity)

    @Delete
    suspend fun deleteTask(task: TaskEntity)

    @Query("DELETE FROM tasks")
    suspend fun deleteAllTasks()

    @Query("DELETE FROM tasks WHERE id = :taskId")
    suspend fun deleteTaskById(taskId: Long)
}
