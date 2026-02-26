package com.viecz.vieczandroid.di

import android.content.Context
import androidx.room.Room
import com.viecz.vieczandroid.BuildConfig
import com.viecz.vieczandroid.data.api.*
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.local.dao.CategoryDao
import com.viecz.vieczandroid.data.local.dao.NotificationDao
import com.viecz.vieczandroid.data.local.dao.TaskDao
import com.viecz.vieczandroid.data.local.database.AppDatabase
import com.viecz.vieczandroid.data.repository.*
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module for providing data layer dependencies
 *
 * Provides:
 * - TokenManager (local data storage)
 * - Repositories (data layer with business logic)
 */
@Module
@InstallIn(SingletonComponent::class)
object DataModule {

    @Provides
    @Singleton
    fun provideTokenManager(
        @ApplicationContext context: Context
    ): TokenManager {
        return TokenManager(context)
    }

    @Provides
    @Singleton
    fun provideAppDatabase(
        @ApplicationContext context: Context
    ): AppDatabase {
        val builder = Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            AppDatabase.DATABASE_NAME
        ).addMigrations(AppDatabase.MIGRATION_1_2, AppDatabase.MIGRATION_2_3)

        if (BuildConfig.DEBUG) {
            builder.fallbackToDestructiveMigration()
        }

        return builder.build()
    }

    @Provides
    @Singleton
    fun provideTaskDao(database: AppDatabase): TaskDao {
        return database.taskDao()
    }

    @Provides
    @Singleton
    fun provideCategoryDao(database: AppDatabase): CategoryDao {
        return database.categoryDao()
    }

    @Provides
    @Singleton
    fun provideNotificationDao(database: AppDatabase): NotificationDao {
        return database.notificationDao()
    }

    @Provides
    @Singleton
    fun provideNotificationRepository(
        notificationApi: NotificationApi,
        notificationDao: NotificationDao,
        tokenManager: TokenManager
    ): NotificationRepository {
        return NotificationRepository(notificationApi, notificationDao, tokenManager)
    }

    @Provides
    @Singleton
    fun provideAuthRepository(
        authApi: AuthApi,
        tokenManager: TokenManager
    ): AuthRepository {
        return AuthRepository(authApi, tokenManager)
    }

    @Provides
    @Singleton
    fun provideTaskRepository(
        taskApi: TaskApi,
        taskDao: TaskDao
    ): TaskRepository {
        return TaskRepository(taskApi, taskDao)
    }

    @Provides
    @Singleton
    fun provideCategoryRepository(
        categoryApi: CategoryApi,
        categoryDao: CategoryDao
    ): CategoryRepository {
        return CategoryRepository(categoryApi, categoryDao)
    }

    @Provides
    @Singleton
    fun provideUserRepository(
        userApi: UserApi
    ): UserRepository {
        return UserRepository(userApi)
    }

    @Provides
    @Singleton
    fun providePaymentRepository(
        paymentApi: PaymentApi
    ): PaymentRepository {
        return PaymentRepository(paymentApi)
    }

    @Provides
    @Singleton
    fun provideGeocodingRepository(
        geocodingApi: GeocodingApi
    ): GeocodingRepository {
        return GeocodingRepository(geocodingApi)
    }
}
