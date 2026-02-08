package com.viecz.vieczandroid.ui.screens

import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.hasScrollToNodeAction
import com.viecz.vieczandroid.data.repository.CategoryRepository
import com.viecz.vieczandroid.data.repository.TaskRepository
import com.viecz.vieczandroid.testutil.CoroutineTestRule
import com.viecz.vieczandroid.testutil.TestData
import com.viecz.vieczandroid.ui.viewmodels.CategoryViewModel
import com.viecz.vieczandroid.ui.viewmodels.CreateTaskViewModel
import io.mockk.clearAllMocks
import io.mockk.coEvery
import io.mockk.mockk
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class CreateTaskScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @get:Rule
    val coroutineRule = CoroutineTestRule()

    private lateinit var mockTaskRepo: TaskRepository
    private lateinit var mockCategoryRepo: CategoryRepository
    private lateinit var createTaskViewModel: CreateTaskViewModel
    private lateinit var categoryViewModel: CategoryViewModel

    @Before
    fun setup() {
        mockTaskRepo = mockk(relaxed = true)
        mockCategoryRepo = mockk()

        coEvery { mockCategoryRepo.getCategories() } returns Result.success(
            listOf(
                TestData.createCategory(id = 1, nameVi = "Dọn dẹp"),
                TestData.createCategory(id = 2, nameVi = "Giao hàng")
            )
        )

        createTaskViewModel = CreateTaskViewModel(mockTaskRepo)
        categoryViewModel = CategoryViewModel(mockCategoryRepo)
    }

    @After
    fun tearDown() {
        clearAllMocks()
    }

    @Test
    fun `CreateTaskScreen displays app bar title`() {
        composeTestRule.setContent {
            MaterialTheme {
                CreateTaskScreen(
                    onNavigateBack = {},
                    onTaskCreated = {},
                    createTaskViewModel = createTaskViewModel,
                    categoryViewModel = categoryViewModel
                )
            }
        }

        composeTestRule.onNodeWithText("Create New Task").assertIsDisplayed()
    }

    @Test
    fun `CreateTaskScreen displays back button`() {
        composeTestRule.setContent {
            MaterialTheme {
                CreateTaskScreen(
                    onNavigateBack = {},
                    onTaskCreated = {},
                    createTaskViewModel = createTaskViewModel,
                    categoryViewModel = categoryViewModel
                )
            }
        }

        composeTestRule.onNodeWithContentDescription("Back").assertIsDisplayed()
    }

    @Test
    fun `CreateTaskScreen back button triggers navigation`() {
        var navigatedBack = false

        composeTestRule.setContent {
            MaterialTheme {
                CreateTaskScreen(
                    onNavigateBack = { navigatedBack = true },
                    onTaskCreated = {},
                    createTaskViewModel = createTaskViewModel,
                    categoryViewModel = categoryViewModel
                )
            }
        }

        composeTestRule.onNodeWithContentDescription("Back").performClick()
        assert(navigatedBack)
    }

    @Test
    fun `CreateTaskScreen displays instruction text`() {
        composeTestRule.setContent {
            MaterialTheme {
                CreateTaskScreen(
                    onNavigateBack = {},
                    onTaskCreated = {},
                    createTaskViewModel = createTaskViewModel,
                    categoryViewModel = categoryViewModel
                )
            }
        }

        composeTestRule.onNodeWithText("Post a new task and find skilled taskers").assertIsDisplayed()
    }

    @Test
    fun `CreateTaskScreen displays all form fields`() {
        composeTestRule.setContent {
            MaterialTheme {
                CreateTaskScreen(
                    onNavigateBack = {},
                    onTaskCreated = {},
                    createTaskViewModel = createTaskViewModel,
                    categoryViewModel = categoryViewModel
                )
            }
        }

        composeTestRule.onNodeWithText("Task Title *").assertExists()
        composeTestRule.onNodeWithText("Description *").assertExists()
        composeTestRule.onNodeWithText("Select Category *").assertExists()

        composeTestRule.onNode(hasScrollToNodeAction())
            .performScrollToNode(hasText("Price (VND) *"))
        composeTestRule.onNodeWithText("Price (VND) *").assertExists()

        composeTestRule.onNode(hasScrollToNodeAction())
            .performScrollToNode(hasText("Location *"))
        composeTestRule.onNodeWithText("Location *").assertExists()
    }

    @Test
    fun `CreateTaskScreen displays create button`() {
        composeTestRule.setContent {
            MaterialTheme {
                CreateTaskScreen(
                    onNavigateBack = {},
                    onTaskCreated = {},
                    createTaskViewModel = createTaskViewModel,
                    categoryViewModel = categoryViewModel
                )
            }
        }

        composeTestRule.onNode(hasScrollToNodeAction())
            .performScrollToNode(hasText("Create Task"))
        composeTestRule.onNodeWithText("Create Task").assertExists()
    }

    @Test
    fun `CreateTaskScreen title field accepts input`() {
        composeTestRule.setContent {
            MaterialTheme {
                CreateTaskScreen(
                    onNavigateBack = {},
                    onTaskCreated = {},
                    createTaskViewModel = createTaskViewModel,
                    categoryViewModel = categoryViewModel
                )
            }
        }

        composeTestRule.onNodeWithText("Task Title *").performTextInput("Clean my room")
        composeTestRule.onNodeWithText("Clean my room").assertIsDisplayed()
    }

    @Test
    fun `CreateTaskScreen description field accepts input`() {
        composeTestRule.setContent {
            MaterialTheme {
                CreateTaskScreen(
                    onNavigateBack = {},
                    onTaskCreated = {},
                    createTaskViewModel = createTaskViewModel,
                    categoryViewModel = categoryViewModel
                )
            }
        }

        composeTestRule.onNodeWithText("Description *").performTextInput("Deep cleaning needed")
        composeTestRule.onNodeWithText("Deep cleaning needed").assertIsDisplayed()
    }

    @Test
    fun `CreateTaskScreen price field exists`() {
        composeTestRule.setContent {
            MaterialTheme {
                CreateTaskScreen(
                    onNavigateBack = {},
                    onTaskCreated = {},
                    createTaskViewModel = createTaskViewModel,
                    categoryViewModel = categoryViewModel
                )
            }
        }

        composeTestRule.onNode(hasScrollToNodeAction())
            .performScrollToNode(hasText("Price (VND) *"))
        composeTestRule.onNodeWithText("Price (VND) *").assertExists()
    }

    @Test
    fun `CreateTaskScreen category button opens dialog`() {
        composeTestRule.setContent {
            MaterialTheme {
                CreateTaskScreen(
                    onNavigateBack = {},
                    onTaskCreated = {},
                    createTaskViewModel = createTaskViewModel,
                    categoryViewModel = categoryViewModel
                )
            }
        }

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithText("Select Category *").performClick()

        composeTestRule.onNodeWithText("Select Category").assertIsDisplayed()
        composeTestRule.onNodeWithText("Dọn dẹp").assertIsDisplayed()
        composeTestRule.onNodeWithText("Giao hàng").assertIsDisplayed()
    }
}
