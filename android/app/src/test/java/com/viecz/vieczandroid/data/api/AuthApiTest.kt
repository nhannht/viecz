package com.viecz.vieczandroid.data.api

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
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

class AuthApiTest {

    private lateinit var mockWebServer: MockWebServer
    private lateinit var authApi: AuthApi

    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    @Before
    fun setup() {
        mockWebServer = MockWebServer()
        mockWebServer.start()

        authApi = Retrofit.Builder()
            .baseUrl(mockWebServer.url("/api/v1/"))
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(AuthApi::class.java)
    }

    @After
    fun tearDown() {
        mockWebServer.shutdown()
    }

    @Test
    fun `register sends POST to auth_register with correct body`() = runTest {
        val responseJson = """
            {
                "access_token": "test-access-token",
                "refresh_token": "test-refresh-token",
                "user": {
                    "id": 1,
                    "email": "test@example.com",
                    "name": "Test User",
                    "university": "Test University",
                    "is_verified": false,
                    "rating": 0.0,
                    "total_tasks_completed": 0,
                    "total_tasks_posted": 0,
                    "total_earnings": 0,
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-01-01T00:00:00Z"
                }
            }
        """.trimIndent()

        mockWebServer.enqueue(MockResponse().setBody(responseJson).setResponseCode(200))

        val result = authApi.register(
            com.viecz.vieczandroid.data.models.RegisterRequest(
                email = "test@example.com",
                password = "Password123",
                name = "Test User"
            )
        )

        assertEquals("test-access-token", result.accessToken)
        assertEquals("test-refresh-token", result.refreshToken)
        assertEquals(1L, result.user.id)
        assertEquals("test@example.com", result.user.email)

        val request = mockWebServer.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/api/v1/auth/register", request.path)
        val body = request.body.readUtf8()
        assert(body.contains("\"email\":\"test@example.com\""))
        assert(body.contains("\"password\":\"Password123\""))
        assert(body.contains("\"name\":\"Test User\""))
    }

    @Test
    fun `login sends POST to auth_login with correct body`() = runTest {
        val responseJson = """
            {
                "access_token": "login-access-token",
                "refresh_token": "login-refresh-token",
                "user": {
                    "id": 2,
                    "email": "user@example.com",
                    "name": "Login User",
                    "university": "HCMUS",
                    "is_verified": true,
                    "rating": 4.5,
                    "total_tasks_completed": 10,
                    "total_tasks_posted": 5,
                    "total_earnings": 500000,
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-06-01T00:00:00Z"
                }
            }
        """.trimIndent()

        mockWebServer.enqueue(MockResponse().setBody(responseJson).setResponseCode(200))

        val result = authApi.login(
            com.viecz.vieczandroid.data.models.LoginRequest(
                email = "user@example.com",
                password = "SecurePass123"
            )
        )

        assertEquals("login-access-token", result.accessToken)
        assertEquals("login-refresh-token", result.refreshToken)
        assertEquals(2L, result.user.id)
        assertEquals("user@example.com", result.user.email)

        val request = mockWebServer.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/api/v1/auth/login", request.path)
        val body = request.body.readUtf8()
        assert(body.contains("\"email\":\"user@example.com\""))
        assert(body.contains("\"password\":\"SecurePass123\""))
    }

    @Test
    fun `refreshToken sends POST to auth_refresh with refresh token`() = runTest {
        val responseJson = """
            {
                "access_token": "new-access-token"
            }
        """.trimIndent()

        mockWebServer.enqueue(MockResponse().setBody(responseJson).setResponseCode(200))

        val result = authApi.refreshToken(
            com.viecz.vieczandroid.data.models.RefreshTokenRequest(
                refreshToken = "old-refresh-token"
            )
        )

        assertEquals("new-access-token", result.accessToken)

        val request = mockWebServer.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/api/v1/auth/refresh", request.path)
        val body = request.body.readUtf8()
        assert(body.contains("\"refresh_token\":\"old-refresh-token\""))
    }

    @Test
    fun `login with invalid credentials returns 401`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(401)
                .setBody("""{"error":"Invalid credentials"}""")
        )

        assertFailsWith<HttpException> {
            authApi.login(
                com.viecz.vieczandroid.data.models.LoginRequest(
                    email = "wrong@example.com",
                    password = "wrong"
                )
            )
        }.also { exception ->
            assertEquals(401, exception.code())
        }
    }

    @Test
    fun `register with duplicate email returns 400`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(400)
                .setBody("""{"error":"Email already exists"}""")
        )

        assertFailsWith<HttpException> {
            authApi.register(
                com.viecz.vieczandroid.data.models.RegisterRequest(
                    email = "existing@example.com",
                    password = "Password123",
                    name = "Test"
                )
            )
        }.also { exception ->
            assertEquals(400, exception.code())
        }
    }

    @Test
    fun `refreshToken with expired token returns 401`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(401)
                .setBody("""{"error":"Token expired"}""")
        )

        assertFailsWith<HttpException> {
            authApi.refreshToken(
                com.viecz.vieczandroid.data.models.RefreshTokenRequest(
                    refreshToken = "expired-token"
                )
            )
        }.also { exception ->
            assertEquals(401, exception.code())
        }
    }
}
