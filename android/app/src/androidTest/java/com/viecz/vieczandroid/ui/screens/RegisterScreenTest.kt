package com.viecz.vieczandroid.ui.screens

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.repository.AuthRepository
import com.viecz.vieczandroid.ui.theme.VieczTheme
import com.viecz.vieczandroid.ui.viewmodels.AuthViewModel
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.flow.flowOf
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.test.assertTrue

@RunWith(AndroidJUnit4::class)
class RegisterScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private fun createViewModel(): AuthViewModel {
        val mockRepository = mockk<AuthRepository>(relaxed = true)
        val mockTokenManager = mockk<TokenManager>(relaxed = true) {
            coEvery { isLoggedIn } returns flowOf(false)
        }
        return AuthViewModel(mockRepository, mockTokenManager)
    }

    @Test
    fun registerScreenDisplaysTitle() {
        composeTestRule.setContent {
            VieczTheme {
                RegisterScreen(
                    onNavigateToLogin = {},
                    onRegisterSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithText("Create Account").assertIsDisplayed()
    }

    @Test
    fun registerScreenDisplaysNameField() {
        composeTestRule.setContent {
            VieczTheme {
                RegisterScreen(
                    onNavigateToLogin = {},
                    onRegisterSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithText("Full Name").assertIsDisplayed()
    }

    @Test
    fun registerScreenDisplaysEmailField() {
        composeTestRule.setContent {
            VieczTheme {
                RegisterScreen(
                    onNavigateToLogin = {},
                    onRegisterSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithText("Email").assertIsDisplayed()
    }

    @Test
    fun registerScreenDisplaysPasswordField() {
        composeTestRule.setContent {
            VieczTheme {
                RegisterScreen(
                    onNavigateToLogin = {},
                    onRegisterSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithText("Password").assertIsDisplayed()
    }

    @Test
    fun registerScreenDisplaysRegisterButton() {
        composeTestRule.setContent {
            VieczTheme {
                RegisterScreen(
                    onNavigateToLogin = {},
                    onRegisterSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithText("Register").assertIsDisplayed()
    }

    @Test
    fun registerScreenDisplaysLoginLink() {
        composeTestRule.setContent {
            VieczTheme {
                RegisterScreen(
                    onNavigateToLogin = {},
                    onRegisterSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithText("Already have an account? Login").assertIsDisplayed()
    }

    @Test
    fun registerButtonDisabledWhenFieldsEmpty() {
        composeTestRule.setContent {
            VieczTheme {
                RegisterScreen(
                    onNavigateToLogin = {},
                    onRegisterSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithText("Register").assertIsNotEnabled()
    }

    @Test
    fun loginLinkCallsCallback() {
        var loginCalled = false
        composeTestRule.setContent {
            VieczTheme {
                RegisterScreen(
                    onNavigateToLogin = { loginCalled = true },
                    onRegisterSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithText("Already have an account? Login").performClick()
        assertTrue(loginCalled)
    }

    @Test
    fun canTypeInNameField() {
        composeTestRule.setContent {
            VieczTheme {
                RegisterScreen(
                    onNavigateToLogin = {},
                    onRegisterSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithText("Full Name").performTextInput("Test User")
        composeTestRule.onNodeWithText("Test User").assertIsDisplayed()
    }

    @Test
    fun canTypeInEmailField() {
        composeTestRule.setContent {
            VieczTheme {
                RegisterScreen(
                    onNavigateToLogin = {},
                    onRegisterSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithText("Email").performTextInput("test@example.com")
        composeTestRule.onNodeWithText("test@example.com").assertIsDisplayed()
    }

    @Test
    fun invalidEmailShowsError() {
        composeTestRule.setContent {
            VieczTheme {
                RegisterScreen(
                    onNavigateToLogin = {},
                    onRegisterSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithText("Email").performTextInput("invalid-email")
        composeTestRule.onNodeWithText("Invalid email format").assertIsDisplayed()
    }

    @Test
    fun shortPasswordShowsError() {
        composeTestRule.setContent {
            VieczTheme {
                RegisterScreen(
                    onNavigateToLogin = {},
                    onRegisterSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithText("Password").performTextInput("abc")
        composeTestRule.onNodeWithText("Password must be at least 8 characters").assertIsDisplayed()
    }

    @Test
    fun passwordWithoutUppercaseShowsError() {
        composeTestRule.setContent {
            VieczTheme {
                RegisterScreen(
                    onNavigateToLogin = {},
                    onRegisterSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithText("Password").performTextInput("password1")
        composeTestRule.onNodeWithText("Must contain uppercase letter").assertIsDisplayed()
    }

    @Test
    fun registerButtonEnabledWithValidInput() {
        composeTestRule.setContent {
            VieczTheme {
                RegisterScreen(
                    onNavigateToLogin = {},
                    onRegisterSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithText("Full Name").performTextInput("Test User")
        composeTestRule.onNodeWithText("Email").performTextInput("test@example.com")
        composeTestRule.onNodeWithText("Password").performTextInput("Password1")

        composeTestRule.onNodeWithText("Register").assertIsEnabled()
    }

    @Test
    fun passwordToggleChangesVisibility() {
        composeTestRule.setContent {
            VieczTheme {
                RegisterScreen(
                    onNavigateToLogin = {},
                    onRegisterSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithContentDescription("Show password").assertIsDisplayed()
        composeTestRule.onNodeWithContentDescription("Show password").performClick()
        composeTestRule.onNodeWithContentDescription("Hide password").assertIsDisplayed()
    }
}
