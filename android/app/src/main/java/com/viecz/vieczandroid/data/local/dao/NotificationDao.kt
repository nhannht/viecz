package com.viecz.vieczandroid.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import com.viecz.vieczandroid.data.local.entities.NotificationEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface NotificationDao {

    @Query("SELECT * FROM notifications ORDER BY created_at DESC")
    fun getAllNotifications(): Flow<List<NotificationEntity>>

    @Query("SELECT COUNT(*) FROM notifications WHERE is_read = 0")
    fun getUnreadCount(): Flow<Int>

    @Insert
    suspend fun insert(notification: NotificationEntity)

    @Query("UPDATE notifications SET is_read = 1 WHERE id = :id")
    suspend fun markAsRead(id: Long)

    @Query("UPDATE notifications SET is_read = 1")
    suspend fun markAllAsRead()

    @Query("DELETE FROM notifications")
    suspend fun deleteAll()
}
