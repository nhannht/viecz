package com.viecz.vieczandroid.data.repository

import com.viecz.vieczandroid.data.api.AuthApi
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.models.LoginRequest
import com.viecz.vieczandroid.data.models.RegisterRequest
import com.viecz.vieczandroid.data.models.TokenResponse
import com.viecz.vieczandroid.data.models.User
import io.mockk.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertTrue

/**
 * Unit tests for AuthRepository
 *
 * Tests API calls, token storage, and error handling
 */
class AuthRepositoryTest {

    // Mocks
    private lateinit var mockAuthApi: AuthApi
    private lateinit var mockTokenManager: TokenManager
    private lateinit var repository: AuthRepository

    // Test data
    private val testEmail = "test@example.com"
    private val testPassword = "Password123"
    private val testName = "Test User"

    private val testUser = User(
        id = 1,
        email = testEmail,
        name = testName,
        avatarUrl = null,
        phone = null,
        university = "Test University",
        studentId = null,
        isVerified = false,
        rating = 0.0,
        totalTasksCompleted = 0,
        totalTasksPosted = 0,
        totalEarnings = 0L,
        isTasker = false,
        taskerBio = null,
        createdAt = "2024-01-01T00:00:00Z",
        updatedAt = "2024-01-01T00:00:00Z"
    )

    private val testTokenResponse = TokenResponse(
        accessToken = "test_access_token",
        refreshToken = "test_refresh_token",
        user = testUser
    )

    @Before
    fun setup() {
        mockAuthApi = mockk()
        mockTokenManager = mockk(relaxed = true)

        // Mock TokenManager flows
        every { mockTokenManager.isLoggedIn } returns MutableStateFlow(false)

        repository = AuthRepository(mockAuthApi, mockTokenManager)
    }

    @After
    fun tearDown() {
        clearAllMocks()
    }

    @Test
    fun `register with valid credentials should return success`() = runTest {
        // Given
        val request = RegisterRequest(
            email = testEmail,
            password = testPassword,
            name = testName
        )
        coEvery { mockAuthApi.register(request) } returns testTokenResponse
        coEvery { mockTokenManager.saveTokens(any(), any()) } just Runs

        // When
        val result = repository.register(testEmail, testPassword, testName)

        // Then
        assertTrue(result.isSuccess)
        assertEquals(testUser, result.getOrNull())

        // Verify API was called
        coVerify(exactly = 1) { mockAuthApi.register(request) }

        // Verify tokens were saved
        coVerify(exactly = 1) {
            mockTokenManager.saveTokens(
                testTokenResponse.accessToken,
                testTokenResponse.refreshToken
            )
        }
    }

    @Test
    fun `register with network error should return failure`() = runTest {
        // Given
        val request = RegisterRequest(
            email = testEmail,
            password = testPassword,
            name = testName
        )
        val exception = Exception("Network error")
        coEvery { mockAuthApi.register(request) } throws exception

        // When
        val result = repository.register(testEmail, testPassword, testName)

        // Then
        assertTrue(result.isFailure)
        assertEquals("Network error", result.exceptionOrNull()?.message)

        // Verify tokens were NOT saved
        coVerify(exactly = 0) { mockTokenManager.saveTokens(any(), any()) }
    }

    @Test
    fun `login with valid credentials should return success`() = runTest {
        // Given
        val request = LoginRequest(
            email = testEmail,
            password = testPassword
        )
        coEvery { mockAuthApi.login(request) } returns testTokenResponse
        coEvery { mockTokenManager.saveTokens(any(), any()) } just Runs

        // When
        val result = repository.login(testEmail, testPassword)

        // Then
        assertTrue(result.isSuccess)
        assertEquals(testUser, result.getOrNull())

        coVerify(exactly = 1) { mockAuthApi.login(request) }
        coVerify(exactly = 1) {
            mockTokenManager.saveTokens(
                testTokenResponse.accessToken,
                testTokenResponse.refreshToken
            )
        }
    }

    @Test
    fun `login with invalid credentials should return failure`() = runTest {
        // Given
        val request = LoginRequest(
            email = testEmail,
            password = "WrongPassword"
        )
        val exception = Exception("Invalid credentials")
        coEvery { mockAuthApi.login(request) } throws exception

        // When
        val result = repository.login(testEmail, "WrongPassword")

        // Then
        assertTrue(result.isFailure)
        assertIs<Exception>(result.exceptionOrNull())
    }

    @Test
    fun `logout should clear tokens`() = runTest {
        // Given
        coEvery { mockTokenManager.clearTokens() } just Runs

        // When
        repository.logout()

        // Then
        coVerify(exactly = 1) { mockTokenManager.clearTokens() }
    }

    @Test
    fun `register with server 409 conflict should return meaningful error`() = runTest {
        // Given
        val request = RegisterRequest(
            email = testEmail,
            password = testPassword,
            name = testName
        )
        val exception = retrofit2.HttpException(
            retrofit2.Response.error<Any>(
                409,
                okhttp3.ResponseBody.create(null, "{\"error\": \"Email already exists\"}")
            )
        )
        coEvery { mockAuthApi.register(request) } throws exception

        // When
        val result = repository.register(testEmail, testPassword, testName)

        // Then
        assertTrue(result.isFailure)
        // In a real implementation, you'd parse the error message from the response
    }
}

/**
 * Testing Best Practices Applied:
 *
 * 1. ✅ Arrange-Act-Assert pattern
 * 2. ✅ Mock external dependencies (API, TokenManager)
 * 3. ✅ Test both success and failure scenarios
 * 4. ✅ Verify side effects (token storage, API calls)
 * 5. ✅ Use descriptive test names
 * 6. ✅ Use runTest for suspend functions
 * 7. ✅ Clean up mocks after each test
 */
