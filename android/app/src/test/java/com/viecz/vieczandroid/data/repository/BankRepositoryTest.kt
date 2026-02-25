package com.viecz.vieczandroid.data.repository

import com.viecz.vieczandroid.data.api.BankApi
import com.viecz.vieczandroid.data.models.AddBankAccountRequest
import com.viecz.vieczandroid.data.models.MessageResponse
import com.viecz.vieczandroid.testutil.TestData
import io.mockk.*
import kotlinx.coroutines.test.runTest
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.After
import org.junit.Before
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Response
import java.io.IOException
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class BankRepositoryTest {

    private lateinit var mockApi: BankApi
    private lateinit var repository: BankRepository

    @Before
    fun setup() {
        mockApi = mockk()
        repository = BankRepository(mockApi)
    }

    @After
    fun tearDown() {
        clearAllMocks()
    }

    // --- getBanks ---

    @Test
    fun `getBanks should return banks on success`() = runTest {
        val banks = listOf(
            TestData.createVietQRBank(id = 1, shortName = "Vietcombank"),
            TestData.createVietQRBank(id = 2, shortName = "BIDV", bin = "970418")
        )
        coEvery { mockApi.getBanks() } returns banks

        val result = repository.getBanks()

        assertTrue(result.isSuccess)
        assertEquals(2, result.getOrNull()?.size)
        assertEquals("Vietcombank", result.getOrNull()?.get(0)?.shortName)
    }

    @Test
    fun `getBanks should return empty list when no banks`() = runTest {
        coEvery { mockApi.getBanks() } returns emptyList()

        val result = repository.getBanks()

        assertTrue(result.isSuccess)
        assertEquals(0, result.getOrNull()?.size)
    }

    @Test
    fun `getBanks with network error should return failure`() = runTest {
        coEvery { mockApi.getBanks() } throws IOException("No network")

        val result = repository.getBanks()

        assertTrue(result.isFailure)
    }

    @Test
    fun `getBanks with HTTP error should return failure with parsed message`() = runTest {
        val errorBody = """{"error":"Unauthorized"}""".toResponseBody()
        coEvery { mockApi.getBanks() } throws HttpException(Response.error<Any>(401, errorBody))

        val result = repository.getBanks()

        assertTrue(result.isFailure)
    }

    // --- getBankAccounts ---

    @Test
    fun `getBankAccounts should return accounts on success`() = runTest {
        val accounts = listOf(
            TestData.createBankAccount(id = 1, bankName = "Vietcombank"),
            TestData.createBankAccount(id = 2, bankName = "BIDV")
        )
        coEvery { mockApi.getBankAccounts() } returns accounts

        val result = repository.getBankAccounts()

        assertTrue(result.isSuccess)
        assertEquals(2, result.getOrNull()?.size)
    }

    @Test
    fun `getBankAccounts should return empty list when no accounts`() = runTest {
        coEvery { mockApi.getBankAccounts() } returns emptyList()

        val result = repository.getBankAccounts()

        assertTrue(result.isSuccess)
        assertEquals(0, result.getOrNull()?.size)
    }

    @Test
    fun `getBankAccounts with network error should return failure`() = runTest {
        coEvery { mockApi.getBankAccounts() } throws IOException("No network")

        val result = repository.getBankAccounts()

        assertTrue(result.isFailure)
    }

    // --- addBankAccount ---

    @Test
    fun `addBankAccount should return account on success`() = runTest {
        val account = TestData.createBankAccount(
            bankBin = "970436",
            bankName = "Vietcombank",
            accountNumber = "9876543210",
            accountHolderName = "TRAN VAN B"
        )
        coEvery { mockApi.addBankAccount(any()) } returns account

        val result = repository.addBankAccount("970436", "Vietcombank", "9876543210", "TRAN VAN B")

        assertTrue(result.isSuccess)
        assertEquals("9876543210", result.getOrNull()?.accountNumber)
        assertEquals("TRAN VAN B", result.getOrNull()?.accountHolderName)
    }

    @Test
    fun `addBankAccount should pass correct request parameters`() = runTest {
        val account = TestData.createBankAccount()
        coEvery { mockApi.addBankAccount(any()) } returns account

        repository.addBankAccount("970436", "Vietcombank", "1234567890", "NGUYEN VAN A")

        coVerify {
            mockApi.addBankAccount(
                AddBankAccountRequest("970436", "Vietcombank", "1234567890", "NGUYEN VAN A")
            )
        }
    }

    @Test
    fun `addBankAccount with network error should return failure`() = runTest {
        coEvery { mockApi.addBankAccount(any()) } throws IOException("No network")

        val result = repository.addBankAccount("970436", "Vietcombank", "1234567890", "NGUYEN VAN A")

        assertTrue(result.isFailure)
    }

    @Test
    fun `addBankAccount with HTTP error should return failure with parsed message`() = runTest {
        val errorBody = """{"error":"Account already exists"}""".toResponseBody()
        coEvery { mockApi.addBankAccount(any()) } throws HttpException(Response.error<Any>(409, errorBody))

        val result = repository.addBankAccount("970436", "Vietcombank", "1234567890", "NGUYEN VAN A")

        assertTrue(result.isFailure)
    }

    // --- deleteBankAccount ---

    @Test
    fun `deleteBankAccount should return success`() = runTest {
        coEvery { mockApi.deleteBankAccount(any()) } returns MessageResponse("Deleted")

        val result = repository.deleteBankAccount(1L)

        assertTrue(result.isSuccess)
    }

    @Test
    fun `deleteBankAccount should call api with correct id`() = runTest {
        coEvery { mockApi.deleteBankAccount(any()) } returns MessageResponse("Deleted")

        repository.deleteBankAccount(42L)

        coVerify { mockApi.deleteBankAccount(42L) }
    }

    @Test
    fun `deleteBankAccount with network error should return failure`() = runTest {
        coEvery { mockApi.deleteBankAccount(any()) } throws IOException("No network")

        val result = repository.deleteBankAccount(1L)

        assertTrue(result.isFailure)
    }

    @Test
    fun `deleteBankAccount with HTTP error should return failure`() = runTest {
        val errorBody = """{"error":"Not found"}""".toResponseBody()
        coEvery { mockApi.deleteBankAccount(any()) } throws HttpException(Response.error<Any>(404, errorBody))

        val result = repository.deleteBankAccount(999L)

        assertTrue(result.isFailure)
    }
}
