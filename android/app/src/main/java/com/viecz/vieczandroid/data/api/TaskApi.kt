package com.viecz.vieczandroid.data.api

import com.viecz.vieczandroid.data.models.*
import retrofit2.http.*

interface TaskApi {
    @GET("tasks")
    suspend fun getTasks(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("category_id") categoryId: Long? = null,
        @Query("status") status: String? = null,
        @Query("search") search: String? = null,
        @Query("requester_id") requesterId: Long? = null,
        @Query("tasker_id") taskerId: Long? = null
    ): TasksResponse

    @GET("tasks/{id}")
    suspend fun getTask(@Path("id") taskId: Long): Task

    @POST("tasks")
    suspend fun createTask(@Body request: CreateTaskRequest): Task

    @PUT("tasks/{id}")
    suspend fun updateTask(
        @Path("id") taskId: Long,
        @Body request: CreateTaskRequest
    ): Task

    @DELETE("tasks/{id}")
    suspend fun deleteTask(@Path("id") taskId: Long)

    @POST("tasks/{id}/applications")
    suspend fun applyForTask(
        @Path("id") taskId: Long,
        @Body request: ApplyTaskRequest
    ): TaskApplication

    @GET("tasks/{id}/applications")
    suspend fun getTaskApplications(@Path("id") taskId: Long): List<TaskApplication>

    @POST("tasks/{id}/complete")
    suspend fun completeTask(@Path("id") taskId: Long): MessageResponse

    @POST("applications/{id}/accept")
    suspend fun acceptApplication(@Path("id") applicationId: Long): AcceptApplicationResponse
}
