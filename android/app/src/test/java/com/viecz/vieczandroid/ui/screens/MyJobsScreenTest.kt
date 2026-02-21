package com.viecz.vieczandroid.ui.screens

import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
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

    private fun createViewModel(): MyJobsViewModel {
        coEvery { mockTaskRepo.getTasks(any(), any(), any(), any(), any(), any()) } returns Result.success(
            TestData.createTasksResponse(data = emptyList(), total = 0)
        )
        return MyJobsViewModel(mockTaskRepo, mockTokenManager)
    }

    @Test
    fun `MyJobsScreen displays title and tabs`() {
        val viewModel = createViewModel()

        composeTestRule.setContent {
            MaterialTheme {
                MyJobsScreen(
                    onNavigateBack = {},
                    onNavigateToTaskDetail = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.onNodeWithText("My Jobs").assertIsDisplayed()
        composeTestRule.onNodeWithText("Posted").assertIsDisplayed()
        composeTestRule.onNodeWithText("Applied").assertIsDisplayed()
        composeTestRule.onNodeWithText("Completed").assertIsDisplayed()
    }

    @Test
    fun `MyJobsScreen shows empty state for posted tab`() {
        val viewModel = createViewModel()

        composeTestRule.setContent {
            MaterialTheme {
                MyJobsScreen(
                    onNavigateBack = {},
                    onNavigateToTaskDetail = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("No posted tasks yet").assertIsDisplayed()
    }

    @Test
    fun `MyJobsScreen displays task cards`() {
        val tasks = listOf(
            TestData.createTask(id = 1, title = "Clean apartment", description = "Deep cleaning needed", location = "D1"),
            TestData.createTask(id = 2, title = "Deliver package", description = "Send to D7", location = "D3")
        )
        coEvery { mockTaskRepo.getTasks(any(), any(), any(), any(), any(), any()) } returns Result.success(
            TestData.createTasksResponse(data = tasks, total = 2)
        )
        val viewModel = MyJobsViewModel(mockTaskRepo, mockTokenManager)

        composeTestRule.setContent {
            MaterialTheme {
                MyJobsScreen(
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
        val viewModel = createViewModel()

        composeTestRule.setContent {
            MaterialTheme {
                MyJobsScreen(
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
        coEvery { mockTaskRepo.getTasks(any(), any(), any(), any(), any(), any()) } returns Result.failure(
            Exception("Network error")
        )
        val viewModel = MyJobsViewModel(mockTaskRepo, mockTokenManager)

        composeTestRule.setContent {
            MaterialTheme {
                MyJobsScreen(
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
