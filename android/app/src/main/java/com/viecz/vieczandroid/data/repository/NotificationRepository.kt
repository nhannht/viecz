package com.viecz.vieczandroid.data.repository

import com.viecz.vieczandroid.data.local.dao.NotificationDao
import com.viecz.vieczandroid.data.local.entities.NotificationEntity
import kotlinx.coroutines.flow.Flow

class NotificationRepository(
    private val notificationDao: NotificationDao
) {

    val notifications: Flow<List<NotificationEntity>> = notificationDao.getAllNotifications()

    val unreadCount: Flow<Int> = notificationDao.getUnreadCount()

    suspend fun addNotification(
        type: String,
        title: String,
        message: String,
        taskId: Long? = null
    ) {
        notificationDao.insert(
            NotificationEntity(
                type = type,
                title = title,
                message = message,
                taskId = taskId,
                createdAt = System.currentTimeMillis()
            )
        )
    }

    suspend fun markAsRead(id: Long) {
        notificationDao.markAsRead(id)
    }

    suspend fun markAllAsRead() {
        notificationDao.markAllAsRead()
    }

    suspend fun deleteAll() {
        notificationDao.deleteAll()
    }
}
