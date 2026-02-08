package com.viecz.vieczandroid.ui.screens

import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.hasScrollToNodeAction
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.repository.UserRepository
import com.viecz.vieczandroid.testutil.CoroutineTestRule
import com.viecz.vieczandroid.testutil.TestData
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
class ProfileScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @get:Rule
    val coroutineRule = CoroutineTestRule()

    private lateinit var mockUserRepo: UserRepository
    private lateinit var mockTokenManager: TokenManager
    private lateinit var viewModel: ProfileViewModel

    @Before
    fun setup() {
        mockUserRepo = mockk(relaxed = true)
        mockTokenManager = mockk(relaxed = true)

        coEvery { mockUserRepo.getMyProfile() } returns Result.success(
            TestData.createUser(
                name = "Jane Doe",
                email = "jane@example.com",
                university = "HCMUS",
                isTasker = false,
                rating = 4.5,
                totalTasksCompleted = 10,
                totalTasksPosted = 3
            )
        )

        viewModel = ProfileViewModel(mockUserRepo, mockTokenManager)
    }

    @After
    fun tearDown() {
        clearAllMocks()
    }

    @Test
    fun `ProfileScreen displays app bar title`() {
        composeTestRule.setContent {
            MaterialTheme {
                ProfileScreen(onNavigateBack = {}, onLogout = {}, viewModel = viewModel)
            }
        }

        composeTestRule.onNodeWithText("Profile").assertIsDisplayed()
    }

    @Test
    fun `ProfileScreen displays back button`() {
        composeTestRule.setContent {
            MaterialTheme {
                ProfileScreen(onNavigateBack = {}, onLogout = {}, viewModel = viewModel)
            }
        }

        composeTestRule.onNodeWithContentDescription("Back").assertIsDisplayed()
    }

    @Test
    fun `ProfileScreen back button triggers navigation`() {
        var navigatedBack = false

        composeTestRule.setContent {
            MaterialTheme {
                ProfileScreen(
                    onNavigateBack = { navigatedBack = true },
                    onLogout = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.onNodeWithContentDescription("Back").performClick()
        assert(navigatedBack)
    }

    @Test
    fun `ProfileScreen displays logout button`() {
        composeTestRule.setContent {
            MaterialTheme {
                ProfileScreen(onNavigateBack = {}, onLogout = {}, viewModel = viewModel)
            }
        }

        composeTestRule.onNodeWithContentDescription("Logout").assertIsDisplayed()
    }

    @Test
    fun `ProfileScreen displays user name after loading`() {
        composeTestRule.setContent {
            MaterialTheme {
                ProfileScreen(onNavigateBack = {}, onLogout = {}, viewModel = viewModel)
            }
        }

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithText("Jane Doe").assertIsDisplayed()
    }

    @Test
    fun `ProfileScreen displays user email after loading`() {
        composeTestRule.setContent {
            MaterialTheme {
                ProfileScreen(onNavigateBack = {}, onLogout = {}, viewModel = viewModel)
            }
        }

        composeTestRule.waitForIdle()

        // Email appears in both header and account info, check first instance
        composeTestRule.onAllNodesWithText("jane@example.com").onFirst().assertExists()
    }

    @Test
    fun `ProfileScreen displays statistics section`() {
        composeTestRule.setContent {
            MaterialTheme {
                ProfileScreen(onNavigateBack = {}, onLogout = {}, viewModel = viewModel)
            }
        }

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithText("Statistics").assertExists()
        composeTestRule.onNodeWithText("4.5").assertExists()
        composeTestRule.onNodeWithText("10").assertExists()
        composeTestRule.onNodeWithText("3").assertExists()
    }

    @Test
    fun `ProfileScreen displays account information`() {
        composeTestRule.setContent {
            MaterialTheme {
                ProfileScreen(onNavigateBack = {}, onLogout = {}, viewModel = viewModel)
            }
        }

        composeTestRule.waitForIdle()

        composeTestRule.onNode(hasScrollToNodeAction())
            .performScrollToNode(hasText("Account Information"))
        composeTestRule.onNodeWithText("Account Information").assertExists()
        composeTestRule.onNodeWithText("HCMUS").assertExists()
    }

    @Test
    fun `ProfileScreen displays become tasker button for non-tasker`() {
        composeTestRule.setContent {
            MaterialTheme {
                ProfileScreen(onNavigateBack = {}, onLogout = {}, viewModel = viewModel)
            }
        }

        composeTestRule.waitForIdle()

        composeTestRule.onNode(hasScrollToNodeAction())
            .performScrollToNode(hasText("Become a Tasker"))
        composeTestRule.onNodeWithText("Become a Tasker").assertExists()
    }

    @Test
    fun `ProfileScreen hides become tasker button for tasker user`() {
        coEvery { mockUserRepo.getMyProfile() } returns Result.success(
            TestData.createUser(isTasker = true)
        )
        val taskerViewModel = ProfileViewModel(mockUserRepo, mockTokenManager)

        composeTestRule.setContent {
            MaterialTheme {
                ProfileScreen(onNavigateBack = {}, onLogout = {}, viewModel = taskerViewModel)
            }
        }

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithText("Become a Tasker").assertDoesNotExist()
    }

    @Test
    fun `ProfileScreen shows error state when load fails`() {
        coEvery { mockUserRepo.getMyProfile() } returns Result.failure(Exception("Failed to load"))
        val errorViewModel = ProfileViewModel(mockUserRepo, mockTokenManager)

        composeTestRule.setContent {
            MaterialTheme {
                ProfileScreen(onNavigateBack = {}, onLogout = {}, viewModel = errorViewModel)
            }
        }

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithText("Retry").assertExists()
    }

    @Test
    fun `ProfileScreen shows Tasker badge for tasker user`() {
        coEvery { mockUserRepo.getMyProfile() } returns Result.success(
            TestData.createUser(isTasker = true, name = "Tasker User")
        )
        val taskerViewModel = ProfileViewModel(mockUserRepo, mockTokenManager)

        composeTestRule.setContent {
            MaterialTheme {
                ProfileScreen(onNavigateBack = {}, onLogout = {}, viewModel = taskerViewModel)
            }
        }

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithText("Tasker").assertIsDisplayed()
    }
}
