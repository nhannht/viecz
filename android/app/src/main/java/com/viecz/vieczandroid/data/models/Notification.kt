package com.viecz.vieczandroid.data.models

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class ServerNotification(
    @Json(name = "id") val id: Long,
    @Json(name = "user_id") val userId: Long,
    @Json(name = "type") val type: String,
    @Json(name = "title") val title: String,
    @Json(name = "message") val message: String,
    @Json(name = "task_id") val taskId: Long? = null,
    @Json(name = "is_read") val isRead: Boolean = false,
    @Json(name = "created_at") val createdAt: String
)

@JsonClass(generateAdapter = true)
data class NotificationListResponse(
    @Json(name = "notifications") val notifications: List<ServerNotification>,
    @Json(name = "total") val total: Long
)

@JsonClass(generateAdapter = true)
data class UnreadCountResponse(
    @Json(name = "unread_count") val unreadCount: Long
)
