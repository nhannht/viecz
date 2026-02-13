package com.viecz.vieczandroid.ui.viewmodels

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.models.Conversation
import com.viecz.vieczandroid.data.models.Message
import com.viecz.vieczandroid.data.models.TaskStatus
import com.viecz.vieczandroid.data.models.WebSocketState
import com.viecz.vieczandroid.data.repository.MessageRepository
import com.viecz.vieczandroid.data.websocket.WebSocketClient
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChatUiState(
    val conversation: Conversation? = null,
    val messages: List<Message> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val connectionState: WebSocketState = WebSocketState.DISCONNECTED,
    val isTyping: Boolean = false,
    val currentUserId: Long = 0,
    val isTaskFinished: Boolean = false
)

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val messageRepository: MessageRepository,
    private val webSocketClient: WebSocketClient,
    private val tokenManager: TokenManager
) : ViewModel() {

    companion object {
        private const val TAG = "ChatViewModel"
    }

    private val _uiState = MutableStateFlow(ChatUiState())
    val uiState: StateFlow<ChatUiState> = _uiState.asStateFlow()

    private var currentConversationId: Long = 0

    init {
        // Load current user ID
        viewModelScope.launch {
            tokenManager.userId.collect { userId ->
                if (userId != null) {
                    _uiState.update { it.copy(currentUserId = userId) }
                }
            }
        }

        // Observe WebSocket connection state
        viewModelScope.launch {
            webSocketClient.connectionState.collect { state ->
                _uiState.update { it.copy(connectionState = state) }
            }
        }

        // Observe incoming WebSocket messages
        viewModelScope.launch {
            for (wsMessage in webSocketClient.messages) {
                when (wsMessage.type) {
                    "message" -> {
                        // Add incoming message to the list
                        val newMessage = Message(
                            id = wsMessage.messageId,
                            createdAt = wsMessage.createdAt,
                            conversationId = wsMessage.conversationId,
                            senderId = wsMessage.senderId,
                            content = wsMessage.content,
                            isRead = false
                        )
                        _uiState.update { state ->
                            state.copy(messages = state.messages + newMessage)
                        }
                        Log.d(TAG, "Received message: ${wsMessage.content}")
                    }
                    "message_sent" -> {
                        // Message sent confirmation
                        Log.d(TAG, "Message sent confirmed: ${wsMessage.messageId}")
                    }
                    "typing" -> {
                        // Someone is typing
                        _uiState.update { it.copy(isTyping = true) }
                        // Auto-clear after 3 seconds
                        viewModelScope.launch {
                            kotlinx.coroutines.delay(3000)
                            _uiState.update { it.copy(isTyping = false) }
                        }
                    }
                    "joined" -> {
                        Log.d(TAG, "Joined conversation: ${wsMessage.conversationId}")
                    }
                    "error" -> {
                        Log.e(TAG, "WebSocket error: ${wsMessage.error}")
                        _uiState.update { it.copy(error = wsMessage.error) }
                    }
                }
            }
        }
    }

    /**
     * Load conversation and connect to WebSocket
     */
    fun loadConversation(conversationId: Long) {
        currentConversationId = conversationId
        _uiState.update { it.copy(isLoading = true, error = null) }

        viewModelScope.launch {
            // Load conversation metadata to check task status
            messageRepository.getConversations().fold(
                onSuccess = { conversations ->
                    val conversation = conversations.find { it.id == conversationId }
                    val taskFinished = conversation?.task?.status == TaskStatus.COMPLETED ||
                            conversation?.task?.status == TaskStatus.CANCELLED
                    _uiState.update { it.copy(conversation = conversation, isTaskFinished = taskFinished) }
                },
                onFailure = { error ->
                    Log.e(TAG, "Error fetching conversation metadata: ${error.message}", error)
                }
            )

            // Load message history
            messageRepository.getMessages(conversationId).fold(
                onSuccess = { messages ->
                    _uiState.update { state ->
                        state.copy(
                            messages = messages.reversed(), // Oldest first
                            isLoading = false
                        )
                    }
                    Log.d(TAG, "Loaded ${messages.size} messages")

                    // Only connect WebSocket if task is still active
                    if (!_uiState.value.isTaskFinished) {
                        connectWebSocket()
                    }
                },
                onFailure = { error ->
                    _uiState.update { state ->
                        state.copy(
                            error = error.message ?: "Failed to load messages",
                            isLoading = false
                        )
                    }
                    Log.e(TAG, "Error loading messages: ${error.message}", error)
                }
            )
        }
    }

    /**
     * Connect to WebSocket and join conversation
     */
    private suspend fun connectWebSocket() {
        // Get token from Flow
        val token = tokenManager.accessToken.first()
        if (token.isNullOrEmpty()) {
            _uiState.update { it.copy(error = "Not authenticated") }
            return
        }

        webSocketClient.connect(token)

        // Wait a bit for connection
        kotlinx.coroutines.delay(1000)

        // Join the conversation room
        webSocketClient.joinConversation(currentConversationId)
        Log.d(TAG, "Joined conversation: $currentConversationId")
    }

    /**
     * Send a message
     */
    fun sendMessage(content: String) {
        if (content.isBlank()) return

        viewModelScope.launch {
            // Send via WebSocket
            webSocketClient.sendChatMessage(currentConversationId, content)

            // Optimistically add to UI (will be confirmed via WebSocket)
            val optimisticMessage = Message(
                id = 0, // Temporary ID
                createdAt = java.time.Instant.now().toString(),
                conversationId = currentConversationId,
                senderId = _uiState.value.currentUserId,
                content = content,
                isRead = false
            )

            _uiState.update { state ->
                state.copy(messages = state.messages + optimisticMessage)
            }

            Log.d(TAG, "Sent message: $content")
        }
    }

    /**
     * Send typing indicator
     */
    fun sendTypingIndicator() {
        webSocketClient.sendTypingIndicator(currentConversationId)
    }

    /**
     * Mark conversation as read
     */
    fun markAsRead() {
        webSocketClient.markAsRead(currentConversationId)
    }

    /**
     * Disconnect from WebSocket when done
     */
    override fun onCleared() {
        super.onCleared()
        webSocketClient.disconnect()
        Log.d(TAG, "ViewModel cleared, WebSocket disconnected")
    }
}
