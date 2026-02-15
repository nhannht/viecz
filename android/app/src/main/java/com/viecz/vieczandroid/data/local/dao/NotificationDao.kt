package com.viecz.vieczandroid.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.viecz.vieczandroid.data.local.entities.NotificationEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface NotificationDao {

    @Query("SELECT * FROM notifications WHERE user_id = :userId ORDER BY created_at DESC")
    fun getNotificationsByUserId(userId: Long): Flow<List<NotificationEntity>>

    @Query("SELECT * FROM notifications ORDER BY created_at DESC")
    fun getAllNotifications(): Flow<List<NotificationEntity>>

    @Query("SELECT COUNT(*) FROM notifications WHERE is_read = 0 AND (user_id = :userId OR user_id IS NULL)")
    fun getUnreadCount(userId: Long): Flow<Int>

    @Insert
    suspend fun insert(notification: NotificationEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(notifications: List<NotificationEntity>)

    @Query("UPDATE notifications SET is_read = 1 WHERE id = :id")
    suspend fun markAsRead(id: Long)

    @Query("UPDATE notifications SET is_read = 1")
    suspend fun markAllAsRead()

    @Query("DELETE FROM notifications WHERE id = :id")
    suspend fun deleteById(id: Long)

    @Query("DELETE FROM notifications")
    suspend fun deleteAll()

    @Query("DELETE FROM notifications WHERE user_id = :userId")
    suspend fun deleteAllByUserId(userId: Long)
}
