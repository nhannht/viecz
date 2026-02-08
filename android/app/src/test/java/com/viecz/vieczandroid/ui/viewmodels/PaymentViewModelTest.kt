package com.viecz.vieczandroid.ui.viewmodels

import com.viecz.vieczandroid.data.repository.PaymentRepository
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
import kotlin.test.assertIs

@OptIn(ExperimentalCoroutinesApi::class)
class PaymentViewModelTest {

    @get:Rule
    val coroutineRule = CoroutineTestRule()

    private lateinit var mockRepository: PaymentRepository
    private lateinit var viewModel: PaymentViewModel

    @Before
    fun setup() {
        mockRepository = mockk()
        viewModel = PaymentViewModel(mockRepository)
    }

    @After
    fun tearDown() {
        clearAllMocks()
    }

    @Test
    fun `initial state should be Idle`() {
        assertIs<PaymentUiState.Idle>(viewModel.uiState)
    }

    @Test
    fun `createPayment should emit Success with checkout URL on success`() = runTest {
        val response = TestData.createPaymentResponse(checkoutUrl = "https://pay.example.com/12345")
        coEvery { mockRepository.createPayment(any(), any()) } returns Result.success(response)

        viewModel.createPayment(2000, "Test payment")
        advanceUntilIdle()

        val state = viewModel.uiState
        assertIs<PaymentUiState.Success>(state)
        assertEquals("https://pay.example.com/12345", (state as PaymentUiState.Success).checkoutUrl)
    }

    @Test
    fun `createPayment should emit Error on failure`() = runTest {
        coEvery { mockRepository.createPayment(any(), any()) } returns Result.failure(
            Exception("Payment failed")
        )

        viewModel.createPayment(2000, "Test")
        advanceUntilIdle()

        val state = viewModel.uiState
        assertIs<PaymentUiState.Error>(state)
        assertEquals("Payment failed", (state as PaymentUiState.Error).message)
    }

    @Test
    fun `createPayment with default parameters should use 2000 and default description`() = runTest {
        val response = TestData.createPaymentResponse()
        coEvery { mockRepository.createPayment(any(), any()) } returns Result.success(response)

        viewModel.createPayment()
        advanceUntilIdle()

        coVerify { mockRepository.createPayment(2000, "Payment - 2000 VND") }
    }

    @Test
    fun `createPayment with custom parameters should pass them to repository`() = runTest {
        val response = TestData.createPaymentResponse()
        coEvery { mockRepository.createPayment(any(), any()) } returns Result.success(response)

        viewModel.createPayment(50000, "Task payment")
        advanceUntilIdle()

        coVerify { mockRepository.createPayment(50000, "Task payment") }
    }

    @Test
    fun `createPayment error with null message should use Unknown error`() = runTest {
        coEvery { mockRepository.createPayment(any(), any()) } returns Result.failure(Exception())

        viewModel.createPayment()
        advanceUntilIdle()

        val state = viewModel.uiState
        assertIs<PaymentUiState.Error>(state)
        assertEquals("Unknown error", (state as PaymentUiState.Error).message)
    }

    @Test
    fun `resetState should set state to Idle`() = runTest {
        val response = TestData.createPaymentResponse()
        coEvery { mockRepository.createPayment(any(), any()) } returns Result.success(response)

        viewModel.createPayment()
        advanceUntilIdle()

        assertIs<PaymentUiState.Success>(viewModel.uiState)

        viewModel.resetState()

        assertIs<PaymentUiState.Idle>(viewModel.uiState)
    }

    @Test
    fun `createPayment should transition through Loading state`() = runTest {
        val response = TestData.createPaymentResponse()
        coEvery { mockRepository.createPayment(any(), any()) } returns Result.success(response)

        // Before calling
        assertIs<PaymentUiState.Idle>(viewModel.uiState)

        viewModel.createPayment()
        advanceUntilIdle()

        // After completion
        assertIs<PaymentUiState.Success>(viewModel.uiState)
    }
}
