package com.viecz.vieczandroid.ui.screens

import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.lifecycle.SavedStateHandle
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.models.TaskStatus
import com.viecz.vieczandroid.data.repository.TaskRepository
import com.viecz.vieczandroid.testutil.CoroutineTestRule
import com.viecz.vieczandroid.testutil.TestData
import io.mockk.clearAllMocks
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.flowOf
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class MyJobsScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @get:Rule
    val coroutineRule = CoroutineTestRule()

    private lateinit var mockTaskRepo: TaskRepository
    private lateinit var mockTokenManager: TokenManager

    @Before
    fun setup() {
        mockTaskRepo = mockk()
        mockTokenManager = mockk()
        every { mockTokenManager.userId } returns flowOf(1L)
    }

    @After
    fun tearDown() {
        clearAllMocks()
    }

    private fun createViewModel(mode: String): MyJobsViewModel {
        val savedStateHandle = SavedStateHandle(mapOf("mode" to mode))
        coEvery { mockTaskRepo.getTasks(any(), any(), any(), any(), any(), any()) } returns Result.success(
            TestData.createTasksResponse(data = emptyList(), total = 0)
        )
        return MyJobsViewModel(mockTaskRepo, mockTokenManager, savedStateHandle)
    }

    @Test
    fun `MyJobsScreen displays posted title`() {
        val viewModel = createViewModel("posted")

        composeTestRule.setContent {
            MaterialTheme {
                MyJobsScreen(
                    mode = "posted",
                    onNavigateBack = {},
                    onNavigateToTaskDetail = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.onNodeWithText("My Posted Jobs").assertIsDisplayed()
    }

    @Test
    fun `MyJobsScreen displays applied title`() {
        val viewModel = createViewModel("applied")

        composeTestRule.setContent {
            MaterialTheme {
                MyJobsScreen(
                    mode = "applied",
                    onNavigateBack = {},
                    onNavigateToTaskDetail = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.onNodeWithText("My Applied Jobs").assertIsDisplayed()
    }

    @Test
    fun `MyJobsScreen displays completed title`() {
        val viewModel = createViewModel("completed")

        composeTestRule.setContent {
            MaterialTheme {
                MyJobsScreen(
                    mode = "completed",
                    onNavigateBack = {},
                    onNavigateToTaskDetail = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.onNodeWithText("My Completed Jobs").assertIsDisplayed()
    }

    @Test
    fun `MyJobsScreen shows empty state for posted`() {
        val viewModel = createViewModel("posted")

        composeTestRule.setContent {
            MaterialTheme {
                MyJobsScreen(
                    mode = "posted",
                    onNavigateBack = {},
                    onNavigateToTaskDetail = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("You haven't posted any jobs yet").assertIsDisplayed()
    }

    @Test
    fun `MyJobsScreen shows empty state for applied`() {
        val viewModel = createViewModel("applied")

        composeTestRule.setContent {
            MaterialTheme {
                MyJobsScreen(
                    mode = "applied",
                    onNavigateBack = {},
                    onNavigateToTaskDetail = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("You haven't applied to any jobs yet").assertIsDisplayed()
    }

    @Test
    fun `MyJobsScreen shows empty state for completed`() {
        val viewModel = createViewModel("completed")

        composeTestRule.setContent {
            MaterialTheme {
                MyJobsScreen(
                    mode = "completed",
                    onNavigateBack = {},
                    onNavigateToTaskDetail = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("You haven't completed any jobs yet").assertIsDisplayed()
    }

    @Test
    fun `MyJobsScreen displays task cards`() {
        val savedStateHandle = SavedStateHandle(mapOf("mode" to "posted"))
        val tasks = listOf(
            TestData.createTask(id = 1, title = "Clean apartment", description = "Deep cleaning needed", location = "D1"),
            TestData.createTask(id = 2, title = "Deliver package", description = "Send to D7", location = "D3")
        )
        coEvery { mockTaskRepo.getTasks(any(), any(), any(), any(), any(), any()) } returns Result.success(
            TestData.createTasksResponse(data = tasks, total = 2)
        )
        val viewModel = MyJobsViewModel(mockTaskRepo, mockTokenManager, savedStateHandle)

        composeTestRule.setContent {
            MaterialTheme {
                MyJobsScreen(
                    mode = "posted",
                    onNavigateBack = {},
                    onNavigateToTaskDetail = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Clean apartment").assertIsDisplayed()
        composeTestRule.onNodeWithText("Deliver package").assertIsDisplayed()
    }

    @Test
    fun `MyJobsScreen back button triggers navigation`() {
        var navigatedBack = false
        val viewModel = createViewModel("posted")

        composeTestRule.setContent {
            MaterialTheme {
                MyJobsScreen(
                    mode = "posted",
                    onNavigateBack = { navigatedBack = true },
                    onNavigateToTaskDetail = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.onNodeWithContentDescription("Back").performClick()
        assert(navigatedBack)
    }

    @Test
    fun `MyJobsScreen shows error state with retry`() {
        val savedStateHandle = SavedStateHandle(mapOf("mode" to "posted"))
        coEvery { mockTaskRepo.getTasks(any(), any(), any(), any(), any(), any()) } returns Result.failure(
            Exception("Network error")
        )
        val viewModel = MyJobsViewModel(mockTaskRepo, mockTokenManager, savedStateHandle)

        composeTestRule.setContent {
            MaterialTheme {
                MyJobsScreen(
                    mode = "posted",
                    onNavigateBack = {},
                    onNavigateToTaskDetail = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Network error").assertIsDisplayed()
        composeTestRule.onNodeWithText("Retry").assertIsDisplayed()
    }
}
