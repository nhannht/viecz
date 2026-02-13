package com.viecz.vieczandroid.e2e

import android.app.Instrumentation
import android.content.Intent
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
 * Multi-User Chat E2E test against a real Go test server.
 *
 * Scenario 15:
 *   3 users (Alice, Bob, Carol) with 2 conversations and 20 total messages.
 *   Tests multi-conversation handling and chat list correctness.
 *
 *   Flow:
 *   Alice creates 2 tasks → Bob applies to Task1, Carol applies to Task2 →
 *   Alice accepts both → Alice sends 5 messages in each conversation →
 *   Bob sends 5 replies → Carol sends 5 replies →
 *   Final verification: chat list shows both conversations with correct
 *   last message previews, and messages are scrollable in both conversations.
 *
 * Requires: Go test server running on host at port 9999.
 */
@E2ETest
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class S15_MultiUserChatE2ETest : RealServerBaseE2ETest() {

    override val shouldStartLoggedIn = false

    private val aliceEmail = "alice_${System.currentTimeMillis()}@test.com"
    private val alicePassword = "Password123"
    private val aliceName = "Alice TestUser"

    private val bobEmail = "bob_${System.currentTimeMillis()}@test.com"
    private val bobPassword = "Password123"
    private val bobName = "Bob TestUser"

    private val carolEmail = "carol_${System.currentTimeMillis()}@test.com"
    private val carolPassword = "Password123"
    private val carolName = "Carol TestUser"

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

    private fun waitForText(text: String, timeoutMillis: Long = 15000) {
        composeRule.waitUntil(timeoutMillis) {
            composeRule.onAllNodes(hasText(text, substring = true))
                .fetchSemanticsNodes().isNotEmpty()
        }
    }

    private fun scrollToAndVerifyText(text: String, timeoutMillis: Long = 15000) {
        composeRule.waitUntil(timeoutMillis) {
            try {
                composeRule.onAllNodes(hasScrollToNodeAction()).onFirst()
                    .performScrollToNode(hasText(text, substring = true))
                composeRule.onAllNodes(hasText(text, substring = true))
                    .fetchSemanticsNodes().isNotEmpty()
            } catch (_: Exception) {
                false
            }
        }
    }

    private fun typeInField(label: String, text: String) {
        composeRule.onNodeWithText(label).performClick()
        composeRule.onNodeWithText(label).performTextClearance()
        composeRule.onNodeWithText(label).performTextInput(text)
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

    private fun navigateToProfileAndLogout() {
        composeRule.onNodeWithText("Profile").performClick()
        waitForText("Statistics")

        composeRule.onAllNodes(hasScrollToNodeAction()).onFirst()
            .performScrollToNode(hasText("Logout"))
        Thread.sleep(500)
        composeRule.onNodeWithText("Logout").performSemanticsAction(SemanticsActions.OnClick)

        waitForText("Are you sure you want to logout?")
        composeRule.onAllNodesWithText("Logout")[2].performClick()

        waitForText("Welcome Back")
    }

    private fun sendMessage(text: String) {
        composeRule.onNodeWithText("Type a message...").performClick()
        composeRule.onNodeWithText("Type a message...").performTextClearance()
        composeRule.onNodeWithText("Type a message...").performTextInput(text)
        composeRule.onNodeWithContentDescription("Send").performClick()
        Thread.sleep(1000)
    }

    private fun becomeTasker() {
        composeRule.onNodeWithText("Profile").performClick()
        waitForText("Statistics")

        composeRule.onAllNodes(hasScrollToNodeAction()).onFirst()
            .performScrollToNode(hasText("Become a Tasker"))
        Thread.sleep(500)
        composeRule.onNodeWithText("Become a Tasker").performClick()
        waitForText("You are now registered as a tasker!", timeoutMillis = 10000)
    }

    private fun openChatViaMessageButton() {
        waitForText("Message", timeoutMillis = 10000)
        composeRule.onNodeWithText("Message").performClick()
        Thread.sleep(3000)

        val onChatScreen = composeRule.onAllNodes(hasText("Type a message..."))
            .fetchSemanticsNodes().isNotEmpty()
        if (!onChatScreen) {
            try {
                composeRule.onNodeWithText("Message").performClick()
            } catch (_: AssertionError) { }
        }

        waitForText("Type a message...", timeoutMillis = 15000)
        waitForText("Connected", timeoutMillis = 15000)
    }

    @Test
    fun multiUserChat_ThreeUsersExchange20Messages() {

        // ================================================================
        // Phase 1: Setup — Register 3 users, create 2 tasks, apply
        // ================================================================

        // 1a. Alice registers and deposits 400k
        registerUser(aliceName, aliceEmail, alicePassword)

        composeRule.onNodeWithText("Wallet").performClick()
        waitForText("Available Balance")

        composeRule.onNodeWithContentDescription("Deposit").performClick()
        waitForText("Deposit Funds")

        typeInField("Amount (VND)", "400000")
        composeRule.onNodeWithText("Deposit").performClick()
        Thread.sleep(2000)

        // Refresh wallet to confirm deposit
        composeRule.onNodeWithText("Marketplace").performClick()
        waitForText("Viecz")
        composeRule.onNodeWithText("Wallet").performClick()
        waitForText("Available Balance")
        waitForText("400.000")

        // 1b. Alice creates Task1 "Clean my apartment"
        composeRule.onNodeWithText("Marketplace").performClick()
        waitForText("Viecz")

        composeRule.onNodeWithContentDescription("Add Job").performClick()
        waitForText("Create New Task")

        typeInField("Task Title *", "Clean my apartment")
        typeInField("Description *", "Need thorough cleaning of 80sqm apartment")
        typeInField("Price (VND) *", "100000")
        typeInField("Location *", "Ho Chi Minh City")

        composeRule.onNodeWithText("Select Category *").performClick()
        waitForText("Select Category")
        waitForText("Vận chuyển")
        composeRule.onAllNodes(hasText("Vận chuyển", substring = true))[0].performClick()

        composeRule.onNodeWithText("Create Task").performClick()
        waitForText("Task Details", timeoutMillis = 20000)
        waitForText("Clean my apartment")

        // Back to Marketplace
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Marketplace")

        // 1c. Alice creates Task2 "Fix my garden"
        composeRule.onNodeWithContentDescription("Add Job").performClick()
        waitForText("Create New Task")

        typeInField("Task Title *", "Fix my garden")
        typeInField("Description *", "Garden restoration including weeds and fence repair")
        typeInField("Price (VND) *", "100000")
        typeInField("Location *", "Ho Chi Minh City")

        composeRule.onNodeWithText("Select Category *").performClick()
        waitForText("Select Category")
        waitForText("Vận chuyển")
        composeRule.onAllNodes(hasText("Vận chuyển", substring = true))[0].performClick()

        composeRule.onNodeWithText("Create Task").performClick()
        waitForText("Task Details", timeoutMillis = 20000)
        waitForText("Fix my garden")

        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Marketplace")
        navigateToProfileAndLogout()

        // 1d. Bob registers, becomes tasker, applies to Task1
        registerUser(bobName, bobEmail, bobPassword)
        becomeTasker()

        composeRule.onNodeWithText("Marketplace").performClick()
        waitForText("Viecz")

        waitForText("Clean my apartment")
        composeRule.onAllNodesWithText("Clean my apartment").onFirst().performClick()
        waitForText("Task Details")

        composeRule.onNodeWithText("Apply for this Task").performClick()
        waitForText("Apply for Task")
        composeRule.onNodeWithText("Submit Application").performClick()
        waitForText("Application Pending", timeoutMillis = 20000)

        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Marketplace")
        navigateToProfileAndLogout()

        // 1e. Carol registers, becomes tasker, applies to Task2
        registerUser(carolName, carolEmail, carolPassword)
        becomeTasker()

        composeRule.onNodeWithText("Marketplace").performClick()
        waitForText("Viecz")

        waitForText("Fix my garden")
        composeRule.onAllNodesWithText("Fix my garden").onFirst().performClick()
        waitForText("Task Details")

        composeRule.onNodeWithText("Apply for this Task").performClick()
        waitForText("Apply for Task")
        composeRule.onNodeWithText("Submit Application").performClick()
        waitForText("Application Pending", timeoutMillis = 20000)

        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Marketplace")
        navigateToProfileAndLogout()

        // ================================================================
        // Phase 2: Alice accepts both applications, sends 5 msgs each
        // ================================================================

        loginUser(aliceEmail, alicePassword)

        // 2a. Accept Bob on Task1 and send 5 messages
        waitForText("Clean my apartment")
        composeRule.onAllNodesWithText("Clean my apartment").onFirst().performClick()
        waitForText("Task Details")

        waitForText("Accept Application", timeoutMillis = 10000)
        composeRule.onNodeWithText("Accept Application").performClick()
        waitForText("Accept Application & Create Payment")
        composeRule.onNodeWithText("Accept").performClick()
        waitForText("Payment processed successfully!", timeoutMillis = 20000)

        openChatViaMessageButton()

        sendMessage("Hi Bob, thanks for taking the cleaning job!")
        sendMessage("When can you come to clean the apartment?")
        sendMessage("The apartment is about 80 square meters.")
        sendMessage("Please bring your own cleaning supplies.")
        sendMessage("The door code is 4521, let yourself in.")

        // Back to TaskDetail → Marketplace
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Task Details", timeoutMillis = 10000)
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Marketplace")

        // 2b. Accept Carol on Task2 and send 5 messages
        waitForText("Fix my garden")
        composeRule.onAllNodesWithText("Fix my garden").onFirst().performClick()
        waitForText("Task Details")

        waitForText("Accept Application", timeoutMillis = 10000)
        composeRule.onNodeWithText("Accept Application").performClick()
        waitForText("Accept Application & Create Payment")
        composeRule.onNodeWithText("Accept").performClick()
        waitForText("Payment processed successfully!", timeoutMillis = 20000)

        openChatViaMessageButton()

        sendMessage("Hi Carol, welcome to the garden project!")
        sendMessage("The garden really needs a lot of work.")
        sendMessage("There are weeds growing everywhere.")
        sendMessage("The wooden fence also needs some repair.")
        sendMessage("Can you bring pruning shears and gloves?")

        // Back to TaskDetail → Marketplace
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Task Details", timeoutMillis = 10000)
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Marketplace")

        // 2c. Alice verifies Messages tab shows 2 conversations
        composeRule.onNodeWithText("Messages").performClick()
        Thread.sleep(2000)

        waitForText("Clean my apartment", timeoutMillis = 10000)
        waitForText("Fix my garden", timeoutMillis = 10000)

        navigateToProfileAndLogout()

        // ================================================================
        // Phase 3: Bob logs in and sends 5 replies in conversation 1
        // ================================================================

        loginUser(bobEmail, bobPassword)

        composeRule.onNodeWithText("Messages").performClick()
        Thread.sleep(2000)

        waitForText("Clean my apartment", timeoutMillis = 10000)
        composeRule.onAllNodesWithText("Clean my apartment").onFirst().performClick()
        waitForText("Chat", timeoutMillis = 10000)
        waitForText("Connected", timeoutMillis = 15000)

        // Verify Alice's messages arrived
        waitForText("Hi Bob, thanks for taking the cleaning job!")

        sendMessage("Hi Alice, happy to help with the cleaning!")
        sendMessage("I can come this Saturday morning at 9 AM.")
        sendMessage("I have all the supplies I need.")
        sendMessage("What floor is your apartment on?")
        sendMessage("See you Saturday morning, Alice!")

        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Messages")
        composeRule.onNodeWithText("Messages").performClick()
        Thread.sleep(2000)

        // Bob sees only 1 conversation
        waitForText("Clean my apartment", timeoutMillis = 10000)

        navigateToProfileAndLogout()

        // ================================================================
        // Phase 4: Carol logs in and sends 5 replies in conversation 2
        // ================================================================

        loginUser(carolEmail, carolPassword)

        composeRule.onNodeWithText("Messages").performClick()
        Thread.sleep(2000)

        waitForText("Fix my garden", timeoutMillis = 10000)
        composeRule.onAllNodesWithText("Fix my garden").onFirst().performClick()
        waitForText("Chat", timeoutMillis = 10000)
        waitForText("Connected", timeoutMillis = 15000)

        // Verify Alice's messages arrived
        waitForText("Hi Carol, welcome to the garden project!")

        sendMessage("Thanks Alice, excited about this project!")
        sendMessage("I specialize in garden restoration work.")
        sendMessage("I will tackle the weeds first thing.")
        sendMessage("Then move on to fixing the fence.")
        sendMessage("I have all the tools we need, see you soon!")

        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Messages")
        composeRule.onNodeWithText("Messages").performClick()
        Thread.sleep(2000)

        // Carol sees only 1 conversation
        waitForText("Fix my garden", timeoutMillis = 10000)

        navigateToProfileAndLogout()

        // ================================================================
        // Phase 5: Alice logs in — final chat list and message verification
        // ================================================================

        loginUser(aliceEmail, alicePassword)

        composeRule.onNodeWithText("Messages").performClick()
        Thread.sleep(2000)

        // 5a. Verify both conversations visible in chat list
        waitForText("Clean my apartment", timeoutMillis = 10000)
        waitForText("Fix my garden", timeoutMillis = 10000)

        // 5b. Verify last message previews
        waitForText("See you Saturday morning, Alice!")
        waitForText("I have all the tools we need, see you soon!")

        // 5c. Open Bob's conversation and verify messages with scrolling
        composeRule.onAllNodesWithText("Clean my apartment").onFirst().performClick()
        waitForText("Chat", timeoutMillis = 10000)
        waitForText("Connected", timeoutMillis = 15000)

        // Verify key messages across the 10-message exchange
        scrollToAndVerifyText("Hi Bob, thanks for taking the cleaning job!")
        scrollToAndVerifyText("The door code is 4521")
        scrollToAndVerifyText("Hi Alice, happy to help")
        scrollToAndVerifyText("See you Saturday morning, Alice!")

        // Back to conversation list
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Messages")
        composeRule.onNodeWithText("Messages").performClick()
        Thread.sleep(2000)

        // 5d. Open Carol's conversation and verify messages with scrolling
        composeRule.onAllNodesWithText("Fix my garden").onFirst().performClick()
        waitForText("Chat", timeoutMillis = 10000)
        waitForText("Connected", timeoutMillis = 15000)

        // Verify key messages across the 10-message exchange
        scrollToAndVerifyText("Hi Carol, welcome to the garden project!")
        scrollToAndVerifyText("Can you bring pruning shears")
        scrollToAndVerifyText("Thanks Alice, excited about this project!")
        scrollToAndVerifyText("I have all the tools we need, see you soon!")
    }
}
