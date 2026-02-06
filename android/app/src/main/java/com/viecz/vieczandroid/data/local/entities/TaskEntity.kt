package com.viecz.vieczandroid.data.local.entities

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey
import com.viecz.vieczandroid.data.models.Task
import com.viecz.vieczandroid.data.models.TaskStatus

@Entity(tableName = "tasks")
data class TaskEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: Long,

    @ColumnInfo(name = "requester_id")
    val requesterId: Long,

    @ColumnInfo(name = "tasker_id")
    val taskerId: Long?,

    @ColumnInfo(name = "category_id")
    val categoryId: Long,

    @ColumnInfo(name = "title")
    val title: String,

    @ColumnInfo(name = "description")
    val description: String,

    @ColumnInfo(name = "price")
    val price: Long,

    @ColumnInfo(name = "location")
    val location: String,

    @ColumnInfo(name = "latitude")
    val latitude: Double?,

    @ColumnInfo(name = "longitude")
    val longitude: Double?,

    @ColumnInfo(name = "status")
    val status: TaskStatus,

    @ColumnInfo(name = "created_at")
    val createdAt: String,

    @ColumnInfo(name = "updated_at")
    val updatedAt: String
)

// Extension functions to convert between Task and TaskEntity
fun Task.toEntity() = TaskEntity(
    id = id,
    requesterId = requesterId,
    taskerId = taskerId,
    categoryId = categoryId,
    title = title,
    description = description,
    price = price,
    location = location,
    latitude = latitude,
    longitude = longitude,
    status = status,
    createdAt = createdAt,
    updatedAt = updatedAt
)

fun TaskEntity.toTask(userHasApplied: Boolean = false) = Task(
    id = id,
    requesterId = requesterId,
    taskerId = taskerId,
    categoryId = categoryId,
    title = title,
    description = description,
    price = price,
    location = location,
    latitude = latitude,
    longitude = longitude,
    status = status,
    createdAt = createdAt,
    updatedAt = updatedAt,
    userHasApplied = userHasApplied
)
