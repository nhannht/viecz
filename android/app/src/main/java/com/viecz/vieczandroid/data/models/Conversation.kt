package com.viecz.vieczandroid.data.models

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class Conversation(
    @Json(name = "id")
    val id: Long,

    @Json(name = "created_at")
    val createdAt: String,

    @Json(name = "updated_at")
    val updatedAt: String,

    @Json(name = "task_id")
    val taskId: Long,

    @Json(name = "poster_id")
    val posterId: Long,

    @Json(name = "tasker_id")
    val taskerId: Long,

    @Json(name = "last_message_at")
    val lastMessageAt: String? = null,

    @Json(name = "last_message")
    val lastMessage: String? = null,

    @Json(name = "task")
    val task: Task? = null,

    @Json(name = "poster")
    val poster: User? = null,

    @Json(name = "tasker")
    val tasker: User? = null
)

@JsonClass(generateAdapter = true)
data class CreateConversationRequest(
    @Json(name = "task_id")
    val taskId: Long,

    @Json(name = "tasker_id")
    val taskerId: Long
)
