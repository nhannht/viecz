package com.viecz.vieczandroid.data.local.entities

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "notifications")
data class NotificationEntity(
    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "id")
    val id: Long = 0,

    @ColumnInfo(name = "server_id")
    val serverId: Long? = null,

    @ColumnInfo(name = "user_id")
    val userId: Long? = null,

    @ColumnInfo(name = "type")
    val type: String,

    @ColumnInfo(name = "title")
    val title: String,

    @ColumnInfo(name = "message")
    val message: String,

    @ColumnInfo(name = "task_id")
    val taskId: Long?,

    @ColumnInfo(name = "is_read")
    val isRead: Boolean = false,

    @ColumnInfo(name = "created_at")
    val createdAt: Long
)
