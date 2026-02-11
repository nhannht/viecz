package com.viecz.vieczandroid.data.api

import com.viecz.vieczandroid.data.auth.AuthEvent
import com.viecz.vieczandroid.data.auth.AuthEventManager
import com.viecz.vieczandroid.data.local.TokenManager
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNull

class AuthInterceptorTest {

    private lateinit var mockWebServer: MockWebServer
    private lateinit var tokenManager: TokenManager
    private lateinit var authEventManager: AuthEventManager

    @Before
    fun setup() {
        mockWebServer = MockWebServer()
        mockWebServer.start()
        tokenManager = mockk(relaxed = true)
        authEventManager = AuthEventManager()
    }

    @After
    fun tearDown() {
        mockWebServer.shutdown()
    }

    @Test
    fun `adds Authorization header when token exists`() = runTest {
        every { tokenManager.accessToken } returns flowOf("my-jwt-token")

        val interceptor = AuthInterceptor(tokenManager, authEventManager)
        val client = OkHttpClient.Builder()
            .addInterceptor(interceptor)
            .build()

        mockWebServer.enqueue(MockResponse().setBody("{}"))

        client.newCall(
            Request.Builder()
                .url(mockWebServer.url("/api/v1/test"))
                .build()
        ).execute()

        val request = mockWebServer.takeRequest()
        assertEquals("Bearer my-jwt-token", request.getHeader("Authorization"))
    }

    @Test
    fun `does not add Authorization header when token is null`() = runTest {
        every { tokenManager.accessToken } returns flowOf(null)

        val interceptor = AuthInterceptor(tokenManager, authEventManager)
        val client = OkHttpClient.Builder()
            .addInterceptor(interceptor)
            .build()

        mockWebServer.enqueue(MockResponse().setBody("{}"))

        client.newCall(
            Request.Builder()
                .url(mockWebServer.url("/api/v1/test"))
                .build()
        ).execute()

        val request = mockWebServer.takeRequest()
        assertNull(request.getHeader("Authorization"))
    }

    @Test
    fun `preserves original request when no token`() = runTest {
        every { tokenManager.accessToken } returns flowOf(null)

        val interceptor = AuthInterceptor(tokenManager, authEventManager)
        val client = OkHttpClient.Builder()
            .addInterceptor(interceptor)
            .build()

        mockWebServer.enqueue(MockResponse().setBody("{}"))

        client.newCall(
            Request.Builder()
                .url(mockWebServer.url("/api/v1/users/me"))
                .addHeader("Content-Type", "application/json")
                .build()
        ).execute()

        val request = mockWebServer.takeRequest()
        assertEquals("application/json", request.getHeader("Content-Type"))
        assertNull(request.getHeader("Authorization"))
        assertEquals("/api/v1/users/me", request.path)
    }

    @Test
    fun `adds header alongside existing headers`() = runTest {
        every { tokenManager.accessToken } returns flowOf("token-123")

        val interceptor = AuthInterceptor(tokenManager, authEventManager)
        val client = OkHttpClient.Builder()
            .addInterceptor(interceptor)
            .build()

        mockWebServer.enqueue(MockResponse().setBody("{}"))

        client.newCall(
            Request.Builder()
                .url(mockWebServer.url("/api/v1/tasks"))
                .addHeader("Accept", "application/json")
                .addHeader("X-Custom", "value")
                .build()
        ).execute()

        val request = mockWebServer.takeRequest()
        assertEquals("Bearer token-123", request.getHeader("Authorization"))
        assertEquals("application/json", request.getHeader("Accept"))
        assertEquals("value", request.getHeader("X-Custom"))
    }

    @Test
    fun `uses Bearer token format`() = runTest {
        every { tokenManager.accessToken } returns flowOf("abc.def.ghi")

        val interceptor = AuthInterceptor(tokenManager, authEventManager)
        val client = OkHttpClient.Builder()
            .addInterceptor(interceptor)
            .build()

        mockWebServer.enqueue(MockResponse().setBody("{}"))

        client.newCall(
            Request.Builder()
                .url(mockWebServer.url("/api/v1/wallet"))
                .build()
        ).execute()

        val request = mockWebServer.takeRequest()
        val authHeader = request.getHeader("Authorization")!!
        assert(authHeader.startsWith("Bearer "))
        assertEquals("abc.def.ghi", authHeader.removePrefix("Bearer "))
    }

    @Test
    fun `clears tokens and emits unauthorized event on 401 response`() = runTest {
        every { tokenManager.accessToken } returns flowOf("expired-token")

        val interceptor = AuthInterceptor(tokenManager, authEventManager)
        val client = OkHttpClient.Builder()
            .addInterceptor(interceptor)
            .build()

        mockWebServer.enqueue(MockResponse().setResponseCode(401).setBody("""{"error":"unauthorized"}"""))

        // Collect auth events in background using UnconfinedTestDispatcher for eager dispatch
        val events = mutableListOf<AuthEvent>()
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) {
            authEventManager.authEvents.collect { events.add(it) }
        }

        client.newCall(
            Request.Builder()
                .url(mockWebServer.url("/api/v1/tasks"))
                .build()
        ).execute()

        coVerify { tokenManager.clearTokens() }
        assertEquals(1, events.size)
        assertIs<AuthEvent.Unauthorized>(events.first())
    }

    @Test
    fun `does not clear tokens on 401 from login endpoint`() = runTest {
        every { tokenManager.accessToken } returns flowOf(null)

        val interceptor = AuthInterceptor(tokenManager, authEventManager)
        val client = OkHttpClient.Builder()
            .addInterceptor(interceptor)
            .build()

        mockWebServer.enqueue(MockResponse().setResponseCode(401).setBody("""{"error":"invalid credentials"}"""))

        val events = mutableListOf<AuthEvent>()
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) {
            authEventManager.authEvents.collect { events.add(it) }
        }

        client.newCall(
            Request.Builder()
                .url(mockWebServer.url("/api/v1/auth/login"))
                .build()
        ).execute()

        coVerify(exactly = 0) { tokenManager.clearTokens() }
        assertEquals(0, events.size)
    }

    @Test
    fun `does not clear tokens on 401 from register endpoint`() = runTest {
        every { tokenManager.accessToken } returns flowOf(null)

        val interceptor = AuthInterceptor(tokenManager, authEventManager)
        val client = OkHttpClient.Builder()
            .addInterceptor(interceptor)
            .build()

        mockWebServer.enqueue(MockResponse().setResponseCode(401).setBody("""{"error":"email already exists"}"""))

        val events = mutableListOf<AuthEvent>()
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) {
            authEventManager.authEvents.collect { events.add(it) }
        }

        client.newCall(
            Request.Builder()
                .url(mockWebServer.url("/api/v1/auth/register"))
                .build()
        ).execute()

        coVerify(exactly = 0) { tokenManager.clearTokens() }
        assertEquals(0, events.size)
    }

    @Test
    fun `does not emit unauthorized event on successful response`() = runTest {
        every { tokenManager.accessToken } returns flowOf("valid-token")

        val interceptor = AuthInterceptor(tokenManager, authEventManager)
        val client = OkHttpClient.Builder()
            .addInterceptor(interceptor)
            .build()

        mockWebServer.enqueue(MockResponse().setResponseCode(200).setBody("{}"))

        client.newCall(
            Request.Builder()
                .url(mockWebServer.url("/api/v1/tasks"))
                .build()
        ).execute()

        // Verify clearTokens was NOT called
        coVerify(exactly = 0) { tokenManager.clearTokens() }
    }
}
