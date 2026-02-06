package com.viecz.vieczandroid.data.models

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class Message(
    @Json(name = "id")
    val id: Long,

    @Json(name = "created_at")
    val createdAt: String,

    @Json(name = "conversation_id")
    val conversationId: Long,

    @Json(name = "sender_id")
    val senderId: Long,

    @Json(name = "content")
    val content: String,

    @Json(name = "is_read")
    val isRead: Boolean = false,

    @Json(name = "read_at")
    val readAt: String? = null,

    @Json(name = "sender")
    val sender: User? = null
)

/**
 * WebSocket message format for real-time communication
 */
@JsonClass(generateAdapter = true)
data class WebSocketMessage(
    @Json(name = "type")
    val type: String, // "message", "typing", "read", "join", "error"

    @Json(name = "conversation_id")
    val conversationId: Long = 0,

    @Json(name = "message_id")
    val messageId: Long = 0,

    @Json(name = "sender_id")
    val senderId: Long = 0,

    @Json(name = "content")
    val content: String = "",

    @Json(name = "created_at")
    val createdAt: String = "",

    @Json(name = "error")
    val error: String? = null
)

/**
 * WebSocket connection states
 */
enum class WebSocketState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    ERROR
}
