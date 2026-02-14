package com.viecz.vieczandroid.data.repository

import android.util.Log
import com.viecz.vieczandroid.data.api.TaskApi
import com.viecz.vieczandroid.data.local.dao.TaskDao
import com.viecz.vieczandroid.data.local.entities.toEntity
import com.viecz.vieczandroid.data.local.entities.toTask
import com.viecz.vieczandroid.data.models.*
import com.viecz.vieczandroid.utils.parseErrorMessage
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull
import retrofit2.HttpException
import java.io.IOException

class TaskRepository(
    private val api: TaskApi,
    private val taskDao: TaskDao
) {

    companion object {
        private const val TAG = "TaskRepository"
    }

    suspend fun getTasks(
        page: Int = 1,
        categoryId: Long? = null,
        status: String? = null,
        search: String? = null,
        requesterId: Long? = null,
        taskerId: Long? = null
    ): Result<TasksResponse> {
        return try {
            Log.d(TAG, "Fetching tasks from network: page=$page, categoryId=$categoryId, status=$status, search=$search, requesterId=$requesterId, taskerId=$taskerId")
            val response = api.getTasks(page = page, categoryId = categoryId, status = status, search = search, requesterId = requesterId, taskerId = taskerId)
            Log.d(TAG, "Tasks fetched successfully: ${response.data.size} tasks")

            // Cache the first page of tasks
            if (page == 1 && categoryId == null && status == null && search == null && requesterId == null && taskerId == null) {
                taskDao.deleteAllTasks()
                taskDao.insertTasks(response.data.map { it.toEntity() })
                Log.d(TAG, "Cached ${response.data.size} tasks to database")
            }

            Result.success(response)
        } catch (e: HttpException) {
            Log.e(TAG, "HTTP error fetching tasks: ${e.code()}", e)
            tryLoadFromCache(page, categoryId, status, search, requesterId, taskerId, e)
        } catch (e: IOException) {
            Log.e(TAG, "Network error fetching tasks", e)
            tryLoadFromCache(page, categoryId, status, search, requesterId, taskerId, e)
        } catch (e: Exception) {
            Log.e(TAG, "Unknown error fetching tasks", e)
            Result.failure(e)
        }
    }

    private suspend fun tryLoadFromCache(
        page: Int,
        categoryId: Long?,
        status: String?,
        search: String?,
        requesterId: Long?,
        taskerId: Long?,
        originalError: Exception
    ): Result<TasksResponse> {
        // Only return cache for first page without filters
        if (page == 1 && categoryId == null && status == null && search == null && requesterId == null && taskerId == null) {
            val cachedEntities = taskDao.getAllTasks().firstOrNull()
            if (!cachedEntities.isNullOrEmpty()) {
                Log.d(TAG, "Returning ${cachedEntities.size} tasks from cache")
                val cachedTasks = cachedEntities.map { it.toTask() }
                val response = TasksResponse(
                    data = cachedTasks,
                    page = 1,
                    limit = cachedTasks.size,
                    total = cachedTasks.size
                )
                return Result.success(response)
            }
        }
        return Result.failure(originalError)
    }

    suspend fun getTask(taskId: Long): Result<Task> {
        return try {
            Log.d(TAG, "Fetching task from network: id=$taskId")
            val task = api.getTask(taskId)
            Log.d(TAG, "Task fetched successfully: ${task.title}")

            // Cache the task
            taskDao.insertTask(task.toEntity())
            Log.d(TAG, "Cached task ${task.id} to database")

            Result.success(task)
        } catch (e: HttpException) {
            Log.e(TAG, "HTTP error fetching task: ${e.code()}", e)
            tryLoadTaskFromCache(taskId, e)
        } catch (e: IOException) {
            Log.e(TAG, "Network error fetching task", e)
            tryLoadTaskFromCache(taskId, e)
        } catch (e: Exception) {
            Log.e(TAG, "Unknown error fetching task", e)
            Result.failure(e)
        }
    }

    private suspend fun tryLoadTaskFromCache(taskId: Long, originalError: Exception): Result<Task> {
        val cachedEntity = taskDao.getTaskById(taskId)
        return if (cachedEntity != null) {
            Log.d(TAG, "Returning task $taskId from cache")
            Result.success(cachedEntity.toTask())
        } else {
            Result.failure(originalError)
        }
    }

    suspend fun createTask(request: CreateTaskRequest): Result<Task> {
        return try {
            Log.d(TAG, "Creating task: ${request.title}")
            val task = api.createTask(request)
            Log.d(TAG, "Task created successfully: id=${task.id}")
            Result.success(task)
        } catch (e: HttpException) {
            val errorMessage = e.parseErrorMessage()
            Log.e(TAG, "HTTP error creating task: ${e.code()} - $errorMessage", e)
            Result.failure(Exception(errorMessage))
        } catch (e: IOException) {
            Log.e(TAG, "Network error creating task", e)
            Result.failure(Exception("Network error. Please check your connection."))
        } catch (e: Exception) {
            Log.e(TAG, "Unknown error creating task", e)
            Result.failure(e)
        }
    }

    suspend fun updateTask(taskId: Long, request: CreateTaskRequest): Result<Task> {
        return try {
            Log.d(TAG, "Updating task: id=$taskId")
            val task = api.updateTask(taskId, request)
            Log.d(TAG, "Task updated successfully")
            Result.success(task)
        } catch (e: HttpException) {
            val errorMessage = e.parseErrorMessage()
            Log.e(TAG, "HTTP error updating task: ${e.code()} - $errorMessage", e)
            Result.failure(Exception(errorMessage))
        } catch (e: IOException) {
            Log.e(TAG, "Network error updating task", e)
            Result.failure(Exception("Network error. Please check your connection."))
        } catch (e: Exception) {
            Log.e(TAG, "Unknown error updating task", e)
            Result.failure(e)
        }
    }

    suspend fun deleteTask(taskId: Long): Result<Unit> {
        return try {
            Log.d(TAG, "Deleting task: id=$taskId")
            api.deleteTask(taskId)
            Log.d(TAG, "Task deleted successfully")
            Result.success(Unit)
        } catch (e: HttpException) {
            Log.e(TAG, "HTTP error deleting task: ${e.code()}", e)
            Result.failure(e)
        } catch (e: IOException) {
            Log.e(TAG, "Network error deleting task", e)
            Result.failure(e)
        } catch (e: Exception) {
            Log.e(TAG, "Unknown error deleting task", e)
            Result.failure(e)
        }
    }

    suspend fun applyForTask(taskId: Long, request: ApplyTaskRequest): Result<TaskApplication> {
        return try {
            Log.d(TAG, "Applying for task: id=$taskId")
            val application = api.applyForTask(taskId, request)
            Log.d(TAG, "Application submitted successfully: id=${application.id}")
            Result.success(application)
        } catch (e: HttpException) {
            val errorMessage = e.parseErrorMessage()
            Log.e(TAG, "HTTP error applying for task: ${e.code()} - $errorMessage", e)
            Result.failure(Exception(errorMessage))
        } catch (e: IOException) {
            Log.e(TAG, "Network error applying for task", e)
            Result.failure(Exception("Network error. Please check your connection."))
        } catch (e: Exception) {
            Log.e(TAG, "Unknown error applying for task", e)
            Result.failure(e)
        }
    }

    suspend fun getTaskApplications(taskId: Long): Result<List<TaskApplication>> {
        return try {
            Log.d(TAG, "Fetching applications for task: id=$taskId")
            val applications = api.getTaskApplications(taskId)
            Log.d(TAG, "Applications fetched successfully: ${applications.size} applications")
            Result.success(applications)
        } catch (e: HttpException) {
            Log.e(TAG, "HTTP error fetching applications: ${e.code()}", e)
            Result.failure(e)
        } catch (e: IOException) {
            Log.e(TAG, "Network error fetching applications", e)
            Result.failure(e)
        } catch (e: IOException) {
            Log.e(TAG, "Network error fetching applications", e)
            Result.failure(e)
        } catch (e: Exception) {
            Log.e(TAG, "Unknown error fetching applications", e)
            Result.failure(e)
        }
    }

    suspend fun completeTask(taskId: Long): Result<Unit> {
        return try {
            Log.d(TAG, "Completing task: id=$taskId")
            api.completeTask(taskId)
            Log.d(TAG, "Task completed successfully")
            Result.success(Unit)
        } catch (e: HttpException) {
            Log.e(TAG, "HTTP error completing task: ${e.code()}", e)
            Result.failure(e)
        } catch (e: IOException) {
            Log.e(TAG, "Network error completing task", e)
            Result.failure(e)
        } catch (e: Exception) {
            Log.e(TAG, "Unknown error completing task", e)
            Result.failure(e)
        }
    }

    suspend fun acceptApplication(applicationId: Long): Result<AcceptApplicationResponse> {
        return try {
            Log.d(TAG, "Accepting application: id=$applicationId")
            val response = api.acceptApplication(applicationId)
            Log.d(TAG, "Application accepted successfully")
            Result.success(response)
        } catch (e: HttpException) {
            Log.e(TAG, "HTTP error accepting application: ${e.code()}", e)
            Result.failure(e)
        } catch (e: IOException) {
            Log.e(TAG, "Network error accepting application", e)
            Result.failure(e)
        } catch (e: Exception) {
            Log.e(TAG, "Unknown error accepting application", e)
            Result.failure(e)
        }
    }
}
