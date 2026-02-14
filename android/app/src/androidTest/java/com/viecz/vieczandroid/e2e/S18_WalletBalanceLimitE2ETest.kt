package com.viecz.vieczandroid.e2e

import android.app.Instrumentation
import android.content.Intent
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasClickAction
import androidx.compose.ui.test.hasContentDescription
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
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.performTextInput
import androidx.test.espresso.intent.Intents
import androidx.test.espresso.intent.matcher.IntentMatchers.hasAction
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import dagger.hilt.android.testing.HiltAndroidTest
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Wallet Balance Limit E2E test against a real Go test server.
 *
 * Tests:
 *   1. Deposit from 0 to >200k → rejected with error message
 *   2. Deposit from 199k, adding 2k (→201k) → rejected
 *   3. Earn money via task completion beyond 200k → allowed (earnings bypass limit)
 *
 * Requires: Go test server running on host at port 9999.
 */
@E2ETest
@RealServerTest
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class S18_WalletBalanceLimitE2ETest : RealServerBaseE2ETest() {

    override val shouldStartLoggedIn = false

    private val aliceEmail = "alice_${System.currentTimeMillis()}@test.com"
    private val alicePassword = "Password123"
    private val aliceName = "Alice LimitTest"

    private val bobEmail = "bob_${System.currentTimeMillis()}@test.com"
    private val bobPassword = "Password123"
    private val bobName = "Bob LimitTest"

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
        // Use semantic action to trigger onClick directly (avoids touch pass-through issues)
        composeRule.onNode(hasText("Logout") and hasClickAction())
            .performSemanticsAction(SemanticsActions.OnClick)

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

    private fun depositAmount(amount: String) {
        composeRule.onNodeWithContentDescription("Deposit").performClick()
        waitForText("Deposit Funds")
        typeInField("Amount (VND)", amount)
        // Use specific matcher to avoid ambiguity with "Deposit" text in transaction history
        composeRule.onNode(hasText("Deposit") and hasClickAction()).performClick()
    }

    private fun navigateToWalletAndWaitForBalance() {
        composeRule.onNodeWithText("Wallet").performClick()
        waitForText("Available Balance")
    }

    private fun refreshWallet() {
        composeRule.onNodeWithText("Marketplace").performClick()
        waitForText("Viecz")
        composeRule.onNodeWithText("Wallet").performClick()
        waitForText("Available Balance")
    }

    // --- Test: Deposit from 0 to more than 200k → rejected ---

    @Test
    fun depositExceedingMaxBalanceFromZero_showsError() {
        // Step 1: Alice registers
        registerUser(aliceName, aliceEmail, alicePassword)

        // Step 2: Navigate to wallet
        navigateToWalletAndWaitForBalance()

        // Step 3: Try to deposit 200,001 VND (exceeds 200k max)
        depositAmount("200001")

        // Step 4: Verify error message is shown
        waitForText("exceed maximum wallet balance")
    }

    // --- Test: Deposit from 199k, adding 2k → rejected ---

    @Test
    fun depositExceedingMaxBalanceFromPartial_showsError() {
        // Step 1: Alice registers
        registerUser(aliceName, aliceEmail, alicePassword)

        // Step 2: Navigate to wallet and deposit 199,000
        navigateToWalletAndWaitForBalance()
        depositAmount("199000")

        // Wait for mock PayOS webhook
        Thread.sleep(2000)
        refreshWallet()
        waitForText("199.000")

        // Step 3: Try to deposit 2,000 more (199k + 2k = 201k > 200k max)
        depositAmount("2000")

        // Step 4: Verify error message is shown
        waitForText("exceed maximum wallet balance")
    }

    // --- Test: Earn money beyond 200k via task completion ---

    @Test
    fun earningsBeyondMaxBalance_allowed() {
        // =====================
        // Step 1: Alice registers and becomes a tasker (before wallet activity)
        // =====================
        registerUser(aliceName, aliceEmail, alicePassword)

        composeRule.onNodeWithText("Profile").performClick()
        waitForText("Statistics")
        composeRule.onAllNodes(hasScrollToNodeAction()).onFirst()
            .performScrollToNode(hasText("Become a Tasker"))
        // Use semantic action to trigger onClick directly (avoids touch pass-through issues)
        composeRule.onNode(hasText("Become a Tasker") and hasClickAction())
            .performSemanticsAction(SemanticsActions.OnClick)

        waitForText("Become a Tasker") // Dialog title
        composeRule.onNodeWithText("Yes, Register").performClick()
        Thread.sleep(2000)
        dismissSnackbarIfPresent()

        // =====================
        // Step 2: Alice deposits 200k
        // =====================
        navigateToWalletAndWaitForBalance()
        depositAmount("200000")
        Thread.sleep(2000)
        refreshWallet()
        waitForText("200.000")

        // =====================
        // Step 3: Alice logs out
        // =====================
        navigateToProfileAndLogout()

        // =====================
        // Step 4: Bob registers and deposits 200k
        // =====================
        registerUser(bobName, bobEmail, bobPassword)
        navigateToWalletAndWaitForBalance()
        depositAmount("200000")
        Thread.sleep(2000)
        refreshWallet()
        waitForText("200.000")

        // =====================
        // Step 5: Bob creates a task (100k)
        // =====================
        composeRule.onNodeWithText("Marketplace").performClick()
        waitForText("Viecz")

        composeRule.onNodeWithContentDescription("Add Job").performClick()
        waitForText("Create New Task")

        typeInField("Task Title *", "Balance limit test task")
        typeInField("Description *", "Testing that earnings bypass the 200k wallet limit")
        typeInField("Price (VND) *", "100000")
        typeInField("Location *", "Ho Chi Minh City")

        composeRule.onNodeWithText("Select Category *").performClick()
        waitForText("Select Category")
        waitForText("Vận chuyển")
        composeRule.onAllNodes(hasText("Vận chuyển", substring = true))[0].performClick()

        composeRule.onNodeWithText("Create Task").performClick()
        waitForText("Task Details", timeoutMillis = 20000)
        waitForText("Balance limit test task")

        // =====================
        // Step 6: Bob logs out
        // =====================
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Marketplace")
        navigateToProfileAndLogout()

        // =====================
        // Step 7: Alice logs in and applies for Bob's task
        // =====================
        loginUser(aliceEmail, alicePassword)

        waitForText("Balance limit test task")
        composeRule.onNodeWithText("Balance limit test task").performClick()
        waitForText("Task Details")

        composeRule.onNodeWithText("Apply for this Task").performClick()
        waitForText("Apply for Task")
        composeRule.onNodeWithText("Submit Application").performClick()
        waitForText("Application Pending", timeoutMillis = 20000)

        // =====================
        // Step 8: Alice logs out
        // =====================
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Marketplace")
        navigateToProfileAndLogout()

        // =====================
        // Step 9: Bob logs in and accepts Alice's application
        // =====================
        loginUser(bobEmail, bobPassword)

        waitForText("Balance limit test task")
        composeRule.onNodeWithText("Balance limit test task").performClick()
        waitForText("Task Details")

        waitForText("Accept Application", timeoutMillis = 10000)
        composeRule.onNodeWithText("Accept Application").performClick()

        waitForText("Accept Application & Create Payment")
        composeRule.onNodeWithText("Accept").performClick()

        waitForText("Payment processed successfully!", timeoutMillis = 20000)
        dismissSnackbarIfPresent()

        // =====================
        // Step 10: Bob marks task as completed (releases 100k to Alice)
        // =====================
        waitForText("Mark as Completed", timeoutMillis = 15000)
        composeRule.onNodeWithText("Mark as Completed").performClick()
        waitForText("Completed", timeoutMillis = 20000)

        // =====================
        // Step 11: Bob logs out, Alice logs in
        // =====================
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Marketplace")
        navigateToProfileAndLogout()
        loginUser(aliceEmail, alicePassword)

        // =====================
        // Step 12: Verify Alice's wallet = 300k (200k deposit + 100k earnings)
        // Earnings bypass the 200k deposit limit
        // =====================
        navigateToWalletAndWaitForBalance()
        waitForText("300.000")

        // =====================
        // Step 13: Alice tries to deposit again — still blocked
        // (balance 300k, any deposit would exceed 200k max)
        // =====================
        depositAmount("2000")
        waitForText("exceed maximum wallet balance")
    }
}
