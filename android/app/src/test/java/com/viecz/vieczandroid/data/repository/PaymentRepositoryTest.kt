package com.viecz.vieczandroid.data.repository

import com.viecz.vieczandroid.data.api.PaymentApi
import com.viecz.vieczandroid.data.models.*
import com.viecz.vieczandroid.testutil.TestData
import io.mockk.*
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Before
import org.junit.Test
import java.io.IOException
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class PaymentRepositoryTest {

    private lateinit var mockApi: PaymentApi
    private lateinit var repository: PaymentRepository

    @Before
    fun setup() {
        mockApi = mockk()
        repository = PaymentRepository(mockApi)
    }

    @After
    fun tearDown() {
        clearAllMocks()
    }

    // --- createPayment ---

    @Test
    fun `createPayment should return payment response on success`() = runTest {
        val response = TestData.createPaymentResponse(
            orderCode = 12345L,
            checkoutUrl = "https://pay.example.com/12345"
        )
        coEvery { mockApi.createPayment(any()) } returns response

        val result = repository.createPayment(100000, "Test payment")

        assertTrue(result.isSuccess)
        assertEquals(12345L, result.getOrNull()?.orderCode)
        assertEquals("https://pay.example.com/12345", result.getOrNull()?.checkoutUrl)
    }

    @Test
    fun `createPayment should pass correct request`() = runTest {
        val response = TestData.createPaymentResponse()
        coEvery { mockApi.createPayment(any()) } returns response

        repository.createPayment(50000, "Payment for task")

        coVerify { mockApi.createPayment(PaymentRequest(50000, "Payment for task")) }
    }

    @Test
    fun `createPayment with network error should return failure`() = runTest {
        coEvery { mockApi.createPayment(any()) } throws IOException("No network")

        val result = repository.createPayment(100000, "Test")

        assertTrue(result.isFailure)
    }

    // --- createEscrowPayment ---

    @Test
    fun `createEscrowPayment should return response on success`() = runTest {
        val transaction = TestData.createTransaction(type = TransactionType.ESCROW)
        val response = CreateEscrowPaymentResponse(
            transaction = transaction,
            checkoutUrl = "https://pay.example.com/escrow"
        )
        coEvery { mockApi.createEscrowPayment(any()) } returns response

        val result = repository.createEscrowPayment(1)

        assertTrue(result.isSuccess)
        assertEquals("https://pay.example.com/escrow", result.getOrNull()?.checkoutUrl)
    }

    @Test
    fun `createEscrowPayment with error should return failure`() = runTest {
        coEvery { mockApi.createEscrowPayment(any()) } throws RuntimeException("Failed")

        val result = repository.createEscrowPayment(1)

        assertTrue(result.isFailure)
    }

    // --- releasePayment ---

    @Test
    fun `releasePayment should return success message`() = runTest {
        val response = MessageResponse(message = "Payment released successfully")
        coEvery { mockApi.releasePayment(any()) } returns response

        val result = repository.releasePayment(1)

        assertTrue(result.isSuccess)
        assertEquals("Payment released successfully", result.getOrNull())
    }

    @Test
    fun `releasePayment with error should return failure`() = runTest {
        coEvery { mockApi.releasePayment(any()) } throws IOException("No network")

        val result = repository.releasePayment(1)

        assertTrue(result.isFailure)
    }

    // --- refundPayment ---

    @Test
    fun `refundPayment should return success message`() = runTest {
        val response = MessageResponse(message = "Payment refunded successfully")
        coEvery { mockApi.refundPayment(any()) } returns response

        val result = repository.refundPayment(1, "Task cancelled")

        assertTrue(result.isSuccess)
        assertEquals("Payment refunded successfully", result.getOrNull())
    }

    @Test
    fun `refundPayment should pass correct request`() = runTest {
        val response = MessageResponse(message = "OK")
        coEvery { mockApi.refundPayment(any()) } returns response

        repository.refundPayment(5, "Customer request")

        coVerify { mockApi.refundPayment(RefundPaymentRequest(5, "Customer request")) }
    }

    @Test
    fun `refundPayment with error should return failure`() = runTest {
        coEvery { mockApi.refundPayment(any()) } throws RuntimeException("Failed")

        val result = repository.refundPayment(1, "reason")

        assertTrue(result.isFailure)
    }

    // --- getTransactionsByTask ---

    @Test
    fun `getTransactionsByTask should return transactions on success`() = runTest {
        val transactions = listOf(
            TestData.createTransaction(id = 1, type = TransactionType.ESCROW),
            TestData.createTransaction(id = 2, type = TransactionType.RELEASE)
        )
        coEvery { mockApi.getTransactionsByTask(1) } returns transactions

        val result = repository.getTransactionsByTask(1)

        assertTrue(result.isSuccess)
        assertEquals(2, result.getOrNull()?.size)
    }

    @Test
    fun `getTransactionsByTask with error should return failure`() = runTest {
        coEvery { mockApi.getTransactionsByTask(1) } throws IOException("No network")

        val result = repository.getTransactionsByTask(1)

        assertTrue(result.isFailure)
    }
}
