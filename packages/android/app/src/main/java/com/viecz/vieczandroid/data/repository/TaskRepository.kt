package com.viecz.vieczandroid.data.repository

import android.util.Log
import com.viecz.vieczandroid.data.api.TaskApi
import com.viecz.vieczandroid.data.models.*
import retrofit2.HttpException
import java.io.IOException

class TaskRepository(
    private val api: TaskApi
) {

    companion object {
        private const val TAG = "TaskRepository"
    }

    suspend fun getTasks(
        page: Int = 1,
        categoryId: Long? = null,
        status: String? = null,
        search: String? = null
    ): Result<TasksResponse> {
        return try {
            Log.d(TAG, "Fetching tasks: page=$page, categoryId=$categoryId, status=$status, search=$search")
            val response = api.getTasks(page = page, categoryId = categoryId, status = status, search = search)
            Log.d(TAG, "Tasks fetched successfully: ${response.data.size} tasks")
            Result.success(response)
        } catch (e: HttpException) {
            Log.e(TAG, "HTTP error fetching tasks: ${e.code()}", e)
            Result.failure(e)
        } catch (e: IOException) {
            Log.e(TAG, "Network error fetching tasks", e)
            Result.failure(e)
        } catch (e: Exception) {
            Log.e(TAG, "Unknown error fetching tasks", e)
            Result.failure(e)
        }
    }

    suspend fun getTask(taskId: Long): Result<Task> {
        return try {
            Log.d(TAG, "Fetching task: id=$taskId")
            val task = api.getTask(taskId)
            Log.d(TAG, "Task fetched successfully: ${task.title}")
            Result.success(task)
        } catch (e: HttpException) {
            Log.e(TAG, "HTTP error fetching task: ${e.code()}", e)
            Result.failure(e)
        } catch (e: IOException) {
            Log.e(TAG, "Network error fetching task", e)
            Result.failure(e)
        } catch (e: Exception) {
            Log.e(TAG, "Unknown error fetching task", e)
            Result.failure(e)
        }
    }

    suspend fun createTask(request: CreateTaskRequest): Result<Task> {
        return try {
            Log.d(TAG, "Creating task: ${request.title}")
            val task = api.createTask(request)
            Log.d(TAG, "Task created successfully: id=${task.id}")
            Result.success(task)
        } catch (e: HttpException) {
            Log.e(TAG, "HTTP error creating task: ${e.code()}", e)
            Result.failure(e)
        } catch (e: IOException) {
            Log.e(TAG, "Network error creating task", e)
            Result.failure(e)
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
            Log.e(TAG, "HTTP error updating task: ${e.code()}", e)
            Result.failure(e)
        } catch (e: IOException) {
            Log.e(TAG, "Network error updating task", e)
            Result.failure(e)
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
            Log.e(TAG, "HTTP error applying for task: ${e.code()}", e)
            Result.failure(e)
        } catch (e: IOException) {
            Log.e(TAG, "Network error applying for task", e)
            Result.failure(e)
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

    suspend fun completeTask(taskId: Long): Result<Task> {
        return try {
            Log.d(TAG, "Completing task: id=$taskId")
            val task = api.completeTask(taskId)
            Log.d(TAG, "Task completed successfully")
            Result.success(task)
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
