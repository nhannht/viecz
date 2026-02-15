package com.viecz.vieczandroid.data.repository

import android.util.Log
import com.viecz.vieczandroid.data.api.NotificationApi
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.local.dao.NotificationDao
import com.viecz.vieczandroid.data.local.entities.NotificationEntity
import com.viecz.vieczandroid.data.models.ServerNotification
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import retrofit2.HttpException
import java.io.IOException

class NotificationRepository(
    private val notificationApi: NotificationApi,
    private val notificationDao: NotificationDao,
    private val tokenManager: TokenManager
) {
    companion object {
        private const val TAG = "NotificationRepository"
    }

    fun getNotificationsFlow(userId: Long): Flow<List<NotificationEntity>> {
        return notificationDao.getNotificationsByUserId(userId)
    }

    fun getUnreadCountFlow(userId: Long): Flow<Int> {
        return notificationDao.getUnreadCount(userId)
    }

    suspend fun fetchNotifications(limit: Int = 20, offset: Int = 0): Result<List<ServerNotification>> {
        return try {
            Log.d(TAG, "Fetching notifications from server: limit=$limit, offset=$offset")
            val response = notificationApi.getNotifications(limit, offset)
            val notifications = response.notifications

            // Cache to Room
            val userId = tokenManager.userId.first()
            if (userId != null) {
                val entities = notifications.map { it.toEntity(userId) }
                notificationDao.deleteAllByUserId(userId)
                notificationDao.insertAll(entities)
                Log.d(TAG, "Cached ${entities.size} notifications for user $userId")
            }

            Result.success(notifications)
        } catch (e: HttpException) {
            Log.e(TAG, "HTTP error fetching notifications: ${e.code()}", e)
            Result.failure(Exception("Failed to fetch notifications"))
        } catch (e: IOException) {
            Log.e(TAG, "Network error fetching notifications", e)
            Result.failure(Exception("Network error. Please check your connection."))
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching notifications", e)
            Result.failure(e)
        }
    }

    suspend fun fetchUnreadCount(): Result<Long> {
        return try {
            val response = notificationApi.getUnreadCount()
            Result.success(response.unreadCount)
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching unread count", e)
            Result.failure(e)
        }
    }

    suspend fun markAsRead(id: Long) {
        try {
            notificationApi.markAsRead(id)
            notificationDao.markAsRead(id)
        } catch (e: Exception) {
            Log.e(TAG, "Error marking notification as read", e)
            // Still mark locally
            notificationDao.markAsRead(id)
        }
    }

    suspend fun markAllAsRead() {
        try {
            notificationApi.markAllAsRead()
            notificationDao.markAllAsRead()
        } catch (e: Exception) {
            Log.e(TAG, "Error marking all notifications as read", e)
            notificationDao.markAllAsRead()
        }
    }

    suspend fun deleteNotification(id: Long) {
        try {
            notificationApi.deleteNotification(id)
            notificationDao.deleteById(id)
        } catch (e: Exception) {
            Log.e(TAG, "Error deleting notification", e)
            notificationDao.deleteById(id)
        }
    }

    suspend fun deleteAll() {
        notificationDao.deleteAll()
    }

    private fun ServerNotification.toEntity(userId: Long): NotificationEntity {
        return NotificationEntity(
            serverId = this.id,
            userId = userId,
            type = this.type,
            title = this.title,
            message = this.message,
            taskId = this.taskId,
            isRead = this.isRead,
            createdAt = parseServerTimestamp(this.createdAt)
        )
    }

    private fun parseServerTimestamp(timestamp: String): Long {
        return try {
            java.time.Instant.parse(timestamp).toEpochMilli()
        } catch (e: Exception) {
            System.currentTimeMillis()
        }
    }
}
