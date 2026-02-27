package com.viecz.vieczandroid.data.repository

import com.viecz.vieczandroid.data.api.UpdateProfileRequest
import com.viecz.vieczandroid.data.api.UserApi
import com.viecz.vieczandroid.testutil.TestData
import io.mockk.*
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Before
import org.junit.Test
import retrofit2.HttpException
import java.io.IOException
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertTrue

class UserRepositoryTest {

    private lateinit var mockApi: UserApi
    private lateinit var repository: UserRepository

    @Before
    fun setup() {
        mockApi = mockk()
        repository = UserRepository(mockApi)
    }

    @After
    fun tearDown() {
        clearAllMocks()
    }

    // --- getUserProfile ---

    @Test
    fun `getUserProfile should return user on success`() = runTest {
        val user = TestData.createUser(id = 5, name = "John Doe")
        coEvery { mockApi.getUserProfile(5) } returns user

        val result = repository.getUserProfile(5)

        assertTrue(result.isSuccess)
        assertEquals("John Doe", result.getOrNull()?.name)
    }

    @Test
    fun `getUserProfile with HTTP 404 should return failure`() = runTest {
        val httpException = mockk<HttpException> {
            every { code() } returns 404
            every { message() } returns "Not Found"
        }
        coEvery { mockApi.getUserProfile(999) } throws httpException

        val result = repository.getUserProfile(999)

        assertTrue(result.isFailure)
        assertIs<HttpException>(result.exceptionOrNull())
    }

    @Test
    fun `getUserProfile with network error should return failure`() = runTest {
        coEvery { mockApi.getUserProfile(1) } throws IOException("No network")

        val result = repository.getUserProfile(1)

        assertTrue(result.isFailure)
        assertIs<IOException>(result.exceptionOrNull())
    }

    // --- getMyProfile ---

    @Test
    fun `getMyProfile should return current user on success`() = runTest {
        val user = TestData.createUser(email = "me@example.com")
        coEvery { mockApi.getMyProfile() } returns user

        val result = repository.getMyProfile()

        assertTrue(result.isSuccess)
        assertEquals("me@example.com", result.getOrNull()?.email)
    }

    @Test
    fun `getMyProfile with HTTP 401 should return failure`() = runTest {
        val httpException = mockk<HttpException> {
            every { code() } returns 401
            every { message() } returns "Unauthorized"
        }
        coEvery { mockApi.getMyProfile() } throws httpException

        val result = repository.getMyProfile()

        assertTrue(result.isFailure)
    }

    @Test
    fun `getMyProfile with network error should return failure`() = runTest {
        coEvery { mockApi.getMyProfile() } throws IOException("No network")

        val result = repository.getMyProfile()

        assertTrue(result.isFailure)
    }

    // --- updateProfile ---

    @Test
    fun `updateProfile should return updated user on success`() = runTest {
        val request = UpdateProfileRequest(name = "Updated Name", phone = "0123456789")
        val updatedUser = TestData.createUser(name = "Updated Name", phone = "0123456789")
        coEvery { mockApi.updateProfile(request) } returns updatedUser

        val result = repository.updateProfile(request)

        assertTrue(result.isSuccess)
        assertEquals("Updated Name", result.getOrNull()?.name)
        assertEquals("0123456789", result.getOrNull()?.phone)
    }

    @Test
    fun `updateProfile with HTTP error should return failure`() = runTest {
        val request = UpdateProfileRequest(name = "Test")
        val httpException = mockk<HttpException> {
            every { code() } returns 400
        }
        coEvery { mockApi.updateProfile(request) } throws httpException

        val result = repository.updateProfile(request)

        assertTrue(result.isFailure)
    }

    @Test
    fun `updateProfile with network error should return failure`() = runTest {
        val request = UpdateProfileRequest(name = "Test")
        coEvery { mockApi.updateProfile(request) } throws IOException("No network")

        val result = repository.updateProfile(request)

        assertTrue(result.isFailure)
    }

}
