package com.viecz.vieczandroid.ui.screens

import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.repository.AuthRepository
import com.viecz.vieczandroid.testutil.CoroutineTestRule
import com.viecz.vieczandroid.ui.viewmodels.AuthViewModel
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
class LoginScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @get:Rule
    val coroutineRule = CoroutineTestRule()

    private lateinit var mockRepository: AuthRepository
    private lateinit var mockTokenManager: TokenManager
    private lateinit var viewModel: AuthViewModel

    @Before
    fun setup() {
        mockRepository = mockk(relaxed = true)
        mockTokenManager = mockk(relaxed = true)
        viewModel = AuthViewModel(mockRepository, mockTokenManager, mockk(relaxed = true))
    }

    @After
    fun tearDown() {
        clearAllMocks()
    }

    @Test
    fun `LoginScreen displays welcome text`() {
        composeTestRule.setContent {
            MaterialTheme {
                LoginScreen(
                    onNavigateToRegister = {},
                    onLoginSuccess = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.onNodeWithText("Welcome Back").assertIsDisplayed()
        composeTestRule.onNodeWithText("Login to your account").assertIsDisplayed()
    }

    @Test
    fun `LoginScreen displays email and password fields`() {
        composeTestRule.setContent {
            MaterialTheme {
                LoginScreen(
                    onNavigateToRegister = {},
                    onLoginSuccess = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.onNodeWithText("Email").assertIsDisplayed()
        composeTestRule.onNodeWithText("Password").assertIsDisplayed()
    }

    @Test
    fun `LoginScreen displays login button initially disabled`() {
        composeTestRule.setContent {
            MaterialTheme {
                LoginScreen(
                    onNavigateToRegister = {},
                    onLoginSuccess = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.onNodeWithText("Login").assertIsDisplayed()
        composeTestRule.onNodeWithText("Login").assertIsNotEnabled()
    }

    @Test
    fun `LoginScreen login button enabled when fields filled`() {
        composeTestRule.setContent {
            MaterialTheme {
                LoginScreen(
                    onNavigateToRegister = {},
                    onLoginSuccess = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.onNodeWithText("Email").performTextInput("test@example.com")
        composeTestRule.onNodeWithText("Password").performTextInput("password123")

        composeTestRule.onNodeWithText("Login").assertIsEnabled()
    }

    @Test
    fun `LoginScreen displays register link`() {
        composeTestRule.setContent {
            MaterialTheme {
                LoginScreen(
                    onNavigateToRegister = {},
                    onLoginSuccess = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.onNodeWithText("Don't have an account? Register").assertIsDisplayed()
    }

    @Test
    fun `LoginScreen register link triggers navigation`() {
        var navigated = false

        composeTestRule.setContent {
            MaterialTheme {
                LoginScreen(
                    onNavigateToRegister = { navigated = true },
                    onLoginSuccess = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.onNodeWithText("Don't have an account? Register").performClick()
        assert(navigated)
    }

    @Test
    fun `LoginScreen password visibility toggle works`() {
        composeTestRule.setContent {
            MaterialTheme {
                LoginScreen(
                    onNavigateToRegister = {},
                    onLoginSuccess = {},
                    viewModel = viewModel
                )
            }
        }

        // Initially password should show "Show password" toggle
        composeTestRule.onNodeWithContentDescription("Show password").assertIsDisplayed()

        // Click toggle
        composeTestRule.onNodeWithContentDescription("Show password").performClick()

        // Now it should show "Hide password"
        composeTestRule.onNodeWithContentDescription("Hide password").assertIsDisplayed()
    }

    @Test
    fun `LoginScreen shows error message on login failure`() {
        coEvery { mockRepository.login(any(), any()) } returns Result.failure(
            Exception("Invalid credentials")
        )

        composeTestRule.setContent {
            MaterialTheme {
                LoginScreen(
                    onNavigateToRegister = {},
                    onLoginSuccess = {},
                    viewModel = viewModel
                )
            }
        }

        // Fill fields and click login
        composeTestRule.onNodeWithText("Email").performTextInput("test@example.com")
        composeTestRule.onNodeWithText("Password").performTextInput("wrongpass")
        composeTestRule.onNodeWithText("Login").performClick()

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithText("Invalid credentials").assertIsDisplayed()
    }
}
