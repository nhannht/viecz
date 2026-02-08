package com.viecz.vieczandroid.data.api

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import com.viecz.vieczandroid.data.models.DepositRequest
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Before
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class WalletApiTest {

    private lateinit var mockWebServer: MockWebServer
    private lateinit var walletApi: WalletApi

    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    @Before
    fun setup() {
        mockWebServer = MockWebServer()
        mockWebServer.start()

        walletApi = Retrofit.Builder()
            .baseUrl(mockWebServer.url("/api/v1/"))
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(WalletApi::class.java)
    }

    @After
    fun tearDown() {
        mockWebServer.shutdown()
    }

    @Test
    fun `getWallet sends GET to wallet`() = runTest {
        val responseJson = """
            {
                "id": 1,
                "user_id": 1,
                "balance": 500000,
                "escrow_balance": 100000,
                "total_deposited": 1000000,
                "total_withdrawn": 200000,
                "total_earned": 300000,
                "total_spent": 400000,
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-06-01T00:00:00Z"
            }
        """.trimIndent()

        mockWebServer.enqueue(MockResponse().setBody(responseJson))

        val result = walletApi.getWallet()

        assertEquals(1L, result.id)
        assertEquals(500000L, result.balance)
        assertEquals(100000L, result.escrowBalance)
        assertEquals(1000000L, result.totalDeposited)

        val request = mockWebServer.takeRequest()
        assertEquals("GET", request.method)
        assertEquals("/api/v1/wallet", request.path)
    }

    @Test
    fun `deposit sends POST to wallet_deposit with amount`() = runTest {
        val responseJson = """{"message": "Deposit successful"}"""

        mockWebServer.enqueue(MockResponse().setBody(responseJson))

        val result = walletApi.deposit(
            DepositRequest(amount = 200000L, description = "Top up wallet")
        )

        assertEquals("Deposit successful", result.message)

        val request = mockWebServer.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/api/v1/wallet/deposit", request.path)
        val body = request.body.readUtf8()
        assert(body.contains("\"amount\":200000"))
        assert(body.contains("\"description\":\"Top up wallet\""))
    }

    @Test
    fun `getTransactionHistory sends GET with default pagination`() = runTest {
        val responseJson = """
            [
                {
                    "id": 1,
                    "wallet_id": 1,
                    "type": "deposit",
                    "amount": 100000,
                    "balance_before": 0,
                    "balance_after": 100000,
                    "escrow_before": 0,
                    "escrow_after": 0,
                    "description": "Initial deposit",
                    "created_at": "2024-01-01T00:00:00Z"
                },
                {
                    "id": 2,
                    "wallet_id": 1,
                    "type": "escrow_hold",
                    "amount": 50000,
                    "balance_before": 100000,
                    "balance_after": 50000,
                    "escrow_before": 0,
                    "escrow_after": 50000,
                    "description": "Escrow for task #1",
                    "created_at": "2024-01-02T00:00:00Z"
                }
            ]
        """.trimIndent()

        mockWebServer.enqueue(MockResponse().setBody(responseJson))

        val result = walletApi.getTransactionHistory()

        assertEquals(2, result.size)
        assertEquals(com.viecz.vieczandroid.data.models.WalletTransactionType.DEPOSIT, result[0].type)
        assertEquals(com.viecz.vieczandroid.data.models.WalletTransactionType.ESCROW_HOLD, result[1].type)
        assertEquals(100000L, result[0].amount)

        val request = mockWebServer.takeRequest()
        assertEquals("GET", request.method)
        assert(request.path!!.startsWith("/api/v1/wallet/transactions"))
        assert(request.path!!.contains("limit=20"))
        assert(request.path!!.contains("offset=0"))
    }

    @Test
    fun `getTransactionHistory sends GET with custom pagination`() = runTest {
        mockWebServer.enqueue(MockResponse().setBody("[]"))

        walletApi.getTransactionHistory(limit = 10, offset = 20)

        val request = mockWebServer.takeRequest()
        assertEquals("GET", request.method)
        assert(request.path!!.contains("limit=10"))
        assert(request.path!!.contains("offset=20"))
    }

    @Test
    fun `getTransactionHistory with empty list returns empty`() = runTest {
        mockWebServer.enqueue(MockResponse().setBody("[]"))

        val result = walletApi.getTransactionHistory()

        assertTrue(result.isEmpty())
    }

    @Test
    fun `getWallet without auth returns 401`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(401)
                .setBody("""{"error":"Unauthorized"}""")
        )

        assertFailsWith<HttpException> {
            walletApi.getWallet()
        }.also { exception ->
            assertEquals(401, exception.code())
        }
    }

    @Test
    fun `deposit with invalid amount returns 400`() = runTest {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(400)
                .setBody("""{"error":"Invalid deposit amount"}""")
        )

        assertFailsWith<HttpException> {
            walletApi.deposit(DepositRequest(amount = -1000L))
        }.also { exception ->
            assertEquals(400, exception.code())
        }
    }
}
