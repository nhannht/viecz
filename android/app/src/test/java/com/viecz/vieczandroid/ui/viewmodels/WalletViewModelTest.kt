package com.viecz.vieczandroid.ui.viewmodels

import app.cash.turbine.test
import com.viecz.vieczandroid.data.models.DepositResponse
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
import kotlin.test.assertIs

@OptIn(ExperimentalCoroutinesApi::class)
class WalletViewModelTest {

    @get:Rule
    val coroutineRule = CoroutineTestRule()

    private lateinit var mockRepository: WalletRepository
    private lateinit var viewModel: WalletViewModel

    @Before
    fun setup() {
        mockRepository = mockk()
        // Mock init block calls
        coEvery { mockRepository.getWallet() } returns Result.success(TestData.createWallet())
        coEvery { mockRepository.getTransactionHistory(any(), any()) } returns Result.success(emptyList())
        viewModel = WalletViewModel(mockRepository)
    }

    @After
    fun tearDown() {
        clearAllMocks()
    }

    @Test
    fun `loadWallet should emit Success with wallet on success`() = runTest {
        val wallet = TestData.createWallet(balance = 500000L)
        coEvery { mockRepository.getWallet() } returns Result.success(wallet)

        viewModel.loadWallet()
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertIs<WalletUiState.Success>(state)
            assertEquals(500000L, (state as WalletUiState.Success).wallet.balance)
        }
    }

    @Test
    fun `loadWallet should emit Error on failure`() = runTest {
        coEvery { mockRepository.getWallet() } returns Result.failure(Exception("Failed to load"))

        viewModel.loadWallet()
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertIs<WalletUiState.Error>(state)
            assertEquals("Failed to load", (state as WalletUiState.Error).message)
        }
    }

    @Test
    fun `loadTransactionHistory should emit Success with transactions`() = runTest {
        val transactions = listOf(
            TestData.createWalletTransaction(id = 1, amount = 100000L),
            TestData.createWalletTransaction(id = 2, amount = 200000L)
        )
        coEvery { mockRepository.getTransactionHistory(any(), any()) } returns Result.success(transactions)

        viewModel.loadTransactionHistory()
        advanceUntilIdle()

        viewModel.transactionsState.test {
            val state = awaitItem()
            assertIs<TransactionsUiState.Success>(state)
            assertEquals(2, (state as TransactionsUiState.Success).transactions.size)
        }
    }

    @Test
    fun `loadTransactionHistory should emit Error on failure`() = runTest {
        coEvery { mockRepository.getTransactionHistory(any(), any()) } returns Result.failure(
            Exception("Failed")
        )

        viewModel.loadTransactionHistory()
        advanceUntilIdle()

        viewModel.transactionsState.test {
            val state = awaitItem()
            assertIs<TransactionsUiState.Error>(state)
        }
    }

    @Test
    fun `loadTransactionHistory should pass correct pagination parameters`() = runTest {
        coEvery { mockRepository.getTransactionHistory(any(), any()) } returns Result.success(emptyList())

        viewModel.loadTransactionHistory(limit = 10, offset = 20)
        advanceUntilIdle()

        coVerify { mockRepository.getTransactionHistory(10, 20) }
    }

    @Test
    fun `deposit should emit Success with checkout URL on success`() = runTest {
        val depositResponse = DepositResponse(
            checkoutUrl = "https://pay.payos.vn/test-checkout",
            orderCode = 1234567890L
        )
        coEvery { mockRepository.deposit(any(), any()) } returns Result.success(depositResponse)

        viewModel.deposit(100000L, "Test deposit")
        advanceUntilIdle()

        viewModel.depositState.test {
            val state = awaitItem()
            assertIs<DepositUiState.Success>(state)
            assertEquals("https://pay.payos.vn/test-checkout", (state as DepositUiState.Success).checkoutUrl)
            assertEquals(1234567890L, state.orderCode)
        }
    }

    @Test
    fun `deposit should emit Error on failure`() = runTest {
        coEvery { mockRepository.deposit(any(), any()) } returns Result.failure(Exception("Insufficient funds"))

        viewModel.deposit(100000L)
        advanceUntilIdle()

        viewModel.depositState.test {
            val state = awaitItem()
            assertIs<DepositUiState.Error>(state)
            assertEquals("Insufficient funds", (state as DepositUiState.Error).message)
        }
    }

    @Test
    fun `deposit should pass correct parameters to repository`() = runTest {
        val depositResponse = DepositResponse(checkoutUrl = "https://example.com", orderCode = 999L)
        coEvery { mockRepository.deposit(any(), any()) } returns Result.success(depositResponse)

        viewModel.deposit(200000L, "My deposit")
        advanceUntilIdle()

        coVerify { mockRepository.deposit(200000L, "My deposit") }
    }

    @Test
    fun `resetDepositState should emit Idle`() = runTest {
        // First trigger a deposit
        val depositResponse = DepositResponse(checkoutUrl = "https://example.com", orderCode = 999L)
        coEvery { mockRepository.deposit(any(), any()) } returns Result.success(depositResponse)

        viewModel.deposit(100000L)
        advanceUntilIdle()

        viewModel.resetDepositState()

        viewModel.depositState.test {
            assertIs<DepositUiState.Idle>(awaitItem())
        }
    }

    @Test
    fun `loadWallet error with null message should use fallback`() = runTest {
        coEvery { mockRepository.getWallet() } returns Result.failure(Exception())

        viewModel.loadWallet()
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertIs<WalletUiState.Error>(state)
            assertEquals("Failed to load wallet", (state as WalletUiState.Error).message)
        }
    }

    @Test
    fun `empty transaction history should show empty list in Success state`() = runTest {
        coEvery { mockRepository.getTransactionHistory(any(), any()) } returns Result.success(emptyList())

        viewModel.loadTransactionHistory()
        advanceUntilIdle()

        viewModel.transactionsState.test {
            val state = awaitItem()
            assertIs<TransactionsUiState.Success>(state)
            assertEquals(0, (state as TransactionsUiState.Success).transactions.size)
        }
    }
}
