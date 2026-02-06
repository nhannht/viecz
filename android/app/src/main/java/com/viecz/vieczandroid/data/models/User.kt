package com.viecz.vieczandroid.data.models

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class User(
    @Json(name = "id") val id: Long,
    @Json(name = "email") val email: String,
    @Json(name = "name") val name: String,
    @Json(name = "avatar_url") val avatarUrl: String? = null,
    @Json(name = "phone") val phone: String? = null,
    @Json(name = "university") val university: String,
    @Json(name = "student_id") val studentId: String? = null,
    @Json(name = "is_verified") val isVerified: Boolean,
    @Json(name = "rating") val rating: Double,
    @Json(name = "total_tasks_completed") val totalTasksCompleted: Int,
    @Json(name = "total_tasks_posted") val totalTasksPosted: Int,
    @Json(name = "total_earnings") val totalEarnings: Long,
    @Json(name = "is_tasker") val isTasker: Boolean,
    @Json(name = "tasker_bio") val taskerBio: String? = null,
    @Json(name = "created_at") val createdAt: String,
    @Json(name = "updated_at") val updatedAt: String
)
