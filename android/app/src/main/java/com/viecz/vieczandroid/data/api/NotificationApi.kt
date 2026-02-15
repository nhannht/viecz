package com.viecz.vieczandroid.data.api

import com.viecz.vieczandroid.data.models.MessageResponse
import com.viecz.vieczandroid.data.models.NotificationListResponse
import com.viecz.vieczandroid.data.models.UnreadCountResponse
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface NotificationApi {
    @GET("notifications")
    suspend fun getNotifications(
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): NotificationListResponse

    @GET("notifications/unread-count")
    suspend fun getUnreadCount(): UnreadCountResponse

    @POST("notifications/{id}/read")
    suspend fun markAsRead(@Path("id") id: Long): MessageResponse

    @POST("notifications/read-all")
    suspend fun markAllAsRead(): MessageResponse

    @DELETE("notifications/{id}")
    suspend fun deleteNotification(@Path("id") id: Long): MessageResponse
}
