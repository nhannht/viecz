package com.viecz.vieczandroid.data.websocket

import android.util.Log
import com.squareup.moshi.Moshi
import com.viecz.vieczandroid.data.models.WebSocketMessage
import com.viecz.vieczandroid.data.models.WebSocketState
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import com.viecz.vieczandroid.data.api.RetrofitClient
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WebSocketClient @Inject constructor(
    private val moshi: Moshi
) {
    companion object {
        private const val TAG = "WebSocketClient"
        private val WS_URL: String = RetrofitClient.BASE_URL
            .replace("https://", "wss://")
            .replace("http://", "ws://")
            .trimEnd('/') + "/ws"
    }

    private var webSocket: WebSocket? = null
    private val messageAdapter = moshi.adapter(WebSocketMessage::class.java)

    // Connection state
    private val _connectionState = MutableStateFlow(WebSocketState.DISCONNECTED)
    val connectionState: StateFlow<WebSocketState> = _connectionState.asStateFlow()

    // Incoming messages channel
    val messages = Channel<WebSocketMessage>(Channel.UNLIMITED)

    private val client = OkHttpClient.Builder()
        .pingInterval(30, TimeUnit.SECONDS)
        .build()

    /**
     * Connect to WebSocket server with JWT token
     */
    fun connect(token: String) {
        if (_connectionState.value == WebSocketState.CONNECTED) {
            Log.d(TAG, "Already connected")
            return
        }

        _connectionState.value = WebSocketState.CONNECTING
        Log.d(TAG, "Connecting to WebSocket with token...")

        val request = Request.Builder()
            .url("$WS_URL?token=$token")
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d(TAG, "WebSocket connected")
                _connectionState.value = WebSocketState.CONNECTED
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d(TAG, "Received message: $text")
                try {
                    val message = messageAdapter.fromJson(text)
                    if (message != null) {
                        messages.trySend(message)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing message: ${e.message}", e)
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "WebSocket error: ${t.message}", t)
                _connectionState.value = WebSocketState.ERROR
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket closed: $code - $reason")
                _connectionState.value = WebSocketState.DISCONNECTED
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket closing: $code - $reason")
                webSocket.close(1000, null)
            }
        })
    }

    /**
     * Send a message through WebSocket
     */
    fun sendMessage(message: WebSocketMessage): Boolean {
        return try {
            val json = messageAdapter.toJson(message)
            val sent = webSocket?.send(json) ?: false
            Log.d(TAG, "Message sent: $sent - $json")
            sent
        } catch (e: Exception) {
            Log.e(TAG, "Error sending message: ${e.message}", e)
            false
        }
    }

    /**
     * Join a conversation room
     */
    fun joinConversation(conversationId: Long) {
        val message = WebSocketMessage(
            type = "join",
            conversationId = conversationId
        )
        sendMessage(message)
    }

    /**
     * Send a chat message
     */
    fun sendChatMessage(conversationId: Long, content: String) {
        val message = WebSocketMessage(
            type = "message",
            conversationId = conversationId,
            content = content
        )
        sendMessage(message)
    }

    /**
     * Send typing indicator
     */
    fun sendTypingIndicator(conversationId: Long) {
        val message = WebSocketMessage(
            type = "typing",
            conversationId = conversationId
        )
        sendMessage(message)
    }

    /**
     * Mark conversation as read
     */
    fun markAsRead(conversationId: Long) {
        val message = WebSocketMessage(
            type = "read",
            conversationId = conversationId
        )
        sendMessage(message)
    }

    /**
     * Disconnect from WebSocket
     */
    fun disconnect() {
        webSocket?.close(1000, "Client closed")
        webSocket = null
        _connectionState.value = WebSocketState.DISCONNECTED
        Log.d(TAG, "WebSocket disconnected")
    }
}
