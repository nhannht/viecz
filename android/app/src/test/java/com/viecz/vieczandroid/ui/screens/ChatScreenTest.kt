package com.viecz.vieczandroid.ui.screens

import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.models.TaskStatus
import com.viecz.vieczandroid.data.models.WebSocketState
import com.viecz.vieczandroid.data.repository.MessageRepository
import com.viecz.vieczandroid.data.websocket.WebSocketClient
import com.viecz.vieczandroid.testutil.CoroutineTestRule
import com.viecz.vieczandroid.testutil.TestData
import com.viecz.vieczandroid.ui.viewmodels.ChatViewModel
import io.mockk.clearAllMocks
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.flowOf
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ChatScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @get:Rule
    val coroutineRule = CoroutineTestRule()

    private lateinit var mockMessageRepo: MessageRepository
    private lateinit var mockWebSocketClient: WebSocketClient
    private lateinit var mockTokenManager: TokenManager
    private lateinit var viewModel: ChatViewModel

    @Before
    fun setup() {
        mockMessageRepo = mockk(relaxed = true)
        mockWebSocketClient = mockk(relaxed = true)
        mockTokenManager = mockk(relaxed = true)

        // Set up WebSocket mock
        every { mockWebSocketClient.connectionState } returns MutableStateFlow(WebSocketState.DISCONNECTED)
        every { mockWebSocketClient.messages } returns Channel(Channel.UNLIMITED)

        // Set up token
        every { mockTokenManager.accessToken } returns flowOf("test-token")

        // Set up message repo - return empty messages and conversations by default
        coEvery { mockMessageRepo.getMessages(any()) } returns Result.success(emptyList())
        coEvery { mockMessageRepo.getConversations() } returns Result.success(emptyList())

        viewModel = ChatViewModel(mockMessageRepo, mockWebSocketClient, mockTokenManager)
    }

    @After
    fun tearDown() {
        clearAllMocks()
    }

    @Test
    fun `ChatScreen displays app bar title`() {
        composeTestRule.setContent {
            MaterialTheme {
                ChatScreen(conversationId = 1, onNavigateBack = {}, viewModel = viewModel)
            }
        }

        composeTestRule.onNodeWithText("Chat").assertIsDisplayed()
    }

    @Test
    fun `ChatScreen displays connection status`() {
        composeTestRule.setContent {
            MaterialTheme {
                ChatScreen(conversationId = 1, onNavigateBack = {}, viewModel = viewModel)
            }
        }

        composeTestRule.onNodeWithText("Disconnected").assertIsDisplayed()
    }

    @Test
    fun `ChatScreen displays back button`() {
        composeTestRule.setContent {
            MaterialTheme {
                ChatScreen(conversationId = 1, onNavigateBack = {}, viewModel = viewModel)
            }
        }

        composeTestRule.onNodeWithContentDescription("Back").assertIsDisplayed()
    }

    @Test
    fun `ChatScreen back button triggers navigation`() {
        var navigatedBack = false

        composeTestRule.setContent {
            MaterialTheme {
                ChatScreen(
                    conversationId = 1,
                    onNavigateBack = { navigatedBack = true },
                    viewModel = viewModel
                )
            }
        }

        composeTestRule.onNodeWithContentDescription("Back").performClick()
        assert(navigatedBack)
    }

    @Test
    fun `ChatScreen displays message input field`() {
        composeTestRule.setContent {
            MaterialTheme {
                ChatScreen(conversationId = 1, onNavigateBack = {}, viewModel = viewModel)
            }
        }

        composeTestRule.onNodeWithText("Type a message...").assertIsDisplayed()
    }

    @Test
    fun `ChatScreen displays send button`() {
        composeTestRule.setContent {
            MaterialTheme {
                ChatScreen(conversationId = 1, onNavigateBack = {}, viewModel = viewModel)
            }
        }

        composeTestRule.onNodeWithContentDescription("Send").assertIsDisplayed()
    }

    @Test
    fun `ChatScreen displays messages when loaded`() {
        val messages = listOf(
            TestData.createMessage(id = 1, content = "Hello!", sender = TestData.createUser(name = "Alice")),
            TestData.createMessage(id = 2, content = "Hi there!", sender = null)
        )
        coEvery { mockMessageRepo.getMessages(any()) } returns Result.success(messages)

        val vm = ChatViewModel(mockMessageRepo, mockWebSocketClient, mockTokenManager)

        composeTestRule.setContent {
            MaterialTheme {
                ChatScreen(conversationId = 1, onNavigateBack = {}, viewModel = vm)
            }
        }

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithText("Hello!").assertExists()
        composeTestRule.onNodeWithText("Hi there!").assertExists()
    }

    @Test
    fun `ChatScreen shows error state when load fails`() {
        coEvery { mockMessageRepo.getMessages(any()) } returns Result.failure(Exception("Network error"))

        val vm = ChatViewModel(mockMessageRepo, mockWebSocketClient, mockTokenManager)

        composeTestRule.setContent {
            MaterialTheme {
                ChatScreen(conversationId = 1, onNavigateBack = {}, viewModel = vm)
            }
        }

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithText("Retry").assertExists()
    }

    @Test
    fun `ChatScreen shows connected status when websocket connected`() {
        every { mockWebSocketClient.connectionState } returns MutableStateFlow(WebSocketState.CONNECTED)

        val vm = ChatViewModel(mockMessageRepo, mockWebSocketClient, mockTokenManager)

        composeTestRule.setContent {
            MaterialTheme {
                ChatScreen(conversationId = 1, onNavigateBack = {}, viewModel = vm)
            }
        }

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithText("Connected").assertIsDisplayed()
    }

    @Test
    fun `ChatScreen shows closed notice for completed task`() {
        val conversation = TestData.createConversation(
            id = 1,
            task = TestData.createTask(status = TaskStatus.COMPLETED)
        )
        coEvery { mockMessageRepo.getConversations() } returns Result.success(listOf(conversation))

        val vm = ChatViewModel(mockMessageRepo, mockWebSocketClient, mockTokenManager)

        composeTestRule.setContent {
            MaterialTheme {
                ChatScreen(conversationId = 1, onNavigateBack = {}, viewModel = vm)
            }
        }

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithText("This task is completed. Chat is closed.").assertIsDisplayed()
        composeTestRule.onNodeWithText("Type a message...").assertDoesNotExist()
    }

    @Test
    fun `ChatScreen shows closed notice for cancelled task`() {
        val conversation = TestData.createConversation(
            id = 1,
            task = TestData.createTask(status = TaskStatus.CANCELLED)
        )
        coEvery { mockMessageRepo.getConversations() } returns Result.success(listOf(conversation))

        val vm = ChatViewModel(mockMessageRepo, mockWebSocketClient, mockTokenManager)

        composeTestRule.setContent {
            MaterialTheme {
                ChatScreen(conversationId = 1, onNavigateBack = {}, viewModel = vm)
            }
        }

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithText("This task is cancelled. Chat is closed.").assertIsDisplayed()
        composeTestRule.onNodeWithText("Type a message...").assertDoesNotExist()
    }

    @Test
    fun `ChatScreen shows task completed status in top bar for finished task`() {
        val conversation = TestData.createConversation(
            id = 1,
            task = TestData.createTask(status = TaskStatus.COMPLETED)
        )
        coEvery { mockMessageRepo.getConversations() } returns Result.success(listOf(conversation))

        val vm = ChatViewModel(mockMessageRepo, mockWebSocketClient, mockTokenManager)

        composeTestRule.setContent {
            MaterialTheme {
                ChatScreen(conversationId = 1, onNavigateBack = {}, viewModel = vm)
            }
        }

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithText("Task completed").assertIsDisplayed()
    }
}
