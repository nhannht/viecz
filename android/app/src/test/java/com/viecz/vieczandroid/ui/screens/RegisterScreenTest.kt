package com.viecz.vieczandroid.ui.screens

import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.repository.AuthRepository
import com.viecz.vieczandroid.testutil.CoroutineTestRule
import com.viecz.vieczandroid.ui.viewmodels.AuthViewModel
import io.mockk.clearAllMocks
import io.mockk.mockk
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class RegisterScreenTest {

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
        viewModel = AuthViewModel(mockRepository, mockTokenManager)
    }

    @After
    fun tearDown() {
        clearAllMocks()
    }

    @Test
    fun `RegisterScreen displays Create Account title`() {
        composeTestRule.setContent {
            MaterialTheme {
                RegisterScreen(
                    onNavigateToLogin = {},
                    onRegisterSuccess = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.onNodeWithText("Create Account").assertIsDisplayed()
    }

    @Test
    fun `RegisterScreen displays all form fields`() {
        composeTestRule.setContent {
            MaterialTheme {
                RegisterScreen(
                    onNavigateToLogin = {},
                    onRegisterSuccess = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.onNodeWithText("Full Name").assertIsDisplayed()
        composeTestRule.onNodeWithText("Email").assertIsDisplayed()
        composeTestRule.onNodeWithText("Password").assertIsDisplayed()
    }

    @Test
    fun `RegisterScreen register button is disabled when fields empty`() {
        composeTestRule.setContent {
            MaterialTheme {
                RegisterScreen(
                    onNavigateToLogin = {},
                    onRegisterSuccess = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.onNodeWithText("Register").assertIsNotEnabled()
    }

    @Test
    fun `RegisterScreen register button enabled with valid fields`() {
        composeTestRule.setContent {
            MaterialTheme {
                RegisterScreen(
                    onNavigateToLogin = {},
                    onRegisterSuccess = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.onNodeWithText("Full Name").performTextInput("John Doe")
        composeTestRule.onNodeWithText("Email").performTextInput("john@example.com")
        composeTestRule.onNodeWithText("Password").performTextInput("Password1")

        composeTestRule.onNodeWithText("Register").assertIsEnabled()
    }

    @Test
    fun `RegisterScreen shows password error for short password`() {
        composeTestRule.setContent {
            MaterialTheme {
                RegisterScreen(
                    onNavigateToLogin = {},
                    onRegisterSuccess = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.onNodeWithText("Password").performTextInput("short")

        composeTestRule.onNodeWithText("Password must be at least 8 characters").assertIsDisplayed()
    }

    @Test
    fun `RegisterScreen shows error for missing uppercase`() {
        composeTestRule.setContent {
            MaterialTheme {
                RegisterScreen(
                    onNavigateToLogin = {},
                    onRegisterSuccess = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.onNodeWithText("Password").performTextInput("password1")

        composeTestRule.onNodeWithText("Must contain uppercase letter").assertIsDisplayed()
    }

    @Test
    fun `RegisterScreen shows error for missing lowercase`() {
        composeTestRule.setContent {
            MaterialTheme {
                RegisterScreen(
                    onNavigateToLogin = {},
                    onRegisterSuccess = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.onNodeWithText("Password").performTextInput("PASSWORD1")

        composeTestRule.onNodeWithText("Must contain lowercase letter").assertIsDisplayed()
    }

    @Test
    fun `RegisterScreen shows error for missing digit`() {
        composeTestRule.setContent {
            MaterialTheme {
                RegisterScreen(
                    onNavigateToLogin = {},
                    onRegisterSuccess = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.onNodeWithText("Password").performTextInput("Passwordd")

        composeTestRule.onNodeWithText("Must contain number").assertIsDisplayed()
    }

    @Test
    fun `RegisterScreen displays login link`() {
        composeTestRule.setContent {
            MaterialTheme {
                RegisterScreen(
                    onNavigateToLogin = {},
                    onRegisterSuccess = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.onNodeWithText("Already have an account? Login").assertExists()
    }

    @Test
    fun `RegisterScreen login link triggers navigation`() {
        var navigated = false

        composeTestRule.setContent {
            MaterialTheme {
                RegisterScreen(
                    onNavigateToLogin = { navigated = true },
                    onRegisterSuccess = {},
                    viewModel = viewModel
                )
            }
        }

        // Use performSemanticsAction to invoke the click directly (bypasses coordinate-based click
        // which fails when the node is positioned off-screen in Robolectric's small viewport)
        composeTestRule.onNode(
            hasText("Already have an account? Login") and hasClickAction()
        ).performSemanticsAction(SemanticsActions.OnClick)
        assert(navigated)
    }

    @Test
    fun `RegisterScreen password visibility toggle works`() {
        composeTestRule.setContent {
            MaterialTheme {
                RegisterScreen(
                    onNavigateToLogin = {},
                    onRegisterSuccess = {},
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.onNodeWithContentDescription("Show password").assertIsDisplayed()
        composeTestRule.onNodeWithContentDescription("Show password").performClick()
        composeTestRule.onNodeWithContentDescription("Hide password").assertIsDisplayed()
    }
}
