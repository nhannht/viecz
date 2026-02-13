package com.viecz.vieczandroid.e2e

import android.app.Instrumentation
import android.content.Intent
import androidx.compose.ui.test.assertIsDisplayed
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
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.swipeDown
import androidx.compose.ui.test.swipeUp
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
 * Chat Messaging E2E test against a real Go test server.
 *
 * Scenario 14:
 *   Alice registers -> deposits 200k -> creates task (100k) ->
 *   Bob registers -> becomes tasker -> applies ->
 *   Alice accepts (task -> IN_PROGRESS) ->
 *   Alice and Bob exchange 10 messages (5 each) including:
 *     - Normal conversation messages (9 messages)
 *     - One edge case: 2000-word long message (message 8)
 *   Alice verifies all messages in conversation
 *
 * Requires: Go test server running on host at port 9999.
 */
@E2ETest
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class S14_ChatMessagingE2ETest : RealServerBaseE2ETest() {

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

    private fun waitForText(text: String, timeoutMillis: Long = 15000) {
        composeRule.waitUntil(timeoutMillis) {
            composeRule.onAllNodes(hasText(text, substring = true))
                .fetchSemanticsNodes().isNotEmpty()
        }
    }

    /**
     * Scroll the LazyColumn to a node containing [text] and verify it exists.
     * Needed for off-screen items in virtualized LazyColumn (e.g., chat messages).
     */
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

        // Scroll to reveal Logout, then use semantic action to invoke click directly
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

    /**
     * Generate a 2000-word message to test long message edge case.
     */
    private fun generate2000WordMessage(): String {
        val words = listOf(
            "moving", "furniture", "experience", "professional", "equipment", "safety",
            "planning", "organization", "packing", "boxes", "tape", "bubble", "wrap",
            "dolly", "truck", "lifting", "techniques", "teamwork", "efficiency", "careful"
        )

        val sentences = mutableListOf<String>()
        sentences.add("I have extensive experience with furniture moving and I'd like to share some professional tips.")
        sentences.add("First, proper planning is absolutely crucial for a successful move.")
        sentences.add("You should always create a detailed inventory of all items before starting.")
        sentences.add("Using quality packing materials like bubble wrap and sturdy boxes makes a huge difference.")
        sentences.add("Professional movers always use proper lifting techniques to avoid injuries.")

        // Generate more content to reach 2000 words
        var wordCount = sentences.joinToString(" ").split(" ").size
        var sentenceIndex = 0

        while (wordCount < 2000) {
            val word = words[sentenceIndex % words.size]
            val sentence = "The importance of $word cannot be overstated when dealing with furniture moving operations."
            sentences.add(sentence)
            wordCount += sentence.split(" ").size
            sentenceIndex++
        }

        return sentences.joinToString(" ")
    }

    @Test
    fun chatMessaging_AliceSendsBobReplies() {
        // Generate 2000-word message once for reuse
        val longMessage = generate2000WordMessage()

        // ======== Step 1: Alice registers and deposits 200k ========
        registerUser(aliceName, aliceEmail, alicePassword)

        composeRule.onNodeWithText("Wallet").performClick()
        waitForText("Available Balance")

        composeRule.onNodeWithContentDescription("Deposit").performClick()
        waitForText("Deposit Funds")

        typeInField("Amount (VND)", "200000")
        composeRule.onNodeWithText("Deposit").performClick()

        // Wait for mock PayOS webhook
        Thread.sleep(2000)

        // Refresh wallet
        composeRule.onNodeWithText("Marketplace").performClick()
        waitForText("Viecz")
        composeRule.onNodeWithText("Wallet").performClick()
        waitForText("Available Balance")
        waitForText("200.000")

        // ======== Step 2: Alice creates a task (100k) ========
        composeRule.onNodeWithText("Marketplace").performClick()
        waitForText("Viecz")

        composeRule.onNodeWithContentDescription("Add Job").performClick()
        waitForText("Create New Task")

        typeInField("Task Title *", "Help me move furniture")
        typeInField("Description *", "Need help moving furniture to new apartment downtown")
        typeInField("Price (VND) *", "100000")
        typeInField("Location *", "Ho Chi Minh City")

        composeRule.onNodeWithText("Select Category *").performClick()
        waitForText("Select Category")
        waitForText("Vận chuyển")
        composeRule.onAllNodes(hasText("Vận chuyển", substring = true))[0].performClick()

        composeRule.onNodeWithText("Create Task").performClick()
        waitForText("Task Details", timeoutMillis = 20000)
        waitForText("Help me move furniture")

        // ======== Step 3: Alice logs out ========
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Marketplace")
        navigateToProfileAndLogout()

        // ======== Step 4: Bob registers, becomes tasker, applies ========
        registerUser(bobName, bobEmail, bobPassword)

        composeRule.onNodeWithText("Profile").performClick()
        waitForText("Statistics")

        // "Become a Tasker" may be off-screen in LazyColumn — scroll to make visible
        composeRule.onAllNodes(hasScrollToNodeAction()).onFirst()
            .performScrollToNode(hasText("Become a Tasker"))
        Thread.sleep(500)

        // In MainScreen Profile tab, clicking calls becomeTasker() directly (no dialog)
        composeRule.onNodeWithText("Become a Tasker").performClick()
        waitForText("You are now registered as a tasker!", timeoutMillis = 10000)

        composeRule.onNodeWithText("Marketplace").performClick()
        waitForText("Viecz")

        waitForText("Help me move furniture")
        composeRule.onAllNodesWithText("Help me move furniture").onFirst().performClick()
        waitForText("Task Details")

        composeRule.onNodeWithText("Apply for this Task").performClick()
        waitForText("Apply for Task")
        composeRule.onNodeWithText("Submit Application").performClick()
        waitForText("Application Pending", timeoutMillis = 20000)

        // ======== Step 5: Bob logs out, Alice accepts application ========
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Marketplace")
        navigateToProfileAndLogout()

        loginUser(aliceEmail, alicePassword)

        waitForText("Help me move furniture")
        composeRule.onAllNodesWithText("Help me move furniture").onFirst().performClick()
        waitForText("Task Details")

        waitForText("Accept Application", timeoutMillis = 10000)
        composeRule.onNodeWithText("Accept Application").performClick()

        waitForText("Accept Application & Create Payment")
        composeRule.onNodeWithText("Accept").performClick()

        waitForText("Payment processed successfully!", timeoutMillis = 20000)

        // ======== Step 6: Alice taps "Message" button ========
        // Task is now IN_PROGRESS, so "Message" button should be visible
        waitForText("Message", timeoutMillis = 10000)

        // First tap creates conversation (async), second navigates to chat.
        // Retry clicking "Message" until we reach the chat screen.
        composeRule.onNodeWithText("Message").performClick()
        Thread.sleep(3000)

        // If not on chat screen yet, try clicking "Message" again
        val onChatScreen = composeRule.onAllNodes(hasText("Type a message..."))
            .fetchSemanticsNodes().isNotEmpty()
        if (!onChatScreen) {
            try {
                composeRule.onNodeWithText("Message").performClick()
            } catch (_: AssertionError) {
                // "Message" button gone — may already be transitioning
            }
        }

        // ======== Step 7: Alice verifies ChatScreen UI ========
        waitForText("Type a message...", timeoutMillis = 15000)
        waitForText("Connected", timeoutMillis = 15000)

        // ======== Step 8: Alice sends a message ========
        composeRule.onNodeWithText("Type a message...").performClick()
        composeRule.onNodeWithText("Type a message...").performTextInput("Hello Bob, when can you start?")

        composeRule.onNodeWithContentDescription("Send").performClick()
        Thread.sleep(1000)

        // Verify message appeared
        waitForText("Hello Bob, when can you start?")

        // ======== Step 9: Alice verifies conversation list ========
        // Back from ChatScreen → TaskDetail
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Task Details", timeoutMillis = 10000)

        // Back from TaskDetail → MainScreen
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Marketplace")
        composeRule.onNodeWithText("Messages").performClick()
        Thread.sleep(2000)

        // Verify conversation exists with last message
        waitForText("Help me move furniture", timeoutMillis = 10000)
        waitForText("Hello Bob, when can you start?")

        // ======== Step 10: Alice logs out ========
        navigateToProfileAndLogout()

        // ======== Step 11: Bob logs in and checks Messages tab ========
        loginUser(bobEmail, bobPassword)

        composeRule.onNodeWithText("Messages").performClick()
        Thread.sleep(2000)

        // Verify Bob sees the conversation
        waitForText("Help me move furniture", timeoutMillis = 10000)
        waitForText("Hello Bob, when can you start?")

        // ======== Step 12: Bob reads Alice's message ========
        composeRule.onAllNodesWithText("Help me move furniture").onFirst().performClick()
        waitForText("Chat", timeoutMillis = 10000)
        waitForText("Connected", timeoutMillis = 15000)

        // Verify Alice's message appears as received
        waitForText("Hello Bob, when can you start?")

        // ======== Step 13: Bob sends a reply (Message 2/10) ========
        sendMessage("I can start tomorrow!")

        // Verify both messages visible
        waitForText("Hello Bob, when can you start?")
        waitForText("I can start tomorrow!")

        // ======== Step 13a: Bob logs out, Alice logs in to continue conversation ========
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Messages")
        navigateToProfileAndLogout()

        loginUser(aliceEmail, alicePassword)
        composeRule.onNodeWithText("Messages").performClick()
        Thread.sleep(2000)

        waitForText("Help me move furniture")
        composeRule.onAllNodesWithText("Help me move furniture").onFirst().performClick()
        waitForText("Chat", timeoutMillis = 10000)
        waitForText("Connected", timeoutMillis = 15000)

        // ======== Step 13b: Alice sends message 3/10 ========
        sendMessage("Great! What time works best for you?")
        waitForText("Great! What time works best for you?")

        // ======== Step 13c: Alice logs out, Bob logs in ========
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Messages")
        navigateToProfileAndLogout()

        loginUser(bobEmail, bobPassword)
        composeRule.onNodeWithText("Messages").performClick()
        Thread.sleep(2000)

        waitForText("Help me move furniture")
        composeRule.onAllNodesWithText("Help me move furniture").onFirst().performClick()
        waitForText("Chat", timeoutMillis = 10000)
        waitForText("Connected", timeoutMillis = 15000)

        // ======== Step 13d: Bob sends message 4/10 ========
        sendMessage("How about 2 PM?")
        waitForText("How about 2 PM?")

        // ======== Step 13e: Bob logs out, Alice logs in ========
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Messages")
        navigateToProfileAndLogout()

        loginUser(aliceEmail, alicePassword)
        composeRule.onNodeWithText("Messages").performClick()
        Thread.sleep(2000)

        waitForText("Help me move furniture")
        composeRule.onAllNodesWithText("Help me move furniture").onFirst().performClick()
        waitForText("Chat", timeoutMillis = 10000)
        waitForText("Connected", timeoutMillis = 15000)

        // ======== Step 13f: Alice sends message 5/10 ========
        sendMessage("Perfect! I'll be at home.")
        waitForText("Perfect! I'll be at home.")

        // ======== Step 13g: Alice logs out, Bob logs in ========
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Messages")
        navigateToProfileAndLogout()

        loginUser(bobEmail, bobPassword)
        composeRule.onNodeWithText("Messages").performClick()
        Thread.sleep(2000)

        waitForText("Help me move furniture")
        composeRule.onAllNodesWithText("Help me move furniture").onFirst().performClick()
        waitForText("Chat", timeoutMillis = 10000)
        waitForText("Connected", timeoutMillis = 15000)

        // ======== Step 13h: Bob sends message 6/10 ========
        sendMessage("Do you need me to bring any tools?")
        waitForText("Do you need me to bring any tools?")

        // ======== Step 13i: Bob logs out, Alice logs in ========
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Messages")
        navigateToProfileAndLogout()

        loginUser(aliceEmail, alicePassword)
        composeRule.onNodeWithText("Messages").performClick()
        Thread.sleep(2000)

        waitForText("Help me move furniture")
        composeRule.onAllNodesWithText("Help me move furniture").onFirst().performClick()
        waitForText("Chat", timeoutMillis = 10000)
        waitForText("Connected", timeoutMillis = 15000)

        // ======== Step 13j: Alice sends message 7/10 ========
        sendMessage("Yes, if you have a dolly that would be helpful.")
        waitForText("Yes, if you have a dolly that would be helpful.")

        // ======== Step 13k: Alice logs out, Bob logs in ========
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Messages")
        navigateToProfileAndLogout()

        loginUser(bobEmail, bobPassword)
        composeRule.onNodeWithText("Messages").performClick()
        Thread.sleep(2000)

        waitForText("Help me move furniture")
        composeRule.onAllNodesWithText("Help me move furniture").onFirst().performClick()
        waitForText("Chat", timeoutMillis = 10000)
        waitForText("Connected", timeoutMillis = 15000)

        // ======== Step 13l: Bob sends message 8/10 (2000-word long message) ========
        sendMessage(longMessage)
        // Verify long message was sent (check first 50 chars)
        waitForText(longMessage.take(50), timeoutMillis = 10000)

        // ======== Step 13m: Bob logs out, Alice logs in ========
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Messages")
        navigateToProfileAndLogout()

        loginUser(aliceEmail, alicePassword)
        composeRule.onNodeWithText("Messages").performClick()
        Thread.sleep(2000)

        waitForText("Help me move furniture")
        composeRule.onAllNodesWithText("Help me move furniture").onFirst().performClick()
        waitForText("Chat", timeoutMillis = 10000)
        waitForText("Connected", timeoutMillis = 15000)

        // ======== Step 13n: Alice sends message 9/10 ========
        sendMessage("Wow, thanks for all the detailed tips!")
        waitForText("Wow, thanks for all the detailed tips!")

        // ======== Step 13o: Alice logs out, Bob logs in ========
        composeRule.onNodeWithContentDescription("Back").performClick()
        waitForText("Messages")
        navigateToProfileAndLogout()

        loginUser(bobEmail, bobPassword)
        composeRule.onNodeWithText("Messages").performClick()
        Thread.sleep(2000)

        waitForText("Help me move furniture")
        composeRule.onAllNodesWithText("Help me move furniture").onFirst().performClick()
        waitForText("Chat", timeoutMillis = 10000)
        waitForText("Connected", timeoutMillis = 15000)

        // ======== Step 13p: Bob sends message 10/10 ========
        sendMessage("No problem, see you tomorrow!")
        waitForText("No problem, see you tomorrow!")

        // ======== Step 14: Bob verifies conversation list has the conversation ========
        composeRule.onNodeWithContentDescription("Back").performClick()

        // Should be back on Messages tab
        waitForText("Messages")
        composeRule.onNodeWithText("Messages").performClick()
        Thread.sleep(2000)

        // Verify conversation still exists
        waitForText("Help me move furniture", timeoutMillis = 10000)

        // ======== Step 15: Bob logs out ========
        navigateToProfileAndLogout()

        // ======== Step 16: Alice logs in and verifies complete conversation (all 10 messages) ========
        loginUser(aliceEmail, alicePassword)

        composeRule.onNodeWithText("Messages").performClick()
        Thread.sleep(2000)

        // Alice's conversation list loads fresh — should show Bob's last message
        waitForText("No problem, see you tomorrow!", timeoutMillis = 10000)

        // Open conversation and verify key messages from the 10-message exchange
        composeRule.onAllNodesWithText("Help me move furniture").onFirst().performClick()
        waitForText("Chat", timeoutMillis = 10000)
        waitForText("Connected", timeoutMillis = 15000)

        // LazyColumn auto-scrolls to bottom; earlier messages are off-screen
        // and not composed. Use scrollToAndVerifyText to scroll to each one.

        // Verify first few messages (scroll up)
        scrollToAndVerifyText("Hello Bob, when can you start?")
        scrollToAndVerifyText("I can start tomorrow!")
        scrollToAndVerifyText("Great! What time works best for you?")

        // Verify mid-conversation messages
        scrollToAndVerifyText("Perfect! I'll be at home.")
        scrollToAndVerifyText("Do you need me to bring any tools?")

        // Verify long message edge case (check first 50 chars)
        scrollToAndVerifyText(longMessage.take(50), timeoutMillis = 10000)

        // Verify final messages
        scrollToAndVerifyText("Wow, thanks for all the detailed tips!")
        scrollToAndVerifyText("No problem, see you tomorrow!")
    }
}
