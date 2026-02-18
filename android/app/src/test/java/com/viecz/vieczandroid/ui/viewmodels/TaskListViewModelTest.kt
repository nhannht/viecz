package com.viecz.vieczandroid.ui.viewmodels

import app.cash.turbine.test
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.repository.TaskRepository
import com.viecz.vieczandroid.testutil.CoroutineTestRule
import com.viecz.vieczandroid.testutil.TestData
import io.mockk.*
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
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
class TaskListViewModelTest {

    @get:Rule
    val coroutineRule = CoroutineTestRule()

    private lateinit var mockRepository: TaskRepository
    private lateinit var mockTokenManager: TokenManager
    private lateinit var viewModel: TaskListViewModel

    @Before
    fun setup() {
        mockRepository = mockk()
        mockTokenManager = mockk()
        every { mockTokenManager.userId } returns MutableStateFlow(1L)
        // Mock the initial loadTasks call in init block
        coEvery { mockRepository.getTasks(any(), any(), any(), any()) } returns Result.success(
            TestData.createTasksResponse()
        )
        viewModel = TaskListViewModel(mockRepository, mockTokenManager)
    }

    @After
    fun tearDown() {
        clearAllMocks()
    }

    @Test
    fun `loadTasks should emit tasks on success`() = runTest {
        val tasks = listOf(
            TestData.createTask(id = 1, title = "Task 1"),
            TestData.createTask(id = 2, title = "Task 2")
        )
        val response = TestData.createTasksResponse(data = tasks, total = 2)
        coEvery { mockRepository.getTasks(any(), any(), any(), any()) } returns Result.success(response)

        viewModel.loadTasks(refresh = true)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertFalse(state.isLoading)
            assertEquals(2, state.tasks.size)
            assertNull(state.error)
        }
    }

    @Test
    fun `loadTasks with network error should emit error`() = runTest {
        coEvery { mockRepository.getTasks(any(), any(), any(), any()) } returns Result.failure(
            Exception("Network error")
        )

        viewModel.loadTasks(refresh = true)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertFalse(state.isLoading)
            assertEquals("Network error", state.error)
        }
    }

    @Test
    fun `loadTasks with refresh should clear existing tasks`() = runTest {
        val response = TestData.createTasksResponse(
            data = listOf(TestData.createTask(title = "New Task"))
        )
        coEvery { mockRepository.getTasks(any(), any(), any(), any()) } returns Result.success(response)

        viewModel.loadTasks(refresh = true)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals(1, state.tasks.size)
            assertEquals("New Task", state.tasks[0].title)
        }
    }

    @Test
    fun `filterByCategory should update category and reload tasks`() = runTest {
        val response = TestData.createTasksResponse()
        coEvery { mockRepository.getTasks(any(), any(), any(), any()) } returns Result.success(response)

        viewModel.filterByCategory(5L)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals(5L, state.selectedCategoryId)
        }

        coVerify { mockRepository.getTasks(page = 1, categoryId = 5L, search = null, status = "open") }
    }

    @Test
    fun `filterByCategory with null should clear filter`() = runTest {
        val response = TestData.createTasksResponse()
        coEvery { mockRepository.getTasks(any(), any(), any(), any()) } returns Result.success(response)

        viewModel.filterByCategory(null)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertNull(state.selectedCategoryId)
        }
    }

    @Test
    fun `updateSearchQuery should update query text and trigger debounced search`() = runTest {
        val response = TestData.createTasksResponse()
        coEvery { mockRepository.getTasks(any(), any(), any(), any()) } returns Result.success(response)

        viewModel.updateSearchQuery("cleaning")

        // Verify the text flow is updated immediately
        assertEquals("cleaning", viewModel.searchQueryText.value)

        // Advance past the 1-second debounce
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals("cleaning", state.searchQuery)
        }
    }

    @Test
    fun `loadMore should increment page and load next page`() = runTest {
        val response = TestData.createTasksResponse(
            data = List(20) { TestData.createTask(id = it.toLong()) },
            total = 40,
            limit = 20
        )
        coEvery { mockRepository.getTasks(any(), any(), any(), any()) } returns Result.success(response)

        // Create a fresh ViewModel where init returns hasMore=true (20 items >= 20 limit)
        val vm = TaskListViewModel(mockRepository, mockTokenManager)
        advanceUntilIdle()

        vm.loadMore()
        advanceUntilIdle()

        vm.uiState.test {
            val state = awaitItem()
            assertEquals(2, state.currentPage)
        }
    }

    @Test
    fun `loadMore should not load when already loading`() = runTest {
        // Set up so hasMore = true but isLoading state
        val response = TestData.createTasksResponse()
        coEvery { mockRepository.getTasks(any(), any(), any(), any()) } returns Result.success(response)

        viewModel.loadTasks(refresh = true)
        // Don't await - still loading
        viewModel.loadMore() // Should be skipped

        advanceUntilIdle()
    }

    @Test
    fun `loadMore should not load when no more items`() = runTest {
        // Return fewer items than limit to indicate no more
        val response = TestData.createTasksResponse(
            data = listOf(TestData.createTask()),
            limit = 20,
            total = 1
        )
        coEvery { mockRepository.getTasks(any(), any(), any(), any()) } returns Result.success(response)

        viewModel.loadTasks(refresh = true)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertFalse(state.hasMore)
        }
    }

    @Test
    fun `refresh should reset page to 1 and clear tasks`() = runTest {
        val response = TestData.createTasksResponse()
        coEvery { mockRepository.getTasks(any(), any(), any(), any()) } returns Result.success(response)

        viewModel.refresh()
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals(1, state.currentPage)
        }

        coVerify { mockRepository.getTasks(page = 1, categoryId = null, search = null, status = "open") }
    }

    @Test
    fun `currentUserId should be set from TokenManager`() = runTest {
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals(1L, state.currentUserId)
        }
    }

    @Test
    fun `empty task list should have empty list and no error`() = runTest {
        val response = TestData.createTasksResponse(data = emptyList(), total = 0)
        coEvery { mockRepository.getTasks(any(), any(), any(), any()) } returns Result.success(response)

        viewModel.loadTasks(refresh = true)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state.tasks.isEmpty())
            assertNull(state.error)
        }
    }
}
