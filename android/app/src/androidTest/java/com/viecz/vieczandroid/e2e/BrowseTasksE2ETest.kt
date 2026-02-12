package com.viecz.vieczandroid.e2e

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Test
import org.junit.runner.RunWith

@E2ETest
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class BrowseTasksE2ETest : BaseE2ETest() {

    override val shouldStartLoggedIn = true

    @Test
    fun homeShowsTasks() {
        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Marketplace"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Deliver package to campus"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithText("Deliver package to campus").assertIsDisplayed()
        composeRule.onNodeWithText("Clean apartment before checkout").assertIsDisplayed()
        composeRule.onNodeWithText("Math tutoring for midterm").assertIsDisplayed()
    }

    @Test
    fun homeShowsCategories() {
        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Marketplace"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("All"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithText("All").assertIsDisplayed()
        composeRule.onNodeWithText("Giao hàng").assertIsDisplayed()
        composeRule.onNodeWithText("Dọn dẹp").assertIsDisplayed()
        composeRule.onNodeWithText("Gia sư").assertIsDisplayed()
    }

    @Test
    fun clickTaskNavigatesToDetail() {
        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Deliver package to campus"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithText("Deliver package to campus").performClick()

        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Task Details"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithText("Task Details").assertIsDisplayed()
    }
}
