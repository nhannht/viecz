package com.viecz.vieczandroid.ui.viewmodels

import app.cash.turbine.test
import com.viecz.vieczandroid.data.models.DepositResponse
import com.viecz.vieczandroid.data.repository.BankRepository
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
    private lateinit var mockBankRepository: BankRepository
    private lateinit var viewModel: WalletViewModel

    @Before
    fun setup() {
        mockRepository = mockk()
        mockBankRepository = mockk()
        // Mock init block calls
        coEvery { mockRepository.getWallet() } returns Result.success(TestData.createWallet())
        coEvery { mockRepository.getTransactionHistory(any(), any()) } returns Result.success(emptyList())
        coEvery { mockBankRepository.getBanks() } returns Result.success(emptyList())
        coEvery { mockBankRepository.getBankAccounts() } returns Result.success(emptyList())
        viewModel = WalletViewModel(mockRepository, mockBankRepository)
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

    // --- Bank methods ---

    @Test
    fun `loadBanks should emit Success with banks`() = runTest {
        val banks = listOf(
            TestData.createVietQRBank(id = 1, shortName = "Vietcombank"),
            TestData.createVietQRBank(id = 2, shortName = "BIDV", bin = "970418")
        )
        coEvery { mockBankRepository.getBanks() } returns Result.success(banks)

        viewModel.loadBanks()
        advanceUntilIdle()

        viewModel.banksState.test {
            val state = awaitItem()
            assertIs<BanksUiState.Success>(state)
            assertEquals(2, (state as BanksUiState.Success).banks.size)
        }
    }

    @Test
    fun `loadBanks should emit Error on failure`() = runTest {
        coEvery { mockBankRepository.getBanks() } returns Result.failure(Exception("Failed"))

        viewModel.loadBanks()
        advanceUntilIdle()

        viewModel.banksState.test {
            val state = awaitItem()
            assertIs<BanksUiState.Error>(state)
            assertEquals("Failed", (state as BanksUiState.Error).message)
        }
    }

    @Test
    fun `loadBankAccounts should emit Success with accounts`() = runTest {
        val accounts = listOf(
            TestData.createBankAccount(id = 1, bankName = "Vietcombank"),
            TestData.createBankAccount(id = 2, bankName = "BIDV")
        )
        coEvery { mockBankRepository.getBankAccounts() } returns Result.success(accounts)

        viewModel.loadBankAccounts()
        advanceUntilIdle()

        viewModel.bankAccountsState.test {
            val state = awaitItem()
            assertIs<BankAccountsUiState.Success>(state)
            assertEquals(2, (state as BankAccountsUiState.Success).accounts.size)
        }
    }

    @Test
    fun `loadBankAccounts should emit Error on failure`() = runTest {
        coEvery { mockBankRepository.getBankAccounts() } returns Result.failure(Exception("Failed"))

        viewModel.loadBankAccounts()
        advanceUntilIdle()

        viewModel.bankAccountsState.test {
            val state = awaitItem()
            assertIs<BankAccountsUiState.Error>(state)
        }
    }

    @Test
    fun `addBankAccount should emit Success and reload accounts`() = runTest {
        val account = TestData.createBankAccount()
        coEvery { mockBankRepository.addBankAccount(any(), any(), any(), any()) } returns Result.success(account)
        coEvery { mockBankRepository.getBankAccounts() } returns Result.success(listOf(account))

        viewModel.addBankAccount("970436", "Vietcombank", "1234567890", "NGUYEN VAN A")
        advanceUntilIdle()

        viewModel.addBankAccountState.test {
            val state = awaitItem()
            assertIs<AddBankAccountUiState.Success>(state)
        }
        // Verify it reloaded bank accounts
        coVerify(atLeast = 2) { mockBankRepository.getBankAccounts() }
    }

    @Test
    fun `addBankAccount should emit Error on failure`() = runTest {
        coEvery { mockBankRepository.addBankAccount(any(), any(), any(), any()) } returns
                Result.failure(Exception("Account already exists"))

        viewModel.addBankAccount("970436", "Vietcombank", "1234567890", "NGUYEN VAN A")
        advanceUntilIdle()

        viewModel.addBankAccountState.test {
            val state = awaitItem()
            assertIs<AddBankAccountUiState.Error>(state)
            assertEquals("Account already exists", (state as AddBankAccountUiState.Error).message)
        }
    }

    @Test
    fun `deleteBankAccount should reload accounts on success`() = runTest {
        coEvery { mockBankRepository.deleteBankAccount(any()) } returns Result.success(Unit)
        coEvery { mockBankRepository.getBankAccounts() } returns Result.success(emptyList())

        viewModel.deleteBankAccount(1L)
        advanceUntilIdle()

        coVerify { mockBankRepository.deleteBankAccount(1L) }
        coVerify(atLeast = 2) { mockBankRepository.getBankAccounts() }
    }

    // --- Withdrawal methods ---

    @Test
    fun `withdraw should emit Success and refresh wallet`() = runTest {
        val withdrawalResponse = TestData.createWithdrawalResponse(transactionId = 42)
        coEvery { mockRepository.withdraw(any(), any()) } returns Result.success(withdrawalResponse)

        viewModel.withdraw(50000L, 1L)
        advanceUntilIdle()

        viewModel.withdrawalState.test {
            val state = awaitItem()
            assertIs<WithdrawalUiState.Success>(state)
            assertEquals(42L, (state as WithdrawalUiState.Success).response.transactionId)
        }
        // Verify it refreshed wallet and transactions
        coVerify(atLeast = 2) { mockRepository.getWallet() }
        coVerify(atLeast = 2) { mockRepository.getTransactionHistory(any(), any()) }
    }

    @Test
    fun `withdraw should emit Error on failure`() = runTest {
        coEvery { mockRepository.withdraw(any(), any()) } returns
                Result.failure(Exception("Insufficient balance"))

        viewModel.withdraw(999999L, 1L)
        advanceUntilIdle()

        viewModel.withdrawalState.test {
            val state = awaitItem()
            assertIs<WithdrawalUiState.Error>(state)
            assertEquals("Insufficient balance", (state as WithdrawalUiState.Error).message)
        }
    }

    @Test
    fun `withdraw should pass correct parameters to repository`() = runTest {
        val response = TestData.createWithdrawalResponse()
        coEvery { mockRepository.withdraw(any(), any()) } returns Result.success(response)

        viewModel.withdraw(100000L, 5L)
        advanceUntilIdle()

        coVerify { mockRepository.withdraw(100000L, 5L) }
    }

    @Test
    fun `resetWithdrawalState should emit Idle`() = runTest {
        val response = TestData.createWithdrawalResponse()
        coEvery { mockRepository.withdraw(any(), any()) } returns Result.success(response)

        viewModel.withdraw(50000L, 1L)
        advanceUntilIdle()

        viewModel.resetWithdrawalState()

        viewModel.withdrawalState.test {
            assertIs<WithdrawalUiState.Idle>(awaitItem())
        }
    }

    @Test
    fun `resetAddBankAccountState should emit Idle`() = runTest {
        val account = TestData.createBankAccount()
        coEvery { mockBankRepository.addBankAccount(any(), any(), any(), any()) } returns Result.success(account)
        coEvery { mockBankRepository.getBankAccounts() } returns Result.success(listOf(account))

        viewModel.addBankAccount("970436", "Vietcombank", "1234567890", "NGUYEN VAN A")
        advanceUntilIdle()

        viewModel.resetAddBankAccountState()

        viewModel.addBankAccountState.test {
            assertIs<AddBankAccountUiState.Idle>(awaitItem())
        }
    }
}
