package com.viecz.vieczandroid.e2e

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.test.ext.junit.runners.AndroidJUnit4
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Test
import org.junit.runner.RunWith

@E2ETest
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class S01_AuthFlowE2ETest : BaseE2ETest() {

    override val shouldStartLoggedIn = false

    @Test
    fun splashToLoginToHome() {
        // App starts at splash
        composeRule.waitUntil(timeoutMillis = 5000) {
            composeRule.onAllNodes(hasText("MiniJob"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        // Wait for navigation to login
        composeRule.waitUntil(timeoutMillis = 5000) {
            composeRule.onAllNodes(hasText("Welcome Back"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithText("Welcome Back").assertIsDisplayed()

        // Enter credentials
        composeRule.onNodeWithText("Email").performClick()
        composeRule.onNodeWithText("Email").performTextInput("test@example.com")

        composeRule.onNodeWithText("Password").performClick()
        composeRule.onNodeWithText("Password").performTextInput("Password123")

        // Click login
        composeRule.onNodeWithText("Login").performClick()

        // Wait for home screen
        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Marketplace"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithText("Marketplace").assertIsDisplayed()
    }

    @Test
    fun loginToRegisterToHome() {
        // Wait for login screen
        composeRule.waitUntil(timeoutMillis = 5000) {
            composeRule.onAllNodes(hasText("Welcome Back"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        // Navigate to register
        composeRule.onNodeWithText("Don't have an account? Register").performClick()

        // Wait for register screen
        composeRule.waitUntil(timeoutMillis = 5000) {
            composeRule.onAllNodes(hasText("Create Account"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithText("Create Account").assertIsDisplayed()

        // Fill in registration form
        composeRule.onNodeWithText("Full Name").performClick()
        composeRule.onNodeWithText("Full Name").performTextInput("Test User")

        composeRule.onNodeWithText("Email").performClick()
        composeRule.onNodeWithText("Email").performTextInput("test@example.com")

        composeRule.onNodeWithText("Password").performClick()
        composeRule.onNodeWithText("Password").performTextInput("Password123")

        // Click register
        composeRule.onNodeWithText("Register").performClick()

        // Wait for home screen
        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Marketplace"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithText("Marketplace").assertIsDisplayed()
    }
}
