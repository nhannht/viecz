package com.viecz.vieczandroid.data.models

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class TaskApplication(
    @Json(name = "id") val id: Long,
    @Json(name = "task_id") val taskId: Long,
    @Json(name = "tasker_id") val taskerId: Long,
    @Json(name = "proposed_price") val proposedPrice: Long? = null,
    @Json(name = "message") val message: String? = null,
    @Json(name = "status") val status: ApplicationStatus,
    @Json(name = "created_at") val createdAt: String,
    @Json(name = "updated_at") val updatedAt: String
)

enum class ApplicationStatus {
    @Json(name = "pending")
    PENDING,
    @Json(name = "accepted")
    ACCEPTED,
    @Json(name = "rejected")
    REJECTED
}

@JsonClass(generateAdapter = true)
data class ApplyTaskRequest(
    @Json(name = "proposed_price") val proposedPrice: Long? = null,
    @Json(name = "message") val message: String? = null
)

@JsonClass(generateAdapter = true)
data class AcceptApplicationResponse(
    @Json(name = "message") val message: String
)
