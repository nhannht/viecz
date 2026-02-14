package com.viecz.vieczandroid.ui.viewmodels

import app.cash.turbine.test
import com.viecz.vieczandroid.auth.GoogleSignInManager
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.repository.AuthRepository
import com.viecz.vieczandroid.testutil.CoroutineTestRule
import com.viecz.vieczandroid.testutil.TestData
import io.mockk.*
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs

@OptIn(ExperimentalCoroutinesApi::class)
class AuthViewModelTest {

    @get:Rule
    val coroutineRule = CoroutineTestRule()

    private lateinit var mockRepository: AuthRepository
    private lateinit var mockTokenManager: TokenManager
    private lateinit var viewModel: AuthViewModel

    private val testUser = TestData.createUser()

    @Before
    fun setup() {
        mockRepository = mockk()
        mockTokenManager = mockk(relaxed = true)

        every { mockTokenManager.isLoggedIn } returns MutableStateFlow(false)

        viewModel = AuthViewModel(mockRepository, mockTokenManager, mockk(relaxed = true))
    }

    @After
    fun tearDown() {
        clearAllMocks()
    }

    @Test
    fun `initial state should be Idle`() = runTest {
        viewModel.authState.test {
            assertIs<AuthState.Idle>(awaitItem())
        }
    }

    @Test
    fun `login with valid credentials should emit Success state`() = runTest {
        coEvery { mockRepository.login(any(), any()) } returns Result.success(testUser)

        viewModel.login("test@example.com", "Password123")
        advanceUntilIdle()

        viewModel.authState.test {
            val state = awaitItem()
            assertIs<AuthState.Success>(state)
            assertEquals(testUser, (state as AuthState.Success).user)
        }
    }

    @Test
    fun `login with invalid credentials should emit Error state`() = runTest {
        coEvery { mockRepository.login(any(), any()) } returns Result.failure(Exception("Invalid credentials"))

        viewModel.login("test@example.com", "wrong")
        advanceUntilIdle()

        viewModel.authState.test {
            val state = awaitItem()
            assertIs<AuthState.Error>(state)
            assertEquals("Invalid credentials", (state as AuthState.Error).message)
        }
    }

    @Test
    fun `login with network error should emit Error state`() = runTest {
        coEvery { mockRepository.login(any(), any()) } returns Result.failure(Exception("Network error. Please check your connection."))

        viewModel.login("test@example.com", "Password123")
        advanceUntilIdle()

        viewModel.authState.test {
            val state = awaitItem()
            assertIs<AuthState.Error>(state)
            assertEquals("Network error. Please check your connection.", (state as AuthState.Error).message)
        }
    }

    @Test
    fun `register with valid data should emit Success state`() = runTest {
        coEvery { mockRepository.register(any(), any(), any()) } returns Result.success(testUser)

        viewModel.register("test@example.com", "Password123", "Test User")
        advanceUntilIdle()

        viewModel.authState.test {
            val state = awaitItem()
            assertIs<AuthState.Success>(state)
            assertEquals(testUser, (state as AuthState.Success).user)
        }
    }

    @Test
    fun `register with duplicate email should emit Error state`() = runTest {
        coEvery { mockRepository.register(any(), any(), any()) } returns Result.failure(Exception("Email already exists"))

        viewModel.register("test@example.com", "Password123", "Test User")
        advanceUntilIdle()

        viewModel.authState.test {
            val state = awaitItem()
            assertIs<AuthState.Error>(state)
            assertEquals("Email already exists", (state as AuthState.Error).message)
        }
    }

    @Test
    fun `register with null error message should use fallback message`() = runTest {
        coEvery { mockRepository.register(any(), any(), any()) } returns Result.failure(Exception())

        viewModel.register("test@example.com", "Password123", "Test User")
        advanceUntilIdle()

        viewModel.authState.test {
            val state = awaitItem()
            assertIs<AuthState.Error>(state)
            assertEquals("Registration failed", (state as AuthState.Error).message)
        }
    }

    @Test
    fun `logout should emit Idle state`() = runTest {
        coEvery { mockRepository.logout() } just Runs

        viewModel.logout()
        advanceUntilIdle()

        viewModel.authState.test {
            assertIs<AuthState.Idle>(awaitItem())
        }

        coVerify(exactly = 1) { mockRepository.logout() }
    }

    @Test
    fun `resetState should emit Idle state`() = runTest {
        // First set a non-idle state
        coEvery { mockRepository.login(any(), any()) } returns Result.success(testUser)
        viewModel.login("test@example.com", "Password123")
        advanceUntilIdle()

        // Then reset
        viewModel.resetState()

        viewModel.authState.test {
            assertIs<AuthState.Idle>(awaitItem())
        }
    }

    @Test
    fun `login should call repository with correct parameters`() = runTest {
        coEvery { mockRepository.login(any(), any()) } returns Result.success(testUser)

        viewModel.login("user@test.com", "MyPassword1")
        advanceUntilIdle()

        coVerify(exactly = 1) { mockRepository.login("user@test.com", "MyPassword1") }
    }

    @Test
    fun `register should call repository with correct parameters`() = runTest {
        coEvery { mockRepository.register(any(), any(), any()) } returns Result.success(testUser)

        viewModel.register("user@test.com", "MyPassword1", "John Doe")
        advanceUntilIdle()

        coVerify(exactly = 1) { mockRepository.register("user@test.com", "MyPassword1", "John Doe") }
    }

    @Test
    fun `isLoggedIn should reflect TokenManager state`() = runTest {
        val loggedInFlow = MutableStateFlow(true)
        every { mockTokenManager.isLoggedIn } returns loggedInFlow

        val vm = AuthViewModel(mockRepository, mockTokenManager, mockk(relaxed = true))

        vm.isLoggedIn.test {
            assertEquals(true, awaitItem())
        }
    }

    @Test
    fun `login failure with null message should use Login failed fallback`() = runTest {
        coEvery { mockRepository.login(any(), any()) } returns Result.failure(Exception())

        viewModel.login("test@example.com", "Password123")
        advanceUntilIdle()

        viewModel.authState.test {
            val state = awaitItem()
            assertIs<AuthState.Error>(state)
            assertEquals("Login failed", (state as AuthState.Error).message)
        }
    }
}
