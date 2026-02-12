package com.viecz.vieczandroid.e2e

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasScrollToNodeAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollToNode
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
            composeRule.onAllNodes(hasText("Marketplace"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        // Tap Profile tab in bottom bar
        composeRule.onNodeWithText("Profile").performClick()

        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Test User"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithText("Test User").assertIsDisplayed()
        composeRule.onAllNodesWithText("test@example.com")[0].assertIsDisplayed()
    }

    @Test
    fun logoutNavigatesToLogin() {
        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Marketplace"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        // Tap Profile tab in bottom bar
        composeRule.onNodeWithText("Profile").performClick()

        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Test User"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        // Scroll LazyColumn to find the Logout button (off-screen in LazyColumn)
        composeRule.onAllNodes(hasScrollToNodeAction()).onFirst()
            .performScrollToNode(hasText("Logout"))
        composeRule.onNodeWithText("Logout").performClick()

        composeRule.waitUntil(timeoutMillis = 5000) {
            composeRule.onAllNodes(hasText("Are you sure you want to logout?"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        // Click the confirm "Logout" button (last match — dialog title first, button second)
        composeRule.onAllNodesWithText("Logout")[2].performClick()

        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Welcome Back"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithText("Welcome Back").assertIsDisplayed()
    }
}
