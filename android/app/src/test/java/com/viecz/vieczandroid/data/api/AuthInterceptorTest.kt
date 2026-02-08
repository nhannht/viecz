package com.viecz.vieczandroid.data.api

import com.viecz.vieczandroid.data.local.TokenManager
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class AuthInterceptorTest {

    private lateinit var mockWebServer: MockWebServer
    private lateinit var tokenManager: TokenManager

    @Before
    fun setup() {
        mockWebServer = MockWebServer()
        mockWebServer.start()
        tokenManager = mockk()
    }

    @After
    fun tearDown() {
        mockWebServer.shutdown()
    }

    @Test
    fun `adds Authorization header when token exists`() = runTest {
        every { tokenManager.accessToken } returns flowOf("my-jwt-token")

        val interceptor = AuthInterceptor(tokenManager)
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

        val interceptor = AuthInterceptor(tokenManager)
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

        val interceptor = AuthInterceptor(tokenManager)
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

        val interceptor = AuthInterceptor(tokenManager)
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

        val interceptor = AuthInterceptor(tokenManager)
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
}
