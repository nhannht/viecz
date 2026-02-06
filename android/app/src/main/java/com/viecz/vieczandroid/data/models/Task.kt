package com.viecz.vieczandroid.data.models

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class Task(
    @Json(name = "id") val id: Long,
    @Json(name = "requester_id") val requesterId: Long,
    @Json(name = "tasker_id") val taskerId: Long? = null,
    @Json(name = "category_id") val categoryId: Long,
    @Json(name = "title") val title: String,
    @Json(name = "description") val description: String,
    @Json(name = "price") val price: Long,
    @Json(name = "location") val location: String,
    @Json(name = "latitude") val latitude: Double? = null,
    @Json(name = "longitude") val longitude: Double? = null,
    @Json(name = "status") val status: TaskStatus,
    @Json(name = "created_at") val createdAt: String,
    @Json(name = "updated_at") val updatedAt: String,
    @Json(name = "user_has_applied") val userHasApplied: Boolean = false
)

enum class TaskStatus {
    @Json(name = "open")
    OPEN,
    @Json(name = "in_progress")
    IN_PROGRESS,
    @Json(name = "completed")
    COMPLETED,
    @Json(name = "cancelled")
    CANCELLED
}

@JsonClass(generateAdapter = true)
data class CreateTaskRequest(
    @Json(name = "title") val title: String,
    @Json(name = "description") val description: String,
    @Json(name = "category_id") val categoryId: Long,
    @Json(name = "price") val price: Long,
    @Json(name = "location") val location: String,
    @Json(name = "latitude") val latitude: Double? = null,
    @Json(name = "longitude") val longitude: Double? = null
)

@JsonClass(generateAdapter = true)
data class TasksResponse(
    @Json(name = "data") val data: List<Task>,
    @Json(name = "page") val page: Int,
    @Json(name = "limit") val limit: Int,
    @Json(name = "total") val total: Int
)
