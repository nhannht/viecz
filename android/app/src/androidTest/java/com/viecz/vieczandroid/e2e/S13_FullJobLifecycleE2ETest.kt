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
import androidx.compose.ui.test.onNodeWithTag
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
 * Full Job Lifecycle E2E test against a real Go test server.
 *
 * Scenario:
 *   Alice registers -> deposits 200k -> creates task (100k) ->
 *   Bob registers -> becomes tasker -> applies ->
 *   Alice accepts (escrow holds 100k) ->
 *   Alice marks completed (releases 90k to Bob after 10% fee) ->
 *   Verify: Alice=100k, Bob=90k, task=completed
 *
 * Requires: Go test server running on host at port 9999.
 * Run via: ./scripts/run-full-e2e.sh
 */
@E2ETest
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class S13_FullJobLifecycleE2ETest : RealServerBaseE2ETest() {

    override val shouldStartLoggedIn = false

    // Test user credentials
    private val aliceEmail = "alice_${System.currentTimeMillis()}@test.com"
    private val alicePassword = "Password123"
    private val aliceName = "Alice TestUser"

    private val bobEmail = "bob_${System.currentTimeMillis()}@test.com"
    private val bobPassword = "Password123"
    private val bobName = "Bob TestUser"

    @Before
    fun setup() {
        // Stub all ACTION_VIEW intents (browser for PayOS checkout, deposit URL)
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
        // Go to profile tab
        composeRule.onNodeWithText("Profile").performClick()
        waitForText("Statistics")

        // Scroll LazyColumn to find the Logout button (off-screen in LazyColumn)
        composeRule.onAllNodes(hasScrollToNodeAction()).onFirst()
            .performScrollToNode(hasText("Logout"))
        composeRule.onNodeWithText("Logout").performClick()

        // Confirm logout dialog
        waitForText("Are you sure you want to logout?")
        composeRule.onAllNodesWithText("Logout")[2].performClick()

        // Wait for login screen
        waitForText("Welcome Back")
    }

    private fun registerUser(name: String, email: String, password: String) {
        waitForText("Welcome Back")

        // Navigate to register
        composeRule.onNodeWithText("Don't have an account? Register").performClick()
        waitForText("Create Account")

        // Fill registration form
        typeInField("Full Name", name)
        typeInField("Email", email)
        typeInField("Password", password)

        // Submit
        composeRule.onNodeWithText("Register").performClick()

        // Wait for main screen with bottom bar
        waitForText("Marketplace", timeoutMillis = 20000)
    }

    private fun loginUser(email: String, password: String) {
        waitForText("Welcome Back")

        typeInField("Email", email)
        typeInField("Password", password)

        composeRule.onNodeWithText("Login").performClick()

        waitForText("Marketplace", timeoutMillis = 20000)
    }

    // --- Main E2E test ---

    @Test
    fun fullJobLifecycle_AliceCreatesBobCompletes() {
        // =====================
        // Step 1: Alice registers
        // =====================
        registerUser(aliceName, aliceEmail, alicePassword)

        // =====================
        // Step 2: Alice deposits 200k
        // =====================
        // Tap Wallet tab in bottom bar
        composeRule.onNodeWithText("Wallet").performClick()
        waitForText("Available Balance")

        // Click deposit button in top bar (contentDescription = "Deposit")
        composeRule.onNodeWithContentDescription("Deposit").performClick()
        waitForText("Deposit Funds")

        // Enter amount
        typeInField("Amount (VND)", "200000")

        // Click Deposit button in dialog
        composeRule.onNodeWithText("Deposit").performClick()

        // The deposit intent will be intercepted by espresso-intents.
        // The mock PayOS on the server auto-fires a webhook to credit the wallet.
        // Wait for the auto-webhook
        Thread.sleep(2000)

        // Switch to marketplace tab and back to wallet to refresh
        composeRule.onNodeWithText("Marketplace").performClick()
        waitForText("Viecz")
        composeRule.onNodeWithText("Wallet").performClick()
        waitForText("Available Balance")

        // Assert balance shows 200,000 (Vietnamese format: 200.000)
        waitForText("200.000")

        // =====================
        // Step 3: Alice creates a task (100k)
        // =====================
        composeRule.onNodeWithText("Marketplace").performClick()
        waitForText("Viecz")

        // Tap "Add Job" icon in top bar
        composeRule.onNodeWithContentDescription("Add Job").performClick()
        waitForText("Create New Task")

        typeInField("Task Title *", "Help me move furniture")
        typeInField("Description *", "Need help moving furniture to new apartment downtown")
        typeInField("Price (VND) *", "100000")
        typeInField("Location *", "Ho Chi Minh City")

        // Select category
        composeRule.onNodeWithText("Select Category *").performClick()
        waitForText("Select Category")
        // Use the first category (Moving & Transport / Vận chuyển & Di chuyển)
        waitForText("Vận chuyển")
        composeRule.onAllNodes(hasText("Vận chuyển", substring = true))[0].performClick()

        // Submit task
        composeRule.onNodeWithText("Create Task").performClick()

        // Wait for task detail screen
        waitForText("Task Details", timeoutMillis = 20000)
        waitForText("Help me move furniture")

        // =====================
        // Step 4: Alice logs out
        // =====================
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Marketplace")
        navigateToProfileAndLogout()

        // =====================
        // Step 5: Bob registers
        // =====================
        registerUser(bobName, bobEmail, bobPassword)

        // =====================
        // Step 6: Bob becomes a Tasker
        // =====================
        composeRule.onNodeWithText("Profile").performClick()
        waitForText("Statistics")

        composeRule.onNodeWithText("Become a Tasker").performClick()
        waitForText("Become a Tasker") // Dialog title

        composeRule.onNodeWithText("Yes, Register").performClick()

        // Wait for snackbar or profile update
        Thread.sleep(2000)

        // =====================
        // Step 7: Bob applies for the task
        // =====================
        composeRule.onNodeWithText("Marketplace").performClick()
        waitForText("Viecz")

        // Find and click Alice's task
        waitForText("Help me move furniture")
        composeRule.onNodeWithText("Help me move furniture").performClick()
        waitForText("Task Details")

        // Apply for task
        composeRule.onNodeWithText("Apply for this Task").performClick()
        waitForText("Apply for Task")

        // Fill application form (optional fields, just submit)
        composeRule.onNodeWithText("Submit Application").performClick()

        // Wait for application to be submitted
        waitForText("Application Pending", timeoutMillis = 20000)

        // =====================
        // Step 8: Bob logs out
        // =====================
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Marketplace")
        navigateToProfileAndLogout()

        // =====================
        // Step 9: Alice logs in
        // =====================
        loginUser(aliceEmail, alicePassword)

        // =====================
        // Step 10: Alice accepts application (escrow deducted)
        // =====================
        waitForText("Help me move furniture")
        composeRule.onNodeWithText("Help me move furniture").performClick()
        waitForText("Task Details")

        // Scroll down to see applications and click Accept
        waitForText("Accept Application", timeoutMillis = 10000)
        composeRule.onNodeWithText("Accept Application").performClick()

        // Confirm accept dialog
        waitForText("Accept Application & Create Payment")
        composeRule.onNodeWithText("Accept").performClick()

        // Wait for escrow payment to complete
        waitForText("Payment processed successfully!", timeoutMillis = 20000)

        // =====================
        // Step 11: Alice marks task as Completed while still on TaskDetail
        // (After accept, the task reloads with IN_PROGRESS status,
        //  so "Mark as Completed" button appears on the same screen.)
        // =====================
        waitForText("Mark as Completed", timeoutMillis = 15000)
        composeRule.onNodeWithText("Mark as Completed").performClick()

        // Wait for task completion (payment release + status update)
        waitForText("Completed", timeoutMillis = 20000)

        // =====================
        // Step 12: Alice verifies wallet = 100k (200k - 100k escrow)
        // =====================
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Marketplace")
        composeRule.onNodeWithText("Wallet").performClick()
        waitForText("Available Balance")
        waitForText("100.000")

        // =====================
        // Step 13: Check Bob's wallet = 90k (100k - 10% fee)
        // =====================
        composeRule.onNodeWithText("Marketplace").performClick()
        waitForText("Viecz")
        navigateToProfileAndLogout()

        loginUser(bobEmail, bobPassword)
        composeRule.onNodeWithText("Wallet").performClick()
        waitForText("Available Balance")
        waitForText("90.000")
    }
}
