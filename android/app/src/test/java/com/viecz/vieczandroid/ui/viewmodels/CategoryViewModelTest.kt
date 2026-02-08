package com.viecz.vieczandroid.ui.viewmodels

import app.cash.turbine.test
import com.viecz.vieczandroid.data.repository.CategoryRepository
import com.viecz.vieczandroid.testutil.CoroutineTestRule
import com.viecz.vieczandroid.testutil.TestData
import io.mockk.*
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class CategoryViewModelTest {

    @get:Rule
    val coroutineRule = CoroutineTestRule()

    private lateinit var mockRepository: CategoryRepository
    private lateinit var viewModel: CategoryViewModel

    @Before
    fun setup() {
        mockRepository = mockk()
        // Mock the init block call
        coEvery { mockRepository.getCategories() } returns Result.success(emptyList())
        viewModel = CategoryViewModel(mockRepository)
    }

    @After
    fun tearDown() {
        clearAllMocks()
    }

    @Test
    fun `loadCategories should emit categories on success`() = runTest {
        val categories = listOf(
            TestData.createCategory(id = 1, name = "Cleaning"),
            TestData.createCategory(id = 2, name = "Delivery"),
            TestData.createCategory(id = 3, name = "Tutoring")
        )
        coEvery { mockRepository.getCategories() } returns Result.success(categories)

        viewModel.loadCategories()
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals(3, state.categories.size)
            assertEquals("Cleaning", state.categories[0].name)
            assertFalse(state.isLoading)
            assertNull(state.error)
        }
    }

    @Test
    fun `loadCategories should emit error on failure`() = runTest {
        coEvery { mockRepository.getCategories() } returns Result.failure(Exception("Network error"))

        viewModel.loadCategories()
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals("Network error", state.error)
            assertFalse(state.isLoading)
            assertTrue(state.categories.isEmpty())
        }
    }

    @Test
    fun `loadCategories with empty list should have no error`() = runTest {
        coEvery { mockRepository.getCategories() } returns Result.success(emptyList())

        viewModel.loadCategories()
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state.categories.isEmpty())
            assertNull(state.error)
        }
    }

    @Test
    fun `loadCategories error with null message should use fallback`() = runTest {
        coEvery { mockRepository.getCategories() } returns Result.failure(Exception())

        viewModel.loadCategories()
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals("Failed to load categories", state.error)
        }
    }

    @Test
    fun `loadCategories is called on init`() = runTest {
        coEvery { mockRepository.getCategories() } returns Result.success(emptyList())

        // ViewModel was created in setup, which calls loadCategories in init block
        advanceUntilIdle()

        coVerify(atLeast = 1) { mockRepository.getCategories() }
    }

    @Test
    fun `loadCategories should update all category data`() = runTest {
        val categories = listOf(
            TestData.createCategory(id = 1, name = "Cleaning", nameVi = "Dọn dẹp"),
            TestData.createCategory(id = 2, name = "Delivery", nameVi = "Giao hàng")
        )
        coEvery { mockRepository.getCategories() } returns Result.success(categories)

        viewModel.loadCategories()
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals("Dọn dẹp", state.categories[0].nameVi)
            assertEquals("Giao hàng", state.categories[1].nameVi)
        }
    }

    @Test
    fun `consecutive loadCategories calls should replace previous data`() = runTest {
        val firstBatch = listOf(TestData.createCategory(id = 1, name = "Old"))
        val secondBatch = listOf(TestData.createCategory(id = 2, name = "New"))

        coEvery { mockRepository.getCategories() } returns Result.success(firstBatch)
        viewModel.loadCategories()
        advanceUntilIdle()

        coEvery { mockRepository.getCategories() } returns Result.success(secondBatch)
        viewModel.loadCategories()
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals(1, state.categories.size)
            assertEquals("New", state.categories[0].name)
        }
    }
}
