package com.viecz.vieczandroid.ui.screens

import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import com.viecz.vieczandroid.data.api.NotificationApi
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.local.dao.NotificationDao
import com.viecz.vieczandroid.data.repository.CategoryRepository
import com.viecz.vieczandroid.data.repository.NotificationRepository
import com.viecz.vieczandroid.data.repository.TaskRepository
import com.viecz.vieczandroid.testutil.CoroutineTestRule
import com.viecz.vieczandroid.testutil.TestData
import com.viecz.vieczandroid.ui.viewmodels.CategoryViewModel
import com.viecz.vieczandroid.ui.viewmodels.NotificationViewModel
import com.viecz.vieczandroid.ui.viewmodels.TaskListViewModel
import kotlinx.coroutines.flow.flowOf
import io.mockk.clearAllMocks
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class HomeScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @get:Rule
    val coroutineRule = CoroutineTestRule()

    private lateinit var mockTaskRepo: TaskRepository
    private lateinit var mockCategoryRepo: CategoryRepository
    private lateinit var taskListViewModel: TaskListViewModel
    private lateinit var categoryViewModel: CategoryViewModel
    private lateinit var notificationViewModel: NotificationViewModel

    private lateinit var mockTokenManager: TokenManager

    @Before
    fun setup() {
        mockTaskRepo = mockk()
        mockCategoryRepo = mockk()

        val mockNotificationApi: NotificationApi = mockk(relaxed = true)
        val mockNotificationDao: NotificationDao = mockk()
        mockTokenManager = mockk()
        coEvery { mockTokenManager.userId } returns flowOf(1L)
        coEvery { mockNotificationDao.getNotificationsByUserId(any()) } returns flowOf(emptyList())
        coEvery { mockNotificationDao.getUnreadCount(any()) } returns flowOf(0)
        coEvery { mockNotificationApi.getNotifications(any(), any()) } returns com.viecz.vieczandroid.data.models.NotificationListResponse(notifications = emptyList(), total = 0)
        val notificationRepository = NotificationRepository(mockNotificationApi, mockNotificationDao, mockTokenManager)
        notificationViewModel = NotificationViewModel(notificationRepository, mockTokenManager)

        val tasks = listOf(
            TestData.createTask(id = 1, title = "Clean apartment", description = "Deep cleaning needed", location = "D1"),
            TestData.createTask(id = 2, title = "Deliver package", description = "Send to D7", location = "D3")
        )
        coEvery { mockTaskRepo.getTasks(any(), any(), any(), any(), any(), any()) } returns Result.success(
            TestData.createTasksResponse(data = tasks, total = 2)
        )

        val categories = listOf(
            TestData.createCategory(id = 1, nameVi = "Dọn dẹp"),
            TestData.createCategory(id = 2, nameVi = "Giao hàng")
        )
        coEvery { mockCategoryRepo.getCategories() } returns Result.success(categories)

        taskListViewModel = TaskListViewModel(mockTaskRepo, mockTokenManager)
        categoryViewModel = CategoryViewModel(mockCategoryRepo)
    }

    @After
    fun tearDown() {
        clearAllMocks()
    }

    @Test
    fun `HomeScreen displays app bar title`() {
        composeTestRule.setContent {
            MaterialTheme {
                HomeScreen(
                    onNavigateToTaskDetail = {},
                    onNavigateToCreateTask = {},
                    onNavigateToProfile = {},
                    onNavigateToWallet = {},
                    taskListViewModel = taskListViewModel,
                    categoryViewModel = categoryViewModel,
                    notificationViewModel = notificationViewModel
                )
            }
        }

        composeTestRule.onNodeWithText("Viecz - Task Marketplace").assertIsDisplayed()
    }

    @Test
    fun `HomeScreen displays action bar icons`() {
        composeTestRule.setContent {
            MaterialTheme {
                HomeScreen(
                    onNavigateToTaskDetail = {},
                    onNavigateToCreateTask = {},
                    onNavigateToProfile = {},
                    onNavigateToWallet = {},
                    taskListViewModel = taskListViewModel,
                    categoryViewModel = categoryViewModel,
                    notificationViewModel = notificationViewModel
                )
            }
        }

        composeTestRule.onNodeWithContentDescription("Notifications").assertIsDisplayed()
        composeTestRule.onNodeWithContentDescription("Wallet").assertIsDisplayed()
        composeTestRule.onNodeWithContentDescription("Profile").assertIsDisplayed()
    }

    @Test
    fun `HomeScreen displays FAB for creating task`() {
        composeTestRule.setContent {
            MaterialTheme {
                HomeScreen(
                    onNavigateToTaskDetail = {},
                    onNavigateToCreateTask = {},
                    onNavigateToProfile = {},
                    onNavigateToWallet = {},
                    taskListViewModel = taskListViewModel,
                    categoryViewModel = categoryViewModel,
                    notificationViewModel = notificationViewModel
                )
            }
        }

        composeTestRule.onNodeWithContentDescription("Create Task").assertIsDisplayed()
    }

    @Test
    fun `HomeScreen FAB triggers create task navigation`() {
        var navigated = false

        composeTestRule.setContent {
            MaterialTheme {
                HomeScreen(
                    onNavigateToTaskDetail = {},
                    onNavigateToCreateTask = { navigated = true },
                    onNavigateToProfile = {},
                    onNavigateToWallet = {},
                    taskListViewModel = taskListViewModel,
                    categoryViewModel = categoryViewModel,
                    notificationViewModel = notificationViewModel
                )
            }
        }

        composeTestRule.onNodeWithContentDescription("Create Task").performClick()
        assert(navigated)
    }

    @Test
    fun `HomeScreen displays task cards`() {
        composeTestRule.setContent {
            MaterialTheme {
                HomeScreen(
                    onNavigateToTaskDetail = {},
                    onNavigateToCreateTask = {},
                    onNavigateToProfile = {},
                    onNavigateToWallet = {},
                    taskListViewModel = taskListViewModel,
                    categoryViewModel = categoryViewModel,
                    notificationViewModel = notificationViewModel
                )
            }
        }

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithText("Clean apartment").assertIsDisplayed()
        composeTestRule.onNodeWithText("Deliver package").assertIsDisplayed()
    }

    @Test
    fun `HomeScreen displays category filter chips`() {
        composeTestRule.setContent {
            MaterialTheme {
                HomeScreen(
                    onNavigateToTaskDetail = {},
                    onNavigateToCreateTask = {},
                    onNavigateToProfile = {},
                    onNavigateToWallet = {},
                    taskListViewModel = taskListViewModel,
                    categoryViewModel = categoryViewModel,
                    notificationViewModel = notificationViewModel
                )
            }
        }

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithText("All").assertIsDisplayed()
        composeTestRule.onNodeWithText("Dọn dẹp").assertIsDisplayed()
        composeTestRule.onNodeWithText("Giao hàng").assertIsDisplayed()
    }

    @Test
    fun `HomeScreen profile icon triggers navigation`() {
        var navigated = false

        composeTestRule.setContent {
            MaterialTheme {
                HomeScreen(
                    onNavigateToTaskDetail = {},
                    onNavigateToCreateTask = {},
                    onNavigateToProfile = { navigated = true },
                    onNavigateToWallet = {},
                    taskListViewModel = taskListViewModel,
                    categoryViewModel = categoryViewModel,
                    notificationViewModel = notificationViewModel
                )
            }
        }

        composeTestRule.onNodeWithContentDescription("Profile").performClick()
        assert(navigated)
    }

    @Test
    fun `HomeScreen wallet icon triggers navigation`() {
        var navigated = false

        composeTestRule.setContent {
            MaterialTheme {
                HomeScreen(
                    onNavigateToTaskDetail = {},
                    onNavigateToCreateTask = {},
                    onNavigateToProfile = {},
                    onNavigateToWallet = { navigated = true },
                    taskListViewModel = taskListViewModel,
                    categoryViewModel = categoryViewModel,
                    notificationViewModel = notificationViewModel
                )
            }
        }

        composeTestRule.onNodeWithContentDescription("Wallet").performClick()
        assert(navigated)
    }

    @Test
    fun `HomeScreen shows empty state when no tasks`() {
        coEvery { mockTaskRepo.getTasks(any(), any(), any(), any(), any(), any()) } returns Result.success(
            TestData.createTasksResponse(data = emptyList(), total = 0)
        )
        val emptyViewModel = TaskListViewModel(mockTaskRepo, mockTokenManager)

        composeTestRule.setContent {
            MaterialTheme {
                HomeScreen(
                    onNavigateToTaskDetail = {},
                    onNavigateToCreateTask = {},
                    onNavigateToProfile = {},
                    onNavigateToWallet = {},
                    taskListViewModel = emptyViewModel,
                    categoryViewModel = categoryViewModel,
                    notificationViewModel = notificationViewModel
                )
            }
        }

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithText("No tasks available").assertIsDisplayed()
    }

    @Test
    fun `HomeScreen shows error state with retry button`() {
        coEvery { mockTaskRepo.getTasks(any(), any(), any(), any(), any(), any()) } returns Result.failure(
            Exception("Network error")
        )
        val errorViewModel = TaskListViewModel(mockTaskRepo, mockTokenManager)

        composeTestRule.setContent {
            MaterialTheme {
                HomeScreen(
                    onNavigateToTaskDetail = {},
                    onNavigateToCreateTask = {},
                    onNavigateToProfile = {},
                    onNavigateToWallet = {},
                    taskListViewModel = errorViewModel,
                    categoryViewModel = categoryViewModel,
                    notificationViewModel = notificationViewModel
                )
            }
        }

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithText("Network error").assertIsDisplayed()
        composeTestRule.onNodeWithText("Retry").assertIsDisplayed()
    }

    @Test
    fun `HomeScreen displays notification icon in action bar`() {
        composeTestRule.setContent {
            MaterialTheme {
                HomeScreen(
                    onNavigateToTaskDetail = {},
                    onNavigateToCreateTask = {},
                    onNavigateToProfile = {},
                    onNavigateToWallet = {},
                    taskListViewModel = taskListViewModel,
                    categoryViewModel = categoryViewModel,
                    notificationViewModel = notificationViewModel
                )
            }
        }

        composeTestRule.onNodeWithContentDescription("Notifications").assertIsDisplayed()
    }

    @Test
    fun `HomeScreen refreshes task list when refreshTrigger is true`() {
        composeTestRule.setContent {
            MaterialTheme {
                HomeScreen(
                    onNavigateToTaskDetail = {},
                    onNavigateToCreateTask = {},
                    onNavigateToProfile = {},
                    onNavigateToWallet = {},
                    refreshTrigger = true,
                    taskListViewModel = taskListViewModel,
                    categoryViewModel = categoryViewModel,
                    notificationViewModel = notificationViewModel
                )
            }
        }

        composeTestRule.waitForIdle()

        // init{} call + refreshTrigger call = at least 2 invocations
        coVerify(atLeast = 2) { mockTaskRepo.getTasks(any(), any(), any(), any(), any(), any()) }
    }
}
