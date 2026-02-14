package com.viecz.vieczandroid.e2e

import android.app.Instrumentation
import android.content.Intent
import androidx.compose.ui.test.hasClickAction
import androidx.compose.ui.test.hasScrollToNodeAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollToNode
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.test.performTextClearance
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.semantics.SemanticsActions
import androidx.test.espresso.intent.Intents
import androidx.test.espresso.intent.matcher.IntentMatchers.hasAction
import androidx.test.ext.junit.runners.AndroidJUnit4
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Escrow with Price Negotiation E2E test against a real Go test server.
 *
 * Scenario:
 *   Alice registers -> deposits 200k -> creates task (100k) ->
 *   Bob registers -> becomes tasker -> applies with proposed price 90k ->
 *   Alice accepts (escrow holds 90k, NOT 100k) ->
 *   Alice marks completed (releases 90k to Bob, 0% fee in beta) ->
 *   Verify: Alice=110k, Bob=90k
 *
 * Requires: Go test server running on host at port 9999.
 */
@E2ETest
@RealServerTest
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class S16_EscrowNegotiationE2ETest : RealServerBaseE2ETest() {

    override val shouldStartLoggedIn = false

    private val aliceEmail = "alice_${System.currentTimeMillis()}@test.com"
    private val alicePassword = "Password123"
    private val aliceName = "Alice TestUser"

    private val bobEmail = "bob_${System.currentTimeMillis()}@test.com"
    private val bobPassword = "Password123"
    private val bobName = "Bob TestUser"

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

        // Scroll to reveal Logout, then use semantic action to invoke click directly
        composeRule.onAllNodes(hasScrollToNodeAction()).onFirst()
            .performScrollToNode(hasText("Logout"))
        Thread.sleep(500)
        composeRule.onNodeWithText("Logout").performSemanticsAction(SemanticsActions.OnClick)

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

    // --- Main E2E test ---

    @Test
    fun escrowNegotiation_ProposedPriceUsedForEscrow() {
        // =====================
        // Step 1: Alice registers
        // =====================
        registerUser(aliceName, aliceEmail, alicePassword)

        // =====================
        // Step 2: Alice deposits 200k
        // =====================
        composeRule.onNodeWithText("Wallet").performClick()
        waitForText("Available Balance")

        composeRule.onNodeWithContentDescription("Deposit").performClick()
        waitForText("Deposit Funds")

        typeInField("Amount (VND)", "200000")

        composeRule.onNodeWithText("Deposit").performClick()

        // Wait for mock PayOS auto-webhook
        Thread.sleep(2000)

        // Refresh wallet by switching tabs
        composeRule.onNodeWithText("Marketplace").performClick()
        waitForText("Viecz")
        composeRule.onNodeWithText("Wallet").performClick()
        waitForText("Available Balance")

        waitForText("200.000")

        // =====================
        // Step 3: Alice creates a task at 100k
        // =====================
        composeRule.onNodeWithText("Marketplace").performClick()
        waitForText("Viecz")

        composeRule.onNodeWithContentDescription("Add Job").performClick()
        waitForText("Create New Task")

        typeInField("Task Title *", "Help me move furniture")
        typeInField("Description *", "Need help moving furniture to new apartment")
        typeInField("Price (VND) *", "100000")
        typeInField("Location *", "Ho Chi Minh City")

        composeRule.onNodeWithText("Select Category *").performClick()
        waitForText("Select Category")
        waitForText("Vận chuyển")
        composeRule.onAllNodes(hasText("Vận chuyển", substring = true))[0].performClick()

        composeRule.onNodeWithText("Create Task").performClick()

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

        // "Become a Tasker" may be off-screen in LazyColumn — scroll to make visible
        composeRule.onAllNodes(hasScrollToNodeAction()).onFirst()
            .performScrollToNode(hasText("Become a Tasker"))
        Thread.sleep(500)
        composeRule.onNode(hasText("Become a Tasker") and hasClickAction())
            .performSemanticsAction(SemanticsActions.OnClick)
        waitForText("Become a Tasker") // Dialog title
        composeRule.onNodeWithText("Yes, Register").performClick()
        Thread.sleep(2000)
        dismissSnackbarIfPresent()

        // =====================
        // Step 7: Bob applies with proposed price 90k
        // =====================
        composeRule.onNodeWithText("Marketplace").performClick()
        waitForText("Viecz")

        waitForText("Help me move furniture")
        composeRule.onNodeWithText("Help me move furniture").performClick()
        waitForText("Task Details")

        composeRule.onNodeWithText("Apply for this Task").performClick()
        waitForText("Apply for Task")

        // Enter proposed price of 90000
        typeInField("Proposed Price (Optional)", "90000")

        composeRule.onNodeWithText("Submit Application").performClick()

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
        // Step 10: Alice accepts application (escrow uses proposed price 90k)
        // =====================
        waitForText("Help me move furniture")
        composeRule.onNodeWithText("Help me move furniture").performClick()
        waitForText("Task Details")

        // Verify proposed price is shown in application card
        waitForText("90.000", timeoutMillis = 10000)

        waitForText("Accept Application", timeoutMillis = 10000)
        composeRule.onNodeWithText("Accept Application").performClick()

        waitForText("Accept Application & Create Payment")
        composeRule.onNodeWithText("Accept").performClick()

        waitForText("Payment processed successfully!", timeoutMillis = 20000)
        dismissSnackbarIfPresent()

        // =====================
        // Step 11: Alice verifies wallet shows 110k (200k - 90k escrow)
        // =====================
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Marketplace")
        composeRule.onNodeWithText("Wallet").performClick()
        waitForText("Available Balance")
        waitForText("110.000")

        // =====================
        // Step 12: Alice completes task
        // =====================
        composeRule.onNodeWithText("Marketplace").performClick()
        waitForText("Viecz")
        waitForText("Help me move furniture")
        composeRule.onNodeWithText("Help me move furniture").performClick()
        waitForText("Task Details")

        waitForText("Mark as Completed", timeoutMillis = 15000)
        composeRule.onNodeWithText("Mark as Completed").performClick()

        waitForText("Completed", timeoutMillis = 20000)

        // =====================
        // Step 13: Alice verifies final wallet = 110k
        // =====================
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Marketplace")
        composeRule.onNodeWithText("Wallet").performClick()
        waitForText("Available Balance")
        waitForText("110.000")

        // =====================
        // Step 14: Bob verifies wallet = 90k (0% fee in beta)
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
