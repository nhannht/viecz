package com.viecz.vieczandroid.e2e

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@E2ETest
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class ProfileFlowE2ETest : BaseE2ETest() {

    @Before
    fun setup() {
        loginAsTestUser()
    }

    @Test
    fun homeToProfileShowsUserInfo() {
        // Wait for home
        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Viecz - Task Marketplace"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        // Navigate to profile
        composeRule.onNodeWithContentDescription("Profile").performClick()

        // Wait for profile screen
        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Profile"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        // Verify user info is displayed
        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Test User"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithText("Test User").assertIsDisplayed()
        composeRule.onNodeWithText("test@example.com").assertIsDisplayed()
    }

    @Test
    fun logoutNavigatesToLogin() {
        // Wait for home
        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Viecz - Task Marketplace"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        // Navigate to profile
        composeRule.onNodeWithContentDescription("Profile").performClick()

        // Wait for profile screen
        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Profile"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        // Click logout icon
        composeRule.onNodeWithContentDescription("Logout").performClick()

        // Confirm logout dialog
        composeRule.waitUntil(timeoutMillis = 5000) {
            composeRule.onAllNodes(hasText("Are you sure you want to logout?"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        // Click the confirm "Logout" button (last match — title is first, button is second)
        composeRule.onAllNodesWithText("Logout")[1].performClick()

        // Should navigate back to login
        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Welcome Back"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithText("Welcome Back").assertIsDisplayed()
    }
}
