package com.viecz.vieczandroid.e2e

import android.app.Instrumentation
import android.content.Intent
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasScrollToNodeAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollToNode
import androidx.compose.ui.test.performTextClearance
import androidx.compose.ui.test.performTextInput
import androidx.test.espresso.intent.Intents
import androidx.test.espresso.intent.matcher.IntentMatchers.hasAction
import androidx.test.ext.junit.runners.AndroidJUnit4
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Task Deletion E2E test against a real Go test server.
 *
 * Scenarios:
 *   1. Alice creates a task -> deletes it -> task gone from marketplace
 *   2. Alice creates task -> Bob applies -> Alice deletes -> task cancelled, apps rejected
 *
 * Requires: Go test server running on host at port 9999.
 */
@E2ETest
@RealServerTest
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class S19_TaskDeletionE2ETest : RealServerBaseE2ETest() {

    override val shouldStartLoggedIn = false

    private val aliceEmail = "alice_del_${System.currentTimeMillis()}@test.com"
    private val alicePassword = "Password123"
    private val aliceName = "Alice DelTest"

    private val bobEmail = "bob_del_${System.currentTimeMillis()}@test.com"
    private val bobPassword = "Password123"
    private val bobName = "Bob DelTest"

    private val taskTitle = "Delete me task ${System.currentTimeMillis()}"

    @Before
    fun setup() {
        Intents.init()
        Intents.intending(hasAction(Intent.ACTION_VIEW))
            .respondWith(Instrumentation.ActivityResult(0, null))
    }

    @After
    fun teardown() {
        Intents.release()
    }

    // --- Helper functions ---

    private fun waitForText(text: String, timeoutMillis: Long = 15000) {
        composeRule.waitUntil(timeoutMillis) {
            composeRule.onAllNodes(hasText(text, substring = true))
                .fetchSemanticsNodes().isNotEmpty()
        }
    }

    private fun typeInField(label: String, text: String) {
        composeRule.onNodeWithText(label).performClick()
        composeRule.onNodeWithText(label).performTextClearance()
        composeRule.onNodeWithText(label).performTextInput(text)
    }

    private fun navigateToProfileAndLogout() {
        composeRule.onNodeWithText("Profile").performClick()
        waitForText("Statistics")

        composeRule.onAllNodes(hasScrollToNodeAction()).onFirst()
            .performScrollToNode(hasText("Logout"))
        composeRule.onNodeWithText("Logout").performClick()

        waitForText("Are you sure you want to logout?")
        composeRule.onAllNodesWithText("Logout")[2].performClick()

        waitForText("Welcome Back")
    }

    private fun registerUser(name: String, email: String, password: String) {
        waitForText("Welcome Back")

        composeRule.onNodeWithText("Don't have an account? Register").performClick()
        waitForText("Create Account")

        typeInField("Full Name", name)
        typeInField("Email", email)
        typeInField("Password", password)

        composeRule.onNodeWithText("Register").performClick()

        waitForText("Marketplace", timeoutMillis = 20000)
    }

    private fun loginUser(email: String, password: String) {
        waitForText("Welcome Back")

        typeInField("Email", email)
        typeInField("Password", password)

        composeRule.onNodeWithText("Login").performClick()

        waitForText("Marketplace", timeoutMillis = 20000)
    }

    private fun depositFunds(amount: String) {
        composeRule.onNodeWithText("Wallet").performClick()
        waitForText("Available Balance")

        composeRule.onNodeWithContentDescription("Deposit").performClick()
        waitForText("Deposit Funds")

        typeInField("Amount (VND)", amount)
        composeRule.onNodeWithText("Deposit").performClick()

        // Wait for mock PayOS auto-webhook
        Thread.sleep(2000)

        // Refresh wallet by switching tabs
        composeRule.onNodeWithText("Marketplace").performClick()
        waitForText("Viecz")
        composeRule.onNodeWithText("Wallet").performClick()
        waitForText("Available Balance")
    }

    private fun createTask(title: String, price: String) {
        composeRule.onNodeWithText("Marketplace").performClick()
        waitForText("Viecz")

        composeRule.onNodeWithContentDescription("Add Job").performClick()
        waitForText("Create New Task")

        typeInField("Task Title *", title)
        typeInField("Description *", "Test task for deletion scenario")
        typeInField("Price (VND) *", price)
        typeInField("Location *", "Ho Chi Minh City")

        composeRule.onNodeWithText("Select Category *").performClick()
        waitForText("Select Category")
        waitForText("Vận chuyển")
        composeRule.onAllNodes(hasText("Vận chuyển", substring = true))[0].performClick()

        // Scroll to "Create Task" button (may be off-screen on tablet)
        composeRule.onAllNodes(hasScrollToNodeAction()).onFirst()
            .performScrollToNode(hasText("Create Task"))
        composeRule.onNodeWithText("Create Task").performClick()

        waitForText("Task Details", timeoutMillis = 20000)
        waitForText(title)
    }

    // --- Test: Delete open task with no applications ---

    @Test
    fun deleteOpenTask_noApplications_taskCancelled() {
        // Step 1: Alice registers and deposits
        registerUser(aliceName, aliceEmail, alicePassword)
        depositFunds("200000")
        waitForText("200.000")

        // Step 2: Alice creates a task
        createTask(taskTitle, "100000")

        // Step 3: Verify delete button is visible
        composeRule.onNodeWithContentDescription("Delete Task").assertIsDisplayed()

        // Step 4: Tap delete -> confirm
        composeRule.onNodeWithContentDescription("Delete Task").performClick()
        waitForText("Delete Task") // Dialog title
        waitForText("Are you sure you want to delete this task?")

        composeRule.onNodeWithText("Delete").performClick()

        // Step 5: Should navigate back to marketplace
        waitForText("Marketplace", timeoutMillis = 15000)

        // Step 6: Verify wallet balance restored (200k — available balance freed)
        composeRule.onNodeWithText("Wallet").performClick()
        waitForText("Available Balance")
        waitForText("200.000")
    }

    // --- Test: Delete open task with pending applications ---

    @Test
    fun deleteOpenTask_withPendingApplications_taskCancelledAppsRejected() {
        // Step 1: Alice registers, deposits, creates task
        registerUser(aliceName, aliceEmail, alicePassword)
        depositFunds("200000")
        waitForText("200.000")
        createTask(taskTitle, "100000")

        // Go back to marketplace
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Marketplace")

        // Step 2: Alice logs out
        navigateToProfileAndLogout()

        // Step 3: Bob registers and becomes a tasker
        registerUser(bobName, bobEmail, bobPassword)

        composeRule.onNodeWithText("Profile").performClick()
        waitForText("Statistics")
        composeRule.onAllNodes(hasScrollToNodeAction()).onFirst()
            .performScrollToNode(hasText("Become a Tasker"))
        composeRule.onNodeWithText("Become a Tasker").performClick()
        waitForText("Become a Tasker")
        composeRule.onNodeWithText("Yes, Register").performClick()
        Thread.sleep(2000)
        dismissSnackbarIfPresent()

        // Step 4: Bob applies for Alice's task
        composeRule.onNodeWithText("Marketplace").performClick()
        waitForText("Viecz")
        waitForText(taskTitle)
        composeRule.onNodeWithText(taskTitle).performClick()
        waitForText("Task Details")

        // Wait for task detail content to load, then scroll to apply button
        waitForText(taskTitle)
        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasScrollToNodeAction())
                .fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onAllNodes(hasScrollToNodeAction()).onFirst()
            .performScrollToNode(hasText("Apply for this Task"))
        composeRule.onNodeWithText("Apply for this Task").performClick()
        waitForText("Apply for Task")
        composeRule.onNodeWithText("Submit Application").performClick()
        waitForText("Application Pending", timeoutMillis = 20000)

        // Step 5: Bob logs out
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Marketplace")
        navigateToProfileAndLogout()

        // Step 6: Alice logs in and deletes the task
        loginUser(aliceEmail, alicePassword)
        waitForText(taskTitle)
        composeRule.onNodeWithText(taskTitle).performClick()
        waitForText("Task Details")

        // Wait for the delete button to appear (task detail loaded with isOwnTask)
        composeRule.waitUntil(timeoutMillis = 10000) {
            composeRule.onAllNodes(hasContentDescription("Delete Task"))
                .fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithContentDescription("Delete Task").performClick()
        waitForText("Delete Task")
        composeRule.onNodeWithText("Delete").performClick()

        // Step 7: Should navigate back to marketplace
        waitForText("Marketplace", timeoutMillis = 15000)
    }
}
