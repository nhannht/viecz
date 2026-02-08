package com.viecz.vieczandroid.ui.screens

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.repository.AuthRepository
import com.viecz.vieczandroid.ui.theme.VieczTheme
import com.viecz.vieczandroid.ui.viewmodels.AuthState
import com.viecz.vieczandroid.ui.viewmodels.AuthViewModel
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.flow.flowOf
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.test.assertTrue

@RunWith(AndroidJUnit4::class)
class LoginScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private fun createViewModel(
        authState: AuthState = AuthState.Idle
    ): AuthViewModel {
        val mockRepository = mockk<AuthRepository>(relaxed = true)
        val mockTokenManager = mockk<TokenManager>(relaxed = true) {
            coEvery { isLoggedIn } returns flowOf(false)
        }
        return AuthViewModel(mockRepository, mockTokenManager)
    }

    @Test
    fun loginScreenDisplaysWelcomeBack() {
        composeTestRule.setContent {
            VieczTheme {
                LoginScreen(
                    onNavigateToRegister = {},
                    onLoginSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithText("Welcome Back").assertIsDisplayed()
    }

    @Test
    fun loginScreenDisplaysLoginSubtitle() {
        composeTestRule.setContent {
            VieczTheme {
                LoginScreen(
                    onNavigateToRegister = {},
                    onLoginSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithText("Login to your account").assertIsDisplayed()
    }

    @Test
    fun loginScreenDisplaysEmailField() {
        composeTestRule.setContent {
            VieczTheme {
                LoginScreen(
                    onNavigateToRegister = {},
                    onLoginSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithText("Email").assertIsDisplayed()
    }

    @Test
    fun loginScreenDisplaysPasswordField() {
        composeTestRule.setContent {
            VieczTheme {
                LoginScreen(
                    onNavigateToRegister = {},
                    onLoginSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithText("Password").assertIsDisplayed()
    }

    @Test
    fun loginScreenDisplaysLoginButton() {
        composeTestRule.setContent {
            VieczTheme {
                LoginScreen(
                    onNavigateToRegister = {},
                    onLoginSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithText("Login").assertIsDisplayed()
    }

    @Test
    fun loginScreenDisplaysRegisterLink() {
        composeTestRule.setContent {
            VieczTheme {
                LoginScreen(
                    onNavigateToRegister = {},
                    onLoginSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithText("Don't have an account? Register").assertIsDisplayed()
    }

    @Test
    fun loginButtonDisabledWhenFieldsEmpty() {
        composeTestRule.setContent {
            VieczTheme {
                LoginScreen(
                    onNavigateToRegister = {},
                    onLoginSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithText("Login").assertIsNotEnabled()
    }

    @Test
    fun registerLinkCallsCallback() {
        var navigateCalled = false
        composeTestRule.setContent {
            VieczTheme {
                LoginScreen(
                    onNavigateToRegister = { navigateCalled = true },
                    onLoginSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithText("Don't have an account? Register").performClick()
        assertTrue(navigateCalled)
    }

    @Test
    fun canTypeInEmailField() {
        composeTestRule.setContent {
            VieczTheme {
                LoginScreen(
                    onNavigateToRegister = {},
                    onLoginSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithText("Email").performTextInput("test@example.com")
        composeTestRule.onNodeWithText("test@example.com").assertIsDisplayed()
    }

    @Test
    fun canTypeInPasswordField() {
        composeTestRule.setContent {
            VieczTheme {
                LoginScreen(
                    onNavigateToRegister = {},
                    onLoginSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithText("Password").performTextInput("password123")
    }

    @Test
    fun loginButtonEnabledWhenFieldsFilled() {
        composeTestRule.setContent {
            VieczTheme {
                LoginScreen(
                    onNavigateToRegister = {},
                    onLoginSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        composeTestRule.onNodeWithText("Email").performTextInput("test@example.com")
        composeTestRule.onNodeWithText("Password").performTextInput("password123")

        composeTestRule.onNodeWithText("Login").assertIsEnabled()
    }

    @Test
    fun passwordToggleChangesVisibility() {
        composeTestRule.setContent {
            VieczTheme {
                LoginScreen(
                    onNavigateToRegister = {},
                    onLoginSuccess = {},
                    viewModel = createViewModel()
                )
            }
        }

        // Initially shows "Show password" content description
        composeTestRule.onNodeWithContentDescription("Show password").assertIsDisplayed()

        // Toggle visibility
        composeTestRule.onNodeWithContentDescription("Show password").performClick()

        // Now shows "Hide password"
        composeTestRule.onNodeWithContentDescription("Hide password").assertIsDisplayed()
    }
}
