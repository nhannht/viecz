package com.viecz.vieczandroid.data.local.database

import androidx.room.TypeConverter
import com.viecz.vieczandroid.data.models.TaskStatus

class Converters {

    @TypeConverter
    fun fromTaskStatus(status: TaskStatus): String {
        return status.name
    }

    @TypeConverter
    fun toTaskStatus(value: String): TaskStatus {
        return TaskStatus.valueOf(value)
    }
}
