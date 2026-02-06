package com.viecz.vieczandroid.data.api

import com.viecz.vieczandroid.data.models.Conversation
import com.viecz.vieczandroid.data.models.CreateConversationRequest
import com.viecz.vieczandroid.data.models.Message
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface MessageApi {
    /**
     * Get all conversations for the authenticated user
     */
    @GET("conversations")
    suspend fun getConversations(): List<Conversation>

    /**
     * Create a new conversation for a task
     */
    @POST("conversations")
    suspend fun createConversation(@Body request: CreateConversationRequest): Conversation

    /**
     * Get message history for a conversation
     */
    @GET("conversations/{id}/messages")
    suspend fun getConversationMessages(
        @Path("id") conversationId: Long,
        @Query("limit") limit: Int = 50,
        @Query("offset") offset: Int = 0
    ): List<Message>
}
