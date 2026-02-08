package com.viecz.vieczandroid.di

import com.viecz.vieczandroid.data.api.*
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.local.dao.CategoryDao
import com.viecz.vieczandroid.data.local.dao.TaskDao
import com.viecz.vieczandroid.data.repository.*
import io.mockk.mockk
import org.junit.Test
import kotlin.test.assertIs
import kotlin.test.assertNotNull

class DataModuleTest {

    @Test
    fun `provideAuthRepository creates AuthRepository`() {
        val authApi = mockk<AuthApi>(relaxed = true)
        val tokenManager = mockk<TokenManager>(relaxed = true)

        val repo = DataModule.provideAuthRepository(authApi, tokenManager)

        assertNotNull(repo)
        assertIs<AuthRepository>(repo)
    }

    @Test
    fun `provideTaskRepository creates TaskRepository`() {
        val taskApi = mockk<TaskApi>(relaxed = true)
        val taskDao = mockk<TaskDao>(relaxed = true)

        val repo = DataModule.provideTaskRepository(taskApi, taskDao)

        assertNotNull(repo)
        assertIs<TaskRepository>(repo)
    }

    @Test
    fun `provideCategoryRepository creates CategoryRepository`() {
        val categoryApi = mockk<CategoryApi>(relaxed = true)
        val categoryDao = mockk<CategoryDao>(relaxed = true)

        val repo = DataModule.provideCategoryRepository(categoryApi, categoryDao)

        assertNotNull(repo)
        assertIs<CategoryRepository>(repo)
    }

    @Test
    fun `provideUserRepository creates UserRepository`() {
        val userApi = mockk<UserApi>(relaxed = true)

        val repo = DataModule.provideUserRepository(userApi)

        assertNotNull(repo)
        assertIs<UserRepository>(repo)
    }

    @Test
    fun `providePaymentRepository creates PaymentRepository`() {
        val paymentApi = mockk<PaymentApi>(relaxed = true)

        val repo = DataModule.providePaymentRepository(paymentApi)

        assertNotNull(repo)
        assertIs<PaymentRepository>(repo)
    }
}
