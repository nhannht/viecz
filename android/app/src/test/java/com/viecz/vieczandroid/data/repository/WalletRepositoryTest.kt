package com.viecz.vieczandroid.data.repository

import com.viecz.vieczandroid.data.api.WalletApi
import com.viecz.vieczandroid.data.models.DepositRequest
import com.viecz.vieczandroid.data.models.DepositResponse
import com.viecz.vieczandroid.testutil.TestData
import io.mockk.*
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Before
import org.junit.Test
import java.io.IOException
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class WalletRepositoryTest {

    private lateinit var mockApi: WalletApi
    private lateinit var repository: WalletRepository

    @Before
    fun setup() {
        mockApi = mockk()
        repository = WalletRepository(mockApi)
    }

    @After
    fun tearDown() {
        clearAllMocks()
    }

    // --- getWallet ---

    @Test
    fun `getWallet should return wallet on success`() = runTest {
        val wallet = TestData.createWallet(balance = 500000L, escrowBalance = 100000L)
        coEvery { mockApi.getWallet() } returns wallet

        val result = repository.getWallet()

        assertTrue(result.isSuccess)
        assertEquals(500000L, result.getOrNull()?.balance)
        assertEquals(100000L, result.getOrNull()?.escrowBalance)
    }

    @Test
    fun `getWallet with network error should return failure`() = runTest {
        coEvery { mockApi.getWallet() } throws IOException("No network")

        val result = repository.getWallet()

        assertTrue(result.isFailure)
    }

    @Test
    fun `getWallet with server error should return failure`() = runTest {
        coEvery { mockApi.getWallet() } throws RuntimeException("Server error")

        val result = repository.getWallet()

        assertTrue(result.isFailure)
    }

    // --- deposit ---

    @Test
    fun `deposit should return DepositResponse on success`() = runTest {
        val response = DepositResponse(
            checkoutUrl = "https://pay.payos.vn/test-checkout",
            orderCode = 1234567890L
        )
        coEvery { mockApi.deposit(any()) } returns response

        val result = repository.deposit(100000L, "Test deposit")

        assertTrue(result.isSuccess)
        assertEquals("https://pay.payos.vn/test-checkout", result.getOrNull()?.checkoutUrl)
        assertEquals(1234567890L, result.getOrNull()?.orderCode)
    }

    @Test
    fun `deposit should pass correct request parameters`() = runTest {
        val response = DepositResponse(
            checkoutUrl = "https://pay.payos.vn/checkout",
            orderCode = 999L
        )
        coEvery { mockApi.deposit(any()) } returns response

        repository.deposit(200000L, "My deposit")

        coVerify { mockApi.deposit(DepositRequest(200000L, "My deposit")) }
    }

    @Test
    fun `deposit with default description should use Wallet deposit`() = runTest {
        val response = DepositResponse(
            checkoutUrl = "https://pay.payos.vn/checkout",
            orderCode = 999L
        )
        coEvery { mockApi.deposit(any()) } returns response

        repository.deposit(100000L)

        coVerify { mockApi.deposit(DepositRequest(100000L, "Wallet deposit")) }
    }

    @Test
    fun `deposit with network error should return failure`() = runTest {
        coEvery { mockApi.deposit(any()) } throws IOException("No network")

        val result = repository.deposit(100000L)

        assertTrue(result.isFailure)
    }

    // --- getTransactionHistory ---

    @Test
    fun `getTransactionHistory should return transactions on success`() = runTest {
        val transactions = listOf(
            TestData.createWalletTransaction(id = 1, amount = 100000L),
            TestData.createWalletTransaction(id = 2, amount = 200000L)
        )
        coEvery { mockApi.getTransactionHistory(any(), any()) } returns transactions

        val result = repository.getTransactionHistory()

        assertTrue(result.isSuccess)
        assertEquals(2, result.getOrNull()?.size)
    }

    @Test
    fun `getTransactionHistory with custom pagination should pass correct parameters`() = runTest {
        coEvery { mockApi.getTransactionHistory(any(), any()) } returns emptyList()

        repository.getTransactionHistory(limit = 10, offset = 20)

        coVerify { mockApi.getTransactionHistory(10, 20) }
    }

    @Test
    fun `getTransactionHistory should return empty list when no transactions`() = runTest {
        coEvery { mockApi.getTransactionHistory(any(), any()) } returns emptyList()

        val result = repository.getTransactionHistory()

        assertTrue(result.isSuccess)
        assertEquals(0, result.getOrNull()?.size)
    }

    @Test
    fun `getTransactionHistory with network error should return failure`() = runTest {
        coEvery { mockApi.getTransactionHistory(any(), any()) } throws IOException("No network")

        val result = repository.getTransactionHistory()

        assertTrue(result.isFailure)
    }

    @Test
    fun `getTransactionHistory default parameters should use limit 20 offset 0`() = runTest {
        coEvery { mockApi.getTransactionHistory(any(), any()) } returns emptyList()

        repository.getTransactionHistory()

        coVerify { mockApi.getTransactionHistory(20, 0) }
    }
}
