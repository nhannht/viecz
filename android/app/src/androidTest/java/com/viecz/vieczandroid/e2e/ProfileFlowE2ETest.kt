package com.viecz.vieczandroid.e2e

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Test
import org.junit.runner.RunWith

@E2ETest
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class ProfileFlowE2ETest : BaseE2ETest() {

    override val shouldStartLoggedIn = true

    @Test
    fun homeToProfileShowsUserInfo() {
        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Viecz - Task Marketplace"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithContentDescription("Profile").performClick()

        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Test User"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithText("Test User").assertIsDisplayed()
        // Use onAllNodesWithText since email may appear in multiple places (profile header + account info)
        composeRule.onAllNodesWithText("test@example.com")[0].assertIsDisplayed()
    }

    @Test
    fun logoutNavigatesToLogin() {
        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Viecz - Task Marketplace"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithContentDescription("Profile").performClick()

        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Profile"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithContentDescription("Logout").performClick()

        composeRule.waitUntil(timeoutMillis = 5000) {
            composeRule.onAllNodes(hasText("Are you sure you want to logout?"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        // Click the confirm "Logout" button (last match — title is first, button is second)
        composeRule.onAllNodesWithText("Logout")[1].performClick()

        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Welcome Back"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithText("Welcome Back").assertIsDisplayed()
    }
}
