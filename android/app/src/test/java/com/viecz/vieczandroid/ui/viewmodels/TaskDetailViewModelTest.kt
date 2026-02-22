package com.viecz.vieczandroid.ui.viewmodels

import app.cash.turbine.test
import com.viecz.vieczandroid.data.local.TokenManager
import com.viecz.vieczandroid.data.models.*
import com.viecz.vieczandroid.data.repository.MessageRepository
import com.viecz.vieczandroid.data.repository.PaymentRepository
import com.viecz.vieczandroid.data.repository.TaskRepository
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
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class TaskDetailViewModelTest {

    @get:Rule
    val coroutineRule = CoroutineTestRule()

    private lateinit var mockTaskRepository: TaskRepository
    private lateinit var mockPaymentRepository: PaymentRepository
    private lateinit var mockMessageRepository: MessageRepository
    private lateinit var mockTokenManager: TokenManager
    private lateinit var viewModel: TaskDetailViewModel

    @Before
    fun setup() {
        mockTaskRepository = mockk()
        mockPaymentRepository = mockk()
        mockMessageRepository = mockk()
        mockTokenManager = mockk()
        every { mockTokenManager.userId } returns MutableStateFlow(1L)
        every { mockTokenManager.isTasker } returns MutableStateFlow(true)
        viewModel = TaskDetailViewModel(mockTaskRepository, mockPaymentRepository, mockMessageRepository, mockTokenManager)
    }

    @After
    fun tearDown() {
        clearAllMocks()
    }

    @Test
    fun `initial state should be empty`() = runTest {
        viewModel.uiState.test {
            val state = awaitItem()
            assertNull(state.task)
            assertTrue(state.applications.isEmpty())
            assertFalse(state.isLoading)
            assertNull(state.error)
        }
    }

    @Test
    fun `loadTask should emit task on success`() = runTest {
        val task = TestData.createTask(id = 5, title = "Clean Room")
        coEvery { mockTaskRepository.getTask(5) } returns Result.success(task)
        coEvery { mockTaskRepository.getTaskApplications(5) } returns Result.success(emptyList())

        viewModel.loadTask(5)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertNotNull(state.task)
            assertEquals("Clean Room", state.task?.title)
            assertFalse(state.isLoading)
        }
    }

    @Test
    fun `loadTask should also load applications`() = runTest {
        val task = TestData.createTask(id = 5)
        val applications = listOf(
            TestData.createTaskApplication(id = 1, taskId = 5),
            TestData.createTaskApplication(id = 2, taskId = 5)
        )
        coEvery { mockTaskRepository.getTask(5) } returns Result.success(task)
        coEvery { mockTaskRepository.getTaskApplications(5) } returns Result.success(applications)

        viewModel.loadTask(5)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals(2, state.applications.size)
        }
    }

    @Test
    fun `loadTask with error should emit error state`() = runTest {
        coEvery { mockTaskRepository.getTask(5) } returns Result.failure(Exception("Not found"))

        viewModel.loadTask(5)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertNull(state.task)
            assertEquals("Not found", state.error)
            assertFalse(state.isLoading)
        }
    }

    @Test
    fun `acceptApplication success should trigger escrow payment`() = runTest {
        val task = TestData.createTask(id = 1)
        val escrowResponse = CreateEscrowPaymentResponse(
            transaction = TestData.createTransaction(),
            checkoutUrl = null // Mock wallet mode
        )
        coEvery { mockTaskRepository.getTask(1) } returns Result.success(task)
        coEvery { mockTaskRepository.getTaskApplications(1) } returns Result.success(emptyList())
        coEvery { mockTaskRepository.acceptApplication(10) } returns Result.success(
            TestData.createAcceptApplicationResponse()
        )
        coEvery { mockPaymentRepository.createEscrowPayment(1) } returns Result.success(escrowResponse)

        // Set up task first
        viewModel.loadTask(1)
        advanceUntilIdle()

        viewModel.acceptApplication(10)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state.acceptSuccess)
            assertTrue(state.paymentSuccess)
        }
    }

    @Test
    fun `acceptApplication with PayOS checkout should emit checkout URL`() = runTest {
        val task = TestData.createTask(id = 1)
        val escrowResponse = CreateEscrowPaymentResponse(
            transaction = TestData.createTransaction(),
            checkoutUrl = "https://pay.example.com/checkout"
        )
        coEvery { mockTaskRepository.getTask(1) } returns Result.success(task)
        coEvery { mockTaskRepository.getTaskApplications(1) } returns Result.success(emptyList())
        coEvery { mockTaskRepository.acceptApplication(10) } returns Result.success(
            TestData.createAcceptApplicationResponse()
        )
        coEvery { mockPaymentRepository.createEscrowPayment(1) } returns Result.success(escrowResponse)

        viewModel.loadTask(1)
        advanceUntilIdle()

        viewModel.acceptApplication(10)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state.acceptSuccess)
            assertEquals("https://pay.example.com/checkout", state.paymentCheckoutUrl)
        }
    }

    @Test
    fun `acceptApplication failure should emit error`() = runTest {
        val task = TestData.createTask(id = 1)
        coEvery { mockTaskRepository.getTask(1) } returns Result.success(task)
        coEvery { mockTaskRepository.getTaskApplications(1) } returns Result.success(emptyList())
        coEvery { mockTaskRepository.acceptApplication(10) } returns Result.failure(Exception("Unauthorized"))

        viewModel.loadTask(1)
        advanceUntilIdle()

        viewModel.acceptApplication(10)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals("Unauthorized", state.error)
            assertFalse(state.acceptSuccess)
        }
    }

    @Test
    fun `completeTask should complete task and release payment atomically`() = runTest {
        val completedTask = TestData.createTask(id = 1, status = TaskStatus.COMPLETED)
        coEvery { mockTaskRepository.completeTask(1) } returns Result.success(Unit)
        // After completion, ViewModel reloads the task (which also loads applications)
        coEvery { mockTaskRepository.getTask(1) } returns Result.success(completedTask)
        coEvery { mockTaskRepository.getTaskApplications(1) } returns Result.success(emptyList())

        viewModel.completeTask(1)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state.paymentSuccess)
            assertEquals(TaskStatus.COMPLETED, state.task?.status)
        }
    }

    @Test
    fun `completeTask failure should emit payment error`() = runTest {
        coEvery { mockTaskRepository.completeTask(1) } returns Result.failure(Exception("Failed to release payment"))

        viewModel.completeTask(1)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals("Failed to release payment", state.paymentError)
            assertFalse(state.paymentSuccess)
        }
    }

    @Test
    fun `clearError should clear error`() = runTest {
        coEvery { mockTaskRepository.getTask(5) } returns Result.failure(Exception("Error"))
        viewModel.loadTask(5)
        advanceUntilIdle()

        viewModel.clearError()

        viewModel.uiState.test {
            assertNull(awaitItem().error)
        }
    }

    @Test
    fun `clearAcceptSuccess should reset acceptSuccess flag`() = runTest {
        viewModel.clearAcceptSuccess()

        viewModel.uiState.test {
            assertFalse(awaitItem().acceptSuccess)
        }
    }

    @Test
    fun `clearPaymentCheckoutUrl should clear checkout URL`() = runTest {
        viewModel.clearPaymentCheckoutUrl()

        viewModel.uiState.test {
            assertNull(awaitItem().paymentCheckoutUrl)
        }
    }

    @Test
    fun `loadTask should set isOwnTask true when requesterId matches current user`() = runTest {
        val task = TestData.createTask(id = 5, requesterId = 1) // matches mock userId=1
        coEvery { mockTaskRepository.getTask(5) } returns Result.success(task)
        coEvery { mockTaskRepository.getTaskApplications(5) } returns Result.success(emptyList())

        viewModel.loadTask(5)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state.isOwnTask)
        }
    }

    @Test
    fun `loadTask should set isOwnTask false when requesterId differs from current user`() = runTest {
        val task = TestData.createTask(id = 5, requesterId = 99) // does not match mock userId=1
        coEvery { mockTaskRepository.getTask(5) } returns Result.success(task)
        coEvery { mockTaskRepository.getTaskApplications(5) } returns Result.success(emptyList())

        viewModel.loadTask(5)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertFalse(state.isOwnTask)
        }
    }

    @Test
    fun `loadTask should set isCurrentUserTasker true when user is tasker`() = runTest {
        val task = TestData.createTask(id = 5, requesterId = 99)
        coEvery { mockTaskRepository.getTask(5) } returns Result.success(task)
        coEvery { mockTaskRepository.getTaskApplications(5) } returns Result.success(emptyList())

        viewModel.loadTask(5)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state.isCurrentUserTasker)
        }
    }

    @Test
    fun `loadTask should set isCurrentUserTasker false when user is not tasker`() = runTest {
        // Override mock to return false for isTasker
        every { mockTokenManager.isTasker } returns MutableStateFlow(false)
        val vm = TaskDetailViewModel(mockTaskRepository, mockPaymentRepository, mockMessageRepository, mockTokenManager)

        val task = TestData.createTask(id = 5, requesterId = 99)
        coEvery { mockTaskRepository.getTask(5) } returns Result.success(task)
        coEvery { mockTaskRepository.getTaskApplications(5) } returns Result.success(emptyList())

        vm.loadTask(5)
        advanceUntilIdle()

        vm.uiState.test {
            val state = awaitItem()
            assertFalse(state.isCurrentUserTasker)
        }
    }
}
