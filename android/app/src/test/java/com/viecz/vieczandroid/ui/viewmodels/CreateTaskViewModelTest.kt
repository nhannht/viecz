package com.viecz.vieczandroid.ui.viewmodels

import app.cash.turbine.test
import com.viecz.vieczandroid.data.repository.TaskRepository
import com.viecz.vieczandroid.data.repository.WalletRepository
import com.viecz.vieczandroid.testutil.CoroutineTestRule
import com.viecz.vieczandroid.testutil.TestData
import io.mockk.*
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class CreateTaskViewModelTest {

    @get:Rule
    val coroutineRule = CoroutineTestRule()

    private lateinit var mockRepository: TaskRepository
    private lateinit var mockWalletRepository: WalletRepository
    private lateinit var viewModel: CreateTaskViewModel

    @Before
    fun setup() {
        mockRepository = mockk()
        mockWalletRepository = mockk(relaxed = true)
        coEvery { mockWalletRepository.getWallet() } returns Result.failure(Exception("not configured"))
        viewModel = CreateTaskViewModel(mockRepository, mockWalletRepository)
    }

    @After
    fun tearDown() {
        clearAllMocks()
    }

    @Test
    fun `initial state should be empty form`() = runTest {
        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals("", state.title)
            assertEquals("", state.description)
            assertNull(state.categoryId)
            assertEquals("", state.price)
            assertEquals("", state.location)
            assertNull(state.error)
            assertNull(state.createdTask)
        }
    }

    @Test
    fun `updateTitle should update title in state`() = runTest {
        viewModel.updateTitle("Clean my room")

        viewModel.uiState.test {
            assertEquals("Clean my room", awaitItem().title)
        }
    }

    @Test
    fun `updateTitle with short title should show validation error`() = runTest {
        viewModel.updateTitle("Hi")

        viewModel.uiState.test {
            val state = awaitItem()
            assertNotNull(state.titleError)
            assertEquals("Title must be at least 5 characters", state.titleError)
        }
    }

    @Test
    fun `updateTitle with blank title should show required error`() = runTest {
        viewModel.updateTitle("")

        viewModel.uiState.test {
            assertEquals("Title is required", awaitItem().titleError)
        }
    }

    @Test
    fun `updateDescription should update description in state`() = runTest {
        viewModel.updateDescription("Please clean my room thoroughly")

        viewModel.uiState.test {
            assertEquals("Please clean my room thoroughly", awaitItem().description)
        }
    }

    @Test
    fun `updateDescription with short text should show validation error`() = runTest {
        viewModel.updateDescription("Short")

        viewModel.uiState.test {
            assertEquals("Description must be at least 10 characters", awaitItem().descriptionError)
        }
    }

    @Test
    fun `updatePrice with valid number should clear error`() = runTest {
        viewModel.updatePrice("50000")

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals("50000", state.price)
            assertNull(state.priceError)
        }
    }

    @Test
    fun `updatePrice with non-numeric should show error`() = runTest {
        viewModel.updatePrice("abc")

        viewModel.uiState.test {
            assertEquals("Price must be a number", awaitItem().priceError)
        }
    }

    @Test
    fun `updatePrice with zero should show error`() = runTest {
        viewModel.updatePrice("0")

        viewModel.uiState.test {
            assertEquals("Price must be greater than 0", awaitItem().priceError)
        }
    }

    @Test
    fun `updateLocation with valid location should clear error`() = runTest {
        viewModel.updateLocation("Ho Chi Minh City")

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals("Ho Chi Minh City", state.location)
            assertNull(state.locationError)
        }
    }

    @Test
    fun `updateLocation with short text should show error`() = runTest {
        viewModel.updateLocation("HN")

        viewModel.uiState.test {
            assertEquals("Location must be at least 3 characters", awaitItem().locationError)
        }
    }

    @Test
    fun `updateCategory should update category and clear error`() = runTest {
        viewModel.updateCategory(3)

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals(3L, state.categoryId)
            assertNull(state.categoryError)
        }
    }

    @Test
    fun `createTask with valid form should emit Success with created task`() = runTest {
        val createdTask = TestData.createTask(id = 10, title = "Clean Room")
        coEvery { mockRepository.createTask(any()) } returns Result.success(createdTask)

        // Fill in the form
        viewModel.updateTitle("Clean Room")
        viewModel.updateDescription("Please clean my room thoroughly")
        viewModel.updateCategory(1)
        viewModel.updatePrice("50000")
        viewModel.updateLocation("Ho Chi Minh City")

        viewModel.createTask()
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertNotNull(state.createdTask)
            assertEquals(10L, state.createdTask?.id)
            assertNull(state.error)
        }
    }

    @Test
    fun `createTask with empty form should show validation errors`() = runTest {
        viewModel.createTask()
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertNotNull(state.titleError)
            assertNotNull(state.descriptionError)
            assertNotNull(state.categoryError)
            assertNotNull(state.priceError)
            assertNotNull(state.locationError)
            assertNull(state.createdTask) // Should not create
        }

        coVerify(exactly = 0) { mockRepository.createTask(any()) }
    }

    @Test
    fun `createTask with API error should emit error state`() = runTest {
        coEvery { mockRepository.createTask(any()) } returns Result.failure(Exception("Server error"))

        viewModel.updateTitle("Clean Room")
        viewModel.updateDescription("Please clean my room thoroughly")
        viewModel.updateCategory(1)
        viewModel.updatePrice("50000")
        viewModel.updateLocation("Ho Chi Minh City")

        viewModel.createTask()
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals("Server error", state.error)
            assertNull(state.createdTask)
        }
    }

    @Test
    fun `clearError should clear error message`() = runTest {
        coEvery { mockRepository.createTask(any()) } returns Result.failure(Exception("Error"))

        viewModel.updateTitle("Clean Room")
        viewModel.updateDescription("Please clean my room thoroughly")
        viewModel.updateCategory(1)
        viewModel.updatePrice("50000")
        viewModel.updateLocation("Ho Chi Minh City")
        viewModel.createTask()
        advanceUntilIdle()

        viewModel.clearError()

        viewModel.uiState.test {
            assertNull(awaitItem().error)
        }
    }

    @Test
    fun `resetForm should reset all fields to defaults`() = runTest {
        viewModel.updateTitle("Some title here")
        viewModel.updateDescription("Some description")
        viewModel.updateCategory(1)
        viewModel.updatePrice("50000")
        viewModel.updateLocation("Some location")

        viewModel.resetForm()

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals("", state.title)
            assertEquals("", state.description)
            assertNull(state.categoryId)
            assertEquals("", state.price)
            assertEquals("", state.location)
        }
    }
}
