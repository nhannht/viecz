package com.viecz.vieczandroid.data.local.database

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.viecz.vieczandroid.data.local.dao.CategoryDao
import com.viecz.vieczandroid.data.local.dao.NotificationDao
import com.viecz.vieczandroid.data.local.dao.TaskDao
import com.viecz.vieczandroid.data.local.entities.CategoryEntity
import com.viecz.vieczandroid.data.local.entities.NotificationEntity
import com.viecz.vieczandroid.data.local.entities.TaskEntity

@Database(
    entities = [TaskEntity::class, CategoryEntity::class, NotificationEntity::class],
    version = 2,
    exportSchema = true
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {

    abstract fun taskDao(): TaskDao
    abstract fun categoryDao(): CategoryDao
    abstract fun notificationDao(): NotificationDao

    companion object {
        const val DATABASE_NAME = "viecz_database"

        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `notifications` (
                        `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        `type` TEXT NOT NULL,
                        `title` TEXT NOT NULL,
                        `message` TEXT NOT NULL,
                        `task_id` INTEGER,
                        `is_read` INTEGER NOT NULL DEFAULT 0,
                        `created_at` INTEGER NOT NULL
                    )
                    """.trimIndent()
                )
            }
        }
    }
}
