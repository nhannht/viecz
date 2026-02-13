package com.viecz.vieczandroid.e2e

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
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
class S06_CreateTaskE2ETest : BaseE2ETest() {

    override val shouldStartLoggedIn = true

    @Test
    fun homeToCreateTaskFillFormAndSubmit() {
        composeRule.waitUntil(timeoutMillis = 15000) {
            composeRule.onAllNodes(hasText("Marketplace"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        // Tap "Add Job" icon in top bar (replaced FAB)
        composeRule.onNodeWithContentDescription("Add Job").performClick()

        composeRule.waitUntil(timeoutMillis = 15000) {
            composeRule.onAllNodes(hasText("Create New Task"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithText("Create New Task").assertIsDisplayed()

        // Fill in the form
        composeRule.onNodeWithText("Task Title *").performClick()
        composeRule.onNodeWithText("Task Title *").performTextInput("My New Task")

        composeRule.onNodeWithText("Description *").performClick()
        composeRule.onNodeWithText("Description *").performTextInput("This is a task I just created")

        composeRule.onNodeWithText("Price (VND) *").performClick()
        composeRule.onNodeWithText("Price (VND) *").performTextInput("50000")

        composeRule.onNodeWithText("Location *").performClick()
        composeRule.onNodeWithText("Location *").performTextInput("HCMUS Campus")

        // Select category
        composeRule.onNodeWithText("Select Category *").performClick()

        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasText("Giao hàng"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithText("Giao hàng").performClick()

        // Submit
        composeRule.onNodeWithText("Create Task").performClick()

        // Should navigate to task detail after creation
        composeRule.waitUntil(timeoutMillis = 20000) {
            composeRule.onAllNodes(hasText("Task Details"))
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithText("Task Details").assertIsDisplayed()
    }
}
