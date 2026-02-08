package com.viecz.vieczandroid.data.repository

import com.viecz.vieczandroid.data.api.MessageApi
import com.viecz.vieczandroid.data.models.CreateConversationRequest
import com.viecz.vieczandroid.testutil.TestData
import io.mockk.*
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Before
import org.junit.Test
import java.io.IOException
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class MessageRepositoryTest {

    private lateinit var mockApi: MessageApi
    private lateinit var repository: MessageRepository

    @Before
    fun setup() {
        mockApi = mockk()
        repository = MessageRepository(mockApi)
    }

    @After
    fun tearDown() {
        clearAllMocks()
    }

    // --- getConversations ---

    @Test
    fun `getConversations should return conversations on success`() = runTest {
        val conversations = listOf(
            TestData.createConversation(id = 1, lastMessage = "Hello"),
            TestData.createConversation(id = 2, lastMessage = "Hi there")
        )
        coEvery { mockApi.getConversations() } returns conversations

        val result = repository.getConversations()

        assertTrue(result.isSuccess)
        assertEquals(2, result.getOrNull()?.size)
    }

    @Test
    fun `getConversations should return empty list when no conversations`() = runTest {
        coEvery { mockApi.getConversations() } returns emptyList()

        val result = repository.getConversations()

        assertTrue(result.isSuccess)
        assertEquals(0, result.getOrNull()?.size)
    }

    @Test
    fun `getConversations with error should return failure`() = runTest {
        coEvery { mockApi.getConversations() } throws IOException("No network")

        val result = repository.getConversations()

        assertTrue(result.isFailure)
    }

    // --- createConversation ---

    @Test
    fun `createConversation should return conversation on success`() = runTest {
        val conversation = TestData.createConversation(id = 10, taskId = 1, taskerId = 2)
        coEvery { mockApi.createConversation(any()) } returns conversation

        val result = repository.createConversation(1, 2)

        assertTrue(result.isSuccess)
        assertEquals(10L, result.getOrNull()?.id)
    }

    @Test
    fun `createConversation should pass correct request`() = runTest {
        val conversation = TestData.createConversation()
        coEvery { mockApi.createConversation(any()) } returns conversation

        repository.createConversation(5, 10)

        coVerify { mockApi.createConversation(CreateConversationRequest(5, 10)) }
    }

    @Test
    fun `createConversation with error should return failure`() = runTest {
        coEvery { mockApi.createConversation(any()) } throws RuntimeException("Failed")

        val result = repository.createConversation(1, 2)

        assertTrue(result.isFailure)
    }

    // --- getMessages ---

    @Test
    fun `getMessages should return messages on success`() = runTest {
        val messages = listOf(
            TestData.createMessage(id = 1, content = "Hello"),
            TestData.createMessage(id = 2, content = "Hi"),
            TestData.createMessage(id = 3, content = "How are you?")
        )
        coEvery { mockApi.getConversationMessages(1, any(), any()) } returns messages

        val result = repository.getMessages(1)

        assertTrue(result.isSuccess)
        assertEquals(3, result.getOrNull()?.size)
        assertEquals("Hello", result.getOrNull()?.get(0)?.content)
    }

    @Test
    fun `getMessages should pass correct pagination parameters`() = runTest {
        coEvery { mockApi.getConversationMessages(any(), any(), any()) } returns emptyList()

        repository.getMessages(1, limit = 25, offset = 50)

        coVerify { mockApi.getConversationMessages(1, 25, 50) }
    }

    @Test
    fun `getMessages should use default pagination`() = runTest {
        coEvery { mockApi.getConversationMessages(any(), any(), any()) } returns emptyList()

        repository.getMessages(1)

        coVerify { mockApi.getConversationMessages(1, 50, 0) }
    }

    @Test
    fun `getMessages with error should return failure`() = runTest {
        coEvery { mockApi.getConversationMessages(1, any(), any()) } throws IOException("No network")

        val result = repository.getMessages(1)

        assertTrue(result.isFailure)
    }
}
