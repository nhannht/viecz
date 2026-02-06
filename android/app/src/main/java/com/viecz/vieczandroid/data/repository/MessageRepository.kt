package com.viecz.vieczandroid.data.repository

import android.util.Log
import com.viecz.vieczandroid.data.api.MessageApi
import com.viecz.vieczandroid.data.models.Conversation
import com.viecz.vieczandroid.data.models.CreateConversationRequest
import com.viecz.vieczandroid.data.models.Message
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MessageRepository @Inject constructor(
    private val messageApi: MessageApi
) {
    companion object {
        private const val TAG = "MessageRepository"
    }

    /**
     * Get all conversations for the current user
     */
    suspend fun getConversations(): Result<List<Conversation>> {
        return try {
            val conversations = messageApi.getConversations()
            Log.d(TAG, "Fetched ${conversations.size} conversations")
            Result.success(conversations)
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching conversations: ${e.message}", e)
            Result.failure(e)
        }
    }

    /**
     * Create a new conversation for a task
     */
    suspend fun createConversation(taskId: Long, taskerId: Long): Result<Conversation> {
        return try {
            val request = CreateConversationRequest(taskId, taskerId)
            val conversation = messageApi.createConversation(request)
            Log.d(TAG, "Created conversation: ${conversation.id}")
            Result.success(conversation)
        } catch (e: Exception) {
            Log.e(TAG, "Error creating conversation: ${e.message}", e)
            Result.failure(e)
        }
    }

    /**
     * Get message history for a conversation
     */
    suspend fun getMessages(
        conversationId: Long,
        limit: Int = 50,
        offset: Int = 0
    ): Result<List<Message>> {
        return try {
            val messages = messageApi.getConversationMessages(conversationId, limit, offset)
            Log.d(TAG, "Fetched ${messages.size} messages for conversation $conversationId")
            Result.success(messages)
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching messages: ${e.message}", e)
            Result.failure(e)
        }
    }
}
