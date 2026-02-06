package com.viecz.vieczandroid.data.local.database

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.viecz.vieczandroid.data.local.dao.CategoryDao
import com.viecz.vieczandroid.data.local.dao.TaskDao
import com.viecz.vieczandroid.data.local.entities.CategoryEntity
import com.viecz.vieczandroid.data.local.entities.TaskEntity

@Database(
    entities = [TaskEntity::class, CategoryEntity::class],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {

    abstract fun taskDao(): TaskDao
    abstract fun categoryDao(): CategoryDao

    companion object {
        const val DATABASE_NAME = "viecz_database"
    }
}
