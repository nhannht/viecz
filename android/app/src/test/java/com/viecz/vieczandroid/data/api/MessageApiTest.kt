package com.viecz.vieczandroid.data.api

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import com.viecz.vieczandroid.data.models.CreateConversationRequest
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Before
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class MessageApiTest {

    private lateinit var mockWebServer: MockWebServer
    private lateinit var messageApi: MessageApi

    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    @Before
    fun setup() {
        mockWebServer = MockWebServer()
        mockWebServer.start()

        messageApi = Retrofit.Builder()
            .baseUrl(mockWebServer.url("/api/v1/"))
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(MessageApi::class.java)
    }

    @After
    fun tearDown() {
        mockWebServer.shutdown()
    }

    @Test
    fun `getConversations sends GET to conversations`() = runTest {
        val responseJson = """
            [
                {
                    "id": 1,
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-01-01T00:00:00Z",
                    "task_id": 5,
                    "poster_id": 1,
                    "tasker_id": 2,
                    "last_message_at": "2024-01-01T12:00:00Z",
                    "last_message": "Hello, I can help!"
                },
                {
                    "id": 2,
                    "created_at": "2024-01-02T00:00:00Z",
                    "updated_at": "2024-01-02T00:00:00Z",
                    "task_id": 10,
                    "poster_id": 1,
                    "tasker_id": 3
                }
            ]
        """.trimIndent()

        mockWebServer.enqueue(MockResponse().setBody(responseJson))

        val result = messageApi.getConversations()

        assertEquals(2, result.size)
        assertEquals(1L, result[0].id)
        assertEquals(5L, result[0].taskId)
        assertEquals("Hello, I can help!", result[0].lastMessage)
        assertEquals(null, result[1].lastMessage)

        val request = mockWebServer.takeRequest()
        assertEquals("GET", request.method)
        assertEquals("/api/v1/conversations", request.path)
    }

    @Test
    fun `createConversation sends POST to conversations`() = runTest {
        val responseJson = """
            {
                "id": 3,
                "created_at": "2024-01-03T00:00:00Z",
                "updated_at": "2024-01-03T00:00:00Z",
                "task_id": 15,
                "poster_id": 1,
                "tasker_id": 4
            }
        """.trimIndent()

        mockWebServer.enqueue(MockResponse().setBody(responseJson))

        val result = messageApi.createConversation(
            CreateConversationRequest(taskId = 15, taskerId = 4)
        )

        assertEquals(3L, result.id)
        assertEquals(15L, result.taskId)
        assertEquals(4L, result.taskerId)

        val request = mockWebServer.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/api/v1/conversations", request.path)
        val body = request.body.readUtf8()
        assert(body.contains("\"task_id\":15"))
        assert(body.contains("\"tasker_id\":4"))
    }

    @Test
    fun `getConversationMessages sends GET with default pagination`() = runTest {
        val responseJson = """
            [
                {
                    "id": 1,
                    "created_at": "2024-01-01T10:00:00Z",
                    "conversation_id": 1,
                    "sender_id": 1,
                    "content": "Hi, are you available?",
                    "is_read": true,
                    "read_at": "2024-01-01T10:05:00Z"
                },
                {
                    "id": 2,
                    "created_at": "2024-01-01T10:10:00Z",
                    "conversation_id": 1,
                    "sender_id": 2,
                    "content": "Yes, I can help!",
                    "is_read": false
                }
            ]
        """.trimIndent()

        mockWebServer.enqueue(MockResponse().setBody(responseJson))

        val result = messageApi.getConversationMessages(1)

        assertEquals(2, result.size)
        assertEquals("Hi, are you available?", result[0].content)
        assertEquals(true, result[0].isRead)
        assertEquals("Yes, I can help!", result[1].content)
        assertEquals(false, result[1].isRead)

        val request = mockWebServer.takeRequest()
        assertEquals("GET", request.method)
        assert(request.path!!.startsWith("/api/v1/conversations/1/messages"))
        assert(request.path!!.contains("limit=50"))
        assert(request.path!!.contains("offset=0"))
    }

    @Test
    fun `getConversationMessages sends GET with custom pagination`() = runTest {
        mockWebServer.enqueue(MockResponse().setBody("[]"))

        messageApi.getConversationMessages(1, limit = 25, offset = 50)

        val request = mockWebServer.takeRequest()
        assertEquals("GET", request.method)
        assert(request.path!!.contains("limit=25"))
        assert(request.path!!.contains("offset=50"))
    }

    @Test
    fun `getConversations with empty list returns empty`() = runTest {
        mockWebServer.enqueue(MockResponse().setBody("[]"))

        val result = messageApi.getConversations()

        assertTrue(result.isEmpty())
    }

    @Test
    fun `getConversationMessages with empty list returns empty`() = runTest {
        mockWebServer.enqueue(MockResponse().setBody("[]"))

        val result = messageApi.getConversationMessages(1)

        assertTrue(result.isEmpty())
    }

    @Test
    fun `getConversations without auth returns 401`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(401)
                .setBody("""{"error":"Unauthorized"}""")
        )

        assertFailsWith<HttpException> {
            messageApi.getConversations()
        }.also { exception ->
            assertEquals(401, exception.code())
        }
    }

    @Test
    fun `createConversation with duplicate returns 409`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(409)
                .setBody("""{"error":"Conversation already exists"}""")
        )

        assertFailsWith<HttpException> {
            messageApi.createConversation(
                CreateConversationRequest(taskId = 15, taskerId = 4)
            )
        }.also { exception ->
            assertEquals(409, exception.code())
        }
    }
}
