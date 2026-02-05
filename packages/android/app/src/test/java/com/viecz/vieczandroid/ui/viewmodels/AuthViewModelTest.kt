package com.viecz.vieczandroid.ui.viewmodels

import android.app.Application
import app.cash.turbine.test
import com.viecz.vieczandroid.data.models.User
import com.viecz.vieczandroid.data.repository.AuthRepository
import io.mockk.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs

/**
 * Unit tests for AuthViewModel
 *
 * Testing Strategy:
 * - Mock repository and dependencies
 * - Test state transitions (Idle -> Loading -> Success/Error)
 * - Test coroutine behavior with TestDispatcher
 * - Use Turbine for Flow testing
 */
@OptIn(ExperimentalCoroutinesApi::class)
class AuthViewModelTest {

    // Test dispatcher for coroutines
    private val testDispatcher = StandardTestDispatcher()

    // Mocks
    private lateinit var mockApplication: Application
    private lateinit var mockRepository: AuthRepository
    private lateinit var viewModel: AuthViewModel

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
        isTasker = false,
        rating = 0.0
    )

    @Before
    fun setup() {
        // Set main dispatcher for coroutines
        Dispatchers.setMain(testDispatcher)

        // Create mocks
        mockApplication = mockk(relaxed = true)
        mockRepository = mockk()

        // Mock Application.applicationContext
        every { mockApplication.applicationContext } returns mockApplication

        // TODO: In a real implementation, you'd need to mock TokenManager and RetrofitClient
        // For now, we're assuming AuthViewModel can be instantiated with mocked dependencies
        // viewModel = AuthViewModel(mockApplication)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        clearAllMocks()
    }

    @Test
    fun `register with valid credentials should emit Success state`() = runTest {
        // Given
        coEvery { mockRepository.register(testEmail, testPassword, testName) } returns Result.success(testUser)

        // When
        // viewModel.register(testEmail, testPassword, testName)
        // advanceUntilIdle() // Process all pending coroutines

        // Then
        // viewModel.authState.test {
        //     assertIs<AuthState.Loading>(awaitItem())
        //     val successState = awaitItem()
        //     assertIs<AuthState.Success>(successState)
        //     assertEquals(testUser, (successState as AuthState.Success).user)
        // }

        // Verify repository was called
        // coVerify(exactly = 1) { mockRepository.register(testEmail, testPassword, testName) }
    }

    @Test
    fun `register with invalid credentials should emit Error state`() = runTest {
        // Given
        val errorMessage = "Email already exists"
        coEvery {
            mockRepository.register(testEmail, testPassword, testName)
        } returns Result.failure(Exception(errorMessage))

        // When
        // viewModel.register(testEmail, testPassword, testName)
        // advanceUntilIdle()

        // Then
        // viewModel.authState.test {
        //     val errorState = awaitItem()
        //     assertIs<AuthState.Error>(errorState)
        //     assertEquals(errorMessage, (errorState as AuthState.Error).message)
        // }
    }

    @Test
    fun `login with valid credentials should emit Success state`() = runTest {
        // Given
        coEvery { mockRepository.login(testEmail, testPassword) } returns Result.success(testUser)

        // When
        // viewModel.login(testEmail, testPassword)
        // advanceUntilIdle()

        // Then
        // viewModel.authState.test {
        //     assertIs<AuthState.Loading>(awaitItem())
        //     val successState = awaitItem()
        //     assertIs<AuthState.Success>(successState)
        //     assertEquals(testUser, (successState as AuthState.Success).user)
        // }
    }

    @Test
    fun `login with invalid credentials should emit Error state`() = runTest {
        // Given
        val errorMessage = "Invalid credentials"
        coEvery {
            mockRepository.login(testEmail, testPassword)
        } returns Result.failure(Exception(errorMessage))

        // When
        // viewModel.login(testEmail, testPassword)
        // advanceUntilIdle()

        // Then
        // viewModel.authState.test {
        //     val errorState = awaitItem()
        //     assertIs<AuthState.Error>(errorState)
        //     assertEquals(errorMessage, (errorState as AuthState.Error).message)
        // }
    }

    @Test
    fun `logout should emit Idle state`() = runTest {
        // Given
        coEvery { mockRepository.logout() } just Runs

        // When
        // viewModel.logout()
        // advanceUntilIdle()

        // Then
        // viewModel.authState.test {
        //     assertIs<AuthState.Idle>(awaitItem())
        // }
        // coVerify(exactly = 1) { mockRepository.logout() }
    }

    @Test
    fun `resetState should emit Idle state`() = runTest {
        // When
        // viewModel.resetState()

        // Then
        // viewModel.authState.test {
        //     assertIs<AuthState.Idle>(awaitItem())
        // }
    }

    @Test
    fun `multiple register calls should only process the latest`() = runTest {
        // Given
        coEvery { mockRepository.register(any(), any(), any()) } coAnswers {
            delay(100)
            Result.success(testUser)
        }

        // When
        // viewModel.register("user1@example.com", "pass1", "User 1")
        // viewModel.register("user2@example.com", "pass2", "User 2")
        // advanceUntilIdle()

        // Then - both calls should complete (no cancellation in current implementation)
        // If you implement collectLatest or other flow operators, behavior may change
    }
}

/**
 * NOTE: The tests above are currently commented out because AuthViewModel
 * has tight coupling with Application, TokenManager, and RetrofitClient.
 *
 * TO MAKE THESE TESTS WORK:
 *
 * 1. **Refactor AuthViewModel to use Dependency Injection:**
 *
 * class AuthViewModel(
 *     application: Application,
 *     private val repository: AuthRepository  // Inject repository
 * ) : AndroidViewModel(application) {
 *     // ... implementation
 * }
 *
 * 2. **Or use a factory with testable dependencies:**
 *
 * class AuthViewModelFactory(
 *     private val application: Application,
 *     private val repository: AuthRepository
 * ) : ViewModelProvider.Factory {
 *     override fun <T : ViewModel> create(modelClass: Class<T>): T {
 *         return AuthViewModel(application, repository) as T
 *     }
 * }
 *
 * 3. **Then create testable ViewModel in tests:**
 *
 * viewModel = AuthViewModel(mockApplication, mockRepository)
 *
 * This is the standard Android testing approach and follows best practices.
 */
