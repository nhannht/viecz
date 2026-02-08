package com.viecz.vieczandroid.data.repository

import com.viecz.vieczandroid.data.api.CategoryApi
import com.viecz.vieczandroid.data.local.dao.CategoryDao
import com.viecz.vieczandroid.data.local.entities.CategoryEntity
import com.viecz.vieczandroid.data.local.entities.toEntity
import com.viecz.vieczandroid.data.models.Category
import com.viecz.vieczandroid.testutil.TestData
import io.mockk.*
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Before
import org.junit.Test
import retrofit2.HttpException
import java.io.IOException
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class CategoryRepositoryTest {

    private lateinit var mockApi: CategoryApi
    private lateinit var mockCategoryDao: CategoryDao
    private lateinit var repository: CategoryRepository

    @Before
    fun setup() {
        mockApi = mockk()
        mockCategoryDao = mockk(relaxed = true)
        repository = CategoryRepository(mockApi, mockCategoryDao)
    }

    @After
    fun tearDown() {
        clearAllMocks()
    }

    @Test
    fun `getCategories should return categories on success`() = runTest {
        val categories = listOf(
            TestData.createCategory(id = 1, name = "Cleaning"),
            TestData.createCategory(id = 2, name = "Delivery"),
            TestData.createCategory(id = 3, name = "Tutoring")
        )
        coEvery { mockApi.getCategories() } returns categories

        val result = repository.getCategories()

        assertTrue(result.isSuccess)
        assertEquals(3, result.getOrNull()?.size)
        assertEquals("Cleaning", result.getOrNull()?.get(0)?.name)
    }

    @Test
    fun `getCategories should cache categories to database`() = runTest {
        val categories = listOf(TestData.createCategory())
        coEvery { mockApi.getCategories() } returns categories

        repository.getCategories()

        coVerify { mockCategoryDao.deleteAllCategories() }
        coVerify { mockCategoryDao.insertCategories(any()) }
    }

    @Test
    fun `getCategories with network error should fallback to cache`() = runTest {
        val cachedCategory = TestData.createCategory(name = "Cached Category")
        val cachedEntities = listOf(cachedCategory.toEntity())
        coEvery { mockApi.getCategories() } throws IOException("No network")
        every { mockCategoryDao.getAllCategories() } returns flowOf(cachedEntities)

        val result = repository.getCategories()

        assertTrue(result.isSuccess)
        assertEquals("Cached Category", result.getOrNull()?.get(0)?.name)
    }

    @Test
    fun `getCategories with network error and empty cache should return failure`() = runTest {
        coEvery { mockApi.getCategories() } throws IOException("No network")
        every { mockCategoryDao.getAllCategories() } returns flowOf(emptyList())

        val result = repository.getCategories()

        assertTrue(result.isFailure)
    }

    @Test
    fun `getCategories with HTTP error should fallback to cache`() = runTest {
        val cachedCategory = TestData.createCategory(name = "Cached")
        val cachedEntities = listOf(cachedCategory.toEntity())
        val httpException = mockk<HttpException> {
            every { code() } returns 500
        }
        coEvery { mockApi.getCategories() } throws httpException
        every { mockCategoryDao.getAllCategories() } returns flowOf(cachedEntities)

        val result = repository.getCategories()

        assertTrue(result.isSuccess)
    }

    @Test
    fun `getCategories should return empty list when API returns empty`() = runTest {
        coEvery { mockApi.getCategories() } returns emptyList()

        val result = repository.getCategories()

        assertTrue(result.isSuccess)
        assertEquals(0, result.getOrNull()?.size)
    }

    @Test
    fun `getCategories with unknown error should return failure without cache fallback`() = runTest {
        coEvery { mockApi.getCategories() } throws RuntimeException("Unknown error")

        val result = repository.getCategories()

        assertTrue(result.isFailure)
    }

    @Test
    fun `getCategories success should clear old cache before inserting new`() = runTest {
        val categories = listOf(
            TestData.createCategory(id = 1),
            TestData.createCategory(id = 2)
        )
        coEvery { mockApi.getCategories() } returns categories

        repository.getCategories()

        coVerifyOrder {
            mockCategoryDao.deleteAllCategories()
            mockCategoryDao.insertCategories(any())
        }
    }
}
