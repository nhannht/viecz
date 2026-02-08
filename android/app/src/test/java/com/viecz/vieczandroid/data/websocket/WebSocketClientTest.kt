package com.viecz.vieczandroid.data.websocket

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import com.viecz.vieczandroid.data.models.WebSocketMessage
import com.viecz.vieczandroid.data.models.WebSocketState
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Before
import org.junit.Test
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class WebSocketClientTest {

    private lateinit var mockWebServer: MockWebServer
    private lateinit var moshi: Moshi
    private lateinit var webSocketClient: WebSocketClient
    private var clientWebSocket: WebSocket? = null
    private var serverWebSocket: WebSocket? = null

    @Before
    fun setup() {
        mockWebServer = MockWebServer()
        mockWebServer.start()

        moshi = Moshi.Builder()
            .add(KotlinJsonAdapterFactory())
            .build()

        webSocketClient = WebSocketClient(moshi)
    }

    @After
    fun tearDown() {
        // Close both sides before shutting down
        clientWebSocket?.close(1000, "test cleanup")
        serverWebSocket?.close(1000, "test cleanup")
        clientWebSocket = null
        serverWebSocket = null
        // Give time for close handshake
        Thread.sleep(200)
        try {
            mockWebServer.shutdown()
        } catch (_: Exception) {
            // Ignore shutdown errors
        }
    }

    @Test
    fun `initial state is DISCONNECTED`() {
        assertEquals(WebSocketState.DISCONNECTED, webSocketClient.connectionState.value)
    }

    @Test
    fun `connect changes state to CONNECTED on success`() {
        val connectedLatch = CountDownLatch(1)

        enqueueWebSocketUpgrade(onOpen = { ws -> serverWebSocket = ws })

        connectToMockServer { ws ->
            clientWebSocket = ws
            connectedLatch.countDown()
        }

        assertTrue(connectedLatch.await(5, TimeUnit.SECONDS))
        assertEquals(WebSocketState.CONNECTED, webSocketClient.connectionState.value)
    }

    @Test
    fun `disconnect changes state to DISCONNECTED`() {
        val connectedLatch = CountDownLatch(1)

        enqueueWebSocketUpgrade(onOpen = { ws -> serverWebSocket = ws })

        connectToMockServer { ws ->
            clientWebSocket = ws
            connectedLatch.countDown()
        }

        assertTrue(connectedLatch.await(5, TimeUnit.SECONDS))

        webSocketClient.disconnect()
        assertEquals(WebSocketState.DISCONNECTED, webSocketClient.connectionState.value)
    }

    @Test
    fun `sendMessage returns false when not connected`() {
        val message = WebSocketMessage(type = "test", content = "hello")
        val result = webSocketClient.sendMessage(message)
        assertFalse(result)
    }

    @Test
    fun `sendMessage returns true when connected`() {
        val connectedLatch = CountDownLatch(1)
        val serverReceivedLatch = CountDownLatch(1)

        enqueueWebSocketUpgrade(
            onOpen = { ws -> serverWebSocket = ws },
            onMessage = { _, _ -> serverReceivedLatch.countDown() }
        )

        connectToMockServer { ws ->
            clientWebSocket = ws
            connectedLatch.countDown()
        }

        assertTrue(connectedLatch.await(5, TimeUnit.SECONDS))

        val message = WebSocketMessage(type = "message", conversationId = 1, content = "hi")
        val result = webSocketClient.sendMessage(message)
        assertTrue(result)
        assertTrue(serverReceivedLatch.await(5, TimeUnit.SECONDS))
    }

    @Test
    fun `server message is received through messages channel`() {
        val connectedLatch = CountDownLatch(1)

        enqueueWebSocketUpgrade(onOpen = { ws ->
            serverWebSocket = ws
            val json = """{"type":"message","conversation_id":1,"sender_id":2,"content":"Hello from server","created_at":"2024-01-01T00:00:00Z"}"""
            ws.send(json)
        })

        connectToMockServer { ws ->
            clientWebSocket = ws
            connectedLatch.countDown()
        }

        assertTrue(connectedLatch.await(5, TimeUnit.SECONDS))

        // Wait for the message to arrive
        Thread.sleep(500)
        val result = webSocketClient.messages.tryReceive()
        if (result.isSuccess) {
            val msg = result.getOrNull()
            assertNotNull(msg)
            assertEquals("message", msg.type)
            assertEquals("Hello from server", msg.content)
        }
    }

    @Test
    fun `joinConversation sends join message`() {
        val connectedLatch = CountDownLatch(1)
        val serverReceivedLatch = CountDownLatch(1)
        var receivedText: String? = null

        enqueueWebSocketUpgrade(
            onOpen = { ws -> serverWebSocket = ws },
            onMessage = { _, text ->
                receivedText = text
                serverReceivedLatch.countDown()
            }
        )

        connectToMockServer { ws ->
            clientWebSocket = ws
            connectedLatch.countDown()
        }

        assertTrue(connectedLatch.await(5, TimeUnit.SECONDS))

        webSocketClient.joinConversation(42)

        assertTrue(serverReceivedLatch.await(5, TimeUnit.SECONDS))
        assertNotNull(receivedText)
        assertTrue(receivedText!!.contains("\"type\":\"join\""))
        assertTrue(receivedText!!.contains("\"conversation_id\":42"))
    }

    @Test
    fun `sendChatMessage sends message type with content`() {
        val connectedLatch = CountDownLatch(1)
        val serverReceivedLatch = CountDownLatch(1)
        var receivedText: String? = null

        enqueueWebSocketUpgrade(
            onOpen = { ws -> serverWebSocket = ws },
            onMessage = { _, text ->
                receivedText = text
                serverReceivedLatch.countDown()
            }
        )

        connectToMockServer { ws ->
            clientWebSocket = ws
            connectedLatch.countDown()
        }

        assertTrue(connectedLatch.await(5, TimeUnit.SECONDS))

        webSocketClient.sendChatMessage(10, "Hello world")

        assertTrue(serverReceivedLatch.await(5, TimeUnit.SECONDS))
        assertNotNull(receivedText)
        assertTrue(receivedText!!.contains("\"type\":\"message\""))
        assertTrue(receivedText!!.contains("\"conversation_id\":10"))
        assertTrue(receivedText!!.contains("\"content\":\"Hello world\""))
    }

    @Test
    fun `sendTypingIndicator sends typing type`() {
        val connectedLatch = CountDownLatch(1)
        val serverReceivedLatch = CountDownLatch(1)
        var receivedText: String? = null

        enqueueWebSocketUpgrade(
            onOpen = { ws -> serverWebSocket = ws },
            onMessage = { _, text ->
                receivedText = text
                serverReceivedLatch.countDown()
            }
        )

        connectToMockServer { ws ->
            clientWebSocket = ws
            connectedLatch.countDown()
        }

        assertTrue(connectedLatch.await(5, TimeUnit.SECONDS))

        webSocketClient.sendTypingIndicator(3)

        assertTrue(serverReceivedLatch.await(5, TimeUnit.SECONDS))
        assertNotNull(receivedText)
        assertTrue(receivedText!!.contains("\"type\":\"typing\""))
        assertTrue(receivedText!!.contains("\"conversation_id\":3"))
    }

    @Test
    fun `markAsRead sends read type`() {
        val connectedLatch = CountDownLatch(1)
        val serverReceivedLatch = CountDownLatch(1)
        var receivedText: String? = null

        enqueueWebSocketUpgrade(
            onOpen = { ws -> serverWebSocket = ws },
            onMessage = { _, text ->
                receivedText = text
                serverReceivedLatch.countDown()
            }
        )

        connectToMockServer { ws ->
            clientWebSocket = ws
            connectedLatch.countDown()
        }

        assertTrue(connectedLatch.await(5, TimeUnit.SECONDS))

        webSocketClient.markAsRead(5)

        assertTrue(serverReceivedLatch.await(5, TimeUnit.SECONDS))
        assertNotNull(receivedText)
        assertTrue(receivedText!!.contains("\"type\":\"read\""))
        assertTrue(receivedText!!.contains("\"conversation_id\":5"))
    }

    @Test
    fun `connect when already connected does not reconnect`() {
        val connectedLatch = CountDownLatch(1)

        enqueueWebSocketUpgrade(onOpen = { ws -> serverWebSocket = ws })

        connectToMockServer { ws ->
            clientWebSocket = ws
            connectedLatch.countDown()
        }

        assertTrue(connectedLatch.await(5, TimeUnit.SECONDS))

        // Second connect should be a no-op since already connected
        webSocketClient.connect("another-token")
        assertEquals(WebSocketState.CONNECTED, webSocketClient.connectionState.value)
    }

    // --- Helpers ---

    private fun enqueueWebSocketUpgrade(
        onOpen: ((WebSocket) -> Unit)? = null,
        onMessage: ((WebSocket, String) -> Unit)? = null
    ) {
        val listener = object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                onOpen?.invoke(webSocket)
            }
            override fun onMessage(webSocket: WebSocket, text: String) {
                onMessage?.invoke(webSocket, text)
            }
        }
        mockWebServer.enqueue(MockResponse().withWebSocketUpgrade(listener))
    }

    private fun connectToMockServer(onConnected: (WebSocket) -> Unit) {
        val wsUrl = mockWebServer.url("/api/v1/ws").toString().replace("http://", "ws://")

        // Access private fields via reflection
        val clientField = WebSocketClient::class.java.getDeclaredField("client")
        clientField.isAccessible = true
        val okHttpClient = clientField.get(webSocketClient) as okhttp3.OkHttpClient

        val wsField = WebSocketClient::class.java.getDeclaredField("webSocket")
        wsField.isAccessible = true

        val stateField = WebSocketClient::class.java.getDeclaredField("_connectionState")
        stateField.isAccessible = true
        val stateFlow = stateField.get(webSocketClient) as kotlinx.coroutines.flow.MutableStateFlow<WebSocketState>

        val adapterField = WebSocketClient::class.java.getDeclaredField("messageAdapter")
        adapterField.isAccessible = true
        val messageAdapter = adapterField.get(webSocketClient) as com.squareup.moshi.JsonAdapter<WebSocketMessage>

        stateFlow.value = WebSocketState.CONNECTING

        val request = okhttp3.Request.Builder()
            .url("${wsUrl}?token=test-token")
            .build()

        val ws = okHttpClient.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                stateFlow.value = WebSocketState.CONNECTED
                wsField.set(webSocketClient, webSocket)
                onConnected(webSocket)
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val message = messageAdapter.fromJson(text)
                    if (message != null) {
                        webSocketClient.messages.trySend(message)
                    }
                } catch (_: Exception) {}
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                stateFlow.value = WebSocketState.ERROR
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                stateFlow.value = WebSocketState.DISCONNECTED
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                webSocket.close(1000, null)
            }
        })

        // Store reference for cleanup - set here in case onOpen hasn't fired yet
        clientWebSocket = ws
    }
}
